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
