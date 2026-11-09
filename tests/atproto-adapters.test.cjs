"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/**
 * Creates a worker-request recorder for AT Protocol adapter tests.
 * @returns {{request: Function, calls: Array<object>}} Request function and its captured calls.
 */
function createRequestRecorder() {
  const calls = [];
  return {
    calls,
    request(type, payload, options) {
      calls.push({ type, payload, options });
      return Promise.resolve({ type, payload, options });
    },
  };
}

test("posting adapters normalize payloads and preserve request options", async () => {
  const posting = await importProjectModule("js/atproto/atproto-posting.js");
  const recorder = createRequestRecorder();
  const progress = () => {};

  await posting.requestPostLike(recorder.request, { uri: " at://post ", cid: " cid " });
  await posting.requestPostUnlike(recorder.request, " at://like ");
  await posting.requestThreadPublish(recorder.request, { segments: ["one"] }, { onProgress: progress });
  await posting.requestReplyTarget(recorder.request, " https://bsky.app/post ", " quote ");

  assert.deepEqual(recorder.calls, [
    { type: "LIKE_POST", payload: { uri: "at://post", cid: "cid" }, options: undefined },
    { type: "UNLIKE_POST", payload: { likeUri: "at://like" }, options: undefined },
    { type: "PUBLISH_THREAD", payload: { segments: ["one"] }, options: { onProgress: progress } },
    { type: "CHECK_REPLY_TARGET", payload: { url: "https://bsky.app/post", mode: "quote" }, options: undefined },
  ]);
});

test("search, media and actor adapters use their worker contracts", async () => {
  const search = await importProjectModule("js/atproto/atproto-search.js");
  const media = await importProjectModule("js/atproto/atproto-media.js");
  const actors = await importProjectModule("js/atproto/atproto-actors.js");
  const recorder = createRequestRecorder();
  const options = { timeout: 5000 };

  await search.requestSearchResults(recorder.request, { query: "test" }, options);
  await media.requestThreadExplorerMediaHydration(recorder.request, { uri: "at://root" }, options);
  await actors.requestAccountSwitch(recorder.request, " did:plc:alice ");
  await actors.requestAccountLogout(recorder.request, " did:plc:alice ");
  await actors.requestAccountRemoval(recorder.request, " did:plc:alice ");

  assert.deepEqual(recorder.calls, [
    { type: "LOAD_SEARCH_RESULTS", payload: { query: "test" }, options },
    { type: "HYDRATE_THREAD_EXPLORER_MEDIA", payload: { root: { uri: "at://root" } }, options },
    { type: "SWITCH_ACCOUNT", payload: { did: "did:plc:alice" }, options: undefined },
    { type: "LOGOUT", payload: { did: "did:plc:alice" }, options: undefined },
    { type: "REMOVE_ACCOUNT", payload: { did: "did:plc:alice" }, options: undefined },
  ]);
});
