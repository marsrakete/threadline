import { THREADLINE_PAGE_COMPOSER, THREADLINE_PAGE_TOOLS, normalizeThreadlinePage } from "./app-navigation.js";

/**
 * Returns the current Threadline page from the body dataset.
 * @returns {string} Active page identifier.
 */
function getCurrentThreadlinePage() {
  if (!document.body) {
    return THREADLINE_PAGE_COMPOSER;
  }

  return normalizeThreadlinePage(document.body.dataset.page);
}

/**
 * Returns whether one workspace is available on the current page.
 * @param {string} workspace - Workspace identifier such as composer or search.
 * @returns {boolean} True when the workspace belongs to the current page.
 */
function isWorkspaceAllowedOnCurrentPage(workspace) {
  const normalizedWorkspace = String(workspace || "").trim();
  const currentPage = getCurrentThreadlinePage();
  if (currentPage === THREADLINE_PAGE_TOOLS) {
    if (
      normalizedWorkspace === "archive"
      || normalizedWorkspace === "search"
      || normalizedWorkspace === "network"
      || normalizedWorkspace === "threadExplorer"
      || normalizedWorkspace === "analysis"
      || normalizedWorkspace === "dm"
    ) {
      return true;
    }

    return false;
  }

  return normalizedWorkspace === "composer";
}

/**
 * Returns the default workspace for the active page.
 * @returns {string} Default workspace identifier.
 */
function getDefaultWorkspaceForCurrentPage() {
  if (getCurrentThreadlinePage() === THREADLINE_PAGE_TOOLS) {
    return "search";
  }

  return "composer";
}

/**
 * Maps a workspace identifier to one that exists on the active page.
 * @param {string} workspace - Raw workspace identifier from storage or events.
 * @returns {string} Workspace identifier allowed on the current page.
 */
function normalizeWorkspaceForCurrentPage(workspace) {
  const normalizedWorkspace = String(workspace || "").trim();
  if (isWorkspaceAllowedOnCurrentPage(normalizedWorkspace)) {
    return normalizedWorkspace;
  }

  return getDefaultWorkspaceForCurrentPage();
}

export {
  getCurrentThreadlinePage,
  getDefaultWorkspaceForCurrentPage,
  isWorkspaceAllowedOnCurrentPage,
  normalizeWorkspaceForCurrentPage,
};

/**
 * Owns shared appearance storage, URL handoff and settings presentation.
 * @param {object} elements - Body and optional appearance controls.
 * @param {object} options - State, storage, translation, URL and layout adapters.
 * @returns {object} Appearance lifecycle controller.
 */
export function createAppearanceController(elements, options) {
  /** Reads normalized preferences and distinguishes missing values. @returns {object} Cached preferences. */
  function read() {
    const result = { themeMode: "light", compactMode: false, hasThemeMode: false, hasCompactMode: false };
    try {
      const storage = options.storage();
      const theme = options.read(storage, options.themeKey);
      const density = options.read(storage, options.densityKey);
      result.hasThemeMode = theme === "dark" || theme === "light";
      result.hasCompactMode = density === "true" || density === "false";
      if (theme === "dark") { result.themeMode = "dark"; }
      if (density === "true") { result.compactMode = true; }
    } catch {
      // Storage getters can fail before the safe storage adapter is called.
    }
    return result;
  }
  /** Immediately caches the current shared appearance. @returns {void} */
  function persist() {
    try {
      const state = options.getState();
      let density = "false";
      if (state.compactMode === true) { density = "true"; }
      const storage = options.storage();
      options.write(storage, options.themeKey, state.themeMode);
      options.write(storage, options.densityKey, density);
    } catch {
      // Restricted contexts must still render the application.
    }
  }
  /** Restores cached appearance before asynchronous hydration. @returns {void} */
  function restore() {
    const stored = read();
    options.setState({ themeMode: stored.themeMode, compactMode: stored.compactMode });
  }
  /** Refreshes translated labels without changing preferences. @returns {void} */
  function renderControls() {
    const state = options.getState();
    let themeNote = "themeLightActive";
    let themeButton = "darkModeButton";
    let densityNote = "compactModeInactive";
    let densityButton = "compactModeButton";
    if (state.themeMode === "dark") { themeNote = "themeDarkActive"; themeButton = "lightModeButton"; }
    if (state.compactMode === true) { densityNote = "compactModeActive"; densityButton = "normalModeButton"; }
    if (elements.themeNote) { elements.themeNote.textContent = options.t(themeNote); }
    if (elements.themeButton) { elements.themeButton.textContent = options.t(themeButton); }
    if (elements.densityNote) { elements.densityNote.textContent = options.t(densityNote); }
    elements.densityButtons.forEach((button, index) => {
      button.hidden = index !== elements.densityButtons.length - 1;
      button.textContent = options.t(densityButton);
    });
  }
  /** Applies the current theme and saves it immediately. @returns {void} */
  function applyTheme() {
    elements.body.classList.toggle("theme-dark", options.getState().themeMode === "dark");
    persist();
    renderControls();
  }
  /** Applies density and refreshes dependent desktop geometry. @returns {void} */
  function applyDensity() {
    elements.body.classList.toggle("ui-density-compact", options.getState().compactMode === true);
    persist();
    options.applyLayout();
    renderControls();
  }
  /** Synchronizes only present cache values before rendering either change. @returns {void} */
  function sync() {
    const stored = read();
    const state = options.getState();
    const themeChanged = stored.hasThemeMode && state.themeMode !== stored.themeMode;
    const densityChanged = stored.hasCompactMode && state.compactMode !== stored.compactMode;
    const patch = {};
    if (themeChanged) { patch.themeMode = stored.themeMode; }
    if (densityChanged) { patch.compactMode = stored.compactMode; }
    options.setState(patch);
    if (themeChanged) { applyTheme(); }
    if (densityChanged) { applyDensity(); }
  }
  /** Consumes valid appearance query values while retaining unrelated parameters. @returns {boolean} Whether values were applied. */
  function applyUrl() {
    const url = new URL(options.href());
    const theme = String(url.searchParams.get("_theme") || "").trim();
    const density = String(url.searchParams.get("_density") || "").trim();
    const patch = {};
    if (theme === "light" || theme === "dark") { patch.themeMode = theme; }
    if (density === "compact") { patch.compactMode = true; }
    else if (density === "normal") { patch.compactMode = false; }
    if (Object.keys(patch).length === 0) { return false; }
    options.setState(patch);
    persist();
    url.searchParams.delete("_theme");
    url.searchParams.delete("_density");
    options.replaceUrl(url.toString());
    return true;
  }
  /** Builds a cross-page URL with current appearance. @param {string} href - Target link. @returns {string} Absolute URL. */
  function buildUrl(href) {
    const url = new URL(String(href || ""), options.href());
    const state = options.getState();
    let density = "normal";
    if (state.compactMode === true) { density = "compact"; }
    url.searchParams.set("_theme", state.themeMode);
    url.searchParams.set("_density", density);
    return url.toString();
  }
  return { read, persist, restore, renderControls, applyTheme, applyDensity, sync, applyUrl, buildUrl };
}

/** Detects iOS including touch-capable iPads reporting a Mac platform. @param {object} navigator - Device information. @returns {boolean} iOS installation instructions apply. */
export function isIosDevice(navigator) {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Owns deferred PWA installation prompts and install-control visibility.
 * @param {object} elements - Install button and iOS instruction dialog.
 * @param {object} options - Device/display-mode checks and error reporter.
 * @returns {object} Installation operation and lifecycle handlers.
 */
export function createApplicationInstallController(elements, options) {
  let prompt = null;
  /** Refreshes availability outside standalone mode. @returns {void} */
  function render() { elements.button.hidden = options.isStandalone() || (!prompt && !options.isIos()); }
  /** Captures the browser's deferred install request. @param {Event} event - Install event. @returns {void} */
  function beforePrompt(event) { event.preventDefault(); prompt = event; render(); }
  /** Clears a consumed prompt after installation. @returns {void} */
  function installed() { prompt = null; render(); }
  /** Opens iOS instructions or consumes the captured prompt. @returns {Promise<void>} User-choice completion. */
  async function install() {
    if (options.isIos()) { elements.dialog.showModal(); return; }
    if (!prompt) { render(); return; }
    prompt.prompt();
    try { await prompt.userChoice; }
    catch (error) { options.report(error); }
    prompt = null; render();
  }
  return { render, beforePrompt, installed, install };
}

/** Owns native recommendation/file sharing, clipboard fallback and transient status timers.
 * @param {object} adapters - navigator, document, URL, schedule/clearTimer, translate, title/url and optional status node.
 * @returns {object} Frozen status, recommend, file and copy operations.
 */
export function createApplicationShareController(adapters) {
  for (const key of ['schedule','clearTimer','translate']) { if (typeof adapters?.[key] !== 'function') { throw new TypeError('Application share requires ' + key); } }
  const { navigator, document, URL, schedule, clearTimer, translate: t, title: APP_SHARE_TITLE, url: APP_SHARE_URL, status: shareStatus } = adapters;
  let shareStatusTimer = null;
  /** Updates transient share feedback and its cleanup timer. @param {string} message - Feedback. @param {string} tone - Semantic tone. @returns {void} Updated status. */
  function setShareStatus(message, tone = "neutral") {
    if (!shareStatus) {
      return;
    }
    clearTimer(shareStatusTimer);
    shareStatus.textContent = message;
    shareStatus.hidden = !message;
    if (message) {
      shareStatus.dataset.tone = tone;
    } else {
      delete shareStatus.dataset.tone;
    }
    if (message) {
      shareStatusTimer = schedule(() => {
        shareStatus.hidden = true;
        shareStatus.textContent = "";
        delete shareStatus.dataset.tone;
      }, 5000);
    }
  }

  /** Opens native recommendation sharing or copies its text. @returns {Promise<void>} Handoff or reported failure. */
  async function shareAppRecommendation() {
    const payload = {
      title: APP_SHARE_TITLE,
      text: t("shareAppText"),
      url: APP_SHARE_URL,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      const shareText = `${payload.text}\n${payload.url}`;
      await copyTextToClipboard(shareText);
      setShareStatus(t("shareCopied"));
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      setShareStatus(t("shareUnavailable"), "error");
    }
  }

  /** Shares a file or performs its download fallback. @param {File} file - File data. @param {string} fallbackName - Download name. @param {object} options - preferDownload flag. @returns {Promise<void>} Handoff completion. */
  async function shareOrDownloadFile(file, fallbackName, options = {}) {
    const preferDownload = options.preferDownload === true;
    if (!preferDownload && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: fallbackName,
          files: [file],
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackName;
    link.click();
    schedule(() => URL.revokeObjectURL(url), 1000);
  }

  /** Copies literal text through native clipboard or DOM fallback. @param {string} text - Content. @returns {Promise<void>} Copy completion. */
  async function copyTextToClipboard(text) {
    const value = String(text || "");
    if (!value) {
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    helper.style.pointerEvents = "none";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  return Object.freeze({ status: setShareStatus, recommend: shareAppRecommendation, file: shareOrDownloadFile, copy: copyTextToClipboard });
}

/** Renders workspace navigation from current auth/access state and supplied control records.
 * @param {object} state - authenticated, workspace and dmAvailable values.
 * @param {object} controls - addAccount/publish/ownSearch nodes, publishLabel callback and workspaces records.
 * @param {Function} translate - Current translation function.
 * @returns {void} Updated disabled, pressed and translated navigation state.
 */
export function renderApplicationNavigation(state, controls, translate) {
  controls.addAccount.textContent = translate("addAccountButton");
  controls.publish.textContent = controls.publishLabel();
  if (controls.ownSearch) { controls.ownSearch.disabled = !state.authenticated; }
  for (const entry of controls.workspaces) {
    entry.button.disabled = entry.requiresAuth && !state.authenticated;
    if (entry.name === "dm" && !state.dmAvailable) { entry.button.disabled = true; }
    const active = state.workspace === entry.name;
    entry.button.classList.toggle("is-active", active);
    let pressed = "false";
    if (active) { pressed = "true"; }
    entry.button.setAttribute("aria-pressed", pressed);
    let key = entry.name + "LaunchDisabledNote";
    if (state.authenticated) { key = entry.name + "LaunchEnabledNote"; }
    if (entry.name === "composer") { key = "composerLaunchNote"; }
    entry.note.textContent = translate(key);
  }
}
