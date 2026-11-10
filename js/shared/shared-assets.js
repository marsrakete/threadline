/**
 * Selects the existing avatar filename extension from a response MIME type.
 * @param {string} mimeType - Response content type.
 * @returns {string} png, webp, gif or the existing jpg fallback.
 */
export function getAssetExtensionFromMimeType(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("png")) {
    return "png";
  }
  if (value.includes("webp")) {
    return "webp";
  }
  if (value.includes("gif")) {
    return "gif";
  }
  return "jpg";
}

/**
 * Creates binary asset conversion and IO with explicit browser adapters.
 * @param {object} dependencies - Browser IO and localized error adapters.
 * @param {Function} dependencies.encodeBase64 - Encodes a binary string as base64.
 * @param {Function} dependencies.decodeBase64 - Decodes base64 to a binary string.
 * @param {Function} dependencies.blob - Creates a Blob from parts and MIME options.
 * @param {Function} dependencies.reader - Creates a FileReader.
 * @param {Function} dependencies.bitmap - Decodes a Blob to an ImageBitmap.
 * @param {Function} dependencies.fetch - Loads a remote asset.
 * @param {Function} dependencies.encodeError - Returns localized Data-URL failure text.
 * @param {Function} dependencies.loadError - Returns localized HTTP failure text.
 * @returns {object} toBase64, fromBase64, dataUri, readDataUri, bitmap and download operations.
 */
export function createAssetService(dependencies) {
  for (const name of ["encodeBase64", "decodeBase64", "blob", "reader", "bitmap", "fetch", "encodeError", "loadError"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Asset service requires ${name}.`);
    }
  }

  /**
   * Encodes bytes in bounded chunks, including subarray views.
   * @param {Uint8Array} bytes - Bytes to encode.
   * @returns {string} Base64 text.
   */
  function toBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return dependencies.encodeBase64(binary);
  }

  /**
   * Decodes base64 text to byte values.
   * @param {string} value - Base64 text, defaulting to an empty string.
   * @returns {Uint8Array} Decoded bytes; invalid text errors propagate.
   */
  function fromBase64(value = "") {
    const binary = dependencies.decodeBase64(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  /**
   * Serializes an existing binary asset as an embedded Data URL.
   * @param {object} asset - Typed bytes and optional MIME type.
   * @returns {string} Base64 Data URL.
   */
  function dataUri(asset) {
    return `data:${asset.type || "application/octet-stream"};base64,${toBase64(asset.bytes)}`;
  }

  /**
   * Reads an asset through FileReader without building a large binary string.
   * @param {object} asset - Optional byte array and MIME type.
   * @returns {Promise<string>} Data URL; reader failures propagate.
   */
  async function readDataUri(asset) {
    let bytes = asset?.bytes;
    if (!(bytes instanceof Uint8Array)) {
      bytes = new Uint8Array(bytes || []);
    }
    const blob = dependencies.blob([bytes], { type: asset?.type || "application/octet-stream" });
    return await new Promise((resolve, reject) => {
      const reader = dependencies.reader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error(dependencies.encodeError()));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Decodes an asset for Canvas drawing.
   * @param {object} asset - Image bytes and optional MIME type.
   * @returns {Promise<ImageBitmap>} Bitmap owned and closed by the caller.
   */
  async function bitmap(asset) {
    const blob = dependencies.blob([asset.bytes], { type: asset.type || "image/png" });
    return dependencies.bitmap(blob);
  }

  /**
   * Downloads one catalog asset and retains the response MIME type.
   * @param {string} url - Remote asset URL.
   * @returns {Promise<object>} MIME type and typed bytes; HTTP and network failures reject.
   */
  async function download(url) {
    const response = await dependencies.fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(dependencies.loadError(response.status));
    }
    return { type: response.headers.get("content-type") || "application/octet-stream",
      bytes: new Uint8Array(await response.arrayBuffer()) };
  }

  return { toBase64, fromBase64, dataUri, readDataUri, bitmap, download };
}
