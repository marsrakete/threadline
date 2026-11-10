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

/**
 * Coordinates snapshot media hydration and maps worker counters to translated progress.
 * @param {object|null} root - Thread root whose images should be hydrated.
 * @param {object} options - Request, abort, translation, progress, error and media-result adapters.
 * @returns {Promise<void>} Resolves when best-effort media hydration finishes.
 */
export async function hydrateThreadExplorerSnapshotMedia(root = null, options = {}) {
  await hydrateThreadExplorerMedia(root, {
    signal: options.signal || null,
    request: options.request,
    throwIfAborted: options.throwIfAborted,
    onError: options.onError,
    onMedia: options.onMedia,
    /** Maps worker media progress to the snapshot's progress range.
     * @param {object} progress - Worker phase and counters.
     * @returns {void}
     */
    onProgress(progress) {
      if (progress?.phase !== "thread_explorer_media") {
        return;
      }
      const total = Math.max(0, Number(progress.total) || 0);
      const current = Math.max(0, Number(progress.current) || 0);
      const remaining = Math.max(0, Number(progress.remaining) || 0);
      let percent = 18;
      if (total > 0) {
        percent = 18 + (current / total * 9);
      }
      void options.onProgress({
        percent,
        step: options.translate("threadExplorerSnapshotProgressMedia"),
        detail: options.translate("threadExplorerSnapshotProgressMediaDownloadDetail", {
          current, total, remaining, hydrated: Number(progress.hydrated) || 0, skipped: Number(progress.skipped) || 0,
          cacheHits: Number(progress.cacheHits) || 0, downloaded: Number(progress.downloaded) || 0, concurrency: Number(progress.concurrency) || 0,
        }),
      });
    },
  });
}
