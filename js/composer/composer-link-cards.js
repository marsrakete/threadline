/**
 * Normalizes one link-card slot for every Composer segment.
 * @param {Array<object|null>} cards - Raw link-card values.
 * @param {(card: object|null) => object|null} normalizeCard - Link-card normalization function.
 * @returns {Array<object|null>} Normalized link-card slots.
 */
export function normalizeComposerSegmentLinkCards(cards, normalizeCard) {
  return (Array.isArray(cards) ? cards : []).map((card) => normalizeCard(card));
}

/**
 * Aligns card slots with current sections without retaining removed slots.
 * @param {Array<object|null>} cards - Existing card slots.
 * @param {number} count - Desired section count.
 * @param {Function} normalizeCard - Stored-card normalizer.
 * @returns {Array<object|null>} Aligned card slots.
 */
export function syncComposerSegmentLinkCards(cards, count, normalizeCard) {
  const result = [];
  for (let index = 0; index < count; index += 1) {
    result.push(normalizeCard(cards?.[index]));
  }
  return result;
}

/**
 * Creates the template-based segment preview and its remove action.
 * @param {HTMLTemplateElement} template - Preview structure, including image and remove icon.
 * @param {object} options - Card reader, normalizer, translations and document update adapters.
 * @returns {object} Preview render operation.
 */
export function createComposerLinkCardPreviewRenderer(template, options) {
  /**
   * Renders a normalized card or clears an empty segment slot.
   * @param {HTMLElement} container - Segment preview host.
   * @param {number} segmentIndex - Index of the link-card slot.
   * @returns {void}
   */
  function render(container, segmentIndex) {
    container.replaceChildren();
    const card = options.normalize(options.getCard(segmentIndex));
    if (!card) { return; }
    const fragment = template.content.cloneNode(true);
    const preview = fragment.querySelector(".segment-link-card-preview");
    preview.classList.toggle("is-publication", Boolean(card.standardSite));
    const image = fragment.querySelector("img");
    if (card.imageDataUrl || card.imageUrl) {
      image.src = card.imageDataUrl || card.imageUrl;
    } else {
      image.remove();
    }
    fragment.querySelector("strong").textContent = card.title || card.url;
    fragment.querySelector("span").textContent = card.description || card.url;
    const footer = options.getFooterLabel(card.standardSite);
    let url = card.url;
    if (footer) { url = `${url} - ${footer}`; }
    fragment.querySelector("small").textContent = url;
    const remove = fragment.querySelector("button");
    const label = options.translate("linkCardRemoveButton");
    remove.title = label;
    remove.setAttribute("aria-label", label);
    remove.addEventListener("click", async () => {
      options.setCard(segmentIndex, null);
      await options.persist();
      options.preserveScroll(() => options.renderSegments({ preserveOverrides: true }));
      options.saveDraft();
    });
    container.appendChild(fragment);
  }
  return { render };
}

/**
 * Normalizes one Composer link card for storage and rendering.
 * @param {object|null} card - Raw link-card value.
 * @param {(value: object|null) => object|null} normalizeStandardSite - Standard.site normalizer.
 * @param {string} createdAtFallback - Timestamp used when the card has none.
 * @returns {object|null} Normalized link card or null when the URL is invalid.
 */
export function normalizeComposerLinkCard(card = null, normalizeStandardSite = () => null, createdAtFallback = new Date().toISOString()) {
  if (!card || typeof card !== "object") {
    return null;
  }
  const url = String(card.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  return {
    url,
    title: String(card.title || url).trim().slice(0, 300),
    description: String(card.description || "").trim().slice(0, 1000),
    imageUrl: String(card.imageUrl || "").trim(),
    imageDataUrl: String(card.imageDataUrl || "").trim(),
    imageMimeType: String(card.imageMimeType || "").trim(),
    standardSite: normalizeStandardSite(card.standardSite),
    createdAt: String(card.createdAt || createdAtFallback),
  };
}

/**
 * Finds the first normalized link card outside the inspected segment.
 * @param {Array<object|null>} cards - Link-card slots.
 * @param {number} currentIndex - Segment to exclude.
 * @param {Function} normalizeCard - Card normalizer.
 * @returns {number} Source index, or -1 when no other card exists.
 */
export function findOtherComposerLinkCardIndex(cards, currentIndex, normalizeCard) {
  if (!Array.isArray(cards)) {
    return -1;
  }
  for (let index = 0; index < cards.length; index += 1) {
    if (index !== currentIndex && normalizeCard(cards[index])) {
      return index;
    }
  }
  return -1;
}

/**
 * Derives move/swap targets and short text previews for link-card management.
 * @param {number} currentIndex - Segment opening the dialog.
 * @param {string[]} segments - Current thread segments.
 * @param {Array<object|null>} cards - Link-card slots.
 * @param {Function} normalizeCard - Card normalizer.
 * @returns {Array<object>} Eligible targets in segment order.
 */
export function getComposerLinkCardTargetEntries(currentIndex, segments, cards, normalizeCard) {
  if (!Array.isArray(segments) || !Array.isArray(cards)) {
    return [];
  }
  const entries = [];
  const currentHasCard = Boolean(normalizeCard(cards[currentIndex]));
  for (let index = 0; index < segments.length; index += 1) {
    if (index === currentIndex) {
      continue;
    }
    const card = normalizeCard(cards[index]);
    if (!currentHasCard && !card) {
      continue;
    }
    let action = "move";
    if (currentHasCard && card) {
      action = "swap";
    }
    entries.push({ segmentIndex: index, action, card,
      textPreview: String(segments[index] || "").replace(/\s+/g, " ").trim().slice(0, 140) });
  }
  return entries;
}

/**
 * Renders link-card management targets from templates using plain-text labels.
 * @param {number} currentIndex - Segment opening the dialog.
 * @param {Array<object>} entries - Derived management targets.
 * @param {object} elements - List, note, target template and empty-state template.
 * @param {object} options - Translation, cloning, URL display and action dependencies.
 * @returns {void}
 */
export function renderComposerLinkCardTargets(currentIndex, entries, elements, options) {
  const { list, note, template, emptyTemplate } = elements;
  if (!list || !note || !template || !emptyTemplate) {
    return;
  }
  list.replaceChildren();
  note.textContent = options.translate("linkCardManageDialogDescription");
  if (entries.length === 0) {
    const fragment = options.clone(emptyTemplate);
    fragment.querySelector(".settings-note").textContent = options.translate("linkCardManageNoTargets");
    list.appendChild(fragment);
    return;
  }
  entries.forEach((entry) => {
    const fragment = options.clone(template);
    const item = fragment.querySelector(".link-card-target-item");
    const title = fragment.querySelector(".link-card-target-title");
    const meta = fragment.querySelector(".link-card-target-meta");
    const actionButton = fragment.querySelector(".link-card-target-action");
    title.textContent = options.translate("segmentPart", { index: entry.segmentIndex + 1 });
    if (entry.card) {
      const url = options.formatUrl(entry.card.url);
      meta.textContent = `${entry.card.title || url} · ${url}`;
    } else if (entry.textPreview) {
      meta.textContent = entry.textPreview;
    } else {
      meta.textContent = options.translate("linkCardManageEmptySegment");
    }
    if (entry.action === "swap") {
      actionButton.textContent = options.translate("linkCardSwapAction");
    } else {
      actionButton.textContent = options.translate("linkCardMoveAction");
    }
    actionButton.addEventListener("click", async () => {
      await options.applyAction(currentIndex, entry.segmentIndex);
    });
    item.dataset.segmentIndex = String(entry.segmentIndex);
    list.appendChild(fragment);
  });
}

/**
 * Moves or swaps cards and runs persistence/UI updates in their original order.
 * @param {number} currentIndex - Segment opening the dialog.
 * @param {number} targetIndex - Selected destination/source segment.
 * @param {object} options - Card slots, normalization, status, persistence and UI callbacks.
 * @returns {Promise<boolean>} True when an action was applied.
 */
export async function applyComposerLinkCardTargetAction(currentIndex, targetIndex, options) {
  const cards = options.cards;
  if (!Array.isArray(cards) || !Number.isInteger(currentIndex) || !Number.isInteger(targetIndex)
      || currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
    return false;
  }
  const currentCard = options.normalizeCard(cards[currentIndex]);
  const targetCard = options.normalizeCard(cards[targetIndex]);
  if (!currentCard && !targetCard) {
    return false;
  }
  let statusKey = "linkCardMoved";
  if (currentCard && targetCard) {
    cards[currentIndex] = targetCard;
    cards[targetIndex] = currentCard;
    statusKey = "linkCardSwapped";
  } else if (currentCard) {
    cards[targetIndex] = currentCard;
    cards[currentIndex] = null;
  } else {
    cards[currentIndex] = targetCard;
    cards[targetIndex] = null;
  }
  options.setStatus(options.translate(statusKey));
  await options.persist();
  options.render();
  options.saveDraft();
  options.close();
  return true;
}

/**
 * Derives translated dialog labels and visibility from the pending card action.
 * @param {object} state - Action, segmentIndex, sourceSegmentIndex and hasImages.
 * @param {Function} translate - Translation callback.
 * @returns {object} Dialog presentation model without DOM or state mutations.
 */
export function buildComposerLinkCardDialogModel(state, translate) {
  const { action, segmentIndex, sourceSegmentIndex, hasImages } = state;
  let title = translate("linkCardDialogTitle");
  let description = translate("linkCardDialogDescription");
  let buttonLabel = translate("linkCardCreateButton");
  if (action === "move") {
    title = translate("linkCardMoveButton");
    buttonLabel = translate("linkCardMoveButton");
    if (sourceSegmentIndex >= 0) {
      description = translate("linkCardMovePrompt", { source: sourceSegmentIndex + 1, target: segmentIndex + 1 });
    }
  } else if (action === "manage") {
    title = translate("linkCardManageDialogTitle");
    description = translate("linkCardManagePrompt", { target: segmentIndex + 1 });
  } else if (hasImages) {
    buttonLabel = translate("linkCardCreateAndRemoveImagesButton");
  } else if (action === "refresh") {
    buttonLabel = translate("linkCardRefreshButton");
  }
  let warning = "";
  if (hasImages) {
    warning = translate("linkCardImageConflictWarning");
  }
  return { title, description, buttonLabel, warning,
    hideUrl: action === "move" || action === "manage",
    showTargets: action === "manage", hideSubmit: action === "manage" };
}

/**
 * Creates template-backed link-card dialog presentation and close/reset actions.
 * @param {object} elements - Existing dialog, title, fields, warning, status and submit nodes.
 * @param {object} options - Translation, target rendering, provider update and timer dependencies.
 * @returns {{open: Function, close: Function}} Dialog UI actions; pending state is owned by the caller.
 */
export function createComposerLinkCardDialogController(elements, options) {
  /**
   * Applies an action-specific view and opens the existing dialog.
   * @param {object} state - Pending action, indices, normalized URL and image conflict state.
   * @returns {void}
   */
  function open(state) {
    const model = buildComposerLinkCardDialogModel(state, options.translate);
    if (elements.title) {
      elements.title.textContent = model.title;
    }
    elements.description.textContent = model.description;
    if (elements.urlField) {
      elements.urlField.hidden = model.hideUrl;
    }
    if (elements.targetField) {
      elements.targetField.hidden = !model.showTargets;
      if (model.showTargets) {
        options.renderTargets(state.segmentIndex);
      } else if (elements.targetList) {
        elements.targetList.replaceChildren();
      }
    }
    if (elements.input) {
      elements.input.value = "";
      if (!model.hideUrl) {
        elements.input.value = state.url;
      }
    }
    options.updateProvider();
    elements.warning.hidden = !state.hasImages;
    elements.warning.textContent = model.warning;
    elements.status.textContent = "";
    delete elements.status.dataset.tone;
    elements.submit.hidden = model.hideSubmit;
    if (!model.hideSubmit) {
      elements.submit.textContent = model.buttonLabel;
    }
    elements.dialog.showModal();
    if (elements.input && !model.hideUrl) {
      options.setTimeout(() => {
        elements.input.focus();
        elements.input.select();
      }, 0);
    }
  }
  /**
   * Resets transient fields and closes the existing dialog when open.
   * @returns {void}
   */
  function close() {
    if (elements.submit) {
      elements.submit.hidden = false;
    }
    if (elements.input) {
      elements.input.value = "";
    }
    if (elements.targetField) {
      elements.targetField.hidden = true;
    }
    if (elements.targetList) {
      elements.targetList.replaceChildren();
    }
    if (elements.dialog.open) {
      elements.dialog.close();
    }
  }
  return { open, close };
}

/**
 * Creates the pending link-card create/refresh/move submission workflow.
 * @param {object} elements - URL input, status node and submit button.
 * @param {object} options - Pending state, card/image accessors, validation, request and UI callbacks.
 * @returns {{submit: Function}} Async submission action.
 */
export function createComposerLinkCardSubmissionController(elements, options) {
  /**
   * Validates and submits the pending action, preserving busy/error/cleanup order.
   * @returns {Promise<void>}
   */
  async function submit() {
    const pending = options.getPending();
    const { segmentIndex, action } = pending;
    if (segmentIndex < 0) {
      return;
    }
    const hasImages = (options.getImages()[segmentIndex]?.length || 0) > 0;
    let url = pending.url;
    if (action !== "move") {
      const validation = options.validateUrl(elements.input?.value || "", options.translate);
      if (!validation.ok) {
        elements.status.textContent = validation.message;
        elements.status.dataset.tone = "error";
        return;
      }
      url = validation.url;
      options.setPendingUrl(url);
      if (elements.input && elements.input.value !== url) {
        elements.input.value = url;
      }
    }
    const model = buildComposerLinkCardDialogModel({ ...pending, hasImages }, options.translate);
    try {
      options.setBusy(elements.submit, true, options.translate("linkCardLoading"), model.buttonLabel);
      elements.status.textContent = options.translate("linkCardLoading");
      if (action === "move") {
        const sourceIndex = options.getPending().sourceSegmentIndex;
        const sourceCard = options.normalizeCard(options.getCards()[sourceIndex]);
        if (sourceIndex < 0 || !sourceCard) {
          throw new Error(options.translate("linkCardMoveMissingSource"));
        }
        options.getCards()[sourceIndex] = null;
        options.getCards()[segmentIndex] = sourceCard;
      } else {
        const card = await options.request(url);
        options.syncProvider();
        if (!card) {
          throw new Error(options.translate("linkCardCreateFallback"));
        }
        options.getCards()[segmentIndex] = card;
        if (hasImages) {
          options.getImages()[segmentIndex] = [];
        }
      }
      await options.persist();
      options.render();
      options.saveDraft();
      if (action === "move") {
        options.setStatus(options.translate("linkCardMoved"));
      } else {
        options.setStatus(options.translate("linkCardCreated"));
      }
      options.close();
    } catch (error) {
      options.reportError(error);
      options.syncProvider();
      const fallback = options.translate("linkCardCreateFallback");
      let message = error.message || fallback;
      if (!message.includes(fallback)) {
        message = `${message} ${fallback}`.trim();
      }
      elements.status.textContent = message;
      elements.status.dataset.tone = "error";
    } finally {
      options.setBusy(elements.submit, false, options.translate("linkCardLoading"), model.buttonLabel);
    }
  }
  return { submit };
}
