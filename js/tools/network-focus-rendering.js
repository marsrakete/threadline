/** Formats a network relationship/activity date using the current locale. @param {unknown} value - Date-like value. @param {string} locale - Locale. @returns {string} Medium date or empty string for invalid dates. */
export function formatNetworkFocusDate(value, locale) {
  const timestamp = Date.parse(String(value || "").trim());
  if (!Number.isFinite(timestamp)) { return ""; }
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(timestamp));
}

/** Normalizes one activity window without inventing missing samples. @param {object|null} stats - Activity data. @param {number|string} days - Window key. @returns {object|null} Post/like counts or null. */
export function getNetworkFocusActivityWindow(stats, days) {
  if (!stats?.windows || typeof stats.windows !== "object") { return null; }
  const entry = stats.windows[days] ?? stats.windows[String(days)];
  if (!entry || typeof entry !== "object") { return null; }
  return { postsCount: Number(entry.postsCount) || 0, likesReceivedCount: Number(entry.likesReceivedCount) || 0 };
}

/**
 * Builds the complete network focus card display model without DOM access.
 * @param {object} state - Selection, profile maps, viewer, account and loading/common state.
 * @param {object} options - Profile lookup/avatar, score/relation, translation/count and locale adapters.
 * @returns {object} Empty-state key or profile/header/statistics/content sections.
 */
export function buildNetworkFocusCardModel(state, options) {
  let emptyKey = "networkEmpty";
  if (state.nodes.size) { emptyKey = "networkFocusEmpty"; }
  if (!state.selectedDid) { return { emptyKey }; }
  const selected = options.known(state.selectedDid); const node = state.nodes.get(state.selectedDid) || null;
  const detail = state.details.get(state.selectedDid) || null;
  const active = detail?.profile || selected || node || state.viewer || null;
  if (!active) { return { emptyKey }; }
  const own = options.ownNetwork(); const sections = [];
  let avatar = active.avatar || ""; let relation = options.t("networkRelationViewer"); let score = "\u2014";
  if (active.did) { avatar = options.avatar(active); }
  if (node) { relation = options.relation(node); score = options.formatCount(options.score(node)); }
  const model = { profile: active, title: active.displayName || active.handle || state.authAccount || options.t("networkViewerFallback"),
    handle: `@${active.handle || state.authAccount || "account"}`, avatar, relation, sections,
    stats: [["networkStatFollowers", options.formatCount(active.followersCount)], ["networkStatFollowing", options.formatCount(active.followsCount)],
      ["networkStatPosts", options.formatCount(active.postsCount)], ["networkStatScore", score]],
    loadDisabled: state.loading || active.did === state.accountDid,
    commonDisabled: state.loading || state.commonLoadingDid === active.did || active.did === state.accountDid,
    commonActive: state.commonTargetDid === active.did };
  if (node) {
    const breakdown = options.breakdown(node); let key = "networkScoreExplain";
    if (!own) { key = "networkScoreExplainOther"; }
    sections.push({ kind: "line", text: options.t(key, { score: options.formatCount(breakdown.total), relation: options.relation(node),
      account: options.centerLabel(), relationScore: options.formatCount(breakdown.relationScore), followersScore: options.formatCount(breakdown.followersScore), postsScore: options.formatCount(breakdown.postsScore) }) });
  }
  if (active.did === state.commonTargetDid) {
    let text = options.t("networkCommonMutualsZero");
    if (state.commonDids.size) { text = options.t("networkCommonMutualsCount", { count: options.formatCount(state.commonDids.size) }); }
    sections.push({ kind: "group", lines: [{ text, strong: true }, { text: options.t("networkCommonMutualsWhereShown") }, { text: options.t("networkCommonMutualsSampleNote") }] });
  } else if (state.commonLoadingDid === active.did) { sections.push({ kind: "line", text: options.t("networkCommonMutualsLoading") }); }
  const followed = formatNetworkFocusDate(detail?.relationshipDates?.youFollowSince, options.locale);
  const follower = formatNetworkFocusDate(detail?.relationshipDates?.followsYouSince, options.locale);
  if (own && (followed || follower)) {
    const lines = [];
    if (followed && follower) {
      const date = new Intl.DateTimeFormat(options.locale, { dateStyle: "medium" }).format(new Date(Math.max(
        Date.parse(detail.relationshipDates.youFollowSince || 0), Date.parse(detail.relationshipDates.followsYouSince || 0))));
      lines.push({ text: options.t("networkMutualSince", { date }) });
    }
    if (followed) { lines.push({ text: options.t("networkYouFollowSince", { date: followed }) }); }
    if (follower) { lines.push({ text: options.t("networkFollowsYouSince", { date: follower }) }); }
    sections.push({ kind: "group", lines });
  }
  if (detail?.activityStats) {
    const activity = detail.activityStats;
    const window14 = getNetworkFocusActivityWindow(activity, 14); const window60 = getNetworkFocusActivityWindow(activity, 60);
    const latest = formatNetworkFocusDate(activity.latestPostAt, options.locale);
    if (window14 || window60 || latest) {
      const lines = [{ text: options.t("networkActivityTitle"), strong: true }];
      if (latest) { lines.push({ text: options.t("networkLatestPost", { date: latest }) }); }
      for (const [days, window] of [["14", window14], ["60", window60]]) {
        if (!window) { continue; }
        lines.push({ text: options.t("networkRecentPostsWindow", { days, count: options.formatCount(window.postsCount) }) });
        lines.push({ text: options.t("networkRecentLikesWindow", { days, count: options.formatCount(window.likesReceivedCount) }) });
      }
      lines.push({ text: options.t("networkActivitySampleNote", { count: options.formatCount(activity.samplePosts || 0) }) });
      sections.push({ kind: "group", lines });
    }
  }
  if (own && detail?.likeStats) {
    const likes = detail.likeStats;
    sections.push({ kind: "group", lines: [
      { text: options.t("networkMutualLikesTotal", { count: options.formatCount(likes.mutualLikesCount || 0) }) },
      { text: options.t("networkYouLikePosts", { count: options.formatCount(likes.youLikeCount || 0) }) },
      { text: options.t("networkTheyLikeYourPosts", { count: options.formatCount(likes.likesYouCount || 0) }) },
      { text: options.t("networkLikesSampleNote", { own: options.formatCount(likes.ownPostsSampled || 0), actor: options.formatCount(likes.actorPostsSampled || 0), total: options.formatCount(likes.totalSample || 0) }) },
    ] });
  }
  if (active.description) { sections.push({ kind: "description", text: active.description }); }
  if (active.pronouns) { sections.push({ kind: "line", text: options.t("profilePronounsValue", { pronouns: active.pronouns }) }); }
  const links = options.profileLinks?.(active) || [];
  if (links.length) { sections.push({ kind: "links", links }); }
  if (state.focusLoadingDid && node?.did === state.focusLoadingDid) { sections.push({ kind: "note", text: options.t("networkFocusLoading") }); }
  if (detail && node) { sections.push({ kind: "line", text: options.t("networkStagePreviewMeta", {
    followers: options.formatCount(detail.followersPreview?.length || 0), following: options.formatCount(detail.followsPreview?.length || 0) }) }); }
  return model;
}

/** Renders complete focus cards through reusable templates. @param {object} elements - Card and required template map. @param {object} options - Model/state, clone/avatar, translation and action adapters. @returns {object} Render operation. */
export function createNetworkFocusCardRenderer(elements, options) {
  /** Clones a required card structure. @param {string} name - Template key. @returns {DocumentFragment} Cloned content. */
  function clone(name) {
    const fragment = options.cloneTemplate(elements.templates[name]);
    if (!fragment) { throw new Error(`Missing network focus template: ${name}`); }
    return fragment;
  }
  /** Clones a plain-text explanatory or status line. @param {object} item - Text and optional strong flag. @param {boolean} note - Use status-note styling. @returns {DocumentFragment} Line. */
  function line(item, note = false) {
    let key = "line"; if (note) { key = "empty"; }
    const fragment = clone(key); const paragraph = fragment.querySelector("p"); paragraph.textContent = item.text;
    if (item.strong) { paragraph.classList.add("network-card-explainer-strong"); }
    return fragment;
  }
  /** Renders identity, actions, statistics and optional metadata in original order. @returns {void} */
  function render() {
    const model = options.model(options.getState());
    if (model.emptyKey) { elements.card.replaceChildren(line({ text: options.t(model.emptyKey) }, true)); return; }
    const fragment = clone("shell"); const summary = fragment.querySelector(".network-focus-summary"); const actions = summary.querySelector(".network-focus-actions");
    summary.querySelector(".network-avatar-copy strong").textContent = model.title;
    summary.querySelector(".network-handle").textContent = model.handle;
    summary.querySelector(".network-relation-pill").textContent = model.relation;
    options.setAvatar(summary.querySelector("img"), model.avatar, model.profile.displayName || model.profile.handle || "avatar");
    if (!model.profile.did) { actions.replaceChildren(); }
    else {
      const load = actions.querySelector('[data-network-focus-action="load"]'); const common = actions.querySelector('[data-network-focus-action="common"]');
      load.textContent = options.t("networkFocusLoadActorButton"); load.disabled = model.loadDisabled;
      load.addEventListener("click", () => { options.setActorInput(model.profile.handle || model.profile.did || "");
        void options.load({ actor: model.profile.did || model.profile.handle || "", append: false, silentErrors: false }); });
      let key = "networkCommonMutualsShowButton"; if (model.commonActive) { key = "networkCommonMutualsHideButton"; }
      common.textContent = options.t(key); common.disabled = model.commonDisabled;
      common.addEventListener("click", () => {
        if (options.getState().commonTargetDid === model.profile.did) { options.clearCommon(); options.renderWorkspace(); return; }
        void options.loadCommon(model.profile.did);
      });
    }
    const stats = summary.querySelector(".network-stat-grid");
    for (const [key, value] of model.stats) {
      const stat = clone("stat"); stat.querySelector("span").textContent = options.t(key); stat.querySelector("strong").textContent = value; stats.append(stat);
    }
    for (const section of model.sections) {
      if (section.kind === "group") {
        const group = clone("meta"); const container = group.querySelector("div");
        for (const item of section.lines) { container.append(line(item)); } summary.append(group);
      } else if (section.kind === "links") {
        const group = clone("meta");
        const container = group.querySelector("div");
        container.classList.add("profile-links");
        for (const link of section.links) {
          const anchor = container.ownerDocument.createElement("a");
          anchor.href = link.url;
          anchor.textContent = link.title || link.url;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          container.append(anchor);
        }
        summary.append(group);
      } else if (section.kind === "description") {
        const description = clone("description"); description.querySelector("summary").textContent = options.t("networkDescriptionButton");
        description.querySelector("p").textContent = section.text; summary.append(description);
      } else { summary.append(line(section, section.kind === "note")); }
    }
    elements.card.replaceChildren(fragment);
  }
  return { render };
}
