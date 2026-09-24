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
 * Requests link-card metadata from a signed proxy endpoint.
 * @param {string} url - URL to inspect.
 * @param {object} options - Endpoint, signing, fetch, payload and normalization callbacks.
 * @returns {Promise<object|null>} Normalized link-card data.
 */
export async function requestComposerLinkCardFromProxy(url, options = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000));
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
