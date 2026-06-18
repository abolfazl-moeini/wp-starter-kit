# API cookbook — panel APIs

Entry template for every symbol below. Manifest `examples/{slug}/` = `@examples/{slug}/`. Domain APIs: [api-cookbook-domain.md](api-cookbook-domain.md).

---

## A. Registry facades (`wpdev_register_*`)

### wpdev_register_table

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_table( string $property, string $factory )` |
| Hook | `setup.php` (before boot) |
| When | Register custom DB table factory |
| Full example | `@examples/products/setup.php` |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
```

### wpdev_register_module_admin_pages

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_module_admin_pages( string $module_id, array $page_classes, int $priority = 10, array $overrides_map = array() )` |
| Hook | `setup.php` |
| When | Register list/edit admin page classes |
| Full example | `@examples/products/setup.php` |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_module_admin_pages( 'wpdev-products', array(
    Product_List_Admin_Page::class,
    Product_Edit_Admin_Page::class,
) );
```

### wpdev_boot_module_manager

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_boot_module_manager( string $module_id, string $manager_class, ?string $manager_path = null, int $priority = 5 )` |
| Hook | Called from `setup.php`; boots on `wpdev_load` |
| When | Singleton domain manager |
| Full example | `@examples/products/setup.php` |

```php
wpdev_boot_module_manager( 'wpdev-products', Product_Manager::class, __DIR__ . '/src/managers/class-product-manager.php' );
```

### wpdev_register_module_views

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_module_views( string $module_id, ?string $path = null )` |
| When | Register module `views/` directory |
| Full example | `@examples/checkout/setup.php` |

```php
wpdev_register_module_views( 'wpdev-checkout' );
```

### wpdev_register_admin_page

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_admin_page( string $class_name, array $args = array(), int $priority = 100 )` |
| When | Re-bind page under alternate parent (playground parity) |
| Playground | `@playground/playground-admin-page-builder/` |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_admin_page( Product_List_Admin_Page::class, array(
    'parent'  => 'wpdev-playground',
    'context' => 'admin',
) );
```

### wpdev_register_ajax_handler

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_ajax_handler( string $action, callable $callback, array $args = array() )` |
| Hook | `wpdev_load` |
| When | Custom ajax action |
| Full example | `@examples/products/src/admin/` |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_ajax_handler( 'delete_product', static function () {
    if ( ! current_user_can( 'wpdev_edit_products' ) ) {
        wpdev_ajax_error( __( 'Not allowed.', 'wpdev' ), 'forbidden', null, 403 );
    }
    wpdev_ajax_success( array( 'deleted' => true ) );
} );
```

### wpdev_register_playground_panel

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_playground_panel( string $module_id, array $args = array(), bool $replace = true ): bool` |
| When | Dev-only playground submenu panel |
| Playground | `@playground/playground-form-builder/playground.php` |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
if ( ! defined( 'WPDEV_PLAYGROUND_DIR' ) ) { return; }
wpdev_register_playground_panel( 'my-demo', array(
    'title'  => __( 'My Demo', 'wpdev' ),
    'render' => static function () { echo '<div class="wrap"><h1>Demo</h1></div>'; },
) );
```

### Playground panel registration (primary public API)

See `wpdev_register_playground_panel` above (core) and the helpers in section F. Parity between real production pages and the playground menu is handled internally by the playground sibling when both `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are active (controlled by the `wpdev_playground_use_real_production_pages` filter). Direct calls to internal parity registration are not required for normal panel development.
### wpdev_register_service

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_service( string $id, Service_Contract $service, bool $replace = true )` |
| When | Register core service implementation |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_service( 'my-service', new My_Service() );
```

### wpdev_register_event_listener

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_event_listener( string $slug, callable $callback, int $priority = 10, int $accepted_args = 1 )` |
| When | Listen to named event bus event |

```php
wpdev_register_event_listener( 'product.saved', static function ( $payload ) {
    // Side effect.
} );
```

### wpdev_register_global_event_listener

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_global_event_listener( callable $callback, int $priority = 10, int $accepted_args = 2 )` |
| When | Listen to all events |

```php
wpdev_register_global_event_listener( static function ( $event_slug, $payload ) {
    // Log or react to any event.
} );
```

### wpdev_register_list_table

| Field | Value |
|-------|-------|
| Module | table-builder |
| Signature | `wpdev_register_list_table( string $table_id, string $class_name, ?Table_Config $config = null, bool $replace = true ): bool` |
| When | Global list table registry (widgets/metaboxes) — **not** domain CRUD default |
| Playground | `@playground/playground-table-builder/` |
| Doc | `@framework/modules/table-builder/API_DOC.md` |

```php
wpdev_register_list_table( 'product_table_ui', Product_List_Table::class );
```

### wpdev_register_field_type

| Field | Value |
|-------|-------|
| Module | field-builder |
| Signature | `wpdev_register_field_type( string $type, array $config = array(), bool $replace = true )` |
| Hook | `wpdev_load` |
| Playground | `@playground/playground-field-builder/` |
| Doc | `@framework/modules/field-builder/API_DOC.md` |

```php
wpdev_register_field_type( 'color', array( 'class' => Color_Field_Template::class ), true );
```

### wpdev_register_field_template

| Field | Value |
|-------|-------|
| Module | checkout (example) |
| Signature | `wpdev_register_field_template( string $field_type, string $field_template_id, string $field_template_class_name )` |
| Hook | `wpdev_load` |
| When | Register a template class for a checkout field type |
| Full example | `@examples/checkout/setup.php` |
| Doc | `@examples/checkout/API_DOC.md` |

```php
wpdev_register_field_template( 'pricing-table', 'default', Pricing_Table_Field_Template::class );
```

### wpdev_register_form

| Field | Value |
|-------|-------|
| Module | form-builder |
| Signature | `wpdev_register_form( string $form_id, array $atts = array() )` |
| Hook | `wpdev_load` or `wpdev_register_forms` action |
| Playground | `@playground/playground-form-builder/` |
| Full example | `@examples/checkout/setup.php` |
| Doc | `@framework/modules/form-builder/API_DOC.md` |

```php
wpdev_register_form( 'add_note', array(
    'title'   => __( 'Add Note', 'wpdev' ),
    'fields'  => array( 'note' => array( 'type' => 'textarea', 'title' => __( 'Note', 'wpdev' ) ) ),
    'handler' => array( $this, 'handle_add_note' ),
) );
```

### wpdev_register_ajax_modal

| Field | Value |
|-------|-------|
| Module | form-builder |
| Signature | `wpdev_register_ajax_modal( string $id, callable $callback, array $args = array() )` |
| When | Ajax-driven modal without full form registry |
| Doc | `@framework/modules/form-builder/API_DOC.md` |

```php
wpdev_register_ajax_modal( 'quick_edit', array( $this, 'render_quick_edit_modal' ), array(
    'capability' => 'wpdev_edit_products',
) );
```

### wpdev_register_ajax_tabs

| Field | Value |
|-------|-------|
| Module | core / form-builder |
| Signature | `wpdev_register_ajax_tabs( string $group, callable $callback )` |
| When | Ajax tab group on edit pages |

```php
wpdev_register_ajax_tabs( 'product_tabs', array( $this, 'render_ajax_tab' ) );
```

### wpdev_register_settings_section

| Field | Value |
|-------|-------|
| Module | settings-panel-builder |
| Signature | `wpdev_register_settings_section( string $section_slug, array $atts, bool $replace = true )` |
| Hook | `wpdev_load` |
| Playground | `@playground/playground-settings-panel-builder/` |
| Full example | `@examples/admin-setting-page-defaults/setup.php` |
| Doc | `@framework/modules/settings-panel-builder/API_DOC.md` |

```php
wpdev_register_settings_section( 'general', array(
    'title' => __( 'General', 'wpdev' ),
    'icon'  => 'dashicons-admin-settings',
) );
```

### wpdev_register_settings_field

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_settings_field( string $section_slug, string $field_slug, array $atts )` |
| Hook | `wpdev_load` |

```php
wpdev_register_settings_field( 'general', 'site_name', array(
    'type'  => 'text',
    'title' => __( 'Site Name', 'wpdev' ),
) );
```

### wpdev_register_settings_side_panel

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_settings_side_panel( string $section_slug, array $atts )` |
| When | Contextual help panel beside settings |

```php
wpdev_register_settings_side_panel( 'general', array(
    'title'   => __( 'Help', 'wpdev' ),
    'content' => __( 'Configure general options.', 'wpdev' ),
) );
```

### wpdev_register_metabox

| Field | Value |
|-------|-------|
| Module | metabox-builder |
| Signature | `wpdev_register_metabox( string $page_id, string $metabox_id, array $config = array(), bool $replace = true )` |
| Playground | `@playground/playground-metabox-builder/` |
| Full example | `@examples/metabox-post-type/setup.php` |
| Doc | `@framework/modules/metabox-builder/API_DOC.md` |

```php
wpdev_register_metabox( 'wpdev-edit-product', 'inventory', array(
    'title'    => __( 'Inventory', 'wpdev' ),
    'callback' => array( $this, 'render_inventory' ),
) );
```

### wpdev_register_menu_top

| Field | Value |
|-------|-------|
| Module | menu-builder |
| Signature | `wpdev_register_menu_top( string $slug, array $args )` |
| Playground | `@playground/playground-menu-builder/` |
| Doc | `@framework/modules/menu-builder/API_DOC.md` |

```php
wpdev_register_menu_top( 'my-app', array(
    'title' => __( 'My App', 'wpdev' ), 'capability' => 'manage_options', 'callback' => 'my_app_render',
) );
```

### wpdev_register_menu_child

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_menu_child( string $parent_slug, string $slug, array $args )` |

```php
wpdev_register_menu_child( 'my-app', 'my-app-settings', array(
    'title' => __( 'Settings', 'wpdev' ), 'capability' => 'manage_options', 'callback' => 'my_settings',
) );
```

### wpdev_register_menu_page

| Field | Value |
|-------|-------|
| Module | menu-builder |
| Signature | `wpdev_register_menu_page( string $page_slug, array $config = array(), bool $replace = true )` |
| When | Declarative menu metadata registry |
| Doc | `@framework/modules/menu-builder/API_DOC.md` |

```php
wpdev_register_menu_page( 'my-app', array(
    'title'      => __( 'My App', 'wpdev' ),
    'capability' => 'manage_options',
    'context'    => 'network',
) );
```

### wpdev_register_dashboard_widget

| Field | Value |
|-------|-------|
| Module | admin-widget-builder |
| Signature | `wpdev_register_dashboard_widget( string $id, array $config = array(), bool $replace = true ): bool` |
| Hook | `wpdev_load` |
| Playground | `@playground/playground-admin-widget-builder/` |
| Full example | `@examples/admin-custom-page-dashboard-widgets/setup.php` |
| Doc | `@framework/modules/admin-widget-builder/API_DOC.md` |

```php
wpdev_register_dashboard_widget( 'revenue', array(
    'tab' => 'general', 'title' => __( 'Revenue', 'wpdev' ),
    'view' => 'dashboard-statistics/widget-revenue', 'datasource' => static fn() => array(),
) );
```

### wpdev_register_page_template

| Field | Value |
|-------|-------|
| Module | admin-page-builder |
| Signature | `wpdev_register_page_template( string $layout_type, string $view_path, bool $replace = true )` |
| Doc | `@framework/modules/admin-page-builder/API_DOC.md` |

```php
wpdev_register_page_template( 'grid', 'base/grid' );
```

### wpdev_register_admin_bar_node

| Field | Value |
|-------|-------|
| Module | admin-custom-page |
| Signature | `wpdev_register_admin_bar_node( string $id, array $config = array(), bool $replace = true )` |
| When | WP admin bar extension on custom page |

```php
wpdev_register_admin_bar_node( 'wpdev-quick', array( 'title' => 'WPDev', 'href' => wpdev_network_admin_url( 'wpdev' ) ) );
```

### wpdev_require_public_function

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_require_public_function( string $basename )` |
| Hook | `wpdev_load` |
| When | Lazy-load example public API file |

```php
add_action( 'wpdev_load', static fn() => wpdev_require_public_function( 'product' ), 1 );
```

---

## B. Lifecycle hooks and schedulers

### wpdev_on_load

| Field | Value |
|-------|-------|
| Signature | `wpdev_on_load( callable $callback, int $priority = 10 )` |
| When | Schedule registration on `wpdev_load` |

```php
wpdev_on_load( static function () {
    wpdev_register_settings_section( 'addon', array( 'title' => __( 'Add-on', 'wpdev' ) ) );
} );
```

### wpdev_on_admin_pages

| Field | Value |
|-------|-------|
| Signature | `wpdev_on_admin_pages( callable $callback, int $priority = 10 )` |
| When | Schedule work on `wpdev_admin_pages` |

```php
wpdev_on_admin_pages( static function () {
    wpdev_register_admin_page( My_Page::class, array( 'parent' => 'wpdev' ) );
} );
```

### wpdev_load_module

| Field | Value |
|-------|-------|
| Signature | `wpdev_load_module( string $module_id, string $modules_dir = '' )` |
| When | Load single module with deps (tests/isolated use) |

```php
wpdev_load_module( 'table-builder' );
```

### wpdev_module_is_loaded

| Field | Value |
|-------|-------|
| Signature | `wpdev_module_is_loaded( string $module_id ): bool` |
| When | Guard widget/settings registration |

```php
if ( wpdev_module_is_loaded( 'admin-custom-page' ) ) { /* register widgets */ }
```

### WordPress action hooks

| Hook | Purpose |
|------|---------|
| `wpdev_init` | Early services, singletons |
| `wpdev_load` | `wpdev_register_*`, managers, public functions |
| `wpdev_admin_pages` | Admin page instantiation |
| `wpdev_register_forms` | Modal/ajax form registration |
| `wpdev_register_field_types` | Checkout field type registration |
| `wpdev_register_field_templates` | Checkout field template registration |
| `wpdev_modules_loaded` | Framework modules loaded; examples load here |

---

## C. Getters, savers, and registry helpers

### wpdev_get_setting

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_setting( string $setting, mixed $default = false )` |
| Full example | `@examples/admin-setting-page-defaults/` |

```php
$api_key = wpdev_get_setting( 'stripe_api_key', '' );
```

### wpdev_save_setting

| Field | Value |
|-------|-------|
| Signature | `wpdev_save_setting( string $setting, mixed $value ): bool` |

```php
wpdev_save_setting( 'stripe_api_key', sanitize_text_field( $value ) );
```

### wpdev_get_option / wpdev_save_option

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_option( string $key, mixed $default = false )`, `wpdev_save_option( string $key, mixed $value )` — VERIFY_IN_SOURCE |
| When | Raw option blob access (settings storage) |

### wpdev_get_settings_section

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_settings_section( string $section_slug ): ?array` |

### wpdev_get_db_table

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_db_table( string $property )` — VERIFY_IN_SOURCE |
| When | Resolve registered table factory |

```php
$table = wpdev_get_db_table( 'product_table' );
```

### wpdev_get_template

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_template( string $view, array $args = array() )` — VERIFY_IN_SOURCE |
| When | Render registered module view |

### wpdev_get_form_url

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_form_url( string $form_id, array $args = array() )` — VERIFY_IN_SOURCE |
| When | Wubox/modal form URL |

### Registry getters (uniform pattern)

```php
wpdev_get_{entity}( $id );
wpdev_has_{entity}( $id );
wpdev_list_{entity}();
wpdev_unregister_{entity}( $id );
```

Applies to: `dashboard_widget`, `settings_section`, `menu_page`, `form`, `field_type`, `list_table`, `metabox`, `playground_panel`.

---

## D. Ajax and modal helpers

### wpdev_modal_open

| Field | Value |
|-------|-------|
| Signature | `wpdev_modal_open( string $form_id, array $args = array() )` |
| Full example | `@examples/customers/src/admin/` |

```php
wpdev_modal_open( 'add_note', array( 'customer_id' => $id ) );
```

### wpdev_ajax_success

| Field | Value |
|-------|-------|
| Signature | `wpdev_ajax_success( mixed $data = null, string $code = 'success' )` |

### wpdev_ajax_error

| Field | Value |
|-------|-------|
| Signature | `wpdev_ajax_error( string $message, string $code = 'error', mixed $data = null, int $status = 400 )` |

```php
wpdev_ajax_error( __( 'Invalid request.', 'wpdev' ), 'invalid', null, 400 );
```

### wpdev_ajax_url

| Field | Value |
|-------|-------|
| Signature | `wpdev_ajax_url( string $action )` — VERIFY_IN_SOURCE |

---

## E. Base classes (extend, do not register)

### List_Admin_Page

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\Admin_Pages\List_Admin_Page` |
| Source | `@framework/modules/admin-page-builder/src/admin/class-list-admin-page.php` |
| Required | `table(): Base_List_Table` |
| Full example | `@examples/products/src/admin/class-product-list-admin-page.php` |

```php
class Product_List_Admin_Page extends List_Admin_Page {
    protected $id = 'wpdev-products';
    public function table() { return new Product_List_Table(); }
}
```

### Edit_Admin_Page

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\Admin_Pages\Edit_Admin_Page` |
| Required | `get_object()` |
| Full example | `@examples/products/src/admin/class-product-edit-admin-page.php` |

```php
class Product_Edit_Admin_Page extends Edit_Admin_Page {
    protected $parent = 'none';
    protected $highlight_menu_slug = 'wpdev-products';
    public function get_object() { return Product::get( (int) wpdev_request( 'id' ) ) ?: new Product(); }
}
```

### Base_List_Table

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\List_Tables\Base_List_Table` |
| Source | `@framework/modules/table-builder/src/table/class-base-list-table.php` |
| Full example | `@examples/products/src/tables/class-product-list-table.php` |

```php
class Product_List_Table extends Base_List_Table {
    protected $query_class = '\\WPDevFramework\\Database\\Products\\Product_Query';
    public function get_columns() { return array( 'cb' => '', 'name' => __( 'Name', 'wpdev' ) ); }
}
```

### Base_Model

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\Models\Base_Model` |
| Source | `@framework/modules/core/src/Model/class-base-model.php` |
| Full example | `@examples/products/src/Models/class-product.php` |

### Table (DB engine)

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\Database\Engine\Table` |
| Source | `@framework/modules/core/src/Database/engine/class-table.php` |
| Full example | `@examples/products/src/Database/Products/class-products-table.php` |

### Base_Manager

| Field | Value |
|-------|-------|
| Class | `WPDevFramework\Managers\Base_Manager` |
| Full example | `@examples/products/src/managers/class-product-manager.php` |

---

## F. Playground helpers

### wpdev_playground_list_panel

| Field | Value |
|-------|-------|
| Signature | `wpdev_playground_list_panel( string $module_id, string $title )` — VERIFY_IN_SOURCE |
| When | WaaS list preview panel args |
| Source | `@playground/playground-wpdev/functions-playground-wpdev.php` |

```php
wpdev_register_playground_panel( 'wpdev-products', wpdev_playground_list_panel( 'wpdev-products', 'WaaS Products' ) );
```

### wpdev_playground_panel_url

| Field | Value |
|-------|-------|
| Signature | `wpdev_playground_panel_url( string $panel_id )` — VERIFY_IN_SOURCE |

### wpdev_playground_get_option / wpdev_playground_seed_option

| Field | Value |
|-------|-------|
| When | Sandbox option storage for demos |

### wpdev_render_settings_panel_playground

| Field | Value |
|-------|-------|
| When | Render settings builder demo |
| Playground | `@playground/playground-settings-panel-builder/playground.php` |

```php
wpdev_render_settings_panel_playground( array( 'section_prefix' => 'pg_', 'page_slug' => 'wpdev-pg-settings-panel-builder' ) );
```

### wpdev_render_tab_navigation

| Field | Value |
|-------|-------|
| Module | tab-navigation |
| When | Shared tab markup |
| Playground | `@playground/playground-tab-navigation/` |

See [playground-index.md](playground-index.md) for all panel URLs.