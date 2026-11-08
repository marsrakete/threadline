/** Creates stored setting/draft field normalization with explicit publication metadata and clock.
* @param {object} options - Standard.site normalizer and ISO clock.
* @returns {object} Frozen card/cards/proxy/provider/usage/search/overrides/history/reply/explorer/resize/expert API.
*/
globalThis.createThreadlineSettingsModels = function createThreadlineSettingsModels(options) {
  for (const name of ["site", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Settings models require " + name);
    }
  }
  const { site: normalizeStandardSiteMetadata, now } = options;
  /** Returns an array or an empty one. @param {unknown} value - Input. @returns {Array} Array. */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Returns an object or null. @param {unknown} value - Input. @returns {object|null} Object. */
  function objectOrNull(value) {
    if (value && typeof value === "object") {
      return value;
    }
    return null;
  }
  /** Reads a string field. @param {object} entry - Input. @param {string} key - Field. @param {boolean} trim - Trim flag. @returns {string} String. */
  function stringField(entry, key, trim) {
    if (typeof entry?.[key] !== "string") {
      return "";
    }
    if (trim) {
      return entry[key].trim();
    }
    return entry[key];
  }
  /** Normalizes the existing stored card contract. @param {unknown} card - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeLinkCard(card = null) {
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
      standardSite: normalizeStandardSiteMetadata(card.standardSite),
      createdAt: String(card.createdAt || now()),
    };
  }

  /** Normalizes the existing stored cards contract. @param {unknown} cards - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeSegmentLinkCards(cards = []) {
    return arrayOrEmpty(cards).map((card) => normalizeLinkCard(card));
  }

  /** Normalizes the existing stored proxy contract. @param {unknown} settings - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeLinkCardProxySettings(settings = null) {
    const endpoint = String(settings?.endpoint || "").trim();
    const secret = String(settings?.secret || "").trim();
    let normalizedEndpoint = "";
    if (/^https?:\/\//i.test(endpoint)) {
      normalizedEndpoint = endpoint;
    }
    return {
      endpoint: normalizedEndpoint,
      secret,
    };
  }

  /**
  * Normalizes the persisted link-card provider setting.
  * @param {string} value - Raw provider value.
  * @returns {string} `none`, `proxy`, or `microlink`.
  */
  function normalizeLinkCardProviderSetting(value) {
    if (value === "proxy") {
      return "proxy";
    }
    if (value === "microlink") {
      return "microlink";
    }
    return "none";
  }

  /**
  * Normalizes the locally tracked Microlink usage payload.
  * @param {object|null} usage - Raw usage payload from stored settings.
  * @returns {object} Normalized usage object.
  */
  function normalizeLinkCardMicrolinkUsage(usage = null) {
    const date = String(usage?.date || "").trim();
    const count = Math.max(0, Number(usage?.count) || 0);
    return {
      date,
      count,
    };
  }

  /**
  * Normalizes the persisted search result state for reload-safe restore.
  * @param {object|null} value - Raw stored search result state.
  * @returns {object|null} Normalized search result state, or null when absent.
  */
  function normalizeStoredSearchResultState(value = null) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const preferences = objectOrNull(value.preferences);
    const items = arrayOrEmpty(value.items)
    .filter((item) => item && typeof item === "object" && item.post && typeof item.post === "object")
    .slice(0, 50);
    const cursor = String(value.cursor || "").trim();

    if (!preferences || (items.length === 0 && !cursor)) {
      return null;
    }

    return {
      preferences,
      items,
      cursor,
    };
  }

  /** Normalizes the existing stored overrides contract. @param {unknown} segments - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeSegmentOverrides(segments) {
    const normalized = arrayOrEmpty(segments)
    .map((entry) => String(entry || ""))
    .filter((entry) => entry.trim().length > 0);

    if (normalized.length > 0) {
      return normalized;
    }
    return null;
  }

  /** Normalizes the existing stored history contract. @param {unknown} entries - Raw stored input. @returns {unknown} Normalized value. */
  function normalizePostingHistory(entries) {
    const seen = new Set();
    const result = [];

    for (const entry of arrayOrEmpty(entries)) {
      const url = stringField(entry, "url", true);
      const createdAt = stringField(entry, "createdAt", false);
      const account = stringField(entry, "account", true);
      const service = stringField(entry, "service", true);

      if (!url || !createdAt) {
        continue;
      }

      const key = `${url}|${createdAt}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push({
        id: stringField(entry, "id", false) || key,
        url,
        createdAt,
        account,
        service,
        firstSegmentText: stringField(entry, "firstSegmentText", true),
        threadCount: Math.max(1, Number(entry.threadCount) || 1),
        imageCount: Math.max(0, Number(entry.imageCount) || 0),
      });
    }

    return result
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 30);
  }

  /** Normalizes the existing stored reply contract. @param {unknown} target - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeStoredReplyTarget(target) {
    if (!target || typeof target !== "object") {
      return null;
    }
    let mode = "post";
    if (target.mode === "thread") {
      mode = "thread";
    }
    return {
      ...target,
      mode,
      sourceUrl: String(target.sourceUrl || ""),
    };
  }

  /** Normalizes the existing stored explorer contract. @param {unknown} state - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeStoredThreadExplorerState(state) {
    if (!state || typeof state !== "object") {
      return {
        actor: "",
        accountMode: "posts",
      };
    }

    const actor = String(state.actor || "").trim().replace(/^@+/, "");
    const accountMode = String(state.accountMode || "").trim();
    let normalizedAccountMode = "posts";
    if (accountMode === "replies") {
      normalizedAccountMode = "replies";
    } else if (accountMode === "all") {
      normalizedAccountMode = "all";
    }

    return {
      actor,
      accountMode: normalizedAccountMode,
    };
  }

  /** Normalizes the existing stored resize contract. @param {unknown} value - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeImageAutoResizeMode(value) {
    if (value === "fit" || value === "lossy") {
      return value;
    }
    return "off";
  }

  /** Normalizes the existing stored expert contract. @param {unknown} value - Raw stored input. @returns {unknown} Normalized value. */
  function normalizeArchiveExpertMode(value) {
    return value === true;
  }


  return Object.freeze({ card: normalizeLinkCard, cards: normalizeSegmentLinkCards, proxy: normalizeLinkCardProxySettings, provider: normalizeLinkCardProviderSetting, usage: normalizeLinkCardMicrolinkUsage, search: normalizeStoredSearchResultState, overrides: normalizeSegmentOverrides, history: normalizePostingHistory, reply: normalizeStoredReplyTarget, explorer: normalizeStoredThreadExplorerState, resize: normalizeImageAutoResizeMode, expert: normalizeArchiveExpertMode });
};
