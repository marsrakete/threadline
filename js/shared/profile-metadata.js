/** Shared normalization for public Bluesky profile metadata in pages and classic workers. */
globalThis.ThreadlineProfileMetadata = (() => {
  /** Accepts HTTP(S) destinations without embedded credentials. @param {unknown} value - URL input. @returns {string} Safe destination or empty string. */
  function webUrl(value) {
    if (typeof value !== "string") { return ""; }
    try {
      const url = new URL(value.trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) { return ""; }
      return url.href;
    } catch { return ""; }
  }

  /** Preserves supplied fields and absence separately for partial profile updates. @param {object|null} profile - API or stored profile. @returns {object} Present pronouns, website and ordered links. */
  function normalize(profile) {
    if (!profile || typeof profile !== "object") { return {}; }
    const result = {};
    if (Object.hasOwn(profile, "pronouns")) {
      result.pronouns = typeof profile.pronouns === "string" ? profile.pronouns.trim() : "";
    }
    if (Object.hasOwn(profile, "website")) { result.website = webUrl(profile.website); }
    if (Object.hasOwn(profile, "links")) {
      result.links = [];
      for (const link of Array.isArray(profile.links) ? profile.links : []) {
        const url = webUrl(link?.url);
        if (!url) { continue; }
        result.links.push({ ...link, url, title: typeof link.title === "string" ? link.title.trim() : "" });
      }
    }
    return result;
  }

  /** Returns ordered profile links with the deprecated website as a fallback. @param {object|null} profile - Profile metadata. @returns {object[]} Safe links for rendering. */
  function links(profile) {
    const metadata = normalize(profile);
    if (metadata.links?.length) { return metadata.links; }
    if (metadata.website) { return [{ url: metadata.website, title: "" }]; }
    return [];
  }
  return Object.freeze({ normalize, links });
})();
