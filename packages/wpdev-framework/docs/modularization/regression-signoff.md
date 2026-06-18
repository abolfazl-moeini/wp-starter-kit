# Phase 2.5 — Manual regression sign-off (P2)

Run in multisite Docker (`localhost:8080`) as network super admin. Mark each item when verified.

## Reference pages

**Network admin (9 slugs)** — verified by `bin/regression-network-admin-http.php` and `bin/regression-admin-pages.php`:

- [x] `network/admin.php?page=wpdev-settings`
- [x] `network/admin.php?page=wpdev-products`
- [x] `network/admin.php?page=wpdev-domains`
- [x] `network/admin.php?page=wpdev-broadcasts`
- [x] `network/admin.php?page=wpdev-payments`
- [x] `network/admin.php?page=wpdev-checkout-forms`
- [x] `network/admin.php?page=wpdev-edit-checkout-form` (with `id`)
- [x] `network/admin.php?page=wpdev-edit-product` (with `id`)
- [x] `network/admin.php?page=wpdev-addons`

**Site admin dashboard** — `Top_Level_Admin_Page` registers on `admin_menu` only (not network admin):

- [x] `admin.php?page=wpdev` (playground parity + site-admin dashboard)

Verified via `bin/regression-network-admin-http.php` (authenticated HTTP, Docker `127.0.0.1` + Host header). Spot-check modals/screen options in browser as needed.

## Automated CLI (no browser)

```bash
composer ci                  # GitHub Actions / no WordPress
composer regression:p2         # Host P2 (needs local DB; often use Docker instead)
composer regression:p2:docker # Full P2 inside multisite container (recommended)
./bin/pre-release.sh         # ci + optional Docker (RUN_DOCKER=1)
```

Docker (multisite at `localhost:8080`):

```bash
composer regression:docker
# Full gate (setup flag + CLI HTTP auth inside Docker):
composer regression:docker:full
# Or with password-based sign-on instead of trusted CLI:
WPDEV_DOCKER_ENSURE_SETUP=1 WPDEV_REGRESSION_PASSWORD=... composer regression:docker
```

HTTP auth in Docker defaults to **trusted CLI** (`WPDEV_REGRESSION_TRUST_CLI=1`): the script runs inside the container as CLI and impersonates the network super admin without storing a password. Disable with `WPDEV_REGRESSION_TRUST_CLI=0` and set `WPDEV_REGRESSION_PASSWORD` instead.

Last automated run: `composer regression:p2` — bundled steps must pass with structured `WPDEV_REGRESSION_RESULT` sentinels from child regression scripts. Skipped checks (`wpdev_setup_finished=false`) fail unless `WPDEV_ALLOW_REGRESSION_SKIP=1`. Fatal output strings are scanned as a fallback. Set `WPDEV_REGRESSION_PASSWORD` for the HTTP network-admin step in CI/Docker.

Docker multisite (`composer regression:docker:full`): **OK** — sunrise sync, wp-load, 9 network admin pages (CLI), 9 HTTP network pages, playground sign-off (`auth_mode: trust_cli`).

**Phase 2.9 complete:** `inc/` contains **no PHP** (only `inc/README.md` + `inc/next/phpcs.xml`); canonical code lives under `modules/`.

**2.5.0 release gate:** `composer release:gate` runs `@audit:inc-complete`, `@audit:sunrise`, `@audit:shim-removal`, and `@regression:p2`. GitHub Actions runs `composer ci` only.

Browser P2 requires network super-admin login at `http://localhost:8080/wp-admin/network/` (automated CLI cannot substitute).

## Playground (dev-only, site admin)

Requires `WPDEV_PLAYGROUND_RUN` in `wp-config.php` or `examples/wpdev-playground-sample/`.

| Check | Command / URL |
|-------|----------------|
| Menu + landing links | Site Admin → **WPDev Playground** |
| Production dashboard (parity) | `admin.php?page=wpdev` (under playground parent) |
| Production settings (parity) | `admin.php?page=wpdev-settings` |
| Production products list (parity) | `admin.php?page=wpdev-products` |
| Settings panel sandbox | `admin.php?page=wpdev-pg-settings-panel-builder` |
| Table sample rows (sandbox) | `admin.php?page=wpdev-pg-table-builder` |
| Field gallery (sandbox) | `admin.php?page=wpdev-pg-field-builder` |

```bash
composer audit:playground
WPDEV_PLAYGROUND_RUN=1 composer regression:playground       # CLI render (needs wp-load.php)
WPDEV_REGRESSION_TRUST_CLI=1 composer regression:playground:http  # full HTTP HTML (Docker recommended)
```

Included in `composer regression:p2` when `wp-load.php` is reachable on the host.

## Notes

Record date, environment, and any failures below.

| Date | Tester | Result |
|------|--------|--------|
| 2026-05-28 | CLI + HTTP regression | 9/9 network reference pages pass (`regression-network-admin-http.php`); dashboard (`page=wpdev`) is site-admin only |
