/**
 * Normalizes an analysis account identifier without a leading at sign.
 * @param {string} value - Raw handle or DID from the analysis controls.
 * @returns {string} Trimmed account identifier.
 */
export function normalizeAnalysisActor(value = "") {
  return String(value || "").trim().replace(/^@+/, "");
}

/** Creates analysis workspace navigation, rendering and language refresh. @param {object} elements - Launch/export buttons and account inputs. @param {object} options - Live state, domain renderer/controller, tables and shell adapters. @returns {object} Workspace operations. */
export function createAnalysisWorkspaceController(elements, options) {
  /** Renders all analysis sections in their established order. @returns {void} */
  function render() {
    const state = options.getState(); const renderer = options.renderer;
    renderer.summary(state.accountA, state.accountB); renderer.result(state.comparison);
    renderer.temporal(state.accountA, state.accountB, state.comparison, options.tables.temporal(state.accountA, state.accountB, state.comparison));
    renderer.network(state.accountA, state.accountB, state.comparison, options.tables.network(state.accountA, state.accountB, state.comparison), state.status);
    renderer.metrics(state.comparison); renderer.patterns(state.accountA, state.accountB);
    options.controller.controls(); options.controller.status(state.status || options.t("analysisStatusIdle"));
  }
  /** Navigates across pages or opens analysis for an authenticated account. @returns {void} */
  function show() {
    if (options.navigate()) { return; }
    if (!options.getState().auth) { return; }
    options.setWorkspace("analysis"); options.fullscreen(); options.persistWorkspace("analysis");
    options.visible("analysis"); options.context(); options.authButtons(); render();
  }
  /** Refreshes analysis-specific translated placeholders and labels. @returns {void} */
  function translate() {
    for (const input of [elements.inputA, elements.inputB]) { if (input) { input.placeholder = options.t("analysisAccountPlaceholder"); } }
    if (elements.launch) { elements.launch.textContent = options.t("analysisLaunchButton"); }
    if (elements.exportPdf) { elements.exportPdf.textContent = options.t("analysisExportPdfButton"); }
  }
  return { show, render, translate };
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
