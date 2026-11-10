/** Creates worker Thread Explorer post/quote/media and recursive tree models.
 * @param {object} options - Existing Standard.site metadata normalizer.
 * @returns {object} Frozen actor/edit/post/root/merge/contains/count/authors/mediaEntries API.
 */
globalThis.createThreadlineExplorerModels = function createThreadlineExplorerModels(options) {
  if (typeof options?.site !== "function") { throw new TypeError("Explorer models require site"); }
  const { site: normalizeStandardSiteMetadata } = options;
  /** Returns arrays unchanged, otherwise an empty array. @param {unknown} value - Input. @returns {Array} Array. */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) { return value; }
    return [];
  }
  /**
   * Normalizes an AT Protocol actor object for Thread Explorer rendering.
   * @param {object} actor - Actor profile data from a post view.
   * @returns {object} A compact actor object with stable string fields and viewer relation flags.
   */
  function normalizeThreadExplorerActor(actor = {}) {
    let viewer = {};
    if (actor?.viewer && typeof actor.viewer === "object") {
      viewer = actor.viewer;
    }
    return {
      did: String(actor?.did || "").trim(),
      handle: String(actor?.handle || "").trim(),
      displayName: String(actor?.displayName || actor?.handle || "").trim(),
      avatar: String(actor?.avatar || "").trim(),
      ...globalThis.ThreadlineProfileMetadata.normalize(actor),
      followingViewer: Boolean(viewer.following),
      followedByViewer: Boolean(viewer.followedBy),
    };
  }

  /**
   * Extracts image entries from a Bluesky embed view.
   * @param {object} embed - Post embed view or nested media embed view.
   * @returns {Array<object>} Image entries with thumb/fullsize URLs and alt text.
   */
  function extractThreadExplorerImages(embed = {}) {
    if (!embed || typeof embed !== "object") {
      return [];
    }

    if (Array.isArray(embed.images)) {
      return embed.images.map((image) => ({
        thumb: String(image?.thumb || image?.fullsize || "").trim(),
        fullsize: String(image?.fullsize || image?.thumb || "").trim(),
        alt: String(image?.alt || "").trim(),
      })).filter((image) => image.thumb || image.fullsize);
    }

    if (Array.isArray(embed.items)) {
      return embed.items.map((image) => {
        let imageNode = image;
        if (image?.image && typeof image.image === "object") { imageNode = image.image; }
        return {
          thumb: String(imageNode?.thumb || imageNode?.fullsize || "").trim(),
          fullsize: String(imageNode?.fullsize || imageNode?.thumb || "").trim(),
          alt: String(image?.alt || imageNode?.alt || "").trim(),
        };
      }).filter((image) => image.thumb || image.fullsize);
    }

    if (embed.media && typeof embed.media === "object") {
      return extractThreadExplorerImages(embed.media);
    }

    return [];
  }

  /**
   * Detects whether a post embed contains a video.
   * @param {object} embed - Post embed view or nested media embed view.
   * @returns {boolean} True when a video embed is present.
   */
  function extractThreadExplorerHasVideo(embed = {}) {
    if (!embed || typeof embed !== "object") {
      return false;
    }
    if (embed.video && typeof embed.video === "object") {
      return true;
    }
    if (embed.media && typeof embed.media === "object") {
      return extractThreadExplorerHasVideo(embed.media);
    }
    return false;
  }

  /**
   * Extracts an external link-card from a Bluesky embed view.
   * @param {object} embed - Post embed view or nested media embed view.
   * @returns {object|null} A compact link-card object, or null when no external card exists.
   */
  function extractThreadExplorerExternalCard(embed = {}) {
    if (!embed || typeof embed !== "object") {
      return null;
    }

    let external = null;
    if (embed.external && typeof embed.external === "object") {
      external = embed.external;
    } else if (embed.media && typeof embed.media === "object") {
      return extractThreadExplorerExternalCard(embed.media);
    }

    if (!external) {
      return null;
    }

    return {
      uri: String(external.uri || "").trim(),
      title: String(external.title || external.uri || "").trim(),
      description: String(external.description || "").trim(),
      thumb: String(external.thumb || "").trim(),
      standardSite: normalizeStandardSiteMetadata(external.standardSite || external.standardSiteMetadata || external.publication),
    };
  }

  /**
   * Normalizes Mu-compatible post edit metadata from an ATProto post record.
   * @param {object} record - Raw app.bsky.feed.post record.
   * @returns {object|null} Edit metadata, or null when no Mu edit fields exist.
   */
  function normalizePostEditInfoFromRecord(record = {}) {
    if (!record || typeof record !== "object") {
      return null;
    }
    if (typeof record.originalText !== "string") {
      return null;
    }
    if (typeof record.updatedAt !== "string") {
      return null;
    }

    return {
      isEdited: true,
      originalText: String(record.originalText || ""),
      text: String(record.text || ""),
      createdAt: String(record.createdAt || ""),
      updatedAt: String(record.updatedAt || ""),
    };
  }

  /**
   * Normalizes a quoted post embed for Thread Explorer quote cards.
   * @param {object} record - Bluesky embed record view.
   * @returns {object|null} Normalized quoted post, or null when unavailable.
   */
  function normalizeThreadExplorerQuoteRecord(record = {}) {
    if (!record || typeof record !== "object") {
      return null;
    }
    if (!record.uri) {
      return null;
    }

    let value = {};
    if (record.value && typeof record.value === "object") {
      value = record.value;
    }
    let quoteEmbed = {};
    if (record.embeds && Array.isArray(record.embeds) && record.embeds[0]) {
      quoteEmbed = record.embeds[0];
    } else if (record.embed && typeof record.embed === "object") {
      quoteEmbed = record.embed;
    } else if (value.embed && typeof value.embed === "object") {
      quoteEmbed = value.embed;
    }

    return {
      uri: String(record.uri || "").trim(),
      cid: String(record.cid || "").trim(),
      text: String(value.text || "").trim(),
      createdAt: String(value.createdAt || record.indexedAt || "").trim(),
      indexedAt: String(record.indexedAt || "").trim(),
      author: normalizeThreadExplorerActor(record.author || {}),
      images: extractThreadExplorerImages(quoteEmbed),
      externalCard: extractThreadExplorerExternalCard(quoteEmbed),
      editInfo: normalizePostEditInfoFromRecord(value),
    };
  }

  /**
   * Extracts a quoted post from a Bluesky embed view.
   * @param {object} embed - Post embed view or nested record-with-media view.
   * @returns {object|null} Normalized quote card data, or null.
   */
  function extractThreadExplorerQuoteCard(embed = {}) {
    if (!embed || typeof embed !== "object") {
      return null;
    }

    let record = null;
    if (embed.record && typeof embed.record === "object") {
      record = embed.record;
    }
    if (record?.record && typeof record.record === "object") {
      record = record.record;
    }

    return normalizeThreadExplorerQuoteRecord(record);
  }

  /**
   * Normalizes a Bluesky post view for the Thread Explorer UI.
   * @param {object} postView - AT Protocol post view object.
   * @returns {object|null} Compact post data, or null when the input is not a post.
   */
  function normalizeThreadExplorerPost(postView = {}) {
    if (!postView || typeof postView !== "object") {
      return null;
    }
    if (!postView.uri) {
      return null;
    }

    let record = {};
    if (postView.record && typeof postView.record === "object") {
      record = postView.record;
    }
    return {
      uri: String(postView.uri || "").trim(),
      cid: String(postView.cid || "").trim(),
      rootUri: String(record.reply?.root?.uri || postView.uri || "").trim(),
      reply: record?.reply || null,
      text: String(record.text || "").trim(),
      createdAt: String(record.createdAt || postView.indexedAt || "").trim(),
      indexedAt: String(postView.indexedAt || "").trim(),
      langs: arrayOrEmpty(record.langs),
      facets: arrayOrEmpty(record.facets),
      author: normalizeThreadExplorerActor(postView.author || {}),
      likeCount: Number(postView.likeCount) || 0,
      replyCount: Number(postView.replyCount) || 0,
      repostCount: Number(postView.repostCount) || 0,
      quoteCount: Number(postView.quoteCount) || 0,
      viewer: postView.viewer || {},
      images: extractThreadExplorerImages(postView.embed || {}),
      hasVideo: extractThreadExplorerHasVideo(postView.embed || {}),
      externalCard: extractThreadExplorerExternalCard(postView.embed || {}),
      quoteCard: extractThreadExplorerQuoteCard(postView.embed || {}),
      editInfo: normalizePostEditInfoFromRecord(record),
    };
  }

  /**
   * Builds a placeholder post for a missing parent/root in getPostThread.
   * @param {object} node - ThreadViewPost notFound node.
   * @returns {object|null} Placeholder post, or null when no URI exists.
   */
  function normalizeThreadExplorerMissingPost(node = {}) {
    const uri = String(node?.uri || "").trim();
    if (!uri) {
      return null;
    }

    return {
      uri,
      cid: "",
      text: "",
      createdAt: "",
      indexedAt: "",
      author: {
        did: "",
        handle: "",
        displayName: "",
        avatar: "",
        followingViewer: false,
        followedByViewer: false,
      },
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      quoteCount: 0,
      viewer: {},
      images: [],
      externalCard: null,
      quoteCard: null,
      editInfo: null,
      isDeletedThreadAnchor: true,
    };
  }

  /**
   * Converts a getPostThread node to a recursive UI tree.
   * @param {object} node - ThreadViewPost node from app.bsky.feed.getPostThread.
   * @returns {object|null} Tree node with normalized post and child replies.
   */
  function normalizeThreadExplorerThreadNode(node = {}) {
    if (!node || typeof node !== "object") {
      return null;
    }

    let post = null;
    if (node.notFound === true) {
      post = normalizeThreadExplorerMissingPost(node);
    } else {
      post = normalizeThreadExplorerPost(node.post || node);
    }
    if (!post) {
      return null;
    }

    const replies = [];
    if (Array.isArray(node.replies)) {
      node.replies.forEach((reply) => {
        const normalizedReply = normalizeThreadExplorerThreadNode(reply);
        if (normalizedReply) {
          replies.push(normalizedReply);
        }
      });
    }

    return {
      post,
      replies,
    };
  }

  /**
   * Finds the index of a reply by post URI.
   * @param {Array<object>} replies - Normalized reply nodes.
   * @param {string} uri - Post URI to find.
   * @returns {number} Matching index, or -1 when not found.
   */
  function findThreadExplorerReplyIndex(replies, uri) {
    if (!Array.isArray(replies) || !uri) {
      return -1;
    }

    for (let index = 0; index < replies.length; index += 1) {
      if (replies[index]?.post?.uri === uri) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Inserts a selected child subtree into a normalized parent node.
   * @param {object|null} parentNode - Normalized parent node.
   * @param {object|null} childNode - Normalized selected child subtree.
   * @returns {object|null} Parent node with the child subtree placed in replies.
   */
  function attachThreadExplorerChildToParent(parentNode, childNode) {
    if (!parentNode || !childNode) {
      return parentNode || childNode || null;
    }

    if (!Array.isArray(parentNode.replies)) {
      parentNode.replies = [];
    }

    const existingIndex = findThreadExplorerReplyIndex(parentNode.replies, childNode.post.uri);
    if (existingIndex >= 0) {
      parentNode.replies[existingIndex] = childNode;
    } else {
      parentNode.replies.push(childNode);
    }
    return parentNode;
  }

  /**
   * Builds the visible Thread Explorer root tree from a getPostThread response.
   * @param {object} threadNode - ThreadViewPost node for the selected post.
   * @returns {object|null} Normalized tree rooted at the conversation root.
   */
  function normalizeThreadExplorerThreadRoot(threadNode = {}) {
    let childTree = normalizeThreadExplorerThreadNode(threadNode);
    let parentSource = threadNode?.parent;

    while (parentSource && typeof parentSource === "object") {
      const parentTree = normalizeThreadExplorerThreadNode(parentSource);
      if (!parentTree) {
        break;
      }
      childTree = attachThreadExplorerChildToParent(parentTree, childTree);
      parentSource = parentSource.parent;
    }

    return childTree;
  }

  /**
   * Checks whether a normalized Thread Explorer tree contains a post URI.
   * @param {object|null} node - Normalized Thread Explorer tree node.
   * @param {string} uri - AT URI to find.
   * @returns {boolean} True when the URI exists in the tree.
   */
  function threadExplorerTreeContainsUri(node, uri) {
    const normalizedUri = String(uri || "").trim();
    if (!node || !normalizedUri) {
      return false;
    }
    if (node.post?.uri === normalizedUri) {
      return true;
    }
    if (!Array.isArray(node.replies)) {
      return false;
    }
    return node.replies.some((reply) => threadExplorerTreeContainsUri(reply, normalizedUri));
  }

  /**
   * Merges a selected ancestor path into a full root tree when the full tree omits that path.
   * @param {object|null} fullRoot - Full root tree from getPostThread(root).
   * @param {object|null} selectedRoot - Root-to-selected path from getPostThread(selected).
   * @param {string} selectedUri - Selected post URI that must remain focusable.
   * @returns {object|null} Full root with selected path preserved.
   */
  function mergeThreadExplorerSelectedPath(fullRoot, selectedRoot, selectedUri) {
    if (!fullRoot || !selectedRoot) {
      return fullRoot || selectedRoot || null;
    }
    if (threadExplorerTreeContainsUri(fullRoot, selectedUri)) {
      return fullRoot;
    }
    if (fullRoot.post?.uri !== selectedRoot.post?.uri) {
      return fullRoot;
    }

    mergeThreadExplorerPathNode(fullRoot, selectedRoot);
    return fullRoot;
  }

  /**
   * Merges one selected path node into a target node while preserving existing sibling replies.
   * @param {object} targetNode - Existing full-tree node.
   * @param {object} pathNode - Selected-path node with replies to preserve.
   * @returns {void}
   */
  function mergeThreadExplorerPathNode(targetNode, pathNode) {
    if (!targetNode || !pathNode || targetNode.post?.uri !== pathNode.post?.uri) {
      return;
    }

    if (!Array.isArray(targetNode.replies)) {
      targetNode.replies = [];
    }
    if (!Array.isArray(pathNode.replies)) {
      return;
    }

    pathNode.replies.forEach((pathReply) => {
      const existingIndex = findThreadExplorerReplyIndex(targetNode.replies, pathReply.post?.uri || "");
      if (existingIndex >= 0) {
        mergeThreadExplorerPathNode(targetNode.replies[existingIndex], pathReply);
      } else {
        targetNode.replies.push(pathReply);
      }
    });
  }

  /**
   * Counts posts in a normalized Thread Explorer tree.
   * @param {object|null} node - Normalized thread tree node.
   * @returns {number} Total number of posts below and including the node.
   */
  function countThreadExplorerTreePosts(node) {
    if (!node) {
      return 0;
    }

    let count = 0;
    if (node.post?.isDeletedThreadAnchor !== true) {
      count = 1;
    }
    if (Array.isArray(node.replies)) {
      node.replies.forEach((reply) => {
        count += countThreadExplorerTreePosts(reply);
      });
    }
    return count;
  }

  /**
   * Collects unique authors with avatar URLs from a Thread Explorer tree.
   * @param {object|null} node - Thread Explorer tree node.
   * @param {Map<string, object>} authors - Mutable author map keyed by DID and avatar URL.
   * @returns {Map<string, object>} Author map with unique avatar entries.
   */
  function collectThreadExplorerAvatarAuthors(node = null, authors = new Map()) {
    if (!node || typeof node !== "object") {
      return authors;
    }

    const author = node.post?.author || {};
    const did = String(author.did || "").trim();
    const avatar = String(author.avatar || "").trim();
    if (did && avatar) {
      authors.set(`${did}|${avatar}`, {
        did,
        avatar,
        handle: String(author.handle || did).trim(),
        displayName: String(author.displayName || author.handle || did).trim(),
      });
    }

    const quoteAuthor = node.post?.quoteCard?.author || {};
    const quoteDid = String(quoteAuthor.did || "").trim();
    const quoteAvatar = String(quoteAuthor.avatar || "").trim();
    if (quoteDid && quoteAvatar) {
      authors.set(`${quoteDid}|${quoteAvatar}`, {
        did: quoteDid,
        avatar: quoteAvatar,
        handle: String(quoteAuthor.handle || quoteDid).trim(),
        displayName: String(quoteAuthor.displayName || quoteAuthor.handle || quoteDid).trim(),
      });
    }

    if (Array.isArray(node.replies)) {
      node.replies.forEach((reply) => {
        collectThreadExplorerAvatarAuthors(reply, authors);
      });
    }

    return authors;
  }

  /**
   * Adds one Thread Explorer media URL to a collection if it can be loaded.
   * @param {Map<string, object>} media - Mutable media map keyed by URL.
   * @param {string} url - Remote media URL.
   * @param {string} did - Fallback actor DID for blob resolution.
   * @returns {void}
   */
  function addThreadExplorerMediaHydrationUrl(media, url, did) {
    const source = String(url || "").trim();
    if (!source || source.startsWith("data:")) {
      return;
    }
    if (media.has(source)) {
      return;
    }
    media.set(source, {
      url: source,
      did: String(did || "").trim(),
    });
  }

  /**
   * Collects remote media URLs from a Thread Explorer tree node.
   * @param {object|null} node - Thread Explorer tree node.
   * @param {Map<string, object>} media - Mutable media map keyed by URL.
   * @returns {Map<string, object>} Media map.
   */
  function collectThreadExplorerMediaHydrationUrls(node = null, media = new Map()) {
    if (!node || typeof node !== "object") {
      return media;
    }

    const post = node.post || {};
    const authorDid = String(post.author?.did || "").trim();
    if (Array.isArray(post.images)) {
      post.images.forEach((image) => {
        addThreadExplorerMediaHydrationUrl(media, image?.fullsize || image?.thumb || "", authorDid);
        addThreadExplorerMediaHydrationUrl(media, image?.thumb || image?.fullsize || "", authorDid);
      });
    }
    addThreadExplorerMediaHydrationUrl(media, post.externalCard?.thumb || "", authorDid);

    const quote = post.quoteCard || null;
    if (quote && typeof quote === "object") {
      const quoteAuthorDid = String(quote.author?.did || authorDid || "").trim();
      if (Array.isArray(quote.images)) {
        quote.images.forEach((image) => {
          addThreadExplorerMediaHydrationUrl(media, image?.fullsize || image?.thumb || "", quoteAuthorDid);
          addThreadExplorerMediaHydrationUrl(media, image?.thumb || image?.fullsize || "", quoteAuthorDid);
        });
      }
      addThreadExplorerMediaHydrationUrl(media, quote.externalCard?.thumb || "", quoteAuthorDid);
    }

    if (Array.isArray(node.replies)) {
      node.replies.forEach((reply) => {
        collectThreadExplorerMediaHydrationUrls(reply, media);
      });
    }

    return media;
  }

  /**
   * Builds Thread Explorer media hydration entries from an explicit payload list or a tree root.
   * @param {object} payload - Hydration payload with root or mediaEntries.
   * @returns {object[]} Unique media entries with url and fallback DID.
   */
  function collectThreadExplorerMediaHydrationEntries(payload = {}) {
    let explicitEntries = [];
    if (Array.isArray(payload?.mediaEntries)) {
      explicitEntries = payload.mediaEntries;
    }
    const media = new Map();
    if (explicitEntries.length > 0) {
      explicitEntries.forEach((entry) => {
        addThreadExplorerMediaHydrationUrl(media, entry?.url || "", entry?.did || "");
      });
      return Array.from(media.values());
    }

    return Array.from(collectThreadExplorerMediaHydrationUrls(payload?.root).values());
  }

  return Object.freeze({ actor: normalizeThreadExplorerActor, edit: normalizePostEditInfoFromRecord, post: normalizeThreadExplorerPost, root: normalizeThreadExplorerThreadRoot, merge: mergeThreadExplorerSelectedPath, contains: threadExplorerTreeContainsUri, count: countThreadExplorerTreePosts, authors: collectThreadExplorerAvatarAuthors, mediaEntries: collectThreadExplorerMediaHydrationEntries });
};
