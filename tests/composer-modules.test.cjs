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
