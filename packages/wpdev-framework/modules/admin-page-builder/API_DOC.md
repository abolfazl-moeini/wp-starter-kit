# Admin Page Builder (`admin-page-builder`)

## Overview

Admin page composition module. It registers shared page templates/components and helper functions used by WaaS/admin modules to render list, edit, dash, settings, and custom page layouts.

## Standalone usage

```php
wpdev_load_module( 'admin-page-builder' );
```

**Declared dependencies:** `core`, `menu-builder`, `tab-navigation`, `metabox-builder`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Register page templates/components and lifecycle callbacks |
| `wpdev_admin_pages` | Consumed by modules instantiating admin page classes built on this module |
| `wpdev_init` | Early bootstrap helpers used by page classes |

## Public API

### `wpdev_register_page_template`

```php
wpdev_register_page_template( string $layout_type, string $view_path, bool $replace = true ): bool
```

Register layout template for list/edit/wizard/settings/dash pages. @since 2.7.0

### `wpdev_resolve_page_template` / `wpdev_has_page_template` / `wpdev_list_page_templates` / `wpdev_unregister_page_template`

Template registry helpers used by `Base_Admin_Page` subclasses. @since 2.7.0

### `wpdev_wrap_use_container`

```php
wpdev_wrap_use_container(): bool
```

Whether admin page wrap should use container chrome. @since 2.0.0

### `wpdev_responsive_table_row`

```php
wpdev_responsive_table_row( array $args = [], array $first_row = [], array $second_row = [] ): string
```

Render responsive two-row table markup helper. @since 2.0.0

### Page detection helpers

- `wpdev_is_registration_page()`, `wpdev_is_update_page()`, `wpdev_is_new_site_page()`, `wpdev_is_login_page()` — @since 2.0.x
- `wpdev_guess_registration_page()` — @since 2.1.0
- `wpdev_enqueue_legacy_admin_tabs()` — @since 2.6.0

**Base classes:** extend `List_Admin_Page`, `Edit_Admin_Page`, or `Base_Admin_Page` from this module. See [`docs/api/framework-primitives.md`](../../docs/api/framework-primitives.md).

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_edit_admin_page_labels` | `array $labels, Base_Admin_Page $page` | Override default edit-page heading/button labels |
| `wpdev_page_added` | `string $page_slug, Base_Admin_Page $page` | Runs after a page class is registered |
| `wpdev_dashboard_display_widgets` | `string $tab, array $widgets` | Controls widget payload rendered in dash templates |
| `wpdev_admin_page_before_custom_render` | `Base_Admin_Page $page` | Before custom layout callback rendering |
| `wpdev_admin_page_after_custom_render` | `Base_Admin_Page $page` | After custom layout callback rendering |

## Storage and option keys

- No module-specific option key is owned by this module.
- Template/layout registries are in-memory and rebuilt during bootstrap (`Page_Template_Registry`, `Component_Registry`).

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| Inherited from each page class | `network`, `admin`, or `both` | Any page class extending `Base_Admin_Page` |
| `manage_network` (common default in WaaS pages) | Network admin | Most WaaS list/edit pages using these templates |

## Registration and menu context

`setup.php` registers the module and template registry defaults (`list`, `edit`, `wizard`, `settings`, `dash`, `addons`, `custom`). Modules typically register pages with `wpdev_register_module_admin_pages(...)` and can re-register production pages in alternate menus through `wpdev_register_admin_page(...)` with `parent`/`context` overrides.

## Playground

| | |
|--|--|
| **Mode** | `production parity` via page re-registration, plus optional sandbox panels |
| **Admin URL** | `admin.php?page=wpdev-pg-admin-page-builder` |
| **Panel / page slug** | `wpdev-pg-admin-page-builder` |
| **Render** | `wpdev_render_playground_page_builder_demos()` |
| **Requires modules** | `core`, `menu-builder`, `tab-navigation`, `metabox-builder` |
| **Acceptance markers** | `wpdev-styling`, `wpdev-playground-page-template`, `wpdev-playground-list-shell`, `nav-tab-wrapper`, `wpdev-playground-settings-shell`, `pg_custom` |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — register page layout templates
- [`examples/example-02.php`](examples/example-02.php) — advanced admin-page-builder pattern

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-admin-page-builder/playground.php`
- Helpers: `wpdev-playground/playground-admin-page-builder/functions-playground-pages.php`, `wpdev-playground/playground-admin-page-builder/functions-playground-templates.php`
- Admin URL: `admin.php?page=wpdev-pg-admin-page-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-page-template`, `wpdev-playground-list-shell`, `nav-tab-wrapper`, `wpdev-playground-settings-shell`, `pg_custom`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — product list/edit admin page classes
- `wpdev-examples/sites/setup.php` — site list/edit pages
- `wpdev-examples/customers/setup.php` — customer admin pages

## Recipes

- Build a list/edit pair with shared template chrome and per-page content callbacks.
- Re-register an existing production page under a custom menu using `wpdev_register_admin_page(...)`.
- Migrate legacy tab pages to template-backed layouts while preserving hooks.

## Migration

- 2.7.0 introduced page-template registry facades (`wpdev_register_page_template`, `wpdev_list_page_templates`, etc.).
- Prefer registry helpers and template keys over hardcoded view paths in page classes.
