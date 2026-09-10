/**
 * Default interaction settings used for newly composed posts.
 * @type {{replyMode: string, allowFollowers: boolean, allowFollowing: boolean, allowMentioned: boolean, quotePostsAllowed: boolean}}
 */
export const DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS = Object.freeze({
  replyMode: "everyone",
  allowFollowers: false,
  allowFollowing: false,
  allowMentioned: false,
  quotePostsAllowed: true,
});

/**
 * Normalizes raw Composer interaction settings to the supported posting values.
 * @param {object} value - Raw stored or imported interaction settings.
 * @returns {{replyMode: string, allowFollowers: boolean, allowFollowing: boolean, allowMentioned: boolean, quotePostsAllowed: boolean}} Normalized interaction settings.
 */
export function normalizeComposerPostInteractionSettings(value = {}) {
  let replyMode = DEFAULT_COMPOSER_POST_INTERACTION_SETTINGS.replyMode;
  if (["everyone", "nobody", "custom"].includes(value.replyMode)) {
    replyMode = value.replyMode;
  }

  return {
    replyMode,
    allowFollowers: value.allowFollowers === true,
    allowFollowing: value.allowFollowing === true,
    allowMentioned: value.allowMentioned === true,
    quotePostsAllowed: value.quotePostsAllowed !== false,
  };
}

/**
 * Builds the localized reply visibility summary for Composer settings.
 * @param {object} settings - Normalized or raw interaction settings.
 * @param {(key: string, values?: object) => string} translate - Translation callback.
 * @returns {string} Human-readable reply visibility summary.
 */
export function getComposerReplyModeSummary(settings = {}, translate) {
  const normalized = normalizeComposerPostInteractionSettings(settings);
  if (normalized.replyMode === "nobody") {
    return translate("replyModeNobody");
  }

  if (normalized.replyMode === "custom") {
    const labels = [];
    if (normalized.allowFollowers) {
      labels.push(translate("replyRuleFollowers"));
    }
    if (normalized.allowFollowing) {
      labels.push(translate("replyRuleFollowing"));
    }
    if (normalized.allowMentioned) {
      labels.push(translate("replyRuleMentioned"));
    }
    if (labels.length > 0) {
      return translate("replyModeCustomSummary", { rules: labels.join(", ") });
    }
    return translate("replyModeNobody");
  }

  return translate("replyModeEveryone");
}

/**
 * Builds the localized disclosure metadata for post language and interaction settings.
 * @param {object} settings - Normalized or raw interaction settings.
 * @param {number} languageCount - Number of selected post languages.
 * @param {(key: string, values?: object) => string} translate - Translation callback.
 * @returns {{languages: string, interactions: string}} Visible disclosure metadata.
 */
export function buildComposerPostSettingsDisclosureMeta(settings = {}, languageCount = 0, translate) {
  const normalized = normalizeComposerPostInteractionSettings(settings);
  const replyMode = getComposerReplyModeSummary(normalized, translate);
  let quotes = translate("quotesAllowedShort");
  if (!normalized.quotePostsAllowed) {
    quotes = translate("quotesBlockedShort");
  }

  return {
    languages: translate("postLanguagesDisclosureSummary", { count: languageCount }),
    interactions: translate("postInteractionDisclosureSummary", { replyMode, quotes }),
  };
}
