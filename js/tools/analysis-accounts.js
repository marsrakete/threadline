/** Returns an array or an empty fallback. @param {*} value - Candidate list. @returns {Array} Valid list. */
function list(value) {
  if (Array.isArray(value)) { return value; }
  return [];
}

/** Normalizes an identifier. @param {*} value - Raw value. @returns {string} Trimmed text. */
function text(value) { return String(value || "").trim(); }

/** Normalizes identifier lists without changing order. @param {*} values - Raw list. @returns {string[]} Nonempty identifiers. */
function identifiers(values) { return list(values).map(text).filter(Boolean); }

/** Normalizes optional moderation lists. @param {*} values - Raw entries. @returns {Array|null} DID records or unavailable marker. */
function moderation(values) {
  if (!Array.isArray(values)) { return null; }
  return values.map((entry) => ({ did: text(entry?.did) })).filter((entry) => entry.did);
}

/** Projects marker lists and shares. @param {object} markers - Raw markers. @returns {object} Normalized markers. */
function markerData(markers = {}) {
  return {
    topMentions: list(markers.topMentions), topHashtags: list(markers.topHashtags), topDomains: list(markers.topDomains),
    topReplyTargets: list(markers.topReplyTargets), topQuoteTargets: list(markers.topQuoteTargets), topLanguages: list(markers.topLanguages),
    mediaPostShare: Number(markers.mediaPostShare) || 0, textOnlyPostShare: Number(markers.textOnlyPostShare) || 0,
  };
}

/** Projects profile fields while optionally deriving the display name. @param {object} profile - Profile. @param {boolean} fallback - Whether to derive a name. @returns {object} Profile fields. */
function profileData(profile = {}, fallback = false) {
  let name = profile.displayName;
  if (fallback) { name = name || profile.handle || profile.did; }
  const result = { did: text(profile.did), handle: text(profile.handle), displayName: text(name), avatar: text(profile.avatar),
    postsCount: Number(profile.postsCount) || 0, followersCount: Number(profile.followersCount) || 0, followsCount: Number(profile.followsCount) || 0 };
  for (const key of ["pronouns", "website", "links"]) {
    if (Object.hasOwn(profile, key)) { result[key] = profile[key]; }
  }
  return result;
}

/** Projects account filters. @param {object} filters - Raw options. @param {number} limit - Default limit. @returns {object} Normalized options. */
function filterData(filters = {}, limit = 1) {
  return { rangeDays: Math.max(0, Number(filters.rangeDays) || 0), includeReplies: filters.includeReplies === true,
    includeQuotes: filters.includeQuotes === true, limit: Math.max(1, Number(filters.limit) || limit || 1) };
}

/** Projects load metadata. @param {object} stats - Raw metadata. @param {number} scanned - Scan fallback. @returns {object} Normalized metadata. */
function statData(stats = {}, scanned = 0) {
  return { fetchedPosts: Math.max(0, Number(stats.fetchedPosts) || 0), scannedPosts: Math.max(0, Number(stats.scannedPosts) || scanned),
    pages: Math.max(0, Number(stats.pages) || 0), oldestPostAt: text(stats.oldestPostAt), newestPostAt: text(stats.newestPostAt) };
}

/** Gets DID values from persisted lists or legacy profiles. @param {object} network - Network data. @param {string} key - DID key. @param {string} legacy - Legacy profile key. @returns {Set<string>} DID set. */
function networkDids(network, key, legacy) {
  if (Array.isArray(network[key])) { return new Set(identifiers(network[key])); }
  return new Set(list(network[legacy]).map((entry) => text(entry?.did)).filter(Boolean));
}

/** Creates the account normalization adapter. @param {object} options - Explicit corpus and temporal calculators. @returns {object} Normalization operation. */
export function createAnalysisAccountNormalizer(options) {
  /** Normalizes worker or persisted account data and recalculates derived values. @param {object|null} result - Source data. @returns {object|null} Account with corpus, profile and DID sets. */
  function normalize(result = null) {
    if (!result || typeof result !== "object") { return null; }
    const posts = list(result.posts);
    const texts = posts.map((post) => String(post?.text || "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const network = result.network || {};
    let loadState = text(network.loadState);
    if (!["complete", "partial", "failed", "legacy"].includes(loadState)) {
      loadState = "legacy";
      if (Array.isArray(network.followerDids) && Array.isArray(network.followDids) && Array.isArray(network.mutualDids)) { loadState = "complete"; }
    }
    return { profile: profileData(result.profile || {}, true), filters: filterData(result.filters || {}, posts.length),
      stats: statData(result.stats || {}, posts.length), posts, texts, corpus: options.corpus(texts), temporal: options.temporal(posts),
      network: { followers: [], follows: [], mutualDids: identifiers(network.mutualDids),
        followerDids: networkDids(network, "followerDids", "followers"), followDids: networkDids(network, "followDids", "follows"),
        mutes: moderation(network.mutes), blocks: moderation(network.blocks), muteBlockSource: text(network.muteBlockSource) || "unavailable",
        loadState, warnings: identifiers(network.warnings) }, markers: markerData(result.markers || {}) };
  }
  return { normalize };
}

/** Projects a normalized account into JSON-safe storage data. @param {object|null} account - Normalized account. @returns {object|null} Storage record without derived Maps or Sets. */
export function getPersistableAnalysisAccount(account = null) {
  if (!account || typeof account !== "object") { return null; }
  const network = account.network || {};
  let loadState = "legacy";
  if (["complete", "partial", "failed"].includes(text(network.loadState))) { loadState = text(network.loadState); }
  return { profile: profileData(account.profile || {}), filters: filterData(account.filters || {}), stats: statData(account.stats || {}),
    posts: list(account.posts).map((post) => ({ uri: text(post?.uri), cid: text(post?.cid), createdAt: text(post?.createdAt), text: text(post?.text) })),
    network: { followers: [], follows: [], mutualDids: list(network.mutualDids), followerDids: Array.from(network.followerDids || []),
      followDids: Array.from(network.followDids || []), mutes: moderation(network.mutes), blocks: moderation(network.blocks),
      muteBlockSource: text(network.muteBlockSource) || "unavailable", loadState, warnings: identifiers(network.warnings) },
    markers: markerData(account.markers || {}) };
}

/** Detects old stored accounts that need fresh network data. @param {object|null} rawAccount - Stored record. @returns {boolean} Whether refresh is required. */
export function analysisAccountNeedsNetworkRefresh(rawAccount = null) {
  if (!rawAccount || typeof rawAccount !== "object" || !rawAccount.network || typeof rawAccount.network !== "object") { return false; }
  const network = rawAccount.network;
  if (Object.prototype.hasOwnProperty.call(network, "loadState")) { return false; }
  const hasArrays = ["followerDids", "followDids", "mutualDids", "warnings"].some((key) => Object.prototype.hasOwnProperty.call(network, key));
  const expected = (Number(rawAccount.profile?.followersCount) || 0) > 0 || (Number(rawAccount.profile?.followsCount) || 0) > 0;
  return expected && !hasArrays;
}
