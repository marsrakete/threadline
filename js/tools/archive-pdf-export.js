/**
 * Creates ArchivePdfExportController with explicit environment and domain adapters.
 * @param {object} dependencies - Required domain and environment adapters.
 * @param {Function} dependencies.paginate - Splits posts into measured pages.
 * @param {Function} dependencies.page - Renders a page to JPEG bytes and annotations.
 * @param {Function} dependencies.pdf - Builds a PDF Blob from rendered pages.
 * @param {Function} dependencies.frame - Yields to the browser before expensive work.
 * @param {Function} dependencies.t - Resolves localized progress and title text.
 * @param {Function} dependencies.progress - Publishes export progress.
 * @param {Function} dependencies.ensureAvatars - Hydrates missing archive avatar assets.
 * @param {Function} dependencies.options - Reads current PDF export settings.
 * @param {Function} dependencies.groups - Orders posts into thread groups.
 * @param {Function} dependencies.bands - Splits posts into volumes.
 * @param {Function} dependencies.baseName - Builds the archive filename prefix.
 * @param {Function} dependencies.deliver - Delivers a completed file with download preference.
 * @param {Function} dependencies.account - Reads the current fallback account handle.
 * @param {Function} dependencies.file - Creates a named PDF file from a Blob.
 * @returns {object} band, export operations.
 */
export function createArchivePdfExportController(dependencies) {
  if (!dependencies) {
    throw new TypeError("Archive PDF dependencies are required.");
  }
  if (typeof dependencies.paginate !== "function") {
    throw new TypeError("Archive PDF requires paginate.");
  }
  if (typeof dependencies.page !== "function") {
    throw new TypeError("Archive PDF requires page.");
  }
  if (typeof dependencies.pdf !== "function") {
    throw new TypeError("Archive PDF requires pdf.");
  }
  if (typeof dependencies.frame !== "function") {
    throw new TypeError("Archive PDF requires frame.");
  }
  if (typeof dependencies.t !== "function") {
    throw new TypeError("Archive PDF requires t.");
  }
  if (typeof dependencies.progress !== "function") {
    throw new TypeError("Archive PDF requires progress.");
  }
  if (typeof dependencies.ensureAvatars !== "function") {
    throw new TypeError("Archive PDF requires ensureAvatars.");
  }
  if (typeof dependencies.options !== "function") {
    throw new TypeError("Archive PDF requires options.");
  }
  if (typeof dependencies.groups !== "function") {
    throw new TypeError("Archive PDF requires groups.");
  }
  if (typeof dependencies.bands !== "function") {
    throw new TypeError("Archive PDF requires bands.");
  }
  if (typeof dependencies.baseName !== "function") {
    throw new TypeError("Archive PDF requires baseName.");
  }
  if (typeof dependencies.deliver !== "function") {
    throw new TypeError("Archive PDF requires deliver.");
  }
  if (typeof dependencies.account !== "function") {
    throw new TypeError("Archive PDF requires account.");
  }
  if (typeof dependencies.file !== "function") {
    throw new TypeError("Archive PDF requires file.");
  }
  const paginateArchivePdfPosts = dependencies.paginate;
  const renderArchivePdfCanvasPage = dependencies.page;
  const buildPdfFile = dependencies.pdf;
  const waitForUiFrame = dependencies.frame;
  const t = dependencies.t;
  const setArchiveProgress = dependencies.progress;
  const ensureArchiveAvatarAssets = dependencies.ensureAvatars;
  const getArchivePdfOptions = dependencies.options;
  const buildArchiveThreadGroups = dependencies.groups;
  const splitArchiveIntoBands = dependencies.bands;
  const makeArchiveFileBaseName = dependencies.baseName;
  const shareOrDownloadFile = dependencies.deliver;
  /**
   * Renders each page in a volume and builds its linked PDF file.
   * @param {object} catalog - Archive account, summary and image assets.
   * @param {object[]} posts - Posts to measure, order or render.
   * @param {number} bandIndex - Zero-based volume index.
   * @param {number} bandCount - Total number of volumes.
   * @param {object} options - Image size, metrics, indentation and volume settings.
   * @param {Function|null} progressCallback - Optional callback receiving pageIndex and pageCount before rendering.
   * @returns {Promise<Blob>} Linked PDF document for this volume.
   */
  async function buildArchivePdfBand(catalog, posts, bandIndex, bandCount, options, progressCallback = null) {
    const pagePosts = paginateArchivePdfPosts(posts, options);
    const pages = [];
    for (const [pageIndex, page] of pagePosts.entries()) {
      if (typeof progressCallback === "function") {
        progressCallback({
          pageIndex,
          pageCount: pagePosts.length
        });
      }
      await waitForUiFrame();
      const renderedPage = await renderArchivePdfCanvasPage(catalog, page, pageIndex, pagePosts.length, bandIndex, bandCount, options);
      pages.push({
        content: `q 595 0 0 842 0 0 cm /PageImage${pageIndex + 1} Do Q`,
        images: [{
          name: `PageImage${pageIndex + 1}`,
          width: renderedPage.width,
          height: renderedPage.height,
          bytes: renderedPage.bytes
        }],
        annotations: renderedPage.annotations
      });
    }
    return buildPdfFile(pages, {
      title: catalog?.account?.handle || dependencies.account() || t("archivePdfDocumentTitle")
    });
  }

  /**
   * Prepares assets, builds volumes, reports progress and delivers PDF files.
   * @param {object} catalog - Archive account, summary and image assets.
   * @returns {Promise<void>} Resolves after delivery and final progress.
   */
  async function exportArchivePdfBandsFromCatalog(catalog) {
    if (!catalog) {
      throw new Error(t("archiveNeedArchive"));
    }
    setArchiveProgress({
      title: t("archiveProgressPdfTitle"),
      step: t("archiveProgressPdfStep", {
        index: 1,
        count: 1
      }),
      percent: 3,
      detail: t("archiveProgressPdfPreparing")
    });
    await waitForUiFrame();
    await ensureArchiveAvatarAssets(catalog);
    const options = getArchivePdfOptions();
    const orderedPosts = buildArchiveThreadGroups([...catalog.posts].reverse()).flatMap(group => group.posts);
    const bands = splitArchiveIntoBands(orderedPosts, options);
    const baseName = makeArchiveFileBaseName(catalog);
    for (const [bandIndex, posts] of bands.entries()) {
      setArchiveProgress({
        title: t("archiveProgressPdfTitle"),
        step: t("archiveProgressPdfStep", {
          index: bandIndex + 1,
          count: bands.length
        }),
        percent: Math.max(6, Math.round(bandIndex / Math.max(1, bands.length) * 100)),
        detail: t("archiveProgressPdfDetail", {
          posts: posts.length
        })
      });
      await waitForUiFrame();
      const blob = await buildArchivePdfBand(catalog, posts, bandIndex, bands.length, options, ({
        pageIndex,
        pageCount
      }) => {
        const bandBase = bandIndex / Math.max(1, bands.length);
        let pageShare;
        if (pageCount > 0) {
          pageShare = (pageIndex + 1) / pageCount;
        } else {
          pageShare = 1;
        }
        const percent = Math.min(99, Math.round((bandBase + pageShare / Math.max(1, bands.length)) * 100));
        setArchiveProgress({
          title: t("archiveProgressPdfTitle"),
          step: t("archiveProgressPdfStep", {
            index: bandIndex + 1,
            count: bands.length
          }),
          percent,
          detail: t("archiveProgressPdfPageDetail", {
            posts: posts.length,
            page: pageIndex + 1,
            pages: pageCount
          })
        });
      });
      const fileName = `${baseName}-band-${String(bandIndex + 1).padStart(3, "0")}.pdf`;
      const file = dependencies.file(blob, fileName);
      await shareOrDownloadFile(file, fileName, {
        preferDownload: true
      });
    }
    setArchiveProgress({
      title: t("archiveProgressDoneTitle"),
      step: t("archiveProgressDoneStep"),
      percent: 100,
      detail: t("archivePdfDone", {
        count: bands.length
      })
    });
  }
  return {
    band: buildArchivePdfBand,
    export: exportArchivePdfBandsFromCatalog
  };
}
