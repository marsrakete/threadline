/** Creates persisted app-state reads and draft/settings saves without changing storage format.
* @param {object} options - Storage, image, normalization, account/frontend adapters, models and keys.
* @returns {object} Frozen load/draft/settings API.
*/
globalThis.createThreadlineSettingsService = function createThreadlineSettingsService(options) {
  for (const name of ["readAuth", "readAvatars", "read", "write", "hydrate", "storeImages", "pruneImages", "imageSegments", "imageMetadata", "tags", "selectedTags", "languages", "interaction", "analysis", "avatarAssets", "publicMeta", "webBase"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Settings service requires " + name);
    }
  }
  for (const name of ["card", "cards", "proxy", "provider", "usage", "search", "overrides", "history", "reply", "explorer", "resize", "expert"]) {
    if (typeof options.models?.[name] !== "function") {
      throw new TypeError("Settings service requires model " + name);
    }
  }
  const { readAuth: readStoredAuth, readAvatars: getAccountAvatarCache, read: readStoredValue, write: writeStoredValue, hydrate: hydrateStoredSegmentImages, storeImages: storeComposerImageBlobs, pruneImages: pruneComposerImageBlobs, imageSegments: normalizeSegmentImages, imageMetadata: normalizeSegmentImageMetadata, tags: normalizeHashtagEntries, selectedTags: normalizeSelectedHashtagEntries, languages: normalizePostLanguageTags, interaction: normalizePostInteractionSettings, analysis: normalizeStoredAnalysisState, avatarAssets: normalizeAccountAvatarAssets, publicMeta: getAccountPublicMeta, webBase: resolvePostWebBase, defaultService: DEFAULT_LOGIN_SERVICE, draftKey: DRAFT_KEY, settingsKey: SETTINGS_KEY, localeKey: LOCALE_KEY } = options;
  const { card: normalizeLinkCard, cards: normalizeSegmentLinkCards, proxy: normalizeLinkCardProxySettings, provider: normalizeLinkCardProviderSetting, usage: normalizeLinkCardMicrolinkUsage, search: normalizeStoredSearchResultState, overrides: normalizeSegmentOverrides, history: normalizePostingHistory, reply: normalizeStoredReplyTarget, explorer: normalizeStoredThreadExplorerState, resize: normalizeImageAutoResizeMode, expert: normalizeArchiveExpertMode } = options.models;
  /** Selects an array with existing-value fallback. @param {unknown} value - New input. @param {unknown} existing - Previous input. @returns {Array} Array. */
  function arrayChoice(value, existing) {
    if (Array.isArray(value)) {
      return value;
    }
    return arrayOrEmpty(existing);
  }
  /** Returns an array. @param {unknown} value - Input. @returns {Array} Array. */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Returns an object or null. @param {unknown} value - Input. @returns {object|null} Object. */
  function objectOrNull(value) {
    if (value && typeof value === "object") {
      return value;
    }
    return null;
  }
  /** Keeps existing numeric coercion, including null-to-zero. @param {unknown} value - New value. @param {unknown} existing - Old value. @returns {number|null} Number. */
  function finite(value, existing) {
    if (Number.isFinite(Number(value))) {
      return Number(value);
    }
    if (Number.isFinite(Number(existing))) {
      return Number(existing);
    }
    return null;
  }
  /** Selects an existing theme. @param {unknown} value - New value. @param {unknown} existing - Old value. @returns {string} Theme. */
  function theme(value, existing) {
    if (value === "dark" || value === "light") {
      return value;
    }
    if (existing === "dark") {
      return "dark";
    }
    return "light";
  }
  /** Selects supported hashtag placement. @param {unknown} value - New value. @param {unknown} existing - Old value. @returns {string} Placement. */
  function placement(value, existing) { const choices = ["first", "last", "all-top", "all-bottom"]; if (choices.includes(value)) {
      return value;
    }
    if (choices.includes(existing)) {
      return existing;
    }
    return "first";
  }
  /** Preserves stored app-state getAppState orchestration. @param {object} input - Existing worker payload. @returns {Promise<object>} App state or save acknowledgement. */
  async function getAppState({ browserLocale } = {}) {
    const state = await readStoredAuth();
    const auth = state.accounts.find((entry) => entry.did && entry.did === state.activeDid) || null;
    const accountAvatarCache = await getAccountAvatarCache();
    const draft = await readStoredValue(DRAFT_KEY);
    const storedSettings = await readStoredValue(SETTINGS_KEY);
    const hydratedSegmentImages = await hydrateStoredSegmentImages(storedSettings?.segmentImages || draft?.segmentImages);
    const legacyLocalePreference = await readStoredValue(LOCALE_KEY);
    const hashtags = normalizeHashtagEntries(storedSettings?.hashtags);
    const selectedHashtags = normalizeSelectedHashtagEntries(storedSettings?.selectedHashtags, hashtags);
    const searchSelectedHashtags = normalizeSelectedHashtagEntries(storedSettings?.searchSelectedHashtags, hashtags);
    const searchPreferences = objectOrNull(storedSettings?.searchPreferences);
    const searchResultState = normalizeStoredSearchResultState(storedSettings?.searchResultState);
    const localePreference = storedSettings?.localePreference || legacyLocalePreference;
    let locale = browserLocale || "en";
    if (localePreference && localePreference !== "auto") {
      locale = localePreference;
    }
    let draftText = draft?.sourceText || "";
    if (typeof draft === "string") {
      draftText = draft;
    }

    return {
      authenticated: Boolean(auth?.session?.did),
      identifier: auth?.identifier || "",
      handle: auth?.session?.handle || "",
      did: auth?.did || "",
      service: auth?.service || DEFAULT_LOGIN_SERVICE,
      webApp: auth?.webApp || resolvePostWebBase(auth?.service),
      accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
      accountAvatarAssets: normalizeAccountAvatarAssets(accountAvatarCache?.assets),
      draft: draftText,
      locale,
      localePreference: localePreference || "auto",
      tipsVisible: storedSettings?.tipsVisible !== false,
      altTextRequired: storedSettings?.altTextRequired !== false,
      imageAutoResizeMode: normalizeImageAutoResizeMode(storedSettings?.imageAutoResizeMode),
      archiveExpertMode: normalizeArchiveExpertMode(storedSettings?.archiveExpertMode),
      themeMode: theme(storedSettings?.themeMode),
      compactMode: storedSettings?.compactMode === true,
      sidebarCollapsedDesktop: storedSettings?.sidebarCollapsedDesktop === true,
      desktopLayoutVersion: finite(storedSettings?.desktopLayoutVersion),
      sidebarWidthDesktop: finite(storedSettings?.sidebarWidthDesktop),
      composerWidthDesktop: finite(storedSettings?.composerWidthDesktop),
      postLanguages: normalizePostLanguageTags(storedSettings?.postLanguages),
      appendThreadIntro: storedSettings?.appendThreadIntro === true,
      appendThreadEmoji: storedSettings?.appendThreadEmoji === true,
      addMarkerSpacing: storedSettings?.addMarkerSpacing === true,
      postInteraction: normalizePostInteractionSettings(storedSettings?.postInteraction),
      linkCardProxy: normalizeLinkCardProxySettings(storedSettings?.linkCardProxy),
      linkCardProvider: normalizeLinkCardProviderSetting(storedSettings?.linkCardProvider),
      linkCardMicrolinkUsage: normalizeLinkCardMicrolinkUsage(storedSettings?.linkCardMicrolinkUsage),
      hashtags,
      selectedHashtags,
      searchSelectedHashtags,
      searchPreferences,
      searchResultState,
      hashtagPlacement: placement(storedSettings?.hashtagPlacement),
      segmentImages: hydratedSegmentImages,
      segmentLinkCards: normalizeSegmentLinkCards(draft?.segmentLinkCards || storedSettings?.segmentLinkCards),
      segmentOverrides: normalizeSegmentOverrides(draft?.segmentOverrides),
      replyTarget: normalizeStoredReplyTarget(draft?.replyTarget),
      postingHistory: normalizePostingHistory(storedSettings?.postingHistory),
      threadExplorerFavorites: arrayOrEmpty(storedSettings?.threadExplorerFavorites),
      threadExplorerState: normalizeStoredThreadExplorerState(storedSettings?.threadExplorerState),
      savedSearches: arrayOrEmpty(storedSettings?.savedSearches),
      archivePreferences: objectOrNull(storedSettings?.archivePreferences),
      analysisState: normalizeStoredAnalysisState(storedSettings?.analysisState),
    };
  }

  /** Preserves stored app-state saveDraft orchestration. @param {object} input - Existing worker payload. @returns {Promise<object>} App state or save acknowledgement. */
  async function saveDraft({ draft, segmentImages, segmentLinkCards, segmentOverrides, replyTarget } = {}) {
    const normalizedImages = await storeComposerImageBlobs(segmentImages);
    await writeStoredValue(DRAFT_KEY, {
      sourceText: draft || "",
      segmentImages: normalizeSegmentImageMetadata(normalizedImages),
      segmentLinkCards: normalizeSegmentLinkCards(segmentLinkCards),
      segmentOverrides: normalizeSegmentOverrides(segmentOverrides),
      replyTarget: normalizeStoredReplyTarget(replyTarget),
    });
    await pruneComposerImageBlobs();
    return { ok: true };
  }

  /** Preserves stored app-state saveSettings orchestration. @param {object} input - Existing worker payload. @returns {Promise<object>} App state or save acknowledgement. */
  async function saveSettings(settings = {}) {
    const existing = await readStoredValue(SETTINGS_KEY) || {};
    const hashtags = normalizeHashtagEntries(arrayChoice(settings.hashtags, existing.hashtags));
    const selectedHashtags = normalizeSelectedHashtagEntries(arrayChoice(settings.selectedHashtags, existing.selectedHashtags), hashtags);
    const searchSelectedHashtags = normalizeSelectedHashtagEntries(arrayChoice(settings.searchSelectedHashtags, existing.searchSelectedHashtags), hashtags);
    const searchPreferences = objectOrNull(settings.searchPreferences) || objectOrNull(existing.searchPreferences);
    const searchResultState = normalizeStoredSearchResultState(settings.searchResultState ?? existing.searchResultState);
    let normalizedImages;
    if (Array.isArray(settings.segmentImages)) {
      normalizedImages = await storeComposerImageBlobs(settings.segmentImages);
    }
    else {
      normalizedImages = normalizeSegmentImages(existing.segmentImages);
    }
    let postLanguagesSource = existing.postLanguages;
    if (Array.isArray(settings.postLanguages)) {
      postLanguagesSource = settings.postLanguages;
    }
    let tipsVisible = existing.tipsVisible !== false;
    if (settings.tipsVisible !== undefined) {
      tipsVisible = settings.tipsVisible;
    }
    let metadataSource = existing.segmentImages;
    if (Array.isArray(settings.segmentImages)) {
      metadataSource = normalizedImages;
    }
    const nextSettings = {
      ...existing,
      ...settings,
      localePreference: settings.localePreference || existing.localePreference || "auto",
      tipsVisible: tipsVisible,
      altTextRequired: settings.altTextRequired !== false,
      imageAutoResizeMode: normalizeImageAutoResizeMode(settings.imageAutoResizeMode ?? existing.imageAutoResizeMode),
      archiveExpertMode: normalizeArchiveExpertMode(settings.archiveExpertMode ?? existing.archiveExpertMode),
      themeMode: theme(settings.themeMode, existing.themeMode),
      compactMode: settings.compactMode === true || existing.compactMode === true,
      sidebarCollapsedDesktop: settings.sidebarCollapsedDesktop === true,
      desktopLayoutVersion: finite(settings.desktopLayoutVersion, existing.desktopLayoutVersion),
      sidebarWidthDesktop: finite(settings.sidebarWidthDesktop, existing.sidebarWidthDesktop),
      composerWidthDesktop: finite(settings.composerWidthDesktop, existing.composerWidthDesktop),
      postLanguages: normalizePostLanguageTags(postLanguagesSource),
      appendThreadIntro: settings.appendThreadIntro === true,
      appendThreadEmoji: settings.appendThreadEmoji === true,
      addMarkerSpacing: settings.addMarkerSpacing === true,
      postInteraction: normalizePostInteractionSettings(settings.postInteraction || existing.postInteraction),
      linkCardProxy: normalizeLinkCardProxySettings(settings.linkCardProxy || existing.linkCardProxy),
      linkCardProvider: normalizeLinkCardProviderSetting(settings.linkCardProvider || existing.linkCardProvider),
      linkCardMicrolinkUsage: normalizeLinkCardMicrolinkUsage(settings.linkCardMicrolinkUsage || existing.linkCardMicrolinkUsage),
      hashtags,
      selectedHashtags,
      searchSelectedHashtags,
      searchPreferences,
      searchResultState,
      hashtagPlacement: placement(settings.hashtagPlacement, existing.hashtagPlacement),
      segmentImages: normalizeSegmentImageMetadata(metadataSource),
      segmentLinkCards: normalizeSegmentLinkCards(arrayChoice(settings.segmentLinkCards, existing.segmentLinkCards)),
      postingHistory: normalizePostingHistory(arrayChoice(settings.postingHistory, existing.postingHistory)),
      threadExplorerFavorites: arrayChoice(settings.threadExplorerFavorites, existing.threadExplorerFavorites),
      threadExplorerState: normalizeStoredThreadExplorerState(settings.threadExplorerState ?? existing.threadExplorerState),
      savedSearches: arrayChoice(settings.savedSearches, existing.savedSearches),
      archivePreferences: objectOrNull(settings.archivePreferences) || objectOrNull(existing.archivePreferences),
      analysisState: normalizeStoredAnalysisState(settings.analysisState ?? existing.analysisState),
    };
    await writeStoredValue(SETTINGS_KEY, nextSettings);
    await writeStoredValue(LOCALE_KEY, nextSettings.localePreference);
    await pruneComposerImageBlobs();
    return { ok: true };
  }

  return Object.freeze({ load: getAppState, draft: saveDraft, settings: saveSettings });
};
