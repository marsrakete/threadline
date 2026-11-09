const { defineConfig } = require("@playwright/test");
const testPort = Number(process.env.THREADLINE_TEST_PORT || 4173);

module.exports = defineConfig({
  testDir: ".",
  testMatch: /browser-.*\.test\.cjs/,
  reporter: "list",
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    browserName: "chromium",
    channel: "msedge",
    headless: true,
  },
  webServer: {
    command: "node static-server.cjs",
    port: testPort,
    reuseExistingServer: false,
  },
});
