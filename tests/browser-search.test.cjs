"use strict";
const { cacheVersion } = require("../version.json");
const { test, expect } = require("@playwright/test");
test.use({ serviceWorkers: "block" });

for (const pathname of ["/", "/tools.html"]) {
  test(`classic publishing and interactions preserve uploads, gates and partial errors from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/publishing-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async()=>{try{
        const did="did:plc:fixture",calls=[],progress=[];let postCount=0,failSecond=false;
        fetch=async(url,settings={})=>{const parsed=new URL(url);
          if(parsed.pathname.endsWith("uploadBlob")){calls.push({endpoint:"upload",size:settings.body.size});return new Response(JSON.stringify({blob:{ref:{$link:"blobcid"},mimeType:"image/png",size:settings.body.size}}));}
          const body=JSON.parse(settings.body||"{}");calls.push({endpoint:parsed.pathname,body,authorization:settings.headers?.authorization});
          if(parsed.pathname.endsWith("createRecord")){if(body.collection==="app.bsky.feed.post"){postCount++;if(failSecond&&postCount===2)return new Response(JSON.stringify({message:"fixture failure"}),{status:503});}return new Response(JSON.stringify({uri:"at://"+did+"/"+body.collection+"/"+(postCount||1),cid:"cid"+(postCount||1)}));}
          if(parsed.pathname.endsWith("deleteRecord"))return new Response("{}");
          throw Error("Unexpected "+url);
        };
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",handle:"own.test",service:"https://bsky.social",session:{did,handle:"own.test",accessJwt:"fixture"}}]});
        const image={blob:new Blob(["image"],{type:"image/png"}),alt:"alt",width:2,height:2};
        const published=await publishThread({segments:[{text:"#tag https://example.test",images:[image]},{text:"gallery",images:Array(5).fill(image)}],langs:["de-DE"],postInteraction:{replyMode:"nobody",quotePostsAllowed:false}},value=>progress.push(value));
        const liked=await likePost({uri:published.posts[0].uri,cid:published.posts[0].cid}),unliked=await unlikePost({likeUri:liked.uri});
        const completedCalls=calls.slice();postCount=0;failSecond=true;let partial;
        try{await publishThread({segments:["one","two"]});}catch(error){partial={message:error.message,details:error.details};}
        self.postMessage({published,liked,unliked,completedCalls,partial,progress,frozen:Object.isFrozen(getWorkerPublishService())&&Object.isFrozen(getWorkerInteractionService()),cached:["publish-service","interaction-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker("/publishing-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);expect(result.published.posts).toHaveLength(2);
    const writes=result.completedCalls.filter(call=>call.body?.collection==="app.bsky.feed.post");expect(writes[0].body.record.embed.$type).toBe("app.bsky.embed.images");expect(writes[1].body.record.embed.$type).toBe("app.bsky.embed.gallery");expect(writes[1].body.record.reply.root).toEqual(result.published.posts[0]);expect(writes[0].body.record.facets).toHaveLength(2);expect(writes[0].body.record.langs).toEqual(["de"]);
    expect(result.completedCalls.filter(call=>call.endpoint==="upload")).toHaveLength(6);expect(result.completedCalls.filter(call=>call.body?.collection==="app.bsky.feed.threadgate")).toHaveLength(2);expect(result.completedCalls.filter(call=>call.body?.collection==="app.bsky.feed.postgate")).toHaveLength(2);expect(result.unliked.uri).toBe(result.liked.uri);expect(result.partial.details).toMatchObject({code:"PARTIAL_PUBLISH",postedCount:1,totalCount:2,status:503});expect(errors).toEqual([]);
  });
  test(`classic reply and edit checks preserve target selection and threadgate behavior from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/post-check-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async()=>{try{
        const did="did:plc:fixture",other="did:plc:other",prefix="at://"+other+"/app.bsky.feed.post/",url=prefix+"entry",calls=[];let gate="open";
        const post=(key,author,date)=>({uri:key==="entry"?url:"at://"+author+"/app.bsky.feed.post/"+key,cid:key+"cid",author:{did:author,handle:"own.test"},record:{text:key,createdAt:date}});
        const entry=post("entry",other,"2026-01-01"),own=()=>{const value=post("latest",did,"2026-11-08");if(gate!=="open")value.threadgate={record:{allow:gate==="blocked"?[]:[{$type:"app.bsky.feed.threadgate#listRule"}]}};return value;};
        fetch=async(url,settings={})=>{const parsed=new URL(url);calls.push({endpoint:parsed.pathname,authorization:settings.headers?.authorization});
          if(parsed.hostname==="plc.directory")return new Response(JSON.stringify({service:[{type:"AtprotoPersonalDataServer",serviceEndpoint:"https://actor.pds.test"}]}));
          if(parsed.pathname.endsWith("getPosts"))return new Response(JSON.stringify({posts:[entry]}));
          if(parsed.pathname.endsWith("getPostThread"))return new Response(JSON.stringify({thread:{post:entry,replies:[{post:own()}]}}));
          if(parsed.pathname.endsWith("getRecord"))return new Response(JSON.stringify({cid:"editcid",value:{$type:"app.bsky.feed.post",text:"new",originalText:"old",updatedAt:"2026-11-08",createdAt:"2026-01-01"}}));
          throw Error("Unexpected "+url);
        };
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",service:"https://bsky.social",session:{did,accessJwt:"fixture"}}]});
        const reply=await checkReplyTarget({url,mode:"thread"});gate="list";const warning=await checkReplyTarget({url,mode:"thread"});gate="blocked";let blocked="";try{await checkReplyTarget({url,mode:"thread"});}catch(error){blocked=error.message;}
        const edit=await checkPostEditMetadata({url});let invalidCode="";try{await checkPostEditMetadata({url:"bad"});}catch(error){invalidCode=error.details.code;}
        self.postMessage({reply,warning,blocked,edit,invalidCode,calls,frozen:Object.isFrozen(getWorkerPostCheckService())&&Object.isFrozen(workerReplyModels),cached:["reply-models","post-check-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker("/post-check-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);expect(result.reply.threadLength).toBe(2);expect(result.reply.replyParent.uri).toContain("/latest");expect(result.reply.targetPost.uri).toContain("/entry");expect(result.warning.replyHint).toContain("Listen");expect(result.blocked).toContain("keine Antworten");expect(result.edit).toMatchObject({actorDid:"did:plc:other",originalText:"old",text:"new",isEdited:true});expect(result.invalidCode).toBe("POST_EDIT_URL_INVALID");expect(result.calls.find(call=>call.endpoint.endsWith("getRecord")).authorization).toBeUndefined();expect(errors).toEqual([]);
  });
  test(`classic settings and drafts retain patch rules and restore after reload from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/settings-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async event=>{try{
        if(event.data.action==="save"){
          await writeStoredValue(DRAFT_KEY,"legacy text");await writeStoredValue(LOCALE_KEY,"de");
          const legacy=await getAppState({browserLocale:"en"});
          await saveDraft({draft:"saved text",segmentImages:[],segmentOverrides:[" keep "],replyTarget:{mode:"thread",sourceUrl:"https://example.test/post"}});
          await saveSettings({localePreference:"fr",themeMode:"dark",compactMode:true,tipsVisible:false,altTextRequired:false,desktopLayoutVersion:4,hashtags:["#One","#Two"],selectedHashtags:["one"],savedSearches:[{id:"saved",q:"query"}],threadExplorerState:{actor:"@@own.test",accountMode:"replies"},customField:"retained",segmentLinkCards:[{url:"https://example.test",title:"card"}]});
          await saveSettings({themeMode:"invalid",compactMode:false,desktopLayoutVersion:null});
          self.postMessage({legacy,state:await getAppState({browserLocale:"en"}),stored:await readStoredValue(SETTINGS_KEY),frozen:Object.isFrozen(getWorkerSettingsService())&&Object.isFrozen(workerSettingsModels),cached:["settings-models","settings-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
        }else self.postMessage({state:await getAppState({browserLocale:"en"}),stored:await readStoredValue(SETTINGS_KEY)});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const run=action=>page.evaluate(action=>new Promise((resolve,reject)=>{const worker=new Worker("/settings-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({action});}),action);
    const saved=await run("save");expect(saved.error).toBeUndefined();expect(saved.frozen).toBe(true);expect(saved.cached).toBe(true);expect(saved.legacy.draft).toBe("legacy text");expect(saved.legacy.locale).toBe("de");
    expect(saved.state).toMatchObject({draft:"saved text",locale:"fr",themeMode:"dark",compactMode:true,tipsVisible:false,altTextRequired:true,desktopLayoutVersion:0,selectedHashtags:["one"],segmentOverrides:[" keep "],threadExplorerState:{actor:"own.test",accountMode:"replies"}});expect(saved.state.replyTarget.mode).toBe("thread");expect(saved.stored.customField).toBe("retained");
    await page.reload({waitUntil:"domcontentloaded"});const restored=await run("load");expect(restored.error).toBeUndefined();expect(restored.state).toEqual(saved.state);expect(restored.stored.savedSearches).toEqual([{id:"saved",q:"query"}]);expect(errors).toEqual([]);
  });
  test(`classic rich-text and mention callers preserve Unicode facets and account search from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/richtext-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async()=>{try{
        const did="did:plc:fixture",calls=[];
        fetch=async(url,settings={})=>{const parsed=new URL(url);calls.push({url:String(url),authorization:settings.headers?.authorization});
          if(parsed.pathname.endsWith("resolveHandle")){const handle=parsed.searchParams.get("handle");if(handle==="missing.test")return new Response("missing",{status:404});return new Response(JSON.stringify({did:"did:plc:own"}));}
          if(parsed.pathname.endsWith("searchActorsTypeahead")){const q=parsed.searchParams.get("q");if(q.includes("bsky.social"))return new Response("temporary",{status:503});return new Response(JSON.stringify({actors:[{did:"did:plc:other",handle:"other.test"},{did:"did:plc:own",handle:"own.test"},{did:"did:plc:own",handle:"duplicate.test"}]}));}
          throw Error("Unexpected "+url);
        };
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",service:"https://bsky.social",session:{did,accessJwt:"fixture"}}]});
        const auth=await ensureSession(),rich=await buildRichTextFacets("😀 @own.test #Grüße https://example.test",auth,new Map());
        const missing=await buildRichTextFacets("@missing.test @missing.test",auth,new Map()),search=await searchMentionActors({query:"own"});
        await clearStoredAuth();const preview=await resolveComposerMentions({handles:["@Own.Test","own.test","missing.test"]});
        self.postMessage({rich,missing,search,preview,calls,tags:parseHashtagFacets("#Grüße"),frozen:Object.isFrozen(getWorkerRichTextService())&&Object.isFrozen(workerRichTextModels),cached:["richtext-models","richtext-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker("/richtext-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);
    expect(result.rich.facets.map(facet=>facet.features[0].$type)).toEqual(["app.bsky.richtext.facet#mention","app.bsky.richtext.facet#tag","app.bsky.richtext.facet#link"]);expect(result.rich.facets[0].index.byteStart).toBe(5);
    expect(result.missing.unresolvedHandles).toEqual(["missing.test"]);expect(result.search.actors.map(actor=>actor.handle)).toEqual(["own.test","other.test"]);
    expect(result.preview.mentions).toEqual([{handle:"own.test",did:"did:plc:own"},{handle:"missing.test",did:null}]);expect(result.tags[0].features[0].tag).toBe("Grüße");expect(errors).toEqual([]);
  });
  test(`classic reaction loading and media scan use extracted units from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/reactions-media-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async()=>{try{
        const did="did:plc:fixture",uri="at://"+did+"/app.bsky.feed.post/key",calls=[],progress=[];
        const actors=[{did:"did:actor",handle:"first.test"},{did:"did:actor",handle:"duplicate.test"},{handle:"handle.test"},{}];
        fetch=async(url,settings={})=>{const parsed=new URL(url);calls.push({endpoint:parsed.pathname,authorization:settings.headers?.authorization,cid:parsed.searchParams.get("cid")});
          if(parsed.pathname.endsWith("getLikes"))return new Response(JSON.stringify({likes:actors.map(actor=>({actor})),cursor:" next "}));
          if(parsed.pathname.endsWith("getRepostedBy"))return new Response(JSON.stringify({repostedBy:actors}));
          if(parsed.pathname.endsWith("getQuotes"))return new Response(JSON.stringify({posts:actors.map(author=>({author}))}));
          if(parsed.pathname.endsWith("getAuthorFeed"))return new Response(JSON.stringify({feed:[{post:{uri,cid:"postcid",author:{did,handle:"own.test"},record:{text:"media",createdAt:"2026-11-07T01:02:03Z",embed:{images:[{image:{ref:{$link:"imagecid"},mimeType:"image/png"},alt:"image"}],video:{ref:{$link:"videocid"},mimeType:"video/mp4"},external:{uri:"https://example.test",thumb:"https://example.test/thumb",title:"card"}}}}}]}));
          throw Error("Unexpected "+url);
        };
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",handle:"own.test",service:"https://bsky.social",session:{did,accessJwt:"fixture"}}]});
        const likes=await loadThreadExplorerReactions({type:"likes",uri,cid:"postcid"}),reposts=await loadThreadExplorerReactions({type:"reposts",uri}),quotes=await loadThreadExplorerReactions({type:"quotes",uri});
        const scan=await scanAccountMediaExport({},value=>progress.push(value)),filtered=await scanAccountMediaExport({includeImages:false,includeVideos:false});
        self.postMessage({likes,reposts,quotes,scan,filtered,calls,progress,frozen:Object.isFrozen(getWorkerExplorerReactionService())&&Object.isFrozen(getWorkerMediaExportModels()),cached:["explorer-reaction-service","media-export-models"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker("/reactions-media-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);
    for(const key of ["likes","reposts","quotes"])expect(result[key].actors.map(actor=>actor.handle)).toEqual(["first.test","handle.test"]);
    expect(result.likes.cursor).toBe("next");expect(result.calls[0].cid).toBe("postcid");expect(result.calls.every(call=>call.authorization==="Bearer fixture")).toBe(true);
    expect(result.scan.manifest).toMatchObject({postCount:1,mediaCount:3});expect(result.scan.media.map(entry=>entry.kind)).toEqual(["image","video","other"]);
    expect(result.scan.media[0].pathStem).toBe("posts/2026/2026-11/2026-11-07T01-02-03Z__post-key/img-01");expect(result.filtered.media.map(entry=>entry.kind)).toEqual(["other"]);expect(result.progress.at(-1).percent).toBe(100);expect(errors).toEqual([]);
  });
  test(`classic Explorer hydration uses real media and avatar caches and tolerates failed assets from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/explorer-hydration-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async event=>{try{
        const did="did:plc:fixture",base="https://images.fixture.test/",calls=[],progress=[];
        const bytes=Uint8Array.from(atob(event.data.url.split(",")[1]),char=>char.charCodeAt(0));
        fetch=async url=>{calls.push(String(url));if(String(url).endsWith("failed"))return new Response("missing",{status:404});if(String(url).endsWith("svg"))return new Response("<svg></svg>",{headers:{"content-type":"image/svg+xml"}});return new Response(bytes,{headers:{"content-type":"image/png"}});};
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",service:"https://bsky.social",session:{did,accessJwt:"fixture"}}]});
        await writeStoredValue(ACCOUNT_AVATAR_CACHE_KEY,{assets:[]});
        await caches.delete(REMOTE_MEDIA_CACHE_NAME);const cache=await caches.open(REMOTE_MEDIA_CACHE_NAME);
        await cache.put(base+"cached",new Response(bytes,{headers:{"content-type":"image/png"}}));
        const root={post:{author:{did,handle:"own.test",avatar:base+"avatar"},images:[{fullsize:base+"cached",thumb:base+"new"}],externalCard:{thumb:base+"svg"},quoteCard:{author:{did:"did:quote",avatar:base+"failed"},images:[{thumb:base+"failed"}]}}};
        const avatars=await hydrateThreadExplorerAvatars({root},value=>progress.push(value)),stored=await readStoredValue(ACCOUNT_AVATAR_CACHE_KEY),beforeAvatarReuse=calls.length;
        const reusedAvatars=await hydrateThreadExplorerAvatars({root:{post:{author:root.post.author}}}),avatarReused=calls.length===beforeAvatarReuse;
        const media=await hydrateThreadExplorerMedia({root},value=>progress.push(value));
        for(let attempt=0;attempt<50;attempt++){if(await cache.match(base+"new"))break;await new Promise(resolve=>setTimeout(resolve,10));}
        const beforeReuse=calls.length,reusedMedia=await hydrateThreadExplorerMedia({mediaEntries:[{url:base+"cached"},{url:base+"new"}]},value=>progress.push(value));
        self.postMessage({avatars,reusedAvatars,avatarReused,media,reusedMedia,mediaReused:calls.length===beforeReuse,avatarData:bytesToDataUrl(stored.assets[0].bytes,stored.assets[0].type),progress,calls,frozen:Object.isFrozen(getWorkerExplorerHydrationService()),cached:APP_SHELL.includes("./js/worker/explorer-hydration-service.js")});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const canvas=document.createElement("canvas");canvas.width=2;canvas.height=2;canvas.getContext("2d").fillRect(0,0,2,2);const worker=new Worker("/explorer-hydration-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({url:canvas.toDataURL("image/png")});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);expect(result.avatars.avatarCount).toBe(1);expect(result.avatarReused).toBe(true);expect(result.reusedAvatars.avatarCount).toBe(1);
    expect(result.media.mediaCount).toBe(3);expect(result.reusedMedia.mediaCount).toBe(2);expect(result.mediaReused).toBe(true);
    const final=result.progress.filter(value=>value.phase==="thread_explorer_media").at(-1);expect(final.cacheHits).toBe(2);expect(final.downloaded).toBe(0);
    const dimensions=await page.evaluate(urls=>Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=()=>reject(Error("decode"));image.src=url;}))),[result.avatarData,result.media.media["https://images.fixture.test/new"],result.media.media["https://images.fixture.test/svg"]]);
    expect(dimensions[0]).toEqual([2,2]);expect(dimensions[1]).toEqual([2,2]);expect(dimensions[2][0]).toBeGreaterThan(0);expect(errors).toEqual([]);
  });
  test(`classic Thread Explorer models preserve selected paths, missing anchors and embeds from ${pathname}`, async ({ page }) => {
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);
    await page.route("**/explorer-models-harness.js",route=>route.fulfill({contentType:"text/javascript",body:`
      importScripts("/sw.js");
      self.onmessage=async()=>{try{
        const did="did:plc:fixture",prefix="at://"+did+"/app.bsky.feed.post/",calls=[];
        const post=key=>({uri:prefix+key,author:{did,handle:"own.test"},record:{text:key}});
        fetch=async url=>{
          const parsed=new URL(url),uri=parsed.searchParams.get("uri");calls.push({uri,parentHeight:parsed.searchParams.get("parentHeight")});
          if(parsed.pathname.endsWith("getPreferences"))return new Response(JSON.stringify({preferences:[{items:[{uri:"at://"+did+"/app.bsky.feed.generator/pinned",pinned:true}]}]}));
          if(parsed.pathname.endsWith("getFeedGenerator"))return new Response(JSON.stringify({view:{displayName:"Pinned fixture"}}));
          if(parsed.pathname.endsWith("getPosts"))return new Response(JSON.stringify({posts:parsed.searchParams.getAll("uris").map(uri=>({uri}))}));
          if(parsed.pathname.endsWith("getFollows"))return new Response(JSON.stringify({follows:[{did,handle:"own.test",viewer:{followedBy:true}}]}));
          if(parsed.pathname.endsWith("getFollowers"))return new Response(JSON.stringify({followers:[{did,handle:"own.test",viewer:{following:true}}]}));
          if(parsed.pathname.endsWith("getAuthorFeed"))return new Response(JSON.stringify({feed:[{post:post("author")},{post:{...post("reply"),record:{text:"reply",reply:{root:{uri:prefix+"root"}}}}}]}));
          if(parsed.pathname.endsWith("searchPosts"))return new Response(JSON.stringify({posts:[{...post("search-one"),record:{reply:{root:{uri:prefix+"root"}}}},{...post("search-two"),record:{reply:{root:{uri:prefix+"root"}}}}]}));
          if(parsed.pathname.endsWith("getFeed")||parsed.pathname.endsWith("getTimeline"))return new Response(JSON.stringify({feed:[{post:post("timeline")}]}));
          if(!parsed.pathname.endsWith("getPostThread"))throw Error("Unexpected "+url);
          let thread;
          if(uri===prefix+"selected")thread={post:post("selected"),parent:{post:post("root")}};
          else if(uri===prefix+"root")thread={post:post("root"),replies:[{post:post("sibling")}]};
          else thread={post:post("orphan"),parent:{notFound:true,uri:prefix+"deleted"}};
          return new Response(JSON.stringify({thread}));
        };
        await writeStoredAuth({activeDid:did,accounts:[{did,identifier:"own.test",service:"https://bsky.social",session:{did,accessJwt:"fixture"}}]});
        const sources=await loadThreadExplorerFeedSources(),actorFeed=await loadThreadExplorerActorFeed({actor:did,mode:"replies"});
        const timeline=await loadThreadExplorerFeed({source:"timeline"}),generator=await loadThreadExplorerFeed({source:"feed:at://"+did+"/app.bsky.feed.generator/pinned"});
        const search=await loadThreadExplorerFeed({source:"search:saved",search:{q:"fixture"}}),relationship=await loadThreadExplorerFeed({source:"mutuals"});
        const resolved=await resolveThreadExplorerPostUrl({url:prefix+"selected"});
        const selected=await loadThreadExplorerThread({uri:prefix+"selected"}),orphan=await loadThreadExplorerThread({uri:prefix+"orphan"});
        const embedded=normalizeThreadExplorerPost({...post("embed"),record:{text:"current",originalText:"old",updatedAt:"now"},embed:{media:{items:[{image:{fullsize:"https://image.test/full"},alt:"gallery alt"}],video:{}},record:{record:{uri:prefix+"quoted",author:{handle:"quote.test"},value:{text:"quoted"},embeds:[{external:{uri:"https://example.test",title:"card"}}]}}}});
        self.postMessage({sources,actorFeed,timeline,generator,search,relationship,resolved,loadFrozen:Object.isFrozen(getWorkerExplorerLoadService()),loadCached:["explorer-feed-models","explorer-load-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js")),selected,orphan,embedded,calls,contains:threadExplorerTreeContainsUri(selected.root,prefix+"selected"),frozen:Object.isFrozen(workerExplorerModels),cached:APP_SHELL.includes("./js/worker/explorer-models.js")});
      }catch(error){self.postMessage({error:error.message,stack:error.stack});}};
    `}));
    await page.goto(pathname,{waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker("/explorer-models-harness.js");worker.onerror=error=>{worker.terminate();reject(Error(error.message));};worker.onmessage=event=>{worker.terminate();resolve(event.data);};worker.postMessage({});}));
    expect(result.error).toBeUndefined();expect(result.frozen).toBe(true);expect(result.cached).toBe(true);expect(result.contains).toBe(true);
    expect(result.selected.postCount).toBe(3);expect(result.selected.root.replies.map(node=>node.post.text)).toEqual(["sibling","selected"]);
    expect(result.orphan.root.post.isDeletedThreadAnchor).toBe(true);expect(result.orphan.postCount).toBe(1);expect(result.calls.filter(call=>call.parentHeight!==null).map(call=>call.parentHeight)).toEqual(["100","0","100"]);
    expect(result.loadFrozen).toBe(true);expect(result.loadCached).toBe(true);expect(result.sources.feeds[0].displayName).toBe("Pinned fixture");
    expect(result.actorFeed.mode).toBe("replies");expect(result.actorFeed.items.map(item=>item.post.text)).toEqual(["reply"]);
    expect(result.timeline.items).toHaveLength(1);expect(result.generator.items).toHaveLength(1);expect(result.search.items).toHaveLength(1);expect(result.relationship.items[0].post.author.followedByViewer).toBe(true);expect(result.resolved.uri).toBe(result.selected.selectedUri);
    expect(result.embedded.images[0]).toEqual({thumb:"https://image.test/full",fullsize:"https://image.test/full",alt:"gallery alt"});expect(result.embedded.hasVideo).toBe(true);expect(result.embedded.quoteCard.externalCard.title).toBe("card");expect(result.embedded.editInfo.originalText).toBe("old");expect(errors).toEqual([]);
  });
  test(`classic Composer image storage restores persisted blobs and prunes only unused data from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/composer-image-store-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async event=>{
        try {
          const store=getWorkerComposerImageStore();
          if(event.data.action==="save") {
            const image={id:"draft-image",dataUrl:event.data.url,type:"image/png",alt:"draft alt",width:2,height:2,edit:{zoom:2,rotation:-450,fitMode:"cover"},validation:{sizeBytes:3,width:2,height:2,exceedsDimensions:true}};
            await saveDraft({draft:"saved text",segmentImages:[[image]]});
            await saveSettings({segmentImages:[[{...image,id:"settings-image",alt:"settings alt"}]]});
            await store.put([{id:"orphan",blob:new Blob(["unused"])}]);
            await pruneComposerImageBlobs();
            const draft=await readStoredValue(DRAFT_KEY),settings=await readStoredValue(SETTINGS_KEY),records=await store.read(["draft-image","settings-image"]);
            self.postMessage({ids:await store.list(),draft,settings,blobs:[...records.values()].every(record=>record.blob instanceof Blob),frozen:Object.isFrozen(store),cached:APP_SHELL.includes("./js/worker/composer-image-store.js")&&APP_SHELL.includes("./js/worker/composer-image-models.js"),modelsFrozen:Object.isFrozen(workerComposerImageModels)});
          } else {
            const restored=await getAppState({browserLocale:"en"});
            const draft=await readStoredValue(DRAFT_KEY),draftImages=await hydrateStoredSegmentImages(draft.segmentImages);
            await saveDraft({draft:"",segmentImages:[]});
            const retained=await store.list();
            await saveSettings({segmentImages:[]});
            self.postMessage({restored:restored.segmentImages,draftImages,retained,remaining:await store.list()});
          }
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const dataUrl = await page.evaluate(() => { const canvas=document.createElement("canvas");canvas.width=2;canvas.height=2;canvas.getContext("2d").fillRect(0,0,2,2);return canvas.toDataURL("image/png"); });
    const run = input => page.evaluate(input => new Promise((resolve, reject) => {
      const worker = new Worker("/composer-image-store-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage(input);
    }), input);
    const saved = await run({action:"save",url:dataUrl});
    expect(saved.error).toBeUndefined(); expect(saved.ids.sort()).toEqual(["draft-image","settings-image"]);expect(saved.blobs).toBe(true);expect(saved.frozen).toBe(true);expect(saved.cached).toBe(true);expect(saved.modelsFrozen).toBe(true);
    expect(saved.draft.segmentImages[0][0].edit).toEqual({zoom:2,offsetX:0,offsetY:0,flipX:false,flipY:false,rotation:270});expect(saved.draft.segmentImages[0][0].validation).toEqual({sizeBytes:3,tooBig:false});
    expect(saved.draft.segmentImages[0][0].dataUrl).toBeUndefined();expect(saved.settings.segmentImages[0][0].dataUrl).toBeUndefined();
    await page.reload({waitUntil:"domcontentloaded"});
    const loaded = await run({action:"restore"});expect(loaded.error).toBeUndefined();
    expect(loaded.restored[0][0]).toMatchObject({id:"settings-image",alt:"settings alt",dataUrl});expect(loaded.draftImages[0][0]).toMatchObject({id:"draft-image",alt:"draft alt",dataUrl});
    expect(loaded.retained).toEqual(["settings-image"]);expect(loaded.remaining).toEqual([]);
    const decoded = await page.evaluate(url => new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=()=>reject(Error("image decode"));image.src=url;}),loaded.restored[0][0].dataUrl);
    expect(decoded).toEqual([2,2]);expect(errors).toEqual([]);
  });
  test(`classic network data and workspace callers preserve slice, focus and mutuals from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/network-data-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try {
          const calls=[],progress=[],did="did:plc:fixture",actor="did:plc:actor",now=new Date().toISOString();
          const auth={did,session:{did,accessJwt:"fixture"}};
          fetch=async(url,settings={})=>{
            const parsed=new URL(url);calls.push({url:String(url),authorization:settings.headers?.authorization});
            if(parsed.pathname.endsWith("getAuthorFeed")){const owner=parsed.searchParams.get("actor");return new Response(JSON.stringify({feed:[{post:{uri:"at://"+owner+"/app.bsky.feed.post/one",author:{did:owner},record:{createdAt:now},likeCount:3,viewer:{like:"at://like"}}}]}));}
            if(parsed.pathname.endsWith("listNotifications"))return new Response(JSON.stringify({notifications:[{reason:"like",author:{did:actor},reasonSubject:"at://"+did+"/app.bsky.feed.post/one",indexedAt:now}]}));
            if(parsed.pathname.endsWith("getFollowers"))return new Response(JSON.stringify({followers:[{did:actor,handle:"actor.test"}]}));
            if(parsed.pathname.endsWith("getFollows"))return new Response(JSON.stringify({follows:[{did:actor,handle:"actor.test"}]}));
            if(parsed.pathname.endsWith("getProfile"))return new Response(JSON.stringify({did:parsed.searchParams.get("actor"),handle:"actor.test",viewer:{following:"at://"+did+"/app.bsky.graph.follow/one"}}));
            if(parsed.pathname.endsWith("getRecord"))return new Response(JSON.stringify({value:{createdAt:" 2026-01-01T00:00:00Z "}}));
            throw Error("Unexpected "+url);
          };
          const activity=await collectNetworkActivityForActor(auth,actor),likes=await collectNetworkLikeStats(auth,actor);
          const wave=await collectGraphWave(auth,"app.bsky.graph.getFollowers",did,"",100,"followers",value=>progress.push(value),"fixture");
          const dates=await loadNetworkRelationshipDates(auth,{following:"at://"+did+"/app.bsky.graph.follow/one"});
          const graph=await collectEntireGraph(auth,"app.bsky.graph.getFollows",did,"following",()=>{},"title","step",30);
          await writeStoredAuth({activeDid:did,accounts:[{...auth,identifier:"own.test",handle:"own.test",service:"https://bsky.social"}]});
          const slice=await loadNetworkSlice({limit:100},value=>progress.push(value));
          const focus=await loadNetworkActorFocus({actor},value=>progress.push(value));
          const mutuals=await loadNetworkCommonMutuals({centerActor:did,focusActor:actor},value=>progress.push(value));
          self.postMessage({slice,focus,mutuals,workspaceFrozen:Object.isFrozen(getWorkerNetworkWorkspaceService()),workspaceCached:APP_SHELL.includes("./js/worker/network-workspace-service.js"),activity,likes,wave,dates,graph,progress,calls,frozen:Object.isFrozen(getWorkerNetworkDataService()),cached:APP_SHELL.includes("./js/worker/network-data-service.js")});
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/network-data-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.frozen).toBe(true); expect(result.cached).toBe(true);
    expect(result.activity.windows[14]).toEqual({postsCount:1,likesReceivedCount:3}); expect(result.likes.mutualLikesCount).toBe(2);
    expect(result.wave.profiles[0].did).toBe("did:plc:actor"); expect(result.progress[0].detail).toBe("1/100 geladen · Seite 1");
    expect(result.dates).toEqual({youFollowSince:"2026-01-01T00:00:00Z",followsYouSince:""}); expect(result.graph[0].did).toBe("did:plc:actor");
    expect(result.workspaceFrozen).toBe(true); expect(result.workspaceCached).toBe(true);
    expect(result.slice.viewer.did).toBe("did:plc:fixture"); expect(result.slice.wave).toEqual({followers:1,follows:1});
    expect(result.focus.profile.did).toBe("did:plc:actor"); expect(result.focus.likeStats.mutualLikesCount).toBe(2);
    expect(result.focus.relationshipDates.youFollowSince).toBe("2026-01-01T00:00:00Z");
    expect(result.mutuals.commonDids).toEqual(["did:plc:actor"]);
    expect(result.calls.every(call=>call.authorization==="Bearer fixture")).toBe(true); expect(errors).toEqual([]);
  });
  test(`classic login, token renewal and identity services preserve stored account flows from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/session-identity-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try{
          const calls=[],did="did:plc:fixture",jwt=exp=>"e30."+btoa(JSON.stringify({exp}))+".fixture",now=Math.floor(Date.now()/1000);
          let createCount=0,failRefresh=false;
          fetch=async(url,settings={})=>{calls.push({url:String(url),method:settings.method,authorization:settings.headers?.authorization});
            if(String(url).includes("identity.resolveHandle"))return new Response(JSON.stringify({did}));
            if(String(url).startsWith("https://plc.directory/"))return new Response(JSON.stringify({service:[{type:"AtprotoPersonalDataServer",serviceEndpoint:"https://pds.fixture.test"}]}));
            if(String(url).includes("createSession")){createCount++;let exp=now+3600;if(createCount===1)exp=now-60;return new Response(JSON.stringify({did,handle:"own.test",accessJwt:jwt(exp),refreshJwt:"refresh-fixture"}));}
            if(String(url).includes("refreshSession")){if(failRefresh)return new Response(JSON.stringify({message:"fixture expired"}),{status:401});return new Response(JSON.stringify({did,handle:"own.test",accessJwt:jwt(now+3600),refreshJwt:"fresh-refresh"}));}
            if(String(url).includes("getProfile"))return new Response(JSON.stringify({avatar:""}));
            if(String(url).includes("describeServer"))return new Response("{}");
            throw Error("Unexpected "+url);
          };
          const logged=await login({identifier:"own.test",appPassword:"fixture-password",service:"https://bsky.social"});
          const refreshed=await ensureSession(),fresh=isJwtValid(refreshed.session.accessJwt);
          const state=await readStoredAuth();state.accounts[0].session.accessJwt=jwt(now-60);state.accounts[0].session.refreshJwt="expired-refresh";await writeStoredAuth(state);
          failRefresh=true;const fallback=await ensureSession();
          const mu=await login({identifier:"own.test",appPassword:"fixture-password",service:MU_WEB_CLIENT});
          const cache=new Map(),first=await resolvePdsForDid(did,"https://fallback.test",cache),before=calls.length,second=await resolvePdsForDid(did,"https://other.test",cache),cacheHit=calls.length===before;
          const imported=await importAccountMetadata({accounts:[{did:"did:plc:other",identifier:"other.test",handle:"other.test"}]});
          const selected=await switchAccount({did});
          const verified=await verifySession();
          const removed=await removeAccount({did:"did:plc:other"});
          await saveArchiveSession({session:{status:"fixture"}});
          const signedOut=await logout({did});
          const archiveCleared=(await getArchiveSession())===null;
          await login({identifier:"own.test",appPassword:"fixture-password",service:MU_WEB_CLIENT});
          const connected=await checkConnectivity(),saved=await readStoredAuth();
          self.postMessage({imported,selected,verified,removed,signedOut,archiveCleared,logged,fresh,fallbackHandle:fallback.handle,mu,first,second,cacheHit,connected,calls,createCount,activeDid:saved.activeDid,
            stored:saved.accounts.map(account=>({did:account.did,pdsUrl:account.pdsUrl,webApp:account.webApp})),
            frozen:Object.isFrozen(getAtprotoSession())&&Object.isFrozen(getAtprotoIdentity()),
            cached:["session-service","identity-service","account-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/session-identity-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.frozen).toBe(true); expect(result.cached).toBe(true);
    expect(result.logged.authenticated).toBe(true); expect(result.fresh).toBe(true); expect(result.fallbackHandle).toBe("own.test"); expect(result.createCount).toBe(4);
    expect(result.imported.accounts).toHaveLength(2); expect(result.selected.authenticated).toBe(true); expect(result.verified.authenticated).toBe(true); expect(result.removed.accounts).toHaveLength(1); expect(result.signedOut.authenticated).toBe(false); expect(result.archiveCleared).toBe(true);
    expect(result.mu.webApp).toBe("https://mu.social"); expect(result.first).toBe("https://pds.fixture.test"); expect(result.second).toBe(result.first); expect(result.cacheHit).toBe(true);
    expect(result.connected.ok).toBe(true); expect(result.activeDid).toBe("did:plc:fixture"); expect(result.stored).toEqual([{did:"did:plc:fixture",pdsUrl:"https://pds.fixture.test",webApp:"https://mu.social"}]);
    expect(result.calls.filter(call=>call.url.includes("refreshSession")).map(call=>call.authorization)).toEqual(["Bearer refresh-fixture","Bearer expired-refresh"]);
    expect(result.calls.filter(call=>call.url.includes("createSession"))[2].url).toContain("https://pds.fixture.test/xrpc/"); expect(errors).toEqual([]);
  });
  test(`shared worker adapters use real IndexedDB and preserve classic transport/session callers from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/shared-adapters-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try{
          await writeStoredValue("adapter-falsy",0);const zero=await readStoredValue("adapter-falsy"),missing=await readStoredValue("adapter-missing");
          const jwt="e30."+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+".fixture";
          const state=await writeStoredAuth({identifier:"own.test",appPassword:"fixture-password",service:"https://bsky.social",session:{did:"did:example:own",handle:"own.test",accessJwt:jwt}});
          const auth=await ensureSession(),publicResponse=buildAuthResponse(state);
          const saved=await readStoredAuth();saved.accounts[0].avatar="fresh-avatar";await writeStoredAuth(saved);
          const refreshed=await refreshAuthReference(auth),same=refreshed===auth;
          const calls=[];fetch=async(url,options)=>{calls.push({url,method:options.method,headers:options.headers});
            if(String(url).includes("adapter-bad"))return new Response(JSON.stringify({error:"fixture denied"}),{status:401,headers:{"retry-after":"2","ratelimit-remaining":"0"}});
            return new Response(JSON.stringify({ok:true}),{headers:{"ratelimit-limit":"100","ratelimit-remaining":"4"}});
          };
          const get=await bskyGet("adapter-echo",{zero:0,flag:false,items:["a",0,"b"],empty:""},{headers:{authorization:"fixture"}});
          const meta=await bskyFetch("adapter-meta",{returnMeta:true});let failure;
          try{await bskyFetch("adapter-bad");}catch(error){failure={message:error.message,...error.details};}
          const database=await openDatabase(),stores=Array.from(database.objectStoreNames);database.close();
          await clearStoredAuth();const cleared=await readStoredAuth(),retained=await readStoredValue("adapter-falsy");
          self.postMessage({zero,missing,publicResponse,same,avatar:auth.avatar,get,meta,failure,calls,stores,cleared,retained,
            frozen:Object.isFrozen(workerAuthModels)&&Object.isFrozen(workerStorage)&&Object.isFrozen(getAtprotoTransport()),
            cached:["auth-models","storage-service","transport-service","adapter-messages"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js"))});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/shared-adapters-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.frozen).toBe(true); expect(result.cached).toBe(true);
    expect(result.zero).toBe(0); expect(result.missing).toBeNull(); expect(result.same).toBe(true); expect(result.avatar).toBe("fresh-avatar");
    expect(result.publicResponse).toMatchObject({authenticated:true,did:"did:example:own"}); expect(JSON.stringify(result.publicResponse)).not.toMatch(/fixture-password|accessJwt/);
    expect(result.calls[0].url).toContain("adapter-echo?zero=0&flag=false&items=a&items=b"); expect(result.calls[0].headers.authorization).toBe("fixture");
    expect(result.get.ok).toBe(true); expect(result.meta.meta.rateLimit.remaining).toBe(4); expect(result.failure).toMatchObject({message:"fixture denied",code:"AUTH_INVALID_CREDENTIALS",status:401,retryAfterMs:2000});
    expect(result.stores).toEqual(expect.arrayContaining(["settings","composer-images"])); expect(result.cleared).toEqual({activeDid:"",accounts:[]}); expect(result.retained).toBe(0); expect(errors).toEqual([]);
  });
  test(`worker analysis loads corpus, networks and cached markers from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/analysis-worker-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try{
          const auth={session:{did:"did:example:own",handle:"own.test",accessJwt:"fixture"}},calls=[],progress=[];
          ensureSession=async()=>auth;readStoredAuth=async()=>({accounts:[{did:auth.session.did,handle:"own.test"}]});resolveHandleToDid=async()=>auth.session.did;
          let failFollowers=false;
          const post={uri:"at://did:example:own/app.bsky.feed.post/one",cid:"one",author:{did:auth.session.did},record:{text:"a  b",createdAt:"2026-10-31T10:00:00Z",langs:["DE"],
            facets:[{features:[{$type:"app.bsky.richtext.facet#mention",did:"did:example:target"},{$type:"app.bsky.richtext.facet#tag",tag:"Topic"},{$type:"app.bsky.richtext.facet#link",uri:"https://example.org/a"}]}]}};
          bskyGet=async(method,params,transport)=>{calls.push({method,params,token:transport.headers.authorization});
            if(method==="app.bsky.actor.getProfile")return {did:auth.session.did,handle:"own.test",displayName:"Own",postsCount:1};
            if(method==="app.bsky.feed.getAuthorFeed")return {feed:[{post}],cursor:""};
            if(method==="app.bsky.graph.getFollowers"){if(failFollowers)throw Error("fixture followers");return {followers:[{did:"did:example:mutual",handle:"mutual.test"}]};}
            if(method==="app.bsky.graph.getFollows")return {follows:[{did:"did:example:mutual",handle:"mutual.test"}]};
            if(method==="app.bsky.graph.getMutes")return {mutes:[{did:"did:example:muted"}]};
            if(method==="app.bsky.graph.getBlocks")return {blocks:[]};
            if(method==="app.bsky.actor.getProfiles")return {profiles:[{did:"did:example:target",handle:"target.test",displayName:"Target"}]};
            throw Error(method);
          };
          const profile=await checkAnalysisAccount({actor:"@own.test"});
          const complete=await loadAnalysisAccount({actor:"own.test",options:{}},value=>progress.push(value));
          failFollowers=true;const partial=await loadAnalysisAccount({actor:auth.session.did,options:{}},value=>progress.push(value));
          const stored=normalizeStoredAnalysisState({accountA:complete,inputs:{accountA:" own.test "}});
          let missing;try{await checkAnalysisAccount({actor:" "});}catch(error){missing=error.details.code;}
          self.postMessage({profile,complete,partial,stored,missing,calls,progress,
            wired:extractAnalysisRecordFacets===analysisModels.facets&&collectEntireGraph===analysisService.graph&&loadAnalysisAccount===analysisService.load,
            cached:["analysis-models","analysis-service","analysis-messages"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js")),frozen:Object.isFrozen(analysisModels)&&Object.isFrozen(analysisService)});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/analysis-worker-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true); expect(result.frozen).toBe(true);
    expect(result.profile).toMatchObject({handle:"own.test",displayName:"Own"}); expect(result.complete.posts[0].text).toBe("a b");
    expect(result.complete.stats).toMatchObject({pages:1,fetchedPosts:1,scannedPosts:1}); expect(result.complete.network).toMatchObject({loadState:"complete",mutualDids:["did:example:mutual"],muteBlockSource:"saved_account"});
    expect(result.complete.markers.topMentions[0]).toMatchObject({label:"target.test",count:1,share:1}); expect(result.complete.markers.topHashtags[0].label).toBe("topic");
    expect(result.partial.network.loadState).toBe("partial"); expect(result.partial.network.warnings[0]).toContain("fixture followers");
    expect(result.calls.filter(call=>call.method==="app.bsky.actor.getProfiles")).toHaveLength(1); expect(result.calls.every(call=>call.token==="Bearer fixture")).toBe(true);
    expect(result.stored.accountA.posts[0].text).toBe("a b"); expect(result.stored.accountA.network).toBeUndefined(); expect(result.missing).toBe("ANALYSIS_ACCOUNT_MISSING"); expect(errors).toEqual([]);
  });
  test(`thread URL import preserves selection, assets and early results from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-import-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try{
          const auth={session:{did:"did:example:own",handle:"own.test",accessJwt:"fixture"}},calls=[],downloads=[];
          const rootUri="at://did:example:own/app.bsky.feed.post/root",entryUri="at://did:example:own/app.bsky.feed.post/child";
          const makePost=(uri,key,did)=>({uri,cid:key,record:{text:key,createdAt:"2026-10-31T10:00:00Z"},author:{did,handle:"own.test"},likeCount:3});
          const root=makePost(rootUri,"root",auth.session.did),entry=makePost(entryUri,"child",auth.session.did),other=makePost("at://did:example:other/app.bsky.feed.post/other","other","did:example:other");
          entry.record.reply={root:{uri:rootUri},parent:{uri:rootUri}};
          root.record.embed={$type:"app.bsky.embed.external",external:{uri:"https://card.test",thumb:{ref:{$link:"card"}}}};
          entry.record.embed={$type:"app.bsky.embed.images",images:[{image:{ref:{$link:"image"}},alt:"literal",aspectRatio:{width:10,height:20}}]};
          ensureSession=async()=>auth;resolveHandleToDid=async()=>auth.session.did;
          let missing=false;
          bskyGet=async(method,params,transport)=>{calls.push({method,params,token:transport.headers.authorization});
            if(method==="app.bsky.feed.getPosts"){if(missing)return {posts:[]};return {posts:[entry]};}
            if(method==="app.bsky.feed.getPostThread")return {thread:{post:root,replies:[{post:entry},{post:other}]}};
            throw Error(method);
          };
          downloadBlobForDid=async(auth,did,cid,cache,settings)=>{downloads.push({cid,timeout:settings.timeoutMs});return {type:"image/png",bytes:new Uint8Array([1,2])};};
          buildPublicBlobUrlForDid=async()=>"https://blob.test/image";
          const url="https://bsky.app/profile/own.test/post/child",results={};
          for(const mode of ["path","tree","author"]){const result=await importArchiveThreadFromUrl({runId:mode,url,importMode:mode});results[mode]={...result,assets:result.assets.map(asset=>({...asset,bytes:Array.from(asset.bytes)}))};}
          const cancelled=await importArchiveThreadFromUrl({runId:"cancel-import",url},value=>{if(value.percent===18)setArchiveRunControl({runId:"cancel-import",action:"cancel"});});
          missing=true;const absent=await importArchiveThreadFromUrl({runId:"missing-import",url});
          self.postMessage({results,cancelled,absent,calls,downloads,
            wired:importArchiveThreadFromUrl===archiveImportService.load,cached:APP_SHELL.includes("./js/worker/archive-import-service.js"),
            finished:["path","tree","author","cancel-import","missing-import"].every(id=>!archiveRunControl.finish(id))});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-import-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true); expect(result.finished).toBe(true);
    expect(result.results.path.posts.map(post=>post.rkey)).toEqual(["root","child"]);
    expect(result.results.tree.posts.map(post=>post.rkey)).toEqual(["root","child","other"]);
    expect(result.results.author.posts.map(post=>post.rkey)).toEqual(["root","child"]);
    expect(result.results.path.assets.map(asset=>asset.path)).toEqual(["link-cards/own.test-root.png","images/2026/own.test-child-1.png"]);
    expect(result.results.path.assets[1].bytes).toEqual([1,2]); expect(result.results.path.manifest).toMatchObject({imageCount:1,postCount:2,appVersion:cacheVersion});
    expect(result.results.path.manifest.threadImport).toMatchObject({entryMode:"reply",importMode:"path"});
    expect(result.cancelled.session.status).toBe("cancelled"); expect(result.cancelled.manifest.postCount).toBeUndefined();
    expect(result.absent.manifest.threadImport).toMatchObject({entryMode:"missing",note:"Post nicht gefunden oder gelöscht"});
    expect(result.calls.every(call=>call.token==="Bearer fixture")).toBe(true); expect(result.downloads[0]).toMatchObject({cid:"card",timeout:5000}); expect(errors).toEqual([]);
  });
  test(`archive wave stores card and image assets and finalizes partial results from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-assets-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try{
          const auth={session:{did:"did:example:own",handle:"own.test",accessJwt:"fixture"}},downloads=[];
          const makeBlob=cid=>({$type:"blob",ref:{$link:cid},mimeType:"image/png"});
          const records=[{uri:"at://did:example:own/app.bsky.feed.post/card",cid:"card",value:{text:"card",createdAt:"2026-10-31T10:00:00Z",
            embed:{$type:"app.bsky.embed.external",external:{uri:"https://card.test",title:"card",thumb:makeBlob("thumb")}}}},
            {uri:"at://did:example:own/app.bsky.feed.post/image",cid:"image",value:{text:"image",createdAt:"2026-10-31T09:00:00Z",
            embed:{$type:"app.bsky.embed.images",images:[{image:makeBlob("picture"),alt:"literal image",aspectRatio:{width:10,height:20}}]}}}];
          ensureSession=async()=>auth;readStoredValue=async()=>({});refreshAuthReference=async value=>value;
          bskyGet=async method=>{if(method==="com.atproto.repo.listRecords")return {records,cursor:""};if(method==="app.bsky.feed.getPosts")return {posts:[]};throw Error(method);};
          downloadBlobForDid=async(auth,did,cid,cache,settings)=>{downloads.push({did,cid,timeout:settings.timeoutMs});return {type:"image/png",bytes:new Uint8Array([1,2,3])};};
          buildPublicBlobUrlForDid=async(auth,did,cid)=>"https://blob.test/"+cid;
          const input={filters:{scope:"all"}};
          const completed=await exportAccountArchiveWave({...input,runId:"complete-assets"});
          const cancelled=await exportAccountArchiveWave({...input,runId:"cancel-assets"},value=>{
            if(value.step==="Profilbilder werden ergänzt …")setArchiveRunControl({runId:"cancel-assets",action:"cancel"});
          });
          const paused=await exportAccountArchiveWave({...input,runId:"pause-assets"},value=>{
            if(value.step&&value.step.startsWith("Bilder "))throw Error("fixture observer");
          });
          const clean=result=>({...result,assets:result.assets.map(asset=>({...asset,bytes:Array.from(asset.bytes)}))});
          self.postMessage({completed:clean(completed),cancelled:clean(cancelled),paused:clean(paused),downloads,
            finished:["complete-assets","cancel-assets","pause-assets"].every(runId=>!archiveRunControl.finish(runId))});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-assets-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.finished).toBe(true);
    expect(result.completed.session).toMatchObject({status:"completed",exportedPosts:2}); expect(result.completed.manifest.imageCount).toBe(1);
    expect(result.completed.assets.map(asset=>asset.path)).toEqual(["link-cards/own.test-card.png","images/2026/own.test-image-1.png"]);
    expect(result.completed.assets.every(asset=>asset.type==="image/png"&&asset.sizeBytes===3&&asset.bytes.join(",")==="1,2,3")).toBe(true);
    expect(result.completed.posts[0].externalCard).toMatchObject({thumbLoadAttempts:1,thumbLoadFailed:false,thumbPath:"link-cards/own.test-card.png"});
    expect(result.completed.posts[1].images[0]).toMatchObject({alt:"literal image",width:10,height:20,remoteUrl:"https://blob.test/picture"});
    expect(result.cancelled.session.status).toBe("cancelled"); expect(result.cancelled.manifest.imageCount).toBe(0);
    expect(result.paused.session).toMatchObject({status:"paused",errorMessage:"fixture observer"}); expect(result.paused.assets).toHaveLength(2); expect(result.paused.manifest.imageCount).toBe(1);
    expect(result.downloads.find(call=>call.cid==="thumb").timeout).toBe(5000); expect(errors).toEqual([]);
  });
  test(`classic archive collection, metric batches and shared avatars initialize from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-collection-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage=async()=>{
        try {
          const auth={session:{did:"did:example:own",handle:"own.test",accessJwt:"fixture"}},calls=[],progress=[];
          const uri="at://did:example:own/app.bsky.feed.post/one";
          ensureSession=async()=>auth;readStoredValue=async()=>({});refreshAuthReference=async value=>value;
          bskyGet=async(method,params)=>{
            calls.push({method,params});
            if(method==="com.atproto.repo.listRecords")return {cursor:"",records:[{uri,cid:"one",value:{text:"literal",createdAt:"2026-10-28T10:00:00Z"}}]};
            if(method==="app.bsky.feed.getPosts")return {posts:[{uri,likeCount:7,author:{handle:"own.test"}}]};
            throw Error("Unexpected request "+method);
          };
          const wave=await exportAccountArchiveWave({runId:"collect",filters:{scope:"all"}},value=>progress.push(value));
          const avatars=globalThis.createThreadlineArchiveAssetService({messages:globalThis.ThreadlineArchiveRunMessages,
            download:async()=>({type:"image/png",bytes:new Uint8Array([1,2,3])}),normalize:value=>value,extension:()=>"png",
            map:mapWithConcurrency,concurrency:2});
          const posts=[{authorAvatar:"url",authorHandle:"own.test"},{authorAvatar:"url"}],assets=[];
          await avatars.attachAvatars(posts,assets,new Set(),auth,new Map(),value=>progress.push(value));
          const foreign=globalThis.createThreadlineArchiveWaveService({messages:globalThis.ThreadlineArchiveRunMessages,
            request:async()=>({cursor:"next",feed:[{post:{uri,record:{text:"selected"},author:{did:"did:other",handle:" other.test "}}}]}),
            refresh:async value=>value,base:()=>"fixture",retry:async operation=>operation(),wait:async()=>"cancelled",
            chunk:chunkEntries,select:()=>true,hashtag:async()=>true});
          const state={cursor:"",hashtagFilteredOutCount:0};
          const page=await foreign.readPage({auth,sourceProfile:{isOwnAccount:false},sourceDid:"did:other",normalizedFilters:{},pageSize:25,pageCount:0},state);
          const cancelled=await foreign.enrichMetrics({orderedPosts:[{uri}],postsByUri:new Map(),auth});
          self.postMessage({wave,calls,posts,assets:assets.map(asset=>({...asset,bytes:Array.from(asset.bytes)})),progress,page,state,cancelled,
            wired:attachArchiveAvatarAssets===archiveAssetService.attachAvatars,
            cached:["archive-wave-service","archive-asset-service"].every(name=>APP_SHELL.includes("./js/worker/"+name+".js")),
            frozen:Object.isFrozen(archiveWaveService)&&Object.isFrozen(archiveAssetService)});
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-collection-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); }; worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true); expect(result.frozen).toBe(true);
    expect(result.wave.session).toMatchObject({status:"completed",pageCount:1,exportedPosts:1});
    expect(result.wave.posts[0]).toMatchObject({text:"literal",counts:{likeCount:7}});
    expect(result.calls.map(call=>call.method)).toEqual(["com.atproto.repo.listRecords","app.bsky.feed.getPosts"]);
    expect(result.posts.map(post=>post.authorAvatarPath)).toEqual(["avatars/own.test.png","avatars/own.test.png"]);
    expect(result.assets).toHaveLength(1); expect(result.assets[0].bytes).toEqual([1,2,3]); expect(result.assets[0].sizeBytes).toBe(3);
    expect(result.page.pageRecords[0].authorHandle).toBe("other.test"); expect(result.state.cursor).toBe("next"); expect(result.cancelled).toBe("cancelled");
    expect(errors).toEqual([]);
  });
  test(`classic archive wave resumes and builds completed, cancelled and paused sessions from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-wave-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage = async () => {
        try {
          const auth={session:{did:"did:example:own",handle:"own.test",accessJwt:"fixture"}},sourceCalls=[];
          const source=globalThis.createThreadlineArchiveSourceService({base:()=>"https://fixture.test/xrpc",request:async(method,params,transport)=>{
            sourceCalls.push({method,params,transport});return {did:" did:example:other ",handle:" other.test ",displayName:"<b>Other</b>",avatar:" avatar "};
          }});
          const own=await source.resolve(auth),other=await source.resolve(auth,{sourceDid:" did:example:other ",sourceActor:"ignored.test"});
          const uri="at://did:example:own/app.bsky.feed.post/saved",raw={text:"<b>Literal saved</b>",createdAt:"2026-10-28T10:00:00Z",embed:null};
          const original={uri,cid:"cid",rawRecord:raw,text:raw.text,createdAt:raw.createdAt,authorHandle:"own.test",authorDid:auth.session.did,counts:{likeCount:"4"},images:[]};
          const catalog={posts:[original]},restored=archiveModels.wave.restore({existingCatalog:catalog,existingSession:{pageCount:"7"},maxPosts:25});
          const resumeRefs={copied:restored.postsByUri.get(uri)!==original,raw:restored.rawRecordsByUri.get(uri)===raw,images:restored.postsByUri.get(uri).images!==original.images};
          // Exercise the real wave caller while its storage/network/asset adapters remain controlled.
          ensureSession=async()=>auth;readStoredValue=async()=>({});refreshAuthReference=async value=>value;

          let fail=false;const requests=[];
          bskyGet=async(method,params)=>{requests.push({method,params});if(fail)throw Error("fixture forbidden");return {posts:[],records:[],cursor:""};};
          const input={filters:{},existingCatalog:catalog,existingSession:{pageCount:7},maxPosts:25,waveIndex:99};
          const completed=await exportAccountArchiveWave({...input,runId:"complete"});
          const cancelled=await exportAccountArchiveWave({...input,runId:"cancel"},()=>{setArchiveRunControl({runId:"cancel",action:"cancel"});});
          fail=true;const paused=await exportAccountArchiveWave({...input,runId:"pause"});
          self.postMessage({own,other,sourceCalls,resumeRefs,completed,cancelled,paused,requests,originalCount:original.counts.likeCount,
            wired:resolveArchiveSourceActor===archiveSourceService.resolve,
            cached:APP_SHELL.includes("./js/worker/archive-source-service.js"),frozen:Object.isFrozen(archiveModels.wave)&&Object.isFrozen(source),
          });
        }catch(error){self.postMessage({error:error.message,stack:error.stack});}
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-wave-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true); expect(result.frozen).toBe(true);
    expect(result.own).toMatchObject({did:"did:example:own",isOwnAccount:true}); expect(result.other).toMatchObject({handle:"other.test",displayName:"<b>Other</b>",avatar:"avatar",isOwnAccount:false});
    expect(result.sourceCalls).toHaveLength(1); expect(result.sourceCalls[0].params.actor).toBe("did:example:other");
    expect(result.sourceCalls[0].transport.headers.authorization).toBe("Bearer fixture"); expect(result.resumeRefs).toEqual({copied:true,raw:true,images:true});
    expect(result.completed.manifest).toMatchObject({postCount:1,pageCount:7,appVersion:cacheVersion,imageCount:0,phase:"assets"});
    expect(result.completed.posts[0]).toMatchObject({text:"<b>Literal saved</b>",counts:{likeCount:4}}); expect(result.completed.assets).toEqual([]);
    expect(result.completed.session).toMatchObject({waveIndex:1,status:"completed",hasMore:false,exportedPosts:1,pageCount:7});
    expect(result.cancelled.session).toMatchObject({status:"cancelled",exportedPosts:1,pageCount:7});
    expect(result.paused.session).toMatchObject({status:"paused",exportedPosts:1,errorMessage:"fixture forbidden"});
    expect(result.originalCount).toBe("4"); expect(result.requests.every(request=>request.method==="app.bsky.feed.getPosts")).toBe(true);
    expect(errors).toEqual([]);
  });
  test(`classic archive thread service preserves caches, deadlines and context expansion from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-thread-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage = async () => {
        try {
          const auth = {session:{accessJwt:"old"}}, calls = [], responses = [], progress = [], timerIds = new Set();
          let refreshes = 0, cleared = 0, cancelled = false;
          const root = "at://did:example:own/app.bsky.feed.post/root", child = "at://did:example:own/app.bsky.feed.post/child";
          const post = (uri,text) => ({uri,cid:uri,record:{text},author:{did:"did:example:own",handle:"own.test",displayName:"<b>Own</b>"},likeCount:"3"});
          const service = globalThis.createThreadlineArchiveThreadService({
            models:archiveModels,messages:globalThis.ThreadlineArchiveRunMessages,timeoutMs:10,retries:1,
            refresh:async () => ({session:{accessJwt:"fresh-"+(++refreshes)}}),base:() => "https://fixture.test/xrpc",
            wait:async () => { if(cancelled)return "cancelled";return "running"; },abortController:() => new AbortController(),
            schedule:(callback,ms) => { const id=setTimeout(callback,ms);timerIds.add(id);return id; },
            clearTimer:id => { cleared++;timerIds.delete(id);clearTimeout(id); },
            request:async (method,params,transport) => {
              calls.push({method,params,token:transport.headers.authorization,signal:transport.signal});
              const response=responses.shift();
              if(response instanceof Error)throw response;
              if(response === "abort")return await new Promise((resolve,reject) => transport.signal.addEventListener("abort",() => reject(Object.assign(Error("aborted"),{name:"AbortError"})),{once:true}));
              return response;
            },
          });
          const filters={hashtagTags:["topic"]},rootCache=new Map(),threadCache=new Map();
          responses.push({thread:{post:post(root,"#Topic")}});
          const rootMatch=await service.rootMatches(root,filters,auth,rootCache);
          const cachedRoot=await service.rootMatches(root,filters,auth,rootCache);
          responses.push({thread:{post:post(root,"no tag"),replies:[{post:post(child,"#Topic")}]}});
          const threadMatch=await service.threadMatches(root,filters,auth,threadCache);
          const lookupCalls=calls.length;
          const direct=await service.mediaMatches(post(child,"#Topic"),filters,auth);
          const directCalls=calls.length-lookupCalls;
          responses.push("abort",{thread:{post:post(root,"<b>Literal</b>")}});
          const requested=await service.requestThread(auth,root,{notifyProgress:value=>progress.push(value),checkpointPrefix:"Literal {seconds}"});
          const signalAborted=calls[2].signal.aborted;
          const posts=new Map([["missing",{uri:"missing"}],["root",{uri:root}],["duplicate",{uri:child,thread:{rootUri:root}}]]),upserts=[];
          responses.push(Error("Post not found"),Error("Post not found"),{thread:{post:post(root,"Root"),replies:[{post:post(child,"Child")}]}});
          const expanded=await service.expandContexts({auth,postsByUri:posts,notifyProgress:value=>progress.push(value),upsertArchivePost:(entity,record)=>upserts.push({entity,raw:entity.rawRecord===record})});
          cancelled=true;const beforeCancel=calls.length;
          const cancelResult=await service.expandContexts({auth,postsByUri:posts,notifyProgress:value=>progress.push(value),upsertArchivePost:()=>{throw Error("unexpected upsert");}});
          self.postMessage({rootMatch,cachedRoot,threadMatch,direct,directCalls,lookupCalls,signalAborted,requested:requested.thread.post.record.text,
            expanded,cancelResult,cancelCalls:calls.length-beforeCancel,upserts,progress,cleared,pendingTimers:timerIds.size,
            calls:calls.map(call=>({method:call.method,params:call.params,token:call.token})),
            wired:rootPostMatchesArchiveHashtags===archiveThreadService.rootMatches && threadMatchesArchiveHashtags===archiveThreadService.threadMatches
              && postMatchesMediaExportHashtagSelection===archiveThreadService.mediaMatches && archiveGetPostThread===archiveThreadService.requestThread
              && expandArchiveConversationContexts===archiveThreadService.expandContexts && isMissingArchivePostError===archiveThreadService.isMissing
              && isArchiveThreadTimeoutError===archiveThreadService.isTimeout,
            cached:APP_SHELL.includes("./js/worker/archive-thread-service.js"),frozen:Object.isFrozen(service),
          });
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-thread-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true); expect(result.frozen).toBe(true);
    expect(result.rootMatch).toBe(true); expect(result.cachedRoot).toBe(true); expect(result.threadMatch).toBe(true);
    expect(result.direct).toBe(true); expect(result.directCalls).toBe(0); expect(result.lookupCalls).toBe(2);
    expect(result.calls[0].params).toMatchObject({depth:0,parentHeight:0}); expect(result.calls[1].params).toMatchObject({depth:100,parentHeight:0});
    expect(result.calls[0].token).toBe("Bearer fresh-1"); expect(result.signalAborted).toBe(true); expect(result.requested).toBe("<b>Literal</b>");
    expect(result.progress[0].checkpoint).toBe("Literal {seconds} · Wiederholungsversuch 2/2");
    expect(result.expanded).toBe("completed"); expect(result.upserts).toHaveLength(2);
    expect(result.upserts.every(entry=>entry.raw)).toBe(true); expect(result.upserts[0].entity).toMatchObject({authorDisplayName:"<b>Own</b>",counts:{likeCount:3}});
    expect(result.progress.some(entry=>entry.step?.includes("übersprungen"))).toBe(true);
    expect(result.cancelResult).toBe("cancelled"); expect(result.cancelCalls).toBe(0); expect(result.pendingTimers).toBe(0); expect(result.cleared).toBe(5);
    expect(errors).toEqual([]);
  });
  test(`classic archive worker preserves filter, thread and post models from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-models-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage = () => {
        try {
          const own = "did:example:own", rootUri = "at://" + own + "/app.bsky.feed.post/root";
          const childUri = "at://" + own + "/app.bsky.feed.post/child";
          const foreign = "at://did:example:other/app.bsky.feed.post/parent";
          const filters = normalizeArchiveFilters({sourceActor:" @@Own.Test ",scope:"range",from:"2026-10-28",to:"2026-10-28",hashtagTags:["#Äpfel","äpfel"]});
          const raw = {text:"<b>Literal</b> #Äpfel",createdAt:"2026-10-28T23:59:59.999Z",originalText:"Before",updatedAt:"updated",langs:["de"],facets:[],
            embed:{external:{uri:"https://example.test/card",title:"<b>Card</b>",thumb:{url:"https://example.test/thumb"},publication:{name:"Publication"}}}};
          const post = buildArchivePostEntity({uri:rootUri,cid:"cid",record:raw,authorHandle:"own.test",authorDid:own});
          const reply = {createdAt:raw.createdAt,reply:{root:{uri:rootUri},parent:{uri:foreign}}};
          const child = {uri:childUri,record:{},author:{did:own}};
          const tree = {post:{uri:rootUri,author:{did:"other"}},replies:[{post:child}]};
          const path = [], all = collectThreadViewPosts(tree), found = collectThreadPathPosts(tree,childUri,path);
          const images = Array.from({length:12},(_,index)=>({image:index}));
          const merged = mergeArchivePostEntity(post,{text:"",langs:[],facets:[],images:[{path:"image.png"}],authorDisplayName:"Updated"});
          self.postMessage({
            wired:normalizeArchiveFilters===archiveModels.filters.normalize && collectNormalizedHashtagsFromRecord===archiveModels.filters.tags
              && recordMatchesArchiveHashtags===archiveModels.filters.matchesHashtags && postMatchesArchiveFilters===archiveModels.filters.matchesDate
              && getArchiveRootUri===archiveModels.threads.root && getArchiveParentUri===archiveModels.threads.parent
              && recordBelongsToOwnThread===archiveModels.threads.own && recordBelongsToOwnMainThreadPath===archiveModels.threads.main
              && postMatchesArchiveSelection===archiveModels.threads.select && collectThreadViewPosts===archiveModels.threads.all
              && collectThreadPathPosts===archiveModels.threads.path && collectThreadAuthorPosts===archiveModels.threads.author
              && extractArchiveEmbedImages===archiveModels.posts.images && extractArchiveEmbedVideos===archiveModels.posts.videos
              && extractArchiveExternalCardFromRecord===archiveModels.posts.card && buildArchivePostEntity===archiveModels.posts.build
              && mergeArchivePostEntity===archiveModels.posts.merge,
            frozen:Object.isFrozen(archiveModels)&&Object.values(archiveModels).every(Object.isFrozen),
            cached:APP_SHELL.includes("./js/worker/archive-models.js"),filters,tags:[...collectNormalizedHashtagsFromRecord(raw)],
            match:recordMatchesArchiveHashtags(raw,filters),date:postMatchesArchiveFilters(raw,filters),outside:postMatchesArchiveFilters({createdAt:"2026-10-29T00:00:00Z"},filters),
            own:recordBelongsToOwnThread(reply,own),main:recordBelongsToOwnMainThreadPath(reply,own),
            selected:postMatchesArchiveSelection(reply,{scope:"all",contentMode:"thread_roots"},own),
            all:all.map(item=>item.uri),found,path:path.map(item=>item.uri),author:collectThreadAuthorPosts(tree,own).map(item=>item.uri),
            images:extractArchiveEmbedImages({embed:{media:{images}}}).length,
            video:extractArchiveEmbedVideos({embed:{media:{video:{ref:{$link:"cid"}},alt:" Alt ",aspectRatio:{width:"1920",height:"1080"}}}}),
            post,same:merged===post,raw:post.rawRecord===raw,langs:post.langs===raw.langs,
            empty:[collectThreadViewPosts(null).length,collectThreadAuthorPosts(null,own).length,collectThreadPathPosts(null,childUri,[])],
          });
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-models-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.frozen).toBe(true); expect(result.cached).toBe(true);
    expect(result.filters).toMatchObject({sourceActor:"Own.Test",hashtagTags:["äpfel"],scope:"range"});
    expect(result.tags).toEqual(["äpfel"]); expect(result.match).toBe(true); expect(result.date).toBe(true); expect(result.outside).toBe(false);
    expect(result.own).toBe(true); expect(result.main).toBe(false); expect(result.selected).toBe(false);
    expect(result.all).toHaveLength(2); expect(result.found).toBe(true); expect(result.path).toEqual(result.all); expect(result.author).toEqual([result.all[1]]);
    expect(result.images).toBe(10); expect(result.video[0]).toMatchObject({alt:"Alt",aspectRatio:{width:1920,height:1080}});
    expect(result.post).toMatchObject({text:"<b>Literal</b> #Äpfel",authorDisplayName:"Updated",permalink:"https://bsky.app/profile/own.test/post/root",images:[{path:"image.png"}]});
    expect(result.post.externalCard).toMatchObject({title:"<b>Card</b>",standardSite:{publicationName:"Publication"}});
    expect(result.post.editInfo.originalText).toBe("Before"); expect(result.same).toBe(true); expect(result.raw).toBe(true); expect(result.langs).toBe(true);
    expect(result.empty).toEqual([0,0,false]); expect(errors).toEqual([]);
  });
  test(`classic archive worker preserves pause, cancellation, retry and feed pacing from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/archive-control-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage = async () => {
        try {
          const progress = [];
          archiveRunControl.start("actual");
          setArchiveRunControl({runId:"actual",action:"pause"});
          setTimeout(() => setArchiveRunControl({runId:"actual",action:"resume"}), 10);
          const resumed = await waitForArchiveRunControl("actual", value => progress.push(value));
          setArchiveRunControl({runId:"actual",action:"pause"});
          setTimeout(() => setArchiveRunControl({runId:"actual",action:"cancel"}), 10);
          const cancelled = await waitForArchiveRunControl("actual", value => progress.push(value));
          let preventedCalls = 0, cancelledCode = "";
          try { await runArchiveRequestWithRetry(async () => { preventedCalls++; }, {runId:"actual"}); }
          catch(error) { cancelledCode = error.details.code; }
          archiveRunControl.finish("actual");
          let actualAttempts = 0;
          const actualResult = await runArchiveRequestWithRetry(async () => {
            if (actualAttempts++ === 0) { throw Object.assign(Error("blocked"), {details:{status:429,retryAfterMs:1}}); }
            return "actual result";
          }, {notifyProgress:value => progress.push(value)});
          const waits = [], retryProgress = []; let attempts = 0;
          const controller = globalThis.createThreadlineArchiveRunControl({
            delay: async ms => { waits.push(ms); }, error:createServiceWorkerError, messages:globalThis.ThreadlineArchiveRunMessages,
          });
          const retried = await controller.retry(async () => {
            if (attempts++ === 0) { throw Object.assign(Error("unavailable"), {details:{status:503,retryAfterMs:1501}}); }
            return {literal:"<b>Result</b>"};
          }, {runId:"retry",notifyProgress:value => retryProgress.push(value),title:"Literal {seconds}",baseDetail:"Page",checkpoint:"Checkpoint"});
          const retryWaits = [...waits]; waits.length = 0;
          const feedProgress = [];
          await controller.pauseFeed({runId:"feed",pageCount:25,recordsCount:123,notifyProgress:value => feedProgress.push(value)});
          const feedWaits = [...waits]; waits.length = 0;
          await controller.pauseFeed({runId:"feed",pageCount:100,archiveExpertMode:true});
          controller.control({runId:"retry",action:"cancel"});
          const isolated = await controller.wait("other");
          self.postMessage({resumed,cancelled,cancelledCode,preventedCalls,actualResult,actualAttempts,progress,
            retryWaits,retryProgress,retried,attempts,feedWaits,feedProgress,expertWaits:waits,isolated,
            thresholds:[getArchiveSoftPauseMs(24),getArchiveSoftPauseMs(25),getArchiveSoftPauseMs(100)],
            wired:setArchiveRunControl === archiveRunControl.control && waitForArchiveRunControl === archiveRunControl.wait
              && sleepForArchiveRun === archiveRunControl.sleep && runArchiveRequestWithRetry === archiveRunControl.retry
              && maybePauseArchiveFeedScan === archiveRunControl.pauseFeed && getArchiveSoftPauseMs === archiveRunControl.softPauseMs,
            cached:APP_SHELL.includes("./js/worker/archive-run-control.js") && APP_SHELL.includes("./js/worker/archive-run-messages.js"),
          });
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/archive-control-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.cached).toBe(true);
    expect(result.resumed).toBe("running"); expect(result.cancelled).toBe("cancelled"); expect(result.cancelledCode).toBe("ARCHIVE_CANCELLED");
    expect(result.preventedCalls).toBe(0); expect(result.actualAttempts).toBe(2); expect(result.actualResult).toBe("actual result");
    expect(result.progress.filter(value => value.state === "paused")).toHaveLength(2);
    expect(result.retryWaits).toEqual([1000,501]); expect(result.attempts).toBe(2); expect(result.retried.literal).toBe("<b>Result</b>");
    expect(result.retryProgress.find(value => value.title)).toMatchObject({title:"Literal {seconds}",detail:"Page · Serverfehler 503 · neuer Versuch in 2s",checkpoint:"Checkpoint",state:"running"});
    expect(result.feedWaits).toEqual([1000,1000,1000]); expect(result.feedProgress.find(value => value.detail).detail).toBe("25 Feed-Seiten gelesen · 123 Posts vorgemerkt · freiwillige Pause 3s");
    expect(result.expertWaits).toEqual([]); expect(result.isolated).toBe("running"); expect(result.thresholds).toEqual([0,3000,10000]);
    expect(errors).toEqual([]);
  });
  test(`classic DM worker collects partners, hydrates avatars and exports filtered messages from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.route("**/dm-worker-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
      importScripts("/sw.js");
      self.onmessage = async () => {
        try {
          const calls = [], progress = [];
          const auth = { session: { did: "self", handle: "self.test", accessJwt: "fixture" }, avatar: "self-avatar" };
          const service = globalThis.createThreadlineDmService({
            models: dmModels, session: async () => auth, text: globalThis.formatThreadlineDmMessage,
            now: () => "2026-10-22T10:00:00.000Z", randomUUID: () => "generated", appVersion: APP_VERSION,
            chat: async (account, method, params) => {
              calls.push({ method, params });
              if (method === "chat.bsky.convo.listConvos") {
                if (!params.cursor) {
                  return { convos: [{ id: "old", members: [{did:"self"}, {did:"peer",handle:"old.test"}], updatedAt:"2026-10-20" }], cursor: "next" };
                }
                return { convos: [{ id:"new",members:[{did:"self"},{did:"peer",handle:"peer.test"}],updatedAt:"2026-10-22" }] };
              }
              if (params.convoId === "old") { return { messages: [] }; }
              if (!params.cursor) {
                return { messages: [{ id:"start",sender:{did:"self"},sentAt:"2026-10-22T00:00:00.000Z",text:"<b>Literal</b>" }], cursor:"more" };
              }
              return { messages: [
                { id:"end",sender:{did:"peer"},sentAt:"2026-10-22T23:59:59.999Z",embed:{external:{uri:"https://example.test/card",thumb:"https://example.test/thumb"}} },
                { id:"outside",sender:{did:"peer"},sentAt:"2026-10-23T00:00:00.000Z" },
              ] };
            },
            request: async (method, params, transport) => {
              calls.push({ method, params, transport });
              return { profiles: [{did:"peer",handle:"peer.test",displayName:"<b>Partner</b>",avatar:"peer-avatar"}] };
            },
            base: () => "https://fixture.test/xrpc", accountAvatar: async () => "",
            remoteAsset: async (account, url, did) => { calls.push({asset:url,did});return {type:"image/png",bytes:new Uint8Array([1,2,3])}; },
            blob: async () => { throw Error("unexpected blob"); }, cid: () => "", extension: () => "png",
          });
          const partners = await service.listPartners({downloadAssets:false}, value => progress.push(value));
          const hydrated = await service.hydrateAvatars(partners, value => progress.push(value));
          const archive = await service.exportArchive({filters:{participantDid:"peer",from:"2026-10-22",to:"2026-10-22"},partnerCache:hydrated}, value => progress.push(value));
          let missingPartner = "";
          try { await service.exportArchive(); } catch(error) { missingPartner = error.message; }
          self.postMessage({
            wired: exportDmArchive === dmService.exportArchive && listDmPartners === dmService.listPartners
              && hydrateDmPartnerAvatars === dmService.hydrateAvatars && checkDmAccess === dmService.checkAccess,
            frozen: Object.isFrozen(service), cached: APP_SHELL.includes("./js/worker/dm-service.js") && APP_SHELL.includes("./js/worker/dm-messages.js"),
            contacts:partners.recentContacts, avatar:hydrated.recentContacts[0].avatarPath,
            copied:partners.recentContacts[0].avatarPath === undefined,
            manifest:archive.manifest, messages:archive.messages.map(message => ({id:message.id,text:message.text,card:message.externalCard})),
            assets:archive.assets.map(asset => ({path:asset.path,size:asset.bytes.length})), calls,progress,missingPartner,
          });
        } catch(error) { self.postMessage({error:error.message,stack:error.stack}); }
      };
    ` }));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(() => new Promise((resolve, reject) => {
      const worker = new Worker("/dm-worker-harness.js");
      worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({});
    }));
    expect(result.error).toBeUndefined(); expect(result.wired).toBe(true); expect(result.frozen).toBe(true); expect(result.cached).toBe(true);
    expect(result.contacts).toHaveLength(1); expect(result.contacts[0].handle).toBe("peer.test");
    expect(result.avatar).toBe("dm-avatars/peer.test.png"); expect(result.copied).toBe(true);
    expect(result.manifest).toMatchObject({messageCount:2,conversationCount:1,participantCount:1,appVersion:cacheVersion,exportedAt:"2026-10-22T10:00:00.000Z"});
    expect(result.messages.map(message => message.id)).toEqual(["start","end"]); expect(result.messages[0].text).toBe("<b>Literal</b>");
    expect(result.messages[1].card.thumbPath).toBe("dm-link-cards/peer.test-end.png");
    expect(result.assets.map(asset => asset.path)).toEqual(["dm-avatars/peer.test.png","dm-link-cards/peer.test-end.png","dm-avatars/self.test.png"]);
    expect(result.assets.every(asset => asset.size === 3)).toBe(true);
    expect(result.calls.filter(call => call.method === "chat.bsky.convo.listConvos")).toHaveLength(2);
    expect(result.calls.find(call => call.method === "app.bsky.actor.getProfiles").transport).toEqual({base:"https://fixture.test/xrpc",headers:{authorization:"Bearer fixture"}});
    expect(result.progress.at(-1)).toMatchObject({percent:98,detail:"1 Konversationen · 2 Nachrichten"});
    expect(result.missingPartner).toBe("Bitte zuerst genau einen DM-Partner auswählen."); expect(errors).toEqual([]);
  });
  test(`saved search URL workflows apply and clear active archive/explorer references from ${pathname}`, async ({page}) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#archive-saved-searches-button").dispatchEvent("click");
    const dialog = page.locator("#saved-searches-dialog");
    const input = page.locator("#saved-search-url-input");
    const items = page.locator("#saved-searches-list .saved-search-item");
    await input.fill("https://example.test/search?q=alpha");
    await page.locator("#saved-search-add-button").click();
    await expect(items).toHaveCount(0);
    await expect(page.locator("#saved-searches-status")).not.toBeEmpty();
    await input.fill("https://bsky.app/search?q=Alpha");
    await page.locator("#saved-search-add-button").click();
    await expect(items).toHaveCount(1); await expect(input).toHaveValue("");
    await input.fill("https://bsky.app/search?q=alpha");
    await page.locator("#saved-search-add-button").click();
    await expect(items).toHaveCount(1); await expect(input).toHaveValue("https://bsky.app/search?q=alpha");
    await items.locator(".saved-search-load").click(); await expect(dialog).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__search.saved?.archivePreferences?.savedSearchId)).not.toBe("");
    await expect(page.locator("#archive-thread-url-note")).toContainText("Alpha");
    await page.locator("#thread-explorer-searches-button").dispatchEvent("click");
    await items.locator(".saved-search-load").click(); await expect(dialog).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__search.calls.some(call => call.type === "LOAD_THREAD_EXPLORER_FEED" && call.payload.search?.q === "Alpha"))).toBe(true);
    await page.locator("#thread-explorer-searches-button").dispatchEvent("click");
    await items.locator(".saved-search-remove").click(); await expect(items).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__search.saved?.archivePreferences?.savedSearchId)).toBe("");
    await expect.poll(() => page.evaluate(() => window.__search.saved?.savedSearches?.length)).toBe(0);
    await expect(page.locator("#thread-explorer-source-select")).toHaveValue("follows");
    await expect(page.locator("#archive-thread-url-note")).not.toContainText("Alpha");
    await page.locator("#saved-searches-close-button").click();
    await page.reload({waitUntil:"domcontentloaded"}); await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#archive-saved-searches-button").dispatchEvent("click");
    await expect(items).toHaveCount(0); expect(errors).toEqual([]);
  });
  test(`loading a saved search discards a late result from the previous search from ${pathname}`, async ({page}) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await openSearch(page, pathname);
    await page.locator("#search-query-input").fill("Saved topic"); await page.locator("#search-save-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.saved?.savedSearches?.length)).toBe(1);
    await page.locator("#search-query-input").fill("Old topic"); await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(1);
    await page.locator("#search-saved-button").dispatchEvent("click");
    await page.locator("#saved-searches-list .saved-search-load").click();
    await expect(page.locator("#search-query-input")).toHaveValue("Saved topic");
    await page.evaluate(() => window.__finishSearch(0, {items:[window.__searchItem("stale")],cursor:"old-cursor"}));
    await expect(page.locator("#search-results-list .search-result-item")).toHaveCount(0);
    await expect(page.locator("#search-query-input")).toHaveValue("Saved topic");
    await expect.poll(() => page.evaluate(() => window.__search.calls.some(call => call.type === "SET_SEARCH_RUN_CONTROL" && call.payload.action === "cancel"))).toBe(true);
    await expect(page.locator("#search-status")).toContainText("Saved topic");
    expect(errors).toEqual([]);
  });
  test(`saved searches save, load, reload and remove with template icons from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.setViewportSize({width:390,height:844});
    await prepareSearch(page);await openSearch(page,pathname);
    await page.locator("#search-query-input").fill("<b>Literal topic</b>");await page.locator("#search-save-button").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.saved?.savedSearches?.length)).toBe(1);
    await page.locator("#search-save-button").click();await expect.poll(()=>page.evaluate(()=>window.__search.saved?.savedSearches?.length)).toBe(1);
    await page.locator("#search-query-input").fill("changed");await page.locator("#search-saved-button").click();
    const dialog=page.locator("#saved-searches-dialog"),items=page.locator("#saved-searches-list .saved-search-item");
    await expect(dialog).toBeVisible();await expect(items).toHaveCount(1);await expect(page.locator("#saved-search-url-field")).toBeHidden();await expect(page.locator("#saved-searches-actions")).toBeHidden();
    await expect(items.locator(".saved-search-title")).toHaveText("<b>Literal topic</b>");await expect(items.locator("b")).toHaveCount(0);
    await expect(items.locator(".saved-search-remove svg path")).toHaveCount(1);
    const outer=await dialog.boundingBox(),remove=await items.locator(".saved-search-remove").boundingBox();
    expect(remove.x).toBeGreaterThanOrEqual(outer.x);expect(remove.x+remove.width).toBeLessThanOrEqual(outer.x+outer.width+1);
    await items.locator(".saved-search-load").click();await expect(dialog).not.toBeVisible();await expect(page.locator("#search-query-input")).toHaveValue("<b>Literal topic</b>");
    await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#search-saved-button").click();await expect(items).toHaveCount(1);
    await items.locator(".saved-search-remove").click();await expect(items).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>window.__search.saved?.savedSearches?.length)).toBe(0);await expect(page.locator("#saved-searches-status")).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
  test(`explorer view preferences restore and saved-search context fields switch from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await openSearch(page,pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async()=>{
      const {createThreadExplorerViewPreference}=await import("/js/tools/thread-explorer-controller.js");
      const tools=await import("/js/tools/thread-explorer.js");
      const orientation=createThreadExplorerViewPreference({getStorage:()=>localStorage,key:"threadline:thread-explorer-orientation",normalize:tools.normalizeThreadExplorerOrientation,fallback:"vertical"});
      const mode=createThreadExplorerViewPreference({getStorage:()=>localStorage,key:"threadline:thread-explorer-view-mode",normalize:tools.normalizeThreadExplorerViewMode,fallback:"tree"});
      orientation.save("horizontal");mode.save("reply-cluster");
    });
    await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    await expect(page.locator("#thread-explorer-button")).toBeEnabled();
    await page.locator("#thread-explorer-button").dispatchEvent("click");
    await expect(page.locator("#thread-explorer-orientation-button")).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("#thread-explorer-view-mode-button")).toHaveAttribute("aria-pressed","true");
    await page.locator("#archive-saved-searches-button").dispatchEvent("click");
    await expect(page.locator("#saved-searches-dialog")).toBeVisible();await expect(page.locator("#saved-search-url-field")).toBeVisible();
    await expect(page.locator("#saved-searches-actions")).toBeVisible();await page.locator("#saved-searches-close-button").click();
    await page.locator("#thread-explorer-searches-button").dispatchEvent("click");
    await expect(page.locator("#saved-search-url-field")).toBeVisible();await expect(page.locator("#saved-search-url-input")).toHaveValue("");
    await page.locator("#saved-searches-close-button").click();expect(errors).toEqual([]);
  });
  test(`explorer selection preferences survive reload and respect account isolation from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async()=>{
      const {createThreadExplorerSelectionPreferences}=await import("/js/tools/thread-explorer-controller.js");
      const {normalizeThreadExplorerSource}=await import("/js/tools/thread-explorer.js");
      const preferences=createThreadExplorerSelectionPreferences({key:"test:explorer-selection",getStorage:()=>localStorage,
        getAccount:()=>"did:example:one",getSource:()=>"followers",normalizeSource:normalizeThreadExplorerSource,now:()=>"2026-10-20T10:00:00.000Z"});
      preferences.save(" at://one/app.bsky.feed.post/selected ");
    });
    await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(async()=>{
      const {createThreadExplorerSelectionPreferences}=await import("/js/tools/thread-explorer-controller.js");
      const {normalizeThreadExplorerSource}=await import("/js/tools/thread-explorer.js");
      let account="did:example:one";const key="test:explorer-selection";
      const preferences=createThreadExplorerSelectionPreferences({key,getStorage:()=>localStorage,getAccount:()=>account,getSource:()=>"follows",normalizeSource:normalizeThreadExplorerSource,now:()=>"unused"});
      const restored=preferences.read();account="did:example:two";const other=preferences.read();
      const stored=JSON.parse(localStorage.getItem(key));localStorage.setItem(key,"broken");const invalid=preferences.read();
      preferences.clear();return {restored,other,stored,invalid,cleared:localStorage.getItem(key)===null};
    });
    expect(result).toEqual({restored:{source:"followers",selectedUri:"at://one/app.bsky.feed.post/selected"},other:null,
      stored:{accountDid:"did:example:one",source:"followers",selectedUri:"at://one/app.bsky.feed.post/selected",updatedAt:"2026-10-20T10:00:00.000Z"},invalid:null,cleared:true});
    expect(errors).toEqual([]);
  });
  test(`explorer replies dialog renders templates and selects with mouse and keyboard from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.setViewportSize({width:390,height:844});
    await prepareSearch(page);await page.goto(pathname);await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async()=>{
      const {renderThreadExplorerReplies}=await import("/js/tools/thread-explorer-rendering.js");
      const {findThreadExplorerTreeNode}=await import("/js/tools/thread-explorer.js");
      const {translations}=await import("/js/core/app-i18n.js");const selected=[];
      const root={post:{uri:"root",replyCount:3},replies:[{post:{uri:"first",author:{displayName:"<b>Literal reply</b>",handle:"first.test"}}},{post:{uri:"second",author:{did:"did:example:second"}}}]};
      const dialog=document.querySelector("#thread-explorer-replies-dialog");
      const config={list:document.querySelector("#thread-explorer-replies-list"),title:document.querySelector("#thread-explorer-replies-title"),status:document.querySelector("#thread-explorer-replies-status"),
        template:document.querySelector("#thread-explorer-actor-item-template"),cloneTemplate:node=>node.content.cloneNode(true),formatCount:String,
        translate:(key,values={})=>{let text=translations.en[key]||key;for(const[name,value]of Object.entries(values))text=text.replaceAll("{"+name+"}",String(value));return text;},
        getActorLabel:actor=>actor.displayName||actor.handle||actor.did||"Unknown",setAvatar:(image,uri,label)=>{image.hidden=true;image.alt=label;},
        selectReply:uri=>{selected.push(uri);dialog.close();}};
      const show=()=>{renderThreadExplorerReplies(findThreadExplorerTreeNode(root,"root"),config);dialog.showModal();};
      const empty=()=>{renderThreadExplorerReplies(null,config);dialog.showModal();};
      window.__replyFixture={selected,show,empty};show();
    });
    const items=page.locator("#thread-explorer-replies-list .thread-explorer-actor-item"),dialog=page.locator("#thread-explorer-replies-dialog");
    await expect(items).toHaveCount(2);await expect(items.first()).toHaveAttribute("role","button");await expect(items.first()).toHaveAttribute("tabindex","0");
    await expect(items.first().locator(".thread-explorer-actor-name")).toHaveText("<b>Literal reply</b>");await expect(items.locator("b")).toHaveCount(0);
    await expect(items.nth(1).locator(".thread-explorer-actor-handle")).toHaveText("did:example:second");
    const outer=await dialog.boundingBox(),first=await items.first().boundingBox();expect(first.x).toBeGreaterThanOrEqual(outer.x);expect(first.x+first.width).toBeLessThanOrEqual(outer.x+outer.width+1);
    await items.first().click();await expect(dialog).not.toBeVisible();
    await page.evaluate(()=>window.__replyFixture.show());await items.nth(1).press("Enter");await expect(dialog).not.toBeVisible();
    await page.evaluate(()=>window.__replyFixture.show());await items.first().press("Space");await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(()=>window.__replyFixture.selected)).toEqual(["first","second","first"]);
    await page.evaluate(()=>window.__replyFixture.empty());await expect(items).toHaveCount(0);await expect(page.locator("#thread-explorer-replies-status")).not.toBeEmpty();
    await dialog.press("Escape");expect(errors).toEqual([]);
  });
  test(`search Explorer icon stays centered from ${pathname}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await openSearch(page, pathname);
    await page.locator("#search-query-input").fill("word");
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(1);
    await page.evaluate(() => window.__finishSearch(0, { items: [window.__searchItem("alignment")] }));
    const button = page.locator(".search-result-thread-explorer-button");
    await expect(button).toBeVisible();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const compact of [false, true]) {
        await page.evaluate(value => document.body.classList.toggle("ui-density-compact", value), compact);
        const geometry = await button.evaluate(element => {
          const box = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          const icon = range.getBoundingClientRect();
          return { horizontal: Math.abs(icon.x + icon.width / 2 - box.x - box.width / 2),
            vertical: Math.abs(icon.y + icon.height / 2 - box.y - box.height / 2) };
        });
        expect(geometry.horizontal).toBeLessThan(3);
        expect(geometry.vertical).toBeLessThan(3);
      }
    }
    await page.locator(".search-result-item").screenshot({ path: testInfo.outputPath("search-icon-alignment.png") });
    expect(errors).toEqual([]);
  });

  test(`explorer favorites save from search, survive reload and remove through the dialog from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.setViewportSize({width:390,height:844});
    await prepareSearch(page);await openSearch(page,pathname);
    await page.locator("#search-query-input").fill("word");await page.locator("#search-run-button").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.pending.length)).toBe(1);
    await page.evaluate(()=>{const item=window.__searchItem("favorite");item.post.author.displayName="<b>Literal name</b>";window.__finishSearch(0,{items:[item]});});
    await page.locator("#search-results-list .search-result-favorite").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.saved?.threadExplorerFavorites?.length)).toBe(1);
    await expect(page.locator("#search-results-list .search-result-favorite")).toHaveClass(/is-active/);
    await page.locator("#search-results-list .search-result-favorite").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.saved?.threadExplorerFavorites?.length)).toBe(1);
    await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#thread-explorer-favorites-button").dispatchEvent("click");
    const dialog=page.locator("#thread-explorer-favorites-dialog");await expect(dialog).toBeVisible();
    await expect(page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-item")).toHaveCount(1);
    await expect(page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-title")).toHaveText("<b>Literal name</b>");
    await expect(page.locator("#thread-explorer-favorites-list b")).toHaveCount(0);
    await expect(page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-text")).toContainText("<b>literal</b>");
    const outer=await dialog.boundingBox(),button=await page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-remove").boundingBox();
    expect(button.x).toBeGreaterThanOrEqual(outer.x);expect(button.x+button.width).toBeLessThanOrEqual(outer.x+outer.width+1);
    await page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-remove").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.saved?.threadExplorerFavorites?.length)).toBe(0);
    await expect(page.locator("#search-results-list .search-result-favorite")).not.toHaveClass(/is-active/);
    await expect(page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-item")).toHaveCount(0);
    await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#thread-explorer-favorites-button").dispatchEvent("click");
    await expect(page.locator("#thread-explorer-favorites-list .thread-explorer-favorite-item")).toHaveCount(0);
    await expect(page.locator("#thread-explorer-favorites-status")).not.toBeEmpty();expect(errors).toEqual([]);
  });
  test(`explorer feed ordering and selection render through existing templates from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(async()=>{
      const tools=await import("/js/tools/thread-explorer.js");const rendering=await import("/js/tools/thread-explorer-rendering.js");
      const first={post:{uri:"one",rootUri:"root",createdAt:"2026-10-18",text:"First <literal>"}},second={post:{uri:"two",rootUri:"root",createdAt:"2026-10-19",text:"Second"}};
      const items=tools.sortThreadExplorerFeedItemsByDate(tools.appendThreadExplorerFeedItems([first],[{post:{uri:"one",text:"duplicate"}},second]));
      const selected=tools.resolveThreadExplorerSelection({items,currentUri:"missing",readStoredSelection:()=>({selectedUri:"one"})});
      const list=document.createElement("ul"),status=document.createElement("p"),favorites=document.createElement("div"),favoriteStatus=document.createElement("p");
      const host=document.createElement("div");host.append(list,status,favorites,favoriteStatus);document.body.append(host);
      tools.renderThreadExplorerFeedPanel({list,status,items,translate:key=>key,formatCount:String,renderItem:item=>{
        const fragment=document.querySelector("#thread-explorer-feed-item-template").content.cloneNode(true);
        const button=fragment.querySelector("button");button.dataset.uri=item.post.uri;button.textContent=item.post.text;return fragment;
      }});
      const actions=[];const config={list:favorites,status:favoriteStatus,template:document.querySelector("#thread-explorer-favorite-item-template"),cloneTemplate:node=>node.content.cloneNode(true),
        favorites:[{rootUri:selected,text:"<i>Literal</i>"}],translate:key=>key,formatCount:String,formatDate:String,applyTranslatedTitle:()=>{},
        onLoad:event=>actions.push("load:"+event.currentTarget.dataset.uri),onRemove:event=>actions.push("remove:"+event.currentTarget.dataset.uri)};
      rendering.renderThreadExplorerFavorites(config);rendering.renderThreadExplorerFavorites(config);
      favorites.querySelector(".thread-explorer-favorite-load").click();favorites.querySelector(".thread-explorer-favorite-remove").click();
      const result={order:Array.from(list.querySelectorAll("button"),button=>button.dataset.uri),selected,text:list.textContent,actions,
        grouped:tools.appendThreadExplorerFeedItems([first],[second],{groupByRoot:true}).length,markup:host.querySelectorAll("i,literal").length};
      host.remove();return result;
    });
    expect(result).toMatchObject({order:["two","one"],selected:"one",actions:["load:one","remove:one"],grouped:1,markup:0});
    expect(result.text).toContain("First <literal>");expect(errors).toEqual([]);
  });
  test(`explorer feed sources reject old account replies and render template labels from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(async()=>{
      const {createThreadExplorerFeedSourcesController}=await import("/js/tools/thread-explorer-controller.js");
      const {renderThreadExplorerFeedSources}=await import("/js/tools/thread-explorer-rendering.js");
      const {buildThreadExplorerFeedSource}=await import("/js/tools/thread-explorer.js");
      const select=document.querySelector("#thread-explorer-feed-select"),template=document.querySelector("#thread-explorer-feed-option-template");
      const state={feeds:[],loaded:false,loading:false,accountDid:""};const pending=[];let account="one";
      const render=()=>renderThreadExplorerFeedSources({select,template,cloneTemplate:node=>node.content.cloneNode(true),feeds:state.feeds,
        buildSource:buildThreadExplorerFeedSource,activeSource:"",placeholder:"Choose feed",disabled:state.loading});
      const controller=createThreadExplorerFeedSourcesController({state,getAccount:()=>account,render,onError:error=>{throw error;},
        request:(type,payload,options)=>new Promise(resolve=>pending.push({type,options,resolve}))});
      const first=controller.load();account="two";const second=controller.load();
      const disabledWhileLoading=select.disabled;
      pending[0].resolve({feeds:[{uri:"at://one/app.bsky.feed.generator/old",displayName:"Old"}]});await first;
      const ignored=state.feeds.length===0&&state.loading;
      pending[1].resolve({feeds:[{uri:"at://two/app.bsky.feed.generator/new",displayName:"<b>Literal feed</b>"}]});await second;
      await controller.load();
      return {disabledWhileLoading,ignored,labels:Array.from(select.options,option=>option.textContent),disabled:select.disabled,
        account:state.accountDid,pending:pending.length,markup:select.querySelectorAll("b").length,type:pending[1].type,timeout:pending[1].options.timeoutMs};
    });
    expect(result).toEqual({disabledWhileLoading:true,ignored:true,labels:["Choose feed","<b>Literal feed</b>"],disabled:false,account:"two",pending:2,markup:0,
      type:"LOAD_THREAD_EXPLORER_FEED_SOURCES",timeout:60000});expect(errors).toEqual([]);
  });
  test(`explorer focus centers rendered cards and synchronizes viewport state from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    for(const width of [390,1100]){
      await page.setViewportSize({width,height:844});
      const result=await page.evaluate(async()=>{
        const {createThreadExplorerFocusController,createThreadExplorerController}=await import("/js/tools/thread-explorer-controller.js");
        const {calculateThreadExplorerNodePan}=await import("/js/tools/thread-explorer-layout.js");
        const host=document.createElement("div");host.style.cssText="position:fixed;left:20px;top:20px;width:calc(100vw - 40px);height:400px;overflow:hidden;z-index:99999;background:white";
        const stage=document.createElement("div");stage.style.cssText="position:relative;transform-origin:0 0";host.append(stage);document.body.append(host);
        const cards={};for(const [uri,left,top]of [["root",30,40],["child",500,600]]){
          const item=document.querySelector("#thread-explorer-node-template").content.firstElementChild.cloneNode(true);item.dataset.uri=uri;
          item.style.cssText=`position:absolute;left:${left}px;top:${top}px;width:160px`;
          const card=item.querySelector(".thread-explorer-post-card");card.style.cssText="width:160px;height:100px;min-width:0;box-sizing:border-box";
          stage.append(item);cards[uri]=card;
        }
        const core=createThreadExplorerController({zoom:0.8,panX:10,panY:20});let selected="child",cluster=false;
        const render=()=>{stage.style.transform=`translate(${core.state.panX}px,${core.state.panY}px) scale(${core.state.zoom})`;};render();
        const controller=createThreadExplorerFocusController({isClusterMode:()=>cluster,getRootUri:()=>"root",getSelectedUri:()=>selected,
          getViewportElement:()=>host,getStage:()=>stage,getCard:item=>item.querySelector(".thread-explorer-post-card"),getViewport:()=>core.state,
          setViewport:value=>core.setViewport(value.zoom,value.panX,value.panY),calculatePan:calculateThreadExplorerNodePan,render,renderEdges:()=>{}});
        const offsets=[];const record=uri=>{const target=cards[uri].getBoundingClientRect(),viewport=host.getBoundingClientRect();
          offsets.push({x:target.left+target.width/2-viewport.left-host.clientWidth/2,y:target.top+target.height/2-viewport.top-host.clientHeight/2});};
        controller.focus();record("child");selected="root";controller.focus();record("root");cluster=true;selected="";controller.focus();record("root");
        controller.reveal(controller.find("child"));const target=cards.child.getBoundingClientRect(),viewport=host.getBoundingClientRect();
        const result={offsets,inset:{x:target.left-viewport.left,y:target.top-viewport.top},finite:Number.isFinite(core.state.panX)&&Number.isFinite(core.state.panY)};
        host.remove();return result;
      });
      for(const offset of result.offsets){expect(offset.x).toBeCloseTo(0,1);expect(offset.y).toBeCloseTo(0,1);}
      expect(result.inset.x).toBeCloseTo(24,1);expect(result.inset.y).toBeCloseTo(24,1);expect(result.finite).toBe(true);
    }
    expect(errors).toEqual([]);
  });
  test(`explorer gallery opens real search images and preserves thumbnail navigation from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await prepareSearch(page);await openSearch(page,pathname);
    await page.locator("#search-query-input").fill("word");await page.locator("#search-run-button").click();
    await expect.poll(()=>page.evaluate(()=>window.__search.pending.length)).toBe(1);
    await page.evaluate(()=>{
      const canvas=document.createElement("canvas");canvas.width=80;canvas.height=40;
      const first=canvas.toDataURL();canvas.getContext("2d").fillRect(0,0,80,40);const second=canvas.toDataURL();
      const item=window.__searchItem("gallery");item.post.images=[{fullsize:first,thumb:first,alt:"First <literal>"},{fullsize:second,thumb:second,alt:"Second image"}];
      window.__finishSearch(0,{items:[item]});
    });
    await expect(page.locator("#search-results-list .thread-explorer-image-button")).toHaveCount(2);
    await page.locator("#search-results-list .thread-explorer-image-button").first().click();
    const dialog=page.locator("#thread-explorer-gallery-dialog");await expect(dialog).toBeVisible();
    await expect(page.locator("#thread-explorer-gallery-caption")).toHaveText("First <literal>");
    await page.locator("#thread-explorer-gallery-next-button").click();await expect(page.locator("#thread-explorer-gallery-caption")).toHaveText("Second image");
    await dialog.press("ArrowRight");await expect(page.locator("#thread-explorer-gallery-caption")).toHaveText("First <literal>");
    await page.locator("#thread-explorer-gallery-thumbs .thread-explorer-gallery-thumb").nth(1).click();
    await expect(page.locator("#thread-explorer-gallery-caption")).toHaveText("Second image");
    await expect(page.locator("#thread-explorer-gallery-thumbs .thread-explorer-gallery-thumb").nth(1)).toHaveAttribute("aria-pressed","true");
    expect(await page.locator("#thread-explorer-gallery-image").evaluate(async image=>{await image.decode();return image.naturalWidth;})).toBe(80);
    await page.locator(".thread-explorer-gallery-main").evaluate(element=>{element.requestFullscreen=async()=>{throw new Error("Controlled fullscreen rejection");};});
    await page.locator("#thread-explorer-gallery-image").click();
    await expect(page.locator("body")).toHaveClass(/thread-explorer-gallery-fullscreen/);
    await dialog.press("Escape");await expect(page.locator("body")).not.toHaveClass(/thread-explorer-gallery-fullscreen/);await expect(dialog).toBeVisible();
    await dialog.press("Escape");await expect(dialog).not.toBeVisible();expect(errors).toEqual([]);
  });
  test(`explorer toolbar modes and render scheduling update real controls from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await prepareSearch(page);await page.goto(pathname);await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(async()=>{
      const {renderThreadExplorerControls}=await import("/js/tools/thread-explorer-rendering.js");
      const {createThreadExplorerRenderScheduler}=await import("/js/tools/thread-explorer-controller.js");
      const {translations}=await import("/js/core/app-i18n.js");
      const elements={};document.querySelectorAll("[id^='thread-explorer-'],#archive-saved-searches-button").forEach(element=>{
        const key=element.id.replace(/-([a-z])/g,(match,letter)=>letter.toUpperCase());elements[key]=element;
      });
      const state={authenticated:true,hasTree:true,loadingThread:false,loadingFeed:false,foreignAccount:true,actorFocus:true,clusterMode:true,
        saved:true,accountActor:"peer.test",accountMode:"posts",horizontal:true,selectedUri:"post",fullscreen:true,zoom:1.25,source:"unknown"};
      renderThreadExplorerControls(elements,state,{translate:key=>translations.en[key]||key,renderAccountNote:()=>{},renderFeedSources:()=>{}});
      const toolbar={zoom:elements.threadExplorerZoomResetButton.textContent,source:elements.threadExplorerSourceSelect.value,
        cluster:elements.threadExplorerViewModeButton.getAttribute("aria-pressed"),orientationDisabled:elements.threadExplorerOrientationButton.disabled,
        sourceHidden:elements.threadExplorerSourceField.hidden,saved:elements.threadExplorerSaveButton.classList.contains("is-active"),
        fullscreen:elements.threadExplorerFullscreenButton.getAttribute("aria-pressed")};
      const host=document.createElement("div");document.body.append(host);let dragging=false,edges=0,focus=0;
      const scheduler=createThreadExplorerRenderScheduler({isClusterMode:()=>false,isDragging:()=>dragging,isInertiaActive:()=>false,
        requestFrame:callback=>requestAnimationFrame(callback),cancelFrame:frame=>cancelAnimationFrame(frame),setTimeout:(callback,delay)=>setTimeout(callback,delay),clearTimeout:timer=>clearTimeout(timer),
        renderEdges:()=>{edges++;host.dataset.edges=String(edges);},focusSelected:()=>{focus++;host.textContent="Focused "+focus;}});
      scheduler.scheduleEdges();dragging=true;await new Promise(resolve=>requestAnimationFrame(resolve));
      const deferred=edges===0;dragging=false;scheduler.scheduleEdges();scheduler.scheduleEdges();
      scheduler.scheduleFocus();scheduler.scheduleFocus();await new Promise(resolve=>setTimeout(resolve,180));
      const result={toolbar,deferred,edges,focus,text:host.textContent};scheduler.cancelFocus();host.remove();return result;
    });
    expect(result.toolbar).toEqual({zoom:"125%",source:"follows",cluster:"true",orientationDisabled:true,sourceHidden:true,saved:true,fullscreen:"true"});
    expect(result).toMatchObject({deferred:true,edges:1,focus:2,text:"Focused 2"});expect(errors).toEqual([]);
  });
  test(`explorer lazy hydration observes rendered cards and forces snapshot content from ${pathname}`, async ({ page }) => {
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async()=>{
      const hydration=await import("/js/tools/thread-explorer-hydration.js");
      const host=document.createElement("div"); host.id="lazy-fixture";
      host.style.cssText="position:fixed;left:20px;top:20px;width:320px;height:260px;overflow:auto;z-index:99999;background:white";
      const stage=document.createElement("div"); stage.style.cssText="position:relative;height:4500px;width:280px";
      host.append(stage);document.body.append(host);
      const state={forced:false,counts:{}};const cards={};
      for(const [uri,top]of [["visible",0],["selected",2200],["far",3600],["snapshot",4200]]){
        const item=document.querySelector("#thread-explorer-node-template").content.firstElementChild.cloneNode(true);
        item.style.cssText=`position:absolute;left:0;top:${top}px;width:260px`;
        const card=item.querySelector(".thread-explorer-post-card");card.id="lazy-"+uri;
        stage.append(item);cards[uri]=card;
      }
      const controller=hydration.createThreadExplorerLazyHydrationController({
        createObserver:(callback,config)=>new IntersectionObserver(callback,config),
        getRoot:()=>host,getStage:()=>stage,isForced:()=>state.forced,getSelectedUri:()=>"selected",
        hydrate:card=>hydration.hydrateThreadExplorerCard(card,card._threadExplorerPost,{
          renderMedia(element,post){element.querySelector(".thread-explorer-post-text").textContent=post.text;},
          finalize(element){element.classList.remove("is-awaiting-content");state.counts[element._threadExplorerPost.uri]=(state.counts[element._threadExplorerPost.uri]||0)+1;},
        }),
      });
      for(const [uri,card]of Object.entries(cards))controller.prepare(card,{uri,text:"Literal <text> "+uri});
      window.__lazyFixture={state,controller,force(){state.forced=true;controller.hydrateVisible();}};
    });
    await expect(page.locator("#lazy-visible")).toHaveAttribute("data-hydrated","true");
    await expect(page.locator("#lazy-selected")).toHaveAttribute("data-hydrated","true");
    await expect(page.locator("#lazy-far")).not.toHaveAttribute("data-hydrated","true");
    await page.locator("#lazy-fixture").evaluate(element=>{element.scrollTop=3500;});
    await expect(page.locator("#lazy-far")).toHaveAttribute("data-hydrated","true");
    await page.evaluate(()=>window.__lazyFixture.force());
    await expect(page.locator("#lazy-snapshot")).toHaveAttribute("data-hydrated","true");
    expect(await page.evaluate(()=>window.__lazyFixture.state.counts)).toEqual({visible:1,selected:1,far:1,snapshot:1});
    await expect(page.locator("#lazy-snapshot .thread-explorer-post-text")).toHaveText("Literal <text> snapshot");
    await expect(page.locator("#lazy-snapshot .thread-explorer-post-text text")).toHaveCount(0);
    await page.evaluate(()=>{window.__lazyFixture.controller.reset();document.querySelector("#lazy-fixture").remove();});
    expect(errors).toEqual([]);
  });
  test(`explorer snapshot avatar and media hydration applies real images and aborts from ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result=await page.evaluate(async()=>{
      const hydration=await import("/js/tools/thread-explorer-hydration.js");
      const media=await import("/js/tools/thread-explorer-media-hydration.js");
      const {requestThreadExplorerMediaHydration}=await import("/js/atproto/atproto-media.js");
      const {translations}=await import("/js/core/app-i18n.js");
      const canvas=document.createElement("canvas");canvas.width=2;canvas.height=2;const dataUri=canvas.toDataURL();
      const root={post:{author:{did:"peer"},quoteCard:{author:{did:"quoted"}}},replies:[{post:{author:{did:"peer"}}}]};
      const reports=[],calls=[],failures=[];let hydratedMedia=null;
      const request=async(type,payload,config)=>{
        calls.push({type,root:payload.root===root,timeout:config.timeoutMs});
        if(type==="HYDRATE_THREAD_EXPLORER_AVATARS"){
          config.onProgress({phase:"thread_explorer_avatars",total:2,current:2,remaining:0,hydrated:2});
          return {avatars:{peer:{dataUri},quoted:{dataUri}}};
        }
        config.onProgress({phase:"thread_explorer_media",total:1,current:1,remaining:0,downloaded:1});
        return {media:{source:dataUri}};
      };
      const options={signal:null,translate:key=>translations.en[key]||key,onProgress:report=>reports.push(report),
        throwIfAborted:signal=>{if(signal)signal.throwIfAborted();},onError:error=>failures.push(error.message)};
      await hydration.hydrateThreadExplorerAvatars(root,{...options,request,applyAvatars:hydration.applyThreadExplorerAvatarHydration});
      await media.hydrateThreadExplorerSnapshotMedia(root,{...options,
        request:(currentRoot,config)=>requestThreadExplorerMediaHydration(request,currentRoot,config),onMedia:value=>{hydratedMedia=value;}});
      const fragment=document.querySelector("#thread-explorer-node-template").content.cloneNode(true);
      const avatar=fragment.querySelector(".thread-explorer-avatar");avatar.src=root.post.author.avatarDataUri;
      const galleryFragment=document.querySelector("#thread-explorer-image-template").content.cloneNode(true);
      const image=galleryFragment.querySelector("img");image.src=hydratedMedia.source;
      const host=document.createElement("div");host.append(fragment,galleryFragment);document.body.append(host);
      await Promise.all([avatar.decode(),image.decode()]);
      let aborts=0;const abortController=new AbortController();abortController.abort();
      try{await hydration.hydrateThreadExplorerAvatars(root,{...options,signal:abortController.signal,request});}catch(error){if(error.name==="AbortError")aborts++;else throw error;}
      const pendingController=new AbortController();
      const pending=media.hydrateThreadExplorerSnapshotMedia(root,{...options,signal:pendingController.signal,
        request:(currentRoot,config)=>new Promise((resolve,reject)=>config.signal.addEventListener("abort",()=>reject(config.signal.reason),{once:true}))});
      pendingController.abort();try{await pending;}catch(error){if(error.name==="AbortError")aborts++;else throw error;}
      const result={calls,percents:reports.map(report=>report.percent),steps:reports.map(report=>report.step),failures,aborts,
        avatarWidth:avatar.naturalWidth,mediaWidth:image.naturalWidth,replyAvatar:root.replies[0].post.author.avatarDataUri===dataUri,
        quoteAvatar:root.post.quoteCard.author.avatarDataUri===dataUri};host.remove();return result;
    });
    expect(result.calls).toEqual([{type:"HYDRATE_THREAD_EXPLORER_AVATARS",root:true,timeout:120000},{type:"HYDRATE_THREAD_EXPLORER_MEDIA",root:true,timeout:420000}]);
    expect(result.percents).toEqual([17,27]);expect(result.steps.every(step=>!step.startsWith("threadExplorer"))).toBe(true);
    expect(result).toMatchObject({failures:[],aborts:2,avatarWidth:2,mediaWidth:2,replyAvatar:true,quoteAvatar:true});
    expect(errors).toEqual([]);
  });
  test(`explorer anchored zoom, reset and reply neighborhoods work from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#thread-explorer-zoom-in-button").dispatchEvent("click");
    await expect(page.locator("#thread-explorer-zoom-reset-button")).not.toHaveText("100%");
    await page.locator("#thread-explorer-zoom-out-button").dispatchEvent("click");
    for (const width of [390,1100]) {
      await page.setViewportSize({width,height:844});
      const result = await page.evaluate(async () => {
        const layout = await import("/js/tools/thread-explorer-layout.js");
        const controllers = await import("/js/tools/thread-explorer-controller.js");
        const host=document.createElement("div");
        host.style.cssText="position:fixed;left:20px;top:20px;width:calc(100vw - 40px);height:500px;overflow:hidden;z-index:99999;background:white";
        const stage=document.createElement("div"); stage.style.cssText="position:relative;transform-origin:0 0;width:800px;height:600px";
        host.append(stage); document.body.append(host);
        const template=document.querySelector("#thread-explorer-node-template");
        const makeItem=(uri,left,top,width,height)=>{
          const item=template.content.firstElementChild.cloneNode(true); item.dataset.uri=uri; item.style.position="static";
          item.querySelector(".thread-explorer-node").style.position="static";
          const card=item.querySelector(".thread-explorer-post-card");
          card.style.cssText=`position:absolute;box-sizing:border-box;left:${left}px;top:${top}px;width:${width}px;height:${height}px;min-width:0;min-height:0`;
          const children=item.querySelector(":scope > .thread-explorer-children"); children.hidden=false; children.style.position="static";
          return item;
        };
        const root=makeItem("root",0,0,100,60); const child=makeItem("child",150,100,80,70); const grandchild=makeItem("grandchild",600,500,50,50);
        root.querySelector(":scope > .thread-explorer-children").append(child);
        child.querySelector(":scope > .thread-explorer-children").append(grandchild); stage.append(root);
        const core=controllers.createThreadExplorerController({zoom:0.8,panX:20,panY:30});
        let fits=0; let zoom;
        const apply=viewport=>{core.setViewport(viewport.zoom,viewport.panX,viewport.panY);};
        const render=()=>{stage.style.transform=`translate(${core.state.panX}px, ${core.state.panY}px) scale(${core.state.zoom})`;}; render();
        const getCard=item=>item.querySelector(":scope > .thread-explorer-node > .thread-explorer-post-card");
        const getBox=card=>layout.getThreadExplorerStageBoxFromRects(card.getBoundingClientRect(),host.getBoundingClientRect(),core.state);
        const renderRoot={node:{post:{uri:"root"}},item:root,children:[{node:{post:{uri:"child"}},item:child,children:[{node:{post:{uri:"grandchild"}},item:grandchild}]}]};
        const options={getCard,getBox,clusterMode:false,rootRenderNode:renderRoot};
        const treeBounds=layout.getThreadExplorerCardNeighborhoodBounds(root,options);
        const clusterBounds=layout.getThreadExplorerCardNeighborhoodBounds(root,{...options,clusterMode:true});
        const reset=controllers.createThreadExplorerZoomResetController({getZoom:()=>core.state.zoom,setCenteredZoom:value=>zoom.atCenter(value),
          fit:()=>{fits++;},setTimeout:(callback,delay)=>setTimeout(callback,delay),clearTimeout:timer=>clearTimeout(timer)});
        zoom=controllers.createThreadExplorerZoomController({getViewport:()=>core.state,setViewport:apply,getBounds:()=>host.getBoundingClientRect(),
          calculatePointZoom:layout.calculateThreadExplorerPointZoom,rememberZoom:reset.remember,render,renderEdges:()=>{}});
        const anchor={x:host.getBoundingClientRect().left+75,y:host.getBoundingClientRect().top+50};
        const before=getCard(root).getBoundingClientRect(); zoom.atPoint(1.5,anchor.x,anchor.y);
        const after=getCard(root).getBoundingClientRect();
        const beforeReset={zoom:core.state.zoom,panX:core.state.panX,panY:core.state.panY};
        const button=document.createElement("button"); host.append(button);
        button.addEventListener("click",reset.click); button.addEventListener("dblclick",reset.doubleClick);
        button.dispatchEvent(new MouseEvent("click",{detail:1})); button.dispatchEvent(new MouseEvent("dblclick",{cancelable:true}));
        const hundred=core.state.zoom;
        button.dispatchEvent(new MouseEvent("dblclick",{cancelable:true}));
        const restored={zoom:core.state.zoom,panX:core.state.panX,panY:core.state.panY};
        await new Promise(resolve=>setTimeout(resolve,240)); const fitsAfterDouble=fits;
        button.dispatchEvent(new MouseEvent("click",{detail:1}));
        await new Promise(resolve=>setTimeout(resolve,240));
        const result={treeBounds,clusterBounds,hundred,beforeReset,restored,fitsAfterDouble,fits,
          before:{x:before.left,y:before.top,width:before.width},after:{x:after.left,y:after.top,width:after.width},anchor};
        host.remove(); return result;
      });
      for (const box of [result.treeBounds,result.clusterBounds]) {
        expect(box.left).toBeCloseTo(0,3); expect(box.top).toBeCloseTo(0,3);
        expect(box.width).toBeCloseTo(230,3); expect(box.height).toBeCloseTo(170,3);
      }
      expect(result.after.width/result.before.width).toBeCloseTo(1.5,3);
      expect((result.anchor.x-result.after.x)/result.after.width).toBeCloseTo((result.anchor.x-result.before.x)/result.before.width,3);
      expect((result.anchor.y-result.after.y)/result.after.width).toBeCloseTo((result.anchor.y-result.before.y)/result.before.width,3);
      expect(result.hundred).toBe(1); expect(result.restored.zoom).toBeCloseTo(result.beforeReset.zoom,5);
      expect(result.restored.panX).toBeCloseTo(result.beforeReset.panX,5); expect(result.restored.panY).toBeCloseTo(result.beforeReset.panY,5);
      expect(result.fitsAfterDouble).toBe(0); expect(result.fits).toBe(1);
    }
    expect(errors).toEqual([]);
  });
  test(`explorer card focus handles selection, restore and touch from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async () => {
      const { createThreadExplorerCardFocusController } = await import("/js/tools/thread-explorer-controller.js");
      const { calculateThreadExplorerViewportFit } = await import("/js/tools/thread-explorer-layout.js");
      const host = document.createElement("div"); host.id = "focus-fixture";
      host.style.cssText = "position:fixed;left:10px;top:10px;width:360px;height:400px;overflow:hidden;z-index:99999;background:white";
      const stage = document.createElement("div"); stage.style.transformOrigin = "0 0";
      const fragment = document.querySelector("#thread-explorer-node-template").content.cloneNode(true);
      const item = fragment.querySelector(".thread-explorer-node-item"); item.dataset.uri = "at://fixture/card";
      const card = fragment.querySelector(".thread-explorer-post-card"); card.id = "focus-fixture-card";
      card.style.cssText = "display:block;width:200px;height:120px;box-sizing:border-box;background:#eee";
      const control = document.createElement("button"); control.id = "focus-fixture-control"; control.textContent = "Control"; card.append(control);
      stage.append(fragment); host.append(stage); document.body.append(host);
      const state = { viewport: { zoom: 0.8, panX: 10, panY: 15 }, focus: null, selected: [] };
      const apply = value => { state.viewport = { zoom: value.zoom, panX: value.panX, panY: value.panY }; stage.style.transform = `translate(${value.panX}px, ${value.panY}px) scale(${value.zoom})`; };
      apply(state.viewport);
      const controller = createThreadExplorerCardFocusController({
        getFocus: () => state.focus, setFocus: value => { state.focus = value; },
        getViewport: () => state.viewport, setViewport: apply,
        getBounds: () => ({ left: 0, top: 0, width: 200, height: 120 }),
        fit: (bounds,limits) => apply(calculateThreadExplorerViewportFit(bounds, { width: 360, height: 400 }, limits)),
        select: uri => state.selected.push(uri), isInteractive: target => Boolean(target.closest("button")),
        isNativeInteractive: target => Boolean(target.closest("button")), now: () => Date.now(),
        setTimeout: (callback,delay) => setTimeout(callback,delay), clearTimeout: timer => clearTimeout(timer),
      });
      card.addEventListener("click",controller.click); card.addEventListener("dblclick",controller.doubleClick);
      card.addEventListener("pointerup",controller.pointerUp);
      window.__focusFixture = state;
    });
    const card = page.locator("#focus-fixture-card"); const before = await card.boundingBox();
    await card.dispatchEvent("click");
    await expect.poll(() => page.evaluate(() => window.__focusFixture.selected.length)).toBe(1);
    await card.evaluate(element => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    await expect.poll(() => page.evaluate(() => window.__focusFixture.viewport.zoom)).toBeGreaterThan(1.3);
    const focused = await card.boundingBox(); expect(focused.width).toBeGreaterThan(before.width);
    const host = await page.locator("#focus-fixture").boundingBox();
    expect(focused.x).toBeGreaterThanOrEqual(host.x); expect(focused.x+focused.width).toBeLessThanOrEqual(host.x+host.width+1);
    await page.locator("#focus-fixture-control").dispatchEvent("dblclick");
    expect(await page.evaluate(() => window.__focusFixture.focus?.uri)).toBe("at://fixture/card");
    await card.dispatchEvent("dblclick");
    expect(await page.evaluate(() => window.__focusFixture.viewport)).toEqual({ zoom: 0.8, panX: 10, panY: 15 });
    const restored = await card.boundingBox(); expect(restored.width).toBeCloseTo(before.width, 1);
    await card.evaluate(element => {
      element.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true, cancelable: true }));
      element.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true, cancelable: true }));
    });
    expect(await page.evaluate(() => window.__focusFixture.focus?.uri)).toBe("at://fixture/card");
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.__focusFixture.selected.length)).toBe(1);
    expect(errors).toEqual([]);
  });
  test(`explorer pan controller moves a rendered template and stops from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    const result = await page.evaluate(async () => {
      const tools = await import("/js/tools/thread-explorer.js");
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:20px;top:20px;width:300px;height:200px;overflow:hidden;z-index:99999";
      const stage = document.createElement("div");
      stage.append(document.querySelector("#thread-explorer-node-template").content.cloneNode(true));
      host.append(stage); document.body.append(host);
      let x = 0; let y = 0; let edges = 0;
      const controller = tools.createThreadExplorerPanController({
        requestFrame: callback => requestAnimationFrame(callback), cancelFrame: frame => cancelAnimationFrame(frame),
        now: () => performance.now(), isDragging: () => false,
        setPanning: active => tools.setThreadExplorerPanningMode({ tree: host, stage }, active),
        move: (dx,dy) => { x += dx; y += dy; stage.style.transform = `translate(${x}px, ${y}px)`; },
        renderEdges: () => { edges++; }, minVelocity: 0.35, stopVelocity: 0.04, friction: 0.92,
      });
      const before = stage.getBoundingClientRect();
      const state = { value: { pointerId: 1, started: true, velocityX: 1, velocityY: -0.5 } };
      tools.handleThreadExplorerPointerUp({ pointerId: 1 }, state, {
        releasePointer: () => {}, setVelocity: controller.setVelocity, startInertia: controller.start,
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const after = stage.getBoundingClientRect(); const active = controller.isActive();
      controller.cancel(); const stoppedAt = x;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const stopped = x === stoppedAt && !controller.isActive() && !stage.classList.contains("is-panning");
      controller.setVelocity(0,0); controller.start();
      const result = { dx: after.left-before.left, dy: after.top-before.top, active, stopped, edges, released: state.value === null };
      host.remove(); return result;
    });
    expect(result.dx).toBeGreaterThan(0); expect(result.dy).toBeLessThan(0);
    expect(result).toMatchObject({ active: true, stopped: true, edges: 1, released: true });
    expect(errors).toEqual([]);
  });
}

for (const pathname of ["/", "/tools.html"]) {
test(`classic worker loads the real service-worker imports and search query callers from ${pathname}`, async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepareSearch(page);
  await page.route("**/search-worker-harness.js", route => route.fulfill({ contentType: "text/javascript", body: `
    importScripts("/sw.js");
    self.onmessage = async (event) => {
      const payload = event.data;
      const variants = buildSearchWorkspaceSearchVariants(payload);
      const keys = variants.map((entry) => entry.key);
      const cursors = Object.fromEntries(keys.map((key) => [key, "cursor-" + key]));
      const encoded = buildSearchWorkspaceSearchCursorState(cursors, new Set([keys[1]]), keys);
      const restored = parseSearchWorkspaceSearchCursorState(encoded, keys);
      const post = { text: "word #a", langs: ["de"], author: { handle: "own.test" }, createdAt: "2026-10-19" };
      const linked = { ...post, images: [{}], facets: [{ features: [
        { $type: "app.bsky.richtext.facet#mention", did: "did:example:friend" },
        { $type: "app.bsky.richtext.facet#link", uri: "https://example.test/linked" },
      ] }] };
      const transportCalls = [];
      const service = globalThis.createThreadlineSearchService({
        queries: globalThis.ThreadlineSearchQueries, filters: searchFilters,
        session: async () => ({ session: { accessJwt: "fixture-token" } }), refresh: async auth => auth,
        base: () => "https://fixture.test/xrpc",
        request: async (method, params) => {
          transportCalls.push({ method, params });
          return { posts: [{ uri: "at://did:example:worker/app.bsky.feed.post/partial", cid: "cid",
            author: { did: "did:example:worker", handle: "worker.test" },
            record: { $type: "app.bsky.feed.post", text: "word #a", langs: ["de"], createdAt: "2026-10-19" },
          }], cursor: "resume" };
        },
      });
      const loaded = await service.load({ query: "word", runId: "browser", langs: ["de"] }, () => service.control({ runId: "browser", action: "cancel" }));
      self.postMessage({ keys, version: APP_VERSION,
        params: buildSearchWorkspaceSearchPostsParams(variants[0].payload, variants[0].forcedLang),
        cursors: restored.cursors, exhausted: [...restored.exhausted],
        matches: searchFilters.matches(post, { query: "word", tags: ["a"], langs: ["de"] }),
        rejects: searchFilters.matches(post, { query: "missing" }),
        linked: searchFilters.matches(linked, { mentions: "did:example:friend", domain: "example.test", url: "https://example.test/linked", mediaFilter: "images", postTypeFilter: "originals" }),
        rejectedLink: searchFilters.matches(linked, { domain: "different.test" }),
        loaded: { count: loaded.items.length, uri: loaded.items[0]?.post?.uri, cancelled: loaded.cancelled, cursor: loaded.cursor },
        transportCalls, wired: loadSearchResults === searchService.load && setSearchRunControl === searchService.control,
        dm: {
          wired: normalizeDmMessageEntity === dmModels.normalizeDmMessageEntity && normalizeDmConversationEntity === dmModels.normalizeDmConversationEntity,
          filters: normalizeDmFilters({ participantDid: " did:peer ", from: "2026-10-19" }),
          from: normalizeDmDateFilterValue("2026-10-19"), to: normalizeDmDateFilterValue("2026-10-19", true),
          conversation: normalizeDmConversationEntity({ id: "conversation", members: [{ did: "self" }, { did: "peer", handle: "peer.test" }] }, "self"),
          message: normalizeDmMessageEntity({ sender: { did: "peer" }, message: { text: "literal <text>", facets: [{ index: 1 }] } }, "conversation"),
          card: extractDmExternalCardFromEmbedSw({ media: { external: { uri: "https://example.test/dm", thumbnail: { url: "thumb" } } } }),
        },
      });
    };
  ` }));
  await page.goto(pathname, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = new Worker("/search-worker-harness.js");
    worker.onerror = error => { worker.terminate(); reject(new Error(error.message)); };
    worker.onmessage = event => { worker.terminate(); resolve(event.data); };
    worker.postMessage({ query: "word", langs: ["de", "en"], tags: ["a", "b"], tagMatchMode: "any" });
  }));
  expect(result.keys).toEqual(["de|a", "de|b", "en|a", "en|b"]);
  expect(result.params).toMatchObject({ q: "word", tag: ["a"], lang: "de", sort: "latest" });
  expect(result.exhausted).toEqual(["de|b"]);
  expect(result.cursors["en|a"]).toBe("cursor-en|a");
  expect(result.matches).toBe(true); expect(result.rejects).toBe(false);
  expect(result.linked).toBe(true); expect(result.rejectedLink).toBe(false);
  expect(result.loaded).toEqual({ count: 1, uri: "at://did:example:worker/app.bsky.feed.post/partial", cancelled: true, cursor: "resume" });
  expect(result.transportCalls).toHaveLength(1);
  expect(result.transportCalls[0]).toMatchObject({ method: "app.bsky.feed.searchPosts", params: { q: "word", lang: "de" } });
  expect(result.wired).toBe(true);
  expect(result.dm.wired).toBe(true);
  expect(result.dm.filters).toEqual({ participantDid: "did:peer", from: "2026-10-19", to: "" });
  expect(result.dm.to-result.dm.from).toBe(86399999);
  expect(result.dm.conversation).toMatchObject({ id: "conversation", participantCount: 1, memberHandles: ["peer.test"] });
  expect(result.dm.message).toMatchObject({ convoId: "conversation", text: "literal <text>", senderDid: "peer", facets: [{ index: 1 }] });
  expect(result.dm.message.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(result.dm.card).toMatchObject({ url: "https://example.test/dm", thumb: "thumb" });
  expect(result.version).toBe(require("../version.json").cacheVersion);
  expect(errors).toEqual([]);
});
}

/** Installs deferred worker search replies and reloadable settings.
 * @param {object} page - Browser page. @returns {Promise<void>} Fixture installed.
 */
async function prepareSearch(page) {
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).hostname === "127.0.0.1") {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  await page.addInitScript(() => {
    localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
    const account = { did: "did:example:search", handle: "search.test", identifier: "search.test", service: "https://bsky.social" };
    const state = { calls: [], pending: [], saved: null };
    window.__search = state;
    window.__finishSearch = (index, result, error) => {
      const entry = state.pending[index];
      if (error) {
        entry.port.postMessage({ ok: false, error });
      } else {
        entry.port.postMessage({ ok: true, result });
      }
    };
    window.__searchItem = (id) => ({ post: {
      uri: `at://did:example:search/app.bsky.feed.post/${id}`, cid: id, text: `word ${id} <b>literal</b>`,
      author: { did: account.did, handle: account.handle, displayName: "Search author" },
      createdAt: "2026-10-18T12:00:00Z", images: [], facets: [], counts: { likeCount: 1 },
    } });
    const registration = { update: async () => {}, active: { postMessage(message, ports) {
      state.calls.push(message);
      let result = null;
      if (message.type === "GET_APP_STATE") {
        result = { ...account, accounts: [account], ...JSON.parse(sessionStorage.getItem("search-test-settings") || "{}"), localePreference: "en", locale: "en", desktopLayoutVersion: 2 };
      } else if (message.type === "VERIFY_SESSION") {
        result = { ...account, accounts: [account], authenticated: true };
      } else if (message.type === "SAVE_SETTINGS") {
        state.saved = message.payload;
        sessionStorage.setItem("search-test-settings", JSON.stringify(message.payload));
      } else if (message.type === "LOAD_SEARCH_RESULTS") {
        state.pending.push({ payload: message.payload, port: ports[0] });
        return;
      }
      ports[0].postMessage({ ok: true, result });
    } } };
    Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
    Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
  });
}

/** Opens the search workspace through a real page entry point.
 * @param {object} page - Page. @param {string} pathname - Initial path. @returns {Promise<void>} Search visible.
 */
async function openSearch(page, pathname) {
  await page.goto(pathname, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#language-select")).toHaveValue("en");
  if (pathname === "/") {
    await page.locator('[data-page-target="tools"]').click();
    await expect(page).toHaveURL(/\/tools\.html$/);
    await expect(page.locator("#language-select")).toHaveValue("en");
  }
  await expect(page.locator("#search-workspace")).toBeVisible();
}

for (const pathname of ["/", "/tools.html"]) {
  test(`Explorer viewport geometry fits measured cards on ${pathname}`, async ({ page }, testInfo) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    for (const width of [390, 1100]) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page.evaluate(async width => {
        const geometry = await import("/js/tools/thread-explorer-layout.js");
        document.getElementById("geometry-fixture")?.remove();
        const viewport = document.createElement("div"); viewport.id = "geometry-fixture";
        Object.assign(viewport.style, { position: "fixed", left: "16px", top: "16px", width: (width - 32) + "px", height: "500px", padding: "0", overflow: "hidden", background: "#f3f7ff", zIndex: "99999" });
        const stage = document.createElement("div");
        Object.assign(stage.style, { position: "absolute", left: "0", top: "0", transformOrigin: "0 0" });
        viewport.append(stage); document.body.append(viewport);
        const cards = [];
        for (const [index, position] of [[-280, -100], [200, 150], [600, 350]].entries()) {
          const fragment = document.getElementById("thread-explorer-node-template").content.cloneNode(true);
          const card = fragment.querySelector(".thread-explorer-post-card");
          card.textContent = "Measured card " + (index + 1);
          Object.assign(card.style, { position: "absolute", left: position[0] + "px", top: position[1] + "px", width: "260px", height: "160px", minWidth: "0", maxWidth: "none", margin: "0", padding: "20px" });
          stage.append(card); cards.push(card);
        }
        const viewportRect = viewport.getBoundingClientRect();
        const boxes = cards.map(card => geometry.getThreadExplorerStageBoxFromRects(card.getBoundingClientRect(), viewportRect, { zoom: 1, panX: 0, panY: 0 }));
        const bounds = geometry.getThreadExplorerContentBounds(boxes);
        const fit = geometry.calculateThreadExplorerViewportFit(bounds, { width: viewport.clientWidth, height: viewport.clientHeight });
        stage.style.transform = "translate(" + fit.panX + "px, " + fit.panY + "px) scale(" + fit.zoom + ")";
        await new Promise(resolve => requestAnimationFrame(resolve));
        const measured = cards.map(card => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        const restored = cards.map(card => geometry.getThreadExplorerStageBoxFromRects(card.getBoundingClientRect(), viewportRect, fit));
        return { measured, boxes, restored, fit, viewport: { left: viewportRect.left, right: viewportRect.right, top: viewportRect.top, bottom: viewportRect.bottom } };
      }, width);
      expect(result.fit.zoom).toBeGreaterThan(0);
      for (const [index, rect] of result.measured.entries()) {
        expect(rect.left).toBeGreaterThanOrEqual(result.viewport.left - 0.01);
        expect(rect.right).toBeLessThanOrEqual(result.viewport.right + 0.01);
        expect(rect.top).toBeGreaterThanOrEqual(result.viewport.top - 0.01);
        expect(rect.bottom).toBeLessThanOrEqual(result.viewport.bottom + 0.01);
        expect(result.restored[index].left).toBeCloseTo(result.boxes[index].left, 3);
        expect(result.restored[index].top).toBeCloseTo(result.boxes[index].top, 3);
      }
      await page.locator("#geometry-fixture").screenshot({ path: testInfo.outputPath(`explorer-fit-${width}.png`) });
    }
    expect(errors).toEqual([]);
  });

  test(`snapshot export controller cleans up success and cancellation on ${pathname}`, async ({ page }, testInfo) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page);
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async () => {
      const { createThreadExplorerSnapshotExportController } = await import("/js/tools/thread-explorer-snapshot.js");
      const { translations } = await import("/js/core/app-i18n.js");
      const byId = id => document.getElementById(id);
      const button = byId("thread-explorer-snapshot-png-button");
      const cancel = byId("thread-explorer-snapshot-cancel-button");
      window.__snapshotTest = { reports: [], downloads: 0, finish: null };
      const controller = createThreadExplorerSnapshotExportController({
        exportButton: button, cancelButton: cancel, dialog: byId("thread-explorer-snapshot-progress-dialog"),
        title: byId("thread-explorer-snapshot-progress-title"), step: byId("thread-explorer-snapshot-progress-step"),
        detail: byId("thread-explorer-snapshot-progress-detail"), fill: byId("thread-explorer-snapshot-progress-fill"),
        bar: byId("thread-explorer-snapshot-progress-bar"), status: byId("thread-explorer-thread-status"),
      }, {
        t: key => translations.en[key] || key, fileName: () => "controller-snapshot.png",
        render: async (mime, progress) => {
          await progress({ percent: 62, step: "Rendering fixture", detail: "<b>literal progress</b>" });
          return new Promise(resolve => { window.__snapshotTest.finish = resolve; });
        },
        downloadBlob: blob => {
          window.__snapshotTest.downloads += 1;
          const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "controller-snapshot.png";
          link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        },
        frame: () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        wait: delay => new Promise(resolve => setTimeout(resolve, delay)), abortController: () => new AbortController(),
        refresh: () => { button.disabled = false; }, report: error => window.__snapshotTest.reports.push(error.message),
      });
      cancel.addEventListener("click", controller.cancel);
      window.__snapshotController = controller;
      window.__snapshotPng = async () => {
        const canvas = document.createElement("canvas"); canvas.width = 8; canvas.height = 6;
        canvas.getContext("2d").fillRect(0, 0, 8, 6);
        return new Promise(resolve => canvas.toBlob(resolve));
      };
      void controller.download();
    });
    const dialog = page.locator("#thread-explorer-snapshot-progress-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#thread-explorer-snapshot-progress-detail")).toHaveText("<b>literal progress</b>");
    await expect(page.locator("#thread-explorer-snapshot-progress-detail b")).toHaveCount(0);
    await expect(page.locator("#thread-explorer-snapshot-progress-bar")).toHaveAttribute("aria-valuenow", "62");
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath("snapshot-progress.png") });
    const downloadPromise = page.waitForEvent("download");
    await page.evaluate(async () => window.__snapshotTest.finish(await window.__snapshotPng()));
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("controller-snapshot.png");
    await download.saveAs(testInfo.outputPath("controller-snapshot.png"));
    const bytes = await require("node:fs/promises").readFile(await download.path());
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(dialog).toBeHidden();
    await page.evaluate(() => { window.__snapshotTest.finish = null; void window.__snapshotController.download(); });
    await expect.poll(() => page.evaluate(() => Boolean(window.__snapshotTest.finish))).toBe(true);
    await page.locator("#thread-explorer-snapshot-cancel-button").click();
    await page.evaluate(async () => window.__snapshotTest.finish(await window.__snapshotPng()));
    await expect(dialog).toBeHidden();
    await expect(page.locator("#thread-explorer-thread-status")).toContainText(/cancelled/i);
    expect(await page.evaluate(() => window.__snapshotTest.downloads)).toBe(1);
    expect(await page.evaluate(() => window.__snapshotTest.reports)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`search continuation, form identity, URL import and reload work from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await openSearch(page, pathname);
    await page.locator("#search-mode-select").selectOption("posts");
    await page.locator("#search-query-input").fill("word");
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(1);
    expect(await page.evaluate(() => window.__search.pending[0].payload)).toMatchObject({ mode: "posts", actor: "search.test", query: "word", cursor: "", limit: 25 });
    await page.evaluate(() => window.__search.pending[0].port.postMessage({ progress: { mode: "posts", actor: "search.test", pageCount: 2, scannedCount: 7, matchCount: 1 } }));
    await expect(page.locator("#search-status")).toContainText("7");
    await expect(page.locator("#search-cancel-button")).toBeVisible();
    await page.evaluate(() => window.__finishSearch(0, { items: [window.__searchItem("one")], cursor: "next" }));
    await expect(page.locator(".search-result-item")).toHaveCount(1);
    await expect(page.locator("#search-more-button")).toBeVisible();
    await expect(page.locator("#search-actor-input")).toHaveValue("");
    await page.locator("#search-query-input").fill("changed");
    await expect(page.locator("#search-more-button")).toBeHidden();
    await page.locator("#search-query-input").fill("word");
    await expect(page.locator("#search-more-button")).toBeVisible();
    await page.locator("#search-more-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(2);
    expect(await page.evaluate(() => window.__search.pending[1].payload.excludeUris)).toEqual(["at://did:example:search/app.bsky.feed.post/one"]);
    await page.evaluate(() => window.__finishSearch(1, { items: [window.__searchItem("two")], cursor: "next-two" }));
    await expect(page.locator(".search-result-item")).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => window.__search.saved?.searchResultState?.items.length)).toBe(2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".search-result-item")).toHaveCount(2);
    await expect(page.locator("#search-more-button")).toBeVisible();
    await expect(page.locator("#search-status")).toContainText("2 results loaded");
    await expect(page.locator(".thread-explorer-post-text").first()).toContainText("<b>literal</b>");
    await expect(page.locator(".thread-explorer-post-text b")).toHaveCount(0);
    await page.locator("#search-clear-button").click();
    await expect(page.locator(".search-result-item")).toHaveCount(0);
    await page.locator("#search-url-input").fill("https://bsky.app/search?q=word+-skip&author=other.test&tag=topic&lang=de");
    await page.locator("#search-url-input").press("Tab");
    await expect(page.locator("#search-query-input")).toHaveValue("word");
    await expect(page.locator("#search-exclude-text-input")).toHaveValue("skip");
    await expect(page.locator("#search-mode-select")).toHaveValue("hashtags");
    await expect(page.locator("#search-hashtag-summary")).toContainText("#topic");
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(1);
    expect(await page.evaluate(() => window.__search.pending[0].payload)).toMatchObject({ actor: "other.test", tags: ["topic"], langs: ["de"] });
    await page.evaluate(() => window.__finishSearch(0, { items: [window.__searchItem("url")], cursor: "url-next" }));
    await expect(page.locator("#search-more-button")).toBeVisible();
    await page.locator("#search-sort-select").selectOption("top");
    await page.locator("#search-language-button").click();
    await page.locator('#post-languages-list input[value="en"]').check();
    await page.locator("#post-languages-close-top").click();
    await expect(page.locator("#search-sort-select")).toHaveValue("latest");
    await expect(page.locator('#search-sort-select option[value="top"]')).toHaveAttribute("disabled", "");
    expect(errors).toEqual([]);
  });

  test(`search cancellation, reset and stale replies stay isolated from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await openSearch(page, pathname);
    await page.locator("#search-query-input").fill("word");
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(1);
    await page.locator("#search-cancel-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.calls.filter(call => call.type === "SET_SEARCH_RUN_CONTROL").length)).toBe(1);
    await page.evaluate(() => window.__finishSearch(0, { items: [window.__searchItem("partial")], cancelled: true }));
    await expect(page.locator("#search-status")).toContainText("Search cancelled");
    await expect(page.locator(".search-result-item")).toHaveCount(1);
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(2);
    await page.locator("#search-clear-button").click();
    await expect(page.locator(".search-result-item")).toHaveCount(0);
    await page.locator("#search-query-input").fill("fresh");
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(3);
    await page.evaluate(() => {
      window.__search.pending[1].port.postMessage({ progress: { mode: "posts", scannedCount: 999 } });
      window.__finishSearch(1, { items: [window.__searchItem("stale")], cursor: "stale" });
    });
    await expect(page.locator("#search-run-button")).toBeDisabled();
    await expect(page.locator(".search-result-item")).toHaveCount(0);
    await page.evaluate(() => window.__finishSearch(2, { items: [window.__searchItem("fresh")] }));
    await expect(page.locator(".search-result-item")).toHaveCount(1);
    await expect(page.locator(".search-result-item")).toHaveAttribute("data-uri", /fresh$/);
    await page.locator("#search-run-button").click();
    await expect.poll(() => page.evaluate(() => window.__search.pending.length)).toBe(4);
    await page.evaluate(() => window.__finishSearch(3, null, "Controlled search error"));
    await expect(page.locator("#search-status")).toHaveText("Controlled search error");
    await expect(page.locator("#search-run-button")).toBeEnabled();
    await page.locator("#search-clear-button").click();
    await page.locator("#search-url-input").fill("invalid");
    await page.locator("#search-url-input").dispatchEvent("change");
    await expect(page.locator("#search-url-status")).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}

for (const pathname of ["/", "/tools.html"]) {
  test(`final translation and rich-text module contracts render from ${pathname}`, async ({ page }) => {
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.locator("#language-select").selectOption("de", { force: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.locator("#language-select").selectOption("fr", { force: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    const result = await page.evaluate(async () => {
      const { createApplicationTranslationRenderer } = await import("/js/core/app-i18n.js");
      const { createRichTextPresentation } = await import("/js/shared/shared-post-rendering.js");
      let invalid = false; try { createApplicationTranslationRenderer({ bindings: null }); } catch (error) { invalid = error instanceof TypeError; }
      const host = document.createElement("div"); host.textContent = "literal <img> Word word"; document.body.append(host);
      const renderer = createRichTextPresentation({ document, nodeFilter: NodeFilter, queryTerms: () => ["word"], escape: value => value });
      renderer.highlight(host, "word"); renderer.highlight(host, "word");
      const highlighted = host.querySelectorAll("mark").length, nested = host.querySelectorAll("mark mark").length;
      renderer.clear(host); const text = host.textContent, remaining = host.querySelectorAll("mark,img").length; host.remove();
      return { invalid, highlighted, nested, text, remaining };
    });
    expect(result).toEqual({ invalid: true, highlighted: 2, nested: 0, text: "literal <img> Word word", remaining: 0 });
    expect(errors).toEqual([]);
  });
}

test("archive export cards fit the entire mobile viewport", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await prepareSearch(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/tools.html");
  await expect(page.locator("#archive-button")).toBeEnabled(); await page.locator("#archive-button").click();
  const cards = page.locator("#archive-workspace .archive-export-card"); await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    const bounds = await card.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  }
  expect(errors).toEqual([]);
});

for (const pathname of ["/", "/tools.html"]) {
  test(`translation markup and post edit controllers have independent DOM contracts on ${pathname}`, async ({page}) => {
    const errors=[]; page.on("pageerror", error=>errors.push(error.message));
    await prepareSearch(page); await page.goto(pathname); await expect(page.locator("html")).toHaveAttribute("lang","en");
    const result=await page.evaluate(async()=>{
      const {createApplicationTranslationRenderer}=await import("/js/core/app-i18n.js");
      const {createPostEditCheckController}=await import("/js/tools/archive.js");
      const {getCurrentPostEditTokenStates}=await import("/js/shared/shared-post-rendering.js");
      const layout=await import("/js/tools/thread-explorer-layout.js");
      const {setAttrs}=await import("/js/core/app-utils.js");
      const item=document.querySelector("#thread-explorer-node-template").content.firstElementChild.cloneNode(true);
      const emptyNode=document.createElement("div"),children=item.querySelector(":scope > .thread-explorer-children");
      const child=document.createElement("li");child.className="thread-explorer-node-item";children.append(child,document.createElement("li"));
      setAttrs(emptyNode,{title:"literal <b>","aria-hidden":false,"data-ignore":null});setAttrs(null,{});
      const helpers={children:layout.getRenderedThreadExplorerChildItems(item).length,card:Boolean(layout.getRenderedThreadExplorerCard(item)),
        emptyChildren:layout.getRenderedThreadExplorerChildItems(emptyNode).length,emptyCard:layout.getRenderedThreadExplorerCard(emptyNode),
        title:emptyNode.title,aria:emptyNode.getAttribute("aria-hidden"),ignored:emptyNode.hasAttribute("data-ignore")};
      const root=document.createElement("section"); document.body.append(root);
      const label=document.createElement("span"); label.dataset.i18n="label"; root.append(label);
      const input=document.createElement("input"); input.dataset.i18nPlaceholder="input"; input.dataset.i18nTitle="title";root.append(input);
      const image=document.createElement("img");image.dataset.i18nAlt="image";root.append(image);
      let language="en";
      const translator=createApplicationTranslationRenderer({document:{documentElement:root,querySelectorAll:selector=>root.querySelectorAll(selector)},translate:key=>language+":"+key,locale:()=>language});
      translator.render(); const first=label.textContent; language="fr";
      const extra=document.createElement("span");extra.dataset.i18n="late";root.append(extra);translator.render();
      const translated={first,second:label.textContent,placeholder:input.placeholder,title:input.title,aria:input.getAttribute("aria-label"),alt:image.alt,late:extra.textContent,language:root.lang};
      const elements={};for(const key of ["current","status","created","updated","original","result"])elements[key]=document.createElement("div");
      elements.url=document.createElement("input");elements.dialog=document.createElement("dialog");root.append(elements.dialog);for(const element of Object.values(elements))if(element!==elements.dialog)elements.dialog.append(element);
      const calls=[];let response={isEdited:true,originalText:"old text",text:"new text",createdAt:"created",updatedAt:"updated"},source="https://example.test/post";
      const adapters={document,translate:key=>key,timestamp:value=>"date:"+value,compare:getCurrentPostEditTokenStates,
        request:async(...args)=>{calls.push(args);if(response instanceof Error)throw response;return response;},schedule:callback=>callback(),source:()=>source};
      let invalid=false;try{createPostEditCheckController(elements,{...adapters,request:null});}catch(error){invalid=error instanceof TypeError;}
      const controller=createPostEditCheckController(elements,adapters);controller.open();await controller.check();
      const edited={text:elements.current.textContent,mark:elements.current.querySelector("mark").textContent,created:elements.created.textContent,visible:!elements.result.hidden};
      controller.reset();const reset=elements.current.childNodes.length===0&&elements.result.hidden;
      response={isEdited:false};await controller.check();const unchanged=elements.status.classList.contains("is-unedited");
      response=Error("offline");let failed=false;try{await controller.check();}catch(error){failed=error.message==="offline";}
      elements.url.value=" ";let empty=false;try{await controller.check();}catch(error){empty=error.message==="postEditCheckInvalidUrl";}
      source="new source";controller.open();const liveSource=elements.url.value;controller.close();controller.close();
      const closed=!elements.dialog.open;root.remove();return {translated,edited,invalid,reset,unchanged,failed,empty,liveSource,closed,helpers,calls:calls.map(call=>[call[0],call[1].url,call[2].timeoutMs])};
    });
    expect(result.translated).toEqual({first:"en:label",second:"fr:label",placeholder:"fr:input",title:"fr:title",aria:"fr:title",alt:"fr:image",late:"fr:late",language:"fr"});
    expect(result.edited).toEqual({text:"new text",mark:"new",created:"date:created",visible:true});
    expect(result.helpers).toEqual({children:1,card:true,emptyChildren:0,emptyCard:null,title:"literal <b>",aria:"false",ignored:false});
    expect(result).toMatchObject({invalid:true,reset:true,unchanged:true,failed:true,empty:true,liveSource:"new source",closed:true});
    expect(result.calls).toEqual(Array(3).fill(["CHECK_POST_EDIT","https://example.test/post",120000]));expect(errors).toEqual([]);
  });
}

for(const pathname of ["/","/tools.html"]){
  test(`account context ignores late actor results after a newer account selection on ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.ready,original=registration.active.postMessage;
      window.__actorRequests=[];
      registration.active.postMessage=(message,ports)=>{
        if(message.type==="LOAD_THREAD_EXPLORER_ACTOR_FEED"){window.__actorRequests.push({message,port:ports[0]});return;}
        original(message,ports);
      };
      const input=document.querySelector("#thread-explorer-account-input");input.value="alice.test";input.dispatchEvent(new Event("change"));
    });
    await expect.poll(()=>page.evaluate(()=>window.__actorRequests.length)).toBe(1);
    await page.evaluate(()=>{const input=document.querySelector("#thread-explorer-account-input");input.value="bob.test";input.dispatchEvent(new Event("change"));});
    await expect.poll(()=>page.evaluate(()=>window.__actorRequests.length)).toBe(2);
    await page.evaluate(()=>window.__actorRequests[1].port.postMessage({ok:true,result:{items:[window.__searchItem("bob")],cursor:""}}));
    await expect(page.locator("#thread-explorer-actor-feed-list")).toContainText("word bob");
    await page.evaluate(()=>window.__actorRequests[0].port.postMessage({ok:true,result:{items:[window.__searchItem("alice")],cursor:""}}));
    await expect(page.locator("#thread-explorer-actor-feed-list")).toContainText("word bob");
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    await expect(page.locator("#thread-explorer-actor-feed-list")).not.toContainText("word alice");
    await page.evaluate(()=>document.querySelector("#thread-explorer-use-own-account-button").dispatchEvent(new Event("click")));
    await expect(page.locator("#thread-explorer-account-input")).toHaveValue("search.test");expect(errors).toEqual([]);
  });
}

for(const pathname of ["/","/tools.html"]){
  test(`snapshot native adapters decode, encode and reject unusable images on ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("html")).toHaveAttribute("lang","en");
    const result=await page.evaluate(async()=>{
      const snapshot=await import("/js/tools/thread-explorer-snapshot.js");
      const rendering=await import("/js/tools/thread-explorer-rendering.js"),models=await import("/js/tools/thread-explorer.js");
      const host=document.createElement("div"),item=document.querySelector("#thread-explorer-node-template").content.firstElementChild.cloneNode(true);
      item.dataset.uri="at://card-fixture";const card=item.querySelector(".thread-explorer-post-card");card._threadExplorerPost={uri:"at://card-fixture"};host.append(item);document.body.append(host);
      let countRenders=0,interactionRenders=0,clicks=0;
      rendering.refreshLivePostCards("at://card-fixture",{document,counts:()=>countRenders++,searchCounts:()=>countRenders++,interactions:()=>interactionRenders++});
      rendering.refreshLivePostCard(null,{});rendering.refreshLivePostCards("",{document});
      const button=rendering.createLivePostActionButton("reply",{onClick:()=>clicks++},{document,translate:key=>key});host.append(button);button.click();
      const selectedText=document.createElement("span");selectedText.className="thread-explorer-post-text";
      const ui={countRenders,interactionRenders,clicks,label:button.textContent,native:models.isThreadExplorerInteractiveTarget(button,Element),selectable:models.isThreadExplorerInteractiveTarget(selectedText,Element),background:models.isThreadExplorerInteractiveTarget(host,Element),absent:models.isThreadExplorerInteractiveTarget(null,Element)};host.remove();
      const canvas=document.createElement("canvas");canvas.width=2;canvas.height=2;canvas.getContext("2d").fillRect(0,0,2,2);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve)),url=URL.createObjectURL(blob);
      const loaded=await snapshot.loadSnapshotCanvasImage(url,Image),encoded=snapshot.encodeSnapshotImageElement(loaded,document);
      const decoded=await snapshot.loadSnapshotCanvasImage(encoded,Image);URL.revokeObjectURL(url);
      return {ui,size:[loaded.naturalWidth,decoded.naturalHeight],encoded:encoded.startsWith("data:image/png"),
        passthrough:snapshot.encodeSnapshotImageElement(decoded,document)===encoded,empty:snapshot.encodeSnapshotImageElement(null,document),
        unloaded:snapshot.encodeSnapshotImageElement({src:"/pending.png",complete:false},document),
        absent:await snapshot.loadSnapshotCanvasImage("",Image),invalid:await snapshot.loadSnapshotCanvasImage("data:image/png;base64,AAAA",Image)};
    });
    expect(result).toEqual({ui:{countRenders:1,interactionRenders:1,clicks:1,label:"reply",native:true,selectable:true,background:false,absent:false},size:[2,2],encoded:true,passthrough:true,empty:"",unloaded:"",absent:null,invalid:null});expect(errors).toEqual([]);
  });
}

for(const pathname of ["/","/tools.html"]){
  test(`link card create and Enter handlers reach the module submission controller on ${pathname}`,async({page})=>{
    const errors=[];page.on("pageerror",error=>errors.push(error.message));await prepareSearch(page);await page.goto(pathname);
    await expect(page.locator("#language-select")).toHaveValue("en");
    await page.evaluate(()=>{const input=document.querySelector("#source-text");input.value="Draft text";input.dispatchEvent(new Event("input",{bubbles:true}));});
    await page.locator(".segment-link-card-manual-button").first().dispatchEvent("click");
    await expect(page.locator("#link-card-dialog")).toBeVisible();
    await page.locator("#link-card-url-input").fill("");await page.locator("#link-card-create-button").click();
    await expect(page.locator("#link-card-status")).toHaveAttribute("data-tone","error");
    await page.evaluate(()=>{const status=document.querySelector("#link-card-status");status.textContent="";delete status.dataset.tone;});
    await page.locator("#link-card-url-input").press("Enter");
    await expect(page.locator("#link-card-status")).toHaveAttribute("data-tone","error");expect(errors).toEqual([]);
  });
}
