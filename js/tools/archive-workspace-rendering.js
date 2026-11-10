/**
 * Creates template-based archive workspace presentation.
 * @param {object} elements - Initialized workspace elements and templates.
 * @param {object} dependencies - State, models and UI adapters.
 * @param {Function} dependencies.state - Reads current workspace state.
 * @param {object} dependencies.models - Localized status/count models.
 * @param {Function} dependencies.t - Resolves localized content.
 * @param {Function} dependencies.avatar - Assigns an avatar with its fallback.
 * @param {Function} dependencies.tooLarge - Tests the existing full-HTML size policy.
 * @param {Function} dependencies.bindResult - Binds result-card export buttons.
 * @param {Function} dependencies.zip - Exports one catalog as ZIP.
 * @param {Function} dependencies.html - Exports one catalog as HTML.
 * @param {Function} dependencies.pdf - Exports one catalog as PDF volumes.
 * @param {Function} dependencies.scope - Synchronizes existing date/scope controls.
 * @param {Function} dependencies.progress - Updates application progress state and display.
 * @returns {object} Workspace render operations, without application state ownership.
 */
export function createArchiveWorkspaceRenderer(elements, dependencies) {
  for (const name of ["state", "t", "avatar", "tooLarge", "bindResult", "zip", "html", "pdf", "scope", "progress"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Archive rendering requires ${name}.`);
    }
  }
  for (const name of ["active", "time", "status", "hint", "controls", "summary"]) {
    if (typeof dependencies.models?.[name] !== "function") {
      throw new TypeError(`Archive rendering requires models.${name}.`);
    }
  }
  for (const name of ["sourceTemplate", "noteTemplate", "previewTemplate", "specTemplate", "specItemTemplate", "resultTemplate"]) {
    if (!elements?.[name]?.content) {
      throw new TypeError(`Archive rendering requires ${name}.`);
    }
  }
  const {
    state,
    models,
    t
  } = dependencies;

  /** Clones one reusable structure. @param {string} name - Template property. @returns {DocumentFragment} Detached clone. */
  function clone(name) {
    return elements[name].content.cloneNode(true);
  }

  /** Creates a plain-text note. @param {string} text - Localized content. @returns {HTMLElement} Detached paragraph. */
  function note(text) {
    const node = clone("noteTemplate").firstElementChild;
    node.textContent = text;
    return node;
  }

  /** Renders the selected source identity. @returns {void} */
  function source() {
    if (!elements.sourceStatus || !elements.sourcePreview) {
      return;
    }
    elements.sourcePreview.replaceChildren();
    const current = state();
    if (!current.source || !current.profile?.did) {
      elements.sourcePreview.hidden = true;
      if (!current.source) {
        elements.sourceStatus.textContent = "";
      }
      return;
    }
    const profile = current.profile;
    const label = profile.displayName || profile.handle || profile.did;
    elements.sourceStatus.textContent = t("archiveSourceReady", {
      account: profile.handle || profile.displayName || profile.did
    });
    elements.sourcePreview.hidden = false;
    const fragment = clone("sourceTemplate");
    dependencies.avatar(fragment.querySelector("img"), profile.avatar, label);
    fragment.querySelector(".eyebrow").textContent = t("archiveSourcePreviewEyebrow");
    fragment.querySelector("strong").textContent = label;
    let handle = profile.did;
    if (profile.handle) {
      handle = `@${profile.handle}`;
    }
    fragment.querySelector(".reply-target-handle").textContent = handle;
    elements.sourcePreview.append(fragment);
  }

  /** Renders progress without changing its application state. @param {object} job - Title, step, detail and percentage. @returns {void} */
  function progress(job) {
    elements.progressTitle.textContent = job.title || t("archiveProgressIdleTitle");
    elements.progressStep.textContent = job.step || t("archiveProgressIdleStep");
    elements.progressDetail.textContent = job.detail || "";
    elements.progressFill.style.width = `${Math.max(0, Math.min(100, Number(job.percent) || 0))}%`;
    const exportProgress = elements.exportPdf?.closest(".archive-card")?.querySelector(".archive-export-progress");
    if (exportProgress) {
      exportProgress.hidden = job.operation !== "pdf";
      const percent = Math.max(0, Math.min(100, Number(job.percent) || 0));
      exportProgress.classList.toggle("is-running", job.operation === "pdf" && percent < 100);
      exportProgress.querySelector("strong").textContent = job.step || job.title || "";
      exportProgress.querySelector("progress").value = percent;
      exportProgress.querySelector('[data-slot="detail"]').textContent = job.detail || "";
    }
    heartbeat();
    status();
  }

  /** Renders the optional live preview. @param {object|null} value - Preview, defaulting to live state. @returns {void} */
  function preview(value = state().preview) {
    elements.previewPanel.hidden = !state().livePreview;
    elements.previewCard.replaceChildren();
    if (!state().livePreview || !value) {
      const empty = note(t("archivePreviewEmpty"));
      empty.id = "archive-preview-empty";
      elements.previewCard.append(empty);
      return;
    }
    const fragment = clone("previewTemplate");
    fragment.querySelector('[data-slot="meta"]').textContent = value.meta || "";
    const image = fragment.querySelector("img");
    if (value.imageDataUrl) {
      image.src = value.imageDataUrl;
      image.alt = value.alt || t("archivePreviewImageAlt");
    } else {
      image.remove();
    }
    for (const key of ["text", "metric"]) {
      const node = fragment.querySelector(`[data-slot="${key}"]`);
      if (value[key]) {
        node.textContent = value[key];
      } else {
        node.remove();
      }
    }
    elements.previewCard.append(fragment);
  }

  /** Renders the last heartbeat time. @returns {void} */
  function heartbeat() {
    if (!elements.heartbeat) {
      return;
    }
    const time = models.time(state().lastProgressAt);
    let text = "";
    if (time) {
      text = t("archiveProgressLastHeartbeat", {
        time
      });
    }
    elements.heartbeat.textContent = text;
  }

  /** Renders the off-workspace run notice. @returns {void} */
  function background() {
    if (!elements.background) {
      return;
    }
    const current = state();
    const visible = current.workspace !== "archive" && models.active(current);
    elements.background.hidden = !visible;
    if (!visible) {
      elements.background.textContent = "";
      return;
    }
    const values = {
      time: models.time(current.lastProgressAt)
    };
    if (current.runState === "paused") {
      elements.background.textContent = t("archiveBackgroundNoticePaused", values);
    } else {
      elements.background.textContent = t("archiveBackgroundNoticeRunning", values);
    }
  }

  /** Renders the current run status. @returns {void} */
  function status() {
    background();
    elements.status.textContent = models.status(state());
  }

  /** Renders start/resume guidance. @returns {void} */
  function hint() {
    elements.startHint.textContent = models.hint(state());
  }

  /** Synchronizes the normal load button label. @returns {void} */
  function actionButtons() {
    if (elements.nextWave && state().runState !== "running") {
      elements.nextWave.textContent = t("archiveNextWaveButton");
    }
  }

  /** Renders pause/resume/cancel availability. @returns {void} */
  function controls() {
    const available = models.controls(state());
    for (const name of ["pause", "resume", "cancel"]) {
      elements[name].disabled = !available[name];
      elements[name].hidden = false;
    }
    background();
  }

  /** Renders count summaries. @param {object|null} catalog - Catalog or current state. @returns {void} */
  function summary(catalog = state().catalog) {
    const values = models.summary({
      ...state(),
      catalog
    });
    elements.summaryPosts.textContent = String(values.posts);
    elements.summaryImages.textContent = String(values.images);
    elements.summaryBands.textContent = String(values.bands);
  }

  /** Renders the localized process description. @returns {void} */
  function spec() {
    const fragment = clone("specTemplate");
    fragment.querySelector("p").textContent = t("archiveSpecIntro");
    const items = t("archiveSpecItems");
    if (Array.isArray(items)) {
      for (const item of items) {
        const node = clone("specItemTemplate");
        node.firstElementChild.textContent = item;
        fragment.querySelector("ol").append(node);
      }
    }
    elements.spec.replaceChildren(fragment);
  }

  /** Renders the current catalog or empty/session state. @param {object|null} catalog - Catalog or live state. @returns {void} */
  function results(catalog = state().catalog) {
    elements.results.replaceChildren();
    const session = state().session;
    let next = t("archiveSessionComplete");
    if (session?.status === "paused") {
      next = t("archiveSessionContinue");
    }
    if (!catalog) {
      let text = t("archiveResultsEmpty");
      if (session) {
        text = t("archiveSessionMeta", {
          next,
          exported: session.exportedPosts || 0
        });
      }
      elements.results.append(note(text));
      return;
    }
    const fragment = clone("resultTemplate");
    fragment.querySelector("strong").textContent = t("archiveResultsTitle", {
      count: catalog.posts.length
    });
    fragment.querySelector('[data-slot="meta"]').textContent = t("archiveResultsMeta", {
      from: catalog.summary?.from || "—",
      to: catalog.summary?.to || "—",
      images: catalog.summary?.imageCount || 0,
      skipped: catalog.summary?.skippedImageCount || 0
    });
    const sourceNote = fragment.querySelector('[data-slot="source"]');
    const mode = catalog.manifest?.threadImport?.entryMode;
    if (mode === "reply") {
      sourceNote.textContent = t("archiveThreadUrlImportedReplyShort");
    } else if (mode === "root") {
      sourceNote.textContent = t("archiveThreadUrlImportedRootShort");
    } else {
      sourceNote.remove();
    }
    fragment.querySelector('[data-slot="resume"]').textContent = t("archiveSessionMeta", {
      next,
      exported: session?.exportedPosts || catalog.posts.length
    });
    const zipButton = fragment.querySelector('[data-action="zip"]');
    const htmlButton = fragment.querySelector('[data-action="html"]');
    const pdfButton = fragment.querySelector('[data-action="pdf"]');
    zipButton.textContent = t("archiveDownloadZipButton");
    pdfButton.textContent = t("archiveDownloadPdfButton");
    htmlButton.textContent = t("archiveDownloadHtmlButton");
    htmlButton.title = t("archiveDownloadHtmlButton");
    const buttons = {
      zipButton,
      pdfButton
    };
    if (dependencies.tooLarge(catalog)) {
      htmlButton.disabled = true;
      htmlButton.textContent = t("archiveExportHtmlTooLargeButton");
      htmlButton.title = t("archiveExportHtmlTooLargeTitle");
    } else {
      buttons.htmlButton = htmlButton;
    }
    dependencies.bindResult(buttons, {
      zipClick: () => {
        void dependencies.zip(catalog);
      },
      htmlClick: () => {
        void dependencies.html(catalog);
      },
      pdfClick: () => {
        void dependencies.pdf(catalog);
      }
    });
    elements.results.append(fragment);
  }

  /** Renders full-HTML export size availability. @returns {void} */
  function htmlButtons() {
    const tooLarge = dependencies.tooLarge(state().catalog);
    let label = t("archiveExportHtmlButton");
    let title = label;
    if (tooLarge) {
      label = t("archiveExportHtmlTooLargeButton");
      title = t("archiveExportHtmlTooLargeTitle");
    }
    for (const button of elements.htmlButtons) {
      if (button) {
        button.textContent = label;
        button.title = title;
        button.disabled = tooLarge;
      }
    }
  }

  /** Renders the complete archive workspace in the existing order. @returns {void} */
  function render() {
    dependencies.scope();
    source();
    spec();
    summary();
    results();
    elements.nextWave.disabled = !state().account || models.active(state());
    if (elements.mediaExport) {
      elements.mediaExport.disabled = !state().account;
    }
    htmlButtons();
    actionButtons();
    controls();
    status();
    hint();
    heartbeat();
    preview();
    dependencies.progress(state().job || {});
  }
  return {
    source,
    progress,
    preview,
    heartbeat,
    background,
    status,
    hint,
    actionButtons,
    controls,
    summary,
    spec,
    results,
    htmlButtons,
    render
  };
}

/**
 * Creates idempotent archive card arrangement using existing controls and templates.
 * @param {object} elements - Initialized workspace, source/band/load/media/progress/thread/spec controls, hashtags and action buttons.
 * @param {object} templates - Export, tools, content, actions and note templates.
 * @param {Function} t - Resolves current translated card and help labels.
 * @returns {{ensure: Function}} Arranges the workspace while retaining input/button identities.
 */
export function createArchiveWorkspaceLayout(elements, templates, t) {
  if (!elements || typeof t !== "function") {
    throw new TypeError("Archive layout requires elements and translations.");
  }
  for (const name of ["exportTemplate", "toolsTemplate", "contentTemplate", "actionsTemplate", "noteTemplate"]) {
    if (!templates?.[name]?.content) {
      throw new TypeError(`Archive layout requires ${name}.`);
    }
  }
  const archiveWorkspace = elements.workspace;
  const archiveSourceInput = elements.source;
  const archiveBandSizeSelect = elements.band;
  const archiveNextWaveButton = elements.nextWave;
  const archiveMediaActorInput = elements.mediaActor;
  const archiveProgressTitle = elements.progressTitle;
  const archiveThreadUrlInput = elements.threadUrl;
  const archiveSpecContent = elements.spec;
  const archiveHashtagSlot = elements.hashtags;
  const archiveWaveSizeSelect = elements.waveSize;
  const archiveActionsExportHtmlButton = elements.exportHtml;
  const archiveActionsExportHtmlCompactButton = elements.exportCompact;
  const archiveActionsExportPdfButton = elements.exportPdf;
  const archiveImportButton = elements.importButton;
  const archiveResetButton = elements.reset;
  const archiveProgressExportHtmlCompactButton = elements.progressCompact;
  /** Clones one layout structure. @param {string} name - Template property. @returns {HTMLElement} Detached root. */
  function clone(name) {
    return templates[name].content.firstElementChild.cloneNode(true);
  }
  /** Updates card labels and help accessibility text. @param {HTMLElement} root - Created card or heading. @returns {void} */
  function localize(root) {
    for (const node of root.querySelectorAll("[data-i18n]")) {
      node.textContent = t(node.dataset.i18n);
    }
    for (const button of root.querySelectorAll(".help-trigger")) {
      button.setAttribute("aria-label", t("helpButton"));
      button.title = t("helpButton");
    }
  }
  /** Moves controls into the existing archive grid without cloning listeners or values. @returns {void} */
  function ensureArchiveWorkspaceLayout() {
    const archiveGrid = archiveWorkspace?.querySelector(".archive-grid");
    if (!archiveGrid) {
      return;
    }
    archiveGrid.classList.add("archive-layout-grid");
    const scopeCard = archiveSourceInput?.closest(".archive-card");
    const pdfCard = archiveBandSizeSelect?.closest(".archive-card");
    const loadCard = archiveNextWaveButton?.closest(".archive-card");
    const mediaCard = archiveMediaActorInput?.closest(".archive-card");
    const progressCard = archiveProgressTitle?.closest(".archive-card");
    const threadCard = archiveThreadUrlInput?.closest(".archive-card");
    const specCard = archiveSpecContent?.closest(".archive-card");
    const hashtagSlot = archiveHashtagSlot;
    const waveSizeLabel = archiveWaveSizeSelect?.closest("label");
    const startHint = elements.startHint;
    const exportZipButton = elements.exportZip;
    const exportHtmlButton = archiveActionsExportHtmlButton;
    const exportHtmlCompactButton = archiveActionsExportHtmlCompactButton;
    const exportPdfButton = archiveActionsExportPdfButton;
    const importButton = archiveImportButton;
    const resetButton = archiveResetButton;
    const actionsNote = loadCard?.querySelector('[data-i18n="archiveActionsNote"]') || archiveGrid.querySelector("#archive-export-card [data-i18n='archiveActionsNote']");
    const threadScriptHelp = threadCard?.querySelector(".archive-script-help");
    const progressCompactButtonRow = archiveProgressExportHtmlCompactButton?.closest(".archive-run-controls");
    const hiddenProgressScriptHelp = progressCard?.querySelector(".archive-script-help");
    if (!scopeCard || !pdfCard || !loadCard || !mediaCard || !progressCard || !threadCard || !specCard || !hashtagSlot || !waveSizeLabel || !startHint || !exportZipButton || !exportHtmlButton || !exportHtmlCompactButton || !exportPdfButton || !importButton || !resetButton) {
      return;
    }
    progressCompactButtonRow?.remove();
    hiddenProgressScriptHelp?.remove();
    scopeCard.classList.add("archive-content-card");
    loadCard.classList.remove("archive-actions-card");
    loadCard.classList.add("archive-load-card");
    pdfCard.classList.add("archive-export-config-card");
    threadCard.classList.remove("archive-actions-card");
    mediaCard.classList.remove("archive-actions-card");
    const scopeEyebrow = scopeCard.querySelector(".eyebrow");
    if (scopeEyebrow) {
      scopeEyebrow.dataset.i18n = "archiveContentEyebrow";
      scopeEyebrow.textContent = t("archiveContentEyebrow");
    }
    const scopeTitle = scopeCard.querySelector("h3");
    if (scopeTitle) {
      scopeTitle.dataset.i18n = "archiveContentTitle";
      scopeTitle.textContent = t("archiveContentTitle");
    }
    const pdfEyebrow = pdfCard.querySelector(".eyebrow");
    if (pdfEyebrow) {
      pdfEyebrow.dataset.i18n = "archiveExportConfigEyebrow";
      pdfEyebrow.textContent = t("archiveExportConfigEyebrow");
    }
    const pdfTitle = pdfCard.querySelector("h3");
    if (pdfTitle) {
      pdfTitle.dataset.i18n = "archiveExportConfigTitle";
      pdfTitle.textContent = t("archiveExportConfigTitle");
    }
    const loadEyebrow = loadCard.querySelector(".eyebrow");
    if (loadEyebrow) {
      loadEyebrow.dataset.i18n = "archiveLoadEyebrow";
      loadEyebrow.textContent = t("archiveLoadEyebrow");
    }
    const loadTitle = loadCard.querySelector("h3");
    if (loadTitle) {
      loadTitle.dataset.i18n = "archiveLoadTitle";
      loadTitle.textContent = t("archiveLoadTitle");
    }
    let exportCard = archiveGrid.querySelector("#archive-export-card");
    if (!exportCard) {
      exportCard = clone("exportTemplate");
      localize(exportCard);
    }
    const exportActions = exportCard.querySelector(".archive-actions");
    const exportNote = exportCard.querySelector('[data-i18n="archiveActionsNote"]');
    if (actionsNote?.parentElement === loadCard) {
      actionsNote.remove();
    }
    let toolsHeading = archiveGrid.querySelector("#archive-tools-heading");
    if (!toolsHeading) {
      toolsHeading = clone("toolsTemplate");
      localize(toolsHeading);
    }
    let loadNote = loadCard.querySelector('[data-i18n="archiveLoadNote"]');
    if (!loadNote) {
      loadNote = clone("noteTemplate");
      loadNote.className = "settings-note";
      loadNote.dataset.i18n = "archiveLoadNote";
      loadNote.textContent = t("archiveLoadNote");
    }
    let waveSizeHelp = loadCard.querySelector('[data-i18n="archiveWaveSizeHelp"]');
    if (!waveSizeHelp) {
      waveSizeHelp = clone("noteTemplate");
      waveSizeHelp.className = "settings-note";
      waveSizeHelp.dataset.i18n = "archiveWaveSizeHelp";
      waveSizeHelp.textContent = t("archiveWaveSizeHelp");
    }
    let contentLayout = scopeCard.querySelector(".archive-content-layout");
    let contentMain = scopeCard.querySelector(".archive-content-main");
    let contentFilters = scopeCard.querySelector(".archive-content-filters");
    if (!contentLayout || !contentMain || !contentFilters) {
      contentLayout = clone("contentTemplate");
      contentMain = contentLayout.querySelector(".archive-content-main");
      contentFilters = contentLayout.querySelector(".archive-content-filters");
      const scopeChildren = Array.from(scopeCard.children).filter(child => !child.classList.contains("eyebrow") && !child.classList.contains("help-heading"));
      scopeChildren.forEach(child => {
        if (child !== hashtagSlot) {
          contentMain.appendChild(child);
        }
      });
      contentFilters.appendChild(hashtagSlot);
      scopeCard.append(contentLayout);
      contentLayout.append(contentMain, contentFilters);
    } else if (hashtagSlot.parentElement !== contentFilters) {
      contentFilters.appendChild(hashtagSlot);
    }
    const loadChildren = Array.from(loadCard.children).filter(child => !child.classList.contains("eyebrow") && !child.classList.contains("help-heading"));
    const existingLoadActions = loadCard.querySelector(".archive-actions");
    if (existingLoadActions) {
      existingLoadActions.remove();
    }
    loadChildren.forEach(child => {
      if (child !== startHint && child !== waveSizeLabel && child !== waveSizeHelp && child !== loadNote && child !== actionsNote) {
        child.remove();
      }
    });
    const loadActions = clone("actionsTemplate");
    loadActions.className = "archive-actions";
    loadActions.append(archiveNextWaveButton, importButton, resetButton);
    loadCard.append(startHint, waveSizeLabel, waveSizeHelp, loadActions, loadNote);
    if (exportActions) {
      exportActions.append(exportZipButton, exportHtmlButton, exportHtmlCompactButton, exportPdfButton);
    }
    if (exportNote) {
      exportNote.textContent = t("archiveActionsNote");
    }
    threadScriptHelp?.remove();
    if (threadScriptHelp && threadScriptHelp.parentElement !== specCard) {
      specCard.appendChild(threadScriptHelp);
    }
    archiveGrid.append(progressCard, scopeCard, loadCard, pdfCard, exportCard, toolsHeading, threadCard, mediaCard, specCard);
  }
  return {
    ensure: ensureArchiveWorkspaceLayout
  };
}
