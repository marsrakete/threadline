/** Creates the shared persisted account-avatar cache service.
 * @param {object} options - download, extension and epoch-millisecond now adapters plus ttlMs.
 * @returns {object} Frozen normalize/prune/cache API preserving account and byte identities.
 */
globalThis.createThreadlineAccountAvatarCache = function createThreadlineAccountAvatarCache(options) {
  for (const name of ['download','extension','now']) { if (typeof options?.[name] !== 'function') { throw new TypeError('Account avatar cache requires ' + name); } }
  if (!Number.isFinite(options.ttlMs) || options.ttlMs < 0) { throw new TypeError('Account avatar cache requires nonnegative ttlMs'); }
  const { download: downloadRemoteAssetViaBlob, extension: getAssetExtensionFromMimeType, ttlMs: ACCOUNT_AVATAR_CACHE_TTL_MS } = options;
  /** Normalizes stored avatar byte records and removes incomplete entries. @param {Array} assets - Raw cache records. @returns {Array} Normalized records. */
  function normalizeAccountAvatarAssets(assets = []) {
    return (Array.isArray(assets) ? assets : [])
      .map((asset) => ({
        did: String(asset?.did || ""),
        url: String(asset?.url || ""),
        path: String(asset?.path || ""),
        type: String(asset?.type || "application/octet-stream"),
        sizeBytes: Number(asset?.sizeBytes) || 0,
        cachedAt: Number(asset?.cachedAt) || options.now(),
        bytes: asset?.bytes instanceof Uint8Array ? asset.bytes : new Uint8Array(asset?.bytes || []),
      }))
      .filter((asset) => asset.did && asset.url && asset.path && asset.bytes.length > 0);
  }

  /** Applies the configured TTL to a stored avatar cache. @param {object|null} cache - Stored cache. @param {number} now - Optional clock override. @returns {object} Pruned cache. */
  function pruneAccountAvatarCache(cache = null, now = options.now()) {
    const assets = normalizeAccountAvatarAssets(cache?.assets)
      .filter((asset) => now - asset.cachedAt <= ACCOUNT_AVATAR_CACHE_TTL_MS);
    return {
      ...cache,
      assets,
      updatedAt: cache?.updatedAt || new Date(now).toISOString(),
    };
  }

  /** Reuses or downloads the current account avatar. @param {object} account - Account metadata. @param {Array} assets - Existing assets. @param {object|null} serviceCache - Native service cache. @returns {Promise<object>} Updated account and cache assets. */
  async function cacheStoredAccountAvatar(account = {}, assets = null, serviceCache = null) {
    const did = String(account?.did || "").trim();
    const avatarCandidate = typeof account?.avatar === "string" ? account.avatar.trim() : "";
    const avatarUrl = /^\[object(?:\s+[^\]]+)?\]$/i.test(avatarCandidate) ? "" : avatarCandidate;
    if (!did || !avatarUrl) {
      return {
        account: {
          ...account,
          avatarPath: "",
        },
        assets: normalizeAccountAvatarAssets(assets),
      };
    }

    const nextAssets = normalizeAccountAvatarAssets(assets);
    const existing = nextAssets.find((asset) => asset.did === did && asset.url === avatarUrl);
    if (existing?.path) {
      return {
        account: {
          ...account,
          avatarPath: existing.path,
        },
        assets: nextAssets,
      };
    }

    const blob = await downloadRemoteAssetViaBlob(account, avatarUrl, did, serviceCache);
    const extension = getAssetExtensionFromMimeType(blob.type);
    const slug = String(account.handle || account.identifier || did)
      .replace(/[^\w.-]+/g, "-")
      .slice(0, 60) || "account";
    const path = `account-avatars/${slug}.${extension}`;
    const filteredAssets = nextAssets.filter((asset) => !(asset.did === did));
    filteredAssets.push({
      did,
      url: avatarUrl,
      path,
      type: blob.type,
      sizeBytes: blob.bytes.length,
      cachedAt: options.now(),
      bytes: blob.bytes,
    });
    return {
      account: {
        ...account,
        avatarPath: path,
      },
      assets: filteredAssets,
    };
  }


  return Object.freeze({ normalize: normalizeAccountAvatarAssets, prune: pruneAccountAvatarCache, cache: cacheStoredAccountAvatar });
};
