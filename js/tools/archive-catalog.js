/**
 * Creates archive catalog normalization, file import and ZIP delivery operations.
 * @param {object} dependencies - Required archive codec and environment adapters.
 * @param {Function} dependencies.t - Resolves localized import/export messages.
 * @param {Function} dependencies.depths - Calculates capped, cycle-safe thread depths.
 * @param {Function} dependencies.parseZip - Reads stored ZIP entries into a Map.
 * @param {Function} dependencies.parseJson - Decodes JSON bytes.
 * @param {Function} dependencies.gunzip - Decodes a gzip Blob to JSON text.
 * @param {Function} dependencies.encode - Encodes text into UTF-8 bytes.
 * @param {Function} dependencies.zip - Builds stored ZIP bytes.
 * @param {Function} dependencies.baseName - Creates the catalog filename prefix.
 * @param {Function} dependencies.file - Creates a named ZIP File from bytes.
 * @param {Function} dependencies.deliver - Delivers a completed file.
 * @param {Function} dependencies.progress - Publishes localized progress.
 * @returns {{normalize: Function, load: Function, export: Function}} Catalog operations.
 */
export function createArchiveCatalogService(dependencies) {
  const required = ["t", "depths", "parseZip", "parseJson", "gunzip", "encode", "zip", "baseName", "file", "deliver", "progress"];
  for (const name of required) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Archive catalogs require ${name}.`);
    }
  }

  /**
   * Normalizes imported records and image bytes without changing the input posts.
   * @param {object} rawCatalog - Manifest, posts and optional assets.
   * @returns {object} Normalized catalog with counts, summary and thread depths.
   */
  function normalize(rawCatalog) {
    if (!Array.isArray(rawCatalog?.posts)) {
      throw new Error(dependencies.t("archiveImportInvalid"));
    }
    let assets = [];
    if (Array.isArray(rawCatalog.assets)) {
      assets = rawCatalog.assets.map((asset) => {
        let bytes = asset.bytes;
        if (!(bytes instanceof Uint8Array)) {
          bytes = new Uint8Array(bytes || []);
        }
        return { path: asset.path, type: asset.type || "application/octet-stream",
          sizeBytes: Math.max(0, Number(asset.sizeBytes) || 0), bytes };
      });
    }
    const posts = rawCatalog.posts.map((post) => {
      let images = [];
      if (Array.isArray(post.images)) {
        images = post.images;
      }
      return { ...post, images, counts: {
        likeCount: Number(post.counts?.likeCount) || 0,
        replyCount: Number(post.counts?.replyCount) || 0,
        repostCount: Number(post.counts?.repostCount) || 0,
        quoteCount: Number(post.counts?.quoteCount) || 0,
      } };
    });
    const depths = dependencies.depths(posts);
    for (const post of posts) {
      post.threadDepth = depths.get(post.uri) || 0;
    }
    return { manifest: rawCatalog.manifest || {}, posts, assets, summary: {
      imageCount: assets.length,
      skippedImageCount: Math.max(0, Number(rawCatalog.manifest?.skippedImageCount) || 0),
      from: posts[posts.length - 1]?.createdAt || "",
      to: posts[0]?.createdAt || "",
    } };
  }

  /**
   * Loads the existing ZIP, JSON or gzip-JSON archive format.
   * @param {File} file - User-selected archive file.
   * @returns {Promise<object>} Normalized archive catalog.
   */
  async function load(file) {
    if (/\.zip$/i.test(file.name)) {
      const entries = dependencies.parseZip(new Uint8Array(await file.arrayBuffer()));
      let manifest = {};
      if (entries.has("manifest.json")) {
        manifest = dependencies.parseJson(entries.get("manifest.json"));
      }
      if (!entries.has("posts.json")) {
        throw new Error(dependencies.t("archiveImportInvalid"));
      }
      const posts = dependencies.parseJson(entries.get("posts.json"));
      if (!Array.isArray(posts)) {
        throw new Error(dependencies.t("archiveImportInvalid"));
      }
      const assets = [];
      const seenPaths = new Set();
      for (const post of posts) {
        for (const image of post.images || []) {
          if (!image.path || seenPaths.has(image.path)) {
            continue;
          }
          const bytes = entries.get(image.path);
          if (bytes) {
            seenPaths.add(image.path);
            assets.push({ path: image.path, type: image.mimeType || "application/octet-stream", sizeBytes: bytes.length, bytes });
          }
        }
      }
      return normalize({ manifest, posts, assets });
    }
    let text;
    if (/\.gz$/i.test(file.name)) {
      text = await dependencies.gunzip(file);
    } else {
      text = await file.text();
    }
    return normalize(JSON.parse(text));
  }

  /**
   * Exports the existing manifest/posts/assets ZIP format and reports delivery completion.
   * @param {object} catalog - Normalized archive catalog.
   * @returns {Promise<void>} Resolves after successful file delivery.
   */
  async function exportZip(catalog) {
    if (!catalog) {
      throw new Error(dependencies.t("archiveNeedArchive"));
    }
    dependencies.progress({ title: dependencies.t("archiveProgressZipTitle"), step: dependencies.t("archiveProgressZipStep"),
      percent: 92, detail: dependencies.t("archiveProgressZipDetail", { count: catalog.assets.length }) });
    const posts = catalog.posts.map((post) => {
      const { rawRecord, ...exportPost } = post;
      return { ...exportPost, images: (post.images || []).map((image) => ({
        path: image.path, alt: image.alt || "", width: image.width || 0, height: image.height || 0,
        mimeType: image.mimeType || "application/octet-stream", sizeBytes: image.sizeBytes || 0,
      })) };
    });
    const entries = [
      { name: "manifest.json", data: dependencies.encode(JSON.stringify(catalog.manifest, null, 2)) },
      { name: "posts.json", data: dependencies.encode(JSON.stringify(posts, null, 2)) },
      ...catalog.assets.map((asset) => ({ name: asset.path, data: asset.bytes })),
    ];
    const bytes = dependencies.zip(entries);
    const name = `${dependencies.baseName(catalog)}.zip`;
    await dependencies.deliver(dependencies.file(bytes, name), name, { preferDownload: true });
    dependencies.progress({ title: dependencies.t("archiveProgressDoneTitle"), step: dependencies.t("archiveProgressDoneStep"),
      percent: 100, detail: dependencies.t("archiveExportDone") });
  }

  return { normalize, load, export: exportZip };
}
