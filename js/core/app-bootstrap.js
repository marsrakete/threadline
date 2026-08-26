const FALLBACK_APP_VERSION_INFO = Object.freeze({
  appVersion: "0.4.272",
  cacheVersion: "v291",
  label: "Fix Thread Explorer reply handoff to composer",
});

/**
 * Normalizes one raw version object into the Threadline shape.
 * @param {object} versionInfo - Raw version payload from globals or JSON.
 * @returns {{appVersion: string, cacheVersion: string, label: string}} Clean version info object.
 */
function normalizeVersionInfo(versionInfo) {
  return {
    appVersion: String(versionInfo?.appVersion || "").trim(),
    cacheVersion: String(versionInfo?.cacheVersion || "").trim(),
    label: String(versionInfo?.label || "").trim(),
  };
}

/**
 * Returns the current version info from the global preload or the local fallback.
 * @returns {{appVersion: string, cacheVersion: string, label: string}} Current app version info.
 */
function getCurrentVersionInfo() {
  const globalVersionInfo = globalThis.APP_VERSION_INFO;
  if (globalVersionInfo) {
    return Object.freeze(normalizeVersionInfo(globalVersionInfo));
  }

  return Object.freeze(normalizeVersionInfo(FALLBACK_APP_VERSION_INFO));
}

/**
 * Builds one comparable signature from app and cache version.
 * @param {{appVersion?: string, cacheVersion?: string}|null|undefined} versionInfo - Version object to compare.
 * @returns {string} Comparable signature string.
 */
function versionSignature(versionInfo) {
  const normalizedVersionInfo = normalizeVersionInfo(versionInfo);
  return `${normalizedVersionInfo.appVersion}|${normalizedVersionInfo.cacheVersion}`;
}

/**
 * Loads remote version metadata from the JSON mirror without using the browser cache.
 * @returns {Promise<{appVersion: string, cacheVersion: string, label: string}>} Parsed version info from `version.json`.
 */
async function fetchVersionInfo() {
  const response = await fetch("./version.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Version file unavailable");
  }

  const payload = await response.json();
  return normalizeVersionInfo(payload);
}

const CURRENT_VERSION_INFO = getCurrentVersionInfo();

export {
  CURRENT_VERSION_INFO,
  fetchVersionInfo,
  normalizeVersionInfo,
  versionSignature,
};
