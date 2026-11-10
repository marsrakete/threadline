"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Builds saved-search workflows with real models and observable page adapters.
 * @returns {Promise<object>} Controller, mutable inputs, trace and options.
 */
async function savedControllerFixture() {
  const { createSavedSearchController } = await importProjectModule("js/tools/search-controller.js");
  const f = await modelFixture();
  const saved = await savedModelFixture();
  const state = { searches: [], preferences: {}, explorer: "", archive: "", trace: [] };
  const record = (name, value) => state.trace.push([name, value]);
  const options = {
    models: saved.models,
    getSearches: () => state.searches,
    setSearches: (value) => { state.searches = value; record("collection", value.length); },
    preferences: () => state.preferences, normalizePreferences: f.normalize,
    equal: (left, right) => JSON.stringify(f.normalize(left)) === JSON.stringify(f.normalize(right)),
    persist: async () => { record("persist"); }, now: () => "2026-10-20T14:00:00.000Z", t: f.options.t,
    status: (value) => record("status", value), dialogStatus: (value) => record("dialogStatus", value),
    clearInput: () => record("clearInput"), renderDialog: () => record("renderDialog"), closeDialog: () => record("closeDialog"),
    explorerSearchId: () => state.explorer,
    resetExplorer: () => { state.explorer = ""; record("resetExplorer"); }, renderExplorer: () => record("renderExplorer"),
    archiveSearchId: () => state.archive,
    clearArchive: () => { state.archive = ""; record("clearArchive"); },
    applyExplorer: (value) => record("applyExplorer", value), applyArchive: async (value) => record("applyArchive", value.id),
    invalidateSearch: () => record("invalidateSearch"), applySearch: (value) => record("applySearch", value),
  };
  return { controller: createSavedSearchController(options), options, state, createSavedSearchController };
}

test("saved-search controller validates every adapter and exposes a frozen API", async () => {
  const f = await savedControllerFixture();
  assert.throws(() => f.createSavedSearchController(null), /getSearches/);
  for (const name of Object.keys(f.options)) {
    assert.throws(() => f.createSavedSearchController({ ...f.options, [name]: null }), TypeError);
  }
  for (const name of Object.keys(f.options.models)) {
    if (["normalize", "find", "fromPreferences", "fromUrl", "label"].includes(name)) {
      assert.throws(() => f.createSavedSearchController({ ...f.options, models: { ...f.options.models, [name]: null } }), TypeError);
    }
  }
  assert.equal(Object.isFrozen(f.controller), true);
});

test("saved-search saving ignores empty/default forms and detects normalized preference duplicates", async () => {
  const { controller, state } = await savedControllerFixture();
  await controller.save();
  assert.deepEqual(state.trace, [["status", "searchSaveEmptyWarning{}"]]);
  state.trace = []; state.preferences = { query: " alpha ", excludeText: "skip" };
  await controller.save();
  assert.equal(state.searches.length, 1);
  assert.equal(state.searches[0].searchPreferences.excludeText, "skip");
  assert.deepEqual(state.trace.map(([name]) => name), ["collection", "persist", "status"]);
  assert.match(state.trace.at(-1)[1], /searchSaveSuccess/);
  state.trace = []; state.preferences = { query: "alpha", excludeText: "skip" };
  await controller.save();
  assert.deepEqual(state.trace, [["status", "searchSaveAlreadyExists{}"]]);
});

test("saved-search saving accepts each meaningful filter independently", async () => {
  for (const preferences of [{ actor: "one.test" }, { tags: ["tag"] }, { excludeText: "skip" }, { mentions: "one.test" },
    { langs: ["de"] }, { domain: "example.test" }, { url: "https://example.test" }, { since: "2026-10-01" },
    { until: "2026-10-20" }, { mode: "posts" }, { mediaFilter: "images" }, { postTypeFilter: "originals" }]) {
    const { options, state, createSavedSearchController } = await savedControllerFixture();
    // Isolate the meaningful-form gate from the shared URL constructor's supported query fields.
    const originalModels = options.models;
    options.models = { ...originalModels, fromPreferences: (value) => ({
      ...originalModels.fromPreferences({ query: "constructor-fixture" }), searchPreferences: value,
    }) };
    const controller = createSavedSearchController(options);
    state.preferences = preferences;
    await controller.save();
    assert.equal(state.searches.length, 1, JSON.stringify(preferences));
  }
});

test("saved-search URL addition trims, rejects invalid input and retains URL duplicate rules", async () => {
  const { controller, state } = await savedControllerFixture();
  await assert.rejects(controller.addUrl(null), /savedSearchUrlInvalid/);
  assert.deepEqual(state.trace, []);
  await controller.addUrl(" https://bsky.app/search?q=Alpha ");
  assert.deepEqual(state.trace.map(([name]) => name), ["collection", "clearInput", "persist", "renderDialog"]);
  assert.equal(state.searches[0].params.q, "Alpha");
  state.trace = [];
  await controller.addUrl("https://bsky.app/search?q=alpha");
  assert.deepEqual(state.trace, [["dialogStatus", "savedSearchAlreadyExists{}"]]);
});

test("saved-search removal clears only matching workspace references before persistence", async () => {
  const { controller, state } = await savedControllerFixture();
  state.searches = [{ id: "one" }, { id: "two" }]; state.explorer = "one"; state.archive = "one";
  await controller.remove(" one ");
  assert.deepEqual(state.searches, [{ id: "two" }]);
  assert.equal(state.explorer, ""); assert.equal(state.archive, "");
  assert.deepEqual(state.trace.map(([name]) => name), ["collection", "resetExplorer", "clearArchive", "persist", "renderDialog", "renderExplorer"]);
  state.trace = []; state.explorer = "two"; state.archive = "two";
  await controller.remove("unknown");
  assert.equal(state.explorer, "two"); assert.equal(state.archive, "two");
  assert.deepEqual(state.trace.map(([name]) => name), ["collection", "persist", "renderDialog", "renderExplorer"]);
  state.trace = []; await controller.remove(null); await controller.remove(" ");
  assert.deepEqual(state.trace, []);
});

test("saved-search applying records timestamps then closes and selects explorer/archive", async () => {
  for (const context of ["threadExplorer", "archive"]) {
    const { controller, state } = await savedControllerFixture();
    const entry = { id: "one", params: { q: "legacy" } }; state.searches = [entry];
    await controller.load(" one ", context);
    assert.equal(entry.updatedAt, "2026-10-20T14:00:00.000Z");
    assert.equal(entry.lastLoadedAt, entry.updatedAt);
    if (context === "threadExplorer") {
      assert.deepEqual(state.trace, [["persist", undefined], ["closeDialog", undefined], ["applyExplorer", "search:one"]]);
    } else {
      assert.deepEqual(state.trace, [["persist", undefined], ["closeDialog", undefined], ["applyArchive", "one"]]);
    }
  }
});

test("saved-search applying invalidates live searches synchronously before awaiting persistence", async () => {
  const f = await savedControllerFixture();
  let finish;
  f.options.persist = () => { f.state.trace.push(["persist"]); return new Promise(resolve => { finish = resolve; }); };
  const controller = f.createSavedSearchController(f.options);
  f.state.searches = [{ id: "one", label: "Alpha", searchPreferences: { query: "full", excludeText: "skip" }, params: { q: "legacy" } }];
  const pending = controller.load("one", "search");
  assert.deepEqual(f.state.trace.map(([name]) => name), ["invalidateSearch", "persist"]);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.state.trace.map(([name]) => name), ["invalidateSearch", "persist", "closeDialog", "applySearch", "persist"]);
  assert.deepEqual(f.state.trace[3][1], { query: "full", excludeText: "skip" });
  finish(); await pending;
  assert.match(f.state.trace.at(-1)[1], /searchLoadSavedStatus.*Alpha/);
});

test("saved-search applying supports legacy preferences and ignores missing IDs", async () => {
  const { controller, state } = await savedControllerFixture();
  await controller.load(null, "search"); await controller.load("missing", "archive");
  assert.deepEqual(state.trace, []);
  await assert.rejects(controller.load("one", "invalid"), /workspace/);
  state.searches = [{ id: "one", params: { q: "legacy" } }];
  await controller.load("one", "search");
  assert.deepEqual(state.trace[3], ["applySearch", { q: "legacy" }]);
  assert.match(state.trace.at(-1)[1], /searchLoadSavedStatus.*legacy/);
});

test("saved-search persistence failures propagate without success rendering or workspace application", async () => {
  for (const operation of ["save", "addUrl", "remove", "load"]) {
    const f = await savedControllerFixture();
    f.state.preferences = { query: "alpha" }; f.state.searches = [{ id: "one", sourceUrl: "https://bsky.app/search?q=other" }];
    f.options.persist = async () => { throw new Error("storage unavailable"); };
    const controller = f.createSavedSearchController(f.options);
    let pending;
    if (operation === "addUrl") {
      pending = controller.addUrl("https://bsky.app/search?q=alpha");
    } else if (operation === "load") {
      pending = controller.load("one", "archive");
    } else {
      pending = controller[operation]("one");
    }
    await assert.rejects(pending, /storage unavailable/);
    assert.equal(f.state.trace.some(([name]) => ["status", "closeDialog", "renderDialog", "renderExplorer", "applyArchive"].includes(name)), false);
  }
});

/** Creates deterministic saved-search models from the real shared search adapters.
 * @returns {Promise<object>} Saved models, factory and explicit adapters.
 */
async function savedModelFixture(){
  const f=await modelFixture();const {createSavedSearchModels}=await importProjectModule("js/tools/search-models.js");
  const options={translate:f.options.t,normalizePreferences:f.normalize,labelFromPreferences:f.models.savedLabel,sharedUrl:f.models.sharedUrl,
    getString:f.search.getSavedSearchStringParam,normalizeSort:f.search.normalizeSavedSearchSort,
    now:()=>"2026-10-20T12:00:00.000Z",timestamp:()=>12345,random:()=>0.25};
  return {models:createSavedSearchModels(options),createSavedSearchModels,options};
}

test("saved-search URL models validate adapters and parse supported host/path/query fields",async()=>{
  const f=await savedModelFixture();assert.throws(()=>f.createSavedSearchModels(null),/translate/);assert.equal(Object.isFrozen(f.models),true);
  const parsed=f.models.parse(" https://bsky.app/search/?q=alpha&tag=%23topic&sort=top&lang=de ");
  assert.equal(parsed.params.q,"alpha");assert.deepEqual(parsed.params.tag,["topic"]);assert.equal(parsed.params.sort,"top");assert.equal(parsed.params.lang,"de");
  assert.equal(f.models.parse("https://www.bsky.app/search?author=one.test").params.author,"one.test");
  assert.equal(f.models.parse("https://bsky.app/search?q=alpha&sort=TOP").params.sort,"latest");
});

test("saved-search URL models reject empty, foreign, wrong-path and filter-only URLs",async()=>{
  const {models}=await savedModelFixture();
  for(const url of [null,"","invalid","https://example.test/search?q=x","https://bsky.app/profile/one?q=x","https://bsky.app/search?lang=de"])
    assert.throws(()=>models.parse(url),/savedSearchUrlInvalid/);
});

test("saved-search normalization keeps schema, first duplicate and preference-sensitive identity",async()=>{
  const {models}=await savedModelFixture();const raw={id:" id ",sourceUrl:"https://bsky.app/search?q=alpha",label:" Custom ",createdAt:"created"};
  const result=models.normalize([null,raw,{...raw,label:"duplicate"},{...raw,id:"other",searchPreferences:{query:"different"}}]);
  assert.equal(result.length,2);assert.equal(result[0].id,"id");assert.equal(result[0].label,"Custom");assert.equal(result[0].createdAt,"created");assert.equal(result[0].updatedAt,"created");
  assert.equal(result[1].searchPreferences.query,"different");assert.equal(raw.id," id ");
});

test("saved-search normalization caps entries, fills clocks/IDs and ignores invalid collections",async()=>{
  const {models}=await savedModelFixture();assert.deepEqual(models.normalize(null),[]);
  const generated=models.normalize([{url:"https://bsky.app/search?q=alpha"}])[0];
  assert.match(generated.id,/^search-1-/);assert.equal(generated.createdAt,"2026-10-20T12:00:00.000Z");assert.equal(generated.lastLoadedAt,"");
  const entries=Array.from({length:101},(_,i)=>({sourceUrl:"https://bsky.app/search?q=word"+i}));assert.equal(models.normalize(entries).length,100);
});

test("saved-search constructors retain URL versus full-preference formats and deterministic IDs",async()=>{
  const {models}=await savedModelFixture();const fromUrl=models.fromUrl("https://bsky.app/search?q=alpha");
  assert.equal(fromUrl.params.q,"alpha");assert.equal(fromUrl.label,"alpha");assert.equal(fromUrl.searchPreferences,undefined);
  const fromPreferences=models.fromPreferences({query:"alpha",excludeText:"skip",mode:"posts",langs:["de"]});
  assert.equal(fromPreferences.searchPreferences.excludeText,"skip");assert.equal(fromPreferences.searchPreferences.mode,"posts");
  assert.deepEqual(fromPreferences.searchPreferences.langs,["de"]);assert.equal(fromUrl.id,fromPreferences.id);assert.equal(fromPreferences.updatedAt,fromPreferences.createdAt);
});

test("saved-search labels and metadata preserve legacy and full-preference priorities",async()=>{
  const {models}=await savedModelFixture();
  assert.equal(models.label({params:{q:" query ",tag:["topic"]}}),"query");assert.equal(models.label({params:{tag:["topic"]}}),"#topic");
  assert.equal(models.label({params:{author:"@@one.test"}}),"@one.test");assert.match(models.label(),/savedSearchFallbackTitle/);
  assert.equal(models.meta({params:{tag:["one"],sort:"top",lang:"de"}}),"#one · top · lang: de");
  assert.match(models.meta({searchPreferences:{actor:"one.test",tags:["topic"],langs:["de"]}}),/@one.test/);
  assert.match(models.meta(),/savedSearchMetaDefault/);
});

test("saved-search lookup handles exact IDs, missing IDs and invalid collections",async()=>{
  const {models}=await savedModelFixture();const item={id:"one"};assert.equal(models.find([item]," one "),item);
  assert.equal(models.find([item],"on"),null);assert.equal(models.find(null,"one"),null);assert.equal(models.find([item],""),null);
});

/** Creates shared normalization and localized model adapters. @returns {Promise<object>} Options and models. */
async function modelFixture() {
  const search = await importProjectModule("js/tools/search.js");
  const { createSearchModels } = await importProjectModule("js/tools/search-models.js");
  const languages = (values, limit) => [...new Set(values)].filter(Boolean).slice(0, limit);
  const tags = (values) => { if (!Array.isArray(values)) { return []; } return [...new Set(values)].filter(Boolean); };
  const displayTag = (value) => String(value).replace(/^#+/, "");
  const normalize = search.createSearchPreferencesNormalizer({ normalizeHashtags: tags, getDisplayHashtag: displayTag, normalizeLanguages: languages, maxLanguages: 3 });
  const t = (key, values = {}) => key + JSON.stringify(values);
  const options = { t, count: String, formatTag: (tag) => `#${displayTag(tag)}`, displayTag, quote: search.quoteSearchSummaryValue,
    languages, languageName: (tag, locale) => `${locale}:${tag}`, sharedQuery: search.buildSharedSearchQuery,
    normalize, account: () => "own.test", locale: () => "de", maxLanguages: 3 };
  return { search, options, tags, normalize, models: createSearchModels(options), createSearchModels };
}

test("search models and the shared normalizer retain defaults, aliases and invalid-input handling", async () => {
  const { models, normalize, options, createSearchModels } = await modelFixture();
  assert.throws(() => createSearchModels(null), TypeError);
  assert.throws(() => createSearchModels({ ...options, languages: null }), TypeError);
  assert.equal(normalize(null).mode, "network");
  assert.equal(normalize({ postTypeFilter: "posts" }).postTypeFilter, "originals");
  assert.equal(normalize({ postTypeFilter: "invalid" }).postTypeFilter, "all");
  assert.deepEqual(normalize({ langs: ["de", "de", "en", "fr", "es"] }).langs, ["de", "en", "fr"]);
  assert.equal(models.topic({}), "");
  assert.match(models.topic({ query: "Word", tags: ["Tag"] }), /searchSummaryTopicTextAndTags/);
  assert.match(models.topic({ tags: ["one", "two"], tagMatchMode: "any" }), /TagsAny/);
  assert.match(models.summary({ mode: "posts", actor: "@own.test" }), /PostsOwn/);
  assert.match(models.summary({ mode: "reposts", actor: "other.test" }), /RepostsActor/);
  assert.match(models.summary({ mode: "hashtags" }), /HashtagsGlobal/);
  assert.match(models.summary({ actor: "other.test" }), /NetworkActor/);
});

test("search display models cover detailed filters, progress, loaded state and saved labels", async () => {
  const { models } = await modelFixture();
  assert.ok(models.details({ mode: "reposts", mediaFilter: "none", postTypeFilter: "quotes", langs: ["de", "en"],
    excludeText: "skip", mentions: "friend.test", tags: ["a", "b"], tagMatchMode: "any", domain: "example.test", url: "https://example.test", since: "start", until: "end" }).length >= 10);
  assert.match(models.progress({ mode: "reposts", actor: "own.test", pageCount: -1 }), /@own.test/);
  assert.match(models.progress(null), /ProgressGeneric/);
  assert.match(models.loaded(25, true), /LoadedMore/);
  assert.match(models.loaded(0, false), /searchStatusLoaded/);
  assert.equal(models.detailed({}), false);
  assert.equal(models.detailed({ langs: ["de"] }), false);
  for (const payload of [{ mode: "posts" }, { mode: "reposts" }, { mediaFilter: "images" }, { postTypeFilter: "replies" }, { langs: ["de", "en"] }]) {
    assert.equal(models.detailed(payload), true);
  }
  for (const [preferences, expected] of [[{ query: "Query" }, "Query"], [{ tags: ["one", "two", "three"] }, "#one + #two"],
    [{ actor: "@@own.test" }, "@own.test"], [{ domain: "example.test" }, "example.test"], [{ url: "link" }, "link"]]) {
    assert.equal(models.savedLabel(preferences), expected);
  }
  assert.match(models.savedLabel(null), /savedSearchFallbackTitle/);
});

test("search share URLs preserve filters while explicitly reporting unsupported ones", async () => {
  const { models } = await modelFixture();
  const result = models.sharedUrl({ mode: "reposts", actor: "own.test", query: "phrase", excludeText: "two words", tags: ["#one"], sort: "top",
    langs: ["de", "en"], mentions: "friend.test", mediaFilter: "images", postTypeFilter: "quotes", domain: "example.test", url: "https://example.test/a?b=c", since: "start", until: "end" });
  const params = new URL(result.url).searchParams;
  assert.equal(params.get("q"), 'phrase -"two words"');
  assert.equal(params.get("author"), null);
  assert.equal(params.get("tag"), "one");
  assert.equal(params.get("lang"), "de");
  assert.equal(params.get("url"), "https://example.test/a?b=c");
  assert.equal(result.limitations.length, 4);
  assert.equal(new URL(models.sharedUrl({ actor: "@own.test" }).url).searchParams.get("author"), "own.test");
  assert.equal(new URL(models.sharedUrl(null).url).searchParams.get("sort"), "latest");
});

/** Creates form controls and a deterministic timer queue. @returns {Promise<object>} Form, state and adapters. */
async function formFixture() {
  const { options: model, tags } = await modelFixture();
  const { createSearchFormController } = await importProjectModule("js/tools/search-form.js");
  const elements = {};
  for (const name of ["ModeSelect", "ActorField", "TagsField", "SortField", "ModeNote", "ActorInput", "QueryInput", "TagMatchSelect", "MediaSelect", "PostTypeSelect", "SortSelect", "ExcludeTextInput", "MentionsInput", "DomainInput", "TargetUrlInput", "SinceInput", "UntilInput", "UrlInput", "UrlStatus", "Status", "LanguageSummary"]) {
    elements[`search${name}`] = { value: "", textContent: "", hidden: false, querySelector: () => ({ disabled: false }) };
  }
  const state = { hashtags: [], searchSelectedHashtags: [], searchSelectedLanguages: [], searchResults: [], searchCursor: "", searchResultPreferences: null };
  const calls = []; const timers = new Map(); let next = 0;
  const options = { elements, state, maxLanguages: 3, t: model.t, languages: model.languages, selectedTags: tags,
    displayTag: model.displayTag, tags, parseUrl: () => ({ sourceUrl: "https://bsky.app/search?q=word", params: { q: "word -skip", tag: ["tag"], lang: "de" } }),
    splitQuery: (value) => ({ query: value.split(" -")[0], excludeText: "skip" }), renderTags: () => calls.push("tags"), renderWorkspace: () => calls.push("workspace"), renderResults: () => calls.push("results"),
    persist: async () => calls.push("persist"), announce: (text) => calls.push(text), languageName: model.languageName,
    account: model.account, locale: model.locale, hydrated: () => true,
    schedule: (callback, delay) => { timers.set(++next, { callback, delay }); return next; }, clearTimer: (id) => timers.delete(id), invalidate: () => calls.push("invalidate") };
  return { createSearchFormController, options, form: createSearchFormController(options), state, elements, calls, timers };
}

test("search form snapshots keep persisted actor separate from effective own-account requests", async () => {
  const { form, state, elements, options, createSearchFormController } = await formFixture();
  assert.throws(() => createSearchFormController(null), TypeError);
  assert.throws(() => createSearchFormController({ ...options, state: null }), TypeError);
  form.apply({ mode: "posts", query: " Word ", postTypeFilter: "posts", langs: ["de", "en"], sort: "top", tags: ["tag"] });
  assert.equal(form.preferences().actor, "");
  assert.equal(form.payload().actor, "own.test");
  assert.equal(form.payload().sourceUrl, undefined);
  assert.equal(elements.searchSortSelect.value, "latest");
  assert.equal(elements.searchPostTypeSelect.value, "originals");
  assert.deepEqual(state.searchSelectedLanguages, ["de", "en"]);
  assert.deepEqual(form.preferences().tags, ["tag"]);
  form.renderLanguage();
  assert.match(elements.searchLanguageSummary.textContent, /de:de/);
  form.apply({ mode: "invalid", mediaFilter: "invalid", postTypeFilter: "invalid", lang: "fr" });
  assert.equal(form.mode(), "network");
  assert.equal(elements.searchMediaSelect.value, "all");
  assert.deepEqual(state.searchSelectedLanguages, ["fr"]);
  assert.throws(() => form.apply(null), TypeError);
});

test("search form URL import and persistence coalesce timers and clear cancels pending work", async () => {
  const { form, timers, elements, state, calls } = await formFixture();
  form.schedulePersist(); form.schedulePersist();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 280);
  form.applyUrl("shared");
  assert.equal(form.mode(), "hashtags");
  assert.equal(elements.searchQueryInput.value, "word");
  assert.deepEqual(state.hashtags, ["tag"]);
  elements.searchUrlInput.value = "pending";
  form.scheduleUrl(); form.scheduleUrl();
  assert.equal([...timers.values()].filter(entry => entry.delay === 30).length, 1);
  await form.clear();
  assert.equal(timers.size, 0);
  assert.equal(calls.at(-1), "persist");
  assert.ok(calls.indexOf("invalidate") < calls.lastIndexOf("results"));
  assert.deepEqual(state.searchResults, []);
  assert.deepEqual(state.searchSelectedHashtags, []);
  assert.equal(form.mode(), "network");
});

test("search form tolerates absent optional controls and reports malformed URLs", async () => {
  const { options, createSearchFormController } = await formFixture();
  const form = createSearchFormController({ ...options, elements: {} });
  assert.equal(form.mode(), "network");
  assert.equal(form.payload().query, "");
  form.updateMode(); form.updateSort(); form.renderLanguage(); await form.clear();
  const broken = createSearchFormController({ ...options, parseUrl: () => { throw Error("invalid URL"); } });
  options.elements.searchUrlInput.value = "bad";
  broken.importUrl();
  assert.equal(options.elements.searchUrlStatus.textContent, "invalid URL");
});

/** Creates a deferred promise for out-of-order worker responses. @returns {object} Promise and settlement callbacks. */
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

/** Creates a search run with deferred worker replies. @returns {Promise<object>} Controller, live state and calls. */
async function runFixture() {
  const { search, normalize, models } = await modelFixture();
  const { createSearchRunController } = await importProjectModule("js/tools/search-controller.js");
  const state = { searchResults: [], searchCursor: "", searchResultPreferences: null, activeSearchRunId: "", searchLoading: false, searchCancelPending: false };
  const calls = { requests: [], controls: [], statuses: [], persist: 0, errors: [] };
  let preferences = { query: "word" }; let account = "own.test";
  const options = { state, account: () => account, payload: () => { const payload = normalize(preferences); if (!payload.actor && ["posts", "reposts"].includes(payload.mode)) { payload.actor = account; } return payload; },
    preferences: () => preferences, enforceSort() {}, normalize, items: (values) => search.normalizePersistedSearchResultItems(values, 2),
    snapshot: search.buildPersistableSearchResultState, match: search.doesSearchResultStateMatch, maxItems: 2,
    request: (payload, callbacks) => { const task = deferred(); calls.requests.push({ payload, callbacks, ...task }); return task.promise; },
    control: async (payload) => calls.controls.push(payload), id: () => String(calls.requests.length + 1), detailed: models.detailed,
    progress: models.progress, loaded: models.loaded, status: (value) => calls.statuses.push(value), render() {}, results() {},
    persist: async () => { calls.persist += 1; }, t: (key) => key, count: String, report: (error) => calls.errors.push(error) };
  return { state, calls, options, createSearchRunController, run: createSearchRunController(options), setPreferences: (value) => { preferences = value; }, setAccount: (value) => { account = value; } };
}

test("search runs guard missing accounts and duplicate starts and retain matching continuation contracts", async () => {
  const { run, state, calls, setAccount } = await runFixture();
  setAccount(""); await run.load(); assert.equal(calls.requests.length, 0); setAccount("own.test");
  const first = run.load(); await run.load(); assert.equal(calls.requests.length, 1);
  assert.equal(calls.requests[0].payload.limit, 25); assert.equal(calls.requests[0].callbacks.timeoutMs, 420000);
  calls.requests[0].resolve({ items: [{ post: { uri: "one" } }], cursor: "next" }); await first;
  assert.equal(state.searchLoading, false); assert.equal(run.matches(), true);
  const next = run.load({ append: true });
  assert.equal(calls.requests[1].payload.cursor, "next"); assert.deepEqual(calls.requests[1].payload.excludeUris, ["one"]);
  calls.requests[1].resolve({ items: [{ post: { uri: "two" } }] }); await next;
  assert.equal(state.searchResults.length, 2); assert.equal(calls.persist, 2);
});

test("search result identity permits imported URLs and own-account fallback but rejects changed filters", async () => {
  const { run, calls, setPreferences, state } = await runFixture();
  setPreferences({ mode: "posts", sourceUrl: "https://bsky.app/search?q=word", query: "word" });
  const first = run.load(); calls.requests[0].resolve({ items: [{ post: {} }], cursor: "next" }); await first;
  assert.equal(run.matches(), true);
  setPreferences({ mode: "posts", query: "different" }); assert.equal(run.matches(), false);
  const next = run.load({ append: true }); assert.equal(calls.requests[1].payload.cursor, ""); assert.deepEqual(calls.requests[1].payload.excludeUris, []);
  calls.requests[1].resolve({ items: "invalid", cursor: "" }); await next;
  assert.deepEqual(state.searchResults, []); assert.equal(run.snapshot(), null);
});

test("search invalidation discards stale progress, results, errors and finalizers while a new run is active", async () => {
  const { run, calls, state } = await runFixture();
  const old = run.load(); run.invalidate(); const fresh = run.load();
  const statusCount = calls.statuses.length;
  calls.requests[0].callbacks.onProgress({ mode: "posts", pageCount: 99 });
  calls.requests[0].resolve({ items: [{ post: { uri: "old" } }], cursor: "old" }); await old;
  assert.deepEqual(state.searchResults, []); assert.equal(state.searchLoading, true); assert.equal(calls.persist, 0);
  assert.equal(calls.statuses.length, statusCount); assert.equal(calls.controls[0].runId, "1");
  calls.requests[1].resolve({ items: [{ post: { uri: "fresh" } }] }); await fresh;
  assert.equal(state.searchResults[0].post.uri, "fresh");
  const failing = run.load(); run.invalidate(); calls.requests[2].reject(Error("stale")); await failing;
  assert.deepEqual(calls.errors, []);
});

test("search cancellation retains partial results and ignores late control failures", async () => {
  const { run, options, createSearchRunController, calls, state } = await runFixture();
  const control = deferred(); const controller = createSearchRunController({ ...options, control: () => control.promise });
  const pending = controller.load(); const cancelling = controller.cancel(); await controller.cancel();
  assert.equal(state.searchCancelPending, true);
  calls.requests[0].resolve({ items: [{ post: { uri: "partial" } }], cancelled: true }); await pending;
  const statuses = calls.statuses.length; control.reject(Error("late cancel error")); await cancelling;
  assert.equal(calls.statuses.length, statuses); assert.equal(state.searchResults.length, 1);
  assert.ok(calls.statuses.includes("searchStatusCancelledPartial")); assert.deepEqual(calls.errors, []);
  await run.cancel();
});

test("search restore clamps items, rejects mismatches and preserves live progress", async () => {
  const { run, state, calls } = await runFixture();
  assert.equal(run.snapshot(), null);
  const stored = { preferences: { query: "word" }, items: [{ post: { uri: "one" } }, null, { post: { uri: "two" } }, { post: {} }], cursor: " next " };
  run.restore(stored, { query: "word" }); assert.equal(state.searchResults.length, 2); assert.equal(state.searchCursor, "next");
  assert.equal(run.snapshot().items.length, 2); run.restoreStatus(); assert.match(calls.statuses.at(-1), /LoadedMore/);
  run.restore(stored, { query: "other" }); assert.deepEqual(state.searchResults, []); assert.equal(state.searchCursor, "");
  run.restore(null); run.restoreStatus(); assert.equal(calls.statuses.at(-1), "searchStatusIdle");
  state.searchLoading = true; const length = calls.statuses.length; run.restoreStatus(); assert.equal(calls.statuses.length, length);
});

test("search startup restores own-account results before global account state is applied", async () => {
  const { run, state, setAccount } = await runFixture();
  setAccount("");
  run.restore({ preferences: { mode: "posts", actor: "own.test" }, items: [{ post: { uri: "saved" } }], cursor: "next" }, { mode: "posts" }, "own.test");
  assert.equal(state.searchResults[0].post.uri, "saved");
  setAccount("own.test");
});

test("search controller reports current worker/storage errors and requires complete adapters", async () => {
  const { run, calls, state, createSearchRunController, options } = await runFixture();
  assert.throws(() => createSearchRunController(null), TypeError);
  assert.throws(() => createSearchRunController({ ...options, state: null }), TypeError);
  const pending = run.load(); calls.requests[0].reject(Error("worker failed")); await pending;
  assert.equal(calls.statuses.at(-1), "worker failed"); assert.equal(state.searchLoading, false);
  const failing = createSearchRunController({ ...options, persist: async () => { throw Error("storage failed"); } });
  const next = failing.load(); calls.requests[1].resolve({ items: [] }); await next;
  assert.equal(calls.statuses.at(-1), "storage failed"); assert.equal(state.activeSearchRunId, "");
});
