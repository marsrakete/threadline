"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates isolated document models. @returns {Promise<object>} Module and configured models. */
async function modelFixture() {
  const module = await importProjectModule("js/tools/archive-html-models.js");
  const options = { t: (key, data) => key + JSON.stringify(data || {}), locale: () => "en",
    extractHashtags: (text) => [{ value: text, normalized: String(text).toLowerCase() }],
    linkRuns: (text, facets) => facets, account: () => "fallback.test", now: () => new Date("2026-10-18T12:00:00Z"),
    locales: ["en", "de"], translations: { en: {}, de: { archiveHtmlTitle: "fallback title" } }, defaultLocale: "de",
    normalizeStandardSite: () => null, publicationFooter: () => "publication" };
  return { module, options, models: module.createArchiveHtmlModels(options) };
}

test("HTML thread models preserve chronology, parent order, group dates and input records", async () => {
  const { module } = await modelFixture();
  const root = { uri: "root", text: "root", createdAt: "2026-10-02", thread: { rootUri: "root" }, images: [{}] };
  const reply = { uri: "reply", createdAt: "2026-10-01", thread: { rootUri: "root", parentUri: "root" } };
  const single = { uri: "single", createdAt: "2026-10-03" };
  const input = [single, reply, root];
  const groups = module.buildArchiveThreadGroups(input);
  assert.deepEqual(groups.map((group) => group.posts.map((post) => post.uri)), [["root", "reply"], ["single"]]);
  assert.equal(groups[0].isThread, true);
  assert.equal(groups[0].imageCount, 1);
  assert.equal(groups[0].minCreated, Date.parse(reply.createdAt));
  assert.equal(groups[0].maxCreated, Date.parse(root.createdAt));
  assert.deepEqual(input, [single, reply, root]);
  assert.deepEqual(module.buildArchiveThreadGroups([]), []);
  assert.throws(() => module.buildArchiveThreadGroups(null), TypeError);
});

test("HTML thread depths cap long chains and terminate on cyclic or orphan parents", async () => {
  const { module } = await modelFixture();
  const posts = [{ uri: "0" }];
  for (let index = 1; index < 12; index += 1) {
    posts.push({ uri: String(index), thread: { parentUri: String(index - 1) } });
  }
  const depths = module.buildArchiveThreadDepthMap(posts);
  assert.equal(depths.get("0"), 0);
  assert.equal(depths.get("11"), 8);
  const cyclic = [{ uri: "a", thread: { parentUri: "b", rootUri: "a" } }, { uri: "b", thread: { parentUri: "a", rootUri: "a" } }];
  assert.equal(module.buildArchiveThreadGroups(cyclic)[0].posts.length, 2);
  assert.ok([...module.buildArchiveThreadDepthMap(cyclic).values()].every((depth) => depth >= 0 && depth <= 8));
  assert.equal(module.buildArchiveThreadDepthMap([{ uri: "orphan", thread: { parentUri: "missing" } }]).get("orphan"), 0);
  assert.deepEqual(module.buildArchiveThreadDepthMap([]), new Map());
  assert.throws(() => module.buildArchiveThreadDepthMap(null), TypeError);
});

test("HTML metadata helpers retain UTC dates, URL display limits and the exact embedding boundary", async () => {
  const { module: m } = await modelFixture();
  assert.equal(m.formatArchiveHtmlDateInputValue("2026-10-18T23:00:00-02:00"), "2026-10-19");
  assert.equal(m.formatArchiveHtmlDateInputValue("bad"), "");
  assert.equal(m.formatArchiveHtmlDateInputValue(null), "");
  assert.equal(m.shortenArchiveUrlForDisplay("https://example.test/"), "example.test");
  assert.equal(m.shortenArchiveUrlForDisplay("https://example.test/" + "a".repeat(100)).length, 72);
  assert.equal(m.shortenArchiveUrlForDisplay("invalid"), "invalid");
  assert.equal(m.shortenArchiveUrlForDisplay(null), "");
  const limit = m.ARCHIVE_HTML_EMBED_RECOMMENDED_MAX_BYTES;
  assert.equal(m.shouldAutoFallbackArchiveHtmlToCompact([{ sizeBytes: limit }]), false);
  assert.equal(m.shouldAutoFallbackArchiveHtmlToCompact([{ sizeBytes: limit + 1 }]), true);
  assert.equal(m.getArchiveAssetTotalBytes([{ bytes: [1, 2] }, { sizeBytes: -5 }, null]), 2);
  assert.equal(m.getArchiveAssetTotalBytes(null), 0);
  assert.equal(m.isArchiveStringLengthError(new RangeError("size")), true);
  assert.equal(m.isArchiveStringLengthError(new Error("INVALID STRING LENGTH")), true);
  assert.equal(m.isArchiveStringLengthError(null), false);
});

test("HTML document models use live adapters, translation fallbacks and explicit link facets", async () => {
  const { module, models, options } = await modelFixture();
  assert.throws(() => module.createArchiveHtmlModels(null), TypeError);
  assert.throws(() => models.document(null), TypeError);
  assert.throws(() => models.document({}), TypeError);
  const catalog = { manifest: { filters: { scope: "year", year: 2025, hashtagTags: ["x"] }, hashtagFilteredOutCount: 3 },
    posts: [{ uri: "a", text: "Tag", facets: [{ url: "https://example.test/", kind: "link" }, { url: "https://mention.test", kind: "mention" }] },
      { uri: "b", text: "tag", createdAt: "2026-01-01", facets: [] }], summary: {} };
  const model = models.document(catalog);
  assert.equal(model.handle, "fallback.test");
  assert.equal(model.exportedAtIso, "2026-10-18T12:00:00.000Z");
  assert.equal(model.tags.length, 1);
  assert.equal(model.links.length, 1);
  assert.equal(model.bootstrap.htmlI18n.en.archiveHtmlTitle, "fallback title");
  assert.equal(model.bootstrap.runtimeData.filterHashtagCount, 1);
  assert.equal(model.bootstrap.runtimeData.filterSkippedCount, 3);
  assert.ok(model.filterSummary.includes("2025"));
  catalog.manifest.filters = { scope: "range", from: "2026-01-01", to: "2026-02-01" };
  assert.equal(models.document(catalog).bootstrap.runtimeData.filterScope, "2026-01-01 - 2026-02-01");
  assert.deepEqual(models.cardDisplay({ url: "https://example.test" }), { className: "archive-html-link-card", footer: "example.test" });
  options.normalizeStandardSite = () => ({ title: "publication" });
  assert.equal(models.cardDisplay({ url: "https://example.test" }).className, "archive-html-link-card is-publication");
  assert.throws(() => models.tags(null), TypeError);
  assert.throws(() => models.links(null), TypeError);
});

test("HTML template loader shares concurrent requests and retains localized failures", async () => {
  const { createArchiveHtmlTemplateLoader } = await importProjectModule("js/tools/archive-html-export.js");
  assert.throws(() => createArchiveHtmlTemplateLoader(null), TypeError);
  const paths = [];
  const load = createArchiveHtmlTemplateLoader({ fetch: async (path) => {
    paths.push(path); return { ok: true, text: async () => path };
  }, error: (status) => `status ${status}` });
  const first = load();
  assert.equal(load(), first);
  const bundle = await first;
  assert.equal(paths.length, 3);
  assert.ok(bundle.fragments.endsWith("archive-html-fragments.html"));
  assert.equal(await load(), bundle);
  const failed = createArchiveHtmlTemplateLoader({ fetch: async () => ({ ok: false, status: 503 }), error: (status) => `localized ${status}` });
  const failure = failed();
  await assert.rejects(failure, { message: "localized 503" });
  assert.equal(failed(), failure);
});

/** Creates export adapters with recorded progress, content and delivery. @param {object} overrides - Optional adapters. @returns {Promise<object>} Controller and observations. */
async function exportFixture(overrides = {}) {
  const module = await importProjectModule("js/tools/archive-html-export.js");
  const calls = [];
  const options = { t: (key) => key, ensureAvatars: async () => calls.push(["avatars"]),
    encodeAsset: async (asset) => "data:" + asset.path, shouldCompact: () => false,
    isSizeError: (error) => error instanceof RangeError,
    build: async (catalog, assets, settings) => { calls.push(["build", new Map(assets), settings]); return "html"; },
    progress: (value) => calls.push(["progress", value]), frame: async () => calls.push(["frame"]),
    baseName: () => "archive", file: (html, name) => ({ html, name }),
    deliver: async (...args) => calls.push(["deliver", ...args]), ...overrides };
  return { module, options, calls, controller: module.createArchiveHtmlExportController(options) };
}

test("HTML export preserves full encoding, progress checkpoints and download preference", async () => {
  const { controller, calls } = await exportFixture();
  await controller.export({ assets: Array.from({ length: 9 }, (_, index) => ({ path: String(index) })) });
  assert.equal(calls[0][0], "avatars");
  assert.equal(calls.filter((call) => call[0] === "frame").length, 2);
  const build = calls.find((call) => call[0] === "build");
  assert.equal(build[1].size, 9);
  assert.deepEqual(build[2], { embedPostImages: true, mode: "full" });
  assert.deepEqual(calls.find((call) => call[0] === "deliver").slice(1), [{ html: "html", name: "archive.html" }, "archive.html", { preferDownload: true }]);
  assert.equal(calls.at(-1)[1].percent, 100);
});

test("HTML export skips image encoding for requested and size-triggered compact output", async () => {
  for (const explicit of [true, false]) {
    let encoded = false;
    const fixture = await exportFixture({ shouldCompact: () => true, encodeAsset: async () => { encoded = true; } });
    let settings = {};
    if (explicit) { settings = { mode: "compact" }; }
    await fixture.controller.export({ assets: [{ path: "image" }] }, settings);
    assert.equal(encoded, false);
    assert.equal(fixture.calls.some(call => call[0] === "avatars"), !explicit);
    assert.deepEqual(fixture.calls.find((call) => call[0] === "build")[2], { embedPostImages: false, mode: "compact" });
    assert.equal(fixture.calls.find((call) => call[0] === "deliver")[2], "archive-compact.html");
  }
});

test("HTML export clears partial assets on encoding size errors and retries rendering size errors once", async () => {
  const encoding = await exportFixture({ encodeAsset: async () => { throw new RangeError("size"); } });
  await encoding.controller.export({ assets: [{ path: "image" }] });
  assert.equal(encoding.calls.find((call) => call[0] === "build")[1].size, 0);
  assert.equal(encoding.calls.find((call) => call[0] === "deliver")[2], "archive-compact.html");
  const attempts = [];
  const rendering = await exportFixture({ build: async (catalog, assets, settings) => {
    attempts.push([assets.size, settings]);
    if (attempts.length === 1) { throw new RangeError("size"); }
    return "compact html";
  } });
  await rendering.controller.export({ assets: [{ path: "image" }] });
  assert.deepEqual(attempts.map((attempt) => attempt[1].mode), ["full", "compact"]);
  assert.equal(attempts[1][0], 0);
  // Keep the pre-extraction late-retry filename behavior separate from this refactor.
  assert.equal(rendering.calls.find((call) => call[0] === "deliver")[2], "archive.html");
});

test("HTML export propagates non-size and delivery failures without success progress", async () => {
  const normal = await exportFixture();
  assert.throws(() => normal.module.createArchiveHtmlExportController({}), TypeError);
  await assert.rejects(normal.controller.export(null), { message: "archiveNeedArchive" });
  for (const adapter of ["ensureAvatars", "encodeAsset", "build", "deliver"]) {
    const failure = new Error(adapter);
    const fixture = await exportFixture({ [adapter]: async () => { throw failure; } });
    await assert.rejects(fixture.controller.export({ assets: [{ path: "image" }] }), (error) => error === failure);
    assert.ok(!fixture.calls.some((call) => call[0] === "progress" && call[1].percent === 100));
  }
  const compactFailure = await exportFixture({ build: async () => { throw new RangeError("size"); } });
  await assert.rejects(compactFailure.controller.export({ assets: [] }, { mode: "compact" }), RangeError);
});
