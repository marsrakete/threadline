"use strict";
const { archiveModelsFixture } = require("./worker-archive-models-fixtures.cjs");

/** Creates the real archive thread service with observable transport, timers and model adapters.
 * @returns {object} Service, factory, options, queues, request/timer trace and real worker context.
 */
function archiveThreadFixture() {
  const f = archiveModelsFixture();
  const responses = [], requests = [], progress = [], events = [], timers = [], waits = [];
  let refreshCount = 0;
  const auth = { session: { accessJwt: "old-token" } };
  const options = {
    models: f.models, timeoutMs: 15000, retries: 1, messages: f.context.ThreadlineArchiveRunMessages,
    refresh: async (value) => { events.push("refresh"); refreshCount++; return { ...value, session: { accessJwt: "fresh-" + refreshCount } }; },
    request: async (method, params, transport) => {
      events.push("request"); requests.push({ method, params, transport });
      const response = responses.shift();
      if (response instanceof Error) { throw response; }
      if (typeof response === "function") { return await response({ method, params, transport }); }
      return response || {};
    },
    base: () => "https://fixture.test/xrpc",
    wait: async () => { events.push("wait"); return waits.shift() || "running"; },
    abortController: () => { events.push("abortController"); return new AbortController(); },
    schedule: (callback, ms) => { events.push("schedule"); const id = timers.length; timers.push({ callback, ms, cleared: false }); return id; },
    clearTimer: id => { events.push("clearTimer"); timers[id].cleared = true; },
  };
  return { ...f, factory: f.context.createThreadlineArchiveThreadService, service: f.context.createThreadlineArchiveThreadService(options),
    options, auth, responses, requests, progress, events, timers, waits, notify: value => progress.push(value) };
}

/** Builds a deterministic provider thread post with optional record overrides.
 * @param {string} id - URI suffix. @param {object} record - Raw record overrides.
 * @returns {object} Provider post view.
 */
function threadPost(id = "root", record = {}) {
  return { uri: `at://did:example:own/app.bsky.feed.post/${id}`, cid: id, record: { text: "post", ...record },
    author: { did: "did:example:own", handle: "own.test", displayName: "<b>Own</b>", avatar: "avatar" }, likeCount: "3", replyCount: "bad" };
}

/** Creates a provider abort failure matching fetch's cancellation name.
 * @returns {Error} AbortError fixture.
 */
function abortFailure() { return Object.assign(new Error("aborted"), { name: "AbortError" }); }

module.exports = { archiveThreadFixture, threadPost, abortFailure };
