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
/**
 * Binds Archive preference controls and date-range changes.
 * @param {object} elements - Archive preference controls.
 * @param {object} actions - Preference persistence and refresh callbacks.
 * @returns {number} Number of listeners bound.
 */
export function bindArchivePreferenceEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.scope, "change", actions.scopeChange);
  bind(elements.sourceInput, "input", actions.sourceInput);
  bind(elements.sourceInput, "blur", actions.sourceBlur);
  bind(elements.contentMode, "change", actions.preferenceChange);
  bind(elements.conversationContext, "change", actions.preferenceChange);
  bind(elements.bandSize, "change", actions.summaryPreferenceChange);
  bind(elements.imageSize, "change", actions.preferenceChange);
  bind(elements.threadImportMode, "change", actions.preferenceChange);
  bind(elements.metrics, "change", actions.preferenceChange);
  bind(elements.threads, "change", actions.summaryPreferenceChange);
  bind(elements.pdfIndent, "change", actions.preferenceChange);
  bind(elements.livePreview, "change", actions.livePreviewChange);
  bind(elements.waveSize, "change", actions.preferenceChange);
  bind(elements.fromInput, "change", actions.fromChange);
  bind(elements.toInput, "change", actions.toChange);
  return boundCount;
}

/**
 * Binds Archive loading, import and reset controls.
 * @param {object} elements - Archive action controls and import input.
 * @param {object} actions - Callbacks for the declared user actions.
 * @returns {number} Number of listeners bound.
 */
export function bindArchiveActionEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.nextWaveButton, "click", actions.nextWaveClick);
  bind(elements.threadUrlInput, "keydown", actions.threadUrlKeydown);
  bind(elements.loadThreadUrlButton, "click", actions.loadThreadUrlClick);
  bind(elements.importButton, "click", actions.importClick);
  bind(elements.resetButton, "click", actions.resetClick);
  bind(elements.pauseButton, "click", actions.pauseClick);
  bind(elements.resumeButton, "click", actions.resumeClick);
  bind(elements.cancelButton, "click", actions.cancelClick);
  bind(elements.exportZipButton, "click", actions.exportZipClick);
  bind(elements.exportMediaZipButton, "click", actions.exportMediaZipClick);
  bind(elements.exportHtmlButton, "click", actions.exportHtmlClick);
  bind(elements.exportHtmlCompactButton, "click", actions.exportHtmlCompactClick);
  bind(elements.exportPdfButton, "click", actions.exportPdfClick);
  bind(elements.zipScriptCopyButton, "click", actions.zipScriptCopyClick);
  bind(elements.importInput, "change", actions.importInputChange);
  bind(elements.checkPostEditButton, "click", actions.checkPostEditClick);
  bind(elements.savedSearchesButton, "click", actions.savedSearchesClick);
  bind(elements.actionsExportHtmlButton, "click", actions.actionsExportHtmlClick);
  bind(elements.actionsExportHtmlCompactButton, "click", actions.actionsExportHtmlCompactClick);
  bind(elements.progressExportHtmlCompactButton, "click", actions.progressExportHtmlCompactClick);
  bind(elements.actionsExportPdfButton, "click", actions.actionsExportPdfClick);
  bind(elements.expertModeToggle, "change", actions.expertModeChange);
  bind(elements.expertModeToggle, "change", actions.expertModeChange);
  return boundCount;
}

/**
 * Binds export actions on one rendered archive result card.
 * @param {object} elements - ZIP, HTML and PDF export buttons.
 * @param {object} actions - Export callbacks for the result catalog.
 * @returns {number} Number of listeners bound.
 */
export function bindArchiveResultExportEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bindings = [
    [elements.zipButton, actions.zipClick],
    [elements.htmlButton, actions.htmlClick],
    [elements.pdfButton, actions.pdfClick],
  ];
  bindings.forEach(([target, handler]) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener("click", handler);
    boundCount += 1;
  });
  return boundCount;
}

/**
 * Binds the Post-Edit-Check dialog controls.
 * @param {object} elements - Input, submit, close and dialog elements.
 * @param {object} actions - Explicit callbacks for loading and closing the dialog.
 * @returns {number} Number of listeners bound.
 */
export function bindPostEditCheckDialogEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.urlInput, "keydown", actions.urlKeydown);
  bind(elements.submitButton, "click", actions.submitClick);
  bind(elements.closeTopButton, "click", actions.close);
  bind(elements.closeButton, "click", actions.close);
  bind(elements.dialog, "cancel", actions.cancel);
  return boundCount;
}
