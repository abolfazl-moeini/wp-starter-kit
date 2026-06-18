# Finding and verifying APIs

When a WPDev function, hook, or class is unknown, follow this order. **Never guess signatures.**

## Read order

1. **[api-cookbook.md](api-cookbook.md)** or **[api-cookbook-domain.md](api-cookbook-domain.md)** — signature + snippet + example path
2. **`@framework/docs/api/manifest.json`** — search symbol name
   - `doc` → `API_DOC.md` anchor
   - `source` → implementing PHP file
   - `usage.examples` → logical `@examples/` paths
   - `status` → `complete`, `partial`, `missing`
3. **Module `API_DOC.md`** — full contract
4. **Source file** — grep `function wpdev_{name}` or `class {Name}`
5. **`@framework/docs/api/inventory/*.json`** — usage counts
6. **`@framework/docs/api/framework-primitives.md`** — base classes
7. **Nearest example** — `@examples/{slug}/` or `@framework/modules/{module}/examples/`

## manifest.json lookup

From skill root (`skills/wpdev-panel-builder/`):

```bash
rg '"name": "wpdev_register_form"' ../../docs/api/manifest.json
```

Sample entry:

```json
{
  "name": "wpdev_register_form",
  "owner": "form-builder",
  "doc": "modules/form-builder/API_DOC.md#wpdev_register_form",
  "source": "modules/form-builder/src/functions/form.php",
  "usage": { "examples": ["@examples/checkout/setup.php"] },
  "status": "complete"
}
```

Manifest logical path `examples/{slug}/` maps to alias `@examples/{slug}/`.

## Function loader map

`@framework/modules/core/src/functions/module-require.php`

```php
wpdev_public_function_map();
wpdev_require_public_function( $basename );
```

## Register facade quick index

| Entity | Register | Cookbook section |
|--------|----------|------------------|
| DB table | `wpdev_register_table` | [api-cookbook.md](api-cookbook.md) A |
| Admin pages | `wpdev_register_module_admin_pages` | A |
| Manager | `wpdev_boot_module_manager` | A |
| Ajax | `wpdev_register_ajax_handler` | A + D |
| Playground | `wpdev_register_playground_panel` | A + F |
| List table UI | `wpdev_register_list_table` | A (optional global) |
| Field type | `wpdev_register_field_type` | A |
| Form / modal | `wpdev_register_form`, `wpdev_modal_open` | A + D |
| Ajax modal | `wpdev_register_ajax_modal` | A + D |
| Settings | `wpdev_register_settings_section`, `wpdev_register_settings_field` | A + C |
| Metabox | `wpdev_register_metabox` | A |
| Menu | `wpdev_register_menu_top`, `wpdev_register_menu_child` | A |
| Dashboard widget | `wpdev_register_dashboard_widget` | A |
| Page template | `wpdev_register_page_template` | A |
| Gateway/checkout/events | domain APIs | [api-cookbook-domain.md](api-cookbook-domain.md) |

## Grep recipes

From skill root:

```bash
rg "function wpdev_register_form\s*\(" ../../modules/
rg "add_action\s*\(\s*'wpdev_load'" ../../../wpdev-examples/
rg "extends List_Admin_Page" ../../../wpdev-examples/
rg "wpdev_register_settings_field" ../../docs/
```

## Base class source

| Class | Path |
|-------|------|
| `List_Admin_Page` | `@framework/modules/admin-page-builder/src/admin/class-list-admin-page.php` |
| `Edit_Admin_Page` | `@framework/modules/admin-page-builder/src/admin/class-edit-admin-page.php` |
| `Base_List_Table` | `@framework/modules/table-builder/src/table/class-base-list-table.php` |
| `Base_Model` | `@framework/modules/core/src/Model/class-base-model.php` |
| `Table` | `@framework/modules/core/src/Database/engine/class-table.php` |

## When docs disagree with source

**Source wins.** Implement from source; fix stale `API_DOC.md` separately.

## Regenerating API docs

When doc tooling is available in your environment, regenerate `@framework/docs/api/manifest.json` after API changes. This repo has no `composer.json` — use manual `rg` validation from skill root.