"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { projectRoot, importProjectModule } = require("./module-test-helpers.cjs");

/** Loads the exact classic-worker namespace without network or storage.
 * @returns {object} Immutable query operations.
 */
function loadQueries() {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "js/worker/search-queries.js"), "utf8"), context);
  return context.ThreadlineSearchQueries;
}
/** Converts cross-realm JSON records for assertions. @param {*} value - JSON value. @returns {*} Plain copy. */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test("worker search namespace exposes the imported contract without duplicate local implementations", () => {
  const queries = loadQueries();
  assert.equal(Object.isFrozen(queries), true);
  assert.equal(Object.keys(queries).length, 14);
  const sw = fs.readFileSync(path.join(projectRoot, "sw.js"), "utf8");
  assert.match(sw, /importScripts\([^;]*"\.\/js\/worker\/search-queries\.js"[^;]*\)/);
  for (const name of Object.keys(queries)) {
    assert.equal(typeof queries[name], "function");
    assert.equal(sw.includes(`function ${name}(`), false, name);
    assert.ok(sw.includes(name), name);
  }
});

test("worker search normalizers retain mode, sort, tag and language limits and invalid fallbacks", () => {
  const q = loadQueries();
  assert.equal(q.normalizeSearchWorkspaceMode(" posts "), "posts");
  assert.equal(q.normalizeSearchWorkspaceMode("bad"), "network");
  assert.equal(q.normalizeSearchWorkspaceMode(null), "network");
  assert.equal(q.normalizeSearchWorkspaceSort("top"), "top");
  assert.equal(q.normalizeSearchWorkspaceSort(null), "latest");
  assert.deepEqual(plain(q.normalizeSearchWorkspaceTags(["#one", " ##two ", ""])), ["one", "two"]);
  assert.equal(q.normalizeSearchWorkspaceTags(Array.from({ length: 12 }, (_, i) => `#${i}`)).length, 8);
  assert.deepEqual(plain(q.normalizeSearchWorkspaceTags("bad")), []);
  assert.equal(q.normalizeSearchWorkspaceTagMatchMode("any"), "any");
  assert.equal(q.normalizeSearchWorkspaceTagMatchMode("bad"), "all");
  assert.deepEqual(plain(q.normalizeSearchWorkspaceLanguages([" DE ", "de", "EN", "fr", "es"])), ["de", "en", "fr"]);
  assert.deepEqual(plain(q.normalizeSearchWorkspaceLanguages(null)), []);
});

test("worker and page share-query contracts agree on exclusion phrases and empty inputs", async () => {
  const q = loadQueries(); const page = await importProjectModule("js/tools/search.js");
  for (const [query, excluded] of [["word", "one,two words"], ["", '"quoted phrase";other'], [null, null], [" a ", ""], ["text", "one\ntwo"], ["", ""]]) {
    assert.equal(q.buildSharedSearchQuery(query, excluded), page.buildSharedSearchQuery(query, excluded));
    assert.deepEqual(plain(q.parseExcludedSearchTerms(excluded)), page.parseExcludedSearchTerms(excluded));
  }
});

test("worker searchPosts params retain all server filters and required-query errors", () => {
  const q = loadQueries();
  const payload = { query: " word ", excludeText: "two words", tags: ["#one", "two"], actor: "own.test", sort: "top", mentions: "friend.test",
    langs: ["de", "en"], domain: "example.test", url: "https://example.test/a", since: "start", until: "end" };
  const before = structuredClone(payload);
  assert.deepEqual(plain(q.buildSearchWorkspaceSearchPostsParams(payload, "fr")), {
    q: 'word -"two words"', tag: ["one", "two"], author: "own.test", mentions: "friend.test", lang: "fr",
    domain: "example.test", url: "https://example.test/a", sort: "top", since: "start", until: "end",
  });
  assert.deepEqual(payload, before);
  assert.equal(q.buildSearchWorkspaceSearchPostsParams({ tags: ["#one"] }).q, "#one");
  assert.equal(q.buildSearchWorkspaceSearchPostsParams({ query: "word", lang: "DE" }).lang, "de");
  assert.throws(() => q.buildSearchWorkspaceSearchPostsParams(null), /Suchtext oder Hashtag/);
  assert.throws(() => q.buildSearchWorkspaceSearchPostsParams({ domain: "only.test" }), /Suchtext oder Hashtag/);
});

test("worker request planning retains author-feed fallback and the language/tag cross-product", () => {
  const q = loadQueries();
  assert.equal(q.hasSearchWorkspaceServerQuery({ excludeText: "skip" }), true);
  assert.equal(q.hasSearchWorkspaceServerQuery(null), false);
  assert.equal(q.shouldFallbackNetworkSearchToAuthorFeed({ actor: "own.test" }), true);
  assert.equal(q.shouldFallbackNetworkSearchToAuthorFeed({ actor: "own.test", query: "word" }), false);
  assert.equal(q.shouldFallbackNetworkSearchToAuthorFeed({ mode: "posts", actor: "own.test" }), false);
  assert.equal(q.shouldFallbackNetworkSearchToAuthorFeed(null), false);
  const variants = q.buildSearchWorkspaceSearchVariants({ langs: ["de", "en"], tags: ["a", "b"], tagMatchMode: "any", query: "word" });
  assert.deepEqual(plain(variants.map(item => item.key)), ["de|a", "de|b", "en|a", "en|b"]);
  assert.equal(variants[2].forcedLang, "en");
  assert.deepEqual(plain(variants[2].payload.tags), ["a"]);
  assert.equal(q.buildSearchWorkspaceSearchVariants({ tags: ["a", "b"] }).length, 1);
  assert.equal(q.buildSearchWorkspaceSearchVariants(null)[0].key, "*|*");
});

test("worker cursor codec retains single cursors, variant exhaustion and malformed-data recovery", () => {
  const q = loadQueries();
  assert.equal(q.buildSearchWorkspaceSearchCursorState({ only: " next " }, new Set(), ["only"]), "next");
  assert.equal(q.parseSearchWorkspaceSearchCursorState(" next ", ["only"]).cursors.only, "next");
  const encoded = q.buildSearchWorkspaceSearchCursorState({ de: "next-de", en: "" }, new Set(["en"]), ["de", "en"]);
  const parsed = q.parseSearchWorkspaceSearchCursorState(encoded, ["de", "en"]);
  assert.equal(parsed.cursors.de, "next-de"); assert.deepEqual([...parsed.exhausted], ["en"]);
  assert.equal(q.buildSearchWorkspaceSearchCursorState({}, new Set(["de", "en"]), ["de", "en"]), "");
  assert.deepEqual(plain(q.parseSearchWorkspaceSearchCursorState("invalid", ["de", "en"]).cursors), {});
  const filtered = q.parseSearchWorkspaceSearchCursorState('{"cursors":{"de":"next","unknown":"bad"},"exhausted":["en","unknown"]}', ["de", "en"]);
  assert.deepEqual(plain(filtered.cursors), { de: "next" }); assert.deepEqual([...filtered.exhausted], ["en"]);
  assert.equal(q.buildSearchWorkspaceSearchCursorState(), "");
  assert.deepEqual(plain(q.parseSearchWorkspaceSearchCursorState(null, "bad").cursors), {});
});

test("worker continuation URI exclusion trims, deduplicates and rejects invalid lists", () => {
  const q = loadQueries();
  assert.deepEqual([...q.createSearchWorkspaceExcludeUriSet([" one ", "one", "", null, "two"])], ["one", "two"]);
  assert.equal(q.createSearchWorkspaceExcludeUriSet("invalid").size, 0);
  assert.equal(q.createSearchWorkspaceExcludeUriSet(null).size, 0);
});
