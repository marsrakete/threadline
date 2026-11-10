"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Creates filters with isolated query operations and explicit model adapters.
 * @returns {object} Factory, configuration and filters.
 */
function fixture() {
  const context = { URL };
  for (const name of ["search-queries", "search-filters"]) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, `js/worker/${name}.js`), "utf8"), context);
  }
  const options = { queries: context.ThreadlineSearchQueries,
    facets: record => ({ mentions: record.facets.flatMap(facet => facet.mentions || []), domains: record.facets.flatMap(facet => facet.domains || []) }),
    post: value => { if (!value?.uri) { return null; } return value; } };
  return { factory: context.createThreadlineSearchFilters, options, filters: context.createThreadlineSearchFilters(options) };
}

test("worker filter factory has an explicit frozen contract and validates dependencies", () => {
  const { factory, options, filters } = fixture();
  assert.deepEqual(Object.keys(filters), ["matches", "item", "timestamp"]);
  assert.equal(Object.isFrozen(filters), true);
  assert.throws(() => factory(null), /adapters/);
  assert.throws(() => factory({ ...options, queries: {} }), /query/);
  assert.equal(filters.matches(null, null), true);
  assert.equal(filters.matches({ text: "" }, { query: "word" }), false);
});

test("worker local text filters keep phrase, case, exclusion and tag matching rules", () => {
  const { filters: f } = fixture();
  const post = { text: "Alpha two words #TagLong", author: { handle: "AUTHOR.test" } };
  assert.equal(f.matches(post, { query: 'alpha "two words" author.test' }), true);
  assert.equal(f.matches(post, { query: 'alpha "absent phrase"' }), false);
  assert.equal(f.matches(post, { excludeText: 'skip;"two words"' }), false);
  assert.equal(f.matches(post, { excludeText: "missing" }), true);
  assert.equal(f.matches(post, { tags: ["TAG", "missing"], tagMatchMode: "any" }), true);
  assert.equal(f.matches(post, { tags: ["TAG", "missing"], tagMatchMode: "all" }), false);
  assert.equal(f.matches(post, { tags: "invalid" }), true);
});

test("worker local date filters include both UTC day boundaries and tolerate unknown dates", () => {
  const { filters: f } = fixture();
  for (const createdAt of ["2026-10-19T00:00:00.000Z", "2026-10-19T23:59:59.999Z"]) {
    assert.equal(f.matches({ createdAt }, { since: "2026-10-19", until: "2026-10-19" }), true);
  }
  assert.equal(f.matches({ createdAt: "2026-10-18T23:59:59.999Z" }, { since: "2026-10-19" }), false);
  assert.equal(f.matches({ indexedAt: "2026-10-20" }, { until: "2026-10-19" }), false);
  assert.equal(f.matches({ createdAt: "invalid" }, { since: "2026-10-19" }), true);
  assert.equal(f.matches({ createdAt: "2026-10-19" }, { since: "invalid", until: "invalid" }), true);
});

test("worker local filters resolve mention/language/domain and exact links through explicit adapters", () => {
  const { filters: f } = fixture();
  const post = { langs: ["DE"], facets: [{ mentions: ["did:example:friend"], domains: ["example.test"], features: [{ $type: "app.bsky.richtext.facet#link", uri: "https://example.test/a" }] }] };
  assert.equal(f.matches(post, { mentions: "did:example:friend", langs: ["de", "en"], domain: "EXAMPLE.TEST", url: "https://example.test/a" }), true);
  for (const payload of [{ mentions: "different" }, { langs: ["fr"] }, { domain: "other.test" }, { url: "https://example.test/b" }]) {
    assert.equal(f.matches(post, payload), false);
  }
  assert.equal(f.matches({ externalCard: { url: "https://example.test/a" } }, { domain: "example.test", url: "https://example.test/a" }), true);
  assert.equal(f.matches({ externalCard: { url: "invalid" }, facets: "invalid" }, { domain: "example.test" }), false);
});

test("worker media predicates distinguish images, video and neither", () => {
  const { filters: f } = fixture();
  assert.equal(f.matches({ images: [{}] }, { mediaFilter: "images" }), true);
  assert.equal(f.matches({ hasVideo: true }, { mediaFilter: "videos" }), true);
  assert.equal(f.matches({ images: [{}] }, { mediaFilter: "none" }), false);
  assert.equal(f.matches({ hasVideo: true }, { mediaFilter: "none" }), false);
  assert.equal(f.matches({ images: "invalid" }, { mediaFilter: "none" }), true);
  assert.equal(f.matches(null, { mediaFilter: "images" }), false);
  assert.equal(f.matches(null, { mediaFilter: "all" }), true);
});

test("worker type predicates preserve original/reply/quote/repost distinctions", () => {
  const { filters: f } = fixture();
  const reply = { reply: { root: { uri: "r" }, parent: { uri: "p" } } };
  assert.equal(f.matches(reply, { postTypeFilter: "replies" }), true);
  assert.equal(f.matches(reply, { postTypeFilter: "originals" }), false);
  assert.equal(f.matches({ quoteCard: { uri: "q" } }, { postTypeFilter: "quotes" }), true);
  assert.equal(f.matches({}, { postTypeFilter: "posts" }), true);
  assert.equal(f.matches({}, { postTypeFilter: "reposts" }, { reasonType: "repost" }), true);
  assert.equal(f.matches({}, { postTypeFilter: "non-reposts" }, { reasonType: "repost" }), false);
  assert.equal(f.matches({}, { postTypeFilter: "originals" }, { reasonType: "repost" }), false);
  assert.equal(f.matches({ reply: { root: { uri: "r" } } }, { postTypeFilter: "replies" }), false);
});

test("worker result models retain repost metadata without mutating inputs and reject missing posts", () => {
  const { filters: f } = fixture();
  const entry = { post: { uri: "post" }, reason: { $type: "app.bsky.feed.defs#reasonRepost", by: { handle: "own.test" }, indexedAt: "2026-10-19" } };
  const before = structuredClone(entry);
  const item = f.item(entry);
  assert.equal(item.post, entry.post); assert.equal(item.reasonType, "repost");
  assert.equal(item.repostBy, "own.test"); assert.equal(item.repostAt, "2026-10-19");
  assert.deepEqual(entry, before);
  assert.equal(f.item({ uri: "raw-post" }).reasonType, "");
  assert.equal(f.item(null), null); assert.equal(f.item({ post: "invalid" }), null);
});

test("worker timestamp priority remains indexed, created, reposted then zero", () => {
  const { filters: f } = fixture();
  assert.equal(f.timestamp({ post: { indexedAt: "2026-10-19", createdAt: "2026-10-18" } }), Date.parse("2026-10-19"));
  assert.equal(f.timestamp({ post: { createdAt: "2026-10-18" }, repostAt: "2026-10-19" }), Date.parse("2026-10-18"));
  assert.equal(f.timestamp({ repostAt: "2026-10-19" }), Date.parse("2026-10-19"));
  assert.equal(f.timestamp({ post: { indexedAt: "invalid", createdAt: "2026-10-18" } }), 0);
  assert.equal(f.timestamp(null), 0);
});
