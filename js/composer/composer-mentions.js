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

/**
 * Returns the localized relationship label for one account search result.
 * @param {object} actor - Actor result with viewer relationship flags.
 * @param {(key: string) => string} translate - Translation callback for the label key.
 * @returns {string} Relationship label, or an empty string when no relationship applies.
 */
export function getComposerMentionRelationLabel(actor = {}, translate = () => "") {
  if (actor.followingViewer === true && actor.followedByViewer === true) {
    return translate("mentionSearchRelationMutual");
  }
  if (actor.followedByViewer === true) {
    return translate("mentionSearchRelationFollowsYou");
  }
  if (actor.followingViewer === true) {
    return translate("mentionSearchRelationYouFollow");
  }
  return "";
}

/**
 * Creates a cached resolver for Composer mention handles.
 * @param {object} dependencies - Resolver dependencies.
 * @param {(type: string, payload: object, options: object) => Promise<object>} dependencies.sendToServiceWorker - Worker request function.
 * @returns {{ resolve: (handles: string[]) => Promise<Map<string, string|null>>, invalidate: (handles: string|string[]) => void }} Resolver operations.
 */
export function createComposerMentionResolver({ sendToServiceWorker } = {}) {
  const cache = new Map();

  /**
   * Resolves handles using cached values and requests only missing handles.
   * @param {string[]} handles - Handles without a leading at sign.
   * @returns {Promise<Map<string, string|null>>} Normalized handle to DID mapping.
   */
  async function resolve(handles) {
    const result = new Map();
    const normalizedHandles = [];
    for (const value of Array.isArray(handles) ? handles : []) {
      const handle = normalizeComposerMentionHandle(value);
      if (handle && !normalizedHandles.includes(handle)) {
        normalizedHandles.push(handle);
      }
    }

    const missingHandles = [];
    for (const handle of normalizedHandles) {
      if (cache.has(handle)) {
        result.set(handle, cache.get(handle) || null);
      } else {
        missingHandles.push(handle);
      }
    }

    if (missingHandles.length === 0 || typeof sendToServiceWorker !== "function") {
      for (const handle of missingHandles) {
        result.set(handle, null);
      }
      return result;
    }

    let response = {};
    try {
      response = await sendToServiceWorker("RESOLVE_COMPOSER_MENTIONS", {
        handles: missingHandles,
      }, { timeoutMs: 30000 });
    } catch {
      response = {};
    }

    const resolved = new Map();
    for (const mention of Array.isArray(response?.mentions) ? response.mentions : []) {
      const handle = normalizeComposerMentionHandle(mention?.handle);
      if (!handle) {
        continue;
      }
      const did = String(mention?.did || "").trim();
      resolved.set(handle, did || null);
    }

    for (const handle of missingHandles) {
      const did = resolved.get(handle) || null;
      cache.set(handle, did);
      result.set(handle, did);
    }
    return result;
  }

  /**
   * Removes one or more handles from the local resolution cache.
   * @param {string|string[]} handles - Handles to invalidate.
   * @returns {void}
   */
  function invalidate(handles) {
    const values = Array.isArray(handles) ? handles : [handles];
    for (const value of values) {
      const handle = normalizeComposerMentionHandle(value);
      if (handle) {
        cache.delete(handle);
      }
    }
  }

  return { resolve, invalidate };
}

/**
 * Creates per-segment state for synchronizing corrected mentions to source text.
 * @param {object} dependencies - Mention text operations.
 * @param {(text: string, handle: string) => boolean} dependencies.containsHandle - Checks a boundary-valid mention.
 * @param {(text: string, fromHandle: string, toHandle: string) => string} dependencies.replaceHandle - Replaces a boundary-valid mention.
 * @returns {{ queue: Function, getPending: Function, apply: Function, clear: Function }} Source synchronization operations.
 */
export function createComposerMentionSourceSyncController({ containsHandle, replaceHandle } = {}) {
  const entriesBySegment = new Map();

  /**
   * Adds or updates a pending correction for one segment.
   * @param {number} segmentIndex - Zero-based segment index.
   * @param {string} fromHandle - Handle still present in source text.
   * @param {string} toHandle - Corrected handle in the edited segment.
   * @returns {void}
   */
  function queue(segmentIndex, fromHandle, toHandle) {
    const fromValue = normalizeComposerMentionHandle(fromHandle);
    const toValue = normalizeComposerMentionHandle(toHandle);
    if (!fromValue || !toValue || fromValue === toValue) {
      return;
    }
    const nextEntries = [];
    const existingEntries = entriesBySegment.get(segmentIndex) || [];
    let updated = false;
    for (const entry of existingEntries) {
      const entryFrom = normalizeComposerMentionHandle(entry?.fromHandle);
      const entryTo = normalizeComposerMentionHandle(entry?.toHandle);
      if (!entryFrom || !entryTo) {
        continue;
      }
      if (entryTo === fromValue || entryFrom === fromValue) {
        nextEntries.push({ fromHandle: entryFrom, toHandle: toValue });
        updated = true;
      } else {
        nextEntries.push({ fromHandle: entryFrom, toHandle: entryTo });
      }
    }
    if (!updated) {
      nextEntries.push({ fromHandle: fromValue, toHandle: toValue });
    }
    entriesBySegment.set(segmentIndex, nextEntries);
  }

  /**
   * Returns pending corrections that still match both source and segment text.
   * @param {number} segmentIndex - Zero-based segment index.
   * @param {string} sourceText - Current Composer source text.
   * @param {string} segmentText - Current edited segment text.
   * @returns {Array<{fromHandle: string, toHandle: string}>} Valid pending corrections.
   */
  function getPending(segmentIndex, sourceText, segmentText) {
    const source = String(sourceText || "");
    const currentSegmentText = String(segmentText || "");
    const pendingEntries = entriesBySegment.get(segmentIndex) || [];
    const validEntries = [];
    for (const entry of pendingEntries) {
      const fromHandle = normalizeComposerMentionHandle(entry?.fromHandle);
      const toHandle = normalizeComposerMentionHandle(entry?.toHandle);
      if (!fromHandle || !toHandle || fromHandle === toHandle) {
        continue;
      }
      if (typeof containsHandle !== "function") {
        continue;
      }
      if (!containsHandle(source, fromHandle) || !containsHandle(currentSegmentText, toHandle)) {
        continue;
      }
      validEntries.push({ fromHandle, toHandle });
    }
    if (validEntries.length > 0) {
      entriesBySegment.set(segmentIndex, validEntries);
    } else {
      entriesBySegment.delete(segmentIndex);
    }
    return validEntries;
  }

  /**
   * Applies one correction to source text and removes its pending entry.
   * @param {number} segmentIndex - Zero-based segment index.
   * @param {string} sourceText - Current Composer source text.
   * @param {string} fromHandle - Original source handle.
   * @param {string} toHandle - Corrected handle.
   * @returns {string} Updated source text.
   */
  function apply(segmentIndex, sourceText, fromHandle, toHandle) {
    const fromValue = normalizeComposerMentionHandle(fromHandle);
    const toValue = normalizeComposerMentionHandle(toHandle);
    if (!fromValue || !toValue || fromValue === toValue || typeof replaceHandle !== "function") {
      return String(sourceText || "");
    }
    const nextEntries = [];
    for (const entry of entriesBySegment.get(segmentIndex) || []) {
      const entryFrom = normalizeComposerMentionHandle(entry?.fromHandle);
      const entryTo = normalizeComposerMentionHandle(entry?.toHandle);
      if (entryFrom === fromValue && entryTo === toValue) {
        continue;
      }
      nextEntries.push({ fromHandle: entryFrom, toHandle: entryTo });
    }
    if (nextEntries.length > 0) {
      entriesBySegment.set(segmentIndex, nextEntries);
    } else {
      entriesBySegment.delete(segmentIndex);
    }
    return replaceHandle(String(sourceText || ""), fromValue, toValue);
  }

  /**
   * Clears all pending source corrections.
   * @returns {void}
   */
  function clear() {
    entriesBySegment.clear();
  }

  return { queue, getPending, apply, clear };
}

/**
 * Creates template rendering and per-segment scheduling for Composer mentions.
 * @param {object} options - Templates, resolver, translations, actions, version getter and timers.
 * @returns {{render: Function, schedule: Function}} Mention display operations.
 */
export function createComposerMentionDisplayController(options) {
  const {
    templates, translate: t, resolve, getVersion,
    profileUrl: buildComposerMentionProfileUrl,
    suggest: findComposerMentionSuggestion,
    applyTranslatedTitle, openSearch: openMentionSearchDialog,
    getPending, applySync: applyMentionSourceSync,
    setTimeout, clearTimeout, delayMs,
  } = options;
  const segmentMentionResolveTimerByIndex = new Map();

  /**
   * Clones a configured mention display template.
   * @param {string} name - Template configuration key.
   * @returns {HTMLElement} Detached template root.
   */
  function clone(name) {
    return templates[name].content.firstElementChild.cloneNode(true);
  }

  /**
   * Renders resolved mention facets below one composer segment.
   * @param {number} segmentIndex - Zero-based segment index for follow-up actions.
   * @param {HTMLElement|null} container - Target mention container inside the segment card.
   * @param {string} text - Current segment text.
   * @param {number} version - Render/update version guard.
   * @returns {Promise<void>} Resolves when the UI has been updated.
   */
  async function render(segmentIndex, container, text, version) {
    if (!container) {
      return;
    }

    const candidates = parseComposerMentionCandidates(text);
    const uniqueHandles = getUniqueComposerMentionHandles(candidates);

    container.replaceChildren();
    container.hidden = true;

    if (uniqueHandles.length === 0) {
      return;
    }

    const resolutionMap = await resolve(uniqueHandles);
    if (version !== getVersion()) {
      return;
    }

    const resolvedEntries = [];
    const unresolvedEntries = [];

    for (const handle of uniqueHandles) {
      let did = null;
      if (resolutionMap.has(handle)) {
        did = resolutionMap.get(handle);
      }
      if (did) {
        resolvedEntries.push({ handle, did });
      } else {
        unresolvedEntries.push({
          handle,
          suggestion: findComposerMentionSuggestion(handle),
        });
      }
    }

    if (resolvedEntries.length === 0 && unresolvedEntries.length === 0) {
      return;
    }

    const label = clone("label");
    label.textContent = t("segmentMentionsLabel");
    container.appendChild(label);

    for (const entry of resolvedEntries) {
      const chip = clone("resolved");
      const bodyButton = chip.querySelector("button");
      const link = chip.querySelector("a");
      const handleText = chip.querySelector(".segment-mention-handle");
      const didText = chip.querySelector("small");

      link.href = buildComposerMentionProfileUrl(entry.handle, entry.did);
      applyTranslatedTitle(link, "mentionOpenAccountButton");
      link.setAttribute("aria-label", t("mentionOpenAccountButton"));
      handleText.textContent = `@${entry.handle}`;
      didText.textContent = entry.did;
      bodyButton.addEventListener("click", () => {
        openMentionSearchDialog(segmentIndex, entry.handle, "review");
      });
      container.appendChild(chip);
    }

    if (unresolvedEntries.length > 0) {
      for (const entry of unresolvedEntries) {
        const chip = clone("unresolved");
        const handleText = chip.querySelector("strong");
        const messageText = chip.querySelector("small");

        handleText.textContent = `@${entry.handle}`;
        if (entry.suggestion) {
          messageText.textContent = t("segmentMentionsUnresolvedWithSuggestion", {
            handle: `@${entry.handle}`,
            suggestion: `@${entry.suggestion}`,
          });
        } else {
          messageText.textContent = t("segmentMentionsUnresolvedHandle", {
            handle: `@${entry.handle}`,
          });
        }
        chip.addEventListener("click", () => {
          openMentionSearchDialog(segmentIndex, entry.handle, "repair");
        });
        container.appendChild(chip);
      }
    }

    const pendingSourceSyncEntries = getPending(segmentIndex, text);
    for (const entry of pendingSourceSyncEntries) {
      const syncBox = clone("sync");
      const syncMessage = syncBox.querySelector("small");
      const syncButton = syncBox.querySelector("button");

      syncMessage.textContent = t("segmentMentionsSourceSyncMessage", {
        fromHandle: `@${entry.fromHandle}`,
        toHandle: `@${entry.toHandle}`,
      });
      syncButton.textContent = t("segmentMentionsSourceSyncButton");
      syncButton.addEventListener("click", () => {
        applyMentionSourceSync(segmentIndex, entry.fromHandle, entry.toHandle);
      });
      container.appendChild(syncBox);
    }

    container.hidden = false;
  }

  /**
   * Debounces mention resolution for one composer segment after edits.
   * @param {number} segmentIndex - Zero-based segment index.
   * @param {HTMLElement|null} container - Mention container inside the segment card.
   * @param {string} text - Current segment text.
   * @returns {void}
   */
  function schedule(segmentIndex, container, text) {
    const previousTimer = segmentMentionResolveTimerByIndex.get(segmentIndex);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    const timerId = setTimeout(() => {
      segmentMentionResolveTimerByIndex.delete(segmentIndex);
      const currentVersion = getVersion();
      void render(segmentIndex, container, text, currentVersion);
    }, delayMs);

    segmentMentionResolveTimerByIndex.set(segmentIndex, timerId);
  }

  return { render, schedule };
}

/**
 * Renders one batch of account search hits inside the mention search dialog.
 * @param {object[]} actors - Normalized actor search results.
 * @param {object} options - Template, container, translation, avatar and selection dependencies.
 * @returns {void}
 */
export function renderComposerMentionSearchResults(actors, options) {
  const {
    container: mentionSearchResults, template: mentionSearchResultTemplate,
    cloneTemplateContent, setAvatarImage, translate, onSelect,
  } = options;
  if (!mentionSearchResults) {
    return;
  }

  mentionSearchResults.replaceChildren();
  for (const actor of Array.isArray(actors) ? actors : []) {
    const fragment = cloneTemplateContent(mentionSearchResultTemplate);
    if (!fragment) {
      continue;
    }

    const button = fragment.querySelector(".mention-search-result");
    const avatar = fragment.querySelector(".mention-search-result-avatar");
    const name = fragment.querySelector(".mention-search-result-name");
    const handle = fragment.querySelector(".mention-search-result-handle");
    const meta = fragment.querySelector(".mention-search-result-meta");

    setAvatarImage(avatar, actor.avatar, actor.displayName || actor.handle || actor.did || "account");
    name.textContent = actor.displayName || actor.handle || actor.did || "";
    if (actor.handle) {
      handle.textContent = `@${actor.handle}`;
    } else {
      handle.textContent = actor.did || "";
    }
    meta.textContent = getComposerMentionRelationLabel(actor, translate);
    button.addEventListener("click", () => {
      onSelect(actor);
    });

    mentionSearchResults.appendChild(fragment);
  }
}

/**
 * Collects unique known handles from the active and saved accounts.
 * @param {string|null} activeHandle - Current account handle.
 * @param {object[]} accounts - Saved accounts with handles or identifiers.
 * @returns {string[]} Normalized handles in first-occurrence order.
 */
export function getKnownComposerMentionHandles(activeHandle, accounts) {
  const values = [activeHandle];
  if (Array.isArray(accounts)) {
    for (const account of accounts) {
      values.push(account?.handle, account?.identifier);
    }
  }
  const handles = [];
  const seen = new Set();
  for (const value of values) {
    const handle = normalizeComposerMentionHandle(value);
    if (handle && !seen.has(handle)) {
      handles.push(handle);
      seen.add(handle);
    }
  }
  return handles;
}

/**
 * Runs account search and updates its status only for the current request.
 * @param {string} rawQuery - Search input value.
 * @param {object} options - Status/results nodes, translations, request-token and transport callbacks.
 * @returns {Promise<void>} Resolves after current results or errors are displayed.
 */
export async function runComposerMentionSearch(rawQuery, options) {
  const { status, results, translate, startRequest, isCurrent, request, render } = options;
  if (!status || !results) {
    return;
  }
  const query = String(rawQuery || "").trim().replace(/^@/, "");
  const token = startRequest();
  status.textContent = "";
  delete status.dataset.tone;
  if (query.length < 2) {
    results.replaceChildren();
    status.textContent = translate("mentionSearchNeedQuery");
    return;
  }
  status.textContent = translate("mentionSearchLoading");
  try {
    const response = await request(query);
    if (!isCurrent(token)) {
      return;
    }
    let actors = [];
    if (Array.isArray(response?.actors)) {
      actors = response.actors;
    }
    if (actors.length === 0) {
      results.replaceChildren();
      status.textContent = translate("mentionSearchNoResults");
      return;
    }
    render(actors);
    status.textContent = translate("mentionSearchResultsLoaded", { count: actors.length });
  } catch (error) {
    if (!isCurrent(token)) {
      return;
    }
    status.textContent = error.message || translate("mentionSearchFailed");
    status.dataset.tone = "error";
  }
}

/**
 * Prepares and opens the mention dialog in review or repair mode.
 * @param {object} elements - Dialog, eyebrow, title, note, status, results and input nodes.
 * @param {string} handle - Normalized mention handle.
 * @param {string} mode - Review or repair mode.
 * @param {(key: string) => string} translate - Translation function.
 * @returns {void}
 */
export function prepareComposerMentionSearchDialog(elements, handle, mode, translate) {
  const { dialog, eyebrow, title, note, status, results, input } = elements;
  let titleKey = "mentionSearchDialogTitle";
  let noteKey = "mentionSearchDialogNote";
  if (mode === "review") {
    titleKey = "mentionSearchDialogReviewTitle";
    noteKey = "mentionSearchDialogReviewNote";
  }
  if (eyebrow) {
    eyebrow.textContent = translate("mentionSearchDialogEyebrow");
  }
  if (title) {
    title.textContent = translate(titleKey);
  }
  if (note) {
    note.textContent = translate(noteKey);
  }
  if (status) {
    status.textContent = "";
    delete status.dataset.tone;
  }
  results?.replaceChildren();
  if (input) {
    input.value = handle;
  }
  dialog?.showModal();
  input?.focus();
  input?.select();
}

/**
 * Creates reset, close and selection actions for the shared mention search dialog.
 * @param {object} elements - Dialog, input, status, results, eyebrow, title and note nodes.
 * @param {object} dependencies - State access, source sync, resolver, translations and Composer UI callbacks.
 * @returns {{reset: Function, close: Function, select: Function}} Dialog action controller.
 */
export function createComposerMentionSearchActions(elements, dependencies) {
  /**
   * Clears dialog state, cancels pending searches and restores default labels.
   * @returns {void}
   */
  function reset() {
    dependencies.resetPicker();
    dependencies.resetSearchState();
    if (elements.input) {
      elements.input.value = "";
    }
    if (elements.status) {
      elements.status.textContent = "";
      delete elements.status.dataset.tone;
    }
    for (const [name, key] of [
      ["eyebrow", "mentionSearchDialogEyebrow"],
      ["title", "mentionSearchDialogTitle"],
      ["note", "mentionSearchDialogNote"],
    ]) {
      if (elements[name]) {
        elements[name].textContent = dependencies.translate(key);
      }
    }
    elements.results?.replaceChildren();
  }

  /**
   * Resets and closes an open mention dialog.
   * @returns {void}
   */
  function close() {
    reset();
    if (elements.dialog?.open) {
      elements.dialog.close();
    }
  }

  /**
   * Applies a selected handle to its segment and updates Composer state.
   * @param {string} selectedHandle - Selected account handle.
   * @returns {boolean} True when a valid segment selection was applied.
   */
  function select(selectedHandle) {
    const handle = String(selectedHandle || "").trim().replace(/^@/, "");
    const { segmentIndex, originalHandle } = dependencies.getTarget();
    const segments = dependencies.getSegments();
    if (!handle || segmentIndex < 0 || segmentIndex >= segments.length) {
      return false;
    }
    const nextSegments = [...segments];
    nextSegments[segmentIndex] = replaceComposerMentionHandle(
      String(segments[segmentIndex] || ""), originalHandle, handle,
    );
    dependencies.sourceSync.queue(segmentIndex, originalHandle, handle);
    dependencies.setSegments(nextSegments);
    dependencies.setLocked(true);
    dependencies.setPosted(false);
    dependencies.resolver.invalidate([originalHandle, handle]);
    close();
    dependencies.render({ preserveOverrides: true, preserveView: true, animate: false });
    dependencies.saveDraft();
    return true;
  }

  return { reset, close, select };
}

/**
 * Coordinates applying a pending mention repair to source text and document UI.
 * @param {object} options - Source access, sync service, resolver and document update callbacks.
 * @returns {object} Source correction operation.
 */
export function createComposerMentionSourceCorrectionController(options) {
  /**
   * Applies a valid correction while retaining manually edited section text.
   * @param {number} segmentIndex - Corrected section index.
   * @param {string} fromHandle - Original handle.
   * @param {string} toHandle - Replacement handle.
   * @returns {boolean} Whether the correction was applied.
   */
  function apply(segmentIndex, fromHandle, toHandle) {
    const from = String(fromHandle || "").trim().replace(/^@/, "").toLowerCase();
    const to = String(toHandle || "").trim().replace(/^@/, "").toLowerCase();
    if (!from || !to || from === to) { return false; }
    options.setSource(options.sync.apply(segmentIndex, options.getSource(), from, to));
    options.resolver.invalidate([from, to]);
    options.setLocked(true);
    options.setPosted(false);
    options.render({ preserveOverrides: true, preserveView: true, animate: false });
    options.saveDraft();
    return true;
  }
  return { apply };
}

/**
 * Owns dialog search cancellation, debounce and mention opening, including shared account searches.
 * @param {object} elements - Dialog header, input, results and status elements.
 * @param {object} options - Target-state writer, search callback, translations and timer adapters.
 * @returns {object} Request guards, cancellation, opening and input event handlers.
 */
export function createComposerMentionDialogController(elements, options) {
  let token = 0;
  let timer = 0;
  /** Cancels pending input work and invalidates older searches. @returns {void} */
  function cancel() {
    token += 1;
    options.clearTimeout(timer);
    timer = 0;
  }
  /** Starts one search generation. @returns {number} Generation token. */
  function start() { token += 1; return token; }
  /** Tests request freshness. @param {number} value - Request token. @returns {boolean} Freshness. */
  function isCurrent(value) { return value === token; }
  /**
   * Opens a normalized review or repair target, cancelling previous work.
   * @param {number} segmentIndex - Target section.
   * @param {string} handle - Target handle.
   * @param {string} mode - Review or repair mode.
   * @returns {void}
   */
  function open(segmentIndex, handle, mode = "repair") {
    const originalHandle = String(handle || "").trim().replace(/^@/, "").toLowerCase();
    let normalizedMode = "repair";
    if (mode === "review") { normalizedMode = "review"; }
    options.setTarget({ context: "mention", segmentIndex, originalHandle, mode: normalizedMode });
    cancel();
    prepareComposerMentionSearchDialog(elements, originalHandle, normalizedMode, options.translate);
    void options.search(originalHandle);
  }
  /** Debounces searches using the latest input value. @returns {void} */
  function input() {
    options.clearTimeout(timer);
    timer = options.setTimeout(() => {
      timer = 0;
      void options.search(elements.input.value);
    }, options.delayMs);
  }
  /** Submits Enter without changing existing debounce behavior. @param {KeyboardEvent} event - Key event. @returns {void} */
  function keydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      void options.search(elements.input.value);
    }
  }
  return { cancel, start, isCurrent, open, input, keydown };
}
