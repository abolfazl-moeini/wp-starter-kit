# Existing environment (no wp-env webServer)

Use when WordPress already runs in Docker or on a dev host (e.g. nikamooz stack) and you do **not** want Playwright to start `wp-env`.

## Environment variables

Match [WordPress core `tests/e2e` README](https://github.com/WordPress/wordpress-develop/tree/trunk/tests/e2e):

```bash
export WP_BASE_URL="http://localhost:8080"
export WP_USERNAME="admin"
export WP_PASSWORD="your-local-password"
npm run test:e2e
```

One-liner:

```bash
WP_BASE_URL=http://localhost:8080 WP_USERNAME=admin WP_PASSWORD=secret npm run test:e2e
```

**Never** use production URLs. Tests may delete posts and reset preferences via global setup.

## playwright.config.js override

The scaffolded template already skips `webServer` when `WP_BASE_URL` is set. You usually only need env vars:

```bash
WP_BASE_URL=http://localhost:8080 WP_USERNAME=admin WP_PASSWORD=secret npm run test:e2e
```

If you must hard-code the override (older template without the env gate):

```javascript
import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "@playwright/test";

const require = createRequire(import.meta.url);
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
  webServer: undefined,
  use: {
    ...baseConfig.use,
    baseURL: process.env.WP_BASE_URL || "http://localhost:8889",
  },
});
```

Ensure the plugin is **active** on that site before running tests.

## Docker / path notes

- `WP_BASE_URL` must be reachable **from the host** where Playwright runs (use published port, not container-internal `http://wordpress`).
- Do not hardcode `/Users/...` or `/var/www/html` in specs — only `baseURL`-relative paths: `page.goto( '/' )`, `admin.visitAdminPage( … )`.
- If admin lives on a subdirectory install, set `WP_BASE_URL` including the path: `http://localhost:8080/wp`.

## wp-env dev site vs test site

When using wp-env but hitting the **dev** instance manually:

```bash
WP_BASE_URL=http://localhost:8888 npm run test:e2e -- --headed
```

Default templates target the **test** instance (`8889`) so dev content is not wiped unexpectedly — prefer 8889 for automated runs.

## Credentials outside defaults

If your stack uses non-default admin credentials, set `WP_USERNAME` and `WP_PASSWORD` before `test:e2e`. Global setup reads the same env vars through `RequestUtils`.

Do not commit real passwords. Use shell env or a local `.env` file listed in `.gitignore`.

## Smoke test against existing site

After config override:

```bash
WP_BASE_URL=http://your-local-site npm run test:e2e -- tests/e2e/specs/admin-smoke.spec.js
```

If login fails, delete `artifacts/storage-states/admin.json` and re-run so global setup regenerates storage state.
