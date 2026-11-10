/** Creates shared auth/service URL models without storing or requesting data.
 * @param {object} options - Default service/web app, inferWebApp/webBase callbacks, error factory, clock and messages.
 * @returns {object} Frozen normalize/security/account/state/public/response/upsert API.
 */
globalThis.createThreadlineAuthModels = function createThreadlineAuthModels(options) {
  for (const name of ["inferWebApp", "webBase", "error", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Auth models require " + name);
    }
  }
  const { defaultService: DEFAULT_LOGIN_SERVICE, defaultWebApp: DEFAULT_POST_WEB_APP, inferWebApp: inferAccountWebApp, webBase: resolvePostWebBase, error: createServiceWorkerError, messages } = options;
  /** Normalizes service URLs while preserving the existing malformed-input fallback.
   * @param {unknown} value - Service input.
   * @returns {string} Service URL without trailing slash/query/hash or XRPC suffix.
   */
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

  /** Detects an explicit HTTP URL.
   * @param {unknown} value - Service input.
   * @returns {boolean} Whether it starts with HTTP.
   */
  function isInsecureServiceUrl(value) {
    return /^http:\/\//i.test(String(value || "").trim());
  }

  /** Rejects insecure explicit HTTP services.
   * @param {unknown} value - Service URL.
   * @returns {void} Throws the existing service error for HTTP.
   */
  function assertSecureServiceUrl(value) {
    if (isInsecureServiceUrl(value)) {
      throw createServiceWorkerError(
        messages.insecure,
        "INSECURE_SERVICE_URL",
      );
    }
  }

  /** Normalizes stored account metadata and retains its session reference.
   * @param {object} entry - Current or legacy stored account.
   * @returns {object} Normalized account with unchanged credential/session fields.
   */
  function normalizeAuthAccount(entry = {}) {
    const did = entry.session?.did || entry.did || "";
    const handle = entry.session?.handle || entry.handle || entry.identifier || "";
    const service = normalizeServiceUrl(entry.service || entry.pdsUrl || DEFAULT_LOGIN_SERVICE);
    let appPassword = "";
    if (entry.appPassword) {
      appPassword = String(entry.appPassword);
    }
    let session = null;
    if (entry.session && typeof entry.session === "object") {
      session = entry.session;
    }
    return {
      did,
      identifier: String(entry.identifier || handle || ""),
      handle: String(handle || ""),
      service,
      pdsUrl: normalizeServiceUrl(entry.pdsUrl || entry.service || DEFAULT_LOGIN_SERVICE),
      webApp: inferAccountWebApp(entry, service, handle),
      avatar: typeof entry.avatar === "string" && !/^\[object(?:\s+[^\]]+)?\]$/i.test(entry.avatar.trim()) ? entry.avatar.trim() : "",
      ...globalThis.ThreadlineProfileMetadata.normalize(entry),
      avatarPath: String(entry.avatarPath || ""),
      appPassword,
      session,
      updatedAt: entry.updatedAt || options.now(),
    };
  }

  /** Normalizes modern account lists and legacy single-account storage.
   * @param {unknown} value - Stored auth value.
   * @returns {object} Accounts and activeDid using the existing selection rules.
   */
  function normalizeAuthState(value) {
    if (!value) {
      return { activeDid: "", accounts: [] };
    }

    if (Array.isArray(value.accounts)) {
      const accounts = value.accounts
        .map((entry) => normalizeAuthAccount(entry))
        .filter((entry) => entry.did || entry.identifier);
      let activeDid = "";
      if (accounts.some((entry) => entry.did && entry.did === value.activeDid)) {
        activeDid = value.activeDid;
      }
      return { activeDid, accounts };
    }

    if (value.session?.did || value.identifier) {
      const account = normalizeAuthAccount(value);
      let accounts = [];
      if (account.did || account.identifier) {
        accounts = [account];
      }
      return { activeDid: account.did || "", accounts };
    }

    return { activeDid: "", accounts: [] };
  }

  /** Builds public account metadata without returning credentials or tokens.
   * @param {object} account - Stored account.
   * @returns {object} Public account metadata with password/session availability flags.
   */
  function getAccountPublicMeta(account) {
    return {
      did: account.did || "",
      identifier: account.identifier || "",
      handle: account.handle || account.identifier || "",
      service: normalizeServiceUrl(account.service || account.pdsUrl || DEFAULT_LOGIN_SERVICE),
      webApp: normalizeServiceUrl(account.webApp || resolvePostWebBase(account.service)),
      avatar: account.avatar || "",
      ...globalThis.ThreadlineProfileMetadata.normalize(account),
      avatarPath: account.avatarPath || "",
      hasStoredPassword: Boolean(account.appPassword),
      hasSession: Boolean(account.session?.did),
      updatedAt: account.updatedAt || "",
    };
  }

  /** Builds the public auth response for an explicit or active stored account.
   * @param {object} state - Auth state. @param {object|null} account - Optional account override.
   * @returns {object} Public auth response.
   */
  function buildAuthResponse(state, account = null) {
    const activeAccount = account || state.accounts.find((entry) => entry.did && entry.did === state.activeDid) || null;
    return {
      authenticated: Boolean(activeAccount?.session?.did),
      identifier: activeAccount?.identifier || "",
      handle: activeAccount?.handle || "",
      did: activeAccount?.did || "",
      service: activeAccount?.service || "",
      webApp: activeAccount?.webApp || DEFAULT_POST_WEB_APP,
      accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
    };
  }

  /** Prepends a normalized account, removing DID/identifier matches while retaining activeDid.
   * @param {object} state - Existing auth state. @param {object} account - Incoming account.
   * @returns {object} New state and account array.
   */
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
  return Object.freeze({ service: normalizeServiceUrl, insecure: isInsecureServiceUrl, secure: assertSecureServiceUrl, account: normalizeAuthAccount, state: normalizeAuthState, publicMeta: getAccountPublicMeta, response: buildAuthResponse, upsert: upsertAccount });
};
