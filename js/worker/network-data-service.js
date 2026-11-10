/** Creates shared network sampling, graph paging and relationship-date operations.
 * @param {object} options - Request/base, profile/URI models, clock, limits and messages.
 * @returns {object} Frozen posts/likesOnPosts/activityStats/likes/activity/page/wave/recordDate/dates API.
 */
globalThis.createThreadlineNetworkDataService = function createThreadlineNetworkDataService(options) {
  for (const name of ["request", "base", "profile", "parseUri", "now"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Network data service requires " + name); }
  }
  for (const name of ["likeSample", "activitySample"]) {
    if (!Number.isInteger(options.limits?.[name]) || options.limits[name] < 1) { throw new TypeError("Network data service requires positive " + name); }
  }
  if (!Array.isArray(options.windows) || !options.windows.length || options.windows.some(days => !Number.isFinite(days) || days <= 0)) {
    throw new TypeError("Network data service requires positive windows");
  }
  const { request: bskyGet, base: authXrpcBase, profile: normalizeNetworkProfile, parseUri: parseAtUri, now, messages } = options;
  const { likeSample: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT, activitySample: NETWORK_ACTIVITY_SAMPLE_POSTS } = options.limits;
  const NETWORK_ACTIVITY_WINDOWS_DAYS = [...options.windows];
  /** Formats progress without interpreting inserted values. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values) { return messages[key].replace(/\{(\w+)\}/g, (match, name) => String(values[name])); }
  /** Collects actor-owned recent posts with existing cursor and sample limits. @param {unknown} auth - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @param {unknown} limit - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function collectRecentAuthorPosts(auth, actorDid, limit = NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT) {
    const collected = [];
    let cursor = "";

    while (collected.length < limit) {
      const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
        actor: actorDid,
        limit: Math.min(100, limit - collected.length),
        cursor: cursor || undefined,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });

      let feedItems = [];
      if (Array.isArray(response?.feed)) { feedItems = response.feed; }
      for (const item of feedItems) {
        const post = item?.post || null;
        if (!post?.uri || post.author?.did !== actorDid) {
          continue;
        }
        collected.push({
          uri: post.uri,
          cid: post.cid || "",
          createdAt: String(post.record?.createdAt || post.indexedAt || "").trim(),
          viewerLike: String(post.viewer?.like || "").trim(),
          likeCount: Number(post.likeCount) || 0,
        });
        if (collected.length >= limit) {
          break;
        }
      }

      cursor = String(response?.cursor || "");
      if (!cursor || !feedItems.length) {
        break;
      }
    }

    return collected;
  }

  /** Counts distinct liked sample posts from at most eight notification pages. @param {unknown} auth - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @param {unknown} posts - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function countRecentLikesFromActorOnPosts(auth, actorDid, posts = []) {
    if (!actorDid || !posts.length) {
      return 0;
    }

    const targetUris = new Set(posts.map((post) => post.uri).filter(Boolean));
    const oldestCreatedAt = posts
      .map((post) => Date.parse(post.createdAt || ""))
      .filter((value) => Number.isFinite(value))
      .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
    const matched = new Set();
    let cursor = "";
    let pageCount = 0;

    while (pageCount < 8 && matched.size < targetUris.size) {
      const response = await bskyGet("app.bsky.notification.listNotifications", {
        limit: 100,
        cursor: cursor || undefined,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });

      let notifications = [];
      if (Array.isArray(response?.notifications)) { notifications = response.notifications; }
      pageCount += 1;
      let stopForAge = false;

      for (const notification of notifications) {
        const indexedAt = Date.parse(String(notification?.indexedAt || "").trim());
        if (Number.isFinite(oldestCreatedAt) && Number.isFinite(indexedAt) && indexedAt < oldestCreatedAt) {
          stopForAge = true;
        }
        if (notification?.reason !== "like" || notification?.author?.did !== actorDid) {
          continue;
        }
        const subjectUri = String(notification?.reasonSubject || "").trim();
        if (targetUris.has(subjectUri)) {
          matched.add(subjectUri);
        }
      }

      cursor = String(response?.cursor || "");
      if (!cursor || !notifications.length || stopForAge) {
        break;
      }
    }

    return matched.size;
  }

  /** Calculates inclusive activity windows and the latest valid timestamp. @param {unknown} posts - Existing worker operation argument. @param {unknown} nowTimestamp - Existing worker operation argument. @returns {object} Operation result. */
  function collectNetworkActivityStats(posts = [], nowTimestamp = now()) {
    const windows = {};
    NETWORK_ACTIVITY_WINDOWS_DAYS.forEach((days) => {
      windows[days] = {
        postsCount: 0,
        likesReceivedCount: 0,
      };
    });

    let latestPostAt = "";
    let latestPostTimestamp = Number.NEGATIVE_INFINITY;

    posts.forEach((post) => {
      const createdAt = String(post?.createdAt || "").trim();
      const createdTimestamp = Date.parse(createdAt);
      if (!Number.isFinite(createdTimestamp)) {
        return;
      }

      if (createdTimestamp > latestPostTimestamp) {
        latestPostTimestamp = createdTimestamp;
        latestPostAt = createdAt;
      }

      NETWORK_ACTIVITY_WINDOWS_DAYS.forEach((days) => {
        const windowMs = days * 24 * 60 * 60 * 1000;
        if ((nowTimestamp - createdTimestamp) <= windowMs) {
          windows[days].postsCount += 1;
          windows[days].likesReceivedCount += Number(post?.likeCount) || 0;
        }
      });
    });

    return {
      samplePosts: posts.length,
      latestPostAt,
      windows,
    };
  }

  /** Loads both account samples and their reciprocal like counts. @param {unknown} auth - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function collectNetworkLikeStats(auth, actorDid) {
    const [actorPosts, ownPosts] = await Promise.all([
      collectRecentAuthorPosts(auth, actorDid, NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT),
      collectRecentAuthorPosts(auth, auth.session.did, NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT),
    ]);

    const youLikeCount = actorPosts.filter((post) => Boolean(post.viewerLike)).length;
    const likesYouCount = await countRecentLikesFromActorOnPosts(auth, actorDid, ownPosts);

    return {
      samplePerAccount: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT,
      totalSample: actorPosts.length + ownPosts.length,
      actorPostsSampled: actorPosts.length,
      ownPostsSampled: ownPosts.length,
      youLikeCount,
      likesYouCount,
      mutualLikesCount: youLikeCount + likesYouCount,
    };
  }

  /** Loads the activity sample and computes its windows. @param {unknown} auth - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function collectNetworkActivityForActor(auth, actorDid) {
    const actorPosts = await collectRecentAuthorPosts(auth, actorDid, NETWORK_ACTIVITY_SAMPLE_POSTS);
    return collectNetworkActivityStats(actorPosts);
  }

  /** Loads and normalizes one follower or following page. @param {unknown} auth - Existing worker operation argument. @param {unknown} endpoint - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @param {unknown} cursor - Existing worker operation argument. @param {unknown} limit - Existing worker operation argument. @param {unknown} source - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function collectGraphPage(auth, endpoint, actorDid, cursor, limit, source) {
    const response = await bskyGet(endpoint, {
      actor: actorDid,
      limit,
      cursor: cursor || undefined,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });
    let fieldName = "follows";
    if (endpoint.endsWith("Followers")) { fieldName = "followers"; }
    let profiles = [];
    if (Array.isArray(response?.[fieldName])) {
      profiles = response[fieldName].map((profile) => normalizeNetworkProfile(profile, source)).filter((profile) => profile.did);
    }
    return {
      profiles,
      cursor: String(response?.cursor || ""),
    };
  }

  /** Collects graph pages and reports progress after each page. @param {unknown} auth - Existing worker operation argument. @param {unknown} endpoint - Existing worker operation argument. @param {unknown} actorDid - Existing worker operation argument. @param {unknown} cursor - Existing worker operation argument. @param {unknown} targetTotal - Existing worker operation argument. @param {unknown} source - Existing worker operation argument. @param {unknown} notifyProgress - Existing worker operation argument. @param {unknown} progressLabel - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function collectGraphWave(auth, endpoint, actorDid, cursor, targetTotal, source, notifyProgress, progressLabel) {
    const maxPage = 100;
    const collected = [];
    let nextCursor = String(cursor || "");
    let pages = 0;

    do {
      const remaining = Math.max(1, targetTotal - collected.length);
      const page = await collectGraphPage(auth, endpoint, actorDid, nextCursor, Math.min(maxPage, remaining), source);
      collected.push(...page.profiles);
      nextCursor = page.cursor;
      pages += 1;
      let percent = 68;
      if (endpoint.endsWith("Followers")) { percent = 30; }
      notifyProgress({
        title: messages.loading,
        step: progressLabel,
        percent,
        detail: text("waveDetail", { count: collected.length, total: targetTotal, pages }),
      });
    } while (nextCursor && collected.length < targetTotal);

    return {
      profiles: collected,
      cursor: nextCursor,
    };
  }

  /** Reads a relationship record date without adding a base override. @param {unknown} auth - Existing worker operation argument. @param {unknown} recordUri - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function getRelationshipRecordCreatedAt(auth, recordUri) {
    const parsed = parseAtUri(recordUri);
    if (!parsed.did || !parsed.collection || !parsed.rkey) {
      return "";
    }

    const record = await bskyGet("com.atproto.repo.getRecord", {
      repo: parsed.did,
      collection: parsed.collection,
      rkey: parsed.rkey,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
    });

    return String(record?.value?.createdAt || "").trim();
  }

  /** Loads both available follow record dates concurrently. @param {unknown} auth - Existing worker operation argument. @param {unknown} viewer - Existing worker operation argument. @returns {Promise<unknown>} Operation result. */
  async function loadNetworkRelationshipDates(auth, viewer = {}) {
    let youFollowSincePromise = Promise.resolve("");
    if (typeof viewer.following === "string" && viewer.following.startsWith("at://")) {
      youFollowSincePromise = getRelationshipRecordCreatedAt(auth, String(viewer.following));
    }
    let followsYouSincePromise = Promise.resolve("");
    if (typeof viewer.followedBy === "string" && viewer.followedBy.startsWith("at://")) {
      followsYouSincePromise = getRelationshipRecordCreatedAt(auth, String(viewer.followedBy));
    }

    const [youFollowSince, followsYouSince] = await Promise.all([
      youFollowSincePromise,
      followsYouSincePromise,
    ]);

    return {
      youFollowSince,
      followsYouSince,
    };
  }

  return Object.freeze({ posts: collectRecentAuthorPosts, likesOnPosts: countRecentLikesFromActorOnPosts, activityStats: collectNetworkActivityStats, likes: collectNetworkLikeStats, activity: collectNetworkActivityForActor, page: collectGraphPage, wave: collectGraphWave, recordDate: getRelationshipRecordCreatedAt, dates: loadNetworkRelationshipDates });
};
