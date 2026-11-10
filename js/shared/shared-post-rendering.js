/**
 * Formats one numeric interaction count for the requested locale.
 * @param {number|string} value - Raw numeric value.
 * @param {string} locale - Locale used for number formatting.
 * @returns {string} Localized number string.
 */
function formatPostCount(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

/**
 * Returns the visible actor label from display name, handle, DID, or fallback text.
 * @param {object} actor - Normalized actor data.
 * @param {string} fallbackLabel - Fallback label for unknown actors.
 * @returns {string} Visible actor label.
 */
function getPostActorLabel(actor, fallbackLabel) {
  const displayName = String(actor?.displayName || "").trim();
  if (displayName) {
    return displayName;
  }

  const handle = String(actor?.handle || "").trim();
  if (handle) {
    return `@${handle}`;
  }

  const did = String(actor?.did || "").trim();
  if (did) {
    return did;
  }

  return String(fallbackLabel || "").trim();
}

/**
 * Returns the visible secondary actor line from handle or DID.
 * @param {object} actor - Normalized actor data.
 * @returns {string} Visible handle or DID line.
 */
function getPostHandleLabel(actor) {
  const handle = String(actor?.handle || "").trim();
  if (handle) {
    return `@${handle}`;
  }

  const did = String(actor?.did || "").trim();
  if (did) {
    return did;
  }

  return "";
}

/**
 * Builds the visible author and handle labels for one actor.
 * @param {object} actor - Normalized actor data.
 * @param {string} fallbackLabel - Fallback label for unknown actors.
 * @returns {{authorLabel: string, handleLabel: string}} Visible author fields.
 */
function getPostAuthorFields(actor, fallbackLabel) {
  let handleLabel = getPostHandleLabel(actor);
  if (typeof actor?.pronouns === "string" && actor.pronouns.trim()) {
    handleLabel += ` · ${actor.pronouns.trim()}`;
  }
  return {
    authorLabel: getPostActorLabel(actor, fallbackLabel),
    handleLabel,
  };
}

/**
 * Returns a compact preview string for one post body.
 * @param {object} post - Normalized post data with optional text.
 * @param {string} emptyFallback - Fallback text when the post has no visible text.
 * @param {number} maxLength - Maximum preview length.
 * @returns {string} Short post preview text.
 */
function getPostPreviewText(post, emptyFallback, maxLength = 220) {
  const text = String(post?.text || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return String(emptyFallback || "").trim();
  }

  if (text.length <= maxLength) {
    return text;
  }

  const truncatedLength = Math.max(0, maxLength - 3);
  return `${text.slice(0, truncatedLength)}...`;
}

/**
 * Formats one ISO timestamp for the requested locale.
 * @param {string} value - ISO timestamp value.
 * @param {string} locale - Locale used for date formatting.
 * @returns {string} Localized date text or the raw value when parsing fails.
 */
function formatPostDateTime(value, locale) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Builds the visible metadata line for one post or quote.
 * @param {object} post - Normalized post-like object with timestamps and optional editInfo.
 * @param {object} options - Formatting callbacks and translations.
 * @param {(value: string) => string} options.formatDate - Date formatter callback.
 * @param {(key: string, vars?: object) => string} options.translate - Translation callback.
 * @param {boolean} options.includeEditedBadge - Whether the edited badge should be appended.
 * @returns {string} Visible metadata line.
 */
function buildPostMetaText(post = {}, options = {}) {
  const formatDate = typeof options.formatDate === "function" ? options.formatDate : ((value) => String(value || ""));
  const translate = typeof options.translate === "function" ? options.translate : ((key) => key);
  const includeEditedBadge = options.includeEditedBadge === true;
  const createdAt = String(post?.createdAt || post?.indexedAt || "").trim();
  let metaText = formatDate(createdAt);

  if (includeEditedBadge && post?.editInfo?.isEdited === true) {
    const editedLabel = String(translate("threadExplorerEditedBadge") || "").trim();
    if (metaText && editedLabel) {
      metaText = `${metaText} - ${editedLabel}`.trim();
    } else if (editedLabel) {
      metaText = editedLabel;
    }
  }

  return metaText;
}

/**
 * Returns the viewer like record URI stored on one normalized live post.
 * @param {object} post - Normalized live post from search or Thread Explorer.
 * @returns {string} Existing like record URI, or an empty string.
 */
function getViewerLikeUri(post = {}) {
  if (!post?.viewer || typeof post.viewer !== "object") {
    return "";
  }

  return String(post.viewer.like || "").trim();
}

/**
 * Returns whether the signed-in viewer currently likes one live post.
 * @param {object} post - Normalized live post from search or Thread Explorer.
 * @returns {boolean} True when the viewer has a like record for the post.
 */
function isPostLikedByViewer(post = {}) {
  return Boolean(getViewerLikeUri(post));
}

/**
 * Applies one local like-state update to a normalized live post object.
 * @param {object} post - Normalized live post to mutate in place.
 * @param {string} likeUri - Next like record URI, or an empty string after unlike.
 * @param {number} delta - Count delta applied to the like counter.
 * @returns {void}
 */
function applyLikeStateToPost(post = {}, likeUri = "", delta = 0) {
  if (!post || typeof post !== "object") {
    return;
  }

  if (!post.viewer || typeof post.viewer !== "object") {
    post.viewer = {};
  }

  post.likeCount = Math.max(0, (Number(post.likeCount) || 0) + delta);
  if (likeUri) {
    post.viewer.like = likeUri;
  } else {
    delete post.viewer.like;
  }
}

/**
 * Returns normalized interaction counts for one post-like object.
 * @param {object} post - Post object with optional count fields.
 * @returns {{likeCount: number, replyCount: number, repostCount: number, quoteCount: number}} Normalized count object.
 */
function getPostMetricCounts(post = {}) {
  const counts = post?.counts && typeof post.counts === "object" ? post.counts : post;
  return {
    likeCount: Number(counts?.likeCount) || 0,
    replyCount: Number(counts?.replyCount) || 0,
    repostCount: Number(counts?.repostCount) || 0,
    quoteCount: Number(counts?.quoteCount) || 0,
  };
}

/**
 * Builds normalized metric entries for one post-like object.
 * @param {object} post - Post object with optional count fields.
 * @param {object} options - Formatting and interaction options.
 * @param {(key: string, vars?: object) => string} options.translate - Translation callback.
 * @param {(value: number|string) => string} options.formatCount - Count formatter callback.
 * @param {string[]} options.interactiveTypes - Metric types that should be marked interactive.
 * @returns {Array<{type: string, count: number, label: string, isInteractive: boolean}>} Ordered metric entry list.
 */
function buildPostMetricEntries(post = {}, options = {}) {
  const translate = typeof options.translate === "function" ? options.translate : ((key, vars = {}) => {
    return `${key}:${vars.count ?? ""}`;
  });
  const formatCount = typeof options.formatCount === "function" ? options.formatCount : ((value) => String(value ?? 0));
  const interactiveTypes = Array.isArray(options.interactiveTypes) ? options.interactiveTypes : [];
  const interactiveTypeSet = new Set(interactiveTypes);
  const counts = getPostMetricCounts(post);
  const metricEntries = [];
  const metricDefinitions = [
    { type: "Likes", count: counts.likeCount },
    { type: "Replies", count: counts.replyCount },
    { type: "Reposts", count: counts.repostCount },
    { type: "Quotes", count: counts.quoteCount },
  ];

  metricDefinitions.forEach((definition) => {
    const formattedCount = formatCount(definition.count);
    metricEntries.push({
      type: definition.type,
      count: definition.count,
      label: translate(`threadExplorerCount${definition.type}`, {
        count: formattedCount,
      }),
      isInteractive: interactiveTypeSet.has(definition.type),
    });
  });

  return metricEntries;
}

/**
 * Builds plain metric labels for one post-like object.
 * @param {object} post - Post object with optional count fields.
 * @returns {string[]} Flat metric label list in Likes/Replies/Reposts/Quotes order.
 */
function buildPostMetricLabels(post = {}) {
  const metricEntries = buildPostMetricEntries(post, {
    translate(_key, vars = {}) {
      return String(vars.count || "0");
    },
    formatCount(value) {
      return String(Number(value) || 0);
    },
  });

  return metricEntries.map((entry) => {
    return `${entry.type} ${entry.label}`;
  });
}

/**
 * Builds the metadata text shown for one search result.
 * @param {object} item - Normalized search result item.
 * @param {object} options - Formatting callbacks and translations.
 * @param {(value: string) => string} options.formatDate - Date formatter callback.
 * @param {(key: string, vars?: object) => string} options.translate - Translation callback.
 * @returns {string} Rendered metadata line.
 */
function buildSearchResultMetaText(item = {}, options = {}) {
  const post = item?.post || null;
  if (!post) {
    return "";
  }

  const formatDate = typeof options.formatDate === "function" ? options.formatDate : ((value) => String(value || ""));
  const translate = typeof options.translate === "function" ? options.translate : ((key) => key);
  const metaParts = [];
  const createdAtText = formatDate(post.createdAt || post.indexedAt || "");
  if (createdAtText) {
    metaParts.push(createdAtText);
  }

  if (item.reasonType === "repost") {
    const repostBy = String(item.repostBy || "").trim();
    const repostAt = formatDate(item.repostAt || "");
    if (repostBy && repostAt) {
      metaParts.push(translate("searchResultRepostMeta", { account: repostBy, date: repostAt }));
    } else if (repostBy) {
      metaParts.push(translate("searchResultRepostBy", { account: repostBy }));
    }
  }

  return metaParts.join(" · ");
}

/**
 * Removes one set of URL variants from visible post text.
 * @param {string} text - Current display text.
 * @param {string[]} urls - URL variants that should disappear from the text.
 * @param {object} options - Cleanup helpers.
 * @param {(value: string) => string} options.stripUrlFromText - Callback that removes one URL from the text.
 * @returns {string} Cleaned display text.
 */
function stripPostUrlsFromText(text = "", urls = [], options = {}) {
  const stripUrlFromText = typeof options.stripUrlFromText === "function"
    ? options.stripUrlFromText
    : ((value) => String(value || ""));
  let nextText = String(text || "");
  if (!nextText || !Array.isArray(urls) || urls.length === 0) {
    return nextText;
  }

  urls.forEach((url) => {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return;
    }
    nextText = stripUrlFromText(nextText, normalizedUrl);
  });

  return nextText;
}

/**
 * Builds the visible post text after duplicate card and quote URLs were removed.
 * @param {object} post - Normalized post-like object with text and optional external card.
 * @param {object} options - Cleanup callbacks.
 * @param {(value: string, url: string) => string} options.stripUrlFromText - Callback that removes one URL from the text.
 * @param {(quote: object) => string[]} options.getQuoteUrls - Callback that returns all visible quote URLs.
 * @returns {string} Cleaned display text.
 */
function buildPostDisplayText(post = {}, options = {}) {
  const text = String(post?.text || "");
  if (!text) {
    return "";
  }

  const stripUrlFromText = typeof options.stripUrlFromText === "function"
    ? options.stripUrlFromText
    : ((value) => String(value || ""));
  const getQuoteUrls = typeof options.getQuoteUrls === "function"
    ? options.getQuoteUrls
    : (() => []);
  const externalCardUri = String(post?.externalCard?.uri || post?.externalCard?.url || "").trim();
  let displayText = text;

  if (externalCardUri) {
    displayText = stripUrlFromText(displayText, externalCardUri);
  }

  const quoteUrls = getQuoteUrls(post?.quoteCard || null);
  displayText = stripPostUrlsFromText(displayText, quoteUrls, {
    stripUrlFromText,
  });

  return displayText
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Builds a neutral display model for one external link card.
 * @param {object} externalCard - External card data with URL, title, description, and metadata.
 * @param {object} options - Display formatting callbacks.
 * @param {(value: unknown) => object|null} options.normalizeStandardSite - Callback that normalizes publication metadata.
 * @param {(site: object|null) => string} options.getPublicationFooterLabel - Callback that returns a publication footer label.
 * @param {(url: string) => string} options.shortenUrl - Callback that shortens URLs for visible display.
 * @returns {{url: string, title: string, description: string, thumb: string, displayUrl: string, footer: string, standardSite: object|null, isPublication: boolean}|null} Prepared display model or `null`.
 */
function buildExternalCardDisplayModel(externalCard = {}, options = {}) {
  const url = String(externalCard?.uri || externalCard?.url || "").trim();
  if (!url) {
    return null;
  }

  const normalizeStandardSite = typeof options.normalizeStandardSite === "function"
    ? options.normalizeStandardSite
    : (() => null);
  const getPublicationFooterLabel = typeof options.getPublicationFooterLabel === "function"
    ? options.getPublicationFooterLabel
    : (() => "");
  const shortenUrl = typeof options.shortenUrl === "function"
    ? options.shortenUrl
    : ((value) => String(value || ""));
  const standardSite = normalizeStandardSite(externalCard?.standardSite);
  const publicationFooterLabel = String(getPublicationFooterLabel(standardSite) || "").trim();
  const displayUrl = shortenUrl(url);
  let footer = displayUrl;

  if (publicationFooterLabel) {
    footer = `${displayUrl} - ${publicationFooterLabel}`;
  }

  return {
    url,
    title: String(externalCard?.title || "").trim(),
    description: String(externalCard?.description || "").trim(),
    thumb: String(externalCard?.thumb || "").trim(),
    displayUrl,
    footer,
    standardSite,
    isPublication: Boolean(standardSite),
  };
}

/**
 * Builds one compact preview list for quoted images.
 * @param {object} quote - Normalized quoted post with optional images.
 * @param {number} maxImages - Maximum number of preview images.
 * @returns {Array<{source: string, alt: string, imageIndex: number}>} Ordered image preview entries.
 */
function buildQuoteImagePreviewEntries(quote = {}, maxImages = 4) {
  const images = Array.isArray(quote?.images) ? quote.images : [];
  const previewEntries = [];

  images.slice(0, maxImages).forEach((image, imageIndex) => {
    previewEntries.push({
      source: String(image?.thumb || image?.fullsize || "").trim(),
      alt: String(image?.alt || "").trim(),
      imageIndex,
    });
  });

  return previewEntries;
}

/**
 * Builds a neutral display model for one quoted post card.
 * @param {object} quote - Normalized quoted post.
 * @param {object} options - Formatting and URL callbacks.
 * @param {string} options.fallbackAuthorLabel - Fallback author label when the quote has no visible actor name.
 * @param {string} options.noTextFallback - Fallback text when the quote has no visible text.
 * @param {(quote: object) => string} options.buildPostUrl - Callback that returns the visible post URL.
 * @param {(actor: object, fallbackLabel: string) => {authorLabel: string, handleLabel: string}} options.getAuthorFields - Callback that builds visible author fields.
 * @param {(post: object, options?: object) => string} options.buildMetaText - Callback that builds the visible meta line.
 * @param {(externalCard: object) => object|null} options.buildExternalCardDisplay - Callback that prepares the visible external card model.
 * @returns {{uri: string, url: string, authorLabel: string, handleLabel: string, text: string, metaText: string, imagePreviewEntries: Array<object>, images: Array<object>, externalCardDisplay: object|null}|null} Prepared quote display model or `null`.
 */
function buildQuoteCardDisplayModel(quote = {}, options = {}) {
  const uri = String(quote?.uri || "").trim();
  if (!uri) {
    return null;
  }

  const buildPostUrl = typeof options.buildPostUrl === "function" ? options.buildPostUrl : (() => "");
  const url = String(buildPostUrl(quote) || "").trim();
  if (!url) {
    return null;
  }

  const fallbackAuthorLabel = String(options.fallbackAuthorLabel || "").trim();
  const noTextFallback = String(options.noTextFallback || "").trim();
  const getAuthorFields = typeof options.getAuthorFields === "function"
    ? options.getAuthorFields
    : ((actor, fallbackLabel) => getPostAuthorFields(actor, fallbackLabel));
  const buildMetaTextCallback = typeof options.buildMetaText === "function"
    ? options.buildMetaText
    : ((post) => buildPostMetaText(post));
  const buildExternalCardDisplay = typeof options.buildExternalCardDisplay === "function"
    ? options.buildExternalCardDisplay
    : ((externalCard) => buildExternalCardDisplayModel(externalCard));
  const authorFields = getAuthorFields(quote.author || {}, fallbackAuthorLabel);
  const visibleText = String(quote?.text || "").trim();
  const imagePreviewEntries = buildQuoteImagePreviewEntries(quote);
  const images = Array.isArray(quote?.images) ? quote.images : [];

  return {
    uri,
    url,
    authorLabel: String(authorFields?.authorLabel || "").trim(),
    handleLabel: String(authorFields?.handleLabel || "").trim(),
    text: visibleText || noTextFallback,
    metaText: String(buildMetaTextCallback(quote, options) || "").trim(),
    imagePreviewEntries,
    images,
    externalCardDisplay: buildExternalCardDisplay(quote?.externalCard || null),
  };
}

/**
 * Builds a neutral display model for one live post card.
 * @param {object} post - Normalized live post or Thread Explorer post.
 * @param {object} options - Formatting, fallback, and helper callbacks.
 * @param {string} options.fallbackAuthorLabel - Fallback author label when the post has no visible actor name.
 * @param {string} options.noTextFallback - Fallback text when the post has no visible text.
 * @param {string} options.deletedTitle - Title shown for deleted thread anchors.
 * @param {string} options.deletedText - Text shown for deleted thread anchors.
 * @param {(actor: object, fallbackLabel: string) => {authorLabel: string, handleLabel: string}} options.getAuthorFields - Callback that builds visible author fields.
 * @param {(post: object, options?: object) => string} options.buildMetaText - Callback that builds the visible meta line.
 * @param {(post: object, options?: object) => string} options.buildDisplayText - Callback that builds the visible post text.
 * @param {(externalCard: object) => object|null} options.buildExternalCardDisplay - Callback that prepares the visible external card model.
 * @param {(post: object, interactiveTypes: string[]) => Array<object>} options.buildMetricEntries - Callback that prepares visible metric entries.
 * @param {string[]} options.interactiveMetricTypes - Metric types that should be marked interactive.
 * @returns {{uri: string, isDeletedThreadAnchor: boolean, authorLabel: string, handleLabel: string, metaText: string, text: string, externalCardDisplay: object|null, metricEntries: Array<object>}|null} Prepared post display model or `null`.
 */
function buildPostCardDisplayModel(post = {}, options = {}) {
  const uri = String(post?.uri || "").trim();
  if (!uri) {
    return null;
  }

  const isDeletedThreadAnchor = post?.isDeletedThreadAnchor === true;
  if (isDeletedThreadAnchor) {
    return {
      uri,
      isDeletedThreadAnchor: true,
      authorLabel: String(options.deletedTitle || "").trim(),
      handleLabel: uri.replace(/^at:\/\//, ""),
      metaText: "",
      text: String(options.deletedText || "").trim(),
      externalCardDisplay: null,
      metricEntries: [],
    };
  }

  const fallbackAuthorLabel = String(options.fallbackAuthorLabel || "").trim();
  const noTextFallback = String(options.noTextFallback || "").trim();
  const getAuthorFields = typeof options.getAuthorFields === "function"
    ? options.getAuthorFields
    : ((actor, nextFallbackLabel) => getPostAuthorFields(actor, nextFallbackLabel));
  const buildMetaTextCallback = typeof options.buildMetaText === "function"
    ? options.buildMetaText
    : ((nextPost) => buildPostMetaText(nextPost));
  const buildDisplayTextCallback = typeof options.buildDisplayText === "function"
    ? options.buildDisplayText
    : ((nextPost) => buildPostDisplayText(nextPost));
  const buildExternalCardDisplay = typeof options.buildExternalCardDisplay === "function"
    ? options.buildExternalCardDisplay
    : ((externalCard) => buildExternalCardDisplayModel(externalCard));
  const buildMetricEntries = typeof options.buildMetricEntries === "function"
    ? options.buildMetricEntries
    : ((nextPost, interactiveTypes = []) => buildPostMetricEntries(nextPost, {
      interactiveTypes,
    }));
  const interactiveMetricTypes = Array.isArray(options.interactiveMetricTypes) ? options.interactiveMetricTypes : [];
  const authorFields = getAuthorFields(post.author || {}, fallbackAuthorLabel);
  const visibleText = String(buildDisplayTextCallback(post, options) || "").trim();

  return {
    uri,
    isDeletedThreadAnchor: false,
    authorLabel: String(authorFields?.authorLabel || "").trim(),
    handleLabel: String(authorFields?.handleLabel || "").trim(),
    metaText: String(buildMetaTextCallback(post, options) || "").trim(),
    text: visibleText || noTextFallback,
    externalCardDisplay: buildExternalCardDisplay(post?.externalCard || null),
    metricEntries: buildMetricEntries(post, interactiveMetricTypes),
  };
}

/**
 * Builds the visible view-link model for one post-like object.
 * @param {object} post - Normalized post-like object.
 * @param {object} options - URL and label options.
 * @param {(post: object) => string} options.buildPostUrl - Callback that returns the visible web URL.
 * @param {string} options.linkText - Visible link text inside the card.
 * @returns {{isVisible: boolean, url: string, text: string}|null} Prepared view-link model or `null`.
 */
function buildPostViewLinkModel(post = {}, options = {}) {
  const buildPostUrl = typeof options.buildPostUrl === "function" ? options.buildPostUrl : (() => "");
  const url = String(buildPostUrl(post) || "").trim();
  if (!url) {
    return null;
  }

  return {
    isVisible: true,
    url,
    text: String(options.linkText || "").trim(),
  };
}

/**
 * Builds the visible edit-button model for one post-like object.
 * @param {object} post - Normalized post-like object.
 * @returns {{isVisible: boolean, uri: string}} Prepared edit-button model.
 */
function buildPostEditButtonModel(post = {}) {
  const uri = String(post?.uri || "").trim();
  const isVisible = post?.editInfo?.isEdited === true && Boolean(uri);

  return {
    isVisible,
    uri,
  };
}

/**
 * Builds the visible live-interaction model for one post-like object.
 * @param {object} post - Normalized live post.
 * @param {object} options - Interaction state options.
 * @param {(post: object) => boolean} options.isLiked - Callback that returns whether the current viewer likes the post.
 * @param {(uri: string) => boolean} options.isLikePending - Callback that returns whether the post is currently being liked or unliked.
 * @returns {{hasValidPost: boolean, canReply: boolean, canLike: boolean, isLiked: boolean, isLikePending: boolean, likeTranslationKey: string}} Prepared interaction model.
 */
function buildLivePostInteractionModel(post = {}, options = {}) {
  const uri = String(post?.uri || "").trim();
  const cid = String(post?.cid || "").trim();
  const hasValidPost = Boolean(uri && cid);
  const isLiked = hasValidPost && typeof options.isLiked === "function" ? options.isLiked(post) === true : false;
  const isLikePending = hasValidPost && typeof options.isLikePending === "function" ? options.isLikePending(uri) === true : false;
  let likeTranslationKey = "threadExplorerLikeAction";

  if (isLiked) {
    likeTranslationKey = "threadExplorerUnlikeAction";
  }

  return {
    hasValidPost,
    canReply: hasValidPost,
    canLike: hasValidPost,
    isLiked,
    isLikePending,
    likeTranslationKey,
  };
}

/**
 * Extracts one external-card-like object from nested embed structures.
 * @param {object} embed - Raw embed payload from DMs or posts.
 * @returns {{url: string, title: string, description: string, thumb: string}|null} Extracted external card or `null`.
 */
function extractExternalCardFromEmbed(embed) {
  if (!embed || typeof embed !== "object") {
    return null;
  }

  const external = embed.external && typeof embed.external === "object"
    ? embed.external
    : embed.card && typeof embed.card === "object"
      ? embed.card
      : embed.link && typeof embed.link === "object"
        ? embed.link
        : embed;
  const url = String(external.uri || external.url || "").trim();
  const title = String(external.title || "").trim();
  const description = String(external.description || "").trim();
  const thumb = String(external.thumb || external.thumbnail || external.image || "").trim();

  if (url) {
    return {
      url,
      title,
      description,
      thumb,
    };
  }

  if (embed.media) {
    return extractExternalCardFromEmbed(embed.media);
  }

  if (Array.isArray(embed.embeds)) {
    for (const nestedEmbed of embed.embeds) {
      const match = extractExternalCardFromEmbed(nestedEmbed);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export {
  applyLikeStateToPost,
  buildExternalCardDisplayModel,
  buildPostCardDisplayModel,
  buildPostDisplayText,
  buildPostEditButtonModel,
  buildPostMetaText,
  buildPostMetricEntries,
  buildPostMetricLabels,
  buildPostViewLinkModel,
  buildQuoteCardDisplayModel,
  buildQuoteImagePreviewEntries,
  buildSearchResultMetaText,
  buildLivePostInteractionModel,
  extractExternalCardFromEmbed,
  formatPostCount,
  formatPostDateTime,
  getPostAuthorFields,
  getPostMetricCounts,
  getPostActorLabel,
  getPostHandleLabel,
  getPostPreviewText,
  getViewerLikeUri,
  isPostLikedByViewer,
  stripPostUrlsFromText,
};


/** Creates text presentation using explicit DOM and query parsing adapters.
 * @param {object} options - document, nodeFilter, queryTerms and escape callbacks.
 * @returns {object} utf16/runs/highlight/clear API.
 */
export function createRichTextPresentation(options) {
  if (typeof options?.queryTerms !== "function" || typeof options?.escape !== "function") { throw new TypeError("Rich-text presentation requires query adapters"); }
  const { document, nodeFilter: NodeFilter, queryTerms: parseSearchQueryTerms, escape: escapeSearchHighlightRegex } = options;
  /** Converts a UTF-8 byte offset into a UTF-16 index. @param {string} text - Text. @param {number} byteIndex - Byte offset. @returns {number} Character offset. */
  function utf8IndexToUtf16Index(text, byteIndex) {
    const value = String(text || "");
    const bytes = Math.max(0, Number(byteIndex) || 0);
    let currentBytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const codePoint = value.codePointAt(index);
      const char = String.fromCodePoint(codePoint);
      const nextBytes = currentBytes + new TextEncoder().encode(char).length;
      if (nextBytes > bytes) {
        return index;
      }
      currentBytes = nextBytes;
      if (codePoint > 0xffff) {
        index += 1;
      }
    }
    return value.length;
  }

  /** Builds a facet navigation model. @param {object} feature - Facet feature. @param {string} rawText - Selected text. @returns {object|null} Link model. */
  function getFacetLinkInfo(feature, rawText = "") {
    const type = String(feature?.$type || "");
    if (type.includes("#link") && feature?.uri) {
      return {
        kind: "link",
        url: String(feature.uri),
      };
    }
    if (type.includes("#mention")) {
      const handle = String(rawText || "").trim().replace(/^@/, "");
      return {
        kind: "mention",
        url: `https://bsky.app/profile/${encodeURIComponent(handle || feature.did || "")}`,
      };
    }
    if (type.includes("#tag")) {
      const tag = String(feature.tag || rawText || "").trim().replace(/^#/, "");
      return {
        kind: "tag",
        url: `https://bsky.app/hashtag/${encodeURIComponent(tag)}`,
      };
    }
    return null;
  }

  /** Splits post text into plain/link runs. @param {string} text - Post text. @param {Array} facets - Facets. @returns {Array|null} Runs. */
  function extractFacetRichTextRuns(text, facets = []) {
    const value = String(text || "");
    const facetRanges = [];

    (Array.isArray(facets) ? facets : []).forEach((facet) => {
      const byteStart = Number(facet?.index?.byteStart);
      const byteEnd = Number(facet?.index?.byteEnd);
      if (!Number.isFinite(byteStart) || !Number.isFinite(byteEnd) || byteEnd <= byteStart) {
        return;
      }
      const start = utf8IndexToUtf16Index(value, byteStart);
      const end = utf8IndexToUtf16Index(value, byteEnd);
      if (end <= start) {
        return;
      }
      const rawText = value.slice(start, end);
      const feature = (Array.isArray(facet?.features) ? facet.features : [])
        .map((entry) => getFacetLinkInfo(entry, rawText))
        .find(Boolean);
      if (!feature?.url) {
        return;
      }
      facetRanges.push({
        start,
        end,
        url: feature.url,
        kind: feature.kind,
      });
    });

    facetRanges.sort((left, right) => left.start - right.start || left.end - right.end);
    const runs = [];
    let cursor = 0;

    facetRanges.forEach((range) => {
      if (range.start < cursor) {
        return;
      }
      if (range.start > cursor) {
        runs.push({ text: value.slice(cursor, range.start) });
      }
      runs.push({
        text: value.slice(range.start, range.end),
        url: range.url,
        kind: range.kind,
      });
      cursor = range.end;
    });

    if (cursor < value.length) {
      runs.push({ text: value.slice(cursor) });
    }

    return runs.length > 0 ? runs : null;
  }

  /** Removes only generated highlights. @param {Element} element - Host. @returns {void} Updated DOM. */
  function clearSearchHighlights(element) {
    if (!element) {
      return;
    }

    element.querySelectorAll("mark[data-search-highlight='true']").forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) {
        return;
      }
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    });
  }

  /** Highlights query matches using text nodes. @param {Element} element - Host. @param {string} query - Query. @returns {void} Updated DOM. */
  function highlightSearchQueryInElement(element, query = "") {
    clearSearchHighlights(element);
    if (!element) {
      return;
    }

    const terms = parseSearchQueryTerms(query);
    if (!terms.length) {
      return;
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parentTag = node.parentElement?.tagName || "";
        if (parentTag === "MARK" || parentTag === "SCRIPT" || parentTag === "STYLE") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const source = node.nodeValue || "";
      const matches = [];

      terms.forEach((term) => {
        const escapedTerm = escapeSearchHighlightRegex(term);
        if (!escapedTerm) {
          return;
        }

        const matcher = new RegExp(escapedTerm, "giu");

        let match = matcher.exec(source);
        while (match) {
          const directMatch = String(match[0] || "");
          const start = match.index;
          const end = start + directMatch.length;
          if (end > start) {
            matches.push({
              start,
              end,
              length: end - start,
            });
          }
          match = matcher.exec(source);
        }
      });

      if (!matches.length) {
        return;
      }

      matches.sort((left, right) => {
        if (left.start !== right.start) {
          return left.start - right.start;
        }
        return right.length - left.length;
      });

      const filteredMatches = [];
      let lastEnd = -1;
      matches.forEach((entry) => {
        if (entry.start < lastEnd) {
          return;
        }
        filteredMatches.push(entry);
        lastEnd = entry.end;
      });

      if (!filteredMatches.length) {
        return;
      }

      const fragment = document.createDocumentFragment();
      let cursor = 0;
      filteredMatches.forEach((entry) => {
        if (entry.start > cursor) {
          fragment.appendChild(document.createTextNode(source.slice(cursor, entry.start)));
        }
        const mark = document.createElement("mark");
        mark.dataset.searchHighlight = "true";
        mark.textContent = source.slice(entry.start, entry.end);
        fragment.appendChild(mark);
        cursor = entry.end;
      });
      if (cursor < source.length) {
        fragment.appendChild(document.createTextNode(source.slice(cursor)));
      }

      node.parentNode?.replaceChild(fragment, node);
    });
  }
  return { utf16: utf8IndexToUtf16Index, runs: extractFacetRichTextRuns, highlight: highlightSearchQueryInElement, clear: clearSearchHighlights };
}

/** Escapes text for literal use in a regular expression.
 * @param {string} value - Literal text.
 * @returns {string} Escaped pattern.
 */
export function escapeThreadExplorerRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a compact display URL for Thread Explorer cards.
 * @param {string} url - Full target URL.
 * @returns {string} Short host/path label without tracking query parameters.
 */
export function shortenThreadExplorerUrlForDisplay(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    let compact = parsed.hostname;
    if (parsed.pathname && parsed.pathname !== "/") {
      compact += parsed.pathname;
    }
    if (parsed.hash) {
      compact += parsed.hash;
    }
    if (compact.length > 72) {
      return `${compact.slice(0, 69)}...`;
    }
    return compact;
  } catch (error) {
    if (value.length > 72) {
      return `${value.slice(0, 69)}...`;
    }
    return value;
  }
}

/**
 * Removes URL variants for a rendered card from Thread Explorer post text.
 * @param {string} text - Current display text.
 * @param {string} url - Card target URL.
 * @returns {string} Text without duplicate URL fragments.
 */
export function removeThreadExplorerCardUrlFromText(text, url) {
  let nextText = String(text || "");
  const value = String(url || "").trim();
  if (!nextText || !value) {
    return nextText;
  }

  const variants = new Set([value]);
  try {
    const parsed = new URL(value);
    let hostPath = parsed.hostname;
    if (parsed.pathname && parsed.pathname !== "/") {
      hostPath += parsed.pathname;
    }
    variants.add(hostPath);
    if (hostPath.startsWith("www.")) {
      variants.add(hostPath.slice(4));
    } else {
      variants.add(`www.${hostPath}`);
    }
  } catch (error) {
    // Keep exact variant only.
  }

  variants.forEach((variant) => {
    if (!variant) {
      return;
    }
    const escaped = escapeThreadExplorerRegExp(variant);
    const exactPattern = new RegExp(`(^|\\s)(?:https?:\\/\\/)?${escaped}(?:[?#][^\\s]*)?(?:\\.\\.\\.|…)?(?=\\s|$)`, "g");
    nextText = nextText.replace(exactPattern, "$1");
  });

  try {
    const parsed = new URL(value);
    let hostPattern = escapeThreadExplorerRegExp(parsed.hostname);
    if (parsed.hostname.startsWith("www.")) {
      hostPattern = `(?:www\\.)?${escapeThreadExplorerRegExp(parsed.hostname.slice(4))}`;
    }
    const linePattern = new RegExp(`(^|\\n)[ \\t]*(?:https?:\\/\\/)?${hostPattern}(?:\\/[^\\n\\s]*)?(?:\\.\\.\\.|…)?[ \\t]*(?=\\n|$)`, "g");
    nextText = nextText.replace(linePattern, "$1");
  } catch (error) {
    // Invalid URLs do not get hostname line cleanup.
  }

  return nextText;
}

/**
 * Computes an engagement score for one Thread Explorer post.
 * @param {object} post - Normalized Thread Explorer post.
 * @returns {number} Weighted score from likes, replies, reposts, and quotes.
 */
export function getThreadExplorerEngagementScore(post) {
  const likes = Number(post?.likeCount) || 0;
  const replies = Number(post?.replyCount) || 0;
  const reposts = Number(post?.repostCount) || 0;
  const quotes = Number(post?.quoteCount) || 0;
  return likes + (replies * 3) + (reposts * 4) + (quotes * 4);
}

/**
 * Converts an engagement score into a visual intensity tier.
 * @param {number} score - Weighted post engagement score.
 * @returns {string} Engagement tier name for CSS classes.
 */
export function getThreadExplorerEngagementTier(score) {
  const numericScore = Number(score) || 0;
  if (numericScore >= 1000) {
    return "viral";
  }
  if (numericScore >= 180) {
    return "hot";
  }
  if (numericScore >= 40) {
    return "warm";
  }
  return "quiet";
}

/** Reads a stored external card only when it has a target URL.
 * @param {object|null} post - Archived post.
 * @returns {object|null} Original card or null.
 */
export function getArchiveExternalCard(post = {}) {
  if (post?.externalCard?.url) {
    return post.externalCard;
  }
  return null;
}

/** Splits edit text into whitespace, word and punctuation runs.
 * @param {string} text - Original or current post text.
 * @returns {string[]} Tokens retaining all source characters.
 */
export function tokenizePostEditText(text) {
  return String(text || "").match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu) || [];
}

/** Marks inserted current-text tokens using a longest common subsequence.
 * @param {string} originalText - Previous post text.
 * @param {string} currentText - Updated post text.
 * @returns {{token:string,changed:boolean}[]} Current tokens with change flags.
 */
export function getCurrentPostEditTokenStates(originalText, currentText) {
  const originalTokens = tokenizePostEditText(originalText);
  const currentTokens = tokenizePostEditText(currentText);
  const rows = originalTokens.length + 1;
  const columns = currentTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex -= 1) {
    for (let currentIndex = currentTokens.length - 1; currentIndex >= 0; currentIndex -= 1) {
      matrix[originalIndex][currentIndex] = originalTokens[originalIndex] === currentTokens[currentIndex]
        ? matrix[originalIndex + 1][currentIndex + 1] + 1
        : Math.max(matrix[originalIndex + 1][currentIndex], matrix[originalIndex][currentIndex + 1]);
    }
  }

  const unchangedCurrentIndexes = new Set();
  let originalIndex = 0;
  let currentIndex = 0;
  while (originalIndex < originalTokens.length && currentIndex < currentTokens.length) {
    if (originalTokens[originalIndex] === currentTokens[currentIndex]) {
      unchangedCurrentIndexes.add(currentIndex);
      originalIndex += 1;
      currentIndex += 1;
    } else if (matrix[originalIndex + 1][currentIndex] >= matrix[originalIndex][currentIndex + 1]) {
      originalIndex += 1;
    } else {
      currentIndex += 1;
    }
  }

  return currentTokens.map((token, index) => ({
    token,
    changed: !unchangedCurrentIndexes.has(index),
  }));
}


/** Applies a like update to cached posts. @param {...*} args - Collection/tree, post URI, like URI and count delta. @returns {void} Mutates matching posts. */
export function applyLikeStateToItemCollection(items = [], postUri = "", likeUri = "", delta = 0) {
  if (!Array.isArray(items) || !postUri) {
    return;
  }

  items.forEach((item) => {
    const post = item?.post || null;
    if (!post || post.uri !== postUri) {
      return;
    }
    applyLikeStateToPost(post, likeUri, delta);
  });
}

/** Applies a like update to cached posts. @param {...*} args - Collection/tree, post URI, like URI and count delta. @returns {void} Mutates matching posts. */
export function applyLikeStateToThreadTree(node = null, postUri = "", likeUri = "", delta = 0) {
  if (!node || !postUri) {
    return;
  }

  if (node.post?.uri === postUri) {
    applyLikeStateToPost(node.post, likeUri, delta);
  }

  const replies = Array.isArray(node.replies) ? node.replies : [];
  replies.forEach((reply) => {
    applyLikeStateToThreadTree(reply, postUri, likeUri, delta);
  });
}

/** Creates provider-aware web links and target labels from explicit service configuration.
 * @param {object} options - normalizeService callback, frontends mapping and defaultWebApp string.
 * @returns {object} Frozen target/base/post-URL operations.
 */
export function createPostLinkModels(options) {
  if (typeof options?.normalizeService !== 'function') { throw new TypeError('Post link models require normalizeService'); }
  const { normalizeService: normalizeServiceUrl, frontends: POST_WEB_FRONTENDS, defaultWebApp: DEFAULT_POST_WEB_APP } = options;
  function getPostTargetName(webApp) {
    try {
      return new URL(normalizeServiceUrl(webApp)).hostname.toLowerCase() === "mu.social"
        ? "Mu.social"
        : "Bluesky";
    } catch {
      return "Bluesky";
    }
  }

  function resolvePostWebBase(serviceUrl) {
    try {
      const normalizedService = normalizeServiceUrl(serviceUrl);
      const host = new URL(normalizedService).hostname.toLowerCase();
      return POST_WEB_FRONTENDS[host] || DEFAULT_POST_WEB_APP;
    } catch {
      return DEFAULT_POST_WEB_APP;
    }
  }

  function buildBlueskyPostUrl(handle, uri, serviceUrl) {
    const parts = String(uri || "").split("/");
    const recordId = parts[parts.length - 1];

    if (!handle || !recordId) {
      return "";
    }

    return `${resolvePostWebBase(serviceUrl)}/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordId)}`;
  }


  return Object.freeze({ getPostTargetName, resolvePostWebBase, buildBlueskyPostUrl });
}

/** Formats history/export dates while preserving invalid input fallback.
 * @param {*} value - Date-compatible timestamp.
 * @param {string} locale - Current language.
 * @returns {string} Localized timestamp or original value.
 */
export function formatApplicationTimestamp(value, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Selects a post frontend from author domain or saved favorite metadata.
 * @param {object} post - Post author and URI.
 * @param {Array} favorites - Saved posts.
 * @param {object} presets - Configured service URLs.
 * @param {string} defaultWebApp - Fallback frontend.
 * @returns {string} Selected web application.
 */
export function selectPostWebApplication(post, favorites, presets, defaultWebApp) {
  const handle = String(post?.author?.handle || "").toLowerCase();
  if (handle.endsWith(".eurosky.social") || handle.endsWith(".mu.social")) {
    return presets["mu.social"];
  }

  const favorite = favorites.find((entry) => entry.rootUri === post?.uri || entry.selectedUri === post?.uri);
  if (favorite?.webApp) {
    return favorite.webApp;
  }

  return defaultWebApp;
}

/** Collects visible quote URL variants without duplicates.
 * @param {object} quote - Quoted post.
 * @param {Function} postUrl - Builds its primary URL.
 * @param {Function} recordKey - Reads its URI key.
 * @param {string} defaultWebApp - Default frontend.
 * @param {string} alternateWebApp - Alternate frontend.
 * @returns {string[]} URLs to remove from duplicate display text.
 */
export function collectPostQuoteUrls(quote, postUrl, recordKey, defaultWebApp, alternateWebApp) {
  const quoteUrls = new Set();
  const quoteUrl = postUrl(quote);
  if (quoteUrl) {
    quoteUrls.add(quoteUrl);
  }

  const quoteHandle = String(quote?.author?.handle || "").trim();
  const quoteRecordKey = recordKey(quote?.uri);
  if (quoteHandle && quoteRecordKey) {
    quoteUrls.add(`${defaultWebApp}/profile/${encodeURIComponent(quoteHandle)}/post/${encodeURIComponent(quoteRecordKey)}`);
    quoteUrls.add(`${alternateWebApp}/profile/${encodeURIComponent(quoteHandle)}/post/${encodeURIComponent(quoteRecordKey)}`);
  }

  return Array.from(quoteUrls);
}
