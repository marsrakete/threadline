"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Loads the classic-worker archive controller with virtual, observable delays.
 * @returns {object} Controller, factory, options, context, waits, progress and delay hook.
 */
function archiveControlFixture() {
  const context = { Map, Object, Number, String, Math, TypeError };
  for (const file of ["archive-run-messages.js", "archive-run-control.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "js/worker", file), "utf8"), context);
  }
  const waits = [], progress = [];
  let onDelay = async () => {};
  const options = {
    delay: async (ms) => { waits.push(ms); await onDelay(ms); },
    error: (message, code) => Object.assign(new Error(message), { details: { code } }),
    messages: context.ThreadlineArchiveRunMessages,
  };
  return { api: context.createThreadlineArchiveRunControl(options), factory: context.createThreadlineArchiveRunControl,
    options, context, waits, progress, notify: value => progress.push(value), setDelay: callback => { onDelay = callback; } };
}

/** Creates a transport failure with the worker's existing status/retry-after shape.
 * @param {number} status - HTTP status. @param {string} message - Failure description.
 * @param {number} retryAfterMs - Suggested delay. @returns {Error} Fixture transport error.
 */
function archiveFailure(status = 429, message = "blocked", retryAfterMs = 1) {
  return Object.assign(new Error(message), { details: { status, retryAfterMs } });
}

/** Copies cross-realm values into plain data.
 * @param {unknown} value - Serializable value. @returns {unknown} Plain JSON value.
 */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = { archiveControlFixture, archiveFailure, plain };
