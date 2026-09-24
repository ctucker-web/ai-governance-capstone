import "dotenv/config";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "TEST_DATABASE_URL must point to a separate database ending in _test.",
  );
process.env.DATABASE_URL = url;
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
