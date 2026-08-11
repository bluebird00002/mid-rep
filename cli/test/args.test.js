import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments, tokenize } from "../src/args.js";

test("tokenizes quoted interactive commands", () => {
  assert.deepEqual(
    tokenize('add "A private thought" --tags personal,night'),
    ["add", "A private thought", "--tags", "personal,night"],
  );
});

test("preserves quoted and unquoted Windows image paths", () => {
  const windowsPath = String.raw`D:\me\portfolio\public\elibariki-portrait.png`;
  assert.deepEqual(tokenize(String.raw`image add D:\me\portfolio\public\elibariki-portrait.png`), [
    "image", "add", windowsPath,
  ]);
  assert.deepEqual(tokenize(String.raw`image add "D:\me\portfolio\public\elibariki-portrait.png"`), [
    "image", "add", windowsPath,
  ]);
});

test("supports quoted Windows paths with spaces and POSIX escaped spaces", () => {
  assert.deepEqual(tokenize(String.raw`image add "D:\My Photos\portrait.png"`), [
    "image", "add", String.raw`D:\My Photos\portrait.png`,
  ]);
  assert.deepEqual(tokenize(String.raw`image add /tmp/My\ Photo.png`), [
    "image", "add", "/tmp/My Photo.png",
  ]);
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
