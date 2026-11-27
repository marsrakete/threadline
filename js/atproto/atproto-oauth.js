let workerOAuthService;

/** Commits OAuth account metadata while retaining its password credentials and session. @param {object} identity - Verified DID, handle and PDS. @returns {Promise<void>} Commit completion. */
async function saveOAuthAccount({ did, handle, pdsUrl }) {
  await updateStoredAuth((state) => {
    const existing = state.accounts.find((account) => account.did === did);
    const next = upsertAccount(state, {
      did, handle, identifier: handle, service: pdsUrl, pdsUrl,
      ...existing,
      authMethod: "oauth",
      oauth: { did },
      updatedAt: new Date().toISOString(),
    });
    next.activeDid = did;
    return next;
  });
}

/** Initializes the isolated OAuth SDK only when it is needed. @returns {object} Worker OAuth operations. */
function getWorkerOAuth() {
  if (!workerOAuthService) {
    globalThis.loadThreadlineOAuthSdk();
    const sdk = globalThis.ThreadlineOAuthSdk;
    const storage = globalThis.createThreadlineOAuthStorage({
      indexedDB, keyRange: IDBKeyRange, crypto, Key: sdk.WebcryptoKey, now: () => Date.now(),
    });
    workerOAuthService = globalThis.createThreadlineOAuthService({
      sdk, storage, crypto, locks: navigator.locks, fetch: (...args) => fetch(...args),
      scopeUrl: self.registration.scope, saveAccount: saveOAuthAccount, error: createServiceWorkerError,
    });
  }
  return workerOAuthService;
}

/** Accepts OAuth operations only from the expected Threadline page in this worker scope. @param {ExtendableMessageEvent} event - Worker message event. @returns {boolean} Whether source and route match. */
function isOAuthMessageSource(event) {
  const base = new URL(self.registration.scope);
  if (event.origin !== base.origin || !event.source?.url) { return false; }
  const source = new URL(event.source.url);
  if (source.origin !== base.origin) { return false; }
  if (event.data.type === "OAUTH_FINISH") {
    return source.pathname === new URL("oauth-callback.html", base).pathname;
  }
  return ["", "index.html", "tools.html"].some((page) => new URL(page, base).pathname === source.pathname);
}
