# form-builder

Inline and modal (Wubox) forms with ajax registration and field-builder integration.

## Dependencies

core, field-builder

## Quick start

```php
add_action( 'wpdev_register_forms', function () {
	wpdev_register_form( 'my_inline_form', array(
		'access' => 'my_plugin.forms.submit', // Two-Gate access check (wpdev_can)
		'fields' => array( /* … */ ),
		'submit' => 'my_save_handler',
	) );
} );
```

## Docs

- API: [`API_DOC.md`](API_DOC.md)
- Guide: [`../../docs/framework/modules/form-builder.md`](../../docs/framework/modules/form-builder.md)
- Snippets: [`examples/`](examples/)
