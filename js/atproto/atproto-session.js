let atprotoIdentityInstance = null;
/** Lazily constructs identity adapters after worker configuration is ready. @returns {object} Identity service. */
function getAtprotoIdentity() {
  if (!atprotoIdentityInstance) {
    atprotoIdentityInstance = globalThis.createThreadlineIdentityService({
      fetch: (...args) => fetch(...args), request: (...args) => bskyFetch(...args), normalize: (...args) => normalizeServiceUrl(...args),
      base: (...args) => xrpcBaseForService(...args), webBase: (...args) => resolvePostWebBase(...args), readAuth: () => readStoredAuth(),
      abortController: () => new AbortController(), schedule: (callback, ms) => setTimeout(callback, ms), clearTimer: (id) => clearTimeout(id),
      error: (...args) => createServiceWorkerError(...args), apiBase: API_BASE, defaultService: DEFAULT_LOGIN_SERVICE, muWeb: MU_WEB_CLIENT, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return atprotoIdentityInstance;
}
let atprotoSessionInstance = null;
/** Lazily constructs session adapters after worker models/storage are ready. @returns {object} Session service. */
function getAtprotoSession() {
  if (!atprotoSessionInstance) {
    atprotoSessionInstance = globalThis.createThreadlineSessionService({
      request: (...args) => bskyFetch(...args), normalize: (...args) => normalizeServiceUrl(...args), base: (...args) => xrpcBaseForService(...args),
      webBase: (...args) => resolvePostWebBase(...args), handle: (...args) => resolveHandleToDid(...args), document: (...args) => fetchDidDocument(...args),
      endpoint: (...args) => extractPdsServiceFromDidDocument(...args), avatar: (...args) => fetchAccountAvatar(...args),
      avatarCache: () => getAccountAvatarCache(), cacheAvatar: (...args) => cacheStoredAccountAvatar(...args), saveAvatarCache: (...args) => saveAccountAvatarCache(...args),
      readAuth: () => readStoredAuth(), writeAuth: (value) => writeStoredAuth(value), upsert: (...args) => upsertAccount(...args), response: (...args) => buildAuthResponse(...args),
      now: () => new Date().toISOString(), nowMs: () => Date.now(), decodeBase64: (value) => atob(value), warn: (...args) => console.warn(...args),
      ensureReference: (...args) => ensureSession(...args), loginAgain: (...args) => login(...args), error: (...args) => createServiceWorkerError(...args),
      defaultService: DEFAULT_LOGIN_SERVICE, muWeb: MU_WEB_CLIENT, messages: globalThis.ThreadlineAdapterMessages,
    });
  }
  return atprotoSessionInstance;
}

/**
 * Resolves a Bluesky handle to a DID through the AT Protocol identity endpoint.
 * @param {string} handle - Normalized handle without leading at sign.
 * @param {object|null} auth - Optional authenticated account for bearer auth.
 * @param {Map<string, string|null>} cache - Per-request DID cache.
 * @returns {Promise<string|null>} Resolved DID or null when the handle is unknown.
 */
async function resolveHandleToDid(handle, auth, cache) { return getAtprotoIdentity().handle(handle, auth, cache); }

/**
 * Refreshes a mutable auth reference in place by reloading its stored session.
 * @param {object|null} auth - Mutable auth object used by a long-running workflow.
 * @returns {Promise<object|null>} Refreshed auth reference.
 */
async function refreshAuthReference(auth) { return getAtprotoSession().refresh(auth); }

/**
 * Loads a DID document from `did:plc` or `did:web`.
 * @param {string} did - DID to resolve.
 * @param {number} timeoutMs - Request timeout in milliseconds.
 * @returns {Promise<object>} DID document JSON.
 */
async function fetchDidDocument(did, timeoutMs = 8000) { return getAtprotoIdentity().document(did, timeoutMs); }

/**
 * Extracts the PDS service endpoint from a DID document.
 * @param {object} documentNode - DID document payload.
 * @param {string} fallbackService - Fallback service URL.
 * @returns {string} Normalized PDS service URL.
 */
function extractPdsServiceFromDidDocument(documentNode, fallbackService) { return getAtprotoIdentity().endpoint(documentNode, fallbackService); }

/**
 * Loads the current avatar URL for an actor profile.
 * @param {string} did - Actor DID.
 * @param {object|null} auth - Optional auth context.
 * @returns {Promise<string>} Avatar URL or an empty string.
 */
async function fetchAccountAvatar(did, auth = null) { return getAtprotoIdentity().avatar(did, auth); }

/**
 * Infers the matching public web app for an account entry.
 * @param {object} entry - Stored account entry.
 * @param {string} service - Normalized service URL.
 * @param {string} handle - Account handle.
 * @returns {string} Normalized public web app URL.
 */
function inferAccountWebApp(entry = {}, service = DEFAULT_LOGIN_SERVICE, handle = "") { return getAtprotoIdentity().webApp(entry, service, handle); }

/**
 * Signs in with app password, resolves the target PDS, and persists the session.
 * @param {object} options - Login options with identifier, app password, service, and web app.
 * @returns {Promise<object>} Public auth response for the UI.
 */
async function login({ identifier, appPassword, service, webApp } = {}) { return getAtprotoSession().login({ identifier, appPassword, service, webApp }); }

/**
 * Ensures a valid access token for the selected or active account.
 * @param {string|null} targetDid - Optional DID of the account to refresh.
 * @returns {Promise<object>} Fresh stored auth entry.
 */
async function ensureSession(targetDid = null) { return getAtprotoSession().ensure(targetDid); }

/**
 * Checks whether the current service/PDS is reachable.
 * @returns {Promise<{ok: boolean}>} Connectivity status.
 */
async function checkConnectivity() { return getAtprotoIdentity().connectivity(); }
