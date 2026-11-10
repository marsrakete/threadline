/** Creates login, session renewal and JWT operations with explicit account/identity/avatar adapters.
 * @param {object} options - Transport, normalization/frontend, identity, avatar/cache, storage/models, clocks, decoder, warning and facade callbacks.
 * @returns {object} Frozen login/ensure/refresh/decode/valid API.
 */
globalThis.createThreadlineSessionService = function createThreadlineSessionService(options) {
  for (const name of ["request", "normalize", "base", "webBase", "handle", "document", "endpoint", "avatar", "avatarCache", "cacheAvatar", "saveAvatarCache", "readAuth", "writeAuth", "upsert", "response", "now", "nowMs", "decodeBase64", "warn", "ensureReference", "loginAgain", "error"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Session service requires " + name);
    }
  }
  const { request: bskyFetch, normalize: normalizeServiceUrl, base: xrpcBaseForService, webBase: resolvePostWebBase,
    handle: resolveHandleToDid, document: fetchDidDocument, endpoint: extractPdsServiceFromDidDocument, avatar: fetchAccountAvatar,
    avatarCache: getAccountAvatarCache, cacheAvatar: cacheStoredAccountAvatar, saveAvatarCache: saveAccountAvatarCache,
    readAuth: readStoredAuth, writeAuth: writeStoredAuth, upsert: upsertAccount, response: buildAuthResponse,
    now, nowMs, decodeBase64, warn, ensureReference, loginAgain, error: createServiceWorkerError,
    defaultService: DEFAULT_LOGIN_SERVICE, muWeb: MU_WEB_CLIENT, messages } = options;
  /** Formats existing messages without interpreting inserted values. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }
  /** Creates a login session, resolves its PDS and persists account/avatar metadata.
   * @param {object} input - Identifier, appPassword, service and frontend.
   * @returns {Promise<object>} Public auth response.
   */
  async function login({ identifier, appPassword, service, webApp } = {}) {
    if (!identifier || !appPassword) {
      throw createServiceWorkerError(
        messages.missingCredentials,
        "LOGIN_MISSING_CREDENTIALS",
      );
    }

    const requestedService = normalizeServiceUrl(service || DEFAULT_LOGIN_SERVICE);
    let webTarget;
    if (requestedService === MU_WEB_CLIENT) {
      webTarget = MU_WEB_CLIENT;
    } else {
      webTarget = webApp || resolvePostWebBase(requestedService);
    }
    const requestedWebApp = normalizeServiceUrl(webTarget);
    let normalizedService = requestedService;
    if (requestedService === MU_WEB_CLIENT) {
      const normalizedIdentifier = String(identifier || "").trim().replace(/^@/, "");
      if (normalizedIdentifier.includes("@") && !normalizedIdentifier.startsWith("did:")) {
        throw createServiceWorkerError(
          messages.muEmail,
          "LOGIN_MU_PDS_RESOLUTION_FAILED",
        );
      }

      let did = normalizedIdentifier;
      if (!normalizedIdentifier.startsWith("did:")) {
        did = await resolveHandleToDid(normalizedIdentifier, null, new Map());
      }
      if (!did) {
        throw createServiceWorkerError(
          messages.muResolve,
          "LOGIN_MU_PDS_RESOLUTION_FAILED",
        );
      }

      const didDocument = await fetchDidDocument(did).catch(() => null);
      let pdsEntry = null;
      if (Array.isArray(didDocument?.service)) {
        pdsEntry = didDocument.service.find((entry) => entry?.type === "AtprotoPersonalDataServer" || String(entry?.id || "").endsWith("#atproto_pds"));
      }
      if (!pdsEntry?.serviceEndpoint) {
        throw createServiceWorkerError(
          messages.muResolve,
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
    let cachedAvatar = null;
    if (avatar) {
      cachedAvatar = await cacheStoredAccountAvatar({
        did: session.did,
        identifier,
        handle: session.handle,
        service: normalizedService,
        pdsUrl,
        webApp: requestedWebApp,
        avatar,
        session,
      }, avatarCache?.assets, serviceCache).catch(() => null);
    }
    if (cachedAvatar) {
      await saveAccountAvatarCache({
        cache: {
          updatedAt: now(),
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
      updatedAt: now(),
    });
    nextState.activeDid = session.did;
    const storedState = await writeStoredAuth(nextState);
    return buildAuthResponse(storedState, storedState.accounts.find((entry) => entry.did === session.did));
  }

  /** Returns a valid stored session, refreshes it or falls back to app-password login.
   * @param {string|null} targetDid - Explicit account or active DID.
   * @returns {Promise<object>} Stored auth entry; previous failure policy remains.
   */
  async function ensureSession(targetDid = null) {
    const state = await readStoredAuth();
    const desiredDid = targetDid || state.activeDid;
    const auth = state.accounts.find((entry) => entry.did && entry.did === desiredDid);

    if (!auth?.did) {
      throw new Error(messages.noSession);
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
        let cachedAvatar = null;
        if (avatar) {
          cachedAvatar = await cacheStoredAccountAvatar({
            ...auth,
            session: refreshedSession,
            avatar,
          }, avatarCache?.assets, serviceCache).catch(() => null);
        }
        if (cachedAvatar) {
          await saveAccountAvatarCache({
            cache: {
              updatedAt: now(),
              assets: cachedAvatar.assets,
            },
          });
        }
        const nextState = upsertAccount(state, {
          ...auth,
          session: refreshedSession,
          avatar,
          avatarPath: cachedAvatar?.account?.avatarPath || auth.avatarPath || "",
          updatedAt: now(),
        });
        nextState.activeDid = auth.did;
        const storedState = await writeStoredAuth(nextState);
        return storedState.accounts.find((entry) => entry.did === auth.did);
      } catch (error) {
        warn(messages.refreshWarning, error);
      }
    }

    if (!auth.identifier || !auth.appPassword) {
      throw new Error(messages.noPassword);
    }

    return loginAgain({
      identifier: auth.identifier,
      appPassword: auth.appPassword,
      service: auth.service,
      webApp: auth.webApp,
    }).then(async () => {
      const refreshedState = await readStoredAuth();
      const refreshedAuth = refreshedState.accounts.find((entry) => entry.did === auth.did);
      if (!refreshedAuth) {
        throw new Error(messages.renewFailed);
      }
      return refreshedAuth;
    });
  }

  /** Refreshes a mutable auth object in place through its DID.
   * @param {object|null} auth - Mutable account reference.
   * @returns {Promise<object|null>} Same object reference or original null input.
   */
  async function refreshAuthReference(auth) {
    if (!auth?.did) {
      return auth;
    }

    const freshAuth = await ensureReference(auth.did);
    if (!freshAuth) {
      return auth;
    }

    Object.assign(auth, freshAuth);
    auth.session = freshAuth.session;
    return auth;
  }

  /** Decodes the JWT payload without changing the previous validation policy.
   * @param {string} jwt - Token.
   * @returns {object|null} Parsed payload or null without payload; malformed input throws.
   */
  function decodeJwtPayload(jwt) {
    const [, payload] = jwt.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = decodeBase64(padded);
    return JSON.parse(decoded);
  }

  /** Applies the existing expiry policy including a thirty-second safety margin.
   * @param {string} accessJwt - Token.
   * @returns {boolean} Whether the token counts as current.
   */
  function isJwtValid(accessJwt) {
    if (!accessJwt) {
      return false;
    }

    try {
      const payload = decodeJwtPayload(accessJwt);
      if (!payload?.exp) {
        return true;
      }

      return payload.exp * 1000 > nowMs() + 30_000;
    } catch {
      return false;
    }
  }
  return Object.freeze({ login, ensure: ensureSession, refresh: refreshAuthReference, decode: decodeJwtPayload, valid: isJwtValid });
};
