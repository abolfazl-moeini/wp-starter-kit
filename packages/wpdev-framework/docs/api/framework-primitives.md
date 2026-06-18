# Framework primitives reference

> Generated reference for base classes and core helpers requested for AI ingestion.  
> Source paths are under `modules/`. Examples usage counts come from `docs/api/inventory/`.

---

## Admin page base classes

### `WPDevFramework\Admin_Pages\Base_Admin_Page`

| | |
|--|--|
| **Source** | `modules/admin-page-builder/src/admin-pages/class-base-admin-page.php` |
| **Role** | Abstract admin page shell: menu registration, capability gating, layout hooks, supported panels |
| **Lifecycle** | Instantiated on `wpdev_admin_pages`; emits `wpdev_page_{id}_load` and layout hooks |
| **Extend** | Subclass for custom pages; override `get_id()`, `get_title()`, capability methods, render callbacks |
| **Registration** | `wpdev_register_module_admin_pages( $module_id, [ My_Page::class ] )` or `wpdev_register_admin_page()` for rebinding |
| **Common mistakes** | Hardcoding menu slugs instead of `get_id()`; skipping capability checks on ajax handlers |

### `WPDevFramework\Admin_Pages\List_Admin_Page`

| | |
|--|--|
| **Source** | `modules/admin-page-builder/src/admin-pages/class-list-admin-page.php` |
| **Role** | List/table admin page with integrated list table, views/tabs, bulk actions |
| **Extend** | Override table factory, views, bulk handlers; pair with `wpdev_register_table()` |
| **Hooks consumed** | `wpdev_admin_pages`, table ajax hooks, screen options |
| **Example usage** | WaaS list pages in `examples/*/src/admin/` |

### `WPDevFramework\Admin_Pages\Edit_Admin_Page`

| | |
|--|--|
| **Source** | `modules/admin-page-builder/src/admin-pages/class-edit-admin-page.php` |
| **Role** | Create/edit object pages with metabox widgets, save handlers, form integration |
| **Extend** | Override field widgets, save logic, model binding; use metabox-builder widgets |
| **Hooks consumed** | `wpdev_edit_admin_page_labels`, form/modal services |
| **Example usage** | Product/customer edit pages; playground metabox demos |

---

## Data layer

### `WPDevFramework\Database\Engine\Table`

| | |
|--|--|
| **Source** | `modules/core/src/database/engine/class-table.php` |
| **Role** | Schema definition and CRUD for custom tables (columns, indexes, versioning) |
| **Constructor** | Table name, schema array, db version key |
| **Extend** | Subclass per domain table; register migrations on module boot |
| **Side effects** | May run dbDelta on upgrade |

### `WPDevFramework\Database\Post_Query`

| | |
|--|--|
| **Source** | `modules/core/src/database/class-post-query.php` |
| **Role** | Typed query helper over WP posts/meta for domain models |
| **Usage** | `new Post_Query( $post_type, $args )` in managers and list tables |

### `WPDevFramework\Database\Posts\Posts_Meta_Table`

| | |
|--|--|
| **Source** | `modules/core/src/database/posts/class-posts-meta-table.php` |
| **Role** | Meta-backed pseudo-table for post types with structured meta columns |
| **Usage** | Domain modules storing entity fields in post meta with table-like API |

---

## Models

### `WPDevFramework\Models\Base_Model`

| | |
|--|--|
| **Source** | `modules/core/src/models/class-base-model.php` |
| **Role** | Active-record style wrapper for custom tables or structured storage |
| **Extend** | Define `$table`, `$columns`, validation; implement save/load/delete |
| **Hooks** | Domain-specific save hooks in subclass or manager |

### `WPDevFramework\Models\Post_Base_Model`

| | |
|--|--|
| **Source** | `modules/core/src/models/class-post-base-model.php` |
| **Role** | Model binding to a WP post type + meta map |
| **Extend** | Map meta keys, caps, and admin page integration |

---

## UI / form primitives

### `WPDevFramework\Form\Base_Field_Template`

| | |
|--|--|
| **Source** | `modules/field-builder/src/class-base-field-template.php` |
| **Role** | Field type template: sanitize, render, settings schema |
| **Extend** | Register via `wpdev_register_field_type()`; implement render for contexts `settings`, `admin`, `checkout` |
| **Render helper** | `wpdev_field_view( $context, $type, $args )` |

### `WPDevFramework\Managers\Base_Manager`

| | |
|--|--|
| **Source** | `modules/core/src/managers/class-base-manager.php` |
| **Role** | Singleton domain manager with hook registration helper |
| **Extend** | `boot()` on `wpdev_load`; register hooks, ajax, REST |

### `WPDevFramework\UI\Base_Element`

| | |
|--|--|
| **Source** | `modules/admin-widget-builder/src/ui/class-base-element.php` |
| **Role** | Reusable admin UI element/block with render + asset hooks |
| **Extend** | Register element views; used by dashboard widgets and checkout UI |

---

## Core framework classes (requested set)

### `WPDevFramework\Scripts`

| | |
|--|--|
| **Source** | `modules/core/src/class-scripts.php` |
| **Role** | Central script/style enqueue registry for WPDev admin |
| **Entry points** | Static helpers called from services and page classes |
| **Used in examples** | Yes — admin boot and playground panels |

### `WPDevFramework\Current`

| | |
|--|--|
| **Source** | `modules/core/src/class-current.php` |
| **Role** | Request context helper (current page, tab, network vs site admin) |
| **Used in examples** | Yes — dashboard and list pages |

### `WPDevFramework\Settings`

| | |
|--|--|
| **Source** | `modules/settings-panel-builder/src/class-settings.php` (legacy bridge) |
| **Role** | Settings read/write facade; prefer `Settings_Storage` + registry APIs |
| **Used in examples** | Rare — mostly `class_exists` guards; document as framework-public |

### `WPDevFramework\Admin_Notices`

| | |
|--|--|
| **Source** | `modules/core/src/class-admin-notices.php` |
| **Role** | Network/site admin notice queue |
| **Used in examples** | Not directly referenced; use for user-facing admin messages |

---

## Registry families (`wpdev_register_*`)

| Family | Module | Function |
|--------|--------|----------|
| Forms | `form-builder` | `wpdev_register_form()` |
| Fields | `field-builder` | `wpdev_register_field_type()`, `wpdev_register_settings_field()` |
| Tables | `table-builder` | `wpdev_register_table()` |
| Settings sections | `settings-panel-builder` | `wpdev_register_settings_section()` |
| Admin pages | `admin-page-builder` | `wpdev_register_module_admin_pages()` |
| Dashboard widgets | `admin-widget-builder` | `wpdev_register_dashboard_widget()` |
| Metaboxes | `metabox-builder` | `wpdev_register_metabox()` |
| Menus | `menu-builder` | `wpdev_register_menu()` |
| Playground panels | `core` | `wpdev_register_playground_panel()` |
| Ajax | `core` | `wpdev_register_ajax_handler()` |

---

## Lifecycle quick reference

| Hook | Type | When |
|------|------|------|
| `wpdev_init` | action | Early service boot |
| `wpdev_load` | action | Module registration (`wpdev_register_*`) |
| `wpdev_admin_pages` | action | Admin page class instantiation |
| `wpdev_modules_loaded` | action | All modules loaded |
| `wpdev_register_forms` | action | Form/modal registration |
| `wpdev_module_enabled` | filter | Enable/disable module runtime |

See colocated module docs for param/return contracts and playground acceptance markers.
