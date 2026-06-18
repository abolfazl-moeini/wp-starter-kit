# WPDev Modules (Framework)

The **framework heart** of WPDev. Each directory is a required module loaded by `WPDevFramework\Core\Module_Loader`.

Removing any folder under `modules/` **may fatal** the site.

## Sibling plugins (optional)

| Plugin | Constant | Purpose |
|--------|----------|---------|
| **wpdev-examples** | `WPDEV_EXAMPLES_DIR` | WaaS domain demos (`wpdev-*` modules, dashboard, products, …) |
| **wpdev-playground** | `WPDEV_PLAYGROUND_DIR` | Dev playground menu (`wpdev-playground`, `wpdev-pg-*` panels) |

Module-local runnable samples live under `modules/{module}/examples/`. Domain WaaS code and playground panels are **not** under `modules/` — they ship in the sibling plugins above.

## Layout

| Layer | Modules |
|-------|---------|
| **Core** | `core` — loader, services, autoloaders, table registry, lifecycle helpers |
| **Builders** | `field-builder`, `form-builder`, `settings-panel-builder`, `menu-builder`, `admin-page-builder`, `tab-navigation`, `table-builder`, `metabox-builder`, `admin-widget-builder` |
| **Production shell** | `admin-custom-page` (dashboard), `admin-setting-page` (settings), `wizard` (setup; Sunrise via `wpdev-domains` example) |

## Boot sequence

1. `wpdev.php` requires `modules/core/setup.php`
2. On `plugins_loaded` (5), `Module_Loader::load_all()` loads `modules/*/setup.php`
3. Optional **`wpdev-examples`** plugin calls `wpdev_load_examples()` on `plugins_loaded` (5)
4. Optional **`wpdev-playground`** plugin boots `Playground_Loader::init()` on `plugins_loaded` (4)
5. On `wpdev_load` / `wpdev_admin_pages`, modules register entities and pages

## Generic module APIs

```php
wpdev_register_module_admin_pages( 'my-module', array( My_Page::class ) );
wpdev_boot_module_manager( 'my-module', My_Manager::class, __DIR__ . '/src/managers/class-my-manager.php' );
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
wpdev_register_ajax_modal( 'targets_display', array( $this, 'render_modal' ) );
```

Legacy `wpdev_module_enabled` filter is still honored for `wpdev-*` example ids via the bridge in `functions-module-managers.php`.

## Filters

| Filter | Default | Purpose |
|--------|---------|---------|
| `wpdev_module_enabled` | `true` | Disable a module's admin pages / managers |
| `wpdev_load_monolith_admin_pages` | `false` | Roll back to monolith admin pages |

## Playground

Requires the active **wpdev-playground** plugin (`defined( 'WPDEV_PLAYGROUND_DIR' )`).

- Shared loader/registry/runtime: `wpdev-playground/includes/playground/`
- Sandbox panels: `wpdev-playground/playground-{module}/playground.php` (discovered by `wpdev_playground_include_panels`)
- Production parity pages come from **wpdev-examples** when both `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are defined

See [`docs/framework/`](../docs/framework/), the [Example & Playground Index](../docs/framework/README.md#example-and-playground-index) (with tiered A/B/C references per module), and the per-module `References` sections in `modules/*/API_DOC.md`.
