/**
 * Splits raw hashtag input into normalized tag names without leading hash signs.
 * @param {string} value - Raw input from the hashtag field.
 * @returns {string[]} Normalized hashtag names.
 */
export function parseSearchTags(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((entry) => {
      return String(entry || "").trim().replace(/^#+/, "");
    })
    .filter(Boolean);
}

/**
 * Splits a shared Bluesky query into positive text and excluded terms.
 * @param {string} value - Raw `q` value from a shared search URL.
 * @returns {{query: string, excludeText: string}} Positive query and excluded terms.
 */
export function splitSharedSearchQuery(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      query: "",
      excludeText: "",
    };
  }

  const excludeValues = [];
  const query = raw.replace(/(?:^|\s)-(?:"([^"]+)"|(\S+))/g, (match, quotedValue, plainValue) => {
    const nextValue = String(quotedValue || plainValue || "").trim();
    if (nextValue) {
      excludeValues.push(nextValue);
    }
    return " ";
  }).replace(/\s{2,}/g, " ").trim();

  return {
    query,
    excludeText: excludeValues.join(", "),
  };
}

/**
 * Wraps one search summary value in double quotes for clearer UI text.
 * @param {string} value - Plain text value from the search form.
 * @returns {string} Quoted display value.
 */
export function quoteSearchSummaryValue(value = "") {
  return `"${String(value || "").trim()}"`;
}

/**
 * Splits one positive search query into quoted phrases or single terms.
 * @param {string} value - Raw query text from the search form.
 * @returns {string[]} Normalized search terms.
 */
export function parseSearchQueryTerms(value = "") {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return [];
  }

  const terms = [];
  const matcher = /"([^"]+)"|(\S+)/g;
  let match = matcher.exec(rawValue);
  while (match) {
    const nextValue = String(match[1] || match[2] || "").trim();
    if (nextValue) {
      terms.push(nextValue);
    }
    match = matcher.exec(rawValue);
  }
  return [...new Set(terms)];
}

/**
 * Escapes one search token for safe regular-expression usage.
 * @param {string} value - Raw token text.
 * @returns {string} Regex-safe token text.
 */
export function escapeSearchHighlightRegex(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
