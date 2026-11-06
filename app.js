import { createSearchModels, createSavedSearchModels } from "./js/tools/search-models.js";
import { createSearchFormController } from "./js/tools/search-form.js";
import { createSearchRunController, createSavedSearchController } from "./js/tools/search-controller.js";
import { createDmExportModels } from "./js/tools/dm-export-models.js";
import { createDmPdfRenderer } from "./js/tools/dm-pdf-rendering.js";
import { createDmHtmlRenderer } from "./js/tools/dm-html-rendering.js";
import { createArchiveSourceController } from "./js/tools/archive-source.js";
import { createArchiveWorkspaceModels } from "./js/tools/archive-workspace-models.js";
import { createArchiveWorkspaceRenderer, createArchiveWorkspaceLayout } from "./js/tools/archive-workspace-rendering.js";
import { createArchiveRunController } from "./js/tools/archive-run-controller.js";
import { createAssetService, getAssetExtensionFromMimeType } from "./js/shared/shared-assets.js";
import { createArchiveAvatarAssets } from "./js/tools/archive-assets.js";
import { createArchiveCatalogService } from "./js/tools/archive-catalog.js";
import { createArchiveMediaModels, MEDIA_EXPORT_BATCH_SIZE } from "./js/tools/archive-media-models.js";
import { createArchiveMediaExportController } from "./js/tools/archive-media-export.js";
import { createArchivePdfLayout } from "./js/tools/archive-pdf-layout.js";
import { createArchivePdfRenderer } from "./js/tools/archive-pdf-rendering.js";
import { createArchivePdfExportController } from "./js/tools/archive-pdf-export.js";
﻿import { inferDefaultPostLanguages, getPostLanguageDisplayName, getPostLanguageOptions, normalizePostLanguageTags } from "./js/shared/shared-languages.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./js/core/app-i18n.js";
import { createStoredZipCodec } from "./js/shared/shared-zip.js";
import { buildArchiveThreadGroups, buildArchiveThreadDepthMap, shortenArchiveUrlForDisplay, shouldAutoFallbackArchiveHtmlToCompact, isArchiveStringLengthError, createArchiveHtmlModels } from "./js/tools/archive-html-models.js";
import { createArchiveHtmlRenderer } from "./js/tools/archive-html-rendering.js";
import { createArchiveHtmlTemplateLoader, createArchiveHtmlExportController } from "./js/tools/archive-html-export.js";

import { createPdfFileBuilder } from "./js/shared/shared-pdf.js";
import { createPdfTextLayout } from "./js/shared/shared-pdf-text.js";
import { fillRoundedRect, strokeRoundedRect, drawRoundedImageContain, drawCircularImageCover } from "./js/shared/shared-canvas.js";

import { createSettingsBackupCodec, createSettingsBackupController, createSettingsBackupReminder } from "./js/core/app-backup.js";
import { createComposerLinkCardPreviewRenderer } from "./js/composer/composer-link-cards.js";
import { createComposerMentionSourceCorrectionController } from "./js/composer/composer-mentions.js";
import { getComposerPostingTexts, buildComposerPostingPayloads } from "./js/composer/composer-publishing.js";
import { normalizeStandardSiteMetadata as normalizeSharedStandardSiteMetadata,
  getPublicationCardFooterLabel as getSharedPublicationCardFooterLabel } from "./js/shared/shared-link-cards.js";
import { hasEmojiLikeGraphemes, hasCjkGraphemes,
  formatComposerCharacterCount as formatComposerCharacterCountFromModule } from "./js/composer/composer-validation.js";
import { syncComposerSegmentLinkCards } from "./js/composer/composer-link-cards.js";
import { autoSizeComposerTextarea as autoSizeTextarea, resizeComposerTextareas } from "./js/composer/composer-segment-rendering.js";
import { createComposerMentionDialogController } from "./js/composer/composer-mentions.js";
import { createApplicationStorage } from "./js/core/app-storage.js";
import { createApplicationHydrationController } from "./js/core/app-state.js";
import { createApplicationBootstrap } from "./js/core/app-bootstrap.js";
import { createHelpController } from "./js/core/app-help.js";
import { createHelpMarkdownRenderer } from "./js/core/app-help-markdown.js";
import { HELP_TOPICS } from "./js/core/app-help-topics.js";
import { createApplicationUpdateController } from "./js/core/app-bootstrap.js";
import { createApplicationSessionController, createLoginController, createSavedAccountActions, normalizeLoginServiceUrl } from "./js/core/app-session.js";
import { createApplicationInstallController, isIosDevice as isIosDeviceFromShell } from "./js/core/app-shell.js";
import { createApplicationLifecycleHandlers } from "./js/core/app-initialization.js";
import { createAppearanceController } from "./js/core/app-shell.js";
import { createPendingNavigationController } from "./js/core/app-navigation.js";
import { createComposerLinkCardRequestController } from "./js/composer/composer-link-card-providers.js";
import { normalizePublishRateLimit, createComposerRateLimitPresentation,
  buildComposerPublishErrorMessage, createComposerPublishController } from "./js/composer/composer-publishing.js";
import { createHashtagController, parseHashtag as parseHashtagValue,
  normalizeHashtags as normalizeHashtagEntries, normalizeHashtagSelection,
  mergeHashtags as mergeHashtagEntries, getHashtagDisplayValue, formatHashtag,
  normalizeHashtagPlacement } from "./js/shared/shared-hashtags.js";
import {
  bindApplicationEvents,
  bindOptionalApplicationEvent,
  bindThreadExplorerApplicationEvents,
  bindGlobalApplicationEvents,
  bindApplicationNavigationEvents,
  bindAuthenticationEvents,
  bindPreferenceEvents,
  bindSettingsDataEvents,
  bindEditorDialogEvents,
  bindApplicationUpdateEvents,
  bindConfirmationDialogEvents,
  bindLinkCardSettingsEvents,
  bindWorkspaceUtilityEvents,
  bindHelpAndSettingsEvents,
} from "./js/core/app-initialization.js";
import { CURRENT_VERSION_INFO, fetchVersionInfo } from "./js/core/app-bootstrap.js";
import { createAsyncTaskQueue } from "./js/core/app-state.js";
import {
  readBrowserStorageValue,
  removeBrowserStorageValue,
  writeBrowserStorageValue,
} from "./js/core/app-storage.js";
import {
  THREADLINE_PAGE_COMPOSER,
  THREADLINE_PAGE_TOOLS,
  navigateToThreadlinePage,
  normalizeThreadlinePage,
} from "./js/core/app-navigation.js";
import {
  getCurrentThreadlinePage,
  getDefaultWorkspaceForCurrentPage,
  isWorkspaceAllowedOnCurrentPage,
  normalizeWorkspaceForCurrentPage,
} from "./js/core/app-shell.js";
import {
  closeModalDialog,
  createQueuedConfirmDialogController,
  showErrorModal,
  showProgressModal,
} from "./js/core/app-dialogs.js";
import { getToolsWorkspaceEntries, bindToolsWorkspaceNavigationEvents } from "./js/tools/tools-layout.js";
import {
  openToolsWorkspace,
  persistToolsWorkspacePreference,
  readToolsWorkspacePreference,
} from "./js/tools/tools-page.js";
import {
  escapeSearchHighlightRegex,
  parseSearchQueryTerms,
  createSearchPreferencesNormalizer,
  parseSearchTags,
  quoteSearchSummaryValue,
  splitSharedSearchQuery,
  normalizePersistedSearchResultItems as normalizePersistedSearchResultItemsFromSearch,
  areSearchPreferencesEqual as areSearchPreferencesEqualFromSearch,
  buildPersistableSearchResultState,
  doesSearchResultStateMatch,
  getSavedSearchStringParam as getSavedSearchStringParamFromSearch,
  normalizeSavedSearchSort as normalizeSavedSearchSortFromSearch,
  parseExcludedSearchTerms as parseExcludedSearchTermsFromSearch,
  buildSharedSearchQuery as buildSharedSearchQueryFromSearch,
  bindSearchWorkspaceEvents,
  bindSearchDialogEvents,
} from "./js/tools/search.js";
import { createSearchResultCardRenderer } from "./js/tools/search-results.js";
import {
  buildThreadExplorerFeedSource,
  createThreadExplorerGalleryController,
  appendThreadExplorerFeedItems,
  sortThreadExplorerFeedItemsByDate,
  normalizeThreadExplorerFavorites,
  resolveThreadExplorerSelection,
  buildThreadExplorerFavoriteModel,
  findThreadExplorerTreeNode,
  findThreadExplorerParentNode,
  buildThreadExplorerPostWebUrl as buildThreadExplorerPostWebUrlFromData,
  createThreadExplorerCardInteractionController,
  createThreadExplorerCardPresentationController,
  getThreadExplorerActorFocusId,
  getThreadExplorerFaviconUrl,
  getThreadExplorerGalleryFallbackDecision,
  normalizeThreadExplorerHydratedMedia,
  getThreadExplorerImageSources,
  getThreadExplorerPostImages,
  getThreadExplorerPostRecordKey,
  isThreadExplorerFeedUri,
  normalizeThreadExplorerAccountMode,
  normalizeThreadExplorerActorFocusMode as normalizeThreadExplorerActorFocusModeFromTools,
  createThreadExplorerActorStub as createThreadExplorerActorStubFromTools,
  isThreadExplorerOwnActor as isThreadExplorerOwnActorFromTools,
  getThreadExplorerOwnActor as getThreadExplorerOwnActorFromTools,
  isThreadExplorerOwnAccountTarget as isThreadExplorerOwnAccountTargetFromTools,
  isThreadExplorerForeignAccountMode as isThreadExplorerForeignAccountModeFromTools,
  isThreadExplorerForeignActorFocusMode as isThreadExplorerForeignActorFocusModeFromTools,
  getThreadExplorerRequestedActor as getThreadExplorerRequestedActorFromTools,
  renderThreadExplorerFeedPanel,
  renderThreadExplorerActorFocusPanel,
  renderThreadExplorerTreeEdges as renderThreadExplorerTreeEdgesFromTools,
  createThreadExplorerFeedItemFragment as createThreadExplorerFeedItemFragmentFromTools,
  getThreadExplorerReplySortTimestamp as getThreadExplorerReplySortTimestampFromTools,
  getChronologicalThreadExplorerReplies as getChronologicalThreadExplorerRepliesFromTools,
  prepareThreadExplorerRenderedNode,
  renderThreadExplorerTreePanel,
  configureThreadExplorerNodeToggle,
  createThreadExplorerRenderedItem as createThreadExplorerRenderedItemFromTools,
  createThreadExplorerReplyClusterRenderNode as createThreadExplorerReplyClusterRenderNodeFromTools,
  appendThreadExplorerReplyClusterNodes,
  createThreadExplorerReplyClusterWorkspace,
  renderThreadExplorerPostGallery,
  applyThreadExplorerPostImagePreviewShape as applyThreadExplorerPostImagePreviewShapeFromTools,
  syncThreadExplorerPostCardImageShape as syncThreadExplorerPostCardImageShapeFromTools,
  createThreadExplorerPostImageFigure,
  renderThreadExplorerQuoteGallery,
  createThreadExplorerQuotePreviewImage,
  renderThreadExplorerQuotePostCard,
  renderThreadExplorerExternalLinkCard,
  hideThreadExplorerExternalCardImage,
  getThreadExplorerFeedUriFromSource as getThreadExplorerFeedUriFromSourceModule,
  getThreadExplorerSearchIdFromSource as getThreadExplorerSearchIdFromSourceModule,
  normalizeThreadExplorerActor,
} from "./js/tools/thread-explorer.js";
import {
  getNetworkNodeScore,
  getNetworkRelationType,
  getNetworkScoreBreakdown,
  createNetworkFocusController,
  createNetworkDataController,
  rankNetworkNodes,
  selectNetworkNodes,
  sortNetworkProfiles,
  calculateNetworkViewport,
  calculateNetworkContentBounds,
} from "./js/tools/network.js";
import { createNetworkLayoutController } from "./js/tools/network-layout.js";
import { createNetworkWorkspaceRenderer } from "./js/tools/network-rendering.js";
import { buildNetworkFocusCardModel, createNetworkFocusCardRenderer } from "./js/tools/network-focus-rendering.js";
import { createNetworkStageRenderer } from "./js/tools/network-stage-rendering.js";
import { createNetworkWorkspaceController, readNetworkShapePreference, writeNetworkShapePreference } from "./js/tools/network-controller.js";
import { normalizeAnalysisActor, bindAnalysisWorkspaceEvents, createAnalysisWorkspaceController } from "./js/tools/analysis.js";
import { ANALYSIS_METRIC_DEFINITIONS, ANALYSIS_FUNCTION_WORDS, ANALYSIS_NUMBER_WORDS, ANALYSIS_TEMPORAL_GAP_BUCKETS, ANALYSIS_WEEKDAY_ANCHORS, ANALYSIS_WEEKDAY_FALLBACKS } from "./js/tools/analysis-config.js";
import { createAnalysisAccountNormalizer, getPersistableAnalysisAccount, analysisAccountNeedsNetworkRefresh } from "./js/tools/analysis-accounts.js";
import { createAnalysisAccountComparator } from "./js/tools/analysis-comparison.js";
import { createAnalysisRenderer, buildAnalysisMetricTableModel } from "./js/tools/analysis-rendering.js";
import { createAnalysisReportModels } from "./js/tools/analysis-report-models.js";
import { createAnalysisReportLayout } from "./js/tools/analysis-report-layout.js";
import { createAnalysisPdfRenderer } from "./js/tools/analysis-pdf-rendering.js";
import { createArchivePreferencesController } from "./js/tools/archive-preferences.js";
import { ANALYSIS_NETWORK_PATTERNS, ANALYSIS_CORPUS_PATTERNS, ANALYSIS_DELTA_REPORT_LABEL } from "./js/tools/analysis-config.js";
import { createAnalysisTableModels } from "./js/tools/analysis-table-models.js";
import { createAnalysisController } from "./js/tools/analysis-controller.js";
import { createAnalysisCorpusAnalyzer } from "./js/tools/analysis-corpus.js";
import { cosineSimilarityFromMaps, jaccardSimilarityFromSets, overlapSummaryFromSets, frequencyMapFromEntries, cosineSimilarityFromArrays, shareArray } from "./js/tools/analysis-similarity.js";
import { createAnalysisTemporalAnalyzer } from "./js/tools/analysis-temporal.js";
import { createAnalysisStylometryAnalyzer } from "./js/tools/analysis-stylometry.js";
import {
  buildArchiveMediaFileBaseName as buildArchiveMediaFileBaseNameFromData,
  buildArchiveMediaPartFileName,
  formatArchiveDatePart,
  bindArchivePreferenceEvents,
  bindArchiveActionEvents,
  bindArchiveResultExportEvents,
  bindPostEditCheckDialogEvents,
} from "./js/tools/archive.js";
import { createAccountPickerController, bindAccountSwitcherItemEvents } from "./js/tools/account-picker.js";
import { createNetworkStageController, renderNetworkLoadControls, bindNetworkViewportControls, bindNetworkWorkspaceEvents, bindNetworkStageModeEvents, bindNetworkInsightEvents, bindNetworkStageInteractionEvents, bindNetworkLifecycleEvents } from "./js/tools/network-ui.js";
import {
  normalizeThreadExplorerOrientation as normalizeThreadExplorerOrientationFromTools,
  normalizeThreadExplorerSource as normalizeThreadExplorerSourceFromTools,
  normalizeThreadExplorerViewMode as normalizeThreadExplorerViewModeFromTools,
  handleThreadExplorerFeedSelectChange as handleThreadExplorerFeedSelectChangeFromTools,
  handleThreadExplorerSourceSelectChange as handleThreadExplorerSourceSelectChangeFromTools,
  handleThreadExplorerFeedScroll as handleThreadExplorerFeedScrollFromTools,
  handleThreadExplorerActorFocusScroll as handleThreadExplorerActorFocusScrollFromTools,
  handleThreadExplorerActorModeChange as handleThreadExplorerActorModeChangeFromTools,
  handleThreadExplorerZoomOutClick as handleThreadExplorerZoomOutClickFromTools,
  handleThreadExplorerZoomInClick as handleThreadExplorerZoomInClickFromTools,
  handleThreadExplorerOrientationClick as handleThreadExplorerOrientationClickFromTools,
  handleThreadExplorerCountClick as handleThreadExplorerCountClickFromTools,
  handleThreadExplorerRepliesCountClick as handleThreadExplorerRepliesCountClickFromTools,
  toggleThreadExplorerReplyClusterNode as toggleThreadExplorerReplyClusterNodeFromTools,
  handleThreadExplorerWheel as handleThreadExplorerWheelFromTools,
  handleThreadExplorerPointerDown as handleThreadExplorerPointerDownFromTools,
  handleThreadExplorerPointerMove as handleThreadExplorerPointerMoveFromTools,
  handleThreadExplorerPointerUp as handleThreadExplorerPointerUpFromTools,
  updateThreadExplorerPanVelocity as updateThreadExplorerPanVelocityFromTools,
  applyThreadExplorerPanDelta as applyThreadExplorerPanDeltaFromTools,
  setThreadExplorerPanningMode as setThreadExplorerPanningModeFromTools,
  createThreadExplorerPanController,
} from "./js/tools/thread-explorer.js";
import { normalizeStoredDesktopLayout as normalizeStoredDesktopLayoutFromState,
  clampDesktopWidth, createDesktopLayoutController } from "./js/core/app-layout-state.js";
import { createThreadExplorerViewPreference, createThreadExplorerSelectionPreferences, createThreadExplorerFavoritesController, createThreadExplorerFeedSourcesController, createThreadExplorerGalleryFullscreenController, createThreadExplorerFocusController, createThreadExplorerRenderScheduler, createThreadExplorerZoomController, createThreadExplorerZoomResetController, createThreadExplorerCardFocusController, createThreadExplorerController, loadThreadExplorerActorFocusWorkflow, loadThreadExplorerFeedWorkflow, loadThreadExplorerThreadWorkflow, renderThreadExplorerWorkspace as renderThreadExplorerWorkspaceFromController, bindThreadExplorerWorkspaceEvents, bindThreadExplorerGlobalEvents, bindThreadExplorerDialogEvents, bindThreadExplorerSnapshotEvents } from "./js/tools/thread-explorer-controller.js";
import {
  hydrateThreadExplorerCard,
  createThreadExplorerLazyHydrationController,
  hydrateThreadExplorerAvatars,
  renderThreadExplorerCardAvatar,
  renderThreadExplorerCardMedia,
  renderThreadExplorerCardEmbeds,
  getThreadExplorerActorAvatarUri as getThreadExplorerActorAvatarUriFromHydration,
  markThreadExplorerAvatarImage as markThreadExplorerAvatarImageFromHydration,
  applyThreadExplorerAvatarHydration as applyThreadExplorerAvatarHydrationToTree,
  applyThreadExplorerAvatarCacheToTree as applyThreadExplorerAvatarCacheToTreeFromHydration,
} from "./js/tools/thread-explorer-hydration.js";
import { hydrateThreadExplorerSnapshotMedia as hydrateThreadExplorerSnapshotMediaFromTools } from "./js/tools/thread-explorer-media-hydration.js";
import {
  renderThreadExplorerControls,
  renderThreadExplorerFeedSources,
  renderThreadExplorerFavorites,
  renderThreadExplorerReplies,
  renderSavedSearches,
  configureSavedSearchesDialog,
  countThreadExplorerPosts as countThreadExplorerPostsFromRendering,
  formatThreadExplorerDate as formatThreadExplorerDateFromRendering,
  getThreadExplorerActorLabel as getThreadExplorerActorLabelFromRendering,
  getThreadExplorerPreviewText as getThreadExplorerPreviewTextFromRendering,
  loadThreadExplorerReactionsDialog as loadThreadExplorerReactionsDialogFromRendering,
  renderThreadExplorerReactionActors as renderThreadExplorerReactionActorsFromRendering,
} from "./js/tools/thread-explorer-rendering.js";
import {
  buildThreadExplorerSnapshotFileName as buildThreadExplorerSnapshotFileNameFromData,
  createThreadExplorerSnapshotExportController,
  countThreadExplorerSnapshotMediaAssets as countThreadExplorerSnapshotMediaAssetsFromData,
  createThreadExplorerSnapshotAbortError,
  getThreadExplorerSnapshotScale as getThreadExplorerSnapshotScaleFromData,
  throwIfThreadExplorerSnapshotAborted,
  getThreadExplorerSnapshotAvatarCacheKey as getSnapshotAvatarCacheKeyFromData,
  getThreadExplorerSnapshotCachedAvatarUri as getSnapshotCachedAvatarUriFromData,
  isThreadExplorerSnapshotMediaImage as isSnapshotMediaImageFromData,
  getThreadExplorerSnapshotMediaImageKeys as getSnapshotMediaImageKeysFromData,
  getThreadExplorerSnapshotMediaImageKey as getSnapshotMediaImageKeyFromData,
  getThreadExplorerSnapshotDrawableMediaImage as getSnapshotDrawableMediaImageFromData,
  getThreadExplorerSnapshotMediaDataUri as getSnapshotMediaDataUriFromData,
  setThreadExplorerSnapshotCachedImageSource as setSnapshotCachedImageSourceFromData,
  preloadThreadExplorerSnapshotAvatarImages as preloadSnapshotAvatarImagesFromData,
  preloadThreadExplorerSnapshotMediaImages as preloadSnapshotMediaImagesFromData,
  applyThreadExplorerSnapshotMediaCache as applySnapshotMediaCacheFromData,
  storeThreadExplorerSnapshotMediaDataUri as storeSnapshotMediaDataUriFromData,
  cacheThreadExplorerSnapshotMediaImage as cacheSnapshotMediaImageFromData,
  cacheLoadedThreadExplorerSnapshotMediaImages as cacheLoadedSnapshotMediaImagesFromData,
  inlineThreadExplorerSnapshotImages as inlineSnapshotImagesFromData,
  applyThreadExplorerSnapshotMediaDataUris as applySnapshotMediaDataUrisFromData,
  writeThreadExplorerPngUint32 as writePngUint32FromSnapshot,
  createThreadExplorerPngCrcTable as createPngCrcTableFromSnapshot,
  calculateThreadExplorerPngCrc as calculatePngCrcFromSnapshot,
  createThreadExplorerPngChunk as createPngChunkFromSnapshot,
  createThreadExplorerPngTextChunk as createPngTextChunkFromSnapshot,
  escapeThreadExplorerPngXmpText as escapePngXmpTextFromSnapshot,
  createThreadExplorerPngXmpPacket as createPngXmpPacketFromSnapshot,
  createThreadExplorerPngXmpChunk as createPngXmpChunkFromSnapshot,
  createThreadExplorerPngMetadataChunks as createPngMetadataChunksFromSnapshot,
  addThreadExplorerPngMetadata as addPngMetadataFromSnapshot,
  createThreadExplorerPngHeaderData as createPngHeaderDataFromSnapshot,
  drawThreadExplorerSnapshotRoundRect as drawSnapshotRoundRectFromModule,
  strokeThreadExplorerSnapshotRoundRect as strokeSnapshotRoundRectFromModule,
  wrapThreadExplorerSnapshotText as wrapSnapshotTextFromModule,
  drawThreadExplorerSnapshotTextBlock as drawSnapshotTextBlockFromModule,
  getThreadExplorerSnapshotCountsText as getSnapshotCountsTextFromModule,
  drawThreadExplorerSnapshotEdges as drawSnapshotEdgesFromModule,
  drawThreadExplorerSnapshotCard as drawSnapshotCardFromModule,
  renderThreadExplorerSnapshot as renderSnapshotFromModule,
  renderThreadExplorerTiledPngSnapshot as renderTiledPngFromModule,
  renderThreadExplorerForeignObjectSnapshot as renderForeignObjectFromModule,
  renderThreadExplorerCanvasSnapshot as renderCanvasSnapshotFromModule,
  renderThreadExplorerSnapshotTile as renderSnapshotTileFromModule,
  drawThreadExplorerSnapshotFallbackAvatar as drawSnapshotFallbackAvatarFromModule,
  canDrawThreadExplorerSnapshotImage as canDrawSnapshotImageFromModule,
  drawThreadExplorerSnapshotAvatarImage as drawSnapshotAvatarFromModule,
  drawThreadExplorerSnapshotCoverImage as drawSnapshotCoverImageFromModule,
  drawThreadExplorerSnapshotImageAltText as drawSnapshotAltTextFromModule,
  drawThreadExplorerSnapshotMediaImages as drawSnapshotMediaImagesFromModule,
  drawThreadExplorerSnapshotMediaPlaceholder as drawSnapshotMediaPlaceholderFromModule,
  createThreadExplorerSnapshotCanvas as createSnapshotCanvasFromModule,
  encodeThreadExplorerSnapshotCanvas as encodeSnapshotCanvasFromModule,
  getThreadExplorerSnapshotBackgroundColor as getSnapshotBackgroundColorFromModule,
} from "./js/tools/thread-explorer-snapshot.js";
import {
  setThreadExplorerReplyClusterItemPosition as setReplyClusterItemPositionFromLayout,
  getThreadExplorerReplyClusterItemSize as getReplyClusterItemSizeFromLayout,
  setThreadExplorerReplyClusterNodePosition as setReplyClusterNodePositionFromLayout,
  renderThreadExplorerReplyClusterEdges as renderReplyClusterEdgesFromLayout,
  applyThreadExplorerReplyClusterBounds as applyReplyClusterBoundsFromLayout,
  layoutThreadExplorerReplyCluster as layoutReplyClusterFromLayout,
  ensureThreadExplorerReplyClusterRootExpanded as ensureReplyClusterRootExpandedFromLayout,
  configureThreadExplorerReplyClusterItem,
  mountThreadExplorerReplyClusterWorkspace,
  getThreadExplorerStageBoxFromRects,
  getThreadExplorerContentBounds,
  calculateThreadExplorerPointZoom,
  calculateThreadExplorerNodePan,
  getThreadExplorerCardNeighborhoodBounds as getThreadExplorerCardNeighborhoodBoundsFromLayout,
  calculateThreadExplorerViewportFit,
} from "./js/tools/thread-explorer-layout.js";
import {
  createDmArchiveController,
  createDmArchiveExportController,
  createDmArchiveWorkspaceRenderer,
  bindDmArchiveEvents,
  retainDmSelectedParticipants,
} from "./js/tools/dm-archive.js";
import { clamp, setAttr, setSafeHtml, setSafeText } from "./js/core/app-utils.js";
import { cloneTemplate, cloneTemplateContent } from "./js/shared/shared-templates.js";
import { DEFAULT_AVATAR_URI, setAvatarImage, createSavedAccountRenderer, resolveStoredAccountAvatar } from "./js/shared/shared-accounts.js";
import {
  requestPostLike,
  requestPostUnlike,
  requestReplyTarget,
  requestThreadPublish,
} from "./js/atproto/atproto-posting.js";
import {
  requestAccountLogout,
  requestAccountRemoval,
  requestAccountSwitch,
} from "./js/atproto/atproto-actors.js";
import { requestThreadExplorerMediaHydration } from "./js/atproto/atproto-media.js";
import { requestSearchResults } from "./js/atproto/atproto-search.js";
import {
  clampComposerTextLength,
  countComposerGraphemes as countGraphemes,
  countComposerUtf8Bytes as countUtf8Bytes,
  createComposerPostTextLimit as createPostTextLimit,
  doesComposerTextFitLimit as fitsPostTextLimit,
  getComposerPostTextMetrics as getPostTextMetrics,
  splitComposerGraphemes as splitIntoGraphemes,
} from "./js/composer/composer-main.js";
import {
  formatComposerSegmentLengthLabel,
  getComposerSegmentLengthDiagnostics,
  validateComposerPublishInput,
  createComposerPublishAvailabilityController,
} from "./js/composer/composer-validation.js";
import {
  normalizeComposerSegmentOverrides as normalizeComposerSegmentOverridesFromModule,
  syncComposerSegmentImages as syncComposerSegmentImagesFromModule,
} from "./js/composer/composer-segments.js";
import {
  createComposerImageGeometry,
} from "./js/composer/composer-image-geometry.js";
import { prepareComposerPublishSegments, buildComposerPublishPayload, buildComposerPublishResultModel, renderComposerPublishResult, openComposerPublishedPost, createComposerPublishResultHandlers } from "./js/composer/composer-publishing.js";
import { renderComposerImageToCanvas, bindComposerImageEditorEvents, drawComposerImageEditor, createComposerImageEditorDragController, createComposerImageEditorMetricsController } from "./js/composer/composer-image-renderer.js";
import { createComposerImageEditorController } from "./js/composer/composer-image-editor.js";
import { createComposerImageProcessing } from "./js/composer/composer-image-processing.js";
import { createComposerDocumentController, createComposerThreadFileCodec } from "./js/composer/composer-document.js";
import { createComposerTextService } from "./js/composer/composer-splitter.js";
import { createComposerImageValidationController } from "./js/composer/composer-images.js";
import {
  normalizeComposerLinkCardProvider,
  createComposerProxySettingsController,
  createComposerProviderAvailabilityController,
  createComposerProviderUsageController,
  createComposerProviderPresentationController,
  fetchComposerLinkCardImage,
  requestComposerLinkCard,
  signComposerLinkCardRequest,
  composerLinkCardImageToDataUrl,
  getComposerLinkCardProxyErrorMessage,
  getComposerMicrolinkErrorMessage,
} from "./js/composer/composer-link-card-providers.js";
import {
  tokenizeComposerText as tokenizeText,
  trimComposerSegment as trimSegment,
} from "./js/composer/composer-splitter.js";
import { renderComposerSegmentImages, createComposerImageCollectionController, composerEventHasTransferFiles, getComposerDroppedImageFiles, getComposerImageDropPosition, clearComposerImageDropMarkers, clearComposerImageDragVisuals, updateComposerImageAltDisplay } from "./js/composer/composer-images.js";
import { normalizeComposerLinkCard, normalizeComposerSegmentLinkCards, findOtherComposerLinkCardIndex, getComposerLinkCardTargetEntries, renderComposerLinkCardTargets, applyComposerLinkCardTargetAction, createComposerLinkCardDialogController, createComposerLinkCardSubmissionController } from "./js/composer/composer-link-cards.js";
import { normalizeComposerReplyTarget, bindComposerContentDialogEvents, getComposerReplyTargetDisplayName, renderComposerReplyTargetCard, createComposerReplyTargetDialogController, createComposerReplyTargetController, buildComposerReplyTargetFromPost, createComposerAltTextDialogController } from "./js/composer/composer-dialogs.js";
import { createComposerSegmentRenderer, createComposerLengthPresentationController, createComposerRenderScheduler } from "./js/composer/composer-segment-rendering.js";
import { openComposerWorkspace, bindComposerCoreEvents, bindComposerHashtagEvents, createComposerInputController, createComposerInputEventHandlers, createComposerInputWarningController, createComposerReplyHandoff, openComposerReplyTarget, createComposerUiStateController } from "./js/composer/composer-page.js";
import { bindComposerDialogEvents } from "./js/composer/composer-dialogs.js";
import {
  formatComposerHistoryMeta,
  renderComposerHistoryList,
  createComposerHistoryItemActions,
  buildComposerHistoryEntry,
  recordComposerHistoryEntry,
  getComposerHistoryPreviewText,
  mergeComposerPostingHistory,
  normalizeComposerPostingHistory,
} from "./js/composer/composer-history.js";
import {
  buildComposerMentionProfileUrl as buildComposerMentionProfileUrlFromData,
  createComposerMentionResolver,
  createComposerMentionDisplayController,
  renderComposerMentionSearchResults,
  runComposerMentionSearch,
  getKnownComposerMentionHandles,
  createComposerMentionSourceSyncController,
  createComposerMentionSearchActions,
  findComposerMentionSuggestion as findComposerMentionSuggestionFromData,
  replaceComposerMentionHandle as replaceComposerMentionHandleFromData,
  textContainsComposerMentionHandle as textContainsComposerMentionHandleFromData,
} from "./js/composer/composer-mentions.js";
import {
  createComposerPostSettingsController,
  DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS,
} from "./js/composer/composer-post-settings.js";
import {
  createDefaultImageEdit,
  dataUrlToFile,
  hasExplicitImageUploadTransform as hasExplicitSharedImageUploadTransform,
  isImageAutoResizeEnabled as isSharedImageAutoResizeEnabled,
  isImageUsingDefaultEdit,
  normalizeImageAutoResizeMode,
  normalizeImageEdit,
  normalizeSegmentImages as normalizeSharedSegmentImages,
  normalizeThreadImage as normalizeSharedThreadImage,
} from "./js/shared/shared-images.js";
import { getFirstHttpUrl, normalizeLinkCardTargetUrl, validateLinkCardTargetUrl, buildBasicLinkCard } from "./js/shared/shared-link-cards.js";
import {
  applyLikeStateToPost,
  buildLivePostInteractionModel,
  buildExternalCardDisplayModel,
  buildPostCardDisplayModel,
  buildPostDisplayText,
  buildPostEditButtonModel,
  buildPostMetaText,
  buildPostMetricEntries,
  buildPostMetricLabels,
  buildPostViewLinkModel,
  buildQuoteCardDisplayModel,
  buildSearchResultMetaText as buildSharedSearchResultMetaText,
  extractExternalCardFromEmbed,
  formatPostCount,
  formatPostDateTime,
  getPostAuthorFields,
  getPostActorLabel,
  getPostPreviewText,
  getPostMetricCounts,
  getViewerLikeUri,
  isPostLikedByViewer,
} from "./js/shared/shared-post-rendering.js";

const assetService = createAssetService({
  encodeBase64: (value) => btoa(value), decodeBase64: (value) => atob(value),
  blob: (parts, options) => new Blob(parts, options), reader: () => new FileReader(),
  bitmap: (blob) => createImageBitmap(blob), fetch: (url, options) => fetch(url, options),
  encodeError: () => t("archiveAssetEncodeFailed"), loadError: (status) => t("archiveAssetLoadFailed", { status }),
});
const { toBase64: bytesToBase64, fromBase64: base64ToBytes, dataUri: assetToDataUri,
  readDataUri: assetToDataUriAsync, bitmap: loadArchiveAssetBitmap } = assetService;

const buildPdfFile = createPdfFileBuilder({ applicationLabel: getExportMetadataApplicationLabel, now: () => new Date() });
const { links: extractPdfLinkRuns, wrap: buildWrappedPdfLines, draw: drawArchivePdfTextBlock, rectangle: canvasRectToPdfRect }
  = createPdfTextLayout({ facetRuns: extractFacetRichTextRuns });

const MAX_POST_LENGTH = 300;
const MAX_POST_UTF8_BYTES = 3000;
const MAX_COMPOSER_GRAPHEME_LENGTH = 10_000;
const MANUAL_SPLIT_MARKER = "%%";
const MAX_IMAGES_PER_SEGMENT = 10;
const MAX_ALT_TEXT_LENGTH = 2000;
const IMAGE_BLOB_LIMIT = 2_000_000;
const IMAGE_MAX_DIMENSION = 4_000;
const COMPOSER_SEGMENT_RENDER_DEBOUNCE_MS = 1000;
const COMPOSER_MENTION_RESOLVE_DEBOUNCE_MS = 350;
const IMAGE_MIN_EXPORT_SCALE = 0.05;
const IMAGE_EDITOR_CANVAS_WIDTH = 980;
const IMAGE_EDITOR_CANVAS_HEIGHT = 630;
const IMAGE_EXPORT_WIDTH = 1400;
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
const DM_ACCESS_QUERY_PARAM = "DMSECRET";
const DM_ACCESS_HASH_PARAM = "dmsecret";
const DM_ACCESS_SESSION_KEY = "threadline:dm-access";
const DM_ACCESS_GATE_ENABLED = false;
const LEGACY_WORKSPACE_STORAGE_KEY = "threadline:last-workspace";
const TOOLS_WORKSPACE_STORAGE_KEY = "threadline:last-tools-workspace";
const THEME_MODE_STORAGE_KEY = "threadline:theme-mode";
const COMPACT_MODE_STORAGE_KEY = "threadline:compact-mode";
const PENDING_PAGE_SWITCH_URL_SESSION_KEY = "threadline:pending-page-switch-url";
const PENDING_COMPOSER_REPLY_TARGET_SESSION_KEY = "threadline:pending-composer-reply-target";
const PENDING_COMPOSER_REPLY_TARGET_QUERY_KEY = "_replyTarget";
const THREAD_EXPLORER_SELECTION_STORAGE_KEY = "threadline:thread-explorer-selection";
const THREAD_EXPLORER_ORIENTATION_STORAGE_KEY = "threadline:thread-explorer-orientation";
const THREAD_EXPLORER_VIEW_MODE_STORAGE_KEY = "threadline:thread-explorer-view-mode";
const SETTINGS_BACKUP_EXPORTED_AT_STORAGE_KEY = "threadline:last-settings-backup-export";
const SETTINGS_BACKUP_REMINDER_DISMISSED_AT_STORAGE_KEY = "threadline:settings-backup-reminder-dismissed-at";
const SETTINGS_BACKUP_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const SETTINGS_BACKUP_REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1000;
const THREAD_EXPLORER_ORIENTATION_VERTICAL = "vertical";
const THREAD_EXPLORER_ORIENTATION_HORIZONTAL = "horizontal";
const THREAD_EXPLORER_VIEW_MODE_TREE = "tree";
const THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER = "reply-cluster";
const THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_DIMENSION = 8192;
const THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_PIXELS = 24000000;
const THREAD_EXPLORER_SNAPSHOT_TILE_SIZE = 2048;
const THREAD_EXPLORER_SNAPSHOT_MEDIA_WARNING_THRESHOLD = 100;
const THREAD_EXPLORER_DRAG_THRESHOLD_PX = 6;
const THREAD_EXPLORER_INERTIA_MIN_VELOCITY = 0.35;
const THREAD_EXPLORER_INERTIA_STOP_VELOCITY = 0.04;
const THREAD_EXPLORER_INERTIA_FRICTION = 0.92;
const NETWORK_STAGE_SHAPE_STORAGE_KEY = "threadline:network-stage-shape";
const NETWORK_STAGE_SHAPE_ROUND = "round";
const NETWORK_STAGE_SHAPE_SQUIRCLE = "squircle";
const APP_SHARE_TITLE = "Threadline";
const APP_SHARE_URL = "https://marsrakete.github.io/threadline/";
const LINK_CARD_PROVIDER_NONE = "none";
const LINK_CARD_PROVIDER_MICROLINK = "microlink";
const LINK_CARD_PROVIDER_PROXY = "proxy";
const MICROLINK_DAILY_LIMIT = 25;
// Replace this SHA-256 hash with the hash of your private DM secret.
const DM_ACCESS_SECRET_HASH = "12ba477603258163567c8192f456efeeea933b95307fb7033903dc637f54121a";
const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 96;

/**
 * Sets multiple attributes on an element.
 * @param {HTMLElement} element - The target element.
 * @param {Object} attrs - Object with attribute name-value pairs.
 * @returns {void}
 */
function setAttrs(element, attrs) {
  if (!element) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, String(value));
    }
  }
}

/**
 * Adds CSS classes to an element.
 * @param {HTMLElement} element - The target element.
 * @param {...string} classes - Class names to add.
 * @returns {void}
 */
function addClasses(element, ...classes) {
  if (element) {
    element.classList.add(...classes.filter(Boolean));
  }
}

/**
 * Sets or toggles CSS classes based on a condition.
 * @param {HTMLElement} element - The target element.
 * @param {string} className - The class name.
 * @param {boolean} condition - Whether to add or remove the class.
 * @returns {void}
 */
function toggleClass(element, className, condition) {
  if (element) {
    element.classList.toggle(className, condition);
  }
}

/**
 * Creates an icon SVG element from a path definition.
 * @param {string} pathD - The SVG path d attribute.
 * @param {string} [viewBox="0 0 24 24"] - The SVG viewBox.
 * @returns {SVGElement} The created SVG element.
 */
function createIconSvgElement(pathD, viewBox = "0 0 24 24") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  return svg;
}

/**
 * Appends multiple children to a parent element.
 * @param {HTMLElement} parent - The parent element.
 * @param {...HTMLElement} children - The child elements to append.
 * @returns {void}
 */
function appendChildren(parent, ...children) {
  if (parent) {
    children.filter(Boolean).forEach((child) => parent.appendChild(child));
  }
}

function normalizeStoredDesktopLayout(rawSidebarWidth, rawComposerWidth, rawLayoutVersion) {
  return normalizeStoredDesktopLayoutFromState(rawSidebarWidth, rawComposerWidth, rawLayoutVersion, {
    defaultSidebarWidth: DEFAULT_SIDEBAR_WIDTH_DESKTOP,
    defaultComposerWidth: DEFAULT_COMPOSER_WIDTH_DESKTOP,
    minSidebarWidth: MIN_SIDEBAR_WIDTH_DESKTOP,
    maxSidebarWidth: MAX_SIDEBAR_WIDTH_DESKTOP,
    minComposerWidth: MIN_COMPOSER_WIDTH_DESKTOP,
    maxComposerWidth: MAX_COMPOSER_WIDTH_DESKTOP,
    layoutVersion: DESKTOP_LAYOUT_STATE_VERSION,
    legacySignatures: LEGACY_DESKTOP_LAYOUT_SIGNATURES,
    clamp: clampDesktopWidth,
  });
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
const threadExplorerButton = document.querySelector("#thread-explorer-button");
const threadExplorerLaunchNote = document.querySelector("#thread-explorer-launch-note");
const searchButton = document.querySelector("#search-button");
const searchLaunchNote = document.querySelector("#search-launch-note");
const analysisButton = document.querySelector("#analysis-button");
const analysisLaunchNote = document.querySelector("#analysis-launch-note");
const dmLaunchPanel = document.querySelector(".dm-launch-panel");
const dmButton = document.querySelector("#dm-button");
const dmLaunchNote = document.querySelector("#dm-launch-note");
const saveThreadButton = document.querySelector("#save-thread-button");
const settingsDialog = document.querySelector("#settings-dialog");
const settingsCloseTop = document.querySelector("#settings-close-top");
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
const linkCardProviderNoneInput = document.querySelector("#link-card-provider-none");
const linkCardProviderMicrolinkInput = document.querySelector("#link-card-provider-microlink");
const linkCardProviderProxyInput = document.querySelector("#link-card-provider-proxy");
const linkCardProviderNoneWrap = document.querySelector("#link-card-provider-none-wrap");
const linkCardProviderMicrolinkWrap = document.querySelector("#link-card-provider-microlink-wrap");
const linkCardProviderProxyWrap = document.querySelector("#link-card-provider-proxy-wrap");
const linkCardProviderNote = document.querySelector("#link-card-provider-note");
const linkCardDialog = document.querySelector("#link-card-dialog");
const linkCardCloseTop = document.querySelector("#link-card-close-top");
const linkCardCancelButton = document.querySelector("#link-card-cancel-button");
const linkCardCreateButton = document.querySelector("#link-card-create-button");
const linkCardDialogTitle = document.querySelector("#link-card-dialog h2");
const linkCardUrlNode = document.querySelector("#link-card-url");
const linkCardUrlField = document.querySelector("#link-card-url-field");
const linkCardUrlInput = document.querySelector("#link-card-url-input");
const linkCardTargetListField = document.querySelector("#link-card-target-list-field");
const linkCardTargetListNote = document.querySelector("#link-card-target-list-note");
const linkCardTargetList = document.querySelector("#link-card-target-list");
const linkCardTargetTemplate = document.querySelector("#link-card-target-template");
const linkCardProviderState = document.querySelector("#link-card-provider-state");
const linkCardWarning = document.querySelector("#link-card-warning");
const linkCardStatus = document.querySelector("#link-card-status");
const mentionSearchDialog = document.querySelector("#mention-search-dialog");
const mentionSearchDialogEyebrow = mentionSearchDialog?.querySelector(".eyebrow");
const mentionSearchDialogTitle = document.querySelector("#mention-search-dialog-title");
const mentionSearchDialogNote = document.querySelector("#mention-search-dialog-note");
const mentionSearchCloseTop = document.querySelector("#mention-search-close-top");
const mentionSearchCloseButton = document.querySelector("#mention-search-close-button");
const mentionSearchInput = document.querySelector("#mention-search-input");
const mentionSearchStatus = document.querySelector("#mention-search-status");
const mentionSearchResults = document.querySelector("#mention-search-results");
const mentionSearchResultTemplate = document.querySelector("#mention-search-result-template");
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
const compactModeToggleButtons = Array.from(document.querySelectorAll("#compact-mode-toggle-button"));
const pageSwitchLinks = Array.from(document.querySelectorAll(".page-switch-link"));
const privacyPageLinks = Array.from(document.querySelectorAll("[data-privacy-page-link]"));
const resetColumnWidthsButton = document.querySelector("#reset-column-widths-button");
const themeStatusNote = document.querySelector("#theme-status-note");
const compactModeStatusNote = document.querySelector("#compact-mode-status-note");
const versionLabel = document.querySelector("#version-label");
const checkUpdatesButton = document.querySelector("#check-updates-button");
const reloadAppButton = document.querySelector("#reload-app-button");
const updateStatus = document.querySelector("#update-status");
const publishResultText = document.querySelector("#publish-result-text");
const publishResultRateLimitNote = document.querySelector("#publish-result-rate-limit-note");
const publishResultThreadExplorerButton = document.querySelector("#publish-result-thread-explorer-button");
const publishResultLink = document.querySelector("#publish-result-link");
const progressTitle = document.querySelector("#progress-title");
const progressMessage = document.querySelector("#progress-message");
const errorTitle = document.querySelector("#error-title");
const errorMessage = document.querySelector("#error-message");
const errorLinkWrap = document.querySelector("#error-link-wrap");
const errorLink = document.querySelector("#error-link");
const helpStatus = document.querySelector("#help-status");
const helpContent = document.querySelector("#help-content");
const tipText = document.querySelector("#tip-text");
const nextTipButton = document.querySelector("#next-tip-button");
const hideTipsButton = document.querySelector("#hide-tips-button");
const tipsPanel = document.querySelector(".tips-panel");
const tipsVisibleToggle = document.querySelector("#tips-visible-toggle");
const altTextRequiredToggle = document.querySelector("#alt-text-required-toggle");
const imageAutoResizeSelect = document.querySelector("#image-auto-resize-select");
const archiveExpertModeToggle = document.querySelector("#archive-expert-mode-toggle");
const exportSettingsButton = document.querySelector("#export-settings-button");
const importSettingsButton = document.querySelector("#import-settings-button");
const importSettingsInput = document.querySelector("#import-settings-input");
const backupStatus = document.querySelector("#backup-status");
const backupReminderDialog = document.querySelector("#backup-reminder-dialog");
const backupReminderMessage = document.querySelector("#backup-reminder-message");
const backupReminderSaveButton = document.querySelector("#backup-reminder-save-button");
const backupReminderLaterButton = document.querySelector("#backup-reminder-later-button");
const backupReminderCloseTop = document.querySelector("#backup-reminder-close-top");
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
const confirmDialogPreview = document.querySelector("#confirm-dialog-preview");
const confirmDialogAvatar = document.querySelector("#confirm-dialog-avatar");
const confirmDialogPreviewName = document.querySelector("#confirm-dialog-preview-name");
const confirmDialogPreviewHandle = document.querySelector("#confirm-dialog-preview-handle");
const confirmDialogConfirmButton = document.querySelector("#confirm-dialog-confirm-button");
const confirmDialogCancelButton = document.querySelector("#confirm-dialog-cancel-button");
const replyTargetButton = document.querySelector("#reply-target-button");
const replyTargetCard = document.querySelector("#reply-target-card");
const replyTargetCardEyebrow = document.querySelector("#reply-target-card-eyebrow");
const replyTargetAvatar = document.querySelector("#reply-target-avatar");
const replyTargetName = document.querySelector("#reply-target-name");
const replyTargetHandle = document.querySelector("#reply-target-handle");
const replyTargetMeta = document.querySelector("#reply-target-meta");
const replyTargetWarning = document.querySelector("#reply-target-warning");
const replyTargetText = document.querySelector("#reply-target-text");
const replyTargetClearButton = document.querySelector("#reply-target-clear-button");
const replyTargetDialog = document.querySelector("#reply-target-dialog");
const replyTargetCloseTop = document.querySelector("#reply-target-close-top");
const replyTargetCloseButton = document.querySelector("#reply-target-close");
const replyTargetUrlInput = document.querySelector("#reply-target-url");
const replyTargetStatus = document.querySelector("#reply-target-status");
const replyTargetSubmitButton = document.querySelector("#reply-target-submit");
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
const composerInputWarning = document.querySelector("#composer-input-warning");
const composerLockNote = document.querySelector("#composer-lock-note");
const composerUnlockButton = document.querySelector("#composer-unlock-button");
const composerPostedNote = document.querySelector("#composer-posted-note");
const composerPostedDismissButton = document.querySelector("#composer-posted-dismiss-button");
const counterToggle = document.querySelector("#counter-toggle");
const threadEmojiToggle = document.querySelector("#thread-emoji-toggle");
const markerSpacingToggle = document.querySelector("#marker-spacing-toggle");
const characterCount = document.querySelector("#character-count");
const segmentSummary = document.querySelector("#segment-summary");
const composerLengthWarning = document.querySelector("#composer-length-warning");
const publishWarning = document.querySelector("#publish-warning");
const publishRateLimitNote = document.querySelector("#publish-rate-limit-note");
const segmentsPane = document.querySelector("#segments-pane");
const segmentsList = document.querySelector("#segments-list");
const segmentTemplate = document.querySelector("#segment-template");
const threadIntroToggle = document.querySelector("#thread-intro-toggle");
const postSettingsButton = document.querySelector("#post-settings-button");
const postLanguagesSummary = document.querySelector("#post-languages-summary");
const postLanguagesDialog = document.querySelector("#post-languages-dialog");
const postLanguagesDialogEyebrow = document.querySelector("#post-languages-dialog-eyebrow");
const postLanguagesDialogTitle = document.querySelector("#post-languages-dialog-title");
const postLanguagesDialogDescription = document.querySelector("#post-languages-dialog-description");
const postLanguagesCloseTop = document.querySelector("#post-languages-close-top");
const postLanguagesCloseButton = document.querySelector("#post-languages-close-button");
const postLanguagesSearch = document.querySelector("#post-languages-search");
const postLanguagesSettingsList = document.querySelector("#post-languages-settings-list");
const postLanguagesSelectionNote = document.querySelector("#post-languages-selection-note");
const postLanguagesList = document.querySelector("#post-languages-list");
const postLanguagesDisclosure = document.querySelector("#post-languages-disclosure");
const postLanguagesDisclosureMeta = document.querySelector("#post-languages-disclosure-meta");
const postInteractionDisclosure = document.querySelector("#post-interaction-disclosure");
const postInteractionDisclosureMeta = document.querySelector("#post-interaction-disclosure-meta");
const searchLanguageDialogNote = document.querySelector("#search-language-dialog-note");
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
const threadExplorerWorkspace = document.querySelector("#thread-explorer-workspace");
const searchWorkspace = document.querySelector("#search-workspace");
const analysisWorkspace = document.querySelector("#analysis-workspace");
const dmWorkspace = document.querySelector("#dm-workspace");
const searchModeSelect = document.querySelector("#search-mode-select");
const searchModeNote = document.querySelector("#search-mode-note");
const searchUrlInput = document.querySelector("#search-url-input");
const searchUrlStatus = document.querySelector("#search-url-status");
const searchQueryField = document.querySelector("#search-query-field");
const searchQueryLabel = document.querySelector("#search-query-label");
const searchQueryInput = document.querySelector("#search-query-input");
const searchActorField = document.querySelector("#search-actor-field");
const searchActorLabel = document.querySelector("#search-actor-label");
const searchActorInput = document.querySelector("#search-actor-input");
const searchUseOwnAccountButton = document.querySelector("#search-use-own-account-button");
const searchSummary = document.querySelector("#search-summary");
const searchTagsField = document.querySelector("#search-tags-field");
const searchTagsLabel = document.querySelector("#search-tags-label");
const searchHashtagButton = document.querySelector("#search-hashtag-button");
const searchTagMatchSelect = document.querySelector("#search-tag-match-select");
const searchHashtagSummary = document.querySelector("#search-hashtag-summary");
const searchMediaSelect = document.querySelector("#search-media-select");
const searchPostTypeSelect = document.querySelector("#search-post-type-select");
const searchSortField = document.querySelector("#search-sort-field");
const searchSortSelect = document.querySelector("#search-sort-select");
const searchExcludeTextInput = document.querySelector("#search-exclude-text-input");
const searchMentionsInput = document.querySelector("#search-mentions-input");
const searchLanguageButton = document.querySelector("#search-language-button");
const searchLanguageSummary = document.querySelector("#search-language-summary");
const searchDomainInput = document.querySelector("#search-domain-input");
const searchTargetUrlInput = document.querySelector("#search-target-url-input");
const searchSinceInput = document.querySelector("#search-since-input");
const searchUntilInput = document.querySelector("#search-until-input");
const searchStatus = document.querySelector("#search-status");
const searchRunButton = document.querySelector("#search-run-button");
const searchMoreButton = document.querySelector("#search-more-button");
const searchCancelButton = document.querySelector("#search-cancel-button");
const searchSaveButton = document.querySelector("#search-save-button");
const searchSavedButton = document.querySelector("#search-saved-button");
const searchClearButton = document.querySelector("#search-clear-button");
const searchCopyUrlButton = document.querySelector("#search-copy-url-button");
const searchResultsList = document.querySelector("#search-results-list");
const threadExplorerUrlButton = document.querySelector("#thread-explorer-url-button");
const threadExplorerSearchesButton = document.querySelector("#thread-explorer-searches-button");
const threadExplorerRefreshButton = document.querySelector("#thread-explorer-refresh-button");
const threadExplorerSourceField = document.querySelector("#thread-explorer-source-field");
const threadExplorerAccountField = document.querySelector("#thread-explorer-account-field");
const threadExplorerSourceSelect = document.querySelector("#thread-explorer-source-select");
const threadExplorerAccountInput = document.querySelector("#thread-explorer-account-input");
const threadExplorerUseOwnAccountButton = document.querySelector("#thread-explorer-use-own-account-button");
const threadExplorerAccountModeField = document.querySelector("#thread-explorer-account-mode-field");
const threadExplorerAccountModeSelect = document.querySelector("#thread-explorer-account-mode-select");
const threadExplorerAccountNote = document.querySelector("#thread-explorer-account-note");
const threadExplorerFeedPickerField = document.querySelector("#thread-explorer-feed-picker-field");
const threadExplorerFeedSelect = document.querySelector("#thread-explorer-feed-select");
const threadExplorerActorFocus = document.querySelector("#thread-explorer-actor-focus");
const threadExplorerActorFocusAvatar = document.querySelector("#thread-explorer-actor-focus-avatar");
const threadExplorerActorFocusTitle = document.querySelector("#thread-explorer-actor-focus-title");
const threadExplorerActorFocusHandle = document.querySelector("#thread-explorer-actor-focus-handle");
const threadExplorerActorFocusCloseButton = document.querySelector("#thread-explorer-actor-focus-close");
const threadExplorerActorModeSelect = document.querySelector("#thread-explorer-actor-mode-select");
const threadExplorerActorFocusStatus = document.querySelector("#thread-explorer-actor-focus-status");
const threadExplorerActorFeedList = document.querySelector("#thread-explorer-actor-feed-list");
const threadExplorerActorMoreButton = document.querySelector("#thread-explorer-actor-more-button");
const threadExplorerFeedStatus = document.querySelector("#thread-explorer-feed-status");
const threadExplorerFeedList = document.querySelector("#thread-explorer-feed-list");
const threadExplorerThreadTitle = document.querySelector("#thread-explorer-thread-title");
const threadExplorerThreadStatus = document.querySelector("#thread-explorer-thread-status");
const threadExplorerThreadTree = document.querySelector("#thread-explorer-thread-tree");
const threadExplorerThreadStage = document.querySelector("#thread-explorer-thread-stage");
const threadExplorerRootButton = document.querySelector("#thread-explorer-root-button");
const threadExplorerReloadThreadButton = document.querySelector("#thread-explorer-reload-thread-button");
const threadExplorerSnapshotPngButton = document.querySelector("#thread-explorer-snapshot-png-button");
const threadExplorerSaveButton = document.querySelector("#thread-explorer-save-button");
const threadExplorerFavoritesButton = document.querySelector("#thread-explorer-favorites-button");
const threadExplorerZoomOutButton = document.querySelector("#thread-explorer-zoom-out-button");
const threadExplorerZoomResetButton = document.querySelector("#thread-explorer-zoom-reset-button");
const threadExplorerZoomInButton = document.querySelector("#thread-explorer-zoom-in-button");
const threadExplorerViewModeButton = document.querySelector("#thread-explorer-view-mode-button");
const threadExplorerOrientationButton = document.querySelector("#thread-explorer-orientation-button");
const threadExplorerFullscreenButton = document.querySelector("#thread-explorer-fullscreen-button");
const threadExplorerCollapseButton = document.querySelector("#thread-explorer-collapse-button");
const threadExplorerExpandButton = document.querySelector("#thread-explorer-expand-button");
const threadExplorerFullscreenCloseButton = document.querySelector("#thread-explorer-fullscreen-close-button");
const threadExplorerFeedItemTemplate = document.querySelector("#thread-explorer-feed-item-template");
const threadExplorerFeedOptionTemplate = document.querySelector("#thread-explorer-feed-option-template");
const threadExplorerNodeTemplate = document.querySelector("#thread-explorer-node-template");
const threadExplorerImageTemplate = document.querySelector("#thread-explorer-image-template");
const threadExplorerFavoriteItemTemplate = document.querySelector("#thread-explorer-favorite-item-template");
const savedSearchItemTemplate = document.querySelector("#saved-search-item-template");
const threadExplorerActorItemTemplate = document.querySelector("#thread-explorer-actor-item-template");
const threadExplorerGalleryThumbTemplate = document.querySelector("#thread-explorer-gallery-thumb-template");
const threadExplorerUrlDialog = document.querySelector("#thread-explorer-url-dialog");
const threadExplorerUrlCloseTopButton = document.querySelector("#thread-explorer-url-close-top-button");
const threadExplorerUrlCloseButton = document.querySelector("#thread-explorer-url-close-button");
const threadExplorerUrlInput = document.querySelector("#thread-explorer-url-input");
const threadExplorerUrlLoadButton = document.querySelector("#thread-explorer-url-load-button");
const threadExplorerUrlStatus = document.querySelector("#thread-explorer-url-status");
const threadExplorerFavoritesDialog = document.querySelector("#thread-explorer-favorites-dialog");
const threadExplorerFavoritesCloseButton = document.querySelector("#thread-explorer-favorites-close-button");
const threadExplorerFavoritesStatus = document.querySelector("#thread-explorer-favorites-status");
const threadExplorerFavoritesList = document.querySelector("#thread-explorer-favorites-list");
const savedSearchesDialog = document.querySelector("#saved-searches-dialog");
const savedSearchesTitle = document.querySelector("#saved-searches-title");
const savedSearchesCloseButton = document.querySelector("#saved-searches-close-button");
const savedSearchesNote = document.querySelector("#saved-searches-note");
const savedSearchUrlField = document.querySelector("#saved-search-url-field");
const savedSearchUrlInput = document.querySelector("#saved-search-url-input");
const savedSearchesActions = document.querySelector("#saved-searches-actions");
const savedSearchAddButton = document.querySelector("#saved-search-add-button");
const savedSearchesStatus = document.querySelector("#saved-searches-status");
const savedSearchesList = document.querySelector("#saved-searches-list");
const searchHashtagDialog = document.querySelector("#search-hashtag-dialog");
const searchHashtagCloseTop = document.querySelector("#search-hashtag-close-top");
const searchHashtagCloseButton = document.querySelector("#search-hashtag-close-button");
const searchHashtagDialogSlot = document.querySelector("#search-hashtag-dialog-slot");
const threadExplorerReactionsDialog = document.querySelector("#thread-explorer-reactions-dialog");
const threadExplorerReactionsCloseButton = document.querySelector("#thread-explorer-reactions-close-button");
const threadExplorerReactionsTitle = document.querySelector("#thread-explorer-reactions-title");
const threadExplorerReactionsStatus = document.querySelector("#thread-explorer-reactions-status");
const threadExplorerReactionsList = document.querySelector("#thread-explorer-reactions-list");
const threadExplorerRepliesDialog = document.querySelector("#thread-explorer-replies-dialog");
const threadExplorerRepliesCloseButton = document.querySelector("#thread-explorer-replies-close-button");
const threadExplorerRepliesTitle = document.querySelector("#thread-explorer-replies-title");
const threadExplorerRepliesStatus = document.querySelector("#thread-explorer-replies-status");
const threadExplorerRepliesList = document.querySelector("#thread-explorer-replies-list");
const threadExplorerGalleryDialog = document.querySelector("#thread-explorer-gallery-dialog");
const threadExplorerGalleryCloseButton = document.querySelector("#thread-explorer-gallery-close-button");
const threadExplorerGalleryCloseBottomButton = document.querySelector("#thread-explorer-gallery-close-bottom-button");
const threadExplorerGalleryTitle = document.querySelector("#thread-explorer-gallery-title");
const threadExplorerGalleryMain = document.querySelector(".thread-explorer-gallery-main");
const threadExplorerGalleryImage = document.querySelector("#thread-explorer-gallery-image");
const threadExplorerGalleryCaption = document.querySelector("#thread-explorer-gallery-caption");
const threadExplorerGalleryThumbs = document.querySelector("#thread-explorer-gallery-thumbs");
const threadExplorerGalleryOverlayCloseButton = document.querySelector("#thread-explorer-gallery-overlay-close-button");
const threadExplorerGalleryPrevButton = document.querySelector("#thread-explorer-gallery-prev-button");
const threadExplorerGalleryNextButton = document.querySelector("#thread-explorer-gallery-next-button");
const threadExplorerGalleryOverlayPrevButton = document.querySelector("#thread-explorer-gallery-overlay-prev-button");
const threadExplorerGalleryOverlayNextButton = document.querySelector("#thread-explorer-gallery-overlay-next-button");
const threadExplorerGalleryFullscreenButton = document.querySelector("#thread-explorer-gallery-fullscreen-button");
const threadExplorerSnapshotProgressDialog = document.querySelector("#thread-explorer-snapshot-progress-dialog");
const threadExplorerSnapshotProgressTitle = document.querySelector("#thread-explorer-snapshot-progress-title");
const threadExplorerSnapshotProgressStep = document.querySelector("#thread-explorer-snapshot-progress-step");
const threadExplorerSnapshotProgressBar = document.querySelector("#thread-explorer-snapshot-progress-bar");
const threadExplorerSnapshotProgressFill = document.querySelector("#thread-explorer-snapshot-progress-fill");
const threadExplorerSnapshotProgressDetail = document.querySelector("#thread-explorer-snapshot-progress-detail");
const threadExplorerSnapshotCancelButton = document.querySelector("#thread-explorer-snapshot-cancel-button");
const archiveScopeSelect = document.querySelector("#archive-scope-select");
const archiveSourceInput = document.querySelector("#archive-source-input");
const archiveSourceStatus = document.querySelector("#archive-source-status");
const archiveSourcePreview = document.querySelector("#archive-source-preview");
const archiveContentModeSelect = document.querySelector("#archive-content-mode-select");
const archiveYearWrap = document.querySelector("#archive-year-wrap");
const archiveYearInput = document.querySelector("#archive-year-input");
const archiveFromWrap = document.querySelector("#archive-from-wrap");
const archiveFromInput = document.querySelector("#archive-from-input");
const archiveToWrap = document.querySelector("#archive-to-wrap");
const archiveToInput = document.querySelector("#archive-to-input");
const archiveWaveSizeSelect = document.querySelector("#archive-wave-size-select");
const archiveConversationContextToggle = document.querySelector("#archive-conversation-context-toggle");
const archiveBandSizeSelect = document.querySelector("#archive-band-size-select");
const archiveImageSizeSelect = document.querySelector("#archive-image-size-select");
const archiveMetricsToggle = document.querySelector("#archive-metrics-toggle");
const archiveThreadsToggle = document.querySelector("#archive-threads-toggle");
const archivePdfIndentToggle = document.querySelector("#archive-pdf-indent-toggle");
const archiveThreadUrlInput = document.querySelector("#archive-thread-url-input");
const archiveThreadImportModeSelect = document.querySelector("#archive-thread-import-mode-select");
const archiveLoadThreadUrlButton = document.querySelector("#archive-load-thread-url-button");
const archiveCheckPostEditButton = document.querySelector("#archive-check-post-edit-button");
const archiveSavedSearchesButton = document.querySelector("#archive-saved-searches-button");
const archiveThreadUrlNote = document.querySelector("#archive-thread-url-note");
const archiveNextWaveButton = document.querySelector("#archive-next-wave-button");
const archiveExportZipButton = document.querySelector("#archive-export-zip-button");
const archiveExportHtmlButton = document.querySelector("#archive-export-html-button");
const archiveExportHtmlCompactButton = document.querySelector("#archive-export-html-compact-button");
const archiveExportPdfButton = document.querySelector("#archive-export-pdf-button");
const archiveActionsExportHtmlButton = document.querySelector("#archive-actions-export-html-button");
const archiveActionsExportHtmlCompactButton = document.querySelector("#archive-actions-export-html-compact-button");
const archiveActionsExportPdfButton = document.querySelector("#archive-actions-export-pdf-button");
const archiveZipHtmlScriptCommand = document.querySelector("#archive-zip-html-script-command");
const archiveZipHtmlScriptCopyButton = document.querySelector("#archive-zip-html-script-copy-button");
const archiveImportButton = document.querySelector("#archive-import-button");
const archiveResetButton = document.querySelector("#archive-reset-button");
const archiveMediaActorInput = document.querySelector("#archive-media-actor-input");
const archiveMediaImagesToggle = document.querySelector("#archive-media-images-toggle");
const archiveMediaVideosToggle = document.querySelector("#archive-media-videos-toggle");
const archiveMediaOtherToggle = document.querySelector("#archive-media-other-toggle");
const archiveExportMediaZipButton = document.querySelector("#archive-export-media-zip-button");
const dmContactSearchInput = document.querySelector("#dm-contact-search-input");
const dmContactList = document.querySelector("#dm-contact-list");
const dmContactSearchNote = document.querySelector("#dm-contact-search-note");
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
const dmSummaryItemTemplate = document.querySelector("#dm-summary-item-template");
const dmContactItemTemplate = document.querySelector("#dm-contact-item-template");
const dmResultItemTemplate = document.querySelector("#dm-result-item-template");
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
const networkAccountNote = document.querySelector("#network-account-note");
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
const analysisAccountAInput = document.querySelector("#analysis-account-a-input");
const analysisAccountBInput = document.querySelector("#analysis-account-b-input");
const analysisAccountANote = document.querySelector("#analysis-account-a-note");
const analysisAccountBNote = document.querySelector("#analysis-account-b-note");
const analysisAccountAOwnButton = document.querySelector("#analysis-account-a-own-button");
const analysisAccountBOwnButton = document.querySelector("#analysis-account-b-own-button");
const analysisAccountALoadButton = document.querySelector("#analysis-account-a-load-button");
const analysisAccountBLoadButton = document.querySelector("#analysis-account-b-load-button");
const analysisRangeSelect = document.querySelector("#analysis-range-select");
const analysisPostLimitSelect = document.querySelector("#analysis-post-limit-select");
const analysisIncludeRepliesToggle = document.querySelector("#analysis-include-replies-toggle");
const analysisIncludeQuotesToggle = document.querySelector("#analysis-include-quotes-toggle");
const analysisCompareButton = document.querySelector("#analysis-compare-button");
const analysisResetButton = document.querySelector("#analysis-reset-button");
const analysisExportPdfButton = document.querySelector("#analysis-export-pdf-button");
const analysisStatusLineNode = document.querySelector("#analysis-status-line");
const analysisSummary = document.querySelector("#analysis-summary");
const analysisResultCard = document.querySelector("#analysis-result-card");
const analysisTemporal = document.querySelector("#analysis-temporal");
const analysisNetwork = document.querySelector("#analysis-network");
const analysisMetrics = document.querySelector("#analysis-metrics");
const analysisPatterns = document.querySelector("#analysis-patterns");
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
let serviceWorkerRegistration = null;
let privacyPageNavigationInProgress = false;
let currentTipIndex = 0;
let tipsVisible = true;
let altTextRequired = true;
let imageAutoResizeMode = "off";
let archiveExpertMode = false;
let themeMode = "light";
let compactMode = false;
let composerReplyTarget = null;
const settingsSaveQueue = createAsyncTaskQueue();
const draftSaveQueue = createAsyncTaskQueue();
let sidebarCollapsedDesktop = false;
let sidebarWidthDesktop = DEFAULT_SIDEBAR_WIDTH_DESKTOP;
let composerWidthDesktop = DEFAULT_COMPOSER_WIDTH_DESKTOP;
let hashtags = [];
let selectedHashtags = [];
let searchSelectedHashtags = [];
let hashtagPlacement = "first";
let archiveSelectedHashtags = [];
let archiveHashtagScope = "thread";
let archiveSourceProfile = null;
let archiveSavedSearchId = "";


let postingHistory = [];
let currentComposedText = "";
let selectedPostLanguages = [];
let searchSelectedLanguages = [];
const MAX_SEARCH_LANGUAGES = 3;
const ACCOUNT_PICKER_AUTO_OPEN_MIN_LENGTH = 3;
let appendThreadIntro = false;
let appendThreadEmoji = false;
let addMarkerSpacing = false;
let lastPublishRateLimit = null;
let replyMode = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.replyMode;
let replyAllowFollowers = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.allowFollowers;
let replyAllowFollowing = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.allowFollowing;
let replyAllowMentioned = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.allowMentioned;
let quotePostsAllowed = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.quotePostsAllowed;
let segmentOverrides = null;
let composerLocked = false;
let composerPosted = false;
let composerInputWarningPendingTruncation = false;
let composerInputEventSuppressed = false;
let composerInputWasTruncated = false;
let shareStatusTimer = null;
let segmentImages = [];
let segmentLinkCards = [];
let segmentImageDragState = null;
let mentionSearchSegmentIndex = -1;
let mentionSearchOriginalHandle = "";
let mentionSearchContext = "mention";
let pendingLinkCardSegmentIndex = -1;
let pendingLinkCardSourceSegmentIndex = -1;
let pendingLinkCardUrl = "";
let pendingLinkCardAction = "create";
let linkCardProvider = "none";
let linkCardMicrolinkUsage = {
  date: "",
  count: 0,
};
const confirmDialogController = createQueuedConfirmDialogController({
  dialog: confirmDialog,
  title: confirmDialogTitle,
  message: confirmDialogMessage,
  confirmButton: confirmDialogConfirmButton,
  cancelButton: confirmDialogCancelButton,
  previewWrap: confirmDialogPreview,
}, (preview) => {
  setAvatarImage(confirmDialogAvatar, preview.avatar, preview.name || preview.handle || "");
  confirmDialogPreviewName.textContent = preview.name || preview.handle || "";
  if (preview.handle) {
    confirmDialogPreviewHandle.textContent = `@${preview.handle}`;
  } else {
    confirmDialogPreviewHandle.textContent = "";
  }
});
const accountPickerController = createAccountPickerController({
  dialog: mentionSearchDialog,
  eyebrow: mentionSearchDialogEyebrow,
  title: mentionSearchDialogTitle,
  note: mentionSearchDialogNote,
  status: mentionSearchStatus,
  results: mentionSearchResults,
  input: mentionSearchInput,
}, {
  translate: t,
  getDialogContext() {
    return mentionSearchContext;
  },
  setDialogContext(context) {
    mentionSearchContext = context;
  },
  clearMentionTarget() {
    mentionSearchSegmentIndex = -1;
    mentionSearchOriginalHandle = "";
  },
  resetSearchRequest() {
    composerMentionDialog.cancel();
  },
  runSearch(query) {
    void runMentionSearch(query);
  },
  closeDialog: closeMentionSearchDialog,
  autoOpenDelayMs: COMPOSER_MENTION_RESOLVE_DEBOUNCE_MS,
  minimumQueryLength: ACCOUNT_PICKER_AUTO_OPEN_MIN_LENGTH,
});
const hashtagController = createHashtagController({
  pane: hashtagsPane, cloud: hashtagCloud, selectionNote: hashtagSelectionNote,
  template: document.querySelector("#hashtag-item-template"), input: hashtagInput,
  placementSelect: hashtagPlacementSelect, placementLabel: hashtagPlacementLabel,
  archiveSlot: archiveHashtagSlot, archiveScope: archiveHashtagScopeWrap, archiveNote: archiveHashtagNote,
  archiveMode: archiveContentModeSelect, composerColumn, searchSlot: searchHashtagDialogSlot,
  searchDialog: searchHashtagDialog, searchMatch: searchTagMatchSelect,
  searchSummary: searchHashtagSummary, searchButton: searchHashtagButton,
  editInput: hashtagEditInput, editDialog: hashtagEditDialog,
}, {
  getState: () => ({ hashtags, selectedHashtags, searchSelectedHashtags, archiveSelectedHashtags, composerLocked }),
  setState: (next) => {
    if ("hashtags" in next) { hashtags = next.hashtags; }
    if ("selectedHashtags" in next) { selectedHashtags = next.selectedHashtags; }
    if ("searchSelectedHashtags" in next) { searchSelectedHashtags = next.searchSelectedHashtags; }
    if ("archiveSelectedHashtags" in next) { archiveSelectedHashtags = next.archiveSelectedHashtags; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
    if ("hashtagPlacement" in next) { hashtagPlacement = next.hashtagPlacement; }
  },
  getContext: () => {
    if (isArchiveHashtagContext()) { return "archive"; }
    if (isSearchHashtagContext()) { return "search"; }
    return "composer";
  },
  translate: t, persistSettings, persistArchive: persistArchivePreferences,
  renderSearch: renderSearchWorkspace, invalidateArchive: invalidateArchiveCatalog,
  setLocked: setComposerLocked, renderSegments, renderLock: updateComposerLockState,
  setStatus, formatCount, setVisibility: setElementVisibility, setText: setSafeText,
  defer: (callback, delay) => window.setTimeout(callback, delay),
});
const composerUiState = createComposerUiStateController({
  source: sourceText, counter: counterToggle, intro: threadIntroToggle, emoji: threadEmojiToggle,
  spacing: markerSpacingToggle, settings: postSettingsButton, clear: clearButton,
  hashtagInput, hashtagAdd: hashtagAddButton, hashtagPlacement: hashtagPlacementSelect,
  lockNote: composerLockNote, postedNote: composerPostedNote, hashtagsPane,
}, {
  getState: () => ({ locked: composerLocked, posted: composerPosted }),
  setState: (next) => {
    if ("locked" in next) { composerLocked = next.locked; }
    if ("posted" in next) { composerPosted = next.posted; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
  },
  isArchiveContext: isArchiveHashtagContext, isSearchContext: isSearchHashtagContext,
  renderHashtags: renderHashtagCloud,
});
const composerPostSettings = createComposerPostSettingsController({
  dialog: postLanguagesDialog, eyebrow: postLanguagesDialogEyebrow, title: postLanguagesDialogTitle,
  description: postLanguagesDialogDescription, settingsList: postLanguagesSettingsList,
  languageDisclosure: postLanguagesDisclosure, interactionDisclosure: postInteractionDisclosure,
  searchNote: searchLanguageDialogNote, search: postLanguagesSearch, list: postLanguagesList,
  selectionNote: postLanguagesSelectionNote, summary: postLanguagesSummary,
  languageMeta: postLanguagesDisclosureMeta, interactionMeta: postInteractionDisclosureMeta,
  everyone: replyModeEveryoneInput, nobody: replyModeNobodyInput, custom: replyModeCustomInput,
  followers: replyAllowFollowersInput, following: replyAllowFollowingInput, mentioned: replyAllowMentionedInput,
  quotes: quotePostsToggle, counter: counterToggle, intro: threadIntroToggle,
  emoji: threadEmojiToggle, spacing: markerSpacingToggle,
  optionTemplate: document.querySelector("#post-language-option-template"),
  emptyTemplate: document.querySelector("#post-language-empty-template"),
}, {
  getState: () => ({ selectedPostLanguages, searchSelectedLanguages, currentLocale, locked: composerLocked,
    interaction: { replyMode, allowFollowers: replyAllowFollowers, allowFollowing: replyAllowFollowing,
      allowMentioned: replyAllowMentioned, quotePostsAllowed } }),
  setState: (next) => {
    if ("selectedPostLanguages" in next) { selectedPostLanguages = next.selectedPostLanguages; }
    if ("searchSelectedLanguages" in next) { searchSelectedLanguages = next.searchSelectedLanguages; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
    if ("appendThreadIntro" in next) { appendThreadIntro = next.appendThreadIntro; }
    if ("appendThreadEmoji" in next) { appendThreadEmoji = next.appendThreadEmoji; }
    if ("addMarkerSpacing" in next) { addMarkerSpacing = next.addMarkerSpacing; }
    if ("interaction" in next) {
      replyMode = next.interaction.replyMode;
      replyAllowFollowers = next.interaction.allowFollowers;
      replyAllowFollowing = next.interaction.allowFollowing;
      replyAllowMentioned = next.interaction.allowMentioned;
      quotePostsAllowed = next.interaction.quotePostsAllowed;
    }
  },
  translate: t, normalizeLanguages: normalizePostLanguageTags, inferLanguages: inferDefaultPostLanguages,
  displayLanguage: getPostLanguageDisplayName, languageOptions: getPostLanguageOptions,
  searchLimit: MAX_SEARCH_LANGUAGES, persist: persistSettings, renderSegments,
  renderSearchLanguages: renderSearchLanguageSummary, renderSearchSummary: renderSearchWorkspace,
  enforceSearchSort: enforceSearchSortConstraints, setLocked: setComposerLocked,
  setPosted: setComposerPosted, renderReply: renderReplyTargetCard, saveDraft: queueDraftSave,
  defer: (callback, delay) => window.setTimeout(callback, delay),
});
const composerPublishAvailability = createComposerPublishAvailabilityController({
  button: publishButton, warning: publishWarning,
}, {
  getOptions: () => ({ sourceText: sourceText.value, composedText: currentComposedText, activeSegments,
    countGraphemes, getMetrics: getPostTextMetrics, getSegments: getSegmentPayloads,
    composerLimit: MAX_COMPOSER_GRAPHEME_LENGTH, postLimit: MAX_POST_LENGTH, byteLimit: MAX_POST_UTF8_BYTES,
    altTextRequired, autoResize: isImageAutoResizeEnabled() }),
  translate: t, updateInputWarning: updateComposerInputWarning,
});
const composerRateLimitPresentation = createComposerRateLimitPresentation(publishRateLimitNote, {
  translate: t,
  formatTime: (timestamp) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp),
});
const settingsBackupCodec = createSettingsBackupCodec({
  File, Blob, Response, CompressionStream: globalThis.CompressionStream,
  DecompressionStream: globalThis.DecompressionStream,
  encode: (text) => new TextEncoder().encode(text), decode: (bytes) => new TextDecoder().decode(bytes),
  toBase64: bytesToBase64, fromBase64: base64ToBytes, translate: t,
});
const settingsBackupReminder = createSettingsBackupReminder({
  status: backupStatus, dialog: backupReminderDialog, message: backupReminderMessage,
}, {
  storage: window.localStorage, now: Date.now, translate: t,
  hasOpenDialog: () => Boolean(document.querySelector("dialog[open]")),
  clearTimer: (timer) => window.clearTimeout(timer), setTimer: (callback, delay) => window.setTimeout(callback, delay),
  warn: (...args) => console.warn(...args), report: (error) => console.error(error), exportFile: exportSettingsBackup,
  exportKey: SETTINGS_BACKUP_EXPORTED_AT_STORAGE_KEY, dismissKey: SETTINGS_BACKUP_REMINDER_DISMISSED_AT_STORAGE_KEY,
  intervalMs: SETTINGS_BACKUP_REMINDER_INTERVAL_MS, snoozeMs: SETTINGS_BACKUP_REMINDER_SNOOZE_MS,
});
const settingsBackup = createSettingsBackupController({
  placement: hashtagPlacementSelect, intro: threadIntroToggle, emoji: threadEmojiToggle, spacing: markerSpacingToggle,
  resize: imageAutoResizeSelect, expert: archiveExpertModeToggle, proxyEndpoint: linkCardEndpointInput,
  proxySecret: linkCardSecretInput, locale: languageSelect,
}, {
  codec: settingsBackupCodec, getSettings: getSettingsSnapshot,
  getState: () => ({ localePreference, hashtags, selectedHashtags, searchSelectedHashtags, postingHistory, savedAccounts, accountAvatarAssets,
    dmRecentContacts, dmRecentConversations, dmRecentContactAssets, dmPartnerCacheAccountDid, dmPartnerCacheUpdatedAt }),
  setState: (next) => {
    if ("hashtags" in next) { hashtags = next.hashtags; }
    if ("selectedHashtags" in next) { selectedHashtags = next.selectedHashtags; }
    if ("searchSelectedHashtags" in next) { searchSelectedHashtags = next.searchSelectedHashtags; }
    if ("postingHistory" in next) { postingHistory = next.postingHistory; }
    if ("threadExplorerFavorites" in next) { threadExplorerFavorites = next.threadExplorerFavorites; }
    if ("savedSearches" in next) { savedSearches = next.savedSearches; }
    if ("hashtagPlacement" in next) { hashtagPlacement = next.hashtagPlacement; }
    if ("tipsVisible" in next) { tipsVisible = next.tipsVisible; }
    if ("altTextRequired" in next) { altTextRequired = next.altTextRequired; }
    if ("imageAutoResizeMode" in next) { imageAutoResizeMode = next.imageAutoResizeMode; }
    if ("archiveExpertMode" in next) { archiveExpertMode = next.archiveExpertMode; }
    if ("themeMode" in next) { themeMode = next.themeMode; }
    if ("compactMode" in next) { compactMode = next.compactMode; }
    if ("sidebarCollapsedDesktop" in next) { sidebarCollapsedDesktop = next.sidebarCollapsedDesktop; }
    if ("sidebarWidthDesktop" in next) { sidebarWidthDesktop = next.sidebarWidthDesktop; }
    if ("composerWidthDesktop" in next) { composerWidthDesktop = next.composerWidthDesktop; }
    if ("selectedPostLanguages" in next) { selectedPostLanguages = next.selectedPostLanguages; }
    if ("appendThreadIntro" in next) { appendThreadIntro = next.appendThreadIntro; }
    if ("appendThreadEmoji" in next) { appendThreadEmoji = next.appendThreadEmoji; }
    if ("addMarkerSpacing" in next) { addMarkerSpacing = next.addMarkerSpacing; }
    if ("linkCardProvider" in next) { linkCardProvider = next.linkCardProvider; }
    if ("linkCardMicrolinkUsage" in next) { linkCardMicrolinkUsage = next.linkCardMicrolinkUsage; }
    if ("localePreference" in next) { localePreference = next.localePreference; }
    if ("currentLocale" in next) { currentLocale = next.currentLocale; }
    if ("savedAccounts" in next) { savedAccounts = next.savedAccounts; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
  },
  normalize: { hashtags: normalizeHashtagEntries, mergeHashtags: mergeHashtagEntries, selection: normalizeSelectedHashtagEntries,
    history: mergePostingHistoryEntries, favorites: normalizeThreadExplorerFavorites, searches: normalizeSavedSearches,
    placement: normalizeHashtagPlacement, resize: normalizeImageAutoResizeMode, layout: normalizeStoredDesktopLayout,
    languages: normalizePostLanguageTags, provider: normalizeLinkCardProvider, usage: normalizeMicrolinkUsage },
  translate: t, now: () => new Date().toISOString(), version: CURRENT_VERSION_INFO, supportedLocales: SUPPORTED_LOCALES,
  detectLocale: detectBrowserLocale, request: sendToServiceWorker, share: shareOrDownloadFile,
  markExported: settingsBackupReminder.markExported, status: settingsBackupReminder.status,
  applySearch: applySearchPreferences, persistAppearance: persistAppearancePreferences,
  applyInteraction: applyPostInteractionSettings, syncProvider: syncLinkCardProviderUi,
  applyArchive: applyArchivePreferences, restoreAnalysis: restorePersistedAnalysisState,
  applyLayout: applyDesktopLayoutState, applySidebar: applySidebarState,
  applyAvatarCache: applyAccountAvatarCache, applyDmCache: applyDmPartnerCache,
  persist: persistSettings, translateUi: applyTranslations, applyTheme, applyDensity: applyCompactMode,
  renderAccounts: renderAccountSwitcher, setLocked: setComposerLocked, renderSegments,
});
const { splitIntoSegments, buildComposedText } = createComposerTextService({
  splitIntoGraphemes, createPostTextLimit, fitsPostTextLimit, getPostTextMetrics,
  tokenizeText, trimSegment, getThreadIntroText, getSelectedHashtagText,
  getHashtagPlacement: () => hashtagPlacement,
  MANUAL_SPLIT_MARKER, MAX_POST_LENGTH, MAX_POST_UTF8_BYTES,
});
const composerMentionResolver = createComposerMentionResolver({ sendToServiceWorker });
const {
  getImageEditorCanvasDimensions, isPortraitEditorImage, getEditedImageExportDimensions,
  getImagePreviewFrameDimensions, getContainedPreviewBox, getImageMetrics, clampImageEditToFrame,
} = createComposerImageGeometry({
  normalizeImageEdit, isImageUsingDefaultEdit, clamp,
  IMAGE_EDITOR_CANVAS_WIDTH, IMAGE_EDITOR_CANVAS_HEIGHT, IMAGE_EXPORT_WIDTH,
});
const {
  fileToDataUrl, createThreadImageFromFile, loadImageBitmapForDataUrl,
  renderPreviewCanvas, renderImageToBlob, validateThreadImage, prepareImageForUpload,
} = createComposerImageProcessing({
  createImage: () => new Image(), createFileReader: () => new FileReader(),
  fetchData: (url) => fetch(url), createImageBitmap: (blob) => createImageBitmap(blob),
  createId: () => crypto.randomUUID(), createCanvas: () => document.createElement("canvas"),
  getDevicePixelRatio: () => window.devicePixelRatio,
  normalizeThreadImage, createDefaultImageEdit, normalizeImageEdit, isImageUsingDefaultEdit,
  hasExplicitImageUploadTransform, normalizeImageAutoResizeMode,
  getAutoResizeMode: () => imageAutoResizeMode,
  getImageEditorCanvasDimensions, getEditedImageExportDimensions, getImageMetrics,
  renderComposerImageToCanvas, t, IMAGE_MIN_EXPORT_SCALE, IMAGE_MAX_DIMENSION, IMAGE_BLOB_LIMIT,
});
const { schedule: scheduleImageValidation } = createComposerImageValidationController({
  getImages: () => segmentImages, validateImage: validateThreadImage,
  render: () => preserveScrollPosition(() => renderSegments({ preserveOverrides: true })),
  reportError: (error) => console.error(error),
});
const composerImageEditor = createComposerImageEditorController({
  dialog: imageEditorDialog, sheet: imageEditorSheet, canvas: imageEditorCanvas,
  zoomInput: imageZoomInput, status: imageEditorStatus,
  fitDimensionsButton: imageFitDimensionsButton, lossyResizeButton: imageLossyResizeButton,
}, {
  getImages: () => segmentImages, normalizeImageEdit, getImageEditorCanvasDimensions,
  clampImageEditToFrame, loadImageBitmapForDataUrl, isPortraitEditorImage,
  formatImageSize, t, IMAGE_BLOB_LIMIT, IMAGE_MIN_EXPORT_SCALE, IMAGE_MAX_DIMENSION,
  getImageMetrics, drawComposerImageEditor, validateThreadImage, persistSettings,
  preserveScrollPosition, renderSegments, queueDraftSave, createDefaultImageEdit, renderImageToBlob,
  getMetricsController: () => composerImageEditorMetrics,
  getDragController: () => composerImageEditorDrag,
});
const composerImageEditorDrag = createComposerImageEditorDragController({
  getDraft: composerImageEditor.getDraft, setDraft: composerImageEditor.setDraft,
  getImage: composerImageEditor.getImage, clamp: composerImageEditor.clamp, draw: composerImageEditor.draw,
});
const composerImageEditorMetrics = createComposerImageEditorMetricsController({
  originalDimensions: imageEditorOriginalDimensions, originalSize: imageEditorOriginalSize,
  exportDimensions: imageEditorExportDimensions, exportSize: imageEditorExportSize,
}, {
  getImage: composerImageEditor.getImage, getDraftImage: composerImageEditor.getDraftImage,
  formatDimensions: composerImageEditor.formatDimensions, formatSize: formatImageSize,
  minScale: IMAGE_MIN_EXPORT_SCALE, isDefaultEdit: isImageUsingDefaultEdit,
  getExportDimensions: getEditedImageExportDimensions, renderBlob: renderImageToBlob,
  translate: t, updateActions: composerImageEditor.updateActions,
  clearTimer: (timer) => window.clearTimeout(timer), setTimer: (callback, delay) => window.setTimeout(callback, delay),
});
const composerAltTextDialog = createComposerAltTextDialogController({
  dialog: altTextDialog, input: altTextInput, count: altTextCount,
  previewWrap: altTextPreviewWrap, canvas: altTextPreviewCanvas,
}, {
  maxLength: MAX_ALT_TEXT_LENGTH,
  getImage: (segmentIndex, imageIndex) => segmentImages[segmentIndex]?.[imageIndex],
  getPreviewFrame: getImagePreviewFrameDimensions,
  getContainedBox: getContainedPreviewBox,
  renderCanvas: renderPreviewCanvas,
  defer: (callback) => window.setTimeout(callback, 0),
  persist: persistSettings,
  updateCard: (segmentIndex, imageIndex) => updateComposerImageAltDisplay(
    segmentImages[segmentIndex]?.[imageIndex],
    segmentsList.querySelector(`.segment-image-card[data-segment-index="${segmentIndex}"][data-image-index="${imageIndex}"]`), t,
  ),
  updatePublish: updatePublishAvailability,
  saveDraft: queueDraftSave,
});
const composerImageCollection = createComposerImageCollectionController({
  getImages: () => segmentImages,
  setImages: (images) => { segmentImages = images; },
  setSegment: (index, images) => { segmentImages[index] = images; },
  hasLinkCard: (index) => Boolean(normalizeLinkCard(segmentLinkCards[index])),
  maxImages: MAX_IMAGES_PER_SEGMENT,
  translate: t, setStatus,
  createImage: createThreadImageFromFile,
  validate: scheduleImageValidation,
  persist: persistSettings,
  render: () => preserveScrollPosition(() => renderSegments({ preserveOverrides: true })),
  saveDraft: queueDraftSave,
});
const composerPublishResults = createComposerPublishResultHandlers({
  setRateLimit: (value) => { lastPublishRateLimit = normalizePublishRateLimit(value); },
  record: recordPublishedThread,
  clearReply: clearComposerReplyTarget,
  setPosted: setComposerPosted,
  saveDraft: queueDraftSave,
  translate: t,
  setStatus,
  showResult: showPublishResult,
  reportError: (error) => console.error(error),
  formatError: buildPublishErrorMessage,
  showError: showErrorDialog,
});
const composerReplyHandoff = createComposerReplyHandoff({
  normalize: normalizeReplyTarget,
  getStorage: () => window.sessionStorage,
  getHref: () => window.location.href,
  replaceUrl: (href) => window.history.replaceState({}, document.title, href),
  queryKey: PENDING_COMPOSER_REPLY_TARGET_QUERY_KEY,
  storageKey: PENDING_COMPOSER_REPLY_TARGET_SESSION_KEY,
});
const composerReplyDialog = createComposerReplyTargetDialogController({
  dialog: replyTargetDialog, input: replyTargetUrlInput, status: replyTargetStatus, submit: replyTargetSubmitButton,
}, { translate: t, setBusy, resolve: resolveComposerReplyTarget, setStatus, reportError: (error) => console.error(error) });
const composerReplyController = createComposerReplyTargetController({
  request: (url, mode) => requestReplyTarget(sendToServiceWorker, url, mode),
  normalize: normalizeReplyTarget, getAccountDid: () => authAccountDid,
  confirm: openConfirmDialog, translate: t,
  setTarget: (target) => { composerReplyTarget = target; }, getTarget: () => composerReplyTarget,
  persistPending: persistPendingComposerReplyTarget, resetDialog: composerReplyDialog.reset,
  refresh: () => {
    renderReplyTargetCard();
    publishButton.textContent = getPublishButtonLabel();
    updatePublishAvailability();
  }, saveDraft: queueDraftSave,
});
const composerProviderUsage = createComposerProviderUsageController({
  getUsage: () => linkCardMicrolinkUsage,
  setUsage: (usage) => { linkCardMicrolinkUsage = usage; },
  getToday: () => new Date().toISOString().slice(0, 10),
  limit: MICROLINK_DAILY_LIMIT, persist: persistSettings,
});
const composerProxySettings = createComposerProxySettingsController({
  endpoint: linkCardEndpointInput, secret: linkCardSecretInput, status: linkCardSettingsStatus,
}, { translate: t, syncProvider: syncLinkCardProviderUi });
const composerProviderAvailability = createComposerProviderAvailabilityController({
  providers: { none: LINK_CARD_PROVIDER_NONE, microlink: LINK_CARD_PROVIDER_MICROLINK, proxy: LINK_CARD_PROVIDER_PROXY },
  getProvider: () => linkCardProvider, normalizeProvider: normalizeLinkCardProvider,
  isProxyConfigured: composerProxySettings.isConfigured, canUseMicrolink: composerProviderUsage.canUse,
});
const composerProviderPresentation = createComposerProviderPresentationController({
  noneWrap: linkCardProviderNoneWrap, proxyWrap: linkCardProviderProxyWrap,
  noneInput: linkCardProviderNoneInput, microlinkInput: linkCardProviderMicrolinkInput,
  proxyInput: linkCardProviderProxyInput, settingsNote: linkCardProviderNote,
  dialogNote: linkCardProviderState,
}, {
  providers: { none: LINK_CARD_PROVIDER_NONE, microlink: LINK_CARD_PROVIDER_MICROLINK, proxy: LINK_CARD_PROVIDER_PROXY },
  getProvider: () => linkCardProvider,
  setProvider: (provider) => { linkCardProvider = provider; },
  getActiveProvider: getActiveLinkCardProvider, normalizeProvider: normalizeLinkCardProvider,
  isProxyConfigured: isLinkCardProxyConfigured, getUsage: composerProviderUsage.state,
  getAction: () => pendingLinkCardAction, limit: MICROLINK_DAILY_LIMIT,
  translate: t, persist: persistSettings,
});
const composerLinkCardDialog = createComposerLinkCardDialogController({
  dialog: linkCardDialog, title: linkCardDialogTitle, description: linkCardUrlNode,
  urlField: linkCardUrlField, input: linkCardUrlInput,
  targetField: linkCardTargetListField, targetList: linkCardTargetList,
  warning: linkCardWarning, status: linkCardStatus, submit: linkCardCreateButton,
}, {
  translate: t, renderTargets: renderLinkCardTargetList,
  updateProvider: updateLinkCardDialogProviderState,
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
});
const composerLinkCardSubmission = createComposerLinkCardSubmissionController({
  input: linkCardUrlInput, status: linkCardStatus, submit: linkCardCreateButton,
}, {
  getPending: () => ({ segmentIndex: pendingLinkCardSegmentIndex, sourceSegmentIndex: pendingLinkCardSourceSegmentIndex,
    url: pendingLinkCardUrl, action: pendingLinkCardAction }),
  setPendingUrl: (url) => { pendingLinkCardUrl = url; },
  getImages: () => segmentImages, getCards: () => segmentLinkCards,
  normalizeCard: normalizeLinkCard, validateUrl: validateLinkCardTargetUrl, translate: t,
  setBusy, request: requestLinkCard, syncProvider: syncLinkCardProviderUi,
  persist: persistSettings,
  render: () => preserveScrollPosition(() => renderSegments({ preserveOverrides: true })),
  saveDraft: queueDraftSave, setStatus, close: closeLinkCardDialog,
  reportError: (error) => console.error(error),
});
const composerInputWarnings = createComposerInputWarningController({
  source: sourceText,
  note: composerInputWarning,
  count: countGraphemes,
  getLocale: () => currentLocale,
  limit: MAX_COMPOSER_GRAPHEME_LENGTH,
  isTruncated: () => composerInputWasTruncated,
  translate: t,
  now: () => Date.now(),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (timer) => window.clearTimeout(timer),
  showDialog: showErrorDialog,
});
const composerRenderScheduler = createComposerRenderScheduler({
  render: renderSegments,
  resize: resizeAllSegmentTextareas,
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (timer) => window.clearTimeout(timer),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (frame) => cancelAnimationFrame(frame),
});
const composerInputController = createComposerInputController(sourceText, {
  clamp: clampComposerTextLength,
  count: countGraphemes,
  split: splitIntoGraphemes,
  limit: MAX_COMPOSER_GRAPHEME_LENGTH,
  setTruncated: (value) => { composerInputWasTruncated = value; },
  updateWarning: updateComposerInputWarning,
  clearOverrides: () => { segmentOverrides = null; },
  setLocked: setComposerLocked,
  setPosted: setComposerPosted,
  scheduleRender: scheduleComposerSegmentRender,
  delayMs: COMPOSER_SEGMENT_RENDER_DEBOUNCE_MS,
  saveDraft: queueDraftSave,
  showAlert: composerInputWarnings.alert,
  setWarningPending: (value) => { composerInputWarningPendingTruncation = value; },
  suppressInput: () => { composerInputEventSuppressed = true; },
});
const composerInputEvents = createComposerInputEventHandlers({
  isSuppressed: () => composerInputEventSuppressed,
  setSuppressed: (value) => { composerInputEventSuppressed = value; },
  isWarningPending: () => composerInputWarningPendingTruncation,
  setWarningPending: (value) => { composerInputWarningPendingTruncation = value; },
  process: composerInputController.process,
  insert: composerInputController.insert,
});
const composerLengthPresentation = createComposerLengthPresentationController({
  getDiagnostics: getSegmentLengthDiagnostics,
  formatLabel: formatSegmentLengthLabel,
  translate: t,
  graphemeLimit: MAX_POST_LENGTH,
  byteLimit: MAX_POST_UTF8_BYTES,
  warning: composerLengthWarning,
});
const composerMentionDisplay = createComposerMentionDisplayController({
  templates: {
    label: document.querySelector("#segment-mention-label-template"),
    resolved: document.querySelector("#segment-mention-resolved-template"),
    unresolved: document.querySelector("#segment-mention-unresolved-template"),
    sync: document.querySelector("#segment-mention-sync-template"),
  },
  translate: t,
  resolve: (handles) => composerMentionResolver.resolve(handles),
  getVersion: () => composerSegmentRenderer.getMentionVersion(),
  profileUrl: buildComposerMentionProfileUrl,
  suggest: findComposerMentionSuggestion,
  applyTranslatedTitle,
  openSearch: openMentionSearchDialog,
  getPending: (index, text) => composerMentionSourceSync.getPending(index, sourceText?.value || "", text),
  applySync: applyMentionSourceSync,
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (timer) => window.clearTimeout(timer),
  delayMs: COMPOSER_MENTION_RESOLVE_DEBOUNCE_MS,
});
const composerMentionSourceSync = createComposerMentionSourceSyncController({
  containsHandle: textContainsComposerMentionHandleFromData,
  replaceHandle: replaceComposerMentionHandleFromData,
});
const composerMentionSourceCorrection = createComposerMentionSourceCorrectionController({
  sync: composerMentionSourceSync, resolver: composerMentionResolver,
  getSource: () => String(sourceText?.value || ""),
  setSource: (text) => { if (sourceText) { sourceText.value = text; } },
  setLocked: setComposerLocked, setPosted: setComposerPosted,
  render: renderSegments, saveDraft: queueDraftSave,
});
const composerMentionDialog = createComposerMentionDialogController({
  dialog: mentionSearchDialog, eyebrow: mentionSearchDialogEyebrow,
  title: mentionSearchDialogTitle, note: mentionSearchDialogNote,
  status: mentionSearchStatus, results: mentionSearchResults, input: mentionSearchInput,
}, {
  translate: t, search: runMentionSearch,
  setTarget(target) {
    mentionSearchContext = target.context;
    mentionSearchSegmentIndex = target.segmentIndex;
    mentionSearchOriginalHandle = target.originalHandle;
  },
  clearTimeout: (timer) => window.clearTimeout(timer),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  delayMs: COMPOSER_MENTION_RESOLVE_DEBOUNCE_MS,
});
const composerLinkCardPreview = createComposerLinkCardPreviewRenderer(
  document.querySelector("#composer-link-card-preview-template"), {
    getCard: (index) => segmentLinkCards[index], normalize: normalizeLinkCard,
    getFooterLabel: getPublicationCardFooterLabel, translate: t,
    setCard: (index, card) => { segmentLinkCards[index] = card; },
    persist: persistSettings, preserveScroll: preserveScrollPosition,
    renderSegments, saveDraft: queueDraftSave,
  },
);
const composerLinkCardRequests = createComposerLinkCardRequestController({
  getSettings: getLinkCardSettings, validateProxy: updateLinkCardSettingsStatus,
  canUseMicrolink: canUseMicrolinkToday, translate: t,
  proxy: {
    now: () => Date.now(), randomUUID: () => crypto.randomUUID(),
    sign: (target, timestamp, nonce, key) => signComposerLinkCardRequest(target, timestamp, nonce, key, crypto.subtle),
    fetch: (target, options) => fetch(target, options),
    getErrorMessage: (response, payload) => getComposerLinkCardProxyErrorMessage(response, payload, t),
    normalize: normalizeLinkCard, imageToDataUrl: composerLinkCardImageToDataUrl,
  },
  microlink: {
    fetch: (target, options) => fetch(target, options), recordUsage: recordMicrolinkUsageAttempt,
    getErrorMessage: (response, payload) => getComposerMicrolinkErrorMessage(response, payload, t),
    fetchImage: fetchLinkCardImageDataUrl, normalize: normalizeLinkCard,
  },
});
const composerMentionSearchActions = createComposerMentionSearchActions({
  dialog: mentionSearchDialog,
  input: mentionSearchInput,
  status: mentionSearchStatus,
  results: mentionSearchResults,
  eyebrow: mentionSearchDialogEyebrow,
  title: mentionSearchDialogTitle,
  note: mentionSearchDialogNote,
}, {
  translate: t,
  resetPicker: () => accountPickerController.reset(),
  resetSearchState() {
    composerMentionDialog.cancel();
    mentionSearchSegmentIndex = -1;
    mentionSearchOriginalHandle = "";
    mentionSearchContext = "mention";
  },
  getTarget: () => ({ segmentIndex: mentionSearchSegmentIndex, originalHandle: mentionSearchOriginalHandle }),
  getSegments: () => activeSegments,
  setSegments(segments) {
    activeSegments = segments;
    segmentOverrides = normalizeSegmentOverrides(segments);
  },
  sourceSync: composerMentionSourceSync,
  resolver: composerMentionResolver,
  setLocked: setComposerLocked,
  setPosted: setComposerPosted,
  render: renderSegments,
  saveDraft: queueDraftSave,
});
const composerSegmentRenderer = createComposerSegmentRenderer({
  sourceText, counterToggle, threadIntroToggle, threadEmojiToggle, markerSpacingToggle,
  characterCount, segmentSummary, segmentsPane, segmentsList, segmentTemplate,
  helpTemplate: document.querySelector("#composer-segment-help-template"),
}, {
  document,
  getState: () => ({ activeSegments, segmentOverrides, hashtagPlacement, segmentImages, segmentLinkCards }),
  setState(next) {
    if ("activeSegments" in next) { activeSegments = next.activeSegments; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
    if ("appendThreadIntro" in next) { appendThreadIntro = next.appendThreadIntro; }
    if ("appendThreadEmoji" in next) { appendThreadEmoji = next.appendThreadEmoji; }
    if ("addMarkerSpacing" in next) { addMarkerSpacing = next.addMarkerSpacing; }
    if ("currentComposedText" in next) { currentComposedText = next.currentComposedText; }
  },
  clearMentionSync: () => composerMentionSourceSync.clear(),
  getDragState: () => segmentImageDragState,
  buildComposedText, getSelectedHashtagText, splitIntoSegments, normalizeSegmentOverrides,
  syncSegmentImages, syncSegmentLinkCards, formatComposerCharacterCount, t,
  updateComposerLengthWarning, normalizeLinkCard, getFirstHttpUrl, MAX_IMAGES_PER_SEGMENT,
  eventHasTransferFiles, getDroppedImageFiles, handleSegmentImageSelection,
  updateSegmentLengthPresentation, scheduleSegmentMentionDisplayUpdate, setComposerLocked,
  setComposerPosted, updatePublishAvailability, queueDraftSave, autoSizeTextarea,
  openInlineHelpTopic, openLinkCardDialog, canCreateLinkCardsWithCurrentProvider,
  getLinkCardTargetEntries, renderSegmentLinkCard, renderSegmentImages,
  updateSegmentMentionDisplay, scheduleSegmentTextareaResize,
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
});
const composerThreadFileCodec = createComposerThreadFileCodec({
  File, Blob, Response,
  CompressionStream: globalThis.CompressionStream, DecompressionStream: globalThis.DecompressionStream,
});
const composerDocument = createComposerDocumentController({
  sourceText, counterToggle, threadIntroToggle, threadEmojiToggle, markerSpacingToggle,
  languageSelect, hashtagPlacementSelect, importInput: threadImportInput,
}, {
  getState: () => ({
    appendThreadIntro, appendThreadEmoji, addMarkerSpacing, localePreference, hashtagPlacement,
    hashtags, selectedHashtags, segmentImages, segmentLinkCards, segmentOverrides, composerReplyTarget,
  }),
  setState(next) {
    if ("appendThreadIntro" in next) { appendThreadIntro = next.appendThreadIntro; }
    if ("appendThreadEmoji" in next) { appendThreadEmoji = next.appendThreadEmoji; }
    if ("addMarkerSpacing" in next) { addMarkerSpacing = next.addMarkerSpacing; }
    if ("selectedPostLanguages" in next) { selectedPostLanguages = next.selectedPostLanguages; }
    if ("localePreference" in next) { localePreference = next.localePreference; }
    if ("currentLocale" in next) { currentLocale = next.currentLocale; }
    if ("hashtags" in next) { hashtags = next.hashtags; }
    if ("selectedHashtags" in next) { selectedHashtags = next.selectedHashtags; }
    if ("hashtagPlacement" in next) { hashtagPlacement = next.hashtagPlacement; }
    if ("segmentOverrides" in next) { segmentOverrides = next.segmentOverrides; }
    if ("segmentImages" in next) { segmentImages = next.segmentImages; }
    if ("segmentLinkCards" in next) { segmentLinkCards = next.segmentLinkCards; }
    if ("activeSegments" in next) { activeSegments = next.activeSegments; }
  },
  codec: composerThreadFileCodec, version: CURRENT_VERSION_INFO, now: () => new Date().toISOString(),
  getSegments: getSegmentPayloads, getInteraction: getCurrentPostInteractionSettings,
  getLinkCardSettings, getLanguages: getNormalizedPostLanguagesOrDefault,
  normalizeImages: normalizeSegmentImages, normalizeLinkCard, normalizeLinkCards: normalizeSegmentLinkCards,
  normalizeHashtags: normalizeHashtagEntries, normalizeSelectedHashtags: normalizeSelectedHashtagEntries,
  normalizePlacement: normalizeHashtagPlacement, normalizeOverrides: normalizeSegmentOverrides,
  normalizeLanguages: normalizePostLanguageTags, supportedLocales: SUPPORTED_LOCALES, detectLocale: detectBrowserLocale,
  applyInteraction: applyPostInteractionSettings, confirm: openConfirmDialog,
  translate: t, setStatus, setLocked: setComposerLocked, setPosted: setComposerPosted,
  persistSettings, applyTranslations, renderHashtags: renderHashtagCloud, renderSegments,
  validateImages: scheduleImageValidation, share: shareOrDownloadFile,
  clearReply: clearComposerReplyTarget, renderReply: renderReplyTargetCard,
  updatePublishLabel: () => { publishButton.textContent = getPublishButtonLabel(); },
  enqueueDraft: (task) => draftSaveQueue.enqueue(task),
  saveDraft: (payload) => sendToServiceWorker("SAVE_DRAFT", payload, { timeoutMs: 120000 }),
  reportError: (error) => console.error(error),
  clearTimer: (timer) => window.clearTimeout(timer), setTimer: (callback, delay) => window.setTimeout(callback, delay),
});
const dmArchiveController = createDmArchiveController({
  getState() {
    return {
      accessChecked: dmAccessChecked,
      catalog: dmCatalog,
      from: dmFromInput?.value || "",
      partnerCacheAccountDid: dmPartnerCacheAccountDid,
      partnerCacheUpdatedAt: dmPartnerCacheUpdatedAt,
      recentContacts: dmRecentContacts,
      recentConversations: dmRecentConversations,
      recentContactAssets: dmRecentContactAssets,
      selectedParticipantDids: dmSelectedParticipantDids,
      to: dmToInput?.value || "",
    };
  },
  setState(nextState) {
    if (Object.hasOwn(nextState, "accessChecked")) {
      dmAccessChecked = nextState.accessChecked === true;
    }
    if (Object.hasOwn(nextState, "catalog")) {
      dmCatalog = nextState.catalog || null;
    }
    if (Object.hasOwn(nextState, "partnerCacheAccountDid")) {
      dmPartnerCacheAccountDid = String(nextState.partnerCacheAccountDid || "");
    }
    if (Object.hasOwn(nextState, "partnerCacheUpdatedAt")) {
      dmPartnerCacheUpdatedAt = String(nextState.partnerCacheUpdatedAt || "");
    }
    if (Object.hasOwn(nextState, "recentContacts")) {
      dmRecentContacts = Array.isArray(nextState.recentContacts) ? nextState.recentContacts : [];
    }
    if (Object.hasOwn(nextState, "recentConversations")) {
      dmRecentConversations = Array.isArray(nextState.recentConversations) ? nextState.recentConversations : [];
    }
    if (Object.hasOwn(nextState, "recentContactAssets")) {
      dmRecentContactAssets = Array.isArray(nextState.recentContactAssets) ? nextState.recentContactAssets : [];
    }
    if (Object.hasOwn(nextState, "selectedParticipantDids")) {
      dmSelectedParticipantDids = Array.isArray(nextState.selectedParticipantDids) ? nextState.selectedParticipantDids : [];
    }
  },
  translate: t,
  assertAccess: assertDmAccessUnlocked,
  getAuthAccount() {
    return authAccount;
  },
  getAuthAccountDid() {
    return authAccountDid;
  },
  sendRequest: sendToServiceWorker,
  setProgress: setDmProgress,
  renderWorkspace: renderDmWorkspace,
  savePartnerCache: saveDmPartnerCache,
});
const dmArchiveWorkspaceRenderer = createDmArchiveWorkspaceRenderer({
  launchPanel: dmLaunchPanel,
  contactSearchInput: dmContactSearchInput,
  contactList: dmContactList,
  contactSearchNote: dmContactSearchNote,
  contactSelectionNote: dmContactSelectionNote,
  summary: dmSummary,
  results: dmResults,
  checkButton: dmCheckButton,
  loadPartnersButton: dmLoadPartnersButton,
  loadButton: dmLoadButton,
  exportJsonButton: dmExportJsonButton,
  exportHtmlButton: dmExportHtmlButton,
  exportPdfButton: dmExportPdfButton,
  summaryItemTemplate: dmSummaryItemTemplate,
  contactItemTemplate: dmContactItemTemplate,
  resultItemTemplate: dmResultItemTemplate,
}, {
  getState() {
    return {
      catalog: dmCatalog,
      recentContacts: dmRecentContacts,
      recentContactAssets: dmRecentContactAssets,
      selectedParticipantDids: dmSelectedParticipantDids,
    };
  },
  setSelectedParticipantDids(nextSelection) {
    dmSelectedParticipantDids = Array.isArray(nextSelection) ? nextSelection : [];
  },
  renderWorkspace: renderDmWorkspace,
  translate: t,
  getLocale() {
    return currentLocale;
  },
  assetToDataUri,
  setAvatarImage,
  getConversationTitle: getDmConversationTitle,
  formatTimestamp: formatHistoryTimestamp,
  setContactSearchNote: setDmContactSearchFieldNote,
  setElementVisibility,
  isAccessAvailable: isDmAccessAvailable,
  getAuthAccount() {
    return authAccount;
  },
  cloneTemplateContent,
});
const dmArchiveExportController = createDmArchiveExportController({
  assertAccess: assertDmAccessUnlocked,
  translate: t,
  setProgress: setDmProgress,
  createFile(parts, name, type) {
    return new File(parts, name, { type });
  },
  async shareOrDownloadFile(file, name) {
    await shareOrDownloadFile(file, name, { preferDownload: true });
  },
  ensureAvatarAssets: ensureDmAvatarAssets,
  buildHtmlDocument: buildDmHtmlDocument,
  getFileBaseName: makeDmArchiveFileBaseName,
  collectMessages: collectDmMessagesForExport,
  paginatePdfMessages: paginateDmPdfMessages,
  renderPdfPage: renderDmPdfCanvasPage,
  buildPdfFile,
  getConversationTitle: getDmConversationTitle,
});
let currentWorkspace = "composer";
if (document.body && String(document.body.dataset.page || "").trim() === THREADLINE_PAGE_TOOLS) {
  currentWorkspace = "search";
}
let searchResults = [];
let searchCursor = "";
let searchResultPreferences = null;
let activeSearchRunId = "";
let searchCancelPending = false;
let searchLoading = false;
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
let activeMediaExportAbortController = null;
let activeMediaExportState = "idle";
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
let threadExplorerSource = "follows";
let threadExplorerAccountActor = "";
let threadExplorerAccountMode = "posts";
let threadExplorerAccountError = "";
let threadExplorerAccountActorBeforeFocus = "";
let threadExplorerAccountModeBeforeFocus = "posts";
let threadExplorerFeedSources = [];
let threadExplorerFeedSourcesLoaded = false;
let threadExplorerFeedSourcesLoading = false;
let threadExplorerFeedSourcesAccountDid = "";
let threadExplorerActorFocusActor = null;
let threadExplorerActorFocusMode = "posts";
let threadExplorerActorFocusItems = [];
let threadExplorerActorFocusCursor = "";
let threadExplorerActorFocusHasMore = false;
let threadExplorerActorFocusLoading = false;
let threadExplorerActorFocusError = "";
let threadExplorerItems = [];
let threadExplorerCursor = "";
let threadExplorerHasMore = true;
let threadExplorerSelectedUri = "";
let threadExplorerTree = null;
let threadExplorerLoadingFeed = false;
let threadExplorerLoadingThread = false;
let threadExplorerCollapsedUris = new Set();
let threadExplorerFeedError = "";
let threadExplorerThreadError = "";
let threadExplorerZoom = 1;
let threadExplorerDragState = null;
const threadExplorerDragStateHolder = {
  get value() {
    return threadExplorerDragState;
  },
  set value(nextState) {
    threadExplorerDragState = nextState;
  },
};
const threadExplorerPanController = createThreadExplorerPanController({
  requestFrame: callback => window.requestAnimationFrame(callback),
  cancelFrame: frame => window.cancelAnimationFrame(frame),
  now: () => performance.now(),
  isDragging: () => Boolean(threadExplorerDragState),
  move: applyThreadExplorerScrollDelta,
  setPanning: setThreadExplorerPanningMode,
  renderEdges: scheduleThreadExplorerEdgeRender,
  minVelocity: THREAD_EXPLORER_INERTIA_MIN_VELOCITY,
  stopVelocity: THREAD_EXPLORER_INERTIA_STOP_VELOCITY,
  friction: THREAD_EXPLORER_INERTIA_FRICTION,
});
let threadExplorerPanX = 24;
let threadExplorerPanY = 24;
let threadExplorerOrientation = THREAD_EXPLORER_ORIENTATION_VERTICAL;
let threadExplorerViewMode = THREAD_EXPLORER_VIEW_MODE_TREE;
let threadExplorerFullscreen = false;
let threadExplorerFavorites = [];
const threadExplorerFavoritesController = createThreadExplorerFavoritesController({
  getFavorites: () => threadExplorerFavorites,
  setFavorites: value => { threadExplorerFavorites = value; },
  normalize: normalizeThreadExplorerFavorites,
  persist: persistSettings,
});
let savedSearches = [];
let savedSearchDialogContext = "threadExplorer";
let threadExplorerReactionsLoading = false;
const threadExplorerGalleryController = createThreadExplorerGalleryController({
  elements: {
    image: threadExplorerGalleryImage, caption: threadExplorerGalleryCaption, title: threadExplorerGalleryTitle,
    thumbs: threadExplorerGalleryThumbs, previousButton: threadExplorerGalleryPrevButton, nextButton: threadExplorerGalleryNextButton,
    overlayPreviousButton: threadExplorerGalleryOverlayPrevButton, overlayNextButton: threadExplorerGalleryOverlayNextButton,
    overlayCloseButton: threadExplorerGalleryOverlayCloseButton,
  },
  templateContent: threadExplorerGalleryThumbTemplate.content,
  translate: t, applyTranslatedTitle, onThumbnailError: handleThreadExplorerGalleryThumbError,
  show: () => threadExplorerGalleryDialog.showModal(),
});
let threadExplorerSnapshotMediaDataUris = new Map();
let threadExplorerRenderedMediaCache = new Map();
let threadExplorerReplyClusterLayoutState = null;
let threadExplorerReplyClusterExpandedUris = new Set();
const threadExplorerController = createThreadExplorerController({
  source: threadExplorerSource,
  orientation: threadExplorerOrientation,
  viewMode: threadExplorerViewMode,
});
const threadExplorerRenderScheduler = createThreadExplorerRenderScheduler({
  isClusterMode: isThreadExplorerReplyClusterModeActive,
  isDragging: () => threadExplorerDragState?.started === true,
  isInertiaActive: threadExplorerPanController.isActive,
  requestFrame: callback => window.requestAnimationFrame(callback),
  cancelFrame: frame => window.cancelAnimationFrame(frame),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: timer => window.clearTimeout(timer),
  renderEdges: renderThreadExplorerEdges, focusSelected: focusSelectedThreadExplorerNode,
});
const threadExplorerFeedSourcesController = createThreadExplorerFeedSourcesController({
  state: {
    get feeds() { return threadExplorerFeedSources; },
    set feeds(value) { threadExplorerFeedSources = value; },
    get loaded() { return threadExplorerFeedSourcesLoaded; },
    set loaded(value) { threadExplorerFeedSourcesLoaded = value; },
    get loading() { return threadExplorerFeedSourcesLoading; },
    set loading(value) { threadExplorerFeedSourcesLoading = value; },
    get accountDid() { return threadExplorerFeedSourcesAccountDid; },
    set accountDid(value) { threadExplorerFeedSourcesAccountDid = value; },
  },
  getAccount() {
    if (!authAccount) { return ""; }
    return String(authAccountDid || "").trim();
  },
  request: sendToServiceWorker, render: renderThreadExplorerFeedSourceSelect,
  onError(error) { console.warn("Thread Explorer feed sources failed.", error); },
});
const threadExplorerGalleryFullscreenController = createThreadExplorerGalleryFullscreenController({
  getTarget: () => threadExplorerGalleryMain || threadExplorerGalleryImage,
  isIos: isIosDevice,
  getFullscreenElement: () => document.fullscreenElement,
  exitFullscreen: () => document.exitFullscreen(),
  isOpen: () => Boolean(threadExplorerGalleryDialog?.open),
  step: stepThreadExplorerGallery,
  closeDialog: () => threadExplorerGalleryDialog?.close(),
  applyFallback(active) {
    if (threadExplorerGalleryMain) {
      threadExplorerGalleryMain.classList.toggle("is-inline-fullscreen", active);
    }
    document.body.classList.toggle("thread-explorer-gallery-fullscreen", active);
  },
});
const threadExplorerFocusController = createThreadExplorerFocusController({
  isClusterMode: isThreadExplorerReplyClusterModeActive,
  getRootUri: () => threadExplorerTree?.post?.uri || "",
  getSelectedUri: () => threadExplorerSelectedUri,
  getViewportElement: () => threadExplorerThreadTree,
  getStage: () => threadExplorerThreadStage,
  getCard: getRenderedThreadExplorerCard,
  getViewport: () => ({ zoom: threadExplorerZoom, panX: threadExplorerPanX, panY: threadExplorerPanY }),
  calculatePan: calculateThreadExplorerNodePan, setViewport: setThreadExplorerViewport,
  render: applyThreadExplorerStageTransform, renderEdges: scheduleThreadExplorerEdgeRender,
});
const threadExplorerSelectionPreferences = createThreadExplorerSelectionPreferences({
  getStorage: () => window.localStorage, key: THREAD_EXPLORER_SELECTION_STORAGE_KEY,
  getAccount: () => authAccountDid, getSource: () => threadExplorerSource,
  normalizeSource: normalizeThreadExplorerSource, now: () => new Date().toISOString(),
});
const threadExplorerOrientationPreference = createThreadExplorerViewPreference({
  getStorage: () => window.localStorage, key: THREAD_EXPLORER_ORIENTATION_STORAGE_KEY,
  normalize: normalizeThreadExplorerOrientation, fallback: THREAD_EXPLORER_ORIENTATION_VERTICAL,
});
const threadExplorerViewModePreference = createThreadExplorerViewPreference({
  getStorage: () => window.localStorage, key: THREAD_EXPLORER_VIEW_MODE_STORAGE_KEY,
  normalize: normalizeThreadExplorerViewMode, fallback: THREAD_EXPLORER_VIEW_MODE_TREE,
});
let threadExplorerForceHydrateCards = false;
const threadExplorerLazyHydrationController = createThreadExplorerLazyHydrationController({
  createObserver: getThreadExplorerObserverFactory(),
  getRoot: () => threadExplorerThreadTree,
  getStage: () => threadExplorerThreadStage,
  isForced: () => threadExplorerForceHydrateCards,
  getSelectedUri: () => threadExplorerSelectedUri,
  hydrate: hydrateThreadExplorerCardContent,
});
let threadExplorerLikePendingUris = new Set();
const { renderInteractionActions: renderThreadExplorerInteractionActions } = createThreadExplorerCardInteractionController({
  buildInteractionModel: buildLivePostInteractionModel,
  createButton: createThreadExplorerInteractionButton,
  isLikePending(uri) {
    return threadExplorerLikePendingUris.has(uri);
  },
  isLiked(post) {
    return isPostLikedByViewer(post);
  },
  openComposerReply(post) {
    openComposerReplyForPost(post);
  },
  toggleLike(post) {
    return toggleLikeForLivePost(post);
  },
});
const {
  renderCounts: renderThreadExplorerCounts,
  renderMetricEntries: renderThreadExplorerMetricEntries,
  renderViewLink: renderThreadExplorerViewLink,
  renderEditButton: renderThreadExplorerEditButton,
} = createThreadExplorerCardPresentationController({
  translate(key, values = {}) {
    const translatedValues = { ...values };
    if (Object.hasOwn(translatedValues, "count")) {
      translatedValues.count = formatCount(translatedValues.count);
    }
    return t(key, translatedValues);
  },
  createMetricEntries: getLocalizedPostMetricEntries,
  buildViewLinkModel(post) {
    return buildPostViewLinkModel(post, {
      buildPostUrl: buildThreadExplorerPostWebUrl,
      linkText: "↗",
    });
  },
  buildEditButtonModel: buildPostEditButtonModel,
  applyTranslatedTitle,
  handleRepliesCountClick: handleThreadExplorerRepliesCountClick,
  handleCountClick: handleThreadExplorerCountClick,
  handleEditButtonClick: handleThreadExplorerEditButtonClick,
});
let threadExplorerCardZoomState = null;
const threadExplorerCardFocusController = createThreadExplorerCardFocusController({
  getFocus: () => threadExplorerCardZoomState,
  setFocus: value => { threadExplorerCardZoomState = value; },
  getViewport: () => ({ zoom: threadExplorerZoom, panX: threadExplorerPanX, panY: threadExplorerPanY }),
  /** Restores page and controller viewport state and schedules edges.
   * @param {object} viewport - Saved zoom and pan.
   * @returns {void}
   */
  setViewport(viewport) {
    setThreadExplorerViewport(viewport);
    applyThreadExplorerStageTransform();
    scheduleThreadExplorerEdgeRender();
  },
  getBounds: getThreadExplorerCardNeighborhoodBounds,
  fit: fitThreadExplorerStageToBounds,
  select: setThreadExplorerSelectedUriLocally,
  isInteractive: isThreadExplorerInteractiveTarget,
  isNativeInteractive: isThreadExplorerNativeInteractiveTarget,
  now: () => Date.now(),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: timer => window.clearTimeout(timer),
});
const threadExplorerZoomResetController = createThreadExplorerZoomResetController({
  getZoom: () => threadExplorerZoom,
  setCenteredZoom: setThreadExplorerZoomAtViewportCenter,
  fit: fitThreadExplorerStageToTree,
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: timer => window.clearTimeout(timer),
});
const threadExplorerZoomController = createThreadExplorerZoomController({
  getViewport: () => ({ zoom: threadExplorerZoom, panX: threadExplorerPanX, panY: threadExplorerPanY }),
  setViewport: setThreadExplorerViewport,
  getBounds: () => threadExplorerThreadTree.getBoundingClientRect(),
  calculatePointZoom: calculateThreadExplorerPointZoom,
  rememberZoom: threadExplorerZoomResetController.remember,
  render: applyThreadExplorerStageTransform,
  renderEdges: scheduleThreadExplorerEdgeRender,
});
let analysisLoading = false;
let analysisStatusLine = "";
let analysisAccountDataA = null;
let analysisAccountDataB = null;
let analysisComparisonResult = null;
let analysisRequestToken = 0;
let analysisValidationTokens = {
  a: 0,
  b: 0,
};
let workspaceRestorePending = true;
let appStateHydrated = false;
const MAX_PERSISTED_SEARCH_RESULTS = 50;
const NETWORK_STAGE_MIN_ZOOM = 0.42;
const NETWORK_STAGE_MAX_ZOOM = 5.6;
const LOGIN_SERVICE_PRESETS = {
  "bsky.social": "https://bsky.social",
  "eurosky.social": "https://eurosky.social",
  "mu.social": "https://mu.social",
};
const DESKTOP_LAYOUT_MEDIA = window.matchMedia("(min-width: 981px)");

/** Starts the application worker lifecycle. @returns {Promise<void>} Startup completion. */
async function registerServiceWorker() { await applicationBootstrap.start(); }

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
    let settled = false;
    const abortSignal = options.signal || null;
    let handleAbort = null;
    const cleanup = () => {
      settled = true;
      window.clearTimeout(timeoutId);
      channel.port1.onmessage = null;
      channel.port1.close();
      if (abortSignal && handleAbort) {
        abortSignal.removeEventListener("abort", handleAbort);
      }
    };
    const rejectOnce = (error) => {
      if (settled) {
        return;
      }
      cleanup();
      reject(error);
    };
    const resolveOnce = (value) => {
      if (settled) {
        return;
      }
      cleanup();
      resolve(value);
    };
    const createAbortError = () => {
      if (typeof options.createAbortError === "function") {
        return options.createAbortError();
      }
      return createThreadExplorerSnapshotAbortError();
    };
    const scheduleTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        rejectOnce(new Error(t("statusSwTimeout")));
      }, timeoutMs);
    };

    if (abortSignal?.aborted) {
      rejectOnce(createAbortError());
      return;
    }

    handleAbort = () => {
      rejectOnce(createAbortError());
    };
    if (abortSignal) {
      abortSignal.addEventListener("abort", handleAbort, { once: true });
    }

    scheduleTimeout();

    channel.port1.onmessage = (event) => {
      if (settled) {
        return;
      }
      if (event.data?.progress) {
        scheduleTimeout();
        options.onProgress?.(event.data.progress);
        return;
      }

      window.clearTimeout(timeoutId);

      if (event.data?.ok) {
        resolveOnce(event.data.result);
        return;
      }

      const errorCode = String(event.data?.details?.code || "");
      const localizedServiceWorkerErrors = {
        ANALYSIS_ACCOUNT_MISSING: "analysisAccountMissingGeneric",
        ANALYSIS_ACCOUNT_NOT_FOUND: "analysisAccountNotFound",
        ANALYSIS_ACCOUNT_CHECK_FAILED: "analysisAccountCheckFailed",
        POST_EDIT_URL_INVALID: "postEditCheckInvalidUrl",
        POST_EDIT_ACTOR_NOT_FOUND: "postEditCheckActorNotFound",
        POST_EDIT_RECORD_LOAD_FAILED: "postEditCheckLoadFailed",
        POST_EDIT_RECORD_INVALID: "postEditCheckRecordInvalid",
      };
      const errorMessage = errorCode === "ARCHIVE_ASSET_LOAD_FAILED"
        ? t("archiveAssetLoadFailed", { status: event.data?.details?.status || "?" })
        : errorCode === "ANALYSIS_ACCOUNT_NOT_FOUND"
        ? t("analysisAccountNotFound", { account: event.data?.details?.actor || "" })
        : localizedServiceWorkerErrors[errorCode]
        ? t(localizedServiceWorkerErrors[errorCode])
        : event.data?.error || t("statusSwUnknownError");
      const error = new Error(errorMessage);
      error.details = event.data?.details || null;
      rejectOnce(error);
    };

    worker.postMessage({ type, payload }, [channel.port2]);
  });
}

/** Formats publication errors. @param {object|null} error - Worker failure. @returns {string} Localized failure. */
function buildPublishErrorMessage(error) { return buildComposerPublishErrorMessage(error, t); }


function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.style.color = tone === "error" ? "var(--danger)" : "var(--text)";
}

/**
 * Returns the localized composer hard-limit label for warning messages.
 * @param {void} - No parameters.
 * @returns {string} Localized representation of the composer limit.
 */
function getComposerLimitLabel() {
  return composerInputWarnings.limitLabel();
}

/**
 * Updates the composer warning below the textarea based on the current text length.
 * @param {boolean} wasTruncated - Whether the latest input had to be truncated.
 * @returns {void} No return value.
 */
function updateComposerInputWarning(wasTruncated = false) {
  composerInputWarnings.update(wasTruncated);
}

/** Renders current server limits. @param {object|null} value - Worker limit metadata. @returns {void} */
function renderPublishRateLimitNote(value) { composerRateLimitPresentation.render(value); }
/** Builds a server-limit message. @param {object|null} value - Worker metadata. @param {boolean} includeUnavailable - Include fallback. @returns {string} Localized message. */
function buildPublishRateLimitMessage(value, includeUnavailable = false) { return composerRateLimitPresentation.message(value, includeUnavailable); }

function setBusy(button, isBusy, busyLabel, idleLabel) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : idleLabel;
}

/** Normalizes service URLs through the session adapter. @param {string} value - Preset or URL. @returns {string} Base URL. */
function normalizeServiceUrl(value) {
  return normalizeLoginServiceUrl(value, LOGIN_SERVICE_PRESETS);
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
  if (composerReplyTarget?.mode === "thread") {
    return t("publishButtonThreadContinuation");
  }
  if (composerReplyTarget?.mode === "post") {
    return t("publishButtonReplyTarget");
  }
  return t("publishButtonTarget", { target: getPostTargetName() });
}

function getPublishBusyLabel() {
  if (composerReplyTarget?.mode === "thread") {
    return t("publishBusyThreadContinuation");
  }
  if (composerReplyTarget?.mode === "post") {
    return t("publishBusyReplyTarget");
  }
  return t("publishBusyTarget", { target: getPostTargetName() });
}

/** Updates the login endpoint controls. @param {string} serviceUrl - Selected endpoint. @returns {void} */
function applyLoginServiceSelection(serviceUrl = LOGIN_SERVICE_PRESETS["bsky.social"]) {
  loginController.selectService(serviceUrl);
}


/** Opens account add/repair UI. @param {object} options - Account and field defaults. @returns {void} */
function openLoginDialog(options = {}) {
  loginController.open(options);
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

/** Finds a known network profile. @param {string} did - Profile DID. @returns {object|null} Profile. */
function getKnownNetworkProfile(did) {
  return networkFocusController.known(did);
}

/** Resets loaded network state. @returns {void} */
function resetNetworkState() {
  networkWorkspaceController.reset();
}

/** Establishes the authenticated network context. @returns {void} */
function ensureNetworkStateForAccount() {
  networkWorkspaceController.ensure();
}


/** Merges loaded network profiles. @param {object[]} profiles - Partial profiles. @returns {void} */
function ingestNetworkProfiles(profiles = []) {
  networkFocusController.ingest(profiles);
}

/** Localizes a profile relationship. @param {object} node - Profile. @returns {string} Label. */
function getNetworkRelationLabel(node) {
  return networkWorkspaceController.relationLabel(node);
}

/** Checks own network context. @returns {boolean} Own context. */
function isViewingOwnNetwork() {
  return networkWorkspaceController.own();
}

/** Reads the viewed profile. @returns {object|null} Profile. */
function getNetworkCenterProfile() {
  return networkWorkspaceController.center();
}

/** Resolves the viewed account label. @returns {string} Label. */
function getNetworkCenterLabel() {
  return networkWorkspaceController.centerLabel();
}


/** Returns score-ranked network profiles. @returns {object[]} Ranked profiles. */
function getAllNetworkNodes() {
  return rankNetworkNodes(Array.from(networkNodes.values()));
}


/** Selects visible profiles using the current network filters. @param {number} limit - Optional result limit. @returns {object[]} Visible profiles. */
function getVisibleNetworkNodes(limit = Number.POSITIVE_INFINITY) {
  return selectNetworkNodes(Array.from(networkNodes.values()), {
    mode: networkFilterMode, query: networkSearchQuery, limit,
    commonDids: getActiveNetworkCommonMutualDids(),
  });
}


/** Sorts profiles using the current alphabetical preferences. @param {object[]} nodes - Profiles. @returns {object[]} Sorted profiles. */
function sortNetworkNodes(nodes = []) {
  return sortNetworkProfiles(nodes, { field: networkSortField, direction: networkSortDirection, locale: currentLocale });
}

/** Allocates a stable relation slot. @param {object} node - Network profile. @returns {object|null} Relation/index slot. */
function ensureNetworkStageSlot(node) {
  return networkLayoutController.slot(node);
}

/** Checks group pagination. @param {string} groupKey - Relation group. @returns {boolean} More data available. */
function hasPendingNetworkDataForGroup(groupKey) {
  return networkWorkspaceController.pending(groupKey);
}

/** Loads a group wave. @param {string} groupKey - Relation group. @returns {Promise<void>} Completion. */
async function loadMoreNetworkGroup(groupKey = "all") {
  await networkWorkspaceController.loadMore(groupKey);
}

/** Computes the viewport and applies its clamped pan state. @param {object} layout - Stage layout. @returns {object} SVG viewport. */
function getNetworkStageViewport(layout) {
  const result = calculateNetworkViewport(layout, {
    fitAll: networkStageFitAll, zoom: networkStageZoom, panX: networkStagePanX, panY: networkStagePanY,
  }, { min: NETWORK_STAGE_MIN_ZOOM, max: NETWORK_STAGE_MAX_ZOOM, clamp });
  networkStagePanX = result.panX;
  networkStagePanY = result.panY;
  return result.viewport;
}

/** Calculates bounds including the selected focus previews. @param {object} layout - Stage layout. @param {object[]} visibleNodes - Visible profiles. @param {string} selectedDid - Focus DID. @returns {object} Content bounds. */
function computeNetworkStageContentBounds(layout, visibleNodes, selectedDid) {
  let focusItems = [];
  if (layout.hasFocusIsland && selectedDid) { focusItems = getNetworkStageFocusPreviewItems(selectedDid); }
  return calculateNetworkContentBounds(layout, visibleNodes, selectedDid, focusItems);
}

/** Zooms the stage without an anchor. @param {number} factor - Zoom multiplier. @returns {void} */
function zoomNetworkStage(factor) {
  networkStageController.zoom(factor);
}

/** Zooms around a client-space anchor. @param {number} factor - Zoom multiplier. @param {number} clientX - Anchor X. @param {number} clientY - Anchor Y. @returns {void} */
function zoomNetworkStageAtPoint(factor, clientX, clientY) {
  networkStageController.zoomAtPoint(factor, clientX, clientY);
}

/** Resets the stage to fit-to-content. @returns {void} */
function resetNetworkStageView() {
  networkStageController.resetZoom();
}

/** Toggles and persists the stage shape. @returns {void} */
function toggleNetworkStageShape() {
  networkStageController.toggleShape();
}

/** Resolves stage label candidates. @param {object[]} visibleNodes - Visible profiles. @param {string} selectedDid - Focus DID. @returns {string[]} Label DIDs. */
function getNetworkStageLabelCandidates(visibleNodes, selectedDid) {
  return networkLayoutController.labels(visibleNodes, selectedDid);
}

/** Resolves capped focus previews. @param {string} selectedDid - Focus DID. @returns {object[]} Preview profiles. */
function getNetworkStageFocusPreviewItems(selectedDid) {
  return networkFocusController.previews(selectedDid);
}

/** Keeps visible node selection. @param {object[]} visibleNodes - Visible profiles. @returns {string} Selected DID. */
function getPreferredNetworkSelection(visibleNodes = getVisibleNetworkNodes()) {
  return networkFocusController.preferred(visibleNodes);
}

/** Selects and optionally loads a focus profile. @param {string} did - Profile DID. @param {object} settings - Loading and preview flags. @returns {void} */
function setNetworkSelection(did, { loadDetails = true, previewTab = "followers" } = {}) {
  networkFocusController.select(did, { loadDetails, previewTab });
}

/** Clears common-mutual filtering and state. @returns {void} */
function clearNetworkCommonMutuals() {
  networkFocusController.clearCommon();
}

/** Restores network result scroll across animation frames. @returns {void} */
function restoreNetworkResultsScroll() {
  networkStageController.restoreScroll();
}

/** Reads common mutuals for a selection. @param {string} selectedDid - Focus DID. @returns {Set<string>} Common DIDs. */
function getActiveNetworkCommonMutualDids(selectedDid = networkSelectedDid) {
  return networkFocusController.activeCommon(selectedDid);
}

/** Updates hover metadata. @param {string} did - Profile DID. @returns {void} */
function setNetworkHoveredAccount(did = "") {
  networkWorkspaceController.hover(did);
}

/** Loads focus details. @param {string} did - Profile DID. @returns {Promise<void>} Completion. */
async function loadNetworkFocusDetails(did) {
  await networkFocusController.loadFocus(did);
}

/** Loads common mutuals. @param {string} actorDid - Focus DID. @returns {Promise<void>} Completion. */
async function loadNetworkCommonMutuals(actorDid) {
  await networkFocusController.loadCommon(actorDid);
}

/** Resolves the requested network actor. @returns {string} Actor. */
function getRequestedNetworkActor() {
  return networkWorkspaceController.requested();
}


/** Refreshes the template-based saved-account sidebar. @returns {void} */
function renderAccountSwitcher() {
  savedAccountRenderer.render();
}

/**
 * Shows exactly one main workspace and hides the others.
 * @param {string} workspace - Workspace identifier that should stay visible.
 * @returns {void}
 */
function setVisibleWorkspace(workspace) {
  const normalizedWorkspace = normalizeWorkspaceForCurrentPage(workspace);
  const workspaceEntries = [
    ["composer", composerWorkspace],
    ...getToolsWorkspaceEntries({
      archive: archiveWorkspace,
      search: searchWorkspace,
      network: networkWorkspace,
      threadExplorer: threadExplorerWorkspace,
      analysis: analysisWorkspace,
      dm: dmWorkspace,
    }),
  ];

  workspaceEntries.forEach(([workspaceName, element]) => {
    const isActive = workspaceName === normalizedWorkspace;
    if (!element) {
      return;
    }
    element.hidden = !isActive;
    element.classList.toggle("workspace-view-active", isActive);
  });
}

/**
 * Opens the default workspace for the active page.
 * @param {object} options - Display options for the default workspace.
 * @param {boolean} [options.persist=true] - Persists the restored workspace when true.
 * @param {boolean} [options.allowUnauthenticated=false] - Allows unauthenticated search on the tools page.
 * @returns {void}
 */
function showDefaultWorkspaceForCurrentPage(options = {}) {
  const defaultWorkspace = getDefaultWorkspaceForCurrentPage();
  if (defaultWorkspace === "search") {
    showSearchWorkspace(options);
    return;
  }
  showComposerWorkspace(options);
}

/**
 * Reads the locally cached appearance preferences from localStorage.
 * @returns {{themeMode: string, compactMode: boolean, hasThemeMode: boolean, hasCompactMode: boolean}} Normalized appearance preferences plus presence flags.
 */
function getStoredAppearancePreferences() {
  return appearanceController.read();
}

/**
 * Persists the current appearance preferences immediately in localStorage.
 * @returns {void}
 */
function persistAppearancePreferences() {
  appearanceController.persist();
}

/**
 * Applies locally cached appearance preferences before async app-state hydration finishes.
 * @returns {void}
 */
function restoreAppearancePreferencesFromLocalStorage() {
  appearanceController.restore();
}

/**
 * Applies appearance preferences passed through page-switch URL parameters.
 * @returns {boolean} True when at least one appearance value was applied from the URL.
 */
function applyAppearancePreferencesFromUrl() {
  return appearanceController.applyUrl();
}

/**
 * Encodes one normalized composer reply target for a cross-page URL handoff.
 * @param {object|null} target - Normalized reply target that should be transported in the URL.
 * @returns {string} Encoded JSON payload, or an empty string when no valid target exists.
 */
function encodeComposerReplyTargetForUrl(target) {
  return composerReplyHandoff.encode(target);
}

/**
 * Decodes one composer reply target from the current URL query string and removes it afterwards.
 * @returns {object|null} Normalized reply target from the URL, or null.
 */
function consumeComposerReplyTargetFromUrl() {
  return composerReplyHandoff.consumeUrl();
}

/**
 * Builds one page-switch URL that carries the current appearance state.
 * @param {string} href - Raw target URL from the page-switch link.
 * @returns {string} Target URL with appearance transfer parameters.
 */
function buildAppearanceAwarePageSwitchUrl(href) {
  return appearanceController.buildUrl(href);
}

/**
 * Stores one pending page-switch target for service-worker-driven reload interruptions.
 * @param {string} url - Absolute target URL of the intended page switch.
 * @returns {void}
 */
function persistPendingPageSwitchUrl(url) {
  pendingNavigation.persist(url);
}

/**
 * Returns the stored pending page-switch target without removing it.
 * @returns {string} Pending absolute target URL, or an empty string.
 */
function getPendingPageSwitchUrl() {
  return pendingNavigation.read();
}

/**
 * Reads and removes the stored pending page-switch target.
 * @returns {string} Pending absolute target URL, or an empty string.
 */
function consumePendingPageSwitchUrl() {
  return pendingNavigation.consume();
}

/**
 * Removes a queued app-page navigation before leaving the application shell.
 * @returns {void}
 */
function clearPendingPageSwitchUrl() {
  pendingNavigation.clear();
}

/**
 * Clears a pending page-switch target when the current page already matches it.
 * @returns {void}
 */
function clearMatchingPendingPageSwitchUrl() {
  pendingNavigation.clearMatching();
}

/**
 * Stores one pending composer reply target for a cross-page jump into the composer.
 * @param {object|null} target - Normalized reply target that should survive the page switch.
 * @returns {void}
 */
function persistPendingComposerReplyTarget(target) {
  composerReplyHandoff.persist(target);
}

/**
 * Reads and removes one pending composer reply target after a page switch.
 * @returns {object|null} Normalized reply target from sessionStorage, or null.
 */
function consumePendingComposerReplyTarget() {
  return composerReplyHandoff.consumeStored();
}

/**
 * Re-synchronizes the appearance state from localStorage and reapplies it to the page.
 * @returns {void}
 */
function syncAppearanceFromLocalStorage() {
  appearanceController.sync();
}

/**
 * Updates workspace launch buttons and auth-dependent sidebar labels.
 * @returns {void}
 */
function updateAuthButtons() {
  const isAuthenticated = Boolean(authAccount);
  const currentPage = getCurrentThreadlinePage();
  const isToolsPage = currentPage === THREADLINE_PAGE_TOOLS;
  addAccountButton.textContent = t("addAccountButton");
  publishButton.textContent = getPublishButtonLabel();
  composerButton.disabled = false;
  archiveButton.disabled = !isAuthenticated;
  searchButton.disabled = false;
  if (searchUseOwnAccountButton) {
    searchUseOwnAccountButton.disabled = !isAuthenticated;
  }
  networkButton.disabled = !isAuthenticated;
  threadExplorerButton.disabled = !isAuthenticated;
  analysisButton.disabled = !isAuthenticated;
  dmButton.disabled = !isAuthenticated || !isDmAccessAvailable();
  [
    [composerButton, currentWorkspace === "composer"],
    [archiveButton, currentWorkspace === "archive"],
    [searchButton, currentWorkspace === "search"],
    [networkButton, currentWorkspace === "network"],
    [threadExplorerButton, currentWorkspace === "threadExplorer"],
    [analysisButton, currentWorkspace === "analysis"],
    [dmButton, currentWorkspace === "dm"],
  ].forEach(([button, isActive]) => {
    let pressed = "false";
    if (isActive) {
      pressed = "true";
    }
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", pressed);
  });
  composerLaunchNote.textContent = t("composerLaunchNote");
  archiveLaunchNote.textContent = isAuthenticated ? t("archiveLaunchEnabledNote") : t("archiveLaunchDisabledNote");
  searchLaunchNote.textContent = isAuthenticated ? t("searchLaunchEnabledNote") : t("searchLaunchDisabledNote");
  networkLaunchNote.textContent = isAuthenticated ? t("networkLaunchEnabledNote") : t("networkLaunchDisabledNote");
  if (isAuthenticated) {
    threadExplorerLaunchNote.textContent = t("threadExplorerLaunchEnabledNote");
  } else {
    threadExplorerLaunchNote.textContent = t("threadExplorerLaunchDisabledNote");
  }
  analysisLaunchNote.textContent = isAuthenticated ? t("analysisLaunchEnabledNote") : t("analysisLaunchDisabledNote");
  dmLaunchNote.textContent = isAuthenticated ? t("dmLaunchEnabledNote") : t("dmLaunchDisabledNote");
  if (isToolsPage && !isAuthenticated) {
    searchLaunchNote.textContent = t("searchLaunchDisabledNote");
  }
  renderAccountSwitcher();
  renderArchiveBackgroundNotice();
  updateAnalysisControls();
}

/**
 * Resets auth-bound workspace state after a disconnect or logout.
 * @param {boolean} [showStatus=true] - Shows the connection-lost status when true.
 * @returns {void}
 */
function applyDisconnectedState(showStatus = true) {
  authAccount = null;
  authAccountDid = "";
  resetNetworkState();
  updateAuthButtons();
  if (currentWorkspace === "archive" || currentWorkspace === "dm" || currentWorkspace === "network" || currentWorkspace === "threadExplorer" || currentWorkspace === "analysis") {
    showDefaultWorkspaceForCurrentPage({ persist: false, allowUnauthenticated: true });
  }

  if (showStatus) {
    setStatus(t("statusConnectionLost"), "error");
  }
}

function isArchiveHashtagContext() {
  return currentWorkspace === "archive";
}

/**
 * Returns whether the shared hashtag manager currently belongs to the search workspace.
 * @returns {boolean} True when the active workspace is the search workspace.
 */
function isSearchHashtagContext() {
  return currentWorkspace === "search";
}

function setElementVisibility(element, isVisible) {
  if (!element) {
    return;
  }
  element.hidden = !isVisible;
  element.setAttribute("aria-hidden", isVisible ? "false" : "true");
  element.style.display = isVisible ? "" : "none";
}

/**
 * Persists the last active tools workspace for reload restore.
 * @param {string} workspace - Active workspace identifier.
 * @returns {void}
 */
function persistWorkspacePreference(workspace) {
  if (getCurrentThreadlinePage() !== THREADLINE_PAGE_TOOLS) {
    return;
  }

  const normalizedWorkspace = normalizeWorkspaceForCurrentPage(workspace);
  persistToolsWorkspacePreference(
    window.localStorage,
    TOOLS_WORKSPACE_STORAGE_KEY,
    LEGACY_WORKSPACE_STORAGE_KEY,
    normalizedWorkspace,
  );
}

/**
 * Reads the persisted tools workspace preference for the active page.
 * @returns {string} Stored workspace identifier for the current page.
 */
function getStoredWorkspacePreference() {
  if (getCurrentThreadlinePage() !== THREADLINE_PAGE_TOOLS) {
    return "composer";
  }

  const value = readToolsWorkspacePreference(
    window.localStorage,
    TOOLS_WORKSPACE_STORAGE_KEY,
    LEGACY_WORKSPACE_STORAGE_KEY,
  );
  return normalizeWorkspaceForCurrentPage(value);
}

/**
 * Renders the selected saved search hint in the archive special tools area.
 * @returns {void}
 */
function renderArchiveSavedSearchNote() {
  if (!archiveThreadUrlNote) {
    return;
  }

  const search = getSavedSearchById(archiveSavedSearchId);
  if (!search) {
    archiveThreadUrlNote.textContent = t("archiveThreadUrlHint");
    return;
  }

  archiveThreadUrlNote.textContent = t("archiveSavedSearchSelected", {
    label: search.label || buildSavedSearchLabel(search),
    url: search.sourceUrl,
  });
}

/**
 * Returns a normalized Thread Explorer feed source.
 * @param {string} source - Raw source name from state or storage.
 * @returns {string} A timeline, feed, or saved-search source.
 */
function normalizeThreadExplorerSource(source) {
  return normalizeThreadExplorerSourceFromTools(source, {
    isFeedUri: isThreadExplorerFeedUri,
    hasSavedSearch: (searchId) => Boolean(getSavedSearchById(searchId)),
  });
}

/**
 * Returns the active account label for "Mein Account" actions in the Thread Explorer.
 * @returns {string} Handle, identifier, DID, or an empty string when unavailable.
 */
function getThreadExplorerOwnActor() {
  return getThreadExplorerOwnActorFromTools(savedAccounts, authAccountDid, authAccount);
}

/**
 * Checks whether the Thread Explorer account field currently targets the signed-in account.
 * @returns {boolean} True when no foreign-account mode should be used.
 */
function isThreadExplorerOwnAccountTarget() {
  return isThreadExplorerOwnAccountTargetFromTools(
    threadExplorerAccountActor,
    authAccount,
    authAccountDid,
    normalizeThreadExplorerActor,
  );
}

/**
 * Checks whether the Thread Explorer should load posts from a foreign account.
 * @returns {boolean} True when the account field points to another account.
 */
function isThreadExplorerForeignAccountMode() {
  return isThreadExplorerForeignAccountModeFromTools(
    threadExplorerAccountActor,
    authAccount,
    authAccountDid,
    normalizeThreadExplorerActor,
  );
}

/**
 * Checks whether one actor belongs to the signed-in account.
 * @param {object|null} actor - Normalized actor object from Thread Explorer data.
 * @returns {boolean} True when the actor is the signed-in account.
 */
function isThreadExplorerOwnActor(actor = null) {
  return isThreadExplorerOwnActorFromTools(actor, authAccount, authAccountDid, normalizeThreadExplorerActor);
}

/**
 * Checks whether the Thread Explorer currently shows a foreign-account actor focus.
 * @returns {boolean} True when the top source controls should be hidden.
 */
function isThreadExplorerForeignActorFocusMode() {
  return isThreadExplorerForeignActorFocusModeFromTools(
    threadExplorerActorFocusActor,
    authAccount,
    authAccountDid,
    normalizeThreadExplorerActor,
  );
}

/**
 * Builds a minimal Thread Explorer actor object from the account field value.
 * @param {string} actorValue - Normalized handle or DID from the account field.
 * @returns {object} Actor stub with either handle or DID filled.
 */
function createThreadExplorerActorStub(actorValue = "") {
  return createThreadExplorerActorStubFromTools(actorValue, normalizeThreadExplorerActor);
}

/**
 * Returns the actor that should currently be loaded in the Thread Explorer account mode.
 * @returns {string} Normalized handle or DID, or an empty string.
 */
function getThreadExplorerRequestedActor() {
  return getThreadExplorerRequestedActorFromTools(
    threadExplorerAccountActor,
    authAccount,
    authAccountDid,
    normalizeThreadExplorerActor,
  );
}

/**
 * Writes the current Thread Explorer account-mode note below the account field.
 * @returns {void}
 */
function renderThreadExplorerAccountNote() {
  if (isThreadExplorerForeignActorFocusMode()) {
    setAccountFieldNote(threadExplorerAccountNote, "");
    return;
  }
  if (threadExplorerAccountError) {
    setAccountFieldNote(threadExplorerAccountNote, threadExplorerAccountError);
    return;
  }
  if (isThreadExplorerForeignAccountMode()) {
    setAccountFieldNote(threadExplorerAccountNote, t("threadExplorerAccountModeHint"));
    return;
  }
  setAccountFieldNote(threadExplorerAccountNote, "");
}

/**
 * Applies the current Thread Explorer fullscreen state to the workspace shell.
 * @returns {void}
 */
function applyThreadExplorerFullscreenState() {
  const isActive = currentWorkspace === "threadExplorer" && threadExplorerFullscreen === true;
  if (threadExplorerWorkspace) {
    threadExplorerWorkspace.classList.toggle("is-fullscreen", isActive);
  }
  document.body.classList.toggle("thread-explorer-fullscreen-active", isActive);
}

/**
 * Returns the persistable Thread Explorer state for reload-safe account mode.
 * @returns {object} Saved account target, account mode, and fullscreen preference.
 */
function getPersistableThreadExplorerState() {
  return {
    actor: normalizeThreadExplorerActor(threadExplorerAccountActor),
    accountMode: normalizeThreadExplorerAccountMode(threadExplorerAccountMode),
    fullscreen: threadExplorerFullscreen === true,
  };
}

/**
 * Restores the persisted Thread Explorer account mode from saved settings.
 * @param {object} state - Saved Thread Explorer state object.
 * @returns {void}
 */
function restorePersistedThreadExplorerState(state = {}) {
  threadExplorerAccountActor = normalizeThreadExplorerActor(state?.actor || "");
  threadExplorerAccountMode = normalizeThreadExplorerAccountMode(state?.accountMode);
  threadExplorerFullscreen = state?.fullscreen === true;
  threadExplorerAccountError = "";
  if (threadExplorerAccountInput) {
    threadExplorerAccountInput.value = threadExplorerAccountActor;
  }
  if (threadExplorerAccountModeSelect) {
    threadExplorerAccountModeSelect.value = threadExplorerAccountMode;
  }
  renderThreadExplorerAccountNote();
  applyThreadExplorerFullscreenState();
}

/**
 * Returns a normalized Actor-Fokus mode for the Thread Explorer.
 * @param {string} mode - Raw mode name.
 * @returns {string} One of posts, replies, or all.
 */
function normalizeThreadExplorerActorFocusMode(mode) {
  return normalizeThreadExplorerActorFocusModeFromTools(mode);
}

/**
 * Extracts a feed generator URI from a Thread Explorer source value.
 * @param {string} source - Thread Explorer source value.
 * @returns {string} Feed generator AT URI, or an empty string.
 */
function getThreadExplorerFeedUriFromSource(source) {
  return getThreadExplorerFeedUriFromSourceModule(normalizeThreadExplorerSource(source));
}

/**
 * Extracts a saved search id from a Thread Explorer source value.
 * @param {string} source - Thread Explorer source value.
 * @returns {string} Saved search id or an empty string.
 */
function getThreadExplorerSearchIdFromSource(source) {
  return getThreadExplorerSearchIdFromSourceModule(normalizeThreadExplorerSource(source));
}

/**
 * Saves the currently selected Thread Explorer post for reload recovery.
 * @param {string} uri - AT URI of the currently opened post.
 * @returns {void}
 */
function persistThreadExplorerSelectionPreference(uri) {
  threadExplorerSelectionPreferences.save(uri);
}

/**
 * Removes the saved Thread Explorer post selection.
 * @returns {void}
 */
function clearThreadExplorerSelectionPreference() {
  threadExplorerSelectionPreferences.clear();
}

/**
 * Reads the saved Thread Explorer post selection for the active account.
 * @returns {object|null} Saved source and selected URI, or null when unavailable.
 */
function getStoredThreadExplorerSelectionPreference() {
  return threadExplorerSelectionPreferences.read();
}

/**
 * Restores the saved Thread Explorer source and selected URI into memory.
 * @returns {string} Restored selected URI, or an empty string when none exists.
 */
function restoreThreadExplorerSelectionPreference() {
  const storedSelection = getStoredThreadExplorerSelectionPreference();
  if (!storedSelection) {
    return "";
  }

  threadExplorerSource = storedSelection.source;
  threadExplorerSelectedUri = storedSelection.selectedUri;
  return storedSelection.selectedUri;
}

/**
 * Returns a normalized Thread Explorer orientation.
 * @param {string} orientation - Raw orientation from state or storage.
 * @returns {string} Either "vertical" or "horizontal".
 */
function normalizeThreadExplorerOrientation(orientation) {
  return normalizeThreadExplorerOrientationFromTools(orientation, THREAD_EXPLORER_ORIENTATION_HORIZONTAL);
}

/**
 * Saves the current Thread Explorer layout orientation.
 * @param {string} orientation - Orientation to persist.
 * @returns {void}
 */
function persistThreadExplorerOrientationPreference(orientation) {
  threadExplorerOrientationPreference.save(orientation);
}

/**
 * Reads the saved Thread Explorer layout orientation.
 * @returns {string} Saved orientation, or the vertical default.
 */
function getStoredThreadExplorerOrientationPreference() {
  return threadExplorerOrientationPreference.read();
}

/**
 * Restores the saved Thread Explorer layout orientation into memory.
 * @returns {string} Restored orientation.
 */
function restoreThreadExplorerOrientationPreference() {
  threadExplorerOrientation = getStoredThreadExplorerOrientationPreference();
  return threadExplorerOrientation;
}

/**
 * Returns a normalized Thread Explorer view mode.
 * @param {string} mode - Raw view mode from state or storage.
 * @returns {string} Either "tree" or "reply-cluster".
 */
function normalizeThreadExplorerViewMode(mode) {
  return normalizeThreadExplorerViewModeFromTools(mode, THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER);
}

/**
 * Saves the current Thread Explorer view mode.
 * @param {string} mode - View mode to persist.
 * @returns {void}
 */
function persistThreadExplorerViewModePreference(mode) {
  threadExplorerViewModePreference.save(mode);
}

/**
 * Reads the saved Thread Explorer view mode.
 * @returns {string} Saved mode, or the tree default.
 */
function getStoredThreadExplorerViewModePreference() {
  return threadExplorerViewModePreference.read();
}

/**
 * Restores the saved Thread Explorer view mode into memory.
 * @returns {string} Restored mode.
 */
function restoreThreadExplorerViewModePreference() {
  threadExplorerViewMode = getStoredThreadExplorerViewModePreference();
  return threadExplorerViewMode;
}

/** Enters native or app-internal network stage mode. @returns {Promise<void>} Completion. */
async function enterNetworkStageMode() {
  await networkStageController.enter();
}

/** Exits network stage mode. @returns {Promise<void>} Completion. */
async function exitNetworkStageMode() {
  await networkStageController.exit();
}

/** Persists the stage shape. @param {string} shape - Shape. @returns {void} */
function persistNetworkStageShapePreference(shape) {
  writeNetworkShapePreference(shape, () => window.localStorage, NETWORK_STAGE_SHAPE_STORAGE_KEY);
}

/** Reads the stage shape with restricted-storage fallback. @returns {string} Shape. */
function getStoredNetworkStageShape() {
  return readNetworkShapePreference(() => window.localStorage, NETWORK_STAGE_SHAPE_STORAGE_KEY);
}

/**
 * Restores the preferred workspace after settings and auth state finished hydrating.
 * @returns {void}
 */
function restorePreferredWorkspaceIfPossible() {
  if (!workspaceRestorePending) {
    return;
  }
  if (!appStateHydrated) {
    return;
  }
  if (!authAccount) {
    workspaceRestorePending = false;
    if (currentWorkspace !== getDefaultWorkspaceForCurrentPage()) {
      showDefaultWorkspaceForCurrentPage({ allowUnauthenticated: true });
    }
    return;
  }

  const preferred = normalizeWorkspaceForCurrentPage(getStoredWorkspacePreference());
  if (preferred === "dm" && DM_ACCESS_GATE_ENABLED && !dmAccessChecked) {
    return;
  }

  workspaceRestorePending = false;
  const workspaceOpeners = {
    archive: showArchiveWorkspace,
    search: showSearchWorkspace,
    network: showNetworkWorkspace,
    threadExplorer: showThreadExplorerWorkspace,
    analysis: showAnalysisWorkspace,
  };
  if (isDmAccessAvailable()) {
    workspaceOpeners.dm = showDmWorkspace;
  }

  if (openToolsWorkspace(preferred, workspaceOpeners)) {
    return;
  }
  showDefaultWorkspaceForCurrentPage();
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

/** Relocates the shared hashtag pane to the active workspace. @returns {void} */
function applyHashtagPaneContext() { hashtagController.applyContext(); }

/**
 * Builds the compact hashtag summary for the search workspace.
 * @returns {string} Localized one-line summary for the selected search hashtags.
 */
function buildSearchHashtagSummary() { return hashtagController.getSearchSummary(); }

/**
 * Renders the compact hashtag summary and button state in the search workspace.
 * @returns {void}
 */
function renderSearchHashtagSummary() { hashtagController.renderSearchSummary(); }

/** Arranges archive cards through the template layout controller. @returns {void} */
function ensureArchiveWorkspaceLayout() { archiveWorkspaceLayout.ensure(); }

/**
 * Returns the normalized active search mode from the workspace controls.
 * @returns {string} One of `network`, `posts`, `reposts`, or `hashtags`.
 */
function getSearchMode() {
  return searchForm.mode();
}

/**
 * Updates labels, field visibility, and helper text for the active search mode.
 * @returns {void}
 */
function updateSearchModeUi() {
  return searchForm.updateMode();
}

/**
 * Collects the current search controls into one request payload for the service worker.
 * @returns {object} Search request payload.
 */
function collectSearchRequestPayload() {
  return searchForm.payload();
}

/**
 * Reads the current search form into a persistable preferences object.
 * @returns {object} Search form state for reload-safe persistence.
 */
function getSearchPreferences() {
  return searchForm.preferences();
}

/**
 * Applies stored search preferences back into the search form controls.
 * @param {object} preferences - Persisted search form state.
 * @returns {void}
 */
function applySearchPreferences(preferences = {}) {
  return searchForm.apply(preferences);
}

/**
 * Persists the current search form with a short debounce to avoid excessive writes.
 * @returns {void}
 */
function scheduleSearchPreferencesPersist() {
  return searchForm.schedulePersist();
}

/**
 * Applies a shared Bluesky search URL to the search workspace controls.
 * @param {string} sourceUrl - Shared `bsky.app/search` URL.
 * @returns {boolean} True when the URL was parsed successfully.
 */
function applySearchUrlToForm(sourceUrl) {
  return searchForm.applyUrl(sourceUrl);
}

/**
 * Attempts to import a shared search URL from the dedicated input field.
 * @returns {void}
 */
function importSearchUrlFromField() {
  return searchForm.importUrl();
}

/**
 * Schedules automatic import after a paste or manual edit in the search URL field.
 * @returns {void}
 */
function scheduleSearchUrlImport() {
  return searchForm.scheduleUrl();
}

/**
 * Removes previously rendered search highlights from one element.
 * @param {Element|null} element - Target element containing highlighted text.
 * @returns {void}
 */
function clearSearchHighlights(element) {
  if (!element) {
    return;
  }

  element.querySelectorAll("mark[data-search-highlight='true']").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

/**
 * Highlights current search terms inside one rendered search result element.
 * @param {Element|null} element - Element that should receive inline highlights.
 * @param {string} query - Raw search query from the workspace.
 * @returns {void}
 */
function highlightSearchQueryInElement(element, query = "") {
  clearSearchHighlights(element);
  if (!element) {
    return;
  }

  const terms = parseSearchQueryTerms(query);
  if (!terms.length) {
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
    const matches = [];

    terms.forEach((term) => {
      const escapedTerm = escapeSearchHighlightRegex(term);
      if (!escapedTerm) {
        return;
      }

      const matcher = new RegExp(escapedTerm, "giu");

      let match = matcher.exec(source);
      while (match) {
        const directMatch = String(match[0] || "");
        const start = match.index;
        const end = start + directMatch.length;
        if (end > start) {
          matches.push({
            start,
            end,
            length: end - start,
          });
        }
        match = matcher.exec(source);
      }
    });

    if (!matches.length) {
      return;
    }

    matches.sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      return right.length - left.length;
    });

    const filteredMatches = [];
    let lastEnd = -1;
    matches.forEach((entry) => {
      if (entry.start < lastEnd) {
        return;
      }
      filteredMatches.push(entry);
      lastEnd = entry.end;
    });

    if (!filteredMatches.length) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    filteredMatches.forEach((entry) => {
      if (entry.start > cursor) {
        fragment.appendChild(document.createTextNode(source.slice(cursor, entry.start)));
      }
      const mark = document.createElement("mark");
      mark.dataset.searchHighlight = "true";
      mark.textContent = source.slice(entry.start, entry.end);
      fragment.appendChild(mark);
      cursor = entry.end;
    });
    if (cursor < source.length) {
      fragment.appendChild(document.createTextNode(source.slice(cursor)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });
}

/**
 * Builds the readable topic fragment for the live search summary.
 * @param {object} payload - Normalized search request payload.
 * @returns {string} Localized topic fragment, or an empty string.
 */
function buildSearchTopicText(payload = {}) {
  return searchModels.topic(payload);
}

/**
 * Builds localized detail clauses for non-text search filters.
 * @param {object} payload - Normalized search request payload.
 * @returns {string[]} Localized filter clauses.
 */
function buildSearchDetailTexts(payload = {}) {
  return searchModels.details(payload);
}

/**
 * Builds a natural-language sentence that describes the active search.
 * @param {object} payload - Normalized search request payload.
 * @returns {string} Localized search description.
 */
function buildSearchSummaryText(payload = {}) {
  return searchModels.summary(payload);
}

/**
 * Updates the human-readable summary below the search mode note.
 * @returns {void}
 */
function renderSearchSummary() {
  if (!searchSummary) {
    return;
  }

  const payload = collectSearchRequestPayload();
  searchSummary.textContent = buildSearchSummaryText(payload)
    .replace(/\s+\?/g, "?")
    .replace(/\s{2,}/g, " ");
}

/**
 * Builds the visible search status after a successful request.
 * @param {number} count - Number of currently rendered results.
 * @param {boolean} hasMore - True when another cursor page is available.
 * @returns {string} Localized status line.
 */
function buildSearchLoadedStatus(count, hasMore) {
  return searchModels.loaded(count, hasMore);
}

/**
 * Refreshes button states and helper text in the search workspace.
 * @returns {void}
 */
function renderSearchWorkspace() {
  updateSearchModeUi();
  updateSearchSortOptionState();
  renderSearchHashtagSummary();
  renderSearchSummary();
  if (searchRunButton) {
    searchRunButton.disabled = searchLoading;
  }
  if (searchMoreButton) {
    searchMoreButton.hidden = searchLoading || !searchCursor || !doesCurrentSearchMatchResultState();
    searchMoreButton.disabled = searchLoading;
  }
  if (searchCancelButton) {
    searchCancelButton.hidden = !searchLoading;
    searchCancelButton.disabled = !searchLoading || searchCancelPending;
  }
}

/**
 * Builds the metadata line for one search result card.
 * @param {object} item - Normalized search result item.
 * @returns {string} Rendered metadata line.
 */
function buildSearchResultMetaText(item = {}) {
  return buildSharedSearchResultMetaText(item, {
    formatDate: formatThreadExplorerDate,
    translate: t,
  });
}

/**
 * Returns the localized author fields shown in post-like cards.
 * @param {object} actor - Normalized actor data.
 * @returns {{authorLabel: string, handleLabel: string}} Visible author fields.
 */
function getLocalizedPostAuthorFields(actor = {}) {
  return getPostAuthorFields(actor, t("threadExplorerUnknownAuthor"));
}

/**
 * Returns localized metric entries for one live post card.
 * @param {object} post - Post-like object with count fields.
 * @param {string[]} interactiveTypes - Metric types that should open follow-up UI.
 * @returns {Array<{type: string, count: number, label: string, isInteractive: boolean}>} Ordered metric entry list.
 */
function getLocalizedPostMetricEntries(post = {}, interactiveTypes = []) {
  return buildPostMetricEntries(post, {
    translate: t,
    formatCount,
    interactiveTypes,
  });
}

/**
 * Opens one search result directly in the Thread Explorer.
 * @param {object} item - Normalized search result item.
 * @returns {Promise<void>} Resolves after the Thread Explorer load was started.
 */
async function openSearchResultInThreadExplorer(item = {}) {
  const post = item?.post || null;
  const uri = String(post?.uri || "").trim();
  if (!uri) {
    return;
  }

  showThreadExplorerWorkspace();
  await selectThreadExplorerPost(uri);
}

/**
 * Renders interaction counts for one search result card.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {HTMLElement} counts - Count container.
 * @param {Array<{type: string, count: number, label: string, isInteractive: boolean}>} metricEntries - Prepared metric entries.
 * @returns {void}
 */
function renderSearchResultCounts(post, counts, metricEntries = []) {
  renderThreadExplorerMetricEntries(post, counts, metricEntries);
}

const createSearchResultElement = createSearchResultCardRenderer({
  nodeTemplate: threadExplorerNodeTemplate,
  cloneTemplateContent,
  getDisplayModel: getSearchResultPostCardDisplayModel,
  get favorites() {
    return threadExplorerFavorites;
  },
  translate: t,
  applyTranslatedTitle,
  setAvatarImage,
  getActorLabel: getThreadExplorerActorLabel,
  renderViewLink: renderThreadExplorerViewLink,
  renderEditButton: renderThreadExplorerEditButton,
  renderInteractionActions: renderThreadExplorerInteractionActions,
  renderMetricEntries: renderSearchResultCounts,
  highlightSearchQuery: highlightSearchQueryInElement,
  hydrateCard: hydrateThreadExplorerCardContent,
  openInThreadExplorer: openSearchResultInThreadExplorer,
  saveAsFavorite: saveSearchResultAsFavorite,
  noTextLabel: t("threadExplorerNoText"),
});

/**
 * Renders the current search result list from the Thread Explorer template.
 * @returns {void}
 */
function renderSearchResults() {
  if (!searchResultsList) {
    return;
  }
  searchResultsList.replaceChildren();
  if (!searchResults.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const highlightQuery = String(searchQueryInput?.value || "").trim();
  searchResults.forEach((item) => {
    const element = createSearchResultElement(item, highlightQuery);
    if (element) {
      fragment.appendChild(element);
    }
  });
  searchResultsList.appendChild(fragment);
}

/**
 * Loads search results through the service worker and updates the workspace state.
 * @param {object} options - Search load options.
 * @param {boolean} options.append - True when the next result page should be appended.
 * @returns {Promise<void>} Resolves after the request finished.
 */
async function loadSearchResults(options = {}) {
  return searchRun.load(options);
}

/**
 * Shows the live search workspace.
 * @param {object} options - Display options for the search workspace.
 * @param {boolean} [options.persist=true] - Persists the active workspace when true.
 * @param {boolean} [options.allowUnauthenticated=false] - Allows the tools page to open search before login.
 * @returns {void}
 */
function showSearchWorkspace(options = {}) {
  if (navigateToThreadlinePage(THREADLINE_PAGE_TOOLS)) {
    return;
  }

  const allowUnauthenticated = options.allowUnauthenticated === true;
  if (!authAccount && !allowUnauthenticated) {
    return;
  }

  currentWorkspace = "search";
  applyThreadExplorerFullscreenState();
  if (options.persist !== false) {
    persistWorkspacePreference(currentWorkspace);
  }
  setVisibleWorkspace(currentWorkspace);
  applyHashtagPaneContext();
  updateAuthButtons();
  renderSearchWorkspace();
}

/**
 * Opens the search hashtag dialog.
 * @returns {void}
 */
function openSearchHashtagDialog() { hashtagController.openSearch(); }

/**
 * Closes the search hashtag dialog if it is open.
 * @returns {void}
 */
function closeSearchHashtagDialog() { hashtagController.closeSearch(); }

/**
 * Copies the authenticated account handle into the search account field.
 * @returns {void}
 */
function handleSearchUseOwnAccountClick() {
  if (!searchActorInput) {
    return;
  }

  const ownAccount = String(authAccount || "").trim();
  if (!ownAccount) {
    return;
  }

  searchActorInput.value = ownAccount;
  renderSearchSummary();
  scheduleSearchPreferencesPersist();
}

/**
 * Builds a localized live progress line for the current search run.
 * @param {object} progress - Progress payload from the service worker.
 * @returns {string} Human-readable progress text.
 */
function buildSearchProgressStatus(progress = {}) {
  return searchModels.progress(progress);
}

/**
 * Returns true when the active search needs client-side post-filtering details.
 * @param {object} payload - Normalized search payload from the current form.
 * @returns {boolean} True when detailed counters help explain local filtering.
 */
function shouldShowDetailedSearchProgress(payload = {}) {
  return searchModels.detailed(payload);
}

/**
 * Builds a bsky-compatible search URL from the current search payload.
 * @param {object} payload - Normalized search payload from the current form.
 * @returns {{url: string, limitations: string[]}} URL plus unsupported Threadline filters.
 */
function buildBskySearchUrlFromPayload(payload = {}) {
  return searchModels.sharedUrl(payload);
}

/**
 * Creates one normalized search-preferences snapshot for comparison and storage.
 * @param {object} preferences - Raw search preferences.
 * @returns {object} Normalized search preferences.
 */
function normalizeSearchPreferencesForStorage(preferences = {}) {
  return searchPreferencesNormalizer(preferences);
}

/**
 * Compares two search-preference snapshots after normalization.
 * @param {object} left - First search-preference snapshot.
 * @param {object} right - Second search-preference snapshot.
 * @returns {boolean} True when both snapshots describe the same search.
 */
function areSearchPreferencesEqual(left = {}, right = {}) {
  return areSearchPreferencesEqualFromSearch(left, right, normalizeSearchPreferencesForStorage);
}

/**
 * Normalizes persisted search result items for local reload restore.
 * @param {Array<object>} items - Raw persisted search result items.
 * @returns {Array<object>} Clamped array of persisted search result items.
 */
function normalizePersistedSearchResultItems(items = []) {
  return normalizePersistedSearchResultItemsFromSearch(items, MAX_PERSISTED_SEARCH_RESULTS);
}

/**
 * Builds a persistable snapshot of the current search result list.
 * @returns {object|null} Persistable search result state or null when nothing should be kept.
 */
function getPersistableSearchResultState() {
  return searchRun.snapshot();
}

/**
 * Returns whether the current search form still matches the displayed result list.
 * @returns {boolean} True when `Mehr laden` can safely continue the current result set.
 */
function doesCurrentSearchMatchResultState() {
  return searchRun.matches();
}

/**
 * Restores persisted search results when they still match the persisted search form.
 * @param {object|null} state - Persisted search result state from local settings.
 * @param {object} currentPreferences - Persisted live search preferences.
 * @param {object|null} startup - Startup identity used before global account hydration.
 * @returns {void}
 */
function restorePersistedSearchResultState(state = null, currentPreferences = {}, startup = null) {
  return searchRun.restore(state, currentPreferences, startup?.handle || startup?.identifier || authAccount);
}

/**
 * Restores the visible search status line from the current in-memory result state.
 * @returns {void}
 */
function restoreSearchStatusFromResultState() {
  return searchRun.restoreStatus();
}

/**
 * Builds the display label for one locally saved search based on search preferences.
 * @param {object} preferences - Search preferences that should be named.
 * @returns {string} Human-readable search label.
 */
function buildSavedSearchLabelFromPreferences(preferences = {}) {
  return searchModels.savedLabel(preferences);
}

/**
 * Copies the current search as a bsky-compatible search URL and shows a popup note.
 * @returns {Promise<void>} Resolves after the copy attempt finished.
 */
async function copyCurrentSearchAsBskyUrl() {
  const payload = collectSearchRequestPayload();
  const result = buildBskySearchUrlFromPayload(payload);

  try {
    await copyTextToClipboard(result.url);
  } catch (error) {
    showErrorDialog(error?.message || t("statusNoSupport"));
    return;
  }

  let message = t("searchCopyUrlMessage");
  if (result.limitations.length > 0) {
    message = `${message}\n\n${t("searchCopyUrlLimitationsPrefix")}\n- ${result.limitations.join("\n- ")}`;
  }
  showErrorDialog(message, t("searchCopyUrlTitle"), {
    linkUrl: result.url,
    linkLabel: t("searchCopyUrlOpenLink"),
  });
}

/**
 * Requests cancellation for the active search run.
 * @returns {Promise<void>} Resolves after the cancel signal was sent.
 */
async function cancelActiveSearchRun() {
  return searchRun.cancel();
}

/**
 * Converts one search result into a Thread Explorer favorite entry.
 * @param {object} item - Search result entry with normalized post data.
 * @returns {object|null} Favorite entry, or null when no post URI is available.
 */
function createThreadExplorerFavoriteFromSearchResult(item = {}) {
  return buildThreadExplorerFavoriteModel(item?.post || null, {
    trimFields: true, getActorLabel: getThreadExplorerActorLabel, getPreviewText: getThreadExplorerPreviewText,
    getWebApp: getThreadExplorerPostWebApp, now: () => new Date().toISOString(),
  });
}

/**
 * Saves one search result as reusable Thread Explorer favorite.
 * @param {object} item - Search result entry with normalized post data.
 * @returns {Promise<void>} Resolves after settings were persisted.
 */
async function saveSearchResultAsFavorite(item = {}) {
  const saved = await threadExplorerFavoritesController.save(createThreadExplorerFavoriteFromSearchResult(item));
  if (!saved) {
    return;
  }
  renderSearchResults();
  updateThreadExplorerControls();
  setStatus(t("searchFavoriteSavedStatus"));
}

/**
 * Shows the archive workspace on the tools page.
 * @returns {void}
 */
function showArchiveWorkspace() {
  if (navigateToThreadlinePage(THREADLINE_PAGE_TOOLS)) {
    return;
  }
  if (!authAccount) {
    return;
  }

  currentWorkspace = "archive";
  applyThreadExplorerFullscreenState();
  persistWorkspacePreference(currentWorkspace);
  setVisibleWorkspace(currentWorkspace);
  ensureArchiveWorkspaceLayout();
  applyHashtagPaneContext();
  updateAuthButtons();
  renderArchiveWorkspace();
}

/**
 * Shows the network workspace on the tools page.
 * @returns {void}
 */
/** Opens the network workspace through the page controller. @returns {void} */
function showNetworkWorkspace() {
  networkWorkspaceController.show();
}

/**
 * Shows the live Thread Explorer workspace and loads the first feed slice when needed.
 * @returns {void}
 */
function showThreadExplorerWorkspace() {
  if (navigateToThreadlinePage(THREADLINE_PAGE_TOOLS)) {
    return;
  }
  if (!authAccount) {
    return;
  }

  restoreThreadExplorerSelectionPreference();
  restoreThreadExplorerOrientationPreference();
  restoreThreadExplorerViewModePreference();
  currentWorkspace = "threadExplorer";
  applyThreadExplorerFullscreenState();
  persistWorkspacePreference(currentWorkspace);
  setVisibleWorkspace(currentWorkspace);
  applyHashtagPaneContext();
  updateAuthButtons();
  renderThreadExplorerWorkspace();
  void loadThreadExplorerFeedSources();
  if (!threadExplorerItems.length && !threadExplorerLoadingFeed) {
    void loadThreadExplorerFeed({ reset: true });
  }
}

/**
 * Shows the analysis workspace on the tools page.
 * @returns {void}
 */
function showAnalysisWorkspace() {
  analysisWorkspaceController.show();
}

/**
 * Shows the DM archive workspace on the tools page.
 * @returns {void}
 */
function showDmWorkspace() {
  if (navigateToThreadlinePage(THREADLINE_PAGE_TOOLS)) {
    return;
  }
  if (!authAccount || !isDmAccessAvailable()) {
    return;
  }

  currentWorkspace = "dm";
  applyThreadExplorerFullscreenState();
  persistWorkspacePreference(currentWorkspace);
  setVisibleWorkspace(currentWorkspace);
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

/**
 * Shows the composer workspace on the writing page.
 * @param {object} options - Display options for the composer workspace.
 * @param {boolean} [options.persist=true] - Persists the active workspace when true.
 * @param {boolean} [options.redirectPage=false] - Allows a tools-page call to navigate to the composer page.
 * @returns {void}
 */
function showComposerWorkspace(options = {}) {
  openComposerWorkspace(options, {
    currentPage: getCurrentThreadlinePage(),
    toolsPage: THREADLINE_PAGE_TOOLS,
    composerPage: THREADLINE_PAGE_COMPOSER,
    navigateToPage: navigateToThreadlinePage,
    setCurrentWorkspace(workspace) {
      currentWorkspace = workspace;
    },
    applyFullscreenState: applyThreadExplorerFullscreenState,
    persistWorkspace: persistWorkspacePreference,
    setVisibleWorkspace,
    applyHashtagPaneContext,
    updateAuthButtons,
  });
}

/** Updates network progress text. @param {unknown} message - Status text. @returns {void} */
function setNetworkStatus(message) {
  networkWorkspaceController.status(message);
}

/**
 * Formats one interaction count for the active Threadline locale.
 * @param {number|string} value - Raw numeric value.
 * @returns {string} Localized number string.
 */
function formatCount(value) {
  return formatPostCount(value, currentLocale);
}

/**
 * Returns the visible label for a Thread Explorer actor.
 * @param {object} actor - Normalized Thread Explorer actor data.
 * @returns {string} Display name, handle, DID, or fallback label.
 */
function getThreadExplorerActorLabel(actor) {
  return getThreadExplorerActorLabelFromRendering(actor, t("threadExplorerUnknownAuthor"), getPostActorLabel);
}

/**
 * Returns a compact preview string for a Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post data.
 * @returns {string} Short text suitable for feed buttons.
 */
function getThreadExplorerPreviewText(post) {
  return getThreadExplorerPreviewTextFromRendering(post, t("threadExplorerNoText"), 220, getPostPreviewText);
}

/**
 * Formats a Thread Explorer timestamp for the active locale.
 * @param {string} value - ISO timestamp from Bluesky.
 * @returns {string} Localized date/time text or an empty string.
 */
function formatThreadExplorerDate(value) {
  return formatThreadExplorerDateFromRendering(value, currentLocale, formatPostDateTime);
}

/**
 * Counts all posts in a normalized Thread Explorer tree.
 * @param {object|null} node - Root node from the Service Worker.
 * @returns {number} Number of posts contained in the tree.
 */
function countThreadExplorerPosts(node) {
  return countThreadExplorerPostsFromRendering(node);
}

/**
 * Parses a shared Bluesky search URL into searchPosts parameters.
 * @param {string} sourceUrl - Shared bsky.app search URL.
 * @returns {object} Normalized source URL and API search params.
 */
function parseSavedSearchUrl(sourceUrl) {
  return savedSearchModels.parse(sourceUrl);
}

/**
 * Converts the positive query and excluded terms into one shared Bluesky query string.
 * @param {string} query - Positive search query.
 * @param {string} excludeText - Comma-separated or quoted excluded terms.
 * @returns {string} Combined query string for `searchPosts`.
 */
function buildSharedSearchQuery(query = "", excludeText = "") {
  return buildSharedSearchQueryFromSearch(query, excludeText);
}

/**
 * Splits excluded search terms from free text, commas, semicolons, or quoted phrases.
 * @param {string} value - Raw excluded-term input.
 * @returns {string[]} Clean excluded terms.
 */
function parseExcludedSearchTerms(value = "") {
  return parseExcludedSearchTermsFromSearch(value);
}

/**
 * Builds a stable label for a saved search.
 * @param {object} search - Normalized saved search entry.
 * @returns {string} Human-readable search label.
 */
function buildSavedSearchLabel(search = {}) {
  return savedSearchModels.label(search);
}

/**
 * Builds a compact metadata line for a saved search.
 * @param {object} search - Normalized saved search entry.
 * @returns {string} Metadata summary for list display.
 */
function buildSavedSearchMeta(search = {}) {
  return savedSearchModels.meta(search);
}

/**
 * Normalizes locally saved search entries from settings or backup.
 * @param {Array<object>} searches - Raw saved search entries.
 * @returns {Array<object>} Clean saved search entries.
 */
function normalizeSavedSearches(searches) {
  return savedSearchModels.normalize(searches);
}

/**
 * Finds a saved search by id.
 * @param {string} id - Saved search id.
 * @returns {object|null} Saved search entry or null.
 */
function getSavedSearchById(id) {
  return savedSearchModels.find(savedSearches, id);
}

/**
 * Chooses the best web frontend for a Thread Explorer post author.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {string} Web app base URL.
 */
function getThreadExplorerPostWebApp(post) {
  const handle = String(post?.author?.handle || "").toLowerCase();
  if (handle.endsWith(".eurosky.social") || handle.endsWith(".mu.social")) {
    return LOGIN_SERVICE_PRESETS["mu.social"];
  }

  const favorite = threadExplorerFavorites.find((entry) => entry.rootUri === post?.uri || entry.selectedUri === post?.uri);
  if (favorite?.webApp) {
    return favorite.webApp;
  }

  return DEFAULT_POST_WEB_APP;
}

/**
 * Builds a web URL for a Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {string} Web URL for the post, or an empty string.
 */
function buildThreadExplorerPostWebUrl(post) {
  return buildThreadExplorerPostWebUrlFromData(post, getThreadExplorerPostWebApp(post));
}

/**
 * Returns the currently visible Thread Explorer root post.
 * @returns {object|null} Root post or null.
 */
function getThreadExplorerRootPost() {
  if (!threadExplorerTree?.post) {
    return null;
  }
  return threadExplorerTree.post;
}

/**
 * Checks whether the current Thread Explorer root thread is locally saved.
 * @returns {boolean} True when the visible root thread is in favorites.
 */
function isCurrentThreadExplorerThreadSaved() {
  const rootPost = getThreadExplorerRootPost();
  if (!rootPost?.uri) {
    return false;
  }
  return threadExplorerFavorites.some((favorite) => favorite.rootUri === rootPost.uri);
}

/**
 * Creates a local favorite entry from the currently loaded Thread Explorer tree.
 * @returns {object|null} Favorite entry, or null when no thread is loaded.
 */
function createThreadExplorerFavoriteFromCurrentThread() {
  return buildThreadExplorerFavoriteModel(getThreadExplorerRootPost(), {
    selectedUri: threadExplorerSelectedUri,
    getActorLabel: getThreadExplorerActorLabel, getPreviewText: getThreadExplorerPreviewText,
    getWebApp: getThreadExplorerPostWebApp, now: () => new Date().toISOString(),
  });
}

/**
 * Saves the current Thread Explorer root thread locally.
 * @returns {Promise<void>} Resolves after settings are persisted.
 */
async function saveCurrentThreadExplorerFavorite() {
  const saved = await threadExplorerFavoritesController.save(createThreadExplorerFavoriteFromCurrentThread());
  if (saved) {
    updateThreadExplorerControls();
  }
}

/**
 * Removes a locally saved Thread Explorer favorite.
 * @param {string} rootUri - Root post URI of the favorite to remove.
 * @returns {Promise<void>} Resolves after settings are persisted.
 */
async function removeThreadExplorerFavorite(rootUri) {
  const removed = await threadExplorerFavoritesController.remove(rootUri);
  if (removed) {
    renderSearchResults();
    updateThreadExplorerControls();
    renderThreadExplorerFavoritesDialog();
  }
}

/**
 * Creates one Thread Explorer count button or passive count label.
 * @param {string} type - Count type such as likes, replies, reposts, quotes, or saves.
 * @param {number} value - Numeric count value.
 * @param {boolean} isInteractive - Whether the count opens a popup.
 * @returns {HTMLElement} Rendered count element.
 */
/**
 * Creates one compact interaction button for a live post card.
 * @param {string} translationKey - Translation key for the visible label.
 * @param {object} options - Visual and behavioral options.
 * @param {boolean} options.active - Whether the button should look active.
 * @param {boolean} options.disabled - Whether the button should be disabled.
 * @param {Function} options.onClick - Click handler for the button.
 * @returns {HTMLButtonElement} Ready-to-use action button.
 */
function createThreadExplorerInteractionButton(translationKey, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost-button thread-explorer-inline-action";
  button.textContent = t(translationKey);
  if (options.active === true) {
    button.classList.add("is-active");
  }
  if (options.disabled === true) {
    button.disabled = true;
  }
  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }
  return button;
}

/**
 * Applies one local like-state update to all feed-like item collections.
 * @param {object[]} items - Feed or search result items with nested posts.
 * @param {string} postUri - Post URI that should be updated.
 * @param {string} likeUri - Next like record URI, or an empty string after unlike.
 * @param {number} delta - Count delta that should be applied.
 * @returns {void}
 */
function applyLikeStateToItemCollection(items = [], postUri = "", likeUri = "", delta = 0) {
  if (!Array.isArray(items) || !postUri) {
    return;
  }

  items.forEach((item) => {
    const post = item?.post || null;
    if (!post || post.uri !== postUri) {
      return;
    }
    applyLikeStateToPost(post, likeUri, delta);
  });
}

/**
 * Applies one local like-state update to a Thread Explorer tree.
 * @param {object|null} node - Normalized Thread Explorer tree node.
 * @param {string} postUri - Post URI that should be updated.
 * @param {string} likeUri - Next like record URI, or an empty string after unlike.
 * @param {number} delta - Count delta that should be applied.
 * @returns {void}
 */
function applyLikeStateToThreadTree(node = null, postUri = "", likeUri = "", delta = 0) {
  if (!node || !postUri) {
    return;
  }

  if (node.post?.uri === postUri) {
    applyLikeStateToPost(node.post, likeUri, delta);
  }

  const replies = Array.isArray(node.replies) ? node.replies : [];
  replies.forEach((reply) => {
    applyLikeStateToThreadTree(reply, postUri, likeUri, delta);
  });
}

/**
 * Applies one local like-state update to every known live-post cache.
 * @param {string} postUri - Post URI that should be updated.
 * @param {string} likeUri - Next like record URI, or an empty string after unlike.
 * @param {number} delta - Count delta that should be applied.
 * @returns {void}
 */
function applyLikeStateToKnownPosts(postUri = "", likeUri = "", delta = 0) {
  if (!postUri) {
    return;
  }

  applyLikeStateToItemCollection(threadExplorerItems, postUri, likeUri, delta);
  applyLikeStateToItemCollection(threadExplorerActorFocusItems, postUri, likeUri, delta);
  applyLikeStateToItemCollection(searchResults, postUri, likeUri, delta);
  applyLikeStateToThreadTree(threadExplorerTree, postUri, likeUri, delta);
}

/**
 * Builds a composer reply target directly from one normalized live post.
 * @param {object} post - Normalized live post from search or Thread Explorer.
 * @returns {object|null} Normalized reply target, or null when required fields are missing.
 */
function buildReplyTargetFromLivePost(post = {}) {
  return buildComposerReplyTargetFromPost(post, {
    normalize: normalizeReplyTarget,
    buildWebUrl: buildThreadExplorerPostWebUrl,
  });
}

/**
 * Opens the composer and prepares a direct reply to one live post.
 * @param {object} post - Normalized live post from search or Thread Explorer.
 * @returns {void}
 */
function openComposerReplyForPost(post = {}) {
  openComposerReplyTarget(buildReplyTargetFromLivePost(post), {
    showError: () => showErrorDialog(t("replyTargetResolveFailed")),
    setTarget: (target) => { composerReplyTarget = target; },
    isComposerPage: () => getCurrentThreadlinePage() === THREADLINE_PAGE_COMPOSER,
    persistTarget: persistPendingComposerReplyTarget,
    getComposerUrl: () => buildAppearanceAwarePageSwitchUrl("./"),
    getHref: () => window.location.href,
    encodeTarget: encodeComposerReplyTargetForUrl,
    queryKey: PENDING_COMPOSER_REPLY_TARGET_QUERY_KEY,
    persistNavigation: persistPendingPageSwitchUrl,
    navigate: (href) => { window.location.href = href; },
    showWorkspace: () => showComposerWorkspace({ redirectPage: true }),
    refresh: () => {
      renderReplyTargetCard();
      publishButton.textContent = getPublishButtonLabel();
      updatePublishAvailability();
    },
    saveDraft: queueDraftSave,
    showReady: () => setStatus(t("replyTargetPostReady")),
  });
}

/**
 * Refreshes counts and interaction buttons inside one already rendered live post card.
 * @param {HTMLElement|null} card - Rendered Thread Explorer or search-result post card.
 * @returns {void}
 */
function refreshRenderedLivePostCard(card = null) {
  if (!card) {
    return;
  }

  const post = card._threadExplorerPost || null;
  const counts = card.querySelector(".thread-explorer-post-counts");
  const actions = card.querySelector(".thread-explorer-post-actions");
  const headButtons = card.querySelector(".thread-explorer-post-head-buttons");
  const viewLink = card.querySelector(".thread-explorer-view-link");
  if (!post || !counts || !actions || !headButtons || !viewLink) {
    return;
  }

  const inSearchResult = Boolean(card.closest(".search-result-item"));
  if (inSearchResult) {
    renderSearchResultCounts(post, counts);
  } else {
    renderThreadExplorerCounts(post, counts);
  }
  renderThreadExplorerInteractionActions(post, actions, headButtons, viewLink, {
    renderInHeader: inSearchResult,
  });
}

/**
 * Refreshes every rendered live post card for one specific URI.
 * @param {string} postUri - Post URI that should be refreshed in the DOM.
 * @returns {void}
 */
function refreshRenderedLivePostCards(postUri = "") {
  const normalizedUri = String(postUri || "").trim();
  if (!normalizedUri) {
    return;
  }

  let selectorValue = normalizedUri.replace(/["\\]/g, "\\$&");
  if (window.CSS && typeof window.CSS.escape === "function") {
    selectorValue = window.CSS.escape(normalizedUri);
  }
  document.querySelectorAll(`.thread-explorer-node-item[data-uri="${selectorValue}"] .thread-explorer-post-card`).forEach((card) => {
    refreshRenderedLivePostCard(card);
  });
}

/**
 * Toggles the like state for one live post and updates all known render targets.
 * @param {object} post - Normalized live post from search or Thread Explorer.
 * @returns {Promise<void>} Resolves after the server action completed.
 */
async function toggleLikeForLivePost(post = {}) {
  const postUri = String(post?.uri || "").trim();
  const postCid = String(post?.cid || "").trim();
  if (!postUri || !postCid) {
    return;
  }
  if (threadExplorerLikePendingUris.has(postUri)) {
    return;
  }

  const wasLiked = isPostLikedByViewer(post);
  const previousLikeUri = getViewerLikeUri(post);
  let nextLikeUri = "";
  let delta = 0;

  if (wasLiked) {
    delta = -1;
  } else {
    delta = 1;
    nextLikeUri = `pending:${postUri}`;
  }

  threadExplorerLikePendingUris.add(postUri);
  applyLikeStateToKnownPosts(postUri, nextLikeUri, delta);
  refreshRenderedLivePostCards(postUri);

  try {
    if (wasLiked) {
      await requestPostUnlike(sendToServiceWorker, previousLikeUri);
      applyLikeStateToKnownPosts(postUri, "", 0);
    } else {
      const result = await requestPostLike(sendToServiceWorker, {
        uri: postUri,
        cid: postCid,
      });
      applyLikeStateToKnownPosts(postUri, String(result?.uri || "").trim(), 0);
    }
  } catch (error) {
    applyLikeStateToKnownPosts(postUri, previousLikeUri, delta * -1);
    showErrorDialog(error?.message || t("threadExplorerThreadFailed"));
  } finally {
    threadExplorerLikePendingUris.delete(postUri);
    refreshRenderedLivePostCards(postUri);
  }
}

/**
 * Escapes a string for safe use inside a regular expression.
 * @param {string} value - Raw string to escape.
 * @returns {string} Escaped regular expression literal.
 */
function escapeThreadExplorerRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a compact display URL for Thread Explorer cards.
 * @param {string} url - Full target URL.
 * @returns {string} Short host/path label without tracking query parameters.
 */
function shortenThreadExplorerUrlForDisplay(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    let compact = parsed.hostname;
    if (parsed.pathname && parsed.pathname !== "/") {
      compact += parsed.pathname;
    }
    if (parsed.hash) {
      compact += parsed.hash;
    }
    if (compact.length > 72) {
      return `${compact.slice(0, 69)}...`;
    }
    return compact;
  } catch (error) {
    if (value.length > 72) {
      return `${value.slice(0, 69)}...`;
    }
    return value;
  }
}

/**
 * Removes URL variants for a rendered card from Thread Explorer post text.
 * @param {string} text - Current display text.
 * @param {string} url - Card target URL.
 * @returns {string} Text without duplicate URL fragments.
 */
function removeThreadExplorerCardUrlFromText(text, url) {
  let nextText = String(text || "");
  const value = String(url || "").trim();
  if (!nextText || !value) {
    return nextText;
  }

  const variants = new Set([value]);
  try {
    const parsed = new URL(value);
    let hostPath = parsed.hostname;
    if (parsed.pathname && parsed.pathname !== "/") {
      hostPath += parsed.pathname;
    }
    variants.add(hostPath);
    if (hostPath.startsWith("www.")) {
      variants.add(hostPath.slice(4));
    } else {
      variants.add(`www.${hostPath}`);
    }
  } catch (error) {
    // Keep exact variant only.
  }

  variants.forEach((variant) => {
    if (!variant) {
      return;
    }
    const escaped = escapeThreadExplorerRegExp(variant);
    const exactPattern = new RegExp(`(^|\\s)(?:https?:\\/\\/)?${escaped}(?:[?#][^\\s]*)?(?:\\.\\.\\.|…)?(?=\\s|$)`, "g");
    nextText = nextText.replace(exactPattern, "$1");
  });

  try {
    const parsed = new URL(value);
    let hostPattern = escapeThreadExplorerRegExp(parsed.hostname);
    if (parsed.hostname.startsWith("www.")) {
      hostPattern = `(?:www\\.)?${escapeThreadExplorerRegExp(parsed.hostname.slice(4))}`;
    }
    const linePattern = new RegExp(`(^|\\n)[ \\t]*(?:https?:\\/\\/)?${hostPattern}(?:\\/[^\\n\\s]*)?(?:\\.\\.\\.|…)?[ \\t]*(?=\\n|$)`, "g");
    nextText = nextText.replace(linePattern, "$1");
  } catch (error) {
    // Invalid URLs do not get hostname line cleanup.
  }

  return nextText;
}

/**
 * Returns the visible quote-post URLs that should be removed from rendered text.
 * @param {object|null} quote - Normalized quoted post.
 * @returns {string[]} Visible quote URL variants.
 */
function getThreadExplorerQuoteUrls(quote = null) {
  const quoteUrls = new Set();
  const quoteUrl = buildThreadExplorerPostWebUrl(quote);
  if (quoteUrl) {
    quoteUrls.add(quoteUrl);
  }

  const quoteHandle = String(quote?.author?.handle || "").trim();
  const quoteRecordKey = getThreadExplorerPostRecordKey(quote?.uri);
  if (quoteHandle && quoteRecordKey) {
    quoteUrls.add(`${DEFAULT_POST_WEB_APP}/profile/${encodeURIComponent(quoteHandle)}/post/${encodeURIComponent(quoteRecordKey)}`);
    quoteUrls.add(`${LOGIN_SERVICE_PRESETS["mu.social"]}/profile/${encodeURIComponent(quoteHandle)}/post/${encodeURIComponent(quoteRecordKey)}`);
  }

  return Array.from(quoteUrls);
}

/**
 * Returns the prepared display model for one Thread Explorer external card.
 * @param {object|null} externalCard - External card data from a live post.
 * @returns {{url: string, title: string, description: string, thumb: string, displayUrl: string, footer: string, standardSite: object|null, isPublication: boolean}|null} Prepared card display model.
 */
function getThreadExplorerExternalCardDisplayModel(externalCard = null) {
  return buildExternalCardDisplayModel(externalCard, {
    normalizeStandardSite: normalizeStandardSiteMetadata,
    getPublicationFooterLabel: getPublicationCardFooterLabel,
    shortenUrl: shortenThreadExplorerUrlForDisplay,
  });
}

/**
 * Returns the prepared display model for one visible Thread Explorer post card.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {string[]} interactiveMetricTypes - Metric types that should open follow-up UI.
 * @returns {{uri: string, isDeletedThreadAnchor: boolean, authorLabel: string, handleLabel: string, metaText: string, text: string, externalCardDisplay: object|null, metricEntries: Array<object>}|null} Prepared post card display model.
 */
function getThreadExplorerPostCardDisplayModel(post, interactiveMetricTypes = []) {
  return buildPostCardDisplayModel(post, {
    fallbackAuthorLabel: t("threadExplorerUnknownAuthor"),
    noTextFallback: t("threadExplorerNoText"),
    deletedTitle: t("threadExplorerDeletedThreadTitle"),
    deletedText: t("threadExplorerDeletedThreadText"),
    getAuthorFields: getLocalizedPostAuthorFields,
    buildMetaText(nextPost) {
      return buildPostMetaText(nextPost, {
        formatDate: formatThreadExplorerDate,
      });
    },
    buildDisplayText: getThreadExplorerPostDisplayText,
    buildExternalCardDisplay: getThreadExplorerExternalCardDisplayModel,
    buildMetricEntries: getLocalizedPostMetricEntries,
    interactiveMetricTypes,
  });
}

/**
 * Returns the prepared display model for one visible search-result post card.
 * @param {object} item - Normalized search result item with nested post.
 * @returns {{uri: string, isDeletedThreadAnchor: boolean, authorLabel: string, handleLabel: string, metaText: string, text: string, externalCardDisplay: object|null, metricEntries: Array<object>}|null} Prepared post card display model.
 */
function getSearchResultPostCardDisplayModel(item = {}) {
  const post = item?.post || null;
  return buildPostCardDisplayModel(post, {
    fallbackAuthorLabel: t("threadExplorerUnknownAuthor"),
    noTextFallback: t("threadExplorerNoText"),
    deletedTitle: t("threadExplorerDeletedThreadTitle"),
    deletedText: t("threadExplorerDeletedThreadText"),
    getAuthorFields: getLocalizedPostAuthorFields,
    buildMetaText() {
      return buildSearchResultMetaText(item);
    },
    buildDisplayText: getThreadExplorerPostDisplayText,
    buildExternalCardDisplay: getThreadExplorerExternalCardDisplayModel,
    buildMetricEntries: getLocalizedPostMetricEntries,
    interactiveMetricTypes: [
      "Likes",
      "Reposts",
      "Quotes",
    ],
  });
}

/**
 * Removes the external card URL from post text before rendering the card.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {string} Display text without a duplicate link-card URL.
 */
function getThreadExplorerPostDisplayText(post) {
  return buildPostDisplayText(post, {
    stripUrlFromText: removeThreadExplorerCardUrlFromText,
    getQuoteUrls: getThreadExplorerQuoteUrls,
  });
}

/**
 * Opens the existing post edit dialog for a Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post with editInfo.
 * @returns {void}
 */
function openThreadExplorerPostEditDialog(post) {
  const editInfo = post?.editInfo || null;
  if (!editInfo?.isEdited) {
    return;
  }

  resetPostEditCheckResult();
  postEditCheckUrlInput.value = buildThreadExplorerPostWebUrl(post);
  renderPostEditCheckResult({
    isEdited: true,
    createdAt: editInfo.createdAt || post.createdAt || "",
    updatedAt: editInfo.updatedAt || "",
    originalText: editInfo.originalText || "",
    text: editInfo.text || post.text || "",
  });
  postEditCheckDialog.showModal();
}

/**
 * Handles a Thread Explorer edit marker click.
 * @param {Event} event - Click event from a Thread Explorer edit button.
 * @returns {void}
 */
function handleThreadExplorerEditButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const uri = String(event.currentTarget?.dataset?.uri || "").trim();
  const node = findThreadExplorerTreeNode(threadExplorerTree, uri);
  if (node?.post) {
    openThreadExplorerPostEditDialog(node.post);
    return;
  }

  const searchResult = findSearchResultByUri(uri);
  openThreadExplorerPostEditDialog(searchResult?.post || null);
}

/**
 * Finds a rendered search result entry by post URI.
 * @param {string} uri - AT URI of the post.
 * @returns {object|null} Matching search result item or null.
 */
function findSearchResultByUri(uri) {
  const normalizedUri = String(uri || "").trim();
  if (!normalizedUri) {
    return null;
  }

  return searchResults.find((item) => {
    return item?.post?.uri === normalizedUri;
  }) || null;
}

/**
 * Renders the local Thread Explorer favorites dialog.
 * @returns {void}
 */
function renderThreadExplorerFavoritesDialog() {
  renderThreadExplorerFavorites({
    list: threadExplorerFavoritesList, status: threadExplorerFavoritesStatus, favorites: threadExplorerFavorites,
    template: threadExplorerFavoriteItemTemplate, cloneTemplate: cloneTemplateContent,
    translate: t, formatCount, formatDate: formatThreadExplorerDate, applyTranslatedTitle,
    onLoad: handleThreadExplorerFavoriteLoadClick, onRemove: handleThreadExplorerFavoriteRemoveClick,
  });
}

/**
 * Opens the local Thread Explorer favorites dialog.
 * @returns {void}
 */
function openThreadExplorerFavoritesDialog() {
  renderThreadExplorerFavoritesDialog();
  threadExplorerFavoritesDialog.showModal();
}

/**
 * Renders the shared saved-searches dialog.
 * @returns {void}
 */
function renderSavedSearchesDialog() {
  renderSavedSearches({
    list: savedSearchesList, status: savedSearchesStatus, searches: savedSearches,
    template: savedSearchItemTemplate, cloneTemplate: cloneTemplateContent, translate: t, formatCount,
    applyTranslatedTitle, buildLabel: buildSavedSearchLabel, buildMeta: buildSavedSearchMeta,
    onLoad: handleSavedSearchLoadClick, onRemove: handleSavedSearchRemoveClick,
  });
}

/**
 * Opens the shared saved-searches dialog for a workspace context.
 * @param {string} context - Either "threadExplorer", "archive", or "search".
 * @returns {void}
 */
function openSavedSearchesDialog(context = "threadExplorer") {
  savedSearchDialogContext = configureSavedSearchesDialog(context, {
    note: savedSearchesNote, urlField: savedSearchUrlField, actions: savedSearchesActions,
    input: savedSearchUrlInput, translate: t,
  });
  renderSavedSearchesDialog();
  savedSearchesDialog.showModal();
}

/**
 * Saves the current live search form for later reuse.
 * @returns {Promise<void>} Resolves after settings were persisted.
 */
async function saveCurrentSearchPreferences() {
  return savedSearchController.save();
}

/**
 * Adds a shared Bluesky search URL to local saved searches.
 * @returns {Promise<void>} Resolves after settings are persisted.
 */
async function addSavedSearchFromInput() {
  return savedSearchController.addUrl(savedSearchUrlInput.value);
}

/**
 * Removes a locally saved search.
 * @param {string} id - Saved search id.
 * @returns {Promise<void>} Resolves after settings are persisted.
 */
async function removeSavedSearch(id) {
  return savedSearchController.remove(id);
}

/**
 * Loads a saved search into the Thread Explorer result list.
 * @param {string} id - Saved search id.
 * @returns {Promise<void>} Resolves after the search source starts loading.
 */
async function loadSavedSearchInThreadExplorer(id) {
  return savedSearchController.load(id, "threadExplorer");
}

/**
 * Applies a saved search to the archive special tools area.
 * @param {string} id - Saved search id.
 * @returns {Promise<void>} Resolves after archive preferences are persisted.
 */
async function loadSavedSearchInArchive(id) {
  return savedSearchController.load(id, "archive");
}

/**
 * Loads a saved search back into the live search workspace.
 * @param {string} id - Saved search id.
 * @returns {Promise<void>} Resolves after the search form was updated.
 */
async function loadSavedSearchInSearchWorkspace(id) {
  return savedSearchController.load(id, "search");
}

/**
 * Renders actors or quote authors into the Thread Explorer reactions dialog.
 * @param {Array<object>} actors - Actor entries from the Service Worker.
 * @returns {void}
 */
function renderThreadExplorerReactionActors(actors) {
  renderThreadExplorerReactionActorsFromRendering(actors, {
    list: threadExplorerReactionsList,
    status: threadExplorerReactionsStatus,
    template: threadExplorerActorItemTemplate,
    translate: t,
    formatCount,
    cloneTemplate: cloneTemplateContent,
    setAvatar: setAvatarImage,
  });
}

/**
 * Opens and loads the reactions dialog for a Thread Explorer post count.
 * @param {string} type - Reaction type: Likes, Reposts, or Quotes.
 * @param {string} uri - Post URI.
 * @param {string} cid - Optional post CID.
 * @returns {Promise<void>} Resolves after the dialog renders.
 */
async function openThreadExplorerReactionsDialog(type, uri, cid) {
  if (threadExplorerReactionsLoading) {
    return;
  }

  const normalizedType = String(type || "").trim();
  const normalizedUri = String(uri || "").trim();
  if (!normalizedType || !normalizedUri) {
    return;
  }

  await loadThreadExplorerReactionsDialogFromRendering(normalizedType, normalizedUri, cid, {
    title: threadExplorerReactionsTitle,
    status: threadExplorerReactionsStatus,
    list: threadExplorerReactionsList,
    dialog: threadExplorerReactionsDialog,
    translate: t,
    request: sendToServiceWorker,
    template: threadExplorerActorItemTemplate,
    formatCount,
    cloneTemplate: cloneTemplateContent,
    setAvatar: setAvatarImage,
    setLoading: (value) => {
      threadExplorerReactionsLoading = value;
    },
  });
}

/**
 * Renders loaded replies for a Thread Explorer post into the replies dialog.
 * @param {object|null} node - Normalized tree node whose replies should be listed.
 * @returns {void}
 */
function renderThreadExplorerRepliesDialog(node) {
  renderThreadExplorerReplies(node, {
    list: threadExplorerRepliesList, title: threadExplorerRepliesTitle, status: threadExplorerRepliesStatus,
    template: threadExplorerActorItemTemplate, cloneTemplate: cloneTemplateContent, translate: t,
    formatCount, setAvatar: setAvatarImage, getActorLabel: getThreadExplorerActorLabel,
    /** Selects one already-loaded reply and closes its dialog.
     * @param {string} uri - Reply URI.
     * @returns {void}
     */
    selectReply(uri) {
      threadExplorerSelectedUri = uri;
      persistThreadExplorerSelectionPreference(uri);
      renderThreadExplorerWorkspace();
      window.requestAnimationFrame(focusSelectedThreadExplorerNode);
      threadExplorerRepliesDialog.close();
    },
  });
}

/**
 * Opens a popup with replies already loaded in the current Thread Explorer tree.
 * @param {string} uri - AT URI of the post whose replies should be shown.
 * @returns {void}
 */
function openThreadExplorerRepliesDialog(uri) {
  const node = findThreadExplorerTreeNode(threadExplorerTree, uri);
  renderThreadExplorerRepliesDialog(node);
  threadExplorerRepliesDialog.showModal();
}

/**
 * Updates the visible image and selected thumbnail in the Thread Explorer gallery.
 * @returns {void}
 */
function renderThreadExplorerGalleryImage() {
  threadExplorerGalleryController.render();
}

/**
 * Hides a failed Thread Explorer post image and redraws tree edges.
 * @param {Event} event - Image error event from an inline post image.
 * @returns {void}
 */
function handleThreadExplorerPostImageError(event) {
  const image = event.currentTarget;
  const figure = image.closest(".thread-explorer-image");
  image.removeAttribute("src");
  if (figure) {
    figure.hidden = true;
  }
  refreshThreadExplorerRenderedGeometry();
}

/**
 * Hides a failed Thread Explorer quoted post image preview.
 * @param {Event} event - Image error event from a quoted post image.
 * @returns {void}
 */
function handleThreadExplorerQuoteImageError(event) {
  const image = event.currentTarget;
  image.removeAttribute("src");
  image.hidden = true;
  refreshThreadExplorerRenderedGeometry();
}

/**
 * Hides a failed Thread Explorer gallery thumbnail.
 * @param {Event} event - Image error event from a gallery thumbnail.
 * @returns {void}
 */
function handleThreadExplorerGalleryThumbError(event) {
  const image = event.currentTarget;
  const button = image.closest(".thread-explorer-gallery-thumb");
  image.removeAttribute("src");
  if (button) {
    button.hidden = true;
  }
}

/**
 * Falls back from fullsize to thumbnail in the Thread Explorer image gallery.
 * @param {Event} event - Image error event from the large gallery image.
 * @returns {void}
 */
function handleThreadExplorerGalleryImageError(event) {
  const imageElement = event.currentTarget;
  const image = threadExplorerGalleryController.getCurrent();
  const fallbackDecision = getThreadExplorerGalleryFallbackDecision(
    image,
    imageElement.dataset.fallbackAttempted === "true",
  );
  imageElement.dataset.fallbackAttempted = String(fallbackDecision.fallbackAttempted);
  if (fallbackDecision.shouldHide) {
    imageElement.hidden = true;
    return;
  }
  imageElement.src = fallbackDecision.source;
}

/**
 * Opens the Thread Explorer gallery at a selected image index.
 * @param {Array<object>} images - Post images to render.
 * @param {number} startIndex - Selected image index.
 * @returns {void}
 */
function openThreadExplorerGallery(images, startIndex) {
  threadExplorerGalleryController.open(images, startIndex);
}

/**
 * Handles left and right keyboard navigation while the Thread Explorer gallery is open.
 * @param {KeyboardEvent} event - Keyboard event emitted for the gallery dialog.
 * @returns {void}
 */
function handleThreadExplorerGalleryKeydown(event) {
  threadExplorerGalleryFullscreenController.keydown(event);
}

/**
 * Opens the current Thread Explorer gallery image through the Fullscreen API.
 * @returns {Promise<void>} Resolves after the fullscreen request is attempted.
 */
async function openThreadExplorerGalleryFullscreen() {
  await threadExplorerGalleryFullscreenController.open();
}

/**
 * Closes Thread Explorer gallery fullscreen first, then falls back to closing the dialog.
 * @returns {Promise<void>} Resolves after fullscreen or dialog close was attempted.
 */
async function closeThreadExplorerGalleryOverlay() {
  await threadExplorerGalleryFullscreenController.close();
}

/**
 * Toggles the Thread Explorer in-app fullscreen fallback for browsers without element fullscreen.
 * @param {boolean} enabled - True when the gallery image should cover the full viewport.
 * @returns {void}
 */
function setThreadExplorerGalleryPseudoFullscreen(enabled) {
  threadExplorerGalleryFullscreenController.setFallback(enabled);
}

/**
 * Computes an engagement score for one Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {number} Weighted score from likes, replies, reposts, and quotes.
 */
function getThreadExplorerEngagementScore(post) {
  const likes = Number(post?.likeCount) || 0;
  const replies = Number(post?.replyCount) || 0;
  const reposts = Number(post?.repostCount) || 0;
  const quotes = Number(post?.quoteCount) || 0;
  return likes + (replies * 3) + (reposts * 4) + (quotes * 4);
}

/**
 * Converts an engagement score into a visual intensity tier.
 * @param {number} score - Weighted post engagement score.
 * @returns {string} Engagement tier name for CSS classes.
 */
function getThreadExplorerEngagementTier(score) {
  const numericScore = Number(score) || 0;
  if (numericScore >= 1000) {
    return "viral";
  }
  if (numericScore >= 180) {
    return "hot";
  }
  if (numericScore >= 40) {
    return "warm";
  }
  return "quiet";
}

/**
 * Returns direct rendered child node items for a Thread Explorer item.
 * @param {HTMLElement} item - Rendered Thread Explorer node item.
 * @returns {HTMLElement[]} Direct child node items.
 */
function getRenderedThreadExplorerChildItems(item) {
  const childrenList = item.querySelector(":scope > .thread-explorer-children");
  if (!childrenList) {
    return [];
  }
  return Array.from(childrenList.children).filter((child) => child.classList.contains("thread-explorer-node-item"));
}

/**
 * Returns the visible post card for a rendered Thread Explorer item.
 * @param {HTMLElement} item - Rendered Thread Explorer node item.
 * @returns {HTMLElement|null} Direct post card element, or null.
 */
function getRenderedThreadExplorerCard(item) {
  return item.querySelector(":scope > .thread-explorer-node > .thread-explorer-post-card");
}

/**
 * Returns an element rectangle in unzoomed Thread Explorer stage coordinates.
 * @param {HTMLElement} element - Element to measure.
 * @param {DOMRect} stageRect - Stage viewport rectangle.
 * @returns {object} Rectangle with position and center values.
 */
function getThreadExplorerStageRect(element, stageRect) {
  const elementRect = element.getBoundingClientRect();
  let zoom = Number(threadExplorerZoom) || 1;
  if (zoom <= 0) {
    zoom = 1;
  }

  const left = (elementRect.left - stageRect.left) / zoom;
  const top = (elementRect.top - stageRect.top) / zoom;
  const width = elementRect.width / zoom;
  const height = elementRect.height / zoom;
  const right = left + width;
  const bottom = top + height;
  const centerX = left + (width / 2);
  const centerY = top + (height / 2);
  return {
    left,
    top,
    width,
    height,
    right,
    bottom,
    centerX,
    centerY,
  };
}

/**
 * Builds a curved SVG path between two rendered Thread Explorer cards.
 * @param {object} parentRect - Parent card rectangle in stage coordinates.
 * @param {object} childRect - Child card rectangle in stage coordinates.
 * @returns {string} SVG path data.
 */
function createThreadExplorerEdgePath(parentRect, childRect) {
  if (threadExplorerOrientation === THREAD_EXPLORER_ORIENTATION_HORIZONTAL) {
    const startX = parentRect.right;
    const startY = parentRect.centerY;
    const endX = childRect.left;
    const endY = childRect.centerY;
    const distance = Math.max(72, Math.abs(endX - startX));
    const controlOffset = Math.max(48, distance * 0.42);
    return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
  }

  const startX = parentRect.centerX;
  const startY = parentRect.bottom;
  const endX = childRect.centerX;
  const endY = childRect.top;
  const distance = Math.max(60, Math.abs(endY - startY));
  const controlOffset = Math.max(36, distance * 0.45);
  return `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;
}

/**
 * Schedules a redraw of Thread Explorer SVG edges after layout settles.
 * @returns {void}
 */
function scheduleThreadExplorerEdgeRender() {
  threadExplorerRenderScheduler.scheduleEdges();
}

/**
 * Removes the current Thread Explorer SVG edge layer.
 * @returns {void}
 */
function clearThreadExplorerEdges() {
  const existingLayer = threadExplorerThreadStage.querySelector(":scope > .thread-explorer-edge-layer");
  if (existingLayer) {
    existingLayer.remove();
  }
}

/**
 * Enables or disables the lightweight panning mode for the Thread Explorer.
 * @param {boolean} active - Whether the viewport is currently being panned.
 * @returns {void}
 */
function setThreadExplorerPanningMode(active) {
  setThreadExplorerPanningModeFromTools({
    tree: threadExplorerThreadTree,
    stage: threadExplorerThreadStage,
  }, active);
}

/**
 * Stops any running inertial panning animation in the Thread Explorer.
 * @returns {void}
 */
function cancelThreadExplorerPanInertia() {
  threadExplorerPanController.cancel();
}

/**
 * Applies one scroll delta to the Thread Explorer viewport.
 * @param {number} deltaX - Horizontal movement delta in CSS pixels.
 * @param {number} deltaY - Vertical movement delta in CSS pixels.
 * @returns {void}
 */
function applyThreadExplorerScrollDelta(deltaX, deltaY) {
  if (!threadExplorerThreadTree) {
    return;
  }
  const panState = applyThreadExplorerPanDeltaFromTools({ panX: threadExplorerPanX, panY: threadExplorerPanY }, deltaX, deltaY);
  threadExplorerPanX = panState.panX;
  threadExplorerPanY = panState.panY;
  threadExplorerController.setViewport(threadExplorerZoom, threadExplorerPanX, threadExplorerPanY);
  applyThreadExplorerStageTransform();
}

/**
 * Updates the recent pan velocity sample for inertial Thread Explorer panning.
 * @param {object} state - Active drag state.
 * @param {PointerEvent} event - Current pointer move event.
 * @returns {void}
 */
function updateThreadExplorerPanVelocity(state, event) {
  updateThreadExplorerPanVelocityFromTools(state, event);
}

/**
 * Starts inertial panning after the pointer was released from the Thread Explorer.
 * @returns {void}
 */
function startThreadExplorerPanInertia() {
  threadExplorerPanController.start();
}

/**
 * Renders curved SVG edges between visible Thread Explorer parent and child cards.
 * @returns {void}
 */
function renderThreadExplorerEdges() {
  const rootItem = threadExplorerThreadStage.querySelector(":scope > ul > .thread-explorer-node-item");
  renderThreadExplorerTreeEdgesFromTools({
    stage: threadExplorerThreadStage,
    tree: threadExplorerTree,
    clusterMode: isThreadExplorerReplyClusterModeActive(),
    rootItem,
    clearEdges: clearThreadExplorerEdges,
    getCard: getRenderedThreadExplorerCard,
    getChildren: getRenderedThreadExplorerChildItems,
    getStageRect: getThreadExplorerStageRect,
    createEdgePath: createThreadExplorerEdgePath,
    createSvgNode,
  });
}

/**
 * Sets the active Thread Explorer source and refreshes the feed.
 * @param {string} source - Either "follows" or "mutuals".
 * @returns {void}
 */
function setThreadExplorerSource(source) {
  threadExplorerSource = normalizeThreadExplorerSource(source);
  threadExplorerController.setSource(threadExplorerSource);
  threadExplorerCursor = "";
  threadExplorerHasMore = true;
  threadExplorerItems = [];
  threadExplorerSelectedUri = "";
  threadExplorerTree = null;
  clearThreadExplorerRenderedMediaCache();
  threadExplorerFeedError = "";
  threadExplorerThreadError = "";
  clearThreadExplorerSelectionPreference();
  renderThreadExplorerWorkspace();
  void loadThreadExplorerFeed({ reset: true });
}

/**
 * Renders the pinned-feed dropdown options for the Thread Explorer.
 * @returns {void}
 */
function renderThreadExplorerFeedSourceSelect() {
  let activeSource = "";
  if (getThreadExplorerFeedUriFromSource(threadExplorerSource)) {
    activeSource = normalizeThreadExplorerSource(threadExplorerSource);
  }
  renderThreadExplorerFeedSources({
    select: threadExplorerFeedSelect, template: threadExplorerFeedOptionTemplate, cloneTemplate: cloneTemplateContent,
    feeds: threadExplorerFeedSources, buildSource: buildThreadExplorerFeedSource, activeSource,
    placeholder: t("threadExplorerFeedPickerPlaceholder"),
    disabled: !authAccount || threadExplorerFeedSourcesLoading || isThreadExplorerForeignAccountMode(),
  });
}

/**
 * Resolves which Thread Explorer post should be opened after a feed load.
 * @param {object} options - Selection behavior flags.
 * @param {boolean} options.allowStoredOutsideFeed - Whether a saved URI may be opened even if it is not in the feed slice.
 * @returns {string} Current, stored, first feed, or empty selected URI.
 */
function getThreadExplorerPreferredSelectionUri(options = {}) {
  return resolveThreadExplorerSelection({
    currentUri: threadExplorerSelectedUri, items: threadExplorerItems,
    readStoredSelection: getStoredThreadExplorerSelectionPreference,
    allowStoredOutsideFeed: options.allowStoredOutsideFeed === true,
  });
}

/**
 * Returns the best avatar URL for a Thread Explorer actor.
 * @param {object} actor - Normalized Thread Explorer actor.
 * @returns {string} Cached data URI, remote avatar URL, or an empty string.
 */
function getThreadExplorerActorAvatarUri(actor = {}) {
  return getThreadExplorerActorAvatarUriFromHydration(actor);
}

/**
 * Adds cache lookup metadata to a Thread Explorer avatar image.
 * @param {HTMLImageElement|null} image - Avatar image element.
 * @param {object} actor - Normalized Thread Explorer actor.
 * @returns {void}
 */
function markThreadExplorerAvatarImage(image, actor = {}) {
  markThreadExplorerAvatarImageFromHydration(image, actor);
}

/**
 * Applies cached avatar data URIs to matching authors in the Thread Explorer tree.
 * @param {object|null} node - Thread Explorer tree node.
 * @param {object} avatars - Map-like object keyed by actor DID.
 * @returns {void}
 */
function applyThreadExplorerAvatarHydration(node = null, avatars = {}) {
  applyThreadExplorerAvatarHydrationToTree(node, avatars);
}

/**
 * Applies cached avatar data URIs from the local cache to a Thread Explorer tree.
 * @param {object|null} node - Thread Explorer tree node.
 * @returns {void}
 */
function applyThreadExplorerAvatarCacheToTree(node = null) {
  applyThreadExplorerAvatarCacheToTreeFromHydration(node, accountAvatarAssets, assetToDataUri);
}

/**
 * Hydrates avatars for the currently loaded Thread Explorer tree through the service worker cache.
 * @param {object|null} root - Thread Explorer root node.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<void>} Resolves after cached avatar data URIs were applied.
 */
async function hydrateThreadExplorerTreeAvatars(root = null, onProgress = async () => {}, signal = null) {
  await hydrateThreadExplorerAvatars(root, {
    signal, onProgress, request: sendToServiceWorker, translate: t,
    throwIfAborted: throwIfThreadExplorerSnapshotAborted,
    applyAvatars: applyThreadExplorerAvatarHydration,
    onError(error) {
      console.warn("Thread Explorer avatar hydration failed.", error);
    },
  });
}

/**
 * Hydrates remote media images for the current Thread Explorer snapshot.
 * @param {object|null} root - Thread Explorer root node.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<void>} Resolves after media data URIs were prepared.
 */
async function hydrateThreadExplorerSnapshotMedia(root = null, onProgress = async () => {}, signal = null) {
  threadExplorerSnapshotMediaDataUris = new Map();
  await hydrateThreadExplorerSnapshotMediaFromTools(root, {
    signal, onProgress, translate: t,
    request(currentRoot, requestOptions) {
      return requestThreadExplorerMediaHydration(sendToServiceWorker, currentRoot, requestOptions);
    },
    throwIfAborted: throwIfThreadExplorerSnapshotAborted,
    onError(error) {
      console.warn("Thread Explorer media hydration failed.", error);
    },
    onMedia: storeThreadExplorerHydratedMedia,
  });
}

/**
 * Stores media returned by the Service Worker in the shared Thread Explorer media cache.
 * @param {object|null} media - Map-like object from original media URL to data URI.
 * @returns {number} Number of cached media entries.
 */
function storeThreadExplorerHydratedMedia(media = null) {
  let storedCount = 0;
  normalizeThreadExplorerHydratedMedia(media).forEach((entry) => {
    threadExplorerSnapshotMediaDataUris.set(entry.source, entry.dataUri);
    storeThreadExplorerRenderedMediaDataUri([entry.source], entry.dataUri);
    storedCount += 1;
  });
  return storedCount;
}

/**
 * Returns whether any modal dialog is currently open.
 * @returns {boolean} True when at least one dialog element is open.
 */
function hasOpenDialog() {
  return Boolean(document.querySelector("dialog[open]"));
}

/**
 * Enables or disables the Thread Explorer fullscreen reading mode.
 * @param {boolean} nextFullscreen - Desired fullscreen state.
 * @returns {void}
 */
function setThreadExplorerFullscreen(nextFullscreen) {
  const isFullscreen = nextFullscreen === true;
  if (threadExplorerFullscreen === isFullscreen) {
    return;
  }
  threadExplorerFullscreen = isFullscreen;
  applyThreadExplorerFullscreenState();
  updateThreadExplorerControls();
  scheduleThreadExplorerEdgeRender();
}

/**
 * Toggles the Thread Explorer fullscreen reading mode.
 * @returns {void}
 */
function toggleThreadExplorerFullscreen() {
  if (threadExplorerFullscreen === true) {
    setThreadExplorerFullscreen(false);
    return;
  }
  setThreadExplorerFullscreen(true);
}

/**
 * Updates Thread Explorer toolbar controls and status text.
 * @returns {void}
 */
function updateThreadExplorerControls() {
  renderThreadExplorerControls({
    threadExplorerUrlButton,
    threadExplorerSearchesButton,
    archiveSavedSearchesButton,
    threadExplorerRefreshButton,
    threadExplorerAccountInput,
    threadExplorerUseOwnAccountButton,
    threadExplorerSourceField,
    threadExplorerAccountField,
    threadExplorerAccountModeField,
    threadExplorerAccountModeSelect,
    threadExplorerFeedPickerField,
    threadExplorerFeedStatus,
    threadExplorerFeedList,
    threadExplorerRootButton,
    threadExplorerReloadThreadButton,
    threadExplorerSnapshotPngButton,
    threadExplorerSaveButton,
    threadExplorerFavoritesButton,
    threadExplorerZoomOutButton,
    threadExplorerZoomResetButton,
    threadExplorerZoomInButton,
    threadExplorerViewModeButton,
    threadExplorerOrientationButton,
    threadExplorerFullscreenButton,
    threadExplorerCollapseButton,
    threadExplorerExpandButton,
    threadExplorerFullscreenCloseButton,
    threadExplorerSourceSelect,
  }, {
    authenticated: Boolean(authAccount), loadingThread: threadExplorerLoadingThread, loadingFeed: threadExplorerLoadingFeed,
    foreignAccount: isThreadExplorerForeignAccountMode(), actorFocus: isThreadExplorerForeignActorFocusMode(),
    clusterMode: isThreadExplorerReplyClusterModeActive(), saved: isCurrentThreadExplorerThreadSaved(),
    accountActor: normalizeThreadExplorerActor(threadExplorerAccountActor), accountMode: normalizeThreadExplorerAccountMode(threadExplorerAccountMode),
    horizontal: threadExplorerOrientation === THREAD_EXPLORER_ORIENTATION_HORIZONTAL,
    hasTree: Boolean(threadExplorerTree), selectedUri: threadExplorerSelectedUri, fullscreen: threadExplorerFullscreen,
    zoom: threadExplorerZoom, source: threadExplorerSource,
  }, { translate: t, renderAccountNote: renderThreadExplorerAccountNote, renderFeedSources: renderThreadExplorerFeedSourceSelect });
}

/**
 * Renders the live Thread Explorer workspace.
 * @returns {void}
 */
function renderThreadExplorerWorkspace() {
  renderThreadExplorerWorkspaceFromController({
    applyFullscreen: applyThreadExplorerFullscreenState,
    applyOrientation: applyThreadExplorerOrientation,
    updateControls: updateThreadExplorerControls,
    renderFeed: renderThreadExplorerFeed,
    renderTree: renderThreadExplorerTree,
  });
}

/**
 * Loads pinned feed sources for the Thread Explorer dropdown.
 * @returns {Promise<void>} Resolves when the dropdown sources are available.
 */
async function loadThreadExplorerFeedSources() {
  await threadExplorerFeedSourcesController.load();
}

/**
 * Applies the current Thread Explorer orientation to the tree viewport.
 * @returns {void}
 */
function applyThreadExplorerOrientation() {
  const isHorizontal = threadExplorerOrientation === THREAD_EXPLORER_ORIENTATION_HORIZONTAL;
  threadExplorerThreadTree.classList.toggle("is-horizontal", isHorizontal);
  threadExplorerThreadTree.classList.toggle("is-vertical", !isHorizontal);
  threadExplorerThreadStage.classList.toggle("is-horizontal", isHorizontal);
  threadExplorerThreadStage.classList.toggle("is-vertical", !isHorizontal);
  threadExplorerThreadTree.classList.toggle("is-reply-cluster-mode", isThreadExplorerReplyClusterModeActive());
  threadExplorerThreadStage.classList.toggle("is-reply-cluster-mode", isThreadExplorerReplyClusterModeActive());
}

/**
 * Synchronizes page coordinates and the Thread Explorer viewport state controller.
 * @param {object} viewport - Zoom, panX and panY coordinates.
 * @returns {void}
 */
function setThreadExplorerViewport(viewport) {
  threadExplorerZoom = viewport.zoom;
  threadExplorerPanX = viewport.panX;
  threadExplorerPanY = viewport.panY;
  threadExplorerController.setViewport(viewport.zoom, viewport.panX, viewport.panY);
}

/**
 * Applies the current Thread Explorer pan and zoom to the stage element.
 * @returns {void}
 */
function applyThreadExplorerStageTransform() {
  threadExplorerThreadStage.style.setProperty("--thread-explorer-zoom", String(threadExplorerZoom));
  threadExplorerThreadStage.style.setProperty("--thread-explorer-pan-x", `${threadExplorerPanX}px`);
  threadExplorerThreadStage.style.setProperty("--thread-explorer-pan-y", `${threadExplorerPanY}px`);
  threadExplorerZoomResetButton.textContent = `${Math.round(threadExplorerZoom * 100)}%`;
}

/**
 * Sets the Thread Explorer zoom level within supported bounds.
 * @param {number} nextZoom - Desired zoom factor.
 * @returns {void}
 */
function setThreadExplorerZoom(nextZoom) {
  threadExplorerZoomController.setZoom(nextZoom);
}

/**
 * Switches the Thread Explorer between vertical and horizontal tree layout.
 * @returns {void}
 */
function toggleThreadExplorerOrientation() {
  if (isThreadExplorerReplyClusterModeActive()) {
    return;
  }
  if (threadExplorerOrientation === THREAD_EXPLORER_ORIENTATION_HORIZONTAL) {
    threadExplorerOrientation = THREAD_EXPLORER_ORIENTATION_VERTICAL;
  } else {
    threadExplorerOrientation = THREAD_EXPLORER_ORIENTATION_HORIZONTAL;
  }
  persistThreadExplorerOrientationPreference(threadExplorerOrientation);
  renderThreadExplorerWorkspace();
  if (threadExplorerTree) {
    scheduleThreadExplorerSelectedFocus();
  }
}

/**
 * Zooms the Thread Explorer stage around a viewport point.
 * @param {number} factor - Multiplicative zoom factor.
 * @param {number} clientX - Pointer x coordinate in viewport space.
 * @param {number} clientY - Pointer y coordinate in viewport space.
 * @returns {void}
 */
function zoomThreadExplorerAtPoint(factor, clientX, clientY) {
  threadExplorerZoomController.atPoint(factor, clientX, clientY);
}

/**
 * Sets one absolute Thread Explorer zoom around the current viewport center.
 * @param {number} nextZoom - Desired absolute zoom factor.
 * @returns {void}
 */
function setThreadExplorerZoomAtViewportCenter(nextZoom) {
  threadExplorerZoomController.atCenter(nextZoom);
}

/**
 * Creates one feed-list button for a normalized Thread Explorer post.
 * @param {object} item - Feed item with a normalized post.
 * @returns {DocumentFragment} Rendered feed item fragment.
 */
function createThreadExplorerFeedItemFragment(item) {
  return createThreadExplorerFeedItemFragmentFromTools(item, {
    template: threadExplorerFeedItemTemplate,
    selectedUri: threadExplorerSelectedUri,
    cloneTemplate: cloneTemplateContent,
    markAvatar: markThreadExplorerAvatarImage,
    getAvatarUri: getThreadExplorerActorAvatarUri,
    getActorLabel: getThreadExplorerActorLabel,
    setAvatar: setAvatarImage,
    formatDate: formatThreadExplorerDate,
    getPreviewText: getThreadExplorerPreviewText,
    onClick: handleThreadExplorerFeedItemClick,
  });
}

/**
 * Renders the Actor-Fokus card and its current result list.
 * @returns {void}
 */
function renderThreadExplorerActorFocus() {
  threadExplorerController.setOrientation(threadExplorerOrientation);
  renderThreadExplorerActorFocusPanel({
    panel: threadExplorerActorFocus,
    list: threadExplorerActorFeedList,
    avatar: threadExplorerActorFocusAvatar,
    title: threadExplorerActorFocusTitle,
    handle: threadExplorerActorFocusHandle,
    modeSelect: threadExplorerActorModeSelect,
    status: threadExplorerActorFocusStatus,
    actor: threadExplorerActorFocusActor,
    items: threadExplorerActorFocusItems,
    mode: threadExplorerActorFocusMode,
    loading: threadExplorerActorFocusLoading,
    error: threadExplorerActorFocusError,
    translate: t,
    formatCount,
    getLabel: getThreadExplorerActorLabel,
    setAvatar: (actor, label) => {
      setAvatarImage(threadExplorerActorFocusAvatar, getThreadExplorerActorAvatarUri(actor), label);
    },
    renderItem: createThreadExplorerFeedItemFragment,
  });
}

/**
 * Renders the left Thread Explorer feed list from templates.
 * @returns {void}
 */
function renderThreadExplorerFeed() {
  renderThreadExplorerFeedPanel({
    list: threadExplorerFeedList,
    status: threadExplorerFeedStatus,
    items: threadExplorerItems,
    loading: threadExplorerLoadingFeed,
    error: threadExplorerFeedError,
    foreignAccountMode: isThreadExplorerForeignAccountMode(),
    searchMode: Boolean(getThreadExplorerSearchIdFromSource(threadExplorerSource)),
    translate: t,
    formatCount,
    renderActorFocus: renderThreadExplorerActorFocus,
    renderItem: createThreadExplorerFeedItemFragment,
  });
}

/**
 * Moves the Thread Explorer gallery selection by one or more images with loop-around.
 * @param {number} step - Relative movement, negative for previous and positive for next.
 * @returns {void}
 */
function stepThreadExplorerGallery(step) {
  threadExplorerGalleryController.step(step);
}

/**
 * Opens the Thread Explorer thread for the clicked feed item.
 * @param {Event} event - Click event from a feed item button.
 * @returns {void}
 */
function handleThreadExplorerFeedItemClick(event) {
  const button = event.currentTarget;
  const uri = String(button?.dataset?.uri || "").trim();
  void selectThreadExplorerPost(uri);
}

/**
 * Loads the next Thread Explorer feed page when the feed list is scrolled near the bottom.
 * @returns {void}
 */
function handleThreadExplorerFeedScroll() {
  handleThreadExplorerFeedScrollFromTools(threadExplorerFeedList, {
    hasMore: threadExplorerHasMore,
    loading: threadExplorerLoadingFeed,
  }, loadThreadExplorerFeed);
}

/**
 * Loads the next Actor-Fokus page when the focus list is scrolled near the bottom.
 * @returns {void}
 */
function handleThreadExplorerActorFocusScroll() {
  handleThreadExplorerActorFocusScrollFromTools(threadExplorerActorFeedList, {
    hasMore: threadExplorerActorFocusHasMore,
    loading: threadExplorerActorFocusLoading,
  }, loadThreadExplorerActorFocusFeed);
}

/**
 * Switches the Thread Explorer to the selected pinned feed.
 * @returns {void}
 */
function handleThreadExplorerFeedSelectChange() {
  handleThreadExplorerFeedSelectChangeFromTools({ currentTarget: threadExplorerFeedSelect }, {
    normalizeSource: normalizeThreadExplorerSource,
    setSource: setThreadExplorerSource,
  });
}

/**
 * Switches the Thread Explorer to the selected relationship source.
 * @param {Event} event - Change event from the relationship source select.
 * @returns {void}
 */
function handleThreadExplorerSourceSelectChange(event) {
  handleThreadExplorerSourceSelectChangeFromTools(event, {
    normalizeSource: normalizeThreadExplorerSource,
    setSource: setThreadExplorerSource,
  });
}

/**
 * Loads the Actor-Fokus feed for the current actor.
 * @param {object} options - Loading behavior.
 * @param {boolean} options.append - True when the next page should be appended.
 * @returns {Promise<void>} Resolves after the Actor-Fokus list is rendered.
 */
async function loadThreadExplorerActorFocusFeed(options = {}) {
  await loadThreadExplorerActorFocusWorkflow({
    authAccount,
    actor: threadExplorerActorFocusActor,
    actorId: getThreadExplorerActorFocusId(threadExplorerActorFocusActor),
    mode: threadExplorerActorFocusMode,
    append: options.append,
    state: {
      get items() { return threadExplorerActorFocusItems; },
      set items(value) { threadExplorerActorFocusItems = value; },
      get cursor() { return threadExplorerActorFocusCursor; },
      set cursor(value) { threadExplorerActorFocusCursor = value; },
      get hasMore() { return threadExplorerActorFocusHasMore; },
      set hasMore(value) { threadExplorerActorFocusHasMore = value; },
      get loading() { return threadExplorerActorFocusLoading; },
      set loading(value) { threadExplorerActorFocusLoading = value; },
      get error() { return threadExplorerActorFocusError; },
      set error(value) { threadExplorerActorFocusError = value; },
    },
    request: sendToServiceWorker,
    appendItems: appendThreadExplorerFeedItems,
    sortItems: sortThreadExplorerFeedItemsByDate,
    render: renderThreadExplorerWorkspace,
    errorMessage: t("threadExplorerActorFocusFailed"),
  });
}

/**
 * Opens the Actor-Fokus card for a Thread Explorer actor.
 * @param {object} actor - Normalized Thread Explorer actor.
 * @returns {void}
 */
function openThreadExplorerActorFocus(actor = {}) {
  const actorId = getThreadExplorerActorFocusId(actor);
  if (!actorId) {
    return;
  }

  const isOwnActor = isThreadExplorerOwnActor(actor);
  if (!isOwnActor) {
    if (!isThreadExplorerForeignActorFocusMode()) {
      threadExplorerAccountActorBeforeFocus = normalizeThreadExplorerActor(threadExplorerAccountActor);
      threadExplorerAccountModeBeforeFocus = normalizeThreadExplorerAccountMode(threadExplorerAccountMode);
    }
    threadExplorerAccountActor = normalizeThreadExplorerActor(actor.handle || actor.did || "");
    if (threadExplorerAccountInput) {
      threadExplorerAccountInput.value = threadExplorerAccountActor;
    }
    threadExplorerAccountError = "";
    threadExplorerActorFocusMode = normalizeThreadExplorerActorFocusMode(threadExplorerAccountMode);
  }
  threadExplorerActorFocusActor = { ...actor };
  threadExplorerActorFocusMode = normalizeThreadExplorerActorFocusMode(threadExplorerActorFocusMode);
  threadExplorerActorFocusItems = [];
  threadExplorerActorFocusCursor = "";
  threadExplorerActorFocusHasMore = false;
  threadExplorerActorFocusError = "";
  renderThreadExplorerWorkspace();
  void persistSettings();
  void loadThreadExplorerActorFocusFeed({ append: false });
}

/**
 * Clears the current Thread Explorer Actor-Fokus card.
 * @returns {void}
 */
function closeThreadExplorerActorFocus() {
  const shouldRestoreOwnContext = isThreadExplorerForeignActorFocusMode();
  threadExplorerActorFocusActor = null;
  threadExplorerActorFocusItems = [];
  threadExplorerActorFocusCursor = "";
  threadExplorerActorFocusHasMore = false;
  threadExplorerActorFocusLoading = false;
  threadExplorerActorFocusError = "";
  if (shouldRestoreOwnContext) {
    threadExplorerAccountActor = normalizeThreadExplorerActor(threadExplorerAccountActorBeforeFocus);
    threadExplorerAccountMode = normalizeThreadExplorerAccountMode(threadExplorerAccountModeBeforeFocus);
    threadExplorerAccountError = "";
    if (threadExplorerAccountInput) {
      threadExplorerAccountInput.value = threadExplorerAccountActor;
    }
    if (threadExplorerAccountModeSelect) {
      threadExplorerAccountModeSelect.value = threadExplorerAccountMode;
    }
    threadExplorerAccountActorBeforeFocus = "";
    threadExplorerAccountModeBeforeFocus = "posts";
    void loadThreadExplorerFeedSources();
  }
  renderThreadExplorerWorkspace();
  void persistSettings();
  if (shouldRestoreOwnContext && authAccount && !threadExplorerLoadingFeed) {
    void loadThreadExplorerFeed({ reset: true, clearSelection: true });
    return;
  }
}

/**
 * Changes the current Actor-Fokus feed mode.
 * @param {Event} event - Change event from the Actor-Fokus mode select.
 * @returns {void}
 */
function handleThreadExplorerActorModeChange(event) {
  handleThreadExplorerActorModeChangeFromTools(event, {
    normalizeMode: normalizeThreadExplorerActorFocusMode,
    setMode: (mode) => {
      threadExplorerActorFocusMode = mode;
    },
    loadFeed: loadThreadExplorerActorFocusFeed,
  });
}

/**
 * Loads the next Actor-Fokus page.
 * @returns {void}
 */
function handleThreadExplorerActorMoreClick() {
  void loadThreadExplorerActorFocusFeed({ append: true });
}

/**
 * Opens a reaction account popup from a Thread Explorer count button.
 * @param {Event} event - Click event from a count button.
 * @returns {void}
 */
function handleThreadExplorerCountClick(event) {
  handleThreadExplorerCountClickFromTools(event, openThreadExplorerReactionsDialog);
}

/**
 * Opens the loaded replies popup from a Thread Explorer reply count button.
 * @param {Event} event - Click event from a reply count button.
 * @returns {void}
 */
function handleThreadExplorerRepliesCountClick(event) {
  handleThreadExplorerRepliesCountClickFromTools(event, openThreadExplorerRepliesDialog);
}

/**
 * Renders the right Thread Explorer tree from templates.
 * @returns {void}
 */
function renderThreadExplorerTree() {
  resetThreadExplorerLazyCardObserver();
  threadExplorerReplyClusterLayoutState = null;
  applyThreadExplorerStageTransform();
  renderThreadExplorerTreePanel({
    stage: threadExplorerThreadStage,
    title: threadExplorerThreadTitle,
    status: threadExplorerThreadStatus,
    tree: threadExplorerTree,
    loading: threadExplorerLoadingThread,
    error: threadExplorerThreadError,
    clusterMode: threadExplorerViewMode === THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER,
    translate: t,
    formatCount,
    countPosts: countThreadExplorerPosts,
    createRootNode: createThreadExplorerNode,
    renderCluster: renderThreadExplorerReplyCluster,
    afterRender: () => {
      hydrateVisibleThreadExplorerCards();
      if (threadExplorerViewMode !== THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER) {
        scheduleThreadExplorerEdgeRender();
      }
    },
  });
}

/**
 * Returns the browser observer factory when lazy observation is supported.
 * @returns {Function|null} Factory for IntersectionObserver instances or null.
 */
function getThreadExplorerObserverFactory() {
  if (typeof IntersectionObserver !== "function") {
    return null;
  }
  return (callback, options) => new IntersectionObserver(callback, options);
}

/**
 * Disconnects the current Thread Explorer lazy-card observer.
 * @returns {void}
 */
function resetThreadExplorerLazyCardObserver() {
  threadExplorerLazyHydrationController.reset();
}

/**
 * Hydrates a Thread Explorer card when it becomes relevant for display.
 * @param {HTMLElement|null} card - Rendered post card.
 * @returns {void}
 */
function hydrateThreadExplorerCardContent(card = null) {
  if (!card) {
    return;
  }
  const post = card._threadExplorerPost || null;
  hydrateThreadExplorerCard(card, post, {
    getDisplayModel(currentPost) {
      return getThreadExplorerPostCardDisplayModel(currentPost, [
        "Likes",
        "Replies",
        "Reposts",
        "Quotes",
      ]);
    },
    renderAvatar: hydrateThreadExplorerCardAvatar,
    renderMedia: hydrateThreadExplorerCardMedia,
    renderEmbeds: hydrateThreadExplorerCardEmbeds,
    finalize: finalizeThreadExplorerCardHydration,
  });
}

/**
 * Applies the avatar state for one hydrated Thread Explorer post card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {void}
 */
function hydrateThreadExplorerCardAvatar(card = null, post = {}) {
  renderThreadExplorerCardAvatar(card, post, {
    markAvatar: markThreadExplorerAvatarImage,
    getAvatarUri: getThreadExplorerActorAvatarUri,
    getActorLabel: getThreadExplorerActorLabel,
    setAvatar: setAvatarImage,
  });
}

/**
 * Applies the image gallery state for one hydrated Thread Explorer post card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {void}
 */
function hydrateThreadExplorerCardMedia(card = null, post = {}) {
  renderThreadExplorerCardMedia(card, post, {
    renderImages: renderThreadExplorerImages,
    syncShape: syncThreadExplorerPostCardImageShape,
  });
}

/**
 * Applies the external-card and quote-card state for one hydrated Thread Explorer post card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {object|null} postDisplay - Prepared post display model.
 * @returns {void}
 */
function hydrateThreadExplorerCardEmbeds(card = null, post = {}, postDisplay = null) {
  renderThreadExplorerCardEmbeds(card, post, postDisplay, {
    renderExternalCard: renderThreadExplorerExternalCard,
    renderQuoteCard: renderThreadExplorerQuoteCard,
  });
}

/**
 * Marks one Thread Explorer post card as hydrated and refreshes dependent layout.
 * @param {HTMLElement|null} card - Hydrated post card.
 * @returns {void}
 */
function finalizeThreadExplorerCardHydration(card = null) {
  if (!card) {
    return;
  }

  card.dataset.hydrated = "true";
  card.classList.remove("is-awaiting-content");
  if (isThreadExplorerReplyClusterModeActive()) {
    layoutThreadExplorerReplyCluster(threadExplorerReplyClusterLayoutState);
  } else {
    scheduleThreadExplorerEdgeRender();
  }
}

/**
 * Observes or immediately hydrates a Thread Explorer card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {void}
 */
function prepareThreadExplorerCardHydration(card = null, post = {}) {
  threadExplorerLazyHydrationController.prepare(card, post);
}

/**
 * Hydrates cards that are already visible after a tree render.
 * @returns {void}
 */
function hydrateVisibleThreadExplorerCards() {
  threadExplorerLazyHydrationController.hydrateVisible();
}

/**
 * Returns the timestamp used to sort one Thread Explorer reply.
 * @param {object|null} node - Normalized Thread Explorer reply node.
 * @returns {number} Epoch milliseconds or a large fallback value.
 */
function getThreadExplorerReplySortTimestamp(node = null) {
  return getThreadExplorerReplySortTimestampFromTools(node);
}

/**
 * Returns Thread Explorer replies sorted chronologically without mutating the source array.
 * @param {Array<object>} replies - Raw reply nodes for one parent post.
 * @returns {Array<object>} Replies sorted oldest first within the sibling group.
 */
function getChronologicalThreadExplorerReplies(replies) {
  return getChronologicalThreadExplorerRepliesFromTools(replies);
}

/**
 * Creates a rendered Thread Explorer post item from the shared node template.
 * @param {object} node - Normalized Thread Explorer tree node.
 * @param {object} options - Rendering options for this shared post item.
 * @param {boolean} options.renderReplies - Whether child replies should be rendered recursively.
 * @param {boolean} options.showToggle - Whether the collapse toggle should stay visible.
 * @returns {{item:HTMLElement, card:HTMLElement, children:HTMLElement, post:object, replies:Array<object>}} Rendered node parts.
 */
function createThreadExplorerRenderedItem(node, options = {}) {
  return createThreadExplorerRenderedItemFromTools(node, {
    cloneTemplate: () => cloneTemplateContent(threadExplorerNodeTemplate),
    prepareNode: (currentNode) => prepareThreadExplorerRenderedNode(currentNode, {
      getEngagementScore: getThreadExplorerEngagementScore,
      getEngagementTier: getThreadExplorerEngagementTier,
      getDisplayModel: (post) => getThreadExplorerPostCardDisplayModel(post, ["Likes", "Replies", "Reposts", "Quotes"]),
    }),
    selectedUri: threadExplorerSelectedUri,
    isCollapsed: threadExplorerCollapsedUris.has(node?.post?.uri),
    getActorLabel: getThreadExplorerActorLabel,
    setAvatar: setAvatarImage,
    translate: t,
    renderViewLink: renderThreadExplorerViewLink,
    renderEditButton: renderThreadExplorerEditButton,
    renderActions: renderThreadExplorerInteractionActions,
    renderMetrics: renderThreadExplorerMetricEntries,
    applyTranslatedTitle,
    openActorFocus: openThreadExplorerActorFocus,
    prepareHydration: prepareThreadExplorerCardHydration,
    cardHandlers: {
      click: handleThreadExplorerCardClick,
      dblclick: handleThreadExplorerCardDoubleClick,
      pointerup: handleThreadExplorerCardPointerUp,
    },
    toggleState: {
      clusterMode: isThreadExplorerReplyClusterModeActive(),
      isExpanded: isThreadExplorerReplyClusterExpanded(node?.post?.uri),
      isCollapsed: threadExplorerCollapsedUris.has(node?.post?.uri),
      onClick: handleThreadExplorerNodeToggleClick,
    },
    createNode: createThreadExplorerNode,
    renderReplies: options.renderReplies,
    showToggle: options.showToggle,
  });
}

/**
 * Creates one Thread Explorer tree node from the node template.
 * @param {object} node - Normalized Thread Explorer tree node.
 * @returns {HTMLElement} A rendered list item containing the post and child replies.
 */
function createThreadExplorerNode(node) {
  return createThreadExplorerRenderedItem(node, {
    renderReplies: true,
    showToggle: true,
  }).item;
}

/**
 * Returns whether the Thread Explorer currently renders the reply-cluster mode.
 * @returns {boolean} True when the reply-cluster mode is active.
 */
function isThreadExplorerReplyClusterModeActive() {
  return threadExplorerViewMode === THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER;
}

/**
 * Ensures that the current thread root is always expanded in reply-cluster mode.
 * @returns {void}
 */
function ensureThreadExplorerReplyClusterRootExpanded() {
  ensureReplyClusterRootExpandedFromLayout(threadExplorerTree?.post?.uri || "", threadExplorerReplyClusterExpandedUris);
}

/**
 * Expands the complete loaded reply-cluster tree.
 * @param {object|null} node - Normalized Thread Explorer tree node.
 * @returns {void}
 */
function expandAllThreadExplorerReplyClusterNodes(node) {
  if (!node || !node.post?.uri) {
    return;
  }

  threadExplorerReplyClusterExpandedUris.add(String(node.post.uri).trim());
  const replies = Array.isArray(node.replies) ? node.replies : [];
  replies.forEach((reply) => {
    expandAllThreadExplorerReplyClusterNodes(reply);
  });
}

/**
 * Returns whether one reply-cluster node is currently expanded.
 * @param {string} uri - AT URI of the cluster node.
 * @returns {boolean} True when the node is expanded or is the current root.
 */
function isThreadExplorerReplyClusterExpanded(uri) {
  const normalizedUri = String(uri || "").trim();
  if (!normalizedUri) {
    return false;
  }

  ensureThreadExplorerReplyClusterRootExpanded();
  return threadExplorerReplyClusterExpandedUris.has(normalizedUri);
}

/**
 * Toggles one reply-cluster subtree and keeps the current open state for every other node.
 * @param {string} uri - AT URI of the subtree root that should toggle.
 * @returns {void}
 */
function toggleThreadExplorerReplyClusterNode(uri) {
  threadExplorerController.toggleExpanded(uri);
  threadExplorerReplyClusterExpandedUris = threadExplorerController.state.expandedUris;
  renderThreadExplorerTree();
}

/**
 * Refreshes rendered Thread Explorer geometry after media changed size.
 * @returns {void}
 */
function refreshThreadExplorerRenderedGeometry() {
  if (isThreadExplorerReplyClusterModeActive()) {
    layoutThreadExplorerReplyCluster(threadExplorerReplyClusterLayoutState);
    return;
  }

  scheduleThreadExplorerEdgeRender();
}

/**
 * Applies one absolute center position to a reply-cluster card.
 * @param {HTMLElement|null} item - Cluster item element to move.
 * @param {number} centerX - Horizontal stage-space center.
 * @param {number} centerY - Vertical stage-space center.
 * @returns {void}
 */
/**
 * Renders every visible reply-cluster edge for the positioned recursive tree.
 * @param {object|null} layoutState - Current reply-cluster render state.
 * @returns {void}
 */
function renderThreadExplorerReplyClusterEdges(layoutState) {
  renderReplyClusterEdgesFromLayout(layoutState, {
    getItemSize: getReplyClusterItemSizeFromLayout,
    createSvgNode,
  });
}

/**
 * Applies the positioned recursive reply-cluster tree to the stage and updates bounds.
 * @param {object|null} layoutState - Current reply-cluster render state.
 * @returns {void}
 */
function applyThreadExplorerReplyClusterBounds(layoutState) {
  applyReplyClusterBoundsFromLayout(layoutState, {
    getItemSize: getReplyClusterItemSizeFromLayout,
    setItemPosition: setReplyClusterItemPositionFromLayout,
    renderEdges: renderThreadExplorerReplyClusterEdges,
  });
}

/**
 * Recomputes the complete recursive reply-cluster layout without overlaps.
 * @param {object|null} layoutState - Current reply-cluster render state.
 * @returns {void}
 */
function layoutThreadExplorerReplyCluster(layoutState) {
  layoutReplyClusterFromLayout(layoutState, {
    getItemSize: getReplyClusterItemSizeFromLayout,
    setItemPosition: setReplyClusterItemPositionFromLayout,
    setNodePosition: setReplyClusterNodePositionFromLayout,
    applyBounds: applyThreadExplorerReplyClusterBounds,
  });
}

/**
 * Selects one already loaded Thread Explorer URI without changing the cluster center.
 * @param {string} uri - AT URI to select locally.
 * @returns {void}
 */
function setThreadExplorerSelectedUriLocally(uri) {
  const selectedUri = String(uri || "").trim();
  if (!selectedUri || selectedUri === threadExplorerSelectedUri) {
    return;
  }

  threadExplorerSelectedUri = selectedUri;
  persistThreadExplorerSelectionPreference(selectedUri);
  renderThreadExplorerWorkspace();
  scheduleThreadExplorerSelectedFocus();
}

/**
 * Creates one absolute-positioned reply-cluster item from the shared node template.
 * @param {object} node - Normalized Thread Explorer node for this cluster card.
 * @param {number} centerX - X center position in stage space.
 * @param {number} centerY - Y center position in stage space.
 * @param {string} role - Visual role such as "center", "parent" or "reply".
 * @returns {HTMLElement} Rendered absolute-positioned cluster item.
 */
function createThreadExplorerReplyClusterItem(node, centerX, centerY, role) {
  const renderedItem = createThreadExplorerRenderedItem(node, {
    renderReplies: false,
    showToggle: true,
  });
  const item = renderedItem.item;
  return configureThreadExplorerReplyClusterItem(item, centerX, centerY, role);
}

/**
 * Creates one recursive reply-cluster render node for the expanded cluster tree.
 * @param {object|null} node - Normalized Thread Explorer tree node.
 * @returns {object|null} Recursive render node with rendered item and expanded children.
 */
function createThreadExplorerReplyClusterRenderNode(node) {
  return createThreadExplorerReplyClusterRenderNodeFromTools(node, {
    rootUri: threadExplorerTree?.post?.uri || "",
    isExpanded: isThreadExplorerReplyClusterExpanded,
    createItem: createThreadExplorerReplyClusterItem,
  });
}

/**
 * Appends one curved cluster edge between two cluster anchor points.
 * @param {SVGElement} svg - Target SVG edge layer.
 * @param {{x:number, y:number}} start - Edge start point.
 * @param {{x:number, y:number}} end - Edge end point.
 * @param {string} edgeClassName - Additional CSS class for this edge.
 * @returns {void}
 */
/**
 * Renders the reply-cluster layout around the currently selected or contextual post.
 * @returns {void}
 */
function renderThreadExplorerReplyCluster() {
  if (!threadExplorerTree) {
    return;
  }

  ensureThreadExplorerReplyClusterRootExpanded();
  const rootRenderNode = createThreadExplorerReplyClusterRenderNode(threadExplorerTree);
  if (!rootRenderNode) {
    return;
  }

  threadExplorerReplyClusterLayoutState = createThreadExplorerReplyClusterWorkspace(
    rootRenderNode,
    createSvgNode,
    appendThreadExplorerReplyClusterNodes,
  );
  if (!threadExplorerReplyClusterLayoutState) {
    return;
  }
  mountThreadExplorerReplyClusterWorkspace(threadExplorerThreadStage, threadExplorerReplyClusterLayoutState);
  layoutThreadExplorerReplyCluster(threadExplorerReplyClusterLayoutState);
}

/**
 * Toggles the clicked Thread Explorer node button.
 * @param {Event} event - Click event from a node toggle button.
 * @returns {void}
 */
function handleThreadExplorerNodeToggleClick(event) {
  const button = event.currentTarget;
  const uri = String(button?.dataset?.uri || "").trim();
  if (isThreadExplorerReplyClusterModeActive()) {
    toggleThreadExplorerReplyClusterNode(uri);
    return;
  }
  toggleThreadExplorerNode(uri);
}

/**
 * Applies preview-shape classes for one Thread Explorer post image.
 * @param {HTMLImageElement|null} image - Loaded image element inside the preview figure.
 * @param {HTMLElement|null} figure - Figure wrapper around the image.
 * @param {HTMLElement|null} gallery - Gallery container that owns the image.
 * @returns {void}
 */
function applyThreadExplorerPostImagePreviewShape(image = null, figure = null, gallery = null) {
  applyThreadExplorerPostImagePreviewShapeFromTools(image, figure, gallery);
}

/**
 * Copies gallery image-shape classes onto the surrounding Thread Explorer post card.
 * @param {HTMLElement|null} card - Rendered Thread Explorer post card.
 * @param {HTMLElement|null} gallery - Gallery inside the post card.
 * @returns {void}
 */
function syncThreadExplorerPostCardImageShape(card = null, gallery = null) {
  syncThreadExplorerPostCardImageShapeFromTools(card, gallery);
}

/**
 * Renders post images into a Thread Explorer gallery element.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {HTMLElement} gallery - Gallery container element.
 * @returns {void}
 */
function renderThreadExplorerImages(post, gallery) {
  const images = getThreadExplorerPostImages(post);
  renderThreadExplorerPostGallery(gallery, images, createThreadExplorerImageFigure);
}

/**
 * Creates one rendered image figure for a Thread Explorer post gallery.
 * @param {object} image - Normalized post image entry.
 * @param {number} imageIndex - Index inside the post gallery.
 * @param {object[]} images - Full gallery image list.
 * @param {HTMLElement|null} gallery - Gallery container.
 * @returns {HTMLElement} Rendered figure element.
 */
function createThreadExplorerImageFigure(image, imageIndex, images, gallery) {
  return createThreadExplorerPostImageFigure(image, imageIndex, images, gallery, {
    cloneTemplate: () => cloneTemplateContent(threadExplorerImageTemplate),
    getImageSources: getThreadExplorerImageSources,
    setImageSource: setThreadExplorerCachedImageSource,
    onLoad: applyThreadExplorerGalleryImageLoadState,
    onError: (imageElement) => attachThreadExplorerRenderedMediaCacheHandlers(imageElement, handleThreadExplorerPostImageError),
    openGallery: openThreadExplorerGallery,
  });
}

/**
 * Applies the loaded-image state for one Thread Explorer gallery figure.
 * @param {HTMLImageElement|null} image - Loaded gallery image.
 * @param {HTMLElement|null} figure - Surrounding figure element.
 * @param {HTMLElement|null} gallery - Owning gallery element.
 * @returns {void}
 */
function applyThreadExplorerGalleryImageLoadState(image = null, figure = null, gallery = null) {
  if (!gallery) {
    return;
  }

  applyThreadExplorerPostImagePreviewShape(image, figure, gallery);
  syncThreadExplorerPostCardImageShape(gallery.closest(".thread-explorer-post-card"), gallery);
  refreshThreadExplorerRenderedGeometry();
}

/**
 * Returns a likely favicon URL for a link-card URI.
 * @param {string} uri - External link URI from a Bluesky embed.
 * @returns {string} Absolute favicon URL, or an empty string when the URI is invalid.
 */
/**
 * Hides a Thread Explorer link-card image when its fallback asset cannot load.
 * @param {Event} event - Image error event.
 * @returns {void}
 */
function handleThreadExplorerLinkImageError(event) {
  hideThreadExplorerExternalCardImage(event, {
    cardSelector: ".thread-explorer-link-card",
    onError: refreshThreadExplorerRenderedGeometry,
  });
}

/**
 * Hides a failed Thread Explorer quoted link-card thumbnail.
 * @param {Event} event - Image error event.
 * @returns {void}
 */
function handleThreadExplorerQuoteLinkImageError(event) {
  hideThreadExplorerExternalCardImage(event, {
    cardSelector: ".thread-explorer-quote-link-card",
    onError: refreshThreadExplorerRenderedGeometry,
  });
}

/**
 * Renders a post external card into a Thread Explorer node fragment.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {object|null} display - Prepared external card display model.
 * @param {DocumentFragment} fragment - Node template fragment.
 * @returns {void}
 */
function renderThreadExplorerExternalCard(post, display, fragment) {
  renderThreadExplorerExternalLinkCard(display, fragment, {
    cardSelector: ".thread-explorer-link-card",
    imageSelector: ".thread-explorer-link-card-image",
    titleSelector: ".thread-explorer-link-card-title",
    descriptionSelector: ".thread-explorer-link-card-description",
    urlSelector: ".thread-explorer-link-card-url",
    onImageError: handleThreadExplorerLinkImageError,
    onImageLoad: (event) => {
      cacheThreadExplorerRenderedMediaImage(event.currentTarget);
      refreshThreadExplorerRenderedGeometry();
    },
    setImageSource: setThreadExplorerCachedImageSource,
    getFaviconUrl: getThreadExplorerFaviconUrl,
  });
}

/**
 * Renders preview images from a quoted Thread Explorer post.
 * @param {object} quoteDisplay - Prepared quoted post display model.
 * @param {HTMLElement|null} gallery - Target gallery element inside the quote card.
 * @returns {void}
 */
function renderThreadExplorerQuoteImages(quoteDisplay, gallery) {
  renderThreadExplorerQuoteGallery(gallery, quoteDisplay, createThreadExplorerQuoteImageElement);
}

/**
 * Creates one rendered preview image for a quoted Thread Explorer post.
 * @param {{source: string, alt: string, imageIndex: number}} entry - Prepared quote image preview entry.
 * @param {object[]} images - Full quote image list.
 * @param {HTMLElement|null} gallery - Quote gallery element.
 * @returns {HTMLImageElement} Rendered preview image element.
 */
function createThreadExplorerQuoteImageElement(entry, images, gallery) {
  return createThreadExplorerQuotePreviewImage(entry, images, gallery, {
    createImage: () => document.createElement("img"),
    setImageSource: setThreadExplorerCachedImageSource,
    onLoad: applyThreadExplorerQuoteImageLoadState,
    onError: (image) => attachThreadExplorerRenderedMediaCacheHandlers(image, handleThreadExplorerQuoteImageError),
    openGallery: openThreadExplorerGallery,
  });
}

/**
 * Applies the loaded-image state for one quoted Thread Explorer preview image.
 * @param {HTMLImageElement|null} image - Loaded preview image.
 * @param {HTMLElement|null} gallery - Quote gallery element.
 * @returns {void}
 */
function applyThreadExplorerQuoteImageLoadState(image = null, gallery = null) {
  if (!image || !gallery) {
    return;
  }

  applyThreadExplorerPostImagePreviewShape(image, image, gallery);
  refreshThreadExplorerRenderedGeometry();
}

/**
 * Renders a quoted post's external link card preview.
 * @param {object} quoteDisplay - Prepared quoted post display model.
 * @param {DocumentFragment} fragment - Node template fragment.
 * @returns {void}
 */
function renderThreadExplorerQuoteExternalCard(quoteDisplay, fragment) {
  const display = quoteDisplay?.externalCardDisplay || null;
  renderThreadExplorerExternalLinkCard(display, fragment, {
    cardSelector: ".thread-explorer-quote-link-card",
    imageSelector: ".thread-explorer-quote-link-card-image",
    titleSelector: ".thread-explorer-quote-link-card-title",
    descriptionSelector: ".thread-explorer-quote-link-card-description",
    urlSelector: ".thread-explorer-quote-link-card-url",
    onImageError: handleThreadExplorerQuoteLinkImageError,
    onImageLoad: (event) => {
      cacheThreadExplorerRenderedMediaImage(event.currentTarget);
      refreshThreadExplorerRenderedGeometry();
    },
    setImageSource: setThreadExplorerCachedImageSource,
    getFaviconUrl: getThreadExplorerFaviconUrl,
  });
}

/**
 * Renders a quoted post card into a Thread Explorer node fragment.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {DocumentFragment} fragment - Node template fragment.
 * @returns {void}
 */
function renderThreadExplorerQuoteCard(post, fragment) {
  renderThreadExplorerQuotePostCard(post, fragment, {
    buildDisplay(quote) {
      return buildQuoteCardDisplayModel(quote, {
        fallbackAuthorLabel: t("threadExplorerUnknownAuthor"),
        noTextFallback: t("threadExplorerNoText"),
        buildPostUrl: buildThreadExplorerPostWebUrl,
        getAuthorFields: getLocalizedPostAuthorFields,
        buildMetaText(quotePost) {
          return buildPostMetaText(quotePost, {
            formatDate: formatThreadExplorerDate,
            translate: t,
            includeEditedBadge: true,
          });
        },
        buildExternalCardDisplay: getThreadExplorerExternalCardDisplayModel,
      });
    },
    markAvatar: markThreadExplorerAvatarImage,
    getAvatarUri: getThreadExplorerActorAvatarUri,
    getActorLabel: getThreadExplorerActorLabel,
    setAvatar: setAvatarImage,
    translate: t,
    renderImages: renderThreadExplorerQuoteImages,
    renderExternalCard: renderThreadExplorerQuoteExternalCard,
    openPost(uri) {
      void selectThreadExplorerPost(uri);
    },
  });
}

/**
 * Loads the Thread Explorer feed through the Service Worker.
 * @param {object} options - Set reset true to reload from the beginning.
 * @returns {Promise<void>} Resolves when the feed is rendered.
 */
async function loadThreadExplorerFeed(options = {}) {
  await loadThreadExplorerFeedWorkflow({
    authAccount,
    state: {
      get cursor() { return threadExplorerCursor; },
      set cursor(value) { threadExplorerCursor = value; },
      get hasMore() { return threadExplorerHasMore; },
      set hasMore(value) { threadExplorerHasMore = value; },
      get items() { return threadExplorerItems; },
      set items(value) { threadExplorerItems = value; },
      get loading() { return threadExplorerLoadingFeed; },
      set loading(value) { threadExplorerLoadingFeed = value; },
    },
    append: options.append,
    reset: options.reset,
    clearSelection: options.clearSelection,
    isForeignAccount: isThreadExplorerForeignAccountMode,
    accountMode: normalizeThreadExplorerAccountMode(threadExplorerAccountMode),
    source: threadExplorerSource,
    savedSearch: getSavedSearchById(getThreadExplorerSearchIdFromSource(threadExplorerSource))?.params || null,
    getRequestedActor: getThreadExplorerRequestedActor,
    request: sendToServiceWorker,
    clearSelectionState: () => {
      threadExplorerSelectedUri = "";
      threadExplorerTree = null;
      clearThreadExplorerRenderedMediaCache();
      threadExplorerCollapsedUris.clear();
      clearThreadExplorerSelectionPreference();
    },
    clearErrors: () => {
      threadExplorerFeedError = "";
      threadExplorerThreadError = "";
      threadExplorerAccountError = "";
    },
    render: renderThreadExplorerWorkspace,
    appendItems: (currentItems, nextItems, foreignAccount) => sortThreadExplorerFeedItemsByDate(appendThreadExplorerFeedItems(currentItems, nextItems, {
      groupByRoot: !foreignAccount && Boolean(getThreadExplorerSearchIdFromSource(threadExplorerSource)),
    })),
    sortItems: sortThreadExplorerFeedItemsByDate,
    restoreSelection: async (allowStoredOutsideFeed) => {
      const selectionUri = getThreadExplorerPreferredSelectionUri({ allowStoredOutsideFeed });
      if (selectionUri) {
        await selectThreadExplorerPost(selectionUri);
      }
    },
    setError: (message, foreignAccount) => {
      threadExplorerFeedError = message;
      if (foreignAccount) {
        threadExplorerAccountError = message;
      }
    },
    feedErrorMessage: t("threadExplorerFeedFailed"),
  });
}

/**
 * Loads and renders one live thread for a selected post URI.
 * @param {string} uri - AT URI of the selected post.
 * @returns {Promise<void>} Resolves when the thread tree is rendered.
 */
async function selectThreadExplorerPost(uri) {
  await loadThreadExplorerThreadWorkflow(uri, {
    state: {
      get selectedUri() { return threadExplorerSelectedUri; },
      set selectedUri(value) { threadExplorerSelectedUri = value; },
      get loading() { return threadExplorerLoadingThread; },
      set loading(value) { threadExplorerLoadingThread = value; },
      get cardZoom() { return threadExplorerCardZoomState; },
      set cardZoom(value) { threadExplorerCardZoomState = value; },
      get tree() { return threadExplorerTree; },
      set tree(value) { threadExplorerTree = value; },
      get error() { return threadExplorerThreadError; },
      set error(value) { threadExplorerThreadError = value; },
    },
    persistSelection: persistThreadExplorerSelectionPreference,
    clearMediaCache: clearThreadExplorerRenderedMediaCache,
    request: sendToServiceWorker,
    isClusterMode: isThreadExplorerReplyClusterModeActive,
    resetClusterState: () => threadExplorerReplyClusterExpandedUris.clear(),
    expandClusterTree: expandAllThreadExplorerReplyClusterNodes,
    render: renderThreadExplorerWorkspace,
    scheduleFocus: scheduleThreadExplorerSelectedFocus,
    errorMessage: t("threadExplorerThreadFailed"),
  });
}

/**
 * Schedules a reliable focus pass for the currently selected Thread Explorer node.
 * @returns {void}
 */
function scheduleThreadExplorerSelectedFocus() {
  threadExplorerRenderScheduler.scheduleFocus();
}

/**
 * Toggles collapsed state for a rendered Thread Explorer node.
 * @param {string} uri - AT URI of the node to toggle.
 * @returns {void}
 */
function toggleThreadExplorerNode(uri) {
  const normalizedUri = String(uri || "").trim();
  if (!normalizedUri) {
    return;
  }
  if (threadExplorerCollapsedUris.has(normalizedUri)) {
    threadExplorerCollapsedUris.delete(normalizedUri);
  } else {
    threadExplorerCollapsedUris.add(normalizedUri);
  }
  renderThreadExplorerTree();
}

/**
 * Scrolls the Thread Explorer tree to its root node.
 * @returns {void}
 */
function scrollThreadExplorerToRoot() {
  threadExplorerFocusController.root();
}

/**
 * Scrolls one rendered Thread Explorer node into the viewport.
 * @param {HTMLElement} item - Rendered node item to reveal.
 * @param {object} options - Scroll placement options.
 * @param {string} options.block - Vertical placement: "start" or "center".
 * @param {string} options.inline - Horizontal placement: "start" or "center".
 * @returns {void}
 */
function scrollThreadExplorerNodeIntoView(item, options = {}) {
  threadExplorerFocusController.reveal(item, options);
}

/**
 * Finds a rendered Thread Explorer node item by exact post URI.
 * @param {string} uri - AT URI to locate in the rendered tree.
 * @returns {HTMLElement|null} Matching rendered node item, or null.
 */
function findRenderedThreadExplorerNode(uri) {
  return threadExplorerFocusController.find(uri);
}

/**
 * Measures one rendered Thread Explorer element in untransformed stage coordinates.
 * @param {HTMLElement|null} element - Rendered stage element to measure.
 * @returns {{left:number, top:number, width:number, height:number}|null} Stage-space box or null when unavailable.
 */
function getThreadExplorerStageBox(element = null) {
  if (!element) {
    return null;
  }
  return getThreadExplorerStageBoxFromRects(
    element.getBoundingClientRect(),
    threadExplorerThreadTree.getBoundingClientRect(),
    { zoom: threadExplorerZoom, panX: threadExplorerPanX, panY: threadExplorerPanY },
  );
}

/**
 * Collects the complete bounds of the rendered Thread Explorer tree in stage coordinates.
 * @returns {{left:number, top:number, width:number, height:number}|null} Bounding box for the visible tree.
 */
function getThreadExplorerStageContentBounds() {
  const boxes = Array.from(
    threadExplorerThreadStage.querySelectorAll(".thread-explorer-post-card"),
    getThreadExplorerStageBox,
  );
  return getThreadExplorerContentBounds(boxes);
}

/**
 * Applies a viewport fit to one stage-space bounds box.
 * @param {{left:number, top:number, width:number, height:number}|null} bounds - Stage-space bounds to reveal.
 * @param {object} [options] - Optional zoom limits for this fit.
 * @param {number} [options.minZoom] - Minimum zoom that should be enforced.
 * @param {number} [options.maxZoom] - Maximum zoom that should be enforced.
 * @returns {void}
 */
function fitThreadExplorerStageToBounds(bounds, options = {}) {
  const viewport = calculateThreadExplorerViewportFit(bounds,
    { width: threadExplorerThreadTree.clientWidth, height: threadExplorerThreadTree.clientHeight }, options);
  if (!viewport) {
    return;
  }
  threadExplorerZoom = viewport.zoom;
  threadExplorerPanX = viewport.panX;
  threadExplorerPanY = viewport.panY;
  threadExplorerController.setViewport(threadExplorerZoom, threadExplorerPanX, threadExplorerPanY);
  applyThreadExplorerStageTransform();
  scheduleThreadExplorerEdgeRender();
}

/**
 * Fits the complete rendered Thread Explorer tree into the visible viewport.
 * @returns {void}
 */
function fitThreadExplorerStageToTree() {
  threadExplorerCardZoomState = null;
  const bounds = getThreadExplorerStageContentBounds();
  if (!bounds) {
    return;
  }

  fitThreadExplorerStageToBounds(bounds);
}

/**
 * Scrolls the selected Thread Explorer post into the center of the viewport.
 * @returns {void}
 */
function focusSelectedThreadExplorerNode() {
  threadExplorerFocusController.focus();
}

/**
 * Collects one stage-space bounds box for the clicked post card and its immediate reply neighborhood.
 * @param {HTMLElement|null} item - Rendered Thread Explorer node item.
 * @returns {{left:number, top:number, width:number, height:number}|null} Combined bounds or null.
 */
function getThreadExplorerCardNeighborhoodBounds(item) {
  return getThreadExplorerCardNeighborhoodBoundsFromLayout(item, {
    clusterMode: isThreadExplorerReplyClusterModeActive(),
    rootRenderNode: threadExplorerReplyClusterLayoutState?.rootRenderNode || null,
    getCard: getRenderedThreadExplorerCard,
    getBox: getThreadExplorerStageBox,
  });
}

/**
 * Cancels one pending single-click card selection.
 * @returns {void}
 */
function cancelPendingThreadExplorerCardClick() {
  threadExplorerCardFocusController.cancel();
}

/**
 * Handles a single click on one Thread Explorer post card.
 * @param {MouseEvent} event - Click event from a rendered post card.
 * @returns {void}
 */
function handleThreadExplorerCardClick(event) {
  threadExplorerCardFocusController.click(event);
}

/**
 * Handles a mouse double-click on one Thread Explorer post card.
 * @param {MouseEvent} event - Double-click event from a rendered post card.
 * @returns {void}
 */
function handleThreadExplorerCardDoubleClick(event) {
  threadExplorerCardFocusController.doubleClick(event);
}

/**
 * Handles touch-based double-tap zooming on one Thread Explorer post card.
 * @param {PointerEvent} event - Pointer-up event from a rendered post card.
 * @returns {void}
 */
function handleThreadExplorerCardPointerUp(event) {
  threadExplorerCardFocusController.pointerUp(event);
}

/**
 * Returns whether a target is a native interactive control that should not trigger card zoom.
 * @param {EventTarget|null} target - Event target from a card interaction.
 * @returns {boolean} True when the target is a button, link, or form control.
 */
function isThreadExplorerNativeInteractiveTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  const nativeInteractiveTarget = target.closest("button, a, input, textarea, select, summary");
  if (nativeInteractiveTarget) {
    return true;
  }

  return false;
}

/**
 * Returns whether a pointer target should keep its native interaction.
 * @param {EventTarget|null} target - Event target from a pointer event.
 * @returns {boolean} True when dragging should not start.
 */
function isThreadExplorerInteractiveTarget(target) {
  if (isThreadExplorerNativeInteractiveTarget(target)) {
    return true;
  }

  if (!(target instanceof Element)) {
    return false;
  }

  const selectableTextTarget = target.closest(
    ".thread-explorer-post-text, .thread-explorer-quote-card-text, .thread-explorer-link-card-title, .thread-explorer-link-card-description, .thread-explorer-link-card-url, .thread-explorer-quote-link-card-title, .thread-explorer-quote-link-card-description, .thread-explorer-quote-link-card-url, .thread-explorer-image figcaption, .thread-explorer-post-author, .thread-explorer-post-handle, .thread-explorer-post-meta, .thread-explorer-feed-text, .thread-explorer-feed-author, .thread-explorer-feed-meta",
  );
  if (selectableTextTarget) {
    return true;
  }

  return false;
}

/**
 * Starts mouse or pointer panning for the Thread Explorer viewport.
 * @param {PointerEvent} event - Pointer down event from the tree viewport.
 * @returns {void}
 */
function handleThreadExplorerPointerDown(event) {
  handleThreadExplorerPointerDownFromTools(event, threadExplorerDragStateHolder, {
    isInteractiveTarget: isThreadExplorerInteractiveTarget,
    cancelInertia: cancelThreadExplorerPanInertia,
    setPanArmed: (active) => threadExplorerThreadTree.classList.toggle("is-pan-armed", active),
    getPanX: () => threadExplorerPanX,
    getPanY: () => threadExplorerPanY,
    capturePointer: (pointerId) => threadExplorerThreadTree.setPointerCapture(pointerId),
  });
}

/**
 * Pans the Thread Explorer viewport while the pointer is captured.
 * @param {PointerEvent} event - Pointer move event from the tree viewport.
 * @returns {void}
 */
function handleThreadExplorerPointerMove(event) {
  handleThreadExplorerPointerMoveFromTools(event, threadExplorerDragStateHolder, {
    dragThreshold: THREAD_EXPLORER_DRAG_THRESHOLD_PX,
    updateVelocity: updateThreadExplorerPanVelocity,
    setPanning: setThreadExplorerPanningMode,
    setPan: (panX, panY) => {
      threadExplorerPanX = panX;
      threadExplorerPanY = panY;
    },
    applyTransform: applyThreadExplorerStageTransform,
  });
}

/**
 * Stops mouse or pointer panning for the Thread Explorer viewport.
 * @param {PointerEvent} event - Pointer release or cancel event.
 * @returns {void}
 */
function handleThreadExplorerPointerUp(event) {
  handleThreadExplorerPointerUpFromTools(event, threadExplorerDragStateHolder, {
    releasePointer: (pointerId) => {
      if (threadExplorerThreadTree.hasPointerCapture(pointerId)) {
        threadExplorerThreadTree.releasePointerCapture(pointerId);
      }
    },
    setVelocity: (velocityX, velocityY) => {
      threadExplorerPanController.setVelocity(velocityX, velocityY);
    },
    startInertia: startThreadExplorerPanInertia,
    setPanning: setThreadExplorerPanningMode,
  });
}

/**
 * Handles mouse-wheel interaction inside the Thread Explorer viewport.
 * @param {WheelEvent} event - Wheel event from the tree viewport.
 * @returns {void}
 */
function handleThreadExplorerWheel(event) {
  handleThreadExplorerWheelFromTools(event, {
    scrollDelta: applyThreadExplorerScrollDelta,
    renderEdges: scheduleThreadExplorerEdgeRender,
    zoomAtPoint: zoomThreadExplorerAtPoint,
  });
}

/**
 * Redraws Thread Explorer edges after viewport size changes.
 * @returns {void}
 */
function handleThreadExplorerResize() {
  if (currentWorkspace !== "threadExplorer") {
    return;
  }
  if (!threadExplorerTree) {
    return;
  }
  scheduleThreadExplorerEdgeRender();
}

/**
 * Adds all collapsible Thread Explorer node URIs to a target set.
 * @param {object|null} node - Tree node to inspect.
 * @param {Set<string>} targetSet - Set that receives post URIs for nodes with replies.
 * @returns {void}
 */
function collectCollapsibleThreadExplorerUris(node, targetSet) {
  if (!node || !Array.isArray(node.replies) || node.replies.length === 0) {
    return;
  }
  if (node.post?.uri) {
    targetSet.add(node.post.uri);
  }
  node.replies.forEach((reply) => {
    collectCollapsibleThreadExplorerUris(reply, targetSet);
  });
}

/**
 * Expands or collapses all current Thread Explorer tree nodes.
 * @param {boolean} shouldCollapse - True collapses all nodes with replies, false expands all nodes.
 * @returns {void}
 */
function setAllThreadExplorerNodesCollapsed(shouldCollapse) {
  threadExplorerCollapsedUris.clear();
  if (shouldCollapse) {
    collectCollapsibleThreadExplorerUris(threadExplorerTree, threadExplorerCollapsedUris);
  }
  renderThreadExplorerTree();
}

/**
 * Creates a safe filename part for Thread Explorer exports.
 * @param {string} value - Raw filename part.
 * @returns {string} Filesystem-friendly filename part.
 */
function sanitizeThreadExplorerFileNamePart(value) {
  const normalized = String(value || "").trim().replace(/^@+/, "");
  const safe = normalized.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (safe) {
    return safe.slice(0, 80);
  }
  return "thread";
}

/**
 * Encodes an already loaded image element as a data URL when the browser allows it.
 * @param {HTMLImageElement} image - Source image from the rendered Thread Explorer.
 * @returns {string} Data URL, original data URL, or an empty string when unavailable.
 */
function encodeThreadExplorerImageElement(image) {
  const source = String(image?.currentSrc || image?.src || "").trim();
  if (!source) {
    return "";
  }
  if (source.startsWith("data:")) {
    return source;
  }
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
    return "";
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Reads a Thread Explorer avatar data URI from the shared local avatar cache.
 * @param {HTMLImageElement|null} image - Avatar image with cache lookup metadata.
 * @returns {string} Cached avatar data URI or an empty string.
 */
function getThreadExplorerSnapshotCachedAvatarUri(image = null) {
  return getSnapshotCachedAvatarUriFromData(image, accountAvatarAssets, assetToDataUri);
}

/**
 * Builds the cache lookup key for a Thread Explorer avatar image.
 * @param {HTMLImageElement|null} image - Avatar image with cache lookup metadata.
 * @returns {string} Stable avatar cache key or an empty string.
 */
function getThreadExplorerSnapshotAvatarCacheKey(image = null) {
  return getSnapshotAvatarCacheKeyFromData(image);
}

/**
 * Loads one cached avatar data URI into an image object for canvas drawing.
 * @param {string} dataUri - Cached avatar data URI.
 * @returns {Promise<HTMLImageElement|null>} Loaded image or null when loading fails.
 */
function loadThreadExplorerSnapshotAvatarImage(dataUri) {
  const source = String(dataUri || "").trim();
  if (!source) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(image);
    }, { once: true });
    image.addEventListener("error", () => {
      resolve(null);
    }, { once: true });
    image.src = source;
  });
}

/**
 * Loads one rendered snapshot image source into a canvas-safe image object.
 * @param {string} source - Data URI, blob URL or same-origin image URL.
 * @returns {Promise<HTMLImageElement|null>} Loaded image or null when loading fails.
 */
function loadThreadExplorerSnapshotCanvasImage(source) {
  const normalizedSource = String(source || "").trim();
  if (!normalizedSource) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      resolve(image);
    }, { once: true });
    image.addEventListener("error", () => {
      resolve(null);
    }, { once: true });
    image.src = normalizedSource;
  });
}

/**
 * Preloads all cached Thread Explorer avatars needed by the canvas snapshot renderers.
 * @param {HTMLElement[]} cards - Rendered Thread Explorer post cards.
 * @returns {Promise<Map<string, HTMLImageElement>>} Loaded avatar image map keyed by DID and URL.
 */
async function preloadThreadExplorerSnapshotAvatarImages(cards) {
  return preloadSnapshotAvatarImagesFromData(cards, {
    getAvatar: (card) => card.querySelector(".thread-explorer-avatar"),
    getCacheKey: getThreadExplorerSnapshotAvatarCacheKey,
    getCachedAvatarUri: getThreadExplorerSnapshotCachedAvatarUri,
    loadImage: loadThreadExplorerSnapshotAvatarImage,
  });
}

/**
 * Returns whether a rendered image belongs to post media rather than account avatars.
 * @param {HTMLImageElement|null} image - Rendered image element.
 * @returns {boolean} True when the image should be painted as card media.
 */
function isThreadExplorerSnapshotMediaImage(image = null) {
  return isSnapshotMediaImageFromData(image);
}

/**
 * Builds stable lookup keys for one rendered media image in a snapshot card.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @returns {string[]} Stable media image keys ordered by preference.
 */
function getThreadExplorerSnapshotMediaImageKeys(image = null) {
  return getSnapshotMediaImageKeysFromData(image);
}

/**
 * Builds the preferred key for one rendered media image in a snapshot card.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @returns {string} Stable media image key or an empty string.
 */
function getThreadExplorerSnapshotMediaImageKey(image = null) {
  return getSnapshotMediaImageKeyFromData(image);
}

/**
 * Finds a preloaded media image using all known keys for the rendered image element.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @param {Map<string, HTMLImageElement>} mediaImages - Preloaded media image map.
 * @returns {HTMLImageElement|null} Loaded image or null when no key matches.
 */
function getThreadExplorerSnapshotDrawableMediaImage(image = null, mediaImages = new Map()) {
  return getSnapshotDrawableMediaImageFromData(image, mediaImages);
}

/**
 * Clears the short-lived cache for media currently shown in the Thread Explorer.
 * @returns {void}
 */
function clearThreadExplorerRenderedMediaCache() {
  threadExplorerRenderedMediaCache = new Map();
  threadExplorerSnapshotMediaDataUris = new Map();
}

/**
 * Finds a cached data URI for any of the provided Thread Explorer media keys.
 * @param {string[]} keys - Media URL keys that may identify the same image.
 * @returns {string} Cached data URI, or an empty string.
 */
function getThreadExplorerRenderedMediaCacheDataUri(keys = []) {
  return getSnapshotMediaDataUriFromData(keys, [threadExplorerRenderedMediaCache, threadExplorerSnapshotMediaDataUris]);
}

/**
 * Assigns a Thread Explorer image source, preferring already cached data URIs.
 * @param {HTMLImageElement|null} image - Target image element.
 * @param {string} primarySource - Original full image or thumbnail URL.
 * @param {string} secondarySource - Secondary URL for the same image.
 * @returns {void}
 */
function setThreadExplorerCachedImageSource(image = null, primarySource = "", secondarySource = "") {
  setSnapshotCachedImageSourceFromData(image, primarySource, secondarySource, getThreadExplorerRenderedMediaCacheDataUri);
}

/**
 * Replaces rendered Thread Explorer media URLs with cache data URIs when available.
 * @returns {number} Number of image elements switched to cached sources.
 */
function applyThreadExplorerRenderedMediaCacheToDom() {
  if (!threadExplorerThreadStage) {
    return 0;
  }
  const images = Array.from(threadExplorerThreadStage.querySelectorAll("img"));
  const appliedCount = applySnapshotMediaCacheFromData(images, {
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    getImageKeys: getThreadExplorerSnapshotMediaImageKeys,
    getCachedDataUri: getThreadExplorerRenderedMediaCacheDataUri,
  });
  if (appliedCount > 0) {
    scheduleThreadExplorerEdgeRender();
  }
  return appliedCount;
}

/**
 * Stores one Thread Explorer media data URI under every known cache key.
 * @param {string[]} keys - Cache keys that identify the same media image.
 * @param {string} dataUri - Canvas-safe data URI.
 * @returns {void}
 */
function storeThreadExplorerRenderedMediaDataUri(keys = [], dataUri = "") {
  storeSnapshotMediaDataUriFromData(threadExplorerRenderedMediaCache, keys, dataUri);
}

/**
 * Stores a rendered Thread Explorer media image as a data URI for the current thread.
 * @param {HTMLImageElement|null} image - Loaded media image from the visible thread.
 * @returns {void}
 */
function cacheThreadExplorerRenderedMediaImage(image = null) {
  cacheSnapshotMediaImageFromData(image, {
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    getImageKeys: getThreadExplorerSnapshotMediaImageKeys,
    encodeImage: encodeThreadExplorerImageElement,
    cache: threadExplorerRenderedMediaCache,
  });
}

/**
 * Registers load/error bookkeeping for a rendered Thread Explorer media image.
 * @param {HTMLImageElement|null} image - Media image element.
 * @param {(event: Event) => void} errorHandler - Existing error handler for this image.
 * @returns {void}
 */
function attachThreadExplorerRenderedMediaCacheHandlers(image = null, errorHandler = null) {
  if (!image) {
    return;
  }

  image.addEventListener("load", () => {
    cacheThreadExplorerRenderedMediaImage(image);
    refreshThreadExplorerRenderedGeometry();
  }, { once: true });
  if (typeof errorHandler === "function") {
    image.addEventListener("error", errorHandler);
  }
}

/**
 * Caches every currently loaded and readable media image in the Thread Explorer DOM.
 * @returns {number} Number of media elements inspected.
 */
function cacheLoadedThreadExplorerRenderedMediaImages() {
  return cacheLoadedSnapshotMediaImagesFromData(threadExplorerThreadStage, {
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    cacheImage: cacheThreadExplorerRenderedMediaImage,
  });
}

/**
 * Collects canvas-safe rendered media images from Thread Explorer cards.
 * @param {HTMLElement[]} cards - Rendered Thread Explorer post cards.
 * @returns {Promise<Map<string, HTMLImageElement>>} Loaded media image map keyed by image source.
 */
async function preloadThreadExplorerSnapshotMediaImages(cards) {
  return preloadSnapshotMediaImagesFromData(cards, {
    getImages: (card) => card.querySelectorAll("img"),
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    getImageKeys: getThreadExplorerSnapshotMediaImageKeys,
    getCachedDataUri: getThreadExplorerRenderedMediaCacheDataUri,
    encodeImage: encodeThreadExplorerImageElement,
    canDrawImage: canDrawThreadExplorerSnapshotImage,
    loadImage: loadThreadExplorerSnapshotCanvasImage,
  });
}

/**
 * Returns a hydrated data URI for a rendered Thread Explorer media image.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @returns {string} Hydrated data URI or an empty string.
 */
function getThreadExplorerSnapshotHydratedMediaUri(image = null) {
  return getThreadExplorerRenderedMediaCacheDataUri(getThreadExplorerSnapshotMediaImageKeys(image));
}

/**
 * Applies hydrated media data URIs directly to rendered Thread Explorer image elements.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<object>} Counts for total, embedded and missing images.
 */
async function applyThreadExplorerSnapshotMediaDataUrisToRenderedTree(onProgress = async () => {}, signal = null) {
  const images = Array.from(threadExplorerThreadStage.querySelectorAll("img"));
  return applySnapshotMediaDataUrisFromData(images, {
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    getHydratedMediaUri: getThreadExplorerSnapshotHydratedMediaUri,
    getImageKeys: getThreadExplorerSnapshotMediaImageKeys,
    storeDataUri: storeThreadExplorerRenderedMediaDataUri,
    throwIfAborted: throwIfThreadExplorerSnapshotAborted,
    signal,
    buildProgress({ index, total, embedded, skipped }) {
      return {
        percent: 38 + ((index + 1) / Math.max(1, total) * 2),
        step: t("threadExplorerSnapshotProgressMedia"),
        detail: t("threadExplorerSnapshotProgressMediaEmbedDetail", {
          current: index + 1,
          total,
          remaining: Math.max(0, total - index - 1),
          embedded,
          skipped,
        }),
      };
    },
    onProgress,
  });
}

/**
 * Replaces cloned Thread Explorer images with data URLs read from rendered image elements.
 * @param {HTMLElement} source - Original rendered tree stage.
 * @param {HTMLElement} clone - Cloned tree stage.
 * @returns {void}
 */
function inlineThreadExplorerSnapshotImages(source, clone) {
  inlineSnapshotImagesFromData(source, clone, {
    getCachedAvatarUri: getThreadExplorerSnapshotCachedAvatarUri,
    getHydratedMediaUri: getThreadExplorerSnapshotHydratedMediaUri,
    encodeImage: encodeThreadExplorerImageElement,
    fallbackAvatarUri: DEFAULT_AVATAR_URI,
  });
}

/**
 * Collects accessible CSS text for the Thread Explorer snapshot SVG.
 * @returns {string} CSS text.
 */
function collectThreadExplorerSnapshotCss() {
  const parts = [];
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(styleSheet.cssRules || [])) {
        parts.push(rule.cssText);
      }
    } catch {
      // Cross-origin stylesheets cannot be read; local app styles are enough for Threadline.
    }
  }
  return parts.join("\n");
}

/**
 * Downloads a blob with the given filename.
 * @param {Blob} blob - Blob to download.
 * @param {string} fileName - Suggested download filename.
 * @returns {void}
 */
function downloadThreadExplorerBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Draws rounded rectangle path for snapshot canvas rendering.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Corner radius.
 * @returns {void}
 */
function drawThreadExplorerSnapshotRoundRect(context, x, y, width, height, radius) {
  drawSnapshotRoundRectFromModule(context, x, y, width, height, radius);
}

/**
 * Draws a rounded rectangle outline for snapshot canvas rendering.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Corner radius.
 * @param {string} color - Stroke color.
 * @param {number} lineWidth - Stroke width.
 * @returns {void}
 */
function strokeThreadExplorerSnapshotRoundRect(context, x, y, width, height, radius, color, lineWidth = 1) {
  strokeSnapshotRoundRectFromModule(context, x, y, width, height, radius, color, lineWidth);
}

/**
 * Wraps plain text for canvas snapshot rendering.
 * @param {CanvasRenderingContext2D} context - Measuring canvas context.
 * @param {string} text - Text to wrap.
 * @param {number} maxWidth - Maximum line width.
 * @param {number} maxLines - Maximum lines to return.
 * @returns {string[]} Wrapped lines.
 */
function wrapThreadExplorerSnapshotText(context, text, maxWidth, maxLines = 8) {
  return wrapSnapshotTextFromModule(context, text, maxWidth, maxLines);
}

/**
 * Draws one text block for snapshot canvas rendering.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {string[]} lines - Lines to draw.
 * @param {number} x - Left coordinate.
 * @param {number} y - First baseline coordinate.
 * @param {number} lineHeight - Distance between baselines.
 * @returns {number} Next baseline coordinate after the block.
 */
function drawThreadExplorerSnapshotTextBlock(context, lines, x, y, lineHeight) {
  return drawSnapshotTextBlockFromModule(context, lines, x, y, lineHeight);
}

/**
 * Creates a canvas sized for the complete Thread Explorer snapshot.
 * @param {number} width - CSS pixel width.
 * @param {number} height - CSS pixel height.
 * @returns {object} Canvas, context, scale, width, and height.
 */
function createThreadExplorerSnapshotCanvas(width, height) {
  return createSnapshotCanvasFromModule(width, height, {
    devicePixelRatio: window.devicePixelRatio,
    maxDimension: THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_DIMENSION,
    maxPixels: THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_PIXELS,
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
  });
}

/**
 * Converts a snapshot canvas to a blob.
 * @param {HTMLCanvasElement} canvas - Canvas to encode.
 * @param {string} mimeType - Target MIME type.
 * @returns {Promise<Blob>} Encoded image blob.
 */
async function encodeThreadExplorerSnapshotCanvas(canvas, mimeType) {
  return encodeSnapshotCanvasFromModule(canvas, mimeType, {
    failureMessage: t("threadExplorerSnapshotFailed"),
    addMetadata: (blob) => addPngMetadataFromSnapshot(blob, { applicationLabel: getExportMetadataApplicationLabel() }),
  });
}

/**
 * Writes an unsigned 32-bit integer in big-endian order.
 * @param {Uint8Array} target - Target byte buffer.
 * @param {number} offset - Write offset.
 * @param {number} value - Unsigned integer value.
 * @returns {void}
 */
function writeThreadExplorerPngUint32(target, offset, value) {
  writePngUint32FromSnapshot(target, offset, value);
}

/**
 * Builds the CRC table used by PNG chunks.
 * @returns {Uint32Array} CRC lookup table.
 */
function createThreadExplorerPngCrcTable() {
  return createPngCrcTableFromSnapshot();
}

/**
 * Calculates a PNG CRC over chunk type and payload.
 * @param {string} type - Four-character PNG chunk type.
 * @param {Uint8Array} data - Chunk payload bytes.
 * @param {Uint32Array} table - CRC lookup table.
 * @returns {number} Unsigned CRC value.
 */
function calculateThreadExplorerPngCrc(type, data, table) {
  return calculatePngCrcFromSnapshot(type, data, table);
}

/**
 * Creates one complete PNG chunk.
 * @param {string} type - Four-character PNG chunk type.
 * @param {Uint8Array} data - Chunk payload bytes.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded PNG chunk.
 */
function createThreadExplorerPngChunk(type, data, crcTable) {
  return createPngChunkFromSnapshot(type, data, crcTable);
}

/**
 * Creates one PNG text metadata chunk.
 * @param {string} keyword - PNG text keyword.
 * @param {string} value - Text value.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded PNG tEXt chunk.
 */
function createThreadExplorerPngTextChunk(keyword, value, crcTable) {
  return createPngTextChunkFromSnapshot(keyword, value, crcTable);
}

/**
 * Escapes a text value for use inside PNG XMP metadata.
 * @param {string} value - Raw text value.
 * @returns {string} XML-safe text value.
 */
function escapeThreadExplorerPngXmpText(value) {
  return escapePngXmpTextFromSnapshot(value);
}

/**
 * Builds an XMP packet for PNG export metadata.
 * @param {string} applicationLabel - Threadline application and version label.
 * @returns {string} XMP metadata packet.
 */
function createThreadExplorerPngXmpPacket(applicationLabel) {
  return createPngXmpPacketFromSnapshot(applicationLabel);
}

/**
 * Creates one PNG international text chunk for XMP metadata.
 * @param {string} value - XMP payload.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded PNG iTXt chunk.
 */
function createThreadExplorerPngXmpChunk(value, crcTable) {
  return createPngXmpChunkFromSnapshot(value, crcTable);
}

/**
 * Builds PNG metadata chunks for Threadline exports.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array[]} PNG metadata chunks.
 */
function createThreadExplorerPngMetadataChunks(crcTable) {
  const applicationLabel = getExportMetadataApplicationLabel();
  return createPngMetadataChunksFromSnapshot(crcTable, applicationLabel);
}

/**
 * Adds Threadline metadata chunks to an encoded PNG blob.
 * @param {Blob} blob - PNG blob from browser canvas encoding.
 * @returns {Promise<Blob>} PNG blob with metadata chunks when possible.
 */
async function addThreadExplorerPngMetadata(blob) {
  return addPngMetadataFromSnapshot(blob, { applicationLabel: getExportMetadataApplicationLabel() });
}

/**
 * Creates PNG IHDR data for an RGBA image.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @returns {Uint8Array} IHDR payload.
 */
function createThreadExplorerPngHeaderData(width, height) {
  return createPngHeaderDataFromSnapshot(width, height);
}

/**
 * Returns the Thread Explorer snapshot background color.
 * @returns {string} CSS color string.
 */
/**
 * Draws a circular fallback avatar into a snapshot canvas.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {number} x - Avatar left coordinate.
 * @param {number} y - Avatar top coordinate.
 * @param {number} size - Avatar diameter.
 * @returns {void}
 */
function drawThreadExplorerSnapshotFallbackAvatar(context, x, y, size) {
  drawSnapshotFallbackAvatarFromModule(context, x, y, size);
}

/**
 * Checks whether an image URL can be drawn without tainting the snapshot canvas.
 * @param {HTMLImageElement|null} image - Candidate image element.
 * @returns {boolean} True when the image source is same-origin or local data.
 */
function canDrawThreadExplorerSnapshotImage(image) {
  return canDrawSnapshotImageFromModule(image, window.location.href, window.location.origin);
}

/**
 * Draws a circular avatar image into a snapshot canvas when the image can be used safely.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {HTMLImageElement|null} image - Rendered avatar image element.
 * @param {number} x - Avatar left coordinate.
 * @param {number} y - Avatar top coordinate.
 * @param {number} size - Avatar diameter.
 * @returns {boolean} True when a real avatar was drawn.
 */
function drawThreadExplorerSnapshotAvatarImage(context, image, x, y, size) {
  return drawSnapshotAvatarFromModule(context, image, x, y, size, canDrawThreadExplorerSnapshotImage);
}

/**
 * Draws an image inside a rounded rectangle using cover behavior.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {HTMLImageElement|null} image - Loaded image to draw.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Target width.
 * @param {number} height - Target height.
 * @param {number} radius - Clip radius.
 * @returns {boolean} True when an image was drawn.
 */
function drawThreadExplorerSnapshotCoverImage(context, image, x, y, width, height, radius = 6) {
  return drawSnapshotCoverImageFromModule(context, image, x, y, width, height, radius, drawThreadExplorerSnapshotRoundRect);
}

/**
 * Draws a lightweight placeholder for a media image that cannot be painted into canvas.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {DOMRect} rect - Media rectangle in snapshot coordinates.
 * @returns {void}
 */
function drawThreadExplorerSnapshotMediaPlaceholder(context, rect) {
  drawSnapshotMediaPlaceholderFromModule(context, rect, drawThreadExplorerSnapshotRoundRect);
}

/**
 * Draws a compact ALT text overlay for one snapshot media image.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {string} altText - Image ALT text.
 * @param {DOMRect} rect - Media rectangle in snapshot coordinates.
 * @param {number} maxBottom - Lowest y-coordinate the ALT text block may use.
 * @returns {void}
 */
function drawThreadExplorerSnapshotImageAltText(context, altText, rect, maxBottom = 0) {
  drawSnapshotAltTextFromModule(context, altText, rect, maxBottom, t);
}

/**
 * Draws all visible media images inside a Thread Explorer card at their rendered positions.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {HTMLElement} card - Rendered post card.
 * @param {DOMRect} stageRect - Thread Explorer stage rectangle.
 * @param {Map<string, HTMLImageElement>} mediaImages - Preloaded canvas-safe media images.
 * @param {number} altTextMaxBottom - Lowest y-coordinate ALT text blocks may use.
 * @returns {void}
 */
function drawThreadExplorerSnapshotMediaImages(context, card, stageRect, mediaImages = new Map(), altTextMaxBottom = 0) {
  drawSnapshotMediaImagesFromModule(context, card, stageRect, mediaImages, altTextMaxBottom, {
    isMediaImage: isThreadExplorerSnapshotMediaImage,
    getStageRect: getThreadExplorerStageRect,
    getDrawableImage: getThreadExplorerSnapshotDrawableMediaImage,
    drawCoverImage: drawThreadExplorerSnapshotCoverImage,
    drawPlaceholder: drawThreadExplorerSnapshotMediaPlaceholder,
    strokeRoundedRect: strokeThreadExplorerSnapshotRoundRect,
    drawAltText: drawThreadExplorerSnapshotImageAltText,
  });
}

/**
 * Builds a readable counts line from rendered Thread Explorer count elements.
 * @param {HTMLElement} card - Rendered post card.
 * @returns {string} Snapshot-ready count summary with explicit spacing.
 */
function getThreadExplorerSnapshotCountsText(card) {
  return getSnapshotCountsTextFromModule(card);
}

/**
 * Waits until the browser has had time to paint progress updates.
 * @returns {Promise<void>} Resolves after two animation frames.
 */
function waitForThreadExplorerSnapshotFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

/**
 * Renders a full-resolution PNG through small canvas tiles and an assembled PNG stream.
 * @param {number} width - Snapshot width in pixels.
 * @param {number} height - Snapshot height in pixels.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<Blob>} Lossless PNG blob.
 */
async function renderThreadExplorerTiledPngSnapshotBlob(width, height, onProgress = async () => {}, signal = null) {
  return renderTiledPngFromModule({
    width,
    height,
    tileSize: THREAD_EXPLORER_SNAPSHOT_TILE_SIZE,
    onProgress,
    signal,
    text: t,
    stage: threadExplorerThreadStage,
    preloadAvatars: preloadThreadExplorerSnapshotAvatarImages,
    preloadMedia: preloadThreadExplorerSnapshotMediaImages,
    renderTile: (tileX, tileY, tileWidth, tileHeight, stageRect, cards, avatarImages, mediaImages) => renderSnapshotTileFromModule({
      x: tileX,
      y: tileY,
      width: tileWidth,
      height: tileHeight,
      stageRect,
      cards,
      avatarImages,
      mediaImages,
      createCanvas: (tileCanvasWidth, tileCanvasHeight) => {
        const canvas = document.createElement("canvas");
        canvas.width = tileCanvasWidth;
        canvas.height = tileCanvasHeight;
        return canvas;
      },
      backgroundColor: getSnapshotBackgroundColorFromModule({
        stage: threadExplorerThreadStage,
        tree: threadExplorerThreadTree,
        body: document.body,
      }, getComputedStyle),
      drawEdges: drawThreadExplorerSnapshotEdges,
      drawCard: drawThreadExplorerSnapshotCard,
    }),
    crcTableFactory: createThreadExplorerPngCrcTable,
    chunkFactory: createThreadExplorerPngChunk,
    headerFactory: createThreadExplorerPngHeaderData,
    metadataFactory: createThreadExplorerPngMetadataChunks,
    requestFrame: (callback) => window.requestAnimationFrame(callback),
  });
}

/**
 * Checks whether PNG export should avoid one large canvas.
 * @param {number} width - Snapshot width in pixels.
 * @param {number} height - Snapshot height in pixels.
 * @returns {boolean} True when tiled PNG assembly is safer.
 */
function shouldUseThreadExplorerTiledPngSnapshot(width, height) {
  if (width > THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_DIMENSION) {
    return true;
  }
  if (height > THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_DIMENSION) {
    return true;
  }
  if ((width * height) > THREAD_EXPLORER_SNAPSHOT_MAX_CANVAS_PIXELS) {
    return true;
  }
  return false;
}

/**
 * Draws Thread Explorer SVG edge paths on a snapshot canvas.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @returns {void}
 */
function drawThreadExplorerSnapshotEdges(context) {
  drawSnapshotEdgesFromModule(
    context,
    Array.from(threadExplorerThreadStage.querySelectorAll(".thread-explorer-edge")),
    getComputedStyle,
    Path2D,
  );
}

/**
 * Draws one rendered Thread Explorer card into the fallback snapshot canvas.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {HTMLElement} card - Rendered post card.
 * @param {DOMRect} stageRect - Thread Explorer stage rectangle.
 * @param {Map<string, HTMLImageElement>} avatarImages - Preloaded cached avatars for canvas drawing.
 * @param {Map<string, HTMLImageElement>} mediaImages - Preloaded canvas-safe media images.
 * @returns {void}
 */
function drawThreadExplorerSnapshotCard(context, card, stageRect, avatarImages = new Map(), mediaImages = new Map()) {
  drawSnapshotCardFromModule(context, card, stageRect, {
    getStageRect: getThreadExplorerStageRect,
    getComputedStyle,
    getAvatarKey: getThreadExplorerSnapshotAvatarCacheKey,
    avatarImages,
    mediaImages,
    drawAvatar: drawThreadExplorerSnapshotAvatarImage,
    drawFallbackAvatar: drawThreadExplorerSnapshotFallbackAvatar,
    drawMedia: drawThreadExplorerSnapshotMediaImages,
  });
}

/**
 * Renders the complete Thread Explorer tree directly to canvas as a robust fallback.
 * @param {string} mimeType - Target image MIME type.
 * @param {number} width - Snapshot width.
 * @param {number} height - Snapshot height.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<Blob>} Image blob.
 */
async function renderThreadExplorerCanvasSnapshotBlob(mimeType, width, height, onProgress = async () => {}, signal = null) {
  return renderCanvasSnapshotFromModule({
    stage: threadExplorerThreadStage,
    width,
    height,
    mimeType,
    onProgress,
    signal,
    text: t,
    createCanvas: createThreadExplorerSnapshotCanvas,
    drawEdges: drawThreadExplorerSnapshotEdges,
    preloadAvatars: preloadThreadExplorerSnapshotAvatarImages,
    preloadMedia: preloadThreadExplorerSnapshotMediaImages,
    drawCard: drawThreadExplorerSnapshotCard,
    encodeCanvas: encodeThreadExplorerSnapshotCanvas,
  });
}

/**
 * Renders the complete Thread Explorer tree through SVG foreignObject.
 * @param {string} mimeType - Target image MIME type.
 * @param {number} width - Snapshot width.
 * @param {number} height - Snapshot height.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<Blob>} Image blob.
 */
async function renderThreadExplorerForeignObjectSnapshotBlob(mimeType, width, height, onProgress = async () => {}, signal = null) {
  return renderForeignObjectFromModule({
    stage: threadExplorerThreadStage,
    width,
    height,
    mimeType,
    onProgress,
    signal,
    text: t,
    getComputedStyle,
    inlineImages: inlineThreadExplorerSnapshotImages,
    collectCss: collectThreadExplorerSnapshotCss,
    createCanvas: createThreadExplorerSnapshotCanvas,
    encodeCanvas: encodeThreadExplorerSnapshotCanvas,
  });
}

/**
 * Renders the complete Thread Explorer tree as an image blob.
 * @param {string} mimeType - Target image MIME type.
 * @param {(progress: {percent?: number, step?: string, detail?: string}) => Promise<void>} onProgress - Progress reporter.
 * @param {AbortSignal|null} signal - Abort signal for the current export.
 * @returns {Promise<Blob>} Image blob.
 */
async function renderThreadExplorerSnapshotBlob(mimeType = "image/png", onProgress = async () => {}, signal = null) {
  return renderSnapshotFromModule({
    root: threadExplorerTree,
    mimeType,
    onProgress,
    signal,
    text: t,
    hydrateAvatars: hydrateThreadExplorerTreeAvatars,
    hydrateMedia: hydrateThreadExplorerSnapshotMedia,
    restoreAvatarCache: async () => {
      await restoreAccountAvatarCache();
      applyThreadExplorerAvatarCacheToTree(threadExplorerTree);
    },
    renderTree: () => {
      threadExplorerForceHydrateCards = true;
      try {
        renderThreadExplorerTree();
      } finally {
        threadExplorerForceHydrateCards = false;
      }
    },
    cacheRenderedMedia: cacheLoadedThreadExplorerRenderedMediaImages,
    applyMediaDataUris: applyThreadExplorerSnapshotMediaDataUrisToRenderedTree,
    waitForFrame: waitForThreadExplorerSnapshotFrame,
    getStage: () => threadExplorerThreadStage,
    shouldUseTiled: shouldUseThreadExplorerTiledPngSnapshot,
    renderTiled: renderThreadExplorerTiledPngSnapshotBlob,
    renderForeignObject: renderThreadExplorerForeignObjectSnapshotBlob,
    renderCanvas: renderThreadExplorerCanvasSnapshotBlob,
    onFallback: (renderer, error) => {
      if (renderer === "tiled") {
        console.warn("Thread Explorer tiled PNG snapshot failed; using scaled fallback.", error);
        return;
      }
      if (error?.name === "ThreadExplorerSnapshotFallbackError") {
        console.info("Thread Explorer foreignObject snapshot was not supported for this tree; using canvas fallback.");
        return;
      }
      console.warn("Thread Explorer foreignObject snapshot failed; using canvas fallback.", error);
    },
  });
}

/** Exports the current tree through the snapshot controller. @returns {Promise<void>} Download completion. */
async function downloadThreadExplorerSnapshot() { return snapshotExportController.download(); }

/** Cancels the active snapshot export. @returns {void} */
function cancelThreadExplorerSnapshotExport() { snapshotExportController.cancel(); }

/**
 * Opens the Thread Explorer URL dialog and prepares the input field.
 * @returns {void}
 */
function openThreadExplorerUrlDialog() {
  threadExplorerUrlStatus.textContent = "";
  threadExplorerUrlInput.value = "";
  threadExplorerUrlDialog.showModal();
  window.setTimeout(() => {
    threadExplorerUrlInput.focus();
  }, 0);
}

/**
 * Closes the Thread Explorer URL dialog when it is open.
 * @returns {void}
 */
function closeThreadExplorerUrlDialog() {
  if (threadExplorerUrlDialog.open) {
    threadExplorerUrlDialog.close();
  }
}

/**
 * Resolves a Bluesky post URL and opens the matching live thread.
 * @returns {Promise<void>} Resolves after the thread selection was started.
 */
async function loadThreadExplorerPostFromUrl() {
  const url = String(threadExplorerUrlInput.value || "").trim();
  if (!url) {
    threadExplorerUrlStatus.textContent = t("threadExplorerUrlMissing");
    return;
  }

  threadExplorerUrlLoadButton.disabled = true;
  threadExplorerUrlStatus.textContent = t("threadExplorerUrlLoading");
  try {
    await openPostUrlInThreadExplorer(url);
    closeThreadExplorerUrlDialog();
  } catch (error) {
    threadExplorerUrlStatus.textContent = error.message || t("threadExplorerUrlFailed");
  } finally {
    threadExplorerUrlLoadButton.disabled = false;
  }
}

/**
 * Shows the Thread Explorer workspace from the workspace hub.
 * @returns {void}
 */
function handleThreadExplorerLaunchClick() {
  showThreadExplorerWorkspace();
}

/**
 * Refreshes the Thread Explorer feed from the active source.
 * @returns {void}
 */
function handleThreadExplorerRefreshClick() {
  void loadThreadExplorerFeed({ reset: true, clearSelection: true });
}

/**
 * Applies a confirmed Thread Explorer account-field value to state and optionally reloads the feed.
 * @param {object} options - Input application options.
 * @param {boolean} options.loadFeed - True when the committed change should trigger a reload.
 * @returns {void}
 */
function applyThreadExplorerAccountInput(options = {}) {
  const previousForeignMode = isThreadExplorerForeignAccountMode();
  threadExplorerAccountActor = normalizeThreadExplorerActor(threadExplorerAccountInput?.value || "");
  threadExplorerAccountError = "";
  const nextForeignMode = isThreadExplorerForeignAccountMode();
  if (nextForeignMode) {
    threadExplorerActorFocusActor = createThreadExplorerActorStub(threadExplorerAccountActor);
    threadExplorerActorFocusMode = normalizeThreadExplorerActorFocusMode(threadExplorerAccountMode);
    threadExplorerActorFocusItems = [];
    threadExplorerActorFocusCursor = "";
    threadExplorerActorFocusHasMore = false;
    threadExplorerActorFocusLoading = false;
    threadExplorerActorFocusError = "";
  } else if (threadExplorerActorFocusActor && !isThreadExplorerOwnActor(threadExplorerActorFocusActor)) {
    threadExplorerActorFocusActor = null;
    threadExplorerActorFocusItems = [];
    threadExplorerActorFocusCursor = "";
    threadExplorerActorFocusHasMore = false;
    threadExplorerActorFocusLoading = false;
    threadExplorerActorFocusError = "";
  }
  if (!nextForeignMode) {
    void loadThreadExplorerFeedSources();
  }
  renderThreadExplorerWorkspace();
  void persistSettings();

  if (options.loadFeed !== true) {
    return;
  }
  if (!authAccount || threadExplorerLoadingFeed) {
    return;
  }
  if (!threadExplorerAccountActor && nextForeignMode) {
    return;
  }
  const modeChanged = previousForeignMode !== nextForeignMode;
  if (nextForeignMode) {
    void loadThreadExplorerActorFocusFeed({ append: false });
    return;
  }
  if (modeChanged || !threadExplorerItems.length) {
    void loadThreadExplorerFeed({ reset: true, clearSelection: true });
  }
}

/**
 * Copies the signed-in account into the Thread Explorer account field and reloads the own feed mode.
 * @returns {void}
 */
function handleThreadExplorerUseOwnAccountClick() {
  const ownActor = getThreadExplorerOwnActor();
  if (threadExplorerAccountInput) {
    threadExplorerAccountInput.value = ownActor;
  }
  applyThreadExplorerAccountInput({ loadFeed: true });
}

/**
 * Updates the Thread Explorer account-mode filter and reloads the current foreign-account feed.
 * @param {Event} event - Change event from the account-mode select.
 * @returns {void}
 */
function handleThreadExplorerAccountModeChange(event) {
  threadExplorerAccountMode = normalizeThreadExplorerAccountMode(event.currentTarget?.value || "");
  threadExplorerAccountError = "";
  threadExplorerActorFocusMode = normalizeThreadExplorerActorFocusMode(threadExplorerAccountMode);
  renderThreadExplorerWorkspace();
  void persistSettings();
  if (!authAccount || threadExplorerLoadingFeed || !isThreadExplorerForeignAccountMode()) {
    return;
  }
  void loadThreadExplorerActorFocusFeed({ append: false });
}

/**
 * Opens the Thread Explorer URL prompt.
 * @returns {void}
 */
function handleThreadExplorerUrlClick() {
  openThreadExplorerUrlDialog();
}

/**
 * Reloads or focuses the Thread Explorer root post.
 * @returns {Promise<void>} Resolves after the root is focused.
 */
async function handleThreadExplorerRootClick() {
  const rootUri = String(threadExplorerTree?.post?.uri || "").trim();
  if (!rootUri) {
    scrollThreadExplorerToRoot();
    return;
  }

  if (isThreadExplorerReplyClusterModeActive()) {
    threadExplorerSelectedUri = rootUri;
    threadExplorerReplyClusterExpandedUris.clear();
    threadExplorerReplyClusterExpandedUris.add(rootUri);
    persistThreadExplorerSelectionPreference(rootUri);
    renderThreadExplorerWorkspace();
    window.requestAnimationFrame(scrollThreadExplorerToRoot);
    return;
  }

  threadExplorerCollapsedUris.clear();
  if (rootUri !== threadExplorerSelectedUri) {
    await selectThreadExplorerPost(rootUri);
    window.requestAnimationFrame(scrollThreadExplorerToRoot);
    return;
  }

  renderThreadExplorerTree();
  window.requestAnimationFrame(scrollThreadExplorerToRoot);
}

/**
 * Reloads the currently selected Thread Explorer thread from the live API.
 * @returns {void}
 */
function handleThreadExplorerReloadThreadClick() {
  const selectedUri = String(threadExplorerSelectedUri || "").trim();
  if (!selectedUri) {
    return;
  }
  threadExplorerCollapsedUris.clear();
  void selectThreadExplorerPost(selectedUri);
}

/**
 * Confirms and downloads the current Thread Explorer tree as a PNG snapshot.
 * @returns {Promise<void>} Resolves after the snapshot was started or cancelled.
 */
async function handleThreadExplorerSnapshotPngClick() {
  const mediaCount = countThreadExplorerSnapshotMediaAssetsFromData(threadExplorerTree);
  if (mediaCount >= THREAD_EXPLORER_SNAPSHOT_MEDIA_WARNING_THRESHOLD) {
    const confirmed = await openConfirmDialog({
      title: t("threadExplorerSnapshotLargeWarningTitle"),
      message: t("threadExplorerSnapshotLargeWarningMessage", {
        count: mediaCount,
        threshold: THREAD_EXPLORER_SNAPSHOT_MEDIA_WARNING_THRESHOLD,
      }),
      confirmLabel: t("threadExplorerSnapshotLargeWarningConfirm"),
      cancelLabel: t("cancelButton"),
      confirmValue: true,
      cancelValue: false,
      dismissValue: false,
    });
    if (confirmed !== true) {
      return;
    }
  }

  await downloadThreadExplorerSnapshot();
}

/**
 * Saves the current Thread Explorer thread locally.
 * @returns {void}
 */
function handleThreadExplorerSaveClick() {
  void saveCurrentThreadExplorerFavorite();
}

/**
 * Opens the Thread Explorer favorites menu.
 * @returns {void}
 */
function handleThreadExplorerFavoritesClick() {
  openThreadExplorerFavoritesDialog();
}

/**
 * Opens saved searches from the Thread Explorer.
 * @returns {void}
 */
function handleThreadExplorerSearchesClick() {
  openSavedSearchesDialog("threadExplorer");
}

/**
 * Opens saved searches from the Archive workspace.
 * @returns {void}
 */
function handleArchiveSavedSearchesClick() {
  openSavedSearchesDialog("archive");
}

/**
 * Opens saved searches from the Search workspace.
 * @returns {void}
 */
function handleSearchSavedClick() {
  openSavedSearchesDialog("search");
}

/**
 * Clears all live search controls and resets the current result state.
 * @returns {Promise<void>} Resolves after settings were persisted.
 */
async function clearSearchForm() {
  return searchForm.clear();
}

/**
 * Adds the URL currently typed into the saved-searches dialog.
 * @returns {void}
 */
function handleSavedSearchAddClick() {
  void addSavedSearchFromInput().catch((error) => {
    savedSearchesStatus.textContent = error.message || t("savedSearchAddFailed");
  });
}

/**
 * Loads a saved search for the active dialog context.
 * @param {Event} event - Click event from a saved-search load button.
 * @returns {void}
 */
function handleSavedSearchLoadClick(event) {
  const id = String(event.currentTarget?.dataset?.id || "").trim();
  if (savedSearchDialogContext === "archive") {
    void loadSavedSearchInArchive(id);
    return;
  }
  if (savedSearchDialogContext === "search") {
    void loadSavedSearchInSearchWorkspace(id);
    return;
  }
  void loadSavedSearchInThreadExplorer(id);
}

/**
 * Removes a saved search from the shared list.
 * @param {Event} event - Click event from a saved-search delete button.
 * @returns {void}
 */
function handleSavedSearchRemoveClick(event) {
  const id = String(event.currentTarget?.dataset?.id || "").trim();
  void removeSavedSearch(id);
}

/**
 * Cancels one pending click on the Thread Explorer zoom-reset button.
 * @returns {void}
 */
function cancelPendingThreadExplorerZoomResetClick() {
  threadExplorerZoomResetController.cancel();
}

/**
 * Zooms out of the Thread Explorer tree.
 * @returns {void}
 */
function handleThreadExplorerZoomOutClick() {
  handleThreadExplorerZoomOutClickFromTools({
    cancelPendingZoomReset: cancelPendingThreadExplorerZoomResetClick,
    getZoom: () => threadExplorerZoom,
    setZoom: setThreadExplorerZoom,
  });
}

/**
 * Fits the complete Thread Explorer tree into the current viewport.
 * @param {MouseEvent} [event] - Optional click event from the zoom-reset button.
 * @returns {void}
 */
function handleThreadExplorerZoomResetClick(event) {
  threadExplorerZoomResetController.click(event);
}

/**
 * Toggles the Thread Explorer zoom-reset button between fit and 100%-restore mode.
 * @param {MouseEvent} event - Double-click event from the zoom-reset button.
 * @returns {void}
 */
function handleThreadExplorerZoomResetDoubleClick(event) {
  threadExplorerZoomResetController.doubleClick(event);
}

/**
 * Zooms into the Thread Explorer tree.
 * @returns {void}
 */
function handleThreadExplorerZoomInClick() {
  handleThreadExplorerZoomInClickFromTools({
    cancelPendingZoomReset: cancelPendingThreadExplorerZoomResetClick,
    getZoom: () => threadExplorerZoom,
    setZoom: setThreadExplorerZoom,
  });
}

/**
 * Toggles the Thread Explorer tree orientation.
 * @returns {void}
 */
function handleThreadExplorerOrientationClick() {
  handleThreadExplorerOrientationClickFromTools(toggleThreadExplorerOrientation);
}

/**
 * Toggles the Thread Explorer between tree view and reply-cluster view.
 * @returns {void}
 */
function toggleThreadExplorerViewMode() {
  if (threadExplorerViewMode === THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER) {
    threadExplorerViewMode = THREAD_EXPLORER_VIEW_MODE_TREE;
  } else {
    threadExplorerViewMode = THREAD_EXPLORER_VIEW_MODE_REPLY_CLUSTER;
    threadExplorerReplyClusterExpandedUris.clear();
    expandAllThreadExplorerReplyClusterNodes(threadExplorerTree);
  }
  threadExplorerController.setViewMode(threadExplorerViewMode);
  persistThreadExplorerViewModePreference(threadExplorerViewMode);
  renderThreadExplorerWorkspace();
  if (threadExplorerTree) {
    scheduleThreadExplorerSelectedFocus();
  }
}

/**
 * Handles the Thread Explorer view-mode button click.
 * @returns {void}
 */
function handleThreadExplorerViewModeClick() {
  toggleThreadExplorerViewMode();
}

/**
 * Toggles the Thread Explorer fullscreen reading mode from the toolbar.
 * @returns {void}
 */
function handleThreadExplorerFullscreenClick() {
  toggleThreadExplorerFullscreen();
}

/**
 * Collapses all expandable Thread Explorer replies.
 * @returns {void}
 */
function handleThreadExplorerCollapseClick() {
  setAllThreadExplorerNodesCollapsed(true);
}

/**
 * Expands all collapsed Thread Explorer replies.
 * @returns {void}
 */
function handleThreadExplorerExpandClick() {
  setAllThreadExplorerNodesCollapsed(false);
}

/**
 * Handles global Escape presses for leaving the Thread Explorer fullscreen mode.
 * @param {KeyboardEvent} event - Global keyboard event.
 * @returns {void}
 */
function handleGlobalKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }
  if (currentWorkspace !== "threadExplorer") {
    return;
  }
  if (threadExplorerFullscreen !== true) {
    return;
  }
  if (hasOpenDialog()) {
    return;
  }
  event.preventDefault();
  setThreadExplorerFullscreen(false);
}

/**
 * Loads a locally saved Thread Explorer favorite.
 * @param {Event} event - Click event from a favorite item.
 * @returns {void}
 */
function handleThreadExplorerFavoriteLoadClick(event) {
  const button = event.currentTarget;
  const uri = String(button?.dataset?.uri || "").trim();
  if (threadExplorerFavoritesDialog.open) {
    threadExplorerFavoritesDialog.close();
  }
  void selectThreadExplorerPost(uri);
}

/**
 * Removes a locally saved Thread Explorer favorite.
 * @param {Event} event - Click event from a remove button.
 * @returns {void}
 */
function handleThreadExplorerFavoriteRemoveClick(event) {
  const button = event.currentTarget;
  const uri = String(button?.dataset?.uri || "").trim();
  void removeThreadExplorerFavorite(uri);
}

/** Updates analysis status. @param {string} message - Status text. @returns {void} */
function setAnalysisStatus(message = "") {
  analysisController.status(message);
}

/** Formats a locale-aware analysis number. @param {number} value - Number. @param {number} digits - Fraction digits. @returns {string} Text. */
function formatAnalysisNumber(value, digits = 2) {
  return analysisController.number(value, digits);
}

/** Formats an analysis percentage. @param {number} value - Fraction. @returns {string} Text. */
function formatAnalysisPercent(value) {
  return analysisController.percent(value);
}

/** Captures JSON-safe analysis state through the controller. @returns {object} Snapshot. */
function getPersistableAnalysisState() {
  return analysisController.snapshot();
}


/** Restores saved analysis state. @param {object|null} state - Snapshot. @returns {void} */
function restorePersistedAnalysisState(state = null) {
  analysisController.restore(state);
}

/**
 * Builds the application label used in exported file metadata.
 * @returns {string} Threadline application and version label.
 */
function getExportMetadataApplicationLabel() {
  const appVersion = String(CURRENT_VERSION_INFO.appVersion || "").trim();
  const cacheVersion = String(CURRENT_VERSION_INFO.cacheVersion || "").trim();
  const parts = ["Threadline"];
  if (appVersion) {
    parts.push(appVersion);
  }
  if (cacheVersion) {
    parts.push(`(${cacheVersion})`);
  }
  return parts.join(" ");
}

async function exportAnalysisPdfReport() {
  return analysisPdfRenderer.export();
}

/** Updates analysis control availability. @returns {void} */
function updateAnalysisControls() {
  analysisController.controls();
}

/** Renders the complete analysis workspace through its domain controller. @returns {void} */
function renderAnalysisWorkspace() {
  analysisWorkspaceController.render();
}


/**
 * Renders or clears a compact warning note below an account input.
 * @param {HTMLElement|null} note - Target note element below the input.
 * @param {string} message - Visible warning text, or empty text to hide the note.
 * @returns {void}
 */
function setAccountFieldNote(note, message = "") {
  if (!note) {
    return;
  }

  const normalizedMessage = String(message || "").trim();
  note.textContent = normalizedMessage;
  note.hidden = normalizedMessage.length === 0;
}


/**
 * Renders or clears the inline validation note below the network-account field.
 * @param {string} message - Visible warning text, or empty text to hide the note.
 * @returns {void}
 */
function setNetworkAccountFieldNote(message = "") {
  setAccountFieldNote(networkAccountNote, message);
}

/**
 * Renders or clears the inline validation note below the DM-account search field.
 * @param {string} message - Visible warning text, or empty text to hide the note.
 * @returns {void}
 */
function setDmContactSearchFieldNote(message = "") {
  setAccountFieldNote(dmContactSearchNote, message);
}

/** Updates network filter visibility and active state. @returns {void} */
function updateNetworkFilterButtons() {
  networkWorkspaceRenderer.filters();
}

/** Renders loaded, mutual and visible network counts. @returns {void} */
function renderNetworkSummary() {
  networkWorkspaceRenderer.summary();
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


/** Builds a squircle orbit path. @param {number} centerX - Center X. @param {number} centerY - Center Y. @param {number} radius - Ring radius. @returns {string|null} Path or circle fallback. */
function buildNetworkOrbitPath(centerX, centerY, radius) {
  return networkLayoutController.path(centerX, centerY, radius);
}

/** Resolves stage geometry for visible profiles. @param {object[]} nodes - Profiles. @param {string} selectedDid - Focus DID. @returns {object} Stage layout. */
function computeNetworkLayout(nodes, selectedDid = "") {
  return networkLayoutController.layout(nodes, selectedDid);
}

/** Renders the complete template-based network SVG stage. @returns {void} */
function renderNetworkStage() {
  networkStageRenderer.render();
}

/** Renders the complete template-based network focus card. @returns {void} */
function renderNetworkFocus() {
  networkFocusCardRenderer.render();
}

/** Renders template-based grouped network lists and pagination. @returns {void} */
function renderNetworkResults() {
  networkWorkspaceRenderer.results();
}

/** Updates network load/reset controls from application state. @returns {void} */
function updateNetworkControls() {
  renderNetworkLoadControls({ load: networkLoadButton, reset: networkResetButton, own: networkOwnLoadButton, account: networkAccountLoadButton }, {
      loading: networkLoading, authenticated: Boolean(authAccount), nodeCount: networkNodes.size,
      hasMoreFollowers: networkHasMoreFollowers, hasMoreFollows: networkHasMoreFollows,
      query: networkSearchQuery, filterMode: networkFilterMode, ownNetwork: isViewingOwnNetwork(), actor: getRequestedNetworkActor(),
    }, t);
}

/** Coordinates network presentation, content renderers and pending focus loading. @returns {void} */
/** Coordinates network rendering and pending focus loading. @returns {void} */
function renderNetworkWorkspace() {
  networkWorkspaceController.render();
}

/** Loads the next network wave through the data controller. @param {object} options - Actor/append/error flags. @returns {Promise<void>} Load completion. */
async function loadNetworkWave(options = {}) {
  await networkDataController.load(options);
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

/**
 * Renders the Direct Message archive summary through the extracted renderer.
 * @returns {void}
 */
function renderDmSummary() {
  dmArchiveWorkspaceRenderer.renderSummary();
}

/**
 * Renders the filterable Direct Message contact list through the extracted renderer.
 * @returns {void}
 */
function renderDmContacts() {
  dmArchiveWorkspaceRenderer.renderContacts();
}

/**
 * Renders the compact Direct Message conversation preview through the extracted renderer.
 * @returns {void}
 */
function renderDmResults() {
  dmArchiveWorkspaceRenderer.renderResults();
}

/**
 * Renders all visible Direct Message workspace sections through the extracted renderer.
 * @returns {void}
 */
function renderDmWorkspace() {
  dmArchiveWorkspaceRenderer.renderWorkspace();
}

async function exportDmArchiveJson(catalog = dmCatalog) {
  return dmArchiveExportController.exportJson(catalog);
}

/** Resolves the selected DM partner. @param {object|null} catalog - DM catalog. @returns {object|null} Partner metadata. */
function getDmPrimaryPartner(catalog = dmCatalog) {
  return dmExportModels.partner(catalog);
}

/** Resolves a conversation title. @param {object} convo - Conversation. @param {object|null} catalog - DM catalog. @returns {string} Title. */
function getDmConversationTitle(convo, catalog = dmCatalog) {
  return dmExportModels.title(convo, catalog);
}

/** Builds the DM export filename prefix. @param {object|null} catalog - DM catalog. @returns {string} Sanitized filename prefix. */
function makeDmArchiveFileBaseName(catalog = dmCatalog) {
  return dmExportModels.baseName(catalog);
}

/** Prepares ordered DM export messages. @param {object|null} catalog - DM catalog. @returns {object[]} Enriched message copies. */
function collectDmMessagesForExport(catalog = dmCatalog) {
  return dmExportModels.messages(catalog);
}
/** Builds a standalone DM HTML document from templates. @param {object} catalog - DM catalog. @returns {Promise<string>} Self-contained HTML. */
async function buildDmHtmlDocument(catalog = dmCatalog) {
  return dmHtmlRenderer.build(catalog);
}

async function exportDmHtmlFromCatalog(catalog = dmCatalog) {
  return dmArchiveExportController.exportHtml(catalog);
}

/** Paginates normalized DM messages. @param {object[]} messages - Ordered messages. @param {object} catalog - DM catalog. @returns {object[][]} Positioned pages. */
function paginateDmPdfMessages(messages, catalog) {
  return dmPdfRenderer.paginate(messages, catalog);
}

/** Renders one DM PDF page. @param {object} catalog - DM catalog. @param {Map} assetMap - Assets by path. @param {object[]} entries - Positioned messages. @param {number} pageIndex - Page index. @param {number} pageCount - Page count. @returns {Promise<object>} JPEG page and links. */
async function renderDmPdfCanvasPage(catalog, assetMap, entries, pageIndex, pageCount) {
  return dmPdfRenderer.page(catalog, assetMap, entries, pageIndex, pageCount);
}

async function exportDmPdfFromCatalog(catalog = dmCatalog) {
  return dmArchiveExportController.exportPdf(catalog);
}

/**
 * Checks Direct Message access through the extracted DM archive controller.
 * @returns {Promise<void>} Resolves when the chat API is reachable.
 */
async function checkDmAccess() {
  return dmArchiveController.checkAccess();
}

/**
 * Loads recent Direct Message partners through the extracted DM archive controller.
 * @returns {Promise<void>} Resolves after the partner cache has been refreshed.
 */
async function loadDmPartners() {
  return dmArchiveController.loadPartners();
}

/**
 * Loads the selected Direct Message archive through the extracted DM archive controller.
 * @returns {Promise<void>} Resolves after the archive catalog has been updated.
 */
async function loadDmArchive() {
  return dmArchiveController.loadArchive(checkDmAccess);
}

const ARCHIVE_RANGE_MAX_MONTHS = 3;

/**
 * Ensures the archive date inputs always contain a valid bounded range.
 * @param {"from" | "to" | "auto"} preferredEdge Which side should stay stable when clamping.
 * @returns {{ from: string, to: string, changed: boolean }} Final values and whether the inputs changed.
 */
function enforceArchiveDateRangeLimit(preferredEdge = "auto") {
  return archivePreferencesController.clamp(preferredEdge);
}

/**
 * Updates date input bounds to reflect the three-month archive limit.
 * @returns {void}
 */
function syncArchiveDateInputBounds() {
  return archivePreferencesController.bounds();
}

/**
 * Restores default archive dates when no valid range is currently set.
 * @returns {void}
 */
function ensureArchiveDateRangeDefaults() {
  return archivePreferencesController.ensure();
}

/**
 * Collects the current archive filters from the workspace controls.
 * @returns {object} Normalized archive filter object for persistence and fetches.
 */
function getArchiveFilters() {
  return archivePreferencesController.filters();
}


/** Reads normalized archive PDF settings. @returns {object} Options. */
function getArchivePdfOptions() {
  return archivePreferencesController.pdf();
}

/** Reads the bounded archive loading wave size. @returns {number} Size. */
function getArchiveWaveSize() {
  return archivePreferencesController.wave();
}

/** Captures current archive preferences. @returns {object} Snapshot. */
function getArchivePreferences() {
  return archivePreferencesController.snapshot();
}

/**
 * Applies stored archive preferences to the current workspace controls.
 * @param {object} preferences Persisted archive settings.
 * @returns {void}
 */
function applyArchivePreferences(preferences = {}) {
  return archivePreferencesController.restore(preferences);
}

function serializeArchiveFilters(filters = getArchiveFilters()) {
  return JSON.stringify(filters);
}

async function persistArchivePreferences() {
  await persistSettings();
}

/** Delegates renderArchiveSourceState to the archive domain. @returns {*} Domain result. */
function renderArchiveSourceState() { return archiveWorkspaceRenderer.source(); }

/** Validates the active archive source through the source controller. @param {object} options - Optional quiet validation. @returns {Promise<object|null>} Resolved source profile. */
async function validateArchiveSourceInput(options = {}) { return archiveSourceController.validate(options); }

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
  dmSelectedParticipantDids = retainDmSelectedParticipants(dmSelectedParticipantDids, dmRecentContacts);
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

/** Delegates saveArchiveSession to the archive domain. @param {*} nextSession - Operation input. @returns {*} Domain result. */
async function saveArchiveSession(nextSession) { return archiveRunController.saveSession(nextSession); }

/** Delegates saveArchiveCatalogState to the archive domain. @param {*} nextCatalog - Operation input. @returns {*} Domain result. */
async function saveArchiveCatalogState(nextCatalog = archiveCatalog) { return archiveRunController.saveCatalog(nextCatalog); }

/** Delegates clearArchiveSession to the archive domain. @returns {*} Domain result. */
async function clearArchiveSession() { return archiveRunController.clear(); }

/**
 * Updates archive scope controls and keeps the fixed range UI in sync.
 * @returns {void}
 */
function updateArchiveScopeFields() {
  if (archiveScopeSelect.value !== "range") {
    archiveScopeSelect.value = "range";
  }
  archiveYearWrap.hidden = true;
  archiveFromWrap.hidden = false;
  archiveToWrap.hidden = false;
  ensureArchiveDateRangeDefaults();
  enforceArchiveDateRangeLimit("auto");
  syncArchiveDateInputBounds();
}

/** Updates archive progress state and draws its presentation. @param {object} progress - Title, step, percent and detail. @returns {void} */
function setArchiveProgress({ title, step, percent = 0, detail = "" } = {}) {
  archiveJobState = { title, step, percent, detail };
  if (title || step || detail || Number(percent) > 0) { archiveLastProgressAt = new Date().toISOString(); }
  archiveWorkspaceRenderer.progress(archiveJobState);
}

/** Delegates renderArchivePreview to the archive domain. @param {*} preview - Operation input. @returns {*} Domain result. */
function renderArchivePreview(preview = archivePreviewState) { return archiveWorkspaceRenderer.preview(preview); }

/** Delegates renderArchiveProgressHeartbeat to the archive domain. @returns {*} Domain result. */
function renderArchiveProgressHeartbeat() { return archiveWorkspaceRenderer.heartbeat(); }

/** Delegates renderArchiveBackgroundNotice to the archive domain. @returns {*} Domain result. */
function renderArchiveBackgroundNotice() { return archiveWorkspaceRenderer.background(); }

/** Delegates renderArchiveStatusLine to the archive domain. @returns {*} Domain result. */
function renderArchiveStatusLine() { return archiveWorkspaceRenderer.status(); }

/** Delegates renderArchiveStartHint to the archive domain. @returns {*} Domain result. */
function renderArchiveStartHint() { return archiveWorkspaceRenderer.hint(); }

/** Delegates syncArchiveActionButtonStates to the archive domain. @returns {*} Domain result. */
function syncArchiveActionButtonStates() { return archiveWorkspaceRenderer.actionButtons(); }

function syncArchiveTransientNoticeFromCatalog() {
  archiveTransientNotice = buildArchiveCatalogNotice(archiveCatalog);
}

/** Delegates buildArchiveCatalogNotice to the archive domain. @param {*} catalog - Operation input. @returns {*} Domain result. */
function buildArchiveCatalogNotice(catalog = archiveCatalog) { return archiveWorkspaceModels.notice(catalog); }

/** Delegates updateArchiveRunControls to the archive domain. @returns {*} Domain result. */
function updateArchiveRunControls() { return archiveWorkspaceRenderer.controls(); }

/** Delegates setArchiveRunControl to the archive domain. @param {*} action - Operation input. @returns {*} Domain result. */
async function setArchiveRunControl(action) { return archiveRunController.control(action); }

/** Delegates updateArchiveSummary to the archive domain. @param {*} catalog - Operation input. @returns {*} Domain result. */
function updateArchiveSummary(catalog = archiveCatalog) { return archiveWorkspaceRenderer.summary(catalog); }

/** Delegates renderArchiveSpec to the archive domain. @returns {*} Domain result. */
function renderArchiveSpec() { return archiveWorkspaceRenderer.spec(); }

/** Delegates renderArchiveResults to the archive domain. @param {*} catalog - Operation input. @returns {*} Domain result. */
function renderArchiveResults(catalog = archiveCatalog) { return archiveWorkspaceRenderer.results(catalog); }

/** Delegates renderArchiveWorkspace to the archive domain. @returns {*} Domain result. */
function renderArchiveWorkspace() { return archiveWorkspaceRenderer.render(); }

/** Delegates invalidateArchiveCatalog to the archive domain. @returns {*} Domain result. */
function invalidateArchiveCatalog() { return archiveRunController.invalidate(); }

/** Refreshes the editing-time publish state and warnings. @returns {void} */
function updatePublishAvailability() { composerPublishAvailability.render(); }

/** Refreshes clear-button availability. @returns {void} */
function updateClearButtonState() { composerUiState.renderClear(); }

/** Applies the current lock state to Composer controls. @returns {void} */
function updateComposerLockState() { composerUiState.renderLock(); }

/** Sets manual-edit locking. @param {boolean} locked - Desired state. @returns {void} */
function setComposerLocked(locked) { composerUiState.setLocked(locked); }

/**
 * Sets whether the composer currently shows an already published thread.
 * @param {boolean} posted - True when the current composer content was just posted.
 * @returns {void}
 */
function setComposerPosted(posted) { composerUiState.setPosted(posted); }

function detectBrowserLocale() {
  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((value) => value.toLowerCase().split("-")[0]);

  return candidates.find((value) => SUPPORTED_LOCALES.includes(value)) || DEFAULT_LOCALE;
}

/** Detects iOS including desktop-identifying iPads. @returns {boolean} iOS device status. */
function isIosDevice() { return isIosDeviceFromShell(window.navigator); }

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

/** Refreshes PWA installation availability. @returns {void} */
function updateInstallButtonVisibility() { applicationInstall.render(); }

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

/**
 * Applies the selected theme mode and refreshes the settings controls.
 * @returns {void}
 */
function applyTheme() {
  appearanceController.applyTheme();
}

/**
 * Applies or removes the compact UI density mode.
 * @returns {void}
 */
function applyCompactMode() {
  appearanceController.applyDensity();
}

/**
 * Refreshes the appearance toggle labels and notes in settings.
 * @returns {void}
 */
function updateAppearanceModeControls() {
  appearanceController.renderControls();
}

function getThreadIntroText() {
  return t("threadIntroText");
}

/** Reads posting languages with locale fallback. @returns {string[]} Language tags. */
function getNormalizedPostLanguagesOrDefault() { return composerPostSettings.getLanguages(); }

/** Reads normalized reply/quote rules. @returns {object} Posting interaction settings. */
function getCurrentPostInteractionSettings() { return composerPostSettings.getInteraction(); }

/** Applies imported/stored reply rules. @param {object} value - Raw settings. @returns {void} */
function applyPostInteractionSettings(value = {}) { composerPostSettings.applyInteraction(value); }

/** Refreshes enabled state for custom reply rules. @returns {void} */
function renderPostInteractionControls() { composerPostSettings.renderInteraction(); }

/** Applies normalized desktop column widths. @returns {void} */
function applyDesktopLayoutState() { desktopLayout.apply(); }

/** Restores default widths and saves them. @returns {Promise<void>} Persistence completion. */
async function resetDesktopColumnWidths() { await desktopLayout.reset(); }

/** Refreshes responsive sidebar presentation. @returns {void} */
function applySidebarState() { desktopLayout.renderSidebar(); }

/**
 * Renders the compact language summary in the search workspace.
 * @returns {void}
 */
function renderSearchLanguageSummary() {
  return searchForm.renderLanguage();
}

/**
 * Returns true when more than one search language is active.
 * @returns {boolean} True for multi-language search mode.
 */
function isSearchMultiLanguageActive() {
  return searchForm.multiLanguage();
}

/**
 * Forces the search sort back to `latest` when multi-language search is active.
 * @param {boolean} announce - True when a user-facing hint should be shown.
 * @returns {void}
 */
function enforceSearchSortConstraints(announce = false) {
  return searchForm.enforceSort(announce);
}

/**
 * Updates the search sort dropdown for the active language selection.
 * @returns {void}
 */
function updateSearchSortOptionState() {
  return searchForm.updateSort();
}

/** Refreshes the complete posting language/decorations/rules summary. @returns {void} */
function renderPostLanguageSummary() { composerPostSettings.renderSummary(); }

/** Rebuilds the language dialog in its current context. @returns {void} */
function renderPostLanguageDialog() { composerPostSettings.renderDialog(); }

/**
 * Applies a translated tooltip and accessible label to one element.
 * @param {Element|null} element - Element that should receive title and aria-label.
 * @param {string} key - Translation key to read.
 * @returns {void}
 */
function applyTranslatedTitle(element, key) {
  if (!element || !key) {
    return;
  }

  const label = t(key);
  element.setAttribute("title", label);
  element.setAttribute("aria-label", label);
}

/**
 * Returns the matching language anchor for the multilingual privacy page.
 * @returns {string} One of `de`, `en`, or `fr`.
 */
function getPrivacyPageLanguageAnchor() {
  if (currentLocale === "de") {
    return "de";
  }
  if (currentLocale === "fr") {
    return "fr";
  }
  return DEFAULT_LOCALE;
}

/**
 * Updates privacy-page links to open the currently active language section.
 * @returns {void} Does not return a value.
 */
function updatePrivacyPageLanguageLinks() {
  const languageAnchor = getPrivacyPageLanguageAnchor();
  document.querySelectorAll("[data-privacy-language-link]").forEach((link) => {
    link.setAttribute("href", `./datenschutz.html#${languageAnchor}`);
  });
}

/**
 * Applies translated text and locale-dependent interface settings.
 * @returns {void} Does not return a value.
 */
function applyTranslations() {
  document.documentElement.lang = currentLocale;
  updatePrivacyPageLanguageLinks();
  syncArchiveTransientNoticeFromCatalog();
  ensureArchiveWorkspaceLayout();

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });
  restoreSearchStatusFromResultState();

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    applyTranslatedTitle(element, element.dataset.i18nTitle);
  });

  identifierField.placeholder = "z. B. name.bsky.social";
  passwordField.placeholder = "xxxx-xxxx-xxxx-xxxx";
  customServerField.placeholder = "https://example.com";
  if (linkCardEndpointInput) {
    linkCardEndpointInput.placeholder = "https://example.com/wp-json/threadline/v1/link-card";
  }
  if (linkCardUrlInput) {
    linkCardUrlInput.placeholder = t("linkCardUrlPlaceholder");
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
  renderSearchHashtagSummary();
  if (networkAccountInput) {
    networkAccountInput.placeholder = t("networkAccountInputPlaceholder");
  }
  if (archiveThreadUrlInput) {
    archiveThreadUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
  }
  if (postEditCheckUrlInput) {
    postEditCheckUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
  }
  renderSearchLanguageSummary();
  if (replyTargetUrlInput) {
    replyTargetUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
  }
  if (threadExplorerUrlInput) {
    threadExplorerUrlInput.placeholder = t("threadExplorerUrlPlaceholder");
  }
  if (savedSearchUrlInput) {
    savedSearchUrlInput.placeholder = t("savedSearchUrlPlaceholder");
  }
  if (archiveMediaActorInput) {
    archiveMediaActorInput.placeholder = t("archiveMediaActorPlaceholder");
  }
  analysisWorkspaceController.translate();
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
  resetColumnWidthsButton.textContent = t("resetColumnWidthsButton");
  updateAppearanceModeControls();
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
  if (archiveSavedSearchesButton) {
    archiveSavedSearchesButton.textContent = t("savedSearchesButton");
  }
  renderArchiveSavedSearchNote();
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
  renderArchiveZipHtmlScriptHelp();
  updateArchiveHtmlExportButtons();
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
  if (composerPostedDismissButton) {
    composerPostedDismissButton.textContent = t("composerPostedDismissButton");
  }
  applySidebarState();
  altTextPreviewCanvas.setAttribute("aria-label", t("altPreviewLabel"));
  hashtagAddButton.textContent = t("addHashtagButton");
  nextTipButton.textContent = t("nextTipButton");
  hideTipsButton.textContent = t("hideTipsButton");
  postSettingsButton.textContent = t("postSettingsButton");
  if (replyTargetButton) {
    replyTargetButton.textContent = t("replyTargetButton");
  }
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

  renderReplyTargetCard();
  renderSegments();
  renderAnalysisWorkspace();
  updateStatusForAuth();
  renderArchiveWorkspace();
  applyTheme();
  applyCompactMode();
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

/** Filters selected ids against available tags. @param {*} entries - Selection. @param {object[]} availableHashtags - Records. @returns {string[]} Valid ids. */
function normalizeSelectedHashtagEntries(entries, availableHashtags = hashtags) { return normalizeHashtagSelection(entries, availableHashtags); }

/**
 * Resolves one hashtag identifier or object to the visible hashtag text.
 * @param {string|object} normalized - Normalized hashtag id or hashtag-like object.
 * @returns {string} Display-ready hashtag text without the leading #.
 */
function getDisplayHashtag(normalized) { return getHashtagDisplayValue(normalized, hashtags); }


/** Reads the Composer hashtag suffix. @returns {string} Space-separated hashtags. */
function getSelectedHashtagText() { return hashtagController.getSelectedText(); }


/** Presents transient backup feedback. @param {string} message - Status text. @param {string} tone - Status tone. @returns {void} */
function setBackupStatus(message, tone = "neutral") { settingsBackupReminder.status(message, tone); }

/**
 * Opens the backup reminder dialog when the stored backup age is due.
 * @returns {void}
 */
function showSettingsBackupReminderIfNeeded() { settingsBackupReminder.show(); }

/**
 * Closes the backup reminder and optionally snoozes it.
 * @param {boolean} rememberDismissal - Whether to remember a temporary dismissal.
 * @returns {void}
 */
function closeSettingsBackupReminder(rememberDismissal) { settingsBackupReminder.close(rememberDismissal); }

/**
 * Saves a settings backup from the reminder dialog.
 * @returns {Promise<void>} Resolves after the backup export attempt finished.
 */
async function handleBackupReminderSaveClick() { await settingsBackupReminder.save(); }

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

/**
 * Returns whether one image has explicit upload transforms after applying Threadline limits.
 * @param {object} image - Image record with edit and export settings.
 * @returns {boolean} True when the image needs a transformed upload.
 */
function hasExplicitImageUploadTransform(image) {
  return hasExplicitSharedImageUploadTransform(image, IMAGE_MIN_EXPORT_SCALE);
}

/**
 * Normalizes one raw thread image entry into the stored internal Threadline shape.
 * @param {object} entry - Raw stored image entry.
 * @returns {object|null} Normalized thread image or `null` when the entry has no data URL.
 */
function normalizeThreadImage(entry = {}) {
  return normalizeSharedThreadImage(entry, {
    maxAltTextLength: MAX_ALT_TEXT_LENGTH,
    imageMinExportScale: IMAGE_MIN_EXPORT_SCALE,
  });
}

/**
 * Normalizes the full segment-image matrix for the composer state.
 * @param {Array<Array<object>>} segments - Raw segment image matrix.
 * @returns {Array<Array<object>>} Normalized segment image matrix.
 */
function normalizeSegmentImages(segments) {
  return normalizeSharedSegmentImages(segments, {
    maxAltTextLength: MAX_ALT_TEXT_LENGTH,
    imageMinExportScale: IMAGE_MIN_EXPORT_SCALE,
    maxImagesPerSegment: MAX_IMAGES_PER_SEGMENT,
  });
}

function normalizeSegmentOverrides(segments) {
  return normalizeComposerSegmentOverridesFromModule(segments);
}

function normalizePostingHistory(entries) {
  return normalizeComposerPostingHistory(entries, MAX_POSTING_HISTORY);
}

/**
 * Returns whether automatic image resizing is enabled for the current Threadline mode.
 * @param {string} mode - Raw or normalized resize mode.
 * @returns {boolean} True when the mode is not `off`.
 */
function isImageAutoResizeEnabled(mode = imageAutoResizeMode) {
  return isSharedImageAutoResizeEnabled(mode);
}

function mergePostingHistoryEntries(existing, imported) {
  return mergeComposerPostingHistory(existing, imported, MAX_POSTING_HISTORY);
}

function formatHistoryMeta(threadCount, imageCount) {
  return formatComposerHistoryMeta(threadCount, imageCount, t);
}

function syncSegmentImages(segmentCount) {
  segmentImages = syncComposerSegmentImagesFromModule(segmentImages, segmentCount);
}

/**
 * Renders the stored link-card preview for one composer segment.
 * @param {HTMLElement} container - Preview container belonging to the segment.
 * @param {number} segmentIndex - Index of the segment whose link card should be rendered.
 * @returns {void}
 */
function renderSegmentLinkCard(container, segmentIndex) { composerLinkCardPreview.render(container, segmentIndex); }

/**
 * Returns the first other segment that currently carries a link card.
 * @param {number} targetSegmentIndex - Segment that is currently being inspected.
 * @returns {number} Source segment index, or `-1` when none was found.
 */
function findOtherLinkCardSegmentIndex(targetSegmentIndex) {
  return findOtherComposerLinkCardIndex(segmentLinkCards, targetSegmentIndex, normalizeLinkCard);
}

/**
 * Returns every available target entry for one link-card move or swap operation.
 * @param {number} currentSegmentIndex - Segment from which the management dialog was opened.
 * @returns {Array<object>} Available target entries with target segment and action kind.
 */
function getLinkCardTargetEntries(currentSegmentIndex) {
  return getComposerLinkCardTargetEntries(currentSegmentIndex, activeSegments, segmentLinkCards, normalizeLinkCard);
}

/**
 * Renders the target list used for link-card move and swap actions.
 * @param {number} currentSegmentIndex - Segment from which the management dialog was opened.
 * @returns {void}
 */
function renderLinkCardTargetList(currentSegmentIndex) {
  renderComposerLinkCardTargets(currentSegmentIndex, getLinkCardTargetEntries(currentSegmentIndex), {
    list: linkCardTargetList, note: linkCardTargetListNote, template: linkCardTargetTemplate,
    emptyTemplate: document.querySelector("#link-card-target-empty-template"),
  }, {
    translate: t, clone: cloneTemplateContent,
    formatUrl: shortenThreadExplorerUrlForDisplay, applyAction: applyLinkCardTargetAction,
  });
}

/**
 * Applies one link-card move or swap between two segments.
 * @param {number} currentSegmentIndex - Segment from which the action starts.
 * @param {number} targetSegmentIndex - Segment chosen as the destination or swap target.
 * @returns {Promise<void>}
 */
async function applyLinkCardTargetAction(currentSegmentIndex, targetSegmentIndex) {
  await applyComposerLinkCardTargetAction(currentSegmentIndex, targetSegmentIndex, {
    cards: segmentLinkCards, normalizeCard: normalizeLinkCard, translate: t, setStatus,
    persist: persistSettings,
    render: () => preserveScrollPosition(() => renderSegments({ preserveOverrides: true })),
    saveDraft: queueDraftSave, close: closeLinkCardDialog,
  });
}

/**
 * Opens the link-card dialog for create, refresh, move, or manage actions.
 * @param {number} segmentIndex - Target segment index for the action.
 * @param {string} url - URL that should be used for create or refresh.
 * @param {string} action - Dialog action: `create`, `refresh`, `move`, or `manage`.
 * @param {number} sourceSegmentIndex - Optional source segment for move actions.
 * @returns {void}
 */
function openLinkCardDialog(segmentIndex, url, action = "create", sourceSegmentIndex = -1) {
  const normalizedUrl = normalizeLinkCardTargetUrl(url);
  pendingLinkCardSegmentIndex = segmentIndex;
  pendingLinkCardSourceSegmentIndex = sourceSegmentIndex;
  pendingLinkCardAction = action;
  pendingLinkCardUrl = normalizedUrl;
  composerLinkCardDialog.open({ segmentIndex, sourceSegmentIndex, action, url: normalizedUrl,
    hasImages: (segmentImages[segmentIndex]?.length || 0) > 0 });
}

/**
 * Closes the link-card dialog and resets the transient dialog state.
 * @returns {void}
 */
function closeLinkCardDialog() {
  pendingLinkCardSegmentIndex = -1;
  pendingLinkCardSourceSegmentIndex = -1;
  pendingLinkCardUrl = "";
  pendingLinkCardAction = "create";
  composerLinkCardDialog.close();
}

/**
 * Creates, refreshes, or moves the currently pending segment link card.
 * @returns {Promise<void>}
 */
async function normalizeStandardSiteMetadata(value = null) { return normalizeSharedStandardSiteMetadata(value, t); }

/**
 * Returns the footer label for a card that carries Standard.site publication metadata.
 * @param {object|null} standardSite - Normalized Standard.site metadata.
 * @returns {string} Localized footer suffix, or an empty string for normal link cards.
 */
function getPublicationCardFooterLabel(standardSite) { return getSharedPublicationCardFooterLabel(standardSite, t); }

/**
 * Normalizes one composer link card for storage, rendering, and publishing.
 * @param {object|null} card - Raw link-card data from settings, import, or proxy response.
 * @returns {object|null} Normalized link-card data, or null when invalid.
 */
function normalizeLinkCard(card = null) {
  return normalizeComposerLinkCard(card, normalizeStandardSiteMetadata);
}

function normalizeSegmentLinkCards(cards = []) {
  return normalizeComposerSegmentLinkCards(cards, normalizeLinkCard);
}

function syncSegmentLinkCards(segmentCount) { segmentLinkCards = syncComposerSegmentLinkCards(segmentLinkCards, segmentCount, normalizeLinkCard); }

/**
 * Normalizes the selected link-card provider to one of the supported values.
 * @param {string} value - Raw stored or selected provider value.
 * @returns {string} `none`, `microlink`, or `proxy`.
 */
function normalizeLinkCardProvider(value) {
  return normalizeComposerLinkCardProvider(value, LINK_CARD_PROVIDER_PROXY, LINK_CARD_PROVIDER_MICROLINK, LINK_CARD_PROVIDER_NONE);
}

/**
 * Normalizes the locally persisted Microlink usage counter.
 * @param {object|null} usage - Raw stored usage payload.
 * @returns {object} Normalized date and count values.
 */
function normalizeMicrolinkUsage(usage = null) {
  return composerProviderUsage.normalize(usage);
}

/**
 * Returns the current locally tracked Microlink usage for today.
 * @returns {object} Normalized usage payload for today.
 */
function getMicrolinkUsageState() {
  return composerProviderUsage.state();
}

/**
 * Refreshes the provider hint inside the link-card creation dialog.
 * @returns {void}
 */
function updateLinkCardDialogProviderState() {
  composerProviderPresentation.updateDialog();
}

/**
 * Returns whether Microlink has remaining local request budget for today.
 * @returns {boolean} True when another Microlink request may be sent.
 */
function canUseMicrolinkToday() {
  return composerProviderUsage.canUse();
}

/**
 * Stores one more local Microlink usage attempt and persists the counter.
 * @returns {Promise<void>}
 */
async function recordMicrolinkUsageAttempt() {
  await composerProviderUsage.record();
}

/**
 * Returns whether the configured WordPress link-card proxy is ready to use.
 * @returns {boolean} True when the proxy endpoint and secret are valid.
 */
function isLinkCardProxyConfigured() {
  return composerProxySettings.isConfigured();
}


/**
 * Normalizes the Composer proxy endpoint input through its settings controller.
 * @returns {void}
 */
function normalizeLinkCardSettingsInputs() {
  composerProxySettings.normalizeInputs();
}

/**
 * Validates current proxy settings without mutating their fields.
 * @returns {object} Proxy validation result.
 */
function validateLinkCardProxySettings() {
  return composerProxySettings.validate();
}

/**
 * Updates the provider radio buttons and provider note according to the current
 * proxy configuration and locally tracked Microlink usage.
 * @param {object} options - UI update options.
 * @param {boolean} options.persist - True when changed provider state should be saved.
 * @returns {void}
 */
function syncLinkCardProviderUi(options = {}) {
  composerProviderPresentation.sync(options);
}

/**
 * Returns the active link-card provider based on configuration and selection.
 * @returns {string} `none`, `microlink`, or `proxy`.
 */
function getActiveLinkCardProvider() {
  return composerProviderAvailability.active();
}

/**
 * Returns whether the current provider can create another link card right now.
 * @returns {boolean} True when the selected provider is currently usable.
 */
function canCreateLinkCardsWithCurrentProvider() {
  return composerProviderAvailability.canCreate();
}

/**
 * Updates proxy field validity and settings feedback.
 * @param {object} options - Optional show flag.
 * @returns {object} Proxy validation result.
 */
function updateLinkCardSettingsStatus(options = {}) {
  return composerProxySettings.updateStatus(options);
}

function closeSettingsDialog() {
  settingsDialog.close();
}

/**
 * Reads normalized proxy endpoint and secret values.
 * @returns {{endpoint:string,secret:string}} Current proxy settings.
 */
function getLinkCardSettings() {
  return composerProxySettings.settings();
}

/**
 * Loads a remote link-card image and converts it into a data URL for preview and upload.
 * @param {string} imageUrl - Absolute HTTP(S) image URL.
 * @returns {Promise<object>} Embedded image data and detected MIME type.
 */
async function fetchLinkCardImageDataUrl(imageUrl) {
  return await fetchComposerLinkCardImage(imageUrl, {
    fetch: (url, options) => fetch(url, options), fileToDataUrl, translate: t,
  });
}

/**
 * Requests link-card metadata for a URL from the configured WordPress proxy.
 * @param {string} url - HTTP(S) URL that should be previewed.
 * @returns {Promise<object|null>} Normalized link-card data, or null when the proxy returned invalid data.
 */
async function requestLinkCardFromProxy(url) { return composerLinkCardRequests.proxy(url); }

/**
 * Creates a simple link card without fetching external metadata.
 * @param {string} url - HTTP(S) URL that should be turned into a basic link card.
 * @returns {object|null} Normalized link-card data with URL-based fallback fields.
 */
function createBasicLinkCard(url) {
  return buildBasicLinkCard(url, normalizeLinkCard);
}

/**
 * Requests link-card metadata for a URL from the public Microlink endpoint.
 * @param {string} url - HTTP(S) URL that should be previewed.
 * @returns {Promise<object|null>} Normalized link-card data, or null when Microlink returned invalid data.
 */
async function requestLinkCardFromMicrolink(url) { return composerLinkCardRequests.microlink(url); }

/**
 * Requests link-card metadata from the currently active provider.
 * @param {string} url - HTTP(S) URL that should be previewed.
 * @returns {Promise<object|null>} Normalized link-card data or null on invalid provider output.
 */
async function requestLinkCard(url) {
  return await requestComposerLinkCard(url, {
    getProvider: getActiveLinkCardProvider,
    providers: { proxy: LINK_CARD_PROVIDER_PROXY, microlink: LINK_CARD_PROVIDER_MICROLINK },
    proxy: requestLinkCardFromProxy, microlink: requestLinkCardFromMicrolink, basic: createBasicLinkCard,
  });
}

function getHistoryPreviewText(text) {
  return getComposerHistoryPreviewText(text);
}

function normalizeReplyTarget(target = null) {
  return normalizeComposerReplyTarget(target, getHistoryPreviewText);
}


/** Closes the reply-target dialog. @returns {void} */
function closeReplyTargetDialog() { composerReplyDialog.close(); }

/** Clears the reply target. @param {object} options - Optional render flag. @returns {void} */
function clearComposerReplyTarget(options = {}) { composerReplyController.clear(options); }

/** Gets the normalized target account name. @param {object|null} target - Reply target. @returns {string} */
function getReplyTargetDisplayName(target = composerReplyTarget) {
  return getComposerReplyTargetDisplayName(normalizeReplyTarget(target));
}

/** Refreshes the reply-target preview card. @returns {void} */
function renderReplyTargetCard() {
  renderComposerReplyTargetCard(normalizeReplyTarget(composerReplyTarget), {
    card: replyTargetCard, eyebrow: replyTargetCardEyebrow, avatar: replyTargetAvatar,
    name: replyTargetName, handle: replyTargetHandle, meta: replyTargetMeta,
    warning: replyTargetWarning, text: replyTargetText,
  }, { withCounters: counterToggle.checked, translate: t, setAvatar: setAvatarImage });
}

/** Returns trimmed posting texts. @returns {string[]} Ordered section texts. */
function getSegmentTextPayloads() {
  return getComposerPostingTexts(activeSegments, currentComposedText);
}

/** Builds current text/media payloads. @returns {object[]} Ordered posting payloads. */
function getSegmentPayloads() {
  return buildComposerPostingPayloads({ segments: activeSegments, composedText: currentComposedText, images: segmentImages, cards: segmentLinkCards }, normalizeLinkCard);
}


function showProgressDialog(title, message) {
  showProgressModal({
    dialog: progressDialog,
    title: progressTitle,
    message: progressMessage,
  }, title, message);
}

function hideProgressDialog() {
  closeModalDialog(progressDialog);
}

/**
 * Opens the shared dialog for errors, warnings, and informational notes.
 * @param {string} message - Main dialog message.
 * @param {string} title - Dialog title.
 * @param {object} options - Optional dialog extensions.
 * @param {string} options.linkUrl - Optional clickable URL rendered below the message.
 * @param {string} options.linkLabel - Optional label for the clickable URL.
 * @returns {void}
 */
function showErrorDialog(message, title = t("errorTitle"), options = {}) {
  showErrorModal({
    dialog: errorDialog,
    title: errorTitle,
    message: errorMessage,
    linkWrap: errorLinkWrap,
    link: errorLink,
  }, {
    title,
    message,
    linkUrl: options.linkUrl,
    linkLabel: options.linkLabel,
  });
}

/**
 * Updates the ALT-text dialog counter.
 * @returns {void}
 */
function setAltTextCount() { composerAltTextDialog.count(); }

/**
 * Opens the ALT-text dialog for a segment image.
 * @param {number} segmentIndex - Image segment.
 * @param {number} imageIndex - Image index.
 * @returns {void}
 */
function openAltTextDialog(segmentIndex, imageIndex) { composerAltTextDialog.open(segmentIndex, imageIndex); }

/**
 * Clears and closes the ALT-text dialog.
 * @returns {void}
 */
function closeAltTextDialog() { composerAltTextDialog.close(); }

/**
 * Saves the current ALT text through the dialog controller.
 * @returns {Promise<void>}
 */
async function saveAltText() { await composerAltTextDialog.save(); }

/**
 * Opens the image editor for a segment image.
 * @param {number} segmentIndex - Segment index.
 * @param {number} imageIndex - Image index.
 * @returns {Promise<void>}
 */
async function openImageEditorDialog(segmentIndex, imageIndex) {
  await composerImageEditor.open(segmentIndex, imageIndex);
}

/**
 * Adds selected files through the Composer image collection controller.
 * @param {number} segmentIndex - Target segment.
 * @param {Array<File>|FileList} files - Selected files.
 * @returns {Promise<void>}
 */
async function handleSegmentImageSelection(segmentIndex, files) {
  await composerImageCollection.select(segmentIndex, files);
}

/**
 * Reorders an image using the image collection controller.
 * @param {number} segmentIndex - Source segment.
 * @param {number} imageIndex - Image position.
 * @param {number} direction - Position offset.
 * @returns {void}
 */
function moveSegmentImage(segmentIndex, imageIndex, direction) {
  composerImageCollection.move(segmentIndex, imageIndex, direction);
}

/**
 * Clears image and file drop markers in the page.
 * @returns {void}
 */
function clearSegmentImageDropMarkers() {
  clearComposerImageDropMarkers(document);
}

/**
 * Resets the page-owned image drag state and removes drag styling.
 * @returns {void}
 */
function clearSegmentImageDragState() {
  segmentImageDragState = null;
  clearComposerImageDragVisuals(document);
}

/**
 * Gets the insertion side for an image drop.
 * @param {DragEvent} event - Drag event.
 * @param {DOMRect} rect - Target card bounds.
 * @returns {string} Before or after.
 */
function getSegmentImageDropPosition(event, rect) {
  return getComposerImageDropPosition(event, rect);
}

/**
 * Detects external file transfers.
 * @param {DragEvent} event - Drag event.
 * @returns {boolean} Whether files are transferred.
 */
function eventHasTransferFiles(event) {
  return composerEventHasTransferFiles(event);
}

/**
 * Gets image files from an external drop.
 * @param {DragEvent} event - Drop event.
 * @returns {Array<File>} Image files.
 */
function getDroppedImageFiles(event) {
  return getComposerDroppedImageFiles(event);
}

/**
 * Moves an image to a segment insertion position.
 * @param {number} fromSegmentIndex - Source segment.
 * @param {number} fromImageIndex - Source image.
 * @param {number} toSegmentIndex - Target segment.
 * @param {number} toImageIndex - Target insertion index.
 * @returns {boolean} Whether the collection changed.
 */
function moveSegmentImageToPosition(fromSegmentIndex, fromImageIndex, toSegmentIndex, toImageIndex) {
  return composerImageCollection.moveTo(fromSegmentIndex, fromImageIndex, toSegmentIndex, toImageIndex);
}

/**
 * Deletes an image using the image collection controller.
 * @param {number} segmentIndex - Source segment.
 * @param {number} imageIndex - Image to remove.
 * @returns {void}
 */
function deleteSegmentImage(segmentIndex, imageIndex) {
  composerImageCollection.remove(segmentIndex, imageIndex);
}

/** Opens the reply-target dialog. @param {string} presetUrl - Optional preset. @returns {void} */
function openReplyTargetDialog(presetUrl = "") { composerReplyDialog.open(presetUrl); }

/** Submits the reply-target URL. @returns {Promise<void>} */
async function submitReplyTargetDialog() { await composerReplyDialog.submit(); }

async function openConfirmDialog({ title, message, confirmLabel, cancelLabel, preview = null, confirmValue = true, cancelValue = false, dismissValue = false }) {
  return confirmDialogController.open({
    title,
    message,
    confirmLabel,
    cancelLabel,
    preview,
    confirmValue,
    cancelValue,
    dismissValue,
    fallbackConfirmLabel: t("confirmYes"),
    fallbackCancelLabel: t("confirmNo"),
  });
}

/**
 * Decodes compressed JSON files for thread and archive import.
 * @param {Blob} blob - Gzip file.
 * @returns {Promise<string>} JSON text.
 */
async function gunzipBlob(blob) { return composerThreadFileCodec.gunzip(blob); }

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

function utf8Bytes(value) {
  return new TextEncoder().encode(String(value));
}

function parseJsonBytes(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

const archiveZipCodec = createStoredZipCodec({
  encode: utf8Bytes,
  now: () => new Date(),
  invalidArchive: () => t("archiveImportInvalid"),
  closedWriter: () => t("archiveZipWriterClosed"),
});

/**
 * Returns a normalized archive catalog.
 * @param {object} rawCatalog - Raw imported catalog.
 * @returns {object} Delegated operation result.
 */
function normalizeImportedArchiveCatalog(rawCatalog) { return archiveCatalogFiles.normalize(rawCatalog); }

/**
 * Loads a ZIP, JSON or gzip archive.
 * @param {File} file - Selected archive file.
 * @returns {Promise<object>} Delegated operation result.
 */
async function loadArchiveCatalogFromFile(file) { return archiveCatalogFiles.load(file); }

/** Delegates applyLoadedArchiveCatalog to the archive domain. @param {*} catalog - Operation input. @param {*} sessionOverrides - Operation input. @returns {*} Domain result. */
async function applyLoadedArchiveCatalog(catalog, sessionOverrides = {}) { return archiveRunController.apply(catalog, sessionOverrides); }

function makeArchiveFileBaseName(catalog = archiveCatalog) {
  const handle = String(catalog?.manifest?.account?.handle || authAccount || "account").replace(/[^\w.-]+/g, "-");
  const datePart = formatArchiveDatePart(catalog?.manifest?.exportedAt);
  return `threadline-archive-${handle}-${datePart}`;
}

/**
 * Reads the archive-media form and returns the selected export options.
 * @returns {object} Actor, selected media kinds, and active archive filters.
 */
function getArchiveMediaExportOptions() {
  return {
    actor: String(archiveMediaActorInput?.value || "").trim(),
    includeImages: archiveMediaImagesToggle?.checked !== false,
    includeVideos: archiveMediaVideosToggle?.checked !== false,
    includeOther: archiveMediaOtherToggle?.checked !== false,
    filters: getArchiveFilters(),
  };
}

/**
 * Enables or disables media export controls while a ZIP stream is running.
 * @param {boolean} disabled - Whether controls should be blocked.
 * @returns {void}
 */
function setArchiveMediaExportControlsDisabled(disabled) {
  const isDisabled = disabled === true;
  [
    archiveMediaActorInput,
    archiveMediaImagesToggle,
    archiveMediaVideosToggle,
    archiveMediaOtherToggle,
  ].forEach((control) => {
    if (control) {
      control.disabled = isDisabled;
    }
  });
}

/**
 * Exports or resumes media ZIP parts.
 * @returns {Promise<void>} Delegated operation result.
 */
async function exportArchiveMediaZip() { return archiveMediaExport.export(); }

/**
 * Exports the supplied or active catalog as ZIP.
 * @param {object} catalog - Archive catalog.
 * @returns {Promise<void>} Delegated operation result.
 */
async function exportArchiveZipFromCatalog(catalog = archiveCatalog) { return archiveCatalogFiles.export(catalog); }

function escapeHtmlAttribute(value) {
  return escapeHtml(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isArchiveHtmlTooLargeForEmbeddedExport(catalog = archiveCatalog) {
  return Boolean(catalog) && shouldAutoFallbackArchiveHtmlToCompact(catalog.assets || []);
}

/** Delegates updateArchiveHtmlExportButtons to the archive domain. @returns {*} Domain result. */
function updateArchiveHtmlExportButtons() { return archiveWorkspaceRenderer.htmlButtons(); }

function waitForUiFrame() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function getArchiveZipHtmlScriptCommand() {
  return 'powershell -ExecutionPolicy Bypass -File .\\scripts\\convert-threadline-archive-to-html.ps1 -ArchiveSourcePath "C:\\Pfad\\zu\\threadline-archive-ordner"';
}

function renderArchiveZipHtmlScriptHelp() {
  const readmeUrl = "https://github.com/marsrakete/threadline/tree/main/scripts";
  document.querySelectorAll('[data-i18n="archiveZipHtmlScriptNote"]').forEach((node) => {
    node.textContent = t("archiveZipHtmlScriptNoteLead");
    const link = document.createElement("a");
    setAttrs(link, {
      href: readmeUrl,
      target: "_blank",
      rel: "noreferrer noopener",
    });
    setSafeText(link, t("archiveZipHtmlScriptReadmeLink"));
    node.append(" ", link, ". ", t("archiveZipHtmlScriptNoteTail"));
  });
  if (archiveZipHtmlScriptCommand) {
    archiveZipHtmlScriptCommand.hidden = true;
    archiveZipHtmlScriptCommand.textContent = getArchiveZipHtmlScriptCommand();
  }
  if (archiveZipHtmlScriptCopyButton) {
    archiveZipHtmlScriptCopyButton.hidden = true;
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  helper.style.pointerEvents = "none";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

/**
 * Resolves an account avatar through the shared cache lookup.
 * @param {object} account - Account identity and avatar metadata.
 * @returns {string} Embedded cache asset or remote fallback URL.
 */
function getStoredAccountAvatarUri(account = {}) {
  return resolveStoredAccountAvatar(account, accountAvatarAssets, assetToDataUri);
}

function applyAccountAvatarCache(cache) {
  accountAvatarAssets = Array.isArray(cache?.assets) ? cache.assets : [];
}

async function restoreAccountAvatarCache() {
  const cache = await sendToServiceWorker("GET_ACCOUNT_AVATAR_CACHE", {}, { timeoutMs: 120000 }).catch(() => null);
  applyAccountAvatarCache(cache);
}

/**
 * Hydrates archive avatar paths through the catalog asset module.
 * @param {object|null} catalog - Mutable catalog.
 * @returns {Promise<object|null>} Catalog with resolved avatar paths.
 */
async function ensureArchiveAvatarAssets(catalog) { return catalogAvatarAssets.archive(catalog); }

/**
 * Hydrates dm avatar paths through the catalog asset module.
 * @param {object|null} catalog - Mutable catalog.
 * @returns {Promise<object|null>} Catalog with resolved avatar paths.
 */
async function ensureDmAvatarAssets(catalog) { return catalogAvatarAssets.dm(catalog); }

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

/** Extracts hashtag data using the shared parser. @param {*} text - Post text. @returns {object[]} Normalized hashtag values. */
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

/**
 * Reads the external card stored on an archive post.
 * @param {object} post - Archive post object.
 * @returns {object|null} External card data, or null when no card exists.
 */
function getArchiveExternalCard(post = {}) {
  if (post?.externalCard?.url) {
    return post.externalCard;
  }
  return null;
}

/**
 * Delegates standalone HTML export for the supplied or active archive.
 * @param {object} catalog - Archive catalog, defaulting to the active catalog.
 * @param {object} options - Optional full/compact export mode.
 * @returns {Promise<void>} Delivery and final progress completion.
 */
async function exportArchiveHtmlFromCatalog(catalog = archiveCatalog, options = {}) {
  await archiveHtmlExport.export(catalog, options);
}

/**
 * Exports PDF volumes for the supplied or active archive.
 * @param {object} catalog - Archive catalog.
 * @returns {Promise<void>} Completed PDF delivery.
 */
async function exportArchivePdfBandsFromCatalog(catalog = archiveCatalog) {
  await archivePdfExport.export(catalog);
}

/** Delegates ensureArchiveCatalogLoaded to the archive domain. @param {*} forceRefresh - Operation input. @returns {*} Domain result. */
async function ensureArchiveCatalogLoaded(forceRefresh = false) { return archiveRunController.ensure(forceRefresh); }

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

/**
 * Fills the post edit dialog with a detected edit result.
 * @param {object} result - Mu-compatible edit metadata result.
 * @returns {void}
 */
function renderPostEditCheckResult(result) {
  postEditCheckStatus.textContent = t("postEditCheckDetected");
  postEditCheckStatus.classList.add("is-edited");
  postEditCheckCreated.textContent = formatHistoryTimestamp(result.createdAt);
  postEditCheckUpdated.textContent = formatHistoryTimestamp(result.updatedAt);
  postEditCheckOriginal.textContent = result.originalText;
  renderPostEditCurrentText(result.originalText, result.text);
  postEditCheckResult.hidden = false;
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

  renderPostEditCheckResult(result);
}

/** Delegates importArchiveThreadFromUrl to the archive domain. @returns {*} Domain result. */
async function importArchiveThreadFromUrl() { return archiveRunController.importThread(); }


/** Rebuilds the active-context hashtag controls. @returns {void} */
function renderHashtagCloud() { hashtagController.render(); }

/** Reads all current settings for persistence and backup. @returns {object} Settings snapshot. */
function getSettingsSnapshot() {
  return {
    localePreference,
    tipsVisible,
    altTextRequired,
    imageAutoResizeMode,
    archiveExpertMode,
    themeMode,
    compactMode,
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
    linkCardProvider: getActiveLinkCardProvider(),
    linkCardMicrolinkUsage: getMicrolinkUsageState(),
    hashtags,
    selectedHashtags,
    searchSelectedHashtags,
    hashtagPlacement,
    segmentImages,
    segmentLinkCards,
    postingHistory,
    threadExplorerFavorites,
    threadExplorerState: getPersistableThreadExplorerState(),
    savedSearches,
    searchPreferences: getSearchPreferences(),
    searchResultState: getPersistableSearchResultState(),
    archivePreferences: getArchivePreferences(),
    analysisState: getPersistableAnalysisState(),
  };
}

/** Persists the latest settings through the existing serialized queue. @returns {Promise<void>} Completion. */
async function persistSettings() { await applicationStorage.persist(); }

/**
 * Exports the current settings backup and records the successful export time.
 * @returns {Promise<void>} Resolves after the backup file handoff has completed.
 */
async function exportSettingsBackup() { await settingsBackup.exportFile(); }

/**
 * Imports a Threadline settings backup file and merges it into local state.
 * @param {File} file - JSON or GZIP-compressed settings backup file.
 * @returns {Promise<void>} Resolves after local state and persistence are updated.
 */
async function importSettingsBackup(file) { await settingsBackup.importFile(file); }

/** Displays update feedback. @param {string} message - Label. @param {boolean} showReload - Highlight reload. @param {boolean} error - Error tone. @returns {void} */
function setUpdateStatus(message, showReload = false, error = false) { applicationUpdates.status(message, showReload, error); }
/** Renders app/cache version labels. @returns {void} */
function renderVersionLabel() { applicationUpdates.renderVersion(); }
/** Applies a guarded worker-assisted reload. @returns {Promise<void>} Update attempt completion. */
async function performAppReload() { await applicationUpdates.reload(); }
/** Checks remote versions. @param {object} options - Feedback flags. @returns {Promise<void>} Check completion. */
async function checkForUpdates(options = {}) { await applicationUpdates.check(options); }
/** Schedules a throttled silent update check. @returns {void} */
function scheduleSilentUpdateCheck() { applicationUpdates.schedule(); }

function updateStatusForAuth() {
  updateAuthButtons();
  ensureNetworkStateForAccount();
  if (currentWorkspace === "network") {
    renderNetworkWorkspace();
    if (authAccount && !networkNodes.size && !networkLoading) {
      void loadNetworkWave({ silentErrors: true });
    }
  }
  if (currentWorkspace === "threadExplorer") {
    renderThreadExplorerWorkspace();
    if (authAccount && !threadExplorerItems.length && !threadExplorerLoadingFeed) {
      void loadThreadExplorerFeed({ reset: true });
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

/** Verifies the active account. @param {object} options - Silent flag. @returns {Promise<boolean>} Authenticated status. */
async function verifySession(options = {}) { return applicationSession.verify(options); }
/** Restarts periodic session verification. @returns {void} */
function startSessionChecks() { applicationSession.start(); }

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

/**
 * Resolves a shared post URL and opens the matching live thread in Thread Explorer.
 * @param {string} url - Shared post URL from a supported Bluesky web frontend.
 * @returns {Promise<void>} Resolves after the thread was selected.
 */
async function openPostUrlInThreadExplorer(url) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    throw new Error(t("threadExplorerUrlMissing"));
  }

  const result = await sendToServiceWorker("RESOLVE_THREAD_EXPLORER_POST_URL", {
    url: normalizedUrl,
  }, {
    timeoutMs: 30000,
  });
  const uri = String(result?.uri || "").trim();
  if (!uri) {
    throw new Error(t("threadExplorerUrlFailed"));
  }

  showThreadExplorerWorkspace();
  await selectThreadExplorerPost(uri);
}

/**
 * Opens the most recently published post in Thread Explorer from the publish-result dialog.
 * @returns {Promise<void>} Resolves after the thread was opened or the dialog restored.
 */
async function handlePublishResultThreadExplorerClick() {
  await openComposerPublishedPost({ explorerButton: publishResultThreadExplorerButton, dialog: publishResultDialog }, {
    setBusy, translate: t, openPost: openPostUrlInThreadExplorer,
    reportError: (error) => console.error(error), showError: showErrorDialog,
  });
}

/**
 * Presents the publication result using the shared Composer result renderer.
 * @param {object} result - Worker publication result.
 * @returns {void}
 */
function showPublishResult(result) {
  const model = buildComposerPublishResultModel(result, {
    account: authAccount, webApp: authAccountWebApp, translate: t,
    getTargetName: getPostTargetName, buildPostUrl: buildBlueskyPostUrl,
    formatRateLimit: buildPublishRateLimitMessage,
  });
  renderComposerPublishResult(model, {
    dialog: publishResultDialog, text: publishResultText, rateLimitNote: publishResultRateLimitNote,
    link: publishResultLink, explorerButton: publishResultThreadExplorerButton,
  });
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

/**
 * Renders the saved publications with the Composer history templates.
 * @returns {void}
 */
function renderHistoryList() {
  renderComposerHistoryList(postingHistory, {
    list: historyList, button: historyButton,
    itemTemplate: document.querySelector("#history-item-template"),
    emptyTemplate: document.querySelector("#history-empty-template"),
  }, {
    translate: t, formatTimestamp: formatHistoryTimestamp, formatMeta: formatHistoryMeta,
    createActions: (entry, controls) => createComposerHistoryItemActions(entry, controls, {
      translate: t, setBusy, openPost: openPostUrlInThreadExplorer,
      closeDialog: () => historyDialog.close(),
      reportError: (error) => console.error(error), showError: showErrorDialog, setStatus,
      requestTarget: (url, mode) => requestReplyTarget(sendToServiceWorker, url, mode),
      applyTarget: (target) => {
        composerReplyTarget = normalizeReplyTarget(target);
        renderReplyTargetCard();
        publishButton.textContent = getPublishButtonLabel();
        updatePublishAvailability();
        queueDraftSave();
      },
      showComposer: () => showComposerWorkspace({ redirectPage: true }),
      remove: (id) => { postingHistory = postingHistory.filter((entry) => entry.id !== id); },
      render: renderHistoryList, persist: persistSettings,
    }),
  });
}

/**
 * Records a completed publication and persists the updated posting history.
 * @param {object} result - Publication result.
 * @param {Array<object>} preparedSegments - Published upload-ready segments.
 * @returns {Promise<void>}
 */
async function recordPublishedThread(result, preparedSegments) {
  const entry = buildComposerHistoryEntry(result, preparedSegments, {
    account: authAccount, service: authAccountService, webApp: authAccountWebApp,
    buildPostUrl: buildBlueskyPostUrl, preview: getHistoryPreviewText,
    createId: () => crypto.randomUUID(), now: () => new Date().toISOString(),
  });
  await recordComposerHistoryEntry(entry, {
    getHistory: () => postingHistory, normalize: normalizePostingHistory,
    setHistory: (entries) => { postingHistory = entries; },
    render: renderHistoryList, persist: persistSettings,
  });
}

/**
 * Builds the public profile URL for a resolved mention.
 * @param {string} handle - Normalized handle without leading at sign.
 * @param {string|null} did - Resolved DID when available.
 * @returns {string} Public Bluesky profile URL.
 */
function buildComposerMentionProfileUrl(handle, did) {
  return buildComposerMentionProfileUrlFromData(handle, did, DEFAULT_POST_WEB_APP);
}


/**
 * Applies one pending mention correction from a segment back to the original composer text.
 * @param {number} segmentIndex - Zero-based segment index.
 * @param {string} fromHandle - Handle that still exists in the original text.
 * @param {string} toHandle - Corrected handle that should replace it.
 * @returns {void}
 */
function applyMentionSourceSync(segmentIndex, fromHandle, toHandle) { composerMentionSourceCorrection.apply(segmentIndex, fromHandle, toHandle); }


/**
 * Writes a value into an input field and notifies existing listeners.
 * @param {HTMLInputElement|null} input - Target input element.
 * @param {string} value - Next field value.
 * @returns {void}
 */
function setPickerInputValue(input, value) {
  accountPickerController.setInputValue(input, value);
}

/**
 * Opens the shared account picker dialog for a regular account field.
 * @param {object} options - Picker configuration for the target field.
 * @param {string} options.label - Visible field label used in the dialog title.
 * @param {string} options.initialQuery - Pre-filled search value.
 * @param {(actor: object, value: string) => void} options.onSelect - Callback after a result was chosen.
 * @param {string} [options.noteKey] - Optional translation key for the dialog note.
 * @returns {void}
 */
function openAccountPickerDialog(options = {}) {
  accountPickerController.open(options);
}

/**
 * Applies the selected account to the current non-mention picker target.
 * @param {object} actor - Chosen account search result.
 * @returns {void}
 */
function applyAccountPickerSelection(actor = {}) {
  accountPickerController.select(actor);
}

/** Applies a picked archive account. @param {object} actor - Picker result. @param {string} value - Preferred field value. @returns {void} */
function applyArchiveSourcePickerSelection(actor, value) { archiveSourceController.select(actor, value); }

/**
 * Applies a chosen account to the DM partner search and selects a loaded partner when possible.
 * @param {object} actor - Chosen account search result.
 * @param {string} value - Preferred field value, usually the handle.
 * @returns {void}
 */
function applyDmContactPickerSelection(actor, value) {
  const normalizedValue = String(value || actor?.handle || actor?.did || "").trim();
  const normalizedHandle = String(actor?.handle || normalizedValue).trim().replace(/^@/, "").toLowerCase();
  const normalizedDid = String(actor?.did || "").trim().toLowerCase();
  setPickerInputValue(dmContactSearchInput, normalizedValue);

  let matchedDid = "";
  for (const contact of Array.isArray(dmRecentContacts) ? dmRecentContacts : []) {
    const contactDid = String(contact?.did || "").trim();
    const contactDidLower = contactDid.toLowerCase();
    const contactHandle = String(contact?.handle || "").trim().replace(/^@/, "").toLowerCase();
    if (normalizedDid && contactDidLower === normalizedDid) {
      matchedDid = contactDid;
      break;
    }
    if (normalizedHandle && contactHandle === normalizedHandle) {
      matchedDid = contactDid;
      break;
    }
  }

  if (matchedDid) {
    dmSelectedParticipantDids = [matchedDid];
  } else {
    dmSelectedParticipantDids = [];
  }
  renderDmWorkspace();
  if (matchedDid) {
    setDmContactSearchFieldNote("");
  } else {
    setDmContactSearchFieldNote(t("dmContactNotLoadedMatch"));
  }
}

/**
 * Opens the shared account picker for a plain input field and writes the chosen value back.
 * @param {HTMLInputElement|null} input - Target field that should receive the chosen account.
 * @param {string} label - Visible field label used in the dialog title.
 * @param {object} [options] - Optional picker settings.
 * @param {string} [options.noteKey] - Optional translation key for the dialog note.
 * @param {(actor: object, value: string) => void} [options.onSelect] - Optional custom selection handler.
 * @returns {void}
 */
function openInputAccountPicker(input, label, options = {}) {
  accountPickerController.openInput(input, label, options);
}

/**
 * Enables automatic account-picker opening for one input field after a short query.
 * @param {HTMLInputElement|null} input - Target account input field.
 * @param {string} label - Visible field label used in the picker dialog.
 * @param {object} [options] - Optional picker settings forwarded to the dialog.
 * @param {string} [options.noteKey] - Optional translation key for the dialog note.
 * @param {(actor: object, value: string) => void} [options.onSelect] - Optional custom selection handler.
 * @returns {void}
 */
function enableAutoAccountPicker(input, label, options = {}) {
  accountPickerController.enableAutoOpen(input, label, options);
}

/**
 * Delegates the mention dialog reset action to its controller.
 * @returns {void} Completes the dialog action.
 */
function resetMentionSearchDialogState() {
  return composerMentionSearchActions.reset();
}

/**
 * Delegates the mention dialog close action to its controller.
 * @returns {void} Completes the dialog action.
 */
function closeMentionSearchDialog() {
  return composerMentionSearchActions.close();
}

/**
 * Delegates the mention dialog select action to its controller.
 * @param {string} selectedHandle - Selected account handle.
 * @returns {boolean} Whether the selection was applied.
 */
function applyMentionSearchSelection(selectedHandle) {
  return composerMentionSearchActions.select(selectedHandle);
}

/**
 * Renders account search hits using the Composer mention renderer.
 * @param {object[]} actors - Search result actors.
 * @returns {void}
 */
function renderMentionSearchResults(actors) {
  renderComposerMentionSearchResults(actors, {
    container: mentionSearchResults, template: mentionSearchResultTemplate,
    cloneTemplateContent, setAvatarImage, translate: t,
    onSelect(actor) {
      if (mentionSearchContext === "account") {
        applyAccountPickerSelection(actor);
        return;
      }
      applyMentionSearchSelection(actor.handle || "");
    },
  });
}

/**
 * Searches mention actors through the shared request workflow.
 * @param {string} rawQuery - Current search value.
 * @returns {Promise<void>} Completes after current results are displayed.
 */
async function runMentionSearch(rawQuery) {
  return runComposerMentionSearch(rawQuery, {
    status: mentionSearchStatus,
    results: mentionSearchResults,
    translate: t,
    startRequest: composerMentionDialog.start,
    isCurrent: composerMentionDialog.isCurrent,
    request: (query) => sendToServiceWorker("SEARCH_MENTION_ACTORS", { query }, { timeoutMs: 30000 }),
    render: renderMentionSearchResults,
  });
}

/**
 * Opens the mention search dialog for a segment in review or repair mode.
 * @param {number} segmentIndex - Target segment index.
 * @param {string} handle - Target mention handle.
 * @param {string} mode - Review or repair mode.
 * @returns {void}
 */
function openMentionSearchDialog(segmentIndex, handle, mode = "repair") { composerMentionDialog.open(segmentIndex, handle, mode); }


/**
 * Finds the nearest known local handle suggestion when the typo distance is small enough.
 * @param {string} handle - Unresolved normalized handle.
 * @returns {string} Suggested known handle or an empty string.
 */
function findComposerMentionSuggestion(handle) {
  return findComposerMentionSuggestionFromData(handle, getKnownComposerMentionHandles(authAccount, savedAccounts));
}

/**
 * Renders resolved mentions through the display controller.
 * @param {number} segmentIndex - Zero-based segment index.
 * @param {HTMLElement|null} container - Mention container.
 * @param {string} text - Current segment text.
 * @param {number} version - Render version guard.
 * @returns {Promise<void>} Completes after rendering.
 */
async function updateSegmentMentionDisplay(segmentIndex, container, text, version) {
  return composerMentionDisplay.render(segmentIndex, container, text, version);
}

/**
 * Schedules the latest mention update for one segment.
 * @param {number} segmentIndex - Zero-based segment index.
 * @param {HTMLElement|null} container - Mention container.
 * @param {string} text - Current segment text.
 * @returns {void}
 */
function scheduleSegmentMentionDisplayUpdate(segmentIndex, container, text) {
  composerMentionDisplay.schedule(segmentIndex, container, text);
}

/**
 * Resizes all currently rendered Composer textareas to their content.
 * @returns {void}
 */
function resizeAllSegmentTextareas() { resizeComposerTextareas(segmentsList); }

/**
 * Delegates coalesced textarea resizing to the Composer scheduler.
 * @returns {void}
 */
function scheduleSegmentTextareaResize() {
  composerRenderScheduler.resize();
}

/** Escapes plain text for controlled HTML exports. @param {unknown} value - Text. @returns {string} Escaped HTML. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens contextual help. @param {string} topicId - Topic identifier. @returns {void} */
function openInlineHelpTopic(topicId) { helpController.openTopic(topicId); }

/**
 * Builds length diagnostics and advice for one segment in Bluesky terms.
 * @param {string} text - Segment text to inspect.
 * @returns {object} Grapheme counts, limit flags, and advisory hints.
 */
function getSegmentLengthDiagnostics(text) {
  return getComposerSegmentLengthDiagnostics(text, {
    getMetrics: getPostTextMetrics,
    graphemeLimit: MAX_POST_LENGTH,
    byteLimit: MAX_POST_UTF8_BYTES,
    hasEmoji: hasEmojiLikeGraphemes,
    hasCjk: hasCjkGraphemes,
  });
}

/**
 * Formats the visible length badge for a segment.
 * @param {object} diagnostics - Result from getSegmentLengthDiagnostics.
 * @returns {string} Human-readable length label.
 */
function formatSegmentLengthLabel(diagnostics) {
  return formatComposerSegmentLengthLabel(diagnostics, {
    translate: t,
    graphemeLimit: MAX_POST_LENGTH,
    byteLimit: MAX_POST_UTF8_BYTES,
  });
}


/**
 * Updates the segment length presentation through its controller.
 * @param {HTMLElement|null} lengthLabel - Segment counter.
 * @param {HTMLElement|null} warningLabel - Segment warning.
 * @param {string} text - Segment text.
 * @returns {object} Segment diagnostics.
 */
function updateSegmentLengthPresentation(lengthLabel, warningLabel, text) {
  return composerLengthPresentation.segment(lengthLabel, warningLabel, text);
}

/**
 * Updates the aggregate thread length warning.
 * @param {string[]} segments - Current thread segments.
 * @returns {void}
 */
function updateComposerLengthWarning(segments) {
  composerLengthPresentation.thread(segments);
}

/**
 * Formats the composer counter using the Bluesky grapheme count.
 * @param {string} text - Current composer text.
 * @returns {string} Localized counter label for the composer header.
 */
function formatComposerCharacterCount(text) { return formatComposerCharacterCountFromModule(text, countGraphemes, t); }

/**
 * Renders segment images through the template-based Composer image module.
 * @param {HTMLElement} container - Segment image container.
 * @param {number} segmentIndex - Segment index.
 * @returns {void}
 */
function renderSegmentImages(container, segmentIndex) {
  let images = [];
  if (Array.isArray(segmentImages[segmentIndex])) {
    images = segmentImages[segmentIndex];
  }
  renderComposerSegmentImages(container, segmentIndex, images, {
    template: document.querySelector("#composer-segment-image-template"),
    autoResize: isImageAutoResizeEnabled(), translate: t,
    getPreviewFrame: getImagePreviewFrameDimensions, getContainedBox: getContainedPreviewBox,
    renderCanvas: renderPreviewCanvas, formatSize: formatImageSize,
    actions: {
      getDragState: () => segmentImageDragState,
      setDragState: (state) => { segmentImageDragState = state; },
      hasFiles: eventHasTransferFiles, getFiles: getDroppedImageFiles,
      selectFiles: handleSegmentImageSelection,
      clearMarkers: clearSegmentImageDropMarkers, clearDragState: clearSegmentImageDragState,
      moveTo: moveSegmentImageToPosition, getDropPosition: getSegmentImageDropPosition,
      editImage: openImageEditorDialog, editAlt: openAltTextDialog,
      move: moveSegmentImage, remove: deleteSegmentImage,
    },
  });
}

/**
 * Rebuilds the Composer sections through the render controller.
 * @param {object} options - Override, scroll and animation settings.
 * @returns {void}
 */
function renderSegments(options = {}) { composerSegmentRenderer.render(options); }

/**
 * Delegates debounced segment rendering to the Composer scheduler.
 * @param {number} delayMs - Render debounce duration.
 * @returns {void}
 */
function scheduleComposerSegmentRender(delayMs = 0) {
  composerRenderScheduler.render(delayMs);
}

/** Restores persisted application domains. @returns {Promise<void>} Hydration completion. */
async function hydrateAppState() { await applicationHydration.hydrate(); }

/**
 * Schedules persistence of the current Composer document.
 * @returns {void}
 */
function queueDraftSave() { composerDocument.scheduleDraft(); }

async function persistLocale(locale) {
  localePreference = locale;
  currentLocale = locale === "auto" ? detectBrowserLocale() : locale;
  languageSelect.value = localePreference;
  applyTranslations();
  await persistSettings();
}


const composerPublishController = createComposerPublishController({
  translate: t, getLimitLabel: getComposerLimitLabel, updateInputWarning: updateComposerInputWarning,
  setStatus, showError: showErrorDialog, showProgress: showProgressDialog,
  validate: () => validateComposerPublishInput({
    sourceText: sourceText.value,
    countGraphemes, composerLimit: MAX_COMPOSER_GRAPHEME_LENGTH,
    getSegments: getSegmentPayloads, getMetrics: getPostTextMetrics,
    postLimit: MAX_POST_LENGTH, byteLimit: MAX_POST_UTF8_BYTES,
    altTextRequired, autoResize: isImageAutoResizeEnabled(), online: navigator.onLine,
  }),
  getConfirmationOptions: () => ({
    translate: t, confirm: openConfirmDialog,
    hasHashtags: () => selectedHashtags.length > 0,
    getReplyTarget: () => composerReplyTarget,
    getReplyTargetName: getReplyTargetDisplayName,
    getAccount: () => authAccount || identifierField.value.trim(),
    getPostTargetName,
  }),
  getWorkflowOptions: (segments) => ({
    setBusy: (busy) => setBusy(publishButton, busy, getPublishBusyLabel(), getPublishButtonLabel()),
    showProgress: (title, message) => showProgressDialog(title, message),
    hideProgress: hideProgressDialog,
    checkConnectivity: () => sendToServiceWorker("CHECK_CONNECTIVITY"),
    progressTitle: t("progressTitle"),
    connectivityMessage: t("progressCheckingConnectivity"),
    preparingMessage: t("progressPreparing"),
    prepareSegments: async () => prepareComposerPublishSegments(segments, {
      normalizeLinkCard,
      prepareImage: (image) => prepareImageForUpload(image, imageAutoResizeMode),
      dataUrlToFile,
      blobLimit: IMAGE_BLOB_LIMIT,
      maxDimension: IMAGE_MAX_DIMENSION,
      linkCardImageConflictMessage: t("linkCardImageConflictPublish"),
      imageTooLargeMessage: t("statusImageTooLarge"),
      onProgress: (progress) => composerPublishController.preparationProgress(progress),
      onTooLarge() {
        renderSegments({ preserveOverrides: true });
      },
    }),
    publish: (preparedSegments) => requestThreadPublish(sendToServiceWorker, buildComposerPublishPayload(preparedSegments, {
      langs: getNormalizedPostLanguagesOrDefault(),
      postInteraction: getCurrentPostInteractionSettings(),
      replyTarget: composerReplyTarget,
    }), {
      onProgress(progress) {
        showProgressDialog(t("progressTitle"), progress.message || t("progressUploading"));
      },
    }),
    onSuccess: composerPublishResults.success,
    onError: composerPublishResults.failure,
  }),
});
publishButton.addEventListener("click", composerPublishController.click);

bindComposerCoreEvents({
  sourceText,
  counterToggle,
  threadIntroToggle,
  threadEmojiToggle,
  markerSpacingToggle,
  replyModeInputs,
  replyAllowFollowersInput,
  replyAllowFollowingInput,
  replyAllowMentionedInput,
  quotePostsToggle,
}, {
  sourceInput: composerInputEvents.input,
  sourceBeforeInput: composerInputEvents.beforeInput,
  sourcePaste: composerInputEvents.paste,
  ...composerPostSettings.handlers,
});

enableAutoAccountPicker(searchActorInput, t("searchActorLabel"));
enableAutoAccountPicker(searchMentionsInput, t("searchMentionsLabel"));
enableAutoAccountPicker(networkAccountInput, t("networkAccountInputLabel"));
enableAutoAccountPicker(threadExplorerAccountInput, t("threadExplorerAccountLabel"));
enableAutoAccountPicker(analysisAccountAInput, t("analysisAccountALabel"));
enableAutoAccountPicker(analysisAccountBInput, t("analysisAccountBLabel"));
enableAutoAccountPicker(archiveMediaActorInput, t("archiveMediaActorLabel"));
enableAutoAccountPicker(archiveSourceInput, t("archiveSourceLabel"), {
  onSelect: applyArchiveSourcePickerSelection,
});
enableAutoAccountPicker(dmContactSearchInput, t("dmContactSearchLabel"), {
  noteKey: "accountPickerDialogDmNote",
  onSelect: applyDmContactPickerSelection,
});

bindComposerCoreEvents({
  serverPresetField,
  clearButton,
}, {
  serverPresetChange: () => {
  customServerWrap.hidden = serverPresetField.value !== "custom";
  if (serverPresetField.value !== "custom") {
    customServerField.value = "";
  }
  },
  clearClick: composerDocument.handlers.clear,
});

bindApplicationEvents(settingsButton, [{ type: "click", handler: () => {
  setUpdateStatus("", false);
  setBackupStatus("");
  setShareStatus("");
  updateLinkCardSettingsStatus({ show: false });
  settingsDialog.showModal();
} }]);

bindApplicationEvents(historyButton, [{ type: "click", handler: () => {
  renderHistoryList();
  historyDialog.showModal();
} }]);

bindOptionalApplicationEvent(publishResultThreadExplorerButton, "click", handlePublishResultThreadExplorerClick);
bindApplicationEvents(composerButton, [{
  type: "click",
  handler: () => showComposerWorkspace({ redirectPage: true }),
}]);
bindApplicationEvents(archiveButton, [{ type: "click", handler: showArchiveWorkspace }]);
bindApplicationEvents(searchButton, [{ type: "click", handler: showSearchWorkspace }]);
bindApplicationEvents(networkButton, [{ type: "click", handler: showNetworkWorkspace }]);

bindThreadExplorerWorkspaceEvents({
  launchButton: threadExplorerButton,
  urlButton: threadExplorerUrlButton,
  searchesButton: threadExplorerSearchesButton,
  refreshButton: threadExplorerRefreshButton,
  sourceSelect: threadExplorerSourceSelect,
  accountInput: threadExplorerAccountInput,
  useOwnAccountButton: threadExplorerUseOwnAccountButton,
  accountModeSelect: threadExplorerAccountModeSelect,
  feedSelect: threadExplorerFeedSelect,
}, {
  launchClick: handleThreadExplorerLaunchClick,
  urlClick: handleThreadExplorerUrlClick,
  searchesClick: handleThreadExplorerSearchesClick,
  refreshClick: handleThreadExplorerRefreshClick,
  sourceChange: handleThreadExplorerSourceSelectChange,
  accountInput: () => {
    threadExplorerAccountError = "";
    renderThreadExplorerAccountNote();
    void persistSettings();
  },
  accountChange: () => {
    applyThreadExplorerAccountInput({ loadFeed: true });
  },
  accountKeydown: (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    applyThreadExplorerAccountInput({ loadFeed: true });
  },
  useOwnAccountClick: handleThreadExplorerUseOwnAccountClick,
  accountModeChange: handleThreadExplorerAccountModeChange,
  feedChange: handleThreadExplorerFeedSelectChange,
});

bindSearchWorkspaceEvents({
  modeSelect: searchModeSelect,
  useOwnAccountButton: searchUseOwnAccountButton,
  urlInput: searchUrlInput,
  queryInput: searchQueryInput,
  excludeTextInput: searchExcludeTextInput,
  actorInput: searchActorInput,
  sortSelect: searchSortSelect,
  mediaSelect: searchMediaSelect,
  postTypeSelect: searchPostTypeSelect,
  mentionsInput: searchMentionsInput,
  domainInput: searchDomainInput,
  targetUrlInput: searchTargetUrlInput,
  sinceInput: searchSinceInput,
  untilInput: searchUntilInput,
  runButton: searchRunButton,
  moreButton: searchMoreButton,
  cancelButton: searchCancelButton,
  saveButton: searchSaveButton,
  savedButton: searchSavedButton,
  hashtagButton: searchHashtagButton,
  tagMatchSelect: searchTagMatchSelect,
  clearButton: searchClearButton,
  copyUrlButton: searchCopyUrlButton,
}, {
  modeChange: () => {
    updateSearchModeUi();
    renderSearchWorkspace();
    scheduleSearchPreferencesPersist();
  },
  useOwnAccountClick: handleSearchUseOwnAccountClick,
  urlInput: () => {
    if (searchUrlStatus) {
      searchUrlStatus.textContent = "";
    }
    scheduleSearchPreferencesPersist();
  },
  urlPaste: scheduleSearchUrlImport,
  urlChange: importSearchUrlFromField,
  summaryInput: () => {
    renderSearchWorkspace();
    scheduleSearchPreferencesPersist();
  },
  sortChange: () => {
    enforceSearchSortConstraints(true);
    renderSearchWorkspace();
    scheduleSearchPreferencesPersist();
  },
  persistInput: () => {
    renderSearchWorkspace();
    scheduleSearchPreferencesPersist();
  },
  runClick: () => {
    void loadSearchResults({ append: false });
  },
  moreClick: () => {
    void loadSearchResults({ append: true });
  },
  cancelClick: () => {
    void cancelActiveSearchRun();
  },
  saveClick: () => {
    void saveCurrentSearchPreferences();
  },
  savedClick: handleSearchSavedClick,
  hashtagClick: openSearchHashtagDialog,
  tagMatchChange: () => {
    renderSearchWorkspace();
    scheduleSearchPreferencesPersist();
  },
  clearClick: () => {
    void clearSearchForm();
  },
  copyUrlClick: () => {
    void copyCurrentSearchAsBskyUrl();
  },
});
bindThreadExplorerApplicationEvents({
  feedList: threadExplorerFeedList,
  actorFeedList: threadExplorerActorFeedList,
  actorFocusCloseButton: threadExplorerActorFocusCloseButton,
  actorModeSelect: threadExplorerActorModeSelect,
  rootButton: threadExplorerRootButton,
  reloadThreadButton: threadExplorerReloadThreadButton,
  snapshotPngButton: threadExplorerSnapshotPngButton,
  saveButton: threadExplorerSaveButton,
  favoritesButton: threadExplorerFavoritesButton,
  zoomOutButton: threadExplorerZoomOutButton,
  zoomResetButton: threadExplorerZoomResetButton,
  zoomInButton: threadExplorerZoomInButton,
  viewModeButton: threadExplorerViewModeButton,
  orientationButton: threadExplorerOrientationButton,
  fullscreenButton: threadExplorerFullscreenButton,
  collapseButton: threadExplorerCollapseButton,
  expandButton: threadExplorerExpandButton,
  threadTree: threadExplorerThreadTree,
}, {
  feedScroll: handleThreadExplorerFeedScroll,
  actorFeedScroll: handleThreadExplorerActorFocusScroll,
  actorFocusClose: closeThreadExplorerActorFocus,
  actorModeChange: handleThreadExplorerActorModeChange,
  rootClick: handleThreadExplorerRootClick,
  reloadThreadClick: handleThreadExplorerReloadThreadClick,
  snapshotPngClick: handleThreadExplorerSnapshotPngClick,
  saveClick: handleThreadExplorerSaveClick,
  favoritesClick: handleThreadExplorerFavoritesClick,
  zoomOutClick: handleThreadExplorerZoomOutClick,
  zoomResetClick: handleThreadExplorerZoomResetClick,
  zoomResetDoubleClick: handleThreadExplorerZoomResetDoubleClick,
  zoomInClick: handleThreadExplorerZoomInClick,
  viewModeClick: handleThreadExplorerViewModeClick,
  orientationClick: handleThreadExplorerOrientationClick,
  fullscreenClick: handleThreadExplorerFullscreenClick,
  collapseClick: handleThreadExplorerCollapseClick,
  expandClick: handleThreadExplorerExpandClick,
  pointerDown: handleThreadExplorerPointerDown,
  pointerMove: handleThreadExplorerPointerMove,
  pointerUp: handleThreadExplorerPointerUp,
  wheel: handleThreadExplorerWheel,
});
bindThreadExplorerSnapshotEvents({
  fullscreenCloseButton: threadExplorerFullscreenCloseButton,
  snapshotProgressDialog: threadExplorerSnapshotProgressDialog,
  snapshotCancelButton: threadExplorerSnapshotCancelButton,
}, {
  fullscreenClose: () => {
    setThreadExplorerFullscreen(false);
  },
  snapshotCancelEvent: (event) => {
    event.preventDefault();
  },
  snapshotCancel: cancelThreadExplorerSnapshotExport,
});
bindThreadExplorerDialogEvents({
  urlCloseTopButton: threadExplorerUrlCloseTopButton,
  urlCloseButton: threadExplorerUrlCloseButton,
  urlLoadButton: threadExplorerUrlLoadButton,
  urlInput: threadExplorerUrlInput,
  favoritesCloseButton: threadExplorerFavoritesCloseButton,
  savedSearchesCloseButton,
  reactionsCloseButton: threadExplorerReactionsCloseButton,
  repliesCloseButton: threadExplorerRepliesCloseButton,
  galleryCloseButton: threadExplorerGalleryCloseButton,
  galleryCloseBottomButton: threadExplorerGalleryCloseBottomButton,
  galleryPrevButton: threadExplorerGalleryPrevButton,
  galleryNextButton: threadExplorerGalleryNextButton,
  galleryOverlayPrevButton: threadExplorerGalleryOverlayPrevButton,
  galleryOverlayNextButton: threadExplorerGalleryOverlayNextButton,
  galleryOverlayCloseButton: threadExplorerGalleryOverlayCloseButton,
  galleryImage: threadExplorerGalleryImage,
  galleryDialog: threadExplorerGalleryDialog,
  galleryFullscreenButton: threadExplorerGalleryFullscreenButton,
}, {
  urlClose: closeThreadExplorerUrlDialog,
  urlLoad: () => { void loadThreadExplorerPostFromUrl(); },
  urlKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void loadThreadExplorerPostFromUrl();
    }
  },
  favoritesClose: () => { threadExplorerFavoritesDialog.close(); },
  savedSearchesClose: () => { savedSearchesDialog.close(); },
  reactionsClose: () => { threadExplorerReactionsDialog.close(); },
  repliesClose: () => { threadExplorerRepliesDialog.close(); },
  galleryClose: () => {
    setThreadExplorerGalleryPseudoFullscreen(false);
    threadExplorerGalleryDialog.close();
  },
  galleryPrevious: () => { stepThreadExplorerGallery(-1); },
  galleryNext: () => { stepThreadExplorerGallery(1); },
  galleryOverlayClose: async () => { await closeThreadExplorerGalleryOverlay(); },
  galleryImageError: handleThreadExplorerGalleryImageError,
  galleryImageClick: async () => {
    try { await openThreadExplorerGalleryFullscreen(); } catch (error) { console.warn("Thread Explorer fullscreen failed.", error); }
  },
  galleryKeydown: handleThreadExplorerGalleryKeydown,
  galleryDialogClose: () => { setThreadExplorerGalleryPseudoFullscreen(false); },
  galleryFullscreen: async () => {
    try { await openThreadExplorerGalleryFullscreen(); } catch (error) { console.warn("Thread Explorer fullscreen failed.", error); }
  },
});
bindSearchDialogEvents({
  hashtagCloseTop: searchHashtagCloseTop,
  hashtagCloseButton: searchHashtagCloseButton,
  savedSearchAddButton,
  savedSearchUrlInput,
}, {
  hashtagClose: closeSearchHashtagDialog,
  savedSearchAdd: handleSavedSearchAddClick,
  savedSearchKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSavedSearchAddClick();
    }
  },
});
bindThreadExplorerGlobalEvents({
  window,
  visualViewport: window.visualViewport,
}, {
  resize: handleThreadExplorerResize,
  keydown: handleGlobalKeydown,
});

bindToolsWorkspaceNavigationEvents({
  analysisButton,
  dmButton,
}, {
  analysisClick: showAnalysisWorkspace,
  dmClick: showDmWorkspace,
});

bindNetworkViewportControls({
  stage: networkStageSvg,
  shapeToggle: networkShapeToggleButton,
  zoomIn: networkZoomInButton,
  zoomOut: networkZoomOutButton,
  zoomReset: networkZoomResetButton,
}, {
  toggleShape: toggleNetworkStageShape,
  zoomAtPoint: zoomNetworkStageAtPoint,
  resetZoom: resetNetworkStageView,
});

bindArchivePreferenceEvents({
  scope: archiveScopeSelect,
  sourceInput: archiveSourceInput,
  contentMode: archiveContentModeSelect,
  conversationContext: archiveConversationContextToggle,
  bandSize: archiveBandSizeSelect,
  imageSize: archiveImageSizeSelect,
  threadImportMode: archiveThreadImportModeSelect,
  metrics: archiveMetricsToggle,
  threads: archiveThreadsToggle,
  pdfIndent: archivePdfIndentToggle,
  livePreview: archiveLivePreviewToggle,
  waveSize: archiveWaveSizeSelect,
  fromInput: archiveFromInput,
  toInput: archiveToInput,
}, {
  scopeChange: () => {
    updateArchiveScopeFields();
    invalidateArchiveCatalog();
    void persistArchivePreferences();
  },
  sourceInput: () => archiveSourceController.input(),
  sourceBlur: () => {
    void validateArchiveSourceInput({ silentSuccess: false }).catch(() => {});
  },
  preferenceChange: () => {
    invalidateArchiveCatalog();
    void persistArchivePreferences();
  },
  summaryPreferenceChange: () => {
    updateArchiveSummary();
    void persistArchivePreferences();
  },
  livePreviewChange: () => {
    renderArchivePreview();
    void persistArchivePreferences();
  },
  fromChange: () => {
  const normalizedRange = enforceArchiveDateRangeLimit("from");
  syncArchiveDateInputBounds();
  if (normalizedRange.changed) {
    showErrorDialog(t("archiveRangeLimitWarning"), t("archiveRangeLimitTitle"));
  }
  archiveScopeSelect.value = "range";
  updateArchiveScopeFields();
  invalidateArchiveCatalog();
  void persistArchivePreferences();
  },
  toChange: () => {
  const normalizedRange = enforceArchiveDateRangeLimit("to");
  syncArchiveDateInputBounds();
  if (normalizedRange.changed) {
    showErrorDialog(t("archiveRangeLimitWarning"), t("archiveRangeLimitTitle"));
  }
  archiveScopeSelect.value = "range";
  updateArchiveScopeFields();
  invalidateArchiveCatalog();
  void persistArchivePreferences();
  },
});

bindDmArchiveEvents({
  contactSearchInput: dmContactSearchInput,
  checkButton: dmCheckButton,
  loadPartnersButton: dmLoadPartnersButton,
  fromInput: dmFromInput,
  toInput: dmToInput,
  loadButton: dmLoadButton,
  exportJsonButton: dmExportJsonButton,
  exportHtmlButton: dmExportHtmlButton,
  exportPdfButton: dmExportPdfButton,
}, {
  contactSearchInput: () => {
    renderDmContacts();
  },
  checkClick: async () => {
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
  },
  loadPartnersClick: async () => {
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
  },
  dateChange: () => {
    renderDmWorkspace();
  },
  loadClick: async () => {
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
  },
  exportJsonClick: async () => {
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
  },
  exportHtmlClick: async () => {
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
  },
  exportPdfClick: async () => {
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
  },
});

bindArchiveActionEvents({
  nextWaveButton: archiveNextWaveButton,
  threadUrlInput: archiveThreadUrlInput,
  loadThreadUrlButton: archiveLoadThreadUrlButton,
  importButton: archiveImportButton,
  resetButton: archiveResetButton,
  pauseButton: archivePauseButton,
  resumeButton: archiveResumeButton,
  cancelButton: archiveCancelButton,
  importInput: archiveImportInput,
  exportZipButton: archiveExportZipButton,
  exportMediaZipButton: archiveExportMediaZipButton,
  exportHtmlButton: archiveExportHtmlButton,
  exportHtmlCompactButton: archiveExportHtmlCompactButton,
  exportPdfButton: archiveExportPdfButton,
  zipScriptCopyButton: archiveZipHtmlScriptCopyButton,
  checkPostEditButton: archiveCheckPostEditButton,
  savedSearchesButton: archiveSavedSearchesButton,
  actionsExportHtmlButton: archiveActionsExportHtmlButton,
  actionsExportHtmlCompactButton: archiveActionsExportHtmlCompactButton,
  progressExportHtmlCompactButton: archiveProgressExportHtmlCompactButton,
  actionsExportPdfButton: archiveActionsExportPdfButton,
  expertModeToggle: archiveExpertModeToggle,
}, {
  nextWaveClick: async () => {
    try {
      setBusy(archiveNextWaveButton, true, t("archiveWorkingButton"), t("archiveNextWaveButton"));
      await ensureArchiveCatalogLoaded(true);
      renderArchiveWorkspace();
    } catch (error) {
      console.error(error);
      showErrorDialog(error.message || t("archiveExportFailed"), t("archiveErrorTitle"));
    } finally {
      setBusy(archiveNextWaveButton, false, t("archiveWorkingButton"), t("archiveNextWaveButton"));
    }
  },
  threadUrlKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      archiveLoadThreadUrlButton?.click();
    }
  },
  loadThreadUrlClick: async () => {
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
  },
  importClick: () => {
    archiveImportInput.click();
  },
  resetClick: async () => {
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
  },
  pauseClick: () => {
    void setArchiveRunControl("pause");
  },
  resumeClick: () => {
    void setArchiveRunControl("resume");
  },
  cancelClick: () => {
    if (activeMediaExportAbortController) {
      activeMediaExportAbortController.abort();
      activeMediaExportState = "cancelled";
      setArchiveProgress({
        title: t("archiveProgressPausedTitle"),
        step: t("archiveMediaCancelled"),
        percent: Number(archiveProgressFill?.style?.width?.replace("%", "")) || 0,
        detail: t("archiveMediaCancelledDetail"),
      });
      updateArchiveRunControls();
      return;
    }
    void setArchiveRunControl("cancel");
  },
  checkPostEditClick: () => {
    openPostEditCheckDialog();
  },
  savedSearchesClick: handleArchiveSavedSearchesClick,
  actionsExportHtmlClick: () => {
    archiveExportHtmlButton?.click();
  },
  actionsExportHtmlCompactClick: () => {
    archiveExportHtmlCompactButton?.click();
  },
  progressExportHtmlCompactClick: () => {
    archiveExportHtmlCompactButton?.click();
  },
  actionsExportPdfClick: () => {
    archiveExportPdfButton?.click();
  },
  expertModeChange: async () => {
    archiveExpertMode = archiveExpertModeToggle.checked === true;
    await persistSettings();
  },
  exportZipClick: () => {
    void runArchiveCatalogExport(archiveExportZipButton, "archiveExportZipButton", "archiveExportFailed", async () => {
      const catalog = await ensureArchiveCatalogLoaded(false);
      await exportArchiveZipFromCatalog(catalog);
    });
  },
  exportHtmlClick: () => {
    void runArchiveCatalogExport(archiveExportHtmlButton, "archiveExportHtmlButton", "archiveHtmlFailed", async () => {
      const catalog = await ensureArchiveCatalogLoaded(false);
      await exportArchiveHtmlFromCatalog(catalog);
    });
  },
  exportHtmlCompactClick: () => {
    void runArchiveCatalogExport(archiveExportHtmlCompactButton, "archiveExportHtmlCompactButton", "archiveHtmlFailed", async () => {
      const catalog = await ensureArchiveCatalogLoaded(false);
      await exportArchiveHtmlFromCatalog(catalog, { mode: "compact" });
    });
  },
  exportPdfClick: () => {
    void runArchiveCatalogExport(archiveExportPdfButton, "archiveExportPdfButton", "archivePdfFailed", async () => {
      const catalog = await ensureArchiveCatalogLoaded(false);
      await exportArchivePdfBandsFromCatalog(catalog);
    });
  },
  exportMediaZipClick: async () => {
    try {
      activeMediaExportAbortController = new AbortController();
      activeMediaExportState = "running";
      setArchiveMediaExportControlsDisabled(true);
      updateArchiveRunControls();
      setBusy(archiveExportMediaZipButton, true, t("archiveWorkingButton"), t("archiveExportMediaZipButton"));
      await exportArchiveMediaZip();
    } catch (error) {
      if (error?.name === "AbortError") {
        setArchiveProgress({
          title: t("archiveProgressPausedTitle"),
          step: t("archiveMediaCancelled"),
          percent: 0,
          detail: t("archiveMediaCancelledDetail"),
        });
        archiveTransientNotice = t("archiveMediaCancelledDetail");
        renderArchiveStatusLine();
        return;
      }
      console.error(error);
      setArchiveProgress({
        title: t("archiveErrorTitle"),
        step: error.message || t("archiveExportFailed"),
        percent: 0,
        detail: "",
      });
      showErrorDialog(error.message || t("archiveExportFailed"), t("archiveErrorTitle"));
    } finally {
      activeMediaExportAbortController = null;
      activeMediaExportState = "idle";
      setArchiveMediaExportControlsDisabled(false);
      updateArchiveRunControls();
      setBusy(archiveExportMediaZipButton, false, t("archiveWorkingButton"), t("archiveExportMediaZipButton"));
    }
  },
  zipScriptCopyClick: async () => {
    try {
      await copyTextToClipboard(getArchiveZipHtmlScriptCommand());
      setStatus(t("archiveZipHtmlScriptCopied"));
    } catch (error) {
      console.error(error);
      setStatus(error.message || t("statusNoSupport"), "error");
    }
  },
  importInputChange: async (event) => {
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
  },
});

/**
 * Runs one catalog export with consistent busy, progress and error handling.
 * @param {HTMLButtonElement|null} button - Export button whose busy state is managed.
 * @param {string} labelKey - Translation key for the button label.
 * @param {string} errorKey - Translation key for the fallback error message.
 * @param {() => Promise<void>} exportAction - Export operation to execute.
 * @returns {Promise<void>} Resolves when the export flow has completed.
 */
async function runArchiveCatalogExport(button, labelKey, errorKey, exportAction) {
  try {
    setBusy(button, true, t("archiveWorkingButton"), t(labelKey));
    await exportAction();
  } catch (error) {
    console.error(error);
    setArchiveProgress({
      title: t("archiveErrorTitle"),
      step: error.message || t(errorKey),
      percent: 0,
      detail: "",
    });
    showErrorDialog(error.message || t(errorKey), t("archiveErrorTitle"));
  } finally {
    setBusy(button, false, t("archiveWorkingButton"), t(labelKey));
  }
}

/** Resolves and commits a reply target. @param {string} url - Post URL. @param {string} mode - Target mode. @returns {Promise<object|null>} */
async function resolveComposerReplyTarget(url, mode = "post") {
  return await composerReplyController.resolve(url, mode);
}

bindPostEditCheckDialogEvents({
  urlInput: postEditCheckUrlInput,
  submitButton: postEditCheckSubmitButton,
  closeTopButton: postEditCheckCloseTop,
  closeButton: postEditCheckCloseButton,
  dialog: postEditCheckDialog,
}, {
  urlKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      postEditCheckSubmitButton?.click();
    }
  },
  submitClick: async () => {
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
  },
  close: closePostEditCheckDialog,
  cancel: (event) => {
    event.preventDefault();
    closePostEditCheckDialog();
  },
});

bindComposerDialogEvents({
  unlockButton: composerUnlockButton,
  postedDismissButton: composerPostedDismissButton,
  postSettingsButton,
  searchLanguageButton,
  replyTargetButton,
  replyTargetClearButton,
  replyTargetCloseTop,
  replyTargetCloseButton,
  replyTargetSubmitButton,
  replyTargetUrlInput,
  replyTargetDialog,
  postLanguagesSearch,
  postLanguagesDisclosure,
  postLanguagesCloseTop,
  postLanguagesCloseButton,
  postLanguagesDialog,
  helpButton,
}, {
  unlock: composerUiState.unlock,
  postedDismiss: composerUiState.dismissPosted,
  postSettings: () => composerPostSettings.open("composer"),
  searchLanguage: () => composerPostSettings.open("search"),
  replyTargetOpen: () => {
    openReplyTargetDialog(replyTargetUrlInput?.value || composerReplyTarget?.sourceUrl || "");
  },
  replyTargetClear: () => {
    clearComposerReplyTarget();
    queueDraftSave();
    setStatus(t("replyTargetCleared"));
  },
  replyTargetClose: () => {
    closeReplyTargetDialog();
  },
  replyTargetSubmit: () => {
    void submitReplyTargetDialog();
  },
  replyTargetKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitReplyTargetDialog();
    }
  },
  replyTargetCancel: (event) => {
    event.preventDefault();
    closeReplyTargetDialog();
  },
  languagesSearch: composerPostSettings.renderDialog,
  languagesToggle: composerPostSettings.focusSearch,
  languagesClose: composerPostSettings.close,
  languagesDialogClose: composerPostSettings.resetDialog,
  help: () => { helpController.openReadme(); },
});

bindWorkspaceUtilityEvents({ installButton, loadThreadButton, saveThreadButton }, {
  installClick: async () => { await applicationInstall.install(); },
  loadThreadClick: composerDocument.handlers.loadClick,
  saveThreadClick: composerDocument.handlers.saveClick,
});

bindPreferenceEvents({
  languageSelect,
  tipsVisibleToggle,
  altTextRequiredToggle,
  imageAutoResizeSelect,
  themeToggleButton,
  compactModeToggleButtons,
  resetColumnWidthsButton,
  nextTipButton,
  hideTipsButton,
}, {
  languageChange: async () => {
  await persistLocale(languageSelect.value);
  },
  tipsVisibleChange: async () => {
  tipsVisible = tipsVisibleToggle.checked;
  updateTipsVisibility();
  await persistSettings();
  },
  altTextRequiredChange: async () => {
  altTextRequired = altTextRequiredToggle.checked;
  renderSegments({ preserveOverrides: true });
  await persistSettings();
  },
  imageAutoResizeChange: async () => {
  imageAutoResizeMode = normalizeImageAutoResizeMode(imageAutoResizeSelect.value);
  preserveScrollPosition(() => {
    renderSegments({ preserveOverrides: true });
  });
  updatePublishAvailability();
  await persistSettings();
  },
  themeClick: async () => {
  if (themeMode === "dark") {
    themeMode = "light";
  } else {
    themeMode = "dark";
  }
  applyTheme();
  await persistSettings();
  },
  compactModeClick: async () => {
    if (compactMode === true) {
      compactMode = false;
    } else {
      compactMode = true;
    }
    applyCompactMode();
    await persistSettings();
  },
  resetColumnWidthsClick: () => {
    void resetDesktopColumnWidths();
  },
  nextTipClick: nextTip,
  hideTipsClick: async () => {
  tipsVisible = false;
  updateTipsVisibility();
  await persistSettings();
  },
});

bindComposerHashtagEvents({ form: hashtagForm, placementSelect: hashtagPlacementSelect }, hashtagController.handlers);

bindSettingsDataEvents({
  exportButton: exportSettingsButton,
  backupSaveButton: backupReminderSaveButton,
  backupLaterButton: backupReminderLaterButton,
  backupCloseButton: backupReminderCloseTop,
  shareButton: shareAppButton,
  importButton: importSettingsButton,
  clearHistoryButton,
  importInput: importSettingsInput,
  threadImportInput,
}, {
  exportClick: async () => {
  try {
    await exportSettingsBackup();
  } catch (error) {
    console.error(error);
    setBackupStatus(t("backupExportFailed"), "error");
  }
  },
  backupSaveClick: async () => {
    await handleBackupReminderSaveClick();
  },
  backupLaterClick: () => {
    closeSettingsBackupReminder(true);
  },
  backupCloseClick: () => {
    closeSettingsBackupReminder(true);
  },
  shareClick: async () => {
    await shareAppRecommendation();
  },
  importClick: () => {
  importSettingsInput.click();
  },
  clearHistoryClick: async () => {
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
  },
  importChange: async (event) => {
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
  },
  threadImportChange: composerDocument.handlers.importChange,
});

bindEditorDialogEvents({
  hashtagSaveButton: hashtagEditSaveButton,
  hashtagCancelButton: hashtagEditCancelButton,
  hashtagCancelTop: hashtagEditCancelTop,
  hashtagInput: hashtagEditInput,
  hashtagDialog: hashtagEditDialog,
  altTextInput,
  altTextSaveButton,
  altTextCancelButton,
  altTextCloseTop,
  altTextDialog,
}, {
  hashtagSaveClick: hashtagController.saveEdit,
  hashtagCancelClick: hashtagController.closeEdit,
  hashtagKeydown: hashtagController.handlers.editKeydown,
  hashtagDialogClose: hashtagController.handlers.editClosed,
  altTextInput: setAltTextCount,
  altTextSaveClick: async () => {
  await saveAltText();
  },
  altTextCancelClick: () => {
  closeAltTextDialog();
  },
  altTextCancelEvent: (event) => {
  event.preventDefault();
  closeAltTextDialog();
  },
});

bindComposerImageEditorEvents({
  zoomInput: imageZoomInput,
  flipHorizontalButton: imageFlipHorizontalButton,
  flipVerticalButton: imageFlipVerticalButton,
  rotateLeftButton: imageRotateLeftButton,
  resetButton: imageResetButton,
  saveButton: imageEditorSaveButton,
  fitDimensionsButton: imageFitDimensionsButton,
  lossyResizeButton: imageLossyResizeButton,
  cancelButton: imageEditorCancelButton,
  closeTopButton: imageEditorCloseTop,
  dialog: imageEditorDialog,
  canvas: imageEditorCanvas,
}, composerImageEditor.handlers);
bindConfirmationDialogEvents({ errorDialog, confirmButton: confirmDialogConfirmButton, cancelButton: confirmDialogCancelButton, confirmDialog }, {
  errorCancel: (event) => { event.preventDefault(); errorDialog.close(); },
  confirmClick: () => { confirmDialogController.confirm(); },
  cancelClick: () => { confirmDialogController.cancel(); },
  dialogCancel: (event) => { event.preventDefault(); confirmDialogController.dismiss(); },
  dialogClose: () => { confirmDialogController.handleNativeClose(); },
});

bindLinkCardSettingsEvents({
  endpointInput: linkCardEndpointInput,
  secretInput: linkCardSecretInput,
  noneInput: linkCardProviderNoneInput,
  microlinkInput: linkCardProviderMicrolinkInput,
  proxyInput: linkCardProviderProxyInput,
}, {
  input: () => {
    updateLinkCardSettingsStatus();
    renderSegments({ preserveOverrides: true, preserveView: true });
  },
  change: async () => {
    normalizeLinkCardSettingsInputs();
    updateLinkCardSettingsStatus();
    await persistSettings();
    renderSegments({ preserveOverrides: true, preserveView: true });
  },
  providerChange: async () => {
    if (linkCardProviderNoneInput?.checked) {
      linkCardProvider = LINK_CARD_PROVIDER_NONE;
    } else if (linkCardProviderProxyInput?.checked) {
      linkCardProvider = LINK_CARD_PROVIDER_PROXY;
    } else {
      linkCardProvider = LINK_CARD_PROVIDER_MICROLINK;
    }
    syncLinkCardProviderUi();
    await persistSettings();
    renderSegments({ preserveOverrides: true, preserveView: true });
  },
});

bindHelpAndSettingsEvents({
  settingsCloseTop,
  helpTarget: document,
}, {
  settingsClose: closeSettingsDialog,
  helpClick: (event) => {
    helpController.topicClick(event);
  },
});

bindComposerContentDialogEvents({
  linkCardCreateButton,
  linkCardCancelButton,
  linkCardCloseTop,
  linkCardUrlInput,
  mentionSearchCloseTop,
  mentionSearchCloseButton,
  mentionSearchInput,
  mentionSearchDialog,
}, {
  linkCardCreate: () => {
    void createLinkCardForPendingSegment();
  },
  linkCardClose: closeLinkCardDialog,
  linkCardInput: () => {
    linkCardStatus.textContent = "";
    delete linkCardStatus.dataset.tone;
  },
  linkCardKeydown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void createLinkCardForPendingSegment();
    }
  },
  mentionClose: closeMentionSearchDialog,
  mentionInput: composerMentionDialog.input,
  mentionKeydown: composerMentionDialog.keydown,
  mentionCancel: (event) => {
    event.preventDefault();
    closeMentionSearchDialog();
  },
  mentionDialogClose: resetMentionSearchDialogState,
});

bindApplicationUpdateEvents({ checkUpdatesButton, reloadAppButton }, {
  checkUpdatesClick: async () => {
  await checkForUpdates();
  },
  reloadClick: async () => {
  await performAppReload();
  },
});


bindApplicationNavigationEvents({ pageSwitchLinks, privacyPageLinks }, {
  pageSwitchClick: (event) => {
    const link = event.currentTarget;
    persistAppearancePreferences();
    persistPendingPageSwitchUrl(link.href);
  },
  privacyClick: (event) => {
    const link = event.currentTarget;
    event.preventDefault();
    privacyPageNavigationInProgress = true;
    clearPendingPageSwitchUrl();
    window.location.assign(link.href);
  },
});

/**
 * Applies normalized startup patches to the shared application state.
 * @param {object} patch - Fields emitted by the hydration controller.
 * @returns {void}
 */
function applyHydratedApplicationState(patch) {
  if ("localePreference" in patch) { localePreference = patch.localePreference; }
  if ("tipsVisible" in patch) { tipsVisible = patch.tipsVisible; }
  if ("altTextRequired" in patch) { altTextRequired = patch.altTextRequired; }
  if ("imageAutoResizeMode" in patch) { imageAutoResizeMode = patch.imageAutoResizeMode; }
  if ("archiveExpertMode" in patch) { archiveExpertMode = patch.archiveExpertMode; }
  if ("themeMode" in patch) { themeMode = patch.themeMode; }
  if ("compactMode" in patch) { compactMode = patch.compactMode; }
  if ("sidebarCollapsedDesktop" in patch) { sidebarCollapsedDesktop = patch.sidebarCollapsedDesktop; }
  if ("sidebarWidthDesktop" in patch) { sidebarWidthDesktop = patch.sidebarWidthDesktop; }
  if ("composerWidthDesktop" in patch) { composerWidthDesktop = patch.composerWidthDesktop; }
  if ("hashtags" in patch) { hashtags = patch.hashtags; }
  if ("selectedHashtags" in patch) { selectedHashtags = patch.selectedHashtags; }
  if ("searchSelectedHashtags" in patch) { searchSelectedHashtags = patch.searchSelectedHashtags; }
  if ("hashtagPlacement" in patch) { hashtagPlacement = patch.hashtagPlacement; }
  if ("segmentImages" in patch) { segmentImages = patch.segmentImages; }
  if ("segmentLinkCards" in patch) { segmentLinkCards = patch.segmentLinkCards; }
  if ("segmentOverrides" in patch) { segmentOverrides = patch.segmentOverrides; }
  if ("composerReplyTarget" in patch) { composerReplyTarget = patch.composerReplyTarget; }
  if ("selectedPostLanguages" in patch) { selectedPostLanguages = patch.selectedPostLanguages; }
  if ("appendThreadIntro" in patch) { appendThreadIntro = patch.appendThreadIntro; }
  if ("appendThreadEmoji" in patch) { appendThreadEmoji = patch.appendThreadEmoji; }
  if ("addMarkerSpacing" in patch) { addMarkerSpacing = patch.addMarkerSpacing; }
  if ("linkCardProvider" in patch) { linkCardProvider = patch.linkCardProvider; }
  if ("linkCardMicrolinkUsage" in patch) { linkCardMicrolinkUsage = patch.linkCardMicrolinkUsage; }
  if ("postingHistory" in patch) { postingHistory = patch.postingHistory; }
  if ("threadExplorerFavorites" in patch) { threadExplorerFavorites = patch.threadExplorerFavorites; }
  if ("savedSearches" in patch) { savedSearches = patch.savedSearches; }
  if ("archiveSession" in patch) { archiveSession = patch.archiveSession; }
  if ("archiveCatalog" in patch) { archiveCatalog = patch.archiveCatalog; }
  if ("currentLocale" in patch) { currentLocale = patch.currentLocale; }
  if ("savedAccounts" in patch) { savedAccounts = patch.savedAccounts; }
  if ("authAccount" in patch) { authAccount = patch.authAccount; }
  if ("authAccountDid" in patch) { authAccountDid = patch.authAccountDid; }
  if ("authAccountService" in patch) { authAccountService = patch.authAccountService; }
  if ("authAccountWebApp" in patch) { authAccountWebApp = patch.authAccountWebApp; }
}
const archivePreferencesController = createArchivePreferencesController({
  from: archiveFromInput, to: archiveToInput, source: archiveSourceInput, content: archiveContentModeSelect,
  context: archiveConversationContextToggle, band: archiveBandSizeSelect, image: archiveImageSizeSelect,
  metrics: archiveMetricsToggle, threads: archiveThreadsToggle, indent: archivePdfIndentToggle, wave: archiveWaveSizeSelect,
  preview: archiveLivePreviewToggle, importMode: archiveThreadImportModeSelect, scope: archiveScopeSelect,
  year: archiveYearInput, hashtagScope: archiveHashtagScopeSelect,
}, {
  state: {
    /** Reads current sourceProfile. @returns {*} Live value. */
    get sourceProfile() { return archiveSourceProfile; },
    /** Updates current sourceProfile. @param {*} value - New value. */
    set sourceProfile(value) { archiveSourceProfile = value; },
    /** Reads current selectedHashtags. @returns {*} Live value. */
    get selectedHashtags() { return archiveSelectedHashtags; },
    /** Updates current selectedHashtags. @param {*} value - New value. */
    set selectedHashtags(value) { archiveSelectedHashtags = value; },
    /** Reads current hashtagScope. @returns {*} Live value. */
    get hashtagScope() { return archiveHashtagScope; },
    /** Updates current hashtagScope. @param {*} value - New value. */
    set hashtagScope(value) { archiveHashtagScope = value; },
    /** Reads current savedSearchId. @returns {*} Live value. */
    get savedSearchId() { return archiveSavedSearchId; },
    /** Updates current savedSearchId. @param {*} value - New value. */
    set savedSearchId(value) { archiveSavedSearchId = value; },
    /** Reads current hashtags. @returns {*} Live value. */
    get hashtags() { return hashtags; },
    /** Updates current hashtags. @param {*} value - New value. */
    set hashtags(value) { hashtags = value; },
  }, now: () => new Date(), maxMonths: ARCHIVE_RANGE_MAX_MONTHS, normalizeTags: normalizeSelectedHashtagEntries,
  scopeFields: updateArchiveScopeFields, renderSource: renderArchiveSourceState, renderSavedSearch: renderArchiveSavedSearchNote, renderTags: renderHashtagCloud,
});
const analysisCorpusAnalyzer = createAnalysisCorpusAnalyzer({
  locale: () => currentLocale, functionWords: ANALYSIS_FUNCTION_WORDS, numberWords: ANALYSIS_NUMBER_WORDS,
});
const analysisTemporalAnalyzer = createAnalysisTemporalAnalyzer({
  locale: () => currentLocale, now: () => Date.now(), shares: shareArray, gapBuckets: ANALYSIS_TEMPORAL_GAP_BUCKETS,
  weekdayAnchors: ANALYSIS_WEEKDAY_ANCHORS, weekdayFallbacks: ANALYSIS_WEEKDAY_FALLBACKS,
});
const analysisStylometryAnalyzer = createAnalysisStylometryAnalyzer({ locale: () => currentLocale, corpus: analysisCorpusAnalyzer.create });
const analysisTableModels = createAnalysisTableModels({ t, number: formatAnalysisNumber, percent: formatAnalysisPercent,
  count: formatCount, similarity: cosineSimilarityFromArrays });
const analysisRenderer = createAnalysisRenderer({
  summary: analysisSummary, result: analysisResultCard, temporal: analysisTemporal, metrics: analysisMetrics,
  network: analysisNetwork, patterns: analysisPatterns,
  templates: Object.fromEntries(["note", "span", "tokens", "token", "stats", "stat", "bars", "bar", "pattern", "account", "result",
    "heatmap", "heatmap-grid", "axis", "heatmap-cell", "timeline", "timeline-tick", "timeline-row", "timeline-point",
    "profiles", "profile", "table", "table-head", "table-row", "temporal-comparison", "network-summary"]
    .map((name) => [name, document.querySelector(`#analysis-${name}-template`)])),
}, { cloneTemplate: cloneTemplateContent, setAvatar: setAvatarImage, t, count: formatCount,
  timestamp: formatHistoryTimestamp, number: formatAnalysisNumber, percent: formatAnalysisPercent,
  weekday: analysisTemporalAnalyzer.weekdayLabel, hour: analysisTemporalAnalyzer.hourLabel, overlapHeatmap: analysisTemporalAnalyzer.overlapHeatmap,
  networkPatterns: ANALYSIS_NETWORK_PATTERNS, corpusPatterns: ANALYSIS_CORPUS_PATTERNS });
const analysisAccountNormalizer = createAnalysisAccountNormalizer({ corpus: analysisCorpusAnalyzer.create, temporal: analysisTemporalAnalyzer.profile });
const analysisAccountComparator = createAnalysisAccountComparator({
  metrics: ANALYSIS_METRIC_DEFINITIONS, mapSimilarity: cosineSimilarityFromMaps, arraySimilarity: cosineSimilarityFromArrays,
  jaccard: jaccardSimilarityFromSets, overlap: overlapSummaryFromSets, frequencies: frequencyMapFromEntries,
  stylometry: analysisStylometryAnalyzer.compare, proximity: analysisTemporalAnalyzer.proximity,
});
const analysisController = createAnalysisController({
  inputA: analysisAccountAInput, inputB: analysisAccountBInput, range: analysisRangeSelect, limit: analysisPostLimitSelect,
  replies: analysisIncludeRepliesToggle, quotes: analysisIncludeQuotesToggle, status: analysisStatusLineNode,
  noteA: analysisAccountANote, noteB: analysisAccountBNote, loadA: analysisAccountALoadButton, loadB: analysisAccountBLoadButton,
  ownA: analysisAccountAOwnButton, ownB: analysisAccountBOwnButton, compare: analysisCompareButton,
  reset: analysisResetButton, exportPdf: analysisExportPdfButton,
}, {
  state: {
    /** Reads current accounts. @returns {*} Live value. */
    get accounts() { return savedAccounts; },
    /** Applies current accounts. @param {*} value - New value. */
    set accounts(value) { savedAccounts = value; },
    /** Reads current authDid. @returns {*} Live value. */
    get authDid() { return authAccountDid; },
    /** Applies current authDid. @param {*} value - New value. */
    set authDid(value) { authAccountDid = value; },
    /** Reads current auth. @returns {*} Live value. */
    get auth() { return authAccount; },
    /** Applies current auth. @param {*} value - New value. */
    set auth(value) { authAccount = value; },
    /** Reads current loading. @returns {*} Live value. */
    get loading() { return analysisLoading; },
    /** Applies current loading. @param {*} value - New value. */
    set loading(value) { analysisLoading = value; },
    /** Reads current status. @returns {*} Live value. */
    get status() { return analysisStatusLine; },
    /** Applies current status. @param {*} value - New value. */
    set status(value) { analysisStatusLine = value; },
    /** Reads current accountA. @returns {*} Live value. */
    get accountA() { return analysisAccountDataA; },
    /** Applies current accountA. @param {*} value - New value. */
    set accountA(value) { analysisAccountDataA = value; },
    /** Reads current accountB. @returns {*} Live value. */
    get accountB() { return analysisAccountDataB; },
    /** Applies current accountB. @param {*} value - New value. */
    set accountB(value) { analysisAccountDataB = value; },
    /** Reads current comparison. @returns {*} Live value. */
    get comparison() { return analysisComparisonResult; },
    /** Applies current comparison. @param {*} value - New value. */
    set comparison(value) { analysisComparisonResult = value; },
    /** Reads current requestToken. @returns {*} Live value. */
    get requestToken() { return analysisRequestToken; },
    /** Applies current requestToken. @param {*} value - New value. */
    set requestToken(value) { analysisRequestToken = value; },
    /** Reads current validationTokens. @returns {*} Live value. */
    get validationTokens() { return analysisValidationTokens; },
    /** Applies current validationTokens. @param {*} value - New value. */
    set validationTokens(value) { analysisValidationTokens = value; },
  }, t, locale: () => currentLocale, actor: normalizeAnalysisActor, serialize: getPersistableAnalysisAccount,
  normalize: analysisAccountNormalizer.normalize, needsRefresh: analysisAccountNeedsNetworkRefresh, compare: analysisAccountComparator.compare,
  request: sendToServiceWorker, persist: persistSettings, render: renderAnalysisWorkspace, error: showErrorDialog,
  note: setAccountFieldNote, report: (error) => console.error(error), busy: setBusy, exportReport: exportAnalysisPdfReport,
  renderResult: () => analysisRenderer.result(analysisComparisonResult),
});
const analysisReportModels = createAnalysisReportModels({
  t, number: formatAnalysisNumber, percent: formatAnalysisPercent, now: () => new Date(),
  metricRows: buildAnalysisMetricTableModel, deltaLabel: ANALYSIS_DELTA_REPORT_LABEL, corpusPatterns: ANALYSIS_CORPUS_PATTERNS, networkPatterns: ANALYSIS_NETWORK_PATTERNS,
});
const analysisReportLayout = createAnalysisReportLayout({ canvas: () => document.createElement("canvas"), wrap: buildWrappedPdfLines });
const analysisPdfRenderer = createAnalysisPdfRenderer({
  state: {
    /** Reads the current first account. @returns {object|null} Account A. */
    get accountA() { return analysisAccountDataA; },
    /** Reads the current second account. @returns {object|null} Account B. */
    get accountB() { return analysisAccountDataB; },
    /** Reads the current comparison. @returns {object|null} Comparison. */
    get comparison() { return analysisComparisonResult; },
  }, t, models: analysisReportModels, layout: analysisReportLayout, tables: analysisTableModels,
  canvas: () => document.createElement("canvas"), now: () => new Date(),
  fetch: (...args) => fetch(...args), bitmap: (blob) => createImageBitmap(blob),
  fill: fillRoundedRect, stroke: strokeRoundedRect, wrap: buildWrappedPdfLines, text: drawArchivePdfTextBlock, circle: drawCircularImageCover,
  date: formatCompactArchiveTimestamp, count: formatCount, timestamp: formatHistoryTimestamp, percent: formatAnalysisPercent,
  weekday: analysisTemporalAnalyzer.weekdayLabel, overlap: analysisTemporalAnalyzer.overlapHeatmap, temporalSummary: analysisRenderer.temporalSummary,
  pdf: buildPdfFile, file: (blob, name) => new File([blob], name, { type: "application/pdf" }),
  deliver: shareOrDownloadFile, status: setAnalysisStatus,
});
const analysisWorkspaceController = createAnalysisWorkspaceController({
  inputA: analysisAccountAInput, inputB: analysisAccountBInput, launch: analysisButton, exportPdf: analysisExportPdfButton,
}, {
  getState: () => ({ auth: authAccount, accountA: analysisAccountDataA, accountB: analysisAccountDataB, comparison: analysisComparisonResult, status: analysisStatusLine }),
  renderer: analysisRenderer, controller: analysisController, tables: analysisTableModels, t,
  navigate: () => navigateToThreadlinePage(THREADLINE_PAGE_TOOLS),
  setWorkspace: (workspace) => { currentWorkspace = workspace; }, fullscreen: applyThreadExplorerFullscreenState,
  persistWorkspace: persistWorkspacePreference, visible: setVisibleWorkspace, context: applyHashtagPaneContext, authButtons: updateAuthButtons,
});
bindAnalysisWorkspaceEvents({
  accountAOwnButton: analysisAccountAOwnButton, accountBOwnButton: analysisAccountBOwnButton,
  accountALoadButton: analysisAccountALoadButton, accountBLoadButton: analysisAccountBLoadButton,
  compareButton: analysisCompareButton, resetButton: analysisResetButton, exportPdfButton: analysisExportPdfButton,
  accountInputs: [analysisAccountAInput, analysisAccountBInput],
  optionControls: [analysisRangeSelect, analysisPostLimitSelect, analysisIncludeRepliesToggle, analysisIncludeQuotesToggle],
}, analysisController.handlers);
const helpController = createHelpController({
  dialog: helpDialog, eyebrow: helpDialogEyebrow, title: helpDialogTitle, status: helpStatus,
  content: helpContent, template: document.querySelector("#help-topic-template"),
}, {
  locale: () => currentLocale, t, catalog: HELP_TOPICS,
  markdown: createHelpMarkdownRenderer({ href: () => window.location.href, escapeHtml }),
  fetch: (url, options) => window.fetch(url, options), report: (error) => console.error(error),
});
const applicationUpdates = createApplicationUpdateController({
  status: updateStatus, reload: reloadAppButton, check: checkUpdatesButton, version: versionLabel,
}, {
  version: CURRENT_VERSION_INFO, fetchVersion: fetchVersionInfo, registration: () => serviceWorkerRegistration,
  t, report: (error) => console.error(error), intervalMs: AUTO_UPDATE_CHECK_INTERVAL_MS,
  now: () => Date.now(), href: () => window.location.href, navigate: (url) => window.location.replace(url),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
});
/** Applies an authentication result to application state. @param {object} identity - Account, DID, service and web app. @returns {void} */
function applyAuthenticationIdentity(identity) {
  authAccount = identity.account;
  authAccountDid = identity.did;
  authAccountService = identity.service;
  authAccountWebApp = identity.webApp;
}
const loginController = createLoginController({
  preset: serverPresetField, custom: customServerField, customWrap: customServerWrap,
  note: loginDialogNote, identifier: identifierField, password: passwordField, dialog: loginDialog,
}, {
  presets: LOGIN_SERVICE_PRESETS, getState: () => ({ service: authAccountService }),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay), request: sendToServiceWorker, t,
  setBusy: (busy) => setBusy(loginButton, busy, t("loginBusy"), t("loginButton")),
  setIdentity: applyAuthenticationIdentity, setAccounts: (accounts) => { savedAccounts = accounts; },
  restoreAvatars: restoreAccountAvatarCache, resolveWebApp: resolvePostWebBase, updateStatus: updateStatusForAuth,
  report: (error) => console.error(error), setStatus, setOnline: (online) => { appOnline = online; },
  renderAccounts: renderAccountSwitcher,
});
const savedAccountActions = createSavedAccountActions({
  defaultService: LOGIN_SERVICE_PRESETS["bsky.social"], setIdentity: applyAuthenticationIdentity,
  setAccounts: (accounts) => { savedAccounts = accounts; },
  switchAccount: (did) => requestAccountSwitch(sendToServiceWorker, did),
  logout: (did) => requestAccountLogout(sendToServiceWorker, did),
  remove: (did) => requestAccountRemoval(sendToServiceWorker, did),
  restoreAvatars: restoreAccountAvatarCache, renderAccounts: renderAccountSwitcher, resolveWebApp: resolvePostWebBase,
  setLoginFields: (identifier, clearPassword) => {
    identifierField.value = identifier;
    applyLoginServiceSelection(authAccountService);
    if (clearPassword) { passwordField.value = ""; }
  },
  updateStatus: updateStatusForAuth, setStatus, openLogin: openLoginDialog, verify: verifySession,
  confirm: openConfirmDialog, t, report: (error) => console.error(error),
});
const networkLayoutController = createNetworkLayoutController({
  getState: () => ({ shape: networkStageShape, slots: networkStageSlots, counts: networkStageRelationCounts }),
  relation: getNetworkRelationType, clamp,
});
const networkDataController = createNetworkDataController({
  getState: () => ({ authAccount, authDid: authAccountDid, loading: networkLoading, viewer: networkViewerProfile,
    accountDid: networkAccountDid, nodes: networkNodes, followerCursor: networkFollowerCursor,
    followCursor: networkFollowCursor, waveIndex: networkWaveIndex }),
  setState: (patch) => {
    if ("accountDid" in patch) { networkAccountDid = patch.accountDid; }
    if ("viewer" in patch) { networkViewerProfile = patch.viewer; }
    if ("loading" in patch) { networkLoading = patch.loading; }
    if ("filterMode" in patch) { networkFilterMode = patch.filterMode; }
    if ("query" in patch) { networkSearchQuery = patch.query; }
    if ("statusLine" in patch) { networkStatusLine = patch.statusLine; }
    if ("followerCursor" in patch) { networkFollowerCursor = patch.followerCursor; }
    if ("followCursor" in patch) { networkFollowCursor = patch.followCursor; }
    if ("hasMoreFollowers" in patch) { networkHasMoreFollowers = patch.hasMoreFollowers; }
    if ("hasMoreFollows" in patch) { networkHasMoreFollows = patch.hasMoreFollows; }
    if ("waveIndex" in patch) { networkWaveIndex = patch.waveIndex; }
  },
  requestedActor: getRequestedNetworkActor, ensureAccount: ensureNetworkStateForAccount, reset: resetNetworkState,
  clearQuery: () => { if (networkSearchInput) { networkSearchInput.value = ""; } },
  setActorInput: (actor) => { if (networkAccountInput) { networkAccountInput.value = actor; } },
  note: setNetworkAccountFieldNote, updateControls: updateNetworkControls,
  busy: (busy) => setBusy(networkLoadButton, busy, t("networkLoadingButton"), t("networkLoadButton")),
  request: sendToServiceWorker, status: setNetworkStatus, ingest: ingestNetworkProfiles, t, formatCount,
  report: (error) => console.error(error), showError: showErrorDialog, render: renderNetworkWorkspace,
});
const networkFocusController = createNetworkFocusController({
  getState: () => ({ viewer: networkViewerProfile, nodes: networkNodes, details: networkFocusDetails,
    selectedDid: networkSelectedDid, loadingDid: networkFocusLoadingDid, accountDid: networkAccountDid, authDid: authAccountDid,
    commonTargetDid: networkCommonMutualsTargetDid, commonDids: networkCommonMutualsDids,
    commonLoadingDid: networkCommonMutualsLoadingDid, filterMode: networkFilterMode }),
  setState: (patch) => {
    if ("selectedDid" in patch) { networkSelectedDid = patch.selectedDid; }
    if ("loadingDid" in patch) { networkFocusLoadingDid = patch.loadingDid; }
    if ("previewTab" in patch) { networkFocusPreviewTab = patch.previewTab; }
    if ("collapsed" in patch) { networkFocusCollapsed = patch.collapsed; }
    if ("commonTargetDid" in patch) { networkCommonMutualsTargetDid = patch.commonTargetDid; }
    if ("commonDids" in patch) { networkCommonMutualsDids = patch.commonDids; }
    if ("commonLoadingDid" in patch) { networkCommonMutualsLoadingDid = patch.commonLoadingDid; }
    if ("commonHasMore" in patch) { networkCommonMutualsHasMore = patch.commonHasMore; }
    if ("filterMode" in patch) { networkFilterMode = patch.filterMode; }
    if ("query" in patch) { networkSearchQuery = patch.query; }
    if ("fitAll" in patch) { networkStageFitAll = patch.fitAll; }
    if ("zoom" in patch) { networkStageZoom = patch.zoom; }
    if ("panX" in patch) { networkStagePanX = patch.panX; }
    if ("panY" in patch) { networkStagePanY = patch.panY; }
  },
  request: sendToServiceWorker, render: renderNetworkWorkspace, setStatus: setNetworkStatus,
  label: getProfileLabel, t, formatCount, report: (error) => console.error(error),
  clearQuery: () => { if (networkSearchInput) { networkSearchInput.value = ""; } },
});
const networkStageController = createNetworkStageController({
  stage: networkStageSvg, body: document.body, document,
  fullscreenTarget: networkGrid || networkWorkspace || networkStageCard, results: networkResults,
}, {
  getState: () => ({ workspace: currentWorkspace, fitAll: networkStageFitAll, zoom: networkStageZoom,
    panX: networkStagePanX, panY: networkStagePanY, drag: networkStageDrag, shape: networkStageShape,
    mode: networkStageMode, focusVisible: networkStageModeFocusVisible, listsVisible: networkStageModeListsVisible,
    selectedDid: networkSelectedDid, collapsed: networkFocusCollapsed,
    scrollTop: networkResultsScrollTop, restorePending: networkResultsRestorePending }),
  setState: (patch) => {
    if ("fitAll" in patch) { networkStageFitAll = patch.fitAll; }
    if ("zoom" in patch) { networkStageZoom = patch.zoom; }
    if ("panX" in patch) { networkStagePanX = patch.panX; }
    if ("panY" in patch) { networkStagePanY = patch.panY; }
    if ("drag" in patch) { networkStageDrag = patch.drag; }
    if ("shape" in patch) { networkStageShape = patch.shape; }
    if ("mode" in patch) { networkStageMode = patch.mode; }
    if ("focusVisible" in patch) { networkStageModeFocusVisible = patch.focusVisible; }
    if ("listsVisible" in patch) { networkStageModeListsVisible = patch.listsVisible; }
    if ("collapsed" in patch) { networkFocusCollapsed = patch.collapsed; }
    if ("group" in patch) { networkInsightsStageGroup = patch.group; }
    if ("scrollTop" in patch) { networkResultsScrollTop = patch.scrollTop; }
    if ("restorePending" in patch) { networkResultsRestorePending = patch.restorePending; }
  },
  clamp, minZoom: NETWORK_STAGE_MIN_ZOOM, maxZoom: NETWORK_STAGE_MAX_ZOOM,
  layout: () => {
    const visible = getVisibleNetworkNodes(); const selected = networkSelectedDid || getPreferredNetworkSelection(visible);
    const layout = computeNetworkLayout(visible, selected);
    layout.contentBounds = computeNetworkStageContentBounds(layout, visible, selected); return layout;
  },
  viewport: getNetworkStageViewport, renderStage: renderNetworkStage, renderWorkspace: renderNetworkWorkspace,
  persistShape: persistNetworkStageShapePreference, frame: (callback) => requestAnimationFrame(callback),
});
bindNetworkStageModeEvents({ enterButton: networkStageModeButton, exitButton: networkStageModeExitButton,
  focusButton: networkStageModeFocusButton, listsButton: networkStageModeListsButton }, networkStageController.modeHandlers);
bindNetworkInsightEvents({ groupButtons: networkInsightsGroupButtons, focusToggleButton: networkFocusToggleButton }, networkStageController.insightHandlers);
bindNetworkStageInteractionEvents({ stage: networkStageSvg }, networkStageController.interactionHandlers);
bindNetworkLifecycleEvents({ document, results: networkResults }, networkStageController.lifecycleHandlers);
const networkWorkspaceRenderer = createNetworkWorkspaceRenderer({
  body: document.body, results: networkResults, commonFilter: networkFilterCommonButton, filterButtons: networkFilterButtons,
  loaded: networkSummaryLoaded, mutuals: networkSummaryMutuals, visible: networkSummaryVisible,
  actor: networkAccountInput, canvas: networkCanvasPanel, stageCard: networkStageCard, insightsCard: networkInsightsCard,
  focusPanel: networkFocusPanel, shape: networkShapeToggleButton, collapse: networkFocusToggleButton,
  enter: networkStageModeButton, exit: networkStageModeExitButton, focus: networkStageModeFocusButton, lists: networkStageModeListsButton,
  sortField: networkSortFieldSelect, sortDirection: networkSortDirectionSelect,
  groupToggles: networkInsightsGroupToggles, groupButtons: networkInsightsGroupButtons,
  templates: { intro: document.querySelector("#network-result-intro-template"), group: document.querySelector("#network-result-group-template"),
    item: document.querySelector("#network-result-item-template"), more: document.querySelector("#network-result-more-template"),
    empty: document.querySelector("#network-result-empty-template"), icon: document.querySelector("#network-focus-toggle-template") },
}, {
  getState: () => ({ commonTargetDid: networkCommonMutualsTargetDid, selectedDid: networkSelectedDid,
    commonDids: networkCommonMutualsDids, filterMode: networkFilterMode, scrollTop: networkResultsScrollTop,
    stageMode: networkStageMode, listsVisible: networkStageModeListsVisible, focusVisible: networkStageModeFocusVisible,
    group: networkInsightsStageGroup, loading: networkLoading, viewer: networkViewerProfile, collapsed: networkFocusCollapsed,
    shape: networkStageShape, sortField: networkSortField, sortDirection: networkSortDirection }),
  cloneTemplate: cloneTemplateContent, allNodes: getAllNetworkNodes, visibleNodes: getVisibleNetworkNodes,
  relation: getNetworkRelationType, sort: sortNetworkNodes, score: getNetworkNodeScore, formatCount, t,
  ownNetwork: isViewingOwnNetwork, centerLabel: getNetworkCenterLabel, pending: hasPendingNetworkDataForGroup,
  setFilter: (mode) => { networkFilterMode = mode; }, setScroll: (top) => { networkResultsScrollTop = top; },
  select: setNetworkSelection, loadMore: loadMoreNetworkGroup, restoreScroll: restoreNetworkResultsScroll,
});
const networkFocusCardRenderer = createNetworkFocusCardRenderer({
  card: networkFocusCard, templates: { shell: document.querySelector("#network-focus-shell-template"),
    stat: document.querySelector("#network-focus-stat-template"), line: document.querySelector("#network-focus-line-template"),
    meta: document.querySelector("#network-focus-meta-template"), description: document.querySelector("#network-focus-description-template"),
    empty: document.querySelector("#network-result-empty-template") },
}, {
  getState: () => ({ selectedDid: networkSelectedDid, nodes: networkNodes, details: networkFocusDetails,
    viewer: networkViewerProfile, authAccount, accountDid: networkAccountDid, loading: networkLoading,
    focusLoadingDid: networkFocusLoadingDid, commonTargetDid: networkCommonMutualsTargetDid,
    commonLoadingDid: networkCommonMutualsLoadingDid, commonDids: networkCommonMutualsDids }),
  model: (state) => buildNetworkFocusCardModel(state, {
    known: getKnownNetworkProfile, ownNetwork: isViewingOwnNetwork, avatar: getStoredAccountAvatarUri,
    relation: getNetworkRelationLabel, score: getNetworkNodeScore, breakdown: getNetworkScoreBreakdown,
    centerLabel: getNetworkCenterLabel, locale: currentLocale, formatCount, t,
  }),
  cloneTemplate: cloneTemplateContent, setAvatar: setAvatarImage, t,
  setActorInput: (actor) => { if (networkAccountInput) { networkAccountInput.value = actor; } },
  load: loadNetworkWave, loadCommon: loadNetworkCommonMutuals, clearCommon: clearNetworkCommonMutuals,
  renderWorkspace: renderNetworkWorkspace,
});
const networkStageRenderer = createNetworkStageRenderer({
  stage: networkStageSvg, empty: networkStageEmpty,
  templates: { scene: document.querySelector("#network-svg-scene-template"), node: document.querySelector("#network-svg-node-template"),
    focus: document.querySelector("#network-svg-focus-template"), preview: document.querySelector("#network-svg-preview-template"),
    primitive: document.querySelector("#network-svg-primitive-template") },
}, {
  getState: () => ({ selectedDid: networkSelectedDid, hoveredDid: networkHoveredDid, viewer: networkViewerProfile,
    accountDid: networkAccountDid, authDid: authAccountDid, authAccount, nodes: networkNodes }),
  allNodes: getAllNetworkNodes, slot: ensureNetworkStageSlot, visibleNodes: getVisibleNetworkNodes, preferred: getPreferredNetworkSelection,
  hover: setNetworkHoveredAccount, select: setNetworkSelection, known: getKnownNetworkProfile, label: getProfileLabel,
  initials: getProfileInitials, relation: getNetworkRelationType, relationLabel: getNetworkRelationLabel, previews: getNetworkStageFocusPreviewItems,
  layout: computeNetworkLayout, contentBounds: computeNetworkStageContentBounds, viewport: getNetworkStageViewport,
  common: getActiveNetworkCommonMutualDids, orbitPath: buildNetworkOrbitPath, labels: getNetworkStageLabelCandidates,
  cloneTemplate: cloneTemplateContent, t,
});
const networkWorkspaceController = createNetworkWorkspaceController({
  search: networkSearchInput, account: networkAccountInput, sortField: networkSortFieldSelect, sortDirection: networkSortDirectionSelect,
  status: networkProgressLine, hover: networkStageHovercard,
}, {
  getState: () => ({ authAccount, authDid: authAccountDid, accountDid: networkAccountDid, viewer: networkViewerProfile,
    nodes: networkNodes, details: networkFocusDetails, selectedDid: networkSelectedDid, loadingDid: networkFocusLoadingDid,
    loading: networkLoading, hasMoreFollowers: networkHasMoreFollowers, hasMoreFollows: networkHasMoreFollows, statusLine: networkStatusLine }),
  setState: (patch) => {
    if ("accountDid" in patch) { networkAccountDid = patch.accountDid; }
    if ("viewer" in patch) { networkViewerProfile = patch.viewer; }
    if ("nodes" in patch) { networkNodes = patch.nodes; }
    if ("details" in patch) { networkFocusDetails = patch.details; }
    if ("followerCursor" in patch) { networkFollowerCursor = patch.followerCursor; }
    if ("followCursor" in patch) { networkFollowCursor = patch.followCursor; }
    if ("hasMoreFollowers" in patch) { networkHasMoreFollowers = patch.hasMoreFollowers; }
    if ("hasMoreFollows" in patch) { networkHasMoreFollows = patch.hasMoreFollows; }
    if ("loading" in patch) { networkLoading = patch.loading; }
    if ("loadingDid" in patch) { networkFocusLoadingDid = patch.loadingDid; }
    if ("selectedDid" in patch) { networkSelectedDid = patch.selectedDid; }
    if ("statusLine" in patch) { networkStatusLine = patch.statusLine; }
    if ("waveIndex" in patch) { networkWaveIndex = patch.waveIndex; }
    if ("slots" in patch) { networkStageSlots = patch.slots; }
    if ("counts" in patch) { networkStageRelationCounts = patch.counts; }
    if ("zoom" in patch) { networkStageZoom = patch.zoom; }
    if ("panX" in patch) { networkStagePanX = patch.panX; }
    if ("panY" in patch) { networkStagePanY = patch.panY; }
    if ("drag" in patch) { networkStageDrag = patch.drag; }
    if ("fitAll" in patch) { networkStageFitAll = patch.fitAll; }
    if ("hoveredDid" in patch) { networkHoveredDid = patch.hoveredDid; }
    if ("previewTab" in patch) { networkFocusPreviewTab = patch.previewTab; }
    if ("filterMode" in patch) { networkFilterMode = patch.filterMode; }
    if ("query" in patch) { networkSearchQuery = patch.query; }
    if ("sortField" in patch) { networkSortField = patch.sortField; }
    if ("sortDirection" in patch) { networkSortDirection = patch.sortDirection; }
    if ("workspace" in patch) { currentWorkspace = patch.workspace; }
  },
  clearCommon: clearNetworkCommonMutuals, relation: getNetworkRelationType, t, known: getKnownNetworkProfile, label: getProfileLabel,
  load: loadNetworkWave, loadFocus: loadNetworkFocusDetails, note: setNetworkAccountFieldNote, updateControls: updateNetworkControls,
  navigate: () => navigateToThreadlinePage(THREADLINE_PAGE_TOOLS), applyExplorerFullscreen: applyThreadExplorerFullscreenState,
  persistWorkspace: persistWorkspacePreference, showWorkspace: setVisibleWorkspace,
  applyHashtagContext: applyHashtagPaneContext, updateAuth: updateAuthButtons,
  renderers: [() => networkWorkspaceRenderer.presentation(), updateNetworkFilterButtons, renderNetworkSummary,
    renderNetworkStage, renderNetworkFocus, renderNetworkResults, updateNetworkControls], restoreScroll: restoreNetworkResultsScroll,
});
bindNetworkWorkspaceEvents({ filterButtons: networkFilterButtons, searchInput: networkSearchInput, accountInput: networkAccountInput,
  sortField: networkSortFieldSelect, sortDirection: networkSortDirectionSelect, accountLoadButton: networkAccountLoadButton,
  ownLoadButton: networkOwnLoadButton, loadButton: networkLoadButton, resetButton: networkResetButton }, networkWorkspaceController.handlers);
const savedAccountRenderer = createSavedAccountRenderer({
  panel: accountSwitcherPanel, list: accountSwitcherList,
  template: document.querySelector("#account-switcher-item-template"),
}, {
  getState: () => ({ accounts: savedAccounts, online: appOnline, did: authAccountDid }),
  setAvatar: setAvatarImage, avatar: getStoredAccountAvatarUri, t,
  bind: bindAccountSwitcherItemEvents, actions: savedAccountActions,
});
bindAuthenticationEvents({ addAccountButton, loginDialogCloseTop, loginDialogCancelButton,
  loginDialog, window, loginForm }, loginController.handlers);
const applicationSession = createApplicationSessionController({
  getState: () => ({ account: authAccount, did: authAccountDid, service: authAccountService,
    webApp: authAccountWebApp, accounts: savedAccounts }),
  setAccounts: (accounts) => { savedAccounts = accounts; },
  setIdentity: applyAuthenticationIdentity,
  request: sendToServiceWorker, restoreAvatars: restoreAccountAvatarCache, renderAccounts: renderAccountSwitcher,
  disconnect: applyDisconnectedState, openLogin: openLoginDialog, updateAuthButtons,
  setStatus, t, restoreWorkspace: restorePreferredWorkspaceIfPossible, report: (error) => console.error(error),
  clearInterval: (timer) => window.clearInterval(timer), setInterval: (callback, delay) => window.setInterval(callback, delay),
});
const applicationInstall = createApplicationInstallController({ button: installButton, dialog: installDialog }, {
  isIos: isIosDevice, isStandalone: isStandaloneMode, report: (error) => console.error(error),
});
const desktopLayout = createDesktopLayoutController({
  root: document.documentElement, body: document.body, toggle: sidebarToggleButton,
  glyph: sidebarToggleGlyph, sidebarHandle: sidebarResizeHandle, composerHandle: composerResizeHandle,
}, {
  getState: () => ({ sidebarWidthDesktop, composerWidthDesktop, sidebarCollapsedDesktop }),
  setState: (patch) => {
    if ("sidebarWidthDesktop" in patch) { sidebarWidthDesktop = patch.sidebarWidthDesktop; }
    if ("composerWidthDesktop" in patch) { composerWidthDesktop = patch.composerWidthDesktop; }
    if ("sidebarCollapsedDesktop" in patch) { sidebarCollapsedDesktop = patch.sidebarCollapsedDesktop; }
  },
  widths: {
    sidebar: { min: MIN_SIDEBAR_WIDTH_DESKTOP, max: MAX_SIDEBAR_WIDTH_DESKTOP, default: DEFAULT_SIDEBAR_WIDTH_DESKTOP },
    composer: { min: MIN_COMPOSER_WIDTH_DESKTOP, max: MAX_COMPOSER_WIDTH_DESKTOP, default: DEFAULT_COMPOSER_WIDTH_DESKTOP },
  },
  collapsedWidth: DESKTOP_SIDEBAR_COLLAPSED_WIDTH, media: DESKTOP_LAYOUT_MEDIA, events: window,
  computedStyle: (element) => window.getComputedStyle(element), bind: bindApplicationEvents, resizeTextareas: scheduleSegmentTextareaResize,
  persist: persistSettings, setStatus, t,
});
desktopLayout.bind();
desktopLayout.apply();
desktopLayout.renderSidebar();
const appearanceController = createAppearanceController({
  body: document.body, themeNote: themeStatusNote, themeButton: themeToggleButton,
  densityNote: compactModeStatusNote, densityButtons: compactModeToggleButtons,
}, {
  storage: () => window.localStorage,
  read: readBrowserStorageValue, write: writeBrowserStorageValue,
  themeKey: THEME_MODE_STORAGE_KEY, densityKey: COMPACT_MODE_STORAGE_KEY,
  getState: () => ({ themeMode, compactMode }),
  setState: (patch) => {
    if ("themeMode" in patch) { themeMode = patch.themeMode; }
    if ("compactMode" in patch) { compactMode = patch.compactMode; }
  },
  href: () => window.location.href,
  replaceUrl: (url) => window.history.replaceState({}, document.title, url),
  t, applyLayout: applyDesktopLayoutState,
});
const pendingNavigation = createPendingNavigationController({
  storage: () => window.sessionStorage, key: PENDING_PAGE_SWITCH_URL_SESSION_KEY,
  read: readBrowserStorageValue, write: writeBrowserStorageValue, remove: removeBrowserStorageValue,
  href: () => window.location.href,
});
const loadArchiveHtmlTemplates = createArchiveHtmlTemplateLoader({
  fetch: (path) => fetch(path),
  error: (status) => t("archiveHtmlTemplateLoadFailed", { status }),
});
const archiveHtmlModels = createArchiveHtmlModels({
  t, locale: () => currentLocale, extractHashtags: extractArchiveHashtagsFromText,
  linkRuns: extractPdfLinkRuns, account: () => authAccount, now: () => new Date(),
  locales: SUPPORTED_LOCALES, translations, defaultLocale: DEFAULT_LOCALE,
  normalizeStandardSite: normalizeStandardSiteMetadata, publicationFooter: getPublicationCardFooterLabel,
});
const archiveHtmlRenderer = createArchiveHtmlRenderer({
  models: archiveHtmlModels, loadTemplates: loadArchiveHtmlTemplates,
  parse: (html) => new DOMParser().parseFromString(html, "text/html"),
  t, timestamp: formatHistoryTimestamp, linkRuns: extractPdfLinkRuns,
  depths: buildArchiveThreadDepthMap, escape: escapeHtml, escapeAttribute: escapeHtmlAttribute,
});
const archiveHtmlExport = createArchiveHtmlExportController({
  t, ensureAvatars: ensureArchiveAvatarAssets, encodeAsset: assetToDataUriAsync,
  shouldCompact: shouldAutoFallbackArchiveHtmlToCompact, isSizeError: isArchiveStringLengthError,
  build: archiveHtmlRenderer.build, progress: setArchiveProgress, frame: waitForUiFrame,
  baseName: makeArchiveFileBaseName, file: (html, name) => new File([html], name, { type: "text/html" }),
  deliver: shareOrDownloadFile,
});

const archivePdfLayout = createArchivePdfLayout({
  externalCard: getArchiveExternalCard, shortenUrl: shortenArchiveUrlForDisplay, wrap: buildWrappedPdfLines,
  t, groups: buildArchiveThreadGroups, canvas: () => document.createElement("canvas"), maxImages: MAX_IMAGES_PER_SEGMENT,
});
const archivePdfRenderer = createArchivePdfRenderer({
  ...archivePdfLayout, fill: fillRoundedRect, stroke: strokeRoundedRect, circle: drawCircularImageCover,
  image: drawRoundedImageContain, bitmap: loadArchiveAssetBitmap, metrics: buildPostMetricLabels, wrap: buildWrappedPdfLines,
  text: drawArchivePdfTextBlock, rectangle: canvasRectToPdfRect, timestamp: formatHistoryTimestamp, t,
  canvas: () => document.createElement("canvas"), account: () => authAccount,
});
const archivePdfExport = createArchivePdfExportController({
  paginate: archivePdfLayout.paginate, page: archivePdfRenderer.page, pdf: buildPdfFile, frame: waitForUiFrame,
  t, progress: setArchiveProgress, ensureAvatars: ensureArchiveAvatarAssets, options: getArchivePdfOptions,
  groups: buildArchiveThreadGroups, bands: archivePdfLayout.bands, baseName: makeArchiveFileBaseName,
  deliver: shareOrDownloadFile, account: () => authAccount,
  file: (blob, name) => new File([blob], name, { type: "application/pdf" }),
});

const archiveCatalogFiles = createArchiveCatalogService({
  t, depths: buildArchiveThreadDepthMap, parseZip: archiveZipCodec.parse, parseJson: parseJsonBytes, gunzip: gunzipBlob,
  encode: utf8Bytes, zip: archiveZipCodec.build, baseName: makeArchiveFileBaseName,
  file: (bytes, name) => new File([bytes], name, { type: "application/zip" }), deliver: shareOrDownloadFile, progress: setArchiveProgress,
});
const archiveMediaModels = createArchiveMediaModels({ filters: getArchiveFilters, serialize: serializeArchiveFilters, account: () => authAccount, now: () => new Date() });
const archiveMediaExport = createArchiveMediaExportController({
  ...archiveMediaModels, batchSize: MEDIA_EXPORT_BATCH_SIZE, t, account: () => authAccount,
  supported: () => typeof window.showSaveFilePicker === "function", options: getArchiveMediaExportOptions,
  signal: () => activeMediaExportAbortController?.signal || null,
  notice: (value) => { archiveTransientNotice = value; renderArchiveStatusLine(); },
  request: sendToServiceWorker, progress: setArchiveProgress, status: setStatus, encode: utf8Bytes,
  partName: buildArchiveMediaPartFileName, baseName: (options) => buildArchiveMediaFileBaseNameFromData(options.actor, authAccount),
  pick: (options) => window.showSaveFilePicker(options), writer: archiveZipCodec.createWriter,
  warn: (...args) => console.warn(...args), now: () => new Date(),
});

const catalogAvatarAssets = createArchiveAvatarAssets({
  state: () => ({ accounts: savedAccounts, did: authAccountDid, handle: authAccount }),
  partner: getDmPrimaryPartner, download: assetService.download, extension: getAssetExtensionFromMimeType,
});

/** Reads archive state for domain controllers and presentation. @returns {object} Current state and selected form values. */
function getArchiveWorkspaceState() {
  return { catalog: archiveCatalog, session: archiveSession, preview: archivePreviewState, runId: activeArchiveRunId, runState: activeArchiveRunState, checkpoint: archiveLastCheckpoint, lastProgressAt: archiveLastProgressAt, notice: archiveTransientNotice, job: archiveJobState,
  mediaRunning: activeMediaExportState === "running" && Boolean(activeMediaExportAbortController),
  workspace: currentWorkspace, account: authAccount, profile: archiveSourceProfile, source: String(archiveSourceInput?.value || "").trim(),
  livePreview: archiveLivePreviewToggle.checked, pdfOptions: getArchivePdfOptions(),
  };
}
/** Applies explicit archive state patches. @param {object} patch - Updated state fields. @returns {void} */
function applyArchiveRunPatch(patch) {
  if (Object.hasOwn(patch, "catalog")) { archiveCatalog = patch.catalog; }
  if (Object.hasOwn(patch, "session")) { archiveSession = patch.session; }
  if (Object.hasOwn(patch, "preview")) { archivePreviewState = patch.preview; }
  if (Object.hasOwn(patch, "runId")) { activeArchiveRunId = patch.runId; }
  if (Object.hasOwn(patch, "runState")) { activeArchiveRunState = patch.runState; }
  if (Object.hasOwn(patch, "checkpoint")) { archiveLastCheckpoint = patch.checkpoint; }
  if (Object.hasOwn(patch, "lastProgressAt")) { archiveLastProgressAt = patch.lastProgressAt; }
  if (Object.hasOwn(patch, "notice")) { archiveTransientNotice = patch.notice; }
  if (Object.hasOwn(patch, "job")) { archiveJobState = patch.job; }
}
const archiveWorkspaceModels = createArchiveWorkspaceModels({ t, locale: () => currentLocale });
const archiveWorkspaceRenderer = createArchiveWorkspaceRenderer({
  sourceStatus: archiveSourceStatus,
  sourcePreview: archiveSourcePreview,
  progressTitle: archiveProgressTitle,
  progressStep: archiveProgressStep,
  progressDetail: archiveProgressDetail,
  progressFill: archiveProgressFill,
  previewPanel: archivePreviewPanel,
  previewCard: archivePreviewCard,
  heartbeat: archiveProgressHeartbeat,
  background: archiveBackgroundNotice,
  status: archiveRunStatusLine,
  startHint: archiveStartHint,
  nextWave: archiveNextWaveButton,
  mediaExport: archiveExportMediaZipButton,
  pause: archivePauseButton,
  resume: archiveResumeButton,
  cancel: archiveCancelButton,
  summaryPosts: archiveSummaryPosts,
  summaryImages: archiveSummaryImages,
  summaryBands: archiveSummaryBands,
  spec: archiveSpecContent,
  results: archiveResults,
  htmlButtons: [archiveExportHtmlButton, archiveActionsExportHtmlButton],
  sourceTemplate: document.querySelector("#archive-workspace-source-template"),
  noteTemplate: document.querySelector("#archive-workspace-note-template"),
  previewTemplate: document.querySelector("#archive-workspace-preview-template"),
  specTemplate: document.querySelector("#archive-workspace-spec-template"),
  specItemTemplate: document.querySelector("#archive-workspace-spec-item-template"),
  resultTemplate: document.querySelector("#archive-workspace-result-template"),
}, { state: getArchiveWorkspaceState, models: archiveWorkspaceModels, t, avatar: setAvatarImage,
  tooLarge: isArchiveHtmlTooLargeForEmbeddedExport, bindResult: bindArchiveResultExportEvents,
  zip: exportArchiveZipFromCatalog, html: exportArchiveHtmlFromCatalog, pdf: exportArchivePdfBandsFromCatalog,
  scope: updateArchiveScopeFields, progress: setArchiveProgress,
});
const archiveRunController = createArchiveRunController({
  state: getArchiveWorkspaceState, setState: applyArchiveRunPatch, t, request: sendToServiceWorker,
  hint: renderArchiveStartHint, status: renderArchiveStatusLine, actionButtons: syncArchiveActionButtonStates, controls: updateArchiveRunControls,
  filters: getArchiveFilters, serialize: serializeArchiveFilters, validateSource: validateArchiveSourceInput, progress: setArchiveProgress,
  preview: renderArchivePreview, waveSize: getArchiveWaveSize, normalize: normalizeImportedArchiveCatalog, summary: updateArchiveSummary,
  results: renderArchiveResults, render: renderArchiveWorkspace, notice: buildArchiveCatalogNotice,
  source: () => archiveSourceInput?.value || "", sourceProfile: () => archiveSourceProfile,
  threadUrl: () => archiveThreadUrlInput?.value || "", threadMode: () => archiveThreadImportModeSelect?.value,
  nextWave: () => archiveNextWaveButton?.click(), enableNextWave: () => { if (archiveNextWaveButton) { archiveNextWaveButton.disabled = false; } },
  runId: () => crypto.randomUUID(), now: () => new Date(), warn: (...args) => console.warn(...args), error: (error) => console.error(error),
});

const archiveSourceController = createArchiveSourceController({
  value: () => archiveSourceInput?.value || "", write: (value) => setPickerInputValue(archiveSourceInput, value),
  profile: (value) => { archiveSourceProfile = value; }, status: (value) => { if (archiveSourceStatus) { archiveSourceStatus.textContent = value; } },
  render: renderArchiveSourceState, persist: persistArchivePreferences, invalidate: invalidateArchiveCatalog,
  request: sendToServiceWorker, t, schedule: (callback, delay) => window.setTimeout(callback, delay), clear: (timer) => window.clearTimeout(timer),
});
const archiveWorkspaceLayout = createArchiveWorkspaceLayout({
  workspace: archiveWorkspace,
  source: archiveSourceInput,
  band: archiveBandSizeSelect,
  nextWave: archiveNextWaveButton,
  mediaActor: archiveMediaActorInput,
  progressTitle: archiveProgressTitle,
  threadUrl: archiveThreadUrlInput,
  spec: archiveSpecContent,
  hashtags: archiveHashtagSlot,
  waveSize: archiveWaveSizeSelect,
  exportHtml: archiveActionsExportHtmlButton,
  exportCompact: archiveActionsExportHtmlCompactButton,
  exportPdf: archiveActionsExportPdfButton,
  importButton: archiveImportButton,
  reset: archiveResetButton,
  progressCompact: archiveProgressExportHtmlCompactButton,
  startHint: archiveStartHint, exportZip: archiveExportZipButton,
}, {
  exportTemplate: document.querySelector("#archive-layout-export-template"), toolsTemplate: document.querySelector("#archive-layout-tools-template"),
  contentTemplate: document.querySelector("#archive-layout-content-template"), actionsTemplate: document.querySelector("#archive-layout-actions-template"),
  noteTemplate: document.querySelector("#archive-workspace-note-template"),
}, t);

const dmExportModels = createDmExportModels({
 t, date: formatArchiveDatePart, extractCard: extractExternalCardFromEmbed, links: extractPdfLinkRuns,
 account: () => authAccount, selection: () => dmSelectedParticipantDids, now: () => new Date(),
 locales: SUPPORTED_LOCALES, translations, defaultLocale: DEFAULT_LOCALE,
});
const dmPdfRenderer = createDmPdfRenderer({
 partner: dmExportModels.partner, title: dmExportModels.title, wrap: buildWrappedPdfLines, bitmap: loadArchiveAssetBitmap,
 circle: drawCircularImageCover, timestamp: formatCompactArchiveTimestamp, fill: fillRoundedRect, stroke: strokeRoundedRect,
 text: drawArchivePdfTextBlock, rectangle: canvasRectToPdfRect, t, canvas: () => document.createElement("canvas"),
});
const dmHtmlRenderer = createDmHtmlRenderer({
 models: dmExportModels, t, locale: () => currentLocale, account: () => authAccount, now: () => new Date(),
 assetUri: assetToDataUri, timestamp: formatCompactArchiveTimestamp, shorten: shortenArchiveUrlForDisplay, links: extractPdfLinkRuns,
 fetch: (url) => fetch(url), parse: (html) => new DOMParser().parseFromString(html, "text/html"),
 error: (status) => t("archiveHtmlTemplateLoadFailed", { status }),
});

const searchState = {
  get hashtags() { return hashtags; },
  set hashtags(value) { hashtags = value; },
  get searchSelectedHashtags() { return searchSelectedHashtags; },
  set searchSelectedHashtags(value) { searchSelectedHashtags = value; },
  get searchSelectedLanguages() { return searchSelectedLanguages; },
  set searchSelectedLanguages(value) { searchSelectedLanguages = value; },
  get searchResults() { return searchResults; },
  set searchResults(value) { searchResults = value; },
  get searchCursor() { return searchCursor; },
  set searchCursor(value) { searchCursor = value; },
  get searchResultPreferences() { return searchResultPreferences; },
  set searchResultPreferences(value) { searchResultPreferences = value; },
  get activeSearchRunId() { return activeSearchRunId; },
  set activeSearchRunId(value) { activeSearchRunId = value; },
  get searchCancelPending() { return searchCancelPending; },
  set searchCancelPending(value) { searchCancelPending = value; },
  get searchLoading() { return searchLoading; },
  set searchLoading(value) { searchLoading = value; },
};
const searchPreferencesNormalizer = createSearchPreferencesNormalizer({
 normalizeHashtags: normalizeHashtagEntries, getDisplayHashtag, normalizeLanguages: normalizePostLanguageTags, maxLanguages: MAX_SEARCH_LANGUAGES,
});
const searchModels = createSearchModels({
 t, count: formatCount, formatTag: formatHashtag, displayTag: getDisplayHashtag, quote: quoteSearchSummaryValue,
 languages: normalizePostLanguageTags, languageName: getPostLanguageDisplayName, sharedQuery: buildSharedSearchQuery,
 normalize: normalizeSearchPreferencesForStorage, account: () => authAccount, locale: () => currentLocale, maxLanguages: MAX_SEARCH_LANGUAGES,
});
const savedSearchModels = createSavedSearchModels({
  translate: t, normalizePreferences: normalizeSearchPreferencesForStorage,
  labelFromPreferences: buildSavedSearchLabelFromPreferences, sharedUrl: buildBskySearchUrlFromPayload,
  getString: getSavedSearchStringParamFromSearch, normalizeSort: normalizeSavedSearchSortFromSearch,
  now: () => new Date().toISOString(), timestamp: () => Date.now(), random: () => Math.random(),
});
const searchForm = createSearchFormController({
 state: searchState, elements: { searchModeSelect, searchActorField, searchTagsField, searchSortField, searchModeNote, searchActorInput, searchQueryInput, searchTagMatchSelect, searchMediaSelect, searchPostTypeSelect, searchSortSelect, searchExcludeTextInput, searchMentionsInput, searchDomainInput, searchTargetUrlInput, searchSinceInput, searchUntilInput, searchUrlInput, searchUrlStatus, searchStatus, searchLanguageSummary },
 maxLanguages: MAX_SEARCH_LANGUAGES, t, languages: normalizePostLanguageTags, selectedTags: normalizeSelectedHashtagEntries,
 displayTag: getDisplayHashtag, tags: normalizeHashtagEntries, parseUrl: parseSavedSearchUrl, splitQuery: splitSharedSearchQuery,
 renderTags: renderHashtagCloud, renderWorkspace: renderSearchWorkspace, renderResults: renderSearchResults, persist: persistSettings,
 announce: setStatus, languageName: getPostLanguageDisplayName, account: () => authAccount, locale: () => currentLocale, hydrated: () => appStateHydrated,
 schedule: (callback, delay) => window.setTimeout(callback, delay), clearTimer: (id) => window.clearTimeout(id), invalidate: () => searchRun.invalidate(),
});
const searchRun = createSearchRunController({
 state: searchState, account: () => authAccount, payload: collectSearchRequestPayload, preferences: getSearchPreferences,
 enforceSort: enforceSearchSortConstraints, normalize: normalizeSearchPreferencesForStorage, items: normalizePersistedSearchResultItems,
 snapshot: buildPersistableSearchResultState, match: doesSearchResultStateMatch, request: (payload, options) => requestSearchResults(sendToServiceWorker, payload, options),
 control: (payload, options) => sendToServiceWorker("SET_SEARCH_RUN_CONTROL", payload, options),
 id: () => crypto.randomUUID(), detailed: shouldShowDetailedSearchProgress, progress: buildSearchProgressStatus, loaded: buildSearchLoadedStatus,
 status: (text) => { if (searchStatus) { searchStatus.textContent = text; } }, render: renderSearchWorkspace, results: renderSearchResults,
 persist: persistSettings, t, count: formatCount, report: (error) => console.error(error), maxItems: MAX_PERSISTED_SEARCH_RESULTS,
});

const savedSearchController = createSavedSearchController({
  models: savedSearchModels, getSearches: () => savedSearches, setSearches: (value) => { savedSearches = value; },
  preferences: getSearchPreferences, normalizePreferences: normalizeSearchPreferencesForStorage, equal: areSearchPreferencesEqual,
  persist: persistSettings, now: () => new Date().toISOString(), t,
  status: (text) => { if (searchStatus) { searchStatus.textContent = text; } },
  dialogStatus: (text) => { savedSearchesStatus.textContent = text; }, clearInput: () => { savedSearchUrlInput.value = ""; },
  renderDialog: renderSavedSearchesDialog, closeDialog: () => { if (savedSearchesDialog.open) { savedSearchesDialog.close(); } },
  explorerSearchId: () => getThreadExplorerSearchIdFromSource(threadExplorerSource),
  resetExplorer: () => {
    threadExplorerSource = "follows";
    threadExplorerCursor = "";
    threadExplorerHasMore = true;
    threadExplorerItems = [];
    threadExplorerSelectedUri = "";
    threadExplorerTree = null;
    clearThreadExplorerRenderedMediaCache();
    clearThreadExplorerSelectionPreference();
  },
  renderExplorer: renderThreadExplorerWorkspace, archiveSearchId: () => archiveSavedSearchId,
  clearArchive: () => { archiveSavedSearchId = ""; renderArchiveSavedSearchNote(); },
  applyExplorer: setThreadExplorerSource,
  applyArchive: async (search) => {
    archiveSavedSearchId = search.id;
    await persistArchivePreferences();
    archiveThreadUrlNote.textContent = t("archiveSavedSearchSelected", {
      label: search.label || buildSavedSearchLabel(search), url: search.sourceUrl,
    });
  },
  invalidateSearch: () => searchRun.invalidate(),
  applySearch: (preferences) => {
    applySearchPreferences(preferences);
    searchResults = [];
    searchCursor = "";
    searchResultPreferences = null;
    renderHashtagCloud();
    renderSearchResults();
    renderSearchWorkspace();
  },
});

const snapshotExportController = createThreadExplorerSnapshotExportController({
 exportButton: threadExplorerSnapshotPngButton, cancelButton: threadExplorerSnapshotCancelButton,
 dialog: threadExplorerSnapshotProgressDialog, title: threadExplorerSnapshotProgressTitle,
 step: threadExplorerSnapshotProgressStep, detail: threadExplorerSnapshotProgressDetail,
 fill: threadExplorerSnapshotProgressFill, bar: threadExplorerSnapshotProgressBar, status: threadExplorerThreadStatus,
}, {
 t, render: renderThreadExplorerSnapshotBlob,
 fileName: () => buildThreadExplorerSnapshotFileNameFromData(threadExplorerTree?.post || {}, "png", sanitizeThreadExplorerFileNamePart),
 downloadBlob: downloadThreadExplorerBlob, frame: waitForThreadExplorerSnapshotFrame,
 wait: (delay) => new Promise((resolve) => window.setTimeout(resolve, delay)),
 abortController: () => new AbortController(), refresh: updateThreadExplorerControls, report: (error) => console.error(error),
});

const applicationStorage = createApplicationStorage({
  request: sendToServiceWorker, queue: settingsSaveQueue, snapshot: getSettingsSnapshot,
  report: (error) => console.error(error), setStatus,
});
const applicationHydration = createApplicationHydrationController({
  proxyEndpoint: linkCardEndpointInput, proxySecret: linkCardSecretInput, resize: imageAutoResizeSelect,
  expert: archiveExpertModeToggle, identifier: identifierField, source: sourceText, password: passwordField,
  placement: hashtagPlacementSelect, intro: threadIntroToggle, emoji: threadEmojiToggle, spacing: markerSpacingToggle,
}, {
  detectLocale: detectBrowserLocale, load: applicationStorage.load, getAppearance: getStoredAppearancePreferences,
  preferences: { normalizeResize: normalizeImageAutoResizeMode, normalizeLayout: normalizeStoredDesktopLayout,
    layoutVersion: DESKTOP_LAYOUT_STATE_VERSION },
  normalize: { hashtags: normalizeHashtagEntries, selection: normalizeSelectedHashtagEntries,
    search: normalizeSearchPreferencesForStorage, placement: normalizeHashtagPlacement,
    images: normalizeSegmentImages, cards: normalizeSegmentLinkCards, overrides: normalizeSegmentOverrides,
    reply: normalizeReplyTarget, languages: normalizePostLanguageTags, provider: normalizeLinkCardProvider,
    usage: normalizeMicrolinkUsage, history: normalizePostingHistory, favorites: normalizeThreadExplorerFavorites,
    searches: normalizeSavedSearches },
  setState: applyHydratedApplicationState,
  applySearch: applySearchPreferences, restoreSearch: restorePersistedSearchResultState,
  renderSearch: renderSearchResults, restoreSearchStatus: restoreSearchStatusFromResultState,
  consumeReplyUrl: consumeComposerReplyTargetFromUrl, consumeReplyStorage: consumePendingComposerReplyTarget,
  restoreAnalysis: restorePersistedAnalysisState, applyInteraction: applyPostInteractionSettings,
  syncProvider: syncLinkCardProviderUi, setLocked: setComposerLocked, restoreExplorer: restorePersistedThreadExplorerState,
  defaultLocale: DEFAULT_LOCALE, defaultService: LOGIN_SERVICE_PRESETS["bsky.social"], resolveWebApp: resolvePostWebBase,
  normalizeArchiveCatalog: (catalog) => { if (catalog) { return normalizeImportedArchiveCatalog(catalog); } return null; },
  normalizeAccounts: (accounts) => { if (Array.isArray(accounts)) { return accounts; } return []; },
  applyAvatarCache: applyAccountAvatarCache, applyDmCache: applyDmPartnerCache, applyService: applyLoginServiceSelection,
  applyArchive: applyArchivePreferences,
  finalRender: [syncArchiveTransientNoticeFromCatalog, applyDesktopLayoutState, applySidebarState,
    applyHashtagPaneContext, applyTranslations, persistAppearancePreferences],
  validateImages: scheduleImageValidation, persist: persistSettings,
  setHydrated: (value) => { appStateHydrated = value; }, restoreWorkspace: restorePreferredWorkspaceIfPossible,
  scheduleReminder: () => window.setTimeout(showSettingsBackupReminderIfNeeded, 0),
  report: (error) => console.error(error), setStatus,
});
const applicationBootstrap = createApplicationBootstrap({
  isSupported: () => "serviceWorker" in navigator, translate: t, setStatus,
  isPrivacyNavigation: () => privacyPageNavigationInProgress,
  consumeNavigation: consumePendingPageSwitchUrl, getHref: () => window.location.href,
  now: () => Date.now(), navigate: (href) => window.location.replace(href),
  bindControllerChange: (handler) => navigator.serviceWorker.addEventListener("controllerchange", handler),
  register: () => navigator.serviceWorker.register("./sw.js", { scope: "./" }),
  setRegistration: (registration) => { serviceWorkerRegistration = registration; },
  ready: () => navigator.serviceWorker.ready, hydrate: hydrateAppState,
  verifySession, startSessionChecks, checkUpdates: checkForUpdates, report: (error) => console.error(error),
});
bindGlobalApplicationEvents({ displayModeMediaQuery: window.matchMedia("(display-mode: standalone)") },
  createApplicationLifecycleHandlers({
    isVisible: () => document.visibilityState === "visible", verifySession,
    checkUpdates: scheduleSilentUpdateCheck, syncAppearance: syncAppearanceFromLocalStorage,
    applyAccessGate: applyDmAccessGateFromLocation, resizeTextareas: scheduleSegmentTextareaResize,
    install: applicationInstall,
  }));
currentLocale = detectBrowserLocale();
localePreference = "auto";
currentTipIndex = pickRandomTipIndex();
tipsVisible = true;
hashtagPlacement = "first";
restoreAppearancePreferencesFromLocalStorage();
applyAppearancePreferencesFromUrl();
clearMatchingPendingPageSwitchUrl();
languageSelect.value = localePreference;
applyLoginServiceSelection(LOGIN_SERVICE_PRESETS["bsky.social"]);
renderAccountSwitcher();
applyHashtagPaneContext();
applyTranslations();
applyTheme();
applyCompactMode();
void applyDmAccessGateFromLocation();
updateInstallButtonVisibility();
setStatus(t("statusPreparing"));
registerServiceWorker();
renderSegments();


