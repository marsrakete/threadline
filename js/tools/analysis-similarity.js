/** Calculates cosineSimilarityFromMaps without application state. @param {Map} leftMap - Left frequency map. @param {Map} rightMap - Right frequency map. @returns {number} Cosine similarity, zero for missing magnitudes. */
export function cosineSimilarityFromMaps(leftMap, rightMap) {
  const keys = new Set([...leftMap.keys(), ...rightMap.keys()]);
  if (!keys.size) {
    return 0;
  }
  let numerator = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  keys.forEach((key) => {
    const leftValue = Number(leftMap.get(key) || 0);
    const rightValue = Number(rightMap.get(key) || 0);
    numerator += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  });
  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }
  return numerator / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

/** Calculates jaccardSimilarityFromSets without application state. @param {Set|Array} leftSet - Left identifiers. @param {Set|Array} rightSet - Right identifiers. @returns {number} Jaccard similarity, one for two empty sets. */
export function jaccardSimilarityFromSets(leftSet, rightSet) {
  let left = leftSet;
  if (!(leftSet instanceof Set)) { left = new Set(leftSet || []); }
  let right = rightSet;
  if (!(rightSet instanceof Set)) { right = new Set(rightSet || []); }
  if (!left.size && !right.size) {
    return 1;
  }
  let intersection = 0;
  left.forEach((item) => {
    if (right.has(item)) {
      intersection += 1;
    }
  });
  const union = new Set([...left, ...right]).size;
  if (union) { return intersection / union; }
  return 0;
}

/** Calculates intersectionCountFromSets without application state. @param {Set|Array} leftSet - Left identifiers. @param {Set|Array} rightSet - Right identifiers. @returns {number} Shared count. */
export function intersectionCountFromSets(leftSet, rightSet) {
  let left = leftSet;
  if (!(leftSet instanceof Set)) { left = new Set(leftSet || []); }
  let right = rightSet;
  if (!(rightSet instanceof Set)) { right = new Set(rightSet || []); }
  let intersection = 0;
  left.forEach((item) => {
    if (right.has(item)) {
      intersection += 1;
    }
  });
  return intersection;
}

/** Calculates overlapSummaryFromSets without application state. @param {Set|Array} leftSet - Left identifiers. @param {Set|Array} rightSet - Right identifiers. @returns {object} Counts and directional shares. */
export function overlapSummaryFromSets(leftSet, rightSet) {
  let left = leftSet;
  if (!(leftSet instanceof Set)) { left = new Set(leftSet || []); }
  let right = rightSet;
  if (!(rightSet instanceof Set)) { right = new Set(rightSet || []); }
  const intersection = intersectionCountFromSets(left, right);
  const union = new Set([...left, ...right]).size;
  let jaccard = 1; let leftShare = 0; let rightShare = 0;
  if (union) { jaccard = intersection / union; }
  if (left.size) { leftShare = intersection / left.size; }
  if (right.size) { rightShare = intersection / right.size; }
  return {
    leftCount: left.size,
    rightCount: right.size,
    sharedCount: intersection,
    unionCount: union,
    jaccard,
    leftShare,
    rightShare,
  };
}

/** Calculates frequencyMapFromEntries without application state. @param {object[]} entries - Identifier/label count or share entries. @returns {Map} Normalized frequency map. */
export function frequencyMapFromEntries(entries = []) {
  const map = new Map();
  let input = [];
  if (Array.isArray(entries)) { input = entries; }
  input.forEach((entry) => {
    const label = String(entry?.identifier || entry?.did || entry?.handle || entry?.label || "").trim();
    if (!label) {
      return;
    }
    const count = Math.max(0, Number(entry?.count) || Math.round((Number(entry?.share) || 0) * 1000) || 0);
    map.set(label, count);
  });
  return map;
}

/** Calculates cosineSimilarityFromArrays without application state. @param {number[]} leftValues - Left vector. @param {number[]} rightValues - Right vector. @returns {number} Cosine similarity with zero-padding. */
export function cosineSimilarityFromArrays(leftValues = [], rightValues = []) {
  const length = Math.max(leftValues.length, rightValues.length);
  if (!length) {
    return 0;
  }
  let numerator = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const left = Number(leftValues[index] || 0);
    const right = Number(rightValues[index] || 0);
    numerator += left * right;
    leftMagnitude += left * left;
    rightMagnitude += right * right;
  }
  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }
  return numerator / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

/** Calculates shareArray without application state. @param {number[]} values - Counts. @returns {number[]} Shares, all zero for zero totals. */
export function shareArray(values = []) {
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (!total) {
    return values.map(() => 0);
  }
  return values.map((value) => (Number(value) || 0) / total);
}
