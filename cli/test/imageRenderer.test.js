import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { renderImage, renderNativeImage, terminalGraphicsProtocol } from "../src/imageRenderer.js";

const sample = Buffer.from(`
  <svg width="4" height="4" xmlns="http://www.w3.org/2000/svg">
    <rect width="2" height="4" fill="#ff0000"/>
    <rect x="2" width="2" height="4" fill="#00ff00"/>
  </svg>
`);

test("portable monochrome renderer outputs terminal characters without ANSI", async () => {
  const rendered = await renderImage(sample, { width: 12, color: false });
  assert.ok(rendered.length > 0);
  assert.equal(rendered.includes("\u001b["), false);
});

test("color renderer uses true-color ANSI half blocks", async () => {
  const rendered = await renderImage(sample, { width: 12, color: true });
  assert.match(rendered, /\u001b\[38;2;/);
  assert.match(rendered, /▀/);
});

test("portrait previews respect the terminal row cap", async () => {
  const portrait = await sharp({
    create: { width: 60, height: 240, channels: 3, background: { r: 220, g: 120, b: 40 } },
  }).png().toBuffer();
  const contained = await renderImage(portrait, { width: 24, maxRows: 8, color: false });
  const cropped = await renderImage(portrait, { width: 24, maxRows: 8, crop: true, color: false });
  assert.ok(contained.split("\n").length <= 8);
  assert.equal(cropped.split("\n").length, 8);
});

test("detects native terminal graphics without misidentifying Windows Terminal", () => {
  assert.equal(terminalGraphicsProtocol({ WEZTERM_PANE: "1" }, { isTTY: true }), "kitty");
  assert.equal(terminalGraphicsProtocol({ TERM_PROGRAM: "iTerm.app" }, { isTTY: true }), "iterm");
  assert.equal(terminalGraphicsProtocol({ WT_SESSION: "session" }, { isTTY: true }), null);
  assert.equal(terminalGraphicsProtocol({ WEZTERM_PANE: "1" }, { isTTY: false }), null);
});

test("encodes native Kitty and iTerm image payloads", async () => {
  const kitty = await renderNativeImage(sample, { protocol: "kitty", width: 12, maxRows: 6 });
  const iterm = await renderNativeImage(sample, { protocol: "iterm", width: 12, maxRows: 6 });
  assert.match(kitty, /\u001b_Ga=T,f=100/);
  assert.match(kitty, /\u001b\\/);
  assert.match(iterm, /\u001b\]1337;File=inline=1/);
});
