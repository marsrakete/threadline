"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Builds deterministic archive controls and preference adapters. @returns {Promise<object>} Module, controller, state and controls. */
async function archivePreferencesFixture() {
  const module = await importProjectModule("js/tools/archive-preferences.js"); const elements = {};
  for (const key of ["from", "to", "source", "content", "context", "band", "image", "metrics", "threads", "indent", "wave", "preview", "importMode", "scope", "year", "hashtagScope"]) {
    elements[key] = { value: "", checked: false, options: [{ value: "100" }, { value: "200" }, { value: "500" }] };
  }
  const state = { sourceProfile: null, selectedHashtags: [], hashtagScope: "thread", savedSearchId: "", hashtags: [] }; const calls = [];
  const options = { state, now: () => new Date(2026, 9, 16), maxMonths: 3,
    normalizeTags: (values) => { if (Array.isArray(values)) { return values; } return []; },
    scopeFields: () => calls.push("scope"), renderSource: () => calls.push("source"), renderSavedSearch: () => calls.push("saved"), renderTags: () => calls.push("tags") };
  return { module, controller: module.createArchivePreferencesController(elements, options), elements, state, calls, options };
}

test("archive calendar helpers preserve local dates, leap days and month-end clamping", async () => {
  const { module: m } = await archivePreferencesFixture();
  assert.equal(m.formatArchiveDateInputValue(new Date(2024, 1, 29)), "2024-02-29"); assert.equal(m.parseArchiveDateInputValue("2024-02-29").getDate(), 29);
  for (const value of ["2023-02-29", "2026-13-01", "2026-1-1", null, "bad"]) { assert.equal(m.parseArchiveDateInputValue(value), null); }
  assert.equal(m.formatArchiveDateInputValue(new Date(NaN)), ""); assert.equal(m.formatArchiveDateInputValue("bad"), "");
  assert.equal(m.getArchiveDateAtLocalMidnight(null), null); assert.equal(m.addArchiveMonths(null, 1), null);
  assert.equal(m.formatArchiveDateInputValue(m.addArchiveMonths(new Date(2024, 0, 31), 1)), "2024-02-29");
  assert.equal(m.formatArchiveDateInputValue(m.addArchiveMonths(new Date(2026, 0, 31), -1)), "2025-12-31");
  assert.equal(m.getArchiveDateAtLocalMidnight(new Date(2026, 1, 1, 19)).getHours(), 0);
});

test("archive date controller preserves defaults, edge-specific clamping and input bounds", async () => {
  const { controller: c, elements: e } = await archivePreferencesFixture(); assert.deepEqual(c.defaults(), { from: "2026-07-16", to: "2026-10-16" });
  c.ensure(); assert.equal(e.from.value, "2026-07-16"); assert.equal(c.clamp().changed, false);
  e.from.value = "2026-01-01"; e.to.value = "2026-10-01";
  assert.deepEqual(c.clamp("to"), { from: "2026-07-01", to: "2026-10-01", changed: true });
  e.from.value = "2026-01-31"; e.to.value = "2026-10-01"; c.clamp("from"); assert.equal(e.to.value, "2026-04-30");
  c.bounds(); assert.equal(e.to.min, "2026-01-31"); assert.equal(e.to.max, "2026-04-30"); assert.equal(e.from.max, "2026-04-30");
  e.to.value = "2027-01-01"; c.clamp("to"); assert.equal(e.to.value, "2026-10-16");
  e.from.value = "invalid"; c.ensure(); assert.equal(e.from.value, "2026-07-16"); assert.equal(e.to.value, "2026-10-16");
});

test("archive preference snapshot retains filters, numeric limits and absent-control defaults", async () => {
  const { controller: c, elements: e, state } = await archivePreferencesFixture();
  e.source.value = " @a.test "; e.band.value = "9000"; e.wave.value = "20"; e.content.value = "threads";
  state.sourceProfile = { did: " did:a ", handle: " a.test " }; state.hashtagScope = "startpost"; state.selectedHashtags = [{ name: "tag" }];
  const filters = c.filters(); assert.equal(filters.sourceActor, "a.test"); assert.equal(filters.sourceDid, "did:a"); assert.equal(filters.scope, "range"); assert.equal(filters.hashtagScope, "startpost");
  assert.equal(c.pdf().bandSize, 1000); assert.equal(c.wave(), 100); e.wave.value = "invalid"; assert.equal(c.wave(), 500);
  delete e.indent; delete e.preview; assert.equal(c.pdf().indentThreads, true); assert.equal(c.snapshot().livePreview, true);
  e.importMode.value = "author"; assert.equal(c.snapshot().threadImportMode, "author"); e.importMode.value = "unknown"; assert.equal(c.snapshot().threadImportMode, "path");
  e.source.value = ""; state.sourceProfile = null; assert.equal(c.source(), null);
});

test("archive preferences restore supported choices and refresh dependent UI in order", async () => {
  const { controller: c, elements: e, state, calls } = await archivePreferencesFixture();
  c.restore({ source: { input: " @a ", did: " did:a ", handle: "a.test" }, filters: { contentMode: "full", from: "2026-09-01", to: "2026-10-01", hashtagScope: "startpost", hashtagTags: ["tag"] },
    waveSize: 500, savedSearchId: " saved ", pdfOptions: { bandSize: 200, imageSize: "large", includeMetrics: false, indentThreads: false }, threadImportMode: "tree", livePreview: false });
  assert.equal(state.sourceProfile.did, "did:a"); assert.equal(state.sourceProfile.displayName, "a.test"); assert.equal(state.savedSearchId, "saved");
  assert.equal(e.content.value, "full"); assert.equal(e.wave.value, "500"); assert.equal(e.band.value, "200"); assert.equal(e.image.value, "large");
  assert.equal(e.metrics.checked, false); assert.equal(e.indent.checked, false); assert.equal(e.threads.checked, true); assert.equal(e.preview.checked, false);
  assert.deepEqual(calls, ["scope", "source", "saved", "tags"]);
  c.restore({ filters: { contentMode: "bad" }, waveSize: 999, pdfOptions: { imageSize: "bad" } });
  assert.equal(e.content.value, "posts"); assert.equal(e.image.value, "medium"); assert.equal(e.wave.value, "500"); assert.equal(state.sourceProfile, null);
});

/** Builds an explicit network focus state/transport fixture. @returns {Promise<object>} Controller, state, observations and mutable response. */
async function networkFocusFixture() {
  const { createNetworkFocusController } = await importProjectModule("js/tools/network.js");
  const state = { viewer: { did: "viewer" }, accountDid: "viewer", authDid: "auth", nodes: new Map(), details: new Map(),
    selectedDid: "", loadingDid: "", commonTargetDid: "", commonDids: new Set(), commonLoadingDid: "", filterMode: "all" };
  const calls = []; const response = { result: null, error: null };
  const options = { getState: () => state, setState: (patch) => Object.assign(state, patch),
    request: async (...args) => { calls.push(["request", ...args]); if (response.error) { throw response.error; } return response.result; },
    render: () => calls.push(["render"]), setStatus: (message) => calls.push(["status", message]),
    label: (profile) => profile.handle, t: (key, params) => { calls.push(["translation", key, params]); return key; },
    formatCount: (count) => String(count), report: (error) => calls.push(["error", error]), clearQuery: () => calls.push(["query"]) };
  return { controller: createNetworkFocusController(options), state, calls, response, options };
}

/** Creates state/transport adapters for the network loader. @returns {Promise<object>} Loader, mutable state/response and observations. */
async function networkDataFixture() {
  const { createNetworkDataController } = await importProjectModule("js/tools/network.js");
  const state = { authAccount: "viewer", authDid: "viewer", accountDid: "viewer", viewer: { did: "viewer", handle: "viewer.test" },
    nodes: new Map([["old", { did: "old" }]]), loading: false, followerCursor: "f1", followCursor: "g1", waveIndex: 1 };
  const calls = []; const response = { result: null, error: null }; let actor = "viewer.test";
  const options = { getState: () => state, setState: (patch) => Object.assign(state, patch), requestedActor: () => actor,
    ensureAccount: () => calls.push(["ensure"]), reset: () => { calls.push(["reset"]); state.nodes = new Map(); state.followerCursor = ""; state.followCursor = ""; state.waveIndex = 0; state.viewer = null; },
    clearQuery: () => calls.push(["query"]), setActorInput: (value) => calls.push(["actor", value]), note: (value) => calls.push(["note", value]),
    updateControls: () => calls.push(["controls"]), busy: (value) => calls.push(["busy", value]),
    request: async (...args) => { calls.push(["request", ...args]); if (response.error) { throw response.error; } return response.result; },
    status: (value) => calls.push(["status", value]), ingest: (profiles) => { for (const profile of profiles) { state.nodes.set(profile.did, profile); } },
    t: (key, params) => { calls.push(["translation", key, params]); return key; }, formatCount: String,
    report: (error) => calls.push(["error", error]), showError: (...args) => calls.push(["dialog", ...args]), render: () => calls.push(["render"]) };
  return { controller: createNetworkDataController(options), state, calls, response, options, actor: (value) => { actor = value; } };
}

test("network data loader preserves cursor loading, progress and loaded-count contracts", async () => {
  const { controller, state, calls, response } = await networkDataFixture();
  response.result = { viewer: state.viewer, followers: [{ did: "f" }], follows: [{ did: "g" }], followerCursor: "f2", followCursor: "g2", hasMoreFollowers: true, hasMoreFollows: "true", wave: { followers: 1, follows: 1 } };
  await controller.load(); const request = calls.find((entry) => entry[0] === "request");
  assert.equal(request[1], "LOAD_NETWORK_SLICE"); assert.deepEqual(request[2], { actor: "viewer.test", followerCursor: "f1", followCursor: "g1", limit: 500 });
  assert.equal(request[3].timeoutMs, 180000); assert.equal(state.waveIndex, 2); assert.equal(state.nodes.size, 3);
  assert.equal(state.hasMoreFollowers, true); assert.equal(state.hasMoreFollows, false); assert.equal(state.loading, false);
  assert.deepEqual(calls.filter((entry) => entry[0] === "busy"), [["busy", true], ["busy", false]]);
  request[3].onProgress({ step: " Step ", detail: " Detail " }); assert.equal(calls.at(-1)[1], "Step \u00b7 Detail");
  assert.ok(calls.some((entry) => entry[0] === "translation" && entry[2]?.loaded === "3"));
});

test("network loader switches actors, preserves append behavior and ignores disabled loads", async () => {
  const { controller, state, calls, response, actor } = await networkDataFixture();
  response.result = { viewer: { did: "new", handle: "new.test" } }; await controller.load({ actor: " new.test " });
  assert.equal(state.accountDid, "new"); assert.equal(state.waveIndex, 1); assert.equal(state.filterMode, "all"); assert.equal(state.query, "");
  assert.ok(calls.some((entry) => entry[0] === "reset")); assert.equal(calls.find((entry) => entry[0] === "request")[2].followerCursor, "");
  calls.length = 0; await controller.load({ append: true });
  assert.equal(calls.find((entry) => entry[0] === "request")[2].actor, "new"); assert.equal(calls.some((entry) => entry[0] === "reset"), false);
  calls.length = 0; state.loading = true; await controller.load(); state.loading = false; state.authAccount = null; await controller.load();
  assert.deepEqual(calls, []); state.authAccount = "viewer"; actor(""); await controller.load(); assert.deepEqual(calls, []);
});

test("network loader releases busy state after errors and keeps silent error behavior", async () => {
  const { controller, state, calls, response } = await networkDataFixture(); response.error = new Error("failed");
  await controller.load({ silentErrors: true }); assert.equal(state.loading, false); assert.equal(calls.some((entry) => entry[0] === "dialog"), false);
  assert.ok(calls.some((entry) => entry[0] === "note" && entry[1] === "failed")); assert.deepEqual(calls.at(-1), ["render"]);
  calls.length = 0; await controller.load(); assert.ok(calls.some((entry) => entry[0] === "dialog"));
  response.error = null; response.result = null; await controller.load(); assert.equal(state.followerCursor, ""); assert.equal(state.hasMoreFollowers, false);
});

test("network layout retains circle/squircle geometry, stable slots and focus dimensions", async () => {
  const { createNetworkLayoutController } = await importProjectModule("js/tools/network-layout.js");
  const { getNetworkRelationType } = await importProjectModule("js/tools/network.js");
  const state = { shape: "round", slots: new Map(), counts: {} };
  const controller = createNetworkLayoutController({ getState: () => state, relation: getNetworkRelationType, clamp: (value, min, max) => Math.min(max, Math.max(min, value)) });
  assert.deepEqual(controller.point(10, 20, 5, 0), { x: 15, y: 20 }); assert.equal(controller.path(0, 0, 10), null); assert.equal(controller.slot(null), null);
  const node = { did: "a", followingViewer: true }; const slot = controller.slot(node);
  assert.equal(controller.slot(node), slot); assert.equal(state.counts.following, 1);
  const changed = controller.slot({ ...node, followedByViewer: true }); assert.equal(changed.relation, "mutual"); assert.equal(changed.index, 0);
  const empty = controller.layout([]); assert.equal(empty.width, 1224); assert.equal(empty.height, 1144); assert.equal(empty.centerY, 572);
  const focus = controller.layout([{ ...node, followedByViewer: true }], "a");
  assert.equal(focus.height, 1092); assert.equal(focus.centerY, 350); assert.equal(focus.focusCenterY, 902);
  assert.equal(focus.positions.get("a").y, 174); assert.deepEqual(controller.labels([{ ...node, followedByViewer: true }, { did: "b" }], "a"), ["a", "b"]);
  state.shape = "squircle"; assert.equal(controller.point(0, 0, 10, 0).x, 11.799999999999999);
  const path = controller.path(0, 0, 10); assert.ok(path.startsWith("M ")); assert.ok(path.endsWith(" Z")); assert.equal((path.match(/L /g) || []).length, 72);
  assert.deepEqual(controller.layout([]).positions.size, 0);
});

test("network layout handles additional lanes, filtering and reset maps without moving stable slots", async () => {
  const { createNetworkLayoutController } = await importProjectModule("js/tools/network-layout.js");
  const { getNetworkRelationType } = await importProjectModule("js/tools/network.js");
  const state = { shape: "round", slots: new Map(), counts: {} }; const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const controller = createNetworkLayoutController({ getState: () => state, relation: getNetworkRelationType, clamp });
  const nodes = Array.from({ length: 25 }, (_, index) => ({ did: String(index), followingViewer: true, followedByViewer: true }));
  const initial = controller.layout(nodes); assert.equal(initial.ringRadii.followers, 300);
  assert.equal(state.slots.get("24").index, 24); controller.layout([nodes[24]]); assert.equal(state.slots.get("24").index, 24);
  state.slots = new Map(); state.counts = {}; controller.layout([nodes[24]]); assert.equal(state.slots.get("24").index, 0);
  assert.equal(controller.layout(Array.from({ length: 500 }, (_, index) => ({ did: `many-${index}` }))).densityFactor, 1.35);
});

test("network load controls preserve empty, loading, finished and authenticated states", async () => {
  const { renderNetworkLoadControls } = await importProjectModule("js/tools/network-ui.js");
  const elements = { load: {}, reset: {}, own: {}, account: {} }; const state = { authenticated: true, nodeCount: 0, loading: false, filterMode: "all", actor: "viewer", ownNetwork: true };
  renderNetworkLoadControls(elements, state, (key) => key); assert.equal(elements.load.disabled, false); assert.equal(elements.reset.disabled, true); assert.equal(elements.own.disabled, true);
  state.nodeCount = 1; renderNetworkLoadControls(elements, state, (key) => key); assert.equal(elements.load.title, "networkLoadFinishedTitle"); assert.equal(elements.load.disabled, true);
  state.hasMoreFollowers = true; renderNetworkLoadControls(elements, state, (key) => key); assert.equal(elements.load.textContent, "networkLoadMoreButton");
  state.loading = true; renderNetworkLoadControls(elements, state, (key) => key); assert.equal(elements.load.textContent, "networkLoadingButton"); assert.equal(elements.account.disabled, true);
  state.authenticated = false; renderNetworkLoadControls(elements, state, (key) => key); assert.equal(elements.load.title, "networkLoadButton");
  renderNetworkLoadControls({ load: {}, reset: {} }, { filterMode: "common" }, (key) => key);
});

/** Creates a stage controller with explicit geometry/native adapters. @returns {Promise<object>} Controller, state, DOM doubles and observations. */
async function networkStageFixture() {
  const { createNetworkStageController } = await importProjectModule("js/tools/network-ui.js");
  const state = { workspace: "network", zoom: 1, fitAll: false, panX: 0, panY: 0, drag: null, shape: "round", mode: false,
    focusVisible: false, listsVisible: false, selectedDid: "a", collapsed: false, scrollTop: 12, restorePending: false };
  const calls = []; const frames = []; const elements = {
    stage: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }), setPointerCapture: (id) => calls.push(["capture", id]) },
    body: { classList: { toggle: (...args) => calls.push(["class", ...args]) } },
    document: { fullscreenEnabled: false, fullscreenElement: null, exitFullscreen: async () => calls.push(["exit"]) },
    fullscreenTarget: { requestFullscreen: async () => calls.push(["fullscreen"]) }, results: { scrollTop: 0 } };
  const options = { getState: () => state, setState: (patch) => Object.assign(state, patch),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)), minZoom: 0.5, maxZoom: 4,
    layout: () => ({ width: 800, height: 600, contentBounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 } }),
    viewport: () => ({ x: state.panX, y: state.panY, width: 800 / state.zoom, height: 600 / state.zoom }),
    renderStage: () => calls.push(["stage"]), renderWorkspace: () => calls.push(["workspace"]), persistShape: (shape) => calls.push(["shape", shape]), frame: (callback) => frames.push(callback) };
  return { controller: createNetworkStageController(elements, options), state, elements, calls, frames };
}

test("network stage zoom preserves anchor, clamp/reset behavior and shape persistence", async () => {
  const { controller, state, calls } = await networkStageFixture();
  controller.zoomAtPoint(2, 200, 150); assert.equal(state.zoom, 2); assert.equal(state.panX, 0); assert.equal(state.panY, 0);
  controller.zoom(100); assert.equal(state.zoom, 4); controller.zoom(0.001); assert.equal(state.zoom, 0.5);
  controller.resetZoom(); assert.equal(state.fitAll, true); assert.equal(state.zoom, 1); assert.equal(state.panX, 0);
  controller.zoomAtPoint(2, 0, 0); assert.equal(state.panX, -200); assert.equal(state.panY, -150);
  controller.toggleShape(); assert.equal(state.shape, "squircle"); assert.ok(calls.some((entry) => entry[0] === "shape"));
  controller.toggleShape(); assert.equal(state.shape, "round"); assert.equal(state.fitAll, true);
});

test("network stage pointer/wheel handlers gate workspaces and preserve pointer identity", async () => {
  const { controller, state, calls } = await networkStageFixture(); let prevented = 0;
  const event = { pointerId: 1, clientX: 10, clientY: 20, deltaY: -1, preventDefault: () => { prevented += 1; } };
  state.workspace = "search"; controller.interactionHandlers.wheel(event); controller.interactionHandlers.pointerDown(event); assert.equal(prevented, 0);
  state.workspace = "network"; controller.interactionHandlers.wheel(event); assert.equal(state.zoom, 1.12);
  controller.resetZoom(); controller.interactionHandlers.pointerDown(event); assert.deepEqual(state.drag, { pointerId: 1, x: 10, y: 20 });
  controller.interactionHandlers.pointerMove({ ...event, pointerId: 2, clientX: 30 }); assert.equal(state.panX, 0);
  controller.interactionHandlers.pointerMove({ ...event, clientX: 30, clientY: 50 }); assert.equal(state.panX, -40); assert.equal(state.panY, -60);
  controller.interactionHandlers.pointerUp({ pointerId: 2 }); assert.ok(state.drag);
  controller.interactionHandlers.pointerUp({ pointerId: 1 }); assert.equal(state.drag, null); assert.ok(calls.some((entry) => entry[0] === "capture"));
  controller.interactionHandlers.wheel({ ...event, deltaY: 1 }); assert.ok(state.zoom < 1);
});

test("network stage native/fallback mode and panel controls retain lifecycle semantics", async () => {
  const { controller, state, elements, calls } = await networkStageFixture();
  await controller.enter(); assert.equal(state.mode, true); assert.equal(calls.some((entry) => entry[0] === "fullscreen"), false);
  controller.modeHandlers.focusClick(); controller.modeHandlers.listsClick(); assert.equal(state.focusVisible, true); assert.equal(state.listsVisible, true);
  controller.insightHandlers.focusToggleClick(); assert.equal(state.collapsed, true);
  state.selectedDid = ""; controller.insightHandlers.focusToggleClick(); assert.equal(state.collapsed, true);
  controller.insightHandlers.groupClick({ currentTarget: { dataset: { networkInsightsGroup: " followers " } } }); assert.equal(state.group, "followers"); assert.equal(state.scrollTop, 0);
  controller.insightHandlers.groupClick({ currentTarget: null }); assert.equal(state.group, "followers");
  controller.lifecycleHandlers.keydown({ key: "Escape", preventDefault() {} }); assert.equal(state.mode, false);
  elements.document.fullscreenEnabled = true; await controller.enter(); assert.ok(calls.some((entry) => entry[0] === "fullscreen"));
  elements.fullscreenTarget.requestFullscreen = async () => { throw new Error("denied"); }; await controller.enter(); assert.equal(state.mode, true);
  elements.document.fullscreenElement = {}; controller.lifecycleHandlers.fullscreenChange(); assert.equal(state.mode, true);
  elements.document.exitFullscreen = async () => { throw new Error("denied"); }; await controller.exit(); assert.equal(state.mode, false);
  await controller.enter(); elements.document.fullscreenElement = null; controller.lifecycleHandlers.fullscreenChange(); assert.equal(state.mode, false);
});

test("network stage scroll restoration ignores generated scroll events until both frames complete", async () => {
  const { controller, state, elements, frames } = await networkStageFixture();
  controller.restoreScroll(); assert.equal(elements.results.scrollTop, 12); assert.equal(state.restorePending, true);
  elements.results.scrollTop = 999; controller.lifecycleHandlers.resultsScroll(); assert.equal(state.scrollTop, 12);
  frames.shift()(); assert.equal(elements.results.scrollTop, 12); assert.equal(state.restorePending, true);
  frames.shift()(); assert.equal(state.restorePending, false);
  elements.results.scrollTop = 40; controller.lifecycleHandlers.resultsScroll(); assert.equal(state.scrollTop, 40);
  state.scrollTop = -4; controller.restoreScroll(); assert.equal(elements.results.scrollTop, 0);
});

/** Creates a minimal UI control for renderer contracts. @returns {object} Mutable classes, attributes and presentation fields. */
function networkRenderControl() {
  const classes = new Set(); const attributes = {};
  return { classes, attributes, hidden: false, value: "", dataset: {},
    classList: { toggle(name, active) { if (active) { classes.add(name); } else { classes.delete(name); } } },
    setAttribute(name, value) { attributes[name] = value; }, toggleAttribute(name, active) { attributes[name] = active; },
    matches: () => false, replaceChildren: (...args) => { attributes.children = args; } };
}

test("network renderer filter/summary contracts retain common availability and count behavior", async () => {
  const { createNetworkWorkspaceRenderer } = await importProjectModule("js/tools/network-rendering.js");
  const all = networkRenderControl(); all.dataset.networkFilter = "all";
  const common = networkRenderControl(); common.dataset.networkFilter = "common";
  const state = { selectedDid: "a", commonTargetDid: "a", commonDids: new Set(["b"]), filterMode: "common" };
  const elements = { commonFilter: common, filterButtons: [all, common], loaded: {}, mutuals: {}, visible: {} };
  const renderer = createNetworkWorkspaceRenderer(elements, { getState: () => state, setFilter: (mode) => { state.filterMode = mode; },
    allNodes: () => [{ relation: "mutual" }, { relation: "followers" }], visibleNodes: () => [{}], relation: (node) => node.relation, formatCount: String });
  renderer.filters(); assert.equal(common.hidden, false); assert.equal(common.attributes["aria-pressed"], "true");
  state.selectedDid = "other"; renderer.filters(); assert.equal(common.hidden, true); assert.equal(common.classes.has("is-active"), false);
  assert.equal(state.filterMode, "all"); assert.equal(all.attributes["aria-pressed"], "true");
  renderer.summary(); assert.equal(elements.loaded.textContent, "2"); assert.equal(elements.mutuals.textContent, "1"); assert.equal(elements.visible.textContent, "1");
  state.commonDids = new Set(); state.filterMode = "common"; renderer.filters(); assert.equal(state.filterMode, "all");
});

test("network renderer presentation retains optional controls, focus modes and template icons", async () => {
  const { createNetworkWorkspaceRenderer } = await importProjectModule("js/tools/network-rendering.js");
  const elements = { templates: {}, groupButtons: [], body: networkRenderControl() };
  for (const name of ["actor", "canvas", "stageCard", "insightsCard", "focusPanel", "shape", "collapse", "enter", "exit", "focus", "lists", "sortField", "sortDirection", "groupToggles"]) { elements[name] = networkRenderControl(); }
  const path = {}; const state = { stageMode: false, selectedDid: "a", viewer: { handle: "viewer.test" }, collapsed: false, shape: "squircle", focusVisible: false, listsVisible: false, sortField: "handle", sortDirection: "desc" };
  const renderer = createNetworkWorkspaceRenderer(elements, { getState: () => state, t: (key) => key,
    cloneTemplate: () => ({ querySelector: () => ({ setAttribute: (name, value) => { path[name] = value; } }) }) });
  renderer.presentation(); assert.equal(elements.canvas.classes.has("has-focus"), true); assert.equal(elements.actor.value, "viewer.test");
  assert.equal(elements.collapse.attributes["aria-expanded"], "true"); assert.equal(elements.shape.attributes["aria-pressed"], "true");
  assert.equal(elements.sortDirection.value, "desc"); assert.equal(elements.exit.hidden, true);
  state.stageMode = true; state.collapsed = true; renderer.presentation(); assert.equal(elements.canvas.classes.has("has-focus"), false);
  assert.equal(elements.focusPanel.attributes.hidden, true); assert.equal(elements.collapse.attributes["aria-expanded"], "false"); assert.match(path.d, /M7\.4 8\.6/);
  state.focusVisible = true; state.listsVisible = true; renderer.presentation(); assert.equal(elements.canvas.classes.has("has-focus-collapsed"), true);
  assert.equal(elements.focus.textContent, "networkStageModeHideFocus"); assert.equal(elements.groupToggles.hidden, false);
  const minimal = createNetworkWorkspaceRenderer({ body: networkRenderControl(), groupButtons: [] }, { getState: () => state }); minimal.presentation();
});

test("network renderer empty-result and missing-template boundaries fail explicitly", async () => {
  const { createNetworkWorkspaceRenderer } = await importProjectModule("js/tools/network-rendering.js");
  const notes = []; const paragraph = {}; const fragment = { querySelector: () => paragraph };
  const elements = { templates: { empty: {} }, results: { scrollTop: 0, replaceChildren() { notes.length = 0; }, append: (value) => notes.push(value) } };
  const options = { getState: () => ({ scrollTop: 12 }), allNodes: () => [], t: (key) => key, cloneTemplate: () => fragment };
  const renderer = createNetworkWorkspaceRenderer(elements, options); renderer.results();
  assert.equal(paragraph.textContent, "networkResultsEmpty"); assert.deepEqual(notes, [fragment]);
  options.cloneTemplate = () => null; assert.throws(() => renderer.results(), /Missing network template: empty/);
});

/** Supplies deterministic adapters for focus display-model tests. @param {object} state - Profile maps. @param {boolean} own - Own-account flag. @returns {object} Display adapters. */
function networkFocusModelOptions(state, own = true) {
  return { known: (did) => state.nodes.get(did) || null, ownNetwork: () => own, avatar: (profile) => profile.avatar || "cached-avatar",
    relation: () => "mutual", score: () => 120, breakdown: () => ({ total: 120, relationScore: 120, followersScore: 0, postsScore: 0 }),
    centerLabel: () => "viewer", locale: "en", formatCount: (value) => String(Number(value) || 0),
    t: (key, params = {}) => `${key}:${JSON.stringify(params)}` };
}

test("network focus date/activity adapters retain valid, empty and malformed-data behavior", async () => {
  const { formatNetworkFocusDate, getNetworkFocusActivityWindow } = await importProjectModule("js/tools/network-focus-rendering.js");
  assert.equal(formatNetworkFocusDate("invalid", "en"), ""); assert.equal(formatNetworkFocusDate(null, "en"), "");
  for (const locale of ["en", "de", "fr"]) {
    assert.equal(formatNetworkFocusDate("2026-10-12T12:00:00Z", locale), new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date("2026-10-12T12:00:00Z")));
  }
  assert.equal(getNetworkFocusActivityWindow(null, 14), null); assert.equal(getNetworkFocusActivityWindow({ windows: "invalid" }, 14), null);
  assert.equal(getNetworkFocusActivityWindow({ windows: { 14: "invalid" } }, 14), null);
  assert.deepEqual(getNetworkFocusActivityWindow({ windows: { 14: { postsCount: "3", likesReceivedCount: "bad" } } }, "14"), { postsCount: 3, likesReceivedCount: 0 });
  assert.deepEqual(getNetworkFocusActivityWindow({ windows: { 60: {} } }, 60), { postsCount: 0, likesReceivedCount: 0 });
});

test("network focus model preserves own-account metadata order, action gates and counters", async () => {
  const { buildNetworkFocusCardModel } = await importProjectModule("js/tools/network-focus-rendering.js");
  const profile = { did: "a", handle: "alpha.test", displayName: "Alpha", description: "<img>not markup", followersCount: 10 };
  const detail = { profile, relationshipDates: { youFollowSince: "2026-10-10T12:00:00Z", followsYouSince: "2026-10-12T12:00:00Z" },
    activityStats: { latestPostAt: "2026-10-13T12:00:00Z", samplePosts: 6, windows: { 14: { postsCount: 2, likesReceivedCount: 5 }, 60: { postsCount: 7 } } },
    likeStats: { mutualLikesCount: 8, youLikeCount: 3, likesYouCount: 5, ownPostsSampled: 10, actorPostsSampled: 12, totalSample: 22 }, followersPreview: [{ did: "p" }], followsPreview: [] };
  const state = { selectedDid: "a", nodes: new Map([["a", profile]]), details: new Map([["a", detail]]), commonTargetDid: "a", commonDids: new Set(["p"]), commonLoadingDid: "", accountDid: "viewer", focusLoadingDid: "a", loading: false };
  const model = buildNetworkFocusCardModel(state, networkFocusModelOptions(state));
  assert.equal(model.title, "Alpha"); assert.equal(model.handle, "@alpha.test"); assert.equal(model.stats[0][1], "10"); assert.equal(model.stats[3][1], "120");
  assert.equal(model.commonActive, true); assert.equal(model.loadDisabled, false);
  assert.deepEqual(model.sections.map((section) => section.kind), ["line", "group", "group", "group", "group", "description", "note", "line"]);
  assert.match(model.sections[2].lines[0].text, /^networkMutualSince/); assert.match(model.sections[3].lines.at(-1).text, /"count":"6"/);
  assert.equal(model.sections[5].text, profile.description); assert.match(model.sections.at(-1).text, /"followers":"1"/);
  state.accountDid = "a"; const ownCenter = buildNetworkFocusCardModel(state, networkFocusModelOptions(state)); assert.equal(ownCenter.loadDisabled, true); assert.equal(ownCenter.commonDisabled, true);
  assert.equal(profile.description, "<img>not markup");
});

test("network focus model handles empty selection, unknown/viewer fallbacks and foreign metadata", async () => {
  const { buildNetworkFocusCardModel } = await importProjectModule("js/tools/network-focus-rendering.js");
  const state = { selectedDid: "", nodes: new Map(), details: new Map(), commonTargetDid: "", commonDids: new Set() };
  assert.deepEqual(buildNetworkFocusCardModel(state, networkFocusModelOptions(state)), { emptyKey: "networkEmpty" });
  state.nodes.set("a", { did: "a", handle: "alpha" }); assert.deepEqual(buildNetworkFocusCardModel(state, networkFocusModelOptions(state)), { emptyKey: "networkFocusEmpty" });
  state.selectedDid = "unknown"; assert.equal(buildNetworkFocusCardModel(state, networkFocusModelOptions(state)).emptyKey, "networkFocusEmpty");
  state.viewer = { handle: "viewer" }; assert.equal(buildNetworkFocusCardModel(state, networkFocusModelOptions(state)).stats[3][1], "\u2014");
  state.selectedDid = "a"; state.commonLoadingDid = "a";
  state.details.set("a", { likeStats: {}, relationshipDates: { youFollowSince: "2026-10-12" }, activityStats: { windows: { 14: {} } } });
  const foreign = buildNetworkFocusCardModel(state, networkFocusModelOptions(state, false));
  assert.match(foreign.sections[0].text, /^networkScoreExplainOther/); assert.match(foreign.sections[1].text, /^networkCommonMutualsLoading/);
  assert.equal(foreign.sections.some((section) => section.lines?.some((line) => line.text.startsWith("networkYouFollowSince") || line.text.startsWith("networkMutualLikesTotal"))), false);
  assert.ok(foreign.sections.some((section) => section.lines?.some((line) => line.text.startsWith("networkActivityTitle"))));
});

test("network focus renderer exposes empty-state and missing-template contracts", async () => {
  const { createNetworkFocusCardRenderer } = await importProjectModule("js/tools/network-focus-rendering.js");
  const paragraph = {}; let rendered;
  const options = { getState: () => ({}), model: () => ({ emptyKey: "networkEmpty" }), t: (key) => key, cloneTemplate: () => ({ querySelector: () => paragraph }) };
  const renderer = createNetworkFocusCardRenderer({ templates: {}, card: { replaceChildren: (fragment) => { rendered = fragment; } } }, options);
  renderer.render(); assert.equal(paragraph.textContent, "networkEmpty"); assert.ok(rendered);
  options.cloneTemplate = () => null; assert.throws(() => renderer.render(), /Missing network focus template: empty/);
});

test("network SVG node styles retain relationship colors and selection radii", async () => {
  const { getNetworkStageNodeStyle } = await importProjectModule("js/tools/network-stage-rendering.js");
  for (const [type, radius, color] of [["mutual", 18, "#5ce7cf"], ["followers", 15, "#69a9ff"], ["following", 15, "#f8c26c"], ["other", 15, "#bac6d6"]]) {
    assert.deepEqual(getNetworkStageNodeStyle({ did: "a" }, "", () => type), { radius, color, selected: false });
    assert.deepEqual(getNetworkStageNodeStyle({ did: "a" }, "a", () => type), { radius: 22, color, selected: true });
  }
  assert.equal(getNetworkStageNodeStyle({ did: "a" }, "", () => "unknown").color, "#bac6d6");
  assert.throws(() => getNetworkStageNodeStyle(null, "", () => "mutual"), TypeError);
});

test("network SVG node binding preserves hover ownership, keyboard activation and preview context", async () => {
  const { bindNetworkSvgNode } = await importProjectModule("js/tools/network-stage-rendering.js");
  const handlers = {}; const element = { addEventListener: (type, handler) => { handlers[type] = handler; } }; const calls = [];
  let hovered = ""; let stopped = 0; let prevented = 0;
  const event = { key: "Enter", stopPropagation: () => { stopped += 1; }, preventDefault: () => { prevented += 1; } };
  assert.equal(bindNetworkSvgNode(element, "a", { hovered: () => hovered, hover: (did) => { hovered = did; }, select: (...args) => calls.push(args) }), element);
  handlers.pointerdown(event); assert.equal(stopped, 1); handlers.mouseenter(); assert.equal(hovered, "a");
  hovered = "b"; handlers.mouseleave(); assert.equal(hovered, "b"); handlers.focus(); handlers.blur(); assert.equal(hovered, "");
  handlers.click(event); handlers.keydown(event); handlers.keydown({ ...event, key: " " }); handlers.keydown({ ...event, key: "Escape" });
  assert.deepEqual(calls, [["a"], ["a"], ["a"]]); assert.equal(prevented, 2);
  const settings = { previewTab: "following", loadDetails: true };
  bindNetworkSvgNode(element, "p", { hovered: () => "", hover() {}, select: (...args) => calls.push(args) }, settings);
  handlers.keydown(event); assert.deepEqual(calls.at(-1), ["p", settings]);
  assert.throws(() => bindNetworkSvgNode(null, "", {}), TypeError);
});

test("network SVG renderer exposes missing-template failures without hidden DOM dependencies", async () => {
  const { createNetworkStageRenderer } = await importProjectModule("js/tools/network-stage-rendering.js");
  const renderer = createNetworkStageRenderer({ stage: { setAttribute() {} }, empty: {}, templates: {} }, {
    allNodes: () => [], slot() {}, visibleNodes: () => [], getState: () => ({}), hover() {}, preferred: () => "",
    layout: () => ({}), contentBounds: () => ({}), viewport: () => ({ x: 0, y: 0, width: 1, height: 1 }), common: () => new Set(), cloneTemplate: () => null });
  assert.throws(() => renderer.render(), /Missing network SVG template: scene/);
});

/** Builds explicit workspace state/render/navigation adapters. @returns {Promise<object>} Controller, elements, state and observed actions. */
async function networkWorkspaceFixture() {
  const { createNetworkWorkspaceController } = await importProjectModule("js/tools/network-controller.js");
  const state = { authAccount: "auth.test", authDid: "auth", accountDid: "auth", viewer: null, nodes: new Map(), details: new Map(),
    selectedDid: "", loadingDid: "", loading: false, statusLine: "", filterMode: "all", zoom: 2, shape: "squircle" };
  const elements = { search: { value: " query " }, account: { value: " actor.test " }, sortField: { value: "handle" }, sortDirection: { value: "desc" }, status: {}, hover: {} };
  const calls = []; let navigated = false;
  const options = { getState: () => state, setState: (patch) => Object.assign(state, patch), clearCommon: () => calls.push("clearCommon"),
    relation: (node) => node.relation, t: (key, params) => { if (params) { return `${key}:${params.account}`; } return key; },
    known: (did) => state.nodes.get(did), label: (profile) => profile.handle, load: async (value) => calls.push(["load", value]), loadFocus: async (did) => calls.push(["focus", did]),
    note: (value) => calls.push(["note", value]), updateControls: () => calls.push("controls"), navigate: () => { calls.push("navigate"); return navigated; },
    applyExplorerFullscreen: () => calls.push("fullscreen"), persistWorkspace: (value) => calls.push(["persist", value]), showWorkspace: (value) => calls.push(["visible", value]),
    applyHashtagContext: () => calls.push("hashtags"), updateAuth: () => calls.push("auth"),
    renderers: [() => calls.push("presentation"), () => calls.push("filters"), () => calls.push("content")], restoreScroll: () => calls.push("scroll") };
  return { controller: createNetworkWorkspaceController(elements, options), state, elements, calls, options, navigate: (value) => { navigated = value; } };
}

test("network workspace data reset rebuilds maps/cursors while presentation reset retains data and zoom", async () => {
  const { controller, state, elements, calls } = await networkWorkspaceFixture();
  state.nodes.set("a", { did: "a" }); state.selectedDid = "a"; state.details.set("a", {});
  const nodes = state.nodes; controller.handlers.reset(); assert.equal(state.nodes, nodes); assert.equal(state.zoom, 2); assert.equal(state.selectedDid, ""); assert.equal(elements.search.value, "");
  state.accountDid = "foreign"; controller.reset(); assert.notEqual(state.nodes, nodes); assert.equal(state.nodes.size, 0); assert.equal(state.details.size, 0);
  assert.equal(state.accountDid, "foreign"); assert.equal(state.zoom, 1); assert.equal(state.shape, "squircle"); assert.equal(state.followerCursor, "");
  assert.equal(state.followCursor, ""); assert.equal(state.fitAll, true); assert.deepEqual(state.counts, { mutual: 0, followers: 0, following: 0, other: 0 });
  assert.ok(calls.includes("clearCommon")); const first = state.nodes; controller.reset(); assert.notEqual(state.nodes, first);
  state.accountDid = ""; controller.ensure(); assert.equal(state.accountDid, "auth"); state.authDid = ""; controller.ensure(); assert.equal(state.nodes.size, 0);
});

test("network workspace context resolves labels, relationships, typed actors and group pagination", async () => {
  const { controller, state, elements, calls } = await networkWorkspaceFixture();
  assert.equal(controller.own(), true); assert.equal(controller.requested(), "actor.test"); assert.equal(controller.center(), null); assert.equal(controller.centerLabel(), "auth.test");
  state.viewer = { did: "foreign", handle: "foreign.test", displayName: "Foreign" }; state.accountDid = "foreign"; elements.account.value = "";
  assert.equal(controller.own(), false); assert.equal(controller.requested(), "foreign.test"); assert.equal(controller.centerLabel(), "Foreign");
  assert.equal(controller.relationLabel({ relation: "followers" }), "networkRelationFollowerOther:Foreign");
  state.accountDid = "auth"; assert.equal(controller.relationLabel({ relation: "following" }), "networkRelationFollowing");
  assert.equal(controller.relationLabel({ relation: "mutual" }), "networkRelationMutual"); assert.equal(controller.relationLabel({ relation: "other" }), "networkRelationLoose");
  state.viewer = null; state.accountDid = ""; assert.equal(controller.requested(), "auth"); state.authDid = ""; state.authAccount = null; assert.equal(controller.centerLabel(), "networkViewerFallback");
  state.hasMoreFollowers = false; state.hasMoreFollows = true; assert.equal(controller.pending("followers"), false); assert.equal(controller.pending("following"), true); assert.equal(controller.pending("unknown"), true);
  await controller.loadMore("mutual"); assert.equal(calls.length, 0);
  state.authAccount = "auth.test"; await controller.loadMore("mutual"); assert.deepEqual(calls.at(-1), ["load", { triggerGroup: "mutual" }]);
  state.loading = true; const count = calls.length; await controller.loadMore(); assert.equal(calls.length, count);
});

test("network workspace controls preserve exact load payloads, sort normalization and input feedback", async () => {
  const { controller, state, elements, calls } = await networkWorkspaceFixture(); let prevented = 0;
  controller.handlers.accountKeydown({ key: "Escape" }); assert.equal(calls.length, 0);
  controller.handlers.accountKeydown({ key: "Enter", preventDefault: () => { prevented += 1; } }); assert.equal(prevented, 1);
  assert.deepEqual(calls.at(-1), ["load", { actor: "actor.test", append: false, silentErrors: false }]);
  await controller.handlers.accountLoad(); await controller.handlers.ownLoad(); await controller.handlers.load();
  assert.deepEqual(calls.filter(Array.isArray).slice(-3), [["load", { actor: "actor.test", append: false, silentErrors: false }], ["load", { actor: "auth", append: false, silentErrors: false }], ["load", { append: true }]]);
  assert.equal(elements.account.value, "auth.test"); controller.handlers.accountInput(); assert.deepEqual(calls.slice(-2), [["note", ""], "controls"]);
  controller.handlers.sortFieldChange(); assert.equal(state.sortField, "handle"); elements.sortField.value = "invalid"; controller.handlers.sortFieldChange(); assert.equal(state.sortField, "displayName");
  controller.handlers.sortDirectionChange(); assert.equal(state.sortDirection, "desc"); elements.sortDirection.value = "invalid"; controller.handlers.sortDirectionChange(); assert.equal(state.sortDirection, "asc");
  controller.handlers.filterClick({ currentTarget: { dataset: {} } }); assert.equal(state.filterMode, "all"); controller.handlers.searchInput(); assert.equal(state.query, "query");
});

test("network workspace navigation/render orchestration preserves gates, order and pending-focus suppression", async () => {
  const { controller, state, calls, navigate } = await networkWorkspaceFixture();
  navigate(true); controller.show(); assert.deepEqual(calls, ["navigate"]);
  navigate(false); calls.length = 0; state.authAccount = null; controller.show(); assert.deepEqual(calls, ["navigate"]);
  state.authAccount = "auth.test"; calls.length = 0; controller.show(); assert.equal(state.workspace, "network");
  assert.deepEqual(calls.slice(0, 8), ["navigate", "fullscreen", ["persist", "network"], ["visible", "network"], "hashtags", "auth", "presentation", "filters"]);
  assert.deepEqual(calls.at(-1), ["load", { silentErrors: false }]);
  state.nodes.set("a", { did: "a" }); state.selectedDid = "a"; calls.length = 0; controller.render(); assert.deepEqual(calls, ["presentation", "filters", "content", "scroll", ["focus", "a"]]);
  state.loadingDid = "a"; calls.length = 0; controller.render(); assert.equal(calls.some((entry) => Array.isArray(entry) && entry[0] === "focus"), false);
  state.loadingDid = ""; state.details.set("a", {}); calls.length = 0; controller.render(); assert.equal(calls.some(Array.isArray), false);
});

test("network status/hover and optional shape storage preserve failure fallbacks", async () => {
  const { controller, state, elements } = await networkWorkspaceFixture();
  controller.status(" ready "); assert.equal(state.statusLine, "ready"); assert.equal(elements.status.textContent, "ready"); controller.status(null); assert.equal(state.statusLine, "networkProgressIdle");
  state.nodes.set("a", { handle: "<img>plain text" }); controller.hover(" a "); assert.equal(state.hoveredDid, "a"); assert.equal(elements.hover.textContent, "<img>plain text");
  controller.hover("missing"); assert.equal(elements.hover.hidden, true); assert.equal(elements.hover.textContent, "");
  const { normalizeNetworkShape, readNetworkShapePreference, writeNetworkShapePreference } = await importProjectModule("js/tools/network-controller.js");
  const values = new Map(); const storage = () => ({ getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) });
  assert.equal(normalizeNetworkShape(null), "round"); assert.equal(normalizeNetworkShape("SQUIRCLE"), "round");
  writeNetworkShapePreference("squircle", storage, "shape"); assert.equal(readNetworkShapePreference(storage, "shape"), "squircle");
  values.set("shape", " squircle "); assert.equal(readNetworkShapePreference(storage, "shape"), "squircle");
  writeNetworkShapePreference(" squircle ", storage, "shape"); assert.equal(readNetworkShapePreference(storage, "shape"), "round");
  const unavailable = () => { throw new Error("denied"); }; assert.equal(readNetworkShapePreference(unavailable, "shape"), "round"); assert.doesNotThrow(() => writeNetworkShapePreference("squircle", unavailable, "shape"));
});

test("network focus profile store preserves lookup priority, self exclusion and bounded deduplicated previews", async () => {
  const { controller, state } = await networkFocusFixture();
  controller.ingest([null, {}, { did: "viewer" }, { did: "a", handle: "alpha", followingViewer: true }, { did: "a", followedByViewer: true }]);
  assert.equal(state.nodes.size, 1); assert.equal(controller.known(" a ").handle, "alpha");
  assert.equal(controller.known("a").followingViewer, true); assert.equal(controller.known("a").followedByViewer, true);
  state.nodes.set("viewer", { did: "viewer", handle: "not viewer" }); assert.equal(controller.known("viewer"), state.viewer);
  state.details.set("a", { profile: { did: "a", handle: "focus" },
    followersPreview: [{ did: "p" }, { did: "a" }, {}, { did: "q" }, { did: "excluded" }],
    followsPreview: [{ did: "p" }, { did: "r" }] });
  assert.equal(controller.known("a").handle, "alpha"); assert.equal(controller.known("p").did, "p");
  assert.equal(controller.known(""), null); assert.equal(controller.known("unknown"), null);
  assert.deepEqual(controller.previews("a").map((entry) => [entry.did, entry.previewRelation]), [["p", "followers"], ["q", "followers"], ["r", "following"]]);
  assert.deepEqual(controller.previews(""), []); assert.deepEqual(controller.previews("missing"), []);
  state.nodes.delete("a"); assert.equal(controller.known("a").handle, "focus");
});

test("network focus selection resets foreign common filtering but retains same-target sets", async () => {
  const { controller, state, calls } = await networkFocusFixture();
  state.commonTargetDid = "old"; state.commonDids = new Set(["p"]); state.filterMode = "common";
  controller.select(" a ", { loadDetails: false, previewTab: "following" });
  assert.equal(state.selectedDid, "a"); assert.equal(state.previewTab, "following"); assert.equal(state.collapsed, false);
  assert.equal(state.commonTargetDid, ""); assert.equal(state.filterMode, "all"); assert.equal(calls.some((entry) => entry[0] === "request"), false);
  state.nodes.set("a", { did: "a" }); assert.equal(controller.preferred([{ did: "a" }]), "a"); assert.equal(controller.preferred([]), "");
  state.commonTargetDid = "a"; state.commonDids = new Set(["p"]); controller.select("a", { loadDetails: false });
  const active = controller.activeCommon(); active.clear(); assert.equal(state.commonDids.size, 1);
  assert.equal(controller.activeCommon("other").size, 0); controller.select(""); assert.equal(state.selectedDid, "a");
  controller.clearCommon(); assert.equal(state.commonDids.size, 0);
});

test("network focus loading suppresses duplicate targets, normalizes responses and isolates progress/errors", async () => {
  const { controller, state, calls, response } = await networkFocusFixture();
  state.selectedDid = "a"; state.nodes.set("a", { did: "a", handle: "alpha", followingViewer: true });
  response.result = { profile: { did: "a", followedByViewer: true }, followersPreview: "invalid", followsPreview: [{}] };
  await controller.loadFocus(" a ");
  const request = calls.find((entry) => entry[0] === "request");
  assert.equal(request[1], "LOAD_NETWORK_ACTOR_FOCUS"); assert.deepEqual(request[2], { actor: "a" }); assert.equal(request[3].timeoutMs, 120000);
  assert.deepEqual(state.details.get("a").followersPreview, []); assert.deepEqual(state.details.get("a").followsPreview, [{}]);
  assert.equal(state.nodes.get("a").followingViewer, true); assert.equal(state.loadingDid, "");
  request[3].onProgress({ step: "Step", detail: "detail" }); assert.equal(calls.at(-1)[1], "Step \u00b7 alpha");
  state.selectedDid = "other"; const count = calls.length; request[3].onProgress({ step: "Ignored" }); assert.equal(calls.length, count);
  state.loadingDid = "a"; await controller.loadFocus("a"); await controller.loadFocus(""); assert.equal(calls.length, count);
  state.loadingDid = ""; response.error = new Error("failed"); state.selectedDid = "a";
  await controller.loadFocus("a"); assert.ok(calls.some((entry) => entry[0] === "status" && entry[1] === "failed")); assert.equal(state.loadingDid, "");
  state.selectedDid = "other"; calls.length = 0; await controller.loadFocus("a");
  assert.equal(calls.some((entry) => entry[0] === "status"), false); assert.ok(calls.some((entry) => entry[0] === "error"));
});

test("network focus completion does not clear a newer request's loading marker", async () => {
  const { controller, state, options, calls } = await networkFocusFixture(); const pending = new Map();
  options.request = (type, payload) => new Promise((resolve) => pending.set(payload.actor, resolve));
  const first = controller.loadFocus("a"); const second = controller.loadFocus("b");
  pending.get("a")({ profile: { did: "a" } }); await first; assert.equal(state.loadingDid, "b");
  pending.get("b")(null); await second; assert.equal(state.loadingDid, ""); assert.equal(state.nodes.has("a"), true);
  calls.length = 0; controller.select("a"); assert.equal(state.loadingDid, "a");
  pending.get("a")(null); await Promise.resolve(); await Promise.resolve(); assert.equal(state.loadingDid, "");
});

test("common mutual loading guards center/targets, merges results, resets viewport and handles failure", async () => {
  const { controller, state, calls, response } = await networkFocusFixture();
  await controller.loadCommon(""); await controller.loadCommon("viewer"); assert.equal(calls.length, 0);
  response.result = { commonProfiles: [{ did: "p", handle: "partner" }, { did: "viewer" }], commonDids: [" p ", "p", null, ""] };
  state.selectedDid = "a"; state.query = "old"; state.filterMode = "common";
  await controller.loadCommon(" a ");
  const request = calls.find((entry) => entry[0] === "request");
  assert.deepEqual(request[2], { centerActor: "viewer", focusActor: "a" }); assert.equal(request[3].timeoutMs, 420000);
  assert.equal(state.commonDids.size, 1); assert.equal(state.nodes.size, 1); assert.equal(state.query, ""); assert.equal(state.filterMode, "all");
  assert.equal(state.fitAll, true); assert.equal(state.zoom, 1); assert.equal(state.panX, 0); assert.equal(state.panY, 0); assert.equal(state.commonLoadingDid, "");
  assert.ok(calls.some((entry) => entry[0] === "query")); assert.ok(calls.some((entry) => entry[0] === "translation" && entry[2]?.count === "1"));
  request[3].onProgress({ step: "Common", detail: "Detail" }); assert.equal(calls.at(-1)[1], "Common \u00b7 Detail");
  state.commonLoadingDid = "a"; const count = calls.length; await controller.loadCommon("a"); assert.equal(calls.length, count);
  state.commonLoadingDid = ""; response.result = { commonDids: "invalid" }; await controller.loadCommon("a"); assert.equal(state.commonDids.size, 0);
  response.error = new Error("common failed"); state.filterMode = "common"; await controller.loadCommon("a");
  assert.equal(state.commonTargetDid, ""); assert.equal(state.filterMode, "all"); assert.equal(state.commonLoadingDid, "");
  assert.ok(calls.some((entry) => entry[0] === "status" && entry[1] === "common failed"));
  state.viewer = null; state.accountDid = ""; state.authDid = ""; calls.length = 0;
  await controller.loadCommon("a"); assert.equal(calls.length, 0);
  state.authDid = "fallback"; response.error = null; response.result = null;
  await controller.loadCommon("a");
  assert.equal(calls.find((entry) => entry[0] === "request")[2].centerActor, "fallback");
  assert.equal(state.commonDids.size, 0);
});

test("network profile merges preserve known metadata, counts and relationship unions", async () => {
  const { mergeNetworkNode } = await importProjectModule("js/tools/network.js");
  const previous = { did: "a", handle: "alice", displayName: "Alice", avatar: "avatar", description: "bio", followersCount: 9, followsCount: 4, postsCount: 7, followingViewer: true };
  const incoming = { did: "a", handle: "", displayName: "", avatar: "", followersCount: 0, followsCount: "bad", followedByViewer: true };
  const merged = mergeNetworkNode(previous, incoming);
  assert.equal(merged.handle, "alice"); assert.equal(merged.avatar, "avatar"); assert.equal(merged.description, "bio");
  assert.equal(merged.followersCount, 9); assert.equal(merged.followsCount, 4); assert.equal(merged.postsCount, 7);
  assert.equal(merged.followingViewer, true); assert.equal(merged.followedByViewer, true);
  assert.equal(previous.followedByViewer, undefined); assert.equal(incoming.followersCount, 0);
  assert.deepEqual(mergeNetworkNode(null), { followingViewer: false, followedByViewer: false });
  assert.equal(mergeNetworkNode(null, { followingViewer: "true" }).followingViewer, false);
  assert.throws(() => mergeNetworkNode(null, null), TypeError);
});

test("network ranking, threshold, relation/text filters and limits keep legacy semantics", async () => {
  const { rankNetworkNodes, calculateStrongNetworkThreshold, selectNetworkNodes } = await importProjectModule("js/tools/network.js");
  const nodes = [{ did: "f", handle: "follower", followedByViewer: true },
    { did: "m", handle: "mutual", displayName: "Mixed Name", followedByViewer: true, followingViewer: true },
    { did: "g", handle: "following", followingViewer: true }, { did: "o", handle: "other" }];
  assert.deepEqual(rankNetworkNodes(nodes).map((node) => node.did), ["m", "f", "g", "o"]);
  assert.equal(nodes[0].did, "f"); assert.equal(calculateStrongNetworkThreshold([]), 0);
  assert.equal(calculateStrongNetworkThreshold(nodes), 100);
  for (const [mode, did] of [["mutual", "m"], ["followers", "f"], ["following", "g"], ["strong", "m"]]) {
    assert.deepEqual(selectNetworkNodes(nodes, { mode }).map((node) => node.did), [did]);
  }
  assert.deepEqual(selectNetworkNodes(nodes, { mode: "common", commonDids: new Set(["f"]) }).map((node) => node.did), ["f"]);
  assert.deepEqual(selectNetworkNodes(nodes, { mode: "common" }), []);
  assert.deepEqual(selectNetworkNodes(nodes, { query: "  MIXED  " }).map((node) => node.did), ["m"]);
  assert.equal(selectNetworkNodes(nodes, { limit: -2 }).length, 0);
  assert.equal(selectNetworkNodes(nodes, { limit: 2 }).length, 2);
  assert.equal(selectNetworkNodes(nodes, { mode: "unknown", limit: NaN }).length, 4);
  assert.deepEqual(selectNetworkNodes(), []);
  const tied = [{ handle: "z" }, { handle: "a" }]; assert.deepEqual(rankNetworkNodes(tied).map((node) => node.handle), ["a", "z"]);
  const strong = Array.from({ length: 30 }, (_, index) => ({ followersCount: index }));
  assert.equal(calculateStrongNetworkThreshold(strong), 100);
  const mutuals = strong.map((node) => ({ ...node, followingViewer: true, followedByViewer: true }));
  assert.equal(calculateStrongNetworkThreshold(mutuals), 132);
});

test("network alphabetical sorting keeps locale, direction, name/handle/DID ties and input order", async () => {
  const { sortNetworkProfiles } = await importProjectModule("js/tools/network.js");
  const nodes = [{ did: "b", displayName: "Same", handle: "same" }, { did: "a", displayName: "same", handle: "same" }, { did: "c", displayName: "Alice", handle: "z" }];
  assert.deepEqual(sortNetworkProfiles(nodes, { locale: "en" }).map((node) => node.did), ["c", "a", "b"]);
  assert.deepEqual(sortNetworkProfiles(nodes, { locale: "en", direction: "desc" }).map((node) => node.did), ["b", "a", "c"]);
  assert.deepEqual(sortNetworkProfiles(nodes, { field: "handle" }).map((node) => node.did), ["a", "b", "c"]);
  assert.equal(nodes[0].did, "b"); assert.deepEqual(sortNetworkProfiles(), []);
  assert.deepEqual(sortNetworkProfiles([{ did: "z" }, {}]).map((node) => node.did), [undefined, "z"]);
});

test("network viewport fit and manual zoom clamp pan without mutating layout or state", async () => {
  const { calculateNetworkViewport } = await importProjectModule("js/tools/network.js");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const layout = { width: 800, height: 600, contentBounds: { minX: 100, maxX: 900, minY: 50, maxY: 650 } };
  const state = { fitAll: true, zoom: 99, panX: 12, panY: -7 }; const limits = { min: 0.5, max: 4, clamp };
  assert.deepEqual(calculateNetworkViewport(layout, state, limits), { viewport: { x: 28, y: -22, width: 944, height: 744, zoom: 1 }, panX: 12, panY: -7 });
  const manual = calculateNetworkViewport(layout, { fitAll: false, zoom: 99, panX: 1e6, panY: -1e6 }, limits);
  assert.deepEqual(manual, { viewport: { x: 780, y: -30, width: 200, height: 150, zoom: 4 }, panX: 380, panY: -305 });
  assert.equal(state.zoom, 99); assert.equal(layout.contentBounds.minX, 100);
  assert.equal(calculateNetworkViewport(layout, { fitAll: false, zoom: -1, panX: 0, panY: 0 }, limits).viewport.zoom, 0.5);
  const fallback = calculateNetworkViewport({ width: 0, height: 0 }, state, limits);
  assert.equal(fallback.viewport.width, 145); assert.equal(fallback.viewport.height, 145);
});

test("network content bounds include selection and focus island while ignoring missing positions", async () => {
  const { calculateNetworkContentBounds } = await importProjectModule("js/tools/network.js");
  const layout = { centerX: 100, centerY: 100, positions: new Map([["a", { x: 400, y: -50 }]]) };
  assert.deepEqual(calculateNetworkContentBounds(layout, [], ""), { minX: 36, maxX: 164, minY: 36, maxY: 192 });
  assert.deepEqual(calculateNetworkContentBounds(layout, [{ did: "missing" }, { did: "a" }], "a"), { minX: 36, maxX: 455, minY: -105, maxY: 192 });
  const focus = calculateNetworkContentBounds({ ...layout, hasFocusIsland: true, focusCenterY: 500 }, [], "a", [{ did: "preview" }]);
  assert.deepEqual(focus, { minX: -78, maxX: 278, minY: 36, maxY: 678 });
  assert.equal(layout.hasFocusIsland, undefined); assert.equal(layout.positions.get("a").x, 400);
});

test("account picker uses the shared dialog and returns the selected account", async () => {
  const pickerModule = await importProjectModule("js/tools/account-picker.js");
  const dialog = {
    open: false,
    showModal() {
      this.open = true;
    },
  };
  const input = {
    value: "",
    dispatchedEvents: [],
    focus() {},
    select() {},
    dispatchEvent(event) {
      this.dispatchedEvents.push(event.type);
      return true;
    },
  };
  const element = {
    textContent: "",
    dataset: {},
    replaceChildren() {},
  };
  let dialogContext = "mention";
  let clearedMentionTarget = 0;
  let resetSearchRequest = 0;
  let searchQuery = "";
  let selectedActor = null;
  let selectedValue = "";
  let closeCalls = 0;
  const picker = pickerModule.createAccountPickerController({
    dialog,
    eyebrow: element,
    title: element,
    note: element,
    status: element,
    results: element,
    input,
  }, {
    translate(key, values = {}) {
      if (key === "accountPickerDialogTitle") {
        return `Account: ${values.label}`;
      }
      return key;
    },
    getDialogContext() {
      return dialogContext;
    },
    setDialogContext(context) {
      dialogContext = context;
    },
    clearMentionTarget() {
      clearedMentionTarget += 1;
    },
    resetSearchRequest() {
      resetSearchRequest += 1;
    },
    runSearch(query) {
      searchQuery = query;
    },
    closeDialog() {
      closeCalls += 1;
    },
    autoOpenDelayMs: 100,
    minimumQueryLength: 2,
  });

  picker.open({
    label: "Account",
    initialQuery: "@alice.test",
    sourceInput: input,
    onSelect(actor, value) {
      selectedActor = actor;
      selectedValue = value;
    },
  });

  assert.equal(dialog.open, true);
  assert.equal(dialogContext, "account");
  assert.equal(input.value, "alice.test");
  assert.equal(searchQuery, "alice.test");
  assert.equal(clearedMentionTarget, 1);
  assert.equal(resetSearchRequest, 1);
  assert.equal(picker.select({ handle: "alice.test", did: "did:plc:alice" }), true);
  assert.deepEqual(selectedActor, { handle: "alice.test", did: "did:plc:alice" });
  assert.equal(selectedValue, "alice.test");
  assert.equal(closeCalls, 1);
  assert.equal(pickerModule.getAccountPickerSelectionValue({ did: "did:plc:alice" }), "did:plc:alice");
  assert.equal(pickerModule.getAccountPickerSelectionValue({}), "");
});

test("account picker binds saved-account item actions", async () => {
  const accountPicker = await importProjectModule("js/tools/account-picker.js");
  const elements = {
    accountButton: new EventTarget(),
    authActionButton: new EventTarget(),
    removeButton: new EventTarget(),
  };
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = accountPicker.bindAccountSwitcherItemEvents(elements, {
    accountClick: handler,
    authActionClick: handler,
    removeClick: handler,
  });
  assert.equal(bound, 3);
  elements.accountButton.dispatchEvent(new Event("click"));
  elements.authActionButton.dispatchEvent(new Event("click"));
  elements.removeButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("DM archive helpers keep contact filtering, selection and loading contracts stable", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const contacts = [
    { did: "did:plc:zoe", handle: "zoe.test", displayName: "Zoe" },
    { did: "did:plc:anna", handle: "anna.test", displayName: "Anna" },
  ];
  assert.deepEqual(dmArchive.getDmArchiveFilters(["did:plc:anna"], "2026-01-01", "2026-01-31"), {
    participantDid: "did:plc:anna",
    from: "2026-01-01",
    to: "2026-01-31",
  });
  assert.deepEqual(dmArchive.getDmVisibleContacts(contacts, "ann", "de").map((contact) => contact.did), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.toggleDmSelectedParticipant([], "did:plc:anna"), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.toggleDmSelectedParticipant(["did:plc:anna"], "did:plc:anna"), []);
  assert.deepEqual(dmArchive.retainDmSelectedParticipants(["did:plc:anna", "did:plc:missing"], contacts), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.getDmArchiveOverview({
    manifest: { conversationCount: 2, messageCount: 5, participantCount: 3 },
  }), {
    conversationCount: 2,
    messageCount: 5,
    participantCount: 3,
  });
  assert.equal(dmArchive.getDmArchivePreviewConversations({ conversations: [{ id: "one" }, { id: "two" }] }, 1).length, 1);

  let state = { accessChecked: false };
  let renderCalls = 0;
  let lastProgress = null;
  const requests = [];
  const controller = dmArchive.createDmArchiveController({
    getState() {
      return state;
    },
    setState(nextState) {
      state = { ...state, ...nextState };
    },
    translate(key) {
      return key;
    },
    assertAccess() {},
    getAuthAccount() {
      return { did: "did:plc:self" };
    },
    getAuthAccountDid() {
      return "did:plc:self";
    },
    async sendRequest(type) {
      requests.push(type);
      return { ok: true };
    },
    setProgress(progress) {
      lastProgress = progress;
    },
    renderWorkspace() {
      renderCalls += 1;
    },
    async savePartnerCache() {},
  });
  await controller.checkAccess();
  assert.deepEqual(requests, ["CHECK_DM_ACCESS"]);
  assert.equal(state.accessChecked, true);
  assert.equal(renderCalls, 1);
  assert.equal(lastProgress.title, "dmCheckDoneTitle");

  state = {
    accessChecked: true,
    catalog: null,
    from: "2026-01-01",
    to: "2026-01-31",
    recentContacts: [],
    recentConversations: [],
    recentContactAssets: [],
    selectedParticipantDids: [],
  };
  const loadingRequests = [];
  let cacheSaves = 0;
  const loadingController = dmArchive.createDmArchiveController({
    getState() {
      return state;
    },
    setState(nextState) {
      state = { ...state, ...nextState };
    },
    translate(key) {
      return key;
    },
    assertAccess() {},
    getAuthAccount() {
      return { did: "did:plc:self" };
    },
    getAuthAccountDid() {
      return "did:plc:self";
    },
    async sendRequest(type) {
      loadingRequests.push(type);
      if (type === "LIST_DM_PARTNERS") {
        return {
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test" }],
          conversations: [{ id: "conversation-one" }],
        };
      }
      if (type === "HYDRATE_DM_PARTNER_AVATARS") {
        return {
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test", avatarPath: "dm-avatars/anna.png" }],
          conversations: [{ id: "conversation-one" }],
          assets: [{ path: "dm-avatars/anna.png" }],
        };
      }
      if (type === "EXPORT_DM_ARCHIVE") {
        return {
          manifest: { conversationCount: 1, messageCount: 2 },
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test" }],
          conversations: [{ id: "conversation-one" }],
          assets: [{ path: "dm-avatars/anna.png" }, { path: "other/file.png" }],
        };
      }
      throw new Error(`Unexpected request: ${type}`);
    },
    setProgress() {},
    renderWorkspace() {},
    async savePartnerCache() {
      cacheSaves += 1;
    },
  });
  await loadingController.loadPartners();
  assert.deepEqual(loadingRequests, ["LIST_DM_PARTNERS", "HYDRATE_DM_PARTNER_AVATARS"]);
  assert.equal(state.recentContactAssets.length, 1);
  assert.equal(cacheSaves, 2);
  state.selectedParticipantDids = ["did:plc:anna"];
  await loadingController.loadArchive(async () => {
    throw new Error("The already checked access must not be checked again.");
  });
  assert.equal(loadingRequests.at(-1), "EXPORT_DM_ARCHIVE");
  assert.equal(state.catalog.manifest.messageCount, 2);
  assert.deepEqual(state.recentContactAssets, [{ path: "dm-avatars/anna.png" }]);
});

test("DM archive UI binds workspace controls through explicit callbacks", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const controls = Array.from({ length: 9 }, () => new EventTarget());
  let calls = 0;
  const bound = dmArchive.bindDmArchiveEvents({
    contactSearchInput: controls[0],
    checkButton: controls[1],
    loadPartnersButton: controls[2],
    fromInput: controls[3],
    toInput: controls[4],
    loadButton: controls[5],
    exportJsonButton: controls[6],
    exportHtmlButton: controls[7],
    exportPdfButton: controls[8],
  }, {
    contactSearchInput: () => { calls += 1; },
    checkClick: () => { calls += 1; },
    loadPartnersClick: () => { calls += 1; },
    dateChange: () => { calls += 1; },
    loadClick: () => { calls += 1; },
    exportJsonClick: () => { calls += 1; },
    exportHtmlClick: () => { calls += 1; },
    exportPdfClick: () => { calls += 1; },
  });
  assert.equal(bound, 9);
  controls[0].dispatchEvent(new Event("input"));
  controls[1].dispatchEvent(new Event("click"));
  controls[2].dispatchEvent(new Event("click"));
  controls[3].dispatchEvent(new Event("change"));
  controls[4].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("click"));
  controls[6].dispatchEvent(new Event("click"));
  controls[7].dispatchEvent(new Event("click"));
  controls[8].dispatchEvent(new Event("click"));
  assert.equal(calls, 9);
});

test("DM archive export controller builds JSON, HTML and PDF downloads", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const createdFiles = [];
  const sharedFiles = [];
  let allowSensitiveExport = true;
  const confirmationCalls = [];
  const exportController = dmArchive.createDmArchiveExportController({
    assertAccess() {},
    async confirmExport() { confirmationCalls.push("confirm"); return allowSensitiveExport; },
    translate(key) {
      return key;
    },
    setProgress() {},
    createFile(parts, name, type) {
      const file = { parts, name, type };
      createdFiles.push(file);
      return file;
    },
    async shareOrDownloadFile(file, name) {
      sharedFiles.push({ file, name });
    },
    async ensureAvatarAssets() {},
    async buildHtmlDocument() {
      return "<!doctype html>";
    },
    getFileBaseName() {
      return "threadline-dm-self-partner-2026-09-10";
    },
    collectMessages() {
      return [{ id: "message" }];
    },
    paginatePdfMessages() {
      return [[{ message: { id: "message" } }]];
    },
    async renderPdfPage() {
      return { width: 10, height: 10, bytes: new Uint8Array([1]), annotations: [] };
    },
    buildPdfFile() {
      return new Blob(["pdf"], { type: "application/pdf" });
    },
    getConversationTitle() {
      return "Partner";
    },
  });
  const catalog = {
    manifest: { messageCount: 1 },
    conversations: [{ id: "conversation" }],
    assets: [],
  };

  await exportController.exportJson(catalog);
  await exportController.exportHtml(catalog);
  await exportController.exportPdf(catalog);

  assert.equal(createdFiles.length, 3);
  assert.equal(createdFiles[0].type, "application/json");
  assert.equal(createdFiles[1].name, "threadline-dm-self-partner-2026-09-10.html");
  assert.equal(createdFiles[2].type, "application/pdf");
  assert.equal(sharedFiles.length, 3);
  assert.equal(confirmationCalls.length, 3);
  allowSensitiveExport = false;
  await exportController.exportJson(catalog);
  assert.equal(createdFiles.length, 3);
  assert.equal(confirmationCalls.length, 4);
});

test("Thread Explorer helpers normalize actors, feeds, records and public links", async () => {
  const explorer = await importProjectModule("js/tools/thread-explorer.js");

  assert.equal(explorer.normalizeThreadExplorerAccountMode(" replies "), "replies");
  assert.equal(explorer.normalizeThreadExplorerAccountMode("unknown"), "posts");
  assert.equal(explorer.getThreadExplorerFeedUriFromSource("feed:at://generator"), "at://generator");
  assert.equal(explorer.getThreadExplorerSearchIdFromSource("search:abc"), "abc");
  assert.equal(explorer.normalizeThreadExplorerActorFocusMode("all"), "all");
  assert.deepEqual(explorer.createThreadExplorerActorStub("@alice.test", (value) => value.replace(/^@/, "")), {
    did: "",
    handle: "alice.test",
    displayName: "alice.test",
  });
  assert.equal(explorer.isThreadExplorerOwnActor({ handle: "Alice.test" }, "alice.test", "", (value) => value), true);
  assert.equal(explorer.isThreadExplorerOwnActor({ did: "did:plc:other" }, "", "did:plc:own", (value) => value), false);
  assert.equal(explorer.getThreadExplorerOwnActor([{ did: "did:plc:own", handle: "alice.test" }], "did:plc:own", ""), "alice.test");
  assert.equal(explorer.isThreadExplorerOwnAccountTarget("@Alice.test", "alice.test", "", (value) => value.replace(/^@/, "")), true);
  assert.equal(explorer.isThreadExplorerForeignAccountMode("other.test", "alice.test", "", (value) => value), true);
  assert.equal(explorer.isThreadExplorerForeignActorFocusMode(null, "alice.test", "", (value) => value), false);
  assert.equal(explorer.isThreadExplorerForeignActorFocusMode({ handle: "other.test" }, "alice.test", "", (value) => value), true);
  assert.equal(explorer.getThreadExplorerRequestedActor("other.test", "alice.test", "", (value) => value), "other.test");
  assert.equal(typeof explorer.renderThreadExplorerFeedPanel, "function");
  assert.equal(typeof explorer.renderThreadExplorerActorFocusPanel, "function");
  assert.equal(typeof explorer.renderThreadExplorerTreeEdges, "function");
  assert.equal(typeof explorer.createThreadExplorerFeedItemFragment, "function");
  assert.equal(typeof explorer.renderThreadExplorerPostGallery, "function");
  assert.equal(typeof explorer.applyThreadExplorerPostImagePreviewShape, "function");
  assert.equal(typeof explorer.syncThreadExplorerPostCardImageShape, "function");
  assert.equal(typeof explorer.createThreadExplorerPostImageFigure, "function");
  assert.equal(typeof explorer.renderThreadExplorerQuoteGallery, "function");
  assert.equal(typeof explorer.createThreadExplorerQuotePreviewImage, "function");
  assert.equal(typeof explorer.renderThreadExplorerQuotePostCard, "function");
  assert.equal(typeof explorer.renderThreadExplorerExternalLinkCard, "function");
  assert.equal(typeof explorer.hideThreadExplorerExternalCardImage, "function");
  const galleryChildren = [];
  const gallery = {
    dataset: {},
    hidden: false,
    replaceChildren() { galleryChildren.length = 0; },
    appendChild(child) { galleryChildren.push(child); },
  };
  explorer.renderThreadExplorerPostGallery(gallery, [{ alt: "one" }, { alt: "two" }], (image) => image);
  assert.equal(gallery.dataset.imageCount, "2");
  assert.equal(galleryChildren.length, 2);
  assert.equal(gallery.hidden, false);
  const makeClassList = () => {
    const names = new Set();
    return {
      names,
      add(...values) { values.forEach((value) => names.add(value)); },
      remove(...values) { values.forEach((value) => names.delete(value)); },
      contains(value) { return names.has(value); },
    };
  };
  const shapeFigure = { classList: makeClassList() };
  const shapeGallery = { dataset: { imageCount: "1" }, classList: makeClassList() };
  explorer.applyThreadExplorerPostImagePreviewShape({ naturalWidth: 400, naturalHeight: 800 }, shapeFigure, shapeGallery);
  assert.equal(shapeFigure.classList.contains("is-portrait"), true);
  assert.equal(shapeGallery.classList.contains("has-single-thread-image-portrait"), true);
  const shapeNode = { classList: makeClassList() };
  const shapeCard = { classList: makeClassList(), closest: () => shapeNode };
  explorer.syncThreadExplorerPostCardImageShape(shapeCard, shapeGallery);
  assert.equal(shapeCard.classList.contains("has-single-thread-image-portrait"), true);
  assert.equal(shapeNode.classList.contains("has-single-thread-image-portrait"), true);
  const figureEvents = new Map();
  const figureNodes = new Map([
    [".thread-explorer-image", { classList: makeClassList() }],
    [".thread-explorer-image-button", { addEventListener(type, handler) { figureEvents.set(type, handler); } }],
    ["img", { complete: false, addEventListener(type, handler) { figureEvents.set(`image-${type}`, handler); } }],
    ["figcaption", {}],
  ]);
  const figureImage = figureNodes.get("img");
  const figureCalls = [];
  const createdFigure = explorer.createThreadExplorerPostImageFigure({ alt: "Caption" }, 2, [{}, {}, {}], gallery, {
    cloneTemplate: () => ({ querySelector: (selector) => figureNodes.get(selector) }),
    getImageSources: () => ({ source: "full.jpg", thumb: "thumb.jpg" }),
    setImageSource: (target, source, thumb) => { target.src = source; target.thumb = thumb; },
    onLoad: (...args) => figureCalls.push(["load", ...args]),
    onError: (target) => figureCalls.push(["error", target]),
    openGallery: (...args) => figureCalls.push(["gallery", ...args]),
  });
  assert.equal(createdFigure, figureNodes.get(".thread-explorer-image"));
  assert.equal(figureImage.src, "full.jpg");
  assert.equal(figureImage.thumb, "thumb.jpg");
  assert.equal(figureNodes.get("figcaption").textContent, "Caption");
  figureEvents.get("click")();
  assert.equal(figureCalls.some((call) => call[0] === "gallery" && call[2] === 2), true);
  assert.equal(explorer.createThreadExplorerPostImageFigure({}, 0, [], gallery), null);
  explorer.renderThreadExplorerQuoteGallery(gallery, {
    images: [{}, {}],
    imagePreviewEntries: [{ source: "a" }],
  }, (entry) => entry);
  assert.equal(gallery.dataset.imageCount, "2");
  assert.equal(galleryChildren.length, 1);
  const quoteImageEvents = new Map();
  const quoteImage = {
    complete: false,
    addEventListener(type, handler, options) { quoteImageEvents.set(type, { handler, options }); },
  };
  const openedGallery = [];
  const createdQuoteImage = explorer.createThreadExplorerQuotePreviewImage(
    { source: "https://example.test/image.jpg", alt: "Test image", imageIndex: 1 },
    [{ src: "first" }, { src: "second" }],
    gallery,
    {
      createImage: () => quoteImage,
      setImageSource: (target, source) => { target.src = source; },
      openGallery: (images, index) => openedGallery.push({ images, index }),
    },
  );
  assert.equal(createdQuoteImage, quoteImage);
  assert.equal(quoteImage.src, "https://example.test/image.jpg");
  assert.equal(quoteImage.alt, "Test image");
  assert.equal(quoteImage.loading, "lazy");
  let preventedDefault = false;
  let stoppedPropagation = false;
  quoteImageEvents.get("click").handler({
    preventDefault() { preventedDefault = true; },
    stopPropagation() { stoppedPropagation = true; },
  });
  assert.equal(preventedDefault, true);
  assert.equal(stoppedPropagation, true);
  assert.equal(openedGallery[0].index, 1);
  assert.equal(explorer.createThreadExplorerQuotePreviewImage({}, [], null), null);

  const quoteNodes = new Map();
  const quoteCard = {
    hidden: false,
    setAttribute(name, value) { this[name] = value; },
    addEventListener(type, handler) { this[type] = handler; },
  };
  const quoteAvatar = {};
  const quoteAuthor = {};
  const quoteHandle = {};
  const quoteText = {};
  const quoteGallery = {};
  const quoteMeta = {};
  quoteNodes.set(".thread-explorer-quote-card", quoteCard);
  quoteNodes.set(".thread-explorer-quote-card-avatar", quoteAvatar);
  quoteNodes.set(".thread-explorer-quote-card-author", quoteAuthor);
  quoteNodes.set(".thread-explorer-quote-card-handle", quoteHandle);
  quoteNodes.set(".thread-explorer-quote-card-text", quoteText);
  quoteNodes.set(".thread-explorer-quote-card-gallery", quoteGallery);
  quoteNodes.set(".thread-explorer-quote-card-meta", quoteMeta);
  const quoteRenderCalls = [];
  explorer.renderThreadExplorerQuotePostCard({ quoteCard: { author: { handle: "alice.test" } } }, {
    querySelector(selector) { return quoteNodes.get(selector); },
  }, {
    buildDisplay: () => ({
      uri: "at://quoted-post",
      url: "https://bsky.app/profile/alice.test/post/quoted-post",
      authorLabel: "Alice",
      handleLabel: "@alice.test",
      text: "Quoted text",
      metaText: "Quoted date",
    }),
    markAvatar: (element, actor) => quoteRenderCalls.push(["mark", element, actor]),
    getAvatarUri: () => "https://example.test/avatar.jpg",
    getActorLabel: () => "Alice",
    setAvatar: (...args) => quoteRenderCalls.push(["avatar", ...args]),
    translate: () => "Open in Thread Explorer",
    renderImages: (...args) => quoteRenderCalls.push(["images", ...args]),
    renderExternalCard: (...args) => quoteRenderCalls.push(["external", ...args]),
    openPost: (uri) => quoteRenderCalls.push(["open", uri]),
  });
  assert.equal(quoteCard.hidden, false);
  assert.equal(quoteCard.href, "https://bsky.app/profile/alice.test/post/quoted-post");
  assert.equal(quoteCard.title, "Open in Thread Explorer");
  assert.equal(quoteAuthor.textContent, "Alice");
  assert.equal(quoteHandle.textContent, "@alice.test");
  assert.equal(quoteText.textContent, "Quoted text");
  assert.equal(quoteMeta.textContent, "Quoted date");
  quoteCard.click({ preventDefault() {} });
  assert.equal(quoteRenderCalls.some((call) => call[0] === "open" && call[1] === "at://quoted-post"), true);
  explorer.renderThreadExplorerQuotePostCard({ quoteCard: {} }, {
    querySelector(selector) { return quoteNodes.get(selector); },
  }, { buildDisplay: () => null });
  assert.equal(quoteCard.hidden, true);

  const classes = new Set();
  const card = {
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, force) {
        if (force) { classes.add(name); } else { classes.delete(name); }
      },
    },
  };
  const imageHandlers = new Map();
  const image = {
    dataset: {},
    removeEventListener(type) { imageHandlers.delete(type); },
    addEventListener(type, handler) { imageHandlers.set(type, handler); },
    removeAttribute() {},
  };
  const title = {};
  const description = {};
  const url = {};
  const fragmentNodes = new Map([
    [".card", card], [".image", image], [".title", title], [".description", description], [".url", url],
  ]);
  explorer.renderThreadExplorerExternalLinkCard({ url: "https://example.test", title: "Example", thumb: "" }, {
    querySelector(selector) { return fragmentNodes.get(selector); },
  }, {
    cardSelector: ".card", imageSelector: ".image", titleSelector: ".title", descriptionSelector: ".description", urlSelector: ".url",
    getFaviconUrl: () => "https://example.test/favicon.ico",
    setImageSource: (target, source) => { target.src = source; },
  });
  assert.equal(card.href, "https://example.test");
  assert.equal(image.src, "https://example.test/favicon.ico");
  assert.equal(classes.has("has-favicon-thumb"), true);
  const errorCardClasses = makeClassList();
  errorCardClasses.add("has-favicon-thumb");
  const failedImage = {
    hidden: false,
    removeAttribute(name) { this.removedAttribute = name; },
    closest: (selector) => selector === ".quote-link" ? { classList: errorCardClasses } : null,
  };
  let errorRefreshCount = 0;
  explorer.hideThreadExplorerExternalCardImage({ currentTarget: failedImage }, {
    cardSelector: ".quote-link",
    onError: () => { errorRefreshCount += 1; },
  });
  assert.equal(failedImage.hidden, true);
  assert.equal(failedImage.removedAttribute, "src");
  assert.equal(errorCardClasses.contains("has-no-thumb"), true);
  assert.equal(errorCardClasses.contains("has-favicon-thumb"), false);
  assert.equal(errorRefreshCount, 1);
  explorer.hideThreadExplorerExternalCardImage(null, { cardSelector: ".quote-link" });
  assert.deepEqual(
    explorer.getChronologicalThreadExplorerReplies([
      { post: { createdAt: "2026-01-02T00:00:00Z" } },
      { post: { createdAt: "2026-01-01T00:00:00Z" } },
    ]).map((item) => item.post.createdAt),
    ["2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"],
  );
  assert.equal(
    explorer.prepareThreadExplorerRenderedNode(
      { post: { uri: "at://post", likeCount: 2 }, replies: [] },
      { getEngagementScore: () => 2, getEngagementTier: () => "quiet", getDisplayModel: () => ({}) },
    ).engagementTier,
    "quiet",
  );
  assert.equal(typeof explorer.getThreadExplorerRenderedNodeParts, "function");
  assert.equal(typeof explorer.appendThreadExplorerRenderedReplies, "function");
  assert.equal(typeof explorer.renderThreadExplorerTreePanel, "function");
  assert.equal(typeof explorer.configureThreadExplorerNodeToggle, "function");
  assert.equal(typeof explorer.applyThreadExplorerRenderedNodeState, "function");
  assert.equal(typeof explorer.renderThreadExplorerDeletedAnchor, "function");
  assert.equal(typeof explorer.renderThreadExplorerPostCardBasics, "function");
  assert.equal(typeof explorer.configureThreadExplorerActorFocusTriggers, "function");
  assert.equal(typeof explorer.bindThreadExplorerCardInteractions, "function");
  assert.equal(typeof explorer.createThreadExplorerRenderedItem, "function");
  assert.equal(typeof explorer.createThreadExplorerReplyClusterRenderNode, "function");
  assert.equal(typeof explorer.appendThreadExplorerReplyClusterNodes, "function");
  assert.equal(typeof explorer.createThreadExplorerReplyClusterWorkspace, "function");
  assert.equal(explorer.normalizeThreadExplorerSource("feed:at://did:plc:alice/app.bsky.feed.generator/feed", {
    isFeedUri: (value) => value.startsWith("at://"),
    hasSavedSearch: () => false,
  }), "feed:at://did:plc:alice/app.bsky.feed.generator/feed");
  assert.equal(explorer.normalizeThreadExplorerOrientation("horizontal", "horizontal"), "horizontal");
  assert.equal(explorer.normalizeThreadExplorerViewMode("reply-cluster", "reply-cluster"), "reply-cluster");
  const selectedSources = [];
  explorer.handleThreadExplorerFeedSelectChange({ currentTarget: { value: "feed:test" } }, {
    normalizeSource: (value) => value,
    setSource: (value) => selectedSources.push(value),
  });
  explorer.handleThreadExplorerSourceSelectChange({ currentTarget: { value: "followers" } }, {
    normalizeSource: (value) => value,
    setSource: (value) => selectedSources.push(value),
  });
  assert.deepEqual(selectedSources, ["feed:test", "followers"]);
  const scrollList = { scrollHeight: 1000, scrollTop: 700, clientHeight: 300 };
  const scrollCalls = [];
  explorer.handleThreadExplorerFeedScroll(scrollList, { hasMore: true, loading: false }, (options) => scrollCalls.push(options));
  explorer.handleThreadExplorerActorFocusScroll(scrollList, { hasMore: true, loading: false }, (options) => scrollCalls.push(options));
  assert.deepEqual(scrollCalls, [{ append: true }, { append: true }]);
  let selectedMode = "";
  const modeLoads = [];
  explorer.handleThreadExplorerActorModeChange({ currentTarget: { value: "replies" } }, {
    normalizeMode: (value) => value,
    setMode: (value) => { selectedMode = value; },
    loadFeed: (options) => modeLoads.push(options),
  });
  assert.equal(selectedMode, "replies");
  assert.deepEqual(modeLoads, [{ append: false }]);
  const zoomCalls = [];
  explorer.handleThreadExplorerZoomOutClick({
    cancelPendingZoomReset: () => zoomCalls.push("cancel"),
    getZoom: () => 1,
    setZoom: (value) => zoomCalls.push(value),
  });
  explorer.handleThreadExplorerZoomInClick({
    cancelPendingZoomReset: () => zoomCalls.push("cancel"),
    getZoom: () => 1,
    setZoom: (value) => zoomCalls.push(value),
  });
  explorer.handleThreadExplorerOrientationClick(() => zoomCalls.push("orientation"));
  assert.deepEqual(zoomCalls, ["cancel", 1 / 1.15, "cancel", 1.15, "orientation"]);
  const dialogCalls = [];
  explorer.handleThreadExplorerCountClick({ currentTarget: { dataset: { reactionType: "Likes", uri: "at://post", cid: "cid" } } }, (...args) => dialogCalls.push(args));
  explorer.handleThreadExplorerRepliesCountClick({ currentTarget: { dataset: { uri: "at://post" } } }, (...args) => dialogCalls.push(args));
  assert.deepEqual(dialogCalls, [["Likes", "at://post", "cid"], ["at://post"]]);
  const expandedUris = new Set(["at://open"]);
  const rerenders = [];
  explorer.toggleThreadExplorerReplyClusterNode("at://open", expandedUris, () => rerenders.push("render"));
  explorer.toggleThreadExplorerReplyClusterNode("at://new", expandedUris, () => rerenders.push("render"));
  assert.equal(expandedUris.has("at://open"), false);
  assert.equal(expandedUris.has("at://new"), true);
  assert.deepEqual(rerenders, ["render", "render"]);
  const wheelCalls = [];
  const wheelEvent = {
    deltaX: 2,
    deltaY: -3,
    clientX: 10,
    clientY: 20,
    altKey: false,
    shiftKey: false,
    preventDefault: () => wheelCalls.push("prevent"),
  };
  explorer.handleThreadExplorerWheel(wheelEvent, {
    scrollDelta: (...args) => wheelCalls.push(["scroll", ...args]),
    renderEdges: () => wheelCalls.push("edges"),
    zoomAtPoint: (...args) => wheelCalls.push(["zoom", ...args]),
  });
  assert.deepEqual(wheelCalls, ["prevent", ["zoom", 1.14, 10, 20]]);
  const dragState = { value: null };
  const dragCalls = [];
  const pointerEvent = {
    button: 0,
    pointerId: 4,
    clientX: 10,
    clientY: 20,
    timeStamp: 1,
    target: {},
    preventDefault: () => dragCalls.push("prevent"),
  };
  explorer.handleThreadExplorerPointerDown(pointerEvent, dragState, {
    isInteractiveTarget: () => false,
    cancelInertia: () => {},
    setPanArmed: () => {},
    getPanX: () => 0,
    getPanY: () => 0,
    capturePointer: () => dragCalls.push("capture"),
  });
  assert.equal(dragState.value.pointerId, 4);
  const velocityState = { lastSampleTime: 10, lastSampleX: 5, lastSampleY: 6, velocityX: 0, velocityY: 0 };
  explorer.updateThreadExplorerPanVelocity(velocityState, { timeStamp: 20, clientX: 25, clientY: 16 });
  assert.deepEqual(velocityState, { lastSampleTime: 20, lastSampleX: 25, lastSampleY: 16, velocityX: 2, velocityY: 1 });
  const panState = explorer.applyThreadExplorerPanDelta({ panX: 10, panY: 20 }, -3, 4);
  assert.deepEqual(panState, { panX: 7, panY: 24 });
  const inertiaState = { velocityX: 1, velocityY: 0 };
  assert.equal(explorer.advanceThreadExplorerPanInertia(inertiaState, 16.67, 0.9, 0.01), true);
  assert.equal(explorer.normalizeThreadExplorerActor("@@alice.bsky.social "), "alice.bsky.social");
  assert.equal(explorer.getThreadExplorerActorFocusId({ did: "did:plc:alice", handle: "alice.test" }), "did:plc:alice");
  assert.equal(explorer.getThreadExplorerActorFocusId({ handle: "alice.test" }), "alice.test");
  assert.equal(explorer.isThreadExplorerFeedUri("at://did:plc:alice/app.bsky.feed.generator/feed"), true);
  assert.equal(explorer.buildThreadExplorerFeedSource("at://did:plc:alice/app.bsky.feed.generator/feed"), "feed:at://did:plc:alice/app.bsky.feed.generator/feed");
  assert.equal(explorer.buildThreadExplorerFeedSource("https://example.test/feed"), "");
  assert.equal(explorer.getThreadExplorerPostRecordKey("at://did:plc:alice/app.bsky.feed.post/abc123"), "abc123");
  assert.equal(explorer.getThreadExplorerPostRecordKey("at://did:plc:alice/app.bsky.feed.like/abc123"), "");
  assert.equal(explorer.buildThreadExplorerPostWebUrl({
    author: { handle: "alice.test" },
    uri: "at://did:plc:alice/app.bsky.feed.post/abc123",
  }, "https://bsky.app/"), "https://bsky.app/profile/alice.test/post/abc123");
  assert.equal(explorer.getThreadExplorerPostImages({ images: [{ thumb: "https://example.test/a.jpg" }] }).length, 1);
  assert.deepEqual(explorer.getThreadExplorerImageSources({ fullsize: "full", thumb: "thumb" }), { source: "full", thumb: "thumb" });
  assert.deepEqual(explorer.getThreadExplorerImageSources({ thumb: "thumb" }), { source: "thumb", thumb: "thumb" });
  assert.deepEqual(explorer.normalizeThreadExplorerGalleryImage({ fullsize: "full", thumb: "thumb", alt: " Alt " }), { src: "full", thumb: "thumb", alt: "Alt" });
  assert.deepEqual(explorer.normalizeThreadExplorerGalleryImages([
    { fullsize: "full", thumb: "thumb" },
    {},
    { thumb: "second" },
  ]), [
    { src: "full", thumb: "thumb", alt: "" },
    { src: "second", thumb: "second", alt: "" },
  ]);
  assert.deepEqual(explorer.buildThreadExplorerGalleryState([
    {},
    { thumb: "first" },
    { fullsize: "second" },
  ], 99), {
    images: [
      { src: "first", thumb: "first", alt: "" },
      { src: "second", thumb: "second", alt: "" },
    ],
    index: 1,
  });
  assert.equal(explorer.buildThreadExplorerGalleryState([]), null);
  assert.deepEqual(explorer.normalizeThreadExplorerHydratedMedia({
    " full ": " data:image/png;base64,abc ",
    empty: "",
    invalid: null,
  }), [{ source: "full", dataUri: "data:image/png;base64,abc" }]);
  assert.equal(explorer.normalizeThreadExplorerGalleryImage({}), null);
  assert.equal(explorer.advanceThreadExplorerGalleryIndex(0, -1, 3), 2);
  assert.equal(explorer.advanceThreadExplorerGalleryIndex(2, 1, 3), 0);
  assert.deepEqual(explorer.getThreadExplorerGalleryFallbackDecision({ src: "full", thumb: "thumb" }), { source: "thumb", fallbackAttempted: true, shouldHide: false });
  assert.deepEqual(explorer.getThreadExplorerGalleryFallbackDecision({ src: "full", thumb: "thumb" }, true), { source: "", fallbackAttempted: true, shouldHide: true });
  assert.equal(explorer.getThreadExplorerFaviconUrl("https://example.test/path"), "https://example.test/favicon.ico");
  assert.equal(explorer.getThreadExplorerFaviconUrl("not a URL"), "");
});

test("Thread Explorer controller keeps view and cluster state together", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const normalized = controllerModule.normalizeThreadExplorerControllerState({ source: "", zoom: "bad", expandedUris: ["at://open"] });
  assert.equal(normalized.source, "follows");
  assert.equal(normalized.zoom, 1);
  assert.equal(normalized.expandedUris.has("at://open"), true);
  const controller = controllerModule.createThreadExplorerController({ expandedUris: ["at://open"] });
  assert.equal(controller.isExpanded("at://open"), true);
  assert.equal(controller.toggleExpanded("at://open"), false);
  assert.equal(controller.toggleExpanded("at://new"), true);
  assert.equal(controller.setViewMode("reply-cluster"), "reply-cluster");
  assert.equal(controller.setOrientation("horizontal"), "horizontal");
});

test("Thread Explorer UI binds workspace controls through explicit handlers", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const controls = Array.from({ length: 11 }, () => new EventTarget());
  let calls = 0;
  const bound = controller.bindThreadExplorerWorkspaceEvents({
    launchButton: controls[0],
    urlButton: controls[1],
    searchesButton: controls[2],
    refreshButton: controls[3],
    sourceSelect: controls[4],
    accountInput: controls[5],
    useOwnAccountButton: controls[6],
    accountModeSelect: controls[7],
    feedSelect: controls[8],
  }, {
    launchClick: () => { calls += 1; },
    urlClick: () => { calls += 1; },
    searchesClick: () => { calls += 1; },
    refreshClick: () => { calls += 1; },
    sourceChange: () => { calls += 1; },
    accountInput: () => { calls += 1; },
    accountChange: () => { calls += 1; },
    accountKeydown: () => { calls += 1; },
    useOwnAccountClick: () => { calls += 1; },
    accountModeChange: () => { calls += 1; },
    feedChange: () => { calls += 1; },
  });
  assert.equal(bound, 11);
  controls[0].dispatchEvent(new Event("click"));
  controls[1].dispatchEvent(new Event("click"));
  controls[2].dispatchEvent(new Event("click"));
  controls[3].dispatchEvent(new Event("click"));
  controls[4].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("input"));
  controls[5].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("keydown"));
  controls[6].dispatchEvent(new Event("click"));
  controls[7].dispatchEvent(new Event("change"));
  controls[8].dispatchEvent(new Event("change"));
  assert.equal(calls, 11);
});

test("Thread Explorer UI binds dialog and gallery controls through explicit handlers", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const urlCloseTopButton = new EventTarget();
  const urlCloseButton = new EventTarget();
  const urlLoadButton = new EventTarget();
  const urlInput = new EventTarget();
  let calls = 0;
  const bound = controller.bindThreadExplorerDialogEvents({
    urlCloseTopButton,
    urlCloseButton,
    urlLoadButton,
    urlInput,
  }, {
    urlClose: () => { calls += 1; },
    urlLoad: () => { calls += 1; },
    urlKeydown: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  urlCloseTopButton.dispatchEvent(new Event("click"));
  urlCloseButton.dispatchEvent(new Event("click"));
  urlLoadButton.dispatchEvent(new Event("click"));
  urlInput.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 4);
});

test("Thread Explorer UI binds global viewport and keyboard events", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const windowTarget = new EventTarget();
  const viewportTarget = new EventTarget();
  let resizeCalls = 0;
  let keydownCalls = 0;
  const bound = controller.bindThreadExplorerGlobalEvents({
    window: windowTarget,
    visualViewport: viewportTarget,
  }, {
    resize: () => { resizeCalls += 1; },
    keydown: () => { keydownCalls += 1; },
  });
  assert.equal(bound, 3);
  windowTarget.dispatchEvent(new Event("resize"));
  viewportTarget.dispatchEvent(new Event("resize"));
  windowTarget.dispatchEvent(new Event("keydown"));
  assert.equal(resizeCalls, 2);
  assert.equal(keydownCalls, 1);
});

test("Thread Explorer UI binds fullscreen and snapshot controls", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const fullscreenCloseButton = new EventTarget();
  const snapshotProgressDialog = new EventTarget();
  const snapshotCancelButton = new EventTarget();
  let calls = 0;
  const bound = controller.bindThreadExplorerSnapshotEvents({
    fullscreenCloseButton,
    snapshotProgressDialog,
    snapshotCancelButton,
  }, {
    fullscreenClose: () => { calls += 1; },
    snapshotCancelEvent: () => { calls += 1; },
    snapshotCancel: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  fullscreenCloseButton.dispatchEvent(new Event("click"));
  snapshotProgressDialog.dispatchEvent(new Event("cancel"));
  snapshotCancelButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("Thread Explorer controller renders workspace in stable order", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const calls = [];
  controllerModule.renderThreadExplorerWorkspace({
    applyFullscreen: () => calls.push("fullscreen"),
    applyOrientation: () => calls.push("orientation"),
    updateControls: () => calls.push("controls"),
    renderFeed: () => calls.push("feed"),
    renderTree: () => calls.push("tree"),
  });
  assert.deepEqual(calls, ["fullscreen", "orientation", "controls", "feed", "tree"]);
});

test("Thread Explorer controller runs feed pagination workflow", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { cursor: "", hasMore: true, items: [], loading: false };
  const calls = [];
  await controllerModule.loadThreadExplorerFeedWorkflow({
    authAccount: "alice",
    state,
    reset: true,
    clearSelection: false,
    isForeignAccount: () => false,
    accountMode: "posts",
    source: "follows",
    savedSearch: null,
    getRequestedActor: () => "",
    request: async () => ({ cursor: "next", items: [{ uri: "one" }] }),
    clearSelectionState: () => {},
    clearErrors: () => {},
    render: () => calls.push("render"),
    appendItems: (current, next) => current.concat(next),
    sortItems: (items) => items,
    restoreSelection: async () => {},
    setError: () => {},
    feedErrorMessage: "failed",
  });
  assert.equal(state.cursor, "next");
  assert.deepEqual(state.items, [{ uri: "one" }]);
  assert.deepEqual(calls, ["render", "render"]);
});

test("Thread Explorer controller runs Actor-Fokus workflow", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { items: [], cursor: "", hasMore: false, loading: false, error: "" };
  await controllerModule.loadThreadExplorerActorFocusWorkflow({
    authAccount: "alice",
    actor: {},
    actorId: "alice.test",
    mode: "posts",
    state,
    request: async () => ({ cursor: "next", items: [{ uri: "one" }] }),
    appendItems: (current, next) => current.concat(next),
    sortItems: (items) => items,
    render: () => {},
    errorMessage: "failed",
  });
  assert.equal(state.cursor, "next");
  assert.deepEqual(state.items, [{ uri: "one" }]);
});

test("Thread Explorer controller loads and selects a thread", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { selectedUri: "", loading: false, cardZoom: {}, tree: null, error: "" };
  const calls = [];
  await controllerModule.loadThreadExplorerThreadWorkflow("at://post", {
    state,
    persistSelection: (uri) => calls.push(["persist", uri]),
    clearMediaCache: () => calls.push("clear"),
    request: async () => ({ root: { post: { uri: "at://post" } } }),
    isClusterMode: () => false,
    resetClusterState: () => {},
    expandClusterTree: () => {},
    render: () => calls.push("render"),
    scheduleFocus: () => calls.push("focus"),
    errorMessage: "failed",
  });
  assert.equal(state.tree.post.uri, "at://post");
  assert.deepEqual(calls, [["persist", "at://post"], "clear", "render", "render", "focus"]);
});

test("Thread Explorer snapshot helpers build safe export data", async () => {
  const snapshot = await importProjectModule("js/tools/thread-explorer-snapshot.js");
  const sanitizePart = (value) => String(value).replace(/[^a-z0-9-]/gi, "-");

  assert.equal(snapshot.buildThreadExplorerSnapshotFileName({
    author: { handle: "@alice.test" },
    createdAt: "2026-09-12T10:00:00Z",
  }, "PNG", sanitizePart), "threadline-thread-alice-test-2026-09-12.png");
  assert.equal(snapshot.countThreadExplorerSnapshotMediaAssets({
    post: { images: [{}], externalCard: { thumb: "thumb" }, quoteCard: { images: [{}, {}] } },
    replies: [{ post: { externalCard: { thumb: "reply-thumb" } } }],
  }), 5);
  assert.equal(snapshot.getThreadExplorerSnapshotScale(1000, 1000, {
    devicePixelRatio: 2,
    maxDimension: 10000,
    maxPixels: 1000000,
  }), 1);
  assert.equal(snapshot.clampThreadExplorerSnapshotProgress(101), 100);
  assert.equal(snapshot.clampThreadExplorerSnapshotProgress(-1), 0);
  const pngCrcTable = snapshot.createThreadExplorerPngCrcTable();
  const pngChunk = snapshot.createThreadExplorerPngChunk("tEXt", new Uint8Array([65, 0, 66]), pngCrcTable);
  assert.equal(new TextDecoder().decode(pngChunk.slice(4, 8)), "tEXt");
  assert.equal(pngChunk.length, 15);
  assert.equal(new DataView(pngChunk.buffer).getUint32(11), snapshot.calculateThreadExplorerPngCrc("tEXt", new Uint8Array([65, 0, 66]), pngCrcTable));
  const pngHeader = snapshot.createThreadExplorerPngHeaderData(12, 34);
  assert.equal(new DataView(pngHeader.buffer).getUint32(0), 12);
  assert.equal(new DataView(pngHeader.buffer).getUint32(4), 34);
  const xmpPacket = snapshot.createThreadExplorerPngXmpPacket("Threadline <test & demo>", new Date("2026-09-18T00:00:00Z"));
  assert.match(xmpPacket, /Threadline &lt;test &amp; demo&gt;/);
  assert.equal(snapshot.escapeThreadExplorerPngXmpText("A & B"), "A &amp; B");
  const pngMetadataChunks = snapshot.createThreadExplorerPngMetadataChunks(pngCrcTable, "Threadline Test", new Date("2026-09-18T00:00:00Z"));
  assert.equal(pngMetadataChunks.length, 4);
  assert.equal(new TextDecoder().decode(pngMetadataChunks[0].slice(4, 8)), "tEXt");
  assert.equal(new TextDecoder().decode(pngMetadataChunks[3].slice(4, 8)), "iTXt");
  const measuredContext = { measureText: (value) => ({ width: value.length }) };
  assert.deepEqual(snapshot.wrapThreadExplorerSnapshotText(measuredContext, "one two three", 3, 2), ["one", "two..."]);
  assert.deepEqual(snapshot.wrapThreadExplorerSnapshotText(measuredContext, "  ", 10), []);
  const drawnText = [];
  assert.equal(snapshot.drawThreadExplorerSnapshotTextBlock({ fillText: (...args) => drawnText.push(args) }, ["a", "b"], 4, 10, 6), 22);
  assert.deepEqual(drawnText, [["a", 4, 10], ["b", 4, 16]]);
  const pathCalls = [];
  const canvasContext = {
    beginPath() { pathCalls.push("begin"); },
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() { pathCalls.push("close"); },
    save() {}, restore() {}, stroke() {},
  };
  snapshot.drawThreadExplorerSnapshotRoundRect(canvasContext, 0, 0, 20, 10, 4);
  snapshot.strokeThreadExplorerSnapshotRoundRect(canvasContext, 0, 0, 20, 10, 4, "black", 2);
  assert.deepEqual(pathCalls, ["begin", "close", "begin", "close"]);
  const countCard = { querySelector: () => ({ children: [{ textContent: " 1 Like " }, { textContent: " 2 Replies " }] }) };
  assert.equal(snapshot.getThreadExplorerSnapshotCountsText(countCard), "1 Like   2 Replies");

  const edgeCalls = [];
  const edgeContext = {
    save() {},
    restore() {},
    stroke(path) { edgeCalls.push(path.data); },
  };
  class FakePath2D {
    constructor(data) { this.data = data; }
  }
  snapshot.drawThreadExplorerSnapshotEdges(edgeContext, [
    { getAttribute: () => "M0 0 L1 1" },
    { getAttribute: () => "" },
  ], () => ({ stroke: "#123456", strokeWidth: "3" }), FakePath2D);
  assert.deepEqual(edgeCalls, ["M0 0 L1 1"]);
  const snapshotSteps = [];
  const snapshotBlob = new Blob(["canvas fallback"]);
  const renderResult = await snapshot.renderThreadExplorerSnapshot({
    root: { post: {} },
    text: (key) => key,
    hydrateAvatars: async () => snapshotSteps.push("avatars"),
    hydrateMedia: async () => snapshotSteps.push("media"),
    restoreAvatarCache: async () => snapshotSteps.push("avatar-cache"),
    renderTree: async () => snapshotSteps.push("tree"),
    cacheRenderedMedia: () => 2,
    applyMediaDataUris: async () => ({ embedded: 2, missing: 0, total: 2 }),
    waitForFrame: async () => snapshotSteps.push("frame"),
    getStage: () => ({ scrollWidth: 100, offsetWidth: 100, scrollHeight: 200, offsetHeight: 200, getBoundingClientRect: () => ({ width: 100, height: 200 }) }),
    shouldUseTiled: () => false,
    renderTiled: async () => assert.fail("unexpected tiled render"),
    renderForeignObject: async () => { throw new Error("foreignObject unavailable"); },
    renderCanvas: async () => snapshotBlob,
    onFallback: (renderer) => snapshotSteps.push(`fallback:${renderer}`),
  });
  assert.equal(renderResult, snapshotBlob);
  assert.deepEqual(snapshotSteps, ["avatars", "media", "avatar-cache", "tree", "frame", "fallback:foreignObject"]);
  const tileCalls = [];
  const tileContext = {
    fillRect() { tileCalls.push("fill"); },
    save() {},
    translate(x, y) { tileCalls.push(`translate:${x}:${y}`); },
    restore() {},
  };
  const renderedTile = snapshot.renderThreadExplorerSnapshotTile({
    x: 4,
    y: 6,
    width: 8,
    height: 10,
    cards: ["card"],
    createCanvas: () => ({ getContext: () => tileContext }),
    backgroundColor: "white",
    drawEdges: () => tileCalls.push("edges"),
    drawCard: (...args) => tileCalls.push(`card:${args[1]}`),
  });
  assert.ok(renderedTile);
  assert.deepEqual(tileCalls, ["fill", "translate:-4:-6", "edges", "card:card"]);

  const canvasSteps = [];
  const fallbackBlob = await snapshot.renderThreadExplorerCanvasSnapshot({
    stage: {
      getBoundingClientRect: () => ({ width: 30, height: 40 }),
      querySelectorAll: () => ["first", "second"],
    },
    width: 30,
    height: 40,
    mimeType: "image/png",
    text: (key) => key,
    createCanvas: () => ({ canvas: {}, context: {} }),
    drawEdges: () => canvasSteps.push("edges"),
    preloadAvatars: async () => new Map(),
    preloadMedia: async () => new Map(),
    drawCard: (_context, card) => canvasSteps.push(card),
    encodeCanvas: async () => snapshotBlob,
  });
  assert.equal(fallbackBlob, snapshotBlob);
  assert.deepEqual(canvasSteps, ["edges", "first", "second"]);
  const mediaSteps = [];
  snapshot.drawThreadExplorerSnapshotMediaImages({}, {
    querySelectorAll: () => [{ alt: "view", src: "media" }],
  }, {}, new Map(), 100, {
    isMediaImage: () => true,
    getStageRect: () => ({ left: 1, top: 2, width: 30, height: 20, bottom: 22 }),
    getDrawableImage: () => null,
    drawCoverImage: () => false,
    drawPlaceholder: () => mediaSteps.push("placeholder"),
    strokeRoundedRect: () => mediaSteps.push("stroke"),
    drawAltText: (_context, alt) => mediaSteps.push(`alt:${alt}`),
  });
  assert.deepEqual(mediaSteps, ["placeholder", "stroke", "alt:view"]);
  assert.equal(snapshot.getThreadExplorerSnapshotBackgroundColor({
    stage: { id: "stage" },
    tree: { id: "tree" },
    body: { id: "body" },
  }, (element) => {
    if (element.id === "stage") {
      return { backgroundColor: "rgba(0, 0, 0, 0)" };
    }
    if (element.id === "tree") {
      return { backgroundColor: "rgb(1, 2, 3)" };
    }
    return { backgroundColor: "white" };
  }), "rgb(1, 2, 3)");

  const tiledBlob = await snapshot.renderThreadExplorerTiledPngSnapshot({
    width: 1,
    height: 1,
    tileSize: 1,
    text: (key) => key,
    stage: { getBoundingClientRect: () => ({}), querySelectorAll: () => [] },
    preloadAvatars: async () => new Map(),
    preloadMedia: async () => new Map(),
    renderTile: () => ({ getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }) }) }),
    crcTableFactory: () => new Uint32Array(),
    chunkFactory: () => new Uint8Array(),
    headerFactory: () => new Uint8Array(),
    metadataFactory: () => [],
    requestFrame: (callback) => callback(),
  });
  assert.equal(tiledBlob.type, "image/png");
  const minimalPng = new Uint8Array(34);
  minimalPng.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const pngWithMetadata = await snapshot.addThreadExplorerPngMetadata(new Blob([minimalPng]), {
    applicationLabel: "Threadline Test",
    metadataDate: new Date("2026-09-18T00:00:00Z"),
  });
  assert.equal(pngWithMetadata.type, "image/png");
  assert.equal(pngWithMetadata.size > minimalPng.length, true);
  const invalidPng = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  assert.equal(await snapshot.addThreadExplorerPngMetadata(invalidPng), invalidPng);
  const avatarImage = { dataset: { avatarDid: " did:alice ", avatarUrl: " https://example.test/a.jpg " } };
  const avatarAsset = { did: "did:alice", url: "https://example.test/a.jpg", data: "avatar-data" };
  assert.equal(snapshot.getThreadExplorerSnapshotAvatarCacheKey(avatarImage), "did:alice|https://example.test/a.jpg");
  assert.equal(snapshot.getThreadExplorerSnapshotCachedAvatarUri(avatarImage, [avatarAsset], (asset) => `data:${asset.data}`), "data:avatar-data");
  const mediaImage = {
    hidden: false,
    classList: { contains: (name) => name === "thread-explorer-avatar" },
    closest: () => ({}) ,
    dataset: { snapshotSource: "full", snapshotThumb: "thumb" },
    currentSrc: "thumb",
    src: "blob:rendered",
  };
  assert.equal(snapshot.isThreadExplorerSnapshotMediaImage(mediaImage), false);
  mediaImage.classList.contains = () => false;
  assert.equal(snapshot.isThreadExplorerSnapshotMediaImage(mediaImage), true);
  assert.deepEqual(snapshot.getThreadExplorerSnapshotMediaImageKeys(mediaImage), ["full", "thumb", "blob:rendered"]);
  assert.equal(snapshot.getThreadExplorerSnapshotMediaImageKey(mediaImage), "full");
  const drawable = {};
  assert.equal(snapshot.getThreadExplorerSnapshotDrawableMediaImage(mediaImage, new Map([["thumb", drawable]])), drawable);
  const imageCache = new Map([["thumb", "data:cached"]]);
  assert.equal(snapshot.getThreadExplorerSnapshotMediaDataUri(["full", "thumb"], [new Map(), imageCache]), "data:cached");
  const targetImage = { dataset: {}, removeAttribute(name) { this.removed = name; } };
  snapshot.setThreadExplorerSnapshotCachedImageSource(targetImage, "full", "thumb", () => "data:cached");
  assert.equal(targetImage.dataset.snapshotSource, "full");
  assert.equal(targetImage.dataset.snapshotThumb, "thumb");
  assert.equal(targetImage.dataset.snapshotHydrated, "true");
  assert.equal(targetImage.src, "data:cached");
  snapshot.setThreadExplorerSnapshotCachedImageSource(targetImage, "", "", () => "");
  assert.equal(targetImage.removed, "src");
  const avatarLoads = [];
  const avatarCardA = { avatar: { key: "alice" } };
  const avatarCardB = { avatar: { key: "alice" } };
  const loadedAvatar = {};
  const preloadedAvatars = await snapshot.preloadThreadExplorerSnapshotAvatarImages([avatarCardA, avatarCardB], {
    getAvatar: (card) => card.avatar,
    getCacheKey: (avatar) => avatar.key,
    getCachedAvatarUri: () => "data:avatar",
    loadImage: async (source) => { avatarLoads.push(source); return loadedAvatar; },
  });
  assert.equal(avatarLoads.length, 1);
  assert.equal(preloadedAvatars.get("alice"), loadedAvatar);
  const mediaLoads = [];
  const firstMedia = { currentSrc: "https://example.test/full.jpg", src: "https://example.test/full.jpg" };
  const duplicateMedia = { currentSrc: "https://example.test/full.jpg", src: "https://example.test/full.jpg" };
  const mediaCard = { querySelectorAll: () => [firstMedia, duplicateMedia] };
  const loadedMedia = {};
  const preloadedMedia = await snapshot.preloadThreadExplorerSnapshotMediaImages([mediaCard], {
    getImages: (card) => card.querySelectorAll("img"),
    isMediaImage: () => true,
    getImageKeys: () => ["https://example.test/full.jpg", "https://example.test/thumb.jpg"],
    getCachedDataUri: () => "",
    encodeImage: () => "",
    canDrawImage: () => true,
    loadImage: async (source) => { mediaLoads.push(source); return loadedMedia; },
  });
  assert.equal(mediaLoads.length, 1);
  assert.equal(mediaLoads[0], "https://example.test/full.jpg");
  assert.equal(preloadedMedia.get("https://example.test/full.jpg"), loadedMedia);
  assert.equal(preloadedMedia.get("https://example.test/thumb.jpg"), loadedMedia);
  const snapshotMediaCache = new Map();
  const cachedRenderedImage = {
    complete: true,
    naturalWidth: 640,
    naturalHeight: 480,
    src: "https://example.test/rendered.jpg",
    dataset: {},
  };
  assert.equal(snapshot.cacheThreadExplorerSnapshotMediaImage(cachedRenderedImage, {
    isMediaImage: () => true,
    getImageKeys: () => ["full", "thumb"],
    encodeImage: () => "data:rendered-image",
    cache: snapshotMediaCache,
  }), true);
  assert.equal(snapshotMediaCache.get("full"), "data:rendered-image");
  assert.equal(snapshotMediaCache.get("thumb"), "data:rendered-image");
  const visibleImage = { src: "https://example.test/visible.jpg", dataset: {} };
  const visibleApplied = snapshot.applyThreadExplorerSnapshotMediaCache([visibleImage], {
    isMediaImage: () => true,
    getImageKeys: () => ["visible"],
    getCachedDataUri: () => "data:visible",
  });
  assert.equal(visibleApplied, 1);
  assert.equal(visibleImage.src, "data:visible");
  assert.equal(visibleImage.dataset.snapshotHydrated, "true");
  const loadedStage = { querySelectorAll: () => [cachedRenderedImage, { hidden: true }] };
  assert.equal(snapshot.cacheLoadedThreadExplorerSnapshotMediaImages(loadedStage, {
    isMediaImage: (image) => image === cachedRenderedImage,
    cacheImage: () => {},
  }), 1);
  const sourceCloneImage = { index: 0 };
  const sourceStage = { querySelectorAll: () => [sourceCloneImage] };
  const clonedImage = {
    attributes: {},
    classList: { added: [], add(value) { this.added.push(value); } },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const clonedStage = { querySelectorAll: () => [clonedImage] };
  snapshot.inlineThreadExplorerSnapshotImages(sourceStage, clonedStage, {
    getCachedAvatarUri: () => "",
    getHydratedMediaUri: () => "",
    encodeImage: () => "",
    fallbackAvatarUri: "data:fallback-avatar",
  });
  assert.equal(clonedImage.attributes.src, "data:fallback-avatar");
  assert.deepEqual(clonedImage.classList.added, ["is-snapshot-fallback-image"]);
  const hydratedImage = { media: true, src: "remote", dataset: { snapshotSource: "remote" } };
  const missingImage = { media: true, src: "remote-missing", dataset: {} };
  const progressUpdates = [];
  const storedHydratedUris = [];
  const hydrationCounts = await snapshot.applyThreadExplorerSnapshotMediaDataUris([hydratedImage, missingImage], {
    isMediaImage: (image) => image.media,
    getHydratedMediaUri: (image) => image === hydratedImage ? "data:hydrated" : "",
    getImageKeys: (image) => [image.dataset.snapshotSource || image.src],
    storeDataUri: (keys, uri) => storedHydratedUris.push([keys, uri]),
    throwIfAborted: () => {},
    buildProgress: ({ index, total, embedded, skipped }) => ({ index, total, embedded, skipped }),
    onProgress: async (progress) => progressUpdates.push(progress),
  });
  assert.deepEqual(hydrationCounts, { total: 2, embedded: 1, missing: 1 });
  assert.equal(hydratedImage.src, "data:hydrated");
  assert.equal(hydratedImage.dataset.snapshotHydrated, "true");
  assert.deepEqual(storedHydratedUris, [[ ["remote"], "data:hydrated" ]]);
  assert.deepEqual(progressUpdates, [
    { index: 0, total: 2, embedded: 1, skipped: 0 },
    { index: 1, total: 2, embedded: 1, skipped: 1 },
  ]);
  await assert.rejects(snapshot.applyThreadExplorerSnapshotMediaDataUris([hydratedImage], {
    isMediaImage: () => true,
    throwIfAborted: () => { throw Object.assign(new Error("Cancelled"), { name: "AbortError" }); },
  }), { name: "AbortError" });
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => snapshot.throwIfThreadExplorerSnapshotAborted(controller.signal), { name: "AbortError" });
});

test("network helpers calculate visible relations and capped scores", async () => {
  const network = await importProjectModule("js/tools/network.js");

  assert.equal(network.getNetworkRelationType({ followingViewer: true, followedByViewer: true }), "mutual");
  assert.equal(network.getNetworkRelationType({ followedByViewer: true }), "followers");
  assert.equal(network.getNetworkRelationType({ followingViewer: true }), "following");
  assert.equal(network.getNetworkRelationType({}), "other");
  assert.deepEqual(network.getNetworkScoreBreakdown({
    followingViewer: true,
    followedByViewer: true,
    followersCount: 1000,
    postsCount: 400,
  }), {
    relationScore: 120,
    followersScore: 80,
    postsScore: 40,
    total: 240,
  });
  assert.equal(network.getNetworkNodeScore({ followersCount: 5, postsCount: 10 }), 37);
});

test("network UI binds viewport controls and calculates stage center", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const listeners = {};
  const stage = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
  };
  const button = (name) => ({ addEventListener: (type, handler) => { listeners[name] = handler; } });
  const calls = [];
  networkUi.bindNetworkViewportControls({ stage, zoomIn: button("in") }, {
    zoomAtPoint: (...args) => calls.push(args),
  });
  listeners.in();
  assert.deepEqual(calls, [[1.24, 110, 70]]);
});

test("network UI binds workspace filters and loading actions", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const listeners = {};
  const target = (name) => ({
    value: "",
    dataset: { networkFilter: name },
    addEventListener: (type, handler) => { listeners[`${name}:${type}`] = handler; },
  });
  let calls = 0;
  const bound = networkUi.bindNetworkWorkspaceEvents({
    filterButtons: [target("followers")],
    searchInput: target("search"),
    loadButton: target("load"),
  }, {
    filterClick: () => { calls += 1; },
    searchInput: () => { calls += 1; },
    load: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  listeners["followers:click"]({ currentTarget: target("followers") });
  listeners["search:input"]();
  listeners["load:click"]();
  assert.equal(calls, 3);
});

test("network UI binds stage mode controls through explicit callbacks", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const enterButton = new EventTarget();
  const exitButton = new EventTarget();
  const focusButton = new EventTarget();
  const listsButton = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkStageModeEvents({
    enterButton,
    exitButton,
    focusButton,
    listsButton,
  }, {
    enterClick: () => { calls += 1; },
    exitClick: () => { calls += 1; },
    focusClick: () => { calls += 1; },
    listsClick: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  enterButton.dispatchEvent(new Event("click"));
  exitButton.dispatchEvent(new Event("click"));
  focusButton.dispatchEvent(new Event("click"));
  listsButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 4);
});

test("network UI binds insight groups and focus controls", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const groupButton = new EventTarget();
  const focusToggleButton = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkInsightEvents({
    groupButtons: [groupButton],
    focusToggleButton,
  }, {
    groupClick: () => { calls += 1; },
    focusToggleClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  groupButton.dispatchEvent(new Event("click"));
  focusToggleButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("network UI binds stage pointer interactions", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const stage = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkStageInteractionEvents({ stage }, {
    wheel: () => { calls += 1; },
    pointerDown: () => { calls += 1; },
    pointerMove: () => { calls += 1; },
    pointerUp: () => { calls += 1; },
  });
  assert.equal(bound, 6);
  stage.dispatchEvent(new Event("wheel"));
  stage.dispatchEvent(new Event("pointerdown"));
  stage.dispatchEvent(new Event("pointermove"));
  stage.dispatchEvent(new Event("pointerup"));
  stage.dispatchEvent(new Event("pointercancel"));
  stage.dispatchEvent(new Event("pointerleave"));
  assert.equal(calls, 6);
});

test("network UI binds lifecycle and results scroll events", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const documentTarget = new EventTarget();
  const results = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkLifecycleEvents({ document: documentTarget, results }, {
    fullscreenChange: () => { calls += 1; },
    keydown: () => { calls += 1; },
    resultsScroll: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  documentTarget.dispatchEvent(new Event("fullscreenchange"));
  documentTarget.dispatchEvent(new Event("keydown"));
  results.dispatchEvent(new Event("scroll"));
  assert.equal(calls, 3);
});

test("Thread Explorer layout helpers calculate card geometry", async () => {
  const layout = await importProjectModule("js/tools/thread-explorer-layout.js");
  const expandedUris = new Set();
  assert.equal(layout.ensureThreadExplorerReplyClusterRootExpanded("at://root", expandedUris), true);
  assert.equal(expandedUris.has("at://root"), true);
  assert.equal(layout.ensureThreadExplorerReplyClusterRootExpanded("", expandedUris), false);
  assert.deepEqual(layout.getThreadExplorerReplyClusterEdgeAnchor({ x: 0, y: 0 }, { width: 100, height: 60 }, { x: 200, y: 0 }), { x: 50, y: 0 });
  assert.deepEqual(layout.getThreadExplorerReplyClusterNodeRect({ position: { x: 100, y: 80 } }, { width: 40, height: 20 }), {
    left: 80, top: 70, right: 120, bottom: 90, width: 40, height: 20,
  });
  const item = { offsetWidth: 120, offsetHeight: 80, style: { values: {}, setProperty(name, value) { this.values[name] = value; } } };
  assert.deepEqual(layout.getThreadExplorerReplyClusterItemSize(item), { width: 120, height: 80 });
  layout.setThreadExplorerReplyClusterItemPosition(item, 12.4, 18.6);
  assert.equal(item.style.values["--thread-explorer-cluster-x"], "12px");
  assert.equal(layout.getThreadExplorerReplyClusterChildrenBreadth([{ subtreeWidth: 100 }, { subtreeWidth: 120 }], 20), 240);
  assert.equal(layout.getThreadExplorerReplyClusterRootChildAngles([{ subtreeWidth: 100 }], 300).length, 1);
  assert.equal(layout.getThreadExplorerReplyClusterRootChildAngles([{ subtreeWidth: 100 }, { subtreeWidth: 100 }], 300).length, 2);
  const measuredRoot = { item: {}, children: [{ item: {}, children: [] }] };
  const measured = layout.measureThreadExplorerReplyClusterSubtree(measuredRoot, () => ({ width: 100, height: 60 }));
  assert.deepEqual(measured, { width: 220, height: 264 });
  const positioned = [];
  layout.placeThreadExplorerReplyClusterSubtree(measuredRoot, 100, 100, 0, positioned, () => {});
  assert.equal(positioned.length, 2);
  const starRoot = { item: {}, children: [{ item: {}, children: [] }] };
  const starState = { rootRenderNode: starRoot, positionedItems: [] };
  let boundsApplied = false;
  layout.layoutThreadExplorerReplyCluster(starState, {
    getItemSize: () => ({ width: 100, height: 60 }),
    setItemPosition: () => {},
    setNodePosition: (node, x, y) => { node.position = { x, y }; },
    applyBounds: () => { boundsApplied = true; },
  });
  assert.equal(starState.positionedItems.length, 2);
  assert.equal(starRoot.position.x, 720);
  assert.equal(starRoot.position.y, 540);
  assert.equal(boundsApplied, true);
  const edgeLayer = { children: [], replaceChildren() { this.children = []; }, appendChild(node) { this.children.push(node); } };
  const svgNode = (tag, attrs) => ({ tag, attrs });
  layout.renderThreadExplorerReplyClusterEdges({
    edgeLayer,
    positionedItems: [{
      item: {},
      position: { x: 100, y: 100 },
      children: [{ item: {}, position: { x: 300, y: 100 }, children: [] }],
    }],
  }, { getItemSize: () => ({ width: 80, height: 40 }), createSvgNode: svgNode });
  assert.equal(edgeLayer.children.length, 1);
  const layoutState = {
    cluster: { style: {} },
    edgeLayer: { setAttribute(name, value) { this[name] = value; } },
    positionedItems: [{ item: {}, position: { x: 20, y: 20 } }],
  };
  let didRenderEdges = false;
  layout.applyThreadExplorerReplyClusterBounds(layoutState, {
    getItemSize: () => ({ width: 100, height: 60 }),
    setItemPosition: () => {},
    renderEdges: () => { didRenderEdges = true; },
  });
  assert.equal(layoutState.cluster.style.width, "1120px");
  assert.equal(layoutState.positionedItems[0].position.x, 130);
  assert.equal(didRenderEdges, true);
});

test("Thread Explorer card hydration delegates rendering and finalization", async () => {
  const hydration = await importProjectModule("js/tools/thread-explorer-hydration.js");
  const card = { dataset: {}, calls: [] };
  const post = { uri: "at://post" };
  const options = {
    getDisplayModel: () => ({ ready: true }),
    renderAvatar: () => card.calls.push("avatar"),
    renderMedia: () => card.calls.push("media"),
    renderEmbeds: () => card.calls.push("embeds"),
    finalize: () => card.calls.push("finalize"),
  };
  assert.equal(hydration.hydrateThreadExplorerCard(card, post, options), true);
  assert.deepEqual(card.calls, ["avatar", "media", "embeds", "finalize"]);
  assert.equal(hydration.hydrateThreadExplorerCard(card, post, options), false);

  const calls = [];
  const avatar = {};
  const gallery = {};
  const renderCard = {
    querySelector(selector) {
      if (selector === ".thread-explorer-avatar") {
        return avatar;
      }
      if (selector === ".thread-explorer-post-gallery") {
        return gallery;
      }
      return null;
    },
  };
  const author = { handle: "alice.test" };
  hydration.renderThreadExplorerCardAvatar(renderCard, { author }, {
    markAvatar: (image, actor) => calls.push(["mark-avatar", image, actor]),
    getAvatarUri: (actor) => `avatar:${actor.handle}`,
    getActorLabel: (actor) => actor.handle,
    setAvatar: (...args) => calls.push(["set-avatar", ...args]),
  });
  hydration.renderThreadExplorerCardMedia(renderCard, post, {
    renderImages: (...args) => calls.push(["images", ...args]),
    syncShape: (...args) => calls.push(["shape", ...args]),
  });
  hydration.renderThreadExplorerCardEmbeds(renderCard, post, { externalCardDisplay: { url: "https://example.test" } }, {
    renderExternalCard: (...args) => calls.push(["external", ...args]),
    renderQuoteCard: (...args) => calls.push(["quote", ...args]),
  });
  assert.equal(calls[0][0], "mark-avatar");
  assert.deepEqual(calls[1], ["set-avatar", avatar, "avatar:alice.test", "alice.test"]);
  assert.deepEqual(calls[2], ["images", post, gallery]);
  assert.deepEqual(calls[3], ["shape", renderCard, gallery]);
  assert.deepEqual(calls[4], ["external", post, { url: "https://example.test" }, renderCard]);
  assert.deepEqual(calls[5], ["quote", post, renderCard]);

  assert.equal(hydration.getThreadExplorerActorAvatarUri({ avatarDataUri: " data:cached ", avatar: "remote" }), "data:cached");
  assert.equal(hydration.getThreadExplorerActorAvatarUri({ avatar: " remote " }), "remote");
  const avatarAssets = [{ did: "did:alice", url: "https://example.test/alice.jpg", blob: "alice-blob" }];
  const cachedActor = { did: "did:alice", avatar: "https://example.test/alice.jpg" };
  assert.equal(hydration.findThreadExplorerActorAvatarAsset(cachedActor, avatarAssets), avatarAssets[0]);
  assert.equal(hydration.findThreadExplorerActorAvatarAsset({ did: "did:missing", avatar: "url" }, avatarAssets), null);
  assert.equal(hydration.applyThreadExplorerActorAvatarFromCache(cachedActor, avatarAssets, (asset) => `data:${asset.blob}`), true);
  assert.equal(cachedActor.avatarDataUri, "data:alice-blob");
  const avatarImage = { dataset: {} };
  hydration.markThreadExplorerAvatarImage(avatarImage, cachedActor);
  assert.deepEqual(avatarImage.dataset, { avatarDid: "did:alice", avatarUrl: "https://example.test/alice.jpg" });
  const nestedTree = {
    post: {
      author: { did: "did:alice" },
      quoteCard: { author: { did: "did:bob" } },
    },
    replies: [{ post: { author: { did: "did:carol" } }, replies: [] }],
  };
  hydration.applyThreadExplorerAvatarHydration(nestedTree, {
    "did:alice": { dataUri: "data:alice" },
    "did:bob": { dataUri: "data:bob" },
    "did:carol": { dataUri: "data:carol" },
  });
  assert.equal(nestedTree.post.author.avatarDataUri, "data:alice");
  assert.equal(nestedTree.post.quoteCard.author.avatarDataUri, "data:bob");
  assert.equal(nestedTree.replies[0].post.author.avatarDataUri, "data:carol");
  const localCacheTree = { post: { author: { did: "did:alice", avatar: "https://example.test/alice.jpg" } }, replies: [] };
  hydration.applyThreadExplorerAvatarCacheToTree(localCacheTree, avatarAssets, (asset) => `data:${asset.blob}`);
  assert.equal(localCacheTree.post.author.avatarDataUri, "data:alice-blob");
});

test("Thread Explorer media hydration delegates transport and media results", async () => {
  const mediaHydration = await importProjectModule("js/tools/thread-explorer-media-hydration.js");
  const calls = [];
  const result = await mediaHydration.hydrateThreadExplorerMedia({ post: { uri: "at://root" } }, {
    request: async (root, options) => {
      calls.push([root.post.uri, options.timeoutMs]);
      options.onProgress({ phase: "thread_explorer_media", current: 1 });
      return { media: { image: "data:image/png;base64,abc" } };
    },
    onProgress: (progress) => calls.push(progress.phase),
    onMedia: (media) => calls.push(Object.keys(media).length),
  });
  assert.equal(result.media.image, "data:image/png;base64,abc");
  assert.deepEqual(calls, [["at://root", 420000], "thread_explorer_media", 1]);
});

test("Thread Explorer rendering helpers delegate shared presentation", async () => {
  const rendering = await importProjectModule("js/tools/thread-explorer-rendering.js");
  const post = { text: "hello" };
  assert.equal(rendering.getThreadExplorerActorLabel({}, "unknown", (actor, fallback) => fallback), "unknown");
  assert.equal(rendering.getThreadExplorerPreviewText(post, "empty", 20, () => "preview"), "preview");
  assert.equal(rendering.formatThreadExplorerDate("date", "de", (value, locale) => `${locale}:${value}`), "de:date");
  assert.equal(rendering.countThreadExplorerPosts({ post: {}, replies: [{ post: {} }, { post: { isDeletedThreadAnchor: true } }] }), 2);
  const list = { replaceChildren() {}, appendChild() {} };
  const status = { textContent: "" };
  rendering.renderThreadExplorerReactionActors([], {
    list,
    status,
    template: {},
    translate: (key) => key,
    formatCount: (count) => String(count),
    cloneTemplate: () => ({ querySelector: () => ({}) }),
    setAvatar: () => {},
  });
  assert.equal(status.textContent, "threadExplorerReactionsEmpty");
});

test("analysis and archive helpers produce clean identifiers and filenames", async () => {
  const analysis = await importProjectModule("js/tools/analysis.js");
  const archive = await importProjectModule("js/tools/archive.js");
  const exportDate = new Date("2026-09-09T12:00:00.000Z");

  assert.equal(analysis.normalizeAnalysisActor("@@alice.test "), "alice.test");
  assert.equal(archive.formatArchiveDatePart("2026-01-02T09:00:00Z", exportDate), "2026-01-02");
  assert.equal(archive.formatArchiveDatePart("", exportDate), "2026-09-09");
  assert.equal(archive.buildArchiveMediaFileBaseName("@@alice test!", "fallback", exportDate), "threadline-media-alice-test--2026-09-09");
  assert.equal(archive.buildArchiveMediaPartFileName("threadline-media-alice-2026-09-09", 1, 12), "threadline-media-alice-2026-09-09-part-002-of-012.zip");
});

test("archive UI binds preference controls through explicit callbacks", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const scope = new EventTarget();
  const sourceInput = new EventTarget();
  const fromInput = new EventTarget();
  let calls = 0;

  const bound = archive.bindArchivePreferenceEvents({
    scope,
    sourceInput,
    fromInput,
  }, {
    scopeChange: () => {
      calls += 1;
    },
    sourceInput: () => {
      calls += 1;
    },
    fromChange: () => {
      calls += 1;
    },
  });

  assert.equal(bound, 3);
  scope.dispatchEvent(new Event("change"));
  sourceInput.dispatchEvent(new Event("input"));
  fromInput.dispatchEvent(new Event("change"));
  assert.equal(calls, 3);
});

test("archive UI binds Post-Edit-Check dialog controls", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const elements = {
    urlInput: new EventTarget(),
    submitButton: new EventTarget(),
    closeTopButton: new EventTarget(),
    closeButton: new EventTarget(),
    dialog: new EventTarget(),
  };
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = archive.bindPostEditCheckDialogEvents(elements, {
    urlKeydown: handler,
    submitClick: handler,
    close: handler,
    cancel: handler,
  });
  assert.equal(bound, 5);
  elements.urlInput.dispatchEvent(new Event("keydown"));
  elements.submitButton.dispatchEvent(new Event("click"));
  elements.closeTopButton.dispatchEvent(new Event("click"));
  elements.closeButton.dispatchEvent(new Event("click"));
  elements.dialog.dispatchEvent(new Event("cancel"));
  assert.equal(calls, 5);
});

test("archive UI binds result export actions", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const elements = {
    zipButton: new EventTarget(),
    htmlButton: new EventTarget(),
    pdfButton: new EventTarget(),
  };
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = archive.bindArchiveResultExportEvents(elements, {
    zipClick: handler,
    htmlClick: handler,
    pdfClick: handler,
  });
  assert.equal(bound, 3);
  elements.zipButton.dispatchEvent(new Event("click"));
  elements.htmlButton.dispatchEvent(new Event("click"));
  elements.pdfButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("archive UI binds loading and reset actions through explicit callbacks", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const nextWaveButton = new EventTarget();
  const threadUrlInput = new EventTarget();
  const loadThreadUrlButton = new EventTarget();
  const importButton = new EventTarget();
  const resetButton = new EventTarget();
  const pauseButton = new EventTarget();
  const resumeButton = new EventTarget();
  const cancelButton = new EventTarget();
  let calls = 0;

  const bound = archive.bindArchiveActionEvents({
    nextWaveButton,
    threadUrlInput,
    loadThreadUrlButton,
    importButton,
    resetButton,
    pauseButton,
    resumeButton,
    cancelButton,
  }, {
    nextWaveClick: () => {
      calls += 1;
    },
    threadUrlKeydown: () => {
      calls += 1;
    },
    loadThreadUrlClick: () => {
      calls += 1;
    },
    importClick: () => {
      calls += 1;
    },
    resetClick: () => {
      calls += 1;
    },
    pauseClick: () => {
      calls += 1;
    },
    resumeClick: () => {
      calls += 1;
    },
    cancelClick: () => {
      calls += 1;
    },
  });

  assert.equal(bound, 8);
  nextWaveButton.dispatchEvent(new Event("click"));
  threadUrlInput.dispatchEvent(new Event("keydown"));
  loadThreadUrlButton.dispatchEvent(new Event("click"));
  importButton.dispatchEvent(new Event("click"));
  resetButton.dispatchEvent(new Event("click"));
  pauseButton.dispatchEvent(new Event("click"));
  resumeButton.dispatchEvent(new Event("click"));
  cancelButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 8);
});

test("tools layout keeps the intended workspace order", async () => {
  const layout = await importProjectModule("js/tools/tools-layout.js");
  const searchElement = { id: "search" };
  const entries = layout.getToolsWorkspaceEntries({ search: searchElement });

  assert.deepEqual(layout.TOOL_WORKSPACE_IDS, ["archive", "search", "network", "threadExplorer", "analysis", "dm"]);
  assert.equal(entries[1][0], "search");
  assert.equal(entries[1][1], searchElement);
  assert.equal(entries[0][1], undefined);
});

test("tools page binds analysis and DM navigation", async () => {
  const toolsPage = await importProjectModule("js/tools/tools-layout.js");
  const analysisButton = new EventTarget();
  const dmButton = new EventTarget();
  let calls = 0;
  const bound = toolsPage.bindToolsWorkspaceNavigationEvents({ analysisButton, dmButton }, {
    analysisClick: () => { calls += 1; },
    dmClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  analysisButton.dispatchEvent(new Event("click"));
  dmButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("search result cards expose an explicit renderer contract", async () => {
  const searchResults = await importProjectModule("js/tools/search-results.js");
  const renderer = searchResults.createSearchResultCardRenderer({
    nodeTemplate: null,
    getDisplayModel: () => ({}),
  });

  assert.equal(typeof renderer, "function");
  assert.equal(renderer({}), null);
});

test("search UI binds filters and actions through explicit callbacks", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const modeSelect = new EventTarget();
  const queryInput = new EventTarget();
  const runButton = new EventTarget();
  const clearButton = new EventTarget();
  let calls = 0;
  const bound = search.bindSearchWorkspaceEvents({
    modeSelect,
    queryInput,
    runButton,
    clearButton,
  }, {
    modeChange: () => { calls += 1; },
    summaryInput: () => { calls += 1; },
    runClick: () => { calls += 1; },
    clearClick: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  modeSelect.dispatchEvent(new Event("change"));
  queryInput.dispatchEvent(new Event("input"));
  runButton.dispatchEvent(new Event("click"));
  clearButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 4);
});

test("search UI binds dialog and saved-search controls", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const hashtagCloseTop = new EventTarget();
  const savedSearchAddButton = new EventTarget();
  const savedSearchUrlInput = new EventTarget();
  let calls = 0;
  const bound = search.bindSearchDialogEvents({
    hashtagCloseTop,
    savedSearchAddButton,
    savedSearchUrlInput,
  }, {
    hashtagClose: () => { calls += 1; },
    savedSearchAdd: () => { calls += 1; },
    savedSearchKeydown: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  hashtagCloseTop.dispatchEvent(new Event("click"));
  savedSearchAddButton.dispatchEvent(new Event("click"));
  savedSearchUrlInput.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 3);
});

test("optional DM gate owns secret cleanup, session reuse and denied/hash/error transitions", async () => {
  const { createDmAccessGate } = await importProjectModule("js/tools/dm-archive.js");
  assert.throws(() => createDmAccessGate(), /href/);
  for (const mode of ["disabled","valid","invalid","stored","error"]) {
    const values = new Map(), calls = [], state = { checked:false, unlocked:false };
    if(mode === "stored") values.set("access","1");
    let href = "https://example.test/tools.html?keep=1&secret=hello#other=2&key=hidden";
    const options = { state, enabled: mode !== "disabled", queryKey:"secret",hashKey:"key",sessionKey:"access", secretHash:"ab",
      href: () => href, replaceUrl: value => {calls.push(["url",value]);href=new URL(value,href).href;}, storage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},
      crypto:{subtle:{digest:async()=>{if(mode==="error")throw Error("crypto");return new Uint8Array([mode === "valid" ? 171 : 0]).buffer;}}},
      setVisible: value=>calls.push(["visible",value]),workspace:()=>"dm",showComposer:()=>calls.push(["composer"]),render:()=>calls.push(["render"]),updateAuth:()=>calls.push(["auth"]),restoreWorkspace:()=>calls.push(["restore"]),report:()=>calls.push(["report"]),lockedMessage:()=>"locked" };
    const gate = createDmAccessGate(options); assert.equal(gate.secret(),"hello"); await gate.apply();
    const allowed = ["disabled","valid","stored"].includes(mode);
    assert.equal(gate.available(),allowed); assert.equal(state.checked,allowed); assert.equal(state.unlocked,allowed);
    assert.equal(new URL(href).searchParams.get("keep"),"1"); assert.equal(new URL(href).searchParams.has("secret"),false);
    assert.equal(new URL(href).hash,"#other=2"); assert.equal(gate.secret(),"");
    if (allowed) gate.assert(); else assert.throws(()=>gate.assert(),/locked/);
    assert.equal(values.has("access"),allowed && mode!=="disabled");
    assert.equal(calls.some(call=>call[0]==="composer"),!allowed); assert.equal(calls.some(call=>call[0]==="report"),mode==="error");
    assert.deepEqual(calls.slice(-3),[["render"],["auth"],["restore"]]);
  }
});

test("tree collapse discovery and compact archive dates preserve boundary behavior", async () => {
  const {collectCollapsibleThreadExplorerUris}=await importProjectModule("js/tools/thread-explorer-layout.js");
  const found=new Set();
  collectCollapsibleThreadExplorerUris({post:{uri:"root"},replies:[{post:{uri:"branch"},replies:[{post:{uri:"leaf"},replies:[]}]}]},found);
  assert.deepEqual([...found],["root","branch"]);
  collectCollapsibleThreadExplorerUris(null,found);collectCollapsibleThreadExplorerUris({replies:"bad"},found);assert.equal(found.size,2);
  const {formatCompactArchiveTimestamp}=await importProjectModule("js/tools/archive-workspace-models.js");
  assert.equal(formatCompactArchiveTimestamp("2026-11-08T12:34:00"),"08.11.2026 12.34");
  assert.equal(formatCompactArchiveTimestamp("invalid"),"invalid");assert.equal(formatCompactArchiveTimestamp(undefined),"");
});

/** Builds the account/focus transaction with real actor models and controlled loaders.
 * @returns {Promise<object>} Context, state, controls and observed domain actions.
 */
async function explorerContextFixture() {
  const module=await importProjectModule("js/tools/thread-explorer-controller.js"),pure=await importProjectModule("js/tools/thread-explorer.js");
  const models={};for(const name of ["getThreadExplorerOwnActor","isThreadExplorerForeignAccountMode","isThreadExplorerOwnActor","isThreadExplorerForeignActorFocusMode","createThreadExplorerActorStub","normalizeThreadExplorerActorFocusMode"]){models[name+"FromTools"]=pure[name];}
  for(const name of ["normalizeThreadExplorerActor","getThreadExplorerActorFocusId","normalizeThreadExplorerAccountMode"])models[name]=pure[name];
  const state={savedAccounts:[{did:"did:own",handle:"own.test"}],authAccountDid:"did:own",authAccount:"own.test",accountActor:"own.test",accountMode:"replies",accountActorBeforeFocus:"",accountModeBeforeFocus:"posts",actorFocusMode:"posts",actorFocusActor:null,actorFocusItems:[],actorFocusCursor:"",actorFocusHasMore:false,actorFocusLoading:false,loadingFeed:false,loadingThread:false,items:[]};
  const elements={account:{value:"own.test"},mode:{value:"replies"}},calls=[],actions={};
  for(const key of ["render","persist","loadActor","loadFeed","loadSources"])actions[key]=(...args)=>{calls.push([key,...args]);return Promise.resolve();};
  return {module,state,elements,models,actions,calls,context:module.createThreadExplorerAccountContext(state,elements,models,actions)};
}

test("account/focus context restores the original own context after consecutive foreign actors", async()=>{
  const f=await explorerContextFixture(),key=f.context.contextKey();
  f.state.loadingFeed=true;f.state.loadingThread=true;f.state.actorFocusLoading=true;
  f.context.open({did:"did:alice",handle:"alice.test"});
  assert.notEqual(f.context.contextKey(),key);assert.equal(f.state.accountActorBeforeFocus,"own.test");assert.equal(f.state.accountModeBeforeFocus,"replies");
  assert.equal(f.state.loadingFeed,false);assert.equal(f.state.loadingThread,false);assert.equal(f.state.actorFocusLoading,false);
  f.context.open({did:"did:bob",handle:"bob.test"});assert.equal(f.state.accountActorBeforeFocus,"own.test");
  f.context.close();assert.equal(f.state.accountActor,"own.test");assert.equal(f.state.accountMode,"replies");assert.equal(f.state.actorFocusActor,null);
  assert.equal(f.elements.account.value,"own.test");assert.equal(f.elements.mode.value,"replies");assert.ok(f.calls.some(call=>call[0]==="loadFeed"));
  const count=f.calls.length;f.context.open(null);assert.equal(f.calls.length,count);
});

test("account input, mode and own-account actions reset only the selected context and validate adapters",async()=>{
  const f=await explorerContextFixture();assert.throws(()=>f.module.createThreadExplorerAccountContext({}, {}, {}, {}),/render/);
  for(const key of Object.keys(f.models))assert.throws(()=>f.module.createThreadExplorerAccountContext(f.state,f.elements,{...f.models,[key]:null},f.actions),/model/);
  f.elements.account.value=" @alice.test ";f.context.apply({loadFeed:true});assert.equal(f.state.accountActor,"alice.test");assert.equal(f.context.foreignAccount(),true);assert.ok(f.calls.some(call=>call[0]==="loadActor"));
  const key=f.context.contextKey();f.context.mode({currentTarget:{value:"all"}});assert.notEqual(f.context.contextKey(),key);assert.equal(f.state.actorFocusMode,"all");
  f.context.useOwn();assert.equal(f.state.accountActor,"own.test");assert.equal(f.state.actorFocusActor,null);assert.equal(f.context.foreignAccount(),false);
  f.state.authAccountDid="did:other";assert.notEqual(f.context.contextKey(),key);
});

test("late feed, actor and thread responses cannot mutate a newer context or clear its loading flag",async()=>{
  const f=await explorerContextFixture();
  for(const kind of ["feed","foreignFeed","actor","thread"]){
    for(const failure of [false,true]){
      const state={items:["current"],cursor:"",hasMore:true,loading:false,tree:null},calls=[];let settle,revision=0;
      const options={authAccount:"own",actor:{did:"actor"},actorId:"actor",contextKey:()=>revision,state,append:false,
        request:()=>new Promise((resolve,reject)=>{settle=()=>failure?reject(Error("old failure")):resolve({items:["old"],cursor:"old",root:{post:{uri:"old"}}});}),
        render:()=>calls.push("render"),isForeignAccount:()=>kind==="foreignFeed",getRequestedActor:()=>"actor",clearErrors:()=>{},clearSelectionState:()=>{},setError:()=>calls.push("error"),appendItems:()=>[],sortItems:items=>items,restoreSelection:async()=>calls.push("restore"),persistSelection:()=>{},clearMediaCache:()=>{},isClusterMode:()=>false,scheduleFocus:()=>calls.push("focus")};
      let pending;if(kind==="thread")pending=f.module.loadThreadExplorerThreadWorkflow("at://selected",options);else if(kind==="actor")pending=f.module.loadThreadExplorerActorFocusWorkflow(options);else pending=f.module.loadThreadExplorerFeedWorkflow(options);
      revision++;state.items=["new"];state.tree={post:{uri:"new"}};state.loading=true;const before=calls.length;
      settle();await pending;assert.deepEqual(state.items,["new"]);assert.equal(state.tree.post.uri,"new");assert.equal(state.cursor,"");assert.equal(state.loading,true);assert.equal(calls.length,before);
    }
  }
});

test("measured stage boxes, oriented edges and snapshot limits share explicit geometry contracts",async()=>{
  const layout=await importProjectModule("js/tools/thread-explorer-layout.js"),snapshot=await importProjectModule("js/tools/thread-explorer-snapshot.js");
  assert.deepEqual(layout.getThreadExplorerMeasuredStageRect({left:30,top:50,width:20,height:40},{left:10,top:10},2),{left:10,top:20,width:10,height:20,right:20,bottom:40,centerX:15,centerY:30});
  assert.equal(layout.getThreadExplorerMeasuredStageRect(null,{},1),null);
  assert.equal(layout.getThreadExplorerMeasuredStageRect({left:2,top:4,width:0,height:0},{left:0,top:0},-1).centerX,2);
  const parent={centerX:10,bottom:20,right:20,centerY:10},child={centerX:50,top:40,left:40,centerY:50};
  assert.equal(layout.buildThreadExplorerEdgePath(parent,child),"M 10 20 C 10 56, 50 4, 50 40");
  assert.equal(layout.buildThreadExplorerEdgePath(parent,child,"horizontal"),"M 20 10 C 68 10, -8 50, 40 50");
  assert.equal(snapshot.shouldTileSnapshotCanvas(10,10,10,100),false);assert.equal(snapshot.shouldTileSnapshotCanvas(11,1,10,100),true);
  assert.equal(snapshot.shouldTileSnapshotCanvas(1,11,10,100),true);assert.equal(snapshot.shouldTileSnapshotCanvas(10,10,10,99),true);
  assert.equal(snapshot.collectSnapshotStyleRules([{cssRules:[{cssText:"a {}"}]},{get cssRules(){throw Error("cross origin");}},{cssRules:[{cssText:"b {}"}]}]),"a {}\nb {}");
  assert.equal(snapshot.collectSnapshotStyleRules([]),"");
});

test("DM partner controller isolates cached accounts, picker selection and late restores",async()=>{
  const {createDmPartnerCacheController}=await importProjectModule("js/tools/dm-archive.js");
  const state={authAccountDid:"own",selectedParticipantDids:["peer","missing"]},input={value:""},calls=[];let resolve;
  const actions={now:()=>"2026-11-08T12:00:00Z",setInput:(element,value)=>{element.value=value;},render:()=>calls.push("render"),note:value=>calls.push(["note",value]),translate:key=>key,
    request:async(type,payload)=>{calls.push([type,payload]);if(type==="GET_DM_PARTNER_CACHE")return new Promise(done=>{resolve=done;});return {ok:true};}};
  assert.throws(()=>createDmPartnerCacheController({},input,{}),/setInput/);
  const controller=createDmPartnerCacheController(state,input,actions),cache={accountDid:"own",recentContacts:[{did:"peer",handle:"peer.test"}],conversations:[],assets:[],updatedAt:"then"};
  controller.apply(cache);assert.deepEqual(state.selectedParticipantDids,["peer"]);controller.select({did:"PEER"},"@peer.test");assert.deepEqual(state.selectedParticipantDids,["peer"]);assert.equal(input.value,"@peer.test");
  controller.select(null,"missing");assert.deepEqual(state.selectedParticipantDids,[]);assert.deepEqual(calls.at(-1),["note","dmContactNotLoadedMatch"]);
  await controller.save();assert.equal(calls.find(call=>Array.isArray(call)&&call[0]==="SAVE_DM_PARTNER_CACHE")[1].cache.updatedAt,"2026-11-08T12:00:00Z");
  const pending=controller.restore();state.authAccountDid="new";state.recentContacts=[{did:"new-peer"}];resolve(cache);await pending;assert.deepEqual(state.recentContacts,[{did:"new-peer"}]);
  controller.apply(cache);assert.deepEqual(state.recentContacts,[]);assert.equal(state.partnerCacheAccountDid,"");
});

test("cluster expansion, favorite lookup and search result identity remain domain-owned",async()=>{
  const layout=await importProjectModule("js/tools/thread-explorer-layout.js"),controller=await importProjectModule("js/tools/thread-explorer-controller.js"),search=await importProjectModule("js/tools/search-results.js");
  const expanded=new Set();layout.expandReplyClusterTree({post:{uri:"root"},replies:[{post:{uri:"child"}}]},expanded);layout.expandReplyClusterTree(null,expanded);assert.deepEqual([...expanded],["root","child"]);
  const favorites=controller.createThreadExplorerFavoritesController({getFavorites:()=>[{rootUri:"root"}],setFavorites(){},normalize:value=>value,persist:async()=>{}});assert.equal(favorites.has("root"),true);assert.equal(favorites.has("other"),false);assert.equal(favorites.has(null),false);
  const result={post:{uri:"projected"},requestedUri:"requested"};assert.equal(search.findSearchResultByUri([result],"projected"),result);assert.equal(search.findSearchResultByUri([result],"requested"),null);assert.equal(search.findSearchResultByUri([],"missing"),null);assert.equal(search.findSearchResultByUri([],""),null);
});
