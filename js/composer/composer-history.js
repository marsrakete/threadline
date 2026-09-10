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
