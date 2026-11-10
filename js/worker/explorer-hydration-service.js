/** Creates Explorer avatar/media hydration, readable cache access and bounded download orchestration.
 * @param {object} options - Auth, avatar/cache/storage/download/model/conversion/concurrency/clock/timer adapters and limits.
 * @returns {object} Frozen avatars/media/read/write/timeout/download API.
 */
globalThis.createThreadlineExplorerHydrationService = function createThreadlineExplorerHydrationService(options) {
  for (const name of ["session", "refresh", "pruneAvatars", "readAvatars", "normalizeAvatars", "writeValue", "openCache", "response", "downloadBlob", "downloadDirect", "parseBlob", "normalizeBlob", "extension", "dataUrl", "concurrent", "now", "iso", "schedule", "clearTimer", "repeat", "stopRepeat"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Explorer hydration requires " + name); }
  }
  for (const name of ["authors", "mediaEntries"]) {
    if (typeof options.models?.[name] !== "function") { throw new TypeError("Explorer hydration requires model " + name); }
  }
  for (const name of ["cacheReadMs", "itemMs", "directMs", "heartbeatMs", "mediaConcurrency", "avatarConcurrency", "avatarTtlMs"]) {
    if (!Number.isInteger(options.limits?.[name]) || options.limits[name] < 1) { throw new TypeError("Explorer hydration requires positive " + name); }
  }
  const { session: ensureSession, refresh: refreshAuthReference, pruneAvatars: pruneAccountAvatarCache,
    readAvatars: getAccountAvatarCache, normalizeAvatars: normalizeAccountAvatarAssets, writeValue: writeStoredValue,
    openCache, response, downloadBlob: downloadRemoteAssetViaBlob, downloadDirect: downloadRemoteAsset,
    parseBlob: parseBlobUrlInfo, normalizeBlob: normalizeArchiveImageBlob, extension: getAssetExtensionFromMimeType,
    dataUrl: bytesToDataUrl, concurrent: mapWithConcurrency, now: nowMs, iso, schedule, clearTimer, repeat, stopRepeat,
    cacheName: REMOTE_MEDIA_CACHE_NAME, avatarKey: ACCOUNT_AVATAR_CACHE_KEY, messages } = options;
  const { authors: collectThreadExplorerAvatarAuthors, mediaEntries: collectThreadExplorerMediaHydrationEntries } = options.models;
  const { cacheReadMs: THREAD_EXPLORER_MEDIA_CACHE_READ_TIMEOUT_MS, itemMs: THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
    directMs: THREAD_EXPLORER_MEDIA_HYDRATION_DIRECT_TIMEOUT_MS, heartbeatMs: THREAD_EXPLORER_MEDIA_HYDRATION_HEARTBEAT_MS,
    mediaConcurrency: THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY, avatarConcurrency: ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY,
    avatarTtlMs: ACCOUNT_AVATAR_CACHE_TTL_MS } = options.limits;
  /**
   * Resolves a promise with null when a Thread Explorer cache read takes too long.
   * @param {Promise<any>} promise - Cache read promise.
   * @returns {Promise<any|null>} Original value or null on timeout/error.
   */
  function withThreadExplorerMediaCacheReadTimeout(promise) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutId = schedule(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(null);
      }, THREAD_EXPLORER_MEDIA_CACHE_READ_TIMEOUT_MS);

      promise.then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimer(timeoutId);
        resolve(value);
      }).catch(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimer(timeoutId);
        resolve(null);
      });
    });
  }

  /**
   * Reads a readable Thread Explorer media asset from the remote media cache.
   * @param {string} url - Original remote media URL used as cache key.
   * @param {Cache|null} cache - Already opened remote media cache.
   * @returns {Promise<{type: string, bytes: Uint8Array}|null>} Cached media blob or null.
   */
  async function readThreadExplorerRemoteMediaCacheBlob(url = "", cache = null) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return null;
    }

    let mediaCache = cache;
    if (!mediaCache) {
      mediaCache = await openCache(REMOTE_MEDIA_CACHE_NAME);
    }
    const response = await withThreadExplorerMediaCacheReadTimeout(mediaCache.match(normalizedUrl));
    if (!response || response.type === "opaque") {
      return null;
    }

    try {
      const bytes = await withThreadExplorerMediaCacheReadTimeout(response.arrayBuffer());
      if (!bytes) {
        return null;
      }
      return {
        type: response.headers.get("content-type") || "application/octet-stream",
        bytes: new Uint8Array(bytes),
      };
    } catch {
      return null;
    }
  }

  /**
   * Stores one readable Thread Explorer media asset in the remote media cache.
   * @param {string} url - Original remote media URL used as cache key.
   * @param {{type?: string, bytes?: Uint8Array}} blob - Media bytes and MIME type.
   * @param {Cache|null} cache - Already opened remote media cache.
   * @returns {Promise<void>} Resolves after the cache write was attempted.
   */
  async function writeThreadExplorerRemoteMediaCacheBlob(url = "", blob = {}, cache = null) {
    const normalizedUrl = String(url || "").trim();
    let bytes = new Uint8Array(blob?.bytes || []);
    if (blob?.bytes instanceof Uint8Array) { bytes = blob.bytes; }
    if (!normalizedUrl || bytes.length === 0) {
      return;
    }

    const type = String(blob.type || "application/octet-stream").trim() || "application/octet-stream";
    let mediaCache = cache;
    if (!mediaCache) {
      mediaCache = await openCache(REMOTE_MEDIA_CACHE_NAME);
    }
    const cacheResponse = response(bytes, {
      headers: {
        "content-type": type,
        "cache-control": "max-age=86400",
      },
    });
    await mediaCache.put(normalizedUrl, cacheResponse).catch(() => {});
  }

  /**
   * Downloads missing Thread Explorer avatars into the shared avatar cache.
   * @param {object} payload - Contains the currently loaded Thread Explorer tree.
   * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
   * @returns {Promise<object>} Hydration summary with cache TTL and hydrated avatar count.
   */
  async function hydrateThreadExplorerAvatars(payload = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const serviceCache = new Map();
    const now = nowMs();
    const cache = pruneAccountAvatarCache(await getAccountAvatarCache(), now);
    const assets = normalizeAccountAvatarAssets(cache?.assets);
    const authors = Array.from(collectThreadExplorerAvatarAuthors(payload?.root).values());
    let hydratedCount = 0;
    let processedCount = 0;
    let skippedCount = 0;
    const totalCount = authors.length;

    const buildProgress = () => ({
      phase: "thread_explorer_avatars",
      current: processedCount,
      total: totalCount,
      remaining: Math.max(0, totalCount - processedCount),
      hydrated: hydratedCount,
      skipped: skippedCount,
    });

    notifyProgress(buildProgress());
    const stopHeartbeat = startThreadExplorerMediaHydrationHeartbeat(buildProgress, notifyProgress);

    try {
      await mapWithConcurrency(authors, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (author) => {
        let asset = assets.find((entry) => entry.did === author.did && entry.url === author.avatar);
        if (!asset) {
          try {
            const blob = await withThreadExplorerMediaHydrationTimeout(
              downloadRemoteAssetViaBlob(activeAuth, author.avatar, author.did, serviceCache),
              THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
            );
            const extension = getAssetExtensionFromMimeType(blob.type);
            const slug = String(author.handle || author.did || "account")
              .replace(/[^\w.-]+/g, "-")
              .slice(0, 60) || "account";
            asset = {
              did: author.did,
              url: author.avatar,
              path: `account-avatars/${slug}.${extension}`,
              type: blob.type,
              sizeBytes: blob.bytes.length,
              cachedAt: now,
              bytes: blob.bytes,
            };
            for (let index = assets.length - 1; index >= 0; index -= 1) {
              if (assets[index].did === author.did) {
                assets.splice(index, 1);
              }
            }
            assets.push(asset);
          } catch {
            asset = null;
          }
        }

        if (asset) {
          hydratedCount += 1;
        } else {
          skippedCount += 1;
        }
        processedCount += 1;
        notifyProgress(buildProgress());
      });
    } finally {
      stopHeartbeat();
    }

    await writeStoredValue(ACCOUNT_AVATAR_CACHE_KEY, {
      ...cache,
      assets,
      updatedAt: iso(now),
    });

    return {
      ttlMs: ACCOUNT_AVATAR_CACHE_TTL_MS,
      avatarCount: hydratedCount,
    };
  }

  /**
   * Rejects a promise when one Thread Explorer media item takes too long.
   * @param {Promise<any>} promise - Original media download promise.
   * @param {number} timeoutMs - Timeout in milliseconds.
   * @returns {Promise<any>} Original result or timeout rejection.
   */
  function withThreadExplorerMediaHydrationTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutId = schedule(() => {
        reject(new Error(messages.explorerMediaTimeout));
      }, timeoutMs);
      promise.then((value) => {
        clearTimer(timeoutId);
        resolve(value);
      }).catch((error) => {
        clearTimer(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Checks whether a Thread Explorer media URL should skip direct CORS fetching.
   * @param {string} url - Remote media URL.
   * @returns {boolean} True when the blob/PDS path should be used first.
   */
  function shouldSkipThreadExplorerDirectMediaFetch(url = "") {
    const blobInfo = parseBlobUrlInfo(url);
    if (blobInfo?.cid) {
      return true;
    }
    return false;
  }

  /**
   * Downloads one Thread Explorer media asset through the fastest available path.
   * @param {object} auth - Authenticated account entry.
   * @param {object} entry - Media entry with url and fallback DID.
   * @param {Map<string, string>} serviceCache - DID-to-PDS cache for blob fallback.
   * @returns {Promise<{type: string, bytes: Uint8Array}>} Downloaded media payload.
   */
  async function downloadThreadExplorerMediaAssetFast(auth, entry = {}, serviceCache = new Map()) {
    if (shouldSkipThreadExplorerDirectMediaFetch(entry.url)) {
      return withThreadExplorerMediaHydrationTimeout(
        downloadRemoteAssetViaBlob(auth, entry.url, entry.did || auth.session?.did || "", serviceCache),
        THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
      );
    }

    try {
      return await withThreadExplorerMediaHydrationTimeout(
        downloadRemoteAsset(entry.url),
        THREAD_EXPLORER_MEDIA_HYDRATION_DIRECT_TIMEOUT_MS,
      );
    } catch {
      return withThreadExplorerMediaHydrationTimeout(
        downloadRemoteAssetViaBlob(auth, entry.url, entry.did || auth.session?.did || "", serviceCache),
        THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
      );
    }
  }

  /**
   * Starts periodic Thread Explorer media progress updates.
   * @param {() => object} getProgress - Returns the latest progress payload.
   * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
   * @returns {() => void} Stops the heartbeat.
   */
  function startThreadExplorerMediaHydrationHeartbeat(getProgress, notifyProgress) {
    const heartbeatId = repeat(() => {
      notifyProgress({
        ...getProgress(),
        heartbeat: true,
      });
    }, THREAD_EXPLORER_MEDIA_HYDRATION_HEARTBEAT_MS);
    return () => {
      stopRepeat(heartbeatId);
    };
  }

  /**
   * Downloads Thread Explorer media needed by the PNG snapshot and returns data URIs.
   * @param {object} payload - Contains the currently loaded Thread Explorer tree.
   * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
   * @returns {Promise<object>} Media data URI map and hydrated count.
   */
  async function hydrateThreadExplorerMedia(payload = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const serviceCache = new Map();
    const remoteMediaCache = await openCache(REMOTE_MEDIA_CACHE_NAME);
    const mediaEntries = collectThreadExplorerMediaHydrationEntries(payload);
    const media = {};
    let hydratedCount = 0;
    let processedCount = 0;
    let skippedCount = 0;
    let cacheHitCount = 0;
    let downloadedCount = 0;
    const totalCount = mediaEntries.length;

    const buildProgress = () => ({
      phase: "thread_explorer_media",
      current: processedCount,
      total: totalCount,
      remaining: Math.max(0, totalCount - processedCount),
      hydrated: hydratedCount,
      skipped: skippedCount,
      cacheHits: cacheHitCount,
      downloaded: downloadedCount,
      concurrency: THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY,
    });

    notifyProgress(buildProgress());
    const stopHeartbeat = startThreadExplorerMediaHydrationHeartbeat(buildProgress, notifyProgress);
    const cacheWritePromises = [];

    try {
      await mapWithConcurrency(mediaEntries, THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY, async (entry) => {
        try {
          let blob = await readThreadExplorerRemoteMediaCacheBlob(entry.url, remoteMediaCache);
          let wasCacheHit = false;
          if (blob) {
            wasCacheHit = true;
            cacheHitCount += 1;
          } else {
            blob = await downloadThreadExplorerMediaAssetFast(activeAuth, entry, serviceCache);
            downloadedCount += 1;
          }
          const normalizedBlob = normalizeArchiveImageBlob(blob);
          if (!normalizedBlob.bytes?.length) {
            skippedCount += 1;
            return;
          }
          media[entry.url] = bytesToDataUrl(normalizedBlob.bytes, normalizedBlob.type || "image/jpeg");
          if (!wasCacheHit) {
            cacheWritePromises.push(writeThreadExplorerRemoteMediaCacheBlob(entry.url, normalizedBlob, remoteMediaCache));
          }
          hydratedCount += 1;
        } catch {
          skippedCount += 1;
          // Keep the snapshot export running even when individual remote images cannot be loaded.
        } finally {
          processedCount += 1;
          notifyProgress(buildProgress());
        }
      });
    } finally {
      stopHeartbeat();
    }
    void Promise.allSettled(cacheWritePromises);

    return {
      media,
      mediaCount: hydratedCount,
    };
  }

  return Object.freeze({ avatars: hydrateThreadExplorerAvatars, media: hydrateThreadExplorerMedia, read: readThreadExplorerRemoteMediaCacheBlob, write: writeThreadExplorerRemoteMediaCacheBlob, timeout: withThreadExplorerMediaHydrationTimeout, download: downloadThreadExplorerMediaAssetFast });
};
