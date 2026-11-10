/**
 * Reads a value from browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to read from.
 * @param {string} key - Storage key to read.
 * @returns {string} Stored value, or an empty string when unavailable.
 */
export function readBrowserStorageValue(storage, key) {
  try {
    return String(storage.getItem(key) || "").trim();
  } catch {
    return "";
  }
}

/**
 * Stores one string value in browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to write to.
 * @param {string} key - Storage key to write.
 * @param {string} value - Value to store.
 * @returns {boolean} True when the value was stored.
 */
export function writeBrowserStorageValue(storage, key, value) {
  try {
    storage.setItem(key, String(value || ""));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes one value from browser storage without exposing storage access errors to callers.
 * @param {Storage} storage - Browser storage implementation to modify.
 * @param {string} key - Storage key to remove.
 * @returns {boolean} True when the value was removed.
 */
export function removeBrowserStorageValue(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
/**
 * Creates worker-backed startup reads and serialized settings writes.
 * @param {object} options - Worker request, write queue, snapshot and error adapters.
 * @returns {object} Startup loader and settings persistence operation.
 */
export function createApplicationStorage(options) {
  /**
   * Loads required app state and optional caches with their original timeouts.
   * @param {string} browserLocale - Detected startup locale.
   * @returns {Promise<object>} App state and optional cache bundle.
   */
  async function load(browserLocale) {
    const [state, archiveSession, archiveCatalog, dmPartnerCache, accountAvatarCache] = await Promise.all([
      options.request("GET_APP_STATE", { browserLocale }),
      options.request("GET_ARCHIVE_SESSION", {}, { timeoutMs: 30000 }).catch(() => null),
      options.request("GET_ARCHIVE_CATALOG", {}, { timeoutMs: 120000 }).catch(() => null),
      options.request("GET_DM_PARTNER_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
      options.request("GET_ACCOUNT_AVATAR_CACHE", {}, { timeoutMs: 120000 }).catch(() => null),
    ]);
    return { state, archiveSession, archiveCatalog, dmPartnerCache, accountAvatarCache };
  }
  /** Saves a snapshot captured before entering the write queue. @returns {Promise<void>} Completion or reported failure. */
  async function persist() {
    const payload = options.snapshot();
    try {
      await options.queue.enqueue(() => options.request("SAVE_SETTINGS", payload, { timeoutMs: 120000 }));
    } catch (error) {
      options.report(error);
      options.setStatus(error.message, "error");
    }
  }
  return { load, persist };
}


/** Creates the worker MessageChannel request client with explicit timers and cancellation.
 * @param {object} adapters - Ready/controller/channel/clock/translation/abort adapters.
 * @returns {object} Request API.
 */
export function createWorkerRequestClient(adapters) {
  for (const name of ["ready", "controller", "channel", "schedule", "clearTimer", "translate", "abortError"]) {
    if (typeof adapters?.[name] !== "function") { throw new TypeError("Worker request client requires " + name); }
  }
  /** Sends one request, renewing timeout on progress. @param {string} type - Command. @param {object} payload - Input. @param {object} options - Timeout/progress/abort configuration. @returns {Promise<unknown>} Result. */
  async function sendToServiceWorker(type, payload = {}, options = {}) {
    const registration = await adapters.ready();
    const worker = registration.active || adapters.controller();

    if (!worker) {
      throw new Error(adapters.translate("statusNoWorker"));
    }

    return new Promise((resolve, reject) => {
      const channel = adapters.channel();
      const timeoutMs = Math.max(5000, Number(options.timeoutMs) || 15000);
      let timeoutId = null;
      let settled = false;
      const abortSignal = options.signal || null;
      let handleAbort = null;
      const cleanup = () => {
        settled = true;
        adapters.clearTimer(timeoutId);
        channel.port1.onmessage = null;
        channel.port1.close();
        if (abortSignal && handleAbort) {
          abortSignal.removeEventListener("abort", handleAbort);
        }
      };
      const rejectOnce = (error) => {
        if (settled) {
          return;
        }
        cleanup();
        reject(error);
      };
      const resolveOnce = (value) => {
        if (settled) {
          return;
        }
        cleanup();
        resolve(value);
      };
      const createAbortError = () => {
        if (typeof options.createAbortError === "function") {
          return options.createAbortError();
        }
        return adapters.abortError();
      };
      const scheduleTimeout = () => {
        adapters.clearTimer(timeoutId);
        timeoutId = adapters.schedule(() => {
          rejectOnce(new Error(adapters.translate("statusSwTimeout")));
        }, timeoutMs);
      };

      if (abortSignal?.aborted) {
        rejectOnce(createAbortError());
        return;
      }

      handleAbort = () => {
        rejectOnce(createAbortError());
      };
      if (abortSignal) {
        abortSignal.addEventListener("abort", handleAbort, { once: true });
      }

      scheduleTimeout();

      channel.port1.onmessage = (event) => {
        if (settled) {
          return;
        }
        if (event.data?.progress) {
          scheduleTimeout();
          options.onProgress?.(event.data.progress);
          return;
        }

        adapters.clearTimer(timeoutId);

        if (event.data?.ok) {
          resolveOnce(event.data.result);
          return;
        }

        const errorCode = String(event.data?.details?.code || "");
        const localizedServiceWorkerErrors = {
          AUTH_STORAGE_ENCRYPTION_UNAVAILABLE: "authStorageEncryptionUnavailable",
          AUTH_STORAGE_DECRYPT_FAILED: "authStorageDecryptFailed",
          ANALYSIS_ACCOUNT_MISSING: "analysisAccountMissingGeneric",
          ANALYSIS_ACCOUNT_NOT_FOUND: "analysisAccountNotFound",
          ANALYSIS_ACCOUNT_CHECK_FAILED: "analysisAccountCheckFailed",
          POST_EDIT_URL_INVALID: "postEditCheckInvalidUrl",
          POST_EDIT_ACTOR_NOT_FOUND: "postEditCheckActorNotFound",
          POST_EDIT_RECORD_LOAD_FAILED: "postEditCheckLoadFailed",
          POST_EDIT_RECORD_INVALID: "postEditCheckRecordInvalid",
        };
        let errorMessage = event.data?.error || adapters.translate("statusSwUnknownError");
        if (errorCode === "ARCHIVE_ASSET_LOAD_FAILED") {
          errorMessage = adapters.translate("archiveAssetLoadFailed", { status: event.data?.details?.status || "?" });
        } else if (errorCode === "ANALYSIS_ACCOUNT_NOT_FOUND") {
          errorMessage = adapters.translate("analysisAccountNotFound", { account: event.data?.details?.actor || "" });
        } else if (localizedServiceWorkerErrors[errorCode]) {
          errorMessage = adapters.translate(localizedServiceWorkerErrors[errorCode]);
        }
        const error = new Error(errorMessage);
        error.details = event.data?.details || null;
        rejectOnce(error);
      };

      worker.postMessage({ type, payload }, [channel.port2]);
    });
  }
  return { request: sendToServiceWorker };
}
