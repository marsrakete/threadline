"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { archiveModelsFixture, plain, uri } = require("./worker-archive-models-fixtures.cjs");

test("archive models initialize in the real worker and require explicit shared adapters", () => {
  const f = archiveModelsFixture();
  assert.throws(() => f.factory(), /normalizeTags/);
  for (const key of Object.keys(f.options)) {
    assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError);
  }
  for (const limit of [-1, 1.5, "10", NaN]) { assert.throws(() => f.factory({ ...f.options, maxImages: limit }), /image limit/); }
  assert.equal(Object.isFrozen(f.models), true);
  for (const api of Object.values(f.models)) { assert.equal(Object.isFrozen(api), true); }
  assert.deepEqual(Object.keys(f.models), ["filters", "threads", "posts", "wave"]);
  assert.equal(Object.values(f.models).flatMap(Object.keys).length, 19);
});

test("archive filter normalization retains defaults, trimming, enums and normalized tag identity", () => {
  const { filters: f } = archiveModelsFixture().models;
  assert.deepEqual(plain(f.normalize()), { sourceActor: "", sourceDid: "", scope: "all", contentMode: "posts", includeConversationContext: false,
    year: "", from: "", to: "", hashtagTags: [], hashtagScope: "thread" });
  const input = { sourceActor: " @@Own.Test ", sourceDid: " did:own ", scope: "range", contentMode: "threads", includeConversationContext: true,
    year: " 2026 ", from: " 2026-01-01 ", to: " 2026-12-31 ", hashtagTags: ["#Topic", { value: "topic" }, { tag: "#Äpfel!" }, null], hashtagScope: "startpost" };
  const result = f.normalize(input);
  assert.equal(result.sourceActor, "Own.Test"); assert.equal(result.sourceDid, "did:own");
  assert.deepEqual(plain(result.hashtagTags), ["topic", "äpfel"]); assert.equal(result.from, "2026-01-01");
  assert.equal(result.hashtagScope, "startpost"); assert.equal(result.includeConversationContext, true);
  assert.equal(f.normalize({ scope: "YEAR", contentMode: "bad", includeConversationContext: 1 }).scope, "all");
  assert.equal(f.normalize({ contentMode: "full" }).contentMode, "full");
  assert.throws(() => f.normalize(null), /Cannot read properties/);
});

test("archive hashtags combine explicit facets and real Unicode text parsing with OR matching", () => {
  const { filters: f } = archiveModelsFixture().models;
  const record = { text: "Text #Äpfel! #Topic #topic", facets: [null, { features: [null, { $type: "app.bsky.richtext.facet#tag", tag: "#EXPLICIT" }] }] };
  assert.deepEqual(Array.from(f.tags(record)), ["explicit", "äpfel", "topic"]);
  assert.equal(f.matchesHashtags(record, { hashtagTags: ["missing", "topic"] }), true);
  assert.equal(f.matchesHashtags(record, { hashtagTags: ["TOPIC"] }), false);
  assert.equal(f.matchesHashtags(null, {}), true); assert.equal(f.matchesHashtags(null, { hashtagTags: ["topic"] }), false);
  assert.equal(f.tags({ facets: "bad", text: 42 }).size, 0); assert.equal(f.tags().size, 0);
});

test("archive date filters preserve year matching, inclusive UTC boundaries and missing/invalid dates", () => {
  const { filters: f } = archiveModelsFixture().models;
  const range = { scope: "range", from: "2026-10-28", to: "2026-10-28" };
  for (const date of ["2026-10-28T00:00:00.000Z", "2026-10-28T23:59:59.999Z"]) { assert.equal(f.matchesDate({ createdAt: date }, range), true); }
  for (const date of ["2026-10-27T23:59:59.999Z", "2026-10-29T00:00:00.000Z", "bad"]) { assert.equal(f.matchesDate({ createdAt: date }, range), false); }
  assert.equal(f.matchesDate(null, range), true); assert.equal(f.matchesDate({ createdAt: 42 }, range), true);
  assert.equal(f.matchesDate({ createdAt: "2026-anything" }, { scope: "year", year: "2026" }), true);
  assert.equal(f.matchesDate({ createdAt: "2025-12-31" }, { scope: "year", year: "2026" }), false);
  assert.equal(f.matchesDate({ createdAt: "bad" }, { scope: "all" }), true);
});

test("archive roots and main paths preserve fallback and missing/foreign parent ownership rules", () => {
  const { threads: t } = archiveModelsFixture().models; const own = "did:example:own", other = "did:example:other";
  assert.equal(t.root({}, uri()), uri()); assert.equal(t.root({ reply: {} }, uri()), "");
  assert.equal(t.root(null, uri()), uri()); assert.equal(t.parent(null), "");
  assert.equal(t.parent({ reply: { parent: { uri: uri("parent") } } }), uri("parent"));
  assert.equal(t.own({ reply: {} }, own), true);
  assert.equal(t.own({ reply: { root: { uri: uri("root", other) } } }, own), false);
  const reply = { reply: { root: { uri: uri() }, parent: { uri: uri("parent", other) } } };
  assert.equal(t.own(reply, own), true); assert.equal(t.main(reply, own), false);
  assert.equal(t.main({ reply: { root: { uri: uri() } } }, own), true);
  assert.equal(t.main({}, own, uri()), true); assert.equal(t.own({}, own, "invalid"), false);
});

test("archive content selection composes dates with full, roots and own-thread modes", () => {
  const { threads: t } = archiveModelsFixture().models; const own = "did:example:own";
  const reply = { createdAt: "2026-10-28", reply: { root: { uri: uri() }, parent: { uri: uri("other", "did:example:other") } } };
  assert.equal(t.select(reply, { scope: "all", contentMode: "posts" }, own), true);
  assert.equal(t.select(reply, { scope: "all", contentMode: "thread_roots" }, own), false);
  assert.equal(t.select({ reply: { root: { uri: uri("other", "did:example:other") } } }, { scope: "all", contentMode: "full" }, own), true);
  assert.equal(t.select(reply, { scope: "year", year: "2025", contentMode: "full" }, own), false);
  assert.equal(t.select(null, { scope: "all", contentMode: "posts" }, own), true);
  assert.throws(() => t.select(reply, null, own), /Cannot read properties/);
});

test("archive image models cap direct/items/nested embeds without cloning image descriptors", () => {
  const f = archiveModelsFixture(), p = f.models.posts;
  const images = Array.from({ length: 12 }, (_, index) => ({ image: index }));
  const result = p.images({ embed: { images, media: { images: [{ image: "ignored" }] } } });
  assert.equal(result.length, 10); assert.equal(result[0], images[0]); assert.notEqual(result, images);
  assert.equal(p.images({ embed: { items: [null, {}, { image: "one" }] } }).length, 1);
  assert.equal(p.images({ embed: { media: { media: { images } } } }).length, 10);
  assert.equal(p.images({ embed: { images: [], media: { images } } }).length, 0);
  for (const value of [null, {}, { embed: "bad" }]) { assert.equal(p.images(value).length, 0); }
  assert.equal(f.factory({ ...f.options, maxImages: 0 }).posts.images({ embed: { images } }).length, 0);
});

test("archive video models retain blob identity and normalize optional aspect/alt fields", () => {
  const p = archiveModelsFixture().models.posts; const video = { ref: { $link: "cid" } };
  const result = p.videos({ embed: { media: { video, alt: " Alt ", aspectRatio: { width: "1920", height: "bad" } } } })[0];
  assert.equal(result.video, video); assert.equal(result.alt, "Alt"); assert.deepEqual(plain(result.aspectRatio), { width: 1920, height: 0 });
  assert.equal(p.videos({ embed: { video } })[0].aspectRatio, null);
  assert.equal(p.videos({ embed: { video: "bad" } }).length, 0); assert.equal(p.videos(null).length, 0);
});

test("archive card models retain direct/nested priority, thumbnail references and publication metadata", () => {
  const p = archiveModelsFixture().models.posts; const thumb = { url: " https://example.test/image " };
  const card = p.card({ embed: { external: { uri: " https://example.test ", title: " Title ", thumb, publication: { name: " Publication " } } } });
  assert.equal(card.url, "https://example.test"); assert.equal(card.title, "Title"); assert.equal(card.thumb, "https://example.test/image");
  assert.equal(card.thumbRef, thumb); assert.equal(card.standardSite.publicationName, "Publication");
  assert.equal(card.thumbPath, ""); assert.equal(card.thumbLoadFailed, false); assert.equal(card.thumbLoadAttempts, 0);
  assert.equal(p.card({ embed: { media: { external: { url: "nested", thumb: " raw " } } } }).thumb, " raw ");
  assert.equal(p.card({ embed: { external: {}, media: { external: { url: "ignored" } } } }), null);
  for (const value of [null, {}, { embed: "bad" }]) { assert.equal(p.card(value), null); }
  assert.equal(p.card({ embed: { external: { title: "Title only" } } }).title, "Title only");
});

test("archive post construction preserves schema, references, counts, edit info and permalink fallback", () => {
  const p = archiveModelsFixture().models.posts;
  const record = { text: "<b>Literal</b>", langs: ["de"], facets: [], createdAt: "created", originalText: "Before", updatedAt: "updated" };
  const counts = { likeCount: 3 };
  const result = p.build({ uri: uri("post"), cid: "cid", record, authorHandle: "own.test", authorDid: "did:example:own", counts });
  assert.equal(result.rawRecord, record); assert.equal(result.langs, record.langs); assert.equal(result.facets, record.facets); assert.equal(result.counts, counts);
  assert.equal(result.permalink, "https://bsky.app/profile/own.test/post/post"); assert.equal(result.rkey, "post");
  assert.deepEqual(plain(result.thread), { rootUri: uri("post"), parentUri: "" }); assert.equal(result.editInfo.originalText, "Before");
  assert.equal(result.authorAvatarPath, ""); assert.equal(result.images.length, 0);
  const empty = p.build({ uri: "invalid", record: null });
  assert.equal(empty.permalink, ""); assert.deepEqual(plain(empty.rawRecord), {}); assert.equal(empty.counts.likeCount, 0);
  assert.equal(p.build({ uri: uri("post") }).permalink, "https://bsky.app/profile/unknown/post/post");
  assert.throws(() => p.build(), /Cannot destructure/);
});

test("archive post merge enriches the same object without clearing arrays, images or truthy values", () => {
  const p = archiveModelsFixture().models.posts;
  const existing = { text: "old", langs: ["de"], facets: [{ id: 1 }], images: [{ id: "old" }], thread: { rootUri: "root" } };
  const incoming = { text: "", langs: [], facets: [], images: [{ id: "new" }], authorHandle: "new.test", thread: { parentUri: "parent" }, counts: { likeCount: 2 } };
  assert.equal(p.merge(existing, incoming), existing); assert.equal(existing.text, "old"); assert.deepEqual(existing.langs, ["de"]);
  assert.deepEqual(existing.images, [{ id: "old" }]); assert.equal(existing.authorHandle, "new.test"); assert.equal(existing.counts, incoming.counts);
  assert.deepEqual(plain(existing.thread), { rootUri: "root", parentUri: "parent" });
  const fresh = { images: [] }, fields = { langs: ["en"], facets: [{ id: 2 }], images: [{ id: 3 }] };
  p.merge(fresh, fields); assert.equal(fresh.images, fields.images); assert.equal(fresh.langs, fields.langs); assert.equal(fresh.facets, fields.facets);
  assert.throws(() => p.merge(null, {}), /Cannot/);
});

test("archive thread collection preserves DFS, duplicates, wrapper priority and explicit empty replies", () => {
  const t = archiveModelsFixture().models.threads;
  const child = { uri: uri("child"), record: {}, author: { did: "peer" } };
  const root = { post: { uri: uri(), replies: [{ post: child }] }, replies: [{ post: child }, { post: child }] };
  const seed = [{ uri: "seed" }]; assert.equal(t.all(root, seed), seed);
  assert.deepEqual(seed.map(p => p.uri), ["seed", uri(), uri("child"), uri("child")]);
  assert.equal(t.all({ post: root.post, replies: [] }).length, 1); assert.equal(t.all({ post: root.post }).length, 2);
  assert.equal(t.all(null).length, 0); assert.equal(t.all("invalid").length, 0); assert.equal(t.all({ uri: "missing-record" }).length, 0);
  assert.equal(t.all(child)[0], child);
});

test("archive thread path returns first matching path and leaves missing outputs untouched", () => {
  const t = archiveModelsFixture().models.threads;
  const child = { uri: uri("child"), record: {} }, root = { post: { uri: uri() }, replies: [{ post: child }] };
  const output = []; assert.equal(t.path(root, child.uri, output), true); assert.deepEqual(output.map(p => p.uri), [uri(), child.uri]);
  assert.equal(t.path(root, "missing", output), false); assert.equal(output.length, 2);
  assert.equal(t.path(null, "missing", output), false); assert.equal(t.path(root, uri(), []), true);
});

test("archive author collection retains unrestricted mode, missing-author handling and output identity", () => {
  const t = archiveModelsFixture().models.threads;
  const root = { post: { uri: uri(), author: { did: "own" } }, replies: [{ uri: uri("child"), record: {}, author: { did: "peer" } }, { post: { uri: uri("unknown") } }] };
  const output = []; assert.equal(t.author(root, "peer", output), output); assert.equal(output[0].uri, uri("child"));
  assert.equal(t.author(root, "").length, 3); assert.equal(t.author(root, "missing").length, 0);
  assert.equal(t.author(null, "own").length, 0);
});
