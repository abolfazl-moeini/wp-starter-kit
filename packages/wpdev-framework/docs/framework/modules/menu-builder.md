# Menu Builder

The `menu-builder` module provides a declarative registry for top-level and
child admin menus. It is used by admin page classes and playground routes to keep
menu registration consistent.

Raw API reference: [`../../../modules/menu-builder/API_DOC.md`](../../../modules/menu-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Register a custom top-level admin menu.
- Register child menus under an existing WPDev menu.
- Store menu definitions in a registry before WordPress menu hooks run.
- Keep page/menu registration separate from page rendering.

## Loading

```php
wpdev_load_module( 'menu-builder' );
```

Declared dependencies: `core`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_menu_page( $page_slug, $config = array(), $replace = true )` | Register menu metadata by slug. |
| `wpdev_register_menu_top( $slug, $args )` | Register a top-level admin menu. |
| `wpdev_register_menu_child( $parent_slug, $slug, $args )` | Register a child menu. |
| `wpdev_get_menu_page( $page_slug )` | Return menu config. |
| `wpdev_has_menu_page( $page_slug )` | Check whether a menu exists. |
| `wpdev_list_menu_pages()` | List all menu registrations. |
| `wpdev_unregister_menu_page( $page_slug )` | Remove a menu registration. |

## Example: Register A Top-level Menu

```php
wpdev_on_load(
	static function () {
		wpdev_register_menu_top(
			'my-plugin',
			array(
				'title'      => __( 'My Plugin', 'wpdev' ),
				'capability' => 'manage_options',
				'callback'   => 'my_plugin_render_dashboard',
				'icon'       => 'dashicons-admin-generic',
				'position'   => 58,
			)
		);
	}
);
```

## Example: Register Child Menus

```php
wpdev_register_menu_child(
	'my-plugin',
	'my-plugin-settings',
	array(
		'title'      => __( 'Settings', 'wpdev' ),
		'capability' => 'manage_options',
		'callback'   => 'my_plugin_render_settings',
	)
);
```

## References

### Module-local examples

- [`modules/menu-builder/examples/example-01.php`](../../../modules/menu-builder/examples/example-01.php) — menu-builder usage (see README)
- [`modules/menu-builder/examples/example-02.php`](../../../modules/menu-builder/examples/example-02.php) — advanced menu-builder pattern

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-menu-builder/playground.php`
- Helpers: `wpdev-playground/playground-menu-builder/functions-playground-menu.php`
- Admin URL: `admin.php?page=wpdev-pg-menu-builder`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-menu-registry`, `pg_demo_menu`, `pg_demo_menu_b`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module lists `menu-builder` directly in its `setup.php` `dependencies`; it is resolved transitively via `admin-page-builder`, whose registered admin page classes drive menu registration.

- `wpdev-examples/products/setup.php` — product admin menu tree (via list/edit page classes)
- `wpdev-examples/sites/setup.php` — sites admin menus
- `wpdev-examples/domains/setup.php` — domain mapping menus

## Example: From production code

From `wpdev-playground/playground-menu-builder/playground.php` — renders declarative menu preview via `wpdev_render_menu_builder_playground_preview()`.

## Notes

- WordPress enforces the capability assigned to each menu node.
- This module does not render pages; callbacks or admin page classes do.
- Prefer menu-builder APIs over direct `add_menu_page()` calls in framework modules.

