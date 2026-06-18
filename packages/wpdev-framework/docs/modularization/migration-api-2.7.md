# Migration Guide — Module API 2.7.0

## Summary

WPDev modules now expose a **uniform registry facade** (`wpdev_register_*`, `wpdev_get_*`, `wpdev_has_*`, `wpdev_list_*`, `wpdev_unregister_*`) and support **standalone loading** via `wpdev_load_module()`.

## Breaking / behavior changes

### Gateway resolvers (multi-instance)

**Before:** single global resolver (`Gateway_Resolver_Registry::set()`).

**After:** keyed resolvers:

```php
wpdev_payments_register_gateway_resolver( $resolver, 'default' );
wpdev_payments_gateway_resolver( 'default' );
```

`set()` remains as an alias for id `default`.

### Registry duplicate ids

Registering the same id twice without `$replace = true` triggers `_doing_it_wrong` and keeps the first entry.

### Module dependency discovery

`Module_Loader` parses `dependencies` from each `setup.php` at discover time so `wpdev_load_module( 'metabox-builder' )` resolves the full chain before boot.

## Recommended migrations

| Old pattern | New canonical API |
|-------------|-------------------|
| `Metabox_Registry::register()` | `wpdev_register_metabox()` |
| `Field_Type_Registry::register()` | `wpdev_register_field_type()` (field-builder) |
| Checkout `wpdev_register_field_type( $id, $class )` | **`wpdev_register_checkout_field_type( $id, $class )`** |
| `Dashboard_Widget_Registry::register()` | `wpdev_register_dashboard_widget()` |
| `Widget_Datasource_Registry::register()` | `wpdev_register_widget_datasource()` (unchanged name, added list/has/unregister) |
| `Settings_Section_Registry::register()` | `wpdev_register_settings_section()` |
| Direct `add_action( 'wpdev_load', ... )` | `wpdev_on_load( ... )` optional sugar |
| `Menu_Registry::register()` | `wpdev_register_menu_page()` / `wpdev_register_menu_top()` |
| `Page_Template_Registry::register()` | `wpdev_register_page_template()` |
| `List_Table_Registry::register()` | `wpdev_register_list_table()` |
| `Service_Registry::register()` | `wpdev_register_service()` |

## Documentation per module

Each module directory now includes:

- `playground.php` — TLDR quick start
- `API_DOC.md` — full public API reference

See also [`api-contract.md`](api-contract.md).
