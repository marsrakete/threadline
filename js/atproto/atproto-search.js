/**
 * Loads one search result page through the ATProto worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {object} payload - Normalized search payload including cursor and filters.
 * @param {object} options - Worker request options such as progress handling.
 * @returns {Promise<object>} Search result page from the worker.
 */
export function requestSearchResults(request, payload, options = {}) {
  return request("LOAD_SEARCH_RESULTS", payload, options);
}
