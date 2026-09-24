/**
 * Opens the Composer workspace or starts the required page navigation.
 * @param {object} options - Composer display options.
 * @param {boolean} [options.persist=true] - Whether the selected workspace should be persisted.
 * @param {boolean} [options.redirectPage=false] - Whether tools-page callers may navigate to the Composer page.
 * @param {object} actions - Page-specific integration callbacks and identifiers.
 * @param {string} actions.currentPage - Currently active Threadline page identifier.
 * @param {string} actions.toolsPage - Tools page identifier.
 * @param {string} actions.composerPage - Composer page identifier.
 * @param {(page: string) => boolean} actions.navigateToPage - Starts page navigation when required.
 * @param {(workspace: string) => void} actions.setCurrentWorkspace - Stores the active workspace in page state.
 * @param {() => void} actions.applyFullscreenState - Synchronizes the Thread Explorer fullscreen state.
 * @param {(workspace: string) => void} actions.persistWorkspace - Persists the selected workspace.
 * @param {(workspace: string) => void} actions.setVisibleWorkspace - Shows the selected workspace container.
 * @param {() => void} actions.applyHashtagPaneContext - Synchronizes Composer hashtag controls.
 * @param {() => void} actions.updateAuthButtons - Refreshes the authentication-dependent controls.
 * @returns {{opened: boolean, navigated: boolean}} Whether the workspace opened locally or navigation started.
 */
export function openComposerWorkspace(options = {}, actions = {}) {
  const shouldRedirectPage = options.redirectPage === true;
  if (actions.currentPage === actions.toolsPage && !shouldRedirectPage) {
    return { opened: false, navigated: false };
  }

  if (actions.navigateToPage(actions.composerPage)) {
    return { opened: false, navigated: true };
  }

  actions.setCurrentWorkspace("composer");
  actions.applyFullscreenState();
  if (options.persist !== false) {
    actions.persistWorkspace("composer");
  }
  actions.setVisibleWorkspace("composer");
  actions.applyHashtagPaneContext();
  actions.updateAuthButtons();
  return { opened: true, navigated: false };
}

/**
 * Binds the Composer text, formatting, and reply-setting controls.
 * @param {object} elements - Composer input and option controls.
 * @param {object} handlers - Event callbacks supplied by the page entry point.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerCoreEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.sourceText, "input", handlers.sourceInput);
  bind(elements.sourceText, "beforeinput", handlers.sourceBeforeInput);
  bind(elements.sourceText, "paste", handlers.sourcePaste);
  bind(elements.counterToggle, "change", handlers.counterChange);
  bind(elements.threadIntroToggle, "change", handlers.threadIntroChange);
  bind(elements.threadEmojiToggle, "change", handlers.threadEmojiChange);
  bind(elements.markerSpacingToggle, "change", handlers.markerSpacingChange);
  if (Array.isArray(elements.replyModeInputs)) {
    elements.replyModeInputs.forEach((input) => bind(input, "change", handlers.replyModeChange));
  }
  bind(elements.replyAllowFollowersInput, "change", handlers.replyAllowFollowersChange);
  bind(elements.replyAllowFollowingInput, "change", handlers.replyAllowFollowingChange);
  bind(elements.replyAllowMentionedInput, "change", handlers.replyAllowMentionedChange);
  bind(elements.quotePostsToggle, "change", handlers.quotePostsChange);
  return boundCount;
}
