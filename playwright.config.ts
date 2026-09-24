import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
if (
  !process.env.TEST_DATABASE_URL ||
  !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("TEST_DATABASE_URL must end in _test.");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/start.mjs",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      PORT: "3100",
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      APP_URL: "http://localhost:3100",
      AUTH_MODE: "demo",
      DEMO_AUTH_ENABLED: "true",
      COOKIE_SECURE: "false",
    },
  },
});
