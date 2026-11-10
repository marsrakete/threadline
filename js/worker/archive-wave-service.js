/** Creates archive page collection and metric enrichment with explicit adapters.
 * @param {object} options - request/refresh/base, retry/wait, chunk, select/hashtag and messages.
 * @returns {{readPage: Function, enrichMetrics: Function, finalize: Function}} Frozen wave service; no private run state.
 */
globalThis.createThreadlineArchiveWaveService = function createThreadlineArchiveWaveService(options) {
  for (const name of ["request", "refresh", "base", "retry", "wait", "chunk", "select", "hashtag"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive wave service requires " + name);
    }
  }
  const { request: bskyGet, refresh: refreshAuthReference, base: authXrpcBase, retry: runArchiveRequestWithRetry,
    wait: waitForArchiveRunControl, chunk: chunkEntries, select: postMatchesArchiveSelection,
    hashtag: postMatchesMediaExportHashtagSelection, messages } = options;
  /** Formats existing messages with literal placeholder values.
   * @param {string} key - Message key. @param {object} values - Placeholder values.
   * @returns {string} Existing message with substitutions.
   */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }

  /** Reads and selects one repo/feed page, retaining cursor and skipped counts even on failure.
   * @param {object} input - Auth, source, normalized filters, page size/count, run observer and hashtag caches.
   * @param {object} state - Mutable cursor/hashtagFilteredOutCount adapter; accepted records commit only on success.
   * @returns {Promise<object>} Selected records and oldest timestamp, including filtered feed entries.
   */
  async function readPage(input, state) {
    const { auth, sourceProfile, sourceDid, normalizedFilters, pageSize, pageCount, runId, notifyProgress,
      hasHashtagFilter, threadHashtagMatchCache, rootHashtagMatchCache } = input;
    const activeAuth = await refreshAuthReference(auth);
    const pageRecords = [];
    let oldestSeenCreatedAt = "";

    if (sourceProfile.isOwnAccount) {
      const page = await runArchiveRequestWithRetry(() => bskyGet("com.atproto.repo.listRecords", {
        repo: auth.session.did,
        collection: "app.bsky.feed.post",
        limit: pageSize,
        cursor: state.cursor,
      }, {
        headers: {
          authorization: `Bearer ${activeAuth.session.accessJwt}`,
        },
        base: authXrpcBase(activeAuth),
      }), {
        runId,
        notifyProgress,
        title: messages.readTitle,
        percent: Math.min(45, 5 + (pageCount * 3)),
        baseDetail: text("waveAccount", { account: sourceProfile.handle || sourceDid }),
        checkpoint: messages.waitCheckpoint,
      });
      state.cursor = page.cursor || "";

      for (const entry of (page.records || [])) {
        const normalizedEntry = {
          uri: entry.uri,
          cid: entry.cid,
          value: entry.value || {},
        };
        const createdAt = String(normalizedEntry.value?.createdAt || "").trim();
        if (createdAt && (!oldestSeenCreatedAt || Date.parse(createdAt) < Date.parse(oldestSeenCreatedAt))) {
          oldestSeenCreatedAt = createdAt;
        }
        if (!postMatchesArchiveSelection(normalizedEntry.value, normalizedFilters, sourceDid, normalizedEntry.uri)) {
          continue;
        }
        if (hasHashtagFilter) {
          const matchesHashtagSelection = await postMatchesMediaExportHashtagSelection({
            uri: normalizedEntry.uri,
            record: normalizedEntry.value,
          }, normalizedFilters, auth, threadHashtagMatchCache, rootHashtagMatchCache);
          if (!matchesHashtagSelection) {
            state.hashtagFilteredOutCount += 1;
            continue;
          }
        }
        pageRecords.push(normalizedEntry);
      }
    } else {
      const page = await runArchiveRequestWithRetry(() => bskyGet("app.bsky.feed.getAuthorFeed", {
        actor: sourceDid,
        limit: pageSize,
        cursor: state.cursor || undefined,
      }, {
        headers: {
          authorization: `Bearer ${activeAuth.session.accessJwt}`,
        },
        base: authXrpcBase(activeAuth),
      }), {
        runId,
        notifyProgress,
        title: messages.readTitle,
        percent: Math.min(45, 5 + (pageCount * 3)),
        baseDetail: text("waveAccount", { account: sourceProfile.handle || sourceDid }),
        checkpoint: messages.waitCheckpoint,
      });
      state.cursor = page.cursor || "";

      for (const item of (page.feed || [])) {
        const postView = item?.post || null;
        const record = postView?.record || {};
        const createdAt = String(record?.createdAt || "").trim();
        if (createdAt && (!oldestSeenCreatedAt || Date.parse(createdAt) < Date.parse(oldestSeenCreatedAt))) {
          oldestSeenCreatedAt = createdAt;
        }
        if (!postView?.uri || String(postView.author?.did || "").trim() !== sourceDid) {
          continue;
        }
        if (!postMatchesArchiveSelection(record, normalizedFilters, sourceDid, postView.uri)) {
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
            state.hashtagFilteredOutCount += 1;
            continue;
          }
        }
        pageRecords.push({
          uri: postView.uri,
          cid: postView.cid,
          value: record,
          authorHandle: String(postView.author?.handle || "").trim(),
          authorDisplayName: String(postView.author?.displayName || postView.author?.handle || "").trim(),
          authorDid: String(postView.author?.did || "").trim(),
          authorAvatar: String(postView.author?.avatar || "").trim(),
          authorProfile: globalThis.ThreadlineProfileMetadata.normalize(postView.author),
          counts: {
            likeCount: Number(postView.likeCount) || 0,
            replyCount: Number(postView.replyCount) || 0,
            repostCount: Number(postView.repostCount) || 0,
            quoteCount: Number(postView.quoteCount) || 0,
          },
        });
      }
    }
    return { pageRecords, oldestSeenCreatedAt };
  }
  /** Enriches existing post objects in batches, preserving partial updates and cooperative cancellation.
   * @param {object} input - Ordered posts, URI map, auth/run observer and hashtag-detail formatter.
   * @returns {Promise<string>} completed or cancelled; adapter and observer failures propagate unchanged.
   */
  async function enrichMetrics({ orderedPosts, postsByUri, auth, runId, notifyProgress, buildHashtagProgressDetail }) {
    const metricBatches = chunkEntries(orderedPosts.map((entry) => entry.uri), 25);
    for (const [batchIndex, batch] of metricBatches.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        return "cancelled";
      }

      const activeAuth = await refreshAuthReference(auth);
      const response = await runArchiveRequestWithRetry(() => bskyGet("app.bsky.feed.getPosts", { uris: batch }, {
        headers: {
          authorization: `Bearer ${activeAuth.session.accessJwt}`,
        },
        base: authXrpcBase(activeAuth),
      }), {
        runId,
        notifyProgress,
        title: messages.readTitle,
        percent: 55 + Math.round(((batchIndex + 1) / Math.max(1, metricBatches.length)) * 6),
        baseDetail: text("metricBatch", { index: batchIndex + 1, total: metricBatches.length }),
        checkpoint: text("metricCheckpoint", { index: batchIndex + 1, total: metricBatches.length }),
      });
      (response.posts || []).forEach((postView) => {
        const target = postsByUri.get(postView?.uri);
        if (!target) {
          return;
        }
        target.counts = {
          likeCount: Number(postView.likeCount) || 0,
          replyCount: Number(postView.replyCount) || 0,
          repostCount: Number(postView.repostCount) || 0,
          quoteCount: Number(postView.quoteCount) || 0,
        };
        target.authorAvatar = postView.author?.avatar || target.authorAvatar || "";
        target.authorDisplayName = postView.author?.displayName || target.authorDisplayName || "";
        target.authorHandle = postView.author?.handle || target.authorHandle || "";
        target.authorDid = postView.author?.did || target.authorDid || "";
      });
      if ((batchIndex + 1) % 2 === 0 && batch.length > 0) {
        const previewPost = postsByUri.get(batch[0]);
        if (previewPost) {
          notifyProgress({
            preview: {
              meta: text("metricPreview", { index: batchIndex + 1, total: metricBatches.length }),
              text: String(previewPost.text || "").slice(0, 220),
              metric: text("metricCounts", { likes: previewPost.counts.likeCount, replies: previewPost.counts.replyCount, reposts: previewPost.counts.repostCount, quotes: previewPost.counts.quoteCount }),
            },
            checkpoint: text("metricCheckpoint", { index: batchIndex + 1, total: metricBatches.length }),
            state: "running",
          });
        }
      }
      notifyProgress({
        title: messages.readTitle,
        step: text("metricStep", { index: batchIndex + 1, total: metricBatches.length }),
        percent: 55 + Math.round(((batchIndex + 1) / Math.max(1, metricBatches.length)) * 10),
        detail: buildHashtagProgressDetail(messages.metricDetail),
        checkpoint: text("metricCheckpoint", { index: batchIndex + 1, total: metricBatches.length }),
        state: "running",
      });
    }
    return "completed";
  }
  /** Finalizes a wave, preserving partial posts and classifying cancellation versus recoverable failure.
   * @param {object} input - Run ID, requested status, result builder and finish callback.
   * @param {Map} input.postsByUri - Live posts used only after errors.
   * @param {Function} input.setOrderedPosts - Assigns sorted partial posts after errors.
   * @param {unknown} [input.error] - Caught failure; presence selects failure handling even if undefined.
   * @returns {object} Built result; lifecycle or result errors propagate to the caller.
   */
  function finalize(input) {
    const { runId, postsByUri, setOrderedPosts, buildResult, finish } = input;
    if (Object.hasOwn(input, "error")) {
      const error = input.error;
      setOrderedPosts(Array.from(postsByUri.values())
        .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0)));
      finish(runId);
      if (error?.details?.code === "ARCHIVE_CANCELLED") {
        return buildResult("cancelled", { errorMessage: error?.message || "" });
      }
      return buildResult("paused", { errorMessage: error?.message || messages.wavePaused });
    }
    finish(runId);
    return buildResult(input.status);
  }
  return Object.freeze({ readPage, enrichMetrics, finalize });
};
