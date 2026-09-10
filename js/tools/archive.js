/**
 * Returns an ISO date part for an archive filename.
 * @param {string} value - Preferred date value.
 * @param {Date} fallbackDate - Date used when the preferred value is empty.
 * @returns {string} Date in YYYY-MM-DD form.
 */
export function formatArchiveDatePart(value, fallbackDate = new Date()) {
  const preferredDate = String(value || "").slice(0, 10);
  if (preferredDate) {
    return preferredDate;
  }
  return fallbackDate.toISOString().slice(0, 10);
}

/**
 * Builds the shared base filename for media-export part archives.
 * @param {string} actor - Requested actor handle or DID.
 * @param {string} fallbackActor - Account label to use when no actor was requested.
 * @param {Date} exportDate - Date used in the generated filename.
 * @returns {string} Base filename without the ZIP suffix.
 */
export function buildArchiveMediaFileBaseName(actor, fallbackActor, exportDate = new Date()) {
  let targetHandle = String(actor || fallbackActor || "account")
    .replace(/^@+/, "")
    .trim()
    .replace(/[^\w.-]+/g, "-");
  if (!targetHandle) {
    targetHandle = "account";
  }
  return `threadline-media-${targetHandle}-${formatArchiveDatePart("", exportDate)}`;
}

/**
 * Builds the suggested filename for one media-export part archive.
 * @param {string} baseName - Shared base name of the export.
 * @param {number} batchIndex - Zero-based batch index.
 * @param {number} batchCount - Total number of batches.
 * @returns {string} Suggested ZIP filename for the batch.
 */
export function buildArchiveMediaPartFileName(baseName, batchIndex, batchCount) {
  const partLabel = String(batchIndex + 1).padStart(3, "0");
  const totalLabel = String(batchCount).padStart(3, "0");
  return `${baseName}-part-${partLabel}-of-${totalLabel}.zip`;
}
