/**
 * Creates the default non-destructive image edit state.
 * @returns {{zoom: number, offsetX: number, offsetY: number, flipX: boolean, flipY: boolean, rotation: number, fitMode: string}} Default image edit object.
 */
function createDefaultImageEdit() {
  return {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    flipX: false,
    flipY: false,
    rotation: 0,
    fitMode: "contain",
  };
}

/**
 * Normalizes one raw image edit object into the supported range.
 * @param {object} edit - Raw stored image edit object.
 * @returns {{zoom: number, offsetX: number, offsetY: number, flipX: boolean, flipY: boolean, rotation: number, fitMode: string}} Normalized image edit object.
 */
function normalizeImageEdit(edit = {}) {
  const zoom = Math.min(3, Math.max(0.5, Number(edit.zoom) || 1));
  const offsetX = Number(edit.offsetX) || 0;
  const offsetY = Number(edit.offsetY) || 0;
  const flipX = Boolean(edit.flipX);
  const flipY = Boolean(edit.flipY);
  const rotation = ((((Number(edit.rotation) || 0) % 360) + 360) % 360);
  const fitMode = edit.fitMode === "cover"
    || (
      !Object.prototype.hasOwnProperty.call(edit, "fitMode")
      && (zoom !== 1 || offsetX !== 0 || offsetY !== 0 || flipX || flipY || rotation !== 0)
    )
    ? "cover"
    : "contain";

  return {
    zoom,
    offsetX,
    offsetY,
    flipX,
    flipY,
    rotation,
    fitMode,
  };
}

/**
 * Returns whether one image still uses the untouched default edit state.
 * @param {object} image - Image record with optional `edit`.
 * @returns {boolean} True when the image edit state is still the default.
 */
function isImageUsingDefaultEdit(image) {
  const edit = normalizeImageEdit(image?.edit);
  return edit.zoom === 1
    && edit.offsetX === 0
    && edit.offsetY === 0
    && edit.flipX === false
    && edit.flipY === false
    && edit.rotation === 0
    && edit.fitMode === "contain";
}

/**
 * Returns whether one image has explicit upload transforms that require re-rendering.
 * @param {object} image - Image record with edit and export settings.
 * @param {number} imageMinExportScale - Lowest allowed export scale.
 * @returns {boolean} True when the image needs a transformed upload.
 */
function hasExplicitImageUploadTransform(image, imageMinExportScale) {
  return !isImageUsingDefaultEdit(image)
    || Math.min(1, Math.max(imageMinExportScale, Number(image?.exportScale) || 1)) !== 1
    || Math.abs((Number(image?.exportQuality) || 0.88) - 0.88) > 0.001;
}

/**
 * Normalizes one raw thread image entry into the stored internal shape.
 * @param {object} entry - Raw stored image entry.
 * @param {{maxAltTextLength: number, imageMinExportScale: number}} options - Normalization limits.
 * @returns {object|null} Normalized thread image or `null` when the entry has no data URL.
 */
function normalizeThreadImage(entry = {}, options) {
  if (!entry?.dataUrl) {
    return null;
  }

  const maxAltTextLength = Number(options?.maxAltTextLength) || 0;
  const imageMinExportScale = Number(options?.imageMinExportScale) || 0.05;

  return {
    id: entry.id || crypto.randomUUID(),
    name: entry.name || "image",
    type: entry.type || "image/jpeg",
    dataUrl: entry.dataUrl,
    alt: String(entry.alt || "").slice(0, maxAltTextLength),
    width: Number(entry.width) || 0,
    height: Number(entry.height) || 0,
    originalSizeBytes: Math.max(0, Number(entry.originalSizeBytes) || 0),
    edit: normalizeImageEdit(entry.edit),
    exportQuality: Math.min(0.92, Math.max(0.45, Number(entry.exportQuality) || 0.88)),
    exportScale: Math.min(1, Math.max(imageMinExportScale, Number(entry.exportScale) || 1)),
    validation: entry.validation && typeof entry.validation === "object"
      ? {
          sizeBytes: Number(entry.validation.sizeBytes) || 0,
          width: Number(entry.validation.width) || 0,
          height: Number(entry.validation.height) || 0,
          exceedsDimensions: Boolean(entry.validation.exceedsDimensions),
          tooBig: Boolean(entry.validation.tooBig),
        }
      : { sizeBytes: 0, width: 0, height: 0, exceedsDimensions: false, tooBig: false },
  };
}

/**
 * Normalizes the full segment-image matrix for the composer state.
 * @param {Array<Array<object>>} segments - Raw segment image matrix.
 * @param {{maxAltTextLength: number, imageMinExportScale: number, maxImagesPerSegment: number}} options - Normalization limits.
 * @returns {Array<Array<object>>} Normalized segment image matrix.
 */
function normalizeSegmentImages(segments, options) {
  const maxImagesPerSegment = Math.max(1, Number(options?.maxImagesPerSegment) || 1);
  return (Array.isArray(segments) ? segments : []).map((images) =>
    (Array.isArray(images) ? images : [])
      .map((entry) => normalizeThreadImage(entry, options))
      .filter(Boolean)
      .slice(0, maxImagesPerSegment),
  );
}

/**
 * Normalizes the selected automatic image resize mode.
 * @param {string} value - Raw stored resize mode.
 * @returns {string} `off`, `fit`, or `lossy`.
 */
function normalizeImageAutoResizeMode(value) {
  return value === "fit" || value === "lossy" ? value : "off";
}

/**
 * Returns whether automatic image resizing is enabled for the current mode.
 * @param {string} mode - Raw or normalized resize mode.
 * @returns {boolean} True when the mode is not `off`.
 */
function isImageAutoResizeEnabled(mode) {
  return normalizeImageAutoResizeMode(mode) !== "off";
}

/**
 * Converts one base64 data URL into a file object.
 * @param {string} dataUrl - Source data URL.
 * @param {string} fileName - File name used for the created file.
 * @returns {File|null} File object or `null` when the input is not a supported data URL.
 */
function dataUrlToFile(dataUrl, fileName = "link-card.jpg") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1] || "image/jpeg";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

export {
  createDefaultImageEdit,
  dataUrlToFile,
  hasExplicitImageUploadTransform,
  isImageUsingDefaultEdit,
  isImageAutoResizeEnabled,
  normalizeImageAutoResizeMode,
  normalizeImageEdit,
  normalizeSegmentImages,
  normalizeThreadImage,
};
