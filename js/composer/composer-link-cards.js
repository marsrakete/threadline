/**
 * Normalizes one link-card slot for every Composer segment.
 * @param {Array<object|null>} cards - Raw link-card values.
 * @param {(card: object|null) => object|null} normalizeCard - Link-card normalization function.
 * @returns {Array<object|null>} Normalized link-card slots.
 */
export function normalizeComposerSegmentLinkCards(cards, normalizeCard) {
  return (Array.isArray(cards) ? cards : []).map((card) => normalizeCard(card));
}

/**
 * Normalizes one Composer link card for storage and rendering.
 * @param {object|null} card - Raw link-card value.
 * @param {(value: object|null) => object|null} normalizeStandardSite - Standard.site normalizer.
 * @param {string} createdAtFallback - Timestamp used when the card has none.
 * @returns {object|null} Normalized link card or null when the URL is invalid.
 */
export function normalizeComposerLinkCard(card = null, normalizeStandardSite = () => null, createdAtFallback = new Date().toISOString()) {
  if (!card || typeof card !== "object") {
    return null;
  }
  const url = String(card.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  return {
    url,
    title: String(card.title || url).trim().slice(0, 300),
    description: String(card.description || "").trim().slice(0, 1000),
    imageUrl: String(card.imageUrl || "").trim(),
    imageDataUrl: String(card.imageDataUrl || "").trim(),
    imageMimeType: String(card.imageMimeType || "").trim(),
    standardSite: normalizeStandardSite(card.standardSite),
    createdAt: String(card.createdAt || createdAtFallback),
  };
}
