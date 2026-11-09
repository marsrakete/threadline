/** Creates Composer image persistence without changing IndexedDB schema or completion boundaries.
 * @param {object} options - Database, normalizers, converters, value reader, Blob constructor, clock, keys and messages.
 * @returns {object} Frozen read/put/list/delete/ids/store/hydrate/prune API.
 */
globalThis.createThreadlineComposerImageStore = function createThreadlineComposerImageStore(options) {
  for (const name of ["open", "normalizeSegments", "normalizeMetadata", "normalizeImage", "toBlob", "toDataUrl", "readValue", "blob", "now"]) {
    if (typeof options?.[name] !== "function") { throw new TypeError("Composer image store requires " + name); }
  }
  const { open: openDatabase, normalizeSegments: normalizeSegmentImages, normalizeMetadata: normalizeSegmentImageMetadata,
    normalizeImage: normalizeThreadImage, toBlob: dataUrlToBlob, toDataUrl: blobToDataUrl, readValue: readStoredValue,
    blob: Blob, now, storeName: COMPOSER_IMAGE_STORE_NAME, draftKey: DRAFT_KEY, settingsKey: SETTINGS_KEY, messages } = options;
  /** Returns arrays unchanged, otherwise an empty array. @param {unknown} value - Input. @returns {Array} Array. */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) { return value; }
    return [];
  }
  /** Reads unique image IDs, resolving when all get requests succeed. @param {Array} ids - Existing image records, IDs or segments. @returns {Promise<Map>} Operation result. */
  async function readComposerImageBlobEntries(ids = []) {
    const uniqueIds = [...new Set((arrayOrEmpty(ids)).map((value) => String(value || "")).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readonly");
      const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);
      const records = new Map();
      let pending = uniqueIds.length;

      const fail = (error) => reject(error || transaction.error || new Error(messages.composerImagesRead));

      for (const id of uniqueIds) {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            records.set(id, request.result);
          }
          pending -= 1;
          if (pending === 0) {
            resolve(records);
          }
        };
        request.onerror = () => fail(request.error);
      }

      transaction.onerror = () => fail(transaction.error);
      transaction.onabort = () => fail(transaction.error);
    });
  }

  /** Writes image entries, resolving on transaction completion. @param {Array} entries - Existing image records, IDs or segments. @returns {Promise<void>} Operation result. */
  async function putComposerImageBlobEntries(entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readwrite");
      const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);

      for (const entry of entries) {
        store.put(entry);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error(messages.composerImagesWrite));
      transaction.onabort = () => reject(transaction.error || new Error(messages.composerImagesWrite));
    });
  }

  /** Lists string image keys, resolving on request success. @returns {Promise<Array<string>>} Operation result. */
  async function listComposerImageBlobIds() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readonly");
      const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve((arrayOrEmpty(request.result)).map((value) => String(value || "")).filter(Boolean));
      request.onerror = () => reject(request.error || new Error(messages.composerImagesRead));
    });
  }

  /** Deletes unique image IDs, resolving on transaction completion. @param {Array} ids - Existing image records, IDs or segments. @returns {Promise<void>} Operation result. */
  async function deleteComposerImageBlobEntries(ids = []) {
    const uniqueIds = [...new Set((arrayOrEmpty(ids)).map((value) => String(value || "")).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return;
    }

    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPOSER_IMAGE_STORE_NAME, "readwrite");
      const store = transaction.objectStore(COMPOSER_IMAGE_STORE_NAME);

      for (const id of uniqueIds) {
        store.delete(id);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error(messages.composerImagesDelete));
      transaction.onabort = () => reject(transaction.error || new Error(messages.composerImagesDelete));
    });
  }

  /** Collects referenced IDs from normalized metadata. @param {Array} segments - Existing image records, IDs or segments. @returns {Set<string>} Operation result. */
  function collectComposerImageIdsFromSegments(segments = []) {
    const ids = new Set();
    for (const images of normalizeSegmentImageMetadata(segments)) {
      for (const image of images) {
        ids.add(image.id);
      }
    }
    return ids;
  }

  /** Stores normalized inline images, reusing matching Blob records. @param {Array} segmentImages - Existing image records, IDs or segments. @returns {Promise<Array>} Operation result. */
  async function storeComposerImageBlobs(segmentImages = []) {
    const normalized = normalizeSegmentImages(segmentImages);
    const images = normalized.flatMap((items) => items || []);
    if (images.length === 0) {
      return normalized;
    }

    const existingRecords = await readComposerImageBlobEntries(images.map((image) => image.id));
    const entries = [];

    for (const image of images) {
      if (!image?.id || !image?.dataUrl) {
        continue;
      }

      const existing = existingRecords.get(image.id);
      const expectedSize = Math.max(0, Number(image.originalSizeBytes) || 0);
      const hasBlob = existing?.blob instanceof Blob;
      const sizeMatches = expectedSize === 0 || Number(existing?.sizeBytes) === expectedSize;
      const typeMatches = !image.type || !existing?.type || existing.type === image.type;
      if (hasBlob && sizeMatches && typeMatches) {
        continue;
      }

      const blob = await dataUrlToBlob(image.dataUrl);
      entries.push({
        id: image.id,
        blob,
        type: image.type || blob.type || "image/jpeg",
        sizeBytes: expectedSize || blob.size || 0,
        updatedAt: now(),
      });
    }

    if (entries.length > 0) {
      await putComposerImageBlobEntries(entries);
    }

    return normalized;
  }

  /** Restores metadata with inline or persisted image data. @param {Array} segments - Existing image records, IDs or segments. @returns {Promise<Array>} Operation result. */
  async function hydrateStoredSegmentImages(segments = []) {
    const normalizedMeta = normalizeSegmentImageMetadata(segments);
    const missingIds = [];

    normalizedMeta.forEach((images) => {
      images.forEach((image) => {
        if (!image.dataUrl && image.id) {
          missingIds.push(image.id);
        }
      });
    });

    const blobRecords = await readComposerImageBlobEntries(missingIds);
    const hydratedSegments = [];

    for (let segmentIndex = 0; segmentIndex < normalizedMeta.length; segmentIndex += 1) {
      const sourceImages = arrayOrEmpty(segments[segmentIndex]);
      const hydratedImages = [];

      for (let imageIndex = 0; imageIndex < normalizedMeta[segmentIndex].length; imageIndex += 1) {
        const metaImage = normalizedMeta[segmentIndex][imageIndex];
        const sourceImage = sourceImages[imageIndex];
        let inlineDataUrl = "";
        if (typeof sourceImage?.dataUrl === "string") { inlineDataUrl = sourceImage.dataUrl; }
        let storedBlob = null;
        if (metaImage?.id) { storedBlob = blobRecords.get(metaImage.id); }
        let blobDataUrl = "";
        if (storedBlob?.blob instanceof Blob) { blobDataUrl = await blobToDataUrl(storedBlob.blob); }
        const hydrated = normalizeThreadImage({
          ...metaImage,
          dataUrl: inlineDataUrl || blobDataUrl,
        });
        if (hydrated) {
          hydratedImages.push(hydrated);
        }
      }

      hydratedSegments.push(hydratedImages);
    }

    return hydratedSegments;
  }

  /** Removes blobs unreferenced by either current draft or settings. @returns {Promise<void>} Operation result. */
  async function pruneComposerImageBlobs() {
    const draft = await readStoredValue(DRAFT_KEY);
    const storedSettings = await readStoredValue(SETTINGS_KEY);
    const referencedIds = new Set([
      ...collectComposerImageIdsFromSegments(draft?.segmentImages),
      ...collectComposerImageIdsFromSegments(storedSettings?.segmentImages),
    ]);
    const storedIds = await listComposerImageBlobIds();
    const staleIds = storedIds.filter((id) => !referencedIds.has(id));
    await deleteComposerImageBlobEntries(staleIds);
  }

  return Object.freeze({ read: readComposerImageBlobEntries, put: putComposerImageBlobEntries, list: listComposerImageBlobIds, delete: deleteComposerImageBlobEntries, ids: collectComposerImageIdsFromSegments, store: storeComposerImageBlobs, hydrate: hydrateStoredSegmentImages, prune: pruneComposerImageBlobs });
};
