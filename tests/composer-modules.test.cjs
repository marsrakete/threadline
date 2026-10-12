"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule, createMemoryStorage } = require("./module-test-helpers.cjs");

test("publish controller handles validation, cancellation, success, failure and preparation progress", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  const calls = []; let validation = { errorKey: "invalid", warnInput: true, showDialog: true };
  let accepted = false; let fail = false;
  const translate = (key, values = {}) => `${key}:${JSON.stringify(values)}`;
  const controller = module.createComposerPublishController({ validate: () => validation, translate,
    getLimitLabel: () => "limit", updateInputWarning: () => calls.push("warning"), setStatus: () => calls.push("status"),
    showError: () => calls.push("error"), showProgress: (_title, text) => calls.push(text),
    getConfirmationOptions: () => ({ translate, hasHashtags: () => true, getReplyTarget: () => null,
      getAccount: () => "account", getPostTargetName: () => "Bluesky", confirm: async () => accepted }),
    getWorkflowOptions: (segments) => ({ setBusy: (value) => calls.push(["busy", value]),
      showProgress() {}, hideProgress() {}, checkConnectivity: async () => {},
      prepareSegments: async () => segments, publish: async (value) => {
        if (fail) { throw new Error("failed"); } return value;
      }, onSuccess: async (result) => calls.push(result), onError: async () => calls.push("failure") }),
  });
  await controller.click(); assert.deepEqual(calls, ["warning", "status", "error"]);
  validation = { segments: ["section"] }; calls.length = 0;
  await controller.click(); assert.deepEqual(calls, []);
  accepted = true; await controller.click(); assert.deepEqual(calls, [["busy", true], ["section"], ["busy", false]]);
  calls.length = 0; fail = true; await controller.click(); assert.deepEqual(calls, [["busy", true], "failure", ["busy", false]]);
  controller.preparationProgress({ type: "segment", segmentIndex: 0, segmentCount: 2 });
  assert.match(calls.at(-1), /progressPreparingSegment.*"index":1,"count":2/);
  controller.preparationProgress({ type: "image", segmentIndex: 0, imageIndex: 1, imageCount: 3 });
  assert.match(calls.at(-1), /progressPreparingImage.*"image":2/);
});

test("publication rate-limit presentation handles windows, reset/retry fallbacks and empty notes", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  const note = { hidden: false, textContent: "old", dataset: {} };
  const translate = (key, values = {}) => `${key}:${JSON.stringify(values)}`;
  const controller = module.createComposerRateLimitPresentation(note, { translate, formatTime: () => "12:00" });
  for (const value of [null, "invalid", {}]) { assert.equal(module.normalizePublishRateLimit(value), null); }
  assert.equal(controller.message(null), ""); assert.match(controller.message(null, true), /publishRateLimitUnavailable/);
  for (const [seconds, label] of [[86400, "Days"], [3600, "Hours"], [60, "Minutes"], [3, "Seconds"]]) {
    assert.match(controller.message({ limit: "100", remaining: "0", policy: `100;w=${seconds}` }),
      new RegExp(`publishRateLimitWindow${label}`));
  }
  assert.match(controller.message({ policy: "unknown" }), /unknown/);
  assert.match(controller.message({ policy: "100;w=0" }), /w=0/);
  assert.match(controller.message({ resetAt: "invalid", retryAfter: "30" }), /publishRateLimitRetryAfter/);
  const reset = controller.message({ resetAt: "2026-01-01T12:00:00Z", retryAfter: "30" });
  assert.match(reset, /12:00/); assert.doesNotMatch(reset, /RetryAfter/);
  controller.render({ limit: 100 }); assert.equal(note.hidden, false); assert.match(note.textContent, /publishRateLimitLimit/);
  controller.render(null); assert.equal(note.hidden, true); assert.equal(note.textContent, "");
  module.createComposerRateLimitPresentation(null, { translate }).render(null);
});

test("publication error formatting preserves partial success counts and generic fallbacks", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  const translate = (key, values = {}) => `${key}:${JSON.stringify(values)}`;
  assert.match(module.buildComposerPublishErrorMessage(null, translate), /errorTitle/);
  assert.equal(module.buildComposerPublishErrorMessage({ message: "Transport" }, translate), "Transport");
  const error = { details: { code: "PARTIAL_PUBLISH", postedCount: 2, totalCount: 5 } };
  assert.match(module.buildComposerPublishErrorMessage(error, translate), /"posted":2,"total":5/);
  error.message = "Stopped"; assert.match(module.buildComposerPublishErrorMessage(error, translate), /\nStopped$/);
});

test("provider request controller checks current settings and quotas before transport", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  let settings = {}; let valid = false; let allowed = false; const calls = [];
  const controller = module.createComposerLinkCardRequestController({
    getSettings: () => settings, validateProxy: () => ({ ok: valid, message: "invalid" }),
    canUseMicrolink: () => allowed, translate: (key) => key,
    proxy: { now: () => 1000, randomUUID: () => "nonce", sign: async () => "signature",
      fetch: async (url) => { calls.push(url); return { ok: true, json: async () => ({ title: "Proxy" }) }; },
      normalize: (card) => card, imageToDataUrl: () => "" },
    microlink: { recordUsage: async () => calls.push("usage"),
      fetch: async () => ({ ok: true, json: async () => ({ status: "success", data: { title: "Micro" } }) }),
      normalize: (card) => card, fetchImage: async () => ({}) },
  });
  await assert.rejects(controller.proxy("https://example.com"), /linkCardProxyMissing/);
  settings = { endpoint: "https://proxy.example", secret: "secret" };
  await assert.rejects(controller.proxy("https://example.com"), /invalid/);
  await assert.rejects(controller.microlink("https://example.com"), /linkCardMicrolinkLimitReached/);
  assert.deepEqual(calls, []);
  valid = true; assert.equal((await controller.proxy("https://example.com")).title, "Proxy");
  settings.endpoint = "https://new-proxy.example"; await controller.proxy("https://example.com");
  assert.deepEqual(calls, ["https://proxy.example", "https://new-proxy.example"]);
  allowed = true; assert.equal((await controller.microlink("https://example.com")).title, "Micro");
  assert.equal(calls.at(-1), "usage");
});

test("mention dialog owns request generations, input debounce and normalized opening", async () => {
  const module = await importProjectModule("js/composer/composer-mentions.js");
  const calls = []; const timers = new Map(); let id = 0;
  const input = { value: "", focus() {}, select() {} };
  const controller = module.createComposerMentionDialogController({ input,
    dialog: { showModal: () => calls.push("open") }, title: {}, note: {}, results: { replaceChildren() {} } }, {
    translate: (key) => key, setTarget: (target) => calls.push(target), search: (query) => calls.push(query),
    clearTimeout: (timer) => timers.delete(timer), setTimeout: (callback, delay) => {
      assert.equal(delay, 250); id += 1; const current = id;
      timers.set(current, () => { timers.delete(current); callback(); }); return current;
    }, delayMs: 250,
  });
  const first = controller.start(); assert.equal(controller.isCurrent(first), true);
  controller.cancel(); assert.equal(controller.isCurrent(first), false);
  controller.open(3, " @KNOWN.Example ", "review");
  assert.deepEqual(calls[0], { context: "mention", segmentIndex: 3, originalHandle: "known.example", mode: "review" });
  assert.equal(input.value, "known.example");
  input.value = "first"; controller.input(); input.value = "second"; controller.input();
  assert.equal(timers.size, 1); [...timers.values()][0](); assert.equal(calls.at(-1), "second");
  controller.input(); controller.cancel(); assert.equal(timers.size, 0);
  controller.open(0, null, "invalid"); assert.equal(calls.at(-3).mode, "repair");
  let prevented = false;
  controller.keydown({ key: "Escape", preventDefault() { throw new Error("unexpected"); } });
  controller.keydown({ key: "Enter", preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(calls.at(-1), "");
});

test("Composer slot alignment preserves images and normalizes every link-card slot", async () => {
  const images = await importProjectModule("js/composer/composer-segments.js");
  const cards = await importProjectModule("js/composer/composer-link-cards.js");
  const originals = [{ alt: "kept" }];
  const aligned = images.syncComposerSegmentImages([originals, null, ["removed"]], 2);
  assert.equal(aligned[0], originals); assert.deepEqual(aligned[1], []);
  assert.deepEqual(images.syncComposerSegmentImages(null, 0), []);
  assert.deepEqual(cards.syncComposerSegmentLinkCards([{ url: "https://example.com" }], 3, (value) => value || null),
    [{ url: "https://example.com" }, null, null]);
  assert.deepEqual(cards.syncComposerSegmentLinkCards(null, 0, () => null), []);
});

test("Composer text classifiers and localized counters handle Unicode and absent input", async () => {
  const module = await importProjectModule("js/composer/composer-validation.js");
  assert.equal(module.hasEmojiLikeGraphemes("plain"), false);
  assert.equal(module.hasEmojiLikeGraphemes("\u{1f600}"), true);
  assert.equal(module.hasEmojiLikeGraphemes(null), false);
  assert.equal(module.hasCjkGraphemes("plain"), false);
  assert.equal(module.hasCjkGraphemes("\u65e5"), true);
  assert.equal(module.hasCjkGraphemes(undefined), false);
  const count = (value) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value)].length;
  const translate = (_key, values) => String(values.count);
  assert.equal(module.formatComposerCharacterCount("a\u0301", count, translate), "1");
  assert.equal(module.formatComposerCharacterCount(null, count, translate), "0");
});

test("Composer textarea resizing measures content after resetting its height", async () => {
  const module = await importProjectModule("js/composer/composer-segment-rendering.js");
  const textarea = { style: {}, get scrollHeight() { assert.equal(this.style.height, "auto"); return 125; } };
  module.resizeComposerTextareas({ querySelectorAll: (selector) => {
    assert.equal(selector, ".segment-text"); return [textarea];
  } });
  assert.equal(textarea.style.height, "125px");
  module.resizeComposerTextareas({ querySelectorAll: () => [] });
});

test("publication metadata normalization preserves aliases, limits and translation fallback", async () => {
  const module = await importProjectModule("js/shared/shared-link-cards.js");
  const translate = (key) => key;
  for (const value of [null, "invalid", {}]) { assert.equal(module.normalizeStandardSiteMetadata(value, translate), null); }
  const model = module.normalizeStandardSiteMetadata({ document: " at://document ", name: "x".repeat(200),
    ctaLabel: "x".repeat(100), publicationVerified: "true" }, translate);
  assert.equal(model.documentUri, "at://document"); assert.equal(model.publicationName.length, 160);
  assert.equal(model.ctaLabel.length, 80); assert.equal(model.publicationVerified, false);
  assert.equal(module.normalizeStandardSiteMetadata({ publication: "uri" }, translate).ctaLabel, "publicationCardCta");
  assert.equal(module.getPublicationCardFooterLabel(model, translate), "publicationMetadataDetected");
  assert.equal(module.getPublicationCardFooterLabel(null, translate), "");
});

test("posting payload collection preserves media and trims document fallbacks", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  assert.deepEqual(module.getComposerPostingTexts([], " fallback "), ["fallback"]);
  assert.deepEqual(module.getComposerPostingTexts(null, null), [""]);
  const images = [{ alt: "original" }];
  const payloads = module.buildComposerPostingPayloads({ segments: [" one ", ""],
    images: [images, null], cards: [{ url: "https://example.com" }] }, (card) => card || null);
  assert.equal(payloads[0].images, images);
  assert.deepEqual(payloads[1], { text: "", images: [], externalCard: null });
  assert.deepEqual(payloads[0].externalCard, { url: "https://example.com" });
});

test("mention source correction normalizes repairs and preserves document update order", async () => {
  const module = await importProjectModule("js/composer/composer-mentions.js");
  const calls = []; let source = "@old.test";
  const controller = module.createComposerMentionSourceCorrectionController({
    getSource: () => source, setSource: (value) => { source = value; calls.push("source"); },
    sync: { apply: (index, text, from, to) => { assert.equal(index, 2); return text.replace(from, to); } },
    resolver: { invalidate: (handles) => calls.push(handles) },
    setLocked: (value) => calls.push(["locked", value]), setPosted: (value) => calls.push(["posted", value]),
    render: (options) => calls.push(options), saveDraft: () => calls.push("draft"),
  });
  assert.equal(controller.apply(2, "", "new.test"), false);
  assert.equal(controller.apply(2, "@OLD.test", "old.test"), false);
  assert.deepEqual(calls, []);
  assert.equal(controller.apply(2, " @OLD.test ", " @NEW.test "), true);
  assert.equal(source, "@new.test");
  assert.deepEqual(calls, ["source", ["old.test", "new.test"], ["locked", true], ["posted", false],
    { preserveOverrides: true, preserveView: true, animate: false }, "draft"]);
});

test("link-card preview clears empty slots and renders safe text/removal lifecycle", async () => {
  const module = await importProjectModule("js/composer/composer-link-cards.js");
  const calls = []; let card = null;
  const nodes = {};
  for (const name of [".segment-link-card-preview", "img", "strong", "span", "small", "button"]) {
    nodes[name] = { textContent: "", classList: { toggle: (_key, value) => calls.push(["publication", value]) },
      remove: () => calls.push("image-removed"), setAttribute() {},
      addEventListener: (_event, handler) => { nodes[name].click = handler; } };
  }
  const template = { content: { cloneNode: () => ({ querySelector: (selector) => nodes[selector] }) } };
  const container = { replaceChildren: () => calls.push("clear"), appendChild: () => calls.push("append") };
  const renderer = module.createComposerLinkCardPreviewRenderer(template, {
    getCard: () => card, normalize: (value) => value, getFooterLabel: () => "Publication",
    translate: (key) => key, setCard: (_index, value) => { card = value; calls.push("remove"); },
    persist: async () => calls.push("persist"), preserveScroll: (callback) => callback(),
    renderSegments: (options) => calls.push(options), saveDraft: () => calls.push("draft"),
  });
  renderer.render(container, 0); assert.deepEqual(calls, ["clear"]);
  card = { url: "https://example.com", title: "<script>plain</script>", standardSite: {} };
  renderer.render(container, 0);
  assert.equal(nodes.strong.textContent, card.title);
  assert.equal(nodes.span.textContent, card.url);
  assert.equal(nodes.small.textContent, "https://example.com - Publication");
  assert.equal(nodes.button.title, "linkCardRemoveButton");
  assert.ok(calls.includes("image-removed"));
  card.imageDataUrl = "data:image/png;base64,test"; card.imageUrl = "https://example.com/image";
  renderer.render(container, 0); assert.equal(nodes.img.src, card.imageDataUrl);
  await nodes.button.click(); assert.equal(card, null);
  assert.deepEqual(calls.slice(-4), ["remove", "persist", { preserveOverrides: true }, "draft"]);
});

/** Creates a DOM-independent post-settings fixture. @param {object} overrides - Adapter replacements. @returns {Promise<object>} Controller, nodes, state and calls. */
async function createPostSettingsFixture(overrides = {}) {
  const module = await importProjectModule("js/composer/composer-post-settings.js");
  const calls = [];
  const node = () => ({ checked: false, value: "", hidden: false, textContent: "", open: false,
    classList: { toggle() {} }, closest: () => null, focus: () => calls.push("focus") });
  const elements = {};
  for (const key of ["eyebrow", "title", "description", "settingsList", "languageDisclosure", "interactionDisclosure",
    "searchNote", "search", "selectionNote", "summary", "languageMeta", "interactionMeta", "everyone", "nobody", "custom",
    "followers", "following", "mentioned", "quotes", "counter", "intro", "emoji", "spacing"]) { elements[key] = node(); }
  elements.dialog = { showModal: () => calls.push("open"), close: () => calls.push("close") };
  elements.list = { children: [], replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } };
  elements.optionTemplate = { content: { cloneNode() {
    const nodes = { label: node(), input: node(), span: node() };
    nodes.input.addEventListener = (_event, handler) => { nodes.input.change = handler; };
    return { nodes, querySelector: (selector) => nodes[selector] };
  } } };
  elements.emptyTemplate = { content: { cloneNode() { const text = node(); return { querySelector: () => text, text }; } } };
  const state = { currentLocale: "en", selectedPostLanguages: [], searchSelectedLanguages: [], locked: false,
    interaction: {}, segmentOverrides: ["manual"] };
  const options = {
    getState: () => state, setState: (next) => Object.assign(state, next),
    translate: (key, values = {}) => `${key}:${JSON.stringify(values)}`,
    normalizeLanguages: (values, limit = 3) => {
      if (!Array.isArray(values)) { return []; }
      return [...new Set(values.filter((value) => ["en", "de", "fr", "es"].includes(value)))].slice(0, limit);
    },
    inferLanguages: () => ["en"], displayLanguage: (tag) => tag,
    languageOptions: (_locale, term) => ["en", "de", "fr", "es"].filter((code) => code.includes(term)).map((code) => ({ code, name: code })),
    searchLimit: 3, persist: async () => calls.push("persist"), renderSegments: (value) => calls.push(["segments", value]),
    renderSearchLanguages: () => calls.push("search-languages"), renderSearchSummary: () => calls.push("search-summary"),
    enforceSearchSort: (value) => calls.push(["sort", value]), setLocked: (value) => { state.locked = value; calls.push("unlock"); },
    setPosted: () => calls.push("unpost"), renderReply: () => calls.push("reply"), saveDraft: () => calls.push("draft"),
    defer: (callback) => callback(), ...overrides,
  };
  return { controller: module.createComposerPostSettingsController(elements, options), elements, state, calls };
}

test("post settings controller normalizes rules, languages and complete summary", async () => {
  const { controller, elements, state } = await createPostSettingsFixture();
  state.selectedPostLanguages = ["invalid"];
  assert.deepEqual(controller.getLanguages(), ["en"]);
  controller.applyInteraction({ replyMode: "custom", allowFollowers: true, quotePostsAllowed: false });
  assert.equal(elements.custom.checked, true);
  assert.equal(elements.followers.disabled, false);
  assert.equal(elements.quotes.checked, false);
  elements.counter.checked = true;
  controller.renderSummary();
  assert.match(elements.summary.textContent, /counterToggle/);
  assert.match(elements.summary.textContent, /quotePostsBlockedSummary/);
  assert.match(elements.interactionMeta.textContent, /postInteractionDisclosureSummary/);
  assert.deepEqual(state.selectedPostLanguages, ["en"]);
  controller.applyInteraction({ replyMode: "invalid" });
  assert.equal(elements.everyone.checked, true);
  assert.equal(elements.followers.disabled, true);
});

test("post settings dialog keeps search and posting selection separate and renders limits/empty results", async () => {
  const { controller, elements, state, calls } = await createPostSettingsFixture();
  state.searchSelectedLanguages = ["en", "de", "fr"];
  controller.open("search");
  assert.equal(elements.settingsList.hidden, true);
  assert.equal(elements.interactionDisclosure.hidden, true);
  assert.equal(elements.list.children[3].nodes.input.disabled, true);
  assert.equal(elements.list.children[0].nodes.input.disabled, false);
  await controller.changeLanguage("fr", false, state.searchSelectedLanguages);
  assert.deepEqual(state.searchSelectedLanguages, ["en", "de"]);
  assert.deepEqual(state.selectedPostLanguages, ["en"]);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === "segments"), false);
  controller.close();
  elements.search.value = "no-match";
  controller.renderDialog();
  assert.equal(elements.list.children.length, 1);
  assert.match(elements.list.children[0].text.textContent, /postLanguagesNoResults/);
  controller.resetDialog();
  assert.equal(elements.search.value, "");
  controller.open("invalid-mode");
  assert.equal(elements.settingsList.hidden, false);
  assert.equal(elements.searchNote.hidden, true);
  assert.ok(calls.includes("focus"));
});

test("post settings changes preserve render/persistence ordering and respect manual lock", async () => {
  const { controller, state, elements, calls } = await createPostSettingsFixture();
  elements.intro.checked = true;
  controller.handlers.threadIntroChange();
  assert.equal(state.appendThreadIntro, true);
  assert.equal(state.segmentOverrides, null);
  assert.deepEqual(calls.slice(0, 3), ["unlock", "unpost", ["segments", { preserveOverrides: false }]]);
  assert.deepEqual(calls.slice(-2), ["persist", "draft"]);
  calls.length = 0;
  state.locked = true;
  await controller.changeLanguage("de", true, ["en"]);
  assert.deepEqual(state.selectedPostLanguages, ["en", "de"]);
  assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === "segments"), false);
  calls.length = 0;
  await controller.handlers.replyModeChange({ currentTarget: { checked: false, value: "nobody" } });
  assert.equal(calls.length, 0);
  await controller.handlers.replyModeChange({ currentTarget: { checked: true, value: "nobody" } });
  assert.equal(controller.getInteraction().replyMode, "nobody");
  assert.equal(calls.at(-1), "persist");
});

test("post settings propagates persistence errors after updating visible rules", async () => {
  const { controller, elements } = await createPostSettingsFixture({ persist: async () => { throw new Error("storage"); } });
  elements.quotes.checked = false;
  await assert.rejects(controller.handlers.quotePostsChange(), /storage/);
  assert.equal(controller.getInteraction().quotePostsAllowed, false);
  assert.match(elements.summary.textContent, /quotePostsBlockedSummary/);
});

test("Composer UI state handles locking, other hashtag contexts, unlock and posted dismiss", async () => {
  const module = await importProjectModule("js/composer/composer-page.js");
  const state = { locked: false, posted: false, segmentOverrides: ["manual"] };
  let search = false; let focused = 0; let renders = 0;
  const elements = {};
  for (const key of ["source", "counter", "intro", "emoji", "spacing", "settings", "clear", "hashtagInput",
    "hashtagAdd", "hashtagPlacement", "lockNote", "postedNote"]) { elements[key] = {}; }
  elements.source.value = "text"; elements.source.focus = () => { focused += 1; };
  const controller = module.createComposerUiStateController(elements, {
    getState: () => state, setState: (next) => Object.assign(state, next),
    isArchiveContext: () => false, isSearchContext: () => search, renderHashtags: () => { renders += 1; },
  });
  controller.setLocked(true);
  assert.equal(elements.source.disabled, true); assert.equal(elements.clear.disabled, true);
  assert.equal(elements.hashtagInput.disabled, true); assert.equal(elements.lockNote.hidden, false);
  search = true; controller.renderLock();
  assert.equal(elements.hashtagInput.disabled, false); assert.equal(elements.source.disabled, true);
  controller.unlock(); assert.equal(state.segmentOverrides, null); assert.equal(elements.clear.disabled, false);
  elements.source.value = " "; controller.renderClear(); assert.equal(elements.clear.disabled, true);
  controller.setPosted(true); assert.equal(elements.postedNote.hidden, false);
  controller.dismissPosted(); assert.equal(elements.postedNote.hidden, true); assert.equal(focused, 2);
  delete elements.postedNote; controller.renderPosted();
  assert.equal(renders, 3);
});

test("publish availability covers exact limits, fallback text, ALT and image resize rules", async () => {
  const module = await importProjectModule("js/composer/composer-validation.js");
  const options = { sourceText: "text", composedText: "abc", activeSegments: [], countGraphemes: (text) => text.length,
    getMetrics: (text) => ({ graphemeCount: text.length, utf8ByteCount: text.length * 2 }),
    getSegments: () => [{ images: [] }], composerLimit: 4, postLimit: 3, byteLimit: 6, altTextRequired: true, autoResize: false };
  assert.deepEqual(module.getComposerPublishAvailability(options), { disabled: false, danger: false, warningKeys: [] });
  options.composedText = "abcd"; assert.equal(module.getComposerPublishAvailability(options).danger, true);
  options.activeSegments = ["ab"]; assert.equal(module.getComposerPublishAvailability(options).disabled, false);
  options.getSegments = () => [{ images: [{ alt: " ", validation: { tooBig: true } }] }];
  assert.deepEqual(module.getComposerPublishAvailability(options).warningKeys, ["publishAltTextWarning", "publishImageTooLargeWarning"]);
  options.autoResize = true; options.altTextRequired = false;
  assert.equal(module.getComposerPublishAvailability(options).disabled, false);
  options.sourceText = " "; assert.equal(module.getComposerPublishAvailability(options).disabled, true);
  options.sourceText = "12345"; assert.equal(module.getComposerPublishAvailability(options).danger, true);
});

test("publish availability renderer localizes warnings and clears stale danger state", async () => {
  const module = await importProjectModule("js/composer/composer-validation.js");
  const classes = []; const calls = [];
  const elements = { button: { classList: { toggle: (...args) => classes.push(args) } }, warning: {} };
  const options = { sourceText: "ok", composedText: "", activeSegments: ["ok"], countGraphemes: (text) => text.length,
    getMetrics: (text) => ({ graphemeCount: text.length, utf8ByteCount: text.length }),
    getSegments: () => [{ images: [{ alt: "", validation: { tooBig: true } }] }], composerLimit: 10,
    postLimit: 10, byteLimit: 10, altTextRequired: true, autoResize: false };
  const controller = module.createComposerPublishAvailabilityController(elements, {
    getOptions: () => options, translate: (key) => key, updateInputWarning: (value) => calls.push(value),
  });
  controller.render(); assert.equal(elements.button.disabled, true);
  assert.equal(elements.warning.textContent, "publishAltTextWarning\npublishImageTooLargeWarning");
  options.getSegments = () => []; controller.render();
  assert.equal(elements.button.disabled, false); assert.equal(elements.warning.hidden, true);
  assert.equal(elements.warning.textContent, ""); assert.deepEqual(classes.at(-1), ["is-danger", false]);
  assert.deepEqual(calls, [false, false]);
});

/**
 * Builds an editor controller with observable resource, rendering and storage adapters.
 * @param {object} overrides - Optional dependency replacements.
 * @returns {Promise<object>} Controller, nodes, records and call log.
 */
async function createEditorFixture(overrides = {}) {
  const module = await importProjectModule("js/composer/composer-image-editor.js");
  const calls = [];
  const defaults = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipX: false, flipY: false, fitMode: "cover" };
  const image = { dataUrl: "image", width: 100, height: 200, edit: { ...defaults }, validation: {} };
  const elements = {
    dialog: { open: false, showModal() { this.open = true; }, close() { this.open = false; } },
    sheet: { classList: { toggle: (...args) => calls.push(["portrait", ...args]), remove: () => {} } },
    canvas: { setPointerCapture: (id) => calls.push(["capture", id]) },
    zoomInput: { value: "" }, status: { textContent: "", dataset: {} },
    fitDimensionsButton: {}, lossyResizeButton: {},
  };
  const options = {
    getImages: () => [[image]], normalizeImageEdit: (edit) => ({ ...defaults, ...edit }),
    getImageEditorCanvasDimensions: () => ({ width: 100, height: 200 }),
    clampImageEditToFrame: (_image, _width, _height, edit) => ({ ...edit }),
    loadImageBitmapForDataUrl: async () => ({ width: 100, height: 200, close: () => calls.push("bitmap-close") }),
    isPortraitEditorImage: () => true, formatImageSize: String, t: (key) => key,
    IMAGE_BLOB_LIMIT: 1000, IMAGE_MIN_EXPORT_SCALE: 0.1, IMAGE_MAX_DIMENSION: 1000,
    getImageMetrics: () => ({}), drawComposerImageEditor: () => calls.push("draw"),
    validateThreadImage: async () => calls.push("validate"),
    persistSettings: async () => calls.push("persist"),
    preserveScrollPosition: (callback) => callback(), renderSegments: (settings) => calls.push(["render", settings]),
    queueDraftSave: () => calls.push("draft"), createDefaultImageEdit: () => ({ ...defaults }),
    renderImageToBlob: async () => ({ width: 2000, height: 1000 }),
    getMetricsController: () => ({ invalidate: () => calls.push("invalidate"), schedule: () => {},
      update: async () => calls.push("metrics") }),
    getDragController: () => ({ stop: () => calls.push("stop"), start: () => calls.push("start"), update: () => {} }),
    ...overrides,
  };
  return { controller: module.createComposerImageEditorController(elements, options), elements, image, calls };
}

test("Composer editor lifecycle and transforms keep edits private until save", async () => {
  const { controller, elements, image, calls } = await createEditorFixture();
  await controller.open(0, 0);
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.canvas.width, 100);
  controller.setDraft({ ...controller.getDraft(), offsetX: 4, offsetY: 7 });
  controller.handlers.flipHorizontal();
  controller.handlers.flipVertical();
  controller.handlers.rotateLeft();
  assert.deepEqual([controller.getDraft().offsetX, controller.getDraft().offsetY, controller.getDraft().rotation], [-7, 4, 270]);
  assert.equal(image.edit.rotation, 0);
  elements.zoomInput.value = "2";
  controller.handlers.zoomInput();
  let prevented = false;
  controller.handlers.wheel({ deltaY: -100, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(controller.getDraft().zoom, 2.3);
  controller.reset();
  assert.equal(controller.getDraft().rotation, 0);
  elements.zoomInput.value = "1.5"; controller.handlers.zoomInput();
  calls.length = 0;
  await controller.save();
  assert.equal(image.edit.zoom, 1.5);
  assert.deepEqual(calls.slice(0, 4), ["validate", "persist", ["render", { preserveOverrides: true }], "draft"]);
  assert.equal(elements.dialog.open, false);
  assert.equal(controller.getDraft(), null);
  assert.equal(controller.getImage(), null);
  assert.ok(calls.includes("bitmap-close"));
});

test("Composer editor guards invalid targets and cancellation does not commit", async () => {
  const { controller, elements, image } = await createEditorFixture();
  await controller.open(3, 0);
  for (const key of ["zoomInput", "flipHorizontal", "flipVertical", "rotateLeft"]) { controller.handlers[key](); }
  await controller.fit(); await controller.resize(); await controller.save();
  assert.equal(elements.dialog.open, false);
  assert.equal(controller.getDraftImage(), null);
  assert.equal(controller.formatDimensions(-1, NaN), "-");
  assert.equal(controller.formatDimensions(10.4, 20.8), "10 x 21 px");
  await controller.open(0, 0);
  elements.zoomInput.value = "2"; controller.handlers.zoomInput();
  let prevented = false;
  controller.handlers.dialogCancel({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(image.edit.zoom, 1);
  assert.equal(elements.dialog.open, false);
});

test("Composer editor rotation and reset synchronize the Canvas frame before drawing", async () => {
  const fixture = await createEditorFixture({
    getImageEditorCanvasDimensions: (_image, edit) => {
      if (edit.rotation === 90 || edit.rotation === 270) { return { width: 200, height: 100 }; }
      return { width: 100, height: 200 };
    },
    isPortraitEditorImage: (_image, edit) => edit.rotation === 0 || edit.rotation === 180,
  });
  await fixture.controller.open(0, 0);
  fixture.controller.handlers.rotateLeft();
  assert.deepEqual([fixture.elements.canvas.width, fixture.elements.canvas.height], [200, 100]);
  assert.deepEqual(fixture.calls.at(-2), ["portrait", "is-portrait-image", false]);
  fixture.controller.reset();
  assert.deepEqual([fixture.elements.canvas.width, fixture.elements.canvas.height], [100, 200]);
  assert.deepEqual(fixture.calls.at(-2), ["portrait", "is-portrait-image", true]);
});

test("Composer editor fitting and lossy resize preserve export bounds and storage order", async () => {
  const { controller, elements, image, calls } = await createEditorFixture();
  image.validation = { tooBig: true, exceedsDimensions: true };
  await controller.open(0, 0);
  assert.equal(elements.fitDimensionsButton.disabled, false);
  assert.equal(elements.lossyResizeButton.hidden, false);
  assert.equal(elements.status.dataset.tone, "error");
  calls.length = 0;
  await controller.fit();
  assert.equal(image.exportScale, 0.5);
  assert.deepEqual(calls, ["validate", "metrics", "persist", ["render", { preserveOverrides: true }], "draft"]);
  assert.equal(elements.status.textContent, "fitImageDimensionsStillTooLarge");
  image.validation = {};
  await controller.resize();
  assert.equal(image.exportScale, 0.41);
  assert.equal(image.exportQuality, 0.88 * 0.86);
  assert.equal(elements.status.textContent, "lossyResizeApplied");
  assert.equal(elements.status.dataset.tone, "success");
  image.exportScale = 0.1; image.exportQuality = 0.45;
  await controller.resize();
  assert.equal(image.exportScale, 0.1);
  assert.equal(image.exportQuality, 0.45);
});

test("Composer editor fitting within limits does not persist and storage failures leave the dialog open", async () => {
  const fixture = await createEditorFixture({ renderImageToBlob: async () => ({ width: 1000, height: 500 }) });
  await fixture.controller.open(0, 0); fixture.calls.length = 0;
  await fixture.controller.fit();
  assert.deepEqual(fixture.calls, ["metrics"]);
  assert.equal(fixture.elements.status.textContent, "fitImageDimensionsNotNeeded");
  const failed = await createEditorFixture({ persistSettings: async () => { throw new Error("storage"); } });
  await failed.controller.open(0, 0);
  await assert.rejects(failed.controller.save(), /storage/);
  assert.equal(failed.elements.dialog.open, true);
  assert.ok(failed.controller.getDraft());
  assert.equal(failed.calls.includes("draft"), false);
});

test("Composer editor discards late bitmap loads after close or another open", async () => {
  const pending = [];
  const fixture = await createEditorFixture({ loadImageBitmapForDataUrl: () => new Promise((resolve) => pending.push(resolve)) });
  let released = 0;
  const first = fixture.controller.open(0, 0);
  fixture.controller.close();
  pending[0]({ width: 10, height: 10, close: () => { released += 1; } });
  await first;
  assert.equal(fixture.elements.dialog.open, false);
  const older = fixture.controller.open(0, 0);
  const newer = fixture.controller.open(0, 0);
  pending[2]({ width: 10, height: 10, close: () => { released += 1; } }); await newer;
  pending[1]({ width: 10, height: 10, close: () => { released += 1; } }); await older;
  assert.equal(released, 2);
  assert.equal(fixture.elements.dialog.open, true);
  fixture.controller.close();
  assert.equal(released, 3);
});

test("Composer editor Canvas renderer preserves transforms, resolved draft offsets and metrics scheduling", async () => {
  const module = await importProjectModule("js/composer/composer-image-renderer.js");
  const calls = [];
  const context = {};
  for (const key of ["clearRect", "fillRect", "save", "beginPath", "rect", "clip", "translate", "rotate", "scale", "drawImage", "restore", "strokeRect"]) {
    context[key] = (...args) => calls.push([key, ...args]);
  }
  const canvas = { width: 100, height: 80, getContext: () => context };
  module.drawComposerImageEditor(canvas, null, null, null, {});
  assert.deepEqual(calls, [["clearRect", 0, 0, 100, 80]]);
  calls.length = 0;
  const draft = { offsetX: 0, offsetY: 0 }; const bitmap = {};
  module.drawComposerImageEditor(canvas, {}, bitmap, draft, {
    normalizeEdit: () => ({ fitMode: "cover" }), getSourceDimensions: () => ({ width: 200, height: 100 }),
    getMetrics: () => ({ offsetX: 4, offsetY: 5, fitMode: "cover", centerX: 50, centerY: 40, rotation: 90, flipX: true, flipY: false, drawWidth: 100, drawHeight: 80 }),
    scheduleMetrics: () => calls.push(["schedule"]),
  });
  assert.deepEqual(draft, { offsetX: 4, offsetY: 5, fitMode: "cover" });
  assert.deepEqual(calls.find((call) => call[0] === "scale"), ["scale", -1, 1]);
  assert.deepEqual(calls.find((call) => call[0] === "rotate"), ["rotate", Math.PI / 2]);
  assert.deepEqual(calls.find((call) => call[0] === "drawImage"), ["drawImage", bitmap, -50, -40, 100, 80]);
  assert.deepEqual(calls.at(-1), ["schedule"]);
});

test("Composer editor drag controller clamps pointer deltas and ignores inactive/missing drafts", async () => {
  const module = await importProjectModule("js/composer/composer-image-renderer.js");
  let draft = null; let image = {}; const calls = [];
  const controller = module.createComposerImageEditorDragController({ getDraft: () => draft, getImage: () => image,
    setDraft: (value) => { draft = value; }, clamp: (_image, value) => { calls.push(value); return { ...value, offsetX: Math.min(20, value.offsetX) }; },
    draw: () => calls.push("draw") });
  controller.start({ clientX: 0, clientY: 0 }); controller.update({ clientX: 10, clientY: 10 });
  assert.deepEqual(calls, []);
  draft = { offsetX: 5, offsetY: 6, fitMode: "contain" };
  controller.start({ clientX: 10, clientY: 20 }); controller.update({ clientX: 40, clientY: 25 });
  assert.deepEqual(calls[0], { offsetX: 35, offsetY: 11, fitMode: "cover" });
  assert.equal(draft.offsetX, 20); assert.equal(calls[1], "draw");
  calls.length = 0; image = null; controller.update({ clientX: 50, clientY: 50 });
  assert.deepEqual(calls, []);
  image = {}; controller.stop(); controller.update({ clientX: 50, clientY: 50 });
  assert.deepEqual(calls, []);
});

test("Composer editor metrics suppress stale results/errors and debounce with close invalidation", async () => {
  const module = await importProjectModule("js/composer/composer-image-renderer.js");
  const elements = { originalDimensions: {}, originalSize: {}, exportDimensions: {}, exportSize: {} };
  let image = { width: 100, height: 200, originalSizeBytes: 10, validation: { sizeBytes: 20 }, exportScale: 0.5 };
  const pending = []; const timers = []; const cleared = [];
  const options = { getImage: () => image, getDraftImage: (value) => value, formatDimensions: (w, h) => `${w}/${h}`,
    formatSize: String, minScale: 0.1, isDefaultEdit: () => true, translate: (key) => key, updateActions: () => {},
    renderBlob: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    setTimer: (callback, delay) => { assert.equal(delay, 180); timers.push(callback); return timers.length; }, clearTimer: (id) => cleared.push(id) };
  const controller = module.createComposerImageEditorMetricsController(elements, options);
  await controller.update({ renderBlob: false });
  assert.equal(elements.exportDimensions.textContent, "50/100"); assert.equal(elements.exportSize.textContent, "20");
  assert.equal(pending.length, 0);
  const first = controller.update(); const second = controller.update();
  pending[1].resolve({ width: 40, height: 60, blob: { size: 30 } }); await second;
  pending[0].reject(new Error("old")); await first;
  assert.equal(elements.exportSize.textContent, "30");
  const closing = controller.update(); controller.invalidate();
  pending[2].resolve({ width: 1, height: 1, blob: { size: 1 } }); await closing;
  assert.equal(elements.exportDimensions.textContent, "50/100");
  assert.equal(elements.exportSize.textContent, "imageEditorCalculatingSize");
  const failure = controller.update(); pending[3].reject(new Error("failed")); await failure;
  assert.equal(elements.exportSize.textContent, "imageEditorSizeUnknown");
  controller.schedule(); controller.schedule(); controller.invalidate();
  assert.deepEqual(cleared.slice(-3), [null, 1, 2]);
  image = null; await controller.update(); assert.equal(pending.length, 4);
  image = { width: 100, height: 100, exportScale: 2 };
  options.isDefaultEdit = () => false;
  options.getExportDimensions = (_image, _edit, source, scale) => { assert.equal(source, null); assert.equal(scale, 1); return { width: 10, height: 20 }; };
  await controller.update({ renderBlob: false }); assert.equal(elements.exportDimensions.textContent, "10/20");
});

test("Composer ALT dialog saves limited text before refreshing UI and handles missing images", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  const calls = [];
  let image = { alt: "old" };
  const classes = new Set();
  const elements = { dialog: { showModal: () => calls.push("open"), close: () => calls.push("close") },
    input: { value: "", focus: () => calls.push("focus") }, count: {},
    previewWrap: { classList: { remove: (value) => classes.delete(value), toggle: () => {} } },
    canvas: { width: 10, height: 20, getContext: () => ({ clearRect: () => calls.push("clear") }),
      style: { removeProperty: (value) => calls.push(value) } } };
  const options = { getImage: () => image, maxLength: 4, defer: (callback) => callback(),
    persist: async () => calls.push("persist"), updateCard: (...args) => calls.push(["card", ...args]),
    updatePublish: () => calls.push("publish"), saveDraft: () => calls.push("draft") };
  const controller = module.createComposerAltTextDialogController(elements, options);
  controller.open(2, 1);
  assert.equal(elements.input.value, "old");
  assert.equal(elements.count.textContent, "3/4");
  assert.equal(elements.previewWrap.hidden, true);
  elements.input.value = "abcdef";
  controller.count(); assert.equal(elements.count.textContent, "6/4");
  calls.length = 0;
  await controller.save();
  assert.equal(image.alt, "abcd");
  assert.deepEqual(calls, ["persist", ["card", 2, 1], "publish", "draft", "clear", "width", "height", "aspect-ratio", "close"]);
  calls.length = 0;
  await controller.save();
  assert.deepEqual(calls, ["clear", "width", "height", "aspect-ratio", "close"]);
  image = null; calls.length = 0;
  controller.open(0, 0); assert.deepEqual(calls, []);
  image = { alt: "" }; controller.open(0, 0); image = null; calls.length = 0;
  await controller.save();
  assert.deepEqual(calls, ["clear", "width", "height", "aspect-ratio", "close"]);
  image = { alt: "" }; controller.open(0, 0); calls.length = 0;
  options.persist = async () => { throw new Error("storage failed"); };
  await assert.rejects(controller.save(), /storage failed/);
  assert.deepEqual(calls, []);
});

test("Composer ALT card refresh distinguishes whitespace from meaningful descriptions", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  const toggles = [];
  const preview = {}; const state = { classList: { toggle: (...args) => toggles.push(args) } };
  const button = { classList: { toggle: (...args) => toggles.push(args) } };
  const card = { querySelector: (selector) => {
    if (selector === ".segment-image-preview") { return preview; }
    if (selector === ".segment-image-alt-state") { return state; }
    return button;
  } };
  module.updateComposerImageAltDisplay(null, card, (key) => key);
  module.updateComposerImageAltDisplay({ alt: "description" }, null, (key) => key);
  assert.deepEqual(toggles, []);
  module.updateComposerImageAltDisplay({ alt: "   " }, card, (key) => key);
  assert.equal(preview.title, "altTextMissing"); assert.equal(state.textContent, "altTextMissing");
  assert.deepEqual(toggles, [["is-missing-alt", true], ["danger", true]]);
  toggles.length = 0;
  module.updateComposerImageAltDisplay({ alt: " <b>description</b> " }, card, (key) => key);
  assert.equal(preview.title, " <b>description</b> "); assert.equal(state.textContent, "altTextAdded");
  assert.deepEqual(toggles, [["is-missing-alt", false], ["danger", false]]);
  assert.doesNotThrow(() => module.updateComposerImageAltDisplay({ alt: "" }, { querySelector: () => null }, (key) => key));
});

test("Composer image selection respects cards, MIME types, limits and ordered persistence", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  let images = [[{ id: "old" }]];
  let blocked = false;
  const calls = [];
  const options = { getImages: () => images, setSegment: (index, values) => { images[index] = values; calls.push("set"); },
    hasLinkCard: () => blocked, maxImages: 2, translate: (key, values) => ({ key, values }),
    setStatus: (message, tone) => calls.push([message, tone]), createImage: async (file) => { calls.push(file.name); return { id: file.name }; },
    validate: () => calls.push("validate"), persist: async () => calls.push("persist"), render: () => calls.push("render"), saveDraft: () => calls.push("save") };
  const controller = module.createComposerImageCollectionController(options);
  blocked = true;
  await controller.select(0, []);
  assert.deepEqual(calls, [[{ key: "linkCardBlocksImages", values: undefined }, "error"]]);
  blocked = false; calls.length = 0;
  await controller.select(0, [{ type: "text/plain" }]);
  assert.deepEqual(calls, []);
  await controller.select(0, [{ name: "one", type: "image/png" }, { name: "two", type: "image/jpeg" }]);
  assert.deepEqual(images, [[{ id: "old" }, { id: "one" }]]);
  assert.deepEqual(calls, [[{ key: "imagesSelectionTrimmed", values: { count: 1 } }, "error"], "one", "set", "validate", "persist", "render", "save"]);
  calls.length = 0;
  await controller.select(0, [{ type: "image/png" }]);
  assert.equal(calls[0][0].key, "imagesLimitReached");
  calls.length = 0; images = [[]];
  options.createImage = async () => { throw new Error("decode"); };
  await assert.rejects(controller.select(0, [{ type: "image/png" }]), /decode/);
  assert.deepEqual(images, [[]]); assert.deepEqual(calls, []);
  options.createImage = async () => ({ id: "created" });
  options.persist = async () => { throw new Error("storage"); };
  await assert.rejects(controller.select(0, [{ type: "image/png" }]), /storage/);
  assert.deepEqual(calls, ["set", "validate"]);
  assert.deepEqual(images, [[{ id: "created" }]]);
});

test("Composer image mutations preserve no-op boundaries, conflict messages and draft refresh order", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  let images = [["a", "b"], []]; let blocked = false; const calls = [];
  const controller = module.createComposerImageCollectionController({ getImages: () => images,
    setImages: (value) => { images = value; calls.push("set"); }, setSegment: (index, value) => { images[index] = value; calls.push("set"); },
    hasLinkCard: () => blocked, maxImages: 2, translate: (key) => key, setStatus: (message) => calls.push(message),
    persist: async () => calls.push("persist"), render: () => calls.push("render"), saveDraft: () => calls.push("save") });
  controller.move(9, 0, 1); controller.move(0, 0, -1); controller.move(0, 1, 1); controller.remove(9, 0);
  assert.deepEqual(calls, []);
  controller.move(0, 0, 1);
  assert.deepEqual(images[0], ["b", "a"]);
  assert.deepEqual(calls, ["set", "persist", "render", "save"]);
  calls.length = 0; blocked = true;
  assert.equal(controller.moveTo(0, 0, 1, 0), false);
  assert.deepEqual(calls, ["linkCardBlocksImages"]);
  calls.length = 0; blocked = false;
  assert.equal(controller.moveTo(0, 0, 1, 0), true);
  assert.deepEqual(images, [["a"], ["b"]]);
  assert.deepEqual(calls, ["set", "persist", "render", "save"]);
  calls.length = 0;
  assert.equal(controller.moveTo(0, 0, 0, 0), false);
  assert.deepEqual(calls, []);
  images = [["a"], ["b", "c"]];
  assert.equal(controller.moveTo(0, 0, 1, 0), false);
  assert.deepEqual(calls, ["imagesLimitReached"]);
  calls.length = 0;
  controller.remove(0, 0);
  assert.deepEqual(images, [[], ["b", "c"]]);
  assert.deepEqual(calls, ["set", "persist", "render", "save"]);
});

test("Composer drag helpers filter files and preserve horizontal/vertical insertion boundaries", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  assert.equal(module.composerEventHasTransferFiles({}), false);
  assert.equal(module.composerEventHasTransferFiles({ dataTransfer: { types: ["Files"] } }), true);
  assert.equal(module.composerEventHasTransferFiles({ dataTransfer: { files: [{}] } }), true);
  assert.equal(module.composerEventHasTransferFiles({ dataTransfer: { types: ["text/plain"] } }), false);
  assert.deepEqual(module.getComposerDroppedImageFiles({}), []);
  const image = { type: "image/png" };
  assert.deepEqual(module.getComposerDroppedImageFiles({ dataTransfer: { files: [image, { type: "text/plain" }] } }), [image]);
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  for (const [x, y, position] of [[0, 50, "before"], [100, 50, "after"], [50, 0, "before"], [50, 100, "after"], [50, 50, "after"], [90, 10, "before"]]) {
    assert.equal(module.getComposerImageDropPosition({ clientX: x, clientY: y }, rect), position);
  }
});

/**
 * Creates minimal event/class-list nodes for Composer drag binding tests.
 * @returns {object} Node with event dispatch and class tracking.
 */
function imageEventNode() {
  const handlers = new Map();
  const classes = new Set();
  return { classes, classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    addEventListener: (name, handler) => handlers.set(name, handler),
    dispatch: (name, event = {}) => handlers.get(name)(event),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }) };
}

test("Composer image-container bindings distinguish files, nested cards, append moves and drag leave", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  const container = imageEventNode();
  const parent = imageEventNode(); container.closest = () => parent;
  const calls = [];
  let state = null;
  const actions = { getDragState: () => state, hasFiles: (event) => event.files === true,
    clearMarkers: () => calls.push("markers"), getFiles: (event) => event.items || [],
    selectFiles: (index, files) => calls.push(["files", index, files]),
    moveTo: (...values) => calls.push(["move", ...values]), clearDragState: () => calls.push("clear") };
  module.bindComposerImageContainerEvents(container, 2, 3, actions);
  const event = { preventDefault: () => calls.push("prevent"), stopPropagation: () => calls.push("stop"),
    target: { closest: () => null }, dataTransfer: {} };
  container.dispatch("dragover", event);
  container.dispatch("drop", event);
  assert.deepEqual(calls, []);
  container.dispatch("dragover", { ...event, files: true });
  assert.equal(parent.classes.has("is-file-drop-target"), true);
  calls.length = 0;
  container.dispatch("drop", { ...event, files: true, items: ["file"] });
  assert.deepEqual(calls, ["prevent", "stop", "markers", ["files", 2, ["file"]]]);
  calls.length = 0;
  container.dispatch("drop", { ...event, files: true, items: [] });
  assert.deepEqual(calls, ["prevent", "stop", "markers"]);
  calls.length = 0;
  state = { segmentIndex: 0, imageIndex: 1 };
  container.dispatch("dragover", event);
  assert.equal(event.dataTransfer.dropEffect, "move");
  assert.equal(container.classes.has("is-drop-target"), true);
  calls.length = 0;
  container.dispatch("drop", { ...event, target: { closest: () => ({}) } });
  assert.deepEqual(calls, ["prevent"]);
  calls.length = 0;
  container.dispatch("drop", event);
  assert.deepEqual(calls, ["prevent", ["move", 0, 1, 2, 3], "clear"]);
  container.dispatch("dragleave", { clientX: 50, clientY: 50 });
  assert.equal(parent.classes.has("is-file-drop-target"), true);
  container.dispatch("dragleave", { clientX: 101, clientY: 50 });
  assert.equal(parent.classes.has("is-file-drop-target"), false);
});

test("Composer image-card bindings preserve drag positioning and accessible preview activation", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  const card = imageEventNode(); const preview = imageEventNode(); const container = imageEventNode();
  let state = null; let position = "before"; const calls = [];
  module.bindComposerImageCardEvents(card, preview, container, 2, 1, {
    getDragState: () => state, setDragState: (value) => { state = value; }, clearDragState: () => { state = null; calls.push("clear"); },
    getDropPosition: () => position, clearMarkers: () => calls.push("markers"),
    moveTo: (...values) => calls.push(["move", ...values]), editImage: (...values) => calls.push(["edit", ...values]),
  });
  const event = { preventDefault: () => calls.push("prevent"), stopPropagation: () => calls.push("stop"),
    dataTransfer: { setData: (...values) => calls.push(values) } };
  card.dispatch("drop", event);
  assert.deepEqual(calls, []);
  card.dispatch("dragstart", event);
  assert.deepEqual(state, { segmentIndex: 2, imageIndex: 1 });
  assert.equal(event.dataTransfer.effectAllowed, "move");
  assert.deepEqual(calls, [["text/plain", "2:1"]]);
  assert.equal(card.classes.has("is-dragging"), true);
  calls.length = 0;
  card.dispatch("dragover", event);
  assert.equal(card.classes.has("is-drop-before"), true);
  position = "after";
  card.dispatch("dragover", event);
  assert.equal(card.classes.has("is-drop-after"), true);
  calls.length = 0;
  card.dispatch("drop", event);
  assert.deepEqual(calls, ["prevent", "stop", ["move", 2, 1, 2, 2], "clear"]);
  calls.length = 0;
  preview.dispatch("click");
  preview.dispatch("keydown", { ...event, key: "Enter" });
  preview.dispatch("keydown", { ...event, key: " " });
  preview.dispatch("keydown", { ...event, key: "Escape" });
  assert.deepEqual(calls, [["edit", 2, 1], "prevent", ["edit", 2, 1], "prevent", ["edit", 2, 1]]);
});

test("Composer history entries preserve publication fallbacks, previews and image counts", async () => {
  const module = await importProjectModule("js/composer/composer-history.js");
  const options = { account: "account", service: "service", webApp: "app", createId: () => "id", now: () => "date",
    preview: module.getComposerHistoryPreviewText, buildPostUrl: (account, uri, app) => {
      if (!uri) { return ""; }
      return `${app}/${account}/${uri}`;
    } };
  assert.equal(module.buildComposerHistoryEntry({}, [], options), null);
  const entry = module.buildComposerHistoryEntry({ posts: [{ uri: "post" }] },
    [{ text: " first\nsegment ", images: [{}, {}] }, { text: "second", images: [{}] }], options);
  assert.deepEqual(entry, { id: "id", url: "app/account/post", createdAt: "date", account: "account", service: "service",
    firstSegmentText: "first segment", threadCount: 1, imageCount: 3 });
  const overridden = module.buildComposerHistoryEntry({ handle: "other", service: "other-service", webApp: "other-app", posts: [{ uri: "post" }, {}] }, [], options);
  assert.equal(overridden.url, "other-app/other/post");
  assert.equal(overridden.service, "other-service");
  assert.equal(overridden.threadCount, 2);
  assert.equal(overridden.imageCount, 0);
});

test("Composer history recording normalizes, updates and renders before awaiting persistence", async () => {
  const module = await importProjectModule("js/composer/composer-history.js");
  const calls = [];
  const entry = { id: "new" };
  const previous = { id: "old" };
  const options = { getHistory: () => [previous], normalize: (entries) => { calls.push("normalize"); assert.deepEqual(entries, [entry, previous]); return entries; },
    setHistory: (entries) => { calls.push("set"); assert.equal(entries[0], entry); }, render: () => calls.push("render"),
    persist: async () => calls.push("persist") };
  await module.recordComposerHistoryEntry(null, options);
  assert.deepEqual(calls, []);
  await module.recordComposerHistoryEntry(entry, options);
  assert.deepEqual(calls, ["normalize", "set", "render", "persist"]);
  await assert.rejects(module.recordComposerHistoryEntry(entry, { ...options, persist: async () => { throw new Error("storage failed"); } }), /storage failed/);
});

test("Composer history actions preserve navigation, continuation, delete and failure ordering", async () => {
  const module = await importProjectModule("js/composer/composer-history.js");
  const entry = { id: "id", url: "url" };
  for (const fail of [false, true]) {
    const calls = [];
    const options = { translate: (key) => key, setBusy: (button, busy) => calls.push([button, busy]),
      openPost: async (url) => { assert.equal(url, "url"); calls.push("open"); if (fail) { throw new Error("failed"); } },
      closeDialog: () => calls.push("close"), showError: (message) => calls.push(["error", message]), reportError: () => calls.push("report"),
      requestTarget: async (url, mode) => { assert.equal(url, "url"); assert.equal(mode, "thread"); calls.push("request"); if (fail) { throw new Error("failed"); } return "target"; },
      applyTarget: (target) => calls.push(["apply", target]), showComposer: () => calls.push("composer"),
      setStatus: (message, tone) => calls.push(["status", message, tone]), remove: (id) => calls.push(["remove", id]),
      render: () => calls.push("render"), persist: async () => calls.push("persist") };
    const actions = module.createComposerHistoryItemActions(entry, { threadExplorerButton: "explorer", continueButton: "continue" }, options);
    await actions.threadExplorerClick();
    if (fail) { assert.deepEqual(calls, [["explorer", true], "open", "report", ["error", "failed"], ["explorer", false]]); }
    else { assert.deepEqual(calls, [["explorer", true], "open", "close", ["explorer", false]]); }
    calls.length = 0;
    await actions.continueClick();
    if (fail) { assert.deepEqual(calls, [["continue", true], "request", "report", ["status", "failed", "error"], ["error", "failed"], ["continue", false]]); }
    else { assert.deepEqual(calls, [["continue", true], "request", ["apply", "target"], "close", "composer", ["status", "replyTargetThreadReady", undefined], ["continue", false]]); }
    calls.length = 0;
    await actions.deleteClick();
    assert.deepEqual(calls, [["remove", "id"], "render", "persist", ["status", "historyDeleted", undefined]]);
    calls.length = 0;
    options.persist = async () => { throw new Error("storage failed"); };
    await assert.rejects(actions.deleteClick(), /storage failed/);
    assert.deepEqual(calls, [["remove", "id"], "render"]);
  }
});

test("Composer publish result models preserve one/many labels, account fallbacks and empty links", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  const options = { account: "fallback", webApp: "fallback-app", getTargetName: (app) => app,
    translate: (key, values) => ({ key, values }), formatRateLimit: (value, include) => { assert.equal(include, true); return value || ""; },
    buildPostUrl: (handle, uri, app) => {
      if (!uri) { return ""; }
      return `${app}/${handle}/${uri}`;
    } };
  const single = module.buildComposerPublishResultModel({ posts: [{ uri: "post" }], rateLimit: "limit" }, options);
  assert.deepEqual(single.message, { key: "publishResultMessageOneTarget", values: { target: "fallback-app" } });
  assert.equal(single.postUrl, "fallback-app/fallback/post");
  assert.equal(single.rateLimitMessage, "limit");
  const many = module.buildComposerPublishResultModel({ posts: [{ uri: "first" }, {}], handle: "own", webApp: "app" }, options);
  assert.equal(many.message.key, "publishResultMessageManyTarget");
  assert.equal(many.postUrl, "app/own/first");
  const empty = module.buildComposerPublishResultModel({}, options);
  assert.equal(empty.postUrl, "");
  assert.equal(empty.message.key, "publishResultMessageOneTarget");
});

test("Composer published-post navigation handles empty targets, success and failure with busy cleanup", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  for (const fail of [false, true]) {
    const calls = [];
    const button = { dataset: { postUrl: " https://example.org/post " } };
    const elements = { explorerButton: button, dialog: { close: () => calls.push("close") } };
    const options = { translate: (key) => key, setBusy: (node, busy) => { assert.equal(node, button); calls.push(busy); },
      openPost: async (url) => { assert.equal(url, "https://example.org/post"); calls.push("open"); if (fail) { throw new Error("failure"); } },
      reportError: () => calls.push("report"), showError: (message) => calls.push(message) };
    await module.openComposerPublishedPost({ ...elements, explorerButton: null }, options);
    assert.deepEqual(calls, []);
    await module.openComposerPublishedPost(elements, options);
    if (fail) {
      assert.deepEqual(calls, [true, "open", "report", "failure", false]);
    } else {
      assert.deepEqual(calls, [true, "open", "close", false]);
    }
    calls.length = 0;
    button.dataset.postUrl = "  ";
    await module.openComposerPublishedPost(elements, options);
    assert.deepEqual(calls, []);
  }
});

test("Composer publish result renderer handles optional notes/buttons and toggles stale link state", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  let opens = 0;
  const elements = { dialog: { showModal: () => { opens += 1; } }, text: {}, link: {},
    rateLimitNote: {}, explorerButton: { dataset: {} } };
  const model = { message: "published", rateLimitMessage: "limit", postUrl: "https://example.org/post", explorerLabel: "Explorer" };
  module.renderComposerPublishResult(model, elements);
  assert.equal(elements.rateLimitNote.textContent, "limit");
  assert.equal(elements.rateLimitNote.hidden, false);
  assert.equal(elements.explorerButton.disabled, false);
  module.renderComposerPublishResult({ ...model, postUrl: "", rateLimitMessage: "" }, elements);
  assert.equal(elements.link.hidden, true);
  assert.equal(elements.link.href, "#");
  assert.equal(elements.explorerButton.disabled, true);
  assert.equal(elements.explorerButton.dataset.postUrl, "");
  assert.equal(elements.rateLimitNote.hidden, true);
  assert.doesNotThrow(() => module.renderComposerPublishResult(model, { ...elements, rateLimitNote: null, explorerButton: null }));
  assert.equal(opens, 3);
});

test("Composer publication result handlers record before clearing state and preserve drafts on failure", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  for (const count of [1, 2]) {
    const calls = [];
    let finishRecord;
    const segments = [{ text: "post" }];
    const result = { posts: Array.from({ length: count }, () => ({})), rateLimit: "limit" };
    const handlers = module.createComposerPublishResultHandlers({
      setRateLimit: (value) => calls.push(["limit", value]), record: async (value, prepared) => {
        assert.equal(value, result); assert.equal(prepared, segments); calls.push("record");
        await new Promise((resolve) => { finishRecord = resolve; });
      }, clearReply: () => calls.push("clear"), setPosted: (value) => calls.push(["posted", value]),
      saveDraft: () => calls.push("save"), translate: (key, values) => ({ key, values }),
      setStatus: (message, tone) => calls.push(["status", message, tone]), showResult: (value) => { assert.equal(value, result); calls.push("result"); },
      reportError: () => calls.push("report"), formatError: (error) => error.message, showError: (message) => calls.push(["error", message]),
    });
    const pending = handlers.success(result, segments);
    assert.deepEqual(calls, [["limit", "limit"], "record"]);
    finishRecord(); await pending;
    assert.deepEqual(calls.slice(2, 5), ["clear", ["posted", true], "save"]);
    const status = calls[5][1];
    if (count === 1) { assert.equal(status.key, "statusPublishedOne"); }
    else { assert.deepEqual(status, { key: "statusPublishedMany", values: { count } }); }
    assert.equal(calls[6], "result");
    calls.length = 0;
    const error = new Error("failed"); error.details = { rateLimit: "failed-limit" };
    await handlers.failure(error);
    assert.deepEqual(calls, ["report", ["limit", "failed-limit"], ["status", "failed", "error"], ["error", "failed"]]);
  }
});

test("Composer publish preflight preserves error priority and exact length boundaries", async () => {
  const module = await importProjectModule("js/composer/composer-validation.js");
  const valid = { sourceText: "text", countGraphemes: (text) => text.length, composerLimit: 10,
    getSegments: () => [{ text: "text", images: [] }], getMetrics: (text) => ({ graphemeCount: text.length, utf8ByteCount: text.length }),
    postLimit: 4, byteLimit: 4, altTextRequired: false, autoResize: true, online: true };
  const cases = [
    [{}, "", false, false],
    [{ sourceText: "   ", getSegments: () => { throw new Error("must not read segments"); } }, "statusNeedText", false, false],
    [{ sourceText: "01234567890", getSegments: () => { throw new Error("must not read segments"); } }, "composerTextTooLong", true, false],
    [{ sourceText: "0123456789" }, "", false, false],
    [{ getSegments: () => [{ text: "", images: [] }], online: false }, "statusEmptySegments", false, false],
    [{ postLimit: 3 }, "statusSegmentTooLong", false, false],
    [{ byteLimit: 3 }, "statusSegmentTooLong", false, false],
    [{ altTextRequired: true, getSegments: () => [{ text: "ok", images: [{ alt: "  ", validation: { tooBig: true } }] }], autoResize: false }, "statusAltTextRequired", false, false],
    [{ autoResize: false, getSegments: () => [{ text: "ok", images: [{ alt: "ALT", validation: { tooBig: true } }] }] }, "statusImageTooLarge", false, true],
    [{ autoResize: true, getSegments: () => [{ text: "ok", images: [{ validation: { tooBig: true } }] }] }, "", false, false],
    [{ online: false }, "statusOfflineBeforePublish", false, true],
  ];
  for (const [changes, errorKey, warnInput, showDialog] of cases) {
    const result = module.validateComposerPublishInput({ ...valid, ...changes });
    assert.deepEqual([result.errorKey, result.warnInput, result.showDialog], [errorKey, warnInput, showDialog]);
  }
  const segments = valid.getSegments();
  assert.equal(module.validateComposerPublishInput({ ...valid, getSegments: () => segments }).segments, segments);
});

test("Composer publish confirmations preserve sequence, previews and cancellation at each stage", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  for (const mode of [null, "post", "thread"]) {
    for (const hasHashtags of [true, false]) {
      const expected = [];
      if (!hasHashtags) { expected.push("publishNoHashtagTitle"); }
      if (mode === "post") { expected.push("publishConfirmReplyTargetTitle"); }
      if (mode === "thread") { expected.push("publishConfirmThreadContinuationTitle"); }
      expected.push("publishConfirmTitle");
      for (const cancelAt of [-1, ...expected.map((_value, index) => index)]) {
        const calls = [];
        const options = { translate: (key, values) => ({ key, values }), hasHashtags: () => hasHashtags,
          getReplyTarget: () => {
            if (!mode) { return null; }
            return { ...replyTargetFixture(), mode };
          }, getReplyTargetName: () => "Other", getAccount: () => "account", getPostTargetName: () => "Bluesky",
          confirm: async (model) => { calls.push(model); return calls.length - 1 !== cancelAt; } };
        assert.equal(await module.confirmComposerPublication(options), cancelAt === -1);
        let count = expected.length;
        if (cancelAt >= 0) { count = cancelAt + 1; }
        assert.deepEqual(calls.map((model) => model.title.key), expected.slice(0, count));
        const reply = calls.find((model) => model.title.key === "publishConfirmReplyTargetTitle");
        if (reply) { assert.deepEqual(reply.preview, { avatar: undefined, name: "Other", handle: "other.test" }); }
      }
    }
  }
  let final;
  assert.equal(await module.confirmComposerPublication({ translate: (key, values) => ({ key, values }),
    hasHashtags: () => true, getReplyTarget: () => null, getAccount: () => "", getPostTargetName: () => "Bluesky",
    confirm: async (model) => { final = model; return null; } }), false);
  assert.equal(final.message.values.account, "?");
});

test("Composer publish payload contains only required reply fields and preserves upload objects", async () => {
  const module = await importProjectModule("js/composer/composer-publishing.js");
  const segments = [{ text: "post", images: [{ blob: "upload" }] }];
  const settings = { langs: ["de"], postInteraction: { allow: "all" } };
  assert.deepEqual(module.buildComposerPublishPayload(segments, settings), { segments, ...settings, replyTarget: null });
  for (const mode of ["post", "thread"]) {
    const target = { ...replyTargetFixture(), mode };
    const payload = module.buildComposerPublishPayload(segments, { ...settings, replyTarget: target });
    assert.equal(payload.segments, segments);
    assert.equal(payload.langs, settings.langs);
    assert.deepEqual(payload.replyTarget, { mode, replyRoot: target.replyRoot, replyParent: target.replyParent });
    assert.equal(payload.replyTarget.targetAccount, undefined);
    assert.equal(payload.replyTarget.targetPost, undefined);
  }
});

test("Composer live-post reply targets preserve parent/root references and preview fields", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  const options = { normalize: module.normalizeComposerReplyTarget, buildWebUrl: () => "https://bsky.app/post" };
  for (const invalid of [null, {}, { uri: "post" }, { cid: "cid" }]) {
    assert.equal(module.buildComposerReplyTargetFromPost(invalid, options), null);
  }
  const post = { uri: " post ", cid: " cid ", text: " reply ", indexedAt: " date ", author: { handle: " own.test " } };
  const target = module.buildComposerReplyTargetFromPost(post, options);
  assert.deepEqual(target.replyRoot, { uri: "post", cid: "cid" });
  assert.deepEqual(target.replyParent, target.replyRoot);
  assert.equal(target.targetPost.text, "reply");
  assert.equal(target.targetPost.createdAt, "date");
  assert.equal(target.targetAccount.handle, "own.test");
  assert.equal(target.sourceUrl, "https://bsky.app/post");
  const nested = module.buildComposerReplyTargetFromPost({ ...post, reply: { root: { uri: "root", cid: "root-cid" } } }, options);
  assert.deepEqual(nested.replyRoot, { uri: "root", cid: "root-cid" });
  assert.deepEqual(nested.replyParent, target.replyParent);
  const incomplete = module.buildComposerReplyTargetFromPost({ ...post, reply: { root: { uri: "root" } } }, { ...options, buildWebUrl: () => null });
  assert.deepEqual(incomplete.replyRoot, target.replyRoot);
  assert.equal(incomplete.sourceUrl, "");
});

test("Composer reply handoff round-trips URL and session payloads without losing unrelated query state", async () => {
  const module = await importProjectModule("js/composer/composer-page.js");
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const storage = createMemoryStorage();
  let href = "https://example.org/?keep=1#composer";
  const handoff = module.createComposerReplyHandoff({ normalize: dialogs.normalizeComposerReplyTarget,
    getStorage: () => storage, getHref: () => href, replaceUrl: (value) => { href = value; }, queryKey: "reply", storageKey: "pending" });
  const target = dialogs.normalizeComposerReplyTarget({ ...replyTargetFixture(), targetPost: { text: "Grüße % & 🐦" } });
  const url = new URL(href);
  url.searchParams.set("reply", handoff.encode(target));
  href = url.toString();
  assert.deepEqual(handoff.consumeUrl(), target);
  assert.equal(href, "https://example.org/?keep=1#composer");
  assert.equal(handoff.consumeUrl(), null);
  assert.equal(handoff.encode(null), "");
  handoff.persist(target);
  assert.deepEqual(handoff.read(), target);
  assert.deepEqual(handoff.consumeStored(), target);
  assert.equal(handoff.read(), null);
  handoff.persist(target);
  handoff.persist({});
  assert.equal(storage.getItem("pending"), null);
});

test("Composer reply handoff clears malformed payloads and tolerates restricted storage", async () => {
  const module = await importProjectModule("js/composer/composer-page.js");
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const storage = createMemoryStorage({ pending: "not JSON" });
  let href = "https://example.org/?reply=%25broken&keep=1";
  const options = { normalize: dialogs.normalizeComposerReplyTarget, getStorage: () => storage,
    getHref: () => href, replaceUrl: (value) => { href = value; }, queryKey: "reply", storageKey: "pending" };
  const handoff = module.createComposerReplyHandoff(options);
  assert.equal(handoff.consumeUrl(), null);
  assert.equal(href, "https://example.org/?keep=1");
  assert.equal(handoff.consumeStored(), null);
  assert.equal(storage.getItem("pending"), null);
  const restricted = module.createComposerReplyHandoff({ ...options, getStorage: () => { throw new Error("blocked"); } });
  assert.doesNotThrow(() => restricted.persist(replyTargetFixture()));
  assert.doesNotThrow(() => restricted.persist(null));
  assert.equal(restricted.read(), null);
  assert.equal(restricted.consumeStored(), null);
  const cyclic = {}; cyclic.self = cyclic;
  assert.equal(module.createComposerReplyHandoff({ ...options, normalize: (target) => target }).encode(cyclic), "");
});

test("Composer reply opening separates local UI updates from cross-page navigation", async () => {
  const module = await importProjectModule("js/composer/composer-page.js");
  for (const local of [true, false]) {
    const calls = [];
    const target = replyTargetFixture();
    let navigation = "";
    const actions = {
      showError: () => calls.push("error"), setTarget: (value) => { assert.equal(value, target); calls.push("target"); },
      isComposerPage: () => local, persistTarget: (value) => { assert.equal(value, target); calls.push("persist"); },
      getComposerUrl: () => "/?_density=normal", getHref: () => "https://example.org/tools.html",
      encodeTarget: () => "encoded", queryKey: "reply", persistNavigation: (value) => { navigation = value; calls.push("navigation"); },
      navigate: (value) => { assert.equal(value, navigation); calls.push("navigate"); },
      showWorkspace: () => calls.push("workspace"), refresh: () => calls.push("refresh"),
      saveDraft: () => calls.push("save"), showReady: () => calls.push("ready"),
    };
    module.openComposerReplyTarget(null, actions);
    assert.deepEqual(calls, ["error"]);
    calls.length = 0;
    module.openComposerReplyTarget(target, actions);
    if (local) {
      assert.deepEqual(calls, ["target", "workspace", "refresh", "save", "ready"]);
    } else {
      assert.deepEqual(calls, ["target", "persist", "navigation", "navigate"]);
      assert.equal(navigation, "https://example.org/?_density=normal&reply=encoded");
      actions.encodeTarget = () => "";
      module.openComposerReplyTarget(target, actions);
      assert.equal(navigation, "https://example.org/?_density=normal");
    }
  }
});

/**
 * Creates a normalized reply target for controller tests.
 * @returns {object} Own-thread target with a continuation post.
 */
function replyTargetFixture() {
  return { mode: "post", targetAccount: { did: "other", handle: "other.test", displayName: "Other" },
    rootAccount: { did: "own", handle: "own.test", displayName: "Own", avatar: "avatar" },
    targetPost: { uri: "child", cid: "c", text: "reply" }, rootPost: { uri: "root", cid: "r", text: "root" },
    lastOwnPost: { uri: "last", cid: "l" }, replyParent: { uri: "child", cid: "c" }, replyRoot: { uri: "root", cid: "r" } };
}

test("Composer reply-target names and own-thread choice use normalized account/mode", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  const target = replyTargetFixture();
  assert.equal(module.getComposerReplyTargetDisplayName(null), "");
  assert.equal(module.getComposerReplyTargetDisplayName(target), "Other");
  assert.equal(module.getComposerReplyTargetDisplayName({ ...target, mode: "thread" }), "Own");
  assert.equal(module.getComposerReplyTargetDisplayName({ ...target, targetAccount: { did: "did", handle: "handle" } }), "handle");
  assert.equal(module.isComposerOwnThreadReplyTarget(target, "own"), true);
  assert.equal(module.isComposerOwnThreadReplyTarget(target, "other"), false);
  assert.equal(module.isComposerOwnThreadReplyTarget({ ...target, mode: "thread" }, "own"), false);
  assert.equal(module.isComposerOwnThreadReplyTarget({ ...target, lastOwnPost: null }, "own"), false);
  assert.equal(module.isComposerOwnThreadReplyTarget(null, "own"), false);
});

test("Composer reply-target resolution preserves continuation choice and update order", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  for (const choice of ["post", "thread", null]) {
    let current = null;
    const calls = [];
    const controller = module.createComposerReplyTargetController({
      request: async (url, mode) => { calls.push([url, mode]); return replyTargetFixture(); }, normalize: (value) => value,
      getAccountDid: () => "own", translate: (key) => key, confirm: async (model) => {
        assert.equal(model.message, "replyTargetOwnThreadChoiceMiddleText");
        assert.equal(model.preview.name, "Other");
        return choice;
      }, setTarget: (value) => { current = value; calls.push("set"); }, getTarget: () => current,
      refresh: () => calls.push("refresh"), saveDraft: () => calls.push("save"),
    });
    const result = await controller.resolve("url");
    if (choice === null) {
      assert.equal(result, null);
      assert.deepEqual(calls, [["url", "post"]]);
    } else {
      assert.equal(result.mode, choice);
      if (choice === "thread") { assert.deepEqual(result.replyParent, { uri: "last", cid: "l" }); }
      assert.deepEqual(calls, [["url", "post"], "set", "refresh", "save"]);
    }
  }
});

test("Composer reply-target clear and newer requests invalidate delayed results and confirmations", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  const pending = [];
  const confirmations = [];
  let current = null;
  const calls = [];
  const controller = module.createComposerReplyTargetController({
    request: () => new Promise((resolve) => pending.push(resolve)), normalize: (value) => value,
    getAccountDid: () => "own", translate: (key) => key,
    confirm: () => new Promise((resolve) => confirmations.push(resolve)),
    setTarget: (value) => { current = value; }, getTarget: () => current,
    persistPending: (value) => calls.push(["persist", value]), resetDialog: () => calls.push("reset"),
    refresh: () => calls.push("refresh"), saveDraft: () => calls.push("save"),
  });
  const old = controller.resolve("old");
  const latest = controller.resolve("latest");
  pending[0](replyTargetFixture());
  assert.equal(await old, null);
  pending[1](replyTargetFixture());
  await Promise.resolve();
  controller.clear({ render: false });
  confirmations[0]("thread");
  assert.equal(await latest, null);
  assert.equal(current, null);
  assert.deepEqual(calls, [["persist", null], "reset"]);
  const clearing = controller.resolve("clearing");
  controller.clear();
  pending[2](replyTargetFixture());
  assert.equal(await clearing, null);
  assert.equal(calls.at(-1), "refresh");
});

test("Composer reply dialog handles missing URLs, cancellation and errors with busy cleanup", async () => {
  const module = await importProjectModule("js/composer/composer-dialogs.js");
  for (const outcome of ["missing", "cancel", "thread", "error"]) {
    const calls = [];
    const elements = { input: { value: " url " }, status: { dataset: {} }, submit: {},
      dialog: { close() { calls.push("close"); }, showModal() { calls.push("open"); } } };
    const controller = module.createComposerReplyTargetDialogController(elements, {
      translate: (key) => key, setBusy: (_button, busy) => calls.push(busy), setStatus: (text) => calls.push(text),
      reportError: () => calls.push("error"), resolve: async (url, mode) => {
        assert.equal(url, "url"); assert.equal(mode, "post");
        if (outcome === "error") { throw new Error("failed"); }
        if (outcome === "cancel") { return null; }
        return { mode: "thread" };
      },
    });
    if (outcome === "missing") { elements.input.value = " "; }
    await controller.submit();
    if (outcome === "missing") { assert.deepEqual(calls, []); assert.equal(elements.status.textContent, "replyTargetUrlMissing"); }
    if (outcome === "cancel") { assert.deepEqual(calls, [true, false]); assert.equal(elements.status.hidden, true); }
    if (outcome === "thread") { assert.deepEqual(calls, [true, "replyTargetThreadReady", "close", false]); }
    if (outcome === "error") { assert.deepEqual(calls, [true, "error", false]); assert.equal(elements.status.dataset.tone, "error"); }
    controller.reset();
    assert.equal(elements.input.value, "");
    assert.equal(elements.status.dataset.tone, undefined);
  }
  const optional = module.createComposerReplyTargetDialogController({}, {});
  optional.reset(); optional.close(); optional.open();
});

test("Composer remote images validate URLs, responses and MIME before data conversion", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const calls = [];
  const blob = new Blob(["a"], { type: "image/png" });
  const options = { fetch: async (url, flags) => { calls.push([url, flags]); return { ok: true, blob: async () => blob }; },
    fileToDataUrl: async (value) => { assert.equal(value, blob); calls.push("convert"); return "data:image/png;base64,YQ=="; },
    translate: (key, values) => `${key}:${JSON.stringify(values || {})}` };
  assert.deepEqual(await module.fetchComposerLinkCardImage(" https://example.org/a.png ", options), {
    imageDataUrl: "data:image/png;base64,YQ==", imageMimeType: "image/png" });
  assert.deepEqual(calls, [["https://example.org/a.png", { method: "GET", mode: "cors" }], "convert"]);
  calls.length = 0;
  for (const value of [null, "", "javascript:alert(1)", "data:image/png;base64,YQ=="]) {
    await assert.rejects(module.fetchComposerLinkCardImage(value, options), /linkCardImageInvalidUrl/);
  }
  assert.deepEqual(calls, []);
  await assert.rejects(module.fetchComposerLinkCardImage("https://example.org", { ...options,
    fetch: async () => ({ ok: false, status: 404 }) }), /linkCardImageLoadFailed.*404/);
  for (const type of ["text/html", ""]) {
    await assert.rejects(module.fetchComposerLinkCardImage("https://example.org", { ...options,
      fetch: async () => ({ ok: true, blob: async () => new Blob(["a"], { type }) }),
      fileToDataUrl: async () => assert.fail("non-image conversion"),
    }), /linkCardImageUnexpectedType/);
  }
  await assert.rejects(module.fetchComposerLinkCardImage("https://example.org", { ...options,
    fetch: async () => { throw new Error("offline"); } }), /offline/);
});

test("Composer link-card routing calls only the effective provider and propagates failures", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  for (const provider of ["proxy", "micro", "none", "unknown"]) {
    const calls = [];
    const options = { getProvider: () => provider, providers: { proxy: "proxy", microlink: "micro" },
      proxy: async (url) => { calls.push(["proxy", url]); return "proxy-card"; },
      microlink: async (url) => { calls.push(["micro", url]); return "micro-card"; },
      basic: (url) => { calls.push(["basic", url]); return null; } };
    let expected = "basic";
    if (provider === "proxy" || provider === "micro") { expected = provider; }
    const result = await module.requestComposerLinkCard("url", options);
    assert.deepEqual(calls, [[expected, "url"]]);
    if (expected === "basic") { assert.equal(result, null); }
    else { assert.equal(result, `${expected}-card`); }
  }
  await assert.rejects(module.requestComposerLinkCard("url", {
    getProvider: () => "proxy", providers: { proxy: "proxy", microlink: "micro" },
    proxy: async () => { throw new Error("provider failed"); }, basic: () => assert.fail("fallback after failure"),
  }), /provider failed/);
});

test("Composer link-card image diagnostics have all three translations and placeholders", async () => {
  const { translations } = await importProjectModule("js/core/app-translations.js");
  for (const locale of ["de", "en", "fr"]) {
    for (const key of ["linkCardImageInvalidUrl", "linkCardImageLoadFailed", "linkCardImageUnexpectedType", "linkCardImageUnknownType"]) {
      assert.equal(typeof translations[locale][key], "string");
      assert.ok(translations[locale][key].length > 0);
    }
    assert.ok(translations[locale].linkCardImageLoadFailed.includes("{status}"));
    assert.ok(translations[locale].linkCardImageUnexpectedType.includes("{type}"));
  }
});

test("Composer proxy signatures match HMAC-SHA-256 and preserve payload boundaries", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const { createHmac, webcrypto } = require("node:crypto");
  for (const [url, timestamp, nonce, secret] of [
    ["https://example.org/a?x=1", "1234", "nonce", "secret"],
    ["https://example.org/😀", "0", "", "sëcret"],
  ]) {
    const signature = await module.signComposerLinkCardRequest(url, timestamp, nonce, secret, webcrypto.subtle);
    assert.equal(signature, createHmac("sha256", secret).update(`${url}\n${timestamp}\n${nonce}`).digest("hex"));
    assert.match(signature, /^[0-9a-f]{64}$/);
  }
  await assert.rejects(module.signComposerLinkCardRequest("url", "1", "nonce", "key", {
    importKey: async () => { throw new Error("crypto unavailable"); },
  }), /crypto unavailable/);
});

test("Composer provider payload helpers preserve image defaults and localized errors", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const t = (key) => key;
  assert.equal(module.composerLinkCardImageToDataUrl(), "");
  assert.equal(module.composerLinkCardImageToDataUrl({ bytesBase64: " YQ== " }), "data:image/jpeg;base64,YQ==");
  assert.equal(module.composerLinkCardImageToDataUrl({ bytesBase64: "YQ==", mimeType: "image/png" }), "data:image/png;base64,YQ==");
  for (const payload of [{ code: "THREADLINE_SIGNATURE_INVALID" }, { code: "threadline_signature_missing" },
    { message: " Invalid signature. " }, { message: "missing or expired signature." }]) {
    assert.equal(module.getComposerLinkCardProxyErrorMessage({ status: 400 }, payload, t), "linkCardProxyAuthFailed");
  }
  assert.equal(module.getComposerLinkCardProxyErrorMessage({ status: 401 }, null, t), "linkCardProxyAuthFailed");
  assert.equal(module.getComposerLinkCardProxyErrorMessage({ status: 500 }, { message: "detail" }, t), "detail");
  assert.equal(module.getComposerLinkCardProxyErrorMessage({ status: 500 }, { code: "code" }, t), "code");
  assert.equal(module.getComposerLinkCardProxyErrorMessage({ status: 500 }, null, t), "linkCardProxyFailed");
  assert.equal(module.getComposerMicrolinkErrorMessage({ status: 429 }, { message: "detail" }, t), "linkCardMicrolinkLimitReached");
  assert.equal(module.getComposerMicrolinkErrorMessage(null, { description: " detail " }, t), "detail");
  assert.equal(module.getComposerMicrolinkErrorMessage(null, null, t), "linkCardMicrolinkFailed");
});

test("Composer proxy adapter signs headers and normalizes successful and malformed responses", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const calls = [];
  const options = { endpoint: "https://proxy.example/api", secret: "secret", now: () => 1234567,
    randomUUID: () => "nonce", sign: async (...args) => { calls.push(args); return "signature"; },
    fetch: async (url, request) => { calls.push([url, request]); return { ok: true, json: async () => ({ finalUrl: "https://final.example", image: { bytesBase64: "YQ==" } }) }; },
    getErrorMessage: () => "proxy failure", normalize: (card) => card, imageToDataUrl: module.composerLinkCardImageToDataUrl };
  const card = await module.requestComposerLinkCardFromProxy("https://target.example", options);
  assert.deepEqual(calls[0], ["https://target.example", "1234", "nonce", "secret"]);
  assert.deepEqual(calls[1][1].headers, { "content-type": "application/json", "x-threadline-timestamp": "1234", "x-threadline-nonce": "nonce", "x-threadline-signature": "signature" });
  assert.equal(calls[1][1].body, '{"url":"https://target.example"}');
  assert.equal(card.url, "https://final.example");
  assert.equal(card.imageDataUrl, "data:image/jpeg;base64,YQ==");
  const malformed = await module.requestComposerLinkCardFromProxy("https://target.example", { ...options,
    fetch: async () => ({ ok: true, json: async () => { throw new Error("JSON"); } }) });
  assert.equal(malformed.url, "https://target.example");
  await assert.rejects(module.requestComposerLinkCardFromProxy("url", { ...options,
    fetch: async () => ({ ok: false, json: async () => ({}) }) }), /proxy failure/);
  await assert.rejects(module.requestComposerLinkCardFromProxy("url", { ...options,
    sign: async () => { throw new Error("sign failed"); }, fetch: async () => { assert.fail("fetch after signing failure"); } }), /sign failed/);
});

test("Composer Microlink adapter records responses and tolerates image fetch failures", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const calls = [];
  const options = { fetch: async (url) => { calls.push(url); return { ok: true, json: async () => ({ data: { title: "Title", image: { url: "https://image.example/a.png" } } }) }; },
    recordUsage: async () => { calls.push("usage"); }, getErrorMessage: () => "rate limit", failedMessage: "failed",
    fetchImage: async () => { throw new Error("image blocked"); }, normalize: (card) => card };
  const card = await module.requestComposerLinkCardFromMicrolink("https://target.example/?x=a b", options);
  assert.equal(calls[0], "https://api.microlink.io/?url=https%3A%2F%2Ftarget.example%2F%3Fx%3Da%20b");
  assert.equal(calls[1], "usage");
  assert.equal(card.imageUrl, "https://image.example/a.png");
  assert.equal(card.imageDataUrl, "");
  const withImage = await module.requestComposerLinkCardFromMicrolink("url", { ...options,
    fetchImage: async () => ({ imageDataUrl: "data:image/png;base64,YQ==", imageMimeType: "image/png" }) });
  assert.equal(withImage.imageMimeType, "image/png");
  await assert.rejects(module.requestComposerLinkCardFromMicrolink("url", { ...options,
    fetch: async () => ({ ok: false, json: async () => ({}) }) }), /rate limit/);
  await assert.rejects(module.requestComposerLinkCardFromMicrolink("url", { ...options,
    fetch: async () => ({ ok: true, json: async () => { throw new Error("JSON"); } }) }), /failed/);
  await assert.rejects(module.requestComposerLinkCardFromMicrolink("url", { ...options, normalize: () => null }), /failed/);
  calls.length = 0;
  await assert.rejects(module.requestComposerLinkCardFromMicrolink("url", { ...options,
    fetch: async () => { throw new Error("offline"); } }), /offline/);
  assert.deepEqual(calls, []);
});

test("Composer proxy validation preserves empty, incomplete and endpoint-path results", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const validate = (endpoint, secret) => module.validateComposerLinkCardProxySettings(endpoint, secret, (key) => key);
  assert.deepEqual(validate(null, null), { ok: true, message: "", tone: "", isEmpty: true });
  for (const [endpoint, secret] of [["", "secret"], ["https://example.org", ""]]) {
    assert.deepEqual(validate(endpoint, secret), { ok: false, message: "", tone: "", isEmpty: true });
  }
  for (const endpoint of ["not a URL", "ftp://example.org", "http://[invalid"]) {
    assert.deepEqual(validate(endpoint, "secret"), { ok: false, message: "linkCardProxyInvalidEndpoint", tone: "error", isEmpty: false });
  }
  assert.equal(validate("https://example.org/wrong", "secret").message, "linkCardProxyUnexpectedEndpoint");
  for (const endpoint of ["example.org/wp-json/threadline/v1/link-card", "https://example.org/wp-json/threadline/v1/link-card/", "http://localhost/wp-json/threadline/v1/link-card"]) {
    assert.deepEqual(validate(endpoint, " secret "), { ok: true, message: "linkCardSettingsSaved", tone: "", isEmpty: false });
  }
});

test("Composer proxy settings controller reads, normalizes and presents field validation", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  let validity = "";
  let syncs = 0;
  const elements = { endpoint: { value: "example.org/wp-json/threadline/v1/link-card", setCustomValidity(value) { validity = value; } },
    secret: { value: " secret " }, status: { dataset: {} } };
  const options = { translate: (key) => key, syncProvider: () => { syncs += 1; } };
  const controller = module.createComposerProxySettingsController(elements, options);
  assert.equal(controller.settings().secret, "secret");
  assert.equal(controller.isConfigured(), true);
  controller.normalizeInputs();
  assert.equal(elements.endpoint.value, "https://example.org/wp-json/threadline/v1/link-card");
  elements.endpoint.value = "https://example.org/wrong";
  assert.equal(controller.updateStatus().ok, false);
  assert.equal(validity, "linkCardProxyUnexpectedEndpoint");
  assert.equal(elements.status.dataset.tone, "error");
  assert.equal(elements.status.hidden, false);
  elements.endpoint.value = "https://example.org/wp-json/threadline/v1/link-card";
  controller.updateStatus({ show: false });
  assert.equal(validity, "");
  assert.equal(elements.status.hidden, true);
  assert.equal(elements.status.dataset.tone, undefined);
  elements.secret.value = "";
  assert.equal(controller.isConfigured(), false);
  controller.updateStatus();
  assert.equal(validity, "");
  assert.equal(elements.status.hidden, true);
  assert.equal(syncs, 3);
  const optional = module.createComposerProxySettingsController({}, options);
  optional.normalizeInputs();
  assert.deepEqual(optional.settings(), { endpoint: "", secret: "" });
  assert.equal(optional.isConfigured(), false);
  assert.equal(optional.updateStatus().isEmpty, true);
  assert.equal(syncs, 3);
});

test("Composer provider availability preserves proxy fallback and metadata-free cards", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  let provider = "proxy";
  let configured = false;
  let budget = false;
  const controller = module.createComposerProviderAvailabilityController({
    providers: { proxy: "proxy", microlink: "micro", none: "none" }, getProvider: () => provider,
    normalizeProvider: (value) => module.normalizeComposerLinkCardProvider(value, "proxy", "micro", "none"),
    isProxyConfigured: () => configured, canUseMicrolink: () => budget,
  });
  assert.equal(controller.active(), "none");
  assert.equal(controller.canCreate(), true);
  configured = true;
  assert.equal(controller.active(), "proxy");
  assert.equal(controller.canCreate(), true);
  provider = "micro";
  assert.equal(controller.canCreate(), false);
  budget = true;
  assert.equal(controller.canCreate(), true);
  provider = "invalid";
  assert.equal(controller.active(), "none");
  assert.equal(controller.canCreate(), true);
});

test("Composer provider usage resets daily, enforces budget and records before persistence", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  let today = "2026-10-08";
  let usage = { date: today, count: 24 };
  let fail = false;
  const saved = [];
  const controller = module.createComposerProviderUsageController({
    getUsage: () => usage, setUsage: (value) => { usage = value; }, getToday: () => today,
    limit: 25, persist: async () => {
      saved.push({ ...usage });
      if (fail) { throw new Error("storage"); }
    },
  });
  assert.equal(controller.canUse(), true);
  assert.equal(controller.remaining(), 1);
  await controller.record();
  assert.deepEqual(saved, [{ date: today, count: 25 }]);
  assert.equal(controller.canUse(), false);
  assert.equal(controller.remaining(), 0);
  fail = true;
  await assert.rejects(controller.record(), /storage/);
  assert.equal(usage.count, 26);
  assert.equal(controller.remaining(), 0);
  today = "2026-10-09";
  assert.deepEqual(controller.state(), { date: today, count: 0 });
  assert.equal(controller.canUse(), true);
  assert.deepEqual(controller.normalize(null), { date: today, count: 0 });
  assert.deepEqual(controller.normalize({ date: today, count: "invalid" }), { date: today, count: 0 });
  assert.deepEqual(controller.normalize({ date: today, count: -4 }), { date: today, count: 0 });
});

test("Composer provider notes preserve translated budgets and provider fallbacks", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  const providers = { microlink: "micro", proxy: "proxy" };
  const translate = (key, values) => ({ key, values });
  const notes = module.buildComposerProviderNotes("micro", { count: 26 }, 25, translate, providers);
  assert.deepEqual(notes.settings, { key: "linkCardMicrolinkUsageNote", values: { count: 26, limit: 25, remaining: 0 } });
  assert.deepEqual(notes.dialog, { key: "linkCardDialogMicrolinkNote", values: { usage: "26/25", limit: 25 } });
  assert.equal(module.buildComposerProviderNotes("proxy", null, 25, translate, providers).settings.key, "linkCardProviderProxyNote");
  assert.equal(module.buildComposerProviderNotes("unknown", null, 25, translate, providers).dialog.key, "linkCardDialogNoneNote");
});

test("Composer provider presentation falls back from unavailable proxy and hides action hints", async () => {
  const module = await importProjectModule("js/composer/composer-link-card-providers.js");
  let provider = "proxy";
  let configured = false;
  let action = "create";
  let persisted = 0;
  let usageReads = 0;
  const elements = { noneWrap: {}, proxyWrap: {}, noneInput: {}, microlinkInput: {}, proxyInput: {},
    settingsNote: {}, dialogNote: {} };
  const options = { providers: { none: "none", microlink: "micro", proxy: "proxy" },
    getProvider: () => provider, setProvider: (value) => { provider = value; }, getActiveProvider: () => provider,
    normalizeProvider: (value) => value, isProxyConfigured: () => configured, getAction: () => action,
    getUsage: () => { usageReads += 1; return { count: 2 }; }, limit: 25, translate: (key) => key,
    persist: async () => { persisted += 1; } };
  const controller = module.createComposerProviderPresentationController(elements, options);
  controller.sync();
  assert.equal(provider, "none");
  assert.equal(elements.noneInput.checked, true);
  assert.equal(elements.proxyWrap.hidden, true);
  assert.equal(elements.proxyInput.disabled, true);
  assert.equal(usageReads, 0);
  assert.equal(persisted, 0);
  configured = true;
  provider = "proxy";
  controller.sync({ persist: true });
  assert.equal(elements.proxyInput.checked, true);
  assert.equal(elements.proxyInput.disabled, false);
  assert.equal(persisted, 1);
  for (const hiddenAction of ["move", "manage"]) {
    action = hiddenAction;
    controller.updateDialog();
    assert.equal(elements.dialogNote.hidden, true);
    assert.equal(elements.dialogNote.textContent, "");
  }
  provider = "micro";
  action = "refresh";
  controller.sync();
  assert.equal(elements.microlinkInput.checked, true);
  assert.equal(elements.dialogNote.hidden, false);
  assert.equal(elements.dialogNote.textContent, "linkCardDialogMicrolinkNote");
  assert.equal(usageReads, 2);
  const optional = module.createComposerProviderPresentationController({}, options);
  optional.sync();
  optional.updateDialog();
});

test("Composer link-card dialog models distinguish action and image-conflict states", async () => {
  const cards = await importProjectModule("js/composer/composer-link-cards.js");
  const translate = (key, values) => ({ key, values });
  for (const [action, hasImages, title, button, hidden] of [
    ["create", false, "linkCardDialogTitle", "linkCardCreateButton", false],
    ["refresh", false, "linkCardDialogTitle", "linkCardRefreshButton", false],
    ["refresh", true, "linkCardDialogTitle", "linkCardCreateAndRemoveImagesButton", false],
    ["move", true, "linkCardMoveButton", "linkCardMoveButton", false],
    ["manage", false, "linkCardManageDialogTitle", "linkCardCreateButton", true],
    ["unknown", false, "linkCardDialogTitle", "linkCardCreateButton", false],
  ]) {
    const model = cards.buildComposerLinkCardDialogModel({ action, hasImages, segmentIndex: 2, sourceSegmentIndex: 0 }, translate);
    assert.equal(model.title.key, title);
    assert.equal(model.buttonLabel.key, button);
    assert.equal(model.hideSubmit, hidden);
    assert.equal(Boolean(model.warning), hasImages);
    if (action === "move") {
      assert.deepEqual(model.description.values, { source: 1, target: 3 });
    }
  }
  assert.equal(cards.buildComposerLinkCardDialogModel({ action: "move", sourceSegmentIndex: -1 }, (key) => key).description, "linkCardDialogDescription");
});

test("Composer link-card submission validates and preserves create/move cleanup order", async () => {
  const module = await importProjectModule("js/composer/composer-link-cards.js");
  const card = { url: "https://example.org" };
  for (const action of ["create", "refresh", "move"]) {
    const cards = [null, card];
    const images = [[{ id: "image" }], []];
    const calls = [];
    let url = "";
    const elements = { input: { value: " example.org " }, status: { textContent: "", dataset: {} }, submit: {} };
    const controller = module.createComposerLinkCardSubmissionController(elements, {
      getPending: () => ({ segmentIndex: 0, sourceSegmentIndex: 1, action, url: "old" }),
      getImages: () => images, getCards: () => cards, normalizeCard: (value) => value,
      validateUrl: () => ({ ok: true, url: "https://example.org" }), setPendingUrl: (value) => { url = value; },
      translate: (key) => key, setBusy: (_button, busy) => calls.push(["busy", busy]),
      request: async (value) => { calls.push(["request", value]); return card; },
      syncProvider: () => calls.push("provider"), persist: async () => { calls.push("persist"); },
      render: () => calls.push("render"), saveDraft: () => calls.push("draft"),
      setStatus: (value) => calls.push(value), close: () => calls.push("close"),
      reportError: () => calls.push("error"),
    });
    await controller.submit();
    assert.equal(cards[0], card);
    if (action === "move") {
      assert.equal(cards[1], null);
      assert.equal(images[0].length, 1);
      assert.equal(url, "");
      assert.deepEqual(calls, [["busy", true], "persist", "render", "draft", "linkCardMoved", "close", ["busy", false]]);
    } else {
      assert.deepEqual(images[0], []);
      assert.equal(elements.input.value, "https://example.org");
      assert.equal(url, "https://example.org");
      assert.deepEqual(calls, [["busy", true], ["request", "https://example.org"], "provider", "persist", "render", "draft", "linkCardCreated", "close", ["busy", false]]);
    }
  }
});

test("Composer link-card submission reports invalid URLs and request/storage failures", async () => {
  const module = await importProjectModule("js/composer/composer-link-cards.js");
  for (const failure of ["invalid", "request", "empty", "persist", "missing-source", "no-target"]) {
    const calls = [];
    const elements = { input: { value: "test" }, status: { textContent: "", dataset: {} }, submit: {} };
    let action = "create";
    let segmentIndex = 0;
    if (failure === "missing-source") { action = "move"; }
    if (failure === "no-target") { segmentIndex = -1; }
    const controller = module.createComposerLinkCardSubmissionController(elements, {
      getPending: () => ({ segmentIndex, sourceSegmentIndex: -1, action, url: "" }),
      getImages: () => [], getCards: () => [], normalizeCard: (value) => value,
      validateUrl: () => ({ ok: failure !== "invalid", message: "invalid URL", url: "https://example.org" }),
      setPendingUrl: () => {}, translate: (key) => key,
      setBusy: (_button, busy) => calls.push(busy),
      request: async () => {
        if (failure === "request") { throw new Error("network"); }
        if (failure === "empty") { return null; }
        return { url: "https://example.org" };
      },
      syncProvider: () => {}, persist: async () => { throw new Error("storage"); },
      reportError: () => calls.push("error"), render: () => calls.push("render"),
      saveDraft: () => calls.push("draft"), setStatus: () => {}, close: () => calls.push("close"),
    });
    await controller.submit();
    if (failure === "invalid") {
      assert.equal(elements.status.textContent, "invalid URL");
      assert.deepEqual(calls, []);
    } else if (failure === "no-target") {
      assert.deepEqual(calls, []);
      assert.equal(elements.status.textContent, "");
    } else {
      assert.deepEqual(calls, [true, "error", false]);
      assert.ok(elements.status.textContent.includes("linkCardCreateFallback"));
    }
    if (failure !== "no-target") { assert.equal(elements.status.dataset.tone, "error"); }
  }
});

test("Composer link-card targets preserve order, previews and move/swap eligibility", async () => {
  const cards = await importProjectModule("js/composer/composer-link-cards.js");
  const normalize = (card) => cards.normalizeComposerLinkCard(card);
  const slots = [{ url: "https://one.example" }, null, { url: "https://two.example" }];
  assert.equal(cards.findOtherComposerLinkCardIndex(slots, 0, normalize), 2);
  assert.equal(cards.findOtherComposerLinkCardIndex([null], 0, normalize), -1);
  assert.equal(cards.findOtherComposerLinkCardIndex(null, 0, normalize), -1);
  const entries = cards.getComposerLinkCardTargetEntries(0, ["root", " A\n B ", "x".repeat(150)], slots, normalize);
  assert.deepEqual(entries.map((entry) => [entry.segmentIndex, entry.action, entry.textPreview.length]), [[1, "move", 3], [2, "swap", 140]]);
  assert.equal(entries[0].textPreview, "A B");
  assert.deepEqual(cards.getComposerLinkCardTargetEntries(1, ["a", "b", "c"], slots, normalize).map((entry) => entry.segmentIndex), [0, 2]);
  assert.deepEqual(cards.getComposerLinkCardTargetEntries(0, null, slots, normalize), []);
  assert.deepEqual(cards.getComposerLinkCardTargetEntries(0, ["a"], [], normalize), []);
});

test("Composer link-card actions move both ways, swap and preserve callback order", async () => {
  const module = await importProjectModule("js/composer/composer-link-cards.js");
  const a = { url: "https://a.example" };
  const b = { url: "https://b.example" };
  for (const [initial, expected, status] of [
    [[a, null], [null, a], "linkCardMoved"],
    [[null, b], [b, null], "linkCardMoved"],
    [[a, b], [b, a], "linkCardSwapped"],
  ]) {
    const calls = [];
    const options = { cards: initial, normalizeCard: (value) => value || null, translate: (key) => key,
      setStatus: (value) => calls.push(value), persist: async () => { calls.push("persist"); },
      render: () => calls.push("render"), saveDraft: () => calls.push("save"), close: () => calls.push("close") };
    assert.equal(await module.applyComposerLinkCardTargetAction(0, 1, options), true);
    assert.deepEqual(initial, expected);
    assert.deepEqual(calls, [status, "persist", "render", "save", "close"]);
    assert.equal(await module.applyComposerLinkCardTargetAction(0, 0, options), false);
    assert.equal(await module.applyComposerLinkCardTargetAction(-1, 1, options), false);
  }
  assert.equal(await module.applyComposerLinkCardTargetAction(0, 1, { cards: [null, null], normalizeCard: () => null }), false);
  assert.equal(await module.applyComposerLinkCardTargetAction(0, 1, { cards: null }), false);
  const calls = [];
  await assert.rejects(module.applyComposerLinkCardTargetAction(0, 1, {
    cards: [a, null], normalizeCard: (value) => value, translate: (key) => key, setStatus: () => {},
    persist: async () => { throw new Error("storage failure"); }, render: () => calls.push("render"),
    saveDraft: () => calls.push("save"), close: () => calls.push("close"),
  }), /storage failure/);
  assert.deepEqual(calls, []);
});

test("Composer input handlers distinguish normal, suppressed, clipboard and drop events", async () => {
  const composer = await importProjectModule("js/composer/composer-page.js");
  let suppressed = true;
  let pending = true;
  const calls = [];
  const handlers = composer.createComposerInputEventHandlers({
    isSuppressed: () => suppressed, setSuppressed: (value) => { suppressed = value; },
    isWarningPending: () => pending, setWarningPending: (value) => { pending = value; },
    process: (value) => calls.push(["process", value]),
    insert: (text, warn) => calls.push(["insert", text, warn]),
  });
  handlers.input();
  assert.equal(suppressed, false);
  assert.equal(pending, true);
  assert.deepEqual(calls, []);
  handlers.input();
  handlers.input();
  assert.deepEqual(calls, [["process", true], ["process", false]]);
  let prevented = 0;
  const event = { preventDefault() { prevented += 1; } };
  handlers.beforeInput({ ...event, inputType: "insertText", data: "ignored" });
  handlers.beforeInput({ ...event, inputType: "insertFromDrop", dataTransfer: { getData: () => "drop" } });
  handlers.beforeInput({ ...event, inputType: "insertFromPaste", data: "paste" });
  handlers.beforeInput({ ...event, inputType: "insertFromPaste", data: 42 });
  handlers.paste({ ...event, clipboardData: { getData: () => "" } });
  handlers.paste(event);
  assert.equal(prevented, 3);
  assert.deepEqual(calls.slice(2), [["insert", "drop", true], ["insert", "paste", true], ["insert", "", true]]);
});

test("Composer input warnings localize, clear tones and throttle scheduled alerts", async () => {
  const composer = await importProjectModule("js/composer/composer-page.js");
  const source = { value: "abcde" };
  const note = { dataset: {}, hidden: true, textContent: "" };
  let truncated = false;
  let now = 1000;
  let locale = "en";
  let id = 0;
  const timers = new Map();
  const dialogs = [];
  const options = { source, note, count: (text) => text.length, limit: 4,
    getLocale: () => locale, isTruncated: () => truncated,
    translate: (key, values) => `${key}:${values?.count || ""}`, now: () => now,
    setTimeout: (callback) => { timers.set(++id, callback); return id; },
    clearTimeout: (timer) => timers.delete(timer),
    showDialog: (...args) => dialogs.push(args),
  };
  const warnings = composer.createComposerInputWarningController(options);
  warnings.update();
  assert.equal(note.textContent, "composerTextTooLong:4");
  assert.equal(note.dataset.tone, "error");
  truncated = true;
  source.value = "abc";
  warnings.update();
  assert.equal(note.textContent, "composerTextTruncated:4");
  truncated = false;
  warnings.update();
  assert.equal(note.hidden, true);
  assert.equal(note.dataset.tone, undefined);
  warnings.set(null);
  warnings.alert();
  now = 1399;
  warnings.alert();
  assert.equal(timers.size, 1);
  assert.equal(id, 1);
  now = 1400;
  warnings.alert();
  assert.equal(timers.size, 1);
  assert.equal(id, 2);
  timers.get(2)();
  assert.deepEqual(dialogs, [["composerTextTruncated:4", "composerTruncationTitle:"]]);
  locale = "de";
  assert.equal(composer.createComposerInputWarningController({ ...options, limit: 1000 }).limitLabel(), "1.000");
  composer.createComposerInputWarningController({ ...options, note: null }).set("ignored");
});

test("Composer render scheduler replaces pending timers and frames independently", async () => {
  const rendering = await importProjectModule("js/composer/composer-segment-rendering.js");
  const timers = new Map();
  const frames = new Map();
  let nextId = 0;
  const renders = [];
  let resizes = 0;
  const scheduler = rendering.createComposerRenderScheduler({
    setTimeout: (callback) => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: (id) => timers.delete(id),
    requestFrame: (callback) => { frames.set(++nextId, callback); return nextId; },
    cancelFrame: (id) => frames.delete(id),
    render: (options) => renders.push(options), resize: () => { resizes += 1; },
  });
  scheduler.render(100);
  scheduler.render(200);
  assert.equal(timers.size, 1);
  const timer = [...timers.values()][0];
  timers.clear();
  timer();
  scheduler.render(-1);
  assert.equal(frames.size, 1);
  scheduler.resize();
  scheduler.resize();
  assert.equal(frames.size, 2);
  for (const callback of frames.values()) {
    callback();
  }
  frames.clear();
  assert.deepEqual(renders, [{ preserveOverrides: false, preserveView: true, animate: false }]);
  assert.equal(resizes, 1);
  scheduler.render();
  assert.equal(frames.size, 1);
});

test("Composer source edits clamp text and reset state through explicit callbacks", async () => {
  const composer = await importProjectModule("js/composer/composer-page.js");
  const main = await importProjectModule("js/composer/composer-main.js");
  const source = { value: "abcde" };
  const calls = [];
  const input = composer.createComposerInputController(source, {
    clamp: main.clampComposerTextLength, limit: 4,
    setTruncated: (value) => calls.push(["truncated", value]),
    updateWarning: (value) => calls.push(["warning", value]),
    clearOverrides: () => calls.push("clear"),
    setLocked: (value) => calls.push(["locked", value]),
    setPosted: (value) => calls.push(["posted", value]),
    scheduleRender: (delay) => calls.push(["render", delay]),
    delayMs: 150, saveDraft: () => calls.push("save"),
  });
  input.process(true);
  assert.equal(source.value, "abcd");
  assert.deepEqual(calls, [["truncated", true], ["warning", true], "clear",
    ["locked", false], ["posted", false], ["render", 150], "save"]);
  source.value = "";
  calls.length = 0;
  input.process();
  assert.equal(source.value, "");
  assert.deepEqual(calls.slice(0, 2), [["truncated", false], ["warning", false]]);
});

test("Composer length presentation handles byte, complex and absent-node boundaries", async () => {
  const rendering = await importProjectModule("js/composer/composer-segment-rendering.js");
  const base = { graphemeCount: 1, utf8ByteCount: 1, exceedsLimit: false,
    exceedsGraphemeLimit: false, exceedsByteLimit: false, isNearLimit: false,
    isNearByteLimit: false, hasComplexDifference: false, adviceKeys: ["advice"] };
  let diagnostics = { ...base };
  const node = () => ({ dataset: {}, hidden: false, textContent: "" });
  const length = node();
  const note = node();
  const warning = node();
  const options = { getDiagnostics: () => diagnostics, formatLabel: () => "count",
    translate: (key) => key, graphemeLimit: 300, byteLimit: 3000, warning };
  const display = rendering.createComposerLengthPresentationController(options);
  display.segment(length, note, "");
  assert.equal(note.hidden, true);
  for (const [flags, key] of [
    [{ exceedsLimit: true, exceedsGraphemeLimit: true, exceedsByteLimit: true }, "segmentLengthWarningOverflowBoth"],
    [{ exceedsLimit: true, exceedsByteLimit: true }, "segmentLengthWarningOverflowBytes"],
    [{ isNearLimit: true, hasComplexDifference: true }, "segmentLengthWarningComplexNearLimit"],
    [{ isNearByteLimit: true }, "segmentLengthWarningByteNearLimit"],
    [{ hasComplexDifference: true, graphemeCount: 295 }, "segmentLengthWarningComplex"],
  ]) {
    diagnostics = { ...base, ...flags };
    assert.equal(display.segment(length, note, "text"), diagnostics);
    assert.ok(note.textContent.startsWith(key));
    assert.equal(note.hidden, false);
    display.thread(["text"]);
    display.segment(null, null, "text");
  }
  display.thread([]);
  assert.equal(warning.hidden, true);
  assert.equal(warning.dataset.tone, "neutral");
  rendering.createComposerLengthPresentationController({ ...options, warning: null }).thread([]);
});

test("Composer mention selection updates segment, source sync, cache and draft in order", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  let segments = ["Hello @old.example"];
  let target = { segmentIndex: 0, originalHandle: "old.example" };
  const calls = [];
  const elements = {
    input: { value: "old.example" },
    status: { textContent: "error", dataset: { tone: "error" } },
    title: { textContent: "review" },
    results: { replaceChildren() { calls.push("clear-results"); } },
    dialog: { open: true, close() { this.open = false; calls.push("close"); } },
  };
  const controller = mentions.createComposerMentionSearchActions(elements, {
    translate: (key) => key,
    getTarget: () => target,
    getSegments: () => segments,
    setSegments: (value) => { segments = value; calls.push("segments"); },
    sourceSync: { queue(index, from, to) { calls.push(["sync", index, from, to]); } },
    resolver: { invalidate(handles) { calls.push(["invalidate", handles]); } },
    setLocked: (value) => calls.push(["locked", value]),
    setPosted: (value) => calls.push(["posted", value]),
    resetPicker: () => calls.push("reset-picker"),
    resetSearchState: () => { target = { segmentIndex: -1, originalHandle: "" }; calls.push("reset-state"); },
    render: (options) => calls.push(["render", options]),
    saveDraft: () => calls.push("save"),
  });
  assert.equal(controller.select("@new.example"), true);
  assert.deepEqual(segments, ["Hello @new.example"]);
  assert.deepEqual(calls, [
    ["sync", 0, "old.example", "new.example"], "segments", ["locked", true], ["posted", false],
    ["invalidate", ["old.example", "new.example"]], "reset-picker", "reset-state", "clear-results", "close",
    ["render", { preserveOverrides: true, preserveView: true, animate: false }], "save",
  ]);
  assert.equal(elements.input.value, "");
  assert.equal(elements.status.dataset.tone, undefined);
  assert.equal(elements.title.textContent, "mentionSearchDialogTitle");
  calls.length = 0;
  assert.equal(controller.select("another.example"), false);
  assert.equal(controller.select(""), false);
  assert.deepEqual(calls, []);
});

test("Composer known mention handles normalize accounts and reject invalid collections", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  assert.deepEqual(mentions.getKnownComposerMentionHandles("@ALICE.example", [
    { handle: "alice.example", identifier: "bob.example" }, null, { identifier: " " },
  ]), ["alice.example", "bob.example"]);
  assert.deepEqual(mentions.getKnownComposerMentionHandles(null, null), []);
});

test("Composer mention search ignores stale results and stale errors", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const status = { textContent: "", dataset: {} };
  let rendered = [];
  let cleared = 0;
  let token = 0;
  const pending = [];
  const options = {
    status, results: { replaceChildren() { cleared += 1; } },
    translate: (key) => key,
    startRequest: () => ++token,
    isCurrent: (value) => value === token,
    request: (query) => new Promise((resolve, reject) => pending.push({ query, resolve, reject })),
    render: (actors) => { rendered = actors; },
  };
  const first = mentions.runComposerMentionSearch("old", options);
  const second = mentions.runComposerMentionSearch("@new", options);
  assert.equal(pending[1].query, "new");
  pending[1].resolve({ actors: [{ handle: "new.example" }] });
  await second;
  pending[0].reject(new Error("obsolete failure"));
  await first;
  assert.deepEqual(rendered, [{ handle: "new.example" }]);
  assert.equal(status.textContent, "mentionSearchResultsLoaded");
  assert.equal(status.dataset.tone, undefined);
  const stale = mentions.runComposerMentionSearch("late", options);
  await mentions.runComposerMentionSearch("x", options);
  pending[2].resolve({ actors: [{ handle: "obsolete.example" }] });
  await stale;
  assert.equal(status.textContent, "mentionSearchNeedQuery");
  assert.equal(cleared, 1);
  const failed = mentions.runComposerMentionSearch("failure", options);
  pending[3].reject(new Error("current failure"));
  await failed;
  assert.equal(status.textContent, "current failure");
  assert.equal(status.dataset.tone, "error");
  const empty = mentions.runComposerMentionSearch("empty", options);
  pending[4].resolve({ actors: null });
  await empty;
  assert.equal(status.textContent, "mentionSearchNoResults");
  assert.equal(status.dataset.tone, undefined);
});

/**
 * Builds deterministic splitter dependencies for the Composer splitter tests.
 * @returns {object} Splitter helper callbacks and recorded reserve requests.
 */
function createSplitterHelpers() {
  const reserveRequests = [];
  return {
    reserveRequests,
    createPostTextLimit(graphemeLimit, utf8ByteLimit) {
      return { graphemeLimit, utf8ByteLimit };
    },
    getPostTextMetrics(value) {
      return { graphemeCount: String(value).length, utf8ByteCount: String(value).length };
    },
    reserveForCounters(segmentCount) {
      reserveRequests.push(`counters:${segmentCount}`);
      return { graphemeCount: 2, utf8ByteCount: 2 };
    },
    reserveForThreadEmoji() {
      reserveRequests.push("emoji");
      return { graphemeCount: 1, utf8ByteCount: 1 };
    },
    reserveForThreadIntro() {
      reserveRequests.push("intro");
      return { graphemeCount: 3, utf8ByteCount: 3 };
    },
    reserveForRepeatedHashtags() {
      reserveRequests.push("hashtag");
      return { graphemeCount: 2, utf8ByteCount: 2 };
    },
    splitChunksGreedy(chunks, limitFactory) {
      chunks.forEach((chunk, index) => limitFactory(index));
      return chunks;
    },
    decorateSegments(segments, options) {
      return segments.map((segment, index) => `${index + 1}/${segments.length}:${options.withCounters}:${segment}`);
    },
  };
}

test("composer splitter normalizes, tokenizes and preserves manual chunks", async () => {
  const splitter = await importProjectModule("js/composer/composer-splitter.js");

  assert.equal(splitter.normalizeComposerInput("  eins  \r\n\r\n\r\n zwei  "), "eins\n\n zwei");
  assert.deepEqual(splitter.splitComposerByManualMarkers("eins %%\r\n zwei %% ", "%%"), ["eins", "zwei"]);
  assert.deepEqual(splitter.subtractComposerPostTextLimit(
    { graphemeLimit: 300, utf8ByteLimit: 3000 },
    { graphemeCount: 4, utf8ByteCount: 16 },
  ), { graphemeLimit: 296, utf8ByteLimit: 2984 });
  assert.deepEqual(splitter.tokenizeComposerText("eins  zwei\ndrei"), ["eins", "  ", "zwei", "\n", "drei"]);
  assert.equal(splitter.trimComposerSegment("  eins  \n zwei  "), "eins\n zwei");
});

test("composer validation reports grapheme and byte limits", async () => {
  const validation = await importProjectModule("js/composer/composer-validation.js");
  const diagnostics = validation.getComposerSegmentLengthDiagnostics("Hi 😀", {
    getMetrics: () => ({ graphemeCount: 4, utf8ByteCount: 7 }),
    graphemeLimit: 5,
    byteLimit: 10,
    hasEmoji: () => true,
    hasCjk: () => false,
  });
  assert.equal(diagnostics.hasEmoji, true);
  assert.equal(diagnostics.exceedsLimit, false);
  assert.equal(validation.formatComposerSegmentLengthLabel(diagnostics, {
    graphemeLimit: 5,
    byteLimit: 10,
    translate: (key, values) => `${key}:${values.count}/${values.limit}`,
  }), "segmentLengthLabel:4/5 · segmentByteLengthLabel:7/10");
});

test("composer segment helpers normalize overrides and align images", async () => {
  const segments = await importProjectModule("js/composer/composer-segments.js");
  assert.deepEqual(segments.normalizeComposerSegmentOverrides([" first ", "", " second "]), [" first ", " second "]);
  assert.equal(segments.normalizeComposerSegmentOverrides([]), null);
  assert.deepEqual(segments.syncComposerSegmentImages([[{ id: 1 }]], 2), [[{ id: 1 }], []]);
});

test("composer image geometry keeps rotated and contained dimensions stable", async () => {
  const geometry = await importProjectModule("js/composer/composer-image-geometry.js");
  assert.deepEqual(geometry.getComposerSourceDimensions({ width: 640, height: 480 }), { width: 640, height: 480 });
  assert.deepEqual(geometry.getComposerOrientedSourceDimensions({ width: 640, height: 480 }, { rotation: 90 }), { width: 480, height: 640 });
  assert.deepEqual(geometry.getComposerContainedPreviewBox(640, 480, 320, 320), { width: 320, height: 240 });
});

test("composer publishing prepares upload segments and rejects card image conflicts", async () => {
  const publishing = await importProjectModule("js/composer/composer-publishing.js");
  const prepared = await publishing.prepareComposerPublishSegments([{ text: "Hello", images: [{ name: "a.png", type: "image/png" }], externalCard: null }], {
    normalizeLinkCard: () => null,
    prepareImage: async () => ({ blob: new Blob(["image"], { type: "image/png" }), width: 10, height: 20, validation: {} }),
    dataUrlToFile: () => null,
    blobLimit: 1000,
    maxDimension: 100,
    linkCardImageConflictMessage: "conflict",
    imageTooLargeMessage: "large",
  });
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].images[0].width, 10);
  await assert.rejects(() => publishing.prepareComposerPublishSegments([{ text: "x", images: [{}], externalCard: { url: "https://example.test" } }], {
    normalizeLinkCard: (card) => card,
    linkCardImageConflictMessage: "conflict",
  }), /conflict/);
});

test("composer publishing workflow performs cleanup after success", async () => {
  const publishing = await importProjectModule("js/composer/composer-publishing.js");
  const calls = [];
  const result = await publishing.runComposerPublishWorkflow({
    setBusy: (value) => calls.push(`busy:${value}`),
    showProgress: (title, message) => calls.push(`show:${message}`),
    hideProgress: () => calls.push("hide"),
    checkConnectivity: async () => calls.push("connect"),
    prepareSegments: async () => {
      calls.push("prepare");
      return ["prepared"];
    },
    publish: async () => {
      calls.push("publish");
      return { posts: [{ uri: "at://post" }] };
    },
    onSuccess: async () => calls.push("success"),
    onError: async () => calls.push("error"),
    progressTitle: "title",
    connectivityMessage: "connectivity",
    preparingMessage: "preparing",
  });
  assert.equal(result.posts.length, 1);
  assert.deepEqual(calls, ["busy:true", "show:connectivity", "connect", "show:preparing", "prepare", "publish", "hide", "success", "hide", "busy:false"]);
});

test("composer image renderer applies edit transform to canvas", async () => {
  const renderer = await importProjectModule("js/composer/composer-image-renderer.js");
  const calls = [];
  const context = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "",
    clearRect: () => calls.push("clear"),
    save: () => calls.push("save"),
    beginPath: () => calls.push("begin"),
    rect: () => calls.push("rect"),
    clip: () => calls.push("clip"),
    translate: (x, y) => calls.push(["translate", x, y]),
    rotate: (value) => calls.push(["rotate", value]),
    scale: (x, y) => calls.push(["scale", x, y]),
    drawImage: () => calls.push("draw"),
    restore: () => calls.push("restore"),
  };
  const canvas = { width: 0, height: 0, getContext: () => context };
  const bitmap = { width: 100, height: 80, close: () => calls.push("close") };
  await renderer.renderComposerImageToCanvas({ dataUrl: "data:image/png;base64,abc", edit: {} }, canvas, {
    width: 200,
    height: 160,
    normalizeEdit: () => ({ fitMode: "cover", rotation: 90, flipX: true, flipY: false }),
    getMetrics: () => ({ centerX: 100, centerY: 80, rotation: 90, flipX: true, flipY: false, drawWidth: 200, drawHeight: 160 }),
    loadBitmap: async () => bitmap,
  });
  assert.deepEqual([canvas.width, canvas.height], [200, 160]);
  assert.deepEqual(calls.slice(-4), [["scale", -1, 1], "draw", "restore", "close"]);
});

test("composer link-card providers normalize provider settings and usage", async () => {
  const providers = await importProjectModule("js/composer/composer-link-card-providers.js");
  assert.equal(providers.normalizeComposerLinkCardProvider("proxy", "proxy", "microlink", "none"), "proxy");
  assert.equal(providers.normalizeComposerLinkCardProvider("other", "proxy", "microlink", "none"), "none");
  assert.equal(providers.normalizeComposerLinkCardProxyEndpoint("example.test/api"), "https://example.test/api");
  assert.equal(providers.normalizeComposerLinkCardProxyEndpoint("bad endpoint"), "");
  assert.deepEqual(providers.normalizeComposerProviderUsage({ date: "2026-09-11", count: 8 }, "2026-09-12"), { date: "2026-09-12", count: 0 });
});

test("composer dialog helpers normalize reply targets and continuations", async () => {
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const target = dialogs.normalizeComposerReplyTarget({
    mode: "post",
    replyRoot: { uri: "root", cid: "root-cid" },
    replyParent: { uri: "parent", cid: "parent-cid" },
    targetPost: { text: "  hello  " },
    lastOwnPost: { uri: "own", cid: "own-cid", text: "continuation" },
  }, (text) => text.trim());
  assert.equal(target.targetPost.text, "hello");
  assert.equal(dialogs.buildComposerThreadContinuationTarget(target).mode, "thread");
  assert.equal(dialogs.normalizeComposerReplyTarget({}), null);
});

test("composer segment rendering derives image and link-card state", async () => {
  const rendering = await importProjectModule("js/composer/composer-segment-rendering.js");
  const state = rendering.buildComposerSegmentRenderState("Visit https://example.test", 2, [{ id: 1 }], null, "https://example.test", 4);
  assert.equal(state.index, 2);
  assert.equal(state.remainingImageSlots, 3);
  assert.equal(state.hasImages, true);
  assert.equal(state.linkCardUrl, "https://example.test");
  assert.equal(rendering.buildComposerSegmentRenderState("", 0, null, { url: "https://card.test" }, "", 4).linkCardUrl, "https://card.test");
});

test("composer segment rendering exposes the template DOM contract", async () => {
  const rendering = await importProjectModule("js/composer/composer-segment-rendering.js");
  const nodes = new Map([
    [".segment-card", { appendChild(node) { this.input = node; } }],
    [".segment-text", {}],
    [".segment-index", {}],
    [".segment-length", {}],
    [".segment-warning", {}],
    [".segment-mentions", {}],
    [".segment-add-image-button", {}],
    [".segment-link-card-button", {}],
    [".segment-link-card-manual-button", {}],
    [".segment-link-card-manage-button", {}],
    [".segment-link-card", {}],
    [".segment-images", {}],
  ]);
  const fragment = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  const template = {
    content: {
      cloneNode() {
        return fragment;
      },
    },
  };
  const documentObject = {
    createElement(type) {
      assert.equal(type, "input");
      return {};
    },
  };

  const context = rendering.createComposerSegmentRenderContext(template, documentObject);
  assert.equal(context.card, nodes.get(".segment-card"));
  assert.equal(context.textarea, nodes.get(".segment-text"));
  assert.equal(context.fileInput.type, "file");
  assert.equal(context.fileInput.accept, "image/*");
  assert.equal(context.card.input, context.fileInput);
});

test("composer segment rendering binds context help through its interaction binder", async () => {
  const rendering = await importProjectModule("js/composer/composer-segment-rendering.js");
  const contextHelpButton = new EventTarget();
  let topic = "";
  rendering.bindComposerSegmentContextHelp(contextHelpButton, (value) => { topic = value; });
  contextHelpButton.dispatchEvent(new Event("click"));
  assert.equal(topic, "segment_images");
});

test("composer splitter delegates undecorated and decorated segments predictably", async () => {
  const splitter = await importProjectModule("js/composer/composer-splitter.js");
  const helpers = createSplitterHelpers();
  const baseOptions = {
    manualMarker: "%%",
    maxPostLength: 300,
    maxPostUtf8Bytes: 3000,
    withCounters: false,
    withThreadIntro: false,
    withThreadEmoji: false,
    withMarkerSpacing: false,
    repeatedHashtagMode: "off",
    selectedHashtagText: "",
  };

  assert.deepEqual(splitter.splitComposerIntoSegments("eins %% zwei", baseOptions, helpers), ["eins", "zwei"]);
  const decorated = splitter.splitComposerIntoSegments("eins %% zwei", {
    ...baseOptions,
    withCounters: true,
    withThreadIntro: true,
    withThreadEmoji: true,
    withMarkerSpacing: true,
    repeatedHashtagMode: "all-top",
    selectedHashtagText: "#test",
  }, helpers);

  assert.deepEqual(decorated, ["1/2:true:eins", "2/2:true:zwei"]);
  assert.ok(helpers.reserveRequests.includes("intro"));
  assert.ok(helpers.reserveRequests.includes("emoji"));
  assert.ok(helpers.reserveRequests.includes("hashtag"));
  assert.ok(helpers.reserveRequests.includes("counters:2"));
});

test("composer image helpers protect input state and enforce target constraints", async () => {
  const images = await importProjectModule("js/composer/composer-images.js");
  const original = [[{ id: "first" }, { id: "second" }], [{ id: "third" }]];
  const moved = images.moveComposerImage({
    segmentImages: original,
    fromSegmentIndex: 0,
    fromImageIndex: 1,
    toSegmentIndex: 1,
    toImageIndex: 0,
    maxImagesPerSegment: 4,
    targetHasLinkCard: false,
  });

  assert.equal(moved.moved, true);
  assert.deepEqual(moved.segmentImages.map((segment) => segment.map((image) => image.id)), [["first"], ["second", "third"]]);
  assert.deepEqual(original.map((segment) => segment.map((image) => image.id)), [["first", "second"], ["third"]]);
  assert.equal(images.moveComposerImage({
    segmentImages: original,
    fromSegmentIndex: 0,
    fromImageIndex: 0,
    toSegmentIndex: 1,
    toImageIndex: 0,
    maxImagesPerSegment: 4,
    targetHasLinkCard: true,
  }).reason, "link-card");
  assert.deepEqual(images.removeComposerImage(original, 0, 0).map((segment) => segment.map((image) => image.id)), [["second"], ["third"]]);
});

test("composer link-card helper preserves every segment slot", async () => {
  const linkCards = await importProjectModule("js/composer/composer-link-cards.js");
  const normalized = linkCards.normalizeComposerSegmentLinkCards([
    { url: "https://example.test" },
    null,
  ], (card) => {
    if (!card) {
      return null;
    }
    return { ...card, normalized: true };
  });

  assert.deepEqual(normalized, [
    { url: "https://example.test", normalized: true },
    null,
  ]);
  assert.equal(linkCards.normalizeComposerLinkCard({ url: "javascript:alert(1)" }), null);
  assert.equal(linkCards.normalizeComposerLinkCard({ url: "https://example.test", title: " Example " }, () => null, "2026-09-12").title, "Example");
});

test("composer page helper keeps navigation and local workspace opening separate", async () => {
  const composerPage = await importProjectModule("js/composer/composer-page.js");
  const calls = [];
  const actions = {
    currentPage: "composer",
    toolsPage: "tools",
    composerPage: "composer",
    navigateToPage(page) {
      calls.push(`navigate:${page}`);
      return false;
    },
    setCurrentWorkspace(workspace) { calls.push(`workspace:${workspace}`); },
    applyFullscreenState() { calls.push("fullscreen"); },
    persistWorkspace(workspace) { calls.push(`persist:${workspace}`); },
    setVisibleWorkspace(workspace) { calls.push(`visible:${workspace}`); },
    applyHashtagPaneContext() { calls.push("hashtags"); },
    updateAuthButtons() { calls.push("auth"); },
  };

  assert.deepEqual(composerPage.openComposerWorkspace({}, actions), { opened: true, navigated: false });
  assert.deepEqual(calls, [
    "navigate:composer",
    "workspace:composer",
    "fullscreen",
    "persist:composer",
    "visible:composer",
    "hashtags",
    "auth",
  ]);
  assert.deepEqual(composerPage.openComposerWorkspace({}, { ...actions, currentPage: "tools" }), {
    opened: false,
    navigated: false,
  });
});

test("composer page binds core input and reply controls", async () => {
  const composerPage = await importProjectModule("js/composer/composer-page.js");
  const sourceText = new EventTarget();
  const counterToggle = new EventTarget();
  const replyModeInput = new EventTarget();
  replyModeInput.checked = true;
  replyModeInput.value = "followers";
  let calls = 0;
  const bound = composerPage.bindComposerCoreEvents({
    sourceText,
    counterToggle,
    replyModeInputs: [replyModeInput],
  }, {
    sourceInput: () => { calls += 1; },
    counterChange: () => { calls += 1; },
    replyModeChange: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  sourceText.dispatchEvent(new Event("input"));
  counterToggle.dispatchEvent(new Event("change"));
  replyModeInput.dispatchEvent(new Event("change"));
  assert.equal(calls, 3);
});

test("composer page binds hashtag controls", async () => {
  const page = await importProjectModule("js/composer/composer-page.js");
  const form = new EventTarget();
  const placementSelect = new EventTarget();
  let calls = 0;
  const bound = page.bindComposerHashtagEvents({ form, placementSelect }, {
    submit: () => { calls += 1; },
    placementChange: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  form.dispatchEvent(new Event("submit"));
  placementSelect.dispatchEvent(new Event("change"));
  assert.equal(calls, 2);
});

test("composer page binds server and clear controls", async () => {
  const page = await importProjectModule("js/composer/composer-page.js");
  const serverPresetField = new EventTarget();
  const clearButton = new EventTarget();
  let calls = 0;
  const bound = page.bindComposerCoreEvents({ serverPresetField, clearButton }, {
    serverPresetChange: () => { calls += 1; },
    clearClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  serverPresetField.dispatchEvent(new Event("change"));
  clearButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("composer dialog binder wires declared dialog controls", async () => {
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const target = new EventTarget();
  let calls = 0;
  const bound = dialogs.bindComposerDialogEvents({
    unlockButton: target,
    replyTargetUrlInput: target,
    postLanguagesDialog: target,
    helpButton: target,
  }, {
    unlock: () => { calls += 1; },
    replyTargetKeydown: () => { calls += 1; },
    languagesDialogClose: () => { calls += 1; },
    help: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("keydown"));
  target.dispatchEvent(new Event("close"));
  assert.equal(calls, 4);
});

test("composer image editor binder wires controls and gestures", async () => {
  const renderer = await importProjectModule("js/composer/composer-image-renderer.js");
  const target = new EventTarget();
  let calls = 0;
  const bound = renderer.bindComposerImageEditorEvents({
    zoomInput: target,
    canvas: target,
    saveButton: target,
  }, {
    zoomInput: () => { calls += 1; },
    pointerMove: () => { calls += 1; },
    save: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  target.dispatchEvent(new Event("input"));
  target.dispatchEvent(new Event("pointermove"));
  target.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("composer content dialog binder wires Link-Card and mention controls", async () => {
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const targets = Array.from({ length: 8 }, () => new EventTarget());
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = dialogs.bindComposerContentDialogEvents({
    linkCardCreateButton: targets[0],
    linkCardCancelButton: targets[1],
    linkCardCloseTop: targets[2],
    linkCardUrlInput: targets[3],
    mentionSearchCloseTop: targets[4],
    mentionSearchCloseButton: targets[5],
    mentionSearchInput: targets[6],
    mentionSearchDialog: targets[7],
  }, {
    linkCardCreate: handler,
    linkCardClose: handler,
    linkCardInput: handler,
    linkCardKeydown: handler,
    mentionClose: handler,
    mentionInput: handler,
    mentionKeydown: handler,
    mentionCancel: handler,
    mentionDialogClose: handler,
  });
  assert.equal(bound, 11);
  targets[0].dispatchEvent(new Event("click"));
  targets[1].dispatchEvent(new Event("click"));
  targets[2].dispatchEvent(new Event("click"));
  targets[3].dispatchEvent(new Event("input"));
  targets[3].dispatchEvent(new Event("keydown"));
  targets[4].dispatchEvent(new Event("click"));
  targets[5].dispatchEvent(new Event("click"));
  targets[6].dispatchEvent(new Event("input"));
  targets[6].dispatchEvent(new Event("keydown"));
  targets[7].dispatchEvent(new Event("cancel"));
  targets[7].dispatchEvent(new Event("close"));
  assert.equal(calls, 11);
});

test("composer dialog binds dynamic language options", async () => {
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const input = new EventTarget();
  let calls = 0;
  assert.equal(dialogs.bindComposerLanguageOptionEvent(input, () => { calls += 1; }), true);
  assert.equal(dialogs.bindComposerLanguageOptionEvent(null, () => {}), false);
  input.dispatchEvent(new Event("change"));
  assert.equal(calls, 1);
});

test("composer post settings normalize values and build localized summaries", async () => {
  const settings = await importProjectModule("js/composer/composer-post-settings.js");
  const translate = (key, values = {}) => {
    if (key === "replyModeCustomSummary") {
      return `custom:${values.rules}`;
    }
    if (key === "postLanguagesDisclosureSummary") {
      return `languages:${values.count}`;
    }
    if (key === "postInteractionDisclosureSummary") {
      return `interaction:${values.replyMode}/${values.quotes}`;
    }
    return key;
  };
  const normalized = settings.normalizeComposerPostInteractionSettings({
    replyMode: "custom",
    allowFollowers: true,
    quotePostsAllowed: false,
  });

  assert.deepEqual(normalized, {
    replyMode: "custom",
    allowFollowers: true,
    allowFollowing: false,
    allowMentioned: false,
    quotePostsAllowed: false,
  });
  assert.equal(settings.getComposerReplyModeSummary(normalized, translate), "custom:replyRuleFollowers");
  assert.deepEqual(settings.buildComposerPostSettingsDisclosureMeta(normalized, 2, translate), {
    languages: "languages:2",
    interactions: "interaction:custom:replyRuleFollowers/quotesBlockedShort",
  });
});

test("composer history keeps unique newest entries and produces compact metadata", async () => {
  const history = await importProjectModule("js/composer/composer-history.js");
  const entries = history.normalizeComposerPostingHistory([
    { url: "https://example.test/older", createdAt: "2026-01-01T10:00:00Z", threadCount: 0 },
    { url: "https://example.test/newer", createdAt: "2026-02-01T10:00:00Z", imageCount: 2 },
    { url: "https://example.test/newer", createdAt: "2026-02-01T10:00:00Z", account: "duplicate" },
    { url: "", createdAt: "2026-03-01T10:00:00Z" },
  ], 10);
  const translate = (key, values = {}) => `${key}:${values.threads || values.images || ""}`;

  assert.equal(entries.length, 2);
  assert.equal(entries[0].url, "https://example.test/newer");
  assert.equal(entries[1].threadCount, 1);
  assert.deepEqual(history.mergeComposerPostingHistory(entries, [
    { url: "https://example.test/imported", createdAt: "2026-03-01T10:00:00Z" },
  ], 2).map((entry) => entry.url), ["https://example.test/imported", "https://example.test/newer"]);
  assert.equal(history.getComposerHistoryPreviewText(" one\n two ", 20), "one two");
  assert.equal(history.formatComposerHistoryMeta(1, 2, translate), "historyMeta:1");
});

test("composer history binds rendered entry actions", async () => {
  const history = await importProjectModule("js/composer/composer-history.js");
  const elements = {
    threadExplorerButton: new EventTarget(),
    continueButton: new EventTarget(),
    deleteButton: new EventTarget(),
  };
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = history.bindComposerHistoryItemEvents(elements, {
    threadExplorerClick: handler,
    continueClick: handler,
    deleteClick: handler,
  });
  assert.equal(bound, 3);
  elements.threadExplorerButton.dispatchEvent(new Event("click"));
  elements.continueButton.dispatchEvent(new Event("click"));
  elements.deleteButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("composer mention helpers preserve boundaries and suggest close local handles", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const candidates = mentions.parseComposerMentionCandidates("Hi @Alice.Test, and (@bob.example)! no@email.test");

  assert.deepEqual(candidates, [
    { handle: "alice.test", raw: "@alice.test" },
    { handle: "bob.example", raw: "@bob.example" },
  ]);
  assert.deepEqual(mentions.getUniqueComposerMentionHandles([
    ...candidates,
    { handle: "ALICE.TEST" },
  ]), ["alice.test", "bob.example"]);
  assert.equal(mentions.textContainsComposerMentionHandle("Hi @alice.test!", "alice.test"), true);
  assert.equal(mentions.textContainsComposerMentionHandle("mail@alice.test", "alice.test"), false);
  assert.equal(mentions.replaceComposerMentionHandle("(@alice.test), @other.test", "alice.test", "alice-new.test"), "(@alice-new.test), @other.test");
  assert.equal(mentions.buildComposerMentionProfileUrl("alice.test", "did:plc:alice", "https://bsky.app/"), "https://bsky.app/profile/did%3Aplc%3Aalice");
  assert.equal(mentions.getComposerMentionLevenshteinDistance("alice", "alise"), 1);
  assert.equal(mentions.findComposerMentionSuggestion("alise.test", ["alice.test", "other.test"]), "alice.test");
});

test("composer mention helpers derive localized relationship labels", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const translate = (key) => key;
  assert.equal(
    mentions.getComposerMentionRelationLabel({ followingViewer: true, followedByViewer: true }, translate),
    "mentionSearchRelationMutual",
  );
  assert.equal(
    mentions.getComposerMentionRelationLabel({ followedByViewer: true }, translate),
    "mentionSearchRelationFollowsYou",
  );
  assert.equal(mentions.getComposerMentionRelationLabel({}, translate), "");
});

test("composer mention resolver caches hits and misses and invalidates selected handles", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const requests = [];
  const resolver = mentions.createComposerMentionResolver({
    async sendToServiceWorker(type, payload, options) {
      requests.push({ type, payload, options });
      return { mentions: [{ handle: "known.example", did: "did:plc:known" }] };
    },
  });

  assert.deepEqual([...await resolver.resolve([" @Known.Example ", "missing.example", "known.example"])], [
    ["known.example", "did:plc:known"],
    ["missing.example", null],
  ]);
  await resolver.resolve(["known.example", "missing.example"]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].type, "RESOLVE_COMPOSER_MENTIONS");
  assert.deepEqual(requests[0].payload.handles, ["known.example", "missing.example"]);
  assert.equal(requests[0].options.timeoutMs, 30000);

  resolver.invalidate(["known.example"]);
  await resolver.resolve(["known.example"]);
  assert.equal(requests.length, 2);
});

test("composer mention resolver handles unavailable and failing transports", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const unavailable = mentions.createComposerMentionResolver();
  assert.deepEqual([...await unavailable.resolve(["alice.example"])], [["alice.example", null]]);

  const failing = mentions.createComposerMentionResolver({
    async sendToServiceWorker() {
      throw new Error("worker unavailable");
    },
  });
  assert.deepEqual([...await failing.resolve(["alice.example"])], [["alice.example", null]]);
});

test("composer mention source sync tracks valid corrections per segment", async () => {
  const mentions = await importProjectModule("js/composer/composer-mentions.js");
  const controller = mentions.createComposerMentionSourceSyncController({
    containsHandle: mentions.textContainsComposerMentionHandle,
    replaceHandle: mentions.replaceComposerMentionHandle,
  });
  const sourceText = "Reply to @old.example and @other.example";
  const editedText = "Reply to @newer.example and @other.example";
  const otherEditedText = "Reply to @new.example and @other.example";

  controller.queue(0, "old.example", "new.example");
  controller.queue(0, "new.example", "newer.example");
  controller.queue(1, "old.example", "new.example");
  assert.deepEqual(controller.getPending(0, sourceText, editedText), [
    { fromHandle: "old.example", toHandle: "newer.example" },
  ]);
  assert.deepEqual(controller.getPending(1, sourceText, otherEditedText), [
    { fromHandle: "old.example", toHandle: "new.example" },
  ]);

  assert.equal(controller.apply(0, sourceText, "old.example", "newer.example"), "Reply to @newer.example and @other.example");
  assert.deepEqual(controller.getPending(0, "Reply to @newer.example and @other.example", "Reply to @newer.example and @other.example"), []);
  assert.equal(controller.getPending(1, sourceText, "No matching corrected mention" ).length, 0);
  controller.clear();
  assert.deepEqual(controller.getPending(1, sourceText, otherEditedText), []);
});
