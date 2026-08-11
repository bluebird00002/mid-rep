import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const ramp = " .:-=+*#%@";
const ESC = "\u001b";

export function terminalGraphicsProtocol(environment = process.env, { isTTY = process.stdout.isTTY } = {}) {
  if (!isTTY || environment.TERM === "dumb") return null;
  const term = String(environment.TERM || "").toLowerCase();
  const program = String(environment.TERM_PROGRAM || "").toLowerCase();
  if (environment.WEZTERM_PANE || program === "wezterm") return "wezterm";
  if (
    environment.KITTY_WINDOW_ID
    || environment.GHOSTTY_RESOURCES_DIR
    || term.includes("kitty")
    || program === "ghostty"
  ) return "kitty";
  if (program === "iterm.app" || program === "vscode" || program === "warpterminal") return "iterm";
  return null;
}

export async function displayNativeImage(buffer, {
  protocol,
  width = 40,
  maxRows = 24,
  output = process.stdout,
} = {}) {
  if (protocol !== "wezterm") {
    const rendered = await renderNativeImage(buffer, { protocol, width, maxRows });
    if (!rendered) return false;
    output.write(`${rendered}\n`);
    return true;
  }

  const { columns, rows } = await nativeDimensions(buffer, width, maxRows);
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? "wezterm.exe" : "wezterm";
    const child = spawn(executable, [
      "imgcat",
      "--width", String(columns),
      "--height", String(rows),
      "--resample-format", "png",
    ], {
      shell: false,
      // imgcat must inherit the real terminal descriptor. A pipe reports a
      // zero-sized terminal through Windows ConPTY and older WezTerm releases
      // can panic while calculating the image geometry.
      stdio: ["pipe", Number.isInteger(output.fd) ? output.fd : "inherit", "pipe"],
      windowsHide: true,
    });
    let diagnostic = "";
    child.stderr.on("data", (chunk) => {
      if (diagnostic.length < 500) diagnostic += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(true);
      else {
        const summary = diagnostic.trim().split(/\r?\n/, 1)[0].slice(0, 180);
        reject(new Error(summary || `wezterm imgcat exited with code ${code}`));
      }
    });
    child.stdin.on("error", reject);
    child.stdin.end(buffer);
  });
}

async function nativeDimensions(buffer, width, maxRows) {
  const metadata = await sharp(buffer, { animated: false, limitInputPixels: 40_000_000 }).autoOrient().metadata();
  const aspect = metadata.width && metadata.height ? metadata.height / metadata.width : 1;
  let columns = Math.max(12, Math.min(100, Number(width) || 40));
  let rows = Math.max(1, Math.ceil((aspect * columns) / 2));
  const rowLimit = Math.max(6, Math.min(50, Number(maxRows) || 24));
  if (rows > rowLimit) {
    rows = rowLimit;
    columns = Math.max(12, Math.floor((rows * 2) / aspect));
  }
  return { columns, rows };
}

export async function renderNativeImage(buffer, { protocol, width = 40, maxRows = 24 } = {}) {
  if (!protocol) return null;
  const { columns, rows } = await nativeDimensions(buffer, width, maxRows);
  const png = await sharp(buffer, { animated: false, limitInputPixels: 40_000_000 }).autoOrient().png().toBuffer();
  const encoded = png.toString("base64");
  if (protocol === "iterm") {
    return `${ESC}]1337;File=inline=1;width=${columns};height=${rows};preserveAspectRatio=1:${encoded}\u0007`;
  }
  if (protocol === "kitty") {
    const chunks = encoded.match(/.{1,4096}/g) || [""];
    return chunks.map((chunk, index) => {
      const more = index < chunks.length - 1 ? 1 : 0;
      const control = index === 0
        ? `a=T,f=100,t=d,q=2,c=${columns},r=${rows},m=${more}`
        : `m=${more}`;
      return `${ESC}_G${control};${chunk}${ESC}\\`;
    }).join("");
  }
  return null;
}

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
