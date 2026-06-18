# admin-page-builder

Admin page lifecycle and templates.

## Dependencies

core, menu-builder, tab-navigation

## Usage

```php
add_action( 'wpdev_admin-page-builder_register', function () {
	// Register components
} );
```

## Canonical admin page bases

| Class | Path |
|-------|------|
| `WPDevFramework\Admin_Pages\Base_Admin_Page` | `src/admin/class-base-admin-page.php` |
| `WPDevFramework\Admin_Pages\List_Admin_Page` | `src/admin/class-list-admin-page.php` |
| `WPDevFramework\Admin_Pages\Edit_Admin_Page` | `src/admin/class-edit-admin-page.php` |
| `WPDevFramework\Admin_Pages\Wizard_Admin_Page` | `src/admin/class-wizard-admin-page.php` |

`inc/admin-pages/class-*` files are one-line shims.

## Legacy bridge

`WPDevFramework\Modules\AdminPageBuilder\*` aliases map to the classes above via `legacy-aliases.php`.
