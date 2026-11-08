/** Creates interaction gates, record deletion, likes and unlike workflows.
 * @param {object} options - Session/request/base, settings/rule/URI adapters, clock and messages.
 * @returns {object} Frozen gates/remove/like/unlike API.
 */
globalThis.createThreadlineInteractionService = function createThreadlineInteractionService(options) {
  for (const name of ["session", "request", "base", "settings", "rkey", "rules", "parseUri", "now"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Interaction service requires " + name); }
  }
  const { session: ensureSession, request: bskyFetch, base: xrpcBaseForService, settings: normalizePostInteractionSettings,
    rkey: extractRecordKeyFromAtUri, rules: buildThreadGateAllowRules, parseUri: parseAtUriParts, now, messages } = options;
  /** Writes existing thread/post gates in sequence. @param {object} auth - Active account. @param {object} postRef - Created post. @param {object} settings - Interaction settings. @returns {Promise<object|null|undefined>} Latest rate-limit metadata. */
  async function applyPostInteractionGates(auth, postRef, settings) {
    const normalizedSettings = normalizePostInteractionSettings(settings);
    const recordKey = extractRecordKeyFromAtUri(postRef?.uri);
    if (!recordKey) {
      return;
    }

    const base = xrpcBaseForService(auth.pdsUrl || auth.service);
    const headers = {
      authorization: `Bearer ${auth.session.accessJwt}`,
    };
    const threadGateAllow = buildThreadGateAllowRules(normalizedSettings);
    let latestRateLimit = null;

    if (threadGateAllow !== null) {
      const result = await bskyFetch("com.atproto.repo.createRecord", {
        method: "POST",
        headers,
        base,
        returnMeta: true,
        body: JSON.stringify({
          repo: auth.session.did,
          collection: "app.bsky.feed.threadgate",
          rkey: recordKey,
          record: {
            $type: "app.bsky.feed.threadgate",
            createdAt: now(),
            post: postRef.uri,
            allow: threadGateAllow,
          },
        }),
      });
      latestRateLimit = result.meta?.rateLimit || latestRateLimit;
    }

    if (!normalizedSettings.quotePostsAllowed) {
      const result = await bskyFetch("com.atproto.repo.createRecord", {
        method: "POST",
        headers,
        base,
        returnMeta: true,
        body: JSON.stringify({
          repo: auth.session.did,
          collection: "app.bsky.feed.postgate",
          rkey: recordKey,
          record: {
            $type: "app.bsky.feed.postgate",
            createdAt: now(),
            post: postRef.uri,
            embeddingRules: [
              { $type: "app.bsky.feed.postgate#disableRule" },
            ],
          },
        }),
      });
      latestRateLimit = result.meta?.rateLimit || latestRateLimit;
    }

    return latestRateLimit;
  }

  /**
   * Deletes one AT Protocol record through `com.atproto.repo.deleteRecord`.
   * @param {object} auth - Active authenticated account.
   * @param {string} recordUri - Full AT URI of the record that should be removed.
   * @returns {Promise<void>} Resolves after the record was deleted.
   */
  async function deleteRepoRecord(auth, recordUri) {
    const parsed = parseAtUriParts(recordUri);
    if (!parsed) {
      throw new Error(messages.interactionUriInvalid);
    }

    await bskyFetch("com.atproto.repo.deleteRecord", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: xrpcBaseForService(auth.pdsUrl || auth.service),
      body: JSON.stringify({
        repo: parsed.repo,
        collection: parsed.collection,
        rkey: parsed.rkey,
      }),
    });
  }

  /**
   * Creates one like record for a post on behalf of the active account.
   * @param {object} payload - Request payload from the UI.
   * @param {string} payload.uri - AT URI of the liked post.
   * @param {string} payload.cid - CID of the liked post.
   * @returns {Promise<object>} Created like record reference.
   */
  async function likePost(payload = {}) {
    const postUri = String(payload.uri || "").trim();
    const postCid = String(payload.cid || "").trim();
    if (!postUri || !postCid) {
      throw new Error(messages.likeSubjectMissing);
    }

    const auth = await ensureSession();
    const result = await bskyFetch("com.atproto.repo.createRecord", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: xrpcBaseForService(auth.pdsUrl || auth.service),
      body: JSON.stringify({
        repo: auth.session.did,
        collection: "app.bsky.feed.like",
        record: {
          $type: "app.bsky.feed.like",
          createdAt: now(),
          subject: {
            uri: postUri,
            cid: postCid,
          },
        },
      }),
    });

    return {
      uri: String(result?.uri || "").trim(),
      cid: String(result?.cid || "").trim(),
    };
  }

  /**
   * Removes one existing like record for the active account.
   * @param {object} payload - Request payload from the UI.
   * @param {string} payload.likeUri - AT URI of the existing like record.
   * @returns {Promise<object>} Removed like record reference.
   */
  async function unlikePost(payload = {}) {
    const likeUri = String(payload.likeUri || "").trim();
    if (!likeUri) {
      throw new Error(messages.unlikeUriMissing);
    }

    const auth = await ensureSession();
    await deleteRepoRecord(auth, likeUri);
    return {
      uri: likeUri,
    };
  }

  return Object.freeze({ gates: applyPostInteractionGates, remove: deleteRepoRecord, like: likePost, unlike: unlikePost });
};
