/** Projects an available moderation list to a set. @param {Array|null} entries - DID records. @returns {Set|null} Available set, including an empty set, or null. */
function moderationSet(entries) {
  if (!entries) { return null; }
  return new Set(entries.map((entry) => entry.did).filter(Boolean));
}

/** Creates complete account comparison with explicit calculation adapters. @param {object} options - Metrics, similarities, stylometry and temporal proximity. @returns {object} Comparison operation. */
export function createAnalysisAccountComparator(options) {
  /** Calculates scores, confidence, overlaps and direct relationships. @param {object|null} leftAccount - Normalized account A. @param {object|null} rightAccount - Normalized account B. @returns {object|null} Comparison or null for missing accounts. */
  function compare(leftAccount, rightAccount) {
    if (!leftAccount || !rightAccount) {
      return null;
    }
    const metricRows = options.metrics.map((definition) => {
      const leftValue = Number(leftAccount.corpus.metrics[definition.key] || 0);
      const rightValue = Number(rightAccount.corpus.metrics[definition.key] || 0);
      const normalizedDifference = Math.abs(leftValue - rightValue) / Math.max(definition.scale, 0.0001);
      return {
        ...definition,
        leftValue,
        rightValue,
        normalizedDifference,
      };
    });
    const numericDistance = Math.sqrt(
      metricRows.reduce((sum, row) => sum + (row.normalizedDifference ** 2), 0) / Math.max(metricRows.length, 1),
    );
    const metricsSimilarity = 1 / (1 + numericDistance * 1.35);
    const cosineSimilarity = options.mapSimilarity(
      leftAccount.corpus.frequency.words,
      rightAccount.corpus.frequency.words,
    );
    const functionWordSimilarity = options.mapSimilarity(
      leftAccount.corpus.frequency.functionWords || new Map(),
      rightAccount.corpus.frequency.functionWords || new Map(),
    );
    const characterNgramSimilarity = options.mapSimilarity(
      leftAccount.corpus.frequency.trigrams,
      rightAccount.corpus.frequency.trigrams,
    );
    const jaccardSimilarity = options.jaccard(
      new Set(leftAccount.corpus.words.filter((word) => word.length >= 3)),
      new Set(rightAccount.corpus.words.filter((word) => word.length >= 3)),
    );
    const burrowsDelta = options.stylometry(leftAccount, rightAccount);
    const temporalProfileSimilarity = (
      (options.arraySimilarity(leftAccount.temporal.hourShares, rightAccount.temporal.hourShares) * 0.5)
      + (options.arraySimilarity(leftAccount.temporal.weekdayShares, rightAccount.temporal.weekdayShares) * 0.3)
      + (options.arraySimilarity(leftAccount.temporal.gapShares, rightAccount.temporal.gapShares) * 0.2)
    );
    const temporalProximityScore = options.proximity(
      leftAccount.temporal.timestamps,
      rightAccount.temporal.timestamps,
      5,
    );
    const followerOverlap = options.overlap(leftAccount.network?.followerDids, rightAccount.network?.followerDids);
    const followingOverlap = options.overlap(leftAccount.network?.followDids, rightAccount.network?.followDids);
    const mutualOverlap = options.overlap(
      new Set(leftAccount.network?.mutualDids || []),
      new Set(rightAccount.network?.mutualDids || []),
    );
    const mentionSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topMentions),
      options.frequencies(rightAccount.markers?.topMentions),
    );
    const hashtagSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topHashtags),
      options.frequencies(rightAccount.markers?.topHashtags),
    );
    const domainSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topDomains),
      options.frequencies(rightAccount.markers?.topDomains),
    );
    const replyTargetSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topReplyTargets),
      options.frequencies(rightAccount.markers?.topReplyTargets),
    );
    const quoteTargetSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topQuoteTargets),
      options.frequencies(rightAccount.markers?.topQuoteTargets),
    );
    const languageSimilarity = options.mapSimilarity(
      options.frequencies(leftAccount.markers?.topLanguages),
      options.frequencies(rightAccount.markers?.topLanguages),
    );
    const mediaSimilarity = 1 - Math.min(1, Math.abs((leftAccount.markers?.mediaPostShare || 0) - (rightAccount.markers?.mediaPostShare || 0)));
    const interactionSimilarity = (
      (mentionSimilarity * 0.18)
      + (hashtagSimilarity * 0.18)
      + (domainSimilarity * 0.18)
      + (replyTargetSimilarity * 0.16)
      + (quoteTargetSimilarity * 0.16)
      + (languageSimilarity * 0.08)
      + (mediaSimilarity * 0.06)
    );
    const relationshipSimilarity = (
      (followerOverlap.jaccard * 0.35)
      + (followingOverlap.jaccard * 0.35)
      + (mutualOverlap.jaccard * 0.30)
    );
    const leftBlocksSet = moderationSet(leftAccount.network?.blocks);
    const rightBlocksSet = moderationSet(rightAccount.network?.blocks);
    const leftMutesSet = moderationSet(leftAccount.network?.mutes);
    const rightMutesSet = moderationSet(rightAccount.network?.mutes);
    let blockOverlap = null;
    let muteOverlap = null;
    if (leftBlocksSet && rightBlocksSet) { blockOverlap = options.overlap(leftBlocksSet, rightBlocksSet); }
    if (leftMutesSet && rightMutesSet) { muteOverlap = options.overlap(leftMutesSet, rightMutesSet); }
    let moderationSimilarity = null;
    if (blockOverlap && muteOverlap) {
      moderationSimilarity = (blockOverlap.jaccard + muteOverlap.jaccard) * 0.5;
    } else if (blockOverlap) {
      moderationSimilarity = blockOverlap.jaccard;
    } else if (muteOverlap) {
      moderationSimilarity = muteOverlap.jaccard;
    }
    const robustnessMix = (
      (burrowsDelta.similarity * 0.22)
      + (characterNgramSimilarity * 0.18)
      + (functionWordSimilarity * 0.14)
      + (cosineSimilarity * 0.11)
      + (jaccardSimilarity * 0.05)
      + (metricsSimilarity * 0.06)
      + (temporalProfileSimilarity * 0.05)
      + (temporalProximityScore * 0.03)
      + (relationshipSimilarity * 0.08)
      + (interactionSimilarity * 0.08)
      + ((moderationSimilarity ?? 0) * 0.00)
    );
    const score = Math.round(100 * robustnessMix);
    const minWords = Math.min(leftAccount.corpus.wordCount, rightAccount.corpus.wordCount);
    let labelKey = "analysisSimilarityLow";
    if (score >= 98) { labelKey = "analysisSimilarityIdentical"; }
    else if (score >= 78) { labelKey = "analysisSimilarityHigh"; }
    else if (score >= 58) { labelKey = "analysisSimilarityMedium"; }
    let confidenceKey = "analysisConfidenceHigh";
    if (minWords < 2000) { confidenceKey = "analysisConfidenceLow"; }
    else if (minWords < 5000) { confidenceKey = "analysisConfidenceMedium"; }
  
    return {
      score,
      labelKey,
      confidenceKey,
      robustnessMix,
      metricsSimilarity,
      cosineSimilarity,
      jaccardSimilarity,
      functionWordSimilarity,
      characterNgramSimilarity,
      temporalProfileSimilarity,
      temporalProximityScore,
      relationshipSimilarity,
      interactionSimilarity,
      moderationSimilarity,
      followerOverlap,
      followingOverlap,
      mutualOverlap,
      blockOverlap,
      muteOverlap,
      mentionSimilarity,
      hashtagSimilarity,
      domainSimilarity,
      replyTargetSimilarity,
      quoteTargetSimilarity,
      languageSimilarity,
      mediaSimilarity,
      directRelationship: {
        leftFollowsRight: Boolean(leftAccount.network?.followDids?.has?.(rightAccount.profile.did)),
        rightFollowsLeft: Boolean(rightAccount.network?.followDids?.has?.(leftAccount.profile.did)),
      },
      burrowsDelta,
      metricRows,
    };
  }
  return { compare };
}

