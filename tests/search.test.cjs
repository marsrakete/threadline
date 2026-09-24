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

test("search helpers normalize persisted result items", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const valid = { post: { uri: "at://post" } };
  assert.deepEqual(search.normalizePersistedSearchResultItems([valid, null, { post: "invalid" }, valid], 1), [valid]);
  assert.deepEqual(search.normalizePersistedSearchResultItems("invalid", 10), []);
});

test("search helpers compare normalized preferences", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const normalize = (value) => ({ query: String(value.query || "").trim().toLowerCase() });
  assert.equal(search.areSearchPreferencesEqual({ query: " Hello " }, { query: "hello" }, normalize), true);
  assert.equal(search.areSearchPreferencesEqual({ query: "hello" }, { query: "world" }, normalize), false);
});

test("search helpers build and validate persisted result state", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const normalizeItems = (items, maxItems) => items.slice(0, maxItems);
  const normalizePreferences = (preferences) => ({ query: String(preferences.query || "").trim() });
  const state = search.buildPersistableSearchResultState(
    { query: "hello" },
    [{ post: { uri: "at://post" } }],
    "next",
    10,
    normalizeItems,
    normalizePreferences,
  );
  assert.deepEqual(state.preferences, { query: "hello" });
  assert.equal(search.doesSearchResultStateMatch({ query: " hello " }, state.preferences, normalizePreferences), true);
  assert.equal(search.doesSearchResultStateMatch({ query: "other" }, state.preferences, normalizePreferences), false);
  assert.equal(search.buildPersistableSearchResultState(null, [], ""), null);
});

test("search helpers normalize query parser values", async () => {
  const search = await importProjectModule("js/tools/search.js");
  assert.equal(search.getSavedSearchStringParam(new URLSearchParams("q=%20hello%20"), "q"), "hello");
  assert.equal(search.normalizeSavedSearchSort("top"), "top");
  assert.equal(search.normalizeSavedSearchSort("unknown"), "latest");
  assert.deepEqual(search.parseExcludedSearchTerms('one, "two words"; three'), ["one", '"two words"', "three"]);
  assert.equal(search.buildSharedSearchQuery("hello", 'one, "two words"'), 'hello -one -""two words""');
});

test("search helpers create preference normalizers", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const normalize = search.createSearchPreferencesNormalizer({
    normalizeHashtags: (values) => values,
    getDisplayHashtag: (value) => String(value).replace(/^#+/, ""),
    normalizeLanguages: (values) => values.slice(0, 1),
    maxLanguages: 1,
  });
  const result = normalize({ mode: "invalid", tags: ["#tag"], mediaFilter: "invalid", lang: "de" });
  assert.equal(result.mode, "network");
  assert.deepEqual(result.tags, ["tag"]);
  assert.deepEqual(result.langs, ["de"]);
  assert.equal(result.mediaFilter, "all");
});
