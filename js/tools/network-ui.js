/**
 * Binds the Network workspace viewport controls.
 * @param {object} elements - Network buttons and stage element.
 * @param {object} actions - Explicit callbacks for viewport operations.
 * @returns {object} The provided elements for controller composition.
 */
export function bindNetworkViewportControls(elements = {}, actions = {}) {
  const stage = elements.stage;
  const getCenter = () => {
    if (!stage || typeof stage.getBoundingClientRect !== "function") {
      return { x: 0, y: 0 };
    }
    const bounds = stage.getBoundingClientRect();
    return { x: bounds.left + (bounds.width / 2), y: bounds.top + (bounds.height / 2) };
  };
  if (elements.shapeToggle) {
    elements.shapeToggle.addEventListener("click", actions.toggleShape);
  }
  if (elements.zoomIn) {
    elements.zoomIn.addEventListener("click", () => {
      const center = getCenter();
      actions.zoomAtPoint(1.24, center.x, center.y);
    });
  }
  if (elements.zoomOut) {
    elements.zoomOut.addEventListener("click", () => {
      const center = getCenter();
      actions.zoomAtPoint(1 / 1.24, center.x, center.y);
    });
  }
  if (elements.zoomReset) {
    elements.zoomReset.addEventListener("click", actions.resetZoom);
  }
  return elements;
}

/** Updates network loading/reset controls from explicit state. @param {object} elements - Load/reset/own/account buttons. @param {object} state - Loading, authentication, cursors, nodes, search, filter and actor. @param {Function} t - Translator. @returns {void} */
export function renderNetworkLoadControls(elements, state, t) {
  const canLoad = state.hasMoreFollowers || state.hasMoreFollows || !state.nodeCount;
  let label = "networkLoadButton"; let title = "networkLoadFinishedTitle";
  if (state.loading) { label = "networkLoadingButton"; }
  else if (canLoad && state.nodeCount) { label = "networkLoadMoreButton"; }
  if (!state.authenticated) { title = "networkLoadButton"; }
  else if (state.loading) { title = "networkLoadingButton"; }
  else if (canLoad && state.nodeCount) { title = "networkLoadMoreTitle"; }
  else if (canLoad) { title = "networkLoadButton"; }
  elements.load.textContent = t(label); elements.load.title = t(title);
  elements.load.disabled = state.loading || !state.authenticated || !canLoad;
  elements.reset.disabled = state.loading || (!state.nodeCount && !state.query && state.filterMode === "all");
  if (elements.own) { elements.own.disabled = state.loading || !state.authenticated || state.ownNetwork; }
  if (elements.account) { elements.account.disabled = state.loading || !state.authenticated || !state.actor; }
}

/**
 * Owns network stage interaction, fullscreen/fallback mode and result scroll lifecycle.
 * @param {object} elements - Stage, body, document, fullscreen target and result container.
 * @param {object} options - State, layout/viewport, shared clamp, render, persistence and animation-frame adapters.
 * @returns {object} View operations and handlers for existing event binders.
 */
export function createNetworkStageController(elements, options) {
  /** Zooms without a pointer anchor. @param {number} factor - Zoom multiplier. @returns {void} */
  function zoom(factor) {
    options.setState({ fitAll: false, zoom: options.clamp((options.getState().zoom || 1) * factor, options.minZoom, options.maxZoom) });
    options.renderStage();
  }
  /** Keeps the pointer's world position fixed while zooming. @param {number} factor - Multiplier. @param {number} x - Client X. @param {number} y - Client Y. @returns {void} */
  function zoomAtPoint(factor, x, y) {
    if (!elements.stage) { zoom(factor); return; }
    const layout = options.layout(); const viewport = options.viewport(layout); const bounds = elements.stage.getBoundingClientRect();
    const relativeX = options.clamp((x - bounds.left) / Math.max(1, bounds.width), 0, 1);
    const relativeY = options.clamp((y - bounds.top) / Math.max(1, bounds.height), 0, 1);
    const worldX = viewport.x + viewport.width * relativeX; const worldY = viewport.y + viewport.height * relativeY;
    const nextZoom = options.clamp((options.getState().zoom || 1) * factor, options.minZoom, options.maxZoom);
    const width = layout.width / nextZoom; const height = layout.height / nextZoom;
    const baseX = (layout.contentBounds.minX + layout.contentBounds.maxX) / 2 - width / 2;
    const baseY = (layout.contentBounds.minY + layout.contentBounds.maxY) / 2 - height / 2;
    options.setState({ fitAll: false, zoom: nextZoom, panX: worldX - width * relativeX - baseX, panY: worldY - height * relativeY - baseY });
    options.renderStage();
  }
  /** Restores fit-to-content state. @returns {void} */
  function resetZoom() { options.setState({ fitAll: true, zoom: 1, panX: 0, panY: 0 }); options.renderStage(); }
  /** Toggles the saved round/squircle shape and resets the viewport. @returns {void} */
  function toggleShape() {
    let shape = "squircle";
    if (options.getState().shape === "squircle") { shape = "round"; }
    options.setState({ shape }); options.persistShape(shape); resetZoom(); options.renderWorkspace();
  }
  /** Applies shared fullscreen-mode flags and body class. @param {boolean} active - Stage mode. @returns {void} */
  function applyMode(active) {
    options.setState({ mode: active, focusVisible: false, listsVisible: false });
    elements.body.classList.toggle("network-stage-mode", active);
  }
  /** Enters native fullscreen when available, otherwise app-internal stage mode. @returns {Promise<void>} Completion. */
  async function enter() {
    applyMode(true);
    if (elements.document.fullscreenEnabled && !elements.document.fullscreenElement && elements.fullscreenTarget?.requestFullscreen) {
      try { await elements.fullscreenTarget.requestFullscreen(); } catch { /* Keep app-internal stage mode. */ }
    }
    options.renderWorkspace();
  }
  /** Exits stage mode even when native fullscreen exit fails. @returns {Promise<void>} Completion. */
  async function exit() {
    applyMode(false);
    if (elements.document.fullscreenElement) { try { await elements.document.exitFullscreen(); } catch { /* Native exit can be rejected. */ } }
    options.renderWorkspace();
  }
  /** Toggles the stage focus panel. @returns {void} */
  function focusClick() { options.setState({ focusVisible: !options.getState().focusVisible }); options.renderWorkspace(); }
  /** Toggles stage insight lists. @returns {void} */
  function listsClick() { options.setState({ listsVisible: !options.getState().listsVisible }); options.renderWorkspace(); }
  /** Changes insight group and resets its result scroll. @param {Event} event - Button click. @returns {void} */
  function groupClick(event) {
    const group = String(event.currentTarget?.dataset?.networkInsightsGroup || "").trim();
    if (!group) { return; }
    options.setState({ group, scrollTop: 0 }); options.renderWorkspace();
  }
  /** Toggles collapse only for an existing selection. @returns {void} */
  function focusToggleClick() {
    const state = options.getState();
    if (!state.selectedDid) { return; }
    options.setState({ collapsed: !state.collapsed }); options.renderWorkspace();
  }
  /** Zooms active network wheel events and prevents page scrolling. @param {WheelEvent} event - Wheel input. @returns {void} */
  function wheel(event) {
    if (options.getState().workspace !== "network") { return; }
    event.preventDefault(); let factor = 1 / 1.12;
    if (event.deltaY < 0) { factor = 1.12; }
    zoomAtPoint(factor, event.clientX, event.clientY);
  }
  /** Captures the active pointer and starts a manual pan. @param {PointerEvent} event - Pointer input. @returns {void} */
  function pointerDown(event) {
    if (options.getState().workspace !== "network") { return; }
    event.preventDefault(); options.setState({ fitAll: false, drag: { pointerId: event.pointerId, x: event.clientX, y: event.clientY } });
    elements.stage.setPointerCapture(event.pointerId);
  }
  /** Translates pointer deltas to viewport units for the captured pointer. @param {PointerEvent} event - Pointer input. @returns {void} */
  function pointerMove(event) {
    const drag = options.getState().drag;
    if (!drag || drag.pointerId !== event.pointerId) { return; }
    const bounds = elements.stage.getBoundingClientRect(); const viewport = options.viewport(options.layout()); const state = options.getState();
    options.setState({ panX: state.panX - (event.clientX - drag.x) * viewport.width / Math.max(1, bounds.width),
      panY: state.panY - (event.clientY - drag.y) * viewport.height / Math.max(1, bounds.height),
      drag: { pointerId: drag.pointerId, x: event.clientX, y: event.clientY } });
    options.renderStage();
  }
  /** Ends pan only for the matching pointer. @param {PointerEvent} event - Pointer input. @returns {void} */
  function pointerUp(event) { if (options.getState().drag?.pointerId === event.pointerId) { options.setState({ drag: null }); } }
  /** Restores normal mode after native fullscreen ends. @returns {void} */
  function fullscreenChange() {
    if (!elements.document.fullscreenElement && options.getState().mode) { applyMode(false); options.renderWorkspace(); }
  }
  /** Handles Escape in app-internal stage mode. @param {KeyboardEvent} event - Keyboard input. @returns {void} */
  function keydown(event) {
    if (event.key === "Escape" && options.getState().mode && !elements.document.fullscreenElement) { event.preventDefault(); void exit(); }
  }
  /** Records manual scroll while ignoring restoration frames. @returns {void} */
  function resultsScroll() { if (!options.getState().restorePending) { options.setState({ scrollTop: elements.results.scrollTop }); } }
  /** Restores scroll immediately and across the existing two animation frames. @returns {void} */
  function restoreScroll() {
    if (!elements.results) { return; }
    const target = Math.max(0, Number(options.getState().scrollTop) || 0);
    options.setState({ restorePending: true }); elements.results.scrollTop = target;
    options.frame(() => { elements.results.scrollTop = target; options.frame(() => {
      elements.results.scrollTop = target; options.setState({ restorePending: false });
    }); });
  }
  return { zoom, zoomAtPoint, resetZoom, toggleShape, enter, exit, restoreScroll,
    modeHandlers: { enterClick: enter, exitClick: exit, focusClick, listsClick },
    insightHandlers: { groupClick, focusToggleClick }, interactionHandlers: { wheel, pointerDown, pointerMove, pointerUp },
    lifecycleHandlers: { fullscreenChange, keydown, resultsScroll } };
}

/**
 * Binds Network workspace filters, account actions, and reset controls.
 * @param {object} elements - Network form and action elements.
 * @param {object} actions - Explicit callbacks for Network state changes.
 * @returns {number} Number of listeners bound.
 */
export function bindNetworkWorkspaceEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  if (Array.isArray(elements.filterButtons)) {
    elements.filterButtons.forEach((button) => bind(button, "click", actions.filterClick));
  }
  bind(elements.searchInput, "input", actions.searchInput);
  bind(elements.accountInput, "keydown", actions.accountKeydown);
  bind(elements.accountInput, "input", actions.accountInput);
  bind(elements.sortField, "change", actions.sortFieldChange);
  bind(elements.sortDirection, "change", actions.sortDirectionChange);
  bind(elements.accountLoadButton, "click", actions.accountLoad);
  bind(elements.ownLoadButton, "click", actions.ownLoad);
  bind(elements.loadButton, "click", actions.load);
  bind(elements.resetButton, "click", actions.reset);
  return boundCount;
}

/**
 * Binds Network stage mode and panel visibility controls.
 * @param {object} elements - Network stage mode controls.
 * @param {object} actions - Explicit mode and panel callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindNetworkStageModeEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.enterButton, "click", actions.enterClick);
  bind(elements.exitButton, "click", actions.exitClick);
  bind(elements.focusButton, "click", actions.focusClick);
  bind(elements.listsButton, "click", actions.listsClick);
  return boundCount;
}

/**
 * Binds Network insight grouping and focus controls.
 * @param {object} elements - Insight group buttons and focus toggle.
 * @param {object} actions - Explicit callbacks for group and focus changes.
 * @returns {number} Number of listeners bound.
 */
export function bindNetworkInsightEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  if (Array.isArray(elements.groupButtons)) {
    elements.groupButtons.forEach((button) => bind(button, "click", actions.groupClick));
  }
  bind(elements.focusToggleButton, "click", actions.focusToggleClick);
  return boundCount;
}

/**
 * Binds Network stage wheel zoom and pointer dragging.
 * @param {object} elements - Network stage SVG element.
 * @param {object} actions - Pointer and wheel callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindNetworkStageInteractionEvents(elements = {}, actions = {}) {
  const stage = elements.stage;
  if (!stage) {
    return 0;
  }
  stage.addEventListener("wheel", actions.wheel, { passive: false });
  stage.addEventListener("pointerdown", actions.pointerDown);
  stage.addEventListener("pointermove", actions.pointerMove);
  stage.addEventListener("pointerup", actions.pointerUp);
  stage.addEventListener("pointercancel", actions.pointerUp);
  stage.addEventListener("pointerleave", actions.pointerUp);
  return 6;
}

/**
 * Binds Network stage lifecycle and results-scroll events.
 * @param {object} elements - Document, window and results container targets.
 * @param {object} actions - Fullscreen, keyboard and scroll callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindNetworkLifecycleEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.document, "fullscreenchange", actions.fullscreenChange);
  bind(elements.document, "keydown", actions.keydown);
  bind(elements.results, "scroll", actions.resultsScroll);
  return boundCount;
}
