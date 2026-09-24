"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

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

test("composer dialog binder wires declared dialog controls", async () => {
  const dialogs = await importProjectModule("js/composer/composer-dialogs.js");
  const target = new EventTarget();
  let calls = 0;
  const bound = dialogs.bindComposerDialogEvents({
    unlockButton: target,
    replyTargetUrlInput: target,
    helpButton: target,
  }, {
    unlock: () => { calls += 1; },
    replyTargetKeydown: () => { calls += 1; },
    help: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 3);
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
