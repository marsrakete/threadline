"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMemoryStorage, importProjectModule } = require("./module-test-helpers.cjs");

/**
 * Creates a minimal native-dialog test double.
 * @returns {object} Dialog-compatible test double.
 */
function createTestDialog() {
  return {
    open: false,
    closeCount: 0,
    showCount: 0,
    close() {
      this.open = false;
      this.closeCount += 1;
    },
    showModal() {
      this.open = true;
      this.showCount += 1;
    },
  };
}

test("state and storage modules serialize work and handle unavailable storage", async () => {
  const state = await importProjectModule("js/core/app-state.js");
  const storage = await importProjectModule("js/core/app-storage.js");
  const queue = state.createAsyncTaskQueue();
  const execution = [];
  const first = queue.enqueue(async () => {
    execution.push("first");
    return 1;
  });
  const second = queue.enqueue(async () => {
    execution.push("second");
    return 2;
  });
  const memoryStorage = createMemoryStorage({ saved: " value " });
  const failingStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };

  assert.deepEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepEqual(execution, ["first", "second"]);
  assert.equal(storage.readBrowserStorageValue(memoryStorage, "saved"), "value");
  assert.equal(storage.writeBrowserStorageValue(memoryStorage, "next", " value "), true);
  assert.equal(storage.readBrowserStorageValue(memoryStorage, "next"), "value");
  assert.equal(storage.removeBrowserStorageValue(memoryStorage, "next"), true);
  assert.equal(storage.readBrowserStorageValue(failingStorage, "saved"), "");
  assert.equal(storage.writeBrowserStorageValue(failingStorage, "next", "value"), false);
  assert.equal(storage.removeBrowserStorageValue(failingStorage, "next"), false);
});

test("navigation, bootstrap and translations expose stable fallbacks", async () => {
  const navigation = await importProjectModule("js/core/app-navigation.js");
  const bootstrap = await importProjectModule("js/core/app-bootstrap.js");
  const translations = await importProjectModule("js/core/app-translations.js");

  assert.equal(navigation.normalizeThreadlinePage("tools"), "tools");
  assert.equal(navigation.normalizeThreadlinePage("invalid"), "composer");
  assert.equal(navigation.getThreadlinePageHref("tools"), "./tools.html");
  assert.equal(navigation.getThreadlinePageHref("composer"), "./");
  assert.deepEqual(bootstrap.normalizeVersionInfo({ appVersion: 2, cacheVersion: " v2 ", label: " Test " }), {
    appVersion: "2",
    cacheVersion: "v2",
    label: "Test",
  });
  assert.equal(bootstrap.versionSignature({ appVersion: "0.4.1", cacheVersion: "v2" }), "0.4.1|v2");
  assert.equal(translations.DEFAULT_LOCALE, "en");
  assert.deepEqual(translations.SUPPORTED_LOCALES, ["de", "en", "fr"]);
  assert.ok(translations.translations.de);
  assert.ok(translations.translations.en);
  assert.ok(translations.translations.fr);
});

test("shared image and link-card helpers normalize untrusted saved values", async () => {
  const images = await importProjectModule("js/shared/shared-images.js");
  const linkCards = await importProjectModule("js/shared/shared-link-cards.js");
  const normalizedImage = images.normalizeThreadImage({
    id: "image-1",
    dataUrl: "data:image/png;base64,AA==",
    alt: "long alternative text",
    edit: { zoom: 99, rotation: -90 },
    exportQuality: 2,
    exportScale: 0.1,
  }, {
    maxAltTextLength: 4,
    imageMinExportScale: 0.2,
  });

  assert.equal(normalizedImage.alt, "long");
  assert.equal(normalizedImage.edit.zoom, 3);
  assert.equal(normalizedImage.edit.rotation, 270);
  assert.equal(normalizedImage.edit.fitMode, "cover");
  assert.equal(normalizedImage.exportQuality, 0.92);
  assert.equal(normalizedImage.exportScale, 0.2);
  assert.equal(images.normalizeImageAutoResizeMode("lossy"), "lossy");
  assert.equal(images.normalizeImageAutoResizeMode("unknown"), "off");
  assert.equal(images.isImageAutoResizeEnabled("fit"), true);
  assert.equal(images.isImageAutoResizeEnabled("off"), false);
  assert.equal(linkCards.getFirstHttpUrl("Read https://example.test/path."), "https://example.test/path");
  assert.equal(linkCards.normalizeLinkCardTargetUrl("example.test/path"), "https://example.test/path");
  assert.equal(linkCards.normalizeLinkCardTargetUrl("javascript:alert(1)"), "");
  assert.deepEqual(linkCards.validateLinkCardTargetUrl("", (key) => key), {
    ok: false,
    url: "",
    message: "linkCardUrlMissing",
  });
});

test("shared post rendering models actor, interaction and embed details", async () => {
  const rendering = await importProjectModule("js/shared/shared-post-rendering.js");
  const post = {
    uri: "at://did:plc:alice/app.bsky.feed.post/one",
    cid: "cid-one",
    author: { displayName: "Alice", handle: "alice.test" },
    likeCount: 2,
    replyCount: 1,
  };

  assert.deepEqual(rendering.getPostAuthorFields(post.author, "Unknown"), {
    authorLabel: "Alice",
    handleLabel: "@alice.test",
  });
  assert.equal(rendering.getPostPreviewText({ text: "one two three" }, "empty", 7), "one ...");
  assert.equal(rendering.isPostLikedByViewer({ viewer: { like: "at://like" } }), true);
  assert.equal(rendering.getViewerLikeUri({ viewer: { like: " at://like " } }), "at://like");
  assert.deepEqual(rendering.buildLivePostInteractionModel(post, {
    isLiked() { return true; },
    isLikePending() { return false; },
  }), {
    hasValidPost: true,
    canReply: true,
    canLike: true,
    isLiked: true,
    isLikePending: false,
    likeTranslationKey: "threadExplorerUnlikeAction",
  });
  assert.deepEqual(rendering.extractExternalCardFromEmbed({
    media: { external: { uri: "https://example.test", title: "Example", description: "Desc" } },
  }), {
    url: "https://example.test",
    title: "Example",
    description: "Desc",
    thumb: "",
  });
});

test("dialog helpers manage modal content, links and queued confirmations", async () => {
  const dialogs = await importProjectModule("js/core/app-dialogs.js");
  const progressDialog = createTestDialog();
  const errorDialog = createTestDialog();
  const confirmDialog = createTestDialog();
  const progressTitle = { textContent: "" };
  const progressMessage = { textContent: "" };
  const errorTitle = { textContent: "" };
  const errorMessage = { textContent: "" };
  const errorLinkWrap = { hidden: true };
  const errorLink = { href: "", textContent: "" };
  const confirmTitle = { textContent: "" };
  const confirmMessage = { textContent: "" };
  const confirmButton = { textContent: "" };
  const cancelButton = { textContent: "" };
  const previewWrap = { hidden: true };
  const previews = [];

  dialogs.showProgressModal({ dialog: progressDialog, title: progressTitle, message: progressMessage }, "Working", "Please wait");
  assert.equal(progressDialog.open, true);
  assert.equal(progressTitle.textContent, "Working");
  assert.equal(dialogs.closeModalDialog(progressDialog), true);
  dialogs.showErrorModal({
    dialog: errorDialog,
    title: errorTitle,
    message: errorMessage,
    linkWrap: errorLinkWrap,
    link: errorLink,
  }, {
    title: "Error",
    message: "Details",
    linkUrl: "https://example.test/help",
    linkLabel: "Help",
  });
  assert.equal(errorDialog.open, true);
  assert.equal(errorLinkWrap.hidden, false);
  assert.equal(errorLink.href, "https://example.test/help");

  const controller = dialogs.createQueuedConfirmDialogController({
    dialog: confirmDialog,
    title: confirmTitle,
    message: confirmMessage,
    confirmButton,
    cancelButton,
    previewWrap,
  }, (preview) => {
    previews.push(preview);
  });
  const first = controller.open({
    title: "First",
    message: "One",
    confirmValue: "confirmed",
    cancelValue: "cancelled",
    dismissValue: "dismissed",
    fallbackConfirmLabel: "Yes",
    fallbackCancelLabel: "No",
  });
  const second = controller.open({
    title: "Second",
    message: "Two",
    confirmValue: true,
    cancelValue: false,
    dismissValue: null,
    fallbackConfirmLabel: "Yes",
    fallbackCancelLabel: "No",
    preview: { handle: "alice.test" },
  });

  await new Promise((resolve) => setImmediate(resolve));
  controller.confirm();
  assert.equal(await first, "confirmed");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(confirmTitle.textContent, "Second");
  assert.equal(previewWrap.hidden, false);
  assert.deepEqual(previews, [{ handle: "alice.test" }]);
  controller.cancel();
  assert.equal(await second, false);
});
