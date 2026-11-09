"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Creates the real query/filter/service modules with controlled XRPC and auth adapters.
 * @returns {object} Service, queue, transport calls and private-state instrumentation.
 */
function fixture() {
  const maps = [];
  class TrackedMap extends Map { constructor(...args) { super(...args); maps.push(this); } }
  const context = { URL, Map: TrackedMap };
  for (const name of ["search-queries", "search-filters", "search-service"]) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, `js/worker/${name}.js`), "utf8"), context);
  }
  const responses = []; const requests = []; const progress = [];
  const auth = { session: { accessJwt: "fixture-token", handle: "own.test" } };
  const options = { queries: context.ThreadlineSearchQueries,
    filters: context.createThreadlineSearchFilters({ queries: context.ThreadlineSearchQueries,
      facets: () => ({ mentions: [], domains: [] }), post: value => { if (!value?.uri) { return null; } return value; } }),
    request: async (method, params, transport) => { requests.push({ method, params, transport }); return responses.shift() || { posts: [], feed: [] }; },
    base: () => "https://fixture.test/xrpc", session: async () => auth, refresh: async value => value };
  const factory = context.createThreadlineSearchService;
  const service = factory(options);
  return { factory, options, service, auth, requests, responses, progress, controls: maps[0], maps };
}
/** Builds one normalized provider post. @param {string} id - URI suffix. @param {object} extra - Overrides. @returns {object} Post. */
function post(id, extra = {}) { return { uri: id, text: "word #a #b", langs: ["de", "en"], createdAt: "2026-10-19", ...extra }; }

test("worker search service validates its small API and owns control state privately", () => {
  const { factory, options, service } = fixture();
  assert.deepEqual(Object.keys(service), ["load", "control"]); assert.equal(Object.isFrozen(service), true);
  assert.throws(() => factory(null), /requires/);
  assert.throws(() => factory({ ...options, queries: {} }), /query/);
  assert.throws(() => factory({ ...options, filters: {} }), /filter/);
  assert.equal(service.control().ok, false);
  assert.equal(service.control({ runId: "unknown", action: "cancel" }).ok, false);
});

test("worker network paging retains filters, deduplication, exclusion URIs and transport contracts", async () => {
  const { service, responses, requests, progress, controls } = fixture();
  responses.push({ posts: [post("excluded"), post("one"), post("one"), post("filtered", { text: "other" })], cursor: "next" }, { posts: [post("two")] });
  const result = await service.load({ query: "word", runId: "run", cursor: "start", excludeUris: ["excluded"], limit: 1 }, value => progress.push(value));
  assert.deepEqual(Array.from(result.items, item => item.post.uri), ["one", "two"]);
  assert.equal(requests[0].method, "app.bsky.feed.searchPosts"); assert.equal(requests[0].params.cursor, "start");
  assert.equal(requests[0].params.limit, 10); assert.equal(requests[1].params.cursor, "next");
  assert.equal(requests[0].transport.headers.authorization, "Bearer fixture-token");
  assert.equal(requests[0].transport.base, "https://fixture.test/xrpc");
  assert.equal(progress.at(-1).scannedCount, 5); assert.equal(progress.at(-1).matchCount, 2);
  assert.equal(result.cursor, ""); assert.equal(controls.size, 0);
});

test("worker network paging retains page/target caps and tolerates malformed provider lists", async () => {
  const { factory, options, service, responses, requests, controls } = fixture();
  responses.push({ posts: "invalid", cursor: "next" });
  assert.equal((await service.load({ query: "word", runId: "invalid" })).items.length, 0);
  assert.equal(requests.length, 1); assert.equal(controls.size, 0);
  let pages = 0;
  const capped = factory({ ...options, request: async () => { pages += 1; return { posts: [post("filtered", { text: "no-match" })], cursor: "next" }; } });
  assert.equal((await capped.load({ query: "word", runId: "cap" })).cursor, "next"); assert.equal(pages, 12);
  const many = factory({ ...options, request: async () => ({ posts: Array.from({ length: 100 }, (_, index) => post(String(index))), cursor: "next" }) });
  assert.equal((await many.load({ query: "word", limit: 100 })).items.length, 50);
});

test("worker multi-variant paging sorts and deduplicates across language/tag requests and exhausts cursors", async () => {
  const { service, responses, requests, controls } = fixture();
  responses.push({ posts: [post("old", { createdAt: "2026-10-18" })] }, { posts: [post("new", { createdAt: "2026-10-19" }), post("old")] }, { posts: [] }, { posts: [] });
  const result = await service.load({ query: "word", tags: ["a", "b"], tagMatchMode: "any", langs: ["de", "en"], runId: "multi" });
  assert.deepEqual(Array.from(result.items, item => item.post.uri), ["new", "old"]);
  assert.deepEqual(requests.map(call => call.params.lang), ["de", "de", "en", "en"]);
  assert.deepEqual(requests.map(call => Array.from(call.params.tag)), [["a"], ["b"], ["a"], ["b"]]);
  assert.equal(result.cursor, ""); assert.equal(controls.size, 0);
});

test("worker author modes preserve own-account fallback and repost selection", async () => {
  const { service, responses, requests } = fixture();
  const original = { post: post("original") };
  const repost = { post: post("repost"), reason: { $type: "app.bsky.feed.defs#reasonRepost", by: { handle: "friend.test" } } };
  responses.push({ feed: [original, repost] });
  assert.equal((await service.load({ mode: "posts" })).items[0].post.uri, "original");
  assert.equal(requests[0].params.actor, "own.test"); assert.equal(requests[0].method, "app.bsky.feed.getAuthorFeed");
  responses.push({ feed: [original, repost] });
  assert.equal((await service.load({ mode: "reposts", actor: "other.test" })).items[0].post.uri, "repost");
  assert.equal(requests[1].params.actor, "other.test");
  responses.push({ feed: [original] });
  assert.equal((await service.load({ mode: "network", actor: "own.test", mediaFilter: "none" })).items.length, 1);
});

test("worker cancellation during authentication is retained and unknown signals do not create state", async () => {
  const { factory, options, auth, requests, maps } = fixture();
  let resolveAuth;
  const service = factory({ ...options, session: () => new Promise(resolve => { resolveAuth = resolve; }) });
  const pending = service.load({ query: "word", runId: "auth" });
  assert.equal(service.control({ runId: "auth", action: "resume" }).state, "running");
  service.control({ runId: "auth", action: "cancel" }); resolveAuth(auth);
  assert.equal((await pending).cancelled, true); assert.equal(requests.length, 0); assert.equal(maps[1].size, 0);
  const before = factory(options);
  assert.equal(before.control({ runId: "unknown", action: "cancel" }).ok, false);
  assert.equal(requests.length, 0); assert.equal(maps[2].size, 0);
});

test("worker cancellation returns partial results and leaves a reusable run identifier", async () => {
  const { service, responses, requests, controls } = fixture();
  responses.push({ posts: [post("partial")], cursor: "resume" });
  const result = await service.load({ query: "word", runId: "run" }, () => service.control({ runId: "run", action: "cancel" }));
  assert.equal(result.cancelled, true); assert.equal(result.items.length, 1); assert.equal(result.cursor, "resume");
  assert.equal(requests.length, 1); assert.equal(controls.size, 0);
  assert.equal(service.control({ runId: "run", action: "cancel" }).ok, false);
  assert.equal(controls.size, 0);
  responses.push({ posts: [post("later")] });
  assert.equal((await service.load({ query: "word", runId: "run" })).items[0].post.uri, "later");
  assert.equal(controls.size, 0);
});

test("worker authentication, transport, validation and multi-variant errors all release run state", async () => {
  const { factory, options, maps } = fixture();
  const cases = [
    [{ ...options, session: async () => { throw Error("auth failed"); } }, { query: "word" }, /auth failed/],
    [{ ...options, refresh: async () => { throw Error("refresh failed"); } }, { query: "word" }, /refresh failed/],
    [{ ...options, request: async () => { throw Error("transport failed"); } }, { query: "word", langs: ["de", "en"] }, /transport failed/],
    [options, {}, /Suchtext oder Hashtag/],
  ];
  for (const [config, payload, pattern] of cases) {
    const service = factory(config); const state = maps.at(-1);
    await assert.rejects(service.load({ ...payload, runId: "failure" }), pattern);
    assert.equal(state.size, 0);
  }
});
