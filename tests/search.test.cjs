"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

/**
 * Loads one browser module through a data URL without changing the package module mode.
 * @param {string} relativePath - Module path relative to the project root.
 * @returns {Promise<object>} Exported module namespace.
 */
function importProjectModule(relativePath) {
  const source = fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
  const encodedSource = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encodedSource}`);
}

test("search helpers preserve shared query filters and safe highlights", async () => {
  const search = await importProjectModule("js/tools/search.js");

  assert.deepEqual(search.parseSearchTags("#eins, zwei; ##drei"), ["eins", "zwei", "drei"]);
  assert.deepEqual(search.splitSharedSearchQuery('Hallo -welt -"nicht hier"'), {
    query: "Hallo",
    excludeText: "welt, nicht hier",
  });
  assert.deepEqual(search.parseSearchQueryTerms('eins "zwei drei" eins'), ["eins", "zwei drei"]);
  assert.equal(search.escapeSearchHighlightRegex("a+b"), "a\\+b");
});
