/** Creates thread-URL import collection, metadata and outcome operations with explicit dependencies.
 * @param {object} options - Session/source/transport, archive models/assets, run control, messages and export clock/version.
 * @returns {{load: Function, collect: Function, enrich: Function, result: Function}} Frozen import API.
 */
globalThis.createThreadlineArchiveImportService = function createThreadlineArchiveImportService(options) {
  for (const name of ["session", "parse", "resolve", "request", "base", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive import service requires " + name);
    }
  }
  for (const name of ["start", "finish", "wait"]) {
    if (typeof options.control?.[name] !== "function") {
      throw new TypeError("Archive import service requires control " + name);
    }
  }
  for (const [group, name] of [["threads", "root"], ["threads", "all"], ["threads", "path"], ["threads", "author"], ["posts", "build"]]) {
    if (typeof options.models?.[group]?.[name] !== "function") {
      throw new TypeError("Archive import service requires model " + group + "." + name);
    }
  }
  if (typeof options.assets?.attachThreadAssets !== "function") {
    throw new TypeError("Archive import service requires thread assets");
  }
  const { session: ensureSession, parse: parseArchiveThreadSource, resolve: resolveHandleToDid, request: bskyGet, base: authXrpcBase, messages, control: archiveRunControl } = options;
  const waitForArchiveRunControl = archiveRunControl.wait;
  const { root: getArchiveRootUri, all: collectThreadViewPosts, path: collectThreadPathPosts, author: collectThreadAuthorPosts } = options.models.threads;
  const { build: buildArchivePostEntity } = options.models.posts;
  /** Formats existing messages with literal values.
   * @param {string} key - Message key. @param {object} values - Placeholder values. @returns {string} Message.
   */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }

  /** Resolves a URL and collects its selected tree, path or author's posts.
   * @param {object} input - Auth, URL/mode, run identity and progress observer.
   * @returns {Promise<object>} Source/thread context or an early missing/cancelled result; provider errors retain existing behavior.
   */
  async function collect({ auth, url, importMode, runId, notifyProgress }) {
    const parsedSource = parseArchiveThreadSource(url);
    const resolveCache = new Map();
    let normalizedImportMode = "path";
    if (importMode === "tree" || importMode === "author") {
      normalizedImportMode = importMode;
    }
    let actorDid = parsedSource.actor;
    if (!actorDid.startsWith("did:")) {
      actorDid = await resolveHandleToDid(parsedSource.actor, auth, resolveCache);
    }

    if (!actorDid) {
      throw new Error(messages.importResolveError);
    }

    const entryUri = parsedSource.entryUri || `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
    archiveRunControl.start(runId);

    notifyProgress({
      title: messages.importTitle,
      step: messages.importCheck,
      percent: 5,
      detail: parsedSource.sourceUrl,
      checkpoint: messages.importCheckCheckpoint,
      state: "running",
    });
    let entryPost = null;
    let entryResponse = null;
    try {
      entryResponse = await bskyGet("app.bsky.feed.getPosts", {
        uris: [entryUri],
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });
      if (Array.isArray(entryResponse.posts)) {
        entryPost = entryResponse.posts[0];
      }
    } catch {
      entryPost = null;
    }
    if (!entryPost?.uri) {
      notifyProgress({
        title: messages.importTitle,
        step: messages.importMissing,
        percent: 100,
        detail: entryUri,
        checkpoint: messages.importMissing,
        state: "running",
      });
      archiveRunControl.finish(runId);
      return { earlyResult: result({ auth, parsedSource, entryUri, entryPost, normalizedImportMode }, "missing") };
    }

    const entryRecord = entryPost.record || {};
    const rootUri = getArchiveRootUri(entryRecord, entryPost.uri) || entryPost.uri;
    let entryMode = "root";
    if (rootUri && rootUri !== entryPost.uri) {
      entryMode = "reply";
    }
    let entryStep = messages.importRootStep;
    let entryCheckpoint = messages.importRootCheckpoint;
    let entryMeta = messages.importRootMeta;
    if (entryMode === "reply") {
      entryStep = messages.importReplyStep;
      if (normalizedImportMode === "tree") {
        entryStep = messages.importTreeStep;
      }
      entryCheckpoint = messages.importReplyCheckpoint;
      entryMeta = messages.importReplyMeta;
    }

    notifyProgress({
      title: messages.importTitle,
      step: entryStep,
      percent: 18,
      detail: entryPost.author?.handle || parsedSource.actor,
      checkpoint: entryCheckpoint,
      preview: {
        meta: entryMeta,
        text: String(entryRecord.text || "").slice(0, 220),
        metric: text("metricCounts", { likes: Number(entryPost.likeCount) || 0, replies: Number(entryPost.replyCount) || 0, reposts: Number(entryPost.repostCount) || 0, quotes: Number(entryPost.quoteCount) || 0 }),
      },
      state: "running",
    });

    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      archiveRunControl.finish(runId);
      return { earlyResult: result({ auth, parsedSource, entryUri, entryPost, normalizedImportMode, rootUri, entryMode }, "initial-cancelled") };
    }

    const threadResponse = await bskyGet("app.bsky.feed.getPostThread", {
      uri: rootUri,
      depth: 100,
      parentHeight: 0,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    const threadRoot = threadResponse.thread || threadResponse.post || threadResponse;
    let threadViews;
    if (normalizedImportMode === "tree") {
      threadViews = collectThreadViewPosts(threadRoot);
    } else if (normalizedImportMode === "author") {
      threadViews = collectThreadAuthorPosts(threadRoot, actorDid, []);
    } else {
      threadViews = [];
      collectThreadPathPosts(threadRoot, entryPost.uri, threadViews);
    }
    return { auth, parsedSource, actorDid, entryUri, entryPost, rootUri, entryMode, normalizedImportMode, threadViews };

  }
  /** Builds unique archive entities and raw-record maps, then orders by descending creation time.
   * @param {object} input - Thread views, root URI and progress observer.
   * @returns {object} Ordered posts and URI-keyed entity/raw maps; duplicate URI uses last view.
   */
  function enrich({ threadViews, rootUri, notifyProgress }) {
    const postsByUri = new Map();
    const rawRecordsByUri = new Map();
    notifyProgress({
      title: messages.importTitle,
      step: text("importFound", { count: threadViews.length }),
      percent: 38,
      detail: rootUri,
      checkpoint: text("importFoundCheckpoint", { count: threadViews.length }),
      state: "running",
    });

    threadViews.forEach((postView) => {
      const record = postView?.record || {};
      const post = buildArchivePostEntity({
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
      });
      postsByUri.set(post.uri, post);
      rawRecordsByUri.set(post.uri, record);
    });

    const orderedPosts = Array.from(postsByUri.values())
      .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

    return { postsByUri, rawRecordsByUri, orderedPosts };
  }
  /** Builds the existing stage-specific manifest/session without copying post or asset arrays.
   * @param {object} context - Source/auth, post/assets and counts.
   * @param {string} stage - missing, initial-cancelled or final. @param {string} status - Final completion state.
   * @returns {object} Existing import result; early cancellation intentionally has fewer manifest fields.
   */
  function result(context, stage = "final", status = "completed") {
    const { auth, parsedSource, entryUri, entryPost, rootUri, entryMode, normalizedImportMode, orderedPosts, assets, imageCount, skippedImageCount } = context;
    if (stage === "missing") {
      return {
        manifest: {
          schemaVersion: 1,
          exportedAt: options.now(),
          appVersion: options.appVersion,
          account: {
            handle: auth.session.handle,
            did: auth.session.did,
          },
          sourceType: "thread-url",
          threadImport: {
            sourceUrl: parsedSource.sourceUrl,
            entryUri,
            rootUri: entryUri,
            entryMode: "missing",
            importMode: normalizedImportMode,
            note: messages.importMissing,
          },
          postCount: 0,
          imageCount: 0,
          skippedImageCount: 0,
        },
        posts: [],
        assets: [],
        session: {
          waveIndex: 1,
          nextCursor: "",
          hasMore: false,
          exportedPosts: 0,
          exportedImages: 0,
          status: "completed",
        },
      };
    }
    if (stage === "initial-cancelled") {
      return {
        manifest: {
          schemaVersion: 1,
          exportedAt: options.now(),
          appVersion: options.appVersion,
          account: {
            handle: auth.session.handle,
            did: auth.session.did,
          },
          sourceType: "thread-url",
          threadImport: {
            sourceUrl: parsedSource.sourceUrl,
            entryUri: entryPost.uri,
            rootUri,
            entryMode,
            importMode: normalizedImportMode,
          },
        },
        posts: [],
        assets: [],
        session: {
          waveIndex: 1,
          nextCursor: "",
          hasMore: false,
          exportedPosts: 0,
          exportedImages: 0,
          status: "cancelled",
        },
      };
    }
    return {
    manifest: {
      schemaVersion: 1,
      exportedAt: options.now(),
      appVersion: options.appVersion,
      account: {
        handle: auth.session.handle,
        did: auth.session.did,
      },
      sourceType: "thread-url",
      threadImport: {
        sourceUrl: parsedSource.sourceUrl,
        entryUri: entryPost.uri,
        rootUri,
        entryMode,
        importMode: normalizedImportMode,
        authorHandle: entryPost.author?.handle || "",
        authorDisplayName: entryPost.author?.displayName || entryPost.author?.handle || "",
      },
      postCount: orderedPosts.length,
      imageCount,
      skippedImageCount,
    },
    posts: orderedPosts,
    assets,
    session: {
      waveIndex: 1,
      nextCursor: "",
      hasMore: false,
      exportedPosts: orderedPosts.length,
      exportedImages: imageCount,
      status,
    },
  };
  }
  /** Runs collection, metadata and sequential import assets with the established completion boundaries.
   * @param {object} input - Optional run ID, URL and import mode. @param {Function} notifyProgress - Observer.
   * @returns {Promise<object>} Existing import result; non-entry request/observer failures propagate.
   */
  async function load({ runId, url, importMode } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const source = await collect({ auth, url, importMode, runId, notifyProgress });
    if (source.earlyResult) {
      return source.earlyResult;
    }
    const metadata = enrich({ ...source, notifyProgress });
    const assets = [], seenAssetPaths = new Set(), pdsServiceCache = new Map(), archiveBlobCache = new Map();
    const counts = { imageCount: 0, skippedImageCount: 0 };
    const cancelled = await options.assets.attachThreadAssets({ ...source, ...metadata, assets, seenAssetPaths, pdsServiceCache, archiveBlobCache, runId, notifyProgress }, counts);
    archiveRunControl.finish(runId);
    let status = "completed";
    if (cancelled) {
      status = "cancelled";
    }
    return result({ ...source, ...metadata, assets, ...counts }, "final", status);
  }
  return Object.freeze({ load, collect, enrich, result });
};
