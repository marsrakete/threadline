const APP_VERSION = "v11";
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
const API_BASE = "https://bsky.social/xrpc";

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

  handleMessage(event.data)
    .then((result) => port.postMessage({ ok: true, result }))
    .catch((error) => {
      console.error(error);
      port.postMessage({ ok: false, error: error.message || "Unbekannter Fehler." });
    });
});

async function handleMessage(message) {
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
      return publishThread(message.payload);
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
  const localePreference = await readStoredValue(LOCALE_KEY);
  const locale = localePreference && localePreference !== "auto" ? localePreference : (browserLocale || "en");

  return {
    authenticated: Boolean(auth?.session?.did),
    identifier: auth?.identifier || "",
    handle: auth?.session?.handle || "",
    draft: draft || "",
    locale,
    localePreference: localePreference || "auto",
  };
}

async function saveDraft({ draft } = {}) {
  await writeStoredValue(DRAFT_KEY, draft || "");
  return { ok: true };
}

async function saveSettings({ localePreference } = {}) {
  await writeStoredValue(LOCALE_KEY, localePreference || "auto");
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

async function publishThread({ segments }) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Es gibt keine Segmente zum Posten.");
  }

  const auth = await ensureSession();
  const posts = [];
  let root = null;
  let parent = null;

  for (const segment of segments) {
    const record = {
      $type: "app.bsky.feed.post",
      text: segment,
      createdAt: new Date().toISOString(),
    };

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
