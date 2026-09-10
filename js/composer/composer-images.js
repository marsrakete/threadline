/**
 * Moves one image between Composer segments without mutating the input arrays.
 * @param {object} options - Source, target, and image-limit data.
 * @returns {{moved: boolean, reason: string, segmentImages: Array<Array<object>>}} Move result and next image state.
 */
export function moveComposerImage(options = {}) {
  const segmentImages = Array.isArray(options.segmentImages) ? options.segmentImages.map((images) => Array.isArray(images) ? [...images] : []) : [];
  const sourceImages = segmentImages[options.fromSegmentIndex];
  const targetImages = segmentImages[options.toSegmentIndex];
  if (!sourceImages || !targetImages) {
    return { moved: false, reason: "missing-segment", segmentImages };
  }
  if (options.fromImageIndex < 0 || options.fromImageIndex >= sourceImages.length) {
    return { moved: false, reason: "missing-image", segmentImages };
  }
  if (options.fromSegmentIndex !== options.toSegmentIndex && options.targetHasLinkCard) {
    return { moved: false, reason: "link-card", segmentImages };
  }
  if (options.fromSegmentIndex !== options.toSegmentIndex && targetImages.length >= options.maxImagesPerSegment) {
    return { moved: false, reason: "limit", segmentImages };
  }
  const image = sourceImages.splice(options.fromImageIndex, 1)[0];
  let insertionIndex = Math.max(0, Math.min(options.toImageIndex, targetImages.length));
  if (options.fromSegmentIndex === options.toSegmentIndex) {
    if (options.toImageIndex > options.fromImageIndex) {
      insertionIndex = Math.max(0, Math.min(insertionIndex - 1, sourceImages.length));
    }
    if (insertionIndex === options.fromImageIndex) {
      return { moved: false, reason: "unchanged", segmentImages };
    }
    sourceImages.splice(insertionIndex, 0, image);
  } else {
    targetImages.splice(insertionIndex, 0, image);
  }
  return { moved: true, reason: "", segmentImages };
}

/**
 * Removes one image from a Composer segment without mutating the input arrays.
 * @param {Array<Array<object>>} segmentImages - Current image state.
 * @param {number} segmentIndex - Segment containing the image.
 * @param {number} imageIndex - Image index to remove.
 * @returns {Array<Array<object>>} Next image state.
 */
export function removeComposerImage(segmentImages, segmentIndex, imageIndex) {
  return (Array.isArray(segmentImages) ? segmentImages : []).map((images, index) => {
    if (index !== segmentIndex || !Array.isArray(images)) {
      return Array.isArray(images) ? [...images] : [];
    }
    return images.filter((image, currentIndex) => currentIndex !== imageIndex);
  });
}
