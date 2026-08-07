/**
 * External dependencies
 */
import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * WordPress dependencies
 */
const baseConfig = require("@wordpress/scripts/config/playwright.config");

process.env.WP_ARTIFACTS_PATH ??= path.join(process.cwd(), "artifacts");
process.env.STORAGE_STATE_PATH ??= path.join(
  process.env.WP_ARTIFACTS_PATH,
  "storage-states/admin.json",
);

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  globalSetup: require.resolve("./tests/e2e/config/global-setup.js"),
});
