"use strict";
const { test, expect } = require("@playwright/test");
test.use({ serviceWorkers: "block" });

/** Installs a controllable archive worker without network/account access. @param {object} page - Browser page. @returns {Promise<void>} Fixture installed. */
async function prepareRun(page) {
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).hostname === "127.0.0.1") { await route.continue(); }
    else { await route.abort(); }
  });
  await page.addInitScript(() => {
    localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
    const account = { did: "did:example:run", handle: "run.test", identifier: "run.test", service: "https://bsky.social" };
    const state = { calls: [], waves: [], controls: [], checks: [], saved: null, pending: null, slowSource: null };
    window.__archiveRun = state;
    const preview = { text: "Live <b>literal text</b>", meta: "Checkpoint one", metric: "2 posts" };
    window.__finishArchiveRun = (status) => {
      const pending = state.pending;
      state.pending = null;
      pending.postMessage({ ok: true, result: { manifest: { account }, posts: [{ uri: "post", text: preview.text, createdAt: "2026-10-18" }], assets: [],
        session: { status, nextCursor: "next-cursor", exportedPosts: 1, errorMessage: "Controlled pause" } } });
    };
    const registration = { update: async () => {}, active: { postMessage(message, ports) {
      state.calls.push(message.type);
      let result = null;
      if (message.type === "GET_APP_STATE" || message.type === "VERIFY_SESSION") {
        result = { ...account, accounts: [account], authenticated: true, locale: "en", localePreference: "en", desktopLayoutVersion: 2 };
      } else if (message.type === "CHECK_ANALYSIS_ACCOUNT") {
        state.checks.push(message.payload.actor);
        if (message.payload.actor === "slow.test") { state.slowSource = ports[0]; return; }
        result = { did: "did:example:source", handle: message.payload.actor, displayName: "Source <b>literal name</b>" };
      } else if (message.type === "SEARCH_MENTION_ACTORS") {
        result = { actors: [{ did: "did:example:picked", handle: "picked.test", displayName: "Picked account" }] };
      } else if (message.type === "EXPORT_ACCOUNT_ARCHIVE_WAVE") {
        state.waves.push(message.payload);
        state.pending = ports[0];
        ports[0].postMessage({ progress: { percent: 30, state: "running", detail: "Reading posts", checkpoint: "Checkpoint one", preview } });
        return;
      } else if (message.type === "SET_ARCHIVE_RUN_CONTROL") {
        state.controls.push(message.payload.action);
        let runState = "running";
        if (message.payload.action === "pause") { runState = "paused"; }
        state.pending.postMessage({ progress: { percent: 35, state: runState, checkpoint: "Checkpoint one", preview } });
      } else if (message.type === "SAVE_ARCHIVE_SESSION") {
        state.saved = message.payload.session;
      } else if (message.type === "IMPORT_ARCHIVE_THREAD_FROM_URL") {
        result = { manifest: { account, threadImport: { entryMode: "reply", entryUri: "root" } }, posts: [{ uri: "root", text: "Imported thread", createdAt: "2026-10-18" }], assets: [] };
      }
      ports[0].postMessage({ ok: true, result });
    } } };
    Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
    Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
  });
}

for (const pathname of ["/", "/tools.html"]) {
  test(`archive source ignores stale replies and applies picker selections from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareRun(page); await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    if (pathname === "/") { await page.locator('[data-page-target="tools"]').click(); await expect(page).toHaveURL(/\/tools\.html$/); }
    await page.locator("#archive-button").click();
    const input = page.locator("#archive-source-input");
    await input.fill("slow.test"); await input.press("Tab");
    await expect.poll(() => page.evaluate(() => window.__archiveRun.slowSource !== null)).toBe(true);
    await input.fill("new.test"); await input.press("Tab");
    await expect(page.locator("#archive-source-preview .reply-target-handle")).toHaveText("@new.test");
    await page.evaluate(async () => {
      window.__archiveRun.slowSource.postMessage({ ok: true, result: { did: "old", handle: "slow.test" } });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await expect(page.locator("#archive-source-preview .reply-target-handle")).toHaveText("@new.test");
    await input.fill(""); await input.press("Tab");
    await expect(page.locator("#archive-source-preview")).toBeHidden();
    await input.fill("picked");
    await expect(page.locator("#mention-search-dialog")).toBeVisible();
    await page.locator("#mention-search-results .mention-search-result").first().click();
    await expect(input).toHaveValue("picked.test");
    await expect(page.locator("#archive-source-preview .reply-target-handle")).toHaveText("@picked.test");
    await expect(page.locator("#mention-search-dialog")).toBeHidden();
    expect(await page.evaluate(() => window.__archiveRun.checks.filter(value => value === "picked.test").length)).toBe(1);
    expect(errors).toEqual([]);
  });

  test(`archive workspace renders progress, pause/resume and thread import from ${pathname}`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepareRun(page);
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    if (pathname === "/") { await page.locator('[data-page-target="tools"]').click(); await expect(page).toHaveURL(/\/tools\.html$/); }
    await page.locator("#archive-button").click();
    await expect(page.locator("#archive-results .archive-result-card")).toHaveCount(0);
    await page.locator("#archive-source-input").fill("source.test");
    await page.locator("#archive-source-input").press("Tab");
    await expect(page.locator("#archive-source-preview strong")).toHaveText("Source <b>literal name</b>");
    await expect(page.locator("#archive-source-preview b")).toHaveCount(0);
    await page.locator("#archive-live-preview-toggle").check();
    await page.locator("#archive-next-wave-button").click();
    await expect(page.locator("#archive-pause-button")).toBeEnabled();
    await expect(page.locator("#archive-preview-card .archive-preview-text")).toHaveText("Live <b>literal text</b>");
    await expect(page.locator("#archive-preview-card b")).toHaveCount(0);
    await expect(page.locator("#archive-progress-heartbeat")).not.toBeEmpty();
    await page.locator("#archive-pause-button").click();
    await expect(page.locator("#archive-resume-button")).toBeEnabled();
    await expect(page.locator("#archive-run-status-line")).toContainText("paused");
    await page.locator("#archive-resume-button").click();
    await expect(page.locator("#archive-pause-button")).toBeEnabled();
    await page.locator("#analysis-button").click();
    await expect(page.locator("#archive-background-notice")).toBeVisible();
    await page.locator("#archive-button").click();
    await page.evaluate(() => window.__finishArchiveRun("paused"));
    await expect(page.locator("#archive-progress-step")).toHaveText("The archive run is paused and can be resumed.");
    await expect(page.locator("#archive-results .archive-result-card")).toHaveCount(1);
    await page.locator("#archive-resume-button").click();
    await expect.poll(() => page.evaluate(() => window.__archiveRun.waves.length)).toBe(2);
    expect(await page.evaluate(() => window.__archiveRun.waves[1].cursor)).toBe("next-cursor");
    expect(await page.evaluate(() => window.__archiveRun.waves[1].existingCatalog.posts.length)).toBe(1);
    await page.evaluate(() => window.__finishArchiveRun("completed"));
    await expect(page.locator("#archive-progress-step")).toHaveText("Archive loading finished.");
    await expect(page.locator("#archive-next-wave-button")).toBeEnabled();
    expect(await page.evaluate(() => window.__archiveRun.controls)).toEqual(["pause", "resume"]);
    for (const width of [390, 1100]) {
      await page.setViewportSize({ width, height: 950 });
      const card = await page.locator("#archive-results .archive-result-card").boundingBox();
      const host = await page.locator("#archive-results").boundingBox();
      expect(card.x).toBeGreaterThanOrEqual(host.x - 1);
      expect(card.x + card.width).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await page.locator("#archive-results button").count()).toBe(3);
    }
    await page.locator("#archive-results").screenshot({ path: testInfo.outputPath("archive-results.png") });
    await page.locator("#archive-thread-url-input").fill("https://example.test/profile/user/post/reply");
    await page.locator("#archive-load-thread-url-button").click();
    await expect(page.locator("#archive-results")).toContainText("reply");
    expect(await page.evaluate(() => window.__archiveRun.saved.filterKey)).toBe("thread-url:root");
    await page.locator("#archive-reset-button").click();
    await expect(page.locator("#archive-results .archive-result-card")).toHaveCount(0);
    await expect(page.locator("#archive-pause-button")).toBeDisabled();
    expect(errors).toEqual([]);
  });
}

test("archive templates handle empty, oversized and literal content with explicit rendering adapters", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepareRun(page);
  await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  const result = await page.evaluate(async () => {
    const { createArchiveWorkspaceRenderer } = await import("/js/tools/archive-workspace-rendering.js");
    const { createArchiveWorkspaceModels } = await import("/js/tools/archive-workspace-models.js");
    const host = document.createElement("section"); document.body.append(host);
    const elements = {};
    for (const name of ["sourceStatus", "sourcePreview", "progressTitle", "progressStep", "progressDetail", "progressFill", "previewPanel", "previewCard", "heartbeat", "background", "status", "startHint", "summaryPosts", "summaryImages", "summaryBands", "spec", "results"]) {
      const node = document.createElement("div"); elements[name] = node; host.append(node);
    }
    for (const name of ["nextWave", "mediaExport", "pause", "resume", "cancel"]) { elements[name] = document.createElement("button"); host.append(elements[name]); }
    elements.htmlButtons = [document.createElement("button"), null];
    for (const [name, id] of [["source", "source"], ["note", "note"], ["preview", "preview"], ["spec", "spec"], ["specItem", "spec-item"], ["result", "result"]]) {
      elements[`${name}Template`] = document.querySelector(`#archive-workspace-${id}-template`);
    }
    const payload = '<img src=x onerror="window.__injected=true">';
    const state = { catalog: null, session: null, account: "test", runState: "idle", workspace: "archive", source: "source.test", profile: { did: "source", displayName: payload },
      livePreview: true, preview: null, pdfOptions: {}, mediaRunning: false };
    let large = true; const clicks = [];
    const t = key => { if (key === "archiveSpecItems") { return [payload]; } return key; };
    const models = createArchiveWorkspaceModels({ t, locale: () => "en" });
    const dependencies = { state: () => state, models, t, avatar: image => { image.remove(); }, tooLarge: () => large,
      bindResult: (buttons, actions) => { for (const key of ["zip", "html", "pdf"]) { if (buttons[`${key}Button`]) { buttons[`${key}Button`].addEventListener("click", actions[`${key}Click`]); } } },
      zip: () => clicks.push("zip"), html: () => clicks.push("html"), pdf: () => clicks.push("pdf"), scope: () => {}, progress: () => {} };
    const renderer = createArchiveWorkspaceRenderer(elements, dependencies);
    renderer.render();
    const initial = elements.results.textContent;
    const literal = elements.sourcePreview.querySelector("strong").textContent === payload && elements.sourcePreview.querySelector("img") === null;
    state.catalog = { posts: [], summary: {}, manifest: { threadImport: { entryMode: "root" } } };
    renderer.results(); renderer.htmlButtons();
    const disabled = elements.results.querySelector('[data-action="html"]').disabled && elements.htmlButtons[0].disabled;
    elements.results.querySelector('[data-action="zip"]').click();
    elements.results.querySelector('[data-action="pdf"]').click();
    large = false; renderer.results(); elements.results.querySelector('[data-action="html"]').click();
    state.preview = { text: payload, metric: "metric" }; renderer.preview();
    const previewLiteral = elements.previewCard.querySelector(".archive-preview-text").textContent === payload && elements.previewCard.querySelector("img") === null;
    state.livePreview = false; renderer.preview();
    const hiddenPreview = elements.previewPanel.hidden && elements.previewCard.querySelector("#archive-preview-empty") !== null;
    renderer.progress({ percent: 180 }); const maximum = elements.progressFill.style.width;
    renderer.progress({ percent: -1 }); const minimum = elements.progressFill.style.width;
    state.workspace = "analysis"; state.runState = "paused"; renderer.background();
    const background = !elements.background.hidden && elements.background.textContent === "archiveBackgroundNoticePaused";
    let missingTemplate = false;
    try { createArchiveWorkspaceRenderer({ ...elements, resultTemplate: null }, dependencies); } catch (error) { missingTemplate = error instanceof TypeError; }
    host.remove();
    return { initial, literal, disabled, clicks, previewLiteral, hiddenPreview, maximum, minimum, background, missingTemplate, injected: window.__injected === true };
  });
  expect(result).toEqual({ initial: "archiveResultsEmpty", literal: true, disabled: true, clicks: ["zip", "pdf", "html"], previewLiteral: true,
    hiddenPreview: true, maximum: "100%", minimum: "0%", background: true, missingTemplate: true, injected: false });
  expect(errors).toEqual([]);
});

test("archive layout templates preserve controls and values across repeated arrangement", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepareRun(page); await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en"); await page.locator("#archive-button").click();
  const result = await page.evaluate(async () => {
    const { createArchiveWorkspaceLayout } = await import("/js/tools/archive-workspace-rendering.js");
    const { translations } = await import("/js/core/app-i18n.js");
    const ids = { workspace: "archive-workspace", source: "archive-source-input", band: "archive-band-size-select", nextWave: "archive-next-wave-button", mediaActor: "archive-media-actor-input",
      progressTitle: "archive-progress-title", threadUrl: "archive-thread-url-input", spec: "archive-spec-content", hashtags: "archive-hashtag-slot", waveSize: "archive-wave-size-select",
      exportHtml: "archive-actions-export-html-button", exportCompact: "archive-actions-export-html-compact-button", exportPdf: "archive-actions-export-pdf-button", importButton: "archive-import-button",
      reset: "archive-reset-button", progressCompact: "archive-progress-export-html-compact-button", startHint: "archive-start-hint", exportZip: "archive-export-zip-button" };
    const elements = Object.fromEntries(Object.entries(ids).map(([name, id]) => [name, document.getElementById(id)]));
    const requiredPresent = Object.entries(elements).every(([name, node]) => name === "progressCompact" || node !== null);
    const templates = {};
    for (const name of ["export", "tools", "content", "actions"]) { templates[`${name}Template`] = document.getElementById(`archive-layout-${name}-template`); }
    templates.noteTemplate = document.getElementById("archive-workspace-note-template");
    const button = elements.nextWave; const input = elements.source;
    const original = input.value; input.value = "retained.test";
    let calls = 0; button.addEventListener("fixture", () => { calls += 1; });
    const controller = createArchiveWorkspaceLayout(elements, templates, key => translations.en[key] || key);
    for (let index = 0; index < 5; index += 1) { controller.ensure(); }
    button.dispatchEvent(new Event("fixture"));
    const kept = document.getElementById("archive-next-wave-button") === button && document.getElementById("archive-source-input") === input && input.value === "retained.test";
    input.value = original;
    const counts = ["#archive-export-card", "#archive-tools-heading", ".archive-content-layout", ".archive-content-filters"].map(selector => elements.workspace.querySelectorAll(selector).length);
    const idsUnique = Object.values(ids).every(id => document.querySelectorAll(`[id="${id}"]`).length <= 1);
    createArchiveWorkspaceLayout({ workspace: null }, templates, key => key).ensure();
    let invalid = false;
    try { createArchiveWorkspaceLayout(elements, {}, key => key); } catch (error) { invalid = error instanceof TypeError; }
    return { kept, calls, counts, idsUnique, invalid, requiredPresent };
  });
  expect(result).toEqual({ kept: true, calls: 1, counts: [1, 1, 1, 1], idsUnique: true, invalid: true, requiredPresent: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator("#archive-export-card").screenshot({ path: testInfo.outputPath("archive-export-layout.png") });
  expect(errors).toEqual([]);
});
