/** Creates analysis Canvas rendering and PDF export with explicit adapters. @param {object} options - Live state, report models/layout, drawing, assets, clock and delivery. @returns {object} Page, drawing, avatar and export operations. */
export function createAnalysisPdfRenderer(options) {
  const state = options.state;
  const t = options.t;
  const analysisPdfAvatarBitmapCache = new Map();
  /** Chooses a score font. @param {object} row - Row. @returns {string} Weight. */
  function scoreWeight(row) { if (row.accent) { return "700"; } return "400"; }
  /** Chooses a heatmap fill. @param {string} accent - Color. @param {number} alpha - Intensity. @returns {string} RGBA. */
  function heatColor(accent, alpha) { if (accent === "#3f7cd6") { return `rgba(63, 124, 214, ${alpha * 0.92})`; } return `rgba(39, 182, 160, ${alpha * 0.92})`; }
  /** Formats the summary range. @param {object} account - Account. @returns {string} Copy. */
  function rangeLabel(account) { if (account.filters.rangeDays > 0) { return t("analysisSummaryRangeDays", { count: account.filters.rangeDays }); } return t("analysisSummaryRangeAll"); }
  /** Formats the summary preview. @param {object} account - Account. @returns {string} Copy. */
  function latestLabel(account) { if (account.posts[0]?.createdAt) { return t("analysisSummaryLatestPost", { value: options.timestamp(account.posts[0].createdAt) }); } return t("analysisSummaryNoPreview"); }
  /** Creates the unchanged A4 Canvas shell. @param {number} pageIndex - Zero-based page. @param {number} pageCount - Total pages. @returns {object} Canvas and geometry. */
  function createAnalysisPdfBasePage(pageIndex, pageCount) {
    const canvas = options.canvas();
    canvas.width = 1190;
    canvas.height = 1684;
    const context = canvas.getContext("2d");
    const scale = canvas.width / 595;
    const margin = 28 * scale;
    const pageWidth = canvas.width - (margin * 2);
    const pageHeight = canvas.height - (margin * 2);
    let cursorY = margin + (22 * scale);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#f3f8ff");
    gradient.addColorStop(1, "#e7eef9");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    options.fill(context, margin, margin, pageWidth, pageHeight, 22 * scale, "rgba(255,255,255,0.52)");
    options.stroke(context, margin, margin, pageWidth, pageHeight, 22 * scale, "#d5e1f3", 1.2 * scale);

    context.textBaseline = "top";
    context.fillStyle = "#10233e";
    context.font = `700 ${18 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("analysisPdfTitle"), margin + (18 * scale), cursorY);
    cursorY += 24 * scale;
    context.fillStyle = "#587192";
    context.font = `${9.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(
      `${options.date(options.now().toISOString())} - ${t("analysisPdfPage", { index: pageIndex + 1, count: pageCount })}`,
      margin + (18 * scale),
      cursorY,
    );
    cursorY += 22 * scale;

    const cardX = margin + (18 * scale);
    const cardWidth = pageWidth - (36 * scale);
    const columnGap = 14 * scale;
    const columnWidth = (cardWidth - columnGap) / 2;

    return {
      canvas,
      context,
      scale,
      margin,
      pageWidth,
      pageHeight,
      cursorY,
      cardX,
      cardWidth,
      columnGap,
      columnWidth,
      contentBottom: margin + pageHeight - (18 * scale),
    };
  }

  /** Loads and caches an anonymous avatar bitmap, including failures. @param {string} url - Avatar URL. @returns {Promise<object|null>} Bitmap or null. */
  async function loadAnalysisPdfAvatarBitmap(url) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return null;
    }
    if (analysisPdfAvatarBitmapCache.has(normalizedUrl)) {
      return analysisPdfAvatarBitmapCache.get(normalizedUrl);
    }
    const promise = (async () => {
      const response = await options.fetch(normalizedUrl, { mode: "cors", credentials: "omit" });
      if (!response.ok) {
        throw new Error(`Avatar HTTP ${response.status}`);
      }
      const blob = await response.blob();
      return options.bitmap(blob);
    })().catch(() => null);
    analysisPdfAvatarBitmapCache.set(normalizedUrl, promise);
    return promise;
  }

  /** Draws text/profile/bar card content. @param {object} context - Context. @param {number} scale - Scale. @param {number} x - X. @param {number} y - Y. @param {number} width - Width. @param {number} cardHeight - Height. @param {object} card - Content. @returns {Promise<void>} Completion. */
  async function drawAnalysisPdfPatternCard(context, scale, x, y, width, cardHeight, card) {
    options.fill(context, x, y, width, cardHeight, 18 * scale, "#ffffff");
    options.stroke(context, x, y, width, cardHeight, 18 * scale, "#d7e3f5", 1 * scale);
    context.fillStyle = "#13213c";
    context.font = `700 ${10 * scale}px "Segoe UI", Aptos, sans-serif`;
    const maxWidth = width - (28 * scale);
    const titleLines = options.wrap(context, card.title, maxWidth);
    options.text(context, titleLines, x + (14 * scale), y + (14 * scale), 12 * scale);
    context.fillStyle = "#415b81";
    context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
    let lineY = y + (20 * scale) + (titleLines.length * 12 * scale);
    if (Array.isArray(card.profileEntries) && card.profileEntries.length) {
      for (const entry of card.profileEntries) {
        const avatarSize = 24 * scale;
        const avatarX = x + (14 * scale);
        const avatarY = lineY;
        const avatarBitmap = await loadAnalysisPdfAvatarBitmap(entry?.avatar || "");
        if (avatarBitmap) {
          options.circle(context, avatarBitmap, avatarX, avatarY, avatarSize, "#eef4ff");
        } else {
          options.fill(context, avatarX, avatarY, avatarSize, avatarSize, 8 * scale, "#eef4ff");
        }
        const textX = avatarX + avatarSize + (8 * scale);
        const textWidth = width - (textX - x) - (14 * scale);
        context.fillStyle = "#13213c";
        context.font = `700 ${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
        const title = String(entry?.displayName || entry?.handle || entry?.did || entry?.label || "").trim();
        const titleLinesLocal = options.wrap(context, title, textWidth);
        options.text(context, titleLinesLocal, textX, lineY, 10 * scale);
        context.fillStyle = "#587192";
        context.font = `${7.8 * scale}px "Segoe UI", Aptos, sans-serif`;
        const metaText = `@${String(entry?.handle || entry?.did || entry?.label || "").trim()} · ${options.percent(entry?.share ?? 0)}`;
        const metaLines = options.wrap(context, metaText, textWidth);
        options.text(context, metaLines, textX, lineY + (10 * scale), 9 * scale);
        lineY += (32 * scale);
      }
      return;
    }
    if (Array.isArray(card.barEntries) && card.barEntries.length) {
      const trackX = x + (14 * scale);
      context.font = `${8 * scale}px "Segoe UI", Aptos, sans-serif`;
      const labelWidths = card.barEntries.map((entry) => {
        let label = entry.label;
        if (entry.labelKey) { label = t(entry.labelKey); }
        return context.measureText(String(label || "")).width + (8 * scale);
      });
      const labelWidth = Math.min(width * 0.48, Math.max(40 * scale, ...labelWidths));
      const trackWidth = width - (28 * scale) - labelWidth - (8 * scale);
      card.barEntries.forEach((entry) => {
        let label = entry.label;
        if (entry.labelKey) { label = t(entry.labelKey); }
        context.fillStyle = "#415b81";
        context.font = `${8 * scale}px "Segoe UI", Aptos, sans-serif`;
        context.fillText(label, trackX, lineY + (2 * scale));
        const trackStartX = trackX + labelWidth;
        options.fill(context, trackStartX, lineY, trackWidth, 12 * scale, 6 * scale, "#edf4ff");
        options.fill(context, trackStartX, lineY, trackWidth * Math.max(0, Math.min(1, entry.share ?? entry.value ?? 0)), 12 * scale, 6 * scale, "#27b6a0");
        context.fillStyle = "#13213c";
        context.font = `700 ${7.8 * scale}px "Segoe UI", Aptos, sans-serif`;
        const valueText = options.percent(entry.share ?? entry.value ?? 0);
        const valueWidth = context.measureText(valueText).width;
        context.fillText(valueText, trackStartX + trackWidth - valueWidth, lineY + (1 * scale));
        lineY += 20 * scale;
      });
      return;
    }
    (card.lines || []).forEach((line) => {
      const wrapped = options.wrap(context, line, maxWidth);
      options.text(context, wrapped, x + (14 * scale), lineY, 11 * scale);
      lineY += Math.max(1, wrapped.length) * 11 * scale;
    });
  }

  /** Draws measured score content. @param {object} context - Context. @param {number} scale - Scale. @param {number} x - X. @param {number} y - Y. @param {number} width - Width. @param {object} row - Content. @param {object} measured - Geometry. @returns {void} */
  function drawAnalysisPdfScoreRow(context, scale, x, y, width, row, measured) {
    let boxColor = "#edf4ff";
    if (row.accent) { boxColor = "#e8fbf7"; }
    let borderColor = "#d0ddf6";
    if (row.accent) { borderColor = "#bfeee3"; }
    options.fill(context, x, y, width, measured.height, 13 * scale, boxColor);
    options.stroke(context, x, y, width, measured.height, 13 * scale, borderColor, 1 * scale);
    context.fillStyle = "#3d5f8f";
    if (row.accent) { context.fillStyle = "#17927f"; }
    context.font = `${scoreWeight(row)} ${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
    options.text(context, measured.lines, x + (12 * scale), y + (7 * scale), 11 * scale);
  }

  /** Draws a UTC heatmap. @param {object} context - Context. @param {number} scale - Scale. @param {number} x - X. @param {number} y - Y. @param {number} width - Width. @param {Array} heatmap - Counts. @param {string} accent - Color. @returns {number} Height. */
  function drawAnalysisPdfHeatmapGrid(context, scale, x, y, width, heatmap = [], accent = "#27b6a0") {
    const labelWidth = 34 * scale;
    const gap = 4 * scale;
    const innerWidth = width - labelWidth - gap;
    const cellGap = 4 * scale;
    const cellWidth = (innerWidth - (6 * cellGap)) / 7;
    const cellHeight = 10 * scale;
    const rowGap = 4 * scale;
    let values = [];
    if (Array.isArray(heatmap)) { values = heatmap; }
    const maxValue = Math.max(1, ...values.flat());

    context.fillStyle = "#587192";
    context.font = `${7 * scale}px "Segoe UI", Aptos, sans-serif`;
    for (let weekday = 0; weekday < 7; weekday += 1) {
      context.fillText(options.weekday(weekday), x + labelWidth + (weekday * (cellWidth + cellGap)), y);
    }

    let rowY = y + (12 * scale);
    values.forEach((row, rowIndex) => {
      context.fillStyle = "#587192";
      context.font = `${6.8 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(`${String(rowIndex * 2).padStart(2, "0")}`, x, rowY + (1 * scale));
      row.forEach((value, columnIndex) => {
        const alpha = Math.max(0.08, (Number(value) || 0) / maxValue);
        options.fill(
          context,
          x + labelWidth + (columnIndex * (cellWidth + cellGap)),
          rowY,
          cellWidth,
          cellHeight,
          3 * scale,
          heatColor(accent, alpha),
        );
      });
      rowY += cellHeight + rowGap;
    });
    return rowY - y;
  }

  /** Draws account and score overview. @param {number} pageIndex - Page. @param {number} pageCount - Total. @returns {Promise<object>} Canvas. */
  async function renderAnalysisPdfOverviewPage(pageIndex, pageCount) {
    const {
      canvas,
      context,
      scale,
      cursorY: initialCursorY,
      cardX,
      cardWidth,
      columnGap,
      columnWidth,
    } = createAnalysisPdfBasePage(pageIndex, pageCount);
    let cursorY = initialCursorY;

    /** Draws one account summary. @param {object} account - Account. @param {number} x - X. @param {number} y - Y. @param {string} label - Slot label. @returns {number} Height. */
    const drawAccountCard = (account, x, y, label) => {
      const statRows = [
        t("analysisSummaryPostsLoaded", { count: options.count(account.posts.length) }),
        t("analysisSummaryWordsLoaded", { count: options.count(account.corpus.wordCount) }),
        rangeLabel(account),
        t("analysisSummaryPagesLoaded", { count: options.count(account.stats.pages) }),
        latestLabel(account),
      ];
      const measuredRows = statRows.map((row) => options.layout.info(context, scale, columnWidth - (48 * scale), row));
      const rowsHeight = measuredRows.reduce((sum, row) => sum + row.height, 0) + (Math.max(0, measuredRows.length - 1) * 6 * scale);
      const cardHeight = (78 * scale) + rowsHeight + (14 * scale);
      options.fill(context, x, y, columnWidth, cardHeight, 18 * scale, "#ffffff");
      options.stroke(context, x, y, columnWidth, cardHeight, 18 * scale, "#d7e3f5", 1 * scale);
      context.fillStyle = "#27b6a0";
      context.font = `700 ${8.5 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(label, x + (14 * scale), y + (14 * scale));
      context.fillStyle = "#13213c";
      context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(account.profile.displayName || account.profile.handle || account.profile.did, x + (14 * scale), y + (34 * scale));
      context.fillStyle = "#577194";
      context.font = `${10 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(`@${account.profile.handle || account.profile.did}`, x + (14 * scale), y + (52 * scale));

      let statY = y + (78 * scale);
      measuredRows.forEach((row) => {
        options.fill(context, x + (14 * scale), statY, columnWidth - (28 * scale), row.height, 11 * scale, "#edf4ff");
        options.stroke(context, x + (14 * scale), statY, columnWidth - (28 * scale), row.height, 11 * scale, "#d0ddf6", 1 * scale);
        context.fillStyle = "#3d5f8f";
        context.font = `${8.1 * scale}px "Segoe UI", Aptos, sans-serif`;
        options.text(context, row.lines, x + (24 * scale), statY + (6 * scale), 11 * scale);
        statY += row.height + (6 * scale);
      });
      return cardHeight;
    };

    const leftCardHeight = drawAccountCard(state.accountA, cardX, cursorY, t("analysisAccountALabel"));
    const rightCardHeight = drawAccountCard(state.accountB, cardX + columnWidth + columnGap, cursorY, t("analysisAccountBLabel"));
    cursorY += Math.max(leftCardHeight, rightCardHeight) + (16 * scale);

    const summaryTextWidth = cardWidth - (36 * scale);
    context.font = `${10 * scale}px "Segoe UI", Aptos, sans-serif`;
    const overallLines = options.wrap(
      context,
      t("analysisOverallScoreSummary", { value: options.percent(state.comparison.robustnessMix) }),
      summaryTextWidth,
    ).slice(0, 3);
    const noteLines = options.wrap(context, t(state.comparison.confidenceKey), summaryTextWidth).slice(0, 4);
    const scoreRows = options.models.scores(state.comparison).slice(1);
    const scoreColumnGap = 12 * scale;
    const scoreColumnWidth = ((cardWidth - (36 * scale)) - scoreColumnGap) / 2;
    const scoreRowsPerColumn = Math.ceil(scoreRows.length / 2);
    const leftScoreRows = scoreRows.slice(0, scoreRowsPerColumn);
    const rightScoreRows = scoreRows.slice(scoreRowsPerColumn);
    const measuredLeftScoreRows = leftScoreRows.map((row) => options.layout.score(context, scale, scoreColumnWidth, row));
    const measuredRightScoreRows = rightScoreRows.map((row) => options.layout.score(context, scale, scoreColumnWidth, row));
    const scoreRowCount = Math.max(measuredLeftScoreRows.length, measuredRightScoreRows.length);
    const scoreRowsHeight = Array.from({ length: scoreRowCount }, (_, index) => {
      const leftHeight = measuredLeftScoreRows[index]?.height || 0;
      const rightHeight = measuredRightScoreRows[index]?.height || 0;
      return Math.max(leftHeight, rightHeight, 26 * scale);
    }).reduce((sum, height) => sum + height, 0) + (Math.max(0, scoreRowCount - 1) * 8 * scale);
    const overallCardHeight = (140 * scale)
      + (overallLines.length * 13 * scale)
      + (noteLines.length * 13 * scale)
      + scoreRowsHeight;

    options.fill(context, cardX, cursorY, cardWidth, overallCardHeight, 18 * scale, "#ffffff");
    options.stroke(context, cardX, cursorY, cardWidth, overallCardHeight, 18 * scale, "#d7e3f5", 1 * scale);
    context.fillStyle = "#27b6a0";
    context.font = `700 ${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("analysisOverallScoreLabel"), cardX + (18 * scale), cursorY + (18 * scale));
    context.fillStyle = "#13213c";
    context.font = `700 ${22 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(`${state.comparison.score}/100`, cardX + (18 * scale), cursorY + (34 * scale));
    options.fill(context, cardX + (108 * scale), cursorY + (32 * scale), 220 * scale, 26 * scale, 13 * scale, "#e8fbf7");
    context.fillStyle = "#27b6a0";
    context.font = `700 ${11 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t(state.comparison.labelKey), cardX + (122 * scale), cursorY + (39 * scale));
    context.fillStyle = "#415b81";
    context.font = `${10 * scale}px "Segoe UI", Aptos, sans-serif`;
    options.text(context, overallLines, cardX + (18 * scale), cursorY + (70 * scale), 13 * scale);
    const noteY = cursorY + (76 * scale) + (overallLines.length * 13 * scale);
    options.text(context, noteLines, cardX + (18 * scale), noteY, 13 * scale);

    let detailY = noteY + (noteLines.length * 13 * scale) + (16 * scale);
    for (let index = 0; index < scoreRowCount; index += 1) {
      const leftMeasured = measuredLeftScoreRows[index] || null;
      const rightMeasured = measuredRightScoreRows[index] || null;
      const rowHeight = Math.max(leftMeasured?.height || 0, rightMeasured?.height || 0, 26 * scale);
      if (leftMeasured) {
        drawAnalysisPdfScoreRow(
          context,
          scale,
          cardX + (18 * scale),
          detailY,
          scoreColumnWidth,
          leftScoreRows[index],
          leftMeasured,
        );
      }
      if (rightMeasured) {
        drawAnalysisPdfScoreRow(
          context,
          scale,
          cardX + (18 * scale) + scoreColumnWidth + scoreColumnGap,
          detailY,
          scoreColumnWidth,
          rightScoreRows[index],
          rightMeasured,
        );
      }
      detailY += rowHeight + (8 * scale);
    }
    return canvas;
  }

  /** Draws a measured four-column table. @param {number} pageIndex - Page. @param {number} pageCount - Total. @param {object} config - Title, columns and rows. @returns {Promise<object>} Canvas. */
  async function renderAnalysisPdfTablePage(pageIndex, pageCount, config) {
    const {
      canvas,
      context,
      scale,
      cursorY: initialCursorY,
      cardX,
      cardWidth,
    } = createAnalysisPdfBasePage(pageIndex, pageCount);
    const {
      title,
      rows,
      columns,
      column4Title,
    } = config;
    const cursorY = initialCursorY;

    const tableWidth = cardWidth - (36 * scale);
    const tableColumns = {
      label: tableWidth * columns.label,
      value: tableWidth * columns.value,
      diff: tableWidth * columns.diff,
    };
    const measuredRows = options.layout.rows(context, scale, rows, tableColumns);
    const tableBodyHeight = measuredRows.reduce((sum, row) => sum + row.height, 0);
    const tableCardHeight = (74 * scale) + tableBodyHeight + (18 * scale);
    options.fill(context, cardX, cursorY, cardWidth, tableCardHeight, 18 * scale, "#ffffff");
    options.stroke(context, cardX, cursorY, cardWidth, tableCardHeight, 18 * scale, "#d7e3f5", 1 * scale);
    context.fillStyle = "#13213c";
    context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(title, cardX + (18 * scale), cursorY + (18 * scale));
    const tableY = cursorY + (48 * scale);
    const col1 = cardX + (18 * scale);
    const col2 = col1 + tableColumns.label + (12 * scale);
    const col3 = col2 + tableColumns.value + (12 * scale);
    const col4 = col3 + tableColumns.value + (12 * scale);
    context.fillStyle = "#587192";
    context.font = `700 ${8.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("analysisMetricsColumnMetric"), col1, tableY);
    context.fillText(t("analysisAccountALabel"), col2, tableY);
    context.fillText(t("analysisAccountBLabel"), col3, tableY);
    context.fillText(column4Title, col4, tableY);
    let rowY = tableY + (18 * scale);
    measuredRows.forEach((row, index) => {
      if (index % 2 === 0) {
        options.fill(context, cardX + (12 * scale), rowY - (4 * scale), cardWidth - (24 * scale), row.height, 10 * scale, "#f7faff");
      }
      context.fillStyle = "#17233a";
      context.font = `${8.5 * scale}px "Segoe UI", Aptos, sans-serif`;
      options.text(context, row.labelLines, col1, rowY, 11 * scale);
      options.text(context, row.leftLines, col2, rowY, 11 * scale);
      options.text(context, row.rightLines, col3, rowY, 11 * scale);
      options.text(context, row.diffLines, col4, rowY, 11 * scale);
      rowY += row.height;
    });
    return canvas;
  }

  /** Draws profile and overlap heatmaps. @param {number} pageIndex - Page. @param {number} pageCount - Total. @returns {Promise<object>} Canvas. */
  async function renderAnalysisPdfTemporalPage(pageIndex, pageCount) {
    const {
      canvas,
      context,
      scale,
      cursorY: initialCursorY,
      cardX,
      cardWidth,
      columnGap,
      columnWidth,
    } = createAnalysisPdfBasePage(pageIndex, pageCount);
    let cursorY = initialCursorY;

    /** Draws one temporal account. @param {object} account - Account. @param {number} x - X. @param {number} y - Y. @param {string} title - Heading. @returns {number} Height. */
    const drawTemporalAccountCard = (account, x, y, title) => {
      context.font = `${8 * scale}px "Segoe UI", Aptos, sans-serif`;
      const noteLines = options.wrap(context, t("analysisTemporalUtcHint"), columnWidth - (28 * scale)).slice(0, 2);
      const statRows = options.temporalSummary(account?.temporal || null);
      const measuredRows = statRows.map((item) => options.layout.info(context, scale, columnWidth - (44 * scale), `${item.label}: ${item.value}`, 7.8, 22 * scale));
      const rowsHeight = measuredRows.reduce((sum, row) => sum + row.height, 0) + (Math.max(0, measuredRows.length - 1) * 6 * scale);
      const heatmapHeight = options.layout.heatmap(scale);
      const heatmapTitleY = y + (50 * scale) + (noteLines.length * 10 * scale) + rowsHeight + (12 * scale);
      const heatmapY = heatmapTitleY + (16 * scale);
      const cardHeight = (heatmapY - y) + heatmapHeight + (14 * scale);
      options.fill(context, x, y, columnWidth, cardHeight, 18 * scale, "#ffffff");
      options.stroke(context, x, y, columnWidth, cardHeight, 18 * scale, "#d7e3f5", 1 * scale);
      context.fillStyle = "#13213c";
      context.font = `700 ${12 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(title, x + (14 * scale), y + (14 * scale));
      context.fillStyle = "#587192";
      context.font = `${8 * scale}px "Segoe UI", Aptos, sans-serif`;
      options.text(context, noteLines, x + (14 * scale), y + (32 * scale), 10 * scale);

      let statY = y + (50 * scale) + (noteLines.length * 10 * scale);
      measuredRows.forEach((item) => {
        options.fill(context, x + (14 * scale), statY, columnWidth - (28 * scale), item.height, 11 * scale, "#edf4ff");
        options.stroke(context, x + (14 * scale), statY, columnWidth - (28 * scale), item.height, 11 * scale, "#d0ddf6", 1 * scale);
        context.fillStyle = "#3d5f8f";
        context.font = `${7.8 * scale}px "Segoe UI", Aptos, sans-serif`;
        options.text(context, item.lines, x + (22 * scale), statY + (6 * scale), 11 * scale);
        statY += item.height + (6 * scale);
      });

      context.fillStyle = "#284a78";
      context.font = `700 ${9 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(t("analysisTemporalHeatmapTitle"), x + (14 * scale), heatmapTitleY);
      drawAnalysisPdfHeatmapGrid(context, scale, x + (14 * scale), heatmapY, columnWidth - (28 * scale), account?.temporal?.heatmap || [], "#27b6a0");
      return cardHeight;
    };

    const leftCardHeight = drawTemporalAccountCard(state.accountA, cardX, cursorY, t("analysisTemporalAccountATitle"));
    const rightCardHeight = drawTemporalAccountCard(state.accountB, cardX + columnWidth + columnGap, cursorY, t("analysisTemporalAccountBTitle"));
    cursorY += Math.max(leftCardHeight, rightCardHeight) + (16 * scale);

    context.font = `${8.2 * scale}px "Segoe UI", Aptos, sans-serif`;
    const overlapNoteLines = options.wrap(context, t("analysisTemporalOverlapHeatmapNote"), cardWidth - (36 * scale)).slice(0, 3);
    const overlapHeatmapHeight = options.layout.heatmap(scale);
    const overlapCardHeight = (70 * scale) + (overlapNoteLines.length * 10 * scale) + overlapHeatmapHeight + (14 * scale);
    options.fill(context, cardX, cursorY, cardWidth, overlapCardHeight, 18 * scale, "#ffffff");
    options.stroke(context, cardX, cursorY, cardWidth, overlapCardHeight, 18 * scale, "#d7e3f5", 1 * scale);
    context.fillStyle = "#13213c";
    context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("analysisTemporalOverlapHeatmapTitle", { count: 10 }), cardX + (18 * scale), cursorY + (18 * scale));
    context.fillStyle = "#587192";
    context.font = `${8.2 * scale}px "Segoe UI", Aptos, sans-serif`;
    options.text(context, overlapNoteLines, cardX + (18 * scale), cursorY + (38 * scale), 10 * scale);
    const overlapHeatmap = options.overlap(
      state.accountA?.temporal?.timestamps || [],
      state.accountB?.temporal?.timestamps || [],
      10,
    );
    drawAnalysisPdfHeatmapGrid(context, scale, cardX + (18 * scale), cursorY + (50 * scale) + (overlapNoteLines.length * 10 * scale), cardWidth - (36 * scale), overlapHeatmap, "#3f7cd6");
    return canvas;
  }

  /** Draws paginated pattern pairs. @param {number} pageIndex - Page. @param {number} pageCount - Total. @param {Array} rows - Cards. @param {string} title - Heading. @returns {Promise<object>} Canvas. */
  async function renderAnalysisPdfPatternPage(pageIndex, pageCount, rows, title = t("analysisPdfPatternsTitle")) {
    const {
      canvas,
      context,
      scale,
      cursorY: initialCursorY,
      cardX,
      cardWidth,
      columnGap,
    } = createAnalysisPdfBasePage(pageIndex, pageCount);
    const patternWidth = (cardWidth - columnGap) / 2;
    const rowGap = 14 * scale;
    let cursorY = initialCursorY;

    options.fill(context, cardX, cursorY, cardWidth, 46 * scale, 18 * scale, "#ffffff");
    options.stroke(context, cardX, cursorY, cardWidth, 46 * scale, 18 * scale, "#d7e3f5", 1 * scale);
    context.fillStyle = "#13213c";
    context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(title, cardX + (18 * scale), cursorY + (16 * scale));
    cursorY += 60 * scale;

    for (const row of rows) {
      await drawAnalysisPdfPatternCard(context, scale, cardX, cursorY, patternWidth, row.height, row.left);
      if (row.right) {
        await drawAnalysisPdfPatternCard(context, scale, cardX + patternWidth + columnGap, cursorY, patternWidth, row.height, row.right);
      }
      cursorY += row.height + rowGap;
    }
    return canvas;
  }

  /** Renders all pages, assembles and delivers the PDF. @returns {Promise<void>} Completion or propagated rendering/delivery error. */
  async function exportAnalysisPdfReport() {
    if (!state.accountA || !state.accountB || !state.comparison) {
      throw new Error(t("analysisNeedComparison"));
    }
    const previewPage = createAnalysisPdfBasePage(0, 1);
    const contentHeight = previewPage.contentBottom - previewPage.cursorY;
    const temporalTablePages = options.layout.table(
      previewPage.scale,
      previewPage.cardWidth,
      contentHeight,
      options.tables.temporal(state.accountA, state.accountB, state.comparison),
      { label: 0.34, value: 0.2, diff: 0.23 },
    );
    const networkTablePages = options.layout.table(
      previewPage.scale,
      previewPage.cardWidth,
      contentHeight,
      options.tables.network(state.accountA, state.accountB, state.comparison),
      { label: 0.34, value: 0.2, diff: 0.23 },
    );
    const metricTablePages = options.layout.table(
      previewPage.scale,
      previewPage.cardWidth,
      contentHeight,
      options.models.metrics(state.comparison),
      { label: 0.41, value: 0.16, diff: 0.27 },
    );
    const networkPatternPages = options.layout.patterns(
      previewPage.scale,
      previewPage.cardWidth,
      previewPage.columnGap,
      previewPage.contentBottom - (previewPage.cursorY + (60 * previewPage.scale)),
      options.models.network(state.accountA, state.accountB),
    );
    const patternPageRows = options.layout.patterns(previewPage.scale, previewPage.cardWidth, previewPage.columnGap,
      previewPage.contentBottom - (previewPage.cursorY + (60 * previewPage.scale)), options.models.corpus(state.accountA, state.accountB));
    const totalPages = 2
      + temporalTablePages.pages.length
      + networkTablePages.pages.length
      + networkPatternPages.length
      + metricTablePages.pages.length
      + patternPageRows.length;
    const pageCanvases = await Promise.all([
      renderAnalysisPdfOverviewPage(0, totalPages),
      renderAnalysisPdfTemporalPage(1, totalPages),
      ...temporalTablePages.pages.map((rows, index) => renderAnalysisPdfTablePage(index + 2, totalPages, {
        title: t("analysisTemporalTitle"),
        rows,
        columns: { label: 0.34, value: 0.2, diff: 0.23 },
        column4Title: t("analysisTemporalColumnAssessment"),
      })),
      ...networkTablePages.pages.map((rows, index) => renderAnalysisPdfTablePage(index + 2 + temporalTablePages.pages.length, totalPages, {
        title: t("analysisNetworkTitle"),
        rows,
        columns: { label: 0.34, value: 0.2, diff: 0.23 },
        column4Title: t("analysisTemporalColumnAssessment"),
      })),
      ...networkPatternPages.map((rows, index) => renderAnalysisPdfPatternPage(
        index + 2 + temporalTablePages.pages.length + networkTablePages.pages.length,
        totalPages,
        rows,
        t("analysisNetworkTitle"),
      )),
      ...metricTablePages.pages.map((rows, index) => renderAnalysisPdfTablePage(index + 2 + temporalTablePages.pages.length + networkTablePages.pages.length + networkPatternPages.length, totalPages, {
        title: t("analysisMetricsTitle"),
        rows,
        columns: { label: 0.41, value: 0.16, diff: 0.27 },
        column4Title: t("analysisMetricsColumnDiff"),
      })),
      ...patternPageRows.map((rows, index) => renderAnalysisPdfPatternPage(index + 2 + temporalTablePages.pages.length + networkTablePages.pages.length + networkPatternPages.length + metricTablePages.pages.length, totalPages, rows)),
    ]);
    const pages = [];
    for (const [pageIndex, canvas] of pageCanvases.entries()) {
      const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
      pages.push({
        content: `q 595 0 0 842 0 0 cm /PageImage${pageIndex + 1} Do Q`,
        images: [{
          name: `PageImage${pageIndex + 1}`,
          width: canvas.width,
          height: canvas.height,
          bytes,
        }],
        annotations: [],
      });
    }
    const blob = options.pdf(pages, {
      title: t("analysisPdfTitle"),
    });
    const fileName = options.models.filename(state.accountA, state.accountB);
    const file = options.file(blob, fileName);
    await options.deliver(file, fileName, { preferDownload: true });
    options.status(t("analysisExportDone"));
  }
  return { base: createAnalysisPdfBasePage, avatar: loadAnalysisPdfAvatarBitmap, patternCard: drawAnalysisPdfPatternCard,
    score: drawAnalysisPdfScoreRow, heatmap: drawAnalysisPdfHeatmapGrid, overview: renderAnalysisPdfOverviewPage,
    table: renderAnalysisPdfTablePage, temporal: renderAnalysisPdfTemporalPage, patterns: renderAnalysisPdfPatternPage, export: exportAnalysisPdfReport };
}

