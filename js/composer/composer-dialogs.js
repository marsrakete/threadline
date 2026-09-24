/**
 * Normalizes a persisted Composer reply target.
 * @param {object|null} target - Raw reply target.
 * @param {(text: string) => string} previewBuilder - Text preview normalizer.
 * @returns {object|null} Safe reply target or null when required references are missing.
 */
export function normalizeComposerReplyTarget(target = null, previewBuilder = (text) => String(text || "")) {
  if (!target || typeof target !== "object") {
    return null;
  }
  const replyRootUri = String(target.replyRoot?.uri || "").trim();
  const replyRootCid = String(target.replyRoot?.cid || "").trim();
  const replyParentUri = String(target.replyParent?.uri || "").trim();
  const replyParentCid = String(target.replyParent?.cid || "").trim();
  if (!replyRootUri || !replyRootCid || !replyParentUri || !replyParentCid) {
    return null;
  }
  const normalizePost = (post) => ({
    uri: String(post?.uri || "").trim(),
    cid: String(post?.cid || "").trim(),
    text: previewBuilder(post?.text || ""),
    createdAt: String(post?.createdAt || "").trim(),
  });
  const normalizeAccount = (account) => ({
    did: String(account?.did || "").trim(),
    handle: String(account?.handle || "").trim(),
    displayName: String(account?.displayName || "").trim(),
    avatar: String(account?.avatar || "").trim(),
  });
  let lastOwnPost = null;
  if (target.lastOwnPost && typeof target.lastOwnPost === "object") {
    lastOwnPost = normalizePost(target.lastOwnPost);
  }
  return {
    mode: target.mode === "thread" ? "thread" : "post",
    sourceUrl: String(target.sourceUrl || "").trim(),
    threadLength: Math.max(1, Number(target.threadLength) || 1),
    replyHint: String(target.replyHint || "").trim(),
    targetPost: normalizePost(target.targetPost),
    rootPost: normalizePost(target.rootPost),
    targetAccount: normalizeAccount(target.targetAccount),
    rootAccount: normalizeAccount(target.rootAccount),
    lastOwnPost,
    replyRoot: { uri: replyRootUri, cid: replyRootCid },
    replyParent: { uri: replyParentUri, cid: replyParentCid },
  };
}

/**
 * Converts a post reply target into a continuation of the user's own thread.
 * @param {object|null} target - Normalized reply target.
 * @returns {object|null} Continuation target or the original target.
 */
export function buildComposerThreadContinuationTarget(target = null) {
  if (!target?.lastOwnPost?.uri || !target?.lastOwnPost?.cid) {
    return target;
  }
  return {
    ...target,
    mode: "thread",
    replyParent: { uri: target.lastOwnPost.uri, cid: target.lastOwnPost.cid },
  };
}
/**
 * Binds Composer dialog controls through explicit page callbacks.
 * @param {object} elements - Composer dialog and control elements.
 * @param {object} handlers - Dialog action callbacks supplied by the page entry point.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerDialogEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.unlockButton, "click", handlers.unlock);
  bind(elements.postedDismissButton, "click", handlers.postedDismiss);
  bind(elements.postSettingsButton, "click", handlers.postSettings);
  bind(elements.searchLanguageButton, "click", handlers.searchLanguage);
  bind(elements.replyTargetButton, "click", handlers.replyTargetOpen);
  bind(elements.replyTargetClearButton, "click", handlers.replyTargetClear);
  bind(elements.replyTargetCloseTop, "click", handlers.replyTargetClose);
  bind(elements.replyTargetCloseButton, "click", handlers.replyTargetClose);
  bind(elements.replyTargetSubmitButton, "click", handlers.replyTargetSubmit);
  bind(elements.replyTargetUrlInput, "keydown", handlers.replyTargetKeydown);
  bind(elements.replyTargetDialog, "cancel", handlers.replyTargetCancel);
  bind(elements.postLanguagesSearch, "input", handlers.languagesSearch);
  bind(elements.postLanguagesDisclosure, "toggle", handlers.languagesToggle);
  bind(elements.postLanguagesCloseTop, "click", handlers.languagesClose);
  bind(elements.postLanguagesCloseButton, "click", handlers.languagesClose);
  bind(elements.helpButton, "click", handlers.help);
  return boundCount;
}
