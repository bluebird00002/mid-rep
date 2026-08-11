import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const ramp = " .:-=+*#%@";

function blend(channel, alpha) {
  return Math.round(channel * (alpha / 255));
}

function pixel(data, channels, index) {
  const alpha = channels === 4 ? data[index + 3] : 255;
  return [
    blend(data[index], alpha),
    blend(data[index + 1], alpha),
    blend(data[index + 2], alpha),
  ];
}

function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function renderImage(buffer, { width = 40, color = true, maxRows = 24, crop = false } = {}) {
  const safeWidth = Math.max(12, Math.min(100, Number(width) || 48));
  const safeRows = Math.max(6, Math.min(50, Number(maxRows) || 24));
  const resize = crop
    ? { width: safeWidth, height: safeRows * 2, fit: "cover", position: "attention" }
    : { width: safeWidth, height: safeRows * 2, fit: "inside", withoutEnlargement: true };
  const { data, info } = await sharp(buffer, { animated: false, limitInputPixels: 40_000_000 })
    .autoOrient()
    .resize(resize)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lines = [];
  if (!color) {
    for (let y = 0; y < info.height; y += 2) {
      let line = "";
      for (let x = 0; x < info.width; x += 1) {
        const top = pixel(data, info.channels, (y * info.width + x) * info.channels);
        const bottomY = Math.min(y + 1, info.height - 1);
        const bottom = pixel(data, info.channels, (bottomY * info.width + x) * info.channels);
        const value = (luminance(top) + luminance(bottom)) / 2;
        line += ramp[Math.round((value / 255) * (ramp.length - 1))];
      }
      lines.push(line.trimEnd());
    }
    return lines.join("\n");
  }

  for (let y = 0; y < info.height; y += 2) {
    let line = "";
    for (let x = 0; x < info.width; x += 1) {
      const top = pixel(data, info.channels, (y * info.width + x) * info.channels);
      const bottomY = Math.min(y + 1, info.height - 1);
      const bottom = pixel(data, info.channels, (bottomY * info.width + x) * info.channels);
      line += `\u001b[38;2;${top.join(";")}m\u001b[48;2;${bottom.join(";")}m\u2580`;
    }
    lines.push(`${line}\u001b[0m`);
  }
  return lines.join("\n");
}

function extensionFor(contentType) {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

export async function cleanupViewerCache(directory = path.join(os.homedir(), ".mid", "view-cache")) {
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  await Promise.all(names.map(async (name) => {
    const filePath = path.join(directory, name);
    const info = await stat(filePath).catch(() => null);
    if (info?.isFile() && info.mtimeMs < cutoff) await rm(filePath, { force: true });
  }));
}

export async function openImage(buffer, contentType, directory = path.join(os.homedir(), ".mid", "view-cache")) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filePath = path.join(directory, `${randomUUID()}${extensionFor(contentType)}`);
  await writeFile(filePath, buffer, { mode: 0o600 });

  let child;
  if (process.platform === "win32") {
    child = spawn("powershell.exe", ["-NoProfile", "-Command", "Start-Process -LiteralPath $args[0]", filePath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
  } else if (process.platform === "darwin") {
    child = spawn("open", [filePath], { detached: true, stdio: "ignore" });
  } else {
    child = spawn("xdg-open", [filePath], { detached: true, stdio: "ignore" });
  }
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", (error) => reject(new Error(`Unable to open the system image viewer: ${error.message}`)));
  });
  child.unref();
  return filePath;
}
