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

export {
  getFirstHttpUrl,
  normalizeLinkCardTargetUrl,
  validateLinkCardTargetUrl,
};
