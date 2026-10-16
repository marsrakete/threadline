/** Creates report text models with explicit formatting and metadata. @param {object} options - Translation, formatting, clock, metric model and pattern definitions. @returns {object} Report model operations. */
export function createAnalysisReportModels(options) {
  const t = options.t;
  /** Builds a stable PDF filename. @param {object|null} left - A account. @param {object|null} right - B account. @returns {string} Filename. */
  function filename(left, right) {
    const a = String(left?.profile?.handle || "account-a").replace(/[^\w.-]+/g, "-");
    const b = String(right?.profile?.handle || "account-b").replace(/[^\w.-]+/g, "-");
    return `threadline-analysis-${a}-vs-${b}-${options.now().toISOString().slice(0, 10)}.pdf`;
  }
  /** Formats up to eight token/share entries. @param {Array} entries - Tokens. @param {string} emptyKey - Empty translation. @returns {string[]} Lines. */
  function list(entries = [], emptyKey = "analysisPatternsNoData") {
    if (!Array.isArray(entries) || !entries.length) { return [t(emptyKey)]; }
    return entries.slice(0, 8).map((entry) => `${entry.label}: ${options.percent(entry.share)}`);
  }
  /** Formats report statistics with legacy numeric/percentage rules. @param {Array} items - Statistics. @param {string} formatter - Default format. @param {string} emptyKey - Empty translation. @returns {string[]} Lines. */
  function stats(items = [], formatter = "percent", emptyKey = "analysisPatternsNoData") {
    if (!Array.isArray(items) || !items.length) { return [t(emptyKey)]; }
    return items.map((item) => {
      let label = item.label; if (item.labelKey) { label = t(item.labelKey); }
      let value = options.percent(item.share ?? item.value);
      if ((item.formatter || formatter) === "number") { value = options.number(item.value, 2); }
      return `${label}: ${value}`;
    });
  }
  /** Builds metric table rows and the Delta sample row. @param {object|null} comparison - Result. @returns {Array} Report rows. */
  function metrics(comparison) {
    if (!comparison) { return []; }
    let delta = "-"; let similarity = "-"; let chunks = "-";
    if (Number.isFinite(comparison.burrowsDelta?.delta)) { delta = options.number(comparison.burrowsDelta.delta, 2); }
    if (Number.isFinite(comparison.burrowsDelta?.similarity)) { similarity = options.percent(comparison.burrowsDelta.similarity); }
    if (Number.isFinite(comparison.burrowsDelta?.chunkCount)) { chunks = t("analysisPdfChunkCount", { count: comparison.burrowsDelta.chunkCount }); }
    return [...options.metricRows(comparison.metricRows, options), { label: options.deltaLabel, left: delta, right: similarity, diff: chunks }];
  }
  /** Builds ordered overview score rows. @param {object|null} comparison - Result. @returns {Array} Score text rows. */
  function scores(comparison) {
    if (!comparison) { return []; }
    let delta = t("analysisSimilarityBurrowsDeltaUnavailable");
    if (Number.isFinite(comparison.burrowsDelta?.delta)) { delta = t("analysisSimilarityBurrowsDelta", { value: options.number(comparison.burrowsDelta.delta, 2), score: options.percent(comparison.burrowsDelta.similarity) }); }
    const rows = [{ label: t("analysisOverallScoreLabel"), value: `${comparison.score}/100`, accent: true },
      { label: t("analysisSimilarityRobustnessMix", { value: options.percent(comparison.robustnessMix) }) }, { label: delta }];
    for (const [key, property] of [["analysisSimilarityCosine", "cosineSimilarity"], ["analysisSimilarityJaccard", "jaccardSimilarity"],
      ["analysisSimilarityFunctionWords", "functionWordSimilarity"], ["analysisSimilarityCharacterNgrams", "characterNgramSimilarity"],
      ["analysisSimilarityMetrics", "metricsSimilarity"], ["analysisSimilarityTemporalProfile", "temporalProfileSimilarity"],
      ["analysisSimilarityTemporalProximity", "temporalProximityScore"], ["analysisSimilarityRelationship", "relationshipSimilarity"], ["analysisSimilarityInteraction", "interactionSimilarity"]]) {
      rows.push({ label: t(key, { value: options.percent(comparison[property]) }) });
    }
    let moderation = t("analysisSimilarityModerationUnavailable");
    if (comparison.moderationSimilarity !== null) { moderation = t("analysisSimilarityModeration", { value: options.percent(comparison.moderationSimilarity) }); }
    rows.push({ label: moderation }); return rows;
  }
  /** Builds one report corpus card preserving absent-account spread behavior. @param {object} definition - Pattern. @param {object|null} account - Account. @param {string} labelKey - A/B label. @param {string} emptyKey - A/B empty state. @returns {object} Card model. */
  function corpusCard(definition, account, labelKey, emptyKey) {
    const title = `${t(labelKey)} - ${t(definition.titleKey)}`;
    if (definition.mode === "bars") {
      let lines = []; if (!account) { lines = [t(emptyKey)]; }
      let bars = []; if (Array.isArray(account?.corpus?.wordLengthProfile)) { bars = account.corpus.wordLengthProfile.slice(0, 8); }
      return { title, lines, barEntries: bars };
    }
    if (!account) { return { title, lines: [] }; }
    const lines = [];
    definition.keys.forEach((key, index) => {
      if (definition.keys.length === 2) { let label = "analysisPdfPostStartsLabel"; if (index === 1) { label = "analysisPdfPostEndsLabel"; } lines.push(t(label)); }
      if (definition.mode === "stats") { lines.push(...stats(account.corpus[key], definition.formatter, definition.emptyKey || "analysisPatternsNoData")); }
      else { lines.push(...list(account.corpus[key], definition.emptyKey || "analysisPatternsNoData")); }
    });
    return { title, lines };
  }
  /** Builds paired corpus cards in shared definition order. @param {object|null} left - A account. @param {object|null} right - B account. @returns {Array} Card pairs. */
  function corpus(left, right) {
    return options.corpusPatterns.map((definition) => ({ left: corpusCard(definition, left, "analysisAccountALabel", "analysisAccountAEmpty"), right: corpusCard(definition, right, "analysisAccountBLabel", "analysisAccountBEmpty") }));
  }
  /** Builds one report network card. @param {object} definition - Pattern. @param {object|null} account - Account. @param {string} labelKey - Slot label. @returns {object} Card. */
  function networkCard(definition, account, labelKey) {
    const card = { title: `${t(labelKey)} - ${t(definition.titleKey)}`, lines: [] };
    if (!account) { return card; }
    if (definition.resolvedProfiles) { card.profileEntries = []; if (Array.isArray(account.markers?.[definition.key])) { card.profileEntries = account.markers[definition.key].slice(0, 6); } }
    else if (definition.kind === "media") { card.lines = stats([{ label: t("analysisNetworkMediaSimilarity"), value: account.markers?.mediaPostShare || 0, formatter: "percent" }]); }
    else { card.lines = list(account.markers?.[definition.key] || []); }
    return card;
  }
  /** Builds paired network cards with bounded profile samples. @param {object|null} left - A account. @param {object|null} right - B account. @returns {Array} Card pairs. */
  function network(left, right) { return options.networkPatterns.map((definition) => ({ left: networkCard(definition, left, "analysisAccountALabel"), right: networkCard(definition, right, "analysisAccountBLabel") })); }
  return { filename, list, stats, metrics, scores, corpus, network };
}
