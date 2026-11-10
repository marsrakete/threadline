/**
 * Creates ArchivePdfLayout with explicit environment and domain adapters.
 * @param {object} dependencies - Required domain and environment adapters.
 * @param {Function} dependencies.externalCard - Reads the external preview stored on a post.
 * @param {Function} dependencies.shortenUrl - Formats a preview URL for display.
 * @param {Function} dependencies.wrap - Measures rich text into lines.
 * @param {Function} dependencies.t - Resolves localized labels.
 * @param {Function} dependencies.groups - Orders archive posts into thread groups.
 * @param {Function} dependencies.canvas - Creates a Canvas for text measurement.
 * @param {number} dependencies.maxImages - Positive image limit shared with the application.
 * @returns {object} images, externalCard, height, groupKey, frame, paginate, bands operations.
 */
export function createArchivePdfLayout(dependencies) {
  if (!dependencies) {
    throw new TypeError("Archive PDF dependencies are required.");
  }
  if (typeof dependencies.externalCard !== "function") {
    throw new TypeError("Archive PDF requires externalCard.");
  }
  if (typeof dependencies.shortenUrl !== "function") {
    throw new TypeError("Archive PDF requires shortenUrl.");
  }
  if (typeof dependencies.wrap !== "function") {
    throw new TypeError("Archive PDF requires wrap.");
  }
  if (typeof dependencies.t !== "function") {
    throw new TypeError("Archive PDF requires t.");
  }
  if (typeof dependencies.groups !== "function") {
    throw new TypeError("Archive PDF requires groups.");
  }
  if (typeof dependencies.canvas !== "function") {
    throw new TypeError("Archive PDF requires canvas.");
  }
  if (!Number.isInteger(dependencies.maxImages) || dependencies.maxImages < 1) {
    throw new TypeError("Archive PDF requires a positive image limit.");
  }
  const getArchiveExternalCard = dependencies.externalCard;
  const shortenArchiveUrlForDisplay = dependencies.shortenUrl;
  const buildWrappedPdfLines = dependencies.wrap;
  const t = dependencies.t;
  const buildArchiveThreadGroups = dependencies.groups;
  /**
   * Selects bounded image dimensions for the configured image size.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @returns {object} Single/grid image bounds and spacing.
   */
  function getArchivePdfImagePreset(options) {
    if (options.imageSize === "large") {
      return {
        singleMaxHeight: 250,
        gridCellMaxHeight: 160,
        gap: 10
      };
    }
    if (options.imageSize === "small") {
      return {
        singleMaxHeight: 150,
        gridCellMaxHeight: 92,
        gap: 8
      };
    }
    return {
      singleMaxHeight: 190,
      gridCellMaxHeight: 122,
      gap: 9
    };
  }

  /**
   * Arranges images up to the configured limit with caption space in a single image or two-column grid.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @param {number} contentWidth - Available content width in Canvas pixels.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @param {number} scale - Canvas pixels per PDF point.
   * @returns {object} Image frames and total occupied height.
   */
  function getArchivePdfImageFrames(post, contentWidth, options, scale) {
    let images;
    if (Array.isArray(post.images)) {
      images = post.images.slice(0, dependencies.maxImages);
    } else {
      images = [];
    }
    if (images.length === 0) {
      return {
        frames: [],
        totalHeight: 0
      };
    }
    const preset = getArchivePdfImagePreset(options);
    const gap = preset.gap * scale;
    const captionLineHeight = 12 * scale;
    if (images.length === 1) {
      const image = images[0];
      let ratio;
      if (image.width && image.height) {
        ratio = image.width / image.height;
      } else {
        ratio = 16 / 9;
      }
      const height = Math.min(preset.singleMaxHeight * scale, contentWidth / Math.max(ratio, 0.5));
      let captionLines;
      if (image.alt) {
        captionLines = 2;
      } else {
        captionLines = 0;
      }
      return {
        frames: [{
          image,
          x: 0,
          y: 0,
          width: contentWidth,
          height,
          captionLines,
          captionHeight: captionLines * captionLineHeight
        }],
        totalHeight: height + captionLines * captionLineHeight
      };
    }
    const cellWidth = (contentWidth - gap) / 2;
    const frames = [];
    let cursorY = 0;
    for (let index = 0; index < images.length; index += 2) {
      const rowImages = images.slice(index, index + 2);
      const rowHeights = rowImages.map(image => {
        let ratio;
        if (image.width && image.height) {
          ratio = image.width / image.height;
        } else {
          ratio = 1;
        }
        return Math.min(preset.gridCellMaxHeight * scale, cellWidth / Math.max(ratio, 0.66));
      });
      const rowHeight = Math.max(...rowHeights, 72 * scale);
      const captionHeights = rowImages.map(image => {
        let captionHeight;
        if (image.alt) {
          captionHeight = 2 * captionLineHeight;
        } else {
          captionHeight = 0;
        }
        return captionHeight;
      });
      const rowCaptionHeight = Math.max(0, ...captionHeights);
      rowImages.forEach((image, column) => {
        let captionLines;
        if (image.alt) {
          captionLines = 2;
        } else {
          captionLines = 0;
        }
        let captionHeight;
        if (image.alt) {
          captionHeight = 2 * captionLineHeight;
        } else {
          captionHeight = 0;
        }
        frames.push({
          image,
          x: column * (cellWidth + gap),
          y: cursorY,
          width: cellWidth,
          height: rowHeight,
          captionLines: captionLines,
          captionHeight: captionHeight
        });
      });
      cursorY += rowHeight + rowCaptionHeight;
      if (index + 2 < images.length) {
        cursorY += gap;
      }
    }
    return {
      frames,
      totalHeight: cursorY
    };
  }

  /**
   * Measures title, description, URL and optional thumbnail for an external card.
   * @param {CanvasRenderingContext2D} context - Canvas context used for measurement and drawing.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @param {number} contentWidth - Available content width in Canvas pixels.
   * @param {number} scale - Canvas pixels per PDF point.
   * @returns {object|null} Measured card or null without a preview.
   */
  function getArchivePdfExternalCardLayout(context, post, contentWidth, scale) {
    const externalCard = getArchiveExternalCard(post);
    if (!externalCard) {
      return null;
    }
    const cardPadding = 11 * scale;
    const gap = 10 * scale;
    const hasThumb = Boolean(externalCard.thumbPath);
    const thumbFailed = externalCard.thumbLoadFailed === true && !hasThumb;
    const hasThumbSlot = hasThumb || thumbFailed;
    let thumbWidth;
    if (hasThumbSlot) {
      thumbWidth = Math.min(116 * scale, contentWidth * 0.3);
    } else {
      thumbWidth = 0;
    }
    let thumbHeight;
    if (hasThumbSlot) {
      thumbHeight = thumbWidth * 0.74;
    } else {
      thumbHeight = 0;
    }
    let thumbnailSpace;
    if (hasThumbSlot) {
      thumbnailSpace = thumbWidth + gap;
    } else {
      thumbnailSpace = 0;
    }
    const textWidth = Math.max(120 * scale, contentWidth - cardPadding * 2 - thumbnailSpace);
    const displayUrl = shortenArchiveUrlForDisplay(externalCard.url);
    context.font = `700 ${10.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    const titleLines = buildWrappedPdfLines(context, externalCard.title || externalCard.url, textWidth).slice(0, 2);
    context.font = `${9.2 * scale}px "Segoe UI", Aptos, sans-serif`;
    let descriptionLines;
    if (externalCard.description) {
      descriptionLines = buildWrappedPdfLines(context, externalCard.description, textWidth).slice(0, 3);
    } else {
      descriptionLines = [];
    }
    let failedLines;
    if (thumbFailed) {
      let failureTextWidth;
      if (thumbWidth) {
        failureTextWidth = Math.max(48 * scale, thumbWidth - 14 * scale);
      } else {
        failureTextWidth = textWidth;
      }
      failedLines = buildWrappedPdfLines(context, t("archiveLinkCardThumbFailed"), failureTextWidth).slice(0, 3);
    } else {
      failedLines = [];
    }
    context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
    const urlLines = buildWrappedPdfLines(context, displayUrl, textWidth).slice(0, 2);
    const titleHeight = titleLines.length * (13 * scale);
    const descriptionHeight = descriptionLines.length * (11.5 * scale);
    const urlHeight = urlLines.length * (10.5 * scale);
    let descriptionSpace;
    if (descriptionLines.length) {
      descriptionSpace = descriptionHeight + 4 * scale;
    } else {
      descriptionSpace = 0;
    }
    let urlSpace;
    if (urlLines.length) {
      urlSpace = urlHeight + 5 * scale;
    } else {
      urlSpace = 0;
    }
    const textHeight = titleHeight + descriptionSpace + urlSpace;
    let thumbnailHeight;
    if (hasThumbSlot) {
      thumbnailHeight = thumbHeight;
    } else {
      thumbnailHeight = 0;
    }
    const contentHeight = Math.max(thumbnailHeight, textHeight);
    return {
      card: externalCard,
      hasThumb,
      thumbFailed,
      hasThumbSlot,
      thumbWidth,
      thumbHeight,
      textWidth,
      cardPadding,
      gap,
      titleLines,
      descriptionLines,
      failedLines,
      urlLines,
      height: contentHeight + cardPadding * 2
    };
  }

  /**
   * Measures a post card including text, metadata, edit marker, images and link preview.
   * @param {CanvasRenderingContext2D} context - Canvas context used for measurement and drawing.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @param {number} scale - Canvas pixels per PDF point.
   * @param {number} cardWidth - Available post card width in Canvas pixels.
   * @param {string} layoutMode - Standalone or integrated thread card mode.
   * @returns {number} Required card height in Canvas pixels.
   */
  function estimateArchivePostCardHeight(context, post, options, scale, cardWidth, layoutMode = "standalone") {
    const innerPadding = 16 * scale;
    let depthIndent;
    if (layoutMode === "standalone" && options.indentThreads) {
      depthIndent = Math.min(4, Number(post?.threadDepth) || 0) * (18 * scale);
    } else {
      depthIndent = 0;
    }
    let avatarOffset;
    if (post?.authorAvatarPath) {
      avatarOffset = 28 * scale + 10 * scale;
    } else {
      avatarOffset = 0;
    }
    const contentWidth = cardWidth - innerPadding * 2 - depthIndent - avatarOffset;
    const headerHeight = 42 * scale;
    let metricsHeight;
    if (options.includeMetrics) {
      metricsHeight = 28 * scale;
    } else {
      metricsHeight = 0;
    }
    let editMarkerHeight = 0;
    if (post?.editInfo?.isEdited === true) {
      editMarkerHeight = 20 * scale;
    }
    const textLineHeight = 15 * scale;
    context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
    const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth, post.facets || []);
    let totalHeight = innerPadding + headerHeight + metricsHeight + editMarkerHeight + textLines.length * textLineHeight + 12 * scale;
    const externalCardLayout = getArchivePdfExternalCardLayout(context, post, contentWidth, scale);
    if (externalCardLayout) {
      totalHeight += externalCardLayout.height + 12 * scale;
    }
    const imageLayout = getArchivePdfImageFrames(post, contentWidth, options, scale);
    if (imageLayout.totalHeight > 0) {
      totalHeight += imageLayout.totalHeight + 12 * scale;
    }
    totalHeight += 28 * scale;
    return totalHeight + innerPadding;
  }

  /**
   * Reads the stable root URI used to group adjacent thread cards.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @returns {string} Thread root URI or post URI.
   */
  function getArchiveThreadGroupKey(post) {
    return post?.thread?.rootUri || post?.uri || "";
  }

  /**
   * Calculates capped reply indentation and remaining card width.
   * @param {number} baseX - Unindented card left coordinate.
   * @param {number} baseWidth - Unindented card width.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @param {number} scale - Canvas pixels per PDF point.
   * @returns {object} Reply depth, indent, left coordinate and width.
   */
  function getArchivePdfThreadBlockFrame(baseX, baseWidth, post, options, scale) {
    let depth;
    if (options.indentThreads) {
      depth = Math.min(4, Number(post?.threadDepth) || 0);
    } else {
      depth = 0;
    }
    const indent = depth * (18 * scale);
    return {
      depth,
      indent,
      x: baseX + indent,
      width: Math.max(220 * scale, baseWidth - indent)
    };
  }

  /**
   * Packs measured posts into A4 pages, keeping an oversized post on its own page.
   * @param {object[]} posts - Posts to measure, order or render.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @returns {object[][]} Nonempty pages preserving post order.
   */
  function paginateArchivePdfPosts(posts, options) {
    const canvas = dependencies.canvas();
    canvas.width = 1190;
    canvas.height = 1684;
    const context = canvas.getContext("2d");
    const scale = canvas.width / 595;
    const margin = 28 * scale;
    const pageHeight = canvas.height - margin * 2;
    const headerHeight = 42 * scale;
    const cardGap = 16 * scale;
    const baseCardWidth = canvas.width - margin * 2 - 36 * scale;
    const usableHeight = pageHeight - headerHeight - 18 * scale;
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    for (const post of posts) {
      const frame = getArchivePdfThreadBlockFrame(0, baseCardWidth, post, options, scale);
      const cardHeight = estimateArchivePostCardHeight(context, post, options, scale, frame.width, "integrated");
      let nextHeight;
      if (currentPage.length === 0) {
        nextHeight = cardHeight;
      } else {
        nextHeight = currentHeight + cardGap + cardHeight;
      }
      if (currentPage.length > 0 && nextHeight > usableHeight) {
        pages.push(currentPage);
        currentPage = [post];
        currentHeight = cardHeight;
      } else {
        currentPage.push(post);
        currentHeight = nextHeight;
      }
    }
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    return pages;
  }

  /**
   * Orders posts and splits volumes while optionally retaining complete threads.
   * @param {object[]} posts - Posts to measure, order or render.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @returns {object[][]} Ordered volumes; threads may exceed the configured limit.
   */
  function splitArchiveIntoBands(posts, options) {
    const size = Math.max(100, Math.min(1000, Number(options.bandSize) || 200));
    const orderedPosts = buildArchiveThreadGroups(posts).flatMap(group => group.posts);
    const bands = [];
    let current = [];
    for (const post of orderedPosts) {
      const currentGroup = current[current.length - 1]?.thread?.rootUri || current[current.length - 1]?.uri || "";
      const nextGroup = post?.thread?.rootUri || post?.uri || "";
      const canOverflowForThread = options.keepThreadsTogether && current.length > 0 && current.length >= size && currentGroup && currentGroup === nextGroup;
      if (current.length >= size && !canOverflowForThread) {
        bands.push(current);
        current = [];
      }
      current.push(post);
    }
    if (current.length > 0) {
      bands.push(current);
    }
    return bands;
  }
  return {
    images: getArchivePdfImageFrames,
    externalCard: getArchivePdfExternalCardLayout,
    height: estimateArchivePostCardHeight,
    groupKey: getArchiveThreadGroupKey,
    frame: getArchivePdfThreadBlockFrame,
    paginate: paginateArchivePdfPosts,
    bands: splitArchiveIntoBands
  };
}
