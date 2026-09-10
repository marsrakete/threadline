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
