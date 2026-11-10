"use strict";

const { expect, test } = require("@playwright/test");

test.describe("Composer image editor application integration", () => {
  test.use({ serviceWorkers: "block" });
  for (const pathname of ["/", "/tools.html"]) {
    test(`fresh environment defers backup reminder until the first interval on ${pathname}`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await blockExternalRequests(page);
      await page.addInitScript(() => {
        const registration = { update: async () => {}, active: { postMessage(message, ports) {
          const result = message.type === "GET_APP_STATE" ? { localePreference: "en", locale: "en", desktopLayoutVersion: 2 } : null;
          ports[0].postMessage({ ok: true, result });
        } } };
        Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
        Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
      });
      await page.goto(pathname);
      const firstUseKey = "threadline:settings-backup-first-use-at";
      await expect.poll(() => page.evaluate(key => localStorage.getItem(key), firstUseKey)).not.toBeNull();
      const firstUse = await page.evaluate(key => localStorage.getItem(key), firstUseKey);
      await expect(page.locator("#backup-reminder-dialog")).not.toBeVisible();
      await page.reload();
      await expect(page.locator("#language-select")).toHaveValue("en");
      expect(await page.evaluate(key => localStorage.getItem(key), firstUseKey)).toBe(firstUse);
      await expect(page.locator("#backup-reminder-dialog")).not.toBeVisible();
      await page.evaluate(key => localStorage.setItem(key, String(Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000)), firstUseKey);
      await page.reload();
      await expect(page.locator("#backup-reminder-dialog")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
  test("analysis templates render safe summary, result and list components on both pages", async ({ page }) => {
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page); await page.setViewportSize({ width: 390, height: 900 });
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
      await page.goto(pathname, { waitUntil: "domcontentloaded" }); await expect(page.locator("#language-select")).toHaveValue("en");
      for (const compact of [false, true]) {
        const report = await page.evaluate(async (compact) => {
          document.body.classList.toggle("ui-density-compact", compact);
          const { createAnalysisRenderer } = await import("/js/tools/analysis-rendering.js");
          const { cloneTemplateContent } = await import("/js/shared/shared-templates.js");
          const templates = {};
          for (const name of ["note", "span", "tokens", "token", "stats", "stat", "bars", "bar", "pattern", "account", "result",
            "heatmap", "heatmap-grid", "axis", "heatmap-cell", "timeline", "timeline-tick", "timeline-row", "timeline-point",
            "profiles", "profile", "table", "table-head", "table-row", "temporal-comparison", "network-summary"]) {
            templates[name] = document.querySelector(`#analysis-${name}-template`);
          }
          const host = document.createElement("section");
          Object.assign(host.style, { position: "fixed", width: "360px", top: "0", left: "0", zIndex: "99999" });
          const summary = document.createElement("div"); const result = document.createElement("div");
          result.className = "analysis-result-card"; host.append(summary, result); document.body.append(host);
          const options = { cloneTemplate: cloneTemplateContent, setAvatar: (image, src, alt) => { image.alt = alt; },
            t: (key) => key, count: String, timestamp: String, number: (value) => String(value),
            percent: (value) => String(Math.round((Number(value) || 0) * 100)) + "%" };
          const temporal = document.createElement("div"); const metrics = document.createElement("div");
          const { createAnalysisTemporalAnalyzer } = await import("/js/tools/analysis-temporal.js");
          const { shareArray } = await import("/js/tools/analysis-similarity.js");
          const config = await import("/js/tools/analysis-config.js");
          const time = createAnalysisTemporalAnalyzer({ locale: () => "en", now: () => Date.parse("2026-10-14T12:00Z"), shares: shareArray,
            gapBuckets: config.ANALYSIS_TEMPORAL_GAP_BUCKETS, weekdayAnchors: config.ANALYSIS_WEEKDAY_ANCHORS, weekdayFallbacks: config.ANALYSIS_WEEKDAY_FALLBACKS });
          Object.assign(options, { weekday: time.weekdayLabel, hour: time.hourLabel, overlapHeatmap: time.overlapHeatmap,
            networkPatterns: config.ANALYSIS_NETWORK_PATTERNS, corpusPatterns: config.ANALYSIS_CORPUS_PATTERNS });
          const network = document.createElement("div"); const patterns = document.createElement("div");
          const renderer = createAnalysisRenderer({ templates, summary, result, temporal, metrics, network, patterns }, options);
          const hostile = "<img src=x onerror=window.analysisUnsafe=1>";
          const account = { profile: { did: "a", handle: "a.test", displayName: hostile }, filters: { rangeDays: 0 },
            posts: [], corpus: { wordCount: 42 }, stats: { pages: 1 } };
          renderer.summary(account, null); renderer.summary(account, null);
          const title = summary.querySelector("strong").textContent;
          const accountCount = summary.children.length;
          const empty = summary.children[1].textContent;
          renderer.result({ score: 92, labelKey: hostile, confidenceKey: "confidence", burrowsDelta: { delta: NaN } });
          renderer.result({ score: 93, labelKey: hostile, confidenceKey: "confidence", burrowsDelta: { delta: 0, similarity: 1 } });
          const score = result.querySelector(".analysis-result-score").textContent;
          const details = result.querySelectorAll(".analysis-result-details span").length;
          const tokens = renderer.tokens([{ label: hostile, share: 0.25 }]);
          const stats = renderer.stats([{ label: "text", value: "zero", formatter: "text" }, { labelKey: "number", value: 2, formatter: "number" }, { label: "share", share: 0.5 }]);
          const bars = renderer.bars([{ label: "high", share: 2 }, { label: "low", share: -1 }, { labelKey: "zero", value: 0 }]);
          host.append(renderer.pattern(hostile, [null, tokens, stats, bars]));
          const widths = [...bars.querySelectorAll(".analysis-bar-fill")].map((node) => node.style.width);
          const values = [...stats.querySelectorAll("strong")].map((node) => node.textContent);
          const bounds = host.getBoundingClientRect();
          const fits = [...host.querySelectorAll(".analysis-account-card, .analysis-bar-track")].every((node) => node.getBoundingClientRect().right <= bounds.right + 1);
          const safe = !window.analysisUnsafe && host.querySelectorAll("img").length === 1 && host.querySelectorAll("script").length === 0;
          const chipText = tokens.textContent;
          const invalidEmpty = renderer.stats(null).textContent;
          const profile = time.profile([{ createdAt: "2026-10-12T00:00Z" }, { createdAt: "2026-10-12T06:30Z" }]);
          const chart = renderer.heatmap(profile); const overlap = renderer.overlapHeatmap(profile, profile);
          const emptyOverlap = renderer.overlapHeatmap(null, null);
          const line = renderer.timeline({ recentDays: [{ label: "12.10", weekdayLabel: "Mon", hours: [-1, 0, 12, 25] }] });
          const ticks = [...line.querySelectorAll(".analysis-temporal-timeline-tick")].map((node) => node.style.left);
          const points = [...line.querySelectorAll(".analysis-temporal-timeline-point")].map((node) => node.style.left);
          const cells = [...chart.querySelectorAll(".analysis-temporal-heatmap-cell")].map((node) => node.style.getPropertyValue("--heat"));
          const charts = { cells: cells.length, finite: cells.every((value) => Number(value) >= 0.08 && Number(value) <= 1),
            overlap: overlap.querySelectorAll(".analysis-temporal-heatmap-cell-overlap").length,
            empty: emptyOverlap.childNodes.length, ticks, points, noTimeline: renderer.timeline(null).childNodes.length };
          const people = renderer.profiles([{ displayName: hostile, handle: " a.test ", deleted: true, share: 0.5 }, { did: "did:b", share: 0 }]);
          const profileReport = { names: [...people.querySelectorAll("strong")].map((node) => node.textContent),
            status: people.querySelectorAll(".analysis-profile-chip-status").length, handle: people.querySelector(".reply-target-handle").textContent,
            lazy: [...people.querySelectorAll("img")].every((node) => node.loading === "lazy"), empty: renderer.profiles(null).textContent };
          const metricRows = [{ labelKey: hostile, leftValue: 2, rightValue: 3, normalizedDifference: 2 }];
          renderer.metrics({ metricRows }); renderer.metrics({ metricRows });
          const metricReport = { rows: metrics.querySelectorAll("tbody tr").length, head: metrics.querySelectorAll("th").length,
            values: [...metrics.querySelectorAll("td")].map((node) => node.textContent), empty: "" };
          renderer.metrics(null); metricReport.empty = metrics.textContent;
          renderer.temporal(null, null, null); const emptyTemporal = temporal.textContent;
          renderer.temporal({ temporal: profile }, null, null); const partialCards = temporal.children.length;
          renderer.temporal({ temporal: profile }, { temporal: profile }, {}, [{ label: hostile, left: "A", right: "B", diff: "same" }]);
          renderer.temporal({ temporal: profile }, { temporal: profile }, {}, [{ label: hostile, left: "A", right: "B", diff: "same" }]);
          const temporalReport = { empty: emptyTemporal, partialCards, cards: temporal.children.length,
            comparisons: temporal.querySelectorAll(".analysis-temporal-comparison-card").length,
            rows: temporal.querySelectorAll("tbody tr").length, cells: temporal.querySelectorAll(".analysis-temporal-heatmap-cell").length };
          renderer.network(null, null, null); const networkEmpty = network.textContent;
          renderer.network(account, null, null, [], "analysisNetworkReloadNeeded"); const reloadNote = network.textContent;
          account.network = { warnings: [hostile, "second warning"] };
          account.markers = { topMentions: [{ displayName: hostile, did: "a", deleted: true, share: 0.5 }], mediaPostShare: 0.25 };
          const comparison = { relationshipSimilarity: 0.5, interactionSimilarity: 0.75, moderationSimilarity: null };
          const rows = [{ label: hostile, left: "A", right: "B", diff: "same" }];
          renderer.network(account, account, comparison, rows); renderer.network(account, account, comparison, rows);
          const networkReport = { empty: networkEmpty, reload: reloadNote, cards: network.querySelectorAll(".analysis-pattern-card").length,
            summaries: network.querySelectorAll(".analysis-account-card").length, rows: network.querySelectorAll("tbody tr").length,
            deleted: network.querySelectorAll(".analysis-profile-chip-status").length, warning: network.firstElementChild.lastElementChild.textContent,
            unavailable: network.firstElementChild.textContent.includes("analysisSimilarityModerationUnavailable") };
          comparison.moderationSimilarity = 0; renderer.network(account, account, comparison, rows);
          networkReport.available = !network.firstElementChild.textContent.includes("analysisSimilarityModerationUnavailable");
          renderer.patterns(null, null); const patternsEmpty = patterns.textContent;
          renderer.patterns(account, null); const partialEmpty = patterns.querySelectorAll(".analysis-pattern-card:nth-child(even) .settings-note");
          const patternReport = { empty: patternsEmpty, partialNotes: [...partialEmpty].every((node) => node.textContent === "analysisAccountBEmpty"),
            partialCards: patterns.children.length };
          renderer.patterns(account, account); renderer.patterns(account, account);
          patternReport.cards = patterns.children.length;
          patternReport.headings = [...patterns.querySelectorAll(".analysis-pattern-card > strong")].map((node) => node.textContent);
          patternReport.startsEndsLists = patterns.children[14].querySelectorAll(".analysis-token-list").length;
          patternReport.emojiEmpty = patterns.children[10].textContent.includes("analysisPatternsNoEmoji");
          host.append(network, patterns);
          host.append(chart, overlap, line, people, temporal, metrics);
          const chartBounds = chart.getBoundingClientRect();
          charts.fits = [...chart.querySelectorAll(".analysis-temporal-heatmap-cell")].every((node) => node.getBoundingClientRect().right <= chartBounds.right + 1);
          const extraSafe = !window.analysisUnsafe && !host.querySelector("script") && people.querySelectorAll("img").length === 2;
          renderer.result(null); const cleared = result.hidden && result.childNodes.length === 0;
          host.remove(); return { title, accountCount, empty, score, details, widths, values, fits, safe, chipText, invalidEmpty, cleared,
            charts, profileReport, metricReport, temporalReport, networkReport, patternReport, extraSafe };
        }, compact);
        expect(report.title).toBe("<img src=x onerror=window.analysisUnsafe=1>"); expect(report.accountCount).toBe(2);
        expect(report.empty).toBe("analysisAccountBEmpty"); expect(report.score).toBe("93/100"); expect(report.details).toBe(8);
        expect(report.widths).toEqual(["100%", "0%", "0%"]); expect(report.values).toEqual(["zero", "2", "50%"]);
        expect(report.fits).toBe(true); expect(report.safe).toBe(true); expect(report.chipText).toContain("25%");
        expect(report.invalidEmpty).toBe("analysisPatternsEmpty"); expect(report.cleared).toBe(true);
        expect(report.charts.cells).toBe(84); expect(report.charts.finite).toBe(true); expect(report.charts.overlap).toBe(84);
        expect(report.charts.empty).toBe(0); expect(report.charts.noTimeline).toBe(0); expect(report.charts.fits).toBe(true);
        expect(report.charts.ticks).toEqual(["0%", "25%", "50%", "75%", "100%"]);
        expect(report.charts.points).toEqual(["0%", "0%", "50%", "100%"]);
        expect(report.profileReport.names).toEqual(["<img src=x onerror=window.analysisUnsafe=1>", "did:b"]);
        expect(report.profileReport.status).toBe(1); expect(report.profileReport.handle).toBe("@a.test");
        expect(report.profileReport.lazy).toBe(true); expect(report.profileReport.empty).toBe("analysisPatternsNoData");
        expect(report.metricReport.rows).toBe(1); expect(report.metricReport.head).toBe(4);
        expect(report.metricReport.values).toEqual(["<img src=x onerror=window.analysisUnsafe=1>", "2", "3", "100%"]);
        expect(report.metricReport.empty).toBe("analysisMetricsEmpty"); expect(report.temporalReport.empty).toBe("analysisTemporalEmpty");
        expect(report.temporalReport.partialCards).toBe(2); expect(report.temporalReport.cards).toBe(3);
        expect(report.temporalReport.comparisons).toBe(1); expect(report.temporalReport.rows).toBe(1);
        expect(report.temporalReport.cells).toBe(252); expect(report.extraSafe).toBe(true);
        expect(report.networkReport.empty).toBe("analysisNetworkEmpty"); expect(report.networkReport.reload).toBe("analysisNetworkReloadNeeded");
        expect(report.networkReport.cards).toBe(14); expect(report.networkReport.summaries).toBe(1); expect(report.networkReport.rows).toBe(1);
        expect(report.networkReport.deleted).toBe(2); expect(report.networkReport.warning).toContain("<img src=x onerror=window.analysisUnsafe=1>");
        expect(report.networkReport.unavailable).toBe(true); expect(report.networkReport.available).toBe(true);
        expect(report.patternReport.empty).toBe("analysisPatternsEmpty"); expect(report.patternReport.partialCards).toBe(24);
        expect(report.patternReport.partialNotes).toBe(true); expect(report.patternReport.cards).toBe(24);
        expect(report.patternReport.headings[0]).toBe("analysisAccountALabel - analysisPatternWordsTitle");
        expect(report.patternReport.headings[23]).toBe("analysisAccountBLabel - analysisPatternStructureTitle");
        expect(report.patternReport.startsEndsLists).toBe(2); expect(report.patternReport.emojiEmpty).toBe(true);
      }
    }
    expect(errors).toEqual([]);
  });
  test("analysis calculation modules integrate account loading and comparison on both pages", async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      window.analysisLoads = [];
      const account = { did: "did:example:viewer", handle: "viewer.test", identifier: "viewer.test", service: "https://bsky.social" };
      const words = ["the", "and", "with", "this", "that", "from", "there", "when", "where", "which", "have", "will"];
      const posts = Array.from({ length: 8 }, (_, index) => ({
        text: Array.from({ length: 100 }, (_, offset) => words[(offset + index * offset) % words.length]).join(" ") + " #hello!",
        createdAt: new Date(Date.UTC(2026, 9, 1, 12, index * 10)).toISOString(),
      }));
      const registration = { update: async () => {}, active: { postMessage(message, ports) {
        let result = null;
        if (message.type === "GET_APP_STATE") {
          result = { ...account, accounts: [account], localePreference: "en", locale: "en", desktopLayoutVersion: 2,
            analysisState: JSON.parse(sessionStorage.getItem("test:analysis-state") || "null"),
            archivePreferences: JSON.parse(sessionStorage.getItem("test:archive-preferences") || "null") };
        }
        if (message.type === "SAVE_SETTINGS") {
          sessionStorage.setItem("test:analysis-state", JSON.stringify(message.payload.analysisState));
          sessionStorage.setItem("test:archive-preferences", JSON.stringify(message.payload.archivePreferences));
        }
        if (message.type === "VERIFY_SESSION") { result = { ...account, accounts: [account], authenticated: true }; }
        if (message.type === "CHECK_ANALYSIS_ACCOUNT") { result = { handle: message.payload.actor }; }
        if (message.type === "LOAD_ANALYSIS_ACCOUNT") {
          window.analysisLoads.push(message.payload);
          result = { profile: { did: message.payload.actor, handle: message.payload.actor, displayName: message.payload.actor }, posts,
            stats: { pages: 1 }, filters: message.payload.options,
            network: { followerDids: ["common"], followDids: ["common"], mutualDids: ["common"], loadState: "complete" },
            markers: { topHashtags: [{ label: "hello", count: 8 }], topLanguages: [{ label: "en", count: 8 }] } };
        }
        ports[0].postMessage({ ok: true, result });
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#analysis-button")).toBeEnabled();
    await page.locator("#analysis-button").click();
    await page.locator("#analysis-account-a-own-button").click();
    await expect(page.locator("#analysis-account-a-input")).toHaveValue("viewer.test");
    await page.locator("#analysis-account-b-own-button").click();
    await expect(page.locator("#analysis-account-b-input")).toHaveValue("viewer.test");
    for (const [slot, actor] of [["a", "alpha.test"], ["b", "beta.test"]]) {
      await page.locator(`#analysis-account-${slot}-input`).fill(actor);
      await page.locator(`#analysis-account-${slot}-load-button`).click();
      await expect(page.locator("#analysis-summary")).toContainText(actor);
      await expect(page.locator(`#analysis-account-${slot}-load-button`)).toBeEnabled();
    }
    await page.locator("#analysis-account-b-input").press("Enter");
    await expect(page.locator("#analysis-result-card")).toBeVisible();
    await expect(page.locator(".analysis-result-score")).toHaveText(/^\d+\/100$/);
    await expect(page.locator("#analysis-result-card .analysis-result-details span")).toHaveCount(8);
    await expect(page.locator("#analysis-export-pdf-button")).toBeEnabled();
    const result = await page.locator("#analysis-result-card").textContent();
    expect(result).not.toMatch(/NaN|undefined|Infinity/);
    expect(result).toContain("100");
    await expect(page.locator("#analysis-temporal .analysis-temporal-comparison-card")).toBeVisible();
    await expect(page.locator("#analysis-network tbody tr")).toHaveCount(13);
    await expect(page.locator("#analysis-network .analysis-pattern-card")).toHaveCount(14);
    await expect(page.locator("#analysis-patterns .analysis-pattern-card")).toHaveCount(24);
    expect(await page.evaluate(() => window.analysisLoads.map((load) => load.actor))).toEqual(["alpha.test", "beta.test", "alpha.test", "beta.test"]);
    const score = await page.locator(".analysis-result-score").textContent();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("test:analysis-state") || "null")?.comparison?.score)).toBe(Number(score.split("/")[0]));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#analysis-button")).toBeEnabled();
    await page.locator("#analysis-button").click();
    await expect(page.locator(".analysis-result-score")).toHaveText(score);
    await expect(page.locator("#analysis-summary")).toContainText("alpha.test");
    await expect(page.locator("#analysis-summary")).toContainText("beta.test");
    expect(await page.evaluate(() => window.analysisLoads)).toEqual([]);
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#analysis-export-pdf-button").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^threadline-analysis-alpha\.test-vs-beta\.test-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(await download.failure()).toBeNull();
    await download.saveAs(testInfo.outputPath("analysis-report.pdf"));
    const pdf = require("node:fs").readFileSync(await download.path());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10000);
    expect(pdf.toString("latin1")).toContain("%%EOF");
    await page.locator("#analysis-account-a-input").fill("changed.test");
    await expect(page.locator("#analysis-result-card")).toBeHidden();
    await expect(page.locator("#analysis-export-pdf-button")).toBeDisabled();
    await page.locator("#analysis-reset-button").click();
    await expect(page.locator("#analysis-result-card")).toBeHidden();
    await page.locator("#archive-button").click();
    await page.evaluate(() => {
      document.querySelector("#archive-from-input").value = "2026-01-31";
      document.querySelector("#archive-to-input").value = "2026-04-01";
      document.querySelector("#archive-from-input").dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("#archive-to-input")).toHaveAttribute("max", "2026-04-30");
    await expect(page.locator("#archive-to-input")).toHaveAttribute("min", "2026-01-31");
    await page.locator("#archive-content-mode-select").selectOption("threads");
    await page.locator("#archive-image-size-select").selectOption("large");
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("test:archive-preferences") || "null")?.pdfOptions?.imageSize)).toBe("large");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#archive-button")).toBeEnabled();
    await page.locator("#archive-button").click();
    await expect(page.locator("#archive-from-input")).toHaveValue("2026-01-31");
    await expect(page.locator("#archive-to-input")).toHaveValue("2026-04-01");
    await expect(page.locator("#archive-content-mode-select")).toHaveValue("threads");
    await expect(page.locator("#archive-image-size-select")).toHaveValue("large");
    expect(errors).toEqual([]);
  });
  test("network result templates render safe labels and independent actions on both pages", async ({ page }) => {
    const errors = []; page.on("pageerror", (error) => errors.push(error.message)); await blockExternalRequests(page);
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
      const report = await page.evaluate(async () => {
        const { createNetworkWorkspaceRenderer } = await import("/js/tools/network-rendering.js");
        const { cloneTemplateContent } = await import("/js/shared/shared-templates.js");
        const host = document.createElement("div"); host.className = "archive-results network-results";
        Object.assign(host.style, { position: "fixed", left: "0", top: "0", width: "360px", zIndex: "99999" }); document.body.append(host);
        const calls = []; const state = { scrollTop: 12, stageMode: false, loading: false, listsVisible: false, group: "following" };
        let nodes = [{ did: "a", handle: "a.test", displayName: "<img src=x onerror=window.networkUnsafe=1>" }, { did: "b", handle: "b.test", displayName: "Beta" }];
        const elements = { results: host, templates: {} };
        for (const name of ["intro", "group", "item", "more", "empty"]) { elements.templates[name] = document.querySelector(`#network-result-${name}-template`); }
        const renderer = createNetworkWorkspaceRenderer(elements, { getState: () => state, cloneTemplate: cloneTemplateContent,
          allNodes: () => nodes, visibleNodes: () => nodes, relation: () => "mutual", sort: (items) => [...items].reverse(), score: () => 120,
          ownNetwork: () => false, centerLabel: () => "<script>not markup</script>", formatCount: String,
          t: (key, params = {}) => `${key} ${params.account || ""}`.trim(), pending: () => true,
          setScroll: (top) => { state.scrollTop = top; }, restoreScroll: () => calls.push("restore"),
          select: (did) => calls.push(did), loadMore: async (group) => calls.push(group) });
        renderer.results(); const initialGroups = host.querySelectorAll(".network-group-card:not(.network-group-card-intro)").length;
        const labels = [...host.querySelectorAll(".network-list-button strong")].map((node) => node.textContent);
        const images = host.querySelectorAll("img, script").length; const note = host.querySelectorAll(".network-card-explainer")[1].textContent;
        const bounds = host.getBoundingClientRect();
        const fits = [...host.querySelectorAll(".network-list-button")].every((button) => button.getBoundingClientRect().right <= bounds.right + 1);
        host.querySelector(".network-list-button").click(); host.querySelector(".network-more-button").click();
        renderer.results(); host.querySelector(".network-list-button").click();
        state.loading = true; renderer.results(); const disabled = [...host.querySelectorAll(".network-more-button")].every((button) => button.disabled);
        state.stageMode = true; state.listsVisible = true; renderer.results();
        const stageGroups = host.querySelectorAll(".network-group-card").length; const intro = host.querySelectorAll(".network-group-card-intro").length;
        nodes = []; renderer.results(); const empty = host.textContent;
        host.remove(); return { initialGroups, labels, images, note, fits, selected: calls.filter((value) => value === "b").length,
          more: calls.filter((value) => value === "mutual").length, disabled, stageGroups, intro, empty, unsafe: window.networkUnsafe || false };
      });
      expect(report.initialGroups).toBe(3); expect(report.labels).toEqual(["Beta", "<img src=x onerror=window.networkUnsafe=1>"]);
      expect(report.images).toBe(0); expect(report.unsafe).toBe(false); expect(report.note).toContain("<script>not markup</script>");
      expect(report.fits).toBe(true); expect(report.selected).toBe(2); expect(report.more).toBe(1); expect(report.disabled).toBe(true);
      expect(report.stageGroups).toBe(1); expect(report.intro).toBe(0); expect(report.empty).toBe("networkResultsEmpty");
      const focus = await page.evaluate(async () => {
        const { buildNetworkFocusCardModel, createNetworkFocusCardRenderer } = await import("/js/tools/network-focus-rendering.js");
        const { cloneTemplateContent } = await import("/js/shared/shared-templates.js");
        const { setAvatarImage } = await import("/js/shared/shared-accounts.js");
        const card = document.createElement("div"); card.className = "network-focus-card";
        Object.assign(card.style, { position: "fixed", top: "0", left: "0", width: "260px", zIndex: "99999" }); document.body.append(card);
        const calls = []; let own = true;
        const profile = { did: "a", handle: "alpha.test", displayName: "<img src=x onerror=window.focusUnsafe=1>", description: "<script>plain description</script>",
          pronouns: "they/them <b>literal</b>", links: [{ url: "https://example.test/", title: "<b>Support</b>" }, { url: "javascript:alert(1)" }] };
        const state = { selectedDid: "a", nodes: new Map([["a", profile]]), details: new Map([["a", { profile,
          relationshipDates: { youFollowSince: "2026-10-10T12:00:00Z", followsYouSince: "2026-10-12T12:00:00Z" },
          activityStats: { latestPostAt: "2026-10-13T12:00:00Z", windows: { 14: { postsCount: 2, likesReceivedCount: 5 } } },
          likeStats: { mutualLikesCount: 3 }, followersPreview: [], followsPreview: [] }]]), accountDid: "viewer", commonTargetDid: "", commonDids: new Set() };
        const t = (key) => key; const templates = {};
        for (const name of ["shell", "stat", "line", "meta", "description"]) { templates[name] = document.querySelector(`#network-focus-${name}-template`); }
        templates.empty = document.querySelector("#network-result-empty-template");
        const renderer = createNetworkFocusCardRenderer({ card, templates }, { getState: () => state, cloneTemplate: cloneTemplateContent, setAvatar: setAvatarImage, t,
          model: (value) => buildNetworkFocusCardModel(value, { known: () => profile, ownNetwork: () => own, avatar: () => "", relation: () => "mutual",
            score: () => 120, breakdown: () => ({ total: 120, relationScore: 120, followersScore: 0, postsScore: 0 }), centerLabel: () => "viewer", locale: "en", formatCount: (number) => String(Number(number) || 0), t,
            profileLinks: globalThis.ThreadlineProfileMetadata.links }),
          setActorInput: (value) => calls.push(["input", value]), load: (value) => calls.push(["load", value]), loadCommon: (did) => calls.push(["common", did]),
          clearCommon: () => { calls.push(["clear"]); state.commonTargetDid = ""; }, renderWorkspace: () => calls.push(["workspace"]) });
        renderer.render(); const name = card.querySelector(".network-avatar-copy strong").textContent;
        const profileLinks = [...card.querySelectorAll(".profile-links a")].map(link => ({ url: link.href, title: link.textContent, rel: link.rel }));
        const description = card.querySelector("details p").textContent;
        const safe = card.querySelectorAll("img").length === 1 && card.querySelectorAll("script").length === 0 && !window.focusUnsafe;
        const counts = [...card.querySelectorAll(".network-stat-card strong")].map((node) => node.textContent);
        const bounds = card.getBoundingClientRect(); const fits = [...card.querySelectorAll(".network-stat-card")].every((node) => node.getBoundingClientRect().right <= bounds.right + 1);
        const ownText = card.textContent;
        card.querySelector('[data-network-focus-action="load"]').click(); card.querySelector('[data-network-focus-action="common"]').click();
        renderer.render(); card.querySelector('[data-network-focus-action="load"]').click();
        state.commonTargetDid = "a"; state.commonDids = new Set(["p"]); renderer.render(); card.querySelector('[data-network-focus-action="common"]').click();
        own = false; renderer.render(); const foreignText = card.textContent;
        state.selectedDid = ""; renderer.render(); const empty = card.textContent; card.remove();
        return { name, description, safe, counts, fits, ownText, foreignText, empty, calls, profileLinks };
      });
      expect(focus.name).toBe("<img src=x onerror=window.focusUnsafe=1>"); expect(focus.description).toBe("<script>plain description</script>");
      expect(focus.safe).toBe(true); expect(focus.counts).toEqual(["0", "0", "0", "120"]); expect(focus.fits).toBe(true);
      expect(focus.profileLinks).toEqual([{ url: "https://example.test/", title: "<b>Support</b>", rel: "noopener noreferrer" }]);
      expect(focus.ownText).toContain("networkMutualSince"); expect(focus.ownText).toContain("networkMutualLikesTotal");
      expect(focus.foreignText).not.toContain("networkMutualSince"); expect(focus.foreignText).not.toContain("networkMutualLikesTotal");
      expect(focus.calls.filter((call) => call[0] === "load")).toEqual([["load", { actor: "a", append: false, silentErrors: false }], ["load", { actor: "a", append: false, silentErrors: false }]]);
      expect(focus.calls.filter((call) => call[0] === "common")).toEqual([["common", "a"]]);
      expect(focus.calls.filter((call) => call[0] === "clear")).toHaveLength(1); expect(focus.empty).toBe("networkFocusEmpty");
      const svgReport = await page.evaluate(async () => {
        const { createNetworkStageRenderer } = await import("/js/tools/network-stage-rendering.js");
        const { createNetworkLayoutController } = await import("/js/tools/network-layout.js");
        const { getNetworkRelationType, calculateNetworkContentBounds, calculateNetworkViewport } = await import("/js/tools/network.js");
        const { cloneTemplateContent } = await import("/js/shared/shared-templates.js");
        const stage = document.createElementNS("http://www.w3.org/2000/svg", "svg"); document.body.append(stage);
        const profiles = [{ did: "a", handle: "alpha.test", displayName: "<img src=x onerror=window.svgUnsafe=1>", followingViewer: true, followedByViewer: true },
          { did: "b", handle: "beta.test", followedByViewer: true }];
        const preview = { did: "p", handle: "preview.test", displayName: "<script>preview text</script>", previewRelation: "followers" };
        const state = { selectedDid: "a", hoveredDid: "", viewer: { did: "v", handle: "viewer.test" }, accountDid: "v", authDid: "v", nodes: new Map(profiles.map((node) => [node.did, node])) };
        const slots = new Map(); const counts = {}; const calls = []; const common = new Set(["b"]);
        const geometry = createNetworkLayoutController({ getState: () => ({ shape: "round", slots, counts }), relation: getNetworkRelationType, clamp: (value, min, max) => Math.min(max, Math.max(min, value)) });
        const templates = {}; for (const key of ["scene", "node", "focus", "preview", "primitive"]) { templates[key] = document.querySelector(`#network-svg-${key}-template`); }
        const empty = { hidden: false };
        const renderer = createNetworkStageRenderer({ stage, empty, templates }, {
          getState: () => state, allNodes: () => profiles, visibleNodes: () => profiles, slot: geometry.slot, preferred: () => "",
          hover: (did) => { state.hoveredDid = did; }, select: (...args) => calls.push(args), known: (did) => state.nodes.get(did),
          label: (profile) => profile.displayName || profile.handle, initials: (profile) => String(profile.handle || "?").slice(0, 2), relation: getNetworkRelationType, relationLabel: getNetworkRelationType,
          previews: () => [preview], layout: geometry.layout, contentBounds: (layout, nodes, did) => calculateNetworkContentBounds(layout, nodes, did, [preview]),
          viewport: (layout) => calculateNetworkViewport(layout, { fitAll: true, panX: 0, panY: 0 }, {}).viewport,
          common: () => common, orbitPath: geometry.path, labels: geometry.labels, cloneTemplate: cloneTemplateContent, t: (key) => key,
        });
        renderer.render();
        const order = [...stage.children].map((node) => node.dataset.networkLayer || node.tagName);
        const namespaces = [...stage.querySelectorAll("*")].every((node) => node.namespaceURI === "http://www.w3.org/2000/svg");
        const safe = !stage.querySelector("img, script") && !window.svgUnsafe;
        const original = stage.querySelector('[data-network-layer="nodes"] .network-node-button');
        original.dispatchEvent(new Event("mouseenter")); const hovered = state.hoveredDid;
        original.dispatchEvent(new Event("mouseleave")); const cleared = state.hoveredDid;
        let propagated = 0; stage.addEventListener("pointerdown", () => { propagated += 1; });
        original.dispatchEvent(new Event("pointerdown", { bubbles: true }));
        original.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        renderer.render(); stage.querySelector('[data-network-layer="nodes"] .network-node-button').dispatchEvent(new MouseEvent("click", { bubbles: true }));
        stage.querySelector(".network-node-button-preview").dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
        const commonLinks = stage.querySelectorAll(".network-common-mutual-layer line").length;
        const rings = stage.querySelectorAll("[data-network-common-ring]").length;
        const titles = [...stage.querySelectorAll("title")].map((node) => node.textContent);
        state.selectedDid = ""; profiles.length = 0; state.viewer = null; state.authDid = ""; renderer.render();
        const noData = !empty.hidden && stage.querySelectorAll(".network-focus-island").length === 0 && stage.textContent.includes("networkEmpty");
        stage.remove(); return { order, namespaces, safe, hovered, cleared, propagated, calls, commonLinks, rings, titles, noData };
      });
      expect(svgReport.order).toEqual(["defs", "background", "edges", "viewer", "nodes", "g"]);
      expect(svgReport.namespaces).toBe(true); expect(svgReport.safe).toBe(true); expect(svgReport.hovered).toBe("a"); expect(svgReport.cleared).toBe("");
      expect(svgReport.propagated).toBe(0); expect(svgReport.calls).toEqual([["a"], ["a"], ["p", { previewTab: "followers", loadDetails: true }]]);
      expect(svgReport.commonLinks).toBe(1); expect(svgReport.rings).toBe(3); expect(svgReport.titles).toContain("<script>preview text</script>"); expect(svgReport.noData).toBe(true);
    }
    expect(errors).toEqual([]);
  });
  test("network calculations integrate merging, filters, sorting, zoom and focus bounds", async ({ page }) => {
    test.setTimeout(90000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      window.networkWaveRequests = [];
      localStorage.setItem("threadline:network-stage-shape", "squircle");
      const account = { did: "did:example:viewer", handle: "viewer.test", identifier: "viewer.test", service: "https://bsky.social" };
      const profiles = [
        { did: "a", handle: "z.test", displayName: "Alpha", followedByViewer: true },
        { did: "b", handle: "a.test", displayName: "Beta", followedByViewer: true },
        { did: "c", handle: "c.test", displayName: "Charlie", followedByViewer: true },
      ];
      const registration = { update: async () => {}, active: { postMessage(message, ports) {
        let result = null;
        if (message.type === "GET_APP_STATE") { result = { ...account, accounts: [account], localePreference: "en", locale: "en", desktopLayoutVersion: 2 }; }
        if (message.type === "VERIFY_SESSION") { result = { ...account, accounts: [account], authenticated: true }; }
        if (message.type === "LOAD_NETWORK_SLICE") {
          window.networkWaveRequests.push(message.payload);
          result = { viewer: account, followers: profiles, follows: [
            { did: "a", handle: "", displayName: "", followingViewer: true },
            { did: "b", followingViewer: true }, { did: "d", handle: "d.test", displayName: "Delta", followingViewer: true },
          ], followerCursor: "next-followers", hasMoreFollowers: true, hasMoreFollows: false };
          if (message.payload.followerCursor) {
            result = { viewer: account, followers: [{ did: "e", handle: "extra.test", displayName: "Extra", followedByViewer: true }], follows: [], hasMoreFollowers: false, hasMoreFollows: false };
          }
          if (message.payload.actor === "foreign.test") {
            result = { viewer: { did: "did:foreign", handle: "foreign.test", displayName: "Foreign" },
              followers: [{ did: "f-only", handle: "foreign-follower.test", displayName: "Foreign follower", followedByViewer: true }], follows: [], hasMoreFollowers: false, hasMoreFollows: false };
          }
        }
        if (message.type === "LOAD_NETWORK_ACTOR_FOCUS") {
          result = { profile: profiles.find((profile) => profile.did === message.payload.actor) || { did: message.payload.actor, handle: "foreign-follower.test", displayName: "Foreign follower", followedByViewer: true }, followersPreview: [{ did: "preview", handle: "preview.test" }] };
        }
        if (message.type === "LOAD_NETWORK_COMMON_MUTUALS") {
          result = { commonDids: [" b ", "b"], commonProfiles: [{ did: "b", handle: "", followingViewer: true, followedByViewer: true }] };
        }
        ports[0].postMessage({ ok: true, result });
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#network-button")).toBeEnabled(); await page.locator("#network-button").click();
    await expect(page.locator("#network-summary-loaded")).toHaveText("4");
    await expect(page.locator("#network-summary-mutuals")).toHaveText("2");
    await expect(page.locator("#network-summary-visible")).toHaveText("4");
    for (const [mode, count] of [["mutual", "2"], ["followers", "1"], ["following", "1"], ["strong", "2"], ["all", "4"]]) {
      await page.locator(`#network-filter-${mode}`).click(); await expect(page.locator("#network-summary-visible")).toHaveText(count);
    }
    await page.locator("#network-search-input").fill("  ALPHA  ");
    await expect(page.locator("#network-summary-visible")).toHaveText("1");
    await page.locator("#network-search-input").fill("");
    await expect(page.locator("#network-summary-visible")).toHaveText("4");
    const names = page.locator("#network-results .network-list-button strong");
    expect((await names.allTextContents()).slice(0, 2)).toEqual(["Alpha", "Beta"]);
    await page.locator("#network-sort-field-select").selectOption("handle");
    expect((await names.allTextContents()).slice(0, 2)).toEqual(["Beta", "Alpha"]);
    await page.locator("#network-sort-direction-select").selectOption("desc");
    expect((await names.allTextContents()).slice(0, 2)).toEqual(["Alpha", "Beta"]);
    const stage = page.locator("#network-stage-svg"); const fit = await stage.getAttribute("viewBox");
    await page.locator("#network-zoom-in-button").click(); expect(await stage.getAttribute("viewBox")).not.toBe(fit);
    await page.locator("#network-zoom-reset-button").click(); await expect(stage).toHaveAttribute("viewBox", fit);
    await page.locator("#network-results .network-list-button").filter({ hasText: "Alpha" }).click();
    await expect(page.locator(".network-node-button-preview")).toHaveCount(1);
    await expect(page.locator("#network-shape-toggle-button")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#network-stage-svg path").first()).toHaveAttribute("d", /^M /);
    await page.locator("#network-zoom-reset-button").click();
    const geometry = await stage.evaluate((svg) => {
      const box = svg.viewBox.baseVal;
      const circles = [...svg.querySelectorAll(".network-node-button circle")];
      return { finite: [box.x, box.y, box.width, box.height].every(Number.isFinite), width: box.width, height: box.height,
        included: circles.every((circle) => {
          const x = circle.cx.baseVal.value; const y = circle.cy.baseVal.value; const radius = circle.r.baseVal.value;
          return x - radius >= box.x && y - radius >= box.y && x + radius <= box.x + box.width && y + radius <= box.y + box.height;
        }), circles: circles.length };
    });
    expect(geometry.finite).toBe(true); expect(geometry.width).toBeGreaterThan(0); expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.circles).toBeGreaterThan(0); expect(geometry.included).toBe(true);
    await page.locator("#network-search-input").fill("Alpha");
    await page.locator(".network-focus-actions button").nth(1).click();
    await expect(page.locator("#network-filter-common")).toBeVisible();
    await expect(page.locator("#network-search-input")).toHaveValue("");
    await page.locator("#network-filter-common").click();
    await expect(page.locator("#network-summary-visible")).toHaveText("1");
    await page.locator("#network-results .network-list-button").filter({ hasText: "Beta" }).click();
    await expect(page.locator("#network-filter-common")).not.toBeVisible();
    await expect(page.locator("#network-summary-visible")).toHaveText("4");
    await expect(page.locator("#network-load-button")).toBeEnabled();
    await page.locator("#network-load-button").click();
    await expect(page.locator("#network-summary-loaded")).toHaveText("5");
    await expect(page.locator("#network-load-button")).toBeDisabled();
    const waves = await page.evaluate(() => window.networkWaveRequests);
    expect(waves).toHaveLength(2); expect(waves[1].followerCursor).toBe("next-followers");
    expect(waves[1].actor).toBe("did:example:viewer");
    await stage.scrollIntoViewIfNeeded(); const box = await stage.boundingBox();
    const beforeWheel = await stage.getAttribute("viewBox");
    await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.wheel(0, -100);
    await expect(stage).not.toHaveAttribute("viewBox", beforeWheel);
    const beforePan = await stage.getAttribute("viewBox");
    const dragPoint = await stage.evaluate((svg) => {
      const bounds = svg.getBoundingClientRect();
      for (let y = Math.max(160, bounds.top + 140); y < Math.min(window.innerHeight - 80, bounds.bottom - 80); y += 40) {
        for (let x = bounds.left + 40; x < Math.min(window.innerWidth - 80, bounds.right - 80); x += 40) {
          const target = document.elementFromPoint(x, y);
          if (target?.closest("#network-stage-svg") && !target.closest(".network-node-button, .network-focus-island")) { return { x, y }; }
        }
      }
      return null;
    });
    expect(dragPoint).not.toBeNull();
    await page.mouse.move(dragPoint.x, dragPoint.y); await page.mouse.down();
    await page.mouse.move(dragPoint.x + 30, dragPoint.y + 25); await page.mouse.up();
    if (await stage.getAttribute("viewBox") === beforePan) {
      await page.mouse.move(dragPoint.x, dragPoint.y); await page.mouse.down();
      await page.mouse.move(dragPoint.x - 30, dragPoint.y - 25); await page.mouse.up();
    }
    await expect(stage).not.toHaveAttribute("viewBox", beforePan);
    await page.evaluate(() => Object.defineProperty(document, "fullscreenEnabled", { value: false, configurable: true }));
    await page.locator("#network-stage-mode-button").click();
    await expect(page.locator("body")).toHaveClass(/network-stage-mode/);
    await page.locator("#network-stage-mode-focus-button").click();
    await expect(page.locator("#network-stage-mode-focus-button")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#network-stage-mode-lists-button").click();
    await expect(page.locator("#network-stage-mode-lists-button")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#network-stage-mode-exit-button").click();
    await expect(page.locator("body")).not.toHaveClass(/network-stage-mode/);
    await page.locator("#network-stage-mode-button").click(); await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveClass(/network-stage-mode/);
    await page.locator("#network-search-input").fill("Alpha");
    await expect(page.locator("#network-summary-visible")).toHaveText("1");
    await page.locator("#network-reset-button").click();
    await expect(page.locator("#network-search-input")).toHaveValue(""); await expect(page.locator("#network-summary-loaded")).toHaveText("5");
    await expect(page.locator("#network-summary-visible")).toHaveText("5"); await expect(page.locator(".network-focus-island")).toHaveCount(0);
    expect(await page.evaluate(() => window.networkWaveRequests.length)).toBe(2);
    await page.locator("#network-account-input").fill("foreign.test"); await page.locator("#network-account-input").press("Enter");
    await expect(page.locator("#network-summary-loaded")).toHaveText("1"); await expect(page.locator("#network-own-load-button")).toBeEnabled();
    await page.locator("#network-results .network-list-button").filter({ hasText: "Foreign follower" }).click();
    await expect(page.locator("#network-focus-card .network-relation-pill")).toContainText("Foreign");
    await page.locator("#network-own-load-button").click(); await expect(page.locator("#network-summary-loaded")).toHaveText("4");
    await expect(page.locator("#network-own-load-button")).toBeDisabled(); await expect(page.locator("#network-account-input")).toHaveValue("viewer.test");
    expect((await page.evaluate(() => window.networkWaveRequests)).slice(-2).map((wave) => wave.actor)).toEqual(["foreign.test", "did:example:viewer"]);
    expect(errors).toEqual([]);
  });
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
        localStorage.setItem("test:firstUse", "9000");
        const reminder = createSettingsBackupReminder({ status: document.querySelector("#backup-status"),
          dialog: document.querySelector("#backup-reminder-dialog"), message: document.querySelector("#backup-reminder-message") }, {
          storage: localStorage, exportKey: "test:export", dismissKey: "test:dismiss", firstUseKey: "test:firstUse", now: () => 10000,
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
    let dmAvatarSetCount = 0;
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
        dmAvatarSetCount += 1;
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
    dmContactButton.click();
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
      dmContactButtonSelected: dmContactButton?.classList.contains("is-selected") || false,
      dmContactAvatarPreserved: dmContactAvatar === dmContactList.querySelector(".dm-contact-avatar"),
      dmAvatarSetCount,
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
    dmContactButtonSelected: true,
    dmContactAvatarPreserved: true,
    dmAvatarSetCount: 1,
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
    const failedAvatar = "https://cdn.example/missing-avatar.jpg";
    localStorage.setItem("threadline.failed-avatars.v1", JSON.stringify([{ url: failedAvatar, failedAt: Date.now() }]));
    const cachedFailureImage = document.createElement("img");
    accounts.setAvatarImage(cachedFailureImage, failedAvatar, "Missing avatar");
    localStorage.removeItem("threadline.failed-avatars.v1");
    const version = await bootstrap.fetchVersionInfo();

    return {
      avatarAlt: image.alt,
      hasFallbackAvatar: image.src.startsWith("data:image/svg+xml"),
      cachedFailureUsesFallback: cachedFailureImage.src.startsWith("data:image/svg+xml"),
      cachedFailureDoesNotRetry: cachedFailureImage.onerror === null,
      versionSignature: bootstrap.versionSignature(version),
      versionMatchesPreload: version.appVersion === bootstrap.CURRENT_VERSION_INFO.appVersion,
    };
  });

  expect(result.avatarAlt).toBe("Alice");
  expect(result.hasFallbackAvatar).toBe(true);
  expect(result.cachedFailureUsesFallback).toBe(true);
  expect(result.cachedFailureDoesNotRetry).toBe(true);
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
