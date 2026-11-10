"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

/**
 * Imports an isolated browser module through a data URL without changing Node's package mode.
 * @param {string} relativePath - Module path relative to the project root.
 * @returns {Promise<object>} Exported module namespace.
 */
function importProjectModule(relativePath) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const encodedSource = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encodedSource}`);
}

/**
 * Creates a minimal in-memory Storage-compatible object for module tests.
 * @param {Record<string, string>} initialValues - Initial storage values.
 * @returns {Storage} Storage-compatible test double.
 */
function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem(key) {
      if (!values.has(key)) {
        return null;
      }
      return values.get(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

module.exports = {
  createMemoryStorage,
  importProjectModule,
  projectRoot,
};
