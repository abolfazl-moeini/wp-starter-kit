# Admin Page Builder

The `admin-page-builder` module provides the admin page composition layer:
base/list/edit page classes, template registry, layout helpers, and page-level
hooks.

Raw API reference: [`../../../modules/admin-page-builder/API_DOC.md`](../../../modules/admin-page-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Build a list admin page.
- Build a create/edit admin page.
- Register or resolve page layout templates.
- Reuse WPDev admin chrome, capabilities, menu behavior, and page hooks.

## Loading

```php
wpdev_load_module( 'admin-page-builder' );
```

Declared dependencies: `core`, `menu-builder`, `tab-navigation`, `metabox-builder`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_page_template( $layout_type, $view_path, $replace = true )` | Register a layout template. |
| `wpdev_resolve_page_template( $layout_type, $default = '' )` | Resolve layout template path. |
| `wpdev_has_page_template( $layout_type )` | Check template existence. |
| `wpdev_list_page_templates()` | List template registry. |
| `wpdev_unregister_page_template( $layout_type )` | Remove a template. |
| `wpdev_wrap_use_container()` | Whether admin wrap uses container chrome. |
| `wpdev_responsive_table_row( $args, $first_row, $second_row )` | Render responsive row markup. |
| `wpdev_register_module_admin_pages( $module_id, $page_classes, $priority = 10, $overrides_map = array() )` | Register module page classes on `wpdev_admin_pages`. |
| `wpdev_register_admin_page( $class_name, $args = array(), $priority = 100 )` | Rebind one page class under alternate parent/context. |

## Primary Classes

| Class | Use |
|-------|-----|
| `WPDevFramework\Admin_Pages\Base_Admin_Page` | Custom page shell. |
| `WPDevFramework\Admin_Pages\List_Admin_Page` | List/table pages. |
| `WPDevFramework\Admin_Pages\Edit_Admin_Page` | Create/edit pages with widgets/metaboxes. |

## Example: Register A List/Edit Pair

```php
wpdev_register_module_admin_pages(
	'wpdev-products',
	array(
		\WPDevFramework\Admin_Pages\Product_List_Admin_Page::class,
		\WPDevFramework\Admin_Pages\Product_Edit_Admin_Page::class,
	)
);
```

## Example: Register A Custom Template

```php
wpdev_on_load(
	static function () {
		wpdev_register_page_template(
			'my-report',
			'my-plugin/admin-pages/report'
		);
	}
);
```

## Example: Minimal Custom Page Class

```php
class My_Report_Admin_Page extends \WPDevFramework\Admin_Pages\Base_Admin_Page {
	protected $id = 'my-report';
	protected $type = 'submenu';
	protected $parent = 'wpdev';

	public function get_title() {
		return __( 'Report', 'wpdev' );
	}

	public function render() {
		echo '<div class="wrap"><h1>' . esc_html( $this->get_title() ) . '</h1></div>';
	}
}
```

## References

### Module-local examples

- [`modules/admin-page-builder/examples/example-01.php`](../../../modules/admin-page-builder/examples/example-01.php) — register page layout templates
- [`modules/admin-page-builder/examples/example-02.php`](../../../modules/admin-page-builder/examples/example-02.php) — advanced admin-page-builder pattern

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-admin-page-builder/playground.php`
- Helpers: `wpdev-playground/playground-admin-page-builder/functions-playground-pages.php`, `wpdev-playground/playground-admin-page-builder/functions-playground-templates.php`
- Admin URL: `admin.php?page=wpdev-pg-admin-page-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-page-template`, `wpdev-playground-list-shell`, `nav-tab-wrapper`, `wpdev-playground-settings-shell`, `pg_custom`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/products/setup.php` — product list/edit page classes
- `wpdev-examples/sites/setup.php` — site list/edit pages
- `wpdev-examples/customers/setup.php` — customer admin pages

## Example: From production code

From `wpdev-examples/products/setup.php` — registers list/edit admin page classes with `wpdev_register_module_admin_pages( 'wpdev-products', ... )`.

## Notes

- Instantiate pages on `wpdev_admin_pages`, not on file load.
- Keep capabilities in page properties and ajax handlers.
- Use `wpdev_register_admin_page()` when you need to mirror an existing production page elsewhere.

