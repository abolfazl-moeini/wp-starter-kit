# Admin pages (List + Edit)

Source base classes in `@framework/modules/admin-page-builder/src/admin/`.

Registration: `wpdev_register_module_admin_pages()` — see [api-cookbook.md](api-cookbook.md).

## List_Admin_Page

**Required override:** `table()` → `Base_List_Table` instance.

| Property | Purpose | Example |
|----------|---------|---------|
| `$id` | Page slug | `'wpdev-products'` |
| `$type` | Menu type | `'submenu'` |
| `$supported_panels` | Context + capability | `array( 'network_admin_menu' => 'wpdev_read_products' )` |

| Method | Purpose |
|--------|---------|
| `get_title()` | Page heading |
| `get_menu_title()` | Sidebar label |
| `action_links()` | Top-right buttons (Add New) |
| `get_labels()` | Search/delete messages |

Lifecycle: instantiated on `wpdev_admin_pages` when `wpdev_module_enabled` is true.

## Edit_Admin_Page

**Required override:** `get_object()` → domain model.

| Property | Purpose |
|----------|---------|
| `$id` | Edit page slug |
| `$object_id` | Entity key |
| `$parent` | `'none'` hides from menu |
| `$highlight_menu_slug` | Keep list menu active |
| `$supported_panels` | Capability map |

| Method | Purpose |
|--------|---------|
| `register_widgets()` | `add_fields_widget`, `add_tabs_widget`, `add_list_table_widget` |
| `handle_save()` | Pre/post save |
| `register_forms()` | Ajax modal forms |

Save: POST → `process_save()` → `handle_save()` → model save.

## Menu pattern (list + edit pair)

| Page | `$type` | `$parent` | Visible |
|------|---------|-----------|---------|
| List | `submenu` | default | Yes |
| Edit | `submenu` | `'none'` | No (direct URL) |

Edit URL: `wpdev_network_admin_url( 'wpdev-edit-{entity}', array( 'id' => $id ) )`.

## Re-register under alternate menu

```php
wpdev_register_admin_page( Product_List_Admin_Page::class, array(
    'parent'  => 'wpdev-playground',
    'context' => 'admin',
) );
```

Source: `@framework/modules/core/src/functions/admin-pages.php`.

## Examples

| Pattern | Path |
|---------|------|
| Minimal list | `@examples/products/src/admin/class-product-list-admin-page.php` |
| Rich edit | `@examples/customers/src/admin/class-customer-edit-admin-page.php` |
| Playground demos | `@playground/playground-admin-page-builder/playground.php` |

Widgets: [fields-and-widgets.md](fields-and-widgets.md). Custom/setting shells: [custom-and-setting-pages.md](custom-and-setting-pages.md).