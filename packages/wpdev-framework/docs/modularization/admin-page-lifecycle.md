# Admin Page Lifecycle Hooks (K4-003)

Base admin pages fire hooks during registration, load, and render.

## Registration (`Base_Admin_Page::__construct`)

- Menu hook: `network_admin_menu` / `admin_menu` / `user_admin_menu`
- `Menu_Registry::register()` — page metadata
- `Capability_Registry::register_page()` — panel capabilities

## Page load

| Hook | When |
|------|------|
| `load-{page_hook}` | Before render; screen options, assets |
| `wpdev_admin_page_{$page_id}_load` | Early on `load-{page_hook}` (K4-09) |
| `{page_hook}` | Render callback (`display()` → `output()`) |

## Per-page extension hooks

Pattern: `wpdev_admin_page_{$page_id}_*`

| Hook | When |
|------|------|
| `wpdev_admin_page_{$id}_load` | Page load; register assets, ajax handlers |
| `wpdev_admin_page_{$id}_render` | Custom template body (`base/custom.php`) |
| `wpdev_page_{$id}_before_render` | Legacy; before `output()` |
| `wpdev_page_{$id}_after_render` | Legacy; after `output()` |

Examples used in codebase:

- `wpdev_admin_page_{$id}_action_links` — filter action links
- Settings: `wpdev_render_settings`
- Customer-facing: `wpdev_customer_facing_page_{$id}_fields`
- Admin bar: `wpdev_admin_bar_menu` — extend top-bar shortcuts (K4-03)

## Menu declarative API (K4-01)

Third-party plugins can register admin pages without subclassing `Base_Admin_Page`:

```php
\WPDevFramework\Modules\MenuBuilder\Menu_Registry::register_top( 'my_plugin', array(
    'title'      => 'My Plugin',
    'menu_label' => 'My Plugin',
    'capability' => 'manage_options',
    'callback'   => 'my_plugin_admin_page',
    'icon'       => 'dashicons-admin-generic',
    'network'    => true,
) );

\WPDevFramework\Modules\MenuBuilder\Menu_Registry::register_child( 'my_plugin', 'my_plugin_settings', array(
    'title'      => 'Settings',
    'capability' => 'manage_options',
    'callback'   => 'my_plugin_settings_page',
) );
```

`Base_Admin_Page::add_menu_page()` also records pages in `Menu_Registry` for introspection (K4-02).

## Template resolution

Layout types resolve via `Page_Template_Registry`:

| Type | Default view |
|------|----------------|
| `list` | `base/list` |
| `edit` | `base/edit` |
| `wizard` | `base/wizard` |
| `settings` | `base/settings` |
| `addons` | `base/addons` |
| `addons-ajax-tabs` | `base/addons-ajax-tabs` (Vue catalog grid; `data-tab-group` + `Ajax_Tab_Loader`) |
| `custom` | `base/custom` (callback-only body via `wpdev_admin_page_{$id}_render`) |

Override at runtime:

```php
\WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry::register( 'list', 'my-plugin/custom-list' );
```

## List tables on edit pages

Widget tables must use scoped ajax ids — see `table-id-audit.md`.
