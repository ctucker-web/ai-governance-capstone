import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  outputDir: "../../test-results/wordpress",
  use: {
    baseURL: process.env.WP_TEST_URL || "http://localhost:3300",
    trace: "retain-on-failure",
    channel: process.env.WP_BROWSER_CHANNEL || undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
