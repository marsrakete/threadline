/**
 * Hydrates Thread Explorer media through the worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {object} root - Thread Explorer root to hydrate.
 * @param {object} options - Worker request options such as timeout and abort signal.
 * @returns {Promise<object>} Hydrated media response.
 */
export function requestThreadExplorerMediaHydration(request, root, options = {}) {
  return request("HYDRATE_THREAD_EXPLORER_MEDIA", { root }, options);
}
