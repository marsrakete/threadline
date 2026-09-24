/**
 * Normalizes the public state contract of the Thread Explorer controller.
 * @param {object} initialState - Raw source, layout, viewport and cluster state.
 * @returns {object} Normalized controller state.
 */
export function normalizeThreadExplorerControllerState(initialState = {}) {
  return {
    source: String(initialState.source || "follows"),
    orientation: String(initialState.orientation || "vertical"),
    viewMode: String(initialState.viewMode || "tree"),
    zoom: Number(initialState.zoom) || 1,
    panX: Number(initialState.panX) || 0,
    panY: Number(initialState.panY) || 0,
    expandedUris: new Set(Array.isArray(initialState.expandedUris) ? initialState.expandedUris : []),
  };
}

/**
 * Creates the state controller shared by the Thread Explorer view and its modules.
 * @param {object} initialState - Initial source, layout, viewport and cluster state.
 * @returns {object} Thread Explorer controller with state and transition methods.
 */
export function createThreadExplorerController(initialState = {}) {
  const state = normalizeThreadExplorerControllerState(initialState);
  return {
    state,
    setSource(source) {
      state.source = String(source || "follows");
      return state.source;
    },
    setOrientation(orientation) {
      state.orientation = String(orientation || "vertical");
      return state.orientation;
    },
    setViewMode(viewMode) {
      state.viewMode = String(viewMode || "tree");
      return state.viewMode;
    },
    setViewport(zoom, panX, panY) {
      state.zoom = Number(zoom) || 1;
      state.panX = Number(panX) || 0;
      state.panY = Number(panY) || 0;
      return state;
    },
    toggleExpanded(uri) {
      const normalizedUri = String(uri || "").trim();
      if (!normalizedUri) {
        return false;
      }
      if (state.expandedUris.has(normalizedUri)) {
        state.expandedUris.delete(normalizedUri);
        return false;
      }
      state.expandedUris.add(normalizedUri);
      return true;
    },
    isExpanded(uri) {
      return state.expandedUris.has(String(uri || "").trim());
    },
  };
}

/**
 * Coordinates one complete Thread Explorer workspace render.
 * @param {object} actions - Fullscreen, orientation, controls and render callbacks.
 * @returns {void}
 */
export function renderThreadExplorerWorkspace(actions = {}) {
  actions.applyFullscreen();
  actions.applyOrientation();
  actions.updateControls();
  actions.renderFeed();
  actions.renderTree();
}

/**
 * Runs the Thread Explorer feed loading workflow for normal or foreign-account mode.
 * @param {object} options - State, request, normalization and rendering callbacks.
 * @returns {Promise<void>} Resolves when loading and final rendering finish.
 */
export async function loadThreadExplorerFeedWorkflow(options = {}) {
  const state = options.state;
  if (!options.authAccount || state.loading) {
    return;
  }
  const foreignAccount = options.isForeignAccount();
  const append = options.append === true;
  if (append && !state.hasMore) {
    return;
  }
  if (options.reset === true) {
    state.cursor = "";
    state.hasMore = true;
    state.items = [];
  }
  if (options.clearSelection === true) {
    options.clearSelectionState();
  }
  options.clearErrors();
  state.loading = true;
  options.render();
  try {
    let result = null;
    if (foreignAccount) {
      result = await options.request("LOAD_THREAD_EXPLORER_ACTOR_FEED", {
        actor: options.getRequestedActor(),
        cursor: state.cursor,
        mode: options.accountMode,
        limit: 50,
      }, { timeoutMs: 120000 });
    } else {
      result = await options.request("LOAD_THREAD_EXPLORER_FEED", {
        source: options.source,
        cursor: state.cursor,
        limit: 50,
        search: options.savedSearch,
      }, { timeoutMs: 120000 });
    }
    state.cursor = String(result?.cursor || "");
    state.hasMore = Boolean(state.cursor);
    if (Array.isArray(result?.items)) {
      if (append) {
        state.items = options.appendItems(state.items, result.items, foreignAccount);
      } else {
        state.items = options.sortItems(result.items);
      }
    } else if (!append) {
      state.items = [];
    }
    if (!append) {
      await options.restoreSelection(options.clearSelection !== true);
    }
  } catch (error) {
    options.setError(error?.message || options.feedErrorMessage, foreignAccount);
  } finally {
    state.loading = false;
    options.render();
  }
}

/**
 * Runs the Actor-Fokus feed loading workflow.
 * @param {object} options - Actor state, request and rendering callbacks.
 * @returns {Promise<void>} Resolves after loading and rendering finish.
 */
export async function loadThreadExplorerActorFocusWorkflow(options = {}) {
  const state = options.state;
  if (!options.authAccount || !options.actor || state.loading) {
    return;
  }
  const append = options.append === true;
  if (append && !state.hasMore) {
    return;
  }
  if (!append) {
    state.items = [];
    state.cursor = "";
    state.hasMore = false;
  }
  state.loading = true;
  state.error = "";
  options.render();
  try {
    const result = await options.request("LOAD_THREAD_EXPLORER_ACTOR_FEED", {
      actor: options.actorId,
      cursor: state.cursor,
      mode: options.mode,
      limit: 30,
    }, { timeoutMs: 120000 });
    state.cursor = String(result?.cursor || "");
    state.hasMore = Boolean(state.cursor);
    if (Array.isArray(result?.items)) {
      if (append) {
        state.items = options.appendItems(state.items, result.items);
      } else {
        state.items = result.items;
      }
      state.items = options.sortItems(state.items);
    }
  } catch (error) {
    state.error = error.message || options.errorMessage;
  } finally {
    state.loading = false;
    options.render();
  }
}

/**
 * Loads the selected Thread Explorer thread and updates its render state.
 * @param {string} uri - Selected post URI.
 * @param {object} options - State, request, rendering and selection callbacks.
 * @returns {Promise<void>} Resolves after the thread has rendered.
 */
export async function loadThreadExplorerThreadWorkflow(uri, options = {}) {
  const selectedUri = String(uri || "").trim();
  if (!selectedUri || options.state.loading) {
    return;
  }
  options.state.selectedUri = selectedUri;
  options.persistSelection(selectedUri);
  options.state.loading = true;
  options.state.cardZoom = null;
  options.state.tree = null;
  options.clearMediaCache();
  options.state.error = "";
  options.render();
  try {
    const result = await options.request("LOAD_THREAD_EXPLORER_THREAD", { uri: selectedUri }, { timeoutMs: 120000 });
    options.state.tree = result?.root || null;
    if (options.state.tree && options.isClusterMode()) {
      options.resetClusterState();
      options.expandClusterTree(options.state.tree);
    }
  } catch (error) {
    options.state.error = error.message || options.errorMessage;
  } finally {
    options.state.loading = false;
    options.render();
    if (options.state.tree) {
      options.scheduleFocus();
    }
  }
}
/**
 * Binds Thread Explorer workspace controls to page-provided handlers.
 * @param {object} elements - Thread Explorer controls and account fields.
 * @param {object} handlers - Explicit handlers for workspace interactions.
 * @returns {number} Number of listeners bound.
 */
export function bindThreadExplorerWorkspaceEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.launchButton, "click", handlers.launchClick);
  bind(elements.urlButton, "click", handlers.urlClick);
  bind(elements.searchesButton, "click", handlers.searchesClick);
  bind(elements.refreshButton, "click", handlers.refreshClick);
  bind(elements.sourceSelect, "change", handlers.sourceChange);
  bind(elements.accountInput, "input", handlers.accountInput);
  bind(elements.accountInput, "change", handlers.accountChange);
  bind(elements.accountInput, "keydown", handlers.accountKeydown);
  bind(elements.useOwnAccountButton, "click", handlers.useOwnAccountClick);
  bind(elements.accountModeSelect, "change", handlers.accountModeChange);
  bind(elements.feedSelect, "change", handlers.feedChange);
  return boundCount;
}

/**
 * Binds global viewport and keyboard events used by the Thread Explorer.
 * @param {object} targets - Window-like targets for window and visual viewport events.
 * @param {object} handlers - Resize and keyboard callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindThreadExplorerGlobalEvents(targets = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(targets.window, "resize", handlers.resize);
  bind(targets.visualViewport, "resize", handlers.resize);
  bind(targets.window, "keydown", handlers.keydown);
  return boundCount;
}

/**
 * Binds Thread Explorer URL, dialog and gallery controls.
 * @param {object} elements - Thread Explorer dialog and gallery elements.
 * @param {object} handlers - Explicit dialog and gallery callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindThreadExplorerDialogEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.urlCloseTopButton, "click", handlers.urlClose);
  bind(elements.urlCloseButton, "click", handlers.urlClose);
  bind(elements.urlLoadButton, "click", handlers.urlLoad);
  bind(elements.urlInput, "keydown", handlers.urlKeydown);
  bind(elements.favoritesCloseButton, "click", handlers.favoritesClose);
  bind(elements.savedSearchesCloseButton, "click", handlers.savedSearchesClose);
  bind(elements.reactionsCloseButton, "click", handlers.reactionsClose);
  bind(elements.repliesCloseButton, "click", handlers.repliesClose);
  bind(elements.galleryCloseButton, "click", handlers.galleryClose);
  bind(elements.galleryCloseBottomButton, "click", handlers.galleryClose);
  bind(elements.galleryPrevButton, "click", handlers.galleryPrevious);
  bind(elements.galleryNextButton, "click", handlers.galleryNext);
  bind(elements.galleryOverlayPrevButton, "click", handlers.galleryPrevious);
  bind(elements.galleryOverlayNextButton, "click", handlers.galleryNext);
  bind(elements.galleryOverlayCloseButton, "click", handlers.galleryOverlayClose);
  bind(elements.galleryImage, "error", handlers.galleryImageError);
  bind(elements.galleryImage, "click", handlers.galleryImageClick);
  bind(elements.galleryDialog, "keydown", handlers.galleryKeydown);
  bind(elements.galleryDialog, "close", handlers.galleryDialogClose);
  bind(elements.galleryFullscreenButton, "click", handlers.galleryFullscreen);
  return boundCount;
}

/**
 * Binds Thread Explorer fullscreen and snapshot progress controls.
 * @param {object} elements - Fullscreen and snapshot dialog controls.
 * @param {object} handlers - Explicit fullscreen and snapshot callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindThreadExplorerSnapshotEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.fullscreenCloseButton, "click", handlers.fullscreenClose);
  bind(elements.snapshotProgressDialog, "cancel", handlers.snapshotCancelEvent);
  bind(elements.snapshotCancelButton, "click", handlers.snapshotCancel);
  return boundCount;
}
