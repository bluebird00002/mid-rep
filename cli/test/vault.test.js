import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  acquireVaultLock,
  addEntry,
  deleteEntry,
  editEntry,
  initializeVault,
  loadVault,
  queryEntries,
  saveVault,
} from "../src/vault.js";

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mid-cli-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return path.join(directory, "vault.midvault");
}

test("creates an encrypted vault and persists diary operations", async (t) => {
  const filePath = await fixture(t);
  const password = "correct horse battery staple";
  const data = await initializeVault(filePath, password);
  data.remote = { apiBase: "https://example.test/api", username: "elly", token: "secret-online-token" };
  const first = addEntry(data, {
    content: "Met Sam for coffee",
    category: "personal",
    tags: ["Friends", "coffee", "friends"],
  });
  addEntry(data, { content: "Prepared the release", category: "work", tags: ["release"] });
  await saveVault(filePath, data, password);

  const raw = await readFile(filePath, "utf8");
  assert.equal(raw.includes("Met Sam"), false);
  assert.equal(raw.includes("personal"), false);
  assert.equal(raw.includes("secret-online-token"), false);

  const loaded = await loadVault(filePath, password);
  assert.equal(loaded.entries.length, 2);
  assert.deepEqual(first.tags, ["friends", "coffee"]);
  assert.equal(queryEntries(loaded, { tag: "friends" })[0].id, first.id);
  assert.equal(queryEntries(loaded, { query: "release" }).length, 1);

  editEntry(loaded, first.id.slice(0, 8), "Coffee and a long walk");
  assert.equal(loaded.entries[0].content, "Coffee and a long walk");
  deleteEntry(loaded, first.id.slice(0, 8));
  assert.equal(loaded.entries.length, 1);
});

test("vault lock rejects concurrent writers and releases cleanly", async (t) => {
  const filePath = await fixture(t);
  const release = await acquireVaultLock(filePath);
  await assert.rejects(acquireVaultLock(filePath), /already open/);
  await release();
  const releaseAgain = await acquireVaultLock(filePath);
  await releaseAgain();
});

test("a dead process lock is recovered", async (t) => {
  const filePath = await fixture(t);
  await writeFile(`${filePath}.lock`, JSON.stringify({ pid: 2147483647 }), { mode: 0o600 });
  const release = await acquireVaultLock(filePath);
  await release();
});
