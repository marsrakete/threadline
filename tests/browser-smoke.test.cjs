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

test("application pages initialize without browser errors", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`);
  });
  await openMobileAppPage(page, "/");
  await page.goto("/tools.html", { waitUntil: "domcontentloaded" });
  expect({ pageErrors, consoleErrors, failedRequests }).toEqual({
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
  });
});

test("Thread Explorer keeps identity in the header and interactions above counts", async ({ page }) => {
  await openMobileAppPage(page);
  const layout = await page.evaluate(() => {
    const template = document.querySelector("#thread-explorer-node-template");
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".thread-explorer-post-card");
    const header = fragment.querySelector(".thread-explorer-post-head");
    const author = fragment.querySelector(".thread-explorer-post-author");
    const handle = fragment.querySelector(".thread-explorer-post-handle");
    const headButtons = fragment.querySelector(".thread-explorer-post-head-buttons");
    const actions = fragment.querySelector(".thread-explorer-post-actions");
    const editButton = fragment.querySelector(".thread-explorer-edit-button");
    const counts = fragment.querySelector(".thread-explorer-post-counts");

    card.style.width = "320px";
    card.style.height = "128px";
    card.style.position = "fixed";
    card.style.left = "0";
    card.style.top = "0";
    card.style.transition = "none";
    card.style.animation = "none";
    card.classList.add("thread-explorer-layout-test-card");
    author.textContent = "Die Blaue Berta";
    handle.textContent = "@bitpaul53.bsky.social";
    counts.textContent = "1 Likes   0 Replies   0 Reposts   0 Quotes";

    const interactionActions = document.createElement("div");
    interactionActions.className = "thread-explorer-interaction-actions";
    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "thread-explorer-inline-action";
    replyButton.textContent = "Antworten";
    const unlikeButton = document.createElement("button");
    unlikeButton.type = "button";
    unlikeButton.className = "thread-explorer-inline-action is-active";
    unlikeButton.textContent = "Like entfernen";
    interactionActions.append(replyButton, unlikeButton);
    actions.hidden = false;
    actions.insertBefore(interactionActions, editButton);
    card.replaceChildren(header, actions, counts);
    document.body.append(card);

    const cardRect = card.getBoundingClientRect();
    const authorRect = author.getBoundingClientRect();
    const handleRect = handle.getBoundingClientRect();
    const headButtonsRect = headButtons.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const interactionRect = interactionActions.getBoundingClientRect();
    const countsRect = counts.getBoundingClientRect();

    return {
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      authorScrollWidth: author.scrollWidth,
      authorClientWidth: author.clientWidth,
      handleScrollWidth: handle.scrollWidth,
      handleClientWidth: handle.clientWidth,
      headButtonsLeft: headButtonsRect.left,
      headButtonsRight: headButtonsRect.right,
      actionsTop: actionsRect.top,
      actionsBottom: actionsRect.bottom,
      interactionTop: interactionRect.top,
      identityBottom: Math.max(authorRect.bottom, handleRect.bottom),
      countsTop: countsRect.top,
      headerInteractions: headButtons.querySelectorAll(".thread-explorer-interaction-actions").length,
    };
  });

  expect(layout.authorScrollWidth).toBeLessThanOrEqual(layout.authorClientWidth + 1);
  expect(layout.handleScrollWidth).toBeLessThanOrEqual(layout.handleClientWidth + 1);
  expect(layout.headButtonsLeft).toBeGreaterThanOrEqual(layout.cardLeft - 1);
  expect(layout.headButtonsRight).toBeLessThanOrEqual(layout.cardRight + 1);
  expect(layout.actionsTop).toBeGreaterThanOrEqual(layout.identityBottom);
  expect(layout.interactionTop).toBeGreaterThanOrEqual(layout.actionsTop);
  expect(layout.countsTop).toBeGreaterThanOrEqual(layout.actionsBottom);
  expect(layout.headerInteractions).toBe(0);
  await expect(page.locator(".thread-explorer-layout-test-card")).toHaveScreenshot("thread-explorer-footer-actions.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.03,
    timeout: 10000,
  });
});
