# Table Builder (`table-builder`)

## Overview

List-table registry module for WPDev admin pages, including table registration helpers and playground table render helpers.

## Standalone usage

```php
wpdev_load_module( 'table-builder' );
```

**Declared dependencies:** `core`, `tab-navigation`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Component and list-table registry initialization |
| `wpdev_admin_pages` | Consumed by modules rendering list-table backed admin pages |
| `wpdev_init` | Shared dependency initialization |

## Public API

### `wpdev_register_list_table`

```php
wpdev_register_list_table( string $table_id, string $class_name, ?array $config = null, bool $replace = true ): bool
```

Register a list table class by id. Returns `false` when `$class_name` is missing or id already registered without `$replace`. @since 2.7.0

### `wpdev_get_list_table`

```php
wpdev_get_list_table( string $table_id ): ?string
```

Returns registered class name or `null`. @since 2.7.0

### `wpdev_has_list_table`

```php
wpdev_has_list_table( string $table_id ): bool
```

@since 2.7.0

### `wpdev_list_list_tables`

```php
wpdev_list_list_tables(): array
```

Returns all registrations keyed by sanitized id. @since 2.7.0

### `wpdev_unregister_list_table`

```php
wpdev_unregister_list_table( string $table_id ): void
```

@since 2.7.0

### `wpdev_render_table_builder_fixture_list_table`

```php
wpdev_render_table_builder_fixture_list_table( string $module_id ): void
```

Playground helper: render fixture-backed list table for a module id. @since 2.7.0

### `wpdev_render_playground_list_table`

```php
wpdev_render_playground_list_table( string $module_id ): void
```

Playground helper: render interactive list-table demo panel content. @since 2.7.0

**Extension:** subclass `WPDevFramework\List_Tables\Base_List_Table` (canonical in `modules/table-builder/src/`). Override `get_columns()`, ajax refresh, bulk actions, and `user_can_ajax_refresh()` for custom caps.

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_bulk_actions` | bulk actions array/context | Register or filter table bulk actions |
| `wpdev_process_bulk_action` | action/payload args | Runs bulk-action processing |
| `wpdev_bulk_pipeline_before_process` | pipeline context | Before bulk-action pipeline execution |
| `wpdev_bulk_pipeline_after_process` | pipeline result/context | After bulk-action pipeline execution |
| `wpdev_list_row_actions` | row actions array/context | Filter row actions per item |

## Storage and option keys

- Table-builder does not own a dedicated option namespace.
- Screen options and table state persist through WordPress list-table/screen APIs and consuming modules.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| `manage_options` (default in generic list-table tooling) | Admin/network | Generic bulk/list actions where applicable |
| Page-specific capabilities | Inherited from consuming module pages | All list-table consuming pages |

## Registration and menu context

`setup.php` initializes table component/registry classes and includes list-table function facades. Table registration is usually called on `wpdev_load` from domain modules, then rendered in admin-page classes registered via `wpdev_register_module_admin_pages(...)`.

## Playground

| | |
|--|--|
| **Mode** | `sandbox` panel |
| **Admin URL** | `admin.php?page=wpdev-pg-table-builder` |
| **Panel / page slug** | `wpdev-pg-table-builder` |
| **Render** | `wpdev_render_playground_interactive_table()` |
| **Requires modules** | `core`, `tab-navigation` |
| **Acceptance markers** | `wpdev-styling`, `wpdev-playground-table-interactive`, `wp-list-table` |
| **Core-only** | Available in playground unless core-only policy removes dependent panels |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — list admin page table (context: page). Pattern used by wpdev-* list pages (products, domains, payments, …).
- [`examples/example-02.php`](examples/example-02.php) — widget list table on an edit page (context: widget). Pattern used by customer-panel and edit-page metabox widgets.

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-table-builder/playground.php`
- Helpers: `wpdev-playground/playground-table-builder/functions-playground-table-interactive.php`
- Admin URL: `admin.php?page=wpdev-pg-table-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-table-interactive`, `wpdev-playground-table-add`, `wp-list-table`, `pg_demo_table`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/src/tables/class-product-list-table.php` — `Product_List_Table` definition (registered from `products/setup.php`)
- `wpdev-examples/webhooks/src/tables/class-webhook-list-table.php` — `Webhook_List_Table`
- `wpdev-examples/events/src/tables/class-event-list-table.php` — `Event_List_Table` with declarative views

## Recipes

- Build reusable list-table definitions in domain modules and register them on `wpdev_load`.
- Implement consistent bulk-action pipelines by combining before/process/after hooks.

## Migration

- 2.7.0 introduced uniform registry helper facades for list tables.
- Prefer table registry helpers over direct static registry class calls.
