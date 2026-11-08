"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const {archiveModelsFixture,plain}=require("./worker-archive-models-fixtures.cjs");
/** Creates a deterministic image store with event-driven IDB transactions. @returns {object} Service, options, records and transaction traces. */
function fixture(){
 const f=archiveModelsFixture(),records=new Map(),transactions=[],calls=[],conversions=[],values={draft:null,settings:null};
 const control={auto:true,openFailure:null};
 const database={transaction(name,mode){
  const tx={name,mode,requests:[],objectStore(){return {
   get(id){const request={result:records.get(id)};tx.requests.push(request);calls.push(["get",id]);if(control.auto)queueMicrotask(()=>request.onsuccess?.());return request;},
   put(entry){calls.push(["put",entry]);records.set(entry.id,entry);return {};},
   delete(id){calls.push(["delete",id]);records.delete(id);return {};},
   getAllKeys(){const request={result:[...records.keys()]};tx.requests.push(request);if(control.auto)queueMicrotask(()=>request.onsuccess?.());return request;},
  };}};
  transactions.push(tx);if(control.auto&&mode==="readwrite")queueMicrotask(()=>tx.oncomplete?.());return tx;
 }};
 const options={open:async()=>{if(control.openFailure)throw control.openFailure;return database;},normalizeSegments:vm.runInContext("normalizeSegmentImages",f.context),normalizeMetadata:vm.runInContext("normalizeSegmentImageMetadata",f.context),normalizeImage:vm.runInContext("normalizeThreadImage",f.context),
  toBlob:async url=>{conversions.push(["blob",url]);if(url==="bad")throw Error("decode");return new Blob(["abc"],{type:"image/png"});},toDataUrl:async blob=>{conversions.push(["url",blob]);return "data:image/png;base64,YWJj";},readValue:async key=>values[key],blob:Blob,now:()=>"2026-11-06T00:00:00.000Z",storeName:"composer-images",draftKey:"draft",settingsKey:"settings",messages:f.context.ThreadlineAdapterMessages};
 const factory=f.context.createThreadlineComposerImageStore;
 return {factory,service:factory(options),options,records,transactions,calls,conversions,values,control};
}
const image={id:"one",dataUrl:"data:image/png;base64,YWJj",type:"image/png",originalSizeBytes:3};
/** Allows an async operation to open its transaction. @returns {Promise<void>} Microtask completion. */
async function opened(){await Promise.resolve();await Promise.resolve();}
test("image store validates adapters and freezes its API",()=>{
 const f=fixture();assert.throws(()=>f.factory(),/requires/);
 for(const name of ["open","normalizeSegments","normalizeMetadata","normalizeImage","toBlob","toDataUrl","readValue","blob","now"]){assert.throws(()=>f.factory({...f.options,[name]:null}),/requires/);}
 assert.equal(Object.isFrozen(f.service),true);assert.deepEqual(Object.keys(f.service),["read","put","list","delete","ids","store","hydrate","prune"]);
});
test("empty and malformed ID/write inputs skip database access",async()=>{
 const f=fixture();for(const input of [undefined,null,[],"bad"]){assert.equal((await f.service.read(input)).size,0);await f.service.delete(input);await f.service.put(input);}
 assert.equal(f.transactions.length,0);assert.deepEqual(plain(await f.service.store(null)),[]);
});
test("read normalizes unique IDs and resolves on the final request success",async()=>{
 const f=fixture();f.control.auto=false;f.records.set("one",{id:"one"});let settled=false;
 const pending=f.service.read(["one","one",null,0,"missing"]).then(value=>{settled=true;return value;});await opened();const tx=f.transactions[0];assert.equal(tx.mode,"readonly");assert.equal(tx.name,"composer-images");assert.equal(tx.requests.length,2);
 tx.requests[0].onsuccess();await opened();assert.equal(settled,false);tx.requests[1].onsuccess();const result=await pending;assert.equal(result.size,1);assert.equal(result.get("one").id,"one");
});
test("write/delete wait for transaction completion and list uses request success",async()=>{
 const f=fixture();f.control.auto=false;let settled=false;const pending=f.service.put([{id:"one"}]).then(()=>{settled=true;});await opened();await opened();assert.equal(settled,false);f.transactions[0].oncomplete();await pending;
 const listing=f.service.list();await opened();f.transactions[1].requests[0].onsuccess();assert.deepEqual(plain(await listing),["one"]);
 const deleting=f.service.delete(["one","one"]);await opened();assert.equal(f.calls.filter(c=>c[0]==="delete").length,1);f.transactions[2].oncomplete();await deleting;
});
test("IDB errors preserve supplied errors and existing fallback messages",async()=>{
 for(const [method,event] of [["read","onerror"],["read","onabort"],["put","onerror"],["put","onabort"],["delete","onerror"],["delete","onabort"]]){
  const f=fixture();f.control.auto=false;const pending=f.service[method](["one"]);await opened();const tx=f.transactions[0],error=Error("idb");tx.error=error;tx[event]();await assert.rejects(pending,e=>e===error);
 }
 const f=fixture();f.control.auto=false;const pending=f.service.read(["one"]);await opened();f.transactions[0].requests[0].onerror();await assert.rejects(pending,/Bilddaten konnten nicht gelesen/);
 const g=fixture();g.control.auto=false;const list=g.service.list();await opened();const error=Error("keys");g.transactions[0].requests[0].error=error;g.transactions[0].requests[0].onerror();await assert.rejects(list,e=>e===error);
 const h=fixture();h.control.openFailure=Error("open");await assert.rejects(h.service.store([[image]]),/open/);
});
test("store reuses matching Blobs and replaces size/type mismatches",async()=>{
 const f=fixture();const normalized=await f.service.store([[image]]);assert.equal(normalized[0][0].id,"one");assert.equal(f.records.get("one").blob.size,3);assert.equal(f.records.get("one").updatedAt,f.options.now());
 await f.service.store([[image]]);assert.equal(f.conversions.length,1);
 f.records.get("one").sizeBytes=4;await f.service.store([[image]]);assert.equal(f.conversions.length,2);
 f.records.get("one").type="image/jpeg";await f.service.store([[image]]);assert.equal(f.conversions.length,3);
 await f.service.store([[{...image,originalSizeBytes:0}]]);assert.equal(f.conversions.length,3);
 await assert.rejects(f.service.store([[{...image,id:"bad",dataUrl:"bad"}]]),/decode/);
});
test("hydrate retains inline priority, restores blobs and drops missing data",async()=>{
 const f=fixture();f.records.set("one",{id:"one",blob:new Blob(["abc"])});
 const result=await f.service.hydrate([[{id:"one",alt:"saved"},{id:"missing"},{...image,dataUrl:"inline"}],[]]);
 assert.equal(result[0].length,2);assert.equal(result[0][0].dataUrl,"data:image/png;base64,YWJj");assert.equal(result[0][0].alt,"saved");assert.equal(result[0][1].dataUrl,"inline");assert.equal(result[1].length,0);
 assert.deepEqual(plain(await f.service.hydrate(null)),[]);
});
test("ids and prune retain the union of draft and settings references",async()=>{
 const f=fixture();f.values.draft={segmentImages:[[{id:"draft"}]]};f.values.settings={segmentImages:[[{id:"settings"},{id:"draft"}]]};
 for(const id of ["draft","settings","stale"]){f.records.set(id,{id});}
 assert.deepEqual([...f.service.ids(f.values.settings.segmentImages)],["settings","draft"]);await f.service.prune();assert.deepEqual([...f.records.keys()],["draft","settings"]);
 f.values.draft=null;f.values.settings=null;await f.service.prune();assert.equal(f.records.size,0);
});
