# Menu builder and tab navigation

Use when registering custom admin menus or tabbed list/settings screens.

## menu-builder

**Module:** `@framework/modules/menu-builder/`  
**Doc:** `@framework/modules/menu-builder/API_DOC.md`  
**Playground:** `@playground/playground-menu-builder/playground.php` → `admin.php?page=wpdev-pg-menu-builder`

### wpdev_register_menu_top

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_menu_top( string $slug, array $args )` |
| Hook | `wpdev_load` via `wpdev_on_load()` |
| When | Custom top-level admin menu |
| Full example | `@framework/modules/menu-builder/examples/example-01.php` |

```php
wpdev_on_load( static function () {
    wpdev_register_menu_top( 'my-plugin', array(
        'title'      => __( 'My Plugin', 'wpdev' ),
        'capability' => 'manage_options',
        'callback'   => 'my_plugin_render_dashboard',
        'icon'       => 'dashicons-admin-generic',
        'position'   => 58,
    ) );
} );
```

### wpdev_register_menu_child

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_menu_child( string $parent_slug, string $slug, array $args )` |
| When | Child item under existing menu |

```php
wpdev_register_menu_child( 'my-plugin', 'my-plugin-settings', array(
    'title'      => __( 'Settings', 'wpdev' ),
    'capability' => 'manage_options',
    'callback'   => 'my_plugin_render_settings',
) );
```

### wpdev_register_menu_page

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_menu_page( string $page_slug, array $config = array(), bool $replace = true )` |
| When | Store menu metadata by slug before WordPress hooks run |

Registry helpers: `wpdev_get_menu_page()`, `wpdev_has_menu_page()`, `wpdev_list_menu_pages()`, `wpdev_unregister_menu_page()`.

**WaaS examples:** `@examples/products/`, `@examples/sites/` (menus via admin page classes).

## tab-navigation

**Module:** `@framework/modules/tab-navigation/`  
**Doc:** `@framework/modules/tab-navigation/API_DOC.md`  
**Playground:** `@playground/playground-tab-navigation/playground.php` → `admin.php?page=wpdev-pg-tab-navigation`

### wpdev_render_tab_navigation

| Field | Value |
|-------|-------|
| Signature | `wpdev_render_tab_navigation( array $tabs, string $active = '' )` — VERIFY_IN_SOURCE |
| When | Shared tab markup on settings, list views, wizard-like screens |
| Full example | `@framework/modules/tab-navigation/examples/example-01.php` |

```php
wpdev_render_tab_navigation( array(
    'general' => __( 'General', 'wpdev' ),
    'billing' => __( 'Billing', 'wpdev' ),
), 'general' );
```

List table view tabs: set `'views'` in `Base_List_Table::declarative_table_config()` — see [list-tables.md](list-tables.md).

**WaaS examples:** `@examples/products/` (list views), `@examples/sites/`.