/** Creates media-export path and manifest models without network/storage access.
 * @param {object} options - Existing image/video/card extraction and Blob CID adapters.
 * @returns {object} Frozen timestamp/folder/path/entries/stop API.
 */
globalThis.createThreadlineMediaExportModels = function createThreadlineMediaExportModels(options) {
  for (const name of ["images", "videos", "card", "cid"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Media export models require " + name); }
  }
  const { images: extractArchiveEmbedImages, videos: extractArchiveEmbedVideos,
    card: extractArchiveExternalCardFromRecord, cid: getBlobCidFromRef } = options;
  /** Formats a UTC filename timestamp with the existing invalid-date sentinel. @param {string} createdAt - Post date. @returns {string} Model value. */
  function formatMediaExportTimestamp(createdAt = "") {
    const timestamp = Date.parse(createdAt || "");
    if (Number.isNaN(timestamp)) {
      return "unknown-date";
    }
    return new Date(timestamp).toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
  }

  /** Builds the existing year/month/timestamp/rkey folder. @param {object} post - Post metadata. @returns {string} Model value. */
  function buildMediaExportPostFolder(post = {}) {
    const timestamp = formatMediaExportTimestamp(post.createdAt || "");
    const year = timestamp.slice(0, 4) || "unknown";
    const month = timestamp.slice(0, 7) || `${year}-00`;
    const rkey = String(post.rkey || "post")
      .replace(/[^\w.-]+/g, "-")
      .slice(0, 80) || "post";
    return `posts/${year}/${month}/${timestamp}__post-${rkey}`;
  }

  /** Builds an indexed image/video/other path without extension. @param {string} kind - Media kind. @param {object} post - Post metadata. @param {number} index - Zero-based item index. @returns {string} Model value. */
  function buildMediaExportPathStem(kind, post = {}, index = 0) {
    const postFolder = buildMediaExportPostFolder(post);
    if (kind === "video") {
      return `${postFolder}/video-${String(index + 1).padStart(2, "0")}`;
    }
    if (kind === "other") {
      return `${postFolder}/other-01`;
    }
    return `${postFolder}/img-${String(index + 1).padStart(2, "0")}`;
  }

  /** Builds ordered image/video/card descriptors from a raw post record. @param {object} post - Post metadata. @param {object} record - Raw record. @param {object} options - Media inclusion flags. @returns {Array<object>} Model value. */
  function buildMediaManifestEntriesForPost(post = {}, record = {}, options = {}) {
    const includeImages = options.includeImages !== false;
    const includeVideos = options.includeVideos !== false;
    const includeOther = options.includeOther !== false;
    const entries = [];
    const postFolder = buildMediaExportPostFolder(post);

    if (includeImages) {
      const images = extractArchiveEmbedImages(record);
      images.forEach((image, imageIndex) => {
        const cid = getBlobCidFromRef(image);
        if (!cid) {
          return;
        }
        entries.push({
          id: `${post.uri}::image::${imageIndex + 1}`,
          kind: "image",
          postUri: post.uri,
          postCid: post.cid || "",
          createdAt: post.createdAt || "",
          authorDid: post.authorDid || "",
          authorHandle: post.authorHandle || "",
          rkey: post.rkey || "",
          cid,
          alt: String(image.alt || "").slice(0, 2000),
          width: Number(image.aspectRatio?.width) || 0,
          height: Number(image.aspectRatio?.height) || 0,
          mimeTypeHint: String(image?.image?.mimeType || image?.mimeType || "").trim(),
          postFolder,
          pathStem: buildMediaExportPathStem("image", post, imageIndex),
        });
      });
    }

    if (includeVideos) {
      const videos = extractArchiveEmbedVideos(record);
      videos.forEach((videoEntry, videoIndex) => {
        const cid = getBlobCidFromRef(videoEntry.video || {});
        if (!cid) {
          return;
        }
        entries.push({
          id: `${post.uri}::video::${videoIndex + 1}`,
          kind: "video",
          postUri: post.uri,
          postCid: post.cid || "",
          createdAt: post.createdAt || "",
          authorDid: post.authorDid || "",
          authorHandle: post.authorHandle || "",
          rkey: post.rkey || "",
          cid,
          alt: String(videoEntry.alt || "").slice(0, 2000),
          width: Number(videoEntry.aspectRatio?.width) || 0,
          height: Number(videoEntry.aspectRatio?.height) || 0,
          mimeTypeHint: String(videoEntry?.video?.mimeType || "").trim(),
          postFolder,
          pathStem: buildMediaExportPathStem("video", post, videoIndex),
        });
      });
    }

    if (includeOther) {
      const externalCard = extractArchiveExternalCardFromRecord(record);
      if (externalCard?.thumbRef) {
        const cid = getBlobCidFromRef(externalCard.thumbRef);
        let remoteUrl = String(externalCard.thumbRef?.uri || externalCard.thumbRef?.url || externalCard.thumbRef?.thumb || "").trim();
        if (typeof externalCard.thumbRef === "string") { remoteUrl = externalCard.thumbRef; }
        if (cid || remoteUrl) {
          entries.push({
            id: `${post.uri}::other::thumb`,
            kind: "other",
            postUri: post.uri,
            postCid: post.cid || "",
            createdAt: post.createdAt || "",
            authorDid: post.authorDid || "",
            authorHandle: post.authorHandle || "",
            rkey: post.rkey || "",
            cid,
            remoteUrl,
            alt: String(externalCard.title || externalCard.description || "").slice(0, 1000),
            mimeTypeHint: "",
            postFolder,
            pathStem: buildMediaExportPathStem("other", post, 0),
          });
        }
      }
    }

    return entries;
  }

  /** Tests the existing year/range lower-bound scan stop rule. @param {string} createdAt - Oldest scanned date. @param {object} filters - Normalized archive filters. @returns {boolean} Whether to stop after the current page. */
  function shouldStopAuthorFeedScanForFilters(createdAt = "", filters = {}) {
    const timestamp = Date.parse(createdAt || "");
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (filters.scope === "year" && filters.year) {
      const year = Number(String(filters.year || "").slice(0, 4));
      if (Number.isFinite(year) && timestamp < Date.parse(`${year}-01-01T00:00:00.000Z`)) {
        return true;
      }
    }

    if (filters.scope === "range" && filters.from) {
      const fromTimestamp = Date.parse(`${filters.from}T00:00:00.000Z`);
      if (Number.isFinite(fromTimestamp) && timestamp < fromTimestamp) {
        return true;
      }
    }

    return false;
  }

  return Object.freeze({ timestamp: formatMediaExportTimestamp, folder: buildMediaExportPostFolder, path: buildMediaExportPathStem, entries: buildMediaManifestEntriesForPost, stop: shouldStopAuthorFeedScanForFilters });
};
