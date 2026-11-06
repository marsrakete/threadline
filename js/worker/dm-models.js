/**
 * Creates pure DM archive normalization operations for the classic worker.
 * @param {object} options - Explicit randomUUID adapter for missing entity IDs.
 * @returns {object} Frozen date, filter, conversation, message, embed and facet operations.
 */
globalThis.createThreadlineDmModels = function createThreadlineDmModels(options) {
  if (typeof options?.randomUUID !== "function") {
    throw new TypeError("DM models require a randomUUID adapter.");
  }

  /** Converts an optional calendar date to a UTC boundary.
   * @param {string} value - Calendar date or empty value.
   * @param {boolean} isEnd - Whether the boundary ends the day.
   * @returns {number|null} Epoch milliseconds or null for absent/invalid dates.
   */
  function normalizeDmDateFilterValue(value, isEnd = false) {
    if (!value) { return null; }
    let time = "00:00:00.000";
    if (isEnd) { time = "23:59:59.999"; }
    const timestamp = new Date(`${value}T${time}Z`).getTime();
    if (Number.isNaN(timestamp)) { return null; }
    return timestamp;
  }

  /** Normalizes the persisted DM participant and calendar-date filters.
   * @param {object} filters - Raw participantDid, from and to values.
   * @returns {object} String-valued filter fields.
   */
  function normalizeDmFilters(filters = {}) {
    return { participantDid: String(filters.participantDid || "").trim(), from: String(filters.from || ""), to: String(filters.to || "") };
  }

  /** Normalizes a conversation and excludes the current account from its members.
   * @param {object} convo - API conversation.
   * @param {string} selfDid - Current account DID.
   * @returns {object} Archive conversation retaining the raw API object.
   */
  function normalizeDmConversationEntity(convo = {}, selfDid = "") {
    let members = [];
    if (Array.isArray(convo.members)) { members = convo.members; }
    const filteredMembers = members.filter(member => member?.did && member.did !== selfDid);
    const memberHandles = filteredMembers.map(member => member.handle || member.did).filter(Boolean);
    const participantCount = filteredMembers.length;
    return {
      id: convo.id || convo.convoId || options.randomUUID(), rev: convo.rev || "",
      isGroup: convo.isGroup === true || participantCount > 1, participantCount, memberHandles,
      members: filteredMembers.map(member => ({ did: member.did || "", handle: member.handle || "",
        displayName: member.displayName || member.handle || "", avatar: member.avatar || "" })),
      title: convo.name || convo.title || "", unreadCount: Number(convo.unreadCount) || 0,
      lastMessageAt: convo.lastMessage?.sentAt || convo.updatedAt || convo.createdAt || "",
      updatedAt: convo.updatedAt || convo.lastMessage?.sentAt || convo.createdAt || "", raw: convo,
    };
  }

  /** Collects embed candidates in envelope, message, record and content priority order.
   * @param {object} message - API message with optional nested payloads.
   * @returns {object[]} Truthy candidates, preserving order and duplicates.
   */
  function collectDmEmbeds(message = {}) {
    const candidates = [];
    for (const payload of [message, message.message, message.record, message.content]) {
      if (!payload) { continue; }
      candidates.push(payload, payload.embed, payload.external, payload.card, payload.link);
      if (Array.isArray(payload.embeds)) { candidates.push(...payload.embeds); }
    }
    return candidates.filter(Boolean);
  }

  /** Chooses the first nonempty facet array using the API envelope priority.
   * @param {object} message - API message with optional nested facet arrays.
   * @returns {object[]} First nonempty facets or an empty array.
   */
  function collectDmFacets(message = {}) {
    for (const facets of [message.facets, message.message?.facets, message.record?.facets, message.content?.facets]) {
      if (Array.isArray(facets) && facets.length > 0) { return facets; }
    }
    return [];
  }

  /** Finds the first external link card, including nested media/embeds.
   * @param {object|null} embed - Candidate external/card/link or wrapper object.
   * @returns {object|null} URL, title, description and thumbnail references or null.
   */
  function extractDmExternalCardFromEmbedSw(embed) {
    if (!embed || typeof embed !== "object") { return null; }
    let external = embed;
    if (embed.external && typeof embed.external === "object") { external = embed.external; }
    else if (embed.card && typeof embed.card === "object") { external = embed.card; }
    else if (embed.link && typeof embed.link === "object") { external = embed.link; }
    const url = String(external.uri || external.url || "").trim();
    const title = String(external.title || "").trim();
    const description = String(external.description || "").trim();
    const thumbRef = external.thumb || external.thumbnail || external.image || null;
    let thumb = "";
    if (typeof thumbRef === "string") { thumb = thumbRef; }
    else { thumb = String(thumbRef?.uri || thumbRef?.url || thumbRef?.thumb || "").trim(); }
    if (url) { return { url, title, description, thumb, thumbRef }; }
    if (embed.media) { return extractDmExternalCardFromEmbedSw(embed.media); }
    if (Array.isArray(embed.embeds)) {
      for (const nested of embed.embeds) {
        const match = extractDmExternalCardFromEmbedSw(nested);
        if (match) { return match; }
      }
    }
    return null;
  }

  /** Normalizes sender, text and media references without fetching or enriching assets.
   * @param {object} message - API message.
   * @param {string} convoId - Owning conversation ID.
   * @returns {object} Archive message retaining its raw API object.
   */
  function normalizeDmMessageEntity(message = {}, convoId = "") {
    const sender = message.sender || message.author || {};
    return {
      id: message.id || message.msgId || options.randomUUID(), convoId,
      sentAt: message.sentAt || message.createdAt || "", text: String(message.text || message.message?.text || ""),
      senderDid: sender.did || message.senderDid || "", senderHandle: sender.handle || "",
      senderDisplayName: sender.displayName || sender.handle || "", senderAvatar: sender.avatar || "", senderAvatarPath: "",
      facets: collectDmFacets(message), embeds: collectDmEmbeds(message), externalCard: null, raw: message,
    };
  }

  return Object.freeze({ normalizeDmDateFilterValue, normalizeDmFilters, normalizeDmConversationEntity,
    collectDmEmbeds, collectDmFacets, extractDmExternalCardFromEmbedSw, normalizeDmMessageEntity });
};
