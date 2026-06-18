# Admin Custom Page Module

Framework shell for About pages and the top admin navigation bar.

## Dependencies

core, admin-page-builder, admin-widget-builder

## Usage

```php
add_action( 'wpdev_admin_pages', function () {
    new \WPDevFramework\Admin_Pages\About_Admin_Page();
    new \WPDevFramework\Admin_Pages\About_Admin_Page_Network();
} );
```

The top-level dashboard (`Top_Level_Admin_Page`) is owned by the **wpdev-examples/dashboard** example. See `wpdev-examples/dashboard/setup.php`.

## Example pages (framework-owned)

- About pages (site and network variants)
- Top admin navigation (`Top_Admin_Nav_Menu`)