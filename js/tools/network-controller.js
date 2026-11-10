/** Normalizes the stored network shape without changing existing accepted values. @param {unknown} shape - Raw shape. @returns {string} Round or squircle. */
export function normalizeNetworkShape(shape) {
  if (shape === "squircle") { return "squircle"; }
  return "round";
}

/** Reads a shape preference with restricted-storage fallback. @param {Function} storage - Storage provider. @param {string} key - Storage key. @returns {string} Normalized shape. */
export function readNetworkShapePreference(storage, key) {
  try { return normalizeNetworkShape(String(storage().getItem(key) || "").trim()); } catch { return "round"; }
}

/** Writes a shape preference without failing on private/restricted storage. @param {unknown} shape - Shape. @param {Function} storage - Storage provider. @param {string} key - Storage key. @returns {void} */
export function writeNetworkShapePreference(shape, storage, key) {
  try { storage().setItem(key, normalizeNetworkShape(shape)); } catch { /* Storage is optional. */ }
}

/**
 * Owns network reset/context, workspace controls/navigation, status and render orchestration.
 * @param {object} elements - Search/account/sort inputs, status and hover card.
 * @param {object} options - Explicit state, navigation, renderers, profile, loading and translation adapters.
 * @returns {object} State/context/workspace operations and existing workspace event handlers.
 */
export function createNetworkWorkspaceController(elements, options) {
  /** Resets loaded graph state while retaining existing account/filter/shape preferences. @returns {void} */
  function reset() {
    const state = options.getState();
    options.setState({ accountDid: state.accountDid || state.authDid || "", viewer: null, nodes: new Map(),
      followerCursor: "", followCursor: "", hasMoreFollowers: false, hasMoreFollows: false, loading: false,
      selectedDid: "", statusLine: options.t("networkProgressIdle"), waveIndex: 0, details: new Map(), loadingDid: "",
      slots: new Map(), counts: { mutual: 0, followers: 0, following: 0, other: 0 },
      zoom: 1, panX: 0, panY: 0, drag: null, fitAll: true, hoveredDid: "", previewTab: "followers" });
    options.clearCommon();
  }
  /** Establishes the network account or resets unauthenticated graph state. @returns {void} */
  function ensure() {
    const state = options.getState();
    if (!state.authDid) { reset(); return; }
    if (!state.accountDid) { options.setState({ accountDid: state.authDid }); }
  }
  /** Checks own-account network context. @returns {boolean} Own context. */
  function own() { const state = options.getState(); return Boolean(state.authDid) && Boolean(state.accountDid) && state.accountDid === state.authDid; }
  /** Returns the viewed profile. @returns {object|null} Center profile. */
  function center() { return options.getState().viewer || null; }
  /** Resolves the center label through existing fallback priority. @returns {string} Center label. */
  function centerLabel() { const state = options.getState(); return state.viewer?.displayName || state.viewer?.handle || state.authAccount || options.t("networkViewerFallback"); }
  /** Localizes a relationship for own or foreign networks. @param {object} node - Profile. @returns {string} Relationship label. */
  function relationLabel(node) {
    const relation = options.relation(node); const account = centerLabel();
    if (relation === "mutual") { return options.t("networkRelationMutual"); }
    if (relation === "followers") { if (own()) { return options.t("networkRelationFollower"); } return options.t("networkRelationFollowerOther", { account }); }
    if (relation === "following") { if (own()) { return options.t("networkRelationFollowing"); } return options.t("networkRelationFollowingOther", { account }); }
    return options.t("networkRelationLoose");
  }
  /** Resolves typed actor, viewed handle or account fallback. @returns {string} Requested actor. */
  function requested() {
    const typed = String(elements.account?.value || "").trim(); const state = options.getState();
    if (typed) { return typed; } if (state.viewer?.handle) { return state.viewer.handle; }
    return state.accountDid || state.authDid || "";
  }
  /** Checks cursor availability for one result group. @param {string} group - Group key. @returns {boolean} More data availability. */
  function pending(group) {
    const state = options.getState();
    if (group === "followers") { return state.hasMoreFollowers; }
    if (group === "following") { return state.hasMoreFollows; }
    return state.hasMoreFollowers || state.hasMoreFollows;
  }
  /** Loads an additional group wave using the unchanged trigger contract. @param {string} group - Group key. @returns {Promise<void>} Completion. */
  async function loadMore(group = "all") {
    const state = options.getState(); if (!state.authAccount || state.loading) { return; }
    await options.load({ triggerGroup: group });
  }
  /** Updates normalized network status and its visible text. @param {unknown} message - Status message. @returns {void} */
  function status(message) {
    const text = String(message || "").trim() || options.t("networkProgressIdle"); options.setState({ statusLine: text });
    if (elements.status) { elements.status.textContent = text; }
  }
  /** Updates hover ownership and plain-text profile preview. @param {string} did - Profile DID. @returns {void} */
  function hover(did = "") {
    const actor = String(did || "").trim(); options.setState({ hoveredDid: actor });
    if (!elements.hover) { return; }
    const profile = options.known(actor);
    if (!profile) { elements.hover.hidden = true; elements.hover.textContent = ""; return; }
    elements.hover.hidden = false; elements.hover.textContent = options.label(profile);
  }
  /** Coordinates the existing rendering order and pending focus load. @returns {void} */
  function render() {
    ensure();
    for (const operation of options.renderers) { operation(); }
    const state = options.getState(); status(state.statusLine || options.t("networkProgressIdle")); options.restoreScroll();
    if (state.selectedDid && !state.details.has(state.selectedDid) && state.loadingDid !== state.selectedDid) { void options.loadFocus(state.selectedDid); }
  }
  /** Opens the network workspace, preserving cross-page and authentication gates. @returns {void} */
  function show() {
    if (options.navigate()) { return; } if (!options.getState().authAccount) { return; }
    ensure(); options.setState({ workspace: "network" }); options.applyExplorerFullscreen(); options.persistWorkspace("network");
    options.showWorkspace("network"); options.applyHashtagContext(); options.updateAuth(); render();
    const state = options.getState(); if (!state.nodes.size && !state.loading) { void options.load({ silentErrors: false }); }
  }
  /** Applies a clicked relationship filter. @param {Event} event - Button input. @returns {void} */
  function filterClick(event) { options.setState({ filterMode: event.currentTarget.dataset.networkFilter || "all" }); render(); }
  /** Applies text filtering. @returns {void} */
  function searchInput() { options.setState({ query: elements.search.value.trim() }); render(); }
  /** Loads the typed actor on Enter. @param {KeyboardEvent} event - Keyboard input. @returns {void} */
  function accountKeydown(event) { if (event.key !== "Enter") { return; } event.preventDefault(); void options.load({ actor: elements.account.value.trim(), append: false, silentErrors: false }); }
  /** Clears actor validation feedback and refreshes loading controls. @returns {void} */
  function accountInput() { options.note(""); options.updateControls(); }
  /** Normalizes the chosen primary sort field. @returns {void} */
  function sortFieldChange() { let field = "displayName"; if (elements.sortField.value === "handle") { field = "handle"; } options.setState({ sortField: field }); render(); }
  /** Normalizes alphabetical direction. @returns {void} */
  function sortDirectionChange() { let direction = "asc"; if (elements.sortDirection.value === "desc") { direction = "desc"; } options.setState({ sortDirection: direction }); render(); }
  /** Loads an explicit actor using the account button. @returns {Promise<void>} Completion. */
  async function accountLoad() { await options.load({ actor: elements.account?.value.trim() || "", append: false, silentErrors: false }); }
  /** Returns to the authenticated account's network. @returns {Promise<void>} Completion. */
  async function ownLoad() { const state = options.getState(); if (elements.account) { elements.account.value = state.authAccount || state.authDid || ""; } await options.load({ actor: state.authDid || state.authAccount || "", append: false, silentErrors: false }); }
  /** Appends a cursor-based wave. @returns {Promise<void>} Completion. */
  async function load() { await options.load({ append: true }); }
  /** Resets presentation filters/selection without clearing loaded profiles or zoom. @returns {void} */
  function resetView() {
    options.setState({ filterMode: "all", query: "", selectedDid: "", hoveredDid: "", previewTab: "followers" });
    if (elements.search) { elements.search.value = ""; } render();
  }
  return { reset, ensure, own, center, centerLabel, relationLabel, requested, pending, loadMore, status, hover, render, show,
    handlers: { filterClick, searchInput, accountKeydown, accountInput, sortFieldChange, sortDirectionChange, accountLoad, ownLoad, load, reset: resetView } };
}
