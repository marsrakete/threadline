"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");

/** Creates deterministic shared transport adapters and a response queue.
 * @returns {object} Factory, API, options, calls, GET traces and responses.
 */
function transportFixture() {
  const f = archiveModelsFixture(), calls = [], gets = [], responses = [];
  const options = { apiBase: "https://fixture.test/xrpc", messages: f.context.ThreadlineAdapterMessages,
    fetch: async (...args) => { calls.push(args); const response = responses.shift(); if (response instanceof Error) { throw response; } return response; },
    getRequest: async (...args) => { gets.push(args); return { ok: true }; }, searchParams: () => new URLSearchParams(),
    error: vm.runInContext("createServiceWorkerError", f.context), now: () => Date.parse("2026-10-31T12:00:00Z") };
  const factory = f.context.createThreadlineTransportService;
  return { ...f, factory, options, service: factory(options), calls, gets, responses };
}

test("transport validates callbacks and exposes a frozen API", () => {
  const f = transportFixture(); assert.throws(() => f.factory(), /fetch/);
  for (const key of ["fetch", "getRequest", "searchParams", "error", "now"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), /requires/); }
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["request", "get", "rateLimit"]);
});

test("XRPC requests retain fetch options, header precedence, JSON/text/empty payload and metadata envelopes", async () => {
  const f = transportFixture(); f.responses.push(new Response('{"ok":true}', { headers: { "ratelimit-remaining": "4" } }));
  const signal = new AbortController().signal, result = await f.service.request("method", { base: "https://other.test/xrpc", headers: { "content-type": "custom", authorization: "fixture" }, signal, returnMeta: true });
  assert.equal(result.data.ok, true); assert.equal(result.meta.rateLimit.remaining, 4); assert.equal(f.calls[0][0], "https://other.test/xrpc/method"); assert.equal(f.calls[0][1].signal, signal); assert.equal(f.calls[0][1].headers["content-type"], "custom"); assert.equal(f.calls[0][1].returnMeta, true);
  f.responses.push(new Response("plain"), new Response("")); assert.deepEqual(plain(await f.service.request("text")), { message: "plain" }); assert.deepEqual(plain(await f.service.request("empty")), {});
});

test("XRPC failures retain error codes, body fallbacks, rate limits and seconds/date Retry-After", async () => {
  const f = transportFixture();
  for (const [status, header, milliseconds, code] of [[401, "2", 2000, "AUTH_INVALID_CREDENTIALS"], [429, "Sat, 31 Oct 2026 12:00:03 GMT", 3000, "BSKY_REQUEST_FAILED"], [500, "bad", 0, "BSKY_REQUEST_FAILED"]]) {
    f.responses.push(new Response('{"error":"fixture failure"}', { status, headers: { "retry-after": header } }));
    await assert.rejects(f.service.request("bad"), error => error.message === "fixture failure" && error.details.code === code && error.details.retryAfterMs === milliseconds && error.details.status === status);
  }
  f.responses.push(new Response("", { status: 503 })); await assert.rejects(f.service.request("empty"), /Bluesky request failed \(503\)/);
  const failure = Error("offline"); f.responses.push(failure); await assert.rejects(f.service.request("offline"), error => error === failure);
});

test("GET serialization keeps scalar falsy values, omits empty/null values and filters falsy array items", async () => {
  const f = transportFixture(), signal = new AbortController().signal;
  await f.service.get("method", { zero: 0, flag: false, empty: "", no: null, missing: undefined, items: ["a b", 0, false, "x&y"], object: {} }, { signal, base: "base", headers: { test: "yes" }, ignored: true });
  assert.equal(f.gets[0][0], "method?zero=0&flag=false&items=a+b&items=x%26y&object=%5Bobject+Object%5D");
  assert.equal(f.gets[0][1].signal, signal); assert.equal(f.gets[0][1].ignored, undefined);
  await f.service.get("empty", null); assert.equal(f.gets[1][0], "empty");
});

test("rate-limit parsing preserves absent/null, zero counters and numeric/date reset forms", () => {
  const f = transportFixture(); assert.equal(f.service.rateLimit(null), null); assert.equal(f.service.rateLimit(new Response()), null);
  const result = f.service.rateLimit(new Response("", { headers: { "ratelimit-limit": "100", "ratelimit-remaining": "0", "ratelimit-reset": "1", "ratelimit-policy": "policy" } }));
  assert.deepEqual(plain(result), { limit: 100, remaining: 0, resetAt: "1970-01-01T00:00:01.000Z", policy: "policy", retryAfter: "" });
  assert.equal(f.service.rateLimit(new Response("", { headers: { "ratelimit-reset": "Sat, 31 Oct 2026 12:00:00 GMT" } })).resetAt, "2026-10-31T12:00:00.000Z");
});

/** Creates auth models with predictable URL/frontend inference and a fixed clock.
 * @returns {object} Models, constructor and configuration.
 */
function authFixture() {
  const f = archiveModelsFixture(), options = { defaultService: "https://bsky.social", defaultWebApp: "https://bsky.app", inferWebApp: () => "https://bsky.app", webBase: () => "https://bsky.app",
    error: vm.runInContext("createServiceWorkerError", f.context), now: () => "2026-10-31T12:00:00Z", messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineAuthModels;
  return { ...f, factory, options, models: factory(options) };
}

test("auth models validate callbacks and retain URL normalization/security boundaries", () => {
  const f = authFixture(); assert.throws(() => f.factory(), /inferWebApp/); assert.equal(Object.isFrozen(f.models), true);
  for (const key of ["inferWebApp", "webBase", "error", "now"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), /require/); }
  assert.equal(f.models.service(" example.test/xrpc/?a=1#hash "), "https://example.test"); assert.equal(f.models.service(""), "https://bsky.social");
  assert.equal(f.models.service("not a url/"), "https://not a url"); assert.equal(f.models.insecure(" HTTP://example.test "), true);
  assert.throws(() => f.models.secure("http://example.test"), error => error.details.code === "INSECURE_SERVICE_URL"); assert.equal(f.models.secure("https://example.test"), undefined);
});

test("auth state handles legacy/current inputs and active account selection without mutating sources", () => {
  const f = authFixture(), session = { did: "did:one", handle: "one.test", accessJwt: "fixture" }, raw = { identifier: "one.test", session, appPassword: "fixture-password" };
  const state = f.models.state(raw); assert.equal(state.activeDid, "did:one"); assert.equal(state.accounts[0].session, session); assert.equal(state.accounts[0].updatedAt, "2026-10-31T12:00:00Z");
  assert.equal(f.models.state({ accounts: [raw], activeDid: "missing" }).activeDid, ""); assert.equal(f.models.state({ accounts: [raw, {}], activeDid: "did:one" }).accounts.length, 1);
  assert.deepEqual(plain(f.models.state(null)), { activeDid: "", accounts: [] }); assert.equal(raw.updatedAt, undefined); assert.throws(() => f.models.account(null));
});

test("auth upsert distinguishes DID and identifier matching; public responses omit all credentials", () => {
  const f = authFixture(), first = f.models.account({ did: "did:one", identifier: "same", appPassword: "secret", session: { did: "did:one", accessJwt: "token" } });
  const initial = { activeDid: "did:one", accounts: [first] }, next = f.models.upsert(initial, { did: "did:two", identifier: "same" });
  assert.equal(next.accounts.length, 2); assert.equal(next.activeDid, "did:one"); assert.equal(initial.accounts.length, 1);
  assert.equal(f.models.upsert(next, { identifier: "same" }).accounts.length, 1);
  const response = f.models.response(initial); assert.equal(response.authenticated, true); assert.equal(response.accounts[0].hasStoredPassword, true); assert.equal(response.accounts[0].hasSession, true);
  assert.doesNotMatch(JSON.stringify(response), /secret|token|accessJwt|appPassword/); assert.equal(f.models.response({ activeDid: "none", accounts: [] }).authenticated, false);
});

/** Creates asynchronous request-level IndexedDB doubles; transaction completion is intentionally absent.
 * @returns {object} Service, trace, data map, settings and normalizer traces.
 */
function storageFixture() {
  const f = archiveModelsFixture(), calls = [], values = new Map(), stores = new Set(), normalized = [], settings = {};
  const database = { objectStoreNames: { contains: name => stores.has(name) }, createObjectStore: (name, options) => { stores.add(name); calls.push(["create", name, options]); },
    transaction: (name, mode) => { calls.push(["transaction", name, mode]); if (settings.transactionError) { throw settings.transactionError; }
      return { objectStore: () => ({ get: key => operation("get", key), put: (value, key) => operation("put", key, value), delete: key => operation("delete", key) }) }; } };
  /** Schedules an IndexedDB-style request callback. @param {string} kind - Operation. @param {string} key - Key. @param {unknown} value - Write value. @returns {object} Mutable request. */
  function operation(kind, key, value) { const request = {}; calls.push([kind, key, value]); queueMicrotask(() => {
    if (settings.requestError) { request.error = settings.requestError; request.onerror(); return; }
    if (kind === "put") { values.set(key, value); } else if (kind === "delete") { values.delete(key); }
    request.result = values.get(key); request.onsuccess();
  }); return request; }
  const options = { indexedDB: () => ({ open: (name, version) => { calls.push(["open", name, version]); const request = {}; queueMicrotask(() => {
    if (settings.openError) { request.error = settings.openError; request.onerror(); return; } request.result = database; request.onupgradeneeded(); request.onsuccess();
  }); return request; } }), databaseName: "fixture", databaseVersion: 2, storeName: "values", imageStoreName: "images", authKey: "auth",
    normalizeAuth: value => { normalized.push(value); if (settings.normalizeError) { throw settings.normalizeError; } return { normalized: value }; }, messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineStorageService;
  return { ...f, factory, options, service: factory(options), calls, values, settings, normalized };
}

test("storage validates callbacks and upgrades only missing stores with the original image key path", async () => {
  const f = storageFixture(); assert.throws(() => f.factory(), /indexedDB/); assert.throws(() => f.factory({ ...f.options, normalizeAuth: null }), /normalizeAuth/); assert.equal(Object.isFrozen(f.service), true);
  await f.service.open(); await f.service.open(); assert.deepEqual(plain(f.calls.filter(call => call[0] === "create")), [["create", "values", null], ["create", "images", { keyPath: "id" }]]);
});

test("storage read/write preserve falsy values, identities and request-success completion", async () => {
  const f = storageFixture(); assert.equal(await f.service.read("missing"), null);
  for (const value of [false, 0, "", null]) { assert.equal(await f.service.write("value", value), value); assert.equal(await f.service.read("value"), value); }
  const value = { id: 1 }; assert.equal(await f.service.write("object", value), value); assert.equal(await f.service.read("object"), value);
  assert.ok(f.calls.some(call => call[0] === "transaction" && call[2] === "readonly")); assert.ok(f.calls.some(call => call[0] === "transaction" && call[2] === "readwrite"));
});

test("auth storage opens before normalization, keeps separate normalization rules and deletes only auth", async () => {
  const f = storageFixture(), raw = { id: 1 }; const normalized = await f.service.writeAuth(raw);
  assert.equal(f.normalized[0], raw); assert.equal(f.values.get("auth"), normalized); assert.equal(f.calls[0][0], "open");
  f.values.set("auth", 0); assert.equal((await f.service.readAuth()).normalized, null); f.values.set("other", "keep");
  assert.equal(await f.service.clearAuth(), undefined); assert.equal(f.values.has("auth"), false); assert.equal(f.values.get("other"), "keep");
});

test("storage propagates open, transaction, request and normalization failures", async () => {
  for (const kind of ["openError", "transactionError", "requestError", "normalizeError"]) {
    const f = storageFixture(), failure = Error(kind); f.settings[kind] = failure;
    await assert.rejects(f.service.writeAuth({}), error => error === failure);
  }
});
