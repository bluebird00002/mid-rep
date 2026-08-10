import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { readSecret } from "../src/prompt.js";

test("repeated password prompts render a mask for every typed character", async () => {
  const input = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (enabled) => { input.isRaw = enabled; };
  let rendered = "";
  const output = { write: (value) => { rendered += value; } };

  const first = readSecret("First: ", { input, output });
  input.write("Abc#1\r");
  assert.equal(await first, "Abc#1");

  const second = readSecret("Again: ", { input, output });
  input.write("Xyz#2\r");
  assert.equal(await second, "Xyz#2");
  assert.equal((rendered.match(/•/g) || []).length, 10);
});
