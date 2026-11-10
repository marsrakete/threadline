"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain, uri } = require("./worker-archive-models-fixtures.cjs");

/** Creates a post view with optional reply links for import selection tests.
 * @param {string} key - Record key. @param {string} did - Author. @param {string} root - Optional root URI.
 * @returns {object} Provider post view.
 */
function post(key, did = "did:example:own", root = "") {
  const record = { text: key, createdAt: "2026-10-31T10:00:00Z" };
  if (root) { record.reply = { root: { uri: root }, parent: { uri: root } }; }
  return { uri: uri(key, did), cid: key, record, author: { did, handle: "own.test", displayName: "Name" }, likeCount: "3" };
}

/** Loads real archive models and both services with controlled auth, transport, assets and run callbacks.
 * @returns {object} Service, options, queued responses, provider traces, control and asset traces.
 */
function fixture() {
  const f = archiveModelsFixture(), calls = [], responses = [], progress = [], events = [], downloads = [], delays = [];
  const auth = { session: { did: "did:example:own", handle: "own.test", accessJwt: "token" } };
  const control = { start: id => events.push(["start", id]), finish: id => events.push(["finish", id]), wait: async () => "running" };
  const assetOptions = { messages: f.context.ThreadlineArchiveRunMessages, download: async () => { throw Error("Unexpected avatar"); },
    normalize: blob => blob, extension: () => "png", concurrency: 3, map: vm.runInContext("mapWithConcurrency", f.context),
    blob: async (...args) => { downloads.push(args); return { type: "image/png", bytes: new Uint8Array([1, 2]) }; },
    cid: vm.runInContext("getBlobCidFromRef", f.context), images: f.models.posts.images,
    wait: (...args) => control.wait(...args), publicUrl: async () => "https://blob.test", dataUrl: () => "data:image/png;base64,AQI=", delay: async ms => delays.push(ms) };
  const options = { session: async () => auth, parse: vm.runInContext("parseArchiveThreadSource", f.context),
    resolve: async (...args) => { calls.push(["resolve", ...args]); return auth.session.did; },
    request: async (...args) => { calls.push(args); const value = responses.shift(); if (value instanceof Error) { throw value; } return value; },
    base: () => "https://fixture.test/xrpc", models: f.models, assets: f.context.createThreadlineArchiveAssetService(assetOptions), control,
    messages: f.context.ThreadlineArchiveRunMessages, now: () => "2026-10-31T12:00:00Z", appVersion: "v375" };
  const factory = f.context.createThreadlineArchiveImportService;
  return { ...f, factory, service: factory(options), options, auth, control, calls, responses, progress, events, downloads, delays, assetOptions,
    input: { runId: "import", url: "https://bsky.app/profile/own.test/post/child", importMode: "path" }, notify: value => progress.push(value) };
}

/** Queues a reply entry and a root with own and foreign replies.
 * @param {object} f - Fixture. @returns {object} Root, entry and foreign views.
 */
function queueThread(f) {
  const root = post("root"), entry = post("child", undefined, root.uri), other = post("other", "did:example:other", root.uri);
  f.responses.push({ posts: [entry] }, { thread: { post: root, replies: [{ post: entry }, { post: other }] } });
  return { root, entry, other };
}

test("import factory validates callbacks and freezes its public API", () => {
  const f = fixture(); assert.throws(() => f.factory(), /session/);
  for (const key of ["session", "parse", "resolve", "request", "base", "now"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError); }
  for (const key of ["start", "finish", "wait"]) { assert.throws(() => f.factory({ ...f.options, control: { ...f.control, [key]: null } }), /control/); }
  assert.throws(() => f.factory({ ...f.options, models: null }), /model/);
  assert.throws(() => f.factory({ ...f.options, assets: null }), /assets/);
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["load", "collect", "enrich", "result"]);
});

test("import path/tree/author selection retains root request depth, actor resolution and request auth", async () => {
  for (const [mode, expected] of [["path", ["root", "child"]], ["tree", ["root", "child", "other"]], ["author", ["root", "child"]], ["invalid", ["root", "child"]]]) {
    const f = fixture(); queueThread(f); const source = await f.service.collect({ ...f.input, importMode: mode, auth: f.auth, notifyProgress: f.notify });
    assert.deepEqual(plain(source.threadViews.map(p => p.cid)), expected); assert.equal(source.entryMode, "reply");
    assert.equal(f.calls[0][0], "resolve"); assert.equal(f.calls[2][0], "app.bsky.feed.getPostThread");
    assert.deepEqual(plain(f.calls[2][1]), { uri: uri("root"), depth: 100, parentHeight: 0 }); assert.equal(f.calls[2][2].headers.authorization, "Bearer token");
    let expectedMode = mode;
    if (mode === "invalid") { expectedMode = "path"; }
    assert.equal(source.normalizedImportMode, expectedMode);
  }
});

test("DID URLs skip resolution, invalid URLs and unresolved actors fail before run registration", async () => {
  const f = fixture(); f.responses.push({ posts: [] }); await f.service.load({ ...f.input, url: uri("root") }, f.notify);
  assert.equal(f.calls[0][0], "app.bsky.feed.getPosts");
  const g = fixture(); await assert.rejects(g.service.load({ url: "not a URL" }, g.notify)); assert.deepEqual(g.events, []);
  await assert.rejects(g.factory({ ...g.options, resolve: async () => "" }).load(g.input, g.notify), /keinem Bluesky/); assert.deepEqual(g.events, []);
});

test("missing entry requests and swallowed entry failures return the existing empty completed schema", async () => {
  for (const response of [{ posts: [] }, { posts: "invalid" }, Error("forbidden")]) {
    const f = fixture(); f.responses.push(response); const result = await f.service.load(f.input, f.notify);
    assert.equal(result.manifest.threadImport.entryMode, "missing"); assert.equal(result.manifest.postCount, 0); assert.equal(result.manifest.threadImport.note, "Post nicht gefunden oder gelöscht");
    assert.equal(result.session.status, "completed"); assert.equal(result.session.skippedImages, undefined); assert.equal(result.manifest.exportedAt, "2026-10-31T12:00:00Z");
    assert.deepEqual(f.events, [["start", "import"], ["finish", "import"]]);
  }
});

test("initial cancellation retains its deliberately sparse manifest and skips tree/asset requests", async () => {
  const f = fixture(); queueThread(f); f.control.wait = async () => "cancelled";
  const result = await f.factory(f.options).load(f.input, f.notify);
  assert.equal(result.session.status, "cancelled"); assert.equal(Object.hasOwn(result.manifest, "postCount"), false);
  assert.equal(Object.hasOwn(result.manifest.threadImport, "authorHandle"), false); assert.equal(f.responses.length, 1); assert.equal(f.downloads.length, 0);
});

test("metadata enrichment preserves raw references, last duplicate metadata, counts and descending order", () => {
  const f = fixture(), root = post("root"), duplicate = { ...root, likeCount: 9 }, recent = post("recent");
  root.record.createdAt = "2020-01-01"; recent.record.createdAt = "2026-01-01";
  const result = f.service.enrich({ threadViews: [root, recent, duplicate], rootUri: root.uri, notifyProgress: f.notify });
  assert.equal(result.orderedPosts.length, 2); assert.equal(result.orderedPosts[0].uri, recent.uri); assert.equal(result.postsByUri.get(root.uri).counts.likeCount, 9);
  assert.equal(result.rawRecordsByUri.get(root.uri), root.record); assert.equal(f.progress[0].step, "3 Posts wurden im Thread gefunden");
  assert.equal(f.service.enrich({ threadViews: [], notifyProgress: f.notify }).orderedPosts.length, 0);
  assert.throws(() => f.service.enrich(null), /Cannot/);
});

test("completed import retains result identities, source-author metadata and mode semantics", async () => {
  const f = fixture(); queueThread(f); const result = await f.service.load(f.input, f.notify);
  assert.equal(result.posts.length, 2); assert.equal(result.session.exportedPosts, 2); assert.equal(result.manifest.threadImport.authorDisplayName, "Name"); assert.equal(result.manifest.threadImport.importMode, "path");
  const context = { auth: f.auth, parsedSource: { sourceUrl: "url" }, entryPost: post("entry"), orderedPosts: result.posts, assets: result.assets, imageCount: 0, skippedImageCount: 0 };
  const rebuilt = f.service.result(context); assert.equal(rebuilt.posts, result.posts); assert.equal(rebuilt.assets, result.assets);
  assert.equal(Object.hasOwn(rebuilt.session, "skippedImages"), false); assert.throws(() => f.service.result(null), /Cannot/);
});

test("tree request errors and observer failures keep propagating instead of becoming missing results", async () => {
  const f = fixture(), failure = Error("tree failed"); f.responses.push({ posts: [post("root")] }, failure);
  await assert.rejects(f.service.load(f.input, f.notify), error => error === failure);
  const g = fixture(); await assert.rejects(g.service.load(g.input, () => { throw failure; }), error => error === failure);
});

test("thread assets use one card attempt, normalized image bytes and a preview for every fifth image", async () => {
  const f = fixture(), p = post("root");
  p.record.embed = { $type: "app.bsky.embed.images", images: Array.from({ length: 5 }, (_, i) => ({ image: { ref: { $link: "image" + i } }, alt: "alt" })) };
  f.responses.push({ posts: [p] }, { thread: { post: p } });
  const service = f.factory({ ...f.options, assets: f.context.createThreadlineArchiveAssetService({ ...f.assetOptions, normalize: () => ({ type: "image/webp", bytes: new Uint8Array([8]) }) }) });
  const result = await service.load({ ...f.input, importMode: "tree" }, f.notify);
  assert.equal(result.manifest.imageCount, 5); assert.equal(result.assets[0].type, "image/webp"); assert.deepEqual(Array.from(result.assets[0].bytes), [8]);
  assert.ok(f.progress.some(value => value.preview?.meta === "Thread-Bild 5 heruntergeladen")); assert.equal(f.downloads.length, 5);
});

test("thread cards tolerate their single failure and image retries skip after two failures", async () => {
  const f = fixture(), p = assetEntity(), downloads = [];
  const options = { ...f.assetOptions, blob: async (...args) => { downloads.push(args); throw Error("blob failed"); } };
  const service = f.context.createThreadlineArchiveAssetService(options), state = { imageCount: 0, skippedImageCount: 0 };
  const input = { orderedPosts: [p], rawRecordsByUri: new Map([[p.uri, { embed: { $type: "app.bsky.embed.images", images: [{ image: { ref: { $link: "image" } } }] } }]]), assets: [], seenAssetPaths: new Set(), auth: f.auth, actorDid: f.auth.session.did,
    pdsServiceCache: new Map(), archiveBlobCache: new Map(), notifyProgress: f.notify };
  assert.equal(await service.attachThreadAssets(input, state), false); assert.equal(downloads.length, 3); assert.deepEqual(f.delays, [350]);
  assert.equal(p.externalCard.thumbLoadAttempts, 1); assert.equal(p.externalCard.thumbLoadFailed, true); assert.equal(state.skippedImageCount, 1);
});

/** Creates a mutable archive entity containing one link-card thumbnail.
 * @returns {object} Minimal entity with counts and image collection.
 */
function assetEntity() { return { uri: uri("entity"), rkey: "entity", authorHandle: "own.test", images: [], counts: {}, externalCard: { thumbRef: { ref: { $link: "card" } } } }; }

test("thread asset cancellation happens per post after cards; malformed inputs/dependencies reject", async () => {
  const f = fixture(), p = assetEntity(), state = { imageCount: 0, skippedImageCount: 0 };
  const input = { orderedPosts: [p], rawRecordsByUri: new Map(), assets: [], seenAssetPaths: new Set(), auth: f.auth, actorDid: f.auth.session.did, pdsServiceCache: new Map(), archiveBlobCache: new Map(), notifyProgress: f.notify };
  f.control.wait = async () => "cancelled"; assert.equal(await f.options.assets.attachThreadAssets(input, state), true);
  assert.equal(input.assets.length, 1); assert.equal(f.downloads[0][4].timeoutMs, 5000); assert.equal(state.imageCount, 0);
  await assert.rejects(f.options.assets.attachThreadAssets(null, state), /Cannot/);
  await assert.rejects(f.context.createThreadlineArchiveAssetService({ ...f.assetOptions, blob: null }).attachThreadAssets(input, state), /requires blob/);
});
