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
