/** Creates archive-wave orchestration over existing selection, paging, asset and run-control services.
 * @param {object} options - Explicit worker adapters, models, service objects and ISO clock.
 * @returns {object} Frozen load API.
 */
globalThis.createThreadlineArchiveWaveController = function createThreadlineArchiveWaveController(options) {
  if (typeof options?.ensureSession !== "function") { throw new TypeError("Archive wave controller requires ensureSession"); }
  if (typeof options?.readStoredValue !== "function") { throw new TypeError("Archive wave controller requires readStoredValue"); }
  if (typeof options?.normalizeArchiveExpertMode !== "function") { throw new TypeError("Archive wave controller requires normalizeArchiveExpertMode"); }
  if (typeof options?.normalizeArchiveFilters !== "function") { throw new TypeError("Archive wave controller requires normalizeArchiveFilters"); }
  if (typeof options?.resolveArchiveSourceActor !== "function") { throw new TypeError("Archive wave controller requires resolveArchiveSourceActor"); }
  if (typeof options?.waitForArchiveRunControl !== "function") { throw new TypeError("Archive wave controller requires waitForArchiveRunControl"); }
  if (typeof options?.shouldStopAuthorFeedScanForFilters !== "function") { throw new TypeError("Archive wave controller requires shouldStopAuthorFeedScanForFilters"); }
  if (typeof options?.maybePauseArchiveFeedScan !== "function") { throw new TypeError("Archive wave controller requires maybePauseArchiveFeedScan"); }
  if (typeof options?.mergeArchivePostEntity !== "function") { throw new TypeError("Archive wave controller requires mergeArchivePostEntity"); }
  if (typeof options?.buildArchivePostEntity !== "function") { throw new TypeError("Archive wave controller requires buildArchivePostEntity"); }
  if (typeof options?.getArchiveRootUri !== "function") { throw new TypeError("Archive wave controller requires getArchiveRootUri"); }
  if (typeof options?.parseAtUri !== "function") { throw new TypeError("Archive wave controller requires parseAtUri"); }
  if (typeof options?.runArchiveRequestWithRetry !== "function") { throw new TypeError("Archive wave controller requires runArchiveRequestWithRetry"); }
  if (typeof options?.archiveGetPostThread !== "function") { throw new TypeError("Archive wave controller requires archiveGetPostThread"); }
  if (typeof options?.isMissingArchivePostError !== "function") { throw new TypeError("Archive wave controller requires isMissingArchivePostError"); }
  if (typeof options?.isArchiveThreadTimeoutError !== "function") { throw new TypeError("Archive wave controller requires isArchiveThreadTimeoutError"); }
  if (typeof options?.collectThreadViewPosts !== "function") { throw new TypeError("Archive wave controller requires collectThreadViewPosts"); }
  if (typeof options?.recordBelongsToOwnMainThreadPath !== "function") { throw new TypeError("Archive wave controller requires recordBelongsToOwnMainThreadPath"); }
  if (typeof options?.postMatchesArchiveFilters !== "function") { throw new TypeError("Archive wave controller requires postMatchesArchiveFilters"); }
  if (typeof options?.postMatchesMediaExportHashtagSelection !== "function") { throw new TypeError("Archive wave controller requires postMatchesMediaExportHashtagSelection"); }
  if (typeof options?.expandArchiveConversationContexts !== "function") { throw new TypeError("Archive wave controller requires expandArchiveConversationContexts"); }
  if (typeof options?.attachArchiveAvatarAssets !== "function") { throw new TypeError("Archive wave controller requires attachArchiveAvatarAssets"); }
  if (typeof options?.now !== "function") { throw new TypeError("Archive wave controller requires now"); }
  /** Runs one resumable archive wave. @param {object} input - Run, filters, cursors and existing state. @param {Function} notifyProgress - Progress observer. @returns {Promise<object>} Archive result and continuation state. */
  async function exportAccountArchiveWave({ runId, filters, cursor: initialCursor = "", maxPosts = 500, waveIndex = 1, existingCatalog = null, existingSession = null } = {}, notifyProgress = () => {}) {
    const { ensureSession, readStoredValue, normalizeArchiveExpertMode, normalizeArchiveFilters, resolveArchiveSourceActor, waitForArchiveRunControl, shouldStopAuthorFeedScanForFilters, maybePauseArchiveFeedScan, mergeArchivePostEntity, buildArchivePostEntity, getArchiveRootUri, parseAtUri, runArchiveRequestWithRetry, archiveGetPostThread, isMissingArchivePostError, isArchiveThreadTimeoutError, collectThreadViewPosts, recordBelongsToOwnMainThreadPath, postMatchesArchiveFilters, postMatchesMediaExportHashtagSelection, expandArchiveConversationContexts, attachArchiveAvatarAssets, SETTINGS_KEY, archiveModels, archiveRunControl, APP_VERSION, archiveWaveService, archiveAssetService } = options;
    const auth = await ensureSession();
    const storedSettings = await readStoredValue(SETTINGS_KEY) || {};
    const archiveExpertMode = normalizeArchiveExpertMode(storedSettings?.archiveExpertMode);
    const normalizedFilters = normalizeArchiveFilters(filters);
    const sourceProfile = await resolveArchiveSourceActor(auth, normalizedFilters);
    const sourceDid = sourceProfile.did || auth.session.did;
    const pdsServiceCache = new Map();
    const archiveBlobCache = new Map();
    const threadHashtagMatchCache = new Map();
    const rootHashtagMatchCache = new Map();
    const hasHashtagFilter = Array.isArray(normalizedFilters.hashtagTags) && normalizedFilters.hashtagTags.length > 0;
    const selectedHashtagCount = hasHashtagFilter ? normalizedFilters.hashtagTags.length : 0;
    const resumedWave = archiveModels.wave.restore({ existingCatalog, existingSession, initialCursor, maxPosts });
    const { records, rawRecordsByUri, postsByUri, pageSize } = resumedWave;
    let cursor = resumedWave.cursor;
    let pageCount = resumedWave.pageCount;
    let imageCount = 0;
    let skippedImageCount = 0;
    let orderedPosts = [];
    const assets = [];
    const seenAssetPaths = new Set();
    let previewCounter = 0;
    let cancelled = false;
    let hashtagFilteredOutCount = 0;
    let stopScan = false;
    let currentPhase = "fetch";

    const waveAssetState = {
      /** Reads saved images. @returns {number} Saved count. */
      get imageCount() { return imageCount; },
      /** Assigns saved images. @param {number} value - Count. @returns {void} Updates live state. */
      set imageCount(value) { imageCount = value; },
      /** Reads skipped images. @returns {number} Skipped count. */
      get skippedImageCount() { return skippedImageCount; },
      /** Assigns skipped images. @param {number} value - Count. @returns {void} Updates live state. */
      set skippedImageCount(value) { skippedImageCount = value; },
    };
    // Live accessors preserve partial cursor/counter updates when page selection rejects.
    const wavePageState = {
      /** Reads the current cursor. @returns {string} Resume cursor. */
      get cursor() { return cursor; },
      /** Updates the resume cursor. @param {string} value - Provider cursor. @returns {void} Updates live state. */
      set cursor(value) { cursor = value; },
      /** Reads the cumulative skipped count. @returns {number} Filtered posts. */
      get hashtagFilteredOutCount() { return hashtagFilteredOutCount; },
      /** Updates the skipped count. @param {number} value - Cumulative count. @returns {void} Updates live state. */
      set hashtagFilteredOutCount(value) { hashtagFilteredOutCount = value; },
    };
    const buildHashtagProgressDetail = (baseDetail = "") => {
      if (!hasHashtagFilter) {
        return baseDetail;
      }
      const suffix = `${selectedHashtagCount} Hashtags aktiv · ${hashtagFilteredOutCount} Posts wegen Hashtag-Filter übersprungen`;
      return baseDetail ? `${baseDetail} · ${suffix}` : suffix;
    };

    archiveRunControl.start(runId);

    /** Builds a result from the current wave state and explicit clock/version values.
     * @param {string} status - Completion state. @param {object} settings - Optional error message.
     * @returns {object} Existing archive result and continuation session.
     */
    const buildResult = (status = "completed", settings = {}) => archiveModels.wave.result({
      sourceProfile, sourceDid, normalizedFilters, orderedPosts, assets, imageCount, skippedImageCount,
      hashtagFilteredOutCount, pageCount, currentPhase, cursor,
      exportedAt: options.now(), appVersion: APP_VERSION,
    }, status, settings);

    /** Finishes the current run and builds its snapshot.
     * @param {string} status - Completed/cancelled state. @returns {object} Existing wave result.
     */
    function finalizeWave(status) {
      return archiveWaveService.finalize({ runId, status, buildResult, finish: archiveRunControl.finish });
    }
    notifyProgress({
      title: "Archiv wird gelesen",
      step: sourceProfile.isOwnAccount ? "Eigene Posts werden aus dem Repo geladen ..." : "Posts der Archivquelle werden geladen ...",
      percent: 5,
      detail: buildHashtagProgressDetail(
        hasHashtagFilter
          ? `Konto: ${sourceProfile.handle || sourceDid} · Hashtag-Filter aktiv`
          : `Konto: ${sourceProfile.handle || sourceDid}`,
      ),
      checkpoint: "Archivlauf gestartet",
      state: "running",
    });

    try {
    let shouldContinueFetch = Boolean(cursor) || records.length === 0;
    while (shouldContinueFetch) {
      currentPhase = "fetch";
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        cancelled = true;
        break;
      }
      if (stopScan) {
        cursor = "";
        break;
      }

      const { pageRecords, oldestSeenCreatedAt } = await archiveWaveService.readPage({
        auth, sourceProfile, sourceDid, normalizedFilters, pageSize, pageCount, runId, notifyProgress,
        hasHashtagFilter, threadHashtagMatchCache, rootHashtagMatchCache,
      }, wavePageState);

      if (oldestSeenCreatedAt) {
        stopScan = shouldStopAuthorFeedScanForFilters(oldestSeenCreatedAt, normalizedFilters);
      }

      records.push(...pageRecords);
      pageCount += 1;
      notifyProgress({
        title: "Archiv wird gelesen",
        step: sourceProfile.isOwnAccount
          ? `${pageCount} Repo-Seiten geprüft · ${records.length} passende Posts gefunden`
          : `${pageCount} Feed-Seiten geprüft · ${records.length} passende Posts gefunden`,
        percent: Math.min(45, 5 + (pageCount * 3)),
        detail: buildHashtagProgressDetail(
          hasHashtagFilter
            ? `${records.length} Posts vorgemerkt · Posts werden mit Hashtag-Filter geprüft`
            : `${records.length} Posts vorgemerkt`,
        ),
        checkpoint: `${records.length} Posts gefunden`,
        state: "running",
      });

      if (records.length > 0) {
        previewCounter += 1;
        if (previewCounter % 10 === 0) {
          const latest = records[Math.max(0, records.length - 1)];
          notifyProgress({
            preview: {
              meta: `${records.length} Posts gefunden`,
              text: String(latest?.value?.text || "").slice(0, 280),
            },
            checkpoint: `${records.length} Posts gefunden`,
            state: "running",
          });
        }
      }

      if (!cursor || stopScan) {
        break;
      }

      const pauseState = await maybePauseArchiveFeedScan({
        runId,
        notifyProgress,
        pageCount,
        recordsCount: records.length,
        archiveExpertMode,
      });
      if (pauseState === "cancelled") {
        cancelled = true;
        break;
      }
    }

    records.sort((left, right) => Date.parse(right.value?.createdAt || 0) - Date.parse(left.value?.createdAt || 0));

    const upsertArchivePost = (post, rawRecord = null) => {
      const existing = postsByUri.get(post.uri);
      if (existing) {
        mergeArchivePostEntity(existing, post);
      } else {
        postsByUri.set(post.uri, post);
      }
      if (rawRecord) {
        rawRecordsByUri.set(post.uri, rawRecord);
      }
    };

    records.forEach((entry) => {
      upsertArchivePost(
        buildArchivePostEntity({
          uri: entry.uri,
          cid: entry.cid,
          record: entry.value,
          authorHandle: entry.authorHandle || sourceProfile.handle || "",
          authorDisplayName: entry.authorDisplayName || sourceProfile.displayName || sourceProfile.handle || "",
          authorDid: entry.authorDid || sourceDid,
          authorAvatar: entry.authorAvatar || sourceProfile.avatar || "",
          authorProfile: entry.authorProfile || sourceProfile,
          counts: entry.counts || null,
        }),
        entry.value,
      );
    });

    if ((normalizedFilters.contentMode === "threads" || normalizedFilters.contentMode === "thread_roots") && records.length > 0) {
      currentPhase = "threads";
      const threadRootUris = [...new Set(records
        .map((entry) => getArchiveRootUri(entry.value, entry.uri) || entry.uri)
        .filter((uri) => parseAtUri(uri).did === sourceDid))];

      for (const [threadIndex, rootUri] of threadRootUris.entries()) {
        if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
          orderedPosts = Array.from(postsByUri.values())
            .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
          return finalizeWave("cancelled");
        }

          notifyProgress({
            title: "Archiv wird gelesen",
            step: `Thread ${threadIndex + 1}/${threadRootUris.length} wird erweitert`,
            percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
            detail: buildHashtagProgressDetail(
              hasHashtagFilter
              ? (normalizedFilters.contentMode === "thread_roots"
                ? "Eigene Thread-Hauptpfade werden nachgeladen und mit Hashtag-Filter geprüft"
                : "Antworten in eigenen Threads werden nachgeladen und mit Hashtag-Filter geprüft")
              : (normalizedFilters.contentMode === "thread_roots"
                ? "Eigene Thread-Hauptpfade werden nachgeladen"
                : "Antworten in eigenen Threads werden nachgeladen"),
            ),
            checkpoint: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
            state: "running",
          });

        let threadResponse = null;
        try {
          threadResponse = await runArchiveRequestWithRetry(() => archiveGetPostThread(auth, rootUri, {
            depth: 100,
            parentHeight: 0,
            notifyProgress,
            progressTitle: "Archiv wird gelesen",
            progressPercent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
            progressDetail: rootUri,
            checkpointPrefix: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
          }), {
            runId,
            notifyProgress,
            title: "Archiv wird gelesen",
            percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
            baseDetail: rootUri,
            checkpoint: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
          });
        } catch (error) {
          if (!isMissingArchivePostError(error) && !isArchiveThreadTimeoutError(error)) {
            throw error;
          }

          notifyProgress({
            title: "Archiv wird gelesen",
            step: `Thread ${threadIndex + 1}/${threadRootUris.length} wird übersprungen`,
            percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
            detail: isArchiveThreadTimeoutError(error)
              ? `Thread-Antwort zu langsam · ${rootUri}`
              : `Startpost nicht mehr verfügbar · ${rootUri}`,
            checkpoint: `Fehlenden Thread übersprungen (${threadIndex + 1}/${threadRootUris.length})`,
            state: "running",
          });
          continue;
        }

        const threadViews = collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse);
        for (const postView of threadViews) {
          const record = postView?.record || {};
          const rootCandidate = getArchiveRootUri(record, postView.uri) || postView.uri;
          if (parseAtUri(rootCandidate).did !== sourceDid) {
            continue;
          }
          if (normalizedFilters.contentMode === "thread_roots") {
            if ((postView.author?.did || "") !== sourceDid) {
              continue;
            }
            if (!recordBelongsToOwnMainThreadPath(record, sourceDid, postView.uri)) {
              continue;
            }
          }
          if (!postMatchesArchiveFilters(record, normalizedFilters)) {
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
              hashtagFilteredOutCount += 1;
              continue;
            }
          }
          upsertArchivePost(
            buildArchivePostEntity({
              uri: postView.uri,
              cid: postView.cid,
              record,
              authorHandle: postView.author?.handle || "",
              authorDisplayName: postView.author?.displayName || postView.author?.handle || "",
              authorDid: postView.author?.did || "",
              authorAvatar: postView.author?.avatar || "",
              authorProfile: postView.author,
              counts: {
                likeCount: Number(postView.likeCount) || 0,
                replyCount: Number(postView.replyCount) || 0,
                repostCount: Number(postView.repostCount) || 0,
                quoteCount: Number(postView.quoteCount) || 0,
              },
            }),
            record,
          );
        }
      }
    }

    if (normalizedFilters.includeConversationContext === true && postsByUri.size > 0) {
      currentPhase = "conversation";
      const conversationExpansionResult = await expandArchiveConversationContexts({
        auth,
        runId,
        notifyProgress,
        postsByUri,
        rawRecordsByUri,
        upsertArchivePost,
      });
      if (conversationExpansionResult === "cancelled") {
        orderedPosts = Array.from(postsByUri.values())
          .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
        return finalizeWave("cancelled");
      }
    }

    orderedPosts = Array.from(postsByUri.values())
      .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

    currentPhase = "metrics";
    if (await archiveWaveService.enrichMetrics({ orderedPosts, postsByUri, auth, runId, notifyProgress, buildHashtagProgressDetail }) === "cancelled") {
      orderedPosts = Array.from(postsByUri.values())
        .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
      return finalizeWave("cancelled");
    }

    const uniqueAvatarCount = new Set(
      orderedPosts
        .map((post) => String(post?.authorAvatar || "").trim())
        .filter(Boolean),
    ).size;

    notifyProgress({
      title: "Archiv wird gelesen",
      step: "Profilbilder werden ergänzt …",
      percent: 61,
      detail: buildHashtagProgressDetail(
        uniqueAvatarCount > 0
          ? `${uniqueAvatarCount} eindeutige Avatare werden vorbereitet`
          : "Keine zusätzlichen Avatare gefunden",
      ),
      checkpoint: "Avatare werden vorbereitet",
      state: "running",
    });

    currentPhase = "assets";
    await attachArchiveAvatarAssets(orderedPosts, assets, seenAssetPaths, auth, pdsServiceCache, notifyProgress, 61, archiveBlobCache);

    const assetInput = { orderedPosts, rawRecordsByUri, assets, seenAssetPaths, auth, sourceDid,
      pdsServiceCache, archiveBlobCache, runId, notifyProgress, buildHashtagProgressDetail };
    await archiveAssetService.attachLinkCards(assetInput);
    const cancelledDuringImagePhase = await archiveAssetService.attachImages(assetInput, waveAssetState);
    let finalStatus = "completed";
    if (cancelledDuringImagePhase || cancelled) {
      finalStatus = "cancelled";
    }
    return finalizeWave(finalStatus);
    } catch (error) {
      return archiveWaveService.finalize({ runId, postsByUri, buildResult, finish: archiveRunControl.finish, error,
        setOrderedPosts: (posts) => { orderedPosts = posts; } });
    }
  }
  return Object.freeze({ load: exportAccountArchiveWave });
};
