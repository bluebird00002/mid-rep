import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { renderImage } from "../src/imageRenderer.js";

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
