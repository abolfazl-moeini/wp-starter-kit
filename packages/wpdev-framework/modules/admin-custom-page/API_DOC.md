# Admin Custom Page (`admin-custom-page`)

## Overview

Registers the framework-owned about pages and the top-level admin nav menu
shell. As of 2.8.1 the top-level `wpdev` dashboard page itself is owned
by `wpdev-examples/dashboard` (see the dashboard example's `API_DOC.md`).
This module now only registers `About_Admin_Page`, `About_Admin_Page_Network`,
`Migration_Alert_Admin_Page`, and the top admin-nav menu.

## Standalone usage

```php
wpdev_load_module( 'admin-custom-page' );
```

**Declared dependencies:** `core`, `admin-page-builder`, `admin-widget-builder`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Instantiates the top admin-nav menu helper |
| `wpdev_admin_pages` | Instantiates `About_Admin_Page_Network` and `About_Admin_Page` |
| `wpdev_init` | No module-specific early init beyond dependencies |

The module does **not** instantiate `Top_Level_Admin_Page`. That class
lives in `wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php`
and the dashboard example registers it from its own `setup.php` on
`wpdev_admin_pages`. With the dashboard example missing, the top-level
`wpdev` admin page is not registered — the framework survives.

## Public API

No module-scoped `wpdev_*` functions are declared under `src/functions` for this module.

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_dashboard_widgets` | widgets payload | Registers/render dashboard widget sets |
| `wpdev_dashboard_filter_bar` | filter UI context | Renders dashboard filter controls |
| `wpdev_dashboard_display_filter` | active filter state | Alters dashboard filter selection |
| `wpdev_admin_bar_menu` | menu object/context | Extends WPDev admin-bar shortcuts |
| `wpdev_export_data_table_action` | export action args | Handles dashboard export action integration |

## Storage and option keys

- No module-specific option key declared in `setup.php`.
- Dashboard data storage is delegated to underlying domain modules/widgets.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| `manage_network` | Network admin | About pages (network + base) |
| `wpdev_read_financial` | Dashboard widgets/financial cards | Financial dashboard sections |

## Registration and menu context

`setup.php` instantiates `About_Admin_Page_Network` and `About_Admin_Page` on
`wpdev_admin_pages`. The top-level `wpdev` menu and its first submenu are
registered by `wpdev-examples/dashboard` when that example is loaded.

## Playground

| | |
|--|--|
| **Mode** | about-pages parity (default), sandbox fallback available |
| **Admin URL** | `admin.php?page=wpdev-about` / `admin.php?page=wpdev-about-network` |
| **Panel / page slug** | `wpdev-about`, `wpdev-about-network` |
| **Render** | `WPDevFramework\Admin_Pages\About_Admin_Page{, _Network}` |
| **Requires modules** | `core`, `admin-page-builder`, `admin-widget-builder` |
| **Acceptance markers** | `wpdev-styling` |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

The top-level `wpdev` dashboard is owned by `wpdev-examples/dashboard`; see
that example's playground row for the production dashboard parity panel.

## References

### Module-local examples

*(none — no `modules/admin-custom-page/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-admin-custom-page/playground.php`
- Helpers: `wpdev-playground/playground-admin-widget-builder/functions-playground-widgets.php` (shared widget grid demos)
- Admin URL (sandbox): `admin.php?page=wpdev-pg-admin-custom-page&pg_tab=general`
- Admin URL (parity): `admin.php?page=wpdev-about` / `admin.php?page=wpdev-about-network`; dashboard at `admin.php?page=wpdev`
- Production dashboard parity: `wpdev-playground/playground-wpdev/` (via `Playground_Parity_Registry`)
- Acceptance markers: `wpdev-styling`, `wpdev-playground-custom-page-grid`, `wpdev-dashboard-filters`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/dashboard/setup.php` — owns `Top_Level_Admin_Page` and top-level `wpdev` menu
- `wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php` — production dashboard page class
- `wpdev-examples/admin-custom-page-top-nav/setup.php` — top admin nav extensions
- `wpdev-examples/admin-custom-page-dashboard-widgets/setup.php` — dashboard widget registrations consumed by the dashboard page

## Recipes

- Build a custom top-level dashboard card set using widget-builder datasources.
- Add exports to dashboard tables through export hooks.

## Migration

- Keep page registration in lifecycle hooks and use widget-builder registries for cards.
- Avoid direct ad-hoc markup injection; use dashboard/widget hooks for extensibility.
- The top-level `wpdev` admin page now lives in `wpdev-examples/dashboard`; the
  framework only carries the about pages and the admin-nav helper.
