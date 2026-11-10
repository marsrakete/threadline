"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");
/** Creates deterministic network operations. @returns {object} Service, options, queued responses and traces. */
function fixture() {
  const f = archiveModelsFixture(), calls = [], queue = [], progress = [];
  const options = {
    request: async (...args) => { calls.push(args); const response = queue.shift(); if (response instanceof Error) { throw response; } return response; },
    base: () => "https://pds.test/xrpc", profile: vm.runInContext("normalizeNetworkProfile", f.context),
    parseUri: vm.runInContext("parseAtUri", f.context), now: () => Date.parse("2026-11-06T00:00:00Z"),
    limits: { likeSample: 2, activitySample: 3 }, windows: [14, 60], messages: f.context.ThreadlineAdapterMessages,
  };
  const factory = f.context.createThreadlineNetworkDataService;
  return { factory, options, service: factory(options), calls, queue, progress };
}
const auth = { session: { did: "self", accessJwt: "fixture" } };
/** Creates a feed entry. @param {string} uri - Post URI. @param {string} did - Author. @returns {object} Feed item. */
function post(uri, did = "actor") { return { post: { uri, author: { did }, record: { createdAt: "2026-11-01T00:00:00Z" }, likeCount: 2 } }; }
test("network data constructor validates dependencies, limits and windows", () => {
  const f = fixture(); assert.throws(() => f.factory(), /requires/);
  for (const name of ["request", "base", "profile", "parseUri", "now"]) { assert.throws(() => f.factory({ ...f.options, [name]: null }), /requires/); }
  for (const likeSample of [0, -1, NaN, "2"]) { assert.throws(() => f.factory({ ...f.options, limits: { ...f.options.limits, likeSample } }), /positive/); }
  for (const windows of [null, [], [0], [Infinity]]) { assert.throws(() => f.factory({ ...f.options, windows }), /positive/); }
  assert.equal(Object.isFrozen(f.service), true);
  assert.deepEqual(Object.keys(f.service), ["posts", "likesOnPosts", "activityStats", "likes", "activity", "page", "wave", "recordDate", "dates"]);
});
test("recent posts retain owner filtering, cursor paging, sample bounds and authentication", async () => {
  const f = fixture(); f.queue.push({ feed: [post("wrong", "other"), post("one")], cursor: "next" }, { feed: [post("two"), post("three")] });
  const result = await f.service.posts(auth, "actor"); assert.deepEqual(plain(result.map(p => p.uri)), ["one", "two"]);
  assert.equal(f.calls[1][1].cursor, "next"); assert.equal(f.calls[1][1].limit, 1); assert.equal(f.calls[0][2].headers.authorization, "Bearer fixture"); assert.equal(f.calls[0][2].base, "https://pds.test/xrpc");
  f.queue.push({ feed: null, cursor: "unused" }); assert.deepEqual(plain(await f.service.posts(auth, "actor")), []);
  assert.deepEqual(plain(await f.service.posts(auth, "actor", 0)), []);
  f.queue.push(Error("network")); await assert.rejects(f.service.posts(auth, "actor"), /network/);
});
test("notification likes deduplicate subjects and stop after processing an old page", async () => {
  const f = fixture(), liked = uri => ({reason:"like", author:{did:"actor"}, reasonSubject:uri, indexedAt:"2026-11-02T00:00:00Z"});
  f.queue.push({ notifications: [liked("one"), liked("one"), { ...liked("two"), author:{did:"other"} }], cursor:"next" }, { notifications: [{indexedAt:"2020-01-01"}, liked("two")], cursor:"stop" });
  assert.equal(await f.service.likesOnPosts(auth, "actor", [{uri:"one",createdAt:"2026-11-01"},{uri:"two",createdAt:"2026-11-01"},{uri:"three"}]), 2); assert.equal(f.calls.length, 2);
  assert.equal(await f.service.likesOnPosts(auth, "", [{uri:"one"}]), 0); assert.equal(await f.service.likesOnPosts(auth, "actor", []), 0);
});
test("notifications enforce the eight-page cap and malformed data ends paging", async () => {
  const f = fixture(); for (let i=0;i<9;i++) { f.queue.push({notifications:[{reason:"reply"}],cursor:"more"}); }
  assert.equal(await f.service.likesOnPosts(auth, "actor", [{uri:"one"}]), 0); assert.equal(f.calls.length, 8);
  f.queue.length = 0; f.queue.push({notifications:null,cursor:"more"}); assert.equal(await f.service.likesOnPosts(auth, "actor", [{uri:"one"}]), 0); assert.equal(f.calls.length, 9);
});
test("activity includes window boundaries, ignores invalid dates and retains future posts", () => {
  const f = fixture(), now = f.options.now(), day=86400000;
  const result = f.service.activityStats([{createdAt:new Date(now-14*day).toISOString(),likeCount:3},{createdAt:new Date(now-60*day).toISOString(),likeCount:4},{createdAt:new Date(now+day).toISOString(),likeCount:2},{createdAt:"invalid",likeCount:99}]);
  assert.deepEqual(plain(result.windows), {14:{postsCount:2,likesReceivedCount:5},60:{postsCount:3,likesReceivedCount:9}}); assert.equal(result.samplePosts,4); assert.equal(result.latestPostAt,new Date(now+day).toISOString());
  assert.equal(f.service.activityStats().latestPostAt, ""); assert.throws(() => f.service.activityStats(null));
});
test("like and activity orchestration preserve sampling and result counts", async () => {
  const f = fixture(), entry = post("actor-one"); entry.post.viewer={like:"at://like"};
  f.queue.push({feed:[entry]}, {feed:[post("own-one","self")]}, {notifications:[{reason:"like",author:{did:"actor"},reasonSubject:"own-one"}]});
  assert.deepEqual(plain(await f.service.likes(auth,"actor")),{samplePerAccount:2,totalSample:2,actorPostsSampled:1,ownPostsSampled:1,youLikeCount:1,likesYouCount:1,mutualLikesCount:2});
  f.queue.push({feed:[post("one")]}); assert.equal((await f.service.activity(auth,"actor")).samplePosts,1); assert.equal(f.calls.at(-1)[1].limit,3);
});
test("graph pages normalize profiles and waves preserve cursors, limits and progress", async () => {
  const f = fixture(); f.queue.push({followers:[{did:"one",handle:"one.test"},{}],cursor:"next"},{followers:[{did:"two"}],cursor:"remaining"});
  const result=await f.service.wave(auth,"app.bsky.graph.getFollowers","actor","",2,"followers",value=>f.progress.push(value),"first");
  assert.deepEqual(plain(result.profiles.map(p=>p.did)),["one","two"]); assert.equal(result.cursor,"remaining"); assert.equal(f.calls[1][1].limit,1); assert.equal(f.progress[1].percent,30); assert.equal(f.progress[1].detail,"2/2 geladen · Seite 2");
  f.queue.push({follows:null}); assert.deepEqual(plain(await f.service.page(auth,"app.bsky.graph.getFollows","actor","",100,"following")),{profiles:[],cursor:""});
});
test("graph wave keeps the initial request for a zero target and propagates observer failures", async () => {
  const f=fixture(); f.queue.push({follows:[]}); await f.service.wave(auth,"getFollows","actor","",0,"following",()=>{},"step"); assert.equal(f.calls[0][1].limit,1);
  f.queue.push({follows:[]}); await assert.rejects(f.service.wave(auth,"getFollows","actor","",1,"following",()=>{throw Error("observer");},"step"),/observer/);
});
test("relationship dates retain record routing, parallel requests and invalid URI behavior", async () => {
  const f=fixture(); assert.equal(await f.service.recordDate(auth,"invalid"),""); assert.equal(f.calls.length,0);
  f.queue.push({value:{createdAt:" first "}},{value:{createdAt:" second "}});
  assert.deepEqual(plain(await f.service.dates(auth,{following:"at://did:plc:a/app.bsky.graph.follow/a",followedBy:"at://did:plc:b/app.bsky.graph.follow/b"})),{youFollowSince:"first",followsYouSince:"second"});
  assert.equal(Object.hasOwn(f.calls[0][2],"base"),false); assert.equal(f.calls[0][1].repo,"did:plc:a");
  assert.deepEqual(plain(await f.service.dates(auth,{following:true})),{youFollowSince:"",followsYouSince:""});
  f.queue.push(Error("record failed")); await assert.rejects(f.service.dates(auth,{following:"at://did:plc:a/app.bsky.graph.follow/a"}),/record failed/);
});
