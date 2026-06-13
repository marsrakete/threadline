importScripts("./version.js");

const APP_VERSION = globalThis.APP_VERSION_INFO?.cacheVersion || "v0";
const CACHE_NAME = `threadline-${APP_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./post-languages.js",
  "./translations.js",
  "./manifest.webmanifest",
  "./version.js",
  "./README.md",
  "./README.de.md",
  "./og-image.jpg",
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
const DM_PARTNER_CACHE_KEY = "dm-partner-cache";
const ACCOUNT_AVATAR_CACHE_KEY = "account-avatar-cache";
const ARCHIVE_THREAD_REQUEST_TIMEOUT_MS = 15000;
const ARCHIVE_THREAD_REQUEST_RETRIES = 1;
const ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY = 4;
const API_BASE = "https://bsky.social/xrpc";
const DEFAULT_LOGIN_SERVICE = "https://bsky.social";
const DEFAULT_POST_WEB_APP = "https://bsky.app";
const CHAT_PROXY_DID = "did:web:api.bsky.chat#bsky_chat";
const POST_WEB_FRONTENDS = {
  "bsky.social": "https://bsky.app",
  "bsky.app": "https://bsky.app",
  "eurosky.social": "https://mu.social",
  "mu.social": "https://mu.social",
};
const archiveRunControls = new Map();

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
    alt: String(entry.alt || "").slice(0, 1000),
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
  const regex = /(^|\s|\()(@)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)(?=$|[\s).,;:!?])/g;
  let match;

  while ((match = regex.exec(text))) {
    const handle = match[3].toLowerCase();
    const start = match.index + match[1].length;
    const end = start + handle.length + 1;
    candidates.push({ handle, start, end });
  }

  return candidates;
}

async function resolveHandleToDid(handle, auth, cache) {
  if (cache.has(handle)) {
    return cache.get(handle);
  }

  const url = `${API_BASE}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  const response = await fetch(url, {
    headers: auth?.session?.accessJwt
      ? { authorization: `Bearer ${auth.session.accessJwt}` }
      : undefined,
  });

  if (!response.ok) {
    cache.set(handle, null);
    return null;
  }

  const data = await response.json().catch(() => ({}));
  const did = typeof data.did === "string" && data.did ? data.did : null;
  cache.set(handle, did);
  return did;
}

async function parseMentionFacets(text, auth, cache) {
  const facets = [];
  const candidates = parseMentionCandidates(text);

  for (const candidate of candidates) {
    const did = await resolveHandleToDid(candidate.handle, auth, cache);
    if (!did) {
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

  return facets;
}

async function buildRichTextFacets(text, auth, resolveCache) {
  const linkFacets = parseLinkFacets(text);
  const hashtagFacets = parseHashtagFacets(text);
  const mentionFacets = await parseMentionFacets(text, auth, resolveCache);
  const combined = [...linkFacets, ...mentionFacets, ...hashtagFacets]
    .sort((left, right) => left.index.byteStart - right.index.byteStart);

  const accepted = [];
  for (const facet of combined) {
    if (accepted.some((entry) => facetRangesOverlap(entry.index, facet.index))) {
      continue;
    }
    accepted.push(facet);
  }

  return accepted.length > 0 ? accepted : undefined;
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
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
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

  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
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
      console.error(error);
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
    case "GET_DM_PARTNER_CACHE":
      return getDmPartnerCache();
    case "GET_ACCOUNT_AVATAR_CACHE":
      return getAccountAvatarCache();
    case "SAVE_ARCHIVE_SESSION":
      return saveArchiveSession(message.payload);
    case "SAVE_ARCHIVE_CATALOG":
      return saveArchiveCatalog(message.payload);
    case "SAVE_DM_PARTNER_CACHE":
      return saveDmPartnerCache(message.payload);
    case "SAVE_ACCOUNT_AVATAR_CACHE":
      return saveAccountAvatarCache(message.payload);
    case "CLEAR_ARCHIVE_SESSION":
      return clearArchiveSession();
    case "CLEAR_ARCHIVE_CATALOG":
      return clearArchiveCatalog();
    case "CLEAR_DM_PARTNER_CACHE":
      return clearDmPartnerCache();
    case "SET_ARCHIVE_RUN_CONTROL":
      return setArchiveRunControl(message.payload);
    case "SWITCH_ACCOUNT":
      return switchAccount(message.payload);
    case "IMPORT_ACCOUNT_METADATA":
      return importAccountMetadata(message.payload);
    case "REMOVE_ACCOUNT":
      return removeAccount(message.payload);
    case "LOGOUT":
      return logout();
    case "PUBLISH_THREAD":
      return publishThread(message.payload, (progress) => port.postMessage({ progress }));
    case "EXPORT_ACCOUNT_ARCHIVE_WAVE":
      return exportAccountArchiveWave(message.payload, (progress) => port.postMessage({ progress }));
    case "IMPORT_ARCHIVE_THREAD_FROM_URL":
      return importArchiveThreadFromUrl(message.payload, (progress) => port.postMessage({ progress }));
    case "CHECK_POST_EDIT":
      return checkPostEditMetadata(message.payload);
    case "CHECK_DM_ACCESS":
      return checkDmAccess();
    case "LOAD_NETWORK_SLICE":
      return loadNetworkSlice(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_NETWORK_ACTOR_FOCUS":
      return loadNetworkActorFocus(message.payload, (progress) => port.postMessage({ progress }));
    case "LOAD_NETWORK_COMMON_MUTUALS":
      return loadNetworkCommonMutuals(message.payload, (progress) => port.postMessage({ progress }));
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

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains(COMPOSER_IMAGE_STORE_NAME)) {
        database.createObjectStore(COMPOSER_IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB konnte nicht geoeffnet werden."));
  });
}

function normalizeServiceUrl(value) {
  let url = String(value || "").trim();

  if (!url) {
    return DEFAULT_LOGIN_SERVICE;
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

function isInsecureServiceUrl(value) {
  return /^http:\/\//i.test(String(value || "").trim());
}

function assertSecureServiceUrl(value) {
  if (isInsecureServiceUrl(value)) {
    throw createServiceWorkerError(
      "Insecure service URLs are not allowed. Please use HTTPS.",
      "INSECURE_SERVICE_URL",
    );
  }
}

function xrpcBaseForService(service) {
  assertSecureServiceUrl(service);
  return `${normalizeServiceUrl(service)}/xrpc`;
}

async function buildPublicBlobUrlForDid(auth, did, cid, serviceCache = null) {
  const serviceUrl = await resolvePdsForDid(did, auth.pdsUrl || auth.service, serviceCache);
  return `${xrpcBaseForService(serviceUrl)}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

function resolvePostWebBase(serviceUrl = DEFAULT_LOGIN_SERVICE) {
  try {
    const host = new URL(normalizeServiceUrl(serviceUrl)).hostname.toLowerCase();
    return POST_WEB_FRONTENDS[host] || DEFAULT_POST_WEB_APP;
  } catch {
    return DEFAULT_POST_WEB_APP;
  }
}

function buildPostWebUrl(handle, recordKey, serviceUrl = DEFAULT_LOGIN_SERVICE) {
  if (!handle || !recordKey) {
    return "";
  }

  return `${resolvePostWebBase(serviceUrl)}/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordKey)}`;
}

function normalizeAuthAccount(entry = {}) {
  const did = entry.session?.did || entry.did || "";
  const handle = entry.session?.handle || entry.handle || entry.identifier || "";
  return {
    did,
    identifier: String(entry.identifier || handle || ""),
    handle: String(handle || ""),
    service: normalizeServiceUrl(entry.service || entry.pdsUrl || DEFAULT_LOGIN_SERVICE),
    pdsUrl: normalizeServiceUrl(entry.pdsUrl || entry.service || DEFAULT_LOGIN_SERVICE),
    avatar: String(entry.avatar || ""),
    avatarPath: String(entry.avatarPath || ""),
    appPassword: entry.appPassword ? String(entry.appPassword) : "",
    session: entry.session && typeof entry.session === "object" ? entry.session : null,
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}

function normalizeAuthState(value) {
  if (!value) {
    return { activeDid: "", accounts: [] };
  }

  if (Array.isArray(value.accounts)) {
    const accounts = value.accounts
      .map((entry) => normalizeAuthAccount(entry))
      .filter((entry) => entry.did || entry.identifier);
    const activeDid = accounts.some((entry) => entry.did && entry.did === value.activeDid)
      ? value.activeDid
      : "";
    return { activeDid, accounts };
  }

  if (value.session?.did || value.identifier) {
    const account = normalizeAuthAccount(value);
    return {
      activeDid: account.did || "",
      accounts: account.did || account.identifier ? [account] : [],
    };
  }

  return { activeDid: "", accounts: [] };
}

function getAccountPublicMeta(account) {
  return {
    did: account.did || "",
    identifier: account.identifier || "",
    handle: account.handle || account.identifier || "",
    service: normalizeServiceUrl(account.service || account.pdsUrl || DEFAULT_LOGIN_SERVICE),
    avatar: account.avatar || "",
    avatarPath: account.avatarPath || "",
    hasStoredPassword: Boolean(account.appPassword),
    hasSession: Boolean(account.session?.did),
    updatedAt: account.updatedAt || "",
  };
}

function buildAuthResponse(state, account = null) {
  const activeAccount = account || state.accounts.find((entry) => entry.did && entry.did === state.activeDid) || null;
  return {
    authenticated: Boolean(activeAccount?.session?.did),
    identifier: activeAccount?.identifier || "",
    handle: activeAccount?.handle || "",
    did: activeAccount?.did || "",
    service: activeAccount?.service || "",
    accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
  };
}

function upsertAccount(state, account) {
  const normalized = normalizeAuthAccount(account);
  const accounts = state.accounts.filter((entry) =>
    !((normalized.did && entry.did === normalized.did) || (!normalized.did && entry.identifier === normalized.identifier)));
  accounts.unshift(normalized);
  return {
    activeDid: state.activeDid,
    accounts,
  };
}

async function readStoredAuth() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(AUTH_KEY);

    request.onsuccess = () => resolve(normalizeAuthState(request.result || null));
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht gelesen werden."));
  });
}

async function writeStoredAuth(value) {
  const database = await openDatabase();
  const normalizedValue = normalizeAuthState(value);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(normalizedValue, AUTH_KEY);

    request.onsuccess = () => resolve(normalizedValue);
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht geschrieben werden."));
  });
}

async function clearStoredAuth() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(AUTH_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht geloescht werden."));
  });
}

async function readStoredValue(key) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht gelesen werden."));
  });
}

async function writeStoredValue(key, value) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht geschrieben werden."));
  });
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

function decodeJwtPayload(jwt) {
  const [, payload] = jwt.split(".");
  if (!payload) {
    return null;
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  return JSON.parse(decoded);
}

function isJwtValid(accessJwt) {
  if (!accessJwt) {
    return false;
  }

  try {
    const payload = decodeJwtPayload(accessJwt);
    if (!payload?.exp) {
      return true;
    }

    return payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

async function bskyFetch(endpoint, options = {}) {
  const base = options.base || API_BASE;
  const response = await fetch(`${base}/${endpoint}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const code = response.status === 401
      ? "AUTH_INVALID_CREDENTIALS"
      : "BSKY_REQUEST_FAILED";
    throw createServiceWorkerError(
      data.message || data.error || `Bluesky request failed (${response.status}).`,
      code,
      { status: response.status },
    );
  }

  return data;
}

async function refreshAuthReference(auth) {
  if (!auth?.did) {
    return auth;
  }

  const freshAuth = await ensureSession(auth.did);
  if (!freshAuth) {
    return auth;
  }

  Object.assign(auth, freshAuth);
  auth.session = freshAuth.session;
  return auth;
}

async function fetchDidDocument(did) {
  if (!did) {
    throw new Error("DID fehlt.");
  }

  if (did.startsWith("did:plc:")) {
    const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`DID-Dokument konnte nicht geladen werden (${response.status}).`);
    }
    return response.json();
  }

  if (did.startsWith("did:web:")) {
    const host = did.slice("did:web:".length).replace(/:/g, "/");
    const response = await fetch(`https://${host}/.well-known/did.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`DID-Dokument konnte nicht geladen werden (${response.status}).`);
    }
    return response.json();
  }

  throw new Error(`Nicht unterstütztes DID-Format: ${did}`);
}

function extractPdsServiceFromDidDocument(documentNode, fallbackService) {
  const services = Array.isArray(documentNode?.service) ? documentNode.service : [];
  const pds = services.find((entry) =>
    entry?.type === "AtprotoPersonalDataServer"
    || String(entry?.id || "").endsWith("#atproto_pds"));

  return normalizeServiceUrl(pds?.serviceEndpoint || fallbackService || DEFAULT_LOGIN_SERVICE);
}

async function fetchAccountAvatar(did, auth = null) {
  try {
    const profile = await bskyFetch(`app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, {
      method: "GET",
      headers: auth?.session?.accessJwt
        ? { authorization: `Bearer ${auth.session.accessJwt}` }
        : undefined,
      base: auth?.pdsUrl || auth?.service ? authXrpcBase(auth) : undefined,
    });
    return typeof profile?.avatar === "string" ? profile.avatar : "";
  } catch {
    return "";
  }
}

async function bskyGet(endpoint, query = {}, options = {}) {
  const search = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => search.append(key, entry));
      return;
    }
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return bskyFetch(`${endpoint}${suffix}`, {
    method: "GET",
    headers: options.headers || {},
    base: options.base,
    signal: options.signal,
  });
}

function authXrpcBase(auth = null) {
  return xrpcBaseForService(auth?.pdsUrl || auth?.service || DEFAULT_LOGIN_SERVICE);
}

function buildChatProxyHeaders(auth, headers = {}) {
  return {
    authorization: `Bearer ${auth.session.accessJwt}`,
    "atproto-proxy": CHAT_PROXY_DID,
    ...headers,
  };
}

async function chatBskyGet(auth, endpoint, query = {}) {
  return bskyGet(endpoint, query, {
    base: authXrpcBase(auth),
    headers: buildChatProxyHeaders(auth),
  });
}

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

async function collectEntireGraph(auth, endpoint, actorDid, source, notifyProgress, title, stepPrefix, percent) {
  const maxPage = 100;
  const collected = [];
  let nextCursor = "";
  let pages = 0;
  do {
    const page = await collectGraphPage(auth, endpoint, actorDid, nextCursor, maxPage, source);
    collected.push(...page.profiles);
    nextCursor = page.cursor;
    pages += 1;
    notifyProgress({
      title,
      step: stepPrefix,
      percent,
      detail: `${collected.length} geladen · Seite ${pages}`,
    });
  } while (nextCursor);
  return collected;
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

async function uploadBlob(auth, file) {
  const response = await fetch(`${xrpcBaseForService(auth.pdsUrl || auth.service)}/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
      "content-type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || `Bluesky-Fehler: ${response.status}`);
  }
  return data.blob;
}

async function downloadBlob(auth, did, cid) {
  const response = await fetch(`${xrpcBaseForService(auth.pdsUrl || auth.service)}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw await buildBlobDownloadError(response);
  }

  return {
    type: response.headers.get("content-type") || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

async function resolvePdsForDid(did, fallbackService = DEFAULT_LOGIN_SERVICE, cache = null) {
  const key = String(did || "").trim();
  if (!key) {
    return normalizeServiceUrl(fallbackService || DEFAULT_LOGIN_SERVICE);
  }

  if (cache?.has(key)) {
    return cache.get(key);
  }

  let serviceUrl = normalizeServiceUrl(fallbackService || DEFAULT_LOGIN_SERVICE);
  try {
    const didDocument = await fetchDidDocument(key);
    serviceUrl = extractPdsServiceFromDidDocument(didDocument, serviceUrl);
  } catch {
    serviceUrl = normalizeServiceUrl(fallbackService || DEFAULT_LOGIN_SERVICE);
  }

  cache?.set(key, serviceUrl);
  return serviceUrl;
}

async function downloadBlobForDid(auth, did, cid, serviceCache = null) {
  const serviceUrl = await resolvePdsForDid(did, auth.pdsUrl || auth.service, serviceCache);
  const response = await fetch(`${xrpcBaseForService(serviceUrl)}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw await buildBlobDownloadError(response);
  }

  return {
    type: response.headers.get("content-type") || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

async function buildBlobDownloadError(response) {
  const status = Number(response?.status) || 0;
  let payload = null;
  try {
    payload = await response.clone().json();
  } catch {
    payload = null;
  }

  const remoteError = String(payload?.error || "").trim();
  const remoteMessage = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || remoteError === "InvalidToken") {
    return new Error("Blob-Zugriff verweigert. Der Host erlaubt den Abruf nicht oder der Account ist eingeschränkt/blockiert.");
  }
  if (status === 404 || remoteError === "RepoNotFound") {
    return new Error("Blob oder Repo nicht gefunden. Das Bild ist auf dem Ursprungshost möglicherweise nicht mehr verfügbar.");
  }
  if (status === 400) {
    return new Error("Blob konnte vom Ursprungshost nicht bereitgestellt werden.");
  }

  return new Error(remoteMessage || `Blob konnte nicht geladen werden (${status}).`);
}

async function login({ identifier, appPassword, service } = {}) {
  if (!identifier || !appPassword) {
    throw createServiceWorkerError(
      "Identifier and app password are required.",
      "LOGIN_MISSING_CREDENTIALS",
    );
  }

  const normalizedService = normalizeServiceUrl(service || DEFAULT_LOGIN_SERVICE);
  const session = await bskyFetch("com.atproto.server.createSession", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      password: appPassword,
    }),
    base: xrpcBaseForService(normalizedService),
  });

  const didDocument = await fetchDidDocument(session.did).catch(() => null);
  const pdsUrl = extractPdsServiceFromDidDocument(didDocument, normalizedService);
  const avatar = await fetchAccountAvatar(session.did, { session, service: normalizedService, pdsUrl });
  const serviceCache = new Map();
  const avatarCache = await getAccountAvatarCache();
  const cachedAvatar = avatar
    ? await cacheStoredAccountAvatar({
        did: session.did,
        identifier,
        handle: session.handle,
        service: normalizedService,
        pdsUrl,
        avatar,
        session,
      }, avatarCache?.assets, serviceCache).catch(() => null)
    : null;
  if (cachedAvatar) {
    await saveAccountAvatarCache({
      cache: {
        updatedAt: new Date().toISOString(),
        assets: cachedAvatar.assets,
      },
    });
  }
  const nextState = upsertAccount(await readStoredAuth(), {
    did: session.did,
    identifier,
    handle: session.handle,
    service: normalizedService,
    pdsUrl,
    avatar,
    avatarPath: cachedAvatar?.account?.avatarPath || "",
    appPassword,
    session,
    updatedAt: new Date().toISOString(),
  });
  nextState.activeDid = session.did;
  const storedState = await writeStoredAuth(nextState);
  return buildAuthResponse(storedState, storedState.accounts.find((entry) => entry.did === session.did));
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
  const localePreference = storedSettings?.localePreference || legacyLocalePreference;
  const locale = localePreference && localePreference !== "auto" ? localePreference : (browserLocale || "en");

    return {
      authenticated: Boolean(auth?.session?.did),
    identifier: auth?.identifier || "",
    handle: auth?.session?.handle || "",
    did: auth?.did || "",
    service: auth?.service || DEFAULT_LOGIN_SERVICE,
    accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
    accountAvatarAssets: normalizeAccountAvatarAssets(accountAvatarCache?.assets),
    draft: typeof draft === "string" ? draft : (draft?.sourceText || ""),
    locale,
    localePreference: localePreference || "auto",
    tipsVisible: storedSettings?.tipsVisible !== false,
      altTextRequired: storedSettings?.altTextRequired !== false,
      themeMode: storedSettings?.themeMode === "dark" ? "dark" : "light",
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
    hashtags,
    selectedHashtags,
    hashtagPlacement: ["first", "last", "all-top", "all-bottom"].includes(storedSettings?.hashtagPlacement)
      ? storedSettings.hashtagPlacement
      : "first",
    segmentImages: hydratedSegmentImages,
    segmentOverrides: normalizeSegmentOverrides(draft?.segmentOverrides),
    postingHistory: normalizePostingHistory(storedSettings?.postingHistory),
    archivePreferences: storedSettings?.archivePreferences && typeof storedSettings.archivePreferences === "object"
      ? storedSettings.archivePreferences
      : null,
  };
}

async function saveDraft({ draft, segmentImages, segmentOverrides } = {}) {
  const normalizedImages = await storeComposerImageBlobs(segmentImages);
  await writeStoredValue(DRAFT_KEY, {
    sourceText: draft || "",
    segmentImages: normalizeSegmentImageMetadata(normalizedImages),
    segmentOverrides: normalizeSegmentOverrides(segmentOverrides),
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
  const normalizedImages = Array.isArray(settings.segmentImages)
    ? await storeComposerImageBlobs(settings.segmentImages)
    : normalizeSegmentImages(existing.segmentImages);
  const nextSettings = {
    ...existing,
    ...settings,
    localePreference: settings.localePreference || existing.localePreference || "auto",
    tipsVisible: settings.tipsVisible !== undefined ? settings.tipsVisible : (existing.tipsVisible !== false),
    altTextRequired: settings.altTextRequired !== false,
      themeMode: settings.themeMode === "dark"
        ? "dark"
        : (settings.themeMode === "light" ? "light" : (existing.themeMode === "dark" ? "dark" : "light")),
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
    hashtags,
    selectedHashtags,
    hashtagPlacement: ["first", "last", "all-top", "all-bottom"].includes(settings.hashtagPlacement)
      ? settings.hashtagPlacement
      : (["first", "last", "all-top", "all-bottom"].includes(existing.hashtagPlacement) ? existing.hashtagPlacement : "first"),
    segmentImages: Array.isArray(settings.segmentImages)
      ? normalizeSegmentImageMetadata(normalizedImages)
      : normalizeSegmentImageMetadata(existing.segmentImages),
    postingHistory: Array.isArray(settings.postingHistory)
      ? normalizePostingHistory(settings.postingHistory)
      : normalizePostingHistory(existing.postingHistory),
    archivePreferences: settings.archivePreferences && typeof settings.archivePreferences === "object"
      ? settings.archivePreferences
      : (existing.archivePreferences && typeof existing.archivePreferences === "object" ? existing.archivePreferences : null),
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

async function getDmPartnerCache() {
  return await readStoredValue(DM_PARTNER_CACHE_KEY) || null;
}

async function getAccountAvatarCache() {
  return await readStoredValue(ACCOUNT_AVATAR_CACHE_KEY) || null;
}

async function saveArchiveSession({ session } = {}) {
  await writeStoredValue(ARCHIVE_SESSION_KEY, session || null);
  return { ok: true };
}

async function saveArchiveCatalog({ catalog } = {}) {
  await writeStoredValue(ARCHIVE_CATALOG_KEY, catalog || null);
  return { ok: true };
}

async function saveDmPartnerCache({ cache } = {}) {
  await writeStoredValue(DM_PARTNER_CACHE_KEY, cache || null);
  return { ok: true };
}

async function saveAccountAvatarCache({ cache } = {}) {
  await writeStoredValue(ACCOUNT_AVATAR_CACHE_KEY, cache || null);
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
      bytes: asset?.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset?.bytes || []),
    }))
    .filter((asset) => asset.did && asset.url && asset.path && asset.bytes.length > 0);
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

function setArchiveRunControl({ runId, action } = {}) {
  if (!runId) {
    return { ok: false };
  }

  const current = archiveRunControls.get(runId) || { state: "running" };
  if (action === "pause") {
    current.state = "paused";
  } else if (action === "resume") {
    current.state = "running";
  } else if (action === "cancel") {
    current.state = "cancelled";
  }
  archiveRunControls.set(runId, current);
  return { ok: true, state: current.state };
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

async function ensureSession(targetDid = null) {
  const state = await readStoredAuth();
  const desiredDid = targetDid || state.activeDid;
  const auth = state.accounts.find((entry) => entry.did && entry.did === desiredDid);

  if (!auth?.did) {
    throw new Error("Keine gespeicherte Bluesky-Session gefunden.");
  }

  if (auth.session?.accessJwt && isJwtValid(auth.session.accessJwt)) {
    return auth;
  }

  if (auth.session?.refreshJwt) {
    try {
      const refreshedSession = await bskyFetch("com.atproto.server.refreshSession", {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.session.refreshJwt}`,
        },
        base: xrpcBaseForService(auth.pdsUrl || auth.service),
      });

      const avatar = auth.avatar || await fetchAccountAvatar(auth.did, {
        session: refreshedSession,
        service: freshAuth.service || auth.service,
        pdsUrl: freshAuth.pdsUrl || auth.pdsUrl,
      });
      const serviceCache = new Map();
      const avatarCache = await getAccountAvatarCache();
      const cachedAvatar = avatar
        ? await cacheStoredAccountAvatar({
            ...auth,
            session: refreshedSession,
            avatar,
          }, avatarCache?.assets, serviceCache).catch(() => null)
        : null;
      if (cachedAvatar) {
        await saveAccountAvatarCache({
          cache: {
            updatedAt: new Date().toISOString(),
            assets: cachedAvatar.assets,
          },
        });
      }
      const nextState = upsertAccount(state, {
        ...auth,
        session: refreshedSession,
        avatar,
        avatarPath: cachedAvatar?.account?.avatarPath || auth.avatarPath || "",
        updatedAt: new Date().toISOString(),
      });
      nextState.activeDid = auth.did;
      const storedState = await writeStoredAuth(nextState);
      return storedState.accounts.find((entry) => entry.did === auth.did);
    } catch (error) {
      console.warn("refreshSession fehlgeschlagen, versuche createSession erneut", error);
    }
  }

  if (!auth.identifier || !auth.appPassword) {
    throw new Error("Die Session ist abgelaufen und es ist kein App-Passwort zum Erneuern gespeichert.");
  }

  return login({
    identifier: auth.identifier,
    appPassword: auth.appPassword,
    service: auth.service,
  }).then(async () => {
    const refreshedState = await readStoredAuth();
    const refreshedAuth = refreshedState.accounts.find((entry) => entry.did === auth.did);
    if (!refreshedAuth) {
      throw new Error("Session konnte nicht erneuert werden.");
    }
    return refreshedAuth;
  });
}

async function checkConnectivity() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const state = await readStoredAuth();
    const activeAccount = state.accounts.find((entry) => entry.did && entry.did === state.activeDid);
    const serviceBase = xrpcBaseForService(activeAccount?.pdsUrl || activeAccount?.service || DEFAULT_LOGIN_SERVICE);
    const response = await fetch(`${serviceBase}/com.atproto.server.describeServer`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createServiceWorkerError(
        `Bluesky request failed (${response.status}).`,
        "CONNECTIVITY_FAILED",
        { status: response.status },
      );
    }

    return { ok: true };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createServiceWorkerError(
        "The Bluesky connectivity check timed out.",
        "CONNECTIVITY_TIMEOUT",
      );
    }

    if (error?.details?.code === "INSECURE_SERVICE_URL") {
      throw error;
    }
    throw createServiceWorkerError(
      "Could not connect to Bluesky.",
      "CONNECTIVITY_FAILED",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAtUri(uri = "") {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/(.+)$/.exec(String(uri || ""));
  if (!match) {
    return { did: "", collection: "", rkey: "" };
  }
  return {
    did: match[1],
    collection: match[2],
    rkey: match[3],
  };
}

function getBlobCidFromRef(image = {}) {
  return image?.image?.ref?.$link
    || image?.image?.cid
    || image?.cid
    || image?.ref?.$link
    || "";
}

function parseBlobUrlInfo(url = "") {
  const value = String(url || "").trim();
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const plainIndex = parts.findIndex((part) => part === "plain");
    if (plainIndex === -1 || parts.length < plainIndex + 3) {
      return null;
    }
    const did = decodeURIComponent(parts[plainIndex + 1] || "");
    const rawCid = decodeURIComponent(parts[plainIndex + 2] || "");
    const cid = rawCid.split("@")[0].split(".")[0];
    if (!did || !cid) {
      return null;
    }
    return { did, cid };
  } catch {
    return null;
  }
}

async function downloadRemoteAssetViaBlob(auth, url, fallbackDid = "", serviceCache = null) {
  const blobInfo = parseBlobUrlInfo(url);
  if (blobInfo?.did && blobInfo?.cid) {
    return downloadBlobForDid(auth, blobInfo.did, blobInfo.cid, serviceCache);
  }
  if (fallbackDid && blobInfo?.cid) {
    return downloadBlobForDid(auth, fallbackDid, blobInfo.cid, serviceCache);
  }
  return downloadRemoteAsset(url);
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
        alt: String(image.alt || "").slice(0, 1000),
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
        alt: String(videoEntry.alt || "").slice(0, 1000),
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
    throw new Error("Account fuer Medienexport konnte nicht aufgeloest werden.");
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

async function downloadAccountMediaAsset({ item } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  if (!item || typeof item !== "object") {
    throw new Error("Kein Medium zum Laden uebergeben.");
  }

  const pathStem = String(item.pathStem || "").trim();
  const cid = String(item.cid || "").trim();
  const remoteUrl = String(item.remoteUrl || "").trim();
  const authorDid = String(item.authorDid || auth.session.did || "").trim();
  if (!pathStem || (!cid && !remoteUrl)) {
    throw new Error("Medienquelle ist unvollstaendig.");
  }

  notifyProgress({
    step: `${item.kind === "video" ? "Video" : (item.kind === "other" ? "Asset" : "Bild")} wird geladen`,
    detail: String(item.postUri || "").trim(),
  });

  let blob = null;
  if (cid) {
    blob = await downloadBlobForDid(auth, authorDid, cid, new Map());
  } else if (remoteUrl) {
    blob = await downloadRemoteAssetViaBlob(auth, remoteUrl, authorDid, new Map());
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
    alt: String(item.alt || "").slice(0, 1000),
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
  };
}

async function attachArchiveAvatarAssets(posts, assets, seenAssetPaths, auth = null, serviceCache = null, notifyProgress = null, progressBasePercent = 56) {
  const postsByAvatarUrl = new Map();
  for (const post of Array.isArray(posts) ? posts : []) {
    const avatarUrl = String(post?.authorAvatar || "").trim();
    if (!avatarUrl) {
      continue;
    }
    if (!postsByAvatarUrl.has(avatarUrl)) {
      postsByAvatarUrl.set(avatarUrl, []);
    }
    postsByAvatarUrl.get(avatarUrl).push(post);
  }

  const avatarEntries = [...postsByAvatarUrl.entries()];
  const total = Math.max(1, avatarEntries.length);
  let processedCount = 0;

  await mapWithConcurrency(avatarEntries, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async ([avatarUrl, linkedPosts]) => {
    const samplePost = linkedPosts[0] || null;
    try {
      const blob = await downloadRemoteAssetViaBlob(
        auth,
        avatarUrl,
        samplePost?.authorDid || "",
        serviceCache,
      );
      const extension = getAssetExtensionFromMimeType(blob.type);
      const authorSlug = String(samplePost?.authorHandle || samplePost?.authorDid || "author")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 60) || "author";
      const path = `avatars/${authorSlug}.${extension}`;
      linkedPosts.forEach((post) => {
        post.authorAvatarPath = path;
      });
      if (!seenAssetPaths.has(path)) {
        seenAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
    } catch {
      linkedPosts.forEach((post) => {
        post.authorAvatarPath = "";
      });
    }

    processedCount += 1;
    if (typeof notifyProgress === "function" && (processedCount % 10 === 0 || processedCount === total)) {
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Avatare ${processedCount}/${total} vorbereitet`,
        percent: Math.min(64, progressBasePercent + Math.round((processedCount / total) * 4)),
        detail: "Eindeutige Profilbilder werden lokal ergänzt",
        checkpoint: `Avatare vorbereitet (${processedCount}/${total})`,
        state: "running",
      });
    }
  });
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

function normalizeArchiveFilters(filters = {}) {
  return {
    scope: filters.scope === "year" || filters.scope === "range" ? filters.scope : "all",
    contentMode: ["posts", "thread_roots", "threads", "full"].includes(filters.contentMode) ? filters.contentMode : "posts",
    year: String(filters.year || "").trim(),
    from: String(filters.from || "").trim(),
    to: String(filters.to || "").trim(),
    hashtagTags: normalizeHashtagEntries(filters.hashtagTags).map((entry) => entry.normalized),
    hashtagScope: filters.hashtagScope === "startpost" ? "startpost" : "thread",
  };
}

function collectNormalizedHashtagsFromRecord(record = {}) {
  const tags = new Set();
  const addTag = (value) => {
    const parsed = parseHashtagValue(value);
    if (parsed?.normalized) {
      tags.add(parsed.normalized);
    }
  };

  const facets = Array.isArray(record?.facets) ? record.facets : [];
  facets.forEach((facet) => {
    const features = Array.isArray(facet?.features) ? facet.features : [];
    features.forEach((feature) => {
      if (feature?.$type === "app.bsky.richtext.facet#tag") {
        addTag(feature.tag || feature.value || "");
      }
    });
  });

  const text = typeof record?.text === "string" ? record.text : "";
  if (text) {
    parseHashtagFacets(text).forEach((facet) => {
      const features = Array.isArray(facet?.features) ? facet.features : [];
      features.forEach((feature) => {
        if (feature?.$type === "app.bsky.richtext.facet#tag") {
          addTag(feature.tag || feature.value || "");
        }
      });
    });
  }

  return tags;
}

function recordMatchesArchiveHashtags(record = {}, filters = {}) {
  const selectedTags = Array.isArray(filters?.hashtagTags) ? filters.hashtagTags : [];
  if (!selectedTags.length) {
    return true;
  }

  const recordTags = collectNormalizedHashtagsFromRecord(record);
  return selectedTags.some((tag) => recordTags.has(tag));
}

async function rootPostMatchesArchiveHashtags(rootUri, filters, auth, cache = new Map()) {
  const selectedTags = Array.isArray(filters?.hashtagTags) ? filters.hashtagTags : [];
  if (!rootUri || !selectedTags.length) {
    return false;
  }
  if (cache.has(rootUri)) {
    return cache.get(rootUri);
  }

  let threadResponse = null;
  try {
    const activeAuth = await refreshAuthReference(auth);
    threadResponse = await bskyGet("app.bsky.feed.getPostThread", {
      uri: rootUri,
      depth: 0,
      parentHeight: 0,
    }, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });
  } catch (error) {
    if (isMissingArchivePostError(error)) {
      cache.set(rootUri, false);
      return false;
    }
    throw error;
  }

  const rootPostView = threadResponse?.thread?.post?.uri
    ? threadResponse.thread.post
    : (threadResponse?.post?.uri
      ? threadResponse.post
      : (threadResponse?.thread?.uri ? threadResponse.thread : threadResponse));
  const matches = recordMatchesArchiveHashtags(rootPostView?.record || {}, filters);
  cache.set(rootUri, matches);
  return matches;
}

async function threadMatchesArchiveHashtags(rootUri, filters, auth, cache = new Map()) {
  const selectedTags = Array.isArray(filters?.hashtagTags) ? filters.hashtagTags : [];
  if (!rootUri || !selectedTags.length) {
    return false;
  }
  if (cache.has(rootUri)) {
    return cache.get(rootUri);
  }

  let threadResponse = null;
  try {
    const activeAuth = await refreshAuthReference(auth);
    threadResponse = await bskyGet("app.bsky.feed.getPostThread", {
      uri: rootUri,
      depth: 100,
      parentHeight: 0,
    }, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });
  } catch (error) {
    if (isMissingArchivePostError(error)) {
      cache.set(rootUri, false);
      return false;
    }
    throw error;
  }

  const matches = collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse)
    .some((postView) => recordMatchesArchiveHashtags(postView?.record || {}, filters));
  cache.set(rootUri, matches);
  return matches;
}

async function postMatchesMediaExportHashtagSelection(postView, filters, auth, threadCache = new Map(), rootCache = new Map()) {
  const selectedTags = Array.isArray(filters?.hashtagTags) ? filters.hashtagTags : [];
  if (!selectedTags.length) {
    return true;
  }

  const record = postView?.record || {};
  if (recordMatchesArchiveHashtags(record, filters)) {
    return true;
  }

  const fallbackUri = postView?.uri || "";
  const rootUri = getArchiveRootUri(record, fallbackUri) || fallbackUri;
  if (!rootUri) {
    return false;
  }

  if (filters.hashtagScope === "startpost") {
    if (rootUri === fallbackUri) {
      return false;
    }
    return rootPostMatchesArchiveHashtags(rootUri, filters, auth, rootCache);
  }

  return threadMatchesArchiveHashtags(rootUri, filters, auth, threadCache);
}

function postMatchesArchiveFilters(record, filters) {
  const createdAt = typeof record?.createdAt === "string" ? record.createdAt : "";
  if (!createdAt) {
    return true;
  }

  if (filters.scope === "year" && filters.year) {
    return createdAt.startsWith(`${filters.year}-`);
  }

  if (filters.scope === "range") {
    const timestamp = Date.parse(createdAt);
    if (Number.isNaN(timestamp)) {
      return false;
    }
    if (filters.from && timestamp < Date.parse(`${filters.from}T00:00:00.000Z`)) {
      return false;
    }
    if (filters.to && timestamp > Date.parse(`${filters.to}T23:59:59.999Z`)) {
      return false;
    }
  }

  return true;
}

function getArchiveRootUri(record = {}, fallbackUri = "") {
  return record?.reply?.root?.uri || (record?.reply ? "" : fallbackUri);
}

function getArchiveParentUri(record = {}) {
  return record?.reply?.parent?.uri || "";
}

function recordBelongsToOwnThread(record = {}, ownDid = "", fallbackUri = "") {
  const rootUri = getArchiveRootUri(record, fallbackUri);
  if (!rootUri) {
    return true;
  }
  return parseAtUri(rootUri).did === ownDid;
}

function recordBelongsToOwnMainThreadPath(record = {}, ownDid = "", fallbackUri = "") {
  if (!recordBelongsToOwnThread(record, ownDid, fallbackUri)) {
    return false;
  }
  if (!record?.reply) {
    return true;
  }
  const parentUri = getArchiveParentUri(record);
  if (!parentUri) {
    return true;
  }
  return parseAtUri(parentUri).did === ownDid;
}

function postMatchesArchiveSelection(record, filters, ownDid, fallbackUri = "") {
  if (!postMatchesArchiveFilters(record, filters)) {
    return false;
  }

  if (filters.contentMode === "full") {
    return true;
  }

  if (filters.contentMode === "thread_roots") {
    return recordBelongsToOwnMainThreadPath(record, ownDid, fallbackUri);
  }

  if (!record?.reply) {
    return true;
  }

  return recordBelongsToOwnThread(record, ownDid, fallbackUri);
}

function extractArchiveEmbedImages(record = {}) {
  const embed = record?.embed;
  if (!embed || typeof embed !== "object") {
    return [];
  }

  if (Array.isArray(embed.images)) {
    return embed.images.slice(0, MAX_IMAGES_PER_SEGMENT);
  }

  if (embed.media && typeof embed.media === "object") {
    return extractArchiveEmbedImages({ embed: embed.media });
  }

  return [];
}

function extractArchiveEmbedVideos(record = {}) {
  const embed = record?.embed;
  if (!embed || typeof embed !== "object") {
    return [];
  }

  if (embed.video && typeof embed.video === "object") {
    return [{
      video: embed.video,
      alt: String(embed.alt || "").trim(),
      aspectRatio: embed.aspectRatio && typeof embed.aspectRatio === "object"
        ? {
            width: Number(embed.aspectRatio.width) || 0,
            height: Number(embed.aspectRatio.height) || 0,
          }
        : null,
    }];
  }

  if (embed.media && typeof embed.media === "object") {
    return extractArchiveEmbedVideos({ embed: embed.media });
  }

  return [];
}

function extractArchiveExternalCardFromRecord(record = {}) {
  const embed = record?.embed;
  if (!embed || typeof embed !== "object") {
    return null;
  }

  const external = embed.external && typeof embed.external === "object"
    ? embed.external
    : (embed.media?.external && typeof embed.media.external === "object" ? embed.media.external : null);

  if (!external) {
    return null;
  }

  const url = String(external.uri || external.url || "").trim();
  const title = String(external.title || "").trim();
  const description = String(external.description || "").trim();
  const thumbRef = external.thumb || external.thumbnail || external.image || null;
  const thumb = typeof thumbRef === "string"
    ? thumbRef
    : String(thumbRef?.uri || thumbRef?.url || thumbRef?.thumb || "").trim();
  if (!url && !title && !description && !thumbRef) {
    return null;
  }
  return {
    url,
    title,
    description,
    thumb,
    thumbRef,
    thumbPath: "",
  };
}

function buildArchivePostEntity({ uri, cid, record = {}, authorHandle = "", authorDid = "", authorDisplayName = "", authorAvatar = "", counts = null }) {
  const parsed = parseAtUri(uri);
  return {
    uri,
    cid: cid || "",
    rkey: parsed.rkey,
    createdAt: record?.createdAt || "",
    text: record?.text || "",
    langs: Array.isArray(record?.langs) ? record.langs : [],
    facets: Array.isArray(record?.facets) ? record.facets : [],
    reply: record?.reply || null,
    thread: {
      rootUri: getArchiveRootUri(record, uri),
      parentUri: getArchiveParentUri(record),
    },
    counts: counts || {
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      quoteCount: 0,
    },
    permalink: parsed.rkey
      ? buildPostWebUrl(authorHandle || authorDid || "unknown", parsed.rkey)
      : "",
    authorHandle,
    authorDisplayName,
    authorDid,
    authorAvatar,
    authorAvatarPath: "",
    externalCard: extractArchiveExternalCardFromRecord(record),
    images: [],
  };
}

function mergeArchivePostEntity(existing, incoming) {
  existing.cid = incoming.cid || existing.cid;
  existing.rkey = incoming.rkey || existing.rkey;
  existing.createdAt = incoming.createdAt || existing.createdAt;
  existing.text = incoming.text || existing.text;
  existing.langs = incoming.langs?.length ? incoming.langs : existing.langs;
  existing.facets = incoming.facets?.length ? incoming.facets : existing.facets;
  existing.reply = incoming.reply || existing.reply;
  existing.thread = {
    rootUri: incoming.thread?.rootUri || existing.thread?.rootUri || "",
    parentUri: incoming.thread?.parentUri || existing.thread?.parentUri || "",
  };
  existing.counts = incoming.counts || existing.counts;
  existing.permalink = incoming.permalink || existing.permalink;
  existing.authorHandle = incoming.authorHandle || existing.authorHandle;
  existing.authorDisplayName = incoming.authorDisplayName || existing.authorDisplayName;
  existing.authorDid = incoming.authorDid || existing.authorDid;
  existing.authorAvatar = incoming.authorAvatar || existing.authorAvatar;
  existing.authorAvatarPath = incoming.authorAvatarPath || existing.authorAvatarPath;
  existing.externalCard = incoming.externalCard || existing.externalCard;
  if ((!existing.images || existing.images.length === 0) && incoming.images?.length) {
    existing.images = incoming.images;
  }
  return existing;
}

function collectThreadViewPosts(node, result = []) {
  if (!node || typeof node !== "object") {
    return result;
  }

  const postView = node.post && node.post.uri
    ? node.post
    : (node.uri && node.record ? node : null);

  if (postView?.uri) {
    result.push(postView);
  }

  const replies = Array.isArray(node.replies)
    ? node.replies
    : (Array.isArray(postView?.replies) ? postView.replies : []);
  replies.forEach((reply) => collectThreadViewPosts(reply, result));
  return result;
}

function isMissingArchivePostError(error) {
  const message = String(error?.message || "").trim().toLowerCase();
  return message.includes("post not found")
    || message.includes("record not found")
    || message.includes("could not locate record")
    || message.includes("not found");
}

function isArchiveThreadTimeoutError(error) {
  return String(error?.message || "").toLowerCase().includes("thread request timed out");
}

async function archiveGetPostThread(auth, uri, {
  depth = 100,
  parentHeight = 0,
  timeoutMs = ARCHIVE_THREAD_REQUEST_TIMEOUT_MS,
  retries = ARCHIVE_THREAD_REQUEST_RETRIES,
  notifyProgress = null,
  progressTitle = "Archiv wird gelesen",
  progressPercent = 50,
  progressDetail = "",
  checkpointPrefix = "Thread wird geladen",
} = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const activeAuth = await refreshAuthReference(auth);
      return await bskyGet("app.bsky.feed.getPostThread", {
        uri,
        depth,
        parentHeight,
      }, {
        headers: {
          authorization: `Bearer ${activeAuth.session.accessJwt}`,
        },
        base: authXrpcBase(activeAuth),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        lastError = new Error(`Thread request timed out after ${Math.round(timeoutMs / 1000)}s.`);
        if (typeof notifyProgress === "function") {
          const isRetry = attempt < retries;
          notifyProgress({
            title: progressTitle,
            step: isRetry
              ? `Thread-Antwort dauert länger als ${Math.round(timeoutMs / 1000)}s · neuer Versuch startet`
              : `Thread-Antwort bleibt zu langsam · Thread wird übersprungen`,
            percent: progressPercent,
            detail: progressDetail || uri,
            checkpoint: isRetry
              ? `${checkpointPrefix} · Wiederholungsversuch ${attempt + 2}/${retries + 1}`
              : `${checkpointPrefix} · Timeout`,
            state: "running",
          });
        }
      } else {
        lastError = error;
      }
      if (attempt >= retries) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("Thread request timed out.");
}

function collectThreadPathPosts(node, targetUri, result = []) {
  if (!node || typeof node !== "object") {
    return false;
  }

  const postView = node.post && node.post.uri
    ? node.post
    : (node.uri && node.record ? node : null);

  const replies = Array.isArray(node.replies)
    ? node.replies
    : (Array.isArray(postView?.replies) ? postView.replies : []);

  if (postView?.uri === targetUri) {
    result.push(postView);
    return true;
  }

  for (const reply of replies) {
    if (collectThreadPathPosts(reply, targetUri, result)) {
      if (postView?.uri) {
        result.unshift(postView);
      }
      return true;
    }
  }

  return false;
}

function collectThreadAuthorPosts(node, authorDid, result = []) {
  if (!node || typeof node !== "object") {
    return result;
  }

  const postView = node.post && node.post.uri
    ? node.post
    : (node.uri && node.record ? node : null);

  if (postView?.uri && (!authorDid || postView.author?.did === authorDid)) {
    result.push(postView);
  }

  const replies = Array.isArray(node.replies)
    ? node.replies
    : (Array.isArray(postView?.replies) ? postView.replies : []);
  replies.forEach((reply) => collectThreadAuthorPosts(reply, authorDid, result));
  return result;
}

function chunkEntries(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function normalizeDmDateFilterValue(value, isEnd = false) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T${isEnd ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizeDmFilters(filters = {}) {
  return {
    participantDid: String(filters.participantDid || "").trim(),
    from: String(filters.from || ""),
    to: String(filters.to || ""),
  };
}

function normalizeDmConversationEntity(convo = {}, selfDid = "") {
  const members = Array.isArray(convo.members) ? convo.members : [];
  const filteredMembers = members.filter((member) => member?.did && member.did !== selfDid);
  const memberHandles = filteredMembers.map((member) => member.handle || member.did).filter(Boolean);
  const participantCount = filteredMembers.length;
  const isGroup = convo.isGroup === true || participantCount > 1;
  return {
    id: convo.id || convo.convoId || crypto.randomUUID(),
    rev: convo.rev || "",
    isGroup,
    participantCount,
    memberHandles,
    members: filteredMembers.map((member) => ({
      did: member.did || "",
      handle: member.handle || "",
      displayName: member.displayName || member.handle || "",
      avatar: member.avatar || "",
    })),
    title: convo.name || convo.title || "",
    unreadCount: Number(convo.unreadCount) || 0,
    lastMessageAt: convo.lastMessage?.sentAt || convo.updatedAt || convo.createdAt || "",
    updatedAt: convo.updatedAt || convo.lastMessage?.sentAt || convo.createdAt || "",
    raw: convo,
  };
}

function collectDmEmbeds(message = {}) {
  const candidates = [
    message,
    message.embed,
    message.external,
    message.card,
    message.link,
    ...(Array.isArray(message.embeds) ? message.embeds : []),
    message.message,
    message.message?.embed,
    message.message?.external,
    message.message?.card,
    message.message?.link,
    ...(Array.isArray(message.message?.embeds) ? message.message.embeds : []),
    message.record,
    message.record?.embed,
    message.record?.external,
    message.record?.card,
    message.record?.link,
    ...(Array.isArray(message.record?.embeds) ? message.record.embeds : []),
    message.content,
    message.content?.embed,
    message.content?.external,
    message.content?.card,
    message.content?.link,
    ...(Array.isArray(message.content?.embeds) ? message.content.embeds : []),
  ].filter(Boolean);
  return candidates;
}

function collectDmFacets(message = {}) {
  const candidates = [
    message.facets,
    message.message?.facets,
    message.record?.facets,
    message.content?.facets,
  ];
  for (const facets of candidates) {
    if (Array.isArray(facets) && facets.length > 0) {
      return facets;
    }
  }
  return [];
}

function extractDmExternalCardFromEmbedSw(embed) {
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
  const thumbRef = external.thumb || external.thumbnail || external.image || null;
  const thumb = typeof thumbRef === "string"
    ? thumbRef
    : String(thumbRef?.uri || thumbRef?.url || thumbRef?.thumb || "").trim();

  if (url) {
    return {
      url,
      title,
      description,
      thumb,
      thumbRef,
    };
  }

  if (embed.media) {
    return extractDmExternalCardFromEmbedSw(embed.media);
  }

  if (Array.isArray(embed.embeds)) {
    for (const nestedEmbed of embed.embeds) {
      const match = extractDmExternalCardFromEmbedSw(nestedEmbed);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function normalizeDmMessageEntity(message = {}, convoId = "") {
  const sender = message.sender || message.author || {};
  return {
    id: message.id || message.msgId || crypto.randomUUID(),
    convoId,
    sentAt: message.sentAt || message.createdAt || "",
    text: String(message.text || message.message?.text || ""),
    senderDid: sender.did || message.senderDid || "",
    senderHandle: sender.handle || "",
    senderDisplayName: sender.displayName || sender.handle || "",
    senderAvatar: sender.avatar || "",
    senderAvatarPath: "",
    facets: collectDmFacets(message),
    embeds: collectDmEmbeds(message),
    externalCard: null,
    raw: message,
  };
}

async function exportDmArchive({ filters, partnerCache } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const ownAvatar = auth.avatar || await fetchAccountAvatar(auth.session.did, auth);
  let ownAvatarPath = "";
  const pdsServiceCache = new Map();
  const normalizedFilters = normalizeDmFilters(filters);
  const fromTime = normalizeDmDateFilterValue(normalizedFilters.from, false);
  const toTime = normalizeDmDateFilterValue(normalizedFilters.to, true);
  if (!normalizedFilters.participantDid) {
    throw new Error("Bitte zuerst genau einen DM-Partner auswählen.");
  }

  const cachedPartnerPayload = partnerCache && typeof partnerCache === "object"
    ? {
        recentContacts: Array.isArray(partnerCache.recentContacts) ? partnerCache.recentContacts : [],
        conversations: Array.isArray(partnerCache.conversations) ? partnerCache.conversations : [],
        assets: Array.isArray(partnerCache.assets) ? partnerCache.assets : [],
      }
    : null;
  const partnerPayload = cachedPartnerPayload?.conversations?.length
    ? cachedPartnerPayload
    : await listDmPartners({ downloadAssets: false }, () => {});
  const filteredConversations = (Array.isArray(partnerPayload.conversations) ? partnerPayload.conversations : [])
    .filter((convo) => (convo.members || []).some((member) => member.did === normalizedFilters.participantDid));
  const messages = [];
  const participantSet = new Set();

  for (const [index, convo] of filteredConversations.entries()) {
    let messageCursor = "";
    let convoMessageCount = 0;
    do {
      const response = await chatBskyGet(auth, "chat.bsky.convo.getMessages", {
        convoId: convo.id,
        limit: 100,
        cursor: messageCursor,
      });
      const items = Array.isArray(response.messages) ? response.messages : [];
      items.forEach((message) => {
        const normalized = normalizeDmMessageEntity(message, convo.id);
        const sentAtTime = normalized.sentAt ? Date.parse(normalized.sentAt) : NaN;
        if (Number.isFinite(fromTime) && Number.isFinite(sentAtTime) && sentAtTime < fromTime) {
          return;
        }
        if (Number.isFinite(toTime) && Number.isFinite(sentAtTime) && sentAtTime > toTime) {
          return;
        }
        messages.push(normalized);
        convoMessageCount += 1;
      });
      messageCursor = response.cursor || "";
      notifyProgress({
        title: "Direct Messages werden geladen",
        step: `Unterhaltung ${index + 1}/${filteredConversations.length} wird gelesen`,
        percent: Math.min(92, 30 + Math.round(((index + 1) / Math.max(1, filteredConversations.length)) * 60)),
        detail: `${messages.length} Nachrichten lokal gesammelt`,
      });
    } while (messageCursor);

    convo.messageCount = convoMessageCount;
    convo.members.forEach((member) => {
      if (member.did) {
        participantSet.add(member.did);
      }
    });
  }

  const keptConversationIds = new Set(messages.map((message) => message.convoId));
  const finalConversations = filteredConversations.filter((convo) => keptConversationIds.has(convo.id) || !normalizedFilters.from && !normalizedFilters.to);
  const assets = Array.isArray(partnerPayload.assets) ? [...partnerPayload.assets] : [];
  const existingAssetPaths = new Set(assets.map((asset) => asset.path));
  const selectedPartner = (Array.isArray(partnerPayload.recentContacts) ? partnerPayload.recentContacts : [])
    .find((contact) => contact.did === normalizedFilters.participantDid)
    || finalConversations.flatMap((convo) => convo.members || []).find((member) => member.did === normalizedFilters.participantDid)
    || null;
  const memberByDid = new Map();

  finalConversations.forEach((convo) => {
    (convo.members || []).forEach((member) => {
      if (member?.did && !memberByDid.has(member.did)) {
        memberByDid.set(member.did, member);
      }
    });
  });

  messages.forEach((message) => {
    if (message.senderDid === auth.session.did) {
      message.senderHandle = auth.session.handle || message.senderHandle || "";
      message.senderDisplayName = auth.session.handle || message.senderDisplayName || message.senderHandle || "";
      message.senderAvatar = ownAvatar || message.senderAvatar || "";
      return;
    }
    const member = memberByDid.get(message.senderDid);
    if (!member) {
      return;
    }
    message.senderHandle = member.handle || message.senderHandle || "";
    message.senderDisplayName = member.displayName || member.handle || message.senderDisplayName || "";
    message.senderAvatar = member.avatar || message.senderAvatar || "";
  });

  for (const message of messages) {
    const externalCard = (Array.isArray(message.embeds) ? message.embeds : [])
      .map((embed) => extractDmExternalCardFromEmbedSw(embed))
      .find(Boolean);
    if (!externalCard) {
      continue;
    }
    message.externalCard = {
      url: externalCard.url,
      title: externalCard.title,
      description: externalCard.description,
      thumb: externalCard.thumb || "",
      thumbPath: "",
    };
    const thumbCid = getBlobCidFromRef(externalCard.thumbRef || {});
    const thumbUrl = typeof externalCard.thumbRef === "string"
      ? externalCard.thumbRef
      : String(externalCard.thumbRef?.uri || externalCard.thumbRef?.url || externalCard.thumbRef?.thumb || "").trim();
    if (!thumbCid) {
      if (!thumbUrl) {
        continue;
      }
      try {
        const blob = await downloadRemoteAssetViaBlob(
          auth,
          thumbUrl,
          message.senderDid || normalizedFilters.participantDid || auth.session.did,
          pdsServiceCache,
        );
        const extension = getAssetExtensionFromMimeType(blob.type);
        const slug = String(message.senderHandle || message.senderDid || "link-card").replace(/[^\w.-]+/g, "-").slice(0, 60) || "link-card";
        const path = `dm-link-cards/${slug}-${message.id || crypto.randomUUID()}.${extension}`;
        if (!existingAssetPaths.has(path)) {
          existingAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
        message.externalCard.thumbPath = path;
      } catch {
        // Keep card text even if thumbnail cannot be loaded.
      }
      continue;
    }
    try {
      const blob = await downloadBlobForDid(auth, message.senderDid || normalizedFilters.participantDid || auth.session.did, thumbCid);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const slug = String(message.senderHandle || message.senderDid || "link-card").replace(/[^\w.-]+/g, "-").slice(0, 60) || "link-card";
      const path = `dm-link-cards/${slug}-${message.id || crypto.randomUUID()}.${extension}`;
      if (!existingAssetPaths.has(path)) {
        existingAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
      message.externalCard.thumbPath = path;
    } catch {
      // Keep card text even if thumbnail cannot be loaded.
    }
  }

  if (selectedPartner?.avatar && !selectedPartner.avatarPath) {
    try {
      const blob = await downloadRemoteAssetViaBlob(auth, selectedPartner.avatar, selectedPartner.did, pdsServiceCache);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const partnerSlug = String(selectedPartner.handle || selectedPartner.did || "partner")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 60) || "partner";
      const path = `dm-avatars/${partnerSlug}.${extension}`;
      if (!existingAssetPaths.has(path)) {
        existingAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
      selectedPartner.avatarPath = path;
      (Array.isArray(partnerPayload.recentContacts) ? partnerPayload.recentContacts : []).forEach((contact) => {
        if (contact.did === selectedPartner.did) {
          contact.avatarPath = path;
        }
      });
      finalConversations.forEach((convo) => {
        (convo.members || []).forEach((member) => {
          if (member.did === selectedPartner.did) {
            member.avatarPath = path;
          }
        });
      });
    } catch {
      selectedPartner.avatarPath = "";
    }
  }

  if (ownAvatar && !ownAvatarPath) {
    try {
      const blob = await downloadRemoteAssetViaBlob(auth, ownAvatar, auth.session.did, pdsServiceCache);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const ownSlug = String(auth.session.handle || auth.session.did || "self")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 60) || "self";
      const path = `dm-avatars/${ownSlug}.${extension}`;
      if (!existingAssetPaths.has(path)) {
        existingAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
      ownAvatarPath = path;
      messages.forEach((message) => {
        if (message.senderDid === auth.session.did) {
          message.senderAvatarPath = path;
        }
      });
    } catch {
      // Keep export working without own avatar.
    }
  }

  notifyProgress({
    title: "Direct Messages werden geladen",
    step: "DM-Archiv wird zusammengestellt …",
    percent: 98,
    detail: `${finalConversations.length} Konversationen · ${messages.length} Nachrichten`,
  });

  return {
    manifest: {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      account: {
        handle: auth.session.handle,
        did: auth.session.did,
        displayName: auth.session.handle,
        avatar: ownAvatar || "",
        avatarPath: ownAvatarPath,
      },
      filters: normalizedFilters,
      sourceType: "dm-chat-api",
      conversationCount: finalConversations.length,
      messageCount: messages.length,
      participantCount: participantSet.size,
    },
    recentContacts: Array.isArray(partnerPayload.recentContacts) ? partnerPayload.recentContacts : [],
    conversations: finalConversations,
    messages,
    assets,
  };
}

async function checkDmAccess() {
  const auth = await ensureSession();
  await chatBskyGet(auth, "chat.bsky.convo.listConvos", { limit: 1 });
  return { ok: true };
}

async function listDmPartners(payload = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const downloadAssets = payload?.downloadAssets !== false;
  const conversations = [];
  const recentContactsMap = new Map();
  const assets = [];
  const seenAssetPaths = new Set();
  const pdsServiceCache = new Map();
  let cursor = "";
  let page = 0;

  notifyProgress({
    title: "DM-Partner werden geladen",
    step: "Konversationsliste wird gelesen …",
    percent: 8,
    detail: "",
  });

  do {
    const response = await chatBskyGet(auth, "chat.bsky.convo.listConvos", {
      limit: 100,
      cursor,
    });
    const convos = Array.isArray(response.convos) ? response.convos : [];
    convos.forEach((convo) => {
      const normalizedConvo = normalizeDmConversationEntity(convo, auth.session.did);
      conversations.push(normalizedConvo);
      normalizedConvo.members.forEach((member) => {
        if (!member.did) {
          return;
        }
        const existing = recentContactsMap.get(member.did);
        const candidateTimestamp = Date.parse(normalizedConvo.lastMessageAt || normalizedConvo.updatedAt || 0) || 0;
        const existingTimestamp = Date.parse(existing?.lastMessageAt || existing?.updatedAt || 0) || 0;
        if (!existing || candidateTimestamp > existingTimestamp) {
          recentContactsMap.set(member.did, {
            did: member.did,
            handle: member.handle || "",
            displayName: member.displayName || member.handle || "",
            avatar: member.avatar || "",
            lastMessageAt: normalizedConvo.lastMessageAt || normalizedConvo.updatedAt || "",
            conversationId: normalizedConvo.id,
          });
        }
      });
    });
    cursor = response.cursor || "";
    page += 1;
    const listDone = !cursor;
    notifyProgress({
      title: "DM-Partner werden geladen",
      step: `${recentContactsMap.size} DM-Partner gefunden`,
      percent: downloadAssets
        ? Math.min(54, 8 + (page * 12))
        : Math.min(100, 8 + (page * 15)),
      detail: cursor
        ? "Weitere Konversationsseiten werden geladen …"
        : listDone && downloadAssets
          ? "Partnerliste geladen. Avatar-Bilder werden jetzt gesichert …"
          : "Partnerliste vollständig geladen.",
    });
  } while (cursor);

  const recentContacts = Array.from(recentContactsMap.values())
    .sort((left, right) => (Date.parse(right.lastMessageAt || 0) || 0) - (Date.parse(left.lastMessageAt || 0) || 0));

  if (downloadAssets) {
    const avatarContacts = recentContacts.filter((contact) => contact.avatar);
    for (const [index, contact] of avatarContacts.entries()) {
      notifyProgress({
        title: "DM-Partner werden geladen",
        step: `Avatar-Bilder werden geladen (${index + 1}/${avatarContacts.length})`,
        percent: avatarContacts.length > 0
          ? 58 + Math.round(((index + 1) / avatarContacts.length) * 40)
          : 98,
        detail: contact.displayName || contact.handle || contact.did || "",
      });
      if (!contact.avatar) {
        continue;
      }
      try {
        const blob = await downloadRemoteAssetViaBlob(auth, contact.avatar, contact.did, pdsServiceCache);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const slug = String(contact.handle || contact.did || "partner").replace(/[^\w.-]+/g, "-").slice(0, 60) || "partner";
        const path = `dm-avatars/${slug}.${extension}`;
        contact.avatarPath = path;
        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
        conversations.forEach((convo) => {
          (convo.members || []).forEach((member) => {
            if (member.did === contact.did) {
              member.avatarPath = path;
            }
          });
        });
      } catch {
        contact.avatarPath = "";
      }
    }
    notifyProgress({
      title: "DM-Partner werden geladen",
      step: "Partnerliste vollständig geladen",
      percent: 100,
      detail: `${recentContacts.length} DM-Partner stehen lokal bereit.`,
    });
  }

  return {
    recentContacts,
    conversations,
    assets,
  };
}

async function hydrateDmPartnerAvatars(payload = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const contacts = Array.isArray(payload.recentContacts) ? payload.recentContacts.map((contact) => ({ ...contact })) : [];
  const conversations = Array.isArray(payload.conversations)
    ? payload.conversations.map((convo) => ({
        ...convo,
        members: Array.isArray(convo.members) ? convo.members.map((member) => ({ ...member })) : [],
      }))
    : [];
  const assets = [];
  const seenAssetPaths = new Set();
  const pdsServiceCache = new Map();
  const avatarContacts = contacts.filter((contact) => contact.avatar);

  notifyProgress({
    title: "DM-Partner werden geladen",
    step: "Avatar-Bilder werden gesichert …",
    percent: 56,
    detail: avatarContacts.length > 0 ? `${avatarContacts.length} Bilder werden vorbereitet` : "",
  });

  for (const [index, contact] of avatarContacts.entries()) {
    notifyProgress({
      title: "DM-Partner werden geladen",
      step: `Avatar-Bilder werden geladen (${index + 1}/${avatarContacts.length})`,
      percent: avatarContacts.length > 0
        ? 58 + Math.round(((index + 1) / avatarContacts.length) * 40)
        : 98,
      detail: contact.displayName || contact.handle || contact.did || "",
    });
    try {
      const blob = await downloadRemoteAssetViaBlob(auth, contact.avatar, contact.did, pdsServiceCache);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const slug = String(contact.handle || contact.did || "partner").replace(/[^\w.-]+/g, "-").slice(0, 60) || "partner";
      const path = `dm-avatars/${slug}.${extension}`;
      contact.avatarPath = path;
      if (!seenAssetPaths.has(path)) {
        seenAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
      conversations.forEach((convo) => {
        (convo.members || []).forEach((member) => {
          if (member.did === contact.did) {
            member.avatarPath = path;
          }
        });
      });
    } catch {
      contact.avatarPath = "";
    }
  }

  notifyProgress({
    title: "DM-Partner werden geladen",
    step: "Partnerliste vollständig geladen",
    percent: 100,
    detail: `${contacts.length} DM-Partner stehen lokal bereit.`,
  });

  return {
    recentContacts: contacts,
    conversations,
    assets,
  };
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

async function waitForArchiveRunControl(runId, notifyProgress = () => {}) {
  if (!runId) {
    return "running";
  }

  while (true) {
    const state = archiveRunControls.get(runId)?.state || "running";
    if (state === "cancelled") {
      return "cancelled";
    }
    if (state === "paused") {
      notifyProgress({
        title: "Archiv pausiert",
        step: "Der Export ist pausiert und kann fortgesetzt werden …",
        state: "paused",
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
      continue;
    }
    if (state === "running") {
      notifyProgress({ state: "running" });
    }
    return "running";
  }
}

async function exportAccountArchiveWave({ runId, filters, cursor: initialCursor = "", maxPosts = 500, waveIndex = 1 } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const normalizedFilters = normalizeArchiveFilters(filters);
  const ownDid = auth.session.did;
  const pdsServiceCache = new Map();
  const threadHashtagMatchCache = new Map();
  const rootHashtagMatchCache = new Map();
  const hasHashtagFilter = Array.isArray(normalizedFilters.hashtagTags) && normalizedFilters.hashtagTags.length > 0;
  const selectedHashtagCount = hasHashtagFilter ? normalizedFilters.hashtagTags.length : 0;
  const records = [];
  const rawRecordsByUri = new Map();
  const postsByUri = new Map();
  let cursor = String(initialCursor || "");
  let pageCount = 0;
  const waveLimit = Math.max(100, Math.min(1000, Number(maxPosts) || 500));
  let imageCount = 0;
  let skippedImageCount = 0;
  let orderedPosts = [];
  const assets = [];
  const seenAssetPaths = new Set();
  let previewCounter = 0;
  let cancelled = false;
  let hashtagFilteredOutCount = 0;

  const buildHashtagProgressDetail = (baseDetail = "") => {
    if (!hasHashtagFilter) {
      return baseDetail;
    }
    const suffix = `${selectedHashtagCount} Hashtags aktiv · ${hashtagFilteredOutCount} Posts wegen Hashtag-Filter übersprungen`;
    return baseDetail ? `${baseDetail} · ${suffix}` : suffix;
  };

  archiveRunControls.set(runId, { state: "running" });

  const buildResult = (status = "completed") => ({
    manifest: {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      account: {
        handle: auth.session.handle,
        did: auth.session.did,
      },
      filters: normalizedFilters,
      postCount: orderedPosts.length,
      imageCount,
      skippedImageCount,
      hashtagFilteredOutCount,
    },
    posts: orderedPosts,
    assets,
    session: {
      waveIndex,
      nextCursor: cursor,
      hasMore: Boolean(cursor),
      exportedPosts: orderedPosts.length,
      exportedImages: imageCount,
      skippedImages: skippedImageCount,
      status,
    },
  });

  notifyProgress({
    title: "Archiv wird gelesen",
    step: "Eigene Posts werden aus dem Repo geladen …",
    percent: 5,
    detail: buildHashtagProgressDetail(
      hasHashtagFilter
        ? `Konto: ${auth.session.handle} · Hashtag-Filter aktiv`
        : `Konto: ${auth.session.handle}`,
    ),
    checkpoint: `Welle ${waveIndex} · Start`,
    state: "running",
  });

  while (true) {
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      cancelled = true;
      break;
    }

    const activeAuth = await refreshAuthReference(auth);
    const remaining = Math.max(1, Math.min(100, waveLimit - records.length));
    const page = await bskyGet("com.atproto.repo.listRecords", {
      repo: auth.session.did,
      collection: "app.bsky.feed.post",
      limit: remaining,
      cursor,
    }, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });

    const pageRecords = [];
    for (const entry of (page.records || [])) {
      const normalizedEntry = {
        uri: entry.uri,
        cid: entry.cid,
        value: entry.value || {},
      };
      if (!postMatchesArchiveSelection(normalizedEntry.value, normalizedFilters, ownDid, normalizedEntry.uri)) {
        continue;
      }
      if (hasHashtagFilter) {
        const matchesHashtagSelection = await postMatchesMediaExportHashtagSelection({
          uri: normalizedEntry.uri,
          record: normalizedEntry.value,
        }, normalizedFilters, auth, threadHashtagMatchCache, rootHashtagMatchCache);
        if (!matchesHashtagSelection) {
          hashtagFilteredOutCount += 1;
          continue;
        }
      }
      pageRecords.push(normalizedEntry);
    }

    records.push(...pageRecords);
    cursor = page.cursor || "";
    pageCount += 1;
    notifyProgress({
      title: "Archiv wird gelesen",
      step: `${pageCount} Repo-Seiten geprüft · ${records.length} passende Posts gefunden`,
      percent: Math.min(45, 5 + (pageCount * 3)),
      detail: buildHashtagProgressDetail(
        hasHashtagFilter
          ? `${records.length} Posts für Welle ${waveIndex} vorgemerkt · Posts werden mit Hashtag-Filter geprüft`
          : `${records.length} Posts für Welle ${waveIndex} vorgemerkt`,
      ),
      checkpoint: `Welle ${waveIndex} · ${records.length} Posts gefunden`,
      state: "running",
    });

    if (records.length > 0) {
      previewCounter += 1;
      if (previewCounter % 10 === 0) {
        const latest = records[Math.max(0, records.length - 1)];
        notifyProgress({
          preview: {
            meta: `Welle ${waveIndex} · ${records.length} Posts gefunden`,
            text: String(latest?.value?.text || "").slice(0, 280),
          },
          checkpoint: `Welle ${waveIndex} · ${records.length} Posts gefunden`,
          state: "running",
        });
      }
    }

    if (records.length >= waveLimit || !cursor) {
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
        authorHandle: auth.session.handle,
        authorDisplayName: auth.session.handle,
        authorDid: ownDid,
        authorAvatar: auth.avatar || "",
      }),
      entry.value,
    );
  });

  if ((normalizedFilters.contentMode === "threads" || normalizedFilters.contentMode === "thread_roots") && records.length > 0) {
    const threadRootUris = [...new Set(records
      .map((entry) => getArchiveRootUri(entry.value, entry.uri) || entry.uri)
      .filter((uri) => parseAtUri(uri).did === ownDid))];

    for (const [threadIndex, rootUri] of threadRootUris.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        orderedPosts = Array.from(postsByUri.values())
          .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
        archiveRunControls.delete(runId);
        return buildResult("cancelled");
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
        threadResponse = await archiveGetPostThread(auth, rootUri, {
          depth: 100,
          parentHeight: 0,
          notifyProgress,
          progressTitle: "Archiv wird gelesen",
          progressPercent: 45 + Math.round(((threadIndex + 1) / Math.max(1, threadRootUris.length)) * 10),
          progressDetail: rootUri,
          checkpointPrefix: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
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
        if (parseAtUri(rootCandidate).did !== ownDid) {
          continue;
        }
        if (normalizedFilters.contentMode === "thread_roots") {
          if ((postView.author?.did || "") !== ownDid) {
            continue;
          }
          if (!recordBelongsToOwnMainThreadPath(record, ownDid, postView.uri)) {
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

  orderedPosts = Array.from(postsByUri.values())
    .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

  const metricBatches = chunkEntries(orderedPosts.map((entry) => entry.uri), 25);
  for (const [batchIndex, batch] of metricBatches.entries()) {
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      orderedPosts = Array.from(postsByUri.values())
        .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));
      archiveRunControls.delete(runId);
      return buildResult("cancelled");
    }

    const activeAuth = await refreshAuthReference(auth);
    const response = await bskyGet("app.bsky.feed.getPosts", { uris: batch }, {
      headers: {
        authorization: `Bearer ${activeAuth.session.accessJwt}`,
      },
      base: authXrpcBase(activeAuth),
    });
    (response.posts || []).forEach((postView) => {
      const target = postsByUri.get(postView?.uri);
      if (!target) {
        return;
      }
      target.counts = {
        likeCount: Number(postView.likeCount) || 0,
        replyCount: Number(postView.replyCount) || 0,
        repostCount: Number(postView.repostCount) || 0,
        quoteCount: Number(postView.quoteCount) || 0,
      };
      target.authorAvatar = postView.author?.avatar || target.authorAvatar || "";
      target.authorDisplayName = postView.author?.displayName || target.authorDisplayName || "";
      target.authorHandle = postView.author?.handle || target.authorHandle || "";
      target.authorDid = postView.author?.did || target.authorDid || "";
    });
    if ((batchIndex + 1) % 2 === 0 && batch.length > 0) {
      const previewPost = postsByUri.get(batch[0]);
      if (previewPost) {
        notifyProgress({
          preview: {
            meta: `Metriken aktualisiert · Batch ${batchIndex + 1}/${metricBatches.length}`,
            text: String(previewPost.text || "").slice(0, 220),
            metric: `Likes ${previewPost.counts.likeCount} · Replies ${previewPost.counts.replyCount} · Reposts ${previewPost.counts.repostCount} · Quotes ${previewPost.counts.quoteCount}`,
          },
          checkpoint: `Metriken geladen (${batchIndex + 1}/${metricBatches.length})`,
          state: "running",
        });
      }
    }
    notifyProgress({
      title: "Archiv wird gelesen",
      step: `Metriken ${batchIndex + 1}/${metricBatches.length} geladen`,
      percent: 55 + Math.round(((batchIndex + 1) / Math.max(1, metricBatches.length)) * 10),
      detail: buildHashtagProgressDetail("Likes, Replies, Reposts und Quotes werden pro Post über die API ergänzt"),
      checkpoint: `Metriken geladen (${batchIndex + 1}/${metricBatches.length})`,
      state: "running",
    });
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

  await attachArchiveAvatarAssets(orderedPosts, assets, seenAssetPaths, auth, pdsServiceCache, notifyProgress, 61);

  const linkCardPosts = orderedPosts.filter((post) => Boolean(post?.externalCard?.thumbRef));
  if (linkCardPosts.length > 0) {
    notifyProgress({
      title: "Archiv wird gelesen",
      step: "Linkkarten-Vorschaubilder werden ergänzt …",
      percent: 65,
      detail: buildHashtagProgressDetail(`${linkCardPosts.length} Posts mit Karten-Vorschau werden geprüft`),
      checkpoint: "Linkkarten werden vorbereitet",
      state: "running",
    });
  }

  let processedLinkCards = 0;
  await mapWithConcurrency(linkCardPosts, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (post, linkIndex) => {
    const externalCard = post.externalCard;
    if (!externalCard?.thumbRef) {
      return;
    }
    const thumbCid = getBlobCidFromRef(externalCard.thumbRef);
    if (thumbCid) {
      try {
        const blob = await downloadBlobForDid(auth, post.authorDid || ownDid, thumbCid, pdsServiceCache);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const authorSlug = String(post.authorHandle || post.authorDid || "author")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "author";
        const path = `link-cards/${authorSlug}-${post.rkey || `post-${linkIndex + 1}`}.${extension}`;
        post.externalCard.thumbPath = path;
        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
      } catch {
        post.externalCard.thumbPath = "";
      }
    }

    processedLinkCards += 1;
    if (linkCardPosts.length > 0 && (processedLinkCards % 10 === 0 || processedLinkCards === linkCardPosts.length)) {
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Linkkarten ${processedLinkCards}/${linkCardPosts.length} verarbeitet`,
        percent: 65 + Math.round((processedLinkCards / Math.max(1, linkCardPosts.length)) * 4),
        detail: buildHashtagProgressDetail("Vorschaubilder externer Karten werden lokal ergänzt"),
        checkpoint: `Linkkarten verarbeitet (${processedLinkCards}/${linkCardPosts.length})`,
        state: "running",
      });
    }
  });

  const imageTasks = [];
  orderedPosts.forEach((post, postIndex) => {
    const record = rawRecordsByUri.get(post.uri) || {};
    const images = extractArchiveEmbedImages(record);
    post.images = [];
    images.forEach((image, imageIndex) => {
      imageTasks.push({
        post,
        postIndex,
        image,
        imageIndex,
        imageTotal: images.length,
        blobDid: post.authorDid || ownDid,
      });
    });
  });

  let processedImageTasks = 0;
  let cancelledDuringImagePhase = false;
  await mapWithConcurrency(imageTasks, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (task) => {
    if (cancelledDuringImagePhase) {
      return;
    }
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      cancelledDuringImagePhase = true;
      return;
    }

    const { post, postIndex, image, imageIndex, imageTotal, blobDid } = task;
    const cid = getBlobCidFromRef(image);
    if (cid) {
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Bild ${imageIndex + 1}/${imageTotal} für Post ${postIndex + 1}/${orderedPosts.length} wird geladen`,
        percent: 65 + Math.round(((processedImageTasks + 1) / Math.max(1, imageTasks.length)) * 30),
        detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
        checkpoint: `Bild ${imageIndex + 1} von ${imageTotal} für Post ${postIndex + 1} wird geladen`,
        state: "running",
      });

      let blob = null;
      let lastBlobError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          blob = await downloadBlobForDid(auth, blobDid, cid, pdsServiceCache);
          break;
        } catch (error) {
          lastBlobError = error;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }

      if (!blob) {
        skippedImageCount += 1;
        notifyProgress({
          title: "Archiv wird gelesen",
          step: "Ein Bild konnte nicht geladen werden und wird uebersprungen",
          percent: 65 + Math.round(((processedImageTasks + 1) / Math.max(1, imageTasks.length)) * 30),
          detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
          checkpoint: `Ein Bild wurde uebersprungen (${skippedImageCount} insgesamt)`,
          preview: {
            meta: `Bild uebersprungen (${lastBlobError?.message || "unbekannter Fehler"})`,
            text: String(post.text || "").slice(0, 180),
            metric: `Likes ${post.counts.likeCount} · Replies ${post.counts.replyCount} · Reposts ${post.counts.repostCount} · Quotes ${post.counts.quoteCount}`,
          },
          state: "running",
        });
      } else {
        const extension = blob.type.includes("png")
          ? "png"
          : (blob.type.includes("webp") ? "webp" : "jpg");
        const authorSlug = String(post.authorHandle || post.authorDid || "author")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "author";
        const path = `images/${String(post.createdAt || "unknown").slice(0, 4) || "misc"}/${authorSlug}-${post.rkey || `post-${postIndex + 1}`}-${imageIndex + 1}.${extension}`;

        post.images[imageIndex] = {
          path,
          alt: String(image.alt || "").slice(0, 1000),
          width: Number(image.aspectRatio?.width) || 0,
          height: Number(image.aspectRatio?.height) || 0,
          sourceDid: blobDid,
          sourceCid: cid,
          remoteUrl: await buildPublicBlobUrlForDid(auth, blobDid, cid, pdsServiceCache),
          mimeType: blob.type,
          sizeBytes: blob.bytes.length,
        };

        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
          imageCount += 1;
          if (imageCount % 10 === 0) {
            notifyProgress({
              preview: {
                meta: `Bild ${imageCount} heruntergeladen`,
                text: String(post.text || "").slice(0, 180),
                imageDataUrl: bytesToDataUrl(blob.bytes, blob.type),
                metric: `Likes ${post.counts.likeCount} · Replies ${post.counts.replyCount} · Reposts ${post.counts.repostCount} · Quotes ${post.counts.quoteCount}`,
                alt: image.alt || "Archivbild",
              },
              checkpoint: `Bild ${imageCount} gespeichert`,
              state: "running",
            });
          }
        }
      }
    }

    processedImageTasks += 1;
    if (imageTasks.length > 0 && (processedImageTasks % 8 === 0 || processedImageTasks === imageTasks.length)) {
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Bilder ${processedImageTasks}/${imageTasks.length} verarbeitet`,
        percent: 65 + Math.round((processedImageTasks / Math.max(1, imageTasks.length)) * 30),
        detail: `${imageCount} Bilder im Archiv · ${skippedImageCount} Bilder ausgelassen`,
        checkpoint: `${processedImageTasks} von ${imageTasks.length} Bildern verarbeitet`,
        state: "running",
      });
    }
  });

  orderedPosts.forEach((post) => {
    post.images = (post.images || []).filter(Boolean);
  });
  if (cancelledDuringImagePhase) {
    archiveRunControls.delete(runId);
    return buildResult("cancelled");
  }

  archiveRunControls.delete(runId);
  return buildResult(cancelled ? "cancelled" : "completed");
}

async function importArchiveThreadFromUrl({ runId, url, importMode } = {}, notifyProgress = () => {}) {
  const auth = await ensureSession();
  const parsedSource = parseArchiveThreadSource(url);
  const resolveCache = new Map();
  const pdsServiceCache = new Map();
  const normalizedImportMode = importMode === "tree"
    ? "tree"
    : (importMode === "author" ? "author" : "path");
  const actorDid = parsedSource.actor.startsWith("did:")
    ? parsedSource.actor
    : await resolveHandleToDid(parsedSource.actor, auth, resolveCache);

  if (!actorDid) {
    throw new Error("Die Posting-URL konnte keinem Bluesky-Account zugeordnet werden.");
  }

  const entryUri = parsedSource.entryUri || `at://${actorDid}/app.bsky.feed.post/${parsedSource.rkey}`;
  archiveRunControls.set(runId, { state: "running" });

  notifyProgress({
    title: "Thread wird geladen",
    step: "Das verlinkte Posting wird geprueft …",
    percent: 5,
    detail: parsedSource.sourceUrl,
    checkpoint: "Posting-URL wird geprueft",
    state: "running",
  });
  let entryPost = null;
  let entryResponse = null;
  try {
    entryResponse = await bskyGet("app.bsky.feed.getPosts", {
      uris: [entryUri],
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
      base: authXrpcBase(auth),
    });
    entryPost = Array.isArray(entryResponse.posts) ? entryResponse.posts[0] : null;
  } catch {
    entryPost = null;
  }
  if (!entryPost?.uri) {
    notifyProgress({
      title: "Thread wird geladen",
      step: "Post nicht gefunden oder gelöscht",
      percent: 100,
      detail: entryUri,
      checkpoint: "Post nicht gefunden oder gelöscht",
      state: "running",
    });
    archiveRunControls.delete(runId);
    return {
      manifest: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        account: {
          handle: auth.session.handle,
          did: auth.session.did,
        },
        sourceType: "thread-url",
        threadImport: {
          sourceUrl: parsedSource.sourceUrl,
          entryUri,
          rootUri: entryUri,
          entryMode: "missing",
          importMode: normalizedImportMode,
          note: "Post nicht gefunden oder gelöscht",
        },
        postCount: 0,
        imageCount: 0,
        skippedImageCount: 0,
      },
      posts: [],
      assets: [],
      session: {
        waveIndex: 1,
        nextCursor: "",
        hasMore: false,
        exportedPosts: 0,
        exportedImages: 0,
        status: "completed",
      },
    };
  }

  const entryRecord = entryPost.record || {};
  const rootUri = getArchiveRootUri(entryRecord, entryPost.uri) || entryPost.uri;
  const entryMode = rootUri && rootUri !== entryPost.uri ? "reply" : "root";

  notifyProgress({
    title: "Thread wird geladen",
    step: entryMode === "reply"
      ? (normalizedImportMode === "tree"
        ? "Das verlinkte Posting ist eine Antwort. Der komplette Thread-Baum wird ab dem Start geladen …"
        : "Das verlinkte Posting ist eine Antwort. Nur der Threadpfad bis zu diesem Posting wird geladen …")
      : "Das verlinkte Posting ist der Start des Threads. Der ganze Thread wird geladen …",
    percent: 18,
    detail: entryPost.author?.handle || parsedSource.actor,
    checkpoint: entryMode === "reply" ? "Einsprung im Thread erkannt" : "Thread-Start erkannt",
    preview: {
      meta: entryMode === "reply" ? "Einsprung mitten im Thread" : "Thread-Start",
      text: String(entryRecord.text || "").slice(0, 220),
      metric: `Likes ${Number(entryPost.likeCount) || 0} · Replies ${Number(entryPost.replyCount) || 0} · Reposts ${Number(entryPost.repostCount) || 0} · Quotes ${Number(entryPost.quoteCount) || 0}`,
    },
    state: "running",
  });

  if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
    archiveRunControls.delete(runId);
    return {
      manifest: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        account: {
          handle: auth.session.handle,
          did: auth.session.did,
        },
        sourceType: "thread-url",
        threadImport: {
          sourceUrl: parsedSource.sourceUrl,
          entryUri: entryPost.uri,
          rootUri,
          entryMode,
          importMode: normalizedImportMode,
        },
      },
      posts: [],
      assets: [],
      session: {
        waveIndex: 1,
        nextCursor: "",
        hasMore: false,
        exportedPosts: 0,
        exportedImages: 0,
        status: "cancelled",
      },
    };
  }

  const threadResponse = await bskyGet("app.bsky.feed.getPostThread", {
    uri: rootUri,
    depth: 100,
    parentHeight: 0,
  }, {
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
    base: authXrpcBase(auth),
  });

  const threadRoot = threadResponse.thread || threadResponse.post || threadResponse;
  const threadViews = normalizedImportMode === "tree"
    ? collectThreadViewPosts(threadRoot)
    : (normalizedImportMode === "author"
      ? collectThreadAuthorPosts(threadRoot, actorDid, [])
      : (() => {
      const pathPosts = [];
      collectThreadPathPosts(threadRoot, entryPost.uri, pathPosts);
      return pathPosts;
      })());
  const postsByUri = new Map();
  const rawRecordsByUri = new Map();
  const seenAssetPaths = new Set();
  const assets = [];
  let imageCount = 0;
  let skippedImageCount = 0;

  notifyProgress({
    title: "Thread wird geladen",
    step: `${threadViews.length} Posts wurden im Thread gefunden`,
    percent: 38,
    detail: rootUri,
    checkpoint: `${threadViews.length} Thread-Posts gefunden`,
    state: "running",
  });

  threadViews.forEach((postView) => {
    const record = postView?.record || {};
    const post = buildArchivePostEntity({
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
    });
    postsByUri.set(post.uri, post);
    rawRecordsByUri.set(post.uri, record);
  });

  const orderedPosts = Array.from(postsByUri.values())
    .sort((left, right) => Date.parse(right.createdAt || 0) - Date.parse(left.createdAt || 0));

  await attachArchiveAvatarAssets(orderedPosts, assets, seenAssetPaths, auth, pdsServiceCache);

  for (const [postIndex, post] of orderedPosts.entries()) {
    const externalCard = post.externalCard;
    if (!externalCard?.thumbRef) {
      continue;
    }
    const thumbCid = getBlobCidFromRef(externalCard.thumbRef);
    if (!thumbCid) {
      continue;
    }
    try {
      const blob = await downloadBlobForDid(auth, post.authorDid || actorDid, thumbCid, pdsServiceCache);
      const extension = getAssetExtensionFromMimeType(blob.type);
      const authorSlug = String(post.authorHandle || post.authorDid || "author")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 60) || "author";
      const path = `link-cards/${authorSlug}-${post.rkey || `thread-post-${postIndex + 1}`}.${extension}`;
      post.externalCard.thumbPath = path;
      if (!seenAssetPaths.has(path)) {
        seenAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
    } catch {
      post.externalCard.thumbPath = "";
    }
  }

  for (const [postIndex, post] of orderedPosts.entries()) {
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      archiveRunControls.delete(runId);
      return {
        manifest: {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          appVersion: APP_VERSION,
          account: {
            handle: auth.session.handle,
            did: auth.session.did,
          },
          sourceType: "thread-url",
          threadImport: {
            sourceUrl: parsedSource.sourceUrl,
            entryUri: entryPost.uri,
            rootUri,
            entryMode,
            importMode: normalizedImportMode,
            authorHandle: entryPost.author?.handle || "",
            authorDisplayName: entryPost.author?.displayName || entryPost.author?.handle || "",
          },
          postCount: orderedPosts.length,
          imageCount,
          skippedImageCount,
        },
        posts: orderedPosts,
        assets,
        session: {
          waveIndex: 1,
          nextCursor: "",
          hasMore: false,
          exportedPosts: orderedPosts.length,
          exportedImages: imageCount,
          status: "cancelled",
        },
      };
    }

    const record = rawRecordsByUri.get(post.uri) || {};
    const images = extractArchiveEmbedImages(record);
    for (const [imageIndex, image] of images.entries()) {
      const cid = getBlobCidFromRef(image);
      if (!cid) {
        continue;
      }

      notifyProgress({
        title: "Thread wird geladen",
        step: `Bild ${imageIndex + 1}/${images.length} fuer Thread-Post ${postIndex + 1}/${orderedPosts.length} wird geladen`,
        percent: 45 + Math.round(((postIndex + 1) / Math.max(1, orderedPosts.length)) * 50),
        detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
        checkpoint: `Bild ${imageIndex + 1} fuer Thread-Post ${postIndex + 1}`,
        state: "running",
      });

      let blob = null;
      let lastBlobError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          blob = await downloadBlobForDid(auth, post.authorDid || actorDid, cid, pdsServiceCache);
          break;
        } catch (error) {
          lastBlobError = error;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }

      if (!blob) {
        skippedImageCount += 1;
        notifyProgress({
          preview: {
            meta: `Bild uebersprungen (${lastBlobError?.message || "unbekannter Fehler"})`,
            text: String(post.text || "").slice(0, 180),
            metric: `Likes ${post.counts.likeCount} · Replies ${post.counts.replyCount} · Reposts ${post.counts.repostCount} · Quotes ${post.counts.quoteCount}`,
          },
          detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
          checkpoint: `Ein Thread-Bild wurde uebersprungen`,
          state: "running",
        });
        continue;
      }

      const extension = blob.type.includes("png")
        ? "png"
        : (blob.type.includes("webp") ? "webp" : "jpg");
      const authorSlug = String(post.authorHandle || post.authorDid || "author")
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 60) || "author";
      const path = `images/${String(post.createdAt || "unknown").slice(0, 4) || "misc"}/${authorSlug}-${post.rkey || `thread-post-${postIndex + 1}`}-${imageIndex + 1}.${extension}`;

      post.images.push({
        path,
        alt: String(image.alt || "").slice(0, 1000),
        width: Number(image.aspectRatio?.width) || 0,
        height: Number(image.aspectRatio?.height) || 0,
        sourceDid: post.authorDid || actorDid,
        sourceCid: cid,
        remoteUrl: await buildPublicBlobUrlForDid(auth, post.authorDid || actorDid, cid, pdsServiceCache),
        mimeType: blob.type,
        sizeBytes: blob.bytes.length,
      });

      if (!seenAssetPaths.has(path)) {
        seenAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
        imageCount += 1;
        if (imageCount % 5 === 0) {
          notifyProgress({
            preview: {
              meta: `Thread-Bild ${imageCount} heruntergeladen`,
              text: String(post.text || "").slice(0, 180),
              imageDataUrl: bytesToDataUrl(blob.bytes, blob.type),
              metric: `Likes ${post.counts.likeCount} · Replies ${post.counts.replyCount} · Reposts ${post.counts.repostCount} · Quotes ${post.counts.quoteCount}`,
              alt: image.alt || "Archivbild",
            },
            checkpoint: `Thread-Bild ${imageCount} gespeichert`,
            state: "running",
          });
        }
      }
    }
  }

  archiveRunControls.delete(runId);
  return {
    manifest: {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      account: {
        handle: auth.session.handle,
        did: auth.session.did,
      },
      sourceType: "thread-url",
      threadImport: {
        sourceUrl: parsedSource.sourceUrl,
        entryUri: entryPost.uri,
        rootUri,
        entryMode,
        importMode: normalizedImportMode,
        authorHandle: entryPost.author?.handle || "",
        authorDisplayName: entryPost.author?.displayName || entryPost.author?.handle || "",
      },
      postCount: orderedPosts.length,
      imageCount,
      skippedImageCount,
    },
    posts: orderedPosts,
    assets,
    session: {
      waveIndex: 1,
      nextCursor: "",
      hasMore: false,
      exportedPosts: orderedPosts.length,
      exportedImages: imageCount,
      status: "completed",
    },
  };
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

  if (threadGateAllow !== null) {
    await bskyFetch("com.atproto.repo.createRecord", {
      method: "POST",
      headers,
      base,
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
  }

  if (!normalizedSettings.quotePostsAllowed) {
    await bskyFetch("com.atproto.repo.createRecord", {
      method: "POST",
      headers,
      base,
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
  }
}

async function publishThread({ segments, langs, postInteraction }, notifyProgress = () => {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Es gibt keine Segmente zum Posten.");
  }

  const auth = await ensureSession();
  const normalizedLangs = normalizePostLanguageTags(langs);
  const normalizedPostInteraction = normalizePostInteractionSettings(postInteraction);
  const resolveCache = new Map();
  const posts = [];
  let root = null;
  let parent = null;

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
      const facets = await buildRichTextFacets(record.text, auth, resolveCache);
      if (facets) {
        record.facets = facets;
      }

      const images = Array.isArray(segment?.images) ? segment.images.slice(0, MAX_IMAGES_PER_SEGMENT) : [];
      if (images.length > 0) {
        const embeddedImages = [];
        for (const [imageIndex, image] of images.entries()) {
          notifyProgress({ message: `Bild ${imageIndex + 1}/${images.length} für Abschnitt ${segmentIndex + 1} wird hochgeladen …` });
          const blobRef = await uploadBlob(auth, image.blob);
          embeddedImages.push({
            alt: String(image.alt || "").slice(0, 1000),
            image: blobRef,
            aspectRatio: image.width && image.height ? { width: image.width, height: image.height } : undefined,
          });
        }

        record.embed = {
          $type: "app.bsky.embed.images",
          images: embeddedImages,
        };
      }

      if (root && parent) {
        record.reply = {
          root,
          parent,
        };
      }

      const created = await bskyFetch("com.atproto.repo.createRecord", {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
        base: xrpcBaseForService(auth.pdsUrl || auth.service),
        body: JSON.stringify({
          repo: auth.session.did,
          collection: "app.bsky.feed.post",
          record,
        }),
      });

      const ref = {
        uri: created.uri,
        cid: created.cid,
      };

      notifyProgress({ message: `Interaktionseinstellungen fuer Abschnitt ${segmentIndex + 1}/${segments.length} werden gesetzt …` });
      await applyPostInteractionGates(auth, ref, normalizedPostInteraction);

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
      };
      throw partialError;
    }

    throw error;
  }

  return {
    posts,
    handle: auth.session.handle,
    service: auth.service || DEFAULT_LOGIN_SERVICE,
  };
}
