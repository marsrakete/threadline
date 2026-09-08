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
