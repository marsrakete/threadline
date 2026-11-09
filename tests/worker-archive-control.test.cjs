"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { archiveControlFixture, archiveFailure, plain } = require("./worker-archive-control-fixtures.cjs");

test("archive run control requires scheduler/error/messages and exposes a frozen API", () => {
  const f = archiveControlFixture();
  assert.throws(() => f.factory(), /delay/);
  for (const name of ["delay", "error", "messages"]) { assert.throws(() => f.factory({ ...f.options, [name]: null }), TypeError); }
  for (const name of ["pausedTitle", "pausedStep", "cancelled", "exhausted", "readTitle", "waitStep", "waitCheckpoint", "rateLimit", "serverError", "networkError", "retryDetail", "feedDetail"]) {
    assert.throws(() => f.factory({ ...f.options, messages: { ...f.options.messages, [name]: null } }), TypeError);
  }
  assert.equal(Object.isFrozen(f.api), true); assert.equal(Object.isFrozen(f.options.messages), true);
  assert.deepEqual(Object.keys(f.api), ["start", "finish", "control", "wait", "sleep", "retry", "softPauseMs", "pauseFeed"]);
});

test("archive state preserves command transitions, unknown actions and isolated run/factory identities", async () => {
  const f = archiveControlFixture(), other = archiveControlFixture();
  assert.deepEqual(plain(f.api.control()), { ok: false });
  assert.deepEqual(plain(f.api.control({ runId: "one", action: "unknown" })), { ok: true, state: "running" });
  for (const [action, state] of [["pause", "paused"], ["resume", "running"], ["cancel", "cancelled"], ["unknown", "cancelled"], ["resume", "running"]]) {
    assert.equal(f.api.control({ runId: "one", action }).state, state);
  }
  f.api.control({ runId: "one", action: "cancel" });
  assert.equal(await f.api.wait("two"), "running"); assert.equal(await other.api.wait("one"), "running");
  assert.equal(f.api.finish("one"), true); assert.equal(f.api.finish("one"), false);
  assert.equal(await f.api.wait("one"), "running");
  f.api.control({ runId: "one", action: "cancel" }); f.api.start("one");
  assert.equal(await f.api.wait("one"), "running");
});

test("archive wait preserves missing-ID notifications and observes paused resume/cancel", async () => {
  const f = archiveControlFixture();
  assert.equal(await f.api.wait("", f.notify), "running"); assert.deepEqual(f.progress, []);
  assert.equal(await f.api.wait("one", f.notify), "running"); assert.deepEqual(plain(f.progress), [{ state: "running" }]);
  for (const action of ["resume", "cancel"]) {
    f.progress.length = 0; f.waits.length = 0; f.api.control({ runId: "one", action: "pause" });
    f.setDelay(async ms => { assert.equal(ms, 350); f.api.control({ runId: "one", action }); });
    const result = await f.api.wait("one", f.notify);
    assert.equal(f.progress[0].title, "Archiv pausiert"); assert.equal(f.progress[0].state, "paused");
    assert.deepEqual(f.waits, [350]);
    if (action === "resume") { assert.equal(result, "running"); } else { assert.equal(result, "cancelled"); }
  }
});

test("archive sleep chunks time, preserves progress fields and ignores absent/nonpositive durations", async () => {
  const f = archiveControlFixture();
  assert.equal(await f.api.sleep("one", 2501, f.notify, { title: "Literal {pages}", state: "old", checkpoint: "checkpoint" }), "running");
  assert.deepEqual(f.waits, [1000, 1000, 501]);
  const details = f.progress.filter(p => p.title);
  assert.equal(details.length, 3); assert.equal(details[0].title, "Literal {pages}"); assert.equal(details[0].checkpoint, "checkpoint"); assert.equal(details[0].state, "running");
  f.waits.length = 0; f.progress.length = 0; f.api.control({ runId: "one", action: "cancel" });
  for (const duration of [undefined, null, "bad", 0, -100]) { assert.equal(await f.api.sleep("one", duration, f.notify), "running"); }
  assert.deepEqual(f.waits, []); assert.deepEqual(f.progress, []);
});

test("archive sleep keeps pause time separate and preserves cancellation at chunk boundaries", async () => {
  const f = archiveControlFixture(); f.api.control({ runId: "one", action: "pause" });
  f.setDelay(async ms => { if (ms === 350) { f.api.control({ runId: "one", action: "resume" }); } });
  assert.equal(await f.api.sleep("one", 1001, f.notify), "running"); assert.deepEqual(f.waits, [350, 1000, 1]);
  f.waits.length = 0;
  f.setDelay(async () => { f.api.control({ runId: "one", action: "cancel" }); });
  assert.equal(await f.api.sleep("one", 1001), "cancelled"); assert.deepEqual(f.waits, [1000]);
  f.api.start("one"); f.waits.length = 0;
  assert.equal(await f.api.sleep("one", 1000), "running");
  assert.equal(await f.api.wait("one"), "cancelled");
});

test("archive retry returns task values and gates requests while paused or already cancelled", async () => {
  const f = archiveControlFixture(); const value = { item: "result" }; let calls = 0;
  f.api.control({ runId: "one", action: "pause" });
  f.setDelay(async () => { assert.equal(calls, 0); f.api.control({ runId: "one", action: "resume" }); });
  assert.equal(await f.api.retry(async () => { calls++; return value; }, { runId: "one", notifyProgress: f.notify }), value);
  assert.equal(calls, 1); assert.deepEqual(f.waits, [350]);
  f.api.control({ runId: "one", action: "cancel" });
  // A request without a run ID remains independent of an unrelated cancelled run.
  assert.equal(await f.api.retry(async () => { calls++; return "independent"; }), "independent");
  await assert.rejects(f.api.retry(async () => { calls++; }, { runId: "one" }), error => error.details.code === "ARCHIVE_CANCELLED");
  assert.equal(calls, 2);
});

test("archive retry classifies retryable statuses/messages and retains terminal error identity", async () => {
  for (const [status, message, retryable] of [[429, "blocked", true], [502, "bad", true], [503, "bad", true], [504, "bad", true],
    [500, "bad", false], [401, "unauthorized", false], [0, "fetch failed", true], [0, "NETWORK failed", true], [0, "timeout", true], [0, "temporary issue", true], [0, "invalid", false]]) {
    const f = archiveControlFixture(); const error = archiveFailure(status, message); let calls = 0;
    const task = async () => { if (calls++ === 0) { throw error; } return "ok"; };
    if (retryable) { assert.equal(await f.api.retry(task), "ok"); assert.equal(calls, 2); assert.deepEqual(f.waits, [1]); }
    else { await assert.rejects(f.api.retry(task), value => value === error); assert.equal(calls, 1); assert.deepEqual(f.waits, []); }
  }
});

test("archive retry preserves default attempts, capped backoff and the final transport error", async () => {
  const f = archiveControlFixture(), error = archiveFailure(503, "bad", 0); let calls = 0;
  const waitTotals = [];
  await assert.rejects(f.api.retry(async () => { if (calls > 0) { waitTotals.push(f.waits.splice(0).reduce((sum, ms) => sum + ms, 0)); } calls++; throw error; }), value => value === error);
  assert.equal(calls, 5); assert.deepEqual(waitTotals, [30000, 45000, 60000, 60000]);
  assert.equal(f.waits.length, 0);
  const exhausted = archiveControlFixture();
  await assert.rejects(exhausted.api.retry(async () => { throw Error("not called"); }, { maxRetries: -1 }), value => value.details.code === "ARCHIVE_RETRY_EXHAUSTED");
  assert.deepEqual(exhausted.waits, []);
});

test("archive retry honors retry-after, labels and explicit progress/checkpoints", async () => {
  for (const [status, message, reason] of [[429, "blocked", "Rate-Limit"], [503, "bad", "Serverfehler 503"], [500, "network failed", "Serverfehler 500"], [0, "fetch failed", "Netzwerkproblem"]]) {
    const f = archiveControlFixture(); let calls = 0;
    await f.api.retry(async () => { if (calls++ === 0) { throw archiveFailure(status, message, 1501); } return null; },
      { runId: "one", notifyProgress: f.notify, title: "Custom", percent: 42, baseDetail: "Base {seconds}", checkpoint: "Custom checkpoint" });
    assert.deepEqual(f.waits, [1000, 501]);
    const detail = f.progress.find(p => p.title === "Custom");
    assert.deepEqual(plain(detail), { title: "Custom", step: "Kurze Pause, damit uns die Server nicht blockieren ...", percent: 42,
      detail: "Base {seconds} · " + reason + " · neuer Versuch in 2s", checkpoint: "Custom checkpoint", state: "running" });
  }
});

test("archive retry cancellation during backoff prevents the next task", async () => {
  const f = archiveControlFixture(); let calls = 0;
  f.setDelay(async () => { f.api.control({ runId: "one", action: "cancel" }); });
  await assert.rejects(f.api.retry(async () => { calls++; throw archiveFailure(429, "blocked", 2000); }, { runId: "one", notifyProgress: f.notify }),
    error => error.details.code === "ARCHIVE_CANCELLED");
  assert.equal(calls, 1); assert.deepEqual(f.waits, [1000]);
});

test("archive feed pause thresholds retain boundary precedence, coercion and expert-mode skipping", () => {
  const { api } = archiveControlFixture();
  for (const pages of [undefined, null, "bad", -25, 0, 1, 24, 26, 99, 101]) { assert.equal(api.softPauseMs(pages), 0); }
  for (const pages of [25, 50, 75, 125, "25"]) { assert.equal(api.softPauseMs(pages), 3000); }
  for (const pages of [100, 200, "100"]) { assert.equal(api.softPauseMs(pages), 10000); assert.equal(api.softPauseMs(pages, true), 0); }
});

test("archive voluntary pause preserves progress, cancellation and no-op branches", async () => {
  const f = archiveControlFixture();
  assert.equal(await f.api.pauseFeed({ runId: "one", pageCount: 25, recordsCount: 123, notifyProgress: f.notify }), "running");
  assert.deepEqual(f.waits, [1000, 1000, 1000]);
  assert.equal(f.progress.find(p => p.detail).detail, "25 Feed-Seiten gelesen · 123 Posts vorgemerkt · freiwillige Pause 3s");
  assert.equal(f.progress.find(p => p.detail).percent, 45);
  f.waits.length = 0; f.progress.length = 0;
  await f.api.pauseFeed({ pageCount: 25, archiveExpertMode: true, notifyProgress: f.notify });
  await f.api.pauseFeed({ pageCount: 24, notifyProgress: f.notify });
  assert.deepEqual(f.waits, []); assert.deepEqual(f.progress, []);
  f.api.control({ runId: "one", action: "cancel" });
  assert.equal(await f.api.pauseFeed({ runId: "one", pageCount: 100 }), "cancelled");
});
