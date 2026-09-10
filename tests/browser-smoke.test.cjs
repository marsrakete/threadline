"use strict";

const { expect, test } = require("@playwright/test");

/**
 * Blocks external requests so smoke tests neither need network access nor access third-party services.
 * @param {import("@playwright/test").Page} page - Browser page used for the smoke test.
 * @returns {Promise<void>} Resolves once external request blocking is active.
 */
async function blockExternalRequests(page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }

    await route.abort();
  });
}

/**
 * Loads one app page after its DOM is interactive and applies the mobile test viewport.
 * @param {import("@playwright/test").Page} page - Browser page used for the smoke test.
 * @param {string} pathname - Relative application path to open.
 * @returns {Promise<void>} Resolves once the page DOM is ready for assertions.
 */
async function openMobileAppPage(page, pathname = "/") {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternalRequests(page);
  await page.goto(pathname, { waitUntil: "domcontentloaded" });
}

test.describe("mobile app shell", () => {
  test("privacy navigation remains on the privacy page", async ({ page }) => {
    await openMobileAppPage(page);
    const privacyLink = page.locator("[data-privacy-page-link]");
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();

    await expect(page).toHaveURL(/datenschutz\.html#(de|en|fr)$/);
    await expect(page.locator(".privacy-page")).toBeVisible();
  });

  test("composer actions stay inside the mobile viewport", async ({ page }) => {
    await openMobileAppPage(page);
    const layout = await page.locator(".composer-section-heading").evaluate((heading) => {
      const replyButton = heading.querySelector("#reply-target-button");
      const settingsButton = heading.querySelector("#post-settings-button");
      const helpButton = heading.querySelector(".help-trigger");
      const viewportWidth = window.innerWidth;
      const replyRect = replyButton.getBoundingClientRect();
      const settingsRect = settingsButton.getBoundingClientRect();
      const helpRect = helpButton.getBoundingClientRect();

      return {
        viewportWidth,
        replyRight: replyRect.right,
        settingsRight: settingsRect.right,
        helpRight: helpRect.right,
      };
    });

    expect(layout.replyRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.settingsRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.helpRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
  });
});

test("page switch opens the tools page", async ({ page }) => {
  await openMobileAppPage(page);
  await page.locator('[data-page-target="tools"]').click();

  await expect(page).toHaveURL(/tools\.html/);
  await expect(page.locator("body")).toHaveAttribute("data-page", "tools");
});
