/**
 * Checks publish prerequisites in their existing UI order before any confirmation.
 * @param {object} options - Source text, limits, metrics, segment reader and media/connectivity flags.
 * @returns {{segments: Array<object>, errorKey: string, warnInput: boolean, showDialog: boolean}} Validation outcome.
 */
export function validateComposerPublishInput(options) {
  const result = { segments: [], errorKey: "", warnInput: false, showDialog: false };
  if (!options.sourceText.trim()) {
    result.errorKey = "statusNeedText";
  } else if (options.countGraphemes(options.sourceText) > options.composerLimit) {
    result.errorKey = "composerTextTooLong";
    result.warnInput = true;
  } else {
    result.segments = options.getSegments();
    if (result.segments.some((entry) => !entry.text)) {
      result.errorKey = "statusEmptySegments";
    } else if (result.segments.some((entry) => {
      const metrics = options.getMetrics(entry.text);
      return metrics.graphemeCount > options.postLimit || metrics.utf8ByteCount > options.byteLimit;
    })) {
      result.errorKey = "statusSegmentTooLong";
    } else if (options.altTextRequired && result.segments.some((entry) => entry.images.some((image) => !String(image.alt || "").trim()))) {
      result.errorKey = "statusAltTextRequired";
    } else if (!options.autoResize && result.segments.some((entry) => entry.images.some((image) => image.validation?.tooBig))) {
      result.errorKey = "statusImageTooLarge";
      result.showDialog = true;
    } else if (!options.online) {
      result.errorKey = "statusOfflineBeforePublish";
      result.showDialog = true;
    }
  }
  return result;
}

/**
 * Calculates editing-time publication availability without imposing login/online checks.
 * @param {object} options - Source/composed text, segments, media, metrics and limits.
 * @returns {{disabled: boolean, danger: boolean, warningKeys: string[]}} Button and warning presentation.
 */
export function getComposerPublishAvailability(options) {
  let texts = options.activeSegments;
  if (texts.length === 0 && options.composedText.trim()) { texts = [options.composedText]; }
  const sourceTooLong = options.countGraphemes(options.sourceText) > options.composerLimit;
  const sectionTooLong = texts.some((text) => {
    const metrics = options.getMetrics(text);
    return metrics.graphemeCount > options.postLimit || metrics.utf8ByteCount > options.byteLimit;
  });
  const payloads = options.getSegments();
  const missingAlt = options.altTextRequired && payloads.some((section) =>
    (section.images || []).some((image) => !String(image.alt || "").trim()));
  const oversized = !options.autoResize && payloads.some((section) =>
    (section.images || []).some((image) => image.validation?.tooBig));
  const warningKeys = [];
  if (missingAlt) { warningKeys.push("publishAltTextWarning"); }
  if (oversized) { warningKeys.push("publishImageTooLargeWarning"); }
  const danger = sourceTooLong || sectionTooLong || missingAlt || oversized;
  return { disabled: !options.sourceText.trim() || danger, danger, warningKeys };
}

/**
 * Creates the editing-time publish-button/warning renderer.
 * @param {object} elements - Publish button and warning container.
 * @param {object} options - Current validation options, translation and input-warning callback.
 * @returns {object} Availability render operation.
 */
export function createComposerPublishAvailabilityController(elements, options) {
  /** Refreshes button state and localized warnings from current document data. @returns {void} */
  function render() {
    const model = getComposerPublishAvailability(options.getOptions());
    elements.button.disabled = model.disabled;
    elements.button.classList.toggle("is-danger", model.danger);
    options.updateInputWarning(false);
    elements.warning.hidden = model.warningKeys.length === 0;
    elements.warning.textContent = model.warningKeys.map((key) => options.translate(key)).join("\n");
  }
  return { render };
}

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
/**
 * Detects whether text contains emoji-like or combined grapheme sequences.
 * @param {string} text - Source text to inspect.
 * @returns {boolean} True when emoji or joined graphemes are present.
 */
export function hasEmojiLikeGraphemes(text) {
  return /[\p{Extended_Pictographic}\u200d\uFE0F]/u.test(String(text || ""));
}
/**
 * Detects Chinese or Japanese scripts that consume the limit one visible sign at a time.
 * @param {string} text - Source text to inspect.
 * @returns {boolean} True when Han, Hiragana, or Katakana characters are present.
 */
export function hasCjkGraphemes(text) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(String(text || ""));
}
/**
 * Formats the composer counter using the Bluesky grapheme count.
 * @param {string} text - Current composer text.
 * @param {Function} countGraphemes - Grapheme counter.
 * @param {Function} translate - Translation callback.
 * @returns {string} Localized counter label for the composer header.
 */
export function formatComposerCharacterCount(text, countGraphemes, translate) {
  const normalizedText = String(text || "");
  const graphemeCount = countGraphemes(normalizedText);
  return translate("charCount", { count: graphemeCount });
}
