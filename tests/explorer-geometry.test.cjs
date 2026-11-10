"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

test("Explorer point zoom preserves the anchor and clamps both zoom limits", async () => {
  const { calculateThreadExplorerPointZoom: zoom } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const state = { zoom: 0.8, panX: -10, panY: 30 }; const bounds = { left: 100, top: 50 };
  for (const factor of [0, 0.5, 1, 2, 100]) {
    const result = zoom(state,bounds,factor,220,180);
    assert.equal(result.zoom, Math.min(2,Math.max(0.01,0.8*factor)));
    assert.ok(Math.abs((120-result.panX)/result.zoom-(120-state.panX)/state.zoom)<1e-9);
    assert.ok(Math.abs((130-result.panY)/result.zoom-(130-state.panY)/state.zoom)<1e-9);
  }
  assert.deepEqual(state,{ zoom:0.8,panX:-10,panY:30 });
});

test("Explorer point zoom rejects invalid viewport measurements and anchors", async () => {
  const { calculateThreadExplorerPointZoom: zoom } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const state={zoom:1,panX:0,panY:0}; const bounds={left:0,top:0};
  assert.equal(zoom(null,bounds,2,0,0),null); assert.equal(zoom(state,null,2,0,0),null);
  for (const invalid of [NaN,Infinity,undefined]) {
    assert.equal(zoom(state,bounds,invalid,0,0),null);
    assert.equal(zoom(state,bounds,2,invalid,0),null);
    assert.equal(zoom({...state,panY:invalid},bounds,2,0,0),null);
  }
  assert.equal(zoom({...state,zoom:0},bounds,2,0,0),null);
});

test("Explorer cluster node lookup handles branches, missing children and unknown identities", async () => {
  const { findThreadExplorerReplyClusterRenderNode: find } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const leaf={node:{post:{uri:"leaf"}}}; const tree={node:{post:{uri:"root"}},children:[null,{children:[leaf]}]};
  assert.equal(find(" leaf ",tree),leaf); assert.equal(find("root",tree),tree);
  assert.equal(find("unknown",tree),null); assert.equal(find("",tree),null); assert.equal(find("leaf",null),null);
  assert.equal(find("leaf",{children:"invalid"}),null);
});

test("Explorer neighborhood bounds include only own and immediate reply cards", async () => {
  const { getThreadExplorerCardNeighborhoodBounds: bounds } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const boxes=new Map(); const own={}; const child={};
  boxes.set(own,{left:10,top:20,width:100,height:80}); boxes.set(child,{left:-20,top:150,width:80,height:60});
  const item={dataset:{uri:"root"},querySelectorAll(selector) {
    assert.equal(selector,":scope > .thread-explorer-children > .thread-explorer-node-item > .thread-explorer-node > .thread-explorer-post-card");
    return [child];
  }};
  const options={clusterMode:false,getCard:()=>own,getBox:card=>boxes.get(card)};
  assert.deepEqual(bounds(item,options),{left:-20,top:20,width:130,height:190});
  assert.equal(bounds(null,options),null); assert.equal(bounds({dataset:{uri:""}},options),null);
});

test("Explorer cluster neighborhood excludes grandchildren and falls back to node items", async () => {
  const { getThreadExplorerCardNeighborhoodBounds: bounds } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const rootItem={dataset:{uri:"root"}}; const childItem={}; const grandchildItem={};
  const root={node:{post:{uri:"root"}},item:rootItem,children:[{item:childItem,children:[{item:grandchildItem}]}]};
  const measured=[]; const options={clusterMode:true,rootRenderNode:root,getCard:()=>null,getBox:item=>{
    measured.push(item); if(item===rootItem) return {left:0,top:0,width:100,height:100};
    return {left:200,top:0,width:50,height:80};
  }};
  assert.deepEqual(bounds(rootItem,options),{left:0,top:0,width:250,height:100});
  assert.deepEqual(measured,[rootItem,childItem]);
  assert.equal(bounds({dataset:{uri:"missing"}},options),null);
  assert.equal(bounds(rootItem,{...options,rootRenderNode:null}),null);
  assert.equal(bounds(rootItem,{...options,getBox:()=>null}),null);
});

test("Explorer stage rectangles invert zoom and pan without changing input measurements", async () => {
  const { getThreadExplorerStageBoxFromRects: convert } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const rect = { left: 160, top: 270, width: 400, height: 200 };
  const viewport = { left: 10, top: 20, width: 1000, height: 800 };
  assert.deepEqual(convert(rect, viewport, { zoom: 2, panX: 50, panY: 70 }), { left: 50, top: 90, width: 200, height: 100 });
  assert.deepEqual(rect, { left: 160, top: 270, width: 400, height: 200 });
  assert.equal(convert(rect, viewport, { zoom: -1 }).width, 400);
  assert.equal(convert(rect, viewport, { zoom: 0 }).width, 400);
  assert.equal(convert({ ...rect, width: 0 }, viewport), null);
  assert.equal(convert(null, viewport), null); assert.equal(convert(rect, {}), null);
});

test("Explorer stage bounds merge negative coordinates, clone new boxes and retain null identity", async () => {
  const { mergeThreadExplorerStageBounds: merge } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const first = { left: -100, top: 50, width: 200, height: 100 };
  const next = { left: 200, top: -20, width: 300, height: 200 };
  assert.deepEqual(merge(first, next), { left: -100, top: -20, width: 600, height: 200 });
  assert.deepEqual(merge(null, first), first); assert.notEqual(merge(null, first), first);
  assert.equal(merge(first, null), first); assert.equal(merge(null, null), null);
  assert.equal(merge(null, { ...next, left: NaN }), null);
  assert.deepEqual(first, { left: -100, top: 50, width: 200, height: 100 });
});

test("Explorer content bounds ignore hidden cards and reject poisoned measurements", async () => {
  const { getThreadExplorerContentBounds: collect } = await importProjectModule("js/tools/thread-explorer-layout.js");
  assert.deepEqual(collect([null, { left: -100, top: 50, width: 200, height: 100 }, { left: 200, top: -20, width: 300, height: 200 }]), { left: -100, top: -20, width: 600, height: 200 });
  assert.deepEqual(collect([{ left: 0, top: 0, width: 0, height: 0 }]), { left: 0, top: 0, width: 1, height: 1 });
  assert.equal(collect([]), null); assert.equal(collect([null]), null); assert.equal(collect(null), null);
  assert.equal(collect([{ left: Infinity, top: 0, width: 1, height: 1 }]), null);
});

test("Explorer viewport fit retains default padding, limits, center and custom caps", async () => {
  const { calculateThreadExplorerViewportFit: fit } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const bounds = { left: 100, top: 50, width: 1000, height: 500 };
  assert.deepEqual(fit(bounds, { width: 1000, height: 800 }), { zoom: 0.8, panX: 20, panY: 160 });
  assert.equal(fit({ left: 0, top: 0, width: 10, height: 10 }, { width: 1000, height: 800 }).zoom, 1.85);
  assert.equal(fit(bounds, { width: 1, height: 1 }).zoom, 0.08);
  assert.equal(fit(bounds, { width: 1000, height: 800 }, { minZoom: 0.1, maxZoom: 0.3 }).zoom, 0.3);
  assert.equal(fit(bounds, { width: 1000, height: 800 }, { minZoom: 0.9, maxZoom: 0.3 }).zoom, 0.3);
  assert.deepEqual(fit(bounds, { width: 1000, height: 800 }, null), fit(bounds, { width: 1000, height: 800 }));
});

test("Explorer fitted rectangles stay centered and contained when the minimum permits fitting", async () => {
  const { calculateThreadExplorerViewportFit: fit } = await importProjectModule("js/tools/thread-explorer-layout.js");
  for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 900 }]) {
    for (const width of [50, 1000, 10000]) {
      const bounds = { left: -240, top: -70, width, height: width / 2 };
      const result = fit(bounds, viewport, { minZoom: 0.0001 });
      const left = bounds.left * result.zoom + result.panX;
      const top = bounds.top * result.zoom + result.panY;
      assert.ok(left >= 0 && top >= 0);
      assert.ok(left + bounds.width * result.zoom <= viewport.width + 1e-8);
      assert.ok(top + bounds.height * result.zoom <= viewport.height + 1e-8);
      assert.ok(Math.abs(left + bounds.width * result.zoom / 2 - viewport.width / 2) < 1e-8);
      assert.ok(Math.abs(top + bounds.height * result.zoom / 2 - viewport.height / 2) < 1e-8);
    }
  }
});

test("Explorer fit rejects invalid bounds and viewport sizes without producing NaN transforms", async () => {
  const { calculateThreadExplorerViewportFit: fit } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const bounds = { left: 0, top: 0, width: 100, height: 100 };
  for (const invalid of [null, {}, { ...bounds, width: 0 }, { ...bounds, top: NaN }, { ...bounds, height: Infinity }]) {
    assert.equal(fit(invalid, { width: 390, height: 844 }), null);
  }
  assert.equal(fit(bounds, null), null); assert.equal(fit(bounds, { width: NaN, height: 100 }), null);
});
