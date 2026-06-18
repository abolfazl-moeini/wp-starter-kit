# Tab Navigation

The `tab-navigation` module renders shared tab UI for list views, settings
sections, wizard-like flows, and playground panels.

Raw API reference: [`../../../modules/tab-navigation/API_DOC.md`](../../../modules/tab-navigation/API_DOC.md)

## When To Use

Use this module when you need to:

- Render a consistent tab bar.
- Convert list-table views into tab definitions.
- Share active-tab behavior across settings, list, and custom pages.

## Loading

```php
wpdev_load_module( 'tab-navigation' );
```

Declared dependencies: `core`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_render_tab_navigation( $tabs, $options = array() )` | Render tab markup. |
| `wpdev_list_table_views_as_tabs( $views )` | Convert list-table views to tabs. |

## Example: Render Manual Tabs

```php
$active = sanitize_key( wpdev_request( 'tab', 'general' ) );

wpdev_render_tab_navigation(
	array(
		array(
			'id'      => 'general',
			'title'   => __( 'General', 'wpdev' ),
			'url'     => add_query_arg( 'tab', 'general' ),
			'current' => 'general' === $active,
		),
		array(
			'id'      => 'advanced',
			'title'   => __( 'Advanced', 'wpdev' ),
			'url'     => add_query_arg( 'tab', 'advanced' ),
			'current' => 'advanced' === $active,
		),
	),
	array(
		'id' => 'my-module-tabs',
	)
);
```

## Example: Convert List-table Views

```php
$views = array(
	'all'      => array(
		'label'   => __( 'All', 'wpdev' ),
		'url'     => add_query_arg( 'status', 'all' ),
		'current' => true,
	),
	'archived' => array(
		'label' => __( 'Archived', 'wpdev' ),
		'url'   => add_query_arg( 'status', 'archived' ),
	),
);

wpdev_render_tab_navigation( wpdev_list_table_views_as_tabs( $views ) );
```

## References

### Module-local examples

- [`modules/tab-navigation/examples/example-01.php`](../../../modules/tab-navigation/examples/example-01.php) — render section tabs with Tab_Navigation
- [`modules/tab-navigation/examples/example-02.php`](../../../modules/tab-navigation/examples/example-02.php) — advanced tab-navigation pattern

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-tab-navigation/playground.php`
- Helpers: `wpdev-playground/playground-tab-navigation/functions-playground-tabs.php`
- Admin URL: `admin.php?page=wpdev-pg-tab-navigation&pg_tab=async`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-tabs-nav`, `wpdev-playground-tab-async`, `wpdev-playground-tabs-vertical`, `nav-tab-active`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module declares `tab-navigation` directly; it is pulled in transitively via `admin-page-builder` / `settings-panel-builder`, and list-table `views` render as tabs through it.

- `wpdev-examples/products/src/tables/class-product-list-table.php` — `'views'` config (All/Plans/Packages/Services) rendered as list-table tabs
- `wpdev-examples/sites/src/tables/class-site-list-table.php` — site list `'views'` rendered as tabs

## Example: From production code

From `wpdev-playground/playground-tab-navigation/playground.php` — async and static tab demos via `wpdev_render_tab_navigation_playground_demo()`.

## Notes

- The module is stateless; callers own active tab state.
- Apply capability checks before adding protected tabs to the array.
- Prefer this renderer over bespoke tab markup.

