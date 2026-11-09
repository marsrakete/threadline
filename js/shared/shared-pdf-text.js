/**
 * Creates shared linked-text layout and drawing operations for PDF and HTML exports.
 * @param {object} options - Rich-text adapters.
 * @param {(text: string, facets: object[]) => object[]|null} options.facetRuns - Authoritative facet runs or null to infer URLs.
 * @returns {{links: Function, wrap: Function, draw: Function, rectangle: Function}} Link runs, measured lines, drawing and A4 annotation coordinates.
 */
export function createPdfTextLayout(options) {
  if (!options || typeof options.facetRuns !== "function") {
    throw new TypeError("PDF text layout requires a facet-run adapter.");
  }
  /**
   * Resolves facet links or infers URLs from plain text.
   * @param {*} text - Source text.
   * @param {object[]} facets - Rich-text facets.
   * @returns {object[]} Ordered text/link runs, including empty fallback text.
   */
  function extractPdfLinkRuns(text, facets = []) {
    const facetRuns = options.facetRuns(text, facets);
    if (facetRuns) {
      return facetRuns;
    }

    const value = String(text || "");
    const regex = /(^|\s|\()((https?:\/\/[^\s]+)|((?<domain>[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})[^\s]*))/gim;
    const runs = [];
    let cursor = 0;
    let match;

    while ((match = regex.exec(value))) {
      let uri = match[2];
      const start = match.index + match[1].length;
      let end = start + match[2].length;
      const consumedEnd = start + match[2].length;

      if (!uri.startsWith("http")) {
        uri = `https://${uri}`;
      }

      while (/[.,;!?]$/.test(uri)) {
        uri = uri.slice(0, -1);
        end -= 1;
      }

      if (/[)]$/.test(uri) && !uri.includes("(")) {
        uri = uri.slice(0, -1);
        end -= 1;
      }

      if (start > cursor) {
        runs.push({ text: value.slice(cursor, start) });
      }
      runs.push({
        text: value.slice(start, end),
        url: uri,
      });
      if (end < consumedEnd) {
        runs.push({ text: value.slice(end, consumedEnd) });
      }
      cursor = consumedEnd;
    }

    if (cursor < value.length) {
      runs.push({ text: value.slice(cursor) });
    }

    if (runs.length > 0) {
      return runs;
    }
    return [{ text: value }];
  }

  /**
   * Splits text/link runs into words, whitespace and explicit newlines.
   * @param {*} text - Source text.
   * @param {object[]} facets - Rich-text facets.
   * @returns {object[]} Tokens retaining link targets.
   */
  function buildPdfTextTokens(text, facets = []) {
    const runs = extractPdfLinkRuns(text, facets);
    const tokens = [];

    for (const run of runs) {
      const parts = String(run.text || "").split("\n");
      parts.forEach((part, partIndex) => {
        let chunks = part.match(/\S+\s*|\s+/g);
        if (!chunks) {
          chunks = [];
          if (part) {
            chunks = [part];
          }
        }
        chunks.forEach((chunk) => {
          tokens.push({
            text: chunk,
            url: run.url || "",
          });
        });
        if (partIndex < parts.length - 1) {
          tokens.push({ text: "\n", newline: true });
        }
      });
    }

    return tokens;
  }

  /**
   * Fits at least one code point to prevent wrapping from stalling.
   * @param {CanvasRenderingContext2D} context - Active font measurer.
   * @param {string} text - Remaining token.
   * @param {number} maxWidth - Available width.
   * @returns {string} Fitting prefix or the first code point.
   */
  function fitPdfTokenToWidth(context, text, maxWidth) {
    if (!text) {
      return "";
    }
    let fitted = "";
    for (const char of text) {
      const candidate = fitted + char;
      if (!fitted || context.measureText(candidate).width <= maxWidth) {
        fitted = candidate;
      } else {
        break;
      }
    }
    return fitted || text.slice(0, 1);
  }

  /**
   * Wraps linked text with the active Canvas font.
   * @param {CanvasRenderingContext2D} context - Font measurer.
   * @param {*} text - Source text.
   * @param {number} maxWidth - Line width in Canvas units.
   * @param {object[]} facets - Rich-text facets.
   * @returns {object[]} Lines containing measured fragments and total widths.
   */
  function buildWrappedPdfLines(context, text, maxWidth, facets = []) {
    const tokens = buildPdfTextTokens(text, facets);
    const lines = [];
    let currentFragments = [];
    let currentWidth = 0;

    /**
     * Commits the current fragments and resets line state.
     * @returns {void}
     */
    function pushLine() {
      lines.push({
        fragments: currentFragments,
        width: currentWidth,
      });
      currentFragments = [];
      currentWidth = 0;
    }

    /**
     * Appends a measured fragment.
     * @param {string} textValue - Visible text.
     * @param {string} url - Optional link target.
     * @returns {void}
     */
    function appendFragment(textValue, url) {
      if (!textValue) {
        return;
      }
      const width = context.measureText(textValue).width;
      currentFragments.push({ text: textValue, url, width });
      currentWidth += width;
    }

    for (const token of tokens) {
      if (token.newline) {
        pushLine();
        continue;
      }

      let remaining = token.text;
      while (remaining) {
        if (currentWidth === 0) {
          remaining = remaining.replace(/^\s+/, "");
          if (!remaining) {
            break;
          }
        }

        const availableWidth = Math.max(1, maxWidth - currentWidth);
        const remainingWidth = context.measureText(remaining).width;

        if (remainingWidth <= availableWidth) {
          appendFragment(remaining, token.url);
          remaining = "";
          continue;
        }

        if (currentWidth > 0) {
          pushLine();
          continue;
        }

        const fitted = fitPdfTokenToWidth(context, remaining, availableWidth);
        appendFragment(fitted, token.url);
        remaining = remaining.slice(fitted.length);
        if (remaining) {
          pushLine();
        }
      }
    }

    if (currentFragments.length > 0 || lines.length === 0) {
      pushLine();
    }

    return lines;
  }

  /**
   * Draws wrapped fragments and collects link rectangles.
   * @param {CanvasRenderingContext2D} context - Drawing target.
   * @param {object[]} lines - Measured lines.
   * @param {number} x - Left edge.
   * @param {number} y - Top edge.
   * @param {number} lineHeight - Line spacing.
   * @returns {{height: number, annotations: object[]}} Block height and Canvas link bounds.
   */
  function drawArchivePdfTextBlock(context, lines, x, y, lineHeight) {
    const annotations = [];
    context.textBaseline = "top";

    lines.forEach((line, lineIndex) => {
      let cursorX = x;
      const lineY = y + (lineIndex * lineHeight);

      line.fragments.forEach((fragment) => {
        if (!fragment.text) {
          return;
        }

        context.fillStyle = "#17233a";
        if (fragment.url) {
          context.fillStyle = "#1d4ed8";
        }
        context.fillText(fragment.text, cursorX, lineY);

        if (fragment.url) {
          const underlineY = lineY + lineHeight - 2;
          context.fillRect(cursorX, underlineY, fragment.width, Math.max(1, lineHeight * 0.08));
          annotations.push({
            x: cursorX,
            y: lineY,
            width: fragment.width,
            height: lineHeight,
            url: fragment.url,
          });
        }

        cursorX += fragment.width;
      });
    });

    return {
      height: lines.length * lineHeight,
      annotations,
    };
  }

  /**
   * Maps a top-left Canvas rectangle to bottom-left A4 PDF coordinates.
   * @param {{x: number, y: number, width: number, height: number}} rect - Canvas bounds.
   * @param {number} canvasWidth - Canvas width.
   * @param {number} canvasHeight - Canvas height.
   * @returns {number[]} PDF rectangle rounded to two decimals.
   */
  function canvasRectToPdfRect(rect, canvasWidth, canvasHeight) {
    const scaleX = 595 / canvasWidth;
    const scaleY = 842 / canvasHeight;
    return [
      Number((rect.x * scaleX).toFixed(2)),
      Number(((canvasHeight - (rect.y + rect.height)) * scaleY).toFixed(2)),
      Number(((rect.x + rect.width) * scaleX).toFixed(2)),
      Number(((canvasHeight - rect.y) * scaleY).toFixed(2)),
    ];
  }

  return { links: extractPdfLinkRuns, wrap: buildWrappedPdfLines, draw: drawArchivePdfTextBlock, rectangle: canvasRectToPdfRect };
}
