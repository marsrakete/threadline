/** Classic-worker namespace for pure search request normalization, variant plans and cursor encoding. */
globalThis.ThreadlineSearchQueries = (() => {
  /**
   * Returns a normalized search workspace mode.
   * @param {string} mode - Raw mode value from the page.
   * @returns {string} One of `network`, `posts`, `reposts`, or `hashtags`.
   */
  function normalizeSearchWorkspaceMode(mode = "") {
    const normalizedMode = String(mode || "").trim();
    if (normalizedMode === "posts") {
      return "posts";
    }
    if (normalizedMode === "reposts") {
      return "reposts";
    }
    if (normalizedMode === "hashtags") {
      return "hashtags";
    }
    return "network";
  }

  /**
   * Returns a normalized search sort value for searchPosts.
   * @param {string} sort - Raw sort value from the page.
   * @returns {string} `latest` or `top`.
   */
  function normalizeSearchWorkspaceSort(sort = "") {
    if (String(sort || "").trim() === "top") {
      return "top";
    }
    return "latest";
  }

  /**
   * Normalizes hashtag filters from the page payload.
   * @param {Array<string>} tags - Raw tag entries from the page.
   * @returns {string[]} Clean hashtag names without leading hash signs.
   */
  function normalizeSearchWorkspaceTags(tags = []) {
    if (!Array.isArray(tags)) {
      return [];
    }
    return tags.map(tag => {
      return String(tag || "").trim().replace(/^#+/, "");
    }).filter(Boolean).slice(0, 8);
  }

  /**
   * Normalizes the hashtag match mode from the page payload.
   * @param {string} value - Raw match mode from the page.
   * @returns {string} `all` or `any`.
   */
  function normalizeSearchWorkspaceTagMatchMode(value = "") {
    if (String(value || "").trim() === "any") {
      return "any";
    }
    return "all";
  }

  /**
   * Normalizes search language filters from the page payload.
   * @param {Array<string>|string} langs - Raw language tags from the page.
   * @returns {string[]} Clean language tags.
   */
  function normalizeSearchWorkspaceLanguages(langs = []) {
    let values = [];
    if (Array.isArray(langs)) {
      values = langs;
    } else {
      const singleValue = String(langs || "").trim();
      if (singleValue) {
        values = [singleValue];
      }
    }
    return [...new Set(values.map(entry => {
      return String(entry || "").trim().toLowerCase();
    }).filter(Boolean))].slice(0, 3);
  }

  /**
   * Converts positive query text and excluded terms into one searchPosts query string.
   * @param {string} query - Positive query text.
   * @param {string} excludeText - Comma-separated excluded terms.
   * @returns {string} Combined query string.
   */
  function buildSharedSearchQuery(query = "", excludeText = "") {
    const includeValue = String(query || "").trim();
    const excludeParts = parseExcludedSearchTerms(excludeText);
    const tokens = [];
    if (includeValue) {
      tokens.push(includeValue);
    }
    excludeParts.forEach(entry => {
      if (/\s/.test(entry)) {
        tokens.push(`-"${entry}"`);
      } else {
        tokens.push(`-${entry}`);
      }
    });
    return tokens.join(" ").trim();
  }

  /**
   * Splits excluded search terms from free text, commas, semicolons, or quoted phrases.
   * @param {string} value - Raw excluded-term input.
   * @returns {string[]} Clean excluded terms.
   */
  function parseExcludedSearchTerms(value = "") {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
      return [];
    }
    const terms = [];
    const matcher = /"([^"]+)"|[^,\n;]+/g;
    let match = matcher.exec(rawValue);
    while (match) {
      const nextValue = String(match[1] || match[0] || "").trim();
      if (nextValue) {
        terms.push(nextValue);
      }
      match = matcher.exec(rawValue);
    }
    return terms;
  }

  /**
   * Builds searchPosts params for the search workspace.
   * @param {object} payload - Search workspace payload from the page.
   * @param {string} forcedLang - Optional single language override for multi-language requests.
   * @returns {object} Query params for `app.bsky.feed.searchPosts`.
   */
  function buildSearchWorkspaceSearchPostsParams(payload = {}, forcedLang = "") {
    const params = {};
    const query = String(payload?.query || "").trim();
    const excludeText = String(payload?.excludeText || "").trim();
    const tags = normalizeSearchWorkspaceTags(payload?.tags);
    const actor = String(payload?.actor || "").trim();
    const sort = normalizeSearchWorkspaceSort(payload?.sort);
    const mentions = String(payload?.mentions || "").trim();
    let languageSource;
    if (Array.isArray(payload?.langs) && payload.langs.length > 0) {
      languageSource = payload.langs;
    } else {
      languageSource = payload?.lang || "";
    }
    const normalizedLanguages = normalizeSearchWorkspaceLanguages(languageSource);
    let lang = String(forcedLang || "").trim();
    if (!lang && normalizedLanguages.length > 0) {
      lang = normalizedLanguages[0];
    }
    const domain = String(payload?.domain || "").trim();
    const targetUrl = String(payload?.url || "").trim();
    const since = String(payload?.since || "").trim();
    const until = String(payload?.until || "").trim();
    const combinedQuery = buildSharedSearchQuery(query, excludeText);
    if (combinedQuery) {
      params.q = combinedQuery;
    } else if (tags.length > 0) {
      params.q = `#${tags[0]}`;
    }
    if (tags.length > 0) {
      params.tag = tags;
    }
    if (actor) {
      params.author = actor;
    }
    if (mentions) {
      params.mentions = mentions;
    }
    if (lang) {
      params.lang = lang;
    }
    if (domain) {
      params.domain = domain;
    }
    if (targetUrl) {
      params.url = targetUrl;
    }
    if (sort) {
      params.sort = sort;
    }
    if (since) {
      params.since = since;
    }
    if (until) {
      params.until = until;
    }
    if (!params.q) {
      throw new Error("Die Bluesky-Netzwerk-Suche braucht einen Suchtext oder Hashtag.");
    }
    return params;
  }

  /**
   * Checks whether a search workspace payload already contains a valid server-side search query.
   * @param {object} payload - Search workspace payload from the page.
   * @returns {boolean} True when `searchPosts` can be called with a valid `q` parameter.
   */
  function hasSearchWorkspaceServerQuery(payload = {}) {
    const query = String(payload?.query || "").trim();
    const excludeText = String(payload?.excludeText || "").trim();
    const tags = normalizeSearchWorkspaceTags(payload?.tags);
    const combinedQuery = buildSharedSearchQuery(query, excludeText);
    if (combinedQuery) {
      return true;
    }
    if (tags.length > 0) {
      return true;
    }
    return false;
  }

  /**
   * Checks whether a network search without server query should fall back to one account feed.
   * @param {object} payload - Search workspace payload from the page.
   * @returns {boolean} True when a local account-feed search is the safer fallback.
   */
  function shouldFallbackNetworkSearchToAuthorFeed(payload = {}) {
    const mode = normalizeSearchWorkspaceMode(payload?.mode);
    const actor = String(payload?.actor || "").trim();
    if (mode !== "network") {
      return false;
    }
    if (!actor) {
      return false;
    }
    if (hasSearchWorkspaceServerQuery(payload)) {
      return false;
    }
    return true;
  }

  /**
   * Parses stored cursor state for multi-variant searchPosts pagination.
   * @param {string} rawCursor - Cursor from the page state.
   * @param {string[]} variantKeys - Active variant keys.
   * @returns {{cursors: Object<string, string>, exhausted: Set<string>}} Cursor state by variant key.
   */
  function parseSearchWorkspaceSearchCursorState(rawCursor = "", variantKeys = []) {
    let normalizedVariantKeys;
    if (Array.isArray(variantKeys)) {
      normalizedVariantKeys = variantKeys.map(entry => {
        return String(entry || "").trim();
      }).filter(Boolean);
    } else {
      normalizedVariantKeys = [];
    }
    const state = {
      cursors: {},
      exhausted: new Set()
    };
    if (normalizedVariantKeys.length <= 1) {
      const onlyVariantKey = normalizedVariantKeys[0] || "";
      if (onlyVariantKey && String(rawCursor || "").trim()) {
        state.cursors[onlyVariantKey] = String(rawCursor || "").trim();
      }
      return state;
    }
    const trimmedCursor = String(rawCursor || "").trim();
    if (!trimmedCursor) {
      return state;
    }
    try {
      const parsed = JSON.parse(trimmedCursor);
      let rawCursors;
      if (parsed?.cursors && typeof parsed.cursors === "object") {
        rawCursors = parsed.cursors;
      } else {
        rawCursors = {};
      }
      normalizedVariantKeys.forEach(variantKey => {
        const nextCursor = String(rawCursors[variantKey] || "").trim();
        if (nextCursor) {
          state.cursors[variantKey] = nextCursor;
        }
      });
      let exhaustedValues;
      if (Array.isArray(parsed?.exhausted)) {
        exhaustedValues = parsed.exhausted;
      } else {
        exhaustedValues = [];
      }
      exhaustedValues.forEach(variantKey => {
        const normalizedVariantKey = String(variantKey || "").trim();
        if (normalizedVariantKeys.includes(normalizedVariantKey)) {
          state.exhausted.add(normalizedVariantKey);
        }
      });
      return state;
    } catch {
      return state;
    }
  }

  /**
   * Builds the persisted cursor string for multi-variant searchPosts pagination.
   * @param {Object<string, string>} cursors - Next cursor values by variant key.
   * @param {Set<string>} exhausted - Variant keys that have no more pages.
   * @param {string[]} variantKeys - Active variant keys.
   * @returns {string} Encoded cursor payload, or an empty string when no more pages remain.
   */
  function buildSearchWorkspaceSearchCursorState(cursors = {}, exhausted = new Set(), variantKeys = []) {
    let normalizedVariantKeys;
    if (Array.isArray(variantKeys)) {
      normalizedVariantKeys = variantKeys.map(entry => {
        return String(entry || "").trim();
      }).filter(Boolean);
    } else {
      normalizedVariantKeys = [];
    }
    if (normalizedVariantKeys.length <= 1) {
      const onlyVariantKey = normalizedVariantKeys[0] || "";
      return String(cursors[onlyVariantKey] || "").trim();
    }
    let hasRemainingPages = false;
    normalizedVariantKeys.forEach(variantKey => {
      if (!exhausted.has(variantKey)) {
        hasRemainingPages = true;
      }
    });
    if (!hasRemainingPages) {
      return "";
    }
    return JSON.stringify({
      cursors,
      exhausted: [...exhausted]
    });
  }

  /**
   * Builds the effective searchPosts request variants for language and hashtag matching.
   * @param {object} payload - Search workspace payload from the page.
   * @returns {Array<object>} Search variants with dedicated language and hashtag subsets.
   */
  function buildSearchWorkspaceSearchVariants(payload = {}) {
    let languageSource;
    if (Array.isArray(payload?.langs) && payload.langs.length > 0) {
      languageSource = payload.langs;
    } else {
      languageSource = payload?.lang || "";
    }
    const languages = normalizeSearchWorkspaceLanguages(languageSource);
    const tags = normalizeSearchWorkspaceTags(payload?.tags);
    const tagMatchMode = normalizeSearchWorkspaceTagMatchMode(payload?.tagMatchMode || "all");
    let languageVariants;
    if (languages.length > 0) {
      languageVariants = languages;
    } else {
      languageVariants = [""];
    }
    const tagVariants = [];
    if (tagMatchMode === "any" && tags.length > 1) {
      tags.forEach(tag => {
        tagVariants.push([tag]);
      });
    } else {
      tagVariants.push(tags);
    }
    const variants = [];
    languageVariants.forEach(language => {
      tagVariants.forEach(tagSubset => {
        let tagKey;
        if (tagSubset.length > 0) {
          tagKey = tagSubset.join(",");
        } else {
          tagKey = "*";
        }
        const languageKey = language || "*";
        variants.push({
          key: `${languageKey}|${tagKey}`,
          forcedLang: language,
          payload: {
            ...payload,
            tags: tagSubset
          }
        });
      });
    });
    return variants;
  }

  /**
   * Builds a normalized URI set that should be skipped while loading more search pages.
   * @param {Array<string>} uris - Raw post URIs from the page state.
   * @returns {Set<string>} Normalized URI set.
   */
  function createSearchWorkspaceExcludeUriSet(uris = []) {
    const excludeUris = new Set();
    if (!Array.isArray(uris)) {
      return excludeUris;
    }
    uris.forEach(uri => {
      const normalizedUri = String(uri || "").trim();
      if (normalizedUri) {
        excludeUris.add(normalizedUri);
      }
    });
    return excludeUris;
  }
  return Object.freeze({
    normalizeSearchWorkspaceMode,
    normalizeSearchWorkspaceSort,
    normalizeSearchWorkspaceTags,
    normalizeSearchWorkspaceTagMatchMode,
    normalizeSearchWorkspaceLanguages,
    buildSharedSearchQuery,
    parseExcludedSearchTerms,
    buildSearchWorkspaceSearchPostsParams,
    hasSearchWorkspaceServerQuery,
    shouldFallbackNetworkSearchToAuthorFeed,
    parseSearchWorkspaceSearchCursorState,
    buildSearchWorkspaceSearchCursorState,
    buildSearchWorkspaceSearchVariants,
    createSearchWorkspaceExcludeUriSet
  });
})();
