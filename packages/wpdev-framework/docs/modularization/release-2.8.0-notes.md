# WPDev 2.8.0 — Framework vs examples separation

## Summary

Optional WaaS domain code now lives under **`examples/`** (delete-safe). Required builders and core remain under **`modules/`** (fatal if removed). Generic module APIs replace removed `wpdev_*` function shims.

## What changed

| Before | After |
|--------|-------|
| `modules/wpdev-*` | `examples/*` |
| `wpdev_register_admin_pages()` | `wpdev_register_module_admin_pages()` |
| `wpdev_boot_manager()` | `wpdev_boot_module_manager()` |
| Playground demos under `modules/*/playground.php` (builders) | Co-located under `examples/playground-*` |
| Network regression: 10 slugs incl. `page=wpdev` | **9 network slugs**; dashboard is **site-admin only** |

The `wpdev_module_enabled` filter is still honored via a bridge on `wpdev_module_enabled` for external integrations.

## Upgrade

1. Deploy plugin files (no DB migration required for the tree move).
2. Multisite: ensure `wp-content/sunrise.php` is synced (`composer regression:docker` does this automatically).
3. Custom code referencing `modules/wpdev-*` paths must use `examples/*` instead.
4. Replace direct calls to removed `wpdev_*` helpers with generic APIs (see `migration-guide.md`).

## Verification

```bash
composer ci                  # smoke, audits, PHPUnit (285 tests)
composer regression:docker   # multisite bootstrap + network pages + playground sign-off
composer audit:stale-wpdev-paths
composer audit:example-apis
```

## Maintainer docs

- [`migration-guide.md`](migration-guide.md) — Framework vs examples section
- [`migration-inventory.md`](migration-inventory.md) — Example module map
- [`changelog.md`](changelog.md) — 2.8.0 entry

---

## 2.8.1 — Framework ↔ examples boundary cleanup

Removes the residual coupling from the 2.8.0 split. The framework no longer
owns or boots examples-owned classes, statistics, or settings.

### Moved to `wpdev-examples/dashboard/`
- `WPDevFramework\Admin_Pages\Top_Level_Admin_Page` class file
- `dashboard-statistics.js` + `dashboard-statistics.min.js` assets
- The asset URL `wpdev_get_module_asset_url( 'wpdev-dashboard', 'dashboard-statistics.js', 'js' )`

The `admin-custom-page` module no longer requires or instantiates
`Top_Level_Admin_Page`. With the dashboard example loaded, the top-level
`wpdev` page is registered; with the example absent, no top-level
dashboard is created and the framework survives.

### Moved to `wpdev-examples/sites/`
- `WPDevFramework\UI\Toolbox` class file
- `wpdev_Site`, `wpdev_Site_Template`, `wpdev_Site_Owner` deprecated shims
  (under `src/deprecated/`)
- Sites migration callback registered through the new
  `wpdev_register_migration()` API in place of the previous
  `_install_sites()` method on the core migrator

### Moved to other owning examples
- `wpdev_Coupon` → `wpdev-examples/discount-codes/`
- `wpdev_Plan` → `wpdev-examples/products/`
- `wpdev_Subscription` → `wpdev-examples/memberships/`
- `wpdev_Signup` → `wpdev-examples/checkout/`

`modules/core/src/deprecated/deprecated.php` now only carries the
framework-owned `wpdev_Deprecated_Model` trait plus a docblock pointer
to the owning example for each domain shim.

### New framework APIs
- `wpdev_register_migration( $slug, $callback )` and
  `wpdev_run_migration_callback( $slug )` let examples register their
  migration step. The core migrator looks up the callback at runtime.
- `wpdev_dashboard_statistics_datasource` filter (T4) lets examples
  populate the MRR/churn chart; the framework returns an empty dataset
  by default.
- `wpdev_register_api_settings` and `wpdev_register_jumper_settings`
  consumer actions let the settings panel decide whether to register
  the API & Webhooks / Tools sections.

### Loading
- `Examples_Loader::examples_dir()` now resolves (in order):
  1. `WPDEV_EXAMPLES_DIR` constant
  2. `wpdev_examples_dir` filter
  3. Sibling `wpdev-examples/` plugin
  4. Legacy in-plugin `examples/`
- `Playground_Loader::examples_dir()` delegates to `Examples_Loader`.

### Audit
- `bin/audit-framework-boundary.php` (registered as
  `composer audit:framework-boundary`) fails CI if:
  - any `AI_FXIME` / `AI_FIXME` marker remains in `modules/`
  - any framework module instantiates an examples-owned class
  - `modules/admin-custom-page` references `Top_Level_Admin_Page`
  - framework source references the sibling `wpdev-examples/` path
    outside the two loaders

### Backward compatibility
- The `wpdev_Deprecated_Model` trait stays in the framework (shared by
  every owning example).
- Class aliases on the new files keep the legacy `WPDev\X\Y` FQCNs
  resolving.
- `wpdev.php` continues to load `wpdev-examples` automatically when
  the sibling plugin is present.
