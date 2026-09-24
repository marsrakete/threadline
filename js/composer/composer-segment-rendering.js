/**
 * Builds the derived state needed to render one Composer segment.
 * @param {string} segment - Segment text.
 * @param {number} index - Segment index.
 * @param {Array<object>} images - Existing segment images.
 * @param {object|null} linkCard - Existing segment link card.
 * @param {string} detectedUrl - URL detected in segment text.
 * @param {number} maxImages - Maximum images per segment.
 * @returns {object} Stable segment rendering state.
 */
export function buildComposerSegmentRenderState(segment = "", index = 0, images = [], linkCard = null, detectedUrl = "", maxImages = 4) {
  let existingImages = [];
  if (Array.isArray(images)) {
    existingImages = images;
  }
  let existingLinkCard = null;
  if (linkCard && typeof linkCard === "object") {
    existingLinkCard = linkCard;
  }
  let linkCardUrl = detectedUrl;
  if (!linkCardUrl && existingLinkCard) {
    linkCardUrl = String(existingLinkCard.url || "").trim();
  }
  return {
    segment,
    index,
    existingImages,
    remainingImageSlots: Math.max(0, maxImages - existingImages.length),
    existingLinkCard,
    linkCardUrl,
    hasImages: existingImages.length > 0,
    hasLinkCard: Boolean(existingLinkCard),
  };
}

/**
 * Clones the Composer segment template and returns its named DOM parts.
 * @param {HTMLTemplateElement} template - Segment template element.
 * @param {Document} documentObject - Document used to create auxiliary nodes.
 * @returns {object|null} Segment DOM context or null when the template is invalid.
 */
export function createComposerSegmentRenderContext(template, documentObject = null) {
  if (!documentObject && typeof globalThis !== "undefined") {
    documentObject = globalThis.document || null;
  }
  if (!template || !documentObject) {
    return null;
  }
  const fragment = template.content.cloneNode(true);
  const context = {
    fragment,
    card: fragment.querySelector(".segment-card"),
    indexLabel: fragment.querySelector(".segment-index"),
    lengthLabel: fragment.querySelector(".segment-length"),
    warningLabel: fragment.querySelector(".segment-warning"),
    textarea: fragment.querySelector(".segment-text"),
    mentionContainer: fragment.querySelector(".segment-mentions"),
    addImagesButton: fragment.querySelector(".segment-add-image-button"),
    linkCardButton: fragment.querySelector(".segment-link-card-button"),
    linkCardManualButton: fragment.querySelector(".segment-link-card-manual-button"),
    linkCardManageButton: fragment.querySelector(".segment-link-card-manage-button"),
    linkCardContainer: fragment.querySelector(".segment-link-card"),
    imageContainer: fragment.querySelector(".segment-images"),
  };
  if (!context.card || !context.textarea) {
    return null;
  }
  const input = documentObject.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.className = "is-hidden";
  context.fileInput = input;
  context.card.appendChild(input);
  return context;
}

/**
 * Binds generic text and image interactions to one Composer segment.
 * @param {object} context - Segment DOM context returned by createComposerSegmentRenderContext.
 * @param {object} options - Callbacks and state needed by the interactions.
 * @returns {object} The same context for continued segment setup.
 */
export function bindComposerSegmentInteractions(context, options = {}) {
  if (!context || !context.card || !context.textarea) {
    return context;
  }
  const index = Number.isInteger(options.index) ? options.index : 0;
  const input = context.fileInput;
  const hasTransferFiles = options.eventHasTransferFiles;
  const getDroppedFiles = options.getDroppedImageFiles;
  const handleImages = options.handleSegmentImageSelection;
  const updateLength = options.updateSegmentLengthPresentation;
  const updateWarning = options.updateComposerLengthWarning;
  const updateMentions = options.scheduleSegmentMentionDisplayUpdate;
  const normalizeOverrides = options.normalizeSegmentOverrides;
  const setLocked = options.setComposerLocked;
  const setPosted = options.setComposerPosted;
  const updateAvailability = options.updatePublishAvailability;
  const saveDraft = options.queueDraftSave;
  const autoSize = options.autoSizeTextarea;
  const activeSegments = options.activeSegments;

  context.textarea.addEventListener("input", () => {
    activeSegments[index] = context.textarea.value;
    normalizeOverrides(activeSegments);
    setLocked(true);
    setPosted(false);
    updateLength(context.lengthLabel, context.warningLabel, context.textarea.value);
    updateWarning(activeSegments);
    autoSize(context.textarea);
    updateMentions(index, context.mentionContainer, context.textarea.value);
    updateAvailability();
    saveDraft();
  });
  context.addImagesButton.addEventListener("click", () => {
    input.click();
  });
  input.addEventListener("change", async (event) => {
    await handleImages(index, event.target.files);
    event.target.value = "";
  });
  context.card.addEventListener("dragover", (event) => {
    if (options.segmentImageDragState() || !hasTransferFiles(event)) {
      return;
    }
    event.preventDefault();
    context.card.classList.add("is-file-drop-target");
  });
  context.card.addEventListener("dragleave", (event) => {
    const rect = context.card.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      context.card.classList.remove("is-file-drop-target");
    }
  });
  context.card.addEventListener("drop", (event) => {
    if (options.segmentImageDragState() || !hasTransferFiles(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const files = getDroppedFiles(event);
    context.card.classList.remove("is-file-drop-target");
    if (files.length > 0) {
      void handleImages(index, files);
    }
  });
  return context;
}

/**
 * Configures link-card buttons and their actions for one Composer segment.
 * @param {object} context - Segment DOM context returned by createComposerSegmentRenderContext.
 * @param {object} state - Derived segment state with link-card and image information.
 * @param {object} options - Translation, provider and dialog callbacks.
 * @returns {object} The same context after link-card wiring.
 */
export function bindComposerSegmentLinkCardInteractions(context, state = {}, options = {}) {
  if (!context || !context.linkCardButton) {
    return context;
  }
  const translate = options.translate;
  const openDialog = options.openLinkCardDialog;
  const available = options.canCreateLinkCards;
  const targetEntries = options.linkCardTargetEntries || [];
  const index = Number.isInteger(state.index) ? state.index : 0;
  const hasImages = state.hasImages === true;
  const existingLinkCard = state.existingLinkCard;
  const linkCardUrl = state.linkCardUrl || "";
  const linkCardAvailable = available === true;
  const button = context.linkCardButton;
  const manualButton = context.linkCardManualButton;
  const manageButton = context.linkCardManageButton;

  button.hidden = false;
  if (manualButton) {
    manualButton.hidden = false;
    manualButton.textContent = translate("linkCardManualButton");
  }
  if (manageButton) {
    manageButton.hidden = targetEntries.length === 0;
    manageButton.textContent = translate("linkCardManageButton");
    manageButton.disabled = hasImages;
    if (hasImages) {
      manageButton.title = translate("linkCardBlocksImages");
    } else {
      manageButton.title = translate("linkCardManageButton");
      manageButton.addEventListener("click", () => openDialog(index, "", "manage"));
    }
  }
  if (existingLinkCard) {
    button.textContent = translate("linkCardRefreshButton");
    button.disabled = !linkCardAvailable;
    if (!linkCardAvailable) {
      button.title = translate("linkCardMicrolinkLimitReached");
    } else {
      button.title = translate("linkCardRefreshButton");
      button.addEventListener("click", () => openDialog(index, linkCardUrl, "refresh"));
    }
    if (manualButton) {
      manualButton.disabled = !linkCardAvailable;
      if (!linkCardAvailable) {
        manualButton.title = translate("linkCardMicrolinkLimitReached");
      } else {
        manualButton.title = translate("linkCardManualButton");
        manualButton.addEventListener("click", () => openDialog(index, existingLinkCard.url || linkCardUrl, "refresh"));
      }
    }
    return context;
  }
  button.textContent = translate("linkCardDetectedButton");
  if (!linkCardAvailable) {
    button.disabled = true;
    button.title = translate("linkCardMicrolinkLimitReached");
    if (manualButton) {
      manualButton.disabled = true;
      manualButton.title = translate("linkCardMicrolinkLimitReached");
    }
    return context;
  }
  button.disabled = hasImages || !linkCardUrl;
  if (hasImages) {
    button.title = translate("linkCardBlocksImages");
  } else if (!linkCardUrl) {
    button.title = translate("linkCardNoUrl");
  } else {
    button.title = translate("linkCardDetectedButton");
    button.addEventListener("click", () => openDialog(index, linkCardUrl, "create"));
  }
  if (manualButton) {
    manualButton.disabled = hasImages;
    if (hasImages) {
      manualButton.title = translate("linkCardBlocksImages");
    } else {
      manualButton.title = translate("linkCardManualButton");
      manualButton.addEventListener("click", () => openDialog(index, "", "create"));
    }
  }
  return context;
}
