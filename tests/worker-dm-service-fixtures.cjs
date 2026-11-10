"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { projectRoot } = require("./module-test-helpers.cjs");

/** Builds the real classic-worker DM factories with deterministic, isolated transport.
 * @param {object} data - Optional API pages, auth, profile/asset failures and responses.
 * @returns {object} Service/factory, adapters, calls, progress and classic-worker context.
 */
function dmServiceFixture(data = {}) {
  const context = { Date, Number, String, Array, Object, TypeError, Map, Set, Uint8Array };
  for (const file of ["dm-models.js", "dm-messages.js", "dm-service.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "js/worker", file), "utf8"), context);
  }
  const calls = [], progress = [];
  const auth = data.auth || { session: { did: "self", handle: "self.test", accessJwt: "fixture-token" }, avatar: "self-avatar" };
  const options = {
    models: context.createThreadlineDmModels({ randomUUID: () => "generated" }),
    session: async () => { calls.push(["session"]); if (data.sessionError) { throw Error("session failed"); } return auth; },
    chat: async (account, method, params) => {
      calls.push(["chat", method, params]);
      if (data.chatError) { throw Error("chat failed"); }
      if (method === "chat.bsky.convo.listConvos") { return data.convoPages?.[params.cursor || ""] || {}; }
      return data.messagePages?.[params.convoId + "|" + params.cursor] || {};
    },
    request: async (method, params, transport) => {
      calls.push(["profiles", method, params, transport]);
      if (data.profileError) { throw Error("profiles failed"); }
      return { profiles: data.profiles || params.actors.map(did => ({ did, handle: did + ".test", displayName: "Profile " + did, avatar: "avatar-" + did })) };
    },
    profileRecord: async (did) => {
      calls.push(["profileRecord", did]);
      return data.profileRecords?.[did] || null;
    },
    base: () => "https://fixture.test/xrpc",
    accountAvatar: async (did) => { calls.push(["accountAvatar", did]); return data.accountAvatar || ""; },
    remoteAsset: async (account, url, did, cache) => {
      calls.push(["asset", url, did, cache instanceof Map]);
      if (data.assetError || url.includes("fail")) { throw Error("asset failed"); }
      return { type: "image/png", bytes: new Uint8Array([url.length, 7]) };
    },
    blob: async (account, did, cid) => {
      calls.push(["blob", did, cid]);
      if (data.assetError) { throw Error("blob failed"); }
      return { type: "image/png", bytes: new Uint8Array([1, 2, 3]) };
    },
    cid: (ref) => ref?.ref?.$link || ref?.$link || "", extension: () => "png",
    now: () => "2026-10-22T10:00:00.000Z", randomUUID: () => "generated", appVersion: "v375",
    text: context.formatThreadlineDmMessage,
  };
  return { service: context.createThreadlineDmService(options), factory: context.createThreadlineDmService,
    options, calls, progress, context, auth, notify: value => progress.push(value) };
}

/** Makes a chat conversation with self and configurable partner records.
 * @param {string} id - Conversation ID. @param {string} date - Last-message timestamp.
 * @param {object[]} members - Partner profile records.
 * @returns {object} Chat API conversation.
 */
function dmConversation(id = "one", date = "2026-10-22T10:00:00Z", members = [{ did: "peer", handle: "peer.test", avatar: "peer-avatar" }]) {
  return { id, members: [{ did: "self" }, ...members], lastMessage: { sentAt: date } };
}

/** Converts values from a VM realm into plain comparable data.
 * @param {unknown} value - Serializable value. @returns {unknown} Plain JSON value.
 */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

module.exports = { dmServiceFixture, dmConversation, plain };
