"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");

test("archive preferences delegate dates, filters and restoration to their cached module", () => {
  const source = readProjectFile("app.js");
  assert.ok(source.includes('from "./js/tools/archive-preferences.js"'));
  assert.ok(readProjectFile("sw.js").includes('"./js/tools/archive-preferences.js"'));
  for (const name of ["formatArchiveDateInputValue", "parseArchiveDateInputValue", "getArchiveDateAtLocalMidnight", "addArchiveMonths"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  for (const operation of ["clamp(preferredEdge)", "bounds()", "ensure()", "filters()", "pdf()", "wave()", "snapshot()", "restore(preferences)"]) {
    assert.ok(source.includes(`archivePreferencesController.${operation}`));
  }
});

test("analysis calculations delegate to cached domain modules without duplicate implementations", () => {
  const source = readProjectFile("app.js");
  const cache = readProjectFile("sw.js");
  for (const name of ["config", "corpus", "similarity", "temporal", "stylometry", "accounts", "comparison", "rendering", "table-models", "controller", "report-models", "report-layout", "pdf-rendering"]) {
    assert.ok(source.includes(`./js/tools/analysis-${name}.js`));
    assert.ok(cache.includes(`./js/tools/analysis-${name}.js`));
  }
  for (const name of ["countRegexMatches", "cosineSimilarityFromMaps", "jaccardSimilarityFromSets",
    "intersectionCountFromSets", "overlapSummaryFromSets", "frequencyMapFromEntries", "cosineSimilarityFromArrays",
    "shareArray", "getAnalysisTopEntriesFromMap", "buildAnalysisWordRateMap", "splitAnalysisTextsIntoWordChunks", "startOfUtcDay"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  assert.doesNotMatch(source, /const ANALYSIS_(FUNCTION_WORDS|NUMBER_WORDS|TEMPORAL_GAP_BUCKETS)\s*=/);
  for (const operation of ["corpus: analysisCorpusAnalyzer.create", "temporal: analysisTemporalAnalyzer.profile",
    "proximity: analysisTemporalAnalyzer.proximity", "overlap: analysisTemporalAnalyzer.overlapHeatmap",
    "stylometry: analysisStylometryAnalyzer.compare", "normalize: analysisAccountNormalizer.normalize", "compare: analysisAccountComparator.compare"]) {
    assert.ok(source.includes(operation));
  }
  for (const name of ["getPersistableAnalysisAccount", "analysisAccountNeedsNetworkRefresh", "computeBurrowsDelta", "createAnalysisCorpus", "createAnalysisTemporalProfile"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  assert.doesNotMatch(source, /const ANALYSIS_METRIC_DEFINITIONS\s*=/);
  assert.doesNotMatch(source, /const robustnessMix\s*=/);
  assert.doesNotMatch(source, /function buildAnalysisNetworkPatternDefinitions\(|function formatAnalysisPdfListEntries\(|function formatAnalysisPdfStatEntries\(/);
  assert.ok(source.includes("analysisPdfRenderer.export()"));
  assert.ok(source.includes("models: analysisReportModels, layout: analysisReportLayout, tables: analysisTableModels"));
  assert.doesNotMatch(source, /function (?:createAnalysisTextPdfPages|buildAnalysisPdfTextPageContent|convertAnalysisTextPagesToPdfPages|renderAnalysisPdf\w+|drawAnalysisPdf\w+|loadAnalysisPdfAvatarBitmap)\(/);
  assert.doesNotMatch(source, /const analysisPdfAvatarBitmapCache/);
  assert.doesNotMatch(source, /sendToServiceWorker\("LOAD_ANALYSIS_ACCOUNT"/);
  for (const operation of ["snapshot()", "restore(state)", "controls()"] ) {
    assert.ok(source.includes(`analysisController.${operation}`));
  }
  assert.doesNotMatch(source, /function renderAnalysisSummaryCard\(/);
  for (const pathname of ["index.html", "tools.html"]) {
    for (const name of ["note", "span", "tokens", "token", "stats", "stat", "bars", "bar", "pattern", "account", "result",
      "heatmap", "heatmap-grid", "axis", "heatmap-cell", "timeline", "timeline-tick", "timeline-row", "timeline-point",
      "profiles", "profile", "table", "table-head", "table-row", "temporal-comparison", "network-summary"]) {
      assert.ok(readProjectFile(pathname).includes(`id="analysis-${name}-template"`));
    }
  }
  assert.ok(source.includes("analysisController.handlers"));
  assert.ok(source.indexOf("bindAnalysisWorkspaceEvents({") > source.indexOf("const analysisController ="));
  assert.ok(source.includes("analysisWorkspaceController.show()"));
  assert.ok(source.includes("analysisWorkspaceController.render()"));
  assert.ok(source.includes("analysisWorkspaceController.translate()"));
  assert.ok(source.includes("analysisRenderer.result(analysisComparisonResult)"));
  const workspace = readProjectFile("js/tools/analysis.js");
  for (const operation of ["renderer.summary(", "renderer.result(", "renderer.temporal(", "renderer.network(", "renderer.metrics(", "renderer.patterns(", "options.tables.network(", "options.tables.temporal("]) {
    assert.ok(workspace.includes(operation));
  }
  for (const name of ["renderAnalysisTemporalAccountCard", "createAnalysisTemporalHeatmap", "createAnalysisTemporalComparisonHeatmap", "createAnalysisTemporalTimeline",
    "createAnalysisPatternList", "createAnalysisStatList", "createAnalysisBarList", "createAnalysisPatternCard", "createAnalysisSimpleChipList", "createAnalysisResolvedProfileList", "formatAnalysisTopTemporalEntries"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
});

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

test("network selection and viewport calculations stay behind domain module contracts", () => {
  const source = readProjectFile("app.js");
  for (const name of ["mergeNetworkNode", "getStrongNetworkScoreThreshold", "matchesNetworkFilter", "getNetworkSortValue"]) {
    assert.doesNotMatch(source, new RegExp(`function ${name}\\(`));
  }
  for (const operation of ["rankNetworkNodes", "selectNetworkNodes", "sortNetworkProfiles", "calculateNetworkViewport", "calculateNetworkContentBounds"]) {
    assert.match(source, new RegExp(`${operation}\\(`));
  }
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network\.js/);
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network-layout\.js/);
  assert.doesNotMatch(source, /sendToServiceWorker\("LOAD_NETWORK_SLICE"|function getNetworkOrbitAxes\(/);
  assert.match(source, /networkDataController\.load\(options\)/);
  assert.match(source, /networkLayoutController\.layout\(nodes, selectedDid\)/);
  assert.match(source, /renderNetworkLoadControls\(/);
  assert.match(source, /networkWorkspaceRenderer\.presentation\(\)/);
  assert.match(source, /networkFocusCardRenderer\.render\(\)/);
  assert.match(source, /networkStageRenderer\.render\(\)/);
  assert.match(source, /networkWorkspaceController\.handlers/);
  assert.match(source, /networkWorkspaceController\.render\(\)/);
  assert.match(source, /networkWorkspaceController\.reset\(\)/);
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network-controller\.js/);
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network-stage-rendering\.js/);
  for (const name of ["formatNetworkRelationshipDate", "formatNetworkActivityLastPost", "getNetworkActivityWindow"]) { assert.doesNotMatch(source, new RegExp(`function ${name}\\(`)); }
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network-focus-rendering\.js/);
  assert.match(readProjectFile("sw.js"), /\.\/js\/tools\/network-rendering\.js/);
  for (const pathname of ["index.html", "tools.html"]) {
    for (const id of ["intro", "group", "item", "more", "empty"]) { assert.ok(readProjectFile(pathname).includes(`id="network-result-${id}-template"`)); }
    for (const id of ["shell", "stat", "line", "meta", "description"]) { assert.ok(readProjectFile(pathname).includes(`id="network-focus-${id}-template"`)); }
    for (const id of ["scene", "node", "focus", "preview", "primitive"]) { assert.ok(readProjectFile(pathname).includes(`id="network-svg-${id}-template"`)); }
  }
  for (const handlers of ["modeHandlers", "insightHandlers", "interactionHandlers", "lifecycleHandlers"]) {
    assert.ok(source.includes(`networkStageController.${handlers}`));
  }
  assert.doesNotMatch(source, /networkStageSvg\.setPointerCapture\(/);
  assert.match(source, /await networkStageController\.enter\(\)/);
  assert.doesNotMatch(source, /sendToServiceWorker\("LOAD_NETWORK_ACTOR_FOCUS"|sendToServiceWorker\("LOAD_NETWORK_COMMON_MUTUALS"/);
  for (const [name, operation] of [["getKnownNetworkProfile", "known"], ["ingestNetworkProfiles", "ingest"],
    ["getNetworkStageFocusPreviewItems", "previews"], ["getPreferredNetworkSelection", "preferred"],
    ["setNetworkSelection", "select"], ["clearNetworkCommonMutuals", "clearCommon"],
    ["getActiveNetworkCommonMutualDids", "activeCommon"], ["loadNetworkFocusDetails", "loadFocus"], ["loadNetworkCommonMutuals", "loadCommon"]]) {
    const body = source.match(new RegExp(`(?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}`));
    assert.ok(body); assert.ok(body[0].includes(`networkFocusController.${operation}(`));
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
