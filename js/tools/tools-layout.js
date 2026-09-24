/**
 * Lists the workspace identifiers available on the tools page.
 * @type {readonly string[]}
 */
export const TOOL_WORKSPACE_IDS = Object.freeze([
  "archive",
  "search",
  "network",
  "threadExplorer",
  "analysis",
  "dm",
]);

/**
 * Creates the ordered workspace-to-element mapping used by the tools layout.
 * @param {object} elements - DOM elements keyed by workspace identifier.
 * @returns {Array<[string, HTMLElement|null|undefined]>} Workspace identifiers and their containers.
 */
export function getToolsWorkspaceEntries(elements = {}) {
  return TOOL_WORKSPACE_IDS.map((workspace) => {
    return [workspace, elements[workspace]];
  });
}
/**
 * Binds top-level Tools workspace navigation buttons.
 * @param {object} elements - Workspace navigation buttons.
 * @param {object} actions - Workspace opener callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindToolsWorkspaceNavigationEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener("click", handler);
    boundCount += 1;
  };
  bind(elements.analysisButton, actions.analysisClick);
  bind(elements.dmButton, actions.dmClick);
  return boundCount;
}
