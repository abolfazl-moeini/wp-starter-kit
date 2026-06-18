# UI polish patterns

Production-grade panels — not only functional.

## Page templates

```php
wpdev_register_page_template( 'list', 'base/list' );
wpdev_register_page_template( 'edit', 'base/edit' );
$view = wpdev_resolve_page_template( 'edit', 'base/edit' );
```

Source: `@framework/modules/admin-page-builder/src/functions/page-template.php` — [api-cookbook.md](api-cookbook.md).

## Module views

```php
wpdev_register_module_views( 'wpdev-checkout' );
```

Source: `@framework/modules/core/src/functions-module-assets.php`.

## Widget composition on edit pages

- `add_fields_widget()`
- `add_tabs_widget()`
- `add_list_table_widget()`
- `add_save_widget()` where applicable

See [fields-and-widgets.md](fields-and-widgets.md).

## Empty states and action links

```php
'empty_state' => array(
    'sub_message' => __( 'Create your first product to get started.', 'wpdev' ),
)
```

List page `action_links()` for quick create.

## View/data separation

- Data in datasource callbacks or managers
- Views presentational with escaped output

References:

- `@framework/modules/admin-widget-builder/views/dashboard-statistics/*.php`
- `@examples/*/views/**`

## Capability-aware UI

- Page: `$supported_panels`
- Widget: `capability` config
- Field: `capability` in settings/field config

## Standard assets

Enqueue known handles (list-table, `wubox`, wpdev ajax). Playground: `assets` key in `wpdev_register_playground_panel()`.

## Acceptance markers

Stable DOM markers for playground smoke tests — `acceptance_markers` in panel config.

## Proven references

| Pattern | Path |
|---------|------|
| Dashboard widgets | `@examples/admin-custom-page-dashboard-widgets/src/register-dashboard-statistics-widgets.php` |
| Rich edit page | `@examples/customers/src/admin/class-customer-edit-admin-page.php` |
| Field templates | `@framework/modules/field-builder/views/admin-pages/fields/` |
| Empty state | `@framework/modules/core/views/base/empty-state.php` |