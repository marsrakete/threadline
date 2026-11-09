"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates progress nodes and deterministic export adapters. @returns {Promise<object>} Factory, controller and calls. */
async function fixture() {
  const { createThreadExplorerSnapshotExportController } = await importProjectModule("js/tools/thread-explorer-snapshot.js");
  const calls = [];
  const elements = { exportButton: {}, cancelButton: {}, title: {}, step: {}, detail: {}, fill: { style: {} }, status: {},
    bar: { setAttribute(name, value) { calls.push([name, value]); } },
    dialog: { open: false, showModal() { this.open = true; calls.push("open"); }, close() { this.open = false; calls.push("close"); } } };
  const options = { t: (key) => key, fileName: () => "snapshot.png", downloadBlob: (blob, name) => calls.push(["download", blob, name]),
    render: async (mime, progress, signal) => { calls.push(["render", mime, signal]); await progress({ percent: 150, step: "<b>literal</b>" }); return new Blob(["png"]); },
    frame: async () => calls.push("frame"), wait: async (delay) => calls.push(["wait", delay]), abortController: () => new AbortController(),
    refresh: () => { elements.exportButton.disabled = false; calls.push("refresh"); }, report: (error) => calls.push(["error", error]) };
  return { createThreadExplorerSnapshotExportController, elements, options, calls, controller: createThreadExplorerSnapshotExportController(elements, options) };
}

test("snapshot export owns progress, PNG delivery and final control cleanup", async () => {
  const { controller, elements, calls } = await fixture();
  await controller.download();
  assert.equal(elements.dialog.open, false);
  assert.equal(elements.exportButton.disabled, false);
  assert.equal(elements.cancelButton.disabled, true);
  assert.equal(elements.exportButton.textContent, "threadExplorerSnapshotPngButton");
  assert.equal(elements.fill.style.width, "100%");
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === "aria-valuenow" && call[1] === "100"));
  const download = calls.find(call => call[0] === "download");
  assert.equal(download[2], "snapshot.png");
  assert.equal(await download[1].text(), "png");
  assert.ok(calls.some(call => call[0] === "wait" && call[1] === 260));
  assert.equal(calls.at(-1), "refresh");
});

test("snapshot export guards duplicate starts and cancels during awaited rendering", async () => {
  const { createThreadExplorerSnapshotExportController, elements, options, calls } = await fixture();
  let finish;
  const rendering = new Promise(resolve => { finish = resolve; });
  let renderCalls = 0;
  const controller = createThreadExplorerSnapshotExportController(elements, { ...options, render: async () => { renderCalls += 1; return rendering; } });
  const pending = controller.download();
  await Promise.resolve(); await Promise.resolve();
  await controller.download();
  controller.cancel();
  finish(new Blob(["cancelled"]));
  await pending;
  assert.equal(renderCalls, 1);
  assert.equal(elements.status.textContent, "threadExplorerSnapshotCancelled");
  assert.equal(elements.dialog.open, false);
  assert.equal(calls.filter(call => call[0] === "download").length, 0);
  assert.equal(calls.filter(call => call[0] === "error").length, 0);
  controller.cancel();
});

test("snapshot export checks cancellation after a paint opportunity before rendering", async () => {
  const { createThreadExplorerSnapshotExportController, elements, options, calls } = await fixture();
  let release;
  const controller = createThreadExplorerSnapshotExportController(elements, { ...options, frame: () => new Promise(resolve => { release = resolve; }) });
  const pending = controller.download(); controller.cancel(); release(); await pending;
  assert.equal(calls.filter(call => call[0] === "render").length, 0);
  assert.equal(elements.cancelButton.disabled, true);
});

test("snapshot export reports renderer/delivery failures and permits a later retry", async () => {
  const { createThreadExplorerSnapshotExportController, elements, options, calls } = await fixture();
  let attempts = 0;
  const controller = createThreadExplorerSnapshotExportController(elements, { ...options, render: async () => {
    attempts += 1; if (attempts === 1) { throw Error("render failed"); } return new Blob(["png"]);
  } });
  await controller.download(); assert.equal(elements.status.textContent, "render failed");
  await controller.download(); assert.equal(calls.filter(call => call[0] === "download").length, 1);
  const broken = createThreadExplorerSnapshotExportController(elements, { ...options, downloadBlob: () => { throw Error("delivery failed"); } });
  await broken.download(); assert.equal(elements.status.textContent, "delivery failed");
  assert.equal(elements.dialog.open, false); assert.equal(calls.at(-1), "refresh");
});

test("snapshot controller supports absent optional progress nodes and validates required adapters", async () => {
  const { createThreadExplorerSnapshotExportController, options } = await fixture();
  assert.throws(() => createThreadExplorerSnapshotExportController({}, null), TypeError);
  assert.throws(() => createThreadExplorerSnapshotExportController({}, options), TypeError);
  const controller = createThreadExplorerSnapshotExportController({ exportButton: {} }, { ...options, refresh() {}, render: async () => new Blob(["png"]) });
  await controller.download(); controller.cancel();
});
