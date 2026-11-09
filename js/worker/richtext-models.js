/** Creates pure rich-text facet parsing and mention-search ranking rules.
 * @param {object} options - UTF-8 encoder and configured search handle suffixes.
 * @returns {object} Frozen utf8/overlap/links/tags/candidates/query/queries/score API.
 */
globalThis.createThreadlineRichTextModels = function createThreadlineRichTextModels(options) {
  if (typeof options?.encode !== "function") { throw new TypeError("Rich-text models require encode"); }
  if (!Array.isArray(options.suffixes)) { throw new TypeError("Rich-text models require suffixes"); }
  const { encode } = options;
  const MENTION_SEARCH_HANDLE_SUFFIXES = [...options.suffixes];
  /** Converts a UTF-16 offset to its UTF-8 byte offset. @param {string} text - Source text. @param {number} index - UTF-16 offset. @returns {number} Model result. */
  function utf16IndexToUtf8Index(text, index) {
    return encode(text.slice(0, index)).byteLength;
  }

  /** Tests strict byte-range overlap, retaining adjacent ranges. @param {object} left - Range. @param {object} right - Range. @returns {boolean} Model result. */
  function facetRangesOverlap(left, right) {
    return left.byteStart < right.byteEnd && right.byteStart < left.byteEnd;
  }

  /** Extracts existing link facets and trims trailing punctuation. @param {string} text - Source text. @returns {Array<object>} Model result. */
  function parseLinkFacets(text) {
    const facets = [];
    const regex = /(^|\s|\()((https?:\/\/[^\s]+)|((?<domain>[a-z][a-z0-9-]*(\.[a-z0-9-]+)+)[^\s]*))/gim;
    let match;

    while ((match = regex.exec(text))) {
      let uri = match[2];
      let start = match.index + match[1].length;
      let end = start + match[2].length;

      if (!uri.startsWith("http")) {
        uri = `https://${uri}`;
      }

      while (/[.,;!?]$/.test(uri)) {
        uri = uri.slice(0, -1);
        end -= 1;
      }

      if (/[)]$/.test(uri) && !uri.includes("(")) {
        uri = uri.slice(0, -1);
        end -= 1;
      }

      facets.push({
        index: {
          byteStart: utf16IndexToUtf8Index(text, start),
          byteEnd: utf16IndexToUtf8Index(text, end),
        },
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri,
          },
        ],
      });
    }

    return facets;
  }

  /** Extracts existing Unicode hashtag facets with length bounds. @param {string} text - Source text. @returns {Array<object>} Model result. */
  function parseHashtagFacets(text) {
    const facets = [];
    const regex = /(?:^|\s)(#[^\d\s]\S*)(?=\s|$)/gu;
    let match;

    while ((match = regex.exec(text))) {
      let tag = match[1].replace(/\p{P}+$/gu, "");
      if (tag.length < 2 || tag.length > 66) {
        continue;
      }

      const start = match.index + match[0].indexOf("#");
      const end = start + tag.length;
      facets.push({
        index: {
          byteStart: utf16IndexToUtf8Index(text, start),
          byteEnd: utf16IndexToUtf8Index(text, end),
        },
        features: [
          {
            $type: "app.bsky.richtext.facet#tag",
            tag: tag.slice(1),
          },
        ],
      });
    }

    return facets;
  }

  /** Extracts lowercased handle mentions with UTF-16 positions. @param {string} text - Source text. @returns {Array<object>} Model result. */
  function parseMentionCandidates(text) {
    const candidates = [];
    const regex = /(^|[\s([{"'“„«‹])(@)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)(?=$|[\s)\]}",;:!?'”»›])/gu;
    let match;

    while ((match = regex.exec(text))) {
      const handle = match[3].toLowerCase();
      const start = match.index + match[1].length;
      const end = start + handle.length + 1;
      candidates.push({ handle, start, end });
    }

    return candidates;
  }

  /**
   * Normalizes the raw account search query from the mention picker.
   * @param {string} rawQuery - User-entered search text.
   * @returns {string} Lowercased query without leading at sign.
   */
  function normalizeMentionSearchQuery(rawQuery = "") {
    return String(rawQuery || "").trim().replace(/^@/, "").toLowerCase();
  }

  /**
   * Builds query variants for account typeahead including common handle suffixes.
   * @param {string} rawQuery - User-entered search text.
   * @returns {string[]} Unique query variants ordered from strict to broad.
   */
  function buildMentionSearchQueries(rawQuery = "") {
    const normalizedQuery = normalizeMentionSearchQuery(rawQuery);
    if (!normalizedQuery) {
      return [];
    }

    const queries = [];
    const seen = new Set();
    const pushQuery = (value) => {
      const normalizedValue = normalizeMentionSearchQuery(value);
      if (!normalizedValue || seen.has(normalizedValue)) {
        return;
      }
      seen.add(normalizedValue);
      queries.push(normalizedValue);
    };

    pushQuery(normalizedQuery);

    let baseName = normalizedQuery;
    const dotIndex = normalizedQuery.indexOf(".");
    if (dotIndex > 0) {
      baseName = normalizedQuery.slice(0, dotIndex);
      pushQuery(baseName);
    }

    if (baseName) {
      for (const suffix of MENTION_SEARCH_HANDLE_SUFFIXES) {
        pushQuery(`${baseName}.${suffix}`);
      }
    }

    return queries;
  }

  /**
   * Computes a lightweight ranking score for mention search results.
   * @param {object} actor - Normalized actor search hit.
   * @param {string} rawQuery - Original normalized search query.
   * @returns {number} Higher scores rank earlier.
   */
  function scoreMentionSearchActor(actor = {}, rawQuery = "") {
    const query = normalizeMentionSearchQuery(rawQuery);
    const handle = String(actor.handle || "").trim().toLowerCase();
    const displayName = String(actor.displayName || "").trim().toLowerCase();
    let score = 0;

    if (handle === query) {
      score += 1000;
    }
    if (handle.startsWith(query)) {
      score += 300;
    }
    if (displayName.startsWith(query)) {
      score += 120;
    }
    if (handle.includes(query)) {
      score += 40;
    }
    if (actor.followingViewer === true && actor.followedByViewer === true) {
      score += 90;
    } else {
      if (actor.followingViewer === true) {
        score += 35;
      }
      if (actor.followedByViewer === true) {
        score += 35;
      }
    }

    return score;
  }

  return Object.freeze({ utf8: utf16IndexToUtf8Index, overlap: facetRangesOverlap, links: parseLinkFacets, tags: parseHashtagFacets, candidates: parseMentionCandidates, query: normalizeMentionSearchQuery, queries: buildMentionSearchQueries, score: scoreMentionSearchActor });
};
