# Metabox Builder (`metabox-builder`)

## Overview

Registry and helpers for attaching field/list-table widgets to admin edit screens as metaboxes.

## Standalone usage

```php
wpdev_load_module( 'metabox-builder' );
```

Declared dependencies: `core`, `form-builder`, `field-builder`, `tab-navigation`, `table-builder`.

## Lifecycle

- Module boot registers component and metabox registries.
- Registry emits `wpdev_metabox_register` during initialization.
- Consumers usually register boxes on `wpdev_load`.

## Public API

### Metabox registry

```php
wpdev_register_metabox( string $page_id, string $metabox_id, array $config = [], bool $replace = true ): bool
wpdev_get_metabox( string $page_id, string $metabox_id ): ?array
wpdev_has_metabox( string $page_id, string $metabox_id ): bool
wpdev_list_metaboxes( string $page_id = '' ): array
wpdev_unregister_metabox( string $page_id, string $metabox_id ): void
```

Attach field widgets, list tables, or custom render callbacks to edit admin pages. @since 2.7.0

**Config keys:** `title`, `callback`, `fields`, `table`, `capability`, `context`, `priority`.

## Hooks and filters

- `wpdev_metabox_register` fires when metabox registry initializes.
- `wpdev_edit_admin_page_labels` can customize labels in edit-page implementations.
- Edit-page widget integrations can attach list-table query filters via `wpdev_{table}_get_items`.

## Storage and option keys

- No module-owned production option keys.
- Metabox definitions are in-memory registry entries.
- Playground demo stores sandbox metadata in `pg_metabox_builder_*` option keys.

## Capabilities and context

- Capability checks are applied by host admin pages and widgets, not by the registry facade itself.
- Designed for admin edit contexts and works with both field and table widgets.

## Registration and menu context

- Does not register menus directly.
- Intended to be consumed by edit/admin pages from `admin-page-builder` and example modules.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-metabox-builder`
- Panel slug: `wpdev-pg-metabox-builder`
- Setup: `wpdev_metabox_builder_playground_register_demos()`
- Render callback: `wpdev_render_metabox_builder_playground_host()`
- Markers: `wpdev-playground-metabox-registry`, `postbox`, `titlediv`
- Acceptance markers: `wpdev-playground-metabox-registry`, `postbox`, `titlediv`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — metabox-builder usage (see README)
- [`examples/example-02.php`](examples/example-02.php) — advanced metabox-builder pattern

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-metabox-builder/playground.php`
- Helpers: `wpdev-playground/playground-metabox-builder/functions-playground-metabox.php`
- Admin URL: `admin.php?page=wpdev-pg-metabox-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-metabox-registry`, `metabox-holder`, `poststuff`, `postbox`, `titlediv`
- Extra panel (CPT edit flow): `wpdev-playground/playground-metabox-post-type/playground.php` — `admin.php?page=wpdev-pg-metabox-post-type`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — product edit-page metaboxes
- `wpdev-examples/sites/setup.php` — site edit widgets
- `wpdev-examples/metabox-post-type/setup.php` — custom post type metabox demo

## Recipes

- Register a metabox with `wpdev_register_metabox()` and provide `render` callback + placement keys.
- Embed list tables in metaboxes for edit-page side-by-side workflows.
- Use per-page ids to avoid collisions across edit screens.

## Migration

- Use facade functions instead of direct `Metabox_Registry` static access.
- Keep host-page behavior in page classes, and keep this module focused on metabox definitions.
