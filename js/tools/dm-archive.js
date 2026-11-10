/**
 * Builds the active DM archive filters from the selected participant and date inputs.
 * @param {string[]} selectedParticipantDids - Selected DM participant DIDs.
 * @param {string} from - Optional inclusive start date.
 * @param {string} to - Optional inclusive end date.
 * @returns {{participantDid: string, from: string, to: string}} Normalized archive filters.
 */
export function getDmArchiveFilters(selectedParticipantDids, from, to) {
  let participantDid = "";
  if (Array.isArray(selectedParticipantDids) && selectedParticipantDids.length > 0) {
    participantDid = String(selectedParticipantDids[0] || "").trim();
  }
  return {
    participantDid,
    from: String(from || "").trim(),
    to: String(to || "").trim(),
  };
}

/**
 * Returns one sorted and query-filtered list of DM contacts.
 * @param {object[]} contacts - Loaded DM contact records.
 * @param {string} query - Current contact search query.
 * @param {string} locale - Locale used for predictable alphabetical ordering.
 * @returns {object[]} Visible contact records.
 */
export function getDmVisibleContacts(contacts, query, locale) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const sourceContacts = [];
  if (Array.isArray(contacts)) {
    sourceContacts.push(...contacts);
  }
  return sourceContacts
    .sort((left, right) => {
      const leftLabel = String(left?.displayName || left?.handle || left?.did || "");
      const rightLabel = String(right?.displayName || right?.handle || right?.did || "");
      const nameCompare = leftLabel.localeCompare(rightLabel, locale || undefined, { sensitivity: "base" });
      if (nameCompare !== 0) {
        return nameCompare;
      }
      const leftId = String(left?.handle || left?.did || "");
      const rightId = String(right?.handle || right?.did || "");
      return leftId.localeCompare(rightId, locale || undefined, { sensitivity: "base" });
    })
    .filter((contact) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [contact?.handle || "", contact?.displayName || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
}

/**
 * Toggles one participant in Threadline's single-contact DM selection.
 * @param {string[]} selectedParticipantDids - Current selected participant DIDs.
 * @param {string} participantDid - Participant to select or clear.
 * @returns {string[]} Next selection containing zero or one DID.
 */
export function toggleDmSelectedParticipant(selectedParticipantDids, participantDid) {
  const normalizedDid = String(participantDid || "").trim();
  if (!normalizedDid) {
    return [];
  }
  if (Array.isArray(selectedParticipantDids) && selectedParticipantDids.includes(normalizedDid)) {
    return [];
  }
  return [normalizedDid];
}

/**
 * Builds the numeric values displayed in the DM archive overview.
 * @param {object|null|undefined} catalog - Loaded DM archive catalog.
 * @returns {{conversationCount: number, messageCount: number, participantCount: number}} Overview counts.
 */
export function getDmArchiveOverview(catalog) {
  const manifest = catalog?.manifest || {};
  return {
    conversationCount: Number(manifest.conversationCount) || 0,
    messageCount: Number(manifest.messageCount) || 0,
    participantCount: Number(manifest.participantCount) || 0,
  };
}

/**
 * Returns the small DM conversation preview shown in the workspace.
 * @param {object|null|undefined} catalog - Loaded DM archive catalog.
 * @param {number} maximum - Maximum preview conversations.
 * @returns {object[]} Preview conversation records.
 */
export function getDmArchivePreviewConversations(catalog, maximum = 8) {
  if (!Array.isArray(catalog?.conversations)) {
    return [];
  }
  return catalog.conversations.slice(0, maximum);
}

/**
 * Keeps only participant selections still present in the loaded DM contacts.
 * @param {string[]} selectedParticipantDids - Current selected participant DIDs.
 * @param {object[]} contacts - Current DM contact records.
 * @returns {string[]} Valid participant selection.
 */
export function retainDmSelectedParticipants(selectedParticipantDids, contacts) {
  const contactDids = new Set();
  if (Array.isArray(contacts)) {
    contacts.forEach((contact) => {
      const did = String(contact?.did || "").trim();
      if (did) {
        contactDids.add(did);
      }
    });
  }
  if (!Array.isArray(selectedParticipantDids)) {
    return [];
  }
  return selectedParticipantDids.filter((did) => contactDids.has(String(did || "").trim()));
}

/**
 * Creates the DM archive loading controller.
 * @param {object} actions - App-specific dependencies for requests, persistence, and UI updates.
 * @param {() => object} actions.getState - Returns the current DM workspace state.
 * @param {(nextState: object) => void} actions.setState - Applies updated DM workspace state.
 * @param {(key: string, values?: object) => string} actions.translate - Translation callback.
 * @param {() => void} actions.assertAccess - Throws when DM access is unavailable.
 * @param {() => object|null} actions.getAuthAccount - Returns the active authenticated account.
 * @param {() => string} actions.getAuthAccountDid - Returns the active account DID.
 * @param {(type: string, payload: object, options: object) => Promise<object>} actions.sendRequest - Service-worker request callback.
 * @param {(progress: object) => void} actions.setProgress - Updates the visible DM progress state.
 * @param {() => void} actions.renderWorkspace - Renders the workspace after state changes.
 * @param {() => Promise<void>} actions.savePartnerCache - Persists the refreshed partner cache.
 * @returns {{checkAccess: () => Promise<void>, loadPartners: () => Promise<void>, loadArchive: (checkAccess: () => Promise<void>) => Promise<void>}} DM loading operations.
 */
export function createDmArchiveController(actions) {
  /**
   * Builds one progress callback using localized fallbacks for a request phase.
   * @param {string} titleKey - Translation key for the default progress title.
   * @returns {(progress: object) => void} Service-worker progress callback.
   */
  function createProgressHandler(titleKey) {
    /**
     * Writes one service-worker progress update with localized fallback text.
     * @param {object} progress - Service-worker progress payload.
     * @returns {void}
     */
    function handleProgress(progress) {
      let percent = 0;
      if (Number.isFinite(progress?.percent)) {
        percent = progress.percent;
      }
      actions.setProgress({
        title: progress?.title || actions.translate(titleKey),
        step: progress?.step || actions.translate(titleKey),
        percent,
        detail: progress?.detail || "",
      });
    }
    return handleProgress;
  }

  /**
   * Checks whether the authenticated account may read Direct Messages.
   * @returns {Promise<void>} Resolves when the chat API is reachable.
   */
  async function checkAccess() {
    actions.assertAccess();
    if (!actions.getAuthAccount()) {
      throw new Error(actions.translate("dmLoadRequiresLogin"));
    }
    actions.setProgress({
      title: actions.translate("dmCheckTitle"),
      step: actions.translate("dmCheckStep"),
      percent: 10,
      detail: "",
    });
    const result = await actions.sendRequest("CHECK_DM_ACCESS", {}, { timeoutMs: 120000 });
    actions.setState({ accessChecked: result?.ok === true });
    actions.renderWorkspace();
    actions.setProgress({
      title: actions.translate("dmCheckDoneTitle"),
      step: actions.translate("dmCheckDoneStep"),
      percent: 100,
      detail: actions.translate("dmCheckDoneDetail"),
    });
  }

  /**
   * Loads recent DM partners and then hydrates their avatar assets.
   * @returns {Promise<void>} Resolves after the partner cache has been refreshed.
   */
  async function loadPartners() {
    actions.assertAccess();
    if (!actions.getAuthAccount()) {
      throw new Error(actions.translate("dmLoadRequiresLogin"));
    }
    actions.setProgress({
      title: actions.translate("dmPartnersLoadingTitle"),
      step: actions.translate("dmPartnersLoadingStep"),
      percent: 12,
      detail: "",
    });
    const result = await actions.sendRequest("LIST_DM_PARTNERS", { downloadAssets: false }, {
      timeoutMs: 600000,
      onProgress: createProgressHandler("dmPartnersLoadingTitle"),
    });
    let recentContacts = [];
    let recentConversations = [];
    if (Array.isArray(result?.recentContacts)) {
      recentContacts = result.recentContacts;
    }
    if (Array.isArray(result?.conversations)) {
      recentConversations = result.conversations;
    }
    const state = actions.getState();
    actions.setState({
      accessChecked: true,
      recentContacts,
      recentConversations,
      recentContactAssets: [],
      partnerCacheAccountDid: actions.getAuthAccountDid(),
      partnerCacheUpdatedAt: "",
      selectedParticipantDids: retainDmSelectedParticipants(state.selectedParticipantDids, recentContacts),
    });
    actions.renderWorkspace();
    await actions.savePartnerCache();
    actions.setProgress({
      title: actions.translate("dmPartnersLoadingTitle"),
      step: "Partnerliste geladen",
      percent: 55,
      detail: `${recentContacts.length} DM-Partner werden angezeigt. Avatar-Bilder werden jetzt gesichert …`,
    });
    const hydrated = await actions.sendRequest("HYDRATE_DM_PARTNER_AVATARS", {
      recentContacts,
      conversations: recentConversations,
    }, {
      timeoutMs: 600000,
      onProgress: createProgressHandler("dmPartnersLoadingTitle"),
    });
    if (Array.isArray(hydrated?.recentContacts)) {
      recentContacts = hydrated.recentContacts;
    }
    if (Array.isArray(hydrated?.conversations)) {
      recentConversations = hydrated.conversations;
    }
    let recentContactAssets = [];
    if (Array.isArray(hydrated?.assets)) {
      recentContactAssets = hydrated.assets;
    }
    const hydratedState = actions.getState();
    actions.setState({
      recentContacts,
      recentConversations,
      recentContactAssets,
      selectedParticipantDids: retainDmSelectedParticipants(hydratedState.selectedParticipantDids, recentContacts),
    });
    actions.renderWorkspace();
    await actions.savePartnerCache();
    actions.setProgress({
      title: actions.translate("dmPartnersDoneTitle"),
      step: actions.translate("dmPartnersDoneStep"),
      percent: 100,
      detail: actions.translate("dmPartnersDoneDetail", { count: recentContacts.length }),
    });
  }

  /**
   * Loads the selected DM conversation archive with the active date filters.
   * @param {() => Promise<void>} checkAccessBeforeLoad - Access check used when it has not run yet.
   * @returns {Promise<void>} Resolves after the archive and partner cache are updated.
   */
  async function loadArchive(checkAccessBeforeLoad) {
    actions.assertAccess();
    if (!actions.getAuthAccount()) {
      throw new Error(actions.translate("dmLoadRequiresLogin"));
    }
    const state = actions.getState();
    if (!Array.isArray(state.selectedParticipantDids) || state.selectedParticipantDids.length !== 1) {
      throw new Error(actions.translate("dmNeedPartnerSelection"));
    }
    if (!state.accessChecked) {
      await checkAccessBeforeLoad();
    }
    const latestState = actions.getState();
    const filters = getDmArchiveFilters(latestState.selectedParticipantDids, latestState.from, latestState.to);
    actions.setProgress({
      title: actions.translate("dmProgressLoadingTitle"),
      step: actions.translate("dmProgressLoadingStep"),
      percent: 4,
      detail: "",
    });
    const catalog = await actions.sendRequest("EXPORT_DM_ARCHIVE", {
      filters,
      partnerCache: {
        recentContacts: Array.isArray(latestState.recentContacts) ? latestState.recentContacts : [],
        conversations: Array.isArray(latestState.recentConversations) ? latestState.recentConversations : [],
        assets: Array.isArray(latestState.recentContactAssets) ? latestState.recentContactAssets : [],
      },
    }, {
      timeoutMs: 600000,
      onProgress: createProgressHandler("dmProgressLoadingTitle"),
    });
    let recentContacts = [];
    let recentConversations = [];
    let recentContactAssets = [];
    if (Array.isArray(catalog?.recentContacts)) {
      recentContacts = catalog.recentContacts;
    }
    if (Array.isArray(catalog?.conversations)) {
      recentConversations = catalog.conversations;
    }
    if (Array.isArray(catalog?.assets)) {
      recentContactAssets = catalog.assets.filter((asset) => String(asset?.path || "").startsWith("dm-avatars/"));
    }
    actions.setState({
      catalog,
      recentContacts,
      recentConversations,
      recentContactAssets,
      partnerCacheAccountDid: actions.getAuthAccountDid(),
      selectedParticipantDids: retainDmSelectedParticipants(latestState.selectedParticipantDids, recentContacts),
    });
    actions.renderWorkspace();
    await actions.savePartnerCache();
    actions.setProgress({
      title: actions.translate("dmProgressDoneTitle"),
      step: actions.translate("dmProgressDoneStep"),
      percent: 100,
      detail: actions.translate("dmLoadedNotice", {
        conversations: catalog?.manifest?.conversationCount || 0,
        messages: catalog?.manifest?.messageCount || 0,
      }),
    });
  }

  return { checkAccess, loadPartners, loadArchive };
}

/**
 * Binds the Direct Message archive workspace controls to supplied actions.
 * @param {object} elements - DM search, date, loading and export controls.
 * @param {object} actions - Event callbacks for the workspace controls.
 * @returns {number} Number of listeners bound.
 */
export function bindDmArchiveEvents(elements = {}, actions = {}) {
  let boundCount = 0;
  const bind = (target, type, handler) => {
    if (!target || typeof handler !== "function") {
      return;
    }
    target.addEventListener(type, handler);
    boundCount += 1;
  };
  bind(elements.contactSearchInput, "input", actions.contactSearchInput);
  bind(elements.checkButton, "click", actions.checkClick);
  bind(elements.loadPartnersButton, "click", actions.loadPartnersClick);
  bind(elements.fromInput, "change", actions.dateChange);
  bind(elements.toInput, "change", actions.dateChange);
  bind(elements.loadButton, "click", actions.loadClick);
  bind(elements.exportJsonButton, "click", actions.exportJsonClick);
  bind(elements.exportHtmlButton, "click", actions.exportHtmlClick);
  bind(elements.exportPdfButton, "click", actions.exportPdfClick);
  return boundCount;
}

/**
 * Creates the renderer for the Direct Message archive workspace.
 * @param {object} elements - Direct Message workspace elements and templates.
 * @param {HTMLElement|null|undefined} elements.launchPanel - Access-controlled workspace launcher.
 * @param {HTMLInputElement|null|undefined} elements.contactSearchInput - Contact query field.
 * @param {HTMLElement|null|undefined} elements.contactList - Contact chip container.
 * @param {HTMLElement|null|undefined} elements.contactSearchNote - Inline contact-search note.
 * @param {HTMLElement|null|undefined} elements.contactSelectionNote - Selected-contact note.
 * @param {HTMLElement|null|undefined} elements.summary - Archive summary container.
 * @param {HTMLElement|null|undefined} elements.results - Conversation preview container.
 * @param {HTMLButtonElement|null|undefined} elements.checkButton - Access-check button.
 * @param {HTMLButtonElement|null|undefined} elements.loadPartnersButton - Partner loading button.
 * @param {HTMLButtonElement|null|undefined} elements.loadButton - Archive loading button.
 * @param {HTMLButtonElement|null|undefined} elements.exportJsonButton - JSON export button.
 * @param {HTMLButtonElement|null|undefined} elements.exportHtmlButton - HTML export button.
 * @param {HTMLButtonElement|null|undefined} elements.exportPdfButton - PDF export button.
 * @param {HTMLTemplateElement|null|undefined} elements.summaryItemTemplate - Summary item template.
 * @param {HTMLTemplateElement|null|undefined} elements.contactItemTemplate - Contact item template.
 * @param {HTMLTemplateElement|null|undefined} elements.resultItemTemplate - Conversation result template.
 * @param {object} actions - App-specific data and browser callbacks.
 * @param {() => object} actions.getState - Returns the current DM workspace state.
 * @param {(nextSelection: string[]) => void} actions.setSelectedParticipantDids - Updates selected DM participants.
 * @param {() => void} actions.renderWorkspace - Re-renders after a contact selection changed.
 * @param {(key: string, values?: object) => string} actions.translate - Translation callback.
 * @param {() => string} actions.getLocale - Returns the active locale.
 * @param {(asset: object) => string} actions.assetToDataUri - Resolves a saved avatar asset.
 * @param {(image: HTMLImageElement, source: string, fallback: string) => void} actions.setAvatarImage - Writes a safe avatar image.
 * @param {(conversation: object, catalog: object) => string} actions.getConversationTitle - Builds a conversation title.
 * @param {(value: string) => string} actions.formatTimestamp - Formats a conversation timestamp.
 * @param {(message: string) => void} actions.setContactSearchNote - Writes the contact search note.
 * @param {(element: HTMLElement|null, visible: boolean) => void} actions.setElementVisibility - Toggles one element.
 * @param {() => boolean} actions.isAccessAvailable - Returns whether the DM workspace is unlocked.
 * @param {() => object|null} actions.getAuthAccount - Returns the authenticated account.
 * @param {(template: HTMLTemplateElement|null|undefined) => DocumentFragment|null} actions.cloneTemplateContent - Clones one workspace template.
 * @returns {{renderContacts: () => void, renderResults: () => void, renderSummary: () => void, renderWorkspace: () => void}} DM workspace renderer.
 */
export function createDmArchiveWorkspaceRenderer(elements, actions) {
  /**
   * Renders numeric archive counts in the result summary.
   * @returns {void}
   */
  function renderSummary() {
    if (!elements.summary) {
      return;
    }
    elements.summary.replaceChildren();
    const overview = getDmArchiveOverview(actions.getState().catalog);
    const items = [
      { key: "dmSummaryConversationsLabel", value: overview.conversationCount },
      { key: "dmSummaryMessagesLabel", value: overview.messageCount },
      { key: "dmSummaryParticipantsLabel", value: overview.participantCount },
    ];
    items.forEach((item) => {
      const fragment = actions.cloneTemplateContent(elements.summaryItemTemplate);
      if (!fragment) {
        return;
      }
      const label = fragment.querySelector(".archive-summary-label");
      const value = fragment.querySelector("strong");
      label.textContent = actions.translate(item.key);
      value.textContent = String(item.value);
      elements.summary.appendChild(fragment);
    });
  }

  /**
   * Renders filterable contact buttons and selection feedback.
   * @returns {void}
   */
  function renderContacts() {
    if (!elements.contactList || !elements.contactSelectionNote) {
      return;
    }
    const state = actions.getState();
    const contacts = Array.isArray(state.recentContacts) ? state.recentContacts : [];
    const selectedParticipantDids = Array.isArray(state.selectedParticipantDids) ? state.selectedParticipantDids : [];
    const query = String(elements.contactSearchInput?.value || "").trim().toLowerCase();
    const contactAssetUris = new Map();
    const assets = Array.isArray(state.recentContactAssets) ? state.recentContactAssets : [];
    assets.forEach((asset) => {
      const path = String(asset?.path || "");
      if (path) {
        contactAssetUris.set(path, actions.assetToDataUri(asset));
      }
    });
    const visibleContacts = getDmVisibleContacts(contacts, query, actions.getLocale());
    elements.contactList.replaceChildren();
    if (visibleContacts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "settings-note";
      if (contacts.length > 0) {
        empty.textContent = actions.translate("dmContactSearchEmpty");
      } else {
        empty.textContent = actions.translate("dmContactSelectionEmpty");
      }
      elements.contactList.appendChild(empty);
    } else {
      visibleContacts.forEach((contact) => {
        const fragment = actions.cloneTemplateContent(elements.contactItemTemplate);
        if (!fragment) {
          return;
        }
        const button = fragment.querySelector(".dm-contact-chip");
        const avatar = fragment.querySelector(".dm-contact-avatar");
        const name = fragment.querySelector(".dm-contact-chip-name");
        const handle = fragment.querySelector(".dm-contact-chip-handle");
        const did = String(contact?.did || "");
        button.removeAttribute("title");
        name.removeAttribute("title");
        handle.removeAttribute("title");
        if (selectedParticipantDids.includes(did)) {
          button.classList.add("is-selected");
        }
        let avatarUri = "";
        if (contact?.avatarPath) {
          avatarUri = contactAssetUris.get(contact.avatarPath) || "";
        }
        actions.setAvatarImage(avatar, avatarUri, contact?.displayName || contact?.handle || did || "DM contact");
        const fullName = String(contact?.displayName || "").trim();
        const fullHandle = contact?.handle ? `@${contact.handle}` : "";
        const accessibleLabel = [fullName, fullHandle].filter(Boolean).join(" ");
        if (accessibleLabel) {
          button.setAttribute("aria-label", accessibleLabel);
        }
        name.textContent = contact?.displayName || `@${contact?.handle || did}`;
        handle.textContent = `@${contact?.handle || did}`;
        button.addEventListener("click", () => {
          const currentSelection = actions.getState().selectedParticipantDids;
          const nextSelection = toggleDmSelectedParticipant(Array.isArray(currentSelection) ? currentSelection : [], did);
          actions.setSelectedParticipantDids(nextSelection);
          button.classList.toggle("is-selected", nextSelection.includes(did));
          if (nextSelection.length > 0) {
            elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionOne");
          } else if (contacts.length > 0) {
            elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionAll");
          } else {
            elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionEmpty");
          }
          if (elements.loadButton) {
            elements.loadButton.disabled = nextSelection.length !== 1;
          }
        });
        elements.contactList.appendChild(fragment);
      });
    }
    if (!query) {
      actions.setContactSearchNote("");
    } else if (contacts.length === 0) {
      actions.setContactSearchNote(actions.translate("dmContactSelectionEmpty"));
    } else if (visibleContacts.length === 0) {
      actions.setContactSearchNote(actions.translate("dmContactSearchEmpty"));
    } else {
      actions.setContactSearchNote("");
    }
    if (selectedParticipantDids.length > 0) {
      elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionOne");
    } else if (contacts.length > 0) {
      elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionAll");
    } else {
      elements.contactSelectionNote.textContent = actions.translate("dmContactSelectionEmpty");
    }
  }

  /**
   * Renders the compact preview of conversations in the loaded archive.
   * @returns {void}
   */
  function renderResults() {
    if (!elements.results) {
      return;
    }
    const catalog = actions.getState().catalog;
    elements.results.replaceChildren();
    if (!catalog) {
      const empty = document.createElement("p");
      empty.className = "settings-note";
      empty.textContent = actions.translate("dmResultsEmpty");
      elements.results.appendChild(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = "archive-results";
    getDmArchivePreviewConversations(catalog).forEach((conversation) => {
      const fragment = actions.cloneTemplateContent(elements.resultItemTemplate);
      if (!fragment) {
        return;
      }
      const title = fragment.querySelector("h4");
      const note = fragment.querySelector(".settings-note");
      title.textContent = actions.getConversationTitle(conversation, catalog);
      note.textContent = actions.translate("dmConversationMeta", {
        messages: conversation?.messageCount || 0,
        updatedAt: actions.formatTimestamp(conversation?.lastMessageAt || conversation?.updatedAt || ""),
      });
      list.appendChild(fragment);
    });
    elements.results.appendChild(list);
  }

  /**
   * Refreshes every visible section and action state of the DM workspace.
   * @returns {void}
   */
  function renderWorkspace() {
    const state = actions.getState();
    const accessAvailable = actions.isAccessAvailable();
    actions.setElementVisibility(elements.launchPanel, accessAvailable);
    renderContacts();
    renderSummary();
    renderResults();
    if (elements.checkButton) {
      elements.checkButton.disabled = !actions.getAuthAccount() || !accessAvailable;
    }
    if (elements.loadPartnersButton) {
      elements.loadPartnersButton.disabled = !actions.getAuthAccount() || !accessAvailable;
    }
    if (elements.loadButton) {
      elements.loadButton.disabled = !actions.getAuthAccount() || !accessAvailable || state.selectedParticipantDids.length !== 1;
    }
    if (elements.exportJsonButton) {
      elements.exportJsonButton.disabled = !accessAvailable || !state.catalog;
    }
    if (elements.exportHtmlButton) {
      elements.exportHtmlButton.disabled = !accessAvailable || !state.catalog;
    }
    if (elements.exportPdfButton) {
      elements.exportPdfButton.disabled = !accessAvailable || !state.catalog;
    }
  }

  return { renderContacts, renderResults, renderSummary, renderWorkspace };
}

/**
 * Creates the Direct Message archive export controller.
 * @param {object} actions - App-specific rendering and browser export adapters.
 * @param {() => void} actions.assertAccess - Throws when DM access is unavailable.
 * @param {() => Promise<boolean>} actions.confirmExport - Confirms the sensitive export handoff.
 * @param {(key: string, values?: object) => string} actions.translate - Translation callback.
 * @param {(progress: object) => void} actions.setProgress - Updates visible DM export progress.
 * @param {(parts: BlobPart[], name: string, type: string) => File} actions.createFile - Creates a browser file for download.
 * @param {(file: File, name: string) => Promise<void>} actions.shareOrDownloadFile - Shares or downloads an exported file.
 * @param {(catalog: object) => Promise<void>} actions.ensureAvatarAssets - Ensures DM avatar assets exist before visual exports.
 * @param {(catalog: object) => string|Promise<string>} actions.buildHtmlDocument - Renders an HTML archive document.
 * @param {(catalog: object) => string} actions.getFileBaseName - Builds an export file base name.
 * @param {(catalog: object) => object[]} actions.collectMessages - Collects normalized export messages.
 * @param {(messages: object[], catalog: object) => object[][]} actions.paginatePdfMessages - Paginates messages for PDF rendering.
 * @param {(catalog: object, assetMap: Map<string, object>, entries: object[], pageIndex: number, pageCount: number) => Promise<object>} actions.renderPdfPage - Renders one PDF page image.
 * @param {(pages: object[], options: object) => Blob} actions.buildPdfFile - Creates the PDF document blob.
 * @param {(catalog: object) => string} actions.getConversationTitle - Builds the PDF document title.
 * @returns {{exportHtml: (catalog: object) => Promise<void>, exportJson: (catalog: object) => Promise<void>, exportPdf: (catalog: object) => Promise<void>}} DM archive export operations.
 */
export function createDmArchiveExportController(actions) {
  /**
   * Verifies that an archive catalog is present before creating an export.
   * @param {object|null|undefined} catalog - Requested archive catalog.
   * @returns {object} Valid archive catalog.
   */
  function requireCatalog(catalog) {
    actions.assertAccess();
    if (!catalog) {
      throw new Error(actions.translate("dmNeedArchive"));
    }
    return catalog;
  }

  async function confirmSensitiveExport() {
    return Boolean(await actions.confirmExport());
  }

  /**
   * Updates the progress panel after an export completed.
   * @param {string} detailKey - Translation key for the completion detail.
   * @returns {void}
   */
  function setDoneProgress(detailKey) {
    actions.setProgress({
      title: actions.translate("dmProgressDoneTitle"),
      step: actions.translate("dmProgressDoneStep"),
      percent: 100,
      detail: actions.translate(detailKey),
    });
  }

  /**
   * Exports the loaded Direct Message catalog as JSON.
   * @param {object|null|undefined} catalog - Archive catalog to export.
   * @returns {Promise<void>} Resolves after the file was offered to the user.
   */
  async function exportJson(catalog) {
    const validCatalog = requireCatalog(catalog);
    if (!await confirmSensitiveExport()) { return; }
    actions.setProgress({
      title: actions.translate("dmProgressExportTitle"),
      step: actions.translate("dmProgressExportStep"),
      percent: 90,
      detail: actions.translate("dmProgressExportDetail", { count: validCatalog.manifest?.messageCount || 0 }),
    });
    const payload = JSON.stringify(validCatalog, null, 2);
    const fileName = `threadline-dm-archive-${new Date().toISOString().slice(0, 10)}.json`;
    const file = actions.createFile([payload], fileName, "application/json");
    await actions.shareOrDownloadFile(file, fileName);
    setDoneProgress("dmExportDone");
  }

  /**
   * Exports the loaded Direct Message catalog as a searchable HTML document.
   * @param {object|null|undefined} catalog - Archive catalog to export.
   * @returns {Promise<void>} Resolves after the file was offered to the user.
   */
  async function exportHtml(catalog) {
    const validCatalog = requireCatalog(catalog);
    if (!await confirmSensitiveExport()) { return; }
    await actions.ensureAvatarAssets(validCatalog);
    actions.setProgress({
      title: actions.translate("dmProgressHtmlTitle"),
      step: actions.translate("dmProgressHtmlStep"),
      percent: 92,
      detail: actions.translate("dmProgressHtmlDetail", { count: validCatalog.manifest?.messageCount || 0 }),
    });
    const html = await actions.buildHtmlDocument(validCatalog);
    const fileName = `${actions.getFileBaseName(validCatalog)}.html`;
    const file = actions.createFile([html], fileName, "text/html");
    await actions.shareOrDownloadFile(file, fileName);
    setDoneProgress("dmHtmlDone");
  }

  /**
   * Exports the loaded Direct Message catalog as a paginated PDF.
   * @param {object|null|undefined} catalog - Archive catalog to export.
   * @returns {Promise<void>} Resolves after the file was offered to the user.
   */
  async function exportPdf(catalog) {
    const validCatalog = requireCatalog(catalog);
    if (!await confirmSensitiveExport()) { return; }
    await actions.ensureAvatarAssets(validCatalog);
    const messages = actions.collectMessages(validCatalog);
    const assetMap = new Map();
    const assets = Array.isArray(validCatalog.assets) ? validCatalog.assets : [];
    assets.forEach((asset) => {
      const path = String(asset?.path || "");
      if (path) {
        assetMap.set(path, asset);
      }
    });
    const pagesData = actions.paginatePdfMessages(messages, validCatalog);
    const pages = [];
    for (const [pageIndex, entries] of pagesData.entries()) {
      actions.setProgress({
        title: actions.translate("dmProgressPdfTitle"),
        step: actions.translate("dmProgressPdfStep", { index: pageIndex + 1, count: pagesData.length }),
        percent: Math.round((pageIndex / Math.max(1, pagesData.length)) * 100),
        detail: actions.translate("dmProgressPdfDetail", { count: messages.length }),
      });
      const rendered = await actions.renderPdfPage(validCatalog, assetMap, entries, pageIndex, pagesData.length);
      pages.push({
        content: `q 595 0 0 842 0 0 cm /PageImage${pageIndex + 1} Do Q`,
        images: [{
          name: `PageImage${pageIndex + 1}`,
          width: rendered.width,
          height: rendered.height,
          bytes: rendered.bytes,
        }],
        annotations: rendered.annotations,
      });
    }
    const blob = actions.buildPdfFile(pages, {
      title: actions.getConversationTitle(validCatalog.conversations?.[0], validCatalog),
    });
    const fileName = `${actions.getFileBaseName(validCatalog)}.pdf`;
    const file = actions.createFile([blob], fileName, "application/pdf");
    await actions.shareOrDownloadFile(file, fileName);
    setDoneProgress("dmPdfDone");
  }

  return { exportHtml, exportJson, exportPdf };
}

/** Creates the optional DM access gate with explicit URL, storage, crypto and UI adapters.
 * @param {object} options - enabled, query/hash/session keys, secretHash; state checked/unlocked accessors; href, replaceUrl, storage, crypto, setVisible, workspace, showComposer, render, updateAuth, restoreWorkspace, report and lockedMessage.
 * @returns {object} Frozen gate operations. This feature gate is not server authorization.
 */
export function createDmAccessGate(options) {
  for (const key of ['href','replaceUrl','setVisible','workspace','showComposer','render','updateAuth','restoreWorkspace','report','lockedMessage']) {
    if(typeof options?.[key] !== 'function') { throw new TypeError('DM gate requires ' + key); }
  }
  const { state, enabled: DM_ACCESS_GATE_ENABLED, queryKey: DM_ACCESS_QUERY_PARAM, hashKey: DM_ACCESS_HASH_PARAM,
    sessionKey: DM_ACCESS_SESSION_KEY, secretHash: DM_ACCESS_SECRET_HASH } = options;
  function getDmSecretFromLocation() {
    const url = new URL(options.href());
    const querySecret = url.searchParams.get(DM_ACCESS_QUERY_PARAM);
    if (querySecret) {
      return querySecret.trim();
    }

    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    return String(hashParams.get(DM_ACCESS_HASH_PARAM) || "").trim();
  }

  function clearDmSecretFromLocation() {
    const url = new URL(options.href());
    url.searchParams.delete(DM_ACCESS_QUERY_PARAM);
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    hashParams.delete(DM_ACCESS_HASH_PARAM);
    const nextHash = hashParams.toString();
    const nextUrl = `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ""}`;
    options.replaceUrl(nextUrl);
  }

  function isDmAccessAvailable() {
    return !DM_ACCESS_GATE_ENABLED || state.unlocked;
  }

  async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await options.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
  }

  async function applyDmAccessGateFromLocation() {
    if (!DM_ACCESS_GATE_ENABLED) {
      state.unlocked = true;
      state.checked = true;
      options.storage.removeItem(DM_ACCESS_SESSION_KEY);
      options.setVisible(true);
      const secret = getDmSecretFromLocation();
      if (secret) {
        clearDmSecretFromLocation();
      }
      options.render();
      options.updateAuth();
      options.restoreWorkspace();
      return;
    }

    const unlockedInSession = options.storage.getItem(DM_ACCESS_SESSION_KEY) === "1";
    const secret = getDmSecretFromLocation();
    let unlocked = unlockedInSession;

    if (!unlocked && secret) {
      try {
        unlocked = await sha256Hex(secret) === DM_ACCESS_SECRET_HASH;
      } catch (error) {
        options.report(error);
        unlocked = false;
      }
    }

    state.unlocked = unlocked;
    if (state.unlocked) {
      options.storage.setItem(DM_ACCESS_SESSION_KEY, "1");
      state.checked = true;
    } else {
      options.storage.removeItem(DM_ACCESS_SESSION_KEY);
      state.checked = false;
    }

    options.setVisible(isDmAccessAvailable());
    if (!isDmAccessAvailable() && options.workspace() === "dm") {
      options.showComposer();
    }

    if (secret) {
      clearDmSecretFromLocation();
    }

    options.render();
    options.updateAuth();
    options.restoreWorkspace();
  }

  function assertDmAccessUnlocked() {
    if (!isDmAccessAvailable()) {
      throw new Error(options.lockedMessage());
    }
  }
  return Object.freeze({ apply: applyDmAccessGateFromLocation, available: isDmAccessAvailable, assert: assertDmAccessUnlocked,
    secret: getDmSecretFromLocation, clear: clearDmSecretFromLocation });
}

/** Owns account-bound partner cache projection, persistence and picker selection.
 * @param {object} state - Live partner/selection values and read-only authenticated DID.
 * @param {Element} input - Partner picker input. @param {object} actions - setInput, render, note, translate, request and ISO now callbacks.
 * @returns {object} Frozen apply/save/restore/select operations; stale account restores are ignored.
 */
export function createDmPartnerCacheController(state, input, actions) {
  for (const key of ['setInput','render','note','translate','request','now']) { if (typeof actions?.[key] !== 'function') { throw new TypeError('DM partner cache requires ' + key); } }
  /** Projects a compatible cache into live partner state. @param {object|null} cache - Stored cache. @returns {void} Updated state. */
  function applyDmPartnerCache(cache = null) {
    if (!cache || (cache.accountDid && state.authAccountDid && cache.accountDid !== state.authAccountDid)) {
      state.recentContacts = [];
      state.recentConversations = [];
      state.recentContactAssets = [];
      state.partnerCacheAccountDid = "";
      state.partnerCacheUpdatedAt = "";
      return;
    }

    state.recentContacts = Array.isArray(cache.recentContacts) ? cache.recentContacts : [];
    state.recentConversations = Array.isArray(cache.conversations) ? cache.conversations : [];
    state.recentContactAssets = Array.isArray(cache.assets) ? cache.assets : [];
    state.partnerCacheAccountDid = String(cache.accountDid || state.authAccountDid || "");
    state.partnerCacheUpdatedAt = String(cache.updatedAt || "");
    state.selectedParticipantDids = retainDmSelectedParticipants(state.selectedParticipantDids, state.recentContacts);
  }

  /** Persists a snapshot bound to the current account. @returns {Promise<void>} Storage completion. */
  async function saveDmPartnerCache() {
    if (!state.authAccountDid) {
      return;
    }
    const cache = {
      accountDid: state.authAccountDid,
      updatedAt: actions.now(),
      recentContacts: Array.isArray(state.recentContacts) ? state.recentContacts : [],
      conversations: Array.isArray(state.recentConversations) ? state.recentConversations : [],
      assets: Array.isArray(state.recentContactAssets) ? state.recentContactAssets : [],
    };
    state.partnerCacheAccountDid = cache.accountDid;
    state.partnerCacheUpdatedAt = cache.updatedAt;
    await actions.request("SAVE_DM_PARTNER_CACHE", { cache }, { timeoutMs: 120000 });
  }

  /** Restores partners only if the account still matches the request context. @returns {Promise<void>} Applied or ignored restore. */
  async function restoreDmPartnerCache() {
    const accountDid = state.authAccountDid;
    const cache = await actions.request("GET_DM_PARTNER_CACHE", {}, { timeoutMs: 120000 }).catch(() => null);
    if (accountDid !== state.authAccountDid) { return; }
    applyDmPartnerCache(cache);
  }

  /** Selects a loaded partner by DID or handle. @param {object|null} actor - Picker result. @param {string} value - Selected text. @returns {void} Updated selection and note. */
  function applyDmContactPickerSelection(actor, value) {
    const normalizedValue = String(value || actor?.handle || actor?.did || "").trim();
    const normalizedHandle = String(actor?.handle || normalizedValue).trim().replace(/^@/, "").toLowerCase();
    const normalizedDid = String(actor?.did || "").trim().toLowerCase();
    actions.setInput(input, normalizedValue);

    let matchedDid = "";
    for (const contact of Array.isArray(state.recentContacts) ? state.recentContacts : []) {
      const contactDid = String(contact?.did || "").trim();
      const contactDidLower = contactDid.toLowerCase();
      const contactHandle = String(contact?.handle || "").trim().replace(/^@/, "").toLowerCase();
      if (normalizedDid && contactDidLower === normalizedDid) {
        matchedDid = contactDid;
        break;
      }
      if (normalizedHandle && contactHandle === normalizedHandle) {
        matchedDid = contactDid;
        break;
      }
    }

    if (matchedDid) {
      state.selectedParticipantDids = [matchedDid];
    } else {
      state.selectedParticipantDids = [];
    }
    actions.render();
    if (matchedDid) {
      actions.note("");
    } else {
      actions.note(actions.translate("dmContactNotLoadedMatch"));
    }
  }
  return Object.freeze({ apply: applyDmPartnerCache, save: saveDmPartnerCache, restore: restoreDmPartnerCache, select: applyDmContactPickerSelection });
}
