# Existing environment (no wp-env webServer)

Use when WordPress already runs in Docker or on a local host and you do
**not** want Playwright to start `wp-env`.

## Env vars

```bash
export WP_BASE_URL="http://localhost:8080"
export WP_USERNAME="admin"
export WP_PASSWORD="your-local-password"
npm run test:e2e
```

## Config override

In the project `playwright.config.js`, disable auto wp-env start:

```js
export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  globalSetup: require.resolve("./tests/e2e/config/global-setup.js"),
  webServer: undefined,
  use: {
    ...baseConfig.use,
    baseURL: process.env.WP_BASE_URL || "http://localhost:8889",
  },
});
```

Ensure the plugin is **active** on that site before running tests.

## Notes

- `WP_BASE_URL` must be reachable from the host running Playwright.
- Prefer paths relative to `baseURL` (`page.goto( '/' )`, `admin.visitAdminPage`).
- Default wp-env **test** site is `http://localhost:8889` (dev is `:8888`).
- Delete `artifacts/storage-states/admin.json` if login state is stale.

Never use production URLs.
