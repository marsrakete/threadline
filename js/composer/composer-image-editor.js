/**
 * Owns image-editor lifecycle, draft state, transforms, resize actions and events.
 * @param {object} elements - Existing dialog, sheet, canvas, zoom, status and action elements.
 * @param {object} options - Explicit collection, geometry, rendering, validation and persistence dependencies.
 * @returns {object} Editor operations, handlers and state access for Canvas, metrics and drag adapters.
 */
export function createComposerImageEditorController(elements, options) {
  const { dialog: imageEditorDialog, sheet: imageEditorSheet, canvas: imageEditorCanvas,
    zoomInput: imageZoomInput, status: imageEditorStatus,
    fitDimensionsButton: imageFitDimensionsButton, lossyResizeButton: imageLossyResizeButton } = elements;
  const { getImages, normalizeImageEdit, getImageEditorCanvasDimensions, clampImageEditToFrame,
    loadImageBitmapForDataUrl, isPortraitEditorImage, formatImageSize, t,
    IMAGE_BLOB_LIMIT, IMAGE_MIN_EXPORT_SCALE, IMAGE_MAX_DIMENSION,
    getImageMetrics, drawComposerImageEditor, validateThreadImage, persistSettings,
    preserveScrollPosition, renderSegments, queueDraftSave, createDefaultImageEdit,
    renderImageToBlob, getMetricsController, getDragController } = options;
  let editingImageTarget = null;
  let imageEditorSourceBitmap = null;
  let imageEditorDraft = null;
  let openVersion = 0;
  /**
   * Selects a localized resize status.
   * @param {boolean} failed - Validation failure.
   * @param {string} errorKey - Failure translation key.
   * @param {string} successKey - Success translation key.
   * @returns {string} Localized status.
   */
  function validationStatus(failed, errorKey, successKey) {
    if (failed) { return t(errorKey); }
    return t(successKey);
  }
  /**
   * Selects the validation status tone.
   * @param {boolean} failed - Validation failure.
   * @param {string} successTone - Nonfailure tone.
   * @returns {string} Tone.
   */
  function validationTone(failed, successTone) {
    if (failed) { return "error"; }
    return successTone;
  }
  /**
   * Copies and normalizes a persisted edit.
   * @param {object} edit - edit value used by the editor.
   * @returns {*} Resolved value.
   */
  function cloneImageEdit(edit) {
    return normalizeImageEdit({ ...edit });
  }

  /**
   * Reads the source bitmap dimensions.
   * @returns {*} Resolved value.
   */
  function getImageEditorSourceDimensions() {
    if (!imageEditorSourceBitmap) { return null; }
    return { width: imageEditorSourceBitmap.width, height: imageEditorSourceBitmap.height };
  }

  /**
   * Clamps the draft to the active image frame.
   * @param {object} image - image value used by the editor.
   * @param {object} draft - draft value used by the editor.
   * @returns {*} Resolved value.
   */
  function clampImageEditorDraftToFrame(image, draft = imageEditorDraft) {
    const canvasDimensions = getImageEditorCanvasDimensions(image, draft, getImageEditorSourceDimensions());
    return clampImageEditToFrame(
      image,
      canvasDimensions.width,
      canvasDimensions.height,
      draft,
      normalizeImageEdit(draft).fitMode,
      getImageEditorSourceDimensions(),
    );
  }

  /**
   * Loads the image and opens its editor.
   * @param {number} segmentIndex - segmentIndex value used by the editor.
   * @param {number} imageIndex - imageIndex value used by the editor.
   * @returns {Promise<void>}
   */
  async function openImageEditorDialog(segmentIndex, imageIndex) {
    const image = getImages()[segmentIndex]?.[imageIndex];
    if (!image) {
      return;
    }
    const requestVersion = ++openVersion;
    const bitmap = await loadImageBitmapForDataUrl(image.dataUrl);
    if (requestVersion !== openVersion) {
      bitmap?.close?.();
      return;
    }
    imageEditorSourceBitmap?.close?.();
    getDragController().stop();
    getMetricsController().invalidate();
    editingImageTarget = { segmentIndex, imageIndex };
    imageEditorSourceBitmap = bitmap;
    imageEditorDraft = cloneImageEdit(image.edit);
    imageEditorDraft = clampImageEditorDraftToFrame(image, imageEditorDraft);
    imageZoomInput.value = String(imageEditorDraft.zoom);
    setImageEditorStatus(getImageEditorValidationMessage(image), validationTone(image.validation?.tooBig, ""));
    updateImageEditorActionState(image);
    drawImageEditor();
    imageEditorDialog.showModal();
  }

  /**
   * Closes the editor and releases its bitmap and metrics.
   * @returns {void}
   */
  function closeImageEditorDialog() {
    openVersion += 1;
    getDragController().stop();
    editingImageTarget = null;
    imageEditorSourceBitmap?.close?.();
    imageEditorSourceBitmap = null;
    imageEditorDraft = null;
    getMetricsController().invalidate();
    setImageEditorStatus("");
    imageEditorSheet?.classList.remove("is-portrait-image");
    imageEditorDialog.close();
  }

  /**
   * Resolves the active image in the current collection.
   * @returns {*} Resolved value.
   */
  function getEditedImage() {
    if (!editingImageTarget) {
      return null;
    }
    return getImages()[editingImageTarget.segmentIndex]?.[editingImageTarget.imageIndex] || null;
  }

  /**
   * Formats nonnegative pixel dimensions.
   * @param {number} width - width value used by the editor.
   * @param {number} height - height value used by the editor.
   * @returns {*} Resolved value.
   */
  function formatImageDimensions(width, height) {
    const safeWidth = Math.max(0, Math.round(Number(width) || 0));
    const safeHeight = Math.max(0, Math.round(Number(height) || 0));
    if (safeWidth && safeHeight) { return `${safeWidth} x ${safeHeight} px`; }
    return "-";
  }

  /**
   * Updates the localized editor status and tone.
   * @param {string} message - message value used by the editor.
   * @param {string} tone - tone value used by the editor.
   * @returns {void}
   */
  function setImageEditorStatus(message = "", tone = "") {
    if (!imageEditorStatus) {
      return;
    }
    imageEditorStatus.textContent = message;
    if (tone) {
      imageEditorStatus.dataset.tone = tone;
    } else {
      delete imageEditorStatus.dataset.tone;
    }
  }

  /**
   * Creates an export image without mutating the persisted edit.
   * @param {object} image - image value used by the editor.
   * @returns {*} Resolved value.
   */
  function getImageEditorDraftImage(image = getEditedImage()) {
    if (!image || !imageEditorDraft) {
      return null;
    }
    return {
      ...image,
      edit: clampImageEditorDraftToFrame(image, { ...imageEditorDraft }),
    };
  }

  /**
   * Updates resize availability from image validation.
   * @param {object} image - image value used by the editor.
   * @returns {void}
   */
  function updateImageEditorActionState(image = getEditedImage()) {
    const validation = image?.validation || {};
    const exceedsDimensions = Boolean(validation.exceedsDimensions);
    imageFitDimensionsButton.disabled = !exceedsDimensions;
    imageLossyResizeButton.hidden = !validation.tooBig;
  }

  /**
   * Formats the current image validation issue.
   * @param {object} image - image value used by the editor.
   * @returns {*} Resolved value.
   */
  function getImageEditorValidationMessage(image = getEditedImage()) {
    const validation = image?.validation || {};
    if (validation.exceedsDimensions) {
      return t("imageEditorDimensionsTooLarge", {
        width: validation.width || image?.width || 0,
        height: validation.height || image?.height || 0,
      });
    }
    if ((Number(validation.sizeBytes) || 0) > IMAGE_BLOB_LIMIT) {
      return t("imageEditorFileTooLarge", {
        size: formatImageSize(validation.sizeBytes),
      });
    }
    return "";
  }

  /**
   * Updates the editor dimensions and export size.
   * @param {object} options - Optional renderBlob flag.
   * @returns {Promise<void>}
   */
  async function updateImageEditorMetrics(options = {}) { await getMetricsController().update(options); }

  /**
   * Debounces the editor metrics update.
   * @returns {void}
   */
  function scheduleImageEditorMetricsUpdate() { getMetricsController().schedule(); }

  /**
   * Draws the editor frame through the Canvas renderer module.
   * @returns {void}
   */
  function drawImageEditor() {
    const image = getEditedImage();
    if (image && imageEditorDraft) {
      const source = getImageEditorSourceDimensions();
      const dimensions = getImageEditorCanvasDimensions(image, imageEditorDraft, source);
      if (imageEditorCanvas.width !== dimensions.width) {
        imageEditorCanvas.width = dimensions.width;
      }
      if (imageEditorCanvas.height !== dimensions.height) {
        imageEditorCanvas.height = dimensions.height;
      }
      imageEditorSheet?.classList.toggle("is-portrait-image", isPortraitEditorImage(image, imageEditorDraft, source));
    }
    drawComposerImageEditor(imageEditorCanvas, getEditedImage(), imageEditorSourceBitmap, imageEditorDraft, {
      getMetrics: getImageMetrics, normalizeEdit: normalizeImageEdit,
      getSourceDimensions: getImageEditorSourceDimensions, scheduleMetrics: scheduleImageEditorMetricsUpdate,
    });
  }

  /**
   * Starts dragging the editor image.
   * @param {PointerEvent} event - Pointer coordinates.
   * @returns {void}
   */
  function startImageEditorDrag(event) { getDragController().start(event); }

  /**
   * Applies the editor pointer movement.
   * @param {PointerEvent} event - Pointer coordinates.
   * @returns {void}
   */
  function updateImageEditorDrag(event) { getDragController().update(event); }

  /**
   * Ends editor dragging.
   * @returns {void}
   */
  function stopImageEditorDrag() { getDragController().stop(); }

  /**
   * Persists image changes, rerenders without losing text overrides and queues the draft.
   * @returns {Promise<void>}
   */
  async function persistImageChanges() {
    await persistSettings();
    preserveScrollPosition(() => {
      renderSegments({ preserveOverrides: true });
    });
    queueDraftSave();
  }

  /**
   * Validates and persists the draft, rerenders and closes the editor.
   * @returns {Promise<void>}
   */
  async function saveImageEditor() {
    const image = getEditedImage();
    if (!image || !imageEditorDraft) {
      closeImageEditorDialog();
      return;
    }
    image.edit = clampImageEditorDraftToFrame(image, {
      ...imageEditorDraft,
    });
    await validateThreadImage(image);
    await persistImageChanges();
    closeImageEditorDialog();
  }

  /**
   * Restores the default edit and redraws.
   * @returns {void}
   */
  function resetImageEditor() {
    const image = getEditedImage();
    if (!image) {
      return;
    }
    imageEditorDraft = clampImageEditorDraftToFrame(image, {
      ...createDefaultImageEdit(),
    });
    imageZoomInput.value = String(imageEditorDraft.zoom);
    drawImageEditor();
  }

  /**
   * Mirrors the selected axis and its offset.
   * @param {object} draft - draft value used by the editor.
   * @param {string} axis - axis value used by the editor.
   * @returns {*} Resolved value.
   */
  function transformImageEditorDraftForFlip(draft, axis = "x") {
    const next = normalizeImageEdit(draft);
    if (axis === "x") { next.flipX = !next.flipX; next.offsetX = -next.offsetX; }
    if (axis === "y") { next.flipY = !next.flipY; next.offsetY = -next.offsetY; }
    return next;
  }
  /**
   * Rotates the edit and offsets by one quarter turn.
   * @param {object} draft - draft value used by the editor.
   * @param {string} direction - direction value used by the editor.
   * @returns {*} Resolved value.
   */
  function transformImageEditorDraftForQuarterTurn(draft, direction = "left") {
    const next = normalizeImageEdit(draft);
    if (direction === "right") {
      return { ...next, rotation: (next.rotation + 90) % 360, offsetX: -next.offsetY, offsetY: next.offsetX };
    }
    return { ...next, rotation: (next.rotation + 270) % 360, offsetX: next.offsetY, offsetY: -next.offsetX };
  }
  /**
   * Reduces export quality and scale, validates and persists.
   * @returns {Promise<void>}
   */
  async function applyLossyResize() {
    const image = getEditedImage();
    if (!image) {
      return;
    }
    image.exportScale = Math.max(IMAGE_MIN_EXPORT_SCALE, (image.exportScale || 1) * 0.82);
    image.exportQuality = Math.max(0.45, (image.exportQuality || 0.88) * 0.86);
    await validateThreadImage(image);
    updateImageEditorActionState(image);
    setImageEditorStatus(
      validationStatus(image.validation?.tooBig, "lossyResizeStillTooLarge", "lossyResizeApplied"),
      validationTone(image.validation?.tooBig, "success"),
    );
    await updateImageEditorMetrics();
    await persistImageChanges();
  }

  /**
   * Fits the draft export to allowed maximum dimensions.
   * @returns {Promise<void>}
   */
  async function fitImageToAllowedDimensions() {
    const image = getEditedImage();
    if (!image || !imageEditorDraft) {
      return;
    }
    const draftImage = getImageEditorDraftImage(image);
    const rendered = await renderImageToBlob(draftImage);
    const maxRenderedDimension = Math.max(rendered.width, rendered.height);
    if (maxRenderedDimension <= IMAGE_MAX_DIMENSION) {
      setImageEditorStatus(t("fitImageDimensionsNotNeeded"), "success");
      updateImageEditorActionState(image);
      await updateImageEditorMetrics();
      return;
    }
    const currentScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
    const nextScale = Math.max(IMAGE_MIN_EXPORT_SCALE, currentScale * (IMAGE_MAX_DIMENSION / maxRenderedDimension));
    image.exportScale = nextScale;
    await validateThreadImage(image);
    updateImageEditorActionState(image);
    setImageEditorStatus(
      validationStatus(image.validation?.exceedsDimensions, "fitImageDimensionsStillTooLarge", "fitImageDimensionsApplied"),
      validationTone(image.validation?.exceedsDimensions, "success"),
    );
    await updateImageEditorMetrics();
    await persistImageChanges();
  }
  const handlers = {
    /**
     * Applies the slider zoom to the draft.
     * @returns {void}
     */
    zoomInput: () => {
      if (!imageEditorDraft) {
        return;
      }
      const image = getEditedImage();
      if (!image) {
        return;
      }
      imageEditorDraft = clampImageEditorDraftToFrame(image, {
        ...imageEditorDraft,
        fitMode: "cover",
        zoom: Number(imageZoomInput.value) || 1,
      });
      drawImageEditor();
    },
    /**
     * Mirrors the draft horizontally.
     * @returns {void}
     */
    flipHorizontal: () => {
      if (!imageEditorDraft) {
        return;
      }
      imageEditorDraft = transformImageEditorDraftForFlip(imageEditorDraft, "x");
      const image = getEditedImage();
      if (image) {
        imageEditorDraft = clampImageEditorDraftToFrame(image, imageEditorDraft);
      }
      drawImageEditor();
    },
    /**
     * Mirrors the draft vertically.
     * @returns {void}
     */
    flipVertical: () => {
      if (!imageEditorDraft) {
        return;
      }
      imageEditorDraft = transformImageEditorDraftForFlip(imageEditorDraft, "y");
      const image = getEditedImage();
      if (image) {
        imageEditorDraft = clampImageEditorDraftToFrame(image, imageEditorDraft);
      }
      drawImageEditor();
    },
    /**
     * Rotates the draft left.
     * @returns {void}
     */
    rotateLeft: () => {
      if (!imageEditorDraft) {
        return;
      }
      imageEditorDraft = transformImageEditorDraftForQuarterTurn(imageEditorDraft, "left");
      const image = getEditedImage();
      if (image) {
        imageEditorDraft = clampImageEditorDraftToFrame(image, {
          ...imageEditorDraft,
          fitMode: "cover",
        });
      }
      drawImageEditor();
    },
    reset: resetImageEditor,
    /**
     * Saves the active edit.
     * @returns {Promise<void>}
     */
    save: async () => {
      await saveImageEditor();
    },
    /**
     * Fits the export dimensions.
     * @returns {Promise<void>}
     */
    fitDimensions: async () => {
      await fitImageToAllowedDimensions();
    },
    /**
     * Reduces export size.
     * @returns {Promise<void>}
     */
    lossyResize: async () => {
      await applyLossyResize();
    },
    cancel: closeImageEditorDialog,
    /**
     * Cancels the dialog without committing the draft.
     * @param {Event} event - User interaction event.
     * @returns {void}
     */
    dialogCancel: (event) => {
      event.preventDefault();
      closeImageEditorDialog();
    },
    /**
     * Captures the pointer and begins dragging.
     * @param {Event} event - User interaction event.
     * @returns {void}
     */
    pointerDown: (event) => {
      imageEditorCanvas.setPointerCapture(event.pointerId);
      startImageEditorDrag(event);
    },
    pointerMove: updateImageEditorDrag,
    pointerUp: stopImageEditorDrag,
    pointerCancel: stopImageEditorDrag,
    /**
     * Applies wheel zoom and prevents page scrolling.
     * @param {Event} event - User interaction event.
     * @returns {void}
     */
    wheel: (event) => {
      if (!imageEditorDraft) {
        return;
      }
      const image = getEditedImage();
      if (!image) {
        return;
      }
      event.preventDefault();
      const delta = -event.deltaY;
      const factor = 1 + delta * 0.0015;
      imageEditorDraft = clampImageEditorDraftToFrame(image, {
        ...imageEditorDraft,
        fitMode: "cover",
        zoom: (imageEditorDraft.zoom || 1) * factor,
      });
      imageZoomInput.value = String(imageEditorDraft.zoom);
      drawImageEditor();
    },
  };
  /**
   * Reads the draft for the drag adapter.
   * @returns {object|null} Active draft.
   */
  function getDraft() { return imageEditorDraft; }
  /**
   * Updates the draft after a drag operation.
   * @param {object} draft - Clamped edit.
   * @returns {void}
   */
  function setDraft(draft) { imageEditorDraft = draft; }
  return { open: openImageEditorDialog, close: closeImageEditorDialog, save: saveImageEditor,
    reset: resetImageEditor, fit: fitImageToAllowedDimensions, resize: applyLossyResize,
    getImage: getEditedImage, getDraftImage: getImageEditorDraftImage, getDraft, setDraft,
    clamp: clampImageEditorDraftToFrame, draw: drawImageEditor, formatDimensions: formatImageDimensions,
    updateActions: updateImageEditorActionState, handlers };
}
