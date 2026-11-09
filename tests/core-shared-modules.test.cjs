"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMemoryStorage, importProjectModule } = require("./module-test-helpers.cjs");

/** Imports the shell with its navigation dependency resolved for Node. @returns {Promise<object>} Shell exports. */
async function importShellModule() {
  const fs = require("node:fs");
  const path = require("node:path");
  const navigation = fs.readFileSync(path.join(__dirname, "../js/core/app-navigation.js"), "utf8");
  const dependency = `data:text/javascript;base64,${Buffer.from(navigation).toString("base64")}`;
  const source = fs.readFileSync(path.join(__dirname, "../js/core/app-shell.js"), "utf8").replace("./app-navigation.js", dependency);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

/** Builds explicit authentication adapters for action contract tests. @returns {object} Controller, mutable response and observed calls. */
async function accountActionFixture() {
  const { createSavedAccountActions } = await importProjectModule("js/core/app-session.js");
  const calls = []; const fixture = { result: { authenticated: true, handle: "alice", did: "did:alice", accounts: [] }, confirmed: true };
  const options = { defaultService: "https://bsky.social", resolveWebApp: (service) => service,
    setIdentity: (value) => calls.push(["identity", value]), setAccounts: (value) => calls.push(["accounts", value]),
    switchAccount: async (did) => { calls.push(["switch", did]); return fixture.result; },
    logout: async (did) => { calls.push(["logout", did]); return fixture.result; },
    remove: async (did) => { calls.push(["remove", did]); return fixture.result; },
    restoreAvatars: async () => calls.push(["avatars"]), renderAccounts: () => calls.push(["render"]),
    setLoginFields: (...args) => calls.push(["fields", ...args]), updateStatus: () => calls.push(["status"]),
    setStatus: (...args) => calls.push(["message", ...args]), openLogin: (value) => calls.push(["repair", value]),
    verify: async (value) => calls.push(["verify", value]), confirm: async () => fixture.confirmed,
    t: (key) => key, report: (error) => calls.push(["error", error]) };
  return { ...fixture, calls, options, fixture, controller: createSavedAccountActions(options) };
}

test("login endpoint and error normalization retain preset, boundary and failure contracts", async () => {
  const { normalizeLoginServiceUrl, localizeLoginError } = await importProjectModule("js/core/app-session.js");
  const presets = { "bsky.social": "https://bsky.social" };
  assert.equal(normalizeLoginServiceUrl("", presets), presets["bsky.social"]);
  assert.equal(normalizeLoginServiceUrl(" example.test/xrpc/?q=1#x ", presets), "https://example.test");
  assert.equal(normalizeLoginServiceUrl("https://invalid host/", presets), "https://invalid host");
  for (const code of ["AUTH_INVALID_CREDENTIALS", "LOGIN_MISSING_CREDENTIALS", "CONNECTIVITY_FAILED", "CONNECTIVITY_TIMEOUT", "INSECURE_SERVICE_URL", "LOGIN_MU_PDS_RESOLUTION_FAILED"]) {
    assert.match(localizeLoginError({ details: { code } }, (key) => key), /^statusLoginFailed/);
  }
  assert.equal(localizeLoginError(null, (key) => key), "statusLoginFailedGeneric");
  assert.equal(localizeLoginError(new Error("invalid login credentials"), (key) => key), "statusLoginFailedInvalidCredentials");
  assert.equal(localizeLoginError(new Error("unexpected backend failure"), (key) => key), "unexpected backend failure");
});

test("login controller owns service repair, private input cleanup, request and busy lifecycle", async () => {
  const { createLoginController } = await importProjectModule("js/core/app-session.js");
  const calls = []; let service = "https://bsky.social"; let failure = null;
  const elements = { preset: {}, custom: {}, customWrap: {}, note: { style: {} },
    identifier: { value: "", focus: () => calls.push("identifierFocus") },
    password: { value: "secret", focus: () => calls.push("passwordFocus") },
    dialog: { open: false, showModal() { this.open = true; }, close() { this.open = false; } } };
  const controller = createLoginController(elements, { presets: { "bsky.social": service, "mu.social": "https://mu.social" },
    getState: () => ({ service }), setTimeout: (callback) => callback(), t: (key) => key,
    request: async (type, payload) => { calls.push([type, payload]); if (failure) { throw failure; } return { handle: "alice", did: "did:alice", accounts: [] }; },
    setBusy: (value) => calls.push(["busy", value]), setIdentity: (identity) => { service = identity.service; calls.push(identity); },
    setAccounts: (value) => calls.push(["accounts", value]), restoreAvatars: async () => calls.push("avatars"),
    resolveWebApp: (value) => value, updateStatus: () => calls.push("status"), report: (error) => calls.push(["report", error]),
    setStatus: (message) => calls.push(message), setOnline: (value) => calls.push(["online", value]), renderAccounts: () => calls.push("render") });
  controller.open({ account: { identifier: " alice ", service: "https://pds.test", webApp: "https://mu.social" } });
  assert.equal(elements.preset.value, "mu.social"); assert.equal(elements.password.value, ""); assert.ok(calls.includes("passwordFocus"));
  elements.password.value = " pass "; await controller.submit({ preventDefault() {} });
  assert.deepEqual(calls.find((value) => Array.isArray(value) && value[0] === "LOGIN"), ["LOGIN", { identifier: "alice", appPassword: "pass", service: "https://mu.social", webApp: "https://mu.social" }]);
  assert.equal(elements.dialog.open, false); assert.equal(elements.password.value, "");
  assert.deepEqual(calls.filter((value) => Array.isArray(value) && value[0] === "busy"), [["busy", true], ["busy", false]]);
  controller.selectService("https://custom.test/xrpc"); assert.equal(elements.custom.value, "https://custom.test"); assert.equal(elements.customWrap.hidden, false);
  failure = Object.assign(new Error("worker error"), { details: { code: "AUTH_INVALID_CREDENTIALS" } });
  controller.open(); elements.password.value = "retry"; await controller.submit({ preventDefault() {} });
  assert.equal(elements.note.textContent, "statusLoginFailedInvalidCredentials"); assert.equal(elements.dialog.open, true);
  assert.equal(calls.some((value) => Array.isArray(value) && value[0] === "report"), false);
  failure = new Error("unexpected"); await controller.submit({ preventDefault() {} });
  assert.ok(calls.some((value) => Array.isArray(value) && value[0] === "report"));
  controller.handlers.offline(); assert.ok(calls.some((value) => Array.isArray(value) && value[0] === "online" && value[1] === false));
  controller.handlers.cancelEvent({ preventDefault() {} }); assert.equal(elements.password.value, ""); assert.equal(elements.dialog.open, false);
});

test("saved-account switch preserves identity, offline and password repair behavior", async () => {
  const { controller, fixture, calls } = await accountActionFixture(); const account = { did: "did:alice", handle: "alice", service: "https://custom.test" };
  await controller.select(account); assert.ok(calls.some((value) => value[0] === "verify"));
  assert.deepEqual(calls.find((value) => value[0] === "fields"), ["fields", "", true]);
  calls.length = 0; fixture.result = { authenticated: false, reason: "offline" };
  await controller.select(account); assert.equal(calls.some((value) => value[0] === "repair"), false);
  assert.equal(calls.find((value) => value[0] === "identity")[1].did, "");
  fixture.result.reason = "invalid_password"; await controller.select(account);
  assert.equal(calls.find((value) => value[0] === "repair")[1].mode, "repair");
});

test("saved-account sign in/out, confirmed removal and errors stay isolated", async () => {
  const { controller, fixture, calls, options } = await accountActionFixture(); const account = { did: "did:alice", handle: "alice" };
  await controller.toggle(account, "signed-out"); assert.equal(calls.some((value) => value[0] === "switch"), false);
  assert.ok(calls.some((value) => value[0] === "repair")); calls.length = 0;
  await controller.toggle({ ...account, hasStoredPassword: true }, "signed-out");
  assert.ok(calls.some((value) => value[0] === "verify")); assert.equal(calls.some((value) => value[0] === "fields"), false);
  fixture.result = { authenticated: false }; await controller.toggle(account, "active");
  assert.ok(calls.some((value) => value[0] === "logout")); calls.length = 0;
  fixture.confirmed = false; await controller.remove(account); assert.deepEqual(calls, []);
  fixture.confirmed = true; await controller.remove(account); assert.deepEqual(calls.find((value) => value[0] === "accounts"), ["accounts", []]);
  assert.deepEqual(calls.find((value) => value[0] === "fields"), ["fields", "", false]);
  options.switchAccount = async () => { throw new Error("failed"); }; await controller.select(account);
  assert.ok(calls.some((value) => value[0] === "error"));
});

test("saved account visual states keep offline precedence and missing-session fallback", async () => {
  const { getSavedAccountVisualState } = await importProjectModule("js/shared/shared-accounts.js");
  assert.equal(getSavedAccountVisualState({ did: "a", hasSession: true }, { did: "a", online: false }), "offline");
  assert.equal(getSavedAccountVisualState({ did: "a", hasSession: true }, { did: "a", online: true }), "active");
  assert.equal(getSavedAccountVisualState({ did: "b", hasSession: true }, { did: "a", online: true }), "available");
  assert.equal(getSavedAccountVisualState({}, {}), "signed-out");
});

test("appearance lifecycle preserves cache presence, atomic sync and translated controls", async () => {
  const { createAppearanceController } = await importShellModule();
  const storageModule = await importProjectModule("js/core/app-storage.js");
  const storage = createMemoryStorage();
  let state = { themeMode: "dark", compactMode: true }; const writes = []; const classes = [];
  const elements = { body: { classList: { toggle: (...args) => classes.push(args) } },
    themeNote: {}, themeButton: {}, densityNote: {}, densityButtons: [{}, {}] };
  const controller = createAppearanceController(elements, { storage: () => storage,
    read: storageModule.readBrowserStorageValue, write: (...args) => { writes.push({ ...state }); storageModule.writeBrowserStorageValue(...args); },
    themeKey: "theme", densityKey: "density", getState: () => state, setState: (patch) => { state = { ...state, ...patch }; },
    t: (key) => key, applyLayout: () => classes.push("layout") });
  assert.deepEqual(controller.read(), { themeMode: "light", compactMode: false, hasThemeMode: false, hasCompactMode: false });
  controller.sync(); assert.deepEqual(state, { themeMode: "dark", compactMode: true }); assert.equal(writes.length, 0);
  storage.setItem("theme", "light"); storage.setItem("density", "false"); controller.sync();
  assert.deepEqual(state, { themeMode: "light", compactMode: false });
  assert.ok(writes.every((value) => value.themeMode === "light" && value.compactMode === false));
  assert.equal(elements.themeButton.textContent, "darkModeButton");
  assert.equal(elements.densityButtons[0].hidden, true); assert.equal(elements.densityButtons[1].hidden, false);
  assert.equal(elements.densityButtons[1].textContent, "compactModeButton"); assert.ok(classes.includes("layout"));
  storage.setItem("theme", "invalid"); storage.setItem("density", "invalid");
  assert.equal(controller.read().hasThemeMode, false); assert.equal(controller.read().hasCompactMode, false);
  controller.restore(); assert.deepEqual(state, { themeMode: "light", compactMode: false });
});

test("appearance URL handoff consumes valid values and tolerates unavailable storage", async () => {
  const { createAppearanceController } = await importShellModule();
  let state = { themeMode: "light", compactMode: true }; let href = "https://example.test/tools.html?_theme=dark&_density=normal&keep=yes#here";
  const controller = createAppearanceController({ body: { classList: { toggle() {} } }, densityButtons: [] }, {
    storage: () => { throw new Error("denied"); }, getState: () => state, setState: (patch) => { state = { ...state, ...patch }; },
    href: () => href, replaceUrl: (value) => { href = value; }, t: (key) => key, applyLayout() {},
  });
  assert.equal(controller.applyUrl(), true); assert.deepEqual(state, { themeMode: "dark", compactMode: false });
  assert.equal(href, "https://example.test/tools.html?keep=yes#here");
  assert.equal(controller.buildUrl("./?draft=yes"), "https://example.test/?draft=yes&_theme=dark&_density=normal");
  href = "https://example.test/?_theme=invalid&_density=invalid";
  assert.equal(controller.applyUrl(), false); assert.ok(href.includes("_theme"));
  controller.persist(); controller.restore(); assert.equal(state.themeMode, "light");
  state = { themeMode: "dark", compactMode: true }; controller.applyTheme(); controller.applyDensity();
  assert.ok(controller.buildUrl("tools.html").includes("_density=compact"));
});

test("pending navigation survives reload and clears only reached paths", async () => {
  const { createPendingNavigationController } = await importProjectModule("js/core/app-navigation.js");
  const storageModule = await importProjectModule("js/core/app-storage.js");
  const storage = createMemoryStorage(); let href = "https://example.test/";
  const options = { storage: () => storage, key: "pending", href: () => href,
    read: storageModule.readBrowserStorageValue, write: storageModule.writeBrowserStorageValue, remove: storageModule.removeBrowserStorageValue };
  const controller = createPendingNavigationController(options);
  assert.equal(controller.consume(), ""); controller.persist("https://example.test/tools.html?_density=normal");
  controller.clearMatching(); assert.ok(controller.read()); href = "https://example.test/tools.html?reload=123";
  controller.clearMatching(); assert.equal(controller.read(), "");
  controller.persist("http://["); controller.clearMatching(); assert.equal(controller.consume(), "http://[");
  controller.persist("destination"); assert.equal(controller.consume(), "destination"); assert.equal(controller.read(), "");
  const unavailable = createPendingNavigationController({ ...options, storage: () => { throw new Error("denied"); } });
  unavailable.persist("target"); unavailable.clearMatching(); unavailable.clear(); assert.equal(unavailable.consume(), "");
});

/** Creates a layout with explicit native/state doubles. @param {object} module - Layout exports. @returns {object} Fixture. */
function createLayoutFixture(module) {
  let state = { sidebarWidthDesktop: 470, composerWidthDesktop: 360, sidebarCollapsedDesktop: false };
  const classes = new Set(); const properties = {}; const bindings = new Map(); const events = new EventTarget();
  const calls = [];
  const elements = { root: { style: { setProperty: (key, value) => { properties[key] = value; } } },
    body: { style: { setProperty: (key, value) => { properties[`body:${key}`] = value; } },
      classList: { add: (key) => classes.add(key), remove: (key) => classes.delete(key),
        toggle: (key, enabled) => { if (enabled) { classes.add(key); } else { classes.delete(key); } } },
      getBoundingClientRect: () => ({ left: 10 }) },
    toggle: { setAttribute: (key, value) => { properties[key] = value; } },
    sidebarHandle: { setAttribute() {} }, composerHandle: { setAttribute() {} }, glyph: {} };
  const media = { matches: true }; let handleWidth = "14px";
  const controller = module.createDesktopLayoutController(elements, {
    getState: () => state, setState: (patch) => { state = { ...state, ...patch }; },
    widths: { sidebar: { min: 400, max: 620, default: 470 }, composer: { min: 320, max: 1120, default: 360 } },
    collapsedWidth: 96, media, events, computedStyle: () => ({ getPropertyValue: () => handleWidth }),
    bind: (element, handlers) => bindings.set(element, handlers), resizeTextareas: () => calls.push("resize"),
    persist: async () => calls.push("persist"), setStatus: (value) => calls.push(value), t: (key) => key,
  });
  return { controller, elements, media, events, properties, classes, bindings, calls,
    getState: () => state, setState: (patch) => { state = { ...state, ...patch }; }, setHandle: (value) => { handleWidth = value; } };
}

test("layout widths preserve rounding, invalid fallback and migration contracts", async () => {
  const module = await importProjectModule("js/core/app-layout-state.js");
  assert.equal(module.clampDesktopWidth("450.6", 400, 620, 470), 451);
  assert.equal(module.clampDesktopWidth(-1, 400, 620, 470), 400);
  assert.equal(module.clampDesktopWidth(999, 400, 620, 470), 620);
  assert.equal(module.clampDesktopWidth("invalid", 400, 620, 470), 470);
  assert.equal(module.clampDesktopWidth(Infinity, 400, 620, 470), 470);
  const fixture = createLayoutFixture(module);
  fixture.setState({ sidebarWidthDesktop: "invalid", composerWidthDesktop: 2000 }); fixture.controller.apply();
  assert.equal(fixture.getState().sidebarWidthDesktop, 470); assert.equal(fixture.getState().composerWidthDesktop, 1120);
  assert.equal(fixture.properties["--desktop-composer-width"], "1120px");
  assert.equal(fixture.properties["body:--desktop-sidebar-width"], "470px");
});

test("sidebar layout binds once and renders responsive labels, glyphs and reset", async () => {
  const module = await importProjectModule("js/core/app-layout-state.js"); const fixture = createLayoutFixture(module);
  fixture.controller.bind(); fixture.controller.bind(); assert.equal(fixture.bindings.size, 4);
  fixture.controller.renderSidebar(); assert.equal(fixture.properties["aria-expanded"], "true");
  assert.equal(fixture.elements.glyph.textContent, "\u25c0");
  await fixture.bindings.get(fixture.elements.toggle)[0].handler();
  assert.equal(fixture.properties["aria-expanded"], "false"); assert.ok(fixture.classes.has("desktop-sidebar-collapsed"));
  fixture.media.matches = false; fixture.bindings.get(fixture.media)[0].handler();
  assert.ok(fixture.classes.has("mobile-sidebar-collapsed")); assert.ok(!fixture.classes.has("desktop-sidebar-collapsed"));
  assert.equal(fixture.elements.glyph.textContent, "\u25bc");
  fixture.setState({ sidebarWidthDesktop: 600, composerWidthDesktop: 900 }); await fixture.controller.reset();
  assert.deepEqual(fixture.getState(), { sidebarWidthDesktop: 470, composerWidthDesktop: 360, sidebarCollapsedDesktop: false });
  assert.ok(fixture.calls.includes("resetColumnWidthsDone")); assert.equal(fixture.elements.glyph.textContent, "\u25b2");
});

test("column drag bounds dimensions, handles collapsed offsets and cleans up cancellation", async () => {
  const module = await importProjectModule("js/core/app-layout-state.js"); const fixture = createLayoutFixture(module);
  /** Dispatches a pointer position to the native event double. @param {number} x - Position. @returns {void} */
  function move(x) { const event = new Event("pointermove"); event.clientX = x; fixture.events.dispatchEvent(event); }
  fixture.controller.startResize("sidebar"); move(2000); assert.equal(fixture.getState().sidebarWidthDesktop, 620);
  fixture.events.dispatchEvent(new Event("pointercancel")); move(410);
  assert.equal(fixture.getState().sidebarWidthDesktop, 620); assert.ok(!fixture.classes.has("desktop-resizing"));
  assert.equal(fixture.calls.filter((value) => value === "persist").length, 1);
  fixture.setState({ sidebarCollapsedDesktop: true }); fixture.controller.startResize("composer"); move(620);
  assert.equal(fixture.getState().composerWidthDesktop, 500);
  fixture.events.dispatchEvent(new Event("pointerup")); fixture.events.dispatchEvent(new Event("pointercancel"));
  assert.equal(fixture.calls.filter((value) => value === "persist").length, 2);
  fixture.setHandle("invalid"); assert.equal(fixture.controller.getHandleWidth(), 14);
  fixture.setHandle("8px"); assert.equal(fixture.controller.getHandleWidth(), 8);
  fixture.media.matches = false; fixture.controller.startResize("sidebar"); move(410);
  assert.equal(fixture.getState().sidebarWidthDesktop, 620);
});

test("active column drag is replaced or stopped at mobile breakpoint", async () => {
  const module = await importProjectModule("js/core/app-layout-state.js"); const fixture = createLayoutFixture(module);
  fixture.controller.bind(); fixture.controller.startResize("sidebar"); fixture.controller.startResize("composer");
  const event = new Event("pointermove"); event.clientX = 1000; fixture.events.dispatchEvent(event);
  assert.equal(fixture.getState().sidebarWidthDesktop, 470); assert.equal(fixture.getState().composerWidthDesktop, 506);
  fixture.media.matches = false; fixture.bindings.get(fixture.media)[0].handler();
  assert.ok(!fixture.classes.has("desktop-resizing"));
  fixture.events.dispatchEvent(new Event("pointerup"));
  assert.equal(fixture.calls.filter((value) => value === "persist").length, 1);
  fixture.media.matches = true; fixture.controller.startResize("sidebar"); await fixture.controller.reset();
  fixture.events.dispatchEvent(event); assert.equal(fixture.getState().sidebarWidthDesktop, 470);
});

/** Creates explicit update UI/native adapters. @param {object} module - Bootstrap exports. @returns {object} Fixture. */
function createUpdateFixture(module) {
  const elements = { status: { dataset: {} }, reload: { classList: { toggle: (name, value) => calls.push([name, value]) } }, check: {}, version: {} };
  const calls = []; let now = 200000; let remote = { appVersion: "1", cacheVersion: "v1" }; let fail = false;
  const controller = module.createApplicationUpdateController(elements, {
    version: { appVersion: "1", cacheVersion: "v1", label: "Current" }, t: (key) => key,
    registration: () => ({ update: async () => calls.push("update"), waiting: { postMessage: (message) => calls.push(message) } }),
    fetchVersion: async () => { if (fail) { throw new Error("unavailable"); } return remote; },
    report: (error) => calls.push(error.message), intervalMs: 180000, now: () => now,
    href: () => "https://example.test/tools.html?keep=yes#here", navigate: (url) => calls.push(url),
    setTimeout: (callback, delay) => calls.push({ callback, delay }),
  });
  return { controller, elements, calls, setRemote: (value) => { remote = value; }, setFail: (value) => { fail = value; }, setNow: (value) => { now = value; } };
}

test("update controller presents versions, changed/incomplete metadata and silent failures", async () => {
  const module = await importProjectModule("js/core/app-bootstrap.js"); const fixture = createUpdateFixture(module);
  fixture.controller.renderVersion(); assert.ok(fixture.elements.version.textContent.includes("Current"));
  await fixture.controller.check(); assert.equal(fixture.elements.status.textContent, "updateNoChange");
  fixture.setRemote({ appVersion: "2", cacheVersion: "v2", label: "New" }); await fixture.controller.check();
  assert.ok(fixture.elements.status.textContent.includes("New")); assert.ok(fixture.calls.some((call) => Array.isArray(call) && call[1] === true));
  fixture.setRemote({}); await fixture.controller.check(); assert.equal(fixture.elements.status.dataset.state, "error");
  fixture.controller.status("unchanged"); await fixture.controller.check({ showChecking: false, silentError: true });
  assert.equal(fixture.elements.status.textContent, "unchanged"); fixture.setFail(true);
  await fixture.controller.check({ showChecking: false, silentError: true }); assert.equal(fixture.elements.status.textContent, "unchanged");
  await fixture.controller.check(); assert.equal(fixture.elements.status.textContent, "updateFailed"); assert.equal(fixture.elements.check.disabled, false);
  fixture.controller.status(""); assert.equal(fixture.elements.status.hidden, true); assert.equal(fixture.elements.status.dataset.state, "");
});

test("update controller guards concurrent checks, throttles checks and reloads once", async () => {
  const module = await importProjectModule("js/core/app-bootstrap.js"); const fixture = createUpdateFixture(module);
  await Promise.all([fixture.controller.check(), fixture.controller.check()]);
  assert.equal(fixture.calls.filter((value) => value === "update").length, 1);
  assert.equal(fixture.controller.shouldAutoCheck(), true); fixture.setNow(200001); assert.equal(fixture.controller.shouldAutoCheck(), false);
  fixture.setNow(380000); assert.equal(fixture.controller.shouldAutoCheck(), true);
  await Promise.all([fixture.controller.reload(), fixture.controller.reload()]);
  const timers = fixture.calls.filter((value) => value && value.callback); assert.equal(timers.length, 1); assert.equal(timers[0].delay, 120);
  assert.deepEqual(fixture.calls.find((value) => value && value.type), { type: "SKIP_WAITING" });
  assert.equal(fixture.elements.reload.disabled, true); timers[0].callback();
  assert.ok(fixture.calls.includes("https://example.test/tools.html?keep=yes&reload=380000#here"));
});

/** Creates explicit session state/UI/timer adapters. @param {object} module - Session exports. @returns {object} Fixture. */
function createSessionFixture(module) {
  let state = { did: "did:one", account: "old.test", service: "service", webApp: "web", accounts: [{ did: "did:one", handle: "old.test" }] };
  let result = { authenticated: true, handle: "new.test" }; let fail = false; const calls = []; const timers = [];
  const controller = module.createApplicationSessionController({ getState: () => state,
    setAccounts: (accounts) => { calls.push("accounts"); state.accounts = accounts; },
    setIdentity: (identity) => { calls.push("identity"); state = { ...state, ...identity }; },
    request: async (type) => { calls.push(type); if (fail) { throw new Error("failed"); } return result; },
    restoreAvatars: async () => calls.push("avatars"), renderAccounts: () => calls.push("render"),
    disconnect: (announce) => calls.push(["disconnect", announce]), openLogin: (value) => calls.push(value),
    updateAuthButtons: () => calls.push("buttons"), setStatus: (message, tone) => calls.push([message, tone]),
    t: (key) => key, restoreWorkspace: () => calls.push("workspace"), report: (error) => calls.push(error.message),
    clearInterval: (id) => calls.push(["clear", id]), setInterval: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
  });
  return { controller, calls, timers, getState: () => state, setState: (value) => { state = { ...state, ...value }; },
    setResult: (value) => { result = value; }, setFail: () => { fail = true; } };
}

test("session lifecycle applies verified identity and restores avatars before account UI", async () => {
  const module = await importProjectModule("js/core/app-session.js"); const fixture = createSessionFixture(module);
  fixture.setResult({ authenticated: true, handle: "new.test", accounts: [{ did: "did:one", handle: "new.test" }] });
  assert.equal(await fixture.controller.verify(), true); assert.equal(fixture.getState().account, "new.test");
  assert.equal(fixture.getState().service, "service");
  assert.deepEqual(fixture.calls.slice(0, 5), ["VERIFY_SESSION", "accounts", "avatars", "render", "identity"]);
  assert.ok(fixture.calls.includes("workspace"));
  fixture.calls.length = 0; await fixture.controller.verify({ silent: true }); assert.ok(fixture.calls.includes("buttons"));
  fixture.setState({ did: "" }); fixture.calls.length = 0; assert.equal(await fixture.controller.verify(), false); assert.equal(fixture.calls.length, 0);
});

test("session lifecycle preserves offline accounts and repairs rejected or missing passwords", async () => {
  const module = await importProjectModule("js/core/app-session.js"); const fixture = createSessionFixture(module);
  fixture.setResult({ authenticated: false, reason: "offline" }); assert.equal(await fixture.controller.verify(), false);
  assert.ok(!fixture.calls.some((value) => Array.isArray(value) && value[0] === "disconnect"));
  fixture.calls.length = 0; await fixture.controller.verify({ silent: true });
  assert.ok(!fixture.calls.some((value) => Array.isArray(value) && value[0] === "statusAccountOffline"));
  for (const reason of ["invalid_password", "missing_password"]) {
    fixture.calls.length = 0; fixture.setResult({ authenticated: false, reason }); await fixture.controller.verify({ silent: true });
    assert.ok(fixture.calls.some((value) => value && value.mode === "repair"));
    assert.ok(fixture.calls.some((value) => Array.isArray(value) && value[0] === "disconnect" && value[1] === false));
    let expected = "statusAccountNeedsLogin";
    if (reason === "invalid_password") { expected = "statusAccountPasswordRejected"; }
    assert.equal(fixture.calls.find((value) => value && value.mode === "repair").note, expected);
  }
  fixture.calls.length = 0; fixture.setResult({ authenticated: false, reason: "unknown" }); await fixture.controller.verify();
  assert.ok(fixture.calls.some((value) => Array.isArray(value) && value[0] === "disconnect" && value[1] === true));
  fixture.setFail(); assert.equal(await fixture.controller.verify({ silent: true }), false); assert.ok(fixture.calls.includes("failed"));
});

test("update reload remains available without registration or after worker-update failure", async () => {
  const module = await importProjectModule("js/core/app-bootstrap.js"); const calls = [];
  const elements = { status: { dataset: {} }, reload: { classList: { toggle() {} } }, check: {} };
  let registration = null;
  const controller = module.createApplicationUpdateController(elements, {
    registration: () => registration, version: { appVersion: "1", cacheVersion: "v1" },
    fetchVersion: async () => ({ appVersion: "1", cacheVersion: "v1" }), t: (key) => key,
    report: (error) => calls.push(error.message), setTimeout: (callback) => calls.push(callback),
    href: () => "https://example.test/", now: () => 1, navigate: (url) => calls.push(url),
  });
  await controller.check(); assert.equal(elements.status.textContent, "updateNoChange");
  registration = { update: async () => { throw new Error("update failed"); }, waiting: { postMessage: (message) => calls.push(message.type) } };
  await controller.reload(); assert.ok(calls.includes("SKIP_WAITING"));
  calls.find((value) => typeof value === "function")(); assert.ok(calls.includes("https://example.test/?reload=1"));
});

test("periodic session checks replace old timers and can be stopped", async () => {
  const module = await importProjectModule("js/core/app-session.js"); const fixture = createSessionFixture(module);
  fixture.controller.start(); fixture.controller.start(); assert.equal(fixture.timers[0].delay, 300000);
  assert.ok(fixture.calls.some((value) => Array.isArray(value) && value[0] === "clear" && value[1] === 1));
  fixture.timers[1].callback(); await new Promise((resolve) => setImmediate(resolve)); assert.ok(fixture.calls.includes("buttons"));
  fixture.controller.stop(); assert.ok(fixture.calls.some((value) => Array.isArray(value) && value[0] === "clear" && value[1] === 2));
});

test("installation lifecycle handles iOS, standalone mode, prompts, dismissal and failures", async () => {
  const module = await importShellModule(); const button = {}; const calls = []; let ios = false; let standalone = false;
  const controller = module.createApplicationInstallController({ button, dialog: { showModal: () => calls.push("ios") } },
    { isIos: () => ios, isStandalone: () => standalone, report: (error) => calls.push(error.message) });
  controller.render(); assert.equal(button.hidden, true); await controller.install();
  ios = true; controller.render(); assert.equal(button.hidden, false); await controller.install(); assert.ok(calls.includes("ios"));
  ios = false; controller.beforePrompt({ preventDefault: () => calls.push("prevent"), prompt: () => calls.push("prompt"), userChoice: Promise.resolve({ outcome: "dismissed" }) });
  assert.equal(button.hidden, false); await controller.install(); assert.equal(button.hidden, true);
  controller.beforePrompt({ preventDefault() {}, prompt() {}, get userChoice() { return Promise.reject(new Error("choice failed")); } });
  await controller.install(); assert.ok(calls.includes("choice failed"));
  standalone = true; ios = true; controller.render(); assert.equal(button.hidden, true); controller.installed();
  assert.equal(module.isIosDevice({ userAgent: "iPhone" }), true);
  assert.equal(module.isIosDevice({ userAgent: "Mac", platform: "MacIntel", maxTouchPoints: 2 }), true);
  assert.equal(module.isIosDevice({ userAgent: "Linux" }), false);
});

test("page lifecycle routes visibility, focus, appearance and install events in order", async () => {
  const module = await importProjectModule("js/core/app-initialization.js"); const calls = []; let visible = false;
  const handlers = module.createApplicationLifecycleHandlers({ isVisible: () => visible,
    verifySession: async (settings) => calls.push(["verify", settings.silent]), checkUpdates: () => calls.push("update"),
    syncAppearance: () => calls.push("appearance"), applyAccessGate: async () => calls.push("gate"), resizeTextareas: () => calls.push("resize"),
    install: { beforePrompt: () => calls.push("prompt"), installed: () => calls.push("installed"), render: () => calls.push("install") } });
  handlers.visibilityChange(); assert.equal(calls.length, 0); visible = true; handlers.visibilityChange();
  assert.deepEqual(calls, [["verify", true], "update", "appearance"]);
  handlers.focus(); handlers.hashChange(); handlers.resize(); handlers.visualViewportResize(); handlers.pageShow(); handlers.pageHide();
  handlers.beforeInstallPrompt(); handlers.appInstalled(); handlers.displayModeChange();
  assert.ok(calls.includes("gate")); assert.equal(calls.filter((value) => value === "resize").length, 2);
  assert.deepEqual(calls.slice(-3), ["prompt", "installed", "install"]);
});

/** Escapes fixture text using the same HTML boundary contract. @param {unknown} value - Text. @returns {string} Escaped text. */
function escapeHelpFixture(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

test("help topic catalog resolves all translation keys with locale and invalid-topic boundaries", async () => {
  const help = await importProjectModule("js/core/app-help.js"); const { HELP_TOPICS } = await importProjectModule("js/core/app-help-topics.js");
  assert.ok(Object.keys(HELP_TOPICS).length >= 20);
  for (const id of Object.keys(HELP_TOPICS)) {
    const topic = help.getHelpTopic(id, HELP_TOPICS, (key) => key);
    assert.ok(topic.title.startsWith("helpTopic")); assert.ok(topic.text.startsWith("helpTopic"));
    assert.ok(topic.bullets.length >= 1); assert.ok(topic.bullets.every((key) => key.startsWith("helpTopic")));
  }
  assert.equal(help.getHelpTopic("unknown", HELP_TOPICS, String), null);
  assert.equal(help.getHelpTopic("toString", HELP_TOPICS, String), null);
  assert.equal(help.getHelpTopic(null, HELP_TOPICS, String), null);
  assert.equal(help.getHelpReadmePath("de"), "./README.de.md");
  assert.equal(help.getHelpReadmePath("fr"), "./README.md"); assert.equal(help.getHelpReadmePath(undefined), "./README.md");
});

test("README renderer preserves headings, lists, code, links, badges and centered images", async () => {
  const { createHelpMarkdownRenderer } = await importProjectModule("js/core/app-help-markdown.js");
  const renderer = createHelpMarkdownRenderer({ href: () => "https://example.test/tools.html", escapeHtml: escapeHelpFixture });
  const html = renderer.render('# Title\r\n\r\n**Bold** and `code` [Link](https://example.org)\n\n- One\n- Two\n1. Three\n\n```js\n<script>\n```\n\n[![Badge](./icon.png)](https://example.org)\n\n<p align="center"><img src="./icon.png" alt="Icon" width="90"></p>');
  assert.ok(html.includes("<h1>Title</h1>")); assert.ok(html.includes("<strong>Bold</strong>"));
  assert.ok(html.includes("<ul><li>One</li><li>Two</li></ul><ol><li>Three</li></ol>"));
  assert.ok(html.includes("<pre><code>&lt;script&gt;</code></pre>")); assert.ok(html.includes('rel="noreferrer noopener"'));
  assert.ok(html.includes('class="help-centered"')); assert.ok(html.includes('src="https://example.test/icon.png"'));
  assert.equal(renderer.render(null), ""); assert.equal(renderer.render(""), "");
});

test("README renderer rejects dangerous protocols and escapes forged trusted blocks", async () => {
  const { createHelpMarkdownRenderer } = await importProjectModule("js/core/app-help-markdown.js");
  const renderer = createHelpMarkdownRenderer({ href: () => "https://example.test/", escapeHtml: escapeHelpFixture });
  for (const url of ["javascript:alert", "data:text/html,bad", "//evil.test", "", "file:///secret"]) { assert.equal(renderer.sanitizeUrl(url), ""); }
  assert.equal(renderer.sanitizeUrl("mailto:me@example.test"), "mailto:me@example.test");
  assert.equal(renderer.sanitizeUrl("mailto:me@example.test", "image"), "");
  assert.equal(renderer.sanitizeUrl("#part"), "#part"); assert.equal(renderer.sanitizeUrl("./safe?a=1&amp;b=2"), "https://example.test/safe?a=1&amp;b=2");
  const html = renderer.render('<p class="help-centered"><img src=x onerror=alert(1)></p>\n\n[bad](javascript:alert) ![bad](data:text/html,bad)\n\n\u0000HELP:0\u0000');
  assert.ok(!html.includes("<img")); assert.ok(!html.includes('href="javascript:')); assert.ok(html.includes("&lt;p"));
});

/** Creates a help loader with controllable network requests. @param {object} module - Help exports. @returns {object} Fixture. */
function createHelpFixture(module) {
  let locale = "de"; let response = { ok: true, text: async () => "README" }; const requests = []; const errors = [];
  const content = { innerHTML: "", replaceChildren() { this.innerHTML = ""; } }; const dialog = new EventTarget();
  const elements = { dialog, status: {}, content, eyebrow: {}, title: {} };
  const controller = module.createHelpController(elements, { locale: () => locale, t: (key) => key, catalog: {},
    markdown: { render: (text) => `<p>${text}</p>` }, fetch: async (path, options) => { requests.push({ path, options }); return response; },
    report: (error) => errors.push(error.message) });
  return { controller, elements, requests, errors, setLocale: (value) => { locale = value; }, setResponse: (value) => { response = value; } };
}

test("help README loader caches per active path and reports failed loads", async () => {
  const module = await importProjectModule("js/core/app-help.js"); const fixture = createHelpFixture(module);
  await fixture.controller.loadReadme(); await fixture.controller.loadReadme(); assert.equal(fixture.requests.length, 1);
  assert.deepEqual(fixture.requests[0], { path: "./README.de.md", options: { cache: "no-cache" } });
  assert.equal(fixture.elements.content.innerHTML, "<p>README</p>");
  fixture.setLocale("en"); await fixture.controller.loadReadme(); assert.equal(fixture.requests.length, 2);
  fixture.setLocale("de"); fixture.setResponse({ ok: false }); await fixture.controller.loadReadme();
  assert.equal(fixture.elements.status.textContent, "helpFailed"); assert.equal(fixture.elements.content.innerHTML, "");
  assert.ok(fixture.errors.includes("README unavailable"));
  fixture.controller.header("Topic", "Title"); assert.equal(fixture.elements.title.textContent, "Title");
  fixture.controller.openTopic("unknown"); fixture.controller.topicClick({ target: null });
});

test("help loader ignores stale responses and close events invalidate pending requests", async () => {
  const module = await importProjectModule("js/core/app-help.js"); const fixture = createHelpFixture(module);
  let resolveText;
  fixture.setResponse({ ok: true, text: () => new Promise((resolve) => { resolveText = resolve; }) });
  const pending = fixture.controller.loadReadme(); await new Promise((resolve) => setImmediate(resolve));
  fixture.controller.cancel(); fixture.elements.content.innerHTML = "topic"; resolveText("late"); await pending;
  assert.equal(fixture.elements.content.innerHTML, "topic");
  const closed = fixture.controller.loadReadme(); await new Promise((resolve) => setImmediate(resolve));
  fixture.elements.dialog.dispatchEvent(new Event("close")); fixture.elements.content.innerHTML = "closed"; resolveText("late"); await closed;
  assert.equal(fixture.elements.content.innerHTML, "closed"); assert.equal(fixture.errors.length, 0);
});

test("startup storage keeps required state failures distinct from optional cache failures", async () => {
  const module = await importProjectModule("js/core/app-storage.js");
  const requests = [];
  const storage = module.createApplicationStorage({ request: async (type, payload, options) => {
    requests.push({ type, payload, options });
    if (type === "GET_APP_STATE") { return { draft: "saved" }; }
    throw new Error("optional unavailable");
  } });
  assert.deepEqual(await storage.load("fr"), { state: { draft: "saved" }, archiveSession: null,
    archiveCatalog: null, dmPartnerCache: null, accountAvatarCache: null });
  assert.deepEqual(requests[0].payload, { browserLocale: "fr" });
  assert.equal(requests[1].options.timeoutMs, 30000);
  assert.equal(requests[2].options.timeoutMs, 120000);
  await assert.rejects(module.createApplicationStorage({ request: async () => { throw new Error("required unavailable"); } }).load("en"), /required unavailable/);
});

test("settings storage snapshots before serialized writes and recovers after failures", async () => {
  const storageModule = await importProjectModule("js/core/app-storage.js");
  const stateModule = await importProjectModule("js/core/app-state.js");
  const calls = []; let value = 1;
  const storage = storageModule.createApplicationStorage({ queue: stateModule.createAsyncTaskQueue(),
    snapshot: () => ({ value }), request: async (type, payload, options) => {
      assert.equal(type, "SAVE_SETTINGS"); assert.equal(options.timeoutMs, 120000);
      calls.push(payload.value); if (payload.value === 1) { throw new Error("failed"); }
    }, report: (error) => calls.push(error.message), setStatus: (message, tone) => calls.push([message, tone]),
  });
  const first = storage.persist(); value = 2; const second = storage.persist();
  await Promise.all([first, second]);
  assert.deepEqual(calls.filter((item) => typeof item === "number"), [1, 2]);
  assert.ok(calls.includes("failed")); assert.ok(calls.some((item) => Array.isArray(item) && item[1] === "error"));
});

test("startup preferences preserve local appearance precedence, strict flags and migration", async () => {
  const module = await importProjectModule("js/core/app-state.js");
  const options = { normalizeResize: () => "resize", normalizeLayout: () => ({ sidebarWidthDesktop: 300, composerWidthDesktop: 600 }), layoutVersion: 2 };
  const local = { hasThemeMode: true, themeMode: "light", hasCompactMode: true, compactMode: false };
  const model = module.normalizeApplicationPreferences({ themeMode: "dark", compactMode: true, desktopLayoutVersion: 2 }, local, options);
  assert.equal(model.themeMode, "light"); assert.equal(model.compactMode, false);
  assert.equal(model.tipsVisible, true); assert.equal(model.altTextRequired, true);
  assert.equal(model.needsDesktopLayoutMigration, false);
  const fallback = module.normalizeApplicationPreferences({ tipsVisible: false, archiveExpertMode: "true" },
    { hasThemeMode: false, themeMode: "auto", hasCompactMode: false, compactMode: true }, options);
  assert.equal(fallback.themeMode, "auto"); assert.equal(fallback.compactMode, true);
  assert.equal(fallback.tipsVisible, false); assert.equal(fallback.archiveExpertMode, false);
  assert.equal(fallback.needsDesktopLayoutMigration, true);
  const stored = module.normalizeApplicationPreferences({ themeMode: "dark", compactMode: false },
    { hasThemeMode: false, hasCompactMode: false }, options);
  assert.equal(stored.themeMode, "dark"); assert.equal(stored.compactMode, false);
});

/** Creates a DOM-independent hydration fixture. @param {object} overrides - Changed dependencies. @returns {Promise<object>} Controller, state, calls and fields. */
async function createHydrationFixture(overrides = {}) {
  const module = await importProjectModule("js/core/app-state.js");
  const calls = []; const state = {}; const elements = {};
  for (const name of ["proxyEndpoint", "proxySecret", "resize", "expert", "identifier", "source", "password", "placement", "counter", "intro", "emoji", "spacing"]) {
    elements[name] = { value: "", checked: false };
  }
  const normalize = {};
  for (const name of ["hashtags", "selection", "images", "cards", "languages", "history", "favorites", "searches"]) {
    normalize[name] = (value) => value || [];
  }
  for (const name of ["search", "reply", "overrides", "placement", "provider", "usage"]) { normalize[name] = (value) => value; }
  const options = { detectLocale: () => "fr", load: async () => ({ state: { draft: "restored", desktopLayoutVersion: 1,
      hashtags: ["tag"], segmentImages: [[{}]], appendThreadIntro: true, linkCardProxy: { endpoint: "proxy" } } }),
    getAppearance: () => ({ themeMode: "auto", compactMode: true }),
    preferences: { normalizeResize: () => "resize", normalizeLayout: () => ({}), layoutVersion: 2 }, normalize,
    setState: (patch) => { Object.assign(state, patch); calls.push("state"); },
    applySearch: () => calls.push("search"), restoreSearch: () => calls.push("search-result"),
    renderSearch: () => calls.push("search-render"), restoreSearchStatus: () => calls.push("search-status"),
    consumeReplyUrl: () => ({ uri: "url-reply" }), consumeReplyStorage: () => { throw new Error("must not consume storage when URL exists"); },
    restoreAnalysis: () => calls.push("analysis"), applyInteraction: () => calls.push("interaction"),
    syncProvider: () => calls.push("provider"), setLocked: () => calls.push("lock"), restoreExplorer: () => calls.push("explorer"),
    defaultLocale: "en", defaultService: "service", resolveWebApp: () => "web-app",
    normalizeArchiveCatalog: () => null, normalizeAccounts: () => [],
    applyAvatarCache: () => calls.push("avatar"), applyDmCache: () => calls.push("dm"), applyService: () => calls.push("service"),
    applyArchive: () => calls.push("archive"), finalRender: [() => calls.push("render"), () => calls.push("appearance")],
    validateImages: () => calls.push("images"), persist: async () => calls.push("persist"),
    setHydrated: (value) => calls.push(["hydrated", value]), restoreWorkspace: () => calls.push("workspace"),
    scheduleReminder: () => calls.push("reminder"), report: (error) => calls.push(error.message), setStatus: () => calls.push("error-status"),
    ...overrides,
  };
  return { controller: module.createApplicationHydrationController(elements, options), calls, state, elements };
}

test("hydration restores domains in order, URL handoff and migration before workspace activation", async () => {
  const fixture = await createHydrationFixture(); await fixture.controller.hydrate();
  assert.equal(fixture.elements.source.value, "restored"); assert.equal(fixture.elements.proxyEndpoint.value, "proxy");
  assert.equal(fixture.elements.intro.checked, true); assert.equal(fixture.elements.password.value, "");
  assert.equal(fixture.state.currentLocale, "fr"); assert.equal(fixture.state.composerReplyTarget.uri, "url-reply");
  assert.ok(fixture.calls.indexOf("search") < fixture.calls.indexOf("analysis"));
  assert.ok(fixture.calls.indexOf("provider") < fixture.calls.indexOf("lock"));
  assert.deepEqual(fixture.calls.slice(-5), ["images", "persist", ["hydrated", true], "workspace", "reminder"]);
});

test("hydration failures release workspace restoration without scheduling a success reminder", async () => {
  const fixture = await createHydrationFixture({ load: async () => { throw new Error("load failed"); } });
  await fixture.controller.hydrate();
  assert.deepEqual(fixture.calls, ["load failed", "error-status", ["hydrated", true], "workspace"]);
  const other = await createHydrationFixture({ persist: async () => { throw new Error("migration failed"); } });
  await other.controller.hydrate();
  assert.deepEqual(other.calls.slice(-4), ["migration failed", "error-status", ["hydrated", true], "workspace"]);
});

test("hydration handles locale and stored reply fallbacks without unnecessary migration", async () => {
  let storageConsumed = false;
  const fixture = await createHydrationFixture({ detectLocale: () => "",
    load: async () => ({ state: { localePreference: "de", locale: "de", desktopLayoutVersion: 2, accounts: "invalid" } }),
    consumeReplyUrl: () => null, consumeReplyStorage: () => { storageConsumed = true; return { uri: "stored-reply" }; },
  });
  await fixture.controller.hydrate();
  assert.equal(storageConsumed, true); assert.equal(fixture.state.currentLocale, "de");
  assert.equal(fixture.state.composerReplyTarget.uri, "stored-reply");
  assert.deepEqual(fixture.state.savedAccounts, []);
  assert.equal(fixture.calls.includes("persist"), false); assert.equal(fixture.calls.includes("images"), false);
  const invalid = await createHydrationFixture({ load: async () => ({ state: null }) });
  await invalid.controller.hydrate();
  assert.ok(invalid.calls.includes("error-status")); assert.equal(invalid.calls.includes("reminder"), false);
});

test("bootstrap orders worker, hydration, session and updates and guards reload navigation", async () => {
  const module = await importProjectModule("js/core/app-bootstrap.js");
  const calls = []; let privacy = true;
  const options = { isSupported: () => true, translate: (key) => key, setStatus: (message) => calls.push(message),
    isPrivacyNavigation: () => privacy, consumeNavigation: () => "/tools.html", getHref: () => "https://example.com/",
    now: () => 123, navigate: (href) => calls.push(href), bindControllerChange: () => calls.push("bind"),
    register: async () => { calls.push("register"); return "registration"; }, setRegistration: (value) => calls.push(value),
    ready: async () => calls.push("ready"), hydrate: async () => calls.push("hydrate"),
    verifySession: async (settings) => { assert.deepEqual(settings, { silent: true }); calls.push("session"); },
    startSessionChecks: () => calls.push("checks"), checkUpdates: async (settings) => {
      assert.deepEqual(settings, { showChecking: false, silentNoChange: true, silentError: true }); calls.push("updates");
    }, report: (error) => calls.push(error.message) };
  const controller = module.createApplicationBootstrap(options); await controller.start();
  assert.deepEqual(calls, ["bind", "register", "registration", "ready", "statusCheckingSession", "hydrate", "session", "checks", "updates"]);
  controller.controllerChange(); assert.equal(calls.length, 9);
  privacy = false; controller.controllerChange(); controller.controllerChange();
  assert.equal(calls.at(-1), "https://example.com/tools.html?reload=123"); assert.equal(calls.length, 10);
  calls.length = 0;
  await module.createApplicationBootstrap({ ...options, isSupported: () => false }).start();
  assert.deepEqual(calls, ["statusNoSupport"]);
  calls.length = 0;
  await module.createApplicationBootstrap({ ...options, register: async () => { throw new Error("registration failed"); } }).start();
  assert.deepEqual(calls, ["bind", "registration failed", "statusSwRegisterFailed"]);
});

test("basic link cards derive URL fields and delegate invalid-input policy to normalization", async () => {
  const module = await importProjectModule("js/shared/shared-link-cards.js");
  const normalize = (card) => card;
  assert.deepEqual(module.buildBasicLinkCard("https://example.org/path?q=1", normalize), {
    url: "https://example.org/path?q=1", title: "example.org", description: "https://example.org/path?q=1" });
  assert.deepEqual(module.buildBasicLinkCard("not a URL", normalize), { url: "not a URL", title: "not a URL", description: "" });
  assert.deepEqual(module.buildBasicLinkCard("", normalize), { url: "", title: "", description: "" });
  assert.equal(module.buildBasicLinkCard("invalid", () => null), null);
});

test("desktop layout state normalizes dimensions and migrates legacy values", async () => {
  const layout = await importProjectModule("js/core/app-layout-state.js");
  const options = {
    defaultSidebarWidth: 320,
    defaultComposerWidth: 640,
    minSidebarWidth: 240,
    maxSidebarWidth: 500,
    minComposerWidth: 400,
    maxComposerWidth: 900,
    layoutVersion: 2,
    legacySignatures: new Set(["200|600"]),
    clamp: (value, min, max, fallback) => {
      if (value == null) {
        return fallback;
      }
      return Math.min(max, Math.max(min, value));
    },
  };
  assert.deepEqual(layout.normalizeStoredDesktopLayout("200", "600", undefined, options), {
    sidebarWidthDesktop: 320,
    composerWidthDesktop: 640,
    desktopLayoutVersion: 2,
  });
  assert.deepEqual(layout.normalizeStoredDesktopLayout("100", "1000", 1, options), {
    sidebarWidthDesktop: 240,
    composerWidthDesktop: 900,
    desktopLayoutVersion: 1,
  });
});

/**
 * Creates a minimal native-dialog test double.
 * @returns {object} Dialog-compatible test double.
 */
function createTestDialog() {
  return {
    open: false,
    closeCount: 0,
    showCount: 0,
    close() {
      this.open = false;
      this.closeCount += 1;
    },
    showModal() {
      this.open = true;
      this.showCount += 1;
    },
  };
}

test("state and storage modules serialize work and handle unavailable storage", async () => {
  const state = await importProjectModule("js/core/app-state.js");
  const storage = await importProjectModule("js/core/app-storage.js");
  const queue = state.createAsyncTaskQueue();
  const execution = [];
  const first = queue.enqueue(async () => {
    execution.push("first");
    return 1;
  });
  const second = queue.enqueue(async () => {
    execution.push("second");
    return 2;
  });
  const memoryStorage = createMemoryStorage({ saved: " value " });
  const failingStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };

  assert.deepEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepEqual(execution, ["first", "second"]);
  assert.equal(storage.readBrowserStorageValue(memoryStorage, "saved"), "value");
  assert.equal(storage.writeBrowserStorageValue(memoryStorage, "next", " value "), true);
  assert.equal(storage.readBrowserStorageValue(memoryStorage, "next"), "value");
  assert.equal(storage.removeBrowserStorageValue(memoryStorage, "next"), true);
  assert.equal(storage.readBrowserStorageValue(failingStorage, "saved"), "");
  assert.equal(storage.writeBrowserStorageValue(failingStorage, "next", "value"), false);
  assert.equal(storage.removeBrowserStorageValue(failingStorage, "next"), false);
});

test("navigation, bootstrap and translations expose stable fallbacks", async () => {
  const navigation = await importProjectModule("js/core/app-navigation.js");
  const bootstrap = await importProjectModule("js/core/app-bootstrap.js");
  const translations = await importProjectModule("js/core/app-translations.js");

  assert.equal(navigation.normalizeThreadlinePage("tools"), "tools");
  assert.equal(navigation.normalizeThreadlinePage("invalid"), "composer");
  assert.equal(navigation.getThreadlinePageHref("tools"), "./tools.html");
  assert.equal(navigation.getThreadlinePageHref("composer"), "./");
  assert.deepEqual(bootstrap.normalizeVersionInfo({ appVersion: 2, cacheVersion: " v2 ", label: " Test " }), {
    appVersion: "2",
    cacheVersion: "v2",
    label: "Test",
  });
  assert.equal(bootstrap.versionSignature({ appVersion: "0.4.1", cacheVersion: "v2" }), "0.4.1|v2");
  assert.equal(translations.DEFAULT_LOCALE, "en");
  assert.deepEqual(translations.SUPPORTED_LOCALES, ["de", "en", "fr"]);
  assert.ok(translations.translations.de);
  assert.ok(translations.translations.en);
  assert.ok(translations.translations.fr);
});

test("shared image and link-card helpers normalize untrusted saved values", async () => {
  const images = await importProjectModule("js/shared/shared-images.js");
  const linkCards = await importProjectModule("js/shared/shared-link-cards.js");
  const normalizedImage = images.normalizeThreadImage({
    id: "image-1",
    dataUrl: "data:image/png;base64,AA==",
    alt: "long alternative text",
    edit: { zoom: 99, rotation: -90 },
    exportQuality: 2,
    exportScale: 0.1,
  }, {
    maxAltTextLength: 4,
    imageMinExportScale: 0.2,
  });

  assert.equal(normalizedImage.alt, "long");
  assert.equal(normalizedImage.edit.zoom, 3);
  assert.equal(normalizedImage.edit.rotation, 270);
  assert.equal(normalizedImage.edit.fitMode, "cover");
  assert.equal(normalizedImage.exportQuality, 0.92);
  assert.equal(normalizedImage.exportScale, 0.2);
  assert.equal(images.normalizeImageAutoResizeMode("lossy"), "lossy");
  assert.equal(images.normalizeImageAutoResizeMode("unknown"), "off");
  assert.equal(images.isImageAutoResizeEnabled("fit"), true);
  assert.equal(images.isImageAutoResizeEnabled("off"), false);
  assert.equal(linkCards.getFirstHttpUrl("Read https://example.test/path."), "https://example.test/path");
  assert.equal(linkCards.normalizeLinkCardTargetUrl("example.test/path"), "https://example.test/path");
  assert.equal(linkCards.normalizeLinkCardTargetUrl("javascript:alert(1)"), "");
  assert.deepEqual(linkCards.validateLinkCardTargetUrl("", (key) => key), {
    ok: false,
    url: "",
    message: "linkCardUrlMissing",
  });
});

test("shared post rendering models actor, interaction and embed details", async () => {
  const rendering = await importProjectModule("js/shared/shared-post-rendering.js");
  const post = {
    uri: "at://did:plc:alice/app.bsky.feed.post/one",
    cid: "cid-one",
    author: { displayName: "Alice", handle: "alice.test" },
    likeCount: 2,
    replyCount: 1,
  };

  assert.deepEqual(rendering.getPostAuthorFields(post.author, "Unknown"), {
    authorLabel: "Alice",
    handleLabel: "@alice.test",
  });
  assert.equal(rendering.getPostPreviewText({ text: "one two three" }, "empty", 7), "one ...");
  assert.equal(rendering.isPostLikedByViewer({ viewer: { like: "at://like" } }), true);
  assert.equal(rendering.getViewerLikeUri({ viewer: { like: " at://like " } }), "at://like");
  assert.deepEqual(rendering.buildLivePostInteractionModel(post, {
    isLiked() { return true; },
    isLikePending() { return false; },
  }), {
    hasValidPost: true,
    canReply: true,
    canLike: true,
    isLiked: true,
    isLikePending: false,
    likeTranslationKey: "threadExplorerUnlikeAction",
  });
  assert.deepEqual(rendering.extractExternalCardFromEmbed({
    media: { external: { uri: "https://example.test", title: "Example", description: "Desc" } },
  }), {
    url: "https://example.test",
    title: "Example",
    description: "Desc",
    thumb: "",
  });
});

test("dialog helpers manage modal content, links and queued confirmations", async () => {
  const dialogs = await importProjectModule("js/core/app-dialogs.js");
  const progressDialog = createTestDialog();
  const errorDialog = createTestDialog();
  const confirmDialog = createTestDialog();
  const progressTitle = { textContent: "" };
  const progressMessage = { textContent: "" };
  const errorTitle = { textContent: "" };
  const errorMessage = { textContent: "" };
  const errorLinkWrap = { hidden: true };
  const errorLink = { href: "", textContent: "" };
  const confirmTitle = { textContent: "" };
  const confirmMessage = { textContent: "" };
  const confirmButton = { textContent: "" };
  const cancelButton = { textContent: "" };
  const previewWrap = { hidden: true };
  const previews = [];

  dialogs.showProgressModal({ dialog: progressDialog, title: progressTitle, message: progressMessage }, "Working", "Please wait");
  assert.equal(progressDialog.open, true);
  assert.equal(progressTitle.textContent, "Working");
  assert.equal(dialogs.closeModalDialog(progressDialog), true);
  dialogs.showErrorModal({
    dialog: errorDialog,
    title: errorTitle,
    message: errorMessage,
    linkWrap: errorLinkWrap,
    link: errorLink,
  }, {
    title: "Error",
    message: "Details",
    linkUrl: "https://example.test/help",
    linkLabel: "Help",
  });
  assert.equal(errorDialog.open, true);
  assert.equal(errorLinkWrap.hidden, false);
  assert.equal(errorLink.href, "https://example.test/help");

  const controller = dialogs.createQueuedConfirmDialogController({
    dialog: confirmDialog,
    title: confirmTitle,
    message: confirmMessage,
    confirmButton,
    cancelButton,
    previewWrap,
  }, (preview) => {
    previews.push(preview);
  });
  const first = controller.open({
    title: "First",
    message: "One",
    confirmValue: "confirmed",
    cancelValue: "cancelled",
    dismissValue: "dismissed",
    fallbackConfirmLabel: "Yes",
    fallbackCancelLabel: "No",
  });
  const second = controller.open({
    title: "Second",
    message: "Two",
    confirmValue: true,
    cancelValue: false,
    dismissValue: null,
    fallbackConfirmLabel: "Yes",
    fallbackCancelLabel: "No",
    preview: { handle: "alice.test" },
  });

  await new Promise((resolve) => setImmediate(resolve));
  controller.confirm();
  assert.equal(await first, "confirmed");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(confirmTitle.textContent, "Second");
  assert.equal(previewWrap.hidden, false);
  assert.deepEqual(previews, [{ handle: "alice.test" }]);
  controller.cancel();
  assert.equal(await second, false);
});

test("application initialization binds declared and optional events", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const target = new EventTarget();
  let calls = 0;
  const handler = () => {
    calls += 1;
  };

  assert.equal(initialization.bindApplicationEvents(target, [
    { type: "custom", handler },
    { type: "invalid", handler: null },
  ]), 1);
  assert.equal(initialization.bindOptionalApplicationEvent(target, "optional", handler), true);
  assert.equal(initialization.bindOptionalApplicationEvent(null, "optional", handler), false);
  target.dispatchEvent(new Event("custom"));
  target.dispatchEvent(new Event("optional"));
  assert.equal(calls, 2);
});

test("application initialization binds authentication lifecycle events", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const controls = Array.from({ length: 7 }, () => new EventTarget());
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindAuthenticationEvents({
    addAccountButton: controls[0],
    loginDialogCloseTop: controls[1],
    loginDialogCancelButton: controls[2],
    loginDialog: controls[3],
    window: controls[4],
    loginForm: controls[5],
  }, {
    addAccountClick: handler,
    closeClick: handler,
    cancelClick: handler,
    cancelEvent: handler,
    online: handler,
    offline: handler,
    submit: handler,
  });
  assert.equal(bound, 7);
  controls[0].dispatchEvent(new Event("click"));
  controls[1].dispatchEvent(new Event("click"));
  controls[2].dispatchEvent(new Event("click"));
  controls[3].dispatchEvent(new Event("cancel"));
  controls[4].dispatchEvent(new Event("online"));
  controls[4].dispatchEvent(new Event("offline"));
  controls[5].dispatchEvent(new Event("submit"));
  assert.equal(calls, 7);
});

test("application initialization binds preference controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const targets = Array.from({ length: 9 }, () => new EventTarget());
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindPreferenceEvents({
    languageSelect: targets[0],
    tipsVisibleToggle: targets[1],
    altTextRequiredToggle: targets[2],
    imageAutoResizeSelect: targets[3],
    themeToggleButton: targets[4],
    compactModeToggleButtons: [targets[5], targets[6]],
    resetColumnWidthsButton: targets[7],
    nextTipButton: targets[8],
    hideTipsButton: targets[0],
  }, {
    languageChange: handler,
    tipsVisibleChange: handler,
    altTextRequiredChange: handler,
    imageAutoResizeChange: handler,
    themeClick: handler,
    compactModeClick: handler,
    resetColumnWidthsClick: handler,
    nextTipClick: handler,
    hideTipsClick: handler,
  });
  assert.equal(bound, 10);
  targets[0].dispatchEvent(new Event("change"));
  targets[1].dispatchEvent(new Event("change"));
  targets[2].dispatchEvent(new Event("change"));
  targets[3].dispatchEvent(new Event("change"));
  targets[4].dispatchEvent(new Event("click"));
  targets[5].dispatchEvent(new Event("click"));
  targets[6].dispatchEvent(new Event("click"));
  targets[7].dispatchEvent(new Event("click"));
  targets[8].dispatchEvent(new Event("click"));
  assert.equal(calls, 9);
});

test("application initialization binds settings data controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const target = new EventTarget();
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindSettingsDataEvents({
    exportButton: target,
    backupSaveButton: target,
    backupLaterButton: target,
    backupCloseButton: target,
    shareButton: target,
    importButton: target,
    clearHistoryButton: target,
    importInput: target,
    threadImportInput: target,
  }, {
    exportClick: handler,
    backupSaveClick: handler,
    backupLaterClick: handler,
    backupCloseClick: handler,
    shareClick: handler,
    importClick: handler,
    clearHistoryClick: handler,
    importChange: handler,
    threadImportChange: handler,
  });
  assert.equal(bound, 9);
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("change"));
  assert.equal(calls, 2);
});

test("application initialization binds editor dialog controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const target = new EventTarget();
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindEditorDialogEvents({
    hashtagSaveButton: target,
    hashtagCancelButton: target,
    hashtagCancelTop: target,
    hashtagInput: target,
    hashtagDialog: target,
    altTextInput: target,
    altTextSaveButton: target,
    altTextCancelButton: target,
    altTextCloseTop: target,
    altTextDialog: target,
  }, {
    hashtagSaveClick: handler,
    hashtagCancelClick: handler,
    hashtagKeydown: handler,
    hashtagDialogClose: handler,
    altTextInput: handler,
    altTextSaveClick: handler,
    altTextCancelClick: handler,
    altTextCancelEvent: handler,
  });
  assert.equal(bound, 10);
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("keydown"));
  target.dispatchEvent(new Event("close"));
  target.dispatchEvent(new Event("input"));
  target.dispatchEvent(new Event("cancel"));
  assert.equal(calls, 5);
});

test("application initialization binds update controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const checkButton = new EventTarget();
  const reloadButton = new EventTarget();
  let calls = 0;
  const bound = initialization.bindApplicationUpdateEvents({
    checkUpdatesButton: checkButton,
    reloadAppButton: reloadButton,
  }, {
    checkUpdatesClick: () => { calls += 1; },
    reloadClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  checkButton.dispatchEvent(new Event("click"));
  reloadButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("application initialization binds confirmation dialogs", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const targets = Array.from({ length: 4 }, () => new EventTarget());
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindConfirmationDialogEvents({
    errorDialog: targets[0],
    confirmButton: targets[1],
    cancelButton: targets[2],
    confirmDialog: targets[3],
  }, {
    errorCancel: handler,
    confirmClick: handler,
    cancelClick: handler,
    dialogCancel: handler,
    dialogClose: handler,
  });
  assert.equal(bound, 5);
  targets[0].dispatchEvent(new Event("cancel"));
  targets[1].dispatchEvent(new Event("click"));
  targets[2].dispatchEvent(new Event("click"));
  targets[3].dispatchEvent(new Event("cancel"));
  targets[3].dispatchEvent(new Event("close"));
  assert.equal(calls, 5);
});

test("application initialization binds Link-Card settings", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const targets = Array.from({ length: 5 }, () => new EventTarget());
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = initialization.bindLinkCardSettingsEvents({
    endpointInput: targets[0],
    secretInput: targets[1],
    noneInput: targets[2],
    microlinkInput: targets[3],
    proxyInput: targets[4],
  }, { input: handler, change: handler, providerChange: handler });
  assert.equal(bound, 7);
  targets[0].dispatchEvent(new Event("input"));
  targets[0].dispatchEvent(new Event("change"));
  targets[1].dispatchEvent(new Event("input"));
  targets[1].dispatchEvent(new Event("change"));
  targets[2].dispatchEvent(new Event("change"));
  targets[3].dispatchEvent(new Event("change"));
  targets[4].dispatchEvent(new Event("change"));
  assert.equal(calls, 7);
});

test("application initialization binds workspace utility controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const targets = [new EventTarget(), new EventTarget(), new EventTarget()];
  let calls = 0;
  const bound = initialization.bindWorkspaceUtilityEvents({
    installButton: targets[0],
    loadThreadButton: targets[1],
    saveThreadButton: targets[2],
  }, {
    installClick: () => { calls += 1; },
    loadThreadClick: () => { calls += 1; },
    saveThreadClick: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  targets.forEach((target) => target.dispatchEvent(new Event("click")));
  assert.equal(calls, 3);
});

test("application initialization binds help and settings controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const settingsCloseTop = new EventTarget();
  const helpTarget = new EventTarget();
  let calls = 0;
  const bound = initialization.bindHelpAndSettingsEvents({ settingsCloseTop, helpTarget }, {
    settingsClose: () => { calls += 1; },
    helpClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  settingsCloseTop.dispatchEvent(new Event("click"));
  helpTarget.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("application initialization binds Thread Explorer controls", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const target = new EventTarget();
  const elements = { feedList: target, threadTree: target };
  let scrollCalls = 0;
  let wheelCalls = 0;
  const bound = initialization.bindThreadExplorerApplicationEvents(elements, {
    feedScroll: () => { scrollCalls += 1; },
    wheel: () => { wheelCalls += 1; },
  });
  assert.equal(bound, 2);
  target.dispatchEvent(new Event("scroll"));
  target.dispatchEvent(new Event("wheel"));
  assert.equal(scrollCalls, 1);
  assert.equal(wheelCalls, 1);
});

test("application initialization binds page navigation through supplied handlers", async () => {
  const initialization = await importProjectModule("js/core/app-initialization.js");
  const link = new EventTarget();
  let pageSwitchCalls = 0;
  let privacyCalls = 0;
  const bound = initialization.bindApplicationNavigationEvents({
    pageSwitchLinks: [link],
    privacyPageLinks: [link],
  }, {
    pageSwitchClick: () => { pageSwitchCalls += 1; },
    privacyClick: () => { privacyCalls += 1; },
  });
  assert.equal(bound, 2);
  link.dispatchEvent(new Event("click"));
  assert.equal(pageSwitchCalls, 1);
  assert.equal(privacyCalls, 1);
});


test("hydration restores explicit counter choice before rendering and keeps the legacy enabled default", async () => {
  for (const useCounters of [false, true, undefined]) {
    const f = await createHydrationFixture({ load: async () => ({ state: { useCounters, desktopLayoutVersion: 2 } }) });
    await f.controller.hydrate();
    assert.equal(f.elements.counter.checked, useCounters !== false);
    assert.equal(f.calls.includes("error-status"), false);
  }
});
