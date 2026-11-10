/**
 * Creates a closed rounded rectangle path with a radius limited by its size.
 * @param {CanvasRenderingContext2D} context - Drawing target.
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @param {number} radius - Requested radius.
 * @returns {void}
 */
function roundRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/**
 * Fills a rounded rectangle and restores drawing state.
 * @param {CanvasRenderingContext2D} context - Drawing target.
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @param {number} radius - Corner radius.
 * @param {string|CanvasGradient|CanvasPattern} fillStyle - Fill.
 * @returns {void}
 */
export function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  context.restore();
}

/**
 * Strokes a rounded rectangle and restores drawing state.
 * @param {CanvasRenderingContext2D} context - Drawing target.
 * @param {number} x - Left edge.
 * @param {number} y - Top edge.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @param {number} radius - Corner radius.
 * @param {string} strokeStyle - Stroke color.
 * @param {number} lineWidth - Stroke width.
 * @returns {void}
 */
export function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

/**
 * Centers an entire image inside a rounded frame without cropping.
 * @param {CanvasRenderingContext2D} context - Drawing target.
 * @param {ImageBitmap|HTMLCanvasElement} bitmap - Source image.
 * @param {number} x - Frame left.
 * @param {number} y - Frame top.
 * @param {number} width - Frame width.
 * @param {number} height - Frame height.
 * @param {number} radius - Corner radius.
 * @param {string} background - Letterbox color.
 * @returns {void}
 */
export function drawRoundedImageContain(context, bitmap, x, y, width, height, radius, background = "#dfe9fb") {
  context.save();
  roundRectPath(context, x, y, width, height, radius);
  context.clip();
  context.fillStyle = background;
  context.fillRect(x, y, width, height);

  const ratio = Math.min(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * ratio;
  const drawHeight = bitmap.height * ratio;
  const offsetX = x + ((width - drawWidth) / 2);
  const offsetY = y + ((height - drawHeight) / 2);
  context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

/**
 * Centers and crops an image to cover a circular frame.
 * @param {CanvasRenderingContext2D} context - Drawing target.
 * @param {ImageBitmap|HTMLCanvasElement} bitmap - Source image.
 * @param {number} x - Frame left.
 * @param {number} y - Frame top.
 * @param {number} size - Circle diameter.
 * @param {string} background - Frame background.
 * @returns {void}
 */
export function drawCircularImageCover(context, bitmap, x, y, size, background = "#dfe9fb") {
  context.save();
  context.beginPath();
  context.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.fillStyle = background;
  context.fillRect(x, y, size, size);

  const ratio = Math.max(size / bitmap.width, size / bitmap.height);
  const drawWidth = bitmap.width * ratio;
  const drawHeight = bitmap.height * ratio;
  const offsetX = x + ((size - drawWidth) / 2);
  const offsetY = y + ((size - drawHeight) / 2);
  context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}
