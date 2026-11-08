"use strict";
const { test, expect } = require("@playwright/test");
test.use({ serviceWorkers: "block" });

for (const pathname of ["/", "/tools.html"]) {
  test(`counter choice persists through actual worker storage and page restart from ${pathname}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      if (new URL(route.request().url()).hostname === "127.0.0.1") { return route.continue(); }
      return route.abort();
    });
    await page.route("**/counter-worker.js", route => route.fulfill({ contentType: "text/javascript", body: 'importScripts("/sw.js");' }));
    await page.addInitScript(() => {
      localStorage.setItem("threadline:settings-backup-reminder-dismissed-at", String(Date.now()));
      const worker = new Worker("/counter-worker.js");
      const bridge = { calls: [], errors: [], hydrated: false };
      worker.onerror = event => bridge.errors.push(event.message);
      window.__counterBridge = bridge;
      bridge.request = (type, payload = {}) => new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = event => {
          if (event.data.progress) { return; }
          channel.port1.close();
          if (event.data.ok) { resolve(event.data.result); }
          else { reject(Error(event.data.error)); }
        };
        worker.postMessage({ type, payload }, [channel.port2]);
      });
      const registration = { update: async () => { bridge.hydrated = true; }, active: { postMessage(message, ports) {
        bridge.calls.push(message);
        worker.postMessage(message, ports);
      } } };
      Object.defineProperty(navigator.serviceWorker, "register", { value: async () => registration });
      Object.defineProperty(navigator.serviceWorker, "ready", { value: Promise.resolve(registration) });
    });
    /** Waits for startup hydration before inspecting or changing controls. @returns {Promise<void>} Ready. */
    async function ready() {
      await expect.poll(() => page.evaluate(() => window.__counterBridge.hydrated)).toBe(true);
      expect(await page.evaluate(() => window.__counterBridge.errors)).toEqual([]);
    }
    /** Reads persisted state through the real worker message handler. @returns {Promise<object>} App state. */
    const state = () => page.evaluate(() => window.__counterBridge.request("GET_APP_STATE"));
    await page.goto(pathname, { waitUntil: "domcontentloaded" });
    await ready();
    await expect(page.locator("#counter-toggle")).toBeChecked();
    expect((await state()).useCounters).toBe(true);

    for (const checked of [false, true]) {
      if (pathname === "/") {
        await page.locator("#source-text").fill("Counter persistence regression");
        await page.locator("#post-settings-button").click();
        await page.locator("#counter-toggle").setChecked(checked);
        await page.locator("#post-languages-close-top").click();
      } else {
        // Tools initializes the shared Composer controls in its hidden page scope.
        await page.locator("#counter-toggle").evaluate((control, value) => {
          control.checked = value;
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }, checked);
      }
      await expect.poll(async () => (await state()).useCounters).toBe(checked);
      const saved = await page.evaluate(() => window.__counterBridge.calls.filter(call => call.type === "SAVE_SETTINGS").at(-1).payload);
      expect(saved.useCounters).toBe(checked);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready();
      if (checked) { await expect(page.locator("#counter-toggle")).toBeChecked(); }
      else { await expect(page.locator("#counter-toggle")).not.toBeChecked(); }
      expect((await state()).useCounters).toBe(checked);
    }
    expect(errors).toEqual([]);
  });
}
