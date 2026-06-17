# ADR 001: Strauss over php-scoper for vendor prefixing

**Status:** Accepted  
**Date:** 2026-06-17

## Context

WordPress loads every active plugin in one PHP process. When two plugins ship
Composer `vendor/` trees that declare the same class names (for example
`GuzzleHttp\Client`), the second `require vendor/autoload.php` fatals with
`Cannot declare class …`.

Both [humbug/php-scoper](https://github.com/humbug/php-scoper) and
[Brian Henry's Strauss](https://github.com/BrianHenryIE/strauss) rename
third-party namespaces before release. The starter kit must pick one tool and
wire it into the scaffold, `composer.json` post-install hooks, and release
pipeline.

## Decision

Use **Strauss** (Strauss wraps php-scoper) as the only vendor-prefixing tool
for generated plugins.

Reasons:

1. **WordPress-first workflow** — Strauss is maintained for plugin authors.
   Configuration lives in `strauss.json` beside `composer.json`; `composer
scope:vendor` (or post-install) produces `vendor-prefixed/` without a custom
   bootstrap shim.
2. **No extra bootstrap file** — php-scoper often needs a hand-written
   `scoper-autoload.php` or similar entry that must be required before
   WordPress loads other plugins. Strauss emits a standard
   `vendor-prefixed/autoload.php` that matches Composer conventions.
3. **Vendor cleanup** — Strauss can delete or exclude original vendor files
   after prefixing, keeping release tarballs smaller and reducing the chance
   that unscoped classes are loaded accidentally.
4. **Fits the kit's autoload order** — Generated plugins require
   `vendor-prefixed/autoload.php` **before** `vendor/autoload.php` so scoped
   classes win. Strauss output aligns with that contract (see
   [vendor-scoping.md](../vendor-scoping.md)).

php-scoper remains useful for generic PHP apps, but its configuration surface
and bootstrap requirements are heavier for a WordPress plugin monorepo that
already standardizes on Composer scripts.

## Consequences

- Every consumer project with `vendorScoping: on` ships `strauss.json` and
  runs Strauss on `composer install` / `composer update`.
- `project.config.json → vendorPrefix` must match `strauss.json →
namespace_prefix`.
- Release builds (`composer rector:prefix`, `dev/release/build-dist.php`)
  assume Strauss output under `vendor-prefixed/`.
- If Strauss is ever replaced, treat it as a breaking migration: update the
  scaffold, docs, and consumer `wpdev update` migrations together.

## References

- [vendor-scoping.md](../vendor-scoping.md)
- [plugin-bootstrap.md](../plugin-bootstrap.md) — autoload require order
