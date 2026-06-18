# Domain CRUD panel (end-to-end recipe)

Build a WaaS domain module like `@examples/products/`. Primary panel type.

Playground panels live in `@playground/` — see [playground.md](playground.md), not in the example folder.

## Directory layout

```
@examples/{folder_slug}/
  setup.php
  API_DOC.md
  README.md
  src/
    admin/
      class-{entity}-list-admin-page.php
      class-{entity}-edit-admin-page.php
    tables/
      class-{entity}-list-table.php
    Models/
      class-{entity}.php
    Database/{entity_plural}/
      class-{entity_plural}-table.php
      class-{entity}-query.php
    managers/
      class-{entity}-manager.php
    functions/
      {entity}.php
```

Reference: `@examples/products/`. Module id `wpdev-products` → folder `@examples/products/`.

## setup.php

```php
<?php
use WPDevFramework\Core\Module_Loader;

defined( 'ABSPATH' ) || exit;

Module_Loader::register( 'wpdev-{folder_slug}', array(
    'path'         => __DIR__,
    'dependencies' => array( 'core', 'admin-page-builder', 'table-builder', 'metabox-builder', 'field-builder' ),
) );

// Register your storage table factory. The Table class is provided by your example (convention: namespace WPDevFramework\Database\{Plural}\ , class {Plural}_Table).
wpdev_register_table( '{entity}_table', \WPDevFramework\Database\{Entities}\{Entities}_Table::class );

wpdev_register_module_admin_pages( 'wpdev-{folder_slug}', array(
    Product_List_Admin_Page::class,
    Product_Edit_Admin_Page::class,
) );

wpdev_boot_module_manager(
    'wpdev-{folder_slug}',
    Product_Manager::class,
    __DIR__ . '/src/managers/class-{entity}-manager.php'
);

add_action( 'wpdev_load', static function () {
    wpdev_require_public_function( '{entity}' );
}, 1 );
```

Signatures: [api-cookbook.md](api-cookbook.md) — `wpdev_register_module_admin_pages`, `wpdev_boot_module_manager`, `wpdev_register_table`.

## List admin page

Extend `List_Admin_Page` (from `WPDevFramework\Admin_Pages`). Define in your example under `src/admin/`. The module autoloader (registered via `Module_Loader::register`) makes `Product_List_Admin_Page::class` resolvable. **Required:** `table()` returns a `Base_List_Table`.

```php
// File: @examples/{folder_slug}/src/admin/class-{entity}-list-admin-page.php
class {Entity}_List_Admin_Page extends List_Admin_Page {

    protected $id = 'wpdev-{folder_slug}';
    protected $type = 'submenu';
    protected $supported_panels = array( 'network_admin_menu' => 'wpdev_read_{entities}' );

    public function get_title() { return __( '{Entities}', 'wpdev' ); }
    public function get_menu_title() { return __( '{Entities}', 'wpdev' ); }

    public function action_links() {
        return array( array(
            'url'   => wpdev_network_admin_url( 'wpdev-edit-{entity}' ),
            'label' => __( 'Add {Entity}', 'wpdev' ),
        ) );
    }

    public function table() {
        return new {Entity}_List_Table();
    }
}
```

Copy: `@examples/products/src/admin/class-product-list-admin-page.php`.

## Edit admin page

Extend `Edit_Admin_Page` (from `WPDevFramework\Admin_Pages`). Define in your example under `src/admin/`. **Required:** `get_object()`.

```php
// File: @examples/{folder_slug}/src/admin/class-{entity}-edit-admin-page.php
class {Entity}_Edit_Admin_Page extends Edit_Admin_Page {

    protected $id = 'wpdev-edit-{entity}';
    protected $type = 'submenu';
    public $object_id = '{entity}';
    protected $parent = 'none';
    protected $highlight_menu_slug = 'wpdev-{folder_slug}';
    protected $supported_panels = array( 'network_admin_menu' => 'wpdev_edit_{entities}' );

    public function get_object() {
        $id = (int) wpdev_request( 'id' );
        if ( $id ) {
            return {Entity}::get( $id );
        }
        return new {Entity}();
    }

    public function register_widgets() {
        parent::register_widgets();
        $this->add_fields_widget( 'general', array(
            'title'  => __( 'General', 'wpdev' ),
            'fields' => array( /* field definitions */ ),
        ) );
    }
}
```

Copy: `@examples/products/src/admin/class-product-edit-admin-page.php` or `@examples/customers/src/admin/class-customer-edit-admin-page.php`.

## List table

Extend `Base_List_Table` (from `WPDevFramework\List_Tables`). Instantiate in your page's `table()` method — do **not** use `wpdev_register_list_table()` for domain CRUD list tables.

```php
// File: @examples/{folder_slug}/src/tables/class-{entity}-list-table.php
class {Entity}_List_Table extends Base_List_Table {

    protected $query_class = '\\WPDevFramework\\Database\\{Entities}\\{Entity}_Query';

    public function __construct() {
        parent::__construct( array(
            'singular' => __( '{Entity}', 'wpdev' ),
            'plural'   => __( '{Entities}', 'wpdev' ),
            'ajax'     => true,
            'add_new'  => array( 'url' => wpdev_network_admin_url( 'wpdev-edit-{entity}' ) ),
        ) );
    }

    public static function declarative_table_config() {
        return self::declarative_schema(
            array( 'cb', 'name', 'id' ),
            array(
                'empty_state'  => array( 'sub_message' => __( 'Create your first {entity}.', 'wpdev' ) ),
                'bulk_confirm' => array( 'delete' ),
                'actions'      => array( 'column' => 'name', 'items' => array( 'edit', 'delete' ) ),
            )
        );
    }

    public function get_columns() {
        return array( 'cb' => '<input type="checkbox" />', 'name' => __( 'Name', 'wpdev' ) );
    }

    public function column_name( $item ) {
        $url = wpdev_network_admin_url( 'wpdev-edit-{entity}', array( 'id' => $item->get_id() ) );
        return '<strong><a href="' . esc_url( $url ) . '">' . esc_html( $item->get_name() ) . '</a></strong>'
            . $this->row_actions( $this->standard_row_actions_for( $item, '{entity}', 'wpdev-edit-{entity}' ) );
    }
}
```

Copy: `@examples/products/src/tables/class-product-list-table.php`.

## Playground (optional, separate plugin)

Register in `@playground/playground-wpdev/` or a builder panel — **not** inside `@examples/{slug}/`:

```php
if ( ! defined( 'WPDEV_PLAYGROUND_DIR' ) ) { return; }
wpdev_register_playground_panel( 'wpdev-{folder_slug}', wpdev_playground_list_panel( 'wpdev-{folder_slug}', 'WaaS {Entities}' ) );
```

See [playground.md](playground.md) and [playground-index.md](playground-index.md).

## Checklist

```
- [ ] @examples/{folder_slug}/setup.php with Module_Loader::register + deps
- [ ] DB tables via wpdev_register_table()
- [ ] Model + Database/Table + Query classes
- [ ] List_Admin_Page (table(), caps, action_links)
- [ ] Edit_Admin_Page (get_object(), register_widgets(), save)
- [ ] Base_List_Table subclass with query_class + columns
- [ ] Manager via wpdev_boot_module_manager()
- [ ] Public API in src/functions/{entity}.php + wpdev_require_public_function()
- [ ] Optional playground in @playground/ (not in example folder)
- [ ] API_DOC.md per docs/modularization/API_DOC_TEMPLATE.md
```

Avoid: [anti-patterns.md](anti-patterns.md).