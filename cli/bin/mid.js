#!/usr/bin/env node

import { run } from "../src/cli.js";

run(process.argv.slice(2)).catch((error) => {
  const message = error?.code === "MID_AUTH_FAILED"
    ? "Unable to unlock the vault. The password is incorrect or the vault is damaged."
    : error?.message || String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
