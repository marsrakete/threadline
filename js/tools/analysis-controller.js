/** Identifies expected account validation failures. @param {unknown} error - Worker failure. @returns {boolean} Whether logging should be suppressed. */
export function isExpectedAnalysisAccountError(error) {
  const errorCode = String(error?.details?.code || "").trim();
  return errorCode === "ANALYSIS_ACCOUNT_NOT_FOUND" || errorCode === "ANALYSIS_ACCOUNT_MISSING";
}

/** Creates analysis workflow/control orchestration. @param {object} elements - Inputs, notes, buttons and option controls. @param {object} options - Explicit live state, locale, transport, calculation, storage and UI adapters. @returns {object} Formatting, controls, storage and request operations. */
export function createAnalysisController(elements, options) {
  const state = options.state;
  const t = options.t;
  /** Gets a slot input. @param {string} slot - Slot. @returns {object|null} Input. */
  function slotInput(slot) { if (slot === "a") { return elements.inputA; } return elements.inputB; }
  /** Gets slot-specific translated copy. @param {string} slot - Slot. @param {string} a - A key. @param {string} b - B key. @returns {string} Copy. */
  function slotText(slot, a, b) { if (slot === "a") { return t(a); } return t(b); }
  /** Gets the display slot letter. @param {string} slot - Slot. @returns {string} A or B. */
  function slotLetter(slot) { if (slot === "a") { return "A"; } return "B"; }
  /** Gets the compare-button text. @returns {string} Copy. */
  function loadingText() { if (state.loading) { return t("analysisLoadingButton"); } return t("analysisCompareButton"); }
  /** Parses persisted numeric choices including null-as-zero compatibility. @param {*} value - Stored value. @param {number} fallback - Default. @returns {number} Choice. */
  function storedNumber(value, fallback) { if (Number.isFinite(Number(value))) { return Number(value); } return fallback; }
  /** Projects only summary comparison metadata into storage. @returns {object|null} Comparison summary. */
  function comparisonSnapshot() {
    if (!state.comparison || typeof state.comparison !== "object") { return null; }
    return { score: Math.max(0, Number(state.comparison.score) || 0), labelKey: String(state.comparison.labelKey || "").trim(),
      confidenceKey: String(state.comparison.confidenceKey || "").trim() };
  }

  /** Updates a slot's validation note. @param {string} slot - a or b. @param {string} message - Warning. @returns {void} */
  function setAnalysisAccountFieldNote(slot, message = "") {
    let note = elements.noteB;
    if (slot === "a") {
      note = elements.noteA;
    }
    options.note(note, message);
  }

  /** Loads both slots sequentially, compares and persists results. @returns {Promise<void>} Completion. */
  async function runAnalysisComparison() {
    if (!state.auth || state.loading) {
      return;
    }
    const actorA = elements.inputA?.value || "";
    const actorB = elements.inputB?.value || "";
    if (!options.actor(actorA)) {
      options.error(t("analysisAccountAMissing"), t("archiveErrorTitle"));
      return;
    }
    if (!options.actor(actorB)) {
      options.error(t("analysisAccountBMissing"), t("archiveErrorTitle"));
      return;
    }

    const requestToken = ++state.requestToken;
    state.loading = true;
    state.comparison = null;
    updateAnalysisControls();

    try {
      const loadedA = await loadAnalysisAccountForSlot("a", { actor: actorA, requestToken });
      const loadedB = await loadAnalysisAccountForSlot("b", { actor: actorB, requestToken });
      if (!loadedA || !loadedB || requestToken !== state.requestToken) {
        return;
      }
      state.accountA = loadedA;
      state.accountB = loadedB;
      state.comparison = options.compare(loadedA, loadedB);
      setAnalysisStatus(t("analysisComparisonReady", {
        left: loadedA.profile.handle || loadedA.profile.displayName || loadedA.profile.did,
        right: loadedB.profile.handle || loadedB.profile.displayName || loadedB.profile.did,
      }));
      options.render();
      await options.persist();
    } catch (error) {
      if (!isExpectedAnalysisAccountError(error)) {
        options.report(error);
      }
      if (!state.accountA) {
        setAnalysisAccountFieldNote("a", error.message || t("analysisLoadFailed"));
      }
      if (!state.accountB) {
        setAnalysisAccountFieldNote("b", error.message || t("analysisLoadFailed"));
      }
      setAnalysisStatus(error.message || t("analysisLoadFailed"));
      options.error(error.message || t("analysisLoadFailed"), t("archiveErrorTitle"));
    } finally {
      if (requestToken === state.requestToken) {
        state.loading = false;
        updateAnalysisControls();
      }
    }
  }

  /** Formats a locale-aware numeric value. @param {number} value - Value. @param {number} digits - Fraction digits. @returns {string} Formatted number. */
  function formatAnalysisNumber(value, digits = 2) {
    return new Intl.NumberFormat(options.locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  /** Captures inputs, options and JSON-safe accounts/results. @returns {object} Snapshot. */
  function getPersistableAnalysisState() {
    return {
      inputs: {
        accountA: String(elements.inputA?.value || "").trim(),
        accountB: String(elements.inputB?.value || "").trim(),
      },
      options: getAnalysisOptions(),
      accountA: options.serialize(state.accountA),
      accountB: options.serialize(state.accountB),
      comparison: comparisonSnapshot(),
    };
  }

  /** Loads and applies one slot while owning its busy state. @param {string} slot - a or b. @returns {Promise<void>} Completion. */
  async function handleAnalysisAccountLoad(slot) {
    if (!state.auth || state.loading) {
      return;
    }
    const actor = slotInput(slot)?.value;
    const requestToken = ++state.requestToken;
    state.loading = true;
    state.comparison = null;
    updateAnalysisControls();
    try {
      const loaded = await loadAnalysisAccountForSlot(slot, { actor, requestToken });
      if (!loaded || requestToken !== state.requestToken) {
        return;
      }
      if (slot === "a") {
        state.accountA = loaded;
      } else {
        state.accountB = loaded;
      }
      setAnalysisStatus(t("analysisAccountLoadedStatus", {
        slot: slotLetter(slot),
        account: loaded.profile.handle || loaded.profile.displayName || loaded.profile.did,
      }));
      options.render();
      await options.persist();
    } catch (error) {
      if (!isExpectedAnalysisAccountError(error)) {
        options.report(error);
      }
      setAnalysisAccountFieldNote(slot, error.message || t("analysisLoadFailed"));
      setAnalysisStatus(error.message || t("analysisLoadFailed"));
      options.error(error.message || t("analysisLoadFailed"), t("archiveErrorTitle"));
    } finally {
      if (requestToken === state.requestToken) {
        state.loading = false;
        updateAnalysisControls();
      }
    }
  }

  /** Updates shared and visible status. @param {string} message - Status copy. @returns {void} */
  function setAnalysisStatus(message = "") {
    state.status = String(message || "").trim() || t("analysisStatusIdle");
    if (elements.status) {
      elements.status.textContent = state.status;
    }
  }

  /** Invalidates loads and resets accounts, inputs and defaults. @returns {void} */
  function resetAnalysisWorkspace() {
    state.requestToken += 1;
    state.loading = false;
    state.status = "";
    state.accountA = null;
    state.accountB = null;
    state.comparison = null;
    if (elements.inputA) {
      elements.inputA.value = "";
    }
    if (elements.inputB) {
      elements.inputB.value = "";
    }
    if (elements.range) {
      elements.range.value = "90";
    }
    if (elements.limit) {
      elements.limit.value = "500";
    }
    if (elements.replies) {
      elements.replies.checked = false;
    }
    if (elements.quotes) {
      elements.quotes.checked = false;
    }
    options.render();
    void options.persist();
  }

  /** Applies auth/loading/data-dependent control states. @returns {void} */
  function updateAnalysisControls() {
    const hasAuth = Boolean(state.auth);
    const actorA = options.actor(elements.inputA?.value || "");
    const actorB = options.actor(elements.inputB?.value || "");
    if (elements.loadA) {
      elements.loadA.disabled = state.loading || !hasAuth || !actorA;
    }
    if (elements.loadB) {
      elements.loadB.disabled = state.loading || !hasAuth || !actorB;
    }
    if (elements.ownA) {
      elements.ownA.disabled = state.loading || !hasAuth;
    }
    if (elements.ownB) {
      elements.ownB.disabled = state.loading || !hasAuth;
    }
    if (elements.compare) {
      elements.compare.disabled = state.loading || !hasAuth || !actorA || !actorB;
      elements.compare.textContent = loadingText();
    }
    if (elements.reset) {
      elements.reset.disabled = state.loading || (!state.accountA && !state.accountB && !state.comparison && !actorA && !actorB);
    }
    if (elements.exportPdf) {
      elements.exportPdf.disabled = state.loading || !state.comparison;
    }
  }

  /** Reads normalized range, limits and inclusion toggles. @returns {object} Request options. */
  function getAnalysisOptions() {
    return {
      rangeDays: Math.max(0, Number(elements.range?.value) || 0),
      limit: Math.max(100, Math.min(2000, Number(elements.limit?.value) || 500)),
      includeReplies: elements.replies?.checked === true,
      includeQuotes: elements.quotes?.checked === true,
    };
  }

  /** Restores inputs and derived account comparison. @param {object|null} snapshot - Stored snapshot. @returns {void} */
  function restorePersistedAnalysisState(snapshot = null) {
    let persisted = {};
    if (snapshot && typeof snapshot === "object") { persisted = snapshot; }
    if (elements.inputA) {
      elements.inputA.value = String(persisted.inputs?.accountA || "").trim();
    }
    if (elements.inputB) {
      elements.inputB.value = String(persisted.inputs?.accountB || "").trim();
    }
    if (elements.range) {
      elements.range.value = String(
        storedNumber(persisted.options?.rangeDays, 90),
      );
    }
    if (elements.limit) {
      elements.limit.value = String(
        storedNumber(persisted.options?.limit, 500),
      );
    }
    if (elements.replies) {
      elements.replies.checked = persisted.options?.includeReplies === true;
    }
    if (elements.quotes) {
      elements.quotes.checked = persisted.options?.includeQuotes === true;
    }
    state.accountA = options.normalize(persisted.accountA);
    state.accountB = options.normalize(persisted.accountB);
    const hasLegacyNetworkState = options.needsRefresh(persisted.accountA) || options.needsRefresh(persisted.accountB);
    state.comparison = null;
    if (!hasLegacyNetworkState && state.accountA && state.accountB) {
      state.comparison = options.compare(state.accountA, state.accountB);
    }
    if (hasLegacyNetworkState) {
      state.status = t("analysisNetworkReloadNeeded");
    }
  }

  /** Loads one account with progress and stale-response suppression. @param {string} slot - a or b. @param {object} request - Actor and request token. @returns {Promise<object|null>} Normalized account. */
  async function loadAnalysisAccountForSlot(slot, { actor, requestToken } = {}) {
    const normalizedActor = options.actor(actor);
    if (!normalizedActor) {
      throw new Error(slotText(slot, "analysisAccountAMissing", "analysisAccountBMissing"));
    }
    const slotLabel = slotText(slot, "analysisAccountALabel", "analysisAccountBLabel");
    const result = await options.request("LOAD_ANALYSIS_ACCOUNT", {
      actor: normalizedActor,
      options: getAnalysisOptions(),
    }, {
      timeoutMs: 180000,
      onProgress(progress) {
        if (requestToken !== state.requestToken) {
          return;
        }
        const step = String(progress?.step || "").trim();
        const detail = String(progress?.detail || "").trim();
        setAnalysisStatus([slotLabel, step, detail].filter(Boolean).join(" - "));
      },
    });
    if (requestToken !== state.requestToken) {
      return null;
    }
    return options.normalize(result);
  }

  /** Formats a fractional rate. @param {number} value - Fraction. @returns {string} Percentage. */
  function formatAnalysisPercent(value) {
    return `${formatAnalysisNumber((Number(value) || 0) * 100, 1)}%`;
  }

  /** Validates one actor with per-slot tokens. @param {string} slot - a or b. @param {object} settings - Silent-success setting. @returns {Promise<object|null>} Validated actor or null. */
  async function validateAnalysisAccountInput(slot, { silentSuccess = true } = {}) {
    if (!state.auth || state.loading) {
      return null;
    }
    const input = slotInput(slot);
    const slotLabel = slotText(slot, "analysisAccountALabel", "analysisAccountBLabel");
    const normalizedActor = options.actor(input?.value || "");
    const requestToken = ++state.validationTokens[slot];

    if (input) {
      input.setCustomValidity("");
    }
    setAnalysisAccountFieldNote(slot, "");
    if (!normalizedActor) {
      return null;
    }

    setAnalysisStatus(`${slotLabel} - ${t("analysisAccountCheckingStatus", { account: normalizedActor })}`);

    try {
      const result = await options.request("CHECK_ANALYSIS_ACCOUNT", {
        actor: normalizedActor,
      }, {
        timeoutMs: 30000,
      });
      if (requestToken !== state.validationTokens[slot]) {
        return null;
      }
      if (input) {
        input.value = result?.handle || normalizedActor;
        input.setCustomValidity("");
      }
      setAnalysisAccountFieldNote(slot, "");
      if (!silentSuccess) {
        setAnalysisStatus(t("analysisAccountValidatedStatus", {
          slot: slotLetter(slot),
          account: result?.handle || normalizedActor,
        }));
      } else if (!state.comparison && !state.accountA && !state.accountB) {
        setAnalysisStatus(t("analysisStatusIdle"));
      }
      void options.persist();
      return result;
    } catch (error) {
      if (requestToken !== state.validationTokens[slot]) {
        return null;
      }
      const message = error?.message || t("analysisLoadFailed");
      if (input) {
        input.setCustomValidity(message);
      }
      setAnalysisAccountFieldNote(slot, message);
      setAnalysisStatus(message);
      return null;
    }
  }

  /** Gets the active actor using saved-profile precedence. @returns {string} Actor. */
  function getActiveAnalysisActor() {
    const activeAccount = state.accounts.find((account) => account?.did && account.did === state.authDid) || null;
    const actor = String(
      activeAccount?.handle
      || activeAccount?.identifier
      || state.auth
      || state.authDid
      || "",
    ).trim();
    return actor.replace(/^@+/, "");
  }
  /** Copies the active account into one slot without loading it. @param {string} slot - a or b. @returns {void} */
  function ownAccount(slot) {
    const actor = getActiveAnalysisActor(); const input = slotInput(slot);
    if (!input || !actor) { return; }
    input.value = actor; updateAnalysisControls();
    setAnalysisStatus(t("analysisAccountLoadedStatus", { slot: slotLetter(slot), account: actor }));
    void options.persist();
  }
  /** Invalidates the comparison and pending field validation after typing. @param {object} event - Input event. @returns {void} */
  function accountInput(event) {
    const input = event?.currentTarget;
    if (!input) { return; }
    state.comparison = null; input.setCustomValidity("");
    let slot = "b"; if (input === elements.inputA) { slot = "a"; }
    setAnalysisAccountFieldNote(slot, "");
    if (input === elements.inputA) { state.validationTokens.a += 1; }
    else if (input === elements.inputB) { state.validationTokens.b += 1; }
    updateAnalysisControls(); options.renderResult(); void options.persist();
  }
  /** Validates the field that lost focus. @param {object} event - Blur event. @returns {Promise<object|null>} Validation result. */
  function accountBlur(event) {
    let slot = "b"; if (event?.currentTarget === elements.inputA) { slot = "a"; }
    return validateAnalysisAccountInput(slot);
  }
  /** Runs comparison on Enter without submitting another form. @param {object} event - Keyboard event. @returns {Promise<void>|undefined} Comparison completion. */
  function accountKeydown(event) {
    if (event?.key !== "Enter") { return; }
    event.preventDefault(); return runAnalysisComparison();
  }
  /** Invalidates results when analysis filters change. @returns {void} */
  function optionChange() { state.comparison = null; options.render(); void options.persist(); }
  /** Applies busy/error feedback around report export. @returns {Promise<void>} Completion after success or reported failure. */
  async function exportPdf() {
    try {
      options.busy(elements.exportPdf, true, t("analysisExportPdfWorking"), t("analysisExportPdfButton"));
      await options.exportReport();
    } catch (error) {
      options.report(error); setAnalysisStatus(error.message || t("analysisExportFailed"));
      options.error(error.message || t("analysisExportFailed"), t("archiveErrorTitle"));
    } finally { options.busy(elements.exportPdf, false, t("analysisExportPdfWorking"), t("analysisExportPdfButton")); }
  }
  const handlers = {
    /** Sets own account A. @returns {void} */
    accountAOwn() { ownAccount("a"); },
    /** Sets own account B. @returns {void} */
    accountBOwn() { ownAccount("b"); },
    /** Loads account A. @returns {Promise<void>} Completion. */
    accountALoad() { return handleAnalysisAccountLoad("a"); },
    /** Loads account B. @returns {Promise<void>} Completion. */
    accountBLoad() { return handleAnalysisAccountLoad("b"); },
    compare: runAnalysisComparison, reset: resetAnalysisWorkspace, exportPdf, accountInput, accountBlur, accountKeydown, optionChange,
  };
  return { handlers, activeActor: getActiveAnalysisActor, settings: getAnalysisOptions, status: setAnalysisStatus,
    number: formatAnalysisNumber, percent: formatAnalysisPercent, snapshot: getPersistableAnalysisState,
    restore: restorePersistedAnalysisState, controls: updateAnalysisControls, fieldNote: setAnalysisAccountFieldNote,
    loadAccount: loadAnalysisAccountForSlot, validate: validateAnalysisAccountInput, load: handleAnalysisAccountLoad,
    compare: runAnalysisComparison, reset: resetAnalysisWorkspace };
}

