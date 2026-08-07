# Consumer browser E2E (`e2eTest`)

> Opt-in Playwright + `@wordpress/env` stack for **scaffolded plugins**
> (not the kit repo’s own CI). Feature id: `e2eTest`.

## Enable

```bash
wpdev create my-plugin --e2e-test=playwright
wpdev create my-plugin --preset=full          # includes e2eTest=playwright
wpdev add e2eTest --variant playwright        # existing project
```

Defaults: `e2eTest: none` on `minimal` / `standard` / `woocommerce`.
Requires **Docker** for `wp-env`.

> **Note:** Bare `wpdev add e2eTest` applies the catalog default (`none`).
> Always pass `--variant playwright` to enable browser E2E.

## What gets scaffolded

| Path                                     | Purpose                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.wp-env.json`                           | Maps `"."` as the plugin; pretty-permalink lifecycle                                                  |
| `playwright.config.js`                   | Extends `@wordpress/scripts` Playwright config via `createRequire` (ESM-safe); `testDir: ./tests/e2e` |
| `tests/e2e/config/global-setup.js`       | REST login + `storageState` + content reset                                                           |
| `tests/e2e/specs/admin-smoke.spec.js`    | Dashboard / Plugins smoke                                                                             |
| `tests/e2e/specs/frontend-smoke.spec.js` | Front-end + REST-created post                                                                         |
| `package.json`                           | Scripts `wp-env`, `test:e2e`; Playwright-related `devDependencies`                                    |

Generator: `packages/create-wp-project/src/generators/e2eTest.js`  
Templates: `packages/create-wp-project/src/generators/templates/e2e/`

## Commands

```bash
npx playwright install --with-deps   # once per machine
npm run test:e2e                     # headless (starts wp-env via webServer)
npm run test:e2e -- --ui             # Playwright UI mode
npm run test:e2e -- --headed         # visible browser
```

Against an existing site (skip wp-env auto-start): set `WP_BASE_URL`,
`WP_USERNAME`, `WP_PASSWORD` and adjust `playwright.config.js` `webServer`
(see skill references).

## Writing specs

Import only from the WordPress utils package:

```js
import { test, expect } from "@wordpress/e2e-test-utils-playwright";

test("dashboard loads", async ({ admin, page }) => {
  await admin.visitAdminPage("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

Use `requestUtils` for content setup; prefer `getByRole` locators.
Do **not** import `test` from `@playwright/test` in specs.

## Consumer CI

When `ci` is not `off` and `e2eTest=playwright`, the generated
`.github/workflows/ci.yml` includes an `e2e` job (`playwright install` +
`npm run test:e2e`). Toggling the feature refreshes CI via `refreshGlue`.

This is separate from the **kit** workflows in [ci.md](ci.md)
(`installer-e2e` = CLI scaffold smoke, not browser tests).

## Release strip

`tests/`, `.wp-env.json`, and root `playwright.config.js` are removed from
`dist/` by the release packager — E2E must not ship in the plugin zip.

## Disable

```bash
wpdev remove e2eTest
# or switch variant without removing files first:
wpdev add e2eTest --variant none
```

Do **not** use `wpdev set e2eTest=…` — `e2eTest` is an add/remove feature,
not a config-only id (`phpMinVersion` / `license` / `ci`).

Owned paths (`.wp-env.json`, `playwright.config.js`, `tests/e2e/**`) are
removed; package.json scripts/devDeps and CI are refreshed.

## Migration

`@wpdev/create-wp-project` **2.5.0** backfills `features.e2eTest=none` on
existing manifests (`wpdev update`). Files are not added until you
`wpdev add e2eTest --variant playwright`.

## See also

- [features-reference.md](features-reference.md) — catalog row
- [cli-reference.md](cli-reference.md) — `--e2e-test=`
- [php-test-tools.md](php-test-tools.md) — PHPUnit / Jest (unit layer)
- Kit skill: [`skills/wordpress-e2e-tests/`](../skills/wordpress-e2e-tests/SKILL.md)
- Upstream patterns: [WordPress Developer Blog — Playwright E2E](https://developer.wordpress.org/news/2026/05/getting-started-writing-wordpress-e2e-tests-with-playwright/)
- Shared skill repo: [abolfazl-moeini/wordpress-e2e-tests](https://github.com/abolfazl-moeini/wordpress-e2e-tests)
