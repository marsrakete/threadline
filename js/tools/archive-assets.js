/**
 * Creates archive and DM avatar-asset hydration with explicit state and IO.
 * @param {object} dependencies - State and binary asset adapters.
 * @param {Function} dependencies.state - Reads accounts, active DID and handle.
 * @param {Function} dependencies.partner - Resolves the primary DM partner.
 * @param {Function} dependencies.download - Downloads one avatar as MIME type and bytes.
 * @param {Function} dependencies.extension - Maps response MIME type to the existing avatar suffix.
 * @returns {{archive: Function, dm: Function}} In-place catalog avatar hydration.
 */
export function createArchiveAvatarAssets(dependencies) {
  for (const name of ["state", "partner", "download", "extension"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Avatar assets require ${name}.`);
    }
  }
  /**
   * Adds missing post avatar assets, reusing URLs within one hydration pass.
   * @param {object|null} catalog - Mutable archive posts and assets.
   * @param {object} settings - Set downloadMissing to false for exports that only use archived assets.
   * @returns {Promise<object|null>} Same catalog; failed downloads leave an empty avatar path.
   */
  async function ensureArchiveAvatarAssets(catalog, settings = {}) {
    if (!catalog) {
      return catalog;
    }
    if (!Array.isArray(catalog.assets)) {
      catalog.assets = [];
    }
    const existingPaths = new Set(catalog.assets.map(asset => asset.path));
    const pathByUrl = new Map();
    const state = dependencies.state();
    const selfAccount = state.accounts.find(account => account.did && account.did === state.did) || state.accounts.find(account => account.handle && account.handle === state.handle) || null;
    for (const post of catalog.posts || []) {
      if (!post.authorAvatar && post.authorDid && selfAccount?.avatar && post.authorDid === selfAccount.did) {
        post.authorAvatar = selfAccount.avatar;
      }
      if (!post.authorAvatarPath && post.authorAvatar && pathByUrl.has(post.authorAvatar)) {
        post.authorAvatarPath = pathByUrl.get(post.authorAvatar) || "";
        continue;
      }
      if (post.authorAvatarPath || !post.authorAvatar || settings.downloadMissing === false) {
        continue;
      }
      try {
        const blob = await dependencies.download(post.authorAvatar);
        const extension = dependencies.extension(blob.type);
        const slug = String(post.authorHandle || post.authorDid || "author").replace(/[^\w.-]+/g, "-").slice(0, 60) || "author";
        const path = `avatars/${slug}.${extension}`;
        pathByUrl.set(post.authorAvatar, path);
        post.authorAvatarPath = path;
        if (!existingPaths.has(path)) {
          existingPaths.add(path);
          catalog.assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes
          });
        }
      } catch {
        pathByUrl.set(post.authorAvatar, "");
        post.authorAvatarPath = "";
      }
    }
    return catalog;
  }

  /**
   * Propagates existing self/partner/member avatar paths into DM sender records.
   * @param {object|null} catalog - Mutable DM manifest, contacts, conversations, messages and assets.
   * @returns {Promise<object|null>} Same catalog with existing avatar paths; no network downloads.
   */
  async function ensureDmAvatarAssets(catalog) {
    if (!catalog) {
      return catalog;
    }
    if (!Array.isArray(catalog.assets)) {
      catalog.assets = [];
    }
    const selfDid = catalog?.manifest?.account?.did || dependencies.state().did || "";
    const selfAvatarPath = catalog?.manifest?.account?.avatarPath || "";
    const partner = dependencies.partner(catalog);
    let recentContacts = [];
    if (Array.isArray(catalog.recentContacts)) {
      recentContacts = catalog.recentContacts;
    }
    const recentByDid = new Map(recentContacts.map(entry => [entry.did, entry]));
    const memberByDid = new Map();
    (catalog.conversations || []).forEach(convo => {
      (convo.members || []).forEach(member => {
        if (member?.did && !memberByDid.has(member.did)) {
          memberByDid.set(member.did, member);
        }
      });
    });
    if (partner?.did) {
      const recent = recentByDid.get(partner.did);
      const mergedPath = partner.avatarPath || recent?.avatarPath || memberByDid.get(partner.did)?.avatarPath || "";
      if (mergedPath) {
        partner.avatarPath = mergedPath;
        if (recent) {
          recent.avatarPath = mergedPath;
        }
        const member = memberByDid.get(partner.did);
        if (member) {
          member.avatarPath = mergedPath;
        }
      }
    }
    (catalog.messages || []).forEach(entry => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      if (entry.senderDid === selfDid && selfAvatarPath) {
        entry.senderAvatarPath = entry.senderAvatarPath || selfAvatarPath;
        return;
      }
      const member = memberByDid.get(entry.senderDid) || recentByDid.get(entry.senderDid);
      if (member?.avatarPath && !entry.senderAvatarPath) {
        entry.senderAvatarPath = member.avatarPath;
      }
    });
    return catalog;
  }
  return {
    archive: ensureArchiveAvatarAssets,
    dm: ensureDmAvatarAssets
  };
}
