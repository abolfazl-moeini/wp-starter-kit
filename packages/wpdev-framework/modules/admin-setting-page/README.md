# Admin Setting Page Module

Example module for settings panel integration.

## Dependencies

core, settings-panel-builder, admin-page-builder

## Usage

```php
add_action( 'wpdev_init', function () {
    wpdev()->settings = \WPDevFramework\Settings::get_instance();
} );

add_action( 'wpdev_admin_pages', function () {
    new \WPDevFramework\Admin_Pages\Settings_Admin_Page();
} );
```

## Reference

- `Settings_Admin_Page` extends wizard-based settings UI
