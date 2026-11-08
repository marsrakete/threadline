"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { projectRoot } = require("./module-test-helpers.cjs");

const MODULE_TESTS = {
  "js/worker/archive-wave-controller.js": "tests/worker-archive-controller.test.cjs",
  "js/worker/identity-service.js": "tests/worker-session.test.cjs",
  "js/worker/explorer-reaction-service.js": "tests/worker-reactions-media-models.test.cjs",
  "js/worker/interaction-service.js": "tests/worker-publishing.test.cjs",
  "js/worker/publish-service.js": "tests/worker-publishing.test.cjs",
  "js/worker/reply-models.js": "tests/worker-post-checks.test.cjs",
  "js/worker/post-check-service.js": "tests/worker-post-checks.test.cjs",
  "js/worker/settings-models.js": "tests/worker-settings.test.cjs",
  "js/worker/settings-service.js": "tests/worker-settings.test.cjs",
  "js/worker/richtext-models.js": "tests/worker-richtext.test.cjs",
  "js/worker/richtext-service.js": "tests/worker-richtext.test.cjs",
  "js/worker/media-export-service.js": "tests/worker-media-export-service.test.cjs",
  "js/worker/media-export-models.js": "tests/worker-reactions-media-models.test.cjs",
  "js/worker/explorer-hydration-service.js": "tests/worker-explorer-hydration.test.cjs",
  "js/worker/explorer-feed-models.js": "tests/worker-explorer-loading.test.cjs",
  "js/worker/explorer-load-service.js": "tests/worker-explorer-loading.test.cjs",
  "js/worker/explorer-models.js": "tests/worker-explorer-models.test.cjs",
  "js/worker/composer-image-models.js": "tests/worker-composer-image-models.test.cjs",
  "js/worker/composer-image-store.js": "tests/worker-composer-image-store.test.cjs",
  "js/worker/network-workspace-service.js": "tests/worker-network-workspace.test.cjs",
  "js/worker/network-data-service.js": "tests/worker-network-data.test.cjs",
  "js/worker/account-service.js": "tests/worker-account.test.cjs",
  "js/worker/session-service.js": "tests/worker-session.test.cjs",
  "js/worker/adapter-messages.js": "tests/worker-adapters.test.cjs",
  "js/worker/transport-service.js": "tests/worker-adapters.test.cjs",
  "js/worker/auth-models.js": "tests/worker-adapters.test.cjs",
  "js/worker/storage-service.js": "tests/worker-adapters.test.cjs",
  "js/worker/analysis-models.js": "tests/worker-analysis.test.cjs",
  "js/worker/analysis-messages.js": "tests/worker-analysis.test.cjs",
  "js/worker/analysis-service.js": "tests/worker-analysis.test.cjs",
  "js/worker/archive-import-service.js": "tests/worker-archive-import.test.cjs",
  "js/worker/archive-wave-service.js": "tests/worker-archive-services.test.cjs",
  "js/worker/archive-asset-service.js": "tests/worker-archive-services.test.cjs",
  "js/worker/archive-source-service.js": "tests/worker-archive-wave.test.cjs",
  "js/worker/archive-thread-service.js": "tests/worker-archive-thread.test.cjs",
  "js/worker/archive-models.js": "tests/worker-archive-models.test.cjs",
  "js/worker/archive-run-control.js": "tests/worker-archive-control.test.cjs",
  "js/worker/archive-run-messages.js": "tests/worker-archive-control.test.cjs",
  "js/worker/dm-service.js": "tests/worker-dm-service.test.cjs",
  "js/worker/dm-messages.js": "tests/worker-dm-service.test.cjs",
  "js/worker/search-service.js": "tests/worker-search-service.test.cjs",
  "js/worker/dm-models.js": "tests/worker-dm-models.test.cjs",
  "js/worker/search-filters.js": "tests/worker-search-filters.test.cjs",
  "js/worker/search-queries.js": "tests/worker-search.test.cjs",
  "js/atproto/atproto-actors.js": "tests/atproto-adapters.test.cjs",
  "js/atproto/atproto-client.js": "tests/worker-contract.test.cjs",
  "js/atproto/atproto-media.js": "tests/atproto-adapters.test.cjs",
  "js/atproto/atproto-posting.js": "tests/atproto-adapters.test.cjs",
  "js/atproto/atproto-search.js": "tests/atproto-adapters.test.cjs",
  "js/atproto/atproto-session.js": "tests/worker-contract.test.cjs",
  "js/atproto/atproto-worker.js": "tests/worker-contract.test.cjs",
  "js/composer/composer-images.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-link-cards.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-main.js": "tests/composer-main.test.cjs",
  "js/composer/composer-mentions.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-page.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-post-settings.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-validation.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-segments.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-image-geometry.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-publishing.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-image-renderer.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-image-editor.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-image-processing.js": "tests/composer-image-processing.test.cjs",
  "js/composer/composer-document.js": "tests/composer-document.test.cjs",
  "js/composer/composer-link-card-providers.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-dialogs.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-segment-rendering.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-history.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-splitter.js": "tests/composer-modules.test.cjs",
  "js/core/app-bootstrap.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-session.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-help.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-help-markdown.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-help-topics.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-dialogs.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-i18n.js": "tests/browser-modules.test.cjs",
  "js/core/app-initialization.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-navigation.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-shell.js": "tests/browser-modules.test.cjs",
  "js/core/app-state.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-storage.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-backup.js": "tests/app-backup.test.cjs",
  "js/core/app-translations.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-utils.js": "tests/browser-modules.test.cjs",
  "js/core/app-layout-state.js": "tests/core-shared-modules.test.cjs",
  "js/shared/shared-accounts.js": "tests/browser-modules.test.cjs",
  "js/shared/shared-assets.js": "tests/archive-assets.test.cjs",
  "js/shared/shared-images.js": "tests/core-shared-modules.test.cjs",
  "js/shared/shared-zip.js": "tests/shared-zip.test.cjs",
  "js/shared/shared-pdf.js": "tests/shared-pdf.test.cjs",
  "js/shared/shared-pdf-text.js": "tests/shared-pdf.test.cjs",
  "js/shared/shared-canvas.js": "tests/shared-pdf.test.cjs",
  "js/shared/shared-templates.js": "tests/browser-modules.test.cjs",
  "js/shared/shared-languages.js": "tests/shared-languages.test.cjs",
  "js/shared/shared-hashtags.js": "tests/shared-hashtags.test.cjs",
  "js/shared/shared-link-cards.js": "tests/core-shared-modules.test.cjs",
  "js/shared/shared-post-rendering.js": "tests/core-shared-modules.test.cjs",
  "js/tools/analysis.js": "tests/tools-modules.test.cjs",
  "js/tools/analysis-config.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-accounts.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-comparison.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-rendering.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-table-models.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-controller.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-report-models.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-report-layout.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-pdf-rendering.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-corpus.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-similarity.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-temporal.js": "tests/analysis-calculations.test.cjs",
  "js/tools/analysis-stylometry.js": "tests/analysis-calculations.test.cjs",
  "js/tools/archive-catalog.js": "tests/archive-media.test.cjs",
  "js/tools/archive-media-models.js": "tests/archive-media.test.cjs",
  "js/tools/archive-media-export.js": "tests/archive-media.test.cjs",
  "js/tools/archive-assets.js": "tests/archive-assets.test.cjs",
  "js/tools/archive-workspace-models.js": "tests/archive-workspace.test.cjs",
  "js/tools/archive-workspace-rendering.js": "tests/browser-archive-workspace.test.cjs",
  "js/tools/archive-run-controller.js": "tests/archive-workspace.test.cjs",
  "js/tools/archive-source.js": "tests/archive-source.test.cjs",
  "js/tools/archive.js": "tests/tools-modules.test.cjs",
  "js/tools/archive-pdf-layout.js": "tests/archive-pdf.test.cjs",
  "js/tools/archive-pdf-rendering.js": "tests/browser-archive-export.test.cjs",
  "js/tools/archive-pdf-export.js": "tests/archive-pdf.test.cjs",
  "js/tools/archive-html-models.js": "tests/archive-html.test.cjs",
  "js/tools/archive-html-rendering.js": "tests/browser-archive-export.test.cjs",
  "js/tools/archive-html-export.js": "tests/archive-html.test.cjs",
  "js/tools/archive-preferences.js": "tests/tools-modules.test.cjs",
  "js/tools/account-picker.js": "tests/tools-modules.test.cjs",
  "js/tools/dm-export-models.js": "tests/dm-export.test.cjs",
  "js/tools/dm-html-rendering.js": "tests/dm-export.test.cjs",
  "js/tools/dm-pdf-rendering.js": "tests/dm-export.test.cjs",
  "js/tools/dm-archive.js": "tests/tools-modules.test.cjs",
  "js/tools/network.js": "tests/tools-modules.test.cjs",
  "js/tools/network-layout.js": "tests/tools-modules.test.cjs",
  "js/tools/network-rendering.js": "tests/tools-modules.test.cjs",
  "js/tools/network-focus-rendering.js": "tests/tools-modules.test.cjs",
  "js/tools/network-stage-rendering.js": "tests/tools-modules.test.cjs",
  "js/tools/network-controller.js": "tests/tools-modules.test.cjs",
  "js/tools/network-ui.js": "tests/tools-modules.test.cjs",
  "js/tools/search-results.js": "tests/tools-modules.test.cjs",
  "js/tools/search-models.js": "tests/search-controller.test.cjs",
  "js/tools/search-form.js": "tests/search-controller.test.cjs",
  "js/tools/search-controller.js": "tests/search-controller.test.cjs",
  "js/tools/search.js": "tests/search.test.cjs",
  "js/tools/thread-explorer.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-controller.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-snapshot.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-layout.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-hydration.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-media-hydration.js": "tests/tools-modules.test.cjs",
  "js/tools/thread-explorer-rendering.js": "tests/tools-modules.test.cjs",
  "js/tools/tools-layout.js": "tests/tools-modules.test.cjs",
  "js/tools/tools-page.js": "tests/browser-modules.test.cjs",
};

/**
 * Recursively lists JavaScript modules below one directory.
 * @param {string} directory - Absolute source directory.
 * @returns {string[]} Project-relative module paths.
 */
function listJavaScriptModules(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const modules = [];
  entries.forEach((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      modules.push(...listJavaScriptModules(entryPath));
      return;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      modules.push(path.relative(projectRoot, entryPath).replace(/\\/g, "/"));
    }
  });
  return modules;
}

test("every extracted JavaScript module has an assigned behavior or contract test", () => {
  const sourceModules = listJavaScriptModules(path.join(projectRoot, "js")).sort();
  const coveredModules = Object.keys(MODULE_TESTS).sort();

  assert.deepEqual(coveredModules, sourceModules);
  Object.values(MODULE_TESTS).forEach((testPath) => {
    assert.equal(fs.existsSync(path.join(projectRoot, testPath)), true, testPath);
  });
});
