/** Creates mention resolution, rich-text composition and account typeahead workflows.
 * @param {object} options - Session, handle resolver, request/base, actor normalization and parsing models.
 * @returns {object} Frozen mentions/build/resolve/search API.
 */
globalThis.createThreadlineRichTextService = function createThreadlineRichTextService(options) {
  for (const name of ["session", "resolve", "request", "base", "profile"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Rich-text service requires " + name); }
  }
  for (const name of ["utf8", "overlap", "links", "tags", "candidates", "query", "queries", "score"]) {
    if (typeof options.models?.[name] !== "function") { throw new TypeError("Rich-text service requires model " + name); }
  }
  const { session: ensureSession, resolve: resolveHandleToDid, request: bskyGet,
    base: authXrpcBase, profile: normalizeNetworkProfile } = options;
  const { utf8: utf16IndexToUtf8Index, overlap: facetRangesOverlap, links: parseLinkFacets,
    tags: parseHashtagFacets, candidates: parseMentionCandidates, query: normalizeMentionSearchQuery,
    queries: buildMentionSearchQueries, score: scoreMentionSearchActor } = options.models;
  /**
   * Builds mention facets and keeps track of unresolved handles.
   * @param {string} text - Post text that may contain `@handle` mentions.
   * @param {object} auth - Authenticated account used for DID resolution.
   * @param {Map<string, string|null>} cache - Shared DID cache for the publish run.
   * @returns {Promise<{ facets: object[], unresolvedHandles: string[] }>} Mention facets plus unresolved handles.
   */
  async function parseMentionFacets(text, auth, cache) {
    const facets = [];
    const unresolvedHandles = [];
    const unresolvedSeen = new Set();
    const candidates = parseMentionCandidates(text);

    for (const candidate of candidates) {
      const did = await resolveHandleToDid(candidate.handle, auth, cache);
      if (!did) {
        if (!unresolvedSeen.has(candidate.handle)) {
          unresolvedSeen.add(candidate.handle);
          unresolvedHandles.push(candidate.handle);
        }
        continue;
      }

      facets.push({
        index: {
          byteStart: utf16IndexToUtf8Index(text, candidate.start),
          byteEnd: utf16IndexToUtf8Index(text, candidate.end),
        },
        features: [
          {
            $type: "app.bsky.richtext.facet#mention",
            did,
          },
        ],
      });
    }

    return {
      facets,
      unresolvedHandles,
    };
  }

  /**
   * Builds Bluesky rich-text facets for links, mentions, and hashtags.
   * @param {string} text - Raw post text.
   * @param {object} auth - Authenticated account used for mention DID resolution.
   * @param {Map<string, string|null>} resolveCache - Shared DID cache for the publish run.
   * @returns {Promise<{ facets: object[]|undefined, unresolvedHandles: string[] }>} Built facets plus unresolved mention handles.
   */
  async function buildRichTextFacets(text, auth, resolveCache) {
    const linkFacets = parseLinkFacets(text);
    const hashtagFacets = parseHashtagFacets(text);
    const mentionResult = await parseMentionFacets(text, auth, resolveCache);
    const mentionFacets = mentionResult.facets;
    const combined = [...linkFacets, ...mentionFacets, ...hashtagFacets]
      .sort((left, right) => left.index.byteStart - right.index.byteStart);

    const accepted = [];
    for (const facet of combined) {
      if (accepted.some((entry) => facetRangesOverlap(entry.index, facet.index))) {
        continue;
      }
      accepted.push(facet);
    }

    if (accepted.length > 0) {
      return {
        facets: accepted,
        unresolvedHandles: mentionResult.unresolvedHandles,
      };
    }

    return {
      facets: undefined,
      unresolvedHandles: mentionResult.unresolvedHandles,
    };
  }

  /**
   * Resolves composer mention handles to DIDs for preview rendering in the UI.
   * @param {object} payload - Message payload with a `handles` array.
   * @returns {Promise<{mentions: Array<{handle: string, did: string|null}>}>} Resolved handle-to-DID pairs.
   */
  async function resolveComposerMentions(payload = {}) {
    let rawHandles = [];
    if (Array.isArray(payload?.handles)) { rawHandles = payload.handles; }
    const normalizedHandles = [];

    for (const rawHandle of rawHandles) {
      const handle = String(rawHandle || "").trim().replace(/^@/, "").toLowerCase();
      if (!handle) {
        continue;
      }
      if (!normalizedHandles.includes(handle)) {
        normalizedHandles.push(handle);
      }
    }

    let auth = null;
    try {
      auth = await ensureSession();
    } catch {
      auth = null;
    }

    const resolveCache = new Map();
    const mentions = [];

    for (const handle of normalizedHandles) {
      const did = await resolveHandleToDid(handle, auth, resolveCache);
      mentions.push({
        handle,
        did: did || null,
      });
    }

    return { mentions };
  }

  /**
   * Searches Bluesky accounts for the composer mention picker via typeahead.
   * @param {object} payload - Message payload with a raw `query` string.
   * @returns {Promise<{actors: object[]}>} Ranked actor matches with avatar and relation info.
   */
  async function searchMentionActors(payload = {}) {
    const query = normalizeMentionSearchQuery(payload?.query);
    if (query.length < 2) {
      return { actors: [] };
    }

    const auth = await ensureSession();
    const queries = buildMentionSearchQueries(query);
    const byDid = new Map();

    for (const variant of queries) {
      const response = await bskyGet("app.bsky.actor.searchActorsTypeahead", {
        q: variant,
        limit: 8,
      }, {
        base: authXrpcBase(auth),
        headers: {
          authorization: `Bearer ${auth.session.accessJwt}`,
        },
      }).catch(() => ({ actors: [] }));

      let actors = [];
      if (Array.isArray(response?.actors)) { actors = response.actors; }
      for (const actor of actors) {
        const normalizedActor = normalizeNetworkProfile(actor, "");
        if (!normalizedActor.did || byDid.has(normalizedActor.did)) {
          continue;
        }
        byDid.set(normalizedActor.did, normalizedActor);
      }
    }

    const ranked = Array.from(byDid.values())
      .sort((left, right) => {
        const scoreDiff = scoreMentionSearchActor(right, query) - scoreMentionSearchActor(left, query);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return String(left.handle || left.did || "").localeCompare(String(right.handle || right.did || ""), undefined, {
          sensitivity: "base",
        });
      })
      .slice(0, 12);

    return { actors: ranked };
  }

  return Object.freeze({ mentions: parseMentionFacets, build: buildRichTextFacets, resolve: resolveComposerMentions, search: searchMentionActors });
};
