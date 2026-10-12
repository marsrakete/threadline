"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");

test("authentication UI and account actions remain module-owned and template-based", () => {
  const source = readProjectFile("app.js");
  assert.match(source, /savedAccountRenderer\.render\(\)/);
  assert.match(source, /loginController\.handlers/);
  assert.doesNotMatch(source, /sendToServiceWorker\("LOGIN"|function getAccountVisualState\(|accountSwitcherList\.innerHTML/);
  for (const pathname of ["index.html", "tools.html"]) {
    const html = readProjectFile(pathname);
    assert.match(html, /<template id="account-switcher-item-template">[\s\S]*?class="account-chip-label"[\s\S]*?class="account-chip-action"/);
  }
});

test("startup and settings orchestration remain behind explicit core controllers", () => {
  const source = readProjectFile("app.js");
  for (const [name, delegate] of [["registerServiceWorker", "applicationBootstrap.start"],
    ["hydrateAppState", "applicationHydration.hydrate"], ["persistSettings", "applicationStorage.persist"]]) {
    assert.match(source, new RegExp(`async function ${name}\\(\\) \\{ await ${delegate.replaceAll(".", "\\.")}\\(\\); \\}`));
  }
  assert.doesNotMatch(source, /sendToServiceWorker\("GET_APP_STATE"/);
});

test("help rendering, topic catalog and README loading remain module-owned", () => {
  const source = readProjectFile("app.js");
  for (const name of ["getInlineHelpTopic", "renderInlineHelpHtml", "renderMarkdownAsHtml", "renderInlineMarkdown", "sanitizeHelpUrl", "convertHtmlBlocks"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  assert.doesNotMatch(source, /let helpCache\b|helpContent\.innerHTML/);
  for (const path of ["index.html", "tools.html"]) { assert.match(readProjectFile(path), /<template id="help-topic-template">/); }
});

test("application update, install and session workflows remain module delegates", () => {
  const source = readProjectFile("app.js");
  for (const [name, delegate] of [["setUpdateStatus", "applicationUpdates.status"], ["renderVersionLabel", "applicationUpdates.renderVersion"],
    ["performAppReload", "applicationUpdates.reload"], ["checkForUpdates", "applicationUpdates.check"],
    ["scheduleSilentUpdateCheck", "applicationUpdates.schedule"], ["verifySession", "applicationSession.verify"],
    ["startSessionChecks", "applicationSession.start"], ["updateInstallButtonVisibility", "applicationInstall.render"]]) {
    const match = source.match(new RegExp(`(?:async )?function ${name}\\([^\\n]*\\) \\{[^{}]*\\}`));
    assert.ok(match); assert.ok(match[0].includes(delegate));
  }
  assert.doesNotMatch(source, /let (?:updateInProgress|reloadInProgress|lastAutoUpdateCheckAt|sessionCheckTimer|deferredInstallPrompt)\b/);
  assert.doesNotMatch(source, /sendToServiceWorker\("VERIFY_SESSION"/);
  assert.match(source, /createApplicationLifecycleHandlers\(/);
});

test("shell geometry and drag lifecycle remain behind the layout controller", () => {
  const source = readProjectFile("app.js");
  for (const [name, delegate] of [["applyDesktopLayoutState", "desktopLayout.apply"],
    ["applySidebarState", "desktopLayout.renderSidebar"], ["resetDesktopColumnWidths", "desktopLayout.reset"]]) {
    const match = source.match(new RegExp(`(?:async )?function ${name}\\([^\\n]*\\) \\{[^{}]*\\}`));
    assert.ok(match); assert.ok(match[0].includes(delegate));
  }
  for (const name of ["clampDesktopWidth", "getDesktopResizeHandleWidth", "startDesktopColumnResize"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  assert.doesNotMatch(source, /bindApplicationEvents\((?:sidebarToggleButton|sidebarResizeHandle|composerResizeHandle|DESKTOP_LAYOUT_MEDIA),/);
  assert.ok(source.indexOf("const desktopLayout =") < source.indexOf("\ndesktopLayout.apply();"));
  assert.match(source, /computedStyle: \(element\) => window\.getComputedStyle\(element\)/);
});

test("shared appearance and pending navigation remain module delegates", () => {
  const source = readProjectFile("app.js");
  for (const name of ["getStoredAppearancePreferences", "persistAppearancePreferences",
    "restoreAppearancePreferencesFromLocalStorage", "applyAppearancePreferencesFromUrl",
    "buildAppearanceAwarePageSwitchUrl", "syncAppearanceFromLocalStorage", "applyTheme",
    "applyCompactMode", "updateAppearanceModeControls", "persistPendingPageSwitchUrl",
    "getPendingPageSwitchUrl", "consumePendingPageSwitchUrl", "clearPendingPageSwitchUrl",
    "clearMatchingPendingPageSwitchUrl"]) {
    const match = source.match(new RegExp(`function ${name}\\([^\\n]*\\) \\{[^{}]*\\}`));
    assert.ok(match, `${name} must remain a thin delegate`);
    assert.match(match[0], /appearanceController\.|pendingNavigation\./);
    assert.doesNotMatch(match[0], /\b(?:if|for|while|switch|try)\s*[({]/);
  }
});

test("completed Composer domain operations remain module delegates in the entry point", () => {
  const source = readProjectFile("app.js");
  const operations = {
    renderSegments: "composerSegmentRenderer.render", renderSegmentLinkCard: "composerLinkCardPreview.render",
    applyMentionSourceSync: "composerMentionSourceCorrection.apply", openMentionSearchDialog: "composerMentionDialog.open",
    syncSegmentImages: "syncComposerSegmentImagesFromModule", syncSegmentLinkCards: "syncComposerSegmentLinkCards",
    resizeAllSegmentTextareas: "resizeComposerTextareas", normalizeStandardSiteMetadata: "normalizeSharedStandardSiteMetadata",
    getPublicationCardFooterLabel: "getSharedPublicationCardFooterLabel", formatComposerCharacterCount: "formatComposerCharacterCountFromModule",
    requestLinkCardFromProxy: "composerLinkCardRequests.proxy", requestLinkCardFromMicrolink: "composerLinkCardRequests.microlink",
    buildPublishErrorMessage: "buildComposerPublishErrorMessage", buildPublishRateLimitMessage: "composerRateLimitPresentation.message",
    renderPublishRateLimitNote: "composerRateLimitPresentation.render", queueDraftSave: "composerDocument.scheduleDraft",
  };
  for (const [name, delegate] of Object.entries(operations)) {
    const match = source.match(new RegExp(`(?:async )?function ${name}\\([^\\n]*\\) \\{[^{}]*\\}`));
    assert.ok(match, `${name} must remain a thin delegate`);
    assert.ok(match[0].includes(delegate), `${name} must delegate to ${delegate}`);
    assert.doesNotMatch(match[0], /\b(?:if|for|while|switch)\s*\(/);
  }
  for (const name of ["hasEmojiLikeGraphemes", "hasCjkGraphemes", "autoSizeTextarea", "normalizePublishRateLimit",
    "formatPublishRateLimitPolicy", "formatPublishRateLimitResetAt", "encodeSvgDataUrl", "createToolIcon"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`), `${name} must not have a duplicate entry-point implementation`);
  }
  assert.doesNotMatch(source, /let mentionSearch(?:InputTimer|RequestToken)/);
  assert.ok(source.includes('publishButton.addEventListener("click", composerPublishController.click)'));
  assert.doesNotMatch(source, /publishButton\.addEventListener\("click", async/);
});

test("application entry point parses as an ES module", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: readProjectFile("app.js"),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});

/**
 * Reads one UTF-8 project file for structural assertions.
 * @param {string} relativePath - Path relative to the project root.
 * @returns {string} File contents.
 */
function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

/**
 * Reads one JSON project file for structural assertions.
 * @param {string} relativePath - Path relative to the project root.
 * @returns {object} Parsed JSON contents.
 */
function readProjectJson(relativePath) {
  return JSON.parse(readProjectFile(relativePath));
}

test("app pages provide the shared shell and privacy navigation", () => {
  for (const pageName of ["index.html", "tools.html"]) {
    const html = readProjectFile(pageName);
    assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
    assert.match(html, /<a class="ghost-button page-switch-link[^>]*data-page-target="composer"/);
    assert.match(html, /<a class="ghost-button page-switch-link[^>]*data-page-target="tools"/);
    assert.match(html, /data-privacy-language-link data-privacy-page-link/);
    assert.match(html, /<template id="segment-template">/);
    assert.match(html, /<template id="search-result-item-template">/);
    assert.match(html, /<script src="version\.js"><\/script>/);
    assert.match(html, /<script type="module" src="app\.js"><\/script>/);
  }
});

test("privacy page provides all supported language anchors", () => {
  const privacyPage = readProjectFile("datenschutz.html");
  for (const locale of ["de", "en", "fr"]) {
    assert.match(privacyPage, new RegExp(`<section id="${locale}" class="privacy-document"`));
    assert.match(privacyPage, new RegExp(`<a href="#${locale}">`));
  }
  assert.match(privacyPage, /<body class="privacy-page">/);
});

test("service worker precaches every app page and extracted shared module", () => {
  const serviceWorker = readProjectFile("sw.js");
  const requiredAssets = [
    "./index.html",
    "./tools.html",
    "./datenschutz.html",
    "./js/core/app-navigation.js",
    "./js/core/app-dialogs.js",
    "./js/core/app-initialization.js",
    "./js/core/app-layout-state.js",
    "./js/core/app-state.js",
    "./js/core/app-session.js",
    "./js/core/app-help.js",
    "./js/core/app-help-markdown.js",
    "./js/core/app-help-topics.js",
    "./js/core/app-storage.js",
    "./js/core/app-backup.js",
    "./js/core/app-translations.js",
    "./js/shared/shared-accounts.js",
    "./js/shared/shared-images.js",
    "./js/shared/shared-templates.js",
    "./js/shared/shared-link-cards.js",
    "./js/shared/shared-languages.js",
    "./js/shared/shared-hashtags.js",
    "./js/shared/shared-post-rendering.js",
    "./js/atproto/atproto-worker.js",
    "./js/atproto/atproto-actors.js",
    "./js/atproto/atproto-media.js",
    "./js/atproto/atproto-posting.js",
    "./js/atproto/atproto-search.js",
    "./js/composer/composer-main.js",
    "./js/composer/composer-splitter.js",
    "./js/composer/composer-images.js",
    "./js/composer/composer-link-cards.js",
    "./js/composer/composer-history.js",
    "./js/composer/composer-mentions.js",
    "./js/composer/composer-page.js",
    "./js/composer/composer-post-settings.js",
    "./js/composer/composer-validation.js",
    "./js/composer/composer-segments.js",
    "./js/composer/composer-image-geometry.js",
    "./js/composer/composer-publishing.js",
    "./js/composer/composer-image-renderer.js",
    "./js/composer/composer-image-editor.js",
    "./js/composer/composer-image-processing.js",
    "./js/composer/composer-document.js",
    "./js/composer/composer-link-card-providers.js",
    "./js/composer/composer-dialogs.js",
    "./js/composer/composer-segment-rendering.js",
    "./js/tools/tools-layout.js",
    "./js/tools/tools-page.js",
    "./js/tools/account-picker.js",
    "./js/tools/dm-archive.js",
    "./js/tools/search.js",
    "./js/tools/thread-explorer.js",
    "./js/tools/thread-explorer-controller.js",
    "./js/tools/thread-explorer-snapshot.js",
    "./js/tools/thread-explorer-layout.js",
    "./js/tools/thread-explorer-hydration.js",
    "./js/tools/thread-explorer-media-hydration.js",
    "./js/tools/thread-explorer-rendering.js",
    "./js/tools/network.js",
    "./js/tools/network-ui.js",
    "./js/tools/analysis.js",
    "./js/tools/archive.js",
  ];

  requiredAssets.forEach((assetPath) => {
    assert.ok(serviceWorker.includes(`"${assetPath}"`), assetPath);
  });
});

test("package and service-worker versions stay synchronized", () => {
  const packageInfo = readProjectJson("package.json");
  const versionInfo = readProjectJson("version.json");
  const versionScript = readProjectFile("version.js");

  assert.equal(packageInfo.version, versionInfo.appVersion);
  assert.match(versionScript, new RegExp(`appVersion: "${versionInfo.appVersion}"`));
  assert.match(versionScript, new RegExp(`cacheVersion: "${versionInfo.cacheVersion}"`));
});
