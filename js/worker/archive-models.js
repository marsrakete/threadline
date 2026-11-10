/**
 * Creates pure archive filter, thread selection, post-model and wave-preparation operations for the classic worker.
 * @param {object} options - Explicit shared hashtag, URI, permalink, site/edit metadata and image-limit adapters.
 * @param {Function} options.normalizeTags - Normalizes selected hashtag entries.
 * @param {Function} options.parseTag - Parses one tag value. @param {Function} options.tagFacets - Parses text hashtags.
 * @param {Function} options.parseUri - Parses an AT URI. @param {Function} options.postUrl - Builds a web permalink.
 * @param {Function} options.site - Normalizes publication metadata. @param {Function} options.edit - Normalizes edit metadata.
 * @param {number} options.maxImages - Existing per-post image cap.
 * @returns {{filters: object, threads: object, posts: object, wave: object}} Frozen domain APIs; no network or storage access.
 */
globalThis.createThreadlineArchiveModels = function createThreadlineArchiveModels(options) {
  for (const name of ["normalizeTags", "parseTag", "tagFacets", "parseUri", "postUrl", "site", "edit"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive models require " + name);
    }
  }
  if (!Number.isInteger(options.maxImages) || options.maxImages < 0) {
    throw new TypeError("Archive models require a nonnegative integer image limit.");
  }
  const normalizeHashtagEntries = options.normalizeTags, parseHashtagValue = options.parseTag, parseHashtagFacets = options.tagFacets;
  const parseAtUri = options.parseUri, buildPostWebUrl = options.postUrl;
  const normalizeStandardSiteMetadata = options.site, normalizePostEditInfoFromRecord = options.edit;
  const MAX_IMAGES_PER_SEGMENT = options.maxImages;
  /** Retains valid API arrays without copying them.
   * @param {unknown} value - API/cache collection. @returns {Array} Original array or an empty array.
   */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Resolves wrapped/direct thread post views using the existing priority.
   * @param {object} node - Validated tree node. @returns {object|null} Post view or null.
   */
  function threadPostView(node) {
    if (node.post && node.post.uri) {
      return node.post;
    }
    if (node.uri && node.record) {
      return node;
    }
    return null;
  }
  /** Resolves replies with node-level arrays taking priority, including empty arrays.
   * @param {object} node - Tree node. @param {object|null} postView - Resolved post view.
   * @returns {object[]} Existing replies array or an empty array.
   */
  function threadReplies(node, postView) {
    if (Array.isArray(node.replies)) {
      return node.replies;
    }
    return arrayOrEmpty(postView?.replies);
  }
  /** Normalizes source, date, content and hashtag archive preferences.
   * @param {object} filters - Raw preferences. @returns {object} Normalized archive filters.
   */
  function normalizeArchiveFilters(filters = {}) {
    let scope = "all";
    if (filters.scope === "year" || filters.scope === "range") {
      scope = filters.scope;
    }
    let contentMode = "posts";
    if (["posts", "thread_roots", "threads", "full"].includes(filters.contentMode)) {
      contentMode = filters.contentMode;
    }
    let hashtagScope = "thread";
    if (filters.hashtagScope === "startpost") {
      hashtagScope = "startpost";
    }
    return {
      sourceActor: String(filters.sourceActor || "").trim().replace(/^@+/, ""),
      sourceDid: String(filters.sourceDid || "").trim(),
      scope,
      contentMode,
      includeConversationContext: filters.includeConversationContext === true,
      year: String(filters.year || "").trim(),
      from: String(filters.from || "").trim(),
      to: String(filters.to || "").trim(),
      hashtagTags: normalizeHashtagEntries(filters.hashtagTags).map((entry) => entry.normalized),
      hashtagScope,
    };
  }

  /** Combines explicit facet tags with text-parsed hashtags.
   * @param {object} record - Post record. @returns {Set<string>} Unique normalized tags in encounter order.
   */
  function collectNormalizedHashtagsFromRecord(record = {}) {
    const tags = new Set();
    /** Adds one valid normalized tag to the unique result set.
     * @param {unknown} value - Raw tag. @returns {void}
     */
    const addTag = (value) => {
      const parsed = parseHashtagValue(value);
      if (parsed?.normalized) {
        tags.add(parsed.normalized);
      }
    };

    const facets = arrayOrEmpty(record?.facets);
    facets.forEach((facet) => {
      const features = arrayOrEmpty(facet?.features);
      features.forEach((feature) => {
        if (feature?.$type === "app.bsky.richtext.facet#tag") {
          addTag(feature.tag || feature.value || "");
        }
      });
    });

    let text = "";
    if (typeof record?.text === "string") {
      text = record.text;
    }
    if (text) {
      parseHashtagFacets(text).forEach((facet) => {
        const features = arrayOrEmpty(facet?.features);
        features.forEach((feature) => {
          if (feature?.$type === "app.bsky.richtext.facet#tag") {
            addTag(feature.tag || feature.value || "");
          }
        });
      });
    }

    return tags;
  }

  /** Tests whether any selected hashtag occurs in the record.
   * @param {object} record - Post record. @param {object} filters - Selected normalized tags. @returns {boolean} True for no selected tags or a match.
   */
  function recordMatchesArchiveHashtags(record = {}, filters = {}) {
    const selectedTags = arrayOrEmpty(filters?.hashtagTags);
    if (!selectedTags.length) {
      return true;
    }

    const recordTags = collectNormalizedHashtagsFromRecord(record);
    return selectedTags.some((tag) => recordTags.has(tag));
  }

  /** Applies year or inclusive UTC date boundaries, retaining missing-date behavior.
   * @param {object} record - Post record. @param {object} filters - Normalized date filters. @returns {boolean} Whether the record passes.
   */
  function postMatchesArchiveFilters(record, filters) {
    let createdAt = "";
    if (typeof record?.createdAt === "string") {
      createdAt = record.createdAt;
    }
    if (!createdAt) {
      return true;
    }

    if (filters.scope === "year" && filters.year) {
      return createdAt.startsWith(`${filters.year}-`);
    }

    if (filters.scope === "range") {
      const timestamp = Date.parse(createdAt);
      if (Number.isNaN(timestamp)) {
        return false;
      }
      if (filters.from && timestamp < Date.parse(`${filters.from}T00:00:00.000Z`)) {
        return false;
      }
      if (filters.to && timestamp > Date.parse(`${filters.to}T23:59:59.999Z`)) {
        return false;
      }
    }

    return true;
  }

  /** Resolves a reply root or the supplied URI for a non-reply post.
   * @param {object} record - Post record. @param {string} fallbackUri - Non-reply URI. @returns {string} Root URI or empty value.
   */
  function getArchiveRootUri(record = {}, fallbackUri = "") {
    if (record?.reply?.root?.uri) {
      return record.reply.root.uri;
    }
    if (record?.reply) {
      return "";
    }
    return fallbackUri;
  }

  /** Resolves the immediate reply parent.
   * @param {object} record - Post record. @returns {string} Parent URI or empty value.
   */
  function getArchiveParentUri(record = {}) {
    return record?.reply?.parent?.uri || "";
  }

  /** Checks root ownership, retaining unknown-root acceptance.
   * @param {object} record - Post record. @param {string} ownDid - Archive account. @param {string} fallbackUri - Non-reply URI. @returns {boolean} Whether the root belongs to the account.
   */
  function recordBelongsToOwnThread(record = {}, ownDid = "", fallbackUri = "") {
    const rootUri = getArchiveRootUri(record, fallbackUri);
    if (!rootUri) {
      return true;
    }
    return parseAtUri(rootUri).did === ownDid;
  }

  /** Checks root and parent ownership for the main author path.
   * @param {object} record - Post record. @param {string} ownDid - Archive account. @param {string} fallbackUri - Non-reply URI. @returns {boolean} Whether the record is on the main path.
   */
  function recordBelongsToOwnMainThreadPath(record = {}, ownDid = "", fallbackUri = "") {
    if (!recordBelongsToOwnThread(record, ownDid, fallbackUri)) {
      return false;
    }
    if (!record?.reply) {
      return true;
    }
    const parentUri = getArchiveParentUri(record);
    if (!parentUri) {
      return true;
    }
    return parseAtUri(parentUri).did === ownDid;
  }

  /** Combines date and content-mode selection.
   * @param {object} record - Post record. @param {object} filters - Date/content filters. @param {string} ownDid - Archive account. @param {string} fallbackUri - Non-reply URI. @returns {boolean} Whether the record belongs to the selection.
   */
  function postMatchesArchiveSelection(record, filters, ownDid, fallbackUri = "") {
    if (!postMatchesArchiveFilters(record, filters)) {
      return false;
    }

    if (filters.contentMode === "full") {
      return true;
    }

    if (filters.contentMode === "thread_roots") {
      return recordBelongsToOwnMainThreadPath(record, ownDid, fallbackUri);
    }

    if (!record?.reply) {
      return true;
    }

    return recordBelongsToOwnThread(record, ownDid, fallbackUri);
  }

  /** Extracts capped image candidates, preserving direct/items/nested-media priority.
   * @param {object} record - Post with embed. @returns {object[]} Image descriptors retaining their identities.
   */
  function extractArchiveEmbedImages(record = {}) {
    const embed = record?.embed;
    if (!embed || typeof embed !== "object") {
      return [];
    }

    if (Array.isArray(embed.images)) {
      return embed.images.slice(0, MAX_IMAGES_PER_SEGMENT);
    }

    if (Array.isArray(embed.items)) {
      return embed.items
        .filter((item) => item?.image)
        .slice(0, MAX_IMAGES_PER_SEGMENT);
    }

    if (embed.media && typeof embed.media === "object") {
      return extractArchiveEmbedImages({ embed: embed.media });
    }

    return [];
  }

  /** Extracts the first direct or nested video descriptor.
   * @param {object} record - Post with embed. @returns {object[]} Video descriptor with normalized alt/aspect ratio, or empty array.
   */
  function extractArchiveEmbedVideos(record = {}) {
    const embed = record?.embed;
    if (!embed || typeof embed !== "object") {
      return [];
    }

    if (embed.video && typeof embed.video === "object") {
      let aspectRatio = null;
      if (embed.aspectRatio && typeof embed.aspectRatio === "object") {
        aspectRatio = {
          width: Number(embed.aspectRatio.width) || 0,
          height: Number(embed.aspectRatio.height) || 0,
        };
      }
      return [{
        video: embed.video,
        alt: String(embed.alt || "").trim(),
        aspectRatio,
      }];
    }

    if (embed.media && typeof embed.media === "object") {
      return extractArchiveEmbedVideos({ embed: embed.media });
    }

    return [];
  }

  /** Normalizes a direct or nested external card while retaining its thumbnail reference.
   * @param {object} record - Post with embed. @returns {object|null} Archive card with download state or null.
   */
  function extractArchiveExternalCardFromRecord(record = {}) {
    const embed = record?.embed;
    if (!embed || typeof embed !== "object") {
      return null;
    }

    let external = null;
    if (embed.external && typeof embed.external === "object") {
      external = embed.external;
    } else if (embed.media?.external && typeof embed.media.external === "object") {
      external = embed.media.external;
    }

    if (!external) {
      return null;
    }

    const url = String(external.uri || external.url || "").trim();
    const title = String(external.title || "").trim();
    const description = String(external.description || "").trim();
    const thumbRef = external.thumb || external.thumbnail || external.image || null;
    let thumb = "";
    if (typeof thumbRef === "string") {
      thumb = thumbRef;
    } else {
      thumb = String(thumbRef?.uri || thumbRef?.url || thumbRef?.thumb || "").trim();
    }
    if (!url && !title && !description && !thumbRef) {
      return null;
    }
    return {
      url,
      title,
      description,
      thumb,
      thumbRef,
      standardSite: normalizeStandardSiteMetadata(external.standardSite || external.standardSiteMetadata || external.publication),
      thumbPath: "",
      thumbLoadFailed: false,
      thumbLoadAttempts: 0,
    };
  }

  /** Builds the existing archive post schema from a record and author metadata.
   * @param {object} input - URI/CID, raw record, author fields and optional counts. @returns {object} Archive post retaining raw record/array references.
   */
  function buildArchivePostEntity({ uri, cid, record = {}, authorHandle = "", authorDid = "", authorDisplayName = "", authorAvatar = "", authorProfile, counts = null }) {
    const parsed = parseAtUri(uri);
    let permalink = "";
    if (parsed.rkey) {
      permalink = buildPostWebUrl(authorHandle || authorDid || "unknown", parsed.rkey);
    }
    return {
      uri,
      cid: cid || "",
      rkey: parsed.rkey,
      rawRecord: record || {},
      createdAt: record?.createdAt || "",
      text: record?.text || "",
      langs: arrayOrEmpty(record?.langs),
      facets: arrayOrEmpty(record?.facets),
      reply: record?.reply || null,
      thread: {
        rootUri: getArchiveRootUri(record, uri),
        parentUri: getArchiveParentUri(record),
      },
      counts: counts || {
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        quoteCount: 0,
      },
      permalink,
      authorHandle,
      ...(authorProfile ? { authorProfile: globalThis.ThreadlineProfileMetadata.normalize(authorProfile) } : {}),
      authorDisplayName,
      authorDid,
      authorAvatar,
      authorAvatarPath: "",
      externalCard: extractArchiveExternalCardFromRecord(record),
      editInfo: normalizePostEditInfoFromRecord(record),
      images: [],
    };
  }

  /** Enriches an existing archive entity using the previous truthy/array priorities.
   * @param {object} existing - Mutable archive entity. @param {object} incoming - Newer data. @returns {object} The same enriched existing entity.
   */
  function mergeArchivePostEntity(existing, incoming) {
    existing.cid = incoming.cid || existing.cid;
    existing.rkey = incoming.rkey || existing.rkey;
    existing.rawRecord = incoming.rawRecord || existing.rawRecord;
    existing.createdAt = incoming.createdAt || existing.createdAt;
    existing.text = incoming.text || existing.text;
    if (incoming.langs?.length) {
      existing.langs = incoming.langs;
    }
    if (incoming.facets?.length) {
      existing.facets = incoming.facets;
    }
    existing.reply = incoming.reply || existing.reply;
    existing.thread = {
      rootUri: incoming.thread?.rootUri || existing.thread?.rootUri || "",
      parentUri: incoming.thread?.parentUri || existing.thread?.parentUri || "",
    };
    existing.counts = incoming.counts || existing.counts;
    existing.permalink = incoming.permalink || existing.permalink;
    existing.authorHandle = incoming.authorHandle || existing.authorHandle;
    existing.authorDisplayName = incoming.authorDisplayName || existing.authorDisplayName;
    if (incoming.authorProfile) {
      existing.authorProfile = { ...existing.authorProfile, ...incoming.authorProfile };
    }
    existing.authorDid = incoming.authorDid || existing.authorDid;
    existing.authorAvatar = incoming.authorAvatar || existing.authorAvatar;
    existing.authorAvatarPath = incoming.authorAvatarPath || existing.authorAvatarPath;
    existing.externalCard = incoming.externalCard || existing.externalCard;
    existing.editInfo = incoming.editInfo || existing.editInfo || null;
    if ((!existing.images || existing.images.length === 0) && incoming.images?.length) {
      existing.images = incoming.images;
    }
    return existing;
  }

  /** Collects thread view posts depth-first, preserving duplicates and encounter order.
   * @param {object} node - Wrapped or direct post tree. @param {object[]} result - Mutable output. @returns {object[]} The same output array.
   */
  function collectThreadViewPosts(node, result = []) {
    if (!node || typeof node !== "object") {
      return result;
    }

    const postView = threadPostView(node);

    if (postView?.uri) {
      result.push(postView);
    }

    const replies = threadReplies(node, postView);
    replies.forEach((reply) => collectThreadViewPosts(reply, result));
    return result;
  }

  /** Collects the first root-to-target path into the supplied output.
   * @param {object} node - Wrapped or direct tree. @param {string} targetUri - Target URI. @param {object[]} result - Mutable output. @returns {boolean} Whether a path was found.
   */
  function collectThreadPathPosts(node, targetUri, result = []) {
    if (!node || typeof node !== "object") {
      return false;
    }

    const postView = threadPostView(node);

    const replies = threadReplies(node, postView);

    if (postView?.uri === targetUri) {
      result.push(postView);
      return true;
    }

    for (const reply of replies) {
      if (collectThreadPathPosts(reply, targetUri, result)) {
        if (postView?.uri) {
          result.unshift(postView);
        }
        return true;
      }
    }

    return false;
  }

  /** Collects depth-first posts for one author, or all authors when absent.
   * @param {object} node - Wrapped or direct tree. @param {string} authorDid - Optional author DID. @param {object[]} result - Mutable output. @returns {object[]} The same output array.
   */
  function collectThreadAuthorPosts(node, authorDid, result = []) {
    if (!node || typeof node !== "object") {
      return result;
    }

    const postView = threadPostView(node);

    if (postView?.uri && (!authorDid || postView.author?.did === authorDid)) {
      result.push(postView);
    }

    const replies = threadReplies(node, postView);
    replies.forEach((reply) => collectThreadAuthorPosts(reply, authorDid, result));
    return result;
  }
  /** Restores one wave's existing record/maps and bounded pagination inputs.
   * @param {object} input - Existing catalog/session, initialCursor and maxPosts.
   * @returns {object} Records, raw/post maps, cursor, pageCount and pageSize; existing input is not modified.
   */
  function restoreWave({ existingCatalog = null, existingSession = null, initialCursor = "", maxPosts = 500 } = {}) {
    const records = [], rawRecordsByUri = new Map(), postsByUri = new Map();
    const cursor = String(initialCursor || "");
    const pageCount = Math.max(0, Number(existingSession?.pageCount) || 0);
    const pageSize = Math.max(25, Math.min(100, Number(maxPosts) || 100));
    const resumedPosts = arrayOrEmpty(existingCatalog?.posts).map((post) => ({
      ...post,
      counts: {
        likeCount: Number(post?.counts?.likeCount) || 0, replyCount: Number(post?.counts?.replyCount) || 0,
        repostCount: Number(post?.counts?.repostCount) || 0, quoteCount: Number(post?.counts?.quoteCount) || 0,
      },
      images: [...arrayOrEmpty(post?.images)],
    }));
    resumedPosts.forEach((post) => {
      if (!post?.uri) {
        return;
      }
      postsByUri.set(post.uri, post);
      const rawRecord = post.rawRecord || {
        text: post.text || "", createdAt: post.createdAt || "", langs: arrayOrEmpty(post.langs),
        facets: arrayOrEmpty(post.facets), reply: post.reply || null, embed: null,
      };
      rawRecordsByUri.set(post.uri, rawRecord);
      records.push({ uri: post.uri, cid: post.cid || "", value: rawRecord, authorHandle: post.authorHandle || "",
        authorDisplayName: post.authorDisplayName || "", authorDid: post.authorDid || "", authorAvatar: post.authorAvatar || "", authorProfile: post.authorProfile, counts: post.counts || null });
    });
    return { records, rawRecordsByUri, postsByUri, cursor, pageCount, pageSize };
  }

  /** Builds the existing archive manifest and continuation session from a live wave snapshot.
   * @param {object} state - Source profile/DID, filters, posts/assets, counters, phase/cursor and explicit exportedAt/appVersion.
   * @param {string} status - Existing completed/cancelled/paused status, default completed.
   * @param {object} settings - Optional errorMessage.
   * @returns {object} Manifest, original post/asset arrays and session; waveIndex remains the existing fixed value one.
   */
  function buildWaveResult(state, status = "completed", { errorMessage = "" } = {}) {
    return {
      manifest: {
        schemaVersion: 1, exportedAt: state.exportedAt, appVersion: state.appVersion,
        account: { handle: state.sourceProfile.handle, did: state.sourceDid, displayName: state.sourceProfile.displayName, avatar: state.sourceProfile.avatar,
          ...globalThis.ThreadlineProfileMetadata.normalize(state.sourceProfile) },
        filters: state.normalizedFilters, postCount: state.orderedPosts.length, imageCount: state.imageCount,
        skippedImageCount: state.skippedImageCount, hashtagFilteredOutCount: state.hashtagFilteredOutCount,
        pageCount: state.pageCount, phase: state.currentPhase, errorMessage,
      },
      posts: state.orderedPosts, assets: state.assets,
      session: {
        waveIndex: 1, nextCursor: state.cursor, hasMore: Boolean(state.cursor), exportedPosts: state.orderedPosts.length,
        exportedImages: state.imageCount, skippedImages: state.skippedImageCount, status, pageCount: state.pageCount,
        phase: state.currentPhase, errorMessage,
      },
    };
  }
  return Object.freeze({
    filters: Object.freeze({ normalize: normalizeArchiveFilters, tags: collectNormalizedHashtagsFromRecord, matchesHashtags: recordMatchesArchiveHashtags, matchesDate: postMatchesArchiveFilters }),
    threads: Object.freeze({ root: getArchiveRootUri, parent: getArchiveParentUri, own: recordBelongsToOwnThread, main: recordBelongsToOwnMainThreadPath, select: postMatchesArchiveSelection, all: collectThreadViewPosts, path: collectThreadPathPosts, author: collectThreadAuthorPosts }),
    posts: Object.freeze({ images: extractArchiveEmbedImages, videos: extractArchiveEmbedVideos, card: extractArchiveExternalCardFromRecord, build: buildArchivePostEntity, merge: mergeArchivePostEntity }),
    wave: Object.freeze({ restore: restoreWave, result: buildWaveResult })
  });
};
