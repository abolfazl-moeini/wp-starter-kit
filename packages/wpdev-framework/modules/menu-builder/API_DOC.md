# Menu Builder (`menu-builder`)

## Overview

Declarative admin menu registration layer used by page modules to define top-level and child menus.

## Standalone usage

```php
wpdev_load_module( 'menu-builder' );
```

Declared dependencies: `core`.

## Lifecycle

- Registered in `setup.php` via `Module_Loader::register( 'menu-builder', ... )`.
- Menu definitions are collected in registry state and wired to WordPress menu hooks as needed.

## Public API

### Menu registry

```php
wpdev_register_menu_page( string $page_slug, array $config = [], bool $replace = true ): bool
wpdev_register_menu_top( string $slug, array $args ): void
wpdev_register_menu_child( string $parent_slug, string $slug, array $args ): void
wpdev_get_menu_page( string $page_slug ): ?array
wpdev_has_menu_page( string $page_slug ): bool
wpdev_list_menu_pages(): array
wpdev_unregister_menu_page( string $page_slug ): void
```

Declarative menu registration consumed by `Base_Admin_Page` and domain modules. Returns `false` on duplicate ids without `$replace`. @since 2.7.0

**Config keys:** `title`, `capability`, `icon`, `position`, `callback`, `parent`.

## Hooks and filters

- Menu registration wiring happens through WordPress `admin_menu` and `network_admin_menu`.
- Menu definitions are consumed by admin-page classes that fire their own lifecycle hooks.

## Storage and option keys

- No module-owned persistent options.
- Registry state lives in runtime memory only.

## Capabilities and context

- Menu args support context-aware registration (`admin`, `network`, `both`).
- Capability is provided per menu definition and enforced by WordPress menu APIs.

## Registration and menu context

- Primary purpose is menu registration; no standalone page rendering.
- Used heavily by `admin-page-builder` and example modules.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-menu-builder`
- Panel slug: `wpdev-pg-menu-builder`
- Render callback: `wpdev_render_menu_builder_playground_preview()`
- Markers: `wpdev-playground-menu-registry`, `pg_demo_menu`, `pg_demo_menu_b`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-menu-registry`, `pg_demo_menu`, `pg_demo_menu_b`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — menu-builder usage (see README)
- [`examples/example-02.php`](examples/example-02.php) — advanced menu-builder pattern

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-menu-builder/playground.php`
- Helpers: `wpdev-playground/playground-menu-builder/functions-playground-menu.php`
- Admin URL: `admin.php?page=wpdev-pg-menu-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-menu-registry`, `pg_demo_menu`, `pg_demo_menu_b`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module lists `menu-builder` directly in its `setup.php` `dependencies`; it is resolved transitively via `admin-page-builder`, whose registered admin page classes drive menu registration.

- `wpdev-examples/products/setup.php` — WaaS admin menu tree via list/edit pages
- `wpdev-examples/sites/setup.php` — sites admin menu registration
- `wpdev-examples/domains/setup.php` — domain mapping admin menus

## Recipes

- Register metadata once with `wpdev_register_menu_page()`.
- Use `wpdev_register_menu_top()` for root entries and `wpdev_register_menu_child()` for descendants.
- Keep capabilities explicit on every menu node for predictable access control.

## Migration

- Use menu-builder APIs instead of ad-hoc direct `add_menu_page` calls in module boot code.
- Keep menu declaration separate from page-class instantiation.
