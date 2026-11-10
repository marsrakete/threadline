/** Creates media-export scan and item-download workflows with explicit adapters.
 * @param {object} options - Auth, transport, archive selection/models, downloads, clocks/timers and limits.
 * @returns {object} Frozen scan/download API.
 */
globalThis.createThreadlineMediaExportService = function createThreadlineMediaExportService(options) {
  for (const name of ["session", "request", "base", "filters", "matches", "hashtags", "post", "blob", "remote", "timeout", "extension", "now", "repeat", "stopRepeat"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Media export service requires " + name); }
  }
  for (const name of ["folder", "entries", "stop"]) {
    if (typeof options.models?.[name] !== "function") { throw new TypeError("Media export service requires model " + name); }
  }
  for (const name of ["heartbeatMs", "itemMs"]) {
    if (!Number.isInteger(options.limits?.[name]) || options.limits[name] < 1) { throw new TypeError("Media export service requires positive " + name); }
  }
  const { session: ensureSession, request: bskyGet, base: authXrpcBase, filters: normalizeArchiveFilters,
    matches: postMatchesArchiveSelection, hashtags: postMatchesMediaExportHashtagSelection, post: buildArchivePostEntity,
    blob: downloadBlobForDid, remote: downloadRemoteAssetViaBlob, timeout: withThreadExplorerMediaHydrationTimeout,
    extension: getAssetExtensionFromMimeType, now, repeat, stopRepeat, version: APP_VERSION, messages } = options;
  const { folder: buildMediaExportPostFolder, entries: buildMediaManifestEntriesForPost, stop: shouldStopAuthorFeedScanForFilters } = options.models;
  const { heartbeatMs: MEDIA_EXPORT_HEARTBEAT_MS, itemMs: MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS } = options.limits;
  /** Formats existing progress copy with literal values. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values) { return messages[key].replace(/\{(\w+)\}/g, (match, name) => String(values[name])); }
  /** Resolves a requested actor or retains active-session metadata. @param {object} auth - Account entry. @param {string} actor - Requested actor. @returns {Promise<object>} Existing worker result. */
  async function resolveMediaExportActor(auth, actor = "") {
    const rawActor = String(actor || "").trim();
    if (!rawActor) {
      return {
        did: auth.session.did,
        handle: auth.session.handle,
        displayName: auth.session.handle,
        avatar: auth.avatar || "",
      };
    }

    const profile = await bskyGet("app.bsky.actor.getProfile", {
      actor: rawActor,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    return {
      did: String(profile?.did || "").trim(),
      handle: String(profile?.handle || rawActor).trim(),
      displayName: String(profile?.displayName || profile?.handle || rawActor).trim(),
      avatar: String(profile?.avatar || "").trim(),
    };
  }

  /** Scans author pages with archive filters and builds a media manifest. @param {object} input - Actor, filters and inclusion flags. @param {Function} notifyProgress - Observer. @returns {Promise<object>} Existing worker result. */
  async function scanAccountMediaExport({ actor = "", filters = {}, includeImages = true, includeVideos = true, includeOther = true } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const normalizedFilters = normalizeArchiveFilters(filters);
    const actorProfile = await resolveMediaExportActor(auth, actor);
    if (!actorProfile.did) {
      throw new Error(messages.mediaActorMissing);
    }

    const posts = [];
    const media = [];
    const seenMediaIds = new Set();
    const threadHashtagMatchCache = new Map();
    const rootHashtagMatchCache = new Map();
    const hasHashtagFilter = Array.isArray(normalizedFilters.hashtagTags) && normalizedFilters.hashtagTags.length > 0;
    let cursor = "";
    let pageCount = 0;
    let stopScan = false;

    let actorDetail = actorProfile.did;
    if (actorProfile.handle) { actorDetail = text("mediaAccount", { handle: actorProfile.handle }); }
    notifyProgress({
      title: messages.mediaScanTitle,
      step: messages.mediaScanFeed,
      percent: 4,
      detail: actorDetail,
    });

    while (!stopScan) {
      const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
        actor: actorProfile.did,
        limit: 100,
        cursor: cursor || undefined,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });

      let feedItems = [];
      if (Array.isArray(response?.feed)) { feedItems = response.feed; }
      pageCount += 1;
      let oldestSeenCreatedAt = "";

      for (const item of feedItems) {
        const postView = item?.post || null;
        const record = postView?.record || {};
        if (!postView?.uri || postView.author?.did !== actorProfile.did) {
          continue;
        }

        const createdAt = String(record.createdAt || postView.indexedAt || "").trim();
        oldestSeenCreatedAt = createdAt || oldestSeenCreatedAt;

        if (!postMatchesArchiveSelection(record, normalizedFilters, actorProfile.did, postView.uri)) {
          continue;
        }

        if (hasHashtagFilter) {
          const matchesHashtagSelection = await postMatchesMediaExportHashtagSelection(
            postView,
            normalizedFilters,
            auth,
            threadHashtagMatchCache,
            rootHashtagMatchCache,
          );
          if (!matchesHashtagSelection) {
            continue;
          }
        }

        const post = buildArchivePostEntity({
          uri: postView.uri,
          cid: postView.cid,
          record,
          authorHandle: postView.author?.handle || actorProfile.handle || "",
          authorDisplayName: postView.author?.displayName || postView.author?.handle || actorProfile.displayName || "",
          authorDid: postView.author?.did || actorProfile.did,
          authorAvatar: postView.author?.avatar || actorProfile.avatar || "",
          counts: {
            likeCount: Number(postView.likeCount) || 0,
            replyCount: Number(postView.replyCount) || 0,
            repostCount: Number(postView.repostCount) || 0,
            quoteCount: Number(postView.quoteCount) || 0,
          },
        });

        const entries = buildMediaManifestEntriesForPost(post, record, {
          includeImages,
          includeVideos,
          includeOther,
        });

        if (!entries.length) {
          continue;
        }

        posts.push({
          uri: post.uri,
          cid: post.cid || "",
          rkey: post.rkey || "",
          createdAt: post.createdAt || "",
          text: String(post.text || "").slice(0, 280),
          authorDid: post.authorDid || "",
          authorHandle: post.authorHandle || "",
          postFolder: buildMediaExportPostFolder(post),
          permalink: post.permalink || "",
          threadRootUri: post.thread?.rootUri || "",
          threadParentUri: post.thread?.parentUri || "",
          mediaCount: entries.length,
        });

        for (const entry of entries) {
          if (seenMediaIds.has(entry.id)) {
            continue;
          }
          seenMediaIds.add(entry.id);
          media.push(entry);
        }
      }

      notifyProgress({
        title: messages.mediaScanTitle,
        step: text("mediaPageComplete", { page: pageCount }),
        percent: Math.min(78, 4 + (pageCount * 4)),
        detail: text("mediaCounts", { posts: posts.length, media: media.length }),
      });

      cursor = String(response?.cursor || "");
      if (!cursor || !feedItems.length) {
        break;
      }

      stopScan = shouldStopAuthorFeedScanForFilters(oldestSeenCreatedAt, normalizedFilters);
    }

    media.sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
    posts.sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

    notifyProgress({
      title: messages.mediaScanTitle,
      step: messages.mediaManifestReady,
      percent: 100,
      detail: text("mediaCounts", { posts: posts.length, media: media.length }),
    });

    return {
      manifest: {
        schemaVersion: 1,
        exportedAt: now(),
        appVersion: APP_VERSION,
        account: {
          did: actorProfile.did,
          handle: actorProfile.handle,
          displayName: actorProfile.displayName,
        },
        filters: normalizedFilters,
        selectedKinds: {
          images: includeImages !== false,
          videos: includeVideos !== false,
          other: includeOther !== false,
        },
        postCount: posts.length,
        mediaCount: media.length,
      },
      posts,
      media,
    };
  }

  /**
   * Downloads one media asset for the archive export and emits keepalive progress
   * while the network request is still running.
   * @param {object} payload - Worker payload for the media download.
   * @param {object} payload.item - Media descriptor returned by the scan step.
   * @param {Function} notifyProgress - Callback used to notify the app about progress.
   * @returns {Promise<object>} Normalized media file descriptor with bytes.
   */
  async function downloadAccountMediaAsset({ item } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    if (!item || typeof item !== "object") {
      throw new Error(messages.mediaItemMissing);
    }

    const pathStem = String(item.pathStem || "").trim();
    const cid = String(item.cid || "").trim();
    const remoteUrl = String(item.remoteUrl || "").trim();
    const authorDid = String(item.authorDid || auth.session.did || "").trim();
    if (!pathStem || (!cid && !remoteUrl)) {
      throw new Error(messages.mediaSourceIncomplete);
    }

    /**
     * Builds progress payloads for long-running media downloads.
     * @param {boolean} isHeartbeat - True when the payload is only a keepalive tick.
     * @returns {object} Progress payload for the app.
     */
    function buildMediaDownloadProgress(isHeartbeat = false) {
      let mediaLabel = messages.mediaImage;
      if (item.kind === "video") {
        mediaLabel = messages.mediaVideo;
      } else if (item.kind === "other") {
        mediaLabel = messages.mediaAsset;
      }

      let detail = String(item.postUri || "").trim();
      if (isHeartbeat) {
        if (detail) {
          detail = text("mediaConnectedDetail", { detail });
        } else {
          detail = messages.mediaConnected;
        }
      }

      return {
        step: text("mediaItemLoading", { label: mediaLabel }),
        detail,
      };
    }

    /**
     * Emits regular keepalive progress updates until the current asset finished loading.
     * @returns {Function} Cleanup function that stops the heartbeat timer.
     */
    function startMediaDownloadHeartbeat() {
      const timerId = repeat(() => {
        notifyProgress(buildMediaDownloadProgress(true));
      }, MEDIA_EXPORT_HEARTBEAT_MS);
      return () => {
        stopRepeat(timerId);
      };
    }

    notifyProgress(buildMediaDownloadProgress(false));

    const stopHeartbeat = startMediaDownloadHeartbeat();
    let blob = null;
    try {
      if (cid) {
        blob = await withThreadExplorerMediaHydrationTimeout(
          downloadBlobForDid(auth, authorDid, cid, new Map()),
          MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS,
        );
      } else if (remoteUrl) {
        blob = await withThreadExplorerMediaHydrationTimeout(
          downloadRemoteAssetViaBlob(auth, remoteUrl, authorDid, new Map()),
          MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS,
        );
      }
    } finally {
      stopHeartbeat();
    }

    if (!blob?.bytes?.length) {
      throw new Error(messages.mediaLoadFailed);
    }

    let extension = getAssetExtensionFromMimeType(blob.type || item.mimeTypeHint || "");
    if (item.kind === "video" && (!extension || extension === "jpg")) {
      extension = "mp4";
    } else if (item.kind === "other" && !extension) {
      extension = "bin";
    } else if (!extension) {
      extension = "jpg";
    }
    return {
      id: String(item.id || "").trim(),
      kind: String(item.kind || "asset").trim(),
      path: `${pathStem}.${extension}`,
      type: blob.type || "application/octet-stream",
      sizeBytes: blob.bytes.length,
      bytes: blob.bytes,
      createdAt: String(item.createdAt || "").trim(),
      postUri: String(item.postUri || "").trim(),
      alt: String(item.alt || "").slice(0, 2000),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
    };
  }

  return Object.freeze({ scan: scanAccountMediaExport, download: downloadAccountMediaAsset });
};
