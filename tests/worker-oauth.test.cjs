"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

const site = "https://threadline.example/threadline/";
const did = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const chat = "rpc?lxm=chat.bsky.convo.getMessages&lxm=chat.bsky.convo.listConvos&aud=did:web:api.bsky.chat%23bsky_chat";

/** Builds a worker OAuth service with independent SDK and transport fixtures. @returns {object} Service and observations. */
function fixture() {
  const globals = { URL, URLSearchParams, Request, Response, Headers, AbortSignal, Blob };
  runInNewContext(readFileSync(join(__dirname, "../js/worker/oauth-service.js"), "utf8"), globals);
  const calls = [];
  let callbackState = { did, handle: "owner.example", returnTo: "tools" };
  const session = {
    did, getTokenInfo: async () => ({ aud: "https://pds.example" }),
    fetchHandler: async (path, init) => { calls.push([path, init]); return new Response("{}"); },
  };
  const client = {
    identityResolver: { resolve: async () => ({ did }) },
    authorize: async (identity, authorization) => { calls.push([identity, authorization]); return new URL("https://provider.example/authorize"); },
    callback: async () => ({ session, state: JSON.stringify(callbackState) }),
    revoke: async (value) => { calls.push(["revoke", value]); },
    restore: async () => session,
  };
  const service = globals.createThreadlineOAuthService({
    sdk: { OAuthClient: function OAuthClient() { return client; } },
    storage: {}, crypto, locks: { request: (key, task) => task() },
    fetch: async () => Response.json({
      client_id: site + "oauth-client-metadata.json", redirect_uris: [site + "oauth-callback.html"],
      token_endpoint_auth_method: "none", dpop_bound_access_tokens: true, application_type: "web",
      scope: "atproto " + chat,
    }),
    scopeUrl: site, saveAccount: async (account) => { calls.push(["save", account]); },
    error: (message, code) => Object.assign(new Error(message), { code }),
  });
  return { service, calls, setCallbackState: (value) => { callbackState = value; } };
}

test("OAuth requests DM access only on explicit selection and binds the expected DID and workspace", async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.begin({ handle: "https://example.org" }), { code: "OAUTH_BAD_HANDLE" });
  assert.equal(await service.begin({ handle: "Owner.example", workspace: "tools" }), "https://provider.example/authorize");
  assert.equal(calls[0][0], did);
  assert.equal(calls[0][1].scope, "atproto");
  assert.deepEqual(JSON.parse(calls[0][1].state), { did, handle: "owner.example", returnTo: "tools" });
  await service.begin({ handle: "owner.example", workspace: "//example.org", dm: true });
  assert.equal(calls[1][1].scope, "atproto " + chat);
  assert.equal(JSON.parse(calls[1][1].state).returnTo, "composer");
});

test("OAuth callback persists metadata only and revokes a grant if the returned DID differs", async () => {
  const { service, calls, setCallbackState } = fixture();
  await assert.rejects(service.finish({ fragment: "code=fixture" }), { code: "OAUTH_CALLBACK_FAILED" });
  assert.equal((await service.finish({ fragment: "state=fixture&code=fixture" })).workspace, "tools");
  assert.deepEqual(Object.keys(calls[0][1]).sort(), ["did", "handle", "pdsUrl"]);
  setCallbackState({ did: "did:plc:other", returnTo: "tools" });
  await assert.rejects(service.finish({ fragment: "state=another&code=fixture" }), { code: "OAUTH_CALLBACK_FAILED" });
  assert.deepEqual(calls[1], ["revoke", did]);
});

test("OAuth XRPC strips legacy auth, keeps the chat header and rejects absolute request destinations", async () => {
  const { service, calls } = fixture();
  const account = await service.ensure({ did, handle: "owner.example", appPassword: "legacy-fixture" });
  assert.equal(account.oauthRequest.oauthDid, did);
  assert.equal(account.session.accessJwt, undefined);
  await assert.rejects(service.request(did, "//example.org/foo", {}), { code: "OAUTH_REQUEST_FAILED" });
  await service.request(did, "chat.bsky.convo.listConvos?limit=1", { headers: { authorization: "Bearer legacy", "atproto-proxy": "chat" } });
  assert.equal(calls[0][0], "/xrpc/chat.bsky.convo.listConvos?limit=1");
  assert.equal(calls[0][1].headers.get("authorization"), null);
  assert.equal(calls[0][1].headers.get("atproto-proxy"), "chat");
  assert.equal(calls[0][1].redirect, "error");
});

test("OAuth callback page removes a code before contacting the worker and returns only to a fixed app page", async () => {
  const { finishOAuthNavigation } = await importProjectModule("js/core/app-oauth.js");
  const events = [];
  const options = {
    href: site + "oauth-callback.html?unexpected=yes#code=fixture&state=fixture",
    scrub: (path) => events.push(["scrub", path]),
    request: async () => { events.push(["request"]); return { workspace: "tools" }; },
    navigate: (target) => events.push(["navigate", target]),
    showError: (code) => events.push(["error", code]),
  };
  await finishOAuthNavigation(options);
  assert.deepEqual(events, [["scrub", "/threadline/oauth-callback.html"], ["request"], ["navigate", "./tools.html"]]);
  await finishOAuthNavigation({ ...options, href: site + "oauth-callback.html" });
  assert.deepEqual(events.at(-1), ["error", "oauthCallbackFailed"]);
});
