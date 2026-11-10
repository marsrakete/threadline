/** Creates authenticated reply-target and repository edit-metadata checks.
 * @param {object} options - Auth, URL/identity, transport, thread/record models and error adapters.
 * @returns {object} Frozen reply/edit API.
 */
globalThis.createThreadlinePostCheckService = function createThreadlinePostCheckService(options) {
  for (const name of ["session", "source", "resolve", "request", "base", "root", "thread", "collect", "pds", "xrpc", "error"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Post checks require " + name); }
  }
  for (const name of ["mode", "eligibility"]) {
    if (typeof options.models?.[name] !== "function") { throw new TypeError("Post checks require model " + name); }
  }
  const { session: ensureSession, source: parseArchiveThreadSource, resolve: resolveHandleToDid, request: bskyGet,
    base: authXrpcBase, root: getArchiveRootUri, thread: archiveGetPostThread, collect: collectThreadViewPosts,
    pds: resolvePdsForDid, xrpc: xrpcBaseForService, error: createServiceWorkerError,
    defaultService: DEFAULT_LOGIN_SERVICE, messages } = options;
  const { mode: normalizeReplyTargetMode, eligibility: evaluateReplyEligibility } = options.models;
  /** Checks existing checkReplyTarget metadata without writing records. @param {object} input - Post URL and optional mode. @returns {Promise<object>} Target/edit metadata. */
  async function checkReplyTarget({ url, mode } = {}) {
    const auth = await ensureSession();
    const parsedSource = parseArchiveThreadSource(url);
    const resolveCache = new Map();
    let actorDid = parsedSource.actor;
    if (!actorDid.startsWith("did:")) { actorDid = await resolveHandleToDid(parsedSource.actor, auth, resolveCache); }

    if (!actorDid) {
      throw new Error(messages.replyActorMissing);
    }

    const entryUri = parsedSource.entryUri || `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
    let entryResponse;
    try {
      entryResponse = await bskyGet("app.bsky.feed.getPosts", {
        uris: [entryUri],
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });
    } catch (error) {
      throw new Error(error?.message || messages.replyPostLoad);
    }

    let entryPost = null;
    if (Array.isArray(entryResponse?.posts)) { entryPost = entryResponse.posts[0]; }
    if (!entryPost?.uri) {
      throw new Error(messages.replyPostMissing);
    }

    const entryRecord = entryPost.record || {};
    const rootUri = getArchiveRootUri(entryRecord, entryPost.uri) || entryPost.uri;
    let threadResponse;
    try {
      threadResponse = await archiveGetPostThread(auth, rootUri, {
        depth: 100,
        parentHeight: 0,
        retries: 1,
        timeoutMs: 20000,
      });
    } catch (error) {
      throw new Error(error?.message || messages.replyThreadLoad);
    }

    const threadRoot = threadResponse.thread || threadResponse.post || threadResponse;
    const threadViews = collectThreadViewPosts(threadRoot);
    const rootPost = threadViews.find((post) => post?.uri === rootUri) || entryPost;
    const resolvedEntryPost = threadViews.find((post) => post?.uri === entryPost.uri) || entryPost;
    const normalizedMode = normalizeReplyTargetMode(mode);
    const ownPosts = threadViews
      .filter((post) => post?.author?.did === auth.session.did)
      .sort((left, right) => Date.parse(right?.record?.createdAt || 0) - Date.parse(left?.record?.createdAt || 0));

    if (normalizedMode === "thread" && ownPosts.length === 0) {
      throw new Error(messages.replyOwnPostMissing);
    }

    let replyParentPost = resolvedEntryPost;
    if (normalizedMode === "thread") { replyParentPost = ownPosts[0]; }
    const eligibility = evaluateReplyEligibility(replyParentPost, auth.session.did);
    if (eligibility.status === "blocked") {
      throw new Error(eligibility.hint);
    }

    let lastOwnPost = null;
    if (ownPosts[0]) {
      lastOwnPost = { uri: ownPosts[0].uri, cid: String(ownPosts[0].cid || ""), text: String(ownPosts[0].record?.text || ""), createdAt: String(ownPosts[0].record?.createdAt || "") };
    }
    return {
      mode: normalizedMode,
      sourceUrl: parsedSource.sourceUrl,
      threadLength: Math.max(1, threadViews.length || 1),
      replyHint: eligibility.hint,
      replyRoot: {
        uri: rootPost.uri,
        cid: String(rootPost.cid || ""),
      },
      replyParent: {
        uri: replyParentPost.uri,
        cid: String(replyParentPost.cid || ""),
      },
      targetPost: {
        uri: resolvedEntryPost.uri,
        cid: String(resolvedEntryPost.cid || ""),
        text: String(resolvedEntryPost.record?.text || ""),
        createdAt: String(resolvedEntryPost.record?.createdAt || ""),
      },
      rootPost: {
        uri: rootPost.uri,
        cid: String(rootPost.cid || ""),
        text: String(rootPost.record?.text || ""),
        createdAt: String(rootPost.record?.createdAt || ""),
      },
      targetAccount: {
        did: String(resolvedEntryPost.author?.did || ""),
        handle: String(resolvedEntryPost.author?.handle || ""),
        displayName: String(resolvedEntryPost.author?.displayName || resolvedEntryPost.author?.handle || ""),
        avatar: String(resolvedEntryPost.author?.avatar || ""),
      },
      rootAccount: {
        did: String(rootPost.author?.did || ""),
        handle: String(rootPost.author?.handle || ""),
        displayName: String(rootPost.author?.displayName || rootPost.author?.handle || ""),
        avatar: String(rootPost.author?.avatar || ""),
      },
      lastOwnPost,
    };
  }

  /** Checks existing checkPostEditMetadata metadata without writing records. @param {object} input - Post URL and optional mode. @returns {Promise<object>} Target/edit metadata. */
  async function checkPostEditMetadata({ url } = {}) {
    const auth = await ensureSession();
    let parsedSource;
    try {
      parsedSource = parseArchiveThreadSource(url);
    } catch {
      throw createServiceWorkerError(
        messages.editUrlInvalid,
        "POST_EDIT_URL_INVALID",
      );
    }

    const resolveCache = new Map();
    let actorDid = parsedSource.actor;
    if (!actorDid.startsWith("did:")) { actorDid = await resolveHandleToDid(parsedSource.actor, auth, resolveCache); }
    if (!actorDid) {
      throw createServiceWorkerError(
        messages.editActorMissing,
        "POST_EDIT_ACTOR_NOT_FOUND",
      );
    }

    const serviceUrl = await resolvePdsForDid(
      actorDid,
      auth.pdsUrl || auth.service || DEFAULT_LOGIN_SERVICE,
      new Map(),
    );

    let recordResponse;
    try {
      recordResponse = await bskyGet("com.atproto.repo.getRecord", {
        repo: actorDid,
        collection: "app.bsky.feed.post",
        rkey: parsedSource.rkey,
      }, {
        base: xrpcBaseForService(serviceUrl),
      });
    } catch (error) {
      throw createServiceWorkerError(
        error?.message || messages.editRecordLoad,
        "POST_EDIT_RECORD_LOAD_FAILED",
      );
    }

    const record = recordResponse?.value;
    if (!record || record.$type !== "app.bsky.feed.post") {
      throw createServiceWorkerError(
        messages.editRecordInvalid,
        "POST_EDIT_RECORD_INVALID",
      );
    }

    let originalText = "";
    if (typeof record.originalText === "string") { originalText = record.originalText; }
    let updatedAt = "";
    if (typeof record.updatedAt === "string") { updatedAt = record.updatedAt; }
    return {
      uri: `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`,
      cid: String(recordResponse?.cid || ""),
      actorDid,
      sourceUrl: parsedSource.sourceUrl,
      text: String(record.text || ""),
      originalText,
      createdAt: String(record.createdAt || ""),
      updatedAt,
      isEdited: typeof record.originalText === "string" && typeof record.updatedAt === "string",
    };
  }

  return Object.freeze({ reply: checkReplyTarget, edit: checkPostEditMetadata });
};
