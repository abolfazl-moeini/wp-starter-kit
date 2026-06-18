---
name: wpdev-panel-builder
description: >-
  Builds WPDev WordPress multisite admin panels using modules/ and wpdev-examples/.
  Covers CRUD domains, list/edit pages, list tables, managers, DB tables, dashboard
  widgets, settings sections, menu/tabs, custom/setting pages, wizard, ajax modals,
  and playground panels via wpdev_register_* APIs. Use when creating wpdev-examples/*,
  extending List_Admin_Page or Edit_Admin_Page, or registering tables, forms, fields,
  settings, widgets, metaboxes, menus, or playground panels.
---

# WPDev Panel Builder

## Path legend (always use these — never absolute paths)

| Alias | Relative from this skill | Resolves to |
|-------|--------------------------|-------------|
| `@framework` | `../../` | wpdev plugin root (`modules/`, `docs/`) |
| `@examples` | `../../../wpdev-examples/` | WaaS sibling plugin |
| `@playground` | `../../../wpdev-playground/` | Playground sibling plugin |

Manifest logical path `examples/{slug}/` = `@examples/{slug}/`.

## STOP rules (read before writing code)

- **NEVER** guess a function signature — check [api-cookbook.md](references/api-cookbook.md) or `@framework/docs/api/manifest.json`
- **NEVER** add PHP under `inc/`
- **NEVER** create `@examples/wpdev-{slug}/` folders (use `@examples/{slug}/`)
- **NEVER** put playground panels inside `@examples/` (use `@playground/playground-{module}/`)
- **NEVER** `require` non-API files from `modules/*/src/`
- **ALWAYS** check `wpdev_example_is_loaded( 'wpdev-{slug}' )` before cross-example calls
- **ALWAYS** use module id `wpdev-{slug}` in registration APIs; folder slug `{slug}` under `@examples/`

## Decision tree

| # | Question | Yes → | No → |
|---|----------|-------|------|
| 1 | Need DB + list + edit + manager? | [domain-crud-panel.md](references/domain-crud-panel.md) | 2 |
| 2 | Settings section/fields only? | [settings-panel.md](references/settings-panel.md) | 3 |
| 3 | Dashboard KPI/stat widgets? | [dashboard-widgets.md](references/dashboard-widgets.md) | 4 |
| 4 | Dev sandbox/demo panel? | [playground.md](references/playground.md) | 5 |
| 5 | Checkout/gateway/payment flow? | [api-cookbook-domain.md](references/api-cookbook-domain.md) + `@examples/checkout/` | [examples-map.md](references/examples-map.md) |

**Also:** menu/tabs → [menu-and-tabs.md](references/menu-and-tabs.md); custom dashboard / settings shell → [custom-and-setting-pages.md](references/custom-and-setting-pages.md); setup wizard → [wizard.md](references/wizard.md).

## Panel type selection

| Goal | Read | Copy from |
|------|------|-----------|
| Full WaaS domain CRUD | [domain-crud-panel.md](references/domain-crud-panel.md) | `@examples/products/` |
| Pick example family | [examples-map.md](references/examples-map.md) | `@examples/*/setup.php` |
| List/edit pages | [admin-pages.md](references/admin-pages.md) | `@examples/products/src/admin/` |
| List tables | [list-tables.md](references/list-tables.md) | `@examples/products/src/tables/` |
| Edit widgets, modals | [fields-and-widgets.md](references/fields-and-widgets.md) | `@examples/customers/src/admin/` |
| Dashboard widgets | [dashboard-widgets.md](references/dashboard-widgets.md) | `@examples/admin-custom-page-dashboard-widgets/` |
| Settings sections | [settings-panel.md](references/settings-panel.md) | `@examples/admin-setting-page-defaults/` |
| Playground panel | [playground.md](references/playground.md) + [playground-index.md](references/playground-index.md) | `@playground/playground-{module}/` |
| Model/DB/manager | [model-db-manager.md](references/model-db-manager.md) | `@examples/products/src/` |
| Non-CRUD patterns | [example-types.md](references/example-types.md) | `@examples/checkout/`, `@examples/customer-panel/` |
| UI polish | [ui-polish.md](references/ui-polish.md) | `@framework/modules/*/views/` |
| Unknown API | [finding-apis.md](references/finding-apis.md) + [api-cookbook.md](references/api-cookbook.md) | `@framework/docs/api/manifest.json` |
| Anti-patterns | [anti-patterns.md](references/anti-patterns.md) | — |

## Essential APIs (copy snippets; full cookbook has all symbols)

### Lifecycle

```php
wpdev_on_load( static function () { /* wpdev_register_* here */ }, 10 );
wpdev_on_admin_pages( static function () { /* page rebinding */ }, 10 );
// Hooks: wpdev_init | wpdev_load | wpdev_admin_pages | wpdev_register_forms | wpdev_modules_loaded
```

### Module boot

```php
Module_Loader::register( 'wpdev-products', array(
    'path' => __DIR__,
    'dependencies' => array( 'core', 'admin-page-builder', 'table-builder', 'metabox-builder', 'field-builder' ),
) );
wpdev_boot_module_manager( 'wpdev-products', Product_Manager::class, __DIR__ . '/src/managers/class-product-manager.php' );
add_action( 'wpdev_load', static fn() => wpdev_require_public_function( 'product' ), 1 );
```

### Pages + storage

```php
wpdev_register_module_admin_pages( 'wpdev-products', array( Product_List_Admin_Page::class, Product_Edit_Admin_Page::class ) );
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
wpdev_register_module_views( 'wpdev-checkout' );
```

List UI: override `List_Admin_Page::table()` → `return new Product_List_Table();` (not `wpdev_register_list_table()` for domain CRUD).

Edit UI widgets on `Edit_Admin_Page::register_widgets()`:

```php
$this->add_fields_widget( 'general', array( 'title' => __( 'General', 'wpdev' ), 'fields' => array( /* ... */ ) ) );
$this->add_tabs_widget( 'options', array( 'title' => __( 'Options', 'wpdev' ), 'sections' => array( /* ... */ ) ) );
$this->add_list_table_widget( 'items', array( 'title' => __( 'Items', 'wpdev' ), 'table' => new Items_List_Table() ) );
```

### Fields, forms, ajax

```php
wpdev_register_field_type( 'my_type', array( 'class' => My_Field_Template::class ), true );
wpdev_register_form( 'add_note', array( 'title' => __( 'Add Note', 'wpdev' ), 'fields' => array(), 'handler' => array( $this, 'handle_add_note' ) ) );
wpdev_modal_open( 'add_note', array( 'entity_id' => $id ) );
wpdev_register_ajax_handler( 'my_action', static function () {
    wpdev_ajax_success( array( 'message' => __( 'Saved.', 'wpdev' ) ) );
} );
```

### Settings

```php
wpdev_register_settings_section( 'my_addon', array( 'title' => __( 'My Add-on', 'wpdev' ), 'icon' => 'dashicons-admin-generic' ) );
wpdev_register_settings_field( 'my_addon', 'api_key', array( 'type' => 'text', 'title' => __( 'API Key', 'wpdev' ) ) );
$value = wpdev_get_setting( 'api_key', '' );
wpdev_save_setting( 'api_key', sanitize_text_field( $value ) );
```

### Widgets, menu, metabox

```php
wpdev_register_dashboard_widget( 'wpdev-mrr', array( 'tab' => 'general', 'title' => __( 'MRR', 'wpdev' ), 'view' => 'dashboard-statistics/widget-mrr', 'datasource' => static fn() => array() ) );
wpdev_register_menu_top( 'my-plugin', array( 'title' => __( 'My Plugin', 'wpdev' ), 'capability' => 'manage_options', 'callback' => 'my_render' ) );
wpdev_register_metabox( 'wpdev-edit-product', 'pricing', array( 'title' => __( 'Pricing', 'wpdev' ), 'callback' => array( $this, 'render_pricing' ) ) );
```

### Playground + soft deps

```php
if ( ! defined( 'WPDEV_PLAYGROUND_DIR' ) ) { return; }
wpdev_register_playground_panel( 'wpdev-products', wpdev_playground_list_panel( 'wpdev-products', 'WaaS Products' ) );
if ( wpdev_example_is_loaded( 'wpdev-products' ) ) { /* cross-example call */ }
if ( wpdev_module_is_loaded( 'admin-custom-page' ) ) { /* widget registration */ }
```

Uniform registry facade: `wpdev_register_{entity}`, `wpdev_get_{entity}`, `wpdev_has_{entity}`, `wpdev_list_{entity}`, `wpdev_unregister_{entity}`. Metaboxes: `wpdev_register_metabox( $page_id, $metabox_id, $config )`.

## Two-tier example strategy

| Tier | Plugin | Use for | Path |
|------|--------|---------|------|
| **Minimal** | `@playground` | Learn one API; smoke test | `@playground/playground-{module}/playground.php` |
| **Full** | `@examples` | Production WaaS pattern | `@examples/products/` (CRUD gold standard) |

## Quality checklist

- [ ] Capabilities on `$supported_panels` match action caps
- [ ] Edit page: `$parent = 'none'`, `$highlight_menu_slug` = list page id
- [ ] List table: `$query_class` set; `get_columns()` + `column_*()` implemented
- [ ] DB tables in `setup.php`; list table instantiated in `table()`
- [ ] Ajax: `wpdev_register_ajax_handler()` + `wpdev_ajax_success()` / `wpdev_ajax_error()`
- [ ] Playground in `@playground/` with `WPDEV_PLAYGROUND_DIR` guard

See [anti-patterns.md](references/anti-patterns.md) for common mistakes.

## Additional resources

| Resource | Path |
|----------|------|
| API manifest | `@framework/docs/api/manifest.json` |
| Panel API cookbook | [references/api-cookbook.md](references/api-cookbook.md) |
| Domain API cookbook | [references/api-cookbook-domain.md](references/api-cookbook-domain.md) |
| Playground index | [references/playground-index.md](references/playground-index.md) |
| Module guides | `@framework/docs/framework/README.md` |
| Panel skill references | [references/](references/) |