/**
 * Binds a list of application event handlers to a target.
 * @param {EventTarget} target - Target receiving the listeners.
 * @param {Array<{type:string, handler:Function, options?:object}>} bindings - Event binding definitions.
 * @returns {number} Number of listeners bound.
 */
export function bindApplicationEvents(target, bindings = []) {
  if (!target || !Array.isArray(bindings)) {
    return 0;
  }
  let boundCount = 0;
  bindings.forEach((binding) => {
    if (!binding || typeof binding.handler !== "function" || !binding.type) {
      return;
    }
    target.addEventListener(binding.type, binding.handler, binding.options);
    boundCount += 1;
  });
  return boundCount;
}

/**
 * Binds one event only when its target exists.
 * @param {EventTarget|null} target - Optional target receiving the listener.
 * @param {string} type - Event type.
 * @param {Function} handler - Event handler.
 * @param {object} options - Native listener options.
 * @returns {boolean} True when the listener was bound.
 */
export function bindOptionalApplicationEvent(target, type, handler, options = undefined) {
  if (!target || typeof handler !== "function" || !type) {
    return false;
  }
  target.addEventListener(type, handler, options);
  return true;
}

/**
 * Binds login dialog, authentication form and online-state events.
 * @param {object} targets - Login controls and the window-like online target.
 * @param {object} handlers - Explicit callbacks for authentication interactions.
 * @returns {number} Number of listeners bound.
 */
export function bindAuthenticationEvents(targets = {}, handlers = {}) {
  const bindings = [
    [targets.addAccountButton, "click", handlers.addAccountClick],
    [targets.loginDialogCloseTop, "click", handlers.closeClick],
    [targets.loginDialogCancelButton, "click", handlers.cancelClick],
    [targets.loginDialog, "cancel", handlers.cancelEvent],
    [targets.window, "online", handlers.online],
    [targets.window, "offline", handlers.offline],
    [targets.loginForm, "submit", handlers.submit],
  ];
  let boundCount = 0;
  bindings.forEach((binding) => {
    if (bindOptionalApplicationEvent(binding[0], binding[1], binding[2])) {
      boundCount += 1;
    }
  });
  return boundCount;
}

/**
 * Binds the primary Thread Explorer controls and stage gestures.
 * @param {object} elements - Thread Explorer DOM elements.
 * @param {object} handlers - Named event handlers for the controls.
 * @returns {number} Number of listeners bound.
 */
export function bindThreadExplorerApplicationEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.feedList, "scroll", handlers.feedScroll],
    [elements.actorFeedList, "scroll", handlers.actorFeedScroll],
    [elements.actorFocusCloseButton, "click", handlers.actorFocusClose],
    [elements.actorModeSelect, "change", handlers.actorModeChange],
    [elements.rootButton, "click", handlers.rootClick],
    [elements.reloadThreadButton, "click", handlers.reloadThreadClick],
    [elements.snapshotPngButton, "click", handlers.snapshotPngClick],
    [elements.saveButton, "click", handlers.saveClick],
    [elements.favoritesButton, "click", handlers.favoritesClick],
    [elements.zoomOutButton, "click", handlers.zoomOutClick],
    [elements.zoomResetButton, "click", handlers.zoomResetClick],
    [elements.zoomResetButton, "dblclick", handlers.zoomResetDoubleClick],
    [elements.zoomInButton, "click", handlers.zoomInClick],
    [elements.viewModeButton, "click", handlers.viewModeClick],
    [elements.orientationButton, "click", handlers.orientationClick],
    [elements.fullscreenButton, "click", handlers.fullscreenClick],
    [elements.collapseButton, "click", handlers.collapseClick],
    [elements.expandButton, "click", handlers.expandClick],
    [elements.threadTree, "pointerdown", handlers.pointerDown],
    [elements.threadTree, "pointermove", handlers.pointerMove],
    [elements.threadTree, "pointerup", handlers.pointerUp],
    [elements.threadTree, "pointercancel", handlers.pointerUp],
    [elements.threadTree, "wheel", handlers.wheel, { passive: false }],
  ];
  let boundCount = 0;
  bindings.forEach((binding) => {
    if (bindOptionalApplicationEvent(binding[0], binding[1], binding[2], binding[3])) {
      boundCount += 1;
    }
  });
  return boundCount;
}

/**
 * Binds page-wide lifecycle, navigation, appearance, and install events.
 * @param {object} elements - Optional DOM targets for the global events.
 * @param {object} handlers - Named handlers supplied by the page entry point.
 * @returns {number} Number of listeners bound.
 */
export function bindGlobalApplicationEvents(elements = {}, handlers = {}) {
  const bindings = [
    [document, "visibilitychange", handlers.visibilityChange],
    [window, "focus", handlers.focus],
    [window, "hashchange", handlers.hashChange],
    [window, "resize", handlers.resize],
    [window.visualViewport, "resize", handlers.visualViewportResize],
    [window, "beforeinstallprompt", handlers.beforeInstallPrompt],
    [window, "appinstalled", handlers.appInstalled],
    [elements.displayModeMediaQuery, "change", handlers.displayModeChange],
    [window, "pageshow", handlers.pageShow],
    [window, "pagehide", handlers.pageHide],
  ];
  let boundCount = 0;
  bindings.forEach((binding) => {
    if (bindOptionalApplicationEvent(binding[0], binding[1], binding[2])) {
      boundCount += 1;
    }
  });
  return boundCount;
}

/**
 * Binds navigation links that need persistence or controlled privacy routing.
 * @param {object} elements - Navigation link collections.
 * @param {object} handlers - Navigation handlers supplied by the page entry point.
 * @returns {number} Number of listeners bound.
 */
export function bindApplicationNavigationEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  if (Array.isArray(elements.pageSwitchLinks)) {
    elements.pageSwitchLinks.forEach((link) => {
      if (bindOptionalApplicationEvent(link, "click", handlers.pageSwitchClick)) {
        boundCount += 1;
      }
    });
  }
  if (Array.isArray(elements.privacyPageLinks)) {
    elements.privacyPageLinks.forEach((link) => {
      if (bindOptionalApplicationEvent(link, "click", handlers.privacyClick)) {
        boundCount += 1;
      }
    });
  }
  return boundCount;
}
