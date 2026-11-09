/**
 * Creates authenticated search paging and private run-control state for the classic worker.
 * @param {object} options - Query plans, local filters, network and authentication adapters.
 * @param {object} options.queries - Pure request/cursor planning operations.
 * @param {object} options.filters - Local match, item and timestamp operations.
 * @param {Function} options.request - Loads one XRPC endpoint with params and transport options.
 * @param {Function} options.base - Resolves the authenticated XRPC base URL.
 * @param {Function} options.session - Loads or refreshes the active session.
 * @param {Function} options.refresh - Resolves the latest account reference.
 * @returns {{load: Function, control: Function}} Search run and control entry points.
 */
globalThis.createThreadlineSearchService = function createThreadlineSearchService(options) {
  for (const name of ['request', 'base', 'session', 'refresh']) {
    if (typeof options?.[name] !== 'function') {
      throw new TypeError('Search service requires ' + name);
    }
  }
  for (const name of ["createSearchWorkspaceExcludeUriSet", "buildSearchWorkspaceSearchVariants", "parseSearchWorkspaceSearchCursorState", "buildSearchWorkspaceSearchCursorState", "buildSearchWorkspaceSearchPostsParams", "normalizeSearchWorkspaceMode", "shouldFallbackNetworkSearchToAuthorFeed", "hasSearchWorkspaceServerQuery"]) {
    if (typeof options.queries?.[name] !== 'function') {
      throw new TypeError('Search service requires query ' + name);
    }
  }
  for (const name of ['matches', 'item', 'timestamp']) {
    if (typeof options.filters?.[name] !== 'function') {
      throw new TypeError('Search service requires filter ' + name);
    }
  }
  const searchRunControls = new Map();
  const {
    createSearchWorkspaceExcludeUriSet,
    buildSearchWorkspaceSearchVariants,
    parseSearchWorkspaceSearchCursorState,
    buildSearchWorkspaceSearchCursorState,
    buildSearchWorkspaceSearchPostsParams,
    normalizeSearchWorkspaceMode,
    shouldFallbackNetworkSearchToAuthorFeed,
    hasSearchWorkspaceServerQuery
  } = options.queries;
  const {
    matches: matchesSearchWorkspacePost,
    item: normalizeSearchWorkspaceResultItem,
    timestamp: getSearchWorkspaceResultTimestamp
  } = options.filters;
  const bskyGet = options.request,
    authXrpcBase = options.base,
    ensureSession = options.session,
    refreshAuthReference = options.refresh;
  /**
  * Loads network or hashtag search results through `searchPosts`.
  * @param {object} auth - Active authenticated account entry.
  * @param {object} payload - Search workspace payload from the page.
  * @param {(progress: object) => void} notifyProgress - Progress callback for the current run.
  * @returns {Promise<object>} Search items and next cursor.
  */
  async function loadSearchWorkspaceSearchPosts(auth, payload = {}, notifyProgress = () => {}) {
    const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 25));
    const targetCount = Math.min(50, Math.max(10, limit));
    const excludeUris = createSearchWorkspaceExcludeUriSet(payload?.excludeUris);
    const variants = buildSearchWorkspaceSearchVariants(payload);
    const variantKeys = variants.map(variant => {
      return variant.key;
    });
    const runId = String(payload?.runId || "").trim();
    const items = [];
    let scannedCount = 0;
    let pageCount = 0;
    if (variants.length > 1) {
      const cursorState = parseSearchWorkspaceSearchCursorState(payload?.cursor || "", variantKeys);
      const cursors = {
        ...cursorState.cursors
      };
      const exhausted = new Set(cursorState.exhausted);
      while (items.length < targetCount && pageCount < 12) {
        let loadedAnyVariant = false;
        for (const variant of variants) {
          if (items.length >= targetCount) {
            break;
          }
          if (exhausted.has(variant.key)) {
            continue;
          }
          if (runId && searchRunControls.get(runId)?.state === "cancelled") {
            items.sort((left, right) => {
              return getSearchWorkspaceResultTimestamp(right) - getSearchWorkspaceResultTimestamp(left);
            });
            return {
              items: items.slice(0, targetCount),
              cursor: buildSearchWorkspaceSearchCursorState(cursors, exhausted, variantKeys),
              cancelled: true
            };
          }
          loadedAnyVariant = true;
          const params = buildSearchWorkspaceSearchPostsParams(variant.payload, variant.forcedLang);
          params.limit = limit;
          if (String(cursors[variant.key] || "").trim()) {
            params.cursor = cursors[variant.key];
          }
          const response = await bskyGet("app.bsky.feed.searchPosts", params, {
            headers: {
              authorization: `Bearer ${auth.session.accessJwt}`
            },
            base: authXrpcBase(auth)
          });
          let posts;
          if (Array.isArray(response?.posts)) {
            posts = response.posts;
          } else {
            posts = [];
          }
          scannedCount += posts.length;
          posts.forEach(postView => {
            const item = normalizeSearchWorkspaceResultItem({
              post: postView
            });
            const uri = String(item?.post?.uri || "").trim();
            if (!item || !uri || excludeUris.has(uri)) {
              return;
            }
            if (!matchesSearchWorkspacePost(item.post, payload, item)) {
              return;
            }
            excludeUris.add(uri);
            items.push(item);
          });
          const nextCursor = String(response?.cursor || "").trim();
          if (nextCursor) {
            cursors[variant.key] = nextCursor;
          } else {
            delete cursors[variant.key];
            exhausted.add(variant.key);
          }
          pageCount += 1;
          notifyProgress({
            mode: "network",
            pageCount,
            scannedCount,
            matchCount: items.length
          });
          if (!nextCursor || posts.length === 0) {
            exhausted.add(variant.key);
          }
        }
        if (!loadedAnyVariant) {
          break;
        }
      }
      items.sort((left, right) => {
        return getSearchWorkspaceResultTimestamp(right) - getSearchWorkspaceResultTimestamp(left);
      });
      return {
        items: items.slice(0, targetCount),
        cursor: buildSearchWorkspaceSearchCursorState(cursors, exhausted, variantKeys)
      };
    }
    const singleVariant = variants[0] || {
      forcedLang: "",
      payload
    };
    let cursor = String(payload?.cursor || "").trim();
    let nextCursor = "";
    while (items.length < targetCount && pageCount < 12) {
      if (runId && searchRunControls.get(runId)?.state === "cancelled") {
        return {
          items: items.slice(0, targetCount),
          cursor,
          cancelled: true
        };
      }
      const params = buildSearchWorkspaceSearchPostsParams(singleVariant.payload, singleVariant.forcedLang);
      params.limit = limit;
      if (cursor) {
        params.cursor = cursor;
      }
      const response = await bskyGet("app.bsky.feed.searchPosts", params, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`
        },
        base: authXrpcBase(auth)
      });
      let posts;
      if (Array.isArray(response?.posts)) {
        posts = response.posts;
      } else {
        posts = [];
      }
      scannedCount += posts.length;
      posts.forEach(postView => {
        const item = normalizeSearchWorkspaceResultItem({
          post: postView
        });
        const uri = String(item?.post?.uri || "").trim();
        if (!item || !uri || excludeUris.has(uri)) {
          return;
        }
        if (!matchesSearchWorkspacePost(item.post, payload, item)) {
          return;
        }
        excludeUris.add(uri);
        items.push(item);
      });
      nextCursor = String(response?.cursor || "").trim();
      cursor = nextCursor;
      pageCount += 1;
      notifyProgress({
        mode: "network",
        pageCount,
        scannedCount,
        matchCount: items.length
      });
      if (!nextCursor || posts.length === 0) {
        break;
      }
    }
    return {
      items: items.slice(0, targetCount),
      cursor: nextCursor
    };
  }

  /**
   * Loads recent posts or reposts from one account via `getAuthorFeed`.
   * @param {object} auth - Active authenticated account entry.
   * @param {object} payload - Search workspace payload from the page.
   * @param {boolean} repostsOnly - True when only repost entries should be returned.
   * @param {(progress: object) => void} notifyProgress - Progress callback for the current run.
   * @returns {Promise<object>} Search items and next cursor.
   */
  async function loadSearchWorkspaceAuthorFeed(auth, payload = {}, repostsOnly = false, notifyProgress = () => {}) {
    const actor = String(payload?.actor || auth?.session?.handle || auth?.session?.did || "").trim();
    if (!actor) {
      throw new Error("Bitte gib einen Account fuer diese Suche an.");
    }
    const maxPages = 120;
    const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 25));
    const targetCount = Math.min(50, Math.max(10, limit));
    const excludeUris = createSearchWorkspaceExcludeUriSet(payload?.excludeUris);
    const runId = String(payload?.runId || "").trim();
    const items = [];
    let cursor = String(payload?.cursor || "").trim();
    let nextCursor = "";
    let scannedCount = 0;
    let pageCount = 0;
    while (items.length < targetCount && pageCount < maxPages) {
      if (runId && searchRunControls.get(runId)?.state === "cancelled") {
        return {
          items: items.slice(0, targetCount),
          cursor,
          cancelled: true
        };
      }
      const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
        actor,
        limit,
        cursor: cursor || undefined
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`
        },
        base: authXrpcBase(auth)
      });
      let feed;
      if (Array.isArray(response?.feed)) {
        feed = response.feed;
      } else {
        feed = [];
      }
      scannedCount += feed.length;
      feed.forEach(entry => {
        const item = normalizeSearchWorkspaceResultItem(entry);
        const uri = String(item?.post?.uri || "").trim();
        if (!item) {
          return;
        }
        if (!uri || excludeUris.has(uri)) {
          return;
        }
        const isRepost = item.reasonType === "repost";
        if (repostsOnly && !isRepost) {
          return;
        }
        if (!repostsOnly && isRepost) {
          return;
        }
        if (!matchesSearchWorkspacePost(item.post, payload, item)) {
          return;
        }
        excludeUris.add(uri);
        items.push(item);
      });
      nextCursor = String(response?.cursor || "").trim();
      cursor = nextCursor;
      pageCount += 1;
      let progressMode;
      if (repostsOnly) {
        progressMode = "reposts";
      } else {
        progressMode = "posts";
      }
      notifyProgress({
        mode: progressMode,
        actor,
        pageCount,
        scannedCount,
        matchCount: items.length
      });
      if (!nextCursor || feed.length === 0) {
        break;
      }
    }
    return {
      items: items.slice(0, targetCount),
      cursor: nextCursor
    };
  }

  /**
   * Loads one search workspace page for the requested mode.
   * @param {object} payload - Search workspace payload from the page.
   * @param {(progress: object) => void} notifyProgress - Progress callback for the current run.
   * @returns {Promise<object>} Search result items and next cursor.
   */
  async function loadSearchResults(payload = {}, notifyProgress = () => {}) {
    const runId = String(payload?.runId || "").trim();
    if (runId && !searchRunControls.has(runId)) {
      searchRunControls.set(runId, {
        state: "running"
      });
    }
    try {
      const auth = await ensureSession();
      const activeAuth = await refreshAuthReference(auth);
      const mode = normalizeSearchWorkspaceMode(payload?.mode);
      if (mode === "posts") {
        return await loadSearchWorkspaceAuthorFeed(activeAuth, payload, false, notifyProgress);
      }
      if (mode === "reposts") {
        return await loadSearchWorkspaceAuthorFeed(activeAuth, payload, true, notifyProgress);
      }
      if (shouldFallbackNetworkSearchToAuthorFeed(payload)) {
        return await loadSearchWorkspaceAuthorFeed(activeAuth, payload, false, notifyProgress);
      }
      if (!hasSearchWorkspaceServerQuery(payload)) {
        throw new Error("Die Netzwerk-Suche auf Bluesky braucht einen Suchtext oder Hashtag. Ohne Suchtext kann Threadline nur einen einzelnen Account lokal durchsuchen.");
      }
      return await loadSearchWorkspaceSearchPosts(activeAuth, payload, notifyProgress);
    } finally {
      if (runId) {
        searchRunControls.delete(runId);
      }
    }
  }
  /** Sets cancellation state for one run, including signals received during authentication.
   * @param {object} command - Run control command.
   * @param {string} command.runId - Target run identifier.
   * @param {string} command.action - Cancel or return to running.
   * @returns {{ok: boolean, state?: string}} Accepted control state.
   */
  function setSearchRunControl({
    runId,
    action
  } = {}) {
    if (!runId || !searchRunControls.has(runId)) {
      return {
        ok: false
      };
    }
    const current = searchRunControls.get(runId);
    if (action === "cancel") {
      current.state = "cancelled";
    } else {
      current.state = "running";
    }
    searchRunControls.set(runId, current);
    return {
      ok: true,
      state: current.state
    };
  }
  return Object.freeze({
    load: loadSearchResults,
    control: setSearchRunControl
  });
};
