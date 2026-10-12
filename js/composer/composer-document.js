/**
 * Creates JSON/gzip Threadline file encoding and decoding.
 * @param {object} api - File, Blob, Response and optional compression stream constructors.
 * @returns {object} File creation, reading and gzip decoding operations.
 */
export function createComposerThreadFileCodec(api) {
  /**
   * Checks whether both compression directions are supported.
   * @returns {boolean} Compression support.
   */
  function supportsCompression() {
    return typeof api.CompressionStream === "function" && typeof api.DecompressionStream === "function";
  }
  /**
   * Decodes a gzip file into JSON text.
   * @param {Blob} blob - Compressed input.
   * @returns {Promise<string>} Decoded text.
   */
  async function gunzip(blob) {
    const stream = blob.stream().pipeThrough(new api.DecompressionStream("gzip"));
    return new api.Response(stream).text();
  }
  /**
   * Creates a dated JSON or compressed Threadline export file.
   * @param {object} payload - Export document.
   * @param {string} timestamp - ISO export date.
   * @returns {Promise<File>} Export file.
   */
  async function createFile(payload, timestamp) {
    const json = JSON.stringify(payload, null, 2);
    const date = timestamp.slice(0, 10);
    if (supportsCompression()) {
      const stream = new api.Blob([json], { type: "application/json" }).stream()
        .pipeThrough(new api.CompressionStream("gzip"));
      const blob = await new api.Response(stream).blob();
      return new api.File([blob], `threadline-thread-${date}.threadline.gz`, { type: "application/gzip" });
    }
    return new api.File([json], `threadline-thread-${date}.json`, { type: "application/json" });
  }
  /**
   * Reads and parses a JSON or gzip document based on its file extension.
   * @param {File} file - Threadline file.
   * @returns {Promise<object>} Parsed document.
   */
  async function read(file) {
    let text;
    if (/\.gz$/i.test(file.name)) { text = await gunzip(file); }
    else { text = await file.text(); }
    return JSON.parse(text);
  }
  return { supportsCompression, createFile, read, gunzip };
}

/**
 * Owns Composer document export/import, resetting and debounced draft persistence.
 * @param {object} elements - Source, counter/decoration/language/hashtag controls and file input.
 * @param {object} options - State adapters, normalizers, codec, settings, rendering and worker persistence.
 * @returns {object} Export/import/clear actions, draft scheduling and UI event handlers.
 */
export function createComposerDocumentController(elements, options) {
  const { sourceText, counterToggle, threadIntroToggle, threadEmojiToggle, markerSpacingToggle,
    languageSelect, hashtagPlacementSelect, importInput } = elements;
  let draftTimer = null;
  /**
   * Builds the existing versioned Threadline document schema.
   * @returns {object} Export payload.
   */
  function buildExport() {
    const state = options.getState();
    const segments = options.getSegments();
    return {
      app: "Threadline", exportedAt: options.now(), version: options.version.appVersion,
      cacheVersion: options.version.cacheVersion, schemaVersion: 1,
      thread: {
        sourceText: sourceText.value, useCounters: counterToggle.checked,
        appendThreadIntro: state.appendThreadIntro, appendThreadEmoji: state.appendThreadEmoji,
        addMarkerSpacing: state.addMarkerSpacing, postInteraction: options.getInteraction(),
        linkCardProxy: options.getLinkCardSettings(), postLanguages: options.getLanguages(),
        localePreference: state.localePreference, hashtagPlacement: state.hashtagPlacement,
        hashtags: state.hashtags, selectedHashtags: state.selectedHashtags,
        segments: segments.map((segment, index) => ({
          text: segment.text, images: options.normalizeImages([segment.images])[0] || [],
          externalCard: options.normalizeLinkCard(state.segmentLinkCards[index]),
        })),
      },
    };
  }
  /**
   * Creates and shares/downloads the current thread without changing its state.
   * @returns {Promise<void>}
   */
  async function exportFile() {
    const payload = buildExport();
    const file = await options.codec.createFile(payload, options.now());
    await options.share(file, file.name);
    options.setStatus(options.translate("threadSaved"));
  }
  /**
   * Normalizes an imported thread and applies controls and state after confirmation.
   * @param {File} file - JSON or gzip thread document.
   * @returns {Promise<void>}
   */
  async function importFile(file) {
    const parsed = await options.codec.read(file);
    if (!parsed?.thread || (typeof parsed.thread.sourceText !== "string" && !Array.isArray(parsed.thread.segments))) {
      throw new Error(options.translate("threadImportInvalid"));
    }
    const confirmed = await options.confirm({
      title: options.translate("threadImportConfirmTitle"), message: options.translate("threadImportConfirmText"),
      confirmLabel: options.translate("confirmYes"), cancelLabel: options.translate("confirmNo"),
    });
    if (!confirmed) { return; }
    const thread = parsed.thread;
    const previous = options.getState();
    let localePreference = previous.localePreference;
    if (options.supportedLocales.includes(thread.localePreference) || thread.localePreference === "auto") {
      localePreference = thread.localePreference;
    }
    let currentLocale = localePreference;
    if (localePreference === "auto") { currentLocale = options.detectLocale(); }
    const hashtags = options.normalizeHashtags(thread.hashtags);
    const selectedHashtags = options.normalizeSelectedHashtags(thread.selectedHashtags, hashtags);
    const hashtagPlacement = options.normalizePlacement(thread.hashtagPlacement);
    let importedSegments = [];
    if (Array.isArray(thread.segments)) { importedSegments = thread.segments; }
    const segmentOverrides = options.normalizeOverrides(importedSegments.map((segment) => segment?.text || ""));
    let segmentImages;
    let segmentLinkCards;
    if (importedSegments.length > 0) {
      segmentImages = options.normalizeImages(importedSegments.map((segment) => segment?.images || []));
      segmentLinkCards = options.normalizeLinkCards(importedSegments.map((segment) => segment?.externalCard || null));
    } else {
      segmentImages = options.normalizeImages(thread.segmentImages);
      segmentLinkCards = options.normalizeLinkCards(thread.segmentLinkCards);
    }
    const appendThreadIntro = thread.appendThreadIntro === true;
    const appendThreadEmoji = thread.appendThreadEmoji === true;
    const addMarkerSpacing = thread.addMarkerSpacing === true;
    sourceText.value = thread.sourceText || "";
    counterToggle.checked = thread.useCounters !== false;
    threadIntroToggle.checked = appendThreadIntro;
    threadEmojiToggle.checked = appendThreadEmoji;
    markerSpacingToggle.checked = addMarkerSpacing;
    languageSelect.value = localePreference;
    hashtagPlacementSelect.value = hashtagPlacement;
    options.applyInteraction(thread.postInteraction || {});
    options.setState({ appendThreadIntro, appendThreadEmoji, addMarkerSpacing,
      selectedPostLanguages: options.normalizeLanguages(thread.postLanguages),
      localePreference, currentLocale, hashtags, selectedHashtags, hashtagPlacement,
      segmentOverrides, segmentImages, segmentLinkCards });
    options.setLocked(Boolean(segmentOverrides));
    options.setPosted(false);
    await options.persistSettings();
    options.applyTranslations();
    options.renderHashtags();
    options.renderSegments({ preserveOverrides: true });
    if (segmentImages.some((images) => (images || []).length > 0)) { options.validateImages(); }
    scheduleDraft();
    options.setStatus(options.translate("threadLoaded"));
  }
  /**
   * Queues the current draft snapshot only after the debounce interval.
   * @returns {void}
   */
  function scheduleDraft() {
    options.clearTimer(draftTimer);
    draftTimer = options.setTimer(async () => {
      draftTimer = null;
      const state = options.getState();
      const payload = { draft: sourceText.value, segmentImages: state.segmentImages,
        segmentLinkCards: state.segmentLinkCards, segmentOverrides: state.segmentOverrides,
        replyTarget: state.composerReplyTarget };
      try { await options.enqueueDraft(() => options.saveDraft(payload)); }
      catch (error) { options.reportError(error); options.setStatus(error.message, "error"); }
    }, 250);
  }
  /**
   * Confirms and clears the complete document, then persists the empty draft and settings.
   * @returns {Promise<void>}
   */
  async function clear() {
    const confirmed = await options.confirm({
      title: options.translate("clearTextConfirmTitle"), message: options.translate("clearTextConfirmText"),
      confirmLabel: options.translate("confirmYes"), cancelLabel: options.translate("confirmNo"),
    });
    if (!confirmed) { return; }
    sourceText.value = "";
    options.setState({ activeSegments: [], segmentImages: [], segmentLinkCards: [], segmentOverrides: null });
    options.clearReply({ render: false });
    options.setLocked(false); options.setPosted(false);
    options.renderSegments({ preserveOverrides: false });
    options.renderReply();
    options.updatePublishLabel();
    try {
      await options.saveDraft({ draft: "", segmentImages: [], segmentLinkCards: [], segmentOverrides: null, replyTarget: null });
      await options.persistSettings();
      options.setStatus(options.translate("clearConfirm"));
    } catch (error) { options.reportError(error); options.setStatus(error.message, "error"); }
  }
  /**
   * Starts file selection from the load-thread button.
   * @returns {void}
   */
  function loadClick() { importInput.click(); }
  /**
   * Exports the current document and presents failures.
   * @returns {Promise<void>}
   */
  async function saveClick() {
    try { await exportFile(); }
    catch (error) { options.reportError(error); options.setStatus(options.translate("threadSaveFailed"), "error"); }
  }
  /**
   * Consumes a selected file, clears the input and presents import failures.
   * @param {Event} event - File input change.
   * @returns {Promise<void>}
   */
  async function importChange(event) {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) { return; }
    try { await importFile(file); }
    catch (error) { options.reportError(error); options.setStatus(error.message || options.translate("threadImportFailed"), "error"); }
  }
  return { buildExport, exportFile, importFile, clear, scheduleDraft, handlers: { loadClick, saveClick, importChange, clear } };
}
