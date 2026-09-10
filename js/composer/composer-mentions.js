/**
 * Normalizes one Composer mention handle without its leading at sign.
 * @param {string} value - Raw mention handle.
 * @returns {string} Lowercase normalized handle.
 */
export function normalizeComposerMentionHandle(value) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Extracts mention candidates from Composer text in visible Bluesky mention form.
 * @param {string} text - Raw segment text.
 * @returns {Array<{handle: string, raw: string}>} Normalized candidates in source order.
 */
export function parseComposerMentionCandidates(text) {
  const candidates = [];
  const value = String(text || "");
  const regex = /(^|[\s([{"'“„«‹])(@)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)(?=$|[\s)\]}",;:!?'”»›])/gu;
  let match;

  while ((match = regex.exec(value))) {
    const handle = normalizeComposerMentionHandle(match[3]);
    if (!handle) {
      continue;
    }
    candidates.push({ handle, raw: `@${handle}` });
  }

  return candidates;
}

/**
 * Returns normalized mention handles once, preserving their first source occurrence.
 * @param {Array<{handle: string}>} candidates - Mention candidates from Composer text.
 * @returns {string[]} Unique normalized handles.
 */
export function getUniqueComposerMentionHandles(candidates) {
  const uniqueHandles = [];
  const seen = new Set();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const handle = normalizeComposerMentionHandle(candidate?.handle);
    if (!handle || seen.has(handle)) {
      continue;
    }
    seen.add(handle);
    uniqueHandles.push(handle);
  }
  return uniqueHandles;
}

/**
 * Builds a public profile URL for a resolved Composer mention.
 * @param {string} handle - Mention handle without an at sign.
 * @param {string|null} did - Resolved DID when available.
 * @param {string} webApp - Public Bluesky-compatible web application base URL.
 * @returns {string} Encoded profile URL, or an empty string when no identifier exists.
 */
export function buildComposerMentionProfileUrl(handle, did, webApp) {
  const profileIdentifier = String(did || handle || "").trim();
  if (!profileIdentifier) {
    return "";
  }
  return `${String(webApp || "").replace(/\/$/, "")}/profile/${encodeURIComponent(profileIdentifier)}`;
}

/**
 * Escapes a value for safe use inside a regular expression.
 * @param {string} value - Raw source value.
 * @returns {string} Regex-safe string.
 */
export function escapeComposerMentionRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a boundary-aware regular expression for one Composer mention handle.
 * @param {string} handle - Mention handle without an at sign.
 * @returns {RegExp|null} Mention pattern, or null when the handle is empty.
 */
export function buildComposerMentionHandlePattern(handle) {
  const normalizedHandle = normalizeComposerMentionHandle(handle);
  if (!normalizedHandle) {
    return null;
  }
  return new RegExp(`(^|[\\s([{\"'“„«‹])@${escapeComposerMentionRegex(normalizedHandle)}(?=$|[\\s)\\]}\",;:!?'”»›])`, "gu");
}

/**
 * Checks whether text contains one Composer mention with valid surrounding boundaries.
 * @param {string} text - Source text to inspect.
 * @param {string} handle - Mention handle without an at sign.
 * @returns {boolean} True when the mention exists.
 */
export function textContainsComposerMentionHandle(text, handle) {
  const pattern = buildComposerMentionHandlePattern(handle);
  if (!pattern) {
    return false;
  }
  return pattern.test(String(text || ""));
}

/**
 * Replaces one Composer mention while preserving its surrounding punctuation.
 * @param {string} text - Segment or source text to update.
 * @param {string} fromHandle - Current mention handle without an at sign.
 * @param {string} toHandle - Replacement mention handle without an at sign.
 * @returns {string} Updated text.
 */
export function replaceComposerMentionHandle(text, fromHandle, toHandle) {
  const fromValue = normalizeComposerMentionHandle(fromHandle);
  const toValue = normalizeComposerMentionHandle(toHandle);
  if (!fromValue || !toValue || fromValue === toValue) {
    return String(text || "");
  }
  const pattern = buildComposerMentionHandlePattern(fromValue);
  if (!pattern) {
    return String(text || "");
  }
  return String(text || "").replace(pattern, (match, prefix) => `${prefix}@${toValue}`);
}

/**
 * Calculates the Levenshtein edit distance between two strings.
 * @param {string} left - First value.
 * @param {string} right - Second value.
 * @returns {number} Edit distance.
 */
export function getComposerMentionLevenshteinDistance(left, right) {
  const source = String(left || "");
  const target = String(right || "");
  if (source === target) {
    return 0;
  }
  if (!source) {
    return target.length;
  }
  if (!target) {
    return source.length;
  }

  const previousRow = new Array(target.length + 1).fill(0);
  const currentRow = new Array(target.length + 1).fill(0);
  for (let index = 0; index <= target.length; index += 1) {
    previousRow[index] = index;
  }
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    currentRow[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      let substitutionCost = 1;
      if (source[sourceIndex - 1] === target[targetIndex - 1]) {
        substitutionCost = 0;
      }
      const deletionCost = previousRow[targetIndex] + 1;
      const insertionCost = currentRow[targetIndex - 1] + 1;
      const substitutionTotal = previousRow[targetIndex - 1] + substitutionCost;
      currentRow[targetIndex] = Math.min(deletionCost, insertionCost, substitutionTotal);
    }
    for (let targetIndex = 0; targetIndex <= target.length; targetIndex += 1) {
      previousRow[targetIndex] = currentRow[targetIndex];
    }
  }
  return previousRow[target.length];
}

/**
 * Finds a nearby known handle for an unresolved Composer mention.
 * @param {string} handle - Unresolved mention handle.
 * @param {string[]} knownHandles - Known local account handles.
 * @param {number} maxDistance - Largest allowed edit distance.
 * @returns {string} Best matching handle, or an empty string.
 */
export function findComposerMentionSuggestion(handle, knownHandles, maxDistance = 2) {
  const normalizedHandle = normalizeComposerMentionHandle(handle);
  if (!normalizedHandle) {
    return "";
  }

  let bestHandle = "";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidateValue of Array.isArray(knownHandles) ? knownHandles : []) {
    const candidate = normalizeComposerMentionHandle(candidateValue);
    if (!candidate || candidate === normalizedHandle) {
      continue;
    }
    const distance = getComposerMentionLevenshteinDistance(normalizedHandle, candidate);
    if (distance > maxDistance || distance >= bestDistance) {
      continue;
    }
    bestDistance = distance;
    bestHandle = candidate;
  }
  return bestHandle;
}
