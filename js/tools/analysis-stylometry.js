/** Builds feature rates for a token sample. @param {string[]} words - Tokens. @param {string[]} features - Requested features. @returns {Map} Per-feature rates. */
export function buildAnalysisWordRateMap(words = [], features = []) {
  const frequency = new Map();
  let validWords = [];
  if (Array.isArray(words)) { validWords = words; }
  validWords.forEach((word) => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  const totalWords = Math.max(validWords.length, 1);
  return new Map(features.map((feature) => [feature, (frequency.get(feature) || 0) / totalWords]));
}
/** Splits text without dropping trailing words. @param {string[]} texts - Posts. @param {number} minWords - Chunk target. @param {number} maxChunks - Positive chunk limit. @returns {string[]} Word chunks. */
export function splitAnalysisTextsIntoWordChunks(texts = [], minWords = 180, maxChunks = 12) {
  if (typeof maxChunks !== "number" || Number.isNaN(maxChunks) || maxChunks < 1) {
    throw new RangeError("maxChunks must be at least one");
  }
  const chunks = [];
  let buffer = [];
  let wordCount = 0;
  let input = [];
  if (Array.isArray(texts)) { input = texts; }
  input.forEach((text) => {
    const normalized = String(text || "").trim();
    if (!normalized) {
      return;
    }
    const words = normalized.toLowerCase().match(/\p{L}+(?:['\u2019-]\p{L}+)*/gu) || [];
    if (!words.length) {
      return;
    }
    buffer.push(normalized);
    wordCount += words.length;
    if (wordCount >= minWords) {
      chunks.push(buffer.join("\n"));
      buffer = [];
      wordCount = 0;
    }
  });
  if (buffer.length) {
    chunks.push(buffer.join("\n"));
  }
  while (chunks.length > maxChunks) {
    const tail = chunks.pop();
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n${tail}`;
  }
  return chunks;
}
/** Creates sampled Burrows-Delta calculations. @param {object} options - Locale provider and corpus analyzer. @returns {object} Comparison operation. */
export function createAnalysisStylometryAnalyzer(options) {
  /** Compares normalized account word rates across sampled chunks. @param {object} leftAccount - Texts/corpus. @param {object} rightAccount - Texts/corpus. @returns {object} Delta/similarity and sample counts. */
  function computeBurrowsDelta(leftAccount, rightAccount) {
    const combinedWordCounts = new Map();
    [leftAccount, rightAccount].forEach((account) => {
      account.corpus.frequency.words.forEach((count, word) => {
        if (word.length < 2 || word.length > 12) {
          return;
        }
        combinedWordCounts.set(word, (combinedWordCounts.get(word) || 0) + count);
      });
    });
    const features = Array.from(combinedWordCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], options.locale()))
      .slice(0, 40)
      .map(([word]) => word);
    if (features.length < 8) {
      return {
        delta: Number.NaN,
        similarity: 0,
        featureCount: features.length,
        chunkCount: 0,
      };
    }

    const leftChunks = splitAnalysisTextsIntoWordChunks(leftAccount.texts);
    const rightChunks = splitAnalysisTextsIntoWordChunks(rightAccount.texts);
    const chunkRates = [...leftChunks, ...rightChunks]
      .map((text) => options.corpus([text]).words)
      .map((words) => buildAnalysisWordRateMap(words, features));
    if (chunkRates.length < 4) {
      return {
        delta: Number.NaN,
        similarity: 0,
        featureCount: features.length,
        chunkCount: chunkRates.length,
      };
    }

    const leftRates = buildAnalysisWordRateMap(leftAccount.corpus.words, features);
    const rightRates = buildAnalysisWordRateMap(rightAccount.corpus.words, features);
    const zLeft = [];
    const zRight = [];

    features.forEach((feature) => {
      const values = chunkRates.map((rates) => Number(rates.get(feature) || 0));
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      if (!stdDev || !Number.isFinite(stdDev)) {
        return;
      }
      zLeft.push((Number(leftRates.get(feature) || 0) - mean) / stdDev);
      zRight.push((Number(rightRates.get(feature) || 0) - mean) / stdDev);
    });

    if (!zLeft.length || zLeft.length !== zRight.length) {
      return {
        delta: Number.NaN,
        similarity: 0,
        featureCount: features.length,
        chunkCount: chunkRates.length,
      };
    }

    const delta = zLeft.reduce((sum, value, index) => sum + Math.abs(value - zRight[index]), 0) / zLeft.length;
    return {
      delta,
      similarity: 1 / (1 + Math.max(0, delta)),
      featureCount: zLeft.length,
      chunkCount: chunkRates.length,
    };
  }
  return { compare: computeBurrowsDelta };
}
