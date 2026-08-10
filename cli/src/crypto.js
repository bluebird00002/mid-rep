import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCallback,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const VAULT_FORMAT = "mid-encrypted-vault";
export const VAULT_VERSION = 1;
export const KDF_PARAMS = Object.freeze({ N: 32768, r: 8, p: 1, keyLength: 32 });

function authenticationError(cause) {
  const error = new Error("Vault authentication failed", { cause });
  error.code = "MID_AUTH_FAILED";
  return error;
}

async function deriveKey(password, salt, params = KDF_PARAMS) {
  if (typeof password !== "string" || password.length === 0) {
    throw new TypeError("A non-empty password is required");
  }

  const key = await scrypt(password, salt, params.keyLength, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 128 * 1024 * 1024,
  });
  return Buffer.from(key);
}

function aadFor(header) {
  return Buffer.from(JSON.stringify({
    format: header.format,
    version: header.version,
    kdf: header.kdf,
    cipherName: header.cipher.name,
  }));
}

export async function encryptVault(data, password) {
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const header = {
    format: VAULT_FORMAT,
    version: VAULT_VERSION,
    kdf: {
      name: "scrypt",
      salt: salt.toString("base64"),
      ...KDF_PARAMS,
    },
    cipher: {
      name: "aes-256-gcm",
      iv: iv.toString("base64"),
    },
  };

  const key = await deriveKey(password, salt, header.kdf);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aadFor(header));
    const plaintext = Buffer.from(JSON.stringify(data), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    plaintext.fill(0);
    header.cipher.tag = cipher.getAuthTag().toString("base64");
    return JSON.stringify({ ...header, payload: encrypted.toString("base64") });
  } finally {
    key.fill(0);
  }
}

export async function decryptVault(serialized, password) {
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch (error) {
    throw authenticationError(error);
  }

  if (
    envelope?.format !== VAULT_FORMAT ||
    envelope?.version !== VAULT_VERSION ||
    envelope?.kdf?.name !== "scrypt" ||
    envelope?.cipher?.name !== "aes-256-gcm"
  ) {
    throw new Error("Unsupported or invalid MiD vault format");
  }

  const { N, r, p, keyLength } = envelope.kdf;
  if (N !== KDF_PARAMS.N || r !== KDF_PARAMS.r || p !== KDF_PARAMS.p || keyLength !== 32) {
    throw new Error("Unsupported vault key-derivation parameters");
  }

  const salt = Buffer.from(envelope.kdf.salt, "base64");
  const iv = Buffer.from(envelope.cipher.iv, "base64");
  const tag = Buffer.from(envelope.cipher.tag, "base64");
  const payload = Buffer.from(envelope.payload, "base64");
  if (salt.length !== 32 || iv.length !== 12 || tag.length !== 16 || payload.length === 0) {
    throw authenticationError();
  }

  const key = await deriveKey(password, salt, envelope.kdf);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aadFor(envelope));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(payload), decipher.final()]);
    try {
      return JSON.parse(plaintext.toString("utf8"));
    } finally {
      plaintext.fill(0);
    }
  } catch (error) {
    throw authenticationError(error);
  } finally {
    key.fill(0);
  }
}
