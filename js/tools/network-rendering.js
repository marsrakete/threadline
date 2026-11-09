/**
 * Renders network filters, summary, grouped result lists and workspace presentation.
 * @param {object} elements - Existing UI controls, result container and reusable templates.
 * @param {object} options - Explicit state, translation, profile/selection, cloning and scroll adapters.
 * @returns {object} Filter, summary, result and presentation render operations.
 */
export function createNetworkWorkspaceRenderer(elements, options) {
  /** Clones a required network structure. @param {string} name - Template key. @returns {DocumentFragment} Independent content. */
  function clone(name) {
    const fragment = options.cloneTemplate(elements.templates[name]);
    if (!fragment) { throw new Error(`Missing network template: ${name}`); }
    return fragment;
  }
  /** Writes boolean accessibility state. @param {HTMLElement} element - Control. @param {string} name - Attribute. @param {boolean} value - State. @returns {void} */
  function flag(element, name, value) {
    let text = "false";
    if (value) { text = "true"; }
    element.setAttribute(name, text);
  }
  /** Updates filters, including unavailable common-mutual fallback. @returns {void} */
  function filters() {
    const state = options.getState();
    const available = Boolean(elements.commonFilter && state.commonTargetDid && state.commonTargetDid === state.selectedDid && state.commonDids.size);
    if (elements.commonFilter) { elements.commonFilter.hidden = !available; }
    let mode = state.filterMode;
    if (!available && mode === "common") { mode = "all"; options.setFilter(mode); }
    for (const button of elements.filterButtons) {
      const active = !button.hidden && button.dataset.networkFilter === mode;
      button.classList.toggle("is-active", active); flag(button, "aria-pressed", active);
    }
  }
  /** Renders loaded/mutual/visible counts. @returns {void} */
  function summary() {
    const all = options.allNodes(); const visible = options.visibleNodes();
    elements.loaded.textContent = options.formatCount(all.length);
    elements.mutuals.textContent = options.formatCount(all.filter((node) => options.relation(node) === "mutual").length);
    elements.visible.textContent = options.formatCount(visible.length);
  }
  /** Renders grouped lists while preserving sort, selection, pagination and scroll behavior. @returns {void} */
  function results() {
    const state = options.getState(); const savedScroll = elements.results.scrollTop || state.scrollTop || 0;
    elements.results.replaceChildren(); const nodes = options.allNodes();
    if (!nodes.length) {
      const empty = clone("empty"); empty.querySelector("p").textContent = options.t("networkResultsEmpty");
      elements.results.append(empty); return;
    }
    if (!state.stageMode) {
      const intro = clone("intro"); intro.querySelector("strong").textContent = options.t("networkTopConnectionsTitle");
      intro.querySelector("p").textContent = options.t("networkTopConnectionsMeta", { total: options.formatCount(nodes.length), visible: options.formatCount(options.visibleNodes().length) });
      elements.results.append(intro);
    }
    for (const [group, titleKey, noteKey] of [["mutual", "networkGroupMutuals", "networkGroupMutualsNote"],
      ["followers", "networkGroupFollowers", "networkGroupFollowersNote"], ["following", "networkGroupFollowing", "networkGroupFollowingNote"]]) {
      if (state.stageMode && state.listsVisible && group !== state.group) { continue; }
      const profiles = options.sort(nodes.filter((node) => options.relation(node) === group));
      const fragment = clone("group"); const card = fragment.querySelector("article"); const list = card.querySelector(".network-scroll-list");
      card.querySelector("strong").textContent = `${options.t(titleKey)} \u00b7 ${options.formatCount(profiles.length)}`;
      let note = noteKey;
      if (!options.ownNetwork()) { note += "Other"; }
      card.querySelector("p").textContent = options.t(note, { account: options.centerLabel() });
      if (!profiles.length) {
        const empty = clone("empty"); empty.querySelector("p").textContent = options.t("networkGroupEmpty"); list.replaceWith(empty);
      } else {
        for (const profile of profiles) {
          const item = clone("item"); const button = item.querySelector("button");
          button.querySelector("strong").textContent = profile.displayName || profile.handle || profile.did;
          button.querySelector("span").textContent = `@${profile.handle || profile.did} \u00b7 ${options.formatCount(options.score(profile))}`;
          button.addEventListener("click", () => { options.setScroll(elements.results.scrollTop || 0); options.select(profile.did); }); list.append(item);
        }
      }
      if (options.pending(group)) {
        const more = clone("more"); const button = more.querySelector("button");
        button.textContent = options.t("networkShowMoreButton"); button.disabled = state.loading;
        button.addEventListener("click", async () => { await options.loadMore(group); });
        more.querySelector("p").textContent = options.t("networkShowMoreNote"); card.append(more);
      }
      elements.results.append(fragment);
    }
    options.setScroll(savedScroll); options.restoreScroll();
  }
  /** Updates stage classes, panel visibility, icons and translated control states. @returns {void} */
  function presentation() {
    const state = options.getState(); const focus = Boolean(state.selectedDid) && (!state.stageMode || state.focusVisible);
    elements.body.classList.toggle("network-stage-mode", state.stageMode);
    if (elements.actor && !elements.actor.matches(":focus")) { elements.actor.value = String(elements.actor.value || "").trim() || state.viewer?.handle || ""; }
    elements.canvas?.classList.toggle("has-focus", focus); elements.canvas?.classList.toggle("has-focus-collapsed", focus && state.collapsed);
    elements.canvas?.classList.toggle("is-squircle", state.shape === "squircle"); elements.stageCard?.classList.toggle("is-stage-mode", state.stageMode);
    elements.insightsCard?.classList.toggle("is-stage-mode-visible", state.stageMode && state.listsVisible);
    elements.insightsCard?.toggleAttribute("hidden", state.stageMode && !state.listsVisible);
    elements.focusPanel?.classList.toggle("is-collapsed", state.collapsed); elements.focusPanel?.toggleAttribute("hidden", state.stageMode && !state.focusVisible);
    if (elements.shape) {
      const squircle = state.shape === "squircle"; elements.shape.classList.toggle("is-active", squircle); flag(elements.shape, "aria-pressed", squircle);
      let key = "networkShapeEnableTitle"; if (squircle) { key = "networkShapeDisableTitle"; } elements.shape.title = options.t(key);
    }
    if (elements.collapse) {
      const icon = clone("icon"); let path = "M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"; let key = "networkFocusCollapse";
      if (state.collapsed) { path = "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"; key = "networkFocusExpand"; }
      icon.querySelector("path").setAttribute("d", path); elements.collapse.replaceChildren(icon);
      flag(elements.collapse, "aria-expanded", !state.collapsed); elements.collapse.setAttribute("aria-label", options.t(key)); elements.collapse.disabled = !state.selectedDid;
    }
    if (elements.enter) { elements.enter.hidden = state.stageMode; flag(elements.enter, "aria-pressed", state.stageMode); }
    if (elements.exit) { elements.exit.hidden = !state.stageMode; }
    for (const [button, active, showKey, hideKey] of [[elements.focus, state.focusVisible, "networkStageModeShowFocus", "networkStageModeHideFocus"],
      [elements.lists, state.listsVisible, "networkStageModeShowLists", "networkStageModeHideLists"]]) {
      if (!button) { continue; }
      button.hidden = !state.stageMode; button.classList.toggle("is-active", active); flag(button, "aria-pressed", active);
      let key = showKey; if (active) { key = hideKey; } button.textContent = options.t(key);
    }
    if (elements.focus) { elements.focus.disabled = !state.selectedDid; }
    if (elements.sortField) { elements.sortField.value = state.sortField; }
    if (elements.sortDirection) { elements.sortDirection.value = state.sortDirection; }
    if (elements.groupToggles) { elements.groupToggles.hidden = !(state.stageMode && state.listsVisible); }
    for (const button of elements.groupButtons) { const active = button.dataset.networkInsightsGroup === state.group; button.classList.toggle("is-active", active); flag(button, "aria-pressed", active); }
  }
  return { filters, summary, results, presentation };
}
