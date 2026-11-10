/**
 * Creates classic-worker DM collection, partner lookup and avatar hydration workflows.
 * @param {object} options - Explicit models, text, authentication, chat/profile transport,
 * asset/blob download, CID/extension, ISO clock, random ID and cache-version adapters.
 * @param {object} options.models - Shared DM filter, date, conversation, message and card models.
 * @param {Function} options.session - Resolves the authenticated account.
 * @param {Function} options.chat - Requests chat API data using auth, method and parameters.
 * @param {Function} options.request - Requests profile API data using method, parameters and transport options.
 * @param {Function} options.text - Formats a progress/error key and optional placeholder values.
 * @returns {{exportArchive: Function, checkAccess: Function, listPartners: Function, hydrateAvatars: Function}} Frozen service API.
 */
globalThis.createThreadlineDmService = function createThreadlineDmService(options) {
  for (const name of ["session", "chat", "request", "base", "accountAvatar", "profileRecord", "remoteAsset", "blob", "cid", "extension", "now", "randomUUID", "text"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("DM service requires " + name);
    }
  }
  for (const name of ["normalizeDmFilters", "normalizeDmDateFilterValue", "normalizeDmConversationEntity", "normalizeDmMessageEntity", "extractDmExternalCardFromEmbedSw"]) {
    if (typeof options.models?.[name] !== "function") {
      throw new TypeError("DM service requires model " + name);
    }
  }
  const { normalizeDmFilters, normalizeDmDateFilterValue, normalizeDmConversationEntity, normalizeDmMessageEntity, extractDmExternalCardFromEmbedSw } = options.models;
  const ensureSession = options.session, chatBskyGet = options.chat, bskyGet = options.request, authXrpcBase = options.base;
  const fetchAccountAvatar = options.accountAvatar, downloadRemoteAssetViaBlob = options.remoteAsset, downloadBlobForDid = options.blob;
  const getBlobCidFromRef = options.cid, getAssetExtensionFromMimeType = options.extension, text = options.text;
  /** Retains valid arrays and uses an empty collection for malformed API fields.
   * @param {unknown} value - API/cache collection. @returns {Array} The original array or an empty array.
   */
  function arrayOrEmpty(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }
  /** Calculates the existing avatar progress percentage, including an empty-list fallback.
   * @param {number} index - Zero-based avatar index. @param {number} count - Avatar count.
   * @returns {number} Existing 58 through 98 progress value.
   */
  function avatarProgress(index, count) {
    if (count > 0) {
      return 58 + Math.round(((index + 1) / count) * 40);
    }
    return 98;
  }
  /** Collects the selected partner's paged messages and best-effort archive assets.
   * @param {object} payload - Filters and optional cached partners/conversations/assets.
   * @param {Function} notifyProgress - Existing progress payload observer.
   * @returns {Promise<object>} Manifest, contacts, conversations, messages and assets.
   */
  async function exportDmArchive({ filters, partnerCache } = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const ownAvatar = auth.avatar || await fetchAccountAvatar(auth.session.did, auth);
    let ownAvatarPath = "";
    const pdsServiceCache = new Map();
    const normalizedFilters = normalizeDmFilters(filters);
    const fromTime = normalizeDmDateFilterValue(normalizedFilters.from, false);
    const toTime = normalizeDmDateFilterValue(normalizedFilters.to, true);
    if (!normalizedFilters.participantDid) {
      throw new Error(text("selectPartner"));
    }

    let partnerPayload = null;
    if (partnerCache && typeof partnerCache === "object") {
      partnerPayload = {
        recentContacts: arrayOrEmpty(partnerCache.recentContacts),
        conversations: arrayOrEmpty(partnerCache.conversations),
        assets: arrayOrEmpty(partnerCache.assets),
      };
    }
    if (!partnerPayload?.conversations?.length) {
      partnerPayload = await listDmPartners({ downloadAssets: false }, () => {});
    }
    const filteredConversations = arrayOrEmpty(partnerPayload.conversations)
      .filter((convo) => (convo.members || []).some((member) => member.did === normalizedFilters.participantDid));
    const messages = [];
    const participantSet = new Set();

    for (const [index, convo] of filteredConversations.entries()) {
      let messageCursor = "";
      let convoMessageCount = 0;
      do {
        const response = await chatBskyGet(auth, "chat.bsky.convo.getMessages", {
          convoId: convo.id,
          limit: 100,
          cursor: messageCursor,
        });
        const items = arrayOrEmpty(response.messages);
        items.forEach((message) => {
          const normalized = normalizeDmMessageEntity(message, convo.id);
          let sentAtTime = NaN;
          if (normalized.sentAt) {
            sentAtTime = Date.parse(normalized.sentAt);
          }
          if (Number.isFinite(fromTime) && Number.isFinite(sentAtTime) && sentAtTime < fromTime) {
            return;
          }
          if (Number.isFinite(toTime) && Number.isFinite(sentAtTime) && sentAtTime > toTime) {
            return;
          }
          messages.push(normalized);
          convoMessageCount += 1;
        });
        messageCursor = response.cursor || "";
        notifyProgress({
          title: text("archiveTitle"),
          step: text("conversationRead", { index: index + 1, count: filteredConversations.length }),
          percent: Math.min(92, 30 + Math.round(((index + 1) / Math.max(1, filteredConversations.length)) * 60)),
          detail: text("messagesCollected", { count: messages.length }),
        });
      } while (messageCursor);

      convo.messageCount = convoMessageCount;
      convo.members.forEach((member) => {
        if (member.did) {
          participantSet.add(member.did);
        }
      });
    }

    const keptConversationIds = new Set(messages.map((message) => message.convoId));
    const finalConversations = filteredConversations.filter((convo) => keptConversationIds.has(convo.id) || !normalizedFilters.from && !normalizedFilters.to);
    const assets = [...arrayOrEmpty(partnerPayload.assets)];
    const existingAssetPaths = new Set(assets.map((asset) => asset.path));
    const selectedPartner = arrayOrEmpty(partnerPayload.recentContacts)
      .find((contact) => contact.did === normalizedFilters.participantDid)
      || finalConversations.flatMap((convo) => convo.members || []).find((member) => member.did === normalizedFilters.participantDid)
      || null;
    const memberByDid = new Map();

    finalConversations.forEach((convo) => {
      (convo.members || []).forEach((member) => {
        if (member?.did && !memberByDid.has(member.did)) {
          memberByDid.set(member.did, member);
        }
      });
    });

    messages.forEach((message) => {
      if (message.senderDid === auth.session.did) {
        message.senderHandle = auth.session.handle || message.senderHandle || "";
        message.senderDisplayName = auth.session.handle || message.senderDisplayName || message.senderHandle || "";
        message.senderAvatar = ownAvatar || message.senderAvatar || "";
        return;
      }
      const member = memberByDid.get(message.senderDid);
      if (!member) {
        return;
      }
      message.senderHandle = member.handle || message.senderHandle || "";
      message.senderDisplayName = member.displayName || member.handle || message.senderDisplayName || "";
      message.senderAvatar = member.avatar || message.senderAvatar || "";
    });

    for (const message of messages) {
      const externalCard = arrayOrEmpty(message.embeds)
        .map((embed) => extractDmExternalCardFromEmbedSw(embed))
        .find(Boolean);
      if (!externalCard) {
        continue;
      }
      message.externalCard = {
        url: externalCard.url,
        title: externalCard.title,
        description: externalCard.description,
        thumb: externalCard.thumb || "",
        thumbPath: "",
      };
      const thumbCid = getBlobCidFromRef(externalCard.thumbRef || {});
      let thumbUrl = "";
      if (typeof externalCard.thumbRef === "string") {
        thumbUrl = externalCard.thumbRef;
      } else {
        thumbUrl = String(externalCard.thumbRef?.uri || externalCard.thumbRef?.url || externalCard.thumbRef?.thumb || "").trim();
      }
      if (!thumbCid) {
        if (!thumbUrl) {
          continue;
        }
        try {
          const blob = await downloadRemoteAssetViaBlob(
            auth,
            thumbUrl,
            message.senderDid || normalizedFilters.participantDid || auth.session.did,
            pdsServiceCache,
          );
          const extension = getAssetExtensionFromMimeType(blob.type);
          const slug = String(message.senderHandle || message.senderDid || "link-card").replace(/[^\w.-]+/g, "-").slice(0, 60) || "link-card";
          const path = `dm-link-cards/${slug}-${message.id || options.randomUUID()}.${extension}`;
          if (!existingAssetPaths.has(path)) {
            existingAssetPaths.add(path);
            assets.push({
              path,
              type: blob.type,
              sizeBytes: blob.bytes.length,
              bytes: blob.bytes,
            });
          }
          message.externalCard.thumbPath = path;
        } catch {
          // Keep card text even if thumbnail cannot be loaded.
        }
        continue;
      }
      try {
        const blob = await downloadBlobForDid(auth, message.senderDid || normalizedFilters.participantDid || auth.session.did, thumbCid);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const slug = String(message.senderHandle || message.senderDid || "link-card").replace(/[^\w.-]+/g, "-").slice(0, 60) || "link-card";
        const path = `dm-link-cards/${slug}-${message.id || options.randomUUID()}.${extension}`;
        if (!existingAssetPaths.has(path)) {
          existingAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
        message.externalCard.thumbPath = path;
      } catch {
        // Keep card text even if thumbnail cannot be loaded.
      }
    }

    if (selectedPartner?.avatar && !selectedPartner.avatarPath) {
      try {
        const blob = await downloadRemoteAssetViaBlob(auth, selectedPartner.avatar, selectedPartner.did, pdsServiceCache);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const partnerSlug = String(selectedPartner.handle || selectedPartner.did || "partner")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "partner";
        const path = `dm-avatars/${partnerSlug}.${extension}`;
        if (!existingAssetPaths.has(path)) {
          existingAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
        selectedPartner.avatarPath = path;
        arrayOrEmpty(partnerPayload.recentContacts).forEach((contact) => {
          if (contact.did === selectedPartner.did) {
            contact.avatarPath = path;
          }
        });
        finalConversations.forEach((convo) => {
          (convo.members || []).forEach((member) => {
            if (member.did === selectedPartner.did) {
              member.avatarPath = path;
            }
          });
        });
      } catch {
        selectedPartner.avatarPath = "";
      }
    }

    if (ownAvatar && !ownAvatarPath) {
      try {
        const blob = await downloadRemoteAssetViaBlob(auth, ownAvatar, auth.session.did, pdsServiceCache);
        const extension = getAssetExtensionFromMimeType(blob.type);
        const ownSlug = String(auth.session.handle || auth.session.did || "self")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 60) || "self";
        const path = `dm-avatars/${ownSlug}.${extension}`;
        if (!existingAssetPaths.has(path)) {
          existingAssetPaths.add(path);
          assets.push({
            path,
            type: blob.type,
            sizeBytes: blob.bytes.length,
            bytes: blob.bytes,
          });
        }
        ownAvatarPath = path;
        messages.forEach((message) => {
          if (message.senderDid === auth.session.did) {
            message.senderAvatarPath = path;
          }
        });
      } catch {
        // Keep export working without own avatar.
      }
    }

    notifyProgress({
      title: text("archiveTitle"),
      step: text("archiveAssemble"),
      percent: 98,
      detail: text("archiveSummary", { conversations: finalConversations.length, messages: messages.length }),
    });

    return {
      manifest: {
        schemaVersion: 1,
        exportedAt: options.now(),
        appVersion: options.appVersion,
        account: {
          handle: auth.session.handle,
          did: auth.session.did,
          displayName: auth.session.handle,
          avatar: ownAvatar || "",
          avatarPath: ownAvatarPath,
        },
        filters: normalizedFilters,
        sourceType: "dm-chat-api",
        conversationCount: finalConversations.length,
        messageCount: messages.length,
        participantCount: participantSet.size,
      },
      recentContacts: arrayOrEmpty(partnerPayload.recentContacts),
      conversations: finalConversations,
      messages,
      assets,
    };
  }

  /** Checks access to the chat conversation API.
   * @returns {Promise<object>} The successful access marker; session/transport failures reject.
   */
  async function checkDmAccess() {
    const auth = await ensureSession();
    await chatBskyGet(auth, "chat.bsky.convo.listConvos", { limit: 1 });
    return { ok: true };
  }

  /** Pages conversations, selects each contact's latest metadata and optionally downloads avatars.
   * @param {object} payload - downloadAssets false skips profile and asset hydration.
   * @param {Function} notifyProgress - Existing progress payload observer.
   * @returns {Promise<object>} Contacts in descending date order, conversations and assets.
   */
  async function listDmPartners(payload = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const downloadAssets = payload?.downloadAssets !== false;
    const conversations = [];
    const recentContactsMap = new Map();
    const assets = [];
    const seenAssetPaths = new Set();
    const pdsServiceCache = new Map();
    let cursor = "";
    let page = 0;

    notifyProgress({
      title: text("partnersTitle"),
      step: text("listRead"),
      percent: 8,
      detail: "",
    });

    do {
      const response = await chatBskyGet(auth, "chat.bsky.convo.listConvos", {
        limit: 100,
        cursor,
      });
      const convos = arrayOrEmpty(response.convos);
      convos.forEach((convo) => {
        const normalizedConvo = normalizeDmConversationEntity(convo, auth.session.did);
        conversations.push(normalizedConvo);
        normalizedConvo.members.forEach((member) => {
          if (!member.did) {
            return;
          }
          const existing = recentContactsMap.get(member.did);
          const candidateTimestamp = Date.parse(normalizedConvo.lastMessageAt || normalizedConvo.updatedAt || 0) || 0;
          const existingTimestamp = Date.parse(existing?.lastMessageAt || existing?.updatedAt || 0) || 0;
          if (!existing || candidateTimestamp > existingTimestamp) {
            recentContactsMap.set(member.did, {
              did: member.did,
              handle: member.handle || "",
              displayName: member.displayName || member.handle || "",
              avatar: member.avatar || "",
              lastMessageAt: normalizedConvo.lastMessageAt || normalizedConvo.updatedAt || "",
              conversationId: normalizedConvo.id,
            });
          }
        });
      });
      cursor = response.cursor || "";
      page += 1;
      const listDone = !cursor;
      let percent = Math.min(100, 8 + (page * 15));
      if (downloadAssets) {
        percent = Math.min(54, 8 + (page * 12));
      }
      let detail = text("listComplete");
      if (cursor) {
        detail = text("listMore");
      } else if (listDone && downloadAssets) {
        detail = text("listAvatars");
      }
      notifyProgress({
        title: text("partnersTitle"),
        step: text("partnersFound", { count: recentContactsMap.size }),
        percent,
        detail,
      });
    } while (cursor);

    const recentContacts = Array.from(recentContactsMap.values())
      .sort((left, right) => (Date.parse(right.lastMessageAt || 0) || 0) - (Date.parse(left.lastMessageAt || 0) || 0));

    if (downloadAssets) {
      await hydrateMissingDmPartnerProfiles(auth, recentContacts);
      const avatarContacts = recentContacts.filter((contact) => contact.avatar);
      for (const [index, contact] of avatarContacts.entries()) {
        notifyProgress({
          title: text("partnersTitle"),
          step: text("avatarRead", { index: index + 1, count: avatarContacts.length }),
          percent: avatarProgress(index, avatarContacts.length),
          detail: contact.displayName || contact.handle || contact.did || "",
        });
        if (!contact.avatar) {
          continue;
        }
        await attachPartnerAvatar(auth, contact, conversations, assets, seenAssetPaths, pdsServiceCache);
      }
      notifyProgress({
        title: text("partnersTitle"),
        step: text("partnersComplete"),
        percent: 100,
        detail: text("partnersReady", { count: recentContacts.length }),
      });
    }

    return {
      recentContacts,
      conversations,
      assets,
    };
  }

  /** Downloads one partner avatar and links its deduplicated path to matching members.
   * @param {object} auth - Active account. @param {object} contact - Contact enriched in place.
   * @param {object[]} conversations - Conversations whose matching members receive the asset path.
   * @param {object[]} assets - Mutable collected assets. @param {Set<string>} seenAssetPaths - Existing paths.
   * @param {Map} pdsServiceCache - Per-operation service-resolution cache.
   * @returns {Promise<void>} Completion; failed downloads leave an empty contact path.
   */
  async function attachPartnerAvatar(auth, contact, conversations, assets, seenAssetPaths, pdsServiceCache) {
    try {
      let blob;
      try {
        const providedAvatarCid = getBlobCidFromRef(contact.avatar);
        if (providedAvatarCid) {
          blob = await downloadBlobForDid(auth, contact.did, providedAvatarCid, pdsServiceCache);
        } else if (typeof contact.avatar === "string" && contact.avatar.trim()) {
          blob = await downloadRemoteAssetViaBlob(auth, contact.avatar, contact.did, pdsServiceCache);
        } else {
          throw new Error("Avatar reference is not a URL or blob CID.");
        }
      } catch (staleAvatarError) {
        const failedAvatarCid = getBlobCidFromRef(contact.avatar)
          || (typeof globalThis.parseBlobUrlInfo === "function" ? globalThis.parseBlobUrlInfo(contact.avatar)?.cid || "" : "");
        const profile = typeof options.profileRecord === "function"
          ? await options.profileRecord(contact.did, auth, pdsServiceCache).catch(() => null)
          : null;
        const profileAvatarUrl = typeof profile?.avatar === "string" ? profile.avatar.trim() : "";
        const profileAvatarCid = typeof globalThis.parseBlobUrlInfo === "function"
          ? globalThis.parseBlobUrlInfo(profileAvatarUrl)?.cid || ""
          : "";
        const currentAvatarCid = getBlobCidFromRef(profile?.avatar) || profileAvatarCid;
        if (profile) {
          contact.handle = String(profile.handle || contact.handle || "").trim();
          contact.displayName = String(profile.displayName || contact.displayName || contact.handle || "").trim();
          if (profileAvatarUrl) {
            contact.avatar = profileAvatarUrl;
          } else if (currentAvatarCid) {
            contact.avatar = "";
          }
          if (!currentAvatarCid) {
            contact.avatar = "";
            contact.avatarPath = "";
            return;
          }
        }
        if (!currentAvatarCid || currentAvatarCid === failedAvatarCid) {
          throw staleAvatarError;
        }
        blob = await downloadBlobForDid(auth, contact.did, currentAvatarCid, pdsServiceCache);
      }
      const extension = getAssetExtensionFromMimeType(blob.type);
      const slug = String(contact.handle || contact.did || "partner").replace(/[^\w.-]+/g, "-").slice(0, 60) || "partner";
      const path = `dm-avatars/${slug}.${extension}`;
      contact.avatarPath = path;
      if (!seenAssetPaths.has(path)) {
        seenAssetPaths.add(path);
        assets.push({
          path,
          type: blob.type,
          sizeBytes: blob.bytes.length,
          bytes: blob.bytes,
        });
      }
      conversations.forEach((convo) => {
        (convo.members || []).forEach((member) => {
          if (member.did === contact.did) {
            member.avatarPath = path;
          }
        });
      });
    } catch {
      contact.avatarPath = "";
    }
  }

  /** Copies cached contacts/conversation members and hydrates missing profiles and avatar assets.
   * @param {object} payload - recentContacts and conversations collections.
   * @param {Function} notifyProgress - Existing progress payload observer.
   * @returns {Promise<object>} Copied/enriched contacts, conversations and downloaded assets.
   */
  async function hydrateDmPartnerAvatars(payload = {}, notifyProgress = () => {}) {
    const auth = await ensureSession();
    const contacts = arrayOrEmpty(payload.recentContacts).map((contact) => ({ ...contact }));
    const conversations = arrayOrEmpty(payload.conversations).map((convo) => ({
      ...convo,
      members: arrayOrEmpty(convo.members).map((member) => ({ ...member })),
    }));
    const assets = [];
    const seenAssetPaths = new Set();
    const pdsServiceCache = new Map();
    await hydrateMissingDmPartnerProfiles(auth, contacts);
    const avatarContacts = contacts.filter((contact) => contact.avatar);

    let detail = "";
    if (avatarContacts.length > 0) {
      detail = text("avatarsPrepare", { count: avatarContacts.length });
    }
    notifyProgress({
      title: text("partnersTitle"),
      step: text("avatarsSave"),
      percent: 56,
      detail,
    });

    for (const [index, contact] of avatarContacts.entries()) {
      notifyProgress({
        title: text("partnersTitle"),
        step: text("avatarRead", { index: index + 1, count: avatarContacts.length }),
        percent: avatarProgress(index, avatarContacts.length),
        detail: contact.displayName || contact.handle || contact.did || "",
      });
      await attachPartnerAvatar(auth, contact, conversations, assets, seenAssetPaths, pdsServiceCache);
    }

    notifyProgress({
      title: text("partnersTitle"),
      step: text("partnersComplete"),
      percent: 100,
      detail: text("partnersReady", { count: contacts.length }),
    });

    return {
      recentContacts: contacts,
      conversations,
      assets,
    };
  }

  /** Enriches contacts missing avatars in batches of 25, tolerating profile lookup failure.
   * @param {object} auth - Active account with optional session token.
   * @param {object[]} contacts - Contacts enriched in place.
   * @returns {Promise<object[]>} The same contact collection.
   */
  async function hydrateMissingDmPartnerProfiles(auth, contacts = []) {
    const pending = contacts.filter((contact) => {
      return contact?.did && !String(contact.avatar || "").trim();
    });
    if (!pending.length || !auth?.session?.accessJwt) {
      return contacts;
    }

    for (let index = 0; index < pending.length; index += 25) {
      const batch = pending.slice(index, index + 25).map((contact) => contact.did);
      try {
        const response = await bskyGet("app.bsky.actor.getProfiles", { actors: batch }, {
          headers: { authorization: `Bearer ${auth.session.accessJwt}` },
          base: authXrpcBase(auth),
        });
        const profiles = arrayOrEmpty(response?.profiles);
        profiles.forEach((profile) => {
          const contact = pending.find((entry) => entry.did === String(profile?.did || "").trim());
          if (!contact) {
            return;
          }
          contact.handle = String(profile.handle || contact.handle || "").trim();
          contact.displayName = String(profile.displayName || contact.displayName || contact.handle || "").trim();
          const profileAvatar = typeof profile.avatar === "string" ? profile.avatar.trim() : "";
          contact.avatar = profileAvatar || String(contact.avatar || "").trim();
        });
      } catch (error) {
        // The contact remains usable without an avatar when profile lookup fails.
      }
    }
    return contacts;
  }
  return Object.freeze({ exportArchive: exportDmArchive, checkAccess: checkDmAccess, listPartners: listDmPartners, hydrateAvatars: hydrateDmPartnerAvatars });
};
