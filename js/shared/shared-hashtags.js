/** Normalizes a typed hashtag without changing its display casing. @param {*} value - Raw input. @returns {object|null} Display value and case-insensitive id. */
export function parseHashtag(value) {
  const cleaned = String(value || "").trim().replace(/^#+/, "").replace(/\s+/g, "").replace(/[.,;:!?]+$/g, "");
  if (!cleaned) { return null; }
  return { value: cleaned, normalized: cleaned.toLowerCase() };
}

/** Normalizes and deduplicates stored/imported hashtags. @param {*} entries - Strings or hashtag objects. @returns {object[]} Unique records. */
export function normalizeHashtags(entries) {
  if (!Array.isArray(entries)) { return []; }
  const result = []; const seen = new Set();
  for (const entry of entries) {
    let raw = entry?.value || entry?.tag || entry?.label || "";
    if (typeof entry === "string") { raw = entry; }
    const parsed = parseHashtag(raw);
    if (!parsed || seen.has(parsed.normalized)) { continue; }
    seen.add(parsed.normalized); result.push(parsed);
  }
  return result;
}

/** Filters a selection to available ids, preserving order. @param {*} entries - Selected ids/objects. @param {object[]} available - Available records. @returns {string[]} Unique valid ids. */
export function normalizeHashtagSelection(entries, available = []) {
  if (!Array.isArray(entries)) { return []; }
  const valid = new Set(available.map((entry) => entry.normalized));
  const result = []; const seen = new Set();
  for (const entry of entries) {
    let id = parseHashtag(entry?.value || entry?.tag || entry?.normalized || "")?.normalized;
    if (typeof entry === "string") { id = parseHashtag(entry)?.normalized || entry.trim().toLowerCase(); }
    if (!id || !valid.has(id) || seen.has(id)) { continue; }
    seen.add(id); result.push(id);
  }
  return result;
}

/** Merges stored and imported records. @param {object[]} base - Existing records. @param {object[]} imported - Imported records. @returns {object[]} Unique records. */
export function mergeHashtags(base, imported) { return normalizeHashtags([...(base || []), ...(imported || [])]); }

/** Resolves display casing from storage with a raw-value fallback. @param {*} value - Hashtag id/object. @param {object[]} available - Stored records. @returns {string} Display value without #. */
export function getHashtagDisplayValue(value, available = []) {
  let raw = value?.value || value?.tag || value?.normalized || value?.label || "";
  if (typeof value === "string") { raw = value; }
  const parsed = parseHashtag(raw);
  if (!parsed) { return ""; }
  return available.find((entry) => entry.normalized === parsed.normalized)?.value || parsed.value;
}

/** Formats a visible hashtag. @param {string} value - Display value. @returns {string} Text with # prefix. */
export function formatHashtag(value) { return `#${value}`; }

/** Normalizes placement settings. @param {*} value - Stored placement. @returns {string} Supported placement or first. */
export function normalizeHashtagPlacement(value) {
  if (["first", "last", "all-top", "all-bottom"].includes(value)) { return value; }
  return "first";
}

/**
 * Renames a record, merging duplicate ids and retaining selections in all workspaces.
 * @param {object} state - Hashtags plus composer/search/archive selections.
 * @param {string} currentId - Existing id to rename.
 * @param {object} parsed - Parsed replacement record.
 * @returns {object} Updated records and all selections, or unchanged state for a missing id.
 */
export function renameHashtag(state, currentId, parsed) {
  if (!parsed || !state.hashtags.some((entry) => entry.normalized === currentId)) { return state; }
  const existing = state.hashtags.find((entry) => entry.normalized === parsed.normalized);
  const merge = existing && existing.normalized !== currentId;
  let records = state.hashtags;
  if (merge) { records = records.filter((entry) => entry.normalized !== currentId); }
  const hashtags = records.map((entry) => {
    if (entry.normalized === currentId || (merge && entry.normalized === existing.normalized)) { return parsed; }
    return entry;
  });
  const next = { hashtags };
  for (const key of ["selectedHashtags", "searchSelectedHashtags", "archiveSelectedHashtags"]) {
    const selection = state[key];
    if (merge) {
      const values = selection.filter((entry) => entry !== currentId);
      if (selection.includes(currentId)) { values.push(parsed.normalized); }
      next[key] = normalizeHashtagSelection(values, hashtags);
    } else {
      next[key] = selection.map((entry) => {
        if (entry === currentId) { return parsed.normalized; }
        return entry;
      });
    }
  }
  return next;
}

/**
 * Owns shared hashtag CRUD, cloud rendering, context relocation and edit/search dialogs.
 * @param {object} elements - Existing pane, slots, controls, summaries, dialogs and chip template.
 * @param {object} options - State/context, translation, settings/archive persistence and rendering adapters.
 * @returns {object} Render/read/dialog/actions API and form/edit event handlers.
 */
export function createHashtagController(elements, options) {
  const { getState, setState, getContext, translate, persistSettings, persistArchive,
    renderSearch, invalidateArchive, setLocked, renderSegments, renderLock, setStatus, defer } = options;
  let editingId = null;

  /** Reads the current workspace selection key. @param {string} context - Workspace. @returns {string} State field. */
  function selectionKey(context) {
    if (context === "archive") { return "archiveSelectedHashtags"; }
    if (context === "search") { return "searchSelectedHashtags"; }
    return "selectedHashtags";
  }

  /** Checks whether Composer-only hashtag interaction is locked. @returns {boolean} Locked state. */
  function locked() { return getState().composerLocked && getContext() === "composer"; }

  /** Rebuilds generated Composer sections after a hashtag change. @returns {void} */
  function rebuildComposer() {
    setState({ segmentOverrides: null }); setLocked(false); renderSegments({ preserveOverrides: false });
  }

  /** Reads the composed hashtag suffix in selection order. @returns {string} Space-separated hashtags. */
  function getSelectedText() {
    const state = getState();
    return state.selectedHashtags.map((id) => formatHashtag(getHashtagDisplayValue(id, state.hashtags))).join(" ");
  }

  /** Builds the search hashtag/matching summary. @returns {string} Localized summary. */
  function getSearchSummary() {
    const state = getState();
    const tags = normalizeHashtagSelection(state.searchSelectedHashtags, state.hashtags)
      .map((id) => formatHashtag(getHashtagDisplayValue(id, state.hashtags)));
    if (tags.length === 0) { return translate("searchHashtagSummaryEmpty"); }
    let mode = translate("searchTagMatchAll");
    if (String(elements.searchMatch?.value || "").trim() === "any") { mode = translate("searchTagMatchAny"); }
    return translate("searchHashtagSummarySome", { count: options.formatCount(tags.length), tags: tags.join(", "), mode });
  }

  /** Refreshes search summary and active-button styling. @returns {void} */
  function renderSearchSummary() {
    if (elements.searchSummary) { elements.searchSummary.textContent = getSearchSummary(); }
    elements.searchButton?.classList.toggle("is-active", getState().searchSelectedHashtags.length > 0);
  }

  /** Moves the shared pane to its workspace and applies context labels/visibility. @returns {void} */
  function applyContext() {
    if (!elements.pane) { return; }
    const context = getContext();
    const archive = context === "archive"; const search = context === "search";
    let prefix = "hashtags";
    if (archive) { elements.archiveSlot?.replaceChildren(elements.pane); prefix = "archiveHashtag"; }
    else if (search) { elements.searchSlot?.replaceChildren(elements.pane); prefix = "searchHashtag"; }
    else { elements.composerColumn?.appendChild(elements.pane); }
    elements.pane.classList.toggle("is-archive-context", archive);
    options.setVisibility(elements.placementLabel, !archive && !search);
    options.setVisibility(elements.archiveScope, archive);
    options.setVisibility(elements.archiveNote, archive);
    const eyebrow = elements.pane.querySelector(".eyebrow"); const title = elements.pane.querySelector(".tips-title");
    if (eyebrow) { eyebrow.textContent = translate(`${prefix}Eyebrow`); }
    if (title) { title.textContent = translate(`${prefix}Title`); }
    renderLock();
  }

  /** Toggles one selection and follows the workspace-specific persistence path. @param {string} id - Hashtag id. @returns {void} */
  function toggle(id) {
    if (locked()) { return; }
    const context = getContext(); const state = getState(); const key = selectionKey(context);
    let selection = state[key].filter((entry) => entry !== id);
    if (!state[key].includes(id)) { selection = [...state[key], id]; }
    const normalized = normalizeHashtagSelection(selection, state.hashtags);
    setState({ [key]: normalized });
    if (context === "archive") {
      if (normalized.length > 0 && elements.archiveMode.value === "posts") { elements.archiveMode.value = "thread_roots"; }
      render(); invalidateArchive(); void persistArchive();
    } else if (context === "search") { render(); renderSearch(); void persistSettings(); }
    else { render(); void persistSettings(); rebuildComposer(); }
  }

  /** Removes a record and all workspace selections before saving. @param {string} id - Hashtag id. @returns {Promise<void>} Completion. */
  async function remove(id) {
    if (locked()) { return; }
    const state = getState(); const context = getContext(); const next = { hashtags: state.hashtags.filter((entry) => entry.normalized !== id) };
    for (const key of ["selectedHashtags", "archiveSelectedHashtags", "searchSelectedHashtags"]) {
      next[key] = state[key].filter((entry) => entry !== id);
    }
    setState(next); render();
    if (context === "composer") { rebuildComposer(); }
    await persistSettings();
    if (context === "archive") { invalidateArchive(); }
    if (getContext() === "search") { renderSearch(); }
    setStatus(translate("hashtagDeleted"));
  }

  /** Opens a record for editing and defers focus/selection. @param {object} tag - Stored hashtag. @returns {void} */
  function openEdit(tag) {
    editingId = tag.normalized; elements.editInput.value = tag.value; elements.editDialog.showModal();
    defer(() => { elements.editInput.focus(); elements.editInput.select(); }, 0);
  }

  /** Closes the editor and discards its private target. @returns {void} */
  function closeEdit() { editingId = null; elements.editDialog.close(); }

  /** Commits a rename/merge across all selections after validation. @returns {Promise<void>} Completion. */
  async function saveEdit() {
    if (!editingId || !getState().hashtags.some((entry) => entry.normalized === editingId)) { closeEdit(); return; }
    const parsed = parseHashtag(elements.editInput.value);
    if (!parsed) { setStatus(translate("hashtagInvalid"), "error"); elements.editInput.focus(); return; }
    setState(renameHashtag(getState(), editingId, parsed)); render();
    if (getContext() === "search") { renderSearch(); }
    else if (getContext() !== "archive") { rebuildComposer(); }
    await persistSettings(); setStatus(translate("hashtagUpdated")); closeEdit();
  }

  /** Builds all chip controls from the shared template and binds their actions. @returns {void} */
  function render() {
    const state = getState(); const context = getContext(); const selected = state[selectionKey(context)]; const disabled = locked();
    elements.cloud.replaceChildren();
    for (const tag of state.hashtags) {
      const fragment = elements.template?.content.cloneNode(true);
      if (!fragment) { continue; }
      const button = fragment.querySelector(".hashtag-chip");
      const edit = fragment.querySelector(".hashtag-tool:not(.danger)"); const deleteButton = fragment.querySelector(".hashtag-tool.danger");
      if (!button || !edit || !deleteButton) { continue; }
      button.className = `hashtag-chip hashtag-chip--size-${(tag.value.length % 4) + 1}`;
      button.classList.toggle("is-selected", selected.includes(tag.normalized));
      options.setText(button, formatHashtag(tag.value)); button.disabled = disabled;
      edit.disabled = disabled; deleteButton.disabled = disabled;
      edit.setAttribute("aria-label", translate("editHashtagAria", { tag: formatHashtag(tag.value) }));
      deleteButton.setAttribute("aria-label", translate("deleteHashtagAria", { tag: formatHashtag(tag.value) }));
      button.addEventListener("click", () => toggle(tag.normalized));
      edit.addEventListener("click", () => { if (!locked()) { openEdit(tag); } });
      deleteButton.addEventListener("click", () => remove(tag.normalized));
      elements.cloud.appendChild(fragment);
    }
    let prefix = "hashtag";
    if (context === "archive") { prefix = "archiveHashtag"; }
    else if (context === "search") { prefix = "searchHashtag"; }
    let key = `${prefix}SelectionNone`;
    if (selected.length > 0) { key = `${prefix}SelectionSome`; }
    elements.selectionNote.textContent = translate(key, { count: selected.length });
  }

  /** Validates and adds/selects input in the active workspace. @param {Event} event - Form submit. @returns {Promise<void>} Completion. */
  async function submit(event) {
    event.preventDefault(); if (locked()) { return; }
    const parsed = parseHashtag(elements.input.value);
    if (!parsed) { setStatus(translate("hashtagInvalid"), "error"); return; }
    const state = getState(); const context = getContext(); const key = selectionKey(context); const next = {};
    if (!state.hashtags.some((entry) => entry.normalized === parsed.normalized)) { next.hashtags = [...state.hashtags, parsed]; }
    if (!state[key].includes(parsed.normalized)) { next[key] = [...state[key], parsed.normalized]; }
    setState(next); elements.input.value = ""; render();
    if (context === "search") { renderSearch(); }
    else if (context !== "archive") { rebuildComposer(); }
    await persistSettings(); setStatus(translate("hashtagAdded"));
  }

  /** Applies placement and regenerates sections without manual overrides. @returns {Promise<void>} Completion. */
  async function placementChange() {
    if (locked()) { return; }
    setState({ hashtagPlacement: normalizeHashtagPlacement(elements.placementSelect.value) });
    rebuildComposer(); await persistSettings();
  }

  /** Opens the search dialog with the pane in its current context. @returns {void} */
  function openSearch() {
    if (!elements.searchDialog) { return; }
    applyContext(); renderSearchSummary(); elements.searchDialog.showModal();
  }

  /** Closes an open search hashtag dialog. @returns {void} */
  function closeSearch() { if (elements.searchDialog?.open) { elements.searchDialog.close(); } }

  /** Handles Enter in the edit dialog. @param {KeyboardEvent} event - Input keydown. @returns {void} */
  function editKeydown(event) { if (event.key === "Enter") { event.preventDefault(); void saveEdit(); } }

  /** Clears edit state after a native dialog close. @returns {void} */
  function editClosed() { editingId = null; }

  return { getSelectedText, getSearchSummary, renderSearchSummary, applyContext, render,
    toggle, remove, openEdit, closeEdit, saveEdit, openSearch, closeSearch,
    handlers: { submit, placementChange, editKeydown, editClosed } };
}

/** Extracts display and normalized tags using the shared hashtag parser.
 * @param {string} text - Archive post text.
 * @returns {object[]} Normalized tags retaining display case.
 */
export function extractArchiveHashtagsFromText(text) {
  const value = String(text || "");
  const regex = /(?:^|\s)(#[^\d\s]\S*)(?=\s|$)/gu;
  const matches = [];
  let match;

  while ((match = regex.exec(value))) {
    const raw = String(match[1] || "").replace(/\p{P}+$/gu, "");
    const parsed = parseHashtag(raw);
    if (!parsed) {
      continue;
    }
    matches.push({
      normalized: parsed.normalized,
      value: formatHashtag(parsed.value),
    });
  }

  return matches;
}
