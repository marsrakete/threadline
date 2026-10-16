/** Stable analysis lexicons and temporal gap configuration, unchanged from the entry point. */
export const ANALYSIS_TEMPORAL_GAP_BUCKETS = [
  { key: "underTenMinutes", maxMinutes: 10, labelKey: "analysisTemporalGapUnderTenMinutes" },
  { key: "underOneHour", maxMinutes: 60, labelKey: "analysisTemporalGapUnderOneHour" },
  { key: "underSixHours", maxMinutes: 360, labelKey: "analysisTemporalGapUnderSixHours" },
  { key: "underOneDay", maxMinutes: 1440, labelKey: "analysisTemporalGapUnderOneDay" },
  { key: "overOneDay", maxMinutes: Number.POSITIVE_INFINITY, labelKey: "analysisTemporalGapOverOneDay" },
];
export const ANALYSIS_FUNCTION_WORDS = [
  "ich", "du", "wir", "ihr", "er", "sie", "es", "man", "aber", "oder", "und", "denn", "doch", "halt", "eben",
  "auch", "schon", "noch", "nur", "mal", "nicht", "kein", "eine", "einer", "einem", "einen", "der", "die", "das",
  "dass", "weil", "wenn", "als", "wie", "so", "hier", "da", "dann", "eigentlich", "irgendwie",
  "i", "you", "we", "they", "he", "she", "it", "and", "or", "but", "the", "a", "an", "to", "for", "with", "that",
  "this", "these", "those", "because", "if", "then", "just", "really", "maybe", "still",
  "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "et", "ou", "mais", "donc", "car", "pour", "avec",
  "que", "qui", "dans", "sur", "pas", "plus", "encore", "comme", "alors",
];
export const ANALYSIS_NUMBER_WORDS = new Set([
  "null", "eins", "ein", "eine", "zwei", "drei", "vier", "fuenf", "funf", "sechs", "sieben", "acht", "neun", "zehn",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "zero", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
]);
export const ANALYSIS_WEEKDAY_ANCHORS = ["2026-06-29T00:00:00Z", "2026-06-30T00:00:00Z", "2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z", "2026-07-03T00:00:00Z", "2026-07-04T00:00:00Z", "2026-07-05T00:00:00Z"];
export const ANALYSIS_WEEKDAY_FALLBACKS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Language-independent scientific label retained by PDF metric reports. */
export const ANALYSIS_DELTA_REPORT_LABEL = "Burrows's Delta";
/** Ordered network pattern metadata shared by UI and report models. */
export const ANALYSIS_NETWORK_PATTERNS = [
  { titleKey: "analysisNetworkMentionsTitle", key: "topMentions", resolvedProfiles: true },
  { titleKey: "analysisNetworkDomainsTitle", key: "topDomains" },
  { titleKey: "analysisNetworkHashtagsTitle", key: "topHashtags" },
  { titleKey: "analysisNetworkReplyTargetsTitle", key: "topReplyTargets", resolvedProfiles: true },
  { titleKey: "analysisNetworkQuoteTargetsTitle", key: "topQuoteTargets", resolvedProfiles: true },
  { titleKey: "analysisNetworkLanguagesTitle", key: "topLanguages" },
  { titleKey: "analysisNetworkMediaSimilarity", kind: "media" },
];
/** Ordered corpus sections with their list render modes and missing-data translations. */
export const ANALYSIS_CORPUS_PATTERNS = [
  { titleKey: "analysisPatternWordsTitle", keys: ["topWords"], mode: "tokens" },
  { titleKey: "analysisPatternTrigramsTitle", keys: ["topTrigrams"], mode: "tokens" },
  { titleKey: "analysisPatternBigramsTitle", keys: ["topBigrams"], mode: "tokens" },
  { titleKey: "analysisPatternPhrasesTitle", keys: ["topPhrases"], mode: "tokens" },
  { titleKey: "analysisPatternFunctionWordsTitle", keys: ["functionWords"], mode: "tokens" },
  { titleKey: "analysisPatternEmojiTitle", keys: ["topEmojis"], mode: "tokens", emptyKey: "analysisPatternsNoEmoji" },
  { titleKey: "analysisPatternPunctuationTitle", keys: ["punctuationProfile"], mode: "tokens" },
  { titleKey: "analysisPatternStartsEndsTitle", keys: ["postStarts", "postEnds"], mode: "tokens" },
  { titleKey: "analysisPatternWordLengthTitle", keys: ["wordLengthProfile"], mode: "bars" },
  { titleKey: "analysisPatternConventionsTitle", keys: ["writingConventions"], mode: "stats", formatter: "percent" },
  { titleKey: "analysisPatternBehaviorTitle", keys: ["linkBehavior"], mode: "stats", formatter: "percent" },
  { titleKey: "analysisPatternStructureTitle", keys: ["structureProfile"], mode: "stats", formatter: "mixed" },
];
/** Metric keys, translation keys and normalization scales used by account comparison. */
export const ANALYSIS_METRIC_DEFINITIONS = [
  { key: "avgWordLength", labelKey: "analysisMetricAvgWordLength", scale: 4, formatter: "number" },
  { key: "avgSentenceLength", labelKey: "analysisMetricAvgSentenceLength", scale: 18, formatter: "number" },
  { key: "uniqueWordShare", labelKey: "analysisMetricUniqueWordShare", scale: 0.35, formatter: "percent" },
  { key: "uppercaseRate", labelKey: "analysisMetricUppercaseRate", scale: 0.3, formatter: "percent" },
  { key: "emojiRate", labelKey: "analysisMetricEmojiRate", scale: 0.2, formatter: "percent" },
  { key: "exclamationRate", labelKey: "analysisMetricExclamationRate", scale: 0.25, formatter: "percent" },
  { key: "questionRate", labelKey: "analysisMetricQuestionRate", scale: 0.2, formatter: "percent" },
  { key: "commaRate", labelKey: "analysisMetricCommaRate", scale: 0.35, formatter: "percent" },
  { key: "shortWordShare", labelKey: "analysisMetricShortWordShare", scale: 0.35, formatter: "percent" },
  { key: "longWordShare", labelKey: "analysisMetricLongWordShare", scale: 0.25, formatter: "percent" },
];

