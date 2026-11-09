/** Creates pure feed source, relationship, ordering, actor-mode and search rules.
 * @param {object} options - Existing worker messages.
 * @returns {object} Frozen saved/pinned/relationship/endpoint/profileSource/profileMatch/timestamp/sort/mode/match/search API.
 */
globalThis.createThreadlineExplorerFeedModels = function createThreadlineExplorerFeedModels(options) {
  const { messages } = options;
  /**
   * Normalizes one saved feed preference entry for the Thread Explorer source picker.
   * @param {object} feed - Raw saved feed preference entry.
   * @returns {object|null} Feed source metadata, or null when invalid.
   */
  function normalizeThreadExplorerSavedFeed(feed = {}) {
    const uri = String(feed?.value || feed?.uri || feed?.feed || "").trim();
    if (!/^at:\/\/[^/]+\/app\.bsky\.feed\.generator\/[^/]+$/i.test(uri)) {
      return null;
    }

    return {
      uri,
      displayName: String(feed?.displayName || feed?.name || "").trim(),
      pinned: feed?.pinned === true,
    };
  }

  /**
   * Extracts pinned feed generator sources from actor preferences.
   * @param {Array<object>} preferences - Raw getPreferences preference entries.
   * @returns {Array<object>} Pinned feed generator sources.
   */
  function extractThreadExplorerPinnedFeedSources(preferences = []) {
    const seen = new Set();
    const feeds = [];
    if (!Array.isArray(preferences)) {
      return feeds;
    }

    preferences.forEach((preference) => {
      const type = String(preference?.$type || "");
      // Support both legacy "#savedFeedsPref" and current "#bskyAppStatePref" formats
      if (!(
        type.endsWith("#savedFeedsPref") ||
        type.endsWith("#bskyAppStatePref") ||
        Array.isArray(preference?.saved) ||
        Array.isArray(preference?.items)
      )) {
        return;
      }

      // Use saved array (legacy) or items array (current)
      let saved = [];
      if (Array.isArray(preference.saved)) { saved = preference.saved; }
      else if (Array.isArray(preference.items)) { saved = preference.items; }
      saved.forEach((entry) => {
        const feed = normalizeThreadExplorerSavedFeed(entry);
        if (!feed || !feed.pinned || seen.has(feed.uri)) {
          return;
        }
        seen.add(feed.uri);
        feeds.push(feed);
      });
    });

    return feeds;
  }

  /**
   * Checks whether a Thread Explorer source is a relationship source.
   * @param {string} source - Normalized Thread Explorer source.
   * @returns {boolean} True when the source is follows, followers, or mutuals.
   */
  function isThreadExplorerRelationshipSource(source) {
    return source === "follows" || source === "followers" || source === "mutuals";
  }

  /**
   * Returns the graph endpoint for a relationship source.
   * @param {string} source - Relationship source name.
   * @returns {string} XRPC endpoint name for the relationship graph page.
   */
  function getThreadExplorerRelationshipEndpoint(source) {
    if (source === "followers") {
      return "app.bsky.graph.getFollowers";
    }
    return "app.bsky.graph.getFollows";
  }

  /**
   * Returns the graph profile source flag for a relationship source.
   * @param {string} source - Relationship source name.
   * @returns {string} Graph profile source flag.
   */
  function getThreadExplorerRelationshipProfileSource(source) {
    if (source === "followers") {
      return "followers";
    }
    return "following";
  }

  /**
   * Checks whether a graph profile belongs to the requested Thread Explorer group.
   * @param {object} profile - Normalized graph profile.
   * @param {string} source - Relationship source name.
   * @returns {boolean} True when the profile should be included.
   */
  function isThreadExplorerRelationshipProfileMatch(profile = {}, source = "") {
    if (source === "mutuals") {
      return profile.followingViewer === true && profile.followedByViewer === true;
    }
    if (source === "followers") {
      return profile.followedByViewer === true;
    }
    return profile.followingViewer === true;
  }

  /**
   * Returns the timestamp used to sort Thread Explorer feed items.
   * @param {object} item - Thread Explorer feed item.
   * @returns {number} Epoch milliseconds or zero.
   */
  function getThreadExplorerFeedItemTimestamp(item = {}) {
    const createdAt = Date.parse(String(item?.post?.createdAt || "").trim());
    if (Number.isFinite(createdAt)) {
      return createdAt;
    }

    const indexedAt = Date.parse(String(item?.post?.indexedAt || "").trim());
    if (Number.isFinite(indexedAt)) {
      return indexedAt;
    }

    return 0;
  }

  /**
   * Sorts Thread Explorer feed items by latest post timestamp.
   * @param {object[]} items - Thread Explorer feed items.
   * @returns {object[]} Sorted copy with newest posts first.
   */
  function sortThreadExplorerFeedItemsChronologically(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => {
        return {
          item,
          index,
        };
      })
      .sort((left, right) => {
        const leftTime = getThreadExplorerFeedItemTimestamp(left.item);
        const rightTime = getThreadExplorerFeedItemTimestamp(right.item);
        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }
        return left.index - right.index;
      })
      .map((entry) => {
        return entry.item;
      });
  }

  /**
   * Returns a normalized Thread Explorer actor feed mode.
   * @param {string} mode - Raw mode from the UI.
   * @returns {string} One of posts, replies, or all.
   */
  function normalizeThreadExplorerActorFeedMode(mode) {
    const normalizedMode = String(mode || "").trim();
    if (normalizedMode === "replies") {
      return "replies";
    }
    if (normalizedMode === "all") {
      return "all";
    }
    return "posts";
  }

  /**
   * Checks whether a normalized post matches the Actor-Fokus feed mode.
   * @param {object} post - Normalized Thread Explorer post.
   * @param {string} mode - Actor feed mode.
   * @returns {boolean} True when the post belongs in the mode.
   */
  function isThreadExplorerActorFeedPostMatch(post = {}, mode = "posts") {
    const isReply = Boolean(post.rootUri && post.uri && post.rootUri !== post.uri);
    if (mode === "all") {
      return true;
    }
    if (mode === "replies") {
      return isReply;
    }
    return !isReply;
  }

  /**
   * Builds safe searchPosts query params for Thread Explorer saved searches.
   * @param {object} search - Saved search params from app settings.
   * @returns {object} Query params accepted by app.bsky.feed.searchPosts.
   */
  function buildThreadExplorerSearchPostsParams(search = {}) {
    const params = {};
    const q = String(search?.q || "").trim();
    let tags = [];
    if (Array.isArray(search?.tag)) { tags = search.tag; }
    if (q) {
      params.q = q;
    } else if (tags.length > 0) {
      params.q = `#${String(tags[0] || "").replace(/^#+/, "")}`;
    }

    const normalizedTags = tags.map((tag) => String(tag || "").trim().replace(/^#+/, "")).filter(Boolean);
    if (normalizedTags.length > 0) {
      params.tag = normalizedTags.slice(0, 8);
    }

    const sort = String(search?.sort || "").trim();
    if (sort === "top") {
      params.sort = "top";
    } else {
      params.sort = "latest";
    }

    ["since", "until", "author", "mentions", "lang", "domain", "url"].forEach((key) => {
      const value = String(search?.[key] || "").trim();
      if (value) {
        params[key] = value;
      }
    });

    if (!params.q && !params.author && !params.domain && !params.url) {
      throw new Error(messages.explorerSearchMissing);
    }

    return params;
  }

  return Object.freeze({ saved: normalizeThreadExplorerSavedFeed, pinned: extractThreadExplorerPinnedFeedSources, relationship: isThreadExplorerRelationshipSource, endpoint: getThreadExplorerRelationshipEndpoint, profileSource: getThreadExplorerRelationshipProfileSource, profileMatch: isThreadExplorerRelationshipProfileMatch, timestamp: getThreadExplorerFeedItemTimestamp, sort: sortThreadExplorerFeedItemsChronologically, mode: normalizeThreadExplorerActorFeedMode, match: isThreadExplorerActorFeedPostMatch, search: buildThreadExplorerSearchPostsParams });
};
