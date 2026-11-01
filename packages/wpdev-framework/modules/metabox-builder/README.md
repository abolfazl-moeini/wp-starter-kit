# metabox-builder

Edit-page metabox and widget registry with scoped registration per admin page.

## Dependencies

core, form-builder, field-builder, tab-navigation, table-builder

## Quick start

```php
add_action( 'wpdev_load', function () {
	wpdev_register_metabox( 'my_edit_page', 'my_details', array(
		'title'  => __( 'Details', 'my-plugin' ),
		'fields' => array( /* … */ ),
	) );
} );
```

## Docs

- API: [`API_DOC.md`](API_DOC.md)
- Guide: [`../../docs/framework/modules/metabox-builder.md`](../../docs/framework/modules/metabox-builder.md)
