"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates deterministic DM models. @returns {Promise<object>} Models and adapters. */
async function fixture() {
  const { createDmExportModels } = await importProjectModule("js/tools/dm-export-models.js");
  const options = { t: (key) => key, date: () => "2026-10-18", extractCard: (embed) => embed.card || null,
    links: (text, facets) => facets, account: () => "fallback.test", selection: () => ["partner"], now: () => new Date("2026-10-18"),
    locales: ["en", "de"], translations: { en: { dmHtmlNoText: "empty" }, de: { dmHtmlNoText: "leer", dmHeaderTitle: "DM" } }, defaultLocale: "de" };
  return { createDmExportModels, options, models: createDmExportModels(options) };
}

test("DM models expose a small contract and require complete adapters and locale data", async () => {
  const { createDmExportModels, options, models } = await fixture();
  assert.deepEqual(Object.keys(models), ["partner", "title", "baseName", "messages", "range", "card", "i18n"]);
  assert.throws(() => createDmExportModels(null), TypeError);
  assert.throws(() => createDmExportModels({ ...options, links: null }), TypeError);
  assert.throws(() => createDmExportModels({ ...options, locales: null }), TypeError);
  assert.equal(models.i18n().en.dmHtmlNoText, "empty");
  assert.equal(models.i18n().en.dmHeaderTitle, "DM");
  assert.equal(models.i18n().en.closeButton, "closeButton");
});

test("DM partner models merge contact and member metadata with title and filename fallbacks", async () => {
  const { models } = await fixture();
  const catalog = { manifest: { account: { did: "self", handle: "own ? test" } }, recentContacts: [{ did: "partner", avatarPath: "cached.png", handle: "old.test" }],
    conversations: [{ members: [{ did: "self" }, { did: "partner", handle: "partner.test", displayName: "Partner" }] }] };
  assert.equal(models.partner(catalog).avatarPath, "cached.png");
  assert.equal(models.partner(catalog).handle, "partner.test");
  assert.equal(models.title({}, catalog), "Partner");
  assert.equal(models.title({ title: "Explicit" }, catalog), "Explicit");
  assert.match(models.baseName(catalog), /^threadline-dm-own-test-partner.test-2026-10-18$/);
  assert.equal(models.partner(null), null);
  assert.equal(models.title(null, null), "dmConversationFallbackTitle");
  assert.equal(models.title({ memberHandles: ["a", "b"] }, null), "a, b");
  assert.equal(models.title({}, { conversations: [{ members: [{ did: "other", handle: "other.test" }] }] }), "@other.test");
  assert.match(models.baseName(null), /fallback.test-dm/);
});

test("DM messages retain chronology, sender priority and source records", async () => {
  const { models } = await fixture();
  const catalog = { manifest: { account: { did: "self", handle: "own.test", avatarPath: "own.png" } },
    conversations: [{ id: "c", members: [{ did: "partner", handle: "member.test", displayName: "Member", avatarPath: "member.png" }] }],
    messages: [{ id: "z", senderDid: "self", sentAt: "2026-10-18", convoId: "c" },
      { id: "b", senderDid: "partner", senderHandle: "stale.test", sentAt: "2026-10-17" }, { id: "a", sentAt: "bad" }] };
  const before = structuredClone(catalog);
  const messages = models.messages(catalog);
  assert.deepEqual(messages.map((message) => message.id), ["a", "b", "z"]);
  assert.equal(messages[1].senderHandle, "member.test");
  assert.equal(messages[1].senderAvatarPath, "member.png");
  assert.equal(messages[2].senderAvatarPath, "own.png");
  assert.equal(messages[2].conversation, catalog.conversations[0]);
  assert.deepEqual(catalog, before);
  assert.deepEqual(models.messages(null), []);
  assert.deepEqual(models.messages({ messages: "invalid" }), []);
  assert.deepEqual(models.range(catalog), { from: "2026-10-17", to: "2026-10-18" });
  assert.deepEqual(models.range({ manifest: { filters: { from: "start", to: "end" } } }), { from: "start", to: "end" });
  assert.deepEqual(models.range(null), { from: "", to: "" });
});

test("DM cards prefer explicit previews then embeds then rich-text links", async () => {
  const { models } = await fixture();
  const card = { url: "https://example.test", title: "Title" };
  assert.equal(models.card({ externalCard: card, embeds: [{ card: { url: "other" } }] }), card);
  assert.equal(models.card({ embeds: [{}, { card }] }), card);
  assert.equal(models.card({ text: "url", facets: [{ url: card.url }] }).url, card.url);
  assert.equal(models.card({ embeds: "invalid", facets: "invalid" }), null);
  assert.equal(models.card(), null);
});

/** Creates a PDF renderer with a deterministic Canvas adapter. @returns {Promise<object>} Renderer and calls. */
async function pdfFixture() {
  const { createDmPdfRenderer } = await importProjectModule("js/tools/dm-pdf-rendering.js");
  const calls = { closed: 0, circles: 0, fills: [], text: [], widths: [] };
  const context = { fillRect() {}, fillText(text) { calls.text.push(text); }, measureText() { return { width: 10 }; } };
  const options = { partner: () => ({ handle: "partner.test", avatarPath: "partner" }), title: () => "Conversation",
    wrap: (ctx, text, width) => { calls.widths.push(width); return Array.from({ length: Math.max(1, Number(text) || 1) }, () => []); },
    bitmap: async () => ({ close() { calls.closed += 1; } }), circle: () => { calls.circles += 1; },
    timestamp: (value) => value || "", fill: (...args) => calls.fills.push(args), stroke() {},
    text: () => ({ annotations: [{ url: "https://example.test", x: 1 }] }), rectangle: () => [1, 2, 3, 4], t: (key) => key,
    canvas: () => ({ getContext: () => context, toBlob: (callback) => callback(new Blob([new Uint8Array([1, 2, 3])])) }) };
  return { createDmPdfRenderer, options, renderer: createDmPdfRenderer(options), calls, context };
}

test("DM PDF height and pagination retain avatar insets, own alignment and empty/oversized pages", async () => {
  const { renderer, context, calls, createDmPdfRenderer, options } = await pdfFixture();
  assert.throws(() => createDmPdfRenderer(null), TypeError);
  assert.throws(() => createDmPdfRenderer({ ...options, canvas: null }), TypeError);
  assert.deepEqual(renderer.paginate([], null), [[]]);
  assert.throws(() => renderer.paginate(null, null), TypeError);
  assert.equal(renderer.height(context, { text: "1" }, 700, 2), 180);
  renderer.height(context, { text: "1", senderAvatarPath: "own" }, 700, 2);
  assert.equal(calls.widths.at(-2) - calls.widths.at(-1), 76);
  const pages = renderer.paginate([{ senderDid: "self", text: "1" }, { senderDid: "other", text: "50" }, { text: "1" }], { manifest: { account: { did: "self" } } });
  assert.equal(pages.length, 3);
  assert.ok(pages[0][0].x > pages[1][0].x);
  assert.equal(pages[1][0].y, 224);
});

test("DM PDF pages return JPEG bytes and PDF link coordinates and close every decoded avatar", async () => {
  const { renderer, calls } = await pdfFixture();
  const catalog = { manifest: { account: { did: "self", handle: "own.test" } } };
  const messages = [{ senderDid: "self", senderAvatarPath: "own", senderHandle: "own.test", text: "1" }, { senderDid: "other", text: "1" }];
  const entries = renderer.paginate(messages, catalog)[0];
  const output = await renderer.page(catalog, new Map([["partner", {}], ["own", {}]]), entries, 0, 1);
  assert.deepEqual([...output.bytes], [1, 2, 3]);
  assert.deepEqual([output.width, output.height], [1190, 1684]);
  assert.equal(output.annotations.length, 2);
  assert.deepEqual(output.annotations[0].rect, [1, 2, 3, 4]);
  assert.equal(calls.closed, 2);
  assert.equal(calls.circles, 2);
  assert.equal(calls.fills[0][6], "#dce9ff");
  assert.equal(calls.fills[1][6], "#ffffff");
  assert.ok(calls.text.includes("1/1"));
  assert.equal((await renderer.page(null, new Map(), [], 0, 1)).annotations.length, 0);
});

test("DM HTML builder validates its contract and retries failed template loading", async () => {
  const { createDmHtmlRenderer } = await importProjectModule("js/tools/dm-html-rendering.js");
  assert.throws(() => createDmHtmlRenderer(null), TypeError);
  const { models } = await fixture();
  let requests = 0;
  const noop = () => "";
  const options = { models, t: noop, locale: noop, account: noop, now: noop, assetUri: noop, timestamp: noop,
    shorten: noop, links: noop, parse: noop, error: (status) => `template ${status}`,
    fetch: async () => { requests += 1; return { ok: false, status: 503 }; } };
  assert.throws(() => createDmHtmlRenderer({ ...options, models: {} }), TypeError);
  const renderer = createDmHtmlRenderer(options);
  await assert.rejects(renderer.build(null), /template 503/);
  await assert.rejects(renderer.build(null), /template 503/);
  assert.equal(requests, 8);
});
