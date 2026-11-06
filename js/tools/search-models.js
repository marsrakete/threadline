/**
 * Creates localized search summaries, progress, share URLs and saved labels without DOM access.
 * @param {object} options - Explicit translation, count, account, locale, hashtag, language and preference adapters; maxLanguages limit.
 * @returns {object} topic, details, summary, loaded, progress, detailed, sharedUrl, savedLabel operations.
 */
export function createSearchModels(options) {
  for (const name of ["t", "count", "formatTag", "displayTag", "quote", "languages", "languageName", "sharedQuery", "normalize", "account", "locale"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`Search requires ${name}.`);
    }
  }
  const MAX_SEARCH_LANGUAGES = options.maxLanguages;
  const t = options.t;
  const formatCount = options.count;
  const formatHashtag = options.formatTag;
  const getDisplayHashtag = options.displayTag;
  const quoteSearchSummaryValue = options.quote;
  const normalizePostLanguageTags = options.languages;
  const getPostLanguageDisplayName = options.languageName;
  const buildSharedSearchQuery = options.sharedQuery;
  const normalizeSearchPreferencesForStorage = options.normalize;
  const readAccount = options.account;
  const readLocale = options.locale;
  /** Resolves current or legacy language filters. @param {object} payload - Search filters. @returns {string[]} Normalized language tags. */
  function resolveLanguages(payload) {
    let values = [];
    if (Array.isArray(payload?.langs) && payload.langs.length > 0) {
      values = payload.langs;
    } else if (payload?.lang) {
      values = [payload.lang];
    }
    return normalizePostLanguageTags(values, MAX_SEARCH_LANGUAGES);
  }

  /**
   * Builds the readable topic fragment for the live search summary.
   * @param {object} payload - Normalized search request payload.
   * @returns {string} Localized topic fragment, or an empty string.
   */
  function buildSearchTopicText(payload = {}) {
    const query = String(payload?.query || "").trim();
    let tags;
    if (Array.isArray(payload?.tags)) {
      tags = payload.tags.filter(Boolean);
    } else {
      tags = [];
    }
    const tagMatchMode = String(payload?.tagMatchMode || "all").trim();
    const formattedTags = tags.map(tag => {
      return formatHashtag(tag);
    }).join(", ");
    if (query && formattedTags) {
      return t("searchSummaryTopicTextAndTags", {
        query: quoteSearchSummaryValue(query),
        tags: formattedTags
      });
    }
    if (query) {
      return t("searchSummaryTopicText", {
        query: quoteSearchSummaryValue(query)
      });
    }
    if (formattedTags) {
      let topicKey = "searchSummaryTopicTags";
      if (tagMatchMode === "any" && tags.length > 1) {
        topicKey = "searchSummaryTopicTagsAny";
      }
      return t(topicKey, {
        tags: formattedTags
      });
    }
    return "";
  }

  /**
   * Builds localized detail clauses for non-text search filters.
   * @param {object} payload - Normalized search request payload.
   * @returns {string[]} Localized filter clauses.
   */
  function buildSearchDetailTexts(payload = {}) {
    const parts = [];
    const mode = String(payload?.mode || "network").trim();
    const excludeText = String(payload?.excludeText || "").trim();
    const mediaFilter = String(payload?.mediaFilter || "").trim();
    const postTypeFilter = String(payload?.postTypeFilter || "").trim();
    const mentions = String(payload?.mentions || "").trim();
    const tagMatchMode = String(payload?.tagMatchMode || "all").trim();
    let tags;
    if (Array.isArray(payload?.tags)) {
      tags = payload.tags.filter(Boolean);
    } else {
      tags = [];
    }
    const langs = resolveLanguages(payload);
    const domain = String(payload?.domain || "").trim();
    const targetUrl = String(payload?.url || "").trim();
    const since = String(payload?.since || "").trim();
    const until = String(payload?.until || "").trim();
    let modeLabelKey = "searchModeNetwork";
    if (mode === "posts") {
      modeLabelKey = "searchModePosts";
    } else if (mode === "reposts") {
      modeLabelKey = "searchModeReposts";
    } else if (mode === "hashtags") {
      modeLabelKey = "searchModeHashtags";
    }
    parts.push(t("searchSummaryDetailMode", {
      value: t(modeLabelKey)
    }));
    if (excludeText) {
      parts.push(t("searchSummaryDetailExclude", {
        value: quoteSearchSummaryValue(excludeText)
      }));
    }
    if (mediaFilter && mediaFilter !== "all") {
      let mediaLabel;
      if (mediaFilter === "none") {
        mediaLabel = "NoMedia";
      } else if (mediaFilter === "images") {
        mediaLabel = "Images";
      } else {
        mediaLabel = "Videos";
      }
      parts.push(t("searchSummaryDetailMedia", {
        value: t(`searchMedia${mediaLabel}`)
      }));
    }
    if (postTypeFilter && postTypeFilter !== "all") {
      let typeLabelKey = "searchPostTypeAll";
      if (postTypeFilter === "posts" || postTypeFilter === "originals") {
        typeLabelKey = "searchPostTypeOriginals";
      } else if (postTypeFilter === "replies") {
        typeLabelKey = "searchPostTypeReplies";
      } else if (postTypeFilter === "quotes") {
        typeLabelKey = "searchPostTypeQuotes";
      } else if (postTypeFilter === "reposts") {
        typeLabelKey = "searchPostTypeReposts";
      } else if (postTypeFilter === "non-reposts") {
        typeLabelKey = "searchPostTypeNonReposts";
      }
      parts.push(t("searchSummaryDetailPostType", {
        value: t(typeLabelKey)
      }));
    }
    if (mentions) {
      parts.push(t("searchSummaryDetailMentions", {
        value: quoteSearchSummaryValue(mentions)
      }));
    }
    if (tags.length > 1) {
      if (tagMatchMode === "any") {
        parts.push(t("searchSummaryDetailTagMatch", {
          value: t("searchTagMatchAny")
        }));
      } else {
        parts.push(t("searchSummaryDetailTagMatch", {
          value: t("searchTagMatchAll")
        }));
      }
    }
    if (langs.length === 1) {
      parts.push(t("searchSummaryDetailLanguage", {
        value: getPostLanguageDisplayName(langs[0], readLocale())
      }));
    }
    if (langs.length > 1) {
      const languageLabels = langs.map(entry => {
        return getPostLanguageDisplayName(entry, readLocale());
      });
      parts.push(t("searchSummaryDetailLanguages", {
        value: languageLabels.join(", ")
      }));
    }
    if (domain) {
      parts.push(t("searchSummaryDetailDomain", {
        value: quoteSearchSummaryValue(domain)
      }));
    }
    if (targetUrl) {
      parts.push(t("searchSummaryDetailUrl", {
        value: quoteSearchSummaryValue(targetUrl)
      }));
    }
    if (since) {
      parts.push(t("searchSummaryDetailSince", {
        value: since
      }));
    }
    if (until) {
      parts.push(t("searchSummaryDetailUntil", {
        value: until
      }));
    }
    return parts;
  }

  /**
   * Builds a natural-language sentence that describes the active search.
   * @param {object} payload - Normalized search request payload.
   * @returns {string} Localized search description.
   */
  function buildSearchSummaryText(payload = {}) {
    const mode = String(payload?.mode || "network").trim();
    const actor = String(payload?.actor || "").trim();
    const topic = buildSearchTopicText(payload);
    const ownAccount = String(readAccount() || "").trim();
    let actorLabel;
    if (actor) {
      actorLabel = quoteSearchSummaryValue(`@${actor.replace(/^@+/, "")}`);
    } else {
      actorLabel = "";
    }
    const isOwnAccount = Boolean(actor) && Boolean(ownAccount) && actor.replace(/^@+/, "").toLowerCase() === ownAccount.replace(/^@+/, "").toLowerCase();
    let summary = "";
    if (mode === "posts") {
      if (isOwnAccount || !actor && ownAccount) {
        summary = t("searchSummaryPostsOwn", {
          topic
        });
      } else {
        summary = t("searchSummaryPostsActor", {
          account: actorLabel,
          topic
        });
      }
    } else if (mode === "reposts") {
      if (isOwnAccount || !actor && ownAccount) {
        summary = t("searchSummaryRepostsOwn", {
          topic
        });
      } else {
        summary = t("searchSummaryRepostsActor", {
          account: actorLabel,
          topic
        });
      }
    } else if (mode === "hashtags") {
      if (actorLabel) {
        summary = t("searchSummaryHashtagsActor", {
          account: actorLabel,
          topic
        });
      } else {
        summary = t("searchSummaryHashtagsGlobal", {
          topic
        });
      }
    } else if (actorLabel) {
      summary = t("searchSummaryNetworkActor", {
        account: actorLabel,
        topic
      });
    } else {
      summary = t("searchSummaryNetworkGlobal", {
        topic
      });
    }
    const details = buildSearchDetailTexts(payload);
    if (!details.length) {
      return summary;
    }
    return `${summary} ${details.join(" · ")}`;
  }

  /**
   * Builds the visible search status after a successful request.
   * @param {number} count - Number of currently rendered results.
   * @param {boolean} hasMore - True when another cursor page is available.
   * @returns {string} Localized status line.
   */
  function buildSearchLoadedStatus(count, hasMore) {
    if (hasMore) {
      return t("searchStatusLoadedMore", {
        count: formatCount(count)
      });
    }
    return t("searchStatusLoaded", {
      count: formatCount(count)
    });
  }

  /**
   * Builds a localized live progress line for the current search run.
   * @param {object} progress - Progress payload from the service worker.
   * @returns {string} Human-readable progress text.
   */
  function buildSearchProgressStatus(progress = {}) {
    const page = Math.max(0, Number(progress?.pageCount) || 0);
    const scanned = Math.max(0, Number(progress?.scannedCount) || 0);
    const matches = Math.max(0, Number(progress?.matchCount) || 0);
    const account = String(progress?.actor || "").trim();
    const isReposts = progress?.mode === "reposts";
    if (account) {
      let accountLabel;
      if (account.startsWith("@")) {
        accountLabel = account;
      } else {
        accountLabel = `@${account}`;
      }
      let modeLabel;
      if (isReposts) {
        modeLabel = t("searchModeReposts");
      } else {
        modeLabel = t("searchModePosts");
      }
      return t("searchStatusProgressAuthor", {
        account: accountLabel,
        page: formatCount(page),
        scanned: formatCount(scanned),
        matches: formatCount(matches),
        mode: modeLabel
      });
    }
    return t("searchStatusProgressGeneric", {
      page: formatCount(page),
      scanned: formatCount(scanned),
      matches: formatCount(matches)
    });
  }

  /**
   * Returns true when the active search needs client-side post-filtering details.
   * @param {object} payload - Normalized search payload from the current form.
   * @returns {boolean} True when detailed counters help explain local filtering.
   */
  function shouldShowDetailedSearchProgress(payload = {}) {
    const mode = String(payload?.mode || "network").trim();
    if (mode === "posts" || mode === "reposts") {
      return true;
    }
    const mediaFilter = String(payload?.mediaFilter || "all").trim();
    const postTypeFilter = String(payload?.postTypeFilter || "all").trim();
    const languages = resolveLanguages(payload);
    if (mediaFilter !== "all") {
      return true;
    }
    if (postTypeFilter !== "all") {
      return true;
    }
    if (languages.length > 1) {
      return true;
    }
    return false;
  }

  /**
   * Builds a bsky-compatible search URL from the current search payload.
   * @param {object} payload - Normalized search payload from the current form.
   * @returns {{url: string, limitations: string[]}} URL plus unsupported Threadline filters.
   */
  function buildBskySearchUrlFromPayload(payload = {}) {
    const params = new URLSearchParams();
    const mode = String(payload?.mode || "network").trim();
    const query = String(payload?.query || "").trim();
    const excludeText = String(payload?.excludeText || "").trim();
    let tags;
    if (Array.isArray(payload?.tags)) {
      tags = payload.tags.filter(Boolean);
    } else {
      tags = [];
    }
    const actor = String(payload?.actor || "").trim().replace(/^@+/, "");
    const sort = String(payload?.sort || "latest").trim();
    const mentions = String(payload?.mentions || "").trim();
    const domain = String(payload?.domain || "").trim();
    const targetUrl = String(payload?.url || "").trim();
    const since = String(payload?.since || "").trim();
    const until = String(payload?.until || "").trim();
    const languages = resolveLanguages(payload);
    const limitations = [];
    const combinedQuery = buildSharedSearchQuery(query, excludeText);
    if (combinedQuery) {
      params.set("q", combinedQuery);
    }
    tags.forEach(tag => {
      params.append("tag", String(tag || "").trim().replace(/^#+/, ""));
    });
    if (sort === "top") {
      params.set("sort", "top");
    } else {
      params.set("sort", "latest");
    }
    if (since) {
      params.set("since", since);
    }
    if (until) {
      params.set("until", until);
    }
    if (mentions) {
      params.set("mentions", mentions);
    }
    if (domain) {
      params.set("domain", domain);
    }
    if (targetUrl) {
      params.set("url", targetUrl);
    }
    if (languages.length > 0) {
      params.set("lang", languages[0]);
    }
    if (mode === "reposts") {
      limitations.push(t("searchCopyUrlLimitationModeReposts"));
    } else if (actor) {
      params.set("author", actor);
    }
    if (String(payload?.mediaFilter || "all").trim() !== "all") {
      limitations.push(t("searchCopyUrlLimitationMedia"));
    }
    if (String(payload?.postTypeFilter || "all").trim() !== "all") {
      limitations.push(t("searchCopyUrlLimitationPostType"));
    }
    if (languages.length > 1) {
      limitations.push(t("searchCopyUrlLimitationMultiLang"));
    }
    return {
      url: `https://bsky.app/search?${params.toString()}`,
      limitations
    };
  }

  /**
   * Builds the display label for one locally saved search based on search preferences.
   * @param {object} preferences - Search preferences that should be named.
   * @returns {string} Human-readable search label.
   */
  function buildSavedSearchLabelFromPreferences(preferences = {}) {
    const normalizedPreferences = normalizeSearchPreferencesForStorage(preferences);
    if (normalizedPreferences.query) {
      return normalizedPreferences.query;
    }
    if (normalizedPreferences.tags.length > 0) {
      const displayTags = normalizedPreferences.tags.map(tag => {
        return getDisplayHashtag(tag);
      }).filter(Boolean);
      if (displayTags.length === 1) {
        return `#${displayTags[0]}`;
      }
      if (displayTags.length > 1) {
        return displayTags.slice(0, 2).map(tag => {
          return `#${tag}`;
        }).join(" + ");
      }
    }
    if (normalizedPreferences.actor) {
      return `@${normalizedPreferences.actor.replace(/^@+/, "")}`;
    }
    if (normalizedPreferences.domain) {
      return normalizedPreferences.domain;
    }
    if (normalizedPreferences.url) {
      return normalizedPreferences.url;
    }
    if (normalizedPreferences.mode === "hashtags") {
      return t("searchModeHashtags");
    }
    if (normalizedPreferences.mode === "reposts") {
      return t("searchModeReposts");
    }
    if (normalizedPreferences.mode === "posts") {
      return t("searchModePosts");
    }
    return t("savedSearchFallbackTitle");
  }
  return {
    topic: buildSearchTopicText,
    details: buildSearchDetailTexts,
    summary: buildSearchSummaryText,
    loaded: buildSearchLoadedStatus,
    progress: buildSearchProgressStatus,
    detailed: shouldShowDetailedSearchProgress,
    sharedUrl: buildBskySearchUrlFromPayload,
    savedLabel: buildSavedSearchLabelFromPreferences
  };
}

/**
 * Creates saved-search URL, label, metadata, normalization and construction models.
 * @param {object} options - Translation, preference/URL/label helpers and ISO/timestamp/random adapters.
 * @returns {object} Frozen parse, label, meta, normalize, find and construction operations.
 */
export function createSavedSearchModels(options) {
  for (const name of ["translate", "normalizePreferences", "labelFromPreferences", "sharedUrl", "getString", "normalizeSort", "now", "timestamp", "random"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`Saved search requires ${name}.`);
    }
  }
  /**
   * Parses a shared Bluesky search URL into searchPosts parameters.
   * @param {string} sourceUrl - Shared bsky.app search URL.
   * @returns {object} Normalized source URL and API search params.
   */
  function parseSavedSearchUrl(sourceUrl) {
    const raw = String(sourceUrl || "").trim();
    if (!raw) {
      throw new Error(options.translate("savedSearchUrlInvalid"));
    }

    let parsedUrl = null;
    try {
      parsedUrl = new URL(raw);
    } catch {
      throw new Error(options.translate("savedSearchUrlInvalid"));
    }

    const path = parsedUrl.pathname.replace(/\/+$/g, "");
    const host = parsedUrl.hostname.toLowerCase();
    if (host !== "bsky.app" && !host.endsWith(".bsky.app")) {
      throw new Error(options.translate("savedSearchUrlInvalid"));
    }
    if (path !== "/search") {
      throw new Error(options.translate("savedSearchUrlInvalid"));
    }

    const params = parsedUrl.searchParams;
    const searchParams = {
      q: options.getString(params, "q"),
      tag: params.getAll("tag").map((tag) => String(tag || "").trim().replace(/^#+/, "")).filter(Boolean),
      sort: options.normalizeSort(options.getString(params, "sort")),
      since: options.getString(params, "since"),
      until: options.getString(params, "until"),
      author: options.getString(params, "author"),
      mentions: options.getString(params, "mentions"),
      lang: options.getString(params, "lang"),
      domain: options.getString(params, "domain"),
      url: options.getString(params, "url"),
    };

    if (!searchParams.q && searchParams.tag.length === 0 && !searchParams.author && !searchParams.domain && !searchParams.url) {
      throw new Error(options.translate("savedSearchUrlInvalid"));
    }

    return {
      sourceUrl: parsedUrl.toString(),
      params: searchParams,
    };
  }

  /**
   * Builds a stable label for a saved search.
   * @param {object} search - Normalized saved search entry.
   * @returns {string} Human-readable search label.
   */
  function buildSavedSearchLabel(search = {}) {
    if (search.searchPreferences) {
      return options.labelFromPreferences(search.searchPreferences);
    }
    const params = search.params || {};
    const q = String(params.q || "").trim();
    if (q) {
      return q;
    }
    let tags = [];
    if (Array.isArray(params.tag)) {
      tags = params.tag;
    }
    if (tags.length > 0) {
      return `#${tags[0]}`;
    }
    const author = String(params.author || "").trim();
    if (author) {
      return `@${author.replace(/^@+/, "")}`;
    }
    const domain = String(params.domain || "").trim();
    if (domain) {
      return domain;
    }
    const url = String(params.url || "").trim();
    if (url) {
      return url;
    }
    return options.translate("savedSearchFallbackTitle");
  }

  /**
   * Builds a compact metadata line for a saved search.
   * @param {object} search - Normalized saved search entry.
   * @returns {string} Metadata summary for list display.
   */
  function buildSavedSearchMeta(search = {}) {
    if (search.searchPreferences) {
      const preferences = options.normalizePreferences(search.searchPreferences);
      const parts = [];
      if (preferences.mode === "posts") {
        parts.push(options.translate("searchModePosts"));
      } else if (preferences.mode === "reposts") {
        parts.push(options.translate("searchModeReposts"));
      } else if (preferences.mode === "hashtags") {
        parts.push(options.translate("searchModeHashtags"));
      } else {
        parts.push(options.translate("searchModeNetwork"));
      }
      if (preferences.actor) {
        parts.push(`@${preferences.actor.replace(/^@+/, "")}`);
      }
      preferences.tags.forEach((tag) => {
        parts.push(`#${tag}`);
      });
      if (preferences.tags.length > 1) {
        if (preferences.tagMatchMode === "any") {
          parts.push(options.translate("searchTagMatchAny"));
        } else {
          parts.push(options.translate("searchTagMatchAll"));
        }
      }
      if (preferences.postTypeFilter !== "all") {
        parts.push(preferences.postTypeFilter);
      }
      if (preferences.mediaFilter !== "all") {
        parts.push(preferences.mediaFilter);
      }
      if (preferences.langs.length > 0) {
        parts.push(preferences.langs.join(", "));
      }
      if (preferences.domain) {
        parts.push(`domain: ${preferences.domain}`);
      }
      if (preferences.url) {
        parts.push(`url: ${preferences.url}`);
      }
      if (parts.length > 0) {
        return parts.join(" · ");
      }
    }

    const params = search.params || {};
    const parts = [];
    let tags = [];
    if (Array.isArray(params.tag)) {
      tags = params.tag;
    }
    tags.forEach((tag) => {
      parts.push(`#${tag}`);
    });
    if (params.sort) {
      parts.push(params.sort);
    }
    ["author", "mentions", "lang", "domain", "since", "until"].forEach((key) => {
      const value = String(params[key] || "").trim();
      if (value) {
        parts.push(`${key}: ${value}`);
      }
    });
    if (parts.length === 0) {
      return options.translate("savedSearchMetaDefault");
    }
    return parts.join(" · ");
  }

  /**
   * Normalizes locally saved search entries from settings or backup.
   * @param {Array<object>} searches - Raw saved search entries.
   * @returns {Array<object>} Clean saved search entries.
   */
  function normalizeSavedSearches(searches) {
    if (!Array.isArray(searches)) {
      return [];
    }

    const seen = new Set();
    const normalized = [];
    searches.forEach((search, index) => {
      let parsed = null;
      try {
        parsed = parseSavedSearchUrl(search?.sourceUrl || search?.url || "");
      } catch {
        return;
      }
      const normalizedSearchPreferences = options.normalizePreferences(search?.searchPreferences || parsed.params || {});
      const sourceKey = `${parsed.sourceUrl.toLowerCase()}::${JSON.stringify(normalizedSearchPreferences)}`;
      if (seen.has(sourceKey)) {
        return;
      }
      seen.add(sourceKey);
      let id = String(search?.id || "").trim();
      if (!id) {
        id = `search-${index + 1}-${options.random().toString(36).slice(2, 8)}`;
      }
      const entry = {
        id,
        sourceUrl: parsed.sourceUrl,
        params: parsed.params,
        searchPreferences: normalizedSearchPreferences,
        label: String(search?.label || "").trim(),
        createdAt: String(search?.createdAt || options.now()).trim(),
        updatedAt: String(search?.updatedAt || search?.createdAt || options.now()).trim(),
        lastLoadedAt: String(search?.lastLoadedAt || "").trim(),
      };
      if (!entry.label) {
        entry.label = buildSavedSearchLabel(entry);
      }
      normalized.push(entry);
    });
    return normalized.slice(0, 100);
  }

  /**
   * Finds a saved search by id.
   * @param {Array<object>} searches - Saved entries to search.
   * @param {string} id - Saved search id.
   * @returns {object|null} Saved search entry or null.
   */
  function getSavedSearchById(searches, id) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId || !Array.isArray(searches)) {
      return null;
    }
    return searches.find((search) => search.id === normalizedId) || null;
  }

  /**
   * Creates a saved search entry from a shared Bluesky search URL.
   * @param {string} sourceUrl - Shared bsky.app search URL.
   * @returns {object} Saved search entry.
   */
  function createSavedSearchFromUrl(sourceUrl) {
    const parsed = parseSavedSearchUrl(sourceUrl);
    const now = options.now();
    const entry = {
      id: `search-${options.timestamp().toString(36)}-${options.random().toString(36).slice(2, 8)}`,
      sourceUrl: parsed.sourceUrl,
      params: parsed.params,
      label: "",
      createdAt: now,
      updatedAt: now,
      lastLoadedAt: "",
    };
    entry.label = buildSavedSearchLabel(entry);
    return entry;
  }

  /**
   * Creates a saved search entry from full Threadline search preferences.
   * @param {object} preferences - Search preferences to store.
   * @returns {object} Saved-search entry with Threadline-specific parameters.
   */
  function createSavedSearchFromPreferences(preferences = {}) {
    const normalizedPreferences = options.normalizePreferences(preferences);
    const urlResult = options.sharedUrl(normalizedPreferences);
    const parsed = parseSavedSearchUrl(urlResult.url);
    const now = options.now();
    return {
      id: `search-${options.timestamp().toString(36)}-${options.random().toString(36).slice(2, 8)}`,
      sourceUrl: parsed.sourceUrl,
      params: parsed.params,
      searchPreferences: normalizedPreferences,
      label: options.labelFromPreferences(normalizedPreferences),
      createdAt: now,
      updatedAt: now,
      lastLoadedAt: "",
    };
  }
  return Object.freeze({ parse: parseSavedSearchUrl, label: buildSavedSearchLabel, meta: buildSavedSearchMeta, normalize: normalizeSavedSearches, find: getSavedSearchById, fromUrl: createSavedSearchFromUrl, fromPreferences: createSavedSearchFromPreferences });
}
