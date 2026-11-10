"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");
const fixedDate = new Date("2026-10-18T12:00:00Z");

/** Creates a real stored-ZIP codec with a deterministic clock. @returns {Promise<object>} ZIP codec. */
async function zipFixture() {
  const { createStoredZipCodec } = await importProjectModule("js/shared/shared-zip.js");
  return createStoredZipCodec({ encode: text => new TextEncoder().encode(text), now: () => fixedDate,
    invalidArchive: () => "invalid ZIP", closedWriter: () => "closed ZIP" });
}

/** Creates catalog adapters and observes actual ZIP entries and delivery. @returns {Promise<object>} Configured service and observations. */
async function catalogFixture() {
  const module = await importProjectModule("js/tools/archive-catalog.js");
  const { buildArchiveThreadDepthMap } = await importProjectModule("js/tools/archive-html-models.js");
  const zip = await zipFixture();
  const events = [];
  const dependencies = { t: key => key, depths: buildArchiveThreadDepthMap, parseZip: zip.parse,
    parseJson: bytes => JSON.parse(new TextDecoder().decode(bytes)), gunzip: async file => file.decoded,
    encode: text => new TextEncoder().encode(text), zip: zip.build, baseName: () => "archive",
    file: (bytes, name) => ({ bytes, name }), deliver: async (...args) => events.push(["deliver", ...args]),
    progress: value => events.push(["progress", value]) };
  return { module, dependencies, zip, events, service: module.createArchiveCatalogService(dependencies) };
}

test("archive catalog normalization preserves order, unknown fields, byte views and source records", async () => {
  const { service } = await catalogFixture();
  const bytes = new Uint8Array([9, 1, 2]).subarray(1);
  const source = { manifest: { skippedImageCount: "3" }, posts: [
    { uri: "reply", createdAt: "2026-10-18", thread: { parentUri: "root" }, counts: { likeCount: "2" }, custom: 42 },
    { uri: "root", createdAt: "2026-10-17" }], assets: [{ path: "image", bytes, sizeBytes: -1 }] };
  const result = service.normalize(source);
  assert.deepEqual(result.posts.map(post => post.uri), ["reply", "root"]);
  assert.equal(result.posts[0].threadDepth, 1);
  assert.equal(result.posts[0].custom, 42);
  assert.equal(result.posts[0].counts.likeCount, 2);
  assert.equal(result.posts[0].counts.replyCount, 0);
  assert.equal(result.assets[0].bytes, bytes);
  assert.equal(result.assets[0].sizeBytes, 0);
  assert.equal(source.posts[0].threadDepth, undefined);
  assert.deepEqual(result.summary, { imageCount: 1, skippedImageCount: 3, from: "2026-10-17", to: "2026-10-18" });
});

test("archive catalog normalization handles empty records and reuses cycle-safe thread depths", async () => {
  const { service } = await catalogFixture();
  assert.deepEqual(service.normalize({ posts: [] }), { manifest: {}, posts: [], assets: [], summary: { imageCount: 0, skippedImageCount: 0, from: "", to: "" } });
  const result = service.normalize({ posts: [{ uri: "a", thread: { parentUri: "b" } }, { uri: "b", thread: { parentUri: "a" } }],
    assets: [{ bytes: [1, 2] }, {}] });
  assert.ok(result.posts.every(post => Number.isFinite(post.threadDepth) && post.threadDepth <= 8));
  assert.deepEqual([...result.assets[0].bytes], [1, 2]);
  assert.equal(result.assets[1].bytes.length, 0);
  for (const invalid of [null, {}, { posts: {} }]) assert.throws(() => service.normalize(invalid), /archiveImportInvalid/);
});

test("archive ZIP export strips raw records and retains the established manifest/posts/asset format", async () => {
  const { service, zip, events } = await catalogFixture();
  const catalog = service.normalize({ manifest: { account: { handle: "fixture.test" } }, posts: [{ uri: "post", rawRecord: { private: true }, images: [{ path: "image", remoteUrl: "https://example.com", alt: "ALT" }] }], assets: [{ path: "image", bytes: [1, 2] }] });
  await service.export(catalog);
  const delivery = events.find(event => event[0] === "deliver");
  const entries = zip.parse(delivery[1].bytes);
  assert.deepEqual([...entries.keys()], ["manifest.json", "posts.json", "image"]);
  const posts = JSON.parse(new TextDecoder().decode(entries.get("posts.json")));
  assert.equal(posts[0].rawRecord, undefined);
  assert.equal(posts[0].images[0].remoteUrl, undefined);
  assert.equal(posts[0].images[0].mimeType, "application/octet-stream");
  assert.deepEqual([...entries.get("image")], [1, 2]);
  assert.equal(delivery[2], "archive.zip");
  assert.deepEqual(delivery[3], { preferDownload: true });
  assert.equal(events.at(-1)[1].percent, 100);
  assert.equal(catalog.posts[0].rawRecord.private, true);
});

test("archive imports support ZIP image deduplication, optional manifest, JSON and gzip JSON", async () => {
  const { service, dependencies, zip } = await catalogFixture();
  const posts = [{ uri: "a", images: [{ path: "image", mimeType: "image/png" }, { path: "missing" }] }, { uri: "b", images: [{ path: "image" }] }];
  const bytes = zip.build([{ name: "posts.json", data: dependencies.encode(JSON.stringify(posts)) }, { name: "image", data: new Uint8Array([4]) }]);
  const result = await service.load({ name: "archive.ZIP", arrayBuffer: async () => bytes.buffer });
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].sizeBytes, 1);
  assert.equal(result.assets[0].type, "image/png");
  assert.deepEqual(result.manifest, {});
  const json = JSON.stringify({ posts });
  assert.equal((await service.load({ name: "archive.json", text: async () => json })).posts.length, 2);
  assert.equal((await service.load({ name: "archive.json.GZ", decoded: json })).posts.length, 2);
});

test("archive catalog validation and delivery failures never report a completed export", async () => {
  const { module, dependencies, service, zip, events } = await catalogFixture();
  assert.throws(() => module.createArchiveCatalogService(), TypeError);
  for (const key of Object.keys(dependencies)) assert.throws(() => module.createArchiveCatalogService({ ...dependencies, [key]: null }), TypeError, key);
  for (const entries of [[], [{ name: "posts.json", data: dependencies.encode("null") }], [{ name: "posts.json", data: dependencies.encode("{}") }]]) {
    const bytes = zip.build(entries);
    await assert.rejects(() => service.load({ name: "archive.zip", arrayBuffer: async () => bytes.buffer }), /archiveImportInvalid/);
  }
  await assert.rejects(() => service.load({ name: "bad.json", text: async () => "{" }), SyntaxError);
  await assert.rejects(() => service.export(null), /archiveNeedArchive/);
  dependencies.deliver = async () => { throw new Error("delivery failed"); };
  await assert.rejects(() => module.createArchiveCatalogService(dependencies).export({ manifest: {}, posts: [], assets: [] }), /delivery failed/);
  assert.equal(events.some(event => event[1]?.percent === 100), false);
});

/** Creates deterministic media session data helpers. @returns {Promise<object>} Models, module and dependency configuration. */
async function modelFixture() {
  const module = await importProjectModule("js/tools/archive-media-models.js");
  const dependencies = { filters: () => ({ scope: "all" }), serialize: JSON.stringify, account: () => "Fallback.Test", now: () => fixedDate };
  return { module, dependencies, models: module.createArchiveMediaModels(dependencies) };
}

test("media session keys distinguish actor, filters and selected kinds", async () => {
  const { module, dependencies, models } = await modelFixture();
  assert.equal(module.MEDIA_EXPORT_BATCH_SIZE, 250);
  assert.equal(models.key({ actor: " USER.Test ", includeVideos: false }), 'media:user.test:101:{"scope":"all"}');
  assert.equal(models.key(), 'media:fallback.test:111:{"scope":"all"}');
  assert.notEqual(models.key({ filters: { scope: "year" } }), models.key());
  assert.throws(() => module.createArchiveMediaModels(), TypeError);
  for (const key of Object.keys(dependencies)) assert.throws(() => module.createArchiveMediaModels({ ...dependencies, [key]: null }), TypeError);
  assert.throws(() => models.key(null), TypeError);
});

test("media model batches, stable folders and post selection preserve ordering and deduplicate posts", async () => {
  const { models } = await modelFixture();
  assert.deepEqual(models.chunk(null), []);
  assert.deepEqual(models.chunk([1, 2, 3], 2), [[1, 2], [3]]);
  assert.deepEqual(models.chunk([1, 2], -1), [[1], [2]]);
  assert.equal(models.folder({ createdAt: "2026-10-18T12:00:00Z", rkey: "a/b" }), "posts/2026/2026-10/2026-10-18T12-00-00Z__post-a-b");
  assert.equal(models.folder({ createdAt: "invalid" }), "posts/unkn/unknown/unknown-date__post-post");
  assert.equal(models.folder(null), models.folder({}));
  const post = { uri: "a" };
  const lookup = models.postsByUri([post]);
  assert.deepEqual(models.batchPosts([{ postUri: "a" }, { postUri: "a" }, { postUri: "missing" }], lookup), [post]);
  assert.deepEqual(models.batchPosts(null, lookup), []);
  assert.equal(models.postsByUri(null).size, 0);
});

test("media sessions resume only matching incomplete scans and retain fixed part metadata", async () => {
  const { models } = await modelFixture();
  const options = { includeImages: true };
  const session = models.session(options, { posts: [{ uri: "post" }], media: Array.from({ length: 251 }, (_, index) => ({ id: index })) });
  assert.deepEqual(session.batches.map(batch => batch.itemCount), [250, 1]);
  assert.equal(session.updatedAt, fixedDate.toISOString());
  assert.equal(models.canResume(session, options), true);
  for (const patch of [{ status: "completed" }, { sessionKey: "other" }, { media: [] }, { batches: [] }, { nextBatchIndex: 2 }]) {
    assert.equal(models.canResume({ ...session, ...patch }, options), false);
  }
  assert.equal(models.canResume(null, options), false);
  assert.equal(models.canResume(models.session({}, null), {}), false);
});

/** Creates controlled worker/storage/picker adapters with a real streaming ZIP writer. @param {number} count - Number of media entries. @returns {Promise<object>} Controller, mutable hooks and observed ZIP parts. */
async function mediaFixture(count = 2) {
  const { models } = await modelFixture();
  const module = await importProjectModule("js/tools/archive-media-export.js");
  const zip = await zipFixture();
  const media = Array.from({ length: count }, (_, index) => ({ id: String(index), kind: "image", postUri: "post", pathStem: `images/${index}.png`, createdAt: fixedDate.toISOString() }));
  const scanned = { manifest: { actor: "user.test" }, posts: [{ uri: "post", rkey: "post", createdAt: fixedDate.toISOString() }], media };
  let session = null;
  const calls = []; const parts = []; const saved = []; const progress = []; const notices = [];
  const abort = new AbortController();
  const hooks = {};
  const dependencies = { ...models, t: (key, values) => key + JSON.stringify(values || {}), supported: () => true,
    options: () => ({ includeImages: true, includeVideos: false, includeOther: false }), account: () => "user.test", signal: () => abort.signal,
    batchSize: 250, now: () => fixedDate, encode: text => new TextEncoder().encode(text),
    baseName: () => "media", partName: (name, index, total) => `${name}-${index + 1}-of-${total}.zip`,
    progress: value => progress.push(value), notice: value => notices.push(value), status: value => calls.push(["status", value]), warn: (...args) => calls.push(["warn", ...args]),
    request: async (type, payload, options) => {
      calls.push([type, payload, options]);
      if (hooks.request) await hooks.request(type, payload, options);
      if (type === "GET_MEDIA_EXPORT_SESSION") return structuredClone(session);
      if (type === "SAVE_MEDIA_EXPORT_SESSION") { session = structuredClone(payload.session); saved.push(session); return; }
      if (type === "CLEAR_MEDIA_EXPORT_SESSION") { session = null; return; }
      if (type === "SCAN_ACCOUNT_MEDIA_EXPORT") { options.onProgress({ percent: 4, detail: "scanning" }); return scanned; }
      if (type === "DOWNLOAD_ACCOUNT_MEDIA_ASSET") {
        options.onProgress({ step: "downloading" });
        return { ...payload.item, path: payload.item.pathStem, bytes: new Uint8Array([Number(payload.item.id)]), type: "image/png", sizeBytes: 1 };
      }
      throw new Error(type);
    },
    pick: async options => {
      if (hooks.pick) await hooks.pick(options);
      const chunks = [];
      const part = { name: options.suggestedName, closed: false, aborted: false, chunks };
      parts.push(part);
      const writable = { write: async bytes => { chunks.push(new Uint8Array(bytes)); }, close: async () => { if (hooks.close) await hooks.close(); part.closed = true; }, abort: async () => { part.aborted = true; } };
      return { createWritable: async () => writable };
    },
    writer: writable => zip.createWriter(writable),
  };
  return { module, dependencies, controller: module.createArchiveMediaExportController(dependencies), hooks, calls, parts, saved, progress, notices, scanned, abort,
    session: () => session, setSession: value => { session = value; },
    entries: part => { const length = part.chunks.reduce((sum, chunk) => sum + chunk.length, 0); const bytes = new Uint8Array(length); let offset = 0; for (const chunk of part.chunks) { bytes.set(chunk, offset); offset += chunk.length; } return zip.parse(bytes); } };
}

test("media export streams real ZIP entries, post metadata and manifest before committing completion", async () => {
  const fixture = await mediaFixture();
  await fixture.controller.export();
  assert.equal(fixture.parts[0].closed, true);
  assert.equal(fixture.parts[0].aborted, false);
  const entries = fixture.entries(fixture.parts[0]);
  assert.ok(entries.has("images/0.png"));
  assert.ok(entries.has("images/1.png"));
  assert.equal([...entries.keys()].filter(name => name.endsWith("/post.json")).length, 1);
  const manifest = JSON.parse(new TextDecoder().decode(entries.get("_meta/manifest.json")));
  assert.equal(manifest.mediaCount, 2); assert.equal(manifest.skippedMediaCount, 0);
  assert.equal(fixture.saved.at(-1).status, "completed");
  assert.equal(fixture.session(), null);
  assert.equal(fixture.progress.at(-1).percent, 100);
  assert.equal(fixture.calls.find(call => call[0] === "SCAN_ACCOUNT_MEDIA_EXPORT")[2].timeoutMs, 900000);
  assert.equal(fixture.calls.find(call => call[0] === "DOWNLOAD_ACCOUNT_MEDIA_ASSET")[2].timeoutMs, 45000);
});

test("media picker cancellation persists the next part and resumes without rescanning or repeating completed parts", async () => {
  const fixture = await mediaFixture(251);
  let picks = 0;
  fixture.hooks.pick = async () => { picks += 1; if (picks === 2) { const error = new Error("cancel"); error.name = "AbortError"; throw error; } };
  await fixture.controller.export();
  assert.equal(fixture.session().nextBatchIndex, 1);
  assert.equal(fixture.session().exportedMediaCount, 250);
  assert.equal(fixture.progress.at(-1).percent, 50);
  assert.equal(fixture.parts.length, 1);
  delete fixture.hooks.pick;
  await fixture.controller.export();
  assert.equal(fixture.parts.length, 2);
  assert.equal(fixture.parts[1].name, "media-2-of-2.zip");
  assert.equal(fixture.calls.filter(call => call[0] === "SCAN_ACCOUNT_MEDIA_EXPORT").length, 1);
  assert.equal(fixture.calls.filter(call => call[0] === "DOWNLOAD_ACCOUNT_MEDIA_ASSET").length, 251);
  assert.equal(fixture.saved.at(-1).exportedMediaCount, 251);
});

test("media item failures are recorded and export continues with a skipped-media index", async () => {
  const fixture = await mediaFixture();
  fixture.hooks.request = async (type, payload) => { if (type === "DOWNLOAD_ACCOUNT_MEDIA_ASSET" && payload.item.id === "0") throw new Error("offline"); };
  await fixture.controller.export();
  const entries = fixture.entries(fixture.parts[0]);
  assert.equal(entries.has("images/0.png"), false);
  assert.equal(entries.has("images/1.png"), true);
  const skipped = JSON.parse(new TextDecoder().decode(entries.get("_meta/skipped-media.json")));
  assert.equal(skipped[0].reason, "offline");
  assert.equal(fixture.saved.at(-1).skippedMediaCount, 1);
  assert.equal(fixture.saved.at(-1).exportedMediaCount, 1);
});

test("media cancellation during a download aborts the sink and retains the current part", async () => {
  const fixture = await mediaFixture();
  fixture.hooks.request = async type => { if (type === "DOWNLOAD_ACCOUNT_MEDIA_ASSET") fixture.abort.abort(); };
  await assert.rejects(() => fixture.controller.export(), { name: "AbortError" });
  assert.equal(fixture.parts[0].aborted, true);
  assert.equal(fixture.parts[0].closed, false);
  assert.equal(fixture.session().nextBatchIndex, 0);
  assert.equal(fixture.session().status, "paused");
  assert.equal(fixture.progress.some(value => value.percent === 100), false);
});

test("media close failure aborts the sink and prevents checkpoint advancement", async () => {
  const fixture = await mediaFixture();
  fixture.hooks.close = async () => { throw new Error("disk full"); };
  await assert.rejects(() => fixture.controller.export(), /disk full/);
  assert.equal(fixture.parts[0].aborted, true);
  assert.equal(fixture.session().nextBatchIndex, 0);
  assert.equal(fixture.session().exportedMediaCount, 0);
});

test("media guards reject unsupported, logged-out, empty and already cancelled exports", async () => {
  const fixture = await mediaFixture();
  for (const [key, value, message] of [["account", () => "", "archiveMediaRequiresLogin"], ["supported", () => false, "archiveMediaStreamUnsupported"], ["options", () => ({}), "archiveMediaNeedKind"]]) {
    const controller = fixture.module.createArchiveMediaExportController({ ...fixture.dependencies, [key]: value });
    await assert.rejects(() => controller.export(), new RegExp(message));
  }
  fixture.abort.abort();
  await assert.rejects(() => fixture.controller.export(), { name: "AbortError" });
  assert.equal(fixture.calls.length, 0);
  const empty = await mediaFixture(0);
  await assert.rejects(() => empty.controller.export(), /archiveMediaNoMatches/);
  assert.equal(empty.session(), null);
  assert.equal(empty.parts.length, 0);
});

test("media invalid adapters and picker errors remain explicit and never report completion", async () => {
  const fixture = await mediaFixture();
  assert.throws(() => fixture.module.createArchiveMediaExportController(), TypeError);
  for (const key of Object.keys(fixture.dependencies)) {
    if (key === "key" || key === "chunk") {
      continue;
    }
    assert.throws(() => fixture.module.createArchiveMediaExportController({ ...fixture.dependencies, [key]: null }), TypeError, key);
  }
  fixture.hooks.pick = async () => { throw new Error("permission"); };
  await assert.rejects(() => fixture.controller.export(), /archiveMediaFilePickerFailed/);
  assert.equal(fixture.parts.length, 0);
  assert.equal(fixture.progress.some(value => value.percent === 100), false);
});

test("archive catalog and media implementations are removed from the entry and cached once", () => {
  const source = fs.readFileSync("app.js", "utf8");
  const cache = fs.readFileSync("sw.js", "utf8");
  for (const area of ["catalog", "media-models", "media-export"]) {
    const path = `./js/tools/archive-${area}.js`;
    assert.equal(source.split(path).length - 1, 1);
    assert.equal(cache.split(path).length - 1, 1);
  }
  assert.doesNotMatch(source, /function (?:createMediaExportSession|buildMediaExportSessionKey|chunkMediaExportEntries|canResumeMediaExportSession|collectMediaExportBatchPosts)\(/);
});
