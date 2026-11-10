"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates localized model fixtures. @returns {Promise<object>} Module and presentation models. */
async function modelsFixture() {
  const module = await importProjectModule("js/tools/archive-workspace-models.js");
  const dependencies = { t: (key, values = {}) => `${key}:${JSON.stringify(values)}`, locale: () => "en" };
  return { module, dependencies, models: module.createArchiveWorkspaceModels(dependencies) };
}

test("archive workspace status models preserve idle, active, paused, cancelled and transient priorities", async () => {
  const { models, module, dependencies } = await modelsFixture();
  const state = { runState: "idle" };
  assert.match(models.status(state), /^archiveRunStatusIdle:/);
  assert.equal(models.status({ ...state, notice: "notice", runState: "running" }), "notice");
  assert.equal(models.status({ ...state, job: { step: "exporting", percent: 20 } }), "exporting");
  for (const [runState, label] of [["running", "Running"], ["paused", "Paused"], ["cancelled", "Cancelled"]]) {
    assert.match(models.status({ runState, checkpoint: "checkpoint", session: { waveIndex: 3 } }), new RegExp(`^archiveRunStatus${label}:`));
  }
  assert.match(models.status({ runState: "idle", session: { status: "cancelled" } }), /^archiveRunStatusCancelled:/);
  assert.match(models.status({ runState: "idle", session: {} }), /^archiveRunStatusReady:/);
  assert.equal(models.active({ runState: "paused" }), true);
  assert.equal(models.active(state), false);
  assert.equal(models.wave({}), 1);
  assert.throws(() => module.createArchiveWorkspaceModels(), TypeError);
  for (const key of Object.keys(dependencies)) assert.throws(() => module.createArchiveWorkspaceModels({ ...dependencies, [key]: null }), TypeError);
  assert.throws(() => models.status(null), TypeError);
});

test("archive hints, control availability and summary counts retain boundary behavior", async () => {
  const { models } = await modelsFixture();
  assert.match(models.hint({ runState: "paused" }), /^archiveStartHintPaused:/);
  assert.match(models.hint({ session: { nextCursor: "cursor" } }), /^archiveStartHintIncomplete:/);
  assert.match(models.hint({ session: { exportedPosts: 3 } }), /^archiveStartHintRestart:/);
  assert.match(models.hint({}), /^archiveStartHintFresh:/);
  assert.deepEqual(models.controls({ runState: "running", runId: "id", mediaRunning: false }), { pause: true, resume: false, cancel: true });
  assert.deepEqual(models.controls({ runState: "idle", session: { status: "paused" }, mediaRunning: true }), { pause: false, resume: true, cancel: true });
  const state = { pdfOptions: { bandSize: 1 }, session: { exportedPosts: 101, exportedImages: 2 } };
  assert.deepEqual(models.summary(state), { posts: 101, images: 2, bands: 2 });
  assert.deepEqual(models.summary({ pdfOptions: {}, catalog: { posts: [], summary: {} } }), { posts: 0, images: 0, bands: 0 });
  assert.deepEqual(models.summary({ ...state, pdfOptions: { bandSize: 99999 } }), { posts: 101, images: 2, bands: 1 });
});

test("archive notice and heartbeat models handle import modes, missing values and invalid dates", async () => {
  const { models } = await modelsFixture();
  assert.equal(models.notice(null), "");
  for (const [mode, label] of [["reply", "archiveThreadUrlImportedReplyNotice"], ["root", "archiveThreadUrlImportedRootNotice"], ["", "archiveImportedNotice"]]) {
    assert.ok(models.notice({ posts: [], summary: { imageCount: 0 }, manifest: { threadImport: { entryMode: mode } } }).startsWith(label));
  }
  assert.equal(models.time(""), ""); assert.equal(models.time("invalid"), "");
  assert.match(models.time("2026-10-18T12:00:00Z"), /\d{2}:\d{2}:\d{2}/);
});

/** Creates run state and observed IO/presentation adapters. @returns {Promise<object>} Mutable hooks, state, dependencies and controller. */
async function runFixture() {
  const module = await importProjectModule("js/tools/archive-run-controller.js");
  const state = { catalog: null, session: null, runId: null, runState: "idle", preview: null, checkpoint: "", notice: "", lastProgressAt: "", job: null };
  const calls = []; const events = []; const hooks = {};
  const raw = { manifest: {}, posts: [{ uri: "post" }], assets: [], session: { status: "completed" } };
  const dependencies = { state: () => state, setState: patch => Object.assign(state, patch), t: (key, values = {}) => `${key}:${JSON.stringify(values)}`,
    request: async (type, payload, options) => { calls.push({ type, payload: structuredClone(payload), options });
      if (hooks.request) return hooks.request(type, payload, options);
      if (type === "EXPORT_ACCOUNT_ARCHIVE_WAVE" || type === "IMPORT_ARCHIVE_THREAD_FROM_URL") return raw;
      return null;
    },
    filters: () => ({ scope: "range" }), serialize: JSON.stringify, validateSource: async () => events.push("validateSource"),
    progress: value => { state.job = value; events.push(["progress", value]); }, source: () => "", sourceProfile: () => null,
    threadUrl: () => "https://example.test/profile/user/post/root", threadMode: () => "path", waveSize: () => 100,
    normalize: catalog => ({ manifest: catalog.manifest || {}, posts: catalog.posts, assets: catalog.assets || [], summary: { imageCount: catalog.assets?.length || 0 } }),
    notice: () => "catalog notice", runId: () => "run-id", now: () => new Date("2026-10-18T12:00:00Z"),
    warn: (...args) => events.push(["warn", ...args]), error: error => events.push(["error", error]),
  };
  for (const name of ["hint", "status", "actionButtons", "controls", "preview", "summary", "results", "render", "nextWave", "enableNextWave"]) {
    dependencies[name] = (...args) => events.push([name, ...args]);
  }
  return { module, state, calls, events, hooks, raw, dependencies, controller: module.createArchiveRunController(dependencies) };
}

test("archive run factories require explicit adapters", async () => {
  const { module, dependencies } = await runFixture();
  assert.throws(() => module.createArchiveRunController(), TypeError);
  for (const name of Object.keys(dependencies)) assert.throws(() => module.createArchiveRunController({ ...dependencies, [name]: null }), TypeError, name);
});

test("archive run reuses loaded catalogs and otherwise persists the normalized wave", async () => {
  const { controller, state, calls } = await runFixture();
  const loaded = { posts: [] }; state.catalog = loaded;
  assert.equal(await controller.ensure(), loaded); assert.equal(calls.length, 0);
  const result = await controller.ensure(true);
  assert.equal(result.posts.length, 1);
  assert.deepEqual(calls.map(call => call.type), ["EXPORT_ACCOUNT_ARCHIVE_WAVE", "SAVE_ARCHIVE_SESSION", "SAVE_ARCHIVE_CATALOG"]);
  assert.equal(calls[0].payload.runId, "run-id"); assert.equal(calls[0].options.timeoutMs, 600000);
  assert.equal(calls[0].payload.existingCatalog, null);
  assert.equal(state.runId, null); assert.equal(state.runState, "idle");
  assert.equal(state.session.updatedAt, "2026-10-18T12:00:00.000Z");
  assert.equal(state.job.percent, 100);
});

test("archive run resumes only matching paused sessions and validates unresolved source inputs", async () => {
  for (const match of [true, false]) {
    const fixture = await runFixture();
    fixture.state.catalog = { posts: [{ uri: "existing" }] };
    let filterKey = "different";
    if (match) { filterKey = JSON.stringify({ scope: "range" }); }
    fixture.state.session = { status: "paused", filterKey, nextCursor: "cursor" };
    fixture.dependencies.source = () => "source.test";
    const controller = fixture.module.createArchiveRunController(fixture.dependencies);
    await controller.ensure(true);
    assert.equal(fixture.events[0], "validateSource");
    const request = fixture.calls[0].payload;
    if (match) { assert.equal(request.cursor, "cursor"); assert.equal(request.existingCatalog.posts[0].uri, "existing"); }
    else { assert.equal(request.cursor, ""); assert.equal(request.existingSession, null); }
  }
});

test("archive wave progress retains preview/checkpoint priority and handles paused/completed/cancelled replies", async () => {
  for (const finalStatus of ["paused", "completed", "cancelled"]) {
    const fixture = await runFixture();
    fixture.hooks.request = async (type, payload, options) => {
      if (type === "EXPORT_ACCOUNT_ARCHIVE_WAVE") {
        options.onProgress({ percent: 10, detail: "detail", preview: { meta: "preview", metric: "metric" }, checkpoint: "checkpoint", state: "paused" });
        assert.equal(fixture.state.checkpoint, "checkpoint"); assert.equal(fixture.state.runState, "paused");
        options.onProgress({ detail: "new detail", state: "running" });
        assert.equal(fixture.state.job.percent, 10); assert.equal(fixture.state.checkpoint, "new detail");
        return { ...fixture.raw, session: { status: finalStatus, errorMessage: "paused reason", nextCursor: "cursor" } };
      }
    };
    await fixture.controller.ensure(true);
    assert.equal(fixture.state.session.status, finalStatus);
    assert.equal(fixture.state.runId, null);
    if (finalStatus === "completed") { assert.equal(fixture.state.runState, "idle"); }
    else { assert.equal(fixture.state.runState, finalStatus); }
    assert.ok(fixture.events.some(event => Array.isArray(event) && event[0] === "progress" && event[1].detail === "detail • metric • preview"));
  }
});

test("archive run worker failures reset active controls without writing a completed checkpoint", async () => {
  const fixture = await runFixture();
  fixture.hooks.request = async () => { throw new Error("worker failed"); };
  await assert.rejects(() => fixture.controller.ensure(true), /worker failed/);
  assert.equal(fixture.state.runId, null); assert.equal(fixture.state.runState, "idle");
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.state.job.percent, 3);
});

test("archive request timeout preserves a resumable checkpoint and labels the paused run", async () => {
  const fixture = await runFixture();
  fixture.state.catalog = { posts: [{ uri: "saved" }], summary: { imageCount: 3 } };
  fixture.state.session = { filterKey: JSON.stringify({ scope: "range" }), nextCursor: "saved-cursor", exportedPosts: 1,
    exportedImages: 3, status: "paused" };
  fixture.hooks.request = async (type, payload, options) => {
    if (type === "EXPORT_ACCOUNT_ARCHIVE_WAVE") { options.onProgress({ checkpoint: "Page 40 gespeichert" }); throw Error("Request timed out"); }
    return null;
  };
  await assert.rejects(() => fixture.controller.ensure(true), /timed out/);
  assert.equal(fixture.state.runState, "paused");
  assert.equal(fixture.state.session.nextCursor, "saved-cursor");
  assert.equal(fixture.state.session.exportedPosts, 1);
  assert.equal(fixture.state.checkpoint, "Page 40 gespeichert");
  assert.ok(fixture.calls.some(call => call.type === "SAVE_ARCHIVE_SESSION" && call.payload.session.status === "paused"));
  assert.ok(fixture.calls.some(call => call.type === "SAVE_ARCHIVE_CATALOG"));
  assert.equal(fixture.state.job.detail, "archiveTimeoutResumeHint:{}");
});

test("archive control sends pause/resume/cancel and restarts saved paused sessions without a run ID", async () => {
  const fixture = await runFixture();
  await fixture.controller.control("pause"); assert.equal(fixture.calls.length, 0);
  fixture.state.runId = "id"; fixture.state.runState = "running";
  for (const [action, expected] of [["pause", "paused"], ["resume", "running"], ["cancel", "cancelled"]]) {
    await fixture.controller.control(action);
    assert.equal(fixture.calls.at(-1).payload.action, action); assert.equal(fixture.state.runState, expected);
  }
  assert.ok(fixture.events.some(event => event[0] === "enableNextWave"));
  fixture.state.runId = null; fixture.state.runState = "paused";
  await fixture.controller.control("resume");
  assert.ok(fixture.events.some(event => event[0] === "nextWave"));
});

test("archive catalog application and storage preserve overrides and optional catalog failures", async () => {
  const fixture = await runFixture();
  fixture.hooks.request = async type => { if (type === "SAVE_ARCHIVE_CATALOG") throw new Error("quota"); };
  const catalog = { posts: [{ uri: "a" }], summary: { imageCount: 2 } };
  await fixture.controller.apply(catalog, { filterKey: "thread-url:root", status: "completed", waveIndex: 2, step: "imported" });
  assert.equal(fixture.state.session.filterKey, "thread-url:root");
  assert.equal(fixture.state.session.waveIndex, 2);
  assert.equal(fixture.state.job.step, "imported");
  assert.equal(fixture.state.notice, "catalog notice");
  assert.ok(fixture.events.some(event => event[0] === "warn"));
  fixture.hooks.request = async () => { throw new Error("session failed"); };
  await assert.rejects(() => fixture.controller.saveSession({}), /session failed/);
});

test("archive clear and invalidation reset state and report optional/background storage errors", async () => {
  const fixture = await runFixture();
  Object.assign(fixture.state, { catalog: {}, session: {}, preview: {}, notice: "notice", runState: "paused", runId: "id", checkpoint: "checkpoint" });
  fixture.hooks.request = async type => { if (type === "CLEAR_ARCHIVE_CATALOG") throw new Error("clear failed"); };
  await fixture.controller.clear();
  assert.equal(fixture.state.catalog, null); assert.equal(fixture.state.runState, "idle");
  assert.equal(fixture.state.notice, ""); assert.equal(fixture.state.checkpoint, "");
  assert.ok(fixture.events.some(event => event[0] === "warn"));
  fixture.hooks.request = async () => { throw new Error("background failed"); };
  fixture.controller.invalidate(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.events.filter(event => event[0] === "error").length, 2);
  assert.ok(fixture.events.some(event => event[0] === "render"));
});

test("thread imports preserve mode normalization, progress and persisted import metadata", async () => {
  for (const mode of ["tree", "author", "unknown"]) {
    const fixture = await runFixture(); fixture.dependencies.threadMode = () => mode;
    fixture.hooks.request = async (type, payload, options) => {
      if (type === "IMPORT_ARCHIVE_THREAD_FROM_URL") {
        options.onProgress({ preview: { meta: "thread checkpoint" } });
        return { ...fixture.raw, manifest: { threadImport: { entryUri: "root" } } };
      }
    };
    await fixture.module.createArchiveRunController(fixture.dependencies).importThread();
    let expected = mode; if (mode === "unknown") { expected = "path"; }
    assert.equal(fixture.calls[0].payload.importMode, expected);
    assert.equal(fixture.state.session.filterKey, "thread-url:root");
    assert.equal(fixture.state.runState, "idle");
    assert.equal(fixture.state.checkpoint, "");
  }
  const fixture = await runFixture(); fixture.dependencies.threadUrl = () => "";
  await assert.rejects(() => fixture.module.createArchiveRunController(fixture.dependencies).importThread(), /archiveThreadUrlInvalid/);
  assert.equal(fixture.calls.length, 0);
});

test("archive presentation requires templates and modules stay wired and cached", async () => {
  const { createArchiveWorkspaceRenderer } = await importProjectModule("js/tools/archive-workspace-rendering.js");
  assert.throws(() => createArchiveWorkspaceRenderer(), TypeError);
  const functions = ["state", "t", "avatar", "tooLarge", "bindResult", "zip", "html", "pdf", "scope", "progress"];
  const dependencies = Object.fromEntries(functions.map(name => [name, () => {}]));
  assert.throws(() => createArchiveWorkspaceRenderer({}, dependencies), /models.active/);
  dependencies.models = Object.fromEntries(["active", "time", "status", "hint", "controls", "summary"].map(name => [name, () => {}]));
  assert.throws(() => createArchiveWorkspaceRenderer({}, dependencies), /sourceTemplate/);
  const app = fs.readFileSync("app.js", "utf8"); const worker = fs.readFileSync("sw.js", "utf8");
  for (const area of ["workspace-models", "workspace-rendering", "run-controller"]) {
    assert.ok(app.includes(`./js/tools/archive-${area}.js`)); assert.ok(worker.includes(`./js/tools/archive-${area}.js`));
  }
  for (const page of ["index.html", "tools.html"]) {
    const html = fs.readFileSync(page, "utf8");
    for (const name of ["source", "note", "preview", "spec", "spec-item", "result"]) assert.equal(html.split(`id="archive-workspace-${name}-template"`).length - 1, 1);
  }
  assert.doesNotMatch(app, /function estimateArchiveBandCount\(/);
});
