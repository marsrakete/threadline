/** Creates shared XRPC transport and rate-limit parsing with explicit browser adapters.
 * @param {object} options - fetch/getRequest/searchParams/error/now callbacks, API base and messages.
 * @returns {{request: Function, get: Function, rateLimit: Function}} Frozen transport API.
 */
globalThis.createThreadlineTransportService = function createThreadlineTransportService(options) {
  for (const name of ["fetch", "getRequest", "searchParams", "error", "now"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Worker transport requires " + name);
    }
  }
  const searchParams = options.searchParams, getRequest = options.getRequest;
  const { fetch, error: createServiceWorkerError, now: optionsNow, apiBase: API_BASE, messages } = options;
  /** Parses existing rate-limit headers. @param {Response} response - Provider response. @returns {object|null} Header metadata. */
  function extractRateLimitMeta(response) {
    if (!response?.headers) {
      return null;
    }

    const limitRaw = String(response.headers.get("ratelimit-limit") || "").trim();
    const remainingRaw = String(response.headers.get("ratelimit-remaining") || "").trim();
    const resetRaw = String(response.headers.get("ratelimit-reset") || "").trim();
    const policy = String(response.headers.get("ratelimit-policy") || "").trim();
    const retryAfter = String(response.headers.get("retry-after") || "").trim();

    if (!limitRaw && !remainingRaw && !resetRaw && !policy && !retryAfter) {
      return null;
    }

    let resetAt = "";
    if (/^\d+$/.test(resetRaw)) {
      const resetSeconds = Number.parseInt(resetRaw, 10);
      if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
        resetAt = new Date(resetSeconds * 1000).toISOString();
      }
    } else if (resetRaw) {
      const parsedResetAt = Date.parse(resetRaw);
      if (Number.isFinite(parsedResetAt)) {
        resetAt = new Date(parsedResetAt).toISOString();
      }
    }

    let limit = null;
    if (/^\d+$/.test(limitRaw)) {
      limit = Number.parseInt(limitRaw, 10);
    }

    let remaining = null;
    if (/^\d+$/.test(remainingRaw)) {
      remaining = Number.parseInt(remainingRaw, 10);
    }

    return {
      limit,
      remaining,
      resetAt,
      policy,
      retryAfter,
    };
  }
  /** Executes an XRPC request. @param {string} endpoint - Method path. @param {object} options - Fetch/base/metadata options. @returns {Promise<object>} Parsed data or data/meta envelope. */
  async function bskyFetch(endpoint, options = {}) {
    const base = options.base || API_BASE;
    const response = await fetch(`${base}/${endpoint}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const rateLimit = extractRateLimitMeta(response);
      const retryAfterRaw = response.headers.get("retry-after") || "";
      let retryAfterMs = 0;
      if (/^\d+$/.test(retryAfterRaw.trim())) {
        retryAfterMs = Math.max(0, Number.parseInt(retryAfterRaw.trim(), 10) * 1000);
      } else if (retryAfterRaw.trim()) {
        const retryAt = Date.parse(retryAfterRaw.trim());
        if (Number.isFinite(retryAt)) {
          retryAfterMs = Math.max(0, retryAt - optionsNow());
        }
      }
      let code = "BSKY_REQUEST_FAILED";
      if (response.status === 401) {
        code = "AUTH_INVALID_CREDENTIALS";
      }
      throw createServiceWorkerError(
        data.message || data.error || messages.requestFailed.replace("{status}", String(response.status)),
        code,
        { status: response.status, retryAfterMs, rateLimit },
      );
    }

    if (options.returnMeta) {
      return {
        data,
        meta: {
          rateLimit: extractRateLimitMeta(response),
        },
      };
    }

    return data;
  }

  /** Executes GET query serialization without changing array/scalar omission rules. @param {string} endpoint - Method. @param {object} query - Values. @param {object} options - Headers/base/signal. @returns {Promise<object>} XRPC result. */
  async function bskyGet(endpoint, query = {}, options = {}) {
    const search = searchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((entry) => search.append(key, entry));
        return;
      }
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, value);
      }
    });

    let suffix = "";
    if (search.toString()) {
      suffix = `?${search.toString()}`;
    }
    return getRequest(`${endpoint}${suffix}`, {
      method: "GET",
      headers: options.headers || {},
      base: options.base,
      signal: options.signal,
    });
  }
  return Object.freeze({ request: bskyFetch, get: bskyGet, rateLimit: extractRateLimitMeta });
};
