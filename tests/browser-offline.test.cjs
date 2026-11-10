"use strict";
const { test, expect } = require("@playwright/test");

test("real service worker activates, precaches modules and initializes both entry pages offline", async ({ page, context }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.waitForURL(/reload=/);
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys(); const shell = await caches.open(names.find(name => /^threadline-v/.test(name)));
    const urls = (await shell.keys()).map(request => new URL(request.url).pathname);
    return ["/", "/tools.html", "/app.js", "/js/worker/archive-wave-controller.js", "/js/core/app-storage.js", "/js/core/app-i18n.js", "/js/shared/shared-post-rendering.js"].every(url => urls.includes(url));
  });
  expect(cached).toBe(true);
  await context.setOffline(true);
  for (const pathname of ["/", "/tools.html"]) {
    await page.goto(pathname);
    await expect(page.locator("#language-select")).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(/^(de|en|fr)$/);
    const state = await page.evaluate(async () => {
      const channel = new MessageChannel();
      const result = new Promise(resolve => { channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data); }; });
      navigator.serviceWorker.controller.postMessage({ type: "GET_APP_STATE" }, [channel.port2]); return result;
    });
    expect(state.ok).toBe(true);
  }
  expect(errors).toEqual([]);
});
