/**
 * Normalizes line endings and excessive whitespace before splitting composer text.
 * @param {string} text - Raw composer text.
 * @returns {string} Normalized text.
 */
export function normalizeComposerInput(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits text at the configured manual marker and normalizes every part.
 * @param {string} text - Raw composer text.
 * @param {string} marker - Manual split marker.
 * @returns {string[]} Non-empty normalized chunks.
 */
export function splitComposerByManualMarkers(text, marker) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(String(marker || ""))
    .map((part) => normalizeComposerInput(part))
    .filter(Boolean);
}

/**
 * Subtracts reserved suffix costs from a complete post limit.
 * @param {{graphemeLimit: number, utf8ByteLimit: number}} limit - Full post limits.
 * @param {{graphemeCount: number, utf8ByteCount: number}} reserved - Reserved suffix costs.
 * @returns {{graphemeLimit: number, utf8ByteLimit: number}} Remaining limit budget.
 */
export function subtractComposerPostTextLimit(limit, reserved) {
  return {
    graphemeLimit: limit.graphemeLimit - reserved.graphemeCount,
    utf8ByteLimit: limit.utf8ByteLimit - reserved.utf8ByteCount,
  };
}

/**
 * Tokenizes text into newlines, whitespace runs, and words for greedy splitting.
 * @param {string} text - Text to tokenize.
 * @returns {string[]} Ordered text tokens.
 */
export function tokenizeComposerText(text) {
  return String(text || "").match(/\n|[^\s\n]+|[ \t]+/g) || [];
}

/**
 * Trims a completed composer segment without removing meaningful line breaks.
 * @param {string} segment - Segment text to clean.
 * @returns {string} Normalized segment text.
 */
export function trimComposerSegment(segment) {
  return String(segment || "").replace(/[ \t]+\n/g, "\n").replace(/^[ \t]+|[ \t]+$/g, "").trimEnd();
}

/**
 * Splits composer text into post-safe segments while reserving room for decorations.
 * @param {string} text - Raw composer text.
 * @param {object} options - Segment options and post limits.
 * @param {object} helpers - Existing decoration and greedy-splitting helpers.
 * @returns {string[]} Decorated, post-safe segments.
 */
export function splitComposerIntoSegments(text, options, helpers) {
  const manualChunks = splitComposerByManualMarkers(text, options.manualMarker);
  const fullPostLimit = helpers.createPostTextLimit(options.maxPostLength, options.maxPostUtf8Bytes);
  if (manualChunks.length === 0) {
    return [];
  }

  const reserveForSuffix = (segmentIndex, segmentCount) => {
    const reserved = { graphemeCount: 0, utf8ByteCount: 0 };
    const repeatsHashtag = options.selectedHashtagText
      && (options.repeatedHashtagMode === "all-top" || options.repeatedHashtagMode === "all-bottom");
    const hasIntro = segmentCount > 1 && options.withThreadIntro && segmentIndex === 0;
    const hasThreadEmoji = segmentCount > 1 && options.withThreadEmoji && segmentIndex < segmentCount - 1;
    const hasCounters = segmentCount > 1 && options.withCounters;
    const needsMarkerSpacing = segmentCount > 1 && (hasIntro || hasThreadEmoji || hasCounters) && options.withMarkerSpacing;

    const addReserve = (value) => {
      reserved.graphemeCount += value.graphemeCount;
      reserved.utf8ByteCount += value.utf8ByteCount;
    };
    if (repeatsHashtag) {
      addReserve(helpers.reserveForRepeatedHashtags(options.selectedHashtagText, options.repeatedHashtagMode));
    }
    if (hasIntro) {
      addReserve(helpers.reserveForThreadIntro());
    }
    if (hasThreadEmoji) {
      addReserve(helpers.reserveForThreadEmoji());
    }
    if (hasCounters) {
      addReserve(helpers.reserveForCounters(segmentCount));
    }
    if (needsMarkerSpacing) {
      addReserve(helpers.getPostTextMetrics("\n"));
    }
    return reserved;
  };

  const hasDecorations = options.withCounters || options.withThreadIntro || options.withThreadEmoji
    || (options.selectedHashtagText && (options.repeatedHashtagMode === "all-top" || options.repeatedHashtagMode === "all-bottom"));
  if (!hasDecorations) {
    return helpers.splitChunksGreedy(manualChunks, () => fullPostLimit);
  }

  const estimatedMetrics = manualChunks.reduce((sum, chunk) => {
    const metrics = helpers.getPostTextMetrics(chunk);
    return { graphemeCount: sum.graphemeCount + metrics.graphemeCount, utf8ByteCount: sum.utf8ByteCount + metrics.utf8ByteCount };
  }, { graphemeCount: 0, utf8ByteCount: 0 });
  let guess = Math.max(1, Math.ceil(estimatedMetrics.graphemeCount / options.maxPostLength), Math.ceil(estimatedMetrics.utf8ByteCount / options.maxPostUtf8Bytes), manualChunks.length);

  for (let index = 0; index < 12; index += 1) {
    const segments = helpers.splitChunksGreedy(manualChunks, (segmentIndex) => {
      return subtractComposerPostTextLimit(fullPostLimit, reserveForSuffix(segmentIndex, guess));
    });
    if (segments.length === guess) {
      return helpers.decorateSegments(segments, options);
    }
    guess = segments.length;
  }

  const fallbackSegments = helpers.splitChunksGreedy(manualChunks, (segmentIndex) => {
    return subtractComposerPostTextLimit(fullPostLimit, reserveForSuffix(segmentIndex, guess));
  });
  return helpers.decorateSegments(fallbackSegments, options);
}
