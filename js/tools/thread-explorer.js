/**
 * Returns a normalized account target mode for the Thread Explorer.
 * @param {string} mode - Raw mode value from UI or saved state.
 * @returns {string} One of posts, replies, or all.
 */
export function normalizeThreadExplorerAccountMode(mode) {
  const normalizedMode = String(mode || "").trim();
  if (normalizedMode === "replies") {
    return "replies";
  }
  if (normalizedMode === "all") {
    return "all";
  }
  return "posts";
}

/**
 * Normalizes the selected Actor-Fokus mode.
 * @param {string} mode - Raw Actor-Fokus mode.
 * @returns {string} One of posts, replies, or all.
 */
export function normalizeThreadExplorerActorFocusMode(mode) {
  return normalizeThreadExplorerAccountMode(mode);
}

/**
 * Builds a minimal actor object from a handle or DID input.
 * @param {string} actorValue - Raw actor identifier.
 * @param {(value: string) => string} normalizeActor - Actor identifier normalizer.
 * @returns {object} Actor stub with handle or DID fields.
 */
export function createThreadExplorerActorStub(actorValue = "", normalizeActor = (value) => value) {
  const normalizedActor = normalizeActor(actorValue);
  if (!normalizedActor) {
    return {};
  }
  if (normalizedActor.startsWith("did:")) {
    return { did: normalizedActor, handle: "", displayName: normalizedActor };
  }
  return { did: "", handle: normalizedActor, displayName: normalizedActor };
}

/**
 * Checks whether an actor matches the active account.
 * @param {object|null} actor - Actor with optional handle and DID.
 * @param {string} ownHandle - Active account handle.
 * @param {string} ownDid - Active account DID.
 * @param {(value: string) => string} normalizeActor - Actor identifier normalizer.
 * @returns {boolean} True when handle or DID matches.
 */
export function isThreadExplorerOwnActor(actor = null, ownHandle = "", ownDid = "", normalizeActor = (value) => value) {
  const actorHandle = normalizeActor(actor?.handle || "").toLowerCase();
  const actorDid = normalizeActor(actor?.did || "").toLowerCase();
  const normalizedHandle = normalizeActor(ownHandle).toLowerCase();
  const normalizedDid = normalizeActor(ownDid).toLowerCase();
  if (actorDid && normalizedDid && actorDid === normalizedDid) {
    return true;
  }
  if (actorHandle && normalizedHandle && actorHandle === normalizedHandle) {
    return true;
  }
  return false;
}

/**
 * Resolves the active account label for Thread Explorer actions.
 * @param {Array<object>} accounts - Stored account entries.
 * @param {string} activeDid - DID of the active account.
 * @param {string} fallbackAccount - Fallback handle or identifier.
 * @returns {string} Account label without leading at signs.
 */
export function getThreadExplorerOwnActor(accounts = [], activeDid = "", fallbackAccount = "") {
  const activeAccount = (Array.isArray(accounts) ? accounts : []).find((account) => {
    return account?.did && account.did === activeDid;
  }) || null;
  const actor = String(
    activeAccount?.handle
    || activeAccount?.identifier
    || fallbackAccount
    || activeDid
    || "",
  ).trim();
  return actor.replace(/^@+/, "");
}

/**
 * Checks whether an account-field value targets the active account.
 * @param {string} target - Account handle or DID from the UI.
 * @param {string} ownHandle - Active account handle.
 * @param {string} ownDid - Active account DID.
 * @param {(value: string) => string} normalizeActor - Actor identifier normalizer.
 * @returns {boolean} True for an empty target or a matching handle/DID.
 */
export function isThreadExplorerOwnAccountTarget(target = "", ownHandle = "", ownDid = "", normalizeActor = (value) => value) {
  const normalizedTarget = normalizeActor(target);
  if (!normalizedTarget) {
    return true;
  }
  const normalizedHandle = normalizeActor(ownHandle);
  const normalizedDid = normalizeActor(ownDid);
  if (normalizedHandle && normalizedTarget.toLowerCase() === normalizedHandle.toLowerCase()) {
    return true;
  }
  if (normalizedDid && normalizedTarget.toLowerCase() === normalizedDid.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Checks whether the Thread Explorer should use a foreign-account feed.
 * @param {string} target - Account handle or DID from the UI.
 * @param {string} ownHandle - Active account handle.
 * @param {string} ownDid - Active account DID.
 * @param {(value: string) => string} normalizeActor - Actor identifier normalizer.
 * @returns {boolean} True when the target is a foreign account.
 */
export function isThreadExplorerForeignAccountMode(target = "", ownHandle = "", ownDid = "", normalizeActor = (value) => value) {
  return !isThreadExplorerOwnAccountTarget(target, ownHandle, ownDid, normalizeActor);
}

/**
 * Checks whether the current actor focus belongs to another account.
 * @param {object|null} actor - Actor currently focused in the explorer.
 * @param {string} ownHandle - Handle of the signed-in account.
 * @param {string} ownDid - DID of the signed-in account.
 * @param {Function} normalizeActor - Actor normalization function.
 * @returns {boolean} True when the focus is a foreign account.
 */
export function isThreadExplorerForeignActorFocusMode(actor = null, ownHandle = "", ownDid = "", normalizeActor = (value) => value) {
  if (!actor) {
    return false;
  }
  return !isThreadExplorerOwnActor(actor, ownHandle, ownDid, normalizeActor);
}

/**
 * Selects the actor value that should be loaded for the current account mode.
 * @param {string} accountActor - Actor value from the account field.
 * @param {string} ownHandle - Handle of the signed-in account.
 * @param {string} ownDid - DID of the signed-in account.
 * @param {Function} normalizeActor - Actor normalization function.
 * @returns {string} Normalized foreign actor or the signed-in handle/DID.
 */
export function getThreadExplorerRequestedActor(accountActor = "", ownHandle = "", ownDid = "", normalizeActor = (value) => value) {
  if (isThreadExplorerForeignAccountMode(accountActor, ownHandle, ownDid, normalizeActor)) {
    return normalizeActor(accountActor);
  }
  if (ownDid) {
    return ownDid;
  }
  return normalizeActor(ownHandle);
}

/**
 * Normalizes a persisted Thread Explorer source.
 * @param {string} source - Raw source value.
 * @param {object} options - Feed validator and saved-search lookup callbacks.
 * @returns {string} Validated source value.
 */
export function normalizeThreadExplorerSource(source, options = {}) {
  const normalizedSource = String(source || "").trim();
  if (normalizedSource === "mutuals" || normalizedSource === "followers") {
    return normalizedSource;
  }
  if (normalizedSource.startsWith("feed:")) {
    const feedUri = normalizedSource.slice(5).trim();
    if (options.isFeedUri(feedUri)) {
      return `feed:${feedUri}`;
    }
  }
  if (normalizedSource.startsWith("search:")) {
    const searchId = normalizedSource.slice(7).trim();
    if (options.hasSavedSearch(searchId)) {
      return `search:${searchId}`;
    }
  }
  return "follows";
}

/**
 * Extracts a feed-generator URI from a Thread Explorer source.
 * @param {string} source - Source value.
 * @returns {string} Feed URI or an empty string.
 */
export function getThreadExplorerFeedUriFromSource(source) {
  const value = String(source || "").trim();
  if (!value.startsWith("feed:")) {
    return "";
  }
  return value.slice(5).trim();
}

/**
 * Extracts a saved-search identifier from a Thread Explorer source.
 * @param {string} source - Source value.
 * @returns {string} Saved-search identifier or an empty string.
 */
export function getThreadExplorerSearchIdFromSource(source) {
  const value = String(source || "").trim();
  if (!value.startsWith("search:")) {
    return "";
  }
  return value.slice(7).trim();
}

/**
 * Normalizes a Thread Explorer layout orientation.
 * @param {string} orientation - Raw orientation value.
 * @param {string} horizontalValue - Configured horizontal value.
 * @returns {string} Horizontal or vertical orientation.
 */
export function normalizeThreadExplorerOrientation(orientation, horizontalValue = "horizontal") {
  if (orientation === horizontalValue) {
    return horizontalValue;
  }
  return "vertical";
}

/**
 * Normalizes a Thread Explorer view mode.
 * @param {string} mode - Raw view mode value.
 * @param {string} clusterValue - Configured reply-cluster value.
 * @returns {string} Reply-cluster or tree mode.
 */
export function normalizeThreadExplorerViewMode(mode, clusterValue = "reply-cluster") {
  if (mode === clusterValue) {
    return clusterValue;
  }
  return "tree";
}

/**
 * Handles a pinned-feed selection change.
 * @param {Event} event - Select change event.
 * @param {object} options - Source normalization and source-selection callbacks.
 * @returns {void}
 */
export function handleThreadExplorerFeedSelectChange(event, options = {}) {
  const source = options.normalizeSource(event?.currentTarget?.value || "");
  if (!source.startsWith("feed:")) {
    return;
  }
  options.setSource(source);
}

/**
 * Handles a relationship-source selection change.
 * @param {Event} event - Select change event.
 * @param {object} options - Source normalization and source-selection callbacks.
 * @returns {void}
 */
export function handleThreadExplorerSourceSelectChange(event, options = {}) {
  const source = options.normalizeSource(event?.currentTarget?.value || "");
  options.setSource(source);
}

/**
 * Loads another Thread Explorer feed page when the list nears its end.
 * @param {object} list - Scrollable feed list element.
 * @param {object} state - Loading and pagination state.
 * @param {Function} loadPage - Callback that loads the next page.
 * @returns {void}
 */
export function handleThreadExplorerFeedScroll(list, state = {}, loadPage = () => {}) {
  if (!list || state.hasMore !== true || state.loading === true) {
    return;
  }
  const remaining = list.scrollHeight - list.scrollTop - list.clientHeight;
  if (remaining > 240) {
    return;
  }
  void loadPage({ append: true });
}

/**
 * Loads another Actor-Fokus page when the list nears its end.
 * @param {object} list - Scrollable actor-focus list element.
 * @param {object} state - Loading and pagination state.
 * @param {Function} loadPage - Callback that loads the next page.
 * @returns {void}
 */
export function handleThreadExplorerActorFocusScroll(list, state = {}, loadPage = () => {}) {
  if (!list || state.hasMore !== true || state.loading === true) {
    return;
  }
  const remaining = list.scrollHeight - list.scrollTop - list.clientHeight;
  if (remaining > 240) {
    return;
  }
  void loadPage({ append: true });
}

/**
 * Changes the Actor-Fokus mode and requests a fresh page.
 * @param {Event} event - Mode select change event.
 * @param {object} options - Mode normalizer, state setter and loader callbacks.
 * @returns {void}
 */
export function handleThreadExplorerActorModeChange(event, options = {}) {
  const mode = options.normalizeMode(event?.currentTarget?.value || "");
  options.setMode(mode);
  void options.loadFeed({ append: false });
}

/**
 * Handles a Thread Explorer zoom-out button click.
 * @param {object} options - Zoom cancellation and state callbacks.
 * @returns {void}
 */
export function handleThreadExplorerZoomOutClick(options = {}) {
  options.cancelPendingZoomReset();
  options.setZoom(options.getZoom() / 1.15);
}

/**
 * Handles a Thread Explorer zoom-in button click.
 * @param {object} options - Zoom cancellation and state callbacks.
 * @returns {void}
 */
export function handleThreadExplorerZoomInClick(options = {}) {
  options.cancelPendingZoomReset();
  options.setZoom(options.getZoom() * 1.15);
}

/**
 * Handles a Thread Explorer orientation button click.
 * @param {Function} toggleOrientation - Orientation toggle callback.
 * @returns {void}
 */
export function handleThreadExplorerOrientationClick(toggleOrientation = () => {}) {
  toggleOrientation();
}

/**
 * Handles a reaction-count click on a Thread Explorer card.
 * @param {Event} event - Click event from a reaction count button.
 * @param {Function} openDialog - Callback receiving type, URI and CID.
 * @returns {void}
 */
export function handleThreadExplorerCountClick(event, openDialog = () => {}) {
  const button = event?.currentTarget;
  const type = String(button?.dataset?.reactionType || "").trim();
  const uri = String(button?.dataset?.uri || "").trim();
  const cid = String(button?.dataset?.cid || "").trim();
  if (!type || !uri) {
    return;
  }
  void openDialog(type, uri, cid);
}

/**
 * Handles a reply-count click on a Thread Explorer card.
 * @param {Event} event - Click event from a reply count button.
 * @param {Function} openDialog - Callback receiving the post URI.
 * @returns {void}
 */
export function handleThreadExplorerRepliesCountClick(event, openDialog = () => {}) {
  const uri = String(event?.currentTarget?.dataset?.uri || "").trim();
  if (uri) {
    openDialog(uri);
  }
}

/**
 * Toggles one Reply-Cluster subtree while preserving all other open states.
 * @param {string} uri - AT URI of the cluster node.
 * @param {Set<string>} expandedUris - Mutable set of expanded node URIs.
 * @param {Function} rerender - Callback that rebuilds the cluster geometry.
 * @returns {void}
 */
export function toggleThreadExplorerReplyClusterNode(uri, expandedUris, rerender = () => {}) {
  const normalizedUri = String(uri || "").trim();
  if (!normalizedUri || !expandedUris || typeof expandedUris.has !== "function") {
    return;
  }
  if (expandedUris.has(normalizedUri)) {
    expandedUris.delete(normalizedUri);
  } else {
    expandedUris.add(normalizedUri);
  }
  rerender();
}

/**
 * Handles wheel input for Thread Explorer pan or zoom behavior.
 * @param {WheelEvent} event - Wheel event from the viewport.
 * @param {object} actions - Pan, zoom and edge-render callbacks.
 * @returns {void}
 */
export function handleThreadExplorerWheel(event, actions = {}) {
  event.preventDefault();
  if (event.altKey || event.shiftKey) {
    actions.scrollDelta(-event.deltaX, -event.deltaY);
    actions.renderEdges();
    return;
  }
  if (event.deltaY < 0) {
    actions.zoomAtPoint(1.14, event.clientX, event.clientY);
  } else {
    actions.zoomAtPoint(1 / 1.14, event.clientX, event.clientY);
  }
}

/**
 * Starts pointer panning for the Thread Explorer viewport.
 * @param {PointerEvent} event - Pointer-down event.
 * @param {object} state - Mutable drag state holder.
 * @param {object} actions - Interaction and pointer-capture callbacks.
 * @returns {boolean} True when panning was armed.
 */
export function handleThreadExplorerPointerDown(event, state, actions = {}) {
  if (event.button !== 0 || actions.isInteractiveTarget(event.target)) {
    return false;
  }
  actions.cancelInertia();
  actions.setPanArmed(true);
  state.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    panX: actions.getPanX(),
    panY: actions.getPanY(),
    started: false,
    lastSampleX: event.clientX,
    lastSampleY: event.clientY,
    lastSampleTime: event.timeStamp,
    velocityX: 0,
    velocityY: 0,
  };
  actions.capturePointer(event.pointerId);
  event.preventDefault();
  return true;
}

/**
 * Updates pointer panning and velocity for the Thread Explorer viewport.
 * @param {PointerEvent} event - Pointer-move event.
 * @param {object} state - Mutable drag state holder.
 * @param {object} actions - Pan and transform callbacks.
 * @returns {boolean} True when the event was handled.
 */
export function handleThreadExplorerPointerMove(event, state, actions = {}) {
  const dragState = state.value;
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return false;
  }
  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;
  if (dragState.started !== true) {
    const movement = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (movement < actions.dragThreshold) {
      return false;
    }
    dragState.started = true;
    actions.setPanning(true);
  }
  actions.updateVelocity(dragState, event);
  actions.setPan(dragState.panX + deltaX, dragState.panY + deltaY);
  actions.applyTransform();
  event.preventDefault();
  return true;
}

/**
 * Finishes pointer panning and starts inertia when movement occurred.
 * @param {PointerEvent} event - Pointer-up or pointer-cancel event.
 * @param {object} state - Mutable drag state holder.
 * @param {object} actions - Capture, inertia and state callbacks.
 * @returns {boolean} True when the event belonged to the active drag.
 */
export function handleThreadExplorerPointerUp(event, state, actions = {}) {
  const dragState = state.value;
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return false;
  }
  state.value = null;
  actions.releasePointer(event.pointerId);
  if (dragState.started === true) {
    actions.setVelocity(dragState.velocityX, dragState.velocityY);
    actions.startInertia();
  } else {
    actions.setPanning(false);
  }
  return true;
}

/**
 * Updates a recent pointer velocity sample.
 * @param {object} state - Active drag state.
 * @param {PointerEvent} event - Current pointer event.
 * @returns {void}
 */
export function updateThreadExplorerPanVelocity(state, event) {
  if (!state) {
    return;
  }
  const lastSampleTime = Number(state.lastSampleTime) || 0;
  const elapsedMs = Math.max(1, event.timeStamp - lastSampleTime);
  state.velocityX = (event.clientX - state.lastSampleX) / elapsedMs;
  state.velocityY = (event.clientY - state.lastSampleY) / elapsedMs;
  state.lastSampleX = event.clientX;
  state.lastSampleY = event.clientY;
  state.lastSampleTime = event.timeStamp;
}

/**
 * Applies a viewport pan delta to mutable pan coordinates.
 * @param {object} state - Object containing panX and panY.
 * @param {number} deltaX - Horizontal movement delta.
 * @param {number} deltaY - Vertical movement delta.
 * @returns {object} Updated pan state.
 */
export function applyThreadExplorerPanDelta(state, deltaX, deltaY) {
  state.panX += Number(deltaX) || 0;
  state.panY += Number(deltaY) || 0;
  return state;
}

/**
 * Applies the visual CSS state for Thread Explorer panning.
 * @param {object} elements - Tree and stage elements.
 * @param {boolean} active - Whether active dragging or inertia is running.
 * @returns {void}
 */
export function setThreadExplorerPanningMode(elements = {}, active = false) {
  const isActive = active === true;
  if (elements.tree) {
    elements.tree.classList.toggle("is-dragging", isActive);
    if (!isActive) {
      elements.tree.classList.remove("is-pan-armed");
    }
  }
  if (elements.stage) {
    elements.stage.classList.toggle("is-panning", isActive);
  }
}

/**
 * Advances inertia velocity by frame friction and checks its stop threshold.
 * @param {object} state - Mutable velocity state.
 * @param {number} elapsedMs - Elapsed frame time in milliseconds.
 * @param {number} friction - Base friction factor.
 * @param {number} stopVelocity - Maximum velocity before stopping.
 * @returns {boolean} True while inertia should continue.
 */
export function advanceThreadExplorerPanInertia(state, elapsedMs, friction, stopVelocity) {
  const frameFriction = Math.pow(friction, Math.max(1, elapsedMs) / 16.67);
  state.velocityX *= frameFriction;
  state.velocityY *= frameFriction;
  const magnitude = Math.max(Math.abs(state.velocityX), Math.abs(state.velocityY));
  return magnitude > stopVelocity;
}

/**
 * Owns the animation frame and velocity of one viewport's inertial pan.
 * @param {object} options - Frame/clock, drag, movement, visual and edge adapters plus thresholds.
 * @returns {object} Velocity sampling, start, cancel and active-frame operations.
 */
export function createThreadExplorerPanController(options) {
  let frame = 0;
  const velocity = { velocityX: 0, velocityY: 0 };
  let previousTime = 0;

  /** Sets the released pointer velocity in CSS pixels per millisecond.
   * @param {number} x - Horizontal velocity.
   * @param {number} y - Vertical velocity.
   * @returns {void}
   */
  function setVelocity(x, y) {
    velocity.velocityX = 0;
    velocity.velocityY = 0;
    if (Number.isFinite(x)) { velocity.velocityX = x; }
    if (Number.isFinite(y)) { velocity.velocityY = y; }
  }

  /** Cancels animation and discards velocity, preserving an active drag's visual state.
   * @returns {void}
   */
  function cancel() {
    if (frame) { options.cancelFrame(frame); }
    frame = 0;
    setVelocity(0, 0);
    if (!options.isDragging()) { options.setPanning(false); }
  }

  /** Advances movement and friction until the stop threshold is reached.
   * @param {number} now - Animation timestamp in milliseconds.
   * @returns {void}
   */
  function step(now) {
    const elapsed = Math.max(1, now - previousTime);
    previousTime = now;
    options.move(velocity.velocityX * elapsed, velocity.velocityY * elapsed);
    if (!advanceThreadExplorerPanInertia(velocity, elapsed, options.friction, options.stopVelocity)) {
      frame = 0;
      setVelocity(0, 0);
      options.setPanning(false);
      options.renderEdges();
      return;
    }
    frame = options.requestFrame(step);
  }

  /** Starts inertia from the latest release sample, replacing a previous animation.
   * @returns {void}
   */
  function start() {
    const { velocityX, velocityY } = velocity;
    cancel();
    setVelocity(velocityX, velocityY);
    if (Math.max(Math.abs(velocityX), Math.abs(velocityY)) < options.minVelocity) {
      setVelocity(0, 0);
      options.setPanning(false);
      options.renderEdges();
      return;
    }
    previousTime = options.now();
    options.setPanning(true);
    frame = options.requestFrame(step);
  }

  /** Reports whether a frame is pending so edge rendering can wait for the pan.
   * @returns {boolean} Whether animation is active.
   */
  function isActive() { return frame !== 0; }
  return Object.freeze({ setVelocity, start, cancel, isActive });
}

/**
 * Returns a normalized actor value without leading at signs.
 * @param {string} value - Raw actor field value.
 * @returns {string} Trimmed handle or DID.
 */
export function normalizeThreadExplorerActor(value = "") {
  return String(value || "").trim().replace(/^@+/, "");
}

/**
 * Returns the stable actor id used for actor-focus requests.
 * @param {object} actor - Normalized Thread Explorer actor.
 * @returns {string} Actor DID, handle, or an empty string.
 */
export function getThreadExplorerActorFocusId(actor = {}) {
  const did = String(actor?.did || "").trim();
  if (did) {
    return did;
  }
  return String(actor?.handle || "").trim();
}

/**
 * Checks whether a value is an AT URI for a Bluesky feed generator.
 * @param {string} value - Raw URI candidate.
 * @returns {boolean} True when the URI looks like a feed generator URI.
 */
export function isThreadExplorerFeedUri(value) {
  return /^at:\/\/[^/]+\/app\.bsky\.feed\.generator\/[^/]+$/i.test(String(value || "").trim());
}

/**
 * Converts a feed generator URI into an internal Thread Explorer source value.
 * @param {string} uri - Feed generator AT URI.
 * @returns {string} Source value, or an empty string when invalid.
 */
export function buildThreadExplorerFeedSource(uri) {
  const feedUri = String(uri || "").trim();
  if (!isThreadExplorerFeedUri(feedUri)) {
    return "";
  }
  return `feed:${feedUri}`;
}

/**
 * Extracts the record key from an AT Protocol post URI.
 * @param {string} uri - AT URI of a post.
 * @returns {string} Record key, or an empty string when invalid.
 */
export function getThreadExplorerPostRecordKey(uri) {
  const raw = String(uri || "").trim();
  if (!raw.startsWith("at://")) {
    return "";
  }

  const parts = raw.slice(5).split("/");
  if (parts.length < 3) {
    return "";
  }
  if (parts[1] !== "app.bsky.feed.post") {
    return "";
  }
  return String(parts[2] || "").trim();
}

/**
 * Builds a public web URL for a Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {string} webApp - Public web frontend base URL.
 * @returns {string} Web URL for the post, or an empty string.
 */
export function buildThreadExplorerPostWebUrl(post, webApp) {
  const handle = String(post?.author?.handle || "").trim();
  const recordKey = getThreadExplorerPostRecordKey(post?.uri);
  if (!handle || !recordKey || !webApp) {
    return "";
  }
  return `${String(webApp).replace(/\/$/, "")}/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordKey)}`;
}

/**
 * Returns the normalized image list for one Thread Explorer post.
 * @param {object|null|undefined} post - Normalized Thread Explorer post.
 * @returns {object[]} Image records safe to render in the gallery.
 */
export function getThreadExplorerPostImages(post) {
  if (!Array.isArray(post?.images)) {
    return [];
  }
  return post.images.filter((image) => image && typeof image === "object");
}

/**
 * Returns the preferred full and preview source for one gallery image.
 * @param {object|null|undefined} image - Normalized post image entry.
 * @returns {{source: string, thumb: string}} Image source pair.
 */
export function getThreadExplorerImageSources(image) {
  const fullsize = String(image?.fullsize || "").trim();
  const thumb = String(image?.thumb || "").trim();
  let source = fullsize;
  if (!source) {
    source = thumb;
  }
  let preview = thumb;
  if (!preview) {
    preview = source;
  }
  return { source, thumb: preview };
}

/**
 * Normalizes one image entry for the Thread Explorer gallery.
 * @param {object|null|undefined} image - Raw image entry from a post.
 * @returns {{src: string, thumb: string, alt: string}|null} Gallery entry, or null when no image URL exists.
 */
export function normalizeThreadExplorerGalleryImage(image) {
  const fullsize = String(image?.fullsize || "").trim();
  const thumb = String(image?.thumb || "").trim();
  let source = fullsize;
  if (!source) {
    source = thumb;
  }
  if (!source) {
    return null;
  }
  let preview = thumb;
  if (!preview) {
    preview = source;
  }
  return {
    src: source,
    thumb: preview,
    alt: String(image?.alt || "").trim(),
  };
}

/**
 * Normalizes all usable images for one Thread Explorer gallery.
 * @param {object[]} images - Raw image entries from a post.
 * @returns {Array<{src: string, thumb: string, alt: string}>} Ordered gallery entries with unusable images removed.
 */
export function normalizeThreadExplorerGalleryImages(images = []) {
  if (!Array.isArray(images)) {
    return [];
  }
  const normalizedImages = [];
  images.forEach((image) => {
    const normalizedImage = normalizeThreadExplorerGalleryImage(image);
    if (normalizedImage) {
      normalizedImages.push(normalizedImage);
    }
  });
  return normalizedImages;
}

/**
 * Builds the normalized state used when opening a Thread Explorer gallery.
 * @param {object[]} images - Raw image entries from a post.
 * @param {number} startIndex - Requested initially selected image index.
 * @returns {{images: Array<{src: string, thumb: string, alt: string}>, index: number}|null} Gallery state, or null when no usable images exist.
 */
export function buildThreadExplorerGalleryState(images = [], startIndex = 0) {
  const normalizedImages = normalizeThreadExplorerGalleryImages(images);
  if (!normalizedImages.length) {
    return null;
  }
  const requestedIndex = Number(startIndex) || 0;
  const index = Math.min(normalizedImages.length - 1, Math.max(0, requestedIndex));
  return {
    images: normalizedImages,
    index,
  };
}

/**
 * Owns gallery image selection and coordinates existing template-based renderers.
 * @param {object} options - Gallery elements, thumbnail template, translation and dialog/error adapters.
 * @returns {object} Open, render, relative-step and current-image operations.
 */
export function createThreadExplorerGalleryController(options) {
  let images = [];
  let index = 0;

  /** Returns the selected normalized image, if a gallery has been opened.
   * @returns {object|undefined} Selected image.
   */
  function getCurrent() {
    return images[index];
  }

  /** Renders the selected image and thumbnail selection through the shared renderer.
   * @returns {void}
   */
  function render() {
    const image = getCurrent();
    if (!image) {
      return;
    }
    renderThreadExplorerGalleryView({ image, imageCount: images.length, selectedIndex: index,
      elements: options.elements, translate: options.translate, applyTranslatedTitle: options.applyTranslatedTitle });
  }

  /** Opens a normalized image collection at the requested starting index.
   * @param {object[]} entries - Raw gallery images.
   * @param {number} startIndex - Initial selection index.
   * @returns {void}
   */
  function open(entries, startIndex) {
    const state = buildThreadExplorerGalleryState(entries, startIndex);
    if (!state) {
      return;
    }
    images = state.images;
    index = state.index;
    renderThreadExplorerGalleryThumbnails(options.elements.thumbs, options.templateContent, images, (selectedIndex) => {
      index = selectedIndex;
      render();
    }, options.onThumbnailError);
    render();
    options.show();
  }

  /** Advances the selection with wrap-around, ignoring empty/zero-step galleries.
   * @param {number} delta - Relative image movement.
   * @returns {void}
   */
  function step(delta) {
    if (images.length <= 1) {
      return;
    }
    const numericDelta = Number(delta) || 0;
    if (!numericDelta) {
      return;
    }
    index = advanceThreadExplorerGalleryIndex(index, numericDelta, images.length);
    render();
  }
  return Object.freeze({ open, render, step, getCurrent });
}

/**
 * Resolves selection in current, stored and first-feed-item priority order.
 * @param {object} options - Current URI, feed items, lazy stored-selection reader and outside-feed flag.
 * @returns {string} Selected URI or an empty string when no selection exists.
 */
export function resolveThreadExplorerSelection(options) {
  let items = [];
  if (Array.isArray(options.items)) {
    items = options.items;
  }
  const currentUri = String(options.currentUri || "").trim();
  if (currentUri && (options.allowStoredOutsideFeed === true || containsUri(currentUri))) {
    return currentUri;
  }
  const stored = options.readStoredSelection();
  if (stored?.selectedUri && (options.allowStoredOutsideFeed === true || containsUri(stored.selectedUri))) {
    return stored.selectedUri;
  }
  return String(items[0]?.post?.uri || "").trim();

  /** Checks exact post membership, retaining the original URI trimming rule.
   * @param {string} uri - Candidate post URI.
   * @returns {boolean} Whether the URI occurs in the current feed.
   */
  function containsUri(uri) {
    const normalizedUri = String(uri || "").trim();
    if (!normalizedUri) {
      return false;
    }
    return items.some((item) => String(item?.post?.uri || "").trim() === normalizedUri);
  }
}

/**
 * Calculates a wrapped gallery index for a relative movement.
 * @param {number} currentIndex - Currently selected image index.
 * @param {number} step - Relative movement, negative for previous and positive for next.
 * @param {number} imageCount - Number of images in the gallery.
 * @returns {number} Next index, or the current index when movement is invalid.
 */
export function advanceThreadExplorerGalleryIndex(currentIndex, step, imageCount) {
  const count = Number(imageCount) || 0;
  const movement = Number(step) || 0;
  if (count <= 1 || !movement) {
    return Number(currentIndex) || 0;
  }
  return ((Number(currentIndex) || 0) + movement + count) % count;
}

/**
 * Selects the next safe source after a gallery image load failure.
 * @param {{src: string, thumb: string}|null|undefined} image - Current gallery image.
 * @param {boolean} fallbackAttempted - Whether the thumbnail fallback was already tried.
 * @returns {{source: string, fallbackAttempted: boolean, shouldHide: boolean}} Fallback rendering decision.
 */
export function getThreadExplorerGalleryFallbackDecision(image, fallbackAttempted = false) {
  if (!image) {
    return { source: "", fallbackAttempted: false, shouldHide: true };
  }
  if (image.thumb && fallbackAttempted !== true) {
    return { source: image.thumb, fallbackAttempted: true, shouldHide: false };
  }
  return { source: "", fallbackAttempted: true, shouldHide: true };
}

/**
 * Renders the selectable thumbnail buttons for a gallery.
 * @param {HTMLElement|null} container - Thumbnail container to replace.
 * @param {DocumentFragment|HTMLElement|null} templateContent - Template content containing one thumbnail button.
 * @param {Array<{src: string, thumb: string, alt: string}>} images - Normalized gallery images.
 * @param {(index: number) => void} onSelect - Callback invoked with the selected image index.
 * @param {(event: Event) => void} onImageError - Callback for failed thumbnail images.
 * @returns {void} No return value.
 */
export function renderThreadExplorerGalleryThumbnails(container, templateContent, images = [], onSelect = () => {}, onImageError = () => {}) {
  if (!container || !templateContent) {
    return;
  }
  container.replaceChildren();
  images.forEach((image, index) => {
    const fragment = templateContent.cloneNode(true);
    const button = fragment.querySelector(".thread-explorer-gallery-thumb");
    const imageElement = fragment.querySelector("img");
    if (!button || !imageElement) {
      return;
    }
    imageElement.src = image.thumb;
    imageElement.alt = image.alt;
    imageElement.addEventListener("error", onImageError);
    button.dataset.index = String(index);
    button.addEventListener("click", () => {
      onSelect(index);
    });
    container.appendChild(fragment);
  });
}

/**
 * Renders the currently selected image and navigation state of the gallery.
 * @param {object} options - Gallery rendering inputs.
 * @param {{src: string, thumb: string, alt: string}|null} options.image - Currently selected image.
 * @param {number} options.imageCount - Number of images in the gallery.
 * @param {number} options.selectedIndex - Currently selected image index.
 * @param {object} options.elements - Gallery DOM elements.
 * @param {HTMLElement} options.elements.image - Main gallery image.
 * @param {HTMLElement} options.elements.caption - Image caption element.
 * @param {HTMLElement} options.elements.title - Gallery title element.
 * @param {HTMLElement} options.elements.thumbs - Thumbnail container.
 * @param {HTMLElement|null} options.elements.previousButton - Inline previous button.
 * @param {HTMLElement|null} options.elements.nextButton - Inline next button.
 * @param {HTMLElement|null} options.elements.overlayPreviousButton - Overlay previous button.
 * @param {HTMLElement|null} options.elements.overlayNextButton - Overlay next button.
 * @param {HTMLElement|null} options.elements.overlayCloseButton - Overlay close button.
 * @param {Function} options.translate - Resolves visible labels.
 * @param {Function} options.applyTranslatedTitle - Applies translated control titles.
 * @returns {void} No return value.
 */
export function renderThreadExplorerGalleryView(options = {}) {
  const image = options.image || null;
  const elements = options.elements || {};
  if (!image || !elements.image || !elements.caption || !elements.title || !elements.thumbs) {
    return;
  }

  const imageCount = Number(options.imageCount) || 0;
  const hasMultipleImages = imageCount > 1;
  const translate = options.translate;
  const applyTranslatedTitle = options.applyTranslatedTitle;
  const previousButton = elements.previousButton || null;
  const nextButton = elements.nextButton || null;
  const overlayPreviousButton = elements.overlayPreviousButton || null;
  const overlayNextButton = elements.overlayNextButton || null;
  const overlayCloseButton = elements.overlayCloseButton || null;

  if (overlayCloseButton) {
    overlayCloseButton.textContent = "×";
  }
  if (overlayPreviousButton) {
    overlayPreviousButton.textContent = "‹";
  }
  if (overlayNextButton) {
    overlayNextButton.textContent = "›";
  }
  applyTranslatedTitle(overlayCloseButton, "closeButton");
  applyTranslatedTitle(overlayPreviousButton, "threadExplorerGalleryPrevButton");
  applyTranslatedTitle(overlayNextButton, "threadExplorerGalleryNextButton");
  applyTranslatedTitle(previousButton, "threadExplorerGalleryPrevButton");
  applyTranslatedTitle(nextButton, "threadExplorerGalleryNextButton");

  elements.image.hidden = false;
  elements.image.dataset.fallbackAttempted = "false";
  elements.image.src = image.src;
  elements.image.alt = image.alt;
  elements.image.title = translate("threadExplorerGalleryFullscreenHint");
  elements.caption.textContent = image.alt;
  elements.caption.hidden = !image.alt;
  elements.title.textContent = translate("threadExplorerGalleryTitle");
  elements.thumbs.hidden = !hasMultipleImages;

  [previousButton, nextButton, overlayPreviousButton, overlayNextButton].forEach((button) => {
    if (button) {
      button.hidden = !hasMultipleImages;
    }
  });
  const thumbs = elements.thumbs.querySelectorAll(".thread-explorer-gallery-thumb");
  thumbs.forEach((thumb, index) => {
    const isSelected = index === Number(options.selectedIndex);
    thumb.classList.toggle("is-selected", isSelected);
    thumb.setAttribute("aria-pressed", String(isSelected));
  });
}

/**
 * Normalizes media returned by the Thread Explorer hydration worker.
 * @param {object|null|undefined} media - Map-like source-to-data-URI response.
 * @returns {Array<{source: string, dataUri: string}>} Valid media entries.
 */
export function normalizeThreadExplorerHydratedMedia(media = null) {
  if (!media || typeof media !== "object") {
    return [];
  }
  return Object.entries(media)
    .map(([source, dataUri]) => {
      return {
        source: String(source || "").trim(),
        dataUri: String(dataUri || "").trim(),
      };
    })
    .filter((entry) => entry.source && entry.dataUri);
}

/**
 * Returns a favicon fallback URL for an external card.
 * @param {string} uri - External link URI.
 * @returns {string} Favicon URL, or an empty string for invalid input.
 */
export function getThreadExplorerFaviconUrl(uri) {
  try {
    const parsed = new URL(String(uri || ""));
    return `${parsed.origin}/favicon.ico`;
  } catch (error) {
    return "";
  }
}

/**
 * Creates the controller that renders reply and like controls on live post cards.
 * @param {object} dependencies - App-specific actions and models used by the controller.
 * @param {Function} dependencies.buildInteractionModel - Builds the live interaction state for one post.
 * @param {Function} dependencies.createButton - Creates one localized interaction button.
 * @param {Function} dependencies.isLikePending - Returns whether a post currently has a pending like request.
 * @param {Function} dependencies.isLiked - Returns whether the viewer already likes one post.
 * @param {Function} dependencies.openComposerReply - Opens the composer for a reply to one post.
 * @param {Function} dependencies.toggleLike - Toggles the like state for one post.
 * @returns {{renderInteractionActions: Function}} Controller API for live post cards.
 */
export function createThreadExplorerCardInteractionController(dependencies = {}) {
  const buildInteractionModel = dependencies.buildInteractionModel;
  const createButton = dependencies.createButton;
  const isLikePending = dependencies.isLikePending;
  const isLiked = dependencies.isLiked;
  const openComposerReply = dependencies.openComposerReply;
  const toggleLike = dependencies.toggleLike;

  /**
   * Renders reply and like controls into the configured card action row.
   * @param {object} post - Normalized live post from search or Thread Explorer.
   * @param {HTMLElement|null} actions - Existing footer action-row container from the card template.
   * @param {HTMLElement|null} headButtons - Existing header button row from the card template.
   * @param {HTMLElement|null} anchor - View-link insertion anchor for search result controls.
   * @param {object} options - Rendering options for the current card type.
   * @param {boolean} options.renderInHeader - Whether controls belong in the search-result header.
   * @returns {void} No return value.
   */
  function renderInteractionActions(post, actions, headButtons, anchor, options = {}) {
    if (!actions) {
      return;
    }
    if (typeof buildInteractionModel !== "function" || typeof createButton !== "function") {
      return;
    }
    if (typeof isLikePending !== "function" || typeof openComposerReply !== "function" || typeof toggleLike !== "function") {
      return;
    }

    let renderInHeader = false;
    if (options.renderInHeader === true) {
      renderInHeader = true;
    }
    if (renderInHeader && (!headButtons || !anchor)) {
      return;
    }

    actions.querySelectorAll(".thread-explorer-interaction-actions").forEach((node) => {
      node.remove();
    });
    if (headButtons) {
      headButtons.querySelectorAll(".thread-explorer-interaction-actions").forEach((node) => {
        node.remove();
      });
    }

    const interactionModel = buildInteractionModel(post, {
      isLiked(postValue) {
        if (typeof isLiked !== "function") {
          return false;
        }
        return isLiked(postValue);
      },
      isLikePending(uri) {
        return isLikePending(uri);
      },
    });
    const interactionWrap = actions.ownerDocument.createElement("div");
    interactionWrap.className = "thread-explorer-interaction-actions";

    if (interactionModel.canReply) {
      const replyButton = createButton("threadExplorerReplyAction", {
        onClick() {
          openComposerReply(post);
        },
      });
      interactionWrap.appendChild(replyButton);
    }

    if (interactionModel.canLike) {
      const likeButton = createButton(interactionModel.likeTranslationKey, {
        active: interactionModel.isLiked,
        disabled: interactionModel.isLikePending,
        onClick() {
          void toggleLike(post);
        },
      });
      interactionWrap.appendChild(likeButton);
    }

    const editButton = actions.querySelector(".thread-explorer-edit-button");
    if (interactionWrap.childElementCount > 0) {
      if (renderInHeader) {
        headButtons.insertBefore(interactionWrap, anchor);
      } else {
        actions.insertBefore(interactionWrap, editButton);
      }
    }

    let shouldShowActions = false;
    if (editButton && editButton.hidden !== true) {
      shouldShowActions = true;
    }
    if (interactionWrap.childElementCount > 0 && !renderInHeader) {
      shouldShowActions = true;
    }
    actions.hidden = !shouldShowActions;
  }

  return {
    renderInteractionActions,
  };
}

/**
 * Creates the controller that renders reusable Thread Explorer card presentation.
 * @param {object} dependencies - App-specific formatting, models, and event handlers.
 * @param {Function} dependencies.translate - Resolves one translated count label.
 * @param {Function} dependencies.createMetricEntries - Creates localized metric entries for one post.
 * @param {Function} dependencies.buildViewLinkModel - Builds the external post link model.
 * @param {Function} dependencies.buildEditButtonModel - Builds the edit-marker visibility model.
 * @param {Function} dependencies.applyTranslatedTitle - Applies localized button or link titles.
 * @param {Function} dependencies.handleRepliesCountClick - Opens the replies dialog for one metric button.
 * @param {Function} dependencies.handleCountClick - Opens the reaction dialog for one metric button.
 * @param {Function} dependencies.handleEditButtonClick - Opens the edit details dialog.
 * @returns {{renderCounts: Function, renderMetricEntries: Function, renderViewLink: Function, renderEditButton: Function}} Controller API for card presentation.
 */
export function createThreadExplorerCardPresentationController(dependencies = {}) {
  const translate = dependencies.translate;
  const createMetricEntries = dependencies.createMetricEntries;
  const buildViewLinkModel = dependencies.buildViewLinkModel;
  const buildEditButtonModel = dependencies.buildEditButtonModel;
  const applyTranslatedTitle = dependencies.applyTranslatedTitle;
  const handleRepliesCountClick = dependencies.handleRepliesCountClick;
  const handleCountClick = dependencies.handleCountClick;
  const handleEditButtonClick = dependencies.handleEditButtonClick;

  /**
   * Creates one count button or passive count label.
   * @param {string} type - Count type such as Likes, Replies, Reposts, or Quotes.
   * @param {number} value - Numeric count value.
   * @param {boolean} isInteractive - Whether the count opens a follow-up dialog.
   * @returns {HTMLElement} Rendered metric element.
   */
  function createCountElement(type, value, isInteractive) {
    let element = null;
    if (isInteractive) {
      element = document.createElement("button");
      element.type = "button";
      element.className = "thread-explorer-count-button";
      element.dataset.reactionType = type;
    } else {
      element = document.createElement("span");
      element.className = "thread-explorer-count-label";
    }

    if (typeof translate === "function") {
      element.textContent = translate(`threadExplorerCount${type}`, { count: value });
    }
    return element;
  }

  /**
   * Creates one rendered metric element from a normalized metric entry.
   * @param {{type: string, count: number, label: string, isInteractive: boolean}} entry - Normalized metric entry.
   * @returns {HTMLElement} Rendered metric element.
   */
  function createMetricElement(entry = {}) {
    const type = String(entry.type || "").trim();
    const count = Number(entry.count) || 0;
    const element = createCountElement(type, count, entry.isInteractive === true);
    const label = String(entry.label || "").trim();
    if (label) {
      element.textContent = label;
    }
    return element;
  }

  /**
   * Renders prepared metrics and attaches their dialog actions.
   * @param {object} post - Normalized live post.
   * @param {HTMLElement|null} counts - Count container from the card template.
   * @param {Array<{type: string, count: number, label: string, isInteractive: boolean}>} metricEntries - Prepared metric entries.
   * @returns {void} No return value.
   */
  function renderMetricEntries(post, counts, metricEntries = []) {
    if (!counts) {
      return;
    }
    counts.replaceChildren();
    const metricElements = metricEntries.map((entry) => {
      return createMetricElement(entry);
    });

    metricElements.forEach((element) => {
      if (!element.classList.contains("thread-explorer-count-button")) {
        return;
      }
      element.dataset.uri = post.uri;
      element.dataset.cid = post.cid || "";
      if (element.dataset.reactionType === "Replies") {
        element.addEventListener("click", handleRepliesCountClick);
      } else {
        element.addEventListener("click", handleCountClick);
      }
    });
    counts.append(...metricElements);
  }

  /**
   * Renders the standard count sequence for one Thread Explorer card.
   * @param {object} post - Normalized live post.
   * @param {HTMLElement|null} counts - Count container from the card template.
   * @returns {void} No return value.
   */
  function renderCounts(post, counts) {
    if (typeof createMetricEntries !== "function") {
      return;
    }
    const metricEntries = createMetricEntries(post, ["Likes", "Replies", "Reposts", "Quotes"]);
    renderMetricEntries(post, counts, metricEntries);
  }

  /**
   * Applies the external view URL to a post card link.
   * @param {object} post - Normalized live post.
   * @param {HTMLAnchorElement|null} link - Link element from the card template.
   * @returns {void} No return value.
   */
  function renderViewLink(post, link) {
    if (!link || typeof buildViewLinkModel !== "function") {
      return;
    }
    const viewLink = buildViewLinkModel(post);
    if (!viewLink) {
      link.hidden = true;
      link.removeAttribute("href");
      return;
    }
    link.hidden = false;
    link.href = viewLink.url;
    link.textContent = viewLink.text;
    applyTranslatedTitle(link, "threadExplorerViewInBskyButton");
  }

  /**
   * Renders the edit marker for a post with supported edit metadata.
   * @param {object} post - Normalized live post.
   * @param {HTMLButtonElement|null} button - Edit marker button from the card template.
   * @returns {boolean} True when the marker is visible.
   */
  function renderEditButton(post, button) {
    if (!button || typeof buildEditButtonModel !== "function") {
      return false;
    }
    const editModel = buildEditButtonModel(post);
    if (!editModel.isVisible) {
      button.hidden = true;
      button.removeAttribute("data-uri");
      return false;
    }
    button.hidden = false;
    button.dataset.uri = editModel.uri;
    applyTranslatedTitle(button, "threadExplorerEditDetailsButton");
    button.addEventListener("click", handleEditButtonClick);
    return true;
  }

  return {
    renderCounts,
    renderMetricEntries,
    renderViewLink,
    renderEditButton,
  };
}

/**
 * Renders the Thread Explorer feed list and its localized status message.
 * @param {object} options - Rendering dependencies and current feed state.
 * @param {HTMLElement} options.list - Feed list container.
 * @param {HTMLElement} options.status - Feed status element.
 * @param {Array<object>} options.items - Feed items to render.
 * @param {boolean} options.loading - Whether a feed request is active.
 * @param {string} options.error - Current feed error message.
 * @param {boolean} options.foreignAccountMode - Whether a foreign account is shown.
 * @param {boolean} options.searchMode - Whether a saved search is shown.
 * @param {Function} options.translate - Translation function.
 * @param {Function} options.formatCount - Count formatting function.
 * @param {Function} options.renderItem - Creates one feed item fragment.
 * @param {Function} [options.renderActorFocus] - Renders the Actor-Fokus panel first.
 * @returns {void} No return value.
 */
export function renderThreadExplorerFeedPanel(options = {}) {
  const list = options.list;
  const status = options.status;
  const items = Array.isArray(options.items) ? options.items : [];
  const translate = options.translate;
  const formatCount = options.formatCount;
  if (!list || !status || typeof translate !== "function" || typeof formatCount !== "function") {
    return;
  }

  if (typeof options.renderActorFocus === "function") {
    options.renderActorFocus();
  }
  list.replaceChildren();
  const count = formatCount(items.length);
  if (options.error) {
    status.textContent = options.error;
  } else if (options.loading) {
    if (options.foreignAccountMode) {
      status.textContent = translate("threadExplorerActorFocusLoading");
    } else if (items.length > 0) {
      status.textContent = translate("threadExplorerFeedLoadingMore", { count });
    } else {
      status.textContent = translate("threadExplorerFeedLoading");
    }
  } else if (!items.length) {
    if (options.foreignAccountMode) {
      status.textContent = translate("threadExplorerActorFocusEmpty");
    } else {
      status.textContent = translate("threadExplorerFeedEmpty");
    }
  } else if (options.foreignAccountMode) {
    status.textContent = translate("threadExplorerActorFocusLoaded", { count });
  } else if (options.searchMode) {
    status.textContent = translate("threadExplorerSearchLoaded", { count });
  } else {
    status.textContent = translate("threadExplorerFeedLoaded", { count });
  }

  if (typeof options.renderItem !== "function") {
    return;
  }
  items.forEach((item) => {
    const fragment = options.renderItem(item);
    if (fragment) {
      list.appendChild(fragment);
    }
  });
}

/**
 * Renders the Actor-Fokus panel and its result list.
 * @param {object} options - Panel elements, actor state, and rendering helpers.
 * @param {HTMLElement} options.panel - Actor-Fokus panel container.
 * @param {HTMLElement} options.list - Actor-Fokus result list.
 * @param {HTMLElement} options.avatar - Actor avatar element.
 * @param {HTMLElement} options.title - Actor title element.
 * @param {HTMLElement} options.handle - Actor handle element.
 * @param {HTMLSelectElement|null} options.modeSelect - Actor mode selector.
 * @param {HTMLElement} options.status - Actor status element.
 * @param {object|null} options.actor - Focused actor.
 * @param {Array<object>} options.items - Actor feed items.
 * @param {string} options.mode - Selected actor feed mode.
 * @param {boolean} options.loading - Whether the actor feed is loading.
 * @param {string} options.error - Current actor feed error message.
 * @param {Function} options.translate - Translation function.
 * @param {Function} options.formatCount - Count formatting function.
 * @param {Function} options.getLabel - Creates the visible actor label.
 * @param {Function} options.setAvatar - Applies the avatar source and label.
 * @param {Function} options.renderItem - Creates one feed item fragment.
 * @returns {void} No return value.
 */
export function renderThreadExplorerActorFocusPanel(options = {}) {
  const panel = options.panel;
  const list = options.list;
  const actor = options.actor;
  if (!panel || !list || typeof options.translate !== "function") {
    return;
  }
  list.replaceChildren();
  if (!actor) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  let label = "";
  if (typeof options.getLabel === "function") {
    label = options.getLabel(actor);
  }
  if (typeof options.setAvatar === "function") {
    options.setAvatar(actor, label);
  }
  if (options.title) {
    options.title.textContent = options.translate("threadExplorerActorFocusTitle", { account: label });
  }
  if (options.handle) {
    if (actor.handle) {
      options.handle.textContent = `@${actor.handle}`;
    } else {
      options.handle.textContent = actor.did || "";
    }
  }
  if (options.modeSelect) {
    options.modeSelect.value = options.mode || "";
    options.modeSelect.disabled = options.loading === true;
  }

  const items = Array.isArray(options.items) ? options.items : [];
  if (options.status) {
    if (options.error) {
      options.status.textContent = options.error;
    } else if (options.loading) {
      options.status.textContent = options.translate("threadExplorerActorFocusLoading");
    } else if (!items.length) {
      options.status.textContent = options.translate("threadExplorerActorFocusEmpty");
    } else if (typeof options.formatCount === "function") {
      options.status.textContent = options.translate("threadExplorerActorFocusLoaded", {
        count: options.formatCount(items.length),
      });
    }
  }
  if (typeof options.renderItem !== "function") {
    return;
  }
  items.forEach((item) => {
    const fragment = options.renderItem(item);
    if (fragment) {
      list.appendChild(fragment);
    }
  });
}

/**
 * Renders SVG connections for the visible tree layout.
 * @param {object} options - Tree state, SVG factory, and geometry callbacks.
 * @param {HTMLElement} options.stage - Thread stage that receives the edge layer.
 * @param {object|null} options.tree - Loaded thread tree.
 * @param {boolean} options.clusterMode - Whether cluster edges are rendered elsewhere.
 * @param {HTMLElement|null} options.rootItem - Rendered tree root item.
 * @param {Function} options.clearEdges - Removes the previous edge layer.
 * @param {Function} options.getCard - Finds a card in a rendered item.
 * @param {Function} options.getChildren - Finds visible child items.
 * @param {Function} options.getStageRect - Converts a card rect into stage coordinates.
 * @param {Function} options.createEdgePath - Creates an SVG path string.
 * @param {Function} options.createSvgNode - Creates an SVG DOM node.
 * @returns {void} No return value.
 */
export function renderThreadExplorerTreeEdges(options = {}) {
  const stage = options.stage;
  if (typeof options.clearEdges === "function") {
    options.clearEdges();
  }
  if (!stage || !options.tree || options.clusterMode || !options.rootItem) {
    if (stage) {
      stage.classList.remove("has-svg-edges");
    }
    return;
  }
  const stageRect = stage.getBoundingClientRect();
  const stageWidth = Math.max(stage.scrollWidth, stage.offsetWidth);
  const stageHeight = Math.max(stage.scrollHeight, stage.offsetHeight);
  const svg = options.createSvgNode("svg", {
    class: "thread-explorer-edge-layer",
    width: stageWidth,
    height: stageHeight,
    viewBox: `0 0 ${stageWidth} ${stageHeight}`,
    "aria-hidden": "true",
    focusable: "false",
  });
  const visitItem = (item) => {
    if (item.classList.contains("is-collapsed")) {
      return;
    }
    const parentCard = options.getCard(item);
    if (!parentCard) {
      return;
    }
    const parentRect = options.getStageRect(parentCard, stageRect);
    options.getChildren(item).forEach((childItem) => {
      const childCard = options.getCard(childItem);
      if (!childCard) {
        return;
      }
      const childRect = options.getStageRect(childCard, stageRect);
      const tier = childItem.dataset.engagementTier || "quiet";
      svg.appendChild(options.createSvgNode("path", {
        class: `thread-explorer-edge thread-explorer-edge-${tier}`,
        d: options.createEdgePath(parentRect, childRect),
      }));
      visitItem(childItem);
    });
  };
  visitItem(options.rootItem);
  stage.prepend(svg);
  stage.classList.add("has-svg-edges");
}

/**
 * Creates one Thread Explorer feed item from a supplied template.
 * @param {object} item - Feed item containing a normalized post.
 * @param {object} options - Template, selection, media, and interaction dependencies.
 * @param {HTMLTemplateElement} options.template - Feed item template to clone.
 * @param {string} options.selectedUri - URI of the currently selected post.
 * @param {Function} options.cloneTemplate - Clones template content.
 * @param {Function} options.markAvatar - Marks an avatar for deferred loading.
 * @param {Function} options.getAvatarUri - Resolves the actor avatar URL.
 * @param {Function} options.getActorLabel - Resolves the visible actor label.
 * @param {Function} options.setAvatar - Applies avatar source and alt text.
 * @param {Function} options.formatDate - Formats the post date.
 * @param {Function} options.getPreviewText - Creates the post preview.
 * @param {Function} options.onClick - Handles selection of the feed item.
 * @returns {DocumentFragment|null} Rendered feed item or null for invalid input.
 */
export function createThreadExplorerFeedItemFragment(item = {}, options = {}) {
  const post = item.post;
  if (!post || !options.template || typeof options.cloneTemplate !== "function") {
    return null;
  }
  const fragment = options.cloneTemplate(options.template);
  const button = fragment.querySelector(".thread-explorer-feed-item");
  const avatar = fragment.querySelector(".thread-explorer-avatar");
  const author = fragment.querySelector(".thread-explorer-feed-author");
  const meta = fragment.querySelector(".thread-explorer-feed-meta");
  const text = fragment.querySelector(".thread-explorer-feed-text");
  if (!button || !author || !meta || !text) {
    return fragment;
  }

  button.classList.toggle("is-active", post.uri === options.selectedUri);
  let actorLabel = "";
  if (typeof options.getActorLabel === "function") {
    actorLabel = options.getActorLabel(post.author);
  }
  if (typeof options.markAvatar === "function") {
    options.markAvatar(avatar, post.author);
  }
  if (typeof options.setAvatar === "function") {
    let avatarUri = "";
    if (typeof options.getAvatarUri === "function") {
      avatarUri = options.getAvatarUri(post.author);
    }
    options.setAvatar(avatar, avatarUri, actorLabel);
  }
  author.textContent = actorLabel;
  if (typeof options.formatDate === "function") {
    meta.textContent = options.formatDate(post.createdAt || post.indexedAt);
  }
  if (typeof options.getPreviewText === "function") {
    text.textContent = options.getPreviewText(post);
  }
  button.dataset.uri = post.uri;
  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }
  return fragment;
}

/**
 * Returns the timestamp used to order one reply.
 * @param {object|null} node - Reply node with createdAt or indexedAt.
 * @returns {number} Epoch milliseconds or a large fallback value.
 */
export function getThreadExplorerReplySortTimestamp(node = null) {
  const createdAt = Date.parse(String(node?.post?.createdAt || "").trim());
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }
  const indexedAt = Date.parse(String(node?.post?.indexedAt || "").trim());
  if (Number.isFinite(indexedAt)) {
    return indexedAt;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Sorts replies chronologically without changing the source array.
 * @param {Array<object>} replies - Reply nodes for one parent.
 * @returns {Array<object>} Replies sorted oldest first.
 */
export function getChronologicalThreadExplorerReplies(replies) {
  if (!Array.isArray(replies)) {
    return [];
  }
  return replies
    .map((reply, index) => ({ reply, index }))
    .sort((left, right) => {
      const leftTime = getThreadExplorerReplySortTimestamp(left.reply);
      const rightTime = getThreadExplorerReplySortTimestamp(right.reply);
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.reply);
}

/**
 * Prepares the state needed to render one Thread Explorer node.
 * @param {object} node - Thread node with post and replies.
 * @param {object} options - Engagement, selection, and display-model dependencies.
 * @param {Function} options.getEngagementScore - Calculates post engagement.
 * @param {Function} options.getEngagementTier - Maps engagement to a visual tier.
 * @param {Function} options.getDisplayModel - Builds the card display model.
 * @returns {object|null} Prepared node metadata or null for invalid input.
 */
export function prepareThreadExplorerRenderedNode(node = {}, options = {}) {
  const post = node.post;
  if (!post || typeof options.getEngagementScore !== "function" || typeof options.getEngagementTier !== "function") {
    return null;
  }
  const replies = getChronologicalThreadExplorerReplies(node.replies);
  const engagementScore = options.getEngagementScore(post);
  const engagementTier = options.getEngagementTier(engagementScore);
  let postDisplay = null;
  if (typeof options.getDisplayModel === "function") {
    postDisplay = options.getDisplayModel(post);
  }
  return {
    post,
    replies,
    engagementScore,
    engagementTier,
    isDeletedThreadAnchor: post.isDeletedThreadAnchor === true,
    postDisplay,
  };
}

/**
 * Finds the standard DOM parts of one rendered Thread Explorer node.
 * @param {DocumentFragment|HTMLElement} fragment - Cloned node template.
 * @returns {object} Named node elements used by the card renderer.
 */
export function getThreadExplorerRenderedNodeParts(fragment = null) {
  if (!fragment || typeof fragment.querySelector !== "function") {
    return {};
  }
  return {
    item: fragment.querySelector(".thread-explorer-node-item"),
    toggle: fragment.querySelector(".thread-explorer-node-toggle"),
    card: fragment.querySelector(".thread-explorer-post-card"),
    actorTriggers: Array.from(fragment.querySelectorAll(".thread-explorer-actor-trigger")),
    avatar: fragment.querySelector(".thread-explorer-avatar"),
    author: fragment.querySelector(".thread-explorer-post-author"),
    handle: fragment.querySelector(".thread-explorer-post-handle"),
    meta: fragment.querySelector(".thread-explorer-post-meta"),
    viewLink: fragment.querySelector(".thread-explorer-view-link"),
    headButtons: fragment.querySelector(".thread-explorer-post-head-buttons"),
    editButton: fragment.querySelector(".thread-explorer-edit-button"),
    actions: fragment.querySelector(".thread-explorer-post-actions"),
    text: fragment.querySelector(".thread-explorer-post-text"),
    gallery: fragment.querySelector(".thread-explorer-post-gallery"),
    counts: fragment.querySelector(".thread-explorer-post-counts"),
    children: fragment.querySelector(".thread-explorer-children"),
  };
}

/**
 * Appends rendered child replies to a node's children container.
 * @param {HTMLElement|null} children - Container for child nodes.
 * @param {Array<object>} replies - Reply nodes to render.
 * @param {Function} createNode - Creates one rendered child node.
 * @param {boolean} renderReplies - Whether child replies should be retained.
 * @returns {void} No return value.
 */
export function appendThreadExplorerRenderedReplies(children, replies, createNode, renderReplies = true) {
  if (!children) {
    return;
  }
  if (!renderReplies) {
    children.remove();
    return;
  }
  if (typeof createNode !== "function") {
    return;
  }
  if (!Array.isArray(replies)) {
    return;
  }
  replies.forEach((reply) => {
    const node = createNode(reply);
    if (node) {
      children.appendChild(node);
    }
  });
}

/**
 * Renders thread status and dispatches to tree or cluster presentation.
 * @param {object} options - Thread state, DOM targets, and rendering callbacks.
 * @param {HTMLElement} options.stage - Thread stage container.
 * @param {HTMLElement} options.title - Thread title element.
 * @param {HTMLElement} options.status - Thread status element.
 * @param {object|null} options.tree - Loaded thread tree.
 * @param {boolean} options.loading - Whether a thread request is active.
 * @param {string} options.error - Current thread loading error.
 * @param {boolean} options.clusterMode - Whether reply-cluster mode is active.
 * @param {Function} options.translate - Translation function.
 * @param {Function} options.formatCount - Count formatting function.
 * @param {Function} options.countPosts - Counts posts in the thread.
 * @param {Function} options.createRootNode - Creates the rendered root node.
 * @param {Function} options.renderCluster - Renders the reply-cluster layout.
 * @param {Function} options.afterRender - Runs post-render hydration and layout work.
 * @returns {void} No return value.
 */
export function renderThreadExplorerTreePanel(options = {}) {
  const stage = options.stage;
  const title = options.title;
  const status = options.status;
  if (!stage || !title || !status || typeof options.translate !== "function") {
    return;
  }
  stage.replaceChildren();
  stage.classList.remove("has-svg-edges", "is-reply-cluster-mode");
  const setEmptyCountTitle = () => {
    title.textContent = options.translate("threadExplorerThreadLoadedTitle", {
      count: typeof options.formatCount === "function" ? options.formatCount(0) : "0",
    });
  };
  if (options.error) {
    setEmptyCountTitle();
    status.textContent = options.error;
    return;
  }
  if (options.loading) {
    setEmptyCountTitle();
    status.textContent = options.translate("threadExplorerThreadLoading");
    return;
  }
  if (!options.tree) {
    title.textContent = options.translate("threadExplorerThreadTitle");
    status.textContent = options.translate("threadExplorerThreadIdle");
    return;
  }
  let postCount = 0;
  if (typeof options.countPosts === "function") {
    postCount = options.countPosts(options.tree);
  }
  const formattedCount = typeof options.formatCount === "function" ? options.formatCount(postCount) : String(postCount);
  title.textContent = options.translate("threadExplorerThreadLoadedTitle", { count: formattedCount });
  status.textContent = options.translate("threadExplorerThreadLoaded", { count: formattedCount });
  if (options.clusterMode && typeof options.renderCluster === "function") {
    options.renderCluster();
  } else {
    const rootList = document.createElement("ul");
    const rootNode = typeof options.createRootNode === "function" ? options.createRootNode(options.tree) : null;
    if (rootNode) {
      rootList.appendChild(rootNode);
      stage.appendChild(rootList);
    }
  }
  if (typeof options.afterRender === "function") {
    options.afterRender();
  }
}

/**
 * Configures the collapse/expand button for one rendered tree node.
 * @param {HTMLButtonElement|null} button - Node toggle button.
 * @param {object} options - Reply and view state plus the click handler.
 * @param {string} options.uri - Post URI associated with the button.
 * @param {number} options.replyCount - Number of direct replies.
 * @param {boolean} options.showToggle - Whether the control should be available.
 * @param {boolean} options.clusterMode - Whether reply-cluster mode is active.
 * @param {boolean} options.isExpanded - Whether the cluster node is expanded.
 * @param {boolean} options.isCollapsed - Whether the tree node is collapsed.
 * @param {Function} options.onClick - Existing event handler for the toggle.
 * @returns {void} No return value.
 */
export function configureThreadExplorerNodeToggle(button, options = {}) {
  if (!button) {
    return;
  }
  if (options.showToggle === false || Number(options.replyCount) < 1) {
    button.classList.add("is-hidden");
    button.disabled = true;
    return;
  }
  button.classList.remove("is-hidden");
  button.disabled = false;
  if (options.clusterMode) {
    button.textContent = options.isExpanded ? "-" : "+";
  } else if (options.isCollapsed) {
    button.textContent = "+";
  } else {
    button.textContent = "-";
  }
  button.dataset.uri = String(options.uri || "");
  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }
}

/**
 * Applies selection, collapse, deletion, and engagement state to a node card.
 * @param {HTMLElement|null} item - Rendered list item for the node.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} options - Node metadata and current view state.
 * @param {string} options.uri - Post URI.
 * @param {number} options.engagementScore - Calculated engagement score.
 * @param {string} options.engagementTier - Visual engagement tier.
 * @param {string} options.selectedUri - Currently selected post URI.
 * @param {boolean} options.isCollapsed - Whether this node is collapsed.
 * @param {boolean} options.isDeletedThreadAnchor - Whether this is a deleted-post anchor.
 * @returns {void} No return value.
 */
export function applyThreadExplorerRenderedNodeState(item, card, options = {}) {
  if (!item || !card) {
    return;
  }
  item.dataset.uri = String(options.uri || "");
  item.dataset.engagementScore = String(Number(options.engagementScore) || 0);
  item.dataset.engagementTier = String(options.engagementTier || "quiet");
  item.classList.toggle("is-collapsed", options.isCollapsed === true);
  card.classList.toggle("is-selected", options.uri === options.selectedUri);
  card.classList.toggle("is-deleted-thread-anchor", options.isDeletedThreadAnchor === true);
  if (options.isDeletedThreadAnchor !== true) {
    card.classList.add(`is-engagement-${String(options.engagementTier || "quiet")}`);
  }
}

/**
 * Renders the visible fields and hidden controls for a deleted-thread anchor.
 * @param {object} parts - Named card elements returned by the node-parts helper.
 * @param {object} display - Prepared display model for the deleted anchor.
 * @returns {void} No return value.
 */
export function renderThreadExplorerDeletedAnchor(parts = {}, display = {}) {
  if (!parts.item || !parts.card) {
    return;
  }
  (Array.isArray(parts.actorTriggers) ? parts.actorTriggers : []).forEach((trigger) => {
    trigger.hidden = true;
    trigger.disabled = true;
  });
  if (parts.avatar) {
    parts.avatar.hidden = true;
  }
  if (parts.author) {
    parts.author.textContent = display.authorLabel || "";
  }
  if (parts.handle) {
    parts.handle.textContent = display.handleLabel || "";
  }
  if (parts.meta) {
    parts.meta.textContent = display.metaText || "";
  }
  if (parts.viewLink) {
    parts.viewLink.hidden = true;
  }
  if (parts.editButton) {
    parts.editButton.hidden = true;
  }
  if (parts.actions) {
    parts.actions.hidden = true;
  }
  if (parts.text) {
    parts.text.textContent = display.text || "";
  }
  if (parts.counts) {
    parts.counts.replaceChildren();
  }
}

/**
 * Renders the shared author, metadata, and text fields for a live post card.
 * @param {object} parts - Named card elements returned by the node-parts helper.
 * @param {object} post - Normalized post displayed by the card.
 * @param {object} display - Prepared post display model.
 * @param {object} options - Avatar and fallback-text dependencies.
 * @param {Function} options.getActorLabel - Resolves the author's visible label.
 * @param {Function} options.setAvatar - Applies avatar source and alt text.
 * @param {Function} options.translate - Translation function for fallback text.
 * @returns {void} No return value.
 */
export function renderThreadExplorerPostCardBasics(parts = {}, post = {}, display = {}, options = {}) {
  if (parts.avatar && typeof options.getActorLabel === "function" && typeof options.setAvatar === "function") {
    options.setAvatar(parts.avatar, "", options.getActorLabel(post.author));
  }
  if (parts.author) {
    parts.author.textContent = display.authorLabel || "";
  }
  if (parts.handle) {
    parts.handle.textContent = display.handleLabel || "";
  }
  if (parts.meta) {
    parts.meta.textContent = display.metaText || "";
  }
  if (parts.text) {
    let postText = display.text || "";
    if (!postText && typeof options.translate === "function") {
      postText = options.translate("threadExplorerNoText");
    }
    parts.text.textContent = postText;
  }
}

/**
 * Configures actor-focus controls on a rendered post card.
 * @param {Array<HTMLElement>} triggers - Actor-focus trigger elements.
 * @param {object} actor - Post author actor object.
 * @param {object} options - Translation and click-handler dependencies.
 * @param {Function} options.applyTranslatedTitle - Applies a translated title.
 * @param {string} options.titleKey - Translation key for the trigger title.
 * @param {Function} options.onOpen - Opens Actor-Fokus for the actor.
 * @returns {void} No return value.
 */
export function configureThreadExplorerActorFocusTriggers(triggers = [], actor = {}, options = {}) {
  if (!Array.isArray(triggers)) {
    return;
  }
  triggers.forEach((trigger) => {
    trigger.dataset.actorDid = actor.did || "";
    trigger.dataset.actorHandle = actor.handle || "";
    if (typeof options.applyTranslatedTitle === "function") {
      options.applyTranslatedTitle(trigger, options.titleKey || "threadExplorerActorFocusTriggerTitle");
    }
    if (typeof options.onOpen === "function") {
      trigger.addEventListener("click", () => {
        options.onOpen(actor || {});
      });
    }
  });
}

/**
 * Binds the established click, double-click, and pointer-up card interactions.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} handlers - Event handlers keyed by event type.
 * @param {Function} handlers.click - Single-click handler.
 * @param {Function} handlers.dblclick - Double-click handler.
 * @param {Function} handlers.pointerup - Pointer-up handler.
 * @returns {void} No return value.
 */
export function bindThreadExplorerCardInteractions(card, handlers = {}) {
  if (!card || typeof card.addEventListener !== "function") {
    return;
  }
  if (typeof handlers.click === "function") {
    card.addEventListener("click", handlers.click);
  }
  if (typeof handlers.dblclick === "function") {
    card.addEventListener("dblclick", handlers.dblclick);
  }
  if (typeof handlers.pointerup === "function") {
    card.addEventListener("pointerup", handlers.pointerup);
  }
}

/**
 * Creates one complete recursive Thread Explorer card node.
 * @param {object} node - Normalized thread node.
 * @param {object} options - Template, state, and application-specific callbacks.
 * @param {Function} options.cloneTemplate - Clones the node template.
 * @param {Function} options.prepareNode - Prepares engagement and display metadata.
 * @param {Function} options.getActorLabel - Resolves the visible author label.
 * @param {Function} options.setAvatar - Applies avatar source and alt text.
 * @param {Function} options.translate - Translation function.
 * @param {Function} options.renderViewLink - Renders the external post link.
 * @param {Function} options.renderEditButton - Renders the edit marker.
 * @param {Function} options.renderActions - Renders post interaction actions.
 * @param {Function} options.renderMetrics - Renders post metrics.
 * @param {Function} options.applyTranslatedTitle - Applies translated titles.
 * @param {Function} options.openActorFocus - Opens Actor-Fokus for an actor.
 * @param {Function} options.prepareHydration - Schedules card content hydration.
 * @param {object} options.cardHandlers - Card event handlers.
 * @param {object} options.toggleState - Current collapse/expand mode and handler.
 * @param {Function} options.createNode - Recursively creates child nodes.
 * @param {boolean} options.renderReplies - Whether to render children.
 * @param {boolean} options.showToggle - Whether to expose the toggle control.
 * @returns {{item:HTMLElement, card:HTMLElement, children:HTMLElement|null, post:object, replies:Array<object>}|null} Rendered node data.
 */
export function createThreadExplorerRenderedItem(node = {}, options = {}) {
  if (typeof options.cloneTemplate !== "function" || typeof options.prepareNode !== "function") {
    return null;
  }
  const fragment = options.cloneTemplate();
  const parts = getThreadExplorerRenderedNodeParts(fragment);
  const prepared = options.prepareNode(node);
  if (!prepared || !parts.item || !parts.card) {
    return null;
  }
  const post = prepared.post;
  const replies = Array.isArray(prepared.replies) ? prepared.replies : [];
  applyThreadExplorerRenderedNodeState(parts.item, parts.card, {
    uri: post.uri,
    engagementScore: prepared.engagementScore,
    engagementTier: prepared.engagementTier,
    selectedUri: options.selectedUri,
    isCollapsed: options.isCollapsed === true,
    isDeletedThreadAnchor: prepared.isDeletedThreadAnchor === true,
  });

  if (prepared.isDeletedThreadAnchor) {
    renderThreadExplorerDeletedAnchor(parts, prepared.postDisplay || {});
  } else {
    renderThreadExplorerPostCardBasics(parts, post, prepared.postDisplay || {}, {
      getActorLabel: options.getActorLabel,
      setAvatar: options.setAvatar,
      translate: options.translate,
    });
    if (typeof options.renderViewLink === "function") {
      options.renderViewLink(post, parts.viewLink);
    }
    if (typeof options.renderEditButton === "function") {
      options.renderEditButton(post, parts.editButton);
    }
    if (typeof options.renderActions === "function") {
      options.renderActions(post, parts.actions, parts.headButtons, parts.viewLink);
    }
    if (typeof options.renderMetrics === "function") {
      options.renderMetrics(post, parts.counts, prepared.postDisplay?.metricEntries || []);
    }
    configureThreadExplorerActorFocusTriggers(parts.actorTriggers, post.author || {}, {
      applyTranslatedTitle: options.applyTranslatedTitle,
      onOpen: options.openActorFocus,
    });
    if (typeof options.prepareHydration === "function") {
      options.prepareHydration(parts.card, post);
    }
  }

  bindThreadExplorerCardInteractions(parts.card, options.cardHandlers || {});
  const toggleState = options.toggleState || {};
  configureThreadExplorerNodeToggle(parts.toggle, {
    uri: post.uri,
    replyCount: replies.length,
    showToggle: options.showToggle !== false,
    clusterMode: toggleState.clusterMode === true,
    isExpanded: toggleState.isExpanded === true,
    isCollapsed: toggleState.isCollapsed === true,
    onClick: toggleState.onClick,
  });
  appendThreadExplorerRenderedReplies(
    parts.children,
    replies,
    options.createNode,
    options.renderReplies !== false,
  );
  return {
    item: parts.item,
    card: parts.card,
    children: parts.children,
    post,
    replies,
  };
}

/**
 * Replaces a post gallery with rendered figures and synchronizes empty state.
 * @param {HTMLElement|null} gallery - Gallery container.
 * @param {Array<object>} images - Normalized post images.
 * @param {Function} createFigure - Creates one gallery figure.
 * @returns {void} No return value.
 */
export function renderThreadExplorerPostGallery(gallery, images = [], createFigure) {
  if (!gallery) {
    return;
  }
  const safeImages = Array.isArray(images) ? images : [];
  gallery.replaceChildren();
  gallery.dataset.imageCount = String(safeImages.length);
  if (typeof createFigure === "function") {
    safeImages.forEach((image, imageIndex) => {
      const figure = createFigure(image, imageIndex, safeImages, gallery);
      if (figure) {
        gallery.appendChild(figure);
      }
    });
  }
  gallery.hidden = safeImages.length === 0;
}

/**
 * Applies intrinsic-shape classes to a rendered post image and its gallery.
 * @param {HTMLImageElement|null} image - Loaded image element.
 * @param {HTMLElement|null} figure - Figure containing the image.
 * @param {HTMLElement|null} gallery - Gallery containing the figure.
 * @returns {void} No return value.
 */
export function applyThreadExplorerPostImagePreviewShape(image = null, figure = null, gallery = null) {
  if (!image || !figure || !gallery) {
    return;
  }
  figure.classList.remove("is-portrait", "is-landscape", "is-square");
  gallery.classList.remove(
    "has-single-thread-image",
    "has-single-thread-image-portrait",
    "has-single-thread-image-landscape",
    "has-single-thread-image-square",
    "has-multiple-thread-images",
  );
  const imageCount = Math.max(0, Number(gallery.dataset.imageCount) || 0);
  if (imageCount === 1) {
    gallery.classList.add("has-single-thread-image");
  } else if (imageCount > 1) {
    gallery.classList.add("has-multiple-thread-images");
  }
  const naturalWidth = Math.max(0, Number(image.naturalWidth) || 0);
  const naturalHeight = Math.max(0, Number(image.naturalHeight) || 0);
  if (!naturalWidth || !naturalHeight) {
    return;
  }
  if (naturalHeight > naturalWidth * 1.08) {
    figure.classList.add("is-portrait");
    if (imageCount === 1) {
      gallery.classList.add("has-single-thread-image-portrait");
    }
    return;
  }
  if (naturalWidth > naturalHeight * 1.08) {
    figure.classList.add("is-landscape");
    if (imageCount === 1) {
      gallery.classList.add("has-single-thread-image-landscape");
    }
    return;
  }
  figure.classList.add("is-square");
  if (imageCount === 1) {
    gallery.classList.add("has-single-thread-image-square");
  }
}

/**
 * Copies post-gallery shape classes onto the card and its Thread Explorer node.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {HTMLElement|null} gallery - Gallery whose classes are copied.
 * @returns {void} No return value.
 */
export function syncThreadExplorerPostCardImageShape(card = null, gallery = null) {
  if (!card || !gallery) {
    return;
  }
  const shapeClasses = [
    "has-single-thread-image",
    "has-single-thread-image-portrait",
    "has-single-thread-image-landscape",
    "has-single-thread-image-square",
    "has-multiple-thread-images",
  ];
  card.classList.remove(...shapeClasses);
  shapeClasses.forEach((className) => {
    if (gallery.classList.contains(className)) {
      card.classList.add(className);
    }
  });
  const node = card.closest(".thread-explorer-node");
  if (!node) {
    return;
  }
  node.classList.remove(...shapeClasses);
  shapeClasses.forEach((className) => {
    if (gallery.classList.contains(className)) {
      node.classList.add(className);
    }
  });
}

/**
 * Creates one post-gallery figure from a cloned template and injected media actions.
 * @param {object} image - Normalized image entry with alt text.
 * @param {number} imageIndex - Index of this image in the full gallery.
 * @param {Array<object>} images - Full image list passed to the gallery opener.
 * @param {HTMLElement|null} gallery - Owning gallery container.
 * @param {object} options - Template, source, event, and interaction dependencies.
 * @param {Function} options.cloneTemplate - Clones the post-image template fragment.
 * @param {Function} options.getImageSources - Resolves full and thumbnail sources.
 * @param {Function} options.setImageSource - Applies a safe image source.
 * @param {Function} options.onLoad - Handles image load state.
 * @param {Function} options.onError - Attaches cache/error handlers.
 * @param {Function} options.openGallery - Opens the full gallery at an index.
 * @returns {HTMLElement|null} Rendered figure, or null if its template is incomplete.
 */
export function createThreadExplorerPostImageFigure(image = {}, imageIndex = 0, images = [], gallery = null, options = {}) {
  if (typeof options.cloneTemplate !== "function") {
    return null;
  }
  const fragment = options.cloneTemplate();
  if (!fragment || typeof fragment.querySelector !== "function") {
    return null;
  }
  const figure = fragment.querySelector(".thread-explorer-image");
  const button = fragment.querySelector(".thread-explorer-image-button");
  const imageElement = fragment.querySelector("img");
  const caption = fragment.querySelector("figcaption");
  if (!figure || !button || !imageElement || !caption) {
    return null;
  }
  let imageSources = {};
  if (typeof options.getImageSources === "function") {
    imageSources = options.getImageSources(image);
  }
  if (typeof options.setImageSource === "function") {
    options.setImageSource(imageElement, imageSources.source, imageSources.thumb);
  }
  imageElement.alt = image.alt || "";
  if (typeof options.onLoad === "function") {
    imageElement.addEventListener("load", () => options.onLoad(imageElement, figure, gallery), { once: true });
  }
  if (typeof options.onError === "function") {
    options.onError(imageElement);
  }
  button.addEventListener("click", () => {
    if (typeof options.openGallery === "function") {
      options.openGallery(images, imageIndex);
    }
  });
  caption.textContent = image.alt || "";
  caption.hidden = !image.alt;
  if (imageElement.complete && typeof options.onLoad === "function") {
    options.onLoad(imageElement, figure, gallery);
  }
  return figure;
}

/**
 * Renders quote preview images using a supplied image-element renderer.
 * @param {HTMLElement|null} gallery - Quote gallery container.
 * @param {object} quoteDisplay - Prepared quote display model.
 * @param {Function} createImage - Creates one quote preview image.
 * @returns {void} No return value.
 */
export function renderThreadExplorerQuoteGallery(gallery, quoteDisplay = {}, createImage) {
  if (!gallery) {
    return;
  }
  const images = Array.isArray(quoteDisplay.images) ? quoteDisplay.images : [];
  const previews = Array.isArray(quoteDisplay.imagePreviewEntries) ? quoteDisplay.imagePreviewEntries : [];
  gallery.replaceChildren();
  gallery.dataset.imageCount = String(images.length);
  if (typeof createImage === "function") {
    previews.forEach((entry) => {
      const image = createImage(entry, images, gallery);
      if (image) {
        gallery.appendChild(image);
      }
    });
  }
  gallery.hidden = images.length === 0;
}

/**
 * Renders a post or quoted-post external link card from a display model.
 * @param {object|null} display - Prepared external-card display model.
 * @param {HTMLElement} fragment - Card or containing fragment.
 * @param {object} options - Element selectors and media callbacks.
 * @param {string} options.cardSelector - Link-card selector.
 * @param {string} options.imageSelector - Thumbnail selector.
 * @param {string} options.titleSelector - Title selector.
 * @param {string} options.descriptionSelector - Description selector.
 * @param {string} options.urlSelector - Footer URL selector.
 * @param {Function} options.onImageError - Image error handler.
 * @param {Function} options.onImageLoad - Image load handler.
 * @param {Function} options.setImageSource - Safe image source setter.
 * @param {Function} options.getFaviconUrl - Resolves a fallback favicon URL.
 * @returns {void} No return value.
 */
export function renderThreadExplorerExternalLinkCard(display, fragment, options = {}) {
  if (!fragment || typeof fragment.querySelector !== "function") {
    return;
  }
  const card = fragment.querySelector(options.cardSelector);
  if (!card) {
    return;
  }
  if (!display) {
    card.hidden = true;
    card.classList.remove("is-publication");
    return;
  }
  const image = fragment.querySelector(options.imageSelector);
  const title = fragment.querySelector(options.titleSelector);
  const description = fragment.querySelector(options.descriptionSelector);
  const url = fragment.querySelector(options.urlSelector);
  card.hidden = false;
  card.classList.toggle("is-publication", display.isPublication === true);
  if (image) {
    if (typeof options.onImageError === "function") {
      image.removeEventListener("error", options.onImageError);
      image.addEventListener("error", options.onImageError);
    }
    if (typeof options.onImageLoad === "function") {
      image.addEventListener("load", options.onImageLoad, { once: true });
    }
    let imageSource = display.thumb || "";
    if (!imageSource && typeof options.getFaviconUrl === "function") {
      imageSource = options.getFaviconUrl(display.url) || "";
    }
    if (imageSource && typeof options.setImageSource === "function") {
      card.classList.remove("has-no-thumb");
      card.classList.toggle("has-favicon-thumb", !display.thumb);
      image.hidden = false;
      options.setImageSource(image, imageSource);
    } else {
      card.classList.add("has-no-thumb");
      card.classList.remove("has-favicon-thumb");
      image.hidden = true;
      delete image.dataset.snapshotSource;
      delete image.dataset.snapshotThumb;
      delete image.dataset.snapshotHydrated;
      image.removeAttribute("src");
    }
  }
  if (display.url) {
    card.href = display.url;
  }
  if (title) {
    title.textContent = display.title || display.url || "";
  }
  if (description) {
    description.textContent = display.description || "";
  }
  if (url) {
    url.textContent = display.footer || "";
  }
}

/**
 * Hides a failed external-card thumbnail and refreshes its rendered geometry.
 * @param {Event|null} event - Thumbnail error event.
 * @param {object} options - Card selector and post-error callback.
 * @param {string} options.cardSelector - Selector for the owning external card.
 * @param {Function} options.onError - Called after the image and card are updated.
 * @returns {void} No return value.
 */
export function hideThreadExplorerExternalCardImage(event = null, options = {}) {
  const image = event?.currentTarget || null;
  if (!image) {
    return;
  }
  const card = typeof image.closest === "function" ? image.closest(options.cardSelector) : null;
  image.hidden = true;
  if (typeof image.removeAttribute === "function") {
    image.removeAttribute("src");
  }
  if (card?.classList) {
    card.classList.add("has-no-thumb");
    card.classList.remove("has-favicon-thumb");
  }
  if (typeof options.onError === "function") {
    options.onError(image, card);
  }
}

/**
 * Renders one quote preview image and wires its load, error, and gallery actions.
 * @param {object} entry - Preview image source, alt text, and source-image index.
 * @param {Array<object>} images - Full quote image list.
 * @param {HTMLElement|null} gallery - Owning quote gallery.
 * @param {object} options - Element creation and event dependencies.
 * @param {Function} options.createImage - Creates an image element.
 * @param {Function} options.setImageSource - Applies a safe image source.
 * @param {Function} options.onLoad - Handles image-load geometry updates.
 * @param {Function} options.onError - Attaches error/cache handling.
 * @param {Function} options.openGallery - Opens the image gallery.
 * @returns {HTMLImageElement|null} Configured preview image.
 */
export function createThreadExplorerQuotePreviewImage(entry = {}, images = [], gallery = null, options = {}) {
  if (typeof options.createImage !== "function") {
    return null;
  }
  const image = options.createImage();
  if (!image) {
    return null;
  }
  if (typeof options.setImageSource === "function") {
    options.setImageSource(image, entry.source);
  }
  image.alt = entry.alt || "";
  image.loading = "lazy";
  if (typeof options.onLoad === "function") {
    image.addEventListener("load", () => options.onLoad(image, gallery), { once: true });
  }
  if (typeof options.onError === "function") {
    options.onError(image, gallery);
  }
  image.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof options.openGallery === "function") {
      options.openGallery(images, entry.imageIndex);
    }
  });
  if (image.complete && typeof options.onLoad === "function") {
    options.onLoad(image, gallery);
  }
  return image;
}

/**
 * Renders a complete quoted-post card from an app-built display model.
 * @param {object|null} post - Normalized parent post containing a quote card.
 * @param {DocumentFragment|HTMLElement} fragment - Parent post card fragment.
 * @param {object} options - Quote model, avatar, gallery, link, and interaction callbacks.
 * @param {Function} options.buildDisplay - Builds the localized quote display model.
 * @param {Function} options.markAvatar - Marks quote avatars for deferred loading.
 * @param {Function} options.getAvatarUri - Resolves the quoted author's avatar URI.
 * @param {Function} options.getActorLabel - Resolves the quoted author's label.
 * @param {Function} options.setAvatar - Applies avatar source and alt text.
 * @param {Function} options.translate - Translation function.
 * @param {Function} options.renderImages - Renders quote preview images.
 * @param {Function} options.renderExternalCard - Renders the quote external link card.
 * @param {Function} options.openPost - Opens the quoted post in the Thread Explorer.
 * @returns {void} No return value.
 */
export function renderThreadExplorerQuotePostCard(post, fragment, options = {}) {
  if (!post || !fragment || typeof fragment.querySelector !== "function" || typeof options.buildDisplay !== "function") {
    return;
  }
  const card = fragment.querySelector(".thread-explorer-quote-card");
  if (!card) {
    return;
  }
  const quote = post.quoteCard;
  const display = options.buildDisplay(quote);
  if (!display) {
    card.hidden = true;
    return;
  }
  const avatar = fragment.querySelector(".thread-explorer-quote-card-avatar");
  const author = fragment.querySelector(".thread-explorer-quote-card-author");
  const handle = fragment.querySelector(".thread-explorer-quote-card-handle");
  const text = fragment.querySelector(".thread-explorer-quote-card-text");
  const gallery = fragment.querySelector(".thread-explorer-quote-card-gallery");
  const meta = fragment.querySelector(".thread-explorer-quote-card-meta");
  card.hidden = false;
  card.href = display.url;
  if (typeof options.translate === "function") {
    const accessibleLabel = options.translate("searchResultOpenInThreadExplorerButton");
    card.title = accessibleLabel;
    card.setAttribute("aria-label", accessibleLabel);
  }
  if (typeof options.openPost === "function") {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      options.openPost(display.uri);
    });
  }
  if (typeof options.markAvatar === "function") {
    options.markAvatar(avatar, quote?.author);
  }
  if (typeof options.setAvatar === "function") {
    let avatarUri = "";
    if (typeof options.getAvatarUri === "function") {
      avatarUri = options.getAvatarUri(quote?.author);
    }
    let actorLabel = "";
    if (typeof options.getActorLabel === "function") {
      actorLabel = options.getActorLabel(quote?.author);
    }
    options.setAvatar(avatar, avatarUri, actorLabel);
  }
  if (author) {
    author.textContent = display.authorLabel || "";
  }
  if (handle) {
    handle.textContent = display.handleLabel || "";
  }
  if (text) {
    text.textContent = display.text || "";
  }
  if (typeof options.renderImages === "function") {
    options.renderImages(display, gallery);
  }
  if (typeof options.renderExternalCard === "function") {
    options.renderExternalCard(display, fragment);
  }
  if (meta) {
    meta.textContent = display.metaText || "";
  }
}

/**
 * Builds an expanded recursive render tree for reply-cluster mode.
 * @param {object|null} node - Normalized thread node.
 * @param {object} options - Root identity and render callbacks.
 * @param {string} options.rootUri - URI of the original thread root.
 * @param {Function} options.isExpanded - Checks whether the node is expanded.
 * @param {Function} options.createItem - Creates the positioned cluster item.
 * @returns {object|null} Render node with children and layout measurements.
 */
export function createThreadExplorerReplyClusterRenderNode(node, options = {}) {
  if (!node || !node.post?.uri || typeof options.createItem !== "function") {
    return null;
  }
  const uri = String(node.post.uri);
  let role = "reply";
  if (uri === options.rootUri) {
    role = "center";
  }
  const renderNode = {
    node,
    item: options.createItem(node, 0, 0, role),
    children: [],
    subtreeWidth: 0,
    subtreeHeight: 0,
    position: { x: 0, y: 0 },
  };
  if (typeof options.isExpanded !== "function" || !options.isExpanded(uri)) {
    return renderNode;
  }
  getChronologicalThreadExplorerReplies(node.replies).forEach((reply) => {
    const childRenderNode = createThreadExplorerReplyClusterRenderNode(reply, options);
    if (childRenderNode) {
      renderNode.children.push(childRenderNode);
    }
  });
  return renderNode;
}

/**
 * Appends every node in a reply-cluster render tree using breadth-first order.
 * @param {HTMLElement|null} cluster - Cluster canvas receiving the cards.
 * @param {object|null} rootRenderNode - Root of the recursive render tree.
 * @returns {number} Number of nodes appended.
 */
export function appendThreadExplorerReplyClusterNodes(cluster, rootRenderNode) {
  if (!cluster || !rootRenderNode) {
    return 0;
  }
  const pendingNodes = [rootRenderNode];
  let appendedCount = 0;
  while (pendingNodes.length > 0) {
    const currentNode = pendingNodes.shift();
    if (!currentNode) {
      continue;
    }
    cluster.appendChild(currentNode.item);
    appendedCount += 1;
    if (Array.isArray(currentNode.children)) {
      currentNode.children.forEach((childNode) => {
        pendingNodes.push(childNode);
      });
    }
  }
  return appendedCount;
}

/**
 * Creates the cluster stage, edge layer, and initial render-state object.
 * @param {object|null} rootRenderNode - Rendered cluster root node.
 * @param {Function} createSvgNode - SVG element factory.
 * @param {Function} appendNodes - Appends rendered nodes to the cluster stage.
 * @returns {{cluster:HTMLElement, edgeLayer:SVGElement, rootRenderNode:object, positionedItems:Array}|null} Initial cluster layout state.
 */
export function createThreadExplorerReplyClusterWorkspace(rootRenderNode, createSvgNode, appendNodes = appendThreadExplorerReplyClusterNodes) {
  if (!rootRenderNode || typeof createSvgNode !== "function" || typeof appendNodes !== "function") {
    return null;
  }
  const cluster = document.createElement("div");
  cluster.className = "thread-explorer-reply-cluster";
  cluster.style.width = "1120px";
  cluster.style.height = "860px";
  const edgeLayer = createSvgNode("svg", {
    class: "thread-explorer-reply-cluster-edge-layer",
    width: 1120,
    height: 860,
    viewBox: "0 0 1120 860",
    "aria-hidden": "true",
    focusable: "false",
  });
  cluster.appendChild(edgeLayer);
  appendNodes(cluster, rootRenderNode);
  return {
    cluster,
    edgeLayer,
    rootRenderNode,
    positionedItems: [],
  };
}

/**
 * Normalizes locally saved Thread Explorer favorites.
 * @param {Array<object>} favorites - Raw favorite entries from state or backup.
 * @returns {Array<object>} Clean favorite entries with stable fields.
 */
export function normalizeThreadExplorerFavorites(favorites) {
  if (!Array.isArray(favorites)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  favorites.forEach((favorite) => {
    const rootUri = String(favorite?.rootUri || favorite?.uri || "").trim();
    if (!rootUri || seen.has(rootUri)) {
      return;
    }
    seen.add(rootUri);
    normalized.push({
      rootUri,
      selectedUri: String(favorite?.selectedUri || rootUri).trim(),
      authorHandle: String(favorite?.authorHandle || "").trim(),
      authorName: String(favorite?.authorName || "").trim(),
      text: String(favorite?.text || "").trim().slice(0, 260),
      createdAt: String(favorite?.createdAt || "").trim(),
      savedAt: String(favorite?.savedAt || "").trim(),
      webApp: String(favorite?.webApp || "").trim(),
    });
  });
  return normalized.slice(0, 100);
}

/**
 * Builds a favorite model from a root/search post using explicit content and clock adapters.
 * @param {object|null} post - Normalized post to bookmark.
 * @param {object} options - Selected URI, trimFields flag, actor/preview/web-app builders and ISO clock.
 * @returns {object|null} Existing favorite schema, or null for an absent post URI.
 */
export function buildThreadExplorerFavoriteModel(post, options) {
  let rootUri = post?.uri || "";
  let authorHandle = String(post?.author?.handle || "");
  let createdAt = String(post?.createdAt || post?.indexedAt || "");
  if (options.trimFields === true) {
    rootUri = String(rootUri).trim();
    authorHandle = authorHandle.trim();
    createdAt = createdAt.trim();
  }
  if (!rootUri) {
    return null;
  }
  let selectedUri = String(options.selectedUri || post.uri);
  if (options.trimFields === true) {
    selectedUri = rootUri;
  }
  return { rootUri, selectedUri, authorHandle, authorName: options.getActorLabel(post.author),
    text: options.getPreviewText(post), createdAt, savedAt: options.now(), webApp: options.getWebApp(post) };
}

/**
 * Appends newly loaded feed items while preserving the first occurrence of each post URI.
 * @param {Array<object>} currentItems - Feed items already rendered.
 * @param {Array<object>} nextItems - Feed items returned by the newest page.
 * @param {object} options - Append options.
 * @param {boolean} options.groupByRoot - Whether duplicates should be detected by root URI.
 * @returns {Array<object>} Combined feed items without duplicate post URIs.
 */
export function appendThreadExplorerFeedItems(currentItems, nextItems, options = {}) {
  const seen = new Set();
  const combined = [];
  const items = [];
  if (Array.isArray(currentItems)) {
    items.push(...currentItems);
  }
  if (Array.isArray(nextItems)) {
    items.push(...nextItems);
  }
  items.forEach((item) => {
    let uri = String(item?.post?.uri || "").trim();
    if (options.groupByRoot === true) {
      uri = String(item?.post?.rootUri || item?.post?.uri || "").trim();
    }
    if (!uri || seen.has(uri)) {
      return;
    }
    seen.add(uri);
    combined.push(item);
  });
  return combined;
}

/**
 * Returns the timestamp used to sort Thread Explorer feed items.
 * @param {object} item - Thread Explorer feed item.
 * @returns {number} Epoch milliseconds or zero.
 */
export function getThreadExplorerFeedItemSortTimestamp(item = {}) {
  const createdAt = Date.parse(String(item?.post?.createdAt || "").trim());
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  const indexedAt = Date.parse(String(item?.post?.indexedAt || "").trim());
  if (Number.isFinite(indexedAt)) {
    return indexedAt;
  }

  return 0;
}

/**
 * Sorts Thread Explorer feed items by post date, newest first.
 * @param {Array<object>} items - Feed items to sort.
 * @returns {Array<object>} Sorted feed items without mutating the input.
 */
export function sortThreadExplorerFeedItemsByDate(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      return {
        item,
        index,
      };
    })
    .sort((left, right) => {
      const leftTime = getThreadExplorerFeedItemSortTimestamp(left.item);
      const rightTime = getThreadExplorerFeedItemSortTimestamp(right.item);
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return left.index - right.index;
    })
    .map((entry) => {
      return entry.item;
    });
}

/**
 * Finds a normalized Thread Explorer tree node by post URI.
 * @param {object|null} node - Current normalized tree node.
 * @param {string} uri - AT URI to locate.
 * @returns {object|null} Matching tree node, or null.
 */
export function findThreadExplorerTreeNode(node, uri) {
  const normalizedUri = String(uri || "").trim();
  if (!node || !normalizedUri) {
    return null;
  }

  if (node.post?.uri === normalizedUri) {
    return node;
  }

  if (!Array.isArray(node.replies)) {
    return null;
  }

  for (const reply of node.replies) {
    const found = findThreadExplorerTreeNode(reply, normalizedUri);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Finds the direct parent node for one normalized Thread Explorer post URI.
 * @param {object|null} node - Current normalized tree node.
 * @param {string} uri - AT URI to locate below the current node.
 * @returns {object|null} Direct parent node, or null when the URI is the root or missing.
 */
export function findThreadExplorerParentNode(node, uri) {
  const normalizedUri = String(uri || "").trim();
  if (!node || !normalizedUri || !Array.isArray(node.replies)) {
    return null;
  }

  for (const reply of node.replies) {
    if (reply?.post?.uri === normalizedUri) {
      return node;
    }
    const found = findThreadExplorerParentNode(reply, normalizedUri);
    if (found) {
      return found;
    }
  }

  return null;
}
