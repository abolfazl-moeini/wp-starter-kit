# Admin Custom Page

The `admin-custom-page` module registers the production WPDev dashboard/about
pages and wires dashboard hooks. Most extension work happens through
`admin-widget-builder` APIs and dashboard hooks.

Raw API reference: [`../../../modules/admin-custom-page/API_DOC.md`](../../../modules/admin-custom-page/API_DOC.md)

## When To Use

Use this module when you need to:

- Extend the WPDev dashboard.
- Add dashboard filter controls.
- Add dashboard widget sets through hooks.
- Understand the top-level `wpdev` admin page shell.

## Loading

```php
wpdev_load_module( 'admin-custom-page' );
```

Declared dependencies: `core`, `admin-page-builder`, `admin-widget-builder`.

## Public APIs

This module does not expose module-scoped `wpdev_*` functions. Use:

- `admin-widget-builder` for widget registration.
- `admin-page-builder` for page composition/rebinding.
- Dashboard hooks for filters/export behavior.

## Important Hooks

| Hook | Purpose |
|------|---------|
| `wpdev_dashboard_widgets` | Register/render dashboard widgets. |
| `wpdev_dashboard_filter_bar` | Render filter controls. |
| `wpdev_dashboard_display_filter` | Adjust active filter state. |
| `wpdev_admin_bar_menu` | Extend WPDev admin-bar shortcuts. |
| `wpdev_export_data_table_action` | Integrate export actions. |

## Example: Add A Dashboard Widget

```php
wpdev_on_load(
	static function () {
		wpdev_register_dashboard_widget(
			'my-health-check',
			array(
				'tab'        => 'general',
				'title'      => __( 'Health check', 'wpdev' ),
				'view'       => 'dashboard-statistics/widget-simple-text',
				'datasource' => static function () {
					return array( 'value' => __( 'OK', 'wpdev' ) );
				},
				'capability' => 'manage_network',
			)
		);
	}
);
```

## Example: Add Dashboard Filter UI

```php
add_action(
	'wpdev_dashboard_filter_bar',
	static function () {
		echo '<span class="description">' . esc_html__( 'Custom dashboard filter', 'wpdev' ) . '</span>';
	}
);
```

## References

### Module-local examples

*(none — no `modules/admin-custom-page/examples/` samples for this module; dashboard page class lives in wpdev-examples/dashboard)*

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-admin-custom-page/playground.php`
- Helpers: `wpdev-playground/playground-admin-widget-builder/functions-playground-widgets.php` (shared widget grid demos)
- Admin URL (sandbox): `admin.php?page=wpdev-pg-admin-custom-page&pg_tab=general`
- Admin URL (parity): `admin.php?page=wpdev-about` (about pages); dashboard at `admin.php?page=wpdev`
- Dashboard parity: `wpdev-playground/playground-wpdev/` via `Playground_Parity_Registry`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-custom-page-grid`, `wpdev-dashboard-filters`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/dashboard/setup.php` — owns `Top_Level_Admin_Page`
- `wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php` — production dashboard
- `wpdev-examples/admin-custom-page-top-nav/setup.php` — top nav extensions
- `wpdev-examples/admin-custom-page-dashboard-widgets/setup.php` — dashboard widget registrations consumed by the dashboard page

## Example: From production code

From `wpdev-examples/dashboard/setup.php` — registers `Top_Level_Admin_Page` on `wpdev_admin_pages`.

## Notes

- The production dashboard is usually site-admin in playground parity and network-oriented in WaaS admin flows.
- Use widget APIs instead of injecting heavy markup into the dashboard shell.
- Financial widgets commonly require `wpdev_read_financial` or a stricter capability.

