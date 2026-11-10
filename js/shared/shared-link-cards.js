/**
 * Returns the first http(s) URL found in plain text.
 * @param {string} text - Source text that may contain one URL.
 * @returns {string} First detected URL or an empty string.
 */
function getFirstHttpUrl(text) {
  return String(text || "").match(/https?:\/\/[^\s<>"')\]]+/i)?.[0]?.replace(/[.,;:!?]+$/, "") || "";
}

/**
 * Normalizes one manually entered link-card target URL to a safe absolute http(s) URL.
 * @param {string} rawUrl - Raw URL from the composer text or dialog input.
 * @returns {string} Normalized absolute http(s) URL, or an empty string when invalid.
 */
function normalizeLinkCardTargetUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }
  if (/^ttps:\/\//i.test(value)) {
    return `h${value}`;
  }
  if (/^\/\//.test(value)) {
    return `https:${value}`;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:\/|$)/i.test(value)) {
    return `https://${value}`;
  }
  return "";
}

/**
 * Validates and normalizes one link-card target URL.
 * @param {string} rawUrl - Raw URL from the dialog input.
 * @param {(key: string) => string} translate - Translation callback for validation messages.
 * @returns {{ok: boolean, url: string, message: string}} Validation state and normalized URL.
 */
function validateLinkCardTargetUrl(rawUrl, translate) {
  const originalValue = String(rawUrl || "").trim();
  const normalizedUrl = normalizeLinkCardTargetUrl(originalValue);
  if (!originalValue) {
    return {
      ok: false,
      url: "",
      message: translate("linkCardUrlMissing"),
    };
  }
  if (!normalizedUrl) {
    return {
      ok: false,
      url: "",
      message: translate("linkCardUrlInvalid"),
    };
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        ok: false,
        url: "",
        message: translate("linkCardUrlInvalid"),
      };
    }
  } catch {
    return {
      ok: false,
      url: "",
      message: translate("linkCardUrlInvalid"),
    };
  }

  return {
    ok: true,
    url: normalizedUrl,
    message: "",
  };
}

/**
 * Builds a metadata-free link card from URL fields without making a request.
 * @param {string} url - Target URL passed to the supplied normalizer.
 * @param {Function} normalizeCard - Domain-specific card normalizer.
 * @returns {object|null} Normalized basic card.
 */
export function buildBasicLinkCard(url, normalizeCard) {
  let title = url;
  let description = "";
  try {
    const parsed = new URL(url);
    title = parsed.hostname || url;
    description = parsed.toString();
  } catch {
    title = url;
  }
  return normalizeCard({ url, title, description });
}

export {
  getFirstHttpUrl,
  normalizeLinkCardTargetUrl,
  validateLinkCardTargetUrl,
};
/**
 * Creates, refreshes, or moves the currently pending segment link card.
 * @param {Function} translate - Translation callback.
 * @returns {Promise<void>}
 */
async function createLinkCardForPendingSegment() {
  await composerLinkCardSubmission.submit();
}

/**
 * Normalizes Standard.site publication metadata attached to a link card.
 * @param {object|null} value - Raw metadata from the proxy, archive, or Bluesky view.
 * @param {Function} translate - Translation callback.
 * @returns {object|null} Compact Standard.site metadata, or null when absent.
 */
export function normalizeStandardSiteMetadata(value = null, translate) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const documentUri = String(value.documentUri || value.document || "").trim();
  const publicationUri = String(value.publicationUri || value.publication || "").trim();
  const publicationUrl = String(value.publicationUrl || value.url || "").trim();
  const publicationName = String(value.publicationName || value.name || "").trim().slice(0, 160);
  if (!documentUri && !publicationUri && !publicationUrl && !publicationName) {
    return null;
  }

  return {
    documentUri,
    publicationUri,
    publicationUrl,
    publicationName,
    publicationVerified: value.publicationVerified === true,
    ctaLabel: String(value.ctaLabel || translate("publicationCardCta")).trim().slice(0, 80),
  };
}
/**
 * Returns the footer label for a card that carries Standard.site publication metadata.
 * @param {object|null} standardSite - Normalized Standard.site metadata.
 * @param {Function} translate - Translation callback.
 * @returns {string} Localized footer suffix, or an empty string for normal link cards.
 */
export function getPublicationCardFooterLabel(standardSite, translate) {
  if (!standardSite) {
    return "";
  }

  return translate("publicationMetadataDetected");
}
