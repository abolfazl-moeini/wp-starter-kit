# Playground screenshot baseline

Manual browser captures for playground sign-off. Store PNGs in this directory using the filenames below.

## Captured (production parity — 2026-05-31)

| File | Status |
|------|--------|
| `wpdev-playground.png` | Landing index (sandbox + production links) |
| `wpdev.png` | Production dashboard under **WPDev** menu (site admin) |
| `wpdev-settings.png` | Production settings (Taxes tab) |
| `wpdev-products.png` | Production products list table |

Sandbox `wpdev-pg-*` baselines from an earlier pass are also present in this folder.

## Preconditions

- `WPDEV_PLAYGROUND_RUN=1` in `wp-config.php`
- Logged in as site administrator
- Zero console errors on each page

## Production parity (required when parity is enabled)

These pages use **production** slugs under parent `wpdev` (Site Admin → **WPDev**). **WPDev Playground** (`page=wpdev-playground`) is landing + `wpdev-pg-*` sandbox panels only.

| File | URL query |
|------|-----------|
| `wpdev-playground.png` | `page=wpdev-playground` (landing) |
| `wpdev.png` | `page=wpdev` (dashboard) |
| `wpdev-settings.png` | `page=wpdev-settings` |
| `wpdev-addons.png` | `page=wpdev-addons` |
| `wpdev-products.png` | `page=wpdev-products` |
| `wpdev-products-edit.png` | `page=wpdev-products&action=edit&product_id=1` (use a valid ID) |
| `wpdev-payments.png` | `page=wpdev-payments` |
| `wpdev-domains.png` | `page=wpdev-domains` |
| `wpdev-broadcasts.png` | `page=wpdev-broadcasts` |
| `wpdev-customers.png` | `page=wpdev-customers` |

Additional parity modules (checkout, sites, memberships, discount codes, webhooks, events) follow the same `page=wpdev-{module}` pattern.

## Sandbox panels (core builder demos)

| File | URL query |
|------|-----------|
| `wpdev-pg-table-builder.png` | `page=wpdev-pg-table-builder` |
| `wpdev-pg-form-builder.png` | `page=wpdev-pg-form-builder` |
| `wpdev-pg-admin-widget-builder-general.png` | `page=wpdev-pg-admin-widget-builder&pg_tab=general` |
| `wpdev-pg-admin-widget-builder-taxes.png` | `page=wpdev-pg-admin-widget-builder&pg_tab=taxes` |
| `wpdev-pg-field-builder-admin.png` | `page=wpdev-pg-field-builder&pg_field_context=admin` |
| `wpdev-pg-field-builder-settings.png` | `page=wpdev-pg-field-builder&pg_field_context=settings` |
| `wpdev-pg-metabox-builder.png` | `page=wpdev-pg-metabox-builder` |
| `wpdev-pg-metabox-post-type.png` | `page=wpdev-pg-metabox-post-type` |
| `wpdev-pg-tab-navigation.png` | `page=wpdev-pg-tab-navigation` |
| `wpdev-pg-tab-navigation-async.png` | `page=wpdev-pg-tab-navigation&pg_tab=async` |

## WaaS sandbox-only (full mode)

| File | URL query |
|------|-----------|
| `wpdev-pg-wpdev-customer-panel.png` | `page=wpdev-pg-wpdev-customer-panel` |

List/edit WaaS modules with parity enabled use production slugs (`wpdev-products`, etc.) — see table above.

Generate URLs and marker checklists:

```bash
php bin/playground-browser-smoke.php
```

Automated HTTP marker pass (Docker):

```bash
WPDEV_PLAYGROUND_RUN=1 WPDEV_PLAYGROUND_HTTP_FULL=1 WPDEV_REGRESSION_TRUST_CLI=1 php bin/regression-playground-signoff.php
```
