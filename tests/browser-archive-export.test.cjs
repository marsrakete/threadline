"use strict";

const fs = require("node:fs/promises");
const { gzipSync } = require("node:zlib");
const { expect, test } = require("@playwright/test");

test.use({ serviceWorkers: "block" });

test("DM HTML templates preserve literal content, cards, regional search and cached sources", async ({ page, context }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepareArchiveApplication(page);
  await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  const result = await page.evaluate(async () => {
    const { createDmExportModels } = await import("/js/tools/dm-export-models.js");
    const { createDmHtmlRenderer } = await import("/js/tools/dm-html-rendering.js");
    const { createPdfTextLayout } = await import("/js/shared/shared-pdf-text.js");
    const { translations } = await import("/js/core/app-i18n.js");
    const text = createPdfTextLayout({ facetRuns: () => null });
    const payload = '</script><script>window.__dmInjected=true</script><b>literal</b> {{bodyMarkup}} [.*+?^${}()|\\]';
    const translate = (key, vars = {}) => {
      let value = translations.en[key] || key;
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
      return value;
    };
    const modelOptions = { t: translate, date: () => "2026-10-18", account: () => "own.test", selection: () => [],
      now: () => new Date("2026-10-18"), locales: ["en", "de"], translations, defaultLocale: "en", links: text.links, extractCard: () => null };
    const models = createDmExportModels(modelOptions);
    const requests = [];
    const adapters = { models, t: translate, locale: () => "de", account: () => "own.test", now: modelOptions.now,
      assetUri: () => "data:image/png;base64,", timestamp: (value) => value || "", shorten: (url) => url,
      links: text.links, fetch: (url) => { requests.push(url); return fetch(url); }, parse: (html) => new DOMParser().parseFromString(html, "text/html"), error: String };
    const renderer = createDmHtmlRenderer(adapters);
    const thumbnail = document.createElement("canvas");
    thumbnail.width = 16;
    thumbnail.height = 12;
    const catalog = { manifest: { account: { did: "own", handle: "own.test" }, filters: { participantDid: "partner" } },
      recentContacts: [{ did: "partner", handle: "partner.test", displayName: payload }],
      messages: [{ id: "a", senderDid: "own", text: payload + "\nhttps://example.test/link", sentAt: "2026-10-18" },
        { id: "b", senderDid: "partner", text: "", externalCard: { url: "https://example.test/card", title: "Preview", description: payload, thumb: thumbnail.toDataURL() } },
        { id: "c", senderDid: "unknown", text: "" }] };
    const html = await renderer.build(catalog);
    const empty = await renderer.build(null);
    const broken = createDmHtmlRenderer({ ...adapters, parse: () => new DOMParser().parseFromString("", "text/html") });
    let templateError = "";
    try { await broken.build(null); } catch (error) { templateError = error.message; }
    return { html, empty, requests: requests.slice(0, 4), requestCount: requests.length, templateError, payload };
  });
  expect(result.requests.sort()).toEqual(["./templates/dm-html-client.js", "./templates/dm-html-fragments.html", "./templates/dm-html-shell.html", "./templates/dm-html.css"]);
  expect(result.requestCount).toBe(8); // One cached load plus the independent missing-template case.
  expect(result.templateError).toContain("Missing DM HTML template");
  const exported = await context.newPage();
  exported.on("pageerror", error => errors.push(error.message));
  await exported.addInitScript(() => Object.defineProperty(navigator, "languages", { value: ["en-US"] }));
  const requests = [];
  await exported.route("**/*", route => {
    requests.push(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: result.html });
  });
  await exported.goto(new URL("/dm-standalone.html", page.url()).href);
  await expect(exported.locator("html")).toHaveAttribute("lang", "de");
  await expect(exported.locator("[data-dm-message]")).toHaveCount(3);
  await expect(exported.locator(".dm-html-text")).toContainText(result.payload);
  await expect(exported.locator(".dm-html-text b")).toHaveCount(0);
  await expect(exported.locator(".dm-html-text br")).toHaveCount(1);
  await expect(exported.locator(".dm-html-text a")).toHaveAttribute("href", "https://example.test/link");
  await expect(exported.locator(".dm-html-link-card")).toHaveCount(2);
  await expect(exported.locator(".dm-html-link-card.has-thumbnail img")).toHaveAttribute("src", /^data:image\/png/);
  expect(await exported.evaluate(() => window.__dmInjected)).toBeUndefined();
  // en-US must select English search status even though the exported document uses German.
  await expect(exported.locator("#dm-status")).toHaveText("3 of 3 messages visible");
  await exported.locator("#dm-search").fill("[.*+?^${}()|\\]");
  await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(2);
  await expect(exported.locator("mark").first()).toHaveText("[.*+?^${}()|\\]");
  await exported.locator("#dm-search").fill("no-such-DM");
  await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(0);
  await expect(exported.locator("#dm-status")).toHaveText("No matching messages found.");
  await exported.locator("#dm-reset").click();
  await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(3);
  await expect(exported.locator("mark")).toHaveCount(0);
  for (const width of [390, 1100]) {
    await exported.setViewportSize({ width, height: 900 });
    const bounds = await exported.locator(".dm-html-message").evaluateAll(nodes => nodes.map(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
    expect(bounds.every(rect => rect.left >= 0 && rect.right <= width)).toBe(true);
    expect(await exported.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const cardWidths = await exported.locator(".dm-html-link-card:not(.has-thumbnail)").evaluateAll(nodes => nodes.map(node => ({
      card: node.getBoundingClientRect().width, copy: node.querySelector(".dm-html-link-card-copy").getBoundingClientRect().width,
    })));
    expect(cardWidths.every(item => item.copy >= item.card - 30)).toBe(true);
    await exported.screenshot({ path: testInfo.outputPath(`dm-templates-${width}.png`), fullPage: true });
  }
  expect(requests).toEqual(["/dm-standalone.html"]);
  await exported.unroute("**/*");
  await exported.route("**/dm-empty.html", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: result.empty }));
  await exported.goto(new URL("/dm-empty.html", page.url()).href);
  await expect(exported.locator("[data-dm-message]")).toHaveCount(0);
  expect(errors).toEqual([]);
  await exported.close();
});

test("archive PDF modules render linked pages with media and localized labels", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepareArchiveApplication(page);
  await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  const results = await page.evaluate(async () => {
    const { createArchivePdfLayout } = await import("/js/tools/archive-pdf-layout.js");
    const { createArchivePdfRenderer } = await import("/js/tools/archive-pdf-rendering.js");
    const { createPdfTextLayout } = await import("/js/shared/shared-pdf-text.js");
    const shapes = await import("/js/shared/shared-canvas.js");
    const { buildArchiveThreadGroups, shortenArchiveUrlForDisplay } = await import("/js/tools/archive-html-models.js");
    const { translations } = await import("/js/core/app-i18n.js");
    const text = createPdfTextLayout({ facetRuns: () => null });
    const image = document.createElement("canvas"); image.width = 48; image.height = 24;
    image.getContext("2d").fillStyle = "#2468ab"; image.getContext("2d").fillRect(0, 0, 48, 24);
    const blob = await new Promise(resolve => image.toBlob(resolve));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const posts = [
      { uri: "root", createdAt: "2026-10-18", authorDisplayName: "Archive author", authorHandle: "archive.test", authorAvatarPath: "image",
        text: "Linked text https://example.com/article", permalink: "https://example.com/post", thread: { rootUri: "root" },
        externalCard: { url: "https://example.com/article", title: "Article", description: "Preview description", thumbPath: "image" },
        images: [{ path: "image", width: 48, height: 24, alt: "Blue image" }], editInfo: { isEdited: true } },
      { uri: "reply", createdAt: "2026-10-18", text: "Reply", threadDepth: 1, thread: { rootUri: "root", parentUri: "root" },
        externalCard: { url: "https://example.com/failed", title: "Missing thumbnail", thumbLoadFailed: true } },
    ];
    const catalog = { account: { handle: "archive.test" }, assets: [{ path: "image", bytes, type: "image/png" }], summary: { skippedImageCount: 1 } };
    const results = [];
    for (const locale of ["de", "en", "fr"]) {
      const labels = [];
      const t = (key, values = {}) => {
        let value = translations[locale][key] || key;
        for (const [name, replacement] of Object.entries(values)) value = value.split(`{${name}}`).join(String(replacement));
        return value;
      };
      const canvas = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const fillText = context.fillText.bind(context);
        context.fillText = (label, ...args) => { labels.push(label); return fillText(label, ...args); };
        return canvas;
      };
      const layout = createArchivePdfLayout({ externalCard: post => post.externalCard || null, shortenUrl: shortenArchiveUrlForDisplay,
        wrap: text.wrap, t, groups: buildArchiveThreadGroups, canvas, maxImages: 10 });
      let opened = 0; let closed = 0;
      const bitmap = async asset => {
        opened += 1;
        const value = await createImageBitmap(new Blob([asset.bytes], { type: asset.type }));
        const close = value.close.bind(value);
        value.close = () => { closed += 1; close(); };
        return value;
      };
      const renderer = createArchivePdfRenderer({ ...layout, fill: shapes.fillRoundedRect, stroke: shapes.strokeRoundedRect,
        circle: shapes.drawCircularImageCover, image: shapes.drawRoundedImageContain, bitmap, metrics: () => ["Likes 2"],
        wrap: text.wrap, text: text.draw, rectangle: text.rectangle, timestamp: () => "18.10.2026", t, canvas, account: () => "archive.test" });
      const options = { indentThreads: true, includeMetrics: true, imageSize: "small" };
      const pages = layout.paginate(posts, options);
      for (const [index, pagePosts] of pages.entries()) {
        const rendered = await renderer.page(catalog, pagePosts, index, pages.length, 0, 1, options);
        const imageBlob = new Blob([rendered.bytes], { type: "image/jpeg" });
        const imageUrl = URL.createObjectURL(imageBlob);
        const preview = document.createElement("img"); preview.src = imageUrl; preview.id = `pdf-${locale}-${index}`;
        preview.style.width = "595px";
        document.body.append(preview); await preview.decode();
        results.push({ locale, page: index, width: rendered.width, height: rendered.height,
          annotations: rendered.annotations, labels: [...labels], opened, closed, jpeg: [...rendered.bytes.slice(0, 2)] });
      }
      const invalid = new Map([["bad", { bytes: new Uint8Array([0]), type: "image/png" }]]);
      let invalidImageRejected = false;
      try {
        await renderer.post(canvas().getContext("2d"), invalid, { ...posts[0], authorAvatarPath: "bad" }, 0, 0, 500, options, 1, 1190, 1684);
      } catch { invalidImageRejected = true; }
      results.at(-1).invalidImageRejected = invalidImageRejected;
    }
    return results;
  });
  for (const result of results) {
    expect(result.width).toBe(1190); expect(result.height).toBe(1684);
    expect(result.jpeg).toEqual([255, 216]);
    expect(result.opened).toBe(result.closed);
    expect(result.labels).toContain("Article");
    expect(result.annotations.some(annotation => annotation.url === "https://example.com/article")).toBe(true);
    for (const annotation of result.annotations) {
      expect(annotation.rect.every(Number.isFinite)).toBe(true);
      expect(annotation.rect[0]).toBeGreaterThanOrEqual(0);
      expect(annotation.rect[1]).toBeGreaterThanOrEqual(0);
      expect(annotation.rect[2]).toBeLessThanOrEqual(595);
      expect(annotation.rect[3]).toBeLessThanOrEqual(842);
    }
    expect(result.invalidImageRejected).toBe(true);
    if (result.locale === "de") { expect(result.labels).toContain("Band 1/1"); expect(result.labels).toContain("Seite 1/1"); }
    if (result.locale === "en") { expect(result.labels).toContain("Volume 1/1"); expect(result.labels).toContain("Page 1/1"); }
    if (result.locale === "fr") { expect(result.labels).toContain("Volume 1/1"); expect(result.labels).toContain("Page 1/1"); }
  }
  await page.locator("#pdf-en-0").screenshot({ path: testInfo.outputPath("archive-pdf-page.png") });
  expect(errors).toEqual([]);
});

/**
 * Supplies a local archive through the worker protocol without contacting an account.
 * @param {import("@playwright/test").Page} page - Application page to initialize.
 * @param {boolean} mediaFixture - Installs resumable media-worker and file-picker fixtures.
 * @param {boolean} avatarFixture - Supplies cached account/DM avatars and a remote archive avatar.
 * @returns {Promise<void>} Resolves when request routing and the worker fixture are installed.
 */
async function prepareArchiveApplication(page, mediaFixture = false, avatarFixture = false) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }
    await route.abort();
  });
  await page.addInitScript(({ mediaFixture, avatarFixture }) => {
    localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
    const rootUri = "at://did:example:archive/app.bsky.feed.post/root";
    const account = { did: "did:example:archive", handle: "archive.test", identifier: "archive.test", service: "https://bsky.social" };
    if (avatarFixture) {
      account.avatar = new URL("/fixture-avatar.png", location.href).href;
    }
    const image = document.createElement("canvas");
    image.width = 48;
    image.height = 24;
    const imageContext = image.getContext("2d");
    imageContext.fillStyle = "#2468ab";
    imageContext.fillRect(0, 0, 24, 24);
    imageContext.fillStyle = "#efb846";
    imageContext.fillRect(24, 0, 24, 24);
    const imageBytes = Uint8Array.from(atob(image.toDataURL("image/png").split(",")[1]), (character) => character.charCodeAt(0));
    const partner = { did: "did:example:partner", handle: "partner.test", displayName: "DM Partner", avatarPath: "dm-avatars/partner.png" };
    const dmCatalog = {
      manifest: { account: { ...account, avatarPath: "dm-avatars/self.png" }, filters: { participantDid: partner.did },
        exportedAt: "2026-10-18T12:00:00Z", messageCount: 2, conversationCount: 1 },
      recentContacts: [partner], conversations: [{ id: "conversation", members: [{ ...account }, { did: partner.did, handle: partner.handle }] }],
      messages: [{ id: "own", convoId: "conversation", senderDid: account.did, text: "Own DM with cached avatar", sentAt: "2026-10-17T12:00:00Z" },
        { id: "reply", convoId: "conversation", senderDid: partner.did, text: "Partner DM with cached avatar", sentAt: "2026-10-17T12:01:00Z" }],
      assets: [{ path: "dm-avatars/self.png", type: "image/png", bytes: imageBytes }, { path: partner.avatarPath, type: "image/png", bytes: imageBytes }],
    };
    if (avatarFixture) {
      window.__avatarFixture = { bytes: imageBytes, requests: [] };
    }
    const catalog = {
      manifest: { account, exportedAt: "2026-10-16T12:00:00.000Z" },
      posts: [
        { uri: rootUri, text: "Archive root <b>literal text</b> #archive", createdAt: "2026-10-15T12:00:00.000Z",
          authorDid: account.did, authorHandle: account.handle, thread: { rootUri },
          images: [{ path: "images/pixel.png", mimeType: "image/png", width: 48, height: 24, alt: "Archive pixel", remoteUrl: "https://example.invalid/pixel.png" }] },
        { uri: "at://did:example:archive/app.bsky.feed.post/reply", text: "Archive reply", createdAt: "2026-10-15T12:01:00.000Z",
          authorDid: account.did, authorHandle: account.handle, thread: { rootUri, parentUri: rootUri } },
      ],
      assets: [{ path: "images/pixel.png", type: "image/png", bytes: imageBytes }],
    };
    const mediaState = { session: null, parts: [], pickerCalls: 0, scans: 0, downloads: 0 };
    if (mediaFixture) {
      window.__mediaFixture = mediaState;
      window.showSaveFilePicker = async (options) => {
        mediaState.pickerCalls += 1;
        if (mediaState.pickerCalls === 2) {
          const error = new Error("Controlled picker cancellation"); error.name = "AbortError"; throw error;
        }
        const part = { name: options.suggestedName, chunks: [], closed: false, aborted: false };
        mediaState.parts.push(part);
        return { createWritable: async () => ({
          write: async bytes => part.chunks.push(new Uint8Array(bytes)),
          close: async () => { part.closed = true; },
          abort: async () => { part.aborted = true; },
        }) };
      };
    }
    const registration = { update: async () => {}, active: { postMessage(message, ports) {
      let result = null;
      if (message.type === "GET_APP_STATE") {
        result = { ...account, accounts: [account], localePreference: "en", locale: "en", desktopLayoutVersion: 2 };
      } else if (message.type === "VERIFY_SESSION") {
        result = { ...account, accounts: [account], authenticated: true };
      } else if (message.type === "GET_ARCHIVE_CATALOG") {
        result = catalog;
      } else if (avatarFixture && message.type === "GET_ACCOUNT_AVATAR_CACHE") {
        result = { assets: [{ path: "account-avatar.png", did: account.did, url: account.avatar, type: "image/png", bytes: imageBytes }] };
      } else if (avatarFixture && message.type === "CHECK_DM_ACCESS") {
        result = { ok: true };
      } else if (avatarFixture && ["LIST_DM_PARTNERS", "HYDRATE_DM_PARTNER_AVATARS", "EXPORT_DM_ARCHIVE"].includes(message.type)) {
        result = dmCatalog;
      } else if (mediaFixture && message.type === "GET_MEDIA_EXPORT_SESSION") {
        result = structuredClone(mediaState.session);
      } else if (mediaFixture && message.type === "SAVE_MEDIA_EXPORT_SESSION") {
        mediaState.session = structuredClone(message.payload.session);
      } else if (mediaFixture && message.type === "CLEAR_MEDIA_EXPORT_SESSION") {
        mediaState.session = null;
      } else if (mediaFixture && message.type === "SCAN_ACCOUNT_MEDIA_EXPORT") {
        mediaState.scans += 1;
        result = { manifest: { account }, posts: catalog.posts,
          media: Array.from({ length: 251 }, (_, index) => ({ id: String(index), kind: "image", postUri: rootUri,
            pathStem: `images/${index}.png`, createdAt: "2026-10-16T12:00:00Z" })) };
      } else if (mediaFixture && message.type === "DOWNLOAD_ACCOUNT_MEDIA_ASSET") {
        mediaState.downloads += 1;
        const item = message.payload.item;
        if (item.id === "0") {
          ports[0].postMessage({ ok: false, error: "Controlled download failure" });
          return;
        }
        result = { ...item, path: item.pathStem, bytes: imageBytes, type: "image/png", sizeBytes: imageBytes.length };
      }
      ports[0].postMessage({ ok: true, result });
    } } };
    Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
    Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
  }, { mediaFixture, avatarFixture });
}

test("loaded archive PDF action starts an export and downloads a volume", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareArchiveApplication(page, false, true);
  await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#archive-button")).toBeEnabled();
  await page.locator("#archive-button").click();
  await expect(page.locator("#archive-results")).toContainText("2");
  const avatarRequests = [];
  page.on("request", request => {
    if (request.resourceType() === "fetch" && request.url().includes("fixture-avatar.png")) {
      avatarRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    window.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 200);
  });
  const pending = page.waitForEvent("download", { timeout: 15000 });
  await page.locator("#archive-actions-export-pdf-button").click();
  await expect(page.locator("#archive-actions-export-pdf-button")).toBeDisabled();
  await expect(page.locator("#archive-actions-export-pdf-button")).toHaveText("Working …");
  const progress = page.locator(".archive-export-progress");
  await expect(progress).toBeVisible();
  await expect(progress).toHaveClass(/is-running/);
  await expect(progress.locator("progress")).toHaveAttribute("value", "3");
  await progress.screenshot({ path: testInfo.outputPath("pdf-progress-mobile.png"), animations: "disabled" });
  const download = await pending;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/-band-001\.pdf$/);
  await download.saveAs(testInfo.outputPath("archive-band.pdf"));
  await expect(page.locator("#archive-actions-export-pdf-button")).toBeEnabled();
  await expect(progress.locator("progress")).toHaveAttribute("value", "100");
  await expect(progress).not.toHaveClass(/is-running/);
  const bounds = await progress.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(avatarRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("HTML archive templates preserve hostile text, edits, card states and empty output", async ({ page, context }, testInfo) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await prepareArchiveApplication(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  const output = await page.evaluate(async () => {
    const modelModule = await import("/js/tools/archive-html-models.js");
    const { createArchiveHtmlRenderer } = await import("/js/tools/archive-html-rendering.js");
    const { createArchiveHtmlTemplateLoader } = await import("/js/tools/archive-html-export.js");
    const { translations } = await import("/js/core/app-i18n.js");
    const t = (key, values = {}) => {
      let copy = translations.en[key] || key;
      for (const [name, value] of Object.entries(values)) {
        copy = copy.split(`{${name}}`).join(String(value));
      }
      return copy;
    };
    const runs = (text, facets = []) => {
      if (facets.length > 0) { return facets; }
      return [{ text: String(text || "") }];
    };
    const models = modelModule.createArchiveHtmlModels({ t, locale: () => "en", account: () => "fixture.test",
      now: () => new Date("2026-10-18T12:00:00Z"), locales: ["en"], translations, defaultLocale: "en",
      extractHashtags: () => [{ value: "#topic", normalized: "topic" }], linkRuns: runs,
      normalizeStandardSite: () => null, publicationFooter: () => "unused" });
    const loadTemplates = createArchiveHtmlTemplateLoader({ fetch: (path) => fetch(path), error: (status) => String(status) });
    const escape = (value) => {
      const node = document.createElement("span"); node.textContent = String(value || ""); return node.innerHTML;
    };
    const adapters = { models, loadTemplates, parse: (html) => new DOMParser().parseFromString(html, "text/html"),
      t, timestamp: (value) => String(value || ""), linkRuns: runs, depths: modelModule.buildArchiveThreadDepthMap,
      escape, escapeAttribute: (value) => escape(value).replace(/"/g, "&quot;") };
    const renderer = createArchiveHtmlRenderer(adapters);
    const payload = '</script><script>window.__archiveInjected=true</script> <b>literal</b> {{groupsMarkup}} {{clientScript}}';
    const canvas = document.createElement("canvas"); canvas.width = 4; canvas.height = 4;
    const image = canvas.toDataURL("image/png");
    const catalog = { manifest: { account: { handle: "fixture.test" }, exportedAt: "2026-10-18T12:00:00Z" },
      summary: { imageCount: 1, skippedImageCount: 2, from: "2026-10-01", to: "2026-10-04" },
      posts: [
        { uri: "root", thread: { rootUri: "root" }, createdAt: "2026-10-01", text: payload,
          authorHandle: "fixture.test", authorDisplayName: payload, authorAvatarPath: "avatar", permalink: "https://example.test/post",
          facets: [{ text: payload, url: "https://example.test/link", kind: "link" }], counts: { likeCount: 3 },
          images: [{ path: "image", alt: payload, remoteUrl: "https://example.test/image.png" }],
          editInfo: { isEdited: true, originalText: payload, text: payload, updatedAt: "2026-10-02" } },
        { uri: "reply", thread: { rootUri: "root", parentUri: "root" }, createdAt: "2026-10-02", text: "",
          externalCard: { url: "https://example.test/card", title: payload, thumbLoadFailed: true } },
        { uri: "single", createdAt: "2026-10-03", text: "single",
          facets: [{ text: "single", url: "https://example.test/single", kind: "link" }],
          externalCard: { url: "https://example.test/second", title: "Card", description: payload, thumbPath: "image" } },
        { uri: "empty", createdAt: "2026-10-04", text: "" },
      ] };
    const assets = new Map([["image", image], ["avatar", image]]);
    const full = await renderer.build(catalog, assets);
    const compact = await renderer.build(catalog, assets, { embedPostImages: false });
    const empty = await renderer.build({ manifest: catalog.manifest, posts: [], summary: {} }, new Map());
    const hostileMetadata = await renderer.build({ ...catalog, manifest: { ...catalog.manifest, account: { handle: payload } } }, assets);
    const parsedMetadata = new DOMParser().parseFromString(hostileMetadata, "text/html");
    const bootstrapSource = parsedMetadata.scripts[0].textContent;
    const bootstrap = JSON.parse(bootstrapSource.slice(bootstrapSource.indexOf("=") + 1).trim().replace(/;$/, ""));
    let missing = "";
    const broken = createArchiveHtmlRenderer({ ...adapters, parse: (html) => {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      parsed.getElementById("archive-html-post-template").remove(); return parsed;
    } });
    try { await broken.build(catalog, assets); } catch (error) { missing = error.message; }
    let invalid = false;
    try { createArchiveHtmlRenderer({}); } catch (error) { invalid = error instanceof TypeError; }
    return { full, compact, empty, payload, missing, invalid,
      metadata: { scriptCount: parsedMetadata.scripts.length, handle: bootstrap.runtimeData.handle } };
  });
  expect(output.missing).toBe("Missing archive HTML template: post");
  expect(output.invalid).toBe(true);
  expect(output.metadata).toEqual({ scriptCount: 2, handle: output.payload });
  for (const mode of ["full", "compact", "empty"]) {
    const exported = await context.newPage();
    exported.on("pageerror", (error) => errors.push(error.message));
    await exported.setViewportSize({ width: 390, height: 900 });
    await exported.route("**/*", async (route) => {
      if (new URL(route.request().url()).pathname === "/template-fixture.html") {
        await route.fulfill({ contentType: "text/html; charset=utf-8", body: output[mode] });
        return;
      }
      await route.abort();
    });
    await exported.goto(new URL("/template-fixture.html", page.url()).href);
    expect(await exported.evaluate(() => window.__archiveInjected)).toBeUndefined();
    if (mode === "empty") {
      await expect(exported.locator("[data-archive-post]")).toHaveCount(0);
      await expect(exported.locator(".archive-html-hashtag")).toHaveCount(0);
      await expect(exported.locator(".archive-html-links-list")).toHaveCount(0);
    } else {
      await expect(exported.locator("[data-archive-post]")).toHaveCount(4);
      await expect(exported.locator(".archive-html-text").first()).toHaveText(output.payload);
      await expect(exported.locator(".archive-html-text b, .archive-html-text script")).toHaveCount(0);
      await expect(exported.locator(".archive-html-link-card-thumb-fallback")).toHaveCount(1);
      await expect(exported.locator(".archive-html-link-card img")).toHaveCount(1);
      await expect(exported.locator(".archive-html-link-passive")).toHaveCount(1);
      await expect(exported.locator(".archive-html-links-row")).toHaveCount(2);
      await expect(exported.locator('[data-depth="1"]')).toHaveCount(1);
      await exported.locator("#archive-toggle-threads").click();
      await exported.locator("#archive-toggle-singles").click();
      await expect(exported.locator("[data-archive-post]:visible")).toHaveCount(4);
      await exported.locator("[data-archive-edit-button]").click();
      await expect(exported.locator("#archive-edit-original")).toHaveText(output.payload);
      await exported.locator("#archive-edit-close").click();
      if (mode === "compact") {
        await expect(exported.locator("[data-archive-image-remote]")).toHaveCount(1);
      } else {
        await expect(exported.locator(".archive-html-gallery img")).toHaveCount(1);
        const bounds = await exported.locator(".archive-html-post").evaluateAll((nodes) => nodes.map((node) => {
          const box = node.getBoundingClientRect(); return { left: box.left, right: box.right };
        }));
        await exported.screenshot({ path: testInfo.outputPath("archive-html-mobile.png"), fullPage: true });
        expect(bounds.every((box) => box.left >= 0 && box.right <= 390), JSON.stringify(bounds)).toBe(true);
        await exported.setViewportSize({ width: 1100, height: 900 });
        const desktop = await exported.locator(".archive-html-post").evaluateAll((nodes) => nodes.map((node) => {
          const box = node.getBoundingClientRect(); return { left: box.left, right: box.right };
        }));
        expect(desktop.every((box) => box.left >= 0 && box.right <= 1100), JSON.stringify(desktop)).toBe(true);
      }
    }
    await exported.close();
  }
  expect(errors).toEqual([]);
});

for (const pathname of ["/", "/tools.html"]) {
  test(`cached account, archive and DM avatars survive exports from ${pathname}`, async ({ page, context }, testInfo) => {
    test.setTimeout(60000);
    const errors = [];
    const avatarRequests = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepareArchiveApplication(page, false, true);
    await page.route("**/fixture-avatar.png", async route => {
      avatarRequests.push(route.request().method());
      const bytes = await page.evaluate(() => [...window.__avatarFixture.bytes]);
      await route.fulfill({ contentType: "image/png", body: Buffer.from(bytes) });
    });
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    if (pathname === "/") {
      await page.locator('[data-page-target="tools"]').click();
      await expect(page).toHaveURL(/\/tools\.html$/);
    }
    await expect(page.locator(".account-chip img").first()).toHaveAttribute("src", /^data:image\/png;base64,/);
    await page.locator("#archive-button").click();
    avatarRequests.length = 0;
    const archiveDownload = page.waitForEvent("download");
    await page.locator("#archive-actions-export-html-button").click();
    const archiveHtml = await fs.readFile(await (await archiveDownload).path(), "utf8");
    const avatarCount = await page.evaluate(html => new DOMParser().parseFromString(html, "text/html").querySelectorAll("img.archive-html-avatar[src^='data:image/png']").length, archiveHtml);
    expect(avatarCount).toBe(2);
    expect(avatarRequests).toEqual(["GET"]);
    await page.locator("#dm-button").click();
    await page.locator("#dm-load-partners-button").click();
    await expect(page.locator("#dm-contact-list .dm-contact-chip")).toHaveCount(1);
    await page.locator("#dm-contact-list .dm-contact-chip").click();
    await page.locator("#dm-load-button").click();
    await expect(page.locator("#dm-export-html-button")).toBeEnabled();
    const dmDownload = page.waitForEvent("download");
    await page.locator("#dm-export-html-button").click();
    const dmHtmlDownload = await dmDownload;
    const dmHtml = await fs.readFile(await dmHtmlDownload.path(), "utf8");
    await dmHtmlDownload.saveAs(testInfo.outputPath("dm-avatars.html"));
    const exported = await context.newPage();
    exported.on("pageerror", error => errors.push(error.message));
    await exported.route("**/dm-avatar-export.html", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: dmHtml }));
    await exported.goto(new URL("/dm-avatar-export.html", page.url()).href);
    await expect(exported.locator(".dm-html-message-avatar")).toHaveCount(2);
    expect(await exported.locator(".dm-html-message-avatar").evaluateAll(images => images.every(image => image.src.startsWith("data:image/png")))).toBe(true);
    await expect.poll(() => exported.locator(".dm-html-message-avatar").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await exported.locator("#dm-search").fill("Partner DM");
    await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(1);
    await expect(exported.locator("mark")).toHaveText("Partner DM");
    await exported.locator("#dm-search").fill("missing-DM");
    await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(0);
    await exported.locator("#dm-reset").click();
    await expect(exported.locator("[data-dm-message]:not([hidden])")).toHaveCount(2);
    await exported.screenshot({ path: testInfo.outputPath("dm-avatars.png"), fullPage: true });
    await exported.close();
    const pendingPdf = page.waitForEvent("download");
    await page.locator("#dm-export-pdf-button").click();
    const pdf = await pendingPdf;
    expect(await pdf.failure()).toBeNull();
    await pdf.saveAs(testInfo.outputPath("dm-avatars.pdf"));
    expect((await fs.readFile(await pdf.path())).subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(avatarRequests).toEqual(["GET"]);
    expect(errors).toEqual([]);
  });

  test(`media ZIP export resumes parts and catalog imports load from ${pathname}`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepareArchiveApplication(page, true);
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    if (pathname === "/") {
      await page.locator('[data-page-target="tools"]').click();
      await expect(page).toHaveURL(/\/tools\.html$/);
    }
    await page.locator("#archive-button").click();
    const catalog = JSON.stringify({ posts: [{ uri: "imported", text: "Imported JSON catalog", createdAt: "2026-10-18" }] });
    for (const name of ["archive.json", "archive.json.gz"]) {
      let buffer = Buffer.from(catalog);
      if (name.endsWith(".gz")) {
        buffer = gzipSync(buffer);
      }
      await page.locator("#archive-import-input").setInputFiles({ name, mimeType: "application/octet-stream", buffer });
      await expect(page.locator("#archive-progress-step")).toHaveText("Archive loaded.");
      await expect(page.locator("#archive-results")).toContainText("1");
    }
    const button = page.locator("#archive-export-media-zip-button");
    await expect(button).toBeEnabled();
    await button.click();
    await expect.poll(() => page.evaluate(() => window.__mediaFixture.session?.nextBatchIndex)).toBe(1);
    await expect(button).toBeEnabled();
    await expect(page.locator("#archive-progress-step")).toHaveText("Resuming with part 2/2");
    await expect(page.locator("#archive-media-actor-input")).toBeEnabled();
    await button.click();
    await expect(page.locator("#archive-progress-step")).toHaveText("Media export finished");
    await expect(button).toBeEnabled();
    const result = await page.evaluate(async () => {
      const { createStoredZipCodec } = await import("/js/shared/shared-zip.js");
      const zip = createStoredZipCodec({ encode: text => new TextEncoder().encode(text), now: () => new Date(), invalidArchive: () => "bad ZIP", closedWriter: () => "closed ZIP" });
      const state = window.__mediaFixture;
      return { scans: state.scans, downloads: state.downloads, session: state.session, parts: state.parts.map(part => {
        const length = part.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const bytes = new Uint8Array(length); let offset = 0;
        for (const chunk of part.chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const entries = zip.parse(bytes);
        const json = name => JSON.parse(new TextDecoder().decode(entries.get(name)));
        let skipped = [];
        if (entries.has("_meta/skipped-media.json")) {
          skipped = json("_meta/skipped-media.json");
        }
        return { name: part.name, closed: part.closed, aborted: part.aborted, manifest: json("_meta/manifest.json"),
          media: json("_meta/media.json"), skipped, paths: [...entries.keys()], bytes: [...bytes] };
      }) };
    });
    expect(result.scans).toBe(1); expect(result.downloads).toBe(251); expect(result.session).toBeNull();
    expect(result.parts).toHaveLength(2);
    expect(result.parts[0].name).toMatch(/part-001-of-002\.zip$/);
    expect(result.parts[1].name).toMatch(/part-002-of-002\.zip$/);
    expect(result.parts[0].manifest.mediaCount).toBe(249);
    expect(result.parts[0].skipped[0].reason).toBe("Controlled download failure");
    expect(result.parts[1].manifest.mediaCount).toBe(1);
    expect(result.parts[1].paths).toContain("images/250.png");
    for (const [index, part] of result.parts.entries()) {
      expect(part.closed).toBe(true); expect(part.aborted).toBe(false);
      expect(part.paths.filter(path => path.endsWith("/post.json"))).toHaveLength(1);
      await fs.writeFile(testInfo.outputPath(`media-part-${index + 1}.zip`), Buffer.from(part.bytes));
    }
    expect(errors).toEqual([]);
  });

  test(`HTML and ZIP archive exports preserve content from ${pathname}`, async ({ page, context }, testInfo) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await prepareArchiveApplication(page);
    const templateRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("/templates/archive-html-")) {
        templateRequests.push(new URL(request.url()).pathname);
      }
    });
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    if (pathname === "/") {
      await page.locator('[data-page-target="tools"]').click();
      await expect(page).toHaveURL(/\/tools\.html$/);
      await expect(page.locator("#language-select")).toHaveValue("en");
    }
    await expect(page.locator("#archive-button")).toBeEnabled();
    await page.locator("#archive-button").click();
    await expect(page.locator("#archive-results")).toContainText("2");

    for (const mode of ["full", "compact", "zip-roundtrip"]) {
      if (mode === "zip-roundtrip") {
        const pendingZip = page.waitForEvent("download");
        await page.locator("#archive-export-zip-button").click();
        const zip = await pendingZip;
        expect(zip.suggestedFilename()).toBe("threadline-archive-archive.test-2026-10-16.zip");
        expect(await zip.failure()).toBeNull();
        const zipBytes = await fs.readFile(await zip.path());
        expect(zipBytes.readUInt32LE(0)).toBe(0x04034b50);
        await page.locator("#archive-import-input").setInputFiles({
          name: zip.suggestedFilename(), mimeType: "application/zip", buffer: zipBytes,
        });
        await expect(page.locator("#archive-progress-step")).toHaveText("Archive loaded.");
        await expect(page.locator("#archive-results")).toContainText("2");
      }
      let button = page.locator("#archive-actions-export-html-button");
      let expectedName = "threadline-archive-archive.test-2026-10-16.html";
      if (mode === "compact") {
        button = page.locator("#archive-actions-export-html-compact-button");
        expectedName = "threadline-archive-archive.test-2026-10-16-compact.html";
      }
      const pendingDownload = page.waitForEvent("download");
      await button.click();
      const download = await pendingDownload;
      expect(download.suggestedFilename()).toBe(expectedName);
      expect(await download.failure()).toBeNull();
      const html = await fs.readFile(await download.path(), "utf8");
      await fs.writeFile(testInfo.outputPath(`archive-${mode}.html`), html, "utf8");
      expect(html).not.toMatch(/\{\{(?:groupsMarkup|bootstrapJson|clientScript)\}\}/);

      const exportedPage = await context.newPage();
      exportedPage.on("pageerror", (error) => errors.push(error.message));
      await exportedPage.route("**/*", async (route) => {
        if (new URL(route.request().url()).pathname === "/exported-archive.html") {
          await route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
          return;
        }
        await route.abort();
      });
      await exportedPage.goto(new URL("/exported-archive.html", page.url()).href);
      await expect(exportedPage.locator("[data-archive-post]")).toHaveCount(2);
      await expect(exportedPage.locator(".archive-html-thread")).toHaveCount(1);
      await expect(exportedPage.locator(".archive-html-text").first()).toContainText("<b>literal text</b>");
      await expect(exportedPage.locator(".archive-html-text b")).toHaveCount(0);
      if (mode !== "compact") {
        await expect(exportedPage.locator(".archive-html-gallery img")).toHaveAttribute("src", /^data:image\/png;base64,/);
      } else {
        await expect(exportedPage.locator("[data-archive-image-remote]")).toHaveAttribute("data-archive-image-remote", "https://example.invalid/pixel.png");
        await expect(exportedPage.locator(".archive-html-gallery img")).toHaveCount(0);
      }
      await exportedPage.locator("#archive-search").fill("no-matching-archive-post");
      await expect(exportedPage.locator("[data-archive-post]:visible")).toHaveCount(0);
      await exportedPage.locator("#archive-search").fill("");
      await expect(exportedPage.locator("[data-archive-post]:not([hidden])")).toHaveCount(2);
      await exportedPage.close();
    }
    expect(templateRequests.sort()).toEqual(["/templates/archive-html-client.js", "/templates/archive-html-fragments.html", "/templates/archive-html-shell.html"]);
    const pendingPdf = page.waitForEvent("download");
    await page.locator("#archive-actions-export-pdf-button").click();
    const pdfDownload = await pendingPdf;
    expect(pdfDownload.suggestedFilename()).toMatch(/^threadline-archive-archive\.test-2026-10-16.*\.pdf$/);
    expect(await pdfDownload.failure()).toBeNull();
    await pdfDownload.saveAs(testInfo.outputPath("archive-report.pdf"));
    const pdf = await fs.readFile(await pdfDownload.path());
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString("latin1")).toContain("%%EOF");
    expect(pdf.toString("latin1")).toContain("/Subtype /Image");
    expect(errors).toEqual([]);
  });
}
