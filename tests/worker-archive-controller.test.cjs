"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture } = require("./worker-archive-models-fixtures.cjs");

/** Captures the production wiring and replaces only external archive boundaries.
 * @returns {object} Factory, explicit adapters, observed calls and controller.
 */
function fixture() {
  const f = archiveModelsFixture(), factory = f.context.createThreadlineArchiveWaveController;
  let options;
  f.context.createThreadlineArchiveWaveController = value => { options = value; return factory(value); };
  vm.runInContext("getWorkerArchiveWaveController()", f.context);
  const calls = [], realWave = options.archiveWaveService;
  options = { ...options, ensureSession: async () => ({ session: { did: "did:own" } }), readStoredValue: async () => ({}),
    resolveArchiveSourceActor: async () => ({ did: "did:own", handle: "own.test", isOwnAccount: true }),
    now: () => "2026-11-08T00:00:00Z", waitForArchiveRunControl: async () => "running",
    maybePauseArchiveFeedScan: async () => "running", attachArchiveAvatarAssets: async () => {},
    archiveRunControl: { start: id => calls.push(["start", id]), finish: id => calls.push(["finish", id]) },
    archiveWaveService: { ...realWave, readPage: async (input, state) => { calls.push(["page"]); state.cursor = "more"; return { pageRecords: [], oldestSeenCreatedAt: "2020-01-01T00:00:00Z" }; }, enrichMetrics: async () => "completed" },
    archiveAssetService: { attachLinkCards: async () => {}, attachImages: async () => false },
  };
  return { factory, options, calls, controller: factory(options) };
}

test("archive controller validates explicit function dependencies and freezes its API", () => {
  const f = fixture(); assert.throws(() => f.factory(), /ensureSession/);
  for (const [key, value] of Object.entries(f.options)) {
    if (typeof value === "function") assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError);
  }
  assert.equal(Object.isFrozen(f.controller), true);
  assert.deepEqual(Object.keys(f.controller), ["load"]);
});

test("real worker date stop adapter ends a paginated wave without a missing global helper", async () => {
  const f = fixture();
  const result = await f.controller.load({ runId: "dated", filters: { scope: "year", year: 2026, contentMode: "posts" } });
  assert.equal(f.calls.filter(call => call[0] === "page").length, 1);
  assert.equal(result.session.status, "completed");
  assert.equal(result.manifest.exportedAt, "2026-11-08T00:00:00Z");
  assert.deepEqual(f.calls.at(-1), ["finish", "dated"]);
});

test("cancelled and failed waves finish run control with structured partial results", async () => {
  for (const failed of [false, true]) {
    const f = fixture();
    if (failed) f.options.archiveWaveService.readPage = async () => { throw Error("page unavailable"); };
    else f.options.waitForArchiveRunControl = async () => "cancelled";
    const result = await f.controller.load({ runId: "partial", filters: { contentMode: "posts" } });
    assert.equal(result.session.status, failed ? "paused" : "cancelled");
    assert.deepEqual(f.calls.at(-1), ["finish", "partial"]);
  }
});
