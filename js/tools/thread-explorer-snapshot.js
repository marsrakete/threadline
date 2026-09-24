/**
 * Builds a safe filename for a Thread Explorer snapshot.
 * @param {object} rootPost - Root post used for the filename.
 * @param {string} extension - File extension without a leading dot.
 * @param {(value: string) => string} sanitizePart - Filename-part sanitizer.
 * @param {Date} currentDate - Fallback date when the post has no timestamp.
 * @returns {string} Snapshot filename.
 */
export function buildThreadExplorerSnapshotFileName(rootPost = {}, extension = "png", sanitizePart = (value) => value, currentDate = new Date()) {
  let handle = String(rootPost.author?.handle || rootPost.author?.displayName || rootPost.author?.did || "").trim();
  if (!handle) {
    handle = "thread";
  }

  let datePart = "";
  const timestamp = Date.parse(String(rootPost.createdAt || rootPost.indexedAt || "").trim());
  if (Number.isFinite(timestamp)) {
    datePart = new Date(timestamp).toISOString().slice(0, 10);
  } else {
    datePart = currentDate.toISOString().slice(0, 10);
  }

  const safeExtension = sanitizePart(extension || "png").toLowerCase();
  const safeHandle = sanitizePart(handle.replace(/^@+/, ""));
  return `threadline-thread-${safeHandle}-${datePart}.${safeExtension}`;
}

/**
 * Counts media assets that can affect snapshot export cost.
 * @param {object|null} node - Thread Explorer tree node.
 * @returns {number} Count of post images, quote images and card thumbnails.
 */
export function countThreadExplorerSnapshotMediaAssets(node = null) {
  if (!node || typeof node !== "object") {
    return 0;
  }

  let count = 0;
  const post = node.post || {};
  if (Array.isArray(post.images)) {
    count += post.images.length;
  }
  if (post.externalCard?.thumb) {
    count += 1;
  }

  const quote = post.quoteCard || null;
  if (quote && typeof quote === "object") {
    if (Array.isArray(quote.images)) {
      count += quote.images.length;
    }
    if (quote.externalCard?.thumb) {
      count += 1;
    }
  }

  if (Array.isArray(node.replies)) {
    node.replies.forEach((reply) => {
      count += countThreadExplorerSnapshotMediaAssets(reply);
    });
  }
  return count;
}

/**
 * Calculates a bounded canvas scale for a snapshot.
 * @param {number} width - Snapshot width in CSS pixels.
 * @param {number} height - Snapshot height in CSS pixels.
 * @param {object} limits - Canvas limits and device pixel ratio.
 * @returns {number} Canvas scale factor.
 */
export function getThreadExplorerSnapshotScale(width, height, limits = {}) {
  const devicePixelRatio = Number(limits.devicePixelRatio) || 1;
  const maxDimension = Number(limits.maxDimension) || 32767;
  const maxPixels = Number(limits.maxPixels) || 268000000;
  let scale = Math.min(2, Math.max(1, devicePixelRatio));
  const longestSide = Math.max(width, height, 1);
  const pixelCount = Math.max(width * height, 1);
  const dimensionScale = maxDimension / longestSide;
  const pixelScale = Math.sqrt(maxPixels / pixelCount);

  if (dimensionScale < scale) {
    scale = dimensionScale;
  }
  if (pixelScale < scale) {
    scale = pixelScale;
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 0.1;
  }
  return Math.max(0.01, Math.min(2, scale));
}

/**
 * Creates the standard error used when snapshot export is cancelled.
 * @param {string} message - Human-readable cancellation message.
 * @returns {Error} Abort error.
 */
export function createThreadExplorerSnapshotAbortError(message = "Snapshot export cancelled") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

/**
 * Throws when snapshot export has been cancelled.
 * @param {AbortSignal|null} signal - Current export abort signal.
 * @param {string} message - Human-readable cancellation message.
 * @returns {void}
 */
export function throwIfThreadExplorerSnapshotAborted(signal = null, message = "Snapshot export cancelled") {
  if (signal?.aborted) {
    throw createThreadExplorerSnapshotAbortError(message);
  }
}

/**
 * Keeps snapshot progress inside the visible 0-100 percent range.
 * @param {number} value - Raw progress value.
 * @returns {number} Integer progress value between 0 and 100.
 */
export function clampThreadExplorerSnapshotProgress(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  if (numericValue < 0) {
    return 0;
  }
  if (numericValue > 100) {
    return 100;
  }
  return Math.round(numericValue);
}

/**
 * Builds the stable cache key for a rendered avatar image.
 * @param {HTMLImageElement|null} image - Avatar image with DID and URL metadata.
 * @returns {string} DID/URL key, or an empty string when metadata is incomplete.
 */
export function getThreadExplorerSnapshotAvatarCacheKey(image = null) {
  const did = String(image?.dataset?.avatarDid || "").trim();
  const avatarUrl = String(image?.dataset?.avatarUrl || "").trim();
  if (!did || !avatarUrl) {
    return "";
  }
  return `${did}|${avatarUrl}`;
}

/**
 * Resolves an avatar data URI from supplied cached assets.
 * @param {HTMLImageElement|null} image - Avatar image with DID and URL metadata.
 * @param {Array<object>} assets - Cached avatar assets.
 * @param {Function} assetToDataUri - Converts a matching asset into a data URI.
 * @returns {string} Cached data URI, or an empty string when unavailable.
 */
export function getThreadExplorerSnapshotCachedAvatarUri(image = null, assets = [], assetToDataUri = null) {
  const did = String(image?.dataset?.avatarDid || "").trim();
  const avatarUrl = String(image?.dataset?.avatarUrl || "").trim();
  if (!did || !avatarUrl || !Array.isArray(assets) || typeof assetToDataUri !== "function") {
    return "";
  }
  const asset = assets.find((entry) => entry?.did === did && entry?.url === avatarUrl);
  if (!asset) {
    return "";
  }
  return assetToDataUri(asset);
}

/**
 * Determines whether an image belongs to post media rather than an avatar.
 * @param {HTMLImageElement|null} image - Rendered image element.
 * @returns {boolean} True when the image belongs to a snapshot media region.
 */
export function isThreadExplorerSnapshotMediaImage(image = null) {
  if (!image || image.hidden || !image.classList) {
    return false;
  }
  if (image.classList.contains("thread-explorer-avatar")) {
    return false;
  }
  if (image.classList.contains("thread-explorer-quote-card-avatar")) {
    return false;
  }
  if (typeof image.closest !== "function") {
    return false;
  }
  return Boolean(image.closest(".thread-explorer-post-gallery, .thread-explorer-link-card, .thread-explorer-quote-card-gallery, .thread-explorer-quote-link-card"));
}

/**
 * Returns unique snapshot cache keys for a rendered media image in priority order.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @returns {string[]} Unique keys, preferring saved full and thumbnail sources.
 */
export function getThreadExplorerSnapshotMediaImageKeys(image = null) {
  const candidates = [
    image?.dataset?.snapshotSource,
    image?.dataset?.snapshotThumb,
    image?.currentSrc,
    image?.src,
  ];
  const keys = [];
  candidates.forEach((candidate) => {
    const source = String(candidate || "").trim();
    if (!source || keys.includes(source)) {
      return;
    }
    keys.push(source);
  });
  return keys;
}

/**
 * Returns the preferred source key for one rendered media image.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @returns {string} Preferred key, or an empty string when no source exists.
 */
export function getThreadExplorerSnapshotMediaImageKey(image = null) {
  const keys = getThreadExplorerSnapshotMediaImageKeys(image);
  if (keys.length === 0) {
    return "";
  }
  return keys[0];
}

/**
 * Finds a preloaded snapshot image using all known source keys.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @param {Map<string, HTMLImageElement>} mediaImages - Preloaded image map.
 * @returns {HTMLImageElement|null} Matching loaded image, or null.
 */
export function getThreadExplorerSnapshotDrawableMediaImage(image = null, mediaImages = new Map()) {
  const keys = getThreadExplorerSnapshotMediaImageKeys(image);
  for (const key of keys) {
    if (mediaImages.has(key)) {
      return mediaImages.get(key);
    }
  }
  return null;
}

/**
 * Finds a cached data URI for a media image among cache maps.
 * @param {string[]} keys - Equivalent source keys for one image.
 * @param {Array<Map<string, string>>} caches - Ordered cache maps to search.
 * @returns {string} First cached data URI, or an empty string.
 */
export function getThreadExplorerSnapshotMediaDataUri(keys = [], caches = []) {
  if (!Array.isArray(keys) || !Array.isArray(caches)) {
    return "";
  }
  for (const key of keys) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      continue;
    }
    for (const cache of caches) {
      if (cache instanceof Map && cache.has(normalizedKey)) {
        return cache.get(normalizedKey);
      }
    }
  }
  return "";
}

/**
 * Assigns full/thumb image sources while preferring a cached data URI.
 * @param {HTMLImageElement|null} image - Target image element.
 * @param {string} primarySource - Preferred full image source.
 * @param {string} secondarySource - Optional thumbnail source.
 * @param {Function} getCachedDataUri - Resolves a data URI for the known keys.
 * @returns {void} No return value.
 */
export function setThreadExplorerSnapshotCachedImageSource(image = null, primarySource = "", secondarySource = "", getCachedDataUri = null) {
  if (!image) {
    return;
  }
  const normalizedPrimary = String(primarySource || "").trim();
  const normalizedSecondary = String(secondarySource || "").trim();
  if (normalizedPrimary) {
    image.dataset.snapshotSource = normalizedPrimary;
  } else {
    delete image.dataset.snapshotSource;
  }
  if (normalizedSecondary && normalizedSecondary !== normalizedPrimary) {
    image.dataset.snapshotThumb = normalizedSecondary;
  } else {
    delete image.dataset.snapshotThumb;
  }
  let dataUri = "";
  if (typeof getCachedDataUri === "function") {
    dataUri = getCachedDataUri(getThreadExplorerSnapshotMediaImageKeys(image));
  }
  if (dataUri) {
    image.dataset.snapshotHydrated = "true";
    image.src = dataUri;
    return;
  }
  delete image.dataset.snapshotHydrated;
  if (normalizedPrimary) {
    image.src = normalizedPrimary;
  } else if (normalizedSecondary) {
    image.src = normalizedSecondary;
  } else if (typeof image.removeAttribute === "function") {
    image.removeAttribute("src");
  }
}

/**
 * Preloads unique cached avatars used by the rendered Thread Explorer cards.
 * @param {Array<HTMLElement>} cards - Rendered post cards.
 * @param {object} options - Avatar selection, cache lookup, and image loader callbacks.
 * @param {Function} options.getAvatar - Resolves a card's avatar element.
 * @param {Function} options.getCacheKey - Resolves an avatar cache key.
 * @param {Function} options.getCachedAvatarUri - Resolves its cached data URI.
 * @param {Function} options.loadImage - Loads a data URI into a drawable image.
 * @returns {Promise<Map<string, HTMLImageElement>>} Loaded unique avatar images.
 */
export async function preloadThreadExplorerSnapshotAvatarImages(cards = [], options = {}) {
  const avatarEntries = new Map();
  if (!Array.isArray(cards)) {
    return new Map();
  }
  cards.forEach((card) => {
    if (typeof options.getAvatar !== "function") {
      return;
    }
    const avatar = options.getAvatar(card);
    let key = "";
    if (typeof options.getCacheKey === "function") {
      key = options.getCacheKey(avatar);
    }
    if (!key || avatarEntries.has(key) || typeof options.getCachedAvatarUri !== "function") {
      return;
    }
    const dataUri = options.getCachedAvatarUri(avatar);
    if (dataUri) {
      avatarEntries.set(key, dataUri);
    }
  });
  const loaded = new Map();
  if (typeof options.loadImage !== "function") {
    return loaded;
  }
  for (const [key, dataUri] of avatarEntries.entries()) {
    const image = await options.loadImage(dataUri);
    if (image) {
      loaded.set(key, image);
    }
  }
  return loaded;
}

/**
 * Collects and preloads unique media sources needed for Thread Explorer snapshots.
 * @param {Array<HTMLElement>} cards - Rendered post cards.
 * @param {object} options - Image selection, cache, encoding, and loader callbacks.
 * @param {Function} options.getImages - Resolves image elements contained by a card.
 * @param {Function} options.isMediaImage - Determines whether an image is post media.
 * @param {Function} options.getImageKeys - Resolves all equivalent source keys.
 * @param {Function} options.getCachedDataUri - Resolves a cached data URI for source keys.
 * @param {Function} options.encodeImage - Encodes an already loaded image when possible.
 * @param {Function} options.canDrawImage - Checks whether the image can be drawn directly.
 * @param {Function} options.loadImage - Loads a source into a drawable image.
 * @returns {Promise<Map<string, HTMLImageElement>>} Loaded drawable images indexed by source keys.
 */
export async function preloadThreadExplorerSnapshotMediaImages(cards = [], options = {}) {
  const sourceEntries = new Map();
  if (!Array.isArray(cards)) {
    return new Map();
  }
  cards.forEach((card) => {
    if (typeof options.getImages !== "function") {
      return;
    }
    const images = Array.from(options.getImages(card) || []);
    images.forEach((image) => {
      if (typeof options.isMediaImage !== "function" || !options.isMediaImage(image)) {
        return;
      }
      let keys = [];
      if (typeof options.getImageKeys === "function") {
        keys = options.getImageKeys(image);
      }
      if (!Array.isArray(keys) || keys.length === 0) {
        return;
      }
      let source = "";
      if (typeof options.getCachedDataUri === "function") {
        source = options.getCachedDataUri(keys);
      }
      if (!source && typeof options.encodeImage === "function") {
        source = options.encodeImage(image);
      }
      if (!source && typeof options.canDrawImage === "function" && options.canDrawImage(image)) {
        source = String(image.currentSrc || image.src || "").trim();
      }
      if (!source) {
        return;
      }
      keys.forEach((key) => {
        if (!sourceEntries.has(key)) {
          sourceEntries.set(key, source);
        }
      });
    });
  });
  const loaded = new Map();
  if (typeof options.loadImage !== "function") {
    return loaded;
  }
  const keysBySource = new Map();
  for (const [key, source] of sourceEntries.entries()) {
    if (!keysBySource.has(source)) {
      keysBySource.set(source, []);
    }
    keysBySource.get(source).push(key);
  }
  for (const [source, keys] of keysBySource.entries()) {
    const image = await options.loadImage(source);
    if (image) {
      keys.forEach((key) => loaded.set(key, image));
    }
  }
  return loaded;
}

/**
 * Replaces rendered media sources with cached data URIs when available.
 * @param {Array<HTMLImageElement>} images - Images from the visible Thread Explorer stage.
 * @param {object} options - Media predicate, key lookup, cache lookup, and callback.
 * @param {Function} options.isMediaImage - Determines whether an image is post media.
 * @param {Function} options.getImageKeys - Resolves the image's equivalent source keys.
 * @param {Function} options.getCachedDataUri - Resolves a cached data URI.
 * @param {Function} options.onApplied - Called after an image source was replaced.
 * @returns {number} Number of image elements switched to cached sources.
 */
export function applyThreadExplorerSnapshotMediaCache(images = [], options = {}) {
  if (!Array.isArray(images)) {
    return 0;
  }
  let appliedCount = 0;
  images.forEach((image) => {
    if (typeof options.isMediaImage !== "function" || !options.isMediaImage(image)) {
      return;
    }
    let keys = [];
    if (typeof options.getImageKeys === "function") {
      keys = options.getImageKeys(image);
    }
    let dataUri = "";
    if (typeof options.getCachedDataUri === "function") {
      dataUri = options.getCachedDataUri(keys);
    }
    if (!dataUri || image.src === dataUri) {
      return;
    }
    image.dataset.snapshotHydrated = "true";
    image.src = dataUri;
    appliedCount += 1;
    if (typeof options.onApplied === "function") {
      options.onApplied(image);
    }
  });
  return appliedCount;
}

/**
 * Stores a media data URI under every valid source key in one cache map.
 * @param {Map<string, string>} cache - Destination media cache.
 * @param {string[]} keys - Equivalent source keys for one image.
 * @param {string} dataUri - Canvas-safe image data URI.
 * @returns {boolean} True when at least one cache entry was written.
 */
export function storeThreadExplorerSnapshotMediaDataUri(cache, keys = [], dataUri = "") {
  const normalizedDataUri = String(dataUri || "").trim();
  if (!(cache instanceof Map) || !Array.isArray(keys) || !normalizedDataUri) {
    return false;
  }
  let stored = false;
  keys.forEach((key) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return;
    }
    cache.set(normalizedKey, normalizedDataUri);
    stored = true;
  });
  return stored;
}

/**
 * Encodes and caches one fully loaded media image under all its source keys.
 * @param {HTMLImageElement|null} image - Rendered media image.
 * @param {object} options - Image keys, encoder, cache, and media predicate.
 * @param {Function} options.isMediaImage - Determines whether the image is eligible.
 * @param {Function} options.getImageKeys - Resolves the image's equivalent source keys.
 * @param {Function} options.encodeImage - Encodes the loaded image as a data URI.
 * @param {Map<string, string>} options.cache - Destination media cache.
 * @returns {boolean} True when an encoded image was stored.
 */
export function cacheThreadExplorerSnapshotMediaImage(image = null, options = {}) {
  if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
    return false;
  }
  if (typeof options.isMediaImage === "function" && !options.isMediaImage(image)) {
    return false;
  }
  let keys = [];
  if (typeof options.getImageKeys === "function") {
    keys = options.getImageKeys(image);
  }
  if (!Array.isArray(keys) || keys.length === 0 || typeof options.encodeImage !== "function") {
    return false;
  }
  const dataUri = options.encodeImage(image);
  return storeThreadExplorerSnapshotMediaDataUri(options.cache, keys, dataUri);
}

/**
 * Caches every currently loaded media image found in a supplied stage element.
 * @param {HTMLElement|null} stage - Visible Thread Explorer stage.
 * @param {object} options - Image selector and cache-image callback.
 * @param {Function} options.cacheImage - Attempts to cache one image.
 * @returns {number} Number of eligible media images inspected.
 */
export function cacheLoadedThreadExplorerSnapshotMediaImages(stage = null, options = {}) {
  if (!stage || typeof stage.querySelectorAll !== "function") {
    return 0;
  }
  const images = Array.from(stage.querySelectorAll(options.selector || "img"));
  let inspectedCount = 0;
  images.forEach((image) => {
    if (typeof options.isMediaImage !== "function" || !options.isMediaImage(image)) {
      return;
    }
    inspectedCount += 1;
    if (typeof options.cacheImage === "function") {
      options.cacheImage(image);
    }
  });
  return inspectedCount;
}

/**
 * Inlines cached or encoded images into a cloned Thread Explorer stage.
 * @param {HTMLElement|null} source - Original rendered stage.
 * @param {HTMLElement|null} clone - Snapshot stage clone.
 * @param {object} options - Cached image lookup, encoder, and fallback dependencies.
 * @param {Function} options.getCachedAvatarUri - Resolves cached avatar data.
 * @param {Function} options.getHydratedMediaUri - Resolves cached media data.
 * @param {Function} options.encodeImage - Encodes the original image if possible.
 * @param {string} options.fallbackAvatarUri - Avatar used for images without a usable source.
 * @returns {void} No return value.
 */
export function inlineThreadExplorerSnapshotImages(source = null, clone = null, options = {}) {
  if (!source || !clone || typeof source.querySelectorAll !== "function" || typeof clone.querySelectorAll !== "function") {
    return;
  }
  const sourceImages = Array.from(source.querySelectorAll("img"));
  const cloneImages = Array.from(clone.querySelectorAll("img"));
  cloneImages.forEach((cloneImage, index) => {
    const sourceImage = sourceImages[index] || null;
    let imageUri = "";
    if (typeof options.getCachedAvatarUri === "function") {
      imageUri = options.getCachedAvatarUri(cloneImage) || options.getCachedAvatarUri(sourceImage);
    }
    if (!imageUri && typeof options.getHydratedMediaUri === "function") {
      imageUri = options.getHydratedMediaUri(sourceImage) || options.getHydratedMediaUri(cloneImage);
    }
    if (!imageUri && typeof options.encodeImage === "function") {
      imageUri = options.encodeImage(sourceImage);
    }
    if (imageUri) {
      cloneImage.setAttribute("src", imageUri);
      return;
    }
    cloneImage.setAttribute("src", options.fallbackAvatarUri || "");
    if (cloneImage.classList) {
      cloneImage.classList.add("is-snapshot-fallback-image");
    }
  });
}

/**
 * Applies hydrated image data to rendered media and reports export progress.
 * @param {Array<HTMLImageElement>} images - Images inspected from the rendered stage.
 * @param {object} options - Media, cache, abort, and progress callbacks.
 * @param {Function} options.isMediaImage - Determines which images are post media.
 * @param {Function} options.getHydratedMediaUri - Resolves hydrated data for an image.
 * @param {Function} options.getImageKeys - Resolves all equivalent image source keys.
 * @param {Function} options.storeDataUri - Stores a hydrated URI under the image keys.
 * @param {Function} options.throwIfAborted - Throws if the current export was cancelled.
 * @param {Function} options.buildProgress - Builds localized progress for one processed image.
 * @param {Function} options.onProgress - Receives each progress update.
 * @returns {Promise<{total:number, embedded:number, missing:number}>} Image hydration counts.
 */
export async function applyThreadExplorerSnapshotMediaDataUris(images = [], options = {}) {
  let mediaImages = [];
  if (Array.isArray(images) && typeof options.isMediaImage === "function") {
    mediaImages = images.filter((image) => options.isMediaImage(image));
  }
  const total = mediaImages.length;
  let appliedCount = 0;
  let skippedCount = 0;
  for (let index = 0; index < mediaImages.length; index += 1) {
    if (typeof options.throwIfAborted === "function") {
      options.throwIfAborted(options.signal || null);
    }
    const image = mediaImages[index];
    let dataUri = "";
    if (typeof options.getHydratedMediaUri === "function") {
      dataUri = options.getHydratedMediaUri(image);
    }
    if (!dataUri) {
      skippedCount += 1;
    } else {
      image.dataset.snapshotHydrated = "true";
      image.src = dataUri;
      let keys = [];
      if (typeof options.getImageKeys === "function") {
        keys = options.getImageKeys(image);
      }
      if (typeof options.storeDataUri === "function") {
        options.storeDataUri(keys, dataUri);
      }
      appliedCount += 1;
    }
    if (typeof options.buildProgress === "function" && typeof options.onProgress === "function") {
      await options.onProgress(options.buildProgress({
        index,
        total,
        embedded: appliedCount,
        skipped: skippedCount,
      }));
    }
  }
  return {
    total,
    embedded: appliedCount,
    missing: skippedCount,
  };
}

/**
 * Writes an unsigned 32-bit integer in PNG big-endian byte order.
 * @param {Uint8Array} target - Target byte array.
 * @param {number} offset - Byte offset for the integer.
 * @param {number} value - Integer value to write.
 * @returns {void} No return value.
 */
export function writeThreadExplorerPngUint32(target, offset, value) {
  target[offset] = (value >>> 24) & 255;
  target[offset + 1] = (value >>> 16) & 255;
  target[offset + 2] = (value >>> 8) & 255;
  target[offset + 3] = value & 255;
}

/**
 * Builds the lookup table used to calculate PNG chunk CRC values.
 * @returns {Uint32Array} CRC lookup table.
 */
export function createThreadExplorerPngCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((value & 1) !== 0) {
        value = 0xedb88320 ^ (value >>> 1);
      } else {
        value >>>= 1;
      }
    }
    table[index] = value >>> 0;
  }
  return table;
}

/**
 * Calculates a PNG CRC over a chunk type and its payload.
 * @param {string} type - Four-character PNG chunk type.
 * @param {Uint8Array} data - Chunk payload bytes.
 * @param {Uint32Array} table - CRC lookup table.
 * @returns {number} Unsigned CRC value.
 */
export function calculateThreadExplorerPngCrc(type, data, table) {
  let crc = 0xffffffff;
  for (let index = 0; index < type.length; index += 1) {
    crc = table[(crc ^ type.charCodeAt(index)) & 255] ^ (crc >>> 8);
  }
  for (let index = 0; index < data.length; index += 1) {
    crc = table[(crc ^ data[index]) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encodes a complete PNG chunk containing its length, type, data, and CRC.
 * @param {string} type - Four-character PNG chunk type.
 * @param {Uint8Array} data - Chunk payload bytes.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded PNG chunk.
 */
export function createThreadExplorerPngChunk(type, data, crcTable) {
  const chunk = new Uint8Array(data.length + 12);
  writeThreadExplorerPngUint32(chunk, 0, data.length);
  for (let index = 0; index < type.length; index += 1) {
    chunk[4 + index] = type.charCodeAt(index);
  }
  chunk.set(data, 8);
  writeThreadExplorerPngUint32(chunk, data.length + 8, calculateThreadExplorerPngCrc(type, data, crcTable));
  return chunk;
}

/**
 * Creates a standard 8-bit RGBA PNG IHDR payload.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @returns {Uint8Array} Thirteen-byte IHDR payload.
 */
export function createThreadExplorerPngHeaderData(width, height) {
  const data = new Uint8Array(13);
  writeThreadExplorerPngUint32(data, 0, width);
  writeThreadExplorerPngUint32(data, 4, height);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

/**
 * Creates a PNG tEXt chunk using printable ASCII metadata values.
 * @param {string} keyword - PNG text keyword.
 * @param {string} value - Text value.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded tEXt chunk.
 */
export function createThreadExplorerPngTextChunk(keyword, value, crcTable) {
  const encoder = new TextEncoder();
  const safeKeyword = String(keyword || "").replace(/[^\x20-\x7e]+/g, "").slice(0, 79);
  const safeValue = String(value || "").replace(/[^\x20-\x7e]+/g, "");
  const keywordBytes = encoder.encode(safeKeyword);
  const valueBytes = encoder.encode(safeValue);
  const data = new Uint8Array(keywordBytes.length + 1 + valueBytes.length);
  data.set(keywordBytes, 0);
  data[keywordBytes.length] = 0;
  data.set(valueBytes, keywordBytes.length + 1);
  return createThreadExplorerPngChunk("tEXt", data, crcTable);
}

/**
 * Escapes text for use in XMP XML metadata.
 * @param {string} value - Raw text value.
 * @returns {string} XML-escaped text.
 */
export function escapeThreadExplorerPngXmpText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds XMP metadata for a Threadline PNG export.
 * @param {string} applicationLabel - Threadline application and version label.
 * @param {Date} metadataDate - Timestamp used for XMP date fields.
 * @returns {string} Complete XMP packet.
 */
export function createThreadExplorerPngXmpPacket(applicationLabel, metadataDate = new Date()) {
  const safeLabel = escapeThreadExplorerPngXmpText(applicationLabel);
  const safeDate = escapeThreadExplorerPngXmpText(metadataDate.toISOString());
  return [
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">',
    '<dc:creator><rdf:Seq><rdf:li>Threadline</rdf:li></rdf:Seq></dc:creator>',
    `<xmp:CreatorTool>${safeLabel}</xmp:CreatorTool>`,
    `<xmp:MetadataDate>${safeDate}</xmp:MetadataDate>`,
    `<xmp:ModifyDate>${safeDate}</xmp:ModifyDate>`,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join("");
}

/**
 * Encodes an XMP payload as a PNG uncompressed iTXt chunk.
 * @param {string} value - XMP XML payload.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @returns {Uint8Array} Encoded iTXt chunk.
 */
export function createThreadExplorerPngXmpChunk(value, crcTable) {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode("XML:com.adobe.xmp");
  const textBytes = encoder.encode(value);
  const data = new Uint8Array(keywordBytes.length + 5 + textBytes.length);
  data.set(keywordBytes, 0);
  data[keywordBytes.length] = 0;
  data[keywordBytes.length + 1] = 0;
  data[keywordBytes.length + 2] = 0;
  data[keywordBytes.length + 3] = 0;
  data[keywordBytes.length + 4] = 0;
  data.set(textBytes, keywordBytes.length + 5);
  return createThreadExplorerPngChunk("iTXt", data, crcTable);
}

/**
 * Creates software, author, creator, and XMP chunks for Threadline PNGs.
 * @param {Uint32Array} crcTable - CRC lookup table.
 * @param {string} applicationLabel - Application/version label.
 * @param {Date} metadataDate - Metadata timestamp.
 * @returns {Uint8Array[]} Encoded PNG metadata chunks.
 */
export function createThreadExplorerPngMetadataChunks(crcTable, applicationLabel, metadataDate = new Date()) {
  return [
    createThreadExplorerPngTextChunk("Software", applicationLabel, crcTable),
    createThreadExplorerPngTextChunk("Author", applicationLabel, crcTable),
    createThreadExplorerPngTextChunk("Creator", applicationLabel, crcTable),
    createThreadExplorerPngXmpChunk(createThreadExplorerPngXmpPacket(applicationLabel, metadataDate), crcTable),
  ];
}

/**
 * Adds Threadline metadata chunks after IHDR in an encoded PNG blob.
 * @param {Blob} blob - PNG blob from browser canvas encoding.
 * @param {object} options - Metadata label and date dependencies.
 * @param {string} options.applicationLabel - Threadline application/version label.
 * @param {Date} options.metadataDate - Timestamp used in the XMP fields.
 * @returns {Promise<Blob>} PNG with metadata when the input is a valid PNG.
 */
export async function addThreadExplorerPngMetadata(blob, options = {}) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) {
      return blob;
    }
  }
  const insertionOffset = 8 + 4 + 4 + 13 + 4;
  if (bytes.length <= insertionOffset) {
    return blob;
  }
  let applicationLabel = "Threadline";
  if (options.applicationLabel) {
    applicationLabel = options.applicationLabel;
  }
  let metadataDate = new Date();
  if (options.metadataDate instanceof Date) {
    metadataDate = options.metadataDate;
  }
  const crcTable = createThreadExplorerPngCrcTable();
  const parts = [
    bytes.slice(0, insertionOffset),
    ...createThreadExplorerPngMetadataChunks(crcTable, applicationLabel, metadataDate),
    bytes.slice(insertionOffset),
  ];
  return new Blob(parts, { type: "image/png" });
}

/**
 * Draws a rounded rectangle path on a canvas context.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Corner radius.
 * @returns {void} No return value.
 */
export function drawThreadExplorerSnapshotRoundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

/**
 * Strokes a rounded rectangle outline while preserving canvas context state.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Corner radius.
 * @param {string} color - Stroke color.
 * @param {number} lineWidth - Stroke width.
 * @returns {void} No return value.
 */
export function strokeThreadExplorerSnapshotRoundRect(context, x, y, width, height, radius, color, lineWidth = 1) {
  context.save();
  drawThreadExplorerSnapshotRoundRect(context, x, y, width, height, radius);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

/**
 * Wraps plain text to a maximum width and line count for canvas output.
 * @param {CanvasRenderingContext2D} context - Measuring canvas context.
 * @param {string} text - Text to wrap.
 * @param {number} maxWidth - Maximum line width.
 * @param {number} maxLines - Maximum number of returned lines.
 * @returns {string[]} Wrapped lines, with an ellipsis when truncated.
 */
export function wrapThreadExplorerSnapshotText(context, text, maxWidth, maxLines = 8) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  const words = normalized.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  });
  if (current) {
    lines.push(current);
  }
  if (lines.length <= maxLines) {
    return lines;
  }
  const clipped = lines.slice(0, maxLines);
  clipped[clipped.length - 1] = `${clipped[clipped.length - 1].replace(/\.+$/, "")}...`;
  return clipped;
}

/**
 * Draws a sequence of canvas text lines and returns the next baseline.
 * @param {CanvasRenderingContext2D} context - Target canvas context.
 * @param {string[]} lines - Lines to draw.
 * @param {number} x - Left coordinate.
 * @param {number} y - First baseline coordinate.
 * @param {number} lineHeight - Distance between baselines.
 * @returns {number} Next baseline coordinate after the block.
 */
export function drawThreadExplorerSnapshotTextBlock(context, lines, x, y, lineHeight) {
  let cursorY = y;
  lines.forEach((line) => {
    context.fillText(line, x, cursorY);
    cursorY += lineHeight;
  });
  return cursorY;
}

/**
 * Extracts visible engagement counts into a compact snapshot text line.
 * @param {HTMLElement|null} card - Rendered post card.
 * @returns {string} Count labels joined with explicit spaces.
 */
export function getThreadExplorerSnapshotCountsText(card = null) {
  if (!card || typeof card.querySelector !== "function") {
    return "";
  }
  const container = card.querySelector(".thread-explorer-post-counts");
  if (!container) {
    return "";
  }
  const parts = [];
  Array.from(container.children).forEach((child) => {
    const text = String(child.textContent || "").replace(/\s+/g, " ").trim();
    if (text) {
      parts.push(text);
    }
  });
  return parts.join("   ");
}

/**
 * Draws SVG edge paths into the snapshot canvas.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {SVGElement[]} edges - Visible Thread Explorer edge paths.
 * @param {(edge: SVGElement) => CSSStyleDeclaration} getStyle - Computed-style provider.
 * @param {typeof Path2D} PathConstructor - Path2D implementation.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotEdges(context, edges = [], getStyle = () => ({}), PathConstructor = Path2D) {
  edges.forEach((edge) => {
    const data = String(edge.getAttribute("d") || "").trim();
    if (!data) {
      return;
    }
    try {
      const style = getStyle(edge);
      context.save();
      context.strokeStyle = style.stroke || "#b8cce8";
      context.lineWidth = Number.parseFloat(style.strokeWidth) || 2;
      context.lineCap = "round";
      context.stroke(new PathConstructor(data));
      context.restore();
    } catch {
      // Malformed SVG paths are skipped in the fallback renderer.
    }
  });
}

/**
 * Renders one viewport-independent canvas tile of the Thread Explorer stage.
 * @param {object} options - Tile coordinates, canvas factory, background, and drawing adapters.
 * @returns {HTMLCanvasElement} Rendered tile canvas.
 */
export function renderThreadExplorerSnapshotTile(options = {}) {
  const { x, y, width, height, stageRect, cards = [], avatarImages = new Map(), mediaImages = new Map(), createCanvas, backgroundColor, drawEdges, drawCard } = options;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(-x, -y);
  drawEdges(context);
  cards.forEach((card) => drawCard(context, card, stageRect, avatarImages, mediaImages));
  context.restore();
  return canvas;
}

/**
 * Creates a scaled canvas for a complete Thread Explorer snapshot.
 * @param {number} width - CSS pixel width.
 * @param {number} height - CSS pixel height.
 * @param {object} options - Scale limits, browser canvas factory, and background color.
 * @returns {object} Canvas, context, scale, width, and height.
 */
export function createThreadExplorerSnapshotCanvas(width, height, options = {}) {
  const createCanvas = options.createCanvas || (() => document.createElement("canvas"));
  const canvas = createCanvas();
  const scale = getThreadExplorerSnapshotScale(width, height, {
    devicePixelRatio: options.devicePixelRatio,
    maxDimension: options.maxDimension,
    maxPixels: options.maxPixels,
  });
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = options.backgroundColor || "#ffffff";
  context.fillRect(0, 0, width, height);
  return { canvas, context, scale, width, height };
}

/**
 * Encodes a snapshot canvas and adds PNG metadata when requested.
 * @param {HTMLCanvasElement} canvas - Canvas to encode.
 * @param {string} mimeType - Target image MIME type.
 * @param {object} options - Translation and metadata adapters.
 * @returns {Promise<Blob>} Encoded image blob.
 */
export async function encodeThreadExplorerSnapshotCanvas(canvas, mimeType, options = {}) {
  let quality;
  if (mimeType === "image/jpeg") {
    quality = 0.92;
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) {
    throw new Error(options.failureMessage || "Snapshot encoding failed.");
  }
  if (mimeType === "image/png" && typeof options.addMetadata === "function") {
    return options.addMetadata(blob);
  }
  return blob;
}

/**
 * Resolves the first usable background color from stage, tree, or body elements.
 * @param {object} elements - Stage, tree, and body DOM elements.
 * @param {(element: Element) => CSSStyleDeclaration} getStyle - Computed-style provider.
 * @returns {string} Usable CSS background color.
 */
export function getThreadExplorerSnapshotBackgroundColor(elements = {}, getStyle = () => ({})) {
  const candidates = [elements.stage, elements.tree, elements.body];
  for (const element of candidates) {
    if (!element) {
      continue;
    }
    const color = getStyle(element).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)") {
      return color;
    }
  }
  return "#f2f7ff";
}

/**
 * Draws a neutral fallback avatar glyph.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} size - Avatar diameter.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotFallbackAvatar(context, x, y, size) {
  const center = size / 2;
  context.fillStyle = "#0070ff";
  context.beginPath();
  context.arc(x + center, y + center, center, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(x + center, y + (size * 0.4), size * 0.18, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(x + center, y + (size * 0.78), size * 0.28, Math.PI, 0, true);
  context.fill();
}

/**
 * Determines whether an image URL is local or embedded and safe for canvas drawing.
 * @param {HTMLImageElement|null} image - Candidate image.
 * @param {string} baseUrl - Base URL used to resolve relative sources.
 * @param {string} origin - Current application origin.
 * @returns {boolean} True when drawing will not taint the canvas.
 */
export function canDrawThreadExplorerSnapshotImage(image, baseUrl, origin) {
  const source = String(image?.currentSrc || image?.src || "").trim();
  if (!source) {
    return false;
  }
  if (source.startsWith("data:") || source.startsWith("blob:")) {
    return true;
  }
  try {
    return new URL(source, baseUrl).origin === origin;
  } catch {
    return false;
  }
}

/**
 * Draws an avatar image clipped to a circle when complete and safe to use.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {HTMLImageElement|null} image - Candidate avatar image.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} size - Avatar diameter.
 * @param {(image: HTMLImageElement|null) => boolean} canDraw - Canvas safety check.
 * @returns {boolean} True when the image was drawn.
 */
export function drawThreadExplorerSnapshotAvatarImage(context, image, x, y, size, canDraw) {
  if (!canDraw(image) || !image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
    return false;
  }
  try {
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.save();
    context.beginPath();
    context.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, x + ((size - drawWidth) / 2), y + ((size - drawHeight) / 2), drawWidth, drawHeight);
    context.restore();
    return true;
  } catch {
    return false;
  }
}

/**
 * Draws a loaded media image with cover cropping and rounded clipping.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {HTMLImageElement|null} image - Candidate media image.
 * @param {number} x - Left coordinate.
 * @param {number} y - Top coordinate.
 * @param {number} width - Target width.
 * @param {number} height - Target height.
 * @param {number} radius - Clip corner radius.
 * @param {(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => void} drawRoundedPath - Rounded path helper.
 * @returns {boolean} True when the image was drawn.
 */
export function drawThreadExplorerSnapshotCoverImage(context, image, x, y, width, height, radius, drawRoundedPath) {
  if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
    return false;
  }
  try {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.save();
    drawRoundedPath(context, x, y, width, height, radius);
    context.clip();
    context.drawImage(image, x + ((width - drawWidth) / 2), y + ((height - drawHeight) / 2), drawWidth, drawHeight);
    context.restore();
    return true;
  } catch {
    return false;
  }
}

/**
 * Paints a media placeholder when an image is unavailable or unsafe for canvas.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {DOMRect} rect - Placeholder bounds.
 * @param {(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => void} drawRoundedPath - Rounded rectangle path helper.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotMediaPlaceholder(context, rect, drawRoundedPath) {
  context.save();
  drawRoundedPath(context, rect.left, rect.top, rect.width, rect.height, 6);
  context.fillStyle = "#dfe8f7";
  context.fill();
  context.strokeStyle = "#c9d8ee";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

/**
 * Draws an ALT-text label beneath a media image, constrained by card geometry.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {string} altText - Plain image ALT text.
 * @param {DOMRect} rect - Media rectangle.
 * @param {number} maxBottom - Maximum allowed lower edge for the label.
 * @param {(key: string) => string} translate - Translation lookup for the ALT prefix.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotImageAltText(context, altText, rect, maxBottom, translate) {
  const normalizedAlt = String(altText || "").replace(/\s+/g, " ").trim();
  if (!normalizedAlt) {
    return;
  }
  const paddingX = 8;
  const paddingY = 6;
  const lineHeight = 13;
  const labelTop = rect.bottom + 4;
  let maxLines = 3;
  if (maxBottom > labelTop) {
    const availableHeight = Math.max(0, maxBottom - labelTop);
    maxLines = Math.min(12, Math.max(1, Math.floor((availableHeight - (paddingY * 2)) / lineHeight)));
  } else if (rect.height < 96) {
    maxLines = 2;
    if (rect.height < 52) {
      maxLines = 1;
    }
  }
  const label = `${translate("archivePdfAltPrefix")} ${normalizedAlt}`;
  context.save();
  context.font = "11px Segoe UI, Arial, sans-serif";
  const lines = wrapThreadExplorerSnapshotText(context, label, Math.max(40, rect.width - (paddingX * 2)), maxLines);
  if (lines.length === 0) {
    context.restore();
    return;
  }
  const labelHeight = (paddingY * 2) + (lines.length * lineHeight);
  drawThreadExplorerSnapshotRoundRect(context, rect.left, labelTop, rect.width, labelHeight, 6);
  context.fillStyle = "#eef5ff";
  context.fill();
  context.strokeStyle = "#c9d8ee";
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = "#345070";
  drawThreadExplorerSnapshotTextBlock(context, lines, rect.left + paddingX, labelTop + paddingY + 9, lineHeight);
  context.restore();
}

/**
 * Draws rendered media images and ALT labels for a card through injected DOM adapters.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {HTMLElement} card - Post card whose media should be drawn.
 * @param {DOMRect} stageRect - Stage rectangle for coordinate normalization.
 * @param {Map<string, HTMLImageElement>} mediaImages - Preloaded safe media images.
 * @param {number} altTextMaxBottom - Lower boundary for ALT labels.
 * @param {object} adapters - Media selection, geometry, translation, and drawing adapters.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotMediaImages(context, card, stageRect, mediaImages, altTextMaxBottom, adapters = {}) {
  Array.from(card.querySelectorAll("img")).forEach((image) => {
    if (!adapters.isMediaImage(image)) {
      return;
    }
    const rect = adapters.getStageRect(image, stageRect);
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const drawable = adapters.getDrawableImage(image, mediaImages);
    const wasDrawn = adapters.drawCoverImage(context, drawable, rect.left, rect.top, rect.width, rect.height, 6);
    if (!wasDrawn) {
      adapters.drawPlaceholder(context, rect);
    }
    adapters.strokeRoundedRect(context, rect.left, rect.top, rect.width, rect.height, 6, "#d6e2f2", 1);
    adapters.drawAltText(context, image.alt || "", rect, altTextMaxBottom);
  });
}

/**
 * Draws one Thread Explorer post card to the fallback canvas using explicit DOM adapters.
 * @param {CanvasRenderingContext2D} context - Canvas target.
 * @param {HTMLElement} card - Rendered post card.
 * @param {DOMRect} stageRect - Stage rectangle used to normalize card coordinates.
 * @param {object} adapters - DOM, media, localization, and geometry adapters.
 * @returns {void}
 */
export function drawThreadExplorerSnapshotCard(context, card, stageRect, adapters = {}) {
  const getRect = adapters.getStageRect;
  const getStyle = adapters.getComputedStyle;
  const getAvatarKey = adapters.getAvatarKey;
  const avatarImages = adapters.avatarImages || new Map();
  const mediaImages = adapters.mediaImages || new Map();
  const cardRect = getRect(card, stageRect);
  const computed = getStyle(card);
  context.save();
  drawThreadExplorerSnapshotRoundRect(context, cardRect.left, cardRect.top, cardRect.width, cardRect.height, 8);
  context.fillStyle = computed.backgroundColor || "#ffffff";
  context.fill();
  context.strokeStyle = computed.borderColor || "#d8e3f2";
  context.lineWidth = 1.5;
  context.stroke();

  const avatarX = cardRect.left + 16;
  const avatarY = cardRect.top + 16;
  const avatar = card.querySelector(".thread-explorer-avatar");
  const avatarKey = getAvatarKey(avatar);
  let avatarImage = avatar;
  if (avatarKey && avatarImages.has(avatarKey)) {
    avatarImage = avatarImages.get(avatarKey);
  }
  const avatarWasDrawn = adapters.drawAvatar(context, avatarImage, avatarX, avatarY, 40);
  if (!avatarWasDrawn) {
    adapters.drawFallbackAvatar(context, avatarX, avatarY, 40);
  }

  const textX = cardRect.left + 66;
  const textWidth = Math.max(80, cardRect.width - 86);
  let y = cardRect.top + 28;
  const author = card.querySelector(".thread-explorer-post-author")?.textContent || "";
  const handle = card.querySelector(".thread-explorer-post-handle")?.textContent || "";
  const meta = card.querySelector(".thread-explorer-post-meta")?.textContent || "";
  const body = card.querySelector(".thread-explorer-post-text")?.textContent || "";
  const counts = getThreadExplorerSnapshotCountsText(card);
  const editMarker = card.querySelector(".thread-explorer-edit-button:not([hidden])")?.textContent || "";
  const countsElement = card.querySelector(".thread-explorer-post-counts");
  let altTextMaxBottom = cardRect.bottom - 20;
  if (countsElement) {
    const countsRect = getRect(countsElement, stageRect);
    if (countsRect.top > cardRect.top) {
      altTextMaxBottom = countsRect.top - 8;
    }
  }

  context.fillStyle = "#14233d";
  context.font = "700 16px Segoe UI, Arial, sans-serif";
  drawThreadExplorerSnapshotTextBlock(context, wrapThreadExplorerSnapshotText(context, author, textWidth, 1), textX, y, 18);
  y += 18;
  context.fillStyle = "#5d7394";
  context.font = "13px Segoe UI, Arial, sans-serif";
  drawThreadExplorerSnapshotTextBlock(context, wrapThreadExplorerSnapshotText(context, handle, textWidth, 1), textX, y, 16);
  y += 26;
  if (meta) {
    drawThreadExplorerSnapshotTextBlock(context, wrapThreadExplorerSnapshotText(context, meta, textWidth, 1), cardRect.left + 16, y, 16);
    y += 24;
  }
  if (editMarker) {
    context.fillStyle = "#92560d";
    context.font = "700 12px Segoe UI, Arial, sans-serif";
    y = drawThreadExplorerSnapshotTextBlock(context, wrapThreadExplorerSnapshotText(context, editMarker, cardRect.width - 32, 1), cardRect.left + 16, y, 15);
    y += 8;
  }

  context.fillStyle = "#1e3150";
  context.font = "14px Segoe UI, Arial, sans-serif";
  drawThreadExplorerSnapshotTextBlock(context, wrapThreadExplorerSnapshotText(context, body, cardRect.width - 32, 10), cardRect.left + 16, y, 19);
  adapters.drawMedia(context, card, stageRect, mediaImages, altTextMaxBottom);
  if (counts) {
    context.fillStyle = "#5d7394";
    context.font = "12px Segoe UI, Arial, sans-serif";
    const countLines = wrapThreadExplorerSnapshotText(context, counts, cardRect.width - 32, 2);
    const countY = cardRect.bottom - 16 - ((countLines.length - 1) * 15);
    drawThreadExplorerSnapshotTextBlock(context, countLines, cardRect.left + 16, countY, 15);
  }
  context.restore();
}

/**
 * Coordinates snapshot preparation, stage measurement, and renderer fallback selection.
 * @param {object} options - Explicit snapshot data, browser adapters, and renderer callbacks.
 * @returns {Promise<Blob>} Rendered snapshot blob.
 */
export async function renderThreadExplorerSnapshot(options = {}) {
  const {
    root,
    mimeType = "image/png",
    onProgress = async () => {},
    signal = null,
    text,
    hydrateAvatars,
    hydrateMedia,
    restoreAvatarCache,
    renderTree,
    cacheRenderedMedia,
    applyMediaDataUris,
    waitForFrame,
    getStage,
    shouldUseTiled,
    renderTiled,
    renderForeignObject,
    renderCanvas,
    onFallback = () => {},
  } = options;
  if (!root) {
    throw new Error(text("threadExplorerSnapshotNoThread"));
  }
  throwIfThreadExplorerSnapshotAborted(signal);

  await onProgress({ percent: 4, step: text("threadExplorerSnapshotProgressPreparing"), detail: text("threadExplorerSnapshotProgressPreparingDetail") });
  await hydrateAvatars(root, onProgress, signal);
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 18, step: text("threadExplorerSnapshotProgressMedia"), detail: text("threadExplorerSnapshotProgressMediaDetail") });
  await hydrateMedia(root, onProgress, signal);
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 28, step: text("threadExplorerSnapshotProgressAvatars"), detail: text("threadExplorerSnapshotProgressCacheDetail") });
  await restoreAvatarCache();
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 36, step: text("threadExplorerSnapshotProgressRenderTree"), detail: text("threadExplorerSnapshotProgressRenderTreeDetail") });
  await renderTree();
  const inspectedMediaCount = await cacheRenderedMedia();
  await onProgress({ percent: 37, step: text("threadExplorerSnapshotProgressMedia"), detail: text("threadExplorerSnapshotProgressRenderedCacheDetail", { count: inspectedMediaCount }) });
  const hydratedMediaCounts = await applyMediaDataUris(onProgress, signal);
  await onProgress({
    percent: 40,
    step: text("threadExplorerSnapshotProgressMedia"),
    detail: text("threadExplorerSnapshotProgressHydratedMediaDetail", {
      count: hydratedMediaCounts.embedded,
      missing: hydratedMediaCounts.missing,
      total: hydratedMediaCounts.total,
    }),
  });
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 44, step: text("threadExplorerSnapshotProgressBrowserFrame"), detail: text("threadExplorerSnapshotProgressBrowserFrameDetail") });
  await waitForFrame();

  await onProgress({ percent: 50, step: text("threadExplorerSnapshotProgressMeasure"), detail: text("threadExplorerSnapshotProgressMeasureDetail") });
  const stage = getStage();
  const stageRect = stage.getBoundingClientRect();
  const width = Math.ceil(Math.max(stage.scrollWidth, stage.offsetWidth, stageRect.width));
  const height = Math.ceil(Math.max(stage.scrollHeight, stage.offsetHeight, stageRect.height));
  if (!width || !height) {
    throw new Error(text("threadExplorerSnapshotFailed"));
  }

  if (mimeType === "image/png" && shouldUseTiled(width, height)) {
    try {
      return await renderTiled(width, height, onProgress, signal);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }
      onFallback("tiled", error);
      await onProgress({ percent: 58, step: text("threadExplorerSnapshotProgressFallback"), detail: text("threadExplorerSnapshotProgressFallbackDetail") });
    }
  }

  try {
    return await renderForeignObject(mimeType, width, height, onProgress, signal);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    onFallback("foreignObject", error);
    await onProgress({ percent: 58, step: text("threadExplorerSnapshotProgressFallback"), detail: text("threadExplorerSnapshotProgressFallbackDetail") });
    return renderCanvas(mimeType, width, height, onProgress, signal);
  }
}

/**
 * Encodes a large PNG in bounded canvas tiles to avoid browser canvas limits.
 * @param {object} options - Dimensions, stage adapters, progress, renderers, and PNG metadata.
 * @returns {Promise<Blob>} Assembled PNG blob.
 */
export async function renderThreadExplorerTiledPngSnapshot(options = {}) {
  const {
    width,
    height,
    tileSize = 2048,
    onProgress = async () => {},
    signal = null,
    text,
    stage,
    preloadAvatars,
    preloadMedia,
    renderTile,
    crcTableFactory = createThreadExplorerPngCrcTable,
    chunkFactory = createThreadExplorerPngChunk,
    headerFactory = createThreadExplorerPngHeaderData,
    metadataFactory = createThreadExplorerPngMetadataChunks,
    requestFrame = (callback) => requestAnimationFrame(callback),
  } = options;
  throwIfThreadExplorerSnapshotAborted(signal);
  const crcTable = crcTableFactory();
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
  parts.push(chunkFactory("IHDR", headerFactory(width, height), crcTable));
  parts.push(...metadataFactory(crcTable));
  if (typeof CompressionStream !== "function") {
    throw new Error("CompressionStream is not available.");
  }
  const compressionStream = new CompressionStream("deflate");
  const compressionWriter = compressionStream.writable.getWriter();
  const compressedBytesPromise = new Response(compressionStream.readable).arrayBuffer();
  const stageRect = stage.getBoundingClientRect();
  const cards = Array.from(stage.querySelectorAll(".thread-explorer-post-card"));
  await onProgress({ percent: 54, step: text("threadExplorerSnapshotProgressAvatars"), detail: text("threadExplorerSnapshotProgressPostCount", { count: cards.length }) });
  const avatarImages = await preloadAvatars(cards);
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 58, step: text("threadExplorerSnapshotProgressMedia"), detail: text("threadExplorerSnapshotProgressPostCount", { count: cards.length }) });
  const mediaImages = await preloadMedia(cards);
  throwIfThreadExplorerSnapshotAborted(signal);
  const tileRows = Math.max(1, Math.ceil(height / tileSize));
  let tileRow = 0;
  for (let tileY = 0; tileY < height; tileY += tileSize) {
    throwIfThreadExplorerSnapshotAborted(signal);
    tileRow += 1;
    await onProgress({ percent: 60 + ((tileRow - 1) / tileRows * 32), step: text("threadExplorerSnapshotProgressRenderTiles"), detail: text("threadExplorerSnapshotProgressRenderTileDetail", { row: tileRow, rows: tileRows }) });
    const tileHeight = Math.min(tileSize, height - tileY);
    const rowTiles = [];
    for (let tileX = 0; tileX < width; tileX += tileSize) {
      const tileWidth = Math.min(tileSize, width - tileX);
      const tileCanvas = renderTile(tileX, tileY, tileWidth, tileHeight, stageRect, cards, avatarImages, mediaImages);
      rowTiles.push({ x: tileX, width: tileWidth, data: tileCanvas.getContext("2d").getImageData(0, 0, tileWidth, tileHeight).data });
      await new Promise((resolve) => requestFrame(resolve));
    }
    for (let row = 0; row < tileHeight; row += 1) {
      const scanline = new Uint8Array((width * 4) + 1);
      scanline[0] = 0;
      rowTiles.forEach((tile) => {
        const sourceOffset = row * tile.width * 4;
        const targetOffset = 1 + (tile.x * 4);
        scanline.set(tile.data.subarray(sourceOffset, sourceOffset + (tile.width * 4)), targetOffset);
      });
      await compressionWriter.write(scanline);
    }
  }
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 94, step: text("threadExplorerSnapshotProgressEncode"), detail: text("threadExplorerSnapshotProgressRenderTileDetail", { row: tileRows, rows: tileRows }) });
  await compressionWriter.close();
  parts.push(chunkFactory("IDAT", new Uint8Array(await compressedBytesPromise), crcTable));
  parts.push(chunkFactory("IEND", new Uint8Array(0), crcTable));
  return new Blob(parts, { type: "image/png" });
}

/**
 * Renders a snapshot through SVG foreignObject and browser image decoding.
 * @param {object} options - Stage, dimensions, progress, CSS, image, and canvas adapters.
 * @returns {Promise<Blob>} Encoded snapshot image.
 */
export async function renderThreadExplorerForeignObjectSnapshot(options = {}) {
  const { stage, width, height, mimeType, onProgress = async () => {}, signal = null, text, getComputedStyle, inlineImages, collectCss, createCanvas, encodeCanvas, createObjectUrl = (blob) => URL.createObjectURL(blob), revokeObjectUrl = (url) => URL.revokeObjectURL(url), createImage = () => new Image() } = options;
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 62, step: text("threadExplorerSnapshotProgressRenderSvg"), detail: text("threadExplorerSnapshotProgressClone") });
  const clone = stage.cloneNode(true);
  clone.style.setProperty("--thread-explorer-zoom", "1");
  clone.style.setProperty("--thread-explorer-pan-x", "0px");
  clone.style.setProperty("--thread-explorer-pan-y", "0px");
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.padding = getComputedStyle(stage).padding;
  inlineImages(stage, clone);
  const html = `<div xmlns="http://www.w3.org/1999/xhtml"><style>${collectCss()}</style>${clone.outerHTML}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const svgUrl = createObjectUrl(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = createImage();
    await onProgress({ percent: 76, step: text("threadExplorerSnapshotProgressRenderSvg"), detail: text("threadExplorerSnapshotProgressBrowserImage") });
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
        signal?.removeEventListener("abort", handleAbort);
      };
      const handleLoad = () => { cleanup(); resolve(); };
      const handleError = () => {
        cleanup();
        const error = new Error("foreignObject snapshot failed");
        error.name = "ThreadExplorerSnapshotFallbackError";
        reject(error);
      };
      const handleAbort = () => { cleanup(); reject(createThreadExplorerSnapshotAbortError()); };
      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleError, { once: true });
      signal?.addEventListener("abort", handleAbort, { once: true });
      image.src = svgUrl;
    });
    throwIfThreadExplorerSnapshotAborted(signal);
    await onProgress({ percent: 88, step: text("threadExplorerSnapshotProgressRenderSvg"), detail: text("threadExplorerSnapshotProgressEncode") });
    const canvas = createCanvas(width, height);
    canvas.context.drawImage(image, 0, 0);
    return encodeCanvas(canvas.canvas, mimeType);
  } finally {
    revokeObjectUrl(svgUrl);
  }
}

/**
 * Draws all cards on a scaled canvas as the final renderer fallback.
 * @param {object} options - Dimensions, stage, progress, hydration, drawing, and encoding adapters.
 * @returns {Promise<Blob>} Encoded fallback image.
 */
export async function renderThreadExplorerCanvasSnapshot(options = {}) {
  const { stage, width, height, mimeType, onProgress = async () => {}, signal = null, text, createCanvas, drawEdges, preloadAvatars, preloadMedia, drawCard, encodeCanvas } = options;
  throwIfThreadExplorerSnapshotAborted(signal);
  const snapshot = createCanvas(width, height);
  const stageRect = stage.getBoundingClientRect();
  await onProgress({ percent: 64, step: text("threadExplorerSnapshotProgressRenderCanvas"), detail: text("threadExplorerSnapshotProgressEdges") });
  drawEdges(snapshot.context);
  const cards = Array.from(stage.querySelectorAll(".thread-explorer-post-card"));
  await onProgress({ percent: 68, step: text("threadExplorerSnapshotProgressAvatars"), detail: text("threadExplorerSnapshotProgressPostCount", { count: cards.length }) });
  const avatarImages = await preloadAvatars(cards);
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 72, step: text("threadExplorerSnapshotProgressMedia"), detail: text("threadExplorerSnapshotProgressPostCount", { count: cards.length }) });
  const mediaImages = await preloadMedia(cards);
  throwIfThreadExplorerSnapshotAborted(signal);
  const totalCards = Math.max(1, cards.length);
  for (let index = 0; index < cards.length; index += 1) {
    throwIfThreadExplorerSnapshotAborted(signal);
    drawCard(snapshot.context, cards[index], stageRect, avatarImages, mediaImages);
    if ((index % 10) === 0) {
      await onProgress({ percent: 74 + (index / totalCards * 18), step: text("threadExplorerSnapshotProgressRenderCanvas"), detail: text("threadExplorerSnapshotProgressRenderCardDetail", { index: index + 1, count: cards.length }) });
    }
  }
  throwIfThreadExplorerSnapshotAborted(signal);
  await onProgress({ percent: 94, step: text("threadExplorerSnapshotProgressEncode"), detail: text("threadExplorerSnapshotProgressRenderCardDetail", { index: cards.length, count: cards.length }) });
  return encodeCanvas(snapshot.canvas, mimeType);
}
