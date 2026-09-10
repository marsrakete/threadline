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
          recentContacts: [{ did: "did:plc:alice", handle: "alice.test", displayName: "Alice" }],
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
