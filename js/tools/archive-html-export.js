const ARCHIVE_HTML_TEMPLATE_FILES = {
  shell: "./templates/archive-html-shell.html",
  clientScript: "./templates/archive-html-client.js",
  fragments: "./templates/archive-html-fragments.html",
};

/**
 * Creates a cached template-bundle request with explicit network and error adapters.
 * @param {object} options - Fetch and localized error-text adapters.
 * @param {Function} options.fetch - Local static-template request adapter.
 * @param {Function} options.error - User-facing error text for an HTTP status.
 * @returns {() => Promise<object>} Loader retaining the first fulfilled or rejected request.
 */
export function createArchiveHtmlTemplateLoader(options) {
  if (!options || typeof options.fetch !== "function" || typeof options.error !== "function") {
    throw new TypeError("Archive HTML templates require fetch and error-text adapters.");
  }
  let pending = null;
  /**
   * Loads all controlled export templates once.
   * @returns {Promise<object>} Shell, client script and DOM fragments.
   */
  function load() {
    if (!pending) {
      pending = Promise.all(Object.entries(ARCHIVE_HTML_TEMPLATE_FILES).map(async ([name, path]) => {
        const response = await options.fetch(path);
        if (!response.ok) {
          throw new Error(options.error(response.status));
        }
        return [name, await response.text()];
      })).then((entries) => Object.fromEntries(entries));
    }
    return pending;
  }
  return load;
}

/**
 * Creates HTML export orchestration without DOM wiring or application state.
 * @param {object} options - Copy, assets, size policy, rendering, progress, frame, file and delivery adapters.
 * @param {Function} options.t - Translation with replacement values.
 * @param {Function} options.ensureAvatars - Completes the existing catalog avatar assets.
 * @param {Function} options.encodeAsset - Asynchronously encodes one asset as a data URL.
 * @param {Function} options.shouldCompact - Existing asset-size recommendation.
 * @param {Function} options.isSizeError - Existing recoverable string-size error classification.
 * @param {Function} options.build - Asynchronous standalone-document renderer.
 * @param {Function} options.progress - Progress state writer.
 * @param {Function} options.frame - Yields work to the UI.
 * @param {Function} options.baseName - Existing catalog filename base.
 * @param {Function} options.file - HTML file factory.
 * @param {Function} options.deliver - Existing file download/share adapter.
 * @returns {{export: Function}} Export operation for a supplied catalog.
 */
export function createArchiveHtmlExportController(options) {
  const required = ["t", "ensureAvatars", "encodeAsset", "shouldCompact", "isSizeError", "build",
    "progress", "frame", "baseName", "file", "deliver"];
  if (!options || required.some((name) => typeof options[name] !== "function")) {
    throw new TypeError("Archive HTML export requires content, asset, rendering and delivery adapters.");
  }
  const t = options.t;
  /**
   * Publishes one export progress update.
   * @param {number} percent - Completion percentage.
   * @param {string} detail - Localized detail.
   * @returns {void}
   */
  function progress(percent, detail) {
    options.progress({ title: t("archiveProgressHtmlTitle"), step: t("archiveProgressHtmlStep"), percent, detail });
  }
  /**
   * Builds and delivers full or compact HTML with the existing size-fallback rules.
   * @param {object} catalog - Archive catalog.
   * @param {object} settings - Optional export mode.
   * @returns {Promise<void>} Delivery and final progress completion.
   */
  async function exportHtml(catalog, settings = {}) {
    if (!catalog) {
      throw new Error(t("archiveNeedArchive"));
    }
    const compact = settings.mode === "compact";
    if (!compact) {
      await options.ensureAvatars(catalog);
    }
    let assets = [];
    if (Array.isArray(catalog.assets)) {
      assets = catalog.assets;
    }
    const effectiveCompact = compact || options.shouldCompact(assets);
    const assetUris = new Map();
    let detail = t("archiveProgressHtmlDetail", { count: assets.length });
    if (effectiveCompact) {
      detail = t("archiveProgressHtmlCompactDetail");
    }
    progress(76, detail);
    if (!effectiveCompact) {
      try {
        for (const [index, asset] of assets.entries()) {
          assetUris.set(asset.path, await options.encodeAsset(asset));
          if ((index + 1) % 8 === 0 || index + 1 === assets.length) {
            progress(76 + Math.round(((index + 1) / Math.max(1, assets.length)) * 18), t("archiveProgressHtmlDetail", { count: assets.length }));
            await options.frame();
          }
        }
      } catch (error) {
        if (!options.isSizeError(error)) {
          throw error;
        }
        assetUris.clear();
      }
    }
    const fallbackTriggered = effectiveCompact || (!compact && assetUris.size === 0 && assets.length > 0);
    if (fallbackTriggered) {
      progress(94, t("archiveHtmlAutoCompactNotice"));
      await options.frame();
    }
    let mode = "full";
    if (fallbackTriggered) {
      mode = "compact";
    }
    let html;
    try {
      html = await options.build(catalog, assetUris, { embedPostImages: !fallbackTriggered, mode });
    } catch (error) {
      if (!options.isSizeError(error) || fallbackTriggered) {
        throw error;
      }
      assetUris.clear();
      progress(94, t("archiveHtmlAutoCompactNotice"));
      await options.frame();
      html = await options.build(catalog, assetUris, { embedPostImages: false, mode: "compact" });
    }
    let suffix = "";
    let done = t("archiveHtmlDone");
    if (fallbackTriggered) {
      suffix = "-compact";
      done = t("archiveHtmlCompactDone");
    }
    const name = `${options.baseName(catalog)}${suffix}.html`;
    const file = options.file(html, name);
    await options.deliver(file, name, { preferDownload: true });
    options.progress({ title: t("archiveProgressDoneTitle"), step: t("archiveProgressDoneStep"), percent: 100, detail: done });
  }
  return { export: exportHtml };
}
