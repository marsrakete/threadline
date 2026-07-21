/**
 * Resolves a Bluesky handle to a DID through the AT Protocol identity endpoint.
 * @param {string} handle - Normalized handle without leading at sign.
 * @param {object|null} auth - Optional authenticated account for bearer auth.
 * @param {Map<string, string|null>} cache - Per-request DID cache.
 * @returns {Promise<string|null>} Resolved DID or null when the handle is unknown.
 */
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

/**
 * Builds the XRPC base URL for a service or PDS.
 * @param {string} service - Service or PDS base URL.
 * @returns {string} Normalized XRPC base URL.
 */
function xrpcBaseForService(service) {
  assertSecureServiceUrl(service);
  return `${normalizeServiceUrl(service)}/xrpc`;
}

/**
 * Builds a public blob URL for a DID/CID pair on its originating PDS.
 * @param {object} auth - Authenticated account metadata.
 * @param {string} did - DID that owns the blob.
 * @param {string} cid - CID of the blob.
 * @param {Map<string, string>|null} serviceCache - Optional DID-to-PDS cache.
 * @returns {Promise<string>} Public blob URL.
 */
async function buildPublicBlobUrlForDid(auth, did, cid, serviceCache = null) {
  const serviceUrl = await resolvePdsForDid(did, auth.pdsUrl || auth.service, serviceCache);
  return `${xrpcBaseForService(serviceUrl)}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/**
 * Chooses the matching web frontend for a Bluesky-compatible service.
 * @param {string} serviceUrl - Login service or PDS URL.
 * @returns {string} Matching public web app base.
 */
function resolvePostWebBase(serviceUrl = DEFAULT_LOGIN_SERVICE) {
  try {
    const host = new URL(normalizeServiceUrl(serviceUrl)).hostname.toLowerCase();
    return POST_WEB_FRONTENDS[host] || DEFAULT_POST_WEB_APP;
  } catch {
    return DEFAULT_POST_WEB_APP;
  }
}

/**
 * Builds a public post URL for a handle and record key.
 * @param {string} handle - Post author handle.
 * @param {string} recordKey - Record key of the post.
 * @param {string} serviceUrl - Login service or PDS URL.
 * @returns {string} Public post URL or an empty string.
 */
function buildPostWebUrl(handle, recordKey, serviceUrl = DEFAULT_LOGIN_SERVICE) {
  if (!handle || !recordKey) {
    return "";
  }

  return `${resolvePostWebBase(serviceUrl)}/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordKey)}`;
}

/**
 * Infers the matching public web app for an account entry.
 * @param {object} entry - Stored account entry.
 * @param {string} service - Normalized service URL.
 * @param {string} handle - Account handle.
 * @returns {string} Normalized public web app URL.
 */
function inferAccountWebApp(entry = {}, service = DEFAULT_LOGIN_SERVICE, handle = "") {
  if (entry.webApp) {
    return normalizeServiceUrl(entry.webApp);
  }

  const normalizedHandle = String(handle || entry.handle || entry.identifier || "").toLowerCase();
  if (normalizedHandle.endsWith(".eurosky.social") || normalizedHandle.endsWith(".mu.social")) {
    return MU_WEB_CLIENT;
  }

  return resolvePostWebBase(service);
}

/**
 * Executes an AT Protocol XRPC request and parses JSON plus rate-limit metadata.
 * @param {string} endpoint - Endpoint path relative to the XRPC base.
 * @param {object} options - Fetch options plus optional `base` and `returnMeta`.
 * @returns {Promise<object>} Parsed JSON payload or payload plus metadata.
 */
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
    const rateLimit = extractRateLimitMeta(response);
    const retryAfterRaw = response.headers.get("retry-after") || "";
    let retryAfterMs = 0;
    if (/^\d+$/.test(retryAfterRaw.trim())) {
      retryAfterMs = Math.max(0, Number.parseInt(retryAfterRaw.trim(), 10) * 1000);
    } else if (retryAfterRaw.trim()) {
      const retryAt = Date.parse(retryAfterRaw.trim());
      if (Number.isFinite(retryAt)) {
        retryAfterMs = Math.max(0, retryAt - Date.now());
      }
    }
    const code = response.status === 401
      ? "AUTH_INVALID_CREDENTIALS"
      : "BSKY_REQUEST_FAILED";
    throw createServiceWorkerError(
      data.message || data.error || `Bluesky request failed (${response.status}).`,
      code,
      { status: response.status, retryAfterMs, rateLimit },
    );
  }

  if (options.returnMeta) {
    return {
      data,
      meta: {
        rateLimit: extractRateLimitMeta(response),
      },
    };
  }

  return data;
}

/**
 * Refreshes a mutable auth reference in place by reloading its stored session.
 * @param {object|null} auth - Mutable auth object used by a long-running workflow.
 * @returns {Promise<object|null>} Refreshed auth reference.
 */
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

/**
 * Loads a DID document from `did:plc` or `did:web`.
 * @param {string} did - DID to resolve.
 * @param {number} timeoutMs - Request timeout in milliseconds.
 * @returns {Promise<object>} DID document JSON.
 */
async function fetchDidDocument(did, timeoutMs = 8000) {
  if (!did) {
    throw new Error("DID fehlt.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 8000));

  try {
    if (did.startsWith("did:plc:")) {
      const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`DID-Dokument konnte nicht geladen werden (${response.status}).`);
      }
      return response.json();
    }

    if (did.startsWith("did:web:")) {
      const host = did.slice("did:web:".length).replace(/:/g, "/");
      const response = await fetch(`https://${host}/.well-known/did.json`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`DID-Dokument konnte nicht geladen werden (${response.status}).`);
      }
      return response.json();
    }

    throw new Error(`Nicht unterstuetztes DID-Format: ${did}`);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("DID-Dokument timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts the PDS service endpoint from a DID document.
 * @param {object} documentNode - DID document payload.
 * @param {string} fallbackService - Fallback service URL.
 * @returns {string} Normalized PDS service URL.
 */
function extractPdsServiceFromDidDocument(documentNode, fallbackService) {
  const services = Array.isArray(documentNode?.service) ? documentNode.service : [];
  const pds = services.find((entry) =>
    entry?.type === "AtprotoPersonalDataServer"
    || String(entry?.id || "").endsWith("#atproto_pds"));

  return normalizeServiceUrl(pds?.serviceEndpoint || fallbackService || DEFAULT_LOGIN_SERVICE);
}

/**
 * Loads the current avatar URL for an actor profile.
 * @param {string} did - Actor DID.
 * @param {object|null} auth - Optional auth context.
 * @returns {Promise<string>} Avatar URL or an empty string.
 */
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

/**
 * Executes a GET XRPC request with query parameters.
 * @param {string} endpoint - Endpoint path relative to the XRPC base.
 * @param {object} query - Query parameter map.
 * @param {object} options - Optional request headers, base URL, and abort signal.
 * @returns {Promise<object>} Parsed JSON payload.
 */
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

/**
 * Resolves the authenticated XRPC base for a stored account.
 * @param {object|null} auth - Stored account entry.
 * @returns {string} XRPC base URL.
 */
function authXrpcBase(auth = null) {
  return xrpcBaseForService(auth?.pdsUrl || auth?.service || DEFAULT_LOGIN_SERVICE);
}

/**
 * Builds headers for proxied chat.bsky requests.
 * @param {object} auth - Authenticated account entry.
 * @param {object} headers - Additional request headers.
 * @returns {object} Headers with bearer token and chat proxy marker.
 */
function buildChatProxyHeaders(auth, headers = {}) {
  return {
    authorization: `Bearer ${auth.session.accessJwt}`,
    "atproto-proxy": CHAT_PROXY_DID,
    ...headers,
  };
}

/**
 * Executes a chat.bsky GET request through the AT Protocol proxy header.
 * @param {object} auth - Authenticated account entry.
 * @param {string} endpoint - Chat endpoint path.
 * @param {object} query - Query parameter map.
 * @returns {Promise<object>} Parsed JSON payload.
 */
async function chatBskyGet(auth, endpoint, query = {}) {
  return bskyGet(endpoint, query, {
    base: authXrpcBase(auth),
    headers: buildChatProxyHeaders(auth),
  });
}

/**
 * Uploads one blob to the authenticated repo.
 * @param {object} auth - Authenticated account entry.
 * @param {Blob|File|Uint8Array} file - Blob payload to upload.
 * @returns {Promise<object>} Blob reference returned by the repo.
 */
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

/**
 * Downloads a blob from the currently authenticated PDS.
 * @param {object} auth - Authenticated account entry.
 * @param {string} did - Blob owner DID.
 * @param {string} cid - Blob CID.
 * @returns {Promise<{type: string, bytes: Uint8Array}>} Downloaded blob payload.
 */
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

/**
 * Resolves the PDS endpoint for a DID with optional memoization.
 * @param {string} did - DID to resolve.
 * @param {string} fallbackService - Fallback service or PDS URL.
 * @param {Map<string, string>|null} cache - Optional DID-to-PDS cache.
 * @returns {Promise<string>} Normalized PDS service URL.
 */
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

/**
 * Builds a cache key for archive blob downloads.
 * @param {string} did - Blob owner DID.
 * @param {string} cid - Blob CID.
 * @returns {string} Stable cache key.
 */
function buildArchiveBlobCacheKey(did = "", cid = "") {
  return `${String(did || "").trim()}::${String(cid || "").trim()}`;
}

/**
 * Downloads a blob from the PDS that owns the DID instead of the currently logged-in PDS.
 * @param {object} auth - Authenticated account entry.
 * @param {string} did - Blob owner DID.
 * @param {string} cid - Blob CID.
 * @param {Map<string, string>|null} serviceCache - Optional DID-to-PDS cache.
 * @param {object} options - Optional timeout and promise cache settings.
 * @returns {Promise<{type: string, bytes: Uint8Array}>} Downloaded blob payload.
 */
async function downloadBlobForDid(auth, did, cid, serviceCache = null, options = {}) {
  const cacheMap = options?.cacheMap instanceof Map ? options.cacheMap : null;
  const cacheKey = cacheMap ? buildArchiveBlobCacheKey(did, cid) : "";
  if (cacheMap?.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  const loadPromise = (async () => {
    const serviceUrl = await resolvePdsForDid(did, auth.pdsUrl || auth.service, serviceCache);
    const timeoutMs = Math.max(0, Number(options?.timeoutMs) || 0);
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    let response;
    try {
      response = await fetch(`${xrpcBaseForService(serviceUrl)}/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`, {
        method: "GET",
        signal: controller?.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Blob-Download timed out.");
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    if (!response.ok) {
      throw await buildBlobDownloadError(response);
    }

    return {
      type: response.headers.get("content-type") || "application/octet-stream",
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  })();

  if (cacheMap) {
    cacheMap.set(cacheKey, loadPromise);
  }

  try {
    return await loadPromise;
  } catch (error) {
    if (cacheMap) {
      cacheMap.delete(cacheKey);
    }
    throw error;
  }
}

/**
 * Turns a blob HTTP response into a user-facing error.
 * @param {Response} response - Failed blob response.
 * @returns {Promise<Error>} Normalized blob error.
 */
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
    return new Error("Blob-Zugriff verweigert. Der Host erlaubt den Abruf nicht oder der Account ist eingeschraenkt/blockiert.");
  }
  if (status === 404 || remoteError === "RepoNotFound") {
    return new Error("Blob oder Repo nicht gefunden. Das Bild ist auf dem Ursprungshost moeglicherweise nicht mehr verfuegbar.");
  }
  if (status === 400) {
    return new Error("Blob konnte vom Ursprungshost nicht bereitgestellt werden.");
  }

  return new Error(remoteMessage || `Blob konnte nicht geladen werden (${status}).`);
}

/**
 * Signs in with app password, resolves the target PDS, and persists the session.
 * @param {object} options - Login options with identifier, app password, service, and web app.
 * @returns {Promise<object>} Public auth response for the UI.
 */
async function login({ identifier, appPassword, service, webApp } = {}) {
  if (!identifier || !appPassword) {
    throw createServiceWorkerError(
      "Identifier and app password are required.",
      "LOGIN_MISSING_CREDENTIALS",
    );
  }

  const requestedService = normalizeServiceUrl(service || DEFAULT_LOGIN_SERVICE);
  const requestedWebApp = normalizeServiceUrl(
    requestedService === MU_WEB_CLIENT ? MU_WEB_CLIENT : webApp || resolvePostWebBase(requestedService),
  );
  let normalizedService = requestedService;
  if (requestedService === MU_WEB_CLIENT) {
    const normalizedIdentifier = String(identifier || "").trim().replace(/^@/, "");
    if (normalizedIdentifier.includes("@") && !normalizedIdentifier.startsWith("did:")) {
      throw createServiceWorkerError(
        "Mu.social is a web client, not a login server. Use your handle or select the account's PDS.",
        "LOGIN_MU_PDS_RESOLUTION_FAILED",
      );
    }

    const did = normalizedIdentifier.startsWith("did:")
      ? normalizedIdentifier
      : await resolveHandleToDid(normalizedIdentifier, null, new Map());
    if (!did) {
      throw createServiceWorkerError(
        "The account server for this Mu.social handle could not be resolved.",
        "LOGIN_MU_PDS_RESOLUTION_FAILED",
      );
    }

    const didDocument = await fetchDidDocument(did).catch(() => null);
    const pdsEntry = Array.isArray(didDocument?.service)
      ? didDocument.service.find((entry) =>
          entry?.type === "AtprotoPersonalDataServer"
          || String(entry?.id || "").endsWith("#atproto_pds"))
      : null;
    if (!pdsEntry?.serviceEndpoint) {
      throw createServiceWorkerError(
        "The account server for this Mu.social handle could not be resolved.",
        "LOGIN_MU_PDS_RESOLUTION_FAILED",
      );
    }
    normalizedService = normalizeServiceUrl(pdsEntry.serviceEndpoint);
  }
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
        webApp: requestedWebApp,
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
    webApp: requestedWebApp,
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

/**
 * Ensures a valid access token for the selected or active account.
 * @param {string|null} targetDid - Optional DID of the account to refresh.
 * @returns {Promise<object>} Fresh stored auth entry.
 */
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
        service: auth.service,
        pdsUrl: auth.pdsUrl,
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
    webApp: auth.webApp,
  }).then(async () => {
    const refreshedState = await readStoredAuth();
    const refreshedAuth = refreshedState.accounts.find((entry) => entry.did === auth.did);
    if (!refreshedAuth) {
      throw new Error("Session konnte nicht erneuert werden.");
    }
    return refreshedAuth;
  });
}

/**
 * Checks whether the current service/PDS is reachable.
 * @returns {Promise<{ok: boolean}>} Connectivity status.
 */
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

/**
 * Parses an AT URI into DID, collection, and record key.
 * @param {string} uri - Raw `at://` URI.
 * @returns {{did: string, collection: string, rkey: string}} Parsed URI parts.
 */
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

/**
 * Extracts a blob CID from the common AT Protocol image reference shapes.
 * @param {object} image - AT Protocol image or blob node.
 * @returns {string} Blob CID or an empty string.
 */
function getBlobCidFromRef(image = {}) {
  return image?.image?.ref?.$link
    || image?.image?.cid
    || image?.cid
    || image?.ref?.$link
    || "";
}

/**
 * Parses a public blob URL into DID and CID.
 * @param {string} url - Public blob URL.
 * @returns {{did: string, cid: string}|null} Parsed blob location or null.
 */
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

/**
 * Downloads an asset through blob resolution when the URL points at an AT blob endpoint.
 * @param {object} auth - Authenticated account entry.
 * @param {string} url - Remote asset URL.
 * @param {string} fallbackDid - Optional fallback DID when only the CID is derivable.
 * @param {Map<string, string>|null} serviceCache - Optional DID-to-PDS cache.
 * @param {object} options - Optional timeout and promise cache settings.
 * @returns {Promise<{type: string, bytes: Uint8Array}>} Downloaded asset payload.
 */
async function downloadRemoteAssetViaBlob(auth, url, fallbackDid = "", serviceCache = null, options = {}) {
  const blobInfo = parseBlobUrlInfo(url);
  if (blobInfo?.did && blobInfo?.cid) {
    return downloadBlobForDid(auth, blobInfo.did, blobInfo.cid, serviceCache, options);
  }
  if (fallbackDid && blobInfo?.cid) {
    return downloadBlobForDid(auth, fallbackDid, blobInfo.cid, serviceCache, options);
  }
  return downloadRemoteAsset(url);
}
