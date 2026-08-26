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
