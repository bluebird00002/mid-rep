import assert from "node:assert/strict";
import test from "node:test";
import { decryptVault, encryptVault } from "../src/crypto.js";

test("vault encryption round-trips without plaintext in the envelope", async () => {
  const data = { version: 1, entries: [{ content: "a private memory" }] };
  const encrypted = await encryptVault(data, "correct horse battery staple");
  assert.equal(encrypted.includes("a private memory"), false);
  assert.deepEqual(await decryptVault(encrypted, "correct horse battery staple"), data);
});

test("wrong passwords are rejected", async () => {
  const encrypted = await encryptVault({ version: 1, entries: [] }, "correct horse battery staple");
  await assert.rejects(
    decryptVault(encrypted, "incorrect password"),
    (error) => error.code === "MID_AUTH_FAILED",
  );
});

test("ciphertext tampering is detected", async () => {
  const encrypted = await encryptVault({ version: 1, entries: [] }, "correct horse battery staple");
  const envelope = JSON.parse(encrypted);
  const payload = Buffer.from(envelope.payload, "base64");
  payload[0] ^= 1;
  envelope.payload = payload.toString("base64");
  await assert.rejects(
    decryptVault(JSON.stringify(envelope), "correct horse battery staple"),
    (error) => error.code === "MID_AUTH_FAILED",
  );
});
