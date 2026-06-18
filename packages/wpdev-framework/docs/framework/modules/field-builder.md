# Field Builder

The `field-builder` module provides the field type registry and view resolution
used by settings, admin pages, metaboxes, forms, and checkout fields.

Raw API reference: [`../../../modules/field-builder/API_DOC.md`](../../../modules/field-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Register a reusable field type.
- Resolve the correct template for a field in `settings`, `admin`, `checkout`, or `frontend` context.
- Attach sanitization behavior to a field type.
- Keep field rendering consistent across builders.

## Loading

```php
wpdev_load_module( 'field-builder' );
```

Declared dependencies: `core`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_field_type( $type, $config = array(), $replace = true )` | Register a field type. |
| `wpdev_get_field_type( $type )` | Return field type config or `null`. |
| `wpdev_has_field_type( $type )` | Check whether a type exists. |
| `wpdev_list_field_types()` | List all field type registrations. |
| `wpdev_unregister_field_type( $type )` | Remove a type from the registry. |
| `wpdev_field_view_context_map()` | Return context-to-view-root map. |
| `wpdev_field_view( $context, $type )` | Resolve a template path for a field type. |
| `wpdev_checkout_field_view( $type )` | Shortcut for checkout field templates. |

## Example: Register A Custom Field Type

```php
wpdev_on_load(
	static function () {
		wpdev_register_field_type(
			'my_slug',
			array(
				'sanitize' => 'sanitize_key',
				'view'     => 'admin-pages/fields/text',
			)
		);
	}
);
```

## Example: Resolve A Field Template

```php
$template = wpdev_field_view( 'admin', 'text' );

wpdev_get_template(
	$template,
	array(
		'id'    => 'my_field',
		'name'  => 'my_field',
		'value' => '',
	)
);
```

## Example: Customize Sanitization

```php
add_filter(
	'wpdev_field_validate_my_slug',
	static function ( $value ) {
		return sanitize_key( $value );
	}
);
```

## References

### Module-local examples

- [`modules/field-builder/examples/example-01.php`](../../../modules/field-builder/examples/example-01.php) — register a field type with sanitize/validate hooks
- [`modules/field-builder/examples/example-01-text-field.php`](../../../modules/field-builder/examples/example-01-text-field.php) — register a text field type and render via admin field template
- [`modules/field-builder/examples/example-02.php`](../../../modules/field-builder/examples/example-02.php) — advanced field-builder pattern
- [`modules/field-builder/examples/example-02-model-field.php`](../../../modules/field-builder/examples/example-02-model-field.php) — ajax model field (selectizer) for admin forms

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-field-builder/playground.php`
- Helpers: `wpdev-playground/playground-field-builder/functions-playground-fields.php`
- Admin URL: `admin.php?page=wpdev-pg-field-builder&pg_field_context=admin`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-field-gallery`, `wpdev-modal-form`, `Save Settings`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — product edit-page fields
- `wpdev-examples/checkout/setup.php` — checkout/signup field types
- `wpdev-examples/metabox-post-type/setup.php` — custom post type field widgets
- `wpdev-examples/payments/setup.php` — payment modal fields and edit-page field wiring

## Example: From production code

From `wpdev-playground/playground-field-builder/playground.php` — registers the field gallery panel and calls `wpdev_render_field_builder_playground_gallery()` when `WPDEV_PLAYGROUND_DIR` is defined.

## Notes

- The registry does not save field values. The caller saves values through settings, forms, or model handlers.
- Capability checks belong to the consuming page/form, not the field registry.
- Prefer `wpdev_field_view()` over hardcoded view paths.

