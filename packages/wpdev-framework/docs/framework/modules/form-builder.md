# Form Builder

The `form-builder` module registers and renders modal or inline forms. It wraps
legacy form behavior behind service-aware helpers and integrates with the core
ajax/modal services.

Raw API reference: [`../../../modules/form-builder/API_DOC.md`](../../../modules/form-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Register modal forms for admin actions.
- Generate form URLs for Wubox/modal flows.
- Render inline forms inside admin pages or widgets.
- Register ajax-backed modal content.

## Loading

```php
wpdev_load_module( 'form-builder' );
```

Declared dependencies: `core`, `field-builder`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_form_api()` | Return active form service/manager. |
| `wpdev_register_form( $form_id, $atts = array() )` | Register a form definition. |
| `wpdev_get_form_url( $form_id, $atts = array(), $inline = false )` | Build modal/inline URL for a registered form. |
| `wpdev_modal_open( $form_id, $args = array() )` | Return modal opener markup/snippet. |
| `wpdev_register_ajax_modal( $id, $callback, $args = array() )` | Register ajax modal content. |
| `wpdev_ajax_modal_url( $id, $args = array() )` | Build ajax modal URL. |
| `wpdev_render_entity_list_modal( $entities, $args = array() )` | Render entity picker modal. |
| `add_wubox()` | Enqueue Wubox assets. |

## Example: Register A Modal Form

```php
add_action(
	'wpdev_register_forms',
	static function () {
		wpdev_register_form(
			'archive_product',
			array(
				'title'      => __( 'Archive product', 'wpdev' ),
				'capability' => 'wpdev_edit_products',
				'fields'     => array(
					'product_id' => array(
						'type' => 'hidden',
					),
					'confirm'    => array(
						'type'  => 'toggle',
						'title' => __( 'I understand this action.', 'wpdev' ),
					),
				),
				'handler'    => 'my_archive_product_handler',
			)
		);
	}
);
```

## Example: Open The Form From A Button

```php
$url = wpdev_get_form_url(
	'archive_product',
	array(
		'product_id' => absint( $product_id ),
	)
);

printf(
	'<a class="button wubox" href="%s">%s</a>',
	esc_url( $url ),
	esc_html__( 'Archive', 'wpdev' )
);
```

## Example: Ajax Modal Content

```php
wpdev_register_ajax_modal(
	'product_targets',
	static function ( array $args = array() ) {
		wpdev_render_entity_list_modal(
			array(),
			array(
				'title' => __( 'Targets', 'wpdev' ),
			)
		);
	}
);
```

## References

### Module-local examples

- [`modules/form-builder/examples/example-01.php`](../../../modules/form-builder/examples/example-01.php) — register a modal/ajax form via Form_Service
- [`modules/form-builder/examples/example-02.php`](../../../modules/form-builder/examples/example-02.php) — modal bulk confirm via Modal_Service
- [`modules/form-builder/examples/example-03-payment-modal.php`](../../../modules/form-builder/examples/example-03-payment-modal.php) — "Add Payment" modal form with an AJAX products field (K2-04)

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-form-builder/playground.php`
- Helpers: `wpdev-playground/playground-form-builder/functions-playground-form.php`
- Admin URL: `admin.php?page=wpdev-pg-form-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-form-inline`, `wpdev-playground-form-modal`, `pg_demo_form`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/checkout/setup.php` — checkout modal forms
- `wpdev-examples/payments/setup.php` — payment modal forms
- `wpdev-examples/metabox-post-type/setup.php` — CPT edit metabox forms

## Example: From production code

From `wpdev-playground/playground-form-builder/playground.php` — registers inline and modal form demos on `wpdev_register_forms`.

## Notes

- Verify nonces and capabilities in form handlers.
- Unknown form ids return empty URLs.
- Use core ajax response helpers for save handlers.

