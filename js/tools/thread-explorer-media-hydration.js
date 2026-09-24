/**
 * Hydrates Thread Explorer media through injected transport and result handlers.
 * @param {object|null} root - Thread Explorer root node.
 * @param {object} options - Request, progress, abort and result callbacks.
 * @returns {Promise<object|null>} Service-worker result or null when unavailable.
 */
export async function hydrateThreadExplorerMedia(root = null, options = {}) {
  if (!root) {
    return null;
  }
  if (typeof options.throwIfAborted === "function") {
    options.throwIfAborted(options.signal || null);
  }
  if (typeof options.request !== "function") {
    return null;
  }

  const result = await options.request(root, {
    timeoutMs: options.timeoutMs || 420000,
    signal: options.signal || null,
    onProgress(progress) {
      if (typeof options.onProgress !== "function") {
        return;
      }
      options.onProgress(progress);
    },
  }).catch((error) => {
    if (error?.name === "AbortError") {
      throw error;
    }
    if (typeof options.onError === "function") {
      options.onError(error);
    }
    return null;
  });

  if (result?.media && typeof options.onMedia === "function") {
    options.onMedia(result.media);
  }
  return result;
}
