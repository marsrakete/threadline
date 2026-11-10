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
 * Binds application appearance and editor preference controls.
 * @param {object} elements - Preference controls and compact-mode buttons.
 * @param {object} handlers - Explicit callbacks for preference changes.
 * @returns {number} Number of listeners bound.
 */
export function bindPreferenceEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.languageSelect, "change", handlers.languageChange],
    [elements.tipsVisibleToggle, "change", handlers.tipsVisibleChange],
    [elements.altTextRequiredToggle, "change", handlers.altTextRequiredChange],
    [elements.imageAutoResizeSelect, "change", handlers.imageAutoResizeChange],
    [elements.themeToggleButton, "click", handlers.themeClick],
    [elements.resetColumnWidthsButton, "click", handlers.resetColumnWidthsClick],
    [elements.nextTipButton, "click", handlers.nextTipClick],
    [elements.hideTipsButton, "click", handlers.hideTipsClick],
  ];
  let boundCount = 0;
  bindings.forEach((binding) => {
    if (bindOptionalApplicationEvent(binding[0], binding[1], binding[2])) {
      boundCount += 1;
    }
  });
  if (Array.isArray(elements.compactModeToggleButtons)) {
    elements.compactModeToggleButtons.forEach((button) => {
      if (bindOptionalApplicationEvent(button, "click", handlers.compactModeClick)) {
        boundCount += 1;
      }
    });
  }
  return boundCount;
}

/**
 * Binds settings backup, sharing, import and history controls.
 * @param {object} elements - Settings data controls and file inputs.
 * @param {object} handlers - Explicit settings data callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindSettingsDataEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.exportButton, "click", handlers.exportClick],
    [elements.backupSaveButton, "click", handlers.backupSaveClick],
    [elements.backupLaterButton, "click", handlers.backupLaterClick],
    [elements.backupCloseButton, "click", handlers.backupCloseClick],
    [elements.shareButton, "click", handlers.shareClick],
    [elements.importButton, "click", handlers.importClick],
    [elements.clearHistoryButton, "click", handlers.clearHistoryClick],
    [elements.importInput, "change", handlers.importChange],
    [elements.threadImportInput, "change", handlers.threadImportChange],
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
 * Binds hashtag-edit and alt-text dialog controls.
 * @param {object} elements - Hashtag and alt-text dialog elements.
 * @param {object} handlers - Explicit dialog callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindEditorDialogEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.hashtagSaveButton, "click", handlers.hashtagSaveClick],
    [elements.hashtagCancelButton, "click", handlers.hashtagCancelClick],
    [elements.hashtagCancelTop, "click", handlers.hashtagCancelClick],
    [elements.hashtagInput, "keydown", handlers.hashtagKeydown],
    [elements.hashtagDialog, "close", handlers.hashtagDialogClose],
    [elements.altTextInput, "input", handlers.altTextInput],
    [elements.altTextSaveButton, "click", handlers.altTextSaveClick],
    [elements.altTextCancelButton, "click", handlers.altTextCancelClick],
    [elements.altTextCloseTop, "click", handlers.altTextCancelClick],
    [elements.altTextDialog, "cancel", handlers.altTextCancelEvent],
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
 * Binds application update and reload controls.
 * @param {object} elements - Update and reload buttons.
 * @param {object} handlers - Update and reload callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindApplicationUpdateEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  if (bindOptionalApplicationEvent(elements.checkUpdatesButton, "click", handlers.checkUpdatesClick)) {
    boundCount += 1;
  }
  if (bindOptionalApplicationEvent(elements.reloadAppButton, "click", handlers.reloadClick)) {
    boundCount += 1;
  }
  return boundCount;
}

/**
 * Binds error and confirmation dialog lifecycle controls.
 * @param {object} elements - Error and confirmation dialog elements.
 * @param {object} handlers - Explicit dialog lifecycle callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindConfirmationDialogEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.errorDialog, "cancel", handlers.errorCancel],
    [elements.confirmButton, "click", handlers.confirmClick],
    [elements.cancelButton, "click", handlers.cancelClick],
    [elements.confirmDialog, "cancel", handlers.dialogCancel],
    [elements.confirmDialog, "close", handlers.dialogClose],
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
 * Binds Link-Card provider and endpoint settings controls.
 * @param {object} elements - Link-Card settings fields and provider inputs.
 * @param {object} handlers - Explicit settings callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindLinkCardSettingsEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (bindOptionalApplicationEvent(target, type, handler)) {
      boundCount += 1;
    }
  };
  [elements.endpointInput, elements.secretInput].forEach((input) => {
    bind(input, "input", handlers.input);
    bind(input, "change", handlers.change);
  });
  [elements.noneInput, elements.microlinkInput, elements.proxyInput].forEach((input) => {
    bind(input, "change", handlers.providerChange);
  });
  return boundCount;
}

/**
 * Binds thread import/export and installation controls.
 * @param {object} elements - Install, import and save controls.
 * @param {object} handlers - Explicit import, export and install callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindWorkspaceUtilityEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.installButton, "click", handlers.installClick],
    [elements.loadThreadButton, "click", handlers.loadThreadClick],
    [elements.saveThreadButton, "click", handlers.saveThreadClick],
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
 * Binds settings close and inline help actions.
 * @param {object} elements - Settings close control and document-like help target.
 * @param {object} handlers - Explicit close and help callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindHelpAndSettingsEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  if (bindOptionalApplicationEvent(elements.settingsCloseTop, "click", handlers.settingsClose)) {
    boundCount += 1;
  }
  if (bindOptionalApplicationEvent(elements.helpTarget, "click", handlers.helpClick)) {
    boundCount += 1;
  }
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

/**
 * Coordinates page visibility/focus, appearance, media sizing and installation events.
 * @param {object} options - Session/update/appearance/install controllers and native adapters.
 * @returns {object} Global event handlers for the existing binder.
 */
export function createApplicationLifecycleHandlers(options) {
  /** Refreshes session, update metadata and cached appearance. @returns {void} */
  function focus() { void options.verifySession({ silent: true }); options.checkUpdates(); options.syncAppearance(); }
  /** Refreshes only when the document becomes visible. @returns {void} */
  function visibilityChange() { if (options.isVisible()) { focus(); } }
  /** Applies a URL hash-based access gate. @returns {void} */
  function hashChange() { void options.applyAccessGate(); }
  /** Resizes segment textareas after native viewport changes. @returns {void} */
  function resize() { options.resizeTextareas(); }
  /** Synchronizes appearance after browser page transitions. @returns {void} */
  function syncAppearance() { options.syncAppearance(); }
  return { visibilityChange, focus, hashChange, resize, visualViewportResize: resize,
    beforeInstallPrompt: options.install.beforePrompt, appInstalled: options.install.installed,
    displayModeChange: options.install.render, pageShow: syncAppearance, pageHide: syncAppearance };
}
