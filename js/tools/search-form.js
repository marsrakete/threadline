/**
 * Owns search form snapshots, URL import, language/sort rules, reset and private debounce timers.
 * @param {object} options - Explicit form elements, mutable selection state, normalization, parser, timer, hydration, account, UI and persistence adapters.
 * @returns {object} mode, updateMode, payload, preferences, apply, schedulePersist, applyUrl, importUrl, scheduleUrl, clear, renderLanguage, multiLanguage, enforceSort, updateSort operations.
 */
export function createSearchFormController(options) {
  for (const name of ["t", "languages", "selectedTags", "displayTag", "tags", "parseUrl", "splitQuery", "renderTags", "renderWorkspace", "renderResults", "persist", "announce", "languageName", "account", "locale", "hydrated", "schedule", "clearTimer", "invalidate"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`Search requires ${name}.`);
    }
  }
  if (!options.state || !options.elements) {
    throw new TypeError("Search form requires elements and state.");
  }
  const state = options.state;
  const {
    searchModeSelect,
    searchActorField,
    searchTagsField,
    searchSortField,
    searchModeNote,
    searchActorInput,
    searchQueryInput,
    searchTagMatchSelect,
    searchMediaSelect,
    searchPostTypeSelect,
    searchSortSelect,
    searchExcludeTextInput,
    searchMentionsInput,
    searchDomainInput,
    searchTargetUrlInput,
    searchSinceInput,
    searchUntilInput,
    searchUrlInput,
    searchUrlStatus,
    searchStatus,
    searchLanguageSummary
  } = options.elements;
  const MAX_SEARCH_LANGUAGES = options.maxLanguages;
  let searchUrlImportTimer = 0;
  let searchPreferencesPersistTimer = 0;
  const t = options.t;
  const normalizePostLanguageTags = options.languages;
  const normalizeSelectedHashtagEntries = options.selectedTags;
  const getDisplayHashtag = options.displayTag;
  const normalizeHashtagEntries = options.tags;
  const parseSavedSearchUrl = options.parseUrl;
  const splitSharedSearchQuery = options.splitQuery;
  const renderHashtagCloud = options.renderTags;
  const renderSearchWorkspace = options.renderWorkspace;
  const renderSearchResults = options.renderResults;
  const persistSettings = options.persist;
  const setStatus = options.announce;
  const getPostLanguageDisplayName = options.languageName;
  const readAccount = options.account;
  const readLocale = options.locale;
  const isHydrated = options.hydrated;
  const schedule = options.schedule;
  const clearTimer = options.clearTimer;
  const invalidateRun = options.invalidate;
  /**
   * Returns the normalized active search mode from the workspace controls.
   * @returns {string} One of `network`, `posts`, `reposts`, or `hashtags`.
   */
  function getSearchMode() {
    const mode = String(searchModeSelect?.value || "network").trim();
    if (mode === "posts") {
      return "posts";
    }
    if (mode === "reposts") {
      return "reposts";
    }
    if (mode === "hashtags") {
      return "hashtags";
    }
    return "network";
  }

  /**
   * Updates labels, field visibility, and helper text for the active search mode.
   * @returns {void}
   */
  function updateSearchModeUi() {
    const mode = getSearchMode();
    if (searchActorField) {
      searchActorField.hidden = false;
    }
    if (searchTagsField) {
      searchTagsField.hidden = false;
    }
    if (searchSortField) {
      searchSortField.hidden = false;
    }
    if (searchModeNote) {
      searchModeNote.textContent = t("searchModeNoteNetwork");
    }
    if (mode === "posts") {
      if (searchSortField) {
        searchSortField.hidden = true;
      }
      if (searchModeNote) {
        searchModeNote.textContent = t("searchModeNotePosts");
      }
      return;
    }
    if (mode === "reposts") {
      if (searchSortField) {
        searchSortField.hidden = true;
      }
      if (searchModeNote) {
        searchModeNote.textContent = t("searchModeNoteReposts");
      }
      return;
    }
    if (mode === "hashtags") {
      if (searchModeNote) {
        searchModeNote.textContent = t("searchModeNoteHashtags");
      }
    }
  }

  /**
   * Collects the current search controls into one request payload for the service worker.
   * @returns {object} Search request payload.
   */
  function collectSearchRequestPayload() {
    const payload = getSearchPreferences();
    delete payload.sourceUrl;
    if (!payload.actor && (payload.mode === "posts" || payload.mode === "reposts")) {
      payload.actor = String(readAccount() || "").trim();
    }
    return payload;
  }

  /**
   * Reads the current search form into a persistable preferences object.
   * @returns {object} Search form state for reload-safe persistence.
   */
  function getSearchPreferences() {
    state.searchSelectedLanguages = normalizePostLanguageTags(state.searchSelectedLanguages, MAX_SEARCH_LANGUAGES);
    const selectedSearchTags = normalizeSelectedHashtagEntries(state.searchSelectedHashtags, state.hashtags).map(tag => {
      return getDisplayHashtag(tag);
    });
    return {
      sourceUrl: String(searchUrlInput?.value || "").trim(),
      mode: getSearchMode(),
      query: String(searchQueryInput?.value || "").trim(),
      actor: String(searchActorInput?.value || "").trim(),
      tags: selectedSearchTags,
      tagMatchMode: String(searchTagMatchSelect?.value || "all").trim(),
      mediaFilter: String(searchMediaSelect?.value || "all").trim(),
      postTypeFilter: String(searchPostTypeSelect?.value || "all").trim(),
      sort: String(searchSortSelect?.value || "latest").trim(),
      excludeText: String(searchExcludeTextInput?.value || "").trim(),
      mentions: String(searchMentionsInput?.value || "").trim(),
      langs: [...state.searchSelectedLanguages],
      lang: String(state.searchSelectedLanguages[0] || "").trim(),
      domain: String(searchDomainInput?.value || "").trim(),
      url: String(searchTargetUrlInput?.value || "").trim(),
      since: String(searchSinceInput?.value || "").trim(),
      until: String(searchUntilInput?.value || "").trim()
    };
  }

  /**
   * Applies stored search preferences back into the search form controls.
   * @param {object} preferences - Persisted search form state.
   * @returns {void}
   */
  function applySearchPreferences(preferences = {}) {
    if (searchUrlInput) {
      searchUrlInput.value = String(preferences.sourceUrl || "").trim();
    }
    if (searchModeSelect) {
      const mode = String(preferences.mode || "").trim();
      if (mode === "posts" || mode === "reposts" || mode === "hashtags") {
        searchModeSelect.value = mode;
      } else {
        searchModeSelect.value = "network";
      }
    }
    if (searchQueryInput) {
      searchQueryInput.value = String(preferences.query || "").trim();
    }
    if (searchActorInput) {
      searchActorInput.value = String(preferences.actor || "").trim();
    }
    const importedTags = normalizeHashtagEntries(preferences.tags || []);
    if (importedTags.length > 0) {
      state.hashtags = normalizeHashtagEntries([...(state.hashtags || []), ...importedTags]);
    }
    state.searchSelectedHashtags = normalizeSelectedHashtagEntries(preferences.tags || [], state.hashtags);
    if (searchTagMatchSelect) {
      const tagMatchMode = String(preferences.tagMatchMode || "").trim();
      if (tagMatchMode === "any") {
        searchTagMatchSelect.value = "any";
      } else {
        searchTagMatchSelect.value = "all";
      }
    }
    if (searchMediaSelect) {
      let mediaFilter;
      if (["images", "videos", "none"].includes(String(preferences.mediaFilter || "").trim())) {
        mediaFilter = String(preferences.mediaFilter || "").trim();
      } else {
        mediaFilter = "all";
      }
      searchMediaSelect.value = mediaFilter;
    }
    if (searchPostTypeSelect) {
      const rawPostTypeFilter = String(preferences.postTypeFilter || "").trim();
      if (rawPostTypeFilter === "posts") {
        searchPostTypeSelect.value = "originals";
      } else if (["originals", "replies", "quotes", "reposts", "non-reposts"].includes(rawPostTypeFilter)) {
        searchPostTypeSelect.value = rawPostTypeFilter;
      } else {
        searchPostTypeSelect.value = "all";
      }
    }
    if (searchSortSelect) {
      if (String(preferences.sort || "").trim() === "top") {
        searchSortSelect.value = "top";
      } else {
        searchSortSelect.value = "latest";
      }
    }
    if (searchExcludeTextInput) {
      searchExcludeTextInput.value = String(preferences.excludeText || "").trim();
    }
    if (searchMentionsInput) {
      searchMentionsInput.value = String(preferences.mentions || "").trim();
    }
    let storedSearchLanguages;
    if (Array.isArray(preferences.langs)) {
      storedSearchLanguages = preferences.langs;
    } else {
      storedSearchLanguages = [];
    }
    if (storedSearchLanguages.length > 0) {
      state.searchSelectedLanguages = normalizePostLanguageTags(storedSearchLanguages, MAX_SEARCH_LANGUAGES);
    } else {
      let legacyLanguages;
      if (preferences.lang) {
        legacyLanguages = [preferences.lang];
      } else {
        legacyLanguages = [];
      }
      state.searchSelectedLanguages = normalizePostLanguageTags(legacyLanguages, MAX_SEARCH_LANGUAGES);
    }
    enforceSearchSortConstraints(false);
    if (searchDomainInput) {
      searchDomainInput.value = String(preferences.domain || "").trim();
    }
    if (searchTargetUrlInput) {
      searchTargetUrlInput.value = String(preferences.url || "").trim();
    }
    if (searchSinceInput) {
      searchSinceInput.value = String(preferences.since || "").trim();
    }
    if (searchUntilInput) {
      searchUntilInput.value = String(preferences.until || "").trim();
    }
  }

  /**
   * Persists the current search form with a short debounce to avoid excessive writes.
   * @returns {void}
   */
  function scheduleSearchPreferencesPersist() {
    if (!isHydrated()) {
      return;
    }
    if (searchPreferencesPersistTimer) {
      clearTimer(searchPreferencesPersistTimer);
    }
    searchPreferencesPersistTimer = schedule(() => {
      searchPreferencesPersistTimer = 0;
      void persistSettings();
    }, 280);
  }

  /**
   * Applies a shared Bluesky search URL to the search workspace controls.
   * @param {string} sourceUrl - Shared `bsky.app/search` URL.
   * @returns {boolean} True when the URL was parsed successfully.
   */
  function applySearchUrlToForm(sourceUrl) {
    const parsed = parseSavedSearchUrl(sourceUrl);
    const params = parsed.params || {};
    const importedTags = normalizeHashtagEntries(params.tag || []);
    const splitQuery = splitSharedSearchQuery(params.q || "");
    if (importedTags.length > 0) {
      state.hashtags = normalizeHashtagEntries([...(state.hashtags || []), ...importedTags]);
    }
    if (searchUrlInput) {
      searchUrlInput.value = parsed.sourceUrl;
    }
    if (searchModeSelect) {
      if (Array.isArray(params.tag) && params.tag.length > 0) {
        searchModeSelect.value = "hashtags";
      } else {
        searchModeSelect.value = "network";
      }
    }
    if (searchQueryInput) {
      searchQueryInput.value = splitQuery.query;
    }
    if (searchActorInput) {
      searchActorInput.value = String(params.author || "").trim();
    }
    if (searchSortSelect) {
      if (String(params.sort || "").trim() === "top") {
        searchSortSelect.value = "top";
      } else {
        searchSortSelect.value = "latest";
      }
    }
    if (searchExcludeTextInput) {
      searchExcludeTextInput.value = splitQuery.excludeText;
    }
    if (searchMentionsInput) {
      searchMentionsInput.value = String(params.mentions || "").trim();
    }
    let importedLanguages;
    if (params.lang) {
      importedLanguages = [params.lang];
    } else {
      importedLanguages = [];
    }
    state.searchSelectedLanguages = normalizePostLanguageTags(importedLanguages, MAX_SEARCH_LANGUAGES);
    enforceSearchSortConstraints(false);
    if (searchDomainInput) {
      searchDomainInput.value = String(params.domain || "").trim();
    }
    if (searchTargetUrlInput) {
      searchTargetUrlInput.value = String(params.url || "").trim();
    }
    if (searchSinceInput) {
      searchSinceInput.value = String(params.since || "").trim();
    }
    if (searchUntilInput) {
      searchUntilInput.value = String(params.until || "").trim();
    }
    state.searchSelectedHashtags = normalizeSelectedHashtagEntries(params.tag || [], state.hashtags);
    updateSearchModeUi();
    renderHashtagCloud();
    renderSearchWorkspace();
    if (searchUrlStatus) {
      searchUrlStatus.textContent = t("searchUrlImported");
    }
    scheduleSearchPreferencesPersist();
    return true;
  }

  /**
   * Attempts to import a shared search URL from the dedicated input field.
   * @returns {void}
   */
  function importSearchUrlFromField() {
    const rawValue = String(searchUrlInput?.value || "").trim();
    if (!rawValue) {
      if (searchUrlStatus) {
        searchUrlStatus.textContent = "";
      }
      scheduleSearchPreferencesPersist();
      return;
    }
    try {
      applySearchUrlToForm(rawValue);
    } catch (error) {
      if (searchUrlStatus) {
        searchUrlStatus.textContent = error?.message || t("searchUrlInvalid");
      }
    }
  }

  /**
   * Schedules automatic import after a paste or manual edit in the search URL field.
   * @returns {void}
   */
  function scheduleSearchUrlImport() {
    if (searchUrlImportTimer) {
      clearTimer(searchUrlImportTimer);
    }
    searchUrlImportTimer = schedule(() => {
      searchUrlImportTimer = 0;
      importSearchUrlFromField();
    }, 30);
  }

  /**
   * Clears all live search controls and resets the current result state.
   * @returns {Promise<void>} Resolves after settings were persisted.
   */
  async function clearSearchForm() {
    invalidateRun();
    if (searchUrlImportTimer) {
      clearTimer(searchUrlImportTimer);
      searchUrlImportTimer = 0;
    }
    if (searchPreferencesPersistTimer) {
      clearTimer(searchPreferencesPersistTimer);
      searchPreferencesPersistTimer = 0;
    }
    if (searchUrlInput) {
      searchUrlInput.value = "";
    }
    if (searchQueryInput) {
      searchQueryInput.value = "";
    }
    if (searchActorInput) {
      searchActorInput.value = "";
    }
    if (searchModeSelect) {
      searchModeSelect.value = "network";
    }
    if (searchMediaSelect) {
      searchMediaSelect.value = "all";
    }
    if (searchPostTypeSelect) {
      searchPostTypeSelect.value = "all";
    }
    if (searchSortSelect) {
      searchSortSelect.value = "latest";
    }
    if (searchExcludeTextInput) {
      searchExcludeTextInput.value = "";
    }
    if (searchMentionsInput) {
      searchMentionsInput.value = "";
    }
    if (searchDomainInput) {
      searchDomainInput.value = "";
    }
    if (searchTargetUrlInput) {
      searchTargetUrlInput.value = "";
    }
    if (searchSinceInput) {
      searchSinceInput.value = "";
    }
    if (searchUntilInput) {
      searchUntilInput.value = "";
    }
    state.searchSelectedLanguages = [];
    state.searchSelectedHashtags = [];
    state.searchResults = [];
    state.searchCursor = "";
    state.searchResultPreferences = null;
    if (searchUrlStatus) {
      searchUrlStatus.textContent = "";
    }
    if (searchStatus) {
      searchStatus.textContent = t("searchStatusIdle");
    }
    renderHashtagCloud();
    renderSearchResults();
    renderSearchWorkspace();
    await persistSettings();
  }

  /**
   * Renders the compact language summary in the search workspace.
   * @returns {void}
   */
  function renderSearchLanguageSummary() {
    if (!searchLanguageSummary) {
      return;
    }
    state.searchSelectedLanguages = normalizePostLanguageTags(state.searchSelectedLanguages, MAX_SEARCH_LANGUAGES);
    if (!state.searchSelectedLanguages.length) {
      searchLanguageSummary.textContent = "";
      return;
    }
    if (state.searchSelectedLanguages.length === 1) {
      searchLanguageSummary.textContent = t("searchLanguageSummarySingle", {
        language: getPostLanguageDisplayName(state.searchSelectedLanguages[0], readLocale())
      });
      return;
    }
    const labels = state.searchSelectedLanguages.map(tag => {
      return getPostLanguageDisplayName(tag, readLocale());
    });
    searchLanguageSummary.textContent = t("searchLanguageSummaryMany", {
      count: labels.length,
      languages: labels.join(", ")
    });
  }

  /**
   * Returns true when more than one search language is active.
   * @returns {boolean} True for multi-language search mode.
   */
  function isSearchMultiLanguageActive() {
    state.searchSelectedLanguages = normalizePostLanguageTags(state.searchSelectedLanguages, MAX_SEARCH_LANGUAGES);
    return state.searchSelectedLanguages.length > 1;
  }

  /**
   * Forces the search sort back to `latest` when multi-language search is active.
   * @param {boolean} announce - True when a user-facing hint should be shown.
   * @returns {void}
   */
  function enforceSearchSortConstraints(announce = false) {
    if (!searchSortSelect) {
      return;
    }
    if (!isSearchMultiLanguageActive()) {
      return;
    }
    if (String(searchSortSelect.value || "").trim() !== "top") {
      return;
    }
    searchSortSelect.value = "latest";
    if (announce) {
      setStatus(t("searchLanguageSortLimitedStatus"));
    }
  }

  /**
   * Updates the search sort dropdown for the active language selection.
   * @returns {void}
   */
  function updateSearchSortOptionState() {
    if (!searchSortSelect) {
      return;
    }
    const topOption = searchSortSelect.querySelector("option[value='top']");
    if (!topOption) {
      return;
    }
    topOption.disabled = isSearchMultiLanguageActive();
  }
  return {
    mode: getSearchMode,
    updateMode: updateSearchModeUi,
    payload: collectSearchRequestPayload,
    preferences: getSearchPreferences,
    apply: applySearchPreferences,
    schedulePersist: scheduleSearchPreferencesPersist,
    applyUrl: applySearchUrlToForm,
    importUrl: importSearchUrlFromField,
    scheduleUrl: scheduleSearchUrlImport,
    clear: clearSearchForm,
    renderLanguage: renderSearchLanguageSummary,
    multiLanguage: isSearchMultiLanguageActive,
    enforceSort: enforceSearchSortConstraints,
    updateSort: updateSearchSortOptionState
  };
}
