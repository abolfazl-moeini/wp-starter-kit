# Playground module inventory

Status: **core parity complete** — 14 core modules use `Playground_Contract` metadata, acceptance markers, and production API render paths; validated by `regression-playground.php` (CLI render) and expanded HTTP checks.

| Entry | URL | Notes |
|-------|-----|-------|
| Landing index | `admin.php?page=wpdev-playground` | Grouped links to all registered panels (core / WaaS / extensions) |

| Group | Modules | Demo style |
|-------|---------|------------|
| Core | `core` | Service health + panel registry overview |
| Builders | `field-builder`, `form-builder`, `menu-builder`, `table-builder`, `tab-navigation`, `admin-page-builder`, `settings-panel-builder`, `admin-widget-builder` | Field gallery, form inline/modal, pg menu tree, interactive table (add/edit), tabs, template cards, settings shell, dashboard widget grid |
| Examples | `admin-setting-page`, `admin-custom-page`, `metabox-builder`, `metabox-post-type`, `wizard` | Settings shell, dashboard grid + filters, metabox registry host, post edit host, wizard steps |
| WaaS | `wpdev-*` (19 modules) | Fixture list tables via `wpdev_render_playground_list_preview()` (skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1`); `API_DOC.md` Playground sections via `composer sync:playground-api-doc` |

## Core-only mode

Set `WPDEV_PLAYGROUND_CORE_ONLY=1` (or define `WPDEV_PLAYGROUND_CORE_ONLY` in wp-config) to load only the 14 core module playgrounds.

## Per-panel contract

Each panel may declare:

- `group`, `requires_modules`, `assets`, `acceptance_markers`, `self_contained`
- Defaults are applied in `Playground_Contract` when omitted.

Regenerate: `composer scaffold:modules` · Audit: `composer audit:playground`, `composer audit:playground-api-doc` · Sync API docs: `composer sync:playground-api-doc` · Tests: `PlaygroundDemosAcceptanceTest`, `PlaygroundContractTest`, `PlaygroundMenuTest`

CLI regression (all core markers): `WPDEV_PLAYGROUND_RUN=1 php bin/regression-playground.php`

Optional env flags:

| Flag | Effect |
|------|--------|
| `WPDEV_PLAYGROUND_CORE_ONLY=1` | Load only 14 core playgrounds (`composer regression:playground:core-only`) |
| `WPDEV_PLAYGROUND_AJAX_HTTP=1` | HTTP probe for `pg_playground_ping` / `pg_form_demo_save` (`composer regression:playground:http:full`) |
| `WPDEV_PLAYGROUND_HTTP_WAAS=1` | Also HTTP-check WaaS samples: `wpdev-products`, `wpdev-customer-panel`, `wpdev-payments` (18 pages with core HTTP bundle) |
