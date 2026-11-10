/**
 * Opens a native modal dialog when it is not already open.
 * @param {HTMLDialogElement|null|undefined} dialog - Dialog element to open.
 * @returns {boolean} True when the dialog was opened.
 */
export function openModalDialog(dialog) {
  if (!dialog || dialog.open) {
    return false;
  }
  dialog.showModal();
  return true;
}

/**
 * Closes a native modal dialog when it is currently open.
 * @param {HTMLDialogElement|null|undefined} dialog - Dialog element to close.
 * @returns {boolean} True when the dialog was closed.
 */
export function closeModalDialog(dialog) {
  if (!dialog || !dialog.open) {
    return false;
  }
  dialog.close();
  return true;
}

/**
 * Updates and opens a progress dialog.
 * @param {object} elements - Progress dialog elements.
 * @param {HTMLDialogElement|null|undefined} elements.dialog - Progress dialog container.
 * @param {HTMLElement|null|undefined} elements.title - Progress title element.
 * @param {HTMLElement|null|undefined} elements.message - Progress message element.
 * @param {string} title - Visible dialog title.
 * @param {string} message - Visible dialog message.
 * @returns {void}
 */
export function showProgressModal(elements, title, message) {
  if (elements.title) {
    elements.title.textContent = String(title || "");
  }
  if (elements.message) {
    elements.message.textContent = String(message || "");
  }
  openModalDialog(elements.dialog);
}

/**
 * Updates and opens an error dialog with an optional safe link target.
 * @param {object} elements - Error dialog elements.
 * @param {HTMLDialogElement|null|undefined} elements.dialog - Error dialog container.
 * @param {HTMLElement|null|undefined} elements.title - Error title element.
 * @param {HTMLElement|null|undefined} elements.message - Error message element.
 * @param {HTMLElement|null|undefined} elements.linkWrap - Wrapper for the optional error link.
 * @param {HTMLAnchorElement|null|undefined} elements.link - Optional error link element.
 * @param {object} content - Visible error dialog content.
 * @param {string} content.title - Visible dialog title.
 * @param {string} content.message - Visible dialog message.
 * @param {string} [content.linkUrl] - Optional link target.
 * @param {string} [content.linkLabel] - Optional link label.
 * @returns {void}
 */
export function showErrorModal(elements, content) {
  if (elements.title) {
    elements.title.textContent = String(content.title || "");
  }
  if (elements.message) {
    elements.message.textContent = String(content.message || "");
  }
  if (elements.linkWrap && elements.link) {
    const linkUrl = String(content.linkUrl || "").trim();
    if (linkUrl) {
      elements.link.href = linkUrl;
      elements.link.textContent = String(content.linkLabel || linkUrl).trim();
      elements.linkWrap.hidden = false;
    } else {
      elements.link.href = "#";
      elements.link.textContent = "";
      elements.linkWrap.hidden = true;
    }
  }
  openModalDialog(elements.dialog);
}

/**
 * Creates a queued controller for the shared confirmation dialog.
 * @param {object} elements - Confirmation dialog elements.
 * @param {HTMLDialogElement} elements.dialog - Native confirmation dialog.
 * @param {HTMLElement} elements.title - Confirmation title element.
 * @param {HTMLElement} elements.message - Confirmation message element.
 * @param {HTMLButtonElement} elements.confirmButton - Confirmation action button.
 * @param {HTMLButtonElement} elements.cancelButton - Cancellation action button.
 * @param {HTMLElement|null|undefined} elements.previewWrap - Optional preview wrapper.
 * @param {(preview: object|null) => void} renderPreview - Renders the optional preview content.
 * @returns {{open: (options: object) => Promise<unknown>, confirm: () => void, cancel: () => void, dismiss: () => void, handleNativeClose: () => void}} Confirmation controller.
 */
export function createQueuedConfirmDialogController(elements, renderPreview) {
  let values = { confirm: true, cancel: false, dismiss: false };
  let queue = Promise.resolve();
  let resolver = null;
  let ignoreNextClose = false;

  /**
   * Applies one confirmation request to the dialog elements.
   * @param {object} options - Dialog request content and return values.
   * @returns {Promise<unknown>} Promise resolved after the user chooses an action.
   */
  async function openQueued(options) {
    elements.title.textContent = String(options.title || "");
    elements.message.textContent = String(options.message || "");
    elements.confirmButton.textContent = String(options.confirmLabel || options.fallbackConfirmLabel || "");
    elements.cancelButton.textContent = String(options.cancelLabel || options.fallbackCancelLabel || "");
    values = {
      confirm: options.confirmValue,
      cancel: options.cancelValue,
      dismiss: options.dismissValue,
    };

    if (elements.previewWrap) {
      const preview = options.preview;
      const hasPreview = Boolean(preview && typeof preview === "object" && (preview.name || preview.handle || preview.avatar));
      elements.previewWrap.hidden = !hasPreview;
      if (hasPreview) {
        renderPreview(preview);
      }
    }
    if (elements.dialog.open) {
      ignoreNextClose = true;
      elements.dialog.close();
    }

    return new Promise((resolve) => {
      resolver = resolve;
      elements.dialog.showModal();
    });
  }

  /**
   * Resolves the active confirmation request and closes its dialog.
   * @param {unknown} value - Value returned to the original caller.
   * @returns {void}
   */
  function resolve(value) {
    const activeResolver = resolver;
    resolver = null;
    if (elements.dialog.open) {
      ignoreNextClose = true;
      elements.dialog.close();
    }
    if (activeResolver) {
      activeResolver(value);
    }
  }

  /**
   * Queues one confirmation request after any currently open request has settled.
   * @param {object} options - Dialog request content and return values.
   * @returns {Promise<unknown>} Promise resolved after the user chooses an action.
   */
  function open(options) {
    const resultPromise = queue.catch(() => {}).then(() => openQueued(options));
    queue = resultPromise.then(() => {}, () => {});
    return resultPromise;
  }

  /**
   * Handles an unexpected native close event by resolving the active request as dismissed.
   * @returns {void}
   */
  function handleNativeClose() {
    if (ignoreNextClose) {
      ignoreNextClose = false;
      return;
    }
    if (resolver) {
      resolve(values.dismiss);
    }
  }

  return {
    open,
    confirm() {
      resolve(values.confirm);
    },
    cancel() {
      resolve(values.cancel);
    },
    dismiss() {
      resolve(values.dismiss);
    },
    handleNativeClose,
  };
}
