/**
 * Default interaction settings used for newly composed posts.
 * @type {{replyMode: string, allowFollowers: boolean, allowFollowing: boolean, allowMentioned: boolean, quotePostsAllowed: boolean}}
 */
export const DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS = Object.freeze({
  replyMode: "everyone",
  allowFollowers: false,
  allowFollowing: false,
  allowMentioned: false,
  quotePostsAllowed: true,
});

/**
 * Normalizes raw Composer interaction settings to the supported posting values.
 * @param {object} value - Raw stored or imported interaction settings.
 * @returns {{replyMode: string, allowFollowers: boolean, allowFollowing: boolean, allowMentioned: boolean, quotePostsAllowed: boolean}} Normalized interaction settings.
 */
export function normalizeComposerPostInteractionSettings(value = {}) {
  let replyMode = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.replyMode;
  if (["everyone", "nobody", "custom"].includes(value.replyMode)) {
    replyMode = value.replyMode;
  }

  return {
    replyMode,
    allowFollowers: value.allowFollowers === true,
    allowFollowing: value.allowFollowing === true,
    allowMentioned: value.allowMentioned === true,
    quotePostsAllowed: value.quotePostsAllowed !== false,
  };
}

/**
 * Builds the localized reply visibility summary for Composer settings.
 * @param {object} settings - Normalized or raw interaction settings.
 * @param {(key: string, values?: object) => string} translate - Translation callback.
 * @returns {string} Human-readable reply visibility summary.
 */
export function getComposerReplyModeSummary(settings = {}, translate) {
  const normalized = normalizeComposerPostInteractionSettings(settings);
  if (normalized.replyMode === "nobody") {
    return translate("replyModeNobody");
  }

  if (normalized.replyMode === "custom") {
    const labels = [];
    if (normalized.allowFollowers) {
      labels.push(translate("replyRuleFollowers"));
    }
    if (normalized.allowFollowing) {
      labels.push(translate("replyRuleFollowing"));
    }
    if (normalized.allowMentioned) {
      labels.push(translate("replyRuleMentioned"));
    }
    if (labels.length > 0) {
      return translate("replyModeCustomSummary", { rules: labels.join(", ") });
    }
    return translate("replyModeNobody");
  }

  return translate("replyModeEveryone");
}

/**
 * Builds the localized disclosure metadata for post language and interaction settings.
 * @param {object} settings - Normalized or raw interaction settings.
 * @param {number} languageCount - Number of selected post languages.
 * @param {(key: string, values?: object) => string} translate - Translation callback.
 * @returns {{languages: string, interactions: string}} Visible disclosure metadata.
 */
export function buildComposerPostSettingsDisclosureMeta(settings = {}, languageCount = 0, translate) {
  const normalized = normalizeComposerPostInteractionSettings(settings);
  const replyMode = getComposerReplyModeSummary(normalized, translate);
  let quotes = translate("quotesAllowedShort");
  if (!normalized.quotePostsAllowed) {
    quotes = translate("quotesBlockedShort");
  }

  return {
    languages: translate("postLanguagesDisclosureSummary", { count: languageCount }),
    interactions: translate("postInteractionDisclosureSummary", { replyMode, quotes }),
  };
}

/**
 * Owns the posting settings and the shared Composer/search language dialog.
 * @param {object} elements - Dialog, summaries, templates and interaction/decoration controls.
 * @param {object} options - Explicit state, language, translation, rendering and persistence adapters.
 * @returns {object} Settings readers, renderers, dialog operations and control event handlers.
 */
export function createComposerPostSettingsController(elements, options) {
  let context = "composer";
  const { getState, setState, translate, normalizeLanguages, inferLanguages, displayLanguage,
    languageOptions, persist, renderSegments, renderSearchLanguages, renderSearchSummary,
    enforceSearchSort, setLocked, setPosted, renderReply, saveDraft, defer } = options;

  /** Reads normalized posting languages with the existing locale fallback. @returns {string[]} Language tags. */
  function getLanguages() {
    const state = getState();
    const languages = normalizeLanguages(state.selectedPostLanguages);
    if (languages.length > 0) { return languages; }
    return inferLanguages(state.currentLocale);
  }

  /** Reads the normalized interaction settings. @returns {object} Posting rules. */
  function getInteraction() { return normalizeComposerPostInteractionSettings(getState().interaction); }

  /** Updates custom-rule enabled state without changing the selected rules. @returns {void} */
  function renderInteraction() {
    const custom = getInteraction().replyMode === "custom";
    for (const input of [elements.followers, elements.following, elements.mentioned]) {
      input.disabled = !custom;
      input.closest(".toggle")?.classList.toggle("is-disabled", !custom);
    }
  }

  /** Applies stored/imported rules to state and controls. @param {object} value - Raw rules. @returns {void} */
  function applyInteraction(value = {}) {
    const interaction = normalizeComposerPostInteractionSettings(value);
    setState({ interaction });
    elements.everyone.checked = interaction.replyMode === "everyone";
    elements.nobody.checked = interaction.replyMode === "nobody";
    elements.custom.checked = interaction.replyMode === "custom";
    elements.followers.checked = interaction.allowFollowers;
    elements.following.checked = interaction.allowFollowing;
    elements.mentioned.checked = interaction.allowMentioned;
    elements.quotes.checked = interaction.quotePostsAllowed;
    renderInteraction();
  }

  /** Builds the localized reply-rule summary. @returns {string} Summary text. */
  function getReplySummary() { return getComposerReplyModeSummary(getInteraction(), translate); }

  /** Refreshes disclosure summaries for posting languages and interaction rules. @returns {void} */
  function renderDisclosure() {
    const meta = buildComposerPostSettingsDisclosureMeta(getInteraction(), getLanguages().length, translate);
    elements.languageMeta.textContent = meta.languages;
    elements.interactionMeta.textContent = meta.interactions;
  }

  /** Renders the complete posting summary and normalizes its selected languages. @returns {void} */
  function renderSummary() {
    const languages = getLanguages();
    setState({ selectedPostLanguages: languages });
    const labels = languages.map((tag) => displayLanguage(tag, getState().currentLocale));
    const parts = [];
    if (labels.length === 1) {
      parts.push(translate("postLanguagesSummarySingle", { language: labels[0] }));
    } else {
      parts.push(translate("postLanguagesSummaryMany", { count: labels.length, languages: labels.join(", ") }));
    }
    for (const [control, key] of [[elements.counter, "counterToggle"], [elements.spacing, "markerSpacingToggle"],
      [elements.intro, "threadIntroToggle"], [elements.emoji, "threadEmojiToggle"]]) {
      if (control.checked) { parts.push(translate(key)); }
    }
    parts.push(translate("postInteractionSummary", { replyMode: getReplySummary() }));
    if (!getInteraction().quotePostsAllowed) { parts.push(translate("quotePostsBlockedSummary")); }
    elements.summary.textContent = parts.join(" · ");
    renderDisclosure();
  }

  /** Reads the selection in the current dialog context. @returns {string[]} Selected language tags. */
  function getSelection() {
    if (context === "search") { return normalizeLanguages(getState().searchSelectedLanguages, options.searchLimit); }
    return getLanguages();
  }

  /** Reads the maximum selection in the current context. @returns {number} Maximum language count. */
  function getLimit() {
    if (context === "search") { return options.searchLimit; }
    return 3;
  }

  /** Applies the context-specific dialog heading and visibility. @returns {void} */
  function renderContext() {
    const search = context === "search";
    let keys = ["postLanguagesEyebrow", "postSettingsDialogTitle", "postSettingsDialogDescription"];
    if (search) { keys = ["searchHeaderEyebrow", "searchLanguageDialogTitle", "searchLanguageDialogDescription"]; }
    [elements.eyebrow, elements.title, elements.description].forEach((element, index) => {
      if (element) { element.textContent = translate(keys[index]); }
    });
    if (elements.settingsList) { elements.settingsList.hidden = search; }
    if (elements.interactionDisclosure) { elements.interactionDisclosure.hidden = search; }
    if (elements.searchNote) {
      elements.searchNote.hidden = !search;
      elements.searchNote.textContent = "";
      if (search) { elements.searchNote.textContent = translate("searchLanguageDialogNote"); }
    }
    elements.languageDisclosure.open = true;
  }

  /**
   * Stores one checkbox change and refreshes dependent views before persistence.
   * @param {string} code - Language tag for this option.
   * @param {boolean} checked - Desired selection state.
   * @param {string[]} selection - Selection at render time.
   * @returns {Promise<void>} Resolves after persistence.
   */
  async function changeLanguage(code, checked, selection) {
    let values = selection.filter((entry) => entry !== code);
    if (checked) { values = [...selection, code]; }
    if (context === "search") { setState({ searchSelectedLanguages: normalizeLanguages(values, options.searchLimit) }); }
    else { setState({ selectedPostLanguages: normalizeLanguages(values) }); }
    enforceSearchSort(true);
    renderSummary();
    renderSearchLanguages();
    renderSearchSummary();
    renderDialog();
    if (context === "composer" && !getState().locked) { renderSegments({ preserveOverrides: false }); }
    await persist();
  }

  /** Renders language options from reusable templates, including the empty result. @returns {void} */
  function renderDialog() {
    renderContext();
    const selection = getSelection();
    const limit = getLimit();
    const entries = languageOptions(getState().currentLocale, elements.search.value);
    elements.list.replaceChildren();
    if (entries.length === 0) {
      const fragment = elements.emptyTemplate.content.cloneNode(true);
      fragment.querySelector("p").textContent = translate("postLanguagesNoResults");
      elements.list.appendChild(fragment);
    } else {
      for (const entry of entries) {
        const fragment = elements.optionTemplate.content.cloneNode(true);
        const label = fragment.querySelector("label");
        const input = fragment.querySelector("input");
        input.value = entry.code;
        input.checked = selection.includes(entry.code);
        input.disabled = !input.checked && selection.length >= limit;
        label.classList.toggle("is-selected", input.checked);
        label.classList.toggle("is-disabled", input.disabled);
        fragment.querySelector("span").textContent = entry.name;
        input.addEventListener("change", () => changeLanguage(entry.code, input.checked, selection));
        elements.list.appendChild(fragment);
      }
    }
    elements.selectionNote.textContent = translate("postLanguagesSelectionNote", { count: selection.length, max: limit });
  }

  /** Focuses the search field after the disclosure opens. @returns {void} */
  function focusSearch() {
    if (elements.languageDisclosure.open) { defer(() => elements.search.focus(), 0); }
  }

  /** Opens the dialog in Composer or search mode. @param {string} mode - Requested context. @returns {void} */
  function open(mode = "composer") {
    context = "composer";
    if (mode === "search") { context = "search"; }
    renderDialog();
    elements.dialog.showModal();
    focusSearch();
  }

  /** Closes the dialog; the close event performs field cleanup. @returns {void} */
  function close() { elements.dialog.close(); }

  /** Clears transient dialog fields and rebuilds the current language list. @returns {void} */
  function resetDialog() {
    elements.search.value = "";
    elements.languageDisclosure.open = false;
    elements.interactionDisclosure.open = false;
    renderDialog();
  }

  /** Applies one reply/quote change and persists the refreshed summary. @param {object} patch - Changed rules. @returns {Promise<void>} */
  async function changeInteraction(patch) {
    setState({ interaction: { ...getInteraction(), ...patch } });
    renderInteraction();
    renderSummary();
    await persist();
  }

  /** Handles a checked reply-mode radio. @param {Event} event - Radio change. @returns {Promise<void>} */
  async function replyModeChange(event) {
    if (!event.currentTarget.checked) { return; }
    await changeInteraction({ replyMode: event.currentTarget.value });
  }

  /**
   * Rebuilds the document after a counter/marker toggle without keeping manual overrides.
   * @param {string} field - Optional decoration-state field.
   * @param {HTMLInputElement} control - Changed checkbox.
   * @param {boolean} refreshReply - Whether to refresh the reply-target card.
   * @returns {void}
   */
  function changeDecoration(field, control, refreshReply = false) {
    const patch = { segmentOverrides: null };
    if (field) { patch[field] = control.checked; }
    setState(patch);
    setLocked(false);
    setPosted(false);
    renderSegments({ preserveOverrides: false });
    if (refreshReply) { renderReply(); }
    renderSummary();
    void persist();
    saveDraft();
  }

  return { getLanguages, getInteraction, applyInteraction, getReplySummary, renderInteraction,
    renderDisclosure, renderSummary, renderDialog, open, close, resetDialog, focusSearch, changeLanguage,
    handlers: {
      counterChange: () => changeDecoration("", elements.counter, true),
      threadIntroChange: () => changeDecoration("appendThreadIntro", elements.intro),
      threadEmojiChange: () => changeDecoration("appendThreadEmoji", elements.emoji),
      markerSpacingChange: () => changeDecoration("addMarkerSpacing", elements.spacing),
      replyModeChange,
      replyAllowFollowersChange: () => changeInteraction({ allowFollowers: elements.followers.checked }),
      replyAllowFollowingChange: () => changeInteraction({ allowFollowing: elements.following.checked }),
      replyAllowMentionedChange: () => changeInteraction({ allowMentioned: elements.mentioned.checked }),
      quotePostsChange: () => changeInteraction({ quotePostsAllowed: elements.quotes.checked }),
    } };
}
