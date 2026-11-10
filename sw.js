importScripts("./version.js");

const APP_VERSION = globalThis.APP_VERSION_INFO?.cacheVersion || "v0";
const CACHE_NAME = `threadline-${APP_VERSION}`;
const REMOTE_MEDIA_CACHE_NAME = "threadline-remote-media-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./tools.html",
  "./datenschutz.html",
  "./styles.css",
  "./app.js",
  "./js/atproto/atproto-worker.js",
  "./js/worker/search-queries.js",
  "./js/worker/search-filters.js",
  "./js/worker/search-service.js",
  "./js/worker/dm-models.js",
  "./js/worker/dm-messages.js",
  "./js/worker/dm-service.js",
  "./js/worker/archive-run-messages.js",
  "./js/worker/archive-run-control.js",
  "./js/worker/archive-models.js",
  "./js/worker/archive-thread-service.js",
  "./js/worker/archive-source-service.js",
  "./js/worker/archive-wave-service.js",
  "./js/worker/archive-asset-service.js",
  "./js/worker/archive-import-service.js",
  "./js/worker/account-avatar-cache.js",
  "./js/worker/record-models.js",
  "./js/worker/adapter-messages.js",
  "./js/worker/transport-service.js",
  "./js/worker/auth-models.js",
  "./js/worker/storage-service.js",
  "./js/worker/identity-service.js",
  "./js/worker/session-service.js",
  "./js/worker/account-service.js",
  "./js/worker/network-data-service.js",
  "./js/worker/network-workspace-service.js",
  "./js/worker/composer-image-store.js",
  "./js/worker/composer-image-models.js",
  "./js/worker/explorer-models.js",
  "./js/worker/explorer-feed-models.js",
  "./js/worker/explorer-load-service.js",
  "./js/worker/explorer-hydration-service.js",
  "./js/worker/explorer-reaction-service.js",
  "./js/worker/media-export-models.js",
  "./js/worker/media-export-service.js",
  "./js/worker/richtext-models.js",
  "./js/worker/richtext-service.js",
  "./js/worker/settings-models.js",
  "./js/worker/settings-service.js",
  "./js/worker/reply-models.js",
  "./js/worker/post-check-service.js",
  "./js/worker/interaction-service.js",
  "./js/worker/publish-service.js",
  "./js/worker/archive-wave-controller.js",
  "./js/worker/analysis-models.js",
  "./js/worker/analysis-messages.js",
  "./js/worker/analysis-service.js",
  "./version.json",
  "./js/core/app-translations.js",
  "./js/core/app-bootstrap.js",
  "./js/core/app-session.js",
  "./js/core/app-help.js",
  "./js/core/app-help-markdown.js",
  "./js/core/app-help-topics.js",
  "./js/core/app-dialogs.js",
  "./js/core/app-i18n.js",
  "./js/core/app-initialization.js",
  "./js/core/app-navigation.js",
  "./js/core/app-shell.js",
  "./js/core/app-state.js",
  "./js/core/app-storage.js",
  "./js/core/app-backup.js",
  "./js/core/app-utils.js",
  "./js/core/app-layout-state.js",
  "./js/atproto/atproto-client.js",
  "./js/atproto/atproto-actors.js",
  "./js/atproto/atproto-media.js",
  "./js/atproto/atproto-posting.js",
  "./js/atproto/atproto-search.js",
  "./js/atproto/atproto-session.js",
  "./js/composer/composer-main.js",
  "./js/composer/composer-splitter.js",
  "./js/composer/composer-images.js",
  "./js/composer/composer-link-cards.js",
  "./js/composer/composer-history.js",
  "./js/composer/composer-mentions.js",
  "./js/composer/composer-page.js",
  "./js/composer/composer-post-settings.js",
  "./js/composer/composer-validation.js",
  "./js/composer/composer-segments.js",
  "./js/composer/composer-image-geometry.js",
  "./js/composer/composer-publishing.js",
  "./js/composer/composer-image-renderer.js",
  "./js/composer/composer-image-editor.js",
  "./js/composer/composer-image-processing.js",
  "./js/composer/composer-document.js",
  "./js/composer/composer-link-card-providers.js",
  "./js/composer/composer-dialogs.js",
  "./js/composer/composer-segment-rendering.js",
  "./js/tools/tools-layout.js",
  "./js/tools/tools-page.js",
  "./js/tools/account-picker.js",
  "./js/tools/network-ui.js",
  "./js/tools/dm-export-models.js",
  "./js/tools/dm-html-rendering.js",
  "./js/tools/dm-pdf-rendering.js",
  "./js/tools/dm-archive.js",
  "./js/tools/search.js",
  "./js/tools/search-models.js",
  "./js/tools/search-form.js",
  "./js/tools/search-controller.js",
  "./js/tools/search-results.js",
  "./js/tools/thread-explorer.js",
  "./js/tools/thread-explorer-controller.js",
  "./js/tools/thread-explorer-snapshot.js",
  "./js/tools/thread-explorer-layout.js",
  "./js/tools/thread-explorer-hydration.js",
  "./js/tools/thread-explorer-media-hydration.js",
  "./js/tools/thread-explorer-rendering.js",
  "./js/tools/network.js",
  "./js/tools/network-layout.js",
  "./js/tools/network-rendering.js",
  "./js/tools/network-focus-rendering.js",
  "./js/tools/network-stage-rendering.js",
  "./js/tools/network-controller.js",
  "./js/tools/analysis.js",
  "./js/tools/analysis-config.js",
  "./js/tools/analysis-accounts.js",
  "./js/tools/analysis-comparison.js",
  "./js/tools/analysis-rendering.js",
  "./js/tools/analysis-table-models.js",
  "./js/tools/analysis-controller.js",
  "./js/tools/analysis-report-models.js",
  "./js/tools/analysis-report-layout.js",
  "./js/tools/analysis-pdf-rendering.js",
  "./js/tools/analysis-corpus.js",
  "./js/tools/analysis-similarity.js",
  "./js/tools/analysis-temporal.js",
  "./js/tools/analysis-stylometry.js",
  "./js/tools/archive-catalog.js",
  "./js/tools/archive-media-models.js",
  "./js/tools/archive-media-export.js",
  "./js/tools/archive-assets.js",
  "./js/tools/archive-workspace-models.js",
  "./js/tools/archive-workspace-rendering.js",
  "./js/tools/archive-run-controller.js",
  "./js/tools/archive-source.js",
  "./js/tools/archive.js",
  "./js/tools/archive-pdf-layout.js",
  "./js/tools/archive-pdf-rendering.js",
  "./js/tools/archive-pdf-export.js",
  "./js/tools/archive-html-models.js",
  "./js/tools/archive-html-rendering.js",
  "./js/tools/archive-html-export.js",
  "./js/tools/archive-preferences.js",
  "./js/shared/shared-accounts.js",
  "./js/shared/profile-metadata.js",
  "./js/shared/shared-assets.js",
  "./js/shared/shared-images.js",
  "./js/shared/shared-zip.js",
  "./js/shared/shared-pdf.js",
  "./js/shared/shared-pdf-text.js",
  "./js/shared/shared-canvas.js",
  "./js/shared/shared-templates.js",
  "./js/shared/shared-link-cards.js",
  "./js/shared/shared-languages.js",
  "./js/shared/shared-hashtags.js",
  "./js/shared/shared-post-rendering.js",
  "./ATPROTO.md",
  "./ATPROTO.de.md",
  "./templates/archive-html-shell.html",
  "./templates/archive-html-fragments.html",
  "./templates/dm-html-shell.html",
  "./templates/dm-html-fragments.html",
  "./templates/dm-html.css",
  "./templates/dm-html-client.js",
  "./templates/archive-html-client.js",
  "./manifest.webmanifest",
  "./version.js",
  "./README.md",
  "./README.de.md",
  "./og-image.jpg",
  "./icons/threadline-og-workspaces.png",
  "./icons/icon.svg",
  "./icons/maskable-icon.svg",
  "./icons/kofi-button.svg",
];

const DB_NAME = "threadline-db";
const DB_VERSION = 2;
const STORE_NAME = "settings";
const COMPOSER_IMAGE_STORE_NAME = "composer-images";
const MAX_IMAGES_PER_SEGMENT = 10;
const AUTH_KEY = "auth";
const DRAFT_KEY = "draft";
const LOCALE_KEY = "locale";
const SETTINGS_KEY = "ui-settings";
const ARCHIVE_SESSION_KEY = "archive-session";
const ARCHIVE_CATALOG_KEY = "archive-catalog";
const MEDIA_EXPORT_SESSION_KEY = "media-export-session";
const DM_PARTNER_CACHE_KEY = "dm-partner-cache";
const ACCOUNT_AVATAR_CACHE_KEY = "account-avatar-cache";
const ACCOUNT_AVATAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_THREAD_REQUEST_TIMEOUT_MS = 15000;
const ARCHIVE_THREAD_REQUEST_RETRIES = 1;
const ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY = 4;
const MEDIA_EXPORT_HEARTBEAT_MS = 10000;
const MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS = 30000;
const THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS = 30000;
const THREAD_EXPLORER_MEDIA_HYDRATION_DIRECT_TIMEOUT_MS = 12000;
const THREAD_EXPLORER_MEDIA_CACHE_READ_TIMEOUT_MS = 1500;
const THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY = 16;
const THREAD_EXPLORER_MEDIA_HYDRATION_HEARTBEAT_MS = 5000;
const ANALYSIS_AUTHOR_FEED_PAGE_SIZE = 100;
const ANALYSIS_AUTHOR_FEED_MAX_PAGES = 200;
const ANALYSIS_GRAPH_PAGE_LIMIT = 100;
const ANALYSIS_GRAPH_MAX_PROFILES = 5000;
const ANALYSIS_PROFILE_RESOLVE_BATCH_SIZE = 25;
const API_BASE = "https://bsky.social/xrpc";
const DEFAULT_LOGIN_SERVICE = "https://bsky.social";
const MU_WEB_CLIENT = "https://mu.social";
const DEFAULT_POST_WEB_APP = "https://bsky.app";
const CHAT_PROXY_DID = "did:web:api.bsky.chat#bsky_chat";
const POST_WEB_FRONTENDS = {
  "bsky.social": "https://bsky.app",
  "bsky.app": "https://bsky.app",
  "eurosky.social": "https://mu.social",
  "mu.social": "https://mu.social",
};
const MENTION_SEARCH_HANDLE_SUFFIXES = [
  "bsky.social",
  "mu.social",
  "eurosky.social",
];

importScripts("./js/shared/profile-metadata.js");
importScripts("./js/worker/account-avatar-cache.js", "./js/worker/record-models.js", "./js/worker/adapter-messages.js", "./js/worker/transport-service.js", "./js/worker/auth-models.js", "./js/worker/storage-service.js", "./js/worker/identity-service.js", "./js/worker/session-service.js", "./js/worker/account-service.js", "./js/worker/network-data-service.js", "./js/worker/network-workspace-service.js", "./js/worker/composer-image-store.js", "./js/worker/composer-image-models.js", "./js/worker/explorer-models.js", "./js/worker/explorer-feed-models.js", "./js/worker/explorer-load-service.js", "./js/worker/explorer-hydration-service.js", "./js/worker/explorer-reaction-service.js", "./js/worker/media-export-models.js", "./js/worker/media-export-service.js", "./js/worker/richtext-models.js", "./js/worker/richtext-service.js", "./js/worker/settings-models.js", "./js/worker/settings-service.js", "./js/worker/reply-models.js", "./js/worker/post-check-service.js", "./js/worker/interaction-service.js", "./js/worker/publish-service.js", "./js/worker/archive-wave-controller.js", "./js/atproto/atproto-worker.js", "./js/worker/search-queries.js", "./js/worker/search-filters.js", "./js/worker/search-service.js", "./js/worker/dm-models.js", "./js/worker/dm-messages.js", "./js/worker/dm-service.js", "./js/worker/archive-run-messages.js", "./js/worker/archive-run-control.js", "./js/worker/archive-models.js", "./js/worker/archive-thread-service.js", "./js/worker/archive-source-service.js", "./js/worker/archive-wave-service.js", "./js/worker/archive-asset-service.js", "./js/worker/archive-import-service.js", "./js/worker/analysis-models.js", "./js/worker/analysis-messages.js", "./js/worker/analysis-service.js");
const {
  normalizeSearchWorkspaceMode,
  normalizeSearchWorkspaceSort,
  normalizeSearchWorkspaceTags,
  normalizeSearchWorkspaceTagMatchMode,
  normalizeSearchWorkspaceLanguages,
  buildSharedSearchQuery,
  parseExcludedSearchTerms,
  buildSearchWorkspaceSearchPostsParams,
  hasSearchWorkspaceServerQuery,
  shouldFallbackNetworkSearchToAuthorFeed,
  parseSearchWorkspaceSearchCursorState,
  buildSearchWorkspaceSearchCursorState,
  buildSearchWorkspaceSearchVariants,
  createSearchWorkspaceExcludeUriSet
} = globalThis.ThreadlineSearchQueries;
const workerAuthModels = globalThis.createThreadlineAuthModels({
  defaultService: DEFAULT_LOGIN_SERVICE, defaultWebApp: DEFAULT_POST_WEB_APP,
  inferWebApp: (...args) => inferAccountWebApp(...args), webBase: (...args) => resolvePostWebBase(...args),
  error: createServiceWorkerError, now: () => new Date().toISOString(), messages: globalThis.ThreadlineAdapterMessages,
});
const { service: normalizeServiceUrl, insecure: isInsecureServiceUrl, secure: assertSecureServiceUrl, account: normalizeAuthAccount,
  state: normalizeAuthState, publicMeta: getAccountPublicMeta, response: buildAuthResponse, upsert: upsertAccount } = workerAuthModels;
const workerReplyModels = globalThis.createThreadlineReplyModels({ messages: globalThis.ThreadlineAdapterMessages });
const workerSettingsModels = globalThis.createThreadlineSettingsModels({ site: normalizeStandardSiteMetadata, now: () => new Date().toISOString() });
const { card: normalizeLinkCard, cards: normalizeSegmentLinkCards, proxy: normalizeLinkCardProxySettings, provider: normalizeLinkCardProviderSetting, usage: normalizeLinkCardMicrolinkUsage, search: normalizeStoredSearchResultState, overrides: normalizeSegmentOverrides, history: normalizePostingHistory, reply: normalizeStoredReplyTarget, explorer: normalizeStoredThreadExplorerState, resize: normalizeImageAutoResizeMode, expert: normalizeArchiveExpertMode } = workerSettingsModels;
const workerRichTextEncoder = new TextEncoder();
const workerRichTextModels = globalThis.createThreadlineRichTextModels({ encode: value => workerRichTextEncoder.encode(value), suffixes: MENTION_SEARCH_HANDLE_SUFFIXES });
const { tags: parseHashtagFacets } = workerRichTextModels;
const workerExplorerFeedModels = globalThis.createThreadlineExplorerFeedModels({ messages: globalThis.ThreadlineAdapterMessages });
const { search: buildThreadExplorerSearchPostsParams } = workerExplorerFeedModels;
const workerExplorerModels = globalThis.createThreadlineExplorerModels({ site: normalizeStandardSiteMetadata });
const { actor: normalizeThreadExplorerActor, edit: normalizePostEditInfoFromRecord, post: normalizeThreadExplorerPost,
  root: normalizeThreadExplorerThreadRoot, merge: mergeThreadExplorerSelectedPath,
  contains: threadExplorerTreeContainsUri, count: countThreadExplorerTreePosts } = workerExplorerModels;
const workerComposerImageModels = globalThis.createThreadlineComposerImageModels({
  id: () => crypto.randomUUID(), maxImages: MAX_IMAGES_PER_SEGMENT,
});
const { edit: normalizeImageEdit, image: normalizeThreadImage, segments: normalizeSegmentImages,
  metadata: stripThreadImageData, metadataSegments: normalizeSegmentImageMetadata } = workerComposerImageModels;
const workerStorage = globalThis.createThreadlineStorageService({ indexedDB: () => indexedDB,
  databaseName: DB_NAME, databaseVersion: DB_VERSION, storeName: STORE_NAME, imageStoreName: COMPOSER_IMAGE_STORE_NAME, authKey: AUTH_KEY,
  authEncryptionKey: "auth-encryption-key", webCrypto: () => crypto,
  normalizeAuth: (value) => normalizeAuthState(value), messages: globalThis.ThreadlineAdapterMessages,
});
const archiveModels = globalThis.createThreadlineArchiveModels({
  normalizeTags: normalizeHashtagEntries, parseTag: parseHashtagValue, tagFacets: parseHashtagFacets,
  parseUri: parseAtUri, postUrl: buildPostWebUrl, site: normalizeStandardSiteMetadata,
  edit: normalizePostEditInfoFromRecord, maxImages: MAX_IMAGES_PER_SEGMENT,
});
const { normalize: normalizeArchiveFilters, tags: collectNormalizedHashtagsFromRecord, matchesHashtags: recordMatchesArchiveHashtags, matchesDate: postMatchesArchiveFilters } = archiveModels.filters;
const { root: getArchiveRootUri, parent: getArchiveParentUri, own: recordBelongsToOwnThread, main: recordBelongsToOwnMainThreadPath, select: postMatchesArchiveSelection, all: collectThreadViewPosts, path: collectThreadPathPosts, author: collectThreadAuthorPosts } = archiveModels.threads;
const { images: extractArchiveEmbedImages, videos: extractArchiveEmbedVideos, card: extractArchiveExternalCardFromRecord, build: buildArchivePostEntity, merge: mergeArchivePostEntity } = archiveModels.posts;
const archiveRunControl = globalThis.createThreadlineArchiveRunControl({
  delay: (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)),
  error: createServiceWorkerError, messages: globalThis.ThreadlineArchiveRunMessages,
});
const {
  control: setArchiveRunControl, wait: waitForArchiveRunControl, sleep: sleepForArchiveRun,
  retry: runArchiveRequestWithRetry, softPauseMs: getArchiveSoftPauseMs, pauseFeed: maybePauseArchiveFeedScan,
} = archiveRunControl;
const archiveThreadService = globalThis.createThreadlineArchiveThreadService({
  models: archiveModels, request: bskyGet, refresh: refreshAuthReference, base: authXrpcBase,
  wait: archiveRunControl.wait, abortController: () => new AbortController(),
  schedule: (callback, durationMs) => setTimeout(callback, durationMs), clearTimer: (timerId) => clearTimeout(timerId),
  timeoutMs: ARCHIVE_THREAD_REQUEST_TIMEOUT_MS, retries: ARCHIVE_THREAD_REQUEST_RETRIES,
  messages: globalThis.ThreadlineArchiveRunMessages,
});
const { rootMatches: rootPostMatchesArchiveHashtags, threadMatches: threadMatchesArchiveHashtags, mediaMatches: postMatchesMediaExportHashtagSelection, isMissing: isMissingArchivePostError, isTimeout: isArchiveThreadTimeoutError, requestThread: archiveGetPostThread, expandContexts: expandArchiveConversationContexts } = archiveThreadService;
const archiveSourceService = globalThis.createThreadlineArchiveSourceService({ request: bskyGet, base: authXrpcBase });
const { resolve: resolveArchiveSourceActor } = archiveSourceService;
// Late-bound transport/auth adapters keep the worker entry responsible for account state.
const archiveWaveService = globalThis.createThreadlineArchiveWaveService({
  request: (...args) => bskyGet(...args), refresh: (auth) => refreshAuthReference(auth), base: authXrpcBase,
  retry: archiveRunControl.retry, wait: archiveRunControl.wait, chunk: chunkEntries,
  select: postMatchesArchiveSelection, hashtag: postMatchesMediaExportHashtagSelection,
  messages: globalThis.ThreadlineArchiveRunMessages,
});
const archiveAssetService = globalThis.createThreadlineArchiveAssetService({
  download: downloadRemoteAssetViaBlob, normalize: normalizeArchiveImageBlob, extension: getAssetExtensionFromMimeType,
  map: mapWithConcurrency, concurrency: ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, messages: globalThis.ThreadlineArchiveRunMessages,
  blob: (...args) => downloadBlobForDid(...args), cid: getBlobCidFromRef, images: extractArchiveEmbedImages, wait: archiveRunControl.wait,
  publicUrl: (...args) => buildPublicBlobUrlForDid(...args), dataUrl: bytesToDataUrl,
  delay: (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)),
});
const { attachAvatars: attachArchiveAvatarAssets } = archiveAssetService;
const archiveImportService = globalThis.createThreadlineArchiveImportService({
  session: () => ensureSession(), parse: parseArchiveThreadSource, resolve: (...args) => resolveHandleToDid(...args),
  request: (...args) => bskyGet(...args), base: authXrpcBase, models: archiveModels, assets: archiveAssetService,
  control: archiveRunControl, messages: globalThis.ThreadlineArchiveRunMessages, now: () => new Date().toISOString(), appVersion: APP_VERSION,
});
const { load: importArchiveThreadFromUrl } = archiveImportService;
const dmModels = globalThis.createThreadlineDmModels({ randomUUID: () => crypto.randomUUID() });
const { normalizeDmDateFilterValue, normalizeDmFilters, normalizeDmConversationEntity, collectDmEmbeds, collectDmFacets, extractDmExternalCardFromEmbedSw, normalizeDmMessageEntity } = dmModels;
const dmService = globalThis.createThreadlineDmService({
  models: dmModels, session: ensureSession, chat: chatBskyGet, request: bskyGet, base: authXrpcBase,
  accountAvatar: fetchAccountAvatar, profileRecord: fetchProfileRecordForDid,
  remoteAsset: downloadRemoteAssetViaBlob, blob: downloadBlobForDid,
  cid: getBlobCidFromRef, extension: getAssetExtensionFromMimeType,
  now: () => new Date().toISOString(), randomUUID: () => crypto.randomUUID(), appVersion: APP_VERSION,
  text: globalThis.formatThreadlineDmMessage,
});
const { exportArchive: exportDmArchive, checkAccess: checkDmAccess, listPartners: listDmPartners, hydrateAvatars: hydrateDmPartnerAvatars } = dmService;
const analysisModels = globalThis.createThreadlineAnalysisModels({ parseUri: parseAtUri });
const { facets: extractAnalysisRecordFacets, storedState: normalizeStoredAnalysisState } = analysisModels;
const analysisService = globalThis.createThreadlineAnalysisService({
  models: analysisModels, session: (...args) => ensureSession(...args), readAuth: () => readStoredAuth(),
  request: (...args) => bskyGet(...args), base: authXrpcBase, resolve: (...args) => resolveHandleToDid(...args),
  profile: normalizeNetworkProfile, graphPage: (...args) => collectGraphPage(...args), error: createServiceWorkerError,
  now: () => Date.now(), messages: globalThis.ThreadlineAnalysisMessages,
  limits: { feedPageSize: ANALYSIS_AUTHOR_FEED_PAGE_SIZE, feedMaxPages: ANALYSIS_AUTHOR_FEED_MAX_PAGES,
    graphPageLimit: ANALYSIS_GRAPH_PAGE_LIMIT, graphMaxProfiles: ANALYSIS_GRAPH_MAX_PROFILES, profileBatchSize: ANALYSIS_PROFILE_RESOLVE_BATCH_SIZE },
});
const { check: checkAnalysisAccount, load: loadAnalysisAccount, graph: collectEntireGraph } = analysisService;
const searchFilters = globalThis.createThreadlineSearchFilters({ queries: globalThis.ThreadlineSearchQueries, facets: extractAnalysisRecordFacets, post: normalizeThreadExplorerPost });
const searchService = globalThis.createThreadlineSearchService({ queries: globalThis.ThreadlineSearchQueries, filters: searchFilters, request: bskyGet, base: authXrpcBase, session: ensureSession, refresh: refreshAuthReference });
const { load: loadSearchResults, control: setSearchRunControl } = searchService;

function normalizePostLanguageTags(...args) { return globalThis.ThreadlineRecordModels.normalizePostLanguageTags(...args); }

function normalizePostInteractionSettings(...args) { return globalThis.ThreadlineRecordModels.normalizePostInteractionSettings(...args); }

function extractRecordKeyFromAtUri(...args) { return globalThis.ThreadlineRecordModels.extractRecordKeyFromAtUri(...args); }

/**
 * Splits one AT URI into repo, collection, and record key.
 * @param {string} uri - Full `at://` URI.
 * @returns {object|null} Parsed AT URI parts, or null when the input is invalid.
 */
function parseAtUriParts(...args) { return globalThis.ThreadlineRecordModels.parseAtUriParts(...args); }

function buildThreadGateAllowRules(...args) { return globalThis.ThreadlineRecordModels.buildThreadGateAllowRules(...args); }

function parseHashtagValue(...args) { return globalThis.ThreadlineRecordModels.parseHashtagValue(...args); }

function normalizeHashtagEntries(...args) { return globalThis.ThreadlineRecordModels.normalizeHashtagEntries(...args); }

function normalizeSelectedHashtagEntries(...args) { return globalThis.ThreadlineRecordModels.normalizeSelectedHashtagEntries(...args); }

/**
 * Normalizes Standard.site publication metadata attached to a link card.
 * @param {object|null} value - Raw metadata from a proxy response or saved archive.
 * @returns {object|null} Compact Standard.site metadata, or null when absent.
 */
function normalizeStandardSiteMetadata(...args) { return globalThis.ThreadlineRecordModels.normalizeStandardSiteMetadata(...args); }

/**
 * Normalizes one composer link card for persistence and posting.
 * @param {object|null} card - Raw link-card data from settings or the proxy.
 * @returns {object|null} Normalized link-card data, or null when invalid.
 */
async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function blobToDataUrl(blob) {
  if (typeof FileReader === "function") {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Blob konnte nicht gelesen werden."));
      reader.readAsDataURL(blob);
    });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
}

let workerRichTextService = null;
/** Wires rich-text workflows after worker dependencies initialize. @returns {object} Service. */
function getWorkerRichTextService() {
  if (!workerRichTextService) {
    workerRichTextService = globalThis.createThreadlineRichTextService({
      session: ensureSession, resolve: resolveHandleToDid, request: bskyGet, base: authXrpcBase,
      profile: normalizeNetworkProfile, models: workerRichTextModels,
    });
  }
  return workerRichTextService;
}
/** Builds post facets. @param {...unknown} args - Text, auth and shared cache. @returns {Promise<object>} Facets/unresolved handles. */
function buildRichTextFacets(...args) { return getWorkerRichTextService().build(...args); }
/** Resolves preview handles. @param {object} payload - Handles. @returns {Promise<object>} Resolved mentions. */
function resolveComposerMentions(payload) { return getWorkerRichTextService().resolve(payload); }
/** Searches mention accounts. @param {object} payload - Query. @returns {Promise<object>} Ranked actors. */
function searchMentionActors(payload) { return getWorkerRichTextService().search(payload); }

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== REMOTE_MEDIA_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET") {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    if (event.request.destination === "image") {
      event.respondWith(
        caches.open(REMOTE_MEDIA_CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const networkResponse = await fetch(event.request);
          if (networkResponse.ok || networkResponse.type === "opaque") {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        }),
      );
    }
    return;
  }

  if (requestUrl.pathname.endsWith("/version.js")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./version.js"))),
    );
    return;
  }

  if (requestUrl.pathname.endsWith("/README.md") || requestUrl.pathname.endsWith("/README.de.md")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./README.md"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        return networkResponse;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  const port = event.ports?.[0];

  if (!port) {
    return;
  }

  handleMessage(event.data, port)
    .then((result) => port.postMessage({ ok: true, result }))
    .catch((error) => {
      if (!isExpectedServiceWorkerUiError(error)) {
        console.error(error);
      }
      port.postMessage({
        ok: false,
        error: error.message || "Unbekannter Fehler.",
        details: error.details || null,
      });
    });
});

async function handleMessage(message, port) {
  switch (message.type) {
    case "LOGIN":
      return login(message.payload);
    case "AUTH_STATUS":
      return authStatus();
    case "GET_APP_STATE":
      return getAppState(message.payload);
    case "VERIFY_SESSION":
      return verifySession();
    case "CHECK_CONNECTIVITY":
      return checkConnectivity();
    case "SAVE_DRAFT":
      return saveDraft(message.payload);
    case "SAVE_SETTINGS":
      return saveSettings(message.payload);
    case "GET_ARCHIVE_SESSION":
      return getArchiveSession();
    case "GET_ARCHIVE_CATALOG":
      return getArchiveCatalog();
    case "GET_MEDIA_EXPORT_SESSION":
      return getMediaExportSession();
    case "GET_DM_PARTNER_CACHE":
      return getDmPartnerCache();
    case "GET_ACCOUNT_AVATAR_CACHE":
      return getAccountAvatarCache();
    case "SAVE_ARCHIVE_SESSION":
      return saveArchiveSession(message.payload);
    case "SAVE_ARCHIVE_CATALOG":
      return saveArchiveCatalog(message.payload);
    case "SAVE_MEDIA_EXPORT_SESSION":
      return saveMediaExportSession(message.payload);
    case "SAVE_DM_PARTNER_CACHE":
      return saveDmPartnerCache(message.payload);
    case "SAVE_ACCOUNT_AVATAR_CACHE":
      return saveAccountAvatarCache(message.payload);
    case "CLEAR_ARCHIVE_SESSION":
      return clearArchiveSession();
    case "CLEAR_ARCHIVE_CATALOG":
      return clearArchiveCatalog();
    case "CLEAR_MEDIA_EXPORT_SESSION":
      return clearMediaExportSession();
    case "CLEAR_DM_PARTNER_CACHE":
      return clearDmPartnerCache();
    case "SET_ARCHIVE_RUN_CONTROL":
      return setArchiveRunControl(message.payload);
    case "SET_SEARCH_RUN_CONTROL":
      return setSearchRunControl(message.payload);
    case "SWITCH_ACCOUNT":
      return switchAccount(message.payload);
    case "IMPORT_ACCOUNT_METADATA":
      return importAccountMetadata(message.payload);
    case "REMOVE_ACCOUNT":
      return removeAccount(message.payload);
    case "LOGOUT":
      return logout();
    case "RESOLVE_COMPOSER_MENTIONS":
      return resolveComposerMentions(message.payload);
    case "SEARCH_MENTION_ACTORS":
      return searchMentionActors(message.payload);
    case "LIKE_POST":
      return likePost(message.payload);
    case "UNLIKE_POST":
      return unlikePost(message.payload);
    case "PUBLISH_THREAD":
      return publishThread(message.payload, (progress) => port.postMessage({ progress }));
    case "EXPORT_ACCOUNT_ARCHIVE_WAVE":
      return exportAccountArchiveWave(message.payload, (progress) => port.postMessage({ progress }));
    case "IMPORT_ARCHIVE_THREAD_FROM_URL":
      return importArchiveThreadFromUrl(message.payload, (progress) => port.postMessage({ progress }));
    case "CHECK_POST_EDIT":
      return checkPostEditMetadata(message.payload);
    case "CHECK_REPLY_TARGET":
      return checkReplyTarget(message.payload);
    case "CHECK_DM_ACCESS":
      return checkDmAccess();
    case "LOAD_NETWORK_SLICE":
      return loadNetworkSlice(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_NETWORK_ACTOR_FOCUS":
      return loadNetworkActorFocus(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_NETWORK_COMMON_MUTUALS":
      return loadNetworkCommonMutuals(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_THREAD_EXPLORER_FEED":
      return loadThreadExplorerFeed(message.payload);
    case "LOAD_SEARCH_RESULTS":
      return loadSearchResults(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_THREAD_EXPLORER_FEED_SOURCES":
      return loadThreadExplorerFeedSources();
    case "LOAD_THREAD_EXPLORER_ACTOR_FEED":
      return loadThreadExplorerActorFeed(message.payload);
    case "RESOLVE_THREAD_EXPLORER_POST_URL":
      return resolveThreadExplorerPostUrl(message.payload);
    case "LOAD_THREAD_EXPLORER_THREAD":
      return loadThreadExplorerThread(message.payload);
    case "HYDRATE_THREAD_EXPLORER_AVATARS":
      return hydrateThreadExplorerAvatars(message.payload, (progress) => port.postMessage({ progress }));
    case "HYDRATE_THREAD_EXPLORER_MEDIA":
      return hydrateThreadExplorerMedia(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_THREAD_EXPLORER_REACTIONS":
      return loadThreadExplorerReactions(message.payload);
    case "CHECK_ANALYSIS_ACCOUNT":
      return checkAnalysisAccount(message.payload);
    case "LOAD_ANALYSIS_ACCOUNT":
      return loadAnalysisAccount(message.payload, (progress) => port.postMessage({ progress }));
    case "SCAN_ACCOUNT_MEDIA_EXPORT":
      return scanAccountMediaExport(message.payload, (progress) => port.postMessage({ progress }));
    case "DOWNLOAD_ACCOUNT_MEDIA_ASSET":
      return downloadAccountMediaAsset(message.payload, (progress) => port.postMessage({ progress }));
    case "DOWNLOAD_ARCHIVE_AVATAR":
      // Public avatar blobs remain downloadable when exporting an imported archive without a session.
      return downloadRemoteAssetViaBlob({ service: DEFAULT_LOGIN_SERVICE }, message.payload.url, "", new Map(), { timeoutMs: 30000 });
    case "LIST_DM_PARTNERS":
      return listDmPartners(message.payload, (progress) => port.postMessage({ progress }));
    case "HYDRATE_DM_PARTNER_AVATARS":
      return hydrateDmPartnerAvatars(message.payload, (progress) => port.postMessage({ progress }));
    case "EXPORT_DM_ARCHIVE":
      return exportDmArchive(message.payload, (progress) => port.postMessage({ progress }));
    default:
      throw new Error("Unbekannter Service-Worker-Befehl.");
  }
}

function createServiceWorkerError(message, code, details = {}) {
  const error = new Error(message);
  error.details = {
    ...details,
    code,
  };
  return error;
}

/**
 * Checks whether a Service Worker error is an expected UI validation outcome.
 * @param {Error|null} error - Error that would otherwise be logged.
 * @returns {boolean} True when the error should be shown in UI only.
 */
function isExpectedServiceWorkerUiError(error = null) {
  const code = String(error?.details?.code || "").trim();
  return code === "ANALYSIS_ACCOUNT_MISSING"
    || code === "ANALYSIS_ACCOUNT_NOT_FOUND"
    || code === "THREAD_EXPLORER_ACCOUNT_MISSING"
    || code === "THREAD_EXPLORER_ACCOUNT_NOT_FOUND";
}

/**
 * Reads rate-limit headers from a server response when available.
 * @param {Response} response - HTTP response returned by the fetch call.
 * @returns {object|null} Parsed rate-limit metadata, or null when no headers were present.
 */
function extractRateLimitMeta(response) { return getAtprotoTransport().rateLimit(response); }

/** Opens the existing worker database. @returns {Promise<IDBDatabase>} Database connection. */
function openDatabase() {
  return workerStorage.open();
}


/** Reads normalized auth through the shared store. @returns {Promise<object>} Auth state. */
async function readStoredAuth() {
  return workerStorage.readAuth();
}

/** Writes normalized auth. @param {unknown} value - Auth input. @returns {Promise<object>} Stored auth state. */
async function writeStoredAuth(value) {
  return workerStorage.writeAuth(value);
}

/** Clears only the auth key. @returns {Promise<void>} Delete completion. */
async function clearStoredAuth() {
  return workerStorage.clearAuth();
}

/** Reads a general stored value. @param {string} key - Key. @returns {Promise<unknown>} Value or null. */
async function readStoredValue(key) {
  return workerStorage.read(key);
}

/** Writes a general value. @param {string} key - Key. @param {unknown} value - Stored value. @returns {Promise<unknown>} Original value. */
async function writeStoredValue(key, value) {
  return workerStorage.write(key, value);
}

let workerComposerImageStore = null;
/** Wires Composer image persistence after storage and normalizers initialize. @returns {object} Image store. */
function getWorkerComposerImageStore() {
  if (!workerComposerImageStore) {
    workerComposerImageStore = globalThis.createThreadlineComposerImageStore({
      open: openDatabase, normalizeSegments: normalizeSegmentImages, normalizeMetadata: normalizeSegmentImageMetadata,
      normalizeImage: normalizeThreadImage, toBlob: dataUrlToBlob, toDataUrl: blobToDataUrl, readValue: readStoredValue,
      blob: Blob, now: () => new Date().toISOString(), storeName: COMPOSER_IMAGE_STORE_NAME,
      draftKey: DRAFT_KEY, settingsKey: SETTINGS_KEY, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerComposerImageStore;
}
/** Delegates Composer image persistence. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function storeComposerImageBlobs(...args) { return getWorkerComposerImageStore().store(...args); }

/** Delegates Composer image persistence. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function hydrateStoredSegmentImages(...args) { return getWorkerComposerImageStore().hydrate(...args); }

/** Delegates Composer image persistence. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function pruneComposerImageBlobs(...args) { return getWorkerComposerImageStore().prune(...args); }

/** Decodes a JWT through the session service. @param {string} jwt - Token. @returns {object|null} Payload. */
function decodeJwtPayload(jwt) { return getAtprotoSession().decode(jwt); }

/** Checks JWT validity through the session service. @param {string} accessJwt - Token. @returns {boolean} Existing expiry result. */
function isJwtValid(accessJwt) { return getAtprotoSession().valid(accessJwt); }

function normalizeNetworkProfile(...args) { return globalThis.ThreadlineRecordModels.normalizeNetworkProfile(...args); }

let workerExplorerLoadService = null;
/** Wires Explorer loading after worker dependencies initialize. @returns {object} Load service. */
function getWorkerExplorerLoadService() {
  if (!workerExplorerLoadService) {
    workerExplorerLoadService = globalThis.createThreadlineExplorerLoadService({
      session: ensureSession, refresh: refreshAuthReference, request: bskyGet, base: authXrpcBase,
      resolve: resolveHandleToDid, parseSource: parseArchiveThreadSource, graphPage: collectGraphPage,
      error: createServiceWorkerError, feedModels: workerExplorerFeedModels, postModels: workerExplorerModels,
      messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerExplorerLoadService;
}
/** Delegates Explorer loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Load result. */
function loadThreadExplorerFeedSources(...args) { return getWorkerExplorerLoadService().sources(...args); }

/** Delegates Explorer loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Load result. */
function loadThreadExplorerActorFeed(...args) { return getWorkerExplorerLoadService().actorFeed(...args); }

/** Delegates Explorer loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Load result. */
function loadThreadExplorerFeed(...args) { return getWorkerExplorerLoadService().feed(...args); }

/** Delegates Explorer loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Load result. */
function resolveThreadExplorerPostUrl(...args) { return getWorkerExplorerLoadService().resolve(...args); }

/** Delegates Explorer loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Load result. */
function loadThreadExplorerThread(...args) { return getWorkerExplorerLoadService().thread(...args); }

/**
 * Converts an avatar cache asset into a browser-ready data URI.
 * @param {object} asset - Cached avatar asset.
 * @returns {string} Data URI for the cached avatar.
 */
function accountAvatarAssetToDataUri(asset = {}) {
  const type = String(asset.type || "image/jpeg").trim() || "image/jpeg";
  return bytesToDataUrl(asset.bytes, type);
}

let workerExplorerHydrationService = null;
/** Wires Explorer hydration after worker dependencies initialize. @returns {object} Hydration service. */
function getWorkerExplorerHydrationService() {
  if (!workerExplorerHydrationService) {
    workerExplorerHydrationService = globalThis.createThreadlineExplorerHydrationService({
      session: ensureSession, refresh: refreshAuthReference, pruneAvatars: pruneAccountAvatarCache,
      readAvatars: getAccountAvatarCache, normalizeAvatars: normalizeAccountAvatarAssets, writeValue: writeStoredValue,
      openCache: name => caches.open(name), response: (bytes, settings) => new Response(bytes, settings),
      downloadBlob: downloadRemoteAssetViaBlob, downloadDirect: downloadRemoteAsset, parseBlob: parseBlobUrlInfo,
      normalizeBlob: normalizeArchiveImageBlob, extension: getAssetExtensionFromMimeType, dataUrl: bytesToDataUrl,
      concurrent: mapWithConcurrency, now: () => Date.now(), iso: value => new Date(value).toISOString(),
      schedule: (callback, ms) => setTimeout(callback, ms), clearTimer: id => clearTimeout(id),
      repeat: (callback, ms) => setInterval(callback, ms), stopRepeat: id => clearInterval(id),
      models: workerExplorerModels, cacheName: REMOTE_MEDIA_CACHE_NAME, avatarKey: ACCOUNT_AVATAR_CACHE_KEY,
      limits: { cacheReadMs: THREAD_EXPLORER_MEDIA_CACHE_READ_TIMEOUT_MS, itemMs: THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
        directMs: THREAD_EXPLORER_MEDIA_HYDRATION_DIRECT_TIMEOUT_MS, heartbeatMs: THREAD_EXPLORER_MEDIA_HYDRATION_HEARTBEAT_MS,
        mediaConcurrency: THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY, avatarConcurrency: ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY,
        avatarTtlMs: ACCOUNT_AVATAR_CACHE_TTL_MS }, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerExplorerHydrationService;
}
/** Delegates Explorer hydration. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function hydrateThreadExplorerAvatars(...args) { return getWorkerExplorerHydrationService().avatars(...args); }

/** Delegates Explorer hydration. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function hydrateThreadExplorerMedia(...args) { return getWorkerExplorerHydrationService().media(...args); }

/** Delegates Explorer hydration. @param {...unknown} args - Existing arguments. @returns {Promise<unknown>} Operation result. */
function withThreadExplorerMediaHydrationTimeout(...args) { return getWorkerExplorerHydrationService().timeout(...args); }

let workerExplorerReactionService = null;
/** Wires reaction loading after worker dependencies initialize. @returns {object} Reaction service. */
function getWorkerExplorerReactionService() {
  if (!workerExplorerReactionService) {
    workerExplorerReactionService = globalThis.createThreadlineExplorerReactionService({
      session: ensureSession, refresh: refreshAuthReference, request: bskyGet, base: authXrpcBase,
      actor: normalizeThreadExplorerActor, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerExplorerReactionService;
}
/** Delegates reaction loading. @param {object} payload - Reaction type, URI, CID and limit. @returns {Promise<object>} Actors and cursor. */
function loadThreadExplorerReactions(payload) { return getWorkerExplorerReactionService().load(payload); }

const NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT = 100;
const NETWORK_ACTIVITY_SAMPLE_POSTS = 200;
const NETWORK_ACTIVITY_WINDOWS_DAYS = [14, 60];

let workerNetworkDataService = null;
/** Wires shared network data operations after worker dependencies initialize. @returns {object} Network data service. */
function getWorkerNetworkDataService() {
  if (!workerNetworkDataService) {
    workerNetworkDataService = globalThis.createThreadlineNetworkDataService({
      request: bskyGet, base: authXrpcBase, profile: normalizeNetworkProfile, parseUri: parseAtUri, now: () => Date.now(),
      limits: { likeSample: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT, activitySample: NETWORK_ACTIVITY_SAMPLE_POSTS },
      windows: NETWORK_ACTIVITY_WINDOWS_DAYS, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerNetworkDataService;
}
/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectRecentAuthorPosts(...args) { return getWorkerNetworkDataService().posts(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function countRecentLikesFromActorOnPosts(...args) { return getWorkerNetworkDataService().likesOnPosts(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectNetworkActivityStats(...args) { return getWorkerNetworkDataService().activityStats(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectNetworkLikeStats(...args) { return getWorkerNetworkDataService().likes(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectNetworkActivityForActor(...args) { return getWorkerNetworkDataService().activity(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectGraphPage(...args) { return getWorkerNetworkDataService().page(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function collectGraphWave(...args) { return getWorkerNetworkDataService().wave(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function getRelationshipRecordCreatedAt(...args) { return getWorkerNetworkDataService().recordDate(...args); }

/** Delegates shared network data access. @param {...unknown} args - Existing operation arguments. @returns {unknown} Operation result. */
function loadNetworkRelationshipDates(...args) { return getWorkerNetworkDataService().dates(...args); }

let workerNetworkWorkspaceService = null;
/** Wires network workspace operations after worker dependencies initialize. @returns {object} Workspace service. */
function getWorkerNetworkWorkspaceService() {
  if (!workerNetworkWorkspaceService) {
    workerNetworkWorkspaceService = globalThis.createThreadlineNetworkWorkspaceService({
      session: ensureSession, request: bskyGet, base: authXrpcBase, profile: normalizeNetworkProfile,
      wave: collectGraphWave, page: collectGraphPage, graph: collectEntireGraph, dates: loadNetworkRelationshipDates,
      activity: collectNetworkActivityForActor, likes: collectNetworkLikeStats,
      limits: { activitySample: NETWORK_ACTIVITY_SAMPLE_POSTS, likeSample: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT },
      messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerNetworkWorkspaceService;
}
/** Delegates network workspace loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Workspace response. */
function loadNetworkSlice(...args) { return getWorkerNetworkWorkspaceService().slice(...args); }

/** Delegates network workspace loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Workspace response. */
function loadNetworkActorFocus(...args) { return getWorkerNetworkWorkspaceService().focus(...args); }

/** Delegates network workspace loading. @param {...unknown} args - Existing arguments. @returns {Promise<object>} Workspace response. */
function loadNetworkCommonMutuals(...args) { return getWorkerNetworkWorkspaceService().mutuals(...args); }

function authStatus() { return getWorkerAccountService().status(); }

let workerSettingsService = null;
/** Wires persisted app-state workflows after dependencies initialize. @returns {object} Settings service. */
function getWorkerSettingsService() {
  if (!workerSettingsService) {
    workerSettingsService = globalThis.createThreadlineSettingsService({
      readAuth: readStoredAuth,
      readAvatars: getAccountAvatarCache,
      read: readStoredValue,
      write: writeStoredValue,
      hydrate: hydrateStoredSegmentImages,
      storeImages: storeComposerImageBlobs,
      pruneImages: pruneComposerImageBlobs,
      imageSegments: normalizeSegmentImages,
      imageMetadata: normalizeSegmentImageMetadata,
      tags: normalizeHashtagEntries,
      selectedTags: normalizeSelectedHashtagEntries,
      languages: normalizePostLanguageTags,
      interaction: normalizePostInteractionSettings,
      analysis: normalizeStoredAnalysisState,
      avatarAssets: normalizeAccountAvatarAssets,
      publicMeta: getAccountPublicMeta,
      webBase: resolvePostWebBase,
      models: workerSettingsModels, defaultService: DEFAULT_LOGIN_SERVICE,
      draftKey: DRAFT_KEY, settingsKey: SETTINGS_KEY, localeKey: LOCALE_KEY,
    });
  }
  return workerSettingsService;
}
/** Delegates stored app-state operation. @param {object} input - Existing payload. @returns {Promise<object>} Result. */
function getAppState(input) { return getWorkerSettingsService().load(input); }

/** Delegates stored app-state operation. @param {object} input - Existing payload. @returns {Promise<object>} Result. */
function saveDraft(input) { return getWorkerSettingsService().draft(input); }

/** Delegates stored app-state operation. @param {object} input - Existing payload. @returns {Promise<object>} Result. */
function saveSettings(input) { return getWorkerSettingsService().settings(input); }

async function getArchiveSession() {
  return await readStoredValue(ARCHIVE_SESSION_KEY) || null;
}

async function getArchiveCatalog() {
  return await readStoredValue(ARCHIVE_CATALOG_KEY) || null;
}

/**
 * Reads the persisted media-export resume session.
 * @returns {Promise<object|null>} Saved media-export session or null.
 */
async function getMediaExportSession() {
  return await readStoredValue(MEDIA_EXPORT_SESSION_KEY) || null;
}

async function getDmPartnerCache() {
  return await readStoredValue(DM_PARTNER_CACHE_KEY) || null;
}

/**
 * Reads the shared account-avatar cache without rewriting it on every lookup.
 * @returns {Promise<object>} Pruned avatar cache.
 */
async function getAccountAvatarCache() {
  const storedCache = await readStoredValue(ACCOUNT_AVATAR_CACHE_KEY) || null;
  return pruneAccountAvatarCache(storedCache);
}

async function saveArchiveSession({ session } = {}) {
  await writeStoredValue(ARCHIVE_SESSION_KEY, session || null);
  return { ok: true };
}

async function saveArchiveCatalog({ catalog } = {}) {
  await writeStoredValue(ARCHIVE_CATALOG_KEY, catalog || null);
  return { ok: true };
}

/**
 * Persists the media-export resume session.
 * @param {object} payload - Wrapper object containing the media-export session.
 * @param {object|null} payload.session - Session state to persist.
 * @returns {Promise<object>} Result object for the caller.
 */
async function saveMediaExportSession({ session } = {}) {
  await writeStoredValue(MEDIA_EXPORT_SESSION_KEY, session || null);
  return { ok: true };
}

async function saveDmPartnerCache({ cache } = {}) {
  await writeStoredValue(DM_PARTNER_CACHE_KEY, cache || null);
  return { ok: true };
}

async function saveAccountAvatarCache({ cache } = {}) {
  await writeStoredValue(ACCOUNT_AVATAR_CACHE_KEY, pruneAccountAvatarCache(cache || null));
  return { ok: true };
}

async function clearArchiveSession() {
  await writeStoredValue(ARCHIVE_SESSION_KEY, null);
  return { ok: true };
}

async function clearArchiveCatalog() {
  await writeStoredValue(ARCHIVE_CATALOG_KEY, null);
  return { ok: true };
}

/**
 * Clears the persisted media-export resume session.
 * @returns {Promise<object>} Result object for the caller.
 */
async function clearMediaExportSession() {
  await writeStoredValue(MEDIA_EXPORT_SESSION_KEY, null);
  return { ok: true };
}

async function clearDmPartnerCache() {
  await writeStoredValue(DM_PARTNER_CACHE_KEY, null);
  return { ok: true };
}

let workerAccountAvatarCacheService = null;
/** Wires the account-avatar cache native adapters. @returns {object} Cache service. */
function getWorkerAccountAvatarCacheService() {
  if (!workerAccountAvatarCacheService) { workerAccountAvatarCacheService = globalThis.createThreadlineAccountAvatarCache({
    download: (...args) => downloadRemoteAssetViaBlob(...args), extension: getAssetExtensionFromMimeType, now: () => Date.now(), ttlMs: ACCOUNT_AVATAR_CACHE_TTL_MS }); }
  return workerAccountAvatarCacheService;
}
function normalizeAccountAvatarAssets(...args) { return getWorkerAccountAvatarCacheService().normalize(...args); }

/**
 * Removes expired account-avatar assets from the shared avatar cache.
 * @param {object|null} cache - Raw persisted avatar cache.
 * @param {number} now - Current epoch milliseconds.
 * @returns {object} Pruned cache with normalized assets.
 */
function pruneAccountAvatarCache(...args) { return getWorkerAccountAvatarCacheService().prune(...args); }

function cacheStoredAccountAvatar(...args) { return getWorkerAccountAvatarCacheService().cache(...args); }

let workerAccountService = null;
/** Lazily wires stored-account lifecycle dependencies. @returns {object} Account service. */
function getWorkerAccountService() {
  if (!workerAccountService) {
    workerAccountService = globalThis.createThreadlineAccountService({
      readAuth: readStoredAuth, writeAuth: writeStoredAuth, clearAuth: clearStoredAuth, ensure: ensureSession,
      upsert: upsertAccount, response: buildAuthResponse, publicMeta: getAccountPublicMeta, webBase: resolvePostWebBase,
      clearArchiveSession, clearArchiveCatalog, now: () => new Date().toISOString(),
      defaultService: DEFAULT_LOGIN_SERVICE, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerAccountService;
}
/** Delegates account lifecycle behavior. @param {object} input - Operation input. @returns {Promise<object>} Public response. */
async function switchAccount(input) { return getWorkerAccountService().switch(input); }

/** Delegates account lifecycle behavior. @param {object} input - Operation input. @returns {Promise<object>} Public response. */
async function importAccountMetadata(input) { return getWorkerAccountService().import(input); }

/** Delegates account lifecycle behavior. @param {object} input - Operation input. @returns {Promise<object>} Public response. */
async function removeAccount(input) { return getWorkerAccountService().remove(input); }

/** Delegates account lifecycle behavior. @param {object} input - Operation input. @returns {Promise<object>} Public response. */
async function logout(input) { return getWorkerAccountService().logout(input); }

/** Delegates account lifecycle behavior. @param {object} input - Operation input. @returns {Promise<object>} Public response. */
async function verifySession(input) { return getWorkerAccountService().verify(input); }

function getAssetExtensionFromMimeType(...args) { return globalThis.ThreadlineRecordModels.getAssetExtensionFromMimeType(...args); }

const ARCHIVE_SAFE_IMAGE_PLACEHOLDER_MIME_TYPE = "image/png";
const ARCHIVE_SAFE_IMAGE_PLACEHOLDER_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAGAAAABICAYAAAAJZ/BjAAAAvUlEQVR4nO3XMRUCQRAFwVWEHNwgBj/EKLn8yJDA3NIVdD7vVzTr/bydmmtNH1DvC3AeL/0wAADaAQDQDgCAdgAAtAMAoB0AAO0AAGgHoAbwuK+tAgAAAAAAAAAAAAAAAAAAAAAAAABgWwABuFQAALQDAKAdAADtAPwLwPTHOh0AAPMjAAgHAMD8CADCAQAwPwKAcADqAAKwZQAAtAMAoB0AAO0AAGgHAEA7AADaAQDQDgCAdgCuBqCZAAz3AYEOqDkEidkXAAAAAElFTkSuQmCC";

/**
 * Decodes a base64 string into a Uint8Array.
 * @param {string} value Base64-encoded string.
 * @returns {Uint8Array} Decoded bytes.
 */
function decodeBase64ToBytes(value = "") {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Checks whether a MIME type points to an SVG image.
 * @param {string} mimeType MIME type to inspect.
 * @returns {boolean} True when the type represents SVG.
 */


/**
 * Replaces SVG archive assets with a small PNG placeholder for safer offline archives.
 * @param {{ type?: string, bytes?: Uint8Array }} blob Downloaded blob descriptor.
 * @returns {{ type: string, bytes: Uint8Array, replacedSvg: boolean }} Safe archive blob descriptor.
 */
function normalizeArchiveImageBlob(blob) { return globalThis.ThreadlineRecordModels.normalizeArchiveImageBlob(blob, { type: ARCHIVE_SAFE_IMAGE_PLACEHOLDER_MIME_TYPE, base64: ARCHIVE_SAFE_IMAGE_PLACEHOLDER_BASE64 }, decodeBase64ToBytes); }

async function downloadRemoteAsset(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw createServiceWorkerError(
      `Archive asset could not be loaded (${response.status}).`,
      "ARCHIVE_ASSET_LOAD_FAILED",
      { status: response.status },
    );
  }
  return {
    type: response.headers.get("content-type") || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

let workerMediaExportModels = null;
/** Wires existing archive embed adapters into media-export models. @returns {object} Models. */
function getWorkerMediaExportModels() {
  if (!workerMediaExportModels) {
    workerMediaExportModels = globalThis.createThreadlineMediaExportModels({
      images: extractArchiveEmbedImages, videos: extractArchiveEmbedVideos,
      card: extractArchiveExternalCardFromRecord, cid: getBlobCidFromRef,
    });
  }
  return workerMediaExportModels;
}
let workerMediaExportService = null;
/** Wires media-export workflows after archive adapters initialize. @returns {object} Service. */
function getWorkerMediaExportService() {
  if (!workerMediaExportService) {
    workerMediaExportService = globalThis.createThreadlineMediaExportService({
      session: ensureSession, request: bskyGet, base: authXrpcBase, filters: normalizeArchiveFilters,
      matches: postMatchesArchiveSelection, hashtags: postMatchesMediaExportHashtagSelection, post: buildArchivePostEntity,
      blob: downloadBlobForDid, remote: downloadRemoteAssetViaBlob, timeout: withThreadExplorerMediaHydrationTimeout,
      extension: getAssetExtensionFromMimeType, now: () => new Date().toISOString(),
      repeat: (callback, ms) => setInterval(callback, ms), stopRepeat: id => clearInterval(id),
      models: getWorkerMediaExportModels(), version: APP_VERSION, messages: globalThis.ThreadlineAdapterMessages,
      limits: { heartbeatMs: MEDIA_EXPORT_HEARTBEAT_MS, itemMs: MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS },
    });
  }
  return workerMediaExportService;
}
/** Delegates author media scanning. @param {...unknown} args - Input and progress observer. @returns {Promise<object>} Manifest. */
function scanAccountMediaExport(...args) { return getWorkerMediaExportService().scan(...args); }
/** Delegates media download. @param {...unknown} args - Input and progress observer. @returns {Promise<object>} Downloaded asset. */
function downloadAccountMediaAsset(...args) { return getWorkerMediaExportService().download(...args); }

function mapWithConcurrency(...args) { return globalThis.ThreadlineWorkerCollections.mapWithConcurrency(...args); }

function chunkEntries(...args) { return globalThis.ThreadlineWorkerCollections.chunkEntries(...args); }

function bytesToDataUrl(bytes, mimeType = "image/jpeg") {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, Math.min(bytes.length, index + chunkSize));
    binary += String.fromCharCode(...slice);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function parseArchiveThreadSource(...args) { return globalThis.ThreadlineRecordModels.parseArchiveThreadSource(args[0], parseAtUri); }


let workerPostCheckService = null;
/** Wires read-only post checks after worker dependencies initialize. @returns {object} Post-check service. */
function getWorkerPostCheckService() {
  if (!workerPostCheckService) {
    workerPostCheckService = globalThis.createThreadlinePostCheckService({
      session: ensureSession, source: parseArchiveThreadSource, resolve: resolveHandleToDid, request: bskyGet,
      base: authXrpcBase, root: getArchiveRootUri, thread: archiveGetPostThread, collect: collectThreadViewPosts,
      pds: resolvePdsForDid, xrpc: xrpcBaseForService, error: createServiceWorkerError,
      defaultService: DEFAULT_LOGIN_SERVICE, messages: globalThis.ThreadlineAdapterMessages, models: workerReplyModels,
    });
  }
  return workerPostCheckService;
}
/** Checks reply metadata. @param {object} input - URL and mode. @returns {Promise<object>} Reply metadata. */
function checkReplyTarget(input) { return getWorkerPostCheckService().reply(input); }
/** Checks edit metadata. @param {object} input - URL. @returns {Promise<object>} Edit metadata. */
function checkPostEditMetadata(input) { return getWorkerPostCheckService().edit(input); }

let workerArchiveWaveController = null;
/** Wires the resumable archive-wave controller. @returns {object} Controller. */
function getWorkerArchiveWaveController() {
  if (!workerArchiveWaveController) {
    workerArchiveWaveController = globalThis.createThreadlineArchiveWaveController({
      ensureSession: (...args) => ensureSession(...args),
      readStoredValue: (...args) => readStoredValue(...args),
      normalizeArchiveExpertMode: (...args) => normalizeArchiveExpertMode(...args),
      normalizeArchiveFilters: (...args) => normalizeArchiveFilters(...args),
      resolveArchiveSourceActor: (...args) => resolveArchiveSourceActor(...args),
      waitForArchiveRunControl: (...args) => waitForArchiveRunControl(...args),
      shouldStopAuthorFeedScanForFilters: (...args) => getWorkerMediaExportModels().stop(...args),
      maybePauseArchiveFeedScan: (...args) => maybePauseArchiveFeedScan(...args),
      mergeArchivePostEntity: (...args) => mergeArchivePostEntity(...args),
      buildArchivePostEntity: (...args) => buildArchivePostEntity(...args),
      getArchiveRootUri: (...args) => getArchiveRootUri(...args),
      parseAtUri: (...args) => parseAtUri(...args),
      runArchiveRequestWithRetry: (...args) => runArchiveRequestWithRetry(...args),
      archiveGetPostThread: (...args) => archiveGetPostThread(...args),
      isMissingArchivePostError: (...args) => isMissingArchivePostError(...args),
      isArchiveThreadTimeoutError: (...args) => isArchiveThreadTimeoutError(...args),
      collectThreadViewPosts: (...args) => collectThreadViewPosts(...args),
      recordBelongsToOwnMainThreadPath: (...args) => recordBelongsToOwnMainThreadPath(...args),
      postMatchesArchiveFilters: (...args) => postMatchesArchiveFilters(...args),
      postMatchesMediaExportHashtagSelection: (...args) => postMatchesMediaExportHashtagSelection(...args),
      expandArchiveConversationContexts: (...args) => expandArchiveConversationContexts(...args),
      attachArchiveAvatarAssets: (...args) => attachArchiveAvatarAssets(...args),
      get SETTINGS_KEY() { return SETTINGS_KEY; },
      get archiveModels() { return archiveModels; },
      get archiveRunControl() { return archiveRunControl; },
      get APP_VERSION() { return APP_VERSION; },
      get archiveWaveService() { return archiveWaveService; },
      get archiveAssetService() { return archiveAssetService; },
      now: () => new Date().toISOString(),
    });
  }
  return workerArchiveWaveController;
}
/** Delegates archive-wave loading. @param {...unknown} args - Wave input and progress observer. @returns {Promise<object>} Wave result. */
function exportAccountArchiveWave(...args) { return getWorkerArchiveWaveController().load(...args); }

let workerInteractionService = null;
/** Wires record interaction operations. @returns {object} Interaction service. */
function getWorkerInteractionService() {
  if (!workerInteractionService) {
    workerInteractionService = globalThis.createThreadlineInteractionService({
      session: ensureSession, request: bskyFetch, base: xrpcBaseForService, settings: normalizePostInteractionSettings,
      rkey: extractRecordKeyFromAtUri, rules: buildThreadGateAllowRules, parseUri: parseAtUriParts,
      now: () => new Date().toISOString(), messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerInteractionService;
}
/** Creates a like. @param {object} payload - URI and CID. @returns {Promise<object>} Like reference. */
function likePost(payload) { return getWorkerInteractionService().like(payload); }
/** Removes a like. @param {object} payload - Like URI. @returns {Promise<object>} Removed reference. */
function unlikePost(payload) { return getWorkerInteractionService().unlike(payload); }
let workerPublishService = null;
/** Wires thread publishing after all worker adapters initialize. @returns {object} Publishing service. */
function getWorkerPublishService() {
  if (!workerPublishService) {
    workerPublishService = globalThis.createThreadlinePublishService({
      session: ensureSession, languages: normalizePostLanguageTags, interaction: normalizePostInteractionSettings,
      card: normalizeLinkCard, facets: buildRichTextFacets, upload: uploadBlob,
      gates: (...args) => getWorkerInteractionService().gates(...args), request: bskyFetch,
      base: xrpcBaseForService, webBase: resolvePostWebBase, blob: Blob, now: () => new Date().toISOString(),
      maxImages: MAX_IMAGES_PER_SEGMENT, defaultService: DEFAULT_LOGIN_SERVICE, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return workerPublishService;
}
/** Publishes a thread. @param {...unknown} args - Input and progress observer. @returns {Promise<object>} Publish result. */
function publishThread(...args) { return getWorkerPublishService().publish(...args); }
