/** Creates sequential thread publishing with explicit auth, record/media/facet and interaction adapters.
 * @param {object} options - Session, normalization, facets/upload/gates/request/base/frontend, Blob constructor, clock and limits.
 * @returns {object} Frozen publish API.
 */
globalThis.createThreadlinePublishService = function createThreadlinePublishService(options) {
  for (const name of ["session", "languages", "interaction", "card", "facets", "upload", "gates", "request", "base", "webBase", "blob", "now"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Publish service requires " + name); }
  }
  if (!Number.isInteger(options.maxImages) || options.maxImages < 1) { throw new TypeError("Publish service requires positive maxImages"); }
  const { session: ensureSession, languages: normalizePostLanguageTags, interaction: normalizePostInteractionSettings,
    card: normalizeLinkCard, facets: buildRichTextFacets, upload: uploadBlob, gates: applyPostInteractionGates,
    request: bskyFetch, base: xrpcBaseForService, webBase: resolvePostWebBase, blob: Blob, now,
    maxImages: MAX_IMAGES_PER_SEGMENT, defaultService: DEFAULT_LOGIN_SERVICE, messages } = options;
  /** Formats progress copy with literal placeholder values. @param {string} key - Message key. @param {object} values - Placeholders. @returns {string} Message. */
  function text(key, values) { return messages[key].replace(/\{(\w+)\}/g, (match, name) => String(values[name])); }
  /** Publishes segments sequentially with uploads, facets, reply chaining and existing partial-error semantics. @param {object} input - Segments, languages, gates and reply target. @param {Function} notifyProgress - Observer. @returns {Promise<object>} Posts and rate-limit metadata. */
  async function publishThread({ segments, langs, postInteraction, replyTarget } = {}, notifyProgress = () => {}) {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error(messages.publishSegmentsMissing);
    }

    const auth = await ensureSession();
    const normalizedLangs = normalizePostLanguageTags(langs);
    const normalizedPostInteraction = normalizePostInteractionSettings(postInteraction);
    let normalizedReplyTarget = null;
    if (replyTarget && typeof replyTarget === "object") {
      normalizedReplyTarget = {
        replyRoot: { uri: String(replyTarget.replyRoot?.uri || "").trim(), cid: String(replyTarget.replyRoot?.cid || "").trim() },
        replyParent: { uri: String(replyTarget.replyParent?.uri || "").trim(), cid: String(replyTarget.replyParent?.cid || "").trim() },
      };
    }
    const resolveCache = new Map();
    const posts = [];
    let latestRateLimit = null;
    let root = null;
    if (normalizedReplyTarget?.replyRoot?.uri && normalizedReplyTarget?.replyRoot?.cid) { root = normalizedReplyTarget.replyRoot; }
    let parent = null;
    if (normalizedReplyTarget?.replyParent?.uri && normalizedReplyTarget?.replyParent?.cid) { parent = normalizedReplyTarget.replyParent; }

    notifyProgress({ message: messages.publishStarted });

    try {
      for (const [segmentIndex, segment] of segments.entries()) {
        notifyProgress({ message: text("publishSegment", { index: segmentIndex + 1, total: segments.length }) });
        let segmentText = segment.text;
        if (typeof segment === "string") { segmentText = segment; }
        const record = {
          $type: "app.bsky.feed.post",
          text: segmentText,
          createdAt: now(),
        };
        if (normalizedLangs.length > 0) {
          record.langs = normalizedLangs;
        }
        const richTextResult = await buildRichTextFacets(record.text, auth, resolveCache);
        if (Array.isArray(richTextResult.unresolvedHandles) && richTextResult.unresolvedHandles.length > 0) {
          const unresolvedLabel = richTextResult.unresolvedHandles
            .map((handle) => `@${handle}`)
            .join(", ");
          throw new Error(text("publishMentionMissing", { handles: unresolvedLabel }));
        }
        if (richTextResult.facets) {
          record.facets = richTextResult.facets;
        }

        let images = [];
        if (Array.isArray(segment?.images)) { images = segment.images.slice(0, MAX_IMAGES_PER_SEGMENT); }
        const externalCard = normalizeLinkCard(segment?.externalCard);
        if (externalCard && images.length > 0) {
          throw new Error(messages.publishCardImagesConflict);
        }
        if (externalCard) {
          const external = {
            uri: externalCard.url,
            title: String(externalCard.title || externalCard.url).slice(0, 300),
            description: String(externalCard.description || "").slice(0, 1000),
          };
          if (segment.externalCard?.thumb instanceof Blob) {
            notifyProgress({ message: text("publishCardUpload", { index: segmentIndex + 1 }) });
            external.thumb = await uploadBlob(auth, segment.externalCard.thumb);
          }
          record.embed = {
            $type: "app.bsky.embed.external",
            external,
          };
        } else if (images.length > 0) {
          const embeddedImages = [];
          for (const [imageIndex, image] of images.entries()) {
            notifyProgress({ message: text("publishImageUpload", { image: imageIndex + 1, total: images.length, index: segmentIndex + 1 }) });
            const blobRef = await uploadBlob(auth, image.blob);
            let aspectRatio;
            if (image.width && image.height) { aspectRatio = { width: image.width, height: image.height }; }
            embeddedImages.push({
              alt: String(image.alt || "").slice(0, 2000),
              image: blobRef,
              aspectRatio,
            });
          }

          if (images.length <= 4) {
            record.embed = { $type: "app.bsky.embed.images", images: embeddedImages };
          } else {
            record.embed = { $type: "app.bsky.embed.gallery", items: embeddedImages.map((image) => ({ $type: "app.bsky.embed.gallery#image", ...image })) };
          }

        }

        if (root && parent) {
          record.reply = {
            root,
            parent,
          };
        }

        const createdResult = await bskyFetch("com.atproto.repo.createRecord", {
          method: "POST",
          headers: {
            authorization: `Bearer ${auth.session.accessJwt}`,
          },
          base: xrpcBaseForService(auth.pdsUrl || auth.service),
          returnMeta: true,
          body: JSON.stringify({
            repo: auth.session.did,
            collection: "app.bsky.feed.post",
            record,
          }),
        });
        latestRateLimit = createdResult.meta?.rateLimit || latestRateLimit;
        const created = createdResult.data || {};

        const ref = {
          uri: created.uri,
          cid: created.cid,
        };

        notifyProgress({ message: text("publishGates", { index: segmentIndex + 1, total: segments.length }) });
        latestRateLimit = await applyPostInteractionGates(auth, ref, normalizedPostInteraction) || latestRateLimit;

        if (!root) {
          root = ref;
        }

        parent = ref;
        posts.push(ref);
      }
    } catch (error) {
      if (posts.length > 0) {
        const partialError = new Error(error?.message || messages.publishPartial);
        partialError.details = {
          code: "PARTIAL_PUBLISH",
          postedCount: posts.length,
          totalCount: segments.length,
          rateLimit: error?.details?.rateLimit || latestRateLimit || null,
          retryAfterMs: error?.details?.retryAfterMs || 0,
          status: error?.details?.status || 0,
        };
        throw partialError;
      }

      throw error;
    }

    return {
      posts,
      handle: auth.session.handle,
      service: auth.service || DEFAULT_LOGIN_SERVICE,
      webApp: auth.webApp || resolvePostWebBase(auth.service),
      rateLimit: latestRateLimit,
    };
  }
  return Object.freeze({ publish: publishThread });
};
