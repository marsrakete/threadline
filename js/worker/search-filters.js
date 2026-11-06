/**
 * Creates pure local search filters and normalized result models for the classic worker.
 * @param {object} options - Explicit query normalization, facet extraction and post normalization adapters.
 * @param {object} options.queries - Search tag/language/match-mode and excluded-term operations.
 * @param {Function} options.facets - Extracts mention DIDs and domains from rich-text facets.
 * @param {Function} options.post - Converts a provider post view into the shared post model.
 * @returns {{matches: Function, item: Function, timestamp: Function}} Local match, result and timestamp operations.
 */
globalThis.createThreadlineSearchFilters = function createThreadlineSearchFilters(options) {
  if (!options || typeof options.facets !== "function" || typeof options.post !== "function") {
    throw new TypeError("Search filters require facet and post adapters.");
  }
  for (const name of ['normalizeSearchWorkspaceTags', 'normalizeSearchWorkspaceTagMatchMode', 'normalizeSearchWorkspaceLanguages', 'parseExcludedSearchTerms']) {
    if (typeof options.queries?.[name] !== "function") {
      throw new TypeError(`Search filters require query ${name}.`);
    }
  }
  const {
    normalizeSearchWorkspaceTags,
    normalizeSearchWorkspaceTagMatchMode,
    normalizeSearchWorkspaceLanguages,
    parseExcludedSearchTerms
  } = options.queries;
  const extractAnalysisRecordFacets = options.facets;
  const normalizeThreadExplorerPost = options.post;
  /**
  * Returns a lowercase text haystack for local post filtering.
  * @param {object} post - Normalized post data.
  * @returns {string} Lowercase searchable text.
  */
  function getSearchWorkspacePostHaystack(post = {}) {
    const text = String(post?.text || "").trim().toLowerCase();
    const handle = String(post?.author?.handle || "").trim().toLowerCase();
    return `${text}\n${handle}`;
  }

  /**
   * Splits one positive local search query into quoted phrases or single terms.
   * @param {string} value - Raw query text from the search form.
   * @returns {string[]} Normalized query terms.
   */
  function parseSearchWorkspaceQueryTerms(value = "") {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
      return [];
    }
    const terms = [];
    const matcher = /"([^"]+)"|(\S+)/g;
    let match = matcher.exec(rawValue);
    while (match) {
      const nextValue = String(match[1] || match[2] || "").trim().toLowerCase();
      if (nextValue) {
        terms.push(nextValue);
      }
      match = matcher.exec(rawValue);
    }
    return terms;
  }

  /**
   * Checks whether a post matches the requested text snippet locally.
   * @param {object} post - Normalized post data.
   * @param {string} query - Raw query text.
   * @returns {boolean} True when the query is empty or included in the post text.
   */
  function matchesSearchWorkspaceQuery(post = {}, query = "") {
    const queryTerms = parseSearchWorkspaceQueryTerms(query);
    if (!queryTerms.length) {
      return true;
    }
    const haystack = getSearchWorkspacePostHaystack(post);
    return queryTerms.every(term => {
      return haystack.includes(term);
    });
  }

  /**
   * Checks whether a post avoids all locally excluded text fragments.
   * @param {object} post - Normalized post data.
   * @param {string} excludeText - Comma-separated excluded terms from the search form.
   * @returns {boolean} True when none of the excluded fragments occur in the post text.
   */
  function matchesSearchWorkspaceExcludedText(post = {}, excludeText = "") {
    const blockedTerms = parseExcludedSearchTerms(excludeText).map(entry => {
      return String(entry || "").trim().toLowerCase();
    }).filter(Boolean);
    if (!blockedTerms.length) {
      return true;
    }
    const haystack = getSearchWorkspacePostHaystack(post);
    return blockedTerms.every(entry => {
      return !haystack.includes(entry);
    });
  }

  /**
   * Checks whether a post contains the requested hashtags in its text.
   * @param {object} post - Normalized post data.
   * @param {Array<string>} tags - Normalized hashtag names.
   * @param {string} tagMatchMode - Match mode from the search form.
   * @returns {boolean} True when the hashtag rule matches the post.
   */
  function matchesSearchWorkspaceTags(post = {}, tags = [], tagMatchMode = "all") {
    const normalizedTags = normalizeSearchWorkspaceTags(tags);
    if (!normalizedTags.length) {
      return true;
    }
    const haystack = getSearchWorkspacePostHaystack(post);
    const normalizedTagMatchMode = normalizeSearchWorkspaceTagMatchMode(tagMatchMode);
    const hasTag = tag => {
      return haystack.includes(`#${String(tag || "").toLowerCase()}`);
    };
    if (normalizedTagMatchMode === "any") {
      return normalizedTags.some(tag => {
        return hasTag(tag);
      });
    }
    return normalizedTags.every(tag => {
      return hasTag(tag);
    });
  }

  /**
   * Parses one date filter input into an epoch timestamp boundary.
   * @param {string} value - Raw date string in `YYYY-MM-DD` format.
   * @param {boolean} endOfDay - True when the boundary should include the whole day.
   * @returns {number|null} Epoch milliseconds or null when empty/invalid.
   */
  function parseSearchWorkspaceDateBoundary(value = "", endOfDay = false) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    let isoValue = `${raw}T00:00:00.000Z`;
    if (endOfDay) {
      isoValue = `${raw}T23:59:59.999Z`;
    }
    const timestamp = Date.parse(isoValue);
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    return timestamp;
  }

  /**
   * Checks whether a post falls inside the requested date window.
   * @param {object} post - Normalized post data.
   * @param {string} since - Inclusive start date.
   * @param {string} until - Inclusive end date.
   * @returns {boolean} True when the post is inside the window or no window was supplied.
   */
  function matchesSearchWorkspaceDateRange(post = {}, since = "", until = "") {
    const createdAt = Date.parse(String(post?.createdAt || post?.indexedAt || "").trim());
    if (!Number.isFinite(createdAt)) {
      return true;
    }
    const sinceBoundary = parseSearchWorkspaceDateBoundary(since, false);
    const untilBoundary = parseSearchWorkspaceDateBoundary(until, true);
    if (Number.isFinite(sinceBoundary) && createdAt < sinceBoundary) {
      return false;
    }
    if (Number.isFinite(untilBoundary) && createdAt > untilBoundary) {
      return false;
    }
    return true;
  }

  /**
   * Checks whether a post matches one requested mention DID.
   * @param {object} post - Normalized post data.
   * @param {string} mentions - Mention DID from the search form.
   * @returns {boolean} True when no mention filter exists or the DID is present.
   */
  function matchesSearchWorkspaceMention(post = {}, mentions = "") {
    const normalizedMention = String(mentions || "").trim();
    if (!normalizedMention) {
      return true;
    }
    let rawFacets;
    if (Array.isArray(post?.facets)) {
      rawFacets = post.facets;
    } else {
      rawFacets = [];
    }
    const facets = extractAnalysisRecordFacets({
      facets: rawFacets
    });
    return facets.mentions.includes(normalizedMention);
  }

  /**
   * Checks whether a post matches one requested language tag.
   * @param {object} post - Normalized post data.
   * @param {Array<string>|string} langs - Language code filter from the search form.
   * @returns {boolean} True when no language filter exists or one code is present.
   */
  function matchesSearchWorkspaceLanguage(post = {}, langs = []) {
    const normalizedLanguages = normalizeSearchWorkspaceLanguages(langs);
    if (!normalizedLanguages.length) {
      return true;
    }
    const postLanguages = normalizeSearchWorkspaceLanguages(post?.langs || []);
    return postLanguages.some(entry => {
      return normalizedLanguages.includes(entry);
    });
  }

  /**
   * Checks whether a post contains the requested domain in link facets or external cards.
   * @param {object} post - Normalized post data.
   * @param {string} domain - Domain filter from the search form.
   * @returns {boolean} True when no domain filter exists or the domain matches.
   */
  function matchesSearchWorkspaceDomain(post = {}, domain = "") {
    const normalizedDomain = String(domain || "").trim().toLowerCase();
    if (!normalizedDomain) {
      return true;
    }
    let rawFacets;
    if (Array.isArray(post?.facets)) {
      rawFacets = post.facets;
    } else {
      rawFacets = [];
    }
    const facets = extractAnalysisRecordFacets({
      facets: rawFacets
    });
    const candidates = [...facets.domains];
    const externalUrl = String(post?.externalCard?.url || "").trim();
    if (externalUrl) {
      try {
        candidates.push(new URL(externalUrl).hostname.toLowerCase());
      } catch {
        // ignore invalid URLs
      }
    }
    return candidates.some(entry => {
      return String(entry || "").trim().toLowerCase() === normalizedDomain;
    });
  }

  /**
   * Checks whether a post links to the requested URL.
   * @param {object} post - Normalized post data.
   * @param {string} url - Exact target URL from the search form.
   * @returns {boolean} True when no URL filter exists or the URL appears in the post.
   */
  function matchesSearchWorkspaceTargetUrl(post = {}, url = "") {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return true;
    }
    let facets;
    if (Array.isArray(post?.facets)) {
      facets = post.facets;
    } else {
      facets = [];
    }
    for (const facet of facets) {
      let features;
      if (Array.isArray(facet?.features)) {
        features = facet.features;
      } else {
        features = [];
      }
      for (const feature of features) {
        if (String(feature?.$type || "").trim() === "app.bsky.richtext.facet#link") {
          if (String(feature?.uri || "").trim() === normalizedUrl) {
            return true;
          }
        }
      }
    }
    return String(post?.externalCard?.url || "").trim() === normalizedUrl;
  }

  /**
   * Checks whether a post matches the requested media filter.
   * @param {object} post - Normalized post data.
   * @param {string} mediaFilter - One of `all`, `images`, `videos`, or `none`.
   * @returns {boolean} True when the post matches the selected media mode.
   */
  function matchesSearchWorkspaceMediaFilter(post = {}, mediaFilter = "") {
    const normalizedFilter = String(mediaFilter || "").trim();
    const hasImages = Array.isArray(post?.images) && post.images.length > 0;
    const hasVideo = post?.hasVideo === true;
    if (normalizedFilter === "images") {
      return hasImages;
    }
    if (normalizedFilter === "videos") {
      return hasVideo;
    }
    if (normalizedFilter === "none") {
      return !hasImages && !hasVideo;
    }
    return true;
  }

  /**
   * Checks whether a post matches the requested post-type filter.
   * @param {object} post - Normalized post data.
   * @param {string} postTypeFilter - Selected post-type filter from the search form.
   * @param {object} item - Normalized search result item with repost metadata.
   * @returns {boolean} True when the post matches the selected type.
   */
  function matchesSearchWorkspacePostTypeFilter(post = {}, postTypeFilter = "", item = {}) {
    const normalizedFilter = String(postTypeFilter || "").trim();
    const isReply = Boolean(post?.reply?.root?.uri && post?.reply?.parent?.uri);
    const isQuote = Boolean(post?.quoteCard?.uri);
    const isRepost = item?.reasonType === "repost";
    if (normalizedFilter === "posts" || normalizedFilter === "originals") {
      return !isReply && !isQuote && !isRepost;
    }
    if (normalizedFilter === "replies") {
      return isReply;
    }
    if (normalizedFilter === "quotes") {
      return isQuote;
    }
    if (normalizedFilter === "reposts") {
      return isRepost;
    }
    if (normalizedFilter === "non-reposts") {
      return !isRepost;
    }
    return true;
  }

  /**
   * Checks whether a normalized post matches all local search workspace filters.
   * @param {object} post - Normalized post data.
   * @param {object} payload - Search workspace payload from the page.
   * @param {object} item - Normalized search result item with repost metadata.
   * @returns {boolean} True when the post matches every local filter.
   */
  function matchesSearchWorkspacePost(post = {}, payload = {}, item = {}) {
    if (!matchesSearchWorkspaceQuery(post, payload?.query || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceExcludedText(post, payload?.excludeText || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceTags(post, payload?.tags || [], payload?.tagMatchMode || "all")) {
      return false;
    }
    if (!matchesSearchWorkspaceDateRange(post, payload?.since || "", payload?.until || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceMention(post, payload?.mentions || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceLanguage(post, payload?.langs || payload?.lang || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceDomain(post, payload?.domain || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceTargetUrl(post, payload?.url || "")) {
      return false;
    }
    if (!matchesSearchWorkspaceMediaFilter(post, payload?.mediaFilter || "")) {
      return false;
    }
    if (!matchesSearchWorkspacePostTypeFilter(post, payload?.postTypeFilter || "", item)) {
      return false;
    }
    return true;
  }

  /**
   * Maps one feed entry to the compact result shape used by the search workspace.
   * @param {object} entry - Feed or search result entry.
   * @returns {object|null} Search result item or null when no post exists.
   */
  function normalizeSearchWorkspaceResultItem(entry = {}) {
    const post = normalizeThreadExplorerPost(entry?.post || entry);
    if (!post) {
      return null;
    }
    const reasonType = String(entry?.reason?.$type || "").trim();
    const repostBy = String(entry?.reason?.by?.handle || entry?.reason?.by?.did || "").trim();
    const repostAt = String(entry?.reason?.indexedAt || "").trim();
    let normalizedReasonType = "";
    if (reasonType.endsWith("#reasonRepost")) {
      normalizedReasonType = "repost";
    }
    return {
      post,
      reasonType: normalizedReasonType,
      repostBy,
      repostAt
    };
  }

  /**
   * Returns the best available timestamp for sorting merged multi-language search results.
   * @param {object} item - Normalized search result item.
   * @returns {number} Millisecond timestamp, or `0` when no valid date exists.
   */
  function getSearchWorkspaceResultTimestamp(item = {}) {
    const post = item?.post || null;
    const rawValue = String(post?.indexedAt || post?.createdAt || item?.repostAt || "").trim();
    if (!rawValue) {
      return 0;
    }
    const parsedValue = Date.parse(rawValue);
    if (Number.isNaN(parsedValue)) {
      return 0;
    }
    return parsedValue;
  }
  return Object.freeze({
    matches: matchesSearchWorkspacePost,
    item: normalizeSearchWorkspaceResultItem,
    timestamp: getSearchWorkspaceResultTimestamp
  });
};
