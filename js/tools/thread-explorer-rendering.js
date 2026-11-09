/**
 * Returns the visible label for a Thread Explorer actor.
 * @param {object} actor - Normalized actor data.
 * @param {string} fallback - Fallback label.
 * @param {(actor: object, fallback: string) => string} labelBuilder - Shared label builder.
 * @returns {string} Actor label.
 */
export function getThreadExplorerActorLabel(actor = {}, fallback = "Unknown author", labelBuilder = () => fallback) {
  return labelBuilder(actor, fallback);
}

/**
 * Returns a compact preview for a Thread Explorer post.
 * @param {object} post - Normalized post data.
 * @param {string} fallback - Fallback text.
 * @param {number} maxLength - Maximum preview length.
 * @param {(post: object, fallback: string, maxLength: number) => string} previewBuilder - Shared preview builder.
 * @returns {string} Preview text.
 */
export function getThreadExplorerPreviewText(post = {}, fallback = "No text", maxLength = 220, previewBuilder = () => fallback) {
  return previewBuilder(post, fallback, maxLength);
}

/**
 * Formats a Thread Explorer timestamp.
 * @param {string} value - ISO timestamp.
 * @param {string} locale - Active locale.
 * @param {(value: string, locale: string) => string} dateBuilder - Shared date formatter.
 * @returns {string} Localized date/time text.
 */
export function formatThreadExplorerDate(value = "", locale = "en", dateBuilder = () => "") {
  return dateBuilder(value, locale);
}

/**
 * Counts all visible posts in a Thread Explorer tree.
 * @param {object|null} node - Thread tree node.
 * @returns {number} Number of visible posts.
 */
export function countThreadExplorerPosts(node = null) {
  if (!node) {
    return 0;
  }
  let count = 0;
  if (node.post?.isDeletedThreadAnchor !== true) {
    count = 1;
  }
  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      count += countThreadExplorerPosts(reply);
    });
  }
  return count;
}

/**
 * Renders reaction actors into a Thread Explorer dialog list.
 * @param {Array<object>} actors - Normalized actor entries.
 * @param {object} options - DOM nodes, translation and avatar callbacks.
 * @returns {void}
 */
export function renderThreadExplorerReactionActors(actors = [], options = {}) {
  const list = options.list;
  const status = options.status;
  const template = options.template;
  const translate = options.translate;
  const formatCount = options.formatCount;
  const cloneTemplate = options.cloneTemplate;
  const setAvatar = options.setAvatar;
  list.replaceChildren();
  if (!Array.isArray(actors) || actors.length === 0) {
    status.textContent = translate("threadExplorerReactionsEmpty");
    return;
  }
  status.textContent = translate("threadExplorerReactionsLoaded", { count: formatCount(actors.length) });
  actors.forEach((actor) => {
    const fragment = cloneTemplate(template);
    const avatar = fragment.querySelector(".thread-explorer-avatar");
    const name = fragment.querySelector(".thread-explorer-actor-name");
    const handle = fragment.querySelector(".thread-explorer-actor-handle");
    setAvatar(avatar, actor.avatar, actor.displayName || actor.handle || actor.did || "account");
    name.textContent = actor.displayName || actor.handle || actor.did || translate("threadExplorerUnknownAuthor");
    if (actor.handle) {
      handle.textContent = `@${actor.handle}`;
    } else {
      handle.textContent = actor.did || "";
    }
    list.appendChild(fragment);
  });
}

/**
 * Loads and opens the Thread Explorer reactions dialog.
 * @param {string} type - Reaction type: Likes, Reposts, or Quotes.
 * @param {string} uri - AT URI of the post.
 * @param {string} cid - Optional post CID.
 * @param {object} options - Dialog, request, rendering and translation callbacks.
 * @returns {Promise<void>} Resolves after loading finishes.
 */
export async function loadThreadExplorerReactionsDialog(type, uri, cid, options = {}) {
  const normalizedType = String(type || "").trim();
  const normalizedUri = String(uri || "").trim();
  if (!normalizedType || !normalizedUri) {
    return;
  }
  options.setLoading(true);
  options.title.textContent = options.translate(`threadExplorer${normalizedType}Title`);
  options.status.textContent = options.translate("threadExplorerReactionsLoading");
  options.list.replaceChildren();
  options.dialog.showModal();
  try {
    const result = await options.request("LOAD_THREAD_EXPLORER_REACTIONS", {
      type: normalizedType.toLowerCase(),
      uri: normalizedUri,
      cid: String(cid || "").trim(),
      limit: 100,
    }, { timeoutMs: 120000 });
    renderThreadExplorerReactionActors(result?.actors || [], options);
  } catch (error) {
    options.status.textContent = error.message || options.translate("threadExplorerReactionsFailed");
  } finally {
    options.setLoading(false);
  }
}

/**
 * Applies toolbar availability, account fields, mode labels and accessibility state.
 * @param {object} elements - Existing workspace controls indexed by their page names.
 * @param {object} state - Auth, loading, account, tree, layout and gallery-independent display state.
 * @param {object} actions - Translation and account-note/feed-source rendering adapters.
 * @returns {void}
 */
export function renderThreadExplorerControls(elements, state, actions) {
  const hasAuth = Boolean(state.authenticated);
  const isForeignAccountMode = state.foreignAccount;
  const isForeignActorFocusMode = state.actorFocus;
  elements.threadExplorerUrlButton.disabled = !hasAuth || state.loadingThread;
  elements.threadExplorerSearchesButton.disabled = !hasAuth;
  if (elements.archiveSavedSearchesButton) {
    elements.archiveSavedSearchesButton.disabled = !hasAuth;
  }
  elements.threadExplorerRefreshButton.disabled = !hasAuth || state.loadingFeed;
  if (elements.threadExplorerAccountInput) {
    elements.threadExplorerAccountInput.disabled = !hasAuth || state.loadingFeed;
    if (!elements.threadExplorerAccountInput.matches(":focus")) {
      elements.threadExplorerAccountInput.value = state.accountActor;
    }
  }
  if (elements.threadExplorerUseOwnAccountButton) {
    elements.threadExplorerUseOwnAccountButton.disabled = !hasAuth || state.loadingFeed;
  }
  if (elements.threadExplorerSourceField) {
    elements.threadExplorerSourceField.hidden = isForeignActorFocusMode;
  }
  if (elements.threadExplorerAccountField) {
    elements.threadExplorerAccountField.hidden = isForeignActorFocusMode;
  }
  if (elements.threadExplorerAccountModeField) {
    elements.threadExplorerAccountModeField.hidden = !isForeignAccountMode || isForeignActorFocusMode;
  }
  if (elements.threadExplorerAccountModeSelect) {
    elements.threadExplorerAccountModeSelect.value = state.accountMode;
    elements.threadExplorerAccountModeSelect.disabled = !hasAuth || state.loadingFeed || !isForeignAccountMode;
  }
  if (elements.threadExplorerFeedPickerField) {
    elements.threadExplorerFeedPickerField.hidden = isForeignAccountMode || isForeignActorFocusMode;
  }
  if (elements.threadExplorerFeedStatus) {
    elements.threadExplorerFeedStatus.hidden = isForeignActorFocusMode;
  }
  if (elements.threadExplorerFeedList) {
    elements.threadExplorerFeedList.hidden = isForeignActorFocusMode;
  }
  elements.threadExplorerRootButton.disabled = !state.hasTree;
  elements.threadExplorerReloadThreadButton.disabled = !hasAuth || !state.selectedUri || state.loadingThread;
  elements.threadExplorerSnapshotPngButton.disabled = !state.hasTree || state.loadingThread;
  elements.threadExplorerSaveButton.disabled = !state.hasTree;
  elements.threadExplorerFavoritesButton.disabled = !hasAuth;
  elements.threadExplorerZoomOutButton.disabled = !state.hasTree;
  elements.threadExplorerZoomResetButton.disabled = !state.hasTree;
  elements.threadExplorerZoomInButton.disabled = !state.hasTree;
  elements.threadExplorerZoomResetButton.title = actions.translate("threadExplorerFitThreadButton");
  elements.threadExplorerZoomResetButton.setAttribute("aria-label", actions.translate("threadExplorerFitThreadButton"));
  elements.threadExplorerViewModeButton.disabled = !state.hasTree;
  elements.threadExplorerOrientationButton.disabled = !hasAuth || state.clusterMode;
  elements.threadExplorerFullscreenButton.disabled = !hasAuth;
  elements.threadExplorerCollapseButton.disabled = !state.hasTree || state.clusterMode;
  elements.threadExplorerExpandButton.disabled = !state.hasTree || state.clusterMode;
  if (elements.threadExplorerFullscreenCloseButton) {
    elements.threadExplorerFullscreenCloseButton.disabled = !state.fullscreen;
    elements.threadExplorerFullscreenCloseButton.hidden = state.fullscreen !== true;
    elements.threadExplorerFullscreenCloseButton.title = actions.translate("threadExplorerExitFullscreenButton");
    elements.threadExplorerFullscreenCloseButton.setAttribute("aria-label", actions.translate("threadExplorerExitFullscreenButton"));
  }
  elements.threadExplorerZoomResetButton.textContent = `${Math.round(state.zoom * 100)}%`;
  if (state.clusterMode) {
    elements.threadExplorerViewModeButton.textContent = actions.translate("threadExplorerTreeViewButton");
    elements.threadExplorerViewModeButton.setAttribute("aria-pressed", "true");
  } else {
    elements.threadExplorerViewModeButton.textContent = actions.translate("threadExplorerReplyClusterButton");
    elements.threadExplorerViewModeButton.setAttribute("aria-pressed", "false");
  }
  let saveButtonLabel = actions.translate("threadExplorerSaveButton");
  let saveButtonActive = false;
  if (state.saved) {
    saveButtonLabel = actions.translate("threadExplorerSavedButton");
    saveButtonActive = true;
  }
  elements.threadExplorerSaveButton.title = saveButtonLabel;
  elements.threadExplorerSaveButton.setAttribute("aria-label", saveButtonLabel);
  elements.threadExplorerSaveButton.classList.toggle("is-active", saveButtonActive);
  if (state.horizontal) {
    elements.threadExplorerOrientationButton.textContent = actions.translate("threadExplorerVerticalButton");
    elements.threadExplorerOrientationButton.setAttribute("aria-pressed", "true");
  } else {
    elements.threadExplorerOrientationButton.textContent = actions.translate("threadExplorerHorizontalButton");
    elements.threadExplorerOrientationButton.setAttribute("aria-pressed", "false");
  }
  if (state.fullscreen === true) {
    elements.threadExplorerFullscreenButton.textContent = actions.translate("threadExplorerExitFullscreenButton");
    elements.threadExplorerFullscreenButton.setAttribute("aria-pressed", "true");
    elements.threadExplorerFullscreenButton.setAttribute("aria-label", actions.translate("threadExplorerExitFullscreenButton"));
  } else {
    elements.threadExplorerFullscreenButton.textContent = actions.translate("threadExplorerFullscreenButton");
    elements.threadExplorerFullscreenButton.setAttribute("aria-pressed", "false");
    elements.threadExplorerFullscreenButton.setAttribute("aria-label", actions.translate("threadExplorerFullscreenButton"));
  }

  if (elements.threadExplorerSourceSelect) {
    if (["mutuals", "follows", "followers"].includes(state.source)) {
      elements.threadExplorerSourceSelect.value = state.source;
    } else {
      elements.threadExplorerSourceSelect.value = "follows";
    }
    elements.threadExplorerSourceSelect.disabled = !hasAuth || state.loadingFeed || isForeignAccountMode;
  }
  actions.renderAccountNote();
  actions.renderFeedSources();
}

/**
 * Renders pinned-feed options with the existing option template and literal labels.
 * @param {object} options - Select/template, feeds, source builder, active value and disabled state.
 * @returns {void}
 */
export function renderThreadExplorerFeedSources(options) {
  if (!options.select) {
    return;
  }
  const placeholder = options.cloneTemplate(options.template).querySelector("option");
  placeholder.value = "";
  placeholder.textContent = options.placeholder;
  options.select.replaceChildren(placeholder);
  options.feeds.forEach((feed) => {
    const source = options.buildSource(feed.uri);
    if (!source) {
      return;
    }
    const option = options.cloneTemplate(options.template).querySelector("option");
    option.value = source;
    option.textContent = feed.displayName || feed.uri;
    options.select.appendChild(option);
  });
  options.select.value = options.activeSource;
  options.select.disabled = options.disabled;
}

/**
 * Renders local favorites using the existing item template, literal text and action adapters.
 * @param {object} options - List/status/template, favorites, format/translation and event adapters.
 * @returns {void}
 */
export function renderThreadExplorerFavorites(options) {
  options.list.replaceChildren();
  if (!options.favorites.length) {
    options.status.textContent = options.translate("threadExplorerFavoritesEmpty");
    return;
  }

  options.status.textContent = options.translate("threadExplorerFavoritesLoaded", {
    count: options.formatCount(options.favorites.length),
  });
  options.favorites.forEach((favorite) => {
    const fragment = options.cloneTemplate(options.template);
    const item = fragment.querySelector(".thread-explorer-favorite-item");
    const loadButton = fragment.querySelector(".thread-explorer-favorite-load");
    const removeButton = fragment.querySelector(".thread-explorer-favorite-remove");
    const title = fragment.querySelector(".thread-explorer-favorite-title");
    const meta = fragment.querySelector(".thread-explorer-favorite-meta");
    const text = fragment.querySelector(".thread-explorer-favorite-text");

    item.dataset.uri = favorite.rootUri;
    loadButton.dataset.uri = favorite.rootUri;
    removeButton.dataset.uri = favorite.rootUri;
    options.applyTranslatedTitle(removeButton, "threadExplorerFavoriteRemoveButton");
    title.textContent = favorite.authorName || favorite.authorHandle || options.translate("threadExplorerUnknownAuthor");
    meta.textContent = options.formatDate(favorite.createdAt || favorite.savedAt);
    text.textContent = favorite.text || options.translate("threadExplorerNoText");
    loadButton.addEventListener("click", options.onLoad);
    removeButton.addEventListener("click", options.onRemove);
    options.list.appendChild(fragment);
  });
}

/**
 * Renders already-loaded replies with the existing actor template and accessible selection.
 * @param {object|null} node - Tree node whose direct replies should be shown.
 * @param {object} options - List/title/status/template, formatting/avatar and selection adapters.
 * @returns {void}
 */
export function renderThreadExplorerReplies(node, options) {
  options.list.replaceChildren();
  let replies = [];
  if (Array.isArray(node?.replies)) {
    replies = node.replies;
  }
  const expectedCount = Number(node?.post?.replyCount) || 0;
  options.title.textContent = options.translate("threadExplorerRepliesTitle");

  if (!replies.length) {
    options.status.textContent = options.translate("threadExplorerRepliesEmpty");
    return;
  }

  options.status.textContent = options.translate("threadExplorerRepliesLoaded", {
    loaded: options.formatCount(replies.length),
    total: options.formatCount(expectedCount),
  });

  replies.forEach((reply) => {
    const post = reply.post || {};
    const actor = post.author || {};
    const fragment = options.cloneTemplate(options.template);
    const item = fragment.querySelector(".thread-explorer-actor-item");
    const avatar = fragment.querySelector(".thread-explorer-avatar");
    const name = fragment.querySelector(".thread-explorer-actor-name");
    const handle = fragment.querySelector(".thread-explorer-actor-handle");

    item.dataset.uri = post.uri || "";
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    options.setAvatar(avatar, actor.avatar, options.getActorLabel(actor));
    name.textContent = options.getActorLabel(actor);
    if (actor.handle) {
      handle.textContent = `@${actor.handle}`;
    } else {
      handle.textContent = actor.did || "";
    }
    item.addEventListener("click", () => {
      if (!post.uri) {
        return;
      }
      options.selectReply(post.uri);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      item.click();
    });
    options.list.appendChild(fragment);
  });
}

/**
 * Configures shared saved-search dialog fields for the calling workspace.
 * @param {string} context - Search, archive or explorer context.
 * @param {object} options - Optional note/URL/actions fields, input and translation adapter.
 * @returns {string} Normalized context for the page's load-action routing.
 */
export function configureSavedSearchesDialog(context, options) {
  let normalizedContext = "threadExplorer";
  if (context === "archive" || context === "search") {
    normalizedContext = context;
  }
  if (options.note) {
    if (normalizedContext === "search") {
      options.note.textContent = options.translate("savedSearchesSearchNote");
    } else {
      options.note.textContent = options.translate("savedSearchesNote");
    }
  }
  if (options.urlField) {
    options.urlField.hidden = normalizedContext === "search";
  }
  if (options.actions) {
    options.actions.hidden = normalizedContext === "search";
  }
  options.input.value = "";
  return normalizedContext;
}

/**
 * Renders saved-search entries with the shared HTML template and explicit content/actions.
 * @param {object} options - List/status/template, searches, formatting, translation and event adapters.
 * @returns {void}
 */
export function renderSavedSearches(options) {
  options.list.replaceChildren();
  if (!options.searches.length) {
    options.status.textContent = options.translate("savedSearchesEmpty");
    return;
  }

  options.status.textContent = options.translate("savedSearchesLoaded", {
    count: options.formatCount(options.searches.length),
  });
  options.searches.forEach((search) => {
    const fragment = options.cloneTemplate(options.template);
    const item = fragment.querySelector(".saved-search-item");
    const loadButton = fragment.querySelector(".saved-search-load");
    const removeButton = fragment.querySelector(".saved-search-remove");
    const title = fragment.querySelector(".saved-search-title");
    const meta = fragment.querySelector(".saved-search-meta");
    const url = fragment.querySelector(".saved-search-url");

    item.dataset.id = search.id;
    loadButton.dataset.id = search.id;
    removeButton.dataset.id = search.id;
    options.applyTranslatedTitle(removeButton, "savedSearchRemoveButton");
    title.textContent = search.label || options.buildLabel(search);
    meta.textContent = options.buildMeta(search);
    url.textContent = search.sourceUrl;
    loadButton.addEventListener("click", options.onLoad);
    removeButton.addEventListener("click", options.onRemove);
    options.list.appendChild(fragment);
  });
}

/** Refreshes existing card counts and actions. @param {Element|null} card - Card node. @param {object} options - searchCounts, counts and interactions renderers. @returns {void} Updated card. */
export function refreshLivePostCard(card = null, options) {
  if (!card) {
    return;
  }

  const post = card._threadExplorerPost || null;
  const counts = card.querySelector(".thread-explorer-post-counts");
  const actions = card.querySelector(".thread-explorer-post-actions");
  const headButtons = card.querySelector(".thread-explorer-post-head-buttons");
  const viewLink = card.querySelector(".thread-explorer-view-link");
  if (!post || !counts || !actions || !headButtons || !viewLink) {
    return;
  }

  const inSearchResult = Boolean(card.closest(".search-result-item"));
  if (inSearchResult) {
    options.searchCounts(post, counts);
  } else {
    options.counts(post, counts);
  }
  options.interactions(post, actions, headButtons, viewLink, {
    renderInHeader: inSearchResult,
  });
}

/** Refreshes every rendered card for a URI. @param {string} postUri - Target URI. @param {object} options - document, optional selector escape and card renderers. @returns {void} Updated matching cards. */
export function refreshLivePostCards(postUri = "", options) {
  const normalizedUri = String(postUri || "").trim();
  if (!normalizedUri) {
    return;
  }

  let selectorValue = normalizedUri.replace(/["\\]/g, "\\$&");
  if (typeof options.escape === "function") {
    selectorValue = options.escape(normalizedUri);
  }
  options.document.querySelectorAll(`.thread-explorer-node-item[data-uri="${selectorValue}"] .thread-explorer-post-card`).forEach((card) => {
    refreshLivePostCard(card, options);
  });
}

/** Creates one translated post action. @param {string} translationKey - Text key. @param {object} options - Existing action presentation/click options. @param {object} adapters - document and translate adapters. @returns {HTMLButtonElement} Action button. */
export function createLivePostActionButton(translationKey, options = {}, adapters) {
  const { document, translate: t } = adapters;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost-button thread-explorer-inline-action";
  button.textContent = t(translationKey);
  if (options.active === true) {
    button.classList.add("is-active");
  }
  if (options.disabled === true) {
    button.disabled = true;
  }
  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }
  return button;
}
