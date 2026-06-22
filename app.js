import { inferDefaultPostLanguages, getPostLanguageDisplayName, getPostLanguageOptions, normalizePostLanguageTags } from "./post-languages.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./translations.js";

const MAX_POST_LENGTH = 300;
const MANUAL_SPLIT_MARKER = "%%";
const MAX_IMAGES_PER_SEGMENT = 10;
const MAX_ALT_TEXT_LENGTH = 2000;
const IMAGE_BLOB_LIMIT = 2_000_000;
const IMAGE_MAX_DIMENSION = 4_000;
const IMAGE_MIN_EXPORT_SCALE = 0.05;
const IMAGE_EDITOR_CANVAS_WIDTH = 980;
const IMAGE_EDITOR_CANVAS_HEIGHT = 630;
const IMAGE_EXPORT_WIDTH = 1400;
const IMAGE_EXPORT_HEIGHT = Math.round((IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH) * IMAGE_EDITOR_CANVAS_HEIGHT);
const MAX_POSTING_HISTORY = 30;
const ARCHIVE_SCHEMA_VERSION = 1;
const AUTO_UPDATE_CHECK_INTERVAL_MS = 3 * 60 * 1000;
const DESKTOP_LAYOUT_STATE_VERSION = 2;
const DEFAULT_SIDEBAR_WIDTH_DESKTOP = 470;
const DEFAULT_COMPOSER_WIDTH_DESKTOP = 360;
const MIN_SIDEBAR_WIDTH_DESKTOP = 400;
const MAX_SIDEBAR_WIDTH_DESKTOP = 620;
const MIN_COMPOSER_WIDTH_DESKTOP = 320;
const MAX_COMPOSER_WIDTH_DESKTOP = 1120;
const LEGACY_DESKTOP_LAYOUT_SIGNATURES = new Set([
  "388|430",
  "430|388",
]);
const DEFAULT_POST_WEB_APP = "https://bsky.app";
const POST_WEB_FRONTENDS = {
  "bsky.social": "https://bsky.app",
  "bsky.app": "https://bsky.app",
  "eurosky.social": "https://mu.social",
  "mu.social": "https://mu.social",
};
const DEFAULT_POST_INTERACTION_SETTINGS = {
  replyMode: "everyone",
  allowFollowers: false,
  allowFollowing: false,
  allowMentioned: false,
  quotePostsAllowed: true,
};
const DM_ACCESS_QUERY_PARAM = "DMSECRET";
const DM_ACCESS_HASH_PARAM = "dmsecret";
const DM_ACCESS_SESSION_KEY = "threadline:dm-access";
const DM_ACCESS_GATE_ENABLED = false;
const WORKSPACE_STORAGE_KEY = "threadline:last-workspace";
const NETWORK_STAGE_SHAPE_STORAGE_KEY = "threadline:network-stage-shape";
const NETWORK_STAGE_SHAPE_ROUND = "round";
const NETWORK_STAGE_SHAPE_SQUIRCLE = "squircle";
const APP_SHARE_TITLE = "Threadline";
const APP_SHARE_URL = "https://marsrakete.github.io/threadline/";
// Replace this SHA-256 hash with the hash of your private DM secret.
const DM_ACCESS_SECRET_HASH = "12ba477603258163567c8192f456efeeea933b95307fb7033903dc637f54121a";
const CURRENT_VERSION_INFO = Object.freeze(globalThis.APP_VERSION_INFO || {
  appVersion: "0.4.159",
  cacheVersion: "v178",
  label: "Clarify image size limits",
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeStoredDesktopLayout(rawSidebarWidth, rawComposerWidth, rawLayoutVersion) {
  const parsedSidebarWidth = Number.isFinite(Number(rawSidebarWidth)) ? Number(rawSidebarWidth) : null;
  const parsedComposerWidth = Number.isFinite(Number(rawComposerWidth)) ? Number(rawComposerWidth) : null;
  const parsedLayoutVersion = Number.isFinite(Number(rawLayoutVersion)) ? Number(rawLayoutVersion) : null;
  const signature = `${parsedSidebarWidth ?? ""}|${parsedComposerWidth ?? ""}`;
  const shouldMigrateLegacyDefaults =
    parsedLayoutVersion == null &&
    LEGACY_DESKTOP_LAYOUT_SIGNATURES.has(signature);

  if (shouldMigrateLegacyDefaults) {
    return {
      sidebarWidthDesktop: DEFAULT_SIDEBAR_WIDTH_DESKTOP,
      composerWidthDesktop: DEFAULT_COMPOSER_WIDTH_DESKTOP,
      desktopLayoutVersion: DESKTOP_LAYOUT_STATE_VERSION,
    };
  }

  return {
    sidebarWidthDesktop: clampDesktopWidth(
      parsedSidebarWidth,
      MIN_SIDEBAR_WIDTH_DESKTOP,
      MAX_SIDEBAR_WIDTH_DESKTOP,
      DEFAULT_SIDEBAR_WIDTH_DESKTOP,
    ),
    composerWidthDesktop: clampDesktopWidth(
      parsedComposerWidth,
      MIN_COMPOSER_WIDTH_DESKTOP,
      MAX_COMPOSER_WIDTH_DESKTOP,
      DEFAULT_COMPOSER_WIDTH_DESKTOP,
    ),
    desktopLayoutVersion: parsedLayoutVersion ?? DESKTOP_LAYOUT_STATE_VERSION,
  };
}
const statusText = document.querySelector("#status-text");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const addAccountButton = document.querySelector("#add-account-button");
const loginDialog = document.querySelector("#login-dialog");
const loginDialogCloseTop = document.querySelector("#login-dialog-close-top");
const loginDialogCancelButton = document.querySelector("#login-dialog-cancel-button");
const loginDialogNote = document.querySelector("#login-dialog-note");
const publishButton = document.querySelector("#publish-button");
const clearButton = document.querySelector("#clear-button");
const settingsButton = document.querySelector("#settings-button");
const loadThreadButton = document.querySelector("#load-thread-button");
const helpButton = document.querySelector("#help-button");
const installButton = document.querySelector("#install-button");
const sidebarToggleButton = document.querySelector("#sidebar-toggle-button");
const sidebarToggleGlyph = document.querySelector("#sidebar-toggle-glyph");
const sidebarResizeHandle = document.querySelector("#sidebar-resize-handle");
const composerResizeHandle = document.querySelector("#composer-resize-handle");
const historyButton = document.querySelector("#history-button");
const composerButton = document.querySelector("#composer-button");
const composerLaunchNote = document.querySelector("#composer-launch-note");
const archiveButton = document.querySelector("#archive-button");
const archiveLaunchNote = document.querySelector("#archive-launch-note");
const networkButton = document.querySelector("#network-button");
const networkLaunchNote = document.querySelector("#network-launch-note");
const dmLaunchPanel = document.querySelector(".dm-launch-panel");
const dmButton = document.querySelector("#dm-button");
const dmLaunchNote = document.querySelector("#dm-launch-note");
const saveThreadButton = document.querySelector("#save-thread-button");
const settingsDialog = document.querySelector("#settings-dialog");
const publishResultDialog = document.querySelector("#publish-result-dialog");
const progressDialog = document.querySelector("#progress-dialog");
const errorDialog = document.querySelector("#error-dialog");
const historyDialog = document.querySelector("#history-dialog");
const postEditCheckDialog = document.querySelector("#post-edit-check-dialog");
const postEditCheckCloseTop = document.querySelector("#post-edit-check-close-top");
const postEditCheckCloseButton = document.querySelector("#post-edit-check-close");
const postEditCheckUrlInput = document.querySelector("#post-edit-check-url");
const postEditCheckSubmitButton = document.querySelector("#post-edit-check-submit");
const postEditCheckStatus = document.querySelector("#post-edit-check-status");
const postEditCheckResult = document.querySelector("#post-edit-check-result");
const postEditCheckCreated = document.querySelector("#post-edit-check-created");
const postEditCheckUpdated = document.querySelector("#post-edit-check-updated");
const postEditCheckOriginal = document.querySelector("#post-edit-check-original");
const postEditCheckCurrent = document.querySelector("#post-edit-check-current");
const linkCardEndpointInput = document.querySelector("#link-card-endpoint-input");
const linkCardSecretInput = document.querySelector("#link-card-secret-input");
const linkCardSettingsStatus = document.querySelector("#link-card-settings-status");
const linkCardDialog = document.querySelector("#link-card-dialog");
const linkCardCloseTop = document.querySelector("#link-card-close-top");
const linkCardCancelButton = document.querySelector("#link-card-cancel-button");
const linkCardCreateButton = document.querySelector("#link-card-create-button");
const linkCardUrlNode = document.querySelector("#link-card-url");
const linkCardWarning = document.querySelector("#link-card-warning");
const linkCardStatus = document.querySelector("#link-card-status");
const helpDialog = document.querySelector("#help-dialog");
const helpDialogEyebrow = document.querySelector("#help-dialog-eyebrow");
const helpDialogTitle = document.querySelector("#help-dialog-title");
const installDialog = document.querySelector("#install-dialog");
const hashtagEditDialog = document.querySelector("#hashtag-edit-dialog");
const altTextDialog = document.querySelector("#alt-text-dialog");
const imageEditorDialog = document.querySelector("#image-editor-dialog");
const imageEditorSheet = imageEditorDialog?.querySelector(".image-editor-sheet");
const confirmDialog = document.querySelector("#confirm-dialog");
const languageSelect = document.querySelector("#language-select");
const themeToggleButton = document.querySelector("#theme-toggle-button");
const resetColumnWidthsButton = document.querySelector("#reset-column-widths-button");
const themeStatusNote = document.querySelector("#theme-status-note");
const versionLabel = document.querySelector("#version-label");
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
const shareAppButton = document.querySelector("#share-app-button");
const shareQrImage = document.querySelector("#share-qr-image");
const shareUrl = document.querySelector("#share-url");
const shareStatus = document.querySelector("#share-status");
const clearHistoryButton = document.querySelector("#clear-history-button");
const hashtagEditInput = document.querySelector("#hashtag-edit-input");
const hashtagEditSaveButton = document.querySelector("#hashtag-edit-save-button");
const hashtagEditCancelButton = document.querySelector("#hashtag-edit-cancel-button");
const hashtagEditCancelTop = document.querySelector("#hashtag-edit-cancel-top");
const altTextInput = document.querySelector("#alt-text-input");
const altTextCount = document.querySelector("#alt-text-count");
const altTextPreviewWrap = document.querySelector("#alt-text-preview-wrap");
const altTextPreviewCanvas = document.querySelector("#alt-text-preview-canvas");
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
const imageFitDimensionsButton = document.querySelector("#image-fit-dimensions-button");
const imageLossyResizeButton = document.querySelector("#image-lossy-resize-button");
const imageEditorStatus = document.querySelector("#image-editor-status");
const imageEditorOriginalDimensions = document.querySelector("#image-editor-original-dimensions");
const imageEditorOriginalSize = document.querySelector("#image-editor-original-size");
const imageEditorExportDimensions = document.querySelector("#image-editor-export-dimensions");
const imageEditorExportSize = document.querySelector("#image-editor-export-size");
const confirmDialogTitle = document.querySelector("#confirm-dialog-title");
const confirmDialogMessage = document.querySelector("#confirm-dialog-message");
const confirmDialogConfirmButton = document.querySelector("#confirm-dialog-confirm-button");
const confirmDialogCancelButton = document.querySelector("#confirm-dialog-cancel-button");
const threadImportInput = document.querySelector("#thread-import-input");
const archiveImportInput = document.querySelector("#archive-import-input");
const historyList = document.querySelector("#history-list");
const composerColumn = document.querySelector(".composer-column");
const hashtagsPane = document.querySelector("#hashtags-pane");
const hashtagForm = document.querySelector("#hashtag-form");
const hashtagInput = document.querySelector("#hashtag-input");
const hashtagAddButton = document.querySelector("#hashtag-add-button");
const hashtagPlacementLabel = document.querySelector("#hashtag-placement-label");
const hashtagPlacementSelect = document.querySelector("#hashtag-placement-select");
const archiveHashtagSlot = document.querySelector("#archive-hashtag-slot");
const archiveHashtagScopeWrap = document.querySelector("#archive-hashtag-scope-wrap");
const archiveHashtagScopeSelect = document.querySelector("#archive-hashtag-scope-select");
const hashtagCloud = document.querySelector("#hashtag-cloud");
const hashtagSelectionNote = document.querySelector("#hashtag-selection-note");
const archiveHashtagNote = document.querySelector("#archive-hashtag-note");
const sourceText = document.querySelector("#source-text");
const composerLockNote = document.querySelector("#composer-lock-note");
const composerUnlockButton = document.querySelector("#composer-unlock-button");
const counterToggle = document.querySelector("#counter-toggle");
const threadEmojiToggle = document.querySelector("#thread-emoji-toggle");
const markerSpacingToggle = document.querySelector("#marker-spacing-toggle");
const characterCount = document.querySelector("#character-count");
const segmentSummary = document.querySelector("#segment-summary");
const publishWarning = document.querySelector("#publish-warning");
const segmentsPane = document.querySelector("#segments-pane");
const segmentsList = document.querySelector("#segments-list");
const segmentTemplate = document.querySelector("#segment-template");
const threadIntroToggle = document.querySelector("#thread-intro-toggle");
const postSettingsButton = document.querySelector("#post-settings-button");
const postLanguagesSummary = document.querySelector("#post-languages-summary");
const postLanguagesDialog = document.querySelector("#post-languages-dialog");
const postLanguagesCloseTop = document.querySelector("#post-languages-close-top");
const postLanguagesCloseButton = document.querySelector("#post-languages-close-button");
const postLanguagesSearch = document.querySelector("#post-languages-search");
const postLanguagesSelectionNote = document.querySelector("#post-languages-selection-note");
const postLanguagesList = document.querySelector("#post-languages-list");
const postLanguagesDisclosure = document.querySelector("#post-languages-disclosure");
const postLanguagesDisclosureMeta = document.querySelector("#post-languages-disclosure-meta");
const postInteractionDisclosure = document.querySelector("#post-interaction-disclosure");
const postInteractionDisclosureMeta = document.querySelector("#post-interaction-disclosure-meta");
const replyModeEveryoneInput = document.querySelector("#reply-mode-everyone");
const replyModeNobodyInput = document.querySelector("#reply-mode-nobody");
const replyModeCustomInput = document.querySelector("#reply-mode-custom");
const replyModeInputs = [replyModeEveryoneInput, replyModeNobodyInput, replyModeCustomInput];
const replyAllowFollowersInput = document.querySelector("#reply-allow-followers");
const replyAllowFollowingInput = document.querySelector("#reply-allow-following");
const replyAllowMentionedInput = document.querySelector("#reply-allow-mentioned");
const quotePostsToggle = document.querySelector("#quote-posts-toggle");
const identifierField = document.querySelector("#identifier");
const passwordField = document.querySelector("#password");
const composerWorkspace = document.querySelector("#composer-workspace");
const archiveWorkspace = document.querySelector("#archive-workspace");
const networkWorkspace = document.querySelector("#network-workspace");
const dmWorkspace = document.querySelector("#dm-workspace");
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
const archiveThreadUrlInput = document.querySelector("#archive-thread-url-input");
const archiveThreadImportModeSelect = document.querySelector("#archive-thread-import-mode-select");
const archiveLoadThreadUrlButton = document.querySelector("#archive-load-thread-url-button");
const archiveCheckPostEditButton = document.querySelector("#archive-check-post-edit-button");
const archiveThreadUrlNote = document.querySelector("#archive-thread-url-note");
const archiveNextWaveButton = document.querySelector("#archive-next-wave-button");
const archiveExportZipButton = document.querySelector("#archive-export-zip-button");
const archiveExportHtmlButton = document.querySelector("#archive-export-html-button");
const archiveExportHtmlCompactButton = document.querySelector("#archive-export-html-compact-button");
const archiveExportPdfButton = document.querySelector("#archive-export-pdf-button");
const archiveActionsExportHtmlButton = document.querySelector("#archive-actions-export-html-button");
const archiveActionsExportHtmlCompactButton = document.querySelector("#archive-actions-export-html-compact-button");
const archiveActionsExportPdfButton = document.querySelector("#archive-actions-export-pdf-button");
const archiveImportButton = document.querySelector("#archive-import-button");
const archiveResetButton = document.querySelector("#archive-reset-button");
const archiveMediaActorInput = document.querySelector("#archive-media-actor-input");
const archiveMediaImagesToggle = document.querySelector("#archive-media-images-toggle");
const archiveMediaVideosToggle = document.querySelector("#archive-media-videos-toggle");
const archiveMediaOtherToggle = document.querySelector("#archive-media-other-toggle");
const archiveExportMediaZipButton = document.querySelector("#archive-export-media-zip-button");
const dmContactSearchInput = document.querySelector("#dm-contact-search-input");
const dmContactList = document.querySelector("#dm-contact-list");
const dmContactSelectionNote = document.querySelector("#dm-contact-selection-note");
const dmCheckButton = document.querySelector("#dm-check-button");
const dmLoadPartnersButton = document.querySelector("#dm-load-partners-button");
const dmFromInput = document.querySelector("#dm-from-input");
const dmToInput = document.querySelector("#dm-to-input");
const dmLoadButton = document.querySelector("#dm-load-button");
const dmExportJsonButton = document.querySelector("#dm-export-json-button");
const dmExportHtmlButton = document.querySelector("#dm-export-html-button");
const dmExportPdfButton = document.querySelector("#dm-export-pdf-button");
const dmProgressTitle = document.querySelector("#dm-progress-title");
const dmProgressStep = document.querySelector("#dm-progress-step");
const dmProgressFill = document.querySelector("#dm-progress-fill");
const dmProgressDetail = document.querySelector("#dm-progress-detail");
const dmSummary = document.querySelector("#dm-summary");
const dmResults = document.querySelector("#dm-results");
const archiveStartHint = document.querySelector("#archive-start-hint");
const archiveProgressTitle = document.querySelector("#archive-progress-title");
const archiveProgressStep = document.querySelector("#archive-progress-step");
const archiveRunStatusLine = document.querySelector("#archive-run-status-line");
const archiveProgressHeartbeat = document.querySelector("#archive-progress-heartbeat");
const archiveProgressFill = document.querySelector("#archive-progress-fill");
const archiveProgressDetail = document.querySelector("#archive-progress-detail");
const archiveBackgroundNotice = document.querySelector("#archive-background-notice");
const archiveLivePreviewToggle = document.querySelector("#archive-live-preview-toggle");
const archivePauseButton = document.querySelector("#archive-pause-button");
const archiveResumeButton = document.querySelector("#archive-resume-button");
const archiveCancelButton = document.querySelector("#archive-cancel-button");
const archiveProgressExportHtmlCompactButton = document.querySelector("#archive-progress-export-html-compact-button");
const archivePreviewPanel = document.querySelector("#archive-preview-panel");
const archivePreviewCard = document.querySelector("#archive-preview-card");
const archiveSummaryPosts = document.querySelector("#archive-summary-posts");
const archiveSummaryImages = document.querySelector("#archive-summary-images");
const archiveSummaryBands = document.querySelector("#archive-summary-bands");
const archiveResults = document.querySelector("#archive-results");
const archiveSpecContent = document.querySelector("#archive-spec-content");
const networkSearchInput = document.querySelector("#network-search-input");
const networkAccountInput = document.querySelector("#network-account-input");
const networkOwnLoadButton = document.querySelector("#network-own-load-button");
const networkAccountLoadButton = document.querySelector("#network-account-load-button");
const networkFilterButtons = Array.from(document.querySelectorAll("[data-network-filter]"));
const networkFilterCommonButton = document.querySelector("#network-filter-common");
const networkLoadButton = document.querySelector("#network-load-button");
const networkResetButton = document.querySelector("#network-reset-button");
const networkShapeToggleButton = document.querySelector("#network-shape-toggle-button");
const networkZoomOutButton = document.querySelector("#network-zoom-out-button");
const networkZoomResetButton = document.querySelector("#network-zoom-reset-button");
const networkZoomInButton = document.querySelector("#network-zoom-in-button");
const networkStageModeButton = document.querySelector("#network-stage-mode-button");
const networkStageModeFocusButton = document.querySelector("#network-stage-mode-focus-button");
const networkStageModeListsButton = document.querySelector("#network-stage-mode-lists-button");
const networkStageModeExitButton = document.querySelector("#network-stage-mode-exit-button");
const networkSortFieldSelect = document.querySelector("#network-sort-field-select");
const networkSortDirectionSelect = document.querySelector("#network-sort-direction-select");
const networkProgressLine = document.querySelector("#network-progress-line");
const networkSummaryLoaded = document.querySelector("#network-summary-loaded");
const networkSummaryMutuals = document.querySelector("#network-summary-mutuals");
const networkSummaryVisible = document.querySelector("#network-summary-visible");
const networkGrid = document.querySelector(".network-grid");
const networkCanvasPanel = document.querySelector(".network-canvas-panel");
const networkStageSvg = document.querySelector("#network-stage-svg");
const networkStageEmpty = document.querySelector("#network-stage-empty");
const networkStageHovercard = document.querySelector("#network-stage-hovercard");
const networkFocusPanel = document.querySelector("#network-focus-panel");
const networkFocusToggleButton = document.querySelector("#network-focus-toggle-button");
const networkFocusCard = document.querySelector("#network-focus-card");
const networkResults = document.querySelector("#network-results");
const networkInsightsGroupToggles = document.querySelector("#network-insights-group-toggles");
const networkInsightsGroupButtons = Array.from(document.querySelectorAll("[data-network-insights-group]"));
const networkStageCard = document.querySelector(".network-stage-card");
const networkInsightsCard = document.querySelector(".network-insights-card");
const serverPresetField = document.querySelector("#server-preset");
const customServerWrap = document.querySelector("#custom-server-wrap");
const customServerField = document.querySelector("#custom-server");
const accountSwitcherPanel = document.querySelector("#account-switcher-panel");
const accountSwitcherList = document.querySelector("#account-switcher-list");

let activeSegments = [];
let currentLocale = DEFAULT_LOCALE;
let localePreference = "auto";
let authAccount = null;
let authAccountService = "https://bsky.social";
let authAccountWebApp = DEFAULT_POST_WEB_APP;
let authAccountDid = "";
let savedAccounts = [];
let appOnline = navigator.onLine !== false;
let accountAvatarAssets = [];
let composerSegmentRenderFrame = 0;
let draftSaveTimer = null;
let serviceWorkerRegistration = null;
let updateInProgress = false;
let reloadInProgress = false;
let sessionCheckTimer = null;
let lastAutoUpdateCheckAt = 0;
let deferredInstallPrompt = null;
let segmentTextareaResizeFrame = 0;
let helpCache = {
  path: "",
  text: "",
};
let currentTipIndex = 0;
let tipsVisible = true;
let altTextRequired = true;
let themeMode = "light";
let sidebarCollapsedDesktop = false;
let sidebarWidthDesktop = DEFAULT_SIDEBAR_WIDTH_DESKTOP;
let composerWidthDesktop = DEFAULT_COMPOSER_WIDTH_DESKTOP;
let hashtags = [];
let selectedHashtags = [];
let hashtagPlacement = "first";
let archiveSelectedHashtags = [];
let archiveHashtagScope = "thread";
let postingHistory = [];
let currentComposedText = "";
let selectedPostLanguages = [];
let appendThreadIntro = false;
let appendThreadEmoji = false;
let addMarkerSpacing = false;
let replyMode = DEFAULT_POST_INTERACTION_SETTINGS.replyMode;
let replyAllowFollowers = DEFAULT_POST_INTERACTION_SETTINGS.allowFollowers;
let replyAllowFollowing = DEFAULT_POST_INTERACTION_SETTINGS.allowFollowing;
let replyAllowMentioned = DEFAULT_POST_INTERACTION_SETTINGS.allowMentioned;
let quotePostsAllowed = DEFAULT_POST_INTERACTION_SETTINGS.quotePostsAllowed;
let segmentOverrides = null;
let composerLocked = false;
let backupStatusTimer = null;
let shareStatusTimer = null;
let editingHashtagNormalized = null;
let segmentImages = [];
let segmentLinkCards = [];
let segmentImageDragState = null;
let pendingLinkCardSegmentIndex = -1;
let pendingLinkCardUrl = "";
let editingAltTarget = null;
let editingImageTarget = null;
let imageEditorSourceBitmap = null;
let imageEditorDraft = null;
let imageEditorDragging = false;
let imageEditorDragStart = null;
let imageEditorMetricsTimer = null;
let imageEditorMetricsRequestId = 0;
let confirmResolver = null;
let ignoreNextConfirmClose = false;
let imageValidationToken = 0;
let currentWorkspace = "composer";
let archiveCatalog = null;
let archiveJobState = null;
let dmCatalog = null;
let dmRecentContacts = [];
let dmRecentConversations = [];
let dmRecentContactAssets = [];
let dmPartnerCacheAccountDid = "";
let dmPartnerCacheUpdatedAt = "";
let dmSelectedParticipantDids = [];
let dmJobState = {
  title: "",
  step: "",
  percent: 0,
  detail: "",
};
let dmAccessChecked = false;
let dmAccessUnlocked = false;
let archiveSession = null;
let activeArchiveRunId = null;
let activeArchiveRunState = "idle";
let archivePreviewState = null;
let archiveLastCheckpoint = "";
let archiveLastProgressAt = "";
let archiveTransientNotice = "";
let networkAccountDid = "";
let networkViewerProfile = null;
let networkNodes = new Map();
let networkFollowerCursor = "";
let networkFollowCursor = "";
let networkHasMoreFollowers = false;
let networkHasMoreFollows = false;
let networkLoading = false;
let networkFilterMode = "all";
let networkSearchQuery = "";
let networkSelectedDid = "";
let networkStatusLine = "";
let networkWaveIndex = 0;
let networkFocusDetails = new Map();
let networkFocusLoadingDid = "";
let networkStageSlots = new Map();
let networkStageRelationCounts = {
  mutual: 0,
  followers: 0,
  following: 0,
  other: 0,
};
let networkStageZoom = 1;
let networkStagePanX = 0;
let networkStagePanY = 0;
let networkStageDrag = null;
let networkStageFitAll = true;
let networkStageShape = getStoredNetworkStageShape();
let networkHoveredDid = "";
let networkFocusPreviewTab = "followers";
let networkFocusCollapsed = false;
let networkStageMode = false;
let networkStageModeFocusVisible = false;
let networkStageModeListsVisible = false;
let networkSortField = "displayName";
let networkSortDirection = "asc";
let networkInsightsStageGroup = "mutual";
let networkResultsScrollTop = 0;
let networkResultsRestorePending = false;
let networkCommonMutualsTargetDid = "";
let networkCommonMutualsDids = new Set();
let networkCommonMutualsLoadingDid = "";
let networkCommonMutualsHasMore = false;
let workspaceRestorePending = true;
let appStateHydrated = false;
const NETWORK_STAGE_MIN_ZOOM = 0.42;
const NETWORK_STAGE_MAX_ZOOM = 5.6;
const LOGIN_SERVICE_PRESETS = {
  "bsky.social": "https://bsky.social",
  "eurosky.social": "https://eurosky.social",
  "mu.social": "https://mu.social",
};
const DESKTOP_LAYOUT_MEDIA = window.matchMedia("(min-width: 981px)");
const VALID_HASHTAG_PLACEMENTS = new Set(["first", "last", "all-top", "all-bottom"]);

applyDesktopLayoutState();
applySidebarState();

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setStatus(t("statusNoSupport"));
    return;
  }

  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("reload", String(Date.now()));
      window.location.replace(nextUrl.toString());
    });

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
    throw new Error(t("statusNoWorker"));
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

      const errorCode = String(event.data?.details?.code || "");
      const localizedServiceWorkerErrors = {
        POST_EDIT_URL_INVALID: "postEditCheckInvalidUrl",
        POST_EDIT_ACTOR_NOT_FOUND: "postEditCheckActorNotFound",
        POST_EDIT_RECORD_LOAD_FAILED: "postEditCheckLoadFailed",
        POST_EDIT_RECORD_INVALID: "postEditCheckRecordInvalid",
      };
      const errorMessage = errorCode === "ARCHIVE_ASSET_LOAD_FAILED"
        ? t("archiveAssetLoadFailed", { status: event.data?.details?.status || "?" })
        : localizedServiceWorkerErrors[errorCode]
        ? t(localizedServiceWorkerErrors[errorCode])
        : event.data?.error || t("statusSwUnknownError");
      const error = new Error(errorMessage);
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

function localizeLoginErrorMessage(error) {
  const errorCode = String(error?.details?.code || "");
  const localizedErrorKeys = {
    AUTH_INVALID_CREDENTIALS: "statusLoginFailedInvalidCredentials",
    LOGIN_MISSING_CREDENTIALS: "statusLoginFailedMissingCredentials",
    CONNECTIVITY_FAILED: "statusLoginFailedConnection",
    CONNECTIVITY_TIMEOUT: "statusLoginFailedConnection",
    INSECURE_SERVICE_URL: "statusLoginFailedInsecureService",
    LOGIN_MU_PDS_RESOLUTION_FAILED: "statusLoginFailedMuPdsResolution",
  };
  if (localizedErrorKeys[errorCode]) {
    return t(localizedErrorKeys[errorCode]);
  }

  const raw = String(error?.message || "").trim();
  const normalized = raw.toLowerCase();

  if (!normalized) {
    return t("statusLoginFailedGeneric");
  }

  if (
    normalized.includes("invalid identifier or password")
    || normalized.includes("invalid login credentials")
    || normalized.includes("authentication required")
  ) {
    return t("statusLoginFailedInvalidCredentials");
  }

  if (
    normalized.includes("app-password are required")
    || normalized.includes("identifier and app password are required")
  ) {
    return t("statusLoginFailedMissingCredentials");
  }

  if (normalized.includes("could not connect to bluesky")) {
    return t("statusLoginFailedConnection");
  }

  if (normalized.includes("insecure service urls are not allowed") || normalized.includes("please use https")) {
    return t("statusLoginFailedInsecureService");
  }

  if (normalized.includes("bluesky error: 401")) {
    return t("statusLoginFailedInvalidCredentials");
  }

  return raw;
}

function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.style.color = tone === "error" ? "var(--danger)" : "var(--text)";
}

function setBusy(button, isBusy, busyLabel, idleLabel) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : idleLabel;
}

function normalizeServiceUrl(value) {
  const preset = LOGIN_SERVICE_PRESETS[String(value || "").trim()];
  let url = preset || String(value || "").trim();

  if (!url) {
    return LOGIN_SERVICE_PRESETS["bsky.social"];
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const normalized = new URL(url);
    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    if (normalized.pathname.endsWith("/xrpc")) {
      normalized.pathname = normalized.pathname.slice(0, -5);
    }
    normalized.search = "";
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return url.replace(/\/+$/, "");
  }
}

function getSelectedLoginService() {
  if (serverPresetField.value === "custom") {
    return normalizeServiceUrl(customServerField.value);
  }

  return normalizeServiceUrl(serverPresetField.value);
}

function getPostTargetName(webApp = authAccountWebApp) {
  try {
    return new URL(normalizeServiceUrl(webApp)).hostname.toLowerCase() === "mu.social"
      ? "Mu.social"
      : "Bluesky";
  } catch {
    return "Bluesky";
  }
}

function getPublishButtonLabel() {
  return t("publishButtonTarget", { target: getPostTargetName() });
}

function getPublishBusyLabel() {
  return t("publishBusyTarget", { target: getPostTargetName() });
}

function applyLoginServiceSelection(serviceUrl = LOGIN_SERVICE_PRESETS["bsky.social"]) {
  const normalized = normalizeServiceUrl(serviceUrl);
  const presetEntry = Object.entries(LOGIN_SERVICE_PRESETS).find(([, url]) => normalizeServiceUrl(url) === normalized);

  if (presetEntry) {
    serverPresetField.value = presetEntry[0];
    customServerWrap.hidden = true;
    customServerField.value = "";
    return;
  }

  serverPresetField.value = "custom";
  customServerWrap.hidden = false;
  customServerField.value = normalized;
}

function setLoginDialogNote(message = "", tone = "neutral") {
  loginDialogNote.hidden = !message;
  loginDialogNote.textContent = message;
  loginDialogNote.style.color = tone === "error" ? "var(--danger)" : "var(--muted)";
}

function openLoginDialog(options = {}) {
  const account = options.account || null;
  identifierField.value = options.identifier ?? account?.identifier ?? account?.handle ?? "";
  passwordField.value = "";
  applyLoginServiceSelection(
    options.service
    || (account?.webApp === LOGIN_SERVICE_PRESETS["mu.social"] ? account.webApp : account?.service)
    || LOGIN_SERVICE_PRESETS["bsky.social"],
  );
  setLoginDialogNote(options.note || "", options.tone || "neutral");
  if (!loginDialog.open) {
    loginDialog.showModal();
  }
  window.setTimeout(() => {
    if (identifierField.value) {
      passwordField.focus();
    } else {
      identifierField.focus();
    }
  }, 0);
}

function closeLoginDialog() {
  setLoginDialogNote("");
  passwordField.value = "";
  if (loginDialog.open) {
    loginDialog.close();
  }
}

function getAccountInitials(account) {
  const source = String(account?.handle || account?.identifier || "?").replace(/^@/, "");
  return source.slice(0, 2).toUpperCase();
}

function getProfileInitials(profile) {
  const source = String(profile?.displayName || profile?.handle || profile?.identifier || "?").replace(/^@/, "").trim();
  return source.slice(0, 2).toUpperCase();
}

function getProfileLabel(profile) {
  const name = String(profile?.displayName || profile?.handle || profile?.did || "").trim();
  const handle = String(profile?.handle || "").trim();
  if (name && handle && name.toLowerCase() !== handle.toLowerCase()) {
    return `${name} @${handle}`;
  }
  if (handle) {
    return `@${handle}`;
  }
  return name || String(profile?.did || "").trim();
}

function getKnownNetworkProfile(did) {
  const actorDid = String(did || "").trim();
  if (!actorDid) {
    return null;
  }
  if (actorDid === networkViewerProfile?.did) {
    return networkViewerProfile;
  }
  const direct = networkNodes.get(actorDid);
  if (direct) {
    return direct;
  }
  for (const detail of networkFocusDetails.values()) {
    if (detail?.profile?.did === actorDid) {
      return detail.profile;
    }
    const previewHit = [...(detail?.followersPreview || []), ...(detail?.followsPreview || [])]
      .find((entry) => entry?.did === actorDid);
    if (previewHit) {
      return previewHit;
    }
  }
  return null;
}

function resetNetworkState() {
  networkAccountDid = networkAccountDid || authAccountDid || "";
  networkViewerProfile = null;
  networkNodes = new Map();
  networkFollowerCursor = "";
  networkFollowCursor = "";
  networkHasMoreFollowers = false;
  networkHasMoreFollows = false;
  networkLoading = false;
  networkSelectedDid = "";
  networkStatusLine = t("networkProgressIdle");
  networkWaveIndex = 0;
  networkFocusDetails = new Map();
  networkFocusLoadingDid = "";
  networkStageSlots = new Map();
  networkStageRelationCounts = {
    mutual: 0,
    followers: 0,
    following: 0,
    other: 0,
  };
  networkStageZoom = 1;
  networkStagePanX = 0;
  networkStagePanY = 0;
  networkStageDrag = null;
  networkStageFitAll = true;
  networkHoveredDid = "";
  networkFocusPreviewTab = "followers";
  clearNetworkCommonMutuals();
}

function ensureNetworkStateForAccount() {
  if (!authAccountDid) {
    resetNetworkState();
    return;
  }
  if (!networkAccountDid) {
    networkAccountDid = authAccountDid;
  }
}

function mergeNetworkNode(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      followingViewer: incoming.followingViewer === true,
      followedByViewer: incoming.followedByViewer === true,
    };
  }

  return {
    ...existing,
    ...incoming,
    handle: incoming.handle || existing.handle || "",
    displayName: incoming.displayName || existing.displayName || incoming.handle || existing.handle || "",
    avatar: incoming.avatar || existing.avatar || "",
    description: incoming.description || existing.description || "",
    followersCount: Number(incoming.followersCount) || Number(existing.followersCount) || 0,
    followsCount: Number(incoming.followsCount) || Number(existing.followsCount) || 0,
    postsCount: Number(incoming.postsCount) || Number(existing.postsCount) || 0,
    followingViewer: existing.followingViewer || incoming.followingViewer === true,
    followedByViewer: existing.followedByViewer || incoming.followedByViewer === true,
  };
}

function ingestNetworkProfiles(profiles = []) {
  profiles.forEach((profile) => {
    if (!profile?.did || profile.did === networkAccountDid) {
      return;
    }
    const existing = networkNodes.get(profile.did) || null;
    networkNodes.set(profile.did, mergeNetworkNode(existing, profile));
  });
}

function getNetworkRelationType(node) {
  if (node?.followingViewer && node?.followedByViewer) {
    return "mutual";
  }
  if (node?.followedByViewer) {
    return "followers";
  }
  if (node?.followingViewer) {
    return "following";
  }
  return "other";
}

function getNetworkRelationLabel(node) {
  const relation = getNetworkRelationType(node);
  const account = getNetworkCenterLabel();
  if (relation === "mutual") {
    return t("networkRelationMutual");
  }
  if (relation === "followers") {
    return isViewingOwnNetwork()
      ? t("networkRelationFollower")
      : t("networkRelationFollowerOther", { account });
  }
  if (relation === "following") {
    return isViewingOwnNetwork()
      ? t("networkRelationFollowing")
      : t("networkRelationFollowingOther", { account });
  }
  return t("networkRelationLoose");
}

function isViewingOwnNetwork() {
  return Boolean(authAccountDid) && Boolean(networkAccountDid) && networkAccountDid === authAccountDid;
}

function getNetworkCenterProfile() {
  return networkViewerProfile || null;
}

function getNetworkCenterLabel() {
  const profile = getNetworkCenterProfile();
  return profile?.displayName || profile?.handle || authAccount || t("networkViewerFallback");
}

function getNetworkNodeScore(node) {
  const relation = getNetworkRelationType(node);
  const relationScore = relation === "mutual" ? 120 : (relation === "followers" ? 80 : (relation === "following" ? 70 : 30));
  return relationScore
    + Math.min(80, Number(node?.followersCount) || 0)
    + Math.min(40, Math.floor((Number(node?.postsCount) || 0) / 5));
}

function getNetworkScoreBreakdown(node) {
  const relation = getNetworkRelationType(node);
  const relationScore = relation === "mutual" ? 120 : (relation === "followers" ? 80 : (relation === "following" ? 70 : 30));
  const followersScore = Math.min(80, Number(node?.followersCount) || 0);
  const postsScore = Math.min(40, Math.floor((Number(node?.postsCount) || 0) / 5));
  return {
    relationScore,
    followersScore,
    postsScore,
    total: relationScore + followersScore + postsScore,
  };
}

function getStrongNetworkScoreThreshold(nodes = getAllNetworkNodes()) {
  if (!nodes.length) {
    return 0;
  }

  const scores = nodes
    .map((node) => getNetworkNodeScore(node))
    .sort((left, right) => right - left);
  const preferredCount = Math.max(18, Math.ceil(scores.length * 0.14));
  const thresholdIndex = Math.min(scores.length - 1, preferredCount - 1);
  return Math.max(100, scores[thresholdIndex] || 0);
}

function getAllNetworkNodes() {
  return Array.from(networkNodes.values()).sort((left, right) => {
    const scoreDelta = getNetworkNodeScore(right) - getNetworkNodeScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return String(left.handle || left.displayName || "").localeCompare(String(right.handle || right.displayName || ""));
  });
}

function matchesNetworkFilter(node, filterMode = networkFilterMode, strongThreshold = getStrongNetworkScoreThreshold()) {
  const relation = getNetworkRelationType(node);
  if (filterMode === "common") {
    return getActiveNetworkCommonMutualDids().has(String(node?.did || "").trim());
  }
  if (filterMode === "mutual") {
    return relation === "mutual";
  }
  if (filterMode === "followers") {
    return relation === "followers";
  }
  if (filterMode === "following") {
    return relation === "following";
  }
  if (filterMode === "strong") {
    return getNetworkNodeScore(node) >= strongThreshold;
  }
  return true;
}

function getVisibleNetworkNodes(limit = Number.POSITIVE_INFINITY) {
  const query = String(networkSearchQuery || "").trim().toLowerCase();
  const allNodes = getAllNetworkNodes();
  const strongThreshold = getStrongNetworkScoreThreshold(allNodes);
  const nodes = allNodes
    .filter((node) => matchesNetworkFilter(node, networkFilterMode, strongThreshold))
    .filter((node) => {
      if (!query) {
        return true;
      }
      return `${node.displayName || ""} ${node.handle || ""}`.toLowerCase().includes(query);
    });

  if (!Number.isFinite(limit)) {
    return nodes;
  }
  return nodes.slice(0, Math.max(0, limit));
}

function getNetworkSortValue(node, field = networkSortField) {
  if (field === "handle") {
    return String(node?.handle || node?.did || "").trim();
  }
  return String(node?.displayName || node?.handle || node?.did || "").trim();
}

function sortNetworkNodes(nodes = []) {
  const directionFactor = networkSortDirection === "desc" ? -1 : 1;
  return [...nodes].sort((left, right) => {
    const primary = getNetworkSortValue(left).localeCompare(
      getNetworkSortValue(right),
      currentLocale || undefined,
      { sensitivity: "base" },
    );
    if (primary !== 0) {
      return primary * directionFactor;
    }
    const secondary = String(left?.handle || left?.did || "").localeCompare(
      String(right?.handle || right?.did || ""),
      currentLocale || undefined,
      { sensitivity: "base" },
    );
    if (secondary !== 0) {
      return secondary * directionFactor;
    }
    return String(left?.did || "").localeCompare(String(right?.did || "")) * directionFactor;
  });
}

function ensureNetworkStageSlot(node) {
  if (!node?.did) {
    return null;
  }

  const relation = getNetworkRelationType(node);
  const existing = networkStageSlots.get(node.did);
  if (existing && existing.relation === relation) {
    return existing;
  }

  const slot = {
    relation,
    index: networkStageRelationCounts[relation] || 0,
  };
  networkStageRelationCounts[relation] = slot.index + 1;
  networkStageSlots.set(node.did, slot);
  return slot;
}

function hasPendingNetworkDataForGroup(groupKey) {
  if (groupKey === "followers") {
    return networkHasMoreFollowers;
  }
  if (groupKey === "following") {
    return networkHasMoreFollows;
  }
  if (groupKey === "mutual") {
    return networkHasMoreFollowers || networkHasMoreFollows;
  }
  return networkHasMoreFollowers || networkHasMoreFollows;
}

async function loadMoreNetworkGroup(groupKey = "all") {
  if (!authAccount || networkLoading) {
    return;
  }

  await loadNetworkWave({
    triggerGroup: groupKey,
  });
}

function getNetworkStageViewport(layout) {
  const bounds = layout.contentBounds || {
    minX: 0,
    minY: 0,
    maxX: layout.width,
    maxY: layout.height,
  };
  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
  const fitPadding = 72;
  if (networkStageFitAll) {
    return {
      x: bounds.minX - fitPadding,
      y: bounds.minY - fitPadding,
      width: boundsWidth + (fitPadding * 2),
      height: boundsHeight + (fitPadding * 2),
      zoom: 1,
    };
  }

  const zoom = clamp(networkStageZoom, NETWORK_STAGE_MIN_ZOOM, NETWORK_STAGE_MAX_ZOOM);
  const viewWidth = layout.width / zoom;
  const viewHeight = layout.height / zoom;
  const boundsCenterX = (bounds.minX + bounds.maxX) / 2;
  const boundsCenterY = (bounds.minY + bounds.maxY) / 2;
  const baseX = boundsCenterX - (viewWidth / 2);
  const baseY = boundsCenterY - (viewHeight / 2);
  const panPaddingX = Math.max(80, viewWidth * 0.12);
  const panPaddingY = Math.max(80, viewHeight * 0.12);
  const rawPanMinX = (bounds.maxX + panPaddingX) - (baseX + viewWidth);
  const rawPanMaxX = (bounds.minX - panPaddingX) - baseX;
  const rawPanMinY = (bounds.maxY + panPaddingY) - (baseY + viewHeight);
  const rawPanMaxY = (bounds.minY - panPaddingY) - baseY;
  const panMinX = Math.min(rawPanMinX, rawPanMaxX);
  const panMaxX = Math.max(rawPanMinX, rawPanMaxX);
  const panMinY = Math.min(rawPanMinY, rawPanMaxY);
  const panMaxY = Math.max(rawPanMinY, rawPanMaxY);
  networkStagePanX = clamp(networkStagePanX, panMinX, panMaxX);
  networkStagePanY = clamp(networkStagePanY, panMinY, panMaxY);

  return {
    x: baseX + networkStagePanX,
    y: baseY + networkStagePanY,
    width: viewWidth,
    height: viewHeight,
    zoom,
  };
}

function computeNetworkStageContentBounds(layout, visibleNodes, selectedDid) {
  const padding = 28;
  let minX = layout.centerX - 64;
  let maxX = layout.centerX + 64;
  let minY = layout.centerY - 64;
  let maxY = layout.centerY + 92;

  visibleNodes.forEach((node) => {
    const point = layout.positions.get(node.did);
    if (!point) {
      return;
    }
    const relation = getNetworkRelationType(node);
    const isSelected = node.did === selectedDid;
    const radius = isSelected ? 27 : (relation === "mutual" ? 18 : 15);
    minX = Math.min(minX, point.x - radius - padding);
    maxX = Math.max(maxX, point.x + radius + padding);
    minY = Math.min(minY, point.y - radius - padding);
    maxY = Math.max(maxY, point.y + radius + padding);
  });

  if (layout.hasFocusIsland && selectedDid) {
    const focusPreviewItems = getNetworkStageFocusPreviewItems(selectedDid);
    const focusCenterX = layout.centerX;
    const focusCenterY = layout.focusCenterY;
    const focusRadius = 108;
    minX = Math.min(minX, focusCenterX - focusRadius - 70);
    maxX = Math.max(maxX, focusCenterX + focusRadius + 70);
    minY = Math.min(minY, focusCenterY - focusRadius - 58);
    maxY = Math.max(maxY, focusCenterY + focusRadius + 70);
    focusPreviewItems.forEach((entry, index) => {
      const angle = (-Math.PI / 2) + ((index / Math.max(1, focusPreviewItems.length)) * Math.PI * 2);
      const orbitRadius = 76;
      const pointX = focusCenterX + Math.cos(angle) * orbitRadius;
      const pointY = focusCenterY + Math.sin(angle) * orbitRadius;
      minX = Math.min(minX, pointX - 24);
      maxX = Math.max(maxX, pointX + 24);
      minY = Math.min(minY, pointY - 24);
      maxY = Math.max(maxY, pointY + 24);
    });
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function zoomNetworkStage(factor) {
  networkStageFitAll = false;
  networkStageZoom = clamp((networkStageZoom || 1) * factor, NETWORK_STAGE_MIN_ZOOM, NETWORK_STAGE_MAX_ZOOM);
  renderNetworkStage();
}

function zoomNetworkStageAtPoint(factor, clientX, clientY) {
  if (!networkStageSvg) {
    zoomNetworkStage(factor);
    return;
  }
  const visibleNodes = getVisibleNetworkNodes();
  const selectedDid = networkSelectedDid || getPreferredNetworkSelection(visibleNodes);
  const layout = computeNetworkLayout(visibleNodes, selectedDid);
  layout.contentBounds = computeNetworkStageContentBounds(layout, visibleNodes, selectedDid);
  const beforeViewport = getNetworkStageViewport(layout);
  const bounds = networkStageSvg.getBoundingClientRect();
  const relativeX = clamp((clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
  const relativeY = clamp((clientY - bounds.top) / Math.max(1, bounds.height), 0, 1);
  const stageX = beforeViewport.x + (beforeViewport.width * relativeX);
  const stageY = beforeViewport.y + (beforeViewport.height * relativeY);

  networkStageFitAll = false;
  const nextZoom = clamp((networkStageZoom || 1) * factor, NETWORK_STAGE_MIN_ZOOM, NETWORK_STAGE_MAX_ZOOM);
  networkStageZoom = nextZoom;

  const afterViewWidth = layout.width / nextZoom;
  const afterViewHeight = layout.height / nextZoom;
  const targetX = stageX - (afterViewWidth * relativeX);
  const targetY = stageY - (afterViewHeight * relativeY);
  const defaultCenterX = ((layout.contentBounds.minX + layout.contentBounds.maxX) / 2) - (afterViewWidth / 2);
  const defaultCenterY = ((layout.contentBounds.minY + layout.contentBounds.maxY) / 2) - (afterViewHeight / 2);
  networkStagePanX = targetX - defaultCenterX;
  networkStagePanY = targetY - defaultCenterY;

  renderNetworkStage();
}

function resetNetworkStageView() {
  networkStageFitAll = true;
  networkStageZoom = 1;
  networkStagePanX = 0;
  networkStagePanY = 0;
  renderNetworkStage();
}

function toggleNetworkStageShape() {
  networkStageShape = networkStageShape === NETWORK_STAGE_SHAPE_SQUIRCLE
    ? NETWORK_STAGE_SHAPE_ROUND
    : NETWORK_STAGE_SHAPE_SQUIRCLE;
  persistNetworkStageShapePreference(networkStageShape);
  resetNetworkStageView();
  renderNetworkWorkspace();
}

function getNetworkStageLabelCandidates(visibleNodes, selectedDid) {
  const labelCandidates = [];
  if (selectedDid) {
    labelCandidates.push(selectedDid);
  }

  visibleNodes
    .filter((node) => getNetworkRelationType(node) === "mutual")
    .slice(0, 3)
    .forEach((node) => {
      if (!labelCandidates.includes(node.did)) {
        labelCandidates.push(node.did);
      }
    });

  visibleNodes.slice(0, 2).forEach((node) => {
    if (!labelCandidates.includes(node.did)) {
      labelCandidates.push(node.did);
    }
  });

  return labelCandidates;
}

function getNetworkStageFocusPreviewItems(selectedDid) {
  const focusData = selectedDid ? networkFocusDetails.get(selectedDid) || null : null;
  if (!focusData) {
    return [];
  }

  const followers = (focusData.followersPreview || []).slice(0, 4).map((entry) => ({
    ...entry,
    previewRelation: "followers",
  }));
  const following = (focusData.followsPreview || []).slice(0, 4).map((entry) => ({
    ...entry,
    previewRelation: "following",
  }));

  return [...followers, ...following]
    .filter((entry) => entry?.did && entry.did !== selectedDid)
    .filter((entry, index, items) => items.findIndex((candidate) => candidate.did === entry.did) === index);
}

function getPreferredNetworkSelection(visibleNodes = getVisibleNetworkNodes()) {
  const selected = networkSelectedDid ? networkNodes.get(networkSelectedDid) : null;
  if (selected && visibleNodes.some((node) => node.did === selected.did)) {
    return selected.did;
  }
  return "";
}

function setNetworkSelection(did, { loadDetails = true, previewTab = "followers" } = {}) {
  const actorDid = String(did || "").trim();
  if (!actorDid) {
    return;
  }

  if (networkCommonMutualsTargetDid && networkCommonMutualsTargetDid !== actorDid) {
    clearNetworkCommonMutuals();
  }

  networkSelectedDid = actorDid;
  networkFocusPreviewTab = previewTab;
  networkFocusCollapsed = false;
  renderNetworkWorkspace();
  if (loadDetails) {
    void loadNetworkFocusDetails(actorDid);
  }
}

function clearNetworkCommonMutuals() {
  networkCommonMutualsTargetDid = "";
  networkCommonMutualsDids = new Set();
  networkCommonMutualsLoadingDid = "";
  networkCommonMutualsHasMore = false;
  if (networkFilterMode === "common") {
    networkFilterMode = "all";
  }
}

function restoreNetworkResultsScroll() {
  if (!networkResults) {
    return;
  }
  const target = Math.max(0, Number(networkResultsScrollTop) || 0);
  networkResultsRestorePending = true;
  networkResults.scrollTop = target;
  requestAnimationFrame(() => {
    if (!networkResults) {
      networkResultsRestorePending = false;
      return;
    }
    networkResults.scrollTop = target;
    requestAnimationFrame(() => {
      if (networkResults) {
        networkResults.scrollTop = target;
      }
      networkResultsRestorePending = false;
    });
  });
}

function getActiveNetworkCommonMutualDids(selectedDid = networkSelectedDid) {
  const actorDid = String(selectedDid || "").trim();
  if (!actorDid || actorDid !== networkCommonMutualsTargetDid || !networkCommonMutualsDids.size) {
    return new Set();
  }
  return new Set(networkCommonMutualsDids);
}

function setNetworkHoveredAccount(did = "") {
  networkHoveredDid = String(did || "").trim();
  if (!networkStageHovercard) {
    return;
  }

  const profile = getKnownNetworkProfile(networkHoveredDid);
  if (!profile) {
    networkStageHovercard.hidden = true;
    networkStageHovercard.textContent = "";
    return;
  }

  networkStageHovercard.hidden = false;
  networkStageHovercard.textContent = getProfileLabel(profile);
}

async function loadNetworkFocusDetails(did) {
  const actorDid = String(did || "").trim();
  if (!actorDid || networkFocusLoadingDid === actorDid) {
    return;
  }

  networkFocusLoadingDid = actorDid;
  renderNetworkWorkspace();

  try {
    const result = await sendToServiceWorker("LOAD_NETWORK_ACTOR_FOCUS", {
      actor: actorDid,
    }, {
      timeoutMs: 120000,
      onProgress(progress) {
        const step = String(progress?.step || "").trim();
        const detail = String(progress?.detail || "").trim();
        if (networkSelectedDid === actorDid) {
          const selectedProfile = networkNodes.get(actorDid) || null;
          const actorLabel = selectedProfile ? getProfileLabel(selectedProfile) : "";
          setNetworkStatus([step, actorLabel || detail].filter(Boolean).join(" · ") || t("networkFocusLoading"));
        }
      },
    });

    if (result?.profile?.did) {
      const existing = networkNodes.get(result.profile.did) || null;
      networkNodes.set(result.profile.did, mergeNetworkNode(existing, result.profile));
      networkFocusDetails.set(result.profile.did, {
        profile: result.profile,
        relationshipDates: result.relationshipDates || null,
        activityStats: result.activityStats || null,
        likeStats: result.likeStats || null,
        followersPreview: Array.isArray(result.followersPreview) ? result.followersPreview : [],
        followsPreview: Array.isArray(result.followsPreview) ? result.followsPreview : [],
      });
    }
  } catch (error) {
    console.error(error);
    if (networkSelectedDid === actorDid) {
      setNetworkStatus(error.message || t("networkFocusLoadFailed"));
    }
  } finally {
    if (networkFocusLoadingDid === actorDid) {
      networkFocusLoadingDid = "";
    }
    renderNetworkWorkspace();
  }
}

async function loadNetworkCommonMutuals(actorDid) {
  const focusDid = String(actorDid || "").trim();
  if (!focusDid || networkCommonMutualsLoadingDid === focusDid) {
    return;
  }
  const centerDid = String(networkViewerProfile?.did || networkAccountDid || authAccountDid || "").trim();
  if (!centerDid || centerDid === focusDid) {
    return;
  }

  networkCommonMutualsLoadingDid = focusDid;
  renderNetworkWorkspace();

  try {
    const result = await sendToServiceWorker("LOAD_NETWORK_COMMON_MUTUALS", {
      centerActor: centerDid,
      focusActor: focusDid,
    }, {
      timeoutMs: 420000,
      onProgress(progress) {
        const step = String(progress?.step || "").trim();
        const detail = String(progress?.detail || "").trim();
        if (networkSelectedDid === focusDid) {
          setNetworkStatus([step, detail].filter(Boolean).join(" · ") || t("networkCommonMutualsLoading"));
        }
      },
    });
    networkFilterMode = "all";
    networkSearchQuery = "";
    if (networkSearchInput) {
      networkSearchInput.value = "";
    }
    ingestNetworkProfiles(result?.commonProfiles || []);
    networkCommonMutualsTargetDid = focusDid;
    networkCommonMutualsDids = new Set(
      Array.isArray(result?.commonDids) ? result.commonDids.map((item) => String(item || "").trim()).filter(Boolean) : [],
    );
    networkCommonMutualsHasMore = false;
    networkStageFitAll = true;
    networkStageZoom = 1;
    networkStagePanX = 0;
    networkStagePanY = 0;
    setNetworkStatus(t("networkCommonMutualsLoaded", {
      count: formatCount(networkCommonMutualsDids.size),
    }));
  } catch (error) {
    console.error(error);
    clearNetworkCommonMutuals();
    setNetworkStatus(error.message || t("networkCommonMutualsLoadFailed"));
  } finally {
    if (networkCommonMutualsLoadingDid === focusDid) {
      networkCommonMutualsLoadingDid = "";
    }
    renderNetworkWorkspace();
  }
}

function getRequestedNetworkActor() {
  const typedActor = String(networkAccountInput?.value || "").trim();
  if (typedActor) {
    return typedActor;
  }
  if (networkViewerProfile?.handle) {
    return networkViewerProfile.handle;
  }
  return networkAccountDid || authAccountDid || "";
}

function getAccountVisualState(account) {
  if (!appOnline && account.hasSession) {
    return "offline";
  }
  if (account.did && account.did === authAccountDid && account.hasSession) {
    return "active";
  }

  if (account.hasSession) {
    return "available";
  }

  return "signed-out";
}

function renderAccountSwitcher() {
  accountSwitcherList.innerHTML = "";

  if (!savedAccounts.length) {
    accountSwitcherPanel.hidden = true;
    return;
  }

  accountSwitcherPanel.hidden = false;

  savedAccounts.forEach((account) => {
    const state = getAccountVisualState(account);
    const item = document.createElement("div");
    item.className = `account-chip-wrap is-${state}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "account-chip";
    button.disabled = !account.did;
    button.classList.add(`is-${state}`);
    if (!account.hasStoredPassword && !account.hasSession) {
      button.classList.add("is-needs-login");
    }

    const avatarUri = getStoredAccountAvatarUri(account);
    const avatar = document.createElement(avatarUri ? "img" : "span");
    avatar.className = "account-chip-avatar";
    if (avatarUri) {
      avatar.src = avatarUri;
      avatar.alt = account.handle || account.identifier || "account";
      avatar.loading = "lazy";
    } else {
      avatar.textContent = getAccountInitials(account);
    }

    const label = document.createElement("span");
    label.className = "account-chip-label";
    label.textContent = account.handle || account.identifier || "account";

    button.title = [
      account.handle || account.identifier || "",
      account.service || "",
      state === "offline" ? t("accountStateOffline") : "",
      state === "active" ? t("accountStateActive") : "",
      state === "available" ? t("accountStateAvailable") : "",
      state === "signed-out" ? t("accountStateSignedOut") : "",
      !account.hasStoredPassword && !account.hasSession ? t("accountNeedsLoginShort") : "",
    ].filter(Boolean).join(" · ");

    button.append(avatar, label);
    button.addEventListener("click", async () => {
      try {
        const result = await sendToServiceWorker("SWITCH_ACCOUNT", { did: account.did });
        savedAccounts = Array.isArray(result.accounts) ? result.accounts : savedAccounts;
        await restoreAccountAvatarCache();
        renderAccountSwitcher();

        if (!result.authenticated) {
          authAccount = null;
          authAccountDid = "";
          authAccountService = account.service || LOGIN_SERVICE_PRESETS["bsky.social"];
          authAccountWebApp = account.webApp || resolvePostWebBase(authAccountService);
          identifierField.value = account.identifier || account.handle || "";
          applyLoginServiceSelection(authAccountService);
          passwordField.value = "";
          updateStatusForAuth();
          const needsPassword = result.reason === "missing_password" || result.reason === "invalid_password";
          const message = result.reason === "offline"
            ? t("statusAccountOffline", { account: account.handle || account.identifier || "" })
            : result.reason === "invalid_password"
            ? t("statusAccountPasswordRejected", { account: account.handle || account.identifier || "" })
            : t("statusAccountNeedsLogin", { account: account.handle || account.identifier || "" });
          setStatus(message, "error");
          if (needsPassword) {
            openLoginDialog({
              account,
              mode: "repair",
              note: message,
              tone: "error",
            });
          }
          return;
        }

        authAccount = result.handle || result.identifier || null;
        authAccountDid = result.did || "";
        authAccountService = result.service || account.service || LOGIN_SERVICE_PRESETS["bsky.social"];
        authAccountWebApp = result.webApp || account.webApp || resolvePostWebBase(authAccountService);
        identifierField.value = result.identifier || "";
        applyLoginServiceSelection(authAccountService);
        passwordField.value = "";
        updateStatusForAuth();
        await verifySession({ silent: true });
      } catch (error) {
        console.error(error);
        setStatus(error.message, "error");
      }
    });

    const authActionButton = document.createElement("button");
    authActionButton.type = "button";
    authActionButton.className = `account-chip-action${state === "signed-out" ? " is-login" : " is-logout"}`;
    authActionButton.setAttribute("aria-label", state === "signed-out"
      ? t("accountSignInButton", { account: account.handle || account.identifier || "account" })
      : t("accountSignOutButton", { account: account.handle || account.identifier || "account" }));
    authActionButton.title = state === "signed-out"
      ? t("accountSignInButton", { account: account.handle || account.identifier || "account" })
      : t("accountSignOutButton", { account: account.handle || account.identifier || "account" });
    authActionButton.innerHTML = state === "signed-out"
      ? createIconSvg("M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zm-6 7h8v-2H4V2h8V0H4C2.9 0 2 .9 2 2v20c0 1.1.9 2 2 2z")
      : createIconSvg("M14 17l-1.4-1.4 2.6-2.6H4v-2h11.2l-2.6-2.6L14 7l5 5-5 5zM20 24h-8v-2h8V2h-8V0h8c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2z");
    authActionButton.addEventListener("click", async () => {
      try {
        if (state === "signed-out") {
          if (account.hasStoredPassword) {
            const result = await sendToServiceWorker("SWITCH_ACCOUNT", { did: account.did });
            savedAccounts = Array.isArray(result.accounts) ? result.accounts : savedAccounts;
            await restoreAccountAvatarCache();
            renderAccountSwitcher();
            if (result.authenticated) {
              authAccount = result.handle || result.identifier || null;
              authAccountDid = result.did || "";
              authAccountService = result.service || account.service || LOGIN_SERVICE_PRESETS["bsky.social"];
              authAccountWebApp = result.webApp || account.webApp || resolvePostWebBase(authAccountService);
              updateStatusForAuth();
              await verifySession({ silent: true });
              return;
            }
            const message = result.reason === "offline"
              ? t("statusAccountOffline", { account: account.handle || account.identifier || "" })
              : result.reason === "invalid_password"
              ? t("statusAccountPasswordRejected", { account: account.handle || account.identifier || "" })
              : t("statusAccountNeedsLogin", { account: account.handle || account.identifier || "" });
            setStatus(message, "error");
            if (result.reason !== "offline") {
              openLoginDialog({
                account,
                mode: "repair",
                note: message,
                tone: "error",
              });
            }
            return;
          }

          openLoginDialog({
            account,
            mode: "repair",
            note: t("statusAccountNeedsLogin", { account: account.handle || account.identifier || "" }),
            tone: "error",
          });
          return;
        }

        const result = await sendToServiceWorker("LOGOUT", { did: account.did });
        savedAccounts = Array.isArray(result.accounts) ? result.accounts : savedAccounts;
        await restoreAccountAvatarCache();
        authAccount = result.authenticated ? (result.handle || result.identifier || null) : null;
        authAccountDid = result.authenticated ? (result.did || "") : "";
        authAccountService = result.service || LOGIN_SERVICE_PRESETS["bsky.social"];
        authAccountWebApp = result.webApp || resolvePostWebBase(authAccountService);
        updateStatusForAuth();
        setStatus(t("accountSignedOutStatus", { account: account.handle || account.identifier || "account" }));
      } catch (error) {
        console.error(error);
        setStatus(error.message, "error");
      }
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "account-chip-remove";
    removeButton.setAttribute("aria-label", t("removeAccountButton", { account: account.handle || account.identifier || "account" }));
    removeButton.title = t("removeAccountButton", { account: account.handle || account.identifier || "account" });
    removeButton.innerHTML = createIconSvg("M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z");
    removeButton.addEventListener("click", async () => {
      const confirmed = await openConfirmDialog({
        title: t("removeAccountConfirmTitle"),
        message: t("removeAccountConfirmText", { account: account.handle || account.identifier || "account" }),
        confirmLabel: t("removeAccountConfirmButton"),
        cancelLabel: t("cancelButton"),
      });

      if (!confirmed) {
        return;
      }

      try {
        const result = await sendToServiceWorker("REMOVE_ACCOUNT", { did: account.did });
        savedAccounts = Array.isArray(result.accounts) ? result.accounts : [];
        await restoreAccountAvatarCache();
        authAccount = result.authenticated ? (result.handle || result.identifier || null) : null;
        authAccountDid = result.authenticated ? (result.did || "") : "";
        authAccountService = result.service || LOGIN_SERVICE_PRESETS["bsky.social"];
        authAccountWebApp = result.webApp || resolvePostWebBase(authAccountService);
        identifierField.value = result.identifier || "";
        applyLoginServiceSelection(authAccountService);
        updateStatusForAuth();
        setStatus(t("accountRemovedStatus", { account: account.handle || account.identifier || "account" }));
      } catch (error) {
        console.error(error);
        setStatus(error.message, "error");
      }
    });

    item.append(button, authActionButton, removeButton);
    accountSwitcherList.appendChild(item);
  });
}

function updateAuthButtons() {
  const isAuthenticated = Boolean(authAccount);
  addAccountButton.textContent = t("addAccountButton");
  publishButton.textContent = getPublishButtonLabel();
  composerButton.disabled = false;
  archiveButton.disabled = !isAuthenticated;
  networkButton.disabled = !isAuthenticated;
  dmButton.disabled = !isAuthenticated || !isDmAccessAvailable();
  [
    [composerButton, currentWorkspace === "composer"],
    [archiveButton, currentWorkspace === "archive"],
    [networkButton, currentWorkspace === "network"],
    [dmButton, currentWorkspace === "dm"],
  ].forEach(([button, isActive]) => {
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  composerLaunchNote.textContent = t("composerLaunchNote");
  archiveLaunchNote.textContent = isAuthenticated ? t("archiveLaunchEnabledNote") : t("archiveLaunchDisabledNote");
  networkLaunchNote.textContent = isAuthenticated ? t("networkLaunchEnabledNote") : t("networkLaunchDisabledNote");
  dmLaunchNote.textContent = isAuthenticated ? t("dmLaunchEnabledNote") : t("dmLaunchDisabledNote");
  renderAccountSwitcher();
  renderArchiveBackgroundNotice();
}

function applyDisconnectedState(showStatus = true) {
  authAccount = null;
  authAccountDid = "";
  resetNetworkState();
  updateAuthButtons();
  if (currentWorkspace === "archive" || currentWorkspace === "dm" || currentWorkspace === "network") {
    showComposerWorkspace({ persist: false });
  }

  if (showStatus) {
    setStatus(t("statusConnectionLost"), "error");
  }
}

function isArchiveHashtagContext() {
  return currentWorkspace === "archive";
}

function setElementVisibility(element, isVisible) {
  if (!element) {
    return;
  }
  element.hidden = !isVisible;
  element.setAttribute("aria-hidden", isVisible ? "false" : "true");
  element.style.display = isVisible ? "" : "none";
}

function persistWorkspacePreference(workspace) {
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, String(workspace || "composer"));
  } catch {
    // Ignore storage errors in private or restricted contexts.
  }
}

function getStoredWorkspacePreference() {
  try {
    const value = String(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || "").trim();
    return value || "composer";
  } catch {
    return "composer";
  }
}

async function enterNetworkStageMode() {
  networkStageMode = true;
  networkStageModeFocusVisible = false;
  networkStageModeListsVisible = false;
  document.body.classList.add("network-stage-mode");
  const fullscreenTarget = networkGrid || networkWorkspace || networkStageCard;
  if (document.fullscreenEnabled && !document.fullscreenElement && fullscreenTarget?.requestFullscreen) {
    try {
      await fullscreenTarget.requestFullscreen();
    } catch {
      // Fallback to app-internal stage mode only.
    }
  }
  renderNetworkWorkspace();
}

async function exitNetworkStageMode() {
  networkStageMode = false;
  networkStageModeFocusVisible = false;
  networkStageModeListsVisible = false;
  document.body.classList.remove("network-stage-mode");
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore fullscreen exit failures.
    }
  }
  renderNetworkWorkspace();
}

function persistNetworkStageShapePreference(shape) {
  try {
    const normalizedShape = shape === NETWORK_STAGE_SHAPE_SQUIRCLE
      ? NETWORK_STAGE_SHAPE_SQUIRCLE
      : NETWORK_STAGE_SHAPE_ROUND;
    window.localStorage.setItem(NETWORK_STAGE_SHAPE_STORAGE_KEY, normalizedShape);
  } catch {
    // Ignore storage errors in private or restricted contexts.
  }
}

function getStoredNetworkStageShape() {
  try {
    const value = String(window.localStorage.getItem(NETWORK_STAGE_SHAPE_STORAGE_KEY) || "").trim();
    return value === NETWORK_STAGE_SHAPE_SQUIRCLE
      ? NETWORK_STAGE_SHAPE_SQUIRCLE
      : NETWORK_STAGE_SHAPE_ROUND;
  } catch {
    return NETWORK_STAGE_SHAPE_ROUND;
  }
}

function restorePreferredWorkspaceIfPossible() {
  if (!workspaceRestorePending) {
    return;
  }
  if (!appStateHydrated) {
    return;
  }
  if (!authAccount) {
    workspaceRestorePending = false;
    if (currentWorkspace !== "composer") {
      showComposerWorkspace();
    }
    return;
  }

  const preferred = getStoredWorkspacePreference();
  if (preferred === "dm" && DM_ACCESS_GATE_ENABLED && !dmAccessChecked) {
    return;
  }

  workspaceRestorePending = false;
  if (preferred === "archive") {
    showArchiveWorkspace();
    return;
  }
  if (preferred === "network") {
    showNetworkWorkspace();
    return;
  }
  if (preferred === "dm" && isDmAccessAvailable()) {
    showDmWorkspace();
    return;
  }
  showComposerWorkspace();
}

function getDmSecretFromLocation() {
  const url = new URL(window.location.href);
  const querySecret = url.searchParams.get(DM_ACCESS_QUERY_PARAM);
  if (querySecret) {
    return querySecret.trim();
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  return String(hashParams.get(DM_ACCESS_HASH_PARAM) || "").trim();
}

function clearDmSecretFromLocation() {
  const url = new URL(window.location.href);
  url.searchParams.delete(DM_ACCESS_QUERY_PARAM);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  hashParams.delete(DM_ACCESS_HASH_PARAM);
  const nextHash = hashParams.toString();
  const nextUrl = `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ""}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function isDmAccessAvailable() {
  return !DM_ACCESS_GATE_ENABLED || dmAccessUnlocked;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function applyDmAccessGateFromLocation() {
  if (!DM_ACCESS_GATE_ENABLED) {
    dmAccessUnlocked = true;
    dmAccessChecked = true;
    window.sessionStorage.removeItem(DM_ACCESS_SESSION_KEY);
    setElementVisibility(dmLaunchPanel, true);
    const secret = getDmSecretFromLocation();
    if (secret) {
      clearDmSecretFromLocation();
    }
    renderDmWorkspace();
    updateAuthButtons();
    restorePreferredWorkspaceIfPossible();
    return;
  }

  const unlockedInSession = window.sessionStorage.getItem(DM_ACCESS_SESSION_KEY) === "1";
  const secret = getDmSecretFromLocation();
  let unlocked = unlockedInSession;

  if (!unlocked && secret) {
    try {
      unlocked = await sha256Hex(secret) === DM_ACCESS_SECRET_HASH;
    } catch (error) {
      console.error(error);
      unlocked = false;
    }
  }

  dmAccessUnlocked = unlocked;
  if (dmAccessUnlocked) {
    window.sessionStorage.setItem(DM_ACCESS_SESSION_KEY, "1");
    dmAccessChecked = true;
  } else {
    window.sessionStorage.removeItem(DM_ACCESS_SESSION_KEY);
    dmAccessChecked = false;
  }

  setElementVisibility(dmLaunchPanel, isDmAccessAvailable());
  if (!isDmAccessAvailable() && currentWorkspace === "dm") {
    showComposerWorkspace({ persist: false });
  }

  if (secret) {
    clearDmSecretFromLocation();
  }

  renderDmWorkspace();
  updateAuthButtons();
  restorePreferredWorkspaceIfPossible();
}

function assertDmAccessUnlocked() {
  if (!isDmAccessAvailable()) {
    throw new Error("Der DM-Bereich ist gesperrt.");
  }
}

function applyHashtagPaneContext() {
  if (!hashtagsPane) {
    return;
  }

  if (isArchiveHashtagContext()) {
    archiveHashtagSlot?.replaceChildren(hashtagsPane);
    hashtagsPane.classList.add("is-archive-context");
    setElementVisibility(hashtagPlacementLabel, false);
    setElementVisibility(archiveHashtagScopeWrap, true);
    setElementVisibility(archiveHashtagNote, true);
  } else {
    composerColumn?.appendChild(hashtagsPane);
    hashtagsPane.classList.remove("is-archive-context");
    setElementVisibility(hashtagPlacementLabel, true);
    setElementVisibility(archiveHashtagScopeWrap, false);
    setElementVisibility(archiveHashtagNote, false);
  }

  renderHashtagCloud();
}

function showArchiveWorkspace() {
  if (!authAccount) {
    return;
  }

  currentWorkspace = "archive";
  persistWorkspacePreference(currentWorkspace);
  composerWorkspace.hidden = true;
  networkWorkspace.hidden = true;
  dmWorkspace.hidden = true;
  archiveWorkspace.hidden = false;
  applyHashtagPaneContext();
  updateAuthButtons();
  renderArchiveWorkspace();
}

function showNetworkWorkspace() {
  if (!authAccount) {
    return;
  }

  ensureNetworkStateForAccount();
  currentWorkspace = "network";
  persistWorkspacePreference(currentWorkspace);
  composerWorkspace.hidden = true;
  archiveWorkspace.hidden = true;
  dmWorkspace.hidden = true;
  networkWorkspace.hidden = false;
  applyHashtagPaneContext();
  updateAuthButtons();
  renderNetworkWorkspace();
  if (!networkNodes.size && !networkLoading) {
    void loadNetworkWave({ silentErrors: false });
  }
}

function showDmWorkspace() {
  if (!authAccount || !isDmAccessAvailable()) {
    return;
  }

  currentWorkspace = "dm";
  persistWorkspacePreference(currentWorkspace);
  composerWorkspace.hidden = true;
  archiveWorkspace.hidden = true;
  networkWorkspace.hidden = true;
  dmWorkspace.hidden = false;
  applyHashtagPaneContext();
  updateAuthButtons();
  if (!dmRecentContacts.length || (dmPartnerCacheAccountDid && authAccountDid && dmPartnerCacheAccountDid !== authAccountDid)) {
    void restoreDmPartnerCache().then(() => {
      if (currentWorkspace === "dm") {
        renderDmWorkspace();
      }
    });
  }
  renderDmWorkspace();
}

function showComposerWorkspace(options = {}) {
  currentWorkspace = "composer";
  if (options.persist !== false) {
    persistWorkspacePreference(currentWorkspace);
  }
  archiveWorkspace.hidden = true;
  networkWorkspace.hidden = true;
  dmWorkspace.hidden = true;
  composerWorkspace.hidden = false;
  applyHashtagPaneContext();
  updateAuthButtons();
}

function setNetworkStatus(message) {
  networkStatusLine = String(message || "").trim() || t("networkProgressIdle");
  if (networkProgressLine) {
    networkProgressLine.textContent = networkStatusLine;
  }
}

function formatCount(value) {
  return new Intl.NumberFormat(currentLocale).format(Number(value) || 0);
}

function formatNetworkRelationshipDate(value) {
  const timestamp = Date.parse(String(value || "").trim());
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  return new Intl.DateTimeFormat(currentLocale, {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

function getNetworkActivityWindow(activityStats, days) {
  if (!activityStats?.windows || typeof activityStats.windows !== "object") {
    return null;
  }
  const entry = activityStats.windows[days] ?? activityStats.windows[String(days)];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  return {
    postsCount: Number(entry.postsCount) || 0,
    likesReceivedCount: Number(entry.likesReceivedCount) || 0,
  };
}

function formatNetworkActivityLastPost(value) {
  const timestamp = Date.parse(String(value || "").trim());
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  return new Intl.DateTimeFormat(currentLocale, {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

function updateNetworkFilterButtons() {
  const commonFilterAvailable = Boolean(
    networkFilterCommonButton
    && networkCommonMutualsTargetDid
    && networkCommonMutualsTargetDid === networkSelectedDid
    && networkCommonMutualsDids.size,
  );
  if (networkFilterCommonButton) {
    networkFilterCommonButton.hidden = !commonFilterAvailable;
  }
  if (!commonFilterAvailable && networkFilterMode === "common") {
    networkFilterMode = "all";
  }
  networkFilterButtons.forEach((button) => {
    if (button.hidden) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
      return;
    }
    const isActive = button.dataset.networkFilter === networkFilterMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderNetworkSummary() {
  const allNodes = getAllNetworkNodes();
  const visibleNodes = getVisibleNetworkNodes();
  const mutualCount = allNodes.filter((node) => getNetworkRelationType(node) === "mutual").length;
  networkSummaryLoaded.textContent = formatCount(allNodes.length);
  networkSummaryMutuals.textContent = formatCount(mutualCount);
  networkSummaryVisible.textContent = formatCount(visibleNodes.length);
}

function createSvgNode(tagName, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      node.setAttribute(key, String(value));
    }
  });
  return node;
}

function getNetworkOrbitAxes(radius) {
  if (networkStageShape !== NETWORK_STAGE_SHAPE_SQUIRCLE) {
    return {
      radiusX: radius,
      radiusY: radius,
      exponent: 2,
    };
  }

  return {
    radiusX: radius * 1.18,
    radiusY: radius * 0.88,
    exponent: 4.6,
  };
}

function getNetworkOrbitPoint(centerX, centerY, radius, angle) {
  const orbit = getNetworkOrbitAxes(radius);
  if (orbit.exponent <= 2.01) {
    return {
      x: centerX + Math.cos(angle) * orbit.radiusX,
      y: centerY + Math.sin(angle) * orbit.radiusY,
    };
  }

  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const power = 2 / orbit.exponent;
  return {
    x: centerX + (Math.sign(cosAngle) * Math.pow(Math.abs(cosAngle), power) * orbit.radiusX),
    y: centerY + (Math.sign(sinAngle) * Math.pow(Math.abs(sinAngle), power) * orbit.radiusY),
  };
}

function buildNetworkOrbitPath(centerX, centerY, radius) {
  const orbit = getNetworkOrbitAxes(radius);
  if (orbit.exponent <= 2.01) {
    return null;
  }

  const segmentCount = 72;
  const points = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const angle = (-Math.PI / 2) + ((index / segmentCount) * Math.PI * 2);
    points.push(getNetworkOrbitPoint(centerX, centerY, radius, angle));
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
    .concat(" Z");
}

function computeNetworkLayout(nodes, selectedDid = "") {
  const densityFactor = clamp((nodes.length - 90) / 220, 0, 1.35);
  const hasFocusIsland = Boolean(String(selectedDid || "").trim());
  const groups = {
    mutual: nodes.filter((node) => getNetworkRelationType(node) === "mutual"),
    followers: nodes.filter((node) => getNetworkRelationType(node) === "followers"),
    following: nodes.filter((node) => getNetworkRelationType(node) === "following"),
    other: nodes.filter((node) => getNetworkRelationType(node) === "other"),
  };
  const laneSpacing = 32 + Math.round(8 * densityFactor);
  const ringGap = 92 + Math.round(12 * densityFactor);
  const ringConfig = {
    mutual: { baseRadius: 176 + Math.round(10 * densityFactor), capacity: 24 },
    followers: { baseRadius: 0, capacity: 30 },
    following: { baseRadius: 0, capacity: 36 },
    other: { baseRadius: 0, capacity: 42 },
  };
  const laneCounts = {
    mutual: Math.max(1, Math.ceil(groups.mutual.length / ringConfig.mutual.capacity)),
    followers: Math.max(1, Math.ceil(groups.followers.length / ringConfig.followers.capacity)),
    following: Math.max(1, Math.ceil(groups.following.length / ringConfig.following.capacity)),
    other: Math.max(1, Math.ceil(groups.other.length / ringConfig.other.capacity)),
  };

  ringConfig.followers.baseRadius = ringConfig.mutual.baseRadius + ((laneCounts.mutual - 1) * laneSpacing) + ringGap;
  ringConfig.following.baseRadius = ringConfig.followers.baseRadius + ((laneCounts.followers - 1) * laneSpacing) + ringGap;
  ringConfig.other.baseRadius = ringConfig.following.baseRadius + ((laneCounts.following - 1) * laneSpacing) + ringGap;

  const outerRadius = ringConfig.other.baseRadius + ((laneCounts.other - 1) * laneSpacing);
  const width = Math.max(960, Math.round((outerRadius * 2) + 320));
  const height = hasFocusIsland
    ? Math.max(1040, Math.round(outerRadius + 640))
    : Math.max(880, Math.round((outerRadius * 2) + 240));
  const centerX = width / 2;
  const centerY = hasFocusIsland
    ? 350 + Math.round(34 * densityFactor)
    : Math.round(height / 2);
  const focusCenterY = hasFocusIsland
    ? Math.min(height - 190, centerY + outerRadius + (104 + Math.round(32 * densityFactor)))
    : 0;

  const positions = new Map();
  Object.entries(groups).forEach(([groupName, groupNodes]) => {
    const config = ringConfig[groupName] || ringConfig.other;
    groupNodes.forEach((node) => {
      const slot = ensureNetworkStageSlot(node);
      const absoluteIndex = slot?.index || 0;
      const lane = Math.floor(absoluteIndex / config.capacity);
      const indexWithinLane = absoluteIndex % config.capacity;
      const radius = config.baseRadius + (lane * laneSpacing);
      const angle = (-Math.PI / 2)
        + ((indexWithinLane / config.capacity) * Math.PI * 2)
        + (lane * 0.12);
      positions.set(node.did, getNetworkOrbitPoint(centerX, centerY, radius, angle));
    });
  });

  return {
    width,
    height,
    centerX,
    centerY,
    densityFactor,
    ringRadii: {
      mutual: ringConfig.mutual.baseRadius,
      followers: ringConfig.followers.baseRadius,
      following: ringConfig.following.baseRadius,
    },
    focusCenterY,
    hasFocusIsland,
    positions,
  };
}

function renderNetworkStage() {
  getAllNetworkNodes().forEach((node) => {
    ensureNetworkStageSlot(node);
  });
  const visibleNodes = getVisibleNetworkNodes();
  if (!visibleNodes.some((node) => node.did === networkHoveredDid)) {
    setNetworkHoveredAccount("");
  } else if (networkHoveredDid) {
    setNetworkHoveredAccount(networkHoveredDid);
  }
  const selectedDid = getPreferredNetworkSelection(visibleNodes);
  const stageSelectedDid = networkSelectedDid || selectedDid;
  networkStageSvg.replaceChildren();
  const hasData = visibleNodes.length > 0 || Boolean(networkViewerProfile?.did || authAccountDid);
  networkStageEmpty.hidden = hasData;

  const layout = computeNetworkLayout(visibleNodes, stageSelectedDid);
  layout.contentBounds = computeNetworkStageContentBounds(layout, visibleNodes, stageSelectedDid);
  const viewport = getNetworkStageViewport(layout);
  networkStageSvg.setAttribute("viewBox", `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`);
  const activeCommonMutualDids = getActiveNetworkCommonMutualDids(stageSelectedDid);

  const defs = createSvgNode("defs");
  const stageGlow = createSvgNode("radialGradient", { id: "network-stage-glow" });
  stageGlow.append(
    createSvgNode("stop", { offset: "0%", "stop-color": "#58caff", "stop-opacity": "0.7" }),
    createSvgNode("stop", { offset: "55%", "stop-color": "#58caff", "stop-opacity": "0.12" }),
    createSvgNode("stop", { offset: "100%", "stop-color": "#58caff", "stop-opacity": "0" }),
  );
  defs.appendChild(stageGlow);
  networkStageSvg.appendChild(defs);

  const background = createSvgNode("g");
  [
    { radius: layout.ringRadii.mutual, color: "rgba(62, 160, 221, 0.24)" },
    { radius: layout.ringRadii.followers, color: "rgba(62, 160, 221, 0.18)" },
    { radius: layout.ringRadii.following, color: "rgba(62, 160, 221, 0.12)" },
  ].forEach((entry) => {
    const orbitPath = buildNetworkOrbitPath(layout.centerX, layout.centerY, entry.radius);
    background.appendChild(createSvgNode(orbitPath ? "path" : "circle", orbitPath
      ? {
          d: orbitPath,
          fill: "none",
          stroke: entry.color,
          "stroke-width": 1.5,
        }
      : {
          cx: layout.centerX,
          cy: layout.centerY,
          r: entry.radius,
          fill: "none",
          stroke: entry.color,
          "stroke-width": 1.5,
        }));
  });
  background.appendChild(createSvgNode("circle", {
    cx: layout.centerX,
    cy: layout.centerY,
    r: 110,
    fill: "url(#network-stage-glow)",
  }));
  networkStageSvg.appendChild(background);

  const edgeLayer = createSvgNode("g");
  visibleNodes.forEach((node) => {
    const point = layout.positions.get(node.did);
    if (!point) {
      return;
    }
    const isSelected = node.did === stageSelectedDid;
    edgeLayer.appendChild(createSvgNode("line", {
      x1: layout.centerX,
      y1: layout.centerY,
      x2: point.x,
      y2: point.y,
      stroke: isSelected ? "rgba(98, 229, 205, 0.95)" : "rgba(111, 154, 220, 0.26)",
      "stroke-width": isSelected ? 2.2 : 1.1,
    }));
  });
  networkStageSvg.appendChild(edgeLayer);

  const viewerLayer = createSvgNode("g");
  viewerLayer.appendChild(createSvgNode("circle", {
    cx: layout.centerX,
    cy: layout.centerY,
    r: 46,
    fill: "rgba(98, 229, 205, 0.92)",
    stroke: "rgba(255, 255, 255, 0.92)",
    "stroke-width": 2,
  }));
  const viewerText = createSvgNode("text", {
    x: layout.centerX,
    y: layout.centerY + 7,
    "text-anchor": "middle",
    fill: "#091320",
    "font-size": 20,
    "font-weight": 800,
  });
  viewerText.textContent = networkAccountDid === authAccountDid
    ? "DU"
    : getProfileInitials(networkViewerProfile || { handle: "?" });
  viewerLayer.appendChild(viewerText);
  const viewerHandleText = createSvgNode("text", {
    x: layout.centerX,
    y: layout.centerY + 76,
    "text-anchor": "middle",
    class: "network-node-label",
  });
  viewerHandleText.textContent = `@${networkViewerProfile?.handle || authAccount || "account"}`;
  viewerLayer.appendChild(viewerHandleText);
  networkStageSvg.appendChild(viewerLayer);

  let focusLayer = null;

  if (stageSelectedDid) {
    const selectedProfile = getKnownNetworkProfile(stageSelectedDid);
    const focusPreviewItems = getNetworkStageFocusPreviewItems(stageSelectedDid);
    const focusCenterX = layout.centerX;
    const focusCenterY = layout.focusCenterY;
    const focusRadius = 108;
    focusLayer = createSvgNode("g", {
      class: "network-focus-island",
    });
    const focusShield = createSvgNode("circle", {
      cx: focusCenterX,
      cy: focusCenterY,
      r: focusRadius + 42,
      fill: "rgba(0, 0, 0, 0.001)",
    });
    const stopFocusIslandEvent = (event) => {
      event.stopPropagation();
    };
    focusShield.addEventListener("pointerdown", stopFocusIslandEvent);
    focusShield.addEventListener("click", stopFocusIslandEvent);
    focusShield.addEventListener("dblclick", stopFocusIslandEvent);
    focusLayer.appendChild(focusShield);

    focusLayer.appendChild(createSvgNode("circle", {
      cx: focusCenterX,
      cy: focusCenterY,
      r: focusRadius + 18,
      fill: "rgba(11, 26, 48, 0.4)",
      stroke: "rgba(95, 157, 255, 0.1)",
      "stroke-width": 1,
    }));
    focusLayer.appendChild(createSvgNode("circle", {
      cx: focusCenterX,
      cy: focusCenterY,
      r: focusRadius,
      fill: "none",
      stroke: "rgba(96, 174, 255, 0.24)",
      "stroke-width": 1.6,
      "stroke-dasharray": "4 8",
    }));

    const focusBridge = createSvgNode("line", {
      x1: layout.centerX,
      y1: layout.centerY + 56,
      x2: focusCenterX,
      y2: focusCenterY - focusRadius,
      stroke: "rgba(98, 229, 205, 0.28)",
      "stroke-width": 1.8,
    });
    focusLayer.appendChild(focusBridge);

    const focusHint = createSvgNode("text", {
      x: focusCenterX,
      y: focusCenterY - focusRadius - 18,
      "text-anchor": "middle",
      class: "network-stage-hint network-stage-hint-focus",
    });
    focusHint.textContent = t("networkFocusEyebrow");
    focusLayer.appendChild(focusHint);

    const focusCenterGroup = createSvgNode("g", {
      class: "network-node-button network-node-button-focus-center",
      tabindex: 0,
      role: "button",
      "aria-label": `${selectedProfile?.displayName || selectedProfile?.handle || stageSelectedDid} · ${t("networkFocusEyebrow")}`,
    });
    focusCenterGroup.style.cursor = "pointer";
    focusCenterGroup.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    focusCenterGroup.addEventListener("mouseenter", () => {
      setNetworkHoveredAccount(stageSelectedDid);
    });
    focusCenterGroup.addEventListener("mouseleave", () => {
      if (networkHoveredDid === stageSelectedDid) {
        setNetworkHoveredAccount("");
      }
    });
    focusCenterGroup.addEventListener("focus", () => {
      setNetworkHoveredAccount(stageSelectedDid);
    });
    focusCenterGroup.addEventListener("blur", () => {
      if (networkHoveredDid === stageSelectedDid) {
        setNetworkHoveredAccount("");
      }
    });
    focusCenterGroup.addEventListener("click", (event) => {
      event.stopPropagation();
      setNetworkSelection(stageSelectedDid);
    });
    focusCenterGroup.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        setNetworkSelection(stageSelectedDid);
      }
    });
    if (selectedProfile) {
      const title = createSvgNode("title");
      title.textContent = getProfileLabel(selectedProfile);
      focusCenterGroup.appendChild(title);
    }

    focusCenterGroup.appendChild(createSvgNode("circle", {
      cx: focusCenterX,
      cy: focusCenterY,
      r: 30,
      fill: "rgba(98, 229, 205, 0.92)",
      stroke: "#ffffff",
      "stroke-width": 2.2,
    }));
    const focusInitials = createSvgNode("text", {
      x: focusCenterX,
      y: focusCenterY + 5,
      "text-anchor": "middle",
      fill: "#091320",
      "font-size": 15,
      "font-weight": 800,
    });
    focusInitials.textContent = getProfileInitials(selectedProfile || networkNodes.get(stageSelectedDid) || { handle: "?" });
    focusCenterGroup.appendChild(focusInitials);

    const focusHandle = createSvgNode("text", {
      x: focusCenterX,
      y: focusCenterY + 54,
      "text-anchor": "middle",
      class: "network-node-label",
    });
    focusHandle.textContent = `@${selectedProfile?.handle || networkNodes.get(stageSelectedDid)?.handle || "user"}`;
    focusCenterGroup.appendChild(focusHandle);
    focusLayer.appendChild(focusCenterGroup);

    if (activeCommonMutualDids.size) {
      const commonLinkLayer = createSvgNode("g", {
        class: "network-common-mutual-layer",
      });
      activeCommonMutualDids.forEach((did) => {
        const point = layout.positions.get(did);
        if (!point) {
          return;
        }
        commonLinkLayer.appendChild(createSvgNode("line", {
          x1: focusCenterX,
          y1: focusCenterY,
          x2: point.x,
          y2: point.y,
          stroke: "rgba(92, 231, 207, 0.72)",
          "stroke-width": 2.2,
          "stroke-dasharray": "5 6",
        }));
      });
      focusLayer.appendChild(commonLinkLayer);
    }

    focusPreviewItems.forEach((entry, index) => {
      const angle = (-Math.PI / 2) + ((index / Math.max(1, focusPreviewItems.length)) * Math.PI * 2);
      const orbitRadius = 76;
      const pointX = focusCenterX + Math.cos(angle) * orbitRadius;
      const pointY = focusCenterY + Math.sin(angle) * orbitRadius;
      const previewColor = entry.previewRelation === "followers" ? "#69a9ff" : "#f8c26c";
      const previewGroup = createSvgNode("g", {
        class: "network-node-button network-node-button-preview",
        tabindex: 0,
        role: "button",
        "aria-label": `${entry.displayName || entry.handle || entry.did} · ${entry.previewRelation === "followers" ? t("networkPreviewFollowersTitle") : t("networkPreviewFollowingTitle")}`,
      });
      previewGroup.style.cursor = "pointer";
      previewGroup.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      previewGroup.addEventListener("mouseenter", () => {
        setNetworkHoveredAccount(entry.did);
      });
      previewGroup.addEventListener("mouseleave", () => {
        if (networkHoveredDid === entry.did) {
          setNetworkHoveredAccount("");
        }
      });
      previewGroup.addEventListener("focus", () => {
        setNetworkHoveredAccount(entry.did);
      });
      previewGroup.addEventListener("blur", () => {
        if (networkHoveredDid === entry.did) {
          setNetworkHoveredAccount("");
        }
      });
      previewGroup.addEventListener("click", (event) => {
        event.stopPropagation();
        setNetworkSelection(entry.did, {
          previewTab: entry.previewRelation,
          loadDetails: true,
        });
      });
      previewGroup.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setNetworkSelection(entry.did, {
            previewTab: entry.previewRelation,
            loadDetails: true,
          });
        }
      });
      previewGroup.appendChild(createSvgNode("line", {
        x1: focusCenterX,
        y1: focusCenterY,
        x2: pointX,
        y2: pointY,
        stroke: "rgba(152, 196, 255, 0.32)",
        "stroke-width": 1.2,
      }));
      previewGroup.appendChild(createSvgNode("circle", {
        cx: pointX,
        cy: pointY,
        r: 16,
        fill: previewColor,
        stroke: "rgba(255, 255, 255, 0.82)",
        "stroke-width": 1.4,
      }));
      const previewInitials = createSvgNode("text", {
        x: pointX,
        y: pointY + 4,
        "text-anchor": "middle",
        fill: "#091320",
        "font-size": 10,
        "font-weight": 800,
      });
      previewInitials.textContent = getProfileInitials(entry);
      previewGroup.appendChild(previewInitials);
      const previewTitle = createSvgNode("title");
      previewTitle.textContent = getProfileLabel(entry);
      previewGroup.appendChild(previewTitle);
      focusLayer.appendChild(previewGroup);
    });

  }

  const nodeLayer = createSvgNode("g");
  const labelCandidates = getNetworkStageLabelCandidates(visibleNodes, stageSelectedDid);

  visibleNodes.forEach((node) => {
    const point = layout.positions.get(node.did);
    if (!point) {
      return;
    }
    const relation = getNetworkRelationType(node);
    const isSelected = node.did === stageSelectedDid;
    const radius = isSelected ? 22 : (relation === "mutual" ? 18 : 15);
    const isCommonMutual = activeCommonMutualDids.has(node.did);
    const color = relation === "mutual"
      ? "#5ce7cf"
      : (relation === "followers" ? "#69a9ff" : (relation === "following" ? "#f8c26c" : "#bac6d6"));

    const buttonGroup = createSvgNode("g", {
      class: "network-node-button",
      tabindex: 0,
      role: "button",
      "aria-label": `${node.displayName || node.handle || node.did} · ${getNetworkRelationLabel(node)}`,
    });
    buttonGroup.style.cursor = "pointer";
    buttonGroup.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    buttonGroup.addEventListener("mouseenter", () => {
      setNetworkHoveredAccount(node.did);
    });
    buttonGroup.addEventListener("mouseleave", () => {
      if (networkHoveredDid === node.did) {
        setNetworkHoveredAccount("");
      }
    });
    buttonGroup.addEventListener("focus", () => {
      setNetworkHoveredAccount(node.did);
    });
    buttonGroup.addEventListener("blur", () => {
      if (networkHoveredDid === node.did) {
        setNetworkHoveredAccount("");
      }
    });
    buttonGroup.addEventListener("click", (event) => {
      event.stopPropagation();
      setNetworkSelection(node.did);
    });
    buttonGroup.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        setNetworkSelection(node.did);
      }
    });
    const title = createSvgNode("title");
    title.textContent = getProfileLabel(node);
    buttonGroup.appendChild(title);

    buttonGroup.appendChild(createSvgNode("circle", {
      cx: point.x,
      cy: point.y,
      r: radius + (isSelected ? 5 : 0),
      fill: isSelected ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.04)",
    }));
    if (isCommonMutual) {
      buttonGroup.appendChild(createSvgNode("circle", {
        cx: point.x,
        cy: point.y,
        r: radius + 10,
        fill: "rgba(92, 231, 207, 0.08)",
        stroke: "rgba(92, 231, 207, 0.34)",
        "stroke-width": 6,
      }));
      buttonGroup.appendChild(createSvgNode("circle", {
        cx: point.x,
        cy: point.y,
        r: radius + 7,
        fill: "none",
        stroke: "rgba(255, 255, 255, 0.92)",
        "stroke-width": 2.2,
      }));
      buttonGroup.appendChild(createSvgNode("circle", {
        cx: point.x,
        cy: point.y,
        r: radius + 4,
        fill: "none",
        stroke: "rgba(92, 231, 207, 1)",
        "stroke-width": 2.8,
        "stroke-dasharray": "4 4",
      }));
    }
    buttonGroup.appendChild(createSvgNode("circle", {
      cx: point.x,
      cy: point.y,
      r: radius,
      fill: color,
      stroke: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.38)",
      "stroke-width": isSelected ? 2.4 : 1.4,
    }));
    const initials = createSvgNode("text", {
      x: point.x,
      y: point.y + 5,
      "text-anchor": "middle",
      fill: "#06111f",
      "font-size": isSelected ? 14 : 12,
      "font-weight": 800,
    });
    initials.textContent = getProfileInitials(node);
    buttonGroup.appendChild(initials);

    if (labelCandidates.includes(node.did)) {
      const label = createSvgNode("text", {
        x: point.x,
        y: point.y + radius + 22,
        "text-anchor": "middle",
        class: "network-node-label",
      });
      label.textContent = `@${node.handle || "user"}`;
      buttonGroup.appendChild(label);
    }

    nodeLayer.appendChild(buttonGroup);
  });
  networkStageSvg.appendChild(nodeLayer);
  if (focusLayer) {
    networkStageSvg.appendChild(focusLayer);
  }

  if (!hasData) {
    const emptyHint = createSvgNode("text", {
      x: layout.centerX,
      y: layout.centerY - 12,
      "text-anchor": "middle",
      class: "network-stage-hint",
    });
    emptyHint.textContent = t("networkEmpty");
    networkStageSvg.appendChild(emptyHint);
  }
}

function renderNetworkFocus() {
  const fallback = document.createElement("p");
  fallback.className = "settings-note";
  fallback.textContent = networkNodes.size ? t("networkFocusEmpty") : t("networkEmpty");
  if (!networkSelectedDid) {
    networkFocusCard.replaceChildren(fallback);
    return;
  }
  const selectedProfile = networkSelectedDid ? getKnownNetworkProfile(networkSelectedDid) : null;
  const node = networkSelectedDid ? networkNodes.get(networkSelectedDid) : null;
  const focusData = networkSelectedDid ? networkFocusDetails.get(networkSelectedDid) || null : null;
  const active = focusData?.profile || selectedProfile || node || networkViewerProfile || null;
  networkFocusCard.replaceChildren();

  if (!active) {
    networkFocusCard.appendChild(fallback);
    return;
  }

  const shell = document.createElement("div");
  shell.className = "network-focus-shell";
  const summary = document.createElement("section");
  summary.className = "network-focus-summary";

  const header = document.createElement("div");
  header.className = "network-focus-head";
  const badge = document.createElement("div");
  badge.className = "network-avatar-badge";
  const activeAvatarUri = active.did ? getStoredAccountAvatarUri(active) : (active.avatar || "");
  if (activeAvatarUri) {
    const image = document.createElement("img");
    image.src = activeAvatarUri;
    image.alt = active.displayName || active.handle || "avatar";
    badge.appendChild(image);
  } else {
    badge.textContent = node ? getProfileInitials(node) : "DU";
  }

  const copy = document.createElement("div");
  copy.className = "network-avatar-copy";
  const name = document.createElement("strong");
  name.textContent = active.displayName || active.handle || authAccount || t("networkViewerFallback");
  const handle = document.createElement("span");
  handle.className = "network-handle";
  handle.textContent = `@${active.handle || authAccount || "account"}`;
  copy.append(name, handle);
  header.append(badge, copy);

  const relation = document.createElement("span");
  relation.className = "network-relation-pill";
  relation.textContent = node ? getNetworkRelationLabel(node) : t("networkRelationViewer");

  const focusActions = document.createElement("div");
  focusActions.className = "network-focus-actions";
  if (active?.did) {
    const loadActorNetworkButton = document.createElement("button");
    loadActorNetworkButton.type = "button";
    loadActorNetworkButton.className = "ghost-button network-focus-action-button";
    loadActorNetworkButton.textContent = t("networkFocusLoadActorButton");
    loadActorNetworkButton.disabled = networkLoading || active.did === networkAccountDid;
    loadActorNetworkButton.addEventListener("click", () => {
      if (networkAccountInput) {
        networkAccountInput.value = active.handle || active.did || "";
      }
      void loadNetworkWave({
        actor: active.did || active.handle || "",
        append: false,
        silentErrors: false,
      });
    });
    focusActions.appendChild(loadActorNetworkButton);

    const commonMutualsButton = document.createElement("button");
    commonMutualsButton.type = "button";
    commonMutualsButton.className = "ghost-button network-focus-action-button";
    const commonMutualsActive = networkCommonMutualsTargetDid === active.did;
    commonMutualsButton.textContent = commonMutualsActive
      ? t("networkCommonMutualsHideButton")
      : t("networkCommonMutualsShowButton");
    commonMutualsButton.disabled = networkLoading || networkCommonMutualsLoadingDid === active.did || active.did === networkAccountDid;
    commonMutualsButton.addEventListener("click", () => {
      if (networkCommonMutualsTargetDid === active.did) {
        clearNetworkCommonMutuals();
        renderNetworkWorkspace();
        return;
      }
      void loadNetworkCommonMutuals(active.did);
    });
    focusActions.appendChild(commonMutualsButton);
  }

  const stats = document.createElement("div");
  stats.className = "network-stat-grid";
  [
    { label: t("networkStatFollowers"), value: formatCount(active.followersCount) },
    { label: t("networkStatFollowing"), value: formatCount(active.followsCount) },
    { label: t("networkStatPosts"), value: formatCount(active.postsCount) },
    { label: t("networkStatScore"), value: node ? formatCount(getNetworkNodeScore(node)) : "—" },
  ].forEach((item) => {
    const card = document.createElement("div");
    card.className = "network-stat-card";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    card.append(label, value);
    stats.appendChild(card);
  });

  summary.append(header, relation, focusActions, stats);

  if (node) {
    const scoreBreakdown = getNetworkScoreBreakdown(node);
    const scoreExplain = document.createElement("p");
    scoreExplain.className = "network-card-explainer";
    scoreExplain.textContent = t(isViewingOwnNetwork() ? "networkScoreExplain" : "networkScoreExplainOther", {
      score: formatCount(scoreBreakdown.total),
      relation: getNetworkRelationLabel(node),
      account: getNetworkCenterLabel(),
      relationScore: formatCount(scoreBreakdown.relationScore),
      followersScore: formatCount(scoreBreakdown.followersScore),
      postsScore: formatCount(scoreBreakdown.postsScore),
    });
    summary.appendChild(scoreExplain);
  }

  if (active?.did === networkCommonMutualsTargetDid) {
    const commonMeta = document.createElement("div");
    commonMeta.className = "network-relationship-meta";
    const commonCount = document.createElement("p");
    commonCount.className = "network-card-explainer network-card-explainer-strong";
    commonCount.textContent = networkCommonMutualsDids.size
      ? t("networkCommonMutualsCount", {
          count: formatCount(networkCommonMutualsDids.size),
        })
      : t("networkCommonMutualsZero");
    commonMeta.appendChild(commonCount);
    const commonWhere = document.createElement("p");
    commonWhere.className = "network-card-explainer";
    commonWhere.textContent = t("networkCommonMutualsWhereShown");
    commonMeta.appendChild(commonWhere);
    const commonSample = document.createElement("p");
    commonSample.className = "network-card-explainer";
    commonSample.textContent = t("networkCommonMutualsSampleNote");
    commonMeta.appendChild(commonSample);
    summary.appendChild(commonMeta);
  } else if (networkCommonMutualsLoadingDid === active?.did) {
    const commonLoading = document.createElement("p");
    commonLoading.className = "network-card-explainer";
    commonLoading.textContent = t("networkCommonMutualsLoading");
    summary.appendChild(commonLoading);
  }

  const youFollowSince = formatNetworkRelationshipDate(focusData?.relationshipDates?.youFollowSince);
  const followsYouSince = formatNetworkRelationshipDate(focusData?.relationshipDates?.followsYouSince);
  if (isViewingOwnNetwork() && (youFollowSince || followsYouSince)) {
    const relationshipMeta = document.createElement("div");
    relationshipMeta.className = "network-relationship-meta";
    if (youFollowSince && followsYouSince) {
      const mutualSince = new Date(Math.max(
        Date.parse(focusData.relationshipDates.youFollowSince || 0),
        Date.parse(focusData.relationshipDates.followsYouSince || 0),
      ));
      const mutualLine = document.createElement("p");
      mutualLine.className = "network-card-explainer";
      mutualLine.textContent = t("networkMutualSince", {
        date: new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }).format(mutualSince),
      });
      relationshipMeta.appendChild(mutualLine);
    }
    if (youFollowSince) {
      const followLine = document.createElement("p");
      followLine.className = "network-card-explainer";
      followLine.textContent = t("networkYouFollowSince", {
        date: youFollowSince,
      });
      relationshipMeta.appendChild(followLine);
    }
    if (followsYouSince) {
      const followedByLine = document.createElement("p");
      followedByLine.className = "network-card-explainer";
      followedByLine.textContent = t("networkFollowsYouSince", {
        date: followsYouSince,
      });
      relationshipMeta.appendChild(followedByLine);
    }
    summary.appendChild(relationshipMeta);
  }

  if (focusData?.activityStats) {
    const activity14 = getNetworkActivityWindow(focusData.activityStats, 14);
    const activity60 = getNetworkActivityWindow(focusData.activityStats, 60);
    const latestPost = formatNetworkActivityLastPost(focusData.activityStats.latestPostAt);
    if (activity14 || activity60 || latestPost) {
      const activityMeta = document.createElement("div");
      activityMeta.className = "network-relationship-meta";

      const activityTitle = document.createElement("p");
      activityTitle.className = "network-card-explainer network-card-explainer-strong";
      activityTitle.textContent = t("networkActivityTitle");
      activityMeta.appendChild(activityTitle);

      if (latestPost) {
        const latestLine = document.createElement("p");
        latestLine.className = "network-card-explainer";
        latestLine.textContent = t("networkLatestPost", {
          date: latestPost,
        });
        activityMeta.appendChild(latestLine);
      }

      if (activity14) {
        const posts14 = document.createElement("p");
        posts14.className = "network-card-explainer";
        posts14.textContent = t("networkRecentPostsWindow", {
          days: "14",
          count: formatCount(activity14.postsCount),
        });
        activityMeta.appendChild(posts14);

        const likes14 = document.createElement("p");
        likes14.className = "network-card-explainer";
        likes14.textContent = t("networkRecentLikesWindow", {
          days: "14",
          count: formatCount(activity14.likesReceivedCount),
        });
        activityMeta.appendChild(likes14);
      }

      if (activity60) {
        const posts60 = document.createElement("p");
        posts60.className = "network-card-explainer";
        posts60.textContent = t("networkRecentPostsWindow", {
          days: "60",
          count: formatCount(activity60.postsCount),
        });
        activityMeta.appendChild(posts60);

        const likes60 = document.createElement("p");
        likes60.className = "network-card-explainer";
        likes60.textContent = t("networkRecentLikesWindow", {
          days: "60",
          count: formatCount(activity60.likesReceivedCount),
        });
        activityMeta.appendChild(likes60);
      }

      const activitySample = document.createElement("p");
      activitySample.className = "network-card-explainer";
      activitySample.textContent = t("networkActivitySampleNote", {
        count: formatCount(focusData.activityStats.samplePosts || 0),
      });
      activityMeta.appendChild(activitySample);

      summary.appendChild(activityMeta);
    }
  }

  if (isViewingOwnNetwork() && focusData?.likeStats) {
    const likeMeta = document.createElement("div");
    likeMeta.className = "network-relationship-meta";

    const totalLikes = document.createElement("p");
    totalLikes.className = "network-card-explainer";
    totalLikes.textContent = t("networkMutualLikesTotal", {
      count: formatCount(focusData.likeStats.mutualLikesCount || 0),
    });
    likeMeta.appendChild(totalLikes);

    const youLike = document.createElement("p");
    youLike.className = "network-card-explainer";
    youLike.textContent = t("networkYouLikePosts", {
      count: formatCount(focusData.likeStats.youLikeCount || 0),
    });
    likeMeta.appendChild(youLike);

    const likesYou = document.createElement("p");
    likesYou.className = "network-card-explainer";
    likesYou.textContent = t("networkTheyLikeYourPosts", {
      count: formatCount(focusData.likeStats.likesYouCount || 0),
    });
    likeMeta.appendChild(likesYou);

    const sampleNote = document.createElement("p");
    sampleNote.className = "network-card-explainer";
    sampleNote.textContent = t("networkLikesSampleNote", {
      own: formatCount(focusData.likeStats.ownPostsSampled || 0),
      actor: formatCount(focusData.likeStats.actorPostsSampled || 0),
      total: formatCount(focusData.likeStats.totalSample || 0),
    });
    likeMeta.appendChild(sampleNote);

    summary.appendChild(likeMeta);
  }

  if (active?.description) {
    const descriptionWrap = document.createElement("details");
    descriptionWrap.className = "network-description-disclosure";
    const descriptionSummary = document.createElement("summary");
    descriptionSummary.textContent = t("networkDescriptionButton");
    const description = document.createElement("p");
    description.className = "network-description";
    description.textContent = active.description;
    descriptionWrap.append(descriptionSummary, description);
    summary.appendChild(descriptionWrap);
  }

  if (networkFocusLoadingDid && node?.did === networkFocusLoadingDid) {
    const loading = document.createElement("p");
    loading.className = "settings-note";
    loading.textContent = t("networkFocusLoading");
    summary.appendChild(loading);
  }

  if (focusData && node) {
    const previewMeta = document.createElement("p");
    previewMeta.className = "network-card-explainer";
    previewMeta.textContent = t("networkStagePreviewMeta", {
      followers: formatCount(focusData.followersPreview?.length || 0),
      following: formatCount(focusData.followsPreview?.length || 0),
    });
    summary.appendChild(previewMeta);
  }

  shell.appendChild(summary);
  networkFocusCard.appendChild(shell);
}

function renderNetworkResults() {
  const savedScrollTop = networkResults?.scrollTop || networkResultsScrollTop || 0;
  networkResults.replaceChildren();
  const allNodes = getAllNetworkNodes();
  if (!allNodes.length) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = t("networkResultsEmpty");
    networkResults.appendChild(empty);
    return;
  }

  const centerLabel = getNetworkCenterLabel();
  const groups = [
    [
      "mutual",
      t("networkGroupMutuals"),
      isViewingOwnNetwork()
        ? t("networkGroupMutualsNote")
        : t("networkGroupMutualsNoteOther", { account: centerLabel }),
    ],
    [
      "followers",
      t("networkGroupFollowers"),
      isViewingOwnNetwork()
        ? t("networkGroupFollowersNote")
        : t("networkGroupFollowersNoteOther", { account: centerLabel }),
    ],
    [
      "following",
      t("networkGroupFollowing"),
      isViewingOwnNetwork()
        ? t("networkGroupFollowingNote")
        : t("networkGroupFollowingNoteOther", { account: centerLabel }),
    ],
  ];

  if (!networkStageMode) {
    const introCard = document.createElement("article");
    introCard.className = "network-group-card network-group-card-intro";
    const introTitle = document.createElement("strong");
    introTitle.textContent = t("networkTopConnectionsTitle");
    const introBody = document.createElement("p");
    introBody.className = "network-card-explainer";
    introBody.textContent = t("networkTopConnectionsMeta", {
      total: formatCount(allNodes.length),
      visible: formatCount(getVisibleNetworkNodes().length),
    });
    introCard.append(introTitle, introBody);
    networkResults.appendChild(introCard);
  }

  groups.forEach(([groupKey, titleText, noteText]) => {
    if (networkStageMode && networkStageModeListsVisible && groupKey !== networkInsightsStageGroup) {
      return;
    }
    const groupItems = sortNetworkNodes(
      allNodes.filter((node) => getNetworkRelationType(node) === groupKey),
    );
    const totalCount = groupItems.length;
    const card = document.createElement("article");
    card.className = "network-group-card";
    const title = document.createElement("strong");
    title.textContent = `${titleText} · ${formatCount(totalCount)}`;
    const note = document.createElement("p");
    note.className = "network-card-explainer";
    note.textContent = noteText;
    card.append(title, note);

    if (!groupItems.length) {
      const empty = document.createElement("p");
      empty.className = "settings-note";
      empty.textContent = t("networkGroupEmpty");
      card.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "network-scroll-list";
      groupItems.forEach((node) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "network-list-button";
        button.addEventListener("click", () => {
          networkResultsScrollTop = networkResults?.scrollTop || 0;
          setNetworkSelection(node.did);
        });
        const name = document.createElement("strong");
        name.textContent = node.displayName || node.handle || node.did;
        const meta = document.createElement("span");
        meta.className = "network-list-meta";
        meta.textContent = `@${node.handle || node.did} · ${formatCount(getNetworkNodeScore(node))}`;
        button.append(name, meta);
        list.appendChild(button);
      });
      card.appendChild(list);
    }

    if (hasPendingNetworkDataForGroup(groupKey)) {
      const moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.className = "ghost-button network-more-button";
      moreButton.textContent = t("networkShowMoreButton");
      moreButton.disabled = networkLoading;
      moreButton.addEventListener("click", async () => {
        await loadMoreNetworkGroup(groupKey);
      });
      const moreNote = document.createElement("p");
      moreNote.className = "network-card-explainer";
      moreNote.textContent = t("networkShowMoreNote");
      card.append(moreButton, moreNote);
    }

    networkResults.appendChild(card);
  });

  networkResultsScrollTop = savedScrollTop;
  restoreNetworkResultsScroll();
}

function updateNetworkControls() {
  const canLoadMore = networkHasMoreFollowers || networkHasMoreFollows || !networkNodes.size;
  const requestedActor = getRequestedNetworkActor();
  const loadButtonLabel = networkLoading
    ? t("networkLoadingButton")
    : canLoadMore && networkNodes.size
    ? t("networkLoadMoreButton")
    : t("networkLoadButton");
  networkLoadButton.textContent = loadButtonLabel;
  networkLoadButton.disabled = networkLoading || !authAccount || !canLoadMore;
  networkLoadButton.title = !authAccount
    ? t("networkLoadButton")
    : networkLoading
    ? t("networkLoadingButton")
    : canLoadMore && networkNodes.size
    ? t("networkLoadMoreTitle")
    : canLoadMore
    ? t("networkLoadButton")
    : t("networkLoadFinishedTitle");
  networkResetButton.disabled = networkLoading || (!networkNodes.size && !networkSearchQuery && networkFilterMode === "all");
  if (networkOwnLoadButton) {
    networkOwnLoadButton.disabled = networkLoading || !authAccount || isViewingOwnNetwork();
  }
  if (networkAccountLoadButton) {
    networkAccountLoadButton.disabled = networkLoading || !authAccount || !requestedActor;
  }
}

function renderNetworkWorkspace() {
  ensureNetworkStateForAccount();
  document.body.classList.toggle("network-stage-mode", networkStageMode);
  if (networkAccountInput && !networkAccountInput.matches(":focus")) {
    networkAccountInput.value = String(networkAccountInput.value || "").trim() || networkViewerProfile?.handle || "";
  }
  const focusPanelVisible = Boolean(networkSelectedDid) && (!networkStageMode || networkStageModeFocusVisible);
  networkCanvasPanel?.classList.toggle("has-focus", focusPanelVisible);
  networkCanvasPanel?.classList.toggle("has-focus-collapsed", focusPanelVisible && networkFocusCollapsed);
  networkCanvasPanel?.classList.toggle("is-squircle", networkStageShape === NETWORK_STAGE_SHAPE_SQUIRCLE);
  networkStageCard?.classList.toggle("is-stage-mode", networkStageMode);
  networkInsightsCard?.classList.toggle("is-stage-mode-visible", networkStageMode && networkStageModeListsVisible);
  networkInsightsCard?.toggleAttribute("hidden", networkStageMode && !networkStageModeListsVisible);
  networkFocusPanel?.classList.toggle("is-collapsed", networkFocusCollapsed);
  networkFocusPanel?.toggleAttribute("hidden", networkStageMode && !networkStageModeFocusVisible);
  if (networkShapeToggleButton) {
    const isSquircle = networkStageShape === NETWORK_STAGE_SHAPE_SQUIRCLE;
    networkShapeToggleButton.classList.toggle("is-active", isSquircle);
    networkShapeToggleButton.setAttribute("aria-pressed", isSquircle ? "true" : "false");
    networkShapeToggleButton.title = isSquircle ? t("networkShapeDisableTitle") : t("networkShapeEnableTitle");
  }
  if (networkFocusToggleButton) {
    networkFocusToggleButton.innerHTML = createIconSvg(
      networkFocusCollapsed
        ? "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"
        : "M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z",
    );
    networkFocusToggleButton.setAttribute("aria-expanded", networkFocusCollapsed ? "false" : "true");
    networkFocusToggleButton.setAttribute("aria-label", networkFocusCollapsed ? t("networkFocusExpand") : t("networkFocusCollapse"));
    networkFocusToggleButton.disabled = !networkSelectedDid;
  }
  if (networkStageModeButton) {
    networkStageModeButton.hidden = networkStageMode;
    networkStageModeButton.setAttribute("aria-pressed", networkStageMode ? "true" : "false");
  }
  if (networkStageModeExitButton) {
    networkStageModeExitButton.hidden = !networkStageMode;
  }
  if (networkStageModeFocusButton) {
    networkStageModeFocusButton.hidden = !networkStageMode;
    networkStageModeFocusButton.disabled = !networkSelectedDid;
    networkStageModeFocusButton.classList.toggle("is-active", networkStageModeFocusVisible);
    networkStageModeFocusButton.setAttribute("aria-pressed", networkStageModeFocusVisible ? "true" : "false");
    networkStageModeFocusButton.textContent = networkStageModeFocusVisible
      ? t("networkStageModeHideFocus")
      : t("networkStageModeShowFocus");
  }
  if (networkStageModeListsButton) {
    networkStageModeListsButton.hidden = !networkStageMode;
    networkStageModeListsButton.classList.toggle("is-active", networkStageModeListsVisible);
    networkStageModeListsButton.setAttribute("aria-pressed", networkStageModeListsVisible ? "true" : "false");
    networkStageModeListsButton.textContent = networkStageModeListsVisible
      ? t("networkStageModeHideLists")
      : t("networkStageModeShowLists");
  }
  if (networkSortFieldSelect) {
    networkSortFieldSelect.value = networkSortField;
  }
  if (networkSortDirectionSelect) {
    networkSortDirectionSelect.value = networkSortDirection;
  }
  if (networkInsightsGroupToggles) {
    networkInsightsGroupToggles.hidden = !(networkStageMode && networkStageModeListsVisible);
  }
  networkInsightsGroupButtons.forEach((button) => {
    const isActive = button.dataset.networkInsightsGroup === networkInsightsStageGroup;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  updateNetworkFilterButtons();
  renderNetworkSummary();
  renderNetworkStage();
  renderNetworkFocus();
  renderNetworkResults();
  updateNetworkControls();
  setNetworkStatus(networkStatusLine || t("networkProgressIdle"));
  restoreNetworkResultsScroll();
  if (networkSelectedDid && !networkFocusDetails.has(networkSelectedDid) && networkFocusLoadingDid !== networkSelectedDid) {
    void loadNetworkFocusDetails(networkSelectedDid);
  }
}

async function loadNetworkWave(options = {}) {
  if (!authAccount || networkLoading) {
    return;
  }

  const requestedActor = String(
    options.actor
      || (options.append === true
        ? (networkViewerProfile?.did || networkAccountDid || authAccountDid || "")
        : getRequestedNetworkActor()),
  ).trim();
  if (!requestedActor) {
    return;
  }

  const currentActorIdentity = String(networkViewerProfile?.handle || networkAccountDid || "").trim().toLowerCase();
  const requestedActorIdentity = requestedActor.toLowerCase();
  const switchActor = options.append !== true && (!networkNodes.size || !currentActorIdentity || currentActorIdentity !== requestedActorIdentity);

  ensureNetworkStateForAccount();
  if (switchActor) {
    networkAccountDid = requestedActor;
    resetNetworkState();
    networkAccountDid = requestedActor;
    networkFilterMode = "all";
    networkSearchQuery = "";
    if (networkSearchInput) {
      networkSearchInput.value = "";
    }
    networkStatusLine = t("networkProgressLoading");
  }
  networkLoading = true;
  updateNetworkControls();
  setBusy(networkLoadButton, true, t("networkLoadingButton"), t("networkLoadButton"));

  try {
    const result = await sendToServiceWorker("LOAD_NETWORK_SLICE", {
      actor: requestedActor,
      followerCursor: networkFollowerCursor,
      followCursor: networkFollowCursor,
      limit: 500,
    }, {
      timeoutMs: 180000,
      onProgress(progress) {
        const step = String(progress?.step || "").trim();
        const detail = String(progress?.detail || "").trim();
        setNetworkStatus([step, detail].filter(Boolean).join(" · ") || t("networkProgressLoading"));
      },
    });

    networkAccountDid = result?.viewer?.did || networkAccountDid || requestedActor;
    networkViewerProfile = result?.viewer || networkViewerProfile;
    if (networkAccountInput) {
      networkAccountInput.value = networkViewerProfile?.handle || requestedActor;
    }
    ingestNetworkProfiles(result?.followers || []);
    ingestNetworkProfiles(result?.follows || []);
    networkFollowerCursor = String(result?.followerCursor || "");
    networkFollowCursor = String(result?.followCursor || "");
    networkHasMoreFollowers = result?.hasMoreFollowers === true;
    networkHasMoreFollows = result?.hasMoreFollows === true;
    networkWaveIndex += 1;
    setNetworkStatus(t("networkProgressLoaded", {
      wave: networkWaveIndex,
      loaded: formatCount(networkNodes.size),
      followers: formatCount((result?.wave?.followers) || 0),
      follows: formatCount((result?.wave?.follows) || 0),
    }));
  } catch (error) {
    console.error(error);
    setNetworkStatus(error.message || t("networkLoadFailed"));
    if (!options.silentErrors) {
      showErrorDialog(error.message || t("networkLoadFailed"), t("archiveErrorTitle"));
    }
  } finally {
    networkLoading = false;
    setBusy(networkLoadButton, false, t("networkLoadingButton"), t("networkLoadButton"));
    renderNetworkWorkspace();
  }
}

function getDmFilters() {
  return {
    participantDid: dmSelectedParticipantDids[0] || "",
    from: dmFromInput?.value || "",
    to: dmToInput?.value || "",
  };
}

function setDmProgress({ title, step, percent = 0, detail = "" } = {}) {
  dmJobState = {
    title: title || t("dmProgressIdleTitle"),
    step: step || t("dmProgressIdleStep"),
    percent: Math.max(0, Math.min(100, Number(percent) || 0)),
    detail: detail || "",
  };
  if (dmProgressTitle) {
    dmProgressTitle.textContent = dmJobState.title;
  }
  if (dmProgressStep) {
    dmProgressStep.textContent = dmJobState.step;
  }
  if (dmProgressFill) {
    dmProgressFill.style.width = `${dmJobState.percent}%`;
  }
  if (dmProgressDetail) {
    dmProgressDetail.textContent = dmJobState.detail;
  }
}

function renderDmSummary() {
  if (!dmSummary) {
    return;
  }
  dmSummary.replaceChildren();
  const meta = dmCatalog?.manifest || {};
  const items = [
    {
      label: t("dmSummaryConversationsLabel"),
      value: String(Number(meta.conversationCount) || 0),
    },
    {
      label: t("dmSummaryMessagesLabel"),
      value: String(Number(meta.messageCount) || 0),
    },
    {
      label: t("dmSummaryParticipantsLabel"),
      value: String(Number(meta.participantCount) || 0),
    },
  ];

  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = "archive-summary-item";
    const label = document.createElement("span");
    label.className = "archive-summary-label";
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    node.append(label, value);
    dmSummary.appendChild(node);
  });
}

function renderDmContacts() {
  if (!dmContactList || !dmContactSelectionNote) {
    return;
  }

  dmContactList.replaceChildren();
  const query = String(dmContactSearchInput?.value || "").trim().toLowerCase();
  const contactAssetUris = new Map((Array.isArray(dmRecentContactAssets) ? dmRecentContactAssets : []).map((asset) => [asset.path, assetToDataUri(asset)]));
  const visibleContacts = (Array.isArray(dmRecentContacts) ? [...dmRecentContacts] : [])
    .sort((left, right) => {
      const leftLabel = String(left.displayName || left.handle || left.did || "");
      const rightLabel = String(right.displayName || right.handle || right.did || "");
      const nameCompare = leftLabel.localeCompare(rightLabel, currentLocale || undefined, { sensitivity: "base" });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return String(left.handle || left.did || "").localeCompare(String(right.handle || right.did || ""), currentLocale || undefined, { sensitivity: "base" });
    })
    .filter((contact) => {
      if (!query) {
        return true;
      }
      const haystack = [
        contact.handle || "",
        contact.displayName || "",
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

  if (visibleContacts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = dmRecentContacts.length > 0
      ? t("dmContactSearchEmpty")
      : t("dmContactSelectionEmpty");
    dmContactList.appendChild(empty);
  } else {
    visibleContacts.forEach((contact) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hashtag-chip dm-contact-chip";
      if (dmSelectedParticipantDids.includes(contact.did)) {
        button.classList.add("is-selected");
      }
      const avatarUri = contact.avatarPath ? (contactAssetUris.get(contact.avatarPath) || "") : "";
      const avatar = document.createElement(avatarUri ? "img" : "span");
      avatar.className = "account-chip-avatar dm-contact-avatar";
      if (avatarUri) {
        avatar.src = avatarUri;
        avatar.alt = contact.displayName || contact.handle || contact.did || "DM contact";
        avatar.loading = "lazy";
      } else {
        avatar.textContent = getProfileInitials(contact);
      }
      const fullName = String(contact.displayName || "").trim();
      const fullHandle = contact.handle ? `@${contact.handle}` : "";
      const tooltip = [fullName, fullHandle].filter(Boolean).join("\n");
      if (tooltip) {
        button.title = tooltip;
      }
      const content = document.createElement("span");
      content.className = "dm-contact-chip-content";
      const name = document.createElement("strong");
      name.className = "dm-contact-chip-name";
      name.textContent = contact.displayName || `@${contact.handle || contact.did}`;
      if (fullName) {
        name.title = fullName;
      }
      const handle = document.createElement("span");
      handle.className = "dm-contact-chip-handle";
      handle.textContent = `@${contact.handle || contact.did}`;
      if (fullHandle) {
        handle.title = fullHandle;
      }
      content.append(name, handle);
      button.append(avatar, content);
      button.addEventListener("click", () => {
        dmSelectedParticipantDids = dmSelectedParticipantDids.includes(contact.did)
          ? []
          : [contact.did];
        renderDmWorkspace();
      });
      dmContactList.appendChild(button);
    });
  }

  if (dmSelectedParticipantDids.length > 0) {
    dmContactSelectionNote.textContent = t("dmContactSelectionOne");
  } else if (dmRecentContacts.length > 0) {
    dmContactSelectionNote.textContent = t("dmContactSelectionAll");
  } else {
    dmContactSelectionNote.textContent = t("dmContactSelectionEmpty");
  }
}

function renderDmResults() {
  if (!dmResults) {
    return;
  }
  dmResults.replaceChildren();
  if (!dmCatalog) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = t("dmResultsEmpty");
    dmResults.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "archive-results";
  const conversations = Array.isArray(dmCatalog.conversations) ? dmCatalog.conversations.slice(0, 8) : [];
  conversations.forEach((convo) => {
    const card = document.createElement("article");
    card.className = "archive-result-card";
    const title = document.createElement("h4");
    title.textContent = getDmConversationTitle(convo, dmCatalog);
    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent = t("dmConversationMeta", {
      messages: convo.messageCount || 0,
      updatedAt: formatHistoryTimestamp(convo.lastMessageAt || convo.updatedAt || ""),
    });
    card.append(title, note);
    list.appendChild(card);
  });
  dmResults.appendChild(list);
}

function renderDmWorkspace() {
  setElementVisibility(dmLaunchPanel, isDmAccessAvailable());
  renderDmContacts();
  renderDmSummary();
  renderDmResults();
  dmCheckButton.disabled = !authAccount || !isDmAccessAvailable();
  dmLoadPartnersButton.disabled = !authAccount || !isDmAccessAvailable();
  dmLoadButton.disabled = !authAccount || !isDmAccessAvailable() || dmSelectedParticipantDids.length !== 1;
  dmExportJsonButton.disabled = !isDmAccessAvailable() || !dmCatalog;
  if (dmExportHtmlButton) {
    dmExportHtmlButton.disabled = !isDmAccessAvailable() || !dmCatalog;
  }
  if (dmExportPdfButton) {
    dmExportPdfButton.disabled = !isDmAccessAvailable() || !dmCatalog;
  }
}

async function exportDmArchiveJson(catalog = dmCatalog) {
  assertDmAccessUnlocked();
  if (!catalog) {
    throw new Error(t("dmNeedArchive"));
  }
  setDmProgress({
    title: t("dmProgressExportTitle"),
    step: t("dmProgressExportStep"),
    percent: 90,
    detail: t("dmProgressExportDetail", { count: catalog.manifest?.messageCount || 0 }),
  });
  const payload = JSON.stringify(catalog, null, 2);
  const fileName = `threadline-dm-archive-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([payload], fileName, { type: "application/json" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setDmProgress({
    title: t("dmProgressDoneTitle"),
    step: t("dmProgressDoneStep"),
    percent: 100,
    detail: t("dmExportDone"),
  });
}

function getDmPrimaryPartner(catalog = dmCatalog) {
  const selectedDid = catalog?.manifest?.filters?.participantDid || dmSelectedParticipantDids[0] || "";
  const selfDid = catalog?.manifest?.account?.did || "";
  const conversations = Array.isArray(catalog?.conversations) ? catalog.conversations : [];
  const recentContacts = Array.isArray(catalog?.recentContacts) ? catalog.recentContacts : [];
  const conversationMember = conversations
    .flatMap((convo) => Array.isArray(convo.members) ? convo.members : [])
    .find((member) => member.did === selectedDid && member.did !== selfDid);
  const recentContact = recentContacts.find((contact) => contact.did === selectedDid);
  if (conversationMember || recentContact) {
    return {
      ...(recentContact || {}),
      ...(conversationMember || {}),
      did: conversationMember?.did || recentContact?.did || selectedDid,
      handle: conversationMember?.handle || recentContact?.handle || "",
      displayName: conversationMember?.displayName || recentContact?.displayName || conversationMember?.handle || recentContact?.handle || "",
      avatar: conversationMember?.avatar || recentContact?.avatar || "",
      avatarPath: conversationMember?.avatarPath || recentContact?.avatarPath || "",
    };
  }
  return conversations[0]?.members?.find((member) => member?.did && member.did !== selfDid) || null;
}

function getDmConversationTitle(convo, catalog = dmCatalog) {
  if (convo?.title) {
    return convo.title;
  }
  const partner = getDmPrimaryPartner(catalog);
  if (partner?.displayName && partner.displayName !== partner.handle) {
    return partner.displayName;
  }
  if (partner?.handle) {
    return `@${partner.handle}`;
  }
  return convo?.memberHandles?.join(", ") || t("dmConversationFallbackTitle");
}

function makeDmArchiveFileBaseName(catalog = dmCatalog) {
  const ownHandle = String(catalog?.manifest?.account?.handle || authAccount || "account").replace(/[^\w.-]+/g, "-");
  const partner = getDmPrimaryPartner(catalog);
  const partnerPart = String(partner?.handle || partner?.did || "dm").replace(/[^\w.-]+/g, "-");
  const datePart = formatArchiveDatePart(catalog?.manifest?.exportedAt);
  return `threadline-dm-${ownHandle}-${partnerPart}-${datePart}`;
}

function collectDmMessagesForExport(catalog = dmCatalog) {
  const conversations = Array.isArray(catalog?.conversations) ? catalog.conversations : [];
  const convoById = new Map(conversations.map((convo) => [convo.id, convo]));
  const memberByDid = new Map();
  const selfDid = catalog?.manifest?.account?.did || "";
  const selfHandle = catalog?.manifest?.account?.handle || authAccount || "";
  const selfDisplayName = catalog?.manifest?.account?.displayName || selfHandle || "";
  const selfAvatarPath = catalog?.manifest?.account?.avatarPath || "";
  conversations.forEach((convo) => {
    (convo.members || []).forEach((member) => {
      if (member?.did && !memberByDid.has(member.did)) {
        memberByDid.set(member.did, member);
      }
    });
  });
  return (Array.isArray(catalog?.messages) ? [...catalog.messages] : [])
    .sort((left, right) => {
      const leftTime = Date.parse(left.sentAt || 0) || 0;
      const rightTime = Date.parse(right.sentAt || 0) || 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return String(left.id || "").localeCompare(String(right.id || ""));
    })
    .map((message) => ({
      ...message,
      senderHandle: message.senderDid === selfDid
        ? (message.senderHandle || selfHandle || "")
        : (memberByDid.get(message.senderDid)?.handle || message.senderHandle || ""),
      senderDisplayName: message.senderDid === selfDid
        ? (message.senderDisplayName || selfDisplayName || selfHandle || message.senderDid || "")
        : (memberByDid.get(message.senderDid)?.displayName || memberByDid.get(message.senderDid)?.handle || message.senderDisplayName || message.senderHandle || message.senderDid || ""),
      senderAvatarPath: message.senderDid === selfDid
        ? (message.senderAvatarPath || selfAvatarPath || "")
        : (memberByDid.get(message.senderDid)?.avatarPath || message.senderAvatarPath || ""),
      conversation: convoById.get(message.convoId) || null,
    }));
}

function getDmArchiveMessageRange(catalog = dmCatalog) {
  const messages = collectDmMessagesForExport(catalog);
  const datedMessages = messages
    .map((message) => ({
      message,
      timestamp: Date.parse(message.sentAt || ""),
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (datedMessages.length === 0) {
    return {
      from: catalog?.manifest?.filters?.from || "",
      to: catalog?.manifest?.filters?.to || "",
    };
  }

  return {
    from: datedMessages[0].message.sentAt || "",
    to: datedMessages[datedMessages.length - 1].message.sentAt || "",
  };
}

function extractDmExternalCardFromEmbed(embed) {
  if (!embed || typeof embed !== "object") {
    return null;
  }

  const external = embed.external && typeof embed.external === "object"
    ? embed.external
    : embed.card && typeof embed.card === "object"
      ? embed.card
      : embed.link && typeof embed.link === "object"
        ? embed.link
        : embed;
  const url = String(external.uri || external.url || "").trim();
  const title = String(external.title || "").trim();
  const description = String(external.description || "").trim();
  const thumb = String(external.thumb || external.thumbnail || external.image || "").trim();

  if (url) {
    return {
      url,
      title,
      description,
      thumb,
    };
  }

  if (embed.media) {
    return extractDmExternalCardFromEmbed(embed.media);
  }

  if (Array.isArray(embed.embeds)) {
    for (const nestedEmbed of embed.embeds) {
      const match = extractDmExternalCardFromEmbed(nestedEmbed);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function getDmFacetLinkCard(message = {}) {
  const linkRuns = extractPdfLinkRuns(
    message?.text || "",
    Array.isArray(message?.facets) ? message.facets : [],
  ).filter((run) => run?.url);
  if (linkRuns.length === 0) {
    return null;
  }
  const firstUrl = String(linkRuns[0].url || "").trim();
  if (!firstUrl) {
    return null;
  }
  return {
    url: firstUrl,
    title: firstUrl,
    description: "",
    thumb: "",
    thumbPath: "",
  };
}

function getDmExternalCard(message = {}) {
  if (message?.externalCard?.url) {
    return message.externalCard;
  }
  const embeds = Array.isArray(message.embeds) ? message.embeds : [];
  for (const embed of embeds) {
    const card = extractDmExternalCardFromEmbed(embed);
    if (card) {
      return card;
    }
  }
  return getDmFacetLinkCard(message);
}

function buildDmHtmlI18n() {
  const keys = [
    "dmHeaderEyebrow",
    "dmHeaderTitle",
    "dmHtmlGenerated",
    "dmSummaryConversationsLabel",
    "dmSummaryMessagesLabel",
    "dmSummaryParticipantsLabel",
    "dmConversationLabel",
    "dmPartnerLabel",
    "dmArchiveRangeLabel",
    "dmArchiveRangeValue",
    "dmHtmlSearchLabel",
    "dmHtmlResetFilters",
    "dmHtmlVisibleStatus",
    "dmHtmlNoMatches",
    "dmHtmlOpenConversation",
    "dmHtmlNoText",
    "closeButton",
  ];

  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(keys.map((key) => [key, translations[locale]?.[key] || translations[DEFAULT_LOCALE]?.[key] || key])),
  ]));
}

function buildDmHtmlDocument(catalog = dmCatalog) {
  const partner = getDmPrimaryPartner(catalog);
  const messages = collectDmMessagesForExport(catalog);
  const assetUris = new Map((catalog?.assets || []).map((asset) => [asset.path, assetToDataUri(asset)]));
  const partnerAvatarUri = partner?.avatarPath ? (assetUris.get(partner.avatarPath) || "") : "";
  const exportedAt = catalog?.manifest?.exportedAt || new Date().toISOString();
  const ownHandle = catalog?.manifest?.account?.handle || authAccount || "";
  const title = `${t("dmHeaderTitle")} · ${partner?.displayName || `@${partner?.handle || ""}`}`.trim();
  const archiveRange = getDmArchiveMessageRange(catalog);
  const rangeFrom = archiveRange.from || "";
  const rangeTo = archiveRange.to || "";
  const i18nPayload = JSON.stringify(buildDmHtmlI18n());
  const localePayload = JSON.stringify(currentLocale);
  const messagesMarkup = messages.map((message) => {
    const senderName = message.senderDisplayName || message.senderHandle || message.senderDid || ownHandle;
    const senderHandle = message.senderHandle ? `@${message.senderHandle}` : "";
    const senderAvatarUri = message.senderAvatarPath ? (assetUris.get(message.senderAvatarPath) || "") : "";
    const externalCard = getDmExternalCard(message);
    const externalThumbUri = (externalCard?.thumbPath ? (assetUris.get(externalCard.thumbPath) || "") : "") || String(externalCard?.thumb || "").trim();
    const searchValue = [
      senderName,
      senderHandle,
      message.text || "",
      extractPdfLinkRuns(message.text || "", message.facets || []).map((run) => run.url || "").filter(Boolean).join(" "),
      externalCard?.title || "",
      externalCard?.description || "",
      externalCard?.url || "",
    ].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
    return `
      <article class="dm-html-message ${message.senderDid === catalog?.manifest?.account?.did ? "is-own" : "is-other"}" data-dm-message data-search="${escapeHtmlAttribute(searchValue)}">
        <div class="dm-html-message-head">
          <div class="dm-html-message-author">
            ${senderAvatarUri ? `<img class="dm-html-message-avatar" src="${escapeHtmlAttribute(senderAvatarUri)}" alt="${escapeHtmlAttribute(senderName)}" loading="lazy">` : ""}
            <div>
              <strong data-dm-searchable="true">${escapeHtml(senderName)}</strong>
              ${senderHandle ? `<span class="dm-html-handle" data-dm-searchable="true">${escapeHtml(senderHandle)}</span>` : ""}
            </div>
          </div>
          <time datetime="${escapeHtmlAttribute(message.sentAt || "")}">${escapeHtml(formatCompactArchiveTimestamp(message.sentAt))}</time>
        </div>
        ${message.text ? `<div class="dm-html-text" data-dm-richtext="true">${renderArchiveHtmlRichText(message.text, message.facets || [])}</div>` : ""}
        ${!message.text && !externalCard ? `<span class="archive-html-empty">${escapeHtml(t("dmHtmlNoText"))}</span>` : ""}
        ${externalCard ? `
          <a class="dm-html-link-card" href="${escapeHtmlAttribute(externalCard.url)}" target="_blank" rel="noreferrer noopener">
            ${externalThumbUri ? `<img class="dm-html-link-card-thumb" src="${escapeHtmlAttribute(externalThumbUri)}" alt="">` : ""}
            <span class="dm-html-link-card-copy">
              <strong>${escapeHtml(externalCard.title || externalCard.url)}</strong>
              ${externalCard.description ? `<span>${escapeHtml(externalCard.description)}</span>` : ""}
              <small>${escapeHtml(shortenArchiveUrlForDisplay(externalCard.url))}</small>
            </span>
          </a>
        ` : ""}
      </article>
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
        --bg: #eff5ff;
        --panel: rgba(255, 255, 255, 0.92);
        --line: rgba(88, 118, 160, 0.16);
        --text: #10233e;
        --muted: #627895;
        --accent: #2d72f6;
        --accent-soft: rgba(45, 114, 246, 0.12);
        --own: #dce9ff;
        --other: #ffffff;
        --shadow: 0 24px 44px rgba(24, 41, 75, 0.12);
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Segoe UI", Aptos, Arial, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(45, 114, 246, 0.12), transparent 24%),
          linear-gradient(180deg, #eff6ff 0%, #edf3fb 100%);
        color: var(--text);
      }
      a { color: var(--accent); }
      mark {
        background: #ffec99;
        color: #10233e;
        border-radius: 0.22em;
        padding: 0 0.12em;
      }
      .dm-html-shell {
        width: min(1100px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 56px;
      }
      .dm-html-hero,
      .dm-html-toolbar,
      .dm-html-message {
        background: var(--panel);
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }
      .dm-html-hero,
      .dm-html-toolbar {
        border-radius: 24px;
        padding: 24px;
        margin-bottom: 18px;
      }
      .dm-html-kicker {
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.74rem;
        color: var(--muted);
      }
      .dm-html-hero h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3rem);
      }
      .dm-html-hero p {
        margin: 10px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .dm-html-partner {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: 10px;
      }
      .dm-html-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        object-fit: cover;
        background: #dfe8f7;
        border: 1px solid rgba(102, 133, 178, 0.22);
        flex: 0 0 56px;
      }
      .dm-html-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 18px;
      }
      .dm-html-meta strong {
        display: block;
        font-size: 1.3rem;
      }
      .dm-html-toolbar-row {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) auto;
        gap: 12px;
        align-items: end;
      }
      .dm-html-field label,
      .dm-html-status {
        display: block;
        font-size: 0.82rem;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .dm-html-field input {
        width: 100%;
        min-height: 46px;
        border-radius: 14px;
        border: 1px solid var(--line);
        padding: 0 14px;
        font: inherit;
      }
      .dm-html-toolbar button {
        min-height: 46px;
        border: 0;
        border-radius: 14px;
        padding: 0 16px;
        background: var(--accent-soft);
        color: var(--accent);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .dm-html-status {
        margin-top: 12px;
      }
      .dm-html-feed {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .dm-html-message {
        border-radius: 22px;
        padding: 18px 20px;
      }
      .dm-html-message.is-own {
        margin-left: auto;
        width: min(78%, 760px);
        background: linear-gradient(180deg, #edf4ff 0%, var(--own) 100%);
      }
      .dm-html-message.is-other {
        margin-right: auto;
        width: min(78%, 760px);
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      }
      .dm-html-message-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
      }
      .dm-html-message-author {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dm-html-message-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        object-fit: cover;
        background: #dfe8f7;
        border: 1px solid rgba(102, 133, 178, 0.22);
        flex: 0 0 34px;
      }
      .dm-html-message-head strong {
        font-size: 1rem;
      }
      .dm-html-handle,
      .dm-html-message time {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .dm-html-text {
        margin-top: 12px;
        line-height: 1.65;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      .dm-html-link-card {
        margin-top: 14px;
        display: grid;
        grid-template-columns: minmax(0, 112px) minmax(0, 1fr);
        gap: 14px;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.72);
        color: inherit;
        text-decoration: none;
      }
      .dm-html-link-card-thumb {
        width: 112px;
        height: 84px;
        object-fit: cover;
        border-radius: 12px;
        background: rgba(16, 35, 62, 0.08);
      }
      .dm-html-link-card-copy {
        min-width: 0;
        display: grid;
        gap: 6px;
      }
      .dm-html-link-card-copy strong,
      .dm-html-link-card-copy span,
      .dm-html-link-card-copy small {
        overflow-wrap: anywhere;
      }
      .dm-html-link-card-copy span,
      .dm-html-link-card-copy small {
        color: var(--muted);
      }
      [hidden] { display: none !important; }
      @media (max-width: 780px) {
        .dm-html-toolbar-row {
          grid-template-columns: 1fr;
        }
        .dm-html-message.is-own,
        .dm-html-message.is-other {
          width: 100%;
        }
        .dm-html-link-card {
          grid-template-columns: 1fr;
        }
        .dm-html-link-card-thumb {
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 3;
        }
      }
    </style>
  </head>
  <body>
    <main class="dm-html-shell">
      <section class="dm-html-hero">
        <p class="dm-html-kicker">${escapeHtml(t("dmHeaderEyebrow"))}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(t("dmHtmlGenerated", { date: formatCompactArchiveTimestamp(exportedAt) }))}</p>
        <div class="dm-html-partner">
          ${partnerAvatarUri ? `<img class="dm-html-avatar" src="${escapeHtmlAttribute(partnerAvatarUri)}" alt="${escapeHtmlAttribute(partner?.displayName || partner?.handle || "")}" loading="lazy">` : ""}
          <p>${escapeHtml(t("dmPartnerLabel"))}: ${escapeHtml(partner?.displayName || "")}${partner?.handle ? ` · @${escapeHtml(partner.handle)}` : ""}</p>
        </div>
        <p>${escapeHtml(t("dmArchiveRangeValue", {
          from: rangeFrom ? formatCompactArchiveTimestamp(rangeFrom) : "…",
          to: rangeTo ? formatCompactArchiveTimestamp(rangeTo) : "…",
        }))}</p>
        <div class="dm-html-meta">
          <div><span>${escapeHtml(t("dmSummaryConversationsLabel"))}</span><strong>${Number(catalog?.manifest?.conversationCount) || 0}</strong></div>
          <div><span>${escapeHtml(t("dmSummaryMessagesLabel"))}</span><strong>${Number(catalog?.manifest?.messageCount) || 0}</strong></div>
          <div><span>${escapeHtml(t("dmSummaryParticipantsLabel"))}</span><strong>${Number(catalog?.manifest?.participantCount) || 0}</strong></div>
        </div>
      </section>
      <section class="dm-html-toolbar">
        <div class="dm-html-toolbar-row">
          <div class="dm-html-field">
            <label for="dm-search">${escapeHtml(t("dmHtmlSearchLabel"))}</label>
            <input id="dm-search" type="search" placeholder="${escapeHtmlAttribute(t("dmHtmlSearchLabel"))}">
          </div>
          <button type="button" id="dm-reset">${escapeHtml(t("dmHtmlResetFilters"))}</button>
        </div>
        <p class="dm-html-status" id="dm-status">${escapeHtml(t("dmHtmlVisibleStatus", { visible: messages.length, total: messages.length }))}</p>
      </section>
      <section class="dm-html-feed" id="dm-feed">
        ${messagesMarkup}
      </section>
    </main>
    <script>
      const currentLocale = ${localePayload};
      const htmlI18n = ${i18nPayload};
      const supported = Object.keys(htmlI18n || {});
      const browserLocale = (navigator.languages && navigator.languages.find((entry) => supported.includes(String(entry).slice(0, 2))))
        || (navigator.language && supported.includes(String(navigator.language).slice(0, 2)) ? String(navigator.language).slice(0, 2) : "")
        || currentLocale
        || "en";
      const strings = htmlI18n[browserLocale] || htmlI18n.en || {};
      const searchInput = document.getElementById("dm-search");
      const resetButton = document.getElementById("dm-reset");
      const statusNode = document.getElementById("dm-status");
      const messages = Array.from(document.querySelectorAll("[data-dm-message]"));

      function t(key, vars = {}) {
        let value = strings[key] || key;
        Object.entries(vars).forEach(([name, replacement]) => {
          value = value.replace(new RegExp("\\\\{" + name + "\\\\}", "g"), String(replacement));
        });
        return value;
      }

      function escapeRegExp(value) {
        return String(value).replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
      }

      function clearHighlights(node) {
        node.querySelectorAll("mark[data-dm-highlight]").forEach((mark) => {
          const parent = mark.parentNode;
          if (!parent) {
            return;
          }
          parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
          parent.normalize();
        });
      }

      function highlightNode(node, query) {
        clearHighlights(node);
        if (!query) {
          return;
        }
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const matches = [];
        const regex = new RegExp(escapeRegExp(query), "ig");
        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          if (!textNode.nodeValue || !textNode.nodeValue.trim()) {
            continue;
          }
          let match;
          while ((match = regex.exec(textNode.nodeValue))) {
            matches.push({ node: textNode, start: match.index, end: match.index + match[0].length });
          }
        }
        matches.reverse().forEach((entry) => {
          const range = document.createRange();
          range.setStart(entry.node, entry.start);
          range.setEnd(entry.node, entry.end);
          const mark = document.createElement("mark");
          mark.setAttribute("data-dm-highlight", "true");
          range.surroundContents(mark);
        });
      }

      function updateFilter() {
        const query = String(searchInput.value || "").trim().toLowerCase();
        let visible = 0;
        messages.forEach((message) => {
          const haystack = String(message.dataset.search || "");
          const matches = !query || haystack.includes(query);
          message.hidden = !matches;
          if (matches) {
            visible += 1;
          }
          message.querySelectorAll("[data-dm-searchable], [data-dm-richtext]").forEach((node) => highlightNode(node, query));
        });
        statusNode.textContent = visible
          ? t("dmHtmlVisibleStatus", { visible, total: messages.length })
          : t("dmHtmlNoMatches");
      }

      searchInput.addEventListener("input", updateFilter);
      resetButton.addEventListener("click", () => {
        searchInput.value = "";
        updateFilter();
      });
      updateFilter();
    </script>
  </body>
</html>`;
}

async function exportDmHtmlFromCatalog(catalog = dmCatalog) {
  assertDmAccessUnlocked();
  if (!catalog) {
    throw new Error(t("dmNeedArchive"));
  }
  await ensureDmAvatarAssets(catalog);
  setDmProgress({
    title: t("dmProgressHtmlTitle"),
    step: t("dmProgressHtmlStep"),
    percent: 92,
    detail: t("dmProgressHtmlDetail", { count: catalog?.manifest?.messageCount || 0 }),
  });
  const html = buildDmHtmlDocument(catalog);
  const fileName = `${makeDmArchiveFileBaseName(catalog)}.html`;
  const file = new File([html], fileName, { type: "text/html" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setDmProgress({
    title: t("dmProgressDoneTitle"),
    step: t("dmProgressDoneStep"),
    percent: 100,
    detail: t("dmHtmlDone"),
  });
}

function estimateDmPdfMessageHeight(context, message, maxWidth, scale) {
  context.font = `${13 * scale}px "Segoe UI", Aptos, sans-serif`;
  const lineHeight = 18 * scale;
  const avatarOffset = message.senderAvatarPath ? (38 * scale) : 0;
  const textLines = buildWrappedPdfLines(context, message.text || "", maxWidth - (36 * scale) - avatarOffset, message.facets || []);
  const textHeight = Math.max(lineHeight, textLines.length * lineHeight);
  return (72 * scale) + textHeight;
}

function paginateDmPdfMessages(messages, catalog) {
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext("2d");
  const scale = canvas.width / 595;
  const top = 112 * scale;
  const bottom = 88 * scale;
  const left = 54 * scale;
  const right = 54 * scale;
  const maxBubbleWidth = (canvas.width - left - right) * 0.76;
  const pages = [];
  let currentPage = [];
  let currentHeight = top;
  const selfDid = catalog?.manifest?.account?.did || "";

  messages.forEach((message, index) => {
    const isOwn = message.senderDid && message.senderDid === selfDid;
    const width = Math.max(320 * scale, maxBubbleWidth);
    const height = estimateDmPdfMessageHeight(context, message, width, scale);
    if (currentPage.length > 0 && currentHeight + height > canvas.height - bottom) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = top;
    }
    currentPage.push({
      message,
      isOwn,
      x: isOwn ? (canvas.width - right - width) : left,
      y: currentHeight,
      width,
      height,
    });
    currentHeight += height + (14 * scale);
    if (index === messages.length - 1 && currentPage.length > 0) {
      pages.push(currentPage);
    }
  });

  return pages.length > 0 ? pages : [[]];
}

async function renderDmPdfCanvasPage(catalog, assetMap, entries, pageIndex, pageCount) {
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext("2d");
  const scale = canvas.width / 595;
  const annotations = [];
  const partner = getDmPrimaryPartner(catalog);
  const handle = catalog?.manifest?.account?.handle || "";
  const partnerAvatarAsset = partner?.avatarPath ? assetMap.get(partner.avatarPath) : null;

  context.fillStyle = "#f3f7ff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#10233e";
  context.font = `700 ${24 * scale}px "Segoe UI", Aptos, sans-serif`;
  context.fillText(getDmConversationTitle(entries[0]?.message?.conversation || catalog?.conversations?.[0], catalog), 54 * scale, 44 * scale);
  if (partnerAvatarAsset) {
    const avatarBitmap = await loadArchiveAssetBitmap(partnerAvatarAsset);
    drawCircularImageCover(context, avatarBitmap, canvas.width - (122 * scale), 30 * scale, 42 * scale);
    avatarBitmap.close();
  }
  context.font = `${12 * scale}px "Segoe UI", Aptos, sans-serif`;
  context.fillStyle = "#5f7593";
  context.fillText(`${t("dmPartnerLabel")}: ${partner?.displayName || ""}${partner?.handle ? ` · @${partner.handle}` : ""}`, 54 * scale, 70 * scale);
  context.fillText(`@${handle} · ${formatCompactArchiveTimestamp(catalog?.manifest?.exportedAt || "")}`, 54 * scale, 88 * scale);
  context.fillText(`${pageIndex + 1}/${pageCount}`, canvas.width - (90 * scale), 88 * scale);

  for (const entry of entries) {
    const { message, isOwn, x, y, width, height } = entry;
    fillRoundedRect(context, x, y, width, height, 20 * scale, isOwn ? "#dce9ff" : "#ffffff");
    strokeRoundedRect(context, x, y, width, height, 20 * scale, isOwn ? "#b8cdf5" : "#d7e1f0", 1.2 * scale);

    const avatarSize = 28 * scale;
    const avatarX = x + (18 * scale);
    const avatarY = y + (12 * scale);
    const senderAvatarAsset = message.senderAvatarPath ? assetMap.get(message.senderAvatarPath) : null;
    const textInsetX = senderAvatarAsset ? (avatarX + avatarSize + (10 * scale)) : (x + (18 * scale));

    if (senderAvatarAsset) {
      const avatarBitmap = await loadArchiveAssetBitmap(senderAvatarAsset);
      drawCircularImageCover(context, avatarBitmap, avatarX, avatarY, avatarSize);
      avatarBitmap.close();
    }

    context.fillStyle = "#10233e";
    context.font = `700 ${13 * scale}px "Segoe UI", Aptos, sans-serif`;
    const senderName = message.senderDisplayName || message.senderHandle || message.senderDid || handle;
    context.fillText(senderName, textInsetX, y + (14 * scale));

    if (message.senderHandle) {
      context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillStyle = "#5f7593";
      context.fillText(`@${message.senderHandle}`, textInsetX, y + (32 * scale));
    }

    context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillStyle = "#5f7593";
    const timeLabel = formatCompactArchiveTimestamp(message.sentAt);
    const timeWidth = context.measureText(timeLabel).width;
    context.fillText(timeLabel, x + width - timeWidth - (18 * scale), y + (16 * scale));

    context.font = `${13 * scale}px "Segoe UI", Aptos, sans-serif`;
    const lines = buildWrappedPdfLines(context, message.text || "", width - (36 * scale) - (senderAvatarAsset ? (avatarSize + (10 * scale)) : 0), message.facets || []);
    const textBlock = drawArchivePdfTextBlock(context, lines, textInsetX, y + (46 * scale), 18 * scale);
    annotations.push(...textBlock.annotations.map((annotation) => ({
      rect: canvasRectToPdfRect(annotation, canvas.width, canvas.height),
      url: annotation.url,
    })));
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

async function exportDmPdfFromCatalog(catalog = dmCatalog) {
  assertDmAccessUnlocked();
  if (!catalog) {
    throw new Error(t("dmNeedArchive"));
  }
  await ensureDmAvatarAssets(catalog);
  const messages = collectDmMessagesForExport(catalog);
  const assetMap = new Map((catalog.assets || []).map((asset) => [asset.path, asset]));
  const pagesData = paginateDmPdfMessages(messages, catalog);
  const pages = [];

  for (const [pageIndex, entries] of pagesData.entries()) {
    setDmProgress({
      title: t("dmProgressPdfTitle"),
      step: t("dmProgressPdfStep", { index: pageIndex + 1, count: pagesData.length }),
      percent: Math.round((pageIndex / Math.max(1, pagesData.length)) * 100),
      detail: t("dmProgressPdfDetail", { count: messages.length }),
    });
    const rendered = await renderDmPdfCanvasPage(catalog, assetMap, entries, pageIndex, pagesData.length);
    pages.push({
      content: `q 595 0 0 842 0 0 cm /PageImage${pageIndex + 1} Do Q`,
      images: [{
        name: `PageImage${pageIndex + 1}`,
        width: rendered.width,
        height: rendered.height,
        bytes: rendered.bytes,
      }],
      annotations: rendered.annotations,
    });
  }

  const blob = buildPdfFile(pages);
  const fileName = `${makeDmArchiveFileBaseName(catalog)}.pdf`;
  const file = new File([blob], fileName, { type: "application/pdf" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setDmProgress({
    title: t("dmProgressDoneTitle"),
    step: t("dmProgressDoneStep"),
    percent: 100,
    detail: t("dmPdfDone"),
  });
}

async function checkDmAccess() {
  assertDmAccessUnlocked();
  if (!authAccount) {
    throw new Error(t("dmLoadRequiresLogin"));
  }
  setDmProgress({
    title: t("dmCheckTitle"),
    step: t("dmCheckStep"),
    percent: 10,
    detail: "",
  });
  const result = await sendToServiceWorker("CHECK_DM_ACCESS", {}, {
    timeoutMs: 120000,
  });
  dmAccessChecked = result?.ok === true;
  renderDmWorkspace();
  setDmProgress({
    title: t("dmCheckDoneTitle"),
    step: t("dmCheckDoneStep"),
    percent: 100,
    detail: t("dmCheckDoneDetail"),
  });
}

async function loadDmPartners() {
  assertDmAccessUnlocked();
  if (!authAccount) {
    throw new Error(t("dmLoadRequiresLogin"));
  }
  setDmProgress({
    title: t("dmPartnersLoadingTitle"),
    step: t("dmPartnersLoadingStep"),
    percent: 12,
    detail: "",
  });
  const result = await sendToServiceWorker("LIST_DM_PARTNERS", {
    downloadAssets: false,
  }, {
    timeoutMs: 600000,
    onProgress(progress) {
      setDmProgress({
        title: progress.title || t("dmPartnersLoadingTitle"),
        step: progress.step || t("dmPartnersLoadingStep"),
        percent: Number.isFinite(progress.percent) ? progress.percent : 0,
        detail: progress.detail || "",
      });
    },
  });
  dmAccessChecked = true;
  dmRecentContacts = Array.isArray(result?.recentContacts) ? result.recentContacts : [];
  dmRecentConversations = Array.isArray(result?.conversations) ? result.conversations : [];
  dmRecentContactAssets = [];
  dmPartnerCacheAccountDid = authAccountDid || "";
  dmPartnerCacheUpdatedAt = "";
  dmSelectedParticipantDids = dmSelectedParticipantDids.filter((did) => dmRecentContacts.some((contact) => contact.did === did));
  renderDmWorkspace();
  await saveDmPartnerCache();
  setDmProgress({
    title: t("dmPartnersLoadingTitle"),
    step: "Partnerliste geladen",
    percent: 55,
    detail: `${dmRecentContacts.length} DM-Partner werden angezeigt. Avatar-Bilder werden jetzt gesichert …`,
  });
  const hydrated = await sendToServiceWorker("HYDRATE_DM_PARTNER_AVATARS", {
    recentContacts: dmRecentContacts,
    conversations: dmRecentConversations,
  }, {
    timeoutMs: 600000,
    onProgress(progress) {
      setDmProgress({
        title: progress.title || t("dmPartnersLoadingTitle"),
        step: progress.step || t("dmPartnersLoadingStep"),
        percent: Number.isFinite(progress.percent) ? progress.percent : 0,
        detail: progress.detail || "",
      });
    },
  });
  dmRecentContacts = Array.isArray(hydrated?.recentContacts) ? hydrated.recentContacts : dmRecentContacts;
  dmRecentConversations = Array.isArray(hydrated?.conversations) ? hydrated.conversations : dmRecentConversations;
  dmRecentContactAssets = Array.isArray(hydrated?.assets) ? hydrated.assets : [];
  dmSelectedParticipantDids = dmSelectedParticipantDids.filter((did) => dmRecentContacts.some((contact) => contact.did === did));
  renderDmWorkspace();
  await saveDmPartnerCache();
  setDmProgress({
    title: t("dmPartnersDoneTitle"),
    step: t("dmPartnersDoneStep"),
    percent: 100,
    detail: t("dmPartnersDoneDetail", { count: dmRecentContacts.length }),
  });
}

async function loadDmArchive() {
  assertDmAccessUnlocked();
  if (!authAccount) {
    throw new Error(t("dmLoadRequiresLogin"));
  }
  if (dmSelectedParticipantDids.length !== 1) {
    throw new Error(t("dmNeedPartnerSelection"));
  }
  if (!dmAccessChecked) {
    await checkDmAccess();
  }

  const filters = getDmFilters();
  setDmProgress({
    title: t("dmProgressLoadingTitle"),
    step: t("dmProgressLoadingStep"),
    percent: 4,
    detail: "",
  });

  const catalog = await sendToServiceWorker("EXPORT_DM_ARCHIVE", {
    filters,
    partnerCache: {
      recentContacts: Array.isArray(dmRecentContacts) ? dmRecentContacts : [],
      conversations: Array.isArray(dmRecentConversations) ? dmRecentConversations : [],
      assets: Array.isArray(dmRecentContactAssets) ? dmRecentContactAssets : [],
    },
  }, {
    timeoutMs: 600000,
    onProgress(progress) {
      setDmProgress({
        title: progress.title || t("dmProgressLoadingTitle"),
        step: progress.step || t("dmProgressLoadingStep"),
        percent: Number.isFinite(progress.percent) ? progress.percent : 0,
        detail: progress.detail || "",
      });
    },
  });

  dmCatalog = catalog;
  dmRecentContacts = Array.isArray(catalog?.recentContacts) ? catalog.recentContacts : [];
  dmRecentConversations = Array.isArray(catalog?.conversations) ? catalog.conversations : [];
  dmRecentContactAssets = Array.isArray(catalog?.assets) ? catalog.assets.filter((asset) => String(asset.path || "").startsWith("dm-avatars/")) : [];
  dmPartnerCacheAccountDid = authAccountDid || "";
  dmSelectedParticipantDids = dmSelectedParticipantDids.filter((did) => dmRecentContacts.some((contact) => contact.did === did));
  renderDmWorkspace();
  await saveDmPartnerCache();
  setDmProgress({
    title: t("dmProgressDoneTitle"),
    step: t("dmProgressDoneStep"),
    percent: 100,
    detail: t("dmLoadedNotice", {
      conversations: catalog?.manifest?.conversationCount || 0,
      messages: catalog?.manifest?.messageCount || 0,
    }),
  });
}

function getArchiveFilters() {
  const hasExplicitRange = Boolean(archiveFromInput.value || archiveToInput.value);
  return {
    scope: hasExplicitRange ? "range" : archiveScopeSelect.value,
    contentMode: archiveContentModeSelect.value || "posts",
    year: archiveYearInput.value.trim(),
    from: archiveFromInput.value || "",
    to: archiveToInput.value || "",
    hashtagTags: normalizeSelectedHashtagEntries(archiveSelectedHashtags, hashtags),
    hashtagScope: archiveHashtagScope === "startpost" ? "startpost" : "thread",
  };
}

function getArchivePdfOptions() {
  return {
    bandSize: Math.max(100, Math.min(1000, Number(archiveBandSizeSelect.value) || 200)),
    imageSize: archiveImageSizeSelect.value || "medium",
    includeMetrics: archiveMetricsToggle.checked,
    keepThreadsTogether: archiveThreadsToggle.checked,
    indentThreads: archivePdfIndentToggle ? archivePdfIndentToggle.checked : true,
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
    livePreview: archiveLivePreviewToggle ? archiveLivePreviewToggle.checked : true,
    threadImportMode: archiveThreadImportModeSelect?.value === "tree"
      ? "tree"
      : (archiveThreadImportModeSelect?.value === "author" ? "author" : "path"),
  };
}

function applyArchivePreferences(preferences = {}) {
  const filters = preferences.filters || {};
  archiveScopeSelect.value = filters.scope === "year" || filters.scope === "range" ? filters.scope : "all";
  archiveContentModeSelect.value = ["posts", "thread_roots", "threads", "full"].includes(filters.contentMode)
    ? filters.contentMode
    : "posts";
  archiveYearInput.value = String(filters.year || "");
  archiveFromInput.value = String(filters.from || "");
  archiveToInput.value = String(filters.to || "");
  archiveSelectedHashtags = normalizeSelectedHashtagEntries(filters.hashtagTags, hashtags);
  archiveHashtagScope = filters.hashtagScope === "startpost" ? "startpost" : "thread";
  archiveHashtagScopeSelect.value = archiveHashtagScope;
  if (archiveThreadImportModeSelect) {
    archiveThreadImportModeSelect.value = preferences.threadImportMode === "tree"
      ? "tree"
      : (preferences.threadImportMode === "author" ? "author" : "path");
  }
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
  if (archiveImageSizeSelect) {
    archiveImageSizeSelect.value = pdfOptions.imageSize === "small" || pdfOptions.imageSize === "large" ? pdfOptions.imageSize : "medium";
  }
  if (archiveMetricsToggle) {
    archiveMetricsToggle.checked = pdfOptions.includeMetrics !== false;
  }
  if (archiveThreadsToggle) {
    archiveThreadsToggle.checked = pdfOptions.keepThreadsTogether !== false;
  }
  if (archivePdfIndentToggle) {
    archivePdfIndentToggle.checked = pdfOptions.indentThreads !== false;
  }
  if (archiveLivePreviewToggle) {
    archiveLivePreviewToggle.checked = preferences.livePreview !== false;
  }
  updateArchiveScopeFields();
  renderHashtagCloud();
}

function serializeArchiveFilters(filters = getArchiveFilters()) {
  return JSON.stringify(filters);
}

async function persistArchivePreferences() {
  await persistSettings();
}

function applyDmPartnerCache(cache = null) {
  if (!cache || (cache.accountDid && authAccountDid && cache.accountDid !== authAccountDid)) {
    dmRecentContacts = [];
    dmRecentConversations = [];
    dmRecentContactAssets = [];
    dmPartnerCacheAccountDid = "";
    dmPartnerCacheUpdatedAt = "";
    return;
  }

  dmRecentContacts = Array.isArray(cache.recentContacts) ? cache.recentContacts : [];
  dmRecentConversations = Array.isArray(cache.conversations) ? cache.conversations : [];
  dmRecentContactAssets = Array.isArray(cache.assets) ? cache.assets : [];
  dmPartnerCacheAccountDid = String(cache.accountDid || authAccountDid || "");
  dmPartnerCacheUpdatedAt = String(cache.updatedAt || "");
  dmSelectedParticipantDids = dmSelectedParticipantDids.filter((did) => dmRecentContacts.some((contact) => contact.did === did));
}

async function saveDmPartnerCache() {
  if (!authAccountDid) {
    return;
  }
  const cache = {
    accountDid: authAccountDid,
    updatedAt: new Date().toISOString(),
    recentContacts: Array.isArray(dmRecentContacts) ? dmRecentContacts : [],
    conversations: Array.isArray(dmRecentConversations) ? dmRecentConversations : [],
    assets: Array.isArray(dmRecentContactAssets) ? dmRecentContactAssets : [],
  };
  dmPartnerCacheAccountDid = cache.accountDid;
  dmPartnerCacheUpdatedAt = cache.updatedAt;
  await sendToServiceWorker("SAVE_DM_PARTNER_CACHE", { cache }, { timeoutMs: 120000 });
}

async function restoreDmPartnerCache() {
  const cache = await sendToServiceWorker("GET_DM_PARTNER_CACHE", {}, { timeoutMs: 120000 }).catch(() => null);
  applyDmPartnerCache(cache);
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
  archiveLastProgressAt = "";
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
  if (title || step || detail || Number(percent) > 0) {
    archiveLastProgressAt = new Date().toISOString();
  }
  archiveProgressTitle.textContent = title || t("archiveProgressIdleTitle");
  archiveProgressStep.textContent = step || t("archiveProgressIdleStep");
  archiveProgressDetail.textContent = detail || "";
  archiveProgressFill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
  renderArchiveProgressHeartbeat();
  renderArchiveStatusLine();
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

function hasActiveArchiveRun() {
  return activeArchiveRunState === "running" || activeArchiveRunState === "paused";
}

function formatArchiveProgressTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(currentLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

function renderArchiveProgressHeartbeat() {
  if (!archiveProgressHeartbeat) {
    return;
  }
  const time = formatArchiveProgressTime(archiveLastProgressAt);
  archiveProgressHeartbeat.textContent = time ? t("archiveProgressLastHeartbeat", { time }) : "";
}

function renderArchiveBackgroundNotice() {
  if (!archiveBackgroundNotice) {
    return;
  }
  const showNotice = currentWorkspace !== "archive" && hasActiveArchiveRun();
  archiveBackgroundNotice.hidden = !showNotice;
  if (!showNotice) {
    archiveBackgroundNotice.textContent = "";
    return;
  }
  const time = formatArchiveProgressTime(archiveLastProgressAt);
  archiveBackgroundNotice.textContent = activeArchiveRunState === "paused"
    ? t("archiveBackgroundNoticePaused", { time })
    : t("archiveBackgroundNoticeRunning", { time });
}

function renderArchiveStatusLine() {
  renderArchiveBackgroundNotice();
  if (archiveTransientNotice) {
    archiveRunStatusLine.textContent = archiveTransientNotice;
    return;
  }

  const hasActiveArchiveJob = Boolean(
    archiveJobState
    && (String(archiveJobState.step || "").trim() || String(archiveJobState.detail || "").trim())
    && Number(archiveJobState.percent) > 0
    && Number(archiveJobState.percent) < 100,
  );

  if (!archiveSession && activeArchiveRunState === "idle" && !archiveLastCheckpoint && !hasActiveArchiveJob) {
    archiveRunStatusLine.textContent = t("archiveRunStatusIdle");
    return;
  }

  const wave = getArchiveCurrentWave();
  const checkpoint = archiveLastCheckpoint || archivePreviewState?.meta || archiveJobState?.detail || archiveJobState?.step || "";

  if (!archiveSession && activeArchiveRunState === "idle" && hasActiveArchiveJob) {
    archiveRunStatusLine.textContent = checkpoint || t("archiveRunStatusNoCheckpoint");
    return;
  }

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
  archiveTransientNotice = buildArchiveCatalogNotice(archiveCatalog);
}

function buildArchiveCatalogNotice(catalog = archiveCatalog) {
  if (!catalog) {
    return "";
  }

  const values = {
    posts: catalog.posts.length,
    images: catalog.summary.imageCount,
    skipped: catalog.summary.skippedImageCount || 0,
  };
  const threadImportMeta = catalog?.manifest?.threadImport || null;

  if (threadImportMeta?.entryMode === "reply") {
    return t("archiveThreadUrlImportedReplyNotice", values);
  }
  if (threadImportMeta?.entryMode === "root") {
    return t("archiveThreadUrlImportedRootNotice", values);
  }

  return t("archiveImportedNotice", values);
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
  renderArchiveBackgroundNotice();
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
    skipped: catalog.summary?.skippedImageCount || 0,
  });
  const threadImportMeta = catalog?.manifest?.threadImport || null;
  const sourceNote = document.createElement("p");
  sourceNote.className = "settings-note";
  if (threadImportMeta?.entryMode === "reply") {
    sourceNote.textContent = t("archiveThreadUrlImportedReplyShort");
  } else if (threadImportMeta?.entryMode === "root") {
    sourceNote.textContent = t("archiveThreadUrlImportedRootShort");
  }
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
  card.append(title, note);
  if (sourceNote.textContent) {
    card.append(sourceNote);
  }
  card.append(resume, actions);
  archiveResults.appendChild(card);
}

function renderArchiveWorkspace() {
  updateArchiveScopeFields();
  renderArchiveSpec();
  updateArchiveSummary();
  renderArchiveResults();
  archiveNextWaveButton.disabled = !authAccount || Boolean(archiveSession && !archiveSession.hasMore && archiveSession.exportedPosts > 0);
  if (archiveExportMediaZipButton) {
    archiveExportMediaZipButton.disabled = !authAccount;
  }
  updateArchiveRunControls();
  renderArchiveStatusLine();
  renderArchiveStartHint();
  renderArchiveProgressHeartbeat();
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
  archiveLastProgressAt = "";
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

function updateClearButtonState() {
  clearButton.disabled = composerLocked || !sourceText.value.trim();
}

function updateComposerLockState() {
  const composerHashtagLocked = composerLocked && !isArchiveHashtagContext();
  sourceText.disabled = composerLocked;
  counterToggle.disabled = composerLocked;
  threadIntroToggle.disabled = composerLocked;
  threadEmojiToggle.disabled = composerLocked;
  markerSpacingToggle.disabled = composerLocked;
  postSettingsButton.disabled = composerLocked;
  hashtagInput.disabled = composerHashtagLocked;
  hashtagAddButton.disabled = composerHashtagLocked;
  hashtagPlacementSelect.disabled = composerHashtagLocked;
  updateClearButtonState();
  composerLockNote.hidden = !composerLocked;
  hashtagsPane?.classList.toggle("is-locked", composerHashtagLocked);
  renderHashtagCloud();
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

function getThreadIntroText() {
  return t("threadIntroText");
}

function getNormalizedPostLanguagesOrDefault() {
  const normalized = normalizePostLanguageTags(selectedPostLanguages);
  if (normalized.length > 0) {
    return normalized;
  }
  return inferDefaultPostLanguages(currentLocale);
}

function normalizePostInteractionSettings(value = {}) {
  const normalizedMode = ["everyone", "nobody", "custom"].includes(value.replyMode)
    ? value.replyMode
    : DEFAULT_POST_INTERACTION_SETTINGS.replyMode;

  return {
    replyMode: normalizedMode,
    allowFollowers: value.allowFollowers === true,
    allowFollowing: value.allowFollowing === true,
    allowMentioned: value.allowMentioned === true,
    quotePostsAllowed: value.quotePostsAllowed !== false,
  };
}

function getCurrentPostInteractionSettings() {
  return normalizePostInteractionSettings({
    replyMode,
    allowFollowers: replyAllowFollowers,
    allowFollowing: replyAllowFollowing,
    allowMentioned: replyAllowMentioned,
    quotePostsAllowed,
  });
}

function applyPostInteractionSettings(value = {}) {
  const normalized = normalizePostInteractionSettings(value);
  replyMode = normalized.replyMode;
  replyAllowFollowers = normalized.allowFollowers;
  replyAllowFollowing = normalized.allowFollowing;
  replyAllowMentioned = normalized.allowMentioned;
  quotePostsAllowed = normalized.quotePostsAllowed;

  replyModeEveryoneInput.checked = replyMode === "everyone";
  replyModeNobodyInput.checked = replyMode === "nobody";
  replyModeCustomInput.checked = replyMode === "custom";
  replyAllowFollowersInput.checked = replyAllowFollowers;
  replyAllowFollowingInput.checked = replyAllowFollowing;
  replyAllowMentionedInput.checked = replyAllowMentioned;
  quotePostsToggle.checked = quotePostsAllowed;
  renderPostInteractionControls();
}

function renderPostInteractionControls() {
  const isCustom = replyMode === "custom";
  [replyAllowFollowersInput, replyAllowFollowingInput, replyAllowMentionedInput].forEach((input) => {
    input.disabled = !isCustom;
    input.closest(".toggle")?.classList.toggle("is-disabled", !isCustom);
  });
}

function getReplyModeSummary() {
  if (replyMode === "nobody") {
    return t("replyModeNobody");
  }

  if (replyMode === "custom") {
    const labels = [];
    if (replyAllowFollowers) {
      labels.push(t("replyRuleFollowers"));
    }
    if (replyAllowFollowing) {
      labels.push(t("replyRuleFollowing"));
    }
    if (replyAllowMentioned) {
      labels.push(t("replyRuleMentioned"));
    }
    return labels.length > 0
      ? t("replyModeCustomSummary", { rules: labels.join(", ") })
      : t("replyModeNobody");
  }

  return t("replyModeEveryone");
}

function renderPostSettingsDisclosureMeta() {
  postLanguagesDisclosureMeta.textContent = t("postLanguagesDisclosureSummary", {
    count: getNormalizedPostLanguagesOrDefault().length,
  });
  postInteractionDisclosureMeta.textContent = t("postInteractionDisclosureSummary", {
    replyMode: getReplyModeSummary(),
    quotes: quotePostsAllowed ? t("quotesAllowedShort") : t("quotesBlockedShort"),
  });
}

function clampDesktopWidth(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function applyDesktopLayoutState() {
  const resolvedSidebarWidth = clampDesktopWidth(
    sidebarWidthDesktop,
    MIN_SIDEBAR_WIDTH_DESKTOP,
    MAX_SIDEBAR_WIDTH_DESKTOP,
    DEFAULT_SIDEBAR_WIDTH_DESKTOP,
  );
  const resolvedComposerWidth = clampDesktopWidth(
    composerWidthDesktop,
    MIN_COMPOSER_WIDTH_DESKTOP,
    MAX_COMPOSER_WIDTH_DESKTOP,
    DEFAULT_COMPOSER_WIDTH_DESKTOP,
  );

  sidebarWidthDesktop = resolvedSidebarWidth;
  composerWidthDesktop = resolvedComposerWidth;
  document.documentElement.style.setProperty("--desktop-sidebar-width", `${resolvedSidebarWidth}px`);
  document.documentElement.style.setProperty("--desktop-composer-width", `${resolvedComposerWidth}px`);
  scheduleSegmentTextareaResize();
}

async function resetDesktopColumnWidths() {
  sidebarCollapsedDesktop = false;
  sidebarWidthDesktop = DEFAULT_SIDEBAR_WIDTH_DESKTOP;
  composerWidthDesktop = DEFAULT_COMPOSER_WIDTH_DESKTOP;
  applyDesktopLayoutState();
  applySidebarState();
  await persistSettings();
  setStatus(t("resetColumnWidthsDone"));
}

function applySidebarState() {
  const isDesktop = DESKTOP_LAYOUT_MEDIA.matches;
  const shouldCollapse = sidebarCollapsedDesktop;
  document.body.classList.toggle("desktop-sidebar-collapsed", isDesktop && shouldCollapse);
  document.body.classList.toggle("mobile-sidebar-collapsed", !isDesktop && shouldCollapse);
  sidebarToggleButton.setAttribute("aria-expanded", shouldCollapse ? "false" : "true");
  sidebarToggleButton.setAttribute("aria-label", shouldCollapse ? t("sidebarExpandButton") : t("sidebarCollapseButton"));
  sidebarToggleButton.title = shouldCollapse ? t("sidebarExpandButton") : t("sidebarCollapseButton");
  sidebarResizeHandle.setAttribute("aria-label", t("sidebarResizeHandleLabel"));
  composerResizeHandle.setAttribute("aria-label", t("composerResizeHandleLabel"));
  sidebarToggleGlyph.textContent = isDesktop
    ? (shouldCollapse ? "▶" : "◀")
    : (shouldCollapse ? "▼" : "▲");
}

function getDesktopResizeHandleWidth() {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--desktop-resize-handle-width"));
  return Number.isFinite(value) ? value : 14;
}

function startDesktopColumnResize(target) {
  if (!DESKTOP_LAYOUT_MEDIA.matches) {
    return;
  }

  const resizeTarget = target === "sidebar" ? "sidebar" : "composer";
  const bodyRect = document.body.getBoundingClientRect();

  const handlePointerMove = (event) => {
    if (resizeTarget === "sidebar") {
      sidebarWidthDesktop = clampDesktopWidth(
        event.clientX - bodyRect.left,
        MIN_SIDEBAR_WIDTH_DESKTOP,
        MAX_SIDEBAR_WIDTH_DESKTOP,
        DEFAULT_SIDEBAR_WIDTH_DESKTOP,
      );
    } else {
      const sidebarWidth = sidebarCollapsedDesktop
        ? DEFAULT_SIDEBAR_WIDTH_DESKTOP
        : clampDesktopWidth(
          sidebarWidthDesktop,
          MIN_SIDEBAR_WIDTH_DESKTOP,
          MAX_SIDEBAR_WIDTH_DESKTOP,
          DEFAULT_SIDEBAR_WIDTH_DESKTOP,
        );
      const nextComposerWidth = event.clientX - bodyRect.left - sidebarWidth - getDesktopResizeHandleWidth();
      composerWidthDesktop = clampDesktopWidth(
        nextComposerWidth,
        MIN_COMPOSER_WIDTH_DESKTOP,
        MAX_COMPOSER_WIDTH_DESKTOP,
        DEFAULT_COMPOSER_WIDTH_DESKTOP,
      );
    }
    applyDesktopLayoutState();
    scheduleSegmentTextareaResize();
  };

  const handlePointerUp = async () => {
    document.body.classList.remove("desktop-resizing");
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
    await persistSettings();
  };

  document.body.classList.add("desktop-resizing");
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp, { once: true });
  window.addEventListener("pointercancel", handlePointerUp, { once: true });
}

function renderPostLanguageSummary() {
  selectedPostLanguages = getNormalizedPostLanguagesOrDefault();
  const labels = selectedPostLanguages.map((tag) => getPostLanguageDisplayName(tag, currentLocale));
  const summaryParts = [];
  summaryParts.push(labels.length === 1
    ? t("postLanguagesSummarySingle", { language: labels[0] })
    : t("postLanguagesSummaryMany", {
      count: labels.length,
      languages: labels.join(", "),
    }));

  if (counterToggle.checked) {
    summaryParts.push(t("counterToggle"));
  }
  if (markerSpacingToggle.checked) {
    summaryParts.push(t("markerSpacingToggle"));
  }
  if (threadIntroToggle.checked) {
    summaryParts.push(t("threadIntroToggle"));
  }
  if (threadEmojiToggle.checked) {
    summaryParts.push(t("threadEmojiToggle"));
  }
  summaryParts.push(t("postInteractionSummary", { replyMode: getReplyModeSummary() }));
  if (!quotePostsAllowed) {
    summaryParts.push(t("quotePostsBlockedSummary"));
  }

  postLanguagesSummary.textContent = summaryParts.join(" · ");
  renderPostSettingsDisclosureMeta();
}

function renderPostLanguageDialog() {
  selectedPostLanguages = getNormalizedPostLanguagesOrDefault();
  const options = getPostLanguageOptions(currentLocale, postLanguagesSearch.value);
  postLanguagesList.innerHTML = "";

  if (options.length === 0) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = t("postLanguagesNoResults");
    postLanguagesList.appendChild(empty);
  } else {
    options.forEach((option) => {
      const checked = selectedPostLanguages.includes(option.code);
      const disabled = !checked && selectedPostLanguages.length >= 3;
      const label = document.createElement("label");
      label.className = `post-language-option${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = checked;
      input.disabled = disabled;
      input.addEventListener("change", async () => {
        const nextValues = input.checked
          ? [...selectedPostLanguages, option.code]
          : selectedPostLanguages.filter((entry) => entry !== option.code);
        selectedPostLanguages = normalizePostLanguageTags(nextValues);
        renderPostLanguageSummary();
        renderPostLanguageDialog();
        if (!composerLocked) {
          renderSegments({ preserveOverrides: false });
        }
        await persistSettings();
      });

      const text = document.createElement("span");
      text.textContent = option.name;

      label.append(input, text);
      postLanguagesList.appendChild(label);
    });
  }

  postLanguagesSelectionNote.textContent = t("postLanguagesSelectionNote", {
    count: selectedPostLanguages.length,
    max: 3,
  });
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
  customServerField.placeholder = "https://example.com";
  if (linkCardEndpointInput) {
    linkCardEndpointInput.placeholder = "https://example.com/wp-json/threadline/v1/link-card";
  }
  sourceText.placeholder = t("sourcePlaceholder");
  hashtagInput.placeholder = t("hashtagInputPlaceholder");
  if (networkSearchInput) {
    networkSearchInput.placeholder = t("networkSearchPlaceholder");
  }
  document.querySelectorAll(".help-trigger").forEach((element) => {
    element.setAttribute("aria-label", t("contextHelpButtonLabel"));
    element.setAttribute("title", t("contextHelpButtonLabel"));
  });
  if (networkAccountInput) {
    networkAccountInput.placeholder = t("networkAccountInputPlaceholder");
  }
  if (archiveThreadUrlInput) {
    archiveThreadUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
  }
  if (postEditCheckUrlInput) {
    postEditCheckUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
  }
  if (archiveMediaActorInput) {
    archiveMediaActorInput.placeholder = t("archiveMediaActorPlaceholder");
  }
  loginButton.textContent = t("loginButton");
  loginDialogCancelButton.textContent = t("cancelButton");
  loginDialogCloseTop.textContent = t("closeButton");
  addAccountButton.textContent = t("addAccountButton");
  publishButton.textContent = getPublishButtonLabel();
  clearButton.textContent = t("clearButton");
  settingsButton.textContent = t("settingsButton");
  loadThreadButton.textContent = t("loadThreadButton");
  helpButton.textContent = t("helpButton");
  installButton.textContent = t("installButton");
  saveThreadButton.textContent = t("saveThreadButton");
  themeToggleButton.textContent = themeMode === "dark" ? t("lightModeButton") : t("darkModeButton");
  resetColumnWidthsButton.textContent = t("resetColumnWidthsButton");
  themeStatusNote.textContent = themeMode === "dark" ? t("themeDarkActive") : t("themeLightActive");
  archiveButton.textContent = t("archiveLaunchButton");
  networkButton.textContent = t("networkLaunchButton");
  dmButton.textContent = t("dmLaunchButton");
  networkLoadButton.textContent = networkLoading ? t("networkLoadingButton") : t("networkLoadButton");
  networkResetButton.textContent = t("networkResetButton");
  archiveNextWaveButton.textContent = t("archiveNextWaveButton");
  if (archiveLoadThreadUrlButton) {
    archiveLoadThreadUrlButton.textContent = t("archiveLoadThreadUrlButton");
  }
  if (archiveCheckPostEditButton) {
    archiveCheckPostEditButton.textContent = t("postEditCheckOpenButton");
  }
  if (postEditCheckSubmitButton) {
    postEditCheckSubmitButton.textContent = t("postEditCheckButton");
  }
  archiveExportZipButton.textContent = t("archiveExportZipButton");
  if (archiveExportMediaZipButton) {
    archiveExportMediaZipButton.textContent = t("archiveExportMediaZipButton");
  }
  archiveExportHtmlButton.textContent = t("archiveExportHtmlButton");
  if (archiveExportHtmlCompactButton) {
    archiveExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
  }
  archiveExportPdfButton.textContent = t("archiveExportPdfButton");
  if (archiveActionsExportHtmlButton) {
    archiveActionsExportHtmlButton.textContent = t("archiveExportHtmlButton");
  }
  if (archiveActionsExportHtmlCompactButton) {
    archiveActionsExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
  }
  if (archiveProgressExportHtmlCompactButton) {
    archiveProgressExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
  }
  if (archiveActionsExportPdfButton) {
    archiveActionsExportPdfButton.textContent = t("archiveExportPdfButton");
  }
  archiveImportButton.textContent = t("archiveImportButton");
  updateAuthButtons();
  renderAccountSwitcher();
  archiveResetButton.textContent = t("archiveResetButton");
  dmLoadButton.textContent = t("dmLoadButton");
  dmExportJsonButton.textContent = t("dmExportJsonButton");
  if (dmExportHtmlButton) {
    dmExportHtmlButton.textContent = t("dmExportHtmlButton");
  }
  if (dmExportPdfButton) {
    dmExportPdfButton.textContent = t("dmExportPdfButton");
  }
  dmCheckButton.textContent = t("dmCheckButton");
  dmLoadPartnersButton.textContent = t("dmLoadPartnersButton");
  if (dmContactSearchInput) {
    dmContactSearchInput.placeholder = t("dmContactSearchPlaceholder");
  }
  archivePauseButton.textContent = t("archivePauseButton");
  archiveResumeButton.textContent = t("archiveResumeButton");
  archiveCancelButton.textContent = t("archiveCancelButton");
  renderArchiveProgressHeartbeat();
  renderArchiveBackgroundNotice();
  renderVersionLabel();
  checkUpdatesButton.textContent = t("checkUpdatesButton");
  reloadAppButton.textContent = t("reloadButton");
  exportSettingsButton.textContent = t("exportSettingsButton");
  importSettingsButton.textContent = t("importSettingsButton");
  if (shareAppButton) {
    shareAppButton.textContent = t("shareButton");
  }
  if (shareQrImage) {
    shareQrImage.alt = t("shareQrAlt");
  }
  if (shareUrl) {
    shareUrl.textContent = APP_SHARE_URL;
  }
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
  imageFitDimensionsButton.textContent = t("fitImageDimensionsButton");
  confirmDialogConfirmButton.textContent = t("confirmYes");
  confirmDialogCancelButton.textContent = t("confirmNo");
  publishResultLink.textContent = t("openPostLink");
  historyButton.textContent = t("historyButton");
  composerUnlockButton.textContent = t("composerUnlockButton");
  sidebarToggleButton.setAttribute("aria-label", sidebarCollapsedDesktop ? t("sidebarExpandButton") : t("sidebarCollapseButton"));
  sidebarToggleButton.title = sidebarCollapsedDesktop ? t("sidebarExpandButton") : t("sidebarCollapseButton");
  sidebarResizeHandle.setAttribute("aria-label", t("sidebarResizeHandleLabel"));
  composerResizeHandle.setAttribute("aria-label", t("composerResizeHandleLabel"));
  altTextPreviewCanvas.setAttribute("aria-label", t("altPreviewLabel"));
  hashtagAddButton.textContent = t("addHashtagButton");
  nextTipButton.textContent = t("nextTipButton");
  hideTipsButton.textContent = t("hideTipsButton");
  postSettingsButton.textContent = t("postSettingsButton");
  postLanguagesSearch.placeholder = t("postLanguagesSearchPlaceholder");
  Array.from(hashtagPlacementSelect.options).forEach((option) => {
    if (option.value === "last") {
      option.textContent = t("hashtagPlacementLast");
    } else if (option.value === "all-top") {
      option.textContent = t("hashtagPlacementAllTop");
    } else if (option.value === "all-bottom") {
      option.textContent = t("hashtagPlacementAllBottom");
    } else {
      option.textContent = t("hashtagPlacementFirst");
    }
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
    } else if (option.value === "thread_roots") {
      option.textContent = t("archiveContentModeThreadRoots");
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
  renderNetworkWorkspace();
  renderDmWorkspace();

  const languageNames = t("languageNames");
  Array.from(languageSelect.options).forEach((option) => {
    option.textContent = languageNames[option.value] || option.value;
  });
  languageSelect.value = localePreference;
  renderPostLanguageSummary();
  renderPostInteractionControls();
  renderPostLanguageDialog();
  applySidebarState();

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
  const megabytes = Math.max(0, Number(sizeBytes) || 0) / 1_000_000;
  return `${new Intl.NumberFormat(currentLocale, {
    minimumFractionDigits: megabytes >= 10 ? 1 : 2,
    maximumFractionDigits: megabytes >= 10 ? 1 : 2,
  }).format(megabytes)} MB`;
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

function normalizeHashtagPlacement(value) {
  return VALID_HASHTAG_PLACEMENTS.has(value) ? value : "first";
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

function setShareStatus(message, tone = "neutral") {
  if (!shareStatus) {
    return;
  }
  window.clearTimeout(shareStatusTimer);
  shareStatus.textContent = message;
  shareStatus.hidden = !message;
  if (message) {
    shareStatus.dataset.tone = tone;
  } else {
    delete shareStatus.dataset.tone;
  }
  if (message) {
    shareStatusTimer = window.setTimeout(() => {
      shareStatus.hidden = true;
      shareStatus.textContent = "";
      delete shareStatus.dataset.tone;
    }, 5000);
  }
}

async function shareAppRecommendation() {
  const payload = {
    title: APP_SHARE_TITLE,
    text: t("shareAppText"),
    url: APP_SHARE_URL,
  };

  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }

    const shareText = `${payload.text}\n${payload.url}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      setShareStatus(t("shareCopied"));
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = shareText;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    helper.style.pointerEvents = "none";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    setShareStatus(t("shareCopied"));
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    setShareStatus(t("shareUnavailable"), "error");
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
    fitMode: "contain",
  };
}

function isImageUsingDefaultEdit(image) {
  const edit = normalizeImageEdit(image?.edit);
  return edit.zoom === 1
    && edit.offsetX === 0
    && edit.offsetY === 0
    && edit.flipX === false
    && edit.flipY === false
    && edit.rotation === 0
    && edit.fitMode === "contain";
}

function hasExplicitImageUploadTransform(image) {
  return !isImageUsingDefaultEdit(image)
    || Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image?.exportScale) || 1)) !== 1
    || Math.abs((Number(image?.exportQuality) || 0.88) - 0.88) > 0.001;
}

function normalizeImageEdit(edit = {}) {
  const zoom = Math.min(3, Math.max(0.5, Number(edit.zoom) || 1));
  const offsetX = Number(edit.offsetX) || 0;
  const offsetY = Number(edit.offsetY) || 0;
  const flipX = Boolean(edit.flipX);
  const flipY = Boolean(edit.flipY);
  const rotation = ((((Number(edit.rotation) || 0) % 360) + 360) % 360);
  const fitMode = edit.fitMode === "cover"
    || (
      !Object.prototype.hasOwnProperty.call(edit, "fitMode")
      && (zoom !== 1 || offsetX !== 0 || offsetY !== 0 || flipX || flipY || rotation !== 0)
    )
    ? "cover"
    : "contain";
  return {
    zoom,
    offsetX,
    offsetY,
    flipX,
    flipY,
    rotation,
    fitMode,
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
    exportScale: Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(entry.exportScale) || 1)),
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
    const account = typeof entry?.account === "string" ? entry.account.trim() : "";
    const service = typeof entry?.service === "string" ? entry.service.trim() : "";

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
      account,
      service,
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

function formatHistoryMeta(threadCount, imageCount) {
  const threadWord = t(threadCount === 1 ? "historySectionSingular" : "historySectionPlural");
  const imageWord = t(imageCount === 1 ? "historyImageSingular" : "historyImagePlural");
  return t("historyMeta", {
    threads: threadCount,
    threadWord,
    images: imageCount,
    imageWord,
  });
}

function syncSegmentImages(segmentCount) {
  const next = [];
  for (let index = 0; index < segmentCount; index += 1) {
    next[index] = Array.isArray(segmentImages[index]) ? segmentImages[index] : [];
  }
  segmentImages = next;
}

function dataUrlToFile(dataUrl, fileName = "link-card.jpg") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match) {
    return null;
  }
  const mimeType = match[1] || "image/jpeg";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType });
}

function renderSegmentLinkCard(container, segmentIndex) {
  container.innerHTML = "";
  const card = normalizeLinkCard(segmentLinkCards[segmentIndex]);
  if (!card) {
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "segment-link-card-preview";
  if (card.imageDataUrl) {
    const image = document.createElement("img");
    image.src = card.imageDataUrl;
    image.alt = "";
    image.loading = "lazy";
    wrap.appendChild(image);
  }
  const body = document.createElement("div");
  body.className = "segment-link-card-body";
  const title = document.createElement("strong");
  title.textContent = card.title || card.url;
  const description = document.createElement("span");
  description.textContent = card.description || card.url;
  const url = document.createElement("small");
  url.textContent = card.url;
  body.append(title, description, url);
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "segment-image-tool danger";
  removeButton.title = t("linkCardRemoveButton");
  removeButton.setAttribute("aria-label", t("linkCardRemoveButton"));
  removeButton.innerHTML = createIconSvg("M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z");
  removeButton.addEventListener("click", async () => {
    segmentLinkCards[segmentIndex] = null;
    await persistSettings();
    preserveScrollPosition(() => renderSegments({ preserveOverrides: true }));
    queueDraftSave();
  });
  wrap.append(body, removeButton);
  container.appendChild(wrap);
}

function openLinkCardDialog(segmentIndex, url) {
  pendingLinkCardSegmentIndex = segmentIndex;
  pendingLinkCardUrl = url;
  linkCardUrlNode.textContent = url;
  const hasImages = (segmentImages[segmentIndex]?.length || 0) > 0;
  linkCardWarning.hidden = !hasImages;
  linkCardWarning.textContent = hasImages ? t("linkCardImageConflictWarning") : "";
  linkCardStatus.textContent = "";
  delete linkCardStatus.dataset.tone;
  linkCardCreateButton.textContent = t("linkCardCreateButton");
  linkCardDialog.showModal();
}

function closeLinkCardDialog() {
  pendingLinkCardSegmentIndex = -1;
  pendingLinkCardUrl = "";
  if (linkCardDialog.open) {
    linkCardDialog.close();
  }
}

async function createLinkCardForPendingSegment() {
  const segmentIndex = pendingLinkCardSegmentIndex;
  const url = pendingLinkCardUrl;
  if (segmentIndex < 0 || !url) {
    return;
  }
  const hasImages = (segmentImages[segmentIndex]?.length || 0) > 0;
  if (hasImages) {
    const confirmed = await openConfirmDialog({
      title: t("linkCardImageConflictTitle"),
      message: t("linkCardImageConflictWarning"),
      confirmLabel: t("confirmYes"),
      cancelLabel: t("confirmNo"),
    });
    if (!confirmed) {
      return;
    }
  }
  try {
    setBusy(linkCardCreateButton, true, t("linkCardLoading"), t("linkCardCreateButton"));
    linkCardStatus.textContent = t("linkCardLoading");
    const card = await requestLinkCardFromProxy(url);
    if (!card) {
      throw new Error(t("linkCardProxyFailed"));
    }
    segmentLinkCards[segmentIndex] = card;
    if (hasImages) {
      segmentImages[segmentIndex] = [];
    }
    await persistSettings();
    preserveScrollPosition(() => renderSegments({ preserveOverrides: true }));
    queueDraftSave();
    setStatus(t("linkCardCreated"));
    closeLinkCardDialog();
  } catch (error) {
    console.error(error);
    linkCardStatus.textContent = error.message || t("linkCardProxyFailed");
    linkCardStatus.dataset.tone = "error";
  } finally {
    setBusy(linkCardCreateButton, false, t("linkCardLoading"), t("linkCardCreateButton"));
  }
}

function normalizeLinkCard(card = null) {
  if (!card || typeof card !== "object") {
    return null;
  }
  const url = String(card.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  return {
    url,
    title: String(card.title || url).trim().slice(0, 300),
    description: String(card.description || "").trim().slice(0, 1000),
    imageUrl: String(card.imageUrl || "").trim(),
    imageDataUrl: String(card.imageDataUrl || "").trim(),
    imageMimeType: String(card.imageMimeType || "").trim(),
    createdAt: String(card.createdAt || new Date().toISOString()),
  };
}

function normalizeSegmentLinkCards(cards = []) {
  return (Array.isArray(cards) ? cards : []).map((card) => normalizeLinkCard(card));
}

function syncSegmentLinkCards(segmentCount) {
  const next = [];
  for (let index = 0; index < segmentCount; index += 1) {
    next[index] = normalizeLinkCard(segmentLinkCards[index]);
  }
  segmentLinkCards = next;
}

function getFirstHttpUrl(text) {
  return String(text || "").match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]?.replace(/[.,;:!?]+$/, "") || "";
}

function isLinkCardProxyConfigured() {
  return validateLinkCardProxySettings().ok;
}

function normalizeLinkCardProxyEndpoint(rawEndpoint) {
  const endpoint = String(rawEndpoint || "").trim();
  if (!endpoint) {
    return "";
  }
  if (/^ttps:\/\//i.test(endpoint)) {
    return `h${endpoint}`;
  }
  if (/^\/\//.test(endpoint)) {
    return `https:${endpoint}`;
  }
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?\//i.test(endpoint)) {
    return `https://${endpoint}`;
  }
  return "";
}

function normalizeLinkCardSettingsInputs() {
  if (!linkCardEndpointInput) {
    return;
  }
  const normalizedEndpoint = normalizeLinkCardProxyEndpoint(linkCardEndpointInput.value);
  if (normalizedEndpoint && normalizedEndpoint !== linkCardEndpointInput.value.trim()) {
    linkCardEndpointInput.value = normalizedEndpoint;
  }
}

function validateLinkCardProxySettings() {
  const rawEndpoint = String(linkCardEndpointInput?.value || "").trim();
  const endpoint = normalizeLinkCardProxyEndpoint(rawEndpoint);
  const secret = String(linkCardSecretInput?.value || "").trim();
  if (!rawEndpoint && !secret) {
    return { ok: false, message: t("linkCardProxyMissing"), tone: "error", isEmpty: true };
  }
  if (!endpoint) {
    return { ok: false, message: t("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  let parsedEndpoint = null;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return { ok: false, message: t("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  if (!["http:", "https:"].includes(parsedEndpoint.protocol)) {
    return { ok: false, message: t("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  if (!/\/wp-json\/threadline\/v1\/link-card\/?$/i.test(parsedEndpoint.pathname)) {
    return { ok: false, message: t("linkCardProxyUnexpectedEndpoint"), tone: "error", isEmpty: false };
  }
  if (!secret) {
    return { ok: false, message: t("linkCardProxyMissing"), tone: "error", isEmpty: false };
  }
  return { ok: true, message: t("linkCardSettingsSaved"), tone: "", isEmpty: false };
}

function updateLinkCardSettingsStatus({ show = true } = {}) {
  const validation = validateLinkCardProxySettings();
  linkCardEndpointInput?.setCustomValidity(validation.ok || validation.isEmpty ? "" : validation.message);
  if (!linkCardSettingsStatus) {
    return validation;
  }
  linkCardSettingsStatus.hidden = !show && validation.isEmpty;
  linkCardSettingsStatus.textContent = validation.message;
  if (validation.tone) {
    linkCardSettingsStatus.dataset.tone = validation.tone;
  } else {
    delete linkCardSettingsStatus.dataset.tone;
  }
  return validation;
}

function getLinkCardSettings() {
  const endpoint = normalizeLinkCardProxyEndpoint(linkCardEndpointInput?.value);
  return {
    endpoint,
    secret: String(linkCardSecretInput?.value || "").trim(),
  };
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signLinkCardRequest(url, timestamp, nonce, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${url}\n${timestamp}\n${nonce}`),
  );
  return bytesToHex(new Uint8Array(signature));
}

function linkCardImageToDataUrl(image = {}) {
  const bytesBase64 = String(image.bytesBase64 || "").trim();
  if (!bytesBase64) {
    return "";
  }
  const mimeType = String(image.mimeType || "image/jpeg").trim() || "image/jpeg";
  return `data:${mimeType};base64,${bytesBase64}`;
}

async function requestLinkCardFromProxy(url) {
  const validation = updateLinkCardSettingsStatus();
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  const { endpoint, secret } = getLinkCardSettings();
  if (!endpoint || !secret) {
    throw new Error(t("linkCardProxyMissing"));
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const signature = await signLinkCardRequest(url, timestamp, nonce, secret);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-threadline-timestamp": timestamp,
      "x-threadline-nonce": nonce,
      "x-threadline-signature": signature,
    },
    body: JSON.stringify({ url }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.code || t("linkCardProxyFailed"));
  }
  return normalizeLinkCard({
    url: payload.url || payload.finalUrl || url,
    title: payload.title || payload.url || url,
    description: payload.description || "",
    imageUrl: payload.imageUrl || "",
    imageDataUrl: linkCardImageToDataUrl(payload.image),
    imageMimeType: payload.image?.mimeType || "",
  });
}

function getSegmentTextPayloads() {
  return activeSegments.length > 0 ? activeSegments.map((entry) => entry.trim()) : [currentComposedText.trim()];
}

function getSegmentPayloads() {
  const texts = getSegmentTextPayloads();
  return texts.map((text, index) => ({
    text,
    images: Array.isArray(segmentImages[index]) ? segmentImages[index] : [],
    externalCard: normalizeLinkCard(segmentLinkCards[index]),
  }));
}

async function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(t("imageLoadFailed")));
    image.src = dataUrl;
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(t("fileReadFailed"), { cause: reader.error }));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(t("imageBlobCreateFailed"));
  }
  return response.blob();
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

function getSourceDimensions(image, source = null) {
  return {
    width: Math.max(1, Number(source?.width) || Number(image?.width) || 1),
    height: Math.max(1, Number(source?.height) || Number(image?.height) || 1),
  };
}

function getOrientedSourceDimensions(image, edit = image.edit, source = null) {
  const normalizedEdit = normalizeImageEdit(edit);
  const sourceDimensions = getSourceDimensions(image, source);
  const quarterTurn = normalizedEdit.rotation % 180 !== 0;
  return {
    width: quarterTurn ? sourceDimensions.height : sourceDimensions.width,
    height: quarterTurn ? sourceDimensions.width : sourceDimensions.height,
  };
}

function getImageEditorCanvasDimensions(image, edit = image.edit, source = null) {
  const oriented = getOrientedSourceDimensions(image, edit, source);
  const isPortrait = oriented.height > oriented.width;
  return isPortrait
    ? {
        width: IMAGE_EDITOR_CANVAS_HEIGHT,
        height: IMAGE_EDITOR_CANVAS_WIDTH,
      }
    : {
        width: IMAGE_EDITOR_CANVAS_WIDTH,
        height: IMAGE_EDITOR_CANVAS_HEIGHT,
      };
}

function isPortraitEditorImage(image, edit = image.edit, source = null) {
  const oriented = getOrientedSourceDimensions(image, edit, source);
  return oriented.height > oriented.width;
}

function getEditedImageExportDimensions(image, edit = image.edit, source = null, exportScale = 1) {
  const frame = getImageEditorCanvasDimensions(image, edit, source);
  const baseScale = IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH;
  return {
    width: Math.max(320, Math.round(frame.width * baseScale * exportScale)),
    height: Math.max(320, Math.round(frame.height * baseScale * exportScale)),
  };
}

function getImagePreviewFrameDimensions(image) {
  if (isImageUsingDefaultEdit(image)) {
    return getOrientedSourceDimensions(image, image.edit);
  }
  return getEditedImageExportDimensions(image, image.edit);
}

function getContainedPreviewBox(frameWidth, frameHeight, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, Number(frameWidth) || 1);
  const safeHeight = Math.max(1, Number(frameHeight) || 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function getImageMetrics(image, frameWidth, frameHeight, edit = image.edit, fit = null, source = null) {
  const normalizedEdit = normalizeImageEdit(edit);
  const effectiveFit = fit || normalizedEdit.fitMode || "cover";
  const rotation = normalizedEdit.rotation;
  const quarterTurn = rotation % 180 !== 0;
  const sourceDimensions = getSourceDimensions(image, source);
  const sourceWidth = quarterTurn ? sourceDimensions.height : sourceDimensions.width;
  const sourceHeight = quarterTurn ? sourceDimensions.width : sourceDimensions.height;
  const baseScale = effectiveFit === "contain"
    ? Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight)
    : Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const drawWidth = sourceDimensions.width * baseScale * normalizedEdit.zoom;
  const drawHeight = sourceDimensions.height * baseScale * normalizedEdit.zoom;
  const rotatedDrawWidth = quarterTurn ? drawHeight : drawWidth;
  const rotatedDrawHeight = quarterTurn ? drawWidth : drawHeight;
  const maxOffsetX = effectiveFit === "cover"
    ? Math.max(0, (rotatedDrawWidth - frameWidth) / 2)
    : 0;
  const maxOffsetY = effectiveFit === "cover"
    ? Math.max(0, (rotatedDrawHeight - frameHeight) / 2)
    : 0;
  const offsetX = clamp(normalizedEdit.offsetX, -maxOffsetX, maxOffsetX);
  const offsetY = clamp(normalizedEdit.offsetY, -maxOffsetY, maxOffsetY);
  return {
    ...normalizedEdit,
    fitMode: effectiveFit,
    drawWidth,
    drawHeight,
    rotatedDrawWidth,
    rotatedDrawHeight,
    maxOffsetX,
    maxOffsetY,
    offsetX,
    offsetY,
    centerX: frameWidth / 2 + offsetX,
    centerY: frameHeight / 2 + offsetY,
  };
}

function clampImageEditToFrame(image, frameWidth, frameHeight, edit = image.edit, fit = null, source = null) {
  const metrics = getImageMetrics(image, frameWidth, frameHeight, edit, fit, source);
  return {
    zoom: metrics.zoom,
    offsetX: metrics.offsetX,
    offsetY: metrics.offsetY,
    flipX: metrics.flipX,
    flipY: metrics.flipY,
    rotation: metrics.rotation,
    fitMode: metrics.fitMode,
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
  const fit = options.fit || normalizeImageEdit(options.edit || image.edit).fitMode || "cover";
  if (!canvas.width) {
    canvas.width = width;
  }
  if (!canvas.height) {
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bitmap = await loadImageBitmapForDataUrl(image.dataUrl);
  const source = { width: bitmap.width, height: bitmap.height };

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  const metrics = getImageMetrics(image, width, height, options.edit || image.edit, fit, source);
  ctx.translate(metrics.centerX, metrics.centerY);
  ctx.rotate((metrics.rotation * Math.PI) / 180);
  ctx.scale(metrics.flipX ? -1 : 1, metrics.flipY ? -1 : 1);
  ctx.drawImage(bitmap, -metrics.drawWidth / 2, -metrics.drawHeight / 2, metrics.drawWidth, metrics.drawHeight);

  ctx.restore();
  bitmap.close?.();
}

async function renderPreviewCanvas(image, canvas, options = {}) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const cssWidth = Math.max(1, Math.round(options.cssWidth || rect.width || canvas.clientWidth || 220));
  const cssHeight = Math.max(1, Math.round(options.cssHeight || rect.height || canvas.clientHeight || 150));
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  await renderImageToCanvas(image, canvas, {
    width: pixelWidth,
    height: pixelHeight,
    fit: normalizeImageEdit(image.edit).fitMode,
  });
}

async function renderImageToBlob(image) {
  if (!hasExplicitImageUploadTransform(image)) {
    return {
      blob: await dataUrlToBlob(image.dataUrl),
      width: image.width,
      height: image.height,
    };
  }

  if (isImageUsingDefaultEdit(image)) {
    const canvas = document.createElement("canvas");
    const exportScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
    canvas.width = Math.max(1, Math.round((image.width || 1) * exportScale));
    canvas.height = Math.max(1, Math.round((image.height || 1) * exportScale));
    await renderImageToCanvas(image, canvas, {
      width: canvas.width,
      height: canvas.height,
      fit: "contain",
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
    if (!blob) {
      throw new Error(t("imageBlobCreateFailed"));
    }
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const canvas = document.createElement("canvas");
  const exportScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
  const exportDimensions = getEditedImageExportDimensions(image, image.edit, null, exportScale);
  const currentEditorFrame = getImageEditorCanvasDimensions(image, image.edit);
  const scale = exportDimensions.width / currentEditorFrame.width;
  const exportEdit = {
    ...normalizeImageEdit(image.edit),
    offsetX: (Number(image.edit?.offsetX) || 0) * scale,
    offsetY: (Number(image.edit?.offsetY) || 0) * scale,
  };
  canvas.width = exportDimensions.width;
  canvas.height = exportDimensions.height;
  await renderImageToCanvas(image, canvas, {
    width: canvas.width,
    height: canvas.height,
    edit: exportEdit,
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
  if (!blob) {
    throw new Error(t("imageBlobCreateFailed"));
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
  altTextPreviewWrap.hidden = !image.dataUrl;
  if (image.dataUrl) {
    const previewFrame = getImagePreviewFrameDimensions(image);
    const isPortrait = previewFrame.height > previewFrame.width;
    const previewBox = getContainedPreviewBox(
      previewFrame.width,
      previewFrame.height,
      isPortrait ? 220 : 320,
      isPortrait ? 300 : 220,
    );
    altTextPreviewWrap.classList.toggle("is-portrait", isPortrait);
    altTextPreviewCanvas.style.width = `${previewBox.width}px`;
    altTextPreviewCanvas.style.height = `${previewBox.height}px`;
    altTextPreviewCanvas.style.aspectRatio = `${previewFrame.width} / ${previewFrame.height}`;
    void renderPreviewCanvas(image, altTextPreviewCanvas, {
      cssWidth: previewBox.width,
      cssHeight: previewBox.height,
    });
  }
  altTextInput.value = image.alt || "";
  setAltTextCount();
  altTextDialog.showModal();
  window.setTimeout(() => altTextInput.focus(), 0);
}

function closeAltTextDialog() {
  editingAltTarget = null;
  altTextPreviewWrap.hidden = true;
  altTextPreviewWrap.classList.remove("is-portrait");
  const context = altTextPreviewCanvas.getContext("2d");
  context?.clearRect(0, 0, altTextPreviewCanvas.width, altTextPreviewCanvas.height);
  altTextPreviewCanvas.style.removeProperty("width");
  altTextPreviewCanvas.style.removeProperty("height");
  altTextPreviewCanvas.style.removeProperty("aspect-ratio");
  altTextDialog.close();
}

function updateSegmentImageAltDisplay(segmentIndex, imageIndex) {
  const image = segmentImages[segmentIndex]?.[imageIndex];
  const card = segmentsList.querySelector(
    `.segment-image-card[data-segment-index="${segmentIndex}"][data-image-index="${imageIndex}"]`,
  );
  if (!image || !card) {
    return;
  }
  const hasAlt = Boolean(String(image.alt || "").trim());
  const preview = card.querySelector(".segment-image-preview");
  const altState = card.querySelector(".segment-image-alt-state");
  const altButton = card.querySelector('[data-image-action="alt"]');
  if (preview) {
    preview.title = hasAlt ? image.alt : t("altTextMissing");
  }
  if (altState) {
    altState.textContent = hasAlt ? t("altTextAdded") : t("altTextMissing");
    altState.classList.toggle("is-missing-alt", !hasAlt);
  }
  altButton?.classList.toggle("danger", !hasAlt);
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
  updateSegmentImageAltDisplay(segmentIndex, imageIndex);
  updatePublishAvailability();
  queueDraftSave();
  closeAltTextDialog();
}

function cloneImageEdit(edit) {
  return normalizeImageEdit({ ...edit });
}

function getImageEditorSourceDimensions() {
  return imageEditorSourceBitmap
    ? { width: imageEditorSourceBitmap.width, height: imageEditorSourceBitmap.height }
    : null;
}

function clampImageEditorDraftToFrame(image, draft = imageEditorDraft) {
  const canvasDimensions = getImageEditorCanvasDimensions(image, draft, getImageEditorSourceDimensions());
  return clampImageEditToFrame(
    image,
    canvasDimensions.width,
    canvasDimensions.height,
    draft,
    normalizeImageEdit(draft).fitMode,
    getImageEditorSourceDimensions(),
  );
}

async function openImageEditorDialog(segmentIndex, imageIndex) {
  const image = segmentImages[segmentIndex]?.[imageIndex];
  if (!image) {
    return;
  }
  editingImageTarget = { segmentIndex, imageIndex };
  imageEditorSourceBitmap = await loadImageBitmapForDataUrl(image.dataUrl);
  imageEditorDraft = cloneImageEdit(image.edit);
  const canvasDimensions = getImageEditorCanvasDimensions(image, imageEditorDraft, getImageEditorSourceDimensions());
  imageEditorCanvas.width = canvasDimensions.width;
  imageEditorCanvas.height = canvasDimensions.height;
  imageEditorSheet?.classList.toggle("is-portrait-image", isPortraitEditorImage(image, imageEditorDraft, getImageEditorSourceDimensions()));
  imageEditorDraft = clampImageEditorDraftToFrame(image, imageEditorDraft);
  imageZoomInput.value = String(imageEditorDraft.zoom);
  setImageEditorStatus(getImageEditorValidationMessage(image), image.validation?.tooBig ? "error" : "");
  updateImageEditorActionState(image);
  drawImageEditor();
  imageEditorDialog.showModal();
}

function closeImageEditorDialog() {
  editingImageTarget = null;
  imageEditorSourceBitmap?.close?.();
  imageEditorSourceBitmap = null;
  imageEditorDraft = null;
  window.clearTimeout(imageEditorMetricsTimer);
  imageEditorMetricsRequestId += 1;
  setImageEditorStatus("");
  imageEditorSheet?.classList.remove("is-portrait-image");
  imageEditorDialog.close();
}

function getEditedImage() {
  if (!editingImageTarget) {
    return null;
  }
  return segmentImages[editingImageTarget.segmentIndex]?.[editingImageTarget.imageIndex] || null;
}

function formatImageDimensions(width, height) {
  const safeWidth = Math.max(0, Math.round(Number(width) || 0));
  const safeHeight = Math.max(0, Math.round(Number(height) || 0));
  return safeWidth && safeHeight ? `${safeWidth} x ${safeHeight} px` : "-";
}

function setImageEditorStatus(message = "", tone = "") {
  if (!imageEditorStatus) {
    return;
  }
  imageEditorStatus.textContent = message;
  if (tone) {
    imageEditorStatus.dataset.tone = tone;
  } else {
    delete imageEditorStatus.dataset.tone;
  }
}

function getImageEditorDraftImage(image = getEditedImage()) {
  if (!image || !imageEditorDraft) {
    return null;
  }
  return {
    ...image,
    edit: clampImageEditorDraftToFrame(image, { ...imageEditorDraft }),
  };
}

function updateImageEditorActionState(image = getEditedImage()) {
  const validation = image?.validation || {};
  const exceedsDimensions = Boolean(validation.exceedsDimensions);
  imageFitDimensionsButton.disabled = !exceedsDimensions;
  imageLossyResizeButton.hidden = !validation.tooBig;
}

function getImageEditorValidationMessage(image = getEditedImage()) {
  const validation = image?.validation || {};
  if (validation.exceedsDimensions) {
    return t("imageEditorDimensionsTooLarge", {
      width: validation.width || image?.width || 0,
      height: validation.height || image?.height || 0,
    });
  }
  if ((Number(validation.sizeBytes) || 0) > IMAGE_BLOB_LIMIT) {
    return t("imageEditorFileTooLarge", {
      size: formatImageSize(validation.sizeBytes),
    });
  }
  return "";
}

async function updateImageEditorMetrics({ renderBlob = true } = {}) {
  const image = getEditedImage();
  const draftImage = getImageEditorDraftImage(image);
  if (!image || !draftImage) {
    return;
  }
  const requestId = ++imageEditorMetricsRequestId;
  imageEditorOriginalDimensions.textContent = formatImageDimensions(image.width, image.height);
  imageEditorOriginalSize.textContent = formatImageSize(image.originalSizeBytes);
  const exportDimensions = isImageUsingDefaultEdit(draftImage)
    ? {
        width: Math.max(1, Math.round((draftImage.width || 1) * Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(draftImage.exportScale) || 1)))),
        height: Math.max(1, Math.round((draftImage.height || 1) * Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(draftImage.exportScale) || 1)))),
      }
    : getEditedImageExportDimensions(draftImage, draftImage.edit, null, Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(draftImage.exportScale) || 1)));
  imageEditorExportDimensions.textContent = formatImageDimensions(exportDimensions.width, exportDimensions.height);
  imageEditorExportSize.textContent = renderBlob ? t("imageEditorCalculatingSize") : formatImageSize(image.validation?.sizeBytes);
  updateImageEditorActionState(image);
  if (!renderBlob) {
    return;
  }
  try {
    const rendered = await renderImageToBlob(draftImage);
    if (requestId !== imageEditorMetricsRequestId) {
      return;
    }
    imageEditorExportDimensions.textContent = formatImageDimensions(rendered.width, rendered.height);
    imageEditorExportSize.textContent = formatImageSize(rendered.blob.size);
  } catch {
    if (requestId === imageEditorMetricsRequestId) {
      imageEditorExportSize.textContent = t("imageEditorSizeUnknown");
    }
  }
}

function scheduleImageEditorMetricsUpdate() {
  window.clearTimeout(imageEditorMetricsTimer);
  imageEditorMetricsTimer = window.setTimeout(() => {
    void updateImageEditorMetrics();
  }, 180);
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
    normalizeImageEdit(imageEditorDraft).fitMode,
    getImageEditorSourceDimensions(),
  );
  imageEditorDraft.offsetX = metrics.offsetX;
  imageEditorDraft.offsetY = metrics.offsetY;
  imageEditorDraft.fitMode = metrics.fitMode;

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
  scheduleImageEditorMetricsUpdate();
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
  const image = getEditedImage();
  if (!image) {
    return;
  }
  const nextDraft = {
    ...imageEditorDraft,
    fitMode: "cover",
    offsetX: imageEditorDragStart.offsetX + (event.clientX - imageEditorDragStart.x),
    offsetY: imageEditorDragStart.offsetY + (event.clientY - imageEditorDragStart.y),
  };
  imageEditorDraft = clampImageEditorDraftToFrame(image, nextDraft);
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
  image.edit = clampImageEditorDraftToFrame(image, {
    ...imageEditorDraft,
  });
  await validateThreadImage(image);
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
  closeImageEditorDialog();
}

function resetImageEditor() {
  const image = getEditedImage();
  if (!image) {
    return;
  }
  imageEditorDraft = clampImageEditorDraftToFrame(image, {
    ...createDefaultImageEdit(),
  });
  imageZoomInput.value = String(imageEditorDraft.zoom);
  drawImageEditor();
}

async function applyLossyResize() {
  const image = getEditedImage();
  if (!image) {
    return;
  }
  image.exportScale = Math.max(IMAGE_MIN_EXPORT_SCALE, (image.exportScale || 1) * 0.82);
  image.exportQuality = Math.max(0.45, (image.exportQuality || 0.88) * 0.86);
  await validateThreadImage(image);
  updateImageEditorActionState(image);
  setImageEditorStatus(
    image.validation?.tooBig ? t("lossyResizeStillTooLarge") : t("lossyResizeApplied"),
    image.validation?.tooBig ? "error" : "success",
  );
  await updateImageEditorMetrics();
  await persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
}

async function fitImageToAllowedDimensions() {
  const image = getEditedImage();
  if (!image || !imageEditorDraft) {
    return;
  }
  const draftImage = getImageEditorDraftImage(image);
  const rendered = await renderImageToBlob(draftImage);
  const maxRenderedDimension = Math.max(rendered.width, rendered.height);
  if (maxRenderedDimension <= IMAGE_MAX_DIMENSION) {
    setImageEditorStatus(t("fitImageDimensionsNotNeeded"), "success");
    updateImageEditorActionState(image);
    await updateImageEditorMetrics();
    return;
  }
  const currentScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
  const nextScale = Math.max(IMAGE_MIN_EXPORT_SCALE, currentScale * (IMAGE_MAX_DIMENSION / maxRenderedDimension));
  image.exportScale = nextScale;
  await validateThreadImage(image);
  updateImageEditorActionState(image);
  setImageEditorStatus(
    image.validation?.exceedsDimensions ? t("fitImageDimensionsStillTooLarge") : t("fitImageDimensionsApplied"),
    image.validation?.exceedsDimensions ? "error" : "success",
  );
  await updateImageEditorMetrics();
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
  if (normalizeLinkCard(segmentLinkCards[segmentIndex])) {
    setStatus(t("linkCardBlocksImages"), "error");
    return;
  }
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

function clearSegmentImageDropMarkers() {
  document.querySelectorAll(".segment-images.is-drop-target").forEach((element) => {
    element.classList.remove("is-drop-target");
  });
  document.querySelectorAll(".segment-image-card.is-drop-before, .segment-image-card.is-drop-after").forEach((element) => {
    element.classList.remove("is-drop-before", "is-drop-after");
  });
  document.querySelectorAll(".segment-card.is-file-drop-target").forEach((element) => {
    element.classList.remove("is-file-drop-target");
  });
}

function clearSegmentImageDragState() {
  segmentImageDragState = null;
  clearSegmentImageDropMarkers();
  document.querySelectorAll(".segment-image-card.is-dragging").forEach((element) => {
    element.classList.remove("is-dragging");
  });
}

function getSegmentImageDropPosition(event, rect) {
  const offsetX = event.clientX - rect.left - (rect.width / 2);
  const offsetY = event.clientY - rect.top - (rect.height / 2);
  if (Math.abs(offsetX) > Math.abs(offsetY)) {
    return offsetX >= 0 ? "after" : "before";
  }
  return offsetY >= 0 ? "after" : "before";
}

function eventHasTransferFiles(event) {
  const transfer = event.dataTransfer;
  if (!transfer) {
    return false;
  }
  if (transfer.files && transfer.files.length > 0) {
    return true;
  }
  return Array.from(transfer.types || []).includes("Files");
}

function getDroppedImageFiles(event) {
  const transfer = event.dataTransfer;
  if (!transfer) {
    return [];
  }
  return Array.from(transfer.files || []).filter((file) => file.type.startsWith("image/"));
}

function moveSegmentImageToPosition(fromSegmentIndex, fromImageIndex, toSegmentIndex, toImageIndex) {
  const sourceImages = Array.isArray(segmentImages[fromSegmentIndex]) ? [...segmentImages[fromSegmentIndex]] : null;
  const targetImages = Array.isArray(segmentImages[toSegmentIndex]) ? [...segmentImages[toSegmentIndex]] : null;
  if (!sourceImages || !targetImages) {
    return false;
  }
  if (fromImageIndex < 0 || fromImageIndex >= sourceImages.length) {
    return false;
  }
  if (fromSegmentIndex !== toSegmentIndex && normalizeLinkCard(segmentLinkCards[toSegmentIndex])) {
    setStatus(t("linkCardBlocksImages"), "error");
    return false;
  }
  if (fromSegmentIndex !== toSegmentIndex && targetImages.length >= MAX_IMAGES_PER_SEGMENT) {
    setStatus(t("imagesLimitReached"), "error");
    return false;
  }

  const [image] = sourceImages.splice(fromImageIndex, 1);
  let insertionIndex = Math.max(0, Math.min(toImageIndex, targetImages.length));
  if (fromSegmentIndex === toSegmentIndex) {
    insertionIndex = Math.max(0, Math.min(insertionIndex - (toImageIndex > fromImageIndex ? 1 : 0), sourceImages.length));
    if (insertionIndex === fromImageIndex) {
      return false;
    }
    sourceImages.splice(insertionIndex, 0, image);
    segmentImages[fromSegmentIndex] = sourceImages;
  } else {
    targetImages.splice(insertionIndex, 0, image);
    segmentImages[fromSegmentIndex] = sourceImages;
    segmentImages[toSegmentIndex] = targetImages;
  }

  void persistSettings();
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  queueDraftSave();
  return true;
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
    ignoreNextConfirmClose = true;
    confirmDialog.close();
  }
  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmDialog.showModal();
  });
}

function resolveConfirmDialog(value) {
  const resolver = confirmResolver;
  confirmResolver = null;
  if (confirmDialog.open) {
    ignoreNextConfirmClose = true;
    confirmDialog.close();
  }
  if (resolver) {
    resolver(value);
  }
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
      appendThreadIntro,
      appendThreadEmoji,
      addMarkerSpacing,
      postInteraction: getCurrentPostInteractionSettings(),
      linkCardProxy: getLinkCardSettings(),
      postLanguages: getNormalizedPostLanguagesOrDefault(),
      localePreference,
      hashtagPlacement,
      hashtags,
      selectedHashtags,
      segments: segments.map((segment, index) => ({
        text: segment.text,
        images: normalizeSegmentImages([segment.images])[0] || [],
        externalCard: normalizeLinkCard(segmentLinkCards[index]),
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
  appendThreadIntro = thread.appendThreadIntro === true;
  threadIntroToggle.checked = appendThreadIntro;
  appendThreadEmoji = thread.appendThreadEmoji === true;
  threadEmojiToggle.checked = appendThreadEmoji;
  addMarkerSpacing = thread.addMarkerSpacing === true;
  markerSpacingToggle.checked = addMarkerSpacing;
  applyPostInteractionSettings(thread.postInteraction || {});
  selectedPostLanguages = normalizePostLanguageTags(thread.postLanguages);
  localePreference = SUPPORTED_LOCALES.includes(thread.localePreference) || thread.localePreference === "auto"
    ? thread.localePreference
    : localePreference;
  currentLocale = localePreference === "auto" ? detectBrowserLocale() : localePreference;
  languageSelect.value = localePreference;
  hashtags = normalizeHashtagEntries(thread.hashtags);
  selectedHashtags = normalizeSelectedHashtagEntries(thread.selectedHashtags, hashtags);
  hashtagPlacement = normalizeHashtagPlacement(thread.hashtagPlacement);
  hashtagPlacementSelect.value = hashtagPlacement;
  const importedSegments = Array.isArray(thread.segments) ? thread.segments : [];
  segmentOverrides = normalizeSegmentOverrides(importedSegments.map((segment) => segment?.text || ""));
  setComposerLocked(Boolean(segmentOverrides));
  segmentImages = importedSegments.length > 0
    ? normalizeSegmentImages(importedSegments.map((segment) => segment?.images || []))
    : normalizeSegmentImages(thread.segmentImages);
  segmentLinkCards = importedSegments.length > 0
    ? normalizeSegmentLinkCards(importedSegments.map((segment) => segment?.externalCard || null))
    : normalizeSegmentLinkCards(thread.segmentLinkCards);

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

class StreamingZipWriter {
  constructor(writable) {
    this.writable = writable;
    this.centralParts = [];
    this.offset = 0;
    this.entryCount = 0;
    this.closed = false;
  }

  async addFile(name, bytes, modifiedAt = new Date()) {
    if (this.closed) {
      throw new Error("ZIP-Writer ist bereits geschlossen.");
    }

    const nameBytes = utf8Bytes(name);
    const dataBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const crc = crc32(dataBytes);
    const { time, date } = dosDateTime(modifiedAt);

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
    centralView.setUint32(42, this.offset, true);
    centralHeader.set(nameBytes, 46);

    await this.writable.write(localHeader);
    await this.writable.write(dataBytes);
    this.centralParts.push(centralHeader);
    this.offset += localHeader.length + dataBytes.length;
    this.entryCount += 1;
  }

  async close() {
    if (this.closed) {
      return;
    }

    const centralDirectory = concatUint8Arrays(this.centralParts);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, this.entryCount, true);
    endView.setUint16(10, this.entryCount, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, this.offset, true);
    endView.setUint16(20, 0, true);

    await this.writable.write(centralDirectory);
    await this.writable.write(endRecord);
    await this.writable.close();
    this.closed = true;
  }
}

function supportsStreamingZipExport() {
  return typeof window.showSaveFilePicker === "function";
}

function buildMediaExportPostFolder(post = {}) {
  const rawCreatedAt = String(post?.createdAt || "").trim();
  const timestamp = Number.isNaN(Date.parse(rawCreatedAt))
    ? "unknown-date"
    : new Date(rawCreatedAt).toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
  const year = timestamp.slice(0, 4) || "unknown";
  const month = timestamp.slice(0, 7) || `${year}-00`;
  const rkey = String(post?.rkey || "post")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80) || "post";
  return `posts/${year}/${month}/${timestamp}__post-${rkey}`;
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
      skippedImageCount: Math.max(0, Number(rawCatalog.manifest?.skippedImageCount) || 0),
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

async function applyLoadedArchiveCatalog(catalog, sessionOverrides = {}) {
  archivePreviewState = null;
  activeArchiveRunId = null;
  activeArchiveRunState = "idle";
  archiveLastCheckpoint = "";
  archiveCatalog = catalog;
  archiveSession = {
    filterKey: sessionOverrides.filterKey || "import",
    filters: sessionOverrides.filters || null,
    waveIndex: Number(sessionOverrides.waveIndex) || 1,
    nextCursor: sessionOverrides.nextCursor || "",
    hasMore: Boolean(sessionOverrides.hasMore),
    exportedPosts: Number(sessionOverrides.exportedPosts) || archiveCatalog.posts.length,
    exportedImages: Number(sessionOverrides.exportedImages) || archiveCatalog.summary.imageCount,
    status: sessionOverrides.status || "completed",
    updatedAt: new Date().toISOString(),
  };
  await saveArchiveSession(archiveSession);
  await saveArchiveCatalogState(archiveCatalog);
  archiveTransientNotice = buildArchiveCatalogNotice(archiveCatalog);
  renderArchiveWorkspace();
  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: sessionOverrides.step || t("archiveImported"),
    percent: 100,
    detail: archiveTransientNotice,
  });
}

function makeArchiveFileBaseName(catalog = archiveCatalog) {
  const handle = String(catalog?.manifest?.account?.handle || authAccount || "account").replace(/[^\w.-]+/g, "-");
  const datePart = formatArchiveDatePart(catalog?.manifest?.exportedAt);
  return `threadline-archive-${handle}-${datePart}`;
}

function getArchiveMediaExportOptions() {
  return {
    actor: String(archiveMediaActorInput?.value || "").trim(),
    includeImages: archiveMediaImagesToggle?.checked !== false,
    includeVideos: archiveMediaVideosToggle?.checked !== false,
    includeOther: archiveMediaOtherToggle?.checked !== false,
    filters: getArchiveFilters(),
  };
}

async function exportArchiveMediaZip() {
  if (!authAccount) {
    throw new Error(t("archiveMediaRequiresLogin"));
  }
  if (!supportsStreamingZipExport()) {
    throw new Error(t("archiveMediaStreamUnsupported"));
  }

  const options = getArchiveMediaExportOptions();
  if (!options.includeImages && !options.includeVideos && !options.includeOther) {
    throw new Error(t("archiveMediaNeedKind"));
  }

  const targetHandle = String(options.actor || authAccount || "account")
    .replace(/^@+/, "")
    .trim()
    .replace(/[^\w.-]+/g, "-") || "account";
  const datePart = new Date().toISOString().slice(0, 10);
  const suggestedName = `threadline-media-${targetHandle}-${datePart}.zip`;
  let fileHandle = null;
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: t("archiveMediaFilePickerDescription"),
        accept: {
          "application/zip": [".zip"],
        },
      }],
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    throw new Error(t("archiveMediaFilePickerFailed"));
  }

  archiveTransientNotice = "";
  renderArchiveStatusLine();

  setArchiveProgress({
    title: t("archiveMediaScanTitle"),
    step: t("archiveMediaScanStep"),
    percent: 3,
    detail: "",
  });

  const scanned = await sendToServiceWorker("SCAN_ACCOUNT_MEDIA_EXPORT", options, {
    timeoutMs: 600000,
    onProgress(progress) {
      setArchiveProgress({
        title: progress.title || t("archiveMediaScanTitle"),
        step: progress.step || t("archiveMediaScanStep"),
        percent: Number.isFinite(progress.percent) ? progress.percent : 3,
        detail: progress.detail || "",
      });
    },
  });

  const mediaEntries = Array.isArray(scanned?.media) ? scanned.media : [];
  if (!mediaEntries.length) {
    throw new Error(t("archiveMediaNoMatches"));
  }

  const writable = await fileHandle.createWritable();
  const zipWriter = new StreamingZipWriter(writable);
  const exportedMedia = [];
  const skippedMedia = [];
  const scannedPosts = Array.isArray(scanned?.posts) ? scanned.posts : [];
  const postsByUri = new Map(scannedPosts.map((post) => [post.uri, post]));
  const writtenPostEntries = new Set();

  try {
    for (const [index, item] of mediaEntries.entries()) {
      setArchiveProgress({
        title: t("archiveMediaZipTitle"),
        step: t("archiveMediaZipStep", { index: index + 1, count: mediaEntries.length }),
        percent: 12 + Math.round(((index + 1) / Math.max(1, mediaEntries.length)) * 80),
        detail: t("archiveMediaZipDetail", { count: exportedMedia.length, skipped: skippedMedia.length }),
      });

      try {
        const loaded = await sendToServiceWorker("DOWNLOAD_ACCOUNT_MEDIA_ASSET", { item }, {
          timeoutMs: 180000,
          onProgress(progress) {
            setArchiveProgress({
              title: t("archiveMediaZipTitle"),
              step: progress.step || t("archiveMediaZipStep", { index: index + 1, count: mediaEntries.length }),
              percent: 12 + Math.round(((index + 1) / Math.max(1, mediaEntries.length)) * 80),
              detail: progress.detail || t("archiveMediaZipDetail", { count: exportedMedia.length, skipped: skippedMedia.length }),
            });
          },
        });

        const modifiedAt = loaded?.createdAt ? new Date(loaded.createdAt) : new Date();
        const relatedPost = postsByUri.get(loaded?.postUri || item.postUri || "") || null;
        const postFolder = String(
          relatedPost?.postFolder
          || item.postFolder
          || loaded?.postFolder
          || buildMediaExportPostFolder(relatedPost || item || loaded || {}),
        ).trim();
        if (postFolder && !writtenPostEntries.has(postFolder) && relatedPost) {
          const postSummary = {
            ...relatedPost,
            exportedAt: new Date().toISOString(),
          };
          await zipWriter.addFile(`${postFolder}/post.json`, utf8Bytes(JSON.stringify(postSummary, null, 2)), modifiedAt);
          writtenPostEntries.add(postFolder);
        }
        await zipWriter.addFile(String(loaded.path || item.pathStem || `asset-${index + 1}`), loaded.bytes || new Uint8Array(), modifiedAt);
        exportedMedia.push({
          id: loaded.id || item.id || "",
          kind: loaded.kind || item.kind || "",
          path: loaded.path || "",
          postFolder,
          type: loaded.type || "",
          sizeBytes: Number(loaded.sizeBytes) || 0,
          createdAt: loaded.createdAt || item.createdAt || "",
          postUri: loaded.postUri || item.postUri || "",
          alt: loaded.alt || item.alt || "",
          width: Number(loaded.width) || 0,
          height: Number(loaded.height) || 0,
        });
      } catch (error) {
        skippedMedia.push({
          id: item.id || "",
          kind: item.kind || "",
          postFolder: String(item.postFolder || buildMediaExportPostFolder(item || {})).trim(),
          createdAt: item.createdAt || "",
          postUri: item.postUri || "",
          reason: error?.message || t("archiveMediaSkippedUnknown"),
        });
      }
    }

    const exportManifest = {
      ...(scanned?.manifest || {}),
      exportedAt: new Date().toISOString(),
      mediaCount: exportedMedia.length,
      skippedMediaCount: skippedMedia.length,
    };

    await zipWriter.addFile("_meta/manifest.json", utf8Bytes(JSON.stringify(exportManifest, null, 2)));
    await zipWriter.addFile("_meta/posts.json", utf8Bytes(JSON.stringify(scannedPosts, null, 2)));
    await zipWriter.addFile("_meta/media.json", utf8Bytes(JSON.stringify(exportedMedia, null, 2)));
    if (skippedMedia.length > 0) {
      await zipWriter.addFile("_meta/skipped-media.json", utf8Bytes(JSON.stringify(skippedMedia, null, 2)));
    }
    await zipWriter.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // Ignore secondary abort errors.
    }
    throw error;
  }

  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveMediaDoneStep"),
    percent: 100,
    detail: t("archiveMediaDoneDetail", { count: exportedMedia.length, skipped: skippedMedia.length }),
  });
  archiveTransientNotice = t("archiveMediaDoneDetail", { count: exportedMedia.length, skipped: skippedMedia.length });
  renderArchiveStatusLine();
  setStatus(`${t("archiveProgressDoneTitle")}: ${archiveTransientNotice}`);
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

function base64ToBytes(value = "") {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function assetToDataUri(asset) {
  return `data:${asset.type || "application/octet-stream"};base64,${bytesToBase64(asset.bytes)}`;
}

function getStoredAccountAvatarUri(account = {}) {
  const assets = Array.isArray(accountAvatarAssets) ? accountAvatarAssets : [];
  const avatarPath = String(account?.avatarPath || "").trim();
  if (avatarPath) {
    const asset = assets.find((entry) => entry.path === avatarPath);
    if (asset) {
      return assetToDataUri(asset);
    }
  }
  const fallbackAsset = assets.find((entry) =>
    (account?.did && entry.did === account.did)
    || (account?.avatar && entry.url === account.avatar));
  if (fallbackAsset) {
    account.avatarPath = fallbackAsset.path;
    return assetToDataUri(fallbackAsset);
  }
  return String(account?.avatar || "").trim();
}

function applyAccountAvatarCache(cache) {
  accountAvatarAssets = Array.isArray(cache?.assets) ? cache.assets : [];
}

async function restoreAccountAvatarCache() {
  const cache = await sendToServiceWorker("GET_ACCOUNT_AVATAR_CACHE", {}, { timeoutMs: 120000 }).catch(() => null);
  applyAccountAvatarCache(cache);
}

function getAssetExtensionFromMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("png")) {
    return "png";
  }
  if (value.includes("webp")) {
    return "webp";
  }
  if (value.includes("gif")) {
    return "gif";
  }
  return "jpg";
}

async function downloadRemoteAssetForCatalog(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(t("archiveAssetLoadFailed", { status: response.status }));
  }
  return {
    type: response.headers.get("content-type") || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

async function ensureArchiveAvatarAssets(catalog) {
  if (!catalog) {
    return catalog;
  }
  if (!Array.isArray(catalog.assets)) {
    catalog.assets = [];
  }

  const existingPaths = new Set(catalog.assets.map((asset) => asset.path));
  const pathByUrl = new Map();
  const selfAccount = savedAccounts.find((account) => account.did && account.did === authAccountDid)
    || savedAccounts.find((account) => account.handle && account.handle === authAccount)
    || null;

  for (const post of catalog.posts || []) {
    if (!post.authorAvatar && post.authorDid && selfAccount?.avatar && post.authorDid === selfAccount.did) {
      post.authorAvatar = selfAccount.avatar;
    }
    if (!post.authorAvatarPath && post.authorAvatar && pathByUrl.has(post.authorAvatar)) {
      post.authorAvatarPath = pathByUrl.get(post.authorAvatar) || "";
      continue;
    }
    if (post.authorAvatarPath || !post.authorAvatar) {
      continue;
    }
    try {
      const blob = await downloadRemoteAssetForCatalog(post.authorAvatar);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const slug = String(post.authorHandle || post.authorDid || "author").replace(/[^\w.-]+/g, "-").slice(0, 60) || "author";
      const path = `avatars/${slug}.${extension}`;
      pathByUrl.set(post.authorAvatar, path);
      post.authorAvatarPath = path;
      if (!existingPaths.has(path)) {
        existingPaths.add(path);
        catalog.assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
    } catch {
      post.authorAvatarPath = "";
    }
  }

  return catalog;
}

async function ensureDmAvatarAssets(catalog) {
  if (!catalog) {
    return catalog;
  }
  if (!Array.isArray(catalog.assets)) {
    catalog.assets = [];
  }

  const selfDid = catalog?.manifest?.account?.did || authAccountDid || "";
  const selfAvatarPath = catalog?.manifest?.account?.avatarPath || "";
  const partner = getDmPrimaryPartner(catalog);
  const recentByDid = new Map((Array.isArray(catalog.recentContacts) ? catalog.recentContacts : []).map((entry) => [entry.did, entry]));
  const memberByDid = new Map();
  (catalog.conversations || []).forEach((convo) => {
    (convo.members || []).forEach((member) => {
      if (member?.did && !memberByDid.has(member.did)) {
        memberByDid.set(member.did, member);
      }
    });
  });

  if (partner?.did) {
    const recent = recentByDid.get(partner.did);
    const mergedPath = partner.avatarPath || recent?.avatarPath || memberByDid.get(partner.did)?.avatarPath || "";
    if (mergedPath) {
      partner.avatarPath = mergedPath;
      if (recent) {
        recent.avatarPath = mergedPath;
      }
      const member = memberByDid.get(partner.did);
      if (member) {
        member.avatarPath = mergedPath;
      }
    }
  }

  (catalog.messages || []).forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    if (entry.senderDid === selfDid && selfAvatarPath) {
      entry.senderAvatarPath = entry.senderAvatarPath || selfAvatarPath;
      return;
    }
    const member = memberByDid.get(entry.senderDid) || recentByDid.get(entry.senderDid);
    if (member?.avatarPath && !entry.senderAvatarPath) {
      entry.senderAvatarPath = member.avatarPath;
    }
  });

  return catalog;
}

function utf8IndexToUtf16Index(text, byteIndex) {
  const value = String(text || "");
  const bytes = Math.max(0, Number(byteIndex) || 0);
  let currentBytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    const char = String.fromCodePoint(codePoint);
    const nextBytes = currentBytes + new TextEncoder().encode(char).length;
    if (nextBytes > bytes) {
      return index;
    }
    currentBytes = nextBytes;
    if (codePoint > 0xffff) {
      index += 1;
    }
  }
  return value.length;
}

function getFacetLinkInfo(feature, rawText = "") {
  const type = String(feature?.$type || "");
  if (type.includes("#link") && feature?.uri) {
    return {
      kind: "link",
      url: String(feature.uri),
    };
  }
  if (type.includes("#mention")) {
    const handle = String(rawText || "").trim().replace(/^@/, "");
    return {
      kind: "mention",
      url: `https://bsky.app/profile/${encodeURIComponent(handle || feature.did || "")}`,
    };
  }
  if (type.includes("#tag")) {
    const tag = String(feature.tag || rawText || "").trim().replace(/^#/, "");
    return {
      kind: "tag",
      url: `https://bsky.app/hashtag/${encodeURIComponent(tag)}`,
    };
  }
  return null;
}

function extractFacetRichTextRuns(text, facets = []) {
  const value = String(text || "");
  const facetRanges = [];

  (Array.isArray(facets) ? facets : []).forEach((facet) => {
    const byteStart = Number(facet?.index?.byteStart);
    const byteEnd = Number(facet?.index?.byteEnd);
    if (!Number.isFinite(byteStart) || !Number.isFinite(byteEnd) || byteEnd <= byteStart) {
      return;
    }
    const start = utf8IndexToUtf16Index(value, byteStart);
    const end = utf8IndexToUtf16Index(value, byteEnd);
    if (end <= start) {
      return;
    }
    const rawText = value.slice(start, end);
    const feature = (Array.isArray(facet?.features) ? facet.features : [])
      .map((entry) => getFacetLinkInfo(entry, rawText))
      .find(Boolean);
    if (!feature?.url) {
      return;
    }
    facetRanges.push({
      start,
      end,
      url: feature.url,
      kind: feature.kind,
    });
  });

  facetRanges.sort((left, right) => left.start - right.start || left.end - right.end);
  const runs = [];
  let cursor = 0;

  facetRanges.forEach((range) => {
    if (range.start < cursor) {
      return;
    }
    if (range.start > cursor) {
      runs.push({ text: value.slice(cursor, range.start) });
    }
    runs.push({
      text: value.slice(range.start, range.end),
      url: range.url,
      kind: range.kind,
    });
    cursor = range.end;
  });

  if (cursor < value.length) {
    runs.push({ text: value.slice(cursor) });
  }

  return runs.length > 0 ? runs : null;
}

function renderArchiveHtmlRichText(text, facets = []) {
  return extractPdfLinkRuns(text, facets).map((run) => {
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
    "archiveSkippedImagesLabel",
    "archiveSkippedImagesNotice",
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
    "archiveHtmlFilterSummary",
    "archiveHtmlFilterHashtagsSuffix",
    "archiveHtmlLoadImage",
    "archiveHtmlOpenImage",
    "archiveHtmlOpenPost",
    "archiveHtmlLinksSummary",
    "archiveHtmlLinksEmpty",
    "archiveHtmlLinksPostLabel",
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

function shortenArchiveUrlForDisplay(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }
  try {
    const parsed = new URL(value);
    const compact = `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}${parsed.hash}`;
    return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
  } catch {
    return value.length > 72 ? `${value.slice(0, 69)}...` : value;
  }
}

function collectArchiveHtmlLinks(posts = []) {
  const items = [];
  posts.forEach((post) => {
    extractPdfLinkRuns(post.text || "", post.facets || []).forEach((run) => {
      if (!run.url || run.kind !== "link") {
        return;
      }
      items.push({
        postUri: post.uri || "",
        postPermalink: post.permalink || "",
        url: run.url,
        displayUrl: shortenArchiveUrlForDisplay(run.url),
        authorHandle: post.authorHandle || "",
        authorDisplayName: post.authorDisplayName || "",
        createdAt: post.createdAt || "",
      });
    });
  });
  return items.sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0) || 0;
    const rightTime = Date.parse(right.createdAt || 0) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left.url || "").localeCompare(String(right.url || ""));
  });
}

function getArchiveExternalCard(post = {}) {
  return post?.externalCard?.url ? post.externalCard : null;
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

function buildArchiveHtmlFilterSummary(catalog) {
  const filters = catalog?.manifest?.filters || {};
  const selectedTags = Array.isArray(filters?.hashtagTags) ? filters.hashtagTags : [];
  const filteredOutCount = Math.max(0, Number(catalog?.manifest?.hashtagFilteredOutCount) || 0);
  const scope = filters.scope === "year"
    ? `Jahr ${filters.year || "?"}`
    : (filters.scope === "range"
      ? `${filters.from || "…"} – ${filters.to || "…"}`
      : "Kompletter Account");
  const hashtags = selectedTags.length > 0
    ? t("archiveHtmlFilterHashtagsSuffix", { count: selectedTags.length, skipped: filteredOutCount })
    : "";
  return t("archiveHtmlFilterSummary", { scope, hashtags });
}

function buildArchiveHtmlImageMarkup(post, assetUris, options = {}) {
  return (post.images || []).map((image) => {
    const assetUri = options.embedPostImages !== false ? (assetUris.get(image.path) || "") : "";
    if (!assetUri && options.embedPostImages === false) {
      const remoteUrl = String(image.remoteUrl || "").trim();
      if (!remoteUrl) {
        return "";
      }
      return `
          <figure class="archive-html-image archive-html-image-lazy" data-archive-image-remote="${escapeHtmlAttribute(remoteUrl)}" data-archive-image-alt="${escapeHtmlAttribute(image.alt || "")}">
            <div class="archive-html-image-placeholder">
              <button type="button" class="archive-html-inline-load" data-archive-load-image>${escapeHtml(t("archiveHtmlLoadImage"))}</button>
              <a class="archive-html-link" href="${escapeHtmlAttribute(remoteUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(t("archiveHtmlOpenImage"))}</a>
            </div>
            ${image.alt ? `<figcaption>${escapeHtml(`${t("archivePdfAltPrefix")} ${image.alt}`)}</figcaption>` : ""}
          </figure>
        `;
    }
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
}

function buildArchiveHtmlPostMarkup(post, group, groupIndex, postIndex, depthMap, handle, assetUris, options = {}) {
  const createdTimestamp = Date.parse(post.createdAt || 0) || 0;
  const hasImages = (post.images || []).length > 0;
  const searchValue = [
    post.text || "",
    post.permalink || "",
    post.uri || "",
    post.authorHandle || handle,
    post.authorDisplayName || "",
    extractPdfLinkRuns(post.text || "", post.facets || []).map((run) => run.url || "").filter(Boolean).join(" "),
  ].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
  const imagesMarkup = buildArchiveHtmlImageMarkup(post, assetUris, options);
  const metrics = post.counts || {};
  const depth = depthMap.get(post.uri) || 0;
  const authorDisplay = post.authorDisplayName && post.authorDisplayName !== post.authorHandle
    ? post.authorDisplayName
    : "";
  const authorAvatarUri = (post.authorAvatarPath ? (assetUris.get(post.authorAvatarPath) || "") : "") || post.authorAvatar || "";
  const externalCard = getArchiveExternalCard(post);
  const externalThumbUri = (externalCard?.thumbPath ? (assetUris.get(externalCard.thumbPath) || "") : "") || String(externalCard?.thumb || "").trim();
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
            <div class="archive-html-author">
              ${authorAvatarUri ? `<img class="archive-html-avatar" src="${escapeHtmlAttribute(authorAvatarUri)}" alt="${escapeHtmlAttribute(authorDisplay || post.authorHandle || handle)}" loading="lazy">` : ""}
              <div>
              <p class="archive-html-kicker">${group.isThread ? `#${groupIndex + 1}.${postIndex + 1}` : `#${groupIndex + 1}`}</p>
              <h2 data-archive-searchable="true">${escapeHtml(authorDisplay || `@${post.authorHandle || handle}`)}</h2>
              <p class="archive-html-author-handle" data-archive-searchable="true">@${escapeHtml(post.authorHandle || handle)}</p>
              </div>
            </div>
            <time datetime="${escapeHtmlAttribute(post.createdAt || "")}">${escapeHtml(formatHistoryTimestamp(post.createdAt))}</time>
          </div>
          <div class="archive-html-metrics">
            <span>Likes ${metrics.likeCount || 0}</span>
            <span>Replies ${metrics.replyCount || 0}</span>
            <span>Reposts ${metrics.repostCount || 0}</span>
            <span>Quotes ${metrics.quoteCount || 0}</span>
          </div>
          <div class="archive-html-text" data-archive-richtext="true">${post.text ? renderArchiveHtmlRichText(post.text, post.facets || []) : (!externalCard ? `<span class="archive-html-empty">${escapeHtml(t("archiveHtmlNoText"))}</span>` : "")}</div>
          ${externalCard ? `
            <a class="archive-html-link-card" href="${escapeHtmlAttribute(externalCard.url)}" target="_blank" rel="noreferrer noopener">
              ${externalThumbUri ? `<img class="archive-html-link-card-thumb" src="${escapeHtmlAttribute(externalThumbUri)}" alt="">` : ""}
              <span class="archive-html-link-card-copy">
                <strong>${escapeHtml(externalCard.title || externalCard.url)}</strong>
                ${externalCard.description ? `<span>${escapeHtml(externalCard.description)}</span>` : ""}
                <small>${escapeHtml(shortenArchiveUrlForDisplay(externalCard.url))}</small>
              </span>
            </a>
          ` : ""}
          ${imagesMarkup ? `<div class="archive-html-gallery">${imagesMarkup}</div>` : ""}
          <div class="archive-html-footer">
            ${post.permalink ? `<a class="archive-html-link" href="${escapeHtmlAttribute(post.permalink)}" target="_blank" rel="noreferrer noopener">${escapeHtml(t("archiveHtmlOpenPost"))}</a>` : ""}
            <span class="archive-html-uri">${escapeHtml((post.uri || "").replace(/^at:\/\//, ""))}</span>
          </div>
        </article>
      `;
}

function buildArchiveHtmlGroupMarkup(group, groupIndex, handle, assetUris, options = {}) {
  const depthMap = buildArchiveThreadDepthMap(group.posts);
  const summaryLabel = group.isThread
    ? t("archiveHtmlThreadSummary", { count: group.posts.length, images: group.imageCount })
    : t("archiveHtmlSingleSummary");
  const postsMarkup = group.posts
    .map((post, postIndex) => buildArchiveHtmlPostMarkup(post, group, groupIndex, postIndex, depthMap, handle, assetUris, options))
    .join("");

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
}

function buildArchiveHtmlLinksMarkup(archiveLinks) {
  if (archiveLinks.length > 0) {
    return `
        <details class="archive-html-entry archive-html-links">
          <summary>
            <div>
              <strong>${escapeHtml(t("archiveHtmlLinksSummary", { count: archiveLinks.length }))}</strong>
              <span>${escapeHtml(formatHistoryTimestamp(archiveLinks[0]?.createdAt))} – ${escapeHtml(formatHistoryTimestamp(archiveLinks[archiveLinks.length - 1]?.createdAt))}</span>
            </div>
            <span>${archiveLinks.length}</span>
          </summary>
          <div class="archive-html-entry-body">
            <div class="archive-html-links-list">
              ${archiveLinks.map((entry) => `
                <div class="archive-html-links-row">
                  ${entry.postPermalink
                    ? `<a class="archive-html-link" href="${escapeHtmlAttribute(entry.postPermalink)}" target="_blank" rel="noreferrer noopener">${escapeHtml(t("archiveHtmlLinksPostLabel"))}</a>`
                    : `<span class="archive-html-link archive-html-link-passive">${escapeHtml(t("archiveHtmlLinksPostLabel"))}</span>`}
                  <a class="archive-html-links-target" href="${escapeHtmlAttribute(entry.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(entry.displayUrl)}</a>
                </div>
              `).join("")}
            </div>
          </div>
        </details>
  `;
  }

  return `
        <details class="archive-html-entry archive-html-links">
          <summary>
            <div>
              <strong>${escapeHtml(t("archiveHtmlLinksSummary", { count: 0 }))}</strong>
            </div>
            <span>0</span>
          </summary>
          <div class="archive-html-entry-body">
            <p class="archive-html-hashtags-empty">${escapeHtml(t("archiveHtmlLinksEmpty"))}</p>
          </div>
        </details>
  `;
}

function buildArchiveHtmlDocument(catalog, assetUris, options = {}) {
  const groups = buildArchiveThreadGroups(catalog.posts || []);
  const archiveHashtags = collectArchiveHtmlHashtags(catalog.posts || []);
  const archiveLinks = collectArchiveHtmlLinks(catalog.posts || []);
  const toolbarStrings = buildArchiveHtmlToolbarStrings();
  const htmlI18n = buildArchiveHtmlI18n();
  const handle = catalog?.manifest?.account?.handle || authAccount || "Bluesky";
  const fromValue = formatArchiveHtmlDateInputValue(catalog?.summary?.from);
  const toValue = formatArchiveHtmlDateInputValue(catalog?.summary?.to);
  const exportedAtIso = catalog?.manifest?.exportedAt || new Date().toISOString();
  const title = t("archiveHtmlTitle", { handle });
  const skippedImageCount = Number(catalog?.summary?.skippedImageCount) || 0;
  const filterSummaryText = buildArchiveHtmlFilterSummary(catalog);
  const groupsMarkup = groups
    .map((group, groupIndex) => buildArchiveHtmlGroupMarkup(group, groupIndex, handle, assetUris, options))
    .join("");
  const linksMarkup = buildArchiveHtmlLinksMarkup(archiveLinks);

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
      .archive-html-warning {
        margin: 10px 0 0;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(217, 95, 75, 0.1);
        border: 1px solid rgba(217, 95, 75, 0.18);
        color: #8c2f20;
      }
      .archive-html-toolbar {
        position: sticky;
        top: 14px;
        z-index: 10;
        padding: 18px;
        margin-bottom: 18px;
      }
      body.archive-html-nojs .archive-html-toolbar {
        display: none !important;
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
      .archive-html-links-list {
        display: grid;
        gap: 10px;
      }
      .archive-html-links-row {
        display: grid;
        grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(237, 244, 255, 0.62);
        border: 1px solid rgba(102, 133, 178, 0.12);
      }
      .archive-html-link-passive {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(21, 40, 70, 0.12);
        color: var(--muted);
        padding: 10px 14px;
      }
      .archive-html-links-target {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
      .archive-html-author {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .archive-html-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        object-fit: cover;
        background: #dfe8f7;
        border: 1px solid rgba(102, 133, 178, 0.22);
        flex: 0 0 42px;
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
      .archive-html-link-card {
        margin-top: 14px;
        display: grid;
        grid-template-columns: minmax(0, 152px) minmax(0, 1fr);
        gap: 14px;
        align-items: stretch;
        padding: 12px;
        border-radius: 18px;
        text-decoration: none;
        color: inherit;
        background: linear-gradient(180deg, rgba(236, 244, 255, 0.92), rgba(227, 238, 255, 0.86));
        border: 1px solid rgba(102, 133, 178, 0.16);
        box-shadow: 0 10px 24px rgba(24, 40, 70, 0.08);
      }
      .archive-html-link-card-thumb {
        width: 100%;
        height: 100%;
        min-height: 106px;
        max-height: 152px;
        object-fit: cover;
        border-radius: 14px;
        background: rgba(209, 224, 246, 0.55);
      }
      .archive-html-link-card-copy {
        min-width: 0;
        display: grid;
        gap: 8px;
        align-content: center;
      }
      .archive-html-link-card-copy strong {
        font-size: 1rem;
        line-height: 1.35;
        color: #10233e;
      }
      .archive-html-link-card-copy span {
        color: #425e85;
        line-height: 1.5;
      }
      .archive-html-link-card-copy small {
        color: #587192;
        font-size: 0.84rem;
        word-break: break-word;
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
      .archive-html-image-placeholder {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        min-height: 80px;
      }
      .archive-html-inline-load {
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        background: #152846;
        color: #fff;
        cursor: pointer;
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
        .archive-html-shell { width: min(100vw - 12px, 100%); padding: 14px 0 28px; }
        .archive-html-hero,
        .archive-html-toolbar,
        .archive-html-entry { border-radius: 18px; }
        .archive-html-hero { padding: 18px; margin-bottom: 12px; }
        .archive-html-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        .archive-html-meta-item { padding: 11px 12px; border-radius: 14px; }
        .archive-html-toolbar {
          position: static;
          top: auto;
          padding: 12px;
          margin-bottom: 12px;
        }
        .archive-html-toolbar-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .archive-html-toolbar-grid > label:first-child {
          grid-column: 1 / -1;
        }
        .archive-html-toolbar label,
        .archive-html-toolbar .archive-html-checks label {
          gap: 4px;
          font-size: 0.84rem;
        }
        .archive-html-toolbar input[type="search"],
        .archive-html-toolbar input[type="date"] {
          padding: 10px 12px;
          border-radius: 12px;
          min-height: 42px;
        }
        .archive-html-checks {
          gap: 10px 14px;
          margin-top: 10px;
        }
        .archive-html-toolbar-actions {
          flex-wrap: nowrap;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          gap: 8px;
          margin-top: 10px;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }
        .archive-html-toolbar-actions button {
          flex: 0 0 auto;
          white-space: nowrap;
          padding: 9px 12px;
        }
        .archive-html-filter-status,
        .archive-html-hashtags,
        .archive-html-hashtags-empty {
          margin-top: 10px;
        }
        .archive-html-feed { gap: 12px; }
        .archive-html-entry summary,
        .archive-html-entry-head,
        .archive-html-post-head,
        .archive-html-footer { flex-direction: column; align-items: flex-start; }
        .archive-html-link-card {
          grid-template-columns: 1fr;
        }
        .archive-html-link-card-thumb {
          min-height: 0;
          height: auto;
          max-height: 240px;
          aspect-ratio: 4 / 3;
        }
      }
      @media (max-width: 560px) {
        .archive-html-toolbar-grid,
        .archive-html-meta {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body class="archive-html-indent archive-html-nojs">
    <div class="archive-html-shell">
      <header class="archive-html-hero">
        <p class="archive-html-kicker" data-i18n-key="archiveHeaderEyebrow">${escapeHtml(t("archiveHeaderEyebrow"))}</p>
        <h1 id="archive-page-title">${escapeHtml(title)}</h1>
        <p id="archive-generated-copy">${escapeHtml(t("archiveHtmlGenerated", { exportedAt: formatHistoryTimestamp(exportedAtIso) }))}</p>
        ${skippedImageCount > 0 ? `<p class="archive-html-warning" id="archive-skipped-copy">${escapeHtml(t("archiveSkippedImagesNotice", { skipped: skippedImageCount }))}</p>` : ""}
        ${filterSummaryText ? `<p class="archive-html-warning" id="archive-filter-copy" data-i18n-key="archiveHtmlFilterSummary">${escapeHtml(filterSummaryText)}</p>` : ""}
        <div class="archive-html-meta">
          <div class="archive-html-meta-item">
            <span data-i18n-key="archiveSummaryPosts">${escapeHtml(t("archiveSummaryPosts"))}</span>
            <strong>${catalog.posts.length}</strong>
          </div>
          <div class="archive-html-meta-item">
            <span data-i18n-key="archiveSummaryImages">${escapeHtml(t("archiveSummaryImages"))}</span>
            <strong>${catalog.summary?.imageCount || 0}</strong>
          </div>
          ${skippedImageCount > 0 ? `
            <div class="archive-html-meta-item">
              <span data-i18n-key="archiveSkippedImagesLabel">${escapeHtml(t("archiveSkippedImagesLabel"))}</span>
              <strong>${skippedImageCount}</strong>
            </div>
          ` : ""}
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
        ${linksMarkup}
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
      document.body.classList.remove("archive-html-nojs");
      const archiveHtmlI18n = ${JSON.stringify(htmlI18n)};
      const archiveRuntimeData = ${JSON.stringify({
        handle,
        exportedAtIso,
        title,
        skippedImageCount,
        filterScope: (() => {
          const filters = catalog?.manifest?.filters || {};
          if (filters.scope === "year") {
            return `Jahr ${filters.year || "?"}`;
          }
          if (filters.scope === "range") {
            return `${filters.from || "…"} – ${filters.to || "…"}`;
          }
          return "Kompletter Account";
        })(),
        filterHashtagCount: Array.isArray(catalog?.manifest?.filters?.hashtagTags) ? catalog.manifest.filters.hashtagTags.length : 0,
        filterSkippedCount: Math.max(0, Number(catalog?.manifest?.hashtagFilteredOutCount) || 0),
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
      let lastAppliedQuery = "";
      let filterApplyTimer = 0;

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
        const skippedCopy = document.querySelector("#archive-skipped-copy");
        if (skippedCopy) {
          skippedCopy.textContent = formatArchiveTemplate(archiveStrings.archiveSkippedImagesNotice, {
            skipped: archiveRuntimeData.skippedImageCount || 0,
          });
        }
        const filterCopy = document.querySelector("#archive-filter-copy");
        if (filterCopy) {
          const hashtags = archiveRuntimeData.filterHashtagCount > 0
            ? formatArchiveTemplate(archiveStrings.archiveHtmlFilterHashtagsSuffix, {
                count: archiveRuntimeData.filterHashtagCount || 0,
                skipped: archiveRuntimeData.filterSkippedCount || 0,
              })
            : "";
          filterCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlFilterSummary, {
            scope: archiveRuntimeData.filterScope || "",
            hashtags,
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

      function refreshArchiveHighlights(query) {
        const normalizedQuery = String(query || "").trim().toLowerCase();
        const queryChanged = normalizedQuery !== lastAppliedQuery;

        if (queryChanged && lastAppliedQuery) {
          document.querySelectorAll("[data-archive-richtext='true'], [data-archive-searchable='true']").forEach((element) => {
            clearArchiveHighlights(element);
          });
        }

        if (!normalizedQuery) {
          lastAppliedQuery = "";
          return;
        }

        const visibleElements = [];
        document.querySelectorAll("[data-archive-post]:not([hidden])").forEach((post) => {
          visibleElements.push(...post.querySelectorAll("[data-archive-richtext='true'], [data-archive-searchable='true']"));
        });
        visibleElements.forEach((element) => {
          highlightArchiveQueryInElement(element, normalizedQuery);
        });
        lastAppliedQuery = normalizedQuery;
      }

      function applyArchiveFilters() {
        const query = String(searchInput.value || "").trim().toLowerCase();
        const fromValue = fromInput.value ? Date.parse(fromInput.value + "T00:00:00Z") : null;
        const toValue = toInput.value ? Date.parse(toInput.value + "T23:59:59Z") : null;
        const onlyImages = onlyImagesInput.checked;
        const onlyThreads = onlyThreadsInput.checked;
        let visibleEntries = 0;
        let visibleThreads = 0;
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
            if (isThread) {
              visibleThreads += 1;
            }
          }
        });

        statusLine.textContent = visiblePosts > 0
          ? formatArchiveTemplate(archiveStrings.archiveHtmlVisibleStatus, {
              entries: visibleEntries,
              threads: visibleThreads,
              posts: visiblePosts,
            })
          : archiveStrings.archiveHtmlNoMatches;
        refreshArchiveHighlights(query);
        syncHashtagState();
        syncToggleAllButton();
        syncSectionToggleButtons();
      }

      function queueArchiveFilterApply(delay = 120) {
        window.clearTimeout(filterApplyTimer);
        filterApplyTimer = window.setTimeout(() => {
          applyArchiveFilters();
        }, delay);
      }

      function syncIndentButton() {
        if (!indentButton) {
          return;
        }
        indentButton.classList.toggle("is-active", indentThreads);
        document.body.classList.toggle("archive-html-indent", indentThreads);
      }

      searchInput.addEventListener("input", () => queueArchiveFilterApply(140));
      [fromInput, toInput, onlyImagesInput, onlyThreadsInput].forEach((element) => {
        element.addEventListener("input", () => applyArchiveFilters());
        element.addEventListener("change", () => applyArchiveFilters());
      });

      resetButton?.addEventListener("click", () => {
        searchInput.value = "";
        fromInput.value = ${JSON.stringify(fromValue)};
        toInput.value = ${JSON.stringify(toValue)};
        onlyImagesInput.checked = false;
        onlyThreadsInput.checked = false;
        applyArchiveFilters();
      });

      toggleThreadsButton?.addEventListener("click", () => {
        const threadEntries = getThreadEntries().filter((entry) => !entry.hidden);
        const shouldOpen = threadEntries.some((entry) => !entry.open);
        threadEntries.forEach((item) => {
          item.open = shouldOpen;
        });
        syncToggleAllButton();
        syncSectionToggleButtons();
      });

      toggleSinglesButton?.addEventListener("click", () => {
        const singleEntries = getSingleEntries().filter((entry) => !entry.hidden);
        const shouldOpen = singleEntries.some((entry) => !entry.open);
        singleEntries.forEach((item) => {
          item.open = shouldOpen;
        });
        syncToggleAllButton();
        syncSectionToggleButtons();
      });

      toggleAllButton?.addEventListener("click", () => {
        const entries = getAllEntries().filter((entry) => !entry.hidden);
        const shouldOpen = entries.some((entry) => !entry.open);
        entries.forEach((entry) => {
          entry.open = shouldOpen;
        });
        syncToggleAllButton();
        syncSectionToggleButtons();
      });

      indentButton?.addEventListener("click", () => {
        indentThreads = !indentThreads;
        syncIndentButton();
      });

      document.querySelectorAll("[data-archive-load-image]").forEach((button) => {
        button.addEventListener("click", () => {
          const figure = button.closest("[data-archive-image-remote]");
          const remoteUrl = String(figure?.getAttribute("data-archive-image-remote") || "").trim();
          const remoteAlt = String(figure?.getAttribute("data-archive-image-alt") || "").trim();
          if (!figure || !remoteUrl || figure.querySelector("img")) {
            return;
          }
          const image = document.createElement("img");
          image.src = remoteUrl;
          image.alt = remoteAlt;
          image.loading = "lazy";
          image.addEventListener("click", () => {
            lightbox.hidden = false;
            lightboxImage.src = image.src;
            lightboxImage.alt = image.alt || "";
            lightboxTitle.textContent = image.closest("[data-archive-post]")?.querySelector(".archive-html-author-handle")?.textContent || ${JSON.stringify(title)};
            lightboxCaption.textContent = image.alt || "";
          });
          const placeholder = figure.querySelector(".archive-html-image-placeholder");
          if (placeholder) {
            placeholder.replaceWith(image);
          } else {
            figure.prepend(image);
          }
        });
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

async function exportArchiveHtmlFromCatalog(catalog = archiveCatalog, options = {}) {
  if (!catalog) {
    throw new Error(t("archiveNeedArchive"));
  }
  await ensureArchiveAvatarAssets(catalog);

  const assets = Array.isArray(catalog.assets) ? catalog.assets : [];
  const assetUris = new Map();
  const compactMode = options.mode === "compact";

  setArchiveProgress({
    title: t("archiveProgressHtmlTitle"),
    step: t("archiveProgressHtmlStep"),
    percent: 76,
    detail: compactMode
      ? t("archiveProgressHtmlCompactDetail")
      : t("archiveProgressHtmlDetail", { count: assets.length }),
  });

  if (!compactMode) {
    for (const [index, asset] of assets.entries()) {
      assetUris.set(asset.path, assetToDataUri(asset));
      setArchiveProgress({
        title: t("archiveProgressHtmlTitle"),
        step: t("archiveProgressHtmlStep"),
        percent: 76 + Math.round(((index + 1) / Math.max(1, assets.length)) * 18),
        detail: t("archiveProgressHtmlDetail", { count: assets.length }),
      });
    }
  }

  const html = buildArchiveHtmlDocument(catalog, assetUris, {
    embedPostImages: !compactMode,
    mode: compactMode ? "compact" : "full",
  });
  const fileName = `${makeArchiveFileBaseName(catalog)}${compactMode ? "-compact" : ""}.html`;
  const file = new File([html], fileName, { type: "text/html" });
  await shareOrDownloadFile(file, fileName, { preferDownload: true });
  setArchiveProgress({
    title: t("archiveProgressDoneTitle"),
    step: t("archiveProgressDoneStep"),
    percent: 100,
    detail: compactMode ? t("archiveHtmlCompactDone") : t("archiveHtmlDone"),
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

function extractPdfLinkRuns(text, facets = []) {
  const facetRuns = extractFacetRichTextRuns(text, facets);
  if (facetRuns) {
    return facetRuns;
  }

  const value = String(text || "");
  const regex = /(^|\s|\()((https?:\/\/[^\s]+)|((?<domain>[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})[^\s]*))/gim;
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

function buildPdfTextTokens(text, facets = []) {
  const runs = extractPdfLinkRuns(text, facets);
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

function buildWrappedPdfLines(context, text, maxWidth, facets = []) {
  const tokens = buildPdfTextTokens(text, facets);
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

function drawCircularImageCover(context, bitmap, x, y, size, background = "#dfe9fb") {
  context.save();
  context.beginPath();
  context.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.fillStyle = background;
  context.fillRect(x, y, size, size);

  const ratio = Math.max(size / bitmap.width, size / bitmap.height);
  const drawWidth = bitmap.width * ratio;
  const drawHeight = bitmap.height * ratio;
  const offsetX = x + ((size - drawWidth) / 2);
  const offsetY = y + ((size - drawHeight) / 2);
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
  const images = Array.isArray(post.images) ? post.images.slice(0, MAX_IMAGES_PER_SEGMENT) : [];
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

function getArchivePdfExternalCardLayout(context, post, contentWidth, scale) {
  const externalCard = getArchiveExternalCard(post);
  if (!externalCard) {
    return null;
  }

  const cardPadding = 11 * scale;
  const gap = 10 * scale;
  const hasThumb = Boolean(externalCard.thumbPath);
  const thumbWidth = hasThumb ? Math.min(116 * scale, contentWidth * 0.3) : 0;
  const thumbHeight = hasThumb ? (thumbWidth * 0.74) : 0;
  const textWidth = Math.max(120 * scale, contentWidth - (cardPadding * 2) - (hasThumb ? (thumbWidth + gap) : 0));
  const displayUrl = shortenArchiveUrlForDisplay(externalCard.url);

  context.font = `700 ${10.5 * scale}px "Segoe UI", Aptos, sans-serif`;
  const titleLines = buildWrappedPdfLines(context, externalCard.title || externalCard.url, textWidth).slice(0, 2);
  context.font = `${9.2 * scale}px "Segoe UI", Aptos, sans-serif`;
  const descriptionLines = externalCard.description
    ? buildWrappedPdfLines(context, externalCard.description, textWidth).slice(0, 3)
    : [];
  context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
  const urlLines = buildWrappedPdfLines(context, displayUrl, textWidth).slice(0, 2);

  const titleHeight = titleLines.length * (13 * scale);
  const descriptionHeight = descriptionLines.length * (11.5 * scale);
  const urlHeight = urlLines.length * (10.5 * scale);
  const textHeight = titleHeight + (descriptionLines.length ? descriptionHeight + (4 * scale) : 0) + (urlLines.length ? urlHeight + (5 * scale) : 0);
  const contentHeight = Math.max(hasThumb ? thumbHeight : 0, textHeight);

  return {
    card: externalCard,
    hasThumb,
    thumbWidth,
    thumbHeight,
    textWidth,
    cardPadding,
    gap,
    titleLines,
    descriptionLines,
    urlLines,
    height: contentHeight + (cardPadding * 2),
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
  const avatarOffset = post?.authorAvatarPath ? ((28 * scale) + (10 * scale)) : 0;
  const contentWidth = cardWidth - (innerPadding * 2) - depthIndent - avatarOffset;
  const headerHeight = 42 * scale;
  const metricsHeight = options.includeMetrics ? (28 * scale) : 0;
  const textLineHeight = 15 * scale;

  context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
  const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth, post.facets || []);
  let totalHeight = innerPadding + headerHeight + metricsHeight + (textLines.length * textLineHeight) + (12 * scale);

  const externalCardLayout = getArchivePdfExternalCardLayout(context, post, contentWidth, scale);
  if (externalCardLayout) {
    totalHeight += externalCardLayout.height + (12 * scale);
  }

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
  const avatarSize = 28 * scale;
  const avatarGap = 10 * scale;
  const avatarAsset = post.authorAvatarPath ? assetMap.get(post.authorAvatarPath) : null;
  const avatarOffset = avatarAsset ? (avatarSize + avatarGap) : 0;
  const cardContentX = textStartX + depthIndent + avatarOffset;
  const contentWidth = width - (innerPadding * 2) - depthIndent - avatarOffset;

  if (integrated && isReply) {
    fillRoundedRect(context, x + (10 * scale), y + (12 * scale), 3 * scale, cardHeight - (24 * scale), 2 * scale, "#d95f4b");
  } else if (!integrated && (Number(post?.threadDepth) || 0) > 0) {
    fillRoundedRect(context, cardContentX - (12 * scale), y + (14 * scale), 4 * scale, cardHeight - (28 * scale), 3 * scale, "#d95f4b");
  }

  context.textBaseline = "top";
  if (avatarAsset) {
    const avatarBitmap = await loadArchiveAssetBitmap(avatarAsset);
    drawCircularImageCover(context, avatarBitmap, textStartX, cursorY, avatarSize);
    avatarBitmap.close();
  }
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
  const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth, post.facets || []);
  const textBlock = drawArchivePdfTextBlock(context, textLines, cardContentX, cursorY, 15 * scale);
  annotations.push(...textBlock.annotations.map((annotation) => ({
    rect: canvasRectToPdfRect(annotation, canvasWidth, canvasHeight),
    url: annotation.url,
  })));
  cursorY += textBlock.height + (12 * scale);

  const externalCardLayout = getArchivePdfExternalCardLayout(context, post, contentWidth, scale);
  if (externalCardLayout) {
    const cardX = cardContentX;
    const cardY = cursorY;
    fillRoundedRect(context, cardX, cardY, contentWidth, externalCardLayout.height, 14 * scale, "#eef4ff");
    strokeRoundedRect(context, cardX, cardY, contentWidth, externalCardLayout.height, 14 * scale, "#d2def0", 1 * scale);

    let textX = cardX + externalCardLayout.cardPadding;
    const textY = cardY + externalCardLayout.cardPadding;
    if (externalCardLayout.hasThumb) {
      const thumbX = cardX + externalCardLayout.cardPadding;
      const thumbY = cardY + externalCardLayout.cardPadding;
      const thumbAsset = assetMap.get(externalCardLayout.card.thumbPath);
      if (thumbAsset) {
        const thumbBitmap = await loadArchiveAssetBitmap(thumbAsset);
        drawRoundedImageContain(context, thumbBitmap, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#dfe8f7");
        thumbBitmap.close();
      } else {
        fillRoundedRect(context, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#dfe8f7");
      }
      strokeRoundedRect(context, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#d5e0f2", 1 * scale);
      textX += externalCardLayout.thumbWidth + externalCardLayout.gap;
    }

    context.fillStyle = "#122642";
    context.font = `700 ${10.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    const titleBlock = drawArchivePdfTextBlock(context, externalCardLayout.titleLines, textX, textY, 13 * scale);
    let cardTextY = textY + titleBlock.height;

    if (externalCardLayout.descriptionLines.length > 0) {
      cardTextY += 4 * scale;
      context.fillStyle = "#415b81";
      context.font = `${9.2 * scale}px "Segoe UI", Aptos, sans-serif`;
      const descriptionBlock = drawArchivePdfTextBlock(context, externalCardLayout.descriptionLines, textX, cardTextY, 11.5 * scale);
      cardTextY += descriptionBlock.height;
    }

    if (externalCardLayout.urlLines.length > 0) {
      cardTextY += 5 * scale;
      context.fillStyle = "#1d4ed8";
      context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
      drawArchivePdfTextBlock(context, externalCardLayout.urlLines, textX, cardTextY, 10.5 * scale);
    }

    annotations.push({
      rect: canvasRectToPdfRect({
        x: cardX,
        y: cardY,
        width: contentWidth,
        height: externalCardLayout.height,
      }, canvasWidth, canvasHeight),
      url: externalCardLayout.card.url,
    });
    cursorY += externalCardLayout.height + (12 * scale);
  }

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
  const skippedImageCount = Number(catalog?.summary?.skippedImageCount) || 0;
  if (skippedImageCount > 0) {
    context.fillStyle = "#a33e2d";
    context.font = `${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("archiveSkippedImagesPdfNotice", { skipped: skippedImageCount }), margin + (18 * scale), margin + (48 * scale));
  }

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
  await ensureArchiveAvatarAssets(catalog);

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

function tokenizePostEditText(text) {
  return String(text || "").match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu) || [];
}

function getCurrentPostEditTokenStates(originalText, currentText) {
  const originalTokens = tokenizePostEditText(originalText);
  const currentTokens = tokenizePostEditText(currentText);
  const rows = originalTokens.length + 1;
  const columns = currentTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex -= 1) {
    for (let currentIndex = currentTokens.length - 1; currentIndex >= 0; currentIndex -= 1) {
      matrix[originalIndex][currentIndex] = originalTokens[originalIndex] === currentTokens[currentIndex]
        ? matrix[originalIndex + 1][currentIndex + 1] + 1
        : Math.max(matrix[originalIndex + 1][currentIndex], matrix[originalIndex][currentIndex + 1]);
    }
  }

  const unchangedCurrentIndexes = new Set();
  let originalIndex = 0;
  let currentIndex = 0;
  while (originalIndex < originalTokens.length && currentIndex < currentTokens.length) {
    if (originalTokens[originalIndex] === currentTokens[currentIndex]) {
      unchangedCurrentIndexes.add(currentIndex);
      originalIndex += 1;
      currentIndex += 1;
    } else if (matrix[originalIndex + 1][currentIndex] >= matrix[originalIndex][currentIndex + 1]) {
      originalIndex += 1;
    } else {
      currentIndex += 1;
    }
  }

  return currentTokens.map((token, index) => ({
    token,
    changed: !unchangedCurrentIndexes.has(index),
  }));
}

function renderPostEditCurrentText(originalText, currentText) {
  postEditCheckCurrent.replaceChildren();
  const tokenStates = getCurrentPostEditTokenStates(originalText, currentText);
  let changedRun = null;

  tokenStates.forEach(({ token, changed }) => {
    if (!changed) {
      changedRun = null;
      postEditCheckCurrent.append(document.createTextNode(token));
      return;
    }
    if (!changedRun) {
      changedRun = document.createElement("mark");
      changedRun.className = "post-edit-difference";
      postEditCheckCurrent.appendChild(changedRun);
    }
    changedRun.append(document.createTextNode(token));
  });
}

function resetPostEditCheckResult() {
  postEditCheckStatus.textContent = "";
  postEditCheckStatus.className = "post-edit-check-status settings-note";
  postEditCheckResult.hidden = true;
  postEditCheckCreated.textContent = "";
  postEditCheckUpdated.textContent = "";
  postEditCheckOriginal.textContent = "";
  postEditCheckCurrent.replaceChildren();
}

function openPostEditCheckDialog() {
  resetPostEditCheckResult();
  postEditCheckUrlInput.value = String(archiveThreadUrlInput?.value || "").trim();
  postEditCheckDialog.showModal();
  window.setTimeout(() => {
    postEditCheckUrlInput.focus();
    if (postEditCheckUrlInput.value) {
      postEditCheckUrlInput.select();
    }
  }, 0);
}

function closePostEditCheckDialog() {
  if (postEditCheckDialog.open) {
    postEditCheckDialog.close();
  }
}

async function checkPostEditMetadata() {
  const url = String(postEditCheckUrlInput.value || "").trim();
  if (!url) {
    throw new Error(t("postEditCheckInvalidUrl"));
  }

  resetPostEditCheckResult();
  postEditCheckStatus.textContent = t("postEditCheckLoading");
  const result = await sendToServiceWorker("CHECK_POST_EDIT", { url }, { timeoutMs: 120000 });

  if (!result?.isEdited) {
    postEditCheckStatus.textContent = t("postEditCheckNotDetected");
    postEditCheckStatus.classList.add("is-unedited");
    return;
  }

  postEditCheckStatus.textContent = t("postEditCheckDetected");
  postEditCheckStatus.classList.add("is-edited");
  postEditCheckCreated.textContent = formatHistoryTimestamp(result.createdAt);
  postEditCheckUpdated.textContent = formatHistoryTimestamp(result.updatedAt);
  postEditCheckOriginal.textContent = result.originalText;
  renderPostEditCurrentText(result.originalText, result.text);
  postEditCheckResult.hidden = false;
}

async function importArchiveThreadFromUrl() {
  const threadUrl = String(archiveThreadUrlInput?.value || "").trim();
  const importMode = archiveThreadImportModeSelect?.value === "tree"
    ? "tree"
    : (archiveThreadImportModeSelect?.value === "author" ? "author" : "path");
  if (!threadUrl) {
    throw new Error(t("archiveThreadUrlInvalid"));
  }

  setArchiveProgress({
    title: t("archiveThreadUrlLoadingTitle"),
    step: t("archiveThreadUrlLoadingStep"),
    percent: 4,
    detail: threadUrl,
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
    catalog = await sendToServiceWorker("IMPORT_ARCHIVE_THREAD_FROM_URL", {
      runId: activeArchiveRunId,
      url: threadUrl,
      importMode,
    }, {
      timeoutMs: 600000,
      onProgress(progress) {
        const progressDetail = [
          progress.detail || "",
          progress.preview?.metric || "",
          progress.preview?.meta || "",
        ].filter(Boolean).join(" \u2022 ");
        setArchiveProgress({
          title: progress.title || archiveJobState?.title || t("archiveThreadUrlLoadingTitle"),
          step: progress.step || archiveJobState?.step || t("archiveThreadUrlLoadingStep"),
          percent: Number.isFinite(progress.percent) ? progress.percent : (archiveJobState?.percent || 0),
          detail: progressDetail || archiveJobState?.detail || threadUrl,
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
        } else if (progress.state === "running") {
          activeArchiveRunState = "running";
        }
        updateArchiveRunControls();
        renderArchiveStatusLine();
        renderArchiveStartHint();
      },
    });
  } catch (error) {
    activeArchiveRunState = "idle";
    activeArchiveRunId = null;
    updateArchiveRunControls();
    throw error;
  }

  activeArchiveRunState = "idle";
  activeArchiveRunId = null;
  updateArchiveRunControls();
  await applyLoadedArchiveCatalog(normalizeImportedArchiveCatalog(catalog), {
    filterKey: `thread-url:${catalog?.manifest?.threadImport?.entryUri || threadUrl}`,
    filters: null,
    waveIndex: 1,
    nextCursor: "",
    hasMore: false,
    exportedPosts: catalog?.posts?.length || 0,
    exportedImages: Array.isArray(catalog?.assets) ? catalog.assets.length : 0,
    status: "completed",
    step: t("archiveThreadUrlImportedStep"),
  });
}

function buildComposedText(baseText) {
  const trimmedBase = baseText.trim();
  const selectedText = getSelectedHashtagText();

  if (!selectedText || hashtagPlacement === "all-top" || hashtagPlacement === "all-bottom") {
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
  const isArchiveContext = isArchiveHashtagContext();
  const activeSelectedHashtags = isArchiveContext ? archiveSelectedHashtags : selectedHashtags;
  const composerHashtagLocked = composerLocked && !isArchiveContext;

  hashtags.forEach((tag) => {
    const item = document.createElement("div");
    item.className = "hashtag-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `hashtag-chip ${getHashtagFontClass(tag)}`;
    if (activeSelectedHashtags.includes(tag.normalized)) {
      button.classList.add("is-selected");
    }
    button.textContent = formatHashtag(tag.value);
    button.disabled = composerHashtagLocked;
    button.addEventListener("click", () => {
      if (composerHashtagLocked) {
        return;
      }
      const currentSelection = isArchiveContext ? archiveSelectedHashtags : selectedHashtags;
      const nextSelection = currentSelection.includes(tag.normalized)
        ? currentSelection.filter((entry) => entry !== tag.normalized)
        : [...currentSelection, tag.normalized];
      if (isArchiveContext) {
        archiveSelectedHashtags = normalizeSelectedHashtagEntries(nextSelection, hashtags);
        if (archiveSelectedHashtags.length > 0 && archiveContentModeSelect.value === "posts") {
          archiveContentModeSelect.value = "thread_roots";
        }
        renderHashtagCloud();
        invalidateArchiveCatalog();
        void persistArchivePreferences();
      } else {
        selectedHashtags = normalizeSelectedHashtagEntries(nextSelection, hashtags);
        renderHashtagCloud();
        void persistSettings();
        segmentOverrides = null;
        setComposerLocked(false);
        renderSegments({ preserveOverrides: false });
      }
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "hashtag-tool";
    editButton.setAttribute("aria-label", t("editHashtagAria", { tag: formatHashtag(tag.value) }));
    editButton.disabled = composerHashtagLocked;
    editButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16.75V20h3.25L18.4 8.84l-3.24-3.24L4 16.75zm14.71-9.04a1 1 0 0 0 0-1.42l-1-1a1 1 0 0 0-1.42 0l-.88.88 3.24 3.24.06-.06z"></path>
      </svg>
    `;
    editButton.addEventListener("click", async () => {
      if (composerHashtagLocked) {
        return;
      }
      openHashtagEditDialog(tag);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "hashtag-tool danger";
    deleteButton.setAttribute("aria-label", t("deleteHashtagAria", { tag: formatHashtag(tag.value) }));
    deleteButton.disabled = composerHashtagLocked;
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 8h10l-1 12H8L7 8z"></path>
      </svg>
    `;
    deleteButton.addEventListener("click", async () => {
      if (composerHashtagLocked) {
        return;
      }
      hashtags = hashtags.filter((entry) => entry.normalized !== tag.normalized);
      selectedHashtags = selectedHashtags.filter((entry) => entry !== tag.normalized);
      archiveSelectedHashtags = archiveSelectedHashtags.filter((entry) => entry !== tag.normalized);
      renderHashtagCloud();
      segmentOverrides = null;
      setComposerLocked(false);
      renderSegments({ preserveOverrides: false });
      await persistSettings();
      if (isArchiveContext) {
        invalidateArchiveCatalog();
      }
      setStatus(t("hashtagDeleted"));
    });

    item.append(button, editButton, deleteButton);
    hashtagCloud.appendChild(item);
  });

  hashtagSelectionNote.textContent = activeSelectedHashtags.length > 0
    ? t(isArchiveContext ? "archiveHashtagSelectionSome" : "hashtagSelectionSome", { count: activeSelectedHashtags.length })
    : t(isArchiveContext ? "archiveHashtagSelectionNone" : "hashtagSelectionNone");
}

async function persistSettings() {
  try {
    await sendToServiceWorker("SAVE_SETTINGS", {
      localePreference,
      tipsVisible,
      altTextRequired,
      themeMode,
      sidebarCollapsedDesktop,
      desktopLayoutVersion: DESKTOP_LAYOUT_STATE_VERSION,
      sidebarWidthDesktop,
      composerWidthDesktop,
      postLanguages: getNormalizedPostLanguagesOrDefault(),
      appendThreadIntro,
      appendThreadEmoji,
      addMarkerSpacing,
      postInteraction: getCurrentPostInteractionSettings(),
      linkCardProxy: getLinkCardSettings(),
      hashtags,
      selectedHashtags,
      hashtagPlacement,
      segmentImages,
      segmentLinkCards,
      postingHistory,
      archivePreferences: getArchivePreferences(),
    }, { timeoutMs: 120000 });
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

function serializeBackupAssets(assets = []) {
  return (Array.isArray(assets) ? assets : []).map((asset) => ({
    path: String(asset.path || ""),
    type: String(asset.type || "application/octet-stream"),
    sizeBytes: Math.max(0, Number(asset.sizeBytes) || (asset.bytes?.length || 0)),
    bytesBase64: bytesToBase64(asset.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset.bytes || [])),
  })).filter((asset) => asset.path && asset.bytesBase64);
}

function deserializeBackupAssets(assets = []) {
  return (Array.isArray(assets) ? assets : []).map((asset) => ({
    path: String(asset.path || ""),
    type: String(asset.type || "application/octet-stream"),
    sizeBytes: Math.max(0, Number(asset.sizeBytes) || 0),
    bytes: base64ToBytes(asset.bytesBase64 || ""),
  })).filter((asset) => asset.path && asset.bytes.length > 0);
}

async function gzipBytes(bytes) {
  if (typeof CompressionStream !== "function") {
    throw new Error("GZIP-Komprimierung wird in diesem Browser nicht unterstützt.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  return concatUint8Arrays(chunks);
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("GZIP-Dekomprimierung wird in diesem Browser nicht unterstützt.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  return concatUint8Arrays(chunks);
}

async function createSettingsBackupPayload() {
  const accountAssets = Array.isArray(accountAvatarAssets) ? accountAvatarAssets : [];
  const dmAssets = Array.isArray(dmRecentContactAssets) ? dmRecentContactAssets : [];
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
      sidebarCollapsedDesktop,
      desktopLayoutVersion: DESKTOP_LAYOUT_STATE_VERSION,
      sidebarWidthDesktop,
      composerWidthDesktop,
      postLanguages: getNormalizedPostLanguagesOrDefault(),
      appendThreadIntro,
      appendThreadEmoji,
      addMarkerSpacing,
      postInteraction: getCurrentPostInteractionSettings(),
      savedAccounts: savedAccounts.map((account) => ({
        did: account.did || "",
        handle: account.handle || "",
        identifier: account.identifier || "",
        service: account.service || "",
        avatar: account.avatar || "",
        avatarPath: account.avatarPath || "",
      })),
      accountAvatarCache: {
        assets: serializeBackupAssets(accountAssets),
      },
      dmPartnerCache: {
        accountDid: dmPartnerCacheAccountDid,
        updatedAt: dmPartnerCacheUpdatedAt,
        recentContacts: Array.isArray(dmRecentContacts) ? dmRecentContacts : [],
        conversations: Array.isArray(dmRecentConversations) ? dmRecentConversations : [],
        assets: serializeBackupAssets(dmAssets),
      },
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
  const payload = await createSettingsBackupPayload();
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  const gzipPayload = await gzipBytes(jsonBytes);
  const file = new File(
    [gzipPayload],
    `threadline-settings-${new Date().toISOString().slice(0, 10)}.json.gz`,
    { type: "application/gzip" },
  );

  await shareOrDownloadFile(file, file.name);
  setBackupStatus(t("backupExported"));
}

async function importSettingsBackup(file) {
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const payloadBytes = /\.gz$/i.test(file.name)
    ? await gunzipBytes(rawBytes)
    : rawBytes;
  const text = new TextDecoder().decode(payloadBytes);
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
  hashtagPlacement = normalizeHashtagPlacement(imported.hashtagPlacement);
  hashtagPlacementSelect.value = hashtagPlacement;
  tipsVisible = imported.tipsVisible !== false;
  altTextRequired = imported.altTextRequired === true;
  themeMode = imported.themeMode === "dark" ? "dark" : "light";
  sidebarCollapsedDesktop = imported.sidebarCollapsedDesktop === true;
  ({
    sidebarWidthDesktop,
    composerWidthDesktop,
  } = normalizeStoredDesktopLayout(
    imported.sidebarWidthDesktop,
    imported.composerWidthDesktop,
    imported.desktopLayoutVersion,
  ));
  selectedPostLanguages = normalizePostLanguageTags(imported.postLanguages);
  appendThreadIntro = imported.appendThreadIntro === true;
  threadIntroToggle.checked = appendThreadIntro;
  appendThreadEmoji = imported.appendThreadEmoji === true;
  threadEmojiToggle.checked = appendThreadEmoji;
  addMarkerSpacing = imported.addMarkerSpacing === true;
  markerSpacingToggle.checked = addMarkerSpacing;
  applyPostInteractionSettings(imported.postInteraction || {});
  if (imported.linkCardProxy && typeof imported.linkCardProxy === "object") {
    linkCardEndpointInput.value = imported.linkCardProxy.endpoint || "";
    linkCardSecretInput.value = imported.linkCardProxy.secret || "";
  }
  localePreference = SUPPORTED_LOCALES.includes(imported.localePreference) || imported.localePreference === "auto"
    ? imported.localePreference
    : localePreference;
  currentLocale = localePreference === "auto" ? detectBrowserLocale() : localePreference;
  languageSelect.value = localePreference;
  applyArchivePreferences(imported.archivePreferences || {});
  applyDesktopLayoutState();
  applySidebarState();

  if (Array.isArray(imported.savedAccounts) && imported.savedAccounts.length > 0) {
    const accountResult = await sendToServiceWorker("IMPORT_ACCOUNT_METADATA", { accounts: imported.savedAccounts });
    savedAccounts = Array.isArray(accountResult.accounts) ? accountResult.accounts : savedAccounts;
  }

  if (imported.accountAvatarCache && typeof imported.accountAvatarCache === "object") {
    const importedAccountAssets = Array.isArray(imported.accountAvatarCache.assets)
      ? deserializeBackupAssets(imported.accountAvatarCache.assets)
      : null;
    if (importedAccountAssets) {
      applyAccountAvatarCache({ assets: importedAccountAssets });
      await sendToServiceWorker("SAVE_ACCOUNT_AVATAR_CACHE", {
        cache: {
          updatedAt: new Date().toISOString(),
          assets: importedAccountAssets,
        },
      }, { timeoutMs: 120000 }).catch(() => {});
    }
  }

  if (imported.dmPartnerCache && typeof imported.dmPartnerCache === "object") {
    const importedDmAssets = Array.isArray(imported.dmPartnerCache.assets)
      ? deserializeBackupAssets(imported.dmPartnerCache.assets)
      : null;
    applyDmPartnerCache({
      accountDid: String(imported.dmPartnerCache.accountDid || ""),
      updatedAt: String(imported.dmPartnerCache.updatedAt || ""),
      recentContacts: Array.isArray(imported.dmPartnerCache.recentContacts) ? imported.dmPartnerCache.recentContacts : [],
      conversations: Array.isArray(imported.dmPartnerCache.conversations) ? imported.dmPartnerCache.conversations : [],
      assets: importedDmAssets ?? dmRecentContactAssets,
    });
    await sendToServiceWorker("SAVE_DM_PARTNER_CACHE", {
      cache: {
        accountDid: dmPartnerCacheAccountDid,
        updatedAt: dmPartnerCacheUpdatedAt || new Date().toISOString(),
        recentContacts: dmRecentContacts,
        conversations: dmRecentConversations,
        assets: importedDmAssets ?? dmRecentContactAssets,
      },
    }, { timeoutMs: 120000 }).catch(() => {});
  }

  await persistSettings();
  applyTranslations();
  renderAccountSwitcher();
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
    appVersion: String(versionInfo?.appVersion || "").trim(),
    cacheVersion: String(versionInfo?.cacheVersion || "").trim(),
    label: String(versionInfo?.label || "").trim(),
  };
}

function setUpdateStatus(message, showReload = false, error = false) {
  if (!updateStatus || !reloadAppButton) {
    return;
  }

  updateStatus.textContent = message || "";
  updateStatus.hidden = !message;
  updateStatus.dataset.state = error ? "error" : (message ? "info" : "");
  reloadAppButton.hidden = false;
  reloadAppButton.disabled = Boolean(reloadInProgress);
  reloadAppButton.classList.toggle("is-active", Boolean(showReload));
}

function renderVersionLabel() {
  if (!versionLabel) {
    return;
  }

  const parts = [
    `${t("versionPrefix")} ${CURRENT_VERSION_INFO.appVersion}`,
    `${t("offlineVersion")} ${CURRENT_VERSION_INFO.cacheVersion}`,
  ];

  if (CURRENT_VERSION_INFO.label) {
    parts.push(CURRENT_VERSION_INFO.label);
  }

  versionLabel.textContent = parts.join(" · ");
}

async function fetchVersionInfo() {
  const response = await fetch("./version.js", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Version file unavailable");
  }
  const source = await response.text();
  const appVersion = source.match(/appVersion:\s*"([^"]+)"/)?.[1] || "";
  const cacheVersion = source.match(/cacheVersion:\s*"([^"]+)"/)?.[1] || "";
  const label = source.match(/label:\s*"([^"]*)"/)?.[1] || "";
  return normalizeVersionInfo({ appVersion, cacheVersion, label });
}

async function performAppReload() {
  if (reloadInProgress) {
    return;
  }

  reloadInProgress = true;
  setUpdateStatus(t("updateApplying"), true);
  try {
    await serviceWorkerRegistration?.update().catch(() => {});
    serviceWorkerRegistration?.waiting?.postMessage?.({ type: "SKIP_WAITING" });
  } catch (error) {
    console.error(error);
  }

  window.setTimeout(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("reload", String(Date.now()));
    window.location.replace(nextUrl.toString());
  }, 120);
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
          setUpdateStatus(t("updateVersionIncomplete"), false, true);
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
      setUpdateStatus(t("updateFailed"), false, true);
    }
  } finally {
    updateInProgress = false;
    checkUpdatesButton.disabled = false;
  }
}

function shouldRunAutoUpdateCheck() {
  const now = Date.now();
  if (now - lastAutoUpdateCheckAt < AUTO_UPDATE_CHECK_INTERVAL_MS) {
    return false;
  }
  lastAutoUpdateCheckAt = now;
  return true;
}

function scheduleSilentUpdateCheck() {
  if (!shouldRunAutoUpdateCheck()) {
    return;
  }
  void checkForUpdates({
    showChecking: false,
    silentNoChange: true,
    silentError: true,
  });
}

function updateStatusForAuth() {
  updateAuthButtons();
  ensureNetworkStateForAccount();
  if (currentWorkspace === "network") {
    renderNetworkWorkspace();
    if (authAccount && !networkNodes.size && !networkLoading) {
      void loadNetworkWave({ silentErrors: true });
    }
  }

  if (authAccount) {
    if (!appOnline) {
      setStatus(t("statusAccountOffline", { account: authAccount }), "error");
      return;
    }
    setStatus(t("statusConnected", { account: authAccount }));
    return;
  }

  setStatus(t("statusNoAuth"));
}

async function verifySession(options = {}) {
  const { silent = false } = options;

  if (!authAccountDid) {
    return false;
  }

  try {
    const result = await sendToServiceWorker("VERIFY_SESSION");
    savedAccounts = Array.isArray(result.accounts) ? result.accounts : savedAccounts;
    await restoreAccountAvatarCache();
    renderAccountSwitcher();

    if (!result.authenticated) {
      const activeAccount = savedAccounts.find((entry) => entry.did && entry.did === authAccountDid) || null;
      const accountLabel = activeAccount?.handle || activeAccount?.identifier || authAccount || "";
      if (result.reason === "offline") {
        if (!silent && accountLabel) {
          setStatus(t("statusAccountOffline", { account: accountLabel }), "error");
        }
        updateAuthButtons();
        return false;
      }
      if (result.reason === "invalid_password" || result.reason === "missing_password") {
        const message = result.reason === "invalid_password"
          ? t("statusAccountPasswordRejected", { account: accountLabel })
          : t("statusAccountNeedsLogin", { account: accountLabel });
        applyDisconnectedState(false);
        if (activeAccount) {
          openLoginDialog({
            account: activeAccount,
            mode: "repair",
            note: message,
            tone: "error",
          });
        }
        setStatus(message, "error");
        return false;
      }

      applyDisconnectedState(!silent);
      return false;
    }

    authAccount = result.handle || result.identifier || authAccount;
    authAccountDid = result.did || authAccountDid;
    authAccountService = result.service || authAccountService;
    authAccountWebApp = result.webApp || authAccountWebApp;

    if (silent) {
      updateAuthButtons();
    } else {
      setStatus(t("statusConnected", { account: authAccount }));
    }

    restorePreferredWorkspaceIfPossible();

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

function resolvePostWebBase(serviceUrl = authAccountService) {
  try {
    const normalizedService = normalizeServiceUrl(serviceUrl);
    const host = new URL(normalizedService).hostname.toLowerCase();
    return POST_WEB_FRONTENDS[host] || DEFAULT_POST_WEB_APP;
  } catch {
    return DEFAULT_POST_WEB_APP;
  }
}

function buildBlueskyPostUrl(handle, uri, serviceUrl = authAccountService) {
  const parts = String(uri || "").split("/");
  const recordId = parts[parts.length - 1];

  if (!handle || !recordId) {
    return "";
  }

  return `${resolvePostWebBase(serviceUrl)}/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordId)}`;
}

function showPublishResult(result) {
  const postCount = result.posts?.length || 0;
  const handle = result.handle || authAccount;
  const firstPost = result.posts?.[0];
  const resultWebApp = result.webApp || authAccountWebApp;
  const postTarget = getPostTargetName(resultWebApp);
  const postUrl = buildBlueskyPostUrl(handle, firstPost?.uri, resultWebApp);

  publishResultText.textContent = postCount > 1
    ? t("publishResultMessageManyTarget", { target: postTarget })
    : t("publishResultMessageOneTarget", { target: postTarget });
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

function formatCompactArchiveTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "");
  }
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join(".") + ` ${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")}`;
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
      counts.textContent = formatHistoryMeta(entry.threadCount, entry.imageCount);

    const accountLine = document.createElement("p");
    accountLine.className = "history-meta";
    accountLine.textContent = t("historyAccountMeta", {
      account: entry.account || t("historyUnknownAccount"),
    });

    meta.append(timestamp, counts, accountLine);

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
  const service = result.service || authAccountService;
  const url = buildBlueskyPostUrl(handle, firstPost?.uri, result.webApp || authAccountWebApp || service);
  if (!url) {
    return;
  }

  postingHistory = normalizePostingHistory([
    {
      id: crypto.randomUUID(),
      url,
      createdAt: new Date().toISOString(),
      account: handle || authAccount || "",
      service,
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

function resizeAllSegmentTextareas() {
  segmentsList.querySelectorAll(".segment-text").forEach((textarea) => {
    autoSizeTextarea(textarea);
  });
}

function scheduleSegmentTextareaResize() {
  if (segmentTextareaResizeFrame) {
    cancelAnimationFrame(segmentTextareaResizeFrame);
  }
  segmentTextareaResizeFrame = requestAnimationFrame(() => {
    segmentTextareaResizeFrame = 0;
    resizeAllSegmentTextareas();
  });
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

function decodeMinimalHtmlEntities(value) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function sanitizeHelpUrl(rawUrl, type = "link") {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed || /^\/\//.test(trimmed)) {
    return "";
  }

  const decoded = decodeMinimalHtmlEntities(trimmed);
  if (decoded.startsWith("#")) {
    return escapeHtml(decoded);
  }

  try {
    const parsed = new URL(decoded, window.location.href);
    const protocol = parsed.protocol.toLowerCase();
    const isAllowedProtocol = protocol === "https:" || protocol === "http:" || (type === "link" && protocol === "mailto:");
    if (!isAllowedProtocol) {
      return "";
    }
    return escapeHtml(parsed.href);
  } catch {
    const normalized = decoded.toLowerCase();
    const looksLikeRelativePath = !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
    if (!looksLikeRelativePath) {
      return "";
    }
    if (/[\u0000-\u001f]/.test(decoded)) {
      return "";
    }
    return escapeHtml(decoded);
  }
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, alt, imageUrl, linkUrl) => {
    const safeImageUrl = sanitizeHelpUrl(imageUrl, "image");
    const safeLinkUrl = sanitizeHelpUrl(linkUrl, "link");
    if (!safeImageUrl || !safeLinkUrl) {
      return escapeHtml(alt);
    }
    return `<a href="${safeLinkUrl}" target="_blank" rel="noreferrer noopener"><img src="${safeImageUrl}" alt="${alt}"></a>`;
  });
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imageUrl) => {
    const safeImageUrl = sanitizeHelpUrl(imageUrl, "image");
    return safeImageUrl ? `<img src="${safeImageUrl}" alt="${alt}">` : escapeHtml(alt);
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, linkUrl) => {
    const safeLinkUrl = sanitizeHelpUrl(linkUrl, "link");
    return safeLinkUrl ? `<a href="${safeLinkUrl}" target="_blank" rel="noreferrer noopener">${label}</a>` : label;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function convertHtmlBlocks(markdown) {
  return markdown
    .replace(/<p\s+align="center">\s*<img\s+src="([^"]+)"\s+alt="([^"]*)"\s+width="([^"]+)"\s*>\s*<\/p>/gi, (_, src, alt, width) => {
      const safeImageUrl = sanitizeHelpUrl(src, "image");
      return safeImageUrl
        ? `<p class="help-centered"><img src="${safeImageUrl}" alt="${escapeHtml(alt)}" width="${width}"></p>`
        : `<p class="help-centered">${escapeHtml(alt)}</p>`;
    })
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

function getInlineHelpTopic(topicId = "") {
  switch (String(topicId || "").trim()) {
    case "composer_workspace":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicComposerWorkspaceTitle"),
        text: t("helpTopicComposerWorkspaceText"),
        bullets: [
          t("helpTopicComposerWorkspaceBullet1"),
          t("helpTopicComposerWorkspaceBullet2"),
          t("helpTopicComposerWorkspaceBullet3"),
        ],
      };
    case "composer_input":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicComposerInputTitle"),
        text: t("helpTopicComposerInputText"),
        bullets: [
          t("helpTopicComposerInputBullet1"),
          t("helpTopicComposerInputBullet2"),
          t("helpTopicComposerInputBullet3"),
        ],
      };
    case "composer_post_settings":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicComposerPostSettingsTitle"),
        text: t("helpTopicComposerPostSettingsText"),
        bullets: [
          t("helpTopicComposerPostSettingsBullet1"),
          t("helpTopicComposerPostSettingsBullet2"),
          t("helpTopicComposerPostSettingsBullet3"),
        ],
      };
    case "composer_hashtags":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicComposerHashtagsTitle"),
        text: t("helpTopicComposerHashtagsText"),
        bullets: [
          t("helpTopicComposerHashtagsBullet1"),
          t("helpTopicComposerHashtagsBullet2"),
          t("helpTopicComposerHashtagsBullet3"),
        ],
      };
    case "composer_segments":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicComposerSegmentsTitle"),
        text: t("helpTopicComposerSegmentsText"),
        bullets: [
          t("helpTopicComposerSegmentsBullet1"),
          t("helpTopicComposerSegmentsBullet2"),
          t("helpTopicComposerSegmentsBullet3"),
          t("helpTopicComposerSegmentsBullet4"),
        ],
      };
    case "image_editor":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicImageEditorTitle"),
        text: t("helpTopicImageEditorText"),
        bullets: [
          t("helpTopicImageEditorBullet1"),
          t("helpTopicImageEditorBullet2"),
          t("helpTopicImageEditorBullet3"),
        ],
      };
    case "archive_workspace":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveWorkspaceTitle"),
        text: t("helpTopicArchiveWorkspaceText"),
        bullets: [
          t("helpTopicArchiveWorkspaceBullet1"),
          t("helpTopicArchiveWorkspaceBullet2"),
          t("helpTopicArchiveWorkspaceBullet3"),
        ],
      };
    case "archive_scope":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveScopeTitle"),
        text: t("helpTopicArchiveScopeText"),
        bullets: [
          t("helpTopicArchiveScopeBullet1"),
          t("helpTopicArchiveScopeBullet2"),
          t("helpTopicArchiveScopeBullet3"),
        ],
      };
    case "archive_actions":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveActionsTitle"),
        text: t("helpTopicArchiveActionsText"),
        bullets: [
          t("helpTopicArchiveActionsBullet1"),
          t("helpTopicArchiveActionsBullet2"),
          t("helpTopicArchiveActionsBullet3"),
        ],
      };
    case "archive_media":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveMediaTitle"),
        text: t("helpTopicArchiveMediaText"),
        bullets: [
          t("helpTopicArchiveMediaBullet1"),
          t("helpTopicArchiveMediaBullet2"),
          t("helpTopicArchiveMediaBullet3"),
        ],
      };
    case "archive_unroll":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveUnrollTitle"),
        text: t("helpTopicArchiveUnrollText"),
        bullets: [
          t("helpTopicArchiveUnrollBullet1"),
          t("helpTopicArchiveUnrollBullet2"),
          t("helpTopicArchiveUnrollBullet3"),
          t("helpTopicArchiveUnrollBullet4"),
        ],
      };
    case "archive_progress":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicArchiveProgressTitle"),
        text: t("helpTopicArchiveProgressText"),
        bullets: [
          t("helpTopicArchiveProgressBullet1"),
          t("helpTopicArchiveProgressBullet2"),
          t("helpTopicArchiveProgressBullet3"),
        ],
      };
    case "network_workspace":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicNetworkWorkspaceTitle"),
        text: t("helpTopicNetworkWorkspaceText"),
        bullets: [
          t("helpTopicNetworkWorkspaceBullet1"),
          t("helpTopicNetworkWorkspaceBullet2"),
          t("helpTopicNetworkWorkspaceBullet3"),
        ],
      };
    case "network_stage":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicNetworkStageTitle"),
        text: t("helpTopicNetworkStageText"),
        bullets: [
          t("helpTopicNetworkStageBullet1"),
          t("helpTopicNetworkStageBullet2"),
          t("helpTopicNetworkStageBullet3"),
        ],
      };
    case "dm_workspace":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicDmWorkspaceTitle"),
        text: t("helpTopicDmWorkspaceText"),
        bullets: [
          t("helpTopicDmWorkspaceBullet1"),
          t("helpTopicDmWorkspaceBullet2"),
          t("helpTopicDmWorkspaceBullet3"),
        ],
      };
    case "dm_scope":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicDmScopeTitle"),
        text: t("helpTopicDmScopeText"),
        bullets: [
          t("helpTopicDmScopeBullet1"),
          t("helpTopicDmScopeBullet2"),
          t("helpTopicDmScopeBullet3"),
        ],
      };
    case "dm_actions":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicDmActionsTitle"),
        text: t("helpTopicDmActionsText"),
        bullets: [
          t("helpTopicDmActionsBullet1"),
          t("helpTopicDmActionsBullet2"),
          t("helpTopicDmActionsBullet3"),
        ],
      };
    case "dm_progress":
      return {
        eyebrow: t("helpEyebrow"),
        title: t("helpTopicDmProgressTitle"),
        text: t("helpTopicDmProgressText"),
        bullets: [
          t("helpTopicDmProgressBullet1"),
          t("helpTopicDmProgressBullet2"),
          t("helpTopicDmProgressBullet3"),
        ],
      };
    default:
      return null;
  }
}

function renderInlineHelpHtml(topic) {
  if (!topic) {
    return "";
  }
  const textHtml = topic.text ? `<p>${escapeHtml(topic.text)}</p>` : "";
  const bulletsHtml = Array.isArray(topic.bullets) && topic.bullets.length
    ? `<ul class="help-topic-list">${topic.bullets.filter(Boolean).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`
    : "";
  return `${textHtml}${bulletsHtml}`;
}

function applyHelpDialogHeader(eyebrow, title) {
  if (helpDialogEyebrow) {
    helpDialogEyebrow.textContent = eyebrow || t("helpEyebrow");
  }
  if (helpDialogTitle) {
    helpDialogTitle.textContent = title || t("helpTitle");
  }
}

function openInlineHelpTopic(topicId) {
  const topic = getInlineHelpTopic(topicId);
  if (!topic) {
    return;
  }
  applyHelpDialogHeader(topic.eyebrow, topic.title);
  helpStatus.textContent = "";
  helpContent.innerHTML = renderInlineHelpHtml(topic);
  helpDialog.showModal();
}

function reserveForCounters(segmentCount) {
  const digits = String(Math.max(segmentCount, 1)).length;
  return 2 * digits + 3;
}

function reserveForThreadEmoji() {
  return "\n⤵️".length;
}

function reserveForThreadIntro() {
  return `\n${getThreadIntroText()}`.length;
}

function reserveForRepeatedHashtags(selectedText, placementMode) {
  if (!selectedText) {
    return 0;
  }

  return placementMode === "all-bottom"
    ? `\n\n${selectedText}`.length
    : `\n${selectedText}`.length;
}

function splitByManualMarkers(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(MANUAL_SPLIT_MARKER)
    .map((part) => normalizeInput(part))
    .filter(Boolean);
}

function splitChunksGreedy(chunks, limitFactory) {
  let globalOffset = 0;
  return chunks.flatMap((chunk) => {
    const split = greedySplit(chunk, (chunkIndex) => limitFactory(globalOffset + chunkIndex));
    globalOffset += split.length;
    return split;
  });
}

function decorateSegments(segments, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText) {
  return segments.map((segment, segmentIndex) => {
    let content = segment;
    let suffix = "";
    const isLastSegment = segmentIndex === segments.length - 1;
    const isThread = segments.length > 1;
    const hasRepeatedHashtags = selectedHashtagText && (repeatedHashtagMode === "all-top" || repeatedHashtagMode === "all-bottom");

    if (hasRepeatedHashtags && repeatedHashtagMode === "all-top") {
      content = `${selectedHashtagText}\n${content}`;
    }

    if (hasRepeatedHashtags && repeatedHashtagMode === "all-bottom") {
      content = `${content}\n\n${selectedHashtagText}`;
    }

    if (isThread && withThreadIntro && segmentIndex === 0) {
      suffix += `\n${getThreadIntroText()}`;
    }

    if (isThread && withThreadEmoji && !isLastSegment) {
      suffix += "\n⤵️";
    }

    if (isThread && withCounters) {
      suffix += `\n${segmentIndex + 1}/${segments.length}`;
    }

    if (withMarkerSpacing && suffix) {
      suffix = `\n${suffix}`;
    }

    return `${content}${suffix}`;
  });
}

function splitIntoSegments(text, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText) {
  const manualChunks = splitByManualMarkers(text);

  if (manualChunks.length === 0) {
    return [];
  }

  const reserveForSuffix = (segmentIndex, segmentCount) => (
    ((selectedHashtagText && (repeatedHashtagMode === "all-top" || repeatedHashtagMode === "all-bottom"))
      ? reserveForRepeatedHashtags(selectedHashtagText, repeatedHashtagMode)
      : 0)
    + (segmentCount > 1 && withThreadIntro && segmentIndex === 0 ? reserveForThreadIntro() : 0)
    + (segmentCount > 1 && withThreadEmoji && segmentIndex < segmentCount - 1 ? reserveForThreadEmoji() : 0)
    + (segmentCount > 1 && withCounters ? reserveForCounters(segmentCount) : 0)
    + ((segmentCount > 1) && (((withThreadIntro && segmentIndex === 0) || (withThreadEmoji && segmentIndex < segmentCount - 1) || withCounters)) && withMarkerSpacing ? 1 : 0)
  );

  if (!withCounters && !withThreadIntro && !withThreadEmoji
    && !(selectedHashtagText && (repeatedHashtagMode === "all-top" || repeatedHashtagMode === "all-bottom"))) {
    return splitChunksGreedy(manualChunks, () => MAX_POST_LENGTH);
  }

  const estimatedLength = manualChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let guess = Math.max(1, Math.ceil(estimatedLength / MAX_POST_LENGTH), manualChunks.length);

  for (let index = 0; index < 12; index += 1) {
    const segments = splitChunksGreedy(manualChunks, (segmentIndex) => MAX_POST_LENGTH - reserveForSuffix(segmentIndex, guess));

    if (segments.length === guess) {
      return decorateSegments(segments, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText);
    }

    guess = segments.length;
  }

  const fallbackSegments = splitChunksGreedy(manualChunks, (segmentIndex) => MAX_POST_LENGTH - reserveForSuffix(segmentIndex, guess));
  return decorateSegments(fallbackSegments, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText);
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
  container.dataset.segmentIndex = String(segmentIndex);
  const images = Array.isArray(segmentImages[segmentIndex]) ? segmentImages[segmentIndex] : [];

  container.addEventListener("dragover", (event) => {
    if (!segmentImageDragState && eventHasTransferFiles(event)) {
      event.preventDefault();
      container.closest(".segment-card")?.classList.add("is-file-drop-target");
      return;
    }
    if (!segmentImageDragState) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    clearSegmentImageDropMarkers();
    container.classList.add("is-drop-target");
  });

  container.addEventListener("drop", (event) => {
    if (!segmentImageDragState && eventHasTransferFiles(event)) {
      event.preventDefault();
      event.stopPropagation();
      const files = getDroppedImageFiles(event);
      clearSegmentImageDropMarkers();
      if (files.length > 0) {
        void handleSegmentImageSelection(segmentIndex, files);
      }
      return;
    }
    if (!segmentImageDragState) {
      return;
    }
    event.preventDefault();
    if (event.target.closest(".segment-image-card")) {
      return;
    }
    moveSegmentImageToPosition(
      segmentImageDragState.segmentIndex,
      segmentImageDragState.imageIndex,
      segmentIndex,
      images.length,
    );
    clearSegmentImageDragState();
  });
  container.addEventListener("dragleave", (event) => {
    const rect = container.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      container.closest(".segment-card")?.classList.remove("is-file-drop-target");
    }
  });

  images.forEach((image, imageIndex) => {
    const card = document.createElement("div");
    card.className = "segment-image-card";
    card.draggable = true;
    card.dataset.segmentIndex = String(segmentIndex);
    card.dataset.imageIndex = String(imageIndex);
    if (image.validation?.tooBig) {
      card.classList.add("is-too-large");
    }

    card.addEventListener("dragstart", (event) => {
      segmentImageDragState = { segmentIndex, imageIndex };
      card.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", `${segmentIndex}:${imageIndex}`);
      }
    });
    card.addEventListener("dragend", () => {
      clearSegmentImageDragState();
    });
    card.addEventListener("dragover", (event) => {
      if (!segmentImageDragState) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      const dropPosition = getSegmentImageDropPosition(event, card.getBoundingClientRect());
      clearSegmentImageDropMarkers();
      container.classList.add("is-drop-target");
      card.classList.add(dropPosition === "after" ? "is-drop-after" : "is-drop-before");
    });
    card.addEventListener("drop", (event) => {
      if (!segmentImageDragState) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const dropPosition = getSegmentImageDropPosition(event, card.getBoundingClientRect());
      moveSegmentImageToPosition(
        segmentImageDragState.segmentIndex,
        segmentImageDragState.imageIndex,
        segmentIndex,
        imageIndex + (dropPosition === "after" ? 1 : 0),
      );
      clearSegmentImageDragState();
    });

    const preview = document.createElement("div");
    preview.className = "segment-image-preview";
    const previewFrame = getImagePreviewFrameDimensions(image);
    const isPortrait = previewFrame.height > previewFrame.width;
    const previewBox = getContainedPreviewBox(
      previewFrame.width,
      previewFrame.height,
      140,
      140,
    );
    if (isPortrait) {
      card.classList.add("is-portrait");
      preview.classList.add("is-portrait");
    }
    preview.style.width = `${previewBox.width}px`;
    preview.style.height = `${previewBox.height}px`;
    preview.style.aspectRatio = `${previewFrame.width} / ${previewFrame.height}`;
    preview.title = image.alt || t("altTextMissing");
    preview.setAttribute("role", "button");
    preview.setAttribute("tabindex", "0");
    preview.setAttribute("aria-label", t("editImageButton"));
    const canvas = document.createElement("canvas");
    preview.appendChild(canvas);
    void renderPreviewCanvas(image, canvas, {
      cssWidth: previewBox.width,
      cssHeight: previewBox.height,
    });
    preview.addEventListener("click", () => {
      void openImageEditorDialog(segmentIndex, imageIndex);
    });
    preview.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void openImageEditorDialog(segmentIndex, imageIndex);
      }
    });

    const meta = document.createElement("div");
    meta.className = "segment-image-meta";
    const name = document.createElement("span");
    name.textContent = image.name;
    const altState = document.createElement("span");
    altState.className = "segment-image-alt-state";
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
        action: "alt",
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
      if (config.action) {
        button.dataset.imageAction = config.action;
      }
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
  const {
    preserveOverrides = Boolean(segmentOverrides),
    preserveView = true,
    animate = false,
  } = options;
  const previousScrollTop = preserveView && segmentsPane ? segmentsPane.scrollTop : 0;
  const text = sourceText.value;
  const useCounters = counterToggle.checked;
  appendThreadIntro = threadIntroToggle.checked;
  appendThreadEmoji = threadEmojiToggle.checked;
  addMarkerSpacing = markerSpacingToggle.checked;
  currentComposedText = buildComposedText(text);
  const selectedHashtagText = getSelectedHashtagText();
  const generatedSegments = currentComposedText.trim()
    ? splitIntoSegments(
      currentComposedText,
      useCounters,
      appendThreadIntro,
      appendThreadEmoji,
      addMarkerSpacing,
      hashtagPlacement,
      selectedHashtagText,
    )
    : [];
  activeSegments = preserveOverrides ? (normalizeSegmentOverrides(segmentOverrides) || generatedSegments) : generatedSegments;
  segmentOverrides = preserveOverrides ? normalizeSegmentOverrides(activeSegments) : null;
  syncSegmentImages(activeSegments.length);
  syncSegmentLinkCards(activeSegments.length);

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
    const linkCardButton = fragment.querySelector(".segment-link-card-button");
    const linkCardContainer = fragment.querySelector(".segment-link-card");
    const imageContainer = fragment.querySelector(".segment-images");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.className = "is-hidden";

    if (animate) {
      card.classList.add("is-entering");
      card.style.animationDelay = `${index * 55}ms`;
    } else {
      card.classList.remove("is-entering");
      card.style.animationDelay = "0ms";
    }
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
      segmentLinkCards[index] = null;
      updatePublishAvailability();
      queueDraftSave();
    });
    addImagesButton.textContent = t("addImagesButton");
    addImagesButton.hidden = (segmentImages[index]?.length || 0) >= MAX_IMAGES_PER_SEGMENT || Boolean(normalizeLinkCard(segmentLinkCards[index]));
    addImagesButton.addEventListener("click", () => {
      input.click();
    });
    input.addEventListener("change", async (event) => {
      await handleSegmentImageSelection(index, event.target.files);
      event.target.value = "";
    });
    card.addEventListener("dragover", (event) => {
      if (segmentImageDragState || !eventHasTransferFiles(event)) {
        return;
      }
      event.preventDefault();
      card.classList.add("is-file-drop-target");
    });
    card.addEventListener("dragleave", (event) => {
      const rect = card.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        card.classList.remove("is-file-drop-target");
      }
    });
    card.addEventListener("drop", (event) => {
      if (segmentImageDragState || !eventHasTransferFiles(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const files = getDroppedImageFiles(event);
      card.classList.remove("is-file-drop-target");
      if (files.length > 0) {
        void handleSegmentImageSelection(index, files);
      }
    });
    card.appendChild(input);
    const detectedUrl = getFirstHttpUrl(segment);
    linkCardButton.textContent = normalizeLinkCard(segmentLinkCards[index]) ? t("linkCardRefreshButton") : t("linkCardSegmentButton");
    linkCardButton.disabled = !detectedUrl || !isLinkCardProxyConfigured();
    linkCardButton.title = !detectedUrl
      ? t("linkCardNoUrl")
      : !isLinkCardProxyConfigured()
      ? t("linkCardProxyMissing")
      : t("linkCardSegmentButton");
    linkCardButton.addEventListener("click", () => openLinkCardDialog(index, detectedUrl));
    renderSegmentLinkCard(linkCardContainer, index);
    renderSegmentImages(imageContainer, index);

    segmentsList.appendChild(fragment);
    autoSizeTextarea(segmentsList.lastElementChild.querySelector(".segment-text"));
  });

  if (preserveView && segmentsPane) {
    segmentsPane.scrollTop = previousScrollTop;
  }
  scheduleSegmentTextareaResize();
  if (preserveView && segmentsPane) {
    requestAnimationFrame(() => {
      if (segmentsPane) {
        segmentsPane.scrollTop = previousScrollTop;
      }
    });
  }
  updatePublishAvailability();
}

function scheduleComposerSegmentRender() {
  if (composerSegmentRenderFrame) {
    cancelAnimationFrame(composerSegmentRenderFrame);
  }
  composerSegmentRenderFrame = requestAnimationFrame(() => {
    composerSegmentRenderFrame = 0;
    renderSegments({
      preserveOverrides: false,
      preserveView: true,
      animate: false,
    });
  });
}

async function hydrateAppState() {
  try {
    const browserLocale = detectBrowserLocale();
    const [state, savedArchiveSession, savedArchiveCatalog, savedDmPartnerCache, savedAccountAvatarCache] = await Promise.all([
      sendToServiceWorker("GET_APP_STATE", { browserLocale }),
      sendToServiceWorker("GET_ARCHIVE_SESSION", {}, { timeoutMs: 30000 }).catch(() => null),
      sendToServiceWorker("GET_ARCHIVE_CATALOG", {}, { timeoutMs: 120000 }).catch(() => null),
      sendToServiceWorker("GET_DM_PARTNER_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
      sendToServiceWorker("GET_ACCOUNT_AVATAR_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
    ]);
    localePreference = state.localePreference || "auto";
    tipsVisible = state.tipsVisible !== false;
    altTextRequired = state.altTextRequired !== false;
    themeMode = state.themeMode === "dark" ? "dark" : "light";
    sidebarCollapsedDesktop = state.sidebarCollapsedDesktop === true;
    const needsDesktopLayoutMigration = state.desktopLayoutVersion !== DESKTOP_LAYOUT_STATE_VERSION;
    ({
      sidebarWidthDesktop,
      composerWidthDesktop,
    } = normalizeStoredDesktopLayout(
      state.sidebarWidthDesktop,
      state.composerWidthDesktop,
      state.desktopLayoutVersion,
    ));
    hashtags = normalizeHashtagEntries(state.hashtags);
    selectedHashtags = normalizeSelectedHashtagEntries(state.selectedHashtags, hashtags);
    hashtagPlacement = normalizeHashtagPlacement(state.hashtagPlacement);
    segmentImages = normalizeSegmentImages(state.segmentImages);
    segmentLinkCards = normalizeSegmentLinkCards(state.segmentLinkCards);
    segmentOverrides = normalizeSegmentOverrides(state.segmentOverrides);
    selectedPostLanguages = normalizePostLanguageTags(state.postLanguages);
    appendThreadIntro = state.appendThreadIntro === true;
    appendThreadEmoji = state.appendThreadEmoji === true;
    addMarkerSpacing = state.addMarkerSpacing === true;
    applyPostInteractionSettings(state.postInteraction || {});
    linkCardEndpointInput.value = state.linkCardProxy?.endpoint || "";
    linkCardSecretInput.value = state.linkCardProxy?.secret || "";
    setComposerLocked(Boolean(segmentOverrides));
    postingHistory = normalizePostingHistory(state.postingHistory);
    archiveSession = savedArchiveSession || null;
    archiveCatalog = savedArchiveCatalog ? normalizeImportedArchiveCatalog(savedArchiveCatalog) : null;
    currentLocale = localePreference === "auto"
      ? (browserLocale || DEFAULT_LOCALE)
      : state.locale || browserLocale || DEFAULT_LOCALE;
    savedAccounts = Array.isArray(state.accounts) ? state.accounts : [];
    applyAccountAvatarCache(savedAccountAvatarCache || { assets: state.accountAvatarAssets || [] });
    identifierField.value = state.identifier || "";
    sourceText.value = state.draft || "";
    authAccount = state.handle || state.identifier || null;
    authAccountDid = state.did || "";
    authAccountService = state.service || LOGIN_SERVICE_PRESETS["bsky.social"];
    authAccountWebApp = state.webApp || resolvePostWebBase(authAccountService);
    applyDmPartnerCache(savedDmPartnerCache);
    passwordField.value = "";
    applyLoginServiceSelection(authAccountService);
    hashtagPlacementSelect.value = hashtagPlacement;
    threadIntroToggle.checked = appendThreadIntro;
    threadEmojiToggle.checked = appendThreadEmoji;
    markerSpacingToggle.checked = addMarkerSpacing;
    applyArchivePreferences(state.archivePreferences || {});
    syncArchiveTransientNoticeFromCatalog();
    applyDesktopLayoutState();
    applySidebarState();
    applyHashtagPaneContext();
    applyTranslations();
    if (segmentImages.some((images) => (images || []).length > 0)) {
      scheduleImageValidation();
    }
    if (needsDesktopLayoutMigration) {
      await persistSettings();
    }
    appStateHydrated = true;
    restorePreferredWorkspaceIfPossible();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
    appStateHydrated = true;
    restorePreferredWorkspaceIfPossible();
  }
}

function queueDraftSave() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(async () => {
    try {
      await sendToServiceWorker("SAVE_DRAFT", {
        draft: sourceText.value,
        segmentImages,
        segmentLinkCards,
        segmentOverrides,
      }, { timeoutMs: 120000 });
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

addAccountButton.addEventListener("click", () => {
  openLoginDialog({
    mode: "add",
    service: authAccountService || LOGIN_SERVICE_PRESETS["bsky.social"],
  });
});

loginDialogCloseTop.addEventListener("click", () => {
  closeLoginDialog();
});

loginDialogCancelButton.addEventListener("click", () => {
  closeLoginDialog();
});

loginDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeLoginDialog();
});

window.addEventListener("online", () => {
  appOnline = true;
  renderAccountSwitcher();
  updateStatusForAuth();
});

window.addEventListener("offline", () => {
  appOnline = false;
  renderAccountSwitcher();
  updateStatusForAuth();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setBusy(loginButton, true, t("loginBusy"), t("loginButton"));
    const identifier = identifierField.value.trim();
    const appPassword = passwordField.value.trim();
    const service = getSelectedLoginService();

    const result = await sendToServiceWorker("LOGIN", {
      identifier,
      appPassword,
      service,
      webApp: serverPresetField.value === "mu.social" ? LOGIN_SERVICE_PRESETS["mu.social"] : undefined,
    });

    passwordField.value = "";
    authAccount = result.handle || result.identifier;
    authAccountDid = result.did || "";
    authAccountService = result.service || service;
    authAccountWebApp = result.webApp || resolvePostWebBase(service);
    savedAccounts = Array.isArray(result.accounts) ? result.accounts : savedAccounts;
    await restoreAccountAvatarCache();
    identifierField.value = result.identifier || identifier;
    applyLoginServiceSelection(authAccountService);
    closeLoginDialog();
    updateStatusForAuth();
  } catch (error) {
    const message = localizeLoginErrorMessage(error);
    const isExpectedLoginError = message !== (error?.message || "");
    if (!isExpectedLoginError) {
      console.error(error);
    }
    setLoginDialogNote(message, "error");
    setStatus(message, "error");
  } finally {
    setBusy(loginButton, false, t("loginBusy"), t("loginButton"));
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

  if (selectedHashtags.length === 0) {
    const continueWithoutHashtag = await openConfirmDialog({
      title: t("publishNoHashtagTitle"),
      message: t("publishNoHashtagText"),
      confirmLabel: t("confirmYes"),
      cancelLabel: t("cancelButton"),
    });
    if (!continueWithoutHashtag) {
      return;
    }
  }

  const publishAccount = authAccount || identifierField.value.trim();
  const confirmed = await openConfirmDialog({
    title: t("publishConfirmTitle"),
    message: t("publishConfirmText", {
      account: publishAccount || "?",
      target: getPostTargetName(),
    }),
    confirmLabel: t("confirmYes"),
    cancelLabel: t("cancelButton"),
  });
  if (!confirmed) {
    return;
  }

  try {
    setBusy(publishButton, true, getPublishBusyLabel(), getPublishButtonLabel());
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
      const externalCard = normalizeLinkCard(segment.externalCard);
      if (externalCard && segment.images.length > 0) {
        throw new Error(t("linkCardImageConflictPublish"));
      }
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
        externalCard: externalCard
          ? {
              ...externalCard,
              thumb: externalCard.imageDataUrl ? dataUrlToFile(externalCard.imageDataUrl, "link-card.jpg") : null,
            }
          : null,
      });
    }
    const result = await sendToServiceWorker("PUBLISH_THREAD", {
      segments: preparedSegments,
      langs: getNormalizedPostLanguagesOrDefault(),
      postInteraction: getCurrentPostInteractionSettings(),
    }, {
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
    setBusy(publishButton, false, getPublishBusyLabel(), getPublishButtonLabel());
  }
});

sourceText.addEventListener("input", () => {
  segmentOverrides = null;
  setComposerLocked(false);
  scheduleComposerSegmentRender();
  queueDraftSave();
});
counterToggle.addEventListener("change", () => {
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  renderPostLanguageSummary();
  void persistSettings();
  queueDraftSave();
});
threadIntroToggle.addEventListener("change", () => {
  appendThreadIntro = threadIntroToggle.checked;
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  renderPostLanguageSummary();
  void persistSettings();
  queueDraftSave();
});
threadEmojiToggle.addEventListener("change", () => {
  appendThreadEmoji = threadEmojiToggle.checked;
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  renderPostLanguageSummary();
  void persistSettings();
  queueDraftSave();
});
markerSpacingToggle.addEventListener("change", () => {
  addMarkerSpacing = markerSpacingToggle.checked;
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });
  renderPostLanguageSummary();
  void persistSettings();
  queueDraftSave();
});
replyModeInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    if (!input.checked) {
      return;
    }
    replyMode = input.value;
    renderPostInteractionControls();
    renderPostLanguageSummary();
    await persistSettings();
  });
});
replyAllowFollowersInput.addEventListener("change", async () => {
  replyAllowFollowers = replyAllowFollowersInput.checked;
  renderPostLanguageSummary();
  await persistSettings();
});
replyAllowFollowingInput.addEventListener("change", async () => {
  replyAllowFollowing = replyAllowFollowingInput.checked;
  renderPostLanguageSummary();
  await persistSettings();
});
replyAllowMentionedInput.addEventListener("change", async () => {
  replyAllowMentioned = replyAllowMentionedInput.checked;
  renderPostLanguageSummary();
  await persistSettings();
});
quotePostsToggle.addEventListener("change", async () => {
  quotePostsAllowed = quotePostsToggle.checked;
  renderPostLanguageSummary();
  await persistSettings();
});
sidebarToggleButton.addEventListener("click", async () => {
  sidebarCollapsedDesktop = !sidebarCollapsedDesktop;
  applySidebarState();
  await persistSettings();
});
sidebarResizeHandle.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startDesktopColumnResize("sidebar");
});
composerResizeHandle.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startDesktopColumnResize("composer");
});
DESKTOP_LAYOUT_MEDIA.addEventListener("change", () => {
  applyDesktopLayoutState();
  applySidebarState();
});

serverPresetField.addEventListener("change", () => {
  customServerWrap.hidden = serverPresetField.value !== "custom";
  if (serverPresetField.value !== "custom") {
    customServerField.value = "";
  }
});

clearButton.addEventListener("click", async () => {
  const confirmed = await openConfirmDialog({
    title: t("clearTextConfirmTitle"),
    message: t("clearTextConfirmText"),
    confirmLabel: t("confirmYes"),
    cancelLabel: t("confirmNo"),
  });

  if (!confirmed) {
    return;
  }

  sourceText.value = "";
  activeSegments = [];
  segmentImages = [];
  segmentLinkCards = [];
  segmentOverrides = null;
  setComposerLocked(false);
  renderSegments({ preserveOverrides: false });

  try {
    await sendToServiceWorker("SAVE_DRAFT", { draft: "", segmentImages: [], segmentLinkCards: [], segmentOverrides: null }, { timeoutMs: 120000 });
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
  setShareStatus("");
  settingsDialog.showModal();
});

historyButton.addEventListener("click", () => {
  renderHistoryList();
  historyDialog.showModal();
});

composerButton.addEventListener("click", () => {
  showComposerWorkspace();
});

archiveButton.addEventListener("click", () => {
  showArchiveWorkspace();
});

networkButton.addEventListener("click", () => {
  showNetworkWorkspace();
});

dmButton.addEventListener("click", () => {
  showDmWorkspace();
});

networkFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    networkFilterMode = button.dataset.networkFilter || "all";
    renderNetworkWorkspace();
  });
});

if (networkSearchInput) {
  networkSearchInput.addEventListener("input", () => {
    networkSearchQuery = networkSearchInput.value.trim();
    renderNetworkWorkspace();
  });
}

if (networkAccountInput) {
  networkAccountInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void loadNetworkWave({
        actor: networkAccountInput.value.trim(),
        append: false,
        silentErrors: false,
      });
    }
  });
  networkAccountInput.addEventListener("input", () => {
    updateNetworkControls();
  });
}

if (networkSortFieldSelect) {
  networkSortFieldSelect.addEventListener("change", () => {
    networkSortField = networkSortFieldSelect.value === "handle" ? "handle" : "displayName";
    renderNetworkWorkspace();
  });
}

if (networkSortDirectionSelect) {
  networkSortDirectionSelect.addEventListener("change", () => {
    networkSortDirection = networkSortDirectionSelect.value === "desc" ? "desc" : "asc";
    renderNetworkWorkspace();
  });
}

if (networkAccountLoadButton) {
  networkAccountLoadButton.addEventListener("click", async () => {
    await loadNetworkWave({
      actor: networkAccountInput?.value.trim() || "",
      append: false,
      silentErrors: false,
    });
  });
}

if (networkOwnLoadButton) {
  networkOwnLoadButton.addEventListener("click", async () => {
    if (networkAccountInput) {
      networkAccountInput.value = authAccount || authAccountDid || "";
    }
    await loadNetworkWave({
      actor: authAccountDid || authAccount || "",
      append: false,
      silentErrors: false,
    });
  });
}

networkLoadButton.addEventListener("click", async () => {
  await loadNetworkWave({ append: true });
});

networkResetButton.addEventListener("click", () => {
  networkFilterMode = "all";
  networkSearchQuery = "";
  networkSelectedDid = "";
  networkHoveredDid = "";
  networkFocusPreviewTab = "followers";
  if (networkSearchInput) {
    networkSearchInput.value = "";
  }
  renderNetworkWorkspace();
});

if (networkShapeToggleButton) {
  networkShapeToggleButton.addEventListener("click", () => {
    toggleNetworkStageShape();
  });
}

if (networkZoomInButton) {
  networkZoomInButton.addEventListener("click", () => {
    const bounds = networkStageSvg?.getBoundingClientRect();
    zoomNetworkStageAtPoint(
      1.24,
      bounds ? (bounds.left + (bounds.width / 2)) : 0,
      bounds ? (bounds.top + (bounds.height / 2)) : 0,
    );
  });
}

if (networkZoomOutButton) {
  networkZoomOutButton.addEventListener("click", () => {
    const bounds = networkStageSvg?.getBoundingClientRect();
    zoomNetworkStageAtPoint(
      1 / 1.24,
      bounds ? (bounds.left + (bounds.width / 2)) : 0,
      bounds ? (bounds.top + (bounds.height / 2)) : 0,
    );
  });
}

if (networkZoomResetButton) {
  networkZoomResetButton.addEventListener("click", () => {
    resetNetworkStageView();
  });
}

if (networkStageModeButton) {
  networkStageModeButton.addEventListener("click", async () => {
    await enterNetworkStageMode();
  });
}

if (networkStageModeExitButton) {
  networkStageModeExitButton.addEventListener("click", async () => {
    await exitNetworkStageMode();
  });
}

if (networkStageModeFocusButton) {
  networkStageModeFocusButton.addEventListener("click", () => {
    networkStageModeFocusVisible = !networkStageModeFocusVisible;
    renderNetworkWorkspace();
  });
}

if (networkStageModeListsButton) {
  networkStageModeListsButton.addEventListener("click", () => {
    networkStageModeListsVisible = !networkStageModeListsVisible;
    renderNetworkWorkspace();
  });
}

networkInsightsGroupButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextGroup = String(button.dataset.networkInsightsGroup || "").trim();
    if (!nextGroup) {
      return;
    }
    networkInsightsStageGroup = nextGroup;
    networkResultsScrollTop = 0;
    renderNetworkWorkspace();
  });
});

if (networkFocusToggleButton) {
  networkFocusToggleButton.addEventListener("click", () => {
    if (!networkSelectedDid) {
      return;
    }
    networkFocusCollapsed = !networkFocusCollapsed;
    renderNetworkWorkspace();
  });
}

if (networkStageSvg) {
  networkStageSvg.addEventListener("wheel", (event) => {
    if (currentWorkspace !== "network") {
      return;
    }
    event.preventDefault();
    zoomNetworkStageAtPoint(event.deltaY < 0 ? 1.12 : (1 / 1.12), event.clientX, event.clientY);
  }, { passive: false });

  networkStageSvg.addEventListener("pointerdown", (event) => {
    if (currentWorkspace !== "network") {
      return;
    }
    event.preventDefault();
    networkStageFitAll = false;
    networkStageDrag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    networkStageSvg.setPointerCapture(event.pointerId);
  });

  networkStageSvg.addEventListener("pointermove", (event) => {
    if (!networkStageDrag || networkStageDrag.pointerId !== event.pointerId) {
      return;
    }
    const bounds = networkStageSvg.getBoundingClientRect();
    const visibleNodes = getVisibleNetworkNodes();
    const selectedDid = networkSelectedDid || getPreferredNetworkSelection(visibleNodes);
    const layout = computeNetworkLayout(visibleNodes, selectedDid);
    layout.contentBounds = computeNetworkStageContentBounds(layout, visibleNodes, selectedDid);
    const viewport = getNetworkStageViewport(layout);
    const unitsPerPixelX = viewport.width / Math.max(1, bounds.width);
    const unitsPerPixelY = viewport.height / Math.max(1, bounds.height);
    networkStagePanX -= (event.clientX - networkStageDrag.x) * unitsPerPixelX;
    networkStagePanY -= (event.clientY - networkStageDrag.y) * unitsPerPixelY;
    networkStageDrag.x = event.clientX;
    networkStageDrag.y = event.clientY;
    renderNetworkStage();
  });

  const stopNetworkStageDrag = (event) => {
    if (networkStageDrag?.pointerId === event.pointerId) {
      networkStageDrag = null;
    }
  };

  networkStageSvg.addEventListener("pointerup", stopNetworkStageDrag);
  networkStageSvg.addEventListener("pointercancel", stopNetworkStageDrag);
  networkStageSvg.addEventListener("pointerleave", stopNetworkStageDrag);
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && networkStageMode) {
    networkStageMode = false;
    networkStageModeFocusVisible = false;
    networkStageModeListsVisible = false;
    document.body.classList.remove("network-stage-mode");
    renderNetworkWorkspace();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && networkStageMode && !document.fullscreenElement) {
    event.preventDefault();
    void exitNetworkStageMode();
  }
});

if (networkResults) {
  networkResults.addEventListener("scroll", () => {
    if (networkResultsRestorePending) {
      return;
    }
    networkResultsScrollTop = networkResults.scrollTop;
  });
}

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

if (archiveThreadImportModeSelect) {
  archiveThreadImportModeSelect.addEventListener("change", () => {
    void persistArchivePreferences();
  });
}

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

dmContactSearchInput.addEventListener("input", () => {
  renderDmContacts();
});

dmCheckButton.addEventListener("click", async () => {
  try {
    setBusy(dmCheckButton, true, t("archiveWorkingButton"), t("dmCheckButton"));
    await checkDmAccess();
  } catch (error) {
    console.error(error);
    dmAccessChecked = false;
    renderDmWorkspace();
    setDmProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("dmCheckFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("dmCheckFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(dmCheckButton, false, t("archiveWorkingButton"), t("dmCheckButton"));
  }
});

dmLoadPartnersButton.addEventListener("click", async () => {
  try {
    setBusy(dmLoadPartnersButton, true, t("archiveWorkingButton"), t("dmLoadPartnersButton"));
    await loadDmPartners();
  } catch (error) {
    console.error(error);
    setDmProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("dmLoadPartnersFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("dmLoadPartnersFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(dmLoadPartnersButton, false, t("archiveWorkingButton"), t("dmLoadPartnersButton"));
  }
});

dmFromInput.addEventListener("change", () => {
  renderDmWorkspace();
});

dmToInput.addEventListener("change", () => {
  renderDmWorkspace();
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

if (archiveThreadUrlInput) {
  archiveThreadUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      archiveLoadThreadUrlButton?.click();
    }
  });
}

if (archiveLoadThreadUrlButton) {
  archiveLoadThreadUrlButton.addEventListener("click", async () => {
    try {
      setBusy(archiveLoadThreadUrlButton, true, t("archiveWorkingButton"), t("archiveLoadThreadUrlButton"));
      await importArchiveThreadFromUrl();
    } catch (error) {
      console.error(error);
      setArchiveProgress({
        title: t("archiveErrorTitle"),
        step: error.message || t("archiveThreadUrlImportFailed"),
        percent: 0,
        detail: "",
      });
      showErrorDialog(error.message || t("archiveThreadUrlImportFailed"), t("archiveErrorTitle"));
    } finally {
      setBusy(archiveLoadThreadUrlButton, false, t("archiveWorkingButton"), t("archiveLoadThreadUrlButton"));
    }
  });
}

if (archiveCheckPostEditButton) {
  archiveCheckPostEditButton.addEventListener("click", () => {
    openPostEditCheckDialog();
  });
}

if (postEditCheckUrlInput) {
  postEditCheckUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      postEditCheckSubmitButton?.click();
    }
  });
}

if (postEditCheckSubmitButton) {
  postEditCheckSubmitButton.addEventListener("click", async () => {
    try {
      setBusy(postEditCheckSubmitButton, true, t("postEditCheckBusy"), t("postEditCheckButton"));
      await checkPostEditMetadata();
    } catch (error) {
      console.error(error);
      postEditCheckResult.hidden = true;
      postEditCheckStatus.textContent = error.message || t("postEditCheckLoadFailed");
      postEditCheckStatus.className = "post-edit-check-status settings-note is-error";
    } finally {
      setBusy(postEditCheckSubmitButton, false, t("postEditCheckBusy"), t("postEditCheckButton"));
    }
  });
}

postEditCheckCloseTop?.addEventListener("click", closePostEditCheckDialog);
postEditCheckCloseButton?.addEventListener("click", closePostEditCheckDialog);
postEditCheckDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePostEditCheckDialog();
});

dmLoadButton.addEventListener("click", async () => {
  try {
    setBusy(dmLoadButton, true, t("archiveWorkingButton"), t("dmLoadButton"));
    await loadDmArchive();
  } catch (error) {
    console.error(error);
    setDmProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("dmLoadFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("dmLoadFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(dmLoadButton, false, t("archiveWorkingButton"), t("dmLoadButton"));
  }
});

dmExportJsonButton.addEventListener("click", async () => {
  try {
    setBusy(dmExportJsonButton, true, t("archiveWorkingButton"), t("dmExportJsonButton"));
    await exportDmArchiveJson(dmCatalog);
  } catch (error) {
    console.error(error);
    setDmProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t("dmExportFailed"),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t("dmExportFailed"), t("archiveErrorTitle"));
  } finally {
    setBusy(dmExportJsonButton, false, t("archiveWorkingButton"), t("dmExportJsonButton"));
  }
});

if (dmExportHtmlButton) {
  dmExportHtmlButton.addEventListener("click", async () => {
    try {
      setBusy(dmExportHtmlButton, true, t("archiveWorkingButton"), t("dmExportHtmlButton"));
      await exportDmHtmlFromCatalog(dmCatalog);
    } catch (error) {
      console.error(error);
      setDmProgress({
        title: t("archiveErrorTitle"),
        step: error.message || t("dmExportFailed"),
        percent: 0,
        detail: "",
      });
      showErrorDialog(error.message || t("dmExportFailed"), t("archiveErrorTitle"));
    } finally {
      setBusy(dmExportHtmlButton, false, t("archiveWorkingButton"), t("dmExportHtmlButton"));
    }
  });
}

if (dmExportPdfButton) {
  dmExportPdfButton.addEventListener("click", async () => {
    try {
      setBusy(dmExportPdfButton, true, t("archiveWorkingButton"), t("dmExportPdfButton"));
      await exportDmPdfFromCatalog(dmCatalog);
    } catch (error) {
      console.error(error);
      setDmProgress({
        title: t("archiveErrorTitle"),
        step: error.message || t("dmExportFailed"),
        percent: 0,
        detail: "",
      });
      showErrorDialog(error.message || t("dmExportFailed"), t("archiveErrorTitle"));
    } finally {
      setBusy(dmExportPdfButton, false, t("archiveWorkingButton"), t("dmExportPdfButton"));
    }
  });
}

if (archiveActionsExportHtmlButton) {
  archiveActionsExportHtmlButton.addEventListener("click", () => {
    archiveExportHtmlButton?.click();
  });
}

if (archiveActionsExportHtmlCompactButton) {
  archiveActionsExportHtmlCompactButton.addEventListener("click", () => {
    archiveExportHtmlCompactButton?.click();
  });
}

if (archiveProgressExportHtmlCompactButton) {
  archiveProgressExportHtmlCompactButton.addEventListener("click", () => {
    archiveExportHtmlCompactButton?.click();
  });
}

if (archiveActionsExportPdfButton) {
  archiveActionsExportPdfButton.addEventListener("click", () => {
    archiveExportPdfButton?.click();
  });
}

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

if (archiveExportMediaZipButton) {
  archiveExportMediaZipButton.addEventListener("click", async () => {
    try {
      setBusy(archiveExportMediaZipButton, true, t("archiveWorkingButton"), t("archiveExportMediaZipButton"));
      await exportArchiveMediaZip();
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
      setBusy(archiveExportMediaZipButton, false, t("archiveWorkingButton"), t("archiveExportMediaZipButton"));
    }
  });
}

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

archiveExportHtmlCompactButton?.addEventListener("click", async () => {
  try {
    setBusy(archiveExportHtmlCompactButton, true, t("archiveWorkingButton"), t("archiveExportHtmlCompactButton"));
    const catalog = await ensureArchiveCatalogLoaded(false);
    await exportArchiveHtmlFromCatalog(catalog, { mode: "compact" });
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
    setBusy(archiveExportHtmlCompactButton, false, t("archiveWorkingButton"), t("archiveExportHtmlCompactButton"));
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
    await applyLoadedArchiveCatalog(await loadArchiveCatalogFromFile(file), {
      filterKey: "import",
      filters: null,
      waveIndex: 1,
      nextCursor: "",
      hasMore: false,
      step: t("archiveImported"),
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

postSettingsButton.addEventListener("click", () => {
  renderPostLanguageDialog();
  postLanguagesDialog.showModal();
  if (postLanguagesDisclosure.open) {
    window.setTimeout(() => postLanguagesSearch.focus(), 0);
  }
});

postLanguagesSearch.addEventListener("input", () => {
  renderPostLanguageDialog();
});

postLanguagesDisclosure.addEventListener("toggle", () => {
  if (postLanguagesDisclosure.open) {
    window.setTimeout(() => postLanguagesSearch.focus(), 0);
  }
});

postLanguagesCloseTop.addEventListener("click", () => {
  postLanguagesDialog.close();
});

postLanguagesCloseButton.addEventListener("click", () => {
  postLanguagesDialog.close();
});

helpButton.addEventListener("click", () => {
  applyHelpDialogHeader(t("helpEyebrow"), t("helpTitle"));
  helpDialog.showModal();
  void loadReadmeContent();
});

document.querySelectorAll("[data-help-topic]").forEach((button) => {
  button.addEventListener("click", () => {
    openInlineHelpTopic(button.dataset.helpTopic || "");
  });
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
resetColumnWidthsButton.addEventListener("click", () => {
  void resetDesktopColumnWidths();
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
  if (composerLocked && !isArchiveHashtagContext()) {
    return;
  }
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
  if (composerLocked && !isArchiveHashtagContext()) {
    return;
  }
  hashtagPlacement = normalizeHashtagPlacement(hashtagPlacementSelect.value);
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

if (shareAppButton) {
  shareAppButton.addEventListener("click", async () => {
    await shareAppRecommendation();
  });
}

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
  const image = getEditedImage();
  if (!image) {
    return;
  }
  imageEditorDraft = clampImageEditorDraftToFrame(image, {
    ...imageEditorDraft,
    fitMode: "cover",
    zoom: Number(imageZoomInput.value) || 1,
  });
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
  const image = getEditedImage();
  if (image) {
    imageEditorDraft = clampImageEditorDraftToFrame(image, {
      ...imageEditorDraft,
      fitMode: "cover",
    });
  }
  drawImageEditor();
});
imageResetButton.addEventListener("click", () => {
  resetImageEditor();
});
imageEditorSaveButton.addEventListener("click", async () => {
  await saveImageEditor();
});
imageFitDimensionsButton.addEventListener("click", async () => {
  await fitImageToAllowedDimensions();
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
imageEditorCanvas.addEventListener("wheel", (event) => {
  if (!imageEditorDraft) {
    return;
  }
  const image = getEditedImage();
  if (!image) {
    return;
  }
  event.preventDefault();
  const delta = -event.deltaY;
  const factor = 1 + delta * 0.0015;
  imageEditorDraft = clampImageEditorDraftToFrame(image, {
    ...imageEditorDraft,
    fitMode: "cover",
    zoom: (imageEditorDraft.zoom || 1) * factor,
  });
  imageZoomInput.value = String(imageEditorDraft.zoom);
  drawImageEditor();
}, { passive: false });

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
  if (ignoreNextConfirmClose) {
    ignoreNextConfirmClose = false;
    return;
  }
  if (confirmResolver) {
    resolveConfirmDialog(false);
  }
});

[linkCardEndpointInput, linkCardSecretInput].forEach((input) => {
  input?.addEventListener("input", () => {
    updateLinkCardSettingsStatus();
    renderSegments({ preserveOverrides: true, preserveView: true });
  });
  input?.addEventListener("change", async () => {
    normalizeLinkCardSettingsInputs();
    updateLinkCardSettingsStatus();
    await persistSettings();
    renderSegments({ preserveOverrides: true, preserveView: true });
    linkCardEndpointInput?.reportValidity?.();
  });
});

linkCardCreateButton?.addEventListener("click", () => {
  void createLinkCardForPendingSegment();
});
linkCardCancelButton?.addEventListener("click", closeLinkCardDialog);
linkCardCloseTop?.addEventListener("click", closeLinkCardDialog);

postLanguagesDialog.addEventListener("close", () => {
  postLanguagesSearch.value = "";
  postLanguagesDisclosure.open = false;
  postInteractionDisclosure.open = false;
  renderPostLanguageDialog();
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
    scheduleSilentUpdateCheck();
  }
});

window.addEventListener("focus", () => {
  void verifySession({ silent: true });
  scheduleSilentUpdateCheck();
});

window.addEventListener("hashchange", () => {
  void applyDmAccessGateFromLocation();
});

window.addEventListener("resize", () => {
  scheduleSegmentTextareaResize();
});

window.visualViewport?.addEventListener("resize", () => {
  scheduleSegmentTextareaResize();
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
applyLoginServiceSelection(LOGIN_SERVICE_PRESETS["bsky.social"]);
renderAccountSwitcher();
applyHashtagPaneContext();
applyTranslations();
void applyDmAccessGateFromLocation();
updateInstallButtonVisibility();
setStatus(t("statusPreparing"));
registerServiceWorker();
renderSegments();
