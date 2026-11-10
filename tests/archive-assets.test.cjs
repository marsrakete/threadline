"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/** Creates browser-independent binary IO adapters. @returns {Promise<object>} Module, mutable adapters and asset service. */
async function assetFixture() {
  const module = await importProjectModule("js/shared/shared-assets.js");
  const requests = [];
  const bitmaps = [];
  const dependencies = {
    encodeBase64: btoa, decodeBase64: atob, blob: (parts, options) => new Blob(parts, options),
    reader: () => ({ readAsDataURL(blob) {
      blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`; this.onload(); });
    } }),
    bitmap: async blob => { bitmaps.push(blob); return { close() {} }; },
    fetch: async (...args) => { requests.push(args); return { ok: true, headers: new Headers({ "content-type": "image/png" }), arrayBuffer: async () => new Uint8Array([1, 2]).buffer }; },
    encodeError: () => "localized encode failure", loadError: status => `localized HTTP ${status}`,
  };
  return { module, dependencies, requests, bitmaps, service: module.createAssetService(dependencies) };
}

test("asset service validates explicit browser adapters and preserves MIME extension rules", async () => {
  const { module, dependencies } = await assetFixture();
  assert.throws(() => module.createAssetService(), TypeError);
  for (const name of Object.keys(dependencies)) assert.throws(() => module.createAssetService({ ...dependencies, [name]: null }), TypeError, name);
  for (const [type, extension] of [["IMAGE/PNG; charset=binary", "png"], ["image/webp", "webp"], ["image/gif", "gif"], ["image/jpeg", "jpg"], [null, "jpg"], ["image/avif", "jpg"]]) {
    assert.equal(module.getAssetExtensionFromMimeType(type), extension);
  }
});

test("asset base64 handles empty input, byte views and inputs larger than one encoding chunk", async () => {
  const { service } = await assetFixture();
  const source = Uint8Array.from({ length: 100000 }, (_, index) => index % 256).subarray(1, 99999);
  assert.equal(service.toBase64(source), Buffer.from(source).toString("base64"));
  assert.deepEqual(service.fromBase64(service.toBase64(source)), source);
  assert.equal(service.toBase64(new Uint8Array()), "");
  assert.equal(service.fromBase64().length, 0);
  assert.throws(() => service.fromBase64("%%%"));
  assert.throws(() => service.toBase64(null), TypeError);
});

test("asset Data URLs retain MIME types, normalize async byte arrays and preserve byte view bounds", async () => {
  const { service } = await assetFixture();
  const bytes = new Uint8Array([9, 1, 2, 9]).subarray(1, 3);
  assert.equal(service.dataUri({ type: "image/png", bytes }), "data:image/png;base64,AQI=");
  assert.equal(await service.readDataUri({ type: "image/png", bytes }), service.dataUri({ type: "image/png", bytes }));
  assert.equal(await service.readDataUri({ bytes: [1, 2] }), "data:application/octet-stream;base64,AQI=");
  assert.equal(await service.readDataUri(null), "data:application/octet-stream;base64,");
  assert.throws(() => service.dataUri(null), TypeError);
});

test("asset reader failures preserve the original error and localize the missing-error fallback", async () => {
  const { module, dependencies } = await assetFixture();
  const expected = new Error("reader broke");
  dependencies.reader = () => ({ error: expected, readAsDataURL() { this.onerror(); } });
  await assert.rejects(() => module.createAssetService(dependencies).readDataUri({ bytes: [] }), error => error === expected);
  dependencies.reader = () => ({ readAsDataURL() { this.onerror(); } });
  await assert.rejects(() => module.createAssetService(dependencies).readDataUri({ bytes: [] }), /localized encode failure/);
});

test("asset downloads retain response bytes and report HTTP and network errors", async () => {
  const { module, dependencies, requests, service } = await assetFixture();
  assert.deepEqual(await service.download("https://example.test/avatar"), { type: "image/png", bytes: new Uint8Array([1, 2]) });
  assert.deepEqual(requests, [["https://example.test/avatar", { method: "GET" }]]);
  dependencies.fetch = async () => ({ ok: true, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) });
  assert.equal((await module.createAssetService(dependencies).download("empty")).type, "application/octet-stream");
  dependencies.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => module.createAssetService(dependencies).download("missing"), /localized HTTP 404/);
  dependencies.fetch = async () => { throw new Error("network failed"); };
  await assert.rejects(() => module.createAssetService(dependencies).download("offline"), /network failed/);
});

test("asset bitmaps retain original bytes and PNG fallback while leaving lifetime to the renderer", async () => {
  const { service, bitmaps, dependencies, module } = await assetFixture();
  const bitmap = await service.bitmap({ bytes: new Uint8Array([1]) });
  assert.equal(typeof bitmap.close, "function");
  assert.equal(bitmaps[0].type, "image/png");
  assert.deepEqual([...new Uint8Array(await bitmaps[0].arrayBuffer())], [1]);
  await assert.rejects(() => service.bitmap(null), TypeError);
  dependencies.bitmap = async () => { throw new Error("invalid image"); };
  await assert.rejects(() => module.createAssetService(dependencies).bitmap({ bytes: [] }), /invalid image/);
});

/** Creates mutable account state and observed avatar downloads. @returns {Promise<object>} Hydration operations and test adapters. */
async function avatarFixture() {
  const module = await importProjectModule("js/tools/archive-assets.js");
  const calls = [];
  const state = { accounts: [{ did: "self", handle: "self.test", avatar: "https://example.test/self" }], did: "self", handle: "self.test" };
  const dependencies = { state: () => state, partner: catalog => catalog.partner || null,
    download: async url => { calls.push(url); return { type: "image/png", bytes: new Uint8Array([1]) }; }, extension: () => "png" };
  return { module, state, dependencies, calls, assets: module.createArchiveAvatarAssets(dependencies) };
}

test("archive avatar hydration reuses successful URLs, self avatars and existing paths without duplicating assets", async () => {
  const { assets, calls } = await avatarFixture();
  const catalog = { posts: [{ authorDid: "self", authorHandle: "self.test" }, { authorAvatar: "https://example.test/self", authorHandle: "other" },
    { authorAvatar: "unused", authorAvatarPath: "existing" }], assets: [{ path: "existing", bytes: new Uint8Array() }] };
  assert.equal(await assets.archive(catalog), catalog);
  assert.equal(catalog.posts[0].authorAvatarPath, "avatars/self.test.png");
  assert.equal(catalog.posts[1].authorAvatarPath, catalog.posts[0].authorAvatarPath);
  assert.equal(catalog.assets.length, 2);
  assert.equal(catalog.assets[1].sizeBytes, 1);
  assert.deepEqual(calls, ["https://example.test/self"]);
  await assets.archive(catalog);
  assert.equal(calls.length, 1);
});

test("archive avatar failures remain optional and existing filename collisions keep the previous asset", async () => {
  const { module, dependencies, assets, calls } = await avatarFixture();
  const original = { path: "avatars/same.png", bytes: new Uint8Array([9]) };
  const catalog = { posts: [{ authorHandle: "same", authorAvatar: "first" }, { authorHandle: "same", authorAvatar: "second" }], assets: [original] };
  await assets.archive(catalog);
  assert.equal(calls.length, 2);
  assert.deepEqual(catalog.assets, [original]);
  assert.equal(catalog.posts[1].authorAvatarPath, original.path);
  const failures = [];
  dependencies.download = async url => { failures.push(url); throw new Error("offline"); };
  const failed = { posts: [{ authorAvatar: "missing" }, { authorHandle: "no-avatar" }, { authorAvatar: "missing" }] };
  await module.createArchiveAvatarAssets(dependencies).archive(failed);
  assert.equal(failed.posts[0].authorAvatarPath, "");
  assert.equal(failed.posts[1].authorAvatarPath, undefined);
  assert.deepEqual(failed.assets, []);
  assert.deepEqual(failures, ["missing"]);
});

test("local-only avatar preparation retains embedded assets without requesting remote avatars", async () => {
  const { assets, calls } = await avatarFixture();
  const catalog = { posts: [{ authorDid: "self" }, { authorAvatar: "https://example.test/missing" },
    { authorAvatarPath: "avatars/existing.png" }], assets: [{ path: "avatars/existing.png", bytes: new Uint8Array([1]) }] };
  await assets.archive(catalog, { downloadMissing: false });
  assert.deepEqual(calls, []);
  assert.equal(catalog.posts[2].authorAvatarPath, "avatars/existing.png");
  assert.equal(catalog.assets.length, 1);
});

test("DM avatar hydration propagates cached self, primary-partner and member paths without downloading", async () => {
  const { assets, calls } = await avatarFixture();
  const catalog = { manifest: { account: { did: "self", avatarPath: "self.png" } }, partner: { did: "partner" },
    recentContacts: [{ did: "partner", avatarPath: "recent.png" }], conversations: [{ members: [{ did: "partner" }, { did: "other", avatarPath: "other.png" }] }],
    messages: [{ senderDid: "self" }, { senderDid: "partner" }, { senderDid: "other" }, { senderDid: "other", senderAvatarPath: "retained.png" }, null] };
  assert.equal(await assets.dm(catalog), catalog);
  assert.equal(catalog.partner.avatarPath, "recent.png");
  assert.equal(catalog.conversations[0].members[0].avatarPath, "recent.png");
  assert.deepEqual(catalog.messages.slice(0, 4).map(message => message.senderAvatarPath), ["self.png", "recent.png", "other.png", "retained.png"]);
  assert.deepEqual(calls, []);
});

test("avatar hydration handles empty/null catalogs, missing identity and invalid configuration", async () => {
  const { module, dependencies, assets, state } = await avatarFixture();
  for (const method of ["archive", "dm"]) {
    assert.equal(await assets[method](null), null);
    assert.deepEqual(await assets[method]({}), { assets: [] });
  }
  state.accounts = []; state.did = "";
  const catalog = { messages: [{ senderDid: "unknown" }] };
  await assets.dm(catalog);
  assert.equal(catalog.messages[0].senderAvatarPath, undefined);
  assert.throws(() => module.createArchiveAvatarAssets(), TypeError);
  for (const key of Object.keys(dependencies)) assert.throws(() => module.createArchiveAvatarAssets({ ...dependencies, [key]: null }), TypeError, key);
});

test("saved account avatars preserve path, DID/URL lookup and remote fallback priorities", async () => {
  const { resolveStoredAccountAvatar } = await importProjectModule("js/shared/shared-accounts.js");
  const assets = [{ path: "by-path", did: "first" }, { path: "by-did", did: "second", url: "remote" }];
  const encode = asset => `embedded:${asset.path}`;
  const account = { did: "second", avatarPath: "by-path" };
  assert.equal(resolveStoredAccountAvatar(account, assets, encode), "embedded:by-path");
  const missing = { did: "second", avatarPath: "missing" };
  assert.equal(resolveStoredAccountAvatar(missing, assets, encode), "embedded:by-did");
  assert.equal(missing.avatarPath, "by-did");
  assert.equal(resolveStoredAccountAvatar({ avatar: "remote" }, assets, encode), "embedded:by-did");
  assert.equal(resolveStoredAccountAvatar({ avatar: " remote " }, null, encode), "remote");
  assert.equal(resolveStoredAccountAvatar(null, [], encode), "");
  assert.throws(() => resolveStoredAccountAvatar({ avatarPath: "by-path" }, assets, null), TypeError);
});

test("asset modules are cached and callers use shared implementations instead of local copies", () => {
  const source = fs.readFileSync("app.js", "utf8");
  const worker = fs.readFileSync("sw.js", "utf8");
  for (const path of ["./js/shared/shared-assets.js", "./js/tools/archive-assets.js"]) {
    assert.ok(source.includes(path)); assert.ok(worker.includes(path));
  }
  assert.doesNotMatch(source, /function (?:bytesToBase64|base64ToBytes|assetToDataUri|assetToDataUriAsync|downloadRemoteAssetForCatalog|getAssetExtensionFromMimeType|loadArchiveAssetBitmap)\(/);
});
