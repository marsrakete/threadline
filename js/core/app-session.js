/**
 * Owns session verification, account repair and periodic session checks.
 * @param {object} options - Account state, worker transport, UI and timer adapters.
 * @returns {object} Verify/start/stop session operations.
 */
export function createApplicationSessionController(options) {
  let timer = null;
  /** Verifies the current account and preserves offline/repair behavior. @param {object} settings - Optional silent flag. @returns {Promise<boolean>} Authenticated status. */
  async function verify(settings = {}) {
    const { silent = false } = settings;
    if (!options.getState().did) { return false; }
    try {
      const result = await options.request("VERIFY_SESSION");
      if (Array.isArray(result.accounts)) { options.setAccounts(result.accounts); }
      await options.restoreAvatars(); options.renderAccounts();
      const state = options.getState();
      if (!result.authenticated) {
        const active = state.accounts.find((entry) => entry.did && entry.did === state.did) || null;
        const label = active?.handle || active?.identifier || state.account || "";
        if (result.reason === "offline") {
          if (!silent && label) { options.setStatus(options.t("statusAccountOffline", { account: label }), "error"); }
          options.updateAuthButtons(); return false;
        }
        if (result.reason === "invalid_password" || result.reason === "missing_password") {
          let key = "statusAccountNeedsLogin";
          if (result.reason === "invalid_password") { key = "statusAccountPasswordRejected"; }
          const message = options.t(key, { account: label });
          options.disconnect(false);
          if (active) { options.openLogin({ account: active, mode: "repair", note: message, tone: "error" }); }
          options.setStatus(message, "error"); return false;
        }
        options.disconnect(!silent); return false;
      }
      const identity = { account: result.handle || result.identifier || state.account, did: result.did || state.did,
        service: result.service || state.service, webApp: result.webApp || state.webApp };
      options.setIdentity(identity);
      if (silent) { options.updateAuthButtons(); }
      else { options.setStatus(options.t("statusConnected", { account: identity.account })); }
      options.restoreWorkspace(); return true;
    } catch (error) { options.report(error); options.disconnect(!silent); return false; }
  }
  /** Stops any previous periodic verification. @returns {void} */
  function stop() { options.clearInterval(timer); timer = null; }
  /** Restarts the five-minute silent verification interval. @returns {void} */
  function start() { stop(); timer = options.setInterval(() => { void verify({ silent: true }); }, 5 * 60 * 1000); }
  return { verify, start, stop };
}

/** Normalizes a login endpoint, retaining legacy fallback behavior. @param {string} value - Preset or URL. @param {object} presets - Service mapping. @returns {string} Base endpoint. */
export function normalizeLoginServiceUrl(value, presets) {
  let url = presets[String(value || "").trim()] || String(value || "").trim();
  if (!url) { return presets["bsky.social"]; }
  if (!/^https?:\/\//i.test(url)) { url = `https://${url}`; }
  try {
    const normalized = new URL(url);
    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    if (normalized.pathname.endsWith("/xrpc")) { normalized.pathname = normalized.pathname.slice(0, -5); }
    normalized.search = ""; normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch { return url.replace(/\/+$/, ""); }
}

/** Converts known login errors into translation keys with raw-message fallback. @param {object|null} error - Worker error. @param {Function} t - Translator. @returns {string} User-facing error. */
export function localizeLoginError(error, t) {
  const keys = { AUTH_INVALID_CREDENTIALS: "statusLoginFailedInvalidCredentials", LOGIN_MISSING_CREDENTIALS: "statusLoginFailedMissingCredentials",
    CONNECTIVITY_FAILED: "statusLoginFailedConnection", CONNECTIVITY_TIMEOUT: "statusLoginFailedConnection",
    INSECURE_SERVICE_URL: "statusLoginFailedInsecureService", LOGIN_MU_PDS_RESOLUTION_FAILED: "statusLoginFailedMuPdsResolution" };
  const code = String(error?.details?.code || "");
  if (Object.hasOwn(keys, code)) { return t(keys[code]); }
  const raw = String(error?.message || "").trim(); const normalized = raw.toLowerCase();
  if (!normalized) { return t("statusLoginFailedGeneric"); }
  if (normalized.includes("invalid identifier or password") || normalized.includes("invalid login credentials")
    || normalized.includes("authentication required") || normalized.includes("bluesky error: 401")) { return t("statusLoginFailedInvalidCredentials"); }
  if (normalized.includes("app-password are required") || normalized.includes("identifier and app password are required")) { return t("statusLoginFailedMissingCredentials"); }
  if (normalized.includes("could not connect to bluesky")) { return t("statusLoginFailedConnection"); }
  if (normalized.includes("insecure service urls are not allowed") || normalized.includes("please use https")) { return t("statusLoginFailedInsecureService"); }
  return raw;
}

/**
 * Owns login form presentation, service selection and submission.
 * @param {object} elements - Dialog/form controls and note.
 * @param {object} options - Presets, account state, worker/UI and native adapters.
 * @returns {object} Dialog and form operations plus authentication handlers.
 */
export function createLoginController(elements, options) {
  /** Reads the selected endpoint. @returns {string} Normalized endpoint. */
  function selectedService() {
    let value = elements.preset.value;
    if (value === "custom") { value = elements.custom.value; }
    return normalizeLoginServiceUrl(value, options.presets);
  }
  /** Updates preset/custom controls. @param {string} service - Endpoint. @returns {void} */
  function selectService(service = options.presets["bsky.social"]) {
    const normalized = normalizeLoginServiceUrl(service, options.presets);
    const entry = Object.entries(options.presets).find(([, url]) => normalizeLoginServiceUrl(url, options.presets) === normalized);
    if (entry) { elements.preset.value = entry[0]; elements.customWrap.hidden = true; elements.custom.value = ""; return; }
    elements.preset.value = "custom"; elements.customWrap.hidden = false; elements.custom.value = normalized;
  }
  /** Presents login guidance. @param {string} message - Plain text. @param {string} tone - Error or neutral. @returns {void} */
  function note(message = "", tone = "neutral") {
    elements.note.hidden = !message; elements.note.textContent = message;
    let color = "var(--muted)"; if (tone === "error") { color = "var(--danger)"; }
    elements.note.style.color = color;
  }
  /** Opens an add/repair login dialog with cleared password. @param {object} settings - Account and optional field overrides. @returns {void} */
  function open(settings = {}) {
    const account = settings.account || null;
    elements.identifier.value = settings.identifier ?? account?.identifier ?? account?.handle ?? "";
    elements.password.value = "";
    let accountService = account?.service;
    if (account?.webApp === options.presets["mu.social"]) { accountService = account.webApp; }
    selectService(settings.service || accountService || options.presets["bsky.social"]);
    note(settings.note || "", settings.tone || "neutral");
    if (!elements.dialog.open) { elements.dialog.showModal(); }
    options.setTimeout(() => {
      if (elements.identifier.value) { elements.password.focus(); } else { elements.identifier.focus(); }
    }, 0);
  }
  /** Clears private input and closes the dialog. @returns {void} */
  function close() { note(); elements.password.value = ""; if (elements.dialog.open) { elements.dialog.close(); } }
  /** Submits login and updates the active account only on success. @param {Event} event - Form submission. @returns {Promise<void>} Completion. */
  async function submit(event) {
    event.preventDefault();
    try {
      options.setBusy(true);
      const identifier = elements.identifier.value.trim(); const service = selectedService();
      let webApp;
      if (elements.preset.value === "mu.social") { webApp = options.presets["mu.social"]; }
      const result = await options.request("LOGIN", { identifier, appPassword: elements.password.value.trim(), service, webApp });
      elements.password.value = "";
      options.setIdentity({ account: result.handle || result.identifier, did: result.did || "", service: result.service || service,
        webApp: result.webApp || options.resolveWebApp(service) });
      if (Array.isArray(result.accounts)) { options.setAccounts(result.accounts); }
      await options.restoreAvatars(); elements.identifier.value = result.identifier || identifier;
      selectService(options.getState().service); close(); options.updateStatus();
    } catch (error) {
      const message = localizeLoginError(error, options.t);
      if (message === (error?.message || "")) { options.report(error); }
      note(message, "error"); options.setStatus(message, "error");
    } finally { options.setBusy(false); }
  }
  /** Opens the add-account form. @returns {void} */
  function add() { open({ mode: "add", service: options.getState().service || options.presets["bsky.social"] }); }
  /** Cancels native dialog closure through the password-cleanup path. @param {Event} event - Cancel event. @returns {void} */
  function cancel(event) { event.preventDefault(); close(); }
  /** Applies network availability and updates account presentation. @param {boolean} online - Availability. @returns {void} */
  function connectivity(online) { options.setOnline(online); options.renderAccounts(); options.updateStatus(); }
  return { selectedService, selectService, note, open, close, submit,
    handlers: { addAccountClick: add, closeClick: close, cancelClick: close, cancelEvent: cancel,
      submit, online: () => connectivity(true), offline: () => connectivity(false) } };
}

/**
 * Owns saved-account switch, sign-in/out and removal workflows.
 * @param {object} options - Account state, request adapters and UI actions.
 * @returns {object} Account action operations.
 */
export function createSavedAccountActions(options) {
  /** Applies identity from a worker response. @param {object} result - Auth result. @param {object} account - Service fallback. @param {boolean} authenticated - Whether to retain identity. @returns {void} */
  function identity(result, account, authenticated) {
    const service = result.service || account.service || options.defaultService;
    let handle = null; let did = "";
    if (authenticated) { handle = result.handle || result.identifier || null; did = result.did || ""; }
    options.setIdentity({ account: handle, did, service, webApp: result.webApp || account.webApp || options.resolveWebApp(service) });
  }
  /** Restores account list and avatars after an action. @param {object} result - Worker response. @param {boolean} emptyFallback - Clear missing list on removal. @returns {Promise<void>} Completion. */
  async function refresh(result, emptyFallback = false) {
    if (Array.isArray(result.accounts)) { options.setAccounts(result.accounts); }
    else if (emptyFallback) { options.setAccounts([]); }
    await options.restoreAvatars();
  }
  /** Formats an account-repair reason. @param {object} account - Saved account. @param {string} reason - Worker reason. @returns {string} Localized message. */
  function reasonMessage(account, reason) {
    let key = "statusAccountNeedsLogin";
    if (reason === "offline") { key = "statusAccountOffline"; }
    else if (reason === "invalid_password") { key = "statusAccountPasswordRejected"; }
    return options.t(key, { account: account.handle || account.identifier || "" });
  }
  /** Reports action failures. @param {Error} error - Request/UI failure. @returns {void} */
  function failed(error) { options.report(error); options.setStatus(error.message, "error"); }
  /** Switches the selected account, preserving the original field-update behavior. @param {object} account - Saved account. @returns {Promise<void>} Completion. */
  async function select(account) {
    try {
      const result = await options.switchAccount(account.did); await refresh(result); options.renderAccounts();
      if (!result.authenticated) {
        identity({}, account, false); options.setLoginFields(account.identifier || account.handle || "", true); options.updateStatus();
        const message = reasonMessage(account, result.reason); options.setStatus(message, "error");
        if (result.reason === "missing_password" || result.reason === "invalid_password") { options.openLogin({ account, mode: "repair", note: message, tone: "error" }); }
        return;
      }
      identity(result, account, true); options.setLoginFields(result.identifier || "", true); options.updateStatus();
      await options.verify({ silent: true });
    } catch (error) { failed(error); }
  }
  /** Signs out an account or repairs/signs in a stored-password account. @param {object} account - Saved account. @param {string} state - Visual state at click binding. @returns {Promise<void>} Completion. */
  async function toggle(account, state) {
    try {
      if (state === "signed-out") {
        if (!account.hasStoredPassword) {
          options.openLogin({ account, mode: "repair", note: reasonMessage(account, "missing_password"), tone: "error" }); return;
        }
        const result = await options.switchAccount(account.did); await refresh(result); options.renderAccounts();
        if (result.authenticated) { identity(result, account, true); options.updateStatus(); await options.verify({ silent: true }); return; }
        const message = reasonMessage(account, result.reason); options.setStatus(message, "error");
        if (result.reason !== "offline") { options.openLogin({ account, mode: "repair", note: message, tone: "error" }); }
        return;
      }
      const result = await options.logout(account.did); await refresh(result); identity(result, {}, result.authenticated);
      options.updateStatus(); options.setStatus(options.t("accountSignedOutStatus", { account: account.handle || account.identifier || "account" }));
    } catch (error) { failed(error); }
  }
  /** Removes an account only after confirmation. @param {object} account - Saved account. @returns {Promise<void>} Completion. */
  async function remove(account) {
    const confirmed = await options.confirm({ title: options.t("removeAccountConfirmTitle"),
      message: options.t("removeAccountConfirmText", { account: account.handle || account.identifier || "account" }),
      confirmLabel: options.t("removeAccountConfirmButton"), cancelLabel: options.t("cancelButton") });
    if (!confirmed) { return; }
    try {
      const result = await options.remove(account.did); await refresh(result, true); identity(result, {}, result.authenticated);
      options.setLoginFields(result.identifier || "", false); options.updateStatus();
      options.setStatus(options.t("accountRemovedStatus", { account: account.handle || account.identifier || "account" }));
    } catch (error) { failed(error); }
  }
  return { select, toggle, remove };
}
