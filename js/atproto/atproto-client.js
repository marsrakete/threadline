let atprotoTransportInstance = null;
/** Lazily wires the classic client to its explicit shared transport dependencies. @returns {object} Cached transport API. */
function getAtprotoTransport() {
  if (!atprotoTransportInstance) {
    atprotoTransportInstance = globalThis.createThreadlineTransportService({
      apiBase: API_BASE, fetch: (...args) => fetch(...args), getRequest: (...args) => bskyFetch(...args),
      searchParams: () => new URLSearchParams(), error: (...args) => createServiceWorkerError(...args),
      now: () => Date.now(), messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return atprotoTransportInstance;
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
 * Executes an AT Protocol XRPC request and parses JSON plus rate-limit metadata.
 * @param {string} endpoint - Endpoint path relative to the XRPC base.
 * @param {object} options - Fetch options plus optional `base` and `returnMeta`.
 * @returns {Promise<object>} Parsed JSON payload or payload plus metadata.
 */
async function bskyFetch(endpoint, options = {}) { return getAtprotoTransport().request(endpoint, options); }

/**
 * Executes a GET XRPC request with query parameters.
 * @param {string} endpoint - Endpoint path relative to the XRPC base.
 * @param {object} query - Query parameter map.
 * @param {object} options - Optional request headers, base URL, and abort signal.
 * @returns {Promise<object>} Parsed JSON payload.
 */
async function bskyGet(endpoint, query = {}, options = {}) { return getAtprotoTransport().get(endpoint, query, options); }

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
async function resolvePdsForDid(did, fallbackService = DEFAULT_LOGIN_SERVICE, cache = null) { return getAtprotoIdentity().pds(did, fallbackService, cache); }

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
