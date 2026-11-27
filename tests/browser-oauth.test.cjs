"use strict";

const { test, expect, chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");
const os = require("node:os");
const { projectRoot } = require("./module-test-helpers.cjs");

const origin = "https://marsrakete.github.io";
const base = origin + "/threadline/";
const provider = "https://oauth.threadline.test";
const did = "did:plc:aaaaaaaaaaaaaaaaaaaaaaaa";
const handle = "owner.bsky.social";

/** Hosts the checked-in app at its declared HTTPS origin within the isolated test browser. @param {string} directory - Temporary certificate directory. @returns {Promise<import("node:https").Server>} Listening server. */
async function startServer(directory) {
  const key = path.join(directory, "key.pem");
  const cert = path.join(directory, "cert.pem");
  const config = path.join(directory, "openssl.cnf");
  await fs.writeFile(config, "[req]\ndistinguished_name = subject\n[subject]\n");
  execFileSync(process.env.THREADLINE_TEST_OPENSSL || "openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-keyout", key, "-out", cert,
    "-config", config, "-subj", "/CN=marsrakete.github.io",
  ], { stdio: "ignore" });
  const types = {
    ".js": "text/javascript", ".json": "application/json", ".html": "text/html; charset=utf-8",
    ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  };
  const server = https.createServer({ key: await fs.readFile(key), cert: await fs.readFile(cert) }, async (request, response) => {
    const url = new URL(request.url, origin);
    if (!url.pathname.startsWith("/threadline/")) { response.writeHead(404).end(); return; }
    const file = path.resolve(projectRoot, url.pathname.slice("/threadline/".length) || "index.html");
    if (!file.startsWith(projectRoot + path.sep)) { response.writeHead(404).end(); return; }
    try {
      const data = await fs.readFile(file);
      response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }).end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
  return server;
}

/** Emulates discovery, PAR, callback, token exchange and the account XRPC endpoints. @param {import("@playwright/test").BrowserContext} context - Isolated browser. @returns {Promise<object>} Recorded contract values. */
async function routeProvider(context) {
  const calls = { writes: [], auth: null, tokenExchanges: 0 };
  const passwordJwt = "fixture." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".fixture";
  await context.route((url) => url.origin !== origin, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "*", "access-control-allow-headers": "*",
      "access-control-expose-headers": "DPoP-Nonce", "dpop-nonce": "fixture-nonce",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ headers, status: 204 });
      return;
    }
    if (url.hostname === "bsky.social" && url.pathname.endsWith(".resolveHandle")) {
      await route.fulfill({ headers, json: { did } });
    } else if (url.hostname === "bsky.social" && url.pathname.endsWith(".createSession")) {
      await route.fulfill({ headers, json: { did, handle, accessJwt: passwordJwt, refreshJwt: "password-refresh-fixture" } });
    } else if (url.hostname === "plc.directory" && decodeURIComponent(url.pathname) === "/" + did) {
      await route.fulfill({ headers, json: {
        id: did, alsoKnownAs: ["at://" + handle],
        service: [{ id: "#atproto_pds", type: "AtprotoPersonalDataServer", serviceEndpoint: provider }],
      } });
    } else if (url.origin === provider && url.pathname === "/.well-known/oauth-protected-resource") {
      await route.fulfill({ headers, json: { resource: provider, authorization_servers: [provider] } });
    } else if (url.origin === provider && url.pathname === "/.well-known/oauth-authorization-server") {
      await route.fulfill({ headers, json: {
        issuer: provider, authorization_endpoint: provider + "/oauth/authorize", token_endpoint: provider + "/oauth/token",
        pushed_authorization_request_endpoint: provider + "/oauth/par", require_pushed_authorization_requests: true,
        response_types_supported: ["code"], response_modes_supported: ["fragment"],
        grant_types_supported: ["authorization_code", "refresh_token"], code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"], dpop_signing_alg_values_supported: ["ES256"],
        client_id_metadata_document_supported: true, authorization_response_iss_parameter_supported: true,
      } });
    } else if (url.origin === provider && url.pathname === "/oauth/par") {
      calls.auth = new URLSearchParams(request.postData());
      expect(calls.auth.get("code_challenge_method")).toBe("S256");
      expect(request.headers().dpop).toBeTruthy();
      await route.fulfill({ status: 201, headers, json: { request_uri: "urn:ietf:params:oauth:request_uri:fixture", expires_in: 60 } });
    } else if (url.origin === provider && url.pathname === "/oauth/authorize") {
      const fragment = new URLSearchParams({ state: calls.auth.get("state"), code: "fixture-code", iss: provider });
      await route.fulfill({ status: 302, headers: { location: base + "oauth-callback.html#" + fragment } });
    } else if (url.origin === provider && url.pathname === "/oauth/token") {
      calls.tokenExchanges += 1;
      expect(new URLSearchParams(request.postData()).get("code_verifier")).toBeTruthy();
      expect(request.headers().dpop).toBeTruthy();
      await route.fulfill({ headers, json: { sub: did, token_type: "DPoP", access_token: "access-fixture",
        refresh_token: "oauth-refresh-fixture", scope: calls.auth.get("scope"), expires_in: 3600 } });
    } else if (url.pathname.endsWith(".createRecord")) {
      calls.writes.push({ ...request.headers() });
      await route.fulfill({ headers, json: { uri: "at://" + did + "/app.bsky.feed.post/fixture", cid: "fixture" } });
    } else {
      await route.fulfill({ headers, json: { did, handle, convos: [] } });
    }
  });
  return calls;
}

/** Requests an operation through the app's normal service-worker channel. @param {import("@playwright/test").Page} page - Browser page. @param {string} type - Operation. @param {object} payload - Worker input. @returns {Promise<object>} Worker response. */
function requestWorker(page, type, payload = {}) {
  return page.evaluate(async ({ type, payload }) => {
    const { active } = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();
    return new Promise((resolve, reject) => {
      channel.port1.onmessage = ({ data }) => {
        if (data.progress) { return; }
        channel.port1.close();
        if (data.ok) { resolve(data.result); } else { reject(new Error(data.error)); }
      };
      active.postMessage({ type, payload }, [channel.port2]);
    });
  }, { type, payload });
}

test("OAuth in Threadline restores Tools, signs XRPC and retains the original password connection", async ({}, testInfo) => {
  test.setTimeout(95_000);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "threadline-oauth-test-"));
  let server;
  let browser;
  try {
    server = await startServer(directory);
    const { channel, launchOptions } = testInfo.project.use;
    browser = await chromium.launch({ ...launchOptions, channel, args: [
      "--ignore-certificate-errors", "--no-proxy-server",
      "--host-resolver-rules=MAP marsrakete.github.io 127.0.0.1:" + server.address().port,
    ] });
    const context = await browser.newContext({ locale: "de-DE", serviceWorkers: "allow" });
    context.setDefaultTimeout(15_000);
    const calls = await routeProvider(context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const navigations = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) { navigations.push(new URL(frame.url()).pathname); }
    });
    await page.goto(base + "tools.html");
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
    await page.locator("#add-account-button").click();
    await expect(page.locator("#oauth-login-form")).toBeVisible();
    await page.locator("#password-login-details summary").click();
    await page.locator("#identifier").fill(handle);
    await page.locator("#password").fill("test-app-password");
    await page.locator("#login-button").click();
    await expect(page.locator("#login-dialog")).not.toBeVisible();
    expect((await requestWorker(page, "AUTH_STATUS")).authenticated).toBe(true);

    await page.locator("#add-account-button").click();
    await page.locator("#oauth-handle").fill(handle);
    await page.locator("#oauth-login-button").click();
    try {
      await expect(page.locator(".account-chip-fallback")).toBeVisible({ timeout: 18_000 });
    } catch (error) {
      const status = await page.locator("#oauth-status, #login-dialog-note").first().textContent({ timeout: 1_000 }).catch(() => "");
      throw new Error(JSON.stringify({ navigations, pageErrors, status, authorized: Boolean(calls.auth), tokenExchanges: calls.tokenExchanges }), { cause: error });
    }
    await expect(page).toHaveURL(base + "tools.html");
    const oauth = await requestWorker(page, "AUTH_STATUS");
    expect(oauth.accounts).toHaveLength(1);
    expect(oauth.accounts[0]).toMatchObject({ did, authMethod: "oauth", hasStoredPassword: true });
    expect(calls.auth.get("scope")).not.toContain("chat.bsky");
    expect(calls.tokenExchanges).toBe(1);
    await requestWorker(page, "PUBLISH_THREAD", { segments: ["Fixture publish"] });
    expect(calls.writes[0].authorization).toBe("DPoP access-fixture");
    expect(calls.writes[0].dpop).toBeTruthy();

    await page.locator(".account-chip-fallback").click();
    await expect(page.locator(".account-chip-fallback")).toBeHidden();
    const password = await requestWorker(page, "AUTH_STATUS");
    expect(password.accounts[0]).toMatchObject({ did, hasStoredPassword: true, hasSession: true });
    await requestWorker(page, "PUBLISH_THREAD", { segments: ["Fixture password publish"] });
    expect(calls.writes[1].authorization).toMatch(/^Bearer fixture\./);

    const callback = await page.goto(base + "oauth-callback.html#code=fixture-code&state=" + calls.auth.get("state"));
    expect(callback.fromServiceWorker()).toBe(true);
    await expect(page.locator("#oauth-return")).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    expect(calls.tokenExchanges).toBe(1);
    expect(pageErrors).toEqual([]);
  } finally {
    if (browser) { await browser.close(); }
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    for (const file of ["key.pem", "cert.pem", "openssl.cnf"]) {
      await fs.rm(path.join(directory, file), { force: true });
    }
    await fs.rmdir(directory);
  }
});
