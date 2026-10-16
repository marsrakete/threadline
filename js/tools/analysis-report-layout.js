/** Creates Canvas report measurements and pagination. @param {object} options - Canvas factory and explicit text wrapper. @returns {object} Measurement/pagination operations. */
export function createAnalysisReportLayout(options) {
  /** Counts optional entries. @param {*} values - Entries. @returns {number} Count. */
  function arrayCount(values) { if (Array.isArray(values)) { return values.length; } return 0; }
  /** Chooses a score font weight. @param {object} row - Row. @returns {string} Font weight. */
  function fontWeight(row) { if (row.accent) { return "700"; } return "400"; }
  /** Measures title, text, profile and bar content. @param {object} context - Canvas context. @param {number} scale - Scale. @param {number} width - Card width. @param {object} card - Card content. @returns {number} Height. */
  function measureAnalysisPdfPatternCard(context, scale, width, card) {
    const lineWidth = width - (28 * scale);
    context.font = `700 ${10 * scale}px "Segoe UI", Aptos, sans-serif`;
    const titleLineCount = Math.max(1, options.wrap(context, card.title, lineWidth).length);
    context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
    const lineCount = Math.max(0, (card.lines || []).reduce((sum, line) => sum + Math.max(1, options.wrap(context, line, lineWidth).length), 0));
    const profileCount = arrayCount(card.profileEntries);
    const barCount = arrayCount(card.barEntries);
    const lineHeight = lineCount * 11 * scale;
    const profileHeight = (profileCount * 40 * scale) + (Math.max(0, profileCount - 1) * 8 * scale);
    const barHeight = (barCount * 28 * scale) + (Math.max(0, barCount - 1) * 8 * scale);
    const contentHeight = Math.max(lineHeight, profileHeight, barHeight, 12 * scale);
    return (26 * scale) + (titleLineCount * 12 * scale) + contentHeight + (24 * scale);
  }

  /** Measures a score row. @param {object} context - Context. @param {number} scale - Scale. @param {number} width - Width. @param {object} row - Score. @returns {object} Lines and height. */
  function measureAnalysisPdfScoreRow(context, scale, width, row) {
    context.font = `${fontWeight(row)} ${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
    let text = row.label;
    if (row.accent) { text = `${row.label}: ${row.value}`; }
    const lines = options.wrap(context, text, width - (24 * scale));
    return {
      lines,
      height: Math.max(26 * scale, (lines.length * 11 * scale) + (14 * scale)),
    };
  }

  /** Measures an info paragraph. @param {object} context - Context. @param {number} scale - Scale. @param {number} width - Width. @param {string} text - Text. @param {number} fontSize - Font. @param {number} minHeight - Minimum. @returns {object} Lines and height. */
  function measureAnalysisPdfInfoRow(context, scale, width, text, fontSize = 8.1, minHeight = 22 * scale) {
    context.font = `${fontSize * scale}px "Segoe UI", Aptos, sans-serif`;
    const lines = options.wrap(context, text, width);
    return {
      lines,
      height: Math.max(minHeight, (Math.max(1, lines.length) * 11 * scale) + (10 * scale)),
    };
  }

  /** Measures a heatmap block. @param {number} scale - Scale. @param {number} rowCount - Rows. @returns {number} Height. */
  function measureAnalysisPdfHeatmapHeight(scale, rowCount = 12) {
    return (12 * scale) + (rowCount * 10 * scale) + (Math.max(0, rowCount - 1) * 4 * scale);
  }

  /** Measures four-column table rows. @param {object} context - Context. @param {number} scale - Scale. @param {Array} rows - Text rows. @param {object} widths - Column widths. @returns {Array} Measured rows. */
  function measureAnalysisPdfTableRows(context, scale, rows, widths) {
    return rows.map((row) => {
      context.font = `${8.5 * scale}px "Segoe UI", Aptos, sans-serif`;
      const labelLines = options.wrap(context, row.label, widths.label);
      const leftLines = options.wrap(context, row.left, widths.value);
      const rightLines = options.wrap(context, row.right, widths.value);
      const diffLines = options.wrap(context, row.diff, widths.diff);
      const lineCount = Math.max(labelLines.length, leftLines.length, rightLines.length, diffLines.length, 1);
      return {
        ...row,
        labelLines,
        leftLines,
        rightLines,
        diffLines,
        height: Math.max(24 * scale, (lineCount * 11 * scale) + (10 * scale)),
      };
    });
  }

  /** Paginates measured card pairs without dropping oversize rows. @param {number} scale - Scale. @param {number} cardWidth - Width. @param {number} columnGap - Gap. @param {number} contentHeight - Capacity. @param {Array} rows - Card pairs. @returns {Array} Pages. */
  function buildAnalysisPdfPatternPageLayoutsFromRows(scale, cardWidth, columnGap, contentHeight, rows) {
    const measureCanvas = options.canvas();
    measureCanvas.width = 1190;
    measureCanvas.height = 1684;
    const measureContext = measureCanvas.getContext("2d");
    const patternWidth = (cardWidth - columnGap) / 2;
    const rowGap = 14 * scale;
    const measuredRows = rows.map((row) => {
      const leftHeight = measureAnalysisPdfPatternCard(measureContext, scale, patternWidth, row.left);
      const rightHeight = measureAnalysisPdfPatternCard(measureContext, scale, patternWidth, row.right);
      return {
        ...row,
        height: Math.max(leftHeight, rightHeight),
      };
    });

    const pages = [];
    let currentPage = [];
    let usedHeight = 0;
    measuredRows.forEach((row) => {
      let nextHeight = row.height;
      if (currentPage.length) { nextHeight = usedHeight + rowGap + row.height; }
      if (currentPage.length && nextHeight > contentHeight) {
        pages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }
      currentPage.push(row);
      if (currentPage.length === 1) { usedHeight = row.height; }
      else { usedHeight += rowGap + row.height; }
    });
    if (currentPage.length) {
      pages.push(currentPage);
    }
    return pages;
  }

  /** Paginates measured tables retaining column widths. @param {number} scale - Scale. @param {number} cardWidth - Width. @param {number} contentHeight - Capacity. @param {Array} rows - Text rows. @param {object} columns - Width shares. @returns {object} Pages and widths. */
  function buildAnalysisPdfTablePageLayouts(scale, cardWidth, contentHeight, rows, columns) {
    const measureCanvas = options.canvas();
    measureCanvas.width = 1190;
    measureCanvas.height = 1684;
    const measureContext = measureCanvas.getContext("2d");
    const tableWidth = cardWidth - (36 * scale);
    const widths = {
      label: tableWidth * columns.label,
      value: tableWidth * columns.value,
      diff: tableWidth * columns.diff,
    };
    const measuredRows = measureAnalysisPdfTableRows(measureContext, scale, rows, widths);
    const availableBodyHeight = Math.max(80 * scale, contentHeight - (92 * scale));
    const pages = [];
    let currentPage = [];
    let usedHeight = 0;

    measuredRows.forEach((row) => {
      if (currentPage.length && (usedHeight + row.height) > availableBodyHeight) {
        pages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }
      currentPage.push(row);
      usedHeight += row.height;
    });

    if (currentPage.length) {
      pages.push(currentPage);
    }
    return { pages, widths };
  }
  return { pattern: measureAnalysisPdfPatternCard, score: measureAnalysisPdfScoreRow, info: measureAnalysisPdfInfoRow,
    heatmap: measureAnalysisPdfHeatmapHeight, rows: measureAnalysisPdfTableRows,
    patterns: buildAnalysisPdfPatternPageLayoutsFromRows, table: buildAnalysisPdfTablePageLayouts };
}

