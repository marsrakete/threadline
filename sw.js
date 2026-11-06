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
  "./js/worker/adapter-messages.js",
  "./js/worker/transport-service.js",
  "./js/worker/auth-models.js",
  "./js/worker/storage-service.js",
  "./js/worker/identity-service.js",
  "./js/worker/session-service.js",
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

importScripts("./js/worker/adapter-messages.js", "./js/worker/transport-service.js", "./js/worker/auth-models.js", "./js/worker/storage-service.js", "./js/worker/identity-service.js", "./js/worker/session-service.js", "./js/atproto/atproto-worker.js", "./js/worker/search-queries.js", "./js/worker/search-filters.js", "./js/worker/search-service.js", "./js/worker/dm-models.js", "./js/worker/dm-messages.js", "./js/worker/dm-service.js", "./js/worker/archive-run-messages.js", "./js/worker/archive-run-control.js", "./js/worker/archive-models.js", "./js/worker/archive-thread-service.js", "./js/worker/archive-source-service.js", "./js/worker/archive-wave-service.js", "./js/worker/archive-asset-service.js", "./js/worker/archive-import-service.js", "./js/worker/analysis-models.js", "./js/worker/analysis-messages.js", "./js/worker/analysis-service.js");
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
const workerStorage = globalThis.createThreadlineStorageService({ indexedDB: () => indexedDB,
  databaseName: DB_NAME, databaseVersion: DB_VERSION, storeName: STORE_NAME, imageStoreName: COMPOSER_IMAGE_STORE_NAME, authKey: AUTH_KEY,
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
  accountAvatar: fetchAccountAvatar, remoteAsset: downloadRemoteAssetViaBlob, blob: downloadBlobForDid,
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

function normalizePostLanguageTags(tags, max = 3) {
  const values = Array.isArray(tags) ? tags : [tags];
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) {
      continue;
    }

    let tag = raw.toLowerCase();
    try {
      tag = new Intl.Locale(raw).language || raw.toLowerCase();
    } catch {
      tag = raw.toLowerCase();
    }

    if (seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= max) {
      break;
    }
  }

  return normalized;
}

function normalizePostInteractionSettings(value = {}) {
  const replyMode = ["everyone", "nobody", "custom"].includes(value.replyMode) ? value.replyMode : "everyone";
  return {
    replyMode,
    allowFollowers: value.allowFollowers === true,
    allowFollowing: value.allowFollowing === true,
    allowMentioned: value.allowMentioned === true,
    quotePostsAllowed: value.quotePostsAllowed !== false,
  };
}

function extractRecordKeyFromAtUri(uri) {
  const raw = String(uri || "").trim();
  if (!raw.startsWith("at://")) {
    return "";
  }
  const parts = raw.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Splits one AT URI into repo, collection, and record key.
 * @param {string} uri - Full `at://` URI.
 * @returns {object|null} Parsed AT URI parts, or null when the input is invalid.
 */
function parseAtUriParts(uri) {
  const raw = String(uri || "").trim();
  if (!raw.startsWith("at://")) {
    return null;
  }

  const withoutScheme = raw.slice("at://".length);
  const parts = withoutScheme.split("/");
  if (parts.length < 3) {
    return null;
  }

  const repo = String(parts[0] || "").trim();
  const collection = String(parts[1] || "").trim();
  const rkey = String(parts[2] || "").trim();
  if (!repo || !collection || !rkey) {
    return null;
  }

  return {
    repo,
    collection,
    rkey,
  };
}

function buildThreadGateAllowRules(settings) {
  if (settings.replyMode === "everyone") {
    return null;
  }

  if (settings.replyMode === "nobody") {
    return [];
  }

  const rules = [];
  if (settings.allowFollowers) {
    rules.push({ $type: "app.bsky.feed.threadgate#followerRule" });
  }
  if (settings.allowFollowing) {
    rules.push({ $type: "app.bsky.feed.threadgate#followingRule" });
  }
  if (settings.allowMentioned) {
    rules.push({ $type: "app.bsky.feed.threadgate#mentionRule" });
  }
  return rules;
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
  const result = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const parsed = typeof entry === "string"
      ? parseHashtagValue(entry)
      : parseHashtagValue(entry?.value || entry?.tag || entry?.label || "");

    if (!parsed || seen.has(parsed.normalized)) {
      continue;
    }

    seen.add(parsed.normalized);
    result.push(parsed);
  }

  return result;
}

function normalizeSelectedHashtagEntries(entries, hashtags) {
  const validSet = new Set((hashtags || []).map((tag) => tag.normalized));
  const seen = new Set();
  const result = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = typeof entry === "string"
      ? parseHashtagValue(entry)?.normalized || String(entry).trim().toLowerCase()
      : parseHashtagValue(entry?.value || entry?.tag || entry?.normalized || "")?.normalized;

    if (!normalized || !validSet.has(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
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

function normalizeThreadImage(entry = {}, options = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const allowMissingDataUrl = options.allowMissingDataUrl === true;
  const dataUrl = typeof entry.dataUrl === "string" ? entry.dataUrl : "";
  if (!allowMissingDataUrl && !dataUrl) {
    return null;
  }

  return {
    id: entry.id || crypto.randomUUID(),
    name: entry.name || "image",
    type: entry.type || "image/jpeg",
    ...(dataUrl ? { dataUrl } : {}),
    alt: String(entry.alt || "").slice(0, 2000),
    width: Number(entry.width) || 0,
    height: Number(entry.height) || 0,
    originalSizeBytes: Math.max(0, Number(entry.originalSizeBytes) || 0),
    edit: normalizeImageEdit(entry.edit),
    exportQuality: Math.min(0.92, Math.max(0.45, Number(entry.exportQuality) || 0.88)),
    exportScale: Math.min(1, Math.max(0.05, Number(entry.exportScale) || 1)),
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

function stripThreadImageData(entry = {}) {
  const normalized = normalizeThreadImage(entry, { allowMissingDataUrl: true });
  if (!normalized) {
    return null;
  }

  delete normalized.dataUrl;
  return normalized;
}

function normalizeSegmentImageMetadata(segments) {
  return (Array.isArray(segments) ? segments : []).map((images) =>
    (Array.isArray(images) ? images : [])
      .map((entry) => stripThreadImageData(entry))
      .filter(Boolean)
      .slice(0, MAX_IMAGES_PER_SEGMENT),
  );
}

/**
 * Normalizes Standard.site publication metadata attached to a link card.
 * @param {object|null} value - Raw metadata from a proxy response or saved archive.
 * @returns {object|null} Compact Standard.site metadata, or null when absent.
 */
function normalizeStandardSiteMetadata(value = null) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const documentUri = String(value.documentUri || value.document || "").trim();
  const publicationUri = String(value.publicationUri || value.publication || "").trim();
  const publicationUrl = String(value.publicationUrl || value.url || "").trim();
  const publicationName = String(value.publicationName || value.name || "").trim().slice(0, 160);
  if (!documentUri && !publicationUri && !publicationUrl && !publicationName) {
    return null;
  }

  return {
    documentUri,
    publicationUri,
    publicationUrl,
    publicationName,
    publicationVerified: value.publicationVerified === true,
    ctaLabel: String(value.ctaLabel || "View Publication").trim().slice(0, 80),
  };
}

/**
 * Normalizes one composer link card for persistence and posting.
 * @param {object|null} card - Raw link-card data from settings or the proxy.
 * @returns {object|null} Normalized link-card data, or null when invalid.
 */
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
    standardSite: normalizeStandardSiteMetadata(card.standardSite),
    createdAt: String(card.createdAt || new Date().toISOString()),
  };
}

function normalizeSegmentLinkCards(cards = []) {
  return (Array.isArray(cards) ? cards : []).map((card) => normalizeLinkCard(card));
}

function normalizeLinkCardProxySettings(settings = null) {
  const endpoint = String(settings?.endpoint || "").trim();
  const secret = String(settings?.secret || "").trim();
  return {
    endpoint: /^https?:\/\//i.test(endpoint) ? endpoint : "",
    secret,
  };
}

/**
 * Normalizes the persisted link-card provider setting.
 * @param {string} value - Raw provider value.
 * @returns {string} `none`, `proxy`, or `microlink`.
 */
function normalizeLinkCardProviderSetting(value) {
  if (value === "proxy") {
    return "proxy";
  }
  if (value === "microlink") {
    return "microlink";
  }
  return "none";
}

/**
 * Normalizes the locally tracked Microlink usage payload.
 * @param {object|null} usage - Raw usage payload from stored settings.
 * @returns {object} Normalized usage object.
 */
function normalizeLinkCardMicrolinkUsage(usage = null) {
  const date = String(usage?.date || "").trim();
  const count = Math.max(0, Number(usage?.count) || 0);
  return {
    date,
    count,
  };
}

/**
 * Normalizes the persisted search result state for reload-safe restore.
 * @param {object|null} value - Raw stored search result state.
 * @returns {object|null} Normalized search result state, or null when absent.
 */
function normalizeStoredSearchResultState(value = null) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const preferences = value.preferences && typeof value.preferences === "object"
    ? value.preferences
    : null;
  const items = (Array.isArray(value.items) ? value.items : [])
    .filter((item) => item && typeof item === "object" && item.post && typeof item.post === "object")
    .slice(0, 50);
  const cursor = String(value.cursor || "").trim();

  if (!preferences || (items.length === 0 && !cursor)) {
    return null;
  }

  return {
    preferences,
    items,
    cursor,
  };
}

function normalizeSegmentOverrides(segments) {
  const normalized = (Array.isArray(segments) ? segments : [])
    .map((entry) => String(entry || ""))
    .filter((entry) => entry.trim().length > 0);

  return normalized.length > 0 ? normalized : null;
}

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
      firstSegmentText: typeof entry?.firstSegmentText === "string" ? entry.firstSegmentText.trim() : "",
      threadCount: Math.max(1, Number(entry.threadCount) || 1),
      imageCount: Math.max(0, Number(entry.imageCount) || 0),
    });
  }

  return result
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 30);
}

const textEncoder = new TextEncoder();

function utf16IndexToUtf8Index(text, index) {
  return textEncoder.encode(text.slice(0, index)).byteLength;
}

function facetRangesOverlap(left, right) {
  return left.byteStart < right.byteEnd && right.byteStart < left.byteEnd;
}

function parseLinkFacets(text) {
  const facets = [];
  const regex = /(^|\s|\()((https?:\/\/[^\s]+)|((?<domain>[a-z][a-z0-9-]*(\.[a-z0-9-]+)+)[^\s]*))/gim;
  let match;

  while ((match = regex.exec(text))) {
    let uri = match[2];
    let start = match.index + match[1].length;
    let end = start + match[2].length;

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

    facets.push({
      index: {
        byteStart: utf16IndexToUtf8Index(text, start),
        byteEnd: utf16IndexToUtf8Index(text, end),
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri,
        },
      ],
    });
  }

  return facets;
}

function parseHashtagFacets(text) {
  const facets = [];
  const regex = /(?:^|\s)(#[^\d\s]\S*)(?=\s|$)/gu;
  let match;

  while ((match = regex.exec(text))) {
    let tag = match[1].replace(/\p{P}+$/gu, "");
    if (tag.length < 2 || tag.length > 66) {
      continue;
    }

    const start = match.index + match[0].indexOf("#");
    const end = start + tag.length;
    facets.push({
      index: {
        byteStart: utf16IndexToUtf8Index(text, start),
        byteEnd: utf16IndexToUtf8Index(text, end),
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#tag",
          tag: tag.slice(1),
        },
      ],
    });
  }

  return facets;
}

function parseMentionCandidates(text) {
  const candidates = [];
  const regex = /(^|[\s([{"'“„«‹])(@)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)(?=$|[\s)\]}",;:!?'”»›])/gu;
  let match;

  while ((match = regex.exec(text))) {
    const handle = match[3].toLowerCase();
    const start = match.index + match[1].length;
    const end = start + handle.length + 1;
    candidates.push({ handle, start, end });
  }

  return candidates;
}

/**
 * Builds mention facets and keeps track of unresolved handles.
 * @param {string} text - Post text that may contain `@handle` mentions.
 * @param {object} auth - Authenticated account used for DID resolution.
 * @param {Map<string, string|null>} cache - Shared DID cache for the publish run.
 * @returns {Promise<{ facets: object[], unresolvedHandles: string[] }>} Mention facets plus unresolved handles.
 */
async function parseMentionFacets(text, auth, cache) {
  const facets = [];
  const unresolvedHandles = [];
  const unresolvedSeen = new Set();
  const candidates = parseMentionCandidates(text);

  for (const candidate of candidates) {
    const did = await resolveHandleToDid(candidate.handle, auth, cache);
    if (!did) {
      if (!unresolvedSeen.has(candidate.handle)) {
        unresolvedSeen.add(candidate.handle);
        unresolvedHandles.push(candidate.handle);
      }
      continue;
    }

    facets.push({
      index: {
        byteStart: utf16IndexToUtf8Index(text, candidate.start),
        byteEnd: utf16IndexToUtf8Index(text, candidate.end),
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#mention",
          did,
        },
      ],
    });
  }

  return {
    facets,
    unresolvedHandles,
  };
}

/**
 * Builds Bluesky rich-text facets for links, mentions, and hashtags.
 * @param {string} text - Raw post text.
 * @param {object} auth - Authenticated account used for mention DID resolution.
 * @param {Map<string, string|null>} resolveCache - Shared DID cache for the publish run.
 * @returns {Promise<{ facets: object[]|undefined, unresolvedHandles: string[] }>} Built facets plus unresolved mention handles.
 */
async function buildRichTextFacets(text, auth, resolveCache) {
  const linkFacets = parseLinkFacets(text);
  const hashtagFacets = parseHashtagFacets(text);
  const mentionResult = await parseMentionFacets(text, auth, resolveCache);
  const mentionFacets = mentionResult.facets;
  const combined = [...linkFacets, ...mentionFacets, ...hashtagFacets]
    .sort((left, right) => left.index.byteStart - right.index.byteStart);

  const accepted = [];
  for (const facet of combined) {
    if (accepted.some((entry) => facetRangesOverlap(entry.index, facet.index))) {
      continue;
    }
    accepted.push(facet);
  }

  if (accepted.length > 0) {
    return {
      facets: accepted,
      unresolvedHandles: mentionResult.unresolvedHandles,
    };
  }

  return {
    facets: undefined,
    unresolvedHandles: mentionResult.unresolvedHandles,
  };
}

/**
 * Resolves composer mention handles to DIDs for preview rendering in the UI.
 * @param {object} payload - Message payload with a `handles` array.
 * @returns {Promise<{mentions: Array<{handle: string, did: string|null}>}>} Resolved handle-to-DID pairs.
 */
async function resolveComposerMentions(payload = {}) {
  const rawHandles = Array.isArray(payload?.handles) ? payload.handles : [];
  const normalizedHandles = [];

  for (const rawHandle of rawHandles) {
    const handle = String(rawHandle || "").trim().replace(/^@/, "").toLowerCase();
    if (!handle) {
      continue;
    }
    if (!normalizedHandles.includes(handle)) {
      normalizedHandles.push(handle);
    }
  }

  let auth = null;
  try {
    auth = await ensureSession();
  } catch {
    auth = null;
  }

  const resolveCache = new Map();
  const mentions = [];

  for (const handle of normalizedHandles) {
    const did = await resolveHandleToDid(handle, auth, resolveCache);
    mentions.push({
      handle,
      did: did || null,
    });
  }

  return { mentions };
}

/**
 * Normalizes the raw account search query from the mention picker.
 * @param {string} rawQuery - User-entered search text.
 * @returns {string} Lowercased query without leading at sign.
 */
function normalizeMentionSearchQuery(rawQuery = "") {
  return String(rawQuery || "").trim().replace(/^@/, "").toLowerCase();
}

/**
 * Builds query variants for account typeahead including common handle suffixes.
 * @param {string} rawQuery - User-entered search text.
 * @returns {string[]} Unique query variants ordered from strict to broad.
 */
function buildMentionSearchQueries(rawQuery = "") {
  const normalizedQuery = normalizeMentionSearchQuery(rawQuery);
  if (!normalizedQuery) {
    return [];
  }

  const queries = [];
  const seen = new Set();
  const pushQuery = (value) => {
    const normalizedValue = normalizeMentionSearchQuery(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }
    seen.add(normalizedValue);
    queries.push(normalizedValue);
  };

  pushQuery(normalizedQuery);

  let baseName = normalizedQuery;
  const dotIndex = normalizedQuery.indexOf(".");
  if (dotIndex > 0) {
    baseName = normalizedQuery.slice(0, dotIndex);
    pushQuery(baseName);
  }

  if (baseName) {
    for (const suffix of MENTION_SEARCH_HANDLE_SUFFIXES) {
      pushQuery(`${baseName}.${suffix}`);
    }
  }

  return queries;
}

/**
 * Computes a lightweight ranking score for mention search results.
 * @param {object} actor - Normalized actor search hit.
 * @param {string} rawQuery - Original normalized search query.
 * @returns {number} Higher scores rank earlier.
 */
function scoreMentionSearchActor(actor = {}, rawQuery = "") {
  const query = normalizeMentionSearchQuery(rawQuery);
  const handle = String(actor.handle || "").trim().toLowerCase();
  const displayName = String(actor.displayName || "").trim().toLowerCase();
  let score = 0;

  if (handle === query) {
    score += 1000;
  }
  if (handle.startsWith(query)) {
    score += 300;
  }
  if (displayName.startsWith(query)) {
    score += 120;
  }
  if (handle.includes(query)) {
    score += 40;
  }
  if (actor.followingViewer === true && actor.followedByViewer === true) {
    score += 90;
  } else {
    if (actor.followingViewer === true) {
      score += 35;
    }
    if (actor.followedByViewer === true) {
      score += 35;
    }
  }

  return score;
}

/**
 * Searches Bluesky accounts for the composer mention picker via typeahead.
 * @param {object} payload - Message payload with a raw `query` string.
 * @returns {Promise<{actors: object[]}>} Ranked actor matches with avatar and relation info.
 */
async function searchMentionActors(payload = {}) {
  const query = normalizeMentionSearchQuery(payload?.query);
  if (query.length < 2) {
    return { actors: [] };
  }

  const auth = await ensureSession();
  const queries = buildMentionSearchQueries(query);
  const byDid = new Map();

  for (const variant of queries) {
    const response = await bskyGet("app.bsky.actor.searchActorsTypeahead", {
      q: variant,
      limit: 8,
    }, {
      base: authXrpcBase(auth),
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
    }).catch(() => ({ actors: [] }));

    const actors = Array.isArray(response?.actors) ? response.actors : [];
    for (const actor of actors) {
      const normalizedActor = normalizeNetworkProfile(actor, "");
      if (!normalizedActor.did || byDid.has(normalizedActor.did)) {
        continue;
      }
      byDid.set(normalizedActor.did, normalizedActor);
    }
  }

  const ranked = Array.from(byDid.values())
    .sort((left, right) => {
      const scoreDiff = scoreMentionSearchActor(right, query) - scoreMentionSearchActor(left, query);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return String(left.handle || left.did || "").localeCompare(String(right.handle || right.did || ""), undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, 12);

  return { actors: ranked };
}

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

async function readComposerImageBlobEntries(ids = []) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((value) => String(value || "")).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);
    const records = new Map();
    let pending = uniqueIds.length;

    const fail = (error) => reject(error || transaction.error || new Error("Bilddaten konnten nicht gelesen werden."));

    for (const id of uniqueIds) {
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) {
          records.set(id, request.result);
        }
        pending -= 1;
        if (pending === 0) {
          resolve(records);
        }
      };
      request.onerror = () => fail(request.error);
    }

    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

async function putComposerImageBlobEntries(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }

  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);

    for (const entry of entries) {
      store.put(entry);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Bilddaten konnten nicht geschrieben werden."));
    transaction.onabort = () => reject(transaction.error || new Error("Bilddaten konnten nicht geschrieben werden."));
  });
}

async function listComposerImageBlobIds() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve((Array.isArray(request.result) ? request.result : []).map((value) => String(value || "")).filter(Boolean));
    request.onerror = () => reject(request.error || new Error("Bilddaten konnten nicht gelesen werden."));
  });
}

async function deleteComposerImageBlobEntries(ids = []) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((value) => String(value || "")).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return;
  }

  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);

    for (const id of uniqueIds) {
      store.delete(id);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Bilddaten konnten nicht geloescht werden."));
    transaction.onabort = () => reject(transaction.error || new Error("Bilddaten konnten nicht geloescht werden."));
  });
}

function collectComposerImageIdsFromSegments(segments = []) {
  const ids = new Set();
  for (const images of normalizeSegmentImageMetadata(segments)) {
    for (const image of images) {
      ids.add(image.id);
    }
  }
  return ids;
}

async function storeComposerImageBlobs(segmentImages = []) {
  const normalized = normalizeSegmentImages(segmentImages);
  const images = normalized.flatMap((items) => items || []);
  if (images.length === 0) {
    return normalized;
  }

  const existingRecords = await readComposerImageBlobEntries(images.map((image) => image.id));
  const entries = [];

  for (const image of images) {
    if (!image?.id || !image?.dataUrl) {
      continue;
    }

    const existing = existingRecords.get(image.id);
    const expectedSize = Math.max(0, Number(image.originalSizeBytes) || 0);
    const hasBlob = existing?.blob instanceof Blob;
    const sizeMatches = expectedSize === 0 || Number(existing?.sizeBytes) === expectedSize;
    const typeMatches = !image.type || !existing?.type || existing.type === image.type;
    if (hasBlob && sizeMatches && typeMatches) {
      continue;
    }

    const blob = await dataUrlToBlob(image.dataUrl);
    entries.push({
      id: image.id,
      blob,
      type: image.type || blob.type || "image/jpeg",
      sizeBytes: expectedSize || blob.size || 0,
      updatedAt: new Date().toISOString(),
    });
  }

  if (entries.length > 0) {
    await putComposerImageBlobEntries(entries);
  }

  return normalized;
}

async function hydrateStoredSegmentImages(segments = []) {
  const normalizedMeta = normalizeSegmentImageMetadata(segments);
  const missingIds = [];

  normalizedMeta.forEach((images) => {
    images.forEach((image) => {
      if (!image.dataUrl && image.id) {
        missingIds.push(image.id);
      }
    });
  });

  const blobRecords = await readComposerImageBlobEntries(missingIds);
  const hydratedSegments = [];

  for (let segmentIndex = 0; segmentIndex < normalizedMeta.length; segmentIndex += 1) {
    const sourceImages = Array.isArray(segments[segmentIndex]) ? segments[segmentIndex] : [];
    const hydratedImages = [];

    for (let imageIndex = 0; imageIndex < normalizedMeta[segmentIndex].length; imageIndex += 1) {
      const metaImage = normalizedMeta[segmentIndex][imageIndex];
      const sourceImage = sourceImages[imageIndex];
      const inlineDataUrl = typeof sourceImage?.dataUrl === "string" ? sourceImage.dataUrl : "";
      const storedBlob = metaImage?.id ? blobRecords.get(metaImage.id) : null;
      const blobDataUrl = storedBlob?.blob instanceof Blob ? await blobToDataUrl(storedBlob.blob) : "";
      const hydrated = normalizeThreadImage({
        ...metaImage,
        dataUrl: inlineDataUrl || blobDataUrl,
      });
      if (hydrated) {
        hydratedImages.push(hydrated);
      }
    }

    hydratedSegments.push(hydratedImages);
  }

  return hydratedSegments;
}

async function pruneComposerImageBlobs() {
  const draft = await readStoredValue(DRAFT_KEY);
  const storedSettings = await readStoredValue(SETTINGS_KEY);
  const referencedIds = new Set([
    ...collectComposerImageIdsFromSegments(draft?.segmentImages),
    ...collectComposerImageIdsFromSegments(storedSettings?.segmentImages),
  ]);
  const storedIds = await listComposerImageBlobIds();
  const staleIds = storedIds.filter((id) => !referencedIds.has(id));
  await deleteComposerImageBlobEntries(staleIds);
}

/** Decodes a JWT through the session service. @param {string} jwt - Token. @returns {object|null} Payload. */
function decodeJwtPayload(jwt) { return getAtprotoSession().decode(jwt); }

/** Checks JWT validity through the session service. @param {string} accessJwt - Token. @returns {boolean} Existing expiry result. */
function isJwtValid(accessJwt) { return getAtprotoSession().valid(accessJwt); }

function normalizeNetworkProfile(profile = {}, source = "") {
  const viewer = profile?.viewer && typeof profile.viewer === "object" ? profile.viewer : {};
  return {
    did: String(profile.did || "").trim(),
    handle: String(profile.handle || "").trim(),
    displayName: String(profile.displayName || profile.handle || "").trim(),
    avatar: String(profile.avatar || "").trim(),
    description: String(profile.description || "").trim().slice(0, 280),
    followersCount: Number(profile.followersCount) || 0,
    followsCount: Number(profile.followsCount) || 0,
    postsCount: Number(profile.postsCount) || 0,
    followingViewer: source === "following" || Boolean(viewer.following),
    followedByViewer: source === "followers" || Boolean(viewer.followedBy),
  };
}

/**
 * Normalizes an AT Protocol actor object for Thread Explorer rendering.
 * @param {object} actor - Actor profile data from a post view.
 * @returns {object} A compact actor object with stable string fields and viewer relation flags.
 */
function normalizeThreadExplorerActor(actor = {}) {
  let viewer = {};
  if (actor?.viewer && typeof actor.viewer === "object") {
    viewer = actor.viewer;
  }
  return {
    did: String(actor?.did || "").trim(),
    handle: String(actor?.handle || "").trim(),
    displayName: String(actor?.displayName || actor?.handle || "").trim(),
    avatar: String(actor?.avatar || "").trim(),
    followingViewer: Boolean(viewer.following),
    followedByViewer: Boolean(viewer.followedBy),
  };
}

/**
 * Extracts image entries from a Bluesky embed view.
 * @param {object} embed - Post embed view or nested media embed view.
 * @returns {Array<object>} Image entries with thumb/fullsize URLs and alt text.
 */
function extractThreadExplorerImages(embed = {}) {
  if (!embed || typeof embed !== "object") {
    return [];
  }

  if (Array.isArray(embed.images)) {
    return embed.images.map((image) => ({
      thumb: String(image?.thumb || image?.fullsize || "").trim(),
      fullsize: String(image?.fullsize || image?.thumb || "").trim(),
      alt: String(image?.alt || "").trim(),
    })).filter((image) => image.thumb || image.fullsize);
  }

  if (Array.isArray(embed.items)) {
    return embed.items.map((image) => {
      const imageNode = image?.image && typeof image.image === "object" ? image.image : image;
      return {
        thumb: String(imageNode?.thumb || imageNode?.fullsize || "").trim(),
        fullsize: String(imageNode?.fullsize || imageNode?.thumb || "").trim(),
        alt: String(image?.alt || imageNode?.alt || "").trim(),
      };
    }).filter((image) => image.thumb || image.fullsize);
  }

  if (embed.media && typeof embed.media === "object") {
    return extractThreadExplorerImages(embed.media);
  }

  return [];
}

/**
 * Detects whether a post embed contains a video.
 * @param {object} embed - Post embed view or nested media embed view.
 * @returns {boolean} True when a video embed is present.
 */
function extractThreadExplorerHasVideo(embed = {}) {
  if (!embed || typeof embed !== "object") {
    return false;
  }
  if (embed.video && typeof embed.video === "object") {
    return true;
  }
  if (embed.media && typeof embed.media === "object") {
    return extractThreadExplorerHasVideo(embed.media);
  }
  return false;
}

/**
 * Extracts an external link-card from a Bluesky embed view.
 * @param {object} embed - Post embed view or nested media embed view.
 * @returns {object|null} A compact link-card object, or null when no external card exists.
 */
function extractThreadExplorerExternalCard(embed = {}) {
  if (!embed || typeof embed !== "object") {
    return null;
  }

  let external = null;
  if (embed.external && typeof embed.external === "object") {
    external = embed.external;
  } else if (embed.media && typeof embed.media === "object") {
    return extractThreadExplorerExternalCard(embed.media);
  }

  if (!external) {
    return null;
  }

  return {
    uri: String(external.uri || "").trim(),
    title: String(external.title || external.uri || "").trim(),
    description: String(external.description || "").trim(),
    thumb: String(external.thumb || "").trim(),
    standardSite: normalizeStandardSiteMetadata(external.standardSite || external.standardSiteMetadata || external.publication),
  };
}

/**
 * Normalizes Mu-compatible post edit metadata from an ATProto post record.
 * @param {object} record - Raw app.bsky.feed.post record.
 * @returns {object|null} Edit metadata, or null when no Mu edit fields exist.
 */
function normalizePostEditInfoFromRecord(record = {}) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (typeof record.originalText !== "string") {
    return null;
  }
  if (typeof record.updatedAt !== "string") {
    return null;
  }

  return {
    isEdited: true,
    originalText: String(record.originalText || ""),
    text: String(record.text || ""),
    createdAt: String(record.createdAt || ""),
    updatedAt: String(record.updatedAt || ""),
  };
}

/**
 * Normalizes a quoted post embed for Thread Explorer quote cards.
 * @param {object} record - Bluesky embed record view.
 * @returns {object|null} Normalized quoted post, or null when unavailable.
 */
function normalizeThreadExplorerQuoteRecord(record = {}) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (!record.uri) {
    return null;
  }

  let value = {};
  if (record.value && typeof record.value === "object") {
    value = record.value;
  }
  let quoteEmbed = {};
  if (record.embeds && Array.isArray(record.embeds) && record.embeds[0]) {
    quoteEmbed = record.embeds[0];
  } else if (record.embed && typeof record.embed === "object") {
    quoteEmbed = record.embed;
  } else if (value.embed && typeof value.embed === "object") {
    quoteEmbed = value.embed;
  }

  return {
    uri: String(record.uri || "").trim(),
    cid: String(record.cid || "").trim(),
    text: String(value.text || "").trim(),
    createdAt: String(value.createdAt || record.indexedAt || "").trim(),
    indexedAt: String(record.indexedAt || "").trim(),
    author: normalizeThreadExplorerActor(record.author || {}),
    images: extractThreadExplorerImages(quoteEmbed),
    externalCard: extractThreadExplorerExternalCard(quoteEmbed),
    editInfo: normalizePostEditInfoFromRecord(value),
  };
}

/**
 * Extracts a quoted post from a Bluesky embed view.
 * @param {object} embed - Post embed view or nested record-with-media view.
 * @returns {object|null} Normalized quote card data, or null.
 */
function extractThreadExplorerQuoteCard(embed = {}) {
  if (!embed || typeof embed !== "object") {
    return null;
  }

  let record = null;
  if (embed.record && typeof embed.record === "object") {
    record = embed.record;
  }
  if (record?.record && typeof record.record === "object") {
    record = record.record;
  }

  return normalizeThreadExplorerQuoteRecord(record);
}

/**
 * Normalizes a Bluesky post view for the Thread Explorer UI.
 * @param {object} postView - AT Protocol post view object.
 * @returns {object|null} Compact post data, or null when the input is not a post.
 */
function normalizeThreadExplorerPost(postView = {}) {
  if (!postView || typeof postView !== "object") {
    return null;
  }
  if (!postView.uri) {
    return null;
  }

  let record = {};
  if (postView.record && typeof postView.record === "object") {
    record = postView.record;
  }
  return {
    uri: String(postView.uri || "").trim(),
    cid: String(postView.cid || "").trim(),
    rootUri: String(record.reply?.root?.uri || postView.uri || "").trim(),
    reply: record?.reply || null,
    text: String(record.text || "").trim(),
    createdAt: String(record.createdAt || postView.indexedAt || "").trim(),
    indexedAt: String(postView.indexedAt || "").trim(),
    langs: Array.isArray(record.langs) ? record.langs : [],
    facets: Array.isArray(record.facets) ? record.facets : [],
    author: normalizeThreadExplorerActor(postView.author || {}),
    likeCount: Number(postView.likeCount) || 0,
    replyCount: Number(postView.replyCount) || 0,
    repostCount: Number(postView.repostCount) || 0,
    quoteCount: Number(postView.quoteCount) || 0,
    viewer: postView.viewer || {},
    images: extractThreadExplorerImages(postView.embed || {}),
    hasVideo: extractThreadExplorerHasVideo(postView.embed || {}),
    externalCard: extractThreadExplorerExternalCard(postView.embed || {}),
    quoteCard: extractThreadExplorerQuoteCard(postView.embed || {}),
    editInfo: normalizePostEditInfoFromRecord(record),
  };
}

/**
 * Builds a placeholder post for a missing parent/root in getPostThread.
 * @param {object} node - ThreadViewPost notFound node.
 * @returns {object|null} Placeholder post, or null when no URI exists.
 */
function normalizeThreadExplorerMissingPost(node = {}) {
  const uri = String(node?.uri || "").trim();
  if (!uri) {
    return null;
  }

  return {
    uri,
    cid: "",
    text: "",
    createdAt: "",
    indexedAt: "",
    author: {
      did: "",
      handle: "",
      displayName: "",
      avatar: "",
      followingViewer: false,
      followedByViewer: false,
    },
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    quoteCount: 0,
    viewer: {},
    images: [],
    externalCard: null,
    quoteCard: null,
    editInfo: null,
    isDeletedThreadAnchor: true,
  };
}

/**
 * Converts a getPostThread node to a recursive UI tree.
 * @param {object} node - ThreadViewPost node from app.bsky.feed.getPostThread.
 * @returns {object|null} Tree node with normalized post and child replies.
 */
function normalizeThreadExplorerThreadNode(node = {}) {
  if (!node || typeof node !== "object") {
    return null;
  }

  let post = null;
  if (node.notFound === true) {
    post = normalizeThreadExplorerMissingPost(node);
  } else {
    post = normalizeThreadExplorerPost(node.post || node);
  }
  if (!post) {
    return null;
  }

  const replies = [];
  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      const normalizedReply = normalizeThreadExplorerThreadNode(reply);
      if (normalizedReply) {
        replies.push(normalizedReply);
      }
    });
  }

  return {
    post,
    replies,
  };
}

/**
 * Finds the index of a reply by post URI.
 * @param {Array<object>} replies - Normalized reply nodes.
 * @param {string} uri - Post URI to find.
 * @returns {number} Matching index, or -1 when not found.
 */
function findThreadExplorerReplyIndex(replies, uri) {
  if (!Array.isArray(replies) || !uri) {
    return -1;
  }

  for (let index = 0; index < replies.length; index += 1) {
    if (replies[index]?.post?.uri === uri) {
      return index;
    }
  }
  return -1;
}

/**
 * Inserts a selected child subtree into a normalized parent node.
 * @param {object|null} parentNode - Normalized parent node.
 * @param {object|null} childNode - Normalized selected child subtree.
 * @returns {object|null} Parent node with the child subtree placed in replies.
 */
function attachThreadExplorerChildToParent(parentNode, childNode) {
  if (!parentNode || !childNode) {
    return parentNode || childNode || null;
  }

  if (!Array.isArray(parentNode.replies)) {
    parentNode.replies = [];
  }

  const existingIndex = findThreadExplorerReplyIndex(parentNode.replies, childNode.post.uri);
  if (existingIndex >= 0) {
    parentNode.replies[existingIndex] = childNode;
  } else {
    parentNode.replies.push(childNode);
  }
  return parentNode;
}

/**
 * Builds the visible Thread Explorer root tree from a getPostThread response.
 * @param {object} threadNode - ThreadViewPost node for the selected post.
 * @returns {object|null} Normalized tree rooted at the conversation root.
 */
function normalizeThreadExplorerThreadRoot(threadNode = {}) {
  let childTree = normalizeThreadExplorerThreadNode(threadNode);
  let parentSource = threadNode?.parent;

  while (parentSource && typeof parentSource === "object") {
    const parentTree = normalizeThreadExplorerThreadNode(parentSource);
    if (!parentTree) {
      break;
    }
    childTree = attachThreadExplorerChildToParent(parentTree, childTree);
    parentSource = parentSource.parent;
  }

  return childTree;
}

/**
 * Checks whether a normalized Thread Explorer tree contains a post URI.
 * @param {object|null} node - Normalized Thread Explorer tree node.
 * @param {string} uri - AT URI to find.
 * @returns {boolean} True when the URI exists in the tree.
 */
function threadExplorerTreeContainsUri(node, uri) {
  const normalizedUri = String(uri || "").trim();
  if (!node || !normalizedUri) {
    return false;
  }
  if (node.post?.uri === normalizedUri) {
    return true;
  }
  if (!Array.isArray(node.replies)) {
    return false;
  }
  return node.replies.some((reply) => threadExplorerTreeContainsUri(reply, normalizedUri));
}

/**
 * Merges a selected ancestor path into a full root tree when the full tree omits that path.
 * @param {object|null} fullRoot - Full root tree from getPostThread(root).
 * @param {object|null} selectedRoot - Root-to-selected path from getPostThread(selected).
 * @param {string} selectedUri - Selected post URI that must remain focusable.
 * @returns {object|null} Full root with selected path preserved.
 */
function mergeThreadExplorerSelectedPath(fullRoot, selectedRoot, selectedUri) {
  if (!fullRoot || !selectedRoot) {
    return fullRoot || selectedRoot || null;
  }
  if (threadExplorerTreeContainsUri(fullRoot, selectedUri)) {
    return fullRoot;
  }
  if (fullRoot.post?.uri !== selectedRoot.post?.uri) {
    return fullRoot;
  }

  mergeThreadExplorerPathNode(fullRoot, selectedRoot);
  return fullRoot;
}

/**
 * Merges one selected path node into a target node while preserving existing sibling replies.
 * @param {object} targetNode - Existing full-tree node.
 * @param {object} pathNode - Selected-path node with replies to preserve.
 * @returns {void}
 */
function mergeThreadExplorerPathNode(targetNode, pathNode) {
  if (!targetNode || !pathNode || targetNode.post?.uri !== pathNode.post?.uri) {
    return;
  }

  if (!Array.isArray(targetNode.replies)) {
    targetNode.replies = [];
  }
  if (!Array.isArray(pathNode.replies)) {
    return;
  }

  pathNode.replies.forEach((pathReply) => {
    const existingIndex = findThreadExplorerReplyIndex(targetNode.replies, pathReply.post?.uri || "");
    if (existingIndex >= 0) {
      mergeThreadExplorerPathNode(targetNode.replies[existingIndex], pathReply);
    } else {
      targetNode.replies.push(pathReply);
    }
  });
}

/**
 * Counts posts in a normalized Thread Explorer tree.
 * @param {object|null} node - Normalized thread tree node.
 * @returns {number} Total number of posts below and including the node.
 */
function countThreadExplorerTreePosts(node) {
  if (!node) {
    return 0;
  }

  let count = 0;
  if (node.post?.isDeletedThreadAnchor !== true) {
    count = 1;
  }
  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      count += countThreadExplorerTreePosts(reply);
    });
  }
  return count;
}

/**
 * Loads a Thread Explorer thread view from Bluesky.
 * @param {object} auth - Active account auth reference.
 * @param {string} uri - AT URI to load.
 * @param {number} parentHeight - Number of parent levels to request.
 * @returns {Promise<object>} Raw getPostThread response.
 */
async function fetchThreadExplorerThreadView(auth, uri, parentHeight) {
  return bskyGet("app.bsky.feed.getPostThread", {
    uri,
    depth: 100,
    parentHeight,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  });
}

/**
 * Keeps only feed items whose post URI is still resolvable through getPosts.
 * @param {object} auth - Active account auth reference.
 * @param {object[]} items - Normalized feed items from getTimeline.
 * @returns {Promise<object[]>} Feed items whose posts still exist.
 */
async function filterExistingThreadExplorerFeedItems(auth, items = []) {
  const validItems = [];
  const seenUris = new Set();
  const uris = [];

  items.forEach((item) => {
    const uri = String(item?.post?.uri || "").trim();
    if (!uri || seenUris.has(uri)) {
      return;
    }
    seenUris.add(uri);
    uris.push(uri);
  });

  for (let index = 0; index < uris.length; index += 25) {
    const batch = uris.slice(index, index + 25);
    const response = await bskyGet("app.bsky.feed.getPosts", {
      uris: batch,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    const existingUris = new Set();
    if (Array.isArray(response?.posts)) {
      response.posts.forEach((post) => {
        const uri = String(post?.uri || "").trim();
        if (uri) {
          existingUris.add(uri);
        }
      });
    }

    items.forEach((item) => {
      const uri = String(item?.post?.uri || "").trim();
      if (!batch.includes(uri)) {
        return;
      }
      if (!existingUris.has(uri)) {
        return;
      }
      validItems.push(item);
    });
  }

  return validItems;
}

/**
 * Normalizes one saved feed preference entry for the Thread Explorer source picker.
 * @param {object} feed - Raw saved feed preference entry.
 * @returns {object|null} Feed source metadata, or null when invalid.
 */
function normalizeThreadExplorerSavedFeed(feed = {}) {
  const uri = String(feed?.value || feed?.uri || feed?.feed || "").trim();
  if (!/^at:\/\/[^/]+\/app\.bsky\.feed\.generator\/[^/]+$/i.test(uri)) {
    return null;
  }

  return {
    uri,
    displayName: String(feed?.displayName || feed?.name || "").trim(),
    pinned: feed?.pinned === true,
  };
}

/**
 * Extracts pinned feed generator sources from actor preferences.
 * @param {Array<object>} preferences - Raw getPreferences preference entries.
 * @returns {Array<object>} Pinned feed generator sources.
 */
function extractThreadExplorerPinnedFeedSources(preferences = []) {
  const seen = new Set();
  const feeds = [];
  if (!Array.isArray(preferences)) {
    return feeds;
  }

  preferences.forEach((preference) => {
    const type = String(preference?.$type || "");
    // Support both legacy "#savedFeedsPref" and current "#bskyAppStatePref" formats
    if (!(
      type.endsWith("#savedFeedsPref") ||
      type.endsWith("#bskyAppStatePref") ||
      Array.isArray(preference?.saved) ||
      Array.isArray(preference?.items)
    )) {
      return;
    }

    // Use saved array (legacy) or items array (current)
    const saved = Array.isArray(preference.saved) ? preference.saved :
                 Array.isArray(preference.items) ? preference.items :
                 [];
    saved.forEach((entry) => {
      const feed = normalizeThreadExplorerSavedFeed(entry);
      if (!feed || !feed.pinned || seen.has(feed.uri)) {
        return;
      }
      seen.add(feed.uri);
      feeds.push(feed);
    });
  });

  return feeds;
}

/**
 * Adds display metadata from app.bsky.feed.getFeedGenerator to pinned feed sources.
 * @param {object} auth - Active account auth reference.
 * @param {Array<object>} feeds - Feed sources from actor preferences.
 * @returns {Promise<Array<object>>} Feed sources with display names where available.
 */
async function enrichThreadExplorerFeedSources(auth, feeds = []) {
  const enriched = [];
  for (const feed of feeds.slice(0, 25)) {
    try {
      const response = await bskyGet("app.bsky.feed.getFeedGenerator", {
        feed: feed.uri,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: authXrpcBase(auth),
      });
      const displayName = String(response?.view?.displayName || feed.displayName || "").trim();
      enriched.push({
        ...feed,
        displayName,
      });
    } catch {
      enriched.push(feed);
    }
  }
  return enriched;
}

/**
 * Loads the active account's pinned feed generator sources.
 * @returns {Promise<object>} Pinned feed sources.
 */
async function loadThreadExplorerFeedSources() {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const response = await bskyGet("app.bsky.actor.getPreferences", {}, {
    headers: {
      authorization: `Bearer ${activeAuth.session.accessJwt}`,
    },
    base: authXrpcBase(activeAuth),
  });

  const feeds = extractThreadExplorerPinnedFeedSources(response?.preferences || []);
  const enrichedFeeds = await enrichThreadExplorerFeedSources(activeAuth, feeds);
  return {
    feeds: enrichedFeeds,
  };
}

/**
 * Checks whether a Thread Explorer source is a relationship source.
 * @param {string} source - Normalized Thread Explorer source.
 * @returns {boolean} True when the source is follows, followers, or mutuals.
 */
function isThreadExplorerRelationshipSource(source) {
  return source === "follows" || source === "followers" || source === "mutuals";
}

/**
 * Returns the graph endpoint for a relationship source.
 * @param {string} source - Relationship source name.
 * @returns {string} XRPC endpoint name for the relationship graph page.
 */
function getThreadExplorerRelationshipEndpoint(source) {
  if (source === "followers") {
    return "app.bsky.graph.getFollowers";
  }
  return "app.bsky.graph.getFollows";
}

/**
 * Returns the graph profile source flag for a relationship source.
 * @param {string} source - Relationship source name.
 * @returns {string} Graph profile source flag.
 */
function getThreadExplorerRelationshipProfileSource(source) {
  if (source === "followers") {
    return "followers";
  }
  return "following";
}

/**
 * Checks whether a graph profile belongs to the requested Thread Explorer group.
 * @param {object} profile - Normalized graph profile.
 * @param {string} source - Relationship source name.
 * @returns {boolean} True when the profile should be included.
 */
function isThreadExplorerRelationshipProfileMatch(profile = {}, source = "") {
  if (source === "mutuals") {
    return profile.followingViewer === true && profile.followedByViewer === true;
  }
  if (source === "followers") {
    return profile.followedByViewer === true;
  }
  return profile.followingViewer === true;
}

/**
 * Loads the latest visible author post for a Thread Explorer relationship profile.
 * @param {object} auth - Active account auth reference.
 * @param {object} profile - Normalized graph profile.
 * @returns {Promise<object|null>} Normalized Thread Explorer feed item or null.
 */
async function loadThreadExplorerLatestProfilePost(auth, profile = {}) {
  const actorDid = String(profile?.did || "").trim();
  if (!actorDid) {
    return null;
  }

  const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
    actor: actorDid,
    limit: 12,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  });

  let feed = [];
  if (Array.isArray(response?.feed)) {
    feed = response.feed;
  }
  for (const entry of feed) {
    const rawPost = entry?.post || null;
    if (!rawPost?.uri) {
      continue;
    }
    if (String(rawPost?.author?.did || "").trim() !== actorDid) {
      continue;
    }
    const post = normalizeThreadExplorerPost(rawPost);
    if (!post) {
      continue;
    }
    post.author.followingViewer = profile.followingViewer === true || post.author.followingViewer === true;
    post.author.followedByViewer = profile.followedByViewer === true || post.author.followedByViewer === true;
    return {
      post,
      reason: {
        source: "relationship",
      },
    };
  }

  return null;
}

/**
 * Loads latest posts from graph relationship profiles with limited concurrency.
 * @param {object} auth - Active account auth reference.
 * @param {object[]} profiles - Normalized graph profiles.
 * @returns {Promise<object[]>} Feed items with latest author posts.
 */
async function loadThreadExplorerRelationshipPosts(auth, profiles = []) {
  const items = [];
  const batchSize = 8;
  for (let index = 0; index < profiles.length; index += batchSize) {
    const batch = profiles.slice(index, index + batchSize);
    const results = await Promise.all(batch.map((profile) => {
      return loadThreadExplorerLatestProfilePost(auth, profile).catch(() => {
        return null;
      });
    }));
    results.forEach((item) => {
      if (item?.post?.uri) {
        items.push(item);
      }
    });
  }
  return items;
}

/**
 * Returns the timestamp used to sort Thread Explorer feed items.
 * @param {object} item - Thread Explorer feed item.
 * @returns {number} Epoch milliseconds or zero.
 */
function getThreadExplorerFeedItemTimestamp(item = {}) {
  const createdAt = Date.parse(String(item?.post?.createdAt || "").trim());
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  const indexedAt = Date.parse(String(item?.post?.indexedAt || "").trim());
  if (Number.isFinite(indexedAt)) {
    return indexedAt;
  }

  return 0;
}

/**
 * Sorts Thread Explorer feed items by latest post timestamp.
 * @param {object[]} items - Thread Explorer feed items.
 * @returns {object[]} Sorted copy with newest posts first.
 */
function sortThreadExplorerFeedItemsChronologically(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      return {
        item,
        index,
      };
    })
    .sort((left, right) => {
      const leftTime = getThreadExplorerFeedItemTimestamp(left.item);
      const rightTime = getThreadExplorerFeedItemTimestamp(right.item);
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return left.index - right.index;
    })
    .map((entry) => {
      return entry.item;
    });
}

/**
 * Loads latest posts for one Thread Explorer relationship group.
 * @param {object} auth - Active account auth reference.
 * @param {string} source - Relationship source name.
 * @param {string} cursor - Graph cursor for pagination.
 * @param {number} limit - Desired number of profiles to inspect.
 * @returns {Promise<object>} Relationship feed items and next graph cursor.
 */
async function loadThreadExplorerRelationshipFeed(auth, source, cursor, limit) {
  const endpoint = getThreadExplorerRelationshipEndpoint(source);
  const profileSource = getThreadExplorerRelationshipProfileSource(source);
  const actorDid = String(auth?.session?.did || "").trim();
  if (!actorDid) {
    throw new Error("Der aktive Account konnte fuer die Beziehungsgruppe nicht bestimmt werden.");
  }
  const response = await collectGraphPage(auth, endpoint, actorDid, cursor, limit, profileSource);
  const profiles = response.profiles.filter((profile) => {
    return isThreadExplorerRelationshipProfileMatch(profile, source);
  });
  const items = await loadThreadExplorerRelationshipPosts(auth, profiles);
  return {
    items: sortThreadExplorerFeedItemsChronologically(items),
    cursor: response.cursor,
  };
}

/**
 * Returns a normalized Thread Explorer actor feed mode.
 * @param {string} mode - Raw mode from the UI.
 * @returns {string} One of posts, replies, or all.
 */
function normalizeThreadExplorerActorFeedMode(mode) {
  const normalizedMode = String(mode || "").trim();
  if (normalizedMode === "replies") {
    return "replies";
  }
  if (normalizedMode === "all") {
    return "all";
  }
  return "posts";
}

/**
 * Checks whether a normalized post matches the Actor-Fokus feed mode.
 * @param {object} post - Normalized Thread Explorer post.
 * @param {string} mode - Actor feed mode.
 * @returns {boolean} True when the post belongs in the mode.
 */
function isThreadExplorerActorFeedPostMatch(post = {}, mode = "posts") {
  const isReply = Boolean(post.rootUri && post.uri && post.rootUri !== post.uri);
  if (mode === "all") {
    return true;
  }
  if (mode === "replies") {
    return isReply;
  }
  return !isReply;
}

/**
 * Loads posts and replies from one account for the Thread Explorer Actor-Fokus.
 * @param {object} payload - Actor, mode, cursor and limit from the UI.
 * @returns {Promise<object>} Actor feed items and next cursor.
 */
async function loadThreadExplorerActorFeed(payload = {}) {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const requestedActor = String(payload?.actor || "").trim().replace(/^@+/, "");
  if (!requestedActor) {
    throw createServiceWorkerError("Bitte zuerst einen Account eingeben.", "THREAD_EXPLORER_ACCOUNT_MISSING");
  }
  const headers = {
    authorization: `Bearer ${activeAuth.session.accessJwt}`,
  };
  const resolveCache = new Map();
  let actor = requestedActor;
  if (!requestedActor.startsWith("did:")) {
    const resolvedDid = await resolveHandleToDid(requestedActor, activeAuth, resolveCache);
    if (!resolvedDid) {
      throw createServiceWorkerError(`Der Account "${requestedActor}" wurde nicht gefunden.`, "THREAD_EXPLORER_ACCOUNT_NOT_FOUND", {
        actor: requestedActor,
      });
    }
    actor = resolvedDid;
  }

  const mode = normalizeThreadExplorerActorFeedMode(payload?.mode);
  const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 30));
  const targetCount = Math.min(50, Math.max(10, limit));
  const items = [];
  const seenUris = new Set();
  let cursor = String(payload?.cursor || "").trim();
  let nextCursor = "";
  let pageCount = 0;

  while (items.length < targetCount && pageCount < 5) {
    const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
      actor,
      limit,
      cursor: cursor || undefined,
    }, {
      headers,
      base: authXrpcBase(activeAuth),
    });

    let feed = [];
    if (Array.isArray(response?.feed)) {
      feed = response.feed;
    }

    for (const entry of feed) {
      const post = normalizeThreadExplorerPost(entry?.post || {});
      if (!post) {
        continue;
      }
      if (!isThreadExplorerActorFeedPostMatch(post, mode)) {
        continue;
      }
      if (seenUris.has(post.uri)) {
        continue;
      }
      seenUris.add(post.uri);
      items.push({
        post,
        reason: entry?.reason || null,
      });
      if (items.length >= targetCount) {
        break;
      }
    }

    nextCursor = String(response?.cursor || "").trim();
    cursor = nextCursor;
    pageCount += 1;
    if (!nextCursor || feed.length === 0) {
      break;
    }
  }

  const existingItems = await filterExistingThreadExplorerFeedItems(activeAuth, items);
  return {
    items: sortThreadExplorerFeedItemsChronologically(existingItems).slice(0, targetCount),
    cursor: nextCursor,
    mode,
  };
}

/**
 * Loads a live timeline slice for the Thread Explorer.
 * @param {object} payload - Source, limit, and cursor values from the app.
 * @returns {Promise<object>} Feed items, next cursor, and source metadata.
 */
async function loadThreadExplorerFeed(payload = {}) {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const source = String(payload?.source || "follows").trim();
  const feedUri = source.startsWith("feed:") ? source.slice(5).trim() : "";
  const isSearchSource = source.startsWith("search:");
  const limit = Math.min(100, Math.max(10, Number(payload?.limit) || 50));
  const targetCount = Math.min(50, Math.max(10, limit));
  const items = [];
  let cursor = String(payload?.cursor || "").trim();
  let nextCursor = "";
  let pageCount = 0;
  const seenThreadRoots = new Set();

  if (isThreadExplorerRelationshipSource(source)) {
    const relationshipResult = await loadThreadExplorerRelationshipFeed(activeAuth, source, cursor, limit);
    const existingRelationshipItems = await filterExistingThreadExplorerFeedItems(activeAuth, relationshipResult.items);
    return {
      source,
      items: sortThreadExplorerFeedItemsChronologically(existingRelationshipItems).slice(0, targetCount),
      cursor: relationshipResult.cursor,
    };
  }

  while (items.length < targetCount && pageCount < 4) {
    let endpoint = "app.bsky.feed.getTimeline";
    const params = {
      limit,
      cursor,
    };
    if (isSearchSource) {
      endpoint = "app.bsky.feed.searchPosts";
      Object.assign(params, buildThreadExplorerSearchPostsParams(payload?.search || {}));
    } else if (feedUri) {
      endpoint = "app.bsky.feed.getFeed";
      params.feed = feedUri;
    }

    const response = await bskyGet(endpoint, params, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });

    let feed = [];
    if (isSearchSource && Array.isArray(response?.posts)) {
      feed = response.posts.map((post) => ({ post }));
    } else if (Array.isArray(response?.feed)) {
      feed = response.feed;
    }
    feed.forEach((entry) => {
      const post = normalizeThreadExplorerPost(entry?.post || {});
      if (!post) {
        return;
      }
      if (isSearchSource) {
        const rootKey = String(post.rootUri || post.uri || "").trim();
        if (rootKey && seenThreadRoots.has(rootKey)) {
          return;
        }
        if (rootKey) {
          seenThreadRoots.add(rootKey);
        }
      }
      if (source === "mutuals") {
        if (!post.author.followingViewer || !post.author.followedByViewer) {
          return;
        }
      }
      items.push({
        post,
        reason: entry?.reason || null,
      });
    });

    nextCursor = String(response?.cursor || "").trim();
    cursor = nextCursor;
    pageCount += 1;
    if (!nextCursor || feed.length === 0) {
      break;
    }
  }

  const existingItems = await filterExistingThreadExplorerFeedItems(activeAuth, items);
  return {
    source,
    items: sortThreadExplorerFeedItemsChronologically(existingItems).slice(0, targetCount),
    cursor: nextCursor,
  };
}

/**
 * Builds safe searchPosts query params for Thread Explorer saved searches.
 * @param {object} search - Saved search params from app settings.
 * @returns {object} Query params accepted by app.bsky.feed.searchPosts.
 */
function buildThreadExplorerSearchPostsParams(search = {}) {
  const params = {};
  const q = String(search?.q || "").trim();
  const tags = Array.isArray(search?.tag) ? search.tag : [];
  if (q) {
    params.q = q;
  } else if (tags.length > 0) {
    params.q = `#${String(tags[0] || "").replace(/^#+/, "")}`;
  }

  const normalizedTags = tags.map((tag) => String(tag || "").trim().replace(/^#+/, "")).filter(Boolean);
  if (normalizedTags.length > 0) {
    params.tag = normalizedTags.slice(0, 8);
  }

  const sort = String(search?.sort || "").trim();
  if (sort === "top") {
    params.sort = "top";
  } else {
    params.sort = "latest";
  }

  ["since", "until", "author", "mentions", "lang", "domain", "url"].forEach((key) => {
    const value = String(search?.[key] || "").trim();
    if (value) {
      params[key] = value;
    }
  });

  if (!params.q && !params.author && !params.domain && !params.url) {
    throw new Error("Die gespeicherte Suche enthaelt keinen nutzbaren Suchparameter.");
  }

  return params;
}

/**
 * Resolves a bsky, mu.social, or at:// post URL into an AT URI for Thread Explorer.
 * @param {object} payload - Contains the post URL.
 * @returns {Promise<object>} Resolved post URI and original source URL.
 */
async function resolveThreadExplorerPostUrl(payload = {}) {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const parsedSource = parseArchiveThreadSource(payload?.url);
  const resolveCache = new Map();
  let actorDid = parsedSource.actor;

  if (!actorDid.startsWith("did:")) {
    actorDid = await resolveHandleToDid(parsedSource.actor, activeAuth, resolveCache);
  }

  if (!actorDid) {
    throw new Error("Die Posting-URL konnte keinem Bluesky-Account zugeordnet werden.");
  }

  let uri = parsedSource.entryUri;
  if (!uri) {
    uri = `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
  }

  return {
    uri,
    sourceUrl: parsedSource.sourceUrl,
  };
}

/**
 * Collects unique authors with avatar URLs from a Thread Explorer tree.
 * @param {object|null} node - Thread Explorer tree node.
 * @param {Map<string, object>} authors - Mutable author map keyed by DID and avatar URL.
 * @returns {Map<string, object>} Author map with unique avatar entries.
 */
function collectThreadExplorerAvatarAuthors(node = null, authors = new Map()) {
  if (!node || typeof node !== "object") {
    return authors;
  }

  const author = node.post?.author || {};
  const did = String(author.did || "").trim();
  const avatar = String(author.avatar || "").trim();
  if (did && avatar) {
    authors.set(`${did}|${avatar}`, {
      did,
      avatar,
      handle: String(author.handle || did).trim(),
      displayName: String(author.displayName || author.handle || did).trim(),
    });
  }

  const quoteAuthor = node.post?.quoteCard?.author || {};
  const quoteDid = String(quoteAuthor.did || "").trim();
  const quoteAvatar = String(quoteAuthor.avatar || "").trim();
  if (quoteDid && quoteAvatar) {
    authors.set(`${quoteDid}|${quoteAvatar}`, {
      did: quoteDid,
      avatar: quoteAvatar,
      handle: String(quoteAuthor.handle || quoteDid).trim(),
      displayName: String(quoteAuthor.displayName || quoteAuthor.handle || quoteDid).trim(),
    });
  }

  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      collectThreadExplorerAvatarAuthors(reply, authors);
    });
  }

  return authors;
}

/**
 * Converts an avatar cache asset into a browser-ready data URI.
 * @param {object} asset - Cached avatar asset.
 * @returns {string} Data URI for the cached avatar.
 */
function accountAvatarAssetToDataUri(asset = {}) {
  const type = String(asset.type || "image/jpeg").trim() || "image/jpeg";
  return bytesToDataUrl(asset.bytes, type);
}

/**
 * Resolves a promise with null when a Thread Explorer cache read takes too long.
 * @param {Promise<any>} promise - Cache read promise.
 * @returns {Promise<any|null>} Original value or null on timeout/error.
 */
function withThreadExplorerMediaCacheReadTimeout(promise) {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(null);
    }, THREAD_EXPLORER_MEDIA_CACHE_READ_TIMEOUT_MS);

    promise.then((value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    }).catch(() => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(null);
    });
  });
}

/**
 * Reads a readable Thread Explorer media asset from the remote media cache.
 * @param {string} url - Original remote media URL used as cache key.
 * @param {Cache|null} cache - Already opened remote media cache.
 * @returns {Promise<{type: string, bytes: Uint8Array}|null>} Cached media blob or null.
 */
async function readThreadExplorerRemoteMediaCacheBlob(url = "", cache = null) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return null;
  }

  let mediaCache = cache;
  if (!mediaCache) {
    mediaCache = await caches.open(REMOTE_MEDIA_CACHE_NAME);
  }
  const response = await withThreadExplorerMediaCacheReadTimeout(mediaCache.match(normalizedUrl));
  if (!response || response.type === "opaque") {
    return null;
  }

  try {
    const bytes = await withThreadExplorerMediaCacheReadTimeout(response.arrayBuffer());
    if (!bytes) {
      return null;
    }
    return {
      type: response.headers.get("content-type") || "application/octet-stream",
      bytes: new Uint8Array(bytes),
    };
  } catch {
    return null;
  }
}

/**
 * Stores one readable Thread Explorer media asset in the remote media cache.
 * @param {string} url - Original remote media URL used as cache key.
 * @param {{type?: string, bytes?: Uint8Array}} blob - Media bytes and MIME type.
 * @param {Cache|null} cache - Already opened remote media cache.
 * @returns {Promise<void>} Resolves after the cache write was attempted.
 */
async function writeThreadExplorerRemoteMediaCacheBlob(url = "", blob = {}, cache = null) {
  const normalizedUrl = String(url || "").trim();
  const bytes = blob?.bytes instanceof Uint8Array ? blob.bytes : new Uint8Array(blob?.bytes || []);
  if (!normalizedUrl || bytes.length === 0) {
    return;
  }

  const type = String(blob.type || "application/octet-stream").trim() || "application/octet-stream";
  let mediaCache = cache;
  if (!mediaCache) {
    mediaCache = await caches.open(REMOTE_MEDIA_CACHE_NAME);
  }
  const response = new Response(bytes, {
    headers: {
      "content-type": type,
      "cache-control": "max-age=86400",
    },
  });
  await mediaCache.put(normalizedUrl, response).catch(() => {});
}

/**
 * Downloads missing Thread Explorer avatars into the shared avatar cache.
 * @param {object} payload - Contains the currently loaded Thread Explorer tree.
 * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
 * @returns {Promise<object>} Hydration summary with cache TTL and hydrated avatar count.
 */
async function hydrateThreadExplorerAvatars(payload = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const serviceCache = new Map();
  const now = Date.now();
  const cache = pruneAccountAvatarCache(await getAccountAvatarCache(), now);
  const assets = normalizeAccountAvatarAssets(cache?.assets);
  const authors = Array.from(collectThreadExplorerAvatarAuthors(payload?.root).values());
  let hydratedCount = 0;
  let processedCount = 0;
  let skippedCount = 0;
  const totalCount = authors.length;

  const buildProgress = () => ({
    phase: "thread_explorer_avatars",
    current: processedCount,
    total: totalCount,
    remaining: Math.max(0, totalCount - processedCount),
    hydrated: hydratedCount,
    skipped: skippedCount,
  });

  notifyProgress(buildProgress());
  const stopHeartbeat = startThreadExplorerMediaHydrationHeartbeat(buildProgress, notifyProgress);

  try {
    await mapWithConcurrency(authors, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (author) => {
      let asset = assets.find((entry) => entry.did === author.did && entry.url === author.avatar);
      if (!asset) {
        try {
          const blob = await withThreadExplorerMediaHydrationTimeout(
            downloadRemoteAssetViaBlob(activeAuth, author.avatar, author.did, serviceCache),
            THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
          );
          const extension = getAssetExtensionFromMimeType(blob.type);
          const slug = String(author.handle || author.did || "account")
            .replace(/[^\w.-]+/g, "-")
            .slice(0, 60) || "account";
          asset = {
            did: author.did,
            url: author.avatar,
            path: `account-avatars/${slug}.${extension}`,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            cachedAt: now,
            bytes: blob.bytes,
          };
          for (let index = assets.length - 1; index >= 0; index -= 1) {
            if (assets[index].did === author.did) {
              assets.splice(index, 1);
            }
          }
          assets.push(asset);
        } catch {
          asset = null;
        }
      }

      if (asset) {
        hydratedCount += 1;
      } else {
        skippedCount += 1;
      }
      processedCount += 1;
      notifyProgress(buildProgress());
    });
  } finally {
    stopHeartbeat();
  }

  await writeStoredValue(ACCOUNT_AVATAR_CACHE_KEY, {
    ...cache,
    assets,
    updatedAt: new Date(now).toISOString(),
  });

  return {
    ttlMs: ACCOUNT_AVATAR_CACHE_TTL_MS,
    avatarCount: hydratedCount,
  };
}

/**
 * Adds one Thread Explorer media URL to a collection if it can be loaded.
 * @param {Map<string, object>} media - Mutable media map keyed by URL.
 * @param {string} url - Remote media URL.
 * @param {string} did - Fallback actor DID for blob resolution.
 * @returns {void}
 */
function addThreadExplorerMediaHydrationUrl(media, url, did) {
  const source = String(url || "").trim();
  if (!source || source.startsWith("data:")) {
    return;
  }
  if (media.has(source)) {
    return;
  }
  media.set(source, {
    url: source,
    did: String(did || "").trim(),
  });
}

/**
 * Collects remote media URLs from a Thread Explorer tree node.
 * @param {object|null} node - Thread Explorer tree node.
 * @param {Map<string, object>} media - Mutable media map keyed by URL.
 * @returns {Map<string, object>} Media map.
 */
function collectThreadExplorerMediaHydrationUrls(node = null, media = new Map()) {
  if (!node || typeof node !== "object") {
    return media;
  }

  const post = node.post || {};
  const authorDid = String(post.author?.did || "").trim();
  if (Array.isArray(post.images)) {
    post.images.forEach((image) => {
      addThreadExplorerMediaHydrationUrl(media, image?.fullsize || image?.thumb || "", authorDid);
      addThreadExplorerMediaHydrationUrl(media, image?.thumb || image?.fullsize || "", authorDid);
    });
  }
  addThreadExplorerMediaHydrationUrl(media, post.externalCard?.thumb || "", authorDid);

  const quote = post.quoteCard || null;
  if (quote && typeof quote === "object") {
    const quoteAuthorDid = String(quote.author?.did || authorDid || "").trim();
    if (Array.isArray(quote.images)) {
      quote.images.forEach((image) => {
        addThreadExplorerMediaHydrationUrl(media, image?.fullsize || image?.thumb || "", quoteAuthorDid);
        addThreadExplorerMediaHydrationUrl(media, image?.thumb || image?.fullsize || "", quoteAuthorDid);
      });
    }
    addThreadExplorerMediaHydrationUrl(media, quote.externalCard?.thumb || "", quoteAuthorDid);
  }

  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      collectThreadExplorerMediaHydrationUrls(reply, media);
    });
  }

  return media;
}

/**
 * Builds Thread Explorer media hydration entries from an explicit payload list or a tree root.
 * @param {object} payload - Hydration payload with root or mediaEntries.
 * @returns {object[]} Unique media entries with url and fallback DID.
 */
function collectThreadExplorerMediaHydrationEntries(payload = {}) {
  let explicitEntries = [];
  if (Array.isArray(payload?.mediaEntries)) {
    explicitEntries = payload.mediaEntries;
  }
  const media = new Map();
  if (explicitEntries.length > 0) {
    explicitEntries.forEach((entry) => {
      addThreadExplorerMediaHydrationUrl(media, entry?.url || "", entry?.did || "");
    });
    return Array.from(media.values());
  }

  return Array.from(collectThreadExplorerMediaHydrationUrls(payload?.root).values());
}

/**
 * Rejects a promise when one Thread Explorer media item takes too long.
 * @param {Promise<any>} promise - Original media download promise.
 * @param {number} timeoutMs - Timeout in milliseconds.
 * @returns {Promise<any>} Original result or timeout rejection.
 */
function withThreadExplorerMediaHydrationTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Thread Explorer media item timed out."));
    }, timeoutMs);
    promise.then((value) => {
      clearTimeout(timeoutId);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Checks whether a Thread Explorer media URL should skip direct CORS fetching.
 * @param {string} url - Remote media URL.
 * @returns {boolean} True when the blob/PDS path should be used first.
 */
function shouldSkipThreadExplorerDirectMediaFetch(url = "") {
  const blobInfo = parseBlobUrlInfo(url);
  if (blobInfo?.cid) {
    return true;
  }
  return false;
}

/**
 * Downloads one Thread Explorer media asset through the fastest available path.
 * @param {object} auth - Authenticated account entry.
 * @param {object} entry - Media entry with url and fallback DID.
 * @param {Map<string, string>} serviceCache - DID-to-PDS cache for blob fallback.
 * @returns {Promise<{type: string, bytes: Uint8Array}>} Downloaded media payload.
 */
async function downloadThreadExplorerMediaAssetFast(auth, entry = {}, serviceCache = new Map()) {
  if (shouldSkipThreadExplorerDirectMediaFetch(entry.url)) {
    return withThreadExplorerMediaHydrationTimeout(
      downloadRemoteAssetViaBlob(auth, entry.url, entry.did || auth.session?.did || "", serviceCache),
      THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
    );
  }

  try {
    return await withThreadExplorerMediaHydrationTimeout(
      downloadRemoteAsset(entry.url),
      THREAD_EXPLORER_MEDIA_HYDRATION_DIRECT_TIMEOUT_MS,
    );
  } catch {
    return withThreadExplorerMediaHydrationTimeout(
      downloadRemoteAssetViaBlob(auth, entry.url, entry.did || auth.session?.did || "", serviceCache),
      THREAD_EXPLORER_MEDIA_HYDRATION_ITEM_TIMEOUT_MS,
    );
  }
}

/**
 * Starts periodic Thread Explorer media progress updates.
 * @param {() => object} getProgress - Returns the latest progress payload.
 * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
 * @returns {() => void} Stops the heartbeat.
 */
function startThreadExplorerMediaHydrationHeartbeat(getProgress, notifyProgress) {
  const heartbeatId = setInterval(() => {
    notifyProgress({
      ...getProgress(),
      heartbeat: true,
    });
  }, THREAD_EXPLORER_MEDIA_HYDRATION_HEARTBEAT_MS);
  return () => {
    clearInterval(heartbeatId);
  };
}

/**
 * Downloads Thread Explorer media needed by the PNG snapshot and returns data URIs.
 * @param {object} payload - Contains the currently loaded Thread Explorer tree.
 * @param {(progress: object) => void} notifyProgress - Sends progress updates to the page.
 * @returns {Promise<object>} Media data URI map and hydrated count.
 */
async function hydrateThreadExplorerMedia(payload = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const serviceCache = new Map();
  const remoteMediaCache = await caches.open(REMOTE_MEDIA_CACHE_NAME);
  const mediaEntries = collectThreadExplorerMediaHydrationEntries(payload);
  const media = {};
  let hydratedCount = 0;
  let processedCount = 0;
  let skippedCount = 0;
  let cacheHitCount = 0;
  let downloadedCount = 0;
  const totalCount = mediaEntries.length;

  const buildProgress = () => ({
    phase: "thread_explorer_media",
    current: processedCount,
    total: totalCount,
    remaining: Math.max(0, totalCount - processedCount),
    hydrated: hydratedCount,
    skipped: skippedCount,
    cacheHits: cacheHitCount,
    downloaded: downloadedCount,
    concurrency: THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY,
  });

  notifyProgress(buildProgress());
  const stopHeartbeat = startThreadExplorerMediaHydrationHeartbeat(buildProgress, notifyProgress);
  const cacheWritePromises = [];

  try {
    await mapWithConcurrency(mediaEntries, THREAD_EXPLORER_MEDIA_HYDRATION_CONCURRENCY, async (entry) => {
      try {
        let blob = await readThreadExplorerRemoteMediaCacheBlob(entry.url, remoteMediaCache);
        let wasCacheHit = false;
        if (blob) {
          wasCacheHit = true;
          cacheHitCount += 1;
        } else {
          blob = await downloadThreadExplorerMediaAssetFast(activeAuth, entry, serviceCache);
          downloadedCount += 1;
        }
        const normalizedBlob = normalizeArchiveImageBlob(blob);
        if (!normalizedBlob.bytes?.length) {
          skippedCount += 1;
          return;
        }
        media[entry.url] = bytesToDataUrl(normalizedBlob.bytes, normalizedBlob.type || "image/jpeg");
        if (!wasCacheHit) {
          cacheWritePromises.push(writeThreadExplorerRemoteMediaCacheBlob(entry.url, normalizedBlob, remoteMediaCache));
        }
        hydratedCount += 1;
      } catch {
        skippedCount += 1;
        // Keep the snapshot export running even when individual remote images cannot be loaded.
      } finally {
        processedCount += 1;
        notifyProgress(buildProgress());
      }
    });
  } finally {
    stopHeartbeat();
  }
  void Promise.allSettled(cacheWritePromises);

  return {
    media,
    mediaCount: hydratedCount,
  };
}

/**
 * Loads a live thread for the Thread Explorer.
 * @param {object} payload - Contains the selected post URI.
 * @returns {Promise<object>} Normalized thread tree and post count.
 */
async function loadThreadExplorerThread(payload = {}) {
  const uri = String(payload?.uri || "").trim();
  if (!uri) {
    throw new Error("Thread-URI fehlt.");
  }

  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const selectedResponse = await fetchThreadExplorerThreadView(activeAuth, uri, 100);
  let root = normalizeThreadExplorerThreadRoot(selectedResponse?.thread || {});
  const rootUri = String(root?.post?.uri || "").trim();
  const rootIsDeletedAnchor = root?.post?.isDeletedThreadAnchor === true;

  if (rootUri && rootUri !== uri && !rootIsDeletedAnchor) {
    const rootResponse = await fetchThreadExplorerThreadView(activeAuth, rootUri, 0);
    const fullRoot = normalizeThreadExplorerThreadRoot(rootResponse?.thread || {});
    if (fullRoot) {
      root = mergeThreadExplorerSelectedPath(fullRoot, root, uri);
    }
  }

  return {
    selectedUri: uri,
    root,
    postCount: countThreadExplorerTreePosts(root),
  };
}

/**
 * Normalizes actor entries returned by interaction endpoints.
 * @param {object} actor - Actor profile object.
 * @returns {object|null} Compact actor entry, or null.
 */
function normalizeThreadExplorerReactionActor(actor = {}) {
  const normalized = normalizeThreadExplorerActor(actor);
  if (!normalized.did && !normalized.handle) {
    return null;
  }
  return normalized;
}

/**
 * Loads accounts related to a post interaction for Thread Explorer popups.
 * @param {object} payload - Reaction type, post URI, optional CID, and limit.
 * @returns {Promise<object>} Actor entries and optional cursor.
 */
async function loadThreadExplorerReactions(payload = {}) {
  const type = String(payload?.type || "").trim().toLowerCase();
  const uri = String(payload?.uri || "").trim();
  const cid = String(payload?.cid || "").trim();
  const limit = Math.min(100, Math.max(1, Number(payload?.limit) || 100));
  if (!uri) {
    throw new Error("Post-URI fehlt.");
  }

  const auth = await ensureSession();
  const activeAuth = await refreshAuthReference(auth);
  const requestOptions = {
    headers: {
      authorization: `Bearer ${activeAuth.session.accessJwt}`,
    },
    base: authXrpcBase(activeAuth),
  };
  const params = {
    uri,
    limit,
  };
  if (cid) {
    params.cid = cid;
  }

  let response = null;
  let rawActors = [];
  if (type === "likes") {
    response = await bskyGet("app.bsky.feed.getLikes", params, requestOptions);
    if (Array.isArray(response?.likes)) {
      rawActors = response.likes.map((entry) => entry?.actor);
    }
  } else if (type === "reposts") {
    response = await bskyGet("app.bsky.feed.getRepostedBy", params, requestOptions);
    if (Array.isArray(response?.repostedBy)) {
      rawActors = response.repostedBy;
    }
  } else if (type === "quotes") {
    response = await bskyGet("app.bsky.feed.getQuotes", params, requestOptions);
    if (Array.isArray(response?.posts)) {
      rawActors = response.posts.map((post) => post?.author);
    }
  } else {
    throw new Error("Unbekannter Interaktionstyp.");
  }

  const seen = new Set();
  const actors = [];
  rawActors.forEach((actor) => {
    const normalizedActor = normalizeThreadExplorerReactionActor(actor);
    if (!normalizedActor) {
      return;
    }
    const key = normalizedActor.did || normalizedActor.handle;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    actors.push(normalizedActor);
  });

  return {
    type,
    actors,
    cursor: String(response?.cursor || "").trim(),
  };
}

const NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT = 100;
const NETWORK_ACTIVITY_SAMPLE_POSTS = 200;
const NETWORK_ACTIVITY_WINDOWS_DAYS = [14, 60];

async function collectRecentAuthorPosts(auth, actorDid, limit = NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT) {
  const collected = [];
  let cursor = "";

  while (collected.length < limit) {
    const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
      actor: actorDid,
      limit: Math.min(100, limit - collected.length),
      cursor: cursor || undefined,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    const feedItems = Array.isArray(response?.feed) ? response.feed : [];
    for (const item of feedItems) {
      const post = item?.post || null;
      if (!post?.uri || post.author?.did !== actorDid) {
        continue;
      }
      collected.push({
        uri: post.uri,
        cid: post.cid || "",
        createdAt: String(post.record?.createdAt || post.indexedAt || "").trim(),
        viewerLike: String(post.viewer?.like || "").trim(),
        likeCount: Number(post.likeCount) || 0,
      });
      if (collected.length >= limit) {
        break;
      }
    }

    cursor = String(response?.cursor || "");
    if (!cursor || !feedItems.length) {
      break;
    }
  }

  return collected;
}

async function countRecentLikesFromActorOnPosts(auth, actorDid, posts = []) {
  if (!actorDid || !posts.length) {
    return 0;
  }

  const targetUris = new Set(posts.map((post) => post.uri).filter(Boolean));
  const oldestCreatedAt = posts
    .map((post) => Date.parse(post.createdAt || ""))
    .filter((value) => Number.isFinite(value))
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const matched = new Set();
  let cursor = "";
  let pageCount = 0;

  while (pageCount < 8 && matched.size < targetUris.size) {
    const response = await bskyGet("app.bsky.notification.listNotifications", {
      limit: 100,
      cursor: cursor || undefined,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    const notifications = Array.isArray(response?.notifications) ? response.notifications : [];
    pageCount += 1;
    let stopForAge = false;

    for (const notification of notifications) {
      const indexedAt = Date.parse(String(notification?.indexedAt || "").trim());
      if (Number.isFinite(oldestCreatedAt) && Number.isFinite(indexedAt) && indexedAt < oldestCreatedAt) {
        stopForAge = true;
      }
      if (notification?.reason !== "like" || notification?.author?.did !== actorDid) {
        continue;
      }
      const subjectUri = String(notification?.reasonSubject || "").trim();
      if (targetUris.has(subjectUri)) {
        matched.add(subjectUri);
      }
    }

    cursor = String(response?.cursor || "");
    if (!cursor || !notifications.length || stopForAge) {
      break;
    }
  }

  return matched.size;
}

function collectNetworkActivityStats(posts = [], nowTimestamp = Date.now()) {
  const windows = {};
  NETWORK_ACTIVITY_WINDOWS_DAYS.forEach((days) => {
    windows[days] = {
      postsCount: 0,
      likesReceivedCount: 0,
    };
  });

  let latestPostAt = "";
  let latestPostTimestamp = Number.NEGATIVE_INFINITY;

  posts.forEach((post) => {
    const createdAt = String(post?.createdAt || "").trim();
    const createdTimestamp = Date.parse(createdAt);
    if (!Number.isFinite(createdTimestamp)) {
      return;
    }

    if (createdTimestamp > latestPostTimestamp) {
      latestPostTimestamp = createdTimestamp;
      latestPostAt = createdAt;
    }

    NETWORK_ACTIVITY_WINDOWS_DAYS.forEach((days) => {
      const windowMs = days * 24 * 60 * 60 * 1000;
      if ((nowTimestamp - createdTimestamp) <= windowMs) {
        windows[days].postsCount += 1;
        windows[days].likesReceivedCount += Number(post?.likeCount) || 0;
      }
    });
  });

  return {
    samplePosts: posts.length,
    latestPostAt,
    windows,
  };
}

async function collectNetworkLikeStats(auth, actorDid) {
  const [actorPosts, ownPosts] = await Promise.all([
    collectRecentAuthorPosts(auth, actorDid, NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT),
    collectRecentAuthorPosts(auth, auth.session.did, NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT),
  ]);

  const youLikeCount = actorPosts.filter((post) => Boolean(post.viewerLike)).length;
  const likesYouCount = await countRecentLikesFromActorOnPosts(auth, actorDid, ownPosts);

  return {
    samplePerAccount: NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT,
    totalSample: actorPosts.length + ownPosts.length,
    actorPostsSampled: actorPosts.length,
    ownPostsSampled: ownPosts.length,
    youLikeCount,
    likesYouCount,
    mutualLikesCount: youLikeCount + likesYouCount,
  };
}

async function collectNetworkActivityForActor(auth, actorDid) {
  const actorPosts = await collectRecentAuthorPosts(auth, actorDid, NETWORK_ACTIVITY_SAMPLE_POSTS);
  return collectNetworkActivityStats(actorPosts);
}

async function collectGraphPage(auth, endpoint, actorDid, cursor, limit, source) {
  const response = await bskyGet(endpoint, {
    actor: actorDid,
    limit,
    cursor: cursor || undefined,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  });
  const fieldName = endpoint.endsWith("Followers") ? "followers" : "follows";
  return {
    profiles: Array.isArray(response?.[fieldName])
      ? response[fieldName].map((profile) => normalizeNetworkProfile(profile, source)).filter((profile) => profile.did)
      : [],
    cursor: String(response?.cursor || ""),
  };
}

async function collectGraphWave(auth, endpoint, actorDid, cursor, targetTotal, source, notifyProgress, progressLabel) {
  const maxPage = 100;
  const collected = [];
  let nextCursor = String(cursor || "");
  let pages = 0;

  do {
    const remaining = Math.max(1, targetTotal - collected.length);
    const page = await collectGraphPage(auth, endpoint, actorDid, nextCursor, Math.min(maxPage, remaining), source);
    collected.push(...page.profiles);
    nextCursor = page.cursor;
    pages += 1;
    notifyProgress({
      title: "Netzwerk wird geladen",
      step: progressLabel,
      percent: endpoint.endsWith("Followers") ? 30 : 68,
      detail: `${collected.length}/${targetTotal} geladen · Seite ${pages}`,
    });
  } while (nextCursor && collected.length < targetTotal);

  return {
    profiles: collected,
    cursor: nextCursor,
  };
}

function mergeNormalizedNetworkProfile(existing, incoming) {
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
    did: incoming.did || existing.did || "",
    handle: incoming.handle || existing.handle || "",
    displayName: incoming.displayName || existing.displayName || incoming.handle || existing.handle || "",
    avatar: incoming.avatar || existing.avatar || "",
    description: incoming.description || existing.description || "",
    followersCount: Number(incoming.followersCount) || Number(existing.followersCount) || 0,
    followsCount: Number(incoming.followsCount) || Number(existing.followsCount) || 0,
    postsCount: Number(incoming.postsCount) || Number(existing.postsCount) || 0,
    followingViewer: existing.followingViewer === true || incoming.followingViewer === true,
    followedByViewer: existing.followedByViewer === true || incoming.followedByViewer === true,
  };
}


async function loadNetworkSlice({ actor = "", followerCursor = "", followCursor = "", limit = 500 } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const targetSize = Math.max(100, Math.min(500, Number(limit) || 500));
  const requestedActor = String(actor || "").trim() || auth.session.did;

  notifyProgress({
    title: "Netzwerk wird geladen",
    step: "Profil wird geladen …",
    percent: 8,
    detail: "",
  });
  const viewerProfilePromise = bskyGet("app.bsky.actor.getProfile", {
    actor: requestedActor,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  }).catch(() => null);

  const followerResponse = await collectGraphWave(
    auth,
    "app.bsky.graph.getFollowers",
    requestedActor,
    followerCursor,
    targetSize,
    "followers",
    notifyProgress,
    followerCursor ? "Nächste Follower-Welle" : "Erste Follower-Welle",
  );

  const followsResponse = await collectGraphWave(
    auth,
    "app.bsky.graph.getFollows",
    requestedActor,
    followCursor,
    targetSize,
    "following",
    notifyProgress,
    followCursor ? "Nächste Following-Welle" : "Erste Following-Welle",
  );

  const viewerProfile = await viewerProfilePromise;
  const followers = followerResponse.profiles;
  const follows = followsResponse.profiles;

  notifyProgress({
    title: "Netzwerk wird geladen",
    step: "Verbindungen werden aufbereitet …",
    percent: 86,
    detail: `${followers.length} Follower · ${follows.length} Following`,
  });

  return {
    viewer: viewerProfile
      ? normalizeNetworkProfile({
          ...viewerProfile,
          viewer: requestedActor === auth.session.did ? { following: true, followedBy: true } : {},
        }, "viewer")
      : {
          did: requestedActor,
          handle: auth.handle || auth.session.handle || "",
          displayName: auth.handle || auth.session.handle || "",
          avatar: auth.avatar || "",
          description: "",
          followersCount: 0,
      followsCount: 0,
      postsCount: 0,
      followingViewer: true,
      followedByViewer: true,
    },
    followers,
    follows,
    followerCursor: String(followerResponse.cursor || ""),
    followCursor: String(followsResponse.cursor || ""),
    hasMoreFollowers: Boolean(followerResponse.cursor),
    hasMoreFollows: Boolean(followsResponse.cursor),
    wave: {
      followers: followers.length,
      follows: follows.length,
    },
  };
}

async function loadNetworkActorFocus({ actor } = {}, notifyProgress = () => {}) {
  const actorDid = String(actor || "").trim();
  if (!actorDid) {
    throw new Error("Kein Account für den Fokus angegeben.");
  }

  const auth = await ensureSession();
  const headers = {
    authorization: `Bearer ${auth.session.accessJwt}`,
  };

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Profil wird aktualisiert …",
    percent: 16,
    detail: actorDid,
  });
  const profile = await bskyGet("app.bsky.actor.getProfile", {
    actor: actorDid,
  }, { headers, base: authXrpcBase(auth) });
  const viewer = profile?.viewer && typeof profile.viewer === "object" ? profile.viewer : {};

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Follow-Beziehung wird geprüft …",
    percent: 32,
    detail: actorDid,
  });
  const relationshipDates = await loadNetworkRelationshipDates(auth, viewer);

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Follower-Vorschau wird geladen …",
    percent: 48,
    detail: actorDid,
  });
  const followerPage = await collectGraphPage(auth, "app.bsky.graph.getFollowers", actorDid, "", 12, "followers");

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Following-Vorschau wird geladen …",
    percent: 78,
    detail: actorDid,
  });
  const followPage = await collectGraphPage(auth, "app.bsky.graph.getFollows", actorDid, "", 12, "following");

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Aktivität wird ausgewertet …",
    percent: 86,
    detail: `Bis zu ${NETWORK_ACTIVITY_SAMPLE_POSTS} aktuelle Posts`,
  });
  const activityStats = await collectNetworkActivityForActor(auth, actorDid);

  notifyProgress({
    title: "Fokus wird geladen",
    step: "Gegenseitige Likes werden geprüft …",
    percent: 90,
    detail: `Bis zu ${NETWORK_LIKE_SAMPLE_POSTS_PER_ACCOUNT} Posts je Account`,
  });
  const likeStats = await collectNetworkLikeStats(auth, actorDid);

  return {
    profile: normalizeNetworkProfile(profile, ""),
    relationshipDates,
    activityStats,
    likeStats,
    followersPreview: followerPage.profiles,
    followsPreview: followPage.profiles,
  };
}

async function loadNetworkCommonMutuals({ centerActor, focusActor } = {}, notifyProgress = () => {}) {
  const centerDid = String(centerActor || "").trim();
  const focusDid = String(focusActor || "").trim();
  if (!centerDid || !focusDid || centerDid === focusDid) {
    return {
      commonDids: [],
      commonProfiles: [],
    };
  }

  const auth = await ensureSession();
  notifyProgress({
    title: "Gemeinsame Mutuals werden geladen",
    step: "Mutuals des aktiven Accounts werden vollständig geladen …",
    percent: 6,
    detail: "",
  });
  const centerFollowers = await collectEntireGraph(
    auth,
    "app.bsky.graph.getFollowers",
    centerDid,
    "followers",
    notifyProgress,
    "Gemeinsame Mutuals werden geladen",
    "Follower des aktiven Accounts werden geladen …",
    18,
  );
  const centerFollows = await collectEntireGraph(
    auth,
    "app.bsky.graph.getFollows",
    centerDid,
    "following",
    notifyProgress,
    "Gemeinsame Mutuals werden geladen",
    "Following des aktiven Accounts werden geladen …",
    36,
  );

  notifyProgress({
    title: "Gemeinsame Mutuals werden geladen",
    step: "Follower des Fokus-Accounts werden geladen …",
    percent: 54,
    detail: `${centerFollowers.length + centerFollows.length} Profile des aktiven Accounts`,
  });
  const focusFollowers = await collectEntireGraph(
    auth,
    "app.bsky.graph.getFollowers",
    focusDid,
    "followers",
    notifyProgress,
    "Gemeinsame Mutuals werden geladen",
    "Follower des Fokus-Accounts werden geladen …",
    54,
  );
  const focusFollows = await collectEntireGraph(
    auth,
    "app.bsky.graph.getFollows",
    focusDid,
    "following",
    notifyProgress,
    "Gemeinsame Mutuals werden geladen",
    "Following des Fokus-Accounts werden geladen …",
    72,
  );

  const centerFollowerMap = new Map();
  centerFollowers.forEach((profile) => {
    if (profile?.did) {
      centerFollowerMap.set(profile.did, mergeNormalizedNetworkProfile(centerFollowerMap.get(profile.did) || null, profile));
    }
  });
  const centerFollowMap = new Map();
  centerFollows.forEach((profile) => {
    if (profile?.did) {
      centerFollowMap.set(profile.did, mergeNormalizedNetworkProfile(centerFollowMap.get(profile.did) || null, profile));
    }
  });
  const centerMutualDids = [...centerFollowerMap.keys()].filter((did) => centerFollowMap.has(did));
  const focusFollowerSet = new Set(
    focusFollowers.map((profile) => String(profile?.did || "").trim()).filter(Boolean),
  );
  const focusFollowSet = new Set(
    focusFollows.map((profile) => String(profile?.did || "").trim()).filter(Boolean),
  );
  const commonDids = centerMutualDids.filter((did) => focusFollowerSet.has(did) && focusFollowSet.has(did));
  const commonProfiles = commonDids
    .map((did) => mergeNormalizedNetworkProfile(centerFollowerMap.get(did) || null, centerFollowMap.get(did) || null))
    .filter((profile) => profile?.did);

  notifyProgress({
    title: "Gemeinsame Mutuals werden geladen",
    step: "Schnittmenge wird berechnet …",
    percent: 92,
    detail: `${commonDids.length} gemeinsame Mutuals gefunden`,
  });

  return {
    commonDids,
    commonProfiles,
  };
}


async function getRelationshipRecordCreatedAt(auth, recordUri) {
  const parsed = parseAtUri(recordUri);
  if (!parsed.did || !parsed.collection || !parsed.rkey) {
    return "";
  }

  const record = await bskyGet("com.atproto.repo.getRecord", {
    repo: parsed.did,
    collection: parsed.collection,
    rkey: parsed.rkey,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
  });

  return String(record?.value?.createdAt || "").trim();
}

async function loadNetworkRelationshipDates(auth, viewer = {}) {
  const youFollowSincePromise = typeof viewer.following === "string" && viewer.following.startsWith("at://")
    ? getRelationshipRecordCreatedAt(auth, String(viewer.following))
    : Promise.resolve("");
  const followsYouSincePromise = typeof viewer.followedBy === "string" && viewer.followedBy.startsWith("at://")
    ? getRelationshipRecordCreatedAt(auth, String(viewer.followedBy))
    : Promise.resolve("");

  const [youFollowSince, followsYouSince] = await Promise.all([
    youFollowSincePromise,
    followsYouSincePromise,
  ]);

  return {
    youFollowSince,
    followsYouSince,
  };
}

async function authStatus() {
  const state = await readStoredAuth();
  const activeAccount = state.accounts.find((entry) => entry.did && entry.did === state.activeDid);
  if (!activeAccount?.session?.did) {
    return { authenticated: false };
  }
  return buildAuthResponse(state, activeAccount);
}

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
  const searchPreferences = storedSettings?.searchPreferences && typeof storedSettings.searchPreferences === "object"
    ? storedSettings.searchPreferences
    : null;
  const searchResultState = normalizeStoredSearchResultState(storedSettings?.searchResultState);
  const localePreference = storedSettings?.localePreference || legacyLocalePreference;
  const locale = localePreference && localePreference !== "auto" ? localePreference : (browserLocale || "en");

    return {
      authenticated: Boolean(auth?.session?.did),
    identifier: auth?.identifier || "",
    handle: auth?.session?.handle || "",
    did: auth?.did || "",
    service: auth?.service || DEFAULT_LOGIN_SERVICE,
    webApp: auth?.webApp || resolvePostWebBase(auth?.service),
    accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
    accountAvatarAssets: normalizeAccountAvatarAssets(accountAvatarCache?.assets),
    draft: typeof draft === "string" ? draft : (draft?.sourceText || ""),
    locale,
    localePreference: localePreference || "auto",
    tipsVisible: storedSettings?.tipsVisible !== false,
      altTextRequired: storedSettings?.altTextRequired !== false,
      imageAutoResizeMode: normalizeImageAutoResizeMode(storedSettings?.imageAutoResizeMode),
      archiveExpertMode: normalizeArchiveExpertMode(storedSettings?.archiveExpertMode),
      themeMode: storedSettings?.themeMode === "dark" ? "dark" : "light",
      compactMode: storedSettings?.compactMode === true,
      sidebarCollapsedDesktop: storedSettings?.sidebarCollapsedDesktop === true,
      desktopLayoutVersion: Number.isFinite(Number(storedSettings?.desktopLayoutVersion))
        ? Number(storedSettings.desktopLayoutVersion)
        : null,
      sidebarWidthDesktop: Number.isFinite(Number(storedSettings?.sidebarWidthDesktop))
        ? Number(storedSettings.sidebarWidthDesktop)
        : null,
    composerWidthDesktop: Number.isFinite(Number(storedSettings?.composerWidthDesktop))
      ? Number(storedSettings.composerWidthDesktop)
      : null,
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
    hashtagPlacement: ["first", "last", "all-top", "all-bottom"].includes(storedSettings?.hashtagPlacement)
      ? storedSettings.hashtagPlacement
      : "first",
    segmentImages: hydratedSegmentImages,
    segmentLinkCards: normalizeSegmentLinkCards(draft?.segmentLinkCards || storedSettings?.segmentLinkCards),
    segmentOverrides: normalizeSegmentOverrides(draft?.segmentOverrides),
    replyTarget: normalizeStoredReplyTarget(draft?.replyTarget),
    postingHistory: normalizePostingHistory(storedSettings?.postingHistory),
    threadExplorerFavorites: Array.isArray(storedSettings?.threadExplorerFavorites)
      ? storedSettings.threadExplorerFavorites
      : [],
    threadExplorerState: normalizeStoredThreadExplorerState(storedSettings?.threadExplorerState),
    savedSearches: Array.isArray(storedSettings?.savedSearches)
      ? storedSettings.savedSearches
      : [],
    archivePreferences: storedSettings?.archivePreferences && typeof storedSettings.archivePreferences === "object"
      ? storedSettings.archivePreferences
      : null,
    analysisState: normalizeStoredAnalysisState(storedSettings?.analysisState),
  };
}

function normalizeStoredReplyTarget(target) {
  if (!target || typeof target !== "object") {
    return null;
  }
  return {
    ...target,
    mode: target.mode === "thread" ? "thread" : "post",
    sourceUrl: String(target.sourceUrl || ""),
  };
}

function normalizeStoredThreadExplorerState(state) {
  if (!state || typeof state !== "object") {
    return {
      actor: "",
      accountMode: "posts",
    };
  }

  const actor = String(state.actor || "").trim().replace(/^@+/, "");
  const accountMode = String(state.accountMode || "").trim();
  let normalizedAccountMode = "posts";
  if (accountMode === "replies") {
    normalizedAccountMode = "replies";
  } else if (accountMode === "all") {
    normalizedAccountMode = "all";
  }

  return {
    actor,
    accountMode: normalizedAccountMode,
  };
}

function normalizeImageAutoResizeMode(value) {
  return value === "fit" || value === "lossy" ? value : "off";
}

function normalizeArchiveExpertMode(value) {
  return value === true;
}


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

async function saveSettings(settings = {}) {
  const existing = await readStoredValue(SETTINGS_KEY) || {};
  const hashtags = Array.isArray(settings.hashtags)
    ? normalizeHashtagEntries(settings.hashtags)
    : normalizeHashtagEntries(existing.hashtags);
  const selectedHashtags = Array.isArray(settings.selectedHashtags)
    ? normalizeSelectedHashtagEntries(settings.selectedHashtags, hashtags)
    : normalizeSelectedHashtagEntries(existing.selectedHashtags, hashtags);
  const searchSelectedHashtags = Array.isArray(settings.searchSelectedHashtags)
    ? normalizeSelectedHashtagEntries(settings.searchSelectedHashtags, hashtags)
    : normalizeSelectedHashtagEntries(existing.searchSelectedHashtags, hashtags);
  const searchPreferences = settings.searchPreferences && typeof settings.searchPreferences === "object"
    ? settings.searchPreferences
    : (existing.searchPreferences && typeof existing.searchPreferences === "object" ? existing.searchPreferences : null);
  const searchResultState = normalizeStoredSearchResultState(settings.searchResultState ?? existing.searchResultState);
  const normalizedImages = Array.isArray(settings.segmentImages)
    ? await storeComposerImageBlobs(settings.segmentImages)
    : normalizeSegmentImages(existing.segmentImages);
  const nextSettings = {
    ...existing,
    ...settings,
    localePreference: settings.localePreference || existing.localePreference || "auto",
    tipsVisible: settings.tipsVisible !== undefined ? settings.tipsVisible : (existing.tipsVisible !== false),
    altTextRequired: settings.altTextRequired !== false,
      imageAutoResizeMode: normalizeImageAutoResizeMode(settings.imageAutoResizeMode ?? existing.imageAutoResizeMode),
      archiveExpertMode: normalizeArchiveExpertMode(settings.archiveExpertMode ?? existing.archiveExpertMode),
      themeMode: settings.themeMode === "dark"
        ? "dark"
        : (settings.themeMode === "light" ? "light" : (existing.themeMode === "dark" ? "dark" : "light")),
      compactMode: settings.compactMode === true ? true : (existing.compactMode === true),
      sidebarCollapsedDesktop: settings.sidebarCollapsedDesktop === true,
      desktopLayoutVersion: Number.isFinite(Number(settings.desktopLayoutVersion))
        ? Number(settings.desktopLayoutVersion)
        : (Number.isFinite(Number(existing.desktopLayoutVersion)) ? Number(existing.desktopLayoutVersion) : null),
      sidebarWidthDesktop: Number.isFinite(Number(settings.sidebarWidthDesktop))
        ? Number(settings.sidebarWidthDesktop)
        : (Number.isFinite(Number(existing.sidebarWidthDesktop)) ? Number(existing.sidebarWidthDesktop) : null),
    composerWidthDesktop: Number.isFinite(Number(settings.composerWidthDesktop))
      ? Number(settings.composerWidthDesktop)
      : (Number.isFinite(Number(existing.composerWidthDesktop)) ? Number(existing.composerWidthDesktop) : null),
    postLanguages: Array.isArray(settings.postLanguages)
      ? normalizePostLanguageTags(settings.postLanguages)
      : normalizePostLanguageTags(existing.postLanguages),
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
    hashtagPlacement: ["first", "last", "all-top", "all-bottom"].includes(settings.hashtagPlacement)
      ? settings.hashtagPlacement
      : (["first", "last", "all-top", "all-bottom"].includes(existing.hashtagPlacement) ? existing.hashtagPlacement : "first"),
    segmentImages: Array.isArray(settings.segmentImages)
      ? normalizeSegmentImageMetadata(normalizedImages)
      : normalizeSegmentImageMetadata(existing.segmentImages),
    segmentLinkCards: Array.isArray(settings.segmentLinkCards)
      ? normalizeSegmentLinkCards(settings.segmentLinkCards)
      : normalizeSegmentLinkCards(existing.segmentLinkCards),
    postingHistory: Array.isArray(settings.postingHistory)
      ? normalizePostingHistory(settings.postingHistory)
      : normalizePostingHistory(existing.postingHistory),
    threadExplorerFavorites: Array.isArray(settings.threadExplorerFavorites)
      ? settings.threadExplorerFavorites
      : (Array.isArray(existing.threadExplorerFavorites) ? existing.threadExplorerFavorites : []),
    threadExplorerState: normalizeStoredThreadExplorerState(settings.threadExplorerState ?? existing.threadExplorerState),
    savedSearches: Array.isArray(settings.savedSearches)
      ? settings.savedSearches
      : (Array.isArray(existing.savedSearches) ? existing.savedSearches : []),
    archivePreferences: settings.archivePreferences && typeof settings.archivePreferences === "object"
      ? settings.archivePreferences
      : (existing.archivePreferences && typeof existing.archivePreferences === "object" ? existing.archivePreferences : null),
    analysisState: normalizeStoredAnalysisState(settings.analysisState ?? existing.analysisState),
  };
  await writeStoredValue(SETTINGS_KEY, nextSettings);
  await writeStoredValue(LOCALE_KEY, nextSettings.localePreference);
  await pruneComposerImageBlobs();
  return { ok: true };
}

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

function normalizeAccountAvatarAssets(assets = []) {
  return (Array.isArray(assets) ? assets : [])
    .map((asset) => ({
      did: String(asset?.did || ""),
      url: String(asset?.url || ""),
      path: String(asset?.path || ""),
      type: String(asset?.type || "application/octet-stream"),
      sizeBytes: Number(asset?.sizeBytes) || 0,
      cachedAt: Number(asset?.cachedAt) || Date.now(),
      bytes: asset?.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset?.bytes || []),
    }))
    .filter((asset) => asset.did && asset.url && asset.path && asset.bytes.length > 0);
}

/**
 * Removes expired account-avatar assets from the shared avatar cache.
 * @param {object|null} cache - Raw persisted avatar cache.
 * @param {number} now - Current epoch milliseconds.
 * @returns {object} Pruned cache with normalized assets.
 */
function pruneAccountAvatarCache(cache = null, now = Date.now()) {
  const assets = normalizeAccountAvatarAssets(cache?.assets)
    .filter((asset) => now - asset.cachedAt <= ACCOUNT_AVATAR_CACHE_TTL_MS);
  return {
    ...cache,
    assets,
    updatedAt: cache?.updatedAt || new Date(now).toISOString(),
  };
}

async function cacheStoredAccountAvatar(account = {}, assets = null, serviceCache = null) {
  const did = String(account?.did || "").trim();
  const avatarUrl = String(account?.avatar || "").trim();
  if (!did || !avatarUrl) {
    return {
      account: {
        ...account,
        avatarPath: "",
      },
      assets: normalizeAccountAvatarAssets(assets),
    };
  }

  const nextAssets = normalizeAccountAvatarAssets(assets);
  const existing = nextAssets.find((asset) => asset.did === did && asset.url === avatarUrl);
  if (existing?.path) {
    return {
      account: {
        ...account,
        avatarPath: existing.path,
      },
      assets: nextAssets,
    };
  }

  const blob = await downloadRemoteAssetViaBlob(account, avatarUrl, did, serviceCache);
  const extension = getAssetExtensionFromMimeType(blob.type);
  const slug = String(account.handle || account.identifier || did)
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 60) || "account";
  const path = `account-avatars/${slug}.${extension}`;
  const filteredAssets = nextAssets.filter((asset) => !(asset.did === did));
  filteredAssets.push({
    did,
    url: avatarUrl,
    path,
    type: blob.type,
    sizeBytes: blob.bytes.length,
    cachedAt: Date.now(),
    bytes: blob.bytes,
  });
  return {
    account: {
      ...account,
      avatarPath: path,
    },
    assets: filteredAssets,
  };
}

function isOfflineAuthError(error) {
  if (error?.details?.code === "CONNECTIVITY_FAILED" || error?.details?.code === "CONNECTIVITY_TIMEOUT") {
    return true;
  }
  const normalized = String(error?.message || "").toLowerCase();
  return normalized.includes("could not connect to bluesky")
    || normalized.includes("fetch failed")
    || normalized.includes("networkerror")
    || normalized.includes("load failed")
    || normalized.includes("failed to fetch");
}

function isInvalidCredentialsError(error) {
  if (error?.details?.code === "AUTH_INVALID_CREDENTIALS") {
    return true;
  }
  const normalized = String(error?.message || "").toLowerCase();
  return normalized.includes("invalid identifier or password")
    || normalized.includes("invalid login credentials")
    || normalized.includes("bluesky error: 401");
}

async function switchAccount({ did } = {}) {
  const state = await readStoredAuth();
  const account = state.accounts.find((entry) => entry.did && entry.did === did);

  if (!account) {
    throw new Error("Das gewählte Konto ist nicht gespeichert.");
  }

  try {
    const verified = await ensureSession(did);
    const refreshedState = await readStoredAuth();
    refreshedState.activeDid = verified.did || did;
    const storedState = await writeStoredAuth(refreshedState);
    return buildAuthResponse(storedState, storedState.accounts.find((entry) => entry.did === (verified.did || did)));
  } catch (error) {
    const reason = isOfflineAuthError(error)
      ? "offline"
      : !account.appPassword
      ? "missing_password"
      : isInvalidCredentialsError(error)
      ? "invalid_password"
      : "signed_out";
    return {
      authenticated: false,
      reason,
      did: account.did || "",
      identifier: account.identifier || "",
      handle: account.handle || "",
      service: account.service || DEFAULT_LOGIN_SERVICE,
      webApp: account.webApp || resolvePostWebBase(account.service),
      accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
    };
  }
}

async function importAccountMetadata({ accounts } = {}) {
  const state = await readStoredAuth();
  let nextState = { ...state, accounts: [...state.accounts] };

  for (const entry of Array.isArray(accounts) ? accounts : []) {
    if (!(entry?.did || entry?.identifier)) {
      continue;
    }

    nextState = upsertAccount(nextState, {
      did: entry.did || "",
      identifier: entry.identifier || entry.handle || "",
      handle: entry.handle || entry.identifier || "",
      service: entry.service || DEFAULT_LOGIN_SERVICE,
      pdsUrl: entry.service || DEFAULT_LOGIN_SERVICE,
      webApp: entry.webApp || resolvePostWebBase(entry.service),
      avatar: entry.avatar || "",
      avatarPath: entry.avatarPath || "",
      session: null,
      appPassword: "",
      updatedAt: new Date().toISOString(),
    });
  }

  if (nextState.accounts.length > 0 && !nextState.activeDid) {
    nextState.activeDid = nextState.accounts.find((entry) => entry.session?.did)?.did || "";
  }

  const storedState = await writeStoredAuth(nextState);
  return {
    accounts: storedState.accounts.map((entry) => getAccountPublicMeta(entry)),
  };
}

async function removeAccount({ did } = {}) {
  const state = await readStoredAuth();
  const nextAccounts = state.accounts.filter((entry) => !(entry.did && entry.did === did));
  const nextActive = nextAccounts.find((entry) => entry.session?.did) || null;

  if (nextAccounts.length === 0) {
    await clearStoredAuth();
  } else {
    await writeStoredAuth({
      activeDid: nextActive?.did || "",
      accounts: nextAccounts,
    });
  }

  const nextState = await readStoredAuth();
  const activeAccount = nextState.accounts.find((entry) => entry.did && entry.did === nextState.activeDid) || null;
  return buildAuthResponse(nextState, activeAccount);
}

async function logout({ did } = {}) {
  const state = await readStoredAuth();
  const targetDid = did || state.activeDid;
  const nextAccounts = state.accounts.map((entry) => {
    if (!(targetDid && entry.did === targetDid)) {
      return entry;
    }

    return {
      ...entry,
      session: null,
      updatedAt: new Date().toISOString(),
    };
  });
  const nextActiveAccount = nextAccounts.find((entry) => entry.did !== targetDid && entry.session?.did) || null;
  await writeStoredAuth({
    activeDid: state.activeDid === targetDid ? (nextActiveAccount?.did || "") : state.activeDid,
    accounts: nextAccounts,
  });
  if (state.activeDid === targetDid) {
    await clearArchiveSession();
    await clearArchiveCatalog();
  }
  const nextState = await readStoredAuth();
  const nextActive = nextState.accounts.find((entry) => entry.did && entry.did === nextState.activeDid) || null;
  return buildAuthResponse(nextState, nextActive);
}

async function verifySession() {
  try {
    const auth = await ensureSession();
    const state = await readStoredAuth();
    return buildAuthResponse(state, auth);
  } catch (error) {
    const state = await readStoredAuth().catch(() => ({ activeDid: "", accounts: [] }));
    const activeAccount = state.accounts.find((entry) => entry.did && entry.did === state.activeDid) || null;
    const result = buildAuthResponse({ ...state, activeDid: "" }, null);
    result.reason = isOfflineAuthError(error)
      ? "offline"
      : !activeAccount?.appPassword
      ? "missing_password"
      : isInvalidCredentialsError(error)
      ? "invalid_password"
      : "signed_out";
    return result;
  }
}

function getAssetExtensionFromMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("mp4")) {
    return "mp4";
  }
  if (value.includes("webm")) {
    return "webm";
  }
  if (value.includes("mpeg")) {
    return "mpeg";
  }
  if (value.includes("quicktime") || value.includes("mov")) {
    return "mov";
  }
  if (value.includes("png")) {
    return "png";
  }
  if (value.includes("webp")) {
    return "webp";
  }
  if (value.includes("gif")) {
    return "gif";
  }
  if (value.includes("jpeg") || value.includes("jpg")) {
    return "jpg";
  }
  if (value.includes("svg")) {
    return "svg";
  }
  if (value.includes("json")) {
    return "json";
  }
  return "jpg";
}

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
function isSvgMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  return value.includes("image/svg") || value.includes("svg+xml");
}

/**
 * Replaces SVG archive assets with a small PNG placeholder for safer offline archives.
 * @param {{ type?: string, bytes?: Uint8Array }} blob Downloaded blob descriptor.
 * @returns {{ type: string, bytes: Uint8Array, replacedSvg: boolean }} Safe archive blob descriptor.
 */
function normalizeArchiveImageBlob(blob = {}) {
  const mimeType = String(blob?.type || "application/octet-stream");
  const bytes = blob?.bytes instanceof Uint8Array ? blob.bytes : new Uint8Array(blob?.bytes || []);
  if (!isSvgMimeType(mimeType)) {
    return {
      type: mimeType,
      bytes,
      replacedSvg: false,
    };
  }
  return {
    type: ARCHIVE_SAFE_IMAGE_PLACEHOLDER_MIME_TYPE,
    bytes: decodeBase64ToBytes(ARCHIVE_SAFE_IMAGE_PLACEHOLDER_BASE64),
    replacedSvg: true,
  };
}

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

function shouldStopAuthorFeedScanForFilters(createdAt = "", filters = {}) {
  const timestamp = Date.parse(createdAt || "");
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (filters.scope === "year" && filters.year) {
    const year = Number(String(filters.year || "").slice(0, 4));
    if (Number.isFinite(year) && timestamp < Date.parse(`${year}-01-01T00:00:00.000Z`)) {
      return true;
    }
  }

  if (filters.scope === "range" && filters.from) {
    const fromTimestamp = Date.parse(`${filters.from}T00:00:00.000Z`);
    if (Number.isFinite(fromTimestamp) && timestamp < fromTimestamp) {
      return true;
    }
  }

  return false;
}

function formatMediaExportTimestamp(createdAt = "") {
  const timestamp = Date.parse(createdAt || "");
  if (Number.isNaN(timestamp)) {
    return "unknown-date";
  }
  return new Date(timestamp).toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

function buildMediaExportPostFolder(post = {}) {
  const timestamp = formatMediaExportTimestamp(post.createdAt || "");
  const year = timestamp.slice(0, 4) || "unknown";
  const month = timestamp.slice(0, 7) || `${year}-00`;
  const rkey = String(post.rkey || "post")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 80) || "post";
  return `posts/${year}/${month}/${timestamp}__post-${rkey}`;
}

function buildMediaExportPathStem(kind, post = {}, index = 0) {
  const postFolder = buildMediaExportPostFolder(post);
  if (kind === "video") {
    return `${postFolder}/video-${String(index + 1).padStart(2, "0")}`;
  }
  if (kind === "other") {
    return `${postFolder}/other-01`;
  }
  return `${postFolder}/img-${String(index + 1).padStart(2, "0")}`;
}

function buildMediaManifestEntriesForPost(post = {}, record = {}, options = {}) {
  const includeImages = options.includeImages !== false;
  const includeVideos = options.includeVideos !== false;
  const includeOther = options.includeOther !== false;
  const entries = [];
  const postFolder = buildMediaExportPostFolder(post);

  if (includeImages) {
    const images = extractArchiveEmbedImages(record);
    images.forEach((image, imageIndex) => {
      const cid = getBlobCidFromRef(image);
      if (!cid) {
        return;
      }
      entries.push({
        id: `${post.uri}::image::${imageIndex + 1}`,
        kind: "image",
        postUri: post.uri,
        postCid: post.cid || "",
        createdAt: post.createdAt || "",
        authorDid: post.authorDid || "",
        authorHandle: post.authorHandle || "",
        rkey: post.rkey || "",
        cid,
        alt: String(image.alt || "").slice(0, 2000),
        width: Number(image.aspectRatio?.width) || 0,
        height: Number(image.aspectRatio?.height) || 0,
        mimeTypeHint: String(image?.image?.mimeType || image?.mimeType || "").trim(),
        postFolder,
        pathStem: buildMediaExportPathStem("image", post, imageIndex),
      });
    });
  }

  if (includeVideos) {
    const videos = extractArchiveEmbedVideos(record);
    videos.forEach((videoEntry, videoIndex) => {
      const cid = getBlobCidFromRef(videoEntry.video || {});
      if (!cid) {
        return;
      }
      entries.push({
        id: `${post.uri}::video::${videoIndex + 1}`,
        kind: "video",
        postUri: post.uri,
        postCid: post.cid || "",
        createdAt: post.createdAt || "",
        authorDid: post.authorDid || "",
        authorHandle: post.authorHandle || "",
        rkey: post.rkey || "",
        cid,
        alt: String(videoEntry.alt || "").slice(0, 2000),
        width: Number(videoEntry.aspectRatio?.width) || 0,
        height: Number(videoEntry.aspectRatio?.height) || 0,
        mimeTypeHint: String(videoEntry?.video?.mimeType || "").trim(),
        postFolder,
        pathStem: buildMediaExportPathStem("video", post, videoIndex),
      });
    });
  }

  if (includeOther) {
    const externalCard = extractArchiveExternalCardFromRecord(record);
    if (externalCard?.thumbRef) {
      const cid = getBlobCidFromRef(externalCard.thumbRef);
      const remoteUrl = typeof externalCard.thumbRef === "string"
        ? externalCard.thumbRef
        : String(externalCard.thumbRef?.uri || externalCard.thumbRef?.url || externalCard.thumbRef?.thumb || "").trim();
      if (cid || remoteUrl) {
        entries.push({
          id: `${post.uri}::other::thumb`,
          kind: "other",
          postUri: post.uri,
          postCid: post.cid || "",
          createdAt: post.createdAt || "",
          authorDid: post.authorDid || "",
          authorHandle: post.authorHandle || "",
          rkey: post.rkey || "",
          cid,
          remoteUrl,
          alt: String(externalCard.title || externalCard.description || "").slice(0, 1000),
          mimeTypeHint: "",
          postFolder,
          pathStem: buildMediaExportPathStem("other", post, 0),
        });
      }
    }
  }

  return entries;
}

async function resolveMediaExportActor(auth, actor = "") {
  const rawActor = String(actor || "").trim();
  if (!rawActor) {
    return {
      did: auth.session.did,
      handle: auth.session.handle,
      displayName: auth.session.handle,
      avatar: auth.avatar || "",
    };
  }

  const profile = await bskyGet("app.bsky.actor.getProfile", {
    actor: rawActor,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  });

  return {
    did: String(profile?.did || "").trim(),
    handle: String(profile?.handle || rawActor).trim(),
    displayName: String(profile?.displayName || profile?.handle || rawActor).trim(),
    avatar: String(profile?.avatar || "").trim(),
  };
}

async function scanAccountMediaExport({ actor = "", filters = {}, includeImages = true, includeVideos = true, includeOther = true } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const normalizedFilters = normalizeArchiveFilters(filters);
  const actorProfile = await resolveMediaExportActor(auth, actor);
  if (!actorProfile.did) {
    throw new Error("Account für Medienexport konnte nicht aufgelöst werden.");
  }

  const posts = [];
  const media = [];
  const seenMediaIds = new Set();
  const threadHashtagMatchCache = new Map();
  const rootHashtagMatchCache = new Map();
  const hasHashtagFilter = Array.isArray(normalizedFilters.hashtagTags) && normalizedFilters.hashtagTags.length > 0;
  let cursor = "";
  let pageCount = 0;
  let stopScan = false;

  notifyProgress({
    title: "Medien werden gesucht",
    step: "Autor-Feed wird seitenweise gelesen …",
    percent: 4,
    detail: actorProfile.handle ? `Account: @${actorProfile.handle}` : actorProfile.did,
  });

  while (!stopScan) {
    const response = await bskyGet("app.bsky.feed.getAuthorFeed", {
      actor: actorProfile.did,
      limit: 100,
      cursor: cursor || undefined,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });

    const feedItems = Array.isArray(response?.feed) ? response.feed : [];
    pageCount += 1;
    let oldestSeenCreatedAt = "";

    for (const item of feedItems) {
      const postView = item?.post || null;
      const record = postView?.record || {};
      if (!postView?.uri || postView.author?.did !== actorProfile.did) {
        continue;
      }

      const createdAt = String(record.createdAt || postView.indexedAt || "").trim();
      oldestSeenCreatedAt = createdAt || oldestSeenCreatedAt;

      if (!postMatchesArchiveSelection(record, normalizedFilters, actorProfile.did, postView.uri)) {
        continue;
      }

      if (hasHashtagFilter) {
        const matchesHashtagSelection = await postMatchesMediaExportHashtagSelection(
          postView,
          normalizedFilters,
          auth,
          threadHashtagMatchCache,
          rootHashtagMatchCache,
        );
        if (!matchesHashtagSelection) {
          continue;
        }
      }

      const post = buildArchivePostEntity({
        uri: postView.uri,
        cid: postView.cid,
        record,
        authorHandle: postView.author?.handle || actorProfile.handle || "",
        authorDisplayName: postView.author?.displayName || postView.author?.handle || actorProfile.displayName || "",
        authorDid: postView.author?.did || actorProfile.did,
        authorAvatar: postView.author?.avatar || actorProfile.avatar || "",
        counts: {
          likeCount: Number(postView.likeCount) || 0,
          replyCount: Number(postView.replyCount) || 0,
          repostCount: Number(postView.repostCount) || 0,
          quoteCount: Number(postView.quoteCount) || 0,
        },
      });

      const entries = buildMediaManifestEntriesForPost(post, record, {
        includeImages,
        includeVideos,
        includeOther,
      });

      if (!entries.length) {
        continue;
      }

      posts.push({
        uri: post.uri,
        cid: post.cid || "",
        rkey: post.rkey || "",
        createdAt: post.createdAt || "",
        text: String(post.text || "").slice(0, 280),
        authorDid: post.authorDid || "",
        authorHandle: post.authorHandle || "",
        postFolder: buildMediaExportPostFolder(post),
        permalink: post.permalink || "",
        threadRootUri: post.thread?.rootUri || "",
        threadParentUri: post.thread?.parentUri || "",
        mediaCount: entries.length,
      });

      for (const entry of entries) {
        if (seenMediaIds.has(entry.id)) {
          continue;
        }
        seenMediaIds.add(entry.id);
        media.push(entry);
      }
    }

    notifyProgress({
      title: "Medien werden gesucht",
      step: `Abruf ${pageCount} abgeschlossen`,
      percent: Math.min(78, 4 + (pageCount * 4)),
      detail: `${posts.length} Posts mit Medien · ${media.length} Assets gefunden`,
    });

    cursor = String(response?.cursor || "");
    if (!cursor || !feedItems.length) {
      break;
    }

    stopScan = shouldStopAuthorFeedScanForFilters(oldestSeenCreatedAt, normalizedFilters);
  }

  media.sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
  posts.sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

  notifyProgress({
    title: "Medien werden gesucht",
    step: "Manifest ist bereit",
    percent: 100,
    detail: `${posts.length} Posts mit Medien · ${media.length} Assets gefunden`,
  });

  return {
    manifest: {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      account: {
        did: actorProfile.did,
        handle: actorProfile.handle,
        displayName: actorProfile.displayName,
      },
      filters: normalizedFilters,
      selectedKinds: {
        images: includeImages !== false,
        videos: includeVideos !== false,
        other: includeOther !== false,
      },
      postCount: posts.length,
      mediaCount: media.length,
    },
    posts,
    media,
  };
}

/**
 * Downloads one media asset for the archive export and emits keepalive progress
 * while the network request is still running.
 * @param {object} payload - Worker payload for the media download.
 * @param {object} payload.item - Media descriptor returned by the scan step.
 * @param {Function} notifyProgress - Callback used to notify the app about progress.
 * @returns {Promise<object>} Normalized media file descriptor with bytes.
 */
async function downloadAccountMediaAsset({ item } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  if (!item || typeof item !== "object") {
    throw new Error("Kein Medium zum Laden übergeben.");
  }

  const pathStem = String(item.pathStem || "").trim();
  const cid = String(item.cid || "").trim();
  const remoteUrl = String(item.remoteUrl || "").trim();
  const authorDid = String(item.authorDid || auth.session.did || "").trim();
  if (!pathStem || (!cid && !remoteUrl)) {
    throw new Error("Medienquelle ist unvollstaendig.");
  }

  /**
   * Builds progress payloads for long-running media downloads.
   * @param {boolean} isHeartbeat - True when the payload is only a keepalive tick.
   * @returns {object} Progress payload for the app.
   */
  function buildMediaDownloadProgress(isHeartbeat = false) {
    let mediaLabel = "Bild";
    if (item.kind === "video") {
      mediaLabel = "Video";
    } else if (item.kind === "other") {
      mediaLabel = "Asset";
    }

    let detail = String(item.postUri || "").trim();
    if (isHeartbeat) {
      if (detail) {
        detail = `${detail} · Verbindung aktiv`;
      } else {
        detail = "Verbindung aktiv";
      }
    }

    return {
      step: `${mediaLabel} wird geladen`,
      detail,
    };
  }

  /**
   * Emits regular keepalive progress updates until the current asset finished loading.
   * @returns {Function} Cleanup function that stops the heartbeat timer.
   */
  function startMediaDownloadHeartbeat() {
    const timerId = setInterval(() => {
      notifyProgress(buildMediaDownloadProgress(true));
    }, MEDIA_EXPORT_HEARTBEAT_MS);
    return () => {
      clearInterval(timerId);
    };
  }

  notifyProgress(buildMediaDownloadProgress(false));

  const stopHeartbeat = startMediaDownloadHeartbeat();
  let blob = null;
  try {
    if (cid) {
      blob = await withThreadExplorerMediaHydrationTimeout(
        downloadBlobForDid(auth, authorDid, cid, new Map()),
        MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS,
      );
    } else if (remoteUrl) {
      blob = await withThreadExplorerMediaHydrationTimeout(
        downloadRemoteAssetViaBlob(auth, remoteUrl, authorDid, new Map()),
        MEDIA_EXPORT_ITEM_DOWNLOAD_TIMEOUT_MS,
      );
    }
  } finally {
    stopHeartbeat();
  }

  if (!blob?.bytes?.length) {
    throw new Error("Medium konnte nicht geladen werden.");
  }

  let extension = getAssetExtensionFromMimeType(blob.type || item.mimeTypeHint || "");
  if (item.kind === "video" && (!extension || extension === "jpg")) {
    extension = "mp4";
  } else if (item.kind === "other" && !extension) {
    extension = "bin";
  } else if (!extension) {
    extension = "jpg";
  }
  return {
    id: String(item.id || "").trim(),
    kind: String(item.kind || "asset").trim(),
    path: `${pathStem}.${extension}`,
    type: blob.type || "application/octet-stream",
    sizeBytes: blob.bytes.length,
    bytes: blob.bytes,
    createdAt: String(item.createdAt || "").trim(),
    postUri: String(item.postUri || "").trim(),
    alt: String(item.alt || "").slice(0, 2000),
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const values = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.min(Number(concurrency) || 1, values.length || 1));
  const results = new Array(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  return results;
}

function chunkEntries(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function bytesToDataUrl(bytes, mimeType = "image/jpeg") {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, Math.min(bytes.length, index + chunkSize));
    binary += String.fromCharCode(...slice);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function parseArchiveThreadSource(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Bitte eine Bluesky-Posting-URL eingeben.");
  }

  if (raw.startsWith("at://")) {
    const parsed = parseAtUri(raw);
    if (!parsed.did || parsed.collection !== "app.bsky.feed.post" || !parsed.rkey) {
      throw new Error("Die Posting-URL ist nicht gueltig.");
    }
    return {
      sourceUrl: raw,
      actor: parsed.did,
      rkey: parsed.rkey,
      entryUri: raw,
    };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Die Posting-URL ist nicht gueltig.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[0] !== "profile" || segments[2] !== "post") {
    throw new Error("Die Posting-URL ist nicht gueltig.");
  }

  return {
    sourceUrl: url.toString(),
    actor: decodeURIComponent(segments[1] || ""),
    rkey: decodeURIComponent(segments[3] || ""),
    entryUri: "",
  };
}


function normalizeReplyTargetMode(mode) {
  return mode === "thread" ? "thread" : "post";
}

function recordMentionsDid(record, did) {
  return Array.isArray(record?.facets) && record.facets.some((facet) =>
    Array.isArray(facet?.features) && facet.features.some((feature) =>
      feature?.$type === "app.bsky.richtext.facet#mention" && feature.did === did,
    )
  );
}

function evaluateReplyEligibility(postView, authDid) {
  const allowRules = Array.isArray(postView?.threadgate?.record?.allow) ? postView.threadgate.record.allow : null;
  if (!allowRules) {
    return { status: "allowed", hint: "" };
  }
  if (allowRules.length === 0) {
    return { status: "blocked", hint: "Auf dieses Posting sind keine Antworten erlaubt." };
  }

  const viewer = postView?.author?.viewer && typeof postView.author.viewer === "object" ? postView.author.viewer : {};
  let matched = false;
  let hasUnknownRules = false;

  for (const rule of allowRules) {
    const type = String(rule?.$type || "");
    if (type === "app.bsky.feed.threadgate#followerRule" && viewer.following) {
      matched = true;
      break;
    }
    if (type === "app.bsky.feed.threadgate#followingRule" && viewer.followedBy) {
      matched = true;
      break;
    }
    if (type === "app.bsky.feed.threadgate#mentionRule" && recordMentionsDid(postView?.record || {}, authDid)) {
      matched = true;
      break;
    }
    if (type === "app.bsky.feed.threadgate#listRule") {
      hasUnknownRules = true;
    }
  }

  if (matched) {
    return { status: "allowed", hint: "" };
  }
  if (hasUnknownRules) {
    return {
      status: "unknown",
      hint: "Die Antwortregeln dieses Postings nutzen Listen. Threadline kann vor dem Posten nicht sicher pruefen, ob Antworten erlaubt sind.",
    };
  }
  return {
    status: "blocked",
    hint: "Die Antwortregeln dieses Postings erlauben dem aktuell aktiven Account keine Antwort.",
  };
}

async function checkReplyTarget({ url, mode } = {}) {
  const auth = await ensureSession();
  const parsedSource = parseArchiveThreadSource(url);
  const resolveCache = new Map();
  const actorDid = parsedSource.actor.startsWith("did:")
    ? parsedSource.actor
    : await resolveHandleToDid(parsedSource.actor, auth, resolveCache);

  if (!actorDid) {
    throw new Error("Die Posting-URL konnte keinem Bluesky-Account zugeordnet werden.");
  }

  const entryUri = parsedSource.entryUri || `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
  let entryResponse;
  try {
    entryResponse = await bskyGet("app.bsky.feed.getPosts", {
      uris: [entryUri],
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });
  } catch (error) {
    throw new Error(error?.message || "Das verlinkte Posting konnte nicht geladen werden.");
  }

  const entryPost = Array.isArray(entryResponse?.posts) ? entryResponse.posts[0] : null;
  if (!entryPost?.uri) {
    throw new Error("Das verlinkte Posting wurde nicht gefunden oder ist nicht mehr sichtbar.");
  }

  const entryRecord = entryPost.record || {};
  const rootUri = getArchiveRootUri(entryRecord, entryPost.uri) || entryPost.uri;
  let threadResponse;
  try {
    threadResponse = await archiveGetPostThread(auth, rootUri, {
      depth: 100,
      parentHeight: 0,
      retries: 1,
      timeoutMs: 20000,
    });
  } catch (error) {
    throw new Error(error?.message || "Der zugehoerige Thread konnte nicht geladen werden.");
  }

  const threadRoot = threadResponse.thread || threadResponse.post || threadResponse;
  const threadViews = collectThreadViewPosts(threadRoot);
  const rootPost = threadViews.find((post) => post?.uri === rootUri) || entryPost;
  const resolvedEntryPost = threadViews.find((post) => post?.uri === entryPost.uri) || entryPost;
  const normalizedMode = normalizeReplyTargetMode(mode);
  const ownPosts = threadViews
    .filter((post) => post?.author?.did === auth.session.did)
    .sort((left, right) => Date.parse(right?.record?.createdAt || 0) - Date.parse(left?.record?.createdAt || 0));

  if (normalizedMode === "thread" && ownPosts.length === 0) {
    throw new Error("Mit dem aktuell aktiven Account wurde in diesem Thread kein eigener Post gefunden.");
  }

  const replyParentPost = normalizedMode === "thread" ? ownPosts[0] : resolvedEntryPost;
  const eligibility = evaluateReplyEligibility(replyParentPost, auth.session.did);
  if (eligibility.status === "blocked") {
    throw new Error(eligibility.hint);
  }

  return {
    mode: normalizedMode,
    sourceUrl: parsedSource.sourceUrl,
    threadLength: Math.max(1, threadViews.length || 1),
    replyHint: eligibility.hint,
    replyRoot: {
      uri: rootPost.uri,
      cid: String(rootPost.cid || ""),
    },
    replyParent: {
      uri: replyParentPost.uri,
      cid: String(replyParentPost.cid || ""),
    },
    targetPost: {
      uri: resolvedEntryPost.uri,
      cid: String(resolvedEntryPost.cid || ""),
      text: String(resolvedEntryPost.record?.text || ""),
      createdAt: String(resolvedEntryPost.record?.createdAt || ""),
    },
    rootPost: {
      uri: rootPost.uri,
      cid: String(rootPost.cid || ""),
      text: String(rootPost.record?.text || ""),
      createdAt: String(rootPost.record?.createdAt || ""),
    },
    targetAccount: {
      did: String(resolvedEntryPost.author?.did || ""),
      handle: String(resolvedEntryPost.author?.handle || ""),
      displayName: String(resolvedEntryPost.author?.displayName || resolvedEntryPost.author?.handle || ""),
      avatar: String(resolvedEntryPost.author?.avatar || ""),
    },
    rootAccount: {
      did: String(rootPost.author?.did || ""),
      handle: String(rootPost.author?.handle || ""),
      displayName: String(rootPost.author?.displayName || rootPost.author?.handle || ""),
      avatar: String(rootPost.author?.avatar || ""),
    },
    lastOwnPost: ownPosts[0]
      ? {
          uri: ownPosts[0].uri,
          cid: String(ownPosts[0].cid || ""),
          text: String(ownPosts[0].record?.text || ""),
          createdAt: String(ownPosts[0].record?.createdAt || ""),
        }
      : null,
  };
}

async function checkPostEditMetadata({ url } = {}) {
  const auth = await ensureSession();
  let parsedSource;
  try {
    parsedSource = parseArchiveThreadSource(url);
  } catch {
    throw createServiceWorkerError(
      "The post URL is invalid.",
      "POST_EDIT_URL_INVALID",
    );
  }

  const resolveCache = new Map();
  const actorDid = parsedSource.actor.startsWith("did:")
    ? parsedSource.actor
    : await resolveHandleToDid(parsedSource.actor, auth, resolveCache);
  if (!actorDid) {
    throw createServiceWorkerError(
      "The post account could not be resolved.",
      "POST_EDIT_ACTOR_NOT_FOUND",
    );
  }

  const serviceUrl = await resolvePdsForDid(
    actorDid,
    auth.pdsUrl || auth.service || DEFAULT_LOGIN_SERVICE,
    new Map(),
  );

  let recordResponse;
  try {
    recordResponse = await bskyGet("com.atproto.repo.getRecord", {
      repo: actorDid,
      collection: "app.bsky.feed.post",
      rkey: parsedSource.rkey,
    }, {
      base: xrpcBaseForService(serviceUrl),
    });
  } catch (error) {
    throw createServiceWorkerError(
      error?.message || "The post record could not be loaded.",
      "POST_EDIT_RECORD_LOAD_FAILED",
    );
  }

  const record = recordResponse?.value;
  if (!record || record.$type !== "app.bsky.feed.post") {
    throw createServiceWorkerError(
      "The URL does not point to a post record.",
      "POST_EDIT_RECORD_INVALID",
    );
  }

  return {
    uri: `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`,
    cid: String(recordResponse?.cid || ""),
    actorDid,
    sourceUrl: parsedSource.sourceUrl,
    text: String(record.text || ""),
    originalText: typeof record.originalText === "string" ? record.originalText : "",
    createdAt: String(record.createdAt || ""),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    isEdited: typeof record.originalText === "string" && typeof record.updatedAt === "string",
  };
}

async function exportAccountArchiveWave({ runId, filters, cursor: initialCursor = "", maxPosts = 500, waveIndex = 1, existingCatalog = null, existingSession = null } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const storedSettings = await readStoredValue(SETTINGS_KEY) || {};
  const archiveExpertMode = normalizeArchiveExpertMode(storedSettings?.archiveExpertMode);
  const normalizedFilters = normalizeArchiveFilters(filters);
  const sourceProfile = await resolveArchiveSourceActor(auth, normalizedFilters);
  const sourceDid = sourceProfile.did || auth.session.did;
  const pdsServiceCache = new Map();
  const archiveBlobCache = new Map();
  const threadHashtagMatchCache = new Map();
  const rootHashtagMatchCache = new Map();
  const hasHashtagFilter = Array.isArray(normalizedFilters.hashtagTags) && normalizedFilters.hashtagTags.length > 0;
  const selectedHashtagCount = hasHashtagFilter ? normalizedFilters.hashtagTags.length : 0;
  const resumedWave = archiveModels.wave.restore({ existingCatalog, existingSession, initialCursor, maxPosts });
  const { records, rawRecordsByUri, postsByUri, pageSize } = resumedWave;
  let cursor = resumedWave.cursor;
  let pageCount = resumedWave.pageCount;
  let imageCount = 0;
  let skippedImageCount = 0;
  let orderedPosts = [];
  const assets = [];
  const seenAssetPaths = new Set();
  let previewCounter = 0;
  let cancelled = false;
  let hashtagFilteredOutCount = 0;
  let stopScan = false;
  let currentPhase = "fetch";

  const waveAssetState = {
    /** Reads saved images. @returns {number} Saved count. */
    get imageCount() { return imageCount; },
    /** Assigns saved images. @param {number} value - Count. @returns {void} Updates live state. */
    set imageCount(value) { imageCount = value; },
    /** Reads skipped images. @returns {number} Skipped count. */
    get skippedImageCount() { return skippedImageCount; },
    /** Assigns skipped images. @param {number} value - Count. @returns {void} Updates live state. */
    set skippedImageCount(value) { skippedImageCount = value; },
  };
  // Live accessors preserve partial cursor/counter updates when page selection rejects.
  const wavePageState = {
    /** Reads the current cursor. @returns {string} Resume cursor. */
    get cursor() { return cursor; },
    /** Updates the resume cursor. @param {string} value - Provider cursor. @returns {void} Updates live state. */
    set cursor(value) { cursor = value; },
    /** Reads the cumulative skipped count. @returns {number} Filtered posts. */
    get hashtagFilteredOutCount() { return hashtagFilteredOutCount; },
    /** Updates the skipped count. @param {number} value - Cumulative count. @returns {void} Updates live state. */
    set hashtagFilteredOutCount(value) { hashtagFilteredOutCount = value; },
  };
  const buildHashtagProgressDetail = (baseDetail = "") => {
    if (!hasHashtagFilter) {
      return baseDetail;
    }
    const suffix = `${selectedHashtagCount} Hashtags aktiv · ${hashtagFilteredOutCount} Posts wegen Hashtag-Filter übersprungen`;
    return baseDetail ? `${baseDetail} · ${suffix}` : suffix;
  };

  archiveRunControl.start(runId);

  /** Builds a result from the current wave state and explicit clock/version values.
   * @param {string} status - Completion state. @param {object} settings - Optional error message.
   * @returns {object} Existing archive result and continuation session.
   */
  const buildResult = (status = "completed", settings = {}) => archiveModels.wave.result({
    sourceProfile, sourceDid, normalizedFilters, orderedPosts, assets, imageCount, skippedImageCount,
    hashtagFilteredOutCount, pageCount, currentPhase, cursor,
    exportedAt: new Date().toISOString(), appVersion: APP_VERSION,
  }, status, settings);

  /** Finishes the current run and builds its snapshot.
   * @param {string} status - Completed/cancelled state. @returns {object} Existing wave result.
   */
  function finalizeWave(status) {
    return archiveWaveService.finalize({ runId, status, buildResult, finish: archiveRunControl.finish });
  }
  notifyProgress({
    title: "Archiv wird gelesen",
    step: sourceProfile.isOwnAccount ? "Eigene Posts werden aus dem Repo geladen ..." : "Posts der Archivquelle werden geladen ...",
    percent: 5,
    detail: buildHashtagProgressDetail(
      hasHashtagFilter
        ? `Konto: ${sourceProfile.handle || sourceDid} · Hashtag-Filter aktiv`
        : `Konto: ${sourceProfile.handle || sourceDid}`,
    ),
    checkpoint: "Archivlauf gestartet",
    state: "running",
  });

  try {
  let shouldContinueFetch = Boolean(cursor) || records.length === 0;
  while (shouldContinueFetch) {
    currentPhase = "fetch";
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      cancelled = true;
      break;
    }
    if (stopScan) {
      cursor = "";
      break;
    }

    const { pageRecords, oldestSeenCreatedAt } = await archiveWaveService.readPage({
      auth, sourceProfile, sourceDid, normalizedFilters, pageSize, pageCount, runId, notifyProgress,
      hasHashtagFilter, threadHashtagMatchCache, rootHashtagMatchCache,
    }, wavePageState);

    if (oldestSeenCreatedAt) {
      stopScan = shouldStopAuthorFeedScanForFilters(oldestSeenCreatedAt, normalizedFilters);
    }

    records.push(...pageRecords);
    pageCount += 1;
    notifyProgress({
      title: "Archiv wird gelesen",
      step: sourceProfile.isOwnAccount
        ? `${pageCount} Repo-Seiten geprüft · ${records.length} passende Posts gefunden`
        : `${pageCount} Feed-Seiten geprüft · ${records.length} passende Posts gefunden`,
      percent: Math.min(45, 5 + (pageCount * 3)),
      detail: buildHashtagProgressDetail(
        hasHashtagFilter
          ? `${records.length} Posts vorgemerkt · Posts werden mit Hashtag-Filter geprüft`
          : `${records.length} Posts vorgemerkt`,
      ),
      checkpoint: `${records.length} Posts gefunden`,
      state: "running",
    });

    if (records.length > 0) {
      previewCounter += 1;
      if (previewCounter % 10 === 0) {
        const latest = records[Math.max(0, records.length - 1)];
        notifyProgress({
          preview: {
            meta: `${records.length} Posts gefunden`,
            text: String(latest?.value?.text || "").slice(0, 280),
          },
          checkpoint: `${records.length} Posts gefunden`,
          state: "running",
        });
      }
    }

    if (!cursor || stopScan) {
      break;
    }

    const pauseState = await maybePauseArchiveFeedScan({
      runId,
      notifyProgress,
      pageCount,
      recordsCount: records.length,
      archiveExpertMode,
    });
    if (pauseState === "cancelled") {
      cancelled = true;
      break;
    }
  }

  records.sort((left, right) => Date.parse(right.value?.createdAt || 0) - Date.parse(left.value?.createdAt || 0));

  const upsertArchivePost = (post, rawRecord = null) => {
    const existing = postsByUri.get(post.uri);
    if (existing) {
      mergeArchivePostEntity(existing, post);
    } else {
      postsByUri.set(post.uri, post);
    }
    if (rawRecord) {
      rawRecordsByUri.set(post.uri, rawRecord);
    }
  };

  records.forEach((entry) => {
    upsertArchivePost(
      buildArchivePostEntity({
        uri: entry.uri,
        cid: entry.cid,
        record: entry.value,
        authorHandle: entry.authorHandle || sourceProfile.handle || "",
        authorDisplayName: entry.authorDisplayName || sourceProfile.displayName || sourceProfile.handle || "",
        authorDid: entry.authorDid || sourceDid,
        authorAvatar: entry.authorAvatar || sourceProfile.avatar || "",
        counts: entry.counts || null,
      }),
      entry.value,
    );
  });

  if ((normalizedFilters.contentMode === "threads" || normalizedFilters.contentMode === "thread_roots") && records.length > 0) {
    currentPhase = "threads";
    const threadRootUris = [...new Set(records
      .map((entry) => getArchiveRootUri(entry.value, entry.uri) || entry.uri)
      .filter((uri) => parseAtUri(uri).did === sourceDid))];

    for (const [threadIndex, rootUri] of threadRootUris.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        orderedPosts = Array.from(postsByUri.values())
          .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
        return finalizeWave("cancelled");
      }

        notifyProgress({
          title: "Archiv wird gelesen",
          step: `Thread ${threadIndex + 1}/${threadRootUris.length} wird erweitert`,
          percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
          detail: buildHashtagProgressDetail(
            hasHashtagFilter
            ? (normalizedFilters.contentMode === "thread_roots"
              ? "Eigene Thread-Hauptpfade werden nachgeladen und mit Hashtag-Filter geprüft"
              : "Antworten in eigenen Threads werden nachgeladen und mit Hashtag-Filter geprüft")
            : (normalizedFilters.contentMode === "thread_roots"
              ? "Eigene Thread-Hauptpfade werden nachgeladen"
              : "Antworten in eigenen Threads werden nachgeladen"),
          ),
          checkpoint: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
          state: "running",
        });

      let threadResponse = null;
      try {
        threadResponse = await runArchiveRequestWithRetry(() => archiveGetPostThread(auth, rootUri, {
          depth: 100,
          parentHeight: 0,
          notifyProgress,
          progressTitle: "Archiv wird gelesen",
          progressPercent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
          progressDetail: rootUri,
          checkpointPrefix: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
        }), {
          runId,
          notifyProgress,
          title: "Archiv wird gelesen",
          percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
          baseDetail: rootUri,
          checkpoint: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
        });
      } catch (error) {
        if (!isMissingArchivePostError(error) && !isArchiveThreadTimeoutError(error)) {
          throw error;
        }

        notifyProgress({
          title: "Archiv wird gelesen",
          step: `Thread ${threadIndex + 1}/${threadRootUris.length} wird übersprungen`,
          percent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
          detail: isArchiveThreadTimeoutError(error)
            ? `Thread-Antwort zu langsam · ${rootUri}`
            : `Startpost nicht mehr verfügbar · ${rootUri}`,
          checkpoint: `Fehlenden Thread übersprungen (${threadIndex + 1}/${threadRootUris.length})`,
          state: "running",
        });
        continue;
      }

      const threadViews = collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse);
      for (const postView of threadViews) {
        const record = postView?.record || {};
        const rootCandidate = getArchiveRootUri(record, postView.uri) || postView.uri;
        if (parseAtUri(rootCandidate).did !== sourceDid) {
          continue;
        }
        if (normalizedFilters.contentMode === "thread_roots") {
          if ((postView.author?.did || "") !== sourceDid) {
            continue;
          }
          if (!recordBelongsToOwnMainThreadPath(record, sourceDid, postView.uri)) {
            continue;
          }
        }
        if (!postMatchesArchiveFilters(record, normalizedFilters)) {
          continue;
        }
        if (hasHashtagFilter) {
          const matchesHashtagSelection = await postMatchesMediaExportHashtagSelection(
            postView,
            normalizedFilters,
            auth,
            threadHashtagMatchCache,
            rootHashtagMatchCache,
          );
          if (!matchesHashtagSelection) {
            hashtagFilteredOutCount += 1;
            continue;
          }
        }
        upsertArchivePost(
          buildArchivePostEntity({
            uri: postView.uri,
            cid: postView.cid,
            record,
            authorHandle: postView.author?.handle || "",
            authorDisplayName: postView.author?.displayName || postView.author?.handle || "",
            authorDid: postView.author?.did || "",
            authorAvatar: postView.author?.avatar || "",
            counts: {
              likeCount: Number(postView.likeCount) || 0,
              replyCount: Number(postView.replyCount) || 0,
              repostCount: Number(postView.repostCount) || 0,
              quoteCount: Number(postView.quoteCount) || 0,
            },
          }),
          record,
        );
      }
    }
  }

  if (normalizedFilters.includeConversationContext === true && postsByUri.size > 0) {
    currentPhase = "conversation";
    const conversationExpansionResult = await expandArchiveConversationContexts({
      auth,
      runId,
      notifyProgress,
      postsByUri,
      rawRecordsByUri,
      upsertArchivePost,
    });
    if (conversationExpansionResult === "cancelled") {
      orderedPosts = Array.from(postsByUri.values())
        .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
      return finalizeWave("cancelled");
    }
  }

  orderedPosts = Array.from(postsByUri.values())
    .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

  currentPhase = "metrics";
  if (await archiveWaveService.enrichMetrics({ orderedPosts, postsByUri, auth, runId, notifyProgress, buildHashtagProgressDetail }) === "cancelled") {
    orderedPosts = Array.from(postsByUri.values())
      .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
    return finalizeWave("cancelled");
  }

  const uniqueAvatarCount = new Set(
    orderedPosts
      .map((post) => String(post?.authorAvatar || "").trim())
      .filter(Boolean),
  ).size;

  notifyProgress({
    title: "Archiv wird gelesen",
    step: "Profilbilder werden ergänzt …",
    percent: 61,
    detail: buildHashtagProgressDetail(
      uniqueAvatarCount > 0
        ? `${uniqueAvatarCount} eindeutige Avatare werden vorbereitet`
        : "Keine zusätzlichen Avatare gefunden",
    ),
    checkpoint: "Avatare werden vorbereitet",
    state: "running",
  });

  currentPhase = "assets";
  await attachArchiveAvatarAssets(orderedPosts, assets, seenAssetPaths, auth, pdsServiceCache, notifyProgress, 61, archiveBlobCache);

  const assetInput = { orderedPosts, rawRecordsByUri, assets, seenAssetPaths, auth, sourceDid,
    pdsServiceCache, archiveBlobCache, runId, notifyProgress, buildHashtagProgressDetail };
  await archiveAssetService.attachLinkCards(assetInput);
  const cancelledDuringImagePhase = await archiveAssetService.attachImages(assetInput, waveAssetState);
  let finalStatus = "completed";
  if (cancelledDuringImagePhase || cancelled) {
    finalStatus = "cancelled";
  }
  return finalizeWave(finalStatus);
  } catch (error) {
    return archiveWaveService.finalize({ runId, postsByUri, buildResult, finish: archiveRunControl.finish, error,
      setOrderedPosts: (posts) => { orderedPosts = posts; } });
  }
}

async function applyPostInteractionGates(auth, postRef, settings) {
  const normalizedSettings = normalizePostInteractionSettings(settings);
  const recordKey = extractRecordKeyFromAtUri(postRef?.uri);
  if (!recordKey) {
    return;
  }

  const base = xrpcBaseForService(auth.pdsUrl || auth.service);
  const headers = {
    authorization: `Bearer ${auth.session.accessJwt}`,
  };
  const threadGateAllow = buildThreadGateAllowRules(normalizedSettings);
  let latestRateLimit = null;

  if (threadGateAllow !== null) {
    const result = await bskyFetch("com.atproto.repo.createRecord", {
      method: "POST",
      headers,
      base,
      returnMeta: true,
      body: JSON.stringify({
        repo: auth.session.did,
        collection: "app.bsky.feed.threadgate",
        rkey: recordKey,
        record: {
          $type: "app.bsky.feed.threadgate",
          createdAt: new Date().toISOString(),
          post: postRef.uri,
          allow: threadGateAllow,
        },
      }),
    });
    latestRateLimit = result.meta?.rateLimit || latestRateLimit;
  }

  if (!normalizedSettings.quotePostsAllowed) {
    const result = await bskyFetch("com.atproto.repo.createRecord", {
      method: "POST",
      headers,
      base,
      returnMeta: true,
      body: JSON.stringify({
        repo: auth.session.did,
        collection: "app.bsky.feed.postgate",
        rkey: recordKey,
        record: {
          $type: "app.bsky.feed.postgate",
          createdAt: new Date().toISOString(),
          post: postRef.uri,
          embeddingRules: [
            { $type: "app.bsky.feed.postgate#disableRule" },
          ],
        },
      }),
    });
    latestRateLimit = result.meta?.rateLimit || latestRateLimit;
  }

  return latestRateLimit;
}

/**
 * Deletes one AT Protocol record through `com.atproto.repo.deleteRecord`.
 * @param {object} auth - Active authenticated account.
 * @param {string} recordUri - Full AT URI of the record that should be removed.
 * @returns {Promise<void>} Resolves after the record was deleted.
 */
async function deleteRepoRecord(auth, recordUri) {
  const parsed = parseAtUriParts(recordUri);
  if (!parsed) {
    throw new Error("Der zu löschende Datensatz hat keine gültige AT-URI.");
  }

  await bskyFetch("com.atproto.repo.deleteRecord", {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: xrpcBaseForService(auth.pdsUrl || auth.service),
    body: JSON.stringify({
      repo: parsed.repo,
      collection: parsed.collection,
      rkey: parsed.rkey,
    }),
  });
}

/**
 * Creates one like record for a post on behalf of the active account.
 * @param {object} payload - Request payload from the UI.
 * @param {string} payload.uri - AT URI of the liked post.
 * @param {string} payload.cid - CID of the liked post.
 * @returns {Promise<object>} Created like record reference.
 */
async function likePost(payload = {}) {
  const postUri = String(payload.uri || "").trim();
  const postCid = String(payload.cid || "").trim();
  if (!postUri || !postCid) {
    throw new Error("Für den Like fehlen URI oder CID des Posts.");
  }

  const auth = await ensureSession();
  const result = await bskyFetch("com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: xrpcBaseForService(auth.pdsUrl || auth.service),
    body: JSON.stringify({
      repo: auth.session.did,
      collection: "app.bsky.feed.like",
      record: {
        $type: "app.bsky.feed.like",
        createdAt: new Date().toISOString(),
        subject: {
          uri: postUri,
          cid: postCid,
        },
      },
    }),
  });

  return {
    uri: String(result?.uri || "").trim(),
    cid: String(result?.cid || "").trim(),
  };
}

/**
 * Removes one existing like record for the active account.
 * @param {object} payload - Request payload from the UI.
 * @param {string} payload.likeUri - AT URI of the existing like record.
 * @returns {Promise<object>} Removed like record reference.
 */
async function unlikePost(payload = {}) {
  const likeUri = String(payload.likeUri || "").trim();
  if (!likeUri) {
    throw new Error("Für Unlike fehlt die URI des Like-Datensatzes.");
  }

  const auth = await ensureSession();
  await deleteRepoRecord(auth, likeUri);
  return {
    uri: likeUri,
  };
}

async function publishThread({ segments, langs, postInteraction, replyTarget } = {}, notifyProgress = () => {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Es gibt keine Segmente zum Posten.");
  }

  const auth = await ensureSession();
  const normalizedLangs = normalizePostLanguageTags(langs);
  const normalizedPostInteraction = normalizePostInteractionSettings(postInteraction);
  const normalizedReplyTarget = replyTarget && typeof replyTarget === "object"
    ? {
        replyRoot: {
          uri: String(replyTarget.replyRoot?.uri || "").trim(),
          cid: String(replyTarget.replyRoot?.cid || "").trim(),
        },
        replyParent: {
          uri: String(replyTarget.replyParent?.uri || "").trim(),
          cid: String(replyTarget.replyParent?.cid || "").trim(),
        },
      }
    : null;
  const resolveCache = new Map();
  const posts = [];
  let latestRateLimit = null;
  let root = normalizedReplyTarget?.replyRoot?.uri && normalizedReplyTarget?.replyRoot?.cid ? normalizedReplyTarget.replyRoot : null;
  let parent = normalizedReplyTarget?.replyParent?.uri && normalizedReplyTarget?.replyParent?.cid ? normalizedReplyTarget.replyParent : null;

  notifyProgress({ message: "Thread wird auf Bluesky gepostet …" });

  try {
    for (const [segmentIndex, segment] of segments.entries()) {
      notifyProgress({ message: `Thread-Abschnitt ${segmentIndex + 1}/${segments.length} wird gepostet …` });
      const record = {
        $type: "app.bsky.feed.post",
        text: typeof segment === "string" ? segment : segment.text,
        createdAt: new Date().toISOString(),
      };
      if (normalizedLangs.length > 0) {
        record.langs = normalizedLangs;
      }
      const richTextResult = await buildRichTextFacets(record.text, auth, resolveCache);
      if (Array.isArray(richTextResult.unresolvedHandles) && richTextResult.unresolvedHandles.length > 0) {
        const unresolvedLabel = richTextResult.unresolvedHandles
          .map((handle) => `@${handle}`)
          .join(", ");
        throw new Error(`Diese Erwaehnung konnte nicht aufgeloest werden: ${unresolvedLabel}. Bitte den Handle pruefen.`);
      }
      if (richTextResult.facets) {
        record.facets = richTextResult.facets;
      }

      const images = Array.isArray(segment?.images) ? segment.images.slice(0, MAX_IMAGES_PER_SEGMENT) : [];
      const externalCard = normalizeLinkCard(segment?.externalCard);
      if (externalCard && images.length > 0) {
        throw new Error("Link-Card und Bilder koennen nicht im selben Abschnitt gepostet werden.");
      }
      if (externalCard) {
        const external = {
          uri: externalCard.url,
          title: String(externalCard.title || externalCard.url).slice(0, 300),
          description: String(externalCard.description || "").slice(0, 1000),
        };
        if (segment.externalCard?.thumb instanceof Blob) {
          notifyProgress({ message: `Link-Card-Vorschaubild für Abschnitt ${segmentIndex + 1} wird hochgeladen …` });
          external.thumb = await uploadBlob(auth, segment.externalCard.thumb);
        }
        record.embed = {
          $type: "app.bsky.embed.external",
          external,
        };
      } else if (images.length > 0) {
        const embeddedImages = [];
        for (const [imageIndex, image] of images.entries()) {
          notifyProgress({ message: `Bild ${imageIndex + 1}/${images.length} für Abschnitt ${segmentIndex + 1} wird hochgeladen …` });
          const blobRef = await uploadBlob(auth, image.blob);
          embeddedImages.push({
            alt: String(image.alt || "").slice(0, 2000),
            image: blobRef,
            aspectRatio: image.width && image.height ? { width: image.width, height: image.height } : undefined,
          });
        }

        record.embed = images.length <= 4
          ? {
              $type: "app.bsky.embed.images",
              images: embeddedImages,
            }
          : {
              $type: "app.bsky.embed.gallery",
              items: embeddedImages.map((image) => ({
                $type: "app.bsky.embed.gallery#image",
                ...image,
              })),
            };
      }

      if (root && parent) {
        record.reply = {
          root,
          parent,
        };
      }

      const createdResult = await bskyFetch("com.atproto.repo.createRecord", {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: xrpcBaseForService(auth.pdsUrl || auth.service),
        returnMeta: true,
        body: JSON.stringify({
          repo: auth.session.did,
          collection: "app.bsky.feed.post",
          record,
        }),
      });
      latestRateLimit = createdResult.meta?.rateLimit || latestRateLimit;
      const created = createdResult.data || {};

      const ref = {
        uri: created.uri,
        cid: created.cid,
      };

      notifyProgress({ message: `Interaktionseinstellungen für Abschnitt ${segmentIndex + 1}/${segments.length} werden gesetzt …` });
      latestRateLimit = await applyPostInteractionGates(auth, ref, normalizedPostInteraction) || latestRateLimit;

      if (!root) {
        root = ref;
      }

      parent = ref;
      posts.push(ref);
    }
  } catch (error) {
    if (posts.length > 0) {
      const partialError = new Error(error?.message || "Thread konnte nicht vollständig gepostet werden.");
      partialError.details = {
        code: "PARTIAL_PUBLISH",
        postedCount: posts.length,
        totalCount: segments.length,
        rateLimit: error?.details?.rateLimit || latestRateLimit || null,
        retryAfterMs: error?.details?.retryAfterMs || 0,
        status: error?.details?.status || 0,
      };
      throw partialError;
    }

    throw error;
  }

  return {
    posts,
    handle: auth.session.handle,
    service: auth.service || DEFAULT_LOGIN_SERVICE,
    webApp: auth.webApp || resolvePostWebBase(auth.service),
    rateLimit: latestRateLimit,
  };
}
