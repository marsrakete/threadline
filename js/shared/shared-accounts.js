const DEFAULT_AVATAR_SVG = '<svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="none" xmlns="http://www.w3.org/2000/svg" data-testid="userAvatarFallback"><circle cx="12" cy="12" r="12" fill="#0070ff"></circle><circle cx="12" cy="9.5" r="3.5" fill="#fff"></circle><path stroke-linecap="round" stroke-linejoin="round" fill="#fff" d="M 12.058 22.784 C 9.422 22.784 7.007 21.836 5.137 20.262 C 5.667 17.988 8.534 16.25 11.99 16.25 C 15.494 16.25 18.391 18.036 18.864 20.357 C 17.01 21.874 14.64 22.784 12.058 22.784 Z"></path></svg>';

const DEFAULT_AVATAR_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;
/**
 * Resolves a saved account avatar by stored path, DID, original URL or remote fallback.
 * @param {object} account - Account identity, remote URL and optional stored avatar path.
 * @param {object[]} assets - Current cached account-avatar assets.
 * @param {Function} dataUri - Converts a cached asset into a Data URL.
 * @returns {string} Embedded or remote avatar URL; fallback matches update account.avatarPath.
 */
export function resolveStoredAccountAvatar(account = {}, assets = [], dataUri) {
  let source = [];
  if (Array.isArray(assets)) {
    source = assets;
  }
  const avatarPath = String(account?.avatarPath || "").trim();
  if (avatarPath) {
    const asset = source.find((entry) => entry.path === avatarPath);
    if (asset) {
      return dataUri(asset);
    }
  }
  const avatarCandidate = typeof account?.avatar === "string" ? account.avatar.trim() : "";
  const avatarUrl = /^\[object(?:\s+[^\]]+)?\]$/i.test(avatarCandidate) ? "" : avatarCandidate;
  const fallbackAsset = source.find((entry) =>
    (account?.did && entry.did === account.did) || (avatarUrl && entry.url === avatarUrl));
  if (fallbackAsset) {
    account.avatarPath = fallbackAsset.path;
    return dataUri(fallbackAsset);
  }
  return avatarUrl;
}

/**
 * Applies an account avatar URL to an image with the Bluesky-style fallback.
 * @param {HTMLImageElement|null} image - Target image element.
 * @param {string} avatarUrl - Optional remote avatar URL.
 * @param {string} altText - Accessible fallback text for the image.
 * @returns {void}
 */
function setAvatarImage(image, avatarUrl, altText) {
  if (!image) {
    return;
  }

  const avatarCandidate = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
  const normalizedUrl = /^\[object(?:\s+[^\]]+)?\]$/i.test(avatarCandidate) ? "" : avatarCandidate;
  image.alt = String(altText || "").trim();
  image.onerror = () => {
    image.onerror = null;
    image.src = DEFAULT_AVATAR_URI;
  };
  if (normalizedUrl) {
    image.src = normalizedUrl;
  } else {
    image.src = DEFAULT_AVATAR_URI;
  }
}

export {
  DEFAULT_AVATAR_SVG,
  DEFAULT_AVATAR_URI,
  setAvatarImage,
};

/** Resolves saved-account visual state. @param {object} account - Session/password flags. @param {object} state - Online and active DID. @returns {string} UI state. */
export function getSavedAccountVisualState(account, state) {
  if (!state.online && account.hasSession) { return "offline"; }
  if (account.did && account.did === state.did && account.hasSession) { return "active"; }
  if (account.hasSession) { return "available"; }
  return "signed-out";
}

/**
 * Renders saved account controls from the existing sidebar template.
 * @param {object} elements - Panel, list and item template.
 * @param {object} options - State, avatar, translation and account-action adapters.
 * @returns {object} Render operation.
 */
export function createSavedAccountRenderer(elements, options) {
  /** Renders the current account list and binds independent item actions. @returns {void} */
  function render() {
    const state = options.getState(); elements.list.replaceChildren();
    elements.panel.hidden = !state.accounts.length;
    for (const account of state.accounts) {
      const visual = getSavedAccountVisualState(account, state);
      const fragment = elements.template.content.cloneNode(true);
      const item = fragment.querySelector(".account-chip-wrap"); const button = fragment.querySelector(".account-chip");
      const auth = fragment.querySelector(".account-chip-action"); const remove = fragment.querySelector(".account-chip-remove");
      item.classList.add(`is-${visual}`); button.classList.add(`is-${visual}`); button.disabled = !account.did;
      const needsLogin = !account.hasStoredPassword && !account.hasSession;
      if (needsLogin) { button.classList.add("is-needs-login"); }
      const label = account.handle || account.identifier || "account";
      fragment.querySelector(".account-chip-label").textContent = label;
      options.setAvatar(fragment.querySelector("img"), options.avatar(account), label);
      const stateKeys = { offline: "accountStateOffline", active: "accountStateActive", available: "accountStateAvailable", "signed-out": "accountStateSignedOut" };
      const title = [account.handle || account.identifier || "", account.service || "", options.t(stateKeys[visual])];
      if (needsLogin) { title.push(options.t("accountNeedsLoginShort")); }
      button.title = title.filter(Boolean).join(" \u00b7 ");
      let authKey = "accountSignOutButton";
      let authClass = "is-logout";
      let path = "M14 17l-1.4-1.4 2.6-2.6H4v-2h11.2l-2.6-2.6L14 7l5 5-5 5zM20 24h-8v-2h8V2h-8V0h8c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2z";
      if (visual === "signed-out") {
        authKey = "accountSignInButton"; authClass = "is-login";
        path = "M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zm-6 7h8v-2H4V2h8V0H4C2.9 0 2 .9 2 2v20c0 1.1.9 2 2 2z";
      }
      auth.classList.add(authClass); auth.setAttribute("aria-label", options.t(authKey, { account: label }));
      auth.title = options.t(authKey, { account: label }); auth.querySelector("path").setAttribute("d", path);
      remove.setAttribute("aria-label", options.t("removeAccountButton", { account: label })); remove.title = options.t("removeAccountButton", { account: label });
      options.bind({ accountButton: button, authActionButton: auth, removeButton: remove }, {
        accountClick: () => options.actions.select(account), authActionClick: () => options.actions.toggle(account, visual), removeClick: () => options.actions.remove(account),
      });
      elements.list.append(fragment);
    }
  }
  return { render };
}



/** Builds two initials from display name, handle or identifier.
 * @param {object|null} profile - Profile identity.
 * @returns {string} Uppercase initials or a question mark.
 */
export function getProfileInitials(profile) {
  const source = String(profile?.displayName || profile?.handle || profile?.identifier || "?").replace(/^@/, "").trim();
  return source.slice(0, 2).toUpperCase();
}

/** Combines distinct display name and handle for an account label.
 * @param {object|null} profile - Profile identity.
 * @returns {string} Display label, DID fallback or an empty string.
 */
export function getProfileLabel(profile) {
  const name = String(profile?.displayName || profile?.handle || profile?.did || "").trim();
  const handle = String(profile?.handle || "").trim();
  if (name && handle && name.toLowerCase() !== handle.toLowerCase()) {
    return `${name} @${handle}`;
  }
  if (handle) {
    return `@${handle}`;
  }
  return name || String(profile?.did || "").trim();
}
