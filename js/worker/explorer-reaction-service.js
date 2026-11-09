/** Creates Explorer reaction actor loading with existing endpoint/deduplication rules.
 * @param {object} options - Session/refresh, request/base, actor normalization and messages.
 * @returns {object} Frozen load API.
 */
globalThis.createThreadlineExplorerReactionService = function createThreadlineExplorerReactionService(options) {
  for (const name of ["session", "refresh", "request", "base", "actor"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Explorer reactions require " + name); }
  }
  const { session: ensureSession, refresh: refreshAuthReference, request: bskyGet,
    base: authXrpcBase, actor: normalizeThreadExplorerActor, messages } = options;
  /**
   * Normalizes actor entries returned by interaction endpoints.
   * @param {object} actor - Actor profile object.
   * @returns {object|null} Compact actor entry, or null.
   */
  function normalizeThreadExplorerReactionActor(actor = {}) {
    const normalized = normalizeThreadExplorerActor(actor);
    if (!normalized.did && !normalized.handle) {
      return null;
    }
    return normalized;
  }

  /**
   * Loads accounts related to a post interaction for Thread Explorer popups.
   * @param {object} payload - Reaction type, post URI, optional CID, and limit.
   * @returns {Promise<object>} Actor entries and optional cursor.
   */
  async function loadThreadExplorerReactions(payload = {}) {
    const type = String(payload?.type || "").trim().toLowerCase();
    const uri = String(payload?.uri || "").trim();
    const cid = String(payload?.cid || "").trim();
    const limit = Math.min(100, Math.max(1, Number(payload?.limit) || 100));
    if (!uri) {
      throw new Error(messages.explorerPostMissing);
    }

    const auth = await ensureSession();
    const activeAuth = await refreshAuthReference(auth);
    const requestOptions = {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    };
    const params = {
      uri,
      limit,
    };
    if (cid) {
      params.cid = cid;
    }

    let response = null;
    let rawActors = [];
    if (type === "likes") {
      response = await bskyGet("app.bsky.feed.getLikes", params, requestOptions);
      if (Array.isArray(response?.likes)) {
        rawActors = response.likes.map((entry) => entry?.actor);
      }
    } else if (type === "reposts") {
      response = await bskyGet("app.bsky.feed.getRepostedBy", params, requestOptions);
      if (Array.isArray(response?.repostedBy)) {
        rawActors = response.repostedBy;
      }
    } else if (type === "quotes") {
      response = await bskyGet("app.bsky.feed.getQuotes", params, requestOptions);
      if (Array.isArray(response?.posts)) {
        rawActors = response.posts.map((post) => post?.author);
      }
    } else {
      throw new Error(messages.explorerReactionUnknown);
    }

    const seen = new Set();
    const actors = [];
    rawActors.forEach((actor) => {
      const normalizedActor = normalizeThreadExplorerReactionActor(actor);
      if (!normalizedActor) {
        return;
      }
      const key = normalizedActor.did || normalizedActor.handle;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      actors.push(normalizedActor);
    });

    return {
      type,
      actors,
      cursor: String(response?.cursor || "").trim(),
    };
  }

  return Object.freeze({ load: loadThreadExplorerReactions });
};
