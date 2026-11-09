const THREADLINE_PAGE_COMPOSER = "composer";
const THREADLINE_PAGE_TOOLS = "tools";

/**
 * Normalizes one requested Threadline page identifier.
 * @param {string} page - Raw page identifier from DOM state or navigation.
 * @returns {string} Supported page identifier.
 */
function normalizeThreadlinePage(page) {
  const normalizedPage = String(page || "").trim();
  if (normalizedPage === THREADLINE_PAGE_TOOLS) {
    return THREADLINE_PAGE_TOOLS;
  }

  return THREADLINE_PAGE_COMPOSER;
}

/**
 * Builds the relative href for one Threadline page.
 * @param {string} page - Requested page identifier.
 * @returns {string} Relative target href for the page switch.
 */
function getThreadlinePageHref(page) {
  const normalizedPage = normalizeThreadlinePage(page);
  if (normalizedPage === THREADLINE_PAGE_TOOLS) {
    return "./tools.html";
  }

  return "./";
}

/**
 * Navigates to the requested Threadline page when the current page does not already match.
 * @param {string} page - Desired page identifier.
 * @returns {boolean} True when navigation was started.
 */
function navigateToThreadlinePage(page) {
  const normalizedTargetPage = normalizeThreadlinePage(page);
  let normalizedCurrentPage = THREADLINE_PAGE_COMPOSER;
  if (document.body) {
    normalizedCurrentPage = normalizeThreadlinePage(document.body.dataset.page);
  }

  if (normalizedCurrentPage === normalizedTargetPage) {
    return false;
  }

  window.location.href = getThreadlinePageHref(normalizedTargetPage);
  return true;
}

export {
  THREADLINE_PAGE_COMPOSER,
  THREADLINE_PAGE_TOOLS,
  getThreadlinePageHref,
  navigateToThreadlinePage,
  normalizeThreadlinePage,
};

/**
 * Preserves intended page navigation across service-worker reloads.
 * @param {object} options - Session storage, safe access, key and current URL adapters.
 * @returns {object} Pending navigation lifecycle.
 */
export function createPendingNavigationController(options) {
  /** Reads the pending target safely. @returns {string} Target or empty string. */
  function read() {
    try { return options.read(options.storage(), options.key); }
    catch { return ""; }
  }
  /** Saves an intended target. @param {string} url - Absolute destination. @returns {void} */
  function persist(url) {
    try { options.write(options.storage(), options.key, url); }
    catch { /* Session storage is optional in restricted contexts. */ }
  }
  /** Removes a pending target before leaving the shell. @returns {void} */
  function clear() {
    try { options.remove(options.storage(), options.key); }
    catch { /* Session storage is optional in restricted contexts. */ }
  }
  /** Reads and removes the pending target. @returns {string} Previous destination. */
  function consume() { const target = read(); clear(); return target; }
  /** Clears an already reached path regardless of query parameters. @returns {void} */
  function clearMatching() {
    const target = read();
    if (!target) { return; }
    try {
      const current = new URL(options.href());
      if (current.pathname === new URL(target, current).pathname) { clear(); }
    } catch { /* Malformed targets must not interrupt initialization. */ }
  }
  return { read, persist, clear, consume, clearMatching };
}
