/**
 * Normalizes manual Composer segment overrides.
 * @param {Array<string>} segments - Raw override values.
 * @returns {Array<string>|null} Clean overrides or null when none exist.
 */
export function normalizeComposerSegmentOverrides(segments) {
  const normalized = (Array.isArray(segments) ? segments : [])
    .map((entry) => String(entry || ""))
    .filter((entry) => entry.trim().length > 0);
  if (normalized.length > 0) {
    return normalized;
  }
  return null;
}

/**
 * Keeps a segment image matrix aligned with the number of Composer segments.
 * @param {Array<Array<object>>} images - Current image matrix.
 * @param {number} segmentCount - Desired segment count.
 * @returns {Array<Array<object>>} Aligned image matrix.
 */
export function syncComposerSegmentImages(images, segmentCount) {
  const result = [];
  const source = Array.isArray(images) ? images : [];
  for (let index = 0; index < segmentCount; index += 1) {
    if (Array.isArray(source[index])) {
      result.push(source[index]);
    } else {
      result.push([]);
    }
  }
  return result;
}
