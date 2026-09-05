/* The app is a single file opened straight from disk — no server, no build.
   CHROMIUM_PATH is only needed in sandboxes that ship their own browser;
   on a normal machine and in CI, Playwright uses the one it installed. */
const { defineConfig } = require("@playwright/test");

const launchOptions = {};
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,   /* every test drives one app instance and its storage */
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    viewport: { width: 420, height: 900 },
    launchOptions: launchOptions,
    trace: "retain-on-failure"
  }
});
