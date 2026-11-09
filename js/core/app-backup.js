/**
 * Creates settings-backup file and binary-asset adapters.
 * @param {object} api - File/Blob/Response, gzip streams, text/base64 codecs and error translation.
 * @returns {object} Asset serialization and compressed/plain JSON file operations.
 */
export function createSettingsBackupCodec(api) {
  /** Serializes cached binary assets. @param {*} assets - Cached assets. @returns {object[]} JSON records. */
  function serializeAssets(assets = []) {
    if (!Array.isArray(assets)) { return []; }
    return assets.map((asset) => {
      let bytes = asset.bytes;
      if (!(bytes instanceof Uint8Array)) { bytes = new Uint8Array(bytes || []); }
      return { path: String(asset.path || ""), type: String(asset.type || "application/octet-stream"),
        sizeBytes: Math.max(0, Number(asset.sizeBytes) || bytes.length), bytesBase64: api.toBase64(bytes) };
    }).filter((asset) => asset.path && asset.bytesBase64);
  }
  /** Restores cached binary assets. @param {*} assets - Serialized records. @returns {object[]} Binary records. */
  function deserializeAssets(assets = []) {
    if (!Array.isArray(assets)) { return []; }
    return assets.map((asset) => ({ path: String(asset.path || ""), type: String(asset.type || "application/octet-stream"),
      sizeBytes: Math.max(0, Number(asset.sizeBytes) || 0), bytes: api.fromBase64(asset.bytesBase64 || "") }))
      .filter((asset) => asset.path && asset.bytes.length > 0);
  }
  /** Transforms gzip bytes. @param {Uint8Array} bytes - Input. @param {Function} Stream - Compression direction. @param {string} key - Unsupported error. @returns {Promise<Uint8Array>} Output. */
  async function transform(bytes, Stream, key) {
    if (typeof Stream !== "function") { throw new Error(api.translate(key)); }
    const stream = new api.Blob([bytes]).stream().pipeThrough(new Stream("gzip"));
    return new Uint8Array(await new api.Response(stream).arrayBuffer());
  }
  /** Reads a plain/gzip JSON settings file. @param {File} file - Selected backup. @returns {Promise<object>} Payload. */
  async function read(file) {
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.gz$/i.test(file.name)) { bytes = await transform(bytes, api.DecompressionStream, "backupGzipDecompressionUnsupported"); }
    return JSON.parse(api.decode(bytes));
  }
  /** Creates a dated gzip backup. @param {object} payload - Document. @param {string} date - ISO timestamp. @returns {Promise<File>} Export file. */
  async function createFile(payload, date) {
    const bytes = await transform(api.encode(JSON.stringify(payload, null, 2)), api.CompressionStream, "backupGzipCompressionUnsupported");
    return new api.File([bytes], `threadline-settings-${date.slice(0, 10)}.json.gz`, { type: "application/gzip" });
  }
  return { serializeAssets, deserializeAssets, read, createFile };
}

/**
 * Creates the full settings backup export/import workflow with explicit adapters.
 * @param {object} elements - Locale, placement, decoration, resize/expert and proxy controls.
 * @param {object} options - State, settings snapshot, codec, normalizers, persistence and UI callbacks.
 * @returns {object} Payload builder and file import/export operations.
 */
export function createSettingsBackupController(elements, options) {
  const { codec, getState, setState, normalize, translate, now, request } = options;
  /** Builds the existing backup schema without authentication/session records. @returns {Promise<object>} Backup document. */
  async function buildPayload() {
    const state = getState(); const snapshot = options.getSettings(); const data = {};
    for (const key of ["localePreference", "tipsVisible", "altTextRequired", "imageAutoResizeMode", "archiveExpertMode",
      "themeMode", "compactMode", "sidebarCollapsedDesktop", "desktopLayoutVersion", "sidebarWidthDesktop", "composerWidthDesktop",
      "postLanguages", "appendThreadIntro", "appendThreadEmoji", "addMarkerSpacing", "postInteraction", "linkCardProxy",
      "linkCardProvider", "linkCardMicrolinkUsage", "hashtagPlacement", "hashtags", "selectedHashtags", "postingHistory",
      "threadExplorerFavorites", "savedSearches", "archivePreferences", "analysisState"]) { data[key] = snapshot[key]; }
    data.savedAccounts = state.savedAccounts.map((account) => ({ did: account.did || "", handle: account.handle || "",
      identifier: account.identifier || "", service: account.service || "", avatar: account.avatar || "", avatarPath: account.avatarPath || "" }));
    data.accountAvatarCache = { assets: codec.serializeAssets(state.accountAvatarAssets) };
    let recentContacts = []; let conversations = [];
    if (Array.isArray(state.dmRecentContacts)) { recentContacts = state.dmRecentContacts; }
    if (Array.isArray(state.dmRecentConversations)) { conversations = state.dmRecentConversations; }
    data.dmPartnerCache = { accountDid: state.dmPartnerCacheAccountDid, updatedAt: state.dmPartnerCacheUpdatedAt,
      recentContacts, conversations, assets: codec.serializeAssets(state.dmRecentContactAssets) };
    return { exportedAt: now(), app: "Threadline", version: options.version.appVersion,
      cacheVersion: options.version.cacheVersion, schemaVersion: 1, excludesCredentials: true, data };
  }
  /** Exports settings and records successful handoff. @returns {Promise<void>} Completion. */
  async function exportFile() {
    const payload = await buildPayload(); const file = await codec.createFile(payload, now());
    await options.share(file, file.name); options.markExported(); options.status(translate("backupExported"));
  }
  /**
   * Imports account/avatar/DM caches through their existing worker contracts.
   * @param {object} imported - Backup data.
   * @returns {Promise<void>} Cache operations complete; optional cache-save failures are tolerated.
   */
  async function importCaches(imported) {
    if (Array.isArray(imported.savedAccounts) && imported.savedAccounts.length > 0) {
      const result = await request("IMPORT_ACCOUNT_METADATA", { accounts: imported.savedAccounts });
      if (Array.isArray(result.accounts)) { setState({ savedAccounts: result.accounts }); }
    }
    if (imported.accountAvatarCache && typeof imported.accountAvatarCache === "object" && Array.isArray(imported.accountAvatarCache.assets)) {
      const assets = codec.deserializeAssets(imported.accountAvatarCache.assets);
      options.applyAvatarCache({ assets });
      await request("SAVE_ACCOUNT_AVATAR_CACHE", { cache: { updatedAt: now(), assets } }, { timeoutMs: 120000 }).catch(() => {});
    }
    if (imported.dmPartnerCache && typeof imported.dmPartnerCache === "object") {
      const cache = imported.dmPartnerCache; let assets = getState().dmRecentContactAssets;
      if (Array.isArray(cache.assets)) { assets = codec.deserializeAssets(cache.assets); }
      let recentContacts = []; let conversations = [];
      if (Array.isArray(cache.recentContacts)) { recentContacts = cache.recentContacts; }
      if (Array.isArray(cache.conversations)) { conversations = cache.conversations; }
      options.applyDmCache({ accountDid: String(cache.accountDid || ""), updatedAt: String(cache.updatedAt || ""), recentContacts, conversations, assets });
      const state = getState();
      await request("SAVE_DM_PARTNER_CACHE", { cache: { accountDid: state.dmPartnerCacheAccountDid,
        updatedAt: state.dmPartnerCacheUpdatedAt || now(), recentContacts: state.dmRecentContacts,
        conversations: state.dmRecentConversations, assets } }, { timeoutMs: 120000 }).catch(() => {});
    }
  }
  /** Imports a JSON/gzip file, merges local state and refreshes all dependent UI. @param {File} file - Selected backup. @returns {Promise<void>} Completion. */
  async function importFile(file) {
    const parsed = await codec.read(file); const imported = parsed?.data || parsed;
    if (!imported || typeof imported !== "object") { throw new Error(translate("backupImportInvalid")); }
    const state = getState(); const importedHashtags = normalize.hashtags(imported.hashtags);
    const hashtags = normalize.mergeHashtags(state.hashtags, importedHashtags);
    let selected = []; let searchSelected = [];
    if (Array.isArray(imported.selectedHashtags)) { selected = imported.selectedHashtags; }
    if (Array.isArray(imported.searchSelectedHashtags)) { searchSelected = imported.searchSelectedHashtags; }
    let themeMode = "light"; if (imported.themeMode === "dark") { themeMode = "dark"; }
    let localePreference = state.localePreference;
    if (options.supportedLocales.includes(imported.localePreference) || imported.localePreference === "auto") { localePreference = imported.localePreference; }
    let currentLocale = localePreference; if (localePreference === "auto") { currentLocale = options.detectLocale(); }
    const patch = { hashtags, selectedHashtags: normalize.selection([...state.selectedHashtags, ...selected], hashtags),
      searchSelectedHashtags: normalize.selection([...state.searchSelectedHashtags, ...searchSelected], hashtags),
      postingHistory: normalize.history(state.postingHistory, imported.postingHistory),
      threadExplorerFavorites: normalize.favorites(imported.threadExplorerFavorites), savedSearches: normalize.searches(imported.savedSearches),
      hashtagPlacement: normalize.placement(imported.hashtagPlacement), tipsVisible: imported.tipsVisible !== false,
      altTextRequired: imported.altTextRequired === true, imageAutoResizeMode: normalize.resize(imported.imageAutoResizeMode),
      archiveExpertMode: imported.archiveExpertMode === true, themeMode, compactMode: imported.compactMode === true,
      sidebarCollapsedDesktop: imported.sidebarCollapsedDesktop === true,
      ...normalize.layout(imported.sidebarWidthDesktop, imported.composerWidthDesktop, imported.desktopLayoutVersion),
      selectedPostLanguages: normalize.languages(imported.postLanguages), appendThreadIntro: imported.appendThreadIntro === true,
      appendThreadEmoji: imported.appendThreadEmoji === true, addMarkerSpacing: imported.addMarkerSpacing === true,
      linkCardProvider: normalize.provider(imported.linkCardProvider), linkCardMicrolinkUsage: normalize.usage(imported.linkCardMicrolinkUsage),
      localePreference, currentLocale };
    setState(patch); options.applySearch(imported.searchPreferences || {}); options.persistAppearance();
    elements.placement.value = patch.hashtagPlacement; elements.intro.checked = patch.appendThreadIntro;
    elements.emoji.checked = patch.appendThreadEmoji; elements.spacing.checked = patch.addMarkerSpacing;
    if (elements.resize) { elements.resize.value = patch.imageAutoResizeMode; }
    if (elements.expert) { elements.expert.checked = patch.archiveExpertMode; }
    options.applyInteraction(imported.postInteraction || {});
    if (imported.linkCardProxy && typeof imported.linkCardProxy === "object") {
      elements.proxyEndpoint.value = imported.linkCardProxy.endpoint || ""; elements.proxySecret.value = imported.linkCardProxy.secret || "";
    }
    options.syncProvider(); elements.locale.value = localePreference;
    options.applyArchive(imported.archivePreferences || {}); options.restoreAnalysis(imported.analysisState);
    options.applyLayout(); options.applySidebar(); await importCaches(imported);
    await options.persist(); options.translateUi(); options.applyTheme(); options.applyDensity(); options.renderAccounts();
    setState({ segmentOverrides: null }); options.setLocked(false); options.renderSegments({ preserveOverrides: false });
    options.status(translate("backupImported", { count: importedHashtags.length }));
  }
  return { buildPayload, exportFile, importFile };
}

/**
 * Owns backup status timeout, due/snooze policy and reminder dialog actions.
 * @param {object} elements - Status, reminder dialog and message.
 * @param {object} options - Storage, clock, timer, translation and export adapters plus policy keys/intervals.
 * @returns {object} Status rendering, reminder actions and export timestamp marker.
 */
export function createSettingsBackupReminder(elements, options) {
  let statusTimer = null;
  /** Reads a positive timestamp defensively. @param {string} key - Storage key. @returns {number} Timestamp or zero. */
  function read(key) {
    try { const value = Number(options.storage.getItem(key)); if (Number.isFinite(value) && value > 0) { return value; } }
    catch (error) { options.warn("Backup reminder storage read failed.", error); }
    return 0;
  }
  /** Stores a timestamp defensively. @param {string} key - Storage key. @param {number} value - Timestamp. @returns {void} */
  function write(key, value) {
    try { options.storage.setItem(key, String(value)); }
    catch (error) { options.warn("Backup reminder storage write failed.", error); }
  }
  /** Displays backup feedback and cancels old hide timers. @param {string} message - Text. @param {string} tone - Status tone. @returns {void} */
  function status(message, tone = "neutral") {
    options.clearTimer(statusTimer); elements.status.textContent = message; elements.status.hidden = !message;
    if (message) { elements.status.dataset.tone = tone; }
    else { delete elements.status.dataset.tone; }
    if (message) { statusTimer = options.setTimer(() => { elements.status.hidden = true; elements.status.textContent = ""; delete elements.status.dataset.tone; }, 5000); }
  }
  /** Records export completion and clears snooze. @returns {void} */
  function markExported() { write(options.exportKey, options.now()); write(options.dismissKey, 0); }
  /** Tests exact due/snooze boundaries while avoiding other open dialogs. @returns {boolean} Whether to remind. */
  function isDue() {
    if (!elements.dialog || elements.dialog.open || options.hasOpenDialog()) { return false; }
    const dismissed = read(options.dismissKey); const now = options.now();
    if (dismissed > 0 && now - dismissed < options.snoozeMs) { return false; }
    const exported = read(options.exportKey); return exported <= 0 || now - exported >= options.intervalMs;
  }
  /** Reads localized text for unknown/old exports. @returns {string} Reminder message. */
  function message() {
    if (read(options.exportKey) <= 0) { return options.translate("backupReminderUnknownMessage"); }
    return options.translate("backupReminderDueMessage");
  }
  /** Opens a due reminder, handling native dialog failures. @returns {void} */
  function show() {
    if (!isDue()) { return; }
    if (elements.message) { elements.message.textContent = message(); }
    try { elements.dialog.showModal(); } catch (error) { options.warn("Backup reminder dialog could not be opened.", error); }
  }
  /** Closes the reminder with optional snooze. @param {boolean} remember - Whether to snooze. @returns {void} */
  function close(remember) { if (remember) { write(options.dismissKey, options.now()); } if (elements.dialog?.open) { elements.dialog.close(); } }
  /** Saves from the reminder and closes only after success. @returns {Promise<void>} Completion. */
  async function save() {
    try { await options.exportFile(); close(false); }
    catch (error) { options.report(error); if (elements.message) { elements.message.textContent = options.translate("backupExportFailed"); } status(options.translate("backupExportFailed"), "error"); }
  }
  return { status, markExported, isDue, message, show, close, save };
}
