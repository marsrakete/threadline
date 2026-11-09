"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");

/** Encodes a fixture JWT payload. @param {object} payload - Token claims. @returns {string} Dummy token. */
function token(payload) { return "e30." + Buffer.from(JSON.stringify(payload)).toString("base64url") + ".fixture"; }

/** Builds identity operations with controlled network, timer and storage adapters.
 * @returns {object} Factory/service, options, responses, calls and virtual timer traces.
 */
function identityFixture() {
  const f = archiveModelsFixture(), calls = [], queue = [], timers = [], cleared = [];
  const options = { fetch: async (...args) => { calls.push(args); const value = queue.shift(); if (value instanceof Error) { throw value; } return value; },
    request: async (...args) => { calls.push(args); const value = queue.shift(); if (value instanceof Error) { throw value; } return value; },
    normalize: vm.runInContext("normalizeServiceUrl", f.context), base: value => value + "/xrpc", webBase: () => "https://bsky.app", readAuth: async () => ({ accounts: [], activeDid: "" }),
    abortController: () => new AbortController(), schedule: (callback, ms) => { const id = { callback, ms }; timers.push(id); return id; }, clearTimer: id => cleared.push(id),
    error: vm.runInContext("createServiceWorkerError", f.context), apiBase: "https://api.test/xrpc", defaultService: "https://bsky.social", muWeb: "https://mu.social", messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineIdentityService;
  return { ...f, factory, options, service: factory(options), calls, queue, timers, cleared };
}

test("identity constructor validates every dependency and freezes the API", () => {
  const f = identityFixture(); assert.throws(() => f.factory(), /fetch/);
  for (const name of ["fetch", "request", "normalize", "base", "webBase", "readAuth", "abortController", "schedule", "clearTimer", "error"]) { assert.throws(() => f.factory({ ...f.options, [name]: null }), /requires/); }
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["handle", "document", "endpoint", "pds", "avatar", "webApp", "connectivity"]);
});

test("handle resolution retains positive/negative cache keys, optional auth and malformed-JSON fallback", async () => {
  const f = identityFixture(), cache = new Map(), auth = { session: { accessJwt: "fixture" } };
  f.queue.push(new Response('{"did":"did:one"}')); assert.equal(await f.service.handle("Own.Test", auth, cache), "did:one"); assert.equal(await f.service.handle("Own.Test", auth, cache), "did:one");
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0][1].headers.authorization, "Bearer fixture"); assert.match(f.calls[0][0], /handle=Own.Test$/);
  f.queue.push(new Response("", { status: 404 }), new Response("bad json"));
  assert.equal(await f.service.handle("missing", null, cache), null); assert.equal(await f.service.handle("invalid", null, cache), null);
  assert.equal(f.calls[1][1].headers, undefined); assert.equal(cache.get("missing"), null);
  await assert.rejects(f.service.handle("bad", null, null));
});

test("handle transport failures propagate without caching a negative result", async () => {
  const f = identityFixture(), cache = new Map(), failure = Error("offline"); f.queue.push(failure);
  await assert.rejects(f.service.handle("own", null, cache), error => error === failure); assert.equal(cache.has("own"), false);
});

test("DID documents retain PLC/web URL rules, timeout floor and cleanup before JSON settlement", async () => {
  const f = identityFixture(); let complete, signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  f.queue.push({ ok: true, json: () => { signalStarted(); return new Promise(resolve => { complete = resolve; }); } });
  const pending = f.service.document("did:plc:one", 1); await started;
  assert.equal(f.timers[0].ms, 1000); assert.equal(f.cleared[0], f.timers[0]); assert.match(f.calls[0][0], /plc.directory\/did%3Aplc%3Aone$/); complete({ id: "doc" }); assert.equal((await pending).id, "doc");
  f.queue.push(new Response('{"id":"web"}')); await f.service.document("did:web:example.test:path"); assert.equal(f.calls[1][0], "https://example.test/path/.well-known/did.json"); assert.equal(f.calls[1][1].cache, "no-store");
});

test("DID failures preserve messages and release timers on unsupported format, status or abort", async () => {
  const f = identityFixture(); await assert.rejects(f.service.document(""), /DID fehlt/); assert.equal(f.timers.length, 0);
  await assert.rejects(f.service.document("did:unknown:one"), /Nicht unterstuetztes/);
  f.queue.push(new Response("", { status: 404 })); await assert.rejects(f.service.document("did:plc:one"), /\(404\)/);
  f.queue.push(Object.assign(Error("abort"), { name: "AbortError" })); await assert.rejects(f.service.document("did:plc:one"), /timed out/); assert.equal(f.cleared.length, 3);
});

test("PDS selection/cache preserve first match, fallback memoization and empty DID behavior", async () => {
  const f = identityFixture(), cache = new Map();
  assert.equal(f.service.endpoint({ service: [{ id: "x#atproto_pds", serviceEndpoint: "first.test/xrpc" }, { type: "AtprotoPersonalDataServer", serviceEndpoint: "second.test" }] }, "fallback.test"), "https://first.test");
  f.queue.push(Error("offline")); assert.equal(await f.service.pds(" did:plc:one ", "fallback.test", cache), "https://fallback.test");
  assert.equal(await f.service.pds("did:plc:one", "other.test", cache), "https://fallback.test"); assert.equal(f.calls.length, 1);
  assert.equal(await f.service.pds("", "empty.test", cache), "https://empty.test"); assert.equal(f.service.endpoint(null, "fallback.test"), "https://fallback.test");
});

test("avatar/frontend helpers retain optional auth, failure tolerance and explicit/Mu priorities", async () => {
  const f = identityFixture(); f.queue.push({ avatar: " avatar " }, Error("offline"));
  assert.equal(await f.service.avatar("did:one", { session: { accessJwt: "token" }, pdsUrl: "https://pds.test" }), "avatar");
  assert.equal(f.calls[0][1].base, "https://pds.test/xrpc"); assert.equal(await f.service.avatar("did:one"), "");
  assert.equal(f.service.webApp({ webApp: "explicit.test" }, "service", "own.mu.social"), "https://explicit.test"); assert.equal(f.service.webApp({}, "service", "OWN.EUROSKY.SOCIAL"), "https://mu.social"); assert.equal(f.service.webApp(), "https://bsky.app");
});

test("connectivity preserves active PDS selection, coded errors and cleanup", async () => {
  const f = identityFixture(), service = f.factory({ ...f.options, readAuth: async () => ({ activeDid: "did:one", accounts: [{ did: "did:one", pdsUrl: "https://pds.test" }] }) });
  f.queue.push(new Response("")); assert.equal((await service.connectivity()).ok, true); assert.equal(f.calls[0][0], "https://pds.test/xrpc/com.atproto.server.describeServer"); assert.equal(f.timers[0].ms, 8000);
  f.queue.push(Object.assign(Error("abort"), { name: "AbortError" })); await assert.rejects(service.connectivity(), error => error.details.code === "CONNECTIVITY_TIMEOUT");
  f.queue.push(new Response("", { status: 503 })); await assert.rejects(service.connectivity(), error => error.details.code === "CONNECTIVITY_FAILED"); assert.equal(f.cleared.length, 3);
});

/** Creates login/renewal operations around real auth models and mutable in-memory state.
 * @returns {object} Service, options, account state and transport/avatar/warning traces.
 */
function sessionFixture() {
  const f = archiveModelsFixture(), calls = [], queue = [], warnings = [], cacheCalls = [], data = { state: { activeDid: "", accounts: [] }, avatar: "", cached: null };
  const models = vm.runInContext("workerAuthModels", f.context);
  const options = { request: async (...args) => { calls.push(args); const value = queue.shift(); if (value instanceof Error) { throw value; } return value; },
    normalize: models.service, base: value => models.service(value) + "/xrpc", webBase: () => "https://bsky.app", handle: async () => "did:example:own",
    document: async () => ({ service: [{ type: "AtprotoPersonalDataServer", serviceEndpoint: "https://pds.test" }] }), endpoint: () => "https://pds.test", avatar: async () => data.avatar,
    avatarCache: async () => ({ assets: [] }), cacheAvatar: async (...args) => { cacheCalls.push(args); return data.cached; }, saveAvatarCache: async value => { cacheCalls.push(["save", value]); },
    readAuth: async () => data.state, writeAuth: async value => { data.state = value; return value; }, upsert: models.upsert, response: models.response,
    now: () => "2026-11-01T12:00:00Z", nowMs: () => Date.parse("2026-11-01T12:00:00Z"), decodeBase64: value => Buffer.from(value, "base64").toString("binary"), warn: (...args) => warnings.push(args),
    ensureReference: (...args) => data.api.ensure(...args), loginAgain: (...args) => data.api.login(...args), error: vm.runInContext("createServiceWorkerError", f.context), defaultService: "https://bsky.social", muWeb: "https://mu.social", messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineSessionService, service = factory(options); data.api = service;
  return { ...f, factory, options, service, calls, queue, warnings, cacheCalls, data };
}

/** Installs a stored fixture account. @param {object} f - Fixture. @param {object} session - Token data. @returns {object} Stored account. */
function saved(f, session = {}) { const account = { did: "did:example:own", identifier: "own.test", handle: "own.test", service: "https://bsky.social", pdsUrl: "https://pds.test", appPassword: "fixture-password", session }; f.data.state = { activeDid: account.did, accounts: [account] }; return account; }

test("session constructor validates explicit dependencies and freezes the API", () => {
  const f = sessionFixture(); assert.throws(() => f.factory(), /request/); assert.equal(Object.isFrozen(f.service), true);
  for (const [name, value] of Object.entries(f.options)) { if (typeof value === "function") { assert.throws(() => f.factory({ ...f.options, [name]: null }), /requires/); } }
  assert.deepEqual(Object.keys(f.service), ["login", "ensure", "refresh", "decode", "valid"]);
});

test("JWT helpers retain no-exp/no-payload policy, malformed input and thirty-second boundary", () => {
  const f = sessionFixture(), now = f.options.nowMs() / 1000;
  assert.equal(f.service.valid(""), false); assert.equal(f.service.valid("no-payload"), true); assert.equal(f.service.valid("x.bad-json.x"), false);
  assert.equal(f.service.valid(token({})), true); assert.equal(f.service.valid(token({ exp: now + 30 })), false); assert.equal(f.service.valid(token({ exp: now + 31 })), true);
  assert.equal(f.service.decode("single"), null); assert.throws(() => f.service.decode(null));
});

test("login retains transport payload, PDS/frontend metadata, avatar persistence and public result", async () => {
  const f = sessionFixture(); f.data.avatar = "avatar"; f.data.cached = { assets: [{ path: "avatar" }], account: { avatarPath: "avatar" } };
  f.queue.push({ did: "did:example:own", handle: "own.test", accessJwt: "fixture" });
  const result = await f.service.login({ identifier: "own.test", appPassword: "fixture-password", service: "login.test", webApp: "web.test" });
  assert.equal(f.calls[0][0], "com.atproto.server.createSession"); assert.deepEqual(JSON.parse(f.calls[0][1].body), { identifier: "own.test", password: "fixture-password" }); assert.equal(f.calls[0][1].base, "https://login.test/xrpc");
  assert.equal(f.data.state.activeDid, "did:example:own"); assert.equal(f.data.state.accounts[0].pdsUrl, "https://pds.test"); assert.equal(f.data.state.accounts[0].webApp, "https://web.test"); assert.equal(f.cacheCalls[1][0], "save");
  assert.equal(result.authenticated, true); assert.doesNotMatch(JSON.stringify(result), /fixture-password|accessJwt/);
});

test("login rejects missing/Mu unresolved credentials and preserves the Mu direct-DID branch", async () => {
  const f = sessionFixture(); await assert.rejects(f.service.login({}), error => error.details.code === "LOGIN_MISSING_CREDENTIALS");
  await assert.rejects(f.service.login({ identifier: "mail@example.test", appPassword: "fixture", service: "https://mu.social" }), error => error.details.code === "LOGIN_MU_PDS_RESOLUTION_FAILED");
  await assert.rejects(f.factory({ ...f.options, handle: async () => "" }).login({ identifier: "own.test", appPassword: "fixture", service: "https://mu.social" }), /could not be resolved/);
  f.queue.push({ did: "did:example:own", handle: "own.test" });
  const service = f.factory({ ...f.options, webBase: () => { throw Error("unused frontend fallback"); } });
  await service.login({ identifier: "did:example:own", appPassword: "fixture", service: "https://mu.social" }); assert.equal(f.calls[0][1].base, "https://pds.test/xrpc"); assert.equal(f.data.state.accounts[0].webApp, "https://mu.social");
});

test("ensure returns a current explicit account and rejects missing or unrenewable sessions", async () => {
  const f = sessionFixture(), auth = saved(f, { accessJwt: token({ exp: f.options.nowMs() / 1000 + 1000 }) });
  f.data.state.activeDid = "other"; assert.equal(await f.service.ensure(auth.did), auth); assert.equal(f.calls.length, 0);
  await assert.rejects(f.service.ensure("missing"), /Keine gespeicherte/); auth.session = {}; auth.appPassword = "";
  await assert.rejects(f.service.ensure(auth.did), /kein App-Passwort/);
});

test("refresh uses the refresh token/PDS and retains avatar fallback/path and active-DID persistence", async () => {
  const f = sessionFixture(), auth = saved(f, { refreshJwt: "refresh-fixture" }); auth.avatar = "avatar"; auth.avatarPath = "old-path";
  f.queue.push({ did: auth.did, handle: "own.test", accessJwt: "fresh" }); const result = await f.service.ensure();
  assert.equal(f.calls[0][0], "com.atproto.server.refreshSession"); assert.equal(f.calls[0][1].headers.authorization, "Bearer refresh-fixture"); assert.equal(f.calls[0][1].base, "https://pds.test/xrpc");
  assert.equal(result.avatarPath, "old-path"); assert.equal(result.session.accessJwt, "fresh"); assert.equal(f.warnings.length, 0);
});

test("failed refresh warns and falls back to createSession with the stored original account", async () => {
  const f = sessionFixture(), auth = saved(f, { refreshJwt: "refresh-fixture" }); f.queue.push(Error("refresh failed"), { did: auth.did, handle: "own.test", accessJwt: "new" });
  const result = await f.service.ensure(); assert.deepEqual(f.calls.map(call => call[0]), ["com.atproto.server.refreshSession", "com.atproto.server.createSession"]); assert.equal(result.session.accessJwt, "new"); assert.equal(f.warnings[0][1].message, "refresh failed");
});

test("avatar caching failures are tolerated while missing post-login target and login failures propagate", async () => {
  const f = sessionFixture(); f.data.avatar = "avatar"; f.queue.push({ did: "did:example:own", handle: "own.test" });
  await f.factory({ ...f.options, cacheAvatar: async () => { throw Error("cache"); } }).login({ identifier: "own.test", appPassword: "fixture" }); assert.equal(f.data.state.accounts[0].avatarPath, "");
  saved(f); const service = f.factory({ ...f.options, loginAgain: async () => { f.data.state.accounts = []; } });
  await assert.rejects(service.ensure(), /konnte nicht erneuert/);
});

test("mutable auth refresh keeps object identity and handles missing/falsy fresh accounts", async () => {
  const f = sessionFixture(), auth = { did: "did:own", session: { old: true } }, session = { accessJwt: "new" };
  const service = f.factory({ ...f.options, ensureReference: async () => ({ did: auth.did, session, avatar: "new" }) });
  assert.equal(await service.refresh(auth), auth); assert.equal(auth.session, session); assert.equal(auth.avatar, "new");
  assert.equal(await service.refresh(null), null); const empty = {}; assert.equal(await service.refresh(empty), empty);
  assert.equal(await f.factory({ ...f.options, ensureReference: async () => null }).refresh(auth), auth);
});
