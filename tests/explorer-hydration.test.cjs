"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {importProjectModule}=require("./module-test-helpers.cjs");

/** Creates a deterministic lazy-observer workspace without browser globals.
 * @returns {Promise<object>} Controller and observable observer/card state.
 */
async function lazyFixture() {
  const {createThreadExplorerLazyHydrationController}=await importProjectModule("js/tools/thread-explorer-hydration.js");
  const state={forced:false,selected:"selected",hydrated:[],observers:[],cards:[]};
  const root={viewport:true};
  const options={getRoot:()=>root,getStage:()=>({querySelectorAll:()=>state.cards}),isForced:()=>state.forced,
    getSelectedUri:()=>state.selected,hydrate:card=>state.hydrated.push(card),
    createObserver(callback,config){
      const observer={callback,config,observed:[],unobserved:[],disconnected:false,
        observe(card){this.observed.push(card);},unobserve(card){this.unobserved.push(card);},disconnect(){this.disconnected=true;}};
      state.observers.push(observer);return observer;
    }};
  return {state,root,options,create:createThreadExplorerLazyHydrationController,controller:createThreadExplorerLazyHydrationController(options)};
}

/** Creates a minimal pending card with observable CSS classes.
 * @returns {object} Card model.
 */
function cardFixture(){const classes=new Set();return {dataset:{},classList:{add:value=>classes.add(value)},classes};}

test("lazy hydration shares one observer and hydrates intersecting cards only",async()=>{
  const f=await lazyFixture();const a=cardFixture(),b=cardFixture();const post={uri:"a"};
  f.controller.prepare(a,post);f.controller.prepare(b,{uri:"b"});
  assert.equal(a._threadExplorerPost,post);assert.equal(a.classes.has("is-awaiting-content"),true);
  assert.equal(f.state.observers.length,1);const observer=f.state.observers[0];
  assert.deepEqual(observer.config,{root:f.root,rootMargin:"900px",threshold:0});
  observer.callback([{target:a,isIntersecting:false},{target:b,isIntersecting:true}]);
  assert.deepEqual(f.state.hydrated,[b]);assert.deepEqual(observer.unobserved,[b]);
});

test("lazy hydration immediately handles selected, forced and unsupported-browser cards",async()=>{
  const f=await lazyFixture();const a=cardFixture(),b=cardFixture(),c=cardFixture();
  f.controller.prepare(a,{uri:"selected"});f.state.forced=true;f.controller.prepare(b,{uri:"other"});
  const fallback=f.create({...f.options,createObserver:null});f.state.forced=false;fallback.prepare(c,{uri:"fallback"});
  assert.deepEqual(f.state.hydrated,[a,b,c]);assert.equal(f.state.observers.length,0);
  f.state.cards=[a,b];f.controller.hydrateVisible();assert.equal(f.state.hydrated.length,3);
  f.state.forced=true;f.controller.hydrateVisible();assert.equal(f.state.hydrated.length,5);
});

test("lazy observer reset invalidates queued callbacks and preserves the replacement observer",async()=>{
  const f=await lazyFixture();const a=cardFixture(),b=cardFixture();
  f.controller.prepare(a,{uri:"a"});const old=f.state.observers[0];f.controller.reset();
  assert.equal(old.disconnected,true);old.callback([{target:a,isIntersecting:true}]);
  f.controller.prepare(b,{uri:"b"});old.callback([{target:a,isIntersecting:true}]);
  const current=f.state.observers[1];current.callback([{target:b,isIntersecting:true}]);
  assert.deepEqual(f.state.hydrated,[b]);assert.deepEqual(current.unobserved,[b]);assert.deepEqual(old.unobserved,[]);
});

test("lazy hydration ignores absent and deleted-anchor cards",async()=>{
  const f=await lazyFixture();const card=cardFixture();
  f.controller.prepare(null);f.controller.prepare(card,{isDeletedThreadAnchor:true});f.controller.reset();
  assert.equal(f.state.observers.length,0);assert.equal(card._threadExplorerPost,undefined);assert.equal(card.classes.size,0);
});

/** Creates shared transport, translation and abort adapters for snapshot hydration tests.
 * @returns {object} Options and observable calls/results.
 */
function transportFixture(){
  const state={requests:[],progress:[],applied:[],errors:[],translations:[],checks:0,result:null};
  const options={signal:null,throwIfAborted(signal){state.checks++;if(signal?.aborted)throw signal.reason;},
    translate(key,values){state.translations.push({key,values});return key;},onProgress:value=>state.progress.push(value),
    onError:error=>state.errors.push(error),applyAvatars:(root,avatars)=>state.applied.push({root,avatars}),onMedia:media=>state.applied.push(media),
    request:async(...args)=>{state.requests.push(args);return state.result;}};
  return {state,options};
}

test("avatar hydration preserves worker payload, timeout, progress range and result identity",async()=>{
  const {hydrateThreadExplorerAvatars:hydrate}=await importProjectModule("js/tools/thread-explorer-hydration.js");
  const f=transportFixture();const root={post:{uri:"root"}},avatars={did:"data:image/png;base64,AA=="};
  f.options.request=async(type,payload,requestOptions)=>{
    f.state.requests.push([type,payload,requestOptions]);
    requestOptions.onProgress({phase:"other",total:2,current:1});
    requestOptions.onProgress({phase:"thread_explorer_avatars",total:2,current:1,remaining:1,hydrated:"1",skipped:0});
    return {avatars};
  };
  await hydrate(root,f.options);const [type,payload,config]=f.state.requests[0];
  assert.equal(type,"HYDRATE_THREAD_EXPLORER_AVATARS");assert.equal(payload.root,root);assert.equal(config.timeoutMs,120000);
  assert.equal(f.state.progress.length,1);assert.equal(f.state.progress[0].percent,11);
  assert.equal(f.state.applied[0].avatars,avatars);assert.equal(f.state.applied[0].root,root);
  assert.deepEqual(f.state.translations[1].values,{current:1,total:2,remaining:1,hydrated:1,skipped:0});
});

test("avatar hydration handles missing roots, zero counters and invalid results",async()=>{
  const {hydrateThreadExplorerAvatars:hydrate}=await importProjectModule("js/tools/thread-explorer-hydration.js");
  const f=transportFixture();await hydrate(null,f.options);assert.equal(f.state.requests.length,0);
  f.options.request=async(type,payload,config)=>{config.onProgress({phase:"thread_explorer_avatars",total:-1,current:-2,remaining:"bad"});return {avatars:"invalid"};};
  await hydrate({},f.options);assert.equal(f.state.progress[0].percent,5);assert.equal(f.state.applied.length,0);
  assert.equal(f.state.translations[1].values.current,0);
});

test("avatar hydration propagates cancellation and reports optional transport failures",async()=>{
  const {hydrateThreadExplorerAvatars:hydrate}=await importProjectModule("js/tools/thread-explorer-hydration.js");
  const f=transportFixture();const abort=new DOMException("cancelled","AbortError");
  f.options.signal={aborted:true,reason:abort};await assert.rejects(hydrate({},f.options),error=>error===abort);
  assert.equal(f.state.requests.length,0);f.options.signal=null;
  f.options.request=async()=>{throw abort;};await assert.rejects(hydrate({},f.options),error=>error===abort);
  const failure=new Error("offline");f.options.request=async()=>{throw failure;};await hydrate({},f.options);
  assert.deepEqual(f.state.errors,[failure]);assert.deepEqual(f.state.applied,[]);
});

test("snapshot media hydration preserves worker options, progress range and cached media identity",async()=>{
  const {hydrateThreadExplorerSnapshotMedia:hydrate}=await importProjectModule("js/tools/thread-explorer-media-hydration.js");
  const f=transportFixture();const root={post:{uri:"root"}},media={source:"data:image/png;base64,AA=="};
  f.options.request=async(currentRoot,config)=>{
    f.state.requests.push([currentRoot,config]);config.onProgress({phase:"other"});
    config.onProgress({phase:"thread_explorer_media",total:3,current:2,remaining:1,hydrated:"2",cacheHits:1,downloaded:1,concurrency:4});return {media};
  };
  await hydrate(root,f.options);assert.equal(f.state.requests[0][0],root);assert.equal(f.state.requests[0][1].timeoutMs,420000);
  assert.equal(f.state.progress.length,1);assert.equal(f.state.progress[0].percent,24);assert.equal(f.state.applied[0],media);
  assert.deepEqual(f.state.translations[1].values,{current:2,total:3,remaining:1,hydrated:2,skipped:0,cacheHits:1,downloaded:1,concurrency:4});
});

test("snapshot media hydration handles missing roots, zero totals and empty responses",async()=>{
  const {hydrateThreadExplorerSnapshotMedia:hydrate}=await importProjectModule("js/tools/thread-explorer-media-hydration.js");
  const f=transportFixture();await hydrate(null,f.options);assert.equal(f.state.requests.length,0);
  f.options.request=async(root,config)=>{config.onProgress({phase:"thread_explorer_media",total:0,current:-3});return null;};
  await hydrate({},f.options);assert.equal(f.state.progress[0].percent,18);assert.equal(f.state.applied.length,0);
  assert.equal(f.state.translations[1].values.current,0);
});

test("snapshot media hydration propagates aborts and tolerates optional image transport errors",async()=>{
  const {hydrateThreadExplorerSnapshotMedia:hydrate}=await importProjectModule("js/tools/thread-explorer-media-hydration.js");
  const f=transportFixture();const abort=new DOMException("cancelled","AbortError");
  f.options.signal={aborted:true,reason:abort};await assert.rejects(hydrate({},f.options),error=>error===abort);
  f.options.signal=null;f.options.request=async()=>{throw abort;};await assert.rejects(hydrate({},f.options),error=>error===abort);
  const failure=new Error("offline");f.options.request=async()=>{throw failure;};await hydrate({},f.options);
  assert.deepEqual(f.state.errors,[failure]);assert.equal(f.state.applied.length,0);
});
