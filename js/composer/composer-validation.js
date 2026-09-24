/**
 * Builds Bluesky-aware length diagnostics for one Composer segment.
 * @param {string} text - Segment text.
 * @param {object} options - Metrics, limits and character classifiers.
 * @returns {object} Grapheme, byte and warning state.
 */
export function getComposerSegmentLengthDiagnostics(text, options = {}) {
  const normalizedText = String(text || "");
  const metrics = options.getMetrics(normalizedText);
  const graphemeCount = metrics.graphemeCount;
  const utf8ByteCount = metrics.utf8ByteCount;
  const graphemeLimit = Number(options.graphemeLimit) || 300;
  const byteLimit = Number(options.byteLimit) || 3000;
  const codeUnitCount = normalizedText.length;
  const codePointCount = Array.from(normalizedText).length;
  const hasEmoji = options.hasEmoji(normalizedText);
  const hasCjk = options.hasCjk(normalizedText);
  const adviceKeys = [];
  if (hasEmoji) {
    adviceKeys.push("segmentLengthAdviceEmoji");
  }
  if (hasCjk) {
    adviceKeys.push("segmentLengthAdviceCjk");
  }
  adviceKeys.push("segmentLengthAdviceSplit");
  return {
    graphemeCount,
    utf8ByteCount,
    codeUnitCount,
    codePointCount,
    hasEmoji,
    hasCjk,
    hasComplexDifference: codeUnitCount !== graphemeCount || codePointCount !== graphemeCount,
    isNearLimit: graphemeCount >= (graphemeLimit - 20),
    isNearByteLimit: utf8ByteCount >= (byteLimit - 200),
    exceedsGraphemeLimit: graphemeCount > graphemeLimit,
    exceedsByteLimit: utf8ByteCount > byteLimit,
    exceedsLimit: graphemeCount > graphemeLimit || utf8ByteCount > byteLimit,
    adviceKeys,
  };
}

/**
 * Builds a localized Composer segment length label.
 * @param {object} diagnostics - Segment length diagnostics.
 * @param {object} options - Limits and translation callback.
 * @returns {string} Visible length label.
 */
export function formatComposerSegmentLengthLabel(diagnostics, options = {}) {
  const translate = options.translate;
  const graphemeLabel = translate("segmentLengthLabel", {
    count: diagnostics.graphemeCount,
    limit: options.graphemeLimit,
  });
  const byteLabel = translate("segmentByteLengthLabel", {
    count: diagnostics.utf8ByteCount,
    limit: options.byteLimit,
  });
  return `${graphemeLabel} · ${byteLabel}`;
}
