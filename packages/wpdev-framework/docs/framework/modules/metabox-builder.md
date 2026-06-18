# Metabox Builder

The `metabox-builder` module registers metabox definitions for edit screens. It
bridges field widgets, list-table widgets, and custom callbacks into
`admin-page-builder` edit pages.

Raw API reference: [`../../../modules/metabox-builder/API_DOC.md`](../../../modules/metabox-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Add fields to a WPDev edit page.
- Add a side widget or postbox to an edit screen.
- Embed a list table in an edit-page widget.
- Register edit widgets without modifying the host page class.

## Loading

```php
wpdev_load_module( 'metabox-builder' );
```

Declared dependencies: `core`, `form-builder`, `field-builder`, `tab-navigation`, `table-builder`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_metabox( $page_id, $metabox_id, $config = array(), $replace = true )` | Register a metabox for a page. |
| `wpdev_get_metabox( $page_id, $metabox_id )` | Return one metabox config. |
| `wpdev_has_metabox( $page_id, $metabox_id )` | Check whether a metabox exists. |
| `wpdev_list_metaboxes( $page_id = '' )` | List metaboxes by page or globally. |
| `wpdev_unregister_metabox( $page_id, $metabox_id )` | Remove a metabox. |

## Example: Register A Fields Metabox

```php
wpdev_on_load(
	static function () {
		wpdev_register_metabox(
			'wpdev-edit-product',
			'seo_details',
			array(
				'title'    => __( 'SEO details', 'wpdev' ),
				'context'  => 'normal',
				'priority' => 'default',
				'fields'   => array(
					'seo_title' => array(
						'type'  => 'text',
						'title' => __( 'SEO title', 'wpdev' ),
					),
				),
			)
		);
	}
);
```

## Example: Register A Custom Render Callback

```php
wpdev_register_metabox(
	'wpdev-edit-product',
	'integration_status',
	array(
		'title'    => __( 'Integration status', 'wpdev' ),
		'context'  => 'side',
		'callback' => static function ( $page ) {
			echo '<p>' . esc_html__( 'Connected', 'wpdev' ) . '</p>';
		},
	)
);
```

## References

### Module-local examples

- [`modules/metabox-builder/examples/example-01.php`](../../../modules/metabox-builder/examples/example-01.php) — metabox-builder usage (see README)
- [`modules/metabox-builder/examples/example-02.php`](../../../modules/metabox-builder/examples/example-02.php) — advanced metabox-builder pattern

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-metabox-builder/playground.php`
- Helpers: `wpdev-playground/playground-metabox-builder/functions-playground-metabox.php`
- Admin URL: `admin.php?page=wpdev-pg-metabox-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-metabox-registry`, `metabox-holder`, `poststuff`, `postbox`, `titlediv`
- Extra panel (CPT edit flow): `wpdev-playground/playground-metabox-post-type/playground.php` — `admin.php?page=wpdev-pg-metabox-post-type`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — product edit metaboxes
- `wpdev-examples/sites/setup.php` — site edit widgets
- `wpdev-examples/metabox-post-type/setup.php` — custom post type metabox demo

## Example: From production code

From `wpdev-playground/playground-metabox-builder/playground.php` — registers metabox registry demo on `wpdev_metabox_builder_playground_register_demos()`.

## Notes

- Metabox ids are scoped by page id.
- The host page is responsible for object loading, saving, and capability checks.
- Use `context` and `priority` consistently with WordPress metabox conventions.

