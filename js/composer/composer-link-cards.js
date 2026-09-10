/**
 * Normalizes one link-card slot for every Composer segment.
 * @param {Array<object|null>} cards - Raw link-card values.
 * @param {(card: object|null) => object|null} normalizeCard - Link-card normalization function.
 * @returns {Array<object|null>} Normalized link-card slots.
 */
export function normalizeComposerSegmentLinkCards(cards, normalizeCard) {
  return (Array.isArray(cards) ? cards : []).map((card) => normalizeCard(card));
}
