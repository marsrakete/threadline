/**
 * Builds the persisted history entry for a successful publication.
 * @param {object} result - Publication result.
 * @param {Array<object>} segments - Prepared published segments.
 * @param {object} options - Account/service fallbacks, URL/preview builders, ID and timestamp providers.
 * @returns {object|null} History entry or null when no public post URL exists.
 */
export function buildComposerHistoryEntry(result, segments, options) {
  const account = result.handle || options.account;
  const service = result.service || options.service;
  const url = options.buildPostUrl(account, result.posts?.[0]?.uri, result.webApp || options.webApp || service);
  if (!url) {
    return null;
  }
  return {
    id: options.createId(), url, createdAt: options.now(), account: account || options.account || "", service,
    firstSegmentText: options.preview(segments[0]?.text || ""),
    threadCount: result.posts?.length || segments.length || 1,
    imageCount: segments.reduce((total, segment) => total + (segment.images?.length || 0), 0),
  };
}

/**
 * Adds a publication to the normalized history and persists after rendering.
 * @param {object|null} entry - Prepared history entry.
 * @param {object} actions - History reader, normalizer, setter, renderer and persistence action.
 * @returns {Promise<void>}
 */
export async function recordComposerHistoryEntry(entry, actions) {
  if (!entry) {
    return;
  }
  actions.setHistory(actions.normalize([entry, ...actions.getHistory()]));
  actions.render();
  await actions.persist();
}

/**
 * Creates Explorer, continuation and deletion actions for a saved history entry.
 * @param {object} entry - Saved history entry.
 * @param {object} elements - Explorer and continuation buttons.
 * @param {object} actions - Busy, navigation, reply, persistence, translation and error dependencies.
 * @returns {object} Async item event handlers.
 */
export function createComposerHistoryItemActions(entry, elements, actions) {
  /**
   * Opens the saved post in Thread Explorer while retaining the dialog on failure.
   * @returns {Promise<void>}
   */
  async function threadExplorerClick() {
    try {
      actions.setBusy(elements.threadExplorerButton, true, actions.translate("historyOpenThreadExplorerBusy"), actions.translate("openPostInThreadExplorerButton"));
      await actions.openPost(entry.url);
      actions.closeDialog();
    } catch (error) {
      actions.reportError(error);
      actions.showError(error.message || actions.translate("threadExplorerUrlFailed"));
    } finally {
      actions.setBusy(elements.threadExplorerButton, false, actions.translate("historyOpenThreadExplorerBusy"), actions.translate("openPostInThreadExplorerButton"));
    }
  }
  /**
   * Resolves the saved thread and applies it as the Composer continuation target.
   * @returns {Promise<void>}
   */
  async function continueClick() {
    try {
      actions.setBusy(elements.continueButton, true, actions.translate("historyContinueThreadBusy"), actions.translate("historyContinueThreadButton"));
      const target = await actions.requestTarget(entry.url, "thread");
      actions.applyTarget(target);
      actions.closeDialog();
      actions.showComposer();
      actions.setStatus(actions.translate("replyTargetThreadReady"));
    } catch (error) {
      actions.reportError(error);
      const message = error.message || actions.translate("replyTargetResolveFailed");
      actions.setStatus(message, "error");
      actions.showError(message);
    } finally {
      actions.setBusy(elements.continueButton, false, actions.translate("historyContinueThreadBusy"), actions.translate("historyContinueThreadButton"));
    }
  }
  /**
   * Removes the entry, rerenders and persists before reporting success.
   * @returns {Promise<void>}
   */
  async function deleteClick() {
    actions.remove(entry.id);
    actions.render();
    await actions.persist();
    actions.setStatus(actions.translate("historyDeleted"));
  }
  return { threadExplorerClick, continueClick, deleteClick };
}

/**
 * Renders saved publications from reusable templates and wires their item actions.
 * @param {Array<object>} entries - Normalized history entries.
 * @param {object} elements - List, history button, item template and empty-state template.
 * @param {object} options - Translator, metadata/date formatters and item action factory.
 * @returns {void}
 */
export function renderComposerHistoryList(entries, elements, options) {
  elements.list.replaceChildren();
  if (entries.length === 0) {
    const fragment = elements.emptyTemplate.content.cloneNode(true);
    fragment.querySelector(".history-empty").textContent = options.translate("historyEmpty");
    elements.list.appendChild(fragment);
  } else {
    for (const entry of entries) {
      const fragment = elements.itemTemplate.content.cloneNode(true);
      const item = fragment.querySelector(".history-item");
      let eyebrowKey = "historyPostEyebrow";
      if (entry.threadCount > 1) {
        eyebrowKey = "historyThreadEyebrow";
      }
      item.querySelector(".history-item-eyebrow").textContent = options.translate(eyebrowKey);
      const preview = item.querySelector(".history-preview");
      if (entry.firstSegmentText) {
        preview.textContent = entry.firstSegmentText;
        preview.title = entry.firstSegmentText;
      } else {
        preview.remove();
      }
      item.querySelector(".history-timestamp").textContent = options.formatTimestamp(entry.createdAt);
      item.querySelector(".history-counts").textContent = options.formatMeta(entry.threadCount, entry.imageCount);
      item.querySelector(".history-account").textContent = options.translate("historyAccountMeta", {
        account: entry.account || options.translate("historyUnknownAccount"),
      });
      const link = item.querySelector("a.history-link");
      link.href = entry.url;
      link.textContent = options.translate("historyOpenLink");
      const controls = { threadExplorerButton: item.querySelector(".history-explorer-button"),
        continueButton: item.querySelector(".history-continue-button"), deleteButton: item.querySelector(".history-delete-button") };
      controls.threadExplorerButton.textContent = options.translate("openPostInThreadExplorerButton");
      controls.continueButton.textContent = options.translate("historyContinueThreadButton");
      controls.deleteButton.setAttribute("aria-label", options.translate("historyDeleteButton"));
      bindComposerHistoryItemEvents(controls, options.createActions(entry, controls));
      elements.list.appendChild(fragment);
    }
  }
  elements.button.disabled = entries.length === 0;
}

/**
 * Normalizes saved Composer posting-history entries and keeps the newest unique values.
 * @param {Array<object>} entries - Raw history entries from settings or imports.
 * @param {number} maxEntries - Maximum number of history entries to retain.
 * @returns {Array<object>} Sorted and normalized history entries.
 */
export function normalizeComposerPostingHistory(entries, maxEntries) {
  const seen = new Set();
  const result = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    let url = "";
    let createdAt = "";
    let account = "";
    let service = "";
    if (typeof entry?.url === "string") {
      url = entry.url.trim();
    }
    if (typeof entry?.createdAt === "string") {
      createdAt = entry.createdAt;
    }
    if (typeof entry?.account === "string") {
      account = entry.account.trim();
    }
    if (typeof entry?.service === "string") {
      service = entry.service.trim();
    }
    if (!url || !createdAt) {
      continue;
    }

    const key = `${url}|${createdAt}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    let id = key;
    if (typeof entry.id === "string" && entry.id) {
      id = entry.id;
    }
    let firstSegmentText = "";
    if (typeof entry?.firstSegmentText === "string") {
      firstSegmentText = entry.firstSegmentText.trim();
    }
    result.push({
      id,
      url,
      createdAt,
      account,
      service,
      firstSegmentText,
      threadCount: Math.max(1, Number(entry?.threadCount) || 1),
      imageCount: Math.max(0, Number(entry?.imageCount) || 0),
    });
  }

  return result
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, maxEntries);
}

/**
 * Merges imported and locally saved Composer histories, preferring imported entries on duplicates.
 * @param {Array<object>} existing - Locally saved history entries.
 * @param {Array<object>} imported - Imported history entries.
 * @param {number} maxEntries - Maximum number of history entries to retain.
 * @returns {Array<object>} Normalized merged history.
 */
export function mergeComposerPostingHistory(existing, imported, maxEntries) {
  const importedEntries = [];
  const existingEntries = [];
  if (Array.isArray(imported)) {
    importedEntries.push(...imported);
  }
  if (Array.isArray(existing)) {
    existingEntries.push(...existing);
  }
  return normalizeComposerPostingHistory([...importedEntries, ...existingEntries], maxEntries);
}

/**
 * Builds the compact text preview stored with a Composer history entry.
 * @param {string} text - Raw first segment text.
 * @param {number} maxLength - Maximum preview length.
 * @returns {string} Whitespace-normalized preview text.
 */
export function getComposerHistoryPreviewText(text, maxLength = 220) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/**
 * Builds the localized metadata label for a Composer history entry.
 * @param {number} threadCount - Number of posts in the recorded thread.
 * @param {number} imageCount - Number of images in the recorded thread.
 * @param {(key: string, values?: object) => string} translate - Translation callback.
 * @returns {string} Localized history metadata.
 */
export function formatComposerHistoryMeta(threadCount, imageCount, translate) {
  let threadKey = "historySectionPlural";
  if (threadCount === 1) {
    threadKey = "historySectionSingular";
  }
  let imageKey = "historyImagePlural";
  if (imageCount === 1) {
    imageKey = "historyImageSingular";
  }

  return translate("historyMeta", {
    threads: threadCount,
    threadWord: translate(threadKey),
    images: imageCount,
    imageWord: translate(imageKey),
  });
}

/**
 * Binds actions for one rendered Composer history entry.
 * @param {object} elements - Thread Explorer, continue and delete controls.
 * @param {object} handlers - Explicit history action callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerHistoryItemEvents(elements = {}, handlers = {}) {
  const bindings = [
    [elements.threadExplorerButton, handlers.threadExplorerClick],
    [elements.continueButton, handlers.continueClick],
    [elements.deleteButton, handlers.deleteClick],
  ];
  let boundCount = 0;
  bindings.forEach(([target, handler]) => {
    if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") {
      return;
    }
    target.addEventListener("click", handler);
    boundCount += 1;
  });
  return boundCount;
}
