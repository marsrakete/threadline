"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

test("analysis profile metadata survives normalization and persistence", async () => {
  const module = await importProjectModule("js/tools/analysis-accounts.js");
  const profile = { did: "did:example:profile", pronouns: "they/them", website: "https://old.example/",
    links: [{ url: "https://example.test/", title: "Site" }] };
  const normalizer = module.createAnalysisAccountNormalizer({ corpus: () => ({}), temporal: () => ({}) });
  const account = normalizer.normalize({ profile, posts: [] });
  const stored = module.getPersistableAnalysisAccount(account);
  assert.equal(stored.profile.pronouns, profile.pronouns);
  assert.deepEqual(stored.profile.links, profile.links);
  assert.equal(stored.profile.website, profile.website);
});

test("analysis event handlers select own actors and invalidate only the edited validation slot", async () => {
  const { controller, state, elements, calls } = await controllerFixture(); const h = controller.handlers;
  h.accountAOwn(); h.accountBOwn(); assert.equal(elements.inputA.value, "viewer.test"); assert.equal(elements.inputB.value, "viewer.test");
  state.comparison = { score: 42 }; elements.inputA.validity = "old"; h.accountInput({ currentTarget: elements.inputA });
  assert.equal(state.comparison, null); assert.equal(elements.inputA.validity, ""); assert.deepEqual(state.validationTokens, { a: 1, b: 0 });
  h.accountInput({ currentTarget: elements.inputB }); assert.deepEqual(state.validationTokens, { a: 1, b: 1 });
  h.accountInput(null); assert.equal(calls.filter((call) => call[0] === "result").length, 2);
  state.comparison = {}; h.optionChange(); assert.equal(state.comparison, null); assert.ok(calls.some((call) => call[0] === "render"));
});

test("analysis event handlers route blur and Enter without accidental comparisons", async () => {
  const { controller, elements, calls } = await controllerFixture(); elements.inputA.value = "a"; elements.inputB.value = "b";
  await controller.handlers.accountBlur({ currentTarget: elements.inputB }); assert.equal(calls[0][0], "CHECK_ANALYSIS_ACCOUNT"); assert.equal(calls[0][1].actor, "b");
  const before = calls.length; await controller.handlers.accountKeydown({ key: "Escape" }); assert.equal(calls.length, before);
  let prevented = false; await controller.handlers.accountKeydown({ key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true); assert.deepEqual(calls.filter((call) => call[0] === "LOAD_ANALYSIS_ACCOUNT").map((call) => call[1].actor), ["a", "b"]);
});

test("analysis export handler clears busy feedback on success and reported failure", async () => {
  const { controller, options, calls, state } = await controllerFixture(); await controller.handlers.exportPdf();
  assert.deepEqual(calls.filter((call) => call[0] === "busy").map((call) => call[2]), [true, false]);
  options.exportReport = async () => { throw new Error("export failed"); }; await controller.handlers.exportPdf();
  assert.equal(calls.at(-1)[0], "busy"); assert.equal(calls.at(-1)[2], false); assert.equal(state.status, "export failed");
  assert.ok(calls.some((call) => call[0] === "error" && call[1] === "export failed"));
});

test("analysis workspace controller owns navigation gates and render order", async () => {
  const { createAnalysisWorkspaceController } = await importProjectModule("js/tools/analysis.js");
  const calls = []; const state = { auth: "yes", accountA: null, accountB: null, comparison: null, status: "" }; let redirect = true; let language = "en";
  const renderer = {}; for (const name of ["summary", "result", "temporal", "network", "metrics", "patterns"]) { renderer[name] = (...args) => calls.push([name, ...args]); }
  const elements = { inputA: {}, inputB: {}, launch: {}, exportPdf: {} };
  const options = { getState: () => state, renderer, tables: { temporal: () => [], network: () => [] },
    controller: { controls: () => calls.push(["controls"]), status: (text) => calls.push(["status", text]) }, t: (key) => language + key,
    navigate: () => redirect, setWorkspace: (value) => calls.push(["workspace", value]), fullscreen: () => calls.push(["fullscreen"]), persistWorkspace: (value) => calls.push(["persist", value]),
    visible: (value) => calls.push(["visible", value]), context: () => calls.push(["context"]), authButtons: () => calls.push(["auth"]) };
  const controller = createAnalysisWorkspaceController(elements, options);
  controller.show(); assert.equal(calls.length, 0); redirect = false; state.auth = null; controller.show(); assert.equal(calls.length, 0);
  state.auth = "yes"; controller.show(); assert.deepEqual(calls.map((call) => call[0]), ["workspace", "fullscreen", "persist", "visible", "context", "auth", "summary", "result", "temporal", "network", "metrics", "patterns", "controls", "status"]);
  assert.equal(calls.at(-1)[1], "enanalysisStatusIdle"); controller.translate(); assert.equal(elements.launch.textContent, "enanalysisLaunchButton");
  language = "fr"; controller.translate(); assert.equal(elements.inputB.placeholder, "franalysisAccountPlaceholder"); assert.equal(elements.exportPdf.textContent, "franalysisExportPdfButton");
  state.status = "existing"; controller.render(); assert.equal(calls.at(-1)[1], "existing");
  assert.doesNotThrow(() => createAnalysisWorkspaceController({}, options).translate());
});

/** Creates report rendering with observable Canvas/native adapters. @returns {Promise<object>} Renderer fixture. */
async function pdfRendererFixture() {
  const { createAnalysisPdfRenderer } = await importProjectModule("js/tools/analysis-pdf-rendering.js");
  const { buildAnalysisTemporalSummaryModel } = await importProjectModule("js/tools/analysis-rendering.js");
  const report = await reportFixture(); const engine = await engines(); const calls = [];
  const account = engine.normalizer.normalize({ profile: { handle: "a.test" }, posts: [{ text: "hello world", createdAt: "2026-10-12T12:00Z" }] });
  const state = { accountA: account, accountB: account, comparison: engine.comparator.compare(account, account) };
  const context = { font: "", createLinearGradient: () => ({ addColorStop: () => {} }), fillRect: (...args) => calls.push(["rect", ...args]),
    fillText: (...args) => calls.push(["label", ...args]), measureText: (value) => ({ width: String(value).length * 5 }) };
  const options = { state, models: report.models, layout: report.layout, tables: { temporal: () => [], network: () => [] },
    t: (key, params = {}) => key + JSON.stringify(params), now: () => new Date("2026-10-15T12:00Z"),
    canvas: () => ({ width: 0, height: 0, getContext: () => context, toBlob: (done, type, quality) => { calls.push(["jpeg", type, quality]); done(new Blob(["JPEG"])); } }),
    fetch: async (...args) => { calls.push(["fetch", ...args]); return { ok: true, blob: async () => new Blob(["avatar"]) }; }, bitmap: async () => ({ bitmap: true }),
    fill: (...args) => calls.push(["fill", ...args.slice(1)]), stroke: (...args) => calls.push(["stroke", ...args.slice(1)]),
    wrap: (ctx, text) => [String(text || "")], text: (ctx, lines) => calls.push(["text", lines]), circle: (...args) => calls.push(["circle", ...args.slice(1)]),
    date: String, count: String, timestamp: String, percent: (value) => String((Number(value) || 0) * 100) + "%",
    weekday: (day) => "day" + day, overlap: engine.temporal.overlapHeatmap,
    temporalSummary: (profile) => buildAnalysisTemporalSummaryModel(profile, { t: (key) => key, number: String, count: String }),
    pdf: (pages, meta) => { calls.push(["pdf", pages, meta]); return new Blob(["PDF"]); }, file: (blob, name) => ({ blob, name }),
    deliver: async (...args) => calls.push(["deliver", ...args]), status: (message) => calls.push(["status", message]) };
  return { renderer: createAnalysisPdfRenderer(options), options, state, calls, context };
}

test("analysis PDF renderer creates A4 shell and draws score and heatmap branches", async () => {
  const { renderer: r, context, calls } = await pdfRendererFixture(); const base = r.base(0, 2);
  assert.equal(base.canvas.width, 1190); assert.equal(base.canvas.height, 1684); assert.equal(base.scale, 2); assert.ok(base.contentBottom > base.cursorY);
  r.score(context, 1, 0, 0, 100, { label: "score", accent: true }, { height: 30, lines: ["score"] });
  assert.equal(context.fillStyle, "#17927f"); assert.ok(context.font.startsWith("700"));
  r.score(context, 1, 0, 0, 100, { label: "score" }, { height: 30, lines: ["score"] }); assert.equal(context.fillStyle, "#3d5f8f");
  assert.equal(r.heatmap(context, 1, 0, 0, 100, null), 12);
  const before = calls.length; const height = r.heatmap(context, 1, 0, 0, 100, [[0, 2]], "#3f7cd6");
  assert.equal(height, 26); const fills = calls.slice(before).filter((item) => item[0] === "fill"); assert.equal(fills.length, 2);
  assert.equal(fills[0].at(-1), "rgba(63, 124, 214, 0.0736)"); assert.equal(fills[1].at(-1), "rgba(63, 124, 214, 0.92)");
});

test("analysis PDF avatar cache deduplicates anonymous loads and retains failed results", async () => {
  const { renderer: r, options, calls } = await pdfRendererFixture(); assert.equal(await r.avatar(" "), null);
  const [first, second] = await Promise.all([r.avatar(" url "), r.avatar("url")]); assert.deepEqual(first, second);
  assert.equal(calls.filter((item) => item[0] === "fetch").length, 1);
  assert.deepEqual(calls.find((item) => item[0] === "fetch")[2], { mode: "cors", credentials: "omit" });
  options.fetch = async () => { calls.push(["failed-fetch"]); return { ok: false, status: 404 }; };
  assert.equal(await r.avatar("missing"), null); assert.equal(await r.avatar("missing"), null);
  assert.equal(calls.filter((item) => item[0] === "failed-fetch").length, 1);
});

test("analysis PDF temporal note wrapping uses the same font as final drawing", async () => {
  const { renderer, options } = await pdfRendererFixture(); const fonts = [];
  options.wrap = (context, text) => {
    if (String(text).startsWith("analysisTemporalUtcHint") || String(text).startsWith("analysisTemporalOverlapHeatmapNote")) { fonts.push(context.font); }
    return [String(text)];
  };
  await renderer.temporal(1, 2);
  assert.deepEqual(fonts, ['16px "Segoe UI", Aptos, sans-serif', '16px "Segoe UI", Aptos, sans-serif', '16.4px "Segoe UI", Aptos, sans-serif']);
});

test("analysis PDF pattern cards exercise text, profile, avatar-fallback and bar branches", async () => {
  const { renderer: r, options, calls, context } = await pdfRendererFixture();
  await r.patternCard(context, 1, 0, 0, 200, 100, { title: "plain", lines: ["text"] });
  assert.ok(calls.some((item) => item[0] === "text" && item[1].includes("text")));
  await r.patternCard(context, 1, 0, 0, 200, 100, { title: "profiles", profileEntries: [{ avatar: "avatar", handle: "a" }] });
  assert.equal(calls.filter((item) => item[0] === "circle").length, 1);
  options.fetch = async () => { throw new Error("offline"); };
  await r.patternCard(context, 1, 0, 0, 200, 100, { title: "missing", profileEntries: [{ avatar: "missing" }] });
  const before = calls.length;
  await r.patternCard(context, 1, 0, 0, 200, 100, { title: "bars", barEntries: [{ label: "1-3 characters", share: 2 }, { label: "zero", value: -1 }] });
  const fills = calls.slice(before).filter((item) => item[0] === "fill" && item.at(-1) === "#27b6a0");
  assert.equal(fills.length, 2); assert.ok(fills[0][3] > 0); assert.equal(fills[1][3], 0);
  assert.ok(fills[0][1] >= 14 + context.measureText("1-3 characters").width);
});

test("analysis PDF export preserves page/image order and delivers only a complete result", async () => {
  const { renderer: r, state, calls, options } = await pdfRendererFixture(); await r.export();
  const pages = calls.find((item) => item[0] === "pdf")[1]; assert.ok(pages.length > 2);
  pages.forEach((page, index) => { assert.equal(page.images[0].name, "PageImage" + (index + 1)); assert.equal(page.images[0].width, 1190); assert.equal(page.images[0].height, 1684); assert.equal(new TextDecoder().decode(page.images[0].bytes), "JPEG"); });
  assert.equal(calls.filter((item) => item[0] === "jpeg").length, pages.length);
  assert.deepEqual(calls.find((item) => item[0] === "deliver")[3], { preferDownload: true }); assert.equal(calls.at(-1)[0], "status");
  state.comparison = null; await assert.rejects(r.export(), /analysisNeedComparison/);
  state.comparison = {}; options.deliver = async () => { throw new Error("delivery failed"); };
  // Restore the normalized result before exercising a late delivery failure.
  const fixture = await pdfRendererFixture(); fixture.options.deliver = options.deliver;
  await assert.rejects(fixture.renderer.export(), /delivery failed/); assert.equal(fixture.calls.filter((item) => item[0] === "status").length, 0);
});

/** Creates deterministic report text and geometry adapters. @returns {Promise<object>} Model/layout operations and fake Canvas. */
async function reportFixture() {
  const { createAnalysisReportModels } = await importProjectModule("js/tools/analysis-report-models.js");
  const { createAnalysisReportLayout } = await importProjectModule("js/tools/analysis-report-layout.js");
  const config = await importProjectModule("js/tools/analysis-config.js");
  const { buildAnalysisMetricTableModel } = await importProjectModule("js/tools/analysis-rendering.js");
  const context = {};
  const wrap = (ctx, text, width) => Array(Math.max(1, Math.ceil(String(text || "").length / Math.max(1, width)))).fill(String(text || ""));
  const options = { t: (key, params = {}) => key + JSON.stringify(params), number: (value, digits) => Number(value || 0).toFixed(digits), percent: (value) => String((Number(value) || 0) * 100) + "%",
    now: () => new Date("2026-10-14T12:00Z"), metricRows: buildAnalysisMetricTableModel, deltaLabel: config.ANALYSIS_DELTA_REPORT_LABEL,
    corpusPatterns: config.ANALYSIS_CORPUS_PATTERNS, networkPatterns: config.ANALYSIS_NETWORK_PATTERNS };
  return { models: createAnalysisReportModels(options), layout: createAnalysisReportLayout({ canvas: () => ({ getContext: () => context }), wrap }), config, context };
}

test("analysis report filename and list/stat formats retain limits and numeric conventions", async () => {
  const { models: m } = await reportFixture();
  assert.equal(m.filename(null, null), "threadline-analysis-account-a-vs-account-b-2026-10-14.pdf");
  assert.equal(m.filename({ profile: { handle: "a/b test" } }, { profile: { handle: "b.test" } }), "threadline-analysis-a-b-test-vs-b.test-2026-10-14.pdf");
  assert.deepEqual(m.list(null), ["analysisPatternsNoData{}"]); assert.deepEqual(m.stats("bad"), ["analysisPatternsNoData{}"]);
  assert.equal(m.list(Array.from({ length: 10 }, () => ({ label: "word", share: 0.1 }))).length, 8);
  assert.deepEqual(m.stats([{ labelKey: "num", value: 2, formatter: "number" }, { label: "share", value: 0.5 }], "mixed"), ["num{}: 2.00", "share: 50%"]);
});

test("analysis report metrics and scores distinguish unavailable and zero Delta", async () => {
  const { models: m } = await reportFixture(); assert.deepEqual(m.metrics(null), []); assert.deepEqual(m.scores(null), []);
  const result = { score: 42, metricRows: [], burrowsDelta: { delta: NaN }, moderationSimilarity: null };
  assert.deepEqual(m.metrics(result), [{ label: "Burrows's Delta", left: "-", right: "-", diff: "-" }]);
  assert.equal(m.scores(result).length, 13); assert.equal(m.scores(result)[0].value, "42/100"); assert.equal(m.scores(result)[0].accent, true);
  assert.equal(m.scores(result).at(-1).label, "analysisSimilarityModerationUnavailable{}");
  result.burrowsDelta = { delta: 0, similarity: 1, chunkCount: 4 }; result.moderationSimilarity = 0;
  assert.equal(m.metrics(result)[0].left, "0.00"); assert.equal(m.metrics(result)[0].right, "100%");
  assert.ok(m.metrics(result)[0].diff.includes('"count":4')); assert.ok(m.scores(result)[2].label.includes('"value":"0.00"'));
});

test("analysis report paired patterns retain missing-account and bounded media/profile samples", async () => {
  const { models: m } = await reportFixture(); const { normalizer } = await engines();
  const account = normalizer.normalize({ posts: [{ text: "one two three" }] });
  account.markers.topMentions = Array.from({ length: 9 }, () => ({ did: "a" })); account.corpus.wordLengthProfile = Array.from({ length: 10 }, () => ({ label: "3", share: 1 }));
  const corpus = m.corpus(account, null); assert.equal(corpus.length, 12); assert.deepEqual(corpus[0].right.lines, []);
  assert.deepEqual(corpus[8].right.lines, ["analysisAccountBEmpty{}"]); assert.equal(corpus[8].left.barEntries.length, 8);
  assert.equal(corpus[7].left.lines[0], "analysisPdfPostStartsLabel{}"); assert.ok(corpus[7].left.lines.includes("analysisPdfPostEndsLabel{}"));
  const network = m.network(account, null); assert.equal(network.length, 7); assert.equal(network[0].left.profileEntries.length, 6);
  assert.deepEqual(network[0].right.lines, []); assert.equal(network[6].left.lines[0], "analysisNetworkMediaSimilarity{}: 0%");
});

test("analysis report geometry measures profiles, bars, score accents and info minima", async () => {
  const { layout: l, context } = await reportFixture();
  const text = { title: "title", lines: ["line"] }; const base = l.pattern(context, 1, 200, text);
  assert.ok(l.pattern(context, 1, 200, { ...text, profileEntries: [{}, {}] }) > base);
  assert.ok(l.pattern(context, 1, 200, { ...text, barEntries: [{}, {}] }) > base);
  const score = l.score(context, 1, 100, { label: "score", value: "1/100", accent: true });
  assert.deepEqual(score.lines, ["score: 1/100"]); assert.ok(context.font.startsWith("700"));
  assert.equal(l.info(context, 1, 100, "", 8, 90).height, 90); assert.equal(l.heatmap(1, 0), 12); assert.equal(l.heatmap(2, 12), 352);
});

test("analysis report pattern pagination keeps oversize rows, exact boundaries and empty input", async () => {
  const { layout: l, context } = await reportFixture(); const row = { left: { title: "A", lines: [] }, right: { title: "B", lines: [] } };
  const height = l.pattern(context, 1, 190, row.left); assert.deepEqual(l.patterns(1, 400, 20, 200, []), []);
  assert.equal(l.patterns(1, 400, 20, height * 2 + 14, [row, row]).length, 1);
  assert.equal(l.patterns(1, 400, 20, height * 2 + 13, [row, row]).length, 2);
  const pages = l.patterns(1, 400, 20, 1, [row, row]); assert.equal(pages.length, 2); assert.equal(pages.flat().length, 2);
});

test("analysis report table measurement and pagination preserve wrapped rows and width shares", async () => {
  const { layout: l, context } = await reportFixture(); const row = { label: "label", left: "A", right: "B", diff: "x" };
  const columns = { label: 0.4, value: 0.2, diff: 0.2 }; const empty = l.table(1, 400, 300, [], columns);
  assert.deepEqual(empty.pages, []); assert.equal(empty.widths.label, 364 * 0.4);
  const measured = l.rows(context, 1, [row, { ...row, label: "long ".repeat(100) }], { label: 20, value: 20, diff: 20 });
  assert.ok(measured[1].height > measured[0].height); assert.equal(measured[0].labelLines[0], "label");
  const pages = l.table(1, 400, 120, Array(10).fill(row), columns).pages;
  assert.equal(pages.flat().length, 10); assert.ok(pages.length > 1);
});

/** Creates test controls and a controller with observable dependencies. @returns {Promise<object>} Controller, mutable state, controls and call log. */
async function controllerFixture() {
  const { createAnalysisController, isExpectedAnalysisAccountError } = await importProjectModule("js/tools/analysis-controller.js");
  const state = { accounts: [], authDid: "viewer", auth: "viewer.test", loading: false, status: "", accountA: null, accountB: null,
    comparison: null, requestToken: 0, validationTokens: { a: 0, b: 0 } };
  const elements = {};
  for (const name of ["inputA", "inputB", "range", "limit", "replies", "quotes", "status", "noteA", "noteB", "loadA", "loadB", "ownA", "ownB", "compare", "reset", "exportPdf"]) {
    elements[name] = { value: "", checked: false, disabled: false, textContent: "", hidden: true,
      /** Records custom validity. @param {string} message - Validity message. @returns {void} */
      setCustomValidity(message) { this.validity = message; } };
  }
  const calls = []; let locale = "en";
  const options = { state, t: (key, params = {}) => key + JSON.stringify(params), locale: () => locale,
    actor: (value) => String(value || "").trim().replace(/^@+/, ""), serialize: (value) => value, normalize: (value) => value || null,
    needsRefresh: (value) => value?.legacy === true, compare: (a, b) => ({ score: 42, labelKey: "label", confidenceKey: "confidence", a, b }),
    request: async (type, payload, config) => { calls.push([type, payload, config]); return { profile: { handle: payload.actor }, handle: payload.actor }; },
    persist: async () => { calls.push(["persist"]); }, render: () => { calls.push(["render"]); }, error: (...args) => { calls.push(["error", ...args]); },
    renderResult: () => { calls.push(["result"]); }, busy: (...args) => { calls.push(["busy", ...args]); }, exportReport: async () => { calls.push(["export"]); },
    note: (node, message) => { if (node) { node.textContent = message; node.hidden = !message; } }, report: (error) => { calls.push(["report", error]); } };
  const controller = createAnalysisController(elements, options);
  return { controller, state, elements, calls, options, expected: isExpectedAnalysisAccountError,
    setLocale: (value) => { locale = value; } };
}

test("analysis controller formatting, active account and options use current adapters", async () => {
  const { controller: c, state, elements: e, setLocale } = await controllerFixture();
  assert.equal(c.activeActor(), "viewer.test"); state.accounts = [{ did: "viewer", handle: " @saved.test " }]; assert.equal(c.activeActor(), "saved.test");
  state.accounts[0] = { did: "viewer", identifier: "id.test" }; assert.equal(c.activeActor(), "id.test");
  state.accounts = []; state.auth = ""; assert.equal(c.activeActor(), "viewer");
  assert.equal(c.number(NaN), "0.00"); assert.equal(c.percent(0.5), "50.0%"); setLocale("de"); assert.equal(c.number(1.5, 1), "1,5");
  e.range.value = "-3"; e.limit.value = "9000"; e.replies.checked = true;
  assert.deepEqual(c.settings(), { rangeDays: 0, limit: 2000, includeReplies: true, includeQuotes: false });
  e.limit.value = "20"; assert.equal(c.settings().limit, 100); e.limit.value = "bad"; assert.equal(c.settings().limit, 500);
  c.status("  ready  "); assert.equal(state.status, "ready"); assert.equal(e.status.textContent, "ready");
  c.status(""); assert.equal(state.status, "analysisStatusIdle{}");
});

test("analysis controller controls respond to auth, busy state and available results", async () => {
  const { controller: c, state, elements: e } = await controllerFixture(); c.controls();
  assert.equal(e.loadA.disabled, true); assert.equal(e.compare.disabled, true); assert.equal(e.ownA.disabled, false);
  e.inputA.value = "@a"; e.inputB.value = "b"; c.controls(); assert.equal(e.compare.disabled, false); assert.equal(e.reset.disabled, false);
  state.comparison = { score: 1 }; c.controls(); assert.equal(e.exportPdf.disabled, false);
  state.loading = true; c.controls(); assert.equal(e.loadA.disabled, true); assert.equal(e.compare.textContent, "analysisLoadingButton{}");
  state.loading = false; state.auth = ""; c.controls(); assert.equal(e.ownB.disabled, true); assert.equal(e.exportPdf.disabled, false);
});

test("analysis controller snapshots restore derived results and invalidate legacy comparisons", async () => {
  const { controller: c, state, elements: e } = await controllerFixture();
  e.inputA.value = " a "; state.accountA = { profile: { handle: "a" } }; state.accountB = { profile: { handle: "b" } };
  state.comparison = { score: -2, labelKey: " label ", confidenceKey: " confidence ", ignored: true };
  const stored = c.snapshot(); assert.equal(stored.inputs.accountA, "a"); assert.deepEqual(stored.comparison, { score: 0, labelKey: "label", confidenceKey: "confidence" });
  c.restore({ ...stored, options: { rangeDays: "bad", limit: null, includeQuotes: true } });
  assert.equal(e.range.value, "90"); assert.equal(e.limit.value, "0"); assert.equal(e.quotes.checked, true); assert.equal(state.comparison.score, 42);
  c.restore({ ...stored, accountA: { legacy: true } }); assert.equal(state.comparison, null); assert.equal(state.status, "analysisNetworkReloadNeeded{}");
  c.restore("invalid"); assert.equal(state.accountA, null); assert.equal(e.inputA.value, ""); assert.equal(e.limit.value, "500");
});

test("analysis controller validation checks actors and handles empty or expected failures inline", async () => {
  const { controller: c, state, elements: e, calls, options } = await controllerFixture();
  assert.equal(await c.validate("a"), null); assert.equal(calls.length, 0);
  e.inputA.value = " @alpha "; const result = await c.validate("a", { silentSuccess: false });
  assert.equal(result.handle, "alpha"); assert.equal(e.inputA.value, "alpha"); assert.equal(calls[0][2].timeoutMs, 30000);
  assert.ok(state.status.includes('"slot":"A"')); assert.equal(e.inputA.validity, "");
  options.request = async () => { throw new Error("missing"); }; e.inputB.value = "b";
  assert.equal(await c.validate("b"), null); assert.equal(e.inputB.validity, "missing"); assert.equal(e.noteB.hidden, false);
  state.auth = ""; assert.equal(await c.validate("b"), null);
});

test("analysis controller validation suppresses superseded success and failure responses", async () => {
  const { controller: c, elements: e, options } = await controllerFixture(); const pending = [];
  options.request = () => new Promise((resolve, reject) => { pending.push({ resolve, reject }); });
  e.inputA.value = "first"; const first = c.validate("a"); e.inputA.value = "second"; const second = c.validate("a");
  pending[1].resolve({ handle: "second.test" }); await second; pending[0].resolve({ handle: "first.test" }); assert.equal(await first, null);
  assert.equal(e.inputA.value, "second.test");
  const third = c.validate("a"); const fourth = c.validate("a"); pending[3].resolve({ handle: "fourth.test" }); await fourth;
  pending[2].reject(new Error("old error")); assert.equal(await third, null); assert.equal(e.inputA.validity, "");
});

test("analysis controller loads normalize actors, report progress and suppress stale data", async () => {
  const { controller: c, state, elements: e, options, calls } = await controllerFixture();
  e.inputA.value = "@a"; await c.load("a"); assert.equal(state.accountA.profile.handle, "a"); assert.equal(state.loading, false);
  assert.equal(calls[0][2].timeoutMs, 180000); assert.deepEqual(calls.filter((item) => item[0] === "persist").length, 1);
  let finish; let progress; options.request = (type, payload, config) => { progress = config.onProgress; return new Promise((resolve) => { finish = resolve; }); };
  e.inputB.value = "b"; const pending = c.load("b"); progress({ step: " step ", detail: " detail " }); assert.ok(state.status.endsWith("step - detail"));
  c.reset(); const status = state.status; progress({ detail: "old" }); assert.equal(state.status, status);
  finish({ profile: { handle: "old" } }); await pending; assert.equal(state.accountB, null); assert.equal(state.loading, false);
  await assert.rejects(c.loadAccount("a", { actor: "" }), /analysisAccountAMissing/);
});

test("analysis controller compares sequential loads and resets options and request ownership", async () => {
  const { controller: c, state, elements: e, calls } = await controllerFixture();
  await c.compare(); assert.equal(calls[0][0], "error"); e.inputA.value = "a"; await c.compare(); assert.ok(calls.at(-1)[1].includes("analysisAccountBMissing"));
  e.inputB.value = "b"; await c.compare(); assert.deepEqual(calls.filter((item) => item[0] === "LOAD_ANALYSIS_ACCOUNT").map((item) => item[1].actor), ["a", "b"]);
  assert.equal(state.comparison.score, 42); assert.equal(state.loading, false);
  const token = state.requestToken; c.reset(); assert.equal(state.requestToken, token + 1); assert.equal(state.accountA, null); assert.equal(state.comparison, null);
  assert.equal(e.inputA.value, ""); assert.equal(e.range.value, "90"); assert.equal(e.limit.value, "500"); assert.equal(e.replies.checked, false);
});

test("analysis controller load and comparison failures distinguish expected errors and restore busy state", async () => {
  const { controller: c, state, elements: e, options, calls, expected } = await controllerFixture();
  assert.equal(expected(null), false); assert.equal(expected({ details: { code: " ANALYSIS_ACCOUNT_NOT_FOUND " } }), true);
  e.inputA.value = "a"; e.inputB.value = "b"; const missing = new Error("missing"); missing.details = { code: "ANALYSIS_ACCOUNT_MISSING" };
  options.request = async () => { throw missing; }; await c.load("a"); assert.equal(state.loading, false); assert.equal(e.noteA.textContent, "missing");
  assert.equal(calls.filter((item) => item[0] === "report").length, 0);
  options.request = async () => { throw new Error("network"); }; await c.compare(); assert.equal(state.loading, false);
  assert.equal(e.noteA.textContent, "network"); assert.equal(e.noteB.textContent, "network"); assert.equal(calls.filter((item) => item[0] === "report").length, 1);
  state.loading = true; const before = calls.length; await c.load("a"); await c.compare(); assert.equal(calls.length, before);
});

/** Creates deterministic analysis adapters without browser/global state. @param {string} locale - Locale. @returns {Promise<object>} Modules and configured analyzers. */
async function engines(locale = "en") {
  const config = await importProjectModule("js/tools/analysis-config.js");
  const corpusModule = await importProjectModule("js/tools/analysis-corpus.js");
  const similarity = await importProjectModule("js/tools/analysis-similarity.js");
  const temporalModule = await importProjectModule("js/tools/analysis-temporal.js");
  const stylometryModule = await importProjectModule("js/tools/analysis-stylometry.js");
  const corpus = corpusModule.createAnalysisCorpusAnalyzer({ locale: () => locale, functionWords: config.ANALYSIS_FUNCTION_WORDS, numberWords: config.ANALYSIS_NUMBER_WORDS });
  const temporal = temporalModule.createAnalysisTemporalAnalyzer({ locale: () => locale, now: () => Date.parse("2026-10-14T12:00:00Z"),
    shares: similarity.shareArray, gapBuckets: config.ANALYSIS_TEMPORAL_GAP_BUCKETS, weekdayAnchors: config.ANALYSIS_WEEKDAY_ANCHORS, weekdayFallbacks: config.ANALYSIS_WEEKDAY_FALLBACKS });
  const stylometry = stylometryModule.createAnalysisStylometryAnalyzer({ locale: () => locale, corpus: corpus.create });
  const accounts = await importProjectModule("js/tools/analysis-accounts.js");
  const comparisons = await importProjectModule("js/tools/analysis-comparison.js");
  const normalizer = accounts.createAnalysisAccountNormalizer({ corpus: corpus.create, temporal: temporal.profile });
  const comparisonOptions = { metrics: config.ANALYSIS_METRIC_DEFINITIONS,
    mapSimilarity: similarity.cosineSimilarityFromMaps, arraySimilarity: similarity.cosineSimilarityFromArrays,
    jaccard: similarity.jaccardSimilarityFromSets, overlap: similarity.overlapSummaryFromSets,
    frequencies: similarity.frequencyMapFromEntries, stylometry: stylometry.compare, proximity: temporal.proximity };
  const comparator = comparisons.createAnalysisAccountComparator(comparisonOptions);
  return { config, corpus, similarity, temporal, stylometryModule, stylometry, accounts, normalizer, comparisons, comparisonOptions, comparator };
}

test("analysis account normalization supports worker, legacy and invalid records without mutation", async () => {
  const { normalizer } = await engines();
  for (const input of [null, undefined, false, "bad"]) { assert.equal(normalizer.normalize(input), null); }
  const source = { profile: { did: " did:a ", handle: " a.test " }, posts: [
    { text: " hello\n world ", createdAt: "2026-10-12T00:00Z" }, { text: "" } ],
    network: { followers: [{ did: " follower " }, { did: "" }], follows: [{ did: "follow" }], mutes: [] } };
  const before = JSON.stringify(source); const account = normalizer.normalize(source);
  assert.equal(account.profile.displayName, "a.test"); assert.equal(account.profile.did, "did:a");
  assert.deepEqual(account.texts, ["hello world"]); assert.equal(account.corpus.wordCount, 2);
  assert.equal(account.stats.scannedPosts, 2); assert.equal(account.filters.limit, 2);
  assert.deepEqual([...account.network.followerDids], ["follower"]); assert.deepEqual([...account.network.followDids], ["follow"]);
  assert.equal(account.network.blocks, null); assert.deepEqual(account.network.mutes, []);
  assert.equal(account.network.loadState, "legacy"); assert.equal(JSON.stringify(source), before);
  const empty = normalizer.normalize({}); assert.equal(empty.filters.limit, 1); assert.equal(empty.corpus.wordCount, 0);
  const full = normalizer.normalize({ network: { followerDids: [], followDids: [], mutualDids: [] } });
  assert.equal(full.network.loadState, "complete");
  assert.equal(normalizer.normalize({ network: { loadState: "partial" } }).network.loadState, "partial");
});

test("analysis account storage round trips derived values and distinguishes absent moderation data", async () => {
  const { accounts, normalizer } = await engines();
  assert.equal(accounts.getPersistableAnalysisAccount(null), null);
  assert.equal(accounts.getPersistableAnalysisAccount("invalid"), null);
  const normalized = normalizer.normalize({ profile: { handle: "a.test" }, posts: [{ text: " one  two ", uri: " uri ", cid: "cid" }],
    network: { loadState: "failed", warnings: [" warning "], followerDids: ["a", "a", ""], mutes: [], blocks: [{ did: " b " }] } });
  const stored = accounts.getPersistableAnalysisAccount(normalized);
  assert.deepEqual(stored.network.followerDids, ["a"]); assert.deepEqual(stored.network.blocks, [{ did: "b" }]);
  assert.deepEqual(stored.network.mutes, []); assert.deepEqual(stored.network.warnings, ["warning"]);
  assert.equal(stored.posts[0].uri, "uri"); assert.equal(stored.posts[0].text, "one  two");
  assert.equal(stored.corpus, undefined); assert.equal(stored.temporal, undefined);
  const restored = normalizer.normalize(JSON.parse(JSON.stringify(stored)));
  assert.deepEqual(restored.corpus, normalized.corpus); assert.deepEqual(restored.network, normalized.network);
  assert.deepEqual(restored.temporal, normalized.temporal);
});

test("analysis legacy refresh detection retains stored network field precedence", async () => {
  const { accounts } = await engines(); const refresh = accounts.analysisAccountNeedsNetworkRefresh;
  for (const input of [null, 3, {}, { profile: { followersCount: 4 } }]) { assert.equal(refresh(input), false); }
  assert.equal(refresh({ profile: { followersCount: 4 }, network: {} }), true);
  for (const key of ["loadState", "followerDids", "followDids", "mutualDids", "warnings"]) {
    assert.equal(refresh({ profile: { followsCount: 1 }, network: { [key]: null } }), false);
  }
});

test("analysis account comparison preserves metric rows, direct relationships and moderation availability", async () => {
  const { normalizer, comparator, config } = await engines();
  assert.equal(comparator.compare(null, null), null);
  const left = normalizer.normalize({ profile: { did: "a" }, posts: [{ text: "one two three!" }],
    network: { followDids: ["b"], followerDids: ["shared"], mutes: [], blocks: [] } });
  const right = normalizer.normalize({ profile: { did: "b" }, posts: [{ text: "one two three!" }],
    network: { followDids: ["a"], followerDids: ["shared"], mutes: [], blocks: [] } });
  const result = comparator.compare(left, right);
  assert.ok(Math.abs(result.cosineSimilarity - 1) < 1e-12); assert.equal(result.jaccardSimilarity, 1);
  assert.deepEqual(result.directRelationship, { leftFollowsRight: true, rightFollowsLeft: true });
  assert.equal(result.moderationSimilarity, 1); assert.equal(result.confidenceKey, "analysisConfidenceLow");
  assert.equal(result.metricRows.length, config.ANALYSIS_METRIC_DEFINITIONS.length);
  assert.ok(result.metricRows.every((row) => row.normalizedDifference === 0));
  right.network.blocks = null; assert.equal(comparator.compare(left, right).blockOverlap, null);
  assert.equal(comparator.compare(left, right).moderationSimilarity, 1);
  right.network.mutes = null; assert.equal(comparator.compare(left, right).moderationSimilarity, null);
  right.network.blocks = []; assert.equal(comparator.compare(left, right).moderationSimilarity, 1);
  assert.ok(Number.isFinite(result.score));
});

test("analysis comparison score labels and sample confidence keep exact thresholds", async () => {
  const { normalizer, comparisons, comparisonOptions } = await engines();
  const account = normalizer.normalize({});
  for (const [value, label] of [[1, "analysisSimilarityIdentical"], [0.79, "analysisSimilarityHigh"],
    [0.60, "analysisSimilarityMedium"], [0.1, "analysisSimilarityLow"]]) {
    const engine = comparisons.createAnalysisAccountComparator({ ...comparisonOptions, metrics: [],
      mapSimilarity: () => value, arraySimilarity: () => value, jaccard: () => value,
      overlap: () => ({ jaccard: value }), stylometry: () => ({ similarity: value }), proximity: () => value });
    account.markers.mediaPostShare = 0;
    assert.equal(engine.compare(account, account).labelKey, label);
  }
  for (const [count, label] of [[1999, "analysisConfidenceLow"], [2000, "analysisConfidenceMedium"], [4999, "analysisConfidenceMedium"], [5000, "analysisConfidenceHigh"]]) {
    account.corpus.wordCount = count; const result = comparisons.createAnalysisAccountComparator(comparisonOptions).compare(account, account);
    assert.equal(result.confidenceKey, label);
  }
});

test("analysis configuration preserves multilingual lexicons and inclusive UTC gap boundaries", async () => {
  const { config } = await engines();
  for (const word of ["und", "and", "et"]) { assert.ok(config.ANALYSIS_FUNCTION_WORDS.includes(word)); }
  for (const word of ["drei", "three", "trois"]) { assert.ok(config.ANALYSIS_NUMBER_WORDS.has(word)); }
  assert.deepEqual(config.ANALYSIS_TEMPORAL_GAP_BUCKETS.map((bucket) => bucket.maxMinutes), [10, 60, 360, 1440, Infinity]);
  assert.equal(config.ANALYSIS_WEEKDAY_ANCHORS.length, 7); assert.deepEqual(config.ANALYSIS_WEEKDAY_FALLBACKS, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  assert.equal(config.ANALYSIS_NETWORK_PATTERNS.length, 7); assert.equal(config.ANALYSIS_CORPUS_PATTERNS.length, 12);
  assert.deepEqual(config.ANALYSIS_NETWORK_PATTERNS.filter((entry) => entry.resolvedProfiles).map((entry) => entry.key), ["topMentions", "topReplyTargets", "topQuoteTargets"]);
  assert.equal(config.ANALYSIS_NETWORK_PATTERNS.at(-1).kind, "media");
  assert.deepEqual(config.ANALYSIS_CORPUS_PATTERNS[7].keys, ["postStarts", "postEnds"]);
  assert.equal(config.ANALYSIS_CORPUS_PATTERNS[5].emptyKey, "analysisPatternsNoEmoji");
  assert.equal(config.ANALYSIS_CORPUS_PATTERNS.at(-1).formatter, "mixed");
});

test("analysis table models preserve network load and moderation availability branches", async () => {
  const { normalizer, comparator, similarity } = await engines();
  const { createAnalysisTableModels } = await importProjectModule("js/tools/analysis-table-models.js");
  const options = { t: (key, params = {}) => key + JSON.stringify(params), number: String, percent: (value) => String((Number(value) || 0) * 100) + "%", count: String, similarity: similarity.cosineSimilarityFromArrays };
  const models = createAnalysisTableModels(options);
  for (const invalid of [null, undefined, false]) { assert.deepEqual(models.network(invalid, null, null), []); }
  const left = normalizer.normalize({ profile: { did: "a" }, network: { loadState: "complete", followDids: ["b"], followerDids: ["common"], mutualDids: [], mutes: [], blocks: [], muteBlockSource: "saved_account" }, markers: { topMentions: [{ share: 0.4 }] } });
  const right = normalizer.normalize({ profile: { did: "b" }, network: { loadState: "complete", followerDids: ["common"], followDids: [], mutualDids: [] } });
  const comparison = comparator.compare(left, right);
  const rows = models.network(left, right, comparison);
  assert.equal(rows.length, 13); assert.equal(rows[0].left, "1"); assert.equal(rows[0].diff, "1 / 1 · 100%");
  assert.equal(rows[3].left, "analysisNetworkRelationYes{}"); assert.equal(rows[3].right, "analysisNetworkRelationNo{}");
  assert.equal(rows[4].left, "analysisNetworkModerationAvailable{}"); assert.equal(rows[4].right, "analysisNetworkModerationUnavailable{}");
  assert.equal(rows[4].diff, "analysisNetworkNotAvailable{}"); assert.equal(rows[6].left, "40%");
  comparison.muteOverlap = { sharedCount: 0, unionCount: 0, jaccard: 1 };
  assert.equal(models.network(left, right, comparison)[4].diff, "0 / 0 · 100%");
  right.network.loadState = "partial";
  const partial = models.network(left, right, comparison);
  assert.equal(partial[0].left, "analysisNetworkNotAvailable{}"); assert.equal(partial[0].diff, "analysisNetworkLoadIncomplete{}");
});

test("analysis temporal table models preserve empty, median, window and percentage formatting", async () => {
  const { createAnalysisTableModels } = await importProjectModule("js/tools/analysis-table-models.js");
  const { similarity } = await engines();
  const models = createAnalysisTableModels({ t: (key, params = {}) => key + JSON.stringify(params), number: (value, digits) => Number(value).toFixed(digits),
    percent: (value) => String((Number(value) || 0) * 100) + "%", count: String, similarity: similarity.cosineSimilarityFromArrays });
  const empty = models.temporal(null, null, null); assert.equal(empty.length, 5); assert.equal(empty[2].left, "-");
  assert.equal(empty[0].left, "analysisTemporalNoDataShort{}"); assert.ok(empty[4].left.includes('"count":5'));
  const account = { temporal: { hourShares: [1], weekdayShares: [1], gapShares: [1], topHourEntries: [{ label: "12:00", share: 0.5 }], topWeekdayEntries: [], medianGapMinutes: 10.5, activeHourCount: 1 } };
  const rows = models.temporal(account, account, { temporalProfileSimilarity: 0.75, temporalProximityScore: 1 });
  assert.equal(rows[0].left, "12:00 50%"); assert.ok(rows[0].diff.includes('"value":"100%"'));
  assert.ok(rows[2].left.includes('"value":"11"')); assert.ok(rows[3].diff.includes('"value":"75%"'));
  assert.ok(rows[4].diff.includes('"value":"100%"'));
  assert.equal(models.temporal("invalid", undefined, null)[2].left, "-");
});

test("analysis summary display models preserve fallbacks, translation parameters and preview state", async () => {
  const { buildAnalysisSummaryModel: model } = await importProjectModule("js/tools/analysis-rendering.js");
  const options = { t: (key, params = {}) => key + JSON.stringify(params), count: String, timestamp: (date) => "date:" + date };
  assert.deepEqual(model("A", null, options), { empty: "analysisAccountAEmpty{}" });
  assert.deepEqual(model("B", undefined, options), { empty: "analysisAccountBEmpty{}" });
  const account = { profile: { did: "a", handle: "", displayName: "", avatar: "avatar" }, filters: { rangeDays: 0 },
    posts: [], corpus: { wordCount: 0 }, stats: { pages: 0 } };
  const empty = model("B", account, options); assert.equal(empty.name, "a"); assert.equal(empty.handle, "a");
  assert.equal(empty.preview, "analysisSummaryNoPreview{}"); assert.equal(empty.stats.length, 4);
  account.profile.handle = "a.test"; account.posts = [{ createdAt: "2026-10-01" }]; account.filters.rangeDays = 30;
  const full = model("A", account, options); assert.equal(full.handle, "@a.test");
  assert.ok(full.preview.includes("date:2026-10-01")); assert.ok(full.stats[2].includes('"count":30'));
});

test("analysis result display models distinguish finite delta and insufficient samples", async () => {
  const { buildAnalysisResultModel: model } = await importProjectModule("js/tools/analysis-rendering.js");
  const options = { t: (key, params = {}) => key + JSON.stringify(params), number: String, percent: (value) => String(Number(value) || 0) };
  assert.equal(model(null, options), null); assert.equal(model(undefined, options), null);
  const result = model({ score: 87, labelKey: "high", confidenceKey: "medium", burrowsDelta: { delta: NaN } }, options);
  assert.equal(result.score, "87/100"); assert.equal(result.details.length, 8);
  assert.equal(result.details[0], "analysisSimilarityBurrowsDeltaUnavailable{}");
  const finite = model({ score: 100, burrowsDelta: { delta: 0, similarity: 1 } }, options);
  assert.ok(finite.details[0].includes('"value":"0"')); assert.ok(finite.details[0].includes('"score":"1"'));
});

test("analysis renderer contract supports absent hosts and reports missing templates", async () => {
  const { createAnalysisRenderer } = await importProjectModule("js/tools/analysis-rendering.js");
  const renderer = createAnalysisRenderer({ templates: {} }, { cloneTemplate: () => null });
  assert.deepEqual(Object.keys(renderer), ["tokens", "stats", "bars", "pattern", "accountCard", "summary", "result",
    "temporalSummary", "heatmap", "overlapHeatmap", "timeline", "profiles", "table", "metrics", "temporalAccount", "temporal", "patterns", "network"]);
  assert.doesNotThrow(() => { renderer.summary(null, null); renderer.result(null); renderer.metrics(null); renderer.temporal(null, null, null); renderer.network(null, null, null); renderer.patterns(null, null); });
  assert.throws(() => renderer.tokens([]), /Missing analysis template: tokens/);
  assert.throws(() => renderer.stats(null), /Missing analysis template: stats/);
});

test("analysis temporal summary model preserves empty and finite median labels", async () => {
  const { buildAnalysisTemporalSummaryModel: build } = await importProjectModule("js/tools/analysis-rendering.js");
  const options = { t: (key, args = {}) => key + JSON.stringify(args), number: (value, digits) => Number(value).toFixed(digits), count: String };
  assert.deepEqual(build(null, options), []); assert.deepEqual(build(undefined, options), []);
  const profile = { topHours: [], topWeekdays: [], medianGapMinutes: NaN, activeHourCount: 0 };
  const empty = build(profile, options); assert.equal(empty.length, 4); assert.equal(empty[0].value, "analysisTemporalNoDataShort{}");
  assert.equal(empty[2].value, "analysisTemporalNoDataShort{}"); assert.ok(empty[3].value.includes('"count":"0"'));
  profile.topHours = ["02:00", "03:00"]; profile.topWeekdays = ["Mon"]; profile.medianGapMinutes = 10.5;
  const full = build(profile, options); assert.equal(full[0].value, "02:00, 03:00"); assert.equal(full[1].value, "Mon");
  assert.ok(full[2].value.includes('"value":"11"'));
});

test("analysis resolved profile model preserves whitespace, deleted and identity fallbacks", async () => {
  const { buildAnalysisProfileModel: build } = await importProjectModule("js/tools/analysis-rendering.js");
  const options = { percent: (value) => String(value * 100) + "%" };
  const missing = build(null, options); assert.equal(missing.title, ""); assert.equal(missing.alt, "profile");
  assert.equal(missing.share, "0%"); assert.equal(missing.deleted, false);
  const full = build({ displayName: " Name ", handle: " a.test ", avatar: " url ", share: 0.5, deleted: true }, options);
  assert.equal(full.title, "Name"); assert.equal(full.handle, "@a.test"); assert.equal(full.avatar, "url");
  assert.equal(full.deleted, true); assert.equal(full.share, "50%");
  const whitespace = build({ handle: " ", did: " did:a " }, options); assert.equal(whitespace.handle, "did:a");
  assert.equal(build({ did: " ", label: " fallback " }, options).handle, "fallback");
});

test("analysis metric table model retains formatter selection and upper-only difference clamp", async () => {
  const { buildAnalysisMetricTableModel: build } = await importProjectModule("js/tools/analysis-rendering.js");
  const options = { t: (key) => key, number: (value, digits) => Number(value).toFixed(digits), percent: (value) => String(value * 100) + "%" };
  assert.deepEqual(build(null, options), []); assert.deepEqual(build([], options), []); assert.deepEqual(build("bad", options), []);
  assert.deepEqual(build([{ labelKey: "one", leftValue: 2, rightValue: 3, normalizedDifference: 2 },
    { labelKey: "two", formatter: "percent", leftValue: 0.1, rightValue: 0.2, normalizedDifference: -0.1 }], options),
    [{ label: "one", left: "2.00", right: "3.00", diff: "100%" }, { label: "two", left: "10%", right: "20%", diff: "-10%" }]);
});

test("analysis corpus retains token, frequency and denominator rules including empty inputs", async () => {
  const { corpus } = await engines(); const input = ["hello hello world!"];
  const result = corpus.create(input); assert.deepEqual(result.words, ["hello", "hello", "world"]);
  assert.equal(result.wordCount, 3); assert.equal(result.sentenceCount, 1); assert.equal(result.letterCount, 15);
  assert.deepEqual(result.topWords, [{ label: "hello", count: 2, share: 2 / 3 }]);
  assert.equal(result.frequency.trigrams.get("hel"), 2); assert.equal(result.metrics.avgWordLength, 5); assert.equal(result.metrics.uniqueWordShare, 2 / 3);
  assert.deepEqual(input, ["hello hello world!"]);
  for (const value of [[], null, "not an array", [null, " "]]) {
    const empty = corpus.create(value); assert.equal(empty.wordCount, 0); assert.equal(empty.metrics.avgWordLength, 0);
    assert.equal(empty.frequency.words.size, 0); assert.ok(empty.wordLengthProfile.every((entry) => entry.share === 0));
  }
});

test("analysis corpus preserves Unicode, raw post boundaries, marker counts and locale ranking", async () => {
  for (const locale of ["de", "en", "fr"]) {
    const { corpus } = await engines(locale);
    const result = corpus.create(["l\u2019ete rock-n-roll und and et \ud83d\ude00 23 two https://example.test", "#tag @user.test\n\nnext?"]);
    assert.ok(result.words.includes("l\u2019ete")); assert.ok(result.words.includes("rock-n-roll")); assert.equal(result.emojiCount, 1);
    assert.equal(result.text.includes("https://"), false); assert.equal(result.linkBehavior.find((item) => item.labelKey === "analysisBehaviorLinks").share, 0.5);
    assert.equal(result.frequency.functionWords.get("und"), 1); assert.equal(result.frequency.functionWords.get("and"), 1); assert.equal(result.frequency.functionWords.get("et"), 1);
    assert.equal(result.structureProfile.find((entry) => entry.labelKey === "analysisStructureBlankLines").value, 0.5);
    assert.deepEqual(corpus.topEntries(new Map([["b", 3], ["a", 3], ["c", 1]]), 0, 2, 2), [{ label: "a", count: 3, share: 3 }, { label: "b", count: 3, share: 3 }]);
  }
});

test("analysis similarity keeps vector/map, empty-set and directional overlap contracts", async () => {
  const { similarity: s } = await engines();
  assert.equal(s.cosineSimilarityFromMaps(new Map(), new Map()), 0);
  assert.ok(Math.abs(s.cosineSimilarityFromMaps(new Map([["a", 2], ["b", 1]]), new Map([["a", 2], ["b", 1]])) - 1) < 1e-12);
  assert.equal(s.cosineSimilarityFromMaps(new Map([["a", 1]]), new Map([["b", 1]])), 0);
  assert.equal(s.cosineSimilarityFromArrays([], []), 0); assert.equal(s.cosineSimilarityFromArrays([1, 0], [0, 1]), 0);
  assert.equal(s.cosineSimilarityFromArrays([1], [1, 0]), 1); assert.equal(s.cosineSimilarityFromArrays(["bad"], [1]), 0);
  assert.equal(s.jaccardSimilarityFromSets(null, null), 1); assert.equal(s.jaccardSimilarityFromSets(["a"], []), 0);
  assert.equal(s.intersectionCountFromSets(["a", "a", "b"], ["b", "c"]), 1);
  assert.deepEqual(s.overlapSummaryFromSets(["a", "b"], ["b", "c"]), { leftCount: 2, rightCount: 2, sharedCount: 1, unionCount: 3, jaccard: 1 / 3, leftShare: 0.5, rightShare: 0.5 });
  assert.deepEqual(s.overlapSummaryFromSets([], []), { leftCount: 0, rightCount: 0, sharedCount: 0, unionCount: 0, jaccard: 1, leftShare: 0, rightShare: 0 });
});

test("analysis frequency entries and shares preserve fallback counts and overwrite semantics", async () => {
  const { similarity: s } = await engines();
  const entries = [{ identifier: " a ", count: 9 }, { did: "a", count: 3 }, { handle: "b", count: 0, share: 0.2 }, { label: "c", count: -2 }, {}, null];
  assert.deepEqual([...s.frequencyMapFromEntries(entries)], [["a", 3], ["b", 200], ["c", 0]]);
  assert.equal(s.frequencyMapFromEntries(null).size, 0); assert.deepEqual(s.shareArray([0, 0]), [0, 0]);
  assert.deepEqual(s.shareArray([2, 2]), [0.5, 0.5]); assert.deepEqual(s.shareArray(["2", "bad"]), [1, 0]);
});

test("analysis temporal profiles retain sorted UTC buckets, upper median and recent-day clock", async () => {
  const { temporal: t } = await engines();
  const posts = [{ createdAt: "2026-10-12T01:10:00Z" }, { createdAt: "2026-10-12T00:00:00Z" }, { createdAt: "2026-10-12T00:10:00Z" }, { createdAt: "invalid" }];
  const profile = t.profile(posts); assert.equal(profile.totalPosts, 3); assert.equal(profile.hourCounts[0], 2); assert.equal(profile.hourCounts[1], 1);
  assert.equal(profile.weekdayCounts[0], 3); assert.equal(profile.heatmap[0][0], 3); assert.deepEqual(profile.gapCounts, [1, 1, 0, 0, 0]);
  assert.equal(profile.medianGapMinutes, 60); assert.deepEqual(profile.topHours, ["00:00", "01:00"]);
  assert.equal(profile.recentDays.length, 30); assert.equal(profile.recentDays.at(-1).label, "12.10."); assert.equal(profile.recentDays.at(-1).hours.length, 3);
  assert.equal(posts[0].createdAt, "2026-10-12T01:10:00Z");
  const empty = t.profile(null); assert.equal(empty.totalPosts, 1); assert.ok(Number.isNaN(empty.medianGapMinutes)); assert.equal(empty.recentDays.at(-1).label, "14.10.");
  assert.ok(empty.hourShares.every((value) => value === 0)); assert.equal(t.profile([{}]).timestamps.length, 0);
});

test("analysis temporal labels/histograms preserve ties, chronology and locale fallback", async () => {
  for (const locale of ["de", "en", "fr"]) {
    const { temporal: t, config } = await engines(locale);
    assert.equal(t.weekdayLabel(0), new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(config.ANALYSIS_WEEKDAY_ANCHORS[0])));
    assert.equal(t.hourLabel(2), "02:00"); assert.deepEqual(t.topLabels([5, 0, 4, 6], String, 2), ["3", "0"]);
    assert.deepEqual(t.topChronologicalLabels([5, 0, 4, 6], String, 2), ["0", "3"]);
    assert.deepEqual(t.topChronologicalEntries([5, 0, 4, 6], String, 2), [{ label: "0", share: 5 / 15 }, { label: "3", share: 6 / 15 }]);
    assert.deepEqual(t.topLabels([0, 0]), []); assert.deepEqual(t.topChronologicalEntries([], String), []);
  }
  const { temporal: invalid } = await engines("invalid_locale"); assert.equal(invalid.weekdayLabel(0), "Mon"); assert.equal(invalid.weekdayLabel(99), "");
});

test("analysis temporal comparisons preserve inclusive windows and many-to-one UTC overlap", async () => {
  const { temporal: t } = await engines(); const base = Date.parse("2026-10-12T00:00:00Z");
  assert.equal(t.proximity(null, []), 0); assert.equal(t.proximity([base], [base + 300000], 5), 1);
  assert.equal(t.proximity([base], [base + 300000], 4), 0); assert.equal(t.proximity([base, base + 600000], [base + 300000], 5), 1);
  const grid = t.overlapHeatmap([base, base + 600000], [base + 300000], 5); assert.equal(grid.length, 12); assert.equal(grid[0].length, 7); assert.equal(grid[0][0], 2);
  assert.equal(t.overlapHeatmap([], null).flat().reduce((sum, value) => sum + value, 0), 0);
  const midnight = t.overlapHeatmap([Date.parse("2026-10-11T23:58:00Z")], [Date.parse("2026-10-12T00:02:00Z")], 5); assert.equal(midnight[0][0], 1);
});

test("analysis stylometry chunks retain all tails and reject unsafe chunk limits", async () => {
  const { stylometryModule: s } = await engines();
  assert.deepEqual([...s.buildAnalysisWordRateMap(["a", "a", "b"], ["a", "b", "c"])], [["a", 2 / 3], ["b", 1 / 3], ["c", 0]]);
  assert.deepEqual([...s.buildAnalysisWordRateMap(null, ["a"])], [["a", 0]]);
  const texts = ["one two", "three four", "five six", "seven eight"];
  assert.deepEqual(s.splitAnalysisTextsIntoWordChunks(texts, 2, 2), ["one two", "three four\nfive six\nseven eight"]);
  assert.deepEqual(s.splitAnalysisTextsIntoWordChunks([null, "123"], 2), []); assert.deepEqual(s.splitAnalysisTextsIntoWordChunks(null), []);
  for (const limit of [0, -1, NaN, "bad"]) { assert.throws(() => s.splitAnalysisTextsIntoWordChunks(texts, 2, limit), RangeError); }
});

test("analysis Burrows delta retains insufficient-sample and nonzero-variance comparison behavior", async () => {
  const { corpus, stylometry } = await engines();
  const short = { texts: ["one two"], corpus: corpus.create(["one two"]) }; const insufficient = stylometry.compare(short, short);
  assert.ok(Number.isNaN(insufficient.delta)); assert.equal(insufficient.similarity, 0); assert.equal(insufficient.featureCount, 2);
  const posts = ["alpha ".repeat(100) + "beta gamma delta epsilon zeta eta theta ".repeat(20), "beta ".repeat(100) + "alpha gamma delta epsilon zeta eta theta ".repeat(20)];
  const account = { texts: posts, corpus: corpus.create(posts) }; const same = stylometry.compare(account, account);
  assert.equal(same.delta, 0); assert.equal(same.similarity, 1); assert.equal(same.chunkCount, 4); assert.ok(same.featureCount > 0);
  const uniform = { texts: ["alpha beta gamma delta epsilon zeta eta theta ".repeat(30)], corpus: corpus.create(["alpha beta gamma delta epsilon zeta eta theta ".repeat(30)]) };
  assert.ok(Number.isNaN(stylometry.compare(uniform, uniform).delta)); assert.throws(() => stylometry.compare(null, account), TypeError);
});
