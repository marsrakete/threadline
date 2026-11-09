/** Creates network workspace orchestration with explicit session, data and profile adapters.
 * @param {object} options - Session, request/base, normalization, graph/sampling/date adapters, limits and messages.
 * @returns {object} Frozen merge/slice/focus/mutuals API.
 */
globalThis.createThreadlineNetworkWorkspaceService = function createThreadlineNetworkWorkspaceService(options) {
  for (const name of ["session", "request", "base", "profile", "wave", "page", "graph", "dates", "activity", "likes"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Network workspace service requires " + name); }
  }
  for (const name of ["activitySample", "likeSample"]) {
    if (!Number.isInteger(options.limits?.[name]) || options.limits[name] < 1) { throw new TypeError("Network workspace service requires positive " + name); }
  }
  const { session: ensureSession, request: bskyGet, base: authXrpcBase, profile: normalizeNetworkProfile,
    wave: collectGraphWave, page: collectGraphPage, graph: collectEntireGraph, dates: loadNetworkRelationshipDates,
    activity: collectNetworkActivityForActor, likes: collectNetworkLikeStats, messages } = options;
  const { activitySample: NETWORK_ACTIVITY_SAMPLE_POSTS, likeSample: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT } = options.limits;
  /** Inserts literal values into existing progress copy. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values) { return messages[key].replace(/\{(\w+)\}/g, (match, name) => String(values[name])); }
  /** Merges profile metadata with existing nonempty counts and relationship flags. @param {object|null} existing - Previous profile. @param {object} incoming - Incoming profile. @returns {object} Result with existing worker response shape. */
  function mergeNormalizedNetworkProfile(existing, incoming) {
    if (!existing) {
      return {
        ...incoming,
        followingViewer: incoming.followingViewer === true,
        followedByViewer: incoming.followedByViewer === true,
      };
    }
    return {
      ...existing,
      ...incoming,
      did: incoming.did || existing.did || "",
      handle: incoming.handle || existing.handle || "",
      displayName: incoming.displayName || existing.displayName || incoming.handle || existing.handle || "",
      avatar: incoming.avatar || existing.avatar || "",
      description: incoming.description || existing.description || "",
      followersCount: Number(incoming.followersCount) || Number(existing.followersCount) || 0,
      followsCount: Number(incoming.followsCount) || Number(existing.followsCount) || 0,
      postsCount: Number(incoming.postsCount) || Number(existing.postsCount) || 0,
      followingViewer: existing.followingViewer === true || incoming.followingViewer === true,
      followedByViewer: existing.followedByViewer === true || incoming.followedByViewer === true,
    };
  }


  /** Loads follower/following waves with a tolerated viewer-profile failure. @param {object} input - Actor/cursors/limit or center/focus actors. @param {Function} notifyProgress - Progress observer. @returns {Promise<object>} Result with existing worker response shape. */
  async function loadNetworkSlice({ actor = "", followerCursor = "", followCursor = "", limit = 500 } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const targetSize = Math.max(100, Math.min(500, Number(limit) || 500));
    const requestedActor = String(actor || "").trim() || auth.session.did;

    notifyProgress({
      title: messages.loading,
      step: messages.networkProfileLoading,
      percent: 8,
      detail: "",
    });
    const viewerProfilePromise = bskyGet("app.bsky.actor.getProfile", {
      actor: requestedActor,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    }).catch(() => null);

    let followerLabel = messages.networkFollowersFirst;
    if (followerCursor) { followerLabel = messages.networkFollowersNext; }
    let followLabel = messages.networkFollowingFirst;
    if (followCursor) { followLabel = messages.networkFollowingNext; }
    const followerResponse = await collectGraphWave(
      auth,
      "app.bsky.graph.getFollowers",
      requestedActor,
      followerCursor,
      targetSize,
      "followers",
      notifyProgress,
      followerLabel,
    );

    const followsResponse = await collectGraphWave(
      auth,
      "app.bsky.graph.getFollows",
      requestedActor,
      followCursor,
      targetSize,
      "following",
      notifyProgress,
      followLabel,
    );

    const viewerProfile = await viewerProfilePromise;
    const followers = followerResponse.profiles;
    const follows = followsResponse.profiles;

    notifyProgress({
      title: messages.loading,
      step: messages.networkPreparing,
      percent: 86,
      detail: text("networkConnections", { followers: followers.length, follows: follows.length }),
    });

    let viewer = {
      did: requestedActor,
      handle: auth.handle || auth.session.handle || "",
      displayName: auth.handle || auth.session.handle || "",
      avatar: auth.avatar || "", description: "", followersCount: 0, followsCount: 0, postsCount: 0,
      followingViewer: true, followedByViewer: true,
    };
    if (viewerProfile) {
      let relationship = {};
      if (requestedActor === auth.session.did) { relationship = { following: true, followedBy: true }; }
      viewer = normalizeNetworkProfile({ ...viewerProfile, viewer: relationship }, "viewer");
    }
    return {
      viewer,
      followers,
      follows,
      followerCursor: String(followerResponse.cursor || ""),
      followCursor: String(followsResponse.cursor || ""),
      hasMoreFollowers: Boolean(followerResponse.cursor),
      hasMoreFollows: Boolean(followsResponse.cursor),
      wave: {
        followers: followers.length,
        follows: follows.length,
      },
    };
  }

  /** Loads profile, relationship dates, previews and activity/like samples in order. @param {object} input - Actor/cursors/limit or center/focus actors. @param {Function} notifyProgress - Progress observer. @returns {Promise<object>} Result with existing worker response shape. */
  async function loadNetworkActorFocus({ actor } = {}, notifyProgress = () => {}) {
    const actorDid = String(actor || "").trim();
    if (!actorDid) {
      throw new Error(messages.networkFocusMissing);
    }

    const auth = await ensureSession();
    const headers = {
      authorization: `Bearer ${auth.session.accessJwt}`,
    };

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkProfileUpdating,
      percent: 16,
      detail: actorDid,
    });
    const profile = await bskyGet("app.bsky.actor.getProfile", {
      actor: actorDid,
    }, { headers, base: authXrpcBase(auth) });
    let viewer = {};
    if (profile?.viewer && typeof profile.viewer === "object") { viewer = profile.viewer; }

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkRelationshipChecking,
      percent: 32,
      detail: actorDid,
    });
    const relationshipDates = await loadNetworkRelationshipDates(auth, viewer);

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkFollowersPreview,
      percent: 48,
      detail: actorDid,
    });
    const followerPage = await collectGraphPage(auth, "app.bsky.graph.getFollowers", actorDid, "", 12, "followers");

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkFollowingPreview,
      percent: 78,
      detail: actorDid,
    });
    const followPage = await collectGraphPage(auth, "app.bsky.graph.getFollows", actorDid, "", 12, "following");

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkActivityLoading,
      percent: 86,
      detail: text("networkActivitySample", { count: NETWORK_ACTIVITY_SAMPLE_POSTS }),
    });
    const activityStats = await collectNetworkActivityForActor(auth, actorDid);

    notifyProgress({
      title: messages.networkFocusLoading,
      step: messages.networkLikesLoading,
      percent: 90,
      detail: text("networkLikeSample", { count: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT }),
    });
    const likeStats = await collectNetworkLikeStats(auth, actorDid);

    return {
      profile: normalizeNetworkProfile(profile, ""),
      relationshipDates,
      activityStats,
      likeStats,
      followersPreview: followerPage.profiles,
      followsPreview: followPage.profiles,
    };
  }

  /** Intersects the four complete graph collections in center-follower order. @param {object} input - Actor/cursors/limit or center/focus actors. @param {Function} notifyProgress - Progress observer. @returns {Promise<object>} Result with existing worker response shape. */
  async function loadNetworkCommonMutuals({ centerActor, focusActor } = {}, notifyProgress = () => {}) {
    const centerDid = String(centerActor || "").trim();
    const focusDid = String(focusActor || "").trim();
    if (!centerDid || !focusDid || centerDid === focusDid) {
      return {
        commonDids: [],
        commonProfiles: [],
      };
    }

    const auth = await ensureSession();
    notifyProgress({
      title: messages.networkMutualsLoading,
      step: messages.networkCenterMutualsLoading,
      percent: 6,
      detail: "",
    });
    const centerFollowers = await collectEntireGraph(
      auth,
      "app.bsky.graph.getFollowers",
      centerDid,
      "followers",
      notifyProgress,
      messages.networkMutualsLoading,
      messages.networkCenterFollowersLoading,
      18,
    );
    const centerFollows = await collectEntireGraph(
      auth,
      "app.bsky.graph.getFollows",
      centerDid,
      "following",
      notifyProgress,
      messages.networkMutualsLoading,
      messages.networkCenterFollowingLoading,
      36,
    );

    notifyProgress({
      title: messages.networkMutualsLoading,
      step: messages.networkFocusFollowersLoading,
      percent: 54,
      detail: text("networkCenterCount", { count: centerFollowers.length + centerFollows.length }),
    });
    const focusFollowers = await collectEntireGraph(
      auth,
      "app.bsky.graph.getFollowers",
      focusDid,
      "followers",
      notifyProgress,
      messages.networkMutualsLoading,
      messages.networkFocusFollowersLoading,
      54,
    );
    const focusFollows = await collectEntireGraph(
      auth,
      "app.bsky.graph.getFollows",
      focusDid,
      "following",
      notifyProgress,
      messages.networkMutualsLoading,
      messages.networkFocusFollowingLoading,
      72,
    );

    const centerFollowerMap = new Map();
    centerFollowers.forEach((profile) => {
      if (profile?.did) {
        centerFollowerMap.set(profile.did, mergeNormalizedNetworkProfile(centerFollowerMap.get(profile.did) || null, profile));
      }
    });
    const centerFollowMap = new Map();
    centerFollows.forEach((profile) => {
      if (profile?.did) {
        centerFollowMap.set(profile.did, mergeNormalizedNetworkProfile(centerFollowMap.get(profile.did) || null, profile));
      }
    });
    const centerMutualDids = [...centerFollowerMap.keys()].filter((did) => centerFollowMap.has(did));
    const focusFollowerSet = new Set(
      focusFollowers.map((profile) => String(profile?.did || "").trim()).filter(Boolean),
    );
    const focusFollowSet = new Set(
      focusFollows.map((profile) => String(profile?.did || "").trim()).filter(Boolean),
    );
    const commonDids = centerMutualDids.filter((did) => focusFollowerSet.has(did) && focusFollowSet.has(did));
    const commonProfiles = commonDids
      .map((did) => mergeNormalizedNetworkProfile(centerFollowerMap.get(did) || null, centerFollowMap.get(did) || null))
      .filter((profile) => profile?.did);

    notifyProgress({
      title: messages.networkMutualsLoading,
      step: messages.networkIntersection,
      percent: 92,
      detail: text("networkMutualCount", { count: commonDids.length }),
    });

    return {
      commonDids,
      commonProfiles,
    };
  }


  return Object.freeze({ merge: mergeNormalizedNetworkProfile, slice: loadNetworkSlice, focus: loadNetworkActorFocus, mutuals: loadNetworkCommonMutuals });
};
