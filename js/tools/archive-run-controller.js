/**
 * Creates archive loading, import, persistence and run-control operations.
 * @param {object} dependencies - Explicit state, worker, presentation and environment adapters.
 * @param {Function} dependencies.t - Resolves localized labels and progress text.
 * @param {Function} dependencies.request - Sends worker messages with timeout and progress callbacks.
 * @param {Function} dependencies.hint - Refreshes the start/resume hint.
 * @param {Function} dependencies.status - Refreshes the run status line.
 * @param {Function} dependencies.actionButtons - Synchronizes the normal load-button label.
 * @param {Function} dependencies.controls - Refreshes pause/resume/cancel availability.
 * @param {Function} dependencies.filters - Reads normalized archive filters.
 * @param {Function} dependencies.serialize - Creates the stable filter key.
 * @param {Function} dependencies.validateSource - Resolves the source profile before loading.
 * @param {Function} dependencies.progress - Stores and renders export progress.
 * @param {Function} dependencies.preview - Refreshes the optional live preview.
 * @param {Function} dependencies.waveSize - Reads the requested wave size.
 * @param {Function} dependencies.normalize - Normalizes returned catalog data.
 * @param {Function} dependencies.summary - Refreshes post/image/band counts.
 * @param {Function} dependencies.results - Renders the current catalog result card.
 * @param {Function} dependencies.render - Renders the archive workspace.
 * @param {Function} dependencies.notice - Builds the imported-catalog notice.
 * @param {Function} dependencies.state - Reads current catalog, session and run/progress state.
 * @param {Function} dependencies.setState - Applies a partial state update.
 * @param {Function} dependencies.source - Reads the archive source input.
 * @param {Function} dependencies.sourceProfile - Reads the validated source profile.
 * @param {Function} dependencies.threadUrl - Reads the selected thread URL.
 * @param {Function} dependencies.threadMode - Reads the thread import mode.
 * @param {Function} dependencies.nextWave - Clicks the existing next-wave control.
 * @param {Function} dependencies.enableNextWave - Enables the next-wave control after cancellation.
 * @param {Function} dependencies.runId - Creates a unique run ID.
 * @param {Function} dependencies.now - Returns the current Date.
 * @param {Function} dependencies.warn - Reports optional persistence errors.
 * @param {Function} dependencies.error - Reports failed background invalidation.
 * @returns {object} ensure, apply, saveSession, saveCatalog, clear, invalidate, control and importThread operations.
 */
export function createArchiveRunController(dependencies) {
  for (const name of ["t", "request", "hint", "status", "actionButtons", "controls", "filters", "serialize", "validateSource", "progress", "preview", "waveSize", "normalize", "summary", "results", "render", "notice", "state", "setState", "source", "sourceProfile", "threadUrl", "threadMode", "nextWave", "enableNextWave", "runId", "now", "warn", "error"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Archive run requires ${name}.`);
    }
  }
  const t = dependencies.t;
  const sendToServiceWorker = dependencies.request;
  const renderArchiveStartHint = dependencies.hint;
  const renderArchiveStatusLine = dependencies.status;
  const syncArchiveActionButtonStates = dependencies.actionButtons;
  const updateArchiveRunControls = dependencies.controls;
  const getArchiveFilters = dependencies.filters;
  const serializeArchiveFilters = dependencies.serialize;
  const validateArchiveSourceInput = dependencies.validateSource;
  const setArchiveProgress = dependencies.progress;
  const renderArchivePreview = dependencies.preview;
  const getArchiveWaveSize = dependencies.waveSize;
  const normalizeImportedArchiveCatalog = dependencies.normalize;
  const updateArchiveSummary = dependencies.summary;
  const renderArchiveResults = dependencies.results;
  const renderArchiveWorkspace = dependencies.render;
  const buildArchiveCatalogNotice = dependencies.notice;
  /**
   * Applies worker progress consistently for wave and thread loading.
   * @param {object} progress - Worker title, step, percent, detail, preview and state.
   * @param {object} fallback - Translation keys, default detail and control-refresh policy.
   * @returns {void}
   */
  function applyProgress(progress, fallback) {
    const job = dependencies.state().job;
    const detail = [progress.detail || "", progress.preview?.metric || "", progress.preview?.meta || ""].filter(Boolean).join(" \u2022 ");
    let percent = job?.percent || 0;
    if (Number.isFinite(progress.percent)) {
      percent = progress.percent;
    }
    setArchiveProgress({
      title: progress.title || job?.title || t(fallback.title),
      step: progress.step || job?.step || t(fallback.step),
      percent,
      detail: detail || job?.detail || fallback.detail
    });
    if (progress.checkpoint) {
      dependencies.setState({
        checkpoint: progress.checkpoint
      });
    } else if (progress.preview?.meta) {
      dependencies.setState({
        checkpoint: progress.preview.meta
      });
    } else if (progress.detail) {
      dependencies.setState({
        checkpoint: progress.detail
      });
    }
    if (progress.preview) {
      dependencies.setState({
        preview: progress.preview
      });
      renderArchivePreview();
    }
    const stateChanged = progress.state === "paused" || progress.state === "running";
    if (stateChanged) {
      dependencies.setState({
        runState: progress.state
      });
    }
    if (stateChanged || fallback.alwaysRefresh) {
      updateArchiveRunControls();
      renderArchiveStatusLine();
      renderArchiveStartHint();
    }
  }

  /**
   * Persists the current archive session and refreshes run guidance.
   * @param {object|null} nextSession - Session checkpoint to persist.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function saveArchiveSession(nextSession) {
    dependencies.setState({
      session: nextSession || null
    });
    await sendToServiceWorker("SAVE_ARCHIVE_SESSION", {
      session: dependencies.state().session
    }, {
      timeoutMs: 120000
    });
    renderArchiveStartHint();
    renderArchiveStatusLine();
  }

  /**
   * Persists catalog state, reporting optional storage failures.
   * @param {object|null} nextCatalog - Catalog to persist, defaulting to current state.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function saveArchiveCatalogState(nextCatalog = dependencies.state().catalog) {
    dependencies.setState({
      catalog: nextCatalog || null
    });
    try {
      await sendToServiceWorker("SAVE_ARCHIVE_CATALOG", {
        catalog: dependencies.state().catalog
      }, {
        timeoutMs: 120000
      });
    } catch (error) {
      dependencies.warn("Archivkatalog konnte nicht dauerhaft gespeichert werden.", error);
    }
  }

  /**
   * Clears archive run state and persisted session/catalog.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function clearArchiveSession() {
    dependencies.setState({
      session: null,
      catalog: null,
      preview: null,
      runId: null,
      runState: "idle",
      checkpoint: "",
      lastProgressAt: "",
      notice: ""
    });
    await sendToServiceWorker("CLEAR_ARCHIVE_SESSION", {}, {
      timeoutMs: 30000
    });
    await sendToServiceWorker("CLEAR_ARCHIVE_CATALOG", {}, {
      timeoutMs: 30000
    }).catch(error => {
      dependencies.warn("Archivkatalog konnte nicht geleert werden.", error);
    });
  }

  /**
   * Dispatches pause/resume/cancel or restarts a saved paused session.
   * @param {string} action - Pause, resume or cancel command.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function setArchiveRunControl(action) {
    if (action === "resume" && !dependencies.state().runId && (dependencies.state().runState === "paused" || dependencies.state().session?.status === "paused")) {
      dependencies.nextWave();
      return;
    }
    if (!dependencies.state().runId) {
      return;
    }
    await sendToServiceWorker("SET_ARCHIVE_RUN_CONTROL", {
      runId: dependencies.state().runId,
      action
    }, {
      timeoutMs: 30000
    });
    if (action === "pause") {
      dependencies.setState({
        runState: "paused"
      });
    } else if (action === "resume") {
      dependencies.setState({
        runState: "running"
      });
    } else if (action === "cancel") {
      dependencies.setState({
        runState: "cancelled"
      });
      dependencies.enableNextWave();
    }
    syncArchiveActionButtonStates();
    updateArchiveRunControls();
    renderArchiveStatusLine();
    renderArchiveStartHint();
  }

  /**
   * Reuses a catalog or loads an archive wave with progress and persisted checkpoints.
   * @param {boolean} forceRefresh - Loads a new wave when true; otherwise reuses the catalog.
   * @returns {Promise<object>} Current normalized catalog.
   */
  async function ensureArchiveCatalogLoaded(forceRefresh = false) {
    if (dependencies.state().catalog && !forceRefresh) {
      return dependencies.state().catalog;
    }
    const rawSource = String(dependencies.source() || "").trim();
    if (rawSource && !dependencies.sourceProfile()?.did) {
      await validateArchiveSourceInput();
    }
    const filters = getArchiveFilters();
    const filterKey = serializeArchiveFilters(filters);
    let currentSession;
    if (dependencies.state().session && dependencies.state().session.filterKey === filterKey) {
      currentSession = dependencies.state().session;
    } else {
      currentSession = null;
    }
    let resumeCatalog;
    if (currentSession) {
      resumeCatalog = dependencies.state().catalog;
    } else {
      resumeCatalog = null;
    }
    setArchiveProgress({
      title: t("archiveProgressFetchTitle"),
      step: t("archiveProgressFetchStep"),
      percent: 3,
      detail: t("archiveProgressFetchIntro")
    });
    dependencies.setState({
      preview: null,
      notice: "",
      runId: dependencies.runId(),
      runState: "running"
    });
    updateArchiveRunControls();
    renderArchivePreview();
    renderArchiveStatusLine();
    let catalog;
    try {
      let cursor;
      if (currentSession?.status === "paused") {
        cursor = currentSession?.nextCursor || "";
      } else {
        cursor = "";
      }
      let existingCatalog;
      if (currentSession?.status === "paused") {
        existingCatalog = resumeCatalog;
      } else {
        existingCatalog = null;
      }
      let existingSession;
      if (currentSession?.status === "paused") {
        existingSession = currentSession;
      } else {
        existingSession = null;
      }
      catalog = await sendToServiceWorker("EXPORT_ACCOUNT_ARCHIVE_WAVE", {
        runId: dependencies.state().runId,
        filters,
        maxPosts: getArchiveWaveSize(),
        waveIndex: 1,
        cursor: cursor,
        existingCatalog: existingCatalog,
        existingSession: existingSession
      }, {
        timeoutMs: 600000,
        onProgress: progress => applyProgress(progress, {
          title: "archiveProgressFetchTitle",
          step: "archiveProgressFetchStep",
          detail: t("archiveProgressFetchIntro"),
          alwaysRefresh: false
        })
      });
    } catch (error) {
      dependencies.setState({
        runState: "idle",
        runId: null
      });
      updateArchiveRunControls();
      throw error;
    }
    dependencies.setState({
      catalog: normalizeImportedArchiveCatalog(catalog)
    });
    dependencies.setState({
      session: {
        filterKey,
        filters,
        waveIndex: 1,
        nextCursor: catalog.session?.nextCursor || "",
        hasMore: Boolean(catalog.session?.hasMore),
        exportedPosts: Number(catalog.session?.exportedPosts) || dependencies.state().catalog.posts.length,
        exportedImages: Number(catalog.session?.exportedImages) || dependencies.state().catalog.summary.imageCount,
        status: catalog.session?.status || "completed",
        pageCount: Number(catalog.session?.pageCount) || 0,
        phase: String(catalog.session?.phase || ""),
        errorMessage: String(catalog.session?.errorMessage || ""),
        updatedAt: dependencies.now().toISOString()
      }
    });
    await saveArchiveSession(dependencies.state().session);
    await saveArchiveCatalogState(dependencies.state().catalog);
    dependencies.setState({
      runId: null
    });
    let runState = "idle";
    let notice;
    let title = t("archiveProgressDoneTitle");
    let step = t("archiveWaveLoadedStep");
    if (catalog.session?.status === "cancelled") {
      runState = "cancelled";
      notice = t("archiveWaveCancelledNotice");
    } else if (catalog.session?.status === "paused") {
      runState = "paused";
      notice = t("archiveWavePausedNotice", {
        message: catalog.session?.errorMessage || t("archiveWavePausedDefault")
      });
      title = t("archiveProgressPausedTitle");
      step = t("archiveWavePausedStep");
    } else {
      notice = t("archiveWaveLoadedNotice", {
        posts: dependencies.state().catalog.posts.length,
        images: dependencies.state().catalog.summary.imageCount
      });
    }
    dependencies.setState({
      runState,
      notice
    });
    setArchiveProgress({
      title,
      step,
      percent: 100,
      detail: dependencies.state().notice
    });
    updateArchiveRunControls();
    renderArchiveStatusLine();
    renderArchiveStartHint();
    updateArchiveSummary(dependencies.state().catalog);
    renderArchiveResults(dependencies.state().catalog);
    return dependencies.state().catalog;
  }

  /**
   * Applies an imported catalog and persists its completed session.
   * @param {object} catalog - Normalized imported catalog.
   * @param {object} sessionOverrides - Optional session metadata and completion label.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function applyLoadedArchiveCatalog(catalog, sessionOverrides = {}) {
    dependencies.setState({
      preview: null,
      runId: null,
      runState: "idle",
      checkpoint: "",
      catalog: catalog
    });
    dependencies.setState({
      session: {
        filterKey: sessionOverrides.filterKey || "import",
        filters: sessionOverrides.filters || null,
        waveIndex: Number(sessionOverrides.waveIndex) || 1,
        nextCursor: sessionOverrides.nextCursor || "",
        hasMore: Boolean(sessionOverrides.hasMore),
        exportedPosts: Number(sessionOverrides.exportedPosts) || dependencies.state().catalog.posts.length,
        exportedImages: Number(sessionOverrides.exportedImages) || dependencies.state().catalog.summary.imageCount,
        status: sessionOverrides.status || "completed",
        updatedAt: dependencies.now().toISOString()
      }
    });
    await saveArchiveSession(dependencies.state().session);
    await saveArchiveCatalogState(dependencies.state().catalog);
    dependencies.setState({
      notice: buildArchiveCatalogNotice(dependencies.state().catalog)
    });
    renderArchiveWorkspace();
    setArchiveProgress({
      title: t("archiveProgressDoneTitle"),
      step: sessionOverrides.step || t("archiveImported"),
      percent: 100,
      detail: dependencies.state().notice
    });
  }

  /**
   * Loads a thread URL and applies the normalized catalog.
   * @returns {Promise<void>} Resolves after the requested operation.
   */
  async function importArchiveThreadFromUrl() {
    const threadUrl = String(dependencies.threadUrl() || "").trim();
    let importMode = "path";
    if (dependencies.threadMode() === "tree") {
      importMode = "tree";
    } else if (dependencies.threadMode() === "author") {
      importMode = "author";
    }
    if (!threadUrl) {
      throw new Error(t("archiveThreadUrlInvalid"));
    }
    setArchiveProgress({
      title: t("archiveThreadUrlLoadingTitle"),
      step: t("archiveThreadUrlLoadingStep"),
      percent: 4,
      detail: threadUrl
    });
    dependencies.setState({
      preview: null,
      notice: "",
      runId: dependencies.runId(),
      runState: "running"
    });
    updateArchiveRunControls();
    renderArchivePreview();
    renderArchiveStatusLine();
    let catalog;
    try {
      catalog = await sendToServiceWorker("IMPORT_ARCHIVE_THREAD_FROM_URL", {
        runId: dependencies.state().runId,
        url: threadUrl,
        importMode
      }, {
        timeoutMs: 600000,
        onProgress: progress => applyProgress(progress, {
          title: "archiveThreadUrlLoadingTitle",
          step: "archiveThreadUrlLoadingStep",
          detail: threadUrl,
          alwaysRefresh: true
        })
      });
    } catch (error) {
      dependencies.setState({
        runState: "idle",
        runId: null
      });
      updateArchiveRunControls();
      throw error;
    }
    dependencies.setState({
      runState: "idle",
      runId: null
    });
    updateArchiveRunControls();
    let exportedImages;
    if (Array.isArray(catalog?.assets)) {
      exportedImages = catalog.assets.length;
    } else {
      exportedImages = 0;
    }
    await applyLoadedArchiveCatalog(normalizeImportedArchiveCatalog(catalog), {
      filterKey: `thread-url:${catalog?.manifest?.threadImport?.entryUri || threadUrl}`,
      filters: null,
      waveIndex: 1,
      nextCursor: "",
      hasMore: false,
      exportedPosts: catalog?.posts?.length || 0,
      exportedImages: exportedImages,
      status: "completed",
      step: t("archiveThreadUrlImportedStep")
    });
  }

  /**
   * Invalidates archive state, clears persisted records and redraws.
   * @returns {void}
   */
  function invalidateArchiveCatalog() {
    dependencies.setState({
      catalog: null,
      session: null,
      preview: null,
      runId: null,
      runState: "idle",
      checkpoint: "",
      lastProgressAt: "",
      notice: ""
    });
    void sendToServiceWorker("CLEAR_ARCHIVE_SESSION", {}, {
      timeoutMs: 30000
    }).catch(error => {
      dependencies.error(error);
    });
    void sendToServiceWorker("CLEAR_ARCHIVE_CATALOG", {}, {
      timeoutMs: 30000
    }).catch(error => {
      dependencies.error(error);
    });
    renderArchiveWorkspace();
  }
  return {
    ensure: ensureArchiveCatalogLoaded,
    apply: applyLoadedArchiveCatalog,
    saveSession: saveArchiveSession,
    saveCatalog: saveArchiveCatalogState,
    clear: clearArchiveSession,
    invalidate: invalidateArchiveCatalog,
    control: setArchiveRunControl,
    importThread: importArchiveThreadFromUrl
  };
}
