/**
 * Normalizes an analysis account identifier without a leading at sign.
 * @param {string} value - Raw handle or DID from the analysis controls.
 * @returns {string} Trimmed account identifier.
 */
export function normalizeAnalysisActor(value = "") {
  return String(value || "").trim().replace(/^@+/, "");
}

/**
 * Binds Analysis account, comparison, reset, export, and option controls.
 * @param {object} elements - Analysis workspace controls.
 * @param {object} actions - Explicit callbacks for analysis state changes.
 * @returns {number} Number of listeners bound.
 */
export function bindAnalysisWorkspaceEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.accountAOwnButton, "click", actions.accountAOwn);
  bind(elements.accountBOwnButton, "click", actions.accountBOwn);
  bind(elements.accountALoadButton, "click", actions.accountALoad);
  bind(elements.accountBLoadButton, "click", actions.accountBLoad);
  bind(elements.compareButton, "click", actions.compare);
  bind(elements.resetButton, "click", actions.reset);
  bind(elements.exportPdfButton, "click", actions.exportPdf);
  if (Array.isArray(elements.accountInputs)) {
    elements.accountInputs.forEach((input) => {
      bind(input, "input", actions.accountInput);
      bind(input, "blur", actions.accountBlur);
      bind(input, "keydown", actions.accountKeydown);
    });
  }
  if (Array.isArray(elements.optionControls)) {
    elements.optionControls.forEach((control) => bind(control, "change", actions.optionChange));
  }
  return boundCount;
}
