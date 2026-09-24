"use strict";

const { expect, test } = require("@playwright/test");

/**
 * Blocks remote resources so browser module tests only use the local static test server.
 * @param {import("@playwright/test").Page} page - Browser page used for the test.
 * @returns {Promise<void>} Resolves when the request route is installed.
 */
async function blockExternalRequests(page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }

    await route.abort();
  });
}

/**
 * Opens the Composer page with external traffic blocked.
 * @param {import("@playwright/test").Page} page - Browser page used for the test.
 * @returns {Promise<void>} Resolves once the local page is ready.
 */
async function openApp(page) {
  await blockExternalRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
}

test("application bootstrap completes without runtime errors", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await openApp(page);
  await expect(page.locator("body")).toHaveAttribute("data-page", "composer");
  await expect.poll(() => pageErrors).toEqual([]);
});

test("core page modules load together and preserve page-local workspace rules", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const navigation = await import("/js/core/app-navigation.js");
    const shell = await import("/js/core/app-shell.js");
    const i18n = await import("/js/core/app-i18n.js");
    const toolsPage = await import("/js/tools/tools-page.js");
    const utils = await import("/js/core/app-utils.js");
    const templates = await import("/js/shared/shared-templates.js");
    const dmArchive = await import("/js/tools/dm-archive.js");
    const storageValues = new Map();
    const storage = {
      getItem(key) { return storageValues.get(key) || null; },
      setItem(key, value) { storageValues.set(key, String(value)); },
      removeItem(key) { storageValues.delete(key); },
    };
    const target = document.createElement("span");
    utils.setSafeText(target, "safe text");
    utils.setAttr(target, "data-test", "ok");
    const fragment = utils.cloneTemplate("segment-template");
    const directFragment = templates.cloneTemplateContent(document.querySelector("#segment-template"));
    let selectedParticipantDids = [];
    const dmContactList = document.createElement("div");
    const dmSelectionNote = document.createElement("p");
    const dmSummary = document.createElement("div");
    const dmResults = document.createElement("div");
    const dmRenderer = dmArchive.createDmArchiveWorkspaceRenderer({
      launchPanel: document.createElement("div"),
      contactSearchInput: document.createElement("input"),
      contactList: dmContactList,
      contactSearchNote: document.createElement("p"),
      contactSelectionNote: dmSelectionNote,
      summary: dmSummary,
      results: dmResults,
      checkButton: document.createElement("button"),
      loadPartnersButton: document.createElement("button"),
      loadButton: document.createElement("button"),
      exportJsonButton: document.createElement("button"),
      exportHtmlButton: document.createElement("button"),
      exportPdfButton: document.createElement("button"),
      summaryItemTemplate: document.querySelector("#dm-summary-item-template"),
      contactItemTemplate: document.querySelector("#dm-contact-item-template"),
      resultItemTemplate: document.querySelector("#dm-result-item-template"),
    }, {
      getState() {
        return {
          catalog: {
            manifest: { conversationCount: 1, messageCount: 2, participantCount: 2 },
            conversations: [{ id: "conversation", messageCount: 2, title: "Test conversation" }],
          },
          recentContacts: [{ did: "did:plc:alice", handle: "alice.test", displayName: "Alice", avatar: "https://cdn.example/alice.jpg" }],
          recentContactAssets: [],
          selectedParticipantDids,
        };
      },
      setSelectedParticipantDids(nextSelection) {
        selectedParticipantDids = nextSelection;
      },
      renderWorkspace() {
        dmRenderer.renderWorkspace();
      },
      translate(key, values = {}) {
        if (key === "dmConversationMeta") {
          return `${values.messages} messages`;
        }
        return key;
      },
      getLocale() {
        return "en";
      },
      assetToDataUri() {
        return "";
      },
      setAvatarImage(image, source, fallback) {
        image.alt = fallback;
        image.src = source;
      },
      getConversationTitle(conversation) {
        return conversation.title;
      },
      formatTimestamp() {
        return "now";
      },
      setContactSearchNote() {},
      setElementVisibility() {},
      isAccessAvailable() {
        return true;
      },
      getAuthAccount() {
        return { did: "did:plc:self" };
      },
      cloneTemplateContent: templates.cloneTemplateContent,
    });
    dmRenderer.renderWorkspace();
    const dmContactAvatar = dmContactList.querySelector(".dm-contact-avatar");
    const dmContactButton = dmContactList.querySelector(".dm-contact-chip");
    dmContactList.querySelector("button").click();
    const calls = [];
    const opened = toolsPage.openToolsWorkspace("search", {
      search() { calls.push("search"); },
    });
    const stored = toolsPage.persistToolsWorkspacePreference(storage, "primary", "legacy", "search");

    return {
      composerHref: navigation.getThreadlinePageHref("composer"),
      toolsHref: navigation.getThreadlinePageHref("tools"),
      composerWorkspace: shell.normalizeWorkspaceForCurrentPage("search"),
      englishLocaleHasComposerLabel: Boolean(i18n.getTranslationsForLocale("unknown").pageSwitchComposer),
      safeText: target.textContent,
      safeAttribute: target.getAttribute("data-test"),
      fragmentExists: Boolean(fragment),
      directFragmentExists: Boolean(directFragment),
      dmSummaryItems: dmSummary.children.length,
      dmPreviewItems: dmResults.querySelectorAll("article").length,
      dmContactAvatarSource: dmContactAvatar?.src || "",
      dmContactButtonTitle: dmContactButton?.getAttribute("title") || "",
      dmContactButtonLabel: dmContactButton?.getAttribute("aria-label") || "",
      dmSelectedParticipantDids: selectedParticipantDids,
      opened,
      calls,
      stored,
      storedWorkspace: toolsPage.readToolsWorkspacePreference(storage, "primary", "legacy"),
    };
  });

  expect(result).toEqual({
    composerHref: "./",
    toolsHref: "./tools.html",
    composerWorkspace: "composer",
    englishLocaleHasComposerLabel: true,
    safeText: "safe text",
    safeAttribute: "ok",
    fragmentExists: true,
    directFragmentExists: true,
    dmSummaryItems: 3,
    dmPreviewItems: 1,
    dmContactAvatarSource: "https://cdn.example/alice.jpg",
    dmContactButtonTitle: "",
    dmContactButtonLabel: "Alice @alice.test",
    dmSelectedParticipantDids: ["did:plc:alice"],
    opened: true,
    calls: ["search"],
    stored: true,
    storedWorkspace: "search",
  });
});

test("browser-bound shared modules create safe avatar and version behavior", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const accounts = await import("/js/shared/shared-accounts.js");
    const bootstrap = await import("/js/core/app-bootstrap.js");
    const image = document.createElement("img");
    accounts.setAvatarImage(image, "", "Alice");
    const version = await bootstrap.fetchVersionInfo();

    return {
      avatarAlt: image.alt,
      hasFallbackAvatar: image.src.startsWith("data:image/svg+xml"),
      versionSignature: bootstrap.versionSignature(version),
      versionMatchesPreload: version.appVersion === bootstrap.CURRENT_VERSION_INFO.appVersion,
    };
  });

  expect(result.avatarAlt).toBe("Alice");
  expect(result.hasFallbackAvatar).toBe(true);
  expect(result.versionSignature).toContain("|");
  expect(result.versionMatchesPreload).toBe(true);
});

test("Thread Explorer card interaction controller keeps header and footer actions separate", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const explorer = await import("/js/tools/thread-explorer.js");
    const post = { uri: "at://did:plc:alice/app.bsky.feed.post/one" };
    const actionCalls = [];
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    editButton.className = "thread-explorer-edit-button";
    editButton.hidden = true;
    actions.append(editButton);
    const headButtons = document.createElement("div");
    const anchor = document.createElement("a");
    headButtons.append(anchor);
    const controller = explorer.createThreadExplorerCardInteractionController({
      buildInteractionModel(value, options) {
        const isLiked = options.isLiked(value);
        return {
          canReply: true,
          canLike: true,
          isLiked,
          isLikePending: false,
          likeTranslationKey: isLiked ? "threadExplorerUnlikeAction" : "threadExplorerLikeAction",
        };
      },
      createButton(key, options) {
        const button = document.createElement("button");
        button.dataset.key = key;
        button.addEventListener("click", options.onClick);
        return button;
      },
      isLikePending() {
        return false;
      },
      isLiked(value) {
        return value.uri.endsWith("liked");
      },
      openComposerReply(value) {
        actionCalls.push(`reply:${value.uri}`);
      },
      toggleLike(value) {
        actionCalls.push(`like:${value.uri}`);
        return Promise.resolve();
      },
    });

    controller.renderInteractionActions(post, actions, headButtons, anchor);
    const footerActions = actions.querySelector(".thread-explorer-interaction-actions");
    const footerBeforeEdit = actions.firstElementChild === footerActions;
    footerActions.querySelectorAll("button")[0].click();
    footerActions.querySelectorAll("button")[1].click();

    const likedPost = { uri: "at://did:plc:alice/app.bsky.feed.post/liked" };
    controller.renderInteractionActions(likedPost, actions, headButtons, anchor);
    const likedActionKey = actions.querySelector(".thread-explorer-interaction-actions button:nth-child(2)")?.dataset.key || "";

    controller.renderInteractionActions(post, actions, headButtons, anchor, {
      renderInHeader: true,
    });

    return {
      footerBeforeEdit,
      footerActionCount: footerActions.querySelectorAll("button").length,
      headerActionCount: headButtons.querySelectorAll(".thread-explorer-interaction-actions button").length,
      footerVisibleWithHeaderActions: !actions.hidden,
      likedActionKey,
      actionCalls,
    };
  });

  expect(result.footerBeforeEdit).toBe(true);
  expect(result.footerActionCount).toBe(2);
  expect(result.headerActionCount).toBe(2);
  expect(result.footerVisibleWithHeaderActions).toBe(false);
  expect(result.likedActionKey).toBe("threadExplorerUnlikeAction");
  expect(result.actionCalls).toEqual([
    "reply:at://did:plc:alice/app.bsky.feed.post/one",
    "like:at://did:plc:alice/app.bsky.feed.post/one",
  ]);
});

test("Thread Explorer card presentation controller renders metrics, links, and edit markers", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const explorer = await import("/js/tools/thread-explorer.js");
    const calls = [];
    const post = {
      uri: "at://did:plc:alice/app.bsky.feed.post/one",
      cid: "bafytest",
    };
    const controller = explorer.createThreadExplorerCardPresentationController({
      translate(key, values = {}) {
        return `${key}:${values.count}`;
      },
      createMetricEntries() {
        return [
          { type: "Likes", count: 2, label: "2 Likes", isInteractive: true },
          { type: "Replies", count: 1, label: "1 Reply", isInteractive: true },
          { type: "Reposts", count: 0, label: "0 Reposts", isInteractive: false },
        ];
      },
      buildViewLinkModel() {
        return { url: "https://bsky.app/profile/alice.test/post/one", text: "↗" };
      },
      buildEditButtonModel() {
        return { isVisible: true, uri: post.uri };
      },
      applyTranslatedTitle(element, key) {
        element.dataset.titleKey = key;
      },
      handleRepliesCountClick(event) {
        calls.push(`replies:${event.currentTarget.dataset.uri}`);
      },
      handleCountClick(event) {
        calls.push(`count:${event.currentTarget.dataset.reactionType}`);
      },
      handleEditButtonClick(event) {
        calls.push(`edit:${event.currentTarget.dataset.uri}`);
      },
    });
    const counts = document.createElement("div");
    const link = document.createElement("a");
    const editButton = document.createElement("button");

    controller.renderCounts(post, counts);
    controller.renderViewLink(post, link);
    const editVisible = controller.renderEditButton(post, editButton);
    counts.querySelector(".thread-explorer-count-button").click();
    counts.querySelectorAll(".thread-explorer-count-button")[1].click();
    editButton.click();

    const noLink = document.createElement("a");
    const hiddenEdit = document.createElement("button");
    const hiddenController = explorer.createThreadExplorerCardPresentationController({
      buildViewLinkModel() {
        return null;
      },
      buildEditButtonModel() {
        return { isVisible: false, uri: "" };
      },
    });
    hiddenController.renderViewLink(post, noLink);
    const hiddenEditVisible = hiddenController.renderEditButton(post, hiddenEdit);

    return {
      metricLabels: Array.from(counts.children).map((element) => element.textContent),
      metricUri: counts.firstElementChild.dataset.uri,
      metricCid: counts.firstElementChild.dataset.cid,
      linkHref: link.href,
      linkText: link.textContent,
      linkTitleKey: link.dataset.titleKey,
      editVisible,
      editUri: editButton.dataset.uri,
      editTitleKey: editButton.dataset.titleKey,
      hiddenLink: noLink.hidden,
      hiddenEdit: hiddenEdit.hidden,
      hiddenEditVisible,
      calls,
    };
  });

  expect(result.metricLabels).toEqual(["2 Likes", "1 Reply", "0 Reposts"]);
  expect(result.metricUri).toBe("at://did:plc:alice/app.bsky.feed.post/one");
  expect(result.metricCid).toBe("bafytest");
  expect(result.linkHref).toBe("https://bsky.app/profile/alice.test/post/one");
  expect(result.linkText).toBe("↗");
  expect(result.linkTitleKey).toBe("threadExplorerViewInBskyButton");
  expect(result.editVisible).toBe(true);
  expect(result.editUri).toBe("at://did:plc:alice/app.bsky.feed.post/one");
  expect(result.editTitleKey).toBe("threadExplorerEditDetailsButton");
  expect(result.hiddenLink).toBe(true);
  expect(result.hiddenEdit).toBe(true);
  expect(result.hiddenEditVisible).toBe(false);
  expect(result.calls).toEqual([
    "count:Likes",
    "replies:at://did:plc:alice/app.bsky.feed.post/one",
    "edit:at://did:plc:alice/app.bsky.feed.post/one",
  ]);
});
