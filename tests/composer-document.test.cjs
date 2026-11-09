"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/**
 * Creates an observable Composer document fixture without browser globals.
 * @param {object} overrides - Optional dependency replacements.
 * @returns {Promise<object>} Controller, controls, state, call log and timer access.
 */
async function createDocumentFixture(overrides = {}) {
  const module = await importProjectModule("js/composer/composer-document.js");
  const elements = {};
  for (const key of ["sourceText", "counterToggle", "threadIntroToggle", "threadEmojiToggle",
    "markerSpacingToggle", "languageSelect", "hashtagPlacementSelect"]) {
    elements[key] = { value: "", checked: false };
  }
  elements.sourceText.value = "original";
  elements.counterToggle.checked = true;
  const calls = []; let timer;
  elements.importInput = { click: () => calls.push("choose") };
  const state = { appendThreadIntro: true, appendThreadEmoji: false, addMarkerSpacing: false,
    localePreference: "de", hashtagPlacement: "first", hashtags: ["tag"], selectedHashtags: ["tag"],
    segmentImages: [[{ id: "image" }]], segmentLinkCards: [{ uri: "link" }],
    segmentOverrides: ["manual"], composerReplyTarget: { uri: "reply" } };
  const options = {
    getState: () => state, setState: (next) => Object.assign(state, next),
    getSegments: () => [{ text: "manual", images: state.segmentImages[0] }],
    getInteraction: () => ({ replies: "all" }), getLinkCardSettings: () => ({ endpoint: "proxy" }),
    getLanguages: () => ["de"], normalizeImages: (images) => images || [],
    normalizeLinkCard: (card) => card || null, normalizeLinkCards: (cards) => cards || [],
    normalizeHashtags: (tags) => tags || [], normalizeSelectedHashtags: (tags) => tags || [],
    normalizePlacement: (value) => value || "first", normalizeOverrides: (segments) => {
      if (!segments.length) { return null; }
      return segments;
    },
    normalizeLanguages: (languages) => languages || [], supportedLocales: ["de", "en", "fr"], detectLocale: () => "en",
    applyInteraction: (value) => calls.push(["interaction", value]),
    confirm: async () => true, translate: (key) => key,
    setStatus: (...args) => calls.push(["status", ...args]), setLocked: (value) => calls.push(["locked", value]),
    setPosted: (value) => calls.push(["posted", value]), persistSettings: async () => calls.push("settings"),
    applyTranslations: () => calls.push("translations"), renderHashtags: () => calls.push("hashtags"),
    renderSegments: (value) => calls.push(["render", value]), validateImages: () => calls.push("validate"),
    clearReply: () => { state.composerReplyTarget = null; calls.push("reply-clear"); },
    renderReply: () => calls.push("reply-render"), updatePublishLabel: () => calls.push("publish-label"),
    enqueueDraft: async (task) => { calls.push("enqueue"); return task(); },
    saveDraft: async (payload) => calls.push(["draft", payload]), reportError: (error) => calls.push(["error", error.message]),
    clearTimer: () => calls.push("timer-clear"), setTimer: (callback, delay) => { timer = callback; calls.push(["timer", delay]); return 1; },
    codec: { read: async (file) => file.payload, createFile: async (payload) => ({ name: "thread.json", payload }) },
    share: async (file, name) => calls.push(["share", file, name]),
    version: { appVersion: "1", cacheVersion: "v1" }, now: () => "2026-10-10T12:00:00.000Z",
    ...overrides,
  };
  return { controller: module.createComposerDocumentController(elements, options), elements, state, calls,
    runTimer: async () => timer() };
}

test("Composer document export retains schema, settings, manual sections and attached media", async () => {
  const { controller, calls } = await createDocumentFixture();
  const payload = controller.buildExport();
  assert.deepEqual([payload.app, payload.schemaVersion, payload.version, payload.cacheVersion], ["Threadline", 1, "1", "v1"]);
  assert.deepEqual(payload.thread.segments, [{ text: "manual", images: [{ id: "image" }], externalCard: { uri: "link" } }]);
  assert.equal(payload.thread.sourceText, "original");
  assert.deepEqual(payload.thread.postLanguages, ["de"]);
  await controller.exportFile();
  assert.equal(calls.at(-1)[1], "threadSaved");
  assert.equal(calls.at(-2)[0], "share");
});

test("Composer document imports all fields and preserves persistence/render ordering", async () => {
  const { controller, elements, state, calls } = await createDocumentFixture();
  await controller.importFile({ payload: { thread: {
    sourceText: "loaded", useCounters: false, appendThreadEmoji: true, appendThreadIntro: true,
    addMarkerSpacing: true, postInteraction: { replies: "none" }, postLanguages: ["fr"],
    localePreference: "auto", hashtags: ["one"], selectedHashtags: ["one"], hashtagPlacement: "last",
    segments: [{ text: "part", images: [{ id: "new" }], externalCard: { uri: "card" } }],
  } } });
  assert.deepEqual([elements.sourceText.value, elements.counterToggle.checked, elements.threadEmojiToggle.checked], ["loaded", false, true]);
  assert.deepEqual([state.currentLocale, state.localePreference, state.selectedPostLanguages], ["en", "auto", ["fr"]]);
  assert.deepEqual(state.segmentOverrides, ["part"]);
  assert.deepEqual(state.segmentImages, [[{ id: "new" }]]);
  assert.deepEqual(state.segmentLinkCards, [{ uri: "card" }]);
  assert.deepEqual(calls.slice(3, 8), ["settings", "translations", "hashtags", ["render", { preserveOverrides: true }], "validate"]);
  assert.equal(calls.at(-1)[1], "threadLoaded");
});

test("Composer document rejects invalid data, respects cancellation and supports legacy media slots", async () => {
  const invalid = await createDocumentFixture();
  await assert.rejects(invalid.controller.importFile({ payload: {} }), /threadImportInvalid/);
  assert.equal(invalid.elements.sourceText.value, "original");
  const cancelled = await createDocumentFixture({ confirm: async () => false });
  await cancelled.controller.importFile({ payload: { thread: { sourceText: "changed" } } });
  assert.equal(cancelled.elements.sourceText.value, "original");
  assert.deepEqual(cancelled.calls, []);
  const legacy = await createDocumentFixture();
  await legacy.controller.importFile({ payload: { thread: {
    sourceText: "legacy", localePreference: "unknown", segmentImages: [[{ id: "legacy" }]],
    segmentLinkCards: [{ uri: "legacy-card" }],
  } } });
  assert.deepEqual(legacy.state.segmentImages, [[{ id: "legacy" }]]);
  assert.deepEqual(legacy.state.segmentLinkCards, [{ uri: "legacy-card" }]);
  assert.equal(legacy.state.segmentOverrides, null);
  assert.equal(legacy.state.localePreference, "de");
  assert.equal(legacy.elements.counterToggle.checked, true);
});

test("Composer draft debounce snapshots the latest source/state and routes persistence failures", async () => {
  const fixture = await createDocumentFixture();
  fixture.controller.scheduleDraft();
  fixture.elements.sourceText.value = "latest";
  fixture.state.segmentOverrides = ["latest"];
  fixture.controller.scheduleDraft();
  await fixture.runTimer();
  assert.equal(fixture.calls.filter((call) => call === "timer-clear").length, 2);
  assert.equal(fixture.calls.at(-1)[1].draft, "latest");
  assert.deepEqual(fixture.calls.at(-1)[1].segmentOverrides, ["latest"]);
  assert.deepEqual(fixture.calls.at(-1)[1].replyTarget, { uri: "reply" });
  const failed = await createDocumentFixture({ saveDraft: async () => { throw new Error("storage"); } });
  failed.controller.scheduleDraft(); await failed.runTimer();
  assert.deepEqual(failed.calls.at(-1), ["status", "storage", "error"]);
});

test("Composer document clear resets all media, manual segments and reply state after confirmation", async () => {
  const fixture = await createDocumentFixture();
  await fixture.controller.clear();
  assert.equal(fixture.elements.sourceText.value, "");
  assert.deepEqual([fixture.state.activeSegments, fixture.state.segmentImages, fixture.state.segmentLinkCards], [[], [], []]);
  assert.equal(fixture.state.segmentOverrides, null);
  assert.equal(fixture.state.composerReplyTarget, null);
  assert.deepEqual(fixture.calls.at(-3), ["draft", {
    draft: "", segmentImages: [], segmentLinkCards: [], segmentOverrides: null, replyTarget: null,
  }]);
  assert.equal(fixture.calls.at(-2), "settings");
  assert.deepEqual(fixture.calls.at(-1), ["status", "clearConfirm"]);
  const cancelled = await createDocumentFixture({ confirm: async () => false });
  await cancelled.controller.clear();
  assert.equal(cancelled.elements.sourceText.value, "original");
  assert.deepEqual(cancelled.calls, []);
});

test("Composer document event handlers consume file input and present load/save/clear failures", async () => {
  const fixture = await createDocumentFixture();
  fixture.controller.handlers.loadClick();
  assert.deepEqual(fixture.calls, ["choose"]);
  const event = { target: { files: [], value: "old" } };
  await fixture.controller.handlers.importChange(event);
  assert.equal(event.target.value, "");
  const failing = await createDocumentFixture({
    codec: { read: async () => { throw new Error("json"); }, createFile: async () => { throw new Error("file"); } },
    saveDraft: async () => { throw new Error("draft"); },
  });
  await failing.controller.handlers.importChange({ target: { files: [{}], value: "selected" } });
  assert.deepEqual(failing.calls.at(-1), ["status", "json", "error"]);
  await failing.controller.handlers.saveClick();
  assert.deepEqual(failing.calls.at(-1), ["status", "threadSaveFailed", "error"]);
  await failing.controller.clear();
  assert.deepEqual(failing.calls.at(-1), ["status", "draft", "error"]);
});

test("Composer thread codec round-trips gzip and plain JSON files without changing the schema", async () => {
  const module = await importProjectModule("js/composer/composer-document.js");
  const codec = module.createComposerThreadFileCodec({ File, Blob, Response, CompressionStream, DecompressionStream });
  const payload = { thread: { sourceText: "hello", segments: [] } };
  const compressed = await codec.createFile(payload, "2026-10-10T00:00:00Z");
  assert.equal(compressed.name, "threadline-thread-2026-10-10.threadline.gz");
  assert.equal(compressed.type, "application/gzip");
  assert.deepEqual(await codec.read(compressed), payload);
  const plainCodec = module.createComposerThreadFileCodec({ File, Blob, Response });
  assert.equal(plainCodec.supportsCompression(), false);
  const plain = await plainCodec.createFile(payload, "2026-10-10T00:00:00Z");
  assert.equal(plain.name, "threadline-thread-2026-10-10.json");
  assert.deepEqual(await plainCodec.read(plain), payload);
  await assert.rejects(plainCodec.read(new File(["{"], "invalid.json")), SyntaxError);
  await assert.rejects(codec.read(new File(["not gzip"], "invalid.gz")));
});

test("Composer text service preserves decorations, manual markers and grapheme/byte limits", async () => {
  const splitter = await importProjectModule("js/composer/composer-splitter.js");
  const main = await importProjectModule("js/composer/composer-main.js");
  const service = splitter.createComposerTextService({
    splitIntoGraphemes: main.splitComposerGraphemes, createPostTextLimit: main.createComposerPostTextLimit,
    fitsPostTextLimit: main.doesComposerTextFitLimit, getPostTextMetrics: main.getComposerPostTextMetrics,
    tokenizeText: splitter.tokenizeComposerText, trimSegment: splitter.trimComposerSegment,
    getThreadIntroText: () => "Thread", getSelectedHashtagText: () => "#tag", getHashtagPlacement: () => "last",
    MANUAL_SPLIT_MARKER: "%%", MAX_POST_LENGTH: 300, MAX_POST_UTF8_BYTES: 3000,
  });
  assert.equal(service.buildComposedText(" text "), "text\n\n#tag");
  assert.deepEqual(service.splitIntoSegments("", true, true, true, true, "first", ""), []);
  assert.deepEqual(service.splitIntoSegments("first%%second", false, false, false, false, "first", ""), ["first", "second"]);
  const segments = service.splitIntoSegments("👨‍👩‍👧‍👦".repeat(320), true, true, true, true, "all-bottom", "#tag");
  assert.ok(segments.length > 1);
  for (const segment of segments) {
    assert.ok(main.doesComposerTextFitLimit(segment, { graphemeLimit: 300, utf8ByteLimit: 3000 }));
    assert.ok(segment.includes("#tag"));
  }
  assert.ok(segments[0].includes("Thread"));
  assert.ok(segments[0].includes("⤵️"));
  assert.ok(segments.at(-1).endsWith(`${segments.length}/${segments.length}`));
});

test("Composer segment render controller handles empty source, synchronizes state and retains scroll", async () => {
  const module = await importProjectModule("js/composer/composer-segment-rendering.js");
  const state = { segmentOverrides: null, hashtagPlacement: "first", segmentImages: [], segmentLinkCards: [] };
  const calls = []; let frame;
  const elements = {
    sourceText: { value: "" }, counterToggle: { checked: true }, threadIntroToggle: { checked: false },
    threadEmojiToggle: { checked: true }, markerSpacingToggle: { checked: true },
    characterCount: {}, segmentSummary: {}, segmentsPane: { scrollTop: 37, hidden: false },
    segmentsList: { replaceChildren: () => calls.push("clear") },
  };
  const renderer = module.createComposerSegmentRenderer(elements, {
    getState: () => state, setState: (next) => Object.assign(state, next),
    clearMentionSync: () => calls.push("sync-clear"), buildComposedText: (text) => text,
    getSelectedHashtagText: () => "", splitIntoSegments: () => assert.fail("empty source must not split"),
    normalizeSegmentOverrides: (value) => value, syncSegmentImages: (count) => calls.push(["images", count]),
    syncSegmentLinkCards: (count) => calls.push(["cards", count]), formatComposerCharacterCount: () => "0",
    t: (key) => key, updateComposerLengthWarning: (segments) => calls.push(["warning", segments]),
    scheduleSegmentTextareaResize: () => calls.push("resize"), requestAnimationFrame: (callback) => { frame = callback; },
    updatePublishAvailability: () => calls.push("publish"),
  });
  renderer.render();
  assert.deepEqual(state.activeSegments, []);
  assert.equal(elements.segmentsPane.hidden, true);
  assert.equal(elements.characterCount.textContent, "0");
  assert.equal(elements.segmentSummary.textContent, "summarySingle");
  assert.equal(state.appendThreadEmoji, true);
  assert.equal(renderer.getMentionVersion(), 1);
  elements.segmentsPane.scrollTop = 0; frame();
  assert.equal(elements.segmentsPane.scrollTop, 37);
  renderer.render({ preserveView: false, preserveOverrides: false });
  assert.equal(renderer.getMentionVersion(), 2);
  assert.equal(state.segmentOverrides, null);
});
