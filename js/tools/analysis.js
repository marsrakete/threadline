/**
 * Normalizes an analysis account identifier without a leading at sign.
 * @param {string} value - Raw handle or DID from the analysis controls.
 * @returns {string} Trimmed account identifier.
 */
export function normalizeAnalysisActor(value = "") {
  return String(value || "").trim().replace(/^@+/, "");
}
