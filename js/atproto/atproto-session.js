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
      base: xrpcBaseForService(auth?.pdsUrl || auth?.service || DEFAULT_LOGIN_SERVICE),
    });
    return String(profile?.avatar || "").trim();
  } catch {
    return "";
  }
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
