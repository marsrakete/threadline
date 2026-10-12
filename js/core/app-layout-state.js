/**
 * Normalizes persisted desktop layout dimensions and migrates legacy defaults.
 * @param {number|string|null} rawSidebarWidth - Stored sidebar width.
 * @param {number|string|null} rawComposerWidth - Stored composer width.
 * @param {number|string|null} rawLayoutVersion - Stored layout schema version.
 * @param {object} options - Defaults, limits, legacy signatures and clamp callback.
 * @returns {object} Normalized desktop layout state.
 */
export function normalizeStoredDesktopLayout(rawSidebarWidth, rawComposerWidth, rawLayoutVersion, options = {}) {
  let parsedSidebarWidth = null;
  let parsedComposerWidth = null;
  let parsedLayoutVersion = null;
  if (Number.isFinite(Number(rawSidebarWidth))) { parsedSidebarWidth = Number(rawSidebarWidth); }
  if (Number.isFinite(Number(rawComposerWidth))) { parsedComposerWidth = Number(rawComposerWidth); }
  if (Number.isFinite(Number(rawLayoutVersion))) { parsedLayoutVersion = Number(rawLayoutVersion); }
  let sidebarValue = "";
  let composerValue = "";
  if (parsedSidebarWidth != null) { sidebarValue = parsedSidebarWidth; }
  if (parsedComposerWidth != null) { composerValue = parsedComposerWidth; }
  const signature = `${sidebarValue}|${composerValue}`;
  const shouldMigrate = parsedLayoutVersion == null && options.legacySignatures?.has(signature);
  if (shouldMigrate) {
    return {
      sidebarWidthDesktop: options.defaultSidebarWidth,
      composerWidthDesktop: options.defaultComposerWidth,
      desktopLayoutVersion: options.layoutVersion,
    };
  }
  let layoutVersion = options.layoutVersion;
  if (parsedLayoutVersion != null) { layoutVersion = parsedLayoutVersion; }
  return {
    sidebarWidthDesktop: options.clamp(parsedSidebarWidth, options.minSidebarWidth, options.maxSidebarWidth, options.defaultSidebarWidth),
    composerWidthDesktop: options.clamp(parsedComposerWidth, options.minComposerWidth, options.maxComposerWidth, options.defaultComposerWidth),
    desktopLayoutVersion: layoutVersion,
  };
}

/**
 * Rounds and constrains a desktop width using the established numeric conversion.
 * @param {number|string|null} value - Requested width.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @param {number} fallback - Value for non-finite input.
 * @returns {number} Normalized width in CSS pixels.
 */
export function clampDesktopWidth(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) { return fallback; }
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

/**
 * Owns desktop column sizing, responsive sidebar presentation and drag lifecycle.
 * @param {object} elements - Root/body, sidebar toggle/glyph and resize handles.
 * @param {object} options - State, width limits, media, native events and persistence adapters.
 * @returns {object} Layout rendering, reset, drag and event-binding operations.
 */
export function createDesktopLayoutController(elements, options) {
  let activeCleanup = null;
  let bound = false;

  /** Normalizes one configured column. @param {string} column - Column key. @param {unknown} value - Width. @returns {number} CSS pixels. */
  function width(column, value) {
    const limits = options.widths[column];
    return clampDesktopWidth(value, limits.min, limits.max, limits.default);
  }
  /** Applies bounded widths to both CSS variable scopes and resizes textareas. @returns {void} */
  function apply() {
    const state = options.getState();
    const sidebar = width("sidebar", state.sidebarWidthDesktop);
    const composer = width("composer", state.composerWidthDesktop);
    options.setState({ sidebarWidthDesktop: sidebar, composerWidthDesktop: composer });
    for (const target of [elements.root, elements.body]) {
      target.style.setProperty("--desktop-sidebar-width", `${sidebar}px`);
      target.style.setProperty("--desktop-composer-width", `${composer}px`);
    }
    options.resizeTextareas();
  }
  /** Renders sidebar classes, accessible labels and direction glyph. @returns {void} */
  function renderSidebar() {
    const desktop = options.media.matches;
    const collapsed = options.getState().sidebarCollapsedDesktop;
    elements.body.classList.toggle("desktop-sidebar-collapsed", desktop && collapsed);
    elements.body.classList.toggle("mobile-sidebar-collapsed", !desktop && collapsed);
    let expanded = "true";
    let label = "sidebarCollapseButton";
    let glyph = "\u25b2";
    if (desktop) { glyph = "\u25c0"; }
    if (collapsed) {
      expanded = "false";
      label = "sidebarExpandButton";
      glyph = "\u25bc";
      if (desktop) { glyph = "\u25b6"; }
    }
    elements.toggle.setAttribute("aria-expanded", expanded);
    elements.toggle.setAttribute("aria-label", options.t(label));
    elements.toggle.title = options.t(label);
    elements.sidebarHandle.setAttribute("aria-label", options.t("sidebarResizeHandleLabel"));
    elements.composerHandle.setAttribute("aria-label", options.t("composerResizeHandleLabel"));
    elements.glyph.textContent = glyph;
  }
  /** Reads the dynamic separator width with its existing fallback. @returns {number} CSS pixels. */
  function getHandleWidth() {
    const value = Number.parseFloat(options.computedStyle(elements.body).getPropertyValue("--desktop-resize-handle-width"));
    if (Number.isFinite(value)) { return value; }
    return 14;
  }
  /** Removes the active drag listeners without persisting. @returns {void} */
  function stopResize() {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  }
  /** Starts a bounded pointer drag only on desktop. @param {string} target - Sidebar or composer. @returns {void} */
  function startResize(target) {
    if (!options.media.matches) { return; }
    stopResize();
    const rect = elements.body.getBoundingClientRect();
    /** Applies the current pointer position. @param {PointerEvent} event - Move event. @returns {void} */
    function move(event) {
      const state = options.getState();
      if (target === "sidebar") {
        options.setState({ sidebarWidthDesktop: width("sidebar", event.clientX - rect.left) });
      } else {
        let sidebar = width("sidebar", state.sidebarWidthDesktop);
        if (state.sidebarCollapsedDesktop) { sidebar = options.collapsedWidth; }
        options.setState({ composerWidthDesktop: width("composer", event.clientX - rect.left - sidebar - getHandleWidth()) });
      }
      apply();
    }
    /** Finishes or cancels the drag and saves its final state once. @returns {Promise<void>} Persistence completion. */
    async function finish() { stopResize(); await options.persist(); }
    /** Removes all drag listeners and the drag class. @returns {void} */
    function cleanup() {
      elements.body.classList.remove("desktop-resizing");
      options.events.removeEventListener("pointermove", move);
      options.events.removeEventListener("pointerup", finish);
      options.events.removeEventListener("pointercancel", finish);
    }
    activeCleanup = cleanup;
    elements.body.classList.add("desktop-resizing");
    options.events.addEventListener("pointermove", move);
    options.events.addEventListener("pointerup", finish, { once: true });
    options.events.addEventListener("pointercancel", finish, { once: true });
  }
  /** Restores defaults and expands the sidebar before saving. @returns {Promise<void>} Persistence completion. */
  async function reset() {
    stopResize();
    options.setState({ sidebarCollapsedDesktop: false, sidebarWidthDesktop: options.widths.sidebar.default,
      composerWidthDesktop: options.widths.composer.default });
    apply(); renderSidebar();
    await options.persist();
    options.setStatus(options.t("resetColumnWidthsDone"));
  }
  /** Toggles the sidebar and saves the common collapsed preference. @returns {Promise<void>} Persistence completion. */
  async function toggle() {
    options.setState({ sidebarCollapsedDesktop: !options.getState().sidebarCollapsedDesktop });
    renderSidebar(); await options.persist();
  }
  /** Starts the sidebar drag. @param {PointerEvent} event - Pointer down event. @returns {void} */
  function startSidebar(event) { event.preventDefault(); startResize("sidebar"); }
  /** Starts the composer drag. @param {PointerEvent} event - Pointer down event. @returns {void} */
  function startComposer(event) { event.preventDefault(); startResize("composer"); }
  /** Reapplies geometry and ends a drag when switching to mobile. @returns {void} */
  function mediaChanged() {
    if (!options.media.matches && activeCleanup) { stopResize(); void options.persist(); }
    apply(); renderSidebar();
  }
  /** Binds the shell controls once after initialization. @returns {void} */
  function bind() {
    if (bound) { return; }
    bound = true;
    options.bind(elements.toggle, [{ type: "click", handler: toggle }]);
    options.bind(elements.sidebarHandle, [{ type: "pointerdown", handler: startSidebar }]);
    options.bind(elements.composerHandle, [{ type: "pointerdown", handler: startComposer }]);
    options.bind(options.media, [{ type: "change", handler: mediaChanged }]);
  }
  return { apply, renderSidebar, reset, startResize, getHandleWidth, bind };
}
