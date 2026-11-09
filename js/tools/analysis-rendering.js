/** Builds translated account summary copy without DOM access. @param {string} slot - A or B. @param {object|null} account - Normalized account. @param {object} options - Translation/count/date adapters. @returns {object} Summary fields. */
export function buildAnalysisSummaryModel(slot, account, options) {
  let emptyKey = "analysisAccountBEmpty";
  let labelKey = "analysisAccountBLabel";
  if (slot === "A") { emptyKey = "analysisAccountAEmpty"; labelKey = "analysisAccountALabel"; }
  if (!account) { return { empty: options.t(emptyKey) }; }
  const name = account.profile.displayName || account.profile.handle || account.profile.did;
  let handle = account.profile.did;
  if (account.profile.handle) { handle = `@${account.profile.handle}`; }
  let range = options.t("analysisSummaryRangeAll");
  if (account.filters.rangeDays > 0) { range = options.t("analysisSummaryRangeDays", { count: account.filters.rangeDays }); }
  let preview = options.t("analysisSummaryNoPreview");
  if (account.posts[0]?.createdAt) { preview = options.t("analysisSummaryLatestPost", { value: options.timestamp(account.posts[0].createdAt) }); }
  return { label: options.t(labelKey), name, handle, avatar: account.profile.avatar, preview,
    stats: [options.t("analysisSummaryPostsLoaded", { count: options.count(account.posts.length) }),
      options.t("analysisSummaryWordsLoaded", { count: options.count(account.corpus.wordCount) }), range,
      options.t("analysisSummaryPagesLoaded", { count: options.count(account.stats.pages) })] };
}

/** Builds translated comparison copy without DOM access. @param {object|null} comparison - Calculated comparison. @param {object} options - Translation/number/percent adapters. @returns {object|null} Result fields. */
export function buildAnalysisResultModel(comparison, options) {
  if (!comparison) { return null; }
  const t = options.t;
  let delta = t("analysisSimilarityBurrowsDeltaUnavailable");
  if (Number.isFinite(comparison.burrowsDelta?.delta)) {
    delta = t("analysisSimilarityBurrowsDelta", { value: options.number(comparison.burrowsDelta.delta, 2), score: options.percent(comparison.burrowsDelta.similarity) });
  }
  const details = [delta];
  for (const [key, property] of [["analysisSimilarityCosine", "cosineSimilarity"], ["analysisSimilarityJaccard", "jaccardSimilarity"],
    ["analysisSimilarityFunctionWords", "functionWordSimilarity"], ["analysisSimilarityCharacterNgrams", "characterNgramSimilarity"],
    ["analysisSimilarityMetrics", "metricsSimilarity"], ["analysisSimilarityTemporalProfile", "temporalProfileSimilarity"],
    ["analysisSimilarityTemporalProximity", "temporalProximityScore"]]) {
    details.push(t(key, { value: options.percent(comparison[property]) }));
  }
  return { eyebrow: t("analysisOverallScoreLabel"), score: `${comparison.score}/100`, label: t(comparison.labelKey),
    summary: t("analysisOverallScoreSummary", { value: options.percent(comparison.robustnessMix) }),
    confidence: t(comparison.confidenceKey), heading: t("analysisSubscoresLabel"), details, note: t("analysisResultNote") };
}

/** Creates template-based lists and summary/result rendering. @param {object} elements - Templates and optional summary/result hosts. @param {object} options - Clone/avatar/translation/format adapters. @returns {object} Rendering operations. */
export function createAnalysisRenderer(elements, options) {
  /** Clones one component root and fails clearly for missing templates. @param {string} name - Template key. @returns {Element} Detached root. */
  function root(name) {
    const fragment = options.cloneTemplate(elements.templates[name]);
    if (!fragment?.firstElementChild) { throw new Error(`Missing analysis template: ${name}`); }
    return fragment.firstElementChild;
  }
  /** Creates a plain-text empty-state note. @param {string} key - Translation key. @returns {Element} Note. */
  function note(key) { const node = root("note"); node.textContent = options.t(key); return node; }
  /** Creates a plain-text span. @param {string} text - Visible text. @returns {Element} Span. */
  function span(text) { const node = root("span"); node.textContent = text; return node; }
  /** Creates token chips. @param {Array} entries - Label/share entries. @param {string} emptyKey - Empty translation. @returns {Element} Token list. */
  function tokens(entries = [], emptyKey = "analysisPatternsEmpty") {
    const node = root("tokens");
    if (!Array.isArray(entries) || !entries.length) { node.append(note(emptyKey)); return node; }
    for (const entry of entries) { const chip = root("token"); chip.textContent = `${entry.label} - ${options.percent(entry.share ?? 0)}`; node.append(chip); }
    return node;
  }
  /** Creates metric/stat rows. @param {Array} items - Label/value/formatter records. @param {string} formatter - Default format. @param {string} emptyKey - Empty translation. @returns {Element} Stat list. */
  function stats(items = [], formatter = "percent", emptyKey = "analysisPatternsEmpty") {
    const node = root("stats");
    if (!Array.isArray(items) || !items.length) { node.append(note(emptyKey)); return node; }
    for (const item of items) {
      const row = root("stat"); let label = item.label;
      if (item.labelKey) { label = options.t(item.labelKey); }
      row.querySelector(".analysis-stat-label").textContent = label;
      const mode = item.formatter || formatter; let value;
      if (mode === "text") { value = String(item.value ?? item.share ?? ""); }
      else if (mode === "number") { value = options.number(item.value, 2); }
      else { value = options.percent(item.share ?? item.value); }
      row.querySelector(".analysis-stat-value").textContent = value; node.append(row);
    }
    return node;
  }
  /** Creates clamped percentage bars. @param {Array} items - Label/share records. @param {string} emptyKey - Empty translation. @returns {Element} Bar list. */
  function bars(items = [], emptyKey = "analysisPatternsEmpty") {
    const node = root("bars");
    if (!Array.isArray(items) || !items.length) { node.append(note(emptyKey)); return node; }
    for (const item of items) {
      const row = root("bar"); let label = item.label;
      if (item.labelKey) { label = options.t(item.labelKey); }
      row.querySelector(".analysis-bar-head span").textContent = label;
      row.querySelector(".analysis-bar-head strong").textContent = options.percent(item.share ?? item.value);
      row.querySelector(".analysis-bar-fill").style.width = `${Math.max(0, Math.min(100, (item.share ?? item.value ?? 0) * 100))}%`;
      node.append(row);
    }
    return node;
  }
  /** Creates a titled pattern card. @param {string} title - Plain text title. @param {Array} children - Optional DOM nodes. @returns {Element} Card. */
  function pattern(title, children = []) {
    const node = root("pattern"); node.querySelector("strong").textContent = title;
    for (const child of children) { if (child) { node.append(child); } }
    return node;
  }
  /** Creates an account card or its empty state. @param {string} slot - A or B. @param {object|null} account - Normalized account. @returns {Element} Card. */
  function accountCard(slot, account) {
    const model = buildAnalysisSummaryModel(slot, account, options); const card = root("account");
    if (model.empty !== undefined) { const empty = root("note"); empty.textContent = model.empty; card.replaceChildren(empty); return card; }
    options.setAvatar(card.querySelector("img"), model.avatar, model.name);
    card.querySelector(".eyebrow").textContent = model.label; card.querySelector("strong").textContent = model.name;
    card.querySelector(".reply-target-handle").textContent = model.handle;
    card.querySelector(".analysis-account-stats").append(...model.stats.map(span));
    card.querySelector(".analysis-account-preview").textContent = model.preview; return card;
  }
  /** Replaces both account summaries. @param {object|null} left - Account A. @param {object|null} right - Account B. @returns {void} */
  function summary(left, right) { if (elements.summary) { elements.summary.replaceChildren(accountCard("A", left), accountCard("B", right)); } }
  /** Renders or clears a comparison result. @param {object|null} comparison - Calculated result. @returns {void} */
  function result(comparison) {
    if (!elements.result) { return; }
    elements.result.hidden = !comparison; elements.result.replaceChildren();
    const model = buildAnalysisResultModel(comparison, options); if (!model) { return; }
    const content = root("result");
    for (const [selector, key] of [[".eyebrow", "eyebrow"], [".analysis-result-score", "score"], [".analysis-result-label", "label"],
      [".analysis-result-summary", "summary"], [".analysis-result-confidence", "confidence"], [".analysis-result-section-title", "heading"], [".settings-note", "note"]]) {
      content.querySelector(selector).textContent = model[key];
    }
    content.querySelector(".analysis-result-details").append(...model.details.map(span));
    elements.result.append(...content.childNodes);
  }
  /** Builds a translated temporal summary. @param {object|null} profile - Calculated profile. @returns {Array} Text-stat rows. */
  function temporalSummary(profile = null) { return buildAnalysisTemporalSummaryModel(profile, options); }
  /** Renders a heatmap with common axis and cell templates. @param {Array|null} values - Counts by hour/weekday. @param {string} title - Translated heading. @param {boolean} overlap - Highlight overlap. @returns {Element} Chart. */
  function heatmapGrid(values, title, overlap = false) {
    const chart = root("heatmap");
    if (!Array.isArray(values)) { return chart; }
    chart.querySelector("strong").textContent = title;
    if (overlap) { chart.append(note("analysisTemporalOverlapHeatmapNote")); }
    const grid = root("heatmap-grid"); const corner = root("axis"); corner.classList.add("analysis-temporal-axis-corner"); grid.append(corner);
    for (let day = 0; day < 7; day += 1) { const label = root("axis"); label.textContent = options.weekday(day); grid.append(label); }
    const max = Math.max(1, ...values.flat());
    values.forEach((row, index) => {
      const label = root("axis"); label.textContent = `${String(index * 2).padStart(2, "0")}-${String(index * 2 + 1).padStart(2, "0")}`; grid.append(label);
      row.forEach((value) => {
        const cell = root("heatmap-cell");
        if (overlap) { cell.classList.add("analysis-temporal-heatmap-cell-overlap"); }
        cell.style.setProperty("--heat", Math.max(0.08, value / max).toFixed(3));
        cell.title = `${value} ${options.t("analysisTemporalHeatmapPosts")}`; grid.append(cell);
      });
    });
    chart.append(grid); return chart;
  }
  /** Renders a profile heatmap. @param {object|null} profile - Calculated profile. @returns {Element} Chart or empty shell. */
  function heatmap(profile = null) {
    if (!profile?.heatmap) { const chart = root("heatmap"); chart.replaceChildren(); return chart; }
    return heatmapGrid(profile.heatmap, options.t("analysisTemporalHeatmapTitle"));
  }
  /** Renders temporal overlap using the existing comparison calculator. @param {object|null} left - Left profile. @param {object|null} right - Right profile. @param {number} window - Tolerance in minutes. @returns {Element} Chart or empty shell. */
  function overlapHeatmap(left = null, right = null, window = 10) {
    const values = options.overlapHeatmap(left?.timestamps || [], right?.timestamps || [], window);
    if (!values.some((row) => row.some((value) => value > 0))) { const chart = root("heatmap"); chart.replaceChildren(); return chart; }
    return heatmapGrid(values, options.t("analysisTemporalOverlapHeatmapTitle", { count: window }), true);
  }
  /** Renders recent daily post positions on the UTC timeline. @param {object|null} profile - Calculated profile. @returns {Element} Timeline or empty shell. */
  function timeline(profile = null) {
    const chart = root("timeline");
    if (!profile?.recentDays?.length) { chart.replaceChildren(); return chart; }
    chart.querySelector("strong").textContent = options.t("analysisTemporalTimelineTitle");
    const axis = chart.querySelector(".analysis-temporal-timeline-axis-track");
    for (const hour of [0, 6, 12, 18, 24]) {
      const tick = root("timeline-tick"); tick.style.left = `${Math.max(0, Math.min(100, hour / 24 * 100))}%`;
      tick.textContent = `${String(hour).padStart(2, "0")}:00`; axis.append(tick);
    }
    const rows = chart.querySelector(".analysis-temporal-timeline-rows");
    for (const day of profile.recentDays) {
      const row = root("timeline-row"); row.querySelector("span").textContent = `${day.weekdayLabel} ${day.label}`;
      const track = row.querySelector(".analysis-temporal-timeline-track");
      for (const hour of day.hours) {
        const point = root("timeline-point"); point.style.left = `${Math.max(0, Math.min(100, hour / 24 * 100))}%`;
        point.title = options.hour(Math.floor(hour)); track.append(point);
      }
      rows.append(row);
    }
    return chart;
  }
  /** Creates resolved network profile chips. @param {Array} entries - Profile/share records. @param {string} emptyKey - Empty translation. @returns {Element} Profile list. */
  function profiles(entries = [], emptyKey = "analysisPatternsNoData") {
    const list = root("profiles");
    if (!Array.isArray(entries) || !entries.length) { list.append(note(emptyKey)); return list; }
    for (const entry of entries) {
      const card = root("profile"); const model = buildAnalysisProfileModel(entry, options);
      options.setAvatar(card.querySelector("img"), model.avatar, model.alt);
      card.querySelector("strong").textContent = model.title; card.querySelector(".reply-target-handle").textContent = model.handle;
      const status = card.querySelector(".analysis-profile-chip-status");
      if (model.deleted) { status.textContent = options.t("analysisNetworkDeletedAccount"); } else { status.remove(); }
      card.querySelector(".analysis-profile-chip-share").textContent = model.share; list.append(card);
    }
    return list;
  }
  /** Renders a reusable four-column comparison table. @param {Array} headers - Plain text headings. @param {Array} rows - Label/left/right/diff records. @returns {Element} Table. */
  function table(headers, rows) {
    const node = root("table"); const head = root("table-head");
    head.querySelectorAll("th").forEach((cell, index) => { cell.textContent = headers[index]; }); node.querySelector("thead").append(head);
    for (const row of rows) {
      const tr = root("table-row"); const values = [row.label, row.left, row.right, row.diff];
      tr.querySelectorAll("td").forEach((cell, index) => { cell.textContent = values[index]; }); node.querySelector("tbody").append(tr);
    }
    return node;
  }
  /** Renders metric comparisons or their empty state. @param {object|null} comparison - Calculated comparison. @returns {void} */
  function metrics(comparison) {
    if (!elements.metrics) { return; } elements.metrics.replaceChildren();
    if (!comparison) { elements.metrics.append(note("analysisMetricsEmpty")); return; }
    elements.metrics.append(table([options.t("analysisMetricsColumnMetric"), options.t("analysisAccountALabel"), options.t("analysisAccountBLabel"), options.t("analysisMetricsColumnDiff")], buildAnalysisMetricTableModel(comparison.metricRows, options)));
  }
  /** Renders one account's temporal summary and charts. @param {string} slot - A or B. @param {object|null} account - Account. @returns {Element} Card. */
  function temporalAccount(slot, account) {
    let titleKey = "analysisTemporalAccountBTitle"; let emptyKey = "analysisAccountBEmpty";
    if (slot === "A") { titleKey = "analysisTemporalAccountATitle"; emptyKey = "analysisAccountAEmpty"; }
    if (!account?.temporal) { const card = root("pattern"); card.replaceChildren(note(emptyKey)); return card; }
    return pattern(options.t(titleKey), [note("analysisTemporalUtcHint"), stats(temporalSummary(account.temporal), "text", "analysisPatternsNoData"), heatmap(account.temporal), timeline(account.temporal)]);
  }
  /** Renders temporal accounts and optional overlap/table comparison. @param {object|null} left - Account A. @param {object|null} right - Account B. @param {object|null} comparison - Comparison state. @param {Array} rows - Translated comparison table rows. @returns {void} */
  function temporal(left, right, comparison, rows = []) {
    if (!elements.temporal) { return; } elements.temporal.replaceChildren();
    if (!left && !right) { elements.temporal.append(note("analysisTemporalEmpty")); return; }
    elements.temporal.append(temporalAccount("A", left), temporalAccount("B", right));
    if (comparison) {
      const card = root("temporal-comparison"); card.querySelector("strong").textContent = options.t("analysisTemporalComparisonTitle");
      card.append(note("analysisTemporalNote"), overlapHeatmap(left?.temporal, right?.temporal, 10),
        table([options.t("analysisMetricsColumnMetric"), options.t("analysisAccountALabel"), options.t("analysisAccountBLabel"), options.t("analysisTemporalColumnAssessment")], rows));
      elements.temporal.append(card);
    }
  }
  /** Renders all ordered corpus patterns, including a missing account's cards. @param {object|null} left - Account A. @param {object|null} right - Account B. @returns {void} */
  function patterns(left, right) {
    if (!elements.patterns) { return; } elements.patterns.replaceChildren();
    if (!left && !right) { elements.patterns.append(note("analysisPatternsEmpty")); return; }
    for (const definition of options.corpusPatterns) {
      for (const [account, labelKey, emptyKey] of [[left, "analysisAccountALabel", "analysisAccountAEmpty"], [right, "analysisAccountBLabel", "analysisAccountBEmpty"]]) {
        const children = [];
        if (!account) { children.push(note(emptyKey)); }
        else {
          for (const key of definition.keys) {
            const values = account.corpus[key]; const missing = definition.emptyKey || "analysisPatternsNoData";
            if (definition.mode === "bars") { children.push(bars(values, missing)); }
            else if (definition.mode === "stats") { children.push(stats(values, definition.formatter, missing)); }
            else { children.push(tokens(values, missing)); }
          }
        }
        elements.patterns.append(pattern(`${options.t(labelKey)} - ${options.t(definition.titleKey)}`, children));
      }
    }
  }
  /** Renders network summary, comparison table and all marker cards. @param {object|null} left - Account A. @param {object|null} right - Account B. @param {object|null} comparison - Comparison. @param {Array} rows - Translated table rows. @param {string} status - Current translated status. @returns {void} */
  function network(left, right, comparison, rows = [], status = "") {
    if (!elements.network) { return; } elements.network.replaceChildren();
    if (!left && !right) { elements.network.append(note("analysisNetworkEmpty")); return; }
    if (!comparison) {
      let key = "analysisNetworkEmpty";
      if (status === options.t("analysisNetworkReloadNeeded")) { key = "analysisNetworkReloadNeeded"; }
      elements.network.append(note(key)); return;
    }
    const card = root("network-summary"); card.querySelector("strong").textContent = options.t("analysisNetworkSummaryTitle");
    card.querySelector(".settings-note").textContent = options.t("analysisNetworkSummaryNote");
    let moderation = options.t("analysisSimilarityModerationUnavailable");
    if (comparison.moderationSimilarity !== null) { moderation = options.t("analysisSimilarityModeration", { value: options.percent(comparison.moderationSimilarity) }); }
    card.querySelector(".analysis-result-details").append(...[
      options.t("analysisSimilarityRelationship", { value: options.percent(comparison.relationshipSimilarity) }),
      options.t("analysisSimilarityInteraction", { value: options.percent(comparison.interactionSimilarity) }), moderation].map(span));
    const warnings = [...(left?.network?.warnings || []), ...(right?.network?.warnings || [])];
    if (warnings.length) { const warning = note("analysisNetworkLoadIncomplete"); warning.textContent += ` ${warnings[0]}`; card.append(warning); }
    elements.network.append(card, table([options.t("analysisMetricsColumnMetric"), options.t("analysisAccountALabel"), options.t("analysisAccountBLabel"), options.t("analysisTemporalColumnAssessment")], rows));
    for (const definition of options.networkPatterns) {
      for (const [account, label] of [[left, "analysisAccountALabel"], [right, "analysisAccountBLabel"]]) {
        let child;
        if (definition.resolvedProfiles) { child = profiles(account?.markers?.[definition.key] || [], "analysisPatternsNoData"); }
        else if (definition.kind === "media") { child = stats([{ label: options.t("analysisNetworkMediaSimilarity"), value: account?.markers?.mediaPostShare || 0, formatter: "percent" }], "percent", "analysisPatternsNoData"); }
        else { child = tokens(account?.markers?.[definition.key] || [], "analysisPatternsNoData"); }
        elements.network.append(pattern(`${options.t(label)} - ${options.t(definition.titleKey)}`, [child]));
      }
    }
  }
  return { tokens, stats, bars, pattern, accountCard, summary, result, temporalSummary, heatmap, overlapHeatmap, timeline, profiles, table, metrics, temporalAccount, temporal, patterns, network };
}

/** Builds four translated temporal summary rows. @param {object|null} profile - Calculated profile. @param {object} options - Translation/count/number adapters. @returns {Array} Text rows. */
export function buildAnalysisTemporalSummaryModel(profile, options) {
  if (!profile) { return []; }
  let hours = options.t("analysisTemporalNoDataShort"); let weekdays = hours; let median = hours;
  if (profile.topHours.length) { hours = profile.topHours.join(", "); }
  if (profile.topWeekdays.length) { weekdays = profile.topWeekdays.join(", "); }
  if (Number.isFinite(profile.medianGapMinutes)) { median = options.t("analysisTemporalMedianGapValue", { value: options.number(profile.medianGapMinutes, 0) }); }
  return [{ label: options.t("analysisTemporalTopHours"), value: hours }, { label: options.t("analysisTemporalTopWeekdays"), value: weekdays },
    { label: options.t("analysisTemporalMedianGap"), value: median }, { label: options.t("analysisTemporalActiveHours"), value: options.t("analysisTemporalActiveHoursValue", { count: options.count(profile.activeHourCount) }) }];
}

/** Projects a resolved profile chip without HTML interpolation. @param {object|null} entry - Profile/share record. @param {object} options - Percent adapter. @returns {object} Plain text/attribute fields. */
export function buildAnalysisProfileModel(entry, options) {
  const title = String(entry?.displayName || entry?.handle || entry?.did || entry?.label || "").trim();
  const rawHandle = String(entry?.handle || "").trim();
  let handle = String(entry?.did || "").trim() || String(entry?.label || "").trim();
  if (rawHandle) { handle = `@${rawHandle}`; }
  return { title, handle, avatar: String(entry?.avatar || "").trim(), alt: String(entry?.displayName || entry?.handle || entry?.did || entry?.label || "profile").trim(),
    deleted: entry?.deleted === true, share: options.percent(entry?.share ?? 0) };
}

/** Formats metric rows for a four-column comparison table. @param {Array} rows - Numeric metric rows. @param {object} options - Translation/number/percent adapters. @returns {Array} Plain text table rows. */
export function buildAnalysisMetricTableModel(rows, options) {
  if (!Array.isArray(rows)) { return []; }
  return rows.map((row) => {
    let left = options.number(row.leftValue, 2); let right = options.number(row.rightValue, 2);
    if (row.formatter === "percent") { left = options.percent(row.leftValue); right = options.percent(row.rightValue); }
    return { label: options.t(row.labelKey), left, right, diff: options.percent(Math.min(1, row.normalizedDifference)) };
  });
}
