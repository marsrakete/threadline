/**
 * Creates URL and session-storage transport for Composer reply targets.
 * @param {object} options - Normalizer, storage/location/history callbacks and transport keys.
 * @returns {object} Encode, URL consumption, persistence and storage consumption operations.
 */
export function createComposerReplyHandoff(options) {
  /**
   * Encodes a normalized reply target for URL transport.
   * @param {object|null} target - Raw reply target.
   * @returns {string} Encoded JSON or empty text.
   */
  function encode(target) {
    const normalized = options.normalize(target);
    if (!normalized) {
      return "";
    }
    try {
      return encodeURIComponent(JSON.stringify(normalized));
    } catch {
      return "";
    }
  }
  /**
   * Consumes the URL payload and removes its query parameter, even if malformed.
   * @returns {object|null} Normalized target or null.
   */
  function consumeUrl() {
    const url = new URL(options.getHref());
    const raw = String(url.searchParams.get(options.queryKey) || "").trim();
    if (!raw) {
      return null;
    }
    let target = null;
    try {
      target = options.normalize(JSON.parse(decodeURIComponent(raw)));
    } catch {
      target = null;
    }
    url.searchParams.delete(options.queryKey);
    options.replaceUrl(url.toString());
    return target;
  }
  /**
   * Stores a target or removes the pending target when invalid.
   * @param {object|null} target - Raw reply target.
   * @returns {void}
   */
  function persist(target) {
    const normalized = options.normalize(target);
    try {
      const storage = options.getStorage();
      if (!normalized) {
        storage.removeItem(options.storageKey);
        return;
      }
      storage.setItem(options.storageKey, JSON.stringify(normalized));
    } catch {
      // URL transport remains available when session storage is restricted.
    }
  }
  /**
   * Reads the pending session target without removing it.
   * @returns {object|null} Normalized target or null.
   */
  function read() {
    try {
      const raw = String(options.getStorage().getItem(options.storageKey) || "").trim();
      if (!raw) {
        return null;
      }
      return options.normalize(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  /**
   * Reads and removes the pending session target.
   * @returns {object|null} Normalized target or null.
   */
  function consumeStored() {
    const target = read();
    try {
      options.getStorage().removeItem(options.storageKey);
    } catch {
      // Restricted storage must not prevent Composer initialization.
    }
    return target;
  }
  return { encode, consumeUrl, persist, read, consumeStored };
}

/**
 * Opens a prepared reply locally or transfers it to the Composer page.
 * @param {object|null} target - Prepared reply target; null shows the existing error.
 * @param {object} actions - State, navigation, handoff and local UI callbacks.
 * @returns {void}
 */
export function openComposerReplyTarget(target, actions) {
  if (!target) {
    actions.showError();
    return;
  }
  actions.setTarget(target);
  if (!actions.isComposerPage()) {
    actions.persistTarget(target);
    const url = new URL(actions.getComposerUrl(), actions.getHref());
    const encoded = actions.encodeTarget(target);
    if (encoded) {
      url.searchParams.set(actions.queryKey, encoded);
    }
    const href = url.toString();
    actions.persistNavigation(href);
    actions.navigate(href);
    return;
  }
  actions.showWorkspace();
  actions.refresh();
  actions.saveDraft();
  actions.showReady();
}

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
  bind(elements.serverPresetField, "change", handlers.serverPresetChange);
  bind(elements.clearButton, "click", handlers.clearClick);
  return boundCount;
}

/**
 * Binds the Composer hashtag form and placement controls.
 * @param {object} elements - Hashtag form and placement select elements.
 * @param {object} handlers - Explicit hashtag submit and placement callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerHashtagEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  if (elements.form && typeof handlers.submit === "function") {
    elements.form.addEventListener("submit", handlers.submit);
    boundCount += 1;
  }
  if (elements.placementSelect && typeof handlers.placementChange === "function") {
    elements.placementSelect.addEventListener("change", handlers.placementChange);
    boundCount += 1;
  }
  return boundCount;
}

/**
 * Creates source-edit and selection-insertion workflows for the Composer.
 * @param {HTMLTextAreaElement} source - Composer input element.
 * @param {object} options - Grapheme helpers, limit, state callbacks, render scheduler and draft saver.
 * @returns {{process: Function, insert: Function}} Composer input operations.
 */
export function createComposerInputController(source, options) {
  /**
   * Clamps edited text and schedules Composer updates and persistence.
   * @param {boolean} showTruncationWarning - Whether truncation should show a warning.
   * @returns {void}
   */
  function process(showTruncationWarning = false) {
    const clamped = options.clamp(source.value, options.limit);
    if (clamped.truncated) {
      source.value = clamped.text;
    }
    const wasTruncated = showTruncationWarning && clamped.truncated;
    options.setTruncated(wasTruncated);
    options.updateWarning(wasTruncated);
    options.clearOverrides();
    options.setLocked(false);
    options.setPosted(false);
    options.scheduleRender(options.delayMs);
    options.saveDraft();
  }

  /**
   * Replaces the selected range with text constrained by its grapheme budget.
   * @param {string} insertedText - Text to insert at the current selection.
   * @param {boolean} showTruncationWarning - Whether shortening should show an alert.
   * @returns {void}
   */
  function insert(insertedText, showTruncationWarning = false) {
    const start = source.selectionStart ?? source.value.length;
    const end = source.selectionEnd ?? source.value.length;
    const prefix = source.value.slice(0, start);
    const suffix = source.value.slice(end);
    const budget = Math.max(0, options.limit - options.count(prefix) - options.count(suffix));
    const raw = String(insertedText || "");
    const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const graphemes = options.split(normalized);
    let text = normalized;
    let shortened = false;
    if (graphemes.length > budget) {
      text = graphemes.slice(0, budget).join("");
      shortened = true;
    } else if (normalized !== raw && graphemes.length >= budget) {
      shortened = true;
    }
    const warningPending = showTruncationWarning && shortened;
    if (warningPending) {
      options.showAlert();
    }
    options.setWarningPending(warningPending);
    options.suppressInput();
    source.setRangeText(text, start, end, "end");
    process(warningPending);
    options.setWarningPending(false);
  }

  return { process, insert };
}

/**
 * Creates input, paste and drop handlers using explicit state and input actions.
 * @param {object} options - Suppression/pending-state accessors and process/insert callbacks.
 * @returns {{input: Function, beforeInput: Function, paste: Function}} DOM event handlers.
 */
export function createComposerInputEventHandlers(options) {
  /**
   * Processes an input event unless a programmatic insertion suppressed it.
   * @returns {void}
   */
  function input() {
    if (options.isSuppressed()) {
      options.setSuppressed(false);
      return;
    }
    const pending = options.isWarningPending();
    options.setWarningPending(false);
    options.process(pending);
  }
  /**
   * Routes paste/drop beforeinput events through grapheme-safe insertion.
   * @param {InputEvent} event - Incoming beforeinput event.
   * @returns {void}
   */
  function beforeInput(event) {
    if (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromDrop") {
      return;
    }
    const text = event.dataTransfer?.getData("text/plain") || event.data || "";
    if (typeof text !== "string") {
      return;
    }
    event.preventDefault();
    options.insert(text, true);
  }
  /**
   * Routes plain clipboard text through grapheme-safe insertion.
   * @param {ClipboardEvent} event - Incoming paste event.
   * @returns {void}
   */
  function paste(event) {
    const text = event.clipboardData?.getData("text/plain");
    if (typeof text !== "string") {
      return;
    }
    event.preventDefault();
    options.insert(text, true);
  }
  return { input, beforeInput, paste };
}

/**
 * Creates localized input warnings and throttled truncation-dialog scheduling.
 * @param {object} options - Source/note nodes, count/locale/state accessors, limit, translations and timers.
 * @returns {{set: Function, update: Function, limitLabel: Function, alert: Function}} Warning operations.
 */
export function createComposerInputWarningController(options) {
  let lastAlertAt = 0;
  let dialogTimer = 0;
  /**
   * Shows a plain-text warning or clears the warning and its tone.
   * @param {string} message - Warning text; empty text hides the note.
   * @param {string} tone - Warning tone.
   * @returns {void}
   */
  function set(message = "", tone = "error") {
    if (!options.note) {
      return;
    }
    const text = String(message || "").trim();
    options.note.hidden = text.length === 0;
    options.note.textContent = text;
    if (text.length === 0) {
      delete options.note.dataset.tone;
      return;
    }
    options.note.dataset.tone = tone;
  }
  /**
   * Formats the Composer input limit for the current locale.
   * @returns {string} Localized limit.
   */
  function limitLabel() {
    return new Intl.NumberFormat(options.getLocale() || undefined).format(options.limit);
  }
  /**
   * Updates warnings for truncation or input exceeding the Composer limit.
   * @param {boolean} wasTruncated - Whether the latest operation truncated input.
   * @returns {void}
   */
  function update(wasTruncated = false) {
    const length = options.count(options.source.value);
    const count = limitLabel();
    if (wasTruncated || options.isTruncated()) {
      set(options.translate("composerTextTruncated", { count }), "error");
      return;
    }
    if (length > options.limit) {
      set(options.translate("composerTextTooLong", { count }), "error");
      return;
    }
    set("");
  }
  /**
   * Schedules a truncation dialog while suppressing alerts within 400ms.
   * @returns {void}
   */
  function alert() {
    const now = options.now();
    if ((now - lastAlertAt) < 400) {
      return;
    }
    lastAlertAt = now;
    const message = options.translate("composerTextTruncated", { count: limitLabel() });
    if (dialogTimer) {
      options.clearTimeout(dialogTimer);
    }
    dialogTimer = options.setTimeout(() => {
      dialogTimer = 0;
      options.showDialog(message, options.translate("composerTruncationTitle"));
    }, 0);
  }
  return { set, update, limitLabel, alert };
}
/**
 * Owns Composer locking, already-posted visibility and their reset actions.
 * @param {object} elements - Composer controls, hashtag controls and lock/posted notes.
 * @param {object} options - Explicit state access, hashtag context and cloud renderer.
 * @returns {object} State setters, render operations, unlock and posted-dismiss actions.
 */
export function createComposerUiStateController(elements, options) {
  /** Refreshes clear availability without changing document state. @returns {void} */
  function renderClear() {
    elements.clear.disabled = options.getState().locked || !elements.source.value.trim();
  }

  /** Applies lock state while leaving search/archive hashtag controls usable. @returns {void} */
  function renderLock() {
    const locked = options.getState().locked;
    const hashtagLocked = locked && !options.isArchiveContext() && !options.isSearchContext();
    for (const control of [elements.source, elements.counter, elements.intro, elements.emoji,
      elements.spacing, elements.settings]) { control.disabled = locked; }
    for (const control of [elements.hashtagInput, elements.hashtagAdd, elements.hashtagPlacement]) {
      control.disabled = hashtagLocked;
    }
    renderClear();
    elements.lockNote.hidden = !locked;
    elements.hashtagsPane?.classList.toggle("is-locked", hashtagLocked);
    options.renderHashtags();
  }

  /** Sets and presents locking. @param {boolean} locked - Desired state. @returns {void} */
  function setLocked(locked) { options.setState({ locked }); renderLock(); }

  /** Refreshes the already-posted note if present. @returns {void} */
  function renderPosted() {
    if (elements.postedNote) { elements.postedNote.hidden = !options.getState().posted; }
  }

  /** Sets and presents already-posted state. @param {boolean} posted - Desired state. @returns {void} */
  function setPosted(posted) { options.setState({ posted }); renderPosted(); }

  /** Discards manual overrides, unlocks and focuses the source without rebuilding cards. @returns {void} */
  function unlock() {
    options.setState({ segmentOverrides: null });
    setLocked(false);
    elements.source.focus();
  }

  /** Dismisses the posted note and focuses the source. @returns {void} */
  function dismissPosted() { setPosted(false); elements.source.focus(); }

  return { renderClear, renderLock, setLocked, renderPosted, setPosted, unlock, dismissPosted };
}

/** Owns tip selection and presentation with caller-owned persisted visibility.
 * @param {object} state - Live index/visible accessors. @param {object} elements - text, panel and toggle nodes.
 * @param {object} adapters - translate and random callbacks.
 * @returns {object} Frozen pick, render, visibility and next operations.
 */
export function createComposerTipController(state, elements, adapters) {
  if (typeof adapters?.translate !== 'function' || typeof adapters?.random !== 'function') { throw new TypeError('Composer tips require translate and random'); }
  const { translate: t, random } = adapters;
  /** Picks an index from the current translated tips. @returns {number} Index or zero for empty data. */
  function pickRandomTipIndex() {
    const tips = t("tipsList");
    if (!Array.isArray(tips) || tips.length === 0) {
      return 0;
    }
    return Math.floor(random() * tips.length);
  }

  /** Renders a current tip using the translated list length. @returns {void} Updated text. */
  function renderTip() {
    const tips = t("tipsList");
    if (!Array.isArray(tips) || tips.length === 0) {
      elements.text.textContent = "";
      return;
    }

    const safeIndex = Math.min(state.index, tips.length - 1);
    elements.text.textContent = tips[safeIndex];
  }

  /** Applies persisted tip visibility to its panel and checkbox. @returns {void} Updated controls. */
  function updateTipsVisibility() {
    elements.panel.hidden = !state.visible;
    elements.toggle.checked = state.visible;
  }

  /** Selects another current-language tip when available. @returns {void} Updated index and text. */
  function nextTip() {
    const tips = t("tipsList");
    if (!Array.isArray(tips) || tips.length <= 1) {
      renderTip();
      return;
    }

    let nextIndex = state.index;
    while (nextIndex === state.index) {
      nextIndex = Math.floor(random() * tips.length);
    }
    state.index = nextIndex;
    renderTip();
  }
  return Object.freeze({ pick: pickRandomTipIndex, render: renderTip, visibility: updateTipsVisibility, next: nextTip });
}
