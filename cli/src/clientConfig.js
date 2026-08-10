import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function defaultConfigPath(environment = process.env) {
  return path.resolve(environment.MID_CONFIG_PATH || path.join(os.homedir(), ".mid", "config.json"));
}

export async function loadClientConfig(filePath, defaultApiBase) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return {
      apiBase: parsed.apiBase || defaultApiBase,
      username: typeof parsed.username === "string" ? parsed.username : null,
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`MiD settings are invalid: ${error.message}`);
    return { apiBase: defaultApiBase, username: null };
  }
}

export async function saveClientConfig(filePath, config) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "w", 0o600);
    await handle.writeFile(`${JSON.stringify({
      apiBase: config.apiBase,
      username: config.username || null,
    }, null, 2)}\n`, "utf8");
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
