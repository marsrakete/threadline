const MEDIA_EXPORT_SCAN_TIMEOUT_MS = 900000;
const MEDIA_EXPORT_ITEM_TIMEOUT_MS = 45000;

/**
 * Creates resumable media ZIP export orchestration with explicit IO and state adapters.
 * @param {object} dependencies - Worker, file-picker, codec, data-model and application adapters.
 * @param {Function} dependencies.t - Resolves localized export and failure text.
 * @param {Function} dependencies.supported - Checks native streaming export support.
 * @param {Function} dependencies.options - Reads the current media filters and toggles.
 * @param {Function} dependencies.request - Sends worker protocol messages, with progress and cancellation.
 * @param {Function} dependencies.progress - Publishes export progress.
 * @param {Function} dependencies.status - Publishes the final application status.
 * @param {Function} dependencies.encode - Encodes JSON text as UTF-8 bytes.
 * @param {Function} dependencies.partName - Builds a numbered ZIP part filename.
 * @param {Function} dependencies.baseName - Builds the filename prefix for selected options.
 * @param {Function} dependencies.canResume - Checks saved-session compatibility.
 * @param {Function} dependencies.session - Builds a new paused export session.
 * @param {Function} dependencies.postsByUri - Indexes scanned post records.
 * @param {Function} dependencies.batchPosts - Selects deduplicated posts for a part.
 * @param {Function} dependencies.folder - Builds the stable post folder path.
 * @param {Function} dependencies.account - Reads the current authenticated handle.
 * @param {Function} dependencies.signal - Reads the active cancellation signal.
 * @param {Function} dependencies.notice - Sets the transient archive notice and redraws status.
 * @param {Function} dependencies.pick - Opens the save-file picker.
 * @param {Function} dependencies.writer - Creates a streaming ZIP writer for a writable sink.
 * @param {Function} dependencies.warn - Reports optional session-cleanup failures.
 * @param {Function} dependencies.now - Returns the current Date.
 * @param {number} dependencies.batchSize - Positive shared media entries per part.
 * @returns {{export: Function}} Exports or resumes media parts.
 */
export function createArchiveMediaExportController(dependencies) {
  for (const name of ["t", "supported", "options", "request", "progress", "status", "encode", "partName", "baseName", "canResume", "session", "postsByUri", "batchPosts", "folder", "account", "signal", "notice", "pick", "writer", "warn", "now"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Media export requires ${name}.`);
    }
  }
  if (!Number.isInteger(dependencies.batchSize) || dependencies.batchSize < 1) {
    throw new TypeError("Media export requires a positive batch size.");
  }
  const MEDIA_EXPORT_BATCH_SIZE = dependencies.batchSize;
  const t = dependencies.t;
  const supportsStreamingZipExport = dependencies.supported;
  const getArchiveMediaExportOptions = dependencies.options;
  const sendToServiceWorker = dependencies.request;
  const setArchiveProgress = dependencies.progress;
  const setStatus = dependencies.status;
  const utf8Bytes = dependencies.encode;
  const buildArchiveMediaPartFileName = dependencies.partName;
  const buildArchiveMediaFileBaseName = dependencies.baseName;
  const canResumeMediaExportSession = dependencies.canResume;
  const createMediaExportSession = dependencies.session;
  const buildMediaExportPostsByUri = dependencies.postsByUri;
  const collectMediaExportBatchPosts = dependencies.batchPosts;
  const buildMediaExportPostFolder = dependencies.folder;
  /**
   * Creates the standard error used when a media ZIP export is cancelled.
   * @returns {Error} Cancel error.
   */
  function createMediaExportAbortError() {
    const error = new Error(t("archiveMediaCancelled"));
    error.name = "AbortError";
    return error;
  }

  /**
   * Throws when the current media ZIP export was cancelled.
   * @param {AbortSignal|null} signal - Abort signal for the current export.
   * @returns {void}
   */
  function throwIfMediaExportAborted(signal = null) {
    if (signal?.aborted) {
      throw createMediaExportAbortError();
    }
  }

  /**
   * Reads the persisted media-export resume session from the service worker.
   * @returns {Promise<object|null>} Saved session or null.
   */
  async function loadMediaExportSession() {
    return await sendToServiceWorker("GET_MEDIA_EXPORT_SESSION", {}, {
      timeoutMs: 120000
    }).catch(() => null);
  }

  /**
   * Persists the media-export resume session in the service worker store.
   * @param {object|null} nextSession - Session state to save.
   * @returns {Promise<void>}
   */
  async function saveMediaExportSession(nextSession) {
    await sendToServiceWorker("SAVE_MEDIA_EXPORT_SESSION", {
      session: nextSession || null
    }, {
      timeoutMs: 120000
    });
  }

  /**
   * Removes any persisted media-export resume session.
   * @returns {Promise<void>}
   */
  async function clearMediaExportSession() {
    await sendToServiceWorker("CLEAR_MEDIA_EXPORT_SESSION", {}, {
      timeoutMs: 30000
    }).catch(error => {
      dependencies.warn("Medien-Export-Sitzung konnte nicht geleert werden.", error);
    });
  }

  /**
   * Exports matching account media into resumable ZIP parts. The function reuses a
   * stored scan result when the same options were already scanned before.
   * @returns {Promise<void>}
   */
  async function exportArchiveMediaZip() {
    if (!dependencies.account()) {
      throw new Error(t("archiveMediaRequiresLogin"));
    }
    if (!supportsStreamingZipExport()) {
      throw new Error(t("archiveMediaStreamUnsupported"));
    }
    const options = getArchiveMediaExportOptions();
    if (!options.includeImages && !options.includeVideos && !options.includeOther) {
      throw new Error(t("archiveMediaNeedKind"));
    }
    const mediaExportSignal = dependencies.signal();
    let archiveTransientNotice = "";
    throwIfMediaExportAborted(mediaExportSignal);
    dependencies.notice(archiveTransientNotice);
    let mediaSession = await loadMediaExportSession();
    throwIfMediaExportAborted(mediaExportSignal);
    if (!canResumeMediaExportSession(mediaSession, options)) {
      setArchiveProgress({
        title: t("archiveMediaScanTitle"),
        step: t("archiveMediaScanStep"),
        percent: 3,
        detail: ""
      });
      const scanned = await sendToServiceWorker("SCAN_ACCOUNT_MEDIA_EXPORT", options, {
        timeoutMs: MEDIA_EXPORT_SCAN_TIMEOUT_MS,
        signal: mediaExportSignal,
        createAbortError: createMediaExportAbortError,
        onProgress(progress) {
          let scanPercent = 3;
          if (Number.isFinite(progress.percent)) {
            scanPercent = progress.percent;
          }
          setArchiveProgress({
            title: progress.title || t("archiveMediaScanTitle"),
            step: progress.step || t("archiveMediaScanStep"),
            percent: scanPercent,
            detail: progress.detail || ""
          });
        }
      });
      throwIfMediaExportAborted(mediaExportSignal);
      mediaSession = createMediaExportSession(options, scanned);
      await saveMediaExportSession(mediaSession);
    } else {
      setArchiveProgress({
        title: t("archiveMediaZipTitle"),
        step: t("archiveMediaResumeStep", {
          index: Number(mediaSession.nextBatchIndex) + 1,
          count: mediaSession.batches.length
        }),
        percent: Math.max(6, Math.round(Number(mediaSession.nextBatchIndex) / Math.max(1, mediaSession.batches.length) * 100)),
        detail: t("archiveMediaResumeDetail", {
          count: Number(mediaSession.exportedMediaCount) || 0,
          skipped: Number(mediaSession.skippedMediaCount) || 0
        })
      });
    }
    let mediaEntries = [];
    if (Array.isArray(mediaSession?.media)) {
      mediaEntries = mediaSession.media;
    }
    if (!mediaEntries.length) {
      await clearMediaExportSession();
      throw new Error(t("archiveMediaNoMatches"));
    }
    let batches = [];
    if (Array.isArray(mediaSession.batches)) {
      batches = mediaSession.batches;
    }
    let scannedPosts = [];
    if (Array.isArray(mediaSession.posts)) {
      scannedPosts = mediaSession.posts;
    }
    const postsByUri = buildMediaExportPostsByUri(scannedPosts);
    const baseName = buildArchiveMediaFileBaseName(options);
    for (let batchIndex = Number(mediaSession.nextBatchIndex) || 0; batchIndex < batches.length; batchIndex += 1) {
      throwIfMediaExportAborted(mediaExportSignal);
      const batchMeta = batches[batchIndex] || {};
      const batchStart = batchIndex * MEDIA_EXPORT_BATCH_SIZE;
      const batchSize = Number(batchMeta.itemCount) || MEDIA_EXPORT_BATCH_SIZE;
      const batchItems = mediaEntries.slice(batchStart, batchStart + batchSize);
      const batchPosts = collectMediaExportBatchPosts(batchItems, postsByUri);
      const suggestedName = buildArchiveMediaPartFileName(baseName, batchIndex, batches.length);
      let fileHandle = null;
      try {
        fileHandle = await dependencies.pick({
          suggestedName,
          types: [{
            description: t("archiveMediaFilePickerDescription"),
            accept: {
              "application/zip": [".zip"]
            }
          }]
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          mediaSession.status = "paused";
          mediaSession.nextBatchIndex = batchIndex;
          mediaSession.updatedAt = dependencies.now().toISOString();
          await saveMediaExportSession(mediaSession);
          archiveTransientNotice = t("archiveMediaPausedDetail", {
            index: batchIndex + 1,
            count: batches.length
          });
          dependencies.notice(archiveTransientNotice);
          setArchiveProgress({
            title: t("archiveProgressPausedTitle"),
            step: t("archiveMediaResumeStep", {
              index: batchIndex + 1,
              count: batches.length
            }),
            percent: Math.max(6, Math.round(batchIndex / Math.max(1, batches.length) * 100)),
            detail: archiveTransientNotice
          });
          return;
        }
        throw new Error(t("archiveMediaFilePickerFailed"));
      }
      const writable = await fileHandle.createWritable();
      const zipWriter = dependencies.writer(writable);
      const exportedMedia = [];
      const skippedMedia = [];
      const writtenPostEntries = new Set();
      try {
        for (const [itemOffset, item] of batchItems.entries()) {
          throwIfMediaExportAborted(mediaExportSignal);
          const overallIndex = batchStart + itemOffset;
          const batchShare = (itemOffset + 1) / Math.max(1, batchItems.length);
          const progressPercent = 12 + Math.round((batchIndex + batchShare) / Math.max(1, batches.length) * 80);
          setArchiveProgress({
            title: t("archiveMediaZipTitle"),
            step: t("archiveMediaBatchStep", {
              batch: batchIndex + 1,
              count: batches.length,
              index: itemOffset + 1,
              total: batchItems.length
            }),
            percent: progressPercent,
            detail: t("archiveMediaZipRobustDetail", {
              index: overallIndex + 1,
              total: mediaEntries.length,
              remaining: Math.max(0, mediaEntries.length - overallIndex - 1),
              count: (Number(mediaSession.exportedMediaCount) || 0) + exportedMedia.length,
              skipped: (Number(mediaSession.skippedMediaCount) || 0) + skippedMedia.length
            })
          });
          try {
            const loaded = await sendToServiceWorker("DOWNLOAD_ACCOUNT_MEDIA_ASSET", {
              item
            }, {
              timeoutMs: MEDIA_EXPORT_ITEM_TIMEOUT_MS,
              signal: mediaExportSignal,
              createAbortError: createMediaExportAbortError,
              onProgress(progress) {
                setArchiveProgress({
                  title: t("archiveMediaZipTitle"),
                  step: progress.step || t("archiveMediaBatchStep", {
                    batch: batchIndex + 1,
                    count: batches.length,
                    index: itemOffset + 1,
                    total: batchItems.length
                  }),
                  percent: progressPercent,
                  detail: progress.detail || t("archiveMediaZipRobustDetail", {
                    index: overallIndex + 1,
                    total: mediaEntries.length,
                    remaining: Math.max(0, mediaEntries.length - overallIndex - 1),
                    count: (Number(mediaSession.exportedMediaCount) || 0) + exportedMedia.length,
                    skipped: (Number(mediaSession.skippedMediaCount) || 0) + skippedMedia.length
                  })
                });
              }
            });
            throwIfMediaExportAborted(mediaExportSignal);
            let modifiedAt = dependencies.now();
            if (loaded?.createdAt) {
              modifiedAt = new Date(loaded.createdAt);
            }
            const relatedPost = postsByUri.get(loaded?.postUri || item.postUri || "") || null;
            let postFolder = "";
            if (relatedPost?.postFolder) {
              postFolder = String(relatedPost.postFolder).trim();
            } else if (item.postFolder) {
              postFolder = String(item.postFolder).trim();
            } else if (loaded?.postFolder) {
              postFolder = String(loaded.postFolder).trim();
            } else {
              postFolder = String(buildMediaExportPostFolder(relatedPost || item || loaded || {})).trim();
            }
            if (postFolder && !writtenPostEntries.has(postFolder) && relatedPost) {
              const postSummary = {
                ...relatedPost,
                exportedAt: dependencies.now().toISOString()
              };
              await zipWriter.addFile(`${postFolder}/post.json`, utf8Bytes(JSON.stringify(postSummary, null, 2)), modifiedAt);
              writtenPostEntries.add(postFolder);
            }
            await zipWriter.addFile(String(loaded.path || item.pathStem || `asset-${overallIndex + 1}`), loaded.bytes || new Uint8Array(), modifiedAt);
            exportedMedia.push({
              id: loaded.id || item.id || "",
              kind: loaded.kind || item.kind || "",
              path: loaded.path || "",
              postFolder,
              type: loaded.type || "",
              sizeBytes: Number(loaded.sizeBytes) || 0,
              createdAt: loaded.createdAt || item.createdAt || "",
              postUri: loaded.postUri || item.postUri || "",
              alt: loaded.alt || item.alt || "",
              width: Number(loaded.width) || 0,
              height: Number(loaded.height) || 0
            });
          } catch (error) {
            if (error?.name === "AbortError") {
              throw error;
            }
            skippedMedia.push({
              id: item.id || "",
              kind: item.kind || "",
              postFolder: String(item.postFolder || buildMediaExportPostFolder(item || {})).trim(),
              createdAt: item.createdAt || "",
              postUri: item.postUri || "",
              reason: error?.message || t("archiveMediaSkippedUnknown")
            });
            setArchiveProgress({
              title: t("archiveMediaZipTitle"),
              step: t("archiveMediaBatchStep", {
                batch: batchIndex + 1,
                count: batches.length,
                index: itemOffset + 1,
                total: batchItems.length
              }),
              percent: progressPercent,
              detail: t("archiveMediaZipRobustDetail", {
                index: overallIndex + 1,
                total: mediaEntries.length,
                remaining: Math.max(0, mediaEntries.length - overallIndex - 1),
                count: (Number(mediaSession.exportedMediaCount) || 0) + exportedMedia.length,
                skipped: (Number(mediaSession.skippedMediaCount) || 0) + skippedMedia.length
              })
            });
          }
        }
        throwIfMediaExportAborted(mediaExportSignal);
        const exportManifest = {
          ...(mediaSession?.manifest || {}),
          exportedAt: dependencies.now().toISOString(),
          mediaCount: exportedMedia.length,
          skippedMediaCount: skippedMedia.length,
          batchIndex: batchIndex + 1,
          batchCount: batches.length,
          batchSize: batchItems.length
        };
        await zipWriter.addFile("_meta/manifest.json", utf8Bytes(JSON.stringify(exportManifest, null, 2)));
        await zipWriter.addFile("_meta/posts.json", utf8Bytes(JSON.stringify(batchPosts, null, 2)));
        await zipWriter.addFile("_meta/media.json", utf8Bytes(JSON.stringify(exportedMedia, null, 2)));
        if (skippedMedia.length > 0) {
          await zipWriter.addFile("_meta/skipped-media.json", utf8Bytes(JSON.stringify(skippedMedia, null, 2)));
        }
        await zipWriter.close();
      } catch (error) {
        try {
          await writable.abort();
        } catch {
          // Ignore secondary abort errors.
        }
        mediaSession.status = "paused";
        mediaSession.nextBatchIndex = batchIndex;
        mediaSession.updatedAt = dependencies.now().toISOString();
        await saveMediaExportSession(mediaSession);
        throw error;
      }
      mediaSession.exportedMediaCount = (Number(mediaSession.exportedMediaCount) || 0) + exportedMedia.length;
      mediaSession.skippedMediaCount = (Number(mediaSession.skippedMediaCount) || 0) + skippedMedia.length;
      mediaSession.nextBatchIndex = batchIndex + 1;
      mediaSession.status = "paused";
      if (mediaSession.nextBatchIndex >= batches.length) {
        mediaSession.status = "completed";
      }
      mediaSession.updatedAt = dependencies.now().toISOString();
      await saveMediaExportSession(mediaSession);
    }
    await clearMediaExportSession();
    setArchiveProgress({
      title: t("archiveProgressDoneTitle"),
      step: t("archiveMediaDoneStep"),
      percent: 100,
      detail: t("archiveMediaDoneDetail", {
        count: Number(mediaSession.exportedMediaCount) || 0,
        skipped: Number(mediaSession.skippedMediaCount) || 0
      })
    });
    archiveTransientNotice = t("archiveMediaDoneDetail", {
      count: Number(mediaSession.exportedMediaCount) || 0,
      skipped: Number(mediaSession.skippedMediaCount) || 0
    });
    dependencies.notice(archiveTransientNotice);
    setStatus(`${t("archiveProgressDoneTitle")}: ${archiveTransientNotice}`);
  }
  return {
    export: exportArchiveMediaZip
  };
}
