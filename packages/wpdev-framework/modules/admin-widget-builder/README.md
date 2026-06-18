# admin-widget-builder

Admin UI widgets and shared element base.

## Canonical classes

| Class | Path |
|-------|------|
| `WPDevFramework\UI\Base_Element` | `src/ui/class-base-element.php` |
| `WPDevFramework\UI\Jumper` | `src/ui/class-jumper.php` |
| `WPDevFramework\UI\Template_Previewer` | `src/ui/class-template-previewer.php` |
| `WPDevFramework\Builders\Block_Editor\Block_Editor_Widget_Manager` | `src/builders/block-editor/` (`assets/js/blocks.js`) |
| `WPDevFramework\Dashboard_Widgets` | `src/class-dashboard-widgets.php` |
| `WPDevFramework\Dashboard_Statistics` | `src/class-dashboard-statistics.php` (generic service; data flows through `wpdev_dashboard_statistics_datasource` filter) |

Boots Jumper and Template_Previewer on `wpdev_load`. Toolbox is no longer
in this module — it moved to `wpdev-examples/sites/src/ui/class-toolbox.php`
in 2.8.1 and is booted from the sites example's `setup.php`.

The `Jumper` class no longer registers its settings directly. It fires
the `wpdev_register_jumper_settings` consumer action on `wpdev_load`; the
`admin-setting-page-defaults` example listens and registers the Tools
section.

## Dependencies

core, admin-page-builder

## Jumper command system

This module now includes a modular Jumper command registry with:

- namespaced grouping (`plugin · section`)
- explicit command registration API
- auto-discovery from module admin page registrations
- link and action command execution

Primary docs:

- [`JUMPER_COMMAND_REGISTRY.md`](JUMPER_COMMAND_REGISTRY.md)
- [`API_DOC.md`](API_DOC.md) (public API contracts)

## Dashboard widget architecture

This module provides the registry and rendering pipeline for WPDev dashboard statistics widgets
(these are **not** WordPress core dashboard widgets).

- Widget registry: `WPDevFramework\Modules\AdminWidgetBuilder\Dashboard_Widget_Registry`
- Datasource registry: `WPDevFramework\Modules\AdminWidgetBuilder\Widget_Datasource_Registry`
- Public facade functions:
  - `wpdev_register_dashboard_widget()`
  - `wpdev_get_dashboard_widget()`
  - `wpdev_has_dashboard_widget()`
  - `wpdev_list_dashboard_widgets()`
  - `wpdev_unregister_dashboard_widget()`
  - `wpdev_register_widget_datasource()`
  - `wpdev_widget_datasource()`

## End-to-end flow

1. Register widgets on `wpdev_load` (domain examples do this, e.g. `admin-custom-page-dashboard-widgets`).
2. The dashboard page (`Top_Level_Admin_Page`, owned by `wpdev-examples/dashboard`) triggers `wpdev_dashboard_{tab}_widgets`.
3. `Dashboard_Widget_Registry::register_metaboxes()` selects widgets by active `tab`, checks capability, and adds metaboxes.
4. Each metabox runs its `datasource` callback and renders the configured `view`.

## Widget config contract

`wpdev_register_dashboard_widget( $id, $config )` accepts:

- `tab` (string): dashboard tab slug (default: `general`)
- `title` (string): metabox title
- `view` (string): template slug, usually `dashboard-statistics/widget-*`
- `datasource` (callable): callback returning template args array
- `context` (string): defaults to `Dashboard_Widget_Registry::CONTEXT_WPDEV_STATISTICS`
- `capability` (string): optional capability gate
- `position` (string): metabox slot (`normal`, `side`, `full`, etc.)
- `priority` (string): metabox priority (`high`, `low`, etc.)

## Building a new WPDev dashboard widget

### 1) Register the widget

Register on `wpdev_load` in the owning module:

```php
add_action(
	'wpdev_load',
	static function () {
		wpdev_register_dashboard_widget(
			'wpdev-my-kpi',
			array(
				'tab'        => 'general',
				'title'      => __( 'My KPI', 'wpdev' ),
				'capability' => 'wpdev_read_dashboard',
				'position'   => 'side',
				'priority'   => 'high',
				'view'       => 'dashboard-statistics/widget-my-kpi',
				'datasource' => static function ( $page ) {
					return array(
						'start_date' => $page->start_date,
						'end_date'   => $page->end_date,
						'value'      => 123,
					);
				},
			)
		);
	},
	5
);
```

### 2) Create the view

Create template in `admin-widget-builder/views/dashboard-statistics/` and consume datasource args:

```php
<?php
defined( 'ABSPATH' ) || exit;
?>
<div class="wpdev-p-4">
	<strong><?php echo esc_html( $value ?? 0 ); ?></strong>
</div>
```

### 3) Add a dashboard tab (optional)

If widget tab is not `general`, extend dashboard filter bar:

```php
add_filter(
	'wpdev_dashboard_filter_bar',
	static function ( $views ) {
		$views['my-tab'] = array(
			'field' => 'type',
			'url'   => add_query_arg( 'tab', 'my-tab' ),
			'label' => __( 'My Tab', 'wpdev' ),
			'count' => 0,
		);
		return $views;
	}
);
```

## Inline datasource vs named datasource

### Inline datasource (default approach)

Pass a callable in widget `datasource` config (used by current dashboard widgets).

### Named datasource (reusable across widgets)

Register named sources on `wpdev_register_widget_datasources`:

```php
add_action(
	'wpdev_register_widget_datasources',
	static function () {
		wpdev_register_widget_datasource(
			'my-kpi-source',
			static function ( $context ) {
				return array( 'value' => 123 );
			}
		);
	}
);
```

Then resolve from widget callback:

```php
'datasource' => static function ( $page ) {
	return (array) wpdev_widget_datasource(
		'my-kpi-source',
		array(
			'start_date' => $page->start_date,
			'end_date'   => $page->end_date,
		)
	);
},
```

## Real production reference

`Monthly Recurring Revenue Growth` is registered in
`modules/admin-custom-page/src/register-dashboard-statistics-widgets.php` as:

- id: `wpdev-mrr-growth`
- tab: `general`
- view: `dashboard-statistics/widget-mrr-growth`
- capability: `wpdev_read_financial`
- position: `full`

Use this widget as the baseline pattern for new financial/analytics widgets.

## Troubleshooting checklist

- Widget does not appear:
  - Confirm registration runs on `wpdev_load`.
  - Verify active `tab` matches widget `tab`.
  - Check `capability` for current user.
- Widget renders empty:
  - Ensure datasource returns an array.
  - Confirm expected keys exist in template.
- Tab does not show:
  - Add tab via `wpdev_dashboard_filter_bar`.

## Naming note

In this codebase, these are called "dashboard widgets" but are rendered through metabox mechanics.
Do not mix with edit-screen metaboxes from `metabox-builder`.
