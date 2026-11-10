/**
 * Creates image decoding, Canvas/export rendering and upload-preparation operations.
 * @param {object} options - Browser IO, geometry, image normalization, renderer, translation and export limits.
 * @returns {object} File loading, preview rendering, blob export, validation and upload operations.
 */
export function createComposerImageProcessing(options) {
  const { createImage, createFileReader, fetchData, createImageBitmap, createId, createCanvas,
    getDevicePixelRatio, normalizeThreadImage, createDefaultImageEdit, normalizeImageEdit,
    isImageUsingDefaultEdit, hasExplicitImageUploadTransform, normalizeImageAutoResizeMode,
    getAutoResizeMode, getImageEditorCanvasDimensions, getEditedImageExportDimensions, getImageMetrics,
    renderComposerImageToCanvas, t, IMAGE_MIN_EXPORT_SCALE, IMAGE_MAX_DIMENSION, IMAGE_BLOB_LIMIT } = options;
  /**
   * Loads the natural dimensions of a data-URL image.
   * @param {string} dataUrl - dataUrl used by this image operation.
   * @returns {Promise<{width:number,height:number}>} Loads the natural dimensions of a data-URL image.
   */
  async function loadImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = createImage();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(t("imageLoadFailed")));
      image.src = dataUrl;
    });
  }

  /**
   * Reads a file as a data URL.
   * @param {File} file - file used by this image operation.
   * @returns {Promise<string>} Reads a file as a data URL.
   */
  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = createFileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(t("fileReadFailed"), { cause: reader.error }));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Fetches the original image blob without re-encoding.
   * @param {string} dataUrl - dataUrl used by this image operation.
   * @returns {Promise<Blob>} Fetches the original image blob without re-encoding.
   */
  async function dataUrlToBlob(dataUrl) {
    const response = await fetchData(dataUrl);
    if (!response.ok) {
      throw new Error(t("imageBlobCreateFailed"));
    }
    return response.blob();
  }

  /**
   * Creates a normalized Composer image record from an uploaded file.
   * @param {File} file - file used by this image operation.
   * @returns {Promise<object>} Creates a normalized Composer image record from an uploaded file.
   */
  async function createThreadImageFromFile(file) {
    const dataUrl = await fileToDataUrl(file);
    const dimensions = await loadImageDimensions(dataUrl);
    return normalizeThreadImage({
      id: createId(),
      name: file.name,
      type: file.type || "image/jpeg",
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      originalSizeBytes: file.size,
      alt: "",
      edit: createDefaultImageEdit(),
    });
  }

  /**
   * Decodes a data-URL blob into a bitmap.
   * @param {string} dataUrl - dataUrl used by this image operation.
   * @returns {Promise<ImageBitmap>} Decodes a data-URL blob into a bitmap.
   */
  async function loadImageBitmapForDataUrl(dataUrl) {
    const response = await fetchData(dataUrl);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }

  /**
   * Draws an image through the injected Canvas renderer.
   * @param {object} image - image used by this image operation.
   * @param {HTMLCanvasElement} canvas - canvas used by this image operation.
   * @param {object} options - options used by this image operation.
   * @returns {Promise<void>} Draws an image through the injected Canvas renderer.
   */
  async function renderImageToCanvas(image, canvas, options = {}) {
    return renderComposerImageToCanvas(image, canvas, {
      ...options,
      normalizeEdit: normalizeImageEdit,
      getMetrics: getImageMetrics,
      loadBitmap: loadImageBitmapForDataUrl,
    });
  }

  /**
   * Scales draft offsets from editor coordinates to preview pixels.
   * @param {object} image - image used by this image operation.
   * @param {number} width - width used by this image operation.
   * @param {number} height - height used by this image operation.
   * @param {object} edit - edit used by this image operation.
   * @returns {object} Scales draft offsets from editor coordinates to preview pixels.
   */
  function getPreviewRenderEdit(image, width, height, edit = image.edit) {
    const normalizedEdit = normalizeImageEdit(edit);
    if (isImageUsingDefaultEdit({ ...image, edit: normalizedEdit })) {
      return normalizedEdit;
    }
    const currentEditorFrame = getImageEditorCanvasDimensions(image, normalizedEdit);
    const widthScale = width / Math.max(1, currentEditorFrame.width);
    const heightScale = height / Math.max(1, currentEditorFrame.height);
    return {
      ...normalizedEdit,
      offsetX: normalizedEdit.offsetX * widthScale,
      offsetY: normalizedEdit.offsetY * heightScale,
    };
  }

  /**
   * Renders a device-pixel-ratio-aware preview without stretching its offsets.
   * @param {object} image - image used by this image operation.
   * @param {HTMLCanvasElement} canvas - canvas used by this image operation.
   * @param {object} options - options used by this image operation.
   * @returns {Promise<void>} Renders a device-pixel-ratio-aware preview without stretching its offsets.
   */
  async function renderPreviewCanvas(image, canvas, options = {}) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(3, Math.max(1, getDevicePixelRatio() || 1));
    const cssWidth = Math.max(1, Math.round(options.cssWidth || rect.width || canvas.clientWidth || 220));
    const cssHeight = Math.max(1, Math.round(options.cssHeight || rect.height || canvas.clientHeight || 150));
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (canvas.width !== pixelWidth) {
      canvas.width = pixelWidth;
    }
    if (canvas.height !== pixelHeight) {
      canvas.height = pixelHeight;
    }

    await renderImageToCanvas(image, canvas, {
      width: pixelWidth,
      height: pixelHeight,
      edit: getPreviewRenderEdit(image, pixelWidth, pixelHeight, options.edit || image.edit),
      fit: normalizeImageEdit(image.edit).fitMode,
    });
  }

  /**
   * Preserves original bytes or exports a transformed JPEG.
   * @param {object} image - image used by this image operation.
   * @returns {Promise<{blob:Blob,width:number,height:number}>} Preserves original bytes or exports a transformed JPEG.
   */
  async function renderImageToBlob(image) {
    if (!hasExplicitImageUploadTransform(image)) {
      return {
        blob: await dataUrlToBlob(image.dataUrl),
        width: image.width,
        height: image.height,
      };
    }

    if (isImageUsingDefaultEdit(image)) {
      const canvas = createCanvas();
      const exportScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
      canvas.width = Math.max(1, Math.round((image.width || 1) * exportScale));
      canvas.height = Math.max(1, Math.round((image.height || 1) * exportScale));
      await renderImageToCanvas(image, canvas, {
        width: canvas.width,
        height: canvas.height,
        fit: "contain",
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
      if (!blob) {
        throw new Error(t("imageBlobCreateFailed"));
      }
      return {
        blob,
        width: canvas.width,
        height: canvas.height,
      };
    }

    const canvas = createCanvas();
    const exportScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
    const exportDimensions = getEditedImageExportDimensions(image, image.edit, null, exportScale);
    const currentEditorFrame = getImageEditorCanvasDimensions(image, image.edit);
    const scale = exportDimensions.width / currentEditorFrame.width;
    const exportEdit = {
      ...normalizeImageEdit(image.edit),
      offsetX: (Number(image.edit?.offsetX) || 0) * scale,
      offsetY: (Number(image.edit?.offsetY) || 0) * scale,
    };
    canvas.width = exportDimensions.width;
    canvas.height = exportDimensions.height;
    await renderImageToCanvas(image, canvas, {
      width: canvas.width,
      height: canvas.height,
      edit: exportEdit,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", image.exportQuality || 0.88));
    if (!blob) {
      throw new Error(t("imageBlobCreateFailed"));
    }
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
    };
  }

  /**
   * Measures the export and updates file-size and dimension validation.
   * @param {object} image - image used by this image operation.
   * @returns {Promise<object>} Measures the export and updates file-size and dimension validation.
   */
  async function validateThreadImage(image) {
    const rendered = await renderImageToBlob(image);
    image.validation = {
      sizeBytes: rendered.blob.size,
      width: rendered.width,
      height: rendered.height,
      exceedsDimensions: rendered.width > IMAGE_MAX_DIMENSION || rendered.height > IMAGE_MAX_DIMENSION,
      tooBig: rendered.blob.size > IMAGE_BLOB_LIMIT || rendered.width > IMAGE_MAX_DIMENSION || rendered.height > IMAGE_MAX_DIMENSION,
    };
    return image.validation;
  }

  /**
   * Scales oversized exports to the dimension limit.
   * @param {object} image - image used by this image operation.
   * @returns {Promise<boolean>} Scales oversized exports to the dimension limit.
   */
  async function autoFitImageToAllowedDimensions(image) {
    const rendered = await renderImageToBlob(image);
    const maxRenderedDimension = Math.max(rendered.width, rendered.height);
    if (maxRenderedDimension <= IMAGE_MAX_DIMENSION) {
      return false;
    }
    const currentScale = Math.min(1, Math.max(IMAGE_MIN_EXPORT_SCALE, Number(image.exportScale) || 1));
    image.exportScale = Math.max(IMAGE_MIN_EXPORT_SCALE, currentScale * (IMAGE_MAX_DIMENSION / maxRenderedDimension));
    return true;
  }

  /**
   * Reduces export scale and quality within their minimum values.
   * @param {object} image - image used by this image operation.
   * @returns {Promise<void>} Reduces export scale and quality within their minimum values.
   */
  async function autoApplyLossyResize(image) {
    image.exportScale = Math.max(IMAGE_MIN_EXPORT_SCALE, (image.exportScale || 1) * 0.82);
    image.exportQuality = Math.max(0.45, (image.exportQuality || 0.88) * 0.86);
  }

  /**
   * Prepares a normalized copy for upload with bounded automatic resize attempts.
   * @param {object} image - image used by this image operation.
   * @param {string} autoMode - autoMode used by this image operation.
   * @returns {Promise<object>} Prepares a normalized copy for upload with bounded automatic resize attempts.
   */
  async function prepareImageForUpload(image, autoMode = getAutoResizeMode()) {
    const workingImage = normalizeThreadImage(image);
    if (!workingImage) {
      throw new Error(t("imageBlobCreateFailed"));
    }
    await validateThreadImage(workingImage);
    const normalizedMode = normalizeImageAutoResizeMode(autoMode);
    if (workingImage.validation?.tooBig && normalizedMode === "fit") {
      await autoFitImageToAllowedDimensions(workingImage);
      await validateThreadImage(workingImage);
    }
    if (workingImage.validation?.tooBig && normalizedMode === "lossy") {
      await autoFitImageToAllowedDimensions(workingImage);
      await validateThreadImage(workingImage);
      let attempts = 0;
      while (workingImage.validation?.tooBig && attempts < 8) {
        await autoApplyLossyResize(workingImage);
        await validateThreadImage(workingImage);
        attempts += 1;
      }
    }
    const rendered = await renderImageToBlob(workingImage);
    return {
      blob: rendered.blob,
      width: rendered.width,
      height: rendered.height,
      validation: workingImage.validation,
    };
  }
  return { fileToDataUrl, createThreadImageFromFile, loadImageBitmapForDataUrl, renderImageToCanvas,
    renderPreviewCanvas, renderImageToBlob, validateThreadImage, prepareImageForUpload };
}
