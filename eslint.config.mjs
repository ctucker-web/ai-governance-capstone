import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "src/frontend/demo/**",
    ".local/**",
    "test-results/**",
    "playwright-report/**",
    "versions/php-mysql/public/assets/**",
    "versions/php-mysql/vendor/**",
  ]),
]);
