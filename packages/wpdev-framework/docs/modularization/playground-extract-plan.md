# Extract WPDev Playground Into Optional Plugin

> Created: 2026-06-05
> Owner: Core / Modularization
> Scope: separate `wpdev-playground` from `wpdev-examples`; remove default sibling auto-discovery.

## Summary

Create `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-playground` as the
only owner of the `WPDev Playground` menu, `admin.php?page=wpdev-playground`,
and all `wpdev-pg-*` submenu panels. Keep
`/Users/moeini/Dev/multisite/wp-content/plugins/wpdev` as the only mandatory
plugin. `wpdev-examples` and `wpdev-playground` must each work independently
when active, inactive, or active together.

## Status Legend

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `doing` | In progress |
| `done`  | Implemented, audited, and tested |
| `block` | Blocker logged below |

## Task Index

| ID | Title | Status |
|----|-------|--------|
| PT1 | Real `wpdev-examples.php` entrypoint + remove sibling auto-discovery | todo |
| PT2 | Scaffold `wpdev-playground` plugin (entrypoint, run flag, admin notice) | todo |
| PT3 | Move `playground.php` files + `playground-*` helpers + `wpdev-playground-sample` | todo |
| PT4 | Decouple framework `Playground_Loader` from `Examples_Loader` | todo |
| PT5 | Add `wpdev_playground_dir()` helper + filter | todo |
| PT6 | Fix moved file references in all three repos | todo |
| PT7 | Tests for the four activation combinations | todo |
| PT8 | Audit + marker sweep + final validation | todo |

---

## Task PT1 — Real `wpdev-examples.php` entrypoint + remove sibling auto-discovery

### Files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/wpdev-examples.php` (new)
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples/wp-panel-examples.php` (existing shim, keep for BC)
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/class-examples-loader.php`

### Steps

1. Add a real WordPress plugin entrypoint at `wpdev-examples.php`:
   - Standard `Plugin Name:` / `Version:` / `Requires Plugins:` header.
   - Define `WPDEV_EXAMPLES_FILE` and `WPDEV_EXAMPLES_DIR`.
   - Require the framework `wpdev.php` if `wpdev_load_examples` is not yet defined
     (so calling `wpdev_load_examples()` from the plugin works once the
     framework is active). If framework is missing, show an admin notice
     and return.
   - On `plugins_loaded` priority 5, call `wpdev_load_examples()`.

2. In `class-examples-loader.php::examples_dir()`:
   - Remove the sibling plugin fallback (step 3 in the current chain).
   - Keep `WPDEV_EXAMPLES_DIR` constant + `wpdev_examples_dir` filter.
   - Keep the legacy in-plugin `wpdev/examples/` fallback as the last resort
     for old installations.
   - Document the resolution chain in the docblock.

3. Update tests:
   - `ExamplesDeletionSafetyTest::test_examples_loader_examples_dir_supports_sibling_and_constant_and_filter`
     is now obsolete; replace with one that asserts the resolution is
     constant → filter → legacy (no sibling auto-discovery).

---

## Task PT2 — Scaffold `wpdev-playground` plugin

### Files

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-playground/wpdev-playground.php` (new)
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-playground/README.md` (new)
- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev-playground/.gitignore` (new)

### Steps

1. Create the plugin file with a WordPress header.
2. Define `WPDEV_PLAYGROUND_FILE`, `WPDEV_PLAYGROUND_DIR`,
   `WPDEV_PLAYGROUND_URL`.
3. Define `WPDEV_PLAYGROUND_RUN` as `true` if not already defined
   (must happen at file-load time, **not** inside `plugins_loaded`,
   because the framework `Playground_Loader` reads the constant at
   `plugins_loaded` priority 4).
4. If the framework is inactive (no `wpdev_load_examples` function or
   no `WPDevFramework\Core\Playground\Playground_Loader` class), show
   an admin notice and return.
5. On `plugins_loaded` priority 4 (matches framework), do
   `\WPDevFramework\Core\Playground\Playground_Loader::init()`.
6. README documents activation, the menu slug, and the four activation
   combinations.

---

## Task PT3 — Move playground ownership out of examples

### Files moved

| From (wpdev-examples) | To (wpdev-playground) |
|----------------------|----------------------|
| `addons/playground.php` | `addons/playground.php` |
| `broadcasts/playground.php` | `broadcasts/playground.php` |
| `checkout/playground.php` | `checkout/playground.php` |
| `customer-panel/playground.php` | `customer-panel/playground.php` |
| `customers/playground.php` | `customers/playground.php` |
| `dashboard/playground.php` | `dashboard/playground.php` |
| `discount-codes/playground.php` | `discount-codes/playground.php` |
| `domains/playground.php` | `domains/playground.php` |
| `emails/playground.php` | `emails/playground.php` |
| `events/playground.php` | `events/playground.php` |
| `gateways/playground.php` | `gateways/playground.php` |
| `memberships/playground.php` | `memberships/playground.php` |
| `metabox-post-type/playground.php` | `metabox-post-type/playground.php` |
| `payments/playground.php` | `payments/playground.php` |
| `platform/playground.php` | `platform/playground.php` |
| `products/playground.php` | `products/playground.php` |
| `sites/playground.php` | `sites/playground.php` |
| `system/playground.php` | `system/playground.php` |
| `taxes/playground.php` | `taxes/playground.php` |
| `webhooks/playground.php` | `webhooks/playground.php` |
| `playground-admin-custom-page/` | `playground-admin-custom-page/` |
| `playground-admin-page-builder/` | `playground-admin-page-builder/` |
| `playground-admin-setting-page/` | `playground-admin-setting-page/` |
| `playground-admin-widget-builder/` | `playground-admin-widget-builder/` |
| `playground-field-builder/` | `playground-field-builder/` |
| `playground-form-builder/` | `playground-form-builder/` |
| `playground-menu-builder/` | `playground-menu-builder/` |
| `playground-metabox-builder/` | `playground-metabox-builder/` |
| `playground-metabox-post-type/` | `playground-metabox-post-type/` |
| `playground-parity/` | `playground-parity/` |
| `playground-settings-panel-builder/` | `playground-settings-panel-builder/` |
| `playground-tab-navigation/` | `playground-tab-navigation/` |
| `playground-table-builder/` | `playground-table-builder/` |
| `playground-wizard/` | `playground-wizard/` |
| `playground-wpdev/` | `playground-wpdev/` |
| `wpdev-playground-sample/` | (delete — superseded by real entrypoint) |

### Notes

- The `wpdev-playground-sample` mini-plugin is removed: the real
  `wpdev-playground` plugin replaces it.
- Domain example folders stay in `wpdev-examples` (`products`, `domains`,
  `broadcasts`, `payments`, `taxes`, etc.) — only their `playground.php`
  files move.

---

## Task PT4 — Decouple framework `Playground_Loader` from examples

### File

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/playground/class-playground-loader.php`

### Steps

1. `Playground_Loader::examples_dir()` is removed. The loader is now
   example-agnostic; it just looks for playground panels under its own
   module / framework paths.
2. `include_playgrounds()` reads `modules/*/playground.php` only.
3. Top-level menu registration stays in the framework; submenu panel
   discovery moves to the new plugin.
4. The new plugin's `wpdev-playground.php` includes playground panels
   from `WPDEV_PLAYGROUND_DIR` after the framework has booted.
5. Stable slugs preserved: `wpdev-playground` (top), `wpdev-pg-{module_id}`
   (subs).

---

## Task PT5 — Add `wpdev_playground_dir()` helper + filter

### File

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/modules/core/src/functions/playground-paths.php` (new)

### Steps

1. New `wpdev_playground_dir()` helper:
   - Resolves to `WPDEV_PLAYGROUND_DIR` constant if defined.
   - Falls back to `wpdev_playground_dir` filter result.
   - Falls back to sibling plugin auto-discovery
     (`dirname( WPDEV_PLUGIN_FILE ) . '/../wpdev-playground'`) **only
     when the playground plugin exists**. The constant + filter are
     the explicit activation channels.
2. Backward-compatible `wpdev_playground_example_helper_path( $helper )`
   resolves helpers from `wpdev-playground/playground-{id}/` rather
   than from the old in-plugin `examples/playground-{id}/`.
3. Update `bin/legacy-autoload-bootstrap.php` and `bin/smoke-modularization.php`
   to require this new helper.

---

## Task PT6 — Fix moved file references

### Files

- `modules/core/src/playground/functions-playground-*.php`
- `modules/core/src/functions/playground-context.php`
- `modules/admin-custom-page/setup.php`
- `examples/*/src/functions/*.php` (residual)
- `bin/legacy-autoload-bootstrap.php`

### Steps

1. Replace all `wpdev_path( 'examples/playground-...' )` with the new
   `wpdev_playground_dir()` + `__DIR__`-relative paths.
2. Update `playground-wpdev/functions-playground-wpdev.php` to not load
   customer-panel helpers from `wpdev_path( 'examples/...' )`.
3. Update `tests/unit-tests/playground-test-helpers.php` to use the
   sibling playground plugin.

---

## Task PT7 — Tests for the four activation combinations

### File

- `/Users/moeini/Dev/multisite/wp-content/plugins/wpdev/tests/unit-tests/Core/PlaygroundIndependenceTest.php` (new)

### Coverage

- `WPDEV_EXAMPLES_DIR` undefined + no sibling → examples not loaded.
- `WPDEV_EXAMPLES_DIR` defined → examples loaded.
- Playground plugin file present + `WPDEV_PLAYGROUND_RUN` true → menu
  registered.
- Playground plugin missing or `WPDEV_PLAYGROUND_RUN` false → no menu.
- `wpdev_playground_example_helper_path( 'wpdev' )` resolves to the
  sibling playground plugin.
- `Examples_Loader::examples_dir()` does **not** auto-discover
  `wpdev-examples` sibling when only the framework is active.

---

## Task PT8 — Audit + marker sweep + final validation

### New audit

- `bin/audit-playground-separation.php`
  - Fails if `wpdev-examples` still contains `*/playground.php` or a
    `playground-*` directory.
  - Fails if any framework module still references
    `wpdev_path( 'examples/playground-' )` or
    `../wpdev-examples/playground`.
  - Fails if `Playground_Loader::include_playgrounds()` reads from
    `Examples_Loader::examples_dir()`.
  - Wired as `composer audit:playground-separation`.

### Final validation commands

```bash
rg -n "examples/playground-|wpdev-examples/playground|wpdev_path\\('examples/playground" \
  /Users/moeini/Dev/multisite/wp-content/plugins/wpdev \
  /Users/moeini/Dev/multisite/wp-content/plugins/wpdev-examples \
  /Users/moeini/Dev/multisite/wp-content/plugins/wpdev-playground
composer test
composer ci
```

Expected: no hits, all audits green, all tests pass.

---

## Cross-References

- [coupling-cleanup-ai-fixme-plan.md](./coupling-cleanup-ai-fixme-plan.md) —
  prior decoupling pass that the playground extract builds on.
- [class-alias-matrix.md](./class-alias-matrix.md) — alias map.
- [architecture-contracts.md](./architecture-contracts.md) — boundary contracts.

---

## Final State

After this plan:

| Plugin | Required? | Owns |
|--------|-----------|------|
| `wpdev` | yes | framework modules, builders, public APIs |
| `wpdev-examples` | no (explicit activation) | WaaS domain modules, deprecated shims, settings page defaults |
| `wpdev-playground` | no (explicit activation) | WPDev Playground menu, `wpdev-pg-*` submenu panels, `playground-*` helpers |

The framework is mandatory; the other two are independently optional.
