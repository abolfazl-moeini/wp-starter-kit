# Changelog — Modularization (Phase I)

## 2.8.1 — Security audit, namespace rename, and BC bridge (complete)

### Added

- **Bulk namespace rename** `WPDev\` → `WPDevFramework\` across 1,438 first-party files
  (4,301 occurrences). `bin/rename-namespace.py` — Python script with dry-run + check modes
- **Vendor dependency BC bridge** in `class-autoloader.php::bridge_dependency_namespace()`
  that maps `WPDevFramework\Dependencies\X` → `WPDev\Dependencies\X` and `class_alias`es
  the loaded class under the new FQCN. Handles 1,000+ vendored classes (Rakit, Stripe,
  Mexitek, mpdf, Pablo Pacheco, etc.) without modifying any third-party file
- **Autoloader BC layer** in `Module_Autoloader` — fixed pre-existing bug where the
  `Core\` namespace segment was dropped when computing the BC alias target
  (latent bug from before 2.8.0; silently masked by no class_alias happening)
- **Autoloader BC layer** in `Legacy_Shim_Autoloader` + `Examples_Shim_Autoloader` —
  class map mirrors every entry to its legacy FQCN; `autoload()` does `class_alias`
  after `require_once` to bridge legacy → new
- **Test bootstrap** (`tests/unit-tests/bootstrap.php`) now also boots
  `Module_Autoloader` so the `WPDev\Core\*` / `WPDev\Modules\*` BC bridge fires in
  unit tests
- **`bin/audit-view-escaping.php`** — earlier view XSS audit (composer script)
- **`bin/audit-todo.php`** — flags TODO/FIXME/XXX in `modules/` (excludes
  `dependencies/`, `assets/`)
- **`bin/audit-waas-examples.php`** — security audit for 13 WaaS examples covering
  P0 view XSS, P1 cap missing, P1 nonce missing, P2 SQL concat, P0 RFI. Fails ci
  on P0 only; P1 are warning for manual review
- **`bin/audit-sql-installer.php`** — SQL injection audit for `installers/`,
  `Database/`, `objects/`, `Model/`, `functions/` directories. Flags phpcs:ignore
  near `$wpdb` (manual review) and unprepared/concatenated calls (ci failure)
- **God-class splits:**
  - `examples/products/src/admin/class-product-edit-admin-page.php` 1,142 → 594 lines
    (extracted `Product_Save_Widget`, `Product_Option_Sections` static helpers)
  - `examples/checkout/src/admin/class-checkout-form-edit-admin-page.php` 1,611 → 1,468
    lines (extracted `Checkout_Form_Field_Catalog::hardcoded_fields()` static helper)
  - `examples/admin-setting-page-defaults/src/class-wpdev-settings-default-sections.php`
    845 → 78 lines (extracted 7 section classes under
    `WPDevFramework\Examples\AdminSettingPageDefaults\Sections\*`)
- **`class-faker.php`** moved from `modules/core/src/` (1,051 lines) to
  `examples/wpdev-dev-mock/src/` (1,063 lines) — only useful for playground/dev
  environments. Includes `class_alias('WPDev\\Faker', ...)` for BC

### Changed

- **View-layer XSS** — 85 unescaped `<?php echo $var; ?>` calls in
  `modules/admin-page-builder/views/base/*` escaped with `esc_html` / `esc_attr` /
  `esc_url` / `wp_kses_post` / `absint` / `antispambot` as appropriate
- **`Requirements::notice_*`** — output wrapped in `wp_kses_post`
- **Validation rules** `class-products.php` and `class-site-template.php` now
  fail-closed (`return false` + `_doing_it_wrong`) when WaaS module missing,
  instead of returning `true` (which silently accepted arbitrary ids)
- **6 playground panels** restored as `info` panels (not full sandbox render):
  dashboard, emails, gateways, platform, system, taxes
- **Composer** scripts: new `audit:view-escaping:check`, `audit:todo`,
  `audit:waas-examples`, `audit:sql-installer` in `ci` chain
- **Plugin header** (`wpdev.php`), `readme.txt`, top-level admin menu label
  ("WPDev Framework") rebrand — user-facing only; namespace rename is the
  next phase (`D1c`)
- **37 unescaped echoes fixed** in WaaS example views: payments (invoice
  template, tax details), broadcasts (email base, widget targets), events
  (widget message, payload, initiator), emails (widget placeholders), sites
  (placeholders)
- **Domain check** in `bin/playground-api-doc-meta.php` uses filterable
  `domain_module_ids()` + mock `apply_filters` for CLI/audit context

### Fixed

- **All 3 pre-existing test failures** — `ValidationRulesFailClosedTest` (Rakit
  Rule BC bridge), `SettingsDefaultSectionsAliasTest` (new namespace), and
  `class-autoloader.php` runtime fatal (third-party dependency bridge)

### Verification

- `composer ci` — 17 audits green
- `composer test` — 289/289 tests pass, 0 failures
- BC support verified for both `WPDev\` (legacy) and `WPDevFramework\` (new) FQCNs
  in:
  - Framework code (Module_Autoloader, Legacy_Shim_Autoloader, Examples_Shim_Autoloader)
  - Third-party dependencies (Rakit, Stripe, Mexitek, mpdf, Pablo Pacheco, …)
  - All renamed examples (admin pages, settings, playground, dev-mock)

## 2.8.0 — Framework vs examples separation (complete)

### Added

- `docs/api/` — AI ingestion index (`manifest.json`, `framework-primitives.md`, inventory JSON from `examples/`)
- Composer docs pipeline: `docs:api-inventory`, `docs:api-index`, `docs:api-audit`, `docs:build`
- `examples/` tree for optional WaaS domains and playground demos; `Examples_Loader` + `Examples_Shim_Autoloader`
- `bin/audit-stale-wpdev-paths.php`, `bin/audit-example-apis.php`, `composer audit:stale-wpdev-paths`
- Generic module APIs in `functions-module-managers.php` (`wpdev_register_module_admin_pages`, `wpdev_boot_module_manager`, …)

### Changed

- All `wpdev-*` domain code moved from `modules/wpdev-*` to `examples/*`
- Playground helpers co-located under `examples/playground-*`; WaaS list-table classes remain in `modules/table-builder/src/playground/`
- Network admin regression covers **9** reference slugs; dashboard (`page=wpdev`) is site-admin only
- gettext `#:` references in `lang/*.po|pot` updated to `examples/*`
- Removed BC function shims (`wpdev_register_admin_pages`, `wpdev_boot_manager`, …); kept `wpdev_module_enabled` filter bridge

### Verification

- `composer ci`, `composer test` (285 tests), `composer regression:docker` — all pass
- Maintainer notes: [`release-2.8.0-notes.md`](release-2.8.0-notes.md)

Post–2.5.0 builder platform work: break builder dependency cycle, centralize AJAX registration/responses, unify field/settings/page APIs, and delegate all builder `Component_Registry` copies to core.

### Added

- **Phase 0:** `wpdev_render_empty_state()` + `core/views/base/empty-state.php`; `table-builder` no longer depends on `admin-page-builder`; `ModuleDependencyGraphTest` (builder DAG)
- **Phase J:** `modules/core/assets/js/wpdev-ajax.js` (`window.wpdev.ajax`); `Ajax_Tab_Loader` + `Ajax_Service::register_handler` / `register_tabs`; `Modal_Service` ajax modal APIs; `Screen_Options_Service::add_panel`
- **Phase K1:** `wpdev_field_view()` / `field.php`; `Field_Type_Registry` wired to `Field::sanitize()`; `field-wp-editor.php` rename; `Checkout_Signup_Field_Adapter`
- **Phase K2:** `Form::render()` uses field resolver; `form-dsl.md`; payment modal example
- **Phase K3:** `Settings_Storage`, `Settings_Save`; third-party settings example; `SettingsSaveTest`
- **Phase K4:** `Menu_Registry::register_top` / `register_child`; `Page_Template_Registry` `custom` template; `wpdev_admin_page_{$id}_load`; `Tab_Navigation::from_list_table_views()`; `wpdev_enqueue_legacy_admin_tabs()` (deprecated)
- **Phase K6:** `Metabox_Registry`; trait mirrors widgets into registry
- **Phase K8:** `WPDevFramework\Core\Component_Registry` + `Delegates_Component_Registry` trait (all 9 builders)
- **AJAX public API:** `wpdev_register_ajax_handler`, `wpdev_register_ajax_tabs`, `wpdev_ajax_tab_url`, `wpdev_ajax_success`, `wpdev_ajax_error`, `wpdev_ajax_error_wp_error` (`ajax.php` in public function map)
- PHPUnit: `AjaxPlatformTest`, `FieldViewResolverTest`, `MenuRegistryTest`, `MetaboxRegistryTest`, `ComponentRegistryTest`, `DelegatesComponentRegistryTest`, `AjaxHelpersTest`, `AjaxResponseHelpersTest`, `AjaxErrorWpErrorTest`, `TabNavigationViewsTest`

### Changed

- Feature `wp_ajax_*` handlers migrated to `wpdev_register_ajax_handler()` (core, wpdev-*, wizard, dashboard widgets, add-ons, checkout session save, etc.)
- Many handlers now respond via `wpdev_ajax_success()` / `wpdev_ajax_error_wp_error()` (envelope `{ success, code, message, data }`); legacy jQuery clients still work when they read `response.success` / `response.data`
- `Ajax_Service` supports `transport: 'nopriv'` and `accepted_args`
- `class-ajax.php`, `Ajax_Tab_Loader`, `Async_Calls` register via shared handler API
- Docs: `architecture-contracts.md`, `migration-guide.md`, `admin-page-lifecycle.md`, `form-dsl.md` updated

### Docs

- `docs/modularization/AI-PROJECT-CONTEXT.md` — handoff doc for agents (2.6.0 platform notes)

---

## 2.5.0

Modularization release: canonical code under `modules/`; Phase 2.9 removed all `inc/**/*.php` shims (~259 files); automated P2 sign-off green in Docker multisite.

### Fixed

- Bootstrap: `wp-dev.php` requires `modules/core/src/class-wpdev.php` before `wpdev()` on `plugins_loaded` (fixes `Class "WPDev" not found` after inc shim removal)
- Autoloader: `WPDevFramework\Autoloader` fallback uses `modules/core/src` instead of removed `inc/`
- Multisite: `WPDEV_SUNRISE_VERSION` bumped to **2.5.0** — `Sunrise::manage_sunrise_updates()` auto-copies plugin `sunrise.php` to `wp-content/` on upgrade (manual copy still fine; `composer audit:sunrise`)
- Tooling: `composer regression:docker` syncs sunrise + runs wp-load and admin page regressions in Docker; `release:gate` includes `@audit:sunrise`
- CI: `composer ci` + `.github/workflows/plugin-ci.yml`; `bin/pre-release.sh` for local sign-off

### Fixed

- Restored `add_wubox()` in `modules/form-builder/src/functions/form.php` (lost during form function migration; broke admin enqueue hooks)
- Fixed `Bulk_Action_Pipeline` namespace resolution in `Base_List_Table::register_in_table_registry()`
- Added `Base_Admin_Page::is_editing()` so edit templates do not read protected `$edit` (PHP 8+)
- Meta type compat: `wpdev_*` meta columns on `wu_*` tables (`Meta_Type_Compat`, `wpdev_get_db_table()`)
- P2 HTTP regression: `bin/regression-network-admin-http.php` (authenticated full HTML; Docker-aware)
- Debug reset helpers use `wpdev_get_db_table()` for physical `wu_*` table names
- Runtime SQL: replaced hardcoded `{prefix}wpdev_*` table names with `wpdev_get_db_table()` (countries, sites, payments, domains, checkout line-item, events, etc.; migrator legacy sources unchanged)
- J-007: `bin/audit-ajax-nonces.php` + `composer audit:ajax` heuristic audit
- J-007: capability checks on 12 ajax handlers (broadcast modals, logs, system info, events, emails, domains, template switching, async calls)
- N-005: `Capability_Registry::capability_for_page()` + `wpdev_page_capability()`; regression verifies 9 network reference pages (dashboard is site-admin only)
- N-006: `WaasModuleBootTest` documents manager boot dedupe via `wpdev_module_boots_managers()`
- N-007: customer-panel list tables use `Customer_Panel_Ajax_Cap` trait (logged-in customer or network admin)
- Phase 2.9 prep: `bin/audit-inc-references.php` + `composer audit:inc` allowlist for direct `inc/` requires
- Phase 2.9: `wpdev_require_public_function()` + canonical module paths; runtime consumers migrated off `inc/` shims
- Phase 2.9 bootstrap: `wp-dev.php`, test bootstraps, and regression scripts load from `modules/` (no direct `inc/` requires)
- Phase 2.9 tracking: `bin/audit-shim-inventory.php` + `composer audit:shims`; P2 signoff includes inc audit + shim inventory
- Phase 2.9 runtime: `wpdev_require_public_function()` no longer falls back to `inc/functions/` shims
- Release: plugin version **2.5.0** (`WPDEV_VERSION` constant); wp-load regression verifies sunrise file + version
- Composer autoload: WPDev API/Contracts/Traits classmap + PSR-4 `WPDev\\Contracts\\` point to `modules/core/src/` (no inc/ shim hop)
- Legacy_Shim_Autoloader: root `WPDev\\*` classes (Cron, Settings, License, Ajax, …) load from modules; registered before inc autoloader in `wp-dev.php`
- REST schemas: `wpdev_rest_get_endpoint_schema()` reads from `modules/core/src/api/schemas/` directly
- Phase 3 shim pilot: all 59 `inc/functions/*.php` files use unified `wpdev_require_public_function()` delegator (BC paths preserved, module map is single source of truth)
- Phase 3 shim pilot: all 24 `inc/api/schemas/*.php` files use unified schema delegator to `modules/core/src/api/schemas/`
- Phase 3 shim pilot: `inc/traits/` (7), `inc/contracts/` (1), and `inc/api/` root (3) use basename path delegators to `modules/core/src/`
- Phase 3 shim pilot: `inc/deprecated/` (3), `inc/mercator/` (1), `inc/duplication/` (6) use basename path delegators to canonical waas/core modules
- Phase 3 shim pilot: `inc/installers/` (4), `inc/exception/`, `inc/loaders/`, `inc/internal/`, `inc/updater/` use basename path delegators to `modules/core/src/`
- Phase 3 shim pilot: `inc/compat/` (9), `inc/helpers/` (7), `inc/objects/` (4) use basename path delegators to `modules/core/src/`
- Phase 3 shim pilot: `inc/limitations/` (12), `inc/limits/` (7), `inc/gateways/` (8), `inc/sso/` (4) use basename path delegators to waas modules
- Phase 3 shim pilot: `inc/domain-mapping/` (3), `inc/integrations/` (11), and root `inc/class-domain-mapping.php` use basename path delegators to wpdev-domains/wpdev-system
- Phase 3 shim pilot: `inc/invoices/` (1), `inc/checkout/` (42), `inc/development/` (4), `inc/builders/block-editor/` (1) use depth-aware basename path delegators
- Phase 3 shim pilot: `inc/country/` (20), `inc/helpers/validation-rules/` (11), `inc/sso/exception/` (2), and all root `inc/class-*.php` (30) use basename path delegators
- Phase 3 tracking: `composer audit:shim-summary` reports unified vs legacy dirname shim counts
- Phase 2.9: `audit-shim-inventory.php` recognizes all 289 unified delegator shims; `composer audit:shim-removal` gates physical deletion
- Phase 2.9 pilot 1: removed `inc/functions/` (59 shims); runtime uses `wpdev_public_function_map()` only
- Phase 2.9 pilot 2: removed `inc/api/schemas/` (24 shims); `wpdev_rest_get_endpoint_schema()` reads `modules/core/src/api/schemas/` only
- Phase 2.9 pilot 3: removed `inc/traits/` (7), `inc/contracts/` (1), `inc/compat/` (9), top-level `inc/helpers/` (7), `inc/objects/` (4); 178 shims remain (`inc/helpers/validation-rules/` next)
- Phase 2.9 pilot 4: removed `inc/helpers/validation-rules/` (11) and `inc/api/` root (3); 164 shims remain; entire `inc/helpers/` and `inc/api/` trees gone
- Phase 2.9 pilot 5: removed `inc/deprecated/` PHP (3), `inc/installers/` (4), `inc/exception/`, `inc/loaders/`, `inc/internal/`, `inc/updater/` (1 each); 153 shims remain
- Phase 2.9 pilot 6: removed `inc/mercator/` (1), `inc/duplication/` (6), `inc/managers/` (1); sunrise loads mercator from `examples/domains` only; 145 shims remain
- Phase 2.9 pilot 7: removed `inc/domain-mapping/` (3), `inc/invoices/` (1), `inc/limitations/` (12), `inc/limits/` (7), `inc/gateways/` (8); 114 shims remain
- Phase 2.9 pilot 8: removed `inc/country/` (20), `inc/sso/` (6), `inc/integrations/` (11); 77 shims remain
- Phase 2.9 pilot 9: removed `inc/development/` (4) and `inc/builders/block-editor/` (1); 72 shims remain
- Phase 2.9 pilot 10: removed entire `inc/checkout/` tree (42 shims); 30 shims remain (root `inc/class-*.php` + subsystem dirs)
- Phase 2.9 pilot 11: removed all `inc/class-*.php` (30); **inc/ is PHP-free** — Phase 2.9 physical shim removal complete
- Post–2.9: `inc/README.md`; `deprecated-apis.md` → `modules/core/src/deprecated/`; docs and smoke updated for zero-shim state
- Post–2.9: removed empty legacy `inc/` subsystem directories; `inc/` now contains only `README.md` and `next/phpcs.xml`
- Release: `composer release:gate` bundles `@audit:inc-complete`, `@audit:shim-removal`, `@regression:p2` (26 automated P2 steps OK locally)
- i18n: rewrote `lang/*.po` and `lang/*.pot` `#:` references from `inc/` to canonical `modules/` paths; `composer audit:lang-inc` guards regressions (2 obsolete country data refs allowlisted)
- Docs: `bin/rewrite-phpdoc-inc-references.php` updated `@see inc/` in module PHPDoc; `composer audit:phpdoc-inc`; `composer docs:generate` scans `modules/` for list tables (114 PHPUnit tests)
- Sunrise bootstrap: `sunrise.php` loads `modules/wizard/class-sunrise.php` only (no `inc/class-sunrise.php` fallback); Mercator from `examples/domains`
- Sunrise early boot: `class-sunrise.php` loads canonical module paths; registers `Module_Autoloader` + `Legacy_Shim_Autoloader`; `wpdev_get_settings_option_key()` avoids `Settings` class during sunrise
- J-003: `WPDevFramework\Core\Tour\Tours` native namespace + `UI\Tours` class alias; tour boot via `Tour_Service`
- J-004: canonical `wpdev_view()`, `wpdev_view_contents()`, `wpdev_view_locate()` in `template-functions.php`
- P3: `bin/audit-performance-p3.php` (list ajax abort + single `wpdev-vue` register); module load timing in `Module_Loader`; rollback page handle dedupe

### Changed

- K1-001: admin field templates moved to `modules/field-builder/views/admin-pages/fields/`; `wpdev_register_module_views( 'field-builder' )`
- K1-002: settings field templates moved to `modules/field-builder/views/settings/fields/`
- J-001: `inc/managers/class-form-manager.php` shim → `modules/core/src/form/class-form-manager.php`
- K4-004: `wpdev_render_tab_navigation()` helper + `inc/functions/tab-navigation.php`
- J-006: tour `mark_as_finished` uses `Ajax_Response` when available
- O-005: removed stale `assets/js/selectizer.js` (canonical: `field-builder/assets/js/`)
- L-009 checkout: moved `inc/checkout/signup-fields/` (37 classes) → `examples/checkout/src/checkout/signup-fields/`; `Legacy_Shim_Autoloader` + inc shims; setup wizard uses module asset URLs for fields/wubox
- L-009 checkout: moved `Cart`, `Checkout`, `Checkout_Pages`, `Line_Item`, `Legacy_Checkout` to `examples/checkout/src/checkout/` with `inc/checkout/` shims
- L-005 gateways: moved `inc/gateways/*` (8 classes) → `examples/gateways/src/gateways/`; `Legacy_Shim_Autoloader` + `inc/gateways/` shims; `wpdev-gateways/README.md`
- Core helpers/objects: `inc/helpers/` (18) and `inc/objects/` (4) → `modules/core/src/helpers/`, `modules/core/src/objects/` with shims + autoload map
- Platform limitations: `inc/limitations/` (12) → `examples/platform/src/limitations/` with shims + `WPDevFramework\Limitations` autoload map
- Platform runtime limits: `inc/limits/` (7) → `examples/platform/src/limits/` with shims + `WPDevFramework\Limits` autoload map
- Core REST API: `inc/api/` (27) → `modules/core/src/api/` with shims; `WPDevFramework\API` / `WPDevFramework\Apis` autoload map (`Apis` registered before `API` prefix)
- System integrations + SSO: `inc/integrations/` (11), `inc/sso/` (6) → `examples/system/src/` with shims + autoload map
- Core compat + traits: `inc/compat/` (9), `inc/traits/` (7) → `modules/core/src/` with shims + autoload map (Composer classmap paths unchanged via shims)
- Sites duplication: `inc/duplication/` (6 procedural) → `examples/sites/src/duplication/` with shims (`MUCD_Duplicate` chain preserved)
- Core infrastructure: `inc/installers/` (4), `inc/exception/`, `inc/internal/`, `inc/loaders/`, `inc/contracts/` → `modules/core/src/` + autoload map (interfaces supported)
- Payments invoices: `inc/invoices/` → `examples/payments/src/invoices/`
- Domains mapping: `inc/domain-mapping/` (3) + `inc/class-domain-mapping.php` → `examples/domains/`
- System development tooling: `inc/development/` → `examples/system/src/development/` (assets colocated)
- Block editor widgets: `inc/builders/block-editor/` → `modules/admin-widget-builder/` (`blocks.js` under module `assets/js/`)
- Root core classes: 19 `inc/class-*.php` → `modules/core/src/` shims (`Cron`, `Scripts`, `Logger`, `Helper`, `Hooks`, `API`, etc.); `Dashboard_*` → `admin-widget-builder`
- Core utility functions: 26 files `inc/functions/` → `modules/core/src/functions/` shims (`fs`, `rest`, `assets`, `env`, helpers, etc.)
- Domain functions: remaining 33 `inc/functions/*.php` → `examples/*/src/functions/`, builder modules, `tab-navigation`, and `core` (all `inc/functions/` are now shims)
- Deprecated/updater: `inc/deprecated/` (3) → `modules/core/src/deprecated/`; `inc/updater/` → `modules/core/src/updater/`; `inc/mercator/` → `examples/domains/src/mercator/`
- Country data: `inc/country/` (520 files: 20 classes + 500 state city repos) → `modules/core/src/country/`; class shims in `inc/country/`; city paths via `Country::get_cities()` → module path (no per-file shims)
- Bootstrap monolith: `inc/class-wpdev.php` and `inc/class-autoloader.php` → `modules/core/src/` (`Autoloader` uses `dirname( __DIR__, 3 )` for plugin root)
- WPDev bootstrap split: `load_public_apis`, `load_extra_components`, `load_managers` → `modules/core/src/legacy/`; smoke enforces 100% `inc/` shims
- P2 automation: `bin/regression-p2-signoff.php` + per-page `regression-admin-page-render.php` (fixes silent `exit()` during admin render)
- O-003/O-004: removed stale root `assets/js/wubox.js`, `tours.js`, `vue-apps.js`, `fields.js`
- J-003: `wpdev_create_tour()` / `wpdev_tour_api()`; migrated direct `Tours::get_instance()` calls in modules
- J-006: list table ajax uses `Ajax_Response::success()` when `wpdev_list_table_ajax_standard_response` is true; `list-tables.js` unwraps `{ success, data }`
- K2-003: `wpdev_modal_open()` + `Bulk_Action_Pipeline` prefers `Modal_Service`
- K4-005: `base/addons-ajax-tabs` partial + `Page_Template_Registry::register( 'addons-ajax-tabs' )`; main add-ons shell includes resolved template
- K2-002: `wpdev_register_form()` / `wpdev_get_form_url()` route through `Form_Service` when core services are booted (`wpdev_form_api()`)
- K3: `wpdev_register_settings_section()` mirrors sections into `Settings_Section_Registry`
- K5-002 actions: sites (`build_site_path_row_actions`), customers (incl. switch-to), emails (send-test/reset + declarative `actions.items`); `row_action_wubox_form()` helper
- K5-002 actions: `standard_row_actions_for()` + `row_action_duplicate()` rolled out to domains, discount codes, memberships, payments, broadcasts, checkout forms, webhooks, events; dashboard widgets use edit-only actions
- K5-002 actions pilot: `build_standard_row_actions()` + product list `actions.items`; all 27 list table classes now define `declarative_table_config()`
- Embed/widget tables normalized to `declarative_schema()`; dashboard payment/membership widgets registered in declarative config
- Customer-panel list tables: override `declarative_table_config()` so widgets do not inherit parent views/bulk_confirm; site panel uses declarative “Your Sites” tab
- Discount codes, webhooks, events: `empty_state` + `bulk_confirm` in declarative config
- Doc: `docs/modularization/table-declarative-config.md`; smoke rejects list tables that still override `get_views()`
- K5-002: `declarative_filter_views()` helper; migrated views for payments, customers, memberships, emails, broadcasts (fixed broadcasts tab `field` → `type`)
- K5-002: declarative `views` read from `Table_Config` in `Base_List_Table::get_views()`; products + sites migrated off overridden `get_views()`
- K5-003: `bulk_confirm` in declarative config registers modal confirms via `Bulk_Action_Pipeline::register_from_config()` (products, sites, domains, checkout forms)
- K5-002: `Base_List_Table::get_empty_state_args()` merges declarative `empty_state` from `Table_Config`; pilot tables: products, sites, domains, checkout forms
- K6-005: default widget datasources centralized in `admin-widget-builder` (`wpdev_load:20`); removed direct `Managers\` fallbacks from customer-panel UI elements
- K5-005: `list-tables.js` scopes pagination, bulk actions, grid selection, and ajax nonce reads to `[data-table-id]` (fixes multi-table edit pages)
- Removed duplicate `assets/js/list-tables.js` (canonical asset: `modules/table-builder/assets/js/list-tables.js`)
- `table-builder` examples + README document list-page vs widget table patterns (K5-007)

### Added

- `View_Service::locate()` and canonical `template-functions.php` under `modules/core/src/view/`
- Product admin pages under `examples/products/src/admin/`
- Payment table + admin pages under `examples/payments/`
- `WPDevFramework\Settings` canonical path under `modules/settings-panel-builder/src/class-settings.php`
- Customers and Checkout domain classes under `examples/customers/` and `examples/checkout/`
- Bulk domain migration: sites, domains, events, discount-codes, broadcasts, webhooks, emails, system, addons, customer-panel admin pages now canonical under `examples/*/src/`
- Admin page bases (`Base`, `List`, `Edit`, `Wizard`) under `modules/admin-page-builder/src/admin/`
- Customer-panel list tables under `examples/customer-panel/src/tables/`
- PHPUnit scaffold: `phpunit.xml.dist`, `composer.json`, `tests/unit-tests/` (Module_Loader sort + Ajax registry)
- Domain managers migrated to `examples/*/src/managers/` with `wpdev_boot_module_manager()`
- `WPDev::maybe_boot_manager()` avoids duplicate boot when modules are enabled
- `Post_Edit_Admin_Page` under `modules/metabox-builder/src/admin/`
- Secondary list tables migrated to parent `wpdev-*` modules
- `Dashboard_Taxes_Tab` → `wpdev-taxes/src/`
- `Views` → `modules/core/src/view/` (booted from `View_Service`)
- `Customizer_Admin_Page` → `admin-page-builder`
- New `wpdev-platform` module for cross-cutting managers
- `Signup_Fields_Manager` boots from `wpdev-checkout` on `wpdev_load`
- `Form_Manager` canonical path under `modules/core/src/form/`
- `Base_List_Table` canonical path under `modules/table-builder/src/table/`
- `Screen_Options_Service::register_per_page()` for list admin pages
- Model layer: `Base_Model`, traits, and domain models under `modules/core/src/Model/` and `examples/*/src/Models/`
- Database layer: BerlinDB engine + posts under `modules/core/src/Database/`; domain queries/schemas under `examples/*/src/Database/`
- `Tax` class canonical under `examples/taxes/src/` (boots on `wpdev_load`)
- `License` and `Base_Manager` canonical under `modules/core/src/`
- PHPUnit: `ModelShimLoadTest` for model/database shim paths
- UI layer: `Base_Element`, Jumper, Toolbox, Template_Previewer → `admin-widget-builder`; checkout elements → `wpdev-checkout`; customer panel elements → `wpdev-customer-panel`
- `Payment_Methods_Element` now boots from `wpdev-customer-panel` on `wpdev_load`
- PHPUnit: `UiShimLoadTest`
- Phase M: `Rollback` (+ upgrader classes) and `Debug` → `wpdev-system`; `Template_Placeholders` → `wpdev-sites`
- Admin pages: `Rollback_Admin_Page`, `Debug_Admin_Page`, `Placeholders_Admin_Page` canonical under matching `wpdev-*` modules
- PHPUnit: `SubsystemShimLoadTest`
- `Module_View_Registry`, `wpdev_register_module_views()`, `wpdev_get_module_asset_url()`, `wpdev_enqueue_module_script()`
- Domain views colocated: taxes, rollback, system-info, shortcodes, broadcast, checkout, dashboard-widgets
- JS colocated: `list-tables.js` → `table-builder`; `wubox.js` / `tours.js` → `core`
- PHPUnit: `ModuleViewRegistryTest`, `ModuleAssetColocationTest`
- Remaining view trees colocated to builders + all active `wpdev-*` modules (`views-module-map.md`)
- O-005: `selectizer.js`, `vue-apps.js` → `field-builder/assets/js/`
- `License_Gate` interface + `wpdev_license_gate()` + `License::is_licensed()`
- `Edit_Object_Page` trait shared by `Edit_Admin_Page` and `Post_Edit_Admin_Page`
- Monolith admin rollback extracted to `modules/core/src/legacy/load-monolith-admin-pages.php`
- PHPUnit: `FieldSanitizeTest`, `CheckoutRestRouteTest`, `EditObjectPageTraitTest`
- `bin/smoke-modularization.php` + `composer smoke` (shim integrity, module assets/views)
- `fields.js` → `field-builder/assets/js/`
- Fixed `inc/database/*` shim paths (3× `dirname` to plugin root)
- Restored missing `Invoices_Element` and `Domain_Mapping_Element` canonical files
- `bin/regression-admin-pages.php` + `composer regression:admin` — render 9 reference network admin pages
- Regenerated inventory docs via `bin/generate-modularization-docs.php` (skips hand-maintained migration guide)
- `bin/regression-wp-load.php` verifies 9 reference network admin page slugs via `network_admin_menu`
- `Ajax_Response` standard json contract; `wpdev_user_can()`, `Capability_Registry`, `Menu_Registry`
- `Field_Type_Registry`, `Settings_Section_Registry`, `Tab_Navigation` partial
- Builder `examples/example-01.php` + `example-02.php` for all nine builder modules
- Phase 2.9 pilot: removed duplicate `views/settings/` (14 files)
- Phase 2.9 complete: removed all duplicate mapped view trees from root `views/` (~168 files); only `admin-notices.php` and `classes.php` remain
- Migrated last four `inc/admin-pages` classes to modules (customer-facing base, migration alert, top nav, tax rates)
- Docs: `table-id-audit.md`, `ajax-nonce-policy.md`, `form-dsl.md`
- PHPUnit: `CapabilityRegistryTest`, `FieldTypeRegistryTest`, `ListTableAssetTest` (29 tests)
- PHPUnit: `FormManagerBulkFormTest` (bulk form without active license), `SettingsSectionRegistryTest`, `TourHelperTest`
- Docs: `regression-signoff.md` for P2 manual checklist; field-builder `example-01-text-field.php`, `example-02-model-field.php`
- Builder examples: form/field/admin-page `example-01.php` show register patterns (K1–K4)
- `Ajax_Service::register_async_listener()` / `install_async_listeners()` public API (J-010)
- `data-table-id` on list table wrappers (K5-005)
- `Page_Template_Registry` + `Table_Config` / `List_Table_Registry` (K4-002, K5-002)
- `docs/modularization/admin-page-lifecycle.md` (K4-003)
- `composer regression` — smoke + PHPUnit + wp + admin page scripts
- Events badge skips query when `wp_wpdev_events` table is missing (dev DB)
- `Legacy_Shim_Autoloader` — loads migrated `WPDevFramework\Admin_Pages`, `List_Tables`, `Managers`, `Models`, `Database`, `UI`, `Rollback`, `Debug`, `Tax`, and `Site_Templates` from modules (removed ~210 inc shims)
- `Bulk_Action_Pipeline` — bulk confirm URL + processing via `Modal_Service` (K5-003)
- K5-004: `declarative_table_config()` on `Base_List_Table`; column keys registered for 23 list tables via `List_Table_Registry`
- K6-001/K6-002: `Edit_Page_Widgets` trait in metabox-builder; shared by `Edit_Admin_Page` and `Post_Edit_Admin_Page`
- K6-003: widget partials colocated under `modules/metabox-builder/views/metabox/` (`widget-list-table`, `widget-tabs`, `widget-save`)
- K6-004: `Dashboard_Widget_Registry` — WPDev statistics widgets in `admin-widget-builder/views/dashboard-statistics/`; WP core widgets in `modules/admin-widget-builder/src/class-dashboard-widgets.php`
- K6-005: `Widget_Datasource_Registry` + `Base_Element::widget_datasource()`; domain/template datasources registered in waas modules

### Fixed
- `modules/core/setup.php` now requires `Module_Autoloader`, `Module_Loader`, and `Service_Registry` before use
- `Ajax_Service` ajax class paths (`src/ajax/` not `../ajax/`)
- `Ajax_Service::boot()` no longer calls nonexistent `Async_Calls::get_instance()`
- `Edit_Object_Page` trait no longer redeclares `$edit` (conflict with `Base_Admin_Page` on PHP 8.2+)
- `inc/database/*` shim paths use 3× `dirname` to plugin root
- `metabox-post-type/setup.php` defers `My_Custom_Element` `class_alias` until after the class file loads
- `Post_Edit_Admin_Page::add_list_table_widget()` sets scoped `set_ajax_table_id()` (N-003)
- Registry classes use global `\sanitize_key()` for namespaced call safety
- `Base_List_Table` imports `\WPDevFramework\Ajax` for list table registry (fixes `WPDevFramework\List_Tables\Ajax` resolution)

### Changed

- `Tour_Service` boots `Tours` from `modules/core/src/tour/`
- `class-wpdev.php` skips duplicate Ajax/Tours boot when core services are registered
- `Product_List_Table` and Product admin pages canonical under `examples/products/`
- `wpdev-gateways` no longer double-boots `Gateway_Manager` (single point in `load_managers`)
- Fixed `wpdev_view()` to use `wpdev_services( 'view' )` instead of invalid `wpdev()->services()`
- `Form_Service` boots `Form_Manager` from core module path
- `Modal_Service::open()` delegates to `Form_Service`
- List tables skip duplicate `per_page` screen option when `context === page`
- `License::register_forms()` hooks `wpdev_register_forms` instead of running during `init()`
- UI element boot moved to module `setup.php` on `wpdev_load` with monolith fallback when modules disabled
- `Debug` boots from `wpdev-system` on `wpdev_load`; `Template_Placeholders` from `wpdev-sites` on `wpdev_load`
- `Rollback` remains early in `WPDev::init()` (before requirements) with canonical files under `wpdev-system`
- `wpdev_get_template()` resolves module views before legacy `views/` paths
- Script registration uses `wpdev_get_module_asset_url()` for list tables, wubox, and tours

## 2.4.0

### Added

- `modules/core` with `Module_Loader`, `Service_Registry`, and six core services
- Nine builder module scaffolds with `Component_Registry`
- Seventeen WaaS domain modules under `examples/*` with `wpdev_register_module_admin_pages()`
- `wpdev_register_module_admin_pages()` helper and `wpdev_module_enabled` filter
- `modules/README.md` and `docs/modularization/class-alias-matrix.md`
- `docs/modularization/` inventories and architecture docs
- `wpdev_services()` helper and `wpdev_view()` wrapper

### Changed

- `wp-dev.php` loads `modules/core/setup.php` first
- `modules/wp-panel-examples.php` deprecated in favor of `Module_Loader`
- `load_admin_pages()` only fires `wpdev_admin_pages` + shell pages; domain pages load from modules
- Existing modules register dependencies via `Module_Loader::register()`

### Fixed

- `Checkout_Form_Manager` REST slug set to `checkout_form` (was invalid placeholder)
- List table widget id collision via `set_ajax_table_id()` and `Ajax::register_list_table()`
- Ajax list refresh aborts in-flight requests (`list-tables.js`)
- Wizard `Requirements.php` duplicate no longer loaded (use `WPDevFramework\Requirements`)
- Sunrise bootstrap path includes `modules/wizard/class-sunrise.php`
- `My_Custom_Element` namespaced to `WPDevFramework\Modules\MetaboxPostType`
- Circular dependency between `wpdev-payments` and `wpdev-gateways` removed

### Backward compatibility

- Legacy hooks unchanged: `wpdev_init`, `wpdev_load`, `wpdev_register_forms`, `wpdev_admin_pages`
- `class_alias` maps builder namespaces to inc classes (see class-alias-matrix.md)
- `wpdev_panel_examples_loaded` deprecated alias for `wpdev_modules_loaded`
- `wpdev_load_monolith_admin_pages` filter restores legacy page registration from `class-wpdev.php`

### Breaking changes (none)

Full class migration from `inc/` to `modules/` is incremental; inc classes remain canonical. Disable modular admin pages only via explicit filters above.
