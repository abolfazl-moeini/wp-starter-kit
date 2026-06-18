# Dashboard widgets

Build KPI/stat cards for WPDev dashboard pages with `admin-widget-builder`.

## APIs

Source: `@framework/modules/admin-widget-builder/src/functions/dashboard-widget.php`  
Cookbook: [api-cookbook.md](api-cookbook.md) — `wpdev_register_dashboard_widget`  
Named datasources (checkout KPIs): [api-cookbook-domain.md](api-cookbook-domain.md) — `wpdev_register_widget_datasource`

```php
wpdev_register_dashboard_widget( string $id, array $config = array(), bool $replace = true ): bool
wpdev_get_dashboard_widget( string $id ): ?array
wpdev_has_dashboard_widget( string $id ): bool
wpdev_list_dashboard_widgets(): array
wpdev_unregister_dashboard_widget( string $id ): void
```

## Register pattern

Register on `wpdev_load`, usually after ensuring the consumer module is loaded.

```php
add_action(
    'wpdev_load',
    static function () {
        if ( ! wpdev_module_is_loaded( 'admin-custom-page' ) ) {
            return;
        }

        wpdev_register_dashboard_widget(
            'wpdev-mrr-growth',
            array(
                'tab'        => 'general',
                'title'      => __( 'Monthly Recurring Revenue Growth', 'wpdev' ),
                'capability' => 'wpdev_read_financial',
                'position'   => 'full',
                'priority'   => 'high',
                'view'       => 'dashboard-statistics/widget-mrr-growth',
                'datasource' => static function () {
                    return array();
                },
            )
        );
    },
    5
);
```

Reference: `@examples/admin-custom-page-dashboard-widgets/setup.php` and `src/register-dashboard-statistics-widgets.php`.

## Config keys

| Key | Purpose |
|-----|---------|
| `tab` | Widget group/tab (`general`, `taxes`, ...) |
| `title` | Widget title |
| `capability` | Visibility gate |
| `position` | `full`, `normal`, `side` |
| `priority` | `high`, `low`, ... |
| `view` | View template path (module view registry) |
| `datasource` | Callback returning template args array |
| `context` | Optional context key for consumers |

## View + datasource contract

- `datasource` should return plain arrays only.
- `view` should be presentational (escape output; avoid heavy queries in templates).
- Keep domain logic in services/managers, not in view files.

Typical views:

- `@framework/modules/admin-widget-builder/views/dashboard-statistics/widget-*.php`
- `@framework/modules/admin-widget-builder/views/dashboard-widgets/*.php`

## Where widgets render

- Dashboard pages in `admin-custom-page` and related consumers.
- Data can depend on date ranges/current page context passed to datasource callback.

## Playground validation

- Demo panel: `@playground/playground-admin-widget-builder/playground.php`
- Admin URL: `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=general`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-dashboard-grid`, `data-wpdev-widget`, `postbox`

## Common mistakes

1. Registering widgets before `wpdev_load`.
2. Using missing `view` paths.
3. Heavy SQL inside template file instead of datasource callback.
4. Forgetting capability for sensitive financial widgets.

