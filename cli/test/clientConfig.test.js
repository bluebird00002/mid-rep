import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadClientConfig, saveClientConfig } from "../src/clientConfig.js";

test("device settings never persist passwords or session tokens", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mid-config-"));
  const filePath = path.join(directory, "config.json");
  try {
    await saveClientConfig(filePath, {
      apiBase: "https://mid.example/api",
      username: "owner",
      token: "must-not-be-saved",
      password: "must-not-be-saved",
    });
    const serialized = await readFile(filePath, "utf8");
    assert.doesNotMatch(serialized, /must-not-be-saved/);
    assert.deepEqual(await loadClientConfig(filePath, "https://default.example/api"), {
      apiBase: "https://mid.example/api",
      username: "owner",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
