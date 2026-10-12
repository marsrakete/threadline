/**
 * Coordinates batch validation and suppresses stale UI rendering.
 * @param {object} options - Image reader, validator, render and error-reporting callbacks.
 * @returns {{validate: Function, schedule: Function}} Validation operations.
 */
export function createComposerImageValidationController(options) {
  let version = 0;
  /**
   * Validates the current images and rerenders only for the latest batch.
   * @returns {Promise<void>}
   */
  async function validate() {
    const requestVersion = ++version;
    const images = options.getImages().flatMap((items) => items || []);
    for (const image of images) { await options.validateImage(image); }
    if (requestVersion === version) { options.render(); }
  }
  /**
   * Starts validation and reports asynchronous failures.
   * @returns {void}
   */
  function schedule() { void validate().catch(options.reportError); }
  return { validate, schedule };
}

/**
 * Refreshes only the ALT-text presentation of an already-rendered image card.
 * @param {object|null} image - Image with current ALT text.
 * @param {HTMLElement|null} card - Existing image card.
 * @param {Function} translate - Translation callback.
 * @returns {void}
 */
export function updateComposerImageAltDisplay(image, card, translate) {
  if (!image || !card) {
    return;
  }
  const hasAlt = Boolean(String(image.alt || "").trim());
  let key = "altTextMissing";
  if (hasAlt) {
    key = "altTextAdded";
  }
  const preview = card.querySelector(".segment-image-preview");
  if (preview) {
    if (hasAlt) {
      preview.title = image.alt;
    } else {
      preview.title = translate("altTextMissing");
    }
  }
  const state = card.querySelector(".segment-image-alt-state");
  if (state) {
    state.textContent = translate(key);
    state.classList.toggle("is-missing-alt", !hasAlt);
  }
  card.querySelector('[data-image-action="alt"]')?.classList.toggle("danger", !hasAlt);
}

/**
 * Detects file transfers from a drag event, including transfers exposing only types.
 * @param {DragEvent} event - Drag/drop event.
 * @returns {boolean} Whether files are present or advertised.
 */
export function composerEventHasTransferFiles(event) {
  const transfer = event.dataTransfer;
  if (!transfer) {
    return false;
  }
  if (transfer.files && transfer.files.length > 0) {
    return true;
  }
  return Array.from(transfer.types || []).includes("Files");
}

/**
 * Extracts only image files from a drag/drop transfer.
 * @param {DragEvent} event - Drag/drop event.
 * @returns {Array<File>} Image files, or an empty array.
 */
export function getComposerDroppedImageFiles(event) {
  if (!event.dataTransfer) {
    return [];
  }
  return Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
}

/**
 * Chooses insertion before/after a card from the dominant pointer offset.
 * @param {object} event - Pointer coordinates clientX/clientY.
 * @param {object} rect - Card left/top/width/height bounds.
 * @returns {string} Before or after insertion position.
 */
export function getComposerImageDropPosition(event, rect) {
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  let offset = y;
  if (Math.abs(x) > Math.abs(y)) {
    offset = x;
  }
  if (offset >= 0) {
    return "after";
  }
  return "before";
}

/**
 * Clears image/file drop indicators without removing the active drag styling.
 * @param {Document|HTMLElement} root - DOM scope containing the image cards.
 * @returns {void}
 */
export function clearComposerImageDropMarkers(root) {
  root.querySelectorAll(".segment-images.is-drop-target").forEach((element) => element.classList.remove("is-drop-target"));
  root.querySelectorAll(".segment-image-card.is-drop-before, .segment-image-card.is-drop-after").forEach((element) => element.classList.remove("is-drop-before", "is-drop-after"));
  root.querySelectorAll(".segment-card.is-file-drop-target").forEach((element) => element.classList.remove("is-file-drop-target"));
}

/**
 * Clears all image drag/drop styling after the owning controller clears drag state.
 * @param {Document|HTMLElement} root - DOM scope containing the image cards.
 * @returns {void}
 */
export function clearComposerImageDragVisuals(root) {
  clearComposerImageDropMarkers(root);
  root.querySelectorAll(".segment-image-card.is-dragging").forEach((element) => element.classList.remove("is-dragging"));
}

/**
 * Creates segment-image selection and mutation operations with explicit state/UI dependencies.
 * @param {object} options - Image/link-card state, limits, image creation, validation, storage and presentation actions.
 * @returns {object} Select, directional move, positioned move and removal operations.
 */
export function createComposerImageCollectionController(options) {
  /**
   * Presents a localized image collection error or trimming notice.
   * @param {string} key - Translation key.
   * @param {object} values - Optional translation substitutions.
   * @returns {void}
   */
  function notify(key, values) {
    options.setStatus(options.translate(key, values), "error");
  }
  /**
   * Persists a synchronous mutation and refreshes the draft without waiting for storage.
   * @returns {void}
   */
  function changed() {
    void options.persist();
    options.render();
    options.saveDraft();
  }
  /**
   * Creates selected images sequentially, then validates and persists before rerendering.
   * @param {number} segmentIndex - Target segment index.
   * @param {Array<File>|FileList} files - Selected files.
   * @returns {Promise<void>}
   */
  async function select(segmentIndex, files) {
    if (options.hasLinkCard(segmentIndex)) {
      notify("linkCardBlocksImages");
      return;
    }
    const items = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (items.length === 0) {
      return;
    }
    let existing = [];
    if (Array.isArray(options.getImages()[segmentIndex])) {
      existing = options.getImages()[segmentIndex];
    }
    const selected = items.slice(0, Math.max(0, options.maxImages - existing.length));
    if (selected.length === 0) {
      notify("imagesLimitReached");
      return;
    }
    if (items.length > selected.length) {
      notify("imagesSelectionTrimmed", { count: selected.length });
    }
    const created = [];
    for (const file of selected) {
      created.push(await options.createImage(file));
    }
    options.setSegment(segmentIndex, [...existing, ...created].slice(0, options.maxImages));
    options.validate();
    await options.persist();
    options.render();
    options.saveDraft();
  }
  /**
   * Moves an image one position within a segment, preserving toolbar boundary behavior.
   * @param {number} segmentIndex - Source segment index.
   * @param {number} imageIndex - Image index.
   * @param {number} direction - Position offset.
   * @returns {void}
   */
  function move(segmentIndex, imageIndex, direction) {
    const images = options.getImages()[segmentIndex];
    if (!Array.isArray(images)) {
      return;
    }
    const target = imageIndex + direction;
    if (target < 0 || target >= images.length) {
      return;
    }
    const next = [...images];
    const [image] = next.splice(imageIndex, 1);
    next.splice(target, 0, image);
    options.setSegment(segmentIndex, next);
    changed();
  }
  /**
   * Moves an image before/after another card or to the end of another segment.
   * @param {number} fromSegmentIndex - Source segment index.
   * @param {number} fromImageIndex - Source image index.
   * @param {number} toSegmentIndex - Target segment index.
   * @param {number} toImageIndex - Target insertion index.
   * @returns {boolean} Whether the image collection changed.
   */
  function moveTo(fromSegmentIndex, fromImageIndex, toSegmentIndex, toImageIndex) {
    const result = moveComposerImage({ segmentImages: options.getImages(), fromSegmentIndex, fromImageIndex,
      toSegmentIndex, toImageIndex, maxImagesPerSegment: options.maxImages, targetHasLinkCard: options.hasLinkCard(toSegmentIndex) });
    if (!result.moved) {
      if (result.reason === "link-card") {
        notify("linkCardBlocksImages");
      } else if (result.reason === "limit") {
        notify("imagesLimitReached");
      }
      return false;
    }
    options.setImages(result.segmentImages);
    changed();
    return true;
  }
  /**
   * Removes an image from an existing segment and saves the changed draft.
   * @param {number} segmentIndex - Source segment index.
   * @param {number} imageIndex - Image index to remove.
   * @returns {void}
   */
  function remove(segmentIndex, imageIndex) {
    if (!Array.isArray(options.getImages()[segmentIndex])) {
      return;
    }
    options.setImages(removeComposerImage(options.getImages(), segmentIndex, imageIndex));
    changed();
  }
  return { select, move, moveTo, remove };
}

/**
 * Binds file drops and image moves to a segment image container.
 * @param {HTMLElement} container - Segment image container.
 * @param {number} segmentIndex - Target segment index.
 * @param {number} imageCount - Append position for existing images.
 * @param {object} actions - Drag-state, file-selection, marker and move dependencies.
 * @returns {void}
 */
export function bindComposerImageContainerEvents(container, segmentIndex, imageCount, actions) {
  container.addEventListener("dragover", (event) => {
    const state = actions.getDragState();
    if (!state && actions.hasFiles(event)) {
      event.preventDefault();
      container.closest(".segment-card")?.classList.add("is-file-drop-target");
      return;
    }
    if (!state) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    actions.clearMarkers();
    container.classList.add("is-drop-target");
  });
  container.addEventListener("drop", (event) => {
    const state = actions.getDragState();
    if (!state && actions.hasFiles(event)) {
      event.preventDefault();
      event.stopPropagation();
      const files = actions.getFiles(event);
      actions.clearMarkers();
      if (files.length > 0) {
        void actions.selectFiles(segmentIndex, files);
      }
      return;
    }
    if (!state) {
      return;
    }
    event.preventDefault();
    if (event.target.closest(".segment-image-card")) {
      return;
    }
    actions.moveTo(state.segmentIndex, state.imageIndex, segmentIndex, imageCount);
    actions.clearDragState();
  });
  container.addEventListener("dragleave", (event) => {
    const rect = container.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      container.closest(".segment-card")?.classList.remove("is-file-drop-target");
    }
  });
}

/**
 * Binds drag positioning and preview keyboard/click actions for one image card.
 * @param {HTMLElement} card - Image card.
 * @param {HTMLElement} preview - Interactive preview.
 * @param {HTMLElement} container - Owning image container.
 * @param {number} segmentIndex - Image segment index.
 * @param {number} imageIndex - Image position.
 * @param {object} actions - Drag state, positioning, move, marker and editor callbacks.
 * @returns {void}
 */
export function bindComposerImageCardEvents(card, preview, container, segmentIndex, imageIndex, actions) {
  card.addEventListener("dragstart", (event) => {
    actions.setDragState({ segmentIndex, imageIndex });
    card.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${segmentIndex}:${imageIndex}`);
    }
  });
  card.addEventListener("dragend", () => actions.clearDragState());
  card.addEventListener("dragover", (event) => {
    if (!actions.getDragState()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    const position = actions.getDropPosition(event, card.getBoundingClientRect());
    actions.clearMarkers();
    container.classList.add("is-drop-target");
    if (position === "after") {
      card.classList.add("is-drop-after");
    } else {
      card.classList.add("is-drop-before");
    }
  });
  card.addEventListener("drop", (event) => {
    const state = actions.getDragState();
    if (!state) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    let insertionIndex = imageIndex;
    if (actions.getDropPosition(event, card.getBoundingClientRect()) === "after") {
      insertionIndex += 1;
    }
    actions.moveTo(state.segmentIndex, state.imageIndex, segmentIndex, insertionIndex);
    actions.clearDragState();
  });
  preview.addEventListener("click", () => { void actions.editImage(segmentIndex, imageIndex); });
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void actions.editImage(segmentIndex, imageIndex);
    }
  });
}

/**
 * Renders a segment's image cards from an HTML template with explicit media/UI dependencies.
 * @param {HTMLElement} container - Target image container.
 * @param {number} segmentIndex - Segment index.
 * @param {Array<object>} images - Segment image data.
 * @param {object} options - Template, preview geometry/rendering, translations, formatting and actions.
 * @returns {void}
 */
export function renderComposerSegmentImages(container, segmentIndex, images, options) {
  container.replaceChildren();
  container.dataset.segmentIndex = String(segmentIndex);
  bindComposerImageContainerEvents(container, segmentIndex, images.length, options.actions);
  for (const [imageIndex, image] of images.entries()) {
    const fragment = options.template.content.cloneNode(true);
    const card = fragment.querySelector(".segment-image-card");
    const preview = card.querySelector(".segment-image-preview");
    card.dataset.segmentIndex = String(segmentIndex);
    card.dataset.imageIndex = String(imageIndex);
    const oversized = Boolean(image.validation?.tooBig && !options.autoResize);
    card.classList.toggle("is-too-large", oversized);
    const frame = options.getPreviewFrame(image);
    const box = options.getContainedBox(frame.width, frame.height, 140, 140);
    const portrait = frame.height > frame.width;
    card.classList.toggle("is-portrait", portrait);
    preview.classList.toggle("is-portrait", portrait);
    preview.style.width = `${box.width}px`;
    preview.style.height = `${box.height}px`;
    preview.style.aspectRatio = `${frame.width} / ${frame.height}`;
    preview.title = image.alt || options.translate("altTextMissing");
    preview.setAttribute("aria-label", options.translate("editImageButton"));
    void options.renderCanvas(image, preview.querySelector("canvas"), { cssWidth: box.width, cssHeight: box.height });
    bindComposerImageCardEvents(card, preview, container, segmentIndex, imageIndex, options.actions);
    card.querySelector(".segment-image-name").textContent = image.name;
    const alt = card.querySelector(".segment-image-alt-state");
    let altKey = "altTextMissing";
    if (image.alt) {
      altKey = "altTextAdded";
    }
    alt.textContent = options.translate(altKey);
    alt.classList.toggle("is-missing-alt", !image.alt);
    card.querySelector(".segment-image-original-size").textContent = options.translate("originalSizeLabel", { size: options.formatSize(image.originalSizeBytes) });
    const exportSize = card.querySelector(".segment-image-export-size");
    exportSize.textContent = options.translate("exportSizeLabel", { size: options.formatSize(image.validation?.sizeBytes) });
    exportSize.classList.toggle("is-too-large", oversized);
    const dimensions = card.querySelector(".segment-image-export-dimensions");
    dimensions.textContent = options.translate("exportDimensionsLabel", {
      width: image.validation?.width || image.width || 0, height: image.validation?.height || image.height || 0,
    });
    dimensions.classList.toggle("is-too-large", Boolean(image.validation?.exceedsDimensions && !options.autoResize));
    const buttons = [
      ["left", "moveImageLeft", () => options.actions.move(segmentIndex, imageIndex, -1)],
      ["right", "moveImageRight", () => options.actions.move(segmentIndex, imageIndex, 1)],
      ["alt", "editAltTextButton", () => options.actions.editAlt(segmentIndex, imageIndex)],
      ["edit", "editImageButton", () => { void options.actions.editImage(segmentIndex, imageIndex); }],
      ["delete", "deleteImageButton", () => options.actions.remove(segmentIndex, imageIndex)],
    ];
    for (const [action, key, handler] of buttons) {
      const button = card.querySelector(`[data-image-action="${action}"]`);
      const label = options.translate(key);
      button.setAttribute("aria-label", label);
      button.title = label;
      button.addEventListener("click", handler);
    }
    card.querySelector('[data-image-action="left"]').classList.toggle("is-disabled", imageIndex === 0);
    card.querySelector('[data-image-action="right"]').classList.toggle("is-disabled", imageIndex === images.length - 1);
    card.querySelector('[data-image-action="alt"]').classList.toggle("danger", !image.alt);
    card.querySelector('[data-image-action="edit"]').classList.toggle("danger", oversized);
    container.appendChild(fragment);
  }
}

/**
 * Moves one image between Composer segments without mutating the input arrays.
 * @param {object} options - Source, target, and image-limit data.
 * @returns {{moved: boolean, reason: string, segmentImages: Array<Array<object>>}} Move result and next image state.
 */
export function moveComposerImage(options = {}) {
  const segmentImages = Array.isArray(options.segmentImages) ? options.segmentImages.map((images) => Array.isArray(images) ? [...images] : []) : [];
  const sourceImages = segmentImages[options.fromSegmentIndex];
  const targetImages = segmentImages[options.toSegmentIndex];
  if (!sourceImages || !targetImages) {
    return { moved: false, reason: "missing-segment", segmentImages };
  }
  if (options.fromImageIndex < 0 || options.fromImageIndex >= sourceImages.length) {
    return { moved: false, reason: "missing-image", segmentImages };
  }
  if (options.fromSegmentIndex !== options.toSegmentIndex && options.targetHasLinkCard) {
    return { moved: false, reason: "link-card", segmentImages };
  }
  if (options.fromSegmentIndex !== options.toSegmentIndex && targetImages.length >= options.maxImagesPerSegment) {
    return { moved: false, reason: "limit", segmentImages };
  }
  const image = sourceImages.splice(options.fromImageIndex, 1)[0];
  let insertionIndex = Math.max(0, Math.min(options.toImageIndex, targetImages.length));
  if (options.fromSegmentIndex === options.toSegmentIndex) {
    if (options.toImageIndex > options.fromImageIndex) {
      insertionIndex = Math.max(0, Math.min(insertionIndex - 1, sourceImages.length));
    }
    if (insertionIndex === options.fromImageIndex) {
      return { moved: false, reason: "unchanged", segmentImages };
    }
    sourceImages.splice(insertionIndex, 0, image);
  } else {
    targetImages.splice(insertionIndex, 0, image);
  }
  return { moved: true, reason: "", segmentImages };
}

/**
 * Removes one image from a Composer segment without mutating the input arrays.
 * @param {Array<Array<object>>} segmentImages - Current image state.
 * @param {number} segmentIndex - Segment containing the image.
 * @param {number} imageIndex - Image index to remove.
 * @returns {Array<Array<object>>} Next image state.
 */
export function removeComposerImage(segmentImages, segmentIndex, imageIndex) {
  return (Array.isArray(segmentImages) ? segmentImages : []).map((images, index) => {
    if (index !== segmentIndex || !Array.isArray(images)) {
      return Array.isArray(images) ? [...images] : [];
    }
    return images.filter((image, currentIndex) => currentIndex !== imageIndex);
  });
}
