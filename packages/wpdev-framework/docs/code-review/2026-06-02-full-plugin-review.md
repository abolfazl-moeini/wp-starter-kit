# WPDev — Full-Plugin Code Review and Remediation Plan

- **Date:** 2026-06-02
- **Reviewer:** Mavis (mavis) — plan-mode session `mvs_0dea4f834ef7460f90dccc14d3c3f951`
- **Scope:** Full plugin (modules/ + examples/ + inc/) across functional, architectural, and security dimensions
- **Goal:** Find and prioritize bugs and design issues that block shipping the "WPDev Framework" as a high-quality WordPress admin framework
- **BC policy:** Breaking changes allowed inside `modules/`; the public example-facing surface (`wpdev_register_*` functions, FQCNs that examples rely on) must stay stable

---

## 1. TL;DR for the maintainer

**The team is in the middle of the exact Phase 3 refactor proposed in `docs/refactor-plan-review.md`.** Working-tree shows 61 files changed, +410/-1409 lines. `composer test` went from **9 failures → 1 failure**; all 6 `composer audit:*` scripts that were run pass. The architectural direction is correct.

**But the work is incomplete and there are real bugs hiding in untouched code.** Most critical:

1. **Wide-spread XSS in framework view files** — dozens of `<?php echo $var; ?>` calls in `modules/admin-page-builder/views/base/` that don't escape their output. The framework's cap+nonce security model is solid, but **output escaping is not enforced at the view layer**. A user with access to edit a product/customer/site can inject HTML/JS that fires when admins view lists.
2. **A `<?php echo $page_title ?? 'FIXME'; ?>` debug stub shipped in `views/base/dash.php`** — shows literal "FIXME" to admins.
3. **1 test failure introduced by the in-progress refactor** — `PlaygroundSmokeTest` expects 33 example playgrounds, finds 27 because 6 WaaS playground.php files were deleted without updating the threshold.
4. **Validation rules silently pass when the WaaS domain is missing** — `class-products.php` and `class-site-template.php` guard with `function_exists` but return `true` (pass), which is dangerous default behavior for a security-relevant check.

Full triage and execution plan below.

---

## 2. State of the in-progress refactor (validated against `docs/refactor-plan-review.md`)

| Review point | Status | Evidence |
|---|---|---|
| #1 — Framework/Examples split complete | ✅ Done (2.8.0) | `examples/` has 39 dirs; `inc/` is PHP-free |
| #2 — Slug audit complete | ✅ Done | 19 WaaS modules + 13 bridge modules all on `wpdev-*` / `admin-custom-page-*` / `playground-*` |
| #3 — Core coupling to WaaS APIs | ✅ Mostly fixed | `class-faker.php`, `class-scripts.php`, `class-legacy-shortcodes.php`, `class-product-compat.php`, `class-migrator.php`, `class-default-content-installer.php`, `class-products.php`, `class-site-template.php`, `deprecated.php` all gained `function_exists` / `class_exists` guards; imports of WaaS namespaces removed from core |
| #3 (cont.) — `use WPDevFramework\Checkout\Checkout` removed from core | ✅ Done | `class-site-template.php` no longer has a direct use; uses `class_exists` check + inline call |
| #4 — Top admin nav API + no hard instantiation | ✅ Mostly done | `new Top_Admin_Nav_Menu()` removed from `class-wpdev.php`; new `Admin_Bar_Node_Registry` + `wpdev_register_admin_bar_node()` in `modules/admin-custom-page/src/`; the WaaS shortcuts now live in `examples/admin-custom-page-top-nav/setup.php` and the framework instantiates the consumer at `wpdev_load` priority 5 |
| #5 — Multisite optionality | ✅ Partially done | `Requirements::met()` docblock updated to say multisite/network-active are separate calls; new `is_multisite()` / `is_network_active()` methods exist |
| #6 — Sunrise gated on `wpdev-domains` | ✅ Done | `modules/wizard/setup.php` now wraps `Sunrise::manage_sunrise_updates()` in `if ( wpdev_module_is_loaded( 'wpdev-domains' ) )` |
| #11 — Playground contract WaaS-lists moved to examples | ✅ Done (with side effect — see Finding P0.3) | `Playground_Contract::domain_module_ids()` and `interactive_domain_module_ids()` are now filterable; WaaS IDs provided by `examples/playground-parity/setup.php` via `wpdev_playground_domain_module_ids` filter |
| #2 step 2 — `WPDev_Settings_Default_Sections` physically moved to examples | ✅ Done | 839-line file deleted from `modules/admin-setting-page/src/`, recreated as 845-line file in `examples/admin-setting-page-defaults/src/`; namespace `WPDevFramework\Modules\AdminSettingPage` → `WPDevFramework\Examples\AdminSettingPageDefaults`; `examples/admin-setting-page-defaults/setup.php` updated |

**Validation results:**

| Check | Result |
|---|---|
| `composer test` | 286 tests, **1 failure** (was 9) |
| `composer audit:framework-wording` | OK |
| `composer audit:stale-wpdev-paths` | OK |
| `composer audit:module-naming` | OK |
| `composer audit:example-apis` | OK |
| `composer audit:ajax-exceptions` | OK |
| `composer audit:shim-removal` | OK — Phase 2.9 complete, `inc/` is PHP-free |

**Quality of the in-progress work:** Solid. The `Admin_Bar_Node_Registry` follows the existing `Registry_Base` pattern. The `wpdev_register_admin_bar_node()` is a thin, well-documented wrapper. The function_exists guards are applied consistently across all 8 core files that called WaaS functions. Test updates match the new structure. This is production-grade refactoring.

---

## 3. Findings — P0 (must fix before any release)

### P0.1 — Stored XSS in framework admin views

**Severity:** P0 — security, exploitable by any user with edit rights to a stored field echoed in a list view.

**Location:** `modules/admin-page-builder/views/base/*.php` — **~85 unescaped `<?php echo $vars; ?>` calls** that emit user-controlled content.

**Why it matters:** The framework's cap/nonce security model (validated in §2 of `modules/admin-page-builder/src/admin/trait-edit-object-page.php`, `class-ajax-service.php::wrap_handler_with_security`) is correct. But the **output escaping layer is missing**. When the view renders, dynamic values from models, settings, post meta, and user-submitted forms are echoed directly. Stored XSS in a network-admin WaaS platform is catastrophic.

**Specific dangerous sinks (representative — full list in Appendix A):**

| File:line | Code | User-controlled? | Risk |
|---|---|---|---|
| `views/base/addons/details.php:19,25` | `<?php echo $addon->image_url; ?>` inside `style="background-image: url(...)"` | Yes (addon registry) | XSS via CSS `expression()` (legacy IE) or via rogue URL with `</style>` breakout |
| `views/base/addons/details.php:36` | `<?php echo $addon->name; ?>` | Yes (from addons API) | XSS, also in `<h2>` context |
| `views/base/addons/details.php:83,84,104,214` | `<?php echo $addon->author_url; ?>`, `<?php echo $addon->author; ?>`, `<?php echo $addon->description; ?>` | Yes | XSS via author URL, name, or long description |
| `views/base/customers/grid-item.php:33,34` | `<?php echo $item->get_email_address(); ?>` (in `mailto:` href AND text) | Yes (customer record) | XSS — even an admin-controlled email can have quoted name parts |
| `views/base/sites/grid-item.php:17,18,34,39` | `<?php echo $item->get_featured_image(...) ?>`, `<?php echo $item->get_title(); ?>`, `<?php echo $item->get_active_site_url(); ?>` (twice) | Yes (site record) | XSS via site title/URL/featured image |
| `views/base/products/grid-item.php:48,53` | `<?php echo $item->get_name(); ?>`, `<?php echo $item->get_price_description(); ?>` | Yes (product record) | XSS via product name or price description (could include HTML) |
| `views/base/responsive-table-row.php:16,28,32,40,58,68,88,98` | `<?php echo $args['image']; ?>`, `<?php echo $args['title']; ?>`, etc. — all unescaped | Yes (table args) | Generic list-row XSS surface |
| `views/base/edit/display-notes.php:36` | `<?php echo $user->display_name; ?>` | Yes (WP user record) | XSS — WP user display name is user-controlled; classic XSS vector |
| `views/base/centered.php:14,38,59,112` | `<?php echo $page_title; ?>`, `<?php echo $action_link['label']; ?>`, `<?php echo $labels['updated_message']; ?>`, `<?php echo $content; ?>` | Yes (admin page config) | XSS via page config strings |
| `views/base/wizard.php:28,42,96,109,217,231` | `<?php echo $page->labels['deleted_message']; ?>`, section titles | Yes (wizard config) | XSS via wizard section labels |
| `views/base/list.php:12,36,56,87` | `<?php echo $page->get_title(); ?>`, etc. | Yes | XSS via page title / labels |
| `views/base/settings.php:12,36,147,152,166,213,217,231` | Section titles unescaped | Yes | XSS via section labels |
| `views/base/addons-ajax-tabs.php:68` | `:href="'<?php echo $more_info_url; ?>'..."` — unescaped URL inside Vue.js template | Yes | JS-context XSS |
| `views/base/dash.php:13` | `<?php echo $page_title ?? 'FIXME'; ?>` | (see P0.2) | Production debug stub |

**Recommended fix:**
- Establish a small set of view helpers (in `modules/core/src/functions/views.php` or as a trait) that wrap the escape call: `wpdev_e( $text )` → `echo esc_html( $text )`, `wpdev_attr( $val )` → `echo esc_attr( $val )`, `wpdev_url( $val )` → `echo esc_url( $val )`, `wpdev_html( $val )` → `echo wp_kses_post( $val )`.
- Mass-replace the ~85 occurrences with the appropriate helper. **Most are `esc_html`.** Attribute-context ones (`title="..."`, `href="..."`, `style="..."`, `:href="..."`) need `esc_attr` / `esc_url` as appropriate.
- Add a new audit script `bin/audit-view-escaping.php` that greps `<?php echo \$` in `views/` and fails when the variable is not in an allowlist of known-safe (e.g. hardcoded strings, already-escaped helpers). Wire it into `composer ci` and `release:gate`.

**Effort estimate:** ~2-3 hours of mechanical replacement + audit script + test.

### P0.2 — `<?php echo $page_title ?? 'FIXME'; ?>` debug stub in production

**Severity:** P0 — embarrassing shipped TODO, visible to every admin in the dashboard.

**Location:** `modules/admin-page-builder/views/base/dash.php:13`

```php
<?php echo $page_title ?? 'FIXME'; ?>
```

**Why it matters:** The literal string "FIXME" will display on the dashboard page when `$page_title` is not set. This is a development artifact that should never have been merged. Grep found 5 other `FIXME`/`TODO` markers in the framework (see P1.6) but this is the only one visible to end users.

**Recommended fix:** Either render the page id / a proper default (e.g. `<?php echo esc_html( $page_title ?? $page->get_title() ?? __( 'Dashboard', 'wpdev' ) ); ?>`) or remove the entire `$page_title` variable if it's not used anywhere upstream.

**Effort estimate:** 5 minutes.

### P0.3 — Test failure from in-progress refactor (broken CI gate)

**Severity:** P0 — `composer test` is red, blocks `composer ci` and `release:gate`.

**Location:** `tests/unit-tests/Smoke/PlaygroundSmokeTest.php:95` and the 6 deleted files:
- `examples/dashboard/playground.php` (deleted)
- `examples/emails/playground.php` (deleted)
- `examples/gateways/playground.php` (deleted)
- `examples/platform/playground.php` (deleted)
- `examples/system/playground.php` (deleted)
- `examples/taxes/playground.php` (deleted)

**Test output:**
```
1) PlaygroundSmokeTest::test_all_playgrounds_are_includable
Expected at least 33 example playgrounds
Failed asserting that 27 is equal to 33 or is greater than 33.
```

**Why it matters:** The in-progress refactor intentionally removed 6 WaaS playground sandbox panels (the API_DOC.md diffs show "Mode: No sandbox panel / Not registered"). This is a design choice (the playground should focus on the framework, not WaaS demos). But the test threshold wasn't updated. CI is red.

**Recommended fix:** Update `PlaygroundSmokeTest::test_all_playgrounds_are_includable` to assert `>= 27` and add a comment explaining the policy. Also update `docs/api/index.md` (it lists 21 examples but several are playground-* and the actual count is 27). **OR** restore the 6 playground files as a `wpdev_register_playground_panel( 'wpdev-X', [ 'type' => 'info' ] )` with a generic "see production page at admin.php?page=wpdev-X" message — this preserves test count and still respects the "framework not WaaS" goal.

**Effort estimate:** 30 minutes for either path.

---

## 4. Findings — P1 (high priority, fix before next release)

### P1.1 — Validation rules silently pass when WaaS domain is missing

**Severity:** P1 — security-relevant default behavior is "fail-open".

**Locations:**
- `modules/core/src/helpers/validation-rules/class-products.php:48-50`
- `modules/core/src/helpers/validation-rules/class-site-template.php:94-99`

```php
// class-products.php
if ( ! function_exists( 'wpdev_get_product' ) || ! function_exists( 'wpdev_segregate_products' ) ) {
    return true;  // <-- passes validation when domain is missing
}

// class-site-template.php
if ( $product_ids_or_slugs && function_exists( 'wpdev_get_product' ) && function_exists( 'wpdev_segregate_products' ) ) {
    // <-- only validates when both are present; silently skips when missing
}
```

**Why it matters:** The "framework only, no WaaS" use case is now a stated goal of the refactor. A `Products` validation rule that returns `true` (passes) when the products module is missing means **a `framework-only` install will silently accept any product id** — including invented or attacker-controlled ones — without ever checking the products table. This is a fail-open default. For a validation rule, the safe default is fail-closed (return `false`/throw) when the underlying data is unavailable.

Worse, the two rules behave **inconsistently**:
- `class-products.php` returns `true` (passes) on missing
- `class-site-template.php` skips the check entirely on missing
Both are fail-open but not in the same way.

**Recommended fix:**
- For `class-products.php`: if the products module is missing, return `false` (or throw `\RuntimeException` with a clear message) — or log a `_doing_it_wrong` and return `false`. Do not silently pass.
- For `class-site-template.php`: same — if products are needed for template validation, fail-closed.
- Document in a class docblock: "When the products module is not loaded, this rule rejects the input rather than silently passing, to prevent fail-open validation."
- Add a unit test for both rules that asserts the missing-module case is fail-closed.

**Effort estimate:** 1-2 hours including tests.

### P1.2 — `Requirements::notice_*` use unescaped `printf` with HTML

**Severity:** P1 — defense-in-depth, low exploitability but bad pattern.

**Location:** `modules/core/src/class-requirements.php` lines 308, 325, 339, 354

```php
public static function notice_unsupported_php_version() {
    $message = sprintf(__('WPDev requires at least PHP version %1$s to run. ...', 'wpdev'), self::$php_version, phpversion());
    printf('<div class="notice notice-error"><p>%s</p></div>', $message);  // <-- $message contains <strong>
}
```

**Why it matters:** The `$message` is built from `sprintf` with HTML (`<strong>`, `<a href>`, `&rarr;`) embedded in translation strings. Currently `phpversion()` and `$wp_version` are not user-controlled, so no direct XSS. But the pattern (build HTML via `sprintf`, then `printf` without escaping) is risky:
- A future change could pass user-controlled data into `$message`.
- A translator adding `<script>` to a translation string would inject XSS into every admin's backend.
- The PHPCS rules for `WordPress.Security.EscapeOutput` would flag this.

**Recommended fix:** Use `wp_kses_post( $message )` before `printf`, or better, switch to `printf( '<div class="notice notice-error"><p>%s</p></div>', wp_kses_post( $message ) )`. Or restructure: separate the wrapper HTML from the dynamic content and escape only the dynamic parts.

**Effort estimate:** 30 minutes.

### P1.3 — `class-wpdev-settings-default-sections.php` is 845 lines (god class)

**Severity:** P1 — architectural debt, now living in examples/ where it sets a bad example for new modules.

**Location:** `examples/admin-setting-page-defaults/src/class-wpdev-settings-default-sections.php`

**Why it matters:** The file was physically moved from `modules/admin-setting-page/src/` to `examples/admin-setting-page-defaults/src/` as part of the refactor. The 839 lines became 845 — essentially the same code. The `register()` method registers a single flat list of sections (`general`, `currency`, `payments`, `emails`, `memberships`, `pages`, …) and dozens of fields. The file mixes concerns (general settings, currency, payment gateways, email templates, membership settings, page mappings).

**Recommended fix:** Split into per-section classes (mirroring the settings-panel-builder pattern):
- `class-general-sections.php`
- `class-currency-sections.php`
- `class-payments-sections.php`
- `class-emails-sections.php`
- `class-memberships-sections.php`
- `class-pages-sections.php`
- `WPDev_Settings_Default_Sections` becomes a thin facade that loops and calls `register()` on each.

Each new class would live in `examples/admin-setting-page-defaults/src/sections/` and the facade orchestrates them. This sets a good pattern for the team when adding new settings domains.

**Effort estimate:** 4-6 hours for a careful split (this is a public BC surface, so signatures must not change).

### P1.4 — BC shim for moved `WPDev_Settings_Default_Sections` namespace

**Severity:** P1 — possible silent breakage for external consumers (themes, addons, custom code) that imported the old FQCN.

**Location:** `examples/admin-setting-page-defaults/setup.php` line 39

```php
add_action(
    'wpdev_settings_register_default_sections',
    array( \WPDevFramework\Examples\AdminSettingPageDefaults\WPDev_Settings_Default_Sections::class, 'register' ),
    10,
    1
);
```

**Why it matters:** The class was previously at `WPDevFramework\Modules\AdminSettingPage\WPDev_Settings_Default_Sections`. Any third-party code (or internal code in vendored extensions) that did `use WPDevFramework\Modules\AdminSettingPage\WPDev_Settings_Default_Sections;` will now autoload-fail.

**Recommended fix:** Add a class_alias in a one-time `inc/` shim (which would be the only file in `inc/` again, but it's a tiny BC shim, not a delegator):
```php
// inc/wpdev-settings-default-sections-class-alias.php
if ( ! class_exists( 'WPDev\\Modules\\AdminSettingPage\\WPDev_Settings_Default_Sections' ) ) {
    class_alias( 'WPDev\\Examples\\AdminSettingPageDefaults\\WPDev_Settings_Default_Sections', 'WPDev\\Modules\\AdminSettingPage\\WPDev_Settings_Default_Sections' );
}
```
OR add the class_alias to the `Legacy_Shim_Autoloader` map in `modules/core/src/class-legacy-shim-autoloader.php`. The autoloader approach is cleaner and keeps `inc/` PHP-free.

**Effort estimate:** 30 minutes.

### P1.5 — `class-product-edit-admin-page.php` is 1142 lines (god class)

**Severity:** P1 — maintenance burden, hard to test, hard to extend.

**Location:** `examples/products/src/admin/class-product-edit-admin-page.php`

**Why it matters:** A single file that owns the entire product edit UI: metabox registration, field rendering, save handler, AJAX handlers, customizer integration, etc. Similar sizes:
- `examples/checkout/src/admin/class-checkout-form-edit-admin-page.php` — 1611 lines (worse)
- Other `*_edit_admin_page.php` files likely similar

**Recommended fix:** Extract per-feature concerns into separate classes or files. A typical pattern:
- `class-product-edit-admin-page.php` — main orchestrator (the page itself)
- `class-product-metaboxes.php` — `register_metaboxes()` logic
- `class-product-save-handler.php` — save/validate/store logic
- `class-product-customizer.php` — frontend customizer integration
- `class-product-ajax-handlers.php` — AJAX endpoints specific to the product edit page

This is a significant refactor. Lower priority than P0/P1.1-P1.4 but should be on the roadmap.

**Effort estimate:** 1-2 days per page. The 1142-line file is the lightest of the bunch; 1611-line checkout form edit is heavier.

### P1.6 — TODO/FIXME markers in framework code that should be cleaned up

**Severity:** P1 — these are signals of unfinished work, technical debt, or latent bugs.

**Locations:**
- `modules/admin-setting-page/setup.php:27` — `// FIXME: Dynamic Property set` (PHP 8.2 deprecation, will become a fatal in PHP 9.0)
- `modules/core/src/class-wpdev.php:162` — `// FIXME: refator` (typo and missing context — should be either fixed or removed)
- `modules/table-builder/src/table/class-base-list-table.php:631` — `// FIXME: remove if` (dead branch?)
- `modules/metabox-builder/views/metabox/widget-list-table.php:20` — `// FIXME: Refactor` (whole file flagged for refactor)
- `modules/core/src/class-hooks.php:79` — `// FIXME: Call to undefined function WPDev\wpdev_request()` (real bug — function called from a namespace context)
- `modules/admin-page-builder/views/base/dash.php:13` — the `?? 'FIXME'` already in P0.2

**Why it matters:** These are not just comments. Each is a promise that someone (or some past AI) made and didn't keep. PHP 8.2 deprecations are particularly urgent because the runtime version in CI is **PHP 8.5.6** (from the test output), and the plugin's stated minimum is **PHP 7.4.30** — the team is testing well above minimum, which means deprecations will surface in dev long before they hit users, but a PHP 9.0 release is on the horizon.

**Recommended fix:** File-by-file investigation, fix or remove. Add `composer audit:todo` (new) that fails CI on FIXME/TODO in `modules/` (with allowlist for `dependencies/`).

**Effort estimate:** 1-2 days for the clean sweep.

### P1.7 — PHP 8.2+ deprecations (20 in test output)

**Severity:** P1 — the test suite reported **20 deprecation warnings** on PHP 8.5.6.

**Evidence:** `composer test` output: `Tests: 286, Assertions: 1448, Failures: 1, Warnings: 1, Deprecations: 20, Skipped: 1.`

**Why it matters:** Plugin declares PHP 7.4.30 minimum, but the team is testing on 8.5.6 (good!). The deprecations are mostly dynamic-property creations (PHP 8.2) and possibly implicit-nullable-parameter (PHP 8.4) or similar. These don't break anything today but will become errors in PHP 9.

**Recommended fix:** Run `phpunit --display-deprecations` to enumerate them, fix or `#[\AllowDynamicProperties]` per file.

**Effort estimate:** 2-4 hours (mostly mechanical).

---

## 5. Findings — P2 (medium priority, addressable in next sprint)

### P2.1 — `function_exists` pattern repeated 30+ times

The in-progress refactor introduced `function_exists()` guards in 8+ core files (everywhere core calls a WaaS function). The pattern is repeated and slightly inconsistent:

- `class-faker.php:719-720` — early return on missing
- `class-scripts.php:322` — conditional registration
- `class-legacy-shortcodes.php:173,185,235,465,589` — inline ternary
- `class-migrator.php:1070,1703,2023,2152,2546,2724` — inline ternary
- `class-products.php:48-50` — early return (returns `true`)
- `class-site-template.php:93-98` — inline ternary

**Recommended fix:** Introduce a tiny helper:
```php
function wpdev_call_if_function_exists( string $fn, callable $fallback, ...$args ) {
    return function_exists( $fn ) ? $fn( ...$args ) : $fallback();
}
```
And use it consistently. Optional — not blocking. **Effort:** 2-3 hours.

### P2.2 — `examples/admin-custom-page-top-nav/` naming

The new example for top-nav menu nodes is named `admin-custom-page-top-nav` but contains WaaS-specific menu items (products, customers, payments, etc.). The naming should reflect "WaaS top-nav shortcuts" not "framework top-nav." A name like `waas-admin-bar-shortcuts` or `top-nav-shortcuts` would be clearer.

**Effort:** 15 minutes (file move + module id rename + references).

### P2.3 — `skip_nonce` AJAX handlers need a comment

`class-ajax.php:86,98` registers `wpdev_search` and `wpdev_list_table_fetch_ajax_results` with `skip_nonce => true`. The justification (presumably "the table class is responsible for its own nonce check inside `user_can_ajax_refresh`") is not documented at the call site. A one-line PHPDoc on each registration would help.

**Effort:** 15 minutes.

### P2.4 — Documentation drift after the 6 playground deletions

The `examples/dashboard/API_DOC.md` etc. now have "Removed" sections but the body still references removed code paths. The migration story should be added to the top of each API_DOC.md so future readers understand why the playground is gone.

**Effort:** 1 hour.

### P2.5 — `examples/admin-custom-page-top-nav/` has no API_DOC.md

The other 19 WaaS examples have `API_DOC.md`; the new top-nav example should have one too (short, ~30 lines: "registers 6 admin-bar nodes via the framework's `wpdev_register_admin_bar_node` API").

**Effort:** 30 minutes.

---

## 6. Findings — P3 (deferred, backlog)

### P3.1 — Sample-based review only

I checked `examples/products/`, `examples/checkout/`, and `examples/customers/`. Other examples (sites, payments, gateways, domains, memberships, emails, broadcasts, webhooks, events, platform, system, addons, customer-panel, dashboard, discount-codes, taxes) have not been audited. They likely have the same patterns as products/checkout but should be confirmed. Especially:

- `examples/sites/` — the `grid-item.php` view has unescaped echoes (covered by P0.1) but the underlying `Site_Manager` save logic should be audited for cap-on-save.
- `examples/payments/` — handles money, webhook data, refund flows. Critical.
- `examples/gateways/` — Stripe integration. Critical for credential handling.

**Effort:** 1-2 days for a thorough audit of the remaining 16 examples.

### P3.2 — `class-faker.php` is 1051 lines

The Faker class is the test-data generator. It's 1051 lines and lives in `modules/core/src/class-faker.php` even though it's only useful for playground/dev. Could be moved to `examples/wpdev-dev-mock/` (which already exists).

**Effort:** 2-3 hours.

### P3.3 — SQL queries in `class-migrator.php` use `// phpcs:ignore`

Several `$wpdb->get_var()` and `$wpdb->get_results()` calls in `class-migrator.php` (lines 1771, 1796, 1891, 1944, 2229, 2472, 2674, 2776) carry `// phpcs:ignore` comments suggesting they bypass the escape-output/prepare rules. Most of them appear to be safe (using `$wpdb->base_prefix` and column names, not user input), but a careful review with a SQL-injection-aware eye is warranted before the next release.

**Effort:** 4-6 hours.

---

## 7. Recommended execution plan

### Phase A — Stop the bleeding (1-2 days, single PR or 3 small PRs)

**Goal:** All P0 fixed, CI green, no shipped FIXME.

1. **PR A1: Audit + fix view-layer XSS**
   - Add `bin/audit-view-escaping.php` (greps `views/` for `<?php echo \$` and reports per-file count)
   - Mass-replace ~85 `<?php echo $var; ?>` in `modules/admin-page-builder/views/base/*.php` with `esc_html` / `esc_attr` / `esc_url` / `wp_kses_post` as appropriate
   - Wire `audit-view-escaping` into `composer ci` and `release:gate`
   - **Acceptance:** audit script returns zero, manual review of diff confirms no new escaping gaps
   - **Estimated effort:** 2-3 hours

2. **PR A2: Fix `dash.php` FIXME stub**
   - Replace `<?php echo $page_title ?? 'FIXME'; ?>` with a proper default
   - **Effort:** 5 minutes

3. **PR A3: Restore CI green**
   - Update `PlaygroundSmokeTest::test_all_playgrounds_are_includable` threshold to 27 OR restore the 6 playground.php files as `info` panels
   - **Effort:** 30 minutes (option A) or 2 hours (option B)

### Phase B — Harden (3-5 days, 4-5 PRs)

**Goal:** P1 addressed. Plugin safe to ship with framework-only install.

4. **PR B1: Validation rules fail-closed**
   - Change `class-products.php` and `class-site-template.php` to return `false` (with `_doing_it_wrong`) when products module missing
   - Add unit tests for both rules covering the missing-module case
   - **Effort:** 1-2 hours

5. **PR B2: Escape `Requirements::notice_*` output**
   - Wrap `printf` calls in `wp_kses_post( $message )`
   - **Effort:** 30 minutes

6. **PR B3: BC class_alias for moved settings default sections**
   - Add `class_alias` to `Legacy_Shim_Autoloader` map
   - **Effort:** 30 minutes

7. **PR B4: PHP 8.2 deprecations + TODO/FIXME cleanup**
   - Run `phpunit --display-deprecations`; fix dynamic property creations with `#[\AllowDynamicProperties]` or convert to typed properties
   - File-by-file fix the 5 framework FIXME/TODO markers
   - Add `bin/audit-todo.php` (fails on FIXME/TODO in `modules/`, allowlists `dependencies/`) and wire into `ci`
   - **Effort:** 1-2 days

8. **PR B5: Split `class-wpdev-settings-default-sections.php`**
   - Extract per-section classes under `examples/admin-setting-page-defaults/src/sections/`
   - Keep the public `register()` method as a facade
   - Update `WPDev_Settings_Default_Sections` doc to point to the per-section files
   - **Effort:** 4-6 hours

### Phase C — Polish (1-2 days, can be parallel)

**Goal:** P2 addressed. Code ready for an external "framework" release.

9. **PR C1: `wpdev_call_if_function_exists` helper** — P2.1
10. **PR C2: Rename `admin-custom-page-top-nav` to clearer name** — P2.2
11. **PR C3: Comment `skip_nonce` AJAX handlers** — P2.3
12. **PR C4: Update API_DOC.md for the 6 deleted playground files** — P2.4
13. **PR C5: Add `API_DOC.md` for the new top-nav example** — P2.5

### Phase D — Strategic (1-2 weeks, multi-PR)

**Goal:** Architectural debt paid down, "framework" identity ready.

14. **PR D1-Dn: Split `class-product-edit-admin-page.php` and similar god classes** — P1.5
15. **PR D2: Audit the remaining 16 WaaS examples** — P3.1
16. **PR D3: Move `class-faker.php` to `examples/wpdev-dev-mock/`** — P3.2
17. **PR D4: SQL audit in `class-migrator.php` and friends** — P3.3
18. **PR D5: Rebrand pass** (if pursuing the "WPDev Framework" identity) — `readme.txt`, `wp-dev.php` shim cleanup, `context.md` update, lang files.

---

## 8. Verification gates (each PR must pass before merge)

```bash
composer test                    # PHPUnit — 286 tests, 0 failures
composer smoke                   # 1 file, must exit 0
composer audit:module-naming
composer audit:framework-wording
composer audit:stale-wpdev-paths
composer audit:example-apis
composer audit:ajax-exceptions
composer audit:shim-removal
composer audit:inc-complete      # full inc/ gate
composer audit:sunrise
composer audit:api-doc-schema
composer audit:api-docs
composer audit:playground
composer audit:playground-api-doc
composer audit:playground-contract-sync
composer audit:p3
composer audit:dependency-ownership
# New audits added by this plan:
composer audit:view-escaping     # P0.1
composer audit:todo              # P1.6
composer release:gate            # pre-release only
composer regression:docker       # when changing framework behavior
```

---

## 9. Suggested team plan for parallel execution

If you want to use `mavis-team` to parallelize Phase A and B, the natural track split is:

| Track | Scope | Owner-type | Verifier |
|---|---|---|---|
| **T1: Security** | A1, B1, B2 (XSS + validation + escaping) | security-focused worker | security-reviewer |
| **T2: Test & CI** | A2, A3, B4 (FIXME + test failure + deprecations + TODO) | test-focused worker | tester |
| **T3: Architecture** | B3, B5, C1, C2 (BC shim, settings split, helpers, naming) | architecture worker | code-reviewer |
| **T4: Docs & polish** | C3, C4, C5, Phase D follow-ups | docs worker | (no verifier needed) |

After all tracks land, the maintainer (you) runs `composer ci` and `composer regression:docker` once more before tagging the next release.

---

## 10. Open questions / out of scope

- **Q1:** Is the 6-playground deletion intentional and final? (P0.3 fix path depends on this)
- **Q2:** Are there third-party WaaS addons shipped or planned that depend on `WPDevFramework\Modules\AdminSettingPage\WPDev_Settings_Default_Sections`? (P1.4 BC shim necessity)
- **Q3:** Do you want the framework to remain multisite-only, or do you want it to boot on single-site? (P5.0 of the refactor review, not addressed here)
- **Q4:** Should the rebrand (WPDev → WPDev Framework) happen in this release or the next? Affects how much doc/locale work goes in Phase D.
- **Q5:** What's the PHP 9.0 deadline you're targeting? Drives urgency on the dynamic-property deprecations.
- **Q6:** Are there any customer-facing or partner addons that hook into the moved/renamed classes that I should be aware of?

---

## Appendix A — Full unescaped-echo catalog

(Reference for the A1 PR. ~85 occurrences total.)

**`modules/admin-page-builder/views/base/edit.php`** — 7 occurrences (lines 12, 38, 60, 68, 105, 229 — labels, action links, object id)

**`modules/admin-page-builder/views/base/responsive-table-row.php`** — 14 occurrences (lines 16, 28, 32, 40, 54, 58, 64, 68, 84, 88, 94, 98 — image, title, id, status, item values, item labels)

**`modules/admin-page-builder/views/base/centered.php`** — 4 occurrences (lines 14, 38, 59, 112 — page title, action link, updated message, content block)

**`modules/admin-page-builder/views/base/list.php`** — 4 occurrences (lines 12, 36, 56, 87 — page title, action link, deleted message, page id hidden input)

**`modules/admin-page-builder/views/base/wizard.php`** — 6 occurrences (lines 28, 42, 96, 109, 217, 231 — labels, page title, section/sub-section titles)

**`modules/admin-page-builder/views/base/settings.php`** — 8 occurrences (lines 12, 36, 147, 152, 166, 213, 217, 231 — page title, action link, section/sub-section titles, condition classes)

**`modules/admin-page-builder/views/base/dash.php`** — 2 occurrences (lines 13 — FIXME; line 37 — action link)

**`modules/admin-page-builder/views/base/addons.php`** — 4 occurrences (lines 19, 43, 140, 154 — page title, action link, section/sub-section titles)

**`modules/admin-page-builder/views/base/addons-ajax-tabs.php`** — 1 occurrence (line 68 — URL in JS context)

**`modules/admin-page-builder/views/base/addons/details.php`** — 11 occurrences (lines 19, 25, 36, 83, 84, 104, 214, 666, 681, 690, 702 — addon image URLs in style, addon name, author URL, author, description, slug, hidden input)

**`modules/admin-page-builder/views/base/products/grid-item.php`** — 6 occurrences (lines 22, 26, 36, 48, 49, 53, 63 — featured image, type label, name, price description, bulk-delete value)

**`modules/admin-page-builder/views/base/customers/grid-item.php`** — 7 occurrences (lines 28, 29, 33, 34, 41, 42, 127 — display name, id, email address, VIP status, bulk-delete value)

**`modules/admin-page-builder/views/base/sites/grid-item.php`** — 9 occurrences (lines 17, 18, 24, 34, 35, 39 (×2), 51, 62 — featured image (×2), type label, title, id, site URL (×2), bulk-delete values)

**`modules/admin-page-builder/views/base/editor-customizer.php`** — 1 occurrence (line 46 — preview height in style attribute; URL is escaped)

**`modules/admin-page-builder/views/base/edit/display-notes.php`** — 1 occurrence (line 36 — user display name)

**Total: ~85 unescaped echoes across 15 view files.**

---

*Generated by Mavis (mavis) on 2026-06-02 for the WPDev maintainer. In case of conflict with code, code wins. Update this doc as findings are addressed.*
