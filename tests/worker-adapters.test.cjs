"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");

test("profile metadata preserves ordered links, provenance, labels and pronouns without interpreting markup", () => {
  const metadata = archiveModelsFixture().context.ThreadlineProfileMetadata;
  const profile = { pronouns: " they/them <b>literal</b> ", website: "https://old.example",
    links: [{ uri: "at://did:own/app.bsky.actor.link/one", cid: "cid", url: "https://example.test/a", title: " <b>Support</b> ", labels: [{ val: "test" }] },
      { url: "https://example.test/b", title: "Website" }] };
  const result = plain(metadata.normalize(profile));
  assert.equal(result.pronouns, "they/them <b>literal</b>");
  assert.deepEqual(result.links.map(link => link.url), ["https://example.test/a", "https://example.test/b"]);
  assert.equal(result.links[0].uri, profile.links[0].uri);
  assert.deepEqual(result.links[0].labels, [{ val: "test" }]);
  assert.equal(result.links[0].title, "<b>Support</b>");
  assert.equal(profile.links[0].title, " <b>Support</b> ");
  assert.deepEqual(plain(metadata.links(profile)), result.links);
});

test("profile metadata handles legacy websites, absent/cleared fields and invalid URLs", () => {
  const metadata = archiveModelsFixture().context.ThreadlineProfileMetadata;
  for (const value of [null, undefined, 42, {}]) { assert.deepEqual(plain(metadata.normalize(value)), {}); }
  assert.deepEqual(plain(metadata.normalize({ pronouns: "", links: [] })), { pronouns: "", links: [] });
  assert.deepEqual(plain(metadata.links({ website: "https://old.example" })), [{ url: "https://old.example/", title: "" }]);
  const result = metadata.normalize({ links: [null, {}, { url: "javascript:alert(1)" }, { url: "data:text/html,bad" },
    { url: "https://user:password@example.test/" }, { url: "not a URL" }], website: "javascript:bad" });
  assert.deepEqual(plain(result), { website: "", links: [] });
  assert.equal(Object.isFrozen(metadata), true);
});

/** Creates deterministic shared transport adapters and a response queue.
 * @returns {object} Factory, API, options, calls, GET traces and responses.
 */
function transportFixture() {
  const f = archiveModelsFixture(), calls = [], gets = [], responses = [];
  const options = { apiBase: "https://fixture.test/xrpc", messages: f.context.ThreadlineAdapterMessages,
    fetch: async (...args) => { calls.push(args); const response = responses.shift(); if (response instanceof Error) { throw response; } return response; },
    getRequest: async (...args) => { gets.push(args); return { ok: true }; }, searchParams: () => new URLSearchParams(),
    error: vm.runInContext("createServiceWorkerError", f.context), now: () => Date.parse("2026-10-31T12:00:00Z") };
  const factory = f.context.createThreadlineTransportService;
  return { ...f, factory, options, service: factory(options), calls, gets, responses };
}

test("transport validates callbacks and exposes a frozen API", () => {
  const f = transportFixture(); assert.throws(() => f.factory(), /fetch/);
  for (const key of ["fetch", "getRequest", "searchParams", "error", "now"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), /requires/); }
  assert.equal(Object.isFrozen(f.service), true); assert.deepEqual(Object.keys(f.service), ["request", "get", "rateLimit"]);
});

test("XRPC requests retain fetch options, header precedence, JSON/text/empty payload and metadata envelopes", async () => {
  const f = transportFixture(); f.responses.push(new Response('{"ok":true}', { headers: { "ratelimit-remaining": "4" } }));
  const signal = new AbortController().signal, result = await f.service.request("method", { base: "https://other.test/xrpc", headers: { "content-type": "custom", authorization: "fixture" }, signal, returnMeta: true });
  assert.equal(result.data.ok, true); assert.equal(result.meta.rateLimit.remaining, 4); assert.equal(f.calls[0][0], "https://other.test/xrpc/method"); assert.equal(f.calls[0][1].signal, signal); assert.equal(f.calls[0][1].headers["content-type"], "custom"); assert.equal(f.calls[0][1].returnMeta, true);
  f.responses.push(new Response("plain"), new Response("")); assert.deepEqual(plain(await f.service.request("text")), { message: "plain" }); assert.deepEqual(plain(await f.service.request("empty")), {});
});

test("XRPC failures retain error codes, body fallbacks, rate limits and seconds/date Retry-After", async () => {
  const f = transportFixture();
  for (const [status, header, milliseconds, code] of [[401, "2", 2000, "AUTH_INVALID_CREDENTIALS"], [429, "Sat, 31 Oct 2026 12:00:03 GMT", 3000, "BSKY_REQUEST_FAILED"], [500, "bad", 0, "BSKY_REQUEST_FAILED"]]) {
    f.responses.push(new Response('{"error":"fixture failure"}', { status, headers: { "retry-after": header } }));
    await assert.rejects(f.service.request("bad"), error => error.message === "fixture failure" && error.details.code === code && error.details.retryAfterMs === milliseconds && error.details.status === status);
  }
  f.responses.push(new Response("", { status: 503 })); await assert.rejects(f.service.request("empty"), /Bluesky request failed \(503\)/);
  const failure = Error("offline"); f.responses.push(failure); await assert.rejects(f.service.request("offline"), error => error === failure);
});

test("GET serialization keeps scalar falsy values, omits empty/null values and filters falsy array items", async () => {
  const f = transportFixture(), signal = new AbortController().signal;
  await f.service.get("method", { zero: 0, flag: false, empty: "", no: null, missing: undefined, items: ["a b", 0, false, "x&y"], object: {} }, { signal, base: "base", headers: { test: "yes" }, ignored: true });
  assert.equal(f.gets[0][0], "method?zero=0&flag=false&items=a+b&items=x%26y&object=%5Bobject+Object%5D");
  assert.equal(f.gets[0][1].signal, signal); assert.equal(f.gets[0][1].ignored, undefined);
  await f.service.get("empty", null); assert.equal(f.gets[1][0], "empty");
});

test("rate-limit parsing preserves absent/null, zero counters and numeric/date reset forms", () => {
  const f = transportFixture(); assert.equal(f.service.rateLimit(null), null); assert.equal(f.service.rateLimit(new Response()), null);
  const result = f.service.rateLimit(new Response("", { headers: { "ratelimit-limit": "100", "ratelimit-remaining": "0", "ratelimit-reset": "1", "ratelimit-policy": "policy" } }));
  assert.deepEqual(plain(result), { limit: 100, remaining: 0, resetAt: "1970-01-01T00:00:01.000Z", policy: "policy", retryAfter: "" });
  assert.equal(f.service.rateLimit(new Response("", { headers: { "ratelimit-reset": "Sat, 31 Oct 2026 12:00:00 GMT" } })).resetAt, "2026-10-31T12:00:00.000Z");
});

/** Creates auth models with predictable URL/frontend inference and a fixed clock.
 * @returns {object} Models, constructor and configuration.
 */
function authFixture() {
  const f = archiveModelsFixture(), options = { defaultService: "https://bsky.social", defaultWebApp: "https://bsky.app", inferWebApp: () => "https://bsky.app", webBase: () => "https://bsky.app",
    error: vm.runInContext("createServiceWorkerError", f.context), now: () => "2026-10-31T12:00:00Z", messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineAuthModels;
  return { ...f, factory, options, models: factory(options) };
}

test("auth models validate callbacks and retain URL normalization/security boundaries", () => {
  const f = authFixture(); assert.throws(() => f.factory(), /inferWebApp/); assert.equal(Object.isFrozen(f.models), true);
  for (const key of ["inferWebApp", "webBase", "error", "now"]) { assert.throws(() => f.factory({ ...f.options, [key]: null }), /require/); }
  assert.equal(f.models.service(" example.test/xrpc/?a=1#hash "), "https://example.test"); assert.equal(f.models.service(""), "https://bsky.social");
  assert.equal(f.models.service("not a url/"), "https://not a url"); assert.equal(f.models.insecure(" HTTP://example.test "), true);
  assert.throws(() => f.models.secure("http://example.test"), error => error.details.code === "INSECURE_SERVICE_URL"); assert.equal(f.models.secure("https://example.test"), undefined);
});

test("auth state handles legacy/current inputs and active account selection without mutating sources", () => {
  const f = authFixture(), session = { did: "did:one", handle: "one.test", accessJwt: "fixture" }, raw = { identifier: "one.test", session, appPassword: "fixture-password" };
  const state = f.models.state(raw); assert.equal(state.activeDid, "did:one"); assert.equal(state.accounts[0].session, session); assert.equal(state.accounts[0].updatedAt, "2026-10-31T12:00:00Z");
  assert.equal(f.models.state({ accounts: [raw], activeDid: "missing" }).activeDid, ""); assert.equal(f.models.state({ accounts: [raw, {}], activeDid: "did:one" }).accounts.length, 1);
  assert.deepEqual(plain(f.models.state(null)), { activeDid: "", accounts: [] }); assert.equal(raw.updatedAt, undefined); assert.throws(() => f.models.account(null));
});

test("auth upsert distinguishes DID and identifier matching; public responses omit all credentials", () => {
  const f = authFixture(), first = f.models.account({ did: "did:one", identifier: "same", appPassword: "secret", session: { did: "did:one", accessJwt: "token" } });
  const initial = { activeDid: "did:one", accounts: [first] }, next = f.models.upsert(initial, { did: "did:two", identifier: "same" });
  assert.equal(next.accounts.length, 2); assert.equal(next.activeDid, "did:one"); assert.equal(initial.accounts.length, 1);
  assert.equal(f.models.upsert(next, { identifier: "same" }).accounts.length, 1);
  const response = f.models.response(initial); assert.equal(response.authenticated, true); assert.equal(response.accounts[0].hasStoredPassword, true); assert.equal(response.accounts[0].hasSession, true);
  assert.doesNotMatch(JSON.stringify(response), /secret|token|accessJwt|appPassword/); assert.equal(f.models.response({ activeDid: "none", accounts: [] }).authenticated, false);
});

/** Creates asynchronous request-level IndexedDB doubles; transaction completion is intentionally absent.
 * @returns {object} Service, trace, data map, settings and normalizer traces.
 */
function storageFixture() {
  const f = archiveModelsFixture(), calls = [], values = new Map(), stores = new Set(), normalized = [], settings = {};
  const database = { objectStoreNames: { contains: name => stores.has(name) }, createObjectStore: (name, options) => { stores.add(name); calls.push(["create", name, options]); },
    transaction: (name, mode) => { calls.push(["transaction", name, mode]); if (settings.transactionError) { throw settings.transactionError; }
      return { objectStore: () => ({ get: key => operation("get", key), put: (value, key) => operation("put", key, value), delete: key => operation("delete", key) }) }; } };
  /** Schedules an IndexedDB-style request callback. @param {string} kind - Operation. @param {string} key - Key. @param {unknown} value - Write value. @returns {object} Mutable request. */
  function operation(kind, key, value) { const request = {}; calls.push([kind, key, value]); queueMicrotask(() => {
    if (settings.requestError) { request.error = settings.requestError; request.onerror(); return; }
    if (kind === "put") { values.set(key, value); } else if (kind === "delete") { values.delete(key); }
    request.result = values.get(key); request.onsuccess();
  }); return request; }
  const options = { indexedDB: () => ({ open: (name, version) => { calls.push(["open", name, version]); const request = {}; queueMicrotask(() => {
    if (settings.openError) { request.error = settings.openError; request.onerror(); return; } request.result = database; request.onupgradeneeded(); request.onsuccess();
  }); return request; } }), databaseName: "fixture", databaseVersion: 2, storeName: "values", imageStoreName: "images", authKey: "auth",
    normalizeAuth: value => { normalized.push(value); if (settings.normalizeError) { throw settings.normalizeError; } return { normalized: value }; }, messages: f.context.ThreadlineAdapterMessages };
  const factory = f.context.createThreadlineStorageService;
  return { ...f, factory, options, service: factory(options), calls, values, settings, normalized };
}

test("storage validates callbacks and upgrades only missing stores with the original image key path", async () => {
  const f = storageFixture(); assert.throws(() => f.factory(), /indexedDB/); assert.throws(() => f.factory({ ...f.options, normalizeAuth: null }), /normalizeAuth/); assert.equal(Object.isFrozen(f.service), true);
  await f.service.open(); await f.service.open(); assert.deepEqual(plain(f.calls.filter(call => call[0] === "create")), [["create", "values", null], ["create", "images", { keyPath: "id" }]]);
});

test("storage read/write preserve falsy values, identities and request-success completion", async () => {
  const f = storageFixture(); assert.equal(await f.service.read("missing"), null);
  for (const value of [false, 0, "", null]) { assert.equal(await f.service.write("value", value), value); assert.equal(await f.service.read("value"), value); }
  const value = { id: 1 }; assert.equal(await f.service.write("object", value), value); assert.equal(await f.service.read("object"), value);
  assert.ok(f.calls.some(call => call[0] === "transaction" && call[2] === "readonly")); assert.ok(f.calls.some(call => call[0] === "transaction" && call[2] === "readwrite"));
});

test("auth storage opens before normalization, keeps separate normalization rules and deletes only auth", async () => {
  const f = storageFixture(), raw = { id: 1 }; const normalized = await f.service.writeAuth(raw);
  assert.equal(f.normalized[0], raw); assert.equal(f.values.get("auth"), normalized); assert.equal(f.calls[0][0], "open");
  f.values.set("auth", 0); assert.equal((await f.service.readAuth()).normalized, null); f.values.set("other", "keep");
  assert.equal(await f.service.clearAuth(), undefined); assert.equal(f.values.has("auth"), false); assert.equal(f.values.get("other"), "keep");
});

test("storage propagates open, transaction, request and normalization failures", async () => {
  for (const kind of ["openError", "transactionError", "requestError", "normalizeError"]) {
    const f = storageFixture(), failure = Error(kind); f.settings[kind] = failure;
    await assert.rejects(f.service.writeAuth({}), error => error === failure);
  }
});

test("record boundary models expose a frozen pure API with language, rule, URI and tag contracts",()=>{
  const f=archiveModelsFixture(),m=f.context.ThreadlineRecordModels;assert.equal(Object.isFrozen(m),true);
  assert.equal(m.normalizeStandardSiteMetadata(null),null);assert.equal(m.normalizeStandardSiteMetadata({}),null);
  assert.equal(m.normalizeStandardSiteMetadata({name:" Example ",publicationVerified:true}).publicationName,"Example");
  assert.equal(m.normalizeStandardSiteMetadata({name:"Example"}).ctaLabel,"View Publication");
  assert.deepEqual(plain(m.normalizePostLanguageTags(["de-DE","DE","en-US","fr"],2)),["de","en"]);assert.deepEqual(plain(m.normalizePostLanguageTags(null)),[]);
  assert.deepEqual(plain(m.normalizePostInteractionSettings({replyMode:"bad",allowFollowers:true,quotePostsAllowed:false})),{replyMode:"everyone",allowFollowers:true,allowFollowing:false,allowMentioned:false,quotePostsAllowed:false});
  assert.equal(m.buildThreadGateAllowRules(m.normalizePostInteractionSettings()),null);
  assert.deepEqual(plain(m.buildThreadGateAllowRules({replyMode:"nobody"})),[]);
  assert.equal(m.buildThreadGateAllowRules({replyMode:"custom",allowFollowers:true,allowFollowing:true,allowMentioned:true}).length,3);
  assert.equal(m.extractRecordKeyFromAtUri("at://did/app.bsky.feed.post/key"),"key");assert.equal(m.extractRecordKeyFromAtUri("bad"),"");
  assert.deepEqual(plain(m.parseAtUriParts("at://did/app.bsky.feed.post/key")),{repo:"did",collection:"app.bsky.feed.post",rkey:"key"});assert.equal(m.parseAtUriParts("at://missing"),null);assert.equal(m.parseAtUriParts(null),null);
  assert.deepEqual(plain(m.parseHashtagValue(" ##Äpfel! ")),{value:"Äpfel",normalized:"äpfel"});assert.equal(m.parseHashtagValue("###"),null);
  const tags=m.normalizeHashtagEntries(["#Tag",{tag:"TAG"},null,"#two"]);assert.equal(tags.length,2);assert.deepEqual(plain(m.normalizeHashtagEntries(null)),[]);
  assert.deepEqual(plain(m.normalizeSelectedHashtagEntries(["#TAG","tag","missing"],tags)),["tag"]);assert.deepEqual(plain(m.normalizeSelectedHashtagEntries(null,null)),[]);
});

test("record source and profile models retain permissive frontend routing and explicit AT parser",()=>{
  const f=archiveModelsFixture(),m=f.context.ThreadlineRecordModels;
  const parse=()=>({did:"did:one",collection:"app.bsky.feed.post",rkey:"key"});
  assert.deepEqual(plain(m.parseArchiveThreadSource("at://did:one/app.bsky.feed.post/key",parse)),{sourceUrl:"at://did:one/app.bsky.feed.post/key",actor:"did:one",rkey:"key",entryUri:"at://did:one/app.bsky.feed.post/key"});
  assert.equal(m.parseArchiveThreadSource("https://mu.social/profile/a%2Eb/post/key").actor,"a.b");
  assert.throws(()=>m.parseArchiveThreadSource(""),/Posting/);assert.throws(()=>m.parseArchiveThreadSource("invalid"),/gueltig/);
  assert.throws(()=>m.parseArchiveThreadSource("at://did/x/y",()=>({collection:"other"})),/gueltig/);
  const profile=m.normalizeNetworkProfile({did:" did:one ",handle:" user ",followersCount:"2",viewer:{following:"uri"}},"followers");
  assert.equal(profile.did,"did:one");assert.equal(profile.handle,"user");assert.equal(profile.followersCount,2);assert.equal(profile.followedByViewer,true);assert.equal(profile.followingViewer,true);
  assert.equal(m.normalizeNetworkProfile().did,"");
});

test("shared account avatar cache preserves TTL, reuse, replacement and explicit download failure",async()=>{
  const f=archiveModelsFixture(),factory=f.context.createThreadlineAccountAvatarCache,calls=[];
  const options={now:()=>2000,ttlMs:1000,extension:()=>"png",download:async(...args)=>{calls.push(args);return {type:"image/png",bytes:new Uint8Array([1,2])};}};
  assert.throws(()=>factory(),/download/);for(const name of ["download","extension","now"])assert.throws(()=>factory({...options,[name]:null}),/requires/);
  const service=factory(options);assert.equal(Object.isFrozen(service),true);
  const asset={did:"did:own",url:"https://avatar.test",path:"old.png",cachedAt:1000,bytes:[1],type:"image/png"};
  assert.equal(service.prune({assets:[asset]}).assets.length,1);assert.equal(service.prune({assets:[{...asset,cachedAt:999}]}).assets.length,0);assert.equal(service.normalize(null).length,0);
  const account={did:"did:own",handle:"own.test",avatar:"https://avatar.test"};
  const reused=await service.cache(account,[asset]);assert.equal(reused.account.avatarPath,"old.png");assert.equal(calls.length,0);
  const changed=await service.cache({...account,avatar:"https://new.test"},[asset],{cache:true});assert.equal(changed.assets.length,1);assert.equal(changed.assets[0].cachedAt,2000);assert.equal(changed.account.avatarPath,"account-avatars/own.test.png");assert.equal(calls.length,1);
  const missing=await service.cache({did:""},[asset]);assert.equal(missing.account.avatarPath,"");assert.equal(calls.length,1);
  const failure=Error("offline"),failed=factory({...options,download:async()=>{throw failure;}});await assert.rejects(failed.cache(account),error=>error===failure);
});

test("transport collections preserve map order, bound concurrency and reject nonprogressing chunk sizes",async()=>{
  const m=archiveModelsFixture().context.ThreadlineWorkerCollections;assert.equal(Object.isFrozen(m),true);
  let active=0,maximum=0;const result=await m.mapWithConcurrency([1,2,3,4],2,async value=>{active++;maximum=Math.max(active,maximum);await Promise.resolve();active--;return value*2;});
  assert.deepEqual(plain(result),[2,4,6,8]);assert.equal(maximum,2);assert.deepEqual(plain(await m.mapWithConcurrency(null,2,null)),[]);
  await assert.rejects(m.mapWithConcurrency([1],2,async()=>{throw Error("failed");}),/failed/);
  assert.deepEqual(plain(m.chunkEntries([1,2,3],2)),[[1,2],[3]]);assert.deepEqual(plain(m.chunkEntries([],2)),[]);
  for(const size of [0,-1,NaN,1.5])assert.throws(()=>m.chunkEntries([1],size),/positive integer/);
});

test("asset record models keep MIME extensions and replace SVG with explicit safe bytes",()=>{
  const m=archiveModelsFixture().context.ThreadlineRecordModels;
  for(const [type,extension] of [["video/mp4","mp4"],["video/webm","webm"],["image/png","png"],["image/svg+xml","svg"],["unknown","jpg"]])assert.equal(m.getAssetExtensionFromMimeType(type),extension);
  const image=m.normalizeArchiveImageBlob({type:"image/png",bytes:[1,2]},{type:"safe",base64:"fixture"},()=>{throw Error("not needed");});assert.equal(image.replacedSvg,false);assert.deepEqual(Array.from(image.bytes),[1,2]);
  let input;const svg=m.normalizeArchiveImageBlob({type:"image/svg+xml",bytes:[3]},{type:"image/png",base64:"fixture"},value=>{input=value;return new Uint8Array([9]);});
  assert.equal(input,"fixture");assert.equal(svg.type,"image/png");assert.equal(svg.replacedSvg,true);assert.deepEqual(Array.from(svg.bytes),[9]);
});
