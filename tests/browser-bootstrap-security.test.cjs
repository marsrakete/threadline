"use strict";

const { expect, test } = require("@playwright/test");

for (const pathname of ["/", "/tools.html"]) {
  test(`insecure origin explains HTTPS requirement on ${pathname}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // A non-loopback hostname exercises the browser's real insecure-context policy.
    await page.route("http://threadline.test:4173/**", async (route) => {
      const url = new URL(route.request().url());
      url.hostname = "127.0.0.1";
      url.port = String(process.env.THREADLINE_TEST_PORT || 4173);
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    await page.goto(`http://threadline.test:4173${pathname}`, { waitUntil: "networkidle" });
    expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
    await expect(page.locator("#status-text")).toContainText("HTTPS");
    await expect(page.locator("#status-text")).toContainText(/localhost/);
    expect(errors).toEqual([]);
  });
}
