# Vendor scoping

Composer `vendor/` trees collide when multiple WordPress plugins ship the same
packages. wp-starter-kit distributes a **scoped** artifact using
[Brian Henry's Strauss](https://github.com/BrianHenryIE/strauss) wrapper
around `humbug/php-scoper`.

## Why vendor scoping is mandatory in WordPress

PHP class names are **global** across every active plugin in a request. If
Plugin A and Plugin B both `require vendor/autoload.php` and depend on
`guzzlehttp/guzzle`, the second plugin to load `GuzzleHttp\Client` fatals with
`Cannot declare class GuzzleHttp\...`.

Strauss renames vendor namespaces before release. For example,
`GuzzleHttp\Client` becomes `WpdevVendor\GuzzleHttp\Client` inside the
plugin's `vendor-prefixed/` directory. Each plugin ships its own prefixed copy,
so two plugins can coexist without class redeclaration errors.

The scoped autoloader must be required **before** the unscoped one. If you load
unscoped `vendor/autoload.php` first, another plugin may already have registered
the same class names and your scoped copy never gets a chance to win.

```php
// my-plugin.php — correct require order
$plugin_dir = __DIR__ . '/';

if (is_readable($plugin_dir . 'vendor-prefixed/autoload.php')) {
    require_once $plugin_dir . 'vendor-prefixed/autoload.php';
}

if (is_readable($plugin_dir . 'vendor/autoload.php')) {
    require_once $plugin_dir . 'vendor/autoload.php';
}
```

Generated consumer projects run Strauss automatically via `composer.json`
`post-install-cmd` / `post-update-cmd` so `vendor-prefixed/` stays in sync
after every `composer install`.

## Configuration

- `project.config.json → vendorPrefix` — PHP namespace prefix (e.g. `WpdevVendor`).
- `strauss.json` — Strauss config; `namespace_prefix` must match `vendorPrefix`.
- First-party code under `WPDev\` is excluded from prefixing in the kit's own
  `strauss.json` (local `src/` copies). Consumer scaffolds with vendor scoping
  enabled omit that exclusion so `wpdev/framework` is scoped at release time.

Key fields:

| Field | Purpose |
|-------|---------|
| `target_directory` | Output dir (`vendor-prefixed`, never `vendor/`) |
| `namespace_prefix` | Prefix for PSR-4 namespaces |
| `classmap_prefix` | Prefix for classmap autoload entries |
| `delete_vendor_files` | `false` keeps the unscoped tree for dev tooling |

## Commands

```bash
composer install          # dev: unscoped vendor/; post-install runs Strauss
composer scope:vendor       # run Strauss manually (dry-run in CI via config tests)
composer release:dist     # copy shippable tree to dist/{slug}/
```

`composer release` (existing) still runs first-party Rector prefix only.
`composer release:dist` copies production files and writes `.dist-built`.

## Conflict fixtures

`tests/fixtures/conflict-plugins/` contains `plugin-alpha` and `plugin-beta`
with distinct scoped `GuzzleHttp\Client` classes. `VendorScopingIntegrationTest`
boots both in one process.

## Exclusions

Strauss must not prefix WordPress core symbols or your public plugin API.
Extend `strauss.json → exclude_from_prefix` as integration tests fail.