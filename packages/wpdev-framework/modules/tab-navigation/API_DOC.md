# Tab Navigation (`tab-navigation`)

## Overview

Shared tab renderer used by list pages, settings shells, wizard-like screens, and ajax tab interfaces.

## Standalone usage

```php
wpdev_load_module( 'tab-navigation' );
```

Declared dependencies: `core`.

## Lifecycle

- Registered through `setup.php`.
- Rendering is runtime-only: callers pass tab arrays when generating page output.

## Public API

- `wpdev_render_tab_navigation( array $tabs, array $options = array() ): void` — @since 2.5.0
- `wpdev_list_table_views_as_tabs( array $views ): array` — @since 2.6.0

## Hooks and filters

- No module-owned filters in function API.
- Downstream consumers often combine this renderer with list-table and settings hooks.

## Storage and option keys

- No storage keys; renderer is stateless.

## Capabilities and context

- Capability gates are expected to be applied before building tab arrays.
- Supports horizontal and vertical tab variants through render options.

## Registration and menu context

- Does not register menus or pages.
- Embedded by `admin-page-builder`, `settings-panel-builder`, and playground screens.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-tab-navigation&pg_tab=async`
- Panel slug: `wpdev-pg-tab-navigation`
- Render callback: `wpdev_render_tab_navigation_playground_demo()`
- Markers: `wpdev-playground-tabs-nav`, `wpdev-playground-tab-async`, `wpdev-playground-tabs-vertical`, `nav-tab-active`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-tabs-nav`, `wpdev-playground-tab-async`, `wpdev-playground-tabs-vertical`, `nav-tab-active`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — render section tabs with Tab_Navigation
- [`examples/example-02.php`](examples/example-02.php) — advanced tab-navigation pattern

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-tab-navigation/playground.php`
- Helpers: `wpdev-playground/playground-tab-navigation/functions-playground-tabs.php`
- Admin URL: `admin.php?page=wpdev-pg-tab-navigation&pg_tab=async`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-tabs-nav`, `wpdev-playground-tab-async`, `wpdev-playground-tabs-vertical`, `nav-tab-active`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module lists `tab-navigation` in its `setup.php` `dependencies`; it is resolved transitively (via `admin-page-builder` / `settings-panel-builder`). List-table `views` render through this module as tabs:

- `wpdev-examples/products/src/tables/class-product-list-table.php` — `'views'` config (All/Plans/Packages/Services) rendered as list-table tabs
- `wpdev-examples/sites/src/tables/class-site-list-table.php` — site list `'views'` rendered as tabs

## Recipes

- Convert list-table views to tabs via `wpdev_list_table_views_as_tabs()`.
- Keep active tab in request (`tab`/`pg_tab`) and pass selected state through tab definitions.
- Use one renderer across modules to keep tab markup and styles consistent.

## Migration

- Replace bespoke tab markup with `wpdev_render_tab_navigation()` for consistent behavior and styling.
