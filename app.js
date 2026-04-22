import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./translations.js";

const MAX_POST_LENGTH = 300;
const MANUAL_SPLIT_MARKER = "%%";
const MAX_IMAGES_PER_SEGMENT = 4;
const MAX_ALT_TEXT_LENGTH = 1000;
const IMAGE_BLOB_LIMIT = 2_000_000;
const IMAGE_EDITOR_CANVAS_WIDTH = 560;
const IMAGE_EDITOR_CANVAS_HEIGHT = 360;
const IMAGE_EXPORT_WIDTH = 1400;
const IMAGE_EXPORT_HEIGHT = Math.round((IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH) * IMAGE_EDITOR_CANVAS_HEIGHT);
const MAX_POSTING_HISTORY = 30;
const CURRENT_VERSION_INFO = {
  appVersion: "0.4.13",
  cacheVersion: "v29",
  label: "Rich text facets for tags and mentions",
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
const characterCount = document.querySelector("#character-count");
const segmentSummary = document.querySelector("#segment-summary");
const publishWarning = document.querySelector("#publish-warning");
const segmentsPane = document.querySelector("#segments-pane");
const segmentsList = document.querySelector("#segments-list");
const segmentTemplate = document.querySelector("#segment-template");
const identifierField = document.querySelector("#identifier");
const passwordField = document.querySelector("#password");

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
let hashtags = [];
let selectedHashtags = [];
let hashtagPlacement = "first";
let postingHistory = [];
let currentComposedText = "";
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
    const timeoutId = window.setTimeout(() => {
      reject(new Error(t("statusSwTimeout")));
    }, 15000);

    channel.port1.onmessage = (event) => {
      if (event.data?.progress) {
        options.onProgress?.(event.data.progress);
        return;
      }

      window.clearTimeout(timeoutId);

      if (event.data?.ok) {
        resolve(event.data.result);
        return;
      }

      reject(new Error(event.data?.error || "Unbekannter Fehler im Service Worker."));
    };

    worker.postMessage({ type, payload }, [channel.port2]);
  });
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
}

function applyDisconnectedState(showStatus = true) {
  authAccount = null;
  logoutButton.hidden = true;
  updateAuthButtons();

  if (showStatus) {
    setStatus(t("statusConnectionLost"), "error");
  }
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

function applyTranslations() {
  document.documentElement.lang = currentLocale;

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
          tooBig: Boolean(entry.validation.tooBig),
        }
      : { sizeBytes: 0, tooBig: false },
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
    const exportScale = Math.min(1, Math.max(0.35, Number(image.exportScale) || 1));
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
    tooBig: rendered.blob.size > IMAGE_BLOB_LIMIT,
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
  return {
    app: "Threadline",
    exportedAt: new Date().toISOString(),
    version: CURRENT_VERSION_INFO.appVersion,
    cacheVersion: CURRENT_VERSION_INFO.cacheVersion,
    schemaVersion: 1,
    thread: {
      sourceText: sourceText.value,
      useCounters: counterToggle.checked,
      localePreference,
      hashtagPlacement,
      hashtags,
      selectedHashtags,
      segments: getSegmentPayloads().map((segment) => ({
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

async function shareOrDownloadFile(file, fallbackName) {
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
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
      hashtags,
      selectedHashtags,
      hashtagPlacement,
      segmentImages,
      postingHistory,
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
      hashtagPlacement,
      hashtags,
      selectedHashtags,
      postingHistory,
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
  localePreference = SUPPORTED_LOCALES.includes(imported.localePreference) || imported.localePreference === "auto"
    ? imported.localePreference
    : localePreference;
  currentLocale = localePreference === "auto" ? detectBrowserLocale() : localePreference;
  languageSelect.value = localePreference;

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

function splitIntoSegments(text, withCounters) {
  const manualChunks = splitByManualMarkers(text);

  if (manualChunks.length === 0) {
    return [];
  }

  if (!withCounters) {
    return splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH);
  }

  const estimatedLength = manualChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let guess = Math.max(1, Math.ceil(estimatedLength / MAX_POST_LENGTH), manualChunks.length);

  for (let index = 0; index < 12; index += 1) {
    const reserve = reserveForCounters(guess);
    const segments = splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH - reserve);

    if (segments.length === guess) {
      return segments.map((segment, segmentIndex) => `${segment}\n${segmentIndex + 1}/${segments.length}`);
    }

    guess = segments.length;
  }

  const fallbackReserve = reserveForCounters(guess);
  const fallbackSegments = splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH - fallbackReserve);
  return fallbackSegments.map((segment, segmentIndex) => `${segment}\n${segmentIndex + 1}/${fallbackSegments.length}`);
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
    meta.append(name, altState, originalSize, exportSize);

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
  currentComposedText = buildComposedText(text);
  const generatedSegments = currentComposedText.trim() ? splitIntoSegments(currentComposedText, useCounters) : [];
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
    const state = await sendToServiceWorker("GET_APP_STATE", { browserLocale });
    localePreference = state.localePreference || "auto";
    tipsVisible = state.tipsVisible !== false;
    altTextRequired = state.altTextRequired !== false;
    hashtags = normalizeHashtagEntries(state.hashtags);
    selectedHashtags = normalizeSelectedHashtagEntries(state.selectedHashtags, hashtags);
    hashtagPlacement = state.hashtagPlacement === "last" ? "last" : "first";
    segmentImages = normalizeSegmentImages(state.segmentImages);
    segmentOverrides = normalizeSegmentOverrides(state.segmentOverrides);
    setComposerLocked(Boolean(segmentOverrides));
    postingHistory = normalizePostingHistory(state.postingHistory);
    currentLocale = localePreference === "auto"
      ? (browserLocale || DEFAULT_LOCALE)
      : state.locale || browserLocale || DEFAULT_LOCALE;
    identifierField.value = state.identifier || "";
    sourceText.value = state.draft || "";
    authAccount = state.handle || state.identifier || null;
    passwordField.value = "";
    logoutButton.hidden = !state.authenticated;
    hashtagPlacementSelect.value = hashtagPlacement;
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

  try {
    setBusy(publishButton, true, t("publishBusy"), t("publishButton"));
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
    setStatus(error.message, "error");
    hideProgressDialog();
    showErrorDialog(error.message);
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
