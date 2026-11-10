"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm");
const { archiveModelsFixture, plain } = require("./worker-archive-models-fixtures.cjs");
/** Builds lifecycle operations with deterministic state and traces. @returns {object} Operations, state and dependencies. */
function fixture() {
  const f = archiveModelsFixture(), models = vm.runInContext("workerAuthModels", f.context);
  const data = { state: {activeDid:"a", accounts:[{did:"a",identifier:"a.test",appPassword:"secret",session:{did:"a"}},{did:"b",identifier:"b.test",session:{did:"b"}}]}, trace:[], failure:null, readFailure:false };
  const options = {readAuth:async()=>{if(data.readFailure)throw Error("read");return structuredClone(data.state);},writeAuth:async value=>{data.trace.push(["write",structuredClone(value)]);data.state=structuredClone(value);return value;},clearAuth:async()=>{data.trace.push(["clear"]);data.state={activeDid:"",accounts:[]};},ensure:async did=>{data.trace.push(["ensure",did]);if(data.failure)throw data.failure;return data.state.accounts.find(a=>a.did===(did||data.state.activeDid));},upsert:models.upsert,response:models.response,publicMeta:models.publicMeta,webBase:()=>"https://bsky.app",clearArchiveSession:async()=>data.trace.push(["archive"]),clearArchiveCatalog:async()=>data.trace.push(["catalog"]),now:()=>"2026-11-06T00:00:00.000Z",defaultService:"https://bsky.social",messages:f.context.ThreadlineAdapterMessages};
  // Use the real classic model functions, whose public names are stable worker adapters.
  options.upsert=vm.runInContext("upsertAccount",f.context);options.response=vm.runInContext("buildAuthResponse",f.context);options.publicMeta=vm.runInContext("getAccountPublicMeta",f.context);
  const factory=f.context.createThreadlineAccountService;
  let service=factory(options);
  return {service,data,options,factory};
}
test("account service validates dependencies and freezes its public API",()=>{
 const f=fixture();assert.throws(()=>f.factory(),/requires/);
 for(const name of Object.keys(f.options).filter(k=>typeof f.options[k]==="function"))assert.throws(()=>f.factory({...f.options,[name]:null}),/requires/);
 assert.equal(Object.isFrozen(f.service),true);assert.deepEqual(Object.keys(f.service),["status","switch","import","remove","logout","verify"]);
});
test("switch selects a verified account and rejects unknown accounts",async()=>{
 const f=fixture();await f.service.switch({did:"b"});assert.equal(f.data.state.activeDid,"b");assert.equal(f.data.trace[0][0],"ensure");
 await assert.rejects(f.service.switch({did:"missing"}),/nicht gespeichert/);
});
test("switch and verify preserve failure precedence without exposing credentials",async()=>{
 for(const [failure,password,reason] of [[Error("fetch failed"),"","offline"],[Error("invalid login credentials"),"","missing_password"],[Error("invalid login credentials"),"secret","invalid_password"],[Error("other"),"secret","signed_out"]]){
  const f=fixture();f.data.failure=failure;f.data.state.accounts[0].appPassword=password;
  for(const method of ["switch","verify"]){const result=await f.service[method]({did:"a"});assert.equal(result.reason,reason);assert.equal(result.authenticated,false);assert.equal(JSON.stringify(result).includes("secret"),false);}
 }
});
test("metadata import ignores malformed lists and never imports credentials",async()=>{
 const f=fixture();await f.service.import({accounts:null});assert.equal(f.data.state.accounts.length,2);
 await f.service.import({accounts:[null,{}, {did:"c",handle:"c.test",appPassword:"ignored",session:{did:"c"}}]});
 const account=f.data.state.accounts.find(a=>a.did==="c");assert.equal(account.appPassword,"");assert.equal(account.session,null);assert.equal(account.updatedAt,f.options.now());assert.equal(f.data.state.activeDid,"a");
});
test("remove selects the first remaining session even when removing an inactive account",async()=>{
 const f=fixture();f.data.state.activeDid="b";await f.service.remove({did:"missing"});assert.equal(f.data.state.activeDid,"a");
 await f.service.remove({did:"a"});assert.equal(f.data.state.activeDid,"b");
});
test("logout preserves passwords and clears archives only for the active target",async()=>{
 const f=fixture();await f.service.logout({did:"b"});assert.equal(f.data.state.activeDid,"a");assert.equal(f.data.trace.length,1);
 await f.service.logout();assert.equal(f.data.state.activeDid,"");assert.equal(f.data.state.accounts[0].appPassword,"secret");assert.equal(f.data.state.accounts[0].session,null);assert.deepEqual(f.data.trace.slice(-2),[["archive"],["catalog"]]);
});
test("removing the final account clears storage and verify tolerates unreadable storage",async()=>{
 const f=fixture();f.data.state.accounts.splice(1);await f.service.remove({did:"a"});assert.deepEqual(f.data.trace,[["clear"]]);
 f.data.failure=Error("fetch failed");f.data.readFailure=true;const result=await f.service.verify();assert.equal(result.reason,"offline");assert.equal(result.authenticated,false);
});

test("authentication status delegates to account ownership and exposes only public metadata",async()=>{
  const f=fixture(),result=await f.service.status();assert.equal(result.authenticated,true);assert.equal(result.did,"a");assert.equal(JSON.stringify(result).includes("secret"),false);
  f.data.state.accounts[0].session=null;assert.deepEqual(plain(await f.service.status()),{authenticated:false});
  f.data.readFailure=true;await assert.rejects(f.service.status(),/read/);
});
