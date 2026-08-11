import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Render free services may need more than 50 seconds to wake after inactivity.
const REQUEST_TIMEOUT_MS = 75_000;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const WAIT_NOTICE_MS = 3_000;
const WAIT_REPEAT_MS = 10_000;
const TRANSIENT_STATUS = new Set([502, 503, 504]);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function normalizeApiBase(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API URL must be a complete URL, for example https://mid-api.example.com/api");
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("The online API must use HTTPS; HTTP is allowed only for localhost development");
  }
  return url.toString().replace(/\/$/, "");
}

function queryString(values = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const result = params.toString();
  return result ? `?${result}` : "";
}

export class MiDOnlineApi {
  constructor(baseURL, token = null, { onWait = null, waitNoticeMs = WAIT_NOTICE_MS, waitRepeatMs = WAIT_REPEAT_MS } = {}) {
    this.baseURL = normalizeApiBase(baseURL);
    this.token = token;
    this.onWait = onWait;
    this.waitNoticeMs = waitNoticeMs;
    this.waitRepeatMs = waitRepeatMs;
    this.commandSignal = null;
  }

  setToken(token) {
    this.token = token || null;
  }

  setRuntime({ onWait = this.onWait, signal = null } = {}) {
    this.onWait = onWait;
    this.commandSignal = signal;
  }

  startWaitReporter() {
    if (typeof this.onWait !== "function") return () => {};
    const startedAt = Date.now();
    let interval = null;
    const timeout = setTimeout(() => {
      this.onWait("MiD is still contacting the online server. A sleeping free server can take about a minute to wake.");
      interval = setInterval(() => {
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        this.onWait(`Still waiting for the online server (${seconds}s). Press Ctrl+C to cancel this command.`);
      }, this.waitRepeatMs);
    }, this.waitNoticeMs);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }

  requestSignal() {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    return this.commandSignal ? AbortSignal.any([timeout, this.commandSignal]) : timeout;
  }

  async request(endpoint, options = {}) {
    const headers = { Accept: "application/json", ...options.headers };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let body = options.body;
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    let response;
    let text;
    const method = (options.method || "GET").toUpperCase();
    const safeToRetry = method === "GET" || method === "HEAD";
    const stopWaiting = this.startWaitReporter();
    try {
      for (let attempt = 0; attempt < (safeToRetry ? 2 : 1); attempt += 1) {
        try {
          response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
            body,
            signal: this.requestSignal(),
          });
          if (safeToRetry && attempt === 0 && TRANSIENT_STATUS.has(response.status)) {
            await response.body?.cancel().catch(() => {});
            await delay(750);
            continue;
          }
          break;
        } catch (error) {
          if (error.name === "AbortError" && this.commandSignal?.aborted) {
            const cancelled = new Error("Command cancelled");
            cancelled.code = "MID_CANCELLED";
            throw cancelled;
          }
          if (error.name === "TimeoutError") throw error;
          if (attempt === 0 && safeToRetry) {
            await delay(750);
            continue;
          }
          throw error;
        }
      }
      text = await response.text();
    } catch (error) {
      if (error.code === "MID_CANCELLED") throw error;
      if (error.name === "AbortError" && this.commandSignal?.aborted) {
        const cancelled = new Error("Command cancelled");
        cancelled.code = "MID_CANCELLED";
        throw cancelled;
      }
      if (error.name === "TimeoutError") {
        throw new Error("The MiD server took too long to respond. It may be waking from free-hosting sleep; wait a moment and try again");
      }
      throw new Error(`Cannot connect to the MiD server: ${error.message}`);
    } finally {
      stopWaiting();
    }

    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: text.slice(0, 300) };
      }
    }
    if (!response.ok) {
      const error = new Error(payload.error || payload.message || `Server returned ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  login(username, password) {
    return this.request("/auth/login", { method: "POST", body: { username, password } });
  }

  register(username, password, securityAnswers, motherAddress = "child") {
    return this.request("/auth/register", {
      method: "POST",
      body: { username, password, securityAnswers, mother_address: motherAddress },
    });
  }

  checkUsername(username) {
    return this.request(`/auth/check-username${queryString({ username })}`);
  }

  verify() {
    return this.request("/auth/verify");
  }

  health() {
    return this.request("/health");
  }

  motherChat(message, history, conversationId) {
    return this.request("/ai/mother", {
      method: "POST",
      body: { message, history, conversationId },
    });
  }

  changePassword(currentPassword, newPassword) {
    return this.request("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  }

  adminLogin(password) {
    return this.request("/admin/login", { method: "POST", body: { password } });
  }

  adminOverview() {
    return this.request("/admin/overview");
  }

  adminUsers(limit = 50) {
    return this.request(`/admin/users${queryString({ limit })}`);
  }

  adminActivity(limit = 50) {
    return this.request(`/admin/activity${queryString({ limit })}`);
  }

  setUserStatus(id, status) {
    return this.request(`/admin/users/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
  }

  setUserRole(id, role) {
    return this.request(`/admin/users/${encodeURIComponent(id)}/role`, { method: "PATCH", body: { role } });
  }

  listMemories(filters = {}) {
    return this.request(`/memories${queryString(filters)}`);
  }

  getMemory(id) {
    return this.request(`/memories/${encodeURIComponent(id)}`);
  }

  createMemory(memory) {
    return this.request("/memories", { method: "POST", body: memory });
  }

  updateMemory(id, updates) {
    return this.request(`/memories/${encodeURIComponent(id)}`, { method: "PUT", body: updates });
  }

  deleteMemory(id) {
    return this.request(`/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  listImages(filters = {}) {
    return this.request(`/images${queryString(filters)}`);
  }

  getImage(id) {
    return this.request(`/images/${encodeURIComponent(id)}`);
  }

  deleteImage(id) {
    return this.request(`/images/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async uploadImage(filePath, { description = "", tags = [] } = {}) {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Image path must refer to a file");
    if (info.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller");
    const bytes = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const type = mimeTypes[extension];
    if (!type) throw new Error("Supported image types: JPEG, PNG, GIF, and WebP");
    const form = new FormData();
    form.append("file", new Blob([bytes], { type }), path.basename(filePath));
    form.append("description", description);
    form.append("tags", JSON.stringify(tags));
    return this.request("/images", { method: "POST", body: form });
  }

  async downloadImage(imageUrl) {
    const url = new URL(imageUrl, this.baseURL).toString();
    const stopWaiting = this.startWaitReporter();
    let response;
    try {
      response = await fetch(url, { signal: this.requestSignal() });
      if (!response.ok) throw new Error(`Unable to download image (${response.status})`);
      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_DOWNLOAD_BYTES) throw new Error("Remote image is too large to render safely");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_DOWNLOAD_BYTES) throw new Error("Remote image is too large to render safely");
      return { buffer, contentType: response.headers.get("content-type") || "application/octet-stream" };
    } catch (error) {
      if (error.message?.startsWith("Unable to download image (") || error.message === "Remote image is too large to render safely") throw error;
      if (error.name === "AbortError" && this.commandSignal?.aborted) {
        const cancelled = new Error("Command cancelled");
        cancelled.code = "MID_CANCELLED";
        throw cancelled;
      }
      if (error.name === "TimeoutError") throw new Error("The image download timed out; try again");
      throw new Error(`Unable to download image: ${error.message}`);
    } finally {
      stopWaiting();
    }
  }
}

export function unwrapMemories(response) {
  return response?.data?.memories || response?.memories || [];
}

export function unwrapImages(response) {
  return response?.data?.images || response?.images || [];
}
