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
 * Persists one normalized explorer view preference without requiring storage availability.
 * @param {object} options - Storage getter/key, value normalizer and fallback value.
 * @returns {object} Save and read operations for orientation or view mode.
 */
export function createThreadExplorerViewPreference(options) {
  /** Stores a normalized orientation/view-mode value when storage is accessible.
   * @param {string} value - Raw preference value.
   * @returns {void}
   */
  function save(value) {
    try {
      options.getStorage().setItem(options.key, options.normalize(value));
    } catch {
      // View preferences remain optional in restricted storage contexts.
    }
  }

  /** Reads and normalizes the stored value, falling back when storage is blocked.
   * @returns {string} Normalized view preference.
   */
  function read() {
    try {
      const value = String(options.getStorage().getItem(options.key) || "").trim();
      return options.normalize(value);
    } catch {
      return options.fallback;
    }
  }
  return Object.freeze({ save, read });
}

/**
 * Owns account-aware selection storage while retaining its source and schema.
 * @param {object} options - Storage getter/key, account/source getters, source normalizer and ISO clock.
 * @returns {object} Best-effort save, clear and read operations.
 */
export function createThreadExplorerSelectionPreferences(options) {
  /** Persists a nonempty selection with its account, source and timestamp.
   * @param {string} uri - Selected post URI.
   * @returns {void}
   */
  function save(uri) {
    const selectedUri = String(uri || "").trim();
    if (!selectedUri) {
      return;
    }
    try {
      options.getStorage().setItem(options.key, JSON.stringify({
        accountDid: options.getAccount() || "", source: options.normalizeSource(options.getSource()),
        selectedUri, updatedAt: options.now(),
      }));
    } catch {
      // Selection recovery remains optional in restricted/private storage contexts.
    }
  }

  /** Removes the stored selection without requiring storage access to succeed.
   * @returns {void}
   */
  function clear() {
    try {
      options.getStorage().removeItem(options.key);
    } catch {
      // Storage availability must not block workspace use.
    }
  }

  /** Reads a valid selection unless its explicit account differs from the active account.
   * @returns {object|null} Normalized source and URI, or null for absent/invalid storage.
   */
  function read() {
    try {
      const raw = String(options.getStorage().getItem(options.key) || "").trim();
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      const selectedUri = String(parsed?.selectedUri || "").trim();
      const accountDid = String(parsed?.accountDid || "").trim();
      const activeAccount = options.getAccount();
      if (!selectedUri || (accountDid && activeAccount && accountDid !== activeAccount)) {
        return null;
      }
      return { source: options.normalizeSource(parsed?.source), selectedUri };
    } catch {
      return null;
    }
  }
  return Object.freeze({ save, clear, read });
}

/**
 * Shares favorite insertion/removal and persistence between search and thread workspaces.
 * @param {object} options - Get/set favorites, normalization and persistence adapters.
 * @returns {object} Save/remove operations returning whether a valid request was applied.
 */
export function createThreadExplorerFavoritesController(options) {
  /** Inserts the favorite first, replacing an existing entry with the same root URI.
   * @param {object|null} favorite - Prepared favorite model.
   * @returns {Promise<boolean>} True after persistence, false for an absent favorite.
   */
  async function save(favorite) {
    if (!favorite?.rootUri) {
      return false;
    }
    const remaining = options.getFavorites().filter((entry) => entry.rootUri !== favorite.rootUri);
    options.setFavorites(options.normalize([favorite, ...remaining]));
    await options.persist();
    return true;
  }

  /** Removes a favorite by root URI while preserving the other entries in order.
   * @param {string} rootUri - Root URI to remove.
   * @returns {Promise<boolean>} True after persistence, false for an empty URI.
   */
  async function remove(rootUri) {
    const uri = String(rootUri || "").trim();
    if (!uri) {
      return false;
    }
    options.setFavorites(options.getFavorites().filter((favorite) => favorite.rootUri !== uri));
    await options.persist();
    return true;
  }
  return Object.freeze({ save, remove });
}

/**
 * Loads pinned feeds for the current account while rejecting stale account responses.
 * @param {object} options - Shared state, account, request, render and error adapters.
 * @returns {object} Account-scoped load operation.
 */
export function createThreadExplorerFeedSourcesController(options) {
  let activeRun = null;

  /** Loads once per account; a new account can replace an older pending request.
   * @returns {Promise<void>} Resolves after optional state application and rendering.
   */
  async function load() {
    const accountDid = options.getAccount();
    if (!accountDid || activeRun?.accountDid === accountDid) {
      return;
    }
    const state = options.state;
    if (state.loaded && state.accountDid === accountDid) {
      return;
    }
    if (state.accountDid !== accountDid) {
      state.feeds = [];
      state.loaded = false;
    }
    const run = { accountDid };
    activeRun = run;
    state.loading = true;
    options.render();
    try {
      const result = await options.request("LOAD_THREAD_EXPLORER_FEED_SOURCES", {}, { timeoutMs: 60000 });
      if (activeRun !== run || options.getAccount() !== accountDid) {
        return;
      }
      state.feeds = [];
      if (Array.isArray(result?.feeds)) {
        state.feeds = result.feeds;
      }
      state.loaded = true;
      state.accountDid = accountDid;
    } catch (error) {
      if (activeRun !== run || options.getAccount() !== accountDid) {
        return;
      }
      options.onError(error);
      state.feeds = [];
      state.loaded = true;
      state.accountDid = accountDid;
    } finally {
      if (activeRun === run) {
        activeRun = null;
        state.loading = false;
        options.render();
      }
    }
  }
  return Object.freeze({ load });
}

/**
 * Coordinates gallery native fullscreen, visual fallback and keyboard navigation.
 * @param {object} options - Target/device, native fullscreen, visual, dialog and step adapters.
 * @returns {object} Open/close, keyboard and fallback-state operations.
 */
export function createThreadExplorerGalleryFullscreenController(options) {
  let fallback = false;

  /** Updates the visual fullscreen fallback state.
   * @param {boolean} enabled - Whether the fallback should be active.
   * @returns {void}
   */
  function setFallback(enabled) {
    fallback = enabled === true;
    options.applyFallback(fallback);
  }

  /** Opens native fullscreen where available, otherwise activates the visual fallback.
   * @returns {Promise<void>} Resolves after the fullscreen attempt.
   */
  async function open() {
    const target = options.getTarget();
    if (!target) {
      return;
    }
    if (options.isIos()) {
      setFallback(true);
      return;
    }
    if (target.requestFullscreen) {
      try {
        await target.requestFullscreen();
        setFallback(false);
        return;
      } catch {
        // Browsers may reject native fullscreen even when the API exists.
      }
    }
    setFallback(true);
  }

  /** Exits native fullscreen, then visual fallback, then the gallery dialog.
   * @returns {Promise<void>} Resolves after one close step.
   */
  async function close() {
    if (options.getFullscreenElement()) {
      try {
        await options.exitFullscreen();
        return;
      } catch {
        // Continue with the available in-app close path.
      }
    }
    if (fallback) {
      setFallback(false);
      return;
    }
    options.closeDialog();
  }

  /** Handles gallery arrow keys and Escape from the visual fallback.
   * @param {KeyboardEvent} event - Gallery key event.
   * @returns {void}
   */
  function keydown(event) {
    if (!options.isOpen()) {
      return;
    }
    if (event.key === "Escape" && fallback) {
      event.preventDefault();
      setFallback(false);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      options.step(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      options.step(1);
    }
  }
  return Object.freeze({ open, close, setFallback, keydown });
}

/**
 * Coordinates absolute, anchored and viewport-center zoom through explicit adapters.
 * @param {object} options - Viewport get/set, bounds, point calculation, render and remembered zoom adapters.
 * @returns {object} Absolute, point and centered zoom operations.
 */
export function createThreadExplorerZoomController(options) {
  /** Applies a viewport and remembers meaningful manual zoom values.
   * @param {object} viewport - New zoom and pan coordinates.
   * @returns {void}
   */
  function apply(viewport) {
    options.setViewport(viewport);
    if (Math.abs(viewport.zoom - 1) > 0.01) {
      options.rememberZoom(viewport.zoom);
    }
    options.render();
  }

  /** Sets a clamped absolute zoom without moving the pan origin.
   * @param {number} nextZoom - Desired zoom factor.
   * @returns {void}
   */
  function setZoom(nextZoom) {
    const numericZoom = Number(nextZoom);
    if (!Number.isFinite(numericZoom)) {
      return;
    }
    apply({ ...options.getViewport(), zoom: Math.min(2, Math.max(0.01, numericZoom)) });
  }

  /** Zooms around a client coordinate and schedules edge rendering.
   * @param {number} factor - Multiplicative zoom factor.
   * @param {number} clientX - Client x anchor.
   * @param {number} clientY - Client y anchor.
   * @returns {void}
   */
  function atPoint(factor, clientX, clientY) {
    const viewport = options.calculatePointZoom(options.getViewport(), options.getBounds(), factor, clientX, clientY);
    if (!viewport) {
      return;
    }
    apply(viewport);
    options.renderEdges();
  }

  /** Sets an absolute zoom anchored at the viewport center.
   * @param {number} nextZoom - Desired zoom factor.
   * @returns {void}
   */
  function atCenter(nextZoom) {
    const bounds = options.getBounds();
    const currentZoom = Math.max(0.01, Number(options.getViewport().zoom) || 1);
    atPoint(nextZoom / currentZoom, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  }
  return Object.freeze({ setZoom, atPoint, atCenter });
}

/**
 * Owns queued edge redraws and coalesces selected-card focus passes.
 * @param {object} options - Frame/timer, interaction guards, edge and focus adapters.
 * @returns {object} Edge/focus scheduling and focus cancellation operations.
 */
export function createThreadExplorerRenderScheduler(options) {
  let edgeFrame = 0;
  let focusFrame = 0;
  let focusTimer = 0;

  /** Reports whether an edge redraw must wait for the active interaction or layout mode.
   * @returns {boolean} Whether edges should remain deferred.
   */
  function deferEdges() {
    return options.isClusterMode() || options.isDragging() || options.isInertiaActive();
  }

  /** Replaces a queued redraw, checking interaction state again when the frame executes.
   * @returns {void}
   */
  function scheduleEdges() {
    if (deferEdges()) {
      return;
    }
    if (edgeFrame) {
      options.cancelFrame(edgeFrame);
    }
    edgeFrame = options.requestFrame(() => {
      edgeFrame = 0;
      if (!deferEdges()) {
        options.renderEdges();
      }
    });
  }

  /** Cancels any pending focus frame and delayed stabilization pass.
   * @returns {void}
   */
  function cancelFocus() {
    if (focusFrame) {
      options.cancelFrame(focusFrame);
      focusFrame = 0;
    }
    if (focusTimer) {
      options.clearTimeout(focusTimer);
      focusTimer = 0;
    }
  }

  /** Focuses after two layout frames and once more after an 80ms settling delay.
   * @returns {void}
   */
  function scheduleFocus() {
    cancelFocus();
    focusFrame = options.requestFrame(() => {
      focusFrame = options.requestFrame(() => {
        focusFrame = 0;
        options.focusSelected();
        focusTimer = options.setTimeout(() => {
          focusTimer = 0;
          options.focusSelected();
        }, 80);
      });
    });
  }
  return Object.freeze({ scheduleEdges, scheduleFocus, cancelFocus });
}

/**
 * Owns reset-button selection timing and the last manual zoom used by restore.
 * @param {object} options - Current zoom, centered zoom, fit and timeout adapters.
 * @returns {object} Click/double-click handlers, cancellation and zoom memory.
 */
export function createThreadExplorerZoomResetController(options) {
  let pendingTimer = 0;
  let lastManualZoom = 1;

  /** Remembers the zoom to restore after toggling to 100 percent.
   * @param {number} zoom - Most recent manual zoom.
   * @returns {void}
   */
  function remember(zoom) {
    lastManualZoom = zoom;
  }

  /** Cancels a deferred fit without changing the remembered zoom.
   * @returns {void}
   */
  function cancel() {
    if (pendingTimer) {
      options.clearTimeout(pendingTimer);
      pendingTimer = 0;
    }
  }

  /** Defers a single-click fit so a double click can replace it.
   * @param {MouseEvent} [event] - Optional reset-button click.
   * @returns {void}
   */
  function click(event) {
    if (event?.detail > 1) {
      return;
    }
    cancel();
    pendingTimer = options.setTimeout(() => {
      cancel();
      options.fit();
    }, 220);
  }

  /** Toggles between 100 percent and the remembered zoom around the center.
   * @param {MouseEvent} event - Reset-button double click.
   * @returns {void}
   */
  function doubleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    cancel();
    const currentZoom = Math.max(0.01, Number(options.getZoom()) || 1);
    if (Math.abs(currentZoom - 1) <= 0.01) {
      options.setCenteredZoom(Math.max(0.08, Number(lastManualZoom) || 1));
      return;
    }
    remember(currentZoom);
    options.setCenteredZoom(1);
  }
  return Object.freeze({ remember, cancel, click, doubleClick });
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

/**
 * Coordinates card selection, mouse/touch focus and viewport restoration.
 * @param {object} options - Focus/viewport state, bounds, fit, selection, target and timer adapters.
 * @returns {object} Card event handlers and pending-selection cancellation.
 */
export function createThreadExplorerCardFocusController(options) {
  let threadExplorerPendingCardClickTimer = 0;
  let threadExplorerPendingCardClickUri = "";
  let threadExplorerLastTouchZoomTarget = { uri: "", timestamp: 0 };
  /**
   * Restores the viewport that was active before the last Thread Explorer card zoom.
   * @returns {void}
   */
  function restoreThreadExplorerCardZoomState() {
    const focus = options.getFocus();
    if (!focus) { return; }
    options.setViewport(focus);
    options.setFocus(null);
  }

  /**
   * Cancels one pending single-click card selection.
   * @returns {void}
   */
  function cancelPendingThreadExplorerCardClick() {
    if (threadExplorerPendingCardClickTimer) {
      options.clearTimeout(threadExplorerPendingCardClickTimer);
      threadExplorerPendingCardClickTimer = 0;
    }
    threadExplorerPendingCardClickUri = "";
  }

  /**
   * Schedules the single-click selection for one rendered Thread Explorer post card.
   * @param {HTMLElement|null} item - Rendered Thread Explorer node item.
   * @returns {void}
   */
  function scheduleThreadExplorerCardClickSelection(item) {
    const uri = String(item?.dataset?.uri || "").trim();
    if (!uri) {
      return;
    }

    cancelPendingThreadExplorerCardClick();
    threadExplorerPendingCardClickUri = uri;
    threadExplorerPendingCardClickTimer = options.setTimeout(() => {
      const pendingUri = threadExplorerPendingCardClickUri;
      cancelPendingThreadExplorerCardClick();
      options.select(pendingUri);
    }, 220);
  }

  /**
   * Handles a single click on one Thread Explorer post card.
   * @param {MouseEvent} event - Click event from a rendered post card.
   * @returns {void}
   */
  function handleThreadExplorerCardClick(event) {
    if (options.isInteractive(event.target)) {
      return;
    }

    const card = event.currentTarget;
    const item = card?.closest(".thread-explorer-node-item");
    scheduleThreadExplorerCardClickSelection(item);
  }

  /**
   * Toggles a zoom focus for one rendered Thread Explorer post card.
   * @param {HTMLElement|null} item - Rendered Thread Explorer node item.
   * @returns {void}
   */
  function toggleThreadExplorerCardZoom(item) {
    const threadExplorerCardZoomState = options.getFocus();
    const { zoom: threadExplorerZoom, panX: threadExplorerPanX, panY: threadExplorerPanY } = options.getViewport();
    const uri = String(item?.dataset?.uri || "").trim();
    if (!uri) {
      return;
    }

    if (threadExplorerCardZoomState && threadExplorerCardZoomState.uri === uri) {
      restoreThreadExplorerCardZoomState();
      return;
    }

    const focusBounds = options.getBounds(item);
    if (!focusBounds) {
      return;
    }

    options.setFocus({
      uri,
      zoom: threadExplorerZoom,
      panX: threadExplorerPanX,
      panY: threadExplorerPanY,
    });
    const minimumFocusZoom = Math.min(2, Math.max(1.35, threadExplorerZoom));
    options.fit(focusBounds, {
      minZoom: minimumFocusZoom,
      maxZoom: 2,
    });
  }

  /**
   * Handles a mouse double-click on one Thread Explorer post card.
   * @param {MouseEvent} event - Double-click event from a rendered post card.
   * @returns {void}
   */
  function handleThreadExplorerCardDoubleClick(event) {
    if (options.isNativeInteractive(event.target)) {
      return;
    }

    cancelPendingThreadExplorerCardClick();
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget;
    const item = card?.closest(".thread-explorer-node-item");
    toggleThreadExplorerCardZoom(item);
  }

  /**
   * Handles touch-based double-tap zooming on one Thread Explorer post card.
   * @param {PointerEvent} event - Pointer-up event from a rendered post card.
   * @returns {void}
   */
  function handleThreadExplorerCardPointerUp(event) {
    if (event.pointerType !== "touch" || options.isNativeInteractive(event.target)) {
      return;
    }

    const card = event.currentTarget;
    const item = card?.closest(".thread-explorer-node-item");
    const uri = String(item?.dataset?.uri || "").trim();
    if (!uri) {
      return;
    }

    const now = options.now();
    const sameTargetTappedTwice = threadExplorerLastTouchZoomTarget.uri === uri;
    const tappedQuicklyEnough = now - threadExplorerLastTouchZoomTarget.timestamp <= 320;
    threadExplorerLastTouchZoomTarget = {
      uri,
      timestamp: now,
    };
    if (!sameTargetTappedTwice || !tappedQuicklyEnough) {
      return;
    }

    cancelPendingThreadExplorerCardClick();
    event.preventDefault();
    event.stopPropagation();
    threadExplorerLastTouchZoomTarget = {
      uri: "",
      timestamp: 0,
    };
    toggleThreadExplorerCardZoom(item);
  }
  return Object.freeze({ click: handleThreadExplorerCardClick, doubleClick: handleThreadExplorerCardDoubleClick,
    pointerUp: handleThreadExplorerCardPointerUp, cancel: cancelPendingThreadExplorerCardClick });
}

/**
 * Coordinates exact-URI focus, root selection and measured card centering.
 * @param {object} options - Mode/selection, DOM measurement, pan calculation, state and render adapters.
 * @returns {object} Find, reveal, root and selected-focus operations.
 */
export function createThreadExplorerFocusController(options) {
  /**
   * Scrolls the Thread Explorer tree to its root node.
   * @returns {void}
   */
  function scrollThreadExplorerToRoot() {
    if (options.isClusterMode()) {
      const rootUri = String(options.getRootUri() || "").trim();
      if (rootUri) {
        const rootItem = findRenderedThreadExplorerNode(rootUri);
        if (rootItem) {
          scrollThreadExplorerNodeIntoView(rootItem, {
            block: "center",
            inline: "center",
          });
        }
      }
      return;
    }
    const firstNode = options.getViewportElement().querySelector(".thread-explorer-node-item");
    if (!firstNode) {
      return;
    }

    scrollThreadExplorerNodeIntoView(firstNode, {
      block: "center",
      inline: "center",
    });
  }

  /**
   * Scrolls one rendered Thread Explorer node into the viewport.
   * @param {HTMLElement} item - Rendered node item to reveal.
   * @param {object} alignment - Scroll placement options.
   * @param {string} alignment.block - Vertical placement: "start" or "center".
   * @param {string} alignment.inline - Horizontal placement: "start" or "center".
   * @returns {void}
   */
  function scrollThreadExplorerNodeIntoView(item, alignment = {}) {
    if (!item) {
      return;
    }
    const element = options.getViewportElement();
    const rect = element.getBoundingClientRect();
    const target = options.getCard(item) || item;
    const viewport = options.calculatePan(options.getViewport(), {
      left: rect.left, top: rect.top, width: element.clientWidth, height: element.clientHeight,
    }, target.getBoundingClientRect(), alignment);
    if (!viewport) {
      return;
    }
    options.setViewport(viewport);
    options.render();
    options.renderEdges();
  }

  /**
   * Finds a rendered Thread Explorer node item by exact post URI.
   * @param {string} uri - AT URI to locate in the rendered tree.
   * @returns {HTMLElement|null} Matching rendered node item, or null.
   */
  function findRenderedThreadExplorerNode(uri) {
    const normalizedUri = String(uri || "").trim();
    if (!normalizedUri) {
      return null;
    }

    const items = options.getStage().querySelectorAll(".thread-explorer-node-item");
    for (const item of items) {
      if (item.dataset.uri === normalizedUri) {
        return item;
      }
    }
    return null;
  }

  /**
   * Scrolls the selected Thread Explorer post into the center of the viewport.
   * @returns {void}
   */
  function focusSelectedThreadExplorerNode() {
    if (options.isClusterMode()) {
      const clusterUri = String(options.getSelectedUri() || options.getRootUri() || "").trim();
      if (!clusterUri) {
        return;
      }

      const clusterItem = findRenderedThreadExplorerNode(clusterUri);
      if (!clusterItem) {
        return;
      }

      scrollThreadExplorerNodeIntoView(clusterItem, {
        block: "center",
        inline: "center",
      });
      return;
    }
    const rootUri = String(options.getRootUri() || "").trim();
    if (rootUri && rootUri === options.getSelectedUri()) {
      scrollThreadExplorerToRoot();
      return;
    }

    const item = findRenderedThreadExplorerNode(options.getSelectedUri());
    if (!item) {
      return;
    }
    scrollThreadExplorerNodeIntoView(item, {
      block: "center",
      inline: "center",
    });
  }
  return Object.freeze({ find: findRenderedThreadExplorerNode, reveal: scrollThreadExplorerNodeIntoView,
    root: scrollThreadExplorerToRoot, focus: focusSelectedThreadExplorerNode });
}

/** Owns optimistic like/unlike mutations and in-flight request deduplication.
 * @param {object} options - liked, likeUri, like, unlike, apply, refresh and error callbacks.
 * @returns {object} Frozen toggle and pending-query API; the pending set stays private.
 */
export function createLivePostInteractionController(options) {
  for (const key of ['liked','likeUri','like','unlike','apply','refresh','error']) {
    if (typeof options?.[key] !== 'function') { throw new TypeError('Live post interactions require ' + key); }
  }
  const pending = new Set();
  const { liked: isPostLikedByViewer, likeUri: getViewerLikeUri } = options;
  /** Toggles one valid post, rolling back optimistic state on failure. @param {object} post - Normalized post. @returns {Promise<void>} Settled request. */
  async function toggleLikeForLivePost(post = {}) {
    const postUri = String(post?.uri || "").trim();
    const postCid = String(post?.cid || "").trim();
    if (!postUri || !postCid) {
      return;
    }
    if (pending.has(postUri)) {
      return;
    }

    const wasLiked = isPostLikedByViewer(post);
    const previousLikeUri = getViewerLikeUri(post);
    let nextLikeUri = "";
    let delta = 0;

    if (wasLiked) {
      delta = -1;
    } else {
      delta = 1;
      nextLikeUri = `pending:${postUri}`;
    }

    pending.add(postUri);
    options.apply(postUri, nextLikeUri, delta);
    options.refresh(postUri);

    try {
      if (wasLiked) {
        await options.unlike(previousLikeUri);
        options.apply(postUri, "", 0);
      } else {
        const result = await options.like({
          uri: postUri,
          cid: postCid,
        });
        options.apply(postUri, String(result?.uri || "").trim(), 0);
      }
    } catch (error) {
      options.apply(postUri, previousLikeUri, delta * -1);
      options.error(error);
    } finally {
      pending.delete(postUri);
      options.refresh(postUri);
    }
  }
  return Object.freeze({ toggle: toggleLikeForLivePost, pending: uri => pending.has(uri) });
}
