"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

/**
 * Imports an isolated browser module from a data URL without changing the app's package mode.
 * @param {string} relativePath - Module path relative to the project root.
 * @returns {Promise<object>} Imported module namespace.
 */
function importProjectModule(relativePath) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const encodedSource = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encodedSource}`);
}

test("language tags are canonicalized, deduplicated and limited", async () => {
  const languages = await importProjectModule("js/shared/shared-languages.js");
  const tags = languages.normalizePostLanguageTags(["DE-de", "fr-FR", "de", "invalid", "en-US"], 3);

  assert.deepEqual(tags, ["de", "fr", "en"]);
});

test("language defaults and thread-intro fallbacks remain predictable", async () => {
  const languages = await importProjectModule("js/shared/shared-languages.js");

  assert.deepEqual(languages.inferDefaultPostLanguages("fr-CA"), ["fr"]);
  assert.deepEqual(languages.inferDefaultPostLanguages("unknown"), ["en"]);
  assert.equal(languages.resolveThreadIntroLocale(["es"], "de-DE"), "de");
  assert.equal(languages.resolveThreadIntroLocale(["fr"], "en"), "fr");
});
