import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./translations.js";

const MAX_POST_LENGTH = 300;
const MANUAL_SPLIT_MARKER = "%%";
const MAX_IMAGES_PER_SEGMENT = 4;
const MAX_ALT_TEXT_LENGTH = 1000;
const IMAGE_BLOB_LIMIT = 2_000_000;
const IMAGE_MAX_DIMENSION = 4_000;
const IMAGE_EDITOR_CANVAS_WIDTH = 560;
const IMAGE_EDITOR_CANVAS_HEIGHT = 360;
const IMAGE_EXPORT_WIDTH = 1400;
const IMAGE_EXPORT_HEIGHT = Math.round((IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH) * IMAGE_EDITOR_CANVAS_HEIGHT);
const MAX_POSTING_HISTORY = 30;
const ARCHIVE_SCHEMA_VERSION = 1;
const CURRENT_VERSION_INFO = {
  appVersion: "0.4.38",
  cacheVersion: "v55",
  label: "Archive toggle guard",
};
const statusText = document.querySelector("#status-text");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const publishButton = document.querySelector("#publish-button");
const clearButton = document.querySelector("#clear-button");
const settingsButton = document.querySelector("#settings-button");
const loadThreadButton = document.querySelector("#load-thread-button");
const helpButton = document.querySelector("#help-button");
const installButton = document.querySelector("#install-button");
const historyButton = document.querySelector("#history-button");
const archiveButton = document.querySelector("#archive-button");
const archiveLaunchNote = document.querySelector("#archive-launch-note");
const saveThreadButton = document.querySelector("#save-thread-button");
const settingsDialog = document.querySelector("#settings-dialog");
const publishResultDialog = document.querySelector("#publish-result-dialog");
const progressDialog = document.querySelector("#progress-dialog");
const errorDialog = document.querySelector("#error-dialog");
const historyDialog = document.querySelector("#history-dialog");
const helpDialog = document.querySelector("#help-dialog");
const installDialog = document.querySelector("#install-dialog");
const hashtagEditDialog = document.querySelector("#hashtag-edit-dialog");
const altTextDialog = document.querySelector("#alt-text-dialog");
const imageEditorDialog = document.querySelector("#image-editor-dialog");
const confirmDialog = document.querySelector("#confirm-dialog");
const languageSelect = document.querySelector("#language-select");
const themeToggleButton = document.querySelector("#theme-toggle-button");
const themeStatusNote = document.querySelector("#theme-status-note");
const checkUpdatesButton = document.querySelector("#check-updates-button");
const reloadAppButton = document.querySelector("#reload-app-button");
const updateStatus = document.querySelector("#update-status");
const publishResultText = document.querySelector("#publish-result-text");
const publishResultLink = document.querySelector("#publish-result-link");
const progressTitle = document.querySelector("#progress-title");
const progressMessage = document.querySelector("#progress-message");
const errorTitle = document.querySelector("#error-title");
const errorMessage = document.querySelector("#error-message");
const helpStatus = document.querySelector("#help-status");
const helpContent = document.querySelector("#help-content");
const tipText = document.querySelector("#tip-text");
const nextTipButton = document.querySelector("#next-tip-button");
const hideTipsButton = document.querySelector("#hide-tips-button");
const tipsPanel = document.querySelector(".tips-panel");
const tipsVisibleToggle = document.querySelector("#tips-visible-toggle");
const altTextRequiredToggle = document.querySelector("#alt-text-required-toggle");
const exportSettingsButton = document.querySelector("#export-settings-button");
const importSettingsButton = document.querySelector("#import-settings-button");
const importSettingsInput = document.querySelector("#import-settings-input");
const backupStatus = document.querySelector("#backup-status");
const clearHistoryButton = document.querySelector("#clear-history-button");
const hashtagEditInput = document.querySelector("#hashtag-edit-input");
const hashtagEditSaveButton = document.querySelector("#hashtag-edit-save-button");
const hashtagEditCancelButton = document.querySelector("#hashtag-edit-cancel-button");
const hashtagEditCancelTop = document.querySelector("#hashtag-edit-cancel-top");
const altTextInput = document.querySelector("#alt-text-input");
const altTextCount = document.querySelector("#alt-text-count");
const altTextSaveButton = document.querySelector("#alt-text-save-button");
const altTextCancelButton = document.querySelector("#alt-text-cancel-button");
const altTextCloseTop = document.querySelector("#alt-text-close-top");
const imageEditorCanvas = document.querySelector("#image-editor-canvas");
const imageZoomInput = document.querySelector("#image-zoom-input");
const imageFlipHorizontalButton = document.querySelector("#image-flip-horizontal-button");
const imageFlipVerticalButton = document.querySelector("#image-flip-vertical-button");
const imageRotateLeftButton = document.querySelector("#image-rotate-left-button");
const imageResetButton = document.querySelector("#image-reset-button");
const imageEditorSaveButton = document.querySelector("#image-editor-save-button");
const imageEditorCancelButton = document.querySelector("#image-editor-cancel-button");
const imageEditorCloseTop = document.querySelector("#image-editor-close-top");
const imageLossyResizeButton = document.querySelector("#image-lossy-resize-button");
const imageEditorSuggestion = document.querySelector("#image-editor-suggestion");
const confirmDialogTitle = document.querySelector("#confirm-dialog-title");
const confirmDialogMessage = document.querySelector("#confirm-dialog-message");
const confirmDialogConfirmButton = document.querySelector("#confirm-dialog-confirm-button");
const confirmDialogCancelButton = document.querySelector("#confirm-dialog-cancel-button");
const threadImportInput = document.querySelector("#thread-import-input");
const archiveImportInput = document.querySelector("#archive-import-input");
const historyList = document.querySelector("#history-list");
const hashtagForm = document.querySelector("#hashtag-form");
const hashtagInput = document.querySelector("#hashtag-input");
const hashtagAddButton = document.querySelector("#hashtag-add-button");
const hashtagPlacementSelect = document.querySelector("#hashtag-placement-select");
const hashtagCloud = document.querySelector("#hashtag-cloud");
const hashtagSelectionNote = document.querySelector("#hashtag-selection-note");
const sourceText = document.querySelector("#source-text");
const composerLockNote = document.querySelector("#composer-lock-note");
const composerUnlockButton = document.querySelector("#composer-unlock-button");
const counterToggle = document.querySelector("#counter-toggle");
const threadEmojiToggle = document.querySelector("#thread-emoji-toggle");
const characterCount = document.querySelector("#character-count");
const segmentSummary = document.querySelector("#segment-summary");
const publishWarning = document.querySelector("#publish-warning");
const segmentsPane = document.querySelector("#segments-pane");
const segmentsList = document.querySelector("#segments-list");
const segmentTemplate = document.querySelector("#segment-template");
const identifierField = document.querySelector("#identifier");
const passwordField = document.querySelector("#password");
const composerWorkspace = document.querySelector("#composer-workspace");
const archiveWorkspace = document.querySelector("#archive-workspace");
const archiveBackButton = document.querySelector("#archive-back-button");
const archiveScopeSelect = document.querySelector("#archive-scope-select");
const archiveContentModeSelect = document.querySelector("#archive-content-mode-select");
const archiveYearWrap = document.querySelector("#archive-year-wrap");
const archiveYearInput = document.querySelector("#archive-year-input");
const archiveFromWrap = document.querySelector("#archive-from-wrap");
const archiveFromInput = document.querySelector("#archive-from-input");
const archiveToWrap = document.querySelector("#archive-to-wrap");
const archiveToInput = document.querySelector("#archive-to-input");
const archiveWaveSizeSelect = document.querySelector("#archive-wave-size-select");
const archiveBandSizeSelect = document.querySelector("#archive-band-size-select");
const archiveImageSizeSelect = document.querySelector("#archive-image-size-select");
const archiveMetricsToggle = document.querySelector("#archive-metrics-toggle");
const archiveThreadsToggle = document.querySelector("#archive-threads-toggle");
const archivePdfIndentToggle = document.querySelector("#archive-pdf-indent-toggle");
const archiveNextWaveButton = document.querySelector("#archive-next-wave-button");
const archiveExportZipButton = document.querySelector("#archive-export-zip-button");
const archiveExportHtmlButton = document.querySelector("#archive-export-html-button");
const archiveExportPdfButton = document.querySelector("#archive-export-pdf-button");
const archiveImportButton = document.querySelector("#archive-import-button");
const archiveResetButton = document.querySelector("#archive-reset-button");
const archiveStartHint = document.querySelector("#archive-start-hint");
const archiveProgressTitle = document.querySelector("#archive-progress-title");
const archiveProgressStep = document.querySelector("#archive-progress-step");
const archiveRunStatusLine = document.querySelector("#archive-run-status-line");
const archiveProgressFill = document.querySelector("#archive-progress-fill");
const archiveProgressDetail = document.querySelector("#archive-progress-detail");
const archiveLivePreviewToggle = document.querySelector("#archive-live-preview-toggle");
const archivePauseButton = document.querySelector("#archive-pause-button");
const archiveResumeButton = document.querySelector("#archive-resume-button");
const archiveCancelButton = document.querySelector("#archive-cancel-button");
const archivePreviewPanel = document.querySelector("#archive-preview-panel");
const archivePreviewCard = document.querySelector("#archive-preview-card");
const archiveSummaryPosts = document.querySelector("#archive-summary-posts");
const archiveSummaryImages = document.querySelector("#archive-summary-images");
const archiveSummaryBands = document.querySelector("#archive-summary-bands");
const archiveResults = document.querySelector("#archive-results");
const archiveSpecContent = document.querySelector("#archive-spec-content");

let activeSegments = [];
let currentLocale = DEFAULT_LOCALE;
let localePreference = "auto";
let authAccount = null;
let draftSaveTimer = null;
let serviceWorkerRegistration = null;
let updateInProgress = false;
let sessionCheckTimer = null;
let deferredInstallPrompt = null;
let helpCache = {
  path: "",
  text: "",
};
let currentTipIndex = 0;
let tipsVisible = true;
let altTextRequired = true;
let themeMode = "light";
let hashtags = [];
let selectedHashtags = [];
let hashtagPlacement = "first";
let postingHistory = [];
let currentComposedText = "";
let appendThreadEmoji = false;
let segmentOverrides = null;
let composerLocked = false;
let backupStatusTimer = null;
let editingHashtagNormalized = null;
let segmentImages = [];
let editingAltTarget = null;
let editingImageTarget = null;
let imageEditorSourceBitmap = null;
let imageEditorDraft = null;
let imageEditorDragging = false;
let imageEditorDragStart = null;
let confirmResolver = null;
let imageValidationToken = 0;
let currentWorkspace = "composer";
let archiveCatalog = null;
let archiveJobState = null;
let archiveSession = null;
let activeArchiveRunId = null;
let activeArchiveRunState = "idle";
let archivePreviewState = null;
let archiveLastCheckpoint = "";
let archiveTransientNotice = "";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setStatus(t("statusNoSupport"));
    return;
  }

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;
    setStatus(t("statusCheckingSession"));
    await hydrateAppState();
    await verifySession({ silent: true });
    startSessionChecks();
    await checkForUpdates({
      showChecking: false,
      silentNoChange: true,
      silentError: true,
    });
  } catch (error) {
    console.error(error);
    setStatus(t("statusSwRegisterFailed", { message: error.message }), "error");
  }
}

async function sendToServiceWorker(type, payload = {}, options = {}) {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active || navigator.serviceWorker.controller;

  if (!worker) {
    throw new Error("Kein aktiver Service Worker verfügbar.");
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutMs = Math.max(5000, Number(options.timeoutMs) || 15000);
    let timeoutId = null;
    const scheduleTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        reject(new Error(t("statusSwTimeout")));
      }, timeoutMs);
    };

    scheduleTimeout();

    channel.port1.onmessage = (event) => {
      if (event.data?.progress) {
        scheduleTimeout();
        options.onProgress?.(event.data.progress);
        return;
      }

      window.clearTimeout(timeoutId);

      if (event.data?.ok) {
        resolve(event.data.result);
        return;
      }

      const error = new Error(event.data?.error || "Unbekannter Fehler im Service Worker.");
      error.details = event.data?.details || null;
      reject(error);
    };

    worker.postMessage({ type, payload }, [channel.port2]);
  });
}

function buildPublishErrorMessage(error) {
  if (error?.details?.code === "PARTIAL_PUBLISH") {
    const summary = t("publishPartialFailure", {
      posted: error.details.postedCount,
      total: error.details.totalCount,
    });
    return error.message ? `${summary}\n${error.message}` : summary;
  }

  return error?.message || t("errorTitle");
}

function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.style.color = tone === "error" ? "var(--danger)" : "var(--text)";
}

function setBusy(button, isBusy, busyLabel, idleLabel) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : idleLabel;
}

function updateAuthButtons() {
  const isAuthenticated = Boolean(authAccount);
  loginButton.hidden = isAuthenticated;
  loginButton.classList.toggle("ghost-button", isAuthenticated);
  loginButton.classList.toggle("is-muted", isAuthenticated);
  archiveButton.disabled = !isAuthenticated;
  archiveLaunchNote.textContent = isAuthenticated ? t("archiveLaunchEnabledNote") : t("archiveLaunchDisabledNote");
}

function applyDisconnectedState(showStatus = true) {
  authAccount = null;
  logoutButton.hidden = true;
  updateAuthButtons();
  if (currentWorkspace === "archive") {
    showComposerWorkspace();
  }

  if (showStatus) {
    setStatus(t("statusConnectionLost"), "error");
  }
}

function showArchiveWorkspace() {
  if (!authAccount) {
    return;
  }

  currentWorkspace = "archive";
  composerWorkspace.hidden = true;
  archiveWorkspace.hidden = false;
  renderArchiveWorkspace();
}

function showComposerWorkspace() {
  currentWorkspace = "composer";
  archiveWorkspace.hidden = true;
  composerWorkspace.hidden = false;
}

function getArchiveFilters() {
  const hasExplicitRange = Boolean(archiveFromInput.value || archiveToInput.value);
  return {
    scope: hasExplicitRange ? "range" : archiveScopeSelect.value,
    contentMode: archiveContentModeSelect.value || "posts",
    year: archiveYearInput.value.trim(),
    from: archiveFromInput.value || "",
    to: archiveToInput.value || "",
  };
}

function getArchivePdfOptions() {
  return {
    bandSize: Math.max(100, Math.min(1000, Number(archiveBandSizeSelect.value) || 200)),
    imageSize: archiveImageSizeSelect.value || "medium",
    includeMetrics: archiveMetricsToggle.checked,
    keepThreadsTogether: archiveThreadsToggle.checked,
    indentThreads: archivePdfIndentToggle.checked,
  };
}

function getArchiveWaveSize() {
  return Math.max(100, Math.min(1000, Number(archiveWaveSizeSelect.value) || 500));
}

function getArchivePreferences() {
  const filters = getArchiveFilters();
  const options = getArchivePdfOptions();
  return {
    filters,
    waveSize: getArchiveWaveSize(),
    pdfOptions: options,
    livePreview: archiveLivePreviewToggle.checked,
  };
}

function applyArchivePreferences(preferences = {}) {
  const filters = preferences.filters || {};
  archiveScopeSelect.value = filters.scope === "year" || filters.scope === "range" ? filters.scope : "all";
  archiveContentModeSelect.value = filters.contentMode === "full" || filters.contentMode === "threads" ? filters.contentMode : "posts";
  archiveYearInput.value = String(filters.year || "");
  archiveFromInput.value = String(filters.from || "");
  archiveToInput.value = String(filters.to || "");
  if (archiveFromInput.value || archiveToInput.value) {
    archiveScopeSelect.value = "range";
  }

  const waveSize = String(preferences.waveSize || "");
  if ([...archiveWaveSizeSelect.options].some((option) => option.value === waveSize)) {
    archiveWaveSizeSelect.value = waveSize;
  }

  const pdfOptions = preferences.pdfOptions || {};
  const bandSize = String(pdfOptions.bandSize || "");
  if ([...archiveBandSizeSelect.options].some((option) => option.value === bandSize)) {
    archiveBandSizeSelect.value = bandSize;
  }
  archiveImageSizeSelect.value = pdfOptions.imageSize === "small" || pdfOptions.imageSize === "large" ? pdfOptions.imageSize : "medium";
  archiveMetricsToggle.checked = pdfOptions.includeMetrics !== false;
  archiveThreadsToggle.checked = pdfOptions.keepThreadsTogether !== false;
  archivePdfIndentToggle.checked = pdfOptions.indentThreads !== false;
  archiveLivePreviewToggle.checked = preferences.livePreview !== false;
  updateArchiveScopeFields();
}

function serializeArchiveFilters(filters = getArchiveFilters()) {
  return JSON.stringify(filters);
}

async function persistArchivePreferences() {
  await persistSettings();
}

async function saveArchiveSession(nextSession) {
  archiveSession = nextSession || null;
  await sendToServiceWorker("SAVE_ARCHIVE_SESSION", { session: archiveSession }, { timeoutMs: 120000 });
  renderArchiveStartHint();
  renderArchiveStatusLine();
}

async function saveArchiveCatalogState(nextCatalog = archiveCatalog) {
  archiveCatalog = nextCatalog || null;
  try {
    await sendToServiceWorker("SAVE_ARCHIVE_CATALOG", { catalog: archiveCatalog }, { timeoutMs: 120000 });
  } catch (error) {
    console.warn("Archivkatalog konnte nicht dauerhaft gespeichert werden.", error);
  }
}

async function clearArchiveSession() {
  archiveSession = null;
  archiveCatalog = null;
  archivePreviewState = null;
  activeArchiveRunId = null;
  activeArchiveRunState = "idle";
  archiveLastCheckpoint = "";
  archiveTransientNotice = "";
  await sendToServiceWorker("CLEAR_ARCHIVE_SESSION", {}, { timeoutMs: 30000 });
  await sendToServiceWorker("CLEAR_ARCHIVE_CATALOG", {}, { timeoutMs: 30000 }).catch((error) => {
    console.warn("Archivkatalog konnte nicht geleert werden.", error);
  });
}

function updateArchiveScopeFields() {
  const scope = archiveScopeSelect.value;
  archiveYearWrap.hidden = scope !== "year";
  archiveFromWrap.hidden = scope !== "range";
  archiveToWrap.hidden = scope !== "range";
}

function setArchiveProgress({ title, step, percent = 0, detail = "" } = {}) {
  archiveJobState = { title, step, percent, detail };
  archiveProgressTitle.textContent = title || t("archiveProgressIdleTitle");
  archiveProgressStep.textContent = step || t("archiveProgressIdleStep");
  archiveProgressDetail.textContent = detail || "";
  archiveProgressFill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
}

function renderArchivePreview(preview = archivePreviewState) {
  archivePreviewPanel.hidden = !archiveLivePreviewToggle.checked;
  archivePreviewCard.innerHTML = "";

  if (!archiveLivePreviewToggle.checked || !preview) {
    const empty = document.createElement("p");
    empty.id = "archive-preview-empty";
    empty.className = "settings-note";
    empty.textContent = t("archivePreviewEmpty");
    archivePreviewCard.appendChild(empty);
    return;
  }

  const meta = document.createElement("p");
  meta.className = "archive-preview-meta";
  meta.textContent = preview.meta || "";
  archivePreviewCard.appendChild(meta);

  if (preview.imageDataUrl) {
    const image = document.createElement("img");
    image.src = preview.imageDataUrl;
    image.alt = preview.alt || t("archivePreviewImageAlt");
    archivePreviewCard.appendChild(image);
  }

  if (preview.text) {
    const text = document.createElement("p");
    text.className = "archive-preview-text";
    text.textContent = preview.text;
    archivePreviewCard.appendChild(text);
  }

  if (preview.metric) {
    const metric = document.createElement("p");
    metric.className = "archive-preview-meta";
    metric.textContent = preview.metric;
    archivePreviewCard.appendChild(metric);
  }
}

function getArchiveCurrentWave() {
  if (archiveSession?.waveIndex) {
    return archiveSession.waveIndex;
  }
  return 1;
}

function renderArchiveStatusLine() {
  if (archiveTransientNotice) {
    archiveRunStatusLine.textContent = archiveTransientNotice;
    return;
  }

  if (!archiveSession && activeArchiveRunState === "idle" && !archiveLastCheckpoint) {
    archiveRunStatusLine.textContent = t("archiveRunStatusIdle");
    return;
  }

  const wave = getArchiveCurrentWave();
  const checkpoint = archiveLastCheckpoint || archivePreviewState?.meta || archiveJobState?.detail || archiveJobState?.step || "";

  if (activeArchiveRunState === "paused") {
    archiveRunStatusLine.textContent = t("archiveRunStatusPaused", {
      wave,
      checkpoint: checkpoint || t("archiveRunStatusNoCheckpoint"),
    });
    return;
  }

  if (activeArchiveRunState === "running") {
    archiveRunStatusLine.textContent = t("archiveRunStatusRunning", {
      wave,
      checkpoint: checkpoint || t("archiveRunStatusNoCheckpoint"),
    });
    return;
  }

  if (archiveSession?.status === "cancelled" || activeArchiveRunState === "cancelled") {
    archiveRunStatusLine.textContent = t("archiveRunStatusCancelled", {
      wave,
      checkpoint: checkpoint || t("archiveRunStatusNoCheckpoint"),
    });
    return;
  }

  archiveRunStatusLine.textContent = t("archiveRunStatusReady", {
    wave,
    checkpoint: checkpoint || t("archiveRunStatusNoCheckpoint"),
  });
}

function renderArchiveStartHint() {
  if (activeArchiveRunState === "paused") {
    archiveStartHint.textContent = t("archiveStartHintPaused", {
      wave: getArchiveCurrentWave(),
    });
    return;
  }

  if (archiveSession?.hasMore) {
    archiveStartHint.textContent = t("archiveStartHintResume", {
      wave: (archiveSession.waveIndex || 0) + 1,
    });
    return;
  }

  if (archiveSession?.exportedPosts) {
    archiveStartHint.textContent = t("archiveStartHintRestart", {
      wave: 1,
    });
    return;
  }

  archiveStartHint.textContent = t("archiveStartHintFresh");
}

function syncArchiveTransientNoticeFromCatalog() {
  archiveTransientNotice = archiveCatalog
    ? t("archiveImportedNotice", {
        posts: archiveCatalog.posts.length,
        images: archiveCatalog.summary.imageCount,
      })
    : "";
}

function updateArchiveRunControls() {
  const isRunning = activeArchiveRunState === "running";
  const isPaused = activeArchiveRunState === "paused";
  const hasRun = Boolean(activeArchiveRunId);
  archivePauseButton.disabled = !isRunning;
  archiveResumeButton.disabled = !isPaused;
  archiveCancelButton.disabled = !hasRun || activeArchiveRunState === "idle" || activeArchiveRunState === "cancelled";
  archivePauseButton.hidden = !isRunning;
  archiveResumeButton.hidden = !isPaused;
  archiveCancelButton.hidden = !isRunning && !isPaused;
}

async function setArchiveRunControl(action) {
  if (!activeArchiveRunId) {
    return;
  }

  await sendToServiceWorker("SET_ARCHIVE_RUN_CONTROL", {
    runId: activeArchiveRunId,
    action,
  }, { timeoutMs: 30000 });

  if (action === "pause") {
    activeArchiveRunState = "paused";
  } else if (action === "resume") {
    activeArchiveRunState = "running";
  } else if (action === "cancel") {
    activeArchiveRunState = "cancelled";
  }
  updateArchiveRunControls();
  renderArchiveStatusLine();
  renderArchiveStartHint();
}

function estimateArchiveBandCount(postCount, options = getArchivePdfOptions()) {
  const size = Math.max(100, Math.min(1000, Number(options.bandSize) || 200));
  return postCount > 0 ? Math.ceil(postCount / size) : 0;
}

function updateArchiveSummary(catalog = archiveCatalog) {
  const postCount = catalog?.posts?.length || archiveSession?.exportedPosts || 0;
  const imageCount = catalog?.summary?.imageCount || archiveSession?.exportedImages || 0;
  const bandBase = postCount;
  archiveSummaryPosts.textContent = String(postCount);
  archiveSummaryImages.textContent = String(imageCount);
  archiveSummaryBands.textContent = String(estimateArchiveBandCount(bandBase));
}

function renderArchiveSpec() {
  const items = t("archiveSpecItems");
  archiveSpecContent.innerHTML = "";
  const intro = document.createElement("p");
  intro.className = "settings-note";
  intro.textContent = t("archiveSpecIntro");
  archiveSpecContent.appendChild(intro);

  const list = document.createElement("ol");
  list.className = "archive-spec-list";
  (Array.isArray(items) ? items : []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  archiveSpecContent.appendChild(list);
}

function renderArchiveResults(catalog = archiveCatalog) {
  archiveResults.innerHTML = "";

  if (!catalog) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = archiveSession
      ? t("archiveSessionMeta", {
          wave: archiveSession.waveIndex || 1,
          next: archiveSession.hasMore ? t("archiveSessionContinue") : t("archiveSessionComplete"),
          exported: archiveSession.exportedPosts || 0,
        })
      : t("archiveResultsEmpty");
    archiveResults.appendChild(empty);
    return;
  }

  const card = document.createElement("article");
  card.className = "archive-result-card";
  const title = document.createElement("strong");
  title.textContent = t("archiveResultsTitle", { count: catalog.posts.length });
  const note = document.createElement("p");
  note.className = "settings-note";
  note.textContent = t("archiveResultsMeta", {
    from: catalog.summary?.from || "—",
    to: catalog.summary?.to || "—",
    images: catalog.summary?.imageCount || 0,
  });
  const resume = document.createElement("p");
  resume.className = "settings-note";
  resume.textContent = t("archiveSessionMeta", {
    wave: archiveSession?.waveIndex || 1,
    next: archiveSession?.hasMore ? t("archiveSessionContinue") : t("archiveSessionComplete"),
    exported: archiveSession?.exportedPosts || catalog.posts.length,
  });
  const actions = document.createElement("div");
  actions.className = "archive-result-actions";

  const zipButton = document.createElement("button");
  zipButton.type = "button";
  zipButton.className = "ghost-button";
  zipButton.textContent = t("archiveDownloadZipButton");
  zipButton.addEventListener("click", () => {
    void exportArchiveZipFromCatalog(catalog);
  });

  const pdfButton = document.createElement("button");
  pdfButton.type = "button";
  pdfButton.className = "ghost-button";
  pdfButton.textContent = t("archiveDownloadPdfButton");
  pdfButton.addEventListener("click", () => {
    void exportArchivePdfBandsFromCatalog(catalog);
  });

  const htmlButton = document.createElement("button");
  htmlButton.type = "button";
  htmlButton.className = "ghost-button";
  htmlButton.textContent = t("archiveDownloadHtmlButton");
  htmlButton.addEventListener("click", () => {
    void exportArchiveHtmlFromCatalog(catalog);
  });

  actions.append(zipButton, htmlButton, pdfButton);
  card.append(title, note, resume, actions);
  archiveResults.appendChild(card);
}

function renderArchiveWorkspace() {
  updateArchiveScopeFields();
  renderArchiveSpec();
  updateArchiveSummary();
  renderArchiveResults();
  archiveNextWaveButton.disabled = !authAccount || Boolean(archiveSession && !archiveSession.hasMore && archiveSession.exportedPosts > 0);
  updateArchiveRunControls();
  renderArchiveStatusLine();
  renderArchiveStartHint();
  renderArchivePreview();
  if (!archiveJobState) {
    setArchiveProgress({});
  } else {
    setArchiveProgress(archiveJobState);
  }
}

function invalidateArchiveCatalog() {
  archiveCatalog = null;
  archiveSession = null;
  archivePreviewState = null;
  activeArchiveRunId = null;
  activeArchiveRunState = "idle";
  archiveLastCheckpoint = "";
  archiveTransientNotice = "";
  void sendToServiceWorker("CLEAR_ARCHIVE_SESSION", {}, { timeoutMs: 30000 }).catch((error) => {
    console.error(error);
  });
  void sendToServiceWorker("CLEAR_ARCHIVE_CATALOG", {}, { timeoutMs: 30000 }).catch((error) => {
    console.error(error);
  });
  renderArchiveWorkspace();
}

function updatePublishAvailability() {
  const baseText = sourceText.value.trim();
  const segments = activeSegments.length > 0
    ? activeSegments
    : (currentComposedText.trim() ? [currentComposedText] : []);
  const hasTooLongSegment = segments.some((entry) => entry.length > MAX_POST_LENGTH);
  const hasMissingAltText = altTextRequired && getSegmentPayloads().some((segment) =>
    (segment.images || []).some((image) => !String(image.alt || "").trim()));
  const hasOversizedImage = getSegmentPayloads().some((segment) =>
    (segment.images || []).some((image) => image.validation?.tooBig));
  const canPublish = Boolean(baseText) && !hasTooLongSegment && !hasMissingAltText;
  const canPublishWithImages = canPublish && !hasOversizedImage;

  publishButton.disabled = !canPublishWithImages;
  publishButton.classList.toggle("is-danger", hasTooLongSegment || hasMissingAltText || hasOversizedImage);
  const publishWarnings = [];
  if (hasMissingAltText) {
    publishWarnings.push(t("publishAltTextWarning"));
  }
  if (hasOversizedImage) {
    publishWarnings.push(t("publishImageTooLargeWarning"));
  }
  publishWarning.hidden = publishWarnings.length === 0;
  publishWarning.textContent = publishWarnings.join("\n");
}

function updateComposerLockState() {
  sourceText.disabled = composerLocked;
  counterToggle.disabled = composerLocked;
  threadEmojiToggle.disabled = composerLocked;
  clearButton.disabled = composerLocked;
  composerLockNote.hidden = !composerLocked;
}

function setComposerLocked(locked) {
  composerLocked = locked;
  updateComposerLockState();
}

function detectBrowserLocale() {
  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((value) => value.toLowerCase().split("-")[0]);

  return candidates.find((value) => SUPPORTED_LOCALES.includes(value)) || DEFAULT_LOCALE;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallButtonVisibility() {
  const canShow = !isStandaloneMode() && (Boolean(deferredInstallPrompt) || isIosDevice());
  installButton.hidden = !canShow;
}

function formatTemplate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getLocaleStrings(locale = currentLocale) {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

function t(key, values = {}) {
  const localeStrings = getLocaleStrings();
  const fallbackStrings = getLocaleStrings(DEFAULT_LOCALE);
  const template = localeStrings[key] ?? fallbackStrings[key] ?? key;
  return typeof template === "string" ? formatTemplate(template, values) : template;
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", themeMode === "dark");
  if (themeStatusNote) {
    themeStatusNote.textContent = themeMode === "dark" ? t("themeDarkActive") : t("themeLightActive");
  }
  if (themeToggleButton) {
    themeToggleButton.textContent = themeMode === "dark" ? t("lightModeButton") : t("darkModeButton");
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLocale;
  syncArchiveTransientNoticeFromCatalog();

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  identifierField.placeholder = "z. B. name.bsky.social";
  passwordField.placeholder = "xxxx-xxxx-xxxx-xxxx";
  sourceText.placeholder = t("sourcePlaceholder");
  hashtagInput.placeholder = t("hashtagInputPlaceholder");
  loginButton.textContent = t("loginButton");
  logoutButton.textContent = t("logoutButton");
  publishButton.textContent = t("publishButton");
  clearButton.textContent = t("clearButton");
  settingsButton.textContent = t("settingsButton");
  loadThreadButton.textContent = t("loadThreadButton");
  helpButton.textContent = t("helpButton");
  installButton.textContent = t("installButton");
  saveThreadButton.textContent = t("saveThreadButton");
  themeToggleButton.textContent = themeMode === "dark" ? t("lightModeButton") : t("darkModeButton");
  themeStatusNote.textContent = themeMode === "dark" ? t("themeDarkActive") : t("themeLightActive");
  archiveButton.textContent = t("archiveLaunchButton");
  archiveBackButton.textContent = t("archiveBackButton");
  archiveNextWaveButton.textContent = t("archiveNextWaveButton");
  archiveExportZipButton.textContent = t("archiveExportZipButton");
  archiveExportHtmlButton.textContent = t("archiveExportHtmlButton");
  archiveExportPdfButton.textContent = t("archiveExportPdfButton");
  archiveImportButton.textContent = t("archiveImportButton");
  archiveResetButton.textContent = t("archiveResetButton");
  archivePauseButton.textContent = t("archivePauseButton");
  archiveResumeButton.textContent = t("archiveResumeButton");
  archiveCancelButton.textContent = t("archiveCancelButton");
  checkUpdatesButton.textContent = t("checkUpdatesButton");
  reloadAppButton.textContent = t("reloadButton");
  exportSettingsButton.textContent = t("exportSettingsButton");
  importSettingsButton.textContent = t("importSettingsButton");
  clearHistoryButton.textContent = t("clearHistoryButton");
  hashtagEditSaveButton.textContent = t("saveButton");
  hashtagEditCancelButton.textContent = t("cancelButton");
  hashtagEditCancelTop.textContent = t("closeButton");
  altTextSaveButton.textContent = t("saveButton");
  altTextCancelButton.textContent = t("cancelButton");
  altTextCloseTop.textContent = t("closeButton");
  imageEditorSaveButton.textContent = t("saveButton");
  imageEditorCancelButton.textContent = t("cancelButton");
  imageEditorCloseTop.textContent = t("closeButton");
  imageFlipHorizontalButton.textContent = t("flipHorizontalButton");
  imageFlipVerticalButton.textContent = t("flipVerticalButton");
  imageRotateLeftButton.textContent = t("rotateLeftButton");
  imageResetButton.textContent = t("resetImageButton");
  confirmDialogConfirmButton.textContent = t("confirmYes");
  confirmDialogCancelButton.textContent = t("confirmNo");
  publishResultLink.textContent = t("openPostLink");
  historyButton.textContent = t("historyButton");
  composerUnlockButton.textContent = t("composerUnlockButton");
  hashtagAddButton.textContent = t("addHashtagButton");
  nextTipButton.textContent = t("nextTipButton");
  hideTipsButton.textContent = t("hideTipsButton");
  Array.from(hashtagPlacementSelect.options).forEach((option) => {
    option.textContent = option.value === "last" ? t("hashtagPlacementLast") : t("hashtagPlacementFirst");
  });
  Array.from(archiveScopeSelect.options).forEach((option) => {
    if (option.value === "year") {
      option.textContent = t("archiveScopeYear");
    } else if (option.value === "range") {
      option.textContent = t("archiveScopeRange");
    } else {
      option.textContent = t("archiveScopeAll");
    }
  });
  Array.from(archiveContentModeSelect.options).forEach((option) => {
    if (option.value === "full") {
      option.textContent = t("archiveContentModeFull");
    } else if (option.value === "threads") {
      option.textContent = t("archiveContentModeThreads");
    } else {
      option.textContent = t("archiveContentModePosts");
    }
  });
  Array.from(archiveImageSizeSelect.options).forEach((option) => {
    if (option.value === "small") {
      option.textContent = t("archiveImageSizeSmall");
    } else if (option.value === "large") {
      option.textContent = t("archiveImageSizeLarge");
    } else {
      option.textContent = t("archiveImageSizeMedium");
    }
  });
  renderTip();
  renderHashtagCloud();
  renderHistoryList();
  updateTipsVisibility();
  altTextRequiredToggle.checked = altTextRequired;
  publishWarning.textContent = t("publishAltTextWarning");
  updateComposerLockState();

  const languageNames = t("languageNames");
  Array.from(languageSelect.options).forEach((option) => {
    option.textContent = languageNames[option.value] || option.value;
  });
  languageSelect.value = localePreference;

  renderSegments();
  updateStatusForAuth();
  renderArchiveWorkspace();
  applyTheme();
}

function preserveScrollPosition(callback) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  callback();
  window.requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

function formatImageSize(sizeBytes) {
  const megabytes = Math.max(0, Number(sizeBytes) || 0) / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
}

function pickRandomTipIndex() {
  const tips = t("tipsList");
  if (!Array.isArray(tips) || tips.length === 0) {
    return 0;
  }
  return Math.floor(Math.random() * tips.length);
}

function renderTip() {
  const tips = t("tipsList");
  if (!Array.isArray(tips) || tips.length === 0) {
    tipText.textContent = "";
    return;
  }

  const safeIndex = Math.min(currentTipIndex, tips.length - 1);
  tipText.textContent = tips[safeIndex];
}

function updateTipsVisibility() {
  tipsPanel.hidden = !tipsVisible;
  tipsVisibleToggle.checked = tipsVisible;
}

function nextTip() {
  const tips = t("tipsList");
  if (!Array.isArray(tips) || tips.length <= 1) {
    renderTip();
    return;
  }

  let nextIndex = currentTipIndex;
  while (nextIndex === currentTipIndex) {
    nextIndex = Math.floor(Math.random() * tips.length);
  }
  currentTipIndex = nextIndex;
  renderTip();
}

function parseHashtagValue(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replace(/[.,;:!?]+$/g, "");

  if (!cleaned) {
    return null;
  }

  return {
    value: cleaned,
    normalized: cleaned.toLowerCase(),
  };
}

function normalizeHashtagEntries(entries) {
  const seen = new Set();
  const normalizedEntries = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const parsed = typeof entry === "string"
      ? parseHashtagValue(entry)
      : parseHashtagValue(entry?.value || entry?.tag || entry?.label || "");

    if (!parsed || seen.has(parsed.normalized)) {
      continue;
    }

    seen.add(parsed.normalized);
    normalizedEntries.push(parsed);
  }

  return normalizedEntries;
}

function normalizeSelectedHashtagEntries(entries, availableHashtags = hashtags) {
  const validSet = new Set(availableHashtags.map((tag) => tag.normalized));
  const unique = [];
  const seen = new Set();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = typeof entry === "string"
      ? parseHashtagValue(entry)?.normalized || String(entry).trim().toLowerCase()
      : parseHashtagValue(entry?.value || entry?.tag || entry?.normalized || "")?.normalized;

    if (!normalized || !validSet.has(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function mergeHashtagEntries(baseEntries, importedEntries) {
  return normalizeHashtagEntries([...(baseEntries || []), ...(importedEntries || [])]);
}

function findHashtag(normalized) {
  return hashtags.find((tag) => tag.normalized === normalized) || null;
}

function formatHashtag(tag) {
  return `#${tag}`;
}

function getDisplayHashtag(normalized) {
  return findHashtag(normalized)?.value || normalized;
}

function getHashtagFontClass(tag) {
  return `hashtag-chip--size-${(tag.value.length % 4) + 1}`;
}

function getSelectedHashtagText() {
  return selectedHashtags.map((tag) => formatHashtag(getDisplayHashtag(tag))).join(" ");
}

function setBackupStatus(message, tone = "neutral") {
  window.clearTimeout(backupStatusTimer);
  backupStatus.textContent = message;
  backupStatus.hidden = !message;
  if (message) {
    backupStatus.dataset.tone = tone;
  } else {
    delete backupStatus.dataset.tone;
  }

  if (message) {
    backupStatusTimer = window.setTimeout(() => {
      backupStatus.hidden = true;
      backupStatus.textContent = "";
      delete backupStatus.dataset.tone;
    }, 5000);
  }
}

function openHashtagEditDialog(tag) {
  editingHashtagNormalized = tag.normalized;
  hashtagEditInput.value = tag.value;
  hashtagEditDialog.showModal();
  window.setTimeout(() => {
    hashtagEditInput.focus();
    hashtagEditInput.select();
  }, 0);
}

function closeHashtagEditDialog() {
  editingHashtagNormalized = null;
  hashtagEditDialog.close();
}

async function saveEditedHashtag() {
  if (!editingHashtagNormalized) {
    closeHashtagEditDialog();
    return;
  }

  const currentTag = findHashtag(editingHashtagNormalized);
  if (!currentTag) {
    closeHashtagEditDialog();
    return;
  }

  const parsed = parseHashtagValue(hashtagEditInput.value);
  if (!parsed) {
    setStatus(t("hashtagInvalid"), "error");
    hashtagEditInput.focus();
    return;
  }

  const existing = findHashtag(parsed.normalized);
  const isSelected = selectedHashtags.includes(currentTag.normalized);

  if (existing && existing.normalized !== currentTag.normalized) {
    hashtags = hashtags
      .filter((entry) => entry.normalized !== currentTag.normalized)
      .map((entry) => (entry.normalized === existing.normalized ? parsed : entry));
    selectedHashtags = normalizeSelectedHashtagEntries(
      [
        ...selectedHashtags.filter((entry) => entry !== currentTag.normalized),
        ...(isSelected ? [parsed.normalized] : []),
      ],
      hashtags,
    );
  } else {
    hashtags = hashtags.map((entry) => (entry.normalized === currentTag.normalized ? parsed : entry));
    selectedHashtags = selectedHashtags.map((entry) => (entry === currentTag.normalized ? parsed.normalized : entry));
  }

  renderHashtagCloud();
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  await persistSettings();
  setStatus(t("hashtagUpdated"));
  closeHashtagEditDialog();
}

function createDefaultImageEdit() {
  return {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    flipX: false,
    flipY: false,
    rotation: 0,
  };
}

function isImageUsingDefaultEdit(image) {
  const edit = normalizeImageEdit(image?.edit);
  return edit.zoom === 1
    && edit.offsetX === 0
    && edit.offsetY === 0
    && edit.flipX === false
    && edit.flipY === false
    && edit.rotation === 0;
}

function normalizeImageEdit(edit = {}) {
  return {
    zoom: Math.min(3, Math.max(0.5, Number(edit.zoom) || 1)),
    offsetX: Number(edit.offsetX) || 0,
    offsetY: Number(edit.offsetY) || 0,
    flipX: Boolean(edit.flipX),
    flipY: Boolean(edit.flipY),
    rotation: ((((Number(edit.rotation) || 0) % 360) + 360) % 360),
  };
}

function normalizeThreadImage(entry = {}) {
  if (!entry?.dataUrl) {
    return null;
  }

  return {
    id: entry.id || crypto.randomUUID(),
    name: entry.name || "image",
    type: entry.type || "image/jpeg",
    dataUrl: entry.dataUrl,
    alt: String(entry.alt || "").slice(0, MAX_ALT_TEXT_LENGTH),
    width: Number(entry.width) || 0,
    height: Number(entry.height) || 0,
    originalSizeBytes: Math.max(0, Number(entry.originalSizeBytes) || 0),
    edit: normalizeImageEdit(entry.edit),
    exportQuality: Math.min(0.92, Math.max(0.45, Number(entry.exportQuality) || 0.88)),
    exportScale: Math.min(1, Math.max(0.35, Number(entry.exportScale) || 1)),
    validation: entry.validation && typeof entry.validation === "object"
      ? {
          sizeBytes: Number(entry.validation.sizeBytes) || 0,
          width: Number(entry.validation.width) || 0,
          height: Number(entry.validation.height) || 0,
          exceedsDimensions: Boolean(entry.validation.exceedsDimensions),
          tooBig: Boolean(entry.validation.tooBig),
        }
      : { sizeBytes: 0, width: 0, height: 0, exceedsDimensions: false, tooBig: false },
  };
}

function normalizeSegmentImages(segments) {
  return (Array.isArray(segments) ? segments : []).map((images) =>
    (Array.isArray(images) ? images : [])
      .map((entry) => normalizeThreadImage(entry))
      .filter(Boolean)
      .slice(0, MAX_IMAGES_PER_SEGMENT),
  );
}

function normalizeSegmentOverrides(segments) {
  const normalized = (Array.isArray(segments) ? segments : [])
    .map((entry) => String(entry || ""))
    .filter((entry) => entry.trim().length > 0);

  return normalized.length > 0 ? normalized : null;
}

function normalizePostingHistory(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const url = typeof entry?.url === "string" ? entry.url.trim() : "";
    const createdAt = typeof entry?.createdAt === "string" ? entry.createdAt : "";

    if (!url || !createdAt) {
      continue;
    }

    const key = `${url}|${createdAt}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      id: typeof entry.id === "string" && entry.id ? entry.id : key,
      url,
      createdAt,
      threadCount: Math.max(1, Number(entry.threadCount) || 1),
      imageCount: Math.max(0, Number(entry.imageCount) || 0),
    });
  }

  return result
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_POSTING_HISTORY);
}

function mergePostingHistoryEntries(existing, imported) {
  return normalizePostingHistory([...(Array.isArray(imported) ? imported : []), ...(Array.isArray(existing) ? existing : [])]);
}

function syncSegmentImages(segmentCount) {
  const next = [];
  for (let index = 0; index < segmentCount; index += 1) {
    next[index] = Array.isArray(segmentImages[index]) ? segmentImages[index] : [];
  }
  segmentImages = next;
}

function getSegmentTextPayloads() {
  return activeSegments.length > 0 ? activeSegments.map((entry) => entry.trim()) : [currentComposedText.trim()];
}

function getSegmentPayloads() {
  const texts = getSegmentTextPayloads();
  return texts.map((text, index) => ({
    text,
    images: Array.isArray(segmentImages[index]) ? segmentImages[index] : [],
  }));
}

async function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = dataUrl;
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

async function createThreadImageFromFile(file) {
  const dataUrl = await fileToDataUrl(file);
  const dimensions = await loadImageDimensions(dataUrl);
  return normalizeThreadImage({
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "image/jpeg",
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    originalSizeBytes: file.size,
    alt: "",
    edit: createDefaultImageEdit(),
  });
}

function getImageMetrics(image, frameWidth, frameHeight, edit = image.edit) {
  const normalizedEdit = normalizeImageEdit(edit);
  const rotation = normalizedEdit.rotation;
  const quarterTurn = rotation % 180 !== 0;
  const sourceWidth = quarterTurn ? image.height : image.width;
  const sourceHeight = quarterTurn ? image.width : image.height;
  const baseScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const drawWidth = image.width * baseScale * normalizedEdit.zoom;
  const drawHeight = image.height * baseScale * normalizedEdit.zoom;
  return {
    ...normalizedEdit,
    drawWidth,
    drawHeight,
    centerX: frameWidth / 2 + normalizedEdit.offsetX,
    centerY: frameHeight / 2 + normalizedEdit.offsetY,
  };
}

async function loadImageBitmapForDataUrl(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function renderImageToCanvas(image, canvas, options = {}) {
  const width = options.width || canvas.width;
  const height = options.height || canvas.height;
  const fit = options.fit || "cover";
  if (!canvas.width) {
    canvas.width = width;
  }
  if (!canvas.height) {
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bitmap = await loadImageBitmapForDataUrl(image.dataUrl);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();

  if (fit === "contain") {
    const scale = Math.min(width / bitmap.width, height / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    ctx.drawImage(
      bitmap,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  } else {
    const metrics = getImageMetrics(image, width, height, options.edit || image.edit);
    ctx.translate(metrics.centerX, metrics.centerY);
    ctx.rotate((metrics.rotation * Math.PI) / 180);
    ctx.scale(metrics.flipX ? -1 : 1, metrics.flipY ? -1 : 1);
    ctx.drawImage(bitmap, -metrics.drawWidth / 2, -metrics.drawHeight / 2, metrics.drawWidth, metrics.drawHeight);
  }

  ctx.restore();
  bitmap.close?.();
}

async function renderImageToBlob(image) {
  if (isImageUsingDefaultEdit(image)) {
    const canvas = document.createElement("canvas");
    const dimensionScale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(1, image.width || 1, image.height || 1));
    const exportScale = Math.min(1, dimensionScale, Math.max(0.35, Number(image.exportScale) || 1));
    canvas.width = Math.max(1, Math.round((image.width || 1) * exportScale));
    canvas.height = Math.max(1, Math.round((image.height || 1) * exportScale));
    await renderImageToCanvas(image, canvas, {
      width: canvas.width,
      height: canvas.height,
      fit: "contain",
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
    if (!blob) {
      throw new Error("Image blob could not be created.");
    }
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const canvas = document.createElement("canvas");
  const scale = IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH;
  const exportScale = Math.min(1, Math.max(0.35, Number(image.exportScale) || 1));
  const exportEdit = {
    ...normalizeImageEdit(image.edit),
    offsetX: (Number(image.edit?.offsetX) || 0) * scale * exportScale,
    offsetY: (Number(image.edit?.offsetY) || 0) * scale * exportScale,
  };
  canvas.width = Math.max(480, Math.round(IMAGE_EXPORT_WIDTH * exportScale));
  canvas.height = Math.max(320, Math.round(IMAGE_EXPORT_HEIGHT * exportScale));
  await renderImageToCanvas(image, canvas, {
    width: canvas.width,
    height: canvas.height,
    edit: exportEdit,
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
  if (!blob) {
    throw new Error("Image blob could not be created.");
  }
  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

async function validateThreadImage(image) {
  const rendered = await renderImageToBlob(image);
  image.validation = {
    sizeBytes: rendered.blob.size,
    width: rendered.width,
    height: rendered.height,
    exceedsDimensions: rendered.width > IMAGE_MAX_DIMENSION || rendered.height > IMAGE_MAX_DIMENSION,
    tooBig: rendered.blob.size > IMAGE_BLOB_LIMIT || rendered.width > IMAGE_MAX_DIMENSION || rendered.height > IMAGE_MAX_DIMENSION,
  };
  return image.validation;
}

async function validateSegmentImages() {
  const token = ++imageValidationToken;
  const images = segmentImages.flatMap((items) => items || []);
  for (const image of images) {
    await validateThreadImage(image);
  }
  if (token !== imageValidationToken) {
    return;
  }
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
}

function scheduleImageValidation() {
  void validateSegmentImages().catch((error) => {
    console.error(error);
  });
}

function showProgressDialog(title, message) {
  progressTitle.textContent = title;
  progressMessage.textContent = message;
  if (!progressDialog.open) {
    progressDialog.showModal();
  }
}

function hideProgressDialog() {
  if (progressDialog.open) {
    progressDialog.close();
  }
}

function showErrorDialog(message, title = t("errorTitle")) {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  if (!errorDialog.open) {
    errorDialog.showModal();
  }
}

function setAltTextCount() {
  altTextCount.textContent = `${altTextInput.value.length}/${MAX_ALT_TEXT_LENGTH}`;
}

function openAltTextDialog(segmentIndex, imageIndex) {
  const image = segmentImages[segmentIndex]?.[imageIndex];
  if (!image) {
    return;
  }
  editingAltTarget = { segmentIndex, imageIndex };
  altTextInput.value = image.alt || "";
  setAltTextCount();
  altTextDialog.showModal();
  window.setTimeout(() => altTextInput.focus(), 0);
}

function closeAltTextDialog() {
  editingAltTarget = null;
  altTextDialog.close();
}

async function saveAltText() {
  if (!editingAltTarget) {
    closeAltTextDialog();
    return;
  }
  const { segmentIndex, imageIndex } = editingAltTarget;
  const image = segmentImages[segmentIndex]?.[imageIndex];
  if (!image) {
    closeAltTextDialog();
    return;
  }
  image.alt = altTextInput.value.slice(0, MAX_ALT_TEXT_LENGTH);
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
  closeAltTextDialog();
}

function cloneImageEdit(edit) {
  return normalizeImageEdit({ ...edit });
}

async function openImageEditorDialog(segmentIndex, imageIndex) {
  const image = segmentImages[segmentIndex]?.[imageIndex];
  if (!image) {
    return;
  }
  editingImageTarget = { segmentIndex, imageIndex };
  imageEditorDraft = cloneImageEdit(image.edit);
  imageZoomInput.value = String(imageEditorDraft.zoom);
  imageEditorSourceBitmap = await loadImageBitmapForDataUrl(image.dataUrl);
  imageEditorSuggestion.hidden = !image.validation?.tooBig;
  imageLossyResizeButton.hidden = !image.validation?.tooBig;
  drawImageEditor();
  imageEditorDialog.showModal();
}

function closeImageEditorDialog() {
  editingImageTarget = null;
  imageEditorSourceBitmap?.close?.();
  imageEditorSourceBitmap = null;
  imageEditorDraft = null;
  imageEditorDialog.close();
}

function getEditedImage() {
  if (!editingImageTarget) {
    return null;
  }
  return segmentImages[editingImageTarget.segmentIndex]?.[editingImageTarget.imageIndex] || null;
}

function drawImageEditor() {
  const image = getEditedImage();
  const ctx = imageEditorCanvas.getContext("2d");
  ctx.clearRect(0, 0, imageEditorCanvas.width, imageEditorCanvas.height);
  if (!image || !imageEditorSourceBitmap || !imageEditorDraft) {
    return;
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(0, 0, imageEditorCanvas.width, imageEditorCanvas.height);

  const metrics = getImageMetrics(
    { ...image, edit: imageEditorDraft },
    imageEditorCanvas.width,
    imageEditorCanvas.height,
    imageEditorDraft,
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, imageEditorCanvas.width, imageEditorCanvas.height);
  ctx.clip();
  ctx.translate(metrics.centerX, metrics.centerY);
  ctx.rotate((metrics.rotation * Math.PI) / 180);
  ctx.scale(metrics.flipX ? -1 : 1, metrics.flipY ? -1 : 1);
  ctx.drawImage(
    imageEditorSourceBitmap,
    -metrics.drawWidth / 2,
    -metrics.drawHeight / 2,
    metrics.drawWidth,
    metrics.drawHeight,
  );
  ctx.restore();

  ctx.strokeStyle = "rgba(20, 35, 61, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, imageEditorCanvas.width - 2, imageEditorCanvas.height - 2);
}

function startImageEditorDrag(event) {
  if (!imageEditorDraft) {
    return;
  }
  imageEditorDragging = true;
  imageEditorDragStart = {
    x: event.clientX,
    y: event.clientY,
    offsetX: imageEditorDraft.offsetX,
    offsetY: imageEditorDraft.offsetY,
  };
}

function updateImageEditorDrag(event) {
  if (!imageEditorDragging || !imageEditorDraft || !imageEditorDragStart) {
    return;
  }
  imageEditorDraft.offsetX = imageEditorDragStart.offsetX + (event.clientX - imageEditorDragStart.x);
  imageEditorDraft.offsetY = imageEditorDragStart.offsetY + (event.clientY - imageEditorDragStart.y);
  drawImageEditor();
}

function stopImageEditorDrag() {
  imageEditorDragging = false;
  imageEditorDragStart = null;
}

async function saveImageEditor() {
  const image = getEditedImage();
  if (!image || !imageEditorDraft) {
    closeImageEditorDialog();
    return;
  }
  image.edit = cloneImageEdit(imageEditorDraft);
  await validateThreadImage(image);
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
  closeImageEditorDialog();
}

function resetImageEditor() {
  imageEditorDraft = createDefaultImageEdit();
  imageZoomInput.value = "1";
  drawImageEditor();
}

async function applyLossyResize() {
  const image = getEditedImage();
  if (!image) {
    return;
  }
  image.exportScale = Math.max(0.35, (image.exportScale || 1) * 0.82);
  image.exportQuality = Math.max(0.45, (image.exportQuality || 0.88) * 0.86);
  await validateThreadImage(image);
  imageEditorSuggestion.hidden = !image.validation?.tooBig;
  imageLossyResizeButton.hidden = !image.validation?.tooBig;
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
}

function encodeSvgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createToolIcon(label) {
  return `<span class="sr-only">${label}</span>`;
}

async function handleSegmentImageSelection(segmentIndex, files) {
  const items = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  if (items.length === 0) {
    return;
  }

  const existingImages = Array.isArray(segmentImages[segmentIndex]) ? segmentImages[segmentIndex] : [];
  const remainingSlots = MAX_IMAGES_PER_SEGMENT - existingImages.length;
  const selectedItems = items.slice(0, Math.max(0, remainingSlots));

  if (selectedItems.length === 0) {
    setStatus(t("imagesLimitReached"), "error");
    return;
  }

  const newImages = [];
  for (const file of selectedItems) {
    newImages.push(await createThreadImageFromFile(file));
  }

  segmentImages[segmentIndex] = [...existingImages, ...newImages].slice(0, MAX_IMAGES_PER_SEGMENT);
  scheduleImageValidation();
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
}

function moveSegmentImage(segmentIndex, imageIndex, direction) {
  const images = segmentImages[segmentIndex];
  if (!Array.isArray(images)) {
    return;
  }
  const targetIndex = imageIndex + direction;
  if (targetIndex < 0 || targetIndex >= images.length) {
    return;
  }
  const nextImages = [...images];
  const [image] = nextImages.splice(imageIndex, 1);
  nextImages.splice(targetIndex, 0, image);
  segmentImages[segmentIndex] = nextImages;
  void persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
}

function deleteSegmentImage(segmentIndex, imageIndex) {
  const images = segmentImages[segmentIndex];
  if (!Array.isArray(images)) {
    return;
  }
  segmentImages[segmentIndex] = images.filter((_, index) => index !== imageIndex);
  void persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
}

async function openConfirmDialog({ title, message, confirmLabel, cancelLabel }) {
  confirmDialogTitle.textContent = title;
  confirmDialogMessage.textContent = message;
  confirmDialogConfirmButton.textContent = confirmLabel || t("confirmYes");
  confirmDialogCancelButton.textContent = cancelLabel || t("confirmNo");
  if (confirmDialog.open) {
    confirmDialog.close();
  }
  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmDialog.showModal();
  });
}

function resolveConfirmDialog(value) {
  if (confirmResolver) {
    confirmResolver(value);
    confirmResolver = null;
  }
  confirmDialog.close();
}

function buildThreadExportPayload() {
  const segments = getSegmentPayloads();
  return {
    app: "Threadline",
    exportedAt: new Date().toISOString(),
    version: CURRENT_VERSION_INFO.appVersion,
    cacheVersion: CURRENT_VERSION_INFO.cacheVersion,
    schemaVersion: 1,
    thread: {
      sourceText: sourceText.value,
      useCounters: counterToggle.checked,
      appendThreadEmoji,
      localePreference,
      hashtagPlacement,
      hashtags,
      selectedHashtags,
      segments: segments.map((segment, index) => ({
        text: segment.text,
        images: normalizeSegmentImages([segment.images])[0] || [],
      })),
    },
  };
}

function supportsCompressedThreadFiles() {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

async function gzipText(text) {
  const stream = new Blob([text], { type: "application/json" }).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

async function gunzipBlob(blob) {
  const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function isValidThreadImport(payload) {
  return Boolean(payload?.thread && (typeof payload.thread.sourceText === "string" || Array.isArray(payload.thread.segments)));
}

async function exportThreadFile() {
  const json = JSON.stringify(buildThreadExportPayload(), null, 2);
  const datePart = new Date().toISOString().slice(0, 10);
  const file = supportsCompressedThreadFiles()
    ? new File([await gzipText(json)], `threadline-thread-${datePart}.threadline.gz`, { type: "application/gzip" })
    : new File([json], `threadline-thread-${datePart}.json`, { type: "application/json" });
  await shareOrDownloadFile(file, file.name);
  setStatus(t("threadSaved"));
}

async function importThreadFile(file) {
  const text = /\.gz$/i.test(file.name) ? await gunzipBlob(file) : await file.text();
  const parsed = JSON.parse(text);
  if (!isValidThreadImport(parsed)) {
    throw new Error(t("threadImportInvalid"));
  }

  const confirmed = await openConfirmDialog({
    title: t("threadImportConfirmTitle"),
    message: t("threadImportConfirmText"),
    confirmLabel: t("confirmYes"),
    cancelLabel: t("confirmNo"),
  });
  if (!confirmed) {
    return;
  }

  const thread = parsed.thread;
  sourceText.value = thread.sourceText || "";
  counterToggle.checked = thread.useCounters !== false;
  appendThreadEmoji = thread.appendThreadEmoji === true;
  threadEmojiToggle.checked = appendThreadEmoji;
  localePreference = SUPPORTED_LOCALES.includes(thread.localePreference) || thread.localePreference === "auto"
    ? thread.localePreference
    : localePreference;
  currentLocale = localePreference === "auto" ? detectBrowserLocale() : localePreference;
  languageSelect.value = localePreference;
  hashtags = normalizeHashtagEntries(thread.hashtags);
  selectedHashtags = normalizeSelectedHashtagEntries(thread.selectedHashtags, hashtags);
  hashtagPlacement = thread.hashtagPlacement === "last" ? "last" : "first";
  hashtagPlacementSelect.value = hashtagPlacement;
  const importedSegments = Array.isArray(thread.segments) ? thread.segments : [];
  segmentOverrides = normalizeSegmentOverrides(importedSegments.map((segment) => segment?.text || ""));
  setComposerLocked(Boolean(segmentOverrides));
  segmentImages = importedSegments.length > 0
    ? normalizeSegmentImages(importedSegments.map((segment) => segment?.images || []))
    : normalizeSegmentImages(thread.segmentImages);

  await persistSettings();
  applyTranslations();
  renderHashtagCloud();
  renderSegments({ preserveOverrides: true });
  if (segmentImages.some((images) => (images || []).length > 0)) {
    scheduleImageValidation();
  }
  queueDraftSave();
  setStatus(t("threadLoaded"));
}

async function shareOrDownloadFile(file, fallbackName, options = {}) {
  const preferDownload = options.preferDownload === true;
  if (!preferDownload && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: fallbackName,
        files: [file],
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatArchiveDatePart(value) {
  return String(value || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function utf8Bytes(value) {
  return new TextEncoder().encode(String(value));
}

function parseJsonBytes(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let shift = 0; shift < 8; shift += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = utf8Bytes(entry.name);
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(dataBytes);
    const { time, date } = dosDateTime();

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const localDirectory = concatUint8Arrays(localParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localDirectory.length, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([localDirectory, centralDirectory, endRecord]);
}

function parseStoredZip(bytes) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const entries = new Map();
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
    const signature = view.getUint32(0, true);
    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    }
    if (signature !== 0x04034b50) {
      throw new Error(t("archiveImportInvalid"));
    }

    const compression = view.getUint16(8, true);
    if (compression !== 0) {
      throw new Error(t("archiveImportInvalid"));
    }

    const fileNameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const compressedSize = view.getUint32(18, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = new TextDecoder().decode(buffer.slice(nameStart, nameStart + fileNameLength));
    const data = buffer.slice(dataStart, dataStart + compressedSize);
    entries.set(name, data);
    offset = dataStart + compressedSize;
  }

  return entries;
}

function normalizeImportedArchiveCatalog(rawCatalog) {
  if (!rawCatalog?.posts || !Array.isArray(rawCatalog.posts)) {
    throw new Error(t("archiveImportInvalid"));
  }

  const assets = Array.isArray(rawCatalog.assets)
    ? rawCatalog.assets.map((asset) => ({
        path: asset.path,
        type: asset.type || "application/octet-stream",
        sizeBytes: Math.max(0, Number(asset.sizeBytes) || 0),
        bytes: asset.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset.bytes || []),
      }))
    : [];

  const imageCount = assets.length;
  const posts = rawCatalog.posts.map((post) => ({
    ...post,
    images: Array.isArray(post.images) ? post.images : [],
    counts: {
      likeCount: Number(post.counts?.likeCount) || 0,
      replyCount: Number(post.counts?.replyCount) || 0,
      repostCount: Number(post.counts?.repostCount) || 0,
      quoteCount: Number(post.counts?.quoteCount) || 0,
    },
  }));

  const postsByUri = new Map(posts.map((post) => [post.uri, post]));
  const depthCache = new Map();
  const getThreadDepth = (post) => {
    if (!post?.uri) {
      return 0;
    }
    if (depthCache.has(post.uri)) {
      return depthCache.get(post.uri);
    }
    const parentUri = post?.thread?.parentUri || "";
    if (!parentUri || !postsByUri.has(parentUri)) {
      depthCache.set(post.uri, 0);
      return 0;
    }
    const depth = Math.min(8, getThreadDepth(postsByUri.get(parentUri)) + 1);
    depthCache.set(post.uri, depth);
    return depth;
  };
  posts.forEach((post) => {
    post.threadDepth = getThreadDepth(post);
  });

  return {
    manifest: rawCatalog.manifest || {},
    posts,
    assets,
    summary: {
      imageCount,
      from: posts[posts.length - 1]?.createdAt || "",
      to: posts[0]?.createdAt || "",
    },
  };
}

async function loadArchiveCatalogFromFile(file) {
  if (/\.zip$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = parseStoredZip(bytes);
    const manifest = entries.has("manifest.json") ? parseJsonBytes(entries.get("manifest.json")) : {};
    const posts = entries.has("posts.json") ? parseJsonBytes(entries.get("posts.json")) : null;
    if (!posts) {
      throw new Error(t("archiveImportInvalid"));
    }
    const assets = [];
    posts.forEach((post) => {
      (post.images || []).forEach((image) => {
        if (!image.path || assets.some((entry) => entry.path === image.path)) {
          return;
        }
        const data = entries.get(image.path);
        if (data) {
          assets.push({
            path: image.path,
            type: image.mimeType || "application/octet-stream",
            sizeBytes: data.length,
            bytes: data,
          });
        }
      });
    });
    return normalizeImportedArchiveCatalog({ manifest, posts, assets });
  }

  const text = /\.gz$/i.test(file.name) ? await gunzipBlob(file) : await file.text();
  return normalizeImportedArchiveCatalog(JSON.parse(text));
}

function makeArchiveFileBaseName(catalog = archiveCatalog) {
  const handle = String(catalog?.manifest?.account?.handle || authAccount || "account").replace(/[^\w.-]+/g, "-");
  const datePart = formatArchiveDatePart(catalog?.manifest?.exportedAt);
  return `threadline-archive-${handle}-${datePart}`;
}

async function exportArchiveZipFromCatalog(catalog = archiveCatalog) {
  if (!catalog) {
    throw new Error(t("archiveNeedArchive"));
  }

  setArchiveProgress({
    title: t("archiveProgressZipTitle"),
    step: t("archiveProgressZipStep"),
    percent: 92,
    detail: t("archiveProgressZipDetail", { count: catalog.assets.length }),
  });

  const postsForJson = catalog.posts.map((post) => ({
    ...post,
    images: (post.images || []).map((image) => ({
      path: image.path,
      alt: image.alt || "",
      width: image.width || 0,
      height: image.height || 0,
      mimeType: image.mimeType || "application/octet-stream",
      sizeBytes: image.sizeBytes || 0,
    })),
  }));

  const entries = [
    { name: "manifest.json", data: utf8Bytes(JSON.stringify(catalog.manifest, null, 2)) },
    { name: "posts.json", data: utf8Bytes(JSON.stringify(postsForJson, null, 2)) },
    ...catalog.assets.map((asset) => ({ name: asset.path, data: asset.bytes })),
  ];
  const zipBytes = buildStoredZip(entries);
  const fileName = `${makeArchiveFileBaseName(catalog)}.zip`;
  const file = new File([zipBytes], fileName, { type: "application/zip" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveProgressDoneStep"),
    percent: 100,
    detail: t("archiveExportDone"),
  });
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function assetToDataUri(asset) {
  return `data:${asset.type || "application/octet-stream"};base64,${bytesToBase64(asset.bytes)}`;
}

function renderArchiveHtmlRichText(text) {
  return extractPdfLinkRuns(text).map((run) => {
    const content = escapeHtml(run.text || "").replace(/\n/g, "<br>");
    if (run.url) {
      return `<a href="${escapeHtmlAttribute(run.url)}" target="_blank" rel="noreferrer noopener">${content}</a>`;
    }
    return content;
  }).join("");
}

function buildArchiveThreadGroups(posts = []) {
  const orderedPosts = [...posts].sort((left, right) => Date.parse(left.createdAt || 0) - Date.parse(right.createdAt || 0));
  const groups = [];
  const groupMap = new Map();

  orderedPosts.forEach((post, index) => {
    const key = post?.thread?.rootUri || post?.uri || `post-${index + 1}`;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        key,
        posts: [],
      };
      groupMap.set(key, group);
      groups.push(group);
    }
    group.posts.push(post);
  });

  return groups.map((group) => {
    const orderedThreadPosts = orderArchiveGroupPostsByThread(group.posts);
    const createdValues = group.posts
      .map((post) => Date.parse(post.createdAt || 0))
      .filter((value) => Number.isFinite(value));
    const minCreated = createdValues.length > 0 ? Math.min(...createdValues) : 0;
    const maxCreated = createdValues.length > 0 ? Math.max(...createdValues) : 0;
    const imageCount = orderedThreadPosts.reduce((total, post) => total + ((post.images || []).length), 0);
    const hasReplies = orderedThreadPosts.some((post) => Boolean(post?.thread?.parentUri));
    return {
      ...group,
      posts: orderedThreadPosts,
      isThread: orderedThreadPosts.length > 1 || hasReplies,
      hasImages: imageCount > 0,
      imageCount,
      minCreated,
      maxCreated,
    };
  });
}

function orderArchiveGroupPostsByThread(posts = []) {
  const byUri = new Map();
  const childrenByParent = new Map();
  const rootCandidates = [];

  const chronological = [...posts].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0) || 0;
    const rightTime = Date.parse(right.createdAt || 0) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left.uri || "").localeCompare(String(right.uri || ""));
  });

  chronological.forEach((post) => {
    if (post?.uri) {
      byUri.set(post.uri, post);
    }
  });

  chronological.forEach((post) => {
    const parentUri = post?.thread?.parentUri || "";
    if (parentUri && byUri.has(parentUri)) {
      if (!childrenByParent.has(parentUri)) {
        childrenByParent.set(parentUri, []);
      }
      childrenByParent.get(parentUri).push(post);
      return;
    }
    rootCandidates.push(post);
  });

  const ordered = [];
  const seen = new Set();

  function visit(post) {
    if (!post?.uri || seen.has(post.uri)) {
      return;
    }
    seen.add(post.uri);
    ordered.push(post);
    const children = childrenByParent.get(post.uri) || [];
    children.forEach((child) => visit(child));
  }

  const explicitRoots = rootCandidates.sort((left, right) => {
    const leftRoot = left?.thread?.rootUri || left?.uri || "";
    const rightRoot = right?.thread?.rootUri || right?.uri || "";
    const leftIsRoot = leftRoot === (left?.uri || "");
    const rightIsRoot = rightRoot === (right?.uri || "");
    if (leftIsRoot !== rightIsRoot) {
      return leftIsRoot ? -1 : 1;
    }
    const leftTime = Date.parse(left.createdAt || 0) || 0;
    const rightTime = Date.parse(right.createdAt || 0) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left.uri || "").localeCompare(String(right.uri || ""));
  });

  explicitRoots.forEach((post) => visit(post));
  chronological.forEach((post) => visit(post));
  return ordered;
}

function buildArchiveHtmlToolbarStrings() {
  return {
    visibleStatus: t("archiveHtmlVisibleStatus"),
    noMatches: t("archiveHtmlNoMatches"),
    imageModalClose: t("closeButton"),
  };
}

function buildArchiveHtmlI18n() {
  const keys = [
    "archiveHeaderEyebrow",
    "archiveHtmlTitle",
    "archiveHtmlGenerated",
    "archiveSummaryPosts",
    "archiveSummaryImages",
    "archiveHtmlArchiveRangeLabel",
    "archiveHtmlArchiveRangeValue",
    "archiveHtmlSearchLabel",
    "archiveFromLabel",
    "archiveToLabel",
    "archiveHtmlOnlyImages",
    "archiveHtmlOnlyThreads",
    "archiveHtmlResetFilters",
    "archiveHtmlIndentThreads",
    "archiveHtmlExpandThreads",
    "archiveHtmlCollapseThreads",
    "archiveHtmlExpandSingles",
    "archiveHtmlCollapseSingles",
    "archiveHtmlToggleAllOpen",
    "archiveHtmlToggleAllClose",
    "archiveHtmlHashtagsLabel",
    "archiveHtmlHashtagsEmpty",
    "archiveHtmlVisibleStatus",
    "archiveHtmlNoMatches",
    "archiveHtmlOpenPost",
    "archiveHtmlThreadSummary",
    "archiveHtmlSingleSummary",
    "archiveHtmlNoText",
    "archivePdfAltPrefix",
    "closeButton",
  ];

  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(keys.map((key) => [key, translations[locale]?.[key] || translations[DEFAULT_LOCALE]?.[key] || key])),
  ]));
}

function extractArchiveHashtagsFromText(text) {
  const value = String(text || "");
  const regex = /(?:^|\s)(#[^\d\s]\S*)(?=\s|$)/gu;
  const matches = [];
  let match;

  while ((match = regex.exec(value))) {
    const raw = String(match[1] || "").replace(/\p{P}+$/gu, "");
    const parsed = parseHashtagValue(raw);
    if (!parsed) {
      continue;
    }
    matches.push({
      normalized: parsed.normalized,
      value: formatHashtag(parsed.value),
    });
  }

  return matches;
}

function collectArchiveHtmlHashtags(posts = []) {
  const seen = new Set();
  const tags = [];

  posts.forEach((post) => {
    extractArchiveHashtagsFromText(post.text).forEach((tag) => {
      if (seen.has(tag.normalized)) {
        return;
      }
      seen.add(tag.normalized);
      tags.push(tag);
    });
  });

  return tags.sort((left, right) => left.value.localeCompare(right.value, currentLocale, { sensitivity: "base" }));
}

function formatArchiveHtmlDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildArchiveThreadDepthMap(posts = []) {
  const byUri = new Map(posts.map((post) => [post.uri, post]));
  const depthCache = new Map();

  function resolveDepth(post) {
    if (!post?.uri) {
      return 0;
    }
    if (depthCache.has(post.uri)) {
      return depthCache.get(post.uri);
    }

    const parentUri = post?.thread?.parentUri || "";
    if (!parentUri || !byUri.has(parentUri)) {
      depthCache.set(post.uri, 0);
      return 0;
    }

    const depth = Math.min(8, resolveDepth(byUri.get(parentUri)) + 1);
    depthCache.set(post.uri, depth);
    return depth;
  }

  posts.forEach((post) => {
    resolveDepth(post);
  });
  return depthCache;
}

function buildArchiveHtmlDocument(catalog, assetUris) {
  const groups = buildArchiveThreadGroups(catalog.posts || []);
  const archiveHashtags = collectArchiveHtmlHashtags(catalog.posts || []);
  const toolbarStrings = buildArchiveHtmlToolbarStrings();
  const htmlI18n = buildArchiveHtmlI18n();
  const handle = catalog?.manifest?.account?.handle || authAccount || "Bluesky";
  const fromValue = formatArchiveHtmlDateInputValue(catalog?.summary?.from);
  const toValue = formatArchiveHtmlDateInputValue(catalog?.summary?.to);
  const exportedAtIso = catalog?.manifest?.exportedAt || new Date().toISOString();
  const title = t("archiveHtmlTitle", { handle });
  const groupsMarkup = groups.map((group, groupIndex) => {
    const depthMap = buildArchiveThreadDepthMap(group.posts);
    const summaryLabel = group.isThread
      ? t("archiveHtmlThreadSummary", { count: group.posts.length, images: group.imageCount })
      : t("archiveHtmlSingleSummary");
    const postsMarkup = group.posts.map((post, postIndex) => {
      const createdTimestamp = Date.parse(post.createdAt || 0) || 0;
      const hasImages = (post.images || []).length > 0;
      const searchValue = [
        post.text || "",
        post.permalink || "",
        post.uri || "",
        post.authorHandle || handle,
      ].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
      const imagesMarkup = (post.images || []).map((image) => {
        const assetUri = assetUris.get(image.path) || "";
        if (!assetUri) {
          return "";
        }
        return `
          <figure class="archive-html-image">
            <img src="${escapeHtmlAttribute(assetUri)}" alt="${escapeHtmlAttribute(image.alt || "")}" loading="lazy">
            ${image.alt ? `<figcaption>${escapeHtml(`${t("archivePdfAltPrefix")} ${image.alt}`)}</figcaption>` : ""}
          </figure>
        `;
      }).join("");
      const metrics = post.counts || {};
      const depth = depthMap.get(post.uri) || 0;
      const authorDisplay = post.authorDisplayName && post.authorDisplayName !== post.authorHandle
        ? post.authorDisplayName
        : "";
      return `
        <article
          class="archive-html-post"
          data-archive-post
          data-created="${createdTimestamp}"
          data-has-images="${hasImages ? "true" : "false"}"
          data-search="${escapeHtmlAttribute(searchValue)}"
          data-depth="${depth}"
          style="--thread-depth:${depth}"
        >
          <div class="archive-html-post-head">
            <div>
              <p class="archive-html-kicker">${group.isThread ? `#${groupIndex + 1}.${postIndex + 1}` : `#${groupIndex + 1}`}</p>
              <h2>${escapeHtml(authorDisplay || `@${post.authorHandle || handle}`)}</h2>
              <p class="archive-html-author-handle">@${escapeHtml(post.authorHandle || handle)}</p>
            </div>
            <time datetime="${escapeHtmlAttribute(post.createdAt || "")}">${escapeHtml(formatHistoryTimestamp(post.createdAt))}</time>
          </div>
          <div class="archive-html-metrics">
            <span>Likes ${metrics.likeCount || 0}</span>
            <span>Replies ${metrics.replyCount || 0}</span>
            <span>Reposts ${metrics.repostCount || 0}</span>
            <span>Quotes ${metrics.quoteCount || 0}</span>
          </div>
          <div class="archive-html-text" data-archive-richtext="true">${post.text ? renderArchiveHtmlRichText(post.text) : `<span class="archive-html-empty">${escapeHtml(t("archiveHtmlNoText"))}</span>`}</div>
          ${imagesMarkup ? `<div class="archive-html-gallery">${imagesMarkup}</div>` : ""}
          <div class="archive-html-footer">
            ${post.permalink ? `<a class="archive-html-link" href="${escapeHtmlAttribute(post.permalink)}" target="_blank" rel="noreferrer noopener">${escapeHtml(t("archiveHtmlOpenPost"))}</a>` : ""}
            <span class="archive-html-uri">${escapeHtml((post.uri || "").replace(/^at:\/\//, ""))}</span>
          </div>
        </article>
      `;
    }).join("");

    if (group.isThread) {
      return `
        <details class="archive-html-entry archive-html-thread" data-archive-entry data-is-thread="true" data-entry-kind="thread">
          <summary>
            <div>
              <strong>${escapeHtml(summaryLabel)}</strong>
              <span>${escapeHtml(formatHistoryTimestamp(group.posts[0]?.createdAt))} – ${escapeHtml(formatHistoryTimestamp(group.posts[group.posts.length - 1]?.createdAt))}</span>
            </div>
            <span>${escapeHtml(t("archiveSummaryPosts"))}: ${group.posts.length}</span>
          </summary>
          <div class="archive-html-entry-body archive-html-thread-posts">
            ${postsMarkup}
          </div>
        </details>
      `;
    }

    return `
      <details class="archive-html-entry archive-html-single" data-archive-entry data-is-thread="false" data-entry-kind="single">
        <summary class="archive-html-entry-head">
          <strong>${escapeHtml(summaryLabel)}</strong>
          <span>${escapeHtml(formatHistoryTimestamp(group.posts[0]?.createdAt))}</span>
        </summary>
        <div class="archive-html-entry-body">
          ${postsMarkup}
        </div>
      </details>
    `;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #ecf4ff;
        --panel: rgba(255, 255, 255, 0.9);
        --panel-strong: #ffffff;
        --text: #10233e;
        --muted: #617895;
        --line: rgba(84, 115, 160, 0.16);
        --accent: #2d72f6;
        --accent-soft: rgba(45, 114, 246, 0.12);
        --thread-accent: #e0614a;
        --thread-rail: rgba(224, 97, 74, 0.26);
        --shadow: 0 24px 44px rgba(24, 41, 75, 0.12);
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Segoe UI", Aptos, Arial, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(45, 114, 246, 0.12), transparent 24%),
          radial-gradient(circle at top right, rgba(47, 209, 183, 0.14), transparent 20%),
          linear-gradient(180deg, #eff6ff 0%, #edf3fb 100%);
        color: var(--text);
      }
      a { color: var(--accent); }
      .archive-html-shell {
        width: min(1200px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 60px;
      }
      .archive-html-hero,
      .archive-html-toolbar,
      .archive-html-entry {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 26px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .archive-html-hero {
        padding: 28px;
        margin-bottom: 18px;
      }
      .archive-html-kicker {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.74rem;
        color: var(--muted);
      }
      .archive-html-hero h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3rem);
        line-height: 1.02;
      }
      .archive-html-hero p {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .archive-html-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 18px;
      }
      .archive-html-meta-item {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(236, 244, 255, 0.88);
        border: 1px solid rgba(102, 133, 178, 0.14);
      }
      .archive-html-meta-item span {
        display: block;
        font-size: 0.82rem;
        color: var(--muted);
        margin-bottom: 4px;
      }
      .archive-html-toolbar {
        position: sticky;
        top: 14px;
        z-index: 10;
        padding: 18px;
        margin-bottom: 18px;
      }
      .archive-html-toolbar-grid {
        display: grid;
        grid-template-columns: minmax(220px, 1.2fr) repeat(2, minmax(150px, 0.8fr));
        gap: 12px;
      }
      .archive-html-toolbar label,
      .archive-html-toolbar .archive-html-checks label {
        display: grid;
        gap: 6px;
        font-size: 0.92rem;
        color: var(--muted);
      }
      .archive-html-toolbar input[type="search"],
      .archive-html-toolbar input[type="date"] {
        width: 100%;
        border: 1px solid rgba(102, 133, 178, 0.18);
        border-radius: 14px;
        padding: 12px 14px;
        background: #fff;
        color: var(--text);
      }
      .archive-html-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 14px;
      }
      .archive-html-toolbar-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .archive-html-toolbar-actions button {
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        background: #152846;
        color: #fff;
        cursor: pointer;
      }
      .archive-html-toolbar-actions button.secondary {
        background: rgba(45, 114, 246, 0.1);
        color: var(--accent);
      }
      .archive-html-toolbar-actions button.is-active {
        background: #152846;
        color: #fff;
      }
      .archive-html-filter-status {
        margin: 14px 0 0;
        color: var(--muted);
      }
      .archive-html-hashtags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .archive-html-hashtag {
        border: 1px solid rgba(45, 114, 246, 0.16);
        border-radius: 999px;
        padding: 8px 12px;
        background: rgba(45, 114, 246, 0.08);
        color: var(--accent);
        cursor: pointer;
        font: inherit;
      }
      .archive-html-hashtag.is-active {
        background: #152846;
        border-color: #152846;
        color: #fff;
      }
      .archive-html-hashtags-empty {
        margin-top: 14px;
        color: var(--muted);
      }
      .archive-html-feed {
        display: grid;
        gap: 16px;
      }
      .archive-html-entry {
        padding: 16px;
      }
      .archive-html-entry summary,
      .archive-html-entry-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        cursor: pointer;
        list-style: none;
        color: var(--muted);
      }
      .archive-html-entry summary::-webkit-details-marker { display: none; }
      .archive-html-entry summary strong,
      .archive-html-entry-head strong {
        display: block;
        color: var(--text);
        margin-bottom: 4px;
      }
      .archive-html-entry-body,
      .archive-html-thread-posts {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }
      .archive-html-post {
        position: relative;
        padding: 18px;
        border-radius: 22px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
        margin-left: 0;
        transition: margin-left 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }
      body.archive-html-indent .archive-html-post[data-depth] {
        margin-left: calc(var(--thread-depth, 0) * 26px);
        border-color: rgba(224, 97, 74, 0.24);
      }
      body.archive-html-indent .archive-html-post[data-depth]::before {
        content: "";
        position: absolute;
        top: 14px;
        bottom: 14px;
        left: -14px;
        width: 4px;
        border-radius: 999px;
        background: linear-gradient(180deg, var(--thread-accent), var(--thread-rail));
        opacity: min(1, calc(var(--thread-depth, 0) * 0.28));
      }
      body.archive-html-indent .archive-html-post[data-depth="0"]::before {
        opacity: 0;
      }
      .archive-html-post-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .archive-html-post-head h2 {
        margin: 0;
        font-size: 1.12rem;
      }
      .archive-html-author-handle {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 0.88rem;
      }
      .archive-html-post-head time {
        color: var(--muted);
        font-size: 0.92rem;
        white-space: nowrap;
      }
      .archive-html-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .archive-html-metrics span {
        background: var(--accent-soft);
        color: #2f538a;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.85rem;
      }
      .archive-html-text {
        line-height: 1.68;
        font-size: 1rem;
        word-break: break-word;
      }
      .archive-html-text mark {
        background: rgba(255, 216, 102, 0.92);
        color: #10233e;
        border-radius: 0.25em;
        padding: 0 0.08em;
        box-decoration-break: clone;
      }
      .archive-html-empty {
        color: var(--muted);
      }
      .archive-html-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .archive-html-image {
        margin: 0;
        padding: 10px;
        border-radius: 18px;
        background: rgba(237, 244, 255, 0.84);
        border: 1px solid rgba(102, 133, 178, 0.14);
      }
      .archive-html-image img {
        width: 100%;
        display: block;
        border-radius: 12px;
        max-height: 420px;
        object-fit: contain;
        background: rgba(209, 224, 246, 0.55);
        cursor: zoom-in;
      }
      .archive-html-image figcaption {
        margin-top: 8px;
        color: var(--muted);
        font-size: 0.86rem;
        line-height: 1.45;
      }
      .archive-html-footer {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }
      .archive-html-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #152846;
        color: #fff;
        text-decoration: none;
        padding: 10px 14px;
      }
      .archive-html-uri {
        color: var(--muted);
        font-size: 0.84rem;
        word-break: break-all;
      }
      .archive-html-lightbox[hidden] {
        display: none !important;
      }
      .archive-html-lightbox {
        position: fixed;
        inset: 0;
        z-index: 40;
        background: rgba(8, 15, 28, 0.82);
        display: grid;
        place-items: center;
        padding: 12px;
      }
      .archive-html-lightbox-inner {
        width: min(96vw, 1400px);
        max-width: 96vw;
        max-height: 96vh;
        background: rgba(19, 30, 49, 0.96);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        padding: 18px;
        box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35);
        display: grid;
        gap: 12px;
      }
      .archive-html-lightbox-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        color: rgba(255, 255, 255, 0.86);
      }
      .archive-html-lightbox-head button {
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
      }
      .archive-html-lightbox img {
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: calc(96vh - 160px);
        object-fit: contain;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
        justify-self: center;
      }
      .archive-html-lightbox-caption {
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.55;
      }
      [hidden] { display: none !important; }
      @media (max-width: 860px) {
        .archive-html-shell { width: min(100vw - 18px, 100%); padding-top: 18px; }
        .archive-html-toolbar-grid { grid-template-columns: 1fr; }
        .archive-html-entry summary,
        .archive-html-entry-head,
        .archive-html-post-head,
        .archive-html-footer { flex-direction: column; align-items: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="archive-html-shell">
      <header class="archive-html-hero">
        <p class="archive-html-kicker" data-i18n-key="archiveHeaderEyebrow">${escapeHtml(t("archiveHeaderEyebrow"))}</p>
        <h1 id="archive-page-title">${escapeHtml(title)}</h1>
        <p id="archive-generated-copy">${escapeHtml(t("archiveHtmlGenerated", { exportedAt: formatHistoryTimestamp(exportedAtIso) }))}</p>
        <div class="archive-html-meta">
          <div class="archive-html-meta-item">
            <span data-i18n-key="archiveSummaryPosts">${escapeHtml(t("archiveSummaryPosts"))}</span>
            <strong>${catalog.posts.length}</strong>
          </div>
          <div class="archive-html-meta-item">
            <span data-i18n-key="archiveSummaryImages">${escapeHtml(t("archiveSummaryImages"))}</span>
            <strong>${catalog.summary?.imageCount || 0}</strong>
          </div>
          <div class="archive-html-meta-item">
            <span data-i18n-key="archiveHtmlArchiveRangeLabel">${escapeHtml(t("archiveHtmlArchiveRangeLabel"))}</span>
            <strong
              id="archive-range-copy"
              data-range-from="${escapeHtmlAttribute(catalog.summary?.from || "")}"
              data-range-to="${escapeHtmlAttribute(catalog.summary?.to || "")}"
            >${escapeHtml(t("archiveHtmlArchiveRangeValue", {
              from: formatHistoryTimestamp(catalog.summary?.from),
              to: formatHistoryTimestamp(catalog.summary?.to),
            }))}</strong>
          </div>
        </div>
      </header>

      <section class="archive-html-toolbar">
        <div class="archive-html-toolbar-grid">
          <label>
            <span data-i18n-key="archiveHtmlSearchLabel">${escapeHtml(t("archiveHtmlSearchLabel"))}</span>
            <input id="archive-search" type="search" data-i18n-placeholder="archiveHtmlSearchLabel" placeholder="${escapeHtmlAttribute(t("archiveHtmlSearchLabel"))}">
          </label>
          <label>
            <span data-i18n-key="archiveFromLabel">${escapeHtml(t("archiveFromLabel"))}</span>
            <input id="archive-filter-from" type="date" value="${escapeHtmlAttribute(fromValue)}">
          </label>
          <label>
            <span data-i18n-key="archiveToLabel">${escapeHtml(t("archiveToLabel"))}</span>
            <input id="archive-filter-to" type="date" value="${escapeHtmlAttribute(toValue)}">
          </label>
        </div>
        <div class="archive-html-checks">
          <label><input id="archive-only-images" type="checkbox"> <span data-i18n-key="archiveHtmlOnlyImages">${escapeHtml(t("archiveHtmlOnlyImages"))}</span></label>
          <label><input id="archive-only-threads" type="checkbox"> <span data-i18n-key="archiveHtmlOnlyThreads">${escapeHtml(t("archiveHtmlOnlyThreads"))}</span></label>
        </div>
        <div class="archive-html-toolbar-actions">
          <button id="archive-reset-filters" type="button" class="secondary" data-i18n-key="archiveHtmlResetFilters">${escapeHtml(t("archiveHtmlResetFilters"))}</button>
          <button id="archive-toggle-indent" type="button" class="secondary" data-i18n-key="archiveHtmlIndentThreads">${escapeHtml(t("archiveHtmlIndentThreads"))}</button>
          <button id="archive-toggle-all" type="button" class="secondary" data-i18n-key="archiveHtmlToggleAllOpen">${escapeHtml(t("archiveHtmlToggleAllOpen"))}</button>
          <button id="archive-toggle-threads" type="button" class="secondary" data-i18n-key="archiveHtmlExpandThreads">${escapeHtml(t("archiveHtmlExpandThreads"))}</button>
          <button id="archive-toggle-singles" type="button" class="secondary" data-i18n-key="archiveHtmlExpandSingles">${escapeHtml(t("archiveHtmlExpandSingles"))}</button>
        </div>
        <div>
          <label data-i18n-key="archiveHtmlHashtagsLabel">${escapeHtml(t("archiveHtmlHashtagsLabel"))}</label>
          ${archiveHashtags.length > 0 ? `
            <div class="archive-html-hashtags">
              ${archiveHashtags.map((tag) => `
                <button
                  type="button"
                  class="archive-html-hashtag"
                  data-archive-hashtag="${escapeHtmlAttribute(tag.value.toLowerCase())}"
                >${escapeHtml(tag.value)}</button>
              `).join("")}
            </div>
          ` : `<p class="archive-html-hashtags-empty" data-i18n-key="archiveHtmlHashtagsEmpty">${escapeHtml(t("archiveHtmlHashtagsEmpty"))}</p>`}
        </div>
        <p id="archive-filter-status" class="archive-html-filter-status"></p>
      </section>

      <main id="archive-feed" class="archive-html-feed">
        ${groupsMarkup}
      </main>
    </div>

    <div id="archive-lightbox" class="archive-html-lightbox" hidden>
      <div class="archive-html-lightbox-inner" role="dialog" aria-modal="true">
        <div class="archive-html-lightbox-head">
          <strong id="archive-lightbox-title">${escapeHtml(title)}</strong>
          <button id="archive-lightbox-close" type="button" data-i18n-key="closeButton">${escapeHtml(toolbarStrings.imageModalClose)}</button>
        </div>
        <img id="archive-lightbox-image" alt="">
        <p id="archive-lightbox-caption" class="archive-html-lightbox-caption"></p>
      </div>
    </div>

    <script>
      const archiveHtmlI18n = ${JSON.stringify(htmlI18n)};
      const archiveRuntimeData = ${JSON.stringify({
        handle,
        exportedAtIso,
        title,
      })};
      const groups = Array.from(document.querySelectorAll("[data-archive-entry]"));
      const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || "en"];
      const archiveLocale = browserLocales
        .map((value) => String(value || "").toLowerCase())
        .map((value) => value.split("-")[0])
        .find((value) => Object.prototype.hasOwnProperty.call(archiveHtmlI18n, value)) || "en";
      const archiveStrings = archiveHtmlI18n[archiveLocale] || archiveHtmlI18n.en;
      const searchInput = document.querySelector("#archive-search");
      const fromInput = document.querySelector("#archive-filter-from");
      const toInput = document.querySelector("#archive-filter-to");
      const onlyImagesInput = document.querySelector("#archive-only-images");
      const onlyThreadsInput = document.querySelector("#archive-only-threads");
      const resetButton = document.querySelector("#archive-reset-filters");
      const toggleAllButton = document.querySelector("#archive-toggle-all");
      const toggleThreadsButton = document.querySelector("#archive-toggle-threads");
      const toggleSinglesButton = document.querySelector("#archive-toggle-singles");
      const indentButton = document.querySelector("#archive-toggle-indent");
      const statusLine = document.querySelector("#archive-filter-status");
      const hashtagButtons = Array.from(document.querySelectorAll("[data-archive-hashtag]"));
      const lightbox = document.querySelector("#archive-lightbox");
      const lightboxImage = document.querySelector("#archive-lightbox-image");
      const lightboxCaption = document.querySelector("#archive-lightbox-caption");
      const lightboxTitle = document.querySelector("#archive-lightbox-title");
      const lightboxClose = document.querySelector("#archive-lightbox-close");
      let indentThreads = true;

      function formatArchiveTemplate(template, values) {
        return String(template || "").replace(/\\{(\\w+)\\}/g, (_, key) => values[key] ?? "");
      }

      function formatArchiveDateTime(value) {
        if (!value) {
          return "—";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return "—";
        }
        return new Intl.DateTimeFormat(archiveLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
      }

      function applyArchiveLanguage() {
        document.documentElement.lang = archiveLocale;
        document.querySelectorAll("[data-i18n-key]").forEach((element) => {
          const key = element.dataset.i18nKey;
          if (!key || !archiveStrings[key]) {
            return;
          }
          element.textContent = archiveStrings[key];
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
          const key = element.dataset.i18nPlaceholder;
          if (!key || !archiveStrings[key]) {
            return;
          }
          element.setAttribute("placeholder", archiveStrings[key]);
        });

        document.title = formatArchiveTemplate(archiveStrings.archiveHtmlTitle, {
          handle: archiveRuntimeData.handle,
        });
        const pageTitle = document.querySelector("#archive-page-title");
        if (pageTitle) {
          pageTitle.textContent = document.title;
        }
        const generatedCopy = document.querySelector("#archive-generated-copy");
        if (generatedCopy) {
          generatedCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlGenerated, {
            exportedAt: formatArchiveDateTime(archiveRuntimeData.exportedAtIso),
          });
        }
        const rangeCopy = document.querySelector("#archive-range-copy");
        if (rangeCopy) {
          rangeCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlArchiveRangeValue, {
            from: formatArchiveDateTime(rangeCopy.dataset.rangeFrom),
            to: formatArchiveDateTime(rangeCopy.dataset.rangeTo),
          });
        }
        document.querySelectorAll("time[datetime]").forEach((element) => {
          element.textContent = formatArchiveDateTime(element.getAttribute("datetime"));
        });
        syncToggleAllButton();
      }

      function getAllEntries() {
        return Array.from(document.querySelectorAll("details[data-archive-entry]"));
      }

      function getThreadEntries() {
        return Array.from(document.querySelectorAll("details[data-entry-kind='thread']"));
      }

      function getSingleEntries() {
        return Array.from(document.querySelectorAll("details[data-entry-kind='single']"));
      }

      function syncToggleAllButton() {
        if (!toggleAllButton) {
          return;
        }
        const entries = getAllEntries();
        const allOpen = entries.length > 0 && entries.every((entry) => entry.open);
        const key = allOpen ? "archiveHtmlToggleAllClose" : "archiveHtmlToggleAllOpen";
        toggleAllButton.dataset.i18nKey = key;
        toggleAllButton.textContent = archiveStrings[key] || key;
      }

      function syncSectionToggleButtons() {
        const threadEntries = getThreadEntries();
        const singleEntries = getSingleEntries();
        const allThreadsOpen = threadEntries.length > 0 && threadEntries.every((entry) => entry.open);
        const allSinglesOpen = singleEntries.length > 0 && singleEntries.every((entry) => entry.open);
        const threadKey = allThreadsOpen ? "archiveHtmlCollapseThreads" : "archiveHtmlExpandThreads";
        const singleKey = allSinglesOpen ? "archiveHtmlCollapseSingles" : "archiveHtmlExpandSingles";
        if (toggleThreadsButton) {
          toggleThreadsButton.dataset.i18nKey = threadKey;
          toggleThreadsButton.textContent = archiveStrings[threadKey] || threadKey;
        }
        if (toggleSinglesButton) {
          toggleSinglesButton.dataset.i18nKey = singleKey;
          toggleSinglesButton.textContent = archiveStrings[singleKey] || singleKey;
        }
      }

      function clearArchiveHighlights(element) {
        element.querySelectorAll("mark[data-archive-highlight='true']").forEach((mark) => {
          const parent = mark.parentNode;
          if (!parent) {
            return;
          }
          parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
          parent.normalize();
        });
      }

      function highlightArchiveQueryInElement(element, query) {
        clearArchiveHighlights(element);
        if (!query) {
          return;
        }
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            const parentTag = node.parentElement?.tagName || "";
            if (parentTag === "MARK" || parentTag === "SCRIPT" || parentTag === "STYLE") {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        const textNodes = [];
        while (walker.nextNode()) {
          textNodes.push(walker.currentNode);
        }
        textNodes.forEach((node) => {
          const source = node.nodeValue || "";
          const lower = source.toLowerCase();
          const lowerQuery = query.toLowerCase();
          let startIndex = 0;
          let matchIndex = lower.indexOf(lowerQuery, startIndex);
          if (matchIndex === -1) {
            return;
          }
          const fragment = document.createDocumentFragment();
          while (matchIndex !== -1) {
            if (matchIndex > startIndex) {
              fragment.appendChild(document.createTextNode(source.slice(startIndex, matchIndex)));
            }
            const mark = document.createElement("mark");
            mark.dataset.archiveHighlight = "true";
            mark.textContent = source.slice(matchIndex, matchIndex + lowerQuery.length);
            fragment.appendChild(mark);
            startIndex = matchIndex + lowerQuery.length;
            matchIndex = lower.indexOf(lowerQuery, startIndex);
          }
          if (startIndex < source.length) {
            fragment.appendChild(document.createTextNode(source.slice(startIndex)));
          }
          node.parentNode?.replaceChild(fragment, node);
        });
      }

      function syncHashtagState() {
        const query = String(searchInput.value || "").trim().toLowerCase();
        hashtagButtons.forEach((button) => {
          button.classList.toggle("is-active", query === String(button.dataset.archiveHashtag || "").trim().toLowerCase());
        });
      }

      function applyArchiveFilters() {
        const query = String(searchInput.value || "").trim().toLowerCase();
        const fromValue = fromInput.value ? Date.parse(fromInput.value + "T00:00:00Z") : null;
        const toValue = toInput.value ? Date.parse(toInput.value + "T23:59:59Z") : null;
        const onlyImages = onlyImagesInput.checked;
        const onlyThreads = onlyThreadsInput.checked;
        let visibleEntries = 0;
        let visiblePosts = 0;

        groups.forEach((group) => {
          const isThread = group.dataset.isThread === "true";
          const posts = Array.from(group.querySelectorAll("[data-archive-post]"));
          const groupMatchesQuery = query
            ? posts.some((post) => String(post.dataset.search || "").includes(query))
            : false;
          let groupVisiblePosts = 0;

          posts.forEach((post) => {
            const created = Number(post.dataset.created || 0);
            const hasImages = post.dataset.hasImages === "true";
            const haystack = String(post.dataset.search || "");
            let visibleBase = true;

            if (fromValue && created < fromValue) {
              visibleBase = false;
            }
            if (toValue && created > toValue) {
              visibleBase = false;
            }
            if (onlyImages && !hasImages) {
              visibleBase = false;
            }
            const queryMatch = !query || haystack.includes(query);
            const visible = query
              ? (isThread && groupMatchesQuery ? visibleBase : (visibleBase && queryMatch))
              : visibleBase;

            post.hidden = !visible;
            if (visible) {
              groupVisiblePosts += 1;
              visiblePosts += 1;
            }
          });

          const groupVisible = groupVisiblePosts > 0 && (!onlyThreads || isThread);
          group.hidden = !groupVisible;
          if (groupVisible) {
            visibleEntries += 1;
          }
        });

        statusLine.textContent = visiblePosts > 0
          ? formatArchiveTemplate(archiveStrings.visibleStatus, { entries: visibleEntries, posts: visiblePosts })
          : archiveStrings.noMatches;
        document.querySelectorAll("[data-archive-richtext='true']").forEach((element) => {
          highlightArchiveQueryInElement(element, query);
        });
        syncHashtagState();
        syncToggleAllButton();
        syncSectionToggleButtons();
      }

      function syncIndentButton() {
        indentButton.classList.toggle("is-active", indentThreads);
        document.body.classList.toggle("archive-html-indent", indentThreads);
      }

      [searchInput, fromInput, toInput, onlyImagesInput, onlyThreadsInput].forEach((element) => {
        element.addEventListener("input", applyArchiveFilters);
        element.addEventListener("change", applyArchiveFilters);
      });

      resetButton.addEventListener("click", () => {
        searchInput.value = "";
        fromInput.value = ${JSON.stringify(fromValue)};
        toInput.value = ${JSON.stringify(toValue)};
        onlyImagesInput.checked = false;
        onlyThreadsInput.checked = false;
        applyArchiveFilters();
      });

      toggleThreadsButton.addEventListener("click", () => {
        const threadEntries = getThreadEntries();
        const shouldOpen = threadEntries.some((entry) => !entry.open);
        threadEntries.forEach((item) => {
          item.open = shouldOpen;
        });
        syncToggleAllButton();
        syncSectionToggleButtons();
      });

      toggleSinglesButton.addEventListener("click", () => {
        const singleEntries = getSingleEntries();
        const shouldOpen = singleEntries.some((entry) => !entry.open);
        singleEntries.forEach((item) => {
          item.open = shouldOpen;
        });
        syncToggleAllButton();
        syncSectionToggleButtons();
      });

      toggleAllButton.addEventListener("click", () => {
        const entries = getAllEntries();
        const shouldOpen = entries.some((entry) => !entry.open);
        entries.forEach((entry) => {
          entry.open = shouldOpen;
        });
        syncToggleAllButton();
      });

      indentButton.addEventListener("click", () => {
        indentThreads = !indentThreads;
        syncIndentButton();
      });

      getAllEntries().forEach((entry) => {
        entry.addEventListener("toggle", () => {
          syncToggleAllButton();
          syncSectionToggleButtons();
        });
      });

      hashtagButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const tag = String(button.dataset.archiveHashtag || "").trim();
          searchInput.value = String(searchInput.value || "").trim().toLowerCase() === tag.toLowerCase() ? "" : tag;
          applyArchiveFilters();
        });
      });

      document.querySelectorAll(".archive-html-image img").forEach((image) => {
        image.addEventListener("click", () => {
          lightbox.hidden = false;
          lightboxImage.src = image.src;
          lightboxImage.alt = image.alt || "";
          lightboxTitle.textContent = image.closest("[data-archive-post]")?.querySelector(".archive-html-author-handle")?.textContent || ${JSON.stringify(title)};
          lightboxCaption.textContent = image.alt || "";
        });
      });

      function closeLightbox() {
        lightbox.hidden = true;
        lightboxImage.src = "";
        lightboxImage.alt = "";
        lightboxCaption.textContent = "";
      }

      lightboxClose.addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
          closeLightbox();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !lightbox.hidden) {
          closeLightbox();
        }
      });

      applyArchiveLanguage();
      applyArchiveFilters();
      syncIndentButton();
    </script>
  </body>
</html>`;
}

async function exportArchiveHtmlFromCatalog(catalog = archiveCatalog) {
  if (!catalog) {
    throw new Error(t("archiveNeedArchive"));
  }

  const assets = Array.isArray(catalog.assets) ? catalog.assets : [];
  const assetUris = new Map();

  setArchiveProgress({
    title: t("archiveProgressHtmlTitle"),
    step: t("archiveProgressHtmlStep"),
    percent: 76,
    detail: t("archiveProgressHtmlDetail", { count: assets.length }),
  });

  for (const [index, asset] of assets.entries()) {
    assetUris.set(asset.path, assetToDataUri(asset));
    setArchiveProgress({
      title: t("archiveProgressHtmlTitle"),
      step: t("archiveProgressHtmlStep"),
      percent: 76 + Math.round(((index + 1) / Math.max(1, assets.length)) * 18),
      detail: t("archiveProgressHtmlDetail", { count: assets.length }),
    });
  }

  const html = buildArchiveHtmlDocument(catalog, assetUris);
  const fileName = `${makeArchiveFileBaseName(catalog)}.html`;
  const file = new File([html], fileName, { type: "text/html" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveProgressDoneStep"),
    percent: 100,
    detail: t("archiveHtmlDone"),
  });
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

async function loadArchiveAssetBitmap(asset) {
  const blob = new Blob([asset.bytes], { type: asset.type || "image/png" });
  return createImageBitmap(blob);
}

function extractPdfLinkRuns(text) {
  const value = String(text || "");
  const regex = /(^|\s|\()((https?:\/\/[^\s]+)|((?<domain>[a-z][a-z0-9-]*(\.[a-z0-9-]+)+)[^\s]*))/gim;
  const runs = [];
  let cursor = 0;
  let match;

  while ((match = regex.exec(value))) {
    let uri = match[2];
    const start = match.index + match[1].length;
    let end = start + match[2].length;
    const consumedEnd = start + match[2].length;

    if (!uri.startsWith("http")) {
      uri = `https://${uri}`;
    }

    while (/[.,;!?]$/.test(uri)) {
      uri = uri.slice(0, -1);
      end -= 1;
    }

    if (/[)]$/.test(uri) && !uri.includes("(")) {
      uri = uri.slice(0, -1);
      end -= 1;
    }

    if (start > cursor) {
      runs.push({ text: value.slice(cursor, start) });
    }
    runs.push({
      text: value.slice(start, end),
      url: uri,
    });
    if (end < consumedEnd) {
      runs.push({ text: value.slice(end, consumedEnd) });
    }
    cursor = consumedEnd;
  }

  if (cursor < value.length) {
    runs.push({ text: value.slice(cursor) });
  }

  return runs.length > 0 ? runs : [{ text: value }];
}

function buildPdfTextTokens(text) {
  const runs = extractPdfLinkRuns(text);
  const tokens = [];

  for (const run of runs) {
    const parts = String(run.text || "").split("\n");
    parts.forEach((part, partIndex) => {
      const chunks = part.match(/\S+\s*|\s+/g) || (part ? [part] : []);
      chunks.forEach((chunk) => {
        tokens.push({
          text: chunk,
          url: run.url || "",
        });
      });
      if (partIndex < parts.length - 1) {
        tokens.push({ text: "\n", newline: true });
      }
    });
  }

  return tokens;
}

function fitPdfTokenToWidth(context, text, maxWidth) {
  if (!text) {
    return "";
  }
  let fitted = "";
  for (const char of text) {
    const candidate = fitted + char;
    if (!fitted || context.measureText(candidate).width <= maxWidth) {
      fitted = candidate;
    } else {
      break;
    }
  }
  return fitted || text.slice(0, 1);
}

function buildWrappedPdfLines(context, text, maxWidth) {
  const tokens = buildPdfTextTokens(text);
  const lines = [];
  let currentFragments = [];
  let currentWidth = 0;

  function pushLine() {
    lines.push({
      fragments: currentFragments,
      width: currentWidth,
    });
    currentFragments = [];
    currentWidth = 0;
  }

  function appendFragment(textValue, url) {
    if (!textValue) {
      return;
    }
    const width = context.measureText(textValue).width;
    currentFragments.push({ text: textValue, url, width });
    currentWidth += width;
  }

  for (const token of tokens) {
    if (token.newline) {
      pushLine();
      continue;
    }

    let remaining = token.text;
    while (remaining) {
      if (currentWidth === 0) {
        remaining = remaining.replace(/^\s+/, "");
        if (!remaining) {
          break;
        }
      }

      const availableWidth = Math.max(1, maxWidth - currentWidth);
      const remainingWidth = context.measureText(remaining).width;

      if (remainingWidth <= availableWidth) {
        appendFragment(remaining, token.url);
        remaining = "";
        continue;
      }

      if (currentWidth > 0) {
        pushLine();
        continue;
      }

      const fitted = fitPdfTokenToWidth(context, remaining, availableWidth);
      appendFragment(fitted, token.url);
      remaining = remaining.slice(fitted.length);
      if (remaining) {
        pushLine();
      }
    }
  }

  if (currentFragments.length > 0 || lines.length === 0) {
    pushLine();
  }

  return lines;
}

function roundRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  context.restore();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

function drawRoundedImageContain(context, bitmap, x, y, width, height, radius, background = "#dfe9fb") {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.clip();
  context.fillStyle = background;
  context.fillRect(x, y, width, height);

  const ratio = Math.min(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * ratio;
  const drawHeight = bitmap.height * ratio;
  const offsetX = x + ((width - drawWidth) / 2);
  const offsetY = y + ((height - drawHeight) / 2);
  context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

function getArchivePdfImagePreset(options) {
  if (options.imageSize === "large") {
    return { singleMaxHeight: 250, gridCellMaxHeight: 160, gap: 10 };
  }
  if (options.imageSize === "small") {
    return { singleMaxHeight: 150, gridCellMaxHeight: 92, gap: 8 };
  }
  return { singleMaxHeight: 190, gridCellMaxHeight: 122, gap: 9 };
}

function getArchivePdfImageFrames(post, contentWidth, options, scale) {
  const images = Array.isArray(post.images) ? post.images.slice(0, 4) : [];
  if (images.length === 0) {
    return { frames: [], totalHeight: 0 };
  }

  const preset = getArchivePdfImagePreset(options);
  const gap = preset.gap * scale;
  const captionLineHeight = 12 * scale;

  if (images.length === 1) {
    const image = images[0];
    const ratio = image.width && image.height ? image.width / image.height : (16 / 9);
    const height = Math.min(preset.singleMaxHeight * scale, contentWidth / Math.max(ratio, 0.5));
    const captionLines = image.alt ? 2 : 0;
    return {
      frames: [{
        image,
        x: 0,
        y: 0,
        width: contentWidth,
        height,
        captionLines,
        captionHeight: captionLines * captionLineHeight,
      }],
      totalHeight: height + (captionLines * captionLineHeight),
    };
  }

  const cellWidth = (contentWidth - gap) / 2;
  const frames = [];
  let cursorY = 0;

  for (let index = 0; index < images.length; index += 2) {
    const rowImages = images.slice(index, index + 2);
    const rowHeights = rowImages.map((image) => {
      const ratio = image.width && image.height ? image.width / image.height : 1;
      return Math.min(preset.gridCellMaxHeight * scale, cellWidth / Math.max(ratio, 0.66));
    });
    const rowHeight = Math.max(...rowHeights, 72 * scale);
    const captionHeights = rowImages.map((image) => image.alt ? (2 * captionLineHeight) : 0);
    const rowCaptionHeight = Math.max(0, ...captionHeights);

    rowImages.forEach((image, column) => {
      frames.push({
        image,
        x: column * (cellWidth + gap),
        y: cursorY,
        width: cellWidth,
        height: rowHeight,
        captionLines: image.alt ? 2 : 0,
        captionHeight: image.alt ? (2 * captionLineHeight) : 0,
      });
    });

    cursorY += rowHeight + rowCaptionHeight;
    if (index + 2 < images.length) {
      cursorY += gap;
    }
  }

  return {
    frames,
    totalHeight: cursorY,
  };
}

function drawArchivePdfMetricPill(context, label, x, y, scale) {
  const paddingX = 8 * scale;
  const width = context.measureText(label).width + (paddingX * 2);
  const height = 18 * scale;
  fillRoundedRect(context, x, y, width, height, 9 * scale, "#edf4ff");
  strokeRoundedRect(context, x, y, width, height, 9 * scale, "#d0ddf6", 1 * scale);
  context.fillStyle = "#3d5f8f";
  context.fillText(label, x + paddingX, y + (4 * scale));
  return width;
}

function buildArchivePostMetricLabels(post) {
  const counts = post.counts || {};
  return [
    `Likes ${counts.likeCount || 0}`,
    `Replies ${counts.replyCount || 0}`,
    `Reposts ${counts.repostCount || 0}`,
    `Quotes ${counts.quoteCount || 0}`,
  ];
}

function estimateArchivePostCardHeight(context, post, options, scale, cardWidth, layoutMode = "standalone") {
  const innerPadding = 16 * scale;
  const depthIndent = layoutMode === "standalone" && options.indentThreads
    ? Math.min(4, Number(post?.threadDepth) || 0) * (18 * scale)
    : 0;
  const contentWidth = cardWidth - (innerPadding * 2) - depthIndent;
  const headerHeight = 42 * scale;
  const metricsHeight = options.includeMetrics ? (28 * scale) : 0;
  const textLineHeight = 15 * scale;

  context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
  const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth);
  let totalHeight = innerPadding + headerHeight + metricsHeight + (textLines.length * textLineHeight) + (12 * scale);

  const imageLayout = getArchivePdfImageFrames(post, contentWidth, options, scale);
  if (imageLayout.totalHeight > 0) {
    totalHeight += imageLayout.totalHeight + (12 * scale);
  }

  totalHeight += 28 * scale;
  return totalHeight + innerPadding;
}

function drawArchivePdfTextBlock(context, lines, x, y, lineHeight) {
  const annotations = [];
  context.textBaseline = "top";

  lines.forEach((line, lineIndex) => {
    let cursorX = x;
    const lineY = y + (lineIndex * lineHeight);

    line.fragments.forEach((fragment) => {
      if (!fragment.text) {
        return;
      }

      context.fillStyle = fragment.url ? "#1d4ed8" : "#17233a";
      context.fillText(fragment.text, cursorX, lineY);

      if (fragment.url) {
        const underlineY = lineY + lineHeight - 2;
        context.fillRect(cursorX, underlineY, fragment.width, Math.max(1, lineHeight * 0.08));
        annotations.push({
          x: cursorX,
          y: lineY,
          width: fragment.width,
          height: lineHeight,
          url: fragment.url,
        });
      }

      cursorX += fragment.width;
    });
  });

  return {
    height: lines.length * lineHeight,
    annotations,
  };
}

function canvasRectToPdfRect(rect, canvasWidth, canvasHeight) {
  const scaleX = 595 / canvasWidth;
  const scaleY = 842 / canvasHeight;
  return [
    Number((rect.x * scaleX).toFixed(2)),
    Number(((canvasHeight - (rect.y + rect.height)) * scaleY).toFixed(2)),
    Number(((rect.x + rect.width) * scaleX).toFixed(2)),
    Number(((canvasHeight - rect.y) * scaleY).toFixed(2)),
  ];
}

function getArchiveThreadGroupKey(post) {
  return post?.thread?.rootUri || post?.uri || "";
}

function getArchivePdfThreadBlockFrame(baseX, baseWidth, post, options, scale) {
  const depth = options.indentThreads ? Math.min(4, Number(post?.threadDepth) || 0) : 0;
  const indent = depth * (18 * scale);
  return {
    depth,
    indent,
    x: baseX + indent,
    width: Math.max(220 * scale, baseWidth - indent),
  };
}

async function drawArchivePdfPostCard(
  context,
  assetMap,
  post,
  x,
  y,
  width,
  options,
  scale,
  canvasWidth,
  canvasHeight,
  layout = {},
) {
  const innerPadding = 16 * scale;
  const annotations = [];
  const integrated = layout.mode === "integrated";
  const cardHeight = estimateArchivePostCardHeight(
    context,
    post,
    options,
    scale,
    width,
    integrated ? "integrated" : "standalone",
  );
  const isReply = integrated ? (layout.depth || 0) > 0 : false;
  const cardRadius = integrated ? (14 * scale) : (18 * scale);
  const cardFill = integrated
    ? (isReply ? "#f8fbff" : "#ffffff")
    : "#ffffff";
  const cardStroke = integrated
    ? (isReply ? "#d9e5f5" : "#d2deef")
    : "#d7e3f5";

  if (!integrated) {
    context.save();
    context.shadowColor = "rgba(20, 35, 60, 0.08)";
    context.shadowBlur = 18 * scale;
    context.shadowOffsetY = 7 * scale;
    fillRoundedRect(context, x, y, width, cardHeight, cardRadius, cardFill);
    context.restore();
  } else {
    fillRoundedRect(context, x, y, width, cardHeight, cardRadius, cardFill);
  }
  strokeRoundedRect(context, x, y, width, cardHeight, cardRadius, cardStroke, integrated ? (1 * scale) : (1.2 * scale));
  if (!integrated) {
    fillRoundedRect(context, x + (10 * scale), y + (14 * scale), 4 * scale, cardHeight - (28 * scale), 3 * scale, "#4e8cff");
  }

  let cursorY = y + innerPadding;
  const textStartX = x + innerPadding + (integrated ? 0 : (8 * scale));
  const depthIndent = 0;
  const cardContentX = textStartX + depthIndent;
  const contentWidth = width - (innerPadding * 2) - depthIndent;

  if (integrated && isReply) {
    fillRoundedRect(context, x + (10 * scale), y + (12 * scale), 3 * scale, cardHeight - (24 * scale), 2 * scale, "#d95f4b");
  } else if (!integrated && (Number(post?.threadDepth) || 0) > 0) {
    fillRoundedRect(context, cardContentX - (12 * scale), y + (14 * scale), 4 * scale, cardHeight - (28 * scale), 3 * scale, "#d95f4b");
  }

  context.textBaseline = "top";
  context.fillStyle = "#13213c";
  context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
  const pdfAuthorTitle = post.authorDisplayName || post.authorHandle || authAccount || "Bluesky";
  context.fillText(pdfAuthorTitle, cardContentX, cursorY);

  context.fillStyle = "#577194";
  context.font = `${9.5 * scale}px "Segoe UI", Aptos, sans-serif`;
  context.fillText(`@${post.authorHandle || authAccount || "bluesky"}`, cardContentX, cursorY + (16 * scale));
  const dateText = formatHistoryTimestamp(post.createdAt);
  const dateWidth = context.measureText(dateText).width;
  context.fillText(dateText, x + width - innerPadding - dateWidth, cursorY + (2 * scale));
  cursorY += 32 * scale;

  if (options.includeMetrics) {
    context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
    let pillX = cardContentX;
    const pillY = cursorY;
    for (const label of buildArchivePostMetricLabels(post)) {
      pillX += drawArchivePdfMetricPill(context, label, pillX, pillY, scale) + (6 * scale);
    }
    cursorY += 28 * scale;
  }

  context.fillStyle = "#17233a";
  context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
  const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth);
  const textBlock = drawArchivePdfTextBlock(context, textLines, cardContentX, cursorY, 15 * scale);
  annotations.push(...textBlock.annotations.map((annotation) => ({
    rect: canvasRectToPdfRect(annotation, canvasWidth, canvasHeight),
    url: annotation.url,
  })));
  cursorY += textBlock.height + (12 * scale);

  const imageLayout = getArchivePdfImageFrames(post, contentWidth, options, scale);
  for (const frame of imageLayout.frames) {
    const asset = assetMap.get(frame.image.path);
    const frameX = cardContentX + frame.x;
    const frameY = cursorY + frame.y;

    if (asset) {
      const bitmap = await loadArchiveAssetBitmap(asset);
      drawRoundedImageContain(context, bitmap, frameX, frameY, frame.width, frame.height, 12 * scale);
      bitmap.close();
    } else {
      fillRoundedRect(context, frameX, frameY, frame.width, frame.height, 12 * scale, "#eaf1fb");
    }
    strokeRoundedRect(context, frameX, frameY, frame.width, frame.height, 12 * scale, "#d5e0f2", 1 * scale);

    if (frame.image.alt) {
      context.fillStyle = "#5d7394";
      context.font = `${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
      const altLines = buildWrappedPdfLines(context, `${t("archivePdfAltPrefix")} ${frame.image.alt}`, frame.width);
      drawArchivePdfTextBlock(context, altLines.slice(0, frame.captionLines || 2), frameX, frameY + frame.height + (4 * scale), 12 * scale);
    }
  }

  if (imageLayout.totalHeight > 0) {
    cursorY += imageLayout.totalHeight + (10 * scale);
  }

  const footerY = y + cardHeight - innerPadding - (18 * scale);
  const permalinkText = post.permalink || post.uri || "";
  const buttonLabel = permalinkText ? "Post auf Bluesky" : "";
  if (buttonLabel) {
    context.font = `700 ${9 * scale}px "Segoe UI", Aptos, sans-serif`;
    const buttonWidth = context.measureText(buttonLabel).width + (22 * scale);
    fillRoundedRect(context, cardContentX, footerY, buttonWidth, 20 * scale, 10 * scale, "#122642");
    context.fillStyle = "#ffffff";
    context.fillText(buttonLabel, cardContentX + (11 * scale), footerY + (4.5 * scale));
    annotations.push({
      rect: canvasRectToPdfRect({
        x: cardContentX,
        y: footerY,
        width: buttonWidth,
        height: 20 * scale,
      }, canvasWidth, canvasHeight),
      url: permalinkText,
    });
  }

  context.fillStyle = "#7489a5";
  context.font = `${8.2 * scale}px "Segoe UI", Aptos, sans-serif`;
  const uriLabel = (post.uri || "").replace(/^at:\/\//, "");
  if (uriLabel) {
    const maxUriWidth = width - (innerPadding * 2) - (140 * scale);
    let clipped = uriLabel;
    while (clipped && context.measureText(clipped).width > maxUriWidth) {
      clipped = `${clipped.slice(0, -2)}…`;
    }
    context.fillText(clipped, x + width - innerPadding - context.measureText(clipped).width, footerY + (5 * scale));
  }

  return { height: cardHeight, annotations };
}

async function renderArchivePdfCanvasPage(catalog, posts, pageIndex, pageCount, bandIndex, bandCount, options) {
  const assetMap = new Map((catalog.assets || []).map((asset) => [asset.path, asset]));
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext("2d");
  const scale = canvas.width / 595;
  const margin = 28 * scale;
  const pageWidth = canvas.width - (margin * 2);
  const pageHeight = canvas.height - (margin * 2);
  const cardGap = 16 * scale;
  const headerHeight = 42 * scale;
  let cursorY = margin + headerHeight;
  const annotations = [];

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f3f8ff");
  gradient.addColorStop(1, "#e7eef9");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  fillRoundedRect(context, margin, margin, pageWidth, pageHeight, 22 * scale, "rgba(255,255,255,0.42)");
  strokeRoundedRect(context, margin, margin, pageWidth, pageHeight, 22 * scale, "#d5e1f3", 1.2 * scale);

  context.textBaseline = "top";
  context.fillStyle = "#10233e";
  context.font = `700 ${16 * scale}px "Segoe UI", Aptos, sans-serif`;
  context.fillText(catalog?.account?.handle || authAccount || "Bluesky Archiv", margin + (18 * scale), margin + (14 * scale));

  context.fillStyle = "#587192";
  context.font = `${9.5 * scale}px "Segoe UI", Aptos, sans-serif`;
  context.fillText(`Band ${bandIndex + 1}/${bandCount}`, margin + (18 * scale), margin + (34 * scale));
  const pageCounter = `Seite ${pageIndex + 1}/${pageCount}`;
  const pageCounterWidth = context.measureText(pageCounter).width;
  context.fillText(pageCounter, margin + pageWidth - (18 * scale) - pageCounterWidth, margin + (24 * scale));

  const baseCardX = margin + (18 * scale);
  const baseCardWidth = pageWidth - (36 * scale);
  const laidOutPosts = [];
  for (const post of posts) {
    const frame = getArchivePdfThreadBlockFrame(baseCardX, baseCardWidth, post, options, scale);
    const cardHeight = estimateArchivePostCardHeight(
      context,
      post,
      options,
      scale,
      frame.width,
      "integrated",
    );
    laidOutPosts.push({
      post,
      y: cursorY,
      cardHeight,
      x: frame.x,
      width: frame.width,
      depth: frame.depth,
      groupKey: getArchiveThreadGroupKey(post),
    });
    cursorY += cardHeight + cardGap;
  }

  const pageGroups = [];
  laidOutPosts.forEach((entry) => {
    const currentGroup = pageGroups[pageGroups.length - 1];
    if (!currentGroup || currentGroup.groupKey !== entry.groupKey) {
      pageGroups.push({
        groupKey: entry.groupKey,
        entries: [entry],
      });
    } else {
      currentGroup.entries.push(entry);
    }
  });

  pageGroups.forEach((group) => {
    if (group.entries.length <= 1 && !(group.entries[0]?.post?.threadDepth > 0)) {
      return;
    }
    const first = group.entries[0];
    const last = group.entries[group.entries.length - 1];
    const groupX = baseCardX - (6 * scale);
    const groupY = first.y - (10 * scale);
    const groupWidth = baseCardWidth + (12 * scale);
    const groupHeight = (last.y + last.cardHeight) - first.y + (20 * scale);
    fillRoundedRect(context, groupX, groupY, groupWidth, groupHeight, 22 * scale, "rgba(255,255,255,0.72)");
    strokeRoundedRect(context, groupX, groupY, groupWidth, groupHeight, 22 * scale, "#d7e3f5", 1 * scale);
    fillRoundedRect(context, groupX + (10 * scale), groupY + (14 * scale), 4 * scale, groupHeight - (28 * scale), 3 * scale, "#d95f4b");
  });

  for (const entry of laidOutPosts) {
    const inThreadGroup = (entry.depth || 0) > 0
      || pageGroups.some((group) => group.groupKey === entry.groupKey && group.entries.length > 1);
    const card = await drawArchivePdfPostCard(
      context,
      assetMap,
      entry.post,
      entry.x,
      entry.y,
      entry.width,
      options,
      scale,
      canvas.width,
      canvas.height,
      inThreadGroup ? {
        mode: "integrated",
        depth: entry.depth,
      } : {},
    );
    annotations.push(...card.annotations);
  }

  const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  return {
    bytes,
    width: canvas.width,
    height: canvas.height,
    annotations,
  };
}

function paginateArchivePdfPosts(posts, options) {
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext("2d");
  const scale = canvas.width / 595;
  const margin = 28 * scale;
  const pageHeight = canvas.height - (margin * 2);
  const headerHeight = 42 * scale;
  const cardGap = 16 * scale;
  const baseCardWidth = canvas.width - (margin * 2) - (36 * scale);
  const usableHeight = pageHeight - headerHeight - (18 * scale);
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  for (const post of posts) {
    const frame = getArchivePdfThreadBlockFrame(0, baseCardWidth, post, options, scale);
    const cardHeight = estimateArchivePostCardHeight(context, post, options, scale, frame.width, "integrated");
    const nextHeight = currentPage.length === 0 ? cardHeight : currentHeight + cardGap + cardHeight;

    if (currentPage.length > 0 && nextHeight > usableHeight) {
      pages.push(currentPage);
      currentPage = [post];
      currentHeight = cardHeight;
    } else {
      currentPage.push(post);
      currentHeight = nextHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function buildPdfFile(pages) {
  const encoder = new TextEncoder();
  const objects = [null];

  function addObject(data) {
    objects.push(data);
    return objects.length - 1;
  }
  const pageIds = [];

  for (const page of pages) {
    const xObjects = {};
    for (const image of page.images) {
      const imageId = addObject({
        header: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
        bytes: image.bytes,
        footer: "\nendstream",
      });
      xObjects[image.name] = imageId;
    }

    const contentBytes = encoder.encode(page.content);
    const contentId = addObject({
      header: `<< /Length ${contentBytes.length} >>\nstream\n`,
      bytes: contentBytes,
      footer: "\nendstream",
    });

    const annotationIds = (page.annotations || []).map((annotation) => addObject(
      `<< /Type /Annot /Subtype /Link /Rect [${annotation.rect.join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfText(annotation.url)}) >> >>`,
    ));

    const xObjectEntries = Object.entries(xObjects)
      .map(([name, id]) => `/${name} ${id} 0 R`)
      .join(" ");
    const resources = `<< /XObject << ${xObjectEntries} >> >>`;
    const annotations = annotationIds.length > 0 ? ` /Annots [${annotationIds.map((id) => `${id} 0 R`).join(" ")}]` : "";
    pageIds.push(addObject(`<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${contentId} 0 R${annotations} >>`));
  }

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  objects[pagesId] = objects[pagesId].replace("PAGES_REF", `${pagesId} 0 R`);
  for (const pageId of pageIds) {
    objects[pageId] = objects[pageId].replace("PAGES_REF", `${pagesId} 0 R`);
  }
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const parts = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = length;
    const object = objects[index];
    const prefix = encoder.encode(`${index} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    parts.push(prefix);
    length += prefix.length;
    if (typeof object === "string") {
      const body = encoder.encode(object);
      parts.push(body);
      length += body.length;
    } else {
      const header = encoder.encode(object.header);
      const footer = encoder.encode(object.footer);
      parts.push(header, object.bytes, footer);
      length += header.length + object.bytes.length + footer.length;
    }
    parts.push(suffix);
    length += suffix.length;
  }

  const xrefOffset = length;
  const xref = ["xref", `0 ${objects.length}`, "0000000000 65535 f "];
  for (let index = 1; index < objects.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  }
  const trailer = `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(`${xref.join("\n")}\n${trailer}`));

  return new Blob(parts, { type: "application/pdf" });
}

async function buildArchivePdfBand(catalog, posts, bandIndex, bandCount, options) {
  const pagePosts = paginateArchivePdfPosts(posts, options);
  const pages = [];

  for (const [pageIndex, page] of pagePosts.entries()) {
    const renderedPage = await renderArchivePdfCanvasPage(catalog, page, pageIndex, pagePosts.length, bandIndex, bandCount, options);
    pages.push({
      content: `q 595 0 0 842 0 0 cm /PageImage${pageIndex + 1} Do Q`,
      images: [{
        name: `PageImage${pageIndex + 1}`,
        width: renderedPage.width,
        height: renderedPage.height,
        bytes: renderedPage.bytes,
      }],
      annotations: renderedPage.annotations,
    });
  }

  return buildPdfFile(pages);
}

function splitArchiveIntoBands(posts, options) {
  const size = Math.max(100, Math.min(1000, Number(options.bandSize) || 200));
  const orderedPosts = buildArchiveThreadGroups(posts).flatMap((group) => group.posts);
  const bands = [];
  let current = [];

  for (const post of orderedPosts) {
    const currentGroup = current[current.length - 1]?.thread?.rootUri || current[current.length - 1]?.uri || "";
    const nextGroup = post?.thread?.rootUri || post?.uri || "";
    const canOverflowForThread = options.keepThreadsTogether
      && current.length > 0
      && current.length >= size
      && currentGroup
      && currentGroup === nextGroup;

    if (current.length >= size && !canOverflowForThread) {
      bands.push(current);
      current = [];
    }
    current.push(post);
  }

  if (current.length > 0) {
    bands.push(current);
  }

  return bands;
}

async function exportArchivePdfBandsFromCatalog(catalog = archiveCatalog) {
  if (!catalog) {
    throw new Error(t("archiveNeedArchive"));
  }

  const options = getArchivePdfOptions();
  const orderedPosts = buildArchiveThreadGroups([...catalog.posts].reverse()).flatMap((group) => group.posts);
  const bands = splitArchiveIntoBands(orderedPosts, options);
  const baseName = makeArchiveFileBaseName(catalog);

  for (const [bandIndex, posts] of bands.entries()) {
    setArchiveProgress({
      title: t("archiveProgressPdfTitle"),
      step: t("archiveProgressPdfStep", { index: bandIndex + 1, count: bands.length }),
      percent: Math.round((bandIndex / Math.max(1, bands.length)) * 100),
      detail: t("archiveProgressPdfDetail", { posts: posts.length }),
    });
    const blob = await buildArchivePdfBand(catalog, posts, bandIndex, bands.length, options);
    const fileName = `${baseName}-band-${String(bandIndex + 1).padStart(3, "0")}.pdf`;
    const file = new File([blob], fileName, { type: "application/pdf" });
    await shareOrDownloadFile(file, fileName, { preferDownload: true });
  }

  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveProgressDoneStep"),
    percent: 100,
    detail: t("archivePdfDone", { count: bands.length }),
  });
}

async function ensureArchiveCatalogLoaded(forceRefresh = false) {
  if (archiveCatalog && !forceRefresh) {
    return archiveCatalog;
  }

  const filters = getArchiveFilters();
  const filterKey = serializeArchiveFilters(filters);
  const currentSession = archiveSession && archiveSession.filterKey === filterKey ? archiveSession : null;
  if (currentSession && !currentSession.hasMore && !forceRefresh) {
    throw new Error(t("archiveNoPendingWave"));
  }

  setArchiveProgress({
    title: t("archiveProgressFetchTitle"),
    step: t("archiveProgressFetchStep"),
    percent: 3,
    detail: t("archiveProgressFetchIntro"),
  });
  archivePreviewState = null;
  archiveTransientNotice = "";
  activeArchiveRunId = crypto.randomUUID();
  activeArchiveRunState = "running";
  updateArchiveRunControls();
  renderArchivePreview();
  renderArchiveStatusLine();

  let catalog;
  try {
    catalog = await sendToServiceWorker("EXPORT_ACCOUNT_ARCHIVE_WAVE", {
      runId: activeArchiveRunId,
      filters,
      cursor: forceRefresh ? "" : (currentSession?.nextCursor || ""),
      maxPosts: getArchiveWaveSize(),
      waveIndex: forceRefresh ? 1 : ((currentSession?.waveIndex || 0) + 1),
    }, {
      timeoutMs: 600000,
      onProgress(progress) {
        const progressDetail = [
          progress.detail || "",
          progress.preview?.metric || "",
          progress.preview?.meta || "",
        ].filter(Boolean).join(" \u2022 ");
        setArchiveProgress({
          title: progress.title || archiveJobState?.title || t("archiveProgressFetchTitle"),
          step: progress.step || archiveJobState?.step || t("archiveProgressFetchStep"),
          percent: Number.isFinite(progress.percent) ? progress.percent : (archiveJobState?.percent || 0),
          detail: progressDetail || archiveJobState?.detail || t("archiveProgressFetchIntro"),
        });
        if (progress.checkpoint) {
          archiveLastCheckpoint = progress.checkpoint;
        } else if (progress.preview?.meta) {
          archiveLastCheckpoint = progress.preview.meta;
        } else if (progress.detail) {
          archiveLastCheckpoint = progress.detail;
        }
        if (progress.preview) {
          archivePreviewState = progress.preview;
          renderArchivePreview();
        }
        if (progress.state === "paused") {
          activeArchiveRunState = "paused";
          updateArchiveRunControls();
          renderArchiveStatusLine();
          renderArchiveStartHint();
        } else if (progress.state === "running") {
          activeArchiveRunState = "running";
          updateArchiveRunControls();
          renderArchiveStatusLine();
          renderArchiveStartHint();
        }
      },
    });
  } catch (error) {
    activeArchiveRunState = "idle";
    activeArchiveRunId = null;
    updateArchiveRunControls();
    throw error;
  }

  archiveCatalog = normalizeImportedArchiveCatalog(catalog);
  archiveSession = {
    filterKey,
    filters,
    waveIndex: Number(catalog.session?.waveIndex) || (forceRefresh ? 1 : ((currentSession?.waveIndex || 0) + 1)),
    nextCursor: catalog.session?.nextCursor || "",
    hasMore: Boolean(catalog.session?.hasMore),
    exportedPosts: Number(catalog.session?.exportedPosts) || archiveCatalog.posts.length,
    exportedImages: Number(catalog.session?.exportedImages) || archiveCatalog.summary.imageCount,
    status: catalog.session?.status || "completed",
    updatedAt: new Date().toISOString(),
  };
  await saveArchiveSession(archiveSession);
  await saveArchiveCatalogState(archiveCatalog);
  activeArchiveRunState = catalog.session?.status === "cancelled" ? "cancelled" : "idle";
  if (activeArchiveRunState === "idle") {
    activeArchiveRunId = null;
  }
  archiveTransientNotice = catalog.session?.status === "cancelled"
    ? t("archiveWaveCancelledNotice", { wave: archiveSession.waveIndex || 1 })
    : t("archiveWaveLoadedNotice", {
        wave: archiveSession.waveIndex || 1,
        posts: archiveCatalog.posts.length,
        images: archiveCatalog.summary.imageCount,
      });
  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveWaveLoadedStep", { wave: archiveSession.waveIndex || 1 }),
    percent: 100,
    detail: archiveTransientNotice,
  });
  updateArchiveRunControls();
  renderArchiveStatusLine();
  renderArchiveStartHint();
  updateArchiveSummary(archiveCatalog);
  renderArchiveResults(archiveCatalog);
  return archiveCatalog;
}

function buildComposedText(baseText) {
  const trimmedBase = baseText.trim();
  const selectedText = getSelectedHashtagText();

  if (!selectedText) {
    return trimmedBase;
  }

  if (!trimmedBase) {
    return selectedText;
  }

  return hashtagPlacement === "last"
    ? `${trimmedBase}\n\n${selectedText}`
    : `${selectedText}\n\n${trimmedBase}`;
}

function renderHashtagCloud() {
  hashtagCloud.innerHTML = "";

  hashtags.forEach((tag) => {
    const item = document.createElement("div");
    item.className = "hashtag-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `hashtag-chip ${getHashtagFontClass(tag)}`;
    if (selectedHashtags.includes(tag.normalized)) {
      button.classList.add("is-selected");
    }
    button.textContent = formatHashtag(tag.value);
    button.addEventListener("click", () => {
      if (selectedHashtags.includes(tag.normalized)) {
        selectedHashtags = selectedHashtags.filter((entry) => entry !== tag.normalized);
      } else {
        selectedHashtags = [...selectedHashtags, tag.normalized];
      }
      renderHashtagCloud();
      void persistSettings();
      segmentOverrides = null;
      setComposerLocked(false);
      renderSegments({ preserveOverrides: false });
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "hashtag-tool";
    editButton.setAttribute("aria-label", t("editHashtagAria", { tag: formatHashtag(tag.value) }));
    editButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16.75V20h3.25L18.4 8.84l-3.24-3.24L4 16.75zm14.71-9.04a1 1 0 0 0 0-1.42l-1-1a1 1 0 0 0-1.42 0l-.88.88 3.24 3.24.06-.06z"></path>
      </svg>
    `;
    editButton.addEventListener("click", async () => {
      openHashtagEditDialog(tag);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "hashtag-tool danger";
    deleteButton.setAttribute("aria-label", t("deleteHashtagAria", { tag: formatHashtag(tag.value) }));
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z"></path>
      </svg>
    `;
    deleteButton.addEventListener("click", async () => {
      hashtags = hashtags.filter((entry) => entry.normalized !== tag.normalized);
      selectedHashtags = selectedHashtags.filter((entry) => entry !== tag.normalized);
      renderHashtagCloud();
      segmentOverrides = null;
      setComposerLocked(false);
      renderSegments({ preserveOverrides: false });
      await persistSettings();
      setStatus(t("hashtagDeleted"));
    });

    item.append(button, editButton, deleteButton);
    hashtagCloud.appendChild(item);
  });

  hashtagSelectionNote.textContent = selectedHashtags.length > 0
    ? t("hashtagSelectionSome", { count: selectedHashtags.length })
    : t("hashtagSelectionNone");
}

async function persistSettings() {
  try {
    await sendToServiceWorker("SAVE_SETTINGS", {
      localePreference,
      tipsVisible,
      altTextRequired,
      themeMode,
      appendThreadEmoji,
      hashtags,
      selectedHashtags,
      hashtagPlacement,
      segmentImages,
      postingHistory,
      archivePreferences: getArchivePreferences(),
    });
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

function createSettingsBackupPayload() {
  return {
    exportedAt: new Date().toISOString(),
    app: "Threadline",
    version: CURRENT_VERSION_INFO.appVersion,
    cacheVersion: CURRENT_VERSION_INFO.cacheVersion,
    schemaVersion: 1,
    excludesCredentials: true,
    data: {
      localePreference,
      tipsVisible,
      altTextRequired,
      themeMode,
      appendThreadEmoji,
      hashtagPlacement,
      hashtags,
      selectedHashtags,
      postingHistory,
      archivePreferences: getArchivePreferences(),
    },
  };
}

function isValidSettingsBackup(payload) {
  const data = payload?.data || payload;
  return Boolean(data && typeof data === "object");
}

async function exportSettingsBackup() {
  const payload = createSettingsBackupPayload();
  const file = new File(
    [JSON.stringify(payload, null, 2)],
    `threadline-settings-${new Date().toISOString().slice(0, 10)}.json`,
    { type: "application/json" },
  );

  await shareOrDownloadFile(file, file.name);
  setBackupStatus(t("backupExported"));
}

async function importSettingsBackup(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!isValidSettingsBackup(parsed)) {
    throw new Error(t("backupImportInvalid"));
  }

  const imported = parsed.data || parsed;
  const importedHashtags = normalizeHashtagEntries(imported.hashtags);
  const mergedHashtags = mergeHashtagEntries(hashtags, importedHashtags);
  const mergedSelectedHashtags = normalizeSelectedHashtagEntries(
    [...selectedHashtags, ...(Array.isArray(imported.selectedHashtags) ? imported.selectedHashtags : [])],
    mergedHashtags,
  );

  hashtags = mergedHashtags;
  selectedHashtags = mergedSelectedHashtags;
  postingHistory = mergePostingHistoryEntries(postingHistory, imported.postingHistory);
  hashtagPlacement = imported.hashtagPlacement === "last" ? "last" : "first";
  hashtagPlacementSelect.value = hashtagPlacement;
  tipsVisible = imported.tipsVisible !== false;
  altTextRequired = imported.altTextRequired === true;
  themeMode = imported.themeMode === "dark" ? "dark" : "light";
  appendThreadEmoji = imported.appendThreadEmoji === true;
  threadEmojiToggle.checked = appendThreadEmoji;
  localePreference = SUPPORTED_LOCALES.includes(imported.localePreference) || imported.localePreference === "auto"
    ? imported.localePreference
    : localePreference;
  currentLocale = localePreference === "auto" ? detectBrowserLocale() : localePreference;
  languageSelect.value = localePreference;
  applyArchivePreferences(imported.archivePreferences || {});

  await persistSettings();
  applyTranslations();
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  setBackupStatus(t("backupImported", { count: importedHashtags.length }));
}

function versionSignature(versionInfo) {
  return `${versionInfo?.appVersion || ""}|${versionInfo?.cacheVersion || ""}`;
}

function normalizeVersionInfo(versionInfo) {
  return {
    appVersion: versionInfo?.appVersion || "",
    cacheVersion: versionInfo?.cacheVersion || "",
    label: versionInfo?.label || "",
  };
}

function setUpdateStatus(message, showReload = false) {
  updateStatus.textContent = message;
  updateStatus.hidden = !message;
  reloadAppButton.hidden = !showReload;
}

async function fetchVersionInfo() {
  const response = await fetch("./version.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Version file unavailable");
  }
  return normalizeVersionInfo(await response.json());
}

async function performAppReload() {
  setUpdateStatus(t("updateApplying"), false);
  await serviceWorkerRegistration?.update().catch(() => {});
  window.location.reload();
}

async function checkForUpdates(options = {}) {
  const {
    showChecking = true,
    silentNoChange = false,
    silentError = false,
  } = options;

  if (updateInProgress) {
    return;
  }

  updateInProgress = true;
  checkUpdatesButton.disabled = true;

  if (showChecking) {
    setUpdateStatus(t("updateChecking"), false);
  }

  try {
    await serviceWorkerRegistration?.update();
    const remoteVersion = await fetchVersionInfo();

    if (!remoteVersion.appVersion || !remoteVersion.cacheVersion) {
      if (!silentError) {
        setUpdateStatus(t("updateVersionIncomplete"), false);
      }
      return;
    }

    if (versionSignature(remoteVersion) === versionSignature(CURRENT_VERSION_INFO)) {
      if (!silentNoChange) {
        setUpdateStatus(t("updateNoChange"), false);
      }
      return;
    }

    const remoteLabel = remoteVersion.label ? ` · ${remoteVersion.label}` : "";
    const message = `${t("updateAvailablePrefix")}: ${remoteVersion.appVersion} · ${remoteVersion.cacheVersion}${remoteLabel}. ${t("updateAvailableAction")}`;
    setUpdateStatus(message, true);
  } catch (error) {
    console.error(error);
    if (!silentError) {
      setUpdateStatus(t("updateFailed"), false);
    }
  } finally {
    updateInProgress = false;
    checkUpdatesButton.disabled = false;
  }
}

function updateStatusForAuth() {
  updateAuthButtons();

  if (authAccount) {
    setStatus(t("statusConnected", { account: authAccount }));
    return;
  }

  setStatus(t("statusNoAuth"));
}

async function verifySession(options = {}) {
  const { silent = false } = options;

  if (!authAccount) {
    return false;
  }

  try {
    const result = await sendToServiceWorker("VERIFY_SESSION");

    if (!result.authenticated) {
      applyDisconnectedState(!silent);
      return false;
    }

    authAccount = result.handle || result.identifier || authAccount;
    logoutButton.hidden = false;

    if (silent) {
      updateAuthButtons();
    } else {
      setStatus(t("statusConnected", { account: authAccount }));
    }

    return true;
  } catch (error) {
    console.error(error);
    applyDisconnectedState(!silent);
    return false;
  }
}

function startSessionChecks() {
  window.clearInterval(sessionCheckTimer);
  sessionCheckTimer = window.setInterval(() => {
    void verifySession({ silent: true });
  }, 5 * 60 * 1000);
}

function buildBlueskyPostUrl(handle, uri) {
  const parts = String(uri || "").split("/");
  const recordId = parts[parts.length - 1];

  if (!handle || !recordId) {
    return "";
  }

  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordId)}`;
}

function showPublishResult(result) {
  const postCount = result.posts?.length || 0;
  const handle = result.handle || authAccount;
  const firstPost = result.posts?.[0];
  const postUrl = buildBlueskyPostUrl(handle, firstPost?.uri);

  publishResultText.textContent = postCount > 1 ? t("publishResultMessageMany") : t("publishResultMessageOne");
  publishResultLink.href = postUrl || "#";
  publishResultLink.hidden = !postUrl;
  publishResultDialog.showModal();
}

function formatHistoryTimestamp(value) {
  try {
    return new Intl.DateTimeFormat(currentLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function updateHistoryAvailability() {
  historyButton.disabled = postingHistory.length === 0;
}

function renderHistoryList() {
  historyList.innerHTML = "";

  if (postingHistory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = t("historyEmpty");
    historyList.appendChild(empty);
    updateHistoryAvailability();
    return;
  }

  postingHistory.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const meta = document.createElement("div");
    meta.className = "history-item-meta";

    const timestamp = document.createElement("p");
    timestamp.className = "history-timestamp";
    timestamp.textContent = formatHistoryTimestamp(entry.createdAt);

    const counts = document.createElement("p");
    counts.className = "history-meta";
    counts.textContent = t("historyMeta", {
      threads: entry.threadCount,
      images: entry.imageCount,
    });

    meta.append(timestamp, counts);

    const actions = document.createElement("div");
    actions.className = "history-item-actions";

    const link = document.createElement("a");
    link.className = "ghost-button link-button history-link";
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = t("historyOpenLink");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "segment-image-tool danger history-delete-button";
    deleteButton.setAttribute("aria-label", t("historyDeleteButton"));
    deleteButton.innerHTML = createIconSvg("M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z");
    deleteButton.addEventListener("click", async () => {
      postingHistory = postingHistory.filter((itemEntry) => itemEntry.id !== entry.id);
      renderHistoryList();
      await persistSettings();
      setStatus(t("historyDeleted"));
    });

    actions.append(link, deleteButton);
    item.append(meta, actions);
    historyList.appendChild(item);
  });

  updateHistoryAvailability();
}

async function recordPublishedThread(result, preparedSegments) {
  const handle = result.handle || authAccount;
  const firstPost = result.posts?.[0];
  const url = buildBlueskyPostUrl(handle, firstPost?.uri);
  if (!url) {
    return;
  }

  postingHistory = normalizePostingHistory([
    {
      id: crypto.randomUUID(),
      url,
      createdAt: new Date().toISOString(),
      threadCount: result.posts?.length || preparedSegments.length || 1,
      imageCount: preparedSegments.reduce((total, segment) => total + (segment.images?.length || 0), 0),
    },
    ...postingHistory,
  ]);

  renderHistoryList();
  await persistSettings();
}

function autoSizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function getHelpReadmePath() {
  return currentLocale === "de" ? "./README.de.md" : "./README.md";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function convertHtmlBlocks(markdown) {
  return markdown
    .replace(/<p\s+align="center">\s*<img\s+src="([^"]+)"\s+alt="([^"]*)"\s+width="([^"]+)"\s*>\s*<\/p>/gi, (_, src, alt, width) =>
      `<p class="help-centered"><img src="${src}" alt="${escapeHtml(alt)}" width="${width}"></p>`)
    .replace(/<p\s+align="center">\s*([\s\S]*?)\s*<\/p>/gi, (_, content) =>
      `<p class="help-centered">${renderInlineMarkdown(content.trim())}</p>`);
}

function renderMarkdownAsHtml(markdown) {
  const prepared = convertHtmlBlocks(markdown.replace(/\r\n/g, "\n"));
  const lines = prepared.split("\n");
  const html = [];
  let inList = false;
  let listTag = "";
  let inCode = false;
  let codeLines = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!inList) {
      return;
    }
    html.push(`</${listTag}>`);
    inList = false;
    listTag = "";
  };

  const flushCode = () => {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    inCode = false;
    codeLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.trim().startsWith("<p class=\"help-centered\">")) {
      flushParagraph();
      flushList();
      html.push(line.trim());
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const unordered = line.match(/^-\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const nextTag = ordered ? "ol" : "ul";
      if (!inList || listTag !== nextTag) {
        flushList();
        inList = true;
        listTag = nextTag;
        html.push(`<${listTag}>`);
      }
      html.push(`<li>${renderInlineMarkdown((ordered || unordered)[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return html.join("");
}

async function loadReadmeContent() {
  const path = getHelpReadmePath();

  if (helpCache.path === path && helpCache.text) {
    helpStatus.textContent = "";
    helpContent.innerHTML = renderMarkdownAsHtml(helpCache.text);
    return;
  }

  helpStatus.textContent = t("helpLoading");
  helpContent.innerHTML = "";

  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("README unavailable");
    }

    const text = await response.text();
    helpCache = { path, text };
    helpStatus.textContent = "";
    helpContent.innerHTML = renderMarkdownAsHtml(text);
  } catch (error) {
    console.error(error);
    helpStatus.textContent = t("helpFailed");
    if (!(helpCache.path === path && helpCache.text)) {
      helpContent.innerHTML = "";
    }
  }
}

function reserveForCounters(segmentCount) {
  const digits = String(Math.max(segmentCount, 1)).length;
  return 2 * digits + 3;
}

function reserveForThreadEmoji() {
  return "\n⤵️".length;
}

function splitByManualMarkers(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(MANUAL_SPLIT_MARKER)
    .map((part) => normalizeInput(part))
    .filter(Boolean);
}

function splitChunksGreedy(chunks, limitFactory) {
  return chunks.flatMap((chunk) => greedySplit(chunk, limitFactory));
}

function decorateSegments(segments, withCounters, withThreadEmoji) {
  return segments.map((segment, segmentIndex) => {
    let suffix = "";
    const isLastSegment = segmentIndex === segments.length - 1;

    if (withThreadEmoji && !isLastSegment) {
      suffix += "\n⤵️";
    }

    if (withCounters) {
      suffix += `\n${segmentIndex + 1}/${segments.length}`;
    }

    return `${segment}${suffix}`;
  });
}

function splitIntoSegments(text, withCounters, withThreadEmoji) {
  const manualChunks = splitByManualMarkers(text);

  if (manualChunks.length === 0) {
    return [];
  }

  const reserveForSuffix = (segmentCount) => (
    (withThreadEmoji ? reserveForThreadEmoji() : 0)
    + (withCounters ? reserveForCounters(segmentCount) : 0)
  );

  if (!withCounters && !withThreadEmoji) {
    return splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH);
  }

  const estimatedLength = manualChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let guess = Math.max(1, Math.ceil(estimatedLength / MAX_POST_LENGTH), manualChunks.length);

  for (let index = 0; index < 12; index += 1) {
    const reserve = reserveForSuffix(guess);
    const segments = splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH - reserve);

    if (segments.length === guess) {
      return decorateSegments(segments, withCounters, withThreadEmoji);
    }

    guess = segments.length;
  }

  const fallbackReserve = reserveForSuffix(guess);
  const fallbackSegments = splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH - fallbackReserve);
  return decorateSegments(fallbackSegments, withCounters, withThreadEmoji);
}

function normalizeInput(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenizeText(text) {
  return text.match(/\n|[^\s\n]+|[ \t]+/g) || [];
}

function greedySplit(text, limitFactory) {
  const tokens = tokenizeText(text);
  const segments = [];
  let current = "";

  for (const token of tokens) {
    const chunkIndex = segments.length;
    const limit = Math.max(1, limitFactory(chunkIndex));
    const nextValue = current + token;

    if (token === "\n") {
      if (nextValue.length <= limit) {
        current = nextValue;
      } else if (current) {
        segments.push(trimSegment(current));
        current = "";
      }
      continue;
    }

    if (/^[ \t]+$/.test(token)) {
      if (current && nextValue.length <= limit) {
        current = nextValue;
      }
      continue;
    }

    if (token.length > limit) {
      if (current) {
        segments.push(trimSegment(current));
        current = "";
      }

      let start = 0;
      while (start < token.length) {
        const sliceLimit = Math.max(1, limitFactory(segments.length));
        segments.push(token.slice(start, start + sliceLimit));
        start += sliceLimit;
      }
      continue;
    }

    if (nextValue.length <= limit) {
      current = nextValue;
      continue;
    }

    if (current) {
      segments.push(trimSegment(current));
    }
    current = token;
  }

  if (current) {
    segments.push(trimSegment(current));
  }

  return segments;
}

function trimSegment(segment) {
  return segment.replace(/[ \t]+\n/g, "\n").replace(/^[ \t]+|[ \t]+$/g, "").trimEnd();
}

function createIconSvg(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
}

function renderSegmentImages(container, segmentIndex) {
  container.innerHTML = "";
  const images = Array.isArray(segmentImages[segmentIndex]) ? segmentImages[segmentIndex] : [];

  images.forEach((image, imageIndex) => {
    const card = document.createElement("div");
    card.className = "segment-image-card";
    if (image.validation?.tooBig) {
      card.classList.add("is-too-large");
    }

    const preview = document.createElement("div");
    preview.className = "segment-image-preview";
    preview.title = image.alt || t("altTextMissing");
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 150;
    preview.appendChild(canvas);
    void renderImageToCanvas(image, canvas, {
      width: canvas.width,
      height: canvas.height,
      fit: isImageUsingDefaultEdit(image) ? "contain" : "cover",
    });

    const meta = document.createElement("div");
    meta.className = "segment-image-meta";
    const name = document.createElement("span");
    name.textContent = image.name;
    const altState = document.createElement("span");
    altState.textContent = image.alt ? t("altTextAdded") : t("altTextMissing");
    if (!image.alt) {
      altState.classList.add("is-missing-alt");
    }
    const originalSize = document.createElement("span");
    originalSize.textContent = t("originalSizeLabel", {
      size: formatImageSize(image.originalSizeBytes),
    });
    const exportSize = document.createElement("span");
    exportSize.textContent = t("exportSizeLabel", {
      size: formatImageSize(image.validation?.sizeBytes),
    });
    if (image.validation?.tooBig) {
      exportSize.classList.add("is-too-large");
    }
    const exportDimensions = document.createElement("span");
    exportDimensions.textContent = t("exportDimensionsLabel", {
      width: image.validation?.width || image.width || 0,
      height: image.validation?.height || image.height || 0,
    });
    if (image.validation?.exceedsDimensions) {
      exportDimensions.classList.add("is-too-large");
    }
    meta.append(name, altState, originalSize, exportSize, exportDimensions);

    const tools = document.createElement("div");
    tools.className = "segment-image-tools";

    const toolConfigs = [
      {
        className: `segment-image-tool${imageIndex === 0 ? " is-disabled" : ""}`,
        icon: "M15 6l-6 6 6 6-1.4 1.4L6.2 12l7.4-7.4z",
        label: t("moveImageLeft"),
        handler: () => moveSegmentImage(segmentIndex, imageIndex, -1),
      },
      {
        className: `segment-image-tool${imageIndex === images.length - 1 ? " is-disabled" : ""}`,
        icon: "M9 6l1.4-1.4 7.4 7.4-7.4 7.4L9 18l6-6z",
        label: t("moveImageRight"),
        handler: () => moveSegmentImage(segmentIndex, imageIndex, 1),
      },
      {
        className: `segment-image-tool${!image.alt ? " danger" : ""}`,
        icon: "M4 16.75V20h3.25L18.4 8.84l-3.24-3.24L4 16.75zm14.71-9.04a1 1 0 0 0 0-1.42l-1-1a1 1 0 0 0-1.42 0l-.88.88 3.24 3.24.06-.06z",
        label: t("editAltTextButton"),
        handler: () => openAltTextDialog(segmentIndex, imageIndex),
      },
      {
        className: `segment-image-tool${image.validation?.tooBig ? " danger" : ""}`,
        icon: "M3 5h18v14H3V5zm2 2v10h14V7H5zm2 8 2.5-3 2 2.5 3-4L19 15H7z",
        label: t("editImageButton"),
        handler: () => void openImageEditorDialog(segmentIndex, imageIndex),
      },
      {
        className: "segment-image-tool danger",
        icon: "M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z",
        label: t("deleteImageButton"),
        handler: () => deleteSegmentImage(segmentIndex, imageIndex),
      },
    ];

    toolConfigs.forEach((config) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = config.className;
      button.setAttribute("aria-label", config.label);
      button.title = config.label;
      button.innerHTML = createIconSvg(config.icon);
      button.addEventListener("click", config.handler);
      tools.appendChild(button);
    });

    card.append(preview, meta, tools);
    container.appendChild(card);
  });
}

function renderSegments(options = {}) {
  const { preserveOverrides = Boolean(segmentOverrides) } = options;
  const text = sourceText.value;
  const useCounters = counterToggle.checked;
  appendThreadEmoji = threadEmojiToggle.checked;
  currentComposedText = buildComposedText(text);
  const generatedSegments = currentComposedText.trim() ? splitIntoSegments(currentComposedText, useCounters, appendThreadEmoji) : [];
  activeSegments = preserveOverrides ? (normalizeSegmentOverrides(segmentOverrides) || generatedSegments) : generatedSegments;
  segmentOverrides = preserveOverrides ? normalizeSegmentOverrides(activeSegments) : null;
  syncSegmentImages(activeSegments.length);

  characterCount.textContent = t("charCount", { count: text.length });

  if (!text.trim()) {
    segmentSummary.textContent = t("summarySingle");
  } else if (activeSegments.length > 1) {
    segmentSummary.textContent = t("summaryMultiple", { count: activeSegments.length });
  } else {
    segmentSummary.textContent = t("summarySingle");
  }

  segmentsPane.hidden = activeSegments.length === 0;
  segmentsList.innerHTML = "";

  activeSegments.forEach((segment, index) => {
    const fragment = segmentTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".segment-card");
    const indexLabel = fragment.querySelector(".segment-index");
    const lengthLabel = fragment.querySelector(".segment-length");
    const textarea = fragment.querySelector(".segment-text");
    const addImagesButton = fragment.querySelector(".segment-add-image-button");
    const imageContainer = fragment.querySelector(".segment-images");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.className = "is-hidden";

    card.style.animationDelay = `${index * 55}ms`;
    indexLabel.textContent = t("segmentPart", { index: index + 1 });
    lengthLabel.textContent = `${segment.length}/${MAX_POST_LENGTH}`;
    textarea.value = segment;
    textarea.addEventListener("input", () => {
      activeSegments[index] = textarea.value;
      segmentOverrides = normalizeSegmentOverrides(activeSegments);
      setComposerLocked(true);
      lengthLabel.textContent = `${textarea.value.length}/${MAX_POST_LENGTH}`;
      if (textarea.value.length > MAX_POST_LENGTH) {
        lengthLabel.style.color = "var(--danger)";
      } else {
        lengthLabel.style.color = "var(--muted)";
      }
      autoSizeTextarea(textarea);
      updatePublishAvailability();
      queueDraftSave();
    });
    addImagesButton.textContent = t("addImagesButton");
    addImagesButton.hidden = (segmentImages[index]?.length || 0) >= MAX_IMAGES_PER_SEGMENT;
    addImagesButton.addEventListener("click", () => {
      input.click();
    });
    input.addEventListener("change", async (event) => {
      await handleSegmentImageSelection(index, event.target.files);
      event.target.value = "";
    });
    card.appendChild(input);
    renderSegmentImages(imageContainer, index);

    segmentsList.appendChild(fragment);
    autoSizeTextarea(segmentsList.lastElementChild.querySelector(".segment-text"));
  });

  updatePublishAvailability();
}

async function hydrateAppState() {
  try {
    const browserLocale = detectBrowserLocale();
    const [state, savedArchiveSession, savedArchiveCatalog] = await Promise.all([
      sendToServiceWorker("GET_APP_STATE", { browserLocale }),
      sendToServiceWorker("GET_ARCHIVE_SESSION", {}, { timeoutMs: 30000 }).catch(() => null),
      sendToServiceWorker("GET_ARCHIVE_CATALOG", {}, { timeoutMs: 120000 }).catch(() => null),
    ]);
    localePreference = state.localePreference || "auto";
    tipsVisible = state.tipsVisible !== false;
    altTextRequired = state.altTextRequired !== false;
    themeMode = state.themeMode === "dark" ? "dark" : "light";
    hashtags = normalizeHashtagEntries(state.hashtags);
    selectedHashtags = normalizeSelectedHashtagEntries(state.selectedHashtags, hashtags);
    hashtagPlacement = state.hashtagPlacement === "last" ? "last" : "first";
    segmentImages = normalizeSegmentImages(state.segmentImages);
    segmentOverrides = normalizeSegmentOverrides(state.segmentOverrides);
    appendThreadEmoji = state.appendThreadEmoji === true;
    setComposerLocked(Boolean(segmentOverrides));
    postingHistory = normalizePostingHistory(state.postingHistory);
    archiveSession = savedArchiveSession || null;
    archiveCatalog = savedArchiveCatalog ? normalizeImportedArchiveCatalog(savedArchiveCatalog) : null;
    currentLocale = localePreference === "auto"
      ? (browserLocale || DEFAULT_LOCALE)
      : state.locale || browserLocale || DEFAULT_LOCALE;
    identifierField.value = state.identifier || "";
    sourceText.value = state.draft || "";
    authAccount = state.handle || state.identifier || null;
    passwordField.value = "";
    logoutButton.hidden = !state.authenticated;
    hashtagPlacementSelect.value = hashtagPlacement;
    threadEmojiToggle.checked = appendThreadEmoji;
    applyArchivePreferences(state.archivePreferences || {});
    syncArchiveTransientNoticeFromCatalog();
    applyTranslations();
    if (segmentImages.some((images) => (images || []).length > 0)) {
      scheduleImageValidation();
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

function queueDraftSave() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(async () => {
    try {
      await sendToServiceWorker("SAVE_DRAFT", {
        draft: sourceText.value,
        segmentImages,
        segmentOverrides,
      });
    } catch (error) {
      console.error(error);
      setStatus(error.message, "error");
    }
  }, 250);
}

async function persistLocale(locale) {
  localePreference = locale;
  currentLocale = locale === "auto" ? detectBrowserLocale() : locale;
  languageSelect.value = localePreference;
  applyTranslations();
  await persistSettings();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (authAccount) {
    return;
  }

  try {
    setBusy(loginButton, true, t("loginBusy"), t("loginButton"));
    const identifier = identifierField.value.trim();
    const appPassword = passwordField.value.trim();

    const result = await sendToServiceWorker("LOGIN", {
      identifier,
      appPassword,
    });

    passwordField.value = "";
    logoutButton.hidden = false;
    authAccount = result.handle || result.identifier;
    updateStatusForAuth();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    setBusy(loginButton, false, t("loginBusy"), t("loginButton"));
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await sendToServiceWorker("LOGOUT");
    await clearArchiveSession().catch(() => {});
    logoutButton.hidden = true;
    authAccount = null;
    updateAuthButtons();
    setStatus(t("statusLoggedOut"));
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
});

publishButton.addEventListener("click", async () => {
  const baseText = sourceText.value.trim();

  if (!baseText) {
    setStatus(t("statusNeedText"), "error");
    return;
  }

  const segments = getSegmentPayloads();

  if (segments.some((entry) => !entry.text)) {
    setStatus(t("statusEmptySegments"), "error");
    return;
  }

  if (segments.some((entry) => entry.text.length > MAX_POST_LENGTH)) {
    setStatus(t("statusSegmentTooLong"), "error");
    return;
  }

  if (altTextRequired && segments.some((entry) => entry.images.some((image) => !String(image.alt || "").trim()))) {
    setStatus(t("statusAltTextRequired"), "error");
    return;
  }

  if (segments.some((entry) => entry.images.some((image) => image.validation?.tooBig))) {
    setStatus(t("statusImageTooLarge"), "error");
    showErrorDialog(t("statusImageTooLarge"));
    return;
  }

  if (!navigator.onLine) {
    setStatus(t("statusOfflineBeforePublish"), "error");
    showErrorDialog(t("statusOfflineBeforePublish"));
    return;
  }

  try {
    setBusy(publishButton, true, t("publishBusy"), t("publishButton"));
    showProgressDialog(t("progressTitle"), t("progressCheckingConnectivity"));
    await sendToServiceWorker("CHECK_CONNECTIVITY");
    showProgressDialog(t("progressTitle"), t("progressPreparing"));
    const preparedSegments = [];
    for (const [segmentIndex, segment] of segments.entries()) {
      showProgressDialog(
        t("progressTitle"),
        t("progressPreparingSegment", { index: segmentIndex + 1, count: segments.length }),
      );
      const preparedImages = [];
      for (const [imageIndex, image] of segment.images.entries()) {
        showProgressDialog(
          t("progressTitle"),
          t("progressPreparingImage", {
            image: imageIndex + 1,
            imageCount: segment.images.length,
            index: segmentIndex + 1,
          }),
        );
        const rendered = await renderImageToBlob(image);
        if (rendered.blob.size > IMAGE_BLOB_LIMIT) {
          image.validation = { sizeBytes: rendered.blob.size, tooBig: true };
          renderSegments({ preserveOverrides: true });
          throw new Error(t("statusImageTooLarge"));
        }
        preparedImages.push({
          blob: new File([rendered.blob], image.name || "image.jpg", { type: rendered.blob.type || image.type || "image/jpeg" }),
          alt: image.alt || "",
          width: rendered.width,
          height: rendered.height,
        });
      }
      preparedSegments.push({
        text: segment.text,
        images: preparedImages,
      });
    }
    const result = await sendToServiceWorker("PUBLISH_THREAD", { segments: preparedSegments }, {
      onProgress(progress) {
        showProgressDialog(t("progressTitle"), progress.message || t("progressUploading"));
      },
    });
    hideProgressDialog();
    await recordPublishedThread(result, preparedSegments);
    setStatus(result.posts.length === 1 ? t("statusPublishedOne") : t("statusPublishedMany", { count: result.posts.length }));
    showPublishResult(result);
  } catch (error) {
    console.error(error);
    const message = buildPublishErrorMessage(error);
    setStatus(message, "error");
    hideProgressDialog();
    showErrorDialog(message);
  } finally {
    hideProgressDialog();
    setBusy(publishButton, false, t("publishBusy"), t("publishButton"));
  }
});

sourceText.addEventListener("input", () => {
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  queueDraftSave();
});
counterToggle.addEventListener("change", () => {
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  queueDraftSave();
});
threadEmojiToggle.addEventListener("change", () => {
  appendThreadEmoji = threadEmojiToggle.checked;
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  void persistSettings();
  queueDraftSave();
});

clearButton.addEventListener("click", async () => {
  sourceText.value = "";
  activeSegments = [];
  segmentImages = [];
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });

  try {
    await sendToServiceWorker("SAVE_DRAFT", { draft: "", segmentImages: [], segmentOverrides: null });
    await persistSettings();
    setStatus(t("clearConfirm"));
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
});

settingsButton.addEventListener("click", () => {
  setUpdateStatus("", false);
  setBackupStatus("");
  settingsDialog.showModal();
});

historyButton.addEventListener("click", () => {
  renderHistoryList();
  historyDialog.showModal();
});

archiveButton.addEventListener("click", () => {
  showArchiveWorkspace();
});

archiveBackButton.addEventListener("click", () => {
  showComposerWorkspace();
});

archiveScopeSelect.addEventListener("change", () => {
  updateArchiveScopeFields();
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveContentModeSelect.addEventListener("change", () => {
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveBandSizeSelect.addEventListener("change", () => {
  updateArchiveSummary();
  void persistArchivePreferences();
});

archiveImageSizeSelect.addEventListener("change", () => {
  void persistArchivePreferences();
});

archiveMetricsToggle.addEventListener("change", () => {
  void persistArchivePreferences();
});

archiveThreadsToggle.addEventListener("change", () => {
  updateArchiveSummary();
  void persistArchivePreferences();
});

if (archivePdfIndentToggle) {
  archivePdfIndentToggle.addEventListener("change", () => {
    void persistArchivePreferences();
  });
}

archiveLivePreviewToggle.addEventListener("change", () => {
  renderArchivePreview();
  void persistArchivePreferences();
});

archiveWaveSizeSelect.addEventListener("change", () => {
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveYearInput.addEventListener("input", () => {
  if (archiveYearInput.value.trim()) {
    archiveScopeSelect.value = "year";
    updateArchiveScopeFields();
  }
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveFromInput.addEventListener("change", () => {
  archiveScopeSelect.value = "range";
  updateArchiveScopeFields();
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveToInput.addEventListener("change", () => {
  archiveScopeSelect.value = "range";
  updateArchiveScopeFields();
  invalidateArchiveCatalog();
  void persistArchivePreferences();
});

archiveNextWaveButton.addEventListener("click", async () => {
  try {
    archiveCatalog = null;
    setBusy(archiveNextWaveButton, true, t("archiveWorkingButton"), t("archiveNextWaveButton"));
    await ensureArchiveCatalogLoaded(false);
    renderArchiveWorkspace();
  } catch (error) {
    console.error(error);
    showErrorDialog(error.message || t("archiveExportFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(archiveNextWaveButton, false, t("archiveWorkingButton"), t("archiveNextWaveButton"));
  }
});

archivePauseButton.addEventListener("click", () => {
  void setArchiveRunControl("pause");
});

archiveResumeButton.addEventListener("click", () => {
  void setArchiveRunControl("resume");
});

archiveCancelButton.addEventListener("click", () => {
  void setArchiveRunControl("cancel");
});

archiveExportZipButton.addEventListener("click", async () => {
  try {
    setBusy(archiveExportZipButton, true, t("archiveWorkingButton"), t("archiveExportZipButton"));
    const catalog = await ensureArchiveCatalogLoaded(false);
    await exportArchiveZipFromCatalog(catalog);
  } catch (error) {
    console.error(error);
    setArchiveProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("archiveExportFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("archiveExportFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(archiveExportZipButton, false, t("archiveWorkingButton"), t("archiveExportZipButton"));
  }
});

archiveExportHtmlButton.addEventListener("click", async () => {
  try {
    setBusy(archiveExportHtmlButton, true, t("archiveWorkingButton"), t("archiveExportHtmlButton"));
    const catalog = await ensureArchiveCatalogLoaded(false);
    await exportArchiveHtmlFromCatalog(catalog);
  } catch (error) {
    console.error(error);
    setArchiveProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("archiveHtmlFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("archiveHtmlFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(archiveExportHtmlButton, false, t("archiveWorkingButton"), t("archiveExportHtmlButton"));
  }
});

archiveExportPdfButton.addEventListener("click", async () => {
  try {
    setBusy(archiveExportPdfButton, true, t("archiveWorkingButton"), t("archiveExportPdfButton"));
    const catalog = await ensureArchiveCatalogLoaded(false);
    await exportArchivePdfBandsFromCatalog(catalog);
  } catch (error) {
    console.error(error);
    setArchiveProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("archivePdfFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("archivePdfFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(archiveExportPdfButton, false, t("archiveWorkingButton"), t("archiveExportPdfButton"));
  }
});

archiveImportButton.addEventListener("click", () => {
  archiveImportInput.click();
});

archiveResetButton.addEventListener("click", async () => {
  try {
    await clearArchiveSession();
    renderArchiveWorkspace();
    setArchiveProgress({
      title: t("archiveProgressDoneTitle"),
      step: t("archiveResetDone"),
      percent: 0,
      detail: "",
    });
  } catch (error) {
    console.error(error);
    showErrorDialog(error.message || t("archiveResetFailed"), t("archiveErrorTitle"));
  }
});

archiveImportInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    setArchiveProgress({
      title: t("archiveImportingTitle"),
      step: t("archiveImportingStep"),
      percent: 40,
      detail: file.name,
    });
    archivePreviewState = null;
    activeArchiveRunId = null;
    activeArchiveRunState = "idle";
    archiveLastCheckpoint = "";
    archiveCatalog = await loadArchiveCatalogFromFile(file);
    archiveSession = {
      filterKey: "import",
      filters: null,
      waveIndex: 1,
      nextCursor: "",
      hasMore: false,
      exportedPosts: archiveCatalog.posts.length,
      exportedImages: archiveCatalog.summary.imageCount,
      updatedAt: new Date().toISOString(),
    };
    await saveArchiveSession(archiveSession);
    await saveArchiveCatalogState(archiveCatalog);
    archiveTransientNotice = t("archiveImportedNotice", {
      posts: archiveCatalog.posts.length,
      images: archiveCatalog.summary.imageCount,
    });
    renderArchiveWorkspace();
    setArchiveProgress({
      title: t("archiveProgressDoneTitle"),
      step: t("archiveImported"),
      percent: 100,
      detail: archiveTransientNotice,
    });
  } catch (error) {
    console.error(error);
    setArchiveProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("archiveImportFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("archiveImportFailed"), t("archiveErrorTitle"));
  }
});

composerUnlockButton.addEventListener("click", () => {
  segmentOverrides = null;
  setComposerLocked(false);
  sourceText.focus();
});

helpButton.addEventListener("click", () => {
  helpDialog.showModal();
  void loadReadmeContent();
});

installButton.addEventListener("click", async () => {
  if (isIosDevice()) {
    installDialog.showModal();
    return;
  }

  if (!deferredInstallPrompt) {
    updateInstallButtonVisibility();
    return;
  }

  deferredInstallPrompt.prompt();

  try {
    await deferredInstallPrompt.userChoice;
  } catch (error) {
    console.error(error);
  }

  deferredInstallPrompt = null;
  updateInstallButtonVisibility();
});

loadThreadButton.addEventListener("click", () => {
  threadImportInput.click();
});

saveThreadButton.addEventListener("click", async () => {
  try {
    await exportThreadFile();
  } catch (error) {
    console.error(error);
    setStatus(t("threadSaveFailed"), "error");
  }
});

languageSelect.addEventListener("change", async () => {
  await persistLocale(languageSelect.value);
});

tipsVisibleToggle.addEventListener("change", async () => {
  tipsVisible = tipsVisibleToggle.checked;
  updateTipsVisibility();
  await persistSettings();
});

altTextRequiredToggle.addEventListener("change", async () => {
  altTextRequired = altTextRequiredToggle.checked;
  renderSegments({ preserveOverrides: true });
  await persistSettings();
});

themeToggleButton.addEventListener("click", async () => {
  themeMode = themeMode === "dark" ? "light" : "dark";
  applyTheme();
  await persistSettings();
});

nextTipButton.addEventListener("click", () => {
  nextTip();
});

hideTipsButton.addEventListener("click", async () => {
  tipsVisible = false;
  updateTipsVisibility();
  await persistSettings();
});

hashtagForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const parsed = parseHashtagValue(hashtagInput.value);
  if (!parsed) {
    setStatus(t("hashtagInvalid"), "error");
    return;
  }

  if (!findHashtag(parsed.normalized)) {
    hashtags = [...hashtags, parsed];
  }
  if (!selectedHashtags.includes(parsed.normalized)) {
    selectedHashtags = [...selectedHashtags, parsed.normalized];
  }

  hashtagInput.value = "";
  renderHashtagCloud();
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  await persistSettings();
  setStatus(t("hashtagAdded"));
});

hashtagPlacementSelect.addEventListener("change", async () => {
  hashtagPlacement = hashtagPlacementSelect.value === "last" ? "last" : "first";
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  await persistSettings();
});

exportSettingsButton.addEventListener("click", async () => {
  try {
    await exportSettingsBackup();
  } catch (error) {
    console.error(error);
    setBackupStatus(t("backupExportFailed"), "error");
  }
});

importSettingsButton.addEventListener("click", () => {
  importSettingsInput.click();
});

clearHistoryButton.addEventListener("click", async () => {
  const confirmed = await openConfirmDialog({
    title: t("clearHistoryConfirmTitle"),
    message: t("clearHistoryConfirmText"),
  });

  if (!confirmed) {
    return;
  }

  postingHistory = [];
  renderHistoryList();
  await persistSettings();
  setStatus(t("historyCleared"));
});

importSettingsInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  event.target.value = "";

  if (!file) {
    return;
  }

  try {
    await importSettingsBackup(file);
  } catch (error) {
    console.error(error);
    setBackupStatus(error.message || t("backupImportFailed"), "error");
  }
});

threadImportInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) {
    return;
  }
  try {
    await importThreadFile(file);
  } catch (error) {
    console.error(error);
    setStatus(error.message || t("threadImportFailed"), "error");
  }
});

hashtagEditSaveButton.addEventListener("click", async () => {
  await saveEditedHashtag();
});

hashtagEditCancelButton.addEventListener("click", () => {
  closeHashtagEditDialog();
});

hashtagEditCancelTop.addEventListener("click", () => {
  closeHashtagEditDialog();
});

hashtagEditInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void saveEditedHashtag();
  }
});

hashtagEditDialog.addEventListener("close", () => {
  editingHashtagNormalized = null;
});

altTextInput.addEventListener("input", setAltTextCount);
altTextSaveButton.addEventListener("click", async () => {
  await saveAltText();
});
altTextCancelButton.addEventListener("click", () => {
  closeAltTextDialog();
});
altTextCloseTop.addEventListener("click", () => {
  closeAltTextDialog();
});
altTextDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeAltTextDialog();
});

imageZoomInput.addEventListener("input", () => {
  if (!imageEditorDraft) {
    return;
  }
  imageEditorDraft.zoom = Number(imageZoomInput.value) || 1;
  drawImageEditor();
});
imageFlipHorizontalButton.addEventListener("click", () => {
  if (!imageEditorDraft) {
    return;
  }
  imageEditorDraft.flipX = !imageEditorDraft.flipX;
  drawImageEditor();
});
imageFlipVerticalButton.addEventListener("click", () => {
  if (!imageEditorDraft) {
    return;
  }
  imageEditorDraft.flipY = !imageEditorDraft.flipY;
  drawImageEditor();
});
imageRotateLeftButton.addEventListener("click", () => {
  if (!imageEditorDraft) {
    return;
  }
  imageEditorDraft.rotation = (imageEditorDraft.rotation + 270) % 360;
  drawImageEditor();
});
imageResetButton.addEventListener("click", () => {
  resetImageEditor();
});
imageEditorSaveButton.addEventListener("click", async () => {
  await saveImageEditor();
});
imageLossyResizeButton.addEventListener("click", async () => {
  await applyLossyResize();
});
imageEditorCancelButton.addEventListener("click", () => {
  closeImageEditorDialog();
});
imageEditorCloseTop.addEventListener("click", () => {
  closeImageEditorDialog();
});
imageEditorDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeImageEditorDialog();
});
errorDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  errorDialog.close();
});
imageEditorCanvas.addEventListener("pointerdown", (event) => {
  imageEditorCanvas.setPointerCapture(event.pointerId);
  startImageEditorDrag(event);
});
imageEditorCanvas.addEventListener("pointermove", (event) => {
  updateImageEditorDrag(event);
});
imageEditorCanvas.addEventListener("pointerup", () => {
  stopImageEditorDrag();
});
imageEditorCanvas.addEventListener("pointercancel", () => {
  stopImageEditorDrag();
});

confirmDialogConfirmButton.addEventListener("click", () => {
  resolveConfirmDialog(true);
});
confirmDialogCancelButton.addEventListener("click", () => {
  resolveConfirmDialog(false);
});
confirmDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  resolveConfirmDialog(false);
});
confirmDialog.addEventListener("close", () => {
  if (confirmResolver) {
    resolveConfirmDialog(false);
  }
});

checkUpdatesButton.addEventListener("click", async () => {
  await checkForUpdates();
});

reloadAppButton.addEventListener("click", async () => {
  await performAppReload();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void verifySession({ silent: true });
  }
});

window.addEventListener("focus", () => {
  void verifySession({ silent: true });
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtonVisibility();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButtonVisibility();
});

window.matchMedia("(display-mode: standalone)").addEventListener("change", () => {
  updateInstallButtonVisibility();
});

currentLocale = detectBrowserLocale();
localePreference = "auto";
currentTipIndex = pickRandomTipIndex();
tipsVisible = true;
hashtagPlacement = "first";
languageSelect.value = localePreference;
  applyTranslations();
  updateInstallButtonVisibility();
  setStatus(t("statusPreparing"));
  registerServiceWorker();
  renderSegments();
