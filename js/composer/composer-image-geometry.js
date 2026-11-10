/**
 * Creates editor/export/preview geometry with explicit edit and size configuration.
 * @param {object} options - Normalization, default-edit predicate, clamp and frame/export dimensions.
 * @returns {object} Frame, export, preview, transform and edit-clamp operations.
 */
export function createComposerImageGeometry(options) {
  const { normalizeImageEdit, isImageUsingDefaultEdit, clamp, IMAGE_EDITOR_CANVAS_WIDTH,
    IMAGE_EDITOR_CANVAS_HEIGHT, IMAGE_EXPORT_WIDTH } = options;
  /**
   * Resolves safe source dimensions.
   * @param {object} image - image used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {{width:number,height:number}} Resolves safe source dimensions.
   */
  function getSourceDimensions(image, source = null) {
    return getComposerSourceDimensions(image, source);
  }

  /**
   * Applies normalized rotation to the source dimensions.
   * @param {object} image - image used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {{width:number,height:number}} Applies normalized rotation to the source dimensions.
   */
  function getOrientedSourceDimensions(image, edit = image.edit, source = null) {
    const normalizedEdit = normalizeImageEdit(edit);
    return getComposerOrientedSourceDimensions(image, normalizedEdit, source);
  }

  /**
   * Selects the editor frame orientation.
   * @param {object} image - image used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {{width:number,height:number}} Selects the editor frame orientation.
   */
  function getImageEditorCanvasDimensions(image, edit = image.edit, source = null) {
    const oriented = getOrientedSourceDimensions(image, edit, source);
    const isPortrait = oriented.height > oriented.width;
    if (isPortrait) {
      return { width: IMAGE_EDITOR_CANVAS_HEIGHT, height: IMAGE_EDITOR_CANVAS_WIDTH };
    }
    return { width: IMAGE_EDITOR_CANVAS_WIDTH, height: IMAGE_EDITOR_CANVAS_HEIGHT };
  }

  /**
   * Checks the oriented image aspect ratio.
   * @param {object} image - image used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {boolean} Checks the oriented image aspect ratio.
   */
  function isPortraitEditorImage(image, edit = image.edit, source = null) {
    const oriented = getOrientedSourceDimensions(image, edit, source);
    return oriented.height > oriented.width;
  }

  /**
   * Calculates the transformed image export dimensions.
   * @param {object} image - image used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @param {number} exportScale - exportScale used by this image operation.
   * @returns {{width:number,height:number}} Calculates the transformed image export dimensions.
   */
  function getEditedImageExportDimensions(image, edit = image.edit, source = null, exportScale = 1) {
    const frame = getImageEditorCanvasDimensions(image, edit, source);
    const baseScale = IMAGE_EXPORT_WIDTH / IMAGE_EDITOR_CANVAS_WIDTH;
    return {
      width: Math.max(320, Math.round(frame.width * baseScale * exportScale)),
      height: Math.max(320, Math.round(frame.height * baseScale * exportScale)),
    };
  }

  /**
   * Resolves the original or edited image preview frame.
   * @param {object} image - image used by this image operation.
   * @returns {{width:number,height:number}} Resolves the original or edited image preview frame.
   */
  function getImagePreviewFrameDimensions(image) {
    if (isImageUsingDefaultEdit(image)) {
      return getOrientedSourceDimensions(image, image.edit);
    }
    return getEditedImageExportDimensions(image, image.edit);
  }

  /**
   * Fits a preview within its available CSS frame.
   * @param {number} frameWidth - frameWidth used by this image operation.
   * @param {number} frameHeight - frameHeight used by this image operation.
   * @param {number} maxWidth - maxWidth used by this image operation.
   * @param {number} maxHeight - maxHeight used by this image operation.
   * @returns {{width:number,height:number}} Fits a preview within its available CSS frame.
   */
  function getContainedPreviewBox(frameWidth, frameHeight, maxWidth, maxHeight) {
    return getComposerContainedPreviewBox(frameWidth, frameHeight, maxWidth, maxHeight);
  }

  /**
   * Calculates cover/contain transforms and clamped image offsets.
   * @param {object} image - image used by this image operation.
   * @param {number} frameWidth - frameWidth used by this image operation.
   * @param {number} frameHeight - frameHeight used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {string|null} fit - fit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {object} Calculates cover/contain transforms and clamped image offsets.
   */
  function getImageMetrics(image, frameWidth, frameHeight, edit = image.edit, fit = null, source = null) {
    const normalizedEdit = normalizeImageEdit(edit);
    const effectiveFit = fit || normalizedEdit.fitMode || "cover";
    const rotation = normalizedEdit.rotation;
    const quarterTurn = rotation % 180 !== 0;
    const sourceDimensions = getSourceDimensions(image, source);
    let sourceWidth = sourceDimensions.width;
    let sourceHeight = sourceDimensions.height;
    if (quarterTurn) { sourceWidth = sourceDimensions.height; sourceHeight = sourceDimensions.width; }
    let baseScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
    if (effectiveFit === "contain") { baseScale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight); }
    const drawWidth = sourceDimensions.width * baseScale * normalizedEdit.zoom;
    const drawHeight = sourceDimensions.height * baseScale * normalizedEdit.zoom;
    let rotatedDrawWidth = drawWidth;
    let rotatedDrawHeight = drawHeight;
    if (quarterTurn) { rotatedDrawWidth = drawHeight; rotatedDrawHeight = drawWidth; }
    let maxOffsetX = 0;
    let maxOffsetY = 0;
    if (effectiveFit === "cover") {
      maxOffsetX = Math.max(0, (rotatedDrawWidth - frameWidth) / 2);
      maxOffsetY = Math.max(0, (rotatedDrawHeight - frameHeight) / 2);
    }
    const offsetX = clamp(normalizedEdit.offsetX, -maxOffsetX, maxOffsetX);
    const offsetY = clamp(normalizedEdit.offsetY, -maxOffsetY, maxOffsetY);
    return {
      ...normalizedEdit,
      fitMode: effectiveFit,
      drawWidth,
      drawHeight,
      rotatedDrawWidth,
      rotatedDrawHeight,
      maxOffsetX,
      maxOffsetY,
      offsetX,
      offsetY,
      centerX: frameWidth / 2 + offsetX,
      centerY: frameHeight / 2 + offsetY,
    };
  }

  /**
   * Returns a normalized edit constrained to its image frame.
   * @param {object} image - image used by this image operation.
   * @param {number} frameWidth - frameWidth used by this image operation.
   * @param {number} frameHeight - frameHeight used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @param {string|null} fit - fit used by this image operation.
   * @param {object|null} source - source used by this image operation.
   * @returns {object} Returns a normalized edit constrained to its image frame.
   */
  function clampImageEditToFrame(image, frameWidth, frameHeight, edit = image.edit, fit = null, source = null) {
    const metrics = getImageMetrics(image, frameWidth, frameHeight, edit, fit, source);
    return {
      zoom: metrics.zoom,
      offsetX: metrics.offsetX,
      offsetY: metrics.offsetY,
      flipX: metrics.flipX,
      flipY: metrics.flipY,
      rotation: metrics.rotation,
      fitMode: metrics.fitMode,
    };
  }
  return { getImageEditorCanvasDimensions, isPortraitEditorImage, getEditedImageExportDimensions,
    getImagePreviewFrameDimensions, getContainedPreviewBox, getImageMetrics, clampImageEditToFrame };
}

/**
 * Returns safe source dimensions for an image and optional source metadata.
 * @param {object} image - Image record.
 * @param {object|null} source - Optional source dimensions.
 * @returns {{width:number, height:number}} Safe dimensions.
 */
export function getComposerSourceDimensions(image = {}, source = null) {
  return {
    width: Math.max(1, Number(source?.width) || Number(image?.width) || 1),
    height: Math.max(1, Number(source?.height) || Number(image?.height) || 1),
  };
}

/**
 * Applies image rotation to source dimensions.
 * @param {object} image - Image record.
 * @param {object} edit - Normalized edit values.
 * @param {object|null} source - Optional source dimensions.
 * @returns {{width:number, height:number}} Oriented dimensions.
 */
export function getComposerOrientedSourceDimensions(image = {}, edit = {}, source = null) {
  const dimensions = getComposerSourceDimensions(image, source);
  const rotation = Number(edit.rotation) || 0;
  if (rotation % 180 !== 0) {
    return { width: dimensions.height, height: dimensions.width };
  }
  return dimensions;
}

/**
 * Calculates a contained preview box without exceeding its available frame.
 * @param {number} frameWidth - Source frame width.
 * @param {number} frameHeight - Source frame height.
 * @param {number} maxWidth - Maximum preview width.
 * @param {number} maxHeight - Maximum preview height.
 * @returns {{width:number, height:number}} Preview dimensions.
 */
export function getComposerContainedPreviewBox(frameWidth, frameHeight, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, Number(frameWidth) || 1);
  const safeHeight = Math.max(1, Number(frameHeight) || 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}
