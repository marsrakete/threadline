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
