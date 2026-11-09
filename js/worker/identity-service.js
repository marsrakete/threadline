/** Creates identity/PDS/avatar/frontend/connectivity operations with explicit browser adapters.
 * @param {object} options - fetch/request, normalization/base/frontend, auth store, abort/timer/error adapters, defaults and messages.
 * @returns {object} Frozen handle/document/endpoint/pds/avatar/webApp/connectivity API.
 */
globalThis.createThreadlineIdentityService = function createThreadlineIdentityService(options) {
  for (const name of ["fetch", "request", "normalize", "base", "webBase", "readAuth", "abortController", "schedule", "clearTimer", "error"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Identity service requires " + name);
    }
  }
  const { fetch, request: bskyFetch, normalize: normalizeServiceUrl, base: xrpcBaseForService, webBase: resolvePostWebBase, readAuth: readStoredAuth,
    abortController: createAbortController, schedule, clearTimer, error: createServiceWorkerError,
    apiBase: API_BASE, defaultService: DEFAULT_LOGIN_SERVICE, muWeb: MU_WEB_CLIENT, messages } = options;
  /** Formats existing messages without interpreting inserted values. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }
  /** Resolves a handle with the existing optional bearer and positive/negative request cache.
   * @param {string} handle - Handle. @param {object|null} auth - Auth context. @param {Map} cache - Caller cache.
   * @returns {Promise<string|null>} DID/null; network/parse failures keep existing behavior.
   */
  async function resolveHandleToDid(handle, auth, cache) {
    if (cache.has(handle)) {
      return cache.get(handle);
    }

    let headers;
    if (auth?.session?.accessJwt) {
      headers = { authorization: `Bearer ${auth.session.accessJwt}` };
    }
    const url = `${API_BASE}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      cache.set(handle, null);
      return null;
    }

    const data = await response.json().catch(() => ({}));
    let did = null;
    if (typeof data.did === "string" && data.did) {
      did = data.did;
    }
    cache.set(handle, did);
    return did;
  }

  /** Loads a PLC/web DID document with the existing bounded request timer.
   * @param {string} did - DID. @param {number} timeoutMs - Requested timeout.
   * @returns {Promise<object>} Document; AbortError retains its existing message.
   */
  async function fetchDidDocument(did, timeoutMs = 8000) {
    if (!did) {
      throw new Error(messages.didMissing);
    }

    const controller = createAbortController();
    const timeoutId = schedule(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 8000));

    try {
      if (did.startsWith("did:plc:")) {
        const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(text("didFailed", { status: response.status }));
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
          throw new Error(text("didFailed", { status: response.status }));
        }
        return response.json();
      }

      throw new Error(text("didUnsupported", { did }));
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(messages.didTimeout);
      }
      throw error;
    } finally {
      clearTimer(timeoutId);
    }
  }

  /** Selects the first PDS service by type or ID suffix with the existing fallback.
   * @param {object} documentNode - Document. @param {string} fallbackService - Fallback.
   * @returns {string} Normalized endpoint.
   */
  function extractPdsServiceFromDidDocument(documentNode, fallbackService) {
    let services = [];
    if (Array.isArray(documentNode?.service)) {
      services = documentNode.service;
    }
    const pds = services.find((entry) =>
      entry?.type === "AtprotoPersonalDataServer"
      || String(entry?.id || "").endsWith("#atproto_pds"));

    return normalizeServiceUrl(pds?.serviceEndpoint || fallbackService || DEFAULT_LOGIN_SERVICE);
  }

  /** Loads a profile avatar using the supplied PDS/auth context.
   * @param {string} did - Actor DID. @param {object|null} auth - Optional account.
   * @returns {Promise<string>} Trimmed avatar URL or empty on failure.
   */
  async function fetchAccountAvatar(did, auth = null) {
    try {
      let headers;
      if (auth?.session?.accessJwt) {
        headers = { authorization: `Bearer ${auth.session.accessJwt}` };
      }
      const profile = await bskyFetch(`app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, {
        method: "GET",
        headers,
        base: xrpcBaseForService(auth?.pdsUrl || auth?.service || DEFAULT_LOGIN_SERVICE),
      });
      return String(profile?.avatar || "").trim();
    } catch {
      return "";
    }
  }

  /** Infers a public frontend from explicit metadata, Mu handles or service mapping.
   * @param {object} entry - Account metadata. @param {string} service - Login/PDS URL. @param {string} handle - Handle.
   * @returns {string} Normalized frontend.
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

  /** Checks the active PDS with the existing eight-second abort and error contract.
   * @returns {Promise<object>} ok result or coded connectivity failure.
   */
  async function checkConnectivity() {
    const controller = createAbortController();
    const timeoutId = schedule(() => controller.abort(), 8000);

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
          text("requestFailed", { status: response.status }),
          "CONNECTIVITY_FAILED",
          { status: response.status },
        );
      }

      return { ok: true };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createServiceWorkerError(
          messages.connectTimeout,
          "CONNECTIVITY_TIMEOUT",
        );
      }

      if (error?.details?.code === "INSECURE_SERVICE_URL") {
        throw error;
      }
      throw createServiceWorkerError(
        messages.connectFailed,
        "CONNECTIVITY_FAILED",
      );
    } finally {
      clearTimer(timeoutId);
    }
  }

  /** Resolves/caches a DID PDS, including fallback results after document failures.
   * @param {string} did - DID. @param {string} fallbackService - Fallback service. @param {Map|null} cache - Caller cache.
   * @returns {Promise<string>} Normalized endpoint.
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
  return Object.freeze({ handle: resolveHandleToDid, document: fetchDidDocument, endpoint: extractPdsServiceFromDidDocument, pds: resolvePdsForDid, avatar: fetchAccountAvatar, webApp: inferAccountWebApp, connectivity: checkConnectivity });
};
