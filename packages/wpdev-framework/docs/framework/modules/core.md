# Core

The `core` module is the foundation of WPDev. It owns module loading, lifecycle
helpers, service access, admin-page rebinding, playground panel registration (via **wpdev-playground**), events,
public function maps, and compatibility bootstrapping.

Raw API reference: [`../../../modules/core/API_DOC.md`](../../../modules/core/API_DOC.md)

## When To Use

Use `core` when you need to:

- Load another framework module with dependencies.
- Register callbacks on the WPDev lifecycle.
- Access framework services such as ajax, form, modal, screen options, tour, or view.
- Rebind a production admin page under another menu/context.
- Register playground panels.
- Dispatch or listen to framework events.

## Loading

`core` is loaded automatically by `wpdev.php`. In isolated scripts/tests:

```php
wpdev_load_module( 'core' );
```

Declared dependencies: none.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_load_module( $module_id, $modules_dir = '' )` | Load one module and its dependencies. |
| `wpdev_on_load( $callback, $priority = 10 )` | Schedule registration on `wpdev_load`. |
| `wpdev_on_admin_pages( $callback, $priority = 10 )` | Schedule page instantiation on `wpdev_admin_pages`. |
| `wpdev_services( $id = null )` | Access `ajax`, `form`, `modal`, `screen_options`, `tour`, `view`. |
| `wpdev_register_service( $id, $service, $replace = true )` | Register a custom service. |
| `wpdev_register_admin_page( $class_name, $args = array(), $priority = 100 )` | Rebind a page class under a different menu/context. |
| `wpdev_register_playground_panel( $module_id, $args = array(), $replace = true )` | Add a dev-only playground panel. |
| `wpdev_dispatch_event( $slug, $payload = array() )` | Dispatch a framework/domain event. |
| `wpdev_register_event_listener( $slug, $callback, $priority = 10, $accepted_args = 1 )` | Listen to one event slug. |
| `wpdev_register_global_event_listener( $callback, $priority = 10, $accepted_args = 2 )` | Listen to all WPDev events. |

## Example: Load A Module And Register Runtime Work

```php
wpdev_load_module( 'settings-panel-builder' );

wpdev_on_load(
	static function () {
		wpdev_register_event_listener(
			'membership_created',
			static function ( array $payload ) {
				wpdev_log_add( 'Membership created: ' . ( $payload['id'] ?? 'unknown' ) );
			}
		);
	}
);
```

## Example: Rebind A Production Admin Page

```php
wpdev_register_admin_page(
	\WPDevFramework\Admin_Pages\Product_List_Admin_Page::class,
	array(
		'parent'     => 'wpdev-playground',
		'context'    => 'admin',
		'capability' => 'wpdev_read_products',
		'module_id'  => 'wpdev-products',
	),
	100
);
```

## Example: Register A Playground Panel

```php
// Panel file lives in wpdev-playground/playground-my-module/playground.php
// and is included when the wpdev-playground plugin is active.
if ( defined( 'WPDEV_PLAYGROUND_DIR' ) ) {
	wpdev_register_playground_panel(
		'my-module',
		array(
			'title'  => __( 'My Module', 'wpdev' ),
			'type'   => 'render',
			'render' => static function () {
				echo '<div class="wrap"><h1>My Module</h1></div>';
			},
		)
	);
}
```

## References

### Module-local examples

*(none — no `modules/core/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Runtime: `wpdev-playground/includes/playground/` (loader, parity registry, seeder)
- Boot: `wpdev-playground/wpdev-playground.php` when `WPDEV_PLAYGROUND_DIR` is defined
- WaaS list preview helpers: `wpdev-playground/playground-wpdev/functions-playground-wpdev.php`
- No `wpdev-pg-core` sandbox panel

### WaaS examples (requires wpdev-examples plugin)

Production pages re-bind under the playground menu via `Playground_Parity_Registry` when both sibling plugins are active:

- `wpdev-examples/products/setup.php` — list/edit parity (`wpdev-products`)
- `wpdev-examples/dashboard/setup.php` — top-level dashboard parity
- `wpdev-examples/admin-setting-page-defaults/setup.php` — settings sections parity
- `wpdev-examples/customers/setup.php` — customer list/edit parity
- `wpdev-examples/checkout/setup.php` — checkout forms parity

## Notes

- Register entities on `wpdev_load`; instantiate page classes on `wpdev_admin_pages`.
- Services and registries are rebuilt on each request.
- Do not bypass `Module_Loader` or add runtime PHP back under `inc/`.

