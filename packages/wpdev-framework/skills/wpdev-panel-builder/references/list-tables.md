# List tables

Two layers — do not confuse them.

| Layer | API | Purpose | Where |
|-------|-----|---------|-------|
| **DB table** | `wpdev_register_table()` | Schema, dbDelta | `setup.php` |
| **Admin list table** | `new My_List_Table()` in `table()` | WP_List_Table UI | List page class |

Optional global UI: `wpdev_register_list_table()` — see [api-cookbook.md](api-cookbook.md). Domain CRUD uses direct instantiation.

## Base_List_Table

**File:** `@framework/modules/table-builder/src/table/class-base-list-table.php`  
**Namespace:** `WPDevFramework\List_Tables\Base_List_Table`

### Key property

```php
protected $query_class = '\\WPDevFramework\\Database\\Products\\Product_Query';
```

### Constructor

```php
parent::__construct( array(
    'singular' => __( 'Product', 'wpdev' ),
    'plural'   => __( 'Products', 'wpdev' ),
    'ajax'     => true,
    'add_new'  => array( 'url' => wpdev_network_admin_url( 'wpdev-edit-product' ) ),
) );
```

### Declarative config

```php
public static function declarative_table_config() {
    return self::declarative_schema(
        array( 'cb', 'name', 'type', 'id' ),
        array(
            'empty_state'  => array( 'sub_message' => '...' ),
            'bulk_confirm' => array( 'delete', 'duplicate' ),
            'actions'      => array( 'column' => 'name', 'items' => array( 'edit', 'delete' ) ),
            'views'        => array( /* tab filters — tab-navigation */ ),
        )
    );
}
```

### Required methods

| Method | Purpose |
|--------|---------|
| `get_columns()` | Column map |
| `column_{key}( $item )` | Cell renderer |
| `column_cb( $item )` | Checkbox |

Row actions:

```php
$this->standard_row_actions_for( $item, '{entity}', 'wpdev-edit-{entity}', array( 'edit', 'delete' ) );
```

### Bulk action hooks

```php
add_filter( 'wpdev_bulk_actions', static function ( $actions, $table ) {
    $actions['export'] = __( 'Export', 'wpdev' );
    return $actions;
}, 10, 2 );

add_action( 'wpdev_process_bulk_action', static function ( $action, $ids, $table ) {
    if ( 'export' === $action ) { /* ... */ }
}, 10, 3 );
```

| Hook | When |
|------|------|
| `wpdev_bulk_actions` | Register bulk actions |
| `wpdev_process_bulk_action` | Process selected rows |
| `wpdev_bulk_pipeline_before_process` | Before pipeline |
| `wpdev_bulk_pipeline_after_process` | After pipeline |
| `wpdev_list_row_actions` | Filter row actions |

## wpdev_register_list_table (optional)

```php
wpdev_register_list_table( 'shared_products', Product_List_Table::class );
```

Use when the same table is referenced from widgets/metaboxes.

## DB table registration

```php
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
```

Table classes extend `WPDevFramework\Database\Engine\Table`.

## Examples

| Path | Notes |
|------|-------|
| `@examples/products/src/tables/class-product-list-table.php` | Production table |
| `@framework/modules/table-builder/examples/example-01.php` | Minimal teaching |
| `@playground/playground-table-builder/playground.php` | Interactive demo |

Admin wiring: [admin-pages.md](admin-pages.md).