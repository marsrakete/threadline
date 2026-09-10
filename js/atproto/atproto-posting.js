/**
 * Requests that the active account likes one post through the ATProto worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {{uri: string, cid: string}} post - Post reference to like.
 * @returns {Promise<object>} Created like record from the worker.
 */
export function requestPostLike(request, post) {
  return request("LIKE_POST", {
    uri: String(post?.uri || "").trim(),
    cid: String(post?.cid || "").trim(),
  });
}

/**
 * Requests that the active account removes its like from one post through the ATProto worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {string} likeUri - AT URI of the like record to delete.
 * @returns {Promise<object>} Worker response after the like was removed.
 */
export function requestPostUnlike(request, likeUri) {
  return request("UNLIKE_POST", {
    likeUri: String(likeUri || "").trim(),
  });
}

/**
 * Publishes prepared thread segments through the ATProto worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {object} payload - Prepared publish payload with segments, languages and interaction settings.
 * @param {object} options - Worker request options such as progress handling.
 * @returns {Promise<object>} Published-thread result from the worker.
 */
export function requestThreadPublish(request, payload, options = {}) {
  return request("PUBLISH_THREAD", payload, options);
}

/**
 * Resolves a reply target through the ATProto worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {string} url - Public post URL to resolve.
 * @param {string} mode - Requested reply mode.
 * @returns {Promise<object>} Reply target data from the worker.
 */
export function requestReplyTarget(request, url, mode) {
  return request("CHECK_REPLY_TARGET", {
    url: String(url || "").trim(),
    mode: String(mode || "post").trim(),
  });
}
