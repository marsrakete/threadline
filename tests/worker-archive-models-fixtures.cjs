"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Loads the real classic-worker import chain without invoking event handlers or network.
 * @returns {object} Model factory, actual adapters, models and isolated worker context.
 */
function archiveModelsFixture() {
  const context = { URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, Blob, Map, Set, Date, Number, String, Array, Object, TypeError,
    crypto: require("node:crypto").webcrypto, setTimeout, clearTimeout, console, encodeURIComponent,
    addEventListener() {}, fetch() { throw Error("Unexpected network access in archive model tests"); } };
  context.self = context;
  vm.createContext(context);
  context.importScripts = (...files) => {
    for (const file of files) { vm.runInContext(fs.readFileSync(path.join(projectRoot, file), "utf8"), context, { filename: file }); }
  };
  vm.runInContext(fs.readFileSync(path.join(projectRoot, "sw.js"), "utf8"), context, { filename: "sw.js" });
  const options = vm.runInContext("({ normalizeTags: normalizeHashtagEntries, parseTag: parseHashtagValue, tagFacets: parseHashtagFacets, parseUri: parseAtUri, postUrl: buildPostWebUrl, site: normalizeStandardSiteMetadata, edit: normalizePostEditInfoFromRecord, maxImages: MAX_IMAGES_PER_SEGMENT })", context);
  return { models: vm.runInContext("archiveModels", context), factory: context.createThreadlineArchiveModels, options, context };
}

/** Converts cross-realm values into plain data.
 * @param {unknown} value - Serializable value. @returns {unknown} Plain JSON value.
 */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

/** Creates a deterministic archive-account post URI.
 * @param {string} id - Record key. @param {string} did - Account DID.
 * @returns {string} Post AT URI.
 */
function uri(id = "root", did = "did:example:own") { return `at://${did}/app.bsky.feed.post/${id}`; }

module.exports = { archiveModelsFixture, plain, uri };
