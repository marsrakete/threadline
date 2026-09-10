"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

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
    "./js/core/app-state.js",
    "./js/core/app-storage.js",
    "./js/core/app-translations.js",
    "./js/shared/shared-accounts.js",
    "./js/shared/shared-images.js",
    "./js/shared/shared-templates.js",
    "./js/shared/shared-link-cards.js",
    "./js/shared/shared-languages.js",
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
    "./js/tools/tools-layout.js",
    "./js/tools/tools-page.js",
    "./js/tools/account-picker.js",
    "./js/tools/dm-archive.js",
    "./js/tools/search.js",
    "./js/tools/thread-explorer.js",
    "./js/tools/network.js",
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
