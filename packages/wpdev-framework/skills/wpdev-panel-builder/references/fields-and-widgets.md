# Fields, widgets, and ajax modals

Edit pages use **metabox-builder** widgets. Fields use **field-builder**. Forms use **form-builder**.

## Edit page widgets

Trait: `Edit_Page_Widgets` — `@framework/modules/metabox-builder/src/admin/trait-edit-page-widgets.php`

### add_fields_widget

```php
$this->add_fields_widget( 'general', array(
    'title'  => __( 'General', 'wpdev' ),
    'fields' => array(
        'name' => array( 'type' => 'text', 'title' => __( 'Name', 'wpdev' ) ),
        'enabled' => array( 'type' => 'toggle', 'title' => __( 'Enabled', 'wpdev' ), 'default' => 1 ),
    ),
) );
```

### add_tabs_widget

```php
$this->add_tabs_widget( 'options', array(
    'title'    => __( 'Options', 'wpdev' ),
    'sections' => array(
        'billing' => array( 'title' => __( 'Billing', 'wpdev' ), 'fields' => array( /* ... */ ) ),
    ),
) );
```

### add_list_table_widget

```php
$this->add_list_table_widget( 'memberships', array(
    'title'        => __( 'Memberships', 'wpdev' ),
    'table'        => new \WPDevFramework\List_Tables\Customers_Membership_List_Table(),
    'query_filter' => array( $this, 'memberships_query_filter' ),
) );
```

Example: `@examples/customers/src/admin/class-customer-edit-admin-page.php`.

## wpdev_register_metabox (standalone registry)

Scoped per page id — see [api-cookbook.md](api-cookbook.md).

```php
wpdev_register_metabox( 'wpdev-edit-product', 'pricing', array(
    'title'    => __( 'Pricing', 'wpdev' ),
    'callback' => array( $this, 'render_pricing_metabox' ),
    'context'  => 'normal',
) );
```

Playground: `@playground/playground-metabox-builder/`. Example: `@examples/metabox-post-type/`.

## Field types

```php
wpdev_register_field_type( 'my_type', array(
    'class'    => My_Field_Template::class,
    'sanitize' => 'sanitize_text_field',
), true );
```

Views: `wpdev_field_view( 'admin', 'text' )` — contexts: `settings`, `admin`, `checkout`, `frontend`.

Built-in templates: `@framework/modules/field-builder/views/admin-pages/fields/`.

## Ajax modal forms

```php
wpdev_register_form( 'add_note', array(
    'title'   => __( 'Add Note', 'wpdev' ),
    'fields'  => array( /* ... */ ),
    'handler' => array( $this, 'handle_add_note_form' ),
) );
wpdev_modal_open( 'add_note', array( 'entity_id' => $id ) );
add_wubox(); // enqueue modal assets
```

### wpdev_register_ajax_modal (2.8+)

```php
wpdev_register_ajax_modal( 'quick_edit', array( $this, 'render_quick_edit' ), array(
    'capability' => 'wpdev_edit_customers',
) );
```

Sources: `@framework/modules/form-builder/src/functions/form.php`, `modal.php`.

## Ajax handlers

```php
wpdev_register_ajax_handler( 'my_action', static function () {
    if ( ! current_user_can( 'wpdev_edit_products' ) ) {
        wpdev_ajax_error( __( 'Not allowed.', 'wpdev' ), 'forbidden', null, 403 );
    }
    wpdev_ajax_success( array( 'message' => __( 'Saved.', 'wpdev' ) ) );
} );
```

## Settings API vs edit widgets

| Use case | API |
|----------|-----|
| Global settings | [settings-panel.md](settings-panel.md) |
| Per-entity edit screen | `add_fields_widget` / `add_tabs_widget` |
| Inline picker modal | `wpdev_register_form` + `wpdev_modal_open` |