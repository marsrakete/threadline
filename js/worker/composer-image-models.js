/** Creates the existing worker image record/metadata contract independently of persistence.
 * @param {object} options - ID generator and maximum images per segment.
 * @returns {object} Frozen edit/image/segments/metadata/metadataSegments API.
 */
globalThis.createThreadlineComposerImageModels = function createThreadlineComposerImageModels(options) {
  if (typeof options?.id !== "function") { throw new TypeError("Composer image models require id"); }
  if (!Number.isInteger(options.maxImages) || options.maxImages < 1) { throw new TypeError("Composer image models require positive maxImages"); }
  const { id, maxImages: MAX_IMAGES_PER_SEGMENT } = options;
  /** Returns arrays unchanged, otherwise an empty array. @param {unknown} value - Input. @returns {Array} Array. */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) { return value; }
    return [];
  }
  /** Normalizes the existing worker edit fields without adding frontend fitMode. @param {object} edit - Raw edit values. @returns {object} Normalized value. */
  function normalizeImageEdit(edit = {}) {
    return {
      zoom: Math.min(3, Math.max(0.5, Number(edit.zoom) || 1)),
      offsetX: Number(edit.offsetX) || 0,
      offsetY: Number(edit.offsetY) || 0,
      flipX: Boolean(edit.flipX),
      flipY: Boolean(edit.flipY),
      rotation: ((((Number(edit.rotation) || 0) % 360) + 360) % 360),
    };
  }

  /** Normalizes a worker image with optional missing inline data. @param {object} entry - Image input. @param {object} options - allowMissingDataUrl flag. @returns {object|null} Normalized value. */
  function normalizeThreadImage(entry = {}, options = {}) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const allowMissingDataUrl = options.allowMissingDataUrl === true;
    const dataUrl = typeof entry.dataUrl === "string" ? entry.dataUrl : "";
    if (!allowMissingDataUrl && !dataUrl) {
      return null;
    }

    const data = {};
    if (dataUrl) { data.dataUrl = dataUrl; }
    let validation = { sizeBytes: 0, tooBig: false };
    if (entry.validation && typeof entry.validation === "object") {
      validation = { sizeBytes: Number(entry.validation.sizeBytes) || 0, tooBig: Boolean(entry.validation.tooBig) };
    }
    return {
      id: entry.id || id(),
      name: entry.name || "image",
      type: entry.type || "image/jpeg",
      ...data,
      alt: String(entry.alt || "").slice(0, 2000),
      width: Number(entry.width) || 0,
      height: Number(entry.height) || 0,
      originalSizeBytes: Math.max(0, Number(entry.originalSizeBytes) || 0),
      edit: normalizeImageEdit(entry.edit),
      exportQuality: Math.min(0.92, Math.max(0.45, Number(entry.exportQuality) || 0.88)),
      exportScale: Math.min(1, Math.max(0.05, Number(entry.exportScale) || 1)),
      validation,
    };
  }

  /** Normalizes inline image segments and applies the per-segment limit. @param {unknown} segments - Raw image matrix. @returns {Array} Normalized value. */
  function normalizeSegmentImages(segments) {
    return arrayOrEmpty(segments).map((images) =>
      arrayOrEmpty(images)
        .map((entry) => normalizeThreadImage(entry))
        .filter(Boolean)
        .slice(0, MAX_IMAGES_PER_SEGMENT),
    );
  }

  /** Normalizes an image and strips inline data for persistence. @param {object} entry - Image input. @returns {object|null} Normalized value. */
  function stripThreadImageData(entry = {}) {
    const normalized = normalizeThreadImage(entry, { allowMissingDataUrl: true });
    if (!normalized) {
      return null;
    }

    delete normalized.dataUrl;
    return normalized;
  }

  /** Normalizes persisted image matrices without inline data. @param {unknown} segments - Raw image matrix. @returns {Array} Normalized value. */
  function normalizeSegmentImageMetadata(segments) {
    return arrayOrEmpty(segments).map((images) =>
      arrayOrEmpty(images)
        .map((entry) => stripThreadImageData(entry))
        .filter(Boolean)
        .slice(0, MAX_IMAGES_PER_SEGMENT),
    );
  }

  return Object.freeze({ edit: normalizeImageEdit, image: normalizeThreadImage, segments: normalizeSegmentImages, metadata: stripThreadImageData, metadataSegments: normalizeSegmentImageMetadata });
};
