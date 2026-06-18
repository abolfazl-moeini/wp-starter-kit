# Table Builder

The `table-builder` module registers list-table classes and shared list-table
helpers. It is intentionally lightweight and depends only on `core` and
`tab-navigation`.

Raw API reference: [`../../../modules/table-builder/API_DOC.md`](../../../modules/table-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Register a reusable list-table class.
- Render tables inside list admin pages or metabox widgets.
- Use shared bulk-action pipeline hooks.
- Build interactive playground table demos.

## Loading

```php
wpdev_load_module( 'table-builder' );
```

Declared dependencies: `core`, `tab-navigation`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_list_table( $table_id, $class_name, $config = null, $replace = true )` | Register a list table class and optional config. |
| `wpdev_get_list_table( $table_id )` | Return the registration entry. |
| `wpdev_has_list_table( $table_id )` | Check whether a table is registered. |
| `wpdev_list_list_tables()` | List registered list tables. |
| `wpdev_unregister_list_table( $table_id )` | Remove a table registration. |
| `wpdev_render_table_builder_fixture_list_table( $module_id )` | Render fixture list table for playground. |
| `wpdev_render_playground_list_table( $module_id )` | Render playground list table. |

## Example: Register A List Table

```php
wpdev_on_load(
	static function () {
		wpdev_register_list_table(
			'my_products',
			\WPDevFramework\List_Tables\Product_List_Table::class
		);
	}
);
```

## Example: Minimal List Table Class

```php
class My_Product_List_Table extends \WPDevFramework\List_Tables\Base_List_Table {
	public function get_columns() {
		return array(
			'name'   => __( 'Name', 'wpdev' ),
			'status' => __( 'Status', 'wpdev' ),
		);
	}

	protected function column_name( $item ) {
		return esc_html( $item->get_name() );
	}

	protected function user_can_ajax_refresh() {
		return current_user_can( 'wpdev_read_products' );
	}
}
```

## Example: Hook Bulk Pipeline

```php
add_action(
	'wpdev_bulk_pipeline_before_process',
	static function ( array $context ) {
		if ( ! current_user_can( 'manage_network' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'wpdev' ) );
		}
	}
);
```

## References

### Module-local examples

- [`modules/table-builder/examples/example-01.php`](../../../modules/table-builder/examples/example-01.php) — list admin page table (context: page). Pattern used by wpdev-* list pages (products, domains, payments, …).
- [`modules/table-builder/examples/example-02.php`](../../../modules/table-builder/examples/example-02.php) — widget list table on an edit page (context: widget). Pattern used by customer-panel and edit-page metabox widgets.

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-table-builder/playground.php`
- Helpers: `wpdev-playground/playground-table-builder/functions-playground-table-interactive.php`
- Admin URL: `admin.php?page=wpdev-pg-table-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-table-interactive`, `wpdev-playground-table-add`, `wp-list-table`, `pg_demo_table`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/src/tables/class-product-list-table.php` — `Product_List_Table`
- `wpdev-examples/webhooks/src/tables/class-webhook-list-table.php` — `Webhook_List_Table`
- `wpdev-examples/events/src/tables/class-event-list-table.php` — `Event_List_Table` with declarative views

## Example: From production code

From `wpdev-examples/products/src/admin/class-product-list-admin-page.php` — `table()` returns `\WPDevFramework\List_Tables\Product_List_Table`, whose `'views'` config drives the list-table tabs.

## Notes

- `wpdev_register_table()` is a DB table registration API from core/domain storage, not the list-table UI registry.
- Override `user_can_ajax_refresh()` for customer-facing or non-network contexts.
- Keep heavy queries out of templates; use query classes/managers.

