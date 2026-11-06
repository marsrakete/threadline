/**
 * Creates authenticated archive hashtag lookups, bounded thread requests and context expansion.
 * @param {object} options - Explicit models, transport/auth, run wait, timers and message adapters.
 * @param {object} options.models - Shared archive filter/thread/post model APIs.
 * @param {Function} options.request - XRPC method/params/transport request.
 * @param {Function} options.refresh - Refreshes account reference. @param {Function} options.base - Resolves its XRPC base.
 * @param {Function} options.wait - Checks cooperative pause/cancel state.
 * @param {Function} options.abortController - Creates an AbortController per attempt.
 * @param {Function} options.schedule - Schedules a timeout. @param {Function} options.clearTimer - Releases a timeout.
 * @param {number} options.timeoutMs - Existing default request deadline. @param {number} options.retries - Existing default retry count.
 * @param {object} options.messages - Existing archive progress/error text templates.
 * @returns {object} Frozen root/thread/media matching, error classification, request and expansion API.
 */
globalThis.createThreadlineArchiveThreadService = function createThreadlineArchiveThreadService(options) {
  for (const name of ["request", "refresh", "base", "wait", "abortController", "schedule", "clearTimer"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive thread service requires " + name);
    }
  }
  for (const [group, name] of [["filters", "matchesHashtags"], ["threads", "root"], ["threads", "all"], ["posts", "build"]]) {
    if (typeof options.models?.[group]?.[name] !== "function") {
      throw new TypeError("Archive thread service requires model " + group + "." + name);
    }
  }
  for (const name of ["readTitle", "threadCheckpoint", "threadTimeout", "threadTimeoutFallback", "threadRetryStep", "threadSkipStep", "threadRetryCheckpoint", "threadTimeoutCheckpoint", "contextExpand", "contextDetail", "contextCheckpoint", "contextSkip", "contextSkipped", "contextSlow", "contextMissing"]) {
    if (typeof options.messages?.[name] !== "string") {
      throw new TypeError("Archive thread service requires message " + name);
    }
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 0 || !Number.isInteger(options.retries) || options.retries < 0) {
    throw new TypeError("Archive thread service requires valid timeout/retry defaults.");
  }
  const bskyGet = options.request, refreshAuthReference = options.refresh, authXrpcBase = options.base;
  const waitForArchiveRunControl = options.wait;
  const recordMatchesArchiveHashtags = options.models.filters.matchesHashtags, getArchiveRootUri = options.models.threads.root;
  const collectThreadViewPosts = options.models.threads.all, buildArchivePostEntity = options.models.posts.build;
  const messages = options.messages;
  /** Formats a controlled message without interpreting replacement contents.
   * @param {string} key - Message key. @param {object} values - Literal placeholder values.
   * @returns {string} Formatted existing message.
   */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }
  /** Resolves selected tags without changing the caller's normalized values.
   * @param {object} filters - Optional filters. @returns {Array} Original selected array or an empty array.
   */
  function selectedHashtags(filters) {
    if (Array.isArray(filters?.hashtagTags)) {
      return filters.hashtagTags;
    }
    return [];
  }
  /** Performs the common root/thread hashtag request with freshly resolved authentication.
   * @param {object} auth - Account reference. @param {string} uri - Root URI.
   * @param {number} depth - Requested reply depth. @returns {Promise<object>} Provider response.
   */
  async function requestHashtagThread(auth, uri, depth) {
    const activeAuth = await refreshAuthReference(auth);
    return await bskyGet("app.bsky.feed.getPostThread", { uri, depth, parentHeight: 0 }, {
      headers: { authorization: `Bearer ${activeAuth.session.accessJwt}` }, base: authXrpcBase(activeAuth),
    });
  }
  /** Loads root-only hashtag matches with caller-owned caching.
   * @param {string} rootUri - Root post URI. @param {object} filters - Selected hashtags.
   * @param {object} auth - Account reference. @param {Map} cache - Root-URI match cache.
   * @returns {Promise<boolean>} Match; missing posts are cached false, other failures reject.
   */
  async function rootPostMatchesArchiveHashtags(rootUri, filters, auth, cache = new Map()) {
    const selectedTags = selectedHashtags(filters);
    if (!rootUri || !selectedTags.length) {
      return false;
    }
    if (cache.has(rootUri)) {
      return cache.get(rootUri);
    }

    let threadResponse = null;
    try {
      threadResponse = await requestHashtagThread(auth, rootUri, 0);
    } catch (error) {
      if (isMissingArchivePostError(error)) {
        cache.set(rootUri, false);
        return false;
      }
      throw error;
    }

    let rootPostView = threadResponse;
    if (threadResponse?.thread?.post?.uri) {
      rootPostView = threadResponse.thread.post;
    } else if (threadResponse?.post?.uri) {
      rootPostView = threadResponse.post;
    } else if (threadResponse?.thread?.uri) {
      rootPostView = threadResponse.thread;
    }
    const matches = recordMatchesArchiveHashtags(rootPostView?.record || {}, filters);
    cache.set(rootUri, matches);
    return matches;
  }

  /** Loads whole-thread hashtag matches with caller-owned caching.
   * @param {string} rootUri - Root post URI. @param {object} filters - Selected hashtags.
   * @param {object} auth - Account reference. @param {Map} cache - Thread-URI match cache.
   * @returns {Promise<boolean>} Whether any collected post matches; missing posts cache false.
   */
  async function threadMatchesArchiveHashtags(rootUri, filters, auth, cache = new Map()) {
    const selectedTags = selectedHashtags(filters);
    if (!rootUri || !selectedTags.length) {
      return false;
    }
    if (cache.has(rootUri)) {
      return cache.get(rootUri);
    }

    let threadResponse = null;
    try {
      threadResponse = await requestHashtagThread(auth, rootUri, 100);
    } catch (error) {
      if (isMissingArchivePostError(error)) {
        cache.set(rootUri, false);
        return false;
      }
      throw error;
    }

    const matches = collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse)
      .some((postView) => recordMatchesArchiveHashtags(postView?.record || {}, filters));
    cache.set(rootUri, matches);
    return matches;
  }

  /** Checks direct tags before selecting root-only or whole-thread lookup.
   * @param {object} postView - Feed post. @param {object} filters - Tags and hashtag scope.
   * @param {object} auth - Account reference. @param {Map} threadCache - Thread results. @param {Map} rootCache - Root results.
   * @returns {Promise<boolean>} Whether the post belongs to the hashtag selection.
   */
  async function postMatchesMediaExportHashtagSelection(postView, filters, auth, threadCache = new Map(), rootCache = new Map()) {
    const selectedTags = selectedHashtags(filters);
    if (!selectedTags.length) {
      return true;
    }

    const record = postView?.record || {};
    if (recordMatchesArchiveHashtags(record, filters)) {
      return true;
    }

    const fallbackUri = postView?.uri || "";
    const rootUri = getArchiveRootUri(record, fallbackUri) || fallbackUri;
    if (!rootUri) {
      return false;
    }

    if (filters.hashtagScope === "startpost") {
      if (rootUri === fallbackUri) {
        return false;
      }
      return rootPostMatchesArchiveHashtags(rootUri, filters, auth, rootCache);
    }

    return threadMatchesArchiveHashtags(rootUri, filters, auth, threadCache);
  }

  /** Classifies existing missing-post messages.
   * @param {unknown} error - Transport failure. @returns {boolean} Whether its message denotes a missing post.
   */
  function isMissingArchivePostError(error) {
    const message = String(error?.message || "").trim().toLowerCase();
    return message.includes("post not found")
      || message.includes("record not found")
      || message.includes("could not locate record")
      || message.includes("not found");
  }

  /** Recognizes existing thread-timeout messages.
   * @param {unknown} error - Request failure. @returns {boolean} Whether the message denotes a thread timeout.
   */
  function isArchiveThreadTimeoutError(error) {
    return String(error?.message || "").toLowerCase().includes("thread request timed out");
  }

  /** Requests a thread with refreshed auth and a fresh abort deadline for each attempt.
   * @param {object} auth - Account reference. @param {string} uri - Post URI.
   * @param {object} settings - Depth/parents, timeout/retries and progress fields.
   * @returns {Promise<object>} Provider response; the last failure rejects after retry exhaustion.
   */
  async function archiveGetPostThread(auth, uri, {
    depth = 100,
    parentHeight = 0,
    timeoutMs = options.timeoutMs,
    retries = options.retries,
    notifyProgress = null,
    progressTitle = messages.readTitle,
    progressPercent = 50,
    progressDetail = "",
    checkpointPrefix = messages.threadCheckpoint,
  } = {}) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = options.abortController();
      const timeoutId = options.schedule(() => controller.abort(), timeoutMs);

      try {
        const activeAuth = await refreshAuthReference(auth);
        return await bskyGet("app.bsky.feed.getPostThread", {
          uri,
          depth,
          parentHeight,
        }, {
          headers: {
            authorization: `Bearer ${activeAuth.session.accessJwt}`,
          },
          base: authXrpcBase(activeAuth),
          signal: controller.signal,
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          lastError = new Error(text("threadTimeout", { seconds: Math.round(timeoutMs / 1000) }));
          if (typeof notifyProgress === "function") {
            const isRetry = attempt < retries;
            let step = text("threadSkipStep");
            let checkpoint = text("threadTimeoutCheckpoint", { prefix: checkpointPrefix });
            if (isRetry) {
              step = text("threadRetryStep", { seconds: Math.round(timeoutMs / 1000) });
              checkpoint = text("threadRetryCheckpoint", { prefix: checkpointPrefix, attempt: attempt + 2, total: retries + 1 });
            }
            notifyProgress({
              title: progressTitle,
              step,
              percent: progressPercent,
              detail: progressDetail || uri,
              checkpoint,
              state: "running",
            });
          }
        } else {
          lastError = error;
        }
        if (attempt >= retries) {
          throw lastError;
        }
      } finally {
        options.clearTimer(timeoutId);
      }
    }

    throw lastError || new Error(text("threadTimeoutFallback"));
  }

  /** Expands unique archive roots and upserts visible response posts.
   * @param {object} settings - Auth/run/progress, postsByUri map and upsertArchivePost adapter; legacy rawRecordsByUri is accepted.
   * @returns {Promise<string>} completed or cancelled; missing/timeout roots are skipped and other failures reject.
   */
  async function expandArchiveConversationContexts({
    auth,
    runId,
    notifyProgress,
    postsByUri,
    rawRecordsByUri,
    upsertArchivePost,
  } = {}) {
    const rootUris = [...new Set(Array.from(postsByUri.values())
      .map((post) => String(post?.thread?.rootUri || post?.uri || "").trim())
      .filter(Boolean))];

    for (const [index, rootUri] of rootUris.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        return "cancelled";
      }

      notifyProgress({
        title: messages.readTitle,
        step: text("contextExpand", { index: index + 1, total: rootUris.length }),
        percent: 48 + Math.round(((index + 1) / Math.max(1, rootUris.length)) * 10),
        detail: messages.contextDetail,
        checkpoint: text("contextExpand", { index: index + 1, total: rootUris.length }),
        state: "running",
      });

      let threadResponse = null;
      try {
        threadResponse = await archiveGetPostThread(auth, rootUri, {
          depth: 100,
          parentHeight: 100,
          notifyProgress,
          progressTitle: messages.readTitle,
          progressPercent: 48 + Math.round(((index + 1) / Math.max(1, rootUris.length)) * 10),
          progressDetail: rootUri,
          checkpointPrefix: text("contextCheckpoint", { index: index + 1, total: rootUris.length }),
        });
      } catch (error) {
        if (!isMissingArchivePostError(error) && !isArchiveThreadTimeoutError(error)) {
          throw error;
        }
        let detail = text("contextMissing", { uri: rootUri });
        if (isArchiveThreadTimeoutError(error)) {
          detail = text("contextSlow", { uri: rootUri });
        }
        notifyProgress({
          title: messages.readTitle,
          step: text("contextSkip", { index: index + 1, total: rootUris.length }),
          percent: 48 + Math.round(((index + 1) / Math.max(1, rootUris.length)) * 10),
          detail,
          checkpoint: text("contextSkipped", { index: index + 1, total: rootUris.length }),
          state: "running",
        });
        continue;
      }

      const threadViews = collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse);
      threadViews.forEach((postView) => {
        const record = postView?.record || {};
        upsertArchivePost(
          buildArchivePostEntity({
            uri: postView.uri,
            cid: postView.cid,
            record,
            authorHandle: postView.author?.handle || "",
            authorDisplayName: postView.author?.displayName || postView.author?.handle || "",
            authorDid: postView.author?.did || "",
            authorAvatar: postView.author?.avatar || "",
            counts: {
              likeCount: Number(postView.likeCount) || 0,
              replyCount: Number(postView.replyCount) || 0,
              repostCount: Number(postView.repostCount) || 0,
              quoteCount: Number(postView.quoteCount) || 0,
            },
          }),
          record,
        );
      });
    }

    return "completed";
  }
  return Object.freeze({ rootMatches: rootPostMatchesArchiveHashtags, threadMatches: threadMatchesArchiveHashtags, mediaMatches: postMatchesMediaExportHashtagSelection, isMissing: isMissingArchivePostError, isTimeout: isArchiveThreadTimeoutError, requestThread: archiveGetPostThread, expandContexts: expandArchiveConversationContexts });
};
