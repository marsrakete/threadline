"use strict";

const crypto = require("node:crypto");

/** Hashes audit source with LF line endings so checkout conversion does not invalidate the inventory.
 * @param {string} source - Complete UTF-8 source text; all content except CRLF pairs stays significant.
 * @returns {string} SHA-256 digest of the source with CRLF normalized to LF.
 */
function hashAuditSource(source) {
  if (typeof source !== "string") {
    throw new TypeError("Audit source must be a string.");
  }
  return crypto.createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");
}

module.exports = { hashAuditSource };
