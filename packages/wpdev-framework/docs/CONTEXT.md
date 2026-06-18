# WPDev Framework - Project Context

> Last updated: 2026-06-05
> Repository root: `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev`  
> This file: `docs/CONTEXT.md` (stub at root: `context.md`)
> Git snapshot: branch `main`, HEAD `37fb2c5`
> Plugin version: `2.5.0` (`wpdev.php`, `constants.php`, `readme.txt`)
> Composer package: `wpdev/wpdev-framework`
> Purpose: canonical handoff for AI agents and developers after the latest codebase changes.

## 1. Goal

The goal is to turn the legacy WPDev/WaaS plugin into a reusable modular WordPress admin framework.

In practical terms:

- `modules/` is the required framework layer: core loader, services, builders, dashboard/settings/wizard shell.
- **wpdev-examples** (sibling plugin, `WPDEV_EXAMPLES_DIR`) is the optional WaaS/domain layer: products, customers, checkout, payments, sites, domains, and other demos.
- **wpdev-playground** (sibling plugin, `WPDEV_PLAYGROUND_DIR`) owns sandbox panels and playground menu infrastructure.
- `inc/` is no longer runtime code. It must stay PHP-free.
- Public APIs and legacy class names should keep working through module autoloaders, shim autoloaders, aliases, and documented `wpdev_*` facades.
- New work should build on framework APIs, not by reintroducing direct domain coupling or old `inc/` paths.

This is the remembered/inferred project objective from the current codebase: **prepare WPDev as a clean modular framework, with optional WaaS examples proving the framework APIs.**

## 2. Current Readiness Verdict

Framework status: **mostly ready as a framework foundation / CI-ready, but not fully runtime-signed-off in this local environment.**

What is ready:

- The codebase has a clear framework/examples split.
- `inc/` is PHP-free and physical shim removal is complete.
- All 13 framework modules have `setup.php`, `API_DOC.md`, and `README.md`.
- Generated API docs exist under `docs/api/`, including a fresh manifest generated on `2026-06-04T07:57:54+00:00`.
- `composer ci` passes locally on 2026-06-04.
- PHPUnit passes: 292 tests, 1649 assertions, 0 failures.
- Smoke, module naming, stale path, API docs, playground docs, sunrise path, P3 performance heuristic, SQL installer, WaaS example security audit, and todo audits all run in the CI bundle.

What is not fully signed off:

- `composer release:gate` fails in this local environment because WordPress cannot connect to the configured DB host `mysql`:
  `php_network_getaddresses: getaddrinfo for mysql failed`.
- Network admin, WP bootstrap, playground render, and playground HTTP checks therefore did not complete locally.
- The WaaS example security audit still reports warning-level P1 items: nonce/capability review needed in selected example handlers.
- PHPUnit reports 1 warning, 22 deprecations, and 1 skipped test. These are not failures today but should be cleaned before a polished release.
- `wp-config.php` currently emits a warning that `WPDEV_PLAYGROUND_DIR` is already defined.

Short answer: **yes, the framework is structurally ready and CI-ready; no, I would not call the release/runtime sign-off complete until Docker or the local MySQL-backed WordPress regression gate passes.**

## 3. Repository Snapshot

Important roots:

| Path | Role |
|------|------|
| `wpdev.php` | Canonical plugin bootstrap. |
| `wp-dev.php` | Backward-compatible shim that requires `wpdev.php`. |
| `constants.php` | Plugin path/url/version constants. |
| `autoload.php` | Composer dependency bootstrap from `dependencies/`. |
| `sunrise.php` | Plugin sunrise file to copy into `wp-content/sunrise.php` for multisite/domain mapping. |
| `modules/` | Required framework modules. Removing module folders may fatal. |
| `wpdev-examples/` | Optional sibling plugin — WaaS domains (`WPDEV_EXAMPLES_DIR`). Deletion-safe by contract. |
| `wpdev-playground/` | Optional sibling plugin — dev playground menu (`WPDEV_PLAYGROUND_DIR`). |
| `docs/` | All documentation: API, framework guides, modularization, release prep, static site. |
| `docs/api/` | Generated API/RAG docs and `manifest.json`. |
| `docs/framework/` | Module usage guides with example/playground cross-refs. |
| `docs/modularization/` | Migration history, inventories, contracts, sign-off docs. |
| `docs/site/` | Static documentation site (`index.html` + assets). |
| `docs/RELEASE-PREP.md` | Pre-release checklist and zip packaging steps. |
| `skills/wpdev-panel-builder/` | Local agent skill for building WPDev panels correctly. |
| `inc/` | Legacy artifact only; contains no PHP runtime files. |

Scale from the current scan, excluding vendor/dependency-heavy paths and large static assets:

| Area | Files | PHP | MD | JS | CSS |
|------|------:|----:|---:|---:|----:|
| `modules/` | 1125 | 966 | 29 | 63 | 18 |
| `docs/api/` | 15 | 0 | 10 | 0 | 0 |
| `docs/modularization/` | 54 | 0 | 38 | 0 | 0 |

WaaS code lives in the **wpdev-examples** sibling plugin (not counted in this repo's file scan). `tests/` and `bin/` were removed from the framework repo in 2.8.1+.

Runtime PHP scan (framework repo only):

- `modules/`: first-party framework PHP.
- Approximate classes/traits/interfaces: 1367.
- Approximate functions: 5283.
- Approximate `wpdev_*` functions: 621.

## 4. Entry Points And Boot Order

Canonical entry:

1. WordPress loads `wpdev.php`.
2. `wpdev.php` defines `WPDEV_PLUGIN_FILE`.
3. It requires `constants.php`, `autoload.php`, and `modules/core/src/functions/dependency-bootstrap.php`.
4. It boots dependency management through `wpdev_bootstrap_dependency_manager( __DIR__ )`.
5. It requires core autoloaders:
   - `modules/core/src/class-autoloader.php`
   - `modules/core/src/class-module-autoloader.php`
   - `modules/core/src/class-legacy-shim-autoloader.php`
6. It loads Action Scheduler from `modules/core/dependencies/woocommerce/action-scheduler/action-scheduler.php`.
7. It requires the singleton trait and `modules/core/src/class-wpdev.php`.
8. It initializes:
   - `WPDevFramework\Core\Module_Autoloader`
   - `WPDevFramework\Core\Legacy_Shim_Autoloader`
   - `WPDevFramework\Autoloader`
   - `WPDevFramework\Hooks`
9. It defines global helper `wpdev()`.
10. On `plugins_loaded`, it sets `$GLOBALS['WPDev'] = wpdev()`.
11. It requires `modules/core/setup.php`.

Optional sibling plugins (same `plugins/` directory):

- **wpdev-examples** (`wpdev-examples/wpdev-examples.php`) defines `WPDEV_EXAMPLES_DIR` and calls `wpdev_load_examples()` on `plugins_loaded` priority 5.
- **wpdev-playground** (`wpdev-playground/wpdev-playground.php`) boots `Playground_Loader::init()` on `plugins_loaded` priority 4 when `WPDEV_PLAYGROUND_DIR` is defined.

Core setup:

- `modules/core/setup.php` registers the `core` module.
- On `plugins_loaded` priority 5, `Module_Loader::load_all( dirname( __DIR__ ) )` discovers and loads `modules/*/setup.php`.
- On `wpdev_init` priority 0, `Service_Registry::boot()` boots services.
- Playground and examples are **not** booted from `modules/core/setup.php`; each sibling plugin owns its bootstrap.

## 5. Lifecycle Contract

Use these lifecycle hooks instead of ad-hoc bootstrapping:

| Hook | Purpose |
|------|---------|
| `wpdev_init` | Early services and singleton setup. |
| `wpdev_load` | Register entities, managers, tables, handlers, services. |
| `wpdev_admin_pages` | Instantiate admin page classes. |
| `wpdev_register_forms` | Register modal/ajax forms. |
| `wpdev_modules_loaded` | Framework modules have loaded; examples load here. |

Scheduling helpers:

```php
wpdev_on_load( $callback, $priority = 10 );
wpdev_on_admin_pages( $callback, $priority = 10 );
```

Important filters:

| Filter | Default | Purpose |
|--------|---------|---------|
| `wpdev_module_enabled` | `true` | Enable/disable modules or examples by id. |
| `wpdev_load_monolith_admin_pages` | `false` | Emergency rollback to old monolith admin page loading. |
| `wpdev_playground_use_real_production_pages` | `true` | Playground parity uses real production pages unless sandbox is forced. |

## 6. Framework Modules

There are **13** required framework modules with `setup.php`, `API_DOC.md`, and `README.md`:

| Module | Dependencies | Role |
|--------|--------------|------|
| `core` | none | Module loader, service registry, public function maps, views, capabilities, ajax, playground infra, dependency manager, base models/managers. |
| `field-builder` | `core` | Field types, field rendering, sanitization, admin/settings/checkout field views. |
| `form-builder` | `core`, `field-builder` | Forms, modal forms, `wpdev_register_form`, form rendering. |
| `settings-panel-builder` | `core`, `field-builder`, `form-builder`, `tab-navigation` | Settings storage/save, sections, fields, settings UI. |
| `menu-builder` | `core` | Declarative admin menu registry. |
| `tab-navigation` | `core` | Tab/list view navigation helpers. |
| `table-builder` | `core`, `tab-navigation` | Base list table, table config, playground table helpers, bulk action pipeline. |
| `metabox-builder` | `core`, `form-builder`, `field-builder`, `tab-navigation`, `table-builder` | Edit-page widgets and metabox registry. |
| `admin-page-builder` | `core`, `menu-builder`, `tab-navigation`, `metabox-builder` | Base/list/edit admin page classes, templates, page registry/rebinding. |
| `admin-widget-builder` | `core`, `admin-page-builder` | Dashboard widgets, UI elements, data sources, Jumper command registries. |
| `admin-custom-page` | `core`, `admin-page-builder`, `admin-widget-builder` | Production top-level dashboard shell. |
| `admin-setting-page` | `core`, `settings-panel-builder`, `admin-page-builder` | Production settings admin page. |
| `wizard` | `core`, `admin-page-builder` | Setup wizard and sunrise integration. |

Important dependency note:

- `table-builder` intentionally depends only on `core` + `tab-navigation`; it does not depend on `admin-page-builder`.
- `wpdev_render_empty_state()` lives in `core`, so tables can render empty states without pulling admin page builder into the dependency graph.

## 7. Examples And Optional Domains

`wpdev-examples/` contains optional domain implementations and playground panels. The source contract says deleting an example should only remove that example's admin UI/domain behavior, not fatal the framework.

Documented API examples in `docs/api/manifest.json`: **21**.

WaaS/domain examples with `API_DOC.md`:

| Example | Module ID | Notes |
|---------|-----------|-------|
| `products` | `wpdev-products` | CRUD gold standard: products, product table/meta, list/edit pages, manager. |
| `customers` | `wpdev-customers` | Customers, user/customer helpers, rich edit page patterns. |
| `sites` | `wpdev-sites` | Customer sites, multisite duplication helpers, site table/meta. |
| `domains` | `wpdev-domains` | Domain mapping, DNS/domain helpers, depends on sites. |
| `memberships` | `wpdev-memberships` | Memberships/subscriptions, depends on products/customers. |
| `payments` | `wpdev-payments` | Payments, invoices, financial helpers, mPDF dependency. |
| `checkout` | `wpdev-checkout` | Checkout/cart/forms/signup fields, depends on gateways and builders. |
| `gateways` | `wpdev-gateways` | Gateway registry and Stripe/manual/PayPal gateway code. |
| `discount-codes` | `wpdev-discount-codes` | Discount code admin/table/model. |
| `taxes` | `wpdev-taxes` | Tax-related domain functions and playground. |
| `emails` | `wpdev-emails` | Email templates/customization/managers. |
| `broadcasts` | `wpdev-broadcasts` | Broadcast list/edit pages and manager. |
| `webhooks` | `wpdev-webhooks` | Webhook list/edit pages, manager, test/log handlers. |
| `events` | `wpdev-events` | Event list/view/logging. |
| `platform` | `wpdev-platform` | Limits, limitations, visits, notes, cache, block, notifications. |
| `system` | `wpdev-system` | System pages, jobs, SSO, integrations, logs/tooling. |
| `addons` | `wpdev-addons` | Add-ons catalog/UI. |
| `customer-panel` | `wpdev-customer-panel` | Customer-facing panel widgets/elements. |
| `dashboard` | `wpdev-dashboard` | Dashboard marker/widgets/parity support. |
| `metabox-post-type` | `metabox-post-type` | CPT + metabox demo. |
| `admin-custom-page-top-nav` | `admin-custom-page-top-nav` | Top navigation demo/extension. |

Additional example folders include `admin-setting-page-defaults`, `admin-custom-page-dashboard-widgets`, `playground-*`, `playground-parity`, `wpdev-dev-mock`, and `wpdev-playground-sample`. Some are playground-only or setup-only and are not public API_DOC examples.

Critical naming rule:

| Concept | Example |
|---------|---------|
| Module id | `wpdev-products` |
| Folder slug | `products` |
| Path | `wpdev-examples/products/` |

Do not create `wpdev-examples/wpdev-products/`.

## 8. Public API Contract

Primary docs:

- `docs/api/manifest.json`
- `docs/api/README.md`
- `docs/api/index.md`
- `docs/api/framework-primitives.md`
- `modules/*/API_DOC.md`
- `wpdev-examples/*/API_DOC.md`
- `docs/modularization/api-contract.md`

Manifest snapshot:

- Generated: `2026-06-04T07:57:54+00:00`
- Framework modules: 13
- Documented examples: 21
- Symbols: 810

Uniform registry facade pattern:

```php
wpdev_register_{entity}( $id, array $config = array(), bool $replace = true ): bool
wpdev_get_{entity}( $id )
wpdev_has_{entity}( $id ): bool
wpdev_list_{entity}(): array
wpdev_unregister_{entity}( $id ): void
```

Metaboxes are scoped per page:

```php
wpdev_register_metabox( $page_id, $metabox_id, $config );
```

Core registry/API families:

| Family | Module |
|--------|--------|
| `wpdev_register_module_admin_pages` | `admin-page-builder` |
| `wpdev_register_admin_page` | `core` / admin page rebinding |
| `wpdev_register_table` | `table-builder` |
| `wpdev_register_form` | `form-builder` |
| `wpdev_register_field_type` | `field-builder` |
| `wpdev_register_settings_field` | `settings-panel-builder` |
| `wpdev_register_settings_section` | `settings-panel-builder` |
| `wpdev_register_dashboard_widget` | `admin-widget-builder` |
| `wpdev_register_metabox` | `metabox-builder` |
| `wpdev_register_menu_top`, `wpdev_register_menu_child` | `menu-builder` |
| `wpdev_register_playground_panel` | `core` |
| `wpdev_register_ajax_handler` | `core` |

When an API signature is unknown:

1. Check `docs/api/manifest.json`.
2. Read the relevant `API_DOC.md`.
3. Confirm the exact source file.
4. Check examples usage before inventing a pattern.

## 9. Admin Panel Development Pattern

Use the local skill first:

- `skills/wpdev-panel-builder/SKILL.md`

Best starting examples:

| Goal | Start from |
|------|------------|
| Full CRUD domain | `wpdev-examples/products/` |
| Rich edit page with widgets/metaboxes | `wpdev-examples/customers/` |
| Checkout/cart | `wpdev-examples/checkout/` |
| Payment gateway | `wpdev-examples/gateways/` |
| Dashboard widgets | `wpdev-examples/dashboard/`, `wpdev-examples/admin-custom-page-dashboard-widgets/` |
| Global settings sections | `wpdev-examples/admin-setting-page-defaults/` |
| Playground sandbox panel | `wpdev-playground/playground-{module}/playground.php` |
| Framework module API snippet | `modules/{module}/examples/example-*.php` |

Typical domain structure:

```text
wpdev-examples/{slug}/
  setup.php
  API_DOC.md
  README.md
  playground.php
  src/
    admin/
    tables/
    Models/
    Database/
    managers/
    functions/
  views/
  assets/
```

Typical setup responsibilities:

```php
Module_Loader::register(
    'wpdev-products',
    array(
        'path'         => __DIR__,
        'dependencies' => array( 'core', 'admin-page-builder', 'table-builder', 'metabox-builder', 'field-builder' ),
    )
);

wpdev_register_module_views( 'wpdev-products' );
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
wpdev_register_module_admin_pages( 'wpdev-products', array( List_Page::class, Edit_Page::class ) );
wpdev_boot_module_manager( 'wpdev-products', Product_Manager::class, __DIR__ . '/src/managers/class-product-manager.php' );
```

Quality checklist:

- Capabilities in `$supported_panels` match action/page caps.
- Edit page uses `$parent = 'none'` and highlights the list menu slug.
- List table defines query class, columns, row actions, views, and bulk behavior.
- DB table registration is for custom storage tables, not list table UI classes.
- Ajax handlers use `wpdev_register_ajax_handler()` and standard response helpers.
- Playground code returns early when `WPDEV_PLAYGROUND_DIR` is not enabled.

## 10. Autoloading And Compatibility

Current autoload layers:

- `Module_Autoloader`: canonical module/example class resolution.
- `Legacy_Shim_Autoloader`: maps legacy FQCNs to canonical module/example paths and aliases old names.
- `Examples_Shim_Autoloader`: maps example/domain legacy namespaces to `wpdev-examples/`.
- `WPDevFramework\Autoloader`: root/core autoload support.
- Composer loader from `dependencies/autoload.php`.
- Dependency manager bridge for scoped/unscoped dependency ownership.

Compatibility rules:

- Do not add PHP back under `inc/`.
- Do not reference old `modules/wpdev-*` paths; domain code belongs under `wpdev-examples/*`.
- Keep legacy namespace compatibility through autoload maps/aliases, not by copying files.
- For public functions, use `wpdev_require_public_function( '{entity}' )` and the core public function map.
- For REST schemas, canonical files are under `modules/core/src/api/schemas/`.

## 11. Multisite And Sunrise

WPDev is multisite-first.

Important files:

- Plugin root `sunrise.php`.
- Canonical class: `modules/wizard/class-sunrise.php`.
- `WPDEV_SUNRISE_VERSION = 2.5.0`.

Required operational step:

- When `SUNRISE` is enabled, copy plugin `sunrise.php` to `wp-content/sunrise.php`, or let `Sunrise::manage_sunrise_updates()` update it during plugin/runtime boot.

Audits:

- Copy `sunrise.php` to `wp-content/sunrise.php` when domain mapping is enabled.
- Verify `wpdev-examples` and `wpdev-playground` sibling plugins are active for full WaaS + playground smoke tests.

## 12. Playground

Playground is dev-only. Activate the **wpdev-playground** sibling plugin (`WPDEV_PLAYGROUND_DIR` is defined by `wpdev-playground/wpdev-playground.php`).

Optional WaaS parity requires **wpdev-examples** active as well (`WPDEV_EXAMPLES_DIR`).

Rules:

- Infrastructure: `wpdev-playground/includes/playground/`
- Sandbox panels: `wpdev-playground/playground-{module}/playground.php`
- Playground menu is site-admin only, not network admin.
- Production parity is on by default for real production pages (`Playground_Parity_Registry`).
- Sandbox panels use `wpdev-pg-*` slugs.
- `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels.

Manual validation: activate `wpdev` + `wpdev-examples` + `wpdev-playground`, then open each `admin.php?page=wpdev-pg-*` URL listed in `docs/framework/README.md`.

## 13. Verification Status

Commands run on 2026-06-04:

```bash
composer ci
composer release:gate
```

`composer ci`: passed.

Key CI results:

- Smoke: OK.
- Module naming: OK.
- Framework wording: OK.
- Stale `modules/wpdev-*` paths: OK.
- Example API usage audit: OK.
- Playground API docs: OK.
- API doc schema/order: OK.
- API docs freshness and top symbols: OK.
- Ajax exception docs: OK.
- Inc/shim removal: OK.
- Legacy root class shim coverage: OK.
- Inc tree: only `inc/README.md` and `inc/next/phpcs.xml`.
- Lang/PHPDoc stale `inc/` references: OK.
- Sunrise path audit: OK.
- P3 performance heuristic audit: OK.
- View escaping check: OK.
- TODO audit: OK.
- SQL installer audit: OK, with manual-review warnings for existing `phpcs:ignore` near `$wpdb`.
- WaaS examples audit: no P0 issues, but P1 warnings remain.
- PHPUnit: OK, 292 tests, 1649 assertions, 1 warning, 22 deprecations, 1 skipped.

`composer release:gate`: failed because local WordPress runtime cannot connect to DB host `mysql`.

Release gate passed before the DB-dependent checks:

- `audit:inc-complete`
- `audit:sunrise`
- `audit:shim-removal`
- `regression:p2` early static/unit subchecks

Release gate failed at:

- WP bootstrap regression.
- 9 network admin page regression slugs.
- Playground render regression.
- Playground HTTP regression.
- Playground core-only regression.

Failure cause:

```text
Error establishing a database connection
php_network_getaddresses: getaddrinfo for mysql failed
```

This is an environment/runtime connectivity blocker, not direct evidence of a framework code regression.

## 14. Known Follow-ups

Before calling the framework fully release-ready:

- Run manual smoke tests in a healthy WordPress multisite environment with `wpdev`, `wpdev-examples`, and `wpdev-playground` active (see `docs/RELEASE-PREP.md`).
- Review/fix security warnings in wpdev-examples handlers (nonces, capabilities).
- Keep `docs/api/manifest.json` fresh after API changes:
  - `composer docs:api-inventory`
  - `composer docs:api-index`
  - `composer docs:api-audit`

## 15. Commands

As of framework 2.8.1+, `bin/`, `composer.json`, `phpunit.xml.dist`, and GitHub CI were removed from the **wpdev** plugin repo. Use manual WordPress smoke tests with the three sibling plugins active.

Documentation validation (from plugin root):

```bash
rg -n 'WPDEV_PLAYGROUND_RUN|examples/playground-|wpdev/examples/' modules/ docs/framework/ skills/
```

Regenerate API manifest when doc tooling is available in your environment.

## 16. Rules For Future Agents

Do:

- Use `skills/wpdev-panel-builder/SKILL.md` when building admin panels or examples.
- Use `docs/api/manifest.json` and colocated `API_DOC.md` before relying on any API.
- Keep framework code in `modules/`.
- Keep optional/domain code in `wpdev-examples/`.
- Keep runtime PHP out of `inc/`.
- Prefer `wpdev_register_*` facades over direct registry class mutation.
- Use lifecycle hooks and scheduling helpers.
- Use `wpdev_register_ajax_handler()` plus `wpdev_ajax_success()` / `wpdev_ajax_error()` for new ajax.
- Sanitize inputs, verify nonces, check capabilities, and escape output.
- Run manual smoke tests after framework/runtime edits (see `docs/RELEASE-PREP.md`).

Do not:

- Add PHP under `inc/`.
- Create `modules/wpdev-*` domain modules.
- Create `wpdev-examples/wpdev-products/`; use `wpdev-examples/products/`.
- Require non-public framework internals from examples.
- Guess function signatures.
- Edit `docs/modularization/phase-2-execution-plan.md` unless explicitly requested.
- Treat `composer release:gate` failure in this environment as a code failure without checking the DB status.

## 17. Quick "Where Is X?"

| Need | Path |
|------|------|
| Main plugin bootstrap | `wpdev.php` |
| Core loader | `modules/core/src/class-module-loader.php` |
| Core setup | `modules/core/setup.php` |
| WPDev singleton | `modules/core/src/class-wpdev.php` |
| Public function map | `modules/core/src/functions/module-require.php` |
| API lifecycle helpers | `modules/core/src/functions/api-lifecycle.php` |
| Service registry | `modules/core/src/class-service-registry.php` |
| Ajax service/helpers | `modules/core/src/ajax/`, `modules/core/src/functions/ajax.php` |
| View helpers | `modules/core/src/view/template-functions.php` |
| Admin page base classes | `modules/admin-page-builder/src/admin-pages/` |
| List table base/config | `modules/table-builder/src/` |
| Field builder | `modules/field-builder/src/` and `modules/field-builder/views/` |
| Form builder | `modules/form-builder/src/` |
| Settings builder | `modules/settings-panel-builder/src/` |
| Metabox builder | `modules/metabox-builder/src/` |
| Menu builder | `modules/menu-builder/src/` |
| Dashboard widgets | `modules/admin-widget-builder/src/` |
| Products CRUD example | `wpdev-examples/products/` |
| Checkout example | `wpdev-examples/checkout/` |
| Customer panel example | `wpdev-examples/customer-panel/` |
| Playground panel | `wpdev-playground/playground-{module}/playground.php` |
| Module usage guides | `docs/framework/README.md` |
| API docs manifest | `docs/api/manifest.json` |
| Framework primitives | `docs/api/framework-primitives.md` |
| Modularization changelog | `docs/modularization/changelog.md` |
| Regression sign-off notes | `docs/modularization/regression-signoff.md` |
| Agent skill | `skills/wpdev-panel-builder/SKILL.md` |

## 18. Final Assessment

The original framework goal has largely been achieved at the code architecture level:

- Legacy monolith runtime is gone from `inc/`.
- Framework primitives are centralized under `modules/`.
- WaaS/business domains are optional examples under `wpdev-examples/`.
- API docs and a manifest exist for AI/dev consumption.
- Builder modules expose uniform registry facades.
- CI-safe validation passes.

The remaining gap is **runtime release confidence**, not basic framework architecture. A healthy MySQL/Docker multisite run is needed to finish the sign-off for wp-load, network admin pages, and playground HTML.
