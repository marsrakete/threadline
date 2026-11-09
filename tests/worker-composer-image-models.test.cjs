"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {archiveModelsFixture,plain}=require("./worker-archive-models-fixtures.cjs");
const {importProjectModule}=require("./module-test-helpers.cjs");
/** Creates deterministic worker image models. @returns {object} Factory, models and generated IDs. */
function fixture(){
 const f=archiveModelsFixture(),generated=[];
 const options={id:()=>{const id="image-"+(generated.length+1);generated.push(id);return id;},maxImages:2};
 const factory=f.context.createThreadlineComposerImageModels;
 return {factory,models:factory(options),options,generated};
}
const image={id:"one",dataUrl:"data:image/png;base64,YWJj",alt:"saved",type:"image/png"};
test("image model constructor validates ID generation and segment limits",()=>{
 const f=fixture();assert.throws(()=>f.factory(),/require id/);assert.throws(()=>f.factory({...f.options,id:null}),/require id/);
 for(const maxImages of [0,-1,1.5,NaN,"2"]){assert.throws(()=>f.factory({...f.options,maxImages}),/positive/);}
 assert.equal(Object.isFrozen(f.models),true);assert.deepEqual(Object.keys(f.models),["edit","image","segments","metadata","metadataSegments"]);
});
test("edit clamps zoom and normalizes rotation while preserving existing invalid-input behavior",()=>{
 const f=fixture();assert.deepEqual(plain(f.models.edit()),{zoom:1,offsetX:0,offsetY:0,flipX:false,flipY:false,rotation:0});
 const result=f.models.edit({zoom:99,offsetX:"3",offsetY:"bad",flipX:1,rotation:-450,fitMode:"cover"});
 assert.equal(result.zoom,3);assert.equal(result.offsetX,3);assert.equal(result.offsetY,0);assert.equal(result.rotation,270);assert.equal(result.flipX,true);assert.equal(Object.hasOwn(result,"fitMode"),false);
 assert.equal(f.models.edit({zoom:-1}).zoom,0.5);assert.throws(()=>f.models.edit(null));
});
test("image retains the worker record shape and clamps text and export settings",()=>{
 const f=fixture(),entry={...image,alt:"x".repeat(2005),originalSizeBytes:-2,exportQuality:2,exportScale:-1,validation:{sizeBytes:"12",tooBig:1,width:500,exceedsDimensions:true}};
 const result=f.models.image(entry);assert.equal(result.alt.length,2000);assert.equal(result.originalSizeBytes,0);assert.equal(result.exportQuality,0.92);assert.equal(result.exportScale,0.05);assert.deepEqual(plain(result.validation),{sizeBytes:12,tooBig:true});
 assert.equal(entry.alt.length,2005);assert.equal(f.generated.length,0);assert.equal(f.models.image({dataUrl:"inline"}).id,"image-1");
 assert.equal(f.models.image({...image,exportQuality:0,exportScale:0}).exportQuality,0.88);
});
test("image requires string inline data unless metadata mode is explicit",()=>{
 const f=fixture();for(const value of [undefined,null,false,"bad",{}, {dataUrl:3}]){assert.equal(f.models.image(value),null);}
 assert.equal(f.generated.length,0);
 const meta=f.models.image({id:"one"},{allowMissingDataUrl:true});assert.equal(meta.id,"one");assert.equal(Object.hasOwn(meta,"dataUrl"),false);
 assert.equal(f.models.image({id:"one"},{allowMissingDataUrl:1}),null);assert.throws(()=>f.models.image(image,null));
});
test("segments preserve positions, filter invalid images and apply limits after normalization",()=>{
 const f=fixture();const result=f.models.segments([[null,image,{dataUrl:"two"},{dataUrl:"three"}],null,[]]);
 assert.equal(result.length,3);assert.equal(result[0].length,2);assert.deepEqual(plain(result[1]),[]);assert.equal(f.generated.length,2);
 for(const value of [undefined,null,{},"bad"]){assert.deepEqual(plain(f.models.segments(value)),[]);}
});
test("metadata strips data without mutation and keeps images unavailable inline",()=>{
 const f=fixture(),result=f.models.metadata(image);assert.equal(Object.hasOwn(result,"dataUrl"),false);assert.equal(image.dataUrl.startsWith("data:"),true);assert.equal(f.models.metadata(null),null);
 const matrix=f.models.metadataSegments([[image,{id:"offline"},null,{id:"over-limit"}],null]);assert.deepEqual(plain(matrix[0].map(i=>i.id)),["one","offline"]);assert.deepEqual(plain(matrix[1]),[]);assert.deepEqual(plain(f.models.metadataSegments(null)),[]);
});
test("worker and frontend image contracts document their existing differences",async()=>{
 const f=fixture(),frontend=await importProjectModule("js/shared/shared-images.js");
 const raw={...image,edit:{zoom:2,fitMode:"cover"},validation:{sizeBytes:12,width:100,height:200,exceedsDimensions:true,tooBig:true}};
 const worker=f.models.image(raw),view=frontend.normalizeThreadImage(raw,{maxAltTextLength:2000,imageMinExportScale:0.05});
 assert.equal(view.edit.fitMode,"cover");assert.equal(Object.hasOwn(worker.edit,"fitMode"),false);assert.equal(view.validation.width,100);assert.equal(Object.hasOwn(worker.validation,"width"),false);
 assert.equal(worker.edit.zoom,view.edit.zoom);assert.equal(worker.alt,view.alt);assert.equal(worker.exportScale,view.exportScale);
 assert.equal(f.models.image({...image,dataUrl:42}),null);assert.equal(frontend.normalizeThreadImage({...image,dataUrl:42},{maxAltTextLength:2000}).dataUrl,42);
 assert.equal(f.models.metadata({id:"offline"}).id,"offline");assert.equal(frontend.normalizeThreadImage({id:"offline"},{maxAltTextLength:2000}),null);
});
