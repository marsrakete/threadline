/**
 * Renders an edited image into a canvas using injected image-edit helpers.
 * @param {object} image - Image record with a data URL.
 * @param {HTMLCanvasElement} canvas - Target canvas.
 * @param {object} options - Dimensions, edit settings and helper callbacks.
 * @returns {Promise<void>} Resolves after rendering completes.
 */
export async function renderComposerImageToCanvas(image, canvas, options = {}) {
  const width = options.width || canvas.width;
  const height = options.height || canvas.height;
  const normalizeEdit = options.normalizeEdit;
  const edit = normalizeEdit(options.edit || image.edit);
  const fit = options.fit || edit.fitMode || "cover";
  if (!canvas.width) {
    canvas.width = width;
  }
  if (!canvas.height) {
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, canvas.width, canvas.height);
  const bitmap = await options.loadBitmap(image.dataUrl);
  const source = { width: bitmap.width, height: bitmap.height };
  const metrics = options.getMetrics(image, width, height, edit, fit, source);
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  context.translate(metrics.centerX, metrics.centerY);
  context.rotate((metrics.rotation * Math.PI) / 180);
  let flipX = 1;
  let flipY = 1;
  if (metrics.flipX) {
    flipX = -1;
  }
  if (metrics.flipY) {
    flipY = -1;
  }
  context.scale(flipX, flipY);
  context.drawImage(bitmap, -metrics.drawWidth / 2, -metrics.drawHeight / 2, metrics.drawWidth, metrics.drawHeight);
  context.restore();
  if (typeof bitmap.close === "function") {
    bitmap.close();
  }
}

/**
 * Binds Composer image-editor controls and canvas gestures.
 * @param {object} elements - Image-editor buttons, inputs, dialog, and canvas.
 * @param {object} handlers - Image-editor callbacks supplied by the page entry point.
 * @returns {number} Number of listeners bound.
 */
export function bindComposerImageEditorEvents(elements = {}, handlers = {}) {
  let boundCount = 0;
  const bind = (target, type, handler, options = undefined) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler, options);
    boundCount += 1;
  };
  bind(elements.zoomInput, "input", handlers.zoomInput);
  bind(elements.flipHorizontalButton, "click", handlers.flipHorizontal);
  bind(elements.flipVerticalButton, "click", handlers.flipVertical);
  bind(elements.rotateLeftButton, "click", handlers.rotateLeft);
  bind(elements.resetButton, "click", handlers.reset);
  bind(elements.saveButton, "click", handlers.save);
  bind(elements.fitDimensionsButton, "click", handlers.fitDimensions);
  bind(elements.lossyResizeButton, "click", handlers.lossyResize);
  bind(elements.cancelButton, "click", handlers.cancel);
  bind(elements.closeTopButton, "click", handlers.cancel);
  bind(elements.dialog, "cancel", handlers.dialogCancel);
  bind(elements.canvas, "pointerdown", handlers.pointerDown);
  bind(elements.canvas, "pointermove", handlers.pointerMove);
  bind(elements.canvas, "pointerup", handlers.pointerUp);
  bind(elements.canvas, "pointercancel", handlers.pointerCancel);
  bind(elements.canvas, "wheel", handlers.wheel, { passive: false });
  return boundCount;
}
