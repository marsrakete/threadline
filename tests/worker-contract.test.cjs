"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { projectRoot } = require("./module-test-helpers.cjs");

/**
 * Runs the classic AT Protocol worker scripts in one isolated worker-like context.
 * @returns {{context: object, importedScripts: string[]}} Worker global context and imported script paths.
 */
function loadAtprotoWorkerContext() {
  const importedScripts = [];
  const context = {
    AbortController,
    Date,
    Map,
    URL,
    clearTimeout,
    console,
    encodeURIComponent,
    fetch() {
      throw new Error("Network access is not expected in this contract test.");
    },
    setTimeout,
  };
  context.globalThis = context;
  context.DEFAULT_LOGIN_SERVICE = "https://bsky.social";
  context.DEFAULT_POST_WEB_APP = "https://bsky.app";
  context.POST_WEB_FRONTENDS = { "bsky.social": "https://bsky.app" };
  context.API_BASE = "https://public.api.bsky.app/xrpc";
  context.importScripts = (...scriptPaths) => {
    scriptPaths.forEach((scriptPath) => {
      importedScripts.push(scriptPath);
      const filePath = path.join(projectRoot, "js", "atproto", path.basename(scriptPath));
      const source = fs.readFileSync(filePath, "utf8");
      vm.runInNewContext(source, context, { filename: filePath });
    });
  };
  const workerSource = fs.readFileSync(path.join(projectRoot, "js", "atproto", "atproto-worker.js"), "utf8");
  vm.runInNewContext(workerSource, context, { filename: "atproto-worker.js" });
  return { context, importedScripts };
}

test("AT Protocol worker imports client before session and exposes their contracts", () => {
  const worker = loadAtprotoWorkerContext();

  assert.deepEqual(worker.importedScripts, ["./atproto-client.js", "./atproto-session.js"]);
  assert.equal(typeof worker.context.parseAtUri, "function");
  assert.equal(typeof worker.context.parseBlobUrlInfo, "function");
  assert.equal(typeof worker.context.extractPdsServiceFromDidDocument, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(worker.context.parseAtUri("at://did:plc:alice/app.bsky.feed.post/abc123"))), {
    did: "did:plc:alice",
    collection: "app.bsky.feed.post",
    rkey: "abc123",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(worker.context.parseAtUri("not-an-at-uri"))), { did: "", collection: "", rkey: "" });
  assert.deepEqual(JSON.parse(JSON.stringify(worker.context.parseBlobUrlInfo("https://cdn.bsky.app/img/feed_thumbnail/plain/did%3Aplc%3Aalice/bafycid@jpeg"))), {
    did: "did:plc:alice",
    cid: "bafycid",
  });
});
