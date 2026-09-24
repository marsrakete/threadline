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
