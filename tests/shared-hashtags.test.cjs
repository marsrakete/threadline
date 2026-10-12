"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates observable hashtag controls/state. @param {object} overrides - Optional adapters. @returns {Promise<object>} Fixture. */
async function fixture(overrides = {}) {
  const module = await importProjectModule("js/shared/shared-hashtags.js");
  const calls = []; let context = "composer";
  const node = () => ({ value: "", textContent: "", hidden: false, disabled: false, attributes: {},
    classList: { toggle() {} }, setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, handler) { this[type] = handler; }, focus: () => calls.push("focus"), select: () => calls.push("select") });
  const elements = { input: node(), placementSelect: node(), selectionNote: node(), searchMatch: node(), searchSummary: node(),
    searchButton: node(), editInput: node(), editDialog: { showModal: () => calls.push("edit-open"), close: () => calls.push("edit-close") },
    searchDialog: { open: false, showModal() { this.open = true; }, close() { this.open = false; } },
    archiveMode: { value: "posts" }, cloud: { children: [], replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } } };
  elements.template = { content: { cloneNode() {
    const nodes = { ".hashtag-chip": node(), ".hashtag-tool:not(.danger)": node(), ".hashtag-tool.danger": node() };
    return { nodes, querySelector: (key) => nodes[key] };
  } } };
  const state = { hashtags: module.normalizeHashtags(["One", "Two"]), selectedHashtags: ["one"],
    searchSelectedHashtags: [], archiveSelectedHashtags: [], composerLocked: false, segmentOverrides: ["manual"] };
  const options = { getState: () => state, setState: (patch) => Object.assign(state, patch), getContext: () => context,
    translate: (key) => key, persistSettings: async () => calls.push("persist"), persistArchive: async () => calls.push("archive-persist"),
    renderSearch: () => calls.push("search"), invalidateArchive: () => calls.push("invalidate"),
    setLocked: (value) => { state.composerLocked = value; calls.push("unlock"); }, renderSegments: () => calls.push("segments"),
    renderLock: () => calls.push("lock"), setStatus: (...args) => calls.push(args), defer: (callback) => callback(),
    formatCount: String, setText: (element, value) => { element.textContent = value; },
    setVisibility: (element, visible) => { if (element) { element.hidden = !visible; } }, ...overrides };
  return { module, controller: module.createHashtagController(elements, options), state, elements, calls,
    setContext: (value) => { context = value; } };
}

test("hashtag normalization accepts legacy shapes, deduplicates and rejects invalid selections", async () => {
  const { module } = await fixture();
  assert.equal(module.parseHashtag(" ##  "), null);
  assert.deepEqual(module.parseHashtag(" ##Hello World!? "), { value: "HelloWorld", normalized: "helloworld" });
  const available = module.normalizeHashtags(["#ONE", { tag: "one" }, { label: "Two" }, null, ""]);
  assert.deepEqual(available.map((tag) => tag.value), ["ONE", "Two"]);
  assert.deepEqual(module.normalizeHashtags(null), []);
  assert.deepEqual(module.normalizeHashtagSelection(["#one", "ONE", { normalized: "two" }, "missing"], available), ["one", "two"]);
  assert.deepEqual(module.normalizeHashtagSelection(null, available), []);
  assert.equal(module.getHashtagDisplayValue({ normalized: "one" }, available), "ONE");
  assert.equal(module.getHashtagDisplayValue(null, available), "");
  assert.equal(module.getHashtagDisplayValue("Unknown", available), "Unknown");
  assert.equal(module.formatHashtag("ONE"), "#ONE");
  assert.equal(module.normalizeHashtagPlacement("all-bottom"), "all-bottom");
  assert.equal(module.normalizeHashtagPlacement("bad"), "first");
  assert.equal(module.mergeHashtags(available, ["Two", "Three"]).length, 3);
});

test("hashtag rename preserves selections and merges existing tags across every workspace", async () => {
  const { module, state } = await fixture();
  state.searchSelectedHashtags = ["two", "one"]; state.archiveSelectedHashtags = ["one"];
  const renamed = module.renameHashtag(state, "one", module.parseHashtag("New"));
  assert.deepEqual(renamed.selectedHashtags, ["new"]);
  assert.deepEqual(renamed.searchSelectedHashtags, ["two", "new"]);
  const merged = module.renameHashtag(state, "one", module.parseHashtag("TWO"));
  assert.deepEqual(merged.hashtags, [{ value: "TWO", normalized: "two" }]);
  for (const key of ["selectedHashtags", "searchSelectedHashtags", "archiveSelectedHashtags"]) { assert.deepEqual(merged[key], ["two"]); }
  assert.equal(state.hashtags.length, 2);
  assert.equal(module.renameHashtag(state, "missing", module.parseHashtag("New")), state);
  assert.equal(module.renameHashtag(state, "one", null), state);
});

test("hashtag cloud renders template controls, safe text, selected state and locked interactions", async () => {
  const { controller, elements, state, calls } = await fixture();
  controller.render(); assert.equal(elements.cloud.children.length, 2);
  assert.equal(elements.cloud.children[0].nodes[".hashtag-chip"].textContent, "#One");
  assert.equal(elements.cloud.children[0].nodes[".hashtag-tool.danger"].attributes["aria-label"], "deleteHashtagAria");
  assert.equal(controller.getSelectedText(), "#One");
  state.composerLocked = true; controller.render();
  assert.equal(elements.cloud.children[0].nodes[".hashtag-chip"].disabled, true);
  controller.toggle("one"); await controller.remove("one");
  assert.deepEqual(state.selectedHashtags, ["one"]); assert.equal(calls.length, 0);
});

test("hashtag toggles use separate Composer/search/archive side effects and archive thread mode", async () => {
  const { controller, state, elements, calls, setContext } = await fixture();
  controller.toggle("two"); assert.deepEqual(state.selectedHashtags, ["one", "two"]);
  assert.deepEqual(calls, ["persist", "unlock", "segments"]);
  calls.length = 0; setContext("search"); state.composerLocked = true;
  controller.toggle("one"); assert.deepEqual(state.searchSelectedHashtags, ["one"]);
  assert.deepEqual(calls, ["search", "persist"]);
  calls.length = 0; setContext("archive"); controller.toggle("two");
  assert.equal(elements.archiveMode.value, "thread_roots");
  assert.deepEqual(state.archiveSelectedHashtags, ["two"]);
  assert.deepEqual(calls, ["invalidate", "archive-persist"]);
  controller.toggle("two"); assert.deepEqual(state.archiveSelectedHashtags, []);
});

test("hashtag add/edit/delete update all selections with persistence and invalid-input feedback", async () => {
  const { controller, state, elements, calls } = await fixture();
  let prevented = 0; const event = { preventDefault: () => { prevented += 1; } };
  elements.input.value = " "; await controller.handlers.submit(event);
  assert.deepEqual(calls.at(-1), ["hashtagInvalid", "error"]);
  elements.input.value = "Three"; await controller.handlers.submit(event);
  assert.equal(prevented, 2); assert.equal(elements.input.value, ""); assert.equal(state.hashtags.length, 3);
  await controller.handlers.submit(event); assert.equal(state.hashtags.length, 3);
  controller.openEdit(state.hashtags[0]); elements.editInput.value = " "; await controller.saveEdit();
  assert.ok(calls.includes("focus"));
  elements.editInput.value = "Two"; await controller.saveEdit();
  assert.equal(state.hashtags.length, 2); assert.deepEqual(state.selectedHashtags, ["three", "two"]);
  state.searchSelectedHashtags = ["two"]; state.archiveSelectedHashtags = ["two"];
  await controller.remove("two");
  assert.deepEqual(state.selectedHashtags, ["three"]); assert.deepEqual(state.searchSelectedHashtags, []);
  assert.deepEqual(state.archiveSelectedHashtags, []); assert.deepEqual(calls.at(-1), ["hashtagDeleted"]);
  controller.handlers.editClosed(); await controller.saveEdit(); assert.equal(calls.at(-1), "edit-close");
});

test("hashtag persistence errors do not report success or discard pending edit target", async () => {
  const { controller, elements, state, calls } = await fixture({ persistSettings: async () => { throw new Error("storage"); } });
  controller.openEdit(state.hashtags[0]); elements.editInput.value = "Changed";
  await assert.rejects(controller.saveEdit(), /storage/);
  assert.equal(state.hashtags[0].value, "Changed"); assert.equal(calls.includes("edit-close"), false);
});

test("hashtag placement, pane relocation, search summaries and dialog lifecycle retain context behavior", async () => {
  const { controller, state, elements, calls, setContext } = await fixture();
  elements.placementSelect.value = "last"; await controller.handlers.placementChange();
  assert.equal(state.hashtagPlacement, "last"); assert.equal(state.segmentOverrides, null);
  const titles = { ".eyebrow": {}, ".tips-title": {} };
  elements.pane = { classList: { toggle() {} }, querySelector: (key) => titles[key] };
  elements.archiveSlot = { replaceChildren: (pane) => calls.push(["archive-slot", pane]) };
  setContext("archive"); controller.applyContext(); assert.equal(titles[".tips-title"].textContent, "archiveHashtagTitle");
  setContext("search"); state.searchSelectedHashtags = ["one"]; elements.searchMatch.value = "any";
  controller.openSearch(); assert.equal(elements.searchDialog.open, true);
  assert.equal(elements.searchSummary.textContent, "searchHashtagSummarySome");
  controller.closeSearch(); assert.equal(elements.searchDialog.open, false);
  state.searchSelectedHashtags = []; assert.equal(controller.getSearchSummary(), "searchHashtagSummaryEmpty");
});
