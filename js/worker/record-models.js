/** Pure record boundary normalization for classic-worker services.
 * No network, IndexedDB or page state is accessed; source parsing receives its AT-URI adapter explicitly.
 */
globalThis.ThreadlineRecordModels = (() => {
  /** Normalizes and deduplicates worker post languages.
 * @param {*} tags - Raw language input.
 * @param {number} max - Maximum output languages.
 * @returns {string[]} Canonical base language tags.
 */
function normalizePostLanguageTags(tags, max = 3) {
    const values = Array.isArray(tags) ? tags : [tags];
    const normalized = [];
    const seen = new Set();

    for (const value of values) {
      const raw = String(value || "").trim();
      if (!raw) {
        continue;
      }

      let tag = raw.toLowerCase();
      try {
        tag = new Intl.Locale(raw).language || raw.toLowerCase();
      } catch {
        tag = raw.toLowerCase();
      }

      if (seen.has(tag)) {
        continue;
      }

      seen.add(tag);
      normalized.push(tag);
      if (normalized.length >= max) {
        break;
      }
    }

    return normalized;
  }

  /** Projects persisted reply and quote permission flags.
 * @param {object} value - Raw posting settings.
 * @returns {object} Normalized posting permissions.
 */
function normalizePostInteractionSettings(value = {}) {
    const replyMode = ["everyone", "nobody", "custom"].includes(value.replyMode) ? value.replyMode : "everyone";
    return {
      replyMode,
      allowFollowers: value.allowFollowers === true,
      allowFollowing: value.allowFollowing === true,
      allowMentioned: value.allowMentioned === true,
      quotePostsAllowed: value.quotePostsAllowed !== false,
    };
  }

  /** Reads the last key from an AT URI.
 * @param {string} uri - AT record URI.
 * @returns {string} Record key or empty string.
 */
function extractRecordKeyFromAtUri(uri) {
    const raw = String(uri || "").trim();
    if (!raw.startsWith("at://")) {
      return "";
    }
    const parts = raw.split("/");
    return parts[parts.length - 1] || "";
  }

  /**
   * Splits one AT URI into repo, collection, and record key.
   * @param {string} uri - Full `at://` URI.
   * @returns {object|null} Parsed AT URI parts, or null when the input is invalid.
   */
  function parseAtUriParts(uri) {
    const raw = String(uri || "").trim();
    if (!raw.startsWith("at://")) {
      return null;
    }

    const withoutScheme = raw.slice("at://".length);
    const parts = withoutScheme.split("/");
    if (parts.length < 3) {
      return null;
    }

    const repo = String(parts[0] || "").trim();
    const collection = String(parts[1] || "").trim();
    const rkey = String(parts[2] || "").trim();
    if (!repo || !collection || !rkey) {
      return null;
    }

    return {
      repo,
      collection,
      rkey,
    };
  }

  /** Builds AT Protocol threadgate allow rules.
 * @param {object} settings - Normalized posting permissions.
 * @returns {Array|null} Custom rules or null for everyone.
 */
function buildThreadGateAllowRules(settings) {
    if (settings.replyMode === "everyone") {
      return null;
    }

    if (settings.replyMode === "nobody") {
      return [];
    }

    const rules = [];
    if (settings.allowFollowers) {
      rules.push({ $type: "app.bsky.feed.threadgate#followerRule" });
    }
    if (settings.allowFollowing) {
      rules.push({ $type: "app.bsky.feed.threadgate#followingRule" });
    }
    if (settings.allowMentioned) {
      rules.push({ $type: "app.bsky.feed.threadgate#mentionRule" });
    }
    return rules;
  }

  /** Parses one worker hashtag without changing its display case.
 * @param {string} value - Raw tag.
 * @returns {object|null} Display/normalized tag or null.
 */
function parseHashtagValue(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, "")
      .replace(/[.,;:!?]+$/g, "");

    if (!cleaned) {
      return null;
    }

    return {
      value: cleaned,
      normalized: cleaned.toLowerCase(),
    };
  }

  /** Deduplicates worker hashtag records by normalized spelling.
 * @param {Array} entries - Strings or raw tag objects.
 * @returns {object[]} Normalized tags.
 */
function normalizeHashtagEntries(entries) {
    const seen = new Set();
    const result = [];

    for (const entry of Array.isArray(entries) ? entries : []) {
      const parsed = typeof entry === "string"
        ? parseHashtagValue(entry)
        : parseHashtagValue(entry?.value || entry?.tag || entry?.label || "");

      if (!parsed || seen.has(parsed.normalized)) {
        continue;
      }

      seen.add(parsed.normalized);
      result.push(parsed);
    }

    return result;
  }

  /** Keeps unique selected tags that still exist in the current tag catalog.
 * @param {Array} entries - Selected tags.
 * @param {Array} hashtags - Available tag catalog.
 * @returns {string[]} Retained normalized selections.
 */
function normalizeSelectedHashtagEntries(entries, hashtags) {
    const validSet = new Set((hashtags || []).map((tag) => tag.normalized));
    const seen = new Set();
    const result = [];

    for (const entry of Array.isArray(entries) ? entries : []) {
      const normalized = typeof entry === "string"
        ? parseHashtagValue(entry)?.normalized || String(entry).trim().toLowerCase()
        : parseHashtagValue(entry?.value || entry?.tag || entry?.normalized || "")?.normalized;

      if (!normalized || !validSet.has(normalized) || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push(normalized);
    }

    return result;
  }

  /** Projects profile and relationship fields from a network response.
 * @param {object} profile - Profile view.
 * @param {string} source - Relationship list source.
 * @returns {object} Normalized profile.
 */
function normalizeNetworkProfile(profile = {}, source = "") {
    const viewer = profile?.viewer && typeof profile.viewer === "object" ? profile.viewer : {};
    return {
      did: String(profile.did || "").trim(),
      handle: String(profile.handle || "").trim(),
      displayName: String(profile.displayName || profile.handle || "").trim(),
      avatar: String(profile.avatar || "").trim(),
      description: String(profile.description || "").trim().slice(0, 280),
      followersCount: Number(profile.followersCount) || 0,
      followsCount: Number(profile.followsCount) || 0,
      postsCount: Number(profile.postsCount) || 0,
      followingViewer: source === "following" || Boolean(viewer.following),
      followedByViewer: source === "followers" || Boolean(viewer.followedBy),
    };
  }

  /** Parses a post URL or AT URI into the existing archive source shape.
 * @param {string} value - Post source.
 * @param {Function} parseAtUri - AT URI adapter required for AT sources.
 * @returns {object} Actor, record key and source metadata.
 */
function parseArchiveThreadSource(value = "", parseAtUri) {
    const raw = String(value || "").trim();
    if (!raw) {
      throw new Error("Bitte eine Bluesky-Posting-URL eingeben.");
    }

    if (raw.startsWith("at://")) {
      const parsed = parseAtUri(raw);
      if (!parsed.did || parsed.collection !== "app.bsky.feed.post" || !parsed.rkey) {
        throw new Error("Die Posting-URL ist nicht gueltig.");
      }
      return {
        sourceUrl: raw,
        actor: parsed.did,
        rkey: parsed.rkey,
        entryUri: raw,
      };
    }

    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("Die Posting-URL ist nicht gueltig.");
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 4 || segments[0] !== "profile" || segments[2] !== "post") {
      throw new Error("Die Posting-URL ist nicht gueltig.");
    }

    return {
      sourceUrl: url.toString(),
      actor: decodeURIComponent(segments[1] || ""),
      rkey: decodeURIComponent(segments[3] || ""),
      entryUri: "",
    };
  }

  /** Projects Standard.site card metadata while retaining the worker CTA fallback. @param {object|null} value - Stored card metadata. @returns {object|null} Normalized metadata. */
  function normalizeStandardSiteMetadata(value = null) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const documentUri = String(value.documentUri || value.document || "").trim();
    const publicationUri = String(value.publicationUri || value.publication || "").trim();
    const publicationUrl = String(value.publicationUrl || value.url || "").trim();
    const publicationName = String(value.publicationName || value.name || "").trim().slice(0, 160);
    if (!documentUri && !publicationUri && !publicationUrl && !publicationName) {
      return null;
    }

    return {
      documentUri,
      publicationUri,
      publicationUrl,
      publicationName,
      publicationVerified: value.publicationVerified === true,
      ctaLabel: String(value.ctaLabel || "View Publication").trim().slice(0, 80),
    };
  }

  /** Maps a MIME type to the existing archive extension fallback.
   * @param {string} mimeType - Response MIME type. @returns {string} Extension, defaulting to jpg.
   */
  function getAssetExtensionFromMimeType(mimeType = "") {
    const value = String(mimeType || "").toLowerCase();
    if (value.includes("mp4")) {
      return "mp4";
    }
    if (value.includes("webm")) {
      return "webm";
    }
    if (value.includes("mpeg")) {
      return "mpeg";
    }
    if (value.includes("quicktime") || value.includes("mov")) {
      return "mov";
    }
    if (value.includes("png")) {
      return "png";
    }
    if (value.includes("webp")) {
      return "webp";
    }
    if (value.includes("gif")) {
      return "gif";
    }
    if (value.includes("jpeg") || value.includes("jpg")) {
      return "jpg";
    }
    if (value.includes("svg")) {
      return "svg";
    }
    if (value.includes("json")) {
      return "json";
    }
    return "jpg";
  }

  /** Normalizes asset MIME metadata at the record boundary. @param {*} value - MIME or blob descriptor. @returns {*} Extension, SVG classification or safe image descriptor. */
  function isSvgMimeType(mimeType = "") {
    const value = String(mimeType || "").toLowerCase();
    return value.includes("image/svg") || value.includes("svg+xml");
  }

  /** Replaces SVG archive images with an explicitly supplied safe placeholder.
   * @param {object} blob - MIME/byte descriptor. @param {object} placeholder - Safe type/base64 data.
   * @param {Function} decodeBase64ToBytes - Native byte decoder. @returns {object} Safe image descriptor and replacement flag.
   */
  function normalizeArchiveImageBlob(blob = {}, placeholder, decodeBase64ToBytes) {
    const mimeType = String(blob?.type || "application/octet-stream");
    const bytes = blob?.bytes instanceof Uint8Array ? blob.bytes : new Uint8Array(blob?.bytes || []);
    if (!isSvgMimeType(mimeType)) {
      return {
        type: mimeType,
        bytes,
        replacedSvg: false,
      };
    }
    return {
      type: placeholder.type,
      bytes: decodeBase64ToBytes(placeholder.base64),
      replacedSvg: true,
    };
  }

  return Object.freeze({ getAssetExtensionFromMimeType, normalizeArchiveImageBlob, normalizeStandardSiteMetadata, normalizePostLanguageTags, normalizePostInteractionSettings, extractRecordKeyFromAtUri, parseAtUriParts, buildThreadGateAllowRules, parseHashtagValue, normalizeHashtagEntries, normalizeSelectedHashtagEntries, normalizeNetworkProfile, parseArchiveThreadSource });
})();
