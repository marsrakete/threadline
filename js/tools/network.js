/**
 * Determines the relationship of one network node to the viewed account.
 * @param {object} node - Network profile with following and follower flags.
 * @returns {string} One of mutual, followers, following, or other.
 */
export function getNetworkRelationType(node) {
  if (node?.followingViewer && node?.followedByViewer) {
    return "mutual";
  }
  if (node?.followedByViewer) {
    return "followers";
  }
  if (node?.followingViewer) {
    return "following";
  }
  return "other";
}

/**
 * Builds the transparent score components for one network profile.
 * @param {object} node - Network profile with relation and count fields.
 * @returns {{relationScore: number, followersScore: number, postsScore: number, total: number}} Score components.
 */
export function getNetworkScoreBreakdown(node) {
  const relation = getNetworkRelationType(node);
  let relationScore = 30;
  if (relation === "mutual") {
    relationScore = 120;
  } else if (relation === "followers") {
    relationScore = 80;
  } else if (relation === "following") {
    relationScore = 70;
  }

  const followersScore = Math.min(80, Number(node?.followersCount) || 0);
  const postsScore = Math.min(40, Math.floor((Number(node?.postsCount) || 0) / 5));
  return {
    relationScore,
    followersScore,
    postsScore,
    total: relationScore + followersScore + postsScore,
  };
}

/**
 * Returns the combined network score for one profile.
 * @param {object} node - Network profile to score.
 * @returns {number} Combined relationship, follower, and posting score.
 */
export function getNetworkNodeScore(node) {
  return getNetworkScoreBreakdown(node).total;
}

/** Owns cursor-based network loading and actor changes. @param {object} options - State, worker, reset/ingestion and UI adapters. @returns {object} Load operation. */
export function createNetworkDataController(options) {
  /** Loads a network wave with the existing append/reload and error semantics. @param {object} settings - Actor, append and silentErrors flags. @returns {Promise<void>} Completion. */
  async function load(settings = {}) {
    let state = options.getState();
    if (!state.authAccount || state.loading) { return; }
    let source = settings.actor;
    if (!source) {
      if (settings.append === true) { source = state.viewer?.did || state.accountDid || state.authDid || ""; }
      else { source = options.requestedActor(); }
    }
    const actor = String(source).trim();
    if (!actor) { return; }
    options.note("");
    const current = String(state.viewer?.handle || state.accountDid || "").trim().toLowerCase();
    const switchActor = settings.append !== true && (!state.nodes.size || !current || current !== actor.toLowerCase());
    options.ensureAccount();
    if (switchActor) {
      options.setState({ accountDid: actor }); options.reset();
      options.setState({ accountDid: actor, filterMode: "all", query: "", statusLine: options.t("networkProgressLoading") });
      options.clearQuery();
    }
    options.setState({ loading: true }); options.updateControls(); options.busy(true);
    try {
      state = options.getState();
      const result = await options.request("LOAD_NETWORK_SLICE", {
        actor, followerCursor: state.followerCursor, followCursor: state.followCursor, limit: 500,
      }, { timeoutMs: 180000, onProgress: (progress) => {
        const step = String(progress?.step || "").trim(); const detail = String(progress?.detail || "").trim();
        options.status([step, detail].filter(Boolean).join(" \u00b7 ") || options.t("networkProgressLoading"));
      } });
      state = options.getState();
      const viewer = result?.viewer || state.viewer;
      options.setState({ accountDid: result?.viewer?.did || state.accountDid || actor, viewer });
      options.setActorInput(viewer?.handle || actor); options.note("");
      options.ingest(result?.followers || []); options.ingest(result?.follows || []);
      const waveIndex = options.getState().waveIndex + 1;
      options.setState({ followerCursor: String(result?.followerCursor || ""), followCursor: String(result?.followCursor || ""),
        hasMoreFollowers: result?.hasMoreFollowers === true, hasMoreFollows: result?.hasMoreFollows === true, waveIndex });
      options.status(options.t("networkProgressLoaded", { wave: waveIndex, loaded: options.formatCount(options.getState().nodes.size),
        followers: options.formatCount(result?.wave?.followers || 0), follows: options.formatCount(result?.wave?.follows || 0) }));
    } catch (error) {
      options.report(error); const message = error?.message || options.t("networkLoadFailed");
      options.note(message); options.status(message);
      if (!settings.silentErrors) { options.showError(message, options.t("archiveErrorTitle")); }
    } finally { options.setState({ loading: false }); options.busy(false); options.render(); }
  }
  return { load };
}

/**
 * Owns profile lookup/ingestion, focus selection and detail/common-mutual loading.
 * @param {object} options - getState/setState adapters, request, render, status, label, translation and query-reset callbacks.
 * @returns {object} Profile, selection, preview and asynchronous focus operations.
 */
export function createNetworkFocusController(options) {
  /** Finds a profile using the established viewer/node/focus/preview priority. @param {string} did - Account DID. @returns {object|null} Known profile. */
  function known(did) {
    const actor = String(did || "").trim();
    if (!actor) { return null; }
    const state = options.getState();
    if (state.viewer?.did === actor) { return state.viewer; }
    const direct = state.nodes.get(actor);
    if (direct) { return direct; }
    for (const detail of state.details.values()) {
      if (detail?.profile?.did === actor) { return detail.profile; }
      const preview = [...(detail?.followersPreview || []), ...(detail?.followsPreview || [])].find((entry) => entry?.did === actor);
      if (preview) { return preview; }
    }
    return null;
  }
  /** Merges valid profiles into the supplied map, excluding the viewed account. @param {object[]} profiles - Partial profiles. @returns {void} */
  function ingest(profiles = []) {
    const state = options.getState();
    for (const profile of profiles) {
      if (!profile?.did || profile.did === state.accountDid) { continue; }
      state.nodes.set(profile.did, mergeNetworkNode(state.nodes.get(profile.did) || null, profile));
    }
  }
  /** Resolves capped, tagged and deduplicated focus previews. @param {string} did - Selected DID. @returns {object[]} Followers then following previews. */
  function previews(did) {
    let detail = null;
    if (did) { detail = options.getState().details.get(did) || null; }
    if (!detail) { return []; }
    const followers = (detail.followersPreview || []).slice(0, 4).map((entry) => ({ ...entry, previewRelation: "followers" }));
    const following = (detail.followsPreview || []).slice(0, 4).map((entry) => ({ ...entry, previewRelation: "following" }));
    return [...followers, ...following].filter((entry) => entry?.did && entry.did !== did)
      .filter((entry, index, items) => items.findIndex((candidate) => candidate.did === entry.did) === index);
  }
  /** Preserves selection only while it is an actual visible network node. @param {object[]} visible - Visible nodes. @returns {string} Selected DID or empty string. */
  function preferred(visible) {
    const state = options.getState();
    const selected = state.nodes.get(state.selectedDid);
    if (selected && visible.some((node) => node.did === selected.did)) { return selected.did; }
    return "";
  }
  /** Clears common-mutual state and restores the all filter when necessary. @returns {void} */
  function clearCommon() {
    const patch = { commonTargetDid: "", commonDids: new Set(), commonLoadingDid: "", commonHasMore: false };
    if (options.getState().filterMode === "common") { patch.filterMode = "all"; }
    options.setState(patch);
  }
  /** Returns an independent common-mutual set for the matching selection. @param {string} did - Selected DID. @returns {Set<string>} Matching DIDs. */
  function activeCommon(did = options.getState().selectedDid) {
    const actor = String(did || "").trim(); const state = options.getState();
    if (!actor || actor !== state.commonTargetDid || !state.commonDids.size) { return new Set(); }
    return new Set(state.commonDids);
  }
  /** Formats worker progress only for the current selection. @param {object} progress - Step/detail text. @param {string} did - Request target. @param {string} fallback - Translation key. @param {boolean} includeLabel - Prefer known node label. @returns {void} */
  function progressStatus(progress, did, fallback, includeLabel) {
    const state = options.getState();
    if (state.selectedDid !== did) { return; }
    const step = String(progress?.step || "").trim(); let detail = String(progress?.detail || "").trim();
    if (includeLabel) {
      const profile = state.nodes.get(did);
      if (profile) { detail = options.label(profile) || detail; }
    }
    options.setStatus([step, detail].filter(Boolean).join(" \u00b7 ") || options.t(fallback));
  }
  /** Loads one profile's focus details, retaining same-target request suppression. @param {string} did - Focus DID. @returns {Promise<void>} Load completion. */
  async function loadFocus(did) {
    const actor = String(did || "").trim();
    if (!actor || options.getState().loadingDid === actor) { return; }
    options.setState({ loadingDid: actor }); options.render();
    try {
      const result = await options.request("LOAD_NETWORK_ACTOR_FOCUS", { actor }, {
        timeoutMs: 120000, onProgress: (progress) => progressStatus(progress, actor, "networkFocusLoading", true),
      });
      if (result?.profile?.did) {
        const state = options.getState();
        state.nodes.set(result.profile.did, mergeNetworkNode(state.nodes.get(result.profile.did) || null, result.profile));
        let followersPreview = []; let followsPreview = [];
        if (Array.isArray(result.followersPreview)) { followersPreview = result.followersPreview; }
        if (Array.isArray(result.followsPreview)) { followsPreview = result.followsPreview; }
        state.details.set(result.profile.did, { profile: result.profile, relationshipDates: result.relationshipDates || null,
          activityStats: result.activityStats || null, likeStats: result.likeStats || null, followersPreview, followsPreview });
      }
    } catch (error) {
      options.report(error);
      if (options.getState().selectedDid === actor) { options.setStatus(error.message || options.t("networkFocusLoadFailed")); }
    } finally {
      if (options.getState().loadingDid === actor) { options.setState({ loadingDid: "" }); }
      options.render();
    }
  }
  /** Loads common mutuals and restores the established filter/viewport state. @param {string} did - Focus DID. @returns {Promise<void>} Load completion. */
  async function loadCommon(did) {
    const actor = String(did || "").trim(); const state = options.getState();
    if (!actor || state.commonLoadingDid === actor) { return; }
    const center = String(state.viewer?.did || state.accountDid || state.authDid || "").trim();
    if (!center || center === actor) { return; }
    options.setState({ commonLoadingDid: actor }); options.render();
    try {
      const result = await options.request("LOAD_NETWORK_COMMON_MUTUALS", { centerActor: center, focusActor: actor }, {
        timeoutMs: 420000, onProgress: (progress) => progressStatus(progress, actor, "networkCommonMutualsLoading", false),
      });
      options.setState({ filterMode: "all", query: "" }); options.clearQuery();
      ingest(result?.commonProfiles || []);
      let dids = [];
      if (Array.isArray(result?.commonDids)) { dids = result.commonDids.map((item) => String(item || "").trim()).filter(Boolean); }
      const commonDids = new Set(dids);
      options.setState({ commonTargetDid: actor, commonDids, commonHasMore: false, fitAll: true, zoom: 1, panX: 0, panY: 0 });
      options.setStatus(options.t("networkCommonMutualsLoaded", { count: options.formatCount(commonDids.size) }));
    } catch (error) {
      options.report(error); clearCommon(); options.setStatus(error.message || options.t("networkCommonMutualsLoadFailed"));
    } finally {
      if (options.getState().commonLoadingDid === actor) { options.setState({ commonLoadingDid: "" }); }
      options.render();
    }
  }
  /** Selects a profile, updates focus presentation and optionally loads details. @param {string} did - Account DID. @param {object} settings - Load flag and preview tab. @returns {void} */
  function select(did, settings = {}) {
    const { loadDetails = true, previewTab = "followers" } = settings;
    const actor = String(did || "").trim();
    if (!actor) { return; }
    const state = options.getState();
    if (state.commonTargetDid && state.commonTargetDid !== actor) { clearCommon(); }
    options.setState({ selectedDid: actor, previewTab, collapsed: false }); options.render();
    if (loadDetails) { void loadFocus(actor); }
  }
  return { known, ingest, previews, preferred, clearCommon, activeCommon, loadFocus, loadCommon, select };
}

/** Merges profile updates without dropping previously loaded relationships or metadata. @param {object|null} existing - Previous profile. @param {object} incoming - New partial profile. @returns {object} Independent merged profile. */
export function mergeNetworkNode(existing, incoming = {}) {
  if (!existing) {
    return { ...incoming, followingViewer: incoming.followingViewer === true, followedByViewer: incoming.followedByViewer === true };
  }
  return {
    ...existing, ...incoming,
    handle: incoming.handle || existing.handle || "",
    displayName: incoming.displayName || existing.displayName || incoming.handle || existing.handle || "",
    avatar: incoming.avatar || existing.avatar || "",
    description: incoming.description || existing.description || "",
    followersCount: Number(incoming.followersCount) || Number(existing.followersCount) || 0,
    followsCount: Number(incoming.followsCount) || Number(existing.followsCount) || 0,
    postsCount: Number(incoming.postsCount) || Number(existing.postsCount) || 0,
    followingViewer: existing.followingViewer || incoming.followingViewer === true,
    followedByViewer: existing.followedByViewer || incoming.followedByViewer === true,
  };
}

/** Calculates the existing strongest-profile cutoff. @param {object[]} nodes - Network profiles. @returns {number} Score threshold, or zero for an empty collection. */
export function calculateStrongNetworkThreshold(nodes = []) {
  if (!nodes.length) { return 0; }
  const scores = nodes.map(getNetworkNodeScore).sort((left, right) => right - left);
  const preferredCount = Math.max(18, Math.ceil(scores.length * 0.14));
  const thresholdIndex = Math.min(scores.length - 1, preferredCount - 1);
  return Math.max(100, scores[thresholdIndex] || 0);
}

/** Ranks profiles by score, breaking ties by handle/name. @param {object[]} nodes - Profiles to rank. @returns {object[]} Independent sorted array. */
export function rankNetworkNodes(nodes = []) {
  return [...nodes].sort((left, right) => {
    const delta = getNetworkNodeScore(right) - getNetworkNodeScore(left);
    if (delta !== 0) { return delta; }
    return String(left.handle || left.displayName || "").localeCompare(String(right.handle || right.displayName || ""));
  });
}

/** Matches one profile against a relation/score/common-account filter. @param {object} node - Profile. @param {object} options - Mode, threshold and common DID set. @returns {boolean} Match status. */
function matchesNetworkSelection(node, options) {
  const relation = getNetworkRelationType(node);
  if (options.mode === "common") { return options.commonDids.has(String(node?.did || "").trim()); }
  if (["mutual", "followers", "following"].includes(options.mode)) { return relation === options.mode; }
  if (options.mode === "strong") { return getNetworkNodeScore(node) >= options.threshold; }
  return true;
}

/** Filters ranked profiles by relation and text, retaining existing limit semantics. @param {object[]} nodes - Source profiles. @param {object} options - Mode, query, commonDids and limit. @returns {object[]} Ranked visible profiles. */
export function selectNetworkNodes(nodes = [], options = {}) {
  const ranked = rankNetworkNodes(nodes);
  const query = String(options.query || "").trim().toLowerCase();
  const filter = { mode: options.mode, commonDids: options.commonDids || new Set(), threshold: calculateStrongNetworkThreshold(ranked) };
  const selected = ranked.filter((node) => matchesNetworkSelection(node, filter)).filter((node) => {
    if (!query) { return true; }
    return `${node.displayName || ""} ${node.handle || ""}`.toLowerCase().includes(query);
  });
  if (!Number.isFinite(options.limit)) { return selected; }
  return selected.slice(0, Math.max(0, options.limit));
}

/** Reads a profile's primary alphabetical sort value. @param {object} node - Profile. @param {string} field - Handle or display name. @returns {string} Trimmed value. */
function networkSortValue(node, field) {
  if (field === "handle") { return String(node?.handle || node?.did || "").trim(); }
  return String(node?.displayName || node?.handle || node?.did || "").trim();
}

/** Sorts profiles alphabetically with locale-aware ties and explicit direction. @param {object[]} nodes - Profiles. @param {object} options - Field, direction and locale. @returns {object[]} Independent sorted array. */
export function sortNetworkProfiles(nodes = [], options = {}) {
  let direction = 1;
  if (options.direction === "desc") { direction = -1; }
  return [...nodes].sort((left, right) => {
    const primary = networkSortValue(left, options.field).localeCompare(networkSortValue(right, options.field), options.locale || undefined, { sensitivity: "base" });
    if (primary !== 0) { return primary * direction; }
    const secondary = String(left?.handle || left?.did || "").localeCompare(String(right?.handle || right?.did || ""), options.locale || undefined, { sensitivity: "base" });
    if (secondary !== 0) { return secondary * direction; }
    return String(left?.did || "").localeCompare(String(right?.did || "")) * direction;
  });
}

/** Computes fit or manually zoomed viewport without mutating application state. @param {object} layout - Dimensions and optional content bounds. @param {object} state - Fit flag, zoom and pan coordinates. @param {object} limits - Minimum/maximum zoom and shared clamp function. @returns {object} Viewport plus clamped pan coordinates. */
export function calculateNetworkViewport(layout, state, limits) {
  const bounds = layout.contentBounds || { minX: 0, minY: 0, maxX: layout.width, maxY: layout.height };
  if (state.fitAll) {
    return { viewport: { x: bounds.minX - 72, y: bounds.minY - 72,
      width: Math.max(1, bounds.maxX - bounds.minX) + 144, height: Math.max(1, bounds.maxY - bounds.minY) + 144, zoom: 1 },
      panX: state.panX, panY: state.panY };
  }
  const zoom = limits.clamp(state.zoom, limits.min, limits.max);
  const width = layout.width / zoom; const height = layout.height / zoom;
  const baseX = (bounds.minX + bounds.maxX) / 2 - width / 2;
  const baseY = (bounds.minY + bounds.maxY) / 2 - height / 2;
  const paddingX = Math.max(80, width * 0.12); const paddingY = Math.max(80, height * 0.12);
  const firstX = bounds.maxX + paddingX - (baseX + width); const secondX = bounds.minX - paddingX - baseX;
  const firstY = bounds.maxY + paddingY - (baseY + height); const secondY = bounds.minY - paddingY - baseY;
  const panX = limits.clamp(state.panX, Math.min(firstX, secondX), Math.max(firstX, secondX));
  const panY = limits.clamp(state.panY, Math.min(firstY, secondY), Math.max(firstY, secondY));
  return { viewport: { x: baseX + panX, y: baseY + panY, width, height, zoom }, panX, panY };
}

/** Calculates bounds including center, profile circles and optional focus island. @param {object} layout - Center and position map. @param {object[]} nodes - Visible profiles. @param {string} selectedDid - Selected profile. @param {object[]} focusItems - Already resolved focus previews. @returns {object} Content bounds. */
export function calculateNetworkContentBounds(layout, nodes, selectedDid, focusItems = []) {
  let minX = layout.centerX - 64; let maxX = layout.centerX + 64;
  let minY = layout.centerY - 64; let maxY = layout.centerY + 92;
  for (const node of nodes) {
    const point = layout.positions.get(node.did);
    if (!point) { continue; }
    let radius = 15;
    if (node.did === selectedDid) { radius = 27; }
    else if (getNetworkRelationType(node) === "mutual") { radius = 18; }
    minX = Math.min(minX, point.x - radius - 28); maxX = Math.max(maxX, point.x + radius + 28);
    minY = Math.min(minY, point.y - radius - 28); maxY = Math.max(maxY, point.y + radius + 28);
  }
  if (layout.hasFocusIsland && selectedDid) {
    minX = Math.min(minX, layout.centerX - 178); maxX = Math.max(maxX, layout.centerX + 178);
    minY = Math.min(minY, layout.focusCenterY - 166); maxY = Math.max(maxY, layout.focusCenterY + 178);
    focusItems.forEach((entry, index) => {
      const angle = -Math.PI / 2 + index / Math.max(1, focusItems.length) * Math.PI * 2;
      const x = layout.centerX + Math.cos(angle) * 76; const y = layout.focusCenterY + Math.sin(angle) * 76;
      minX = Math.min(minX, x - 24); maxX = Math.max(maxX, x + 24);
      minY = Math.min(minY, y - 24); maxY = Math.max(maxY, y + 24);
    });
  }
  return { minX, minY, maxX, maxY };
}
