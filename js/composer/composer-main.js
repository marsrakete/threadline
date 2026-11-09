let graphemeSegmenter = null;

/**
 * Returns the cached segmenter for user-visible Unicode graphemes.
 * @returns {Intl.Segmenter|null} Segmenter instance, or null when unavailable.
 */
export function getComposerGraphemeSegmenter() {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    return null;
  }

  if (!graphemeSegmenter) {
    graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  }

  return graphemeSegmenter;
}

/**
 * Splits text into user-visible grapheme clusters for Bluesky-compatible counting.
 * @param {string} text - Source text to segment.
 * @returns {string[]} Array of grapheme clusters.
 */
export function splitComposerGraphemes(text) {
  const value = String(text || "");
  const segmenter = getComposerGraphemeSegmenter();

  if (!segmenter) {
    return Array.from(value);
  }

  return Array.from(segmenter.segment(value), (entry) => entry.segment);
}

/**
 * Counts Bluesky-visible characters for a string.
 * @param {string} text - Source text to count.
 * @returns {number} Grapheme cluster count.
 */
export function countComposerGraphemes(text) {
  return splitComposerGraphemes(text).length;
}

/**
 * Counts UTF-8 bytes for a string as used by AT Protocol maxLength validation.
 * @param {string} text - Source text to count.
 * @returns {number} UTF-8 byte count.
 */
export function countComposerUtf8Bytes(text) {
  return new TextEncoder().encode(String(text || "")).length;
}

/**
 * Builds shared text metrics for Bluesky post validation.
 * @param {string} text - Source text to measure.
 * @returns {{graphemeCount: number, utf8ByteCount: number}} Grapheme and byte counts.
 */
export function getComposerPostTextMetrics(text) {
  return {
    graphemeCount: countComposerGraphemes(text),
    utf8ByteCount: countComposerUtf8Bytes(text),
  };
}

/**
 * Creates a post text limit object for graphemes and UTF-8 bytes.
 * @param {number} graphemeLimit - Maximum grapheme count.
 * @param {number} utf8ByteLimit - Maximum UTF-8 byte count.
 * @returns {{graphemeLimit: number, utf8ByteLimit: number}} Normalized limit object.
 */
export function createComposerPostTextLimit(graphemeLimit, utf8ByteLimit) {
  return {
    graphemeLimit,
    utf8ByteLimit,
  };
}

/**
 * Returns whether text fits inside the given Bluesky text limits.
 * @param {string} text - Candidate text.
 * @param {{graphemeLimit: number, utf8ByteLimit: number}} limit - Allowed grapheme and byte limits.
 * @returns {boolean} True when both limits are satisfied.
 */
export function doesComposerTextFitLimit(text, limit) {
  const metrics = getComposerPostTextMetrics(text);
  return metrics.graphemeCount <= limit.graphemeLimit && metrics.utf8ByteCount <= limit.utf8ByteLimit;
}

/**
 * Limits composer text to a configured grapheme budget.
 * @param {string} text - Candidate composer text.
 * @param {number} limit - Maximum allowed grapheme count.
 * @returns {{text: string, truncated: boolean}} Clamped text and truncation flag.
 */
export function clampComposerTextLength(text, limit) {
  const graphemes = splitComposerGraphemes(text);
  const normalizedLimit = Math.max(0, Number(limit) || 0);
  if (graphemes.length <= normalizedLimit) {
    return {
      text: String(text || ""),
      truncated: false,
    };
  }

  return {
    text: graphemes.slice(0, normalizedLimit).join(""),
    truncated: true,
  };
}
