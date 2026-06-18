# Form Builder (`form-builder`)

## Overview

Modal/ajax form registration and rendering bridge that wraps legacy `Form_Manager` behind service-aware helpers.

## Standalone usage

```php
wpdev_load_module( 'form-builder' );
```

Declared dependencies: `core`, `field-builder`.

## Lifecycle

- Registered in `setup.php` with `Module_Loader::register( 'form-builder', ... )`.
- Component registry initializes during module bootstrap.
- Forms are typically registered on `wpdev_load` and rendered on ajax requests.

## Public API

### `wpdev_form_api`

```php
wpdev_form_api(): Form_Service|Form_Manager
```

Returns the active form service (preferred) or legacy manager fallback. @since 2.5.0

### `wpdev_register_form`

```php
wpdev_register_form( string $form_id, array $atts = [] ): void
```

Register a form definition (fields, handler, modal/inline flags). Duplicate ids without replace semantics trigger `_doing_it_wrong`. @since 2.0.0

**Common `$atts` keys:** `title`, `fields`, `handler`, `capability`, `modal`, `inline`.

### `wpdev_get_form_url`

```php
wpdev_get_form_url( string $form_id, array $atts = [], bool $inline = false ): string
```

Build form endpoint URL for modal or inline rendering. Returns empty string when form is unknown. @since 2.0.0

### `wpdev_modal_open`

```php
wpdev_modal_open( string $form_id, array $args = [] ): string
```

Returns HTML/JS snippet to open a Wubox modal for the given form. @since 2.5.0

### `wpdev_register_ajax_modal`

```php
wpdev_register_ajax_modal( string $id, callable $callback, array $args = [] ): void
```

Register ajax-backed modal transport with standardized envelope. @since 2.8.0

### `wpdev_ajax_modal_url`

```php
wpdev_ajax_modal_url( string $id, array $args = [] ): string
```

Resolve ajax modal URL for registered modal id. @since 2.8.0

### `wpdev_render_entity_list_modal`

```php
wpdev_render_entity_list_modal( array $entities, array $args = [] ): void
```

Render pick-from-list modal UI for entity selection flows. @since 2.8.0

### `add_wubox`

```php
add_wubox(): void
```

Enqueue Wubox modal assets when a page uses modal forms. @since 2.0.0

**Error modes:** unknown form ids yield empty URLs; ajax handlers should respond with `wpdev_ajax_error_*` helpers from core.

## Hooks and filters

- `wpdev_{form_id}_form_atts` filters merged form attributes.
- `wpdev_{form_id}_form_fields` filters runtime form fields.
- Modal transport uses core ajax hooks (`wpdev_ajax_*`, `wpdev_ajax_nopriv_*`) through services.

## Storage and option keys

- No module-owned production options.
- Playground demo persists entries in `pg_demo_form_entries` (or plain option fallback outside sandbox helpers).

## Capabilities and context

- Capability checks are enforced by form definitions/handlers (via core form service and manager).
- Forms can run in modal (`wubox`) or inline mode depending on `wpdev_get_form_url(..., $inline = true)`.

## Registration and menu context

- No production admin menu registrations in this module.
- Forms are consumed by admin pages, widgets, and metabox flows from other modules.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-form-builder`
- Panel slug: `wpdev-pg-form-builder`
- Setup: `wpdev_playground_register_form_builder_demos()`
- Render callback: `wpdev_render_form_builder_playground_demo()`
- Acceptance markers: `wpdev-playground-form-inline`, `wpdev-playground-form-modal`, `pg_demo_form`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — register a modal/ajax form via Form_Service
- [`examples/example-02.php`](examples/example-02.php) — modal bulk confirm via Modal_Service
- [`examples/example-03-payment-modal.php`](examples/example-03-payment-modal.php) — "Add Payment" modal form with an AJAX products field (K2-04)

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-form-builder/playground.php`
- Helpers: `wpdev-playground/playground-form-builder/functions-playground-form.php`
- Admin URL: `admin.php?page=wpdev-pg-form-builder`
- Acceptance markers: `wpdev-playground-form-inline`, `wpdev-playground-form-modal`, `pg_demo_form`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/checkout/setup.php` — checkout modal forms and signup flows
- `wpdev-examples/payments/setup.php` — payment modal forms
- `wpdev-examples/metabox-post-type/setup.php` — CPT edit metabox forms

## Recipes

- Register a form in `wpdev_load`, then open with `wpdev_modal_open( 'my_form' )`.
- Keep display and persistence separate: UI fields in form config, save logic in ajax handler.
- Use inline mode (`wpdev_get_form_url(..., true)`) for embedded admin snippets.

## Migration

- Continue using `wpdev_register_form()`; it transparently routes to `Form_Service` when available and falls back to legacy `Form_Manager`.
- Avoid direct calls to old manager internals in new modules.
