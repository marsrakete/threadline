/**
 * Creates the complete text splitting and decoration service.
 * @param {object} options - Grapheme/byte metrics, limits, tokenization, introduction and hashtag access.
 * @returns {object} Composition and decorated segmentation operations.
 */
export function createComposerTextService(options) {
  const { splitIntoGraphemes, createPostTextLimit, fitsPostTextLimit, getPostTextMetrics,
    tokenizeText, trimSegment, getThreadIntroText, getSelectedHashtagText, getHashtagPlacement,
    MANUAL_SPLIT_MARKER, MAX_POST_LENGTH, MAX_POST_UTF8_BYTES } = options;
  /**
   * Splits a single token into Bluesky-sized chunks based on grapheme and byte limits.
   * @param {string} text - Token that may exceed the per-segment limits.
   * @param {Function} limitFactory - Returns the limit object for the next chunk index.
   * @param {number} initialChunkIndex - Current global chunk index before splitting.
   * @returns {string[]} Post-safe token slices.
   */
  function splitTokenByPostLimit(text, limitFactory, initialChunkIndex) {
    const graphemes = splitIntoGraphemes(text);
    const slices = [];
    let start = 0;
    let chunkIndex = initialChunkIndex;

    while (start < graphemes.length) {
      const rawLimit = limitFactory(chunkIndex);
      const limit = createPostTextLimit(
        Math.max(1, rawLimit.graphemeLimit),
        Math.max(1, rawLimit.utf8ByteLimit),
      );
      let end = start;
      let slice = "";

      while (end < graphemes.length) {
        const nextSlice = `${slice}${graphemes[end]}`;
        if (!fitsPostTextLimit(nextSlice, limit)) {
          break;
        }
        slice = nextSlice;
        end += 1;
      }

      if (!slice) {
        slice = graphemes[start];
        end = start + 1;
      }

      slices.push(slice);
      start = end;
      chunkIndex += 1;
    }

    return slices;
  }

  /**
   * Combines source text and selected hashtags at their configured placement.
   * @param {*} baseText - baseText supplied by the caller.
   * @returns {string} Combines source text and selected hashtags at their configured placement.
   */
  function buildComposedText(baseText) {
    const trimmedBase = baseText.trim();
    const selectedText = getSelectedHashtagText();
    const hashtagPlacement = getHashtagPlacement();

    if (!selectedText || hashtagPlacement === "all-top" || hashtagPlacement === "all-bottom") {
      return trimmedBase;
    }

    if (!trimmedBase) {
      return selectedText;
    }

    if (hashtagPlacement === "last") { return `${trimmedBase}\n\n${selectedText}`; }
    return `${selectedText}\n\n${trimmedBase}`;
  }

  /**
   * Measures the suffix budget for thread counters.
   * @param {*} segmentCount - segmentCount supplied by the caller.
   * @returns {object} Measures the suffix budget for thread counters.
   */
  function reserveForCounters(segmentCount) {
    const normalizedCount = Math.max(segmentCount, 1);
    return getPostTextMetrics(`\n${normalizedCount}/${normalizedCount}`);
  }

  /**
   * Measures the continuation emoji suffix.
   * @returns {object} Measures the continuation emoji suffix.
   */
  function reserveForThreadEmoji() {
    return getPostTextMetrics("\n⤵️");
  }

  /**
   * Measures the localized thread introduction suffix.
   * @returns {object} Measures the localized thread introduction suffix.
   */
  function reserveForThreadIntro() {
    return getPostTextMetrics(`\n${getThreadIntroText()}`);
  }

  /**
   * Measures repeated hashtag decoration costs.
   * @param {*} selectedText - selectedText supplied by the caller.
   * @param {*} placementMode - placementMode supplied by the caller.
   * @returns {object} Measures repeated hashtag decoration costs.
   */
  function reserveForRepeatedHashtags(selectedText, placementMode) {
    if (!selectedText) {
      return getPostTextMetrics("");
    }

    if (placementMode === "all-bottom") {
      return getPostTextMetrics(`\n\n${selectedText}`);
    }

    return getPostTextMetrics(`\n${selectedText}`);
  }

  /**
   * Splits manual chunks while preserving global segment indices.
   * @param {*} chunks - chunks supplied by the caller.
   * @param {*} limitFactory - limitFactory supplied by the caller.
   * @returns {string[]} Splits manual chunks while preserving global segment indices.
   */
  function splitChunksGreedy(chunks, limitFactory) {
    let globalOffset = 0;
    return chunks.flatMap((chunk) => {
      const split = greedySplit(chunk, (chunkIndex) => limitFactory(globalOffset + chunkIndex));
      globalOffset += split.length;
      return split;
    });
  }

  /**
   * Adds hashtags, introduction, continuation markers and counters.
   * @param {*} segments - segments supplied by the caller.
   * @param {*} withCounters - withCounters supplied by the caller.
   * @param {*} withThreadIntro - withThreadIntro supplied by the caller.
   * @param {*} withThreadEmoji - withThreadEmoji supplied by the caller.
   * @param {*} withMarkerSpacing - withMarkerSpacing supplied by the caller.
   * @param {*} repeatedHashtagMode - repeatedHashtagMode supplied by the caller.
   * @param {*} selectedHashtagText - selectedHashtagText supplied by the caller.
   * @returns {string[]} Adds hashtags, introduction, continuation markers and counters.
   */
  function decorateSegments(segments, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText) {
    return segments.map((segment, segmentIndex) => {
      let content = segment;
      let suffix = "";
      const isLastSegment = segmentIndex === segments.length - 1;
      const isThread = segments.length > 1;
      const hasRepeatedHashtags = selectedHashtagText && (repeatedHashtagMode === "all-top" || repeatedHashtagMode === "all-bottom");

      if (hasRepeatedHashtags && repeatedHashtagMode === "all-top") {
        content = `${selectedHashtagText}\n${content}`;
      }

      if (hasRepeatedHashtags && repeatedHashtagMode === "all-bottom") {
        content = `${content}\n\n${selectedHashtagText}`;
      }

      if (isThread && withThreadIntro && segmentIndex === 0) {
        suffix += `\n${getThreadIntroText()}`;
      }

      if (isThread && withThreadEmoji && !isLastSegment) {
        suffix += "\n⤵️";
      }

      if (isThread && withCounters) {
        suffix += `\n${segmentIndex + 1}/${segments.length}`;
      }

      if (withMarkerSpacing && suffix) {
        suffix = `\n${suffix}`;
      }

      return `${content}${suffix}`;
    });
  }

  /**
   * Splits source text with the configured limits and decorations.
   * @param {*} text - text supplied by the caller.
   * @param {*} withCounters - withCounters supplied by the caller.
   * @param {*} withThreadIntro - withThreadIntro supplied by the caller.
   * @param {*} withThreadEmoji - withThreadEmoji supplied by the caller.
   * @param {*} withMarkerSpacing - withMarkerSpacing supplied by the caller.
   * @param {*} repeatedHashtagMode - repeatedHashtagMode supplied by the caller.
   * @param {*} selectedHashtagText - selectedHashtagText supplied by the caller.
   * @returns {string[]} Splits source text with the configured limits and decorations.
   */
  function splitIntoSegments(text, withCounters, withThreadIntro, withThreadEmoji, withMarkerSpacing, repeatedHashtagMode, selectedHashtagText) {
    return splitComposerIntoSegments(text, {
      manualMarker: MANUAL_SPLIT_MARKER,
      maxPostLength: MAX_POST_LENGTH,
      maxPostUtf8Bytes: MAX_POST_UTF8_BYTES,
      withCounters,
      withThreadIntro,
      withThreadEmoji,
      withMarkerSpacing,
      repeatedHashtagMode,
      selectedHashtagText,
    }, {
      createPostTextLimit,
      getPostTextMetrics,
      reserveForCounters,
      reserveForThreadEmoji,
      reserveForThreadIntro,
      reserveForRepeatedHashtags,
      splitChunksGreedy,
      decorateSegments(segments, options) {
        return decorateSegments(
          segments,
          options.withCounters,
          options.withThreadIntro,
          options.withThreadEmoji,
          options.withMarkerSpacing,
          options.repeatedHashtagMode,
          options.selectedHashtagText,
        );
      },
    });
  }

  /**
   * Greedily splits words, whitespace and oversized grapheme tokens.
   * @param {*} text - text supplied by the caller.
   * @param {*} limitFactory - limitFactory supplied by the caller.
   * @returns {string[]} Greedily splits words, whitespace and oversized grapheme tokens.
   */
  function greedySplit(text, limitFactory) {
    const tokens = tokenizeText(text);
    const segments = [];
    let current = "";

    for (const token of tokens) {
      const chunkIndex = segments.length;
      const rawLimit = limitFactory(chunkIndex);
      const limit = createPostTextLimit(
        Math.max(1, rawLimit.graphemeLimit),
        Math.max(1, rawLimit.utf8ByteLimit),
      );
      const nextValue = current + token;

      if (token === "\n") {
        if (fitsPostTextLimit(nextValue, limit)) {
          current = nextValue;
        } else if (current) {
          segments.push(trimSegment(current));
          current = "";
        }
        continue;
      }

      if (/^[ \t]+$/.test(token)) {
        if (current && fitsPostTextLimit(nextValue, limit)) {
          current = nextValue;
        }
        continue;
      }

      if (!fitsPostTextLimit(token, limit)) {
        if (current) {
          segments.push(trimSegment(current));
          current = "";
        }

        const slices = splitTokenByPostLimit(token, limitFactory, segments.length);
        for (const slice of slices) {
          segments.push(slice);
        }
        continue;
      }

      if (fitsPostTextLimit(nextValue, limit)) {
        current = nextValue;
        continue;
      }

      if (current) {
        segments.push(trimSegment(current));
      }
      current = token;
    }

    if (current) {
      segments.push(trimSegment(current));
    }

    return segments;
  }
  return { splitIntoSegments, buildComposedText };
}

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
