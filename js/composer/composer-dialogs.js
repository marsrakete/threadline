/**
 * Creates the ALT-text dialog lifecycle and save workflow with private target state.
 * @param {object} elements - Dialog, input, counter, preview wrapper and canvas.
 * @param {object} options - Image reader, preview geometry/renderer, scheduling and storage/UI callbacks.
 * @returns {object} Open, close, count and async save operations.
 */
export function createComposerAltTextDialogController(elements, options) {
  let target = null;
  /**
   * Updates the existing UTF-16 ALT-text length counter.
   * @returns {void}
   */
  function count() {
    elements.count.textContent = `${elements.input.value.length}/${options.maxLength}`;
  }
  /**
   * Opens an image's ALT text and renders the optional image preview.
   * @param {number} segmentIndex - Image segment.
   * @param {number} imageIndex - Image index.
   * @returns {void}
   */
  function open(segmentIndex, imageIndex) {
    const image = options.getImage(segmentIndex, imageIndex);
    if (!image) {
      return;
    }
    target = { segmentIndex, imageIndex };
    elements.previewWrap.hidden = !image.dataUrl;
    if (image.dataUrl) {
      const frame = options.getPreviewFrame(image);
      const portrait = frame.height > frame.width;
      let maxWidth = 320;
      let maxHeight = 220;
      if (portrait) {
        maxWidth = 220;
        maxHeight = 300;
      }
      const box = options.getContainedBox(frame.width, frame.height, maxWidth, maxHeight);
      elements.previewWrap.classList.toggle("is-portrait", portrait);
      elements.canvas.style.width = `${box.width}px`;
      elements.canvas.style.height = `${box.height}px`;
      elements.canvas.style.aspectRatio = `${frame.width} / ${frame.height}`;
      void options.renderCanvas(image, elements.canvas, { cssWidth: box.width, cssHeight: box.height });
    }
    elements.input.value = image.alt || "";
    count();
    elements.dialog.showModal();
    options.defer(() => elements.input.focus());
  }
  /**
   * Clears the edit target, Canvas content and preview geometry, then closes the dialog.
   * @returns {void}
   */
  function close() {
    target = null;
    elements.previewWrap.hidden = true;
    elements.previewWrap.classList.remove("is-portrait");
    const context = elements.canvas.getContext("2d");
    context?.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    elements.canvas.style.removeProperty("width");
    elements.canvas.style.removeProperty("height");
    elements.canvas.style.removeProperty("aspect-ratio");
    elements.dialog.close();
  }
  /**
   * Persists the length-limited ALT text before updating the card, publish state and draft.
   * @returns {Promise<void>}
   */
  async function save() {
    if (!target) {
      close();
      return;
    }
    const { segmentIndex, imageIndex } = target;
    const image = options.getImage(segmentIndex, imageIndex);
    if (!image) {
      close();
      return;
    }
    image.alt = elements.input.value.slice(0, options.maxLength);
    await options.persist();
    options.updateCard(segmentIndex, imageIndex);
    options.updatePublish();
    options.saveDraft();
    close();
  }
  return { open, close, count, save };
}

/**
 * Builds a reply target from a normalized live post without a network request.
 * @param {object|null} post - Live search or Thread Explorer post.
 * @param {object} options - Web URL builder and reply target normalizer.
 * @returns {object|null} Normalized target or null when strong references are missing.
 */
export function buildComposerReplyTargetFromPost(post, options) {
  const uri = String(post?.uri || "").trim();
  const cid = String(post?.cid || "").trim();
  if (!uri || !cid) {
    return null;
  }
  let rootUri = uri;
  let rootCid = cid;
  if (post.reply && typeof post.reply === "object") {
    const candidateUri = String(post.reply.root?.uri || "").trim();
    const candidateCid = String(post.reply.root?.cid || "").trim();
    if (candidateUri && candidateCid) {
      rootUri = candidateUri;
      rootCid = candidateCid;
    }
  }
  return options.normalize({
    mode: "post", sourceUrl: options.buildWebUrl(post) || "", threadLength: 1, replyHint: "",
    targetPost: { uri, cid, text: String(post.text || "").trim(), createdAt: String(post.createdAt || post.indexedAt || "").trim() },
    rootPost: { uri: rootUri, cid: rootCid, text: "", createdAt: "" },
    targetAccount: {
      did: String(post.author?.did || "").trim(), handle: String(post.author?.handle || "").trim(),
      displayName: String(post.author?.displayName || "").trim(), avatar: String(post.author?.avatar || "").trim(),
    },
    rootAccount: { did: "", handle: "", displayName: "", avatar: "" }, lastOwnPost: null,
    replyRoot: { uri: rootUri, cid: rootCid }, replyParent: { uri, cid },
  });
}

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
 * Gets the name of the account represented by a normalized reply target.
 * @param {object|null} target - Normalized reply target.
 * @returns {string} Display name, handle or DID, or empty text.
 */
export function getComposerReplyTargetDisplayName(target) {
  if (!target) {
    return "";
  }
  let actor = target.targetAccount;
  if (target.mode === "thread") {
    actor = target.rootAccount;
  }
  return actor.displayName || actor.handle || actor.did || "";
}

/**
 * Checks whether an own-thread target offers the continuation/reply choice.
 * @param {object|null} target - Normalized reply target.
 * @param {string} accountDid - Currently authenticated account DID.
 * @returns {boolean} True when a continuation target is available.
 */
export function isComposerOwnThreadReplyTarget(target, accountDid) {
  if (!target || target.mode !== "post") {
    return false;
  }
  return Boolean(accountDid && target.rootAccount?.did === accountDid && target.lastOwnPost?.uri && target.lastOwnPost?.cid);
}

/**
 * Renders a normalized reply target into the existing HTML preview structure.
 * @param {object|null} target - Normalized target; null hides the card.
 * @param {object} elements - Card, eyebrow, avatar, name, handle, meta, warning and text nodes.
 * @param {object} options - Counter state, translations and avatar rendering callback.
 * @returns {void}
 */
export function renderComposerReplyTargetCard(target, elements, options) {
  if (!elements.card) {
    return;
  }
  elements.card.hidden = !target;
  if (!target) {
    return;
  }
  let actor = target.targetAccount;
  let eyebrow = options.translate("replyTargetPostCardEyebrow");
  let meta = options.translate("replyTargetPostMeta");
  let text = target.targetPost.text || "";
  if (target.mode === "thread") {
    actor = target.rootAccount;
    eyebrow = options.translate("replyTargetThreadCardEyebrow");
    meta = options.translate("replyTargetThreadMeta", { count: target.threadLength });
    text = target.rootPost?.text || text;
  }
  const name = getComposerReplyTargetDisplayName(target);
  elements.eyebrow.textContent = eyebrow;
  options.setAvatar(elements.avatar, actor.avatar, name);
  elements.name.textContent = name;
  elements.handle.textContent = "";
  if (actor.handle) {
    elements.handle.textContent = `@${actor.handle}`;
  }
  if (target.replyHint) {
    meta = `${meta} ${target.replyHint}`;
  }
  elements.meta.textContent = meta;
  if (elements.warning) {
    const show = target.mode === "thread" && options.withCounters;
    elements.warning.hidden = !show;
    if (show) {
      elements.warning.textContent = options.translate("publishThreadContinuationCounterWarning");
      elements.warning.style.display = "block";
    } else {
      elements.warning.textContent = "";
      elements.warning.style.display = "none";
    }
  }
  elements.text.textContent = text;
}

/**
 * Creates reply-target dialog status, lifecycle and submission operations.
 * @param {object} elements - Dialog, URL input, status and submit nodes.
 * @param {object} options - Translations, target resolver, busy/status and error callbacks.
 * @returns {object} Status, reset, open, close and async submit actions.
 */
export function createComposerReplyTargetDialogController(elements, options) {
  /**
   * Shows or clears plain-text status and its optional tone.
   * @param {string} message - Status text; empty text hides it.
   * @param {string} tone - Optional visual tone.
   * @returns {void}
   */
  function status(message = "", tone = "") {
    if (!elements.status) { return; }
    elements.status.textContent = message;
    elements.status.hidden = !message;
    if (tone) { elements.status.dataset.tone = tone; }
    else { delete elements.status.dataset.tone; }
  }
  /**
   * Clears the URL and status without closing the dialog.
   * @returns {void}
   */
  function reset() {
    if (elements.input) { elements.input.value = ""; }
    status("");
  }
  /**
   * Opens the dialog with a trimmed preset URL.
   * @param {string} presetUrl - Optional preset URL.
   * @returns {void}
   */
  function open(presetUrl = "") {
    if (!elements.dialog) { return; }
    elements.input.value = String(presetUrl || "").trim();
    status("");
    elements.dialog.showModal();
  }
  /**
   * Closes the existing dialog when available.
   * @returns {void}
   */
  function close() { elements.dialog?.close(); }
  /**
   * Resolves a URL, reports readiness/errors and always restores the busy button.
   * @returns {Promise<void>}
   */
  async function submit() {
    const url = String(elements.input?.value || "").trim();
    if (!url) {
      status(options.translate("replyTargetUrlMissing"), "error");
      return;
    }
    try {
      options.setBusy(elements.submit, true, options.translate("replyTargetDialogCheckingButton"), options.translate("replyTargetDialogConfirmButton"));
      status(options.translate("replyTargetChecking"));
      const target = await options.resolve(url, "post");
      if (!target) { status(""); return; }
      let key = "replyTargetPostReady";
      if (target.mode === "thread") { key = "replyTargetThreadReady"; }
      options.setStatus(options.translate(key));
      close();
    } catch (error) {
      options.reportError(error);
      status(error.message || options.translate("replyTargetResolveFailed"), "error");
    } finally {
      options.setBusy(elements.submit, false, options.translate("replyTargetDialogCheckingButton"), options.translate("replyTargetDialogConfirmButton"));
    }
  }
  return { status, reset, open, close, submit };
}

/**
 * Creates reply-target resolution/clearing workflows with private request-version state.
 * @param {object} options - Request, normalization, account/state, confirmation and UI dependencies.
 * @returns {{resolve:Function,clear:Function}} Async resolution and explicit reset actions.
 */
export function createComposerReplyTargetController(options) {
  let version = 0;
  /**
   * Invalidates pending requests and clears the current target and optional UI.
   * @param {object} flags - Optional render flag; false skips preview/publish refresh.
   * @returns {void}
   */
  function clear({ render = true } = {}) {
    version += 1;
    options.setTarget(null);
    options.persistPending(null);
    options.resetDialog();
    if (render) { options.refresh(); }
  }
  /**
   * Resolves a post/thread, offers own-thread continuation and ignores stale results.
   * @param {string} url - Posting URL.
   * @param {string} mode - Requested target mode.
   * @returns {Promise<object|null>} Committed target, or null when dismissed/superseded.
   */
  async function resolve(url, mode = "post") {
    const token = ++version;
    const target = options.normalize(await options.request(url, mode));
    if (token !== version) { return null; }
    let next = target;
    if (isComposerOwnThreadReplyTarget(target, options.getAccountDid())) {
      let message = options.translate("replyTargetOwnThreadChoiceMiddleText");
      if (target.targetPost?.uri && target.targetPost.uri === target.rootPost?.uri) {
        message = options.translate("replyTargetOwnThreadChoiceRootText");
      }
      const choice = await options.confirm({
        title: options.translate("replyTargetOwnThreadChoiceTitle"), message,
        confirmLabel: options.translate("publishButtonThreadContinuation"), cancelLabel: options.translate("publishButtonReplyTarget"),
        confirmValue: "thread", cancelValue: "post", dismissValue: null,
        preview: { avatar: target.rootAccount.avatar, name: getComposerReplyTargetDisplayName(target), handle: target.rootAccount.handle },
      });
      if (choice === null || token !== version) { return null; }
      if (choice === "thread") { next = buildComposerThreadContinuationTarget(target); }
    }
    if (token !== version) { return null; }
    options.setTarget(next);
    options.refresh();
    options.saveDraft();
    return options.getTarget();
  }
  return { resolve, clear };
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
  bind(elements.postLanguagesDialog, "close", handlers.languagesDialogClose);
  bind(elements.helpButton, "click", handlers.help);
  return boundCount;
}

/**
 * Binds Composer Link-Card and mention-search dialog controls.
 * @param {object} elements - Link-Card and mention dialog elements.
 * @param {object} handlers - Explicit callbacks for dialog actions and searches.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerContentDialogEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.linkCardCreateButton, "click", handlers.linkCardCreate);
  bind(elements.linkCardCancelButton, "click", handlers.linkCardClose);
  bind(elements.linkCardCloseTop, "click", handlers.linkCardClose);
  bind(elements.linkCardUrlInput, "input", handlers.linkCardInput);
  bind(elements.linkCardUrlInput, "keydown", handlers.linkCardKeydown);
  bind(elements.mentionSearchCloseTop, "click", handlers.mentionClose);
  bind(elements.mentionSearchCloseButton, "click", handlers.mentionClose);
  bind(elements.mentionSearchInput, "input", handlers.mentionInput);
  bind(elements.mentionSearchInput, "keydown", handlers.mentionKeydown);
  bind(elements.mentionSearchDialog, "cancel", handlers.mentionCancel);
  bind(elements.mentionSearchDialog, "close", handlers.mentionDialogClose);
  return boundCount;
}

/**
 * Binds one dynamically rendered post-language option.
 * @param {HTMLInputElement|null} input - Language checkbox input.
 * @param {Function} handler - Change callback for the option.
 * @returns {boolean} True when the listener was bound.
 */
export function bindComposerLanguageOptionEvent(input, handler) {
  if (!input || typeof handler !== "function") {
    return false;
  }
  input.addEventListener("change", handler);
  return true;
}
