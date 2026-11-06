/**
 * Hydrates one rendered Thread Explorer card through injected render callbacks.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object|null} post - Normalized post represented by the card.
 * @param {object} options - Rendering callbacks and display-model factory.
 * @returns {boolean} True when hydration completed or was intentionally skipped.
 */
export function hydrateThreadExplorerCard(card = null, post = null, options = {}) {
  if (!card || card.dataset.hydrated === "true") {
    return false;
  }
  if (!post || post.isDeletedThreadAnchor === true) {
    card.dataset.hydrated = "true";
    return true;
  }

  const getDisplayModel = options.getDisplayModel;
  const postDisplay = typeof getDisplayModel === "function" ? getDisplayModel(post) : null;
  if (typeof options.renderAvatar === "function") {
    options.renderAvatar(card, post);
  }
  if (typeof options.renderMedia === "function") {
    options.renderMedia(card, post);
  }
  if (typeof options.renderEmbeds === "function") {
    options.renderEmbeds(card, post, postDisplay);
  }
  card.dataset.hydrated = "true";
  if (typeof options.finalize === "function") {
    options.finalize(card);
  }
  return true;
}

/**
 * Coordinates lazy card hydration and owns the observer for one explorer workspace.
 * @param {object} options - Observer factory, root/stage, forced mode, selected URI and hydrate adapters.
 * @returns {object} Prepare, forced-visible hydration and observer-reset operations.
 */
export function createThreadExplorerLazyHydrationController(options) {
  let observer = null;

  /** Disconnects the observer and invalidates any callbacks already queued by it.
   * @returns {void}
   */
  function reset() {
    if (observer) {
      observer.disconnect();
    }
    observer = null;
  }

  /** Lazily creates an observer when the browser supports it and forced mode is off.
   * @returns {IntersectionObserver|null} Active observer or null for immediate hydration.
   */
  function getObserver() {
    if (options.isForced() || typeof options.createObserver !== "function") {
      return null;
    }
    if (observer) {
      return observer;
    }
    const currentObserver = options.createObserver((entries) => {
      if (observer !== currentObserver) {
        return;
      }
      entries.forEach((entry) => {
        if (!entry.isIntersecting || observer !== currentObserver) {
          return;
        }
        options.hydrate(entry.target);
        currentObserver.unobserve(entry.target);
      });
    }, { root: options.getRoot(), rootMargin: "900px", threshold: 0 });
    observer = currentObserver;
    return observer;
  }

  /** Associates a post with its card and hydrates selected/forced cards immediately.
   * @param {HTMLElement|null} card - Rendered post card.
   * @param {object} post - Normalized post.
   * @returns {void}
   */
  function prepare(card = null, post = {}) {
    if (!card || post?.isDeletedThreadAnchor === true) {
      return;
    }
    card._threadExplorerPost = post;
    card.classList.add("is-awaiting-content");
    if (options.isForced() || post.uri === options.getSelectedUri()) {
      options.hydrate(card);
      return;
    }
    const currentObserver = getObserver();
    if (!currentObserver) {
      options.hydrate(card);
      return;
    }
    currentObserver.observe(card);
  }

  /** Hydrates all rendered cards when snapshot rendering forces complete content.
   * @returns {void}
   */
  function hydrateVisible() {
    if (options.isForced()) {
      options.getStage().querySelectorAll(".thread-explorer-post-card").forEach((card) => {
        options.hydrate(card);
      });
    }
  }
  return Object.freeze({ reset, prepare, hydrateVisible });
}

/**
 * Hydrates snapshot avatars through the worker and translates its progress reports.
 * @param {object|null} root - Thread root to enrich with cached avatars.
 * @param {object} options - Request, abort, translation, progress, error and avatar-result adapters.
 * @returns {Promise<void>} Resolves after optional avatar data has been applied.
 */
export async function hydrateThreadExplorerAvatars(root = null, options = {}) {
  if (!root) {
    return;
  }
  options.throwIfAborted(options.signal || null);
  const result = await options.request("HYDRATE_THREAD_EXPLORER_AVATARS", { root }, {
    timeoutMs: 120000,
    signal: options.signal || null,
    /** Maps worker avatar progress to the snapshot's progress range.
     * @param {object} progress - Worker phase and counters.
     * @returns {void}
     */
    onProgress(progress) {
      if (progress?.phase !== "thread_explorer_avatars") {
        return;
      }
      const total = Math.max(0, Number(progress.total) || 0);
      const current = Math.max(0, Number(progress.current) || 0);
      const remaining = Math.max(0, Number(progress.remaining) || 0);
      let percent = 5;
      if (total > 0) {
        percent = 5 + (current / total * 12);
      }
      void options.onProgress({
        percent,
        step: options.translate("threadExplorerSnapshotProgressAvatars"),
        detail: options.translate("threadExplorerSnapshotProgressAvatarDetail", {
          current, total, remaining, hydrated: Number(progress.hydrated) || 0, skipped: Number(progress.skipped) || 0,
        }),
      });
    },
  }).catch((error) => {
    if (error?.name === "AbortError") {
      throw error;
    }
    options.onError(error);
    return null;
  });
  if (result?.avatars && typeof result.avatars === "object") {
    options.applyAvatars(root, result.avatars);
  }
}

/**
 * Applies an actor avatar to a hydrated Thread Explorer card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object|null} post - Post whose author supplies the avatar.
 * @param {object} options - Avatar selector and actor/image callbacks.
 * @param {Function} options.markAvatar - Marks the image for lazy hydration.
 * @param {Function} options.getAvatarUri - Resolves the author's avatar URI.
 * @param {Function} options.getActorLabel - Resolves the author's accessible label.
 * @param {Function} options.setAvatar - Applies source and accessible label to the image.
 * @returns {void} No return value.
 */
export function renderThreadExplorerCardAvatar(card = null, post = null, options = {}) {
  if (!card || !post || typeof card.querySelector !== "function") {
    return;
  }
  const avatar = card.querySelector(options.avatarSelector || ".thread-explorer-avatar");
  if (typeof options.markAvatar === "function") {
    options.markAvatar(avatar, post.author);
  }
  if (typeof options.setAvatar === "function") {
    let avatarUri = "";
    if (typeof options.getAvatarUri === "function") {
      avatarUri = options.getAvatarUri(post.author);
    }
    let actorLabel = "";
    if (typeof options.getActorLabel === "function") {
      actorLabel = options.getActorLabel(post.author);
    }
    options.setAvatar(avatar, avatarUri, actorLabel);
  }
}

/**
 * Renders a post's image gallery and synchronizes card image-shape classes.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object|null} post - Post containing gallery images.
 * @param {object} options - Gallery selector and rendering callbacks.
 * @param {Function} options.renderImages - Renders the post images into a gallery.
 * @param {Function} options.syncShape - Copies gallery shape classes to card and node.
 * @returns {void} No return value.
 */
export function renderThreadExplorerCardMedia(card = null, post = null, options = {}) {
  if (!card || !post || typeof card.querySelector !== "function") {
    return;
  }
  const gallery = card.querySelector(options.gallerySelector || ".thread-explorer-post-gallery");
  if (typeof options.renderImages === "function") {
    options.renderImages(post, gallery);
  }
  if (typeof options.syncShape === "function") {
    options.syncShape(card, gallery);
  }
}

/**
 * Renders the external and quoted-post embeds on a hydrated card.
 * @param {HTMLElement|null} card - Rendered post card.
 * @param {object|null} post - Post containing embed data.
 * @param {object|null} display - Prepared post display model.
 * @param {object} options - External-card and quote-card render callbacks.
 * @param {Function} options.renderExternalCard - Renders the external card using its display model.
 * @param {Function} options.renderQuoteCard - Renders the quoted post card.
 * @returns {void} No return value.
 */
export function renderThreadExplorerCardEmbeds(card = null, post = null, display = null, options = {}) {
  if (!card || !post) {
    return;
  }
  if (typeof options.renderExternalCard === "function") {
    let externalDisplay = null;
    if (display && display.externalCardDisplay) {
      externalDisplay = display.externalCardDisplay;
    }
    options.renderExternalCard(post, externalDisplay, card);
  }
  if (typeof options.renderQuoteCard === "function") {
    options.renderQuoteCard(post, card);
  }
}

/**
 * Resolves the best displayable avatar URI for one Thread Explorer actor.
 * @param {object|null} actor - Normalized actor.
 * @returns {string} Cached data URI, remote avatar URI, or an empty string.
 */
export function getThreadExplorerActorAvatarUri(actor = null) {
  const cachedAvatar = String(actor?.avatarDataUri || "").trim();
  if (cachedAvatar) {
    return cachedAvatar;
  }
  return String(actor?.avatar || "").trim();
}

/**
 * Finds a locally cached avatar asset matching an actor DID and avatar URL.
 * @param {object|null} actor - Normalized actor.
 * @param {Array<object>} assets - Cached avatar assets.
 * @returns {object|null} Matching cache asset, or null when none exists.
 */
export function findThreadExplorerActorAvatarAsset(actor = null, assets = []) {
  const did = String(actor?.did || "").trim();
  const avatarUrl = String(actor?.avatar || "").trim();
  if (!did || !avatarUrl || !Array.isArray(assets)) {
    return null;
  }
  const asset = assets.find((entry) => entry?.did === did && entry?.url === avatarUrl);
  if (!asset) {
    return null;
  }
  return asset;
}

/**
 * Applies a cached data URI to one actor when a matching asset is available.
 * @param {object|null} actor - Actor object to update.
 * @param {Array<object>} assets - Cached avatar assets.
 * @param {Function} assetToDataUri - Converts a cached asset into a data URI.
 * @returns {boolean} True when the actor received cached avatar data.
 */
export function applyThreadExplorerActorAvatarFromCache(actor = null, assets = [], assetToDataUri = null) {
  if (!actor || typeof actor !== "object" || typeof assetToDataUri !== "function") {
    return false;
  }
  const asset = findThreadExplorerActorAvatarAsset(actor, assets);
  if (!asset) {
    return false;
  }
  actor.avatarDataUri = assetToDataUri(asset);
  return true;
}

/**
 * Adds the actor identity needed to resolve a cached avatar for an image.
 * @param {HTMLImageElement|null} image - Avatar image element.
 * @param {object|null} actor - Normalized actor.
 * @returns {void} No return value.
 */
export function markThreadExplorerAvatarImage(image = null, actor = null) {
  if (!image) {
    return;
  }
  image.dataset.avatarDid = String(actor?.did || "").trim();
  image.dataset.avatarUrl = String(actor?.avatar || "").trim();
}

/**
 * Applies service-worker avatar results to authors and quoted authors recursively.
 * @param {object|null} node - Thread tree node to update.
 * @param {object} avatars - Avatar result map keyed by actor DID.
 * @returns {void} No return value.
 */
export function applyThreadExplorerAvatarHydration(node = null, avatars = {}) {
  if (!node || typeof node !== "object") {
    return;
  }
  const author = node.post?.author || null;
  if (author?.did && avatars[author.did]?.dataUri) {
    author.avatarDataUri = avatars[author.did].dataUri;
  }
  const quoteAuthor = node.post?.quoteCard?.author || null;
  if (quoteAuthor?.did && avatars[quoteAuthor.did]?.dataUri) {
    quoteAuthor.avatarDataUri = avatars[quoteAuthor.did].dataUri;
  }
  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => applyThreadExplorerAvatarHydration(reply, avatars));
  }
}

/**
 * Applies locally cached avatars to authors and quoted authors throughout a tree.
 * @param {object|null} node - Thread tree node to update.
 * @param {Array<object>} assets - Cached avatar assets.
 * @param {Function} assetToDataUri - Converts a cached asset into a data URI.
 * @returns {void} No return value.
 */
export function applyThreadExplorerAvatarCacheToTree(node = null, assets = [], assetToDataUri = null) {
  if (!node || typeof node !== "object") {
    return;
  }
  applyThreadExplorerActorAvatarFromCache(node.post?.author || null, assets, assetToDataUri);
  applyThreadExplorerActorAvatarFromCache(node.post?.quoteCard?.author || null, assets, assetToDataUri);
  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => applyThreadExplorerAvatarCacheToTree(reply, assets, assetToDataUri));
  }
}
