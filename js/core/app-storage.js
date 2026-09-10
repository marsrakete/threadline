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
