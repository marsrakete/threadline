/** Creates stored-account lifecycle operations with explicit persistence/session adapters.
 * @param {object} options - Storage, session, account-model, archive, frontend, message and clock dependencies.
 * @returns {object} Frozen switch/import/remove/logout/verify API.
 */
globalThis.createThreadlineAccountService = function createThreadlineAccountService(options) {
  for (const name of ["readAuth", "writeAuth", "clearAuth", "ensure", "upsert", "response", "publicMeta", "webBase", "clearArchiveSession", "clearArchiveCatalog", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Account service requires " + name);
    }
  }
  const { readAuth: readStoredAuth, writeAuth: writeStoredAuth, clearAuth: clearStoredAuth, ensure: ensureSession,
    upsert: upsertAccount, response: buildAuthResponse, publicMeta: getAccountPublicMeta, webBase: resolvePostWebBase,
    clearArchiveSession, clearArchiveCatalog, now, defaultService: DEFAULT_LOGIN_SERVICE, messages } = options;
  /** Preserves offline/password/error precedence. @param {Error} error - Failure. @param {object|null} account - Stored account. @returns {string} Reason code. */
  function failureReason(error, account) {
    if (isOfflineAuthError(error)) { return "offline"; }
    if (!account?.appPassword) { return "missing_password"; }
    if (isInvalidCredentialsError(error)) { return "invalid_password"; }
    return "signed_out";
  }
  /** Classifies connection failures. @param {Error} error - Failure. @returns {boolean} Whether offline. */
  function isOfflineAuthError(error) {
    if (error?.details?.code === "CONNECTIVITY_FAILED" || error?.details?.code === "CONNECTIVITY_TIMEOUT") {
      return true;
    }
    const normalized = String(error?.message || "").toLowerCase();
    return normalized.includes("could not connect to bluesky")
      || normalized.includes("fetch failed")
      || normalized.includes("networkerror")
      || normalized.includes("load failed")
      || normalized.includes("failed to fetch");
  }

  /** Classifies credential failures. @param {Error} error - Failure. @returns {boolean} Whether credentials are invalid. */
  function isInvalidCredentialsError(error) {
    if (error?.details?.code === "AUTH_INVALID_CREDENTIALS") {
      return true;
    }
    const normalized = String(error?.message || "").toLowerCase();
    return normalized.includes("invalid identifier or password")
      || normalized.includes("invalid login credentials")
      || normalized.includes("bluesky error: 401");
  }

  /** Verifies and selects a stored account. @param {object} input - Operation input where applicable. @returns {Promise<object>} Public account response. */
  async function switchAccount({ did } = {}) {
    const state = await readStoredAuth();
    const account = state.accounts.find((entry) => entry.did && entry.did === did);

    if (!account) {
      throw new Error(messages.accountMissing);
    }

    try {
      const verified = await ensureSession(did);
      const refreshedState = await readStoredAuth();
      refreshedState.activeDid = verified.did || did;
      const storedState = await writeStoredAuth(refreshedState);
      return buildAuthResponse(storedState, storedState.accounts.find((entry) => entry.did === (verified.did || did)));
    } catch (error) {
      const reason = failureReason(error, account);
      return {
        authenticated: false,
        reason,
        did: account.did || "",
        identifier: account.identifier || "",
        handle: account.handle || "",
        service: account.service || DEFAULT_LOGIN_SERVICE,
        webApp: account.webApp || resolvePostWebBase(account.service),
        accounts: state.accounts.map((entry) => getAccountPublicMeta(entry)),
      };
    }
  }

  /** Imports public metadata without credentials. @param {object} input - Operation input where applicable. @returns {Promise<object>} Public account response. */
  async function importAccountMetadata({ accounts } = {}) {
    const state = await readStoredAuth();
    let nextState = { ...state, accounts: [...state.accounts] };

    let entries = [];
    if (Array.isArray(accounts)) {
      entries = accounts;
    }
    for (const entry of entries) {
      if (!(entry?.did || entry?.identifier)) {
        continue;
      }

      nextState = upsertAccount(nextState, {
        did: entry.did || "",
        identifier: entry.identifier || entry.handle || "",
        handle: entry.handle || entry.identifier || "",
        service: entry.service || DEFAULT_LOGIN_SERVICE,
        pdsUrl: entry.service || DEFAULT_LOGIN_SERVICE,
        webApp: entry.webApp || resolvePostWebBase(entry.service),
        avatar: entry.avatar || "",
        avatarPath: entry.avatarPath || "",
        session: null,
        appPassword: "",
        updatedAt: now(),
      });
    }

    if (nextState.accounts.length > 0 && !nextState.activeDid) {
      nextState.activeDid = nextState.accounts.find((entry) => entry.session?.did)?.did || "";
    }

    const storedState = await writeStoredAuth(nextState);
    return {
      accounts: storedState.accounts.map((entry) => getAccountPublicMeta(entry)),
    };
  }

  /** Removes a stored account and selects the first remaining session. @param {object} input - Operation input where applicable. @returns {Promise<object>} Public account response. */
  async function removeAccount({ did } = {}) {
    const state = await readStoredAuth();
    const nextAccounts = state.accounts.filter((entry) => !(entry.did && entry.did === did));
    const nextActive = nextAccounts.find((entry) => entry.session?.did) || null;

    if (nextAccounts.length === 0) {
      await clearStoredAuth();
    } else {
      await writeStoredAuth({
        activeDid: nextActive?.did || "",
        accounts: nextAccounts,
      });
    }

    const nextState = await readStoredAuth();
    const activeAccount = nextState.accounts.find((entry) => entry.did && entry.did === nextState.activeDid) || null;
    return buildAuthResponse(nextState, activeAccount);
  }

  /** Clears the target session and active archive data when applicable. @param {object} input - Operation input where applicable. @returns {Promise<object>} Public account response. */
  async function logout({ did } = {}) {
    const state = await readStoredAuth();
    const targetDid = did || state.activeDid;
    const nextAccounts = state.accounts.map((entry) => {
      if (!(targetDid && entry.did === targetDid)) {
        return entry;
      }

      return {
        ...entry,
        session: null,
        updatedAt: now(),
      };
    });
    const nextActiveAccount = nextAccounts.find((entry) => entry.did !== targetDid && entry.session?.did) || null;
    let nextActiveDid = state.activeDid;
    if (state.activeDid === targetDid) {
      nextActiveDid = nextActiveAccount?.did || "";
    }
    await writeStoredAuth({
      activeDid: nextActiveDid,
      accounts: nextAccounts,
    });
    if (state.activeDid === targetDid) {
      await clearArchiveSession();
      await clearArchiveCatalog();
    }
    const nextState = await readStoredAuth();
    const nextActive = nextState.accounts.find((entry) => entry.did && entry.did === nextState.activeDid) || null;
    return buildAuthResponse(nextState, nextActive);
  }

  /** Returns public authentication state with the existing failure policy. @returns {Promise<object>} Public account response. */
  async function verifySession() {
    try {
      const auth = await ensureSession();
      const state = await readStoredAuth();
      return buildAuthResponse(state, auth);
    } catch (error) {
      const state = await readStoredAuth().catch(() => ({ activeDid: "", accounts: [] }));
      const activeAccount = state.accounts.find((entry) => entry.did && entry.did === state.activeDid) || null;
      const result = buildAuthResponse({ ...state, activeDid: "" }, null);
      result.reason = failureReason(error, activeAccount);
      return result;
    }
  }

  return Object.freeze({ switch: switchAccount, import: importAccountMetadata, remove: removeAccount, logout, verify: verifySession });
};
