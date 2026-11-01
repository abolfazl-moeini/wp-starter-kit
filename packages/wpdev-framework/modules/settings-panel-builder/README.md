# settings-panel-builder

Settings sections, fields, side panels, and the save pipeline used by production settings pages.

## Dependencies

core, field-builder, form-builder, tab-navigation

## Quick start

```php
add_action( 'wpdev_load', function () {
	wpdev_register_settings_section( 'my_plugin', array(
		'title' => __( 'My Plugin', 'my-plugin' ),
		'order' => 50,
	) );
	wpdev_register_settings_field( 'my_plugin', 'my_option', array(
		'type'  => 'text',
		'title' => __( 'Option', 'my-plugin' ),
	) );
} );
```

## Docs

- API: [`API_DOC.md`](API_DOC.md)
- Guide: [`../../docs/framework/modules/settings-panel-builder.md`](../../docs/framework/modules/settings-panel-builder.md)
- Playground demos: **wpdev-playground** plugin (`playground-settings-panel-builder/`)
