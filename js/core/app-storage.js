/**
 * Reads a value from browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to read from.
 * @param {string} key - Storage key to read.
 * @returns {string} Stored value, or an empty string when unavailable.
 */
export function readBrowserStorageValue(storage, key) {
  try {
    return String(storage.getItem(key) || "").trim();
  } catch {
    return "";
  }
}

/**
 * Stores one string value in browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to write to.
 * @param {string} key - Storage key to write.
 * @param {string} value - Value to store.
 * @returns {boolean} True when the value was stored.
 */
export function writeBrowserStorageValue(storage, key, value) {
  try {
    storage.setItem(key, String(value || ""));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes one value from browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to modify.
 * @param {string} key - Storage key to remove.
 * @returns {boolean} True when the value was removed.
 */
export function removeBrowserStorageValue(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
/**
 * Creates worker-backed startup reads and serialized settings writes.
 * @param {object} options - Worker request, write queue, snapshot and error adapters.
 * @returns {object} Startup loader and settings persistence operation.
 */
export function createApplicationStorage(options) {
  /**
   * Loads required app state and optional caches with their original timeouts.
   * @param {string} browserLocale - Detected startup locale.
   * @returns {Promise<object>} App state and optional cache bundle.
   */
  async function load(browserLocale) {
    const [state, archiveSession, archiveCatalog, dmPartnerCache, accountAvatarCache] = await Promise.all([
      options.request("GET_APP_STATE", { browserLocale }),
      options.request("GET_ARCHIVE_SESSION", {}, { timeoutMs: 30000 }).catch(() => null),
      options.request("GET_ARCHIVE_CATALOG", {}, { timeoutMs: 120000 }).catch(() => null),
      options.request("GET_DM_PARTNER_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
      options.request("GET_ACCOUNT_AVATAR_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
    ]);
    return { state, archiveSession, archiveCatalog, dmPartnerCache, accountAvatarCache };
  }
  /** Saves a snapshot captured before entering the write queue. @returns {Promise<void>} Completion or reported failure. */
  async function persist() {
    const payload = options.snapshot();
    try {
      await options.queue.enqueue(() => options.request("SAVE_SETTINGS", payload, { timeoutMs: 120000 }));
    } catch (error) {
      options.report(error);
      options.setStatus(error.message, "error");
    }
  }
  return { load, persist };
}
