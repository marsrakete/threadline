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
