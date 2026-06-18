# Coupling Cleanup — AI_FXIME / AI_FIXME Plan

> Created: 2026-06-05  
> Owner: Core / Modularization  
> Scope: framework ↔ examples boundary, plus the top-level dashboard and
> domain-owned deprecated shims.
> Goal: kill every remaining `AI_FXIME` and `AI_FIXME` marker in the framework
> and move the domain it points at to its owning example.

## Status Legend

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `doing` | In progress |
| `done`  | Implemented, audited, and tested |
| `block` | Blocker logged in `execution-backlog.md` |

## Task Index

| ID | Title | Owner | Status |
|----|-------|-------|--------|
| T1  | Sibling `wpdev-examples` loading | Core | todo |
| T2  | Dashboard top-level page → examples | Core + Dashboard | todo |
| T3  | Dashboard statistics asset move | Core + Dashboard | todo |
| T4  | Remove memberships logic from framework dashboard statistics | Core + Memberships | todo |
| T5  | Move domain deprecated shims to owning examples | Core + Sites/Coupons/Products/Memberships/Checkout | todo |
| T6  | Move site migration logic out of core migrator | Core + Sites | todo |
| T7  | Move Toolbox to sites example | Core + Sites | todo |
| T8  | Clean legacy `wpdev_load_extra_components()` domain boot | Core + multiple | todo |
| T9  | Decouple API settings and Jumper settings | Core + SettingsPanelBuilder | todo |
| T10 | Boundary audits | QA | todo |
| T11 | Documentation updates | Docs | todo |

---

## Summary

Remove remaining coupling where the WPDev Framework still owns, registers, or
boots code that belongs to WPDev Examples / domain code. Cover **both**
marker spellings: `AI_FXIME:` and `AI_FIXME:`.

### Success Criteria

- No unresolved `AI_FXIME` or `AI_FIXME` markers remain in framework source.
- Framework works when `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples` is missing.
- Examples load from the sibling `wpdev-examples` directory.
- Dashboard / top-level `wpdev` menu is owned by `wpdev-examples/dashboard`, not the framework.
- Domain shims and domain boot logic move to their owning examples.
- All existing `composer ci` audits and PHPUnit suites still pass.

---

## Task 1 — Support Sibling `wpdev-examples` Loading

### Files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/class-examples-loader.php`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/playground/class-playground-loader.php`

### Steps

1. Update `Examples_Loader::examples_dir()` to resolve examples in this order:
   1. `WPDEV_EXAMPLES_DIR` constant if defined and readable.
   2. `wpdev_examples_dir` filter result if non-empty and readable.
   3. Sibling path: `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples`.
   4. Legacy in-plugin path: `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/examples`.
2. Apply the same directory resolution behavior to `Playground_Loader::examples_dir()`.
3. Keep existing `wpdev_load_examples()` and `wpdev_example_is_loaded()` APIs unchanged.
4. Add a debug-only `WPDEV_EXAMPLES_DIR_DEBUG` log of the resolved directory on `plugins_loaded` priority 5 when `WP_DEBUG` is on.
5. Add a `wpdev_examples_dir` filter docblock so third parties can override the resolution without forking the loader.

### Tests

- Add/adjust unit tests so examples loader detects sibling `wpdev-examples`.
- Test missing examples directory returns safely without fatal.
- Test filter override wins over sibling path.
- Test constant override wins over filter.

---

## Task 2 — Move Dashboard Top-Level Page Ownership to Examples

### Framework files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-custom-page/setup.php`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-custom-page/class-top-level-admin-page.php`

### Examples files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/setup.php`
- New: `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php`

### Steps

1. Move `Top_Level_Admin_Page` class from framework to the new examples file.
2. Keep namespace and class name unchanged: `WPDevFramework\Admin_Pages\Top_Level_Admin_Page`.
3. In framework `modules/admin-custom-page/setup.php`, remove:
   - require of `class-top-level-admin-page.php`
   - instantiation of `new Top_Level_Admin_Page()`
4. In examples `dashboard/setup.php`, require the new class file and instantiate `Top_Level_Admin_Page` on `wpdev_admin_pages`.
5. Remove `AI_FXIME` comments after the move.
6. Do not remove framework about pages or admin bar registration.

### Tests

- Framework-only load must not register `wpdev` top-level dashboard.
- With `wpdev-dashboard` example loaded, `wpdev` dashboard page is registered.
- Existing about/admin-custom-page tests still pass.
- Alias smoke: `class_exists( Top_Level_Admin_Page::class )` resolves when the dashboard example is loaded.

---

## Task 3 — Move Dashboard Statistics Asset to Dashboard Example

### Framework source assets

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-custom-page/assets/js/dashboard-statistics.js`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-custom-page/assets/js/dashboard-statistics.min.js`

### Examples targets

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/assets/js/dashboard-statistics.js`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/assets/js/dashboard-statistics.min.js`

### Steps

1. Move both dashboard statistics JS files to the dashboard example.
2. In moved `Top_Level_Admin_Page::register_scripts()`, change asset URL module id from `admin-custom-page` to `wpdev-dashboard`.
3. Update JS colocation data:
   - `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/bin/js-colocation-data.php`
4. Ensure no framework asset path references dashboard statistics JS.
5. Update `dist/` build config (if any) so the minified asset is produced from the new location.

### Tests

- Asset colocation test passes.
- Dashboard page enqueues `wpdev-dashboard-stats` from `wpdev-dashboard`.
- `rg "dashboard-statistics" modules/` returns no matches.

---

## Task 4 — Remove Membership-Specific Logic from Framework Dashboard Statistics

### Framework file

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-widget-builder/src/class-dashboard-statistics.php`

### Examples candidates

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/admin-custom-page-dashboard-widgets/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/memberships/`

### Steps

1. Remove the `AI_FIXME` membership-specific block from framework `Dashboard_Statistics`.
2. Keep `Dashboard_Statistics` as a generic statistics service with no direct calls to memberships APIs.
3. Add membership/MRR data registration in examples using existing dashboard widget datasource APIs.
4. If a datasource is missing, return empty/default chart data instead of fatal.
5. Replace direct `wpdev_get_memberships()` calls with a `wpdev_dashboard_statistics_datasource` filter that domains populate.

### Tests

- Framework dashboard statistics class does not reference `wpdev_get_memberships`.
- Dashboard example still renders MRR widget when memberships example is loaded.
- Dashboard example degrades gracefully when memberships example is removed.
- Add a unit test that asserts an empty dataset is returned for an unknown datasource.

---

## Task 5 — Move Domain Deprecated Shims to Examples

### Framework file

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/deprecated/deprecated.php`

### Examples targets

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/sites/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/discount-codes/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/products/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/memberships/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/checkout/`

### Steps

1. Move deprecated domain shims for:
   - `wpdev_Site*`
   - `wpdev_Coupon`
   - `wpdev_Plan`
   - `wpdev_Subscription`
   - `wpdev_Signup`
2. Place each shim in the owning example module.
3. Load shims from that example `setup.php` only when the example is loaded.
4. Framework `deprecated.php` may keep only generic, framework-owned deprecated symbols.
5. Remove related `AI_FIXME` comments from framework.
6. Keep `class_exists()` guard so each shim remains idempotent.

### Tests

- Framework-only load does not define domain deprecated classes.
- Loading each owning example defines its deprecated shim.
- Existing shim/autoload tests are updated to expect examples ownership.
- Add a smoke test that instantiates one shim per owning example.

---

## Task 6 — Move Site Migration Logic Out of Core Migrator

### Framework file

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/installers/class-migrator.php`

### Examples target

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/sites/`

### Steps

1. Remove `_install_sites()` domain logic from core migrator.
2. Add a sites-owned migration handler/registrar under `wpdev-examples/sites`.
3. Register the sites migration from `sites/setup.php` through `wpdev_register_migration()`.
4. Core migrator should call generic registered migration callbacks only.
5. Remove the `AI_FIXME` comment.

### Tests

- Core migrator file no longer references `wpdev_site_owner`.
- Sites example registers its migration.
- Core migrator runs without sites example.
- Migration callback registry test passes with and without sites loaded.

---

## Task 7 — Move Toolbox to Sites Example

### Framework files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-widget-builder/src/ui/class-toolbox.php`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-widget-builder/setup.php`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/legacy/load-extra-components.php`

### Examples target

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/sites/src/ui/class-toolbox.php`

### Steps

1. Move `Toolbox` class to sites example.
2. Remove framework references and commented boot lines for Toolbox.
3. Instantiate Toolbox from `wpdev-examples/sites/setup.php` only when sites example is loaded.
4. Keep any generic UI helpers in framework if they are required by Toolbox.
5. Add a `wpdev_register_toolbox()` facade so future domains can opt in.

### Tests

- Framework does not contain `WPDevFramework\UI\Toolbox`.
- Sites example loads Toolbox without fatal.
- Framework-only load passes.
- `rg "Toolbox" modules/` returns only generic helper hits, not the class.

---

## Task 8 — Clean Legacy Extra Component Domain Boot

### Framework file

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/legacy/load-extra-components.php`

### Move or remove framework boot references for

- SSO
- limits
- whitelabel / settings defaults
- checkout UI elements
- customer panel UI elements
- taxes
- site template placeholders
- checkout classes
- dashboard domain widgets

### Steps

1. Leave only framework-owned services in `wpdev_load_extra_components()`.
2. Move domain component boot to owning example setup files:
   - system example for SSO / debug / rollback if domain-owned.
   - platform example for limits.
   - checkout example for checkout UI / classes.
   - customer-panel example for customer panel UI.
   - taxes example for Tax classes.
   - sites example for template placeholders.
3. If SSO is intended as framework infrastructure, create a dedicated framework module `sso`; otherwise keep it in system example.
4. Remove related `AI_FIXME` comments.
5. Convert each moved boot call into a documented `wpdev_register_extra_component()` registration.

### Tests

- `load-extra-components.php` has no direct references to `wpdev-*` domain classes.
- Each example still boots its components when loaded.
- Removing an example does not fatal framework.
- Add a registry test that enumerates expected extra components per example.

---

## Task 9 — Decouple API Settings and Jumper Settings

### Framework files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/class-api.php`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-widget-builder/src/ui/class-jumper.php`

### Examples / settings files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/admin-setting-page-defaults/`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/settings-panel-builder/`

### Steps

1. Remove direct settings section registration from `API::add_settings()`.
2. Register API settings through a consumer hook in `admin-setting-page-defaults`.
3. Keep credential refresh behavior in API class, but do not hardcode settings page ownership except redirect URL if unavoidable.
4. Replace Jumper direct `add_settings()` boot with a documented registration hook.
5. Settings page/defaults module decides whether Jumper settings appear and under which settings section.
6. Add a `wpdev_register_settings_section()` consumer for API and Jumper so they are first-class citizens in the settings registry.

### Tests

- API class no longer calls `wpdev_register_settings_section()` directly.
- Jumper runtime does not register settings by itself.
- Settings defaults example registers API / Jumper settings.
- Snapshot test of the registered settings section list is identical with/without API class present.

---

## Task 10 — Boundary Audits

### Files

- New audit script under `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/bin/`
- Relevant PHPUnit or CI references under `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/tests/unit-tests/`

### Steps

1. Add audit that fails if `modules/` contains unresolved `AI_FXIME` or `AI_FIXME`.
2. Add audit that fails if framework modules instantiate examples-owned classes.
3. Add audit that fails if `modules/admin-custom-page` references `Top_Level_Admin_Page`.
4. Add audit that fails if framework source directly references sibling example paths except loader classes.
5. Keep existing allowlists only for generic BC infrastructure.
6. Wire new audits into `composer ci` (suggested script name: `audit:framework-boundary`).
7. Document the audit in `docs/api/framework-primitives.md` and in the `composer.json` `scripts` section.

### Tests

- Run new audit script.
- Run existing modularization audits:
  - `php bin/audit-module-naming.php`
  - `php bin/audit-framework-wording.php`
  - any existing stale path / coupling audits.

---

## Task 11 — Documentation Updates

### Files to update

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-custom-page/API_DOC.md`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/admin-widget-builder/API_DOC.md`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/docs/modularization/class-alias-matrix.md`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/docs/modularization/release-2.8.0-notes.md`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/dashboard/API_DOC.md`
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/README.md`

### Steps

1. Document that `wpdev` dashboard top-level page is examples-owned.
2. Document sibling examples directory loading.
3. Document framework-only behavior when examples are absent.
4. Remove docs claiming `admin-custom-page` owns the dashboard page.
5. Update class alias matrix for moved dashboard / top-level / shim ownership.
6. Note that `Top_Level_Admin_Page` now lives at `wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php`.
7. Add a "Removal safety" note in `wpdev-examples/README.md` that deleting the sibling plugin must not fatal the framework.

---

## Final Validation

Run from `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev`.

### PHP syntax

```bash
php -l modules/core/src/class-examples-loader.php
php -l modules/core/src/playground/class-playground-loader.php
php -l modules/admin-custom-page/setup.php
php -l modules/core/src/deprecated/deprecated.php
php -l modules/core/src/legacy/load-extra-components.php
```

### PHPUnit suites

```bash
./vendor/bin/phpunit -c phpunit.xml.dist tests/unit-tests/Core
./vendor/bin/phpunit -c phpunit.xml.dist tests/unit-tests/AdminWidgetBuilder
./vendor/bin/phpunit -c phpunit.xml.dist tests/unit-tests/SettingsPanelBuilder
./vendor/bin/phpunit -c phpunit.xml.dist tests/unit-tests/View
```

### Audits

```bash
php bin/audit-module-naming.php
php bin/audit-framework-wording.php
php bin/audit-framework-boundary.php   # new in T10
```

### Marker sweep

```bash
rg -n "AI_FXIME|AI_FIXME" /Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules
```

Expected result: **no matches** in `modules/`. The only allowed remaining hits
must be in `examples/` or in audit scripts (allowlisted, comment-only).

---

## Cross-References

- [execution-backlog.md](./execution-backlog.md) — canonical backlog format.
- [migration-inventory.md](./migration-inventory.md) — modules vs examples split.
- [class-alias-matrix.md](./class-alias-matrix.md) — alias map updated by T5, T7.
- [release-2.8.0-notes.md](./release-2.8.0-notes.md) — release notes updated by T11.
- [acceptance-test-matrix.md](./acceptance-test-matrix.md) — task T11 updates acceptance matrix.
- [architecture-contracts.md](./architecture-contracts.md) — boundary contracts updated by T2, T8, T9.
- [api-contract.md](./api-contract.md) — public API surface updated by T9.
