/** Manages the OAuth SDK, callback and authenticated transport inside the service worker. @param {object} options - SDK, platform, account and network dependencies. @returns {object} OAuth operations. */
globalThis.createThreadlineOAuthService = function createThreadlineOAuthService(options) {
  const { sdk, storage, crypto, locks, fetch, scopeUrl, saveAccount, error } = options;
  const metadataUrl = new URL("oauth-client-metadata.json", scopeUrl);
  const callbackUrl = new URL("oauth-callback.html", scopeUrl);
  const chatScope = "rpc?lxm=chat.bsky.convo.getMessages&lxm=chat.bsky.convo.listConvos&aud=did:web:api.bsky.chat%23bsky_chat";
  let clientPromise;

  /** Locks a callback or SDK operation across worker restarts and tabs. @param {string} key - Lock identifier. @param {Function} run - Operation. @returns {Promise<unknown>} Result. */
  function lock(key, run) {
    if (!locks) { throw error("Browser locking is unavailable", "OAUTH_UNAVAILABLE"); }
    return locks.request("threadline-oauth:" + key, run);
  }

  /** Produces only the approved HTTPS metadata configuration. @returns {Promise<object>} OAuth client and declared scopes. */
  async function createClient() {
    const response = await fetch(metadataUrl, { redirect: "error", cache: "no-store" });
    if (!response.ok) { throw new Error("OAuth metadata unavailable"); }
    const metadata = await response.json();
    if (metadataUrl.protocol !== "https:" || metadata.client_id !== metadataUrl.href ||
        metadata.redirect_uris?.length !== 1 || metadata.redirect_uris[0] !== callbackUrl.href ||
        metadata.application_type !== "web" || metadata.token_endpoint_auth_method !== "none" ||
        metadata.dpop_bound_access_tokens !== true) {
      throw new Error("Invalid OAuth client metadata");
    }
    return {
      scopes: metadata.scope.split(" "),
      client: new sdk.OAuthClient({
        ...storage,
        clientMetadata: metadata,
        responseMode: "fragment",
        handleResolver: "https://bsky.social",
        fetch: boundedOAuthFetch,
        runtimeImplementation: {
          createKey: (algs) => sdk.WebcryptoKey.generate(algs),
          getRandomValues: (size) => crypto.getRandomValues(new Uint8Array(size)),
          digest: (data, { name }) => crypto.subtle.digest(name.toUpperCase().replace("SHA", "SHA-"), data),
          requestLock: lock,
        },
      }),
    };
  }

  /** Caps discovery and token responses before SDK schema validation. @param {Request|string|URL} input - SDK request. @param {RequestInit} init - Fetch options. @returns {Promise<Response>} Bounded or normal XRPC response. */
  async function boundedOAuthFetch(input, init) {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.protocol !== "https:" || url.username || url.password) { throw new Error("Invalid OAuth network destination"); }
    if (url.pathname.startsWith("/xrpc/") && request.headers.get("authorization")?.startsWith("DPoP ")) {
      return fetch(request);
    }
    let signal = AbortSignal.timeout(15_000);
    if (typeof AbortSignal.any === "function") { signal = AbortSignal.any([request.signal, signal]); }
    const response = await fetch(request, { signal });
    if (!response.body) {
      return response;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { break; }
        size += value.byteLength;
        if (size > 65_536) {
          await reader.cancel();
          throw new Error("OAuth response exceeds size limit");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bounded = new Response(new Blob(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
    Object.defineProperty(bounded, "url", { value: response.url });
    return bounded;
  }

  /** Shares client creation and allows a retry after a temporary failure. @returns {Promise<object>} OAuth client configuration. */
  function getClient() {
    if (!clientPromise) {
      clientPromise = createClient().catch((cause) => {
        clientPromise = undefined;
        throw cause;
      });
    }
    return clientPromise;
  }

  /** Creates a PKCE/PAR authorization and binds it to the original account and page. @param {object} input - Login handle, workspace and optional DM permission. @returns {Promise<string>} Provider URL. */
  async function begin({ handle, workspace, dm } = {}) {
    const identifier = String(handle || "").trim().toLowerCase();
    if (identifier.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(identifier)) {
      throw error("Enter a Bluesky handle", "OAUTH_BAD_HANDLE");
    }
    try {
      const { client, scopes } = await getClient();
      const identity = await client.identityResolver.resolve(identifier, { signal: AbortSignal.timeout(15_000) });
      const scope = scopes.filter((value) => value !== chatScope || dm === true).join(" ");
      let returnTo = "composer";
      if (workspace === "tools") { returnTo = "tools"; }
      const url = await client.authorize(identity.did, {
        scope,
        state: JSON.stringify({ did: identity.did, handle: identifier, returnTo }),
        signal: AbortSignal.timeout(15_000),
      });
      if (url.protocol !== "https:") { throw new Error("Invalid provider URL"); }
      return url.href;
    } catch {
      throw error("Bluesky OAuth authorization could not be started", "OAUTH_START_FAILED");
    }
  }

  /** Consumes an authorization exactly once and stores only account metadata in the legacy database. @param {object} input - Callback fragment contents. @returns {Promise<object>} Validated destination. */
  async function finish({ fragment } = {}) {
    if (typeof fragment !== "string" || fragment.length > 4096) {
      throw error("Invalid OAuth callback", "OAUTH_CALLBACK_FAILED");
    }
    const params = new URLSearchParams(fragment);
    const state = params.get("state");
    if (!state || params.getAll("state").length !== 1 || (!params.has("code") && !params.has("error"))) {
      throw error("Invalid OAuth callback", "OAUTH_CALLBACK_FAILED");
    }
    return lock("callback:" + state, async () => {
      let session;
      try {
        const { client } = await getClient();
        const result = await client.callback(params, { redirect_uri: callbackUrl.href });
        session = result.session;
        const verified = JSON.parse(result.state);
        if (session.did !== verified.did) { throw new Error("Unexpected OAuth identity"); }
        const tokenInfo = await session.getTokenInfo(false);
        await saveAccount({ did: session.did, handle: verified.handle, pdsUrl: tokenInfo.aud });
        return { workspace: verified.returnTo };
      } catch (cause) {
        if (session) { await revoke(session.did); }
        if (params.get("error") === "access_denied" && cause?.state) {
          throw error("OAuth access was denied", "OAUTH_CANCELLED");
        }
        throw error("Bluesky OAuth callback could not be completed", "OAUTH_CALLBACK_FAILED");
      }
    });
  }

  /** Returns an OAuth request context for a saved account. @param {object} account - Stored account. @returns {Promise<object>} Account context without tokens. */
  async function ensure(account) {
    try {
      const { client } = await getClient();
      const session = await client.restore(account.did);
      const info = await session.getTokenInfo(false);
      return { ...account, pdsUrl: info.aud, session: { did: account.did, handle: account.handle }, oauthRequest: { oauthDid: account.did } };
    } catch (cause) {
      if (cause instanceof TypeError || cause?.name === "TimeoutError") { throw cause; }
      throw error("Reconnect your Bluesky OAuth session", "OAUTH_SESSION_REQUIRED");
    }
  }

  /** Makes a signed, relative XRPC request to the token-bound account server. @param {string} did - Account DID. @param {string} endpoint - XRPC method and query. @param {RequestInit} init - HTTP options. @returns {Promise<Response>} Response. */
  async function request(did, endpoint, init) {
    if (!/^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)+(?:\?[^#]*)?$/.test(endpoint)) {
      throw error("Invalid XRPC method", "OAUTH_REQUEST_FAILED");
    }
    try {
      const { client } = await getClient();
      const session = await client.restore(did, false);
      const headers = new Headers(init.headers);
      headers.delete("authorization");
      return await session.fetchHandler("/xrpc/" + endpoint, { ...init, headers, redirect: "error" });
    } catch (cause) {
      if (cause?.name === "AbortError") { throw cause; }
      throw error("Bluesky OAuth request failed", "OAUTH_REQUEST_FAILED");
    }
  }

  /** Revokes a grant when possible and removes the local OAuth session. @param {string} did - Account DID. @returns {Promise<void>} Completion. */
  async function revoke(did) {
    try {
      const { client } = await getClient();
      await client.revoke(did);
    } catch {
      await storage.sessionStore.del(did);
    }
  }

  return Object.freeze({ begin, finish, ensure, request, revoke });
};
