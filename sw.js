const APP_VERSION = "v50";
const CACHE_NAME = `threadline-${APP_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./translations.js",
  "./manifest.webmanifest",
  "./version.json",
  "./README.md",
  "./README.de.md",
  "./og-image.jpg",
  "./icons/icon.svg",
  "./icons/maskable-icon.svg",
  "./icons/kofi-button.svg",
];

const DB_NAME = "threadline-db";
const STORE_NAME = "settings";
const AUTH_KEY = "auth";
const DRAFT_KEY = "draft";
const LOCALE_KEY = "locale";
const SETTINGS_KEY = "ui-settings";
const ARCHIVE_SESSION_KEY = "archive-session";
const ARCHIVE_CATALOG_KEY = "archive-catalog";
const API_BASE = "https://bsky.social/xrpc";
const archiveRunControls = new Map();

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

function normalizeThreadImage(entry = {}) {
  if (!entry?.dataUrl) {
    return null;
  }

  return {
    id: entry.id || crypto.randomUUID(),
    name: entry.name || "image",
    type: entry.type || "image/jpeg",
    dataUrl: entry.dataUrl,
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
      .slice(0, 4),
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

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./version.json"))),
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
    case "SAVE_ARCHIVE_SESSION":
      return saveArchiveSession(message.payload);
    case "SAVE_ARCHIVE_CATALOG":
      return saveArchiveCatalog(message.payload);
    case "CLEAR_ARCHIVE_SESSION":
      return clearArchiveSession();
    case "CLEAR_ARCHIVE_CATALOG":
      return clearArchiveCatalog();
    case "SET_ARCHIVE_RUN_CONTROL":
      return setArchiveRunControl(message.payload);
    case "LOGOUT":
      return logout();
    case "PUBLISH_THREAD":
      return publishThread(message.payload, (progress) => port.postMessage({ progress }));
    case "EXPORT_ACCOUNT_ARCHIVE_WAVE":
      return exportAccountArchiveWave(message.payload, (progress) => port.postMessage({ progress }));
    default:
      throw new Error("Unbekannter Service-Worker-Befehl.");
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB konnte nicht geoeffnet werden."));
  });
}

async function readStoredAuth() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(AUTH_KEY);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Gespeicherte Daten konnten nicht gelesen werden."));
  });
}

async function writeStoredAuth(value) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, AUTH_KEY);

    request.onsuccess = () => resolve(value);
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
  const response = await fetch(`${API_BASE}/${endpoint}`, {
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
    throw new Error(data.message || data.error || `Bluesky-Fehler: ${response.status}`);
  }

  return data;
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
  });
}

async function uploadBlob(auth, file) {
  const response = await fetch(`${API_BASE}/com.atproto.repo.uploadBlob`, {
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
  const response = await fetch(`${API_BASE}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${auth.session.accessJwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Blob konnte nicht geladen werden (${response.status}).`);
  }

  return {
    type: response.headers.get("content-type") || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

async function login({ identifier, appPassword }) {
  if (!identifier || !appPassword) {
    throw new Error("Handle und App-Passwort sind erforderlich.");
  }

  const session = await bskyFetch("com.atproto.server.createSession", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      password: appPassword,
    }),
  });

  const auth = {
    identifier,
    appPassword,
    session,
    updatedAt: new Date().toISOString(),
  };

  await writeStoredAuth(auth);

  return {
    authenticated: true,
    identifier,
    handle: session.handle,
    did: session.did,
  };
}

async function authStatus() {
  const auth = await readStoredAuth();

  if (!auth?.session?.did) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    identifier: auth.identifier,
    handle: auth.session.handle,
    did: auth.session.did,
  };
}

async function getAppState({ browserLocale } = {}) {
  const auth = await readStoredAuth();
  const draft = await readStoredValue(DRAFT_KEY);
  const storedSettings = await readStoredValue(SETTINGS_KEY);
  const legacyLocalePreference = await readStoredValue(LOCALE_KEY);
  const hashtags = normalizeHashtagEntries(storedSettings?.hashtags);
  const selectedHashtags = normalizeSelectedHashtagEntries(storedSettings?.selectedHashtags, hashtags);
  const localePreference = storedSettings?.localePreference || legacyLocalePreference;
  const locale = localePreference && localePreference !== "auto" ? localePreference : (browserLocale || "en");

  return {
    authenticated: Boolean(auth?.session?.did),
    identifier: auth?.identifier || "",
    handle: auth?.session?.handle || "",
    draft: typeof draft === "string" ? draft : (draft?.sourceText || ""),
    locale,
    localePreference: localePreference || "auto",
    tipsVisible: storedSettings?.tipsVisible !== false,
    altTextRequired: storedSettings?.altTextRequired !== false,
    themeMode: storedSettings?.themeMode === "dark" ? "dark" : "light",
    appendThreadEmoji: storedSettings?.appendThreadEmoji === true,
    hashtags,
    selectedHashtags,
    hashtagPlacement: storedSettings?.hashtagPlacement === "last" ? "last" : "first",
    segmentImages: normalizeSegmentImages(storedSettings?.segmentImages || draft?.segmentImages),
    segmentOverrides: normalizeSegmentOverrides(draft?.segmentOverrides),
    postingHistory: normalizePostingHistory(storedSettings?.postingHistory),
    archivePreferences: storedSettings?.archivePreferences && typeof storedSettings.archivePreferences === "object"
      ? storedSettings.archivePreferences
      : null,
  };
}

async function saveDraft({ draft, segmentImages, segmentOverrides } = {}) {
  await writeStoredValue(DRAFT_KEY, {
    sourceText: draft || "",
    segmentImages: normalizeSegmentImages(segmentImages),
    segmentOverrides: normalizeSegmentOverrides(segmentOverrides),
  });
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
  const nextSettings = {
    ...existing,
    ...settings,
    localePreference: settings.localePreference || existing.localePreference || "auto",
    tipsVisible: settings.tipsVisible !== undefined ? settings.tipsVisible : (existing.tipsVisible !== false),
    altTextRequired: settings.altTextRequired !== false,
    themeMode: settings.themeMode === "dark"
      ? "dark"
      : (settings.themeMode === "light" ? "light" : (existing.themeMode === "dark" ? "dark" : "light")),
    appendThreadEmoji: settings.appendThreadEmoji === true,
    hashtags,
    selectedHashtags,
    hashtagPlacement: settings.hashtagPlacement === "last" ? "last" : (existing.hashtagPlacement === "last" ? "last" : "first"),
    segmentImages: Array.isArray(settings.segmentImages)
      ? normalizeSegmentImages(settings.segmentImages)
      : normalizeSegmentImages(existing.segmentImages),
    postingHistory: Array.isArray(settings.postingHistory)
      ? normalizePostingHistory(settings.postingHistory)
      : normalizePostingHistory(existing.postingHistory),
    archivePreferences: settings.archivePreferences && typeof settings.archivePreferences === "object"
      ? settings.archivePreferences
      : (existing.archivePreferences && typeof existing.archivePreferences === "object" ? existing.archivePreferences : null),
  };
  await writeStoredValue(SETTINGS_KEY, nextSettings);
  await writeStoredValue(LOCALE_KEY, nextSettings.localePreference);
  return { ok: true };
}

async function getArchiveSession() {
  return await readStoredValue(ARCHIVE_SESSION_KEY) || null;
}

async function getArchiveCatalog() {
  return await readStoredValue(ARCHIVE_CATALOG_KEY) || null;
}

async function saveArchiveSession({ session } = {}) {
  await writeStoredValue(ARCHIVE_SESSION_KEY, session || null);
  return { ok: true };
}

async function saveArchiveCatalog({ catalog } = {}) {
  await writeStoredValue(ARCHIVE_CATALOG_KEY, catalog || null);
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

async function logout() {
  await clearStoredAuth();
  await clearArchiveSession();
  await clearArchiveCatalog();
  return { authenticated: false };
}

async function verifySession() {
  try {
    const auth = await ensureSession();
    return {
      authenticated: true,
      identifier: auth.identifier,
      handle: auth.session?.handle || auth.identifier,
      did: auth.session?.did || "",
    };
  } catch {
    await clearStoredAuth().catch(() => {});
    return {
      authenticated: false,
    };
  }
}

async function ensureSession() {
  const auth = await readStoredAuth();

  if (!auth?.session?.did) {
    throw new Error("Keine gespeicherte Bluesky-Session gefunden.");
  }

  if (isJwtValid(auth.session.accessJwt)) {
    return auth;
  }

  if (auth.session.refreshJwt) {
    try {
      const refreshedSession = await bskyFetch("com.atproto.server.refreshSession", {
        method: "POST",
        headers: {
          authorization: `Bearer ${auth.session.refreshJwt}`,
        },
      });

      const updatedAuth = {
        ...auth,
        session: refreshedSession,
        updatedAt: new Date().toISOString(),
      };

      await writeStoredAuth(updatedAuth);
      return updatedAuth;
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
  }).then(async () => {
    const refreshedAuth = await readStoredAuth();
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
    const response = await fetch(`${API_BASE}/com.atproto.server.describeServer`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bluesky-Fehler: ${response.status}`);
    }

    return { ok: true };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Der Verbindungscheck zu Bluesky hat zu lange gedauert.");
    }

    throw new Error("Keine Verbindung zu Bluesky möglich.");
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

function normalizeArchiveFilters(filters = {}) {
  return {
    scope: filters.scope === "year" || filters.scope === "range" ? filters.scope : "all",
    contentMode: filters.contentMode === "full" || filters.contentMode === "threads" ? filters.contentMode : "posts",
    year: String(filters.year || "").trim(),
    from: String(filters.from || "").trim(),
    to: String(filters.to || "").trim(),
  };
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

function postMatchesArchiveSelection(record, filters, ownDid, fallbackUri = "") {
  if (!postMatchesArchiveFilters(record, filters)) {
    return false;
  }

  if (filters.contentMode === "full") {
    return true;
  }

  if (!record?.reply) {
    return true;
  }

  return recordBelongsToOwnThread(record, ownDid, fallbackUri);
}

function extractArchiveEmbedImages(record = {}) {
  return Array.isArray(record?.embed?.images) ? record.embed.images.slice(0, 4) : [];
}

function buildArchivePostEntity({ uri, cid, record = {}, authorHandle = "", authorDid = "", authorDisplayName = "", counts = null }) {
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
      ? `https://bsky.app/profile/${authorHandle || authorDid || "unknown"}/post/${parsed.rkey}`
      : "",
    authorHandle,
    authorDisplayName,
    authorDid,
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
    detail: `Konto: ${auth.session.handle}`,
    checkpoint: `Welle ${waveIndex} · Start`,
    state: "running",
  });

  while (true) {
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      cancelled = true;
      break;
    }

    const remaining = Math.max(1, Math.min(100, waveLimit - records.length));
    const page = await bskyGet("com.atproto.repo.listRecords", {
      repo: auth.session.did,
      collection: "app.bsky.feed.post",
      limit: remaining,
      cursor,
    }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
    });

    const pageRecords = (page.records || [])
      .map((entry) => ({
        uri: entry.uri,
        cid: entry.cid,
        value: entry.value || {},
      }))
      .filter((entry) => postMatchesArchiveSelection(entry.value, normalizedFilters, ownDid, entry.uri));

    records.push(...pageRecords);
    cursor = page.cursor || "";
    pageCount += 1;
    notifyProgress({
      title: "Archiv wird gelesen",
      step: `Abruf ${pageCount} abgeschlossen · ${records.length} Posts im gewählten Umfang gefunden`,
      percent: Math.min(45, 5 + (pageCount * 3)),
      detail: `${records.length} Posts für Welle ${waveIndex} vorgemerkt`,
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
      }),
      entry.value,
    );
  });

  if (normalizedFilters.contentMode === "threads" && records.length > 0) {
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
        detail: "Antworten in eigenen Threads werden nachgeladen",
        checkpoint: `Eigene Threads werden erweitert (${threadIndex + 1}/${threadRootUris.length})`,
        state: "running",
      });

      const threadResponse = await bskyGet("app.bsky.feed.getPostThread", {
        uri: rootUri,
        depth: 100,
        parentHeight: 0,
      }, {
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
      });

      collectThreadViewPosts(threadResponse.thread || threadResponse.post || threadResponse).forEach((postView) => {
        const record = postView?.record || {};
        const rootCandidate = getArchiveRootUri(record, postView.uri) || postView.uri;
        if (parseAtUri(rootCandidate).did !== ownDid) {
          return;
        }
        if (!postMatchesArchiveFilters(record, normalizedFilters)) {
          return;
        }
        upsertArchivePost(
          buildArchivePostEntity({
            uri: postView.uri,
            cid: postView.cid,
            record,
            authorHandle: postView.author?.handle || "",
            authorDisplayName: postView.author?.displayName || postView.author?.handle || "",
            authorDid: postView.author?.did || "",
            counts: {
              likeCount: Number(postView.likeCount) || 0,
              replyCount: Number(postView.replyCount) || 0,
              repostCount: Number(postView.repostCount) || 0,
              quoteCount: Number(postView.quoteCount) || 0,
            },
          }),
          record,
        );
      });
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

    const response = await bskyGet("app.bsky.feed.getPosts", { uris: batch }, {
      headers: {
        authorization: `Bearer ${auth.session.accessJwt}`,
      },
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
      detail: "Likes, Replies, Reposts und Quotes werden ergänzt",
      checkpoint: `Metriken geladen (${batchIndex + 1}/${metricBatches.length})`,
      state: "running",
    });
  }

  for (const [postIndex, post] of orderedPosts.entries()) {
    if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
      archiveRunControls.delete(runId);
      return buildResult("cancelled");
    }

    const record = rawRecordsByUri.get(post.uri) || {};
    const images = extractArchiveEmbedImages(record);
    const blobDid = post.authorDid || ownDid;

    for (const [imageIndex, image] of images.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        archiveRunControls.delete(runId);
        return buildResult("cancelled");
      }

      const cid = getBlobCidFromRef(image);
      if (!cid) {
        continue;
      }
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Bild ${imageIndex + 1}/${images.length} für Post ${postIndex + 1}/${orderedPosts.length} wird geladen`,
        percent: 65 + Math.round(((postIndex + 1) / orderedPosts.length) * 30),
        detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
        checkpoint: `Bild ${imageIndex + 1} von ${images.length} für Post ${postIndex + 1} wird geladen`,
        state: "running",
      });
      let blob = null;
      let lastBlobError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          blob = await downloadBlob(auth, blobDid, cid);
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
          percent: 65 + Math.round(((postIndex + 1) / orderedPosts.length) * 30),
          detail: `${imageCount} Bilder gespeichert · ${skippedImageCount} Bilder ausgelassen`,
          checkpoint: `Ein Bild wurde uebersprungen (${skippedImageCount} insgesamt)`,
          preview: {
            meta: `Bild uebersprungen (${lastBlobError?.message || "unbekannter Fehler"})`,
            text: String(post.text || "").slice(0, 180),
            metric: `Likes ${post.counts.likeCount} · Replies ${post.counts.replyCount} · Reposts ${post.counts.repostCount} · Quotes ${post.counts.quoteCount}`,
          },
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
      const path = `images/${String(post.createdAt || "unknown").slice(0, 4) || "misc"}/${authorSlug}-${post.rkey || `post-${postIndex + 1}`}-${imageIndex + 1}.${extension}`;

      post.images.push({
        path,
        alt: String(image.alt || "").slice(0, 1000),
        width: Number(image.aspectRatio?.width) || 0,
        height: Number(image.aspectRatio?.height) || 0,
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

    if (orderedPosts.length > 0) {
      notifyProgress({
        title: "Archiv wird gelesen",
        step: `Bilder ${postIndex + 1}/${orderedPosts.length} verarbeitet`,
        percent: 65 + Math.round(((postIndex + 1) / orderedPosts.length) * 30),
        detail: `${imageCount} Bilder im Archiv · ${skippedImageCount} Bilder ausgelassen`,
        checkpoint: `${postIndex + 1} von ${orderedPosts.length} Posts bildseitig verarbeitet`,
        state: "running",
      });
    }
  }

  archiveRunControls.delete(runId);
  return buildResult(cancelled ? "cancelled" : "completed");
}

async function publishThread({ segments }, notifyProgress = () => {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Es gibt keine Segmente zum Posten.");
  }

  const auth = await ensureSession();
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
      const facets = await buildRichTextFacets(record.text, auth, resolveCache);
      if (facets) {
        record.facets = facets;
      }

      const images = Array.isArray(segment?.images) ? segment.images.slice(0, 4) : [];
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
  };
}
