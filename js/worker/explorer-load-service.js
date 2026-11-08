/** Creates authenticated Explorer source/feed/actor/thread loading and URL resolution.
 * @param {object} options - Session/refresh, request/base, handle/URL/graph/error adapters and feed/post models.
 * @returns {object} Frozen sources/actorFeed/feed/resolve/thread API.
 */
globalThis.createThreadlineExplorerLoadService = function createThreadlineExplorerLoadService(options) {
  for (const name of ["session", "refresh", "request", "base", "resolve", "parseSource", "graphPage", "error"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Explorer load service requires " + name); }
  }
  for (const name of ["pinned", "relationship", "endpoint", "profileSource", "profileMatch", "sort", "mode", "match", "search"]) {
    if (typeof options.feedModels?.[name] !== "function") { throw new TypeError("Explorer load service requires feed model " + name); }
  }
  for (const name of ["post", "root", "merge", "count"]) {
    if (typeof options.postModels?.[name] !== "function") { throw new TypeError("Explorer load service requires post model " + name); }
  }
  const { session: ensureSession, refresh: refreshAuthReference, request: bskyGet, base: authXrpcBase,
    resolve: resolveHandleToDid, parseSource: parseArchiveThreadSource, graphPage: collectGraphPage,
    error: createServiceWorkerError, messages } = options;
  const { post: normalizeThreadExplorerPost, root: normalizeThreadExplorerThreadRoot,
    merge: mergeThreadExplorerSelectedPath, count: countThreadExplorerTreePosts } = options.postModels;
  const { pinned: extractThreadExplorerPinnedFeedSources, relationship: isThreadExplorerRelationshipSource,
    endpoint: getThreadExplorerRelationshipEndpoint, profileSource: getThreadExplorerRelationshipProfileSource,
    profileMatch: isThreadExplorerRelationshipProfileMatch, sort: sortThreadExplorerFeedItemsChronologically,
    mode: normalizeThreadExplorerActorFeedMode, match: isThreadExplorerActorFeedPostMatch,
    search: buildThreadExplorerSearchPostsParams } = options.feedModels;
  /**
   * Loads a Thread Explorer thread view from Bluesky.
   * @param {object} auth - Active account auth reference.
   * @param {string} uri - AT URI to load.
   * @param {number} parentHeight - Number of parent levels to request.
   * @returns {Promise<object>} Raw getPostThread response.
   */
  async function fetchThreadExplorerThreadView(auth, uri, parentHeight) {
    return bskyGet("app.bsky.feed.getPostThread", {
      uri,
      depth: 100,
      parentHeight,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });
  }

  /**
   * Keeps only feed items whose post URI is still resolvable through getPosts.
   * @param {object} auth - Active account auth reference.
   * @param {object[]} items - Normalized feed items from getTimeline.
   * @returns {Promise<object[]>} Feed items whose posts still exist.
   */
  async function filterExistingThreadExplorerFeedItems(auth, items = []) {
    const validItems = [];
    const seenUris = new Set();
    const uris = [];

    items.forEach((item) => {
      const uri = String(item?.post?.uri || "").trim();
      if (!uri || seenUris.has(uri)) {
        return;
      }
      seenUris.add(uri);
      uris.push(uri);
    });

    for (let index = 0; index < uris.length; index += 25) {
      const batch = uris.slice(index, index + 25);
      const response = await bskyGet("app.bsky.feed.getPosts", {
        uris: batch,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });

      const existingUris = new Set();
      if (Array.isArray(response?.posts)) {
        response.posts.forEach((post) => {
          const uri = String(post?.uri || "").trim();
          if (uri) {
            existingUris.add(uri);
          }
        });
      }

      items.forEach((item) => {
        const uri = String(item?.post?.uri || "").trim();
        if (!batch.includes(uri)) {
          return;
        }
        if (!existingUris.has(uri)) {
          return;
        }
        validItems.push(item);
      });
    }

    return validItems;
  }

  /**
   * Adds display metadata from app.bsky.feed.getFeedGenerator to pinned feed sources.
   * @param {object} auth - Active account auth reference.
   * @param {Array<object>} feeds - Feed sources from actor preferences.
   * @returns {Promise<Array<object>>} Feed sources with display names where available.
   */
  async function enrichThreadExplorerFeedSources(auth, feeds = []) {
    const enriched = [];
    for (const feed of feeds.slice(0, 25)) {
      try {
        const response = await bskyGet("app.bsky.feed.getFeedGenerator", {
          feed: feed.uri,
        }, {
          headers: {
            authorization: `Bearer ${auth.session.accessJwt}`,
          },
          base: authXrpcBase(auth),
        });
        const displayName = String(response?.view?.displayName || feed.displayName || "").trim();
        enriched.push({
          ...feed,
          displayName,
        });
      } catch {
        enriched.push(feed);
      }
    }
    return enriched;
  }

  /**
   * Loads the active account's pinned feed generator sources.
   * @returns {Promise<object>} Pinned feed sources.
   */
  async function loadThreadExplorerFeedSources() {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const response = await bskyGet("app.bsky.actor.getPreferences", {}, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });

    const feeds = extractThreadExplorerPinnedFeedSources(response?.preferences || []);
    const enrichedFeeds = await enrichThreadExplorerFeedSources(activeAuth, feeds);
    return {
      feeds: enrichedFeeds,
    };
  }

  /**
   * Loads the latest visible author post for a Thread Explorer relationship profile.
   * @param {object} auth - Active account auth reference.
   * @param {object} profile - Normalized graph profile.
   * @returns {Promise<object|null>} Normalized Thread Explorer feed item or null.
   */
  async function loadThreadExplorerLatestProfilePost(auth, profile = {}) {
    const actorDid = String(profile?.did || "").trim();
    if (!actorDid) {
      return null;
    }

    const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
      actor: actorDid,
      limit: 12,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    let feed = [];
    if (Array.isArray(response?.feed)) {
      feed = response.feed;
    }
    for (const entry of feed) {
      const rawPost = entry?.post || null;
      if (!rawPost?.uri) {
        continue;
      }
      if (String(rawPost?.author?.did || "").trim() !== actorDid) {
        continue;
      }
      const post = normalizeThreadExplorerPost(rawPost);
      if (!post) {
        continue;
      }
      post.author.followingViewer = profile.followingViewer === true || post.author.followingViewer === true;
      post.author.followedByViewer = profile.followedByViewer === true || post.author.followedByViewer === true;
      return {
        post,
        reason: {
          source: "relationship",
        },
      };
    }

    return null;
  }

  /**
   * Loads latest posts from graph relationship profiles with limited concurrency.
   * @param {object} auth - Active account auth reference.
   * @param {object[]} profiles - Normalized graph profiles.
   * @returns {Promise<object[]>} Feed items with latest author posts.
   */
  async function loadThreadExplorerRelationshipPosts(auth, profiles = []) {
    const items = [];
    const batchSize = 8;
    for (let index = 0; index < profiles.length; index += batchSize) {
      const batch = profiles.slice(index, index + batchSize);
      const results = await Promise.all(batch.map((profile) => {
        return loadThreadExplorerLatestProfilePost(auth, profile).catch(() => {
          return null;
        });
      }));
      results.forEach((item) => {
        if (item?.post?.uri) {
          items.push(item);
        }
      });
    }
    return items;
  }

  /**
   * Loads latest posts for one Thread Explorer relationship group.
   * @param {object} auth - Active account auth reference.
   * @param {string} source - Relationship source name.
   * @param {string} cursor - Graph cursor for pagination.
   * @param {number} limit - Desired number of profiles to inspect.
   * @returns {Promise<object>} Relationship feed items and next graph cursor.
   */
  async function loadThreadExplorerRelationshipFeed(auth, source, cursor, limit) {
    const endpoint = getThreadExplorerRelationshipEndpoint(source);
    const profileSource = getThreadExplorerRelationshipProfileSource(source);
    const actorDid = String(auth?.session?.did || "").trim();
    if (!actorDid) {
      throw new Error(messages.explorerRelationshipMissing);
    }
    const response = await collectGraphPage(auth, endpoint, actorDid, cursor, limit, profileSource);
    const profiles = response.profiles.filter((profile) => {
      return isThreadExplorerRelationshipProfileMatch(profile, source);
    });
    const items = await loadThreadExplorerRelationshipPosts(auth, profiles);
    return {
      items: sortThreadExplorerFeedItemsChronologically(items),
      cursor: response.cursor,
    };
  }

  /**
   * Loads posts and replies from one account for the Thread Explorer Actor-Fokus.
   * @param {object} payload - Actor, mode, cursor and limit from the UI.
   * @returns {Promise<object>} Actor feed items and next cursor.
   */
  async function loadThreadExplorerActorFeed(payload = {}) {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const requestedActor = String(payload?.actor || "").trim().replace(/^@+/, "");
    if (!requestedActor) {
      throw createServiceWorkerError(messages.explorerAccountMissing, "THREAD_EXPLORER_ACCOUNT_MISSING");
    }
    const headers = {
      authorization: `Bearer ${activeAuth.session.accessJwt}`,
    };
    const resolveCache = new Map();
    let actor = requestedActor;
    if (!requestedActor.startsWith("did:")) {
      const resolvedDid = await resolveHandleToDid(requestedActor, activeAuth, resolveCache);
      if (!resolvedDid) {
        throw createServiceWorkerError(messages.explorerAccountNotFound.replace("{actor}", () => requestedActor), "THREAD_EXPLORER_ACCOUNT_NOT_FOUND", {
          actor: requestedActor,
        });
      }
      actor = resolvedDid;
    }

    const mode = normalizeThreadExplorerActorFeedMode(payload?.mode);
    const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 30));
    const targetCount = Math.min(50, Math.max(10, limit));
    const items = [];
    const seenUris = new Set();
    let cursor = String(payload?.cursor || "").trim();
    let nextCursor = "";
    let pageCount = 0;

    while (items.length < targetCount && pageCount < 5) {
      const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
        actor,
        limit,
        cursor: cursor || undefined,
      }, {
        headers,
        base: authXrpcBase(activeAuth),
      });

      let feed = [];
      if (Array.isArray(response?.feed)) {
        feed = response.feed;
      }

      for (const entry of feed) {
        const post = normalizeThreadExplorerPost(entry?.post || {});
        if (!post) {
          continue;
        }
        if (!isThreadExplorerActorFeedPostMatch(post, mode)) {
          continue;
        }
        if (seenUris.has(post.uri)) {
          continue;
        }
        seenUris.add(post.uri);
        items.push({
          post,
          reason: entry?.reason || null,
        });
        if (items.length >= targetCount) {
          break;
        }
      }

      nextCursor = String(response?.cursor || "").trim();
      cursor = nextCursor;
      pageCount += 1;
      if (!nextCursor || feed.length === 0) {
        break;
      }
    }

    const existingItems = await filterExistingThreadExplorerFeedItems(activeAuth, items);
    return {
      items: sortThreadExplorerFeedItemsChronologically(existingItems).slice(0, targetCount),
      cursor: nextCursor,
      mode,
    };
  }

  /**
   * Loads a live timeline slice for the Thread Explorer.
   * @param {object} payload - Source, limit, and cursor values from the app.
   * @returns {Promise<object>} Feed items, next cursor, and source metadata.
   */
  async function loadThreadExplorerFeed(payload = {}) {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const source = String(payload?.source || "follows").trim();
    let feedUri = "";
    if (source.startsWith("feed:")) { feedUri = source.slice(5).trim(); }
    const isSearchSource = source.startsWith("search:");
    const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 50));
    const targetCount = Math.min(50, Math.max(10, limit));
    const items = [];
    let cursor = String(payload?.cursor || "").trim();
    let nextCursor = "";
    let pageCount = 0;
    const seenThreadRoots = new Set();

    if (isThreadExplorerRelationshipSource(source)) {
      const relationshipResult = await loadThreadExplorerRelationshipFeed(activeAuth, source, cursor, limit);
      const existingRelationshipItems = await filterExistingThreadExplorerFeedItems(activeAuth, relationshipResult.items);
      return {
        source,
        items: sortThreadExplorerFeedItemsChronologically(existingRelationshipItems).slice(0, targetCount),
        cursor: relationshipResult.cursor,
      };
    }

    while (items.length < targetCount && pageCount < 4) {
      let endpoint = "app.bsky.feed.getTimeline";
      const params = {
        limit,
        cursor,
      };
      if (isSearchSource) {
        endpoint = "app.bsky.feed.searchPosts";
        Object.assign(params, buildThreadExplorerSearchPostsParams(payload?.search || {}));
      } else if (feedUri) {
        endpoint = "app.bsky.feed.getFeed";
        params.feed = feedUri;
      }

      const response = await bskyGet(endpoint, params, {
        headers: {
          authorization: `Bearer ${activeAuth.session.accessJwt}`,
        },
        base: authXrpcBase(activeAuth),
      });

      let feed = [];
      if (isSearchSource && Array.isArray(response?.posts)) {
        feed = response.posts.map((post) => ({ post }));
      } else if (Array.isArray(response?.feed)) {
        feed = response.feed;
      }
      feed.forEach((entry) => {
        const post = normalizeThreadExplorerPost(entry?.post || {});
        if (!post) {
          return;
        }
        if (isSearchSource) {
          const rootKey = String(post.rootUri || post.uri || "").trim();
          if (rootKey && seenThreadRoots.has(rootKey)) {
            return;
          }
          if (rootKey) {
            seenThreadRoots.add(rootKey);
          }
        }
        if (source === "mutuals") {
          if (!post.author.followingViewer || !post.author.followedByViewer) {
            return;
          }
        }
        items.push({
          post,
          reason: entry?.reason || null,
        });
      });

      nextCursor = String(response?.cursor || "").trim();
      cursor = nextCursor;
      pageCount += 1;
      if (!nextCursor || feed.length === 0) {
        break;
      }
    }

    const existingItems = await filterExistingThreadExplorerFeedItems(activeAuth, items);
    return {
      source,
      items: sortThreadExplorerFeedItemsChronologically(existingItems).slice(0, targetCount),
      cursor: nextCursor,
    };
  }

  /**
   * Resolves a bsky, mu.social, or at:// post URL into an AT URI for Thread Explorer.
   * @param {object} payload - Contains the post URL.
   * @returns {Promise<object>} Resolved post URI and original source URL.
   */
  async function resolveThreadExplorerPostUrl(payload = {}) {
    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const parsedSource = parseArchiveThreadSource(payload?.url);
    const resolveCache = new Map();
    let actorDid = parsedSource.actor;

    if (!actorDid.startsWith("did:")) {
      actorDid = await resolveHandleToDid(parsedSource.actor, activeAuth, resolveCache);
    }

    if (!actorDid) {
      throw new Error(messages.explorerUrlAccountMissing);
    }

    let uri = parsedSource.entryUri;
    if (!uri) {
      uri = `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
    }

    return {
      uri,
      sourceUrl: parsedSource.sourceUrl,
    };
  }

  /**
   * Loads a live thread for the Thread Explorer.
   * @param {object} payload - Contains the selected post URI.
   * @returns {Promise<object>} Normalized thread tree and post count.
   */
  async function loadThreadExplorerThread(payload = {}) {
    const uri = String(payload?.uri || "").trim();
    if (!uri) {
      throw new Error(messages.explorerThreadMissing);
    }

    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const selectedResponse = await fetchThreadExplorerThreadView(activeAuth, uri, 100);
    let root = normalizeThreadExplorerThreadRoot(selectedResponse?.thread || {});
    const rootUri = String(root?.post?.uri || "").trim();
    const rootIsDeletedAnchor = root?.post?.isDeletedThreadAnchor === true;

    if (rootUri && rootUri !== uri && !rootIsDeletedAnchor) {
      const rootResponse = await fetchThreadExplorerThreadView(activeAuth, rootUri, 0);
      const fullRoot = normalizeThreadExplorerThreadRoot(rootResponse?.thread || {});
      if (fullRoot) {
        root = mergeThreadExplorerSelectedPath(fullRoot, root, uri);
      }
    }

    return {
      selectedUri: uri,
      root,
      postCount: countThreadExplorerTreePosts(root),
    };
  }

  return Object.freeze({ sources: loadThreadExplorerFeedSources, actorFeed: loadThreadExplorerActorFeed, feed: loadThreadExplorerFeed, resolve: resolveThreadExplorerPostUrl, thread: loadThreadExplorerThread });
};
