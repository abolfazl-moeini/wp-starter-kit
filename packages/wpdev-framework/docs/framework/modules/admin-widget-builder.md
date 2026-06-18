# Admin Widget Builder

The `admin-widget-builder` module registers dashboard widgets, widget
datasources, UI elements, and Jumper command palette entries.

Raw API reference: [`../../../modules/admin-widget-builder/API_DOC.md`](../../../modules/admin-widget-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Add dashboard KPI/stat cards.
- Share datasource callbacks across widgets.
- Add command palette shortcuts with Jumper.
- Group commands under module/plugin namespaces.

## Loading

```php
wpdev_load_module( 'admin-widget-builder' );
```

Declared dependencies: `core`, `admin-page-builder`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_register_dashboard_widget( $id, $config = array(), $replace = true )` | Register a dashboard widget. |
| `wpdev_get_dashboard_widget( $id )` | Return widget config. |
| `wpdev_list_dashboard_widgets()` | List all widgets. |
| `wpdev_register_widget_datasource( $id, $callback, $replace = true )` | Register reusable datasource. |
| `wpdev_widget_datasource( $id, $context = array() )` | Resolve datasource output. |
| `wpdev_register_jumper_namespace( $id, $config = array(), $replace = true )` | Register command namespace/group. |
| `wpdev_register_jumper_command( $id, $config = array(), $replace = true )` | Register Jumper command. |
| `wpdev_list_jumper_commands()` | List commands. |
| `wpdev_list_jumper_namespaces()` | List namespaces. |

## Example: Register A Dashboard Widget

```php
wpdev_on_load(
	static function () {
		wpdev_register_widget_datasource(
			'my_mrr',
			static function ( array $context ) {
				return array(
					'value' => '$0',
					'label' => __( 'MRR', 'wpdev' ),
				);
			}
		);

		wpdev_register_dashboard_widget(
			'my-mrr',
			array(
				'tab'        => 'general',
				'title'      => __( 'Monthly Recurring Revenue', 'wpdev' ),
				'view'       => 'dashboard-statistics/widget-simple-text',
				'datasource' => 'my_mrr',
				'capability' => 'manage_network',
			)
		);
	}
);
```

## Example: Register A Jumper Command

```php
add_action(
	'wpdev_register_jumper_commands',
	static function () {
		wpdev_register_jumper_namespace(
			'my-tools',
			array(
				'plugin' => 'My Plugin',
				'label'  => __( 'Tools', 'wpdev' ),
			)
		);

		wpdev_register_jumper_command(
			'my-tools/open-settings',
			array(
				'namespace'  => 'my-tools',
				'title'      => __( 'Open settings', 'wpdev' ),
				'type'       => 'link',
				'url'        => network_admin_url( 'admin.php?page=wpdev-settings' ),
				'capability' => 'manage_network',
			)
		);
	}
);
```

## References

### Module-local examples

- [`modules/admin-widget-builder/examples/example-01.php`](../../../modules/admin-widget-builder/examples/example-01.php) — admin-widget-builder usage (see README)
- [`modules/admin-widget-builder/examples/example-02.php`](../../../modules/admin-widget-builder/examples/example-02.php) — advanced admin-widget-builder pattern

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-admin-widget-builder/playground.php`
- Helpers: `wpdev-playground/playground-admin-widget-builder/functions-playground-widgets.php`
- Admin URL: `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=general`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-dashboard-grid`, `data-wpdev-widget`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-custom-page-dashboard-widgets/setup.php` — `wpdev_register_dashboard_widget()` registrations (MRR, growth, and related KPI cards)
- `wpdev-examples/dashboard/setup.php` — owns `Top_Level_Admin_Page` shell that renders registered dashboard widgets
- `wpdev-examples/customer-panel/setup.php` — customer-facing widget composition via `admin-widget-builder` APIs

## Example: From production code

From `wpdev-examples/admin-custom-page-dashboard-widgets/setup.php` — registers MRR and related dashboard widgets on `wpdev_load`.

## Notes

- Widgets and commands should include explicit capabilities.
- Datasources should return plain arrays and avoid rendering HTML.
- Server-side Jumper actions re-check command capabilities.

