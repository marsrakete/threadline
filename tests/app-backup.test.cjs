"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { File } = require("node:buffer");
const { importProjectModule, createMemoryStorage } = require("./module-test-helpers.cjs");

/** Builds native settings file adapters. @param {object} module - Backup exports. @param {object} overrides - API overrides. @returns {object} Codec. */
function codec(module, overrides = {}) {
  return module.createSettingsBackupCodec({ File, Blob, Response, CompressionStream, DecompressionStream,
    encode: (text) => new TextEncoder().encode(text), decode: (bytes) => new TextDecoder().decode(bytes),
    toBase64: (bytes) => Buffer.from(bytes).toString("base64"), fromBase64: (value) => new Uint8Array(Buffer.from(value, "base64")),
    translate: (key) => key, ...overrides });
}

/** Creates observable backup workflow state/adapters. @param {object} overrides - Dependency replacements. @returns {Promise<object>} Fixture. */
async function fixture(overrides = {}) {
  const module = await importProjectModule("js/core/app-backup.js");
  const calls = []; const elements = {};
  for (const key of ["placement", "intro", "emoji", "spacing", "resize", "expert", "proxyEndpoint", "proxySecret", "locale"]) { elements[key] = {}; }
  const state = { localePreference: "en", hashtags: [{ value: "Old", normalized: "old" }], selectedHashtags: ["old"], searchSelectedHashtags: [],
    postingHistory: [1], savedAccounts: [{ did: "did:one", handle: "one", accessJwt: "never-export", refreshJwt: "never-export" }],
    accountAvatarAssets: [{ path: "avatar.png", bytes: [1, 2] }], dmRecentContactAssets: [], dmRecentContacts: [], dmRecentConversations: [],
    dmPartnerCacheAccountDid: "did:one", dmPartnerCacheUpdatedAt: "", segmentOverrides: ["manual"] };
  const identity = (value) => value || [];
  const options = {
    codec: codec(module), getState: () => state, setState: (next) => Object.assign(state, next),
    getSettings: () => ({ ...state, postLanguages: ["en"], postInteraction: { replyMode: "everyone" },
      segmentImages: ["not-in-backup"], session: "never-export", linkCardProxy: { endpoint: "proxy" } }),
    normalize: { hashtags: identity, mergeHashtags: (base, imported) => [...base, ...imported], selection: identity,
      history: (base, imported) => [...base, ...(imported || [])], favorites: identity, searches: identity,
      placement: (value) => value || "first", resize: (value) => value || "off", layout: () => ({ sidebarWidthDesktop: 300, composerWidthDesktop: 400 }),
      languages: identity, provider: (value) => value || "none", usage: (value) => value || {} },
    translate: (key) => key, now: () => "2026-10-10T12:00:00.000Z", version: { appVersion: "test", cacheVersion: "cache" },
    supportedLocales: ["en", "de", "fr"], detectLocale: () => "de", request: async (type) => { calls.push(type); return { accounts: [{ did: "did:new" }] }; },
    share: async (file) => calls.push(["share", file]), markExported: () => calls.push("marked"), status: (message) => calls.push(message),
    applySearch: () => calls.push("search"), persistAppearance: () => calls.push("appearance"), applyInteraction: () => calls.push("interaction"),
    syncProvider: () => calls.push("provider"), applyArchive: () => calls.push("archive"), restoreAnalysis: () => calls.push("analysis"),
    applyLayout: () => calls.push("layout"), applySidebar: () => calls.push("sidebar"),
    applyAvatarCache: (cache) => { state.accountAvatarAssets = cache.assets; calls.push("avatar"); },
    applyDmCache: (cache) => { Object.assign(state, { dmPartnerCacheAccountDid: cache.accountDid, dmPartnerCacheUpdatedAt: cache.updatedAt,
      dmRecentContacts: cache.recentContacts, dmRecentConversations: cache.conversations, dmRecentContactAssets: cache.assets }); calls.push("dm"); },
    persist: async () => calls.push("persist"), translateUi: () => calls.push("translate"), applyTheme: () => calls.push("theme"),
    applyDensity: () => calls.push("density"), renderAccounts: () => calls.push("accounts"), setLocked: (value) => calls.push(["locked", value]),
    renderSegments: (settings) => calls.push(["render", settings]), ...overrides,
  };
  return { module, controller: module.createSettingsBackupController(elements, options), options, state, elements, calls };
}

test("settings backup codec round-trips gzip/JSON and binary caches with invalid-input handling", async () => {
  const module = await importProjectModule("js/core/app-backup.js"); const files = codec(module);
  const assets = files.serializeAssets([{ path: "a.png", bytes: [1, 2, 3] }, { path: "", bytes: [4] }]);
  assert.deepEqual([...files.deserializeAssets(assets)[0].bytes], [1, 2, 3]);
  assert.deepEqual(files.serializeAssets(null), []); assert.deepEqual(files.deserializeAssets(null), []);
  const payload = { data: { assets } }; const file = await files.createFile(payload, "2026-10-10T12:00:00Z");
  assert.equal(file.name, "threadline-settings-2026-10-10.json.gz"); assert.deepEqual(await files.read(file), payload);
  assert.deepEqual(await files.read(new File([JSON.stringify(payload)], "plain.json")), payload);
  await assert.rejects(files.read(new File(["not json"], "bad.json")), SyntaxError);
  await assert.rejects(files.read(new File(["not gzip"], "bad.gz")));
  await assert.rejects(codec(module, { CompressionStream: undefined }).createFile({}, "2026-10-10"), /backupGzipCompressionUnsupported/);
  await assert.rejects(codec(module, { DecompressionStream: undefined }).read(file), /backupGzipDecompressionUnsupported/);
});

test("settings backup export preserves schema/metadata but excludes account sessions and unrelated state", async () => {
  const { controller, calls } = await fixture(); const payload = await controller.buildPayload();
  assert.equal(payload.schemaVersion, 1); assert.equal(payload.excludesCredentials, true);
  assert.equal(payload.data.savedAccounts[0].did, "did:one"); assert.equal(payload.data.savedAccounts[0].accessJwt, undefined);
  assert.equal(payload.data.session, undefined); assert.equal(payload.data.segmentImages, undefined);
  assert.equal(payload.data.accountAvatarCache.assets[0].bytesBase64, "AQI=");
  await controller.exportFile(); assert.equal(calls[0][0], "share"); assert.deepEqual(calls.slice(-2), ["marked", "backupExported"]);
});

test("settings backup import merges data, normalizes defaults and restores caches before persistence/UI", async () => {
  const { controller, state, elements, calls } = await fixture();
  const imported = { data: { hashtags: [{ value: "New", normalized: "new" }], selectedHashtags: ["new"], searchSelectedHashtags: ["new"],
    postingHistory: [2], localePreference: "auto", themeMode: "dark", compactMode: true, appendThreadIntro: true,
    linkCardProxy: { endpoint: "newproxy", secret: "existing-contract" }, savedAccounts: [{ did: "did:new" }],
    accountAvatarCache: { assets: [{ path: "avatar", bytesBase64: "AQI=" }] }, dmPartnerCache: { accountDid: "did:new", recentContacts: ["contact"] } } };
  await controller.importFile(new File([JSON.stringify(imported)], "settings.json"));
  assert.deepEqual(state.selectedHashtags, ["old", "new"]); assert.deepEqual(state.searchSelectedHashtags, ["new"]);
  assert.deepEqual(state.postingHistory, [1, 2]); assert.equal(state.currentLocale, "de"); assert.equal(state.themeMode, "dark");
  assert.equal(elements.intro.checked, true); assert.equal(elements.proxySecret.value, "existing-contract");
  assert.deepEqual(state.savedAccounts, [{ did: "did:new" }]); assert.equal(state.dmPartnerCacheAccountDid, "did:new");
  assert.ok(calls.indexOf("SAVE_DM_PARTNER_CACHE") < calls.indexOf("persist"));
  assert.deepEqual(calls.slice(-7), ["translate", "theme", "density", "accounts", ["locked", false], ["render", { preserveOverrides: false }], "backupImported"]);
  assert.equal(state.segmentOverrides, null);
});

test("legacy settings import keeps unknown locale and tolerates optional cache-save failures", async () => {
  const { controller, state, calls } = await fixture({ request: async (type) => { calls.push(type); throw new Error("cache unavailable"); } });
  await controller.importFile(new File([JSON.stringify({ localePreference: "unknown", accountAvatarCache: { assets: [] }, dmPartnerCache: {} })], "legacy.json"));
  assert.equal(state.localePreference, "en"); assert.ok(calls.includes("persist")); assert.equal(calls.at(-1), "backupImported");
});

test("settings backup rejects invalid files and does not mark failed export or failed import successful", async () => {
  const { controller, calls, state } = await fixture({ share: async () => { throw new Error("share failed"); } });
  await assert.rejects(controller.importFile(new File(["null"], "invalid.json")), /backupImportInvalid/);
  assert.equal(state.hashtags.length, 1); assert.equal(calls.length, 0);
  await assert.rejects(controller.exportFile(), /share failed/); assert.equal(calls.includes("marked"), false);
  const failing = await fixture({ persist: async () => { throw new Error("settings unavailable"); } });
  await assert.rejects(failing.controller.importFile(new File(["{}"], "valid.json")), /settings unavailable/);
  assert.equal(failing.calls.includes("backupImported"), false);
});

test("backup reminder handles exact due/snooze boundaries, open dialogs and successful marking", async () => {
  const module = await importProjectModule("js/core/app-backup.js"); const storage = createMemoryStorage();
  let now = 10000; let otherDialog = false;
  const elements = { status: { dataset: {} }, message: {}, dialog: { open: false, showModal() { this.open = true; }, close() { this.open = false; } } };
  const reminder = module.createSettingsBackupReminder(elements, { storage, now: () => now, exportKey: "export", dismissKey: "dismiss",
    intervalMs: 1000, snoozeMs: 100, hasOpenDialog: () => otherDialog, translate: (key) => key, warn() {}, report() {},
    clearTimer() {}, setTimer() {}, exportFile: async () => reminder.markExported() });
  assert.equal(reminder.isDue(), true); assert.equal(reminder.message(), "backupReminderUnknownMessage");
  reminder.show(); assert.equal(elements.dialog.open, true); assert.equal(reminder.isDue(), false);
  reminder.close(true); now += 99; assert.equal(reminder.isDue(), false); now += 1; assert.equal(reminder.isDue(), true);
  reminder.markExported(); now += 999; assert.equal(reminder.isDue(), false); now += 1; assert.equal(reminder.isDue(), true);
  otherDialog = true; assert.equal(reminder.isDue(), false); otherDialog = false;
  reminder.show(); await reminder.save(); assert.equal(elements.dialog.open, false); assert.equal(reminder.isDue(), false);
});

test("backup reminder handles unavailable storage, export failure and transient status timers", async () => {
  const module = await importProjectModule("js/core/app-backup.js"); const warnings = []; const timers = []; const cleared = [];
  const elements = { status: { dataset: {} }, message: {}, dialog: { open: true, close() { this.open = false; } } };
  const reminder = module.createSettingsBackupReminder(elements, {
    storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } }, now: () => 100,
    exportKey: "export", dismissKey: "dismiss", intervalMs: 1000, snoozeMs: 100, hasOpenDialog: () => false,
    translate: (key) => key, warn: (...args) => warnings.push(args), report: (error) => warnings.push(error),
    clearTimer: (timer) => cleared.push(timer), setTimer: (callback, delay) => { timers.push([callback, delay]); return timers.length; },
    exportFile: async () => { throw new Error("export failed"); },
  });
  assert.equal(reminder.message(), "backupReminderUnknownMessage"); reminder.markExported();
  await reminder.save(); assert.equal(elements.dialog.open, true); assert.equal(elements.status.dataset.tone, "error");
  reminder.status("new"); assert.equal(cleared.at(-1), 1); assert.equal(timers.at(-1)[1], 5000);
  timers.at(-1)[0](); assert.equal(elements.status.hidden, true); assert.equal(elements.status.dataset.tone, undefined);
  reminder.close(true); assert.equal(elements.dialog.open, false); assert.ok(warnings.length >= 5);
});
