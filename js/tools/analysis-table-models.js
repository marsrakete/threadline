/** Creates translated comparison table models with explicit format/calculation dependencies. @param {object} options - Translation, count, number, percent and vector similarity adapters. @returns {object} Network and temporal row builders. */
export function createAnalysisTableModels(options) {
  const t = options.t;
  /** Formats available overlap counts. @param {object} value - Overlap summary. @returns {string} Count and percentage text. */
  function overlap(value) { return `${options.count(value.sharedCount)} / ${options.count(value.unionCount)} \u00b7 ${options.percent(value.jaccard)}`; }
  /** Formats a similarity assessment. @param {number} value - Similarity. @returns {string} Translated assessment. */
  function assessment(value) { return t("analysisTemporalAssessmentSimilarity", { value: options.percent(value) }); }
  /** Formats moderation availability. @param {object} account - Account. @returns {string} Translated source availability. */
  function moderation(account) {
    if (account.network?.muteBlockSource === "saved_account") { return t("analysisNetworkModerationAvailable"); }
    return t("analysisNetworkModerationUnavailable");
  }
  /** Formats top temporal labels and shares. @param {Array} entries - Label/share list. @returns {string} Joined labels or empty note. */
  function top(entries = []) {
    if (!entries.length) { return t("analysisTemporalNoDataShort"); }
    return entries.map((entry) => `${entry.label} ${options.percent(entry.share)}`).join(" \u00b7 ");
  }
  /** Formats a median gap if available. @param {object|null} account - Account. @returns {string} Translated minutes or dash. */
  function median(account) {
    if (Number.isFinite(account?.temporal?.medianGapMinutes)) { return t("analysisTemporalMedianGapValue", { value: options.number(account.temporal.medianGapMinutes, 0) }); }
    return "-";
  }
  /** Builds network comparison rows including partial and unavailable states. @param {object|null} left - Account A. @param {object|null} right - Account B. @param {object|null} comparison - Comparison. @returns {Array} Thirteen rows or empty list. */
  function network(left, right, comparison) {
    if (!left || !right || !comparison) { return []; }
    const complete = left.network?.loadState === "complete" && right.network?.loadState === "complete";
    const rows = [];
    for (const [key, property] of [["analysisNetworkFollowersOverlap", "followerOverlap"], ["analysisNetworkFollowsOverlap", "followingOverlap"], ["analysisNetworkMutualsOverlap", "mutualOverlap"]]) {
      let a = t("analysisNetworkNotAvailable"); let b = a; let diff = t("analysisNetworkLoadIncomplete");
      if (complete) { a = options.count(comparison[property].leftCount); b = options.count(comparison[property].rightCount); diff = overlap(comparison[property]); }
      rows.push({ label: t(key), left: a, right: b, diff });
    }
    let a = t("analysisNetworkRelationNo"); let b = a;
    if (comparison.directRelationship.leftFollowsRight) { a = t("analysisNetworkRelationYes"); }
    if (comparison.directRelationship.rightFollowsLeft) { b = t("analysisNetworkRelationYes"); }
    rows.push({ label: t("analysisNetworkDirectRelation"), left: a, right: b, diff: assessment(comparison.relationshipSimilarity) });
    for (const [key, property] of [["analysisNetworkMuteOverlap", "muteOverlap"], ["analysisNetworkBlockOverlap", "blockOverlap"]]) {
      let diff = t("analysisNetworkNotAvailable"); if (comparison[property]) { diff = overlap(comparison[property]); }
      rows.push({ label: t(key), left: moderation(left), right: moderation(right), diff });
    }
    for (const [key, marker, similarity] of [["analysisNetworkMentionsSimilarity", "topMentions", "mentionSimilarity"],
      ["analysisNetworkDomainsSimilarity", "topDomains", "domainSimilarity"], ["analysisNetworkHashtagsSimilarity", "topHashtags", "hashtagSimilarity"],
      ["analysisNetworkReplyTargetsSimilarity", "topReplyTargets", "replyTargetSimilarity"], ["analysisNetworkQuoteTargetsSimilarity", "topQuoteTargets", "quoteTargetSimilarity"],
      ["analysisNetworkLanguagesSimilarity", "topLanguages", "languageSimilarity"]]) {
      rows.push({ label: t(key), left: options.percent(left.markers?.[marker]?.[0]?.share || 0), right: options.percent(right.markers?.[marker]?.[0]?.share || 0), diff: assessment(comparison[similarity]) });
    }
    rows.push({ label: t("analysisNetworkMediaSimilarity"), left: options.percent(left.markers?.mediaPostShare || 0), right: options.percent(right.markers?.mediaPostShare || 0), diff: assessment(comparison.mediaSimilarity) });
    return rows;
  }
  /** Builds temporal rows while preserving empty-profile assessments. @param {object|null} left - Account A. @param {object|null} right - Account B. @param {object|null} comparison - Comparison. @returns {Array} Five translated rows. */
  function temporal(left, right, comparison) {
    const a = left?.temporal; const b = right?.temporal;
    const rows = [];
    for (const [key, shares, entries] of [["analysisTemporalHourSimilarity", "hourShares", "topHourEntries"], ["analysisTemporalWeekdaySimilarity", "weekdayShares", "topWeekdayEntries"]]) {
      rows.push({ label: t(key), left: top(a?.[entries] || []), right: top(b?.[entries] || []), diff: assessment(options.similarity(a?.[shares] || [], b?.[shares] || [])) });
    }
    rows.push({ label: t("analysisTemporalGapSimilarity"), left: median(left), right: median(right), diff: assessment(options.similarity(a?.gapShares || [], b?.gapShares || [])) },
      { label: t("analysisTemporalProfileScore"), left: t("analysisTemporalActiveHoursValue", { count: options.count(a?.activeHourCount || 0) }), right: t("analysisTemporalActiveHoursValue", { count: options.count(b?.activeHourCount || 0) }), diff: t("analysisTemporalAssessmentScore", { value: options.percent(comparison?.temporalProfileSimilarity || 0) }) },
      { label: t("analysisTemporalProximityScore"), left: t("analysisTemporalWindowValue", { count: 5 }), right: t("analysisTemporalWindowValue", { count: 5 }), diff: t("analysisTemporalAssessmentMatches", { value: options.percent(comparison?.temporalProximityScore || 0) }) });
    return rows;
  }
  return { network, temporal };
}
