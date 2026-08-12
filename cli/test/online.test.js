import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { MiDOnlineApi, normalizeApiBase, unwrapMemories } from "../src/api.js";
import { DEFAULT_API_BASE, interpretShow, promptLabel, recoverAccountPassword, shouldRedirectToWezTerm, syncLocalEntries } from "../src/cli.js";

test("the distributed CLI uses the shared production API by default", () => {
  assert.equal(DEFAULT_API_BASE, "https://mid-rep.onrender.com/api");
  assert.equal(normalizeApiBase(DEFAULT_API_BASE), DEFAULT_API_BASE);
});

test("the prompt uses the signed-in username", () => {
  assert.equal(promptLabel({ username: "elibariki", token: "session" }), "elibariki");
  assert.equal(promptLabel({ username: "elibariki", token: null }), "mid");
});

test("interactive Windows sessions redirect to WezTerm without redirect loops", () => {
  assert.equal(shouldRedirectToWezTerm({}, { platform: "win32", isTTY: true }), true);
  assert.equal(shouldRedirectToWezTerm({ WEZTERM_PANE: "1" }, { platform: "win32", isTTY: true }), false);
  assert.equal(shouldRedirectToWezTerm({}, { platform: "linux", isTTY: true }), false);
  assert.equal(shouldRedirectToWezTerm({}, { platform: "win32", isTTY: false }), false);
});

test("show accepts plural tags and hashtag shortcuts", () => {
  assert.deepEqual(interpretShow([], { tags: "me" }), {
    identifier: undefined,
    tags: ["me"],
    filtered: true,
  });
  assert.deepEqual(interpretShow(["#Me"], {}), {
    identifier: null,
    tags: ["me"],
    filtered: true,
  });
  assert.equal(interpretShow(["f4ec9197"], {}).filtered, false);
});

test("online API requires HTTPS except for localhost", () => {
  assert.equal(normalizeApiBase("https://example.com/api/"), "https://example.com/api");
  assert.equal(normalizeApiBase("http://127.0.0.1:3000/api"), "http://127.0.0.1:3000/api");
  assert.throws(() => normalizeApiBase("http://example.com/api"), /must use HTTPS/);
});

test("online API sends bearer authentication and unwraps memories", async (t) => {
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, "Bearer test-token");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ success: true, data: { memories: [{ id: "abc", content: "online" }] } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const api = new MiDOnlineApi(`http://127.0.0.1:${address.port}/api`, "test-token");
  const result = await api.listMemories({ tags: ["me"] });
  assert.equal(unwrapMemories(result)[0].content, "online");
});

test("online API sends password recovery answers and the one-time reset token", async (t) => {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ url: request.url, body: JSON.parse(body) });
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(request.url.endsWith("verify-security-answers")
      ? { success: true, verificationToken: "one-time-token" }
      : { success: true }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const api = new MiDOnlineApi(`http://127.0.0.1:${server.address().port}/api`);
  const answers = { answer1: "orange", answer2: "spot", answer3: "nairobi" };
  const verified = await api.verifySecurityAnswers("owner", answers);
  await api.resetPassword("owner", verified.verificationToken, "NewPassword1!");
  assert.deepEqual(requests[0], {
    url: "/api/auth/verify-security-answers",
    body: { username: "owner", ...answers },
  });
  assert.deepEqual(requests[1], {
    url: "/api/auth/reset-password",
    body: {
      username: "owner",
      verificationToken: "one-time-token",
      newPassword: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    },
  });
});

test("password recovery never asks for a new password when answers are rejected", async () => {
  let replacementPrompts = 0;
  const rejected = new Error("The username or recovery answers are incorrect");
  rejected.status = 401;
  const api = {
    token: null,
    setRuntime() {},
    verifySecurityAnswers: async () => { throw rejected; },
  };
  const context = {
    globalOptions: {},
    data: { remote: { apiBase: "https://mid.example/api", username: "owner", token: null } },
    state: { api, commandSignal: null },
    passwordRecovery: async () => ({
      username: "owner",
      securityAnswers: { answer1: "one", answer2: "two", answer3: "three" },
    }),
    replacementPassword: async () => {
      replacementPrompts += 1;
      return "NewPassword1!";
    },
    persist: async () => {},
    output: { write() {} },
  };
  await assert.rejects(recoverAccountPassword(context), /recovery answers are incorrect/);
  assert.equal(replacementPrompts, 0);
});

test("safe reads retry once after a transient server failure", async (t) => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.setHeader("content-type", "application/json");
    if (requests === 1) {
      response.statusCode = 503;
      response.end(JSON.stringify({ error: "warming" }));
    } else response.end(JSON.stringify({ available: true }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const api = new MiDOnlineApi(`http://127.0.0.1:${server.address().port}/api`);
  assert.equal((await api.checkUsername("ready")).available, true);
  assert.equal(requests, 2);
});

test("writes read a transient error body once without retrying", async (t) => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.statusCode = 503;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "Mother is temporarily unavailable" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const api = new MiDOnlineApi(`http://127.0.0.1:${server.address().port}/api`);
  await assert.rejects(
    api.motherChat("What time is it?", [], "conversation_123"),
    /Mother is temporarily unavailable/,
  );
  assert.equal(requests, 1);
});

test("long requests report progress and can be cancelled", async (t) => {
  const server = createServer(() => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const notices = [];
  const controller = new AbortController();
  const api = new MiDOnlineApi(`http://127.0.0.1:${server.address().port}/api`, null, {
    onWait: (message) => notices.push(message),
    waitNoticeMs: 5,
    waitRepeatMs: 5,
  });
  api.setRuntime({ signal: controller.signal });
  const pending = api.checkUsername("cancel-me");
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort();
  await assert.rejects(pending, (error) => error.code === "MID_CANCELLED");
  assert.ok(notices.length > 0);
});

test("local-to-online sync records remote IDs and is idempotent", async () => {
  const data = { entries: [{ id: "local-1", content: "move me", category: null, tags: ["old"] }] };
  const api = { createMemory: async () => ({ data: { id: "remote-1" } }) };
  let saves = 0;
  assert.equal(await syncLocalEntries(data, api, async () => { saves += 1; }), 1);
  assert.equal(data.entries[0].remoteId, "remote-1");
  assert.equal(saves, 1);
  assert.equal(await syncLocalEntries(data, api, async () => { saves += 1; }), 0);
  assert.equal(saves, 1);
});
