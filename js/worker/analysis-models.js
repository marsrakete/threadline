/** Creates pure worker-analysis models with the shared AT-URI parser.
 * @param {object} options - parseUri adapter. @returns {object} Frozen model API.
 */
globalThis.createThreadlineAnalysisModels = function createThreadlineAnalysisModels(options) {
  if (typeof options?.parseUri !== "function") {
    throw new TypeError("Analysis models require parseUri");
  }
  const parseAtUri = options.parseUri;
  /** Returns an existing array or a fresh empty one. @param {unknown} value - Input. @returns {Array} Safe array. */
  function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Finds a saved account by case-insensitive DID, handle or identifier.
   * @param {object} state - Stored auth state. @param {string} actor - Account identifier.
   * @returns {object|null} Original matching account or null.
   */
  function getAnalysisStoredAccountByActor(state, actor = "") {
    const normalizedActor = String(actor || "").trim().replace(/^@+/, "").toLowerCase();
    if (!normalizedActor) {
      return null;
    }
    return asArray(state?.accounts).find((entry) => {
      const did = String(entry?.did || "").trim().toLowerCase();
      const handle = String(entry?.handle || "").trim().replace(/^@+/, "").toLowerCase();
      const identifier = String(entry?.identifier || "").trim().replace(/^@+/, "").toLowerCase();
      return normalizedActor === did || normalizedActor === handle || normalizedActor === identifier;
    }) || null;
  }

  /** Collects mentions, lower-case tags and link hosts from controlled facet features.
   * @param {object} record - Post record.
   * @returns {object} Mention/tag/domain arrays retaining duplicates and existing empty-feature behavior.
   */
  function extractAnalysisRecordFacets(record = {}) {
    const facets = asArray(record?.facets);
    const mentions = [];
    const hashtags = [];
    const domains = [];

    facets.forEach((facet) => {
      const features = asArray(facet?.features);
      features.forEach((feature) => {
        const type = String(feature?.$type || "").trim();
        if (type === "app.bsky.richtext.facet#mention" && feature?.did) {
          mentions.push(String(feature.did).trim());
        }
        if (type === "app.bsky.richtext.facet#tag" && feature?.tag) {
          hashtags.push(String(feature.tag).trim().toLowerCase());
        }
        if (type === "app.bsky.richtext.facet#link" && feature?.uri) {
          try {
            const host = new URL(String(feature.uri)).hostname.toLowerCase();
            if (host) {
              domains.push(host);
            }
          } catch {
            // ignore invalid URLs
          }
        }
      });
    });

    return { mentions, hashtags, domains };
  }

  /** Selects the first valid quoted DID from record/view embed candidates.
   * @param {object} record - Raw record. @param {object} postView - Provider view.
   * @returns {string} First quoted DID or empty string.
   */
  function extractAnalysisQuoteDid(record = {}, postView = {}) {
    const candidates = [
      record?.embed?.record?.uri,
      record?.embed?.record?.record?.uri,
      postView?.embed?.record?.uri,
      postView?.embed?.record?.record?.uri,
    ];
    for (const candidate of candidates) {
      const parsed = parseAtUri(candidate);
      if (parsed.did) {
        return parsed.did;
      }
    }
    return "";
  }

  /** Detects image, video or record-with-media embeds using existing type matching.
   * @param {object} record - Raw record. @param {object} postView - Provider view.
   * @returns {boolean} Whether either embed type matches.
   */
  function detectAnalysisMediaEmbed(record = {}, postView = {}) {
    const types = [
      String(record?.embed?.$type || "").trim(),
      String(postView?.embed?.$type || "").trim(),
    ];
    return types.some((type) => type.includes("images") || type.includes("video") || type.includes("recordWithMedia"));
  }

  /** Sorts frequencies by count then locale label and calculates shares.
   * @param {Map} frequencyMap - Label/count entries. @param {number} total - Denominator. @param {number} limit - Slice limit.
   * @returns {Array<object>} Ranked marker entries.
   */
  function buildAnalysisTopListFromMap(frequencyMap, total, limit = 10) {
    const safeTotal = Math.max(1, Number(total) || 1);
    return Array.from(frequencyMap.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([label, count]) => ({
        label,
        identifier: label,
        share: count / safeTotal,
        count,
      }));
  }

  /** Checks the existing requirement for both reply root and parent URIs.
   * @param {object} record - Post record.
   * @returns {boolean} Whether both links exist.
   */
  function isAnalysisReplyRecord(record = {}) {
    return Boolean(record?.reply?.root?.uri && record?.reply?.parent?.uri);
  }

  /** Detects quoted records using the existing raw/view type and URI rules.
   * @param {object} record - Raw record. @param {object} postView - Provider view.
   * @returns {boolean} Whether the record counts as a quote.
   */
  function isAnalysisQuoteRecord(record = {}, postView = {}) {
    const recordEmbedType = String(record?.embed?.$type || "").trim();
    const postEmbedType = String(postView?.embed?.$type || "").trim();
    return (
      recordEmbedType === "app.bsky.embed.record#view"
      || recordEmbedType === "app.bsky.embed.recordWithMedia"
      || postEmbedType === "app.bsky.embed.record#view"
      || postEmbedType === "app.bsky.embed.recordWithMedia#view"
      || Boolean(record?.embed?.record?.uri)
      || Boolean(postView?.embed?.record?.uri)
    );
  }

  /** Normalizes the persisted analysis snapshot without changing its schema.
   * @param {unknown} value - Stored analysis state.
   * @returns {object|null} Normalized inputs/options/accounts/comparison or null.
   */
  function normalizeStoredAnalysisState(value = null) {
    if (!value || typeof value !== "object") {
      return null;
    }
    /** Normalizes a saved account corpus. @param {unknown} account - Saved account. @returns {object|null} Account snapshot. */
    const normalizeStoredAccount = (account) => {
      if (!account || typeof account !== "object") {
        return null;
      }
      return {
        profile: {
          did: String(account.profile?.did || "").trim(),
          handle: String(account.profile?.handle || "").trim(),
          displayName: String(account.profile?.displayName || "").trim(),
          avatar: String(account.profile?.avatar || "").trim(),
          postsCount: Math.max(0, Number(account.profile?.postsCount) || 0),
          followersCount: Math.max(0, Number(account.profile?.followersCount) || 0),
          followsCount: Math.max(0, Number(account.profile?.followsCount) || 0),
        },
        filters: {
          rangeDays: Math.max(0, Number(account.filters?.rangeDays) || 0),
          includeReplies: account.filters?.includeReplies === true,
          includeQuotes: account.filters?.includeQuotes === true,
          limit: Math.max(1, Number(account.filters?.limit) || 1),
        },
        stats: {
          fetchedPosts: Math.max(0, Number(account.stats?.fetchedPosts) || 0),
          scannedPosts: Math.max(0, Number(account.stats?.scannedPosts) || 0),
          pages: Math.max(0, Number(account.stats?.pages) || 0),
          oldestPostAt: String(account.stats?.oldestPostAt || "").trim(),
          newestPostAt: String(account.stats?.newestPostAt || "").trim(),
        },
        posts: (asArray(account.posts)).map((post) => ({
          uri: String(post?.uri || "").trim(),
          cid: String(post?.cid || "").trim(),
          createdAt: String(post?.createdAt || "").trim(),
          text: String(post?.text || "").trim(),
        })),
      };
    };
    let comparison = null;
    if (value.comparison && typeof value.comparison === "object") {
      comparison = {
        score: Math.max(0, Number(value.comparison.score) || 0),
        labelKey: String(value.comparison.labelKey || "").trim(),
        confidenceKey: String(value.comparison.confidenceKey || "").trim(),
      };
    }
    return {
      inputs: {
        accountA: String(value.inputs?.accountA || "").trim(),
        accountB: String(value.inputs?.accountB || "").trim(),
      },
      options: {
        rangeDays: Math.max(0, Number(value.options?.rangeDays) || 0),
        limit: Math.max(1, Number(value.options?.limit) || 500),
        includeReplies: value.options?.includeReplies === true,
        includeQuotes: value.options?.includeQuotes === true,
      },
      accountA: normalizeStoredAccount(value.accountA),
      accountB: normalizeStoredAccount(value.accountB),
      comparison,
    };
  }

  /** Creates a fresh mutable corpus accumulator.
   * @returns {object} Independent posts, frequencies, date boundaries and media counts.
   */
  function createScanState() {
    return { posts: [], reachedOlderPosts: false, newestPostAt: "", oldestPostAt: "",
      mentionFrequency: new Map(), hashtagFrequency: new Map(), domainFrequency: new Map(),
      replyTargetFrequency: new Map(), quoteTargetFrequency: new Map(), languageFrequency: new Map(),
      mediaPostCount: 0, textOnlyPostCount: 0 };
  }

  /** Applies existing author/date/reply/quote/text rules to one feed page and updates corpus markers.
   * @param {object} state - Mutable scan accumulator. @param {Array} feedItems - Provider feed items.
   * @param {object} filters - Actor DID, minimum timestamp, flags and post limit.
   * @returns {string} Last own-author timestamp on the page, even when its post was excluded.
   */
  function scanPage(state, feedItems, { actorDid, minTimestamp, includeReplies, includeQuotes, limit }) {
    let oldestSeenOnPage = "";
    for (const item of feedItems) {
      const postView = item?.post || null;
      const record = postView?.record || {};
      if (!postView?.uri || !postView?.author?.did || postView.author.did !== actorDid) {
        continue;
      }

      const createdAt = String(record.createdAt || postView.indexedAt || "").trim();
      const createdTimestamp = Date.parse(createdAt) || 0;
      if (!state.newestPostAt && createdAt) {
        state.newestPostAt = createdAt;
      }
      oldestSeenOnPage = createdAt || oldestSeenOnPage;

      if (minTimestamp && createdTimestamp && createdTimestamp < minTimestamp) {
        state.reachedOlderPosts = true;
        continue;
      }
      if (!includeReplies && isAnalysisReplyRecord(record)) {
        continue;
      }
      if (!includeQuotes && isAnalysisQuoteRecord(record, postView)) {
        continue;
      }

      const text = String(record.text || "").replace(/\s+/g, " ").trim();
      if (!text) {
        continue;
      }

      const { mentions, hashtags, domains } = extractAnalysisRecordFacets(record);
      mentions.forEach((did) => state.mentionFrequency.set(did, (state.mentionFrequency.get(did) || 0) + 1));
      hashtags.forEach((tag) => state.hashtagFrequency.set(tag, (state.hashtagFrequency.get(tag) || 0) + 1));
      domains.forEach((domain) => state.domainFrequency.set(domain, (state.domainFrequency.get(domain) || 0) + 1));
      const replyDid = parseAtUri(record?.reply?.parent?.uri).did;
      if (replyDid) {
        state.replyTargetFrequency.set(replyDid, (state.replyTargetFrequency.get(replyDid) || 0) + 1);
      }
      const quoteDid = extractAnalysisQuoteDid(record, postView);
      if (quoteDid) {
        state.quoteTargetFrequency.set(quoteDid, (state.quoteTargetFrequency.get(quoteDid) || 0) + 1);
      }
      const langs = asArray(record?.langs);
      langs.forEach((lang) => {
        const normalized = String(lang || "").trim().toLowerCase();
        if (normalized) {
          state.languageFrequency.set(normalized, (state.languageFrequency.get(normalized) || 0) + 1);
        }
      });
      if (detectAnalysisMediaEmbed(record, postView)) {
        state.mediaPostCount += 1;
      } else {
        state.textOnlyPostCount += 1;
      }

      state.posts.push({
        uri: String(postView.uri || "").trim(),
        cid: String(postView.cid || "").trim(),
        createdAt,
        text,
      });
      state.oldestPostAt = createdAt || state.oldestPostAt;
      if (state.posts.length >= limit) {
        break;
      }
    }

    return oldestSeenOnPage;
  }
  return Object.freeze({ storedAccount: getAnalysisStoredAccountByActor, facets: extractAnalysisRecordFacets, quoteDid: extractAnalysisQuoteDid, media: detectAnalysisMediaEmbed, top: buildAnalysisTopListFromMap, reply: isAnalysisReplyRecord, quote: isAnalysisQuoteRecord, storedState: normalizeStoredAnalysisState, createScanState, scanPage });
};
