/**
 * Creates saved-search workflows without owning page elements or workspace state.
 * @param {object} options - Collection accessors, models, preference normalization/equality,
 * persistence, clock, translation/status, dialog and workspace adapters.
 * @param {object} options.models - Saved-search normalize/find/fromPreferences/fromUrl/label API.
 * @returns {{save: Function, addUrl: Function, remove: Function, load: Function}} Async saved-search operations.
 */
export function createSavedSearchController(options) {
  for (const name of ["getSearches", "setSearches", "preferences", "normalizePreferences", "equal", "persist", "now", "t",
    "status", "dialogStatus", "clearInput", "renderDialog", "closeDialog", "explorerSearchId", "resetExplorer",
    "renderExplorer", "archiveSearchId", "clearArchive", "applyExplorer", "applyArchive", "invalidateSearch", "applySearch"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`Saved-search controller requires ${name}.`);
    }
  }
  for (const name of ["normalize", "find", "fromPreferences", "fromUrl", "label"]) {
    if (typeof options.models?.[name] !== "function") {
      throw new TypeError(`Saved-search controller requires models.${name}.`);
    }
  }
  const models = options.models;
  /** Saves meaningful form preferences, retaining preference-based duplicate detection.
   * @returns {Promise<void>} Completion after persistence and status update.
   */
  async function save() {
    const preferences = options.normalizePreferences(options.preferences());
    const hasAnyValue = Boolean(preferences.query) || Boolean(preferences.actor) || preferences.tags.length > 0
      || Boolean(preferences.excludeText) || Boolean(preferences.mentions) || preferences.langs.length > 0
      || Boolean(preferences.domain) || Boolean(preferences.url) || Boolean(preferences.since) || Boolean(preferences.until)
      || preferences.mode !== "network" || preferences.mediaFilter !== "all" || preferences.postTypeFilter !== "all";
    if (!hasAnyValue) {
      options.status(options.t("searchSaveEmptyWarning"));
      return;
    }
    const existing = options.getSearches().find((search) => options.equal(search.searchPreferences || search.params || {}, preferences));
    if (existing) {
      options.status(options.t("searchSaveAlreadyExists"));
      return;
    }
    const entry = models.fromPreferences(preferences);
    options.setSearches(models.normalize([entry, ...options.getSearches()]));
    await options.persist();
    options.status(options.t("searchSaveSuccess", { title: entry.label }));
  }
  /** Adds a shared URL, retaining case-insensitive source-URL duplicate detection.
   * @param {string} sourceUrl - Shared search URL from the input.
   * @returns {Promise<void>} Completion after persistence and dialog rendering; invalid URLs reject.
   */
  async function addUrl(sourceUrl) {
    const entry = models.fromUrl(String(sourceUrl || "").trim());
    const existing = options.getSearches().find((search) => search.sourceUrl.toLowerCase() === entry.sourceUrl.toLowerCase());
    if (existing) {
      options.dialogStatus(options.t("savedSearchAlreadyExists"));
      return;
    }
    options.setSearches(models.normalize([entry, ...options.getSearches()]));
    options.clearInput();
    await options.persist();
    options.renderDialog();
  }
  /** Removes a saved entry and clears active explorer/archive references before persisting.
   * @param {string} id - Saved entry ID; blank IDs are ignored.
   * @returns {Promise<void>} Completion after settings and affected views are refreshed.
   */
  async function remove(id) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) {
      return;
    }
    options.setSearches(options.getSearches().filter((search) => search.id !== normalizedId));
    if (options.explorerSearchId() === normalizedId) {
      options.resetExplorer();
    }
    if (options.archiveSearchId() === normalizedId) {
      options.clearArchive();
    }
    await options.persist();
    options.renderDialog();
    options.renderExplorer();
  }
  /** Applies a saved entry to a workspace, recording usage before closing the dialog.
   * @param {string} id - Saved entry ID; unknown IDs are ignored.
   * @param {string} context - search, archive or threadExplorer.
   * @returns {Promise<void>} Completion after the selected workspace's persistence/rendering.
   */
  async function load(id, context) {
    if (!["search", "archive", "threadExplorer"].includes(context)) {
      throw new TypeError("Unknown saved-search workspace.");
    }
    const search = models.find(options.getSearches(), id);
    if (!search) {
      return;
    }
    if (context === "search") {
      // Invalidate synchronously: persistence must not let an older response update the form.
      options.invalidateSearch();
    }
    search.lastLoadedAt = options.now();
    search.updatedAt = search.lastLoadedAt;
    await options.persist();
    options.closeDialog();
    if (context === "threadExplorer") {
      options.applyExplorer(`search:${search.id}`);
    } else if (context === "archive") {
      await options.applyArchive(search);
    } else {
      options.applySearch(search.searchPreferences || search.params || {});
      await options.persist();
      options.status(options.t("searchLoadSavedStatus", { title: search.label || models.label(search) }));
    }
  }
  return Object.freeze({ save, addUrl, remove, load });
}

/**
 * Creates the search run and persisted-result controller.
 * @param {object} options - Live state; account/form/model adapters; worker request/control,
 * ID, translation, progress/status, rendering, persistence and error-reporting callbacks.
 * @param {object} options.state - Mutable result, cursor, preferences, run ID, loading and cancellation state.
 * @param {number} options.maxItems - Persisted result limit.
 * @returns {{load: Function, cancel: Function, invalidate: Function, snapshot: Function, matches: Function, restore: Function, restoreStatus: Function}} Run operations.
 */
export function createSearchRunController(options) {
  for (const name of ["account", "payload", "preferences", "enforceSort", "normalize", "items", "snapshot", "match", "request", "control", "id", "detailed", "progress", "loaded", "status", "render", "results", "persist", "t", "count", "report"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`Search controller requires ${name}.`);
    }
  }
  if (!options.state) {
    throw new TypeError("Search controller requires live state.");
  }
  const state = options.state;
  /** Resolves request identity independently of the URL import field.
   * @param {object} preferences - Form or request snapshot.
   * @param {string} account - Effective account, including startup before global identity is applied.
   * @returns {object} Normalized effective query.
   */
  function identity(preferences, account = options.account()) {
    const normalized = options.normalize(preferences);
    normalized.sourceUrl = "";
    if (!normalized.actor && (normalized.mode === "posts" || normalized.mode === "reposts")) {
      normalized.actor = String(account || "").trim();
    }
    return normalized;
  }
  /** Checks whether continuation still belongs to the current form.
   * @returns {boolean} True when the effective request matches the result snapshot.
   */
  function matches() {
    return options.match(options.preferences(), state.searchResultPreferences, identity);
  }
  /** Builds a reload-safe result snapshot through the existing shared helper.
   * @returns {object|null} Clamped results and their effective request identity.
   */
  function snapshot() {
    return options.snapshot(state.searchResultPreferences, state.searchResults, state.searchCursor,
      options.maxItems, options.items, identity);
  }
  /** Invalidates replies before reset or a saved-query selection and stops the worker best-effort.
   * @returns {void}
   */
  function invalidate() {
    const runId = state.activeSearchRunId;
    state.activeSearchRunId = "";
    state.searchLoading = false;
    state.searchCancelPending = false;
    if (runId) {
      void options.control({ runId, action: "cancel" }, { timeoutMs: 30000 }).catch(options.report);
    }
  }
  /** Restores results only when their stored identity matches the restored form.
   * @param {object|null} stored - Saved result state. @param {object} preferences - Restored form values.
   * @param {string} account - Account from the same startup bundle as the saved results.
   * @returns {void}
   */
  function restore(stored = null, preferences = {}, account = options.account()) {
    invalidate();
    state.searchResults = [];
    state.searchCursor = "";
    state.searchResultPreferences = null;
    if (!stored || typeof stored !== "object") {
      return;
    }
    state.searchResultPreferences = identity(stored.preferences || {}, account);
    if (!options.match(preferences, state.searchResultPreferences, (value) => identity(value, account))) {
      return;
    }
    state.searchResults = options.items(stored.items);
    state.searchCursor = String(stored.cursor || "").trim();
  }
  /** Restores the idle/loaded status without overwriting live progress.
   * @returns {void}
   */
  function restoreStatus() {
    if (state.searchLoading) {
      return;
    }
    if (state.searchResults.length > 0) {
      options.status(options.loaded(state.searchResults.length, Boolean(state.searchCursor)));
    } else {
      options.status(options.t("searchStatusIdle"));
    }
  }
  /** Loads a fresh page or a matching continuation and ignores invalidated runs.
   * @param {object} settings - Optional append flag. @returns {Promise<void>} Run completion.
   */
  async function load(settings = {}) {
    if (!options.account() || state.searchLoading) {
      return;
    }
    const append = settings?.append === true && matches();
    options.enforceSort(false);
    const payload = options.payload();
    const runId = options.id();
    let cursor = "";
    let excludeUris = [];
    if (append) {
      cursor = state.searchCursor;
      excludeUris = state.searchResults.map((item) => String(item?.post?.uri || "").trim()).filter(Boolean);
    } else {
      state.searchCursor = "";
    }
    state.activeSearchRunId = runId;
    state.searchCancelPending = false;
    state.searchLoading = true;
    if (append) {
      options.status(options.t("searchStatusLoadingMore"));
    } else {
      options.status(options.t("searchStatusLoading"));
    }
    options.render();
    try {
      const result = await options.request({ ...payload, runId, cursor, excludeUris, limit: 25 }, {
        timeoutMs: 420000,
        onProgress(progress) {
          if (state.activeSearchRunId === runId && options.detailed(payload)) {
            options.status(options.progress(progress));
          }
        },
      });
      if (state.activeSearchRunId !== runId) {
        return;
      }
      let items = [];
      if (Array.isArray(result?.items)) {
        items = result.items;
      }
      if (append) {
        state.searchResults = [...state.searchResults, ...items];
      } else {
        state.searchResults = items;
      }
      state.searchCursor = String(result?.cursor || "").trim();
      state.searchResultPreferences = identity(payload);
      options.results();
      if (result?.cancelled === true) {
        options.status(options.t("searchStatusCancelledPartial", { count: options.count(state.searchResults.length) }));
      } else if (state.searchResults.length > 0) {
        options.status(options.loaded(state.searchResults.length, Boolean(state.searchCursor)));
      } else {
        options.status(options.t("searchStatusEmpty"));
      }
      await options.persist();
    } catch (error) {
      if (state.activeSearchRunId === runId) {
        options.report(error);
        options.status(error?.message || options.t("searchStatusFailed"));
      }
    } finally {
      if (state.activeSearchRunId === runId) {
        state.searchLoading = false;
        state.activeSearchRunId = "";
        state.searchCancelPending = false;
        options.render();
      }
    }
  }
  /** Sends one cancel signal and retains partial results returned by the worker.
   * @returns {Promise<void>} Control request completion.
   */
  async function cancel() {
    const runId = state.activeSearchRunId;
    if (!runId || state.searchCancelPending) {
      return;
    }
    state.searchCancelPending = true;
    options.status(options.t("searchStatusCancelling"));
    options.render();
    try {
      await options.control({ runId, action: "cancel" }, { timeoutMs: 30000 });
    } catch (error) {
      if (state.activeSearchRunId === runId) {
        options.report(error);
        options.status(error?.message || options.t("searchStatusFailed"));
      }
    } finally {
      if (state.activeSearchRunId === runId) {
        state.searchCancelPending = false;
        options.render();
      }
    }
  }
  return { load, cancel, invalidate, snapshot, matches, restore, restoreStatus };
}
