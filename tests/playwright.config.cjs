const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  testMatch: /browser-.*\.test\.cjs/,
  reporter: "list",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
  },
  webServer: {
    command: "node static-server.cjs",
    port: 4173,
    reuseExistingServer: true,
  },
});
