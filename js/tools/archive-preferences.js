/** Formats a valid Date as a local input date. @param {Date} date - Date. @returns {string} Date text or empty. */
export function formatArchiveDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses strict local calendar dates without rollover. @param {string} value - Date text. @returns {Date|null} Local date. */
export function parseArchiveDateInputValue(value) {
  const normalizedValue = String(value || "").trim();
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Copies a valid date at local midnight. @param {Date} date - Date. @returns {Date|null} Copy. */
export function getArchiveDateAtLocalMidnight(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Shifts calendar months clamping month-end days. @param {Date} date - Date. @param {number} monthDelta - Month shift. @returns {Date|null} Shifted date. */
export function addArchiveMonths(date, monthDelta) {
  const normalizedDate = getArchiveDateAtLocalMidnight(date);
  const normalizedDelta = Number(monthDelta) || 0;
  if (!normalizedDate) {
    return null;
  }
  const targetMonthDate = new Date(normalizedDate.getFullYear(), normalizedDate.getMonth() + normalizedDelta, 1);
  const lastDayOfTargetMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
  const day = Math.min(normalizedDate.getDate(), lastDayOfTargetMonth);
  return new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), day);
}

/** Creates archive preference/date orchestration. @param {object} elements - Existing archive controls. @param {object} options - Live state, clock, month limit, tag and UI adapters. @returns {object} Preference operations. */
export function createArchivePreferencesController(elements, options) {
  const state = options.state;
  /** Normalizes hashtag scope. @param {string} value - Scope. @returns {string} Scope. */
  function hashtagScope(value) { if (value === "startpost") { return "startpost"; } return "thread"; }
  /** Reads a checkbox preserving the original missing-control default. @param {object|null} element - Control. @returns {boolean} State. */
  function checked(element) { if (element) { return element.checked; } return true; }
  /** Normalizes imported thread mode. @param {string} value - Mode. @returns {string} Mode. */
  function importMode(value) { if (value === "tree" || value === "author") { return value; } return "path"; }
  /** Normalizes PDF image size. @param {string} value - Size. @returns {string} Size. */
  function imageSize(value) { if (value === "small" || value === "large") { return value; } return "medium"; }
  /** Clamps dates using the preferred edge. @param {string} preferredEdge - from, to or auto. @returns {object} From/to and changed. */
  function enforceArchiveDateRangeLimit(preferredEdge = "auto") {
    const defaultRange = getDefaultArchiveDateRange();
    const today = parseArchiveDateInputValue(defaultRange.to);
    let fromDate = parseArchiveDateInputValue(elements.from?.value || "");
    let toDate = parseArchiveDateInputValue(elements.to?.value || "");
    let changed = false;

    if (!toDate) {
      toDate = today;
      changed = true;
    }
    if (toDate && today && toDate.getTime() > today.getTime()) {
      toDate = today;
      changed = true;
    }

    if (!fromDate && toDate) {
      fromDate = addArchiveMonths(toDate, -options.maxMonths);
      changed = true;
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      if (preferredEdge === "from") {
        toDate = addArchiveMonths(fromDate, options.maxMonths);
        if (toDate && today && toDate.getTime() > today.getTime()) {
          toDate = today;
        }
      } else {
        fromDate = addArchiveMonths(toDate, -options.maxMonths);
      }
      changed = true;
    }

    if (fromDate && toDate) {
      const maxAllowedToDate = addArchiveMonths(fromDate, options.maxMonths);
      const minAllowedFromDate = addArchiveMonths(toDate, -options.maxMonths);
      if (preferredEdge === "from") {
        if (maxAllowedToDate && toDate.getTime() > maxAllowedToDate.getTime()) {
          toDate = maxAllowedToDate;
          changed = true;
        }
        if (toDate && today && toDate.getTime() > today.getTime()) {
          toDate = today;
          changed = true;
        }
      } else if (preferredEdge === "to") {
        if (minAllowedFromDate && fromDate.getTime() < minAllowedFromDate.getTime()) {
          fromDate = minAllowedFromDate;
          changed = true;
        }
      } else if (minAllowedFromDate && fromDate.getTime() < minAllowedFromDate.getTime()) {
        fromDate = minAllowedFromDate;
        changed = true;
      }
    }

    const fromValue = formatArchiveDateInputValue(fromDate);
    const toValue = formatArchiveDateInputValue(toDate);
    if (elements.from && elements.from.value !== fromValue) {
      elements.from.value = fromValue;
      changed = true;
    }
    if (elements.to && elements.to.value !== toValue) {
      elements.to.value = toValue;
      changed = true;
    }

    return {
      from: fromValue,
      to: toValue,
      changed,
    };
  }

  /** Gets the bounded range ending at the injected current date. @returns {object} From/to. */
  function getDefaultArchiveDateRange() {
    const today = getArchiveDateAtLocalMidnight(options.now());
    const defaultFromDate = addArchiveMonths(today, -options.maxMonths);
    return {
      from: formatArchiveDateInputValue(defaultFromDate),
      to: formatArchiveDateInputValue(today),
    };
  }

  /** Captures filters, source and export preferences. @returns {object} Preferences. */
  function getArchivePreferences() {
    const filters = getArchiveFilters();
    const options = getArchivePdfOptions();
    return {
      filters,
      source: getPersistableArchiveSource(),
      waveSize: getArchiveWaveSize(),
      pdfOptions: options,
      livePreview: checked(elements.preview),
      savedSearchId: state.savedSearchId,
      threadImportMode: importMode(elements.importMode?.value),
    };
  }

  /** Collects the bounded load-wave size. @returns {number} Size. */
  function getArchiveWaveSize() {
    return Math.max(100, Math.min(1000, Number(elements.wave.value) || 500));
  }

  /** Restores both defaults when either input is invalid. @returns {void} */
  function ensureArchiveDateRangeDefaults() {
    const hasValidFromDate = Boolean(parseArchiveDateInputValue(elements.from?.value || ""));
    const hasValidToDate = Boolean(parseArchiveDateInputValue(elements.to?.value || ""));
    if (hasValidFromDate && hasValidToDate) {
      return;
    }
    const defaultRange = getDefaultArchiveDateRange();
    if (elements.from) {
      elements.from.value = defaultRange.from;
    }
    if (elements.to) {
      elements.to.value = defaultRange.to;
    }
  }

  /** Synchronizes browser input min/max constraints. @returns {void} */
  function syncArchiveDateInputBounds() {
    const defaultRange = getDefaultArchiveDateRange();
    const todayValue = defaultRange.to;
    const fromDate = parseArchiveDateInputValue(elements.from?.value || "");
    const toDate = parseArchiveDateInputValue(elements.to?.value || "");
    let toMin = "";
    let toMax = todayValue;
    let fromMin = "";
    let fromMax = todayValue;

    if (fromDate) {
      const maxFromDate = addArchiveMonths(fromDate, options.maxMonths);
      if (maxFromDate) {
        toMax = formatArchiveDateInputValue(maxFromDate);
        if (todayValue && toMax > todayValue) {
          toMax = todayValue;
        }
      }
      toMin = formatArchiveDateInputValue(fromDate);
    }

    if (toDate) {
      const minFromDate = addArchiveMonths(toDate, -options.maxMonths);
      if (minFromDate) {
        fromMin = formatArchiveDateInputValue(minFromDate);
      }
      fromMax = formatArchiveDateInputValue(toDate);
    }

    if (elements.from) {
      elements.from.min = fromMin;
      elements.from.max = fromMax;
    }
    if (elements.to) {
      elements.to.min = toMin;
      elements.to.max = toMax;
    }
  }

  /** Collects normalized bounded filters and tags. @returns {object} Filters. */
  function getArchiveFilters() {
    ensureArchiveDateRangeDefaults();
    const normalizedRange = enforceArchiveDateRangeLimit("auto");
    syncArchiveDateInputBounds();
    const sourceActor = String(elements.source?.value || "").trim().replace(/^@+/, "");
    return {
      sourceActor,
      sourceDid: String(state.sourceProfile?.did || "").trim(),
      scope: "range",
      contentMode: elements.content.value || "posts",
      includeConversationContext: elements.context?.checked === true,
      year: "",
      from: normalizedRange.from,
      to: normalizedRange.to,
      hashtagTags: options.normalizeTags(state.selectedHashtags, state.hashtags),
      hashtagScope: hashtagScope(state.hashtagScope),
    };
  }

  /** Collects bounded PDF options. @returns {object} Options. */
  function getArchivePdfOptions() {
    return {
      bandSize: Math.max(100, Math.min(1000, Number(elements.band.value) || 200)),
      imageSize: elements.image.value || "medium",
      includeMetrics: elements.metrics.checked,
      keepThreadsTogether: elements.threads.checked,
      indentThreads: checked(elements.indent),
    };
  }

  /** Projects account source metadata for storage. @returns {object|null} Source. */
  function getPersistableArchiveSource() {
    const rawInput = String(elements.source?.value || "").trim();
    if (!rawInput && !state.sourceProfile) {
      return null;
    }
    return {
      input: rawInput,
      did: String(state.sourceProfile?.did || "").trim(),
      handle: String(state.sourceProfile?.handle || "").trim(),
      displayName: String(state.sourceProfile?.displayName || "").trim(),
      avatar: String(state.sourceProfile?.avatar || "").trim(),
    };
  }

  /** Restores preferences and refreshes dependent UI. @param {object} preferences - Persisted settings. @returns {void} */
  function applyArchivePreferences(preferences = {}) {
    const filters = preferences.filters || {};
    let source = {};
    if (preferences.source && typeof preferences.source === "object") { source = preferences.source; }
    if (elements.source) {
      elements.source.value = String(source.input || filters.sourceActor || "").trim();
    }
    state.sourceProfile = null;
    if (source.did) { state.sourceProfile = {
          did: String(source.did || "").trim(),
          handle: String(source.handle || "").trim(),
          displayName: String(source.displayName || source.handle || source.did || "").trim(),
          avatar: String(source.avatar || "").trim(),
      }; }
    elements.scope.value = "range";
    elements.content.value = "posts";
    if (["posts", "thread_roots", "threads", "full"].includes(filters.contentMode)) { elements.content.value = filters.contentMode; }
    if (elements.context) {
      elements.context.checked = filters.includeConversationContext === true;
    }
    elements.year.value = "";
    elements.from.value = String(filters.from || "");
    elements.to.value = String(filters.to || "");
    state.selectedHashtags = options.normalizeTags(filters.hashtagTags, state.hashtags);
    state.hashtagScope = hashtagScope(filters.hashtagScope);
    elements.hashtagScope.value = state.hashtagScope;
    if (elements.importMode) {
      elements.importMode.value = importMode(preferences.threadImportMode);
    }
    state.savedSearchId = String(preferences.savedSearchId || "").trim();
    ensureArchiveDateRangeDefaults();
    enforceArchiveDateRangeLimit("auto");
    syncArchiveDateInputBounds();

    const waveSize = String(preferences.waveSize || "");
    if ([...elements.wave.options].some((option) => option.value === waveSize)) {
      elements.wave.value = waveSize;
    }

    const pdfOptions = preferences.pdfOptions || {};
    const bandSize = String(pdfOptions.bandSize || "");
    if ([...elements.band.options].some((option) => option.value === bandSize)) {
      elements.band.value = bandSize;
    }
    if (elements.image) {
      elements.image.value = imageSize(pdfOptions.imageSize);
    }
    if (elements.metrics) {
      elements.metrics.checked = pdfOptions.includeMetrics !== false;
    }
    if (elements.threads) {
      elements.threads.checked = pdfOptions.keepThreadsTogether !== false;
    }
    if (elements.indent) {
      elements.indent.checked = pdfOptions.indentThreads !== false;
    }
    if (elements.preview) {
      elements.preview.checked = preferences.livePreview !== false;
    }
    options.scopeFields();
    options.renderSource();
    options.renderSavedSearch();
    options.renderTags();
  }
  return { defaults: getDefaultArchiveDateRange, clamp: enforceArchiveDateRangeLimit, bounds: syncArchiveDateInputBounds,
    ensure: ensureArchiveDateRangeDefaults, filters: getArchiveFilters, source: getPersistableArchiveSource,
    pdf: getArchivePdfOptions, wave: getArchiveWaveSize, snapshot: getArchivePreferences, restore: applyArchivePreferences };
}

