"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { projectRoot } = require("./module-test-helpers.cjs");

const MODULE_TESTS = {
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
  "js/composer/composer-history.js": "tests/composer-modules.test.cjs",
  "js/composer/composer-splitter.js": "tests/composer-modules.test.cjs",
  "js/core/app-bootstrap.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-dialogs.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-i18n.js": "tests/browser-modules.test.cjs",
  "js/core/app-navigation.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-shell.js": "tests/browser-modules.test.cjs",
  "js/core/app-state.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-storage.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-translations.js": "tests/core-shared-modules.test.cjs",
  "js/core/app-utils.js": "tests/browser-modules.test.cjs",
  "js/shared/shared-accounts.js": "tests/browser-modules.test.cjs",
  "js/shared/shared-images.js": "tests/core-shared-modules.test.cjs",
  "js/shared/shared-templates.js": "tests/browser-modules.test.cjs",
  "js/shared/shared-languages.js": "tests/shared-languages.test.cjs",
  "js/shared/shared-link-cards.js": "tests/core-shared-modules.test.cjs",
  "js/shared/shared-post-rendering.js": "tests/core-shared-modules.test.cjs",
  "js/tools/analysis.js": "tests/tools-modules.test.cjs",
  "js/tools/archive.js": "tests/tools-modules.test.cjs",
  "js/tools/account-picker.js": "tests/tools-modules.test.cjs",
  "js/tools/dm-archive.js": "tests/tools-modules.test.cjs",
  "js/tools/network.js": "tests/tools-modules.test.cjs",
  "js/tools/search.js": "tests/search.test.cjs",
  "js/tools/thread-explorer.js": "tests/tools-modules.test.cjs",
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
