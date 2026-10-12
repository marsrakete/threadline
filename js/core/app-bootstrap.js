const FALLBACK_APP_VERSION_INFO = Object.freeze({
  appVersion: "0.4.273",
  cacheVersion: "v292",
  label: "Fix Thread Explorer reply handoff to composer",
});

/**
 * Normalizes one raw version object into the Threadline shape.
 * @param {object} versionInfo - Raw version payload from globals or JSON.
 * @returns {{appVersion: string, cacheVersion: string, label: string}} Clean version info object.
 */
function normalizeVersionInfo(versionInfo) {
  return {
    appVersion: String(versionInfo?.appVersion || "").trim(),
    cacheVersion: String(versionInfo?.cacheVersion || "").trim(),
    label: String(versionInfo?.label || "").trim(),
  };
}

/**
 * Returns the current version info from the global preload or the local fallback.
 * @returns {{appVersion: string, cacheVersion: string, label: string}} Current app version info.
 */
function getCurrentVersionInfo() {
  const globalVersionInfo = globalThis.APP_VERSION_INFO;
  if (globalVersionInfo) {
    return Object.freeze(normalizeVersionInfo(globalVersionInfo));
  }

  return Object.freeze(normalizeVersionInfo(FALLBACK_APP_VERSION_INFO));
}

/**
 * Builds one comparable signature from app and cache version.
 * @param {{appVersion?: string, cacheVersion?: string}|null|undefined} versionInfo - Version object to compare.
 * @returns {string} Comparable signature string.
 */
function versionSignature(versionInfo) {
  const normalizedVersionInfo = normalizeVersionInfo(versionInfo);
  return `${normalizedVersionInfo.appVersion}|${normalizedVersionInfo.cacheVersion}`;
}

/**
 * Loads remote version metadata from the JSON mirror without using the browser cache.
 * @returns {Promise<{appVersion: string, cacheVersion: string, label: string}>} Parsed version info from `version.json`.
 */
async function fetchVersionInfo() {
  const response = await fetch("./version.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Version file unavailable");
  }

  const payload = await response.json();
  return normalizeVersionInfo(payload);
}

const CURRENT_VERSION_INFO = getCurrentVersionInfo();

export {
  CURRENT_VERSION_INFO,
  fetchVersionInfo,
  normalizeVersionInfo,
  versionSignature,
};
/**
 * Owns worker registration, reload guarding and ordered application startup.
 * @param {object} options - Worker/native navigation adapters and startup actions.
 * @returns {object} Start operation and controller-change handler.
 */
export function createApplicationBootstrap(options) {
  let refreshing = false;
  /** Navigates once after a worker change, except during privacy navigation. @returns {void} */
  function controllerChange() {
    if (options.isPrivacyNavigation() || refreshing) { return; }
    refreshing = true;
    const pending = options.consumeNavigation();
    let target = options.getHref();
    if (pending) { target = pending; }
    const url = new URL(target, options.getHref());
    url.searchParams.set("reload", String(options.now()));
    options.navigate(url.toString());
  }
  /** Registers the worker and starts state, session and update handling in order. @returns {Promise<void>} Completion or reported failure. */
  async function start() {
    if (!options.isSupported()) { options.setStatus(options.translate("statusNoSupport")); return; }
    try {
      options.bindControllerChange(controllerChange);
      options.setRegistration(await options.register());
      await options.ready();
      options.setStatus(options.translate("statusCheckingSession"));
      await options.hydrate();
      await options.verifySession({ silent: true });
      options.startSessionChecks();
      await options.checkUpdates({ showChecking: false, silentNoChange: true, silentError: true });
    } catch (error) {
      options.report(error);
      options.setStatus(options.translate("statusSwRegisterFailed", { message: error.message }), "error");
    }
  }
  return { start, controllerChange };
}

/**
 * Owns update presentation, guarded checks, throttling and worker-assisted reloads.
 * @param {object} elements - Status, reload/check buttons and version label.
 * @param {object} options - Version, worker, clock, navigation and translation adapters.
 * @returns {object} Update operations and button handlers.
 */
export function createApplicationUpdateController(elements, options) {
  let checking = false;
  let reloading = false;
  let lastCheck = 0;
  /** Presents update status and reload availability. @param {string} message - Label. @param {boolean} showReload - Highlight reload. @param {boolean} error - Error tone. @returns {void} */
  function status(message, showReload = false, error = false) {
    if (!elements.status || !elements.reload) { return; }
    elements.status.textContent = message || "";
    elements.status.hidden = !message;
    let tone = "";
    if (message) { tone = "info"; }
    if (error) { tone = "error"; }
    elements.status.dataset.state = tone;
    elements.reload.hidden = false;
    elements.reload.disabled = reloading;
    elements.reload.classList.toggle("is-active", Boolean(showReload));
  }
  /** Renders current app/cache versions and release label. @returns {void} */
  function renderVersion() {
    if (!elements.version) { return; }
    const version = options.version;
    const parts = [`${options.t("versionPrefix")} ${version.appVersion}`, `${options.t("offlineVersion")} ${version.cacheVersion}`];
    if (version.label) { parts.push(version.label); }
    elements.version.textContent = parts.join(" \u00b7 ");
  }
  /** Checks remote metadata once, preserving silent-mode behavior. @param {object} settings - Checking/no-change/error visibility flags. @returns {Promise<void>} Check completion. */
  async function check(settings = {}) {
    const { showChecking = true, silentNoChange = false, silentError = false } = settings;
    if (checking) { return; }
    checking = true; elements.check.disabled = true;
    if (showChecking) { status(options.t("updateChecking")); }
    try {
      await options.registration()?.update();
      const remote = await options.fetchVersion();
      if (!remote.appVersion || !remote.cacheVersion) {
        if (!silentError) { status(options.t("updateVersionIncomplete"), false, true); }
        return;
      }
      if (versionSignature(remote) === versionSignature(options.version)) {
        if (!silentNoChange) { status(options.t("updateNoChange")); }
        return;
      }
      let label = "";
      if (remote.label) { label = ` \u00b7 ${remote.label}`; }
      status(`${options.t("updateAvailablePrefix")}: ${remote.appVersion} \u00b7 ${remote.cacheVersion}${label}. ${options.t("updateAvailableAction")}`, true);
    } catch (error) {
      options.report(error);
      if (!silentError) { status(options.t("updateFailed"), false, true); }
    } finally { checking = false; elements.check.disabled = false; }
  }
  /** Requests worker activation and schedules a single cache-busting reload. @returns {Promise<void>} Worker update attempt completion. */
  async function reload() {
    if (reloading) { return; }
    reloading = true; status(options.t("updateApplying"), true);
    try {
      const registration = options.registration();
      await registration?.update().catch(() => {});
      registration?.waiting?.postMessage?.({ type: "SKIP_WAITING" });
    } catch (error) { options.report(error); }
    options.setTimeout(() => {
      const url = new URL(options.href());
      url.searchParams.set("reload", String(options.now()));
      options.navigate(url.toString());
    }, 120);
  }
  /** Reserves an automatic check slot using the existing interval. @returns {boolean} Whether a check is due. */
  function shouldAutoCheck() {
    const now = options.now();
    if (now - lastCheck < options.intervalMs) { return false; }
    lastCheck = now; return true;
  }
  /** Runs a throttled check without changing no-update/error feedback. @returns {void} */
  function schedule() {
    if (!shouldAutoCheck()) { return; }
    void check({ showChecking: false, silentNoChange: true, silentError: true });
  }
  return { status, renderVersion, check, reload, shouldAutoCheck, schedule };
}
