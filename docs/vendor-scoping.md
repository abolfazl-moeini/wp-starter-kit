# Vendor scoping

Composer `vendor/` trees collide when multiple WordPress plugins ship the same
packages. wp-starter-kit distributes a **scoped** artifact using
[Brian Henry's Strauss](https://github.com/BrianHenryIE/strauss) wrapper
around `humbug/php-scoper`.

## Configuration

- `project.config.json → vendorPrefix` — PHP namespace prefix (e.g. `WpskVendor`).
- `strauss.json` — Strauss config; `namespace_prefix` must match `vendorPrefix`.
- First-party code under `WPSK\` is excluded from prefixing.

## Commands

```bash
composer install          # dev: unscoped vendor/
composer scope:vendor       # run Strauss (dry-run in CI via config tests)
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
