"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { archiveThreadFixture, threadPost, abortFailure } = require("./worker-archive-thread-fixtures.cjs");
const { plain } = require("./worker-archive-models-fixtures.cjs");

test("archive thread service validates explicit adapters, models, defaults and message contracts", () => {
  const f = archiveThreadFixture(); assert.throws(() => f.factory(), /request/);
  for (const key of ["request", "refresh", "base", "wait", "abortController", "schedule", "clearTimer", "messages", "models", "timeoutMs", "retries"]) {
    assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError);
  }
  for (const [group, key] of [["filters", "matchesHashtags"], ["threads", "root"], ["threads", "all"], ["posts", "build"]]) {
    assert.throws(() => f.factory({ ...f.options, models: { ...f.models, [group]: { ...f.models[group], [key]: null } } }), TypeError);
  }
  for (const key of ["readTitle", "threadCheckpoint", "threadTimeout", "threadTimeoutFallback", "threadRetryStep", "threadSkipStep", "threadRetryCheckpoint", "threadTimeoutCheckpoint", "contextExpand", "contextDetail", "contextCheckpoint", "contextSkip", "contextSkipped", "contextSlow", "contextMissing"]) {
    assert.throws(() => f.factory({ ...f.options, messages: { ...f.options.messages, [key]: null } }), TypeError);
  }
  assert.throws(() => f.factory({ ...f.options, retries: -1 }), TypeError);
  assert.throws(() => f.factory({ ...f.options, timeoutMs: NaN }), TypeError);
  assert.equal(Object.isFrozen(f.service), true); assert.equal(Object.keys(f.service).length, 7);
});

test("archive thread classifiers retain message-based missing/timeout rules and tolerate invalid errors", () => {
  const { service: s } = archiveThreadFixture();
  for (const message of ["Post not found", "record not found", "Could not locate record", " NOT FOUND "]) { assert.equal(s.isMissing(new Error(message)), true); }
  assert.equal(s.isTimeout(new Error("Thread request timed out after 15s.")), true);
  for (const error of [null, undefined, {}, new Error("timeout"), { details: { status: 404 } }]) {
    assert.equal(s.isMissing(error), false); assert.equal(s.isTimeout(error), false);
  }
});

test("archive root hashtag lookups preserve response envelopes, fresh auth and cached booleans", async () => {
  for (const wrap of [post => ({ thread: { post } }), post => ({ post }), post => ({ thread: post }), post => post]) {
    const f = archiveThreadFixture(), post = threadPost("root", { text: "#Äpfel" }), cache = new Map();
    f.responses.push(wrap(post)); assert.equal(await f.service.rootMatches(post.uri, { hashtagTags: ["äpfel"] }, f.auth, cache), true);
    assert.equal(await f.service.rootMatches(post.uri, { hashtagTags: ["missing"] }, f.auth, cache), true);
    assert.equal(f.requests.length, 1); assert.deepEqual(plain(f.requests[0].params), { uri: post.uri, depth: 0, parentHeight: 0 });
    assert.equal(f.requests[0].transport.headers.authorization, "Bearer fresh-1"); assert.equal(f.requests[0].transport.base, "https://fixture.test/xrpc");
    assert.equal(f.timers.length, 0);
  }
});

test("archive hashtag lookups skip missing inputs, cache missing posts and propagate other failures", async () => {
  for (const method of ["rootMatches", "threadMatches"]) {
    const f = archiveThreadFixture(), cache = new Map([["cached", false]]);
    assert.equal(await f.service[method]("", { hashtagTags: ["tag"] }, f.auth, cache), false);
    assert.equal(await f.service[method]("root", null, f.auth, cache), false);
    assert.equal(await f.service[method]("cached", { hashtagTags: ["tag"] }, f.auth, cache), false); assert.equal(f.requests.length, 0);
    f.responses.push(new Error("Post not found"));
    assert.equal(await f.service[method]("missing", { hashtagTags: ["tag"] }, f.auth, cache), false); assert.equal(cache.get("missing"), false);
    const failure = new Error("forbidden"); f.responses.push(failure);
    await assert.rejects(f.service[method]("bad", { hashtagTags: ["tag"] }, f.auth, cache), error => error === failure);
    assert.equal(cache.has("bad"), false);
  }
});

test("archive whole-thread hashtag lookups inspect replies at depth 100 and cache misses", async () => {
  const f = archiveThreadFixture(), cache = new Map(), root = threadPost();
  f.responses.push({ thread: { post: root, replies: [{ post: threadPost("child", { text: "#Topic" }) }] } });
  assert.equal(await f.service.threadMatches(root.uri, { hashtagTags: ["topic"] }, f.auth, cache), true);
  assert.equal(f.requests[0].params.depth, 100);
  f.responses.push({ post: threadPost("no-tags") });
  assert.equal(await f.service.threadMatches("no-tags", { hashtagTags: ["topic"] }, f.auth, cache), false); assert.equal(cache.get("no-tags"), false);
});

test("archive media hashtag selection prioritizes direct tags and keeps root/thread caches separate", async () => {
  const f = archiveThreadFixture(), root = threadPost(), child = threadPost("child", { reply: { root: { uri: root.uri } } });
  assert.equal(await f.service.mediaMatches(null, {}, f.auth), true);
  assert.equal(await f.service.mediaMatches(threadPost("tagged", { text: "#Topic" }), { hashtagTags: ["topic"] }, f.auth), true);
  assert.equal(await f.service.mediaMatches(null, { hashtagTags: ["topic"] }, f.auth), false);
  assert.equal(await f.service.mediaMatches(root, { hashtagTags: ["topic"], hashtagScope: "startpost" }, f.auth), false);
  assert.equal(f.requests.length, 0);
  const threadCache = new Map([[root.uri, false]]), rootCache = new Map([[root.uri, true]]);
  assert.equal(await f.service.mediaMatches(child, { hashtagTags: ["topic"], hashtagScope: "startpost" }, f.auth, threadCache, rootCache), true);
  assert.equal(await f.service.mediaMatches(child, { hashtagTags: ["topic"], hashtagScope: "thread" }, f.auth, threadCache, rootCache), false);
  assert.equal(f.requests.length, 0);
});

test("archive thread requests create deadlines before auth and clear timers on success", async () => {
  const f = archiveThreadFixture(), response = { thread: { post: threadPost() } }; f.responses.push(response);
  assert.equal(await f.service.requestThread(f.auth, "uri", { depth: 2, parentHeight: 3, timeoutMs: 1234 }), response);
  assert.deepEqual(f.events, ["abortController", "schedule", "refresh", "request", "clearTimer"]);
  assert.deepEqual(plain(f.requests[0].params), { uri: "uri", depth: 2, parentHeight: 3 });
  assert.equal(f.requests[0].transport.signal.aborted, false); assert.equal(f.timers[0].ms, 1234); assert.equal(f.timers[0].cleared, true);
});

test("archive timeout retry uses fresh signals/auth and retains progress/checkpoint wording", async () => {
  const f = archiveThreadFixture();
  f.responses.push(({ transport }) => { f.timers[0].callback(); assert.equal(transport.signal.aborted, true); throw abortFailure(); }, { thread: {} });
  await f.service.requestThread(f.auth, "uri", { notifyProgress: f.notify, progressTitle: "Literal {seconds}", checkpointPrefix: "Prefix", progressPercent: 42 });
  assert.equal(f.requests.length, 2); assert.notEqual(f.requests[0].transport.signal, f.requests[1].transport.signal);
  assert.equal(f.requests[1].transport.headers.authorization, "Bearer fresh-2"); assert.equal(f.timers.every(timer => timer.cleared), true);
  assert.deepEqual(plain(f.progress[0]), { title: "Literal {seconds}", step: "Thread-Antwort dauert länger als 15s · neuer Versuch startet", percent: 42,
    detail: "uri", checkpoint: "Prefix · Wiederholungsversuch 2/2", state: "running" });
});

test("archive final timeout and transport/auth failures preserve retry limits and clean every timer", async () => {
  const f = archiveThreadFixture(); f.responses.push(abortFailure(), abortFailure());
  await assert.rejects(f.service.requestThread(f.auth, "uri", { notifyProgress: f.notify }), /Thread request timed out after 15s/);
  assert.equal(f.progress.at(-1).checkpoint, "Thread wird geladen · Timeout"); assert.match(f.progress.at(-1).step, /übersprungen/);
  assert.equal(f.timers.every(timer => timer.cleared), true);
  const g = archiveThreadFixture(), first = new Error("first"), last = new Error("last"); g.responses.push(first, last);
  await assert.rejects(g.service.requestThread(g.auth, "uri"), error => error === last); assert.equal(g.progress.length, 0);
  const authFailure = new Error("auth unavailable"); g.options.refresh = async () => { throw authFailure; };
  await assert.rejects(g.factory(g.options).requestThread(g.auth, "uri", { retries: 0 }), error => error === authFailure);
  assert.equal(g.timers.every(timer => timer.cleared), true);
});

test("archive thread request releases timers when progress callbacks fail and preserves zero-attempt fallback", async () => {
  const f = archiveThreadFixture(), failure = new Error("observer failed"); f.responses.push(abortFailure());
  await assert.rejects(f.service.requestThread(f.auth, "uri", { notifyProgress: () => { throw failure; } }), error => error === failure);
  assert.equal(f.timers[0].cleared, true);
  await assert.rejects(f.service.requestThread(f.auth, "uri", { retries: -1 }), /Thread request timed out\./);
  assert.equal(f.timers.length, 1);
});

test("archive context expansion deduplicates root snapshot and enriches/upserts model posts", async () => {
  const f = archiveThreadFixture(), root = threadPost(), child = threadPost("child"), inserted = [];
  const posts = new Map([["a", { uri: root.uri }], ["b", { uri: child.uri, thread: { rootUri: root.uri } }]]), rawRecords = new Map();
  f.responses.push({ thread: { post: root, replies: [{ post: child }] } });
  const result = await f.service.expandContexts({ auth: f.auth, runId: "run", notifyProgress: f.notify, postsByUri: posts, rawRecordsByUri: rawRecords,
    upsertArchivePost: (post, record) => { inserted.push({ post, record }); posts.set(post.uri, post); } });
  assert.equal(result, "completed"); assert.equal(f.requests.length, 1); assert.equal(f.requests[0].params.parentHeight, 100);
  assert.equal(inserted.length, 2); assert.equal(inserted[0].record, root.record); assert.equal(inserted[0].post.rawRecord, root.record);
  assert.equal(inserted[0].post.authorDisplayName, "<b>Own</b>"); assert.equal(inserted[0].post.counts.likeCount, 3); assert.equal(inserted[0].post.counts.replyCount, 0);
  assert.equal(rawRecords.size, 0); assert.equal(f.progress[0].checkpoint, "Konversation 1/1 wird erweitert"); assert.equal(f.progress[0].percent, 58);
});

test("archive context expansion respects cancellation, skips missing/timeouts and propagates other errors", async () => {
  const cancelled = archiveThreadFixture(); cancelled.waits.push("cancelled");
  const input = { auth: cancelled.auth, postsByUri: new Map([["root", { uri: "root" }]]), notifyProgress: cancelled.notify, upsertArchivePost: () => {} };
  assert.equal(await cancelled.service.expandContexts(input), "cancelled"); assert.equal(cancelled.requests.length, 0); assert.equal(cancelled.progress.length, 0);
  for (const error of [new Error("Post not found"), new Error("Thread request timed out after 15s.")]) {
    const f = archiveThreadFixture(); f.responses.push(error, error);
    assert.equal(await f.service.expandContexts({ ...input, auth: f.auth, notifyProgress: f.notify }), "completed");
    assert.match(f.progress.at(-1).step, /übersprungen/); assert.equal(f.timers.every(timer => timer.cleared), true);
  }
  const failed = archiveThreadFixture(), error = new Error("forbidden"); failed.responses.push(error, error);
  await assert.rejects(failed.service.expandContexts({ ...input, auth: failed.auth, notifyProgress: failed.notify }), value => value === error);
  assert.equal(await failed.service.expandContexts({ postsByUri: new Map() }), "completed");
});
