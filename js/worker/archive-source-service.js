/** Creates the archive source-profile resolver with explicit authenticated transport.
 * @param {object} options - Request and XRPC-base adapters.
 * @param {Function} options.request - XRPC method/params/transport request.
 * @param {Function} options.base - Resolves the supplied account's XRPC base.
 * @returns {{resolve: Function}} Frozen source API.
 */
globalThis.createThreadlineArchiveSourceService = function createThreadlineArchiveSourceService(options) {
  for (const name of ["request", "base"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive source service requires " + name);
    }
  }
  /** Resolves an explicit archive DID/handle or returns the active account's existing metadata.
   * @param {object} auth - Account with session DID, handle and access token.
   * @param {object} filters - Optional sourceDid/sourceActor; DID takes precedence.
   * @returns {Promise<object>} Source profile and own-account flag; profile failures reject.
   */
  async function resolve(auth, filters = {}) {
    const sourceDid = String(filters?.sourceDid || "").trim();
    const sourceActor = String(filters?.sourceActor || "").trim();
    const actor = sourceDid || sourceActor;
    if (!actor) {
      let metadata = globalThis.ThreadlineProfileMetadata.normalize(auth);
      try {
        const profile = await options.request("app.bsky.actor.getProfile", { actor: auth.session.did }, {
          headers: { authorization: `Bearer ${auth.session.accessJwt}` }, base: options.base(auth),
        });
        if (profile) { metadata = globalThis.ThreadlineProfileMetadata.normalize(profile); }
      } catch {
        // Existing local profile data remains usable for offline archive work.
      }
      return {
        did: auth.session.did, handle: auth.session.handle, displayName: auth.session.handle,
        avatar: auth.avatar || "", isOwnAccount: true,
        ...metadata,
      };
    }
    const profile = await options.request("app.bsky.actor.getProfile", { actor }, {
      headers: { authorization: `Bearer ${auth.session.accessJwt}` }, base: options.base(auth),
    });
    const did = String(profile?.did || "").trim();
    return {
      did, handle: String(profile?.handle || sourceActor || sourceDid).trim(),
      displayName: String(profile?.displayName || profile?.handle || sourceActor || sourceDid).trim(),
      avatar: String(profile?.avatar || "").trim(), isOwnAccount: did === auth.session.did,
      ...globalThis.ThreadlineProfileMetadata.normalize(profile),
    };
  }
  return Object.freeze({ resolve });
};
