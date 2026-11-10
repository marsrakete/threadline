"use strict";
const assert=require("node:assert/strict");const test=require("node:test");
const {importProjectModule}=require("./module-test-helpers.cjs");

/** Creates one optional view preference using an in-memory storage adapter.
 * @returns {Promise<object>} Preference, mutable storage and normalized mode factory.
 */
async function viewPreferenceFixture(){
  const {createThreadExplorerViewPreference}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const tools=await importProjectModule("js/tools/thread-explorer.js");const state={raw:null,blocked:false};
  const options={key:"orientation",normalize:tools.normalizeThreadExplorerOrientation,fallback:"vertical",getStorage(){if(state.blocked)throw Error("denied");return {
    setItem(key,value){assert.equal(key,options.key);state.raw=value;},getItem(){return state.raw;}};}};
  return {state,options,create:createThreadExplorerViewPreference,preference:createThreadExplorerViewPreference(options),tools};
}

test("Explorer view preference stores and reads normalized orientation",async()=>{
  const f=await viewPreferenceFixture();f.preference.save("horizontal");assert.equal(f.state.raw,"horizontal");assert.equal(f.preference.read(),"horizontal");
  f.state.raw=" horizontal ";assert.equal(f.preference.read(),"horizontal");f.preference.save("invalid");assert.equal(f.preference.read(),"vertical");
});

test("Explorer view preference retains defaults for missing data and blocked storage",async()=>{
  const f=await viewPreferenceFixture();assert.equal(f.preference.read(),"vertical");f.state.blocked=true;
  assert.doesNotThrow(()=>f.preference.save("horizontal"));assert.equal(f.preference.read(),"vertical");
});

test("Explorer view preference reuses the same contract for reply-cluster mode",async()=>{
  const f=await viewPreferenceFixture();const mode=f.create({...f.options,key:"view",normalize:f.tools.normalizeThreadExplorerViewMode,fallback:"tree",getStorage:()=>({getItem:()=>f.state.raw,setItem:(key,value)=>{assert.equal(key,"view");f.state.raw=value;}})});
  mode.save("reply-cluster");assert.equal(mode.read(),"reply-cluster");mode.save(null);assert.equal(mode.read(),"tree");
});

test("saved-search dialog context configures search versus archive/explorer fields",async()=>{
  const {configureSavedSearchesDialog:configure}=await importProjectModule("js/tools/thread-explorer-rendering.js");
  const options={note:{},urlField:{},actions:{},input:{value:"old"},translate:key=>key};
  assert.equal(configure("search",options),"search");assert.equal(options.urlField.hidden,true);assert.equal(options.actions.hidden,true);assert.equal(options.input.value,"");
  assert.equal(options.note.textContent,"savedSearchesSearchNote");assert.equal(configure("archive",options),"archive");assert.equal(options.urlField.hidden,false);
  assert.equal(configure("unknown",{input:{},translate:key=>key}),"threadExplorer");
});

/** Creates deterministic selection preferences with observable storage and account/source inputs.
 * @returns {Promise<object>} Preferences, raw storage and mutable context.
 */
async function selectionStorageFixture(){
  const {createThreadExplorerSelectionPreferences}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const state={account:"one",source:"follows",raw:null,accesses:0,blocked:false};
  const preferences=createThreadExplorerSelectionPreferences({key:"selection",getStorage(){state.accesses++;if(state.blocked)throw Error("denied");return {
    setItem(key,value){assert.equal(key,"selection");state.raw=value;},getItem(){return state.raw;},removeItem(){state.raw=null;}};},
    getAccount:()=>state.account,getSource:()=>state.source,normalizeSource:value=>value||"follows",now:()=>"2026-10-20T10:00:00.000Z"});
  return {preferences,state};
}

test("Explorer selection preferences retain storage schema, normalized URI and timestamp",async()=>{
  const f=await selectionStorageFixture();f.preferences.save(" post ");
  assert.deepEqual(JSON.parse(f.state.raw),{accountDid:"one",source:"follows",selectedUri:"post",updatedAt:"2026-10-20T10:00:00.000Z"});
  assert.deepEqual(f.preferences.read(),{source:"follows",selectedUri:"post"});f.preferences.clear();assert.equal(f.preferences.read(),null);
});

test("Explorer selection preferences reject another account and retain stored source recovery",async()=>{
  const f=await selectionStorageFixture();f.state.source="followers";f.preferences.save("post");f.state.source="follows";
  assert.equal(f.preferences.read().source,"followers");f.state.account="two";assert.equal(f.preferences.read(),null);
  f.state.account="";assert.equal(f.preferences.read().selectedUri,"post");
  f.state.raw=JSON.stringify({selectedUri:" anonymous ",source:"mutuals"});f.state.account="two";assert.equal(f.preferences.read().selectedUri,"anonymous");
});

test("Explorer selection preferences ignore empty selections and malformed stored data",async()=>{
  const f=await selectionStorageFixture();f.preferences.save("");assert.equal(f.state.accesses,0);
  for(const raw of ["", "broken", "null", "[]", '{}', '{"selectedUri":" "}']){f.state.raw=raw;assert.equal(f.preferences.read(),null);}
});

test("Explorer selection preferences tolerate blocked storage in all operations",async()=>{
  const f=await selectionStorageFixture();f.state.blocked=true;assert.doesNotThrow(()=>f.preferences.save("post"));
  assert.doesNotThrow(()=>f.preferences.clear());assert.equal(f.preferences.read(),null);assert.equal(f.state.raw,null);
});

test("Explorer favorite model builds deterministic search fields with the original trimming rules",async()=>{
  const {buildThreadExplorerFavoriteModel:build}=await importProjectModule("js/tools/thread-explorer.js");
  const post={uri:" post ",author:{handle:" handle "},createdAt:" date "};
  const adapters={trimFields:true,getActorLabel:()=>"Author",getPreviewText:()=>"Preview",getWebApp:()=>"https://bsky.app",now:()=>"now"};
  assert.deepEqual(build(post,adapters),{rootUri:"post",selectedUri:"post",authorHandle:"handle",authorName:"Author",text:"Preview",createdAt:"date",savedAt:"now",webApp:"https://bsky.app"});
  assert.equal(post.uri," post ");
});

test("Explorer favorite model retains thread selection, untrimmed fields and indexed-date fallback",async()=>{
  const {buildThreadExplorerFavoriteModel:build}=await importProjectModule("js/tools/thread-explorer.js");
  const post={uri:"root",author:{handle:" handle "},indexedAt:" indexed "};
  const adapters={selectedUri:"reply",getActorLabel:()=>"Author",getPreviewText:()=>"Preview",getWebApp:()=>"web",now:()=>"now"};
  const result=build(post,adapters);assert.equal(result.selectedUri,"reply");assert.equal(result.authorHandle," handle ");assert.equal(result.createdAt," indexed ");
  assert.equal(build(post,{...adapters,selectedUri:""}).selectedUri,"root");
});

test("Explorer favorite model skips absent/invalid identities without evaluating content adapters",async()=>{
  const {buildThreadExplorerFavoriteModel:build}=await importProjectModule("js/tools/thread-explorer.js");
  const options={trimFields:true,now:()=>{throw Error("Unexpected clock");}};
  for(const post of [null,undefined,{}, {uri:" "}])assert.equal(build(post,options),null);
});

test("Explorer tree lookup finds root, nested replies and direct parent without copying",async()=>{
  const {findThreadExplorerTreeNode:find,findThreadExplorerParentNode:parent}=await importProjectModule("js/tools/thread-explorer.js");
  const leaf={post:{uri:"leaf"}},child={post:{uri:"child"},replies:[leaf]},root={post:{uri:"root"},replies:[child]};
  assert.equal(find(root," root "),root);assert.equal(find(root,"leaf"),leaf);assert.equal(parent(root,"leaf"),child);assert.equal(parent(root,"child"),root);
  assert.equal(parent(root,"root"),null);assert.equal(child.replies[0],leaf);
});

test("Explorer tree lookup ignores empty/unknown identities and absent nodes",async()=>{
  const {findThreadExplorerTreeNode:find,findThreadExplorerParentNode:parent}=await importProjectModule("js/tools/thread-explorer.js");
  for(const helper of [find,parent]){assert.equal(helper(null,"root"),null);assert.equal(helper({},""),null);assert.equal(helper({post:{uri:"root"}},"missing"),null);}
});

test("Explorer tree lookup tolerates missing/nonarray branches and null reply entries",async()=>{
  const {findThreadExplorerTreeNode:find,findThreadExplorerParentNode:parent}=await importProjectModule("js/tools/thread-explorer.js");
  const tree={post:{uri:"root"},replies:[null,{}, {post:{uri:"leaf"},replies:"invalid"}]};
  assert.equal(find(tree,"leaf"),tree.replies[2]);assert.equal(parent(tree,"leaf"),tree);
  assert.equal(find({replies:"invalid"},"missing"),null);assert.equal(parent(tree,"unknown"),null);
});

test("Explorer feed merge retains first identities and supports root-based grouping",async()=>{
  const {appendThreadExplorerFeedItems:merge}=await importProjectModule("js/tools/thread-explorer.js");
  const first={post:{uri:"one",rootUri:"root"}},second={post:{uri:"two",rootUri:"root"}},replacement={post:{uri:"one",text:"later"}};
  assert.deepEqual(merge([first],[replacement,second]),[first,second]);
  assert.deepEqual(merge([first],[second],{groupByRoot:true}),[first]);assert.equal(merge([first],[replacement])[0],first);
});

test("Explorer feed merge skips absent URIs and accepts empty or invalid collections",async()=>{
  const {appendThreadExplorerFeedItems:merge}=await importProjectModule("js/tools/thread-explorer.js");
  assert.deepEqual(merge(null,undefined),[]);assert.deepEqual(merge([null,{}, {post:{uri:" "}}],[]),[]);
  const item={post:{uri:" one "}};assert.deepEqual(merge("invalid",[item,{post:{uri:"one"}}]),[item]);
});

test("Explorer feed date sorting is stable and keeps created/indexed/zero fallback",async()=>{
  const {getThreadExplorerFeedItemSortTimestamp:timestamp,sortThreadExplorerFeedItemsByDate:sort}=await importProjectModule("js/tools/thread-explorer.js");
  const a={post:{createdAt:"2026-10-19"}},b={post:{createdAt:"bad",indexedAt:"2026-10-19"}},c={post:{createdAt:"2026-10-18"}},d={post:{createdAt:"bad"}};
  const items=[c,a,b,d];assert.deepEqual(sort(items),[a,b,c,d]);assert.deepEqual(items,[c,a,b,d]);
  assert.equal(timestamp(b),Date.parse("2026-10-19"));assert.equal(timestamp(null),0);assert.equal(timestamp({post:{createdAt:"1970-01-01"}}),0);
  assert.deepEqual(sort(null),[]);
});

test("Explorer selection prioritizes the current exact URI without reading storage",async()=>{
  const {resolveThreadExplorerSelection:select}=await importProjectModule("js/tools/thread-explorer.js");
  let reads=0;const options={items:[{post:{uri:"one"}},{post:{uri:"two"}}],currentUri:" two ",readStoredSelection:()=>{reads++;return {selectedUri:"one"};}};
  assert.equal(select(options),"two");assert.equal(reads,0);
  assert.equal(select({...options,currentUri:"on"}),"one");assert.equal(reads,1);
});

test("Explorer selection respects stored/outside-feed rules and preserves stored URI data",async()=>{
  const {resolveThreadExplorerSelection:select}=await importProjectModule("js/tools/thread-explorer.js");
  const options={items:[{post:{uri:"first"}},{post:{uri:"stored"}}],readStoredSelection:()=>({selectedUri:" stored "})};
  assert.equal(select(options)," stored ");assert.equal(select({...options,currentUri:"outside"})," stored ");
  assert.equal(select({...options,currentUri:"outside",allowStoredOutsideFeed:true}),"outside");
  assert.equal(select({...options,items:[],allowStoredOutsideFeed:true})," stored ");
});

test("Explorer selection retains first-item fallback and handles absent input data",async()=>{
  const {resolveThreadExplorerSelection:select}=await importProjectModule("js/tools/thread-explorer.js");
  const options={items:[{post:{uri:"first"}}],currentUri:"missing",readStoredSelection:()=>({selectedUri:"not-in-feed"})};
  assert.equal(select(options),"first");assert.equal(select({...options,items:[null,{post:{uri:"later"}}]}),"");
  assert.equal(select({...options,items:null,readStoredSelection:()=>null}),"");
});

test("Explorer favorites normalization retains format, limits, first occurrence and literal text",async()=>{
  const {normalizeThreadExplorerFavorites:normalize}=await importProjectModule("js/tools/thread-explorer.js");
  const first={rootUri:" root ",authorName:" <b>Name</b> ",text:"x".repeat(300)};
  const list=normalize([null,first,{rootUri:"root",text:"duplicate"},{uri:"alias"}]);
  assert.equal(list.length,2);assert.equal(list[0].rootUri,"root");assert.equal(list[0].selectedUri,"root");assert.equal(list[0].text.length,260);
  assert.equal(list[0].authorName,"<b>Name</b>");assert.equal(list[1].rootUri,"alias");assert.deepEqual(normalize(null),[]);
  assert.equal(normalize(Array.from({length:101},(_,i)=>({rootUri:String(i)}))).length,100);
});

/** Creates the shared favorites storage controller with deterministic persistence.
 * @returns {Promise<object>} Controller, mutable favorites and persistence observations.
 */
async function favoritesFixture(){
  const {createThreadExplorerFavoritesController}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const {normalizeThreadExplorerFavorites}=await importProjectModule("js/tools/thread-explorer.js");
  const state={favorites:[{rootUri:"one"},{rootUri:"two"}],persisted:[],failure:null};
  const controller=createThreadExplorerFavoritesController({getFavorites:()=>state.favorites,setFavorites:value=>{state.favorites=value;},normalize:normalizeThreadExplorerFavorites,
    persist:async()=>{if(state.failure)throw state.failure;state.persisted.push(state.favorites.map(entry=>entry.rootUri));}});
  return {controller,state};
}

test("Explorer favorite save replaces the existing root first and persists the updated state",async()=>{
  const f=await favoritesFixture();assert.equal(await f.controller.save({rootUri:"two",text:"new"}),true);
  assert.deepEqual(f.state.persisted,[["two","one"]]);assert.equal(f.state.favorites[0].text,"new");
  assert.equal(await f.controller.save(null),false);assert.equal(await f.controller.save({}),false);assert.equal(f.state.persisted.length,1);
});

test("Explorer favorite removal trims the URI and ignores empty requests",async()=>{
  const f=await favoritesFixture();assert.equal(await f.controller.remove(" one "),true);
  assert.deepEqual(f.state.persisted,[["two"]]);assert.equal(await f.controller.remove(""),false);
  assert.equal(await f.controller.remove("unknown"),true);assert.equal(f.state.persisted.length,2);
});

test("Explorer favorites propagate persistence failures after updating the in-memory state",async()=>{
  const f=await favoritesFixture();const error=new Error("storage failed");f.state.failure=error;
  await assert.rejects(f.controller.save({rootUri:"three"}),value=>value===error);assert.equal(f.state.favorites[0].rootUri,"three");
  await assert.rejects(f.controller.remove("three"),value=>value===error);assert.equal(f.state.favorites.some(entry=>entry.rootUri==="three"),false);
});

/** Creates an account-scoped feed loader with deferred transport replies.
 * @returns {Promise<object>} Loader, state and pending requests.
 */
async function feedFixture(){
  const {createThreadExplorerFeedSourcesController}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const state={feeds:[],loaded:false,loading:false,accountDid:""};const pending=[],errors=[];let account="one";let renders=0;
  const controller=createThreadExplorerFeedSourcesController({state,getAccount:()=>account,
    request:(type,payload,options)=>new Promise((resolve,reject)=>pending.push({type,payload,options,resolve,reject})),
    render:()=>{renders++;},onError:error=>errors.push(error)});
  return {controller,state,pending,errors,setAccount(value){account=value;},getRenders:()=>renders};
}

test("Explorer feed sources load once per account and skip duplicate/unauthenticated requests",async()=>{
  const f=await feedFixture();f.setAccount("");await f.controller.load();assert.equal(f.pending.length,0);
  f.setAccount("one");const run=f.controller.load();await f.controller.load();assert.equal(f.pending.length,1);
  assert.equal(f.pending[0].type,"LOAD_THREAD_EXPLORER_FEED_SOURCES");assert.equal(f.pending[0].options.timeoutMs,60000);
  f.pending[0].resolve({feeds:[{uri:"feed-one"}]});await run;await f.controller.load();
  assert.equal(f.state.accountDid,"one");assert.equal(f.state.loaded,true);assert.equal(f.state.loading,false);assert.equal(f.pending.length,1);
});

test("Explorer feed sources ignore old-account replies while a replacement remains loading",async()=>{
  const f=await feedFixture();const first=f.controller.load();f.setAccount("two");const second=f.controller.load();
  f.pending[0].resolve({feeds:[{uri:"old"}]});await first;assert.deepEqual(f.state.feeds,[]);assert.equal(f.state.loading,true);
  f.pending[1].resolve({feeds:[{uri:"new"}]});await second;assert.equal(f.state.feeds[0].uri,"new");assert.equal(f.state.accountDid,"two");
  f.setAccount("three");const third=f.controller.load();f.setAccount("");f.pending[2].resolve({feeds:[{uri:"logged-out"}]});await third;
  assert.deepEqual(f.state.feeds,[]);assert.equal(f.state.loading,false);
});

test("Explorer feed sources preserve best-effort errors and empty/invalid response behavior",async()=>{
  const f=await feedFixture();const run=f.controller.load();const error=new Error("offline");f.pending[0].reject(error);await run;
  assert.deepEqual(f.errors,[error]);assert.equal(f.state.loaded,true);assert.equal(f.state.loading,false);
  await f.controller.load();assert.equal(f.pending.length,1);
  f.setAccount("two");const next=f.controller.load();f.pending[1].resolve({feeds:"invalid"});await next;assert.deepEqual(f.state.feeds,[]);
});

/** Creates gallery fullscreen adapters without invoking browser or OS fullscreen.
 * @returns {Promise<object>} Controller, mutable native state and calls.
 */
async function fullscreenFixture(){
  const {createThreadExplorerGalleryFullscreenController}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const state={ios:false,target:{},native:null,fallback:false,closed:0,steps:[],requests:0,exits:0};
  const controller=createThreadExplorerGalleryFullscreenController({getTarget:()=>state.target,isIos:()=>state.ios,getFullscreenElement:()=>state.native,
    exitFullscreen:async()=>{state.exits++;if(state.exitFailure)throw Error("denied");},applyFallback:value=>{state.fallback=value;},
    isOpen:()=>state.closed===0,closeDialog:()=>{state.closed++;},step:value=>state.steps.push(value)});
  return {controller,state};
}

test("Explorer gallery fullscreen uses visual fallback for iOS and unsupported targets",async()=>{
  const f=await fullscreenFixture();f.state.target=null;await f.controller.open();assert.equal(f.state.fallback,false);
  f.state.target={requestFullscreen:async()=>{f.state.requests++;}};f.state.ios=true;await f.controller.open();
  assert.equal(f.state.fallback,true);assert.equal(f.state.requests,0);
  f.state.ios=false;f.state.target={};await f.controller.open();assert.equal(f.state.fallback,true);
});

test("Explorer gallery fullscreen keeps the native receiver and falls back after rejection",async()=>{
  const f=await fullscreenFixture();f.state.target={async requestFullscreen(){assert.equal(this,f.state.target);f.state.requests++;}};
  await f.controller.open();assert.equal(f.state.requests,1);assert.equal(f.state.fallback,false);
  f.state.target.requestFullscreen=async()=>{throw Error("denied");};await f.controller.open();assert.equal(f.state.fallback,true);
  f.state.native={};await f.controller.close();assert.equal(f.state.exits,1);assert.equal(f.state.closed,0);
});

test("Explorer gallery fullscreen closes fallback before dialog and handles Escape/arrows",async()=>{
  const f=await fullscreenFixture();let prevented=0;const event=key=>({key,preventDefault(){prevented++;}});
  f.controller.setFallback(true);f.controller.keydown(event("Escape"));assert.equal(f.state.fallback,false);
  f.controller.keydown(event("ArrowLeft"));f.controller.keydown(event("ArrowRight"));assert.deepEqual(f.state.steps,[-1,1]);
  f.state.native={};f.state.exitFailure=true;f.controller.setFallback(true);await f.controller.close();assert.equal(f.state.fallback,false);assert.equal(f.state.closed,0);
  f.state.native=null;await f.controller.close();f.controller.keydown(event("ArrowRight"));assert.equal(f.state.closed,1);assert.equal(prevented,3);
});

test("Explorer card pan centers measured cards or uses the default 24px inset",async()=>{
  const {calculateThreadExplorerNodePan:pan}=await importProjectModule("js/tools/thread-explorer-layout.js");
  const state={zoom:1.5,panX:10,panY:20},viewport={left:100,top:50,width:400,height:300},target={left:150,top:150,width:100,height:80};
  assert.deepEqual(pan(state,viewport,target,{block:"center",inline:"center"}),{zoom:1.5,panX:110,panY:30});
  assert.deepEqual(pan(state,viewport,target),{zoom:1.5,panX:-16,panY:-56});assert.equal(state.panX,10);
});

test("Explorer card pan ignores missing or nonfinite measurements",async()=>{
  const {calculateThreadExplorerNodePan:pan}=await importProjectModule("js/tools/thread-explorer-layout.js");
  const state={zoom:1,panX:0,panY:0},rect={left:0,top:0,width:0,height:0};
  assert.equal(pan(null,rect,rect),null);assert.equal(pan(state,null,rect),null);assert.equal(pan(state,rect,null),null);
  assert.equal(pan(state,rect,{...rect,left:NaN}),null);assert.equal(pan({...state,panY:Infinity},rect,rect),null);
  assert.deepEqual(pan(state,rect,rect),{zoom:1,panX:24,panY:24});
});

/** Creates exact-URI focus targets and a real pan-calculation adapter.
 * @returns {Promise<object>} Focus controller, targets and synchronized viewport.
 */
async function focusFixture(){
  const {createThreadExplorerFocusController}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const {calculateThreadExplorerNodePan}=await importProjectModule("js/tools/thread-explorer-layout.js");
  const root={dataset:{uri:"root"},getBoundingClientRect:()=>({left:10,top:20,width:100,height:80})};
  const child={dataset:{uri:"child"},getBoundingClientRect:()=>({left:150,top:150,width:100,height:80})};
  const state={root:"root",selected:"child",cluster:false,viewport:{zoom:1,panX:0,panY:0},renders:0};
  const element={clientWidth:400,clientHeight:300,getBoundingClientRect:()=>({left:0,top:0}),querySelector:()=>root};
  const controller=createThreadExplorerFocusController({isClusterMode:()=>state.cluster,getRootUri:()=>state.root,getSelectedUri:()=>state.selected,
    getViewportElement:()=>element,getStage:()=>({querySelectorAll:()=>[root,child]}),getCard:()=>null,getViewport:()=>state.viewport,
    setViewport:value=>{state.viewport=value;},calculatePan:calculateThreadExplorerNodePan,render:()=>{state.renders++;},renderEdges:()=>{}});
  return {controller,state,root,child};
}

test("Explorer focus resolves exact URIs and synchronizes centered viewport state",async()=>{
  const f=await focusFixture();assert.equal(f.controller.find(" child "),f.child);assert.equal(f.controller.find("chi"),null);
  f.controller.focus();assert.deepEqual(f.state.viewport,{zoom:1,panX:0,panY:-40});assert.equal(f.state.renders,1);
  f.state.selected="root";f.controller.focus();assert.equal(f.state.renders,2);
});

test("Explorer focus handles cluster root fallback, absent identities and null targets",async()=>{
  const f=await focusFixture();f.state.cluster=true;f.state.selected="";f.controller.focus();assert.equal(f.state.renders,1);
  f.state.root="";f.controller.focus();f.controller.root();f.controller.reveal(null);assert.equal(f.state.renders,1);
  f.state.selected="missing";f.controller.focus();assert.equal(f.state.renders,1);
});

/** Creates observable control doubles and normal workspace state.
 * @returns {Promise<object>} Renderer, controls and display state.
 */
async function toolbarFixture(){
  const {renderThreadExplorerControls}=await importProjectModule("js/tools/thread-explorer-rendering.js");
  const nodes={};const elements=new Proxy(nodes,{get(target,key){
    if(!target[key])target[key]={attributes:{},classes:{},focused:false,matches(){return this.focused;},setAttribute(name,value){this.attributes[name]=value;},classList:{toggle(name,value){target[key].classes[name]=value;}}};
    return target[key];
  }});
  const state={authenticated:true,hasTree:true,loadingThread:false,loadingFeed:false,foreignAccount:false,actorFocus:false,
    clusterMode:false,saved:false,accountActor:"own.test",accountMode:"posts",horizontal:false,selectedUri:"post",fullscreen:false,zoom:0.8,source:"follows"};
  const calls=[];const actions={translate:key=>key,renderAccountNote:()=>calls.push("note"),renderFeedSources:()=>calls.push("feeds")};
  return {elements,state,calls,render:()=>renderThreadExplorerControls(elements,state,actions)};
}

test("Explorer toolbar renders normal availability, labels and accessibility state",async()=>{
  const f=await toolbarFixture();f.render();
  assert.equal(f.elements.threadExplorerSnapshotPngButton.disabled,false);assert.equal(f.elements.threadExplorerZoomResetButton.textContent,"80%");
  assert.equal(f.elements.threadExplorerViewModeButton.textContent,"threadExplorerReplyClusterButton");
  assert.equal(f.elements.threadExplorerFullscreenButton.attributes["aria-pressed"],"false");
  assert.deepEqual(f.calls,["note","feeds"]);
});

test("Explorer toolbar retains focused account input and applies foreign, cluster and saved modes",async()=>{
  const f=await toolbarFixture();f.elements.threadExplorerAccountInput.focused=true;f.elements.threadExplorerAccountInput.value="editing";
  Object.assign(f.state,{foreignAccount:true,actorFocus:true,clusterMode:true,saved:true,horizontal:true,fullscreen:true,source:"invalid"});f.render();
  assert.equal(f.elements.threadExplorerAccountInput.value,"editing");assert.equal(f.elements.threadExplorerSourceField.hidden,true);
  assert.equal(f.elements.threadExplorerOrientationButton.disabled,true);assert.equal(f.elements.threadExplorerCollapseButton.disabled,true);
  assert.equal(f.elements.threadExplorerSaveButton.classes["is-active"],true);assert.equal(f.elements.threadExplorerSourceSelect.value,"follows");
  assert.equal(f.elements.threadExplorerViewModeButton.attributes["aria-pressed"],"true");assert.equal(f.elements.threadExplorerFullscreenCloseButton.hidden,false);
});

test("Explorer toolbar disables actions without authentication/tree and while loading",async()=>{
  const f=await toolbarFixture();Object.assign(f.state,{authenticated:false,hasTree:false,selectedUri:"",loadingFeed:true,loadingThread:true});f.render();
  for(const key of ["threadExplorerUrlButton","threadExplorerRefreshButton","threadExplorerZoomInButton","threadExplorerReloadThreadButton","threadExplorerFavoritesButton"])assert.equal(f.elements[key].disabled,true);
  assert.equal(f.elements.threadExplorerAccountInput.value,"own.test");
});

test("Explorer gallery controller normalizes selection and wraps forward/backward",async()=>{
  const {createThreadExplorerGalleryController}=await importProjectModule("js/tools/thread-explorer.js");let opens=0;
  const gallery=createThreadExplorerGalleryController({elements:{},show:()=>{opens++;}});
  gallery.open([{fullsize:"one",alt:"A"},{fullsize:"two",alt:"B"}],0);assert.equal(gallery.getCurrent().src,"one");
  gallery.step(-1);assert.equal(gallery.getCurrent().src,"two");gallery.step(1);assert.equal(gallery.getCurrent().src,"one");
  assert.equal(opens,1);
});

test("Explorer gallery controller ignores invalid collections and zero steps",async()=>{
  const {createThreadExplorerGalleryController}=await importProjectModule("js/tools/thread-explorer.js");let opens=0;
  const gallery=createThreadExplorerGalleryController({elements:{},show:()=>{opens++;}});
  gallery.open(null,0);gallery.step(1);gallery.render();assert.equal(gallery.getCurrent(),undefined);
  gallery.open([{fullsize:"one"}],99);gallery.step(5);gallery.open([],0);
  assert.equal(gallery.getCurrent().src,"one");assert.equal(opens,1);
});

test("Explorer gallery replacement clamps the starting index and resets collection",async()=>{
  const {createThreadExplorerGalleryController}=await importProjectModule("js/tools/thread-explorer.js");
  const gallery=createThreadExplorerGalleryController({elements:{},show:()=>{}});
  gallery.open([{fullsize:"one"},{fullsize:"two"}],100);assert.equal(gallery.getCurrent().src,"two");
  gallery.step(NaN);gallery.step(0);assert.equal(gallery.getCurrent().src,"two");
  gallery.open([{fullsize:"replacement"}],-10);assert.equal(gallery.getCurrent().src,"replacement");
});

/** Creates deterministic frame/timer queues and interaction flags.
 * @returns {Promise<object>} Scheduler, flags, counters and queue drivers.
 */
async function schedulerFixture(){
  const {createThreadExplorerRenderScheduler}=await importProjectModule("js/tools/thread-explorer-controller.js");
  const frames=new Map(),timers=new Map();let serial=0;const state={cluster:false,drag:false,inertia:false,edges:0,focus:0};
  const scheduler=createThreadExplorerRenderScheduler({isClusterMode:()=>state.cluster,isDragging:()=>state.drag,isInertiaActive:()=>state.inertia,
    requestFrame:callback=>{frames.set(++serial,callback);return serial;},cancelFrame:id=>frames.delete(id),
    setTimeout:(callback,delay)=>{timers.set(++serial,{callback,delay});return serial;},clearTimeout:id=>timers.delete(id),
    renderEdges:()=>{state.edges++;},focusSelected:()=>{state.focus++;}});
  return {scheduler,state,frames,timers,tick(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback();}};
}

test("Explorer edge scheduler coalesces redraws and checks late interaction changes",async()=>{
  const f=await schedulerFixture();f.scheduler.scheduleEdges();f.scheduler.scheduleEdges();assert.equal(f.frames.size,1);
  f.state.drag=true;f.tick();assert.equal(f.state.edges,0);f.state.drag=false;f.scheduler.scheduleEdges();f.tick();assert.equal(f.state.edges,1);
  for(const flag of ["cluster","drag","inertia"]){f.state[flag]=true;f.scheduler.scheduleEdges();assert.equal(f.frames.size,0);f.state[flag]=false;}
});

test("Explorer focus scheduler keeps two frames and the 80ms settling pass",async()=>{
  const f=await schedulerFixture();f.scheduler.scheduleFocus();f.tick();assert.equal(f.state.focus,0);f.tick();assert.equal(f.state.focus,1);
  assert.equal([...f.timers.values()][0].delay,80);[...f.timers.values()][0].callback();assert.equal(f.state.focus,2);
});

test("Explorer focus scheduler replaces frames and cancels stale delayed passes",async()=>{
  const f=await schedulerFixture();f.scheduler.scheduleFocus();f.scheduler.scheduleFocus();assert.equal(f.frames.size,1);
  f.tick();f.tick();assert.equal(f.timers.size,1);f.scheduler.scheduleFocus();assert.equal(f.timers.size,0);
  f.scheduler.cancelFocus();assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.state.focus,1);
});
