"use strict";

const { expect, test } = require("@playwright/test");

test.describe("Composer image editor application integration", () => {
  test.use({ serviceWorkers: "block" });
  test("account templates and login/actions work on composer and tools without page errors", async ({ page }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message)); await blockExternalRequests(page);
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      window.accountRequests = [];
      let authenticated = false;
      let accounts = [{ did: "did:example:alice", handle: "alice.bsky.social", identifier: "alice.bsky.social",
        service: "https://bsky.social", hasSession: false, hasStoredPassword: false }];
      const registration = { update: async () => {}, active: { postMessage(message, ports) {
        window.accountRequests.push(message.type);
        let result = null;
        if (message.type === "GET_APP_STATE") { result = { localePreference: "en", locale: "en", accounts, desktopLayoutVersion: 2 }; }
        if (message.type === "LOGIN" || message.type === "SWITCH_ACCOUNT") {
          authenticated = true; accounts = accounts.map((account) => ({ ...account, hasSession: true, hasStoredPassword: true }));
        }
        if (message.type === "LOGOUT") { authenticated = false; accounts = accounts.map((account) => ({ ...account, hasSession: false })); }
        if (message.type === "REMOVE_ACCOUNT") { authenticated = false; accounts = []; }
        if (["LOGIN", "SWITCH_ACCOUNT", "LOGOUT", "REMOVE_ACCOUNT", "VERIFY_SESSION"].includes(message.type)) {
          result = { authenticated, accounts, service: "https://bsky.social", identifier: "alice.bsky.social" };
          if (authenticated) { result.did = "did:example:alice"; result.handle = "alice.bsky.social"; }
        }
        ports[0].postMessage({ ok: true, result });
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".account-chip-label")).toHaveText("alice.bsky.social");
      for (const compact of [false, true]) {
        const geometry = await page.evaluate((compact) => {
          document.body.classList.toggle("ui-density-compact", compact);
          const button = document.querySelector(".account-chip").getBoundingClientRect();
          const label = document.querySelector(".account-chip-label").getBoundingClientRect();
          const action = document.querySelector(".account-chip-action").getBoundingClientRect();
          return { buttonWidth: button.width, labelWidth: label.width, labelRight: label.right, buttonRight: button.right, actionLeft: action.left };
        }, compact);
        expect(geometry.buttonWidth).toBeGreaterThan(0); expect(geometry.labelWidth).toBeGreaterThan(0);
        expect(geometry.labelRight).toBeLessThanOrEqual(geometry.buttonRight + 1);
        expect(geometry.actionLeft).toBeGreaterThanOrEqual(geometry.buttonRight - 1);
      }
      await page.locator(".account-chip-action").click();
      await expect(page.locator("#login-dialog")).toBeVisible();
      await expect(page.locator("#identifier")).toHaveValue("alice.bsky.social");
      await page.locator("#password").fill("test-app-password"); await page.locator("#login-button").click();
      await expect(page.locator("#login-dialog")).not.toBeVisible();
      await expect(page.locator(".account-chip")).toHaveClass(/is-active/);
      await page.locator(".account-chip-action").click();
      await expect(page.locator(".account-chip-action")).toHaveClass(/is-login/);
      await page.locator(".account-chip").click();
      await expect(page.locator(".account-chip")).toHaveClass(/is-active/);
      await page.locator(".account-chip-remove").click();
      await page.locator("#confirm-dialog-confirm-button").click();
      await expect(page.locator(".account-chip")).toHaveCount(0);
      const requests = await page.evaluate(() => window.accountRequests);
      for (const type of ["LOGIN", "LOGOUT", "SWITCH_ACCOUNT", "VERIFY_SESSION", "REMOVE_ACCOUNT"]) { expect(requests).toContain(type); }
      const rendered = await page.evaluate(async () => {
        const { createSavedAccountRenderer, setAvatarImage } = await import("/js/shared/shared-accounts.js");
        const { bindAccountSwitcherItemEvents } = await import("/js/tools/account-picker.js");
        const calls = []; let accounts = [{ did: "test", handle: "<img src=x onerror=alert(1)>", hasSession: false }];
        const list = document.querySelector("#account-switcher-list"); const panel = document.querySelector("#account-switcher-panel");
        const renderer = createSavedAccountRenderer({ list, panel, template: document.querySelector("#account-switcher-item-template") }, {
          getState: () => ({ accounts, online: true, did: "" }), t: (key) => key, setAvatar: setAvatarImage, avatar: () => "",
          bind: bindAccountSwitcherItemEvents, actions: { select: () => calls.push("select"), toggle: () => calls.push("toggle"), remove: () => calls.push("remove") },
        });
        renderer.render();
        const label = list.querySelector(".account-chip-label").textContent; const images = list.querySelectorAll("img").length;
        list.querySelector(".account-chip").click(); list.querySelector(".account-chip-action").click(); list.querySelector(".account-chip-remove").click();
        const actionCount = calls.length; renderer.render(); list.querySelector(".account-chip").click();
        accounts = []; renderer.render();
        return { label, images, calls, actionCount, hidden: panel.hidden, children: list.children.length };
      });
      expect(rendered).toEqual({ label: "<img src=x onerror=alert(1)>", images: 1, calls: ["select", "toggle", "remove", "select"], actionCount: 3, hidden: true, children: 0 });
    }
    expect(errors).toEqual([]);
  });
  test("help loads localized README, caches it and renders every topic safely on both pages", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; const requests = [];
    page.on("pageerror", (error) => errors.push(error.message)); await blockExternalRequests(page);
    await page.route(/\/README(?:\.de)?\.md$/, (route) => {
      requests.push(route.request().url());
      return route.fulfill({ contentType: "text/plain", body: '# Test Guide\n\n**Safe** [Link](https://example.test)\n\n- First\n- Second\n\n<p class="help-centered"><img src=x onerror=window.helpUnsafe=1></p>' });
    });
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      const registration = { update: async () => {}, active: { postMessage(message, ports) {
        let result = null;
        if (message.type === "GET_APP_STATE") { result = { localePreference: "en", locale: "en", desktopLayoutVersion: 2 }; }
        ports[0].postMessage({ ok: true, result });
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#language-select")).toHaveValue("en");
      const before = requests.length;
      await page.locator("#help-button").click(); await expect(page.locator("#help-content h1")).toHaveText("Test Guide");
      expect(await page.evaluate(() => window.helpUnsafe)).toBeUndefined();
      await expect(page.locator("#help-content img")).toHaveCount(0);
      await page.locator('#help-dialog button[type="submit"]').click();
      await page.locator("#settings-button").click();
      await page.locator("#language-select").selectOption("de");
      await page.locator("#settings-close-top").click();
      await page.locator("#help-button").click();
      await expect(page.locator("#help-content h1")).toHaveText("Test Guide");
      expect(requests.at(-1)).toMatch(/README\.de\.md$/);
      await page.locator('#help-dialog button[type="submit"]').click();
      await page.locator("#help-button").click(); await expect(page.locator("#help-content h1")).toBeVisible();
      expect(requests.length - before).toBe(2); await page.locator('#help-dialog button[type="submit"]').click();
      const topics = await page.evaluate(async () => {
        const { createHelpController } = await import("/js/core/app-help.js");
        const { HELP_TOPICS } = await import("/js/core/app-help-topics.js");
        const { getTranslationsForLocale } = await import("/js/core/app-i18n.js");
        let locale = "en";
        const controller = createHelpController({ dialog: document.querySelector("#help-dialog"),
          eyebrow: document.querySelector("#help-dialog-eyebrow"), title: document.querySelector("#help-dialog-title"),
          status: document.querySelector("#help-status"), content: document.querySelector("#help-content"),
          template: document.querySelector("#help-topic-template") }, {
          locale: () => locale, t: (key) => getTranslationsForLocale(locale)[key], catalog: HELP_TOPICS,
        });
        const result = [];
        for (locale of ["de", "en", "fr"]) {
          for (const id of Object.keys(HELP_TOPICS)) {
            controller.openTopic(id);
            const title = document.querySelector("#help-dialog-title").textContent;
            result.push({ id, locale, title, rows: document.querySelectorAll("#help-content li").length });
          }
        }
        controller.openTopic("unknown");
        const last = document.querySelector("#help-dialog-title").textContent;
        controller.openTopic("composer_input");
        document.querySelector("#help-dialog").close();
        return { result, last };
      });
      expect(topics.result.length).toBeGreaterThan(60);
      for (const topic of topics.result) { expect(topic.title).toBeTruthy(); expect(topic.title).not.toMatch(/^helpTopic/); expect(topic.rows).toBeGreaterThan(0); }
      const trigger = page.locator('[data-help-topic]:visible').first(); await trigger.click();
      await expect(page.locator("#help-dialog")).toBeVisible(); await expect(page.locator("#help-content .help-topic-list li").first()).toBeVisible();
      await page.locator('#help-dialog button[type="submit"]').click();
      const protectedTopic = await page.evaluate(async () => {
        const { createHelpController } = await import("/js/core/app-help.js");
        let resolveFetch;
        const controller = createHelpController({ dialog: document.querySelector("#help-dialog"),
          title: document.querySelector("#help-dialog-title"), status: document.querySelector("#help-status"),
          content: document.querySelector("#help-content"), template: document.querySelector("#help-topic-template") }, {
          locale: () => "en", catalog: { safe: { title: "title", text: "body", bullets: ["bullet"] } },
          t: (key) => `<img src=x onerror=alert(1)> ${key}`,
          markdown: { render: () => "OLD README" }, fetch: () => new Promise((resolve) => { resolveFetch = resolve; }), report() {},
        });
        const pending = controller.loadReadme(); controller.openTopic("safe");
        resolveFetch({ ok: true, text: async () => "late" }); await pending;
        const result = { text: document.querySelector("#help-content").textContent, images: document.querySelectorAll("#help-content img").length };
        document.querySelector("#help-dialog").close(); return result;
      });
      expect(protectedTopic.text).toContain("onerror=alert(1)"); expect(protectedTopic.text).not.toContain("OLD README"); expect(protectedTopic.images).toBe(0);
    }
    expect(errors).toEqual([]);
  });
  test("application lifecycle integrates session repair, PWA prompts, updates and reload on both pages", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    let version = require("../version.json");
    await page.route("**/version.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(version) }));
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      window.lifecycleRequests = []; window.sessionReason = ""; window.installCalls = 0;
      const account = { did: "did:plc:lifecycle", handle: "lifecycle.test", identifier: "lifecycle.test", service: "https://bsky.social" };
      const registration = { update: async () => window.lifecycleRequests.push("UPDATE"),
        waiting: { postMessage: (message) => window.lifecycleRequests.push(message.type) },
        active: { postMessage(message, ports) {
          window.lifecycleRequests.push(message.type); let result = null;
          if (message.type === "GET_APP_STATE") { result = { ...account, accounts: [account], localePreference: "en", locale: "en",
            draft: "Lifecycle document", desktopLayoutVersion: 2, linkCardProvider: "none" }; }
          if (message.type === "VERIFY_SESSION") { result = { ...account, accounts: [account], authenticated: !window.sessionReason, reason: window.sessionReason }; }
          ports[0].postMessage({ ok: true, result });
        } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      version = require("../version.json");
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#source-text")).toHaveValue("Lifecycle document");
      await expect.poll(() => page.evaluate(() => window.lifecycleRequests.includes("VERIFY_SESSION"))).toBe(true);
      await expect.poll(() => page.evaluate(() => window.lifecycleRequests.includes("UPDATE"))).toBe(true);
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt", { cancelable: true });
        event.prompt = () => { window.installCalls += 1; }; event.userChoice = Promise.resolve({ outcome: "dismissed" });
        window.dispatchEvent(event);
      });
      await expect(page.locator("#install-button")).toBeVisible(); await page.locator("#install-button").click();
      await expect(page.locator("#install-button")).not.toBeVisible(); expect(await page.evaluate(() => window.installCalls)).toBe(1);
      await page.locator("#settings-button").click();
      version = { appVersion: "9.9.9", cacheVersion: "test-next", label: "Lifecycle release" };
      await page.locator("#check-updates-button").click();
      await expect(page.locator("#update-status")).toContainText("Lifecycle release");
      await expect(page.locator("#reload-app-button")).toHaveClass(/is-active/);
      await page.locator("#reload-app-button").click();
      await expect(page).toHaveURL(/reload=\d+/);
      await expect(page.locator("#source-text")).toHaveValue("Lifecycle document");
      await page.evaluate(() => { window.sessionReason = "invalid_password"; window.dispatchEvent(new Event("focus")); });
      await expect(page.locator("#login-dialog")).toBeVisible();
      expect(errors).toEqual([]);
    }
  });
  test("shell layout resizes, collapses consistently and stacks on mobile", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      localStorage.setItem("threadline:compact-mode", "false");
      const state = { localePreference: "en", locale: "en", draft: "Layout test post", desktopLayoutVersion: 2,
        sidebarWidthDesktop: 470, composerWidthDesktop: 360, sidebarCollapsedDesktop: false };
      window.layoutSaves = [];
      const registration = { update: async () => {}, active: { postMessage(message, ports) {
        let result = null;
        if (message.type === "GET_APP_STATE") { result = state; }
        if (message.type === "SAVE_SETTINGS") { window.layoutSaves.push(message.payload); }
        ports[0].postMessage({ ok: true, result });
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#source-text")).toHaveValue("Layout test post");
      await expect.poll(async () => (await page.locator(".sidebar").boundingBox()).width).toBe(470);
      const handle = await page.locator("#sidebar-resize-handle").boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 120); await page.mouse.down();
      await page.mouse.move(590, handle.y + 120, { steps: 4 }); await page.mouse.up();
      await expect.poll(async () => (await page.locator(".sidebar").boundingBox()).width).toBe(590);
      await expect.poll(() => page.evaluate(() => window.layoutSaves.some((value) => value.sidebarWidthDesktop === 590))).toBe(true);
      if (pathname === "/") {
        const composer = await page.locator("#composer-resize-handle").boundingBox();
        const dragY = composer.y + composer.height / 2;
        await page.mouse.move(composer.x + composer.width / 2, dragY); await page.mouse.down();
        await expect(page.locator("body")).toHaveClass(/desktop-resizing/);
        await page.mouse.move(composer.x + 100, dragY, { steps: 4 }); await page.mouse.up();
        const size = await page.evaluate(() => Number.parseFloat(document.body.style.getPropertyValue("--desktop-composer-width")));
        const expected = await page.evaluate((x) => Math.round(x - document.body.getBoundingClientRect().left
          - Number.parseFloat(document.body.style.getPropertyValue("--desktop-sidebar-width"))
          - Number.parseFloat(getComputedStyle(document.body).getPropertyValue("--desktop-resize-handle-width"))), composer.x + 100);
        expect(size).toBe(expected); expect(size).toBeGreaterThan(360);
      }
      const collapsed = [];
      for (const compact of [false, true]) {
        if (compact) {
          await page.locator("#settings-button").click();
          await page.locator('[id="compact-mode-toggle-button"]:visible').click();
          await page.locator("#settings-close-top").click();
        }
        await page.locator("#sidebar-toggle-button").click();
        await expect(page.locator("body")).toHaveClass(/desktop-sidebar-collapsed/);
        await expect(page.locator("#sidebar-toggle-button")).toHaveAttribute("aria-expanded", "false");
        const sidebar = await page.locator(".sidebar").boundingBox();
        const button = await page.locator('[data-page-target="tools"]').boundingBox();
        const collapsedWidth = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).getPropertyValue("--desktop-sidebar-collapsed-width")));
        expect(sidebar.width).toBe(collapsedWidth); expect(button.x).toBeGreaterThanOrEqual(sidebar.x);
        expect(button.x + button.width).toBeLessThanOrEqual(sidebar.x + sidebar.width);
        collapsed.push({ width: sidebar.width, buttonWidth: button.width, buttonHeight: button.height });
        await page.locator("#sidebar-toggle-button").click();
      }
      expect(collapsed[0]).toEqual(collapsed[1]);
      await page.locator("#settings-button").click();
      await page.locator("#reset-column-widths-button").click();
      await page.locator("#settings-close-top").click();
      await expect.poll(async () => (await page.locator(".sidebar").boundingBox()).width).toBe(470);
      await page.setViewportSize({ width: 390, height: 844 });
      const sidebar = await page.locator(".sidebar").boundingBox();
      const workspace = await page.locator("main.workspace").boundingBox();
      expect(sidebar.width).toBeCloseTo(390, 0); expect(workspace.width).toBeCloseTo(390, 0);
      expect(workspace.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
      await page.locator("#sidebar-toggle-button").click();
      await expect(page.locator("body")).toHaveClass(/mobile-sidebar-collapsed/);
      await page.setViewportSize({ width: 1600, height: 1000 });
      await expect(page.locator("body")).toHaveClass(/desktop-sidebar-collapsed/);
      await expect(page.locator("body")).not.toHaveClass(/mobile-sidebar-collapsed/);
    }
    expect(errors).toEqual([]);
  });
  test("application startup restores saved state and local appearance on both pages", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; const consoleErrors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") { consoleErrors.push(message.text()); } });
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      if (localStorage.getItem("threadline:theme-mode") === null) { localStorage.setItem("threadline:theme-mode", "light"); }
      if (localStorage.getItem("threadline:compact-mode") === null) { localStorage.setItem("threadline:compact-mode", "false"); }
      window.startupRequests = [];
      const registration = { update: async () => window.startupRequests.push("UPDATE_CHECK"),
        active: { postMessage(message, ports) {
          window.startupRequests.push(message.type);
          let result = null;
          if (message.type === "GET_APP_STATE") {
            result = { localePreference: "en", locale: "en", draft: "Restored startup document", tipsVisible: false,
              themeMode: "dark", compactMode: true, hashtags: ["StartupTag"], selectedHashtags: [],
              postLanguages: ["en"], appendThreadIntro: true, linkCardProvider: "none" };
          }
          ports[0].postMessage({ ok: true, result });
        } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#source-text")).toHaveValue("Restored startup document");
      await expect(page.locator("body")).not.toHaveClass(/theme-dark|ui-density-compact/);
      await expect(page.locator("#thread-intro-toggle")).toBeChecked();
      await expect.poll(() => page.evaluate(() => window.startupRequests.includes("UPDATE_CHECK"))).toBe(true);
      const requests = await page.evaluate(() => window.startupRequests);
      expect(requests).toEqual(expect.arrayContaining(["GET_APP_STATE", "GET_ARCHIVE_SESSION", "GET_ARCHIVE_CATALOG",
        "GET_DM_PARTNER_CACHE", "GET_ACCOUNT_AVATAR_CACHE", "SAVE_SETTINGS"]));
      expect(requests.indexOf("SAVE_SETTINGS")).toBeLessThan(requests.indexOf("UPDATE_CHECK"));
    }
    await page.locator("#settings-button").click();
    await page.locator('[id="compact-mode-toggle-button"]:visible').click();
    await expect(page.locator("body")).toHaveClass(/ui-density-compact/);
    await page.locator("#settings-close-top").click();
    await page.locator('[data-page-target="composer"]').click();
    await expect(page.locator("body")).toHaveAttribute("data-page", "composer");
    await expect(page.locator("body")).toHaveClass(/ui-density-compact/);
    await page.reload();
    await expect(page.locator("body")).toHaveClass(/ui-density-compact/);
    await page.locator('[data-page-target="tools"]').click();
    await expect(page.locator("body")).toHaveAttribute("data-page", "tools");
    await expect(page.locator("body")).toHaveClass(/ui-density-compact/);
    await page.goto('/?_theme=dark&_density=normal&keep=yes');
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    await expect(page.locator("body")).not.toHaveClass(/ui-density-compact/);
    await expect(page).toHaveURL(/keep=yes/);
    expect(new URL(page.url()).searchParams.has("_theme")).toBe(false);
    await page.locator('[data-page-target="tools"]').click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    await expect(page.locator("body")).not.toHaveClass(/ui-density-compact/);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
  test("Composer mention dialog repairs real sections and cancels pending input on close", async ({ page }) => {
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      window.mentionQueries = [];
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({
        active: { postMessage(message, ports) {
          let result = {};
          if (message.type === "SEARCH_MENTION_ACTORS") {
            window.mentionQueries.push(message.payload.query);
            result = { actors: [{ handle: "correct.example", did: "did:plc:correct", displayName: "Correct" }] };
          }
          ports[0].postMessage({ ok: true, result });
        } },
      }) });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#source-text").fill("Hello @wrong.example");
    await page.locator("button.segment-mention-chip-warning").first().click();
    await expect(page.locator("#mention-search-dialog")).toBeVisible();
    await expect(page.locator("#mention-search-input")).toHaveValue("wrong.example");
    await page.locator("#mention-search-results button").first().click();
    await expect(page.locator("#mention-search-dialog")).not.toBeVisible();
    await expect(page.locator(".segment-text").first()).toHaveValue(/@correct.example/);
    await page.locator(".segment-mention-sync-button").click();
    await expect(page.locator("#source-text")).toHaveValue("Hello @correct.example");
    await page.locator("button.segment-mention-chip-warning").first().click();
    await page.locator("#mention-search-input").fill("cancelled.example");
    await page.locator("#mention-search-close-top").click();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.mentionQueries.includes("cancelled.example"))).toBe(false);
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    expect(errors).toEqual([]);
  });
  test("composer link-card previews use real templates on both pages", async ({ page }) => {
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const { createComposerLinkCardPreviewRenderer } = await import("/js/composer/composer-link-cards.js");
        const container = document.createElement("div"); document.body.append(container);
        let card = { url: "https://example.com", title: "<b>Plain title</b>", description: "Description", standardSite: {} };
        const calls = [];
        const renderer = createComposerLinkCardPreviewRenderer(document.querySelector("#composer-link-card-preview-template"), {
          getCard: () => card, normalize: (value) => value, getFooterLabel: () => "Publication", translate: (key) => key,
          setCard: (_index, value) => { card = value; }, persist: async () => calls.push("persist"),
          preserveScroll: (callback) => callback(), renderSegments: () => calls.push("render"), saveDraft: () => calls.push("draft"),
        });
        renderer.render(container, 0);
        const title = container.querySelector("strong").textContent;
        const safe = !container.querySelector("strong b");
        const publication = container.firstElementChild.classList.contains("is-publication");
        const noImage = !container.querySelector("img");
        container.querySelector("button").click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        renderer.render(container, 0);
        const empty = container.childElementCount === 0; container.remove();
        return { title, safe, publication, noImage, empty, calls };
      });
      expect(result).toEqual({ title: "<b>Plain title</b>", safe: true, publication: true, noImage: true,
        empty: true, calls: ["persist", "render", "draft"] });
    }
    expect(errors).toEqual([]);
  });
  test("settings backup imports and exports real gzip files on both pages", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({
        active: { postMessage(_message, ports) { ports[0].postMessage({ ok: true, result: {} }); } },
      }) });
    });
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const data = { app: "Threadline", data: { localePreference: "en", themeMode: "dark", compactMode: false,
        hashtags: ["BackupTag"], selectedHashtags: ["backuptag"], postLanguages: ["de", "fr"],
        appendThreadIntro: true, postInteraction: { replyMode: "custom", allowFollowers: true, quotePostsAllowed: false } } };
      await page.locator("#import-settings-input").setInputFiles({ name: "settings.json.gz", mimeType: "application/gzip",
        buffer: require("node:zlib").gzipSync(Buffer.from(JSON.stringify(data))) });
      await expect(page.locator("body")).toHaveClass(/theme-dark/);
      await expect(page.locator("body")).not.toHaveClass(/ui-density-compact/);
      await expect(page.locator("#hashtag-cloud .hashtag-chip")).toHaveText("#BackupTag");
      await page.locator("#settings-button").click();
      const downloaded = page.waitForEvent("download");
      await page.locator("#export-settings-button").click();
      const file = await downloaded; const stream = await file.createReadStream(); const chunks = [];
      for await (const chunk of stream) { chunks.push(chunk); }
      const exported = JSON.parse(require("node:zlib").gunzipSync(Buffer.concat(chunks)).toString("utf8"));
      expect(exported.schemaVersion).toBe(1); expect(exported.excludesCredentials).toBe(true);
      expect(exported.data.postLanguages).toEqual(["de", "fr"]);
      expect(exported.data.postInteraction).toMatchObject({ replyMode: "custom", allowFollowers: true, quotePostsAllowed: false });
      expect(exported.data.selectedHashtags).toEqual(["backuptag"]);
      expect(exported.data.themeMode).toBe("dark"); expect(exported.data.compactMode).toBe(false);
      expect(exported.data.segmentImages).toBeUndefined();
      await page.locator("#settings-close-top").click();
      await page.evaluate(async () => {
        const { createSettingsBackupReminder } = await import("/js/core/app-backup.js");
        localStorage.removeItem("test:export"); localStorage.removeItem("test:dismiss");
        const reminder = createSettingsBackupReminder({ status: document.querySelector("#backup-status"),
          dialog: document.querySelector("#backup-reminder-dialog"), message: document.querySelector("#backup-reminder-message") }, {
          storage: localStorage, exportKey: "test:export", dismissKey: "test:dismiss", now: () => 10000,
          intervalMs: 1000, snoozeMs: 100, hasOpenDialog: () => Boolean(document.querySelector("dialog[open]")),
          translate: (key) => key, clearTimer: clearTimeout, setTimer: setTimeout, warn() {}, report() {}, exportFile: async () => {},
        });
        reminder.show(); window.backupReminderTest = reminder;
      });
      await expect(page.locator("#backup-reminder-dialog")).toBeVisible();
      await page.evaluate(() => window.backupReminderTest.close(true));
      await expect(page.locator("#backup-reminder-dialog")).not.toBeVisible();
    }
    expect(errors).toEqual([]);
  });
  test("shared hashtag workflow adds, merges, deletes and relocates the real pane", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({
        active: { postMessage(_message, ports) { ports[0].postMessage({ ok: true, result: {} }); } },
      }) });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#source-text").fill("Hashtag workflow");
    await page.locator("#hashtag-input").fill("Alpha");
    await page.locator("#hashtag-add-button").click();
    await page.locator("#hashtag-input").fill("Beta");
    await page.locator("#hashtag-add-button").click();
    await expect(page.locator("#hashtag-cloud .hashtag-item")).toHaveCount(2);
    await expect(page.locator(".segment-text").first()).toHaveValue(/#Alpha #Beta/);
    const alpha = page.locator("#hashtag-cloud .hashtag-item").filter({ hasText: "#Alpha" });
    await alpha.locator(".hashtag-tool:not(.danger)").click();
    await page.locator("#hashtag-edit-input").fill("BETA");
    await page.locator("#hashtag-edit-save-button").click();
    await expect(page.locator("#hashtag-edit-dialog")).not.toBeVisible();
    await expect(page.locator("#hashtag-cloud .hashtag-item")).toHaveCount(1);
    await expect(page.locator("#hashtag-cloud .hashtag-chip")).toHaveText("#BETA");
    await expect(page.locator(".segment-text").first()).toHaveValue(/#BETA/);
    await page.locator(".segment-text").first().fill("manual");
    await expect(page.locator("#hashtag-add-button")).toBeDisabled();
    await expect(page.locator("#hashtag-cloud .hashtag-tool.danger")).toBeDisabled();
    await page.locator("#composer-unlock-button").click();
    await page.locator("#hashtag-cloud .hashtag-tool.danger").click();
    await expect(page.locator("#hashtag-cloud .hashtag-item")).toHaveCount(0);
    await expect(page.locator(".segment-text").first()).toHaveValue(/Hashtag workflow/);
    await expect(page.locator(".segment-text").first()).not.toHaveValue(/#BETA/);
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await page.locator("#search-button").evaluate((button) => { button.disabled = false; button.click(); });
    await page.locator("#search-hashtag-button").click();
    await expect(page.locator("#search-hashtag-dialog")).toBeVisible();
    await expect(page.locator("#search-hashtag-dialog-slot #hashtags-pane")).toBeVisible();
    await page.locator("#hashtag-input").fill("SearchOnly");
    await page.locator("#hashtag-add-button").click();
    await expect(page.locator("#hashtag-cloud .hashtag-chip")).toHaveText("#SearchOnly");
    await page.locator("#search-hashtag-close-top").click();
    await expect(page.locator("#search-hashtag-summary")).toContainText("#SearchOnly");
    const archive = await page.evaluate(async () => {
      const { createHashtagController, normalizeHashtags } = await import("/js/shared/shared-hashtags.js");
      const state = { hashtags: normalizeHashtags(["ArchiveTag"]), selectedHashtags: [],
        searchSelectedHashtags: [], archiveSelectedHashtags: [], composerLocked: true };
      const pane = document.querySelector("#hashtags-pane");
      const mode = document.querySelector("#archive-content-mode-select");
      const controller = createHashtagController({ pane, cloud: document.querySelector("#hashtag-cloud"),
        selectionNote: document.querySelector("#hashtag-selection-note"),
        template: document.querySelector("#hashtag-item-template"), archiveMode: mode,
        archiveSlot: document.querySelector("#archive-hashtag-slot"),
        placementLabel: document.querySelector("#hashtag-placement-label"),
        archiveScope: document.querySelector("#archive-hashtag-scope-wrap"), archiveNote: document.querySelector("#archive-hashtag-note"),
      }, { getState: () => state, setState: (next) => Object.assign(state, next), getContext: () => "archive",
        translate: (key) => key, persistArchive: async () => {}, persistSettings: async () => {},
        renderLock: () => {}, invalidateArchive: () => {}, setText: (element, value) => { element.textContent = value; },
        setVisibility: (element, visible) => { element.hidden = !visible; },
      });
      mode.value = "posts"; controller.applyContext(); controller.render();
      document.querySelector("#hashtag-cloud .hashtag-chip").click();
      return { parent: pane.parentElement.id, mode: mode.value, selection: state.archiveSelectedHashtags,
        composer: state.selectedHashtags, scopeHidden: document.querySelector("#archive-hashtag-scope-wrap").hidden };
    });
    expect(archive).toEqual({ parent: "archive-hashtag-slot", mode: "thread_roots", selection: ["archivetag"], composer: [], scopeHidden: false });
    expect(errors).toEqual([]);
  });
  test("Composer post settings, language contexts and UI lock operate on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      window.settingsRequests = [];
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({
        active: { postMessage(message, ports) {
          window.settingsRequests.push(message);
          ports[0].postMessage({ ok: true, result: {} });
        } },
      }) });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#source-text").fill("Settings workflow");
    await expect(page.locator("#publish-button")).toBeEnabled();
    await page.locator("#post-settings-button").click();
    const dialog = page.locator("#post-languages-dialog");
    await expect(dialog).toBeVisible();
    await page.locator('#post-languages-list input[value="de"]').check();
    await page.locator('#post-languages-list input[value="fr"]').check();
    await expect(page.locator('#post-languages-list input[value="es"]')).toBeDisabled();
    await page.locator("#post-interaction-disclosure > summary").click();
    await page.locator("#reply-mode-custom").check();
    await page.locator("#reply-allow-followers").check();
    await page.locator("#quote-posts-toggle").uncheck();
    await page.locator("#post-languages-close-top").click();
    await expect(dialog).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => window.settingsRequests.filter((entry) => entry.type === "SAVE_SETTINGS")
      .at(-1)?.payload.postInteraction)).toMatchObject({ replyMode: "custom", allowFollowers: true, quotePostsAllowed: false });
    await expect.poll(() => page.evaluate(() => window.settingsRequests.filter((entry) => entry.type === "SAVE_SETTINGS")
      .at(-1)?.payload.postLanguages)).toEqual(["en", "de", "fr"]);
    await page.locator(".segment-text").first().fill("manual edit");
    await expect(page.locator("#source-text")).toBeDisabled();
    await expect(page.locator("#post-settings-button")).toBeDisabled();
    await page.locator("#composer-unlock-button").click();
    await expect(page.locator("#source-text")).toBeEnabled();
    await page.locator("#source-text").fill("");
    await expect(page.locator("#publish-button")).toBeDisabled();
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#post-language-option-template")).toBeAttached();
    await page.locator("#search-language-button").evaluate((button) => button.click());
    await expect(dialog).toBeVisible();
    await expect(page.locator("#post-languages-settings-list")).toBeHidden();
    await expect(page.locator("#post-interaction-disclosure")).toBeHidden();
    await page.locator('#post-languages-list input[value="de"]').check();
    await page.locator('#post-languages-list input[value="fr"]').check();
    await page.locator('#post-languages-list input[value="es"]').check();
    await expect(page.locator('#post-languages-list input[value="en"]')).toBeDisabled();
    await page.locator("#post-languages-search").fill("zzzz-not-a-language");
    await expect(page.locator("#post-languages-list .settings-note")).toBeVisible();
    await expect(page.locator("#post-languages-list .post-language-option")).toHaveCount(0);
    await page.locator("#post-languages-close-top").click();
    await expect(page.locator("#post-languages-search")).toHaveValue("");
    expect(errors).toEqual([]);
  });
  test("Composer document workflow imports, edits, exports and clears the real section UI", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      window.documentRequests = [];
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({
        active: { postMessage(message, ports) {
          window.documentRequests.push(message);
          ports[0].postMessage({ ok: true, result: {} });
        } },
      }) });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.locator("#thread-import-input");
    const payload = { thread: {
      sourceText: "source %% body", useCounters: false, localePreference: "en",
      segments: [{ text: "manual part one", images: [] }, { text: "manual part two", images: [] }],
    } };
    await input.setInputFiles({ name: "thread.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(payload)) });
    await expect(page.locator("#confirm-dialog")).toBeVisible();
    await page.locator("#confirm-dialog-confirm-button").click();
    await expect(page.locator(".segment-text")).toHaveCount(2);
    await expect(page.locator(".segment-text").first()).toHaveValue("manual part one");
    await expect(page.locator(".segment-image-help-trigger")).toHaveCount(1);
    await page.locator(".segment-text").first().fill("manually edited");
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#save-thread-button").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) { chunks.push(chunk); }
    let bytes = Buffer.concat(chunks);
    if (/\.gz$/i.test(download.suggestedFilename())) { bytes = require("node:zlib").gunzipSync(bytes); }
    const saved = JSON.parse(bytes.toString("utf8"));
    expect(saved.thread.sourceText).toBe("source %% body");
    expect(saved.thread.segments.map((segment) => segment.text)).toEqual(["manually edited", "manual part two"]);
    const overflow = await page.locator(".segment-card").evaluateAll((cards) => cards.some((card) => card.scrollWidth > card.clientWidth + 1));
    expect(overflow).toBe(false);
    await expect(page.locator("#clear-button")).toBeDisabled();
    await page.locator("#composer-unlock-button").click();
    await page.locator("#clear-button").click();
    await expect(page.locator("#confirm-dialog")).toBeVisible();
    await page.locator("#confirm-dialog-confirm-button").click();
    await expect(page.locator("#source-text")).toHaveValue("");
    await expect(page.locator(".segment-card")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.documentRequests.some((message) =>
      message.type === "SAVE_DRAFT" && message.payload.draft === ""))).toBe(true);
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#composer-segment-help-template")).toBeAttached();
    expect(errors).toEqual([]);
  });
  test("Composer image editor full application workflow saves and cancels real image edits", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      window.editorStorageRequests = [];
      const worker = {
        postMessage(message, ports) {
          window.editorStorageRequests.push(message);
          ports[0].postMessage({ ok: true, result: {} });
        },
      };
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve({ active: worker }) });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("#source-text").fill("Editor integration test");
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 240;
      const context = canvas.getContext("2d");
      context.fillStyle = "red"; context.fillRect(0, 0, 80, 240);
      context.fillStyle = "blue"; context.fillRect(80, 0, 80, 240);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator(".segment-add-image-button").first().click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: "editor-test.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    const editButton = page.locator('[data-image-action="edit"]').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    const dialog = page.locator("#image-editor-dialog");
    await expect(dialog).toBeVisible();
    await page.locator("#image-flip-horizontal-button").click();
    await page.locator("#image-rotate-left-button").click();
    await page.locator("#image-zoom-input").fill("1.5");
    const editedPixels = await page.locator("#image-editor-canvas").evaluate((canvas) => ({
      width: canvas.width, height: canvas.height,
      pixel: [...canvas.getContext("2d").getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data],
    }));
    await page.locator("#image-editor-save-button").click();
    await expect.poll(async () => ({
      open: await dialog.evaluate((element) => element.open), errors,
    })).toEqual({ open: false, errors: [] });
    await editButton.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("#image-zoom-input")).toHaveValue("1.5");
    const reopenedPixels = await page.locator("#image-editor-canvas").evaluate((canvas) => ({
      width: canvas.width, height: canvas.height,
      pixel: [...canvas.getContext("2d").getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data],
    }));
    expect(reopenedPixels).toEqual(editedPixels);
    await page.locator("#image-reset-button").click();
    await expect(page.locator("#image-zoom-input")).toHaveValue("1");
    await page.locator("#image-editor-cancel-button").click();
    await editButton.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("#image-zoom-input")).toHaveValue("1.5");
    await page.locator("#image-editor-close-top").click();
    const persisted = await page.evaluate(() => window.editorStorageRequests
      .filter((message) => message.type === "SAVE_SETTINGS").at(-1)?.payload.segmentImages[0][0].edit);
    expect(persisted).toMatchObject({ zoom: 1.5, rotation: 270, flipX: true });
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toHaveAttribute("data-page", "tools");
    await expect(page.locator("#image-editor-dialog")).toBeAttached();
    expect(errors).toEqual([]);
  });
});
test.describe("Composer event integration", () => {
  test.use({ serviceWorkers: "block" });
  test("Composer image processing renders original, edited and fitted exports on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const { createComposerImageProcessing } = await import("/js/composer/composer-image-processing.js");
        const { createComposerImageGeometry } = await import("/js/composer/composer-image-geometry.js");
        const { renderComposerImageToCanvas } = await import("/js/composer/composer-image-renderer.js");
        const defaults = { zoom: 1, rotation: 0, offsetX: 0, offsetY: 0, flipX: false, flipY: false, fitMode: "cover" };
        const normalizeImageEdit = (edit) => ({ ...defaults, ...edit });
        const isImageUsingDefaultEdit = (image) => image.edit.zoom === 1 && image.edit.rotation === 0;
        const geometry = createComposerImageGeometry({
          normalizeImageEdit, isImageUsingDefaultEdit,
          clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
          IMAGE_EDITOR_CANVAS_WIDTH: 980, IMAGE_EDITOR_CANVAS_HEIGHT: 630, IMAGE_EXPORT_WIDTH: 1400,
        });
        const source = document.createElement("canvas"); source.width = 64; source.height = 128;
        source.getContext("2d").fillStyle = "red"; source.getContext("2d").fillRect(0, 0, 64, 128);
        const dataUrl = source.toDataURL("image/png");
        const fileBlob = await (await fetch(dataUrl)).blob();
        const processing = createComposerImageProcessing({
          createImage: () => new Image(), createFileReader: () => new FileReader(),
          fetchData: (url) => fetch(url), createImageBitmap: (blob) => createImageBitmap(blob),
          createId: () => "fixture", createCanvas: () => document.createElement("canvas"), getDevicePixelRatio: () => 2,
          normalizeThreadImage: (image) => ({ ...image, edit: normalizeImageEdit(image.edit) }),
          createDefaultImageEdit: () => ({ ...defaults }), normalizeImageEdit, isImageUsingDefaultEdit,
          hasExplicitImageUploadTransform: (image) => image.edit.zoom !== 1 || image.exportScale < 1,
          normalizeImageAutoResizeMode: (mode) => mode, getAutoResizeMode: () => "off",
          ...geometry, renderComposerImageToCanvas, t: (key) => key,
          IMAGE_MIN_EXPORT_SCALE: 0.1, IMAGE_MAX_DIMENSION: 64, IMAGE_BLOB_LIMIT: 1000000,
        });
        const image = await processing.createThreadImageFromFile(new File([fileBlob], "source.png", { type: "image/png" }));
        const original = await processing.renderImageToBlob(image);
        const bytes = [...new Uint8Array(await original.blob.arrayBuffer())];
        const originalBytes = [...new Uint8Array(await fileBlob.arrayBuffer())];
        image.edit.zoom = 2;
        const edited = await processing.renderImageToBlob(image);
        const bitmap = await createImageBitmap(edited.blob);
        const sampled = document.createElement("canvas"); sampled.width = bitmap.width; sampled.height = bitmap.height;
        sampled.getContext("2d").drawImage(bitmap, 0, 0);
        const pixel = [...sampled.getContext("2d").getImageData(bitmap.width / 2, bitmap.height / 2, 1, 1).data];
        bitmap.close();
        image.edit.zoom = 1;
        const fitted = await processing.prepareImageForUpload(image, "fit");
        return { originalType: original.blob.type, sameBytes: JSON.stringify(bytes) === JSON.stringify(originalBytes),
          source: [image.width, image.height], edited: [edited.width, edited.height, edited.blob.type], pixel,
          fitted: [fitted.width, fitted.height, fitted.validation.tooBig], savedScale: image.exportScale || 1 };
      });
      expect(result).toEqual({ originalType: "image/png", sameBytes: true, source: [64, 128],
        edited: [900, 1400, "image/jpeg"], pixel: [254, 0, 0, 255], fitted: [32, 64, false], savedScale: 1 });
    }
    expect(errors).toEqual([]);
  });
  test("Composer editor Canvas, dragging and metrics operate on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-image-renderer.js");
        const canvas = document.getElementById("image-editor-canvas"); canvas.width = 20; canvas.height = 20;
        const bitmap = document.createElement("canvas"); bitmap.width = 20; bitmap.height = 20;
        bitmap.getContext("2d").fillStyle = "red"; bitmap.getContext("2d").fillRect(0, 0, 20, 20);
        const image = { width: 20, height: 20, originalSizeBytes: 10, validation: { sizeBytes: 20 } };
        let draft = { offsetX: 0, offsetY: 0, fitMode: "cover" }; let scheduled = 0; let drawn = 0;
        module.drawComposerImageEditor(canvas, image, bitmap, draft, { normalizeEdit: (value) => value,
          getSourceDimensions: () => ({ width: 20, height: 20 }), scheduleMetrics: () => { scheduled += 1; },
          getMetrics: () => ({ offsetX: 1, offsetY: 2, fitMode: "cover", centerX: 10, centerY: 10, rotation: 0, flipX: false, flipY: false, drawWidth: 20, drawHeight: 20 }) });
        const pixel = [...canvas.getContext("2d").getImageData(10, 10, 1, 1).data];
        const drag = module.createComposerImageEditorDragController({ getDraft: () => draft, setDraft: (value) => { draft = value; },
          getImage: () => image, clamp: (_image, value) => value, draw: () => { drawn += 1; } });
        drag.start({ clientX: 10, clientY: 10 }); drag.update({ clientX: 15, clientY: 17 }); drag.stop();
        drag.update({ clientX: 100, clientY: 100 });
        const get = (id) => document.getElementById(id);
        const elements = { originalDimensions: get("image-editor-original-dimensions"), originalSize: get("image-editor-original-size"),
          exportDimensions: get("image-editor-export-dimensions"), exportSize: get("image-editor-export-size") };
        const metrics = module.createComposerImageEditorMetricsController(elements, { getImage: () => image, getDraftImage: () => ({ ...image, edit: draft }),
          formatDimensions: (w, h) => `${w}/${h}`, formatSize: String, minScale: 0.1, isDefaultEdit: () => false,
          getExportDimensions: () => ({ width: 20, height: 20 }), translate: (key) => key, updateActions: () => {},
          renderBlob: async () => ({ width: 10, height: 12, blob: new Blob(["abc"]) }),
          clearTimer: (timer) => window.clearTimeout(timer), setTimer: (callback, delay) => window.setTimeout(callback, delay) });
        await metrics.update(); metrics.invalidate();
        return { pixel, scheduled, draft, drawn, dimensions: elements.exportDimensions.textContent, size: elements.exportSize.textContent };
      });
      expect(result).toEqual({ pixel: [255, 0, 0, 255], scheduled: 1, draft: { offsetX: 6, offsetY: 9, fitMode: "cover" }, drawn: 1, dimensions: "10/12", size: "3" });
    }
    expect(errors).toEqual([]);
  });
  test("Composer ALT dialog previews, saves and cleans up on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const dialogs = await import("/js/composer/composer-dialogs.js");
        const images = await import("/js/composer/composer-images.js");
        const get = (id) => document.getElementById(id);
        const elements = { dialog: get("alt-text-dialog"), input: get("alt-text-input"), count: get("alt-text-count"),
          previewWrap: get("alt-text-preview-wrap"), canvas: get("alt-text-preview-canvas") };
        const card = get("composer-segment-image-template").content.cloneNode(true).querySelector(".segment-image-card");
        const image = { dataUrl: "preview", alt: "old", width: 100, height: 200 };
        const calls = []; let box;
        const controller = dialogs.createComposerAltTextDialogController(elements, {
          maxLength: 4, getImage: () => image, getPreviewFrame: (value) => value,
          getContainedBox: (width, height, maxWidth, maxHeight) => {
            const scale = Math.min(maxWidth / width, maxHeight / height); return { width: width * scale, height: height * scale };
          }, renderCanvas: (_image, _canvas, value) => { box = value; }, defer: (callback) => callback(),
          persist: async () => calls.push("persist"), updateCard: () => { images.updateComposerImageAltDisplay(image, card, (key) => key); calls.push("card"); },
          updatePublish: () => calls.push("publish"), saveDraft: () => calls.push("draft"),
        });
        controller.open(0, 0);
        const opened = [elements.dialog.open, elements.previewWrap.hidden, elements.previewWrap.classList.contains("is-portrait"), elements.count.textContent];
        elements.input.value = "abcdef"; controller.count();
        const count = elements.count.textContent;
        await controller.save();
        const saved = [image.alt, elements.dialog.open, elements.previewWrap.hidden, elements.canvas.style.width,
          elements.canvas.style.height, elements.canvas.style.aspectRatio, card.querySelector(".segment-image-preview").title];
        image.dataUrl = ""; controller.open(0, 0);
        const noPreview = elements.previewWrap.hidden;
        controller.close();
        return { opened, box, count, calls, saved, noPreview };
      });
      expect(result).toEqual({ opened: [true, false, true, "3/4"], box: { cssWidth: 150, cssHeight: 300 }, count: "6/4",
        calls: ["persist", "card", "publish", "draft"], saved: ["abcd", false, true, "", "", "", "abcd"], noPreview: true });
    }
    expect(errors).toEqual([]);
  });
  test("Composer image collection integrates selection, template controls and drag cleanup on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-images.js");
        const fragment = document.getElementById("segment-template").content.cloneNode(true);
        const host = fragment.querySelector(".segment-card");
        const container = host.querySelector(".segment-images");
        document.body.appendChild(fragment);
        let images = [[]]; let renders = 0; const saved = [];
        const controller = module.createComposerImageCollectionController({
          getImages: () => images, setImages: (value) => { images = value; }, setSegment: (index, value) => { images[index] = value; },
          hasLinkCard: () => false, maxImages: 2, translate: (key) => key, setStatus: () => {},
          createImage: async (file) => ({ name: file.name, width: 100, height: 100, alt: "ALT" }),
          validate: () => {}, persist: async () => saved.push("persist"), saveDraft: () => saved.push("draft"),
          render: () => { renders += 1; render(); },
        });
        function render() {
          module.renderComposerSegmentImages(container, 0, images[0], { template: document.getElementById("composer-segment-image-template"),
            autoResize: true, translate: (key) => key, formatSize: () => "0", getPreviewFrame: (image) => image,
            getContainedBox: () => ({ width: 100, height: 100 }), renderCanvas: () => {},
            actions: { getDragState: () => null, hasFiles: () => false, move: controller.move, remove: controller.remove,
              editImage: () => {}, editAlt: () => {} } });
        }
        await controller.select(0, [new File(["a"], "a.png", { type: "image/png" }),
          new File(["b"], "b.png", { type: "image/png" }), new File(["text"], "text.txt", { type: "text/plain" })]);
        container.querySelector('[data-image-action="right"]').click();
        const moved = images[0].map((image) => image.name);
        container.querySelector('[data-image-action="delete"]').click();
        const remaining = images[0].map((image) => image.name);
        const card = container.querySelector(".segment-image-card");
        host.classList.add("is-file-drop-target"); container.classList.add("is-drop-target");
        card.classList.add("is-drop-before", "is-drop-after", "is-dragging");
        module.clearComposerImageDropMarkers(document);
        const dragKept = card.classList.contains("is-dragging");
        module.clearComposerImageDragVisuals(document);
        const markers = host.querySelectorAll(".is-drop-target,.is-drop-before,.is-drop-after,.is-dragging").length;
        const fileMarker = host.classList.contains("is-file-drop-target");
        host.remove();
        return { moved, remaining, renders, saved, dragKept, markers, fileMarker };
      });
      expect(result).toEqual({ moved: ["b.png", "a.png"], remaining: ["a.png"], renders: 3,
        saved: ["persist", "draft", "persist", "draft", "persist", "draft"], dragKept: true, markers: 0, fileMarker: false });
    }
    expect(errors).toEqual([]);
  });
  test("Composer segment image templates preserve preview geometry, warnings and actions on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      if (pathname === "/tools.html") { await page.setViewportSize({ width: 390, height: 844 }); }
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-images.js");
        const fragment = document.getElementById("segment-template").content.cloneNode(true);
        const host = fragment.querySelector(".segment-card");
        const container = host.querySelector(".segment-images");
        document.body.appendChild(fragment);
        const calls = [];
        const images = [{ name: "<b>portrait</b>", alt: "", width: 100, height: 200, originalSizeBytes: 20,
          validation: { width: 100, height: 200, sizeBytes: 30, tooBig: true, exceedsDimensions: true } },
          { name: "landscape", alt: "ALT", width: 200, height: 100, originalSizeBytes: 40 }];
        const options = { template: document.getElementById("composer-segment-image-template"), autoResize: false,
          translate: (key) => key, formatSize: (value) => String(value || 0),
          getPreviewFrame: (image) => image, getContainedBox: (width, height) => {
            const factor = 140 / Math.max(width, height); return { width: width * factor, height: height * factor };
          }, renderCanvas: (_image, canvas, box) => { canvas.style.width = `${box.cssWidth}px`; canvas.style.height = `${box.cssHeight}px`; },
          actions: { getDragState: () => null, hasFiles: () => false,
            editImage: (...args) => calls.push(["edit", ...args]), editAlt: (...args) => calls.push(["alt", ...args]),
            move: (...args) => calls.push(["move", ...args]), remove: (...args) => calls.push(["remove", ...args]) } };
        module.renderComposerSegmentImages(container, 2, images, options);
        const cards = [...container.querySelectorAll(".segment-image-card")];
        const previews = cards.map((card) => card.querySelector(".segment-image-preview"));
        const boxes = previews.map((preview) => { const rect = preview.getBoundingClientRect(); return [Math.round(rect.width), Math.round(rect.height)]; });
        const flags = cards.map((card) => [card.classList.contains("is-portrait"), card.classList.contains("is-too-large"),
          card.querySelector(".segment-image-alt-state").classList.contains("is-missing-alt")]);
        previews[0].click();
        previews[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        for (const action of ["right", "alt", "edit", "delete"]) { cards[0].querySelector(`[data-image-action="${action}"]`).click(); }
        cards[1].querySelector('[data-image-action="left"]').click();
        const boundaries = [cards[0].querySelector('[data-image-action="left"]').classList.contains("is-disabled"),
          cards[1].querySelector('[data-image-action="right"]').classList.contains("is-disabled")];
        const name = cards[0].querySelector(".segment-image-name").textContent;
        const markup = cards[0].querySelectorAll("b").length;
        options.autoResize = true;
        module.renderComposerSegmentImages(container, 2, images, options);
        const resized = container.querySelectorAll(".is-too-large").length;
        module.renderComposerSegmentImages(container, 2, [], options);
        const empty = container.children.length;
        host.remove();
        return { boxes, flags, boundaries, name, markup, calls, resized, empty };
      });
      let landscapeWidth = 140;
      if (pathname === "/tools.html") {
        landscapeWidth = 120;
      }
      expect(result).toEqual({ boxes: [[70, 140], [landscapeWidth, 70]], flags: [[true, true, true], [false, false, false]],
        boundaries: [true, true], name: "<b>portrait</b>", markup: 0,
        calls: [["edit", 2, 0], ["edit", 2, 0], ["move", 2, 0, 1], ["alt", 2, 0], ["edit", 2, 0], ["remove", 2, 0], ["move", 2, 1, -1]],
        resized: 0, empty: 0 });
    }
    expect(errors).toEqual([]);
  });
  test("Composer history templates render safe text and bind all actions on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-history.js");
        const get = (id) => document.getElementById(id);
        const elements = { list: get("history-list"), button: get("history-button"),
          itemTemplate: get("history-item-template"), emptyTemplate: get("history-empty-template") };
        const calls = [];
        const options = { translate: (key) => key, formatTimestamp: (value) => value,
          formatMeta: (threads, images) => `${threads}/${images}`, createActions: (entry) => ({
            threadExplorerClick: () => calls.push([entry.id, "explorer"]),
            continueClick: () => calls.push([entry.id, "continue"]), deleteClick: () => calls.push([entry.id, "delete"]),
          }) };
        module.renderComposerHistoryList([], elements, options);
        const empty = [elements.button.disabled, elements.list.querySelector(".history-empty").textContent];
        const entry = { id: "one", url: "https://example.org/post", createdAt: "date", threadCount: 1, imageCount: 2,
          firstSegmentText: "<img src=x onerror=alert(1)>", account: "<b>account</b>" };
        module.renderComposerHistoryList([entry, { ...entry, id: "two", threadCount: 3, firstSegmentText: "", account: "" }], elements, options);
        get("history-dialog").showModal();
        const items = [...elements.list.querySelectorAll(".history-item")];
        items[0].querySelector(".history-explorer-button").click();
        items[0].querySelector(".history-continue-button").click();
        items[0].querySelector(".history-delete-button").click();
        const shown = { disabled: elements.button.disabled, count: items.length,
          previews: items.map((item) => item.querySelectorAll(".history-preview").length),
          preview: items[0].querySelector(".history-preview").textContent,
          markup: items[0].querySelectorAll("img,b").length,
          eyebrows: items.map((item) => item.querySelector(".history-item-eyebrow").textContent),
          deleteLabel: items[0].querySelector(".history-delete-button").getAttribute("aria-label"),
          link: items[0].querySelector("a").getAttribute("rel"), calls };
        module.renderComposerHistoryList([], elements, options);
        const cleared = [elements.button.disabled, elements.list.querySelectorAll(".history-item").length];
        get("history-dialog").close();
        return { empty, shown, cleared };
      });
      expect(result).toEqual({ empty: [true, "historyEmpty"], shown: { disabled: false, count: 2, previews: [1, 0],
        preview: "<img src=x onerror=alert(1)>", markup: 0, eyebrows: ["historyPostEyebrow", "historyThreadEyebrow"],
        deleteLabel: "historyDeleteButton", link: "noreferrer noopener", calls: [["one", "explorer"], ["one", "continue"], ["one", "delete"]] }, cleared: [true, 0] });
    }
    expect(errors).toEqual([]);
  });
  test("Composer publication results render and recover from Explorer errors on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-publishing.js");
        const get = (id) => document.getElementById(id);
        const elements = { dialog: get("publish-result-dialog"), text: get("publish-result-text"),
          rateLimitNote: get("publish-result-rate-limit-note"), link: get("publish-result-link"), explorerButton: get("publish-result-thread-explorer-button") };
        const model = { message: "<b>Published</b>", rateLimitMessage: "limit", postUrl: "https://example.org/post", explorerLabel: "Explorer" };
        module.renderComposerPublishResult(model, elements);
        const shown = [elements.dialog.open, elements.text.textContent, elements.text.querySelectorAll("b").length,
          elements.link.hidden, elements.explorerButton.disabled, elements.rateLimitNote?.hidden ?? null];
        let failure = "";
        const options = { translate: (key) => key, setBusy: (button, busy) => { button.disabled = busy; },
          openPost: async () => { throw new Error("failed"); }, reportError: () => {}, showError: (message) => { failure = message; } };
        await module.openComposerPublishedPost(elements, options);
        const recovered = [elements.dialog.open, elements.explorerButton.disabled, failure];
        options.openPost = async () => {};
        await module.openComposerPublishedPost(elements, options);
        const closed = elements.dialog.open;
        module.renderComposerPublishResult({ ...model, postUrl: "", rateLimitMessage: "" }, elements);
        const empty = [elements.link.hidden, elements.explorerButton.disabled, elements.explorerButton.dataset.postUrl, elements.rateLimitNote?.hidden ?? null];
        elements.dialog.close();
        return { shown, recovered, closed, empty, buttons: document.querySelectorAll("#publish-result-thread-explorer-button").length };
      });
      expect(result).toEqual({ shown: [true, "<b>Published</b>", 0, false, false, null],
        recovered: [true, false, "failed"], closed: false, empty: [true, true, "", null], buttons: 1 });
    }
    expect(errors).toEqual([]);
  });
  test("Composer publish click opens confirmation and cancellation leaves the draft intact", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const source = page.locator("#source-text");
    await source.fill("Publish confirmation regression test");
    const publish = page.locator("#publish-button");
    await expect(publish).toBeEnabled();
    await publish.click();
    const dialog = page.locator("#confirm-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#confirm-dialog-title")).not.toHaveText("");
    await page.locator("#confirm-dialog-cancel-button").click();
    await expect(dialog).not.toBeVisible();
    await expect(source).toHaveValue("Publish confirmation regression test");
    await expect(publish).toBeEnabled();
    await expect(page.locator("#publish-result-dialog")).not.toBeVisible();
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    expect(errors).toEqual([]);
  });
  test("Composer reply handoff survives page changes and consumes real browser storage", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    const href = await page.evaluate(async () => {
      const module = await import("/js/composer/composer-page.js");
      const dialogs = await import("/js/composer/composer-dialogs.js");
      const handoff = module.createComposerReplyHandoff({ normalize: dialogs.normalizeComposerReplyTarget,
        getStorage: () => sessionStorage, getHref: () => location.href,
        replaceUrl: (url) => history.replaceState({}, "", url), queryKey: "testReply", storageKey: "testPendingReply" });
      const target = dialogs.buildComposerReplyTargetFromPost({ uri: "post", cid: "cid", text: "Grüße % & 🐦",
        reply: { root: { uri: "root", cid: "root-cid" } }, author: { handle: "test.example" } },
      { normalize: dialogs.normalizeComposerReplyTarget, buildWebUrl: () => "https://bsky.app/post" });
      let next = "";
      module.openComposerReplyTarget(target, {
        setTarget: () => {}, isComposerPage: () => false, persistTarget: handoff.persist,
        getComposerUrl: () => "/?keep=1", getHref: () => location.href,
        encodeTarget: handoff.encode, queryKey: "testReply", persistNavigation: () => {}, navigate: (url) => { next = url; },
      });
      return next;
    });
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(async () => {
      const module = await import("/js/composer/composer-page.js");
      const dialogs = await import("/js/composer/composer-dialogs.js");
      const handoff = module.createComposerReplyHandoff({ normalize: dialogs.normalizeComposerReplyTarget,
        getStorage: () => sessionStorage, getHref: () => location.href,
        replaceUrl: (url) => history.replaceState({}, "", url), queryKey: "testReply", storageKey: "testPendingReply" });
      const fromUrl = handoff.consumeUrl();
      const fromStorage = handoff.consumeStored();
      return { same: JSON.stringify(fromUrl) === JSON.stringify(fromStorage), text: fromUrl.targetPost.text,
        root: fromUrl.replyRoot, parent: fromUrl.replyParent, remaining: handoff.read(),
        query: location.search, second: handoff.consumeUrl() };
    });
    expect(result).toEqual({ same: true, text: "Grüße % & 🐦", root: { uri: "root", cid: "root-cid" },
      parent: { uri: "post", cid: "cid" }, remaining: null, query: "?keep=1", second: null });
    expect(errors).toEqual([]);
  });
  test("Composer reply preview and URL dialog work on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-dialogs.js");
        const get = (id) => document.getElementById(id);
        const elements = { card: get("reply-target-card"), eyebrow: get("reply-target-card-eyebrow"), avatar: get("reply-target-avatar"),
          name: get("reply-target-name"), handle: get("reply-target-handle"), meta: get("reply-target-meta"),
          warning: get("reply-target-warning"), text: get("reply-target-text") };
        const target = { mode: "post", targetAccount: { displayName: "<b>Other</b>", handle: "other.test" },
          rootAccount: { displayName: "Own", handle: "own.test" }, targetPost: { text: "<b>reply</b>" },
          rootPost: { text: "root" }, threadLength: 3, replyHint: "hint" };
        const options = { withCounters: true, translate: (key) => key, setAvatar: () => {} };
        module.renderComposerReplyTargetCard(target, elements, options);
        const post = [elements.name.textContent, elements.handle.textContent, elements.text.textContent, elements.warning.hidden, elements.text.querySelectorAll("b").length];
        module.renderComposerReplyTargetCard({ ...target, mode: "thread" }, elements, options);
        const thread = [elements.name.textContent, elements.text.textContent, elements.warning.hidden, elements.warning.style.display];
        module.renderComposerReplyTargetCard(null, elements, options);
        const hidden = elements.card.hidden;
        module.renderComposerReplyTargetCard(target, { card: null }, options);
        const dialog = module.createComposerReplyTargetDialogController({ dialog: get("reply-target-dialog"), input: get("reply-target-url"), status: get("reply-target-status"), submit: get("reply-target-submit") }, {
          translate: (key) => key, setBusy: (_button, busy) => { get("reply-target-submit").disabled = busy; },
          resolve: async () => ({ mode: "post" }), setStatus: () => {}, reportError: () => {},
        });
        dialog.open(" https://example.org ");
        const opened = [get("reply-target-dialog").open, get("reply-target-url").value];
        await dialog.submit();
        const closed = [get("reply-target-dialog").open, get("reply-target-submit").disabled];
        dialog.status("error", "error"); dialog.reset();
        return { post, thread, hidden, opened, closed, reset: [get("reply-target-url").value, get("reply-target-status").hidden, get("reply-target-status").dataset.tone || ""] };
      });
      expect(result).toEqual({ post: ["<b>Other</b>", "@other.test", "<b>reply</b>", true, 0],
        thread: ["Own", "root", false, "block"], hidden: true,
        opened: [true, "https://example.org"], closed: [false, false], reset: ["", true, ""] });
    }
    expect(errors).toEqual([]);
  });
  test("Composer image conversion and provider routing work in the browser on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-link-card-providers.js");
        const cards = await import("/js/shared/shared-link-cards.js");
        const { translations } = await import("/js/core/app-translations.js");
        const image = await module.fetchComposerLinkCardImage("https://image.example/a.png", {
          fetch: async () => new Response(new Blob(["a"], { type: "image/png" })),
          fileToDataUrl: (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }), translate: (key) => translations.en[key],
        });
        const calls = [];
        const results = [];
        for (const provider of ["proxy", "micro", "none"]) {
          results.push(await module.requestComposerLinkCard("https://example.org/path", {
            getProvider: () => provider, providers: { proxy: "proxy", microlink: "micro" },
            proxy: async () => { calls.push("proxy"); return { title: "proxy" }; },
            microlink: async () => { calls.push("micro"); return { title: "micro" }; },
            basic: (url) => { calls.push("basic"); return cards.buildBasicLinkCard(url, (card) => card); },
          }));
        }
        let failure = "";
        try {
          await module.fetchComposerLinkCardImage("data:image/png;base64,YQ==", { translate: (key) => translations.en[key] });
        } catch (error) { failure = error.message; }
        return { image, calls, titles: results.map((card) => card.title), failure };
      });
      expect(result).toEqual({ image: { imageDataUrl: "data:image/png;base64,YQ==", imageMimeType: "image/png" },
        calls: ["proxy", "micro", "basic"], titles: ["proxy", "micro", "example.org"],
        failure: "The link-card image has no valid HTTP address." });
    }
    expect(errors).toEqual([]);
  });
  test("Composer provider adapters use browser crypto and explicit request dependencies on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-link-card-providers.js");
        let headers;
        const proxy = await module.requestComposerLinkCardFromProxy("https://target.example", {
          endpoint: "https://proxy.example", secret: "key", now: () => 1000000, randomUUID: () => "nonce",
          sign: (url, timestamp, nonce, secret) => module.signComposerLinkCardRequest(url, timestamp, nonce, secret, crypto.subtle),
          fetch: async (_url, request) => { headers = request.headers; return new Response(JSON.stringify({ title: "Proxy", image: { bytesBase64: "YQ==", mimeType: "image/png" } })); },
          normalize: (card) => card, imageToDataUrl: module.composerLinkCardImageToDataUrl,
        });
        let usage = 0;
        const micro = await module.requestComposerLinkCardFromMicrolink("https://target.example", {
          fetch: async () => new Response(JSON.stringify({ data: { title: "Micro", image: "https://image.example" } })),
          recordUsage: async () => { usage += 1; }, failedMessage: "failed", normalize: (card) => card,
          fetchImage: async () => ({ imageDataUrl: "data:image/png;base64,YQ==", imageMimeType: "image/png" }),
        });
        return { proxy: [proxy.title, proxy.imageDataUrl], micro: [micro.title, micro.imageMimeType], usage,
          timestamp: headers["x-threadline-timestamp"], nonce: headers["x-threadline-nonce"], signature: headers["x-threadline-signature"] };
      });
      expect(result.proxy).toEqual(["Proxy", "data:image/png;base64,YQ=="]);
      expect(result.micro).toEqual(["Micro", "image/png"]);
      expect(result.usage).toBe(1);
      expect(result.timestamp).toBe("1000");
      expect(result.nonce).toBe("nonce");
      expect(result.signature).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(errors).toEqual([]);
  });
  test("Composer proxy settings preserve browser validity and feedback on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-link-card-providers.js");
        const endpoint = document.querySelector("#link-card-endpoint-input");
        const secret = document.querySelector("#link-card-secret-input");
        const status = document.querySelector("#link-card-settings-status");
        let syncs = 0;
        const controller = module.createComposerProxySettingsController({ endpoint, secret, status }, {
          translate: (key) => key, syncProvider: () => { syncs += 1; },
        });
        endpoint.value = "https://example.org/wrong";
        secret.value = " secret ";
        controller.updateStatus();
        const invalid = [endpoint.validity.customError, status.hidden, status.textContent, status.dataset.tone];
        endpoint.value = "example.org/wp-json/threadline/v1/link-card";
        controller.normalizeInputs();
        controller.updateStatus();
        const valid = [endpoint.validity.customError, endpoint.value, status.hidden, status.textContent, status.dataset.tone || "", controller.isConfigured()];
        controller.updateStatus({ show: false });
        const hidden = status.hidden;
        secret.value = "";
        controller.updateStatus();
        const incomplete = [endpoint.validity.customError, status.hidden, controller.isConfigured()];
        return { invalid, valid, hidden, incomplete, syncs, settings: controller.settings() };
      });
      expect(result).toEqual({ invalid: [true, false, "linkCardProxyUnexpectedEndpoint", "error"],
        valid: [false, "https://example.org/wp-json/threadline/v1/link-card", false, "linkCardSettingsSaved", "", true],
        hidden: true, incomplete: [false, true, false], syncs: 4,
        settings: { endpoint: "https://example.org/wp-json/threadline/v1/link-card", secret: "" } });
    }
    expect(errors).toEqual([]);
  });
  test("Composer provider presentation updates existing controls on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-link-card-providers.js");
        const elements = { noneWrap: document.querySelector("#link-card-provider-none-wrap"),
          proxyWrap: document.querySelector("#link-card-provider-proxy-wrap"),
          noneInput: document.querySelector("#link-card-provider-none"),
          microlinkInput: document.querySelector("#link-card-provider-microlink"),
          proxyInput: document.querySelector("#link-card-provider-proxy"),
          settingsNote: document.querySelector("#link-card-provider-note"),
          dialogNote: document.querySelector("#link-card-provider-state") };
        let provider = "proxy";
        let configured = false;
        let action = "create";
        let saves = 0;
        const controller = module.createComposerProviderPresentationController(elements, {
          providers: { none: "none", microlink: "micro", proxy: "proxy" },
          getProvider: () => provider, setProvider: (value) => { provider = value; },
          getActiveProvider: () => provider, normalizeProvider: (value) => value,
          isProxyConfigured: () => configured, getAction: () => action,
          getUsage: () => ({ count: 25 }), limit: 25,
          translate: (key, values) => `${key}:${JSON.stringify(values || {})}`,
          persist: async () => { saves += 1; },
        });
        controller.sync();
        const fallback = [provider, elements.noneInput.checked, elements.proxyWrap.hidden, elements.proxyInput.disabled];
        configured = true;
        provider = "proxy";
        controller.sync({ persist: true });
        const proxy = [elements.proxyInput.checked, elements.noneInput.checked, elements.proxyWrap.hidden, elements.proxyInput.disabled];
        provider = "micro";
        controller.sync();
        const micro = [elements.microlinkInput.checked, elements.proxyInput.checked, elements.settingsNote.textContent, elements.dialogNote.textContent];
        action = "manage";
        controller.updateDialog();
        const hidden = [elements.dialogNote.hidden, elements.dialogNote.textContent];
        action = "refresh";
        controller.updateDialog();
        return { fallback, proxy, micro, hidden, restored: !elements.dialogNote.hidden, saves };
      });
      expect(result).toEqual({ fallback: ["none", true, true, true], proxy: [true, false, false, false],
        micro: [true, false, 'linkCardMicrolinkUsageNote:{"count":25,"limit":25,"remaining":0}', 'linkCardDialogMicrolinkNote:{"usage":"25/25","limit":25}'],
        hidden: [true, ""], restored: true, saves: 1 });
    }
    expect(errors).toEqual([]);
  });
  test("Composer link-card dialog lifecycle switches action views on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const module = await import("/js/composer/composer-link-cards.js");
        const dialog = document.querySelector("#link-card-dialog");
        const elements = { dialog, title: dialog.querySelector("h2"),
          description: document.querySelector("#link-card-url"), urlField: document.querySelector("#link-card-url-field"),
          input: document.querySelector("#link-card-url-input"), targetField: document.querySelector("#link-card-target-list-field"),
          targetList: document.querySelector("#link-card-target-list"), warning: document.querySelector("#link-card-warning"),
          status: document.querySelector("#link-card-status"), submit: document.querySelector("#link-card-create-button") };
        const calls = [];
        const timers = [];
        const controller = module.createComposerLinkCardDialogController(elements, {
          translate: (key) => key, renderTargets: (index) => calls.push(index), updateProvider: () => {},
          setTimeout: (callback) => { timers.push(callback); },
        });
        const views = [];
        for (const action of ["manage", "move", "refresh", "create"]) {
          elements.status.dataset.tone = "error";
          controller.open({ segmentIndex: 0, sourceSegmentIndex: 1, url: "https://example.org", action, hasImages: action === "refresh" });
          for (const callback of timers.splice(0)) { callback(); }
          views.push([dialog.open, elements.urlField.hidden, elements.targetField.hidden, elements.submit.hidden,
            elements.submit.textContent, elements.warning.hidden, elements.status.dataset.tone || ""]);
          if (action === "create") {
            views.push([document.activeElement === elements.input, elements.input.selectionStart, elements.input.selectionEnd]);
          }
          controller.close();
        }
        controller.close();
        return { views, calls, closed: [dialog.open, elements.input.value, elements.targetField.hidden, elements.targetList.childElementCount] };
      });
      expect(result.views[0].slice(0, 4)).toEqual([true, true, false, true]);
      expect(result.views.slice(1, 4)).toEqual([
        [true, true, true, false, "linkCardMoveButton", true, ""],
        [true, false, true, false, "linkCardCreateAndRemoveImagesButton", false, ""],
        [true, false, true, false, "linkCardCreateButton", true, ""],
      ]);
      expect(result.views[4]).toEqual([true, 0, "https://example.org".length]);
      expect(result.calls).toEqual([0]);
      expect(result.closed).toEqual([false, "", true, 0]);
    }
    expect(errors).toEqual([]);
  });
  test("Composer link-card target templates render safe labels and actions on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const cards = await import("/js/composer/composer-link-cards.js");
        const list = document.createElement("div");
        const note = document.createElement("p");
        const elements = { list, note,
          template: document.querySelector("#link-card-target-template"),
          emptyTemplate: document.querySelector("#link-card-target-empty-template") };
        const actions = [];
        const options = { translate: (key) => key, clone: (template) => template.content.cloneNode(true),
          formatUrl: (url) => url, applyAction: async (...args) => { actions.push(args); } };
        cards.renderComposerLinkCardTargets(0, [], elements, options);
        const empty = [list.querySelectorAll(".settings-note").length, list.textContent.trim()];
        cards.renderComposerLinkCardTargets(0, [
          { segmentIndex: 1, action: "move", card: null, textPreview: "<img src=x onerror=alert(1)>" },
          { segmentIndex: 2, action: "swap", card: { title: "<b>Title</b>", url: "https://example.org" } },
          { segmentIndex: 3, action: "move", card: null, textPreview: "" },
        ], elements, options);
        const labels = [...list.querySelectorAll(".link-card-target-action")].map((button) => button.textContent);
        const previews = [...list.querySelectorAll(".link-card-target-meta")].map((meta) => meta.textContent);
        const indices = [...list.querySelectorAll(".link-card-target-item")].map((item) => item.dataset.segmentIndex);
        list.querySelectorAll("button")[1].click();
        await Promise.resolve();
        cards.renderComposerLinkCardTargets(0, [], { ...elements, list: null }, options);
        return { empty, labels, previews, indices, actions, unsafeNodes: list.querySelectorAll("img,b").length };
      });
      expect(result).toEqual({ empty: [1, "linkCardManageNoTargets"],
        labels: ["linkCardMoveAction", "linkCardSwapAction", "linkCardMoveAction"],
        previews: ["<img src=x onerror=alert(1)>", "<b>Title</b> · https://example.org", "linkCardManageEmptySegment"],
        indices: ["1", "2", "3"], actions: [[0, 2]], unsafeNodes: 0 });
    }
    expect(errors).toEqual([]);
  });
  test("Composer clipboard wiring and scheduled UI updates work on both pages", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    for (const pathname of ["/", "/tools.html"]) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const composer = await import("/js/composer/composer-page.js");
        const rendering = await import("/js/composer/composer-segment-rendering.js");
        const source = document.querySelector("#source-text");
        source.value = "AB";
        source.setSelectionRange(1, 1);
        const clipboard = new DataTransfer();
        clipboard.setData("text/plain", "😀");
        const paste = new ClipboardEvent("paste", { clipboardData: clipboard, bubbles: true, cancelable: true });
        source.dispatchEvent(paste);
        const afterPaste = [source.value, source.selectionStart, paste.defaultPrevented];
        source.dispatchEvent(new Event("input", { bubbles: true }));
        const drop = new InputEvent("beforeinput", { inputType: "insertFromDrop", data: "X", bubbles: true, cancelable: true });
        source.dispatchEvent(drop);
        const afterDrop = [source.value, source.selectionStart, drop.defaultPrevented];
        source.dispatchEvent(new Event("input", { bubbles: true }));
        source.value = "normal edit";
        source.dispatchEvent(new Event("input", { bubbles: true }));
        const note = document.createElement("p");
        document.body.appendChild(note);
        const warnings = composer.createComposerInputWarningController({
          source, note, limit: 4, count: (text) => text.length, getLocale: () => "en",
          isTruncated: () => false, translate: (key) => key,
        });
        warnings.update();
        const overflow = [note.hidden, note.textContent, note.dataset.tone];
        source.value = "ok";
        warnings.update();
        const cleared = [note.hidden, note.textContent, note.dataset.tone || ""];
        note.remove();
        const updates = [];
        const scheduler = rendering.createComposerRenderScheduler({
          render: (options) => updates.push(["render", options.preserveView]),
          resize: () => updates.push(["resize"]),
          setTimeout: (callback, delay) => window.setTimeout(callback, delay),
          clearTimeout: (id) => window.clearTimeout(id),
          requestFrame: (callback) => requestAnimationFrame(callback),
          cancelFrame: (id) => cancelAnimationFrame(id),
        });
        scheduler.render(1000);
        scheduler.render();
        scheduler.resize();
        scheduler.resize();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { afterPaste, afterDrop, overflow, cleared, updates };
      });
      expect(result).toEqual({
        afterPaste: ["A😀B", 3, true], afterDrop: ["A😀XB", 4, true],
        overflow: [false, "composerTextTooLong", "error"], cleared: [true, "", ""],
        updates: [["render", true], ["resize"]],
      });
      await expect(page.locator(".segment-text").first()).toHaveValue("ok");
    }
    expect(errors).toEqual([]);
  });
});

test("Composer input and length presentation preserve Unicode selection and warning states", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await blockExternalRequests(page);
  for (const pathname of ["/", "/tools.html"]) {
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(async () => {
      const main = await import("/js/composer/composer-main.js");
      const composer = await import("/js/composer/composer-page.js");
      const rendering = await import("/js/composer/composer-segment-rendering.js");
      const validation = await import("/js/composer/composer-validation.js");
      const source = document.createElement("textarea");
      source.value = "A😀B";
      source.setSelectionRange(1, 3);
      const family = "👨‍👩‍👧‍👦";
      let alerts = 0;
      let suppressed = 0;
      let saves = 0;
      let pending = false;
      let truncated = false;
      let locked = true;
      let posted = true;
      const input = composer.createComposerInputController(source, {
        clamp: main.clampComposerTextLength,
        count: main.countComposerGraphemes,
        split: main.splitComposerGraphemes,
        limit: 4,
        setTruncated: (value) => { truncated = value; },
        updateWarning: () => {},
        clearOverrides: () => {},
        setLocked: (value) => { locked = value; },
        setPosted: (value) => { posted = value; },
        scheduleRender: () => {},
        delayMs: 1000,
        saveDraft: () => { saves += 1; },
        showAlert: () => { alerts += 1; },
        setWarningPending: (value) => { pending = value; },
        suppressInput: () => { suppressed += 1; },
      });
      input.insert(`${family}\r\nX`, true);
      const insertion = [source.value, source.selectionStart, source.selectionEnd, alerts, suppressed, saves, pending];
      source.value = family.repeat(5);
      input.process(true);
      const processing = [main.countComposerGraphemes(source.value), truncated, locked, posted, saves];
      const warning = document.createElement("p");
      const length = document.createElement("span");
      const note = document.createElement("p");
      const presentation = rendering.createComposerLengthPresentationController({
        getDiagnostics: (text) => validation.getComposerSegmentLengthDiagnostics(text, {
          getMetrics: main.getComposerPostTextMetrics,
          graphemeLimit: 300, byteLimit: 3000,
          hasEmoji: () => false, hasCjk: () => false,
        }),
        formatLabel: (diagnostics) => String(diagnostics.graphemeCount),
        translate: (key) => key,
        graphemeLimit: 300, byteLimit: 3000, warning,
      });
      presentation.segment(length, note, "a".repeat(301));
      presentation.thread(["a".repeat(301)]);
      const overflow = [length.textContent, length.dataset.tone, note.hidden, note.dataset.tone, warning.hidden, warning.dataset.tone];
      presentation.segment(length, note, "short");
      presentation.thread([]);
      const normal = [length.textContent, length.dataset.tone, note.hidden, warning.hidden, warning.dataset.tone];
      presentation.segment(null, null, "short");
      return { insertion, processing, overflow, normal };
    });
    const family = "👨‍👩‍👧‍👦";
    expect(result).toEqual({
      insertion: [`A${family}\nB`, 1 + family.length + 1, 1 + family.length + 1, 1, 1, 1, false],
      processing: [4, true, false, false, 2],
      overflow: ["301", "error", false, "error", false, "error"],
      normal: ["5", "neutral", true, true, "neutral"],
    });
  }
  expect(errors).toEqual([]);
});

test("Composer mention templates render actions and reject stale resolutions on both pages", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  await blockExternalRequests(page);
  for (const pathname of ["/", "/tools.html"]) {
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(async () => {
      const mentions = await import("/js/composer/composer-mentions.js");
      const dialog = document.createElement("dialog");
      const input = document.createElement("input");
      const title = document.createElement("h2");
      const note = document.createElement("p");
      dialog.append(title, note, input);
      document.body.appendChild(dialog);
      mentions.prepareComposerMentionSearchDialog({ dialog, input, title, note }, "known.example", "review", (key) => key);
      const review = [dialog.open, title.textContent, note.textContent, input.value, document.activeElement === input];
      dialog.close();
      mentions.prepareComposerMentionSearchDialog({ dialog, input, title, note }, "other.example", "repair", (key) => key);
      const repair = [title.textContent, note.textContent, input.value];
      let resetCount = 0;
      const dialogActions = mentions.createComposerMentionSearchActions({ dialog, input, title, note }, {
        translate: (key) => key,
        resetPicker: () => {},
        resetSearchState: () => { resetCount += 1; },
      });
      dialogActions.close();
      const closedDialog = [dialog.open, input.value, resetCount, title.textContent];
      dialog.remove();
      const templates = {};
      for (const name of ["label", "resolved", "unresolved", "sync"]) {
        templates[name] = document.querySelector(`#segment-mention-${name}-template`);
      }
      const container = document.createElement("div");
      document.body.appendChild(container);
      const actions = [];
      let version = 1;
      const timers = new Map();
      let nextTimer = 0;
      const requests = [];
      const options = {
        templates,
        translate: (key) => key,
        async resolve(handles) {
          requests.push(handles);
          return new Map([["known.example", "did:plc:known"]]);
        },
        getVersion: () => version,
        profileUrl: (handle, did) => `https://bsky.app/profile/${did}`,
        suggest: () => "known.example",
        applyTranslatedTitle: (element, key) => { element.title = key; },
        openSearch: (...args) => actions.push(args),
        getPending: () => [{ fromHandle: "old.example", toHandle: "known.example" }],
        applySync: (...args) => actions.push(args),
        setTimeout(callback) {
          const id = ++nextTimer;
          timers.set(id, callback);
          return id;
        },
        clearTimeout: (id) => timers.delete(id),
        delayMs: 250,
      };
      const display = mentions.createComposerMentionDisplayController(options);
      await display.render(2, container, "@known.example @unknown.example", version);
      const chips = container.querySelectorAll(".segment-mention-chip").length;
      const href = container.querySelector("a").href;
      container.querySelector(".segment-mention-chip-body-button").click();
      container.querySelector(".segment-mention-chip-warning").click();
      container.querySelector(".segment-mention-sync-button").click();
      const empty = document.createElement("div");
      await display.render(2, empty, "no mention", version);
      display.schedule(2, container, "@obsolete.example");
      display.schedule(2, container, "@latest.example");
      const timerCount = timers.size;
      for (const callback of timers.values()) {
        callback();
      }
      await Promise.resolve();
      await Promise.resolve();
      let complete;
      const lateDisplay = mentions.createComposerMentionDisplayController({
        ...options,
        resolve: () => new Promise((resolve) => { complete = resolve; }),
      });
      const pending = lateDisplay.render(2, container, "@known.example", version);
      version += 1;
      complete(new Map([["known.example", "did:plc:known"]]));
      await pending;
      const search = document.createElement("div");
      mentions.renderComposerMentionSearchResults([{ handle: "known.example", displayName: "<b>Plain text</b>", followingViewer: true }], {
        container: search,
        template: document.querySelector("#mention-search-result-template"),
        cloneTemplateContent: (template) => template.content.cloneNode(true),
        setAvatarImage: () => {},
        translate: (key) => key,
        onSelect: (actor) => actions.push(actor.handle),
      });
      search.querySelector("button").click();
      const searchName = search.querySelector("strong").textContent;
      const relation = search.querySelector("small").textContent;
      mentions.renderComposerMentionSearchResults(null, {
        container: search,
      });
      return { review, repair, closedDialog, chips, href, actions, emptyHidden: empty.hidden, timerCount,
        lastRequest: requests.at(-1), staleHidden: container.hidden,
        staleChildren: container.children.length, searchName, relation,
        emptySearch: search.children.length };
    });
    expect(result).toEqual({
      review: [true, "mentionSearchDialogReviewTitle", "mentionSearchDialogReviewNote", "known.example", true],
      repair: ["mentionSearchDialogTitle", "mentionSearchDialogNote", "other.example"],
      closedDialog: [false, "", 1, "mentionSearchDialogTitle"],
      chips: 2,
      href: "https://bsky.app/profile/did:plc:known",
      actions: [[2, "known.example", "review"], [2, "unknown.example", "repair"], [2, "old.example", "known.example"], "known.example"],
      emptyHidden: true,
      timerCount: 1,
      lastRequest: ["latest.example"],
      staleHidden: true,
      staleChildren: 0,
      searchName: "<b>Plain text</b>",
      relation: "mentionSearchRelationYouFollow",
      emptySearch: 0,
    });
  }
  expect(errors).toEqual([]);
});

/**
 * Blocks remote resources so browser module tests only use the local static test server.
 * @param {import("@playwright/test").Page} page - Browser page used for the test.
 * @returns {Promise<void>} Resolves when the request route is installed.
 */
async function blockExternalRequests(page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }

    await route.abort();
  });
}

/**
 * Opens the Composer page with external traffic blocked.
 * @param {import("@playwright/test").Page} page - Browser page used for the test.
 * @returns {Promise<void>} Resolves once the local page is ready.
 */
async function openApp(page) {
  await blockExternalRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
}

test("application bootstrap completes without runtime errors", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await openApp(page);
  await expect(page.locator("body")).toHaveAttribute("data-page", "composer");
  await expect.poll(() => pageErrors).toEqual([]);
});

test("core page modules load together and preserve page-local workspace rules", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const navigation = await import("/js/core/app-navigation.js");
    const shell = await import("/js/core/app-shell.js");
    const i18n = await import("/js/core/app-i18n.js");
    const toolsPage = await import("/js/tools/tools-page.js");
    const utils = await import("/js/core/app-utils.js");
    const templates = await import("/js/shared/shared-templates.js");
    const dmArchive = await import("/js/tools/dm-archive.js");
    const storageValues = new Map();
    const storage = {
      getItem(key) { return storageValues.get(key) || null; },
      setItem(key, value) { storageValues.set(key, String(value)); },
      removeItem(key) { storageValues.delete(key); },
    };
    const target = document.createElement("span");
    utils.setSafeText(target, "safe text");
    utils.setAttr(target, "data-test", "ok");
    const fragment = utils.cloneTemplate("segment-template");
    const directFragment = templates.cloneTemplateContent(document.querySelector("#segment-template"));
    let selectedParticipantDids = [];
    const dmContactList = document.createElement("div");
    const dmSelectionNote = document.createElement("p");
    const dmSummary = document.createElement("div");
    const dmResults = document.createElement("div");
    const dmRenderer = dmArchive.createDmArchiveWorkspaceRenderer({
      launchPanel: document.createElement("div"),
      contactSearchInput: document.createElement("input"),
      contactList: dmContactList,
      contactSearchNote: document.createElement("p"),
      contactSelectionNote: dmSelectionNote,
      summary: dmSummary,
      results: dmResults,
      checkButton: document.createElement("button"),
      loadPartnersButton: document.createElement("button"),
      loadButton: document.createElement("button"),
      exportJsonButton: document.createElement("button"),
      exportHtmlButton: document.createElement("button"),
      exportPdfButton: document.createElement("button"),
      summaryItemTemplate: document.querySelector("#dm-summary-item-template"),
      contactItemTemplate: document.querySelector("#dm-contact-item-template"),
      resultItemTemplate: document.querySelector("#dm-result-item-template"),
    }, {
      getState() {
        return {
          catalog: {
            manifest: { conversationCount: 1, messageCount: 2, participantCount: 2 },
            conversations: [{ id: "conversation", messageCount: 2, title: "Test conversation" }],
          },
          recentContacts: [{ did: "did:plc:alice", handle: "alice.test", displayName: "Alice", avatar: "https://cdn.example/alice.jpg" }],
          recentContactAssets: [],
          selectedParticipantDids,
        };
      },
      setSelectedParticipantDids(nextSelection) {
        selectedParticipantDids = nextSelection;
      },
      renderWorkspace() {
        dmRenderer.renderWorkspace();
      },
      translate(key, values = {}) {
        if (key === "dmConversationMeta") {
          return `${values.messages} messages`;
        }
        return key;
      },
      getLocale() {
        return "en";
      },
      assetToDataUri() {
        return "";
      },
      setAvatarImage(image, source, fallback) {
        image.alt = fallback;
        image.src = source;
      },
      getConversationTitle(conversation) {
        return conversation.title;
      },
      formatTimestamp() {
        return "now";
      },
      setContactSearchNote() {},
      setElementVisibility() {},
      isAccessAvailable() {
        return true;
      },
      getAuthAccount() {
        return { did: "did:plc:self" };
      },
      cloneTemplateContent: templates.cloneTemplateContent,
    });
    dmRenderer.renderWorkspace();
    const dmContactAvatar = dmContactList.querySelector(".dm-contact-avatar");
    const dmContactButton = dmContactList.querySelector(".dm-contact-chip");
    dmContactList.querySelector("button").click();
    const calls = [];
    const opened = toolsPage.openToolsWorkspace("search", {
      search() { calls.push("search"); },
    });
    const stored = toolsPage.persistToolsWorkspacePreference(storage, "primary", "legacy", "search");

    return {
      composerHref: navigation.getThreadlinePageHref("composer"),
      toolsHref: navigation.getThreadlinePageHref("tools"),
      composerWorkspace: shell.normalizeWorkspaceForCurrentPage("search"),
      englishLocaleHasComposerLabel: Boolean(i18n.getTranslationsForLocale("unknown").pageSwitchComposer),
      safeText: target.textContent,
      safeAttribute: target.getAttribute("data-test"),
      fragmentExists: Boolean(fragment),
      directFragmentExists: Boolean(directFragment),
      dmSummaryItems: dmSummary.children.length,
      dmPreviewItems: dmResults.querySelectorAll("article").length,
      dmContactAvatarSource: dmContactAvatar?.src || "",
      dmContactButtonTitle: dmContactButton?.getAttribute("title") || "",
      dmContactButtonLabel: dmContactButton?.getAttribute("aria-label") || "",
      dmSelectedParticipantDids: selectedParticipantDids,
      opened,
      calls,
      stored,
      storedWorkspace: toolsPage.readToolsWorkspacePreference(storage, "primary", "legacy"),
    };
  });

  expect(result).toEqual({
    composerHref: "./",
    toolsHref: "./tools.html",
    composerWorkspace: "composer",
    englishLocaleHasComposerLabel: true,
    safeText: "safe text",
    safeAttribute: "ok",
    fragmentExists: true,
    directFragmentExists: true,
    dmSummaryItems: 3,
    dmPreviewItems: 1,
    dmContactAvatarSource: "https://cdn.example/alice.jpg",
    dmContactButtonTitle: "",
    dmContactButtonLabel: "Alice @alice.test",
    dmSelectedParticipantDids: ["did:plc:alice"],
    opened: true,
    calls: ["search"],
    stored: true,
    storedWorkspace: "search",
  });
});

test("browser-bound shared modules create safe avatar and version behavior", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const accounts = await import("/js/shared/shared-accounts.js");
    const bootstrap = await import("/js/core/app-bootstrap.js");
    const image = document.createElement("img");
    accounts.setAvatarImage(image, "", "Alice");
    const version = await bootstrap.fetchVersionInfo();

    return {
      avatarAlt: image.alt,
      hasFallbackAvatar: image.src.startsWith("data:image/svg+xml"),
      versionSignature: bootstrap.versionSignature(version),
      versionMatchesPreload: version.appVersion === bootstrap.CURRENT_VERSION_INFO.appVersion,
    };
  });

  expect(result.avatarAlt).toBe("Alice");
  expect(result.hasFallbackAvatar).toBe(true);
  expect(result.versionSignature).toContain("|");
  expect(result.versionMatchesPreload).toBe(true);
});

test("Thread Explorer card interaction controller keeps header and footer actions separate", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const explorer = await import("/js/tools/thread-explorer.js");
    const post = { uri: "at://did:plc:alice/app.bsky.feed.post/one" };
    const actionCalls = [];
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    editButton.className = "thread-explorer-edit-button";
    editButton.hidden = true;
    actions.append(editButton);
    const headButtons = document.createElement("div");
    const anchor = document.createElement("a");
    headButtons.append(anchor);
    const controller = explorer.createThreadExplorerCardInteractionController({
      buildInteractionModel(value, options) {
        const isLiked = options.isLiked(value);
        return {
          canReply: true,
          canLike: true,
          isLiked,
          isLikePending: false,
          likeTranslationKey: isLiked ? "threadExplorerUnlikeAction" : "threadExplorerLikeAction",
        };
      },
      createButton(key, options) {
        const button = document.createElement("button");
        button.dataset.key = key;
        button.addEventListener("click", options.onClick);
        return button;
      },
      isLikePending() {
        return false;
      },
      isLiked(value) {
        return value.uri.endsWith("liked");
      },
      openComposerReply(value) {
        actionCalls.push(`reply:${value.uri}`);
      },
      toggleLike(value) {
        actionCalls.push(`like:${value.uri}`);
        return Promise.resolve();
      },
    });

    controller.renderInteractionActions(post, actions, headButtons, anchor);
    const footerActions = actions.querySelector(".thread-explorer-interaction-actions");
    const footerBeforeEdit = actions.firstElementChild === footerActions;
    footerActions.querySelectorAll("button")[0].click();
    footerActions.querySelectorAll("button")[1].click();

    const likedPost = { uri: "at://did:plc:alice/app.bsky.feed.post/liked" };
    controller.renderInteractionActions(likedPost, actions, headButtons, anchor);
    const likedActionKey = actions.querySelector(".thread-explorer-interaction-actions button:nth-child(2)")?.dataset.key || "";

    controller.renderInteractionActions(post, actions, headButtons, anchor, {
      renderInHeader: true,
    });

    return {
      footerBeforeEdit,
      footerActionCount: footerActions.querySelectorAll("button").length,
      headerActionCount: headButtons.querySelectorAll(".thread-explorer-interaction-actions button").length,
      footerVisibleWithHeaderActions: !actions.hidden,
      likedActionKey,
      actionCalls,
    };
  });

  expect(result.footerBeforeEdit).toBe(true);
  expect(result.footerActionCount).toBe(2);
  expect(result.headerActionCount).toBe(2);
  expect(result.footerVisibleWithHeaderActions).toBe(false);
  expect(result.likedActionKey).toBe("threadExplorerUnlikeAction");
  expect(result.actionCalls).toEqual([
    "reply:at://did:plc:alice/app.bsky.feed.post/one",
    "like:at://did:plc:alice/app.bsky.feed.post/one",
  ]);
});

test("Thread Explorer card presentation controller renders metrics, links, and edit markers", async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const explorer = await import("/js/tools/thread-explorer.js");
    const calls = [];
    const post = {
      uri: "at://did:plc:alice/app.bsky.feed.post/one",
      cid: "bafytest",
    };
    const controller = explorer.createThreadExplorerCardPresentationController({
      translate(key, values = {}) {
        return `${key}:${values.count}`;
      },
      createMetricEntries() {
        return [
          { type: "Likes", count: 2, label: "2 Likes", isInteractive: true },
          { type: "Replies", count: 1, label: "1 Reply", isInteractive: true },
          { type: "Reposts", count: 0, label: "0 Reposts", isInteractive: false },
        ];
      },
      buildViewLinkModel() {
        return { url: "https://bsky.app/profile/alice.test/post/one", text: "↗" };
      },
      buildEditButtonModel() {
        return { isVisible: true, uri: post.uri };
      },
      applyTranslatedTitle(element, key) {
        element.dataset.titleKey = key;
      },
      handleRepliesCountClick(event) {
        calls.push(`replies:${event.currentTarget.dataset.uri}`);
      },
      handleCountClick(event) {
        calls.push(`count:${event.currentTarget.dataset.reactionType}`);
      },
      handleEditButtonClick(event) {
        calls.push(`edit:${event.currentTarget.dataset.uri}`);
      },
    });
    const counts = document.createElement("div");
    const link = document.createElement("a");
    const editButton = document.createElement("button");

    controller.renderCounts(post, counts);
    controller.renderViewLink(post, link);
    const editVisible = controller.renderEditButton(post, editButton);
    counts.querySelector(".thread-explorer-count-button").click();
    counts.querySelectorAll(".thread-explorer-count-button")[1].click();
    editButton.click();

    const noLink = document.createElement("a");
    const hiddenEdit = document.createElement("button");
    const hiddenController = explorer.createThreadExplorerCardPresentationController({
      buildViewLinkModel() {
        return null;
      },
      buildEditButtonModel() {
        return { isVisible: false, uri: "" };
      },
    });
    hiddenController.renderViewLink(post, noLink);
    const hiddenEditVisible = hiddenController.renderEditButton(post, hiddenEdit);

    return {
      metricLabels: Array.from(counts.children).map((element) => element.textContent),
      metricUri: counts.firstElementChild.dataset.uri,
      metricCid: counts.firstElementChild.dataset.cid,
      linkHref: link.href,
      linkText: link.textContent,
      linkTitleKey: link.dataset.titleKey,
      editVisible,
      editUri: editButton.dataset.uri,
      editTitleKey: editButton.dataset.titleKey,
      hiddenLink: noLink.hidden,
      hiddenEdit: hiddenEdit.hidden,
      hiddenEditVisible,
      calls,
    };
  });

  expect(result.metricLabels).toEqual(["2 Likes", "1 Reply", "0 Reposts"]);
  expect(result.metricUri).toBe("at://did:plc:alice/app.bsky.feed.post/one");
  expect(result.metricCid).toBe("bafytest");
  expect(result.linkHref).toBe("https://bsky.app/profile/alice.test/post/one");
  expect(result.linkText).toBe("↗");
  expect(result.linkTitleKey).toBe("threadExplorerViewInBskyButton");
  expect(result.editVisible).toBe(true);
  expect(result.editUri).toBe("at://did:plc:alice/app.bsky.feed.post/one");
  expect(result.editTitleKey).toBe("threadExplorerEditDetailsButton");
  expect(result.hiddenLink).toBe(true);
  expect(result.hiddenEdit).toBe(true);
  expect(result.hiddenEditVisible).toBe(false);
  expect(result.calls).toEqual([
    "count:Likes",
    "replies:at://did:plc:alice/app.bsky.feed.post/one",
    "edit:at://did:plc:alice/app.bsky.feed.post/one",
  ]);
});
