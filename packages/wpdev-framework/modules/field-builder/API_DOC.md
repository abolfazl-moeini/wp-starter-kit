# Field Builder (`field-builder`)

## Overview

Field type registry and view-resolution helpers used by settings, admin-page, metabox, and checkout UIs.

## Standalone usage

```php
wpdev_load_module( 'field-builder' );
```

Declared dependencies: `core`.

## Lifecycle

- Module registration happens in `setup.php` via `Module_Loader::register( 'field-builder', ... )`.
- Default field types are registered during module bootstrap.
- Consumers usually register custom field types on `wpdev_load`.

## Public API

### `wpdev_register_field_type`

```php
wpdev_register_field_type( string $type, array $config = [], bool $replace = true ): bool
```

Register a field type template. Config typically includes `class`, `sanitize`, and view hints. @since 2.7.0

### `wpdev_get_field_type` / `wpdev_has_field_type` / `wpdev_list_field_types` / `wpdev_unregister_field_type`

Registry CRUD helpers. `wpdev_get_field_type()` returns config array or `null`. @since 2.7.0

### `wpdev_field_view_context_map`

```php
wpdev_field_view_context_map(): array
```

Returns map of contexts (`settings`, `admin`, `checkout`, `frontend`) to view roots. Filter: `wpdev_field_view_context_map`. @since 2.6.0

### `wpdev_field_view`

```php
wpdev_field_view( string $context, string $type ): string
```

Resolve view template path for a field type in a context. Falls back via `wpdev_field_view_fallback()`. @since 2.6.0

### `wpdev_checkout_field_view`

```php
wpdev_checkout_field_view( string $type ): string
```

Shortcut for checkout signup field templates. @since 2.6.0

**Extension:** subclass `WPDevFramework\Form\Base_Field_Template` and register with `wpdev_register_field_type()`.

## Hooks and filters

- `wpdev_field_view_context_map` filters context-to-view mapping.
- `wpdev_field_validate_{type}` customizes field sanitization per type.
- `wpdev_settings_fields_sanitization_rules` extends settings sanitization rules.
- `wpdev_checkout_signup_field_args` adapts signup field payloads before rendering.

## Storage and option keys

- No module-specific persistent store.
- Field values are persisted by caller modules (`settings-panel-builder`, model handlers, or form handlers).

## Capabilities and context

- No direct capability gate in the registry API.
- Capabilities are enforced by consuming pages/forms that render or save fields.
- Supported view contexts are `settings`, `admin`, `checkout`, and `frontend`.

## Registration and menu context

- This module does not register production admin menus/pages.
- It provides field components and view templates consumed by other modules.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-field-builder&pg_field_context=admin`
- Panel slug: `wpdev-pg-field-builder`
- Render callback: `wpdev_render_field_builder_playground_gallery()`
- Dependencies in panel flow: `core`, `form-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-field-gallery`, `wpdev-modal-form`, `Save Settings`, `postbox`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — register a field type with sanitize/validate hooks
- [`examples/example-01-text-field.php`](examples/example-01-text-field.php) — register a text field type and render via admin field template
- [`examples/example-02.php`](examples/example-02.php) — advanced field-builder pattern
- [`examples/example-02-model-field.php`](examples/example-02-model-field.php) — ajax model field (selectizer) for admin forms

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-field-builder/playground.php`
- Helpers: `wpdev-playground/playground-field-builder/functions-playground-fields.php`
- Admin URL: `admin.php?page=wpdev-pg-field-builder&pg_field_context=admin`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-field-gallery`, `wpdev-modal-form`, `Save Settings`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — edit-page fields and product metaboxes
- `wpdev-examples/checkout/setup.php` — checkout/signup field types
- `wpdev-examples/metabox-post-type/setup.php` — custom post type field widgets
- `wpdev-examples/payments/setup.php` — payment modal fields and edit-page field wiring

## Recipes

- Register a custom type with `wpdev_register_field_type()` and a `sanitize` callback.
- Resolve templates with `wpdev_field_view( 'admin', 'text' )` instead of hardcoded paths.
- Override sanitization for one type using `add_filter( 'wpdev_field_validate_{type}', ... )`.

## Migration

- 2.7.0 introduced uniform `wpdev_register_*`/`wpdev_get_*`/`wpdev_list_*` facades.
- Prefer registry facades over direct static calls to `Field_Type_Registry`.
