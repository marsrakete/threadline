/**
 * Creates DM partner, message, range, preview and export-metadata operations.
 * @param {object} dependencies - Required adapters and locale data.
 * @param {Function} dependencies.t - Resolves a localized translation key.
 * @param {Function} dependencies.date - Formats an export date with a clock fallback.
 * @param {Function} dependencies.extractCard - Extracts preview metadata from an embed.
 * @param {Function} dependencies.links - Resolves rich text into text/link runs.
 * @param {Function} dependencies.account - Reads the fallback own-account handle.
 * @param {Function} dependencies.selection - Reads selected participant DIDs.
 * @param {Function} dependencies.now - Returns the current Date.
 * @param {string[]} dependencies.locales - Supported locale codes.
 * @param {object} dependencies.translations - Translations indexed by locale.
 * @param {string} dependencies.defaultLocale - Translation fallback locale.
 * @returns {object} partner, title, baseName, messages, range, card, i18n operations.
 */
export function createDmExportModels(dependencies) {
  for (const name of ["t", "date", "extractCard", "links", "account", "selection", "now"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`DM export requires ${name}.`);
    }
  }
  if (!Array.isArray(dependencies.locales) || !dependencies.translations || typeof dependencies.defaultLocale !== "string") {
    throw new TypeError("DM export requires locale data.");
  }
  const t = dependencies.t;
  const formatArchiveDatePart = dependencies.date;
  const extractExternalCardFromEmbed = dependencies.extractCard;
  const extractPdfLinkRuns = dependencies.links;
  /**
   * Resolves the selected partner by merging contact and conversation metadata.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {object|null} Merged partner, first other member or null.
   */
  function getDmPrimaryPartner(catalog) {
    const selectedDid = catalog?.manifest?.filters?.participantDid || dependencies.selection()[0] || "";
    const selfDid = catalog?.manifest?.account?.did || "";
    let conversations;
    if (Array.isArray(catalog?.conversations)) {
      conversations = catalog.conversations;
    } else {
      conversations = [];
    }
    let recentContacts;
    if (Array.isArray(catalog?.recentContacts)) {
      recentContacts = catalog.recentContacts;
    } else {
      recentContacts = [];
    }
    const conversationMember = conversations.flatMap(convo => {
      let members;
      if (Array.isArray(convo.members)) {
        members = convo.members;
      } else {
        members = [];
      }
      return members;
    }).find(member => {
      return member.did === selectedDid && member.did !== selfDid;
    });
    const recentContact = recentContacts.find(contact => {
      return contact.did === selectedDid;
    });
    if (conversationMember || recentContact) {
      return {
        ...(recentContact || {}),
        ...(conversationMember || {}),
        did: conversationMember?.did || recentContact?.did || selectedDid,
        handle: conversationMember?.handle || recentContact?.handle || "",
        displayName: conversationMember?.displayName || recentContact?.displayName || conversationMember?.handle || recentContact?.handle || "",
        avatar: conversationMember?.avatar || recentContact?.avatar || "",
        avatarPath: conversationMember?.avatarPath || recentContact?.avatarPath || ""
      };
    }
    return conversations[0]?.members?.find(member => {
      return member?.did && member.did !== selfDid;
    }) || null;
  }

  /**
   * Builds the conversation title from explicit title or partner metadata.
   * @param {object} convo - Conversation with optional title and member handles.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {string} Display title.
   */
  function getDmConversationTitle(convo, catalog) {
    if (convo?.title) {
      return convo.title;
    }
    const partner = getDmPrimaryPartner(catalog);
    if (partner?.displayName && partner.displayName !== partner.handle) {
      return partner.displayName;
    }
    if (partner?.handle) {
      return `@${partner.handle}`;
    }
    return convo?.memberHandles?.join(", ") || t("dmConversationFallbackTitle");
  }

  /**
   * Builds the existing sanitized DM filename prefix.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {string} Sanitized filename prefix.
   */
  function makeDmArchiveFileBaseName(catalog) {
    const ownHandle = String(catalog?.manifest?.account?.handle || dependencies.account() || "account").replace(/[^\w.-]+/g, "-");
    const partner = getDmPrimaryPartner(catalog);
    const partnerPart = String(partner?.handle || partner?.did || "dm").replace(/[^\w.-]+/g, "-");
    const datePart = formatArchiveDatePart(catalog?.manifest?.exportedAt, dependencies.now());
    return `threadline-dm-${ownHandle}-${partnerPart}-${datePart}`;
  }

  /**
   * Sorts and enriches export messages without mutating the original messages.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {object[]} Copied, enriched and ordered messages.
   */
  function collectDmMessagesForExport(catalog) {
    let conversations;
    if (Array.isArray(catalog?.conversations)) {
      conversations = catalog.conversations;
    } else {
      conversations = [];
    }
    const convoById = new Map(conversations.map(convo => {
      return [convo.id, convo];
    }));
    const memberByDid = new Map();
    const selfDid = catalog?.manifest?.account?.did || "";
    const selfHandle = catalog?.manifest?.account?.handle || dependencies.account() || "";
    const selfDisplayName = catalog?.manifest?.account?.displayName || selfHandle || "";
    const selfAvatarPath = catalog?.manifest?.account?.avatarPath || "";
    conversations.forEach(convo => {
      (convo.members || []).forEach(member => {
        if (member?.did && !memberByDid.has(member.did)) {
          memberByDid.set(member.did, member);
        }
      });
    });
    let messages;
    if (Array.isArray(catalog?.messages)) {
      messages = [...catalog.messages];
    } else {
      messages = [];
    }
    return messages.sort((left, right) => {
      const leftTime = Date.parse(left.sentAt || 0) || 0;
      const rightTime = Date.parse(right.sentAt || 0) || 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return String(left.id || "").localeCompare(String(right.id || ""));
    }).map(message => {
      let resolvedSenderHandle;
      if (message.senderDid === selfDid) {
        resolvedSenderHandle = message.senderHandle || selfHandle || "";
      } else {
        resolvedSenderHandle = memberByDid.get(message.senderDid)?.handle || message.senderHandle || "";
      }
      let resolvedSenderDisplayName;
      if (message.senderDid === selfDid) {
        resolvedSenderDisplayName = message.senderDisplayName || selfDisplayName || selfHandle || message.senderDid || "";
      } else {
        resolvedSenderDisplayName = memberByDid.get(message.senderDid)?.displayName || memberByDid.get(message.senderDid)?.handle || message.senderDisplayName || message.senderHandle || message.senderDid || "";
      }
      let resolvedSenderAvatarPath;
      if (message.senderDid === selfDid) {
        resolvedSenderAvatarPath = message.senderAvatarPath || selfAvatarPath || "";
      } else {
        resolvedSenderAvatarPath = memberByDid.get(message.senderDid)?.avatarPath || message.senderAvatarPath || "";
      }
      return {
        ...message,
        senderHandle: resolvedSenderHandle,
        senderDisplayName: resolvedSenderDisplayName,
        senderAvatarPath: resolvedSenderAvatarPath,
        conversation: convoById.get(message.convoId) || null
      };
    });
  }

  /**
   * Derives the first/last valid message timestamp or filter fallback.
   * @param {object|null} catalog - DM manifest, contacts, conversations, messages and assets.
   * @returns {object} From/to timestamp strings.
   */
  function getDmArchiveMessageRange(catalog) {
    const messages = collectDmMessagesForExport(catalog);
    const datedMessages = messages.map(message => {
      return {
        message,
        timestamp: Date.parse(message.sentAt || "")
      };
    }).filter(entry => {
      return Number.isFinite(entry.timestamp);
    }).sort((left, right) => {
      return left.timestamp - right.timestamp;
    });
    if (datedMessages.length === 0) {
      return {
        from: catalog?.manifest?.filters?.from || "",
        to: catalog?.manifest?.filters?.to || ""
      };
    }
    return {
      from: datedMessages[0].message.sentAt || "",
      to: datedMessages[datedMessages.length - 1].message.sentAt || ""
    };
  }

  /**
   * Delegates external preview extraction to the shared embed parser.
   * @param {object} embed - Raw external-card embed.
   * @returns {object|null} Extracted external card.
   */
  function extractDmExternalCardFromEmbed(embed) {
    return extractExternalCardFromEmbed(embed);
  }

  /**
   * Builds a preview fallback from the first rich-text link.
   * @param {object} message - Normalized sender, text, facets and avatar metadata.
   * @returns {object|null} First-link preview or null.
   */
  function getDmFacetLinkCard(message = {}) {
    let facets;
    if (Array.isArray(message?.facets)) {
      facets = message.facets;
    } else {
      facets = [];
    }
    const linkRuns = extractPdfLinkRuns(message?.text || "", facets).filter(run => {
      return run?.url;
    });
    if (linkRuns.length === 0) {
      return null;
    }
    const firstUrl = String(linkRuns[0].url || "").trim();
    if (!firstUrl) {
      return null;
    }
    return {
      url: firstUrl,
      title: firstUrl,
      description: "",
      thumb: "",
      thumbPath: ""
    };
  }

  /**
   * Resolves explicit, embedded or facet-derived link previews.
   * @param {object} message - Normalized sender, text, facets and avatar metadata.
   * @returns {object|null} Preview metadata or null.
   */
  function getDmExternalCard(message = {}) {
    if (message?.externalCard?.url) {
      return message.externalCard;
    }
    let embeds;
    if (Array.isArray(message.embeds)) {
      embeds = message.embeds;
    } else {
      embeds = [];
    }
    for (const embed of embeds) {
      const card = extractDmExternalCardFromEmbed(embed);
      if (card) {
        return card;
      }
    }
    return getDmFacetLinkCard(message);
  }

  /**
   * Collects the standalone HTML translation subset for supported locales.

   * @returns {object} Locale-to-translation mapping.
   */
  function buildDmHtmlI18n() {
    const keys = ["dmHeaderEyebrow", "dmHeaderTitle", "dmHtmlGenerated", "dmSummaryConversationsLabel", "dmSummaryMessagesLabel", "dmSummaryParticipantsLabel", "dmConversationLabel", "dmPartnerLabel", "dmArchiveRangeLabel", "dmArchiveRangeValue", "dmHtmlSearchLabel", "dmHtmlResetFilters", "dmHtmlVisibleStatus", "dmHtmlNoMatches", "dmHtmlOpenConversation", "dmHtmlNoText", "closeButton"];
    return Object.fromEntries(dependencies.locales.map(locale => {
      return [locale, Object.fromEntries(keys.map(key => {
        return [key, dependencies.translations[locale]?.[key] || dependencies.translations[dependencies.defaultLocale]?.[key] || key];
      }))];
    }));
  }
  return {
    partner: getDmPrimaryPartner,
    title: getDmConversationTitle,
    baseName: makeDmArchiveFileBaseName,
    messages: collectDmMessagesForExport,
    range: getDmArchiveMessageRange,
    card: getDmExternalCard,
    i18n: buildDmHtmlI18n
  };
}
