/**
 * Switches the active ATProto account through the worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {string} did - DID of the account to activate.
 * @returns {Promise<object>} Updated authentication state.
 */
export function requestAccountSwitch(request, did) {
  return request("SWITCH_ACCOUNT", { did: String(did || "").trim() });
}

/**
 * Signs one saved account out through the worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {string} did - DID of the account to sign out.
 * @returns {Promise<object>} Updated authentication state.
 */
export function requestAccountLogout(request, did) {
  return request("LOGOUT", { did: String(did || "").trim() });
}

/**
 * Removes one saved account through the worker.
 * @param {(type: string, payload?: object, options?: object) => Promise<object>} request - Worker request bridge.
 * @param {string} did - DID of the account to remove.
 * @returns {Promise<object>} Updated authentication state.
 */
export function requestAccountRemoval(request, did) {
  return request("REMOVE_ACCOUNT", { did: String(did || "").trim() });
}
