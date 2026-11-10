"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");
/** Creates workspace operations with deterministic data adapters. @returns {object} Factory, service, options, state and traces. */
function fixture() {
  const f=archiveModelsFixture(), calls=[], progress=[];
  const auth={handle:"own.test",avatar:"own.png",session:{did:"self",accessJwt:"fixture"}};
  const data={profile:{did:"self",handle:"own.test",viewer:{following:"at://follow"}},waves:[{profiles:[{did:"one"}],cursor:"next"},{profiles:[{did:"two"}],cursor:""}],graphs:[],failure:""};
  /** Records an adapter call and returns its controlled value. @param {string} name - Adapter. @param {unknown} value - Result. @param {Array} args - Arguments. @returns {unknown} Value. */
  function invoke(name,value,args){calls.push([name,...args]);if(data.failure===name){throw Error(name+" failed");}return value;}
  const options={session:async()=>invoke("session",auth,[]),request:async(...args)=>invoke("request",data.profile,args),base:()=>"https://pds.test/xrpc",profile:vm.runInContext("normalizeNetworkProfile",f.context),
    wave:async(...args)=>invoke("wave",data.waves.shift(),args),page:async(...args)=>invoke("page",{profiles:[{did:"preview"}]},args),graph:async(...args)=>invoke("graph",data.graphs.shift()||[],args),
    dates:async(...args)=>invoke("dates",{youFollowSince:"date",followsYouSince:""},args),activity:async(...args)=>invoke("activity",{samplePosts:3},args),likes:async(...args)=>invoke("likes",{mutualLikesCount:2},args),
    limits:{activitySample:200,likeSample:100},messages:f.context.ThreadlineAdapterMessages};
  const factory=f.context.createThreadlineNetworkWorkspaceService;
  return {factory,service:factory(options),options,data,calls,progress,auth,notify:value=>progress.push(value)};
}
test("workspace validates every adapter and sample limit and freezes its API",()=>{
 const f=fixture();assert.throws(()=>f.factory(),/requires/);
 for(const name of ["session","request","base","profile","wave","page","graph","dates","activity","likes"]){assert.throws(()=>f.factory({...f.options,[name]:null}),/requires/);}
 for(const name of ["activitySample","likeSample"]){for(const value of [0,-1,NaN,"1"]){assert.throws(()=>f.factory({...f.options,limits:{...f.options.limits,[name]:value}}),/positive/);}}
 assert.equal(Object.isFrozen(f.service),true);assert.deepEqual(Object.keys(f.service),["merge","slice","focus","mutuals"]);
});
test("profile merging retains nonempty metadata, numeric fallbacks and cumulative relations",()=>{
 const f=fixture(), before={did:"one",handle:"old",displayName:"Old",avatar:"old.png",followersCount:5,followingViewer:true};
 const merged=f.service.merge(before,{did:"one",handle:"",avatar:"",followersCount:0,postsCount:"3",followedByViewer:true});
 assert.equal(merged.avatar,"old.png");assert.equal(merged.followersCount,5);assert.equal(merged.postsCount,3);assert.equal(merged.followingViewer,true);assert.equal(merged.followedByViewer,true);assert.equal(before.postsCount,undefined);
 assert.equal(f.service.merge(null,{did:"one",followingViewer:"true"}).followingViewer,false);assert.throws(()=>f.service.merge(null,null));
});
test("slice preserves actor defaults, wave order, cursor labels, limits and viewer relationships",async()=>{
 const f=fixture(),result=await f.service.slice({followerCursor:"old",limit:1},f.notify);
 assert.deepEqual(f.calls.map(c=>c[0]),["session","request","wave","wave"]);
 assert.equal(f.calls[1][1],"app.bsky.actor.getProfile");assert.equal(f.calls[1][3].base,"https://pds.test/xrpc");assert.equal(f.calls[1][3].headers.authorization,"Bearer fixture");
 assert.equal(f.calls[2][3],"self");assert.equal(f.calls[2][5],100);assert.equal(f.calls[2][8],"Nächste Follower-Welle");assert.equal(f.calls[3][8],"Erste Following-Welle");
 assert.equal(result.viewer.followingViewer,true);assert.equal(result.hasMoreFollowers,true);assert.equal(result.hasMoreFollows,false);assert.deepEqual(plain(result.wave),{followers:1,follows:1});assert.equal(f.progress.at(-1).detail,"1 Follower · 1 Following");
});
test("slice tolerates profile failure and preserves the existing external-actor fallback",async()=>{
 const f=fixture();f.data.failure="request";const result=await f.service.slice({actor:" other ",limit:999},f.notify);
 assert.equal(result.viewer.did,"other");assert.equal(result.viewer.handle,"own.test");assert.equal(result.viewer.followingViewer,true);assert.equal(f.calls[2][5],500);
 const g=fixture();const external=await g.service.slice({actor:"other"});assert.equal(external.viewer.followingViewer,false);
});
test("focus rejects blank actors before auth and preserves sequential data/progress contracts",async()=>{
 const f=fixture();await assert.rejects(f.service.focus({actor:" "}),/Kein Account/);assert.equal(f.calls.length,0);
 const result=await f.service.focus({actor:" actor "},f.notify);
 assert.deepEqual(f.calls.map(c=>c[0]),["session","request","dates","page","page","activity","likes"]);assert.equal(f.calls[1][2].actor,"actor");assert.equal(f.calls[3][5],12);assert.equal(f.calls[4][5],12);
 assert.deepEqual(f.progress.map(p=>p.percent),[16,32,48,78,86,90]);assert.equal(result.likeStats.mutualLikesCount,2);assert.equal(result.relationshipDates.youFollowSince,"date");
});
test("focus tolerates missing viewer metadata but propagates each required adapter failure",async()=>{
 const f=fixture();f.data.profile={did:"actor",viewer:null};await f.service.focus({actor:"actor"});assert.deepEqual(plain(f.calls[2][2]),{});
 for(const failure of ["session","request","dates","page","activity","likes"]){const g=fixture();g.data.failure=failure;await assert.rejects(g.service.focus({actor:"actor"}),new RegExp(failure+" failed"));}
});
test("mutuals short-circuit invalid/equal actors without authentication",async()=>{
 for(const input of [undefined,{}, {centerActor:"a"},{centerActor:" a ",focusActor:"a"}]){const f=fixture();assert.deepEqual(plain(await f.service.mutuals(input,f.notify)),{commonDids:[],commonProfiles:[]});assert.equal(f.calls.length,0);assert.equal(f.progress.length,0);}
});
test("mutuals intersect all four graphs, merge duplicates and retain center-follower order",async()=>{
 const f=fixture();f.data.graphs=[[{did:"b",handle:"bee",followersCount:4},{did:"a",handle:"aye"},{did:"b",avatar:"b.png"},{}],[{did:"a"},{did:"b",followersCount:0}],[{did:"a"},{did:"b"},{did:"c"}],[{did:"b"},{did:"a"}]];
 const result=await f.service.mutuals({centerActor:" center ",focusActor:" focus "},f.notify);
 assert.deepEqual(plain(result.commonDids),["b","a"]);assert.equal(result.commonProfiles[0].avatar,"b.png");assert.equal(result.commonProfiles[0].followersCount,4);
 assert.deepEqual(f.calls.filter(c=>c[0]==="graph").map(c=>[c[3],c[4],c[8]]),[["center","followers",18],["center","following",36],["focus","followers",54],["focus","following",72]]);
 assert.equal(f.progress.at(-1).detail,"2 gemeinsame Mutuals gefunden");
});
test("workspace propagates graph and progress observer failures",async()=>{
 const f=fixture();f.data.failure="graph";await assert.rejects(f.service.mutuals({centerActor:"a",focusActor:"b"}),/graph failed/);
 const g=fixture();g.data.failure="wave";await assert.rejects(g.service.slice(),/wave failed/);
 const h=fixture();await assert.rejects(h.service.slice({},()=>{throw Error("observer");}),/observer/);assert.deepEqual(h.calls.map(c=>c[0]),["session"]);
});
