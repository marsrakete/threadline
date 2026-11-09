"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates a controllable pending response. @returns {object} Promise and settlement callbacks. */
function deferred() {
  let resolve; let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** Creates source state, manual timers and observed adapters. @returns {Promise<object>} Source controller and mutable test state. */
async function fixture() {
  const module = await importProjectModule("js/tools/archive-source.js");
  const state = { value: "@source.test", profile: null };
  const calls = []; const statuses = []; const saved = []; const timers = new Map();
  let handle = 0;
  const dependencies = { value: () => state.value, write: value => { state.value = value; },
    profile: value => { state.profile = value; }, status: value => statuses.push(value), render: () => calls.push("render"),
    persist: async () => saved.push(structuredClone(state.profile)), invalidate: () => calls.push("invalidate"),
    request: async (...args) => { calls.push(args); return { did: " did:source ", handle: "source.test", displayName: "Source", avatar: "image" }; },
    t: (key, values) => key + JSON.stringify(values || {}),
    schedule: (callback, delay) => { const id = handle++; timers.set(id, { callback, delay }); return id; }, clear: id => timers.delete(id),
  };
  return { module, state, calls, statuses, saved, timers, dependencies, controller: module.createArchiveSourceController(dependencies) };
}

test("archive source validates normalized actor and persists the normalized profile", async () => {
  const f = await fixture(); f.state.value = " @@source.test ";
  const profile = await f.controller.validate();
  assert.deepEqual(profile, { did: "did:source", handle: "source.test", displayName: "Source", avatar: "image" });
  const request = f.calls.find(Array.isArray);
  assert.deepEqual(request, ["CHECK_ANALYSIS_ACCOUNT", { actor: "source.test" }, { timeoutMs: 30000 }]);
  assert.match(f.statuses[0], /^archiveSourceChecking/);
  assert.match(f.statuses.at(-1), /^archiveSourceValidated/);
  assert.deepEqual(f.saved, [profile]);
});

test("archive source handles empty and unresolved input without manufacturing a profile", async () => {
  const f = await fixture(); f.state.value = " @@@ ";
  assert.equal(await f.controller.validate(), null);
  assert.deepEqual(f.statuses, [""]); assert.deepEqual(f.saved, [null]);
  assert.equal(f.calls.filter(Array.isArray).length, 0);
  f.state.value = "unknown.test"; f.dependencies.request = async () => ({});
  assert.equal(await f.module.createArchiveSourceController(f.dependencies).validate({ silentSuccess: true }), null);
  assert.equal(f.saved.at(-1), null);
  assert.equal(f.statuses.some(status => status.startsWith("archiveSourceValidated")), false);
});

test("archive source ignores out-of-order successful and failed responses", async () => {
  for (const failed of [false, true]) {
    const f = await fixture(); const first = deferred();
    f.dependencies.request = async (type, data) => { if (data.actor === "source.test") return first.promise; return { did: "new", handle: "new.test" }; };
    const controller = f.module.createArchiveSourceController(f.dependencies);
    const pending = controller.validate();
    f.state.value = "new.test"; const result = await controller.validate();
    if (failed) { first.reject(new Error("obsolete failure")); } else { first.resolve({ did: "old" }); }
    assert.equal(await pending, null);
    assert.equal(f.state.profile.did, "new"); assert.equal(f.saved.length, 1); assert.equal(result.did, "new");
  }
});

test("typing invalidates an older response immediately before the delayed check starts", async () => {
  const f = await fixture(); const response = deferred(); f.dependencies.request = () => response.promise;
  const controller = f.module.createArchiveSourceController(f.dependencies);
  const pending = controller.validate();
  f.state.value = "new.test"; controller.input();
  response.resolve({ did: "old" });
  assert.equal(await pending, null); assert.equal(f.state.profile, null);
  assert.equal(f.timers.size, 1); assert.equal([...f.timers.values()][0].delay, 1800);
  assert.equal(f.saved.length, 1); assert.ok(f.calls.includes("invalidate"));
});

test("source debounce coalesces timers including handle zero and quiet validation", async () => {
  const f = await fixture(); f.controller.schedule(); f.controller.schedule();
  assert.equal(f.timers.size, 1);
  const task = [...f.timers.values()][0]; f.timers.clear(); task.callback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.calls.filter(Array.isArray).length, 1);
  assert.equal(f.statuses.some(value => value.startsWith("archiveSourceValidated")), false);
});

test("immediate source validation replaces pending debounce work", async () => {
  const f = await fixture(); f.controller.input();
  await f.controller.validate();
  assert.equal(f.timers.size, 0); assert.equal(f.calls.filter(Array.isArray).length, 1);
});

test("picker selection retains shared input events and cancels their redundant delayed request", async () => {
  const f = await fixture(); let controller;
  f.dependencies.write = value => { f.state.value = value; controller.input(); };
  controller = f.module.createArchiveSourceController(f.dependencies);
  controller.select({ handle: "picked.test" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.state.value, "picked.test"); assert.equal(f.timers.size, 0);
  assert.equal(f.calls.filter(Array.isArray).length, 1);
  assert.equal(f.calls.find(Array.isArray)[1].actor, "picked.test");
});

test("source errors clear profile and persist a visible failure", async () => {
  const f = await fixture(); const error = new Error("lookup failed");
  f.dependencies.request = async () => { throw error; };
  await assert.rejects(() => f.module.createArchiveSourceController(f.dependencies).validate(), value => value === error);
  assert.equal(f.statuses.at(-1), "lookup failed"); assert.deepEqual(f.saved, [null]);
});

test("source cancellation and unannounced field changes make pending replies stale", async () => {
  for (const cancel of [true, false]) {
    const f = await fixture(); const response = deferred(); f.dependencies.request = () => response.promise;
    const controller = f.module.createArchiveSourceController(f.dependencies); const pending = controller.validate();
    if (cancel) { controller.schedule(); controller.cancel(); } else { f.state.value = "new.test"; }
    response.resolve({ did: "old" });
    assert.equal(await pending, null); assert.equal(f.state.profile, null); assert.equal(f.saved.length, 0);
    assert.equal(f.timers.size, 0);
  }
});

test("source controller rejects missing IO, timer and form adapters", async () => {
  const f = await fixture(); assert.throws(() => f.module.createArchiveSourceController(), TypeError);
  for (const key of Object.keys(f.dependencies)) assert.throws(() => f.module.createArchiveSourceController({ ...f.dependencies, [key]: null }), TypeError, key);
});

test("archive source and layout callers use cached modules and reusable page templates", () => {
  const app = fs.readFileSync("app.js", "utf8");
  const worker = fs.readFileSync("sw.js", "utf8");
  assert.ok(app.includes('./js/tools/archive-source.js'));
  assert.ok(worker.includes('./js/tools/archive-source.js'));
  assert.doesNotMatch(app, /archiveSourceValidationToken|archiveSourceValidationTimer|function createArchiveCardHeading/);
  assert.ok(app.includes("archiveSourceController.input()"));
  assert.ok(app.includes("archiveWorkspaceLayout.ensure()"));
  for (const file of ["index.html", "tools.html"]) {
    const html = fs.readFileSync(file, "utf8");
    for (const name of ["export", "tools", "content", "actions"]) assert.equal(html.split(`id="archive-layout-${name}-template"`).length - 1, 1);
  }
});
