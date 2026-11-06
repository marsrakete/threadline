"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain, uri } = require("./worker-archive-models-fixtures.cjs");

/** Creates controlled wave adapters while loading the real worker import chain.
 * @returns {object} Services, dependencies, requests, responses and live page inputs.
 */
function fixture() {
  const f = archiveModelsFixture(), calls = [], responses = [], progress = [], retries = [];
  const options = { messages: f.context.ThreadlineArchiveRunMessages,
    request: async (...args) => { calls.push(args); const response = responses.shift(); if (response instanceof Error) { throw response; } return response; },
    refresh: async () => ({ session: { accessJwt: "fresh" } }), base: () => "https://fixture.test/xrpc",
    retry: async (operation, settings) => { retries.push(settings); return operation(); }, wait: async () => "running",
    chunk: (items, size) => { const batches = []; for (let i = 0; i < items.length; i += size) { batches.push(items.slice(i, i + size)); } return batches; },
    select: (record) => record.text !== "exclude", hashtag: async (post) => post.record.text !== "untagged",
  };
  const input = { auth: { session: { did: "did:own" } }, sourceProfile: { isOwnAccount: true, handle: "own.test" }, sourceDid: "did:own",
    normalizedFilters: {}, pageSize: 25, pageCount: 2, runId: "run", notifyProgress: value => progress.push(value), hasHashtagFilter: true,
    threadHashtagMatchCache: new Map(), rootHashtagMatchCache: new Map() };
  const factory = f.context.createThreadlineArchiveWaveService;
  return { ...f, factory, options, service: factory(options), input, state: { cursor: "resume", hashtagFilteredOutCount: 4 }, calls, responses, progress, retries };
}

/** Creates a feed post with deterministic author/count metadata.
 * @param {string} id - Key. @param {string} text - Record text. @param {string} did - Author DID.
 * @returns {object} Feed post view.
 */
function post(id, text = "selected", did = "did:own") {
  return { uri: uri(id, did), cid: id, record: { text, createdAt: "2026-10-28T10:00:00Z" },
    author: { did, handle: " own.test ", displayName: " Name ", avatar: " avatar " }, likeCount: "3", replyCount: "bad", repostCount: 2 };
}

test("archive wave service validates all adapters and exposes a frozen API", () => {
  const f = fixture(); assert.throws(() => f.factory(), /request/);
  for (const key of ["request", "refresh", "base", "retry", "wait", "chunk", "select", "hashtag"]) {
    assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError);
  }
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["readPage", "enrichMetrics", "finalize"]);
});

test("repo collection keeps token, cursor, retry settings, raw identities and selection order", async () => {
  const f = fixture(), raw = post("one").record;
  f.responses.push({ cursor: "next", records: [{ uri: uri("one"), cid: "cid", value: raw }, { uri: uri("skip"), value: { text: "untagged" } }, { value: { text: "exclude", createdAt: "2020-01-01" } }] });
  const result = await f.service.readPage(f.input, f.state);
  assert.equal(result.pageRecords.length, 1); assert.equal(result.pageRecords[0].value, raw); assert.equal(result.oldestSeenCreatedAt, "2020-01-01");
  assert.deepEqual(f.state, { cursor: "next", hashtagFilteredOutCount: 5 });
  assert.deepEqual(plain(f.calls[0]), ["com.atproto.repo.listRecords", { repo: "did:own", collection: "app.bsky.feed.post", limit: 25, cursor: "resume" }, { headers: { authorization: "Bearer fresh" }, base: "https://fixture.test/xrpc" }]);
  assert.equal(f.retries[0].percent, 11); assert.equal(f.retries[0].baseDetail, "Konto: own.test");
});

test("foreign feed rejects other authors, retains oldest filtered timestamp and trims metadata", async () => {
  const f = fixture(); f.input.sourceProfile.isOwnAccount = false; f.state.cursor = "";
  const other = post("other", "selected", "did:other"); other.record.createdAt = "2019-01-01";
  f.responses.push({ cursor: "foreign-next", feed: [{ post: other }, null, { post: post("skip", "untagged") }, { post: post("one") }] });
  const result = await f.service.readPage(f.input, f.state);
  assert.equal(result.oldestSeenCreatedAt, "2019-01-01"); assert.equal(result.pageRecords.length, 1);
  assert.deepEqual(plain(result.pageRecords[0].counts), { likeCount: 3, replyCount: 0, repostCount: 2, quoteCount: 0 });
  assert.equal(result.pageRecords[0].authorDisplayName, "Name"); assert.equal(f.state.hashtagFilteredOutCount, 5);
  assert.equal(f.calls[0][0], "app.bsky.feed.getAuthorFeed"); assert.equal(f.calls[0][1].cursor, undefined);
});

test("page selection errors preserve partial cursor/skipped state without committing partial records", async () => {
  for (const own of [true, false]) {
    const f = fixture(); f.input.sourceProfile.isOwnAccount = own;
    const failure = Error("hashtag lookup failed"); let count = 0;
    const service = f.factory({ ...f.options, hashtag: async () => { count++; if (count === 3) { throw failure; } return count === 1; } });
    const posts = [post("one"), post("two"), post("three")];
    f.responses.push({ cursor: "advanced", records: posts.map(p => ({ uri: p.uri, value: p.record })), feed: posts.map(p => ({ post: p })) });
    await assert.rejects(service.readPage(f.input, f.state), error => error === failure);
    assert.deepEqual(f.state, { cursor: "advanced", hashtagFilteredOutCount: 5 });
  }
});

test("empty pages, disabled tags, malformed state and transport failures retain existing contracts", async () => {
  const f = fixture(); f.responses.push({}); const result = await f.service.readPage(f.input, f.state);
  assert.deepEqual(plain(result), { pageRecords: [], oldestSeenCreatedAt: "" }); assert.equal(f.state.cursor, "");
  f.input.hasHashtagFilter = false; f.responses.push({ records: [{ value: { text: "untagged" } }] });
  assert.equal((await f.service.readPage(f.input, f.state)).pageRecords.length, 1);
  const error = Error("offline"); f.responses.push(error); f.state.cursor = "keep";
  await assert.rejects(f.service.readPage(f.input, f.state), value => value === error); assert.equal(f.state.cursor, "keep");
  await assert.rejects(f.service.readPage(null, null), /Cannot/);
});

test("metrics uses 25er batches, merges known posts, retains fallback fields and emits second-batch previews", async () => {
  const f = fixture(), posts = Array.from({ length: 26 }, (_, index) => ({ uri: uri(String(index)), authorHandle: "old", counts: {}, text: "x".repeat(250) }));
  const postsByUri = new Map(posts.map(p => [p.uri, p]));
  f.responses.push({ posts: [{ uri: posts[0].uri, likeCount: "4", author: {} }, { uri: "unknown", likeCount: 9 }] }, { posts: [{ uri: posts[25].uri, replyCount: 2, author: { handle: "new" } }] });
  assert.equal(await f.service.enrichMetrics({ ...f.input, orderedPosts: posts, postsByUri, buildHashtagProgressDetail: text => text + " + tags" }), "completed");
  assert.deepEqual(f.calls.map(call => call[1].uris.length), [25, 1]); assert.equal(posts[0].counts.likeCount, 4); assert.equal(posts[0].authorHandle, "old");
  assert.equal(posts[25].authorHandle, "new"); assert.equal(f.progress.length, 3); assert.equal(f.progress[1].preview.text.length, 220);
  assert.equal(f.progress[2].percent, 65); assert.match(f.progress[2].detail, /\+ tags$/); assert.equal(f.retries[1].percent, 61);
});

test("metrics cancellation avoids transport, empty input avoids wait and invalid input rejects", async () => {
  const f = fixture(), service = f.factory({ ...f.options, wait: async () => "cancelled" });
  const input = { ...f.input, orderedPosts: [post("one")], postsByUri: new Map(), buildHashtagProgressDetail: text => text };
  assert.equal(await service.enrichMetrics(input), "cancelled"); assert.equal(f.calls.length, 0);
  assert.equal(await service.enrichMetrics({ ...input, orderedPosts: [] }), "completed");
  await assert.rejects(service.enrichMetrics(null), /Cannot/);
});

test("metrics transport and observer failures propagate after retaining committed updates", async () => {
  const f = fixture(), target = { uri: uri(), counts: {} }, failure = Error("observer");
  const input = { ...f.input, orderedPosts: [target], postsByUri: new Map([[target.uri, target]]), buildHashtagProgressDetail: text => text };
  f.responses.push(failure); await assert.rejects(f.service.enrichMetrics(input), error => error === failure);
  f.responses.push({ posts: [{ uri: target.uri, likeCount: 8 }] });
  await assert.rejects(f.service.enrichMetrics({ ...input, notifyProgress: () => { throw failure; } }), error => error === failure);
  assert.equal(target.counts.likeCount, 8);
});

/** Creates the shared avatar service with deterministic bounded mapping and download adapters.
 * @returns {object} Service, factory, options, calls and mutable test collections.
 */
function assetsFixture() {
  const f = archiveModelsFixture(), calls = [], assets = [], paths = new Set(), progress = [];
  const options = { messages: f.context.ThreadlineArchiveRunMessages, concurrency: 3,
    download: async (...args) => { calls.push(args); if (args[1] === "fail") { throw Error("download"); } return { type: "image/png", bytes: new Uint8Array([1, 2]) }; },
    normalize: blob => blob, extension: () => "png", map: vm.runInContext("mapWithConcurrency", f.context) };
  const factory = f.context.createThreadlineArchiveAssetService;
  return { ...f, factory, options, service: factory(options), calls, assets, paths, progress };
}

test("avatar service validates adapters and freezes its public API", () => {
  const f = assetsFixture(); assert.throws(() => f.factory(), /download/);
  for (const key of ["download", "normalize", "extension", "map"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError); }
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["attachAvatars", "attachLinkCards", "attachImages", "attachThreadAssets"]);
});

test("avatars group URLs, pass both caches, deduplicate paths and clear failed linked posts", async () => {
  const f = assetsFixture(), auth = {}, cache = new Map(), blobs = new Map();
  const posts = [{ authorAvatar: " url ", authorHandle: "a/b", authorDid: "did:one" }, { authorAvatar: "url" }, { authorAvatar: "other", authorHandle: "a/b" }, { authorAvatar: "fail", authorAvatarPath: "stale" }, null];
  await f.service.attachAvatars(posts, f.assets, f.paths, auth, cache, value => f.progress.push(value), 61, blobs);
  assert.equal(f.calls.length, 3); assert.equal(f.calls[0][0], auth); assert.equal(f.calls[0][3], cache); assert.equal(f.calls[0][4].cacheMap, blobs);
  assert.equal(posts[0].authorAvatarPath, "avatars/a-b.png"); assert.equal(posts[1].authorAvatarPath, posts[0].authorAvatarPath);
  assert.equal(posts[3].authorAvatarPath, ""); assert.equal(f.assets.length, 1); assert.equal(f.assets[0].sizeBytes, 2);
  assert.equal(f.progress.length, 1); assert.equal(f.progress[0].percent, 64); assert.equal(f.progress[0].step, "Avatare 3/3 vorbereitet");
});

test("avatars ignore invalid containers, cap slugs and retain existing paths without output duplication", async () => {
  const f = assetsFixture(); await f.service.attachAvatars(null, f.assets, f.paths); assert.equal(f.calls.length, 0);
  const posts = [{ authorAvatar: "url", authorHandle: "a".repeat(80) }, { authorAvatar: "other" }];
  f.paths.add("avatars/author.png"); await f.service.attachAvatars(posts, f.assets, f.paths);
  assert.equal(posts[0].authorAvatarPath, "avatars/" + "a".repeat(60) + ".png"); assert.equal(posts[1].authorAvatarPath, "avatars/author.png"); assert.equal(f.assets.length, 1);
});

test("avatar normalization failure clears paths while observer failures remain visible", async () => {
  const f = assetsFixture(), posts = [{ authorAvatar: "url", authorAvatarPath: "old" }], failure = Error("observer");
  await f.factory({ ...f.options, normalize: () => { throw failure; } }).attachAvatars(posts, f.assets, f.paths);
  assert.equal(posts[0].authorAvatarPath, "");
  await assert.rejects(f.service.attachAvatars(posts, f.assets, f.paths, null, null, () => { throw failure; }), error => error === failure);
});

/** Creates the image/link-card pipeline with real bounded mapping and controlled provider adapters.
 * @returns {object} Service, options, inputs, counters, request/progress traces and queued responses.
 */
function pipelineFixture() {
  const f = assetsFixture(), downloads = [], responses = [], delays = [], progress = [];
  const options = { ...f.options, blob: async (...args) => {
    downloads.push(args); const response = responses.shift(); if (response instanceof Error) { throw response; }
    if (response !== undefined) { return response; } return { type: "image/png", bytes: new Uint8Array([1, 2]) };
  }, cid: value => value.cid || "", images: record => record.images || [], wait: async () => "running",
    publicUrl: async (auth, did, cid) => "https://blob.test/" + did + "/" + cid, dataUrl: () => "data:image/png;base64,AQI=",
    delay: async ms => { delays.push(ms); } };
  const input = { orderedPosts: [], rawRecordsByUri: new Map(), assets: f.assets, seenAssetPaths: f.paths,
    auth: {}, sourceDid: "did:fallback", pdsServiceCache: new Map(), archiveBlobCache: new Map(), runId: "pipeline",
    notifyProgress: value => progress.push(value), buildHashtagProgressDetail: text => text + " + tags" };
  return { ...f, options, service: f.factory(options), input, downloads, responses, delays, progress, state: { imageCount: 0, skippedImageCount: 0 } };
}

/** Creates a post entity for mutable asset contracts.
 * @param {string} key - Record key. @returns {object} Minimal archive post with counts and source metadata.
 */
function assetPost(key = "one") {
  return { uri: uri(key), rkey: key, authorDid: "did:own", authorHandle: "a/b", createdAt: "2026-10-31", text: "literal", counts: { likeCount: 1, replyCount: 2, repostCount: 3, quoteCount: 4 }, images: [{ path: "stale" }] };
}

test("link-card success stores normalized bytes, clears failure flags and passes timeout/caches", async () => {
  const f = pipelineFixture(), p = assetPost(); p.externalCard = { thumbRef: { cid: "thumb" }, url: " https://card.test ", thumbLoadFailed: true };
  f.input.orderedPosts.push(p);
  const bytes = new Uint8Array([9, 8, 7]);
  await f.factory({ ...f.options, normalize: () => ({ type: "image/webp", bytes }), extension: () => "webp" }).attachLinkCards(f.input);
  assert.equal(p.externalCard.thumbPath, "link-cards/a-b-one.webp"); assert.equal(p.externalCard.thumbLoadFailed, false); assert.equal(p.externalCard.thumbLoadAttempts, 1);
  assert.equal(f.assets[0].bytes, bytes); assert.equal(f.assets[0].type, "image/webp"); assert.equal(f.assets[0].sizeBytes, 3);
  assert.equal(f.downloads[0][0], f.input.auth); assert.equal(f.downloads[0][3], f.input.pdsServiceCache);
  assert.equal(f.downloads[0][4].cacheMap, f.input.archiveBlobCache); assert.equal(f.downloads[0][4].timeoutMs, 5000);
  assert.match(f.progress.at(-1).detail, /\+ tags$/);
});

test("link cards retry once, preserve duplicate paths and mark exhausted downloads", async () => {
  const f = pipelineFixture(), p = assetPost(), q = assetPost("two");
  p.externalCard = { thumbRef: { cid: "thumb" } }; q.externalCard = { thumbRef: { cid: "bad" }, thumbPath: "stale" };
  f.input.orderedPosts.push(p, q); f.options.concurrency = 1;
  f.responses.push(Error("first"), { type: "image/png", bytes: new Uint8Array([1]) }, Error("bad"), Error("bad again"));
  f.paths.add("link-cards/a-b-one.png"); await f.factory(f.options).attachLinkCards(f.input);
  assert.deepEqual(f.delays, [350, 350]); assert.equal(f.downloads.length, 4); assert.equal(f.assets.length, 0);
  assert.equal(p.externalCard.thumbLoadAttempts, 2); assert.equal(q.externalCard.thumbLoadFailed, true); assert.equal(q.externalCard.thumbPath, "");
});

test("link cards handle empty/missing CIDs and propagate normalization or observer failures", async () => {
  const f = pipelineFixture(); await f.service.attachLinkCards(f.input); assert.equal(f.progress.length, 0);
  const p = assetPost(); p.externalCard = { thumbRef: {} }; f.input.orderedPosts.push(p);
  await f.service.attachLinkCards(f.input); assert.equal(f.downloads.length, 0); assert.equal(p.externalCard.thumbLoadFailed, undefined);
  p.externalCard.thumbRef.cid = "thumb"; const failure = Error("normalize");
  await assert.rejects(f.factory({ ...f.options, normalize: () => { throw failure; } }).attachLinkCards(f.input), error => error === failure);
  await assert.rejects(f.service.attachLinkCards({ ...f.input, notifyProgress: () => { throw failure; } }), error => error === failure);
  await assert.rejects(f.service.attachLinkCards(null), /Cannot/);
  await assert.rejects(f.factory({ ...f.options, blob: null }).attachLinkCards(f.input), /requires blob/);
});

test("images rebuild descriptors in order, preserve raw asset bytes and deduplicate paths", async () => {
  const f = pipelineFixture(), p = assetPost(); f.input.orderedPosts.push(p);
  f.input.rawRecordsByUri.set(p.uri, { images: [{ cid: "one", alt: "x".repeat(2100), aspectRatio: { width: "20", height: "bad" } }, { cid: "two" }] });
  const bytes = new Uint8Array([9]);
  const service = f.factory({ ...f.options, normalize: () => ({ type: "image/webp", bytes }) });
  f.paths.add("images/2026/a-b-one-2.webp");
  assert.equal(await service.attachImages(f.input, f.state), false);
  assert.equal(p.images.length, 2); assert.equal(p.images[0].alt.length, 2000); assert.equal(p.images[0].width, 20); assert.equal(p.images[0].height, 0);
  assert.equal(p.images[0].mimeType, "image/webp"); assert.equal(p.images[0].sizeBytes, 1); assert.equal(p.images[0].remoteUrl, "https://blob.test/did:own/one");
  // Preserve the existing image contract: descriptors use normalized bytes, output assets retain the downloaded bytes.
  assert.equal(f.assets[0].type, "image/png"); assert.deepEqual(Array.from(f.assets[0].bytes), [1, 2]); assert.equal(f.state.imageCount, 1);
});

test("image exhaustion skips once after retry, missing CID is ignored and stale descriptors are cleared", async () => {
  const f = pipelineFixture(), p = assetPost(); f.input.orderedPosts.push(p); f.input.rawRecordsByUri.set(p.uri, { images: [{ cid: "bad" }, {}] });
  f.responses.push(Error("first"), Error("last")); await f.service.attachImages(f.input, f.state);
  assert.deepEqual(f.delays, [350]); assert.equal(f.state.skippedImageCount, 1); assert.deepEqual(plain(p.images), []);
  assert.equal(f.progress[1].preview.meta, "Bild übersprungen (last)"); assert.equal(f.progress.at(-1).percent, 95);
});

test("images retain partial counts after observer failure and cancellation stops later tasks", async () => {
  const f = pipelineFixture(), p = assetPost(); f.input.orderedPosts.push(p); f.input.rawRecordsByUri.set(p.uri, { images: [{ cid: "one" }, { cid: "two" }] });
  let waits = 0;
  const service = f.factory({ ...f.options, concurrency: 1, wait: async () => { waits++; if (waits === 2) { return "cancelled"; } return "running"; } });
  assert.equal(await service.attachImages(f.input, f.state), true); assert.equal(f.state.imageCount, 1); assert.equal(p.images.length, 1); assert.equal(f.downloads.length, 1);
  f.state.imageCount = 9; const failure = Error("preview");
  await assert.rejects(f.service.attachImages({ ...f.input, seenAssetPaths: new Set(), notifyProgress: value => { if (value.preview) { throw failure; } } }, f.state), error => error === failure);
  assert.ok(f.state.imageCount >= 10); assert.ok(f.assets.length >= 2);
});

test("image empty/boundary paths, PNG priority, fallback DID and operation dependencies are explicit", async () => {
  const f = pipelineFixture(); assert.equal(await f.service.attachImages(f.input, f.state), false);
  const p = assetPost(); p.authorDid = ""; p.createdAt = ""; p.rkey = "";
  f.input.orderedPosts.push(p); f.input.rawRecordsByUri.set(p.uri, { images: [{ cid: "one" }] });
  await f.factory({ ...f.options, normalize: blob => ({ ...blob, type: "image/png+webp" }) }).attachImages(f.input, f.state);
  assert.equal(p.images[0].path, "images/unkn/a-b-post-1-1.png"); assert.equal(p.images[0].sourceDid, "did:fallback");
  for (const name of ["images", "blob", "cid", "wait", "publicUrl", "dataUrl", "delay"]) {
    await assert.rejects(f.factory({ ...f.options, [name]: null }).attachImages(f.input, f.state), /requires/);
  }
  await assert.rejects(f.service.attachImages(null, null), /Cannot/);
});

test("wave finalization finishes before result and leaves normal post ordering untouched", () => {
  const f = fixture(), events = [], result = {};
  const input = { runId: "done", status: "completed", finish: id => events.push(id), buildResult: status => { events.push(status); return result; } };
  assert.equal(f.service.finalize(input), result); assert.deepEqual(events, ["done", "completed"]);
  assert.throws(() => f.service.finalize(null), /Cannot/);
});

test("wave failures sort partial posts, retain references and classify cancellation or fallback errors", () => {
  for (const [error, status, message] of [[Error("offline"), "paused", "offline"], [undefined, "paused", "Der Archivlauf wurde pausiert."], [{ details: { code: "ARCHIVE_CANCELLED" }, message: "cancel" }, "cancelled", "cancel"]]) {
    const f = fixture(), events = [], old = { createdAt: "2020-01-01" }, recent = { createdAt: "2026-01-01" }; let posts;
    const result = f.service.finalize({ runId: "run", error, postsByUri: new Map([["old", old], ["new", recent]]), setOrderedPosts: value => { posts = value; events.push("posts"); },
      finish: () => events.push("finish"), buildResult: (status, settings) => ({ status, settings }) });
    assert.equal(posts[0], recent); assert.equal(posts[1], old); assert.deepEqual(events, ["posts", "finish"]);
    assert.deepEqual(plain(result), { status, settings: { errorMessage: message } });
  }
});

test("wave finalization does not swallow lifecycle or result-builder failures", () => {
  const f = fixture(), failure = Error("finalize");
  assert.throws(() => f.service.finalize({ finish: () => { throw failure; }, buildResult: () => {} }), error => error === failure);
  assert.throws(() => f.service.finalize({ finish: () => {}, buildResult: () => { throw failure; } }), error => error === failure);
});
