"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain, uri } = require("./worker-archive-models-fixtures.cjs");

/** Loads actual worker models and creates controlled analysis dependencies.
 * @returns {object} Service/models, mutable queues/auth state and call/progress traces.
 */
function fixture() {
  const f = archiveModelsFixture(), calls = [], progress = [], queue = [], graphQueue = [], data = { state: { accounts: [] } };
  const auth = { session: { did: "did:example:own", handle: "own.test", accessJwt: "fixture" } };
  const options = { models: f.context.createThreadlineAnalysisModels({ parseUri: vm.runInContext("parseAtUri", f.context) }),
    session: async did => { calls.push(["session", did]); return auth; }, readAuth: async () => data.state,
    request: async (...args) => { calls.push(args); const response = queue.shift(); if (response instanceof Error) { throw response; } return response; },
    base: () => "https://fixture.test/xrpc", resolve: async (...args) => { calls.push(["resolve", ...args]); return "did:example:own"; },
    profile: vm.runInContext("normalizeNetworkProfile", f.context), error: vm.runInContext("createServiceWorkerError", f.context),
    graphPage: async (...args) => { calls.push(["graph", ...args]); const response = graphQueue.shift(); if (response instanceof Error) { throw response; } return response || { profiles: [], cursor: "" }; },
    now: () => Date.parse("2026-10-31T12:00:00Z"), messages: f.context.ThreadlineAnalysisMessages,
    limits: { feedPageSize: 100, feedMaxPages: 200, graphPageLimit: 100, graphMaxProfiles: 5000, profileBatchSize: 25 } };
  const factory = f.context.createThreadlineAnalysisService;
  return { ...f, models: options.models, modelFactory: f.context.createThreadlineAnalysisModels, factory, options, service: factory(options), auth, calls, queue, graphQueue, data, progress, notify: value => progress.push(value) };
}

/** Creates an analysis feed post with deterministic dates and optional overrides.
 * @param {string} key - Post key. @param {object} record - Record overrides. @returns {object} Post view.
 */
function view(key = "one", record = {}) { return { uri: uri(key), cid: key, author: { did: "did:example:own" }, record: { text: "Text " + key, createdAt: "2026-10-30T12:00:00Z", ...record } }; }

test("analysis constructors freeze their APIs and require explicit adapters", () => {
  const f = fixture(); assert.throws(() => f.modelFactory(), /parseUri/); assert.equal(Object.isFrozen(f.models), true); assert.equal(Object.isFrozen(f.service), true);
  assert.deepEqual(Object.keys(f.service), ["check", "load", "auth", "graph", "lists", "profiles", "top"]);
  for (const name of ["session", "readAuth", "request", "base", "resolve", "profile", "graphPage", "error", "now"]) { assert.throws(() => f.factory({ ...f.options, [name]: null }), /requires/); }
  assert.throws(() => f.factory({ ...f.options, models: null }), /model/);
  for (const name of Object.keys(f.options.limits)) { assert.throws(() => f.factory({ ...f.options, limits: { ...f.options.limits, [name]: 0 } }), /limit/); }
});

test("analysis facets retain duplicate entries, feature rules, empty trimming and URL hosts", () => {
  const f = fixture(), result = f.models.facets({ facets: [{ features: [
    { $type: "app.bsky.richtext.facet#mention", did: " did:one " }, { $type: "app.bsky.richtext.facet#mention", did: " did:one " },
    { $type: "app.bsky.richtext.facet#tag", tag: " TOPIC " }, { $type: "app.bsky.richtext.facet#tag", tag: " " },
    { $type: "app.bsky.richtext.facet#link", uri: "https://EXAMPLE.org/path" }, { $type: "app.bsky.richtext.facet#link", uri: "invalid" }] }, null] });
  assert.deepEqual(plain(result), { mentions: ["did:one", "did:one"], hashtags: ["topic", ""], domains: ["example.org"] });
  for (const input of [undefined, null, { facets: "bad" }]) { assert.deepEqual(plain(f.models.facets(input)), { mentions: [], hashtags: [], domains: [] }); }
});

test("analysis reply/quote/media detection and first valid quoted DID retain envelope priorities", () => {
  const m = fixture().models;
  assert.equal(m.reply({ reply: { root: { uri: "root" } } }), false); assert.equal(m.reply({ reply: { root: { uri: "root" }, parent: { uri: "parent" } } }), true);
  assert.equal(m.quote({ embed: { $type: "app.bsky.embed.recordWithMedia" } }), true); assert.equal(m.quote(null, null), false);
  assert.equal(m.media(null, { embed: { $type: "app.bsky.embed.images#view" } }), true); assert.equal(m.media({ embed: { $type: "app.bsky.embed.external" } }), false);
  assert.equal(m.quoteDid({ embed: { record: { uri: "bad", record: { uri: uri("quoted", "did:example:quoted") } } } }, { embed: { record: { uri: uri("later") } } }), "did:example:quoted");
  assert.equal(m.quoteDid(null, null), "");
});

test("analysis ranking preserves count/locale ordering, denominator clamps and slice limits", () => {
  const m = fixture().models, counts = new Map([["b", 2], ["a", 2], ["c", 1]]);
  assert.deepEqual(plain(m.top(counts, 4, 2)), [{ label: "a", identifier: "a", count: 2, share: .5 }, { label: "b", identifier: "b", count: 2, share: .5 }]);
  assert.equal(m.top(counts, 0, 1)[0].share, 2); assert.equal(m.top(counts, 4, 0).length, 0); assert.throws(() => m.top(null, 1));
});

test("saved-account lookup and analysis snapshots preserve normalization and intentionally reduced schema", () => {
  const m = fixture().models, account = { did: " DID:ONE ", handle: " @Own.Test ", identifier: "legacy" };
  for (const actor of ["did:one", "@@own.test", " LEGACY "]) { assert.equal(m.storedAccount({ accounts: [account] }, actor), account); }
  assert.equal(m.storedAccount({ accounts: "invalid" }, "own"), null); assert.equal(m.storedAccount(null, ""), null);
  for (const input of [undefined, null, 1, "bad"]) { assert.equal(m.storedState(input), null); }
  const result = m.storedState({ accountA: { profile: { did: " did:own ", postsCount: -3 }, posts: [{ text: " x ", uri: " uri " }], network: { ignored: true } }, comparison: { score: -1, labelKey: " label " } });
  assert.equal(result.accountA.profile.did, "did:own"); assert.equal(result.accountA.profile.postsCount, 0); assert.equal(result.accountA.network, undefined);
  assert.equal(result.accountA.posts[0].text, "x"); assert.equal(result.options.limit, 500); assert.equal(result.comparison.score, 0); assert.equal(result.accountB, null);
});

test("feed-page scan keeps own-author date boundaries before exclusions and counts only accepted text", () => {
  const m = fixture().models, state = m.createScanState(), reply = view("reply", { reply: { root: { uri: uri("root") }, parent: { uri: uri("root") } } });
  const tagged = view("tag", { text: " a\n b ", langs: [" DE ", "de"], facets: [{ features: [{ $type: "app.bsky.richtext.facet#tag", tag: "Tag" }] }], embed: { $type: "app.bsky.embed.images" } });
  const foreign = view("foreign"); foreign.author.did = "did:other";
  const older = view("old", { createdAt: "2020-01-01" });
  const last = m.scanPage(state, [null, { post: foreign }, { post: reply }, { post: view("empty", { text: " " }) }, { post: tagged }, { post: older }], { actorDid: "did:example:own", minTimestamp: Date.parse("2026-01-01"), includeReplies: false, includeQuotes: false, limit: 100 });
  assert.equal(state.posts.length, 1); assert.equal(state.posts[0].text, "a b"); assert.equal(state.newestPostAt, reply.record.createdAt); assert.equal(last, "2020-01-01"); assert.equal(state.reachedOlderPosts, true);
  assert.equal(state.hashtagFrequency.get("tag"), 1); assert.equal(state.languageFrequency.get("de"), 2); assert.equal(state.mediaPostCount, 1);
  assert.equal(m.createScanState().posts.length, 0); assert.throws(() => m.scanPage(m.createScanState(), null, {}));
});

test("feed scan stops at its accepted-post limit and includes configured reply/quote targets", () => {
  const m = fixture().models, state = m.createScanState(), p = view("one", { reply: { root: { uri: uri() }, parent: { uri: uri("target", "did:target") } }, embed: { record: { uri: uri("quote", "did:quote") } } });
  m.scanPage(state, [{ post: p }, { post: view("two") }], { actorDid: p.author.did, minTimestamp: 0, includeReplies: true, includeQuotes: true, limit: 1 });
  assert.equal(state.posts.length, 1); assert.equal(state.replyTargetFrequency.get("did:target"), 1); assert.equal(state.quoteTargetFrequency.get("did:quote"), 1); assert.equal(state.textOnlyPostCount, 1);
});

test("analysis auth chooses stored DID sessions and retains the supplied fallback", async () => {
  const f = fixture(), fallback = {}; assert.equal(await f.service.auth("foreign", fallback), fallback);
  f.data.state.accounts.push({ did: f.auth.session.did, handle: "own.test" }); assert.equal(await f.service.auth("@OWN.test", null), f.auth);
  assert.deepEqual(f.calls[0], ["session", f.auth.session.did]);
});

test("profile enrichment batches 25 DIDs, caches references and retries only uncached or failed profiles", async () => {
  const f = fixture(), dids = Array.from({ length: 26 }, (_, i) => "did:example:" + i);
  f.queue.push({ profiles: dids.slice(0, 25).map(did => ({ did, handle: did + ".test" })) }, Error("last batch"));
  const result = await f.service.profiles(f.auth, [...dids, dids[0], "handle.test"]); assert.equal(result.size, 25);
  assert.deepEqual(f.calls.map(call => call[1].actors.length), [25, 1]);
  f.queue.push({ profiles: [{ did: dids[25], handle: "last.test" }] }); const next = await f.service.profiles(f.auth, dids);
  assert.equal(next.get(dids[0]), result.get(dids[0])); assert.equal(next.size, 26); assert.equal(f.calls[2][1].actors.length, 1);
  assert.equal((await f.service.profiles(null, dids)).size, 0); assert.equal((await f.service.profiles(f.auth, "bad")).size, 0);
});

test("resolved top lists retain plain ranking or flag unresolved actors as deleted", async () => {
  const f = fixture(), counts = new Map([["did:one", 2], ["did:missing", 1]]);
  assert.equal((await f.service.top(counts, 3, f.auth, 10, false))[0].label, "did:one"); assert.equal(f.calls.length, 0);
  f.queue.push({ profiles: [{ did: "did:one", handle: "one.test", displayName: "One" }] });
  const top = await f.service.top(counts, 3, f.auth, 10, true); assert.equal(top[0].label, "one.test"); assert.equal(top[1].deleted, true);
});

test("graph and authenticated list paging retain cursor rules, cap overshoot and missing-token null", async () => {
  const f = fixture(), service = f.factory({ ...f.options, limits: { ...f.options.limits, graphMaxProfiles: 2 } });
  f.graphQueue.push({ profiles: [{ did: "one" }, { did: "two" }, { did: "three" }], cursor: "more" });
  assert.equal((await service.graph(f.auth, "followers", "actor", "followers", f.notify, "Title", "Step", 95)).length, 3); assert.equal(f.calls.length, 1); assert.equal(f.progress[0].detail, "3 geladen · Seite 1");
  assert.equal(await service.lists(null, "mutes", "mutes"), null);
  f.queue.push({ mutes: [{ did: "one" }], cursor: " next " }, { mutes: [{ did: "two" }], cursor: "more" });
  assert.equal((await service.lists(f.auth, "mutes", "mutes")).length, 2); assert.equal(f.calls.at(-1)[1].cursor, "next");
});

test("analysis account checks preserve DID bypass, normalized profiles and expected service error codes", async () => {
  const f = fixture(); await assert.rejects(f.service.check({ actor: " " }), error => error.details.code === "ANALYSIS_ACCOUNT_MISSING");
  f.queue.push({ did: " did:own ", handle: " own.test ", displayName: " Name " });
  assert.deepEqual(plain(await f.service.check({ actor: "did:own" })), { did: "did:own", handle: "own.test", displayName: "Name", avatar: "" });
  f.queue.push(Error("RecordNotFound")); await assert.rejects(f.service.check({ actor: "@own.test" }), error => error.details.code === "ANALYSIS_ACCOUNT_NOT_FOUND");
  f.queue.push(Error("offline")); await assert.rejects(f.service.check({ actor: "did:own" }), error => error.details.code === "ANALYSIS_ACCOUNT_CHECK_FAILED" && error.message === "offline");
});

test("account load combines corpus, graph/mutual markers and unavailable private lists", async () => {
  const f = fixture(); f.queue.push({ did: f.auth.session.did, handle: "own.test" }, { feed: [{ post: view() }], cursor: "" });
  f.graphQueue.push({ profiles: [{ did: "mutual" }], cursor: "" }, { profiles: [{ did: "mutual" }, { did: "follow" }], cursor: "" });
  const result = await f.service.load({ actor: "@own.test", options: { limit: 1 } }, f.notify);
  assert.equal(result.filters.limit, 100); assert.equal(result.posts.length, 1); assert.equal(result.stats.scannedPosts, 1); assert.deepEqual(plain(result.network.mutualDids), ["mutual"]);
  assert.equal(result.network.mutes, null); assert.equal(result.network.muteBlockSource, "unavailable"); assert.equal(result.markers.textOnlyPostShare, 1);
  assert.equal(f.calls.find(call => call[0] === "app.bsky.feed.getAuthorFeed")[1].limit, 100);
});

test("account load preserves partial/failed graph warnings and loads private lists only for saved source account", async () => {
  const f = fixture(); f.data.state.accounts.push({ did: f.auth.session.did });
  f.queue.push({ did: f.auth.session.did }, { feed: [] }, { mutes: [{ did: "muted" }] }, { blocks: [] });
  f.graphQueue.push(Error("followers offline"), { profiles: [{ did: "follow" }], cursor: "" });
  const result = await f.service.load({}, f.notify); assert.equal(result.network.loadState, "partial"); assert.match(result.network.warnings[0], /followers offline/);
  assert.equal(result.network.muteBlockSource, "saved_account"); assert.equal(result.network.mutes[0].did, "muted"); assert.equal(result.posts.length, 0); assert.equal(result.markers.mediaPostShare, 0);
});

test("account load retains range/flag defaults, page cap, fatal profile and observer errors", async () => {
  const f = fixture(), service = f.factory({ ...f.options, limits: { ...f.options.limits, feedMaxPages: 1 } });
  f.queue.push({ did: f.auth.session.did }, { feed: [{ post: view("old", { createdAt: "2020-01-01" }) }], cursor: "next" });
  const result = await service.load({ options: { rangeDays: 1, includeReplies: 1, includeQuotes: true, limit: 9999 } }, f.notify);
  assert.equal(result.filters.limit, 2000); assert.equal(result.filters.includeReplies, false); assert.equal(result.filters.includeQuotes, true); assert.equal(result.stats.pages, 1); assert.equal(result.posts.length, 0);
  f.queue.push(Error("RecordNotFound")); await assert.rejects(service.load({}, f.notify), /wurde nicht gefunden/);
  const failure = Error("observer"); await assert.rejects(service.load({}, () => { throw failure; }), error => error === failure);
  await assert.rejects(service.load(null), /Cannot/);
});
