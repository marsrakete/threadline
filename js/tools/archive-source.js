/**
 * Creates archive source validation, debounce and account-picker integration.
 * @param {object} dependencies - Explicit form, profile, timer and worker adapters.
 * @param {Function} dependencies.value - Reads the current source input.
 * @param {Function} dependencies.write - Writes a selected account through the shared picker.
 * @param {Function} dependencies.profile - Stores a validated profile or null.
 * @param {Function} dependencies.status - Displays plain status text.
 * @param {Function} dependencies.render - Refreshes source identity presentation.
 * @param {Function} dependencies.persist - Persists archive preferences.
 * @param {Function} dependencies.invalidate - Invalidates the previous catalog.
 * @param {Function} dependencies.request - Sends worker messages.
 * @param {Function} dependencies.t - Resolves localized messages.
 * @param {Function} dependencies.schedule - Schedules a timer and returns its handle.
 * @param {Function} dependencies.clear - Cancels a timer handle.
 * @returns {object} validate, schedule, input, select and cancel operations.
 */
export function createArchiveSourceController(dependencies) {
  for (const name of ["value", "write", "profile", "status", "render", "persist", "invalidate", "request", "t", "schedule", "clear"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Archive source requires ${name}.`);
    }
  }
  let token = 0;
  let timer = null;

  /** Cancels a pending timer. @returns {void} */
  function clearTimer() {
    if (timer !== null) {
      dependencies.clear(timer);
      timer = null;
    }
  }

  /** Invalidates pending replies and cancels the scheduled check. @returns {void} */
  function cancel() {
    token += 1;
    clearTimer();
  }

  /**
   * Validates the current actor while ignoring replies for an older input.
   * @param {object} options - Optional silentSuccess flag for deferred checks.
   * @returns {Promise<object|null>} Validated profile, or null for empty/stale/unresolved input.
   */
  async function validate({ silentSuccess = false } = {}) {
    clearTimer();
    const requestToken = ++token;
    const value = String(dependencies.value() || "").trim();
    const actor = value.replace(/^@+/, "");
    /** Checks token and input identity, including writes without an input event. @returns {boolean} Whether this reply still belongs to the form. */
    function current() {
      return token === requestToken && String(dependencies.value() || "").trim() === value;
    }
    if (!actor) {
      dependencies.profile(null);
      dependencies.status("");
      dependencies.render();
      await dependencies.persist();
      return null;
    }
    dependencies.status(dependencies.t("archiveSourceChecking"));
    try {
      const result = await dependencies.request("CHECK_ANALYSIS_ACCOUNT", { actor }, { timeoutMs: 30000 });
      if (!current()) { return null; }
      let profile = null;
      if (result?.did) {
        profile = { did: String(result.did || "").trim(), handle: String(result.handle || actor).trim(),
          displayName: String(result.displayName || result.handle || actor).trim(), avatar: String(result.avatar || "").trim() };
      }
      dependencies.profile(profile);
      if (!silentSuccess) { dependencies.status(dependencies.t("archiveSourceValidated", { account: profile?.handle || actor })); }
      dependencies.render();
      await dependencies.persist();
      if (!current()) { return null; }
      return profile;
    } catch (error) {
      if (!current()) { return null; }
      dependencies.profile(null);
      dependencies.status(error?.message || dependencies.t("archiveSourceInvalid"));
      dependencies.render();
      await dependencies.persist();
      throw error;
    }
  }

  /** Replaces the deferred check with one quiet validation after 1800 ms. @returns {void} */
  function schedule() {
    clearTimer();
    timer = dependencies.schedule(() => {
      timer = null;
      void validate({ silentSuccess: true }).catch(() => {});
    }, 1800);
  }

  /** Invalidates old input/profile/catalog state and schedules a new check. @returns {void} */
  function input() {
    cancel();
    dependencies.profile(null);
    dependencies.status("");
    dependencies.render();
    schedule();
    dependencies.invalidate();
    void dependencies.persist();
  }

  /**
   * Applies the selected account and checks it immediately, replacing any debounce timer.
   * @param {object} actor - Picker result with optional handle and DID.
   * @param {string} value - Preferred selected field value.
   * @returns {void} Validation errors remain visible in source status.
   */
  function select(actor, value) {
    const selected = String(value || actor?.handle || actor?.did || "").trim();
    dependencies.write(selected);
    void validate({ silentSuccess: false }).catch(() => {});
  }

  return { validate, schedule, input, select, cancel };
}
