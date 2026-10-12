/**
 * Draws the active image-editor frame and applies the resolved offsets to the draft.
 * @param {HTMLCanvasElement} canvas - Editor canvas.
 * @param {object|null} image - Current image.
 * @param {ImageBitmap|null} bitmap - Loaded source bitmap.
 * @param {object|null} draft - Mutable edit draft.
 * @param {object} options - Edit normalization, geometry/source and metrics scheduling callbacks.
 * @returns {void}
 */
export function drawComposerImageEditor(canvas, image, bitmap, draft, options) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!image || !bitmap || !draft) {
    return;
  }
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const metrics = options.getMetrics({ ...image, edit: draft }, canvas.width, canvas.height,
    draft, options.normalizeEdit(draft).fitMode, options.getSourceDimensions());
  draft.offsetX = metrics.offsetX;
  draft.offsetY = metrics.offsetY;
  draft.fitMode = metrics.fitMode;
  context.save();
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.clip();
  context.translate(metrics.centerX, metrics.centerY);
  context.rotate(metrics.rotation * Math.PI / 180);
  let flipX = 1;
  let flipY = 1;
  if (metrics.flipX) { flipX = -1; }
  if (metrics.flipY) { flipY = -1; }
  context.scale(flipX, flipY);
  context.drawImage(bitmap, -metrics.drawWidth / 2, -metrics.drawHeight / 2, metrics.drawWidth, metrics.drawHeight);
  context.restore();
  context.strokeStyle = "rgba(20, 35, 61, 0.18)";
  context.lineWidth = 2;
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  options.scheduleMetrics();
}

/**
 * Creates editor dragging with private start coordinates and explicit draft/geometry dependencies.
 * @param {object} options - Image/draft readers, draft setter, frame clamp and draw callback.
 * @returns {object} Start, update and stop operations.
 */
export function createComposerImageEditorDragController(options) {
  let startPoint = null;
  /**
   * Captures pointer coordinates and the current image offset.
   * @param {object} event - Pointer clientX/clientY coordinates.
   * @returns {void}
   */
  function start(event) {
    const draft = options.getDraft();
    if (!draft) { return; }
    startPoint = { x: event.clientX, y: event.clientY, offsetX: draft.offsetX, offsetY: draft.offsetY };
  }
  /**
   * Applies the pointer delta in cover mode and clamps the next draft to its frame.
   * @param {object} event - Pointer clientX/clientY coordinates.
   * @returns {void}
   */
  function update(event) {
    const draft = options.getDraft();
    if (!startPoint || !draft) { return; }
    const image = options.getImage();
    if (!image) { return; }
    const next = { ...draft, fitMode: "cover", offsetX: startPoint.offsetX + event.clientX - startPoint.x,
      offsetY: startPoint.offsetY + event.clientY - startPoint.y };
    options.setDraft(options.clamp(image, next));
    options.draw();
  }
  /**
   * Ends dragging and discards the captured start coordinates.
   * @returns {void}
   */
  function stop() { startPoint = null; }
  return { start, update, stop };
}

/**
 * Creates debounced editor metrics with private timer/request state and stale-result protection.
 * @param {object} elements - Original/export dimensions and size text nodes.
 * @param {object} options - Image/draft readers, export geometry/rendering, formatters and timer callbacks.
 * @returns {object} Async update, schedule and invalidate operations.
 */
export function createComposerImageEditorMetricsController(elements, options) {
  let timer = null;
  let version = 0;
  /**
   * Updates immediate geometry and optionally measures the rendered blob.
   * @param {object} settings - Optional renderBlob flag, defaulting to true.
   * @returns {Promise<void>}
   */
  async function update({ renderBlob = true } = {}) {
    const image = options.getImage();
    const draft = options.getDraftImage(image);
    if (!image || !draft) { return; }
    const requestId = ++version;
    elements.originalDimensions.textContent = options.formatDimensions(image.width, image.height);
    elements.originalSize.textContent = options.formatSize(image.originalSizeBytes);
    const scale = Math.min(1, Math.max(options.minScale, Number(draft.exportScale) || 1));
    let dimensions;
    if (options.isDefaultEdit(draft)) {
      dimensions = { width: Math.max(1, Math.round((draft.width || 1) * scale)), height: Math.max(1, Math.round((draft.height || 1) * scale)) };
    } else {
      dimensions = options.getExportDimensions(draft, draft.edit, null, scale);
    }
    elements.exportDimensions.textContent = options.formatDimensions(dimensions.width, dimensions.height);
    if (renderBlob) {
      elements.exportSize.textContent = options.translate("imageEditorCalculatingSize");
    } else {
      elements.exportSize.textContent = options.formatSize(image.validation?.sizeBytes);
    }
    options.updateActions(image);
    if (!renderBlob) { return; }
    try {
      const rendered = await options.renderBlob(draft);
      if (requestId !== version) { return; }
      elements.exportDimensions.textContent = options.formatDimensions(rendered.width, rendered.height);
      elements.exportSize.textContent = options.formatSize(rendered.blob.size);
    } catch {
      if (requestId === version) {
        elements.exportSize.textContent = options.translate("imageEditorSizeUnknown");
      }
    }
  }
  /**
   * Replaces the pending metrics update with a new 180 ms debounce.
   * @returns {void}
   */
  function schedule() {
    options.clearTimer(timer);
    timer = options.setTimer(() => { void update(); }, 180);
  }
  /**
   * Cancels pending timers and prevents in-flight results from updating a closed editor.
   * @returns {void}
   */
  function invalidate() {
    options.clearTimer(timer);
    version += 1;
  }
  return { update, schedule, invalidate };
}

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
