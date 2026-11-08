/**
 * Creates a queue that runs asynchronous state writes one after another.
 * @returns {{enqueue: (task: () => Promise<unknown>) => Promise<unknown>}} Queue API for serialized tasks.
 */
export function createAsyncTaskQueue() {
  let pendingTask = Promise.resolve();

  return {
    /**
     * Adds one asynchronous task after all earlier queued tasks have settled.
     * @param {() => Promise<unknown>} task - Asynchronous task to run.
     * @returns {Promise<unknown>} Result of the queued task.
     */
    enqueue(task) {
      pendingTask = pendingTask.catch(() => {}).then(task);
      return pendingTask;
    },
  };
}
/**
 * Normalizes startup preferences, retaining local appearance precedence and layout migration.
 * @param {object} state - Stored application state.
 * @param {object} appearance - Current local appearance preferences and presence flags.
 * @param {object} options - Resize/layout normalizers and current layout version.
 * @returns {object} Preference patch and layout migration flag.
 */
export function normalizeApplicationPreferences(state, appearance, options) {
  let themeMode = appearance.themeMode;
  if (appearance.hasThemeMode) { themeMode = appearance.themeMode; }
  else if (state.themeMode === "dark") { themeMode = "dark"; }
  else if (state.themeMode === "light") { themeMode = "light"; }
  let compactMode = appearance.compactMode;
  if (appearance.hasCompactMode) { compactMode = appearance.compactMode; }
  else if (state.compactMode === true) { compactMode = true; }
  else if (state.compactMode === false) { compactMode = false; }
  return {
    localePreference: state.localePreference || "auto", tipsVisible: state.tipsVisible !== false,
    altTextRequired: state.altTextRequired !== false, imageAutoResizeMode: options.normalizeResize(state.imageAutoResizeMode),
    archiveExpertMode: state.archiveExpertMode === true, themeMode, compactMode,
    sidebarCollapsedDesktop: state.sidebarCollapsedDesktop === true,
    ...options.normalizeLayout(state.sidebarWidthDesktop, state.composerWidthDesktop, state.desktopLayoutVersion),
    needsDesktopLayoutMigration: state.desktopLayoutVersion !== options.layoutVersion,
  };
}

/**
 * Restores application domains in their established order, independently of worker transport.
 * @param {object} elements - Inputs and toggles receiving stored values.
 * @param {object} options - Storage, normalization, state patches and domain/render adapters.
 * @returns {object} Application hydration operation.
 */
export function createApplicationHydrationController(elements, options) {
  /** Restores one startup bundle or reports failure and releases workspace restoration. @returns {Promise<void>} Completion. */
  async function hydrate() {
    try {
      const browserLocale = options.detectLocale();
      const bundle = await options.load(browserLocale);
      const state = bundle.state;
      const base = normalizeApplicationPreferences(state, options.getAppearance(), options.preferences);
      options.setState(base);
      const hashtags = options.normalize.hashtags(state.hashtags);
      options.setState({ hashtags,
        selectedHashtags: options.normalize.selection(state.selectedHashtags, hashtags),
        searchSelectedHashtags: options.normalize.selection(state.searchSelectedHashtags, hashtags) });
      const search = options.normalize.search(state.searchPreferences || {});
      options.applySearch(search);
      options.restoreSearch(state.searchResultState, search, state);
      options.renderSearch(); options.restoreSearchStatus();
      const document = {
        hashtagPlacement: options.normalize.placement(state.hashtagPlacement),
        segmentImages: options.normalize.images(state.segmentImages),
        segmentLinkCards: options.normalize.cards(state.segmentLinkCards),
        segmentOverrides: options.normalize.overrides(state.segmentOverrides),
      };
      options.setState(document);
      const pending = options.consumeReplyUrl() || options.consumeReplyStorage();
      let replyTarget = options.normalize.reply(state.replyTarget);
      if (pending) { replyTarget = pending; }
      options.setState({ composerReplyTarget: replyTarget });
      options.restoreAnalysis(state.analysisState);
      options.setState({ selectedPostLanguages: options.normalize.languages(state.postLanguages),
        appendThreadIntro: state.appendThreadIntro === true, appendThreadEmoji: state.appendThreadEmoji === true,
        addMarkerSpacing: state.addMarkerSpacing === true });
      options.applyInteraction(state.postInteraction || {});
      elements.proxyEndpoint.value = state.linkCardProxy?.endpoint || "";
      elements.proxySecret.value = state.linkCardProxy?.secret || "";
      options.setState({ linkCardProvider: options.normalize.provider(state.linkCardProvider),
        linkCardMicrolinkUsage: options.normalize.usage(state.linkCardMicrolinkUsage) });
      options.syncProvider();
      if (elements.resize) { elements.resize.value = base.imageAutoResizeMode; }
      if (elements.expert) { elements.expert.checked = base.archiveExpertMode; }
      options.setLocked(Boolean(document.segmentOverrides));
      options.setState({ postingHistory: options.normalize.history(state.postingHistory),
        threadExplorerFavorites: options.normalize.favorites(state.threadExplorerFavorites) });
      options.restoreExplorer(state.threadExplorerState || {});
      let currentLocale = state.locale || browserLocale || options.defaultLocale;
      if (base.localePreference === "auto") { currentLocale = browserLocale || options.defaultLocale; }
      const identity = { authAccount: state.handle || state.identifier || null,
        authAccountDid: state.did || "", authAccountService: state.service || options.defaultService };
      identity.authAccountWebApp = state.webApp || options.resolveWebApp(identity.authAccountService);
      options.setState({ savedSearches: options.normalize.searches(state.savedSearches),
        archiveSession: bundle.archiveSession || null,
        archiveCatalog: options.normalizeArchiveCatalog(bundle.archiveCatalog), currentLocale,
        savedAccounts: options.normalizeAccounts(state.accounts), ...identity });
      options.applyAvatarCache(bundle.accountAvatarCache || { assets: state.accountAvatarAssets || [] });
      elements.identifier.value = state.identifier || "";
      elements.source.value = state.draft || "";
      options.applyDmCache(bundle.dmPartnerCache);
      elements.password.value = "";
      options.applyService(identity.authAccountService);
      elements.placement.value = document.hashtagPlacement;
      elements.counter.checked = state.useCounters !== false;
      elements.intro.checked = state.appendThreadIntro === true;
      elements.emoji.checked = state.appendThreadEmoji === true;
      elements.spacing.checked = state.addMarkerSpacing === true;
      options.applyArchive(state.archivePreferences || {});
      for (const render of options.finalRender) { render(); }
      if (document.segmentImages.some((images) => (images || []).length > 0)) { options.validateImages(); }
      if (base.needsDesktopLayoutMigration) { await options.persist(); }
      options.setHydrated(true); options.restoreWorkspace(); options.scheduleReminder();
    } catch (error) {
      options.report(error); options.setStatus(error.message, "error");
      options.setHydrated(true); options.restoreWorkspace();
    }
  }
  return { hydrate };
}
