/**
 * Creates ArchivePdfRenderer with explicit environment and domain adapters.
 * @param {object} dependencies - Required domain and environment adapters.
 * @param {Function} dependencies.images - Measures post image frames.
 * @param {Function} dependencies.externalCard - Measures external card content.
 * @param {Function} dependencies.height - Measures complete post card height.
 * @param {Function} dependencies.groupKey - Reads the thread group identifier.
 * @param {Function} dependencies.frame - Calculates indented post bounds.
 * @param {Function} dependencies.fill - Paints a rounded rectangle.
 * @param {Function} dependencies.stroke - Strokes a rounded rectangle.
 * @param {Function} dependencies.circle - Paints a circular avatar.
 * @param {Function} dependencies.image - Paints a contained image.
 * @param {Function} dependencies.bitmap - Decodes an archive image asset; the renderer closes the result.
 * @param {Function} dependencies.metrics - Builds localized metric labels.
 * @param {Function} dependencies.wrap - Measures rich text into lines.
 * @param {Function} dependencies.text - Draws measured lines and returns link bounds.
 * @param {Function} dependencies.rectangle - Converts Canvas rectangles to PDF coordinates.
 * @param {Function} dependencies.timestamp - Formats post timestamps.
 * @param {Function} dependencies.t - Resolves localized labels.
 * @param {Function} dependencies.canvas - Creates a page Canvas.
 * @param {Function} dependencies.account - Reads the current fallback account handle.
 * @returns {object} post, page operations.
 */
export function createArchivePdfRenderer(dependencies) {
  if (!dependencies) {
    throw new TypeError("Archive PDF dependencies are required.");
  }
  if (typeof dependencies.images !== "function") {
    throw new TypeError("Archive PDF requires images.");
  }
  if (typeof dependencies.externalCard !== "function") {
    throw new TypeError("Archive PDF requires externalCard.");
  }
  if (typeof dependencies.height !== "function") {
    throw new TypeError("Archive PDF requires height.");
  }
  if (typeof dependencies.groupKey !== "function") {
    throw new TypeError("Archive PDF requires groupKey.");
  }
  if (typeof dependencies.frame !== "function") {
    throw new TypeError("Archive PDF requires frame.");
  }
  if (typeof dependencies.fill !== "function") {
    throw new TypeError("Archive PDF requires fill.");
  }
  if (typeof dependencies.stroke !== "function") {
    throw new TypeError("Archive PDF requires stroke.");
  }
  if (typeof dependencies.circle !== "function") {
    throw new TypeError("Archive PDF requires circle.");
  }
  if (typeof dependencies.image !== "function") {
    throw new TypeError("Archive PDF requires image.");
  }
  if (typeof dependencies.bitmap !== "function") {
    throw new TypeError("Archive PDF requires bitmap.");
  }
  if (typeof dependencies.metrics !== "function") {
    throw new TypeError("Archive PDF requires metrics.");
  }
  if (typeof dependencies.wrap !== "function") {
    throw new TypeError("Archive PDF requires wrap.");
  }
  if (typeof dependencies.text !== "function") {
    throw new TypeError("Archive PDF requires text.");
  }
  if (typeof dependencies.rectangle !== "function") {
    throw new TypeError("Archive PDF requires rectangle.");
  }
  if (typeof dependencies.timestamp !== "function") {
    throw new TypeError("Archive PDF requires timestamp.");
  }
  if (typeof dependencies.t !== "function") {
    throw new TypeError("Archive PDF requires t.");
  }
  if (typeof dependencies.canvas !== "function") {
    throw new TypeError("Archive PDF requires canvas.");
  }
  if (typeof dependencies.account !== "function") {
    throw new TypeError("Archive PDF requires account.");
  }
  const getArchivePdfImageFrames = dependencies.images;
  const getArchivePdfExternalCardLayout = dependencies.externalCard;
  const estimateArchivePostCardHeight = dependencies.height;
  const getArchiveThreadGroupKey = dependencies.groupKey;
  const getArchivePdfThreadBlockFrame = dependencies.frame;
  const fillRoundedRect = dependencies.fill;
  const strokeRoundedRect = dependencies.stroke;
  const drawCircularImageCover = dependencies.circle;
  const drawRoundedImageContain = dependencies.image;
  const loadArchiveAssetBitmap = dependencies.bitmap;
  const buildArchivePostMetricLabels = dependencies.metrics;
  const buildWrappedPdfLines = dependencies.wrap;
  const drawArchivePdfTextBlock = dependencies.text;
  const canvasRectToPdfRect = dependencies.rectangle;
  const formatHistoryTimestamp = dependencies.timestamp;
  const t = dependencies.t;
  /**
   * Paints one metric badge and returns its horizontal extent.
   * @param {CanvasRenderingContext2D} context - Canvas context used for measurement and drawing.
   * @param {string} label - Localized metric badge text.
   * @param {number} x - Left coordinate in Canvas pixels.
   * @param {number} y - Top coordinate in Canvas pixels.
   * @param {number} scale - Canvas pixels per PDF point.
   * @returns {number} Badge width in Canvas pixels.
   */
  function drawArchivePdfMetricPill(context, label, x, y, scale) {
    const paddingX = 8 * scale;
    const width = context.measureText(label).width + paddingX * 2;
    const height = 18 * scale;
    fillRoundedRect(context, x, y, width, height, 9 * scale, "#edf4ff");
    strokeRoundedRect(context, x, y, width, height, 9 * scale, "#d0ddf6", 1 * scale);
    context.fillStyle = "#3d5f8f";
    context.fillText(label, x + paddingX, y + 4 * scale);
    return width;
  }

  /**
   * Paints a post card and returns its height and PDF link annotations.
   * @param {CanvasRenderingContext2D} context - Canvas context used for measurement and drawing.
   * @param {Map} assetMap - Image assets indexed by archive path.
   * @param {object} post - Archive post with text, facets, media and thread metadata.
   * @param {number} x - Left coordinate in Canvas pixels.
   * @param {number} y - Top coordinate in Canvas pixels.
   * @param {number} width - Card width in Canvas pixels.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @param {number} scale - Canvas pixels per PDF point.
   * @param {number} canvasWidth - Page width for PDF annotation conversion.
   * @param {number} canvasHeight - Page height for PDF annotation conversion.
   * @param {object} layout - Optional integrated card mode and reply depth.
   * @returns {Promise<object>} Card height and PDF link annotations.
   */
  async function drawArchivePdfPostCard(context, assetMap, post, x, y, width, options, scale, canvasWidth, canvasHeight, layout = {}) {
    const innerPadding = 16 * scale;
    const annotations = [];
    const integrated = layout.mode === "integrated";
    let layoutMode;
    if (integrated) {
      layoutMode = "integrated";
    } else {
      layoutMode = "standalone";
    }
    const cardHeight = estimateArchivePostCardHeight(context, post, options, scale, width, layoutMode);
    let isReply;
    if (integrated) {
      isReply = (layout.depth || 0) > 0;
    } else {
      isReply = false;
    }
    let cardRadius;
    if (integrated) {
      cardRadius = 14 * scale;
    } else {
      cardRadius = 18 * scale;
    }
    let cardFill = "#ffffff";
    if (integrated && isReply) {
      cardFill = "#f8fbff";
    }
    let cardStroke;
    if (integrated) {
      if (isReply) {
        cardStroke = "#d9e5f5";
      } else {
        cardStroke = "#d2deef";
      }
    } else {
      cardStroke = "#d7e3f5";
    }
    if (!integrated) {
      context.save();
      context.shadowColor = "rgba(20, 35, 60, 0.08)";
      context.shadowBlur = 18 * scale;
      context.shadowOffsetY = 7 * scale;
      fillRoundedRect(context, x, y, width, cardHeight, cardRadius, cardFill);
      context.restore();
    } else {
      fillRoundedRect(context, x, y, width, cardHeight, cardRadius, cardFill);
    }
    let strokeWidth;
    if (integrated) {
      strokeWidth = 1 * scale;
    } else {
      strokeWidth = 1.2 * scale;
    }
    strokeRoundedRect(context, x, y, width, cardHeight, cardRadius, cardStroke, strokeWidth);
    if (!integrated) {
      fillRoundedRect(context, x + 10 * scale, y + 14 * scale, 4 * scale, cardHeight - 28 * scale, 3 * scale, "#4e8cff");
    }
    let cursorY = y + innerPadding;
    let standaloneInset;
    if (integrated) {
      standaloneInset = 0;
    } else {
      standaloneInset = 8 * scale;
    }
    const textStartX = x + innerPadding + standaloneInset;
    const depthIndent = 0;
    const avatarSize = 28 * scale;
    const avatarGap = 10 * scale;
    let avatarAsset;
    if (post.authorAvatarPath) {
      avatarAsset = assetMap.get(post.authorAvatarPath);
    } else {
      avatarAsset = null;
    }
    let avatarOffset;
    if (avatarAsset) {
      avatarOffset = avatarSize + avatarGap;
    } else {
      avatarOffset = 0;
    }
    const cardContentX = textStartX + depthIndent + avatarOffset;
    const contentWidth = width - innerPadding * 2 - depthIndent - avatarOffset;
    if (integrated && isReply) {
      fillRoundedRect(context, x + 10 * scale, y + 12 * scale, 3 * scale, cardHeight - 24 * scale, 2 * scale, "#d95f4b");
    } else if (!integrated && (Number(post?.threadDepth) || 0) > 0) {
      fillRoundedRect(context, cardContentX - 12 * scale, y + 14 * scale, 4 * scale, cardHeight - 28 * scale, 3 * scale, "#d95f4b");
    }
    context.textBaseline = "top";
    if (avatarAsset) {
      const avatarBitmap = await loadArchiveAssetBitmap(avatarAsset);
      drawCircularImageCover(context, avatarBitmap, textStartX, cursorY, avatarSize);
      avatarBitmap.close();
    }
    context.fillStyle = "#13213c";
    context.font = `700 ${14 * scale}px "Segoe UI", Aptos, sans-serif`;
    const pdfAuthorTitle = post.authorDisplayName || post.authorHandle || dependencies.account() || "Bluesky";
    context.fillText(pdfAuthorTitle, cardContentX, cursorY);
    context.fillStyle = "#577194";
    context.font = `${9.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(`@${post.authorHandle || dependencies.account() || "bluesky"}`, cardContentX, cursorY + 16 * scale);
    const dateText = formatHistoryTimestamp(post.createdAt);
    const dateWidth = context.measureText(dateText).width;
    context.fillText(dateText, x + width - innerPadding - dateWidth, cursorY + 2 * scale);
    cursorY += 32 * scale;
    if (options.includeMetrics) {
      context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
      let pillX = cardContentX;
      const pillY = cursorY;
      for (const label of buildArchivePostMetricLabels(post)) {
        pillX += drawArchivePdfMetricPill(context, label, pillX, pillY, scale) + 6 * scale;
      }
      cursorY += 28 * scale;
    }
    if (post?.editInfo?.isEdited === true) {
      context.fillStyle = "#92560d";
      context.font = `700 ${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(t("archiveHtmlEditedBadge"), cardContentX, cursorY);
      cursorY += 20 * scale;
    }
    context.fillStyle = "#17233a";
    context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
    const textLines = buildWrappedPdfLines(context, post.text || "", contentWidth, post.facets || []);
    const textBlock = drawArchivePdfTextBlock(context, textLines, cardContentX, cursorY, 15 * scale);
    annotations.push(...textBlock.annotations.map(annotation => ({
      rect: canvasRectToPdfRect(annotation, canvasWidth, canvasHeight),
      url: annotation.url
    })));
    cursorY += textBlock.height + 12 * scale;
    const externalCardLayout = getArchivePdfExternalCardLayout(context, post, contentWidth, scale);
    if (externalCardLayout) {
      const cardX = cardContentX;
      const cardY = cursorY;
      fillRoundedRect(context, cardX, cardY, contentWidth, externalCardLayout.height, 14 * scale, "#eef4ff");
      strokeRoundedRect(context, cardX, cardY, contentWidth, externalCardLayout.height, 14 * scale, "#d2def0", 1 * scale);
      let textX = cardX + externalCardLayout.cardPadding;
      const textY = cardY + externalCardLayout.cardPadding;
      if (externalCardLayout.hasThumbSlot) {
        const thumbX = cardX + externalCardLayout.cardPadding;
        const thumbY = cardY + externalCardLayout.cardPadding;
        const thumbAsset = assetMap.get(externalCardLayout.card.thumbPath);
        if (thumbAsset && externalCardLayout.hasThumb) {
          const thumbBitmap = await loadArchiveAssetBitmap(thumbAsset);
          drawRoundedImageContain(context, thumbBitmap, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#dfe8f7");
          thumbBitmap.close();
        } else {
          fillRoundedRect(context, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#dfe8f7");
          if (externalCardLayout.thumbFailed) {
            context.fillStyle = "#5b6f8d";
            context.font = `${8.4 * scale}px "Segoe UI", Aptos, sans-serif`;
            drawArchivePdfTextBlock(context, externalCardLayout.failedLines, thumbX + 7 * scale, thumbY + 10 * scale, 10.5 * scale);
          }
        }
        strokeRoundedRect(context, thumbX, thumbY, externalCardLayout.thumbWidth, externalCardLayout.thumbHeight, 10 * scale, "#d5e0f2", 1 * scale);
        textX += externalCardLayout.thumbWidth + externalCardLayout.gap;
      }
      context.fillStyle = "#122642";
      context.font = `700 ${10.5 * scale}px "Segoe UI", Aptos, sans-serif`;
      const titleBlock = drawArchivePdfTextBlock(context, externalCardLayout.titleLines, textX, textY, 13 * scale);
      let cardTextY = textY + titleBlock.height;
      if (externalCardLayout.descriptionLines.length > 0) {
        cardTextY += 4 * scale;
        context.fillStyle = "#415b81";
        context.font = `${9.2 * scale}px "Segoe UI", Aptos, sans-serif`;
        const descriptionBlock = drawArchivePdfTextBlock(context, externalCardLayout.descriptionLines, textX, cardTextY, 11.5 * scale);
        cardTextY += descriptionBlock.height;
      }
      if (externalCardLayout.urlLines.length > 0) {
        cardTextY += 5 * scale;
        context.fillStyle = "#1d4ed8";
        context.font = `${8.6 * scale}px "Segoe UI", Aptos, sans-serif`;
        drawArchivePdfTextBlock(context, externalCardLayout.urlLines, textX, cardTextY, 10.5 * scale);
      }
      annotations.push({
        rect: canvasRectToPdfRect({
          x: cardX,
          y: cardY,
          width: contentWidth,
          height: externalCardLayout.height
        }, canvasWidth, canvasHeight),
        url: externalCardLayout.card.url
      });
      cursorY += externalCardLayout.height + 12 * scale;
    }
    const imageLayout = getArchivePdfImageFrames(post, contentWidth, options, scale);
    for (const frame of imageLayout.frames) {
      const asset = assetMap.get(frame.image.path);
      const frameX = cardContentX + frame.x;
      const frameY = cursorY + frame.y;
      if (asset) {
        const bitmap = await loadArchiveAssetBitmap(asset);
        drawRoundedImageContain(context, bitmap, frameX, frameY, frame.width, frame.height, 12 * scale);
        bitmap.close();
      } else {
        fillRoundedRect(context, frameX, frameY, frame.width, frame.height, 12 * scale, "#eaf1fb");
      }
      strokeRoundedRect(context, frameX, frameY, frame.width, frame.height, 12 * scale, "#d5e0f2", 1 * scale);
      if (frame.image.alt) {
        context.fillStyle = "#5d7394";
        context.font = `${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
        const altLines = buildWrappedPdfLines(context, `${t("archivePdfAltPrefix")} ${frame.image.alt}`, frame.width);
        drawArchivePdfTextBlock(context, altLines.slice(0, frame.captionLines || 2), frameX, frameY + frame.height + 4 * scale, 12 * scale);
      }
    }
    if (imageLayout.totalHeight > 0) {
      cursorY += imageLayout.totalHeight + 10 * scale;
    }
    const footerY = y + cardHeight - innerPadding - 18 * scale;
    const permalinkText = post.permalink || post.uri || "";
    let buttonLabel;
    if (permalinkText) {
      buttonLabel = t("archivePdfOpenPost");
    } else {
      buttonLabel = "";
    }
    if (buttonLabel) {
      context.font = `700 ${9 * scale}px "Segoe UI", Aptos, sans-serif`;
      const buttonWidth = context.measureText(buttonLabel).width + 22 * scale;
      fillRoundedRect(context, cardContentX, footerY, buttonWidth, 20 * scale, 10 * scale, "#122642");
      context.fillStyle = "#ffffff";
      context.fillText(buttonLabel, cardContentX + 11 * scale, footerY + 4.5 * scale);
      annotations.push({
        rect: canvasRectToPdfRect({
          x: cardContentX,
          y: footerY,
          width: buttonWidth,
          height: 20 * scale
        }, canvasWidth, canvasHeight),
        url: permalinkText
      });
    }
    context.fillStyle = "#7489a5";
    context.font = `${8.2 * scale}px "Segoe UI", Aptos, sans-serif`;
    const uriLabel = (post.uri || "").replace(/^at:\/\//, "");
    if (uriLabel) {
      const maxUriWidth = width - innerPadding * 2 - 140 * scale;
      let clipped = uriLabel;
      while (clipped && context.measureText(clipped).width > maxUriWidth) {
        clipped = `${clipped.slice(0, -2)}…`;
      }
      context.fillText(clipped, x + width - innerPadding - context.measureText(clipped).width, footerY + 5 * scale);
    }
    return {
      height: cardHeight,
      annotations
    };
  }

  /**
   * Paints an A4 archive page and encodes its JPEG bytes and annotations.
   * @param {object} catalog - Archive account, summary and image assets.
   * @param {object[]} posts - Posts to measure, order or render.
   * @param {number} pageIndex - Zero-based page index within the volume.
   * @param {number} pageCount - Total pages in the volume.
   * @param {number} bandIndex - Zero-based volume index.
   * @param {number} bandCount - Total number of volumes.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @returns {Promise<object>} JPEG bytes, dimensions and PDF link annotations.
   */
  async function renderArchivePdfCanvasPage(catalog, posts, pageIndex, pageCount, bandIndex, bandCount, options) {
    const assetMap = new Map((catalog.assets || []).map(asset => [asset.path, asset]));
    const canvas = dependencies.canvas();
    canvas.width = 1190;
    canvas.height = 1684;
    const context = canvas.getContext("2d");
    const scale = canvas.width / 595;
    const margin = 28 * scale;
    const pageWidth = canvas.width - margin * 2;
    const pageHeight = canvas.height - margin * 2;
    const cardGap = 16 * scale;
    const headerHeight = 42 * scale;
    let cursorY = margin + headerHeight;
    const annotations = [];
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#f3f8ff");
    gradient.addColorStop(1, "#e7eef9");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    fillRoundedRect(context, margin, margin, pageWidth, pageHeight, 22 * scale, "rgba(255,255,255,0.42)");
    strokeRoundedRect(context, margin, margin, pageWidth, pageHeight, 22 * scale, "#d5e1f3", 1.2 * scale);
    context.textBaseline = "top";
    context.fillStyle = "#10233e";
    context.font = `700 ${16 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(catalog?.account?.handle || dependencies.account() || t("archivePdfArchiveTitle"), margin + 18 * scale, margin + 14 * scale);
    context.fillStyle = "#587192";
    context.font = `${9.5 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(t("archivePdfVolume", {
      index: bandIndex + 1,
      count: bandCount
    }), margin + 18 * scale, margin + 34 * scale);
    const pageCounter = t("archivePdfPage", {
      index: pageIndex + 1,
      count: pageCount
    });
    const pageCounterWidth = context.measureText(pageCounter).width;
    context.fillText(pageCounter, margin + pageWidth - 18 * scale - pageCounterWidth, margin + 24 * scale);
    const skippedImageCount = Number(catalog?.summary?.skippedImageCount) || 0;
    if (skippedImageCount > 0) {
      context.fillStyle = "#a33e2d";
      context.font = `${8.8 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillText(t("archiveSkippedImagesPdfNotice", {
        skipped: skippedImageCount
      }), margin + 18 * scale, margin + 48 * scale);
    }
    const baseCardX = margin + 18 * scale;
    const baseCardWidth = pageWidth - 36 * scale;
    const laidOutPosts = [];
    for (const post of posts) {
      const frame = getArchivePdfThreadBlockFrame(baseCardX, baseCardWidth, post, options, scale);
      const cardHeight = estimateArchivePostCardHeight(context, post, options, scale, frame.width, "integrated");
      laidOutPosts.push({
        post,
        y: cursorY,
        cardHeight,
        x: frame.x,
        width: frame.width,
        depth: frame.depth,
        groupKey: getArchiveThreadGroupKey(post)
      });
      cursorY += cardHeight + cardGap;
    }
    const pageGroups = [];
    laidOutPosts.forEach(entry => {
      const currentGroup = pageGroups[pageGroups.length - 1];
      if (!currentGroup || currentGroup.groupKey !== entry.groupKey) {
        pageGroups.push({
          groupKey: entry.groupKey,
          entries: [entry]
        });
      } else {
        currentGroup.entries.push(entry);
      }
    });
    pageGroups.forEach(group => {
      if (group.entries.length <= 1 && !(group.entries[0]?.post?.threadDepth > 0)) {
        return;
      }
      const first = group.entries[0];
      const last = group.entries[group.entries.length - 1];
      const groupX = baseCardX - 6 * scale;
      const groupY = first.y - 10 * scale;
      const groupWidth = baseCardWidth + 12 * scale;
      const groupHeight = last.y + last.cardHeight - first.y + 20 * scale;
      fillRoundedRect(context, groupX, groupY, groupWidth, groupHeight, 22 * scale, "rgba(255,255,255,0.72)");
      strokeRoundedRect(context, groupX, groupY, groupWidth, groupHeight, 22 * scale, "#d7e3f5", 1 * scale);
      fillRoundedRect(context, groupX + 10 * scale, groupY + 14 * scale, 4 * scale, groupHeight - 28 * scale, 3 * scale, "#d95f4b");
    });
    for (const entry of laidOutPosts) {
      const inThreadGroup = (entry.depth || 0) > 0 || pageGroups.some(group => group.groupKey === entry.groupKey && group.entries.length > 1);
      let cardLayout;
      if (inThreadGroup) {
        cardLayout = {
          mode: "integrated",
          depth: entry.depth
        };
      } else {
        cardLayout = {};
      }
      const card = await drawArchivePdfPostCard(context, assetMap, entry.post, entry.x, entry.y, entry.width, options, scale, canvas.width, canvas.height, cardLayout);
      annotations.push(...card.annotations);
    }
    const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
    const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
    return {
      bytes,
      width: canvas.width,
      height: canvas.height,
      annotations
    };
  }
  return {
    post: drawArchivePdfPostCard,
    page: renderArchivePdfCanvasPage
  };
}
