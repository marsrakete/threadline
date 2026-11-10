"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { archiveModelsFixture, plain, uri } = require("./worker-archive-models-fixtures.cjs");

/** Creates the source resolver with real worker imports and a controlled profile transport.
 * @returns {object} Source API, constructor, options, calls, response queue and auth.
 */
function sourceFixture() {
  const f = archiveModelsFixture(), calls = [], responses = [];
  const options = { request: async (method, params, transport) => {
    calls.push({ method, params, transport }); const value = responses.shift();
    if (value instanceof Error) { throw value; } return value;
  }, base: () => "https://fixture.test/xrpc" };
  const factory = f.context.createThreadlineArchiveSourceService;
  return { ...f, factory, options, calls, responses, source: factory(options), auth: { session: { did: "did:own", handle: "Own.Test", accessJwt: "fixture" }, avatar: "own-avatar" } };
}

/** Creates a complete live wave snapshot for result-model contracts.
 * @returns {object} Mutable wave data and explicit export metadata.
 */
function waveState() {
  return { sourceProfile: { handle: "own.test", displayName: "<b>Own</b>", avatar: "avatar" }, sourceDid: "did:own",
    normalizedFilters: { scope: "all" }, orderedPosts: [{ uri: uri() }], assets: [{ path: "image" }], imageCount: 2,
    skippedImageCount: 3, hashtagFilteredOutCount: 4, pageCount: 5, currentPhase: "images", cursor: "next",
    exportedAt: "2026-10-28T10:00:00.000Z", appVersion: "v375" };
}

test("archive source constructor validates adapters and exposes a frozen resolver", () => {
  const f = sourceFixture(); assert.throws(() => f.factory(), /request/);
  for (const key of ["request", "base"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError); }
  assert.equal(Object.isFrozen(f.source), true); assert.deepEqual(Object.keys(f.source), ["resolve"]);
});

test("archive source refreshes own profile metadata while retaining local fallback fields", async () => {
  const f = sourceFixture();
  for (const filters of [undefined, null, {}, { sourceDid: " ", sourceActor: " " }]) {
    assert.deepEqual(plain(await f.source.resolve(f.auth, filters)), { did: "did:own", handle: "Own.Test", displayName: "Own.Test", avatar: "own-avatar", isOwnAccount: true });
  }
  assert.equal(f.calls.length, 4);
  assert.equal((await f.source.resolve({ session: f.auth.session })).avatar, "");
});

test("archive source profile lookup prioritizes DID, keeps auth and normalizes profile/fallback fields", async () => {
  const f = sourceFixture(); f.responses.push({ did: " did:own ", handle: " own.test ", displayName: " Name ", avatar: " avatar " });
  assert.deepEqual(plain(await f.source.resolve(f.auth, { sourceDid: " did:own ", sourceActor: " ignored.test " })),
    { did: "did:own", handle: "own.test", displayName: "Name", avatar: "avatar", isOwnAccount: true });
  assert.deepEqual(plain(f.calls[0]), { method: "app.bsky.actor.getProfile", params: { actor: "did:own" }, transport: { headers: { authorization: "Bearer fixture" }, base: "https://fixture.test/xrpc" } });
  f.responses.push(null); assert.deepEqual(plain(await f.source.resolve(f.auth, { sourceActor: " Other.Test " })),
    { did: "", handle: "Other.Test", displayName: "Other.Test", avatar: "", isOwnAccount: false });
  f.responses.push({ did: "did:other" }); assert.equal((await f.source.resolve(f.auth, { sourceDid: "did:other" })).handle, "did:other");
});

test("own archive profiles retain fresh pronouns and links in the manifest", async () => {
  const f = sourceFixture();
  f.responses.push({ did: "did:own", pronouns: "sie/ihr", links: [{ url: "https://example.test/profile", title: "Homepage" }] });
  const profile = await f.source.resolve(f.auth);
  assert.equal(profile.pronouns, "sie/ihr");
  const state = waveState(); state.sourceProfile = profile;
  const result = f.models.wave.result(state);
  assert.equal(result.manifest.account.pronouns, "sie/ihr");
  assert.equal(result.manifest.account.links[0].title, "Homepage");
});

test("archive author profile metadata survives wave restore and partial enrichment", () => {
  const { models } = archiveModelsFixture();
  const profile = { pronouns: "they/them", links: [{ url: "https://example.test/", title: "Site" }] };
  const post = models.posts.build({ uri: uri(), record: { text: "Post" }, authorProfile: profile });
  const restored = models.wave.restore({ existingCatalog: { posts: [post] }, maxPosts: 25 });
  assert.equal(restored.records[0].authorProfile.pronouns, "they/them");
  models.posts.merge(post, { authorProfile: { pronouns: "" } });
  assert.equal(post.authorProfile.pronouns, "");
  assert.equal(post.authorProfile.links[0].title, "Site");
});

test("archive source failures propagate unchanged and invalid account input rejects", async () => {
  const f = sourceFixture(), failure = new Error("profile unavailable"); f.responses.push(failure);
  await assert.rejects(f.source.resolve(f.auth, { sourceActor: "other.test" }), error => error === failure);
  await assert.rejects(f.source.resolve(null), /Cannot read properties/);
});

test("archive wave restore retains pagination defaults, clamps boundaries and tolerates malformed containers", () => {
  const { wave } = archiveModelsFixture().models;
  const empty = wave.restore(); assert.equal(empty.records.length, 0); assert.equal(empty.postsByUri.size, 0); assert.equal(empty.rawRecordsByUri.size, 0);
  assert.equal(empty.cursor, ""); assert.equal(empty.pageSize, 100); assert.equal(empty.pageCount, 0);
  for (const [maxPosts, expected] of [[1, 25], [25, 25], [101, 100], [0, 100], ["50", 50], ["bad", 100]]) {
    assert.equal(wave.restore({ maxPosts }).pageSize, expected);
  }
  assert.equal(wave.restore({ initialCursor: 42, existingSession: { pageCount: "7" } }).cursor, "42");
  assert.equal(wave.restore({ existingSession: { pageCount: "7" } }).pageCount, 7);
  assert.equal(wave.restore({ existingSession: { pageCount: -1 }, existingCatalog: { posts: "bad" } }).pageCount, 0);
});

test("archive wave restore copies mutable post/count/image containers while retaining raw/nested identities", () => {
  const { wave } = archiveModelsFixture().models;
  const image = { path: "image" }, raw = { text: "Raw" }, counts = { likeCount: "3", replyCount: "bad" };
  const post = { uri: uri(), rawRecord: raw, counts, images: [image], authorHandle: "own.test" };
  const result = wave.restore({ existingCatalog: { posts: [post] } }), restored = result.postsByUri.get(post.uri);
  assert.notEqual(restored, post); assert.notEqual(restored.images, post.images); assert.equal(restored.images[0], image);
  assert.notEqual(restored.counts, counts); assert.equal(restored.counts.likeCount, 3); assert.equal(restored.counts.replyCount, 0);
  assert.equal(result.rawRecordsByUri.get(post.uri), raw); assert.equal(result.records[0].value, raw); assert.equal(result.records[0].counts, restored.counts);
  assert.equal(counts.likeCount, "3"); assert.equal(post.images.length, 1);
});

test("archive wave restore preserves duplicate record order and last-map-entry behavior with raw fallbacks", () => {
  const { wave } = archiveModelsFixture().models;
  const langs = ["de"], facets = [{ id: 1 }], first = { uri: uri(), text: "first" }, last = { uri: uri(), text: "last", langs, facets, images: "bad" };
  const result = wave.restore({ existingCatalog: { posts: [null, {}, first, last] } });
  assert.equal(result.records.length, 2); assert.equal(result.postsByUri.size, 1);
  assert.equal(result.postsByUri.get(uri()).text, "last"); assert.equal(result.records[0].value.text, "first");
  const raw = result.rawRecordsByUri.get(uri()); assert.equal(raw.text, "last"); assert.equal(raw.langs, langs); assert.equal(raw.facets, facets);
  assert.equal(raw.embed, null); assert.equal(raw.reply, null); assert.equal(result.postsByUri.get(uri()).images.length, 0);
});

test("archive wave result retains manifest/session schema, status/error and explicit clock/version metadata", () => {
  const { wave } = archiveModelsFixture().models, state = waveState();
  for (const status of ["completed", "cancelled", "paused"]) {
    const result = wave.result(state, status, { errorMessage: "Literal <error>" });
    assert.deepEqual(plain(result.manifest), { schemaVersion: 1, exportedAt: state.exportedAt, appVersion: "v375",
      account: { handle: "own.test", did: "did:own", displayName: "<b>Own</b>", avatar: "avatar" }, filters: { scope: "all" },
      postCount: 1, imageCount: 2, skippedImageCount: 3, hashtagFilteredOutCount: 4, pageCount: 5, phase: "images", errorMessage: "Literal <error>" });
    assert.deepEqual(plain(result.session), { waveIndex: 1, nextCursor: "next", hasMore: true, exportedPosts: 1, exportedImages: 2,
      skippedImages: 3, status, pageCount: 5, phase: "images", errorMessage: "Literal <error>" });
  }
  assert.equal(wave.result(state).session.status, "completed"); assert.equal(wave.result(state).manifest.errorMessage, "");
});

test("archive wave result reads the latest snapshot and preserves returned arrays/filter references", () => {
  const { wave } = archiveModelsFixture().models, state = waveState();
  const first = wave.result(state); assert.equal(first.posts, state.orderedPosts); assert.equal(first.assets, state.assets); assert.equal(first.manifest.filters, state.normalizedFilters);
  state.orderedPosts = []; state.imageCount = 0; state.cursor = ""; state.currentPhase = "fetch";
  const second = wave.result(state); assert.equal(second.manifest.postCount, 0); assert.equal(second.manifest.imageCount, 0);
  assert.equal(second.session.hasMore, false); assert.equal(second.session.phase, "fetch"); assert.equal(first.posts.length, 1);
});

test("archive wave models reject invalid required inputs without silently creating a new schema", () => {
  const { wave } = archiveModelsFixture().models;
  assert.throws(() => wave.restore(null), /Cannot read properties|Cannot destructure/);
  assert.throws(() => wave.result(null), /Cannot read properties/);
  assert.throws(() => wave.result(waveState(), "paused", null), /Cannot read properties|Cannot destructure/);
});
