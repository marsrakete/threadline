/**
 * Builds the localized presentation for a completed publication.
 * @param {object} result - Worker result containing posts, account, web app and rate limit.
 * @param {object} options - Account/web-app fallbacks, URL builder, translator and rate-limit formatter.
 * @returns {object} Dialog text, rate-limit note, post URL and Explorer button label.
 */
export function buildComposerPublishResultModel(result, options) {
  const postCount = result.posts?.length || 0;
  const webApp = result.webApp || options.webApp;
  const target = options.getTargetName(webApp);
  let messageKey = "publishResultMessageOneTarget";
  if (postCount > 1) {
    messageKey = "publishResultMessageManyTarget";
  }
  return {
    message: options.translate(messageKey, { target }),
    rateLimitMessage: options.formatRateLimit(result.rateLimit, true),
    postUrl: options.buildPostUrl(result.handle || options.account, result.posts?.[0]?.uri, webApp) || "",
    explorerLabel: options.translate("openPostInThreadExplorerButton"),
  };
}

/**
 * Collects trimmed posting texts, retaining the composed-text fallback.
 * @param {string[]} segments - Current section texts.
 * @param {string} composedText - Complete document when no sections exist.
 * @returns {string[]} Posting texts in document order.
 */
export function getComposerPostingTexts(segments, composedText) {
  if (Array.isArray(segments) && segments.length > 0) {
    return segments.map((text) => String(text || "").trim());
  }
  return [String(composedText || "").trim()];
}

/**
 * Builds posting payloads from document text and matching media slots.
 * @param {object} state - Segments, composed text, images and link cards.
 * @param {Function} normalizeCard - Link-card normalizer.
 * @returns {object[]} Ordered payloads, preserving original image objects.
 */
export function buildComposerPostingPayloads(state, normalizeCard) {
  return getComposerPostingTexts(state.segments, state.composedText).map((text, index) => {
    let images = [];
    if (Array.isArray(state.images?.[index])) { images = state.images[index]; }
    return { text, images, externalCard: normalizeCard(state.cards?.[index]) };
  });
}

/**
 * Presents a completed publication in the existing HTML dialog.
 * @param {object} model - Publish result display model.
 * @param {object} elements - Dialog, text, optional rate-limit note, link and optional Explorer button.
 * @returns {void}
 */
export function renderComposerPublishResult(model, elements) {
  elements.text.textContent = model.message;
  if (elements.rateLimitNote) {
    elements.rateLimitNote.hidden = !model.rateLimitMessage;
    elements.rateLimitNote.textContent = model.rateLimitMessage;
  }
  elements.link.href = model.postUrl || "#";
  elements.link.hidden = !model.postUrl;
  if (elements.explorerButton) {
    elements.explorerButton.disabled = !model.postUrl;
    elements.explorerButton.dataset.postUrl = model.postUrl;
    elements.explorerButton.textContent = model.explorerLabel;
  }
  elements.dialog.showModal();
}

/**
 * Opens the published post and keeps the result dialog available on failure.
 * @param {object} elements - Explorer button and result dialog.
 * @param {object} options - Translator, busy setter, post opener and error callbacks.
 * @returns {Promise<void>} Resolves after navigation or handled failure.
 */
export async function openComposerPublishedPost(elements, options) {
  const button = elements.explorerButton;
  const postUrl = String(button?.dataset.postUrl || "").trim();
  if (!button || !postUrl) {
    return;
  }
  try {
    options.setBusy(button, true, options.translate("historyOpenThreadExplorerBusy"), options.translate("openPostInThreadExplorerButton"));
    await options.openPost(postUrl);
    elements.dialog.close();
  } catch (error) {
    options.reportError(error);
    options.showError(error.message || options.translate("threadExplorerUrlFailed"));
  } finally {
    options.setBusy(button, false, options.translate("historyOpenThreadExplorerBusy"), options.translate("openPostInThreadExplorerButton"));
  }
}

/**
 * Creates ordered publication success and error processing with explicit state dependencies.
 * @param {object} options - Rate-limit, history, reply/draft/UI actions, translator and error formatter.
 * @returns {object} Async success and error handlers for the publication workflow.
 */
export function createComposerPublishResultHandlers(options) {
  /**
   * Records a successful publication before clearing reply state or marking the draft posted.
   * @param {object} result - Worker publication result.
   * @param {Array<object>} segments - Prepared segments recorded in history.
   * @returns {Promise<void>}
   */
  async function success(result, segments) {
    options.setRateLimit(result.rateLimit);
    await options.record(result, segments);
    options.clearReply();
    options.setPosted(true);
    options.saveDraft();
    let message = options.translate("statusPublishedOne");
    if (result.posts.length !== 1) {
      message = options.translate("statusPublishedMany", { count: result.posts.length });
    }
    options.setStatus(message);
    options.showResult(result);
  }
  /**
   * Reports a failed publication without clearing the draft or reply target.
   * @param {Error} error - Publication or result-processing failure.
   * @returns {Promise<void>}
   */
  async function failure(error) {
    options.reportError(error);
    options.setRateLimit(error?.details?.rateLimit);
    const message = options.formatError(error);
    options.setStatus(message, "error");
    options.showError(message);
  }
  return { success, failure };
}

/**
 * Runs the ordered hashtag, continuation/reply and final account confirmations.
 * @param {object} options - Translator, confirmation action and current-state getters.
 * @returns {Promise<boolean>} False when any confirmation is cancelled or dismissed.
 */
export async function confirmComposerPublication(options) {
  const t = options.translate;
  const labels = { confirmLabel: t("confirmYes"), cancelLabel: t("cancelButton") };
  if (!options.hasHashtags()) {
    const accepted = await options.confirm({ ...labels, title: t("publishNoHashtagTitle"), message: t("publishNoHashtagText") });
    if (!accepted) {
      return false;
    }
  }
  if (options.getReplyTarget()?.mode === "thread") {
    const accepted = await options.confirm({ ...labels, title: t("publishConfirmThreadContinuationTitle"), message: t("publishConfirmThreadContinuationText") });
    if (!accepted) {
      return false;
    }
  }
  if (options.getReplyTarget()?.mode === "post") {
    const target = options.getReplyTarget();
    const name = options.getReplyTargetName();
    const accepted = await options.confirm({ ...labels, title: t("publishConfirmReplyTargetTitle"),
      message: t("publishConfirmReplyTargetText", { target: name || "?" }),
      preview: { avatar: target.targetAccount.avatar, name, handle: target.targetAccount.handle } });
    if (!accepted) {
      return false;
    }
  }
  return Boolean(await options.confirm({ ...labels, title: t("publishConfirmTitle"),
    message: t("publishConfirmText", { account: options.getAccount() || "?", target: options.getPostTargetName() }) }));
}

/**
 * Builds worker publish data without leaking reply preview/account metadata.
 * @param {Array<object>} segments - Prepared upload-ready segments.
 * @param {object} options - Languages, interaction settings and current reply target.
 * @returns {object} Thread publish payload with only required reply references.
 */
export function buildComposerPublishPayload(segments, options) {
  let replyTarget = null;
  if (options.replyTarget) {
    replyTarget = {
      mode: options.replyTarget.mode,
      replyRoot: options.replyTarget.replyRoot,
      replyParent: options.replyTarget.replyParent,
    };
  }
  return { segments, langs: options.langs, postInteraction: options.postInteraction, replyTarget };
}

/**
 * Prepares Composer segments for the AT-Proto publish request.
 * @param {Array<object>} segments - Segments containing text, images and cards.
 * @param {object} options - Preparation callbacks, limits and progress callback.
 * @returns {Promise<Array<object>>} Upload-ready segments.
 */
export async function prepareComposerPublishSegments(segments = [], options = {}) {
  const preparedSegments = [];
  for (const [segmentIndex, segment] of segments.entries()) {
    if (typeof options.onProgress === "function") {
      options.onProgress({ type: "segment", segmentIndex, segmentCount: segments.length });
    }
    const preparedImages = [];
    const externalCard = options.normalizeLinkCard(segment.externalCard);
    let images = [];
    if (Array.isArray(segment.images)) {
      images = segment.images;
    }
    if (externalCard && images.length > 0) {
      throw new Error(options.linkCardImageConflictMessage);
    }
    for (const [imageIndex, image] of images.entries()) {
      if (typeof options.onProgress === "function") {
        options.onProgress({ type: "image", imageIndex, imageCount: segment.images.length, segmentIndex });
      }
      const preparedImage = await options.prepareImage(image);
      const exceedsDimensions = preparedImage.width > options.maxDimension || preparedImage.height > options.maxDimension;
      const tooBig = preparedImage.validation?.tooBig || preparedImage.blob.size > options.blobLimit || exceedsDimensions;
      if (tooBig) {
        image.validation = {
          sizeBytes: preparedImage.blob.size,
          width: preparedImage.width,
          height: preparedImage.height,
          exceedsDimensions,
          tooBig: true,
        };
        if (typeof options.onTooLarge === "function") {
          options.onTooLarge();
        }
        throw new Error(options.imageTooLargeMessage);
      }
      let imageType = image.type || "image/jpeg";
      if (preparedImage.blob.type) {
        imageType = preparedImage.blob.type;
      }
      preparedImages.push({
        blob: new File([preparedImage.blob], image.name || "image.jpg", { type: imageType }),
        alt: image.alt || "",
        width: preparedImage.width,
        height: preparedImage.height,
      });
    }
    let preparedExternalCard = null;
    if (externalCard) {
      preparedExternalCard = {
        ...externalCard,
        thumb: null,
      };
      if (externalCard.imageDataUrl) {
        preparedExternalCard.thumb = options.dataUrlToFile(externalCard.imageDataUrl, "link-card.jpg");
      }
    }
    preparedSegments.push({ text: segment.text, images: preparedImages, externalCard: preparedExternalCard });
  }
  return preparedSegments;
}

/**
 * Runs the Composer publish workflow with injected application actions.
 * @param {object} options - Busy, progress, preparation, publish and result actions.
 * @returns {Promise<object|null>} Published result or null after a handled failure.
 */
export async function runComposerPublishWorkflow(options = {}) {
  try {
    options.setBusy(true);
    options.showProgress(options.progressTitle, options.connectivityMessage);
    await options.checkConnectivity();
    options.showProgress(options.progressTitle, options.preparingMessage);
    const preparedSegments = await options.prepareSegments();
    const result = await options.publish(preparedSegments);
    options.hideProgress();
    await options.onSuccess(result, preparedSegments);
    return result;
  } catch (error) {
    await options.onError(error);
    return null;
  } finally {
    options.hideProgress();
    options.setBusy(false);
  }
}
/**
 * Normalizes rate-limit metadata received from the service worker.
 * @param {object|null} value - Raw rate-limit metadata.
 * @returns {object|null} Sanitized rate-limit metadata or null when empty.
 */
export function normalizePublishRateLimit(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  let limit = null;
  if (Number.isFinite(Number(value.limit))) {
    limit = Number(value.limit);
  }

  let remaining = null;
  if (Number.isFinite(Number(value.remaining))) {
    remaining = Number(value.remaining);
  }

  const normalized = {
    limit,
    remaining,
    resetAt: String(value.resetAt || "").trim(),
    policy: String(value.policy || "").trim(),
    retryAfter: String(value.retryAfter || "").trim(),
  };

  if (
    normalized.limit === null
    && normalized.remaining === null
    && !normalized.resetAt
    && !normalized.policy
    && !normalized.retryAfter
  ) {
    return null;
  }

  return normalized;
}

/**
 * Presents server publication limits using explicit locale and DOM adapters.
 * @param {HTMLElement|null} publishRateLimitNote - Inline status note.
 * @param {object} options - Translation and timestamp formatting callbacks.
 * @returns {object} Inline renderer and dialog message builder.
 */
export function createComposerRateLimitPresentation(publishRateLimitNote, options) {
  const t = options.translate;
  /**
   * Formats a rate-limit policy header into a short human-readable window label.
   * @param {string} policy - Raw `ratelimit-policy` header value.
   * @returns {string} Localized compact policy description, or an empty string.
   */
  function formatPublishRateLimitPolicy(policy) {
    const normalizedPolicy = String(policy || "").trim();
    if (!normalizedPolicy) {
      return "";
    }

    const windowMatch = normalizedPolicy.match(/(?:^|;)w=(\d+)/i);
    if (!windowMatch) {
      return normalizedPolicy;
    }

    const windowSeconds = Number.parseInt(windowMatch[1], 10);
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
      return normalizedPolicy;
    }

    if (windowSeconds % 86400 === 0) {
      return t("publishRateLimitWindowDays", { count: String(windowSeconds / 86400) });
    }
    if (windowSeconds % 3600 === 0) {
      return t("publishRateLimitWindowHours", { count: String(windowSeconds / 3600) });
    }
    if (windowSeconds % 60 === 0) {
      return t("publishRateLimitWindowMinutes", { count: String(windowSeconds / 60) });
    }

    return t("publishRateLimitWindowSeconds", { count: String(windowSeconds) });
  }

  /**
   * Formats an ISO reset timestamp for the compact publish status note.
   * @param {string} resetAt - ISO timestamp from the last observed rate-limit header.
   * @returns {string} Localized short time, or an empty string.
   */
  function formatPublishRateLimitResetAt(resetAt) {
    const normalizedResetAt = String(resetAt || "").trim();
    if (!normalizedResetAt) {
      return "";
    }

    const parsedResetAt = Date.parse(normalizedResetAt);
    if (!Number.isFinite(parsedResetAt)) {
      return "";
    }

    return options.formatTime(parsedResetAt);
  }

  /**
   * Renders the latest observed server-side rate-limit note below the publish button.
   * @param {object|null} value - Raw or normalized rate-limit metadata.
   * @returns {void} No return value.
   */
  function renderPublishRateLimitNote(value) {
    if (!publishRateLimitNote) {
      return;
    }

    const message = buildPublishRateLimitMessage(value, false);
    if (!message) {
      publishRateLimitNote.hidden = true;
      publishRateLimitNote.textContent = "";
      publishRateLimitNote.dataset.tone = "neutral";
      return;
    }

    publishRateLimitNote.hidden = false;
    publishRateLimitNote.dataset.tone = "neutral";
    publishRateLimitNote.textContent = message;
  }

  /**
   * Builds a compact publish rate-limit line for success dialogs and inline notes.
   * @param {object|null} value - Raw or normalized rate-limit metadata.
   * @param {boolean} includeUnavailable - Whether to return a fallback message when no headers exist.
   * @returns {string} Localized note text, or an empty string when nothing should be shown.
   */
  function buildPublishRateLimitMessage(value, includeUnavailable = false) {
    const rateLimit = normalizePublishRateLimit(value);
    if (!rateLimit) {
      if (includeUnavailable) {
        return t("publishRateLimitUnavailable");
      }
      return "";
    }

    const parts = [];
    if (rateLimit.remaining !== null && rateLimit.limit !== null) {
      parts.push(t("publishRateLimitRemaining", {
        remaining: String(rateLimit.remaining),
        limit: String(rateLimit.limit),
      }));
    } else if (rateLimit.limit !== null) {
      parts.push(t("publishRateLimitLimit", {
        limit: String(rateLimit.limit),
      }));
    }

    const policyLabel = formatPublishRateLimitPolicy(rateLimit.policy);
    if (policyLabel) {
      parts.push(t("publishRateLimitWindow", { value: policyLabel }));
    }

    const resetLabel = formatPublishRateLimitResetAt(rateLimit.resetAt);
    if (resetLabel) {
      parts.push(t("publishRateLimitResetAt", { time: resetLabel }));
    }

    if (!resetLabel && rateLimit.retryAfter) {
      parts.push(t("publishRateLimitRetryAfter", { value: rateLimit.retryAfter }));
    }

    if (parts.length === 0) {
      if (includeUnavailable) {
        return t("publishRateLimitUnavailable");
      }
      return "";
    }

    return t("publishRateLimitLabel", {
      details: parts.join(" · "),
    });
  }
  return { render: renderPublishRateLimitNote, message: buildPublishRateLimitMessage };
}
/**
 * Formats publication failures, including the already-posted count after partial success.
 * @param {object|null} error - Worker failure and optional partial-publish details.
 * @param {Function} translate - Translation callback.
 * @returns {string} User-facing failure message.
 */
export function buildComposerPublishErrorMessage(error, translate) {
  if (error?.details?.code === "PARTIAL_PUBLISH") {
    const summary = translate("publishPartialFailure", { posted: error.details.postedCount, total: error.details.totalCount });
    if (error.message) { return `${summary}\n${error.message}`; }
    return summary;
  }
  return error?.message || translate("errorTitle");
}
/**
 * Coordinates publish validation, confirmation and the existing publication workflow.
 * @param {object} options - Validation, dialog/workflow options and UI presentation adapters.
 * @returns {object} Publish click and preparation-progress handlers.
 */
export function createComposerPublishController(options) {
  /** Runs one validated and confirmed publication. @returns {Promise<void>} Completes after the workflow or cancellation. */
  async function click() {
    const validation = options.validate();
    if (validation.errorKey) {
      if (validation.warnInput) { options.updateInputWarning(false); }
      const message = options.translate(validation.errorKey, { count: options.getLimitLabel() });
      options.setStatus(message, "error");
      if (validation.showDialog) { options.showError(message); }
      return;
    }
    const confirmed = await confirmComposerPublication(options.getConfirmationOptions());
    if (!confirmed) { return; }
    await runComposerPublishWorkflow(options.getWorkflowOptions(validation.segments));
  }
  /** Displays section/image preparation progress. @param {object} progress - Preparation counters. @returns {void} */
  function preparationProgress(progress) {
    let key = "progressPreparingImage";
    let values = { image: progress.imageIndex + 1, imageCount: progress.imageCount, index: progress.segmentIndex + 1 };
    if (progress.type === "segment") {
      key = "progressPreparingSegment";
      values = { index: progress.segmentIndex + 1, count: progress.segmentCount };
    }
    options.showProgress(options.translate("progressTitle"), options.translate(key, values));
  }
  return { click, preparationProgress };
}

/** Resolves the publish button label for a reply, continuation or new thread.
 * @param {object|null} replyTarget - Current reply context. @param {boolean} busy - Request state.
 * @param {Function} translate - Translation callback. @param {string} target - Provider label.
 * @returns {string} Current translated button text.
 */
export function buildComposerPublishButtonLabel(replyTarget, busy, translate, target) {
  if (replyTarget?.mode === "thread") {
    if (busy) { return translate("publishBusyThreadContinuation"); }
    return translate("publishButtonThreadContinuation");
  }
  if (replyTarget?.mode === "post") {
    if (busy) { return translate("publishBusyReplyTarget"); }
    return translate("publishButtonReplyTarget");
  }
  if (busy) { return translate("publishBusyTarget", { target }); }
  return translate("publishButtonTarget", { target });
}
