# WPDev Module API Contract

## Lifecycle (uniform)

| Hook | Use |
|------|-----|
| `wpdev_init` | Service boot, early singletons |
| `wpdev_load` | Register entities via `wpdev_register_*` — use `wpdev_on_load()` |
| `wpdev_admin_pages` | Instantiate admin page classes — use `wpdev_on_admin_pages()` |
| `wpdev_register_forms` | Ajax modal forms |

## Standalone module load

```php
// Core must be registered first (via modules/core/setup.php).
wpdev_load_module( 'metabox-builder' );
```

`Module_Loader` auto-resolves declared dependencies from each module's `setup.php`.

## Uniform registry facade pattern

Each entity exposes:

- `wpdev_register_{entity}( $id, array $config = [], $replace = true )`
- `wpdev_get_{entity}( $id )`
- `wpdev_has_{entity}( $id )`
- `wpdev_list_{entity}()`
- `wpdev_unregister_{entity}( $id )`

Metaboxes use `( $page_id, $metabox_id, $config )` because they are scoped per admin page.

## Collision policy

- Duplicate ids without `$replace = true` trigger `_doing_it_wrong`.
- Ids are sanitized with `sanitize_key()`.

## Per-module docs

Each module provides:

- `playground.php` — TLDR quick start beside `setup.php`
- `API_DOC.md` — full public API reference

## Playground demo menu (dev-only)

Opt in from `wp-config.php` **or** the companion sample plugin in `examples/wpdev-playground-sample/` (defines the constant on `plugins_loaded` priority 1; core boots the loader on priority 4):

```php
define( 'WPDEV_PLAYGROUND_RUN', true );
```

When enabled:

1. `Playground_Loader` in **core** includes every `modules/*/playground.php` on `wpdev_modules_loaded`.
2. Each playground calls `wpdev_register_playground_panel( $module_id, $args )`.
3. On `wpdev_load`, core registers **one** top-level menu `wpdev-playground` (“WPDev Playground”) and one submenu per panel via **menu-builder** (`wpdev_register_menu_top` / `wpdev_register_menu_child`).

**Site admin only:** top-level and all submenus pass `'network' => false`. The playground menu must **never** appear in network admin.

Panel types:

| `type` | Behavior |
|--------|----------|
| `render` | Optional `setup` registers `pg_*` sandbox entities; `render` outputs a **self-contained** UI demo (settings shell, list table, field gallery, etc.) |
| `info` | Compact notice panel (legacy); prefer `render` for new demos |

Shared helpers (core / table-builder):

- `wpdev_playground_register_settings_demo_sections()` — multi-tab `pg_*` settings sections
- `wpdev_render_settings_panel_playground()` — settings shell (sidebar tabs + fields)
- `wpdev_render_playground_list_table( $module_id )` — list table with fixture rows (`Playground_Fixtures`)
- `wpdev_render_playground_list_preview( $module_id )` — WaaS read-only list previews
- `wpdev_playground_seed_option( $key, $value )` / `wpdev_playground_get_option()` — sandbox options prefixed with `pg_`

Panel arg `hide_title` — set on full-page demos (e.g. settings shell) so the loader does not print a duplicate `<h1>`.

Without `WPDEV_PLAYGROUND_RUN`, playground files return early and no menus or panels are registered.

Regenerate panel blocks: `php bin/generate-module-scaffolds.php` (descriptors in `bin/playground-demo-hints.php`).

Inventory: `docs/modularization/playground-inventory.md`
