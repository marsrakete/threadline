/** Maximum media entries per resumable ZIP part. */
export const MEDIA_EXPORT_BATCH_SIZE = 250;

/**
 * Creates stable media-export session and batch data operations.
 * @param {object} dependencies - Current filter/account and clock adapters.
 * @param {Function} dependencies.filters - Reads current archive filters.
 * @param {Function} dependencies.serialize - Serializes archive filters.
 * @param {Function} dependencies.account - Reads the current fallback actor.
 * @param {Function} dependencies.now - Returns the current Date.
 * @returns {object} Session key/resume/create, chunk, post lookup/selection and folder operations.
 */
export function createArchiveMediaModels(dependencies) {
  for (const name of ["filters", "serialize", "account", "now"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Media export requires ${name}.`);
    }
  }
  /**
   * Builds a stable post folder from UTC timestamp and sanitized record key.
   * @param {object} post - Post creation timestamp and record key.
   * @returns {string} Relative post folder, including fallback labels for invalid dates.
   */
  function buildMediaExportPostFolder(post = {}) {
    const rawCreatedAt = String(post?.createdAt || "").trim();
    let timestamp = "unknown-date";
    if (!Number.isNaN(Date.parse(rawCreatedAt))) {
      timestamp = new Date(rawCreatedAt).toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
    }
    const year = timestamp.slice(0, 4) || "unknown";
    const month = timestamp.slice(0, 7) || `${year}-00`;
    const rkey = String(post?.rkey || "post").replace(/[^\w.-]+/g, "-").slice(0, 80) || "post";
    return `posts/${year}/${month}/${timestamp}__post-${rkey}`;
  }

  /**
   * Builds a stable key for a media-export session based on filters and toggles.
   * @param {object} options - Media-export options from the archive form.
   * @returns {string} Stable session key for reuse and resume checks.
   */
  function buildMediaExportSessionKey(options = {}) {
    const filters = options.filters || dependencies.filters();
    const filterKey = dependencies.serialize(filters);
    const actor = String(options.actor || dependencies.account() || "").trim().toLowerCase();
    const kinds = [];
    if (options.includeImages === false) {
      kinds.push("0");
    } else {
      kinds.push("1");
    }
    if (options.includeVideos === false) {
      kinds.push("0");
    } else {
      kinds.push("1");
    }
    if (options.includeOther === false) {
      kinds.push("0");
    } else {
      kinds.push("1");
    }
    return `media:${actor}:${kinds.join("")}:${filterKey}`;
  }

  /**
   * Splits media entries into fixed-size batches for safer ZIP exports.
   * @param {Array} items - Media entries to split.
   * @param {number} size - Maximum number of media entries per batch.
   * @returns {Array<Array>} Chunked media-entry batches.
   */
  function chunkMediaExportEntries(items = [], size = MEDIA_EXPORT_BATCH_SIZE) {
    let sourceItems = [];
    if (Array.isArray(items)) {
      sourceItems = items;
    }
    const chunkSize = Math.max(1, Number(size) || MEDIA_EXPORT_BATCH_SIZE);
    const result = [];
    for (let index = 0; index < sourceItems.length; index += chunkSize) {
      result.push(sourceItems.slice(index, index + chunkSize));
    }
    return result;
  }

  /**
   * Checks whether a persisted media-export session can be resumed for the
   * currently selected options.
   * @param {object|null} session - Persisted media-export session.
   * @param {object} options - Current media-export options.
   * @returns {boolean} True when the session should be resumed.
   */
  function canResumeMediaExportSession(session, options) {
    if (!session || typeof session !== "object") {
      return false;
    }
    if (session.status !== "paused" && session.status !== "running") {
      return false;
    }
    if (String(session.sessionKey || "") !== buildMediaExportSessionKey(options)) {
      return false;
    }
    if (!Array.isArray(session.media) || session.media.length === 0) {
      return false;
    }
    if (!Array.isArray(session.batches) || session.batches.length === 0) {
      return false;
    }
    if ((Number(session.nextBatchIndex) || 0) >= session.batches.length) {
      return false;
    }
    return true;
  }

  /**
   * Creates the persisted media-export resume session from the scan result.
   * @param {object} options - Media-export options used for the scan.
   * @param {object} scanned - Scan result returned by the service worker.
   * @returns {object} Normalized resume session for later batch exports.
   */
  function createMediaExportSession(options, scanned) {
    let media = [];
    if (Array.isArray(scanned?.media)) {
      media = scanned.media;
    }
    let posts = [];
    if (Array.isArray(scanned?.posts)) {
      posts = scanned.posts;
    }
    const batches = chunkMediaExportEntries(media, MEDIA_EXPORT_BATCH_SIZE).map((entries, batchIndex) => ({
      batchIndex,
      itemCount: entries.length
    }));
    return {
      mode: "media-export",
      status: "paused",
      sessionKey: buildMediaExportSessionKey(options),
      options,
      manifest: scanned?.manifest || {},
      posts,
      media,
      batches,
      nextBatchIndex: 0,
      exportedMediaCount: 0,
      skippedMediaCount: 0,
      updatedAt: dependencies.now().toISOString()
    };
  }

  /**
   * Builds a lookup map for already scanned posts by URI.
   * @param {Array} scannedPosts - Posts returned from the media scan.
   * @returns {Map<string, object>} Map keyed by post URI.
   */
  function buildMediaExportPostsByUri(scannedPosts = []) {
    let sourcePosts = [];
    if (Array.isArray(scannedPosts)) {
      sourcePosts = scannedPosts;
    }
    return new Map(sourcePosts.map(post => [post.uri, post]));
  }

  /**
   * Selects the posts referenced by one media-export batch.
   * @param {Array} batchEntries - Media entries in the current batch.
   * @param {Map<string, object>} postsByUri - Post lookup map from the scan.
   * @returns {Array<object>} Deduplicated posts for this batch.
   */
  function collectMediaExportBatchPosts(batchEntries, postsByUri) {
    const result = [];
    const seenUris = new Set();
    let sourceEntries = [];
    if (Array.isArray(batchEntries)) {
      sourceEntries = batchEntries;
    }
    for (const entry of sourceEntries) {
      const postUri = String(entry?.postUri || "").trim();
      if (!postUri || seenUris.has(postUri) || !postsByUri.has(postUri)) {
        continue;
      }
      seenUris.add(postUri);
      result.push(postsByUri.get(postUri));
    }
    return result;
  }
  return {
    folder: buildMediaExportPostFolder,
    key: buildMediaExportSessionKey,
    chunk: chunkMediaExportEntries,
    canResume: canResumeMediaExportSession,
    session: createMediaExportSession,
    postsByUri: buildMediaExportPostsByUri,
    batchPosts: collectMediaExportBatchPosts
  };
}
