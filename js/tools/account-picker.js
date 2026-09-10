/**
 * Returns the preferred field value for an account-picker result.
 * @param {object} actor - Selected account search result.
 * @returns {string} Handle when present, otherwise DID or an empty string.
 */
export function getAccountPickerSelectionValue(actor = {}) {
  const handle = String(actor?.handle || "").trim();
  if (handle) {
    return handle;
  }
  return String(actor?.did || "").trim();
}

/**
 * Checks whether a value can serve as an account-picker input target.
 * @param {unknown} value - Candidate input element.
 * @returns {boolean} True when the value provides the input methods used by the picker.
 */
function isAccountPickerInput(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (typeof HTMLInputElement !== "undefined" && value instanceof HTMLInputElement) {
    return true;
  }
  return typeof value.dispatchEvent === "function" && typeof value.focus === "function";
}

/**
 * Creates the shared account-picker controller used by account input fields.
 * @param {object} elements - Shared account-picker dialog elements.
 * @param {HTMLDialogElement|null|undefined} elements.dialog - Dialog used for account search.
 * @param {HTMLElement|null|undefined} elements.eyebrow - Dialog eyebrow element.
 * @param {HTMLElement|null|undefined} elements.title - Dialog title element.
 * @param {HTMLElement|null|undefined} elements.note - Dialog note element.
 * @param {HTMLElement|null|undefined} elements.status - Dialog status element.
 * @param {HTMLElement|null|undefined} elements.results - Dialog result container.
 * @param {HTMLInputElement|null|undefined} elements.input - Dialog query input.
 * @param {object} actions - Integration callbacks for app state and search.
 * @param {(key: string, values?: object) => string} actions.translate - Translation callback.
 * @param {() => string} actions.getDialogContext - Returns the active shared dialog context.
 * @param {(context: string) => void} actions.setDialogContext - Updates the shared dialog context.
 * @param {() => void} actions.clearMentionTarget - Clears the currently edited mention target.
 * @param {() => void} actions.resetSearchRequest - Invalidates active account-search requests.
 * @param {(query: string) => void} actions.runSearch - Starts account search for the current query.
 * @param {() => void} actions.closeDialog - Closes and resets the shared dialog.
 * @param {number} actions.autoOpenDelayMs - Delay before opening the picker automatically.
 * @param {number} actions.minimumQueryLength - Minimum query length for automatic opening.
 * @returns {{open: (options: object) => void, select: (actor: object) => boolean, reset: () => void, setInputValue: (input: HTMLInputElement|null, value: string) => void, openInput: (input: HTMLInputElement|null, label: string, options?: object) => void, enableAutoOpen: (input: HTMLInputElement|null, label: string, options?: object) => void}} Account-picker controller API.
 */
export function createAccountPickerController(elements, actions) {
  let selectionHandler = null;
  let sourceInput = null;
  let sourceQuery = "";
  let selectionApplied = false;
  const autoOpenTimers = new WeakMap();
  const mutedInputs = new WeakSet();
  const dismissedQueries = new WeakMap();

  /**
   * Clears status text and transient results before a new account search.
   * @returns {void}
   */
  function clearSearchPresentation() {
    if (elements.status) {
      elements.status.textContent = "";
      delete elements.status.dataset.tone;
    }
    if (elements.results) {
      elements.results.replaceChildren();
    }
  }

  /**
   * Opens the shared dialog in account-picker mode.
   * @param {object} options - Picker configuration.
   * @returns {void}
   */
  function open(options = {}) {
    const fallbackLabel = actions.translate("accountPickerFallbackLabel");
    const label = String(options.label || fallbackLabel).trim();
    const initialQuery = String(options.initialQuery || "").trim().replace(/^@/, "");
    actions.setDialogContext("account");
    actions.clearMentionTarget();
    actions.resetSearchRequest();
    selectionHandler = null;
    if (typeof options.onSelect === "function") {
      selectionHandler = options.onSelect;
    }
    sourceInput = null;
    if (isAccountPickerInput(options.sourceInput)) {
      sourceInput = options.sourceInput;
    }
    sourceQuery = initialQuery.toLowerCase();
    selectionApplied = false;

    if (elements.eyebrow) {
      elements.eyebrow.textContent = actions.translate("accountPickerDialogEyebrow");
    }
    if (elements.title) {
      elements.title.textContent = actions.translate("accountPickerDialogTitle", { label });
    }
    if (elements.note) {
      let noteKey = "accountPickerDialogNote";
      if (options.noteKey) {
        noteKey = String(options.noteKey);
      }
      elements.note.textContent = actions.translate(noteKey, { label });
    }
    clearSearchPresentation();
    if (elements.input) {
      elements.input.value = initialQuery;
    }
    if (elements.dialog && !elements.dialog.open) {
      elements.dialog.showModal();
    }
    elements.input?.focus();
    elements.input?.select();
    actions.runSearch(initialQuery);
  }

  /**
   * Applies an account search result and closes the shared dialog.
   * @param {object} actor - Selected account search result.
   * @returns {boolean} True when a usable selection was applied.
   */
  function select(actor = {}) {
    const selectedValue = getAccountPickerSelectionValue(actor);
    if (!selectedValue) {
      return false;
    }
    selectionApplied = true;
    if (sourceInput) {
      dismissedQueries.delete(sourceInput);
    }
    if (selectionHandler) {
      selectionHandler(actor, selectedValue);
    }
    actions.closeDialog();
    return true;
  }

  /**
   * Clears picker-specific state and remembers a manually dismissed input query.
   * @returns {void}
   */
  function reset() {
    if (actions.getDialogContext() === "account" && sourceInput) {
      if (selectionApplied) {
        dismissedQueries.delete(sourceInput);
      } else {
        dismissedQueries.set(sourceInput, sourceQuery);
      }
    }
    selectionHandler = null;
    sourceInput = null;
    sourceQuery = "";
    selectionApplied = false;
  }

  /**
   * Writes an account value into an input and prevents one automatic re-open event.
   * @param {HTMLInputElement|null} input - Target account input.
   * @param {string} value - Value to write.
   * @returns {void}
   */
  function setInputValue(input, value) {
    if (!input) {
      return;
    }
    mutedInputs.add(input);
    input.value = String(value || "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Opens the picker for one plain account input, with a default write-back handler.
   * @param {HTMLInputElement|null} input - Target account input.
   * @param {string} label - Visible field label.
   * @param {object} options - Optional picker configuration.
   * @returns {void}
   */
  function openInput(input, label, options = {}) {
    if (!input) {
      return;
    }
    let selection = null;
    if (typeof options.onSelect === "function") {
      selection = options.onSelect;
    } else {
      /**
       * Writes the selected account into the requested input field.
       * @param {object} actor - Selected account search result.
       * @param {string} value - Handle or DID selected for the field.
       * @returns {void}
       */
      function writeSelectionToInput(actor, value) {
        setInputValue(input, value);
      }
      selection = writeSelectionToInput;
    }
    open({
      label,
      initialQuery: String(input.value || ""),
      noteKey: String(options.noteKey || "accountPickerDialogNote"),
      onSelect: selection,
      sourceInput: input,
    });
  }

  /**
   * Enables delayed automatic account-picker opening on an account input.
   * @param {HTMLInputElement|null} input - Target account input.
   * @param {string} label - Visible field label.
   * @param {object} options - Optional picker configuration.
   * @returns {void}
   */
  function enableAutoOpen(input, label, options = {}) {
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      if (mutedInputs.has(input)) {
        mutedInputs.delete(input);
        return;
      }
      const previousTimer = autoOpenTimers.get(input);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
        autoOpenTimers.delete(input);
      }
      const query = String(input.value || "").trim().replace(/^@/, "");
      if (query.length < actions.minimumQueryLength) {
        return;
      }
      const timerId = window.setTimeout(() => {
        autoOpenTimers.delete(input);
        const normalizedQuery = String(input.value || "").trim().replace(/^@/, "").toLowerCase();
        const dismissedQuery = String(dismissedQueries.get(input) || "").trim().toLowerCase();
        if (!input.matches(":focus")) {
          return;
        }
        if (elements.dialog?.open) {
          return;
        }
        if (!normalizedQuery || normalizedQuery.length < actions.minimumQueryLength) {
          return;
        }
        if (dismissedQuery && dismissedQuery === normalizedQuery) {
          return;
        }
        openInput(input, label, options);
      }, actions.autoOpenDelayMs);
      autoOpenTimers.set(input, timerId);
    });
  }

  return {
    open,
    select,
    reset,
    setInputValue,
    openInput,
    enableAutoOpen,
  };
}
