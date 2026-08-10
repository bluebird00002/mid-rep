import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { decryptVault, encryptVault } from "./crypto.js";

export const DATA_VERSION = 1;

export function emptyVault(now = new Date().toISOString()) {
  return {
    version: DATA_VERSION,
    createdAt: now,
    updatedAt: now,
    entries: [],
    remote: {},
  };
}

function validateData(data) {
  if (!data || data.version !== DATA_VERSION || !Array.isArray(data.entries)) {
    throw new Error("The decrypted vault data has an unsupported structure");
  }
  if (!data.remote || typeof data.remote !== "object") data.remote = {};
  return data;
}

async function writeAtomic(filePath, content) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(content, { encoding: "utf8" });
    await handle.sync();
    await handle.close();
    handle = null;
    await chmod(temporary, 0o600).catch(() => {});
    await rename(temporary, filePath);
    await chmod(filePath, 0o600).catch(() => {});
  } finally {
    if (handle) await handle.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function vaultExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function initializeVault(filePath, password) {
  if (await vaultExists(filePath)) {
    throw new Error(`A vault already exists at ${filePath}`);
  }
  const data = emptyVault();
  await writeAtomic(filePath, await encryptVault(data, password));
  return data;
}

export async function loadVault(filePath, password) {
  let serialized;
  try {
    serialized = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`No vault exists at ${filePath}. Run \"mid init\" first.`);
    }
    throw error;
  }
  return validateData(await decryptVault(serialized, password));
}

export async function saveVault(filePath, data, password) {
  validateData(data);
  data.updatedAt = new Date().toISOString();
  await writeAtomic(filePath, await encryptVault(data, password));
}

export function addEntry(data, { content, category = null, tags = [] }, now = new Date().toISOString()) {
  if (!content?.trim()) throw new Error("Memory text cannot be empty");
  const entry = {
    id: randomUUID(),
    content: content.trim(),
    category: category?.trim() || null,
    tags: [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
    createdAt: now,
    updatedAt: now,
  };
  data.entries.push(entry);
  return entry;
}

export function resolveEntry(data, identifier) {
  const wanted = identifier?.trim().toLowerCase();
  if (!wanted) throw new Error("A memory ID is required");
  const matches = data.entries.filter((entry) => entry.id.toLowerCase().startsWith(wanted));
  if (matches.length === 0) throw new Error(`No memory matches ID ${identifier}`);
  if (matches.length > 1) throw new Error(`ID prefix ${identifier} is ambiguous`);
  return matches[0];
}

export function editEntry(data, identifier, content, now = new Date().toISOString()) {
  if (!content?.trim()) throw new Error("Memory text cannot be empty");
  const entry = resolveEntry(data, identifier);
  entry.content = content.trim();
  entry.updatedAt = now;
  return entry;
}

export function deleteEntry(data, identifier) {
  const entry = resolveEntry(data, identifier);
  data.entries = data.entries.filter((candidate) => candidate.id !== entry.id);
  return entry;
}

export function queryEntries(data, { query, tag, category, limit } = {}) {
  let entries = [...data.entries];
  if (query) {
    const needle = query.toLowerCase();
    entries = entries.filter((entry) =>
      entry.content.toLowerCase().includes(needle) ||
      entry.tags.some((item) => item.includes(needle)) ||
      entry.category?.toLowerCase().includes(needle),
    );
  }
  if (tag) entries = entries.filter((entry) => entry.tags.includes(tag.toLowerCase()));
  if (category) entries = entries.filter((entry) => entry.category?.toLowerCase() === category.toLowerCase());
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (limit !== undefined) entries = entries.slice(0, limit);
  return entries;
}

export async function changePassword(filePath, data, newPassword) {
  await saveVault(filePath, data, newPassword);
}

export async function acquireVaultLock(filePath) {
  const lockPath = `${filePath}.lock`;
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  } catch (error) {
    if (error.code === "EEXIST") {
      try {
        const lock = JSON.parse(await readFile(lockPath, "utf8"));
        if (Number.isSafeInteger(lock.pid) && lock.pid > 0) {
          let ownerIsRunning = true;
          try {
            process.kill(lock.pid, 0);
          } catch (processError) {
            if (processError.code === "ESRCH") ownerIsRunning = false;
          }
          if (!ownerIsRunning) {
            await rm(lockPath, { force: true });
            return acquireVaultLock(filePath);
          }
        }
      } catch {
        // An unreadable lock is never removed automatically.
      }
      throw new Error(`Vault is already open or has a stale lock: ${lockPath}`);
    }
    if (handle) await handle.close().catch(() => {});
    await rm(lockPath, { force: true }).catch(() => {});
    throw error;
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await handle.close().catch(() => {});
    await rm(lockPath, { force: true });
  };
}
