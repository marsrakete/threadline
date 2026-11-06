/** Creates shared archive asset attachment with explicit asset and concurrency adapters.
 * @param {object} options - download/normalize/extension/map, blob/cid/images/wait/publicUrl/dataUrl/delay, concurrency and messages.
 * @returns {{attachAvatars: Function, attachLinkCards: Function, attachImages: Function, attachThreadAssets: Function}} Frozen asset service.
 */
globalThis.createThreadlineArchiveAssetService = function createThreadlineArchiveAssetService(options) {
  for (const name of ["download", "normalize", "extension", "map"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive asset service requires " + name);
    }
  }
  const { download: downloadRemoteAssetViaBlob, normalize: normalizeArchiveImageBlob, extension: getAssetExtensionFromMimeType,
    map: mapWithConcurrency, concurrency: ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, messages } = options;
  /** Validates dependencies needed only by the requested asset operation.
   * @param {Array<string>} names - Required callback names. @returns {void} Throws for missing adapters.
   */
  function requireAdapters(names) {
    for (const name of names) {
      if (typeof options[name] !== "function") {
        throw new TypeError("Archive asset service requires " + name);
      }
    }
  }
  /** Formats existing messages with literal placeholder values.
   * @param {string} key - Message key. @param {object} values - Placeholder values.
   * @returns {string} Existing message with substitutions.
   */
  function text(key, values = {}) {
    return messages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }

  /** Downloads each distinct avatar URL, assigns local paths and appends assets without duplicate paths.
   * @param {Array} posts - Mutable posts; malformed containers are ignored.
   * @param {Array} assets - Output assets. @param {Set} seenAssetPaths - Existing paths.
   * @param {object|null} auth - Account. @param {Map|null} serviceCache - PDS cache.
   * @param {Function|null} notifyProgress - Optional observer. @param {number} progressBasePercent - Progress base.
   * @param {Map|null} blobCache - Download cache.
   * @returns {Promise<void>} Mutates posts/assets; individual download failures clear affected avatar paths.
   */
  async function attachAvatars(posts, assets, seenAssetPaths, auth = null, serviceCache = null, notifyProgress = null, progressBasePercent = 56, blobCache = null) {
    const postsByAvatarUrl = new Map();
    let safePosts = [];
    if (Array.isArray(posts)) {
      safePosts = posts;
    }
    for (const post of safePosts) {
      const avatarUrl = String(post?.authorAvatar || "").trim();
      if (!avatarUrl) {
        continue;
      }
      if (!postsByAvatarUrl.has(avatarUrl)) {
        postsByAvatarUrl.set(avatarUrl, []);
      }
      postsByAvatarUrl.get(avatarUrl).push(post);
    }

    const avatarEntries = [...postsByAvatarUrl.entries()];
    const total = Math.max(1, avatarEntries.length);
    let processedCount = 0;

    await mapWithConcurrency(avatarEntries, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async ([avatarUrl, linkedPosts]) => {
      const samplePost = linkedPosts[0] || null;
      try {
        const downloadedBlob = await downloadRemoteAssetViaBlob(
          auth,
          avatarUrl,
          samplePost?.authorDid || "",
          serviceCache,
          { cacheMap: blobCache },
        );
        const blob = normalizeArchiveImageBlob(downloadedBlob);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const authorSlug = String(samplePost?.authorHandle || samplePost?.authorDid || "author")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "author";
        const path = `avatars/${authorSlug}.${extension}`;
        linkedPosts.forEach((post) => {
          post.authorAvatarPath = path;
        });
        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
      } catch {
        linkedPosts.forEach((post) => {
          post.authorAvatarPath = "";
        });
      }

      processedCount += 1;
      if (typeof notifyProgress === "function" && (processedCount % 10 === 0 || processedCount === total)) {
        notifyProgress({
          title: messages.readTitle,
          step: text("avatarStep", { index: processedCount, total }),
          percent: Math.min(64, progressBasePercent + Math.round((processedCount / total) * 4)),
          detail: messages.avatarDetail,
          checkpoint: text("avatarCheckpoint", { index: processedCount, total }),
          state: "running",
        });
      }
    });
  }
  /** Attaches link-card thumbnails with the existing two-attempt policy and 5s download deadline.
   * @param {object} input - Ordered posts, assets, path set, auth/source, PDS/blob caches, progress and detail formatter.
   * @returns {Promise<void>} Mutates card paths/attempts/failure flags and assets; normalization/observer errors propagate.
   */
  async function attachLinkCards(input) {
    requireAdapters(["blob", "cid", "delay"]);
    const { orderedPosts, assets, seenAssetPaths, auth, sourceDid, pdsServiceCache, archiveBlobCache, notifyProgress, buildHashtagProgressDetail } = input;
    const { blob: downloadBlobForDid, cid: getBlobCidFromRef } = options;
    const linkCardPosts = orderedPosts.filter((post) => Boolean(post?.externalCard?.thumbRef));
    if (linkCardPosts.length > 0) {
      notifyProgress({
        title: messages.readTitle,
        step: messages.cardStart,
        percent: 65,
        detail: buildHashtagProgressDetail(text("cardDetail", { total: linkCardPosts.length })),
        checkpoint: messages.cardPrepare,
        state: "running",
      });
    }

    let processedLinkCards = 0;
    let skippedLinkCardThumbs = 0;
    await mapWithConcurrency(linkCardPosts, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (post, linkIndex) => {
      const externalCard = post.externalCard;
      if (!externalCard?.thumbRef) {
        return;
      }
      const postLabel = String(post.authorHandle || post.authorDid || "author").trim();
      const postRef = String(post.rkey || `post-${linkIndex + 1}`).trim();
      const targetUrl = String(externalCard.url || "").trim();
      let authorLabel = "";
      if (postLabel) {
        authorLabel = `@${postLabel}`;
      }
      const progressTarget = [authorLabel, postRef].filter(Boolean).join(" · ");
      notifyProgress({
        title: messages.readTitle,
        step: text("cardLoading", { index: processedLinkCards + 1, total: linkCardPosts.length }),
        percent: 65 + Math.round((processedLinkCards / Math.max(1, linkCardPosts.length)) * 4),
        detail: buildHashtagProgressDetail(
          [progressTarget, targetUrl].filter(Boolean).join(" · ") || messages.cardFallback,
        ),
        checkpoint: text("cardLoadCheckpoint", { index: processedLinkCards + 1, total: linkCardPosts.length, target: progressTarget || postRef }),
        state: "running",
      });
      const thumbCid = getBlobCidFromRef(externalCard.thumbRef);
      if (thumbCid) {
        let blob = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          externalCard.thumbLoadAttempts = attempt + 1;
          try {
            blob = await downloadBlobForDid(
              auth,
              post.authorDid || sourceDid,
              thumbCid,
              pdsServiceCache,
              { timeoutMs: 5000, cacheMap: archiveBlobCache },
            );
            break;
          } catch {
            if (attempt === 0) {
              await options.delay(350);
            }
          }
        }
        if (blob) {
          blob = normalizeArchiveImageBlob(blob);
          externalCard.thumbLoadFailed = false;
          const extension = getAssetExtensionFromMimeType(blob.type);
          const authorSlug = String(post.authorHandle || post.authorDid || "author")
            .replace(/[^\w.-]+/g, "-")
            .slice(0, 60) || "author";
          const path = `link-cards/${authorSlug}-${post.rkey || `post-${linkIndex + 1}`}.${extension}`;
          post.externalCard.thumbPath = path;
          if (!seenAssetPaths.has(path)) {
            seenAssetPaths.add(path);
            assets.push({
              path,
              type: blob.type,
              sizeBytes: blob.bytes.length,
              bytes: blob.bytes,
            });
          }
        } else {
          post.externalCard.thumbPath = "";
          externalCard.thumbLoadFailed = true;
          skippedLinkCardThumbs += 1;
        }
      }

      processedLinkCards += 1;
      if (linkCardPosts.length > 0) {
        notifyProgress({
          title: messages.readTitle,
          step: text("cardDone", { index: processedLinkCards, total: linkCardPosts.length }),
          percent: 65 + Math.round((processedLinkCards / Math.max(1, linkCardPosts.length)) * 4),
          detail: buildHashtagProgressDetail(
            [text("cardSkipped", { count: skippedLinkCardThumbs }), progressTarget, targetUrl].filter(Boolean).join(" · "),
          ),
          checkpoint: text("cardCheckpoint", { index: processedLinkCards, total: linkCardPosts.length, target: progressTarget || postRef }),
          state: "running",
        });
      }
    });

  }

  /** Collects and downloads post images with bounded concurrency and cooperative cancellation.
   * @param {object} input - Posts/raw map, output assets/path set, auth/source/caches and run observer.
   * @param {object} state - Live imageCount/skippedImageCount adapter; updates survive failures.
   * @returns {Promise<boolean>} Whether cancellation was observed; individual exhausted downloads are skipped.
   */
  async function attachImages(input, state) {
    requireAdapters(["images", "blob", "cid", "wait", "publicUrl", "dataUrl", "delay"]);
    const { orderedPosts, rawRecordsByUri, assets, seenAssetPaths, auth, sourceDid, pdsServiceCache, archiveBlobCache, runId, notifyProgress } = input;
    const { images: extractArchiveEmbedImages, blob: downloadBlobForDid, cid: getBlobCidFromRef, wait: waitForArchiveRunControl, publicUrl: buildPublicBlobUrlForDid, dataUrl: bytesToDataUrl } = options;
    const imageTasks = [];
    orderedPosts.forEach((post, postIndex) => {
      const record = rawRecordsByUri.get(post.uri) || {};
      const images = extractArchiveEmbedImages(record);
      post.images = [];
      images.forEach((image, imageIndex) => {
        imageTasks.push({
          post,
          postIndex,
          image,
          imageIndex,
          imageTotal: images.length,
          blobDid: post.authorDid || sourceDid,
        });
      });
    });

    let processedImageTasks = 0;
    let cancelledDuringImagePhase = false;
    await mapWithConcurrency(imageTasks, ARCHIVE_ASSET_DOWNLOAD_CONCURRENCY, async (task) => {
      if (cancelledDuringImagePhase) {
        return;
      }
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        cancelledDuringImagePhase = true;
        return;
      }

      const { post, postIndex, image, imageIndex, imageTotal, blobDid } = task;
      const cid = getBlobCidFromRef(image);
      if (cid) {
        notifyProgress({
          title: messages.readTitle,
          step: text("imageLoading", { index: imageIndex + 1, total: imageTotal, post: postIndex + 1, posts: orderedPosts.length }),
          percent: 65 + Math.round(((processedImageTasks + 1) / Math.max(1, imageTasks.length)) * 30),
          detail: text("imageCounts", { saved: state.imageCount, skipped: state.skippedImageCount }),
          checkpoint: text("imageLoadCheckpoint", { index: imageIndex + 1, total: imageTotal, post: postIndex + 1 }),
          state: "running",
        });

        let blob = null;
        let lastBlobError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            blob = await downloadBlobForDid(auth, blobDid, cid, pdsServiceCache, { cacheMap: archiveBlobCache });
            break;
          } catch (error) {
            lastBlobError = error;
            if (attempt === 0) {
              await options.delay(350);
            }
          }
        }

        if (!blob) {
          state.skippedImageCount += 1;
          notifyProgress({
            title: messages.readTitle,
            step: messages.imageSkip,
            percent: 65 + Math.round(((processedImageTasks + 1) / Math.max(1, imageTasks.length)) * 30),
            detail: text("imageCounts", { saved: state.imageCount, skipped: state.skippedImageCount }),
            checkpoint: text("imageSkipCheckpoint", { count: state.skippedImageCount }),
            preview: {
              meta: text("imageSkipPreview", { error: lastBlobError?.message || messages.unknownError }),
              text: String(post.text || "").slice(0, 180),
              metric: text("metricCounts", { likes: post.counts.likeCount, replies: post.counts.replyCount, reposts: post.counts.repostCount, quotes: post.counts.quoteCount }),
            },
            state: "running",
          });
        } else {
          const normalizedBlob = normalizeArchiveImageBlob(blob);
          let extension = "jpg";
          if (normalizedBlob.type.includes("png")) {
            extension = "png";
          } else if (normalizedBlob.type.includes("webp")) {
            extension = "webp";
          }
          const authorSlug = String(post.authorHandle || post.authorDid || "author")
            .replace(/[^\w.-]+/g, "-")
            .slice(0, 60) || "author";
          const path = `images/${String(post.createdAt || "unknown").slice(0, 4) || "misc"}/${authorSlug}-${post.rkey || `post-${postIndex + 1}`}-${imageIndex + 1}.${extension}`;

          post.images[imageIndex] = {
            path,
            alt: String(image.alt || "").slice(0, 2000),
            width: Number(image.aspectRatio?.width) || 0,
            height: Number(image.aspectRatio?.height) || 0,
            sourceDid: blobDid,
            sourceCid: cid,
            remoteUrl: await buildPublicBlobUrlForDid(auth, blobDid, cid, pdsServiceCache),
            mimeType: normalizedBlob.type,
            sizeBytes: normalizedBlob.bytes.length,
          };

          if (!seenAssetPaths.has(path)) {
            seenAssetPaths.add(path);
            assets.push({
              path,
              type: blob.type,
              sizeBytes: blob.bytes.length,
              bytes: blob.bytes,
            });
            state.imageCount += 1;
            if (state.imageCount % 10 === 0) {
              notifyProgress({
                preview: {
                  meta: text("imageDownloaded", { count: state.imageCount }),
                  text: String(post.text || "").slice(0, 180),
                  imageDataUrl: bytesToDataUrl(normalizedBlob.bytes, normalizedBlob.type),
                  metric: text("metricCounts", { likes: post.counts.likeCount, replies: post.counts.replyCount, reposts: post.counts.repostCount, quotes: post.counts.quoteCount }),
                  alt: image.alt || messages.imageAlt,
                },
                checkpoint: text("imageSaved", { count: state.imageCount }),
                state: "running",
              });
            }
          }
        }
      }

      processedImageTasks += 1;
      if (imageTasks.length > 0 && (processedImageTasks % 8 === 0 || processedImageTasks === imageTasks.length)) {
        notifyProgress({
          title: messages.readTitle,
          step: text("imageDone", { index: processedImageTasks, total: imageTasks.length }),
          percent: 65 + Math.round((processedImageTasks / Math.max(1, imageTasks.length)) * 30),
          detail: text("imageArchiveCounts", { saved: state.imageCount, skipped: state.skippedImageCount }),
          checkpoint: text("imageCheckpoint", { index: processedImageTasks, total: imageTasks.length }),
          state: "running",
        });
      }
    });

    orderedPosts.forEach((post) => {
      post.images = (post.images || []).filter(Boolean);
    });
    return cancelledDuringImagePhase;
  }
  /** Attaches thread-import assets with its original sequential, per-post cancellation policy.
   * @param {object} input - Ordered posts/raw map, source/auth, outputs/caches, run and progress observer.
   * @param {object} state - Mutable imageCount/skippedImageCount counters.
   * @returns {Promise<boolean>} True on cancellation; exhausted image/card downloads remain tolerated.
   */
  async function attachThreadAssets(input, state) {
    requireAdapters(["images", "blob", "cid", "wait", "publicUrl", "dataUrl", "delay"]);
    const { orderedPosts, rawRecordsByUri, assets, seenAssetPaths, auth, actorDid, pdsServiceCache, archiveBlobCache, runId, notifyProgress } = input;
    const { images: extractArchiveEmbedImages, blob: downloadBlobForDid, cid: getBlobCidFromRef, wait: waitForArchiveRunControl, publicUrl: buildPublicBlobUrlForDid, dataUrl: bytesToDataUrl } = options;
    await attachAvatars(orderedPosts, assets, seenAssetPaths, auth, pdsServiceCache, null, 56, archiveBlobCache);

    for (const [postIndex, post] of orderedPosts.entries()) {
      const externalCard = post.externalCard;
      if (!externalCard?.thumbRef) {
        continue;
      }
      const thumbCid = getBlobCidFromRef(externalCard.thumbRef);
      if (!thumbCid) {
        continue;
      }
      try {
        externalCard.thumbLoadAttempts = 1;
        let blob = await downloadBlobForDid(auth, post.authorDid || actorDid, thumbCid, pdsServiceCache, {
          timeoutMs: 5000,
          cacheMap: archiveBlobCache,
        });
        blob = normalizeArchiveImageBlob(blob);
        externalCard.thumbLoadFailed = false;
        const extension = getAssetExtensionFromMimeType(blob.type);
        const authorSlug = String(post.authorHandle || post.authorDid || "author")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "author";
        const path = `link-cards/${authorSlug}-${post.rkey || `thread-post-${postIndex + 1}`}.${extension}`;
        post.externalCard.thumbPath = path;
        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
      } catch {
        post.externalCard.thumbPath = "";
        externalCard.thumbLoadFailed = true;
      }
    }

    for (const [postIndex, post] of orderedPosts.entries()) {
      if (await waitForArchiveRunControl(runId, notifyProgress) === "cancelled") {
        return true;
      }

      const record = rawRecordsByUri.get(post.uri) || {};
      const images = extractArchiveEmbedImages(record);
      for (const [imageIndex, image] of images.entries()) {
        const cid = getBlobCidFromRef(image);
        if (!cid) {
          continue;
        }

        notifyProgress({
          title: messages.importTitle,
          step: text("importImageLoading", { index: imageIndex + 1, total: images.length, post: postIndex + 1, posts: orderedPosts.length }),
          percent: 45 + Math.round(((postIndex + 1) / Math.max(1, orderedPosts.length)) * 50),
          detail: text("imageCounts", { saved: state.imageCount, skipped: state.skippedImageCount }),
          checkpoint: text("importImageCheckpoint", { index: imageIndex + 1, post: postIndex + 1 }),
          state: "running",
        });

        let blob = null;
        let lastBlobError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            blob = await downloadBlobForDid(auth, post.authorDid || actorDid, cid, pdsServiceCache, {
              cacheMap: archiveBlobCache,
            });
            break;
          } catch (error) {
            lastBlobError = error;
            if (attempt === 0) {
              await options.delay(350);
            }
          }
        }

        if (!blob) {
          state.skippedImageCount += 1;
          notifyProgress({
            preview: {
              meta: text("imageSkipPreview", { error: lastBlobError?.message || messages.unknownError }),
              text: String(post.text || "").slice(0, 180),
              metric: text("metricCounts", { likes: post.counts.likeCount, replies: post.counts.replyCount, reposts: post.counts.repostCount, quotes: post.counts.quoteCount }),
            },
            detail: text("imageCounts", { saved: state.imageCount, skipped: state.skippedImageCount }),
            checkpoint: `Ein Thread-Bild wurde übersprungen`,
            state: "running",
          });
          continue;
        }

        const normalizedBlob = normalizeArchiveImageBlob(blob);
        let extension = "jpg";
        if (normalizedBlob.type.includes("png")) {
          extension = "png";
        } else if (normalizedBlob.type.includes("webp")) {
          extension = "webp";
        }
        const authorSlug = String(post.authorHandle || post.authorDid || "author")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "author";
        const path = `images/${String(post.createdAt || "unknown").slice(0, 4) || "misc"}/${authorSlug}-${post.rkey || `thread-post-${postIndex + 1}`}-${imageIndex + 1}.${extension}`;

        post.images.push({
          path,
          alt: String(image.alt || "").slice(0, 2000),
          width: Number(image.aspectRatio?.width) || 0,
          height: Number(image.aspectRatio?.height) || 0,
          sourceDid: post.authorDid || actorDid,
          sourceCid: cid,
          remoteUrl: await buildPublicBlobUrlForDid(auth, post.authorDid || actorDid, cid, pdsServiceCache),
          mimeType: normalizedBlob.type,
          sizeBytes: normalizedBlob.bytes.length,
        });

        if (!seenAssetPaths.has(path)) {
          seenAssetPaths.add(path);
          assets.push({
            path,
            type: normalizedBlob.type,
            sizeBytes: normalizedBlob.bytes.length,
            bytes: normalizedBlob.bytes,
          });
          state.imageCount += 1;
          if (state.imageCount % 5 === 0) {
            notifyProgress({
              preview: {
                meta: text("importImageDownloaded", { count: state.imageCount }),
                text: String(post.text || "").slice(0, 180),
                imageDataUrl: bytesToDataUrl(normalizedBlob.bytes, normalizedBlob.type),
                metric: text("metricCounts", { likes: post.counts.likeCount, replies: post.counts.replyCount, reposts: post.counts.repostCount, quotes: post.counts.quoteCount }),
                alt: image.alt || messages.imageAlt,
              },
              checkpoint: text("importImageSaved", { count: state.imageCount }),
              state: "running",
            });
          }
        }
      }
    }


    return false;
  }
  return Object.freeze({ attachAvatars, attachLinkCards, attachImages, attachThreadAssets });
};
