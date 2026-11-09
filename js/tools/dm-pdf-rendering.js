/**
 * Creates DM A4 pagination and linked Canvas page rendering.
 * @param {object} dependencies - Required model, drawing and environment adapters.
 * @param {Function} dependencies.partner - Resolves primary partner metadata.
 * @param {Function} dependencies.title - Resolves the conversation title.
 * @param {Function} dependencies.wrap - Measures and wraps rich-text lines.
 * @param {Function} dependencies.bitmap - Decodes an asset to a closable bitmap.
 * @param {Function} dependencies.circle - Draws a circular avatar.
 * @param {Function} dependencies.timestamp - Formats a visible timestamp.
 * @param {Function} dependencies.fill - Fills a rounded bubble.
 * @param {Function} dependencies.stroke - Outlines a rounded bubble.
 * @param {Function} dependencies.text - Draws lines and returns link annotations.
 * @param {Function} dependencies.rectangle - Converts a Canvas rectangle to PDF coordinates.
 * @param {Function} dependencies.t - Resolves a localized translation key.
 * @param {Function} dependencies.canvas - Creates a Canvas for measurement and rendering.
 * @returns {object} height, paginate, page operations.
 */
export function createDmPdfRenderer(dependencies) {
  for (const name of ["partner", "title", "wrap", "bitmap", "circle", "timestamp", "fill", "stroke", "text", "rectangle", "t", "canvas"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`DM export requires ${name}.`);
    }
  }
  const getDmPrimaryPartner = dependencies.partner;
  const getDmConversationTitle = dependencies.title;
  const buildWrappedPdfLines = dependencies.wrap;
  const loadArchiveAssetBitmap = dependencies.bitmap;
  const drawCircularImageCover = dependencies.circle;
  const formatCompactArchiveTimestamp = dependencies.timestamp;
  const fillRoundedRect = dependencies.fill;
  const strokeRoundedRect = dependencies.stroke;
  const drawArchivePdfTextBlock = dependencies.text;
  const canvasRectToPdfRect = dependencies.rectangle;
  const t = dependencies.t;
  /**
   * Measures a message bubble with text and optional avatar inset.
   * @param {CanvasRenderingContext2D} context - Context used for text measurement.
   * @param {object} message - Normalized sender, text, facets and avatar metadata.
   * @param {number} maxWidth - Available bubble width in Canvas pixels.
   * @param {number} scale - Canvas pixels per PDF point.
   * @returns {number} Required bubble height.
   */
  function estimateDmPdfMessageHeight(context, message, maxWidth, scale) {
    context.font = `${13 * scale}px "Segoe UI", Aptos, sans-serif`;
    const lineHeight = 18 * scale;
    let avatarOffset;
    if (message.senderAvatarPath) {
      avatarOffset = 38 * scale;
    } else {
      avatarOffset = 0;
    }
    const textLines = buildWrappedPdfLines(context, message.text || "", maxWidth - 36 * scale - avatarOffset, message.facets || []);
    const textHeight = Math.max(lineHeight, textLines.length * lineHeight);
    return 72 * scale + textHeight;
  }

  /**
   * Packs own/other message bubbles into A4 pages, retaining one empty page.
   * @param {object[]} messages - Chronologically ordered export messages.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {object[][]} Pages of positioned entries, including an empty fallback page.
   */
  function paginateDmPdfMessages(messages, catalog) {
    const canvas = dependencies.canvas();
    canvas.width = 1190;
    canvas.height = 1684;
    const context = canvas.getContext("2d");
    const scale = canvas.width / 595;
    const top = 112 * scale;
    const bottom = 88 * scale;
    const left = 54 * scale;
    const right = 54 * scale;
    const maxBubbleWidth = (canvas.width - left - right) * 0.76;
    const pages = [];
    let currentPage = [];
    let currentHeight = top;
    const selfDid = catalog?.manifest?.account?.did || "";
    messages.forEach((message, index) => {
      const isOwn = message.senderDid && message.senderDid === selfDid;
      const width = Math.max(320 * scale, maxBubbleWidth);
      const height = estimateDmPdfMessageHeight(context, message, width, scale);
      if (currentPage.length > 0 && currentHeight + height > canvas.height - bottom) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = top;
      }
      let bubbleX;
      if (isOwn) {
        bubbleX = canvas.width - right - width;
      } else {
        bubbleX = left;
      }
      currentPage.push({
        message,
        isOwn,
        x: bubbleX,
        y: currentHeight,
        width,
        height
      });
      currentHeight += height + 14 * scale;
      if (index === messages.length - 1 && currentPage.length > 0) {
        pages.push(currentPage);
      }
    });
    let resultPages;
    if (pages.length > 0) {
      resultPages = pages;
    } else {
      resultPages = [[]];
    }
    return resultPages;
  }

  /**
   * Paints one linked A4 DM page and returns JPEG bytes and annotations.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @param {Map} assetMap - Image assets indexed by path.
   * @param {object[]} entries - Positioned message bubbles.
   * @param {number} pageIndex - Zero-based page index.
   * @param {number} pageCount - Total number of pages.
   * @returns {Promise<object>} JPEG bytes, dimensions and link annotations.
   */
  async function renderDmPdfCanvasPage(catalog, assetMap, entries, pageIndex, pageCount) {
    const canvas = dependencies.canvas();
    canvas.width = 1190;
    canvas.height = 1684;
    const context = canvas.getContext("2d");
    const scale = canvas.width / 595;
    const annotations = [];
    const partner = getDmPrimaryPartner(catalog);
    const handle = catalog?.manifest?.account?.handle || "";
    let partnerAvatarAsset;
    if (partner?.avatarPath) {
      partnerAvatarAsset = assetMap.get(partner.avatarPath);
    } else {
      partnerAvatarAsset = null;
    }
    context.fillStyle = "#f3f7ff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#10233e";
    context.font = `700 ${24 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillText(getDmConversationTitle(entries[0]?.message?.conversation || catalog?.conversations?.[0], catalog), 54 * scale, 44 * scale);
    if (partnerAvatarAsset) {
      const avatarBitmap = await loadArchiveAssetBitmap(partnerAvatarAsset);
      drawCircularImageCover(context, avatarBitmap, canvas.width - 122 * scale, 30 * scale, 42 * scale);
      avatarBitmap.close();
    }
    context.font = `${12 * scale}px "Segoe UI", Aptos, sans-serif`;
    context.fillStyle = "#5f7593";
    let partnerHandle;
    if (partner?.handle) {
      partnerHandle = ` · @${partner.handle}`;
    } else {
      partnerHandle = "";
    }
    context.fillText(`${t("dmPartnerLabel")}: ${partner?.displayName || ""}${partnerHandle}`, 54 * scale, 70 * scale);
    context.fillText(`@${handle} · ${formatCompactArchiveTimestamp(catalog?.manifest?.exportedAt || "")}`, 54 * scale, 88 * scale);
    context.fillText(`${pageIndex + 1}/${pageCount}`, canvas.width - 90 * scale, 88 * scale);
    for (const entry of entries) {
      const {
        message,
        isOwn,
        x,
        y,
        width,
        height
      } = entry;
      let bubbleFill;
      if (isOwn) {
        bubbleFill = "#dce9ff";
      } else {
        bubbleFill = "#ffffff";
      }
      fillRoundedRect(context, x, y, width, height, 20 * scale, bubbleFill);
      let bubbleStroke;
      if (isOwn) {
        bubbleStroke = "#b8cdf5";
      } else {
        bubbleStroke = "#d7e1f0";
      }
      strokeRoundedRect(context, x, y, width, height, 20 * scale, bubbleStroke, 1.2 * scale);
      const avatarSize = 28 * scale;
      const avatarX = x + 18 * scale;
      const avatarY = y + 12 * scale;
      let senderAvatarAsset;
      if (message.senderAvatarPath) {
        senderAvatarAsset = assetMap.get(message.senderAvatarPath);
      } else {
        senderAvatarAsset = null;
      }
      let textInsetX;
      if (senderAvatarAsset) {
        textInsetX = avatarX + avatarSize + 10 * scale;
      } else {
        textInsetX = x + 18 * scale;
      }
      if (senderAvatarAsset) {
        const avatarBitmap = await loadArchiveAssetBitmap(senderAvatarAsset);
        drawCircularImageCover(context, avatarBitmap, avatarX, avatarY, avatarSize);
        avatarBitmap.close();
      }
      context.fillStyle = "#10233e";
      context.font = `700 ${13 * scale}px "Segoe UI", Aptos, sans-serif`;
      const senderName = message.senderDisplayName || message.senderHandle || message.senderDid || handle;
      context.fillText(senderName, textInsetX, y + 14 * scale);
      if (message.senderHandle) {
        context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
        context.fillStyle = "#5f7593";
        context.fillText(`@${message.senderHandle}`, textInsetX, y + 32 * scale);
      }
      context.font = `${11 * scale}px "Segoe UI", Aptos, sans-serif`;
      context.fillStyle = "#5f7593";
      const timeLabel = formatCompactArchiveTimestamp(message.sentAt);
      const timeWidth = context.measureText(timeLabel).width;
      context.fillText(timeLabel, x + width - timeWidth - 18 * scale, y + 16 * scale);
      context.font = `${13 * scale}px "Segoe UI", Aptos, sans-serif`;
      let avatarInset;
      if (senderAvatarAsset) {
        avatarInset = avatarSize + 10 * scale;
      } else {
        avatarInset = 0;
      }
      const lines = buildWrappedPdfLines(context, message.text || "", width - 36 * scale - avatarInset, message.facets || []);
      const textBlock = drawArchivePdfTextBlock(context, lines, textInsetX, y + 46 * scale, 18 * scale);
      annotations.push(...textBlock.annotations.map(annotation => {
        return {
          rect: canvasRectToPdfRect(annotation, canvas.width, canvas.height),
          url: annotation.url
        };
      }));
    }
    const jpegBlob = await new Promise(resolve => {
      return canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
    return {
      bytes,
      width: canvas.width,
      height: canvas.height,
      annotations
    };
  }
  return {
    height: estimateDmPdfMessageHeight,
    paginate: paginateDmPdfMessages,
    page: renderDmPdfCanvasPage
  };
}
