# metabox-builder

Edit screen metabox widgets.

## Dependencies

core, form-builder, field-builder, tab-navigation

## Usage

```php
add_action( 'wpdev_metabox-builder_register', function () {
	// Register components
} );
```

## Legacy bridge

`WPDevFramework\Admin_Pages\Post_Edit_Admin_Page` canonical path: `src/admin/class-post-edit-admin-page.php`.

`WPDevFramework\Modules\MetaboxBuilder\Edit_Admin_Page` aliases to `Edit_Admin_Page` via `legacy-aliases.php`.
