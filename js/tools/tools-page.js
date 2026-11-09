import {
  readBrowserStorageValue,
  writeBrowserStorageValue,
} from "../core/app-storage.js";

/**
 * Persists the selected tools workspace under the current and legacy keys.
 * @param {Storage} storage - Browser storage implementation to update.
 * @param {string} primaryKey - Current workspace preference key.
 * @param {string} legacyKey - Legacy workspace preference key kept for migration.
 * @param {string} workspace - Normalized workspace identifier.
 * @returns {boolean} True when both values were stored.
 */
export function persistToolsWorkspacePreference(storage, primaryKey, legacyKey, workspace) {
  const primarySaved = writeBrowserStorageValue(storage, primaryKey, workspace);
  const legacySaved = writeBrowserStorageValue(storage, legacyKey, workspace);
  return primarySaved && legacySaved;
}

/**
 * Reads a persisted tools workspace, preferring the current key over its legacy fallback.
 * @param {Storage} storage - Browser storage implementation to read from.
 * @param {string} primaryKey - Current workspace preference key.
 * @param {string} legacyKey - Legacy workspace preference key.
 * @returns {string} Stored workspace identifier, or an empty string when unavailable.
 */
export function readToolsWorkspacePreference(storage, primaryKey, legacyKey) {
  const primaryValue = readBrowserStorageValue(storage, primaryKey);
  if (primaryValue) {
    return primaryValue;
  }

  return readBrowserStorageValue(storage, legacyKey);
}

/**
 * Calls the registered opener for one tools workspace.
 * @param {string} workspace - Workspace identifier to open.
 * @param {Record<string, () => void>} openers - Workspace identifiers mapped to opener functions.
 * @returns {boolean} True when a matching opener was called.
 */
export function openToolsWorkspace(workspace, openers = {}) {
  const opener = openers[String(workspace || "").trim()];
  if (typeof opener !== "function") {
    return false;
  }

  opener();
  return true;
}
