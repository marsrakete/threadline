"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates zoom and reset controllers sharing a deterministic viewport and timer queue.
 * @returns {Promise<object>} Controllers, state and queued timers.
 */
async function zoomFixture() {
  const { createThreadExplorerZoomController,createThreadExplorerZoomResetController } = await importProjectModule("js/tools/thread-explorer-controller.js");
  const { calculateThreadExplorerPointZoom } = await importProjectModule("js/tools/thread-explorer-layout.js");
  const state={viewport:{zoom:0.8,panX:24,panY:32},renders:0,edges:0,fits:0};
  const timers=new Map(); let serial=0; let zoom;
  const reset=createThreadExplorerZoomResetController({getZoom:()=>state.viewport.zoom,setCenteredZoom:value=>zoom.atCenter(value),
    fit:()=>{state.fits++;},setTimeout:(callback,delay)=>{timers.set(++serial,{callback,delay});return serial;},clearTimeout:id=>timers.delete(id)});
  zoom=createThreadExplorerZoomController({getViewport:()=>state.viewport,setViewport:value=>{state.viewport=value;},
    getBounds:()=>({left:10,top:20,width:300,height:200}),calculatePointZoom:calculateThreadExplorerPointZoom,
    rememberZoom:reset.remember,render:()=>{state.renders++;},renderEdges:()=>{state.edges++;}});
  return {state,timers,zoom,reset,event:{preventDefault(){},stopPropagation(){}},
    flush(){for(const timer of [...timers.values()])timer.callback();}};
}

test("Explorer zoom controller synchronizes absolute, point and centered changes", async () => {
  const f=await zoomFixture(); f.zoom.setZoom(1.5);
  assert.deepEqual(f.state.viewport,{zoom:1.5,panX:24,panY:32}); assert.equal(f.state.renders,1); assert.equal(f.state.edges,0);
  f.zoom.atPoint(2,160,120); assert.equal(f.state.viewport.zoom,2); assert.equal(f.state.edges,1);
  const before={...f.state.viewport}; f.zoom.atCenter(0.5);
  assert.equal(f.state.viewport.zoom,0.5);
  assert.ok(Math.abs((150-before.panX)/before.zoom-(150-f.state.viewport.panX)/f.state.viewport.zoom)<1e-9);
  assert.ok(Math.abs((100-before.panY)/before.zoom-(100-f.state.viewport.panY)/f.state.viewport.zoom)<1e-9);
});

test("Explorer zoom controller ignores invalid zoom and anchors and retains clamp rules", async () => {
  const f=await zoomFixture();
  f.zoom.setZoom(NaN); f.zoom.atPoint(Infinity,10,20); f.zoom.atCenter(undefined);
  assert.equal(f.state.renders,0); assert.equal(f.state.edges,0);
  f.zoom.setZoom("3"); assert.equal(f.state.viewport.zoom,2);
  f.zoom.setZoom(-1); assert.equal(f.state.viewport.zoom,0.01);
});

test("Explorer reset defers fits, replaces pending clicks and ignores repeated-click detail", async () => {
  const f=await zoomFixture(); f.reset.click(); f.reset.click({detail:1}); f.reset.click({detail:2});
  assert.equal(f.timers.size,1); assert.equal([...f.timers.values()][0].delay,220);
  f.flush(); assert.equal(f.state.fits,1); assert.equal(f.timers.size,0);
  f.reset.click(); f.reset.cancel(); f.flush(); assert.equal(f.state.fits,1);
});

test("Explorer reset double click cancels fit and restores manual zoom around the center", async () => {
  const f=await zoomFixture(); f.zoom.setZoom(1.7); const original={...f.state.viewport};
  f.reset.click(); f.reset.doubleClick(f.event); assert.equal(f.state.viewport.zoom,1);
  f.flush(); assert.equal(f.state.fits,0);
  f.reset.doubleClick(f.event); assert.equal(f.state.viewport.zoom,1.7);
  assert.ok(Math.abs(f.state.viewport.panX-original.panX)<1e-9);
  assert.ok(Math.abs(f.state.viewport.panY-original.panY)<1e-9);
});

test("Explorer reset restores at least eight percent and uses default memory at 100 percent", async () => {
  const f=await zoomFixture(); f.zoom.setZoom(1); f.reset.doubleClick(f.event);
  assert.equal(f.state.viewport.zoom,1);
  f.zoom.setZoom(0.01); f.reset.doubleClick(f.event); assert.equal(f.state.viewport.zoom,1);
  f.reset.doubleClick(f.event); assert.equal(f.state.viewport.zoom,0.08);
});

/** Creates deterministic frame, drag and movement adapters.
 * @returns {Promise<object>} Controller and observable frame state.
 */
async function panFixture() {
  const { createThreadExplorerPanController } = await importProjectModule("js/tools/thread-explorer.js");
  const frames = new Map(); let serial = 0; let time = 0;
  const state = { moves: [], panning: false, edges: 0, dragging: false };
  const controller = createThreadExplorerPanController({
    requestFrame: callback => { frames.set(++serial, callback); return serial; },
    cancelFrame: frame => frames.delete(frame), now: () => time,
    isDragging: () => state.dragging, setPanning: value => { state.panning = value; },
    move: (x,y) => state.moves.push([x,y]), renderEdges: () => { state.edges++; },
    minVelocity: 0.35, stopVelocity: 0.04, friction: 0.92,
  });
  return { controller, frames, state, tick(elapsed = 16.67) {
    time += elapsed;
    const [id, callback] = frames.entries().next().value;
    frames.delete(id); callback(time);
  } };
}

test("inertial pan retains release velocity, moves and decays to a final edge render", async () => {
  const f = await panFixture();
  f.controller.setVelocity(1, -0.5); f.controller.start();
  assert.equal(f.controller.isActive(), true); assert.equal(f.state.panning, true);
  f.tick(); assert.deepEqual(f.state.moves[0], [16.67, -8.335]);
  for (let i = 0; f.controller.isActive() && i < 100; i++) f.tick();
  assert.equal(f.controller.isActive(), false); assert.equal(f.state.panning, false);
  assert.equal(f.state.edges, 1); assert.equal(f.frames.size, 0);
});

test("pan rejects invalid samples and velocity below the start threshold", async () => {
  const f = await panFixture();
  for (const sample of [[NaN, Infinity], [0.349, 0], [undefined, null]]) {
    f.controller.setVelocity(...sample); f.controller.start();
    assert.equal(f.controller.isActive(), false);
  }
  assert.equal(f.state.moves.length, 0); assert.equal(f.state.edges, 3);
  f.controller.setVelocity(0.35, 0); f.controller.start();
  assert.equal(f.controller.isActive(), true);
});

test("pan cancellation clears frames and velocity while preserving an active drag", async () => {
  const f = await panFixture();
  f.controller.setVelocity(1, 0); f.controller.start();
  f.state.dragging = true; f.controller.cancel();
  assert.equal(f.frames.size, 0); assert.equal(f.state.panning, true);
  f.state.dragging = false; f.controller.start();
  assert.equal(f.controller.isActive(), false); assert.equal(f.state.panning, false);
});

test("restarting pan replaces the old frame and handles a delayed frame", async () => {
  const f = await panFixture();
  f.controller.setVelocity(1, 0); f.controller.start();
  f.controller.setVelocity(-1, 0.5); f.controller.start();
  assert.equal(f.frames.size, 1); f.tick(1000);
  assert.deepEqual(f.state.moves[0], [-1000, 500]);
  assert.equal(f.controller.isActive(), false);
});

/** Creates isolated card, timer and viewport adapters.
 * @returns {Promise<object>} Event factory, controller and observable state.
 */
async function cardFixture() {
  const { createThreadExplorerCardFocusController } = await importProjectModule("js/tools/thread-explorer-controller.js");
  const timers = new Map(); let serial = 0;
  const state = { time: 1000, focus: null, viewport: { zoom: 0.8, panX: 24, panY: 32 }, selected: [], fits: [], bounds: { left: 1, top: 2, width: 100, height: 80 } };
  const controller = createThreadExplorerCardFocusController({
    getFocus: () => state.focus, setFocus: value => { state.focus = value; },
    getViewport: () => state.viewport, setViewport: value => { state.viewport = { zoom: value.zoom, panX: value.panX, panY: value.panY }; },
    getBounds: () => state.bounds, fit: (bounds,limits) => { state.fits.push({ bounds,limits }); state.viewport = { zoom: limits.minZoom, panX: 1, panY: 2 }; },
    select: uri => state.selected.push(uri), isInteractive: target => target === "interactive", isNativeInteractive: target => target === "native",
    now: () => state.time, setTimeout: (callback,delay) => { timers.set(++serial,{ callback,delay }); return serial; },
    clearTimeout: timer => timers.delete(timer),
  });
  return { state, timers, controller, event(uri = "at://card/one", target = "plain") {
    return { target, currentTarget: { closest: () => ({ dataset: { uri } }) }, pointerType: "touch", preventDefault() {}, stopPropagation() {} };
  }, flush() { for (const timer of [...timers.values()]) timer.callback(); } };
}

test("card selection defers 220ms, replaces pending selection and cancels cleanly", async () => {
  const f = await cardFixture(); f.controller.click(f.event());
  assert.equal([...f.timers.values()][0].delay, 220); assert.deepEqual(f.state.selected, []);
  f.controller.click(f.event("at://card/two")); assert.equal(f.timers.size, 1);
  f.flush(); assert.deepEqual(f.state.selected, ["at://card/two"]); assert.equal(f.timers.size, 0);
  f.controller.click(f.event()); f.controller.cancel(); f.flush();
  assert.deepEqual(f.state.selected, ["at://card/two"]);
});

test("double click cancels selection, fits focus and restores the saved viewport", async () => {
  const f = await cardFixture(); const before = { ...f.state.viewport };
  f.controller.click(f.event()); f.controller.doubleClick(f.event()); f.flush();
  assert.equal(f.state.fits.length, 1); assert.deepEqual(f.state.fits[0].limits, { minZoom: 1.35, maxZoom: 2 });
  assert.deepEqual(f.state.selected, []); assert.equal(f.state.focus.uri, "at://card/one");
  f.controller.doubleClick(f.event());
  assert.deepEqual(f.state.viewport, before); assert.equal(f.state.focus, null);
});

test("card handlers ignore controls, missing cards and absent bounds", async () => {
  const f = await cardFixture();
  f.controller.click(f.event(undefined,"interactive"));
  f.controller.doubleClick(f.event(undefined,"native")); f.controller.pointerUp(f.event(undefined,"native"));
  f.controller.click(f.event("")); f.controller.doubleClick({ ...f.event(), currentTarget: null });
  f.state.bounds = null; f.controller.doubleClick(f.event());
  assert.equal(f.timers.size, 0); assert.equal(f.state.fits.length, 0); assert.equal(f.state.focus, null);
});

test("touch focus respects target identity and inclusive 320ms double tap boundary", async () => {
  const f = await cardFixture();
  f.controller.pointerUp({ ...f.event(), pointerType: "mouse" });
  f.controller.pointerUp(f.event()); f.state.time += 321; f.controller.pointerUp(f.event());
  assert.equal(f.state.fits.length, 0);
  f.state.time += 320; f.controller.pointerUp(f.event()); assert.equal(f.state.fits.length, 1);
  f.controller.pointerUp(f.event()); assert.equal(f.state.focus.uri, "at://card/one");
  f.state.time += 100; f.controller.pointerUp(f.event("at://card/two")); assert.equal(f.state.fits.length, 1);
  f.state.time += 100; f.controller.pointerUp(f.event("at://card/two")); assert.equal(f.state.fits.length, 2);
});

test("card focus preserves high zoom and clamps its minimum to the maximum", async () => {
  const f = await cardFixture(); f.state.viewport.zoom = 1.8;
  f.controller.doubleClick(f.event()); assert.equal(f.state.fits[0].limits.minZoom, 1.8);
  f.state.viewport.zoom = 3; f.controller.doubleClick(f.event("at://card/two"));
  assert.equal(f.state.fits[1].limits.minZoom, 2);
});
