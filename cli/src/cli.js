import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import process from "node:process";
import { parseArguments, tokenize } from "./args.js";
import { MiDOnlineApi, normalizeApiBase, unwrapImages, unwrapMemories } from "./api.js";
import { PASSWORD_RULES, USERNAME_RULES, validateAccountPassword, validateAccountUsername } from "./accountValidation.js";
import { defaultConfigPath, loadClientConfig, saveClientConfig } from "./clientConfig.js";
import { cleanupViewerCache, displayNativeImage, openImage, renderImage, terminalGraphicsProtocol } from "./imageRenderer.js";
import { ask, askYesNo, readSecret, requestNewPassword } from "./prompt.js";
import { aboutText, banner, formatEntry, formatImageCard, helpText, panel, ui } from "./ui.js";
import {
  acquireVaultLock,
  addEntry,
  changePassword,
  deleteEntry,
  emptyVault,
  editEntry,
  initializeVault,
  loadVault,
  queryEntries,
  resolveEntry,
  saveVault,
  vaultExists,
} from "./vault.js";

const VERSION = "2.0.0";
export const DEFAULT_API_BASE = "https://mid-rep.onrender.com/api";

export function defaultVaultPath(environment = process.env) {
  return path.resolve(environment.MID_VAULT_PATH || path.join(os.homedir(), ".mid", "vault.midvault"));
}

export function promptLabel(remote = {}) {
  return remote.token && remote.username ? remote.username : "mid";
}

function installWezTerm() {
  return new Promise((resolve, reject) => {
    const child = spawn("winget", ["install", "--id", "wez.wezterm", "--exact", "--source", "winget"], {
      shell: false,
      stdio: "inherit",
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) return resolve();
      const error = new Error(`WezTerm installer exited with code 0x${Number(code).toString(16).toUpperCase()}`);
      error.code = "MID_WEZTERM_INSTALL_FAILED";
      error.exitCode = code;
      reject(error);
    });
  });
}

export function shouldRedirectToWezTerm(environment = process.env, {
  platform = process.platform,
  isTTY = process.stdin.isTTY && process.stdout.isTTY,
} = {}) {
  if (environment.MID_NO_TERMINAL_REDIRECT === "1") return false;
  return platform === "win32"
    && Boolean(isTTY)
    && terminalGraphicsProtocol(environment, { isTTY: true }) !== "wezterm";
}

function spawnDetached(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      detached: true,
      shell: false,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}

async function launchMiDInWezTerm(argv) {
  const args = [
    "start",
    "--cwd", process.cwd(),
    "--",
    process.execPath,
    process.argv[1],
    ...argv,
  ];
  const candidates = [
    "wezterm.exe",
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "WezTerm", "wezterm.exe"),
  ].filter(Boolean);
  let lastError;
  for (const executable of [...new Set(candidates)]) {
    try {
      await spawnDetached(executable, args);
      return;
    } catch (error) {
      lastError = error;
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw lastError || new Error("WezTerm is not installed");
}

async function redirectToWezTerm(argv, { input, output }) {
  output.write(`${panel("MiD NEEDS WEZTERM", [
    "MiD uses WezTerm on Windows so memories, pictures, and the full interface work consistently.",
    "This CMD, PowerShell, or Windows Terminal session will not run the interactive MiD application.",
  ], { width: Math.min(84, output.columns || 72) })}\n`);
  try {
    await launchMiDInWezTerm(argv);
    output.write(`${ui.green("Opening MiD in WezTerm...")} You may close this window.\n`);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`Unable to open WezTerm: ${error.message}`);
  }

  const approved = await askYesNo("WezTerm is required but is not installed. Install it now with Windows Package Manager?", { input, output });
  if (!approved) {
    output.write(`${ui.yellow("MiD was not started.")} Install WezTerm or run MiD again and approve installation.\n`);
    return;
  }
  await ask("Close every open WezTerm window before installation, then press Enter to continue: ", { input, output });
  try {
    await installWezTerm();
  } catch (error) {
    if (error.code === "MID_WEZTERM_INSTALL_FAILED") {
      output.write(`${ui.red("WezTerm could not be installed because one of its files may still be in use.")}\n`);
      output.write("Close every WezTerm window completely, then run mid again from CMD or PowerShell.\n");
      return;
    }
    throw error;
  }
  await launchMiDInWezTerm(argv);
  output.write(`${ui.green("WezTerm installed. Opening MiD now...")} You may close this window.\n`);
}

async function configureImageViewing(context, { firstRun = false } = {}) {
  const protocol = terminalGraphicsProtocol(process.env, { isTTY: context.output.isTTY });
  if (firstRun && context.data.remote.imageSetupSeen) return;

  context.output.write(`\n${panel("IMAGE VIEWING", [
    protocol
      ? "This terminal supports sharp inline images. MiD is ready to display them."
      : "MiD can always open the clear original in your computer's image viewer.",
    protocol
      ? "Use image show <id> or show all."
      : "Sharp images inside the terminal require a graphics-capable terminal such as WezTerm.",
  ], { width: Math.min(84, context.output.columns || 72) })}\n`);

  context.data.remote.imageSetupSeen = true;
  await context.persist();
  if (protocol) return;

  if (process.platform !== "win32") {
    context.output.write(`${ui.dim("Use image open <id> for full resolution, or install a supported terminal listed in help.")}\n`);
    return;
  }

  const approved = await context.confirm("Install WezTerm now for sharp inline images? MiD will run Windows Package Manager");
  if (!approved) {
    context.output.write(`${ui.dim("Skipped. Run image setup whenever you want to install it.")}\n`);
    return;
  }

  context.output.write(`${ui.dim("Opening the verified WezTerm package installer...")}\n`);
  try {
    await installWezTerm();
    context.output.write(`${ui.green("WezTerm installed.")} Open WezTerm, then run MiD there to display sharp inline images.\n`);
  } catch (error) {
    const message = error.code === "ENOENT"
      ? "Windows Package Manager (winget) is unavailable. Install WezTerm from https://wezterm.org/install/windows.html"
      : error.message;
    throw new Error(`Could not install WezTerm: ${message}`);
  }
}

async function collectRegistrationDetails({ suggested, askUsername, askMotherAddress, secret, write, api, beforeNetwork = async () => {} }) {
  write(`${ui.orange("Username rules:")} ${USERNAME_RULES}.\n`);
  let username = suggested || await askUsername();
  while (true) {
    const result = validateAccountUsername(username);
    if (!result.valid) {
      write(`${ui.red("Invalid username:")} ${result.error}.\n`);
      username = await askUsername();
      continue;
    }
    username = result.username;
    write(`${ui.dim(`Checking ${username} with the online library...`)}\n`);
    await beforeNetwork();
    const availability = await api.checkUsername(username);
    if (!availability.available) {
      write(`${ui.red("Username unavailable:")} ${availability.error || "choose another username"}.\n`);
      username = await askUsername();
      continue;
    }
    write(`${ui.green("Username is available:")} ${username}\n`);
    break;
  }

  write(`${ui.orange("Password rules:")} ${PASSWORD_RULES}.\n`);
  let password;
  while (true) {
    password = await secret("Choose account password: ");
    const result = validateAccountPassword(password);
    if (!result.valid) {
      write(`${ui.red("Weak password:")} ${result.error}.\n`);
      continue;
    }
    const confirmation = await secret("Confirm account password: ");
    if (password !== confirmation) {
      write(`${ui.red("Passwords do not match.")} Try again.\n`);
      continue;
    }
    break;
  }

  const requiredAnswer = async (question) => {
    while (true) {
      const answer = await secret(question);
      if (answer.trim()) return answer;
      write(`${ui.red("A security answer is required.")}\n`);
    }
  };
  write(`${ui.orange("Mother preference:")} choose how Mother should address you: son, daughter, or child.\n`);
  let motherAddress;
  while (!motherAddress) {
    const answer = (await askMotherAddress()).trim().toLowerCase();
    if (["son", "daughter", "child"].includes(answer)) motherAddress = answer;
    else write(`${ui.red("Please choose son, daughter, or child.")}\n`);
  }
  write(`${ui.orange("Recovery questions:")} answers are hidden and required.\n`);
  return {
    username,
    password,
    motherAddress,
    securityAnswers: {
      answer1: await requiredAnswer("Favorite color (hidden): "),
      answer2: await requiredAnswer("First pet's name (hidden): "),
      answer3: await requiredAnswer("City of birth (hidden): "),
    },
  };
}

function parseLimit(value) {
  if (value === undefined) return undefined;
  const limit = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("--limit must be an integer between 1 and 1000");
  }
  return limit;
}

function parseWidth(value, fallback = Math.min(72, process.stdout.columns || 72)) {
  if (value === undefined) return fallback;
  const width = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(width) || width < 12 || width > 120) {
    throw new Error("--width must be an integer between 12 and 120");
  }
  return width;
}

function supportsTrueColor(output) {
  if (!output.isTTY || process.env.NO_COLOR || process.env.TERM === "dumb") return false;
  if (typeof output.getColorDepth === "function") return output.getColorDepth() >= 24;
  return process.env.COLORTERM === "truecolor" || Boolean(process.env.WT_SESSION);
}

function tagsFrom(options) {
  const value = options.tags || options.tag;
  return value ? value.split(",").map((tag) => tag.trim().replace(/^#/, "").toLowerCase()).filter(Boolean) : [];
}

export function interpretShow(positionals, options, command = "show") {
  let identifier = positionals[0];
  const tags = tagsFrom(options);
  if (identifier?.startsWith("#")) {
    tags.push(identifier.slice(1).toLowerCase());
    identifier = null;
  }
  return {
    identifier,
    tags,
    filtered: tags.length > 0 || Boolean(options.category) || identifier === "all" || command === "list",
  };
}

function memoryOptions(options) {
  return { category: options.category || null, tags: tagsFrom(options) };
}

function normalizeMemory(memory) {
  return {
    ...memory,
    id: String(memory.id || memory.memory_id),
    content: memory.content || memory.description || "",
    tags: Array.isArray(memory.tags) ? memory.tags : [],
    createdAt: memory.createdAt || memory.created_at || new Date().toISOString(),
    updatedAt: memory.updatedAt || memory.updated_at || memory.created_at || new Date().toISOString(),
  };
}

function normalizeImage(image) {
  return {
    ...image,
    id: String(image.id || image.image_id),
    image_url: image.image_url || image.url || image.file_path,
    tags: Array.isArray(image.tags) ? image.tags : [],
  };
}

function printEntries(entries, output, width) {
  if (entries.length === 0) {
    output.write(`${ui.dim("No memories found.")}\n`);
    return;
  }
  output.write(`${entries.map((entry) => formatEntry(entry, { width })).join("\n")}\n`);
}

function printImages(images, output, width) {
  if (images.length === 0) {
    output.write(`${ui.dim("No images found.")}\n`);
    return;
  }
  output.write(`${images.map((image) => formatImageCard(image, { width })).join("\n")}\n`);
}

async function printRenderedImages(images, api, context, width, options = {}) {
  if (images.length === 0) return;
  const renderWidth = parseWidth(options.width, Math.min(44, (context.output.columns || 72) - 8));
  const color = !options.mono && supportsTrueColor(context.output);
  const nativeProtocol = options.mono ? null : terminalGraphicsProtocol(process.env, { isTTY: context.output.isTTY });
  for (const image of images) {
    context.output.write(`${formatImageCard(image, { width: Math.max(40, width) })}\n`);
    if (!image.image_url) {
      context.output.write(`${ui.dim("Image preview is unavailable.")}\n`);
      continue;
    }
    try {
      const downloaded = await api.downloadImage(image.image_url);
      let nativeError = null;
      let displayed = false;
      if (nativeProtocol) {
        try {
          displayed = await displayNativeImage(downloaded.buffer, {
            protocol: nativeProtocol,
            width: renderWidth,
            maxRows: 24,
            output: context.output,
          });
        } catch (error) {
          nativeError = error;
        }
      }
      if (!displayed) {
        context.output.write(`${await renderImage(downloaded.buffer, {
          width: renderWidth,
          color,
          maxRows: 24,
          crop: true,
        })}\n`);
        const guidance = nativeError
          ? `Native viewer failed; character preview shown (${nativeError.message}). Clear original: image open ${image.id.slice(0, 8)}`
          : `Clear original: image open ${image.id.slice(0, 8)} | Sharp inline images: run MiD in WezTerm.`;
        context.output.write(`${ui.dim(guidance)}\n`);
      }
    } catch (error) {
      if (error.code === "MID_CANCELLED") throw error;
      context.output.write(`${ui.yellow(`Preview unavailable: ${error.message}`)}\n`);
    }
  }
}

function requireAdminApi(context) {
  if (!context.state.admin?.api) throw new Error('Administrator mode is not active. Run: me admin');
  context.state.admin.api.setRuntime({
    signal: context.state.commandSignal || null,
  });
  return context.state.admin.api;
}

async function resolveAdminUser(api, identifier) {
  if (!identifier) throw new Error("A user ID or username is required");
  const response = await api.adminUsers(100);
  const users = response?.data?.users || response?.users || [];
  const wanted = identifier.toLowerCase();
  const matches = users.filter((user) => user.id.toLowerCase().startsWith(wanted) || user.username?.toLowerCase() === wanted);
  if (matches.length === 0) throw new Error(`No user matches ${identifier}`);
  if (matches.length > 1) throw new Error(`User ID ${identifier} is ambiguous`);
  return matches[0];
}

function filterLocalEntries(data, { tags, category, query, limit }) {
  let entries = queryEntries(data, { query, category });
  if (tags?.length) {
    entries = entries.filter((entry) => tags.some((tag) => entry.tags.includes(tag)));
  }
  return limit ? entries.slice(0, limit) : entries;
}

async function resolveRemoteMemory(api, identifier) {
  const entries = unwrapMemories(await api.listMemories()).map(normalizeMemory);
  return resolveEntry({ entries }, identifier);
}

async function resolveRemoteImage(api, identifier) {
  const entries = unwrapImages(await api.listImages()).map(normalizeImage);
  return resolveEntry({ entries }, identifier);
}

export async function syncLocalEntries(data, api, persist, onSynced = () => {}) {
  const pending = data.entries.filter((entry) => !entry.remoteId);
  for (const entry of pending) {
    const response = await api.createMemory({
      type: "text",
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
    });
    entry.remoteId = response?.data?.id || response?.id;
    entry.syncedAt = new Date().toISOString();
    await persist();
    onSynced(entry);
  }
  return pending.length;
}

async function inspectVault(filePath, output) {
  output.write(`${banner()}\n\n`);
  output.write(`Vault: ${filePath}\n`);
  if (!(await vaultExists(filePath))) {
    output.write(`${ui.yellow("Status: not initialized")}\n`);
    return;
  }
  const info = await stat(filePath);
  let envelope;
  try {
    envelope = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    output.write("Status: invalid vault envelope\n");
    return;
  }
  output.write(`Format: ${envelope.format || "unknown"} v${envelope.version || "?"}\n`);
  output.write(`Encryption: ${envelope.cipher?.name || "unknown"}\n`);
  output.write(`Key derivation: ${envelope.kdf?.name || "unknown"}\n`);
  if (process.platform === "win32") {
    output.write("Permissions: protected by Windows account ACLs; keep your Windows account private\n");
  } else {
    const permissions = info.mode & 0o777;
    output.write(`Permissions: ${permissions.toString(8)} (${(permissions & 0o077) === 0 ? "private" : "too broad"})\n`);
  }
  output.write(`Plaintext payload: ${Object.hasOwn(envelope, "entries") ? "FOUND (unsafe)" : "not present"}\n`);
}

function requireApi(context, { authenticated = true } = {}) {
  const base = context.data.remote.apiBase || process.env.MID_API_BASE;
  if (!base) throw new Error("No online server configured. Run: connect https://your-server.example/api");
  if (!context.state.api) context.state.api = new MiDOnlineApi(base, context.data.remote.token);
  context.state.api.setRuntime({
    signal: context.state.commandSignal || null,
  });
  if (authenticated && !context.state.api.token) throw new Error("You are not logged in. Run: login <username>");
  return context.state.api;
}

function usesOnline(context) {
  return !context.globalOptions.local && Boolean(context.data.remote.apiBase || process.env.MID_API_BASE);
}

async function executeImage(args, options, context) {
  const [action, ...positionals] = args;
  if (action === "setup") {
    await configureImageViewing(context);
    return;
  }
  const api = requireApi(context);
  const width = parseWidth(options.width, Math.min(48, (context.output.columns || 72) - 8));

  if (action === "add") {
    const filePath = positionals.join(" ");
    if (!filePath) throw new Error("Usage: image add <path> [--tags a,b] [--description text]");
    context.output.write(`${ui.dim("Uploading image securely over HTTPS...")}\n`);
    const response = await api.uploadImage(path.resolve(filePath), {
      description: options.description || "",
      tags: tagsFrom(options),
    });
    const image = normalizeImage(response.data || response.image || response);
    context.output.write(`${ui.green("Uploaded")} ${image.id.slice(0, 8)}\n`);
    return;
  }

  if (action === "list") {
    const response = await api.listImages({ tags: tagsFrom(options), date: options.date });
    printImages(unwrapImages(response).map(normalizeImage), context.output, Math.max(40, width));
    return;
  }

  if (action === "show" || action === "open") {
    const image = await resolveRemoteImage(api, positionals[0]);
    const detail = await api.getImage(image.id);
    const selected = normalizeImage(detail?.data?.image || detail?.image || image);
    if (!selected.image_url) throw new Error("This image has no downloadable URL");
    const downloaded = await api.downloadImage(selected.image_url);
    context.output.write(`${formatImageCard(selected, { width: Math.max(40, width) })}\n`);
    const color = !options.mono && supportsTrueColor(context.output);
    const nativeProtocol = options.mono ? null : terminalGraphicsProtocol(process.env, { isTTY: context.output.isTTY });
    let nativeError = null;
    let displayed = false;
    if (nativeProtocol) {
      try {
        displayed = await displayNativeImage(downloaded.buffer, {
          protocol: nativeProtocol,
          width,
          maxRows: 30,
          output: context.output,
        });
      } catch (error) {
        nativeError = error;
      }
    }
    if (!displayed) {
      context.output.write(`${await renderImage(downloaded.buffer, { width, color, maxRows: 30 })}\n`);
      const guidance = nativeError
        ? `Native viewer failed; character preview shown (${nativeError.message}). Use image open for the clear original.`
        : "This terminal uses a character preview. Use image open for the clear original, or run MiD in WezTerm for sharp inline images.";
      context.output.write(`${ui.dim(guidance)}\n`);
    }
    if (options.open || action === "open") {
      await openImage(downloaded.buffer, downloaded.contentType);
      context.output.write(`${ui.dim("Opened the full-resolution image in the system viewer.")}\n`);
    }
    return;
  }

  if (action === "delete") {
    const image = await resolveRemoteImage(api, positionals[0]);
    const confirmed = options.yes || await context.confirm(`Delete image ${image.id.slice(0, 8)} permanently?`);
    if (!confirmed) return context.output.write("Cancelled.\n");
    await api.deleteImage(image.id);
    context.output.write(`${ui.green("Deleted image")} ${image.id.slice(0, 8)}\n`);
    return;
  }

  throw new Error("Image commands: image setup, image add, image list, image show, image open, image delete");
}

async function execute(command, argv, context, preParsed = null) {
  const { positionals, options } = preParsed || parseArguments(argv);
  const width = parseWidth(options.width, Math.min(84, context.output.columns || 72));

  switch (command) {
    case "connect": {
      const base = normalizeApiBase(positionals[0]);
      context.data.remote = {
        apiBase: base,
        username: null,
        token: null,
        imageSetupSeen: context.data.remote.imageSetupSeen === true,
      };
      context.state.api = new MiDOnlineApi(base);
      await context.persist();
      context.output.write(`${ui.green("Connected configuration saved:")} ${base}\nRun ${ui.orange("login <username>")} or ${ui.orange("register <username>")}.\n`);
      break;
    }
    case "login": {
      const api = requireApi(context, { authenticated: false });
      const credentials = await context.loginCredentials(positionals[0]);
      const response = await api.login(credentials.username.toLowerCase().trim(), credentials.password);
      const token = response?.data?.token;
      const user = response?.data?.user;
      if (!token || !user) throw new Error("The server returned an invalid login response");
      api.setToken(token);
      context.data.remote.token = token;
      context.data.remote.username = user.username;
      await context.persist();
      context.output.write(`${ui.green("Signed in securely as")} ${ui.bold(user.username)}\n`);
      break;
    }
    case "register": {
      const api = requireApi(context, { authenticated: false });
      const details = await context.registrationDetails(positionals[0], api);
      const response = await api.register(details.username.toLowerCase().trim(), details.password, details.securityAnswers, details.motherAddress);
      const token = response?.data?.token;
      const user = response?.data?.user;
      if (!token || !user) throw new Error("The server returned an invalid registration response");
      api.setToken(token);
      context.data.remote.token = token;
      context.data.remote.username = user.username;
      await context.persist();
      context.output.write(`${ui.green("Library created. Signed in as")} ${ui.bold(user.username)}\n`);
      break;
    }
    case "me": {
      if (positionals[0]?.toLowerCase() !== "admin") throw new Error('Use "me admin" to request administrator mode');
      const accountApi = requireApi(context);
      const password = await context.adminPassword();
      const response = await accountApi.adminLogin(password);
      const adminToken = response?.data?.token;
      const admin = response?.data?.admin;
      if (!adminToken || !admin) throw new Error("The server returned an invalid administrator session");
      context.state.admin = {
        ...admin,
        api: new MiDOnlineApi(context.data.remote.apiBase, adminToken),
      };
      context.output.write(`${panel("ADMIN MODE", [
        `Signed in as: ${admin.username}`,
        `Role: ${admin.role}`,
        "Admin access expires after 15 minutes and every management action is audited.",
        "Run admin help to see administrative commands.",
      ], { width, accent: ui.orange })}\n`);
      break;
    }
    case "admin": {
      const action = positionals[0]?.toLowerCase() || "overview";
      if (action === "help") {
        context.output.write(`${panel("ADMIN COMMANDS", [
          "admin overview              Show system totals and your role",
          "admin users [--limit 50]    List accounts, roles, and status",
          "admin activity [--limit 50] Show recent audited admin actions",
          "admin suspend <user>        Suspend a user account",
          "admin activate <user>       Restore a suspended account",
          "admin grant <user>          Give admin role (superadmin only)",
          "admin revoke <user>         Remove admin role (superadmin only)",
          "admin logout                Leave administrator mode",
        ], { width })}\n`);
        break;
      }
      if (action === "logout") {
        context.state.admin = null;
        context.output.write(`${ui.green("Administrator mode closed.")}\n`);
        break;
      }
      const api = requireAdminApi(context);
      if (action === "overview" || action === "status") {
        const result = await api.adminOverview();
        const value = result.data || result;
        context.output.write(`${panel("SYSTEM OVERVIEW", [
          `Users: ${value.users}`,
          `Memories: ${value.memories}`,
          `Images: ${value.images}`,
          `Your role: ${value.role}`,
        ], { width })}\n`);
        break;
      }
      if (action === "users") {
        const result = await api.adminUsers(parseLimit(options.limit) || 50);
        const users = result?.data?.users || [];
        if (!users.length) context.output.write(`${ui.dim("No users found.")}\n`);
        else for (const user of users) {
          context.output.write(`${ui.orange(user.id.slice(0, 8))}  ${user.username}  ${user.role}  ${user.status}\n`);
        }
        break;
      }
      if (action === "activity") {
        const result = await api.adminActivity(parseLimit(options.limit) || 50);
        const activity = result?.data?.activity || [];
        if (!activity.length) context.output.write(`${ui.dim("No audited admin activity found.")}\n`);
        else for (const event of activity) {
          context.output.write(`${ui.dim(event.created_at || "pending")}  ${ui.orange(event.actor_username)}  ${event.action}${event.details?.username ? `  ${event.details.username}` : ""}\n`);
        }
        break;
      }
      if (["suspend", "activate", "grant", "revoke"].includes(action)) {
        const user = await resolveAdminUser(api, positionals[1]);
        const confirmed = options.yes || await context.confirm(`${action} ${user.username}?`);
        if (!confirmed) {
          context.output.write("Cancelled.\n");
          break;
        }
        if (action === "suspend" || action === "activate") {
          await api.setUserStatus(user.id, action === "suspend" ? "suspended" : "active");
        } else {
          await api.setUserRole(user.id, action === "grant" ? "admin" : "user");
        }
        context.output.write(`${ui.green("Updated user:")} ${user.username}\n`);
        break;
      }
      throw new Error('Unknown admin command. Run "admin help"');
    }
    case "logout":
      context.data.remote.token = null;
      context.data.remote.username = null;
      context.state.api?.setToken(null);
      await context.persist();
      context.output.write(`${ui.green("Signed out of this MiD session.")}\n`);
      break;
    case "sync": {
      const api = requireApi(context);
      const pending = context.data.entries.filter((entry) => !entry.remoteId);
      if (pending.length === 0) {
        context.output.write(`${ui.dim("No unsynced local memories found.")}\n`);
        break;
      }
      const synced = await syncLocalEntries(context.data, api, context.persist, (entry) => {
        context.output.write(`${ui.green("Synced")} ${entry.id.slice(0, 8)} → ${String(entry.remoteId).slice(0, 8)}\n`);
      });
      context.output.write(`${ui.bold(`${synced} local memories are now available online.`)}\n`);
      break;
    }
    case "status": {
      const remote = context.data.remote;
      context.output.write(`${panel("STATUS", [
        `Mode: ${usesOnline(context) ? "online" : "local"}`,
        `Server: ${remote.apiBase || "not configured"}`,
        `User: ${remote.token ? remote.username : remote.username ? `${remote.username} (not signed in)` : "not signed in"}`,
        `Device settings: ${context.filePath}`,
      ], { width })}\n`);
      break;
    }
    case "add": {
      const content = positionals.join(" ");
      if (!content.trim()) throw new Error("Memory text cannot be empty");
      if (usesOnline(context)) {
        const api = requireApi(context);
        const response = await api.createMemory({ type: "text", content, ...memoryOptions(options) });
        const id = response?.data?.id || response?.id;
        context.output.write(`${ui.green("Saved online")} ${String(id).slice(0, 8)}\n`);
      } else {
        const entry = addEntry(context.data, { content, ...memoryOptions(options) });
        await context.persist();
        context.output.write(`${ui.green("Saved locally")} ${entry.id.slice(0, 8)}\n`);
      }
      break;
    }
    case "list":
    case "show": {
      const selection = interpretShow(positionals, options, command);
      const { identifier, tags: requestedTags } = selection;
      if (selection.filtered) {
        if (usesOnline(context)) {
          const api = requireApi(context);
          const filters = {
            tags: requestedTags,
            category: options.category,
            limit: parseLimit(options.limit),
          };
          const response = await api.listMemories(filters);
          printEntries(unwrapMemories(response).map(normalizeMemory), context.output, width);
          if (command === "show") {
            const imageResponse = await api.listImages(filters);
            const images = unwrapImages(imageResponse).map(normalizeImage);
            if (images.length) await printRenderedImages(images, api, context, width, options);
          }
        } else {
          printEntries(filterLocalEntries(context.data, {
            tags: requestedTags,
            category: options.category,
            limit: parseLimit(options.limit),
          }), context.output, width);
        }
      } else {
        if (!identifier) throw new Error("Use show <id>, show --tags <tag>, show #tag, or show all");
        const entry = usesOnline(context)
          ? await resolveRemoteMemory(requireApi(context), identifier)
          : resolveEntry(context.data, identifier);
        context.output.write(`${formatEntry(entry, { full: true, width })}\n${ui.dim(`Full ID: ${entry.id}`)}\n`);
      }
      break;
    }
    case "search": {
      const query = positionals.join(" ");
      if (!query) throw new Error("Search text is required");
      if (usesOnline(context)) {
        const response = await requireApi(context).listMemories();
        const entries = unwrapMemories(response).map(normalizeMemory).filter((entry) => {
          const haystack = `${entry.content} ${entry.category || ""} ${(entry.tags || []).join(" ")}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        });
        printEntries(entries.slice(0, parseLimit(options.limit) || entries.length), context.output, width);
      } else {
        printEntries(filterLocalEntries(context.data, { query, limit: parseLimit(options.limit) }), context.output, width);
      }
      break;
    }
    case "edit": {
      const [identifier, ...contentParts] = positionals;
      const content = contentParts.join(" ");
      if (!content.trim()) throw new Error("Usage: edit <id> \"new memory text\"");
      if (usesOnline(context)) {
        const api = requireApi(context);
        const entry = await resolveRemoteMemory(api, identifier);
        await api.updateMemory(entry.id, { content });
        context.output.write(`${ui.green("Updated online")} ${entry.id.slice(0, 8)}\n`);
      } else {
        const entry = editEntry(context.data, identifier, content);
        await context.persist();
        context.output.write(`${ui.green("Updated locally")} ${entry.id.slice(0, 8)}\n`);
      }
      break;
    }
    case "delete": {
      const identifier = positionals[0];
      const entry = usesOnline(context)
        ? await resolveRemoteMemory(requireApi(context), identifier)
        : resolveEntry(context.data, identifier);
      const confirmed = options.yes || await context.confirm(`Delete ${entry.id.slice(0, 8)} permanently?`);
      if (!confirmed) return context.output.write("Cancelled.\n");
      if (usesOnline(context)) await requireApi(context).deleteMemory(entry.id);
      else {
        deleteEntry(context.data, entry.id);
        await context.persist();
      }
      context.output.write(`${ui.green("Deleted")} ${entry.id.slice(0, 8)}\n`);
      break;
    }
    case "image":
      await executeImage(positionals, options, context);
      break;
    case "stats": {
      if (usesOnline(context)) {
        const api = requireApi(context);
        const [memoryResponse, imageResponse] = await Promise.all([api.listMemories(), api.listImages()]);
        const memories = unwrapMemories(memoryResponse);
        const images = unwrapImages(imageResponse);
        const tags = new Set([...memories, ...images].flatMap((item) => item.tags || []));
        context.output.write(`${panel("ONLINE LIBRARY", [
          `Memories: ${memories.length}`,
          `Images: ${images.length}`,
          `Unique tags: ${tags.size}`,
        ], { width })}\n`);
      } else {
        const tags = new Set(context.data.entries.flatMap((entry) => entry.tags));
        const categories = new Set(context.data.entries.map((entry) => entry.category).filter(Boolean));
        context.output.write(`${panel("LOCAL LIBRARY", [
          `Memories: ${context.data.entries.length}`,
          `Categories: ${categories.size}`,
          `Tags: ${tags.size}`,
        ], { width })}\n`);
      }
      break;
    }
    case "passwd": {
      if (context.globalOptions.local) {
        const newPassword = await context.newPassword();
        await changePassword(context.filePath, context.data, newPassword);
        context.setPassword(newPassword);
        context.output.write(`${ui.green("Legacy local vault password changed.")}\n`);
        break;
      }
      const api = requireApi(context);
      const passwords = await context.accountPasswordChange();
      await api.changePassword(passwords.currentPassword, passwords.newPassword);
      context.output.write(`${ui.green("Account password changed successfully.")}\n`);
      break;
    }
    case "about":
      context.output.write(`${aboutText()}\n`);
      break;
    case "help":
    case "?":
      context.output.write(`${helpText()}\n`);
      break;
    default:
      throw new Error(`Unknown command: ${command}. Type \"help\" for commands.`);
  }
}

async function verifySavedSession(context) {
  if (!context.data.remote.apiBase || !context.data.remote.token) return;
  const api = new MiDOnlineApi(context.data.remote.apiBase, context.data.remote.token);
  context.state.api = api;
  try {
    const response = await api.verify();
    context.data.remote.username = response?.data?.user?.username || context.data.remote.username;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      context.data.remote.token = null;
      context.data.remote.username = null;
      api.setToken(null);
      await context.persist();
      context.error.write(`${ui.yellow("Saved online session expired. Run login again.")}\n`);
    } else {
      context.error.write(`${ui.yellow(`Online server unavailable: ${error.message}`)}\n`);
    }
  }
}

async function interactiveShell(context) {
  const warmController = new AbortController();
  const warmApi = new MiDOnlineApi(context.data.remote.apiBase);
  warmApi.setRuntime({ signal: warmController.signal });
  warmApi.health().catch(() => {});
  context.output.write(`${banner()}\n\n${ui.dim("Type help for commands; exit signs out and closes MiD.")}\n`);
  if (!context.data.remote.token) {
    context.output.write(`\n${panel("WELCOME", [
      context.data.remote.username
        ? `Welcome back, ${context.data.remote.username}. Run login to open your library.`
        : "New to MiD? Run register to create your library. Already have an account? Run login.",
    ], { width: Math.min(84, context.output.columns || 72) })}\n`);
  }
  context.output.write("\n");
  let rl = readline.createInterface({ input: context.input, output: context.output });
  const ensureReadline = () => {
    if (!rl) rl = readline.createInterface({ input: context.input, output: context.output });
    return rl;
  };
  const suspendReadline = async () => {
    if (!rl) return;
    rl.close();
    rl = null;
    // Windows may pause stdin on the tick after readline.close(). Let that
    // finish before readSecret resumes stdin in raw mode.
    await new Promise((resolve) => setImmediate(resolve));
  };
  const secret = async (question) => {
    await suspendReadline();
    return readSecret(question, { input: context.input, output: context.output });
  };
  const newPassword = async () => {
    await suspendReadline();
    return requestNewPassword({ input: context.input, output: context.output });
  };

  const interactiveContext = {
    ...context,
    confirm: async (question) => {
      const confirmed = ["y", "yes"].includes((await ensureReadline().question(`${question} [y/N] `)).trim().toLowerCase());
      await suspendReadline();
      return confirmed;
    },
    newPassword,
    accountPasswordChange: async () => {
      context.output.write(`${ui.orange("New password rules:")} ${PASSWORD_RULES}.\n`);
      const currentPassword = await secret("Current account password: ");
      while (true) {
        const newPassword = await secret("New account password: ");
        const result = validateAccountPassword(newPassword);
        if (!result.valid) {
          context.output.write(`${ui.red("Weak password:")} ${result.error}.\n`);
          continue;
        }
        const confirmation = await secret("Confirm new password: ");
        if (newPassword !== confirmation) {
          context.output.write(`${ui.red("Passwords do not match.")} Try again.\n`);
          continue;
        }
        return { currentPassword, newPassword };
      }
    },
    adminPassword: () => secret("Confirm your account password for admin mode: "),
    loginCredentials: async (suggested) => ({
      username: suggested || context.data.remote.username || await ensureReadline().question("Username: "),
      password: await secret("Account password: "),
    }),
    registrationDetails: (suggested, api) => collectRegistrationDetails({
      suggested,
      api,
      askUsername: () => ensureReadline().question("Choose username: "),
      askMotherAddress: () => ensureReadline().question("Mother should call me her: "),
      secret,
      write: (message) => context.output.write(message),
      beforeNetwork: suspendReadline,
    }),
  };

  const runCancellable = async (operation) => {
    const commandController = new AbortController();
    context.state.commandSignal = commandController.signal;
    const cancelCommand = () => {
      if (!commandController.signal.aborted) commandController.abort();
    };
    if (context.input.isTTY) process.once("SIGINT", cancelCommand);
    try {
      return await operation();
    } finally {
      process.removeListener("SIGINT", cancelCommand);
      context.state.commandSignal = null;
      context.state.api?.setRuntime({ signal: null });
      context.state.admin?.api?.setRuntime({ signal: null });
    }
  };

  await configureImageViewing(interactiveContext, { firstRun: true });

  const motherSession = async () => {
    requireApi(interactiveContext);
    const username = context.data.remote.username || "you";
    const conversationId = `mother_${randomUUID().replaceAll("-", "")}`;
    let history = [];
    context.output.write(`${ui.dim("Mother is here. Type /exit or goodbye mother to return to MiD commands.")}\n`);

    const sendToMother = async (message) => {
      context.output.write(`${ui.dim("Mother is thinking...")}\n`);
      try {
        const response = await runCancellable(() => requireApi(interactiveContext).motherChat(message, history, conversationId));
        const reply = response?.data?.message || "I'm here. Tell me what's on your mind.";
        context.output.write(`${ui.orange("Mother>")} ${reply}\n`);
        history = [...history, { role: "user", content: message }, { role: "assistant", content: reply }].slice(-16);
      } catch (error) {
        if (error.code === "MID_CANCELLED") {
          context.output.write(`${ui.yellow("Mother's response was cancelled.")}\n`);
          return;
        }
        context.output.write(`${ui.orange("Mother>")} I'm unavailable right now. ${error.message}\n`);
      }
    };

    await sendToMother("Hello Mother");
    while (true) {
      let message;
      try {
        message = await ensureReadline().question(ui.orange(`${username}> `));
      } catch (error) {
        if (error.code === "ABORT_ERR") break;
        throw error;
      }
      const normalized = message.trim().toLowerCase();
      if (["/exit", "/back", "exit mother", "goodbye mother"].includes(normalized)) {
        context.output.write(`${ui.orange("Mother>")} I'll be here whenever you need me.\n`);
        break;
      }
      if (["clear", "/clear", "clear chat", "clear chats"].includes(normalized)) {
        history = [];
        context.output.write("\u001bc");
        context.output.write(`${ui.orange("Mother>")} Fresh page, my dear. I'm still here.\n`);
        continue;
      }
      if (!message.trim()) continue;
      await suspendReadline();
      await sendToMother(message.trim());
    }
  };

  try {
    while (true) {
      let line;
      try {
        line = await ensureReadline().question(ui.orange(`${promptLabel(context.data.remote)}> `));
      } catch (error) {
        if (error.code === "ABORT_ERR") break;
        throw error;
      }
      if (!line.trim()) continue;
      let tokens;
      try {
        tokens = tokenize(line);
      } catch (error) {
        context.error.write(`Error: ${error.message}\n`);
        continue;
      }
      const [command, ...args] = tokens;
      if (["exit", "quit", "lock"].includes(command.toLowerCase())) break;
      if (command.toLowerCase() === "clear") {
        context.output.write("\u001bc");
        continue;
      }
      if (line.trim().toLowerCase().replace(/\s+/g, " ") === "hello mother") {
        await suspendReadline();
        try {
          await motherSession();
        } catch (error) {
          context.error.write(`${ui.red("Error:")} ${error.message}\n`);
        }
        continue;
      }
      await suspendReadline();
      try {
        await runCancellable(() => execute(command.toLowerCase(), args, interactiveContext));
      } catch (error) {
        if (error.code === "MID_CANCELLED") context.error.write(`${ui.yellow("Command cancelled.")}\n`);
        else context.error.write(`${ui.red("Error:")} ${error.message}\n`);
      }
    }
  } finally {
    warmController.abort();
    rl?.close();
    context.data.remote.token = null;
    context.state.api?.setToken(null);
    context.output.write(`${ui.dim("Signed out. No session token was saved on this computer.")}\n`);
  }
}

export async function run(argv, streams = {}) {
  const input = streams.input || process.stdin;
  const output = streams.output || process.stdout;
  const error = streams.error || process.stderr;
  const parsed = parseArguments(argv);
  const [rawCommand, ...commandArgs] = parsed.positionals;
  const command = rawCommand?.toLowerCase();
  const filePath = path.resolve(parsed.options.vault || defaultVaultPath());

  const informational = parsed.options.help || parsed.options.version || ["help", "about"].includes(command);
  if (!informational && shouldRedirectToWezTerm(process.env, {
    platform: process.platform,
    isTTY: input.isTTY && output.isTTY,
  })) {
    await redirectToWezTerm(argv, { input, output });
    return;
  }

  await cleanupViewerCache().catch(() => {});

  if (parsed.options.help || command === "help") return output.write(`${helpText()}\n`);
  if (parsed.options.version) return output.write(`${VERSION}\n`);
  if (command === "about") return output.write(`${aboutText()}\n`);
  if (command === "doctor" && parsed.options.local) return inspectVault(filePath, output);

  // Online MiD uses account authentication only. Tokens live in memory for the
  // current process and are deliberately not written to disk.
  if (!parsed.options.local && command !== "init") {
    const configPath = defaultConfigPath();
    const config = await loadClientConfig(configPath, normalizeApiBase(process.env.MID_API_BASE || DEFAULT_API_BASE));
    const data = emptyVault();
    data.remote = {
      apiBase: normalizeApiBase(config.apiBase),
      username: config.username,
      token: process.env.MID_TOKEN || null,
      imageSetupSeen: config.imageSetupSeen,
    };
    const state = { api: data.remote.token ? new MiDOnlineApi(data.remote.apiBase, data.remote.token) : null, admin: null };
    const persist = () => saveClientConfig(configPath, data.remote);
    const context = {
      data,
      state,
      filePath: configPath,
      input,
      output,
      error,
      globalOptions: parsed.options,
      persist,
      setPassword: () => {},
      confirm: (question) => askYesNo(question, { input, output }),
      newPassword: () => requestNewPassword({ input, output }),
      accountPasswordChange: async () => {
        output.write(`${ui.orange("New password rules:")} ${PASSWORD_RULES}.\n`);
        const currentPassword = await readSecret("Current account password: ", { input, output });
        const newPassword = await readSecret("New account password: ", { input, output });
        const validation = validateAccountPassword(newPassword);
        if (!validation.valid) throw new Error(validation.error);
        const confirmation = await readSecret("Confirm new password: ", { input, output });
        if (newPassword !== confirmation) throw new Error("Passwords do not match");
        return { currentPassword, newPassword };
      },
      adminPassword: () => readSecret("Confirm your account password for admin mode: ", { input, output }),
      loginCredentials: async (suggested) => ({
        username: suggested || data.remote.username || await ask("Username: ", { input, output }),
        password: await readSecret("Account password: ", { input, output }),
      }),
      registrationDetails: (suggested, api) => collectRegistrationDetails({
        suggested,
        api,
        askUsername: () => ask("Choose username: ", { input, output }),
        askMotherAddress: () => ask("Mother should call me her (son/daughter/child): ", { input, output }),
        secret: (question) => readSecret(question, { input, output }),
        write: (message) => output.write(message),
      }),
    };
    if (command === "doctor") {
      output.write(`${panel("DEVICE SECURITY", [
        "Account session tokens are kept in memory only and removed when MiD exits.",
        `Settings file: ${configPath}`,
        "The settings file stores only the server address and last username, never a password or session token.",
        "Use mid doctor --local only when inspecting a legacy encrypted local vault.",
      ])}\n`);
      return;
    }
    if (data.remote.token) await verifySavedSession(context);
    if (!command) await interactiveShell(context);
    else await execute(command, [], context, { positionals: commandArgs, options: parsed.options });
    return;
  }

  // Legacy local-only mode remains available explicitly with --local.
  const needsInitialization = !(await vaultExists(filePath));
  if (command === "init" && !needsInitialization) throw new Error(`A vault already exists at ${filePath}`);

  let release = null;
  let password = "";
  let data = null;
  if (command === "init" || (!command && needsInitialization)) {
    release = await acquireVaultLock(filePath);
    try {
      password = await requestNewPassword({ input, output });
      data = await initializeVault(filePath, password);
      output.write(`${ui.green("Encrypted local credential vault created:")} ${filePath}\n`);
      if (command === "init") {
        await release();
        return;
      }
    } catch (initializationError) {
      await release();
      throw initializationError;
    }
  } else if (needsInitialization) {
    throw new Error(`No vault exists at ${filePath}. Run \"mid init\" first.`);
  }

  if (!release) release = await acquireVaultLock(filePath);
  try {
    if (!data) {
      password = await readSecret("Master password: ", { input, output });
      data = await loadVault(filePath, password);
    }
    if (!data.remote.apiBase) {
      data.remote.apiBase = normalizeApiBase(process.env.MID_API_BASE || DEFAULT_API_BASE);
    }
    const state = { api: null };
    const context = {
      data,
      state,
      filePath,
      input,
      output,
      error,
      globalOptions: parsed.options,
      persist: () => saveVault(filePath, data, password),
      setPassword: (newPassword) => { password = newPassword; },
      confirm: (question) => askYesNo(question, { input, output }),
      newPassword: () => requestNewPassword({ input, output }),
      loginCredentials: async (suggested) => ({
        username: suggested || await ask("Username: ", { input, output }),
        password: await readSecret("Account password: ", { input, output }),
      }),
      registrationDetails: (suggested, api) => collectRegistrationDetails({
        suggested,
        api,
        askUsername: () => ask("Choose username: ", { input, output }),
        askMotherAddress: () => ask("Mother should call me her (son/daughter/child): ", { input, output }),
        secret: (question) => readSecret(question, { input, output }),
        write: (message) => output.write(message),
      }),
    };
    const skipVerification = ["connect", "login", "register", "logout"].includes(command) || parsed.options.local;
    if (!skipVerification) await verifySavedSession(context);
    if (!command) await interactiveShell(context);
    else await execute(command, [], context, { positionals: commandArgs, options: parsed.options });
  } finally {
    password = "";
    await release();
  }
}
