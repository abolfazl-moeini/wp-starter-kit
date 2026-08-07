/**
 * External dependencies
 */
import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "@playwright/test";

/**
 * WordPress dependencies
 *
 * Scaffolded plugins use package.json "type": "module". Use createRequire
 * so we can load the CJS base config from @wordpress/scripts.
 */
const require = createRequire(import.meta.url);
const baseConfig = require("@wordpress/scripts/config/playwright.config");

process.env.WP_ARTIFACTS_PATH ??= path.join(process.cwd(), "artifacts");
process.env.STORAGE_STATE_PATH ??= path.join(
  process.env.WP_ARTIFACTS_PATH,
  "storage-states/admin.json",
);

// When WP_BASE_URL is set (alternate ports or an existing site), do not
// let @wordpress/scripts start a second wp-env on the default 8888/8889.
const usingExistingSite = Boolean(process.env.WP_BASE_URL);

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  globalSetup: require.resolve("./tests/e2e/config/global-setup.js"),
  ...(usingExistingSite
    ? {
        webServer: undefined,
        use: {
          ...baseConfig.use,
          baseURL: process.env.WP_BASE_URL,
        },
      }
    : {}),
});
