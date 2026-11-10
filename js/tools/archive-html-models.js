const ARCHIVE_HTML_I18N_KEYS = [
    "profilePronounsLabel",
    "profileLinksLabel",
    "archiveHeaderEyebrow",
    "archiveHtmlTitle",
    "archiveHtmlGenerated",
    "archiveSummaryPosts",
    "archiveSummaryImages",
    "archiveSkippedImagesLabel",
    "archiveSkippedImagesNotice",
    "archiveHtmlArchiveRangeLabel",
    "archiveHtmlArchiveRangeValue",
    "archiveHtmlSearchLabel",
    "archiveFromLabel",
    "archiveToLabel",
    "archiveHtmlOnlyImages",
    "archiveHtmlOnlyThreads",
    "archiveHtmlResetFilters",
    "archiveHtmlIndentThreads",
    "archiveHtmlExpandThreads",
    "archiveHtmlCollapseThreads",
    "archiveHtmlExpandSingles",
    "archiveHtmlCollapseSingles",
    "archiveHtmlToggleAllOpen",
    "archiveHtmlToggleAllClose",
    "archiveHtmlHashtagsLabel",
    "archiveHtmlHashtagsEmpty",
    "archiveHtmlVisibleStatus",
    "archiveHtmlNoMatches",
    "archiveHtmlFilterSummary",
    "archiveHtmlFilterHashtagsSuffix",
    "archiveHtmlLoadImage",
    "archiveHtmlOpenImage",
    "archiveHtmlOpenPost",
    "archiveHtmlEditedBadge",
    "archiveHtmlEditDetailsButton",
    "archiveHtmlEditDialogTitle",
    "archiveHtmlEditDialogNote",
    "archiveHtmlEditOriginal",
    "archiveHtmlEditCurrent",
    "archiveHtmlLinksSummary",
    "archiveHtmlLinksEmpty",
    "archiveHtmlLinksPostLabel",
    "archiveHtmlThreadSummary",
    "archiveHtmlSingleSummary",
    "archiveHtmlNoText",
    "archivePdfAltPrefix",
    "closeButton",
  ];

export const ARCHIVE_HTML_EMBED_RECOMMENDED_MAX_BYTES = 48 * 1024 * 1024;

/**
 * Groups posts chronologically and orders each thread parent-first.
 * @param {object[]} posts - Archive posts.
 * @returns {object[]} Groups with ordered posts, dates and image counts.
 */
export function buildArchiveThreadGroups(posts = []) {
  const orderedPosts = [...posts].sort((left, right) => Date.parse(left.createdAt || 0) - Date.parse(right.createdAt || 0));
  const groups = [];
  const groupMap = new Map();

  orderedPosts.forEach((post, index) => {
    const key = post?.thread?.rootUri || post?.uri || `post-${index + 1}`;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        key,
        posts: [],
      };
      groupMap.set(key, group);
      groups.push(group);
    }
    group.posts.push(post);
  });

  return groups.map((group) => {
    const orderedThreadPosts = orderArchiveGroupPostsByThread(group.posts);
    const createdValues = group.posts
      .map((post) => Date.parse(post.createdAt || 0))
      .filter((value) => Number.isFinite(value));
    let minCreated = 0;
    let maxCreated = 0;
    if (createdValues.length > 0) {
      minCreated = Math.min(...createdValues);
      maxCreated = Math.max(...createdValues);
    }
    const imageCount = orderedThreadPosts.reduce((total, post) => total + ((post.images || []).length), 0);
    const hasReplies = orderedThreadPosts.some((post) => Boolean(post?.thread?.parentUri));
    return {
      ...group,
      posts: orderedThreadPosts,
      isThread: orderedThreadPosts.length > 1 || hasReplies,
      hasImages: imageCount > 0,
      imageCount,
      minCreated,
      maxCreated,
    };
  });
}

/**
 * Orders roots and descendants once, including disconnected or cyclic records.
 * @param {object[]} posts - Group posts.
 * @returns {object[]} Parent-first posts with unique URIs.
 */
function orderArchiveGroupPostsByThread(posts = []) {
  const byUri = new Map();
  const childrenByParent = new Map();
  const rootCandidates = [];

  const chronological = [...posts].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0) || 0;
    const rightTime = Date.parse(right.createdAt || 0) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left.uri || "").localeCompare(String(right.uri || ""));
  });

  chronological.forEach((post) => {
    if (post?.uri) {
      byUri.set(post.uri, post);
    }
  });

  chronological.forEach((post) => {
    const parentUri = post?.thread?.parentUri || "";
    if (parentUri && byUri.has(parentUri)) {
      if (!childrenByParent.has(parentUri)) {
        childrenByParent.set(parentUri, []);
      }
      childrenByParent.get(parentUri).push(post);
      return;
    }
    rootCandidates.push(post);
  });

  const ordered = [];
  const seen = new Set();

  /**
   * Appends one unseen post before its descendants.
   * @param {object} post - Post to visit.
   * @returns {void}
   */
  function visit(post) {
    if (!post?.uri || seen.has(post.uri)) {
      return;
    }
    seen.add(post.uri);
    ordered.push(post);
    const children = childrenByParent.get(post.uri) || [];
    children.forEach((child) => visit(child));
  }

  const explicitRoots = rootCandidates.sort((left, right) => {
    const leftRoot = left?.thread?.rootUri || left?.uri || "";
    const rightRoot = right?.thread?.rootUri || right?.uri || "";
    const leftIsRoot = leftRoot === (left?.uri || "");
    const rightIsRoot = rightRoot === (right?.uri || "");
    if (leftIsRoot !== rightIsRoot) {
      if (leftIsRoot) {
        return -1;
      }
      return 1;
    }
    const leftTime = Date.parse(left.createdAt || 0) || 0;
    const rightTime = Date.parse(right.createdAt || 0) || 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left.uri || "").localeCompare(String(right.uri || ""));
  });

  explicitRoots.forEach((post) => visit(post));
  chronological.forEach((post) => visit(post));
  return ordered;
}

/**
 * Formats a valid timestamp as an ISO UTC date input value.
 * @param {*} value - Timestamp or date.
 * @returns {string} YYYY-MM-DD or an empty string.
 */
export function formatArchiveHtmlDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Shortens a URL without its scheme for display.
 * @param {*} url - URL text.
 * @returns {string} Display value limited to 72 characters.
 */
export function shortenArchiveUrlForDisplay(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }
  try {
    const parsed = new URL(value);
    let pathname = parsed.pathname;
    if (pathname === "/") {
      pathname = "";
    }
    const compact = `${parsed.hostname}${pathname}${parsed.search}${parsed.hash}`;
    if (compact.length > 72) {
      return `${compact.slice(0, 69)}...`;
    }
    return compact;
  } catch {
    if (value.length > 72) {
      return `${value.slice(0, 69)}...`;
    }
    return value;
  }
}

/**
 * Calculates capped parent depth without following cycles indefinitely.
 * @param {object[]} posts - Thread posts.
 * @returns {Map<string, number>} Depths capped at eight.
 */
export function buildArchiveThreadDepthMap(posts = []) {
  const byUri = new Map(posts.map((post) => [post.uri, post]));
  const depthCache = new Map();
  const resolving = new Set();

  /**
   * Resolves one depth with memoization and cycle detection.
   * @param {object} post - Thread post.
   * @returns {number} Capped parent depth.
   */
  function resolveDepth(post) {
    if (!post?.uri) {
      return 0;
    }
    if (depthCache.has(post.uri)) {
      return depthCache.get(post.uri);
    }

    const parentUri = post?.thread?.parentUri || "";
    if (!parentUri || !byUri.has(parentUri)) {
      depthCache.set(post.uri, 0);
      return 0;
    }

    if (resolving.has(post.uri)) {
      return 0;
    }
    resolving.add(post.uri);
    const depth = Math.min(8, resolveDepth(byUri.get(parentUri)) + 1);
    resolving.delete(post.uri);
    depthCache.set(post.uri, depth);
    return depth;
  }

  posts.forEach((post) => {
    resolveDepth(post);
  });
  return depthCache;
}

/**
 * Sums declared or available asset byte lengths.
 * @param {object[]} assets - Archive assets.
 * @returns {number} Nonnegative total size.
 */
export function getArchiveAssetTotalBytes(assets = []) {
  let source = [];
  if (Array.isArray(assets)) {
    source = assets;
  }
  return source.reduce((sum, asset) => (
    sum + Math.max(0, Number(asset?.sizeBytes) || asset?.bytes?.length || 0)
  ), 0);
}

/**
 * Recognizes the existing string-size fallback errors.
 * @param {*} error - Caught export error.
 * @returns {boolean} Whether compact retry is permitted.
 */
export function isArchiveStringLengthError(error) {
  const message = String(error?.message || "").trim().toLowerCase();
  return error instanceof RangeError
    || message.includes("invalid string length")
    || message.includes("string length");
}

/**
 * Checks the existing 48 MiB embedding recommendation.
 * @param {object[]} assets - Archive assets.
 * @returns {boolean} Whether compact export is recommended.
 */
export function shouldAutoFallbackArchiveHtmlToCompact(assets = []) {
  return getArchiveAssetTotalBytes(assets) > ARCHIVE_HTML_EMBED_RECOMMENDED_MAX_BYTES;
}

/**
 * Creates document data models without DOM, network or storage access.
 * @param {object} options - Translation, locale, hashtag/link, account and clock adapters.
 * @param {Function} options.t - Current-locale translation with replacement values.
 * @param {Function} options.locale - Current locale for hashtag ordering.
 * @param {Function} options.extractHashtags - Shared hashtag parser for one post.
 * @param {Function} options.linkRuns - Existing rich-text link resolver.
 * @param {Function} options.account - Fallback archive account handle.
 * @param {Function} options.now - Current export timestamp.
 * @param {string[]} options.locales - Supported client locales.
 * @param {object} options.translations - Complete locale message tables.
 * @param {string} options.defaultLocale - Translation fallback locale.
 * @param {Function} options.normalizeStandardSite - Existing publication-metadata adapter.
 * @param {Function} options.publicationFooter - Existing publication footer formatter.
 * @returns {{document: Function, tags: Function, links: Function, cardDisplay: Function}} Document metadata, collections and card data.
 */
export function createArchiveHtmlModels(options) {
  if (!options || typeof options.t !== "function" || typeof options.locale !== "function"
    || typeof options.extractHashtags !== "function" || typeof options.linkRuns !== "function"
    || typeof options.account !== "function" || typeof options.now !== "function"
    || typeof options.normalizeStandardSite !== "function" || typeof options.publicationFooter !== "function"
    || !Array.isArray(options.locales) || !options.translations) {
    throw new TypeError("Archive HTML models require translation, content, account and clock adapters.");
  }
  /**
   * Collects unique hashtags in locale order.
   * @param {object[]} posts - Archive posts.
   * @returns {object[]} Hashtag values and normalized keys.
   */
  function tags(posts = []) {
    const seen = new Set();
    const result = [];
    posts.forEach((post) => {
      options.extractHashtags(post.text).forEach((tag) => {
        if (!seen.has(tag.normalized)) {
          seen.add(tag.normalized);
          result.push(tag);
        }
      });
    });
    return result.sort((left, right) => left.value.localeCompare(right.value, options.locale(), { sensitivity: "base" }));
  }
  /**
   * Collects explicit link facets with their post context.
   * @param {object[]} posts - Archive posts.
   * @returns {object[]} Links sorted by date and URL.
   */
  function links(posts = []) {
    const result = [];
    posts.forEach((post) => {
      options.linkRuns(post.text || "", post.facets || []).forEach((run) => {
        if (!run.url || run.kind !== "link") {
          return;
        }
        result.push({ postUri: post.uri || "", postPermalink: post.permalink || "", url: run.url,
          displayUrl: shortenArchiveUrlForDisplay(run.url), authorHandle: post.authorHandle || "",
          authorDisplayName: post.authorDisplayName || "", createdAt: post.createdAt || "" });
      });
    });
    return result.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || 0) || 0;
      const rightTime = Date.parse(right.createdAt || 0) || 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return String(left.url || "").localeCompare(String(right.url || ""));
    });
  }
  /**
   * Formats the saved scope for initial and runtime copy.
   * @param {object} filters - Saved filters.
   * @param {boolean} runtime - Whether to retain the runtime separator.
   * @returns {string} Scope text.
   */
  function scope(filters, runtime) {
    if (filters.scope === "year") {
      return `${options.t("archiveYearLabel")} ${filters.year || "?"}`;
    }
    if (filters.scope === "range") {
      if (runtime) {
        return `${filters.from || "..."} - ${filters.to || "..."}`;
      }
      return `${filters.from || "…"} – ${filters.to || "…"}`;
    }
    return options.t("archiveScopeAll");
  }
  /**
   * Builds the client-side translation subset.
   * @returns {object} Locale-to-message tables.
   */
  function i18n() {
    return Object.fromEntries(options.locales.map((locale) => [locale,
      Object.fromEntries(ARCHIVE_HTML_I18N_KEYS.map((key) => [key,
        options.translations[locale]?.[key] || options.translations[options.defaultLocale]?.[key] || key])),
    ]));
  }
  /**
   * Prepares one export document.
   * @param {object} catalog - Catalog with a posts array.
   * @returns {object} Ordered content, copy and safe bootstrap data.
   */
  function document(catalog) {
    if (!catalog || !Array.isArray(catalog.posts)) {
      throw new TypeError("Archive HTML document requires a catalog with posts.");
    }
    const handle = catalog.manifest?.account?.handle || options.account() || "Bluesky";
    const exportedAtIso = catalog.manifest?.exportedAt || options.now().toISOString();
    const title = options.t("archiveHtmlTitle", { handle });
    const skippedImageCount = Number(catalog.summary?.skippedImageCount) || 0;
    const filters = catalog.manifest?.filters || {};
    let selectedTags = [];
    if (Array.isArray(filters.hashtagTags)) {
      selectedTags = filters.hashtagTags;
    }
    const filteredOutCount = Math.max(0, Number(catalog.manifest?.hashtagFilteredOutCount) || 0);
    let suffix = "";
    if (selectedTags.length > 0) {
      suffix = options.t("archiveHtmlFilterHashtagsSuffix", { count: selectedTags.length, skipped: filteredOutCount });
    }
    const fromValue = formatArchiveHtmlDateInputValue(catalog.summary?.from);
    const toValue = formatArchiveHtmlDateInputValue(catalog.summary?.to);
    return { handle, title, exportedAtIso, skippedImageCount, fromValue, toValue,
      groups: buildArchiveThreadGroups(catalog.posts), tags: tags(catalog.posts), links: links(catalog.posts),
      filterSummary: options.t("archiveHtmlFilterSummary", { scope: scope(filters, false), hashtags: suffix }),
      bootstrap: { htmlI18n: i18n(), defaults: { fromValue, toValue }, runtimeData: {
        handle, exportedAtIso, title, skippedImageCount, filterScope: scope(filters, true),
        filterHashtagCount: selectedTags.length, filterSkippedCount: filteredOutCount,
      } },
    };
  }
  /**
   * Prepares stored-card display metadata with the existing normalization adapter.
   * @param {object} card - Stored external card.
   * @returns {{className: string, footer: string}} Display data.
   */
  function cardDisplay(card) {
    const standardSite = options.normalizeStandardSite(card?.standardSite);
    if (standardSite) {
      return { className: "archive-html-link-card is-publication",
        footer: `${shortenArchiveUrlForDisplay(card.url)} - ${options.publicationFooter(standardSite)}` };
    }
    return { className: "archive-html-link-card", footer: shortenArchiveUrlForDisplay(card.url) };
  }
  return { document, tags, links, cardDisplay };
}
