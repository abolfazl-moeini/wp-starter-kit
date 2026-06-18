# Developer Migration Guide (Phase I)

**AI onboarding:** See [AI-PROJECT-CONTEXT.md](./AI-PROJECT-CONTEXT.md) for full project structure, modularization goals, and agent rules.

**API reference index:** Generated docs for AI ingestion live under [`docs/api/`](../api/README.md) (`manifest.json`, framework primitives, examples usage map).

## Framework vs examples (2.8.0+)

Runtime code is split into two trees:

| Tree | Path | Role |
|------|------|------|
| **Framework** | `modules/` (14 modules) | Required builders, core, wizard — fatal if removed |
| **Examples** | `examples/` | Optional WaaS domains, playground panels, demo modules — delete-safe |

Boot order: `Module_Loader` loads `modules/` on `plugins_loaded`; `Examples_Loader` loads enabled `examples/*` on `wpdev_modules_loaded`; optional examples register via `wpdev_load_examples()`.

Generic APIs (replace removed `wpdev_*` function shims):

| Legacy | Current |
|--------|---------|
| `wpdev_register_admin_pages()` | `wpdev_register_module_admin_pages()` |
| `wpdev_boot_manager()` | `wpdev_boot_module_manager()` |
| `wpdev_module_enabled` filter | `wpdev_module_enabled` (bridge still honors legacy filter for `wpdev-*` ids) |

Regression gates:

```bash
composer ci                      # smoke, audits, PHPUnit (no WordPress)
composer regression:docker       # multisite bootstrap + 9 network pages + playground sign-off
composer audit:stale-wpdev-paths  # no modules/wpdev-* path references in PHP/lang
composer audit:example-apis      # examples use framework APIs, not duplicate loaders
```

The production dashboard (`page=wpdev`) is **site-admin only**. Automated network admin regression covers **nine** reference slugs (`wpdev-settings` through `wpdev-addons`).

See also [`release-2.8.0-notes.md`](release-2.8.0-notes.md) for upgrade steps.

## Enabling the module loader

The loader is enabled by default via `modules/core/setup.php` required from `wp-dev.php`.

## Domain admin pages (2.4.0+)

WaaS admin pages register through `wpdev_register_module_admin_pages()` in each `examples/*/setup.php`. The monolith block in `modules/core/src/class-wpdev.php::load_admin_pages()` is **off** by default.

Rollback (temporary):

```php
add_filter( 'wpdev_load_monolith_admin_pages', '__return_true' );
```

Disable one domain module:

```php
add_filter( 'wpdev_module_enabled', function ( $enabled, $module_id ) {
    if ( 'wpdev-broadcasts' === $module_id ) {
        return false;
    }
    return $enabled;
}, 10, 2 );
```

## Automated checks (2.5.0+)

From plugin root:

```bash
composer test              # PHPUnit (module loader, autoload, smoke)
composer smoke             # inc/ PHP-free, setup.php syntax, module assets/views
composer audit:inc         # No direct inc/ requires in bootstrap
composer audit:shims       # inc/ shim count must be 0 (Phase 2.9 complete)
composer audit:legacy-shim # Root WPDev classes in Legacy_Shim map (no inc/ shims)
composer audit:inc-functions # Public function map; inc/functions/ absent
composer audit:inc-schemas   # REST schemas under modules/core only
composer audit:inc-pilot11   # Final pilot: inc/ PHP-free + autoload smoke
composer audit:lang-inc      # No stale inc/ paths in lang/*.po|pot
composer audit:stale-wpdev-paths # No modules/wpdev-* paths (use examples/*)
composer audit:example-apis   # Example modules use generic framework APIs
composer audit:phpdoc-inc    # No @see inc/ in modules/
composer docs:generate       # Regenerate docs/modularization/*-inventory.md
composer profile:modules     # Module load ms (run in WP/Docker)
composer audit:shim-removal  # Full Phase 2.9 readiness gate
composer audit:shim-refs     # No wpdev_path('inc/...') in runtime modules/bin
composer audit:p3          # List-table abort + single wpdev-vue register
composer regression:p2:docker # Full P2 in Docker (recommended)
composer regression:p2       # Host P2 when wp-load + DB are local
composer ci                  # CI-safe: smoke, audits, PHPUnit (no wp-load)
composer audit:playground    # Every module has render-type playground panel
composer regression:playground # Site-admin playground render smoke (needs wp-load + WPDEV_PLAYGROUND_RUN)
composer regression:playground:signoff # Audits + PHPUnit + render/HTTP when WP bootstrap is healthy
composer pre-release         # ci + release:gate (+ RUN_DOCKER=1 for Docker regressions)
composer release:gate        # Phase 2.9 complete + full P2 (pre-tag; needs WP for wp-load step)
composer regression:wp       # WP bootstrap (run inside site container — see below)
```

## Playground demo menu (2.7.0+, dev-only)

For local module exploration without visiting network-admin WaaS screens:

1. Define `WPDEV_PLAYGROUND_RUN` in `wp-config.php` **or** activate `examples/wpdev-playground-sample/`.
2. Open **Site Admin → WPDev Playground** (never network admin).
3. **Production parity (default):** in-scope WaaS list/edit pages register the **same** production admin page classes under **`wpdev`** (site admin) via `wpdev_register_admin_page()` and `Playground_Parity_Registry` — URLs use real slugs (`wpdev-products`, not `wpdev-pg-wpdev-products`). Dashboard/settings already live under `wpdev` at default priority. **WPDev Playground** keeps landing + `wpdev-pg-*` sandboxes only. The production dashboard (`page=wpdev`) is **site-admin only**; network admin regression covers the nine WaaS/settings slugs.
4. **Builder sandboxes:** core builder modules still use `wpdev-pg-*` sandbox panels for isolated API demos.

Register a production page elsewhere:

```php
wpdev_register_admin_page( \WPDevFramework\Admin_Pages\Product_List_Admin_Page::class, array(
    'parent'      => 'my-menu',
    'type'        => 'submenu',
    'context'     => 'admin', // admin | network | both
    'capability'  => 'wpdev_read_products',
    'module_id'   => 'wpdev-products',
), 100 );
```

Settings in site admin use `get_option` / `update_option` with the same slugified keys as network (`wpdev_get_option` / `wpdev_save_option` in `settings-panel-builder`).

Regenerate all `playground.php` files after editing descriptors:

```bash
composer scaffold:modules
composer audit:playground
```

See [`playground-inventory.md`](playground-inventory.md) and [`api-contract.md`](api-contract.md#playground-demo-menu-dev-only).

**Multisite sunrise (required when `SUNRISE` is true):**

After upgrading to 2.5.0, `Sunrise::manage_sunrise_updates()` (on `wpdev_init`) copies the plugin `sunrise.php` to `wp-content/` when `WPDEV_SUNRISE_VERSION` is below **2.5.0**. You can also copy manually:

```bash
cp wp-content/plugins/wpdev/sunrise.php wp-content/sunrise.php
composer audit:sunrise
```

**Docker (local multisite at `localhost:8080`):**

```bash
composer regression:docker
# Optional HTTP checks:
WPDEV_REGRESSION_PASSWORD=your-super-admin-password composer regression:docker
WPDEV_DOCKER_ENSURE_SETUP=1 composer regression:docker   # sets wpdev_setup_finished for full admin checks
```

Manual admin page checks still require an authenticated network admin session — see `regression-checklist.md`.

**i18n / PHPDoc maintenance (one-off, already applied in 2.5.0):**

```bash
php bin/rewrite-lang-inc-references.php      # #: inc/ → modules/; modules/wpdev-* → examples/* in lang/*.po|pot
php bin/rewrite-phpdoc-inc-references.php    # @see inc/ → modules/ in module PHP
```

## Accessing services

```php
$ajax = wpdev_services( 'ajax' );
$ajax->listen( 'my_action', 'my_callback' );

wpdev_services( 'form' )->register( 'my_form', array(
    'title' => 'My Form',
) );

wpdev_view( 'base/list', array( 'items' => $items ) );
```

## Namespace mapping

| Legacy | New |
|--------|-----|
| `WPDevFramework\UI\Field` | `WPDevFramework\Modules\FieldBuilder\Field` (alias) |
| `WPDevFramework\UI\Form` | `WPDevFramework\Modules\FormBuilder\Form` (alias) |
| `WPDevFramework\List_Tables\Base_List_Table` | `WPDevFramework\Modules\TableBuilder\Base_List_Table` (alias) |

## Module dependencies

Declare in `setup.php`:

```php
Module_Loader::register( 'my-module', array(
    'path'         => __DIR__,
    'dependencies' => array( 'core', 'admin-page-builder' ),
) );
```

## AJAX handlers (phase J)

Prefer the public helpers over raw `add_action( 'wp_ajax_*' )`:

```php
wpdev_require_public_function( 'ajax' );

wpdev_register_ajax_handler( 'my_action', array( $this, 'handle_my_action' ), array(
    'transport' => 'admin', // admin | light | both | nopriv (logged-out only)
    'nopriv'    => false,   // also register wp_ajax_nopriv_* when transport is admin/both
    'priority'  => 10,
    'accepted_args' => 1,
) );

wpdev_register_ajax_tabs( 'my-page-id', array( $this, 'render_tab' ) );
$url = wpdev_ajax_tab_url( 'my-page-id', 'billing' );
```

New handlers should respond with `wpdev_ajax_success()` / `wpdev_ajax_error()`
(or `Ajax_Response` directly) so `window.wpdev.ajax` receives the
`{ success, code, message, data }` envelope. Migrate existing `wp_send_json_*`
handlers gradually; legacy jQuery handlers can keep `wp_send_json_success()` until
their JS moves to `wpdev.ajax`.

## Domain modules (phase L)

`wpdev-*` modules should stay thin:

- **Registration only** in `setup.php` (`wpdev_register_module_admin_pages`, table configs, forms).
- **No ad-hoc HTML/AJAX** in page classes — use `table-builder`, `form-builder`, `Modal_Service`, `Ajax_Service`.
- **Fields** via `field-builder` / `wpdev_field_view()`; checkout signup fields via `Checkout_Signup_Field_Adapter` (gradual).

Reference pages for regression: see `docs/modularization/regression-checklist.md` (9 network slugs + site-admin dashboard).
