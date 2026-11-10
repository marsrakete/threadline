"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { dmServiceFixture, dmConversation, plain } = require("./worker-dm-service-fixtures.cjs");

test("DM service requires explicit adapters/models and exposes a frozen API", () => {
  const f = dmServiceFixture();
  assert.throws(() => f.factory(), /session/);
  for (const [key, value] of Object.entries(f.options)) {
    if (typeof value === "function" || key === "models") {
      assert.throws(() => f.factory({ ...f.options, [key]: null }), TypeError);
    }
  }
  for (const key of ["normalizeDmFilters", "normalizeDmDateFilterValue", "normalizeDmConversationEntity", "normalizeDmMessageEntity", "extractDmExternalCardFromEmbedSw"]) {
    assert.throws(() => f.factory({ ...f.options, models: { ...f.options.models, [key]: null } }), TypeError);
  }
  assert.equal(Object.isFrozen(f.service), true);
  assert.deepEqual(Object.keys(f.service), ["exportArchive", "checkAccess", "listPartners", "hydrateAvatars"]);
});

test("DM worker text retains literal interpolation, existing wording and rejects unknown keys", () => {
  const { context: c } = dmServiceFixture();
  assert.equal(Object.isFrozen(c.ThreadlineDmMessages), true);
  assert.equal(c.formatThreadlineDmMessage("conversationRead", { index: 1, count: 2 }), "Unterhaltung 1/2 wird gelesen");
  assert.equal(c.formatThreadlineDmMessage("partnersReady", { count: "$&{index}<b>" }), "$&{index}<b> DM-Partner stehen lokal bereit.");
  assert.equal(c.formatThreadlineDmMessage("partnersReady"), "{count} DM-Partner stehen lokal bereit.");
  for (const key of ["missing", "toString", null]) { assert.throws(() => c.formatThreadlineDmMessage(key), TypeError); }
});

test("DM access check preserves session and chat endpoint failures", async () => {
  const f = dmServiceFixture(); assert.deepEqual(plain(await f.service.checkAccess()), { ok: true });
  assert.deepEqual(plain(f.calls), [["session"], ["chat", "chat.bsky.convo.listConvos", { limit: 1 }]]);
  await assert.rejects(dmServiceFixture({ sessionError: true }).service.checkAccess(), /session failed/);
  await assert.rejects(dmServiceFixture({ chatError: true }).service.checkAccess(), /chat failed/);
});

test("DM partner listing pages, deduplicates latest profiles, sorts and skips assets on request", async () => {
  const older = dmConversation("old", "2026-10-20", [{ did: "peer", handle: "old.test" }]);
  const newer = dmConversation("new", "2026-10-22", [{ did: "peer", handle: "new.test" }, { did: "other", handle: "other.test" }]);
  const f = dmServiceFixture({ convoPages: { "": { convos: [older], cursor: "next" }, next: { convos: [newer] } } });
  const result = await f.service.listPartners({ downloadAssets: false }, f.notify);
  assert.deepEqual(plain(result.recentContacts.map(c => [c.did, c.handle, c.conversationId])), [["peer", "new.test", "new"], ["other", "other.test", "new"]]);
  assert.equal(result.conversations.length, 2); assert.deepEqual(plain(result.assets), []);
  assert.deepEqual(plain(f.calls.filter(c => c[0] === "chat").map(c => c[2])), [{ limit: 100, cursor: "" }, { limit: 100, cursor: "next" }]);
  assert.equal(f.calls.some(c => c[0] === "profiles" || c[0] === "asset"), false);
  assert.deepEqual(f.progress.map(p => p.percent), [8, 23, 38]);
  assert.equal(f.progress.at(-1).detail, "Partnerliste vollständig geladen.");
});

test("DM partner listing tolerates empty/malformed API collections and propagates chat failure", async () => {
  for (const convos of [undefined, [], "bad"]) {
    const f = dmServiceFixture({ convoPages: { "": { convos } } });
    assert.deepEqual(plain(await f.service.listPartners(undefined, f.notify)), { recentContacts: [], conversations: [], assets: [] });
    assert.equal(f.progress.at(-1).percent, 100);
  }
  await assert.rejects(dmServiceFixture({ chatError: true }).service.listPartners(), /chat failed/);
});

test("DM partner listing downloads assets once per path and keeps failed contacts usable", async () => {
  const f = dmServiceFixture({ convoPages: { "": { convos: [dmConversation("one", "2026-10-22", [
    { did: "one", handle: "same.test", avatar: "one-avatar" }, { did: "two", handle: "same.test", avatar: "two-avatar" },
    { did: "fail", avatar: "fail-avatar" },
  ])] } } });
  const result = await f.service.listPartners({}, f.notify);
  assert.equal(result.assets.length, 1);
  assert.equal(result.recentContacts[0].avatarPath, "dm-avatars/same.test.png");
  assert.equal(result.recentContacts[1].avatarPath, result.recentContacts[0].avatarPath);
  assert.equal(result.recentContacts[2].avatarPath, "");
  assert.equal(result.conversations[0].members[0].avatarPath, result.assets[0].path);
  assert.equal(result.assets[0].bytes.length, result.assets[0].sizeBytes);
  assert.equal(f.progress.at(-1).percent, 100);
});

test("DM avatar hydration reads migrated profile blobs from the actor's current PDS", async () => {
  const f = dmServiceFixture({
    profileRecords: {
      peer: {
        handle: "peer.eurosky.social",
        displayName: "Eurosky Peer",
        avatar: { ref: { $link: "eurosky-avatar-cid" } },
      },
    },
  });
  const result = await f.service.hydrateAvatars({
    recentContacts: [{ did: "peer", handle: "old.test", displayName: "Old name", avatar: "https://cdn.bsky.app/old-avatar" }],
    conversations: [],
  }, f.notify);
  assert.equal(result.recentContacts[0].handle, "peer.eurosky.social");
  assert.equal(result.recentContacts[0].displayName, "Eurosky Peer");
  assert.deepEqual(f.calls.find((call) => call[0] === "blob").slice(1), ["peer", "eurosky-avatar-cid"]);
  assert.equal(f.calls.some((call) => call[0] === "asset"), false);
});

test("DM avatar hydration copies inputs and batches missing profiles with authenticated transport", async () => {
  const contacts = Array.from({ length: 26 }, (_, index) => ({ did: "peer" + index }));
  const conversations = [{ id: "one", members: [{ did: "peer0" }] }];
  const f = dmServiceFixture();
  const result = await f.service.hydrateAvatars({ recentContacts: contacts, conversations }, f.notify);
  const profileCalls = f.calls.filter(c => c[0] === "profiles");
  assert.deepEqual(profileCalls.map(c => c[2].actors.length), [25, 1]);
  assert.deepEqual(plain(profileCalls[0][3]), { headers: { authorization: "Bearer fixture-token" }, base: "https://fixture.test/xrpc" });
  assert.equal(result.recentContacts[0].displayName, "Profile peer0");
  assert.equal(result.conversations[0].members[0].avatarPath, "dm-avatars/peer0.test.png");
  assert.equal(result.assets.length, 26); assert.equal(contacts[0].avatar, undefined); assert.equal(conversations[0].members[0].avatarPath, undefined);
  assert.notEqual(result.conversations[0], conversations[0]); assert.notEqual(result.conversations[0].members[0], conversations[0].members[0]);
  assert.equal(f.progress[0].percent, 56); assert.equal(f.progress.at(-1).percent, 100);
});

test("DM avatar hydration tolerates missing collections, missing tokens and failed profiles/assets", async () => {
  const empty = dmServiceFixture();
  assert.deepEqual(plain(await empty.service.hydrateAvatars({ recentContacts: "bad", conversations: [{ members: "bad" }] }, empty.notify)),
    { recentContacts: [], conversations: [{ members: [] }], assets: [] });
  assert.equal(empty.progress[0].detail, "");
  const failed = dmServiceFixture({ profileError: true, assetError: true });
  const result = await failed.service.hydrateAvatars({ recentContacts: [{ did: "missing" }, { did: "known", avatar: "avatar" }] });
  assert.equal(result.recentContacts.length, 2); assert.equal(result.recentContacts[1].avatarPath, ""); assert.equal(result.assets.length, 0);
  const noToken = dmServiceFixture({ auth: { session: { did: "self" } } });
  await noToken.service.hydrateAvatars({ recentContacts: [{ did: "peer" }] });
  assert.equal(noToken.calls.some(c => c[0] === "profiles"), false);
  await assert.rejects(noToken.service.hydrateAvatars(null), /Cannot read properties of null/);
});

test("DM archive uses cached conversations, pages messages and preserves inclusive UTC boundaries", async () => {
  const f = dmServiceFixture({ messagePages: {
    "one|": { messages: [
      { id: "before", sentAt: "2026-10-21T23:59:59.999Z" }, { id: "start", sentAt: "2026-10-22T00:00:00.000Z", sender: { did: "self" } },
      { id: "invalid", sentAt: "invalid", sender: { did: "peer" } },
    ], cursor: "next" },
    "one|next": { messages: [{ id: "end", sentAt: "2026-10-22T23:59:59.999Z", sender: { did: "peer" } }, { id: "after", sentAt: "2026-10-23T00:00:00.000Z" }] },
  } });
  const conversation = f.options.models.normalizeDmConversationEntity(dmConversation(), "self");
  const result = await f.service.exportArchive({ filters: { participantDid: " peer ", from: "2026-10-22", to: "2026-10-22" },
    partnerCache: { recentContacts: [{ did: "peer", handle: "peer.test", avatar: "peer-avatar" }], conversations: [conversation], assets: [{ path: "existing" }] } }, f.notify);
  assert.deepEqual(plain(result.messages.map(m => m.id)), ["start", "invalid", "end"]);
  assert.equal(result.messages[0].senderHandle, "self.test"); assert.equal(result.messages[1].senderHandle, "peer.test");
  assert.equal(result.messages[0].senderAvatarPath, "dm-avatars/self.test.png");
  assert.equal(result.conversations[0].messageCount, 3); assert.equal(conversation.messageCount, 3);
  assert.equal(result.manifest.participantCount, 1); assert.equal(result.manifest.messageCount, 3);
  assert.equal(result.manifest.exportedAt, "2026-10-22T10:00:00.000Z"); assert.equal(result.manifest.appVersion, "v375");
  assert.equal(result.assets[0].path, "existing");
  assert.equal(f.calls.some(c => c[0] === "chat" && c[1] === "chat.bsky.convo.listConvos"), false);
  assert.deepEqual(f.calls.filter(c => c[0] === "chat").map(c => c[2].cursor), ["", "next"]);
  assert.equal(f.progress.at(-1).percent, 98);
});

test("DM archive falls back to partner lookup and keeps empty conversations only without date filters", async () => {
  for (const filters of [{ participantDid: "peer" }, { participantDid: "peer", from: "2026-10-22" }]) {
    const f = dmServiceFixture({ convoPages: { "": { convos: [dmConversation()] } } });
    const result = await f.service.exportArchive({ filters, partnerCache: { conversations: [] } });
    if (filters.from) { assert.equal(result.conversations.length, 0); } else { assert.equal(result.conversations.length, 1); }
    assert.equal(result.messages.length, 0); assert.equal(result.manifest.participantCount, 1);
    assert.equal(f.calls.some(c => c[0] === "chat" && c[1] === "chat.bsky.convo.listConvos"), true);
  }
  const f = dmServiceFixture({ auth: { session: { did: "self", handle: "self.test" } }, accountAvatar: "fallback-avatar" });
  await assert.rejects(f.service.exportArchive(), /Bitte zuerst genau einen DM-Partner auswählen/);
  assert.deepEqual(f.calls.map(c => c[0]), ["session", "accountAvatar"]);
  await assert.rejects(dmServiceFixture({ sessionError: true }).service.exportArchive(), /session failed/);
});

test("DM archive embeds URL and CID thumbnails and preserves cards when assets fail", async () => {
  for (const assetError of [false, true]) {
    const f = dmServiceFixture({ assetError, convoPages: { "": { convos: [dmConversation()] } }, messagePages: { "one|": { messages: [
      { id: "url", sender: { did: "peer" }, embed: { external: { uri: "https://example.test/url", thumb: "https://example.test/thumb" } } },
      { id: "cid", sender: { did: "peer" }, embed: { external: { uri: "https://example.test/cid", thumb: { ref: { $link: "blob-cid" } } } } },
      { id: "text", sender: { did: "peer" }, embed: { external: { uri: "https://example.test/plain" } } },
    ] } } });
    const result = await f.service.exportArchive({ filters: { participantDid: "peer" } });
    assert.equal(result.messages[0].externalCard.url, "https://example.test/url");
    assert.equal(result.messages[1].externalCard.url, "https://example.test/cid");
    assert.equal(f.calls.some(c => c[0] === "blob" && c[2] === "blob-cid"), true);
    if (assetError) {
      assert.equal(result.assets.length, 0); assert.equal(result.messages[0].externalCard.thumbPath, "");
    } else {
      assert.equal(result.messages[0].externalCard.thumbPath, "dm-link-cards/peer.test-url.png");
      assert.equal(result.messages[1].externalCard.thumbPath, "dm-link-cards/peer.test-cid.png");
      assert.equal(result.assets.length, 4);
    }
    assert.equal(result.messages[2].externalCard.thumbPath, "");
  }
});
