import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments, tokenize } from "../src/args.js";

test("tokenizes quoted interactive commands", () => {
  assert.deepEqual(
    tokenize('add "A private thought" --tags personal,night'),
    ["add", "A private thought", "--tags", "personal,night"],
  );
});

test("parses flags and positional values", () => {
  assert.deepEqual(
    parseArguments(["memory", "--category", "work", "--yes"]),
    { positionals: ["memory"], options: { category: "work", yes: true } },
  );
});

test("rejects unclosed quotes", () => {
  assert.throws(() => tokenize('add "unfinished'), /Unclosed quote/);
});
