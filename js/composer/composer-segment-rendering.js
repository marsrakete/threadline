/**
 * Owns the complete Composer segment render pass with explicit state and UI adapters.
 * @param {object} elements - Source/toggles, list/pane, labels and segment/help templates.
 * @param {object} options - State access, splitting, media, mentions, persistence and interaction dependencies.
 * @returns {object} Render operation and current mention-render generation.
 */
export function createComposerSegmentRenderer(elements, options) {
  const { sourceText, counterToggle, threadIntroToggle, threadEmojiToggle, markerSpacingToggle,
    characterCount, segmentSummary, segmentsPane, segmentsList, segmentTemplate, helpTemplate } = elements;
  const { document, getState, setState, clearMentionSync, getDragState,
    buildComposedText, getSelectedHashtagText, splitIntoSegments, normalizeSegmentOverrides,
    syncSegmentImages, syncSegmentLinkCards, formatComposerCharacterCount, t,
    updateComposerLengthWarning, normalizeLinkCard, getFirstHttpUrl, MAX_IMAGES_PER_SEGMENT,
    eventHasTransferFiles, getDroppedImageFiles, handleSegmentImageSelection,
    updateSegmentLengthPresentation, scheduleSegmentMentionDisplayUpdate, setComposerLocked,
    setComposerPosted, updatePublishAvailability, queueDraftSave, autoSizeTextarea,
    openInlineHelpTopic, openLinkCardDialog, canCreateLinkCardsWithCurrentProvider,
    getLinkCardTargetEntries, renderSegmentLinkCard, renderSegmentImages,
    updateSegmentMentionDisplay, scheduleSegmentTextareaResize, requestAnimationFrame } = options;
  let mentionVersion = 0;
  /**
   * Rebuilds all section cards, synchronizes attached media and preserves overrides/scroll on request.
   * @param {object} settings - preserveOverrides, preserveView and animate flags.
   * @returns {void}
   */
  function renderSegments(settings = {}) {
    const state = getState();
    let segmentOverrides = state.segmentOverrides;
    const hashtagPlacement = state.hashtagPlacement;
    const {
      preserveOverrides = Boolean(segmentOverrides),
      preserveView = true,
      animate = false,
    } = settings;
    let previousScrollTop = 0;
    if (preserveView && segmentsPane) { previousScrollTop = segmentsPane.scrollTop; }
    const currentMentionVersion = ++mentionVersion;
    const text = sourceText.value;
    const useCounters = counterToggle.checked;
    const appendThreadIntro = threadIntroToggle.checked;
    const appendThreadEmoji = threadEmojiToggle.checked;
    const addMarkerSpacing = markerSpacingToggle.checked;
    const currentComposedText = buildComposedText(text);
    const selectedHashtagText = getSelectedHashtagText();
    let generatedSegments = [];
    if (currentComposedText.trim()) {
      generatedSegments = splitIntoSegments(currentComposedText, useCounters, appendThreadIntro,
        appendThreadEmoji, addMarkerSpacing, hashtagPlacement, selectedHashtagText);
    }
    if (!preserveOverrides) {
      clearMentionSync();
    }
    let activeSegments = generatedSegments;
    if (preserveOverrides) {
      activeSegments = normalizeSegmentOverrides(segmentOverrides) || generatedSegments;
      segmentOverrides = normalizeSegmentOverrides(activeSegments);
    } else {
      segmentOverrides = null;
    }
    setState({ activeSegments, segmentOverrides, appendThreadIntro, appendThreadEmoji, addMarkerSpacing, currentComposedText });
    syncSegmentImages(activeSegments.length);
    syncSegmentLinkCards(activeSegments.length);
    const { segmentImages, segmentLinkCards } = getState();

    characterCount.textContent = formatComposerCharacterCount(text);

    if (!text.trim()) {
      segmentSummary.textContent = t("summarySingle");
    } else if (activeSegments.length > 1) {
      segmentSummary.textContent = t("summaryMultiple", { count: activeSegments.length });
    } else {
      segmentSummary.textContent = t("summarySingle");
    }

    segmentsPane.hidden = activeSegments.length === 0;
    updateComposerLengthWarning(activeSegments);
    segmentsList.replaceChildren();

    activeSegments.forEach((segment, index) => {
      const segmentContext = createComposerSegmentRenderContext(segmentTemplate, document);
      const fragment = segmentContext.fragment;
      const card = segmentContext.card;
      const indexLabel = segmentContext.indexLabel;
      const lengthLabel = segmentContext.lengthLabel;
      const warningLabel = segmentContext.warningLabel;
      const textarea = segmentContext.textarea;
      const mentionContainer = segmentContext.mentionContainer;
      const addImagesButton = segmentContext.addImagesButton;
      const linkCardContainer = segmentContext.linkCardContainer;
      const imageContainer = segmentContext.imageContainer;
      const segmentRenderState = buildComposerSegmentRenderState(
        segment,
        index,
        segmentImages[index],
        normalizeLinkCard(segmentLinkCards[index]),
        getFirstHttpUrl(segment),
        MAX_IMAGES_PER_SEGMENT,
      );
      const existingImages = segmentRenderState.existingImages;
      const remainingSlots = segmentRenderState.remainingImageSlots;
      const input = segmentContext.fileInput;
      input.multiple = remainingSlots > 1;
      input.className = "is-hidden";

      if (animate) {
        card.classList.add("is-entering");
        card.style.animationDelay = `${index * 55}ms`;
      } else {
        card.classList.remove("is-entering");
        card.style.animationDelay = "0ms";
      }
      indexLabel.textContent = t("segmentPart", { index: index + 1 });
      textarea.value = segment;
      updateSegmentLengthPresentation(lengthLabel, warningLabel, segment);
      addImagesButton.textContent = t("addImagesButton");
      addImagesButton.hidden = existingImages.length >= MAX_IMAGES_PER_SEGMENT || Boolean(normalizeLinkCard(segmentLinkCards[index]));
      bindComposerSegmentInteractions(segmentContext, {
        index,
        activeSegments,
        segmentImageDragState: getDragState,
        eventHasTransferFiles,
        getDroppedImageFiles,
        handleSegmentImageSelection,
        updateSegmentLengthPresentation,
        updateComposerLengthWarning,
        scheduleSegmentMentionDisplayUpdate,
        normalizeSegmentOverrides: (segments) => {
          const overrides = normalizeSegmentOverrides(segments);
          setState({ segmentOverrides: overrides });
          return overrides;
        },
        setComposerLocked,
        setComposerPosted,
        updatePublishAvailability,
        queueDraftSave,
        autoSizeTextarea,
      });
      if (index === 0) {
        const helpFragment = helpTemplate.content.cloneNode(true);
        const imageHelpButton = helpFragment.querySelector("button");
        imageHelpButton.setAttribute("aria-label", t("contextHelpButtonLabel"));
        imageHelpButton.setAttribute("title", t("contextHelpButtonLabel"));
        segmentContext.contextHelpButton = imageHelpButton;
        bindComposerSegmentContextHelp(imageHelpButton, openInlineHelpTopic);
        addImagesButton.after(helpFragment);
      }
      bindComposerSegmentLinkCardInteractions(segmentContext, segmentRenderState, {
        translate: t,
        openLinkCardDialog,
        canCreateLinkCards: canCreateLinkCardsWithCurrentProvider(),
        linkCardTargetEntries: getLinkCardTargetEntries(index),
      });
      renderSegmentLinkCard(linkCardContainer, index);
      renderSegmentImages(imageContainer, index);
      void updateSegmentMentionDisplay(index, mentionContainer, segment, currentMentionVersion);

      segmentsList.appendChild(fragment);
      autoSizeTextarea(segmentsList.lastElementChild.querySelector(".segment-text"));
    });

    if (preserveView && segmentsPane) {
      segmentsPane.scrollTop = previousScrollTop;
    }
    scheduleSegmentTextareaResize();
    if (preserveView && segmentsPane) {
      requestAnimationFrame(() => {
        if (segmentsPane) {
          segmentsPane.scrollTop = previousScrollTop;
        }
      });
    }
    updatePublishAvailability();
  }
  /**
   * Reads the render generation used to discard stale mention results.
   * @returns {number} Current generation.
   */
  function getMentionVersion() { return mentionVersion; }
  return { render: renderSegments, getMentionVersion };
}

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
 * Binds the context-help action for a rendered Composer segment.
 * @param {HTMLElement|null} button - Segment context-help button.
 * @param {(topic: string) => void} openContextHelp - Help-opening callback.
 * @returns {boolean} True when the listener was bound.
 */
export function bindComposerSegmentContextHelp(button, openContextHelp) {
  if (!button || typeof openContextHelp !== "function") {
    return false;
  }
  button.addEventListener("click", () => {
    openContextHelp("segment_images");
  });
  return true;
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

/**
 * Creates segment and thread length-warning presentation from explicit diagnostics.
 * @param {object} options - Diagnostics, label formatter, translations, limits and aggregate warning node.
 * @returns {{segment: Function, thread: Function}} Length-warning display operations.
 */
export function createComposerLengthPresentationController(options) {
  const {
    getDiagnostics: getSegmentLengthDiagnostics,
    formatLabel: formatSegmentLengthLabel, translate: t,
    graphemeLimit: MAX_POST_LENGTH, byteLimit: MAX_POST_UTF8_BYTES,
    warning: composerLengthWarning,
  } = options;

  /**
   * Builds a segment-specific warning message when Bluesky length deserves extra attention.
   * @param {object} diagnostics - Result from getSegmentLengthDiagnostics.
   * @returns {string} Warning text, or an empty string when no warning is needed.
   */
  function buildSegmentLengthWarning(diagnostics) {
    const parts = [];

    if (diagnostics.exceedsGraphemeLimit && diagnostics.exceedsByteLimit) {
      parts.push(t("segmentLengthWarningOverflowBoth", {
        graphemeCount: diagnostics.graphemeCount,
        graphemeLimit: MAX_POST_LENGTH,
        byteCount: diagnostics.utf8ByteCount,
        byteLimit: MAX_POST_UTF8_BYTES,
      }));
    } else if (diagnostics.exceedsGraphemeLimit) {
      parts.push(t("segmentLengthWarningOverflow", {
        count: diagnostics.graphemeCount,
        limit: MAX_POST_LENGTH,
      }));
    } else if (diagnostics.exceedsByteLimit) {
      parts.push(t("segmentLengthWarningOverflowBytes", {
        count: diagnostics.utf8ByteCount,
        limit: MAX_POST_UTF8_BYTES,
      }));
    } else if (diagnostics.isNearLimit && diagnostics.hasComplexDifference) {
      parts.push(t("segmentLengthWarningComplexNearLimit", {
        count: diagnostics.graphemeCount,
        limit: MAX_POST_LENGTH,
      }));
    } else if (diagnostics.isNearByteLimit) {
      parts.push(t("segmentLengthWarningByteNearLimit", {
        count: diagnostics.utf8ByteCount,
        limit: MAX_POST_UTF8_BYTES,
      }));
    } else if (diagnostics.hasComplexDifference && diagnostics.graphemeCount >= (MAX_POST_LENGTH - 5)) {
      parts.push(t("segmentLengthWarningComplex", {
        count: diagnostics.graphemeCount,
        limit: MAX_POST_LENGTH,
      }));
    }

    if (parts.length === 0) {
      return "";
    }

    if (diagnostics.isNearByteLimit && !diagnostics.exceedsLimit) {
      return parts.join(" ");
    }

    const advice = diagnostics.adviceKeys.map((key) => t(key)).join(" ");
    parts.push(advice);
    return parts.join(" ");
  }

  /**
   * Updates one segment card with Bluesky-aware length labels and warnings.
   * @param {HTMLElement|null} lengthLabel - Badge element that shows the segment length.
   * @param {HTMLElement|null} warningLabel - Note element for extra guidance.
   * @param {string} text - Current segment text.
   * @returns {object} Segment diagnostics used for additional aggregate warnings.
   */
  function updateSegmentLengthPresentation(lengthLabel, warningLabel, text) {
    const diagnostics = getSegmentLengthDiagnostics(text);
    const warningText = buildSegmentLengthWarning(diagnostics);

    if (lengthLabel) {
      lengthLabel.textContent = formatSegmentLengthLabel(diagnostics);
      let tone = "neutral";
      if (diagnostics.exceedsLimit) {
        tone = "error";
      }
      lengthLabel.dataset.tone = tone;
    }

    if (warningLabel) {
      warningLabel.hidden = warningText.length === 0;
      warningLabel.textContent = warningText;
      let tone = "neutral";
      if (diagnostics.exceedsLimit) {
        tone = "error";
      }
      warningLabel.dataset.tone = tone;
    }

    return diagnostics;
  }

  /**
   * Updates the composer-wide note when one or more segments are risky in Bluesky counting.
   * @param {string[]} segments - Current thread segments.
   * @returns {void} No return value.
   */
  function updateComposerLengthWarning(segments) {
    if (!composerLengthWarning) {
      return;
    }

    const diagnosticsList = segments.map((segment) => getSegmentLengthDiagnostics(segment));
    const overflowCount = diagnosticsList.filter((entry) => entry.exceedsLimit).length;
    const nearComplexCount = diagnosticsList.filter((entry) => !entry.exceedsLimit && entry.isNearLimit && entry.hasComplexDifference).length;
    const nearByteCount = diagnosticsList.filter((entry) => !entry.exceedsLimit && entry.isNearByteLimit).length;
    const notes = [];

    if (overflowCount > 0) {
      notes.push(t("composerLengthWarningOverflow", { count: overflowCount }));
    }

    if (nearComplexCount > 0) {
      notes.push(t("composerLengthWarningNearLimit", { count: nearComplexCount }));
    }

    if (nearByteCount > 0) {
      notes.push(t("composerLengthWarningNearByteLimit", { count: nearByteCount }));
    }

    if (overflowCount > 0 || nearComplexCount > 0 || nearByteCount > 0) {
      notes.push(t("composerLengthWarningAdvice"));
    }

    composerLengthWarning.hidden = notes.length === 0;
    let tone = "neutral";
    if (overflowCount > 0) {
      tone = "error";
    }
    composerLengthWarning.dataset.tone = tone;
    composerLengthWarning.textContent = notes.join(" ");
  }

  return { segment: updateSegmentLengthPresentation, thread: updateComposerLengthWarning };
}

/**
 * Creates coalesced render and textarea-resize schedulers with private timer state.
 * @param {object} options - Render/resize callbacks and timer/animation-frame functions.
 * @returns {{render: Function, resize: Function}} Scheduling operations.
 */
export function createComposerRenderScheduler(options) {
  let renderTimer = 0;
  let renderFrame = 0;
  let resizeFrame = 0;
  /**
   * Replaces pending render work with one frame after an optional debounce.
   * @param {number} delayMs - Debounce duration; non-positive values schedule immediately.
   * @returns {void}
   */
  function render(delayMs = 0) {
    options.clearTimeout(renderTimer);
    if (renderFrame) {
      options.cancelFrame(renderFrame);
    }
    /**
     * Queues the final render in the next animation frame.
     * @returns {void}
     */
    function enqueue() {
      renderTimer = 0;
      renderFrame = options.requestFrame(() => {
        renderFrame = 0;
        options.render({ preserveOverrides: false, preserveView: true, animate: false });
      });
    }
    if (delayMs > 0) {
      renderTimer = options.setTimeout(enqueue, delayMs);
      return;
    }
    enqueue();
  }
  /**
   * Replaces pending resize work with one animation-frame callback.
   * @returns {void}
   */
  function resize() {
    if (resizeFrame) {
      options.cancelFrame(resizeFrame);
    }
    resizeFrame = options.requestFrame(() => {
      resizeFrame = 0;
      options.resize();
    });
  }
  return { render, resize };
}
/**
 * Fits one section textarea to its measured content height.
 * @param {HTMLTextAreaElement} textarea - Section editor.
 * @returns {void}
 */
export function autoSizeComposerTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/**
 * Resizes all section editors inside a rendered document.
 * @param {HTMLElement} container - Section list.
 * @returns {void}
 */
export function resizeComposerTextareas(container) {
  container.querySelectorAll(".segment-text").forEach(autoSizeComposerTextarea);
}
