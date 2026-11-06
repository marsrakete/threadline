/** Creates worker analysis loading, authenticated list collection and private profile enrichment cache.
 * @param {object} options - Models, session/storage, transport/base, handle/profile/graph adapters, error factory, limits, messages and clock.
 * @returns {object} Frozen check/load/auth/graph/lists/profiles/top API.
 */
globalThis.createThreadlineAnalysisService = function createThreadlineAnalysisService(options) {
  for (const name of ["session", "readAuth", "request", "base", "resolve", "profile", "graphPage", "error", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Analysis service requires " + name);
    }
  }
  for (const name of ["storedAccount", "facets", "quoteDid", "media", "top", "reply", "quote", "createScanState", "scanPage"]) {
    if (typeof options.models?.[name] !== "function") {
      throw new TypeError("Analysis service requires model " + name);
    }
  }
  for (const name of ["feedPageSize", "feedMaxPages", "graphPageLimit", "graphMaxProfiles", "profileBatchSize"]) {
    if (!Number.isInteger(options.limits?.[name]) || options.limits[name] < 1) {
      throw new TypeError("Analysis service requires positive limit " + name);
    }
  }
  const scanModels = options.models, now = options.now;
  const { session: ensureSession, readAuth: readStoredAuth, request: bskyGet, base: authXrpcBase, resolve: resolveHandleToDid,
    profile: normalizeNetworkProfile, graphPage: collectGraphPage, error: createServiceWorkerError, messages } = options;
  const { storedAccount: getAnalysisStoredAccountByActor, top: buildAnalysisTopListFromMap } = options.models;
  const { feedPageSize: ANALYSIS_AUTHOR_FEED_PAGE_SIZE, feedMaxPages: ANALYSIS_AUTHOR_FEED_MAX_PAGES,
    graphPageLimit: ANALYSIS_GRAPH_PAGE_LIMIT, graphMaxProfiles: ANALYSIS_GRAPH_MAX_PROFILES, profileBatchSize: ANALYSIS_PROFILE_RESOLVE_BATCH_SIZE } = options.limits;
  const analysisProfileCache = new Map();
  /** Returns an existing array or a fresh empty one. @param {unknown} value - Input. @returns {Array} Safe array. */
  function safeArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Formats existing messages with literal placeholder values.
   * @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message.
   */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }
  /** Collects graph pages up to the existing profile cap, preserving page overshoot.
   * @param {object} auth - Account. @param {string} endpoint - Graph method. @param {string} actorDid - Source DID. @param {string} source - Profile category. @param {Function} notifyProgress - Observer. @param {string} title - Progress title. @param {string} stepPrefix - Progress step. @param {number} percent - Progress percent.
   * @returns {Promise<Array>} All collected normalized graph profiles.
   */
  async function collectEntireGraph(auth, endpoint, actorDid, source, notifyProgress, title, stepPrefix, percent) {
    const collected = [];
    let nextCursor = "";
    let pages = 0;
    do {
      const page = await collectGraphPage(auth, endpoint, actorDid, nextCursor, ANALYSIS_GRAPH_PAGE_LIMIT, source);
      collected.push(...page.profiles);
      nextCursor = page.cursor;
      pages += 1;
      notifyProgress({
        title,
        step: stepPrefix,
        percent,
        detail: text("graphPage", { count: collected.length, pages }),
      });
    } while (nextCursor && collected.length < ANALYSIS_GRAPH_MAX_PROFILES);
    return collected;
  }

  /** Uses a matching stored account session or the caller fallback.
   * @param {string} actor - Actor identifier. @param {object|null} fallbackAuth - Fallback account.
   * @returns {Promise<object|null>} Matching session or original fallback.
   */
  async function getAnalysisAuthForActor(actor = "", fallbackAuth = null) {
    const state = await readStoredAuth();
    const matched = getAnalysisStoredAccountByActor(state, actor);
    if (matched?.did) {
      return ensureSession(matched.did);
    }
    return fallbackAuth;
  }

  /** Reads authenticated mute/block profile lists with their existing cursor and cap rules.
   * @param {object} auth - Account. @param {string} endpoint - List method. @param {string} fieldName - Response field/source.
   * @returns {Promise<Array|null>} Normalized profiles or null without a token.
   */
  async function collectAuthListProfiles(auth, endpoint, fieldName) {
    if (!auth?.session?.accessJwt) {
      return null;
    }
    const collected = [];
    let cursor = "";
    do {
      const response = await bskyGet(endpoint, {
        limit: ANALYSIS_GRAPH_PAGE_LIMIT,
        cursor: cursor || undefined,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });
      const entries = safeArray(response?.[fieldName]);
      collected.push(...entries
        .map((profile) => normalizeNetworkProfile(profile, fieldName))
        .filter((profile) => profile.did));
      cursor = String(response?.cursor || "").trim();
    } while (cursor && collected.length < ANALYSIS_GRAPH_MAX_PROFILES);
    return collected;
  }

  /** Resolves uncached DID profiles in bounded batches; tolerates failed batches.
   * @param {object} auth - Account. @param {Array} actors - DID candidates.
   * @returns {Promise<Map>} Resolved profiles; cache persists within this service.
   */
  async function resolveAnalysisProfiles(auth, actors = []) {
    const normalizedActors = [...new Set((safeArray(actors))
      .map((value) => String(value || "").trim())
      .filter((value) => value.startsWith("did:")))];
    if (!normalizedActors.length || !auth?.session?.accessJwt) {
      return new Map();
    }

    const resolved = new Map();
    const pending = normalizedActors.filter((actor) => {
      const cached = analysisProfileCache.get(actor);
      if (cached) {
        resolved.set(actor, cached);
        return false;
      }
      return true;
    });

    for (let index = 0; index < pending.length; index += ANALYSIS_PROFILE_RESOLVE_BATCH_SIZE) {
      const batch = pending.slice(index, index + ANALYSIS_PROFILE_RESOLVE_BATCH_SIZE);
      try {
        const response = await bskyGet("app.bsky.actor.getProfiles", {
          actors: batch,
        }, {
          headers: {
            authorization: `Bearer ${auth.session.accessJwt}`,
          },
          base: authXrpcBase(auth),
        });
        const profiles = safeArray(response?.profiles);
        profiles.forEach((profile) => {
          const normalized = normalizeNetworkProfile(profile, "analysis");
          if (!normalized.did) {
            return;
          }
          analysisProfileCache.set(normalized.did, normalized);
          resolved.set(normalized.did, normalized);
        });
      } catch {
        // Leave unresolved actors as plain DIDs.
      }
    }

    return resolved;
  }

  /** Optionally enriches ranked markers and labels unresolved entries as deleted.
   * @param {Map} frequencyMap - Counts. @param {number} total - Denominator. @param {object} auth - Account. @param {number} limit - Rank limit. @param {boolean} resolveActors - Enables profile enrichment.
   * @returns {Promise<Array>} Ranked marker entries.
   */
  async function buildAnalysisResolvedTopList(frequencyMap, total, auth, limit = 10, resolveActors = false) {
    const entries = buildAnalysisTopListFromMap(frequencyMap, total, limit);
    if (!resolveActors) {
      return entries;
    }
    const resolvedProfiles = await resolveAnalysisProfiles(
      auth,
      entries.map((entry) => entry.label),
    );
    return entries.map((entry) => {
      const profile = resolvedProfiles.get(entry.label);
      if (!profile) {
        return {
          ...entry,
          deleted: true,
        };
      }
      return {
        ...entry,
        identifier: profile.did,
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        label: profile.handle || profile.displayName || profile.did,
      };
    });
  }

  /** Loads an account corpus, network lists and enriched analysis markers.
   * @param {object} input - Actor/options. @param {Function} notifyProgress - Progress observer.
   * @returns {Promise<object>} Existing profile/filter/stats/network/markers/posts result; fatal errors propagate.
   */
  async function loadAnalysisAccount({ actor = "", options = {} } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const requestedActor = String(actor || "").trim().replace(/^@+/, "") || auth.session.did;
    const limit = Math.max(100, Math.min(2000, Number(options.limit) || 500));
    const rangeDays = Math.max(0, Number(options.rangeDays) || 0);
    const includeReplies = options.includeReplies === true;
    const includeQuotes = options.includeQuotes === true;
    let minTimestamp = 0;
    if (rangeDays > 0) {
      minTimestamp = now() - (rangeDays * 24 * 60 * 60 * 1000);
    }
    const headers = {
      authorization: `Bearer ${auth.session.accessJwt}`,
    };
    const resolveCache = new Map();
    let profileActor = requestedActor;

    if (!String(requestedActor).startsWith("did:")) {
      notifyProgress({
        title: messages.title,
        step: messages.check,
        percent: 4,
        detail: requestedActor,
      });
      const resolvedDid = await resolveHandleToDid(requestedActor, auth, resolveCache);
      if (!resolvedDid) {
        throw new Error(text("notFound", { actor: requestedActor }));
      }
      profileActor = resolvedDid;
    }

    notifyProgress({
      title: messages.title,
      step: messages.profile,
      percent: 8,
      detail: requestedActor,
    });

    let profile;
    try {
      profile = await bskyGet("app.bsky.actor.getProfile", {
        actor: profileActor,
      }, {
        headers,
        base: authXrpcBase(auth),
      });
    } catch (error) {
      const message = String(error?.message || "").trim();
      if (/not found|recordnotfound|profil.*nicht/i.test(message)) {
        throw new Error(text("notFound", { actor: requestedActor }));
      }
      throw error;
    }

    const scan = scanModels.createScanState();
    let cursor = "";
    let pages = 0;
    let scannedPosts = 0;

    while (scan.posts.length < limit && pages < ANALYSIS_AUTHOR_FEED_MAX_PAGES && !scan.reachedOlderPosts) {
      const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
        actor: profile.did || requestedActor,
        limit: ANALYSIS_AUTHOR_FEED_PAGE_SIZE,
        cursor: cursor || undefined,
      }, {
        headers,
        base: authXrpcBase(auth),
      });

      const feedItems = safeArray(response?.feed);
      pages += 1;
      scannedPosts += feedItems.length;
      const oldestSeenOnPage = scanModels.scanPage(scan, feedItems, {
        actorDid: profile.did || requestedActor, minTimestamp, includeReplies, includeQuotes, limit,
      });

      notifyProgress({
        title: messages.title,
        step: messages.posts,
        percent: Math.min(92, 14 + Math.round((scan.posts.length / Math.max(limit, 1)) * 70)),
        detail: text("page", { count: scan.posts.length, pages }),
      });

      cursor = String(response?.cursor || "").trim();
      if (!cursor || !feedItems.length) {
        break;
      }
      if (scan.reachedOlderPosts && oldestSeenOnPage) {
        break;
      }
    }

    notifyProgress({
      title: messages.title,
      step: messages.network,
      percent: 94,
      detail: profile.handle || requestedActor,
    });

    const graphAuth = await getAnalysisAuthForActor(profile.did || requestedActor, auth);
    const networkWarnings = [];
    let networkLoadState = "complete";
    const [followerResult, followResult] = await Promise.allSettled([
      collectEntireGraph(graphAuth, "app.bsky.graph.getFollowers", profile.did || requestedActor, "followers", notifyProgress, messages.title, messages.followers, 95),
      collectEntireGraph(graphAuth, "app.bsky.graph.getFollows", profile.did || requestedActor, "following", notifyProgress, messages.title, messages.following, 96),
    ]);
    let followers = [], follows = [];
    if (followerResult.status === "fulfilled") {
      followers = followerResult.value;
    }
    if (followResult.status === "fulfilled") {
      follows = followResult.value;
    }
    if (followerResult.status !== "fulfilled") {
      networkWarnings.push(text("followerFailed", { error: String(followerResult.reason?.message || followerResult.reason || "").trim() || messages.unknown }));
    }
    if (followResult.status !== "fulfilled") {
      networkWarnings.push(text("followFailed", { error: String(followResult.reason?.message || followResult.reason || "").trim() || messages.unknown }));
    }
    if (networkWarnings.length) {
      networkLoadState = "failed";
      if (followers.length || follows.length) {
        networkLoadState = "partial";
      }
      notifyProgress({
        title: messages.title,
        step: messages.incomplete,
        percent: 96,
        detail: networkWarnings[0],
      });
    }

    let mutes = null;
    let blocks = null;
    let muteBlockSource = "unavailable";
    try {
      const actorSpecificAuth = await getAnalysisAuthForActor(profile.did || requestedActor, null);
      if (actorSpecificAuth?.session?.did === profile.did) {
        const [loadedMutes, loadedBlocks] = await Promise.all([
          collectAuthListProfiles(actorSpecificAuth, "app.bsky.graph.getMutes", "mutes"),
          collectAuthListProfiles(actorSpecificAuth, "app.bsky.graph.getBlocks", "blocks"),
        ]);
        mutes = safeArray(loadedMutes);
        blocks = safeArray(loadedBlocks);
        muteBlockSource = "saved_account";
      }
    } catch {
      muteBlockSource = "unavailable";
    }

    const followerDidSet = new Set(followers.map((entry) => entry.did).filter(Boolean));
    const followDidSet = new Set(follows.map((entry) => entry.did).filter(Boolean));
    const mutualDids = Array.from(followerDidSet).filter((did) => followDidSet.has(did));
    const totalLoadedPosts = Math.max(scan.posts.length, 1);

    return {
      profile: {
        did: String(profile?.did || "").trim(),
        handle: String(profile?.handle || requestedActor).trim(),
        displayName: String(profile?.displayName || profile?.handle || requestedActor).trim(),
        avatar: String(profile?.avatar || "").trim(),
        postsCount: Number(profile?.postsCount) || 0,
        followersCount: Number(profile?.followersCount) || 0,
        followsCount: Number(profile?.followsCount) || 0,
      },
      filters: {
        limit,
        rangeDays,
        includeReplies,
        includeQuotes,
      },
      stats: {
        fetchedPosts: scan.posts.length,
        scannedPosts,
        pages,
        newestPostAt: scan.newestPostAt,
        oldestPostAt: scan.oldestPostAt,
      },
      network: {
        followers,
        follows,
        mutualDids,
        followerDids: Array.from(followerDidSet),
        followDids: Array.from(followDidSet),
        mutes,
        blocks,
        muteBlockSource,
        loadState: networkLoadState,
        warnings: networkWarnings,
      },
      markers: {
        topMentions: await buildAnalysisResolvedTopList(scan.mentionFrequency, totalLoadedPosts, graphAuth, 12, true),
        topHashtags: buildAnalysisTopListFromMap(scan.hashtagFrequency, totalLoadedPosts, 12),
        topDomains: buildAnalysisTopListFromMap(scan.domainFrequency, totalLoadedPosts, 12),
        topReplyTargets: await buildAnalysisResolvedTopList(scan.replyTargetFrequency, totalLoadedPosts, graphAuth, 12, true),
        topQuoteTargets: await buildAnalysisResolvedTopList(scan.quoteTargetFrequency, totalLoadedPosts, graphAuth, 12, true),
        topLanguages: buildAnalysisTopListFromMap(scan.languageFrequency, totalLoadedPosts, 6),
        mediaPostShare: scan.mediaPostCount / totalLoadedPosts,
        textOnlyPostShare: scan.textOnlyPostCount / totalLoadedPosts,
      },
      posts: scan.posts,
    };
  }

  /** Validates an actor and resolves its public profile with existing error codes.
   * @param {object} input - Actor to check.
   * @returns {Promise<object>} Normalized public profile; expected and transport failures keep service codes.
   */
  async function checkAnalysisAccount({ actor = "" } = {}) {
    const auth = await ensureSession();
    const requestedActor = String(actor || "").trim().replace(/^@+/, "");
    if (!requestedActor) {
      throw createServiceWorkerError(messages.missing, "ANALYSIS_ACCOUNT_MISSING");
    }

    const headers = {
      authorization: `Bearer ${auth.session.accessJwt}`,
    };
    const resolveCache = new Map();
    let profileActor = requestedActor;

    if (!requestedActor.startsWith("did:")) {
      const resolvedDid = await resolveHandleToDid(requestedActor, auth, resolveCache);
      if (!resolvedDid) {
        throw createServiceWorkerError(text("notFound", { actor: requestedActor }), "ANALYSIS_ACCOUNT_NOT_FOUND", {
          actor: requestedActor,
        });
      }
      profileActor = resolvedDid;
    }

    try {
      const profile = await bskyGet("app.bsky.actor.getProfile", {
        actor: profileActor,
      }, {
        headers,
        base: authXrpcBase(auth),
      });
      return {
        did: String(profile?.did || "").trim(),
        handle: String(profile?.handle || requestedActor).trim(),
        displayName: String(profile?.displayName || profile?.handle || requestedActor).trim(),
        avatar: String(profile?.avatar || "").trim(),
      };
    } catch (error) {
      const message = String(error?.message || "").trim();
      if (/not found|recordnotfound|profil.*nicht/i.test(message)) {
        throw createServiceWorkerError(text("notFound", { actor: requestedActor }), "ANALYSIS_ACCOUNT_NOT_FOUND", {
          actor: requestedActor,
        });
      }
      throw createServiceWorkerError(message || messages.checkFailed, "ANALYSIS_ACCOUNT_CHECK_FAILED", {
        actor: requestedActor,
      });
    }
  }
  return Object.freeze({ check: checkAnalysisAccount, load: loadAnalysisAccount, auth: getAnalysisAuthForActor, graph: collectEntireGraph, lists: collectAuthListProfiles, profiles: resolveAnalysisProfiles, top: buildAnalysisResolvedTopList });
};
