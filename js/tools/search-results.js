/**
 * Creates the search-result card renderer with explicit application dependencies.
 * @param {object} dependencies - Rendering, translation and action callbacks.
 * @returns {(item: object, highlightQuery?: string) => HTMLElement|null} Search card renderer.
 */
export function createSearchResultCardRenderer(dependencies = {}) {
  const {
    nodeTemplate,
    cloneTemplateContent,
    getDisplayModel,
    favorites = [],
    translate,
    applyTranslatedTitle,
    setAvatarImage,
    getActorLabel,
    renderViewLink,
    renderEditButton,
    renderInteractionActions,
    renderMetricEntries,
    highlightSearchQuery,
    hydrateCard,
    openInThreadExplorer,
    saveAsFavorite,
    noTextLabel,
  } = dependencies;

  /**
   * Creates one result card from the shared Thread Explorer template.
   * @param {object} item - Normalized search result item.
   * @param {string} highlightQuery - Search text to highlight.
   * @returns {HTMLElement|null} Rendered search result item.
   */
  function createSearchResultElement(item = {}, highlightQuery = "") {
    const post = item?.post || null;
    const postDisplay = getDisplayModel(item);
    if (!post || !nodeTemplate) {
      return null;
    }

    const fragment = cloneTemplateContent(nodeTemplate);
    const element = fragment.querySelector(".thread-explorer-node-item");
    const node = fragment.querySelector(".thread-explorer-node");
    const card = fragment.querySelector(".thread-explorer-post-card");
    const toggle = fragment.querySelector(".thread-explorer-node-toggle");
    const actorTriggers = Array.from(fragment.querySelectorAll(".thread-explorer-actor-trigger"));
    const avatar = fragment.querySelector(".thread-explorer-avatar");
    const author = fragment.querySelector(".thread-explorer-post-author");
    const handle = fragment.querySelector(".thread-explorer-post-handle");
    const meta = fragment.querySelector(".thread-explorer-post-meta");
    const viewLink = fragment.querySelector(".thread-explorer-view-link");
    const headButtons = fragment.querySelector(".thread-explorer-post-head-buttons");
    const editButton = fragment.querySelector(".thread-explorer-edit-button");
    const actions = fragment.querySelector(".thread-explorer-post-actions");
    const text = fragment.querySelector(".thread-explorer-post-text");
    const counts = fragment.querySelector(".thread-explorer-post-counts");
    const children = fragment.querySelector(".thread-explorer-children");
    if (!element || !node || !card || !toggle || !avatar || !author || !handle || !meta || !viewLink || !headButtons || !editButton || !actions || !text || !counts || !children) {
      return null;
    }

    element.classList.add("search-result-item");
    element.dataset.uri = post.uri || "";
    node.classList.add("search-result-node");
    toggle.classList.add("is-hidden");
    toggle.disabled = true;
    children.hidden = true;
    children.replaceChildren();
    setAvatarImage(avatar, "", getActorLabel(post.author));
    author.textContent = postDisplay?.authorLabel || "";
    handle.textContent = postDisplay?.handleLabel || "";
    meta.textContent = postDisplay?.metaText || "";
    renderViewLink(post, viewLink);
    viewLink.title = translate("searchResultOpenPostInBskyButton");
    viewLink.setAttribute("aria-label", translate("searchResultOpenPostInBskyButton"));
    renderEditButton(post, editButton);
    renderInteractionActions(post, actions, headButtons, viewLink, { renderInHeader: true });
    text.textContent = postDisplay?.text || noTextLabel;
    highlightSearchQuery(text, highlightQuery);
    renderMetricEntries(post, counts, postDisplay?.metricEntries || []);

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "ghost-button thread-explorer-icon-action search-result-favorite";
    const star = document.createElement("span");
    const bookmark = document.createElement("span");
    star.setAttribute("aria-hidden", "true");
    bookmark.setAttribute("aria-hidden", "true");
    star.textContent = "★";
    bookmark.textContent = "▣";
    favoriteButton.append(star, bookmark);
    applyTranslatedTitle(favoriteButton, "threadExplorerSaveButton");
    const isSaved = favorites.some((favorite) => favorite.rootUri === post.uri);
    favoriteButton.classList.toggle("is-active", isSaved);
    let favoriteKey = "searchFavoriteSaveButton";
    if (isSaved) {
      favoriteKey = "searchFavoriteSavedButton";
    }
    favoriteButton.title = translate(favoriteKey);
    favoriteButton.setAttribute("aria-label", translate(favoriteKey));
    favoriteButton.addEventListener("click", () => {
      void saveAsFavorite(item);
    });

    const explorerButton = document.createElement("button");
    explorerButton.type = "button";
    explorerButton.className = "ghost-button thread-explorer-view-link search-result-thread-explorer-button";
    explorerButton.textContent = "🧵";
    explorerButton.title = translate("searchResultOpenInThreadExplorerButton");
    explorerButton.setAttribute("aria-label", translate("searchResultOpenInThreadExplorerButton"));
    explorerButton.addEventListener("click", () => {
      void openInThreadExplorer(item);
    });
    headButtons.prepend(favoriteButton);
    headButtons.insertBefore(explorerButton, viewLink);

    actorTriggers.forEach((trigger) => {
      applyTranslatedTitle(trigger, "searchResultOpenInThreadExplorerButton");
      trigger.addEventListener("click", () => {
        void openInThreadExplorer(item);
      });
    });

    card._threadExplorerPost = post;
    hydrateCard(card);
    if (Array.isArray(post.images) && post.images.length === 1) {
      card.classList.add("has-single-search-image");
    }
    highlightSearchQuery(card.querySelector(".thread-explorer-quote-card-text"), highlightQuery);
    return element;
  }

  return createSearchResultElement;
}
