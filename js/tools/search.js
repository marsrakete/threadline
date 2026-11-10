/**
 * Splits raw hashtag input into normalized tag names without leading hash signs.
 * @param {string} value - Raw input from the hashtag field.
 * @returns {string[]} Normalized hashtag names.
 */
export function parseSearchTags(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((entry) => {
      return String(entry || "").trim().replace(/^#+/, "");
    })
    .filter(Boolean);
}

/**
 * Splits a shared Bluesky query into positive text and excluded terms.
 * @param {string} value - Raw `q` value from a shared search URL.
 * @returns {{query: string, excludeText: string}} Positive query and excluded terms.
 */
export function splitSharedSearchQuery(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      query: "",
      excludeText: "",
    };
  }

  const excludeValues = [];
  const query = raw.replace(/(?:^|\s)-(?:"([^"]+)"|(\S+))/g, (match, quotedValue, plainValue) => {
    const nextValue = String(quotedValue || plainValue || "").trim();
    if (nextValue) {
      excludeValues.push(nextValue);
    }
    return " ";
  }).replace(/\s{2,}/g, " ").trim();

  return {
    query,
    excludeText: excludeValues.join(", "),
  };
}

/**
 * Wraps one search summary value in double quotes for clearer UI text.
 * @param {string} value - Plain text value from the search form.
 * @returns {string} Quoted display value.
 */
export function quoteSearchSummaryValue(value = "") {
  return `"${String(value || "").trim()}"`;
}

/**
 * Splits one positive search query into quoted phrases or single terms.
 * @param {string} value - Raw query text from the search form.
 * @returns {string[]} Normalized search terms.
 */
export function parseSearchQueryTerms(value = "") {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return [];
  }

  const terms = [];
  const matcher = /"([^"]+)"|(\S+)/g;
  let match = matcher.exec(rawValue);
  while (match) {
    const nextValue = String(match[1] || match[2] || "").trim();
    if (nextValue) {
      terms.push(nextValue);
    }
    match = matcher.exec(rawValue);
  }
  return [...new Set(terms)];
}

/**
 * Escapes one search token for safe regular-expression usage.
 * @param {string} value - Raw token text.
 * @returns {string} Regex-safe token text.
 */
export function escapeSearchHighlightRegex(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes persisted search result items for safe local restore.
 * @param {Array<object>} items - Raw persisted search result items.
 * @param {number} maxItems - Maximum number of items to retain.
 * @returns {Array<object>} Clamped valid search result items.
 */
export function normalizePersistedSearchResultItems(items = [], maxItems = 100) {
  let limit = Number.parseInt(maxItems, 10);
  if (!Number.isFinite(limit) || limit < 0) {
    limit = 0;
  }
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object" && item.post && typeof item.post === "object")
    .slice(0, limit);
}

/**
 * Compares two search preference snapshots after applying one normalizer.
 * @param {object} left - First search preference snapshot.
 * @param {object} right - Second search preference snapshot.
 * @param {(preferences: object) => object} normalize - Preference normalizer.
 * @returns {boolean} True when both normalized snapshots are equal.
 */
export function areSearchPreferencesEqual(left = {}, right = {}, normalize = (value) => value) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

/**
 * Builds a persistable search-result snapshot when results or a cursor exist.
 * @param {object|null} preferences - Normalized search preferences.
 * @param {Array<object>} items - Search result items.
 * @param {string} cursor - Continuation cursor.
 * @param {number} maxItems - Maximum persisted result count.
 * @param {(items: Array<object>, maxItems: number) => Array<object>} normalizeItems - Item normalizer.
 * @param {(preferences: object) => object} normalizePreferences - Preference normalizer.
 * @returns {object|null} Persistable result snapshot.
 */
export function buildPersistableSearchResultState(preferences, items = [], cursor = "", maxItems = 100, normalizeItems = (values) => values, normalizePreferences = (value) => value) {
  if (!preferences) {
    return null;
  }
  const normalizedItems = normalizeItems(items, maxItems);
  const normalizedCursor = String(cursor || "").trim();
  if (normalizedItems.length === 0 && !normalizedCursor) {
    return null;
  }
  return {
    preferences: normalizePreferences(preferences),
    items: normalizedItems,
    cursor: normalizedCursor,
  };
}

/**
 * Checks whether current search preferences still match a stored result state.
 * @param {object} currentPreferences - Current search form preferences.
 * @param {object|null} storedPreferences - Preferences used for the result list.
 * @param {(preferences: object) => object} normalize - Preference normalizer.
 * @returns {boolean} True when loading another page remains safe.
 */
export function doesSearchResultStateMatch(currentPreferences, storedPreferences, normalize = (value) => value) {
  if (!storedPreferences) {
    return false;
  }
  return areSearchPreferencesEqual(currentPreferences, storedPreferences, normalize);
}

/**
 * Reads one trimmed parameter from URLSearchParams.
 * @param {URLSearchParams} params - Search parameters.
 * @param {string} name - Parameter name.
 * @returns {string} Trimmed value.
 */
export function getSavedSearchStringParam(params, name) {
  return String(params?.get(name) || "").trim();
}

/**
 * Normalizes a saved-search sort value.
 * @param {string} value - Raw sort value.
 * @returns {string} Either latest or top.
 */
export function normalizeSavedSearchSort(value) {
  if (String(value || "").trim() === "top") {
    return "top";
  }
  return "latest";
}

/**
 * Splits excluded search terms from comma-, semicolon-, or newline-separated input.
 * @param {string} value - Raw excluded terms.
 * @returns {string[]} Clean excluded terms.
 */
export function parseExcludedSearchTerms(value = "") {
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
 * Builds the shared search query from included and excluded terms.
 * @param {string} query - Positive search query.
 * @param {string} excludeText - Excluded terms.
 * @returns {string} Combined search query.
 */
export function buildSharedSearchQuery(query = "", excludeText = "") {
  const tokens = [];
  const includeValue = String(query || "").trim();
  if (includeValue) {
    tokens.push(includeValue);
  }
  parseExcludedSearchTerms(excludeText).forEach((entry) => {
    if (/\s/.test(entry)) {
      tokens.push(`-"${entry}"`);
    } else {
      tokens.push(`-${entry}`);
    }
  });
  return tokens.join(" ").trim();
}

/**
 * Creates a normalizer for persisted search preferences.
 * @param {object} dependencies - Hashtag and language normalization dependencies.
 * @returns {(preferences?: object) => object} Search preference normalizer.
 */
export function createSearchPreferencesNormalizer(dependencies = {}) {
  const normalizeHashtags = dependencies.normalizeHashtags || ((values) => values);
  const getDisplayHashtag = dependencies.getDisplayHashtag || ((value) => value);
  const normalizeLanguages = dependencies.normalizeLanguages || ((values) => values);
  const maxLanguages = Number(dependencies.maxLanguages) || 3;

  /**
   * Normalizes one raw search preference snapshot.
   * @param {object} preferences - Raw search preferences.
   * @returns {object} Stable search preference snapshot.
   */
  function normalizeSearchPreferences(preferences = {}) {
    if (!preferences || typeof preferences !== "object") {
      preferences = {};
    }
    const tags = normalizeHashtags(preferences.tags || []).map((tag) => getDisplayHashtag(tag));
    let languages = [];
    if (Array.isArray(preferences.langs)) {
      languages = preferences.langs;
    } else if (preferences.lang) {
      languages = [preferences.lang];
    }
    const normalizedLanguages = normalizeLanguages(languages, maxLanguages);
    let tagMatchMode = "all";
    if (String(preferences.tagMatchMode || "").trim() === "any") {
      tagMatchMode = "any";
    }
    let mode = String(preferences.mode || "").trim();
    if (mode !== "posts" && mode !== "reposts" && mode !== "hashtags") {
      mode = "network";
    }
    let mediaFilter = String(preferences.mediaFilter || "").trim();
    if (mediaFilter !== "images" && mediaFilter !== "videos" && mediaFilter !== "none") {
      mediaFilter = "all";
    }
    let sort = String(preferences.sort || "").trim();
    if (sort !== "top") {
      sort = "latest";
    }
    let postTypeFilter = String(preferences.postTypeFilter || "").trim();
    if (postTypeFilter === "posts") {
      postTypeFilter = "originals";
    }
    if (!["originals", "replies", "quotes", "reposts", "non-reposts"].includes(postTypeFilter)) {
      postTypeFilter = "all";
    }
    return {
      sourceUrl: String(preferences.sourceUrl || "").trim(),
      mode,
      query: String(preferences.query || "").trim(),
      actor: String(preferences.actor || "").trim(),
      tags,
      tagMatchMode,
      mediaFilter,
      postTypeFilter,
      sort,
      excludeText: String(preferences.excludeText || "").trim(),
      mentions: String(preferences.mentions || "").trim(),
      langs: normalizedLanguages,
      lang: String(normalizedLanguages[0] || "").trim(),
      domain: String(preferences.domain || "").trim(),
      url: String(preferences.url || "").trim(),
      since: String(preferences.since || "").trim(),
      until: String(preferences.until || "").trim(),
    };
  }

  return normalizeSearchPreferences;
}
/**
 * Binds the Search workspace controls to explicit page callbacks.
 * @param {object} elements - Search inputs, selectors and action buttons.
 * @param {object} actions - Callbacks for search state and actions.
 * @returns {number} Number of listeners bound.
 */
export function bindSearchWorkspaceEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.modeSelect, "change", actions.modeChange);
  bind(elements.useOwnAccountButton, "click", actions.useOwnAccountClick);
  bind(elements.urlInput, "input", actions.urlInput);
  bind(elements.urlInput, "paste", actions.urlPaste);
  bind(elements.urlInput, "change", actions.urlChange);
  bind(elements.queryInput, "input", actions.summaryInput);
  bind(elements.excludeTextInput, "input", actions.summaryInput);
  bind(elements.actorInput, "input", actions.summaryInput);
  bind(elements.sortSelect, "change", actions.sortChange);
  bind(elements.mediaSelect, "change", actions.summaryInput);
  bind(elements.postTypeSelect, "change", actions.summaryInput);
  bind(elements.mentionsInput, "input", actions.summaryInput);
  bind(elements.domainInput, "input", actions.persistInput);
  bind(elements.targetUrlInput, "input", actions.persistInput);
  bind(elements.sinceInput, "input", actions.summaryInput);
  bind(elements.untilInput, "input", actions.summaryInput);
  bind(elements.runButton, "click", actions.runClick);
  bind(elements.moreButton, "click", actions.moreClick);
  bind(elements.cancelButton, "click", actions.cancelClick);
  bind(elements.saveButton, "click", actions.saveClick);
  bind(elements.savedButton, "click", actions.savedClick);
  bind(elements.hashtagButton, "click", actions.hashtagClick);
  bind(elements.tagMatchSelect, "change", actions.tagMatchChange);
  bind(elements.clearButton, "click", actions.clearClick);
  bind(elements.copyUrlButton, "click", actions.copyUrlClick);
  return boundCount;
}

/**
 * Binds Search dialog controls and saved-search entry actions.
 * @param {object} elements - Search dialog and saved-search controls.
 * @param {object} actions - Explicit dialog and saved-search callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindSearchDialogEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.hashtagCloseTop, "click", actions.hashtagClose);
  bind(elements.hashtagCloseButton, "click", actions.hashtagClose);
  bind(elements.savedSearchAddButton, "click", actions.savedSearchAdd);
  bind(elements.savedSearchUrlInput, "keydown", actions.savedSearchKeydown);
  return boundCount;
}
