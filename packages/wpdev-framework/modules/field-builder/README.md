# field-builder

Admin field types, sanitization contract, and view resolution for settings, admin, and checkout contexts.

## Dependencies

core

## Quick start

```php
add_action( 'wpdev_load', function () {
	wpdev_register_field_type( 'my_text', array(
		'label'    => __( 'My field', 'my-plugin' ),
		'sanitize' => 'sanitize_text_field',
		'view'     => 'admin/text',
	) );
} );
```

## Docs

- API: [`API_DOC.md`](API_DOC.md)
- Guide: [`../../docs/framework/modules/field-builder.md`](../../docs/framework/modules/field-builder.md)
- Snippets: [`examples/`](examples/)
