# Admin custom page and admin setting page

Production shell modules for the WPDev dashboard and global settings UI.

## admin-custom-page

**Module:** `@framework/modules/admin-custom-page/`  
**Doc:** `@framework/modules/admin-custom-page/API_DOC.md`  
**Playground:** `@playground/playground-admin-custom-page/` + `@playground/playground-wpdev/` (parity)  
**WaaS examples:** `@examples/dashboard/`, `@examples/admin-custom-page-top-nav/`, `@examples/admin-custom-page-dashboard-widgets/`

### When to use

- Extend the main WPDev network dashboard (`admin.php?page=wpdev`)
- Register dashboard widgets that render on the custom page
- Add top-nav extensions or about-page content

### Pattern

```php
add_action( 'wpdev_load', static function () {
    if ( ! wpdev_module_is_loaded( 'admin-custom-page' ) ) {
        return;
    }
    wpdev_register_dashboard_widget( 'my-kpi', array(
        'tab'        => 'general',
        'title'      => __( 'My KPI', 'wpdev' ),
        'capability' => 'wpdev_read_financial',
        'view'       => 'dashboard-statistics/widget-mrr-growth',
        'datasource' => static function () {
            return array( 'value' => 0 );
        },
    ) );
}, 5 );
```

See [dashboard-widgets.md](dashboard-widgets.md) for full widget config.

### Playground

```php
// @playground/playground-admin-custom-page/playground.php
wpdev_render_playground_custom_page_dashboard();
```

## admin-setting-page

**Module:** `@framework/modules/admin-setting-page/`  
**Doc:** `@framework/modules/admin-setting-page/API_DOC.md`  
**Playground:** `@playground/playground-admin-setting-page/` → `admin.php?page=wpdev-pg-admin-setting-page`  
**WaaS examples:** `@examples/admin-setting-page-defaults/`, `@examples/gateways/`

### When to use

- Add global settings sections/fields to the shared WPDev settings page
- Do **not** subclass the settings page for third-party addons — register sections instead

### Pattern

```php
add_action( 'wpdev_load', static function () {
    wpdev_register_settings_section( 'gateways', array(
        'title' => __( 'Payment Gateways', 'wpdev' ),
        'icon'  => 'dashicons-money-alt',
    ) );
    wpdev_register_settings_field( 'gateways', 'stripe_key', array(
        'type'  => 'text',
        'title' => __( 'Stripe Key', 'wpdev' ),
    ) );
} );
```

Or hook defaults:

```php
add_action( 'wpdev_settings_register_default_sections', static function () {
    wpdev_register_settings_section( /* ... */ );
} );
```

Full settings API: [settings-panel.md](settings-panel.md).