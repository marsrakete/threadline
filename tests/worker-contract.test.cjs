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

  assert.deepEqual(worker.importedScripts, ["./js/atproto/atproto-client.js", "./js/atproto/atproto-session.js"]);
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

test("service worker imports AT Protocol dependencies directly before DM service setup", () => {
  const source = fs.readFileSync(path.join(projectRoot, "sw.js"), "utf8");
  const importListIndex = source.indexOf('importScripts("./js/worker/account-avatar-cache.js"');
  const clientIndex = source.indexOf('"./js/atproto/atproto-client.js"', importListIndex);
  const sessionIndex = source.indexOf('"./js/atproto/atproto-session.js"', importListIndex);
  const dmServiceIndex = source.indexOf('"./js/worker/dm-service.js"', importListIndex);
  assert.ok(clientIndex >= 0 && sessionIndex > clientIndex && dmServiceIndex > sessionIndex);
  assert.equal(source.includes('"./js/atproto/atproto-worker.js", "./js/worker/search-queries.js"'), false);
});

test("public archive avatar download resolves CDN DID/CID through the owner PDS without a session", async () => {
  const { context } = loadAtprotoWorkerContext();
  const requests = [];
  context.assertSecureServiceUrl = url => assert.match(url, /^https:\/\//);
  context.normalizeServiceUrl = url => url;
  context.resolvePdsForDid = async did => {
    assert.equal(did, "did:plc:nex3m33ljbp7casi4wx3tqja");
    return "https://owner-pds.test";
  };
  context.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  const cid = "bafkreihy4tfl5mkkpil33hw4ppwu4ldgs4t54j3mjwewbtrn5mte4hkixi";
  const result = await context.downloadRemoteAssetViaBlob({ service: "https://bsky.social" },
    `https://cdn.bsky.app/img/avatar/plain/did:plc:nex3m33ljbp7casi4wx3tqja/${cid}`);
  assert.equal(result.type, "image/jpeg");
  assert.deepEqual([...result.bytes], [1, 2, 3]);
  assert.equal(requests.length, 1);
  const target = new URL(requests[0].url);
  assert.equal(target.origin, "https://owner-pds.test");
  assert.equal(target.pathname, "/xrpc/com.atproto.sync.getBlob");
  assert.equal(target.searchParams.get("cid"), cid);
  assert.equal(target.searchParams.get("did"), "did:plc:nex3m33ljbp7casi4wx3tqja");
  assert.equal(requests[0].options.headers, undefined);
});

test("current actor profile record is requested from the DID document PDS", async () => {
  const { context } = loadAtprotoWorkerContext();
  const requests = [];
  context.assertSecureServiceUrl = url => assert.match(url, /^https:\/\//);
  context.normalizeServiceUrl = url => url;
  context.resolvePdsForDid = async (did, fallback, cache) => {
    assert.equal(did, "did:plc:peer");
    assert.equal(fallback, "https://bsky.social");
    assert.equal(cache instanceof Map, true);
    return "https://eurosky.social";
  };
  context.createThreadlineTransportService = () => ({
    get: async (endpoint, params, options) => {
      requests.push({ endpoint, params, options });
      return { value: { handle: "peer.eurosky.social", avatar: { ref: { $link: "current-cid" } } } };
    },
    request: async () => ({}),
  });
  const cache = new Map();
  const profile = await context.fetchProfileRecordForDid("did:plc:peer", { service: "https://bsky.social" }, cache);
  assert.equal(profile.handle, "peer.eurosky.social");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].endpoint, "com.atproto.repo.getRecord");
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0].params)), {
    repo: "did:plc:peer",
    collection: "app.bsky.actor.profile",
    rkey: "self",
  });
  assert.equal(requests[0].options.base, "https://eurosky.social/xrpc");
});

test("profile lookup falls back to the public AppView when the current PDS record is unavailable", async () => {
  const { context } = loadAtprotoWorkerContext();
  const requests = [];
  context.assertSecureServiceUrl = url => assert.match(url, /^https:\/\//);
  context.normalizeServiceUrl = url => url;
  context.resolvePdsForDid = async () => "https://eurosky.social";
  context.createThreadlineTransportService = () => ({
    get: async (endpoint, params, options) => {
      requests.push({ endpoint, params, options });
      if (endpoint === "com.atproto.repo.getRecord") { throw new Error("PDS CORS/read unavailable"); }
      return { did: "did:plc:peer", handle: "peer.eurosky.social", avatar: "https://cdn.bsky.app/img/avatar/plain/did:plc:peer/current-cid@jpeg" };
    },
    request: async () => ({}),
  });
  const profile = await context.fetchProfileRecordForDid("did:plc:peer", { service: "https://bsky.social" }, new Map());
  assert.equal(profile.handle, "peer.eurosky.social");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].endpoint, "app.bsky.actor.getProfile");
  assert.equal(requests[1].options.base, context.API_BASE);
});
