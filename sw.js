const APP_VERSION = "v29";
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
  "./icons/icon.svg",
  "./icons/maskable-icon.svg",
];

const DB_NAME = "threadline-db";
const STORE_NAME = "settings";
const AUTH_KEY = "auth";
const DRAFT_KEY = "draft";
const LOCALE_KEY = "locale";
const SETTINGS_KEY = "ui-settings";
const API_BASE = "https://bsky.social/xrpc";

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
      port.postMessage({ ok: false, error: error.message || "Unbekannter Fehler." });
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
    case "SAVE_DRAFT":
      return saveDraft(message.payload);
    case "SAVE_SETTINGS":
      return saveSettings(message.payload);
    case "LOGOUT":
      return logout();
    case "PUBLISH_THREAD":
      return publishThread(message.payload, (progress) => port.postMessage({ progress }));
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
    hashtags,
    selectedHashtags,
    hashtagPlacement: storedSettings?.hashtagPlacement === "last" ? "last" : "first",
    segmentImages: normalizeSegmentImages(storedSettings?.segmentImages || draft?.segmentImages),
    segmentOverrides: normalizeSegmentOverrides(draft?.segmentOverrides),
    postingHistory: normalizePostingHistory(storedSettings?.postingHistory),
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
    hashtags,
    selectedHashtags,
    hashtagPlacement: settings.hashtagPlacement === "last" ? "last" : (existing.hashtagPlacement === "last" ? "last" : "first"),
    segmentImages: Array.isArray(settings.segmentImages)
      ? normalizeSegmentImages(settings.segmentImages)
      : normalizeSegmentImages(existing.segmentImages),
    postingHistory: Array.isArray(settings.postingHistory)
      ? normalizePostingHistory(settings.postingHistory)
      : normalizePostingHistory(existing.postingHistory),
  };
  await writeStoredValue(SETTINGS_KEY, nextSettings);
  await writeStoredValue(LOCALE_KEY, nextSettings.localePreference);
  return { ok: true };
}

async function logout() {
  await clearStoredAuth();
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

  return {
    posts,
    handle: auth.session.handle,
  };
}
