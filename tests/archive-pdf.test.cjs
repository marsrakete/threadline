"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates deterministic measurement adapters. @returns {Promise<object>} Layout module, adapters and configured API. */
async function layoutFixture() {
  const module = await importProjectModule("js/tools/archive-pdf-layout.js");
  const models = await importProjectModule("js/tools/archive-html-models.js");
  const context = { measureText: (text) => ({ width: text.length * 6 }) };
  const dependencies = { t: (key) => key, maxImages: 10, externalCard: (post) => post.externalCard || null,
    shortenUrl: (url) => url, wrap: (ctx, text) => String(text).split("\n"), groups: models.buildArchiveThreadGroups,
    canvas: () => ({ getContext: () => context }) };
  return { module, dependencies, context, layout: module.createArchivePdfLayout(dependencies) };
}

test("archive PDF layout requires explicit adapters and a positive image limit", async () => {
  const { module, dependencies } = await layoutFixture();
  assert.throws(() => module.createArchivePdfLayout(), TypeError);
  for (const key of Object.keys(dependencies)) {
    assert.throws(() => module.createArchivePdfLayout({ ...dependencies, [key]: null }), TypeError, key);
  }
});

test("archive PDF image layouts preserve image limits, aspect ratios, captions and presets", async () => {
  const { layout } = await layoutFixture();
  assert.deepEqual(layout.images({}, 400, {}, 1), { frames: [], totalHeight: 0 });
  for (const [imageSize, expected] of [["small", 150], ["medium", 190], ["large", 250]]) {
    const result = layout.images({ images: [{ width: 1, height: 2, alt: "caption" }] }, 400, { imageSize }, 1);
    assert.equal(result.frames[0].height, expected);
    assert.equal(result.totalHeight, expected + 24);
  }
  const result = layout.images({ images: Array.from({ length: 12 }, () => ({ alt: "caption" })) }, 400, {}, 2);
  assert.equal(result.frames.length, 10);
  assert.equal(result.frames[0].y, 0);
  assert.ok(result.frames[2].y > result.frames[0].height);
  assert.equal(result.frames[1].x, 209);
  assert.throws(() => layout.images(null, 400, {}, 1), TypeError);
});

test("archive PDF card layout measures previews, failures, edits, metrics and indentation", async () => {
  const { layout, context } = await layoutFixture();
  assert.equal(layout.externalCard(context, {}, 400, 1), null);
  const preview = layout.externalCard(context, { externalCard: { url: "https://example.com", title: "Title", description: "Description", thumbLoadFailed: true } }, 400, 1);
  assert.equal(preview.thumbFailed, true);
  assert.equal(preview.hasThumb, false);
  assert.equal(preview.failedLines.length, 1);
  assert.ok(preview.height > 0);
  const post = { text: "Text", threadDepth: 20 };
  assert.deepEqual(layout.frame(20, 400, post, { indentThreads: true }, 1), { depth: 4, indent: 72, x: 92, width: 328 });
  assert.equal(layout.frame(20, 400, post, {}, 1).depth, 0);
  const plain = layout.height(context, post, {}, 1, 400);
  assert.equal(layout.height(context, { ...post, editInfo: { isEdited: true } }, { includeMetrics: true }, 1, 400), plain + 48);
  assert.equal(layout.groupKey({ uri: "reply", thread: { rootUri: "root" } }), "root");
  assert.equal(layout.groupKey(null), "");
});

test("archive PDF pagination preserves order and retains an oversized post on its own page", async () => {
  const { layout } = await layoutFixture();
  assert.deepEqual(layout.paginate([], {}), []);
  const oversized = { text: Array(100).fill("line").join("\n") };
  const small = { text: "small" };
  assert.deepEqual(layout.paginate([small, oversized, small], {}), [[small], [oversized], [small]]);
  const posts = Array.from({ length: 13 }, (_, index) => ({ uri: String(index), text: "short" }));
  assert.deepEqual(layout.paginate(posts, {}).flat(), posts);
  assert.ok(layout.paginate(posts, {}).length > 1);
  assert.throws(() => layout.paginate(null, {}), TypeError);
});

test("archive PDF bands clamp limits and keep entire threads when configured", async () => {
  const { layout } = await layoutFixture();
  const posts = Array.from({ length: 205 }, (_, index) => ({ uri: String(index), createdAt: new Date(1700000000000 + index * 1000).toISOString() }));
  assert.deepEqual(layout.bands([], {}), []);
  assert.deepEqual(layout.bands(posts, { bandSize: 1 }).map(band => band.length), [100, 100, 5]);
  assert.deepEqual(layout.bands(posts, { bandSize: 9999 }).map(band => band.length), [205]);
  const thread = posts.map(post => ({ ...post, thread: { rootUri: "0" } }));
  assert.deepEqual(layout.bands(thread, { bandSize: 100, keepThreadsTogether: true }).map(band => band.length), [205]);
  assert.deepEqual(layout.bands(thread, { bandSize: 100 }).map(band => band.length), [100, 100, 5]);
  assert.throws(() => layout.bands(null, {}), TypeError);
});

/** Creates an export controller with observed delivery, rendering and progress. @returns {Promise<object>} Controller and observations. */
async function exportFixture() {
  const module = await importProjectModule("js/tools/archive-pdf-export.js");
  const events = [];
  const documents = [];
  const dependencies = { t: (key, values) => ({ key, ...values }), paginate: posts => posts.map(post => [post]),
    page: async (...args) => { events.push(["page", args]); return { width: 1190, height: 1684, bytes: new Uint8Array([1]), annotations: [{ url: "https://example.com" }] }; },
    pdf: (pages, metadata) => { documents.push({ pages, metadata }); return new Blob(["pdf"]); },
    frame: async () => events.push(["frame"]), progress: value => events.push(["progress", value]),
    ensureAvatars: async (catalog, settings) => { assert.deepEqual(settings, { downloadMissing: false }); events.push(["avatars"]); }, options: () => ({}), groups: posts => [{ posts }],
    bands: posts => posts.map(post => [post]), baseName: () => "archive", account: () => "fallback.test",
    file: (blob, name) => ({ blob, name }), deliver: async (...args) => events.push(["deliver", ...args]) };
  return { module, dependencies, events, documents, controller: module.createArchivePdfExportController(dependencies) };
}

test("archive PDF export renders linked A4 pages and delivers sequentially numbered volumes", async () => {
  const { controller, events, documents } = await exportFixture();
  await controller.export({ account: { handle: "archive.test" }, posts: [{ uri: "first" }, { uri: "second" }] });
  const deliveries = events.filter(event => event[0] === "deliver");
  assert.deepEqual(deliveries.map(event => event[2]), ["archive-band-001.pdf", "archive-band-002.pdf"]);
  assert.deepEqual(deliveries[0][3], { preferDownload: true });
  assert.equal(documents[0].metadata.title, "archive.test");
  assert.equal(documents[0].pages[0].content, "q 595 0 0 842 0 0 cm /PageImage1 Do Q");
  assert.equal(documents[0].pages[0].annotations[0].url, "https://example.com");
  assert.equal(events.at(-1)[1].percent, 100);
  assert.ok(events.findIndex(event => event[0] === "avatars") < events.findIndex(event => event[0] === "page"));
});

test("archive PDF band API reports pages and handles empty catalogs without delivering a file", async () => {
  const { controller, documents, events } = await exportFixture();
  const progress = [];
  await controller.band({}, [{}, {}], 0, 1, {}, value => progress.push(value));
  assert.deepEqual(progress, [{ pageIndex: 0, pageCount: 2 }, { pageIndex: 1, pageCount: 2 }]);
  assert.equal(documents[0].metadata.title, "fallback.test");
  assert.equal(documents[0].pages[1].images[0].name, "PageImage2");
  await controller.export({ posts: [] });
  assert.equal(events.filter(event => event[0] === "deliver").length, 0);
  assert.equal(events.at(-1)[1].detail.count, 0);
  await assert.rejects(() => controller.export(null));
});

test("archive PDF failures propagate without reporting success or delivering later volumes", async () => {
  for (const adapter of ["ensureAvatars", "page", "pdf", "deliver"]) {
    const { module, dependencies, events } = await exportFixture();
    dependencies[adapter] = () => { throw new Error(adapter); };
    const controller = module.createArchivePdfExportController(dependencies);
    await assert.rejects(() => controller.export({ posts: [{}, {}] }), new RegExp(adapter));
    assert.equal(events.some(event => event[0] === "progress" && event[1].percent === 100), false);
  }
  const { module, dependencies } = await exportFixture();
  assert.throws(() => module.createArchivePdfExportController(), TypeError);
  for (const key of Object.keys(dependencies)) assert.throws(() => module.createArchivePdfExportController({ ...dependencies, [key]: null }), TypeError, key);
});

test("archive PDF renderer validates dependencies and delegates Canvas behavior to explicit adapters", async () => {
  const module = await importProjectModule("js/tools/archive-pdf-rendering.js");
  assert.throws(() => module.createArchivePdfRenderer(), TypeError);
  const names = ["images", "externalCard", "height", "groupKey", "frame", "fill", "stroke", "circle", "image", "bitmap", "metrics", "wrap", "text", "rectangle", "timestamp", "t", "canvas", "account"];
  const dependencies = Object.fromEntries(names.map(name => [name, () => {}]));
  for (const name of names) assert.throws(() => module.createArchivePdfRenderer({ ...dependencies, [name]: null }), TypeError, name);
  const renderer = module.createArchivePdfRenderer(dependencies);
  assert.deepEqual(Object.keys(renderer), ["profilePages", "post", "page"]);
  assert.deepEqual(await renderer.profilePages({}), []);
  assert.deepEqual(await renderer.profilePages(null), []);
});

test("archive PDF module imports, cache entries and removed implementations remain consistent", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const worker = fs.readFileSync("sw.js", "utf8");
  for (const area of ["layout", "rendering", "export"]) {
    assert.ok(app.includes(`./js/tools/archive-pdf-${area}.js`));
    assert.ok(worker.includes(`./js/tools/archive-pdf-${area}.js`));
  }
  assert.doesNotMatch(app, /function (?:getArchivePdfImageFrames|drawArchivePdfPostCard|renderArchivePdfCanvasPage|paginateArchivePdfPosts|splitArchiveIntoBands|buildArchivePdfBand)\(/);
});
