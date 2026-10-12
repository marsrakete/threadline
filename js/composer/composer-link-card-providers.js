/**
 * Normalizes a selected link-card provider.
 * @param {string} value - Raw provider value.
 * @param {string} proxyProvider - Supported proxy value.
 * @param {string} microlinkProvider - Supported Microlink value.
 * @param {string} noneProvider - Fallback provider value.
 * @returns {string} Normalized provider value.
 */
export function normalizeComposerLinkCardProvider(value, proxyProvider, microlinkProvider, noneProvider) {
  if (value === proxyProvider) {
    return proxyProvider;
  }
  if (value === microlinkProvider) {
    return microlinkProvider;
  }
  return noneProvider;
}

/**
 * Normalizes a configured link-card proxy endpoint.
 * @param {string} rawEndpoint - User-entered endpoint.
 * @returns {string} HTTPS endpoint or an empty string when invalid.
 */
export function normalizeComposerLinkCardProxyEndpoint(rawEndpoint) {
  const endpoint = String(rawEndpoint || "").trim();
  if (!endpoint) {
    return "";
  }
  if (/^ttps:\/\//i.test(endpoint)) {
    return `h${endpoint}`;
  }
  if (/^\/\//.test(endpoint)) {
    return `https:${endpoint}`;
  }
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?\//i.test(endpoint)) {
    return `https://${endpoint}`;
  }
  return "";
}

/**
 * Validates proxy credentials and the expected WordPress endpoint path.
 * @param {string} rawEndpoint - User-entered endpoint.
 * @param {string} rawSecret - User-entered shared secret.
 * @param {Function} translate - Translation callback.
 * @returns {{ok:boolean,message:string,tone:string,isEmpty:boolean}} Validation result.
 */
export function validateComposerLinkCardProxySettings(rawEndpoint, rawSecret, translate) {
  const raw = String(rawEndpoint || "").trim();
  const endpoint = normalizeComposerLinkCardProxyEndpoint(raw);
  const secret = String(rawSecret || "").trim();
  if (!raw && !secret) {
    return { ok: true, message: "", tone: "", isEmpty: true };
  }
  if (!raw || !secret) {
    return { ok: false, message: "", tone: "", isEmpty: true };
  }
  if (!endpoint) {
    return { ok: false, message: translate("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  let parsed = null;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { ok: false, message: translate("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, message: translate("linkCardProxyInvalidEndpoint"), tone: "error", isEmpty: false };
  }
  if (!/\/wp-json\/threadline\/v1\/link-card\/?$/i.test(parsed.pathname)) {
    return { ok: false, message: translate("linkCardProxyUnexpectedEndpoint"), tone: "error", isEmpty: false };
  }
  return { ok: true, message: translate("linkCardSettingsSaved"), tone: "", isEmpty: false };
}

/**
 * Creates proxy settings access, input normalization and validation presentation.
 * @param {object} elements - Endpoint input, secret input and optional status node.
 * @param {object} options - Translation and provider UI synchronization callbacks.
 * @returns {object} Settings, normalizeInputs, validate, isConfigured and updateStatus operations.
 */
export function createComposerProxySettingsController(elements, options) {
  /**
   * Reads normalized settings without modifying their input fields.
   * @returns {{endpoint:string,secret:string}} Current proxy settings.
   */
  function settings() {
    return { endpoint: normalizeComposerLinkCardProxyEndpoint(elements.endpoint?.value),
      secret: String(elements.secret?.value || "").trim() };
  }
  /**
   * Writes a recognized normalized endpoint back to the input.
   * @returns {void}
   */
  function normalizeInputs() {
    if (!elements.endpoint) {
      return;
    }
    const normalized = normalizeComposerLinkCardProxyEndpoint(elements.endpoint.value);
    if (normalized && normalized !== elements.endpoint.value.trim()) {
      elements.endpoint.value = normalized;
    }
  }
  /**
   * Validates the current input fields.
   * @returns {object} Proxy validation result.
   */
  function validate() {
    return validateComposerLinkCardProxySettings(elements.endpoint?.value, elements.secret?.value, options.translate);
  }
  /**
   * Checks whether complete, valid proxy credentials are available.
   * @returns {boolean} True when the proxy can be used.
   */
  function isConfigured() {
    const { endpoint, secret } = settings();
    return Boolean(endpoint && secret) && validate().ok;
  }
  /**
   * Applies custom input validity and optional status text before syncing providers.
   * @param {object} flags - Optional show flag controlling status visibility.
   * @returns {object} Validation result, including when no status node exists.
   */
  function updateStatus({ show = true } = {}) {
    const validation = validate();
    let message = validation.message;
    if (validation.ok || validation.isEmpty) {
      message = "";
    }
    elements.endpoint?.setCustomValidity(message);
    if (!elements.status) {
      return validation;
    }
    elements.status.hidden = validation.isEmpty || !show;
    elements.status.textContent = validation.message;
    if (validation.tone) {
      elements.status.dataset.tone = validation.tone;
    } else {
      delete elements.status.dataset.tone;
    }
    options.syncProvider();
    return validation;
  }
  return { settings, normalizeInputs, validate, isConfigured, updateStatus };
}

/**
 * Creates provider availability decisions without reading DOM or storage directly.
 * @param {object} options - Provider identifiers, selection, proxy configuration and usage callbacks.
 * @returns {{active:Function,canCreate:Function}} Effective provider and request availability operations.
 */
export function createComposerProviderAvailabilityController(options) {
  /**
   * Returns the normalized selection, falling back when the proxy is unavailable.
   * @returns {string} Effective provider identifier.
   */
  function active() {
    const provider = options.normalizeProvider(options.getProvider());
    if (provider === options.providers.proxy && !options.isProxyConfigured()) {
      return options.providers.none;
    }
    return provider;
  }
  /**
   * Checks provider availability, retaining metadata-free cards for the none provider.
   * @returns {boolean} Whether the selected provider may create a card.
   */
  function canCreate() {
    const provider = active();
    if (provider === options.providers.proxy) {
      return options.isProxyConfigured();
    }
    if (provider === options.providers.microlink) {
      return options.canUseMicrolink();
    }
    return true;
  }
  return { active, canCreate };
}

/**
 * Normalizes a daily provider usage counter.
 * @param {object|null} usage - Stored usage data.
 * @param {string} today - Current UTC date.
 * @returns {{date:string,count:number}} Normalized usage.
 */
export function normalizeComposerProviderUsage(usage = null, today = "") {
  const date = String(usage?.date || "").trim();
  let count = Math.max(0, Number(usage?.count) || 0);
  if (date !== today) {
    count = 0;
  }
  return { date: today, count };
}

/**
 * Creates daily usage operations while keeping storage and the UTC clock explicit.
 * @param {object} options - getUsage, setUsage, getToday, limit and persist dependencies.
 * @returns {object} Normalization, state, budget and asynchronous recording operations.
 */
export function createComposerProviderUsageController(options) {
  /**
   * Normalizes a saved counter against the current UTC day.
   * @param {object|null} usage - Raw saved counter.
   * @returns {{date:string,count:number}} Normalized counter.
   */
  function normalize(usage = null) {
    return normalizeComposerProviderUsage(usage, options.getToday());
  }
  /**
   * Refreshes the current in-memory counter, resetting it when the day changes.
   * @returns {{date:string,count:number}} Current counter.
   */
  function state() {
    const usage = normalize(options.getUsage());
    options.setUsage(usage);
    return usage;
  }
  /**
   * Returns the remaining locally tracked daily request budget.
   * @returns {number} Remaining requests, never negative.
   */
  function remaining() {
    return Math.max(0, options.limit - state().count);
  }
  /**
   * Determines whether the daily budget permits another request.
   * @returns {boolean} True when requests remain.
   */
  function canUse() {
    return remaining() > 0;
  }
  /**
   * Records one attempted request before persisting the updated counter.
   * @returns {Promise<void>}
   */
  async function record() {
    const usage = state();
    options.setUsage({ date: usage.date, count: usage.count + 1 });
    await options.persist();
  }
  return { normalize, state, remaining, canUse, record };
}

/**
 * Builds provider-specific settings and dialog notes without DOM mutations.
 * @param {string} provider - Active provider identifier.
 * @param {object} usage - Normalized usage counter.
 * @param {number} limit - Daily request limit.
 * @param {Function} translate - Translation callback.
 * @param {object} providers - microlink and proxy identifiers.
 * @returns {{settings:string,dialog:string}} Localized notes.
 */
export function buildComposerProviderNotes(provider, usage, limit, translate, providers) {
  if (provider === providers.microlink) {
    return {
      settings: translate("linkCardMicrolinkUsageNote", { count: usage.count, limit, remaining: Math.max(0, limit - usage.count) }),
      dialog: translate("linkCardDialogMicrolinkNote", { usage: `${usage.count}/${limit}`, limit }),
    };
  }
  if (provider === providers.proxy) {
    return { settings: translate("linkCardProviderProxyNote"), dialog: translate("linkCardDialogProxyNote") };
  }
  return { settings: translate("linkCardProviderNoneNote"), dialog: translate("linkCardDialogNoneNote") };
}

/**
 * Creates provider selection and hint presentation for existing settings/dialog nodes.
 * @param {object} elements - Provider wrappers, radio inputs and settings/dialog notes.
 * @param {object} options - Provider state, configuration, usage, translations and persistence dependencies.
 * @returns {object} Settings/dialog note accessors and UI synchronization operations.
 */
export function createComposerProviderPresentationController(elements, options) {
  /**
   * Derives notes, refreshing usage only when Microlink is active.
   * @returns {{settings:string,dialog:string}} Localized provider notes.
   */
  function notes() {
    const provider = options.getActiveProvider();
    let usage = { count: 0 };
    if (provider === options.providers.microlink) {
      usage = options.getUsage();
    }
    return buildComposerProviderNotes(provider, usage, options.limit, options.translate, options.providers);
  }
  /**
   * Updates the dialog hint, hiding it for move/manage actions.
   * @returns {void}
   */
  function updateDialog() {
    if (!elements.dialogNote) {
      return;
    }
    const action = options.getAction();
    if (action === "move" || action === "manage") {
      elements.dialogNote.hidden = true;
      elements.dialogNote.textContent = "";
      return;
    }
    elements.dialogNote.hidden = false;
    elements.dialogNote.textContent = notes().dialog;
  }
  /**
   * Synchronizes provider visibility, fallback selection and notes, optionally persisting.
   * @param {object} settings - Optional persist flag.
   * @returns {void}
   */
  function sync({ persist = false } = {}) {
    const configured = options.isProxyConfigured();
    if (elements.noneWrap) {
      elements.noneWrap.hidden = false;
    }
    if (elements.proxyWrap) {
      elements.proxyWrap.hidden = !configured;
    }
    if (elements.proxyInput) {
      elements.proxyInput.disabled = !configured;
    }
    let provider = options.normalizeProvider(options.getProvider());
    if (!configured && provider === options.providers.proxy) {
      provider = options.providers.none;
    }
    options.setProvider(provider);
    if (elements.noneInput) {
      elements.noneInput.checked = provider === options.providers.none;
    }
    if (elements.microlinkInput) {
      elements.microlinkInput.checked = provider === options.providers.microlink;
    }
    if (elements.proxyInput) {
      elements.proxyInput.checked = provider === options.providers.proxy;
    }
    if (elements.settingsNote) {
      elements.settingsNote.textContent = notes().settings;
    }
    updateDialog();
    if (persist) {
      void options.persist();
    }
  }
  return { notes, updateDialog, sync };
}

/**
 * Requests link-card metadata from a signed proxy endpoint.
 * @param {string} url - URL to inspect.
 * @param {object} options - Endpoint, signing, fetch, payload and normalization callbacks.
 * @returns {Promise<object|null>} Normalized link-card data.
 */
export async function requestComposerLinkCardFromProxy(url, options = {}) {
  const now = options.now || Date.now;
  const timestamp = String(Math.floor(now() / 1000));
  const nonce = options.randomUUID();
  const signature = await options.sign(url, timestamp, nonce, options.secret);
  const response = await options.fetch(options.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-threadline-timestamp": timestamp,
      "x-threadline-nonce": nonce,
      "x-threadline-signature": signature,
    },
    body: JSON.stringify({ url }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(options.getErrorMessage(response, payload));
  }
  return options.normalize({
    url: payload.url || payload.finalUrl || url,
    title: payload.title || payload.url || url,
    description: payload.description || "",
    imageUrl: payload.imageUrl || "",
    imageDataUrl: options.imageToDataUrl(payload.image),
    imageMimeType: payload.image?.mimeType || "",
    standardSite: payload.standardSite,
  });
}

/**
 * Downloads a preview image through explicit fetch and data-URL dependencies.
 * @param {string} imageUrl - Absolute HTTP(S) image URL.
 * @param {object} options - Fetch, fileToDataUrl and translation callbacks.
 * @returns {Promise<{imageDataUrl:string,imageMimeType:string}>} Embedded preview image.
 */
export async function fetchComposerLinkCardImage(imageUrl, options) {
  const url = String(imageUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(options.translate("linkCardImageInvalidUrl"));
  }
  const response = await options.fetch(url, { method: "GET", mode: "cors" });
  if (!response.ok) {
    throw new Error(options.translate("linkCardImageLoadFailed", { status: response.status }));
  }
  const blob = await response.blob();
  const mime = String(blob.type || "").trim();
  if (!mime.startsWith("image/")) {
    let type = mime;
    if (!type) {
      type = options.translate("linkCardImageUnknownType");
    }
    throw new Error(options.translate("linkCardImageUnexpectedType", { type }));
  }
  return { imageDataUrl: await options.fileToDataUrl(blob), imageMimeType: mime };
}

/**
 * Routes a link-card request to the effective provider or the metadata-free builder.
 * @param {string} url - Target URL.
 * @param {object} options - Provider identifiers, selection and request/basic-card callbacks.
 * @returns {Promise<object|null>} Card returned by the selected implementation.
 */
export async function requestComposerLinkCard(url, options) {
  const provider = options.getProvider();
  if (provider === options.providers.proxy) {
    return await options.proxy(url);
  }
  if (provider === options.providers.microlink) {
    return await options.microlink(url);
  }
  return options.basic(url);
}

/**
 * Requests link-card metadata from Microlink.
 * @param {string} url - URL to inspect.
 * @param {object} options - Fetch, usage, image and normalization callbacks.
 * @returns {Promise<object|null>} Normalized link-card data.
 */
export async function requestComposerLinkCardFromMicrolink(url, options = {}) {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
  const response = await options.fetch(endpoint, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  await options.recordUsage();
  if (!response.ok) {
    throw new Error(options.getErrorMessage(response, payload));
  }
  const data = payload?.data;
  if (!data || typeof data !== "object") {
    throw new Error(options.failedMessage);
  }
  let imageUrl = "";
  if (typeof data.image === "string") {
    imageUrl = data.image;
  } else if (data.image && typeof data.image === "object" && data.image.url) {
    imageUrl = String(data.image.url).trim();
  }
  let imageDataUrl = "";
  let imageMimeType = "";
  if (imageUrl) {
    try {
      const image = await options.fetchImage(imageUrl);
      imageDataUrl = image.imageDataUrl;
      imageMimeType = image.imageMimeType;
    } catch {
      imageDataUrl = "";
      imageMimeType = "";
    }
  }
  const card = options.normalize({
    url: data.url || url,
    title: data.title || data.url || url,
    description: data.description || "",
    imageUrl,
    imageDataUrl,
    imageMimeType,
    standardSite: null,
  });
  if (!card) {
    throw new Error(options.failedMessage);
  }
  return card;
}

/**
 * Signs the proxy's newline-delimited payload with HMAC-SHA-256.
 * @param {string} url - Target URL.
 * @param {string} timestamp - Unix timestamp in seconds.
 * @param {string} nonce - Request nonce.
 * @param {string} secret - Shared proxy secret.
 * @param {SubtleCrypto} subtle - Explicit Web Crypto backend.
 * @returns {Promise<string>} Lowercase hexadecimal signature.
 */
export async function signComposerLinkCardRequest(url, timestamp, nonce, secret, subtle) {
  const encoder = new TextEncoder();
  const key = await subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await subtle.sign("HMAC", key, encoder.encode(`${url}\n${timestamp}\n${nonce}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts a proxy's embedded image payload to its preview data URL.
 * @param {object} image - Base64 bytes and optional MIME type.
 * @returns {string} Image data URL, or empty text when no image bytes exist.
 */
export function composerLinkCardImageToDataUrl(image = {}) {
  const bytes = String(image.bytesBase64 || "").trim();
  if (!bytes) {
    return "";
  }
  const mime = String(image.mimeType || "image/jpeg").trim() || "image/jpeg";
  return `data:${mime};base64,${bytes}`;
}

/**
 * Translates proxy authentication errors, retaining other provider messages.
 * @param {object} response - HTTP response with status.
 * @param {object|null} payload - Parsed error payload.
 * @param {Function} translate - Translation callback.
 * @returns {string} User-facing proxy error.
 */
export function getComposerLinkCardProxyErrorMessage(response, payload, translate) {
  const code = String(payload?.code || "").trim().toLowerCase();
  const message = String(payload?.message || "").trim().toLowerCase();
  if (response.status === 401 || code === "threadline_signature_invalid" || code === "threadline_signature_missing"
      || message === "invalid signature." || message === "missing or expired signature.") {
    return translate("linkCardProxyAuthFailed");
  }
  return payload?.message || payload?.code || translate("linkCardProxyFailed");
}

/**
 * Translates Microlink rate limits and preserves provider-specific failure text.
 * @param {object|null} response - HTTP response when available.
 * @param {object|null} payload - Parsed error payload when available.
 * @param {Function} translate - Translation callback.
 * @returns {string} User-facing Microlink error.
 */
export function getComposerMicrolinkErrorMessage(response, payload, translate) {
  if (response && response.status === 429) {
    return translate("linkCardMicrolinkLimitReached");
  }
  const message = String(payload?.description || payload?.message || "").trim();
  if (message) {
    return message;
  }
  return translate("linkCardMicrolinkFailed");
}
/**
 * Coordinates request prerequisites and provider adapters using current settings.
 * @param {object} options - Settings, validation, quotas, translation and request dependencies.
 * @returns {object} Guarded proxy and Microlink request operations.
 */
export function createComposerLinkCardRequestController(options) {
  /** Requests a proxy card after configuration checks. @param {string} url - Target URL. @returns {Promise<object|null>} Card. */
  async function proxy(url) {
    const { endpoint, secret } = options.getSettings();
    if (!endpoint && !secret) { throw new Error(options.translate("linkCardProxyMissing")); }
    const validation = options.validateProxy();
    if (!validation.ok) { throw new Error(validation.message); }
    return requestComposerLinkCardFromProxy(url, { ...options.proxy, endpoint, secret });
  }
  /** Requests a Microlink card after quota checks. @param {string} url - Target URL. @returns {Promise<object|null>} Card. */
  async function microlink(url) {
    if (!options.canUseMicrolink()) { throw new Error(options.translate("linkCardMicrolinkLimitReached")); }
    return requestComposerLinkCardFromMicrolink(url, {
      ...options.microlink, failedMessage: options.translate("linkCardMicrolinkFailed"),
    });
  }
  return { proxy, microlink };
}
