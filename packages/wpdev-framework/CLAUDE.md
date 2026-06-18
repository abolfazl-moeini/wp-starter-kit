# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WPDev is a modular WordPress **multisite admin framework** (formerly a monolithic WaaS plugin) split across **three sibling plugins** that live next to each other in the same `plugins/` directory:

| Plugin | Dir constant | Role | Delete-safe? |
|--------|--------------|------|--------------|
| **wpdev** (this repo) | `WPDEV_PLUGIN_DIR` | Required framework: `modules/` core loader, service registry, and 13 builder modules | No — removing module folders may fatal |
| **wpdev-examples** | `WPDEV_EXAMPLES_DIR` | Optional WaaS domain demos (products, customers, checkout, payments, sites, domains, etc.) that consume only documented framework APIs | Yes — only that example's admin UI disappears |
| **wpdev-playground** | `WPDEV_PLAYGROUND_DIR` | Optional dev-only sandbox menu (`admin.php?page=wpdev-pg-*`) | Yes — dev panels only |

In this checkout the three plugins are sibling folders under `review/` (`wpdev/`, `wpdev-examples/`, `wpdev-playground/`). `wpdev` and `wpdev-examples` are independent git repos on `main`; `wpdev-playground` is not version-controlled here.

## Read these before working

This codebase is unusually well-documented for AI agents. Start here rather than guessing:

- **`docs/CONTEXT.md`** — canonical handoff doc: boot order, lifecycle, module table, "Where is X?" map. The root `context.md` is just a stub pointing here.
- **`docs/STRUCTURE.md`** — folder layout and the layer/delete contract.
- **`skills/wpdev-panel-builder/SKILL.md`** + `skills/wpdev-panel-builder/references/*.md` — the authoritative guide for building any admin panel. Use it before writing panel code.
- **`docs/api/manifest.json`** + each `modules/*/API_DOC.md` and `wpdev-examples/*/API_DOC.md` — the public API contract. **Verify a signature here before inventing a pattern.**
- **`docs/framework/README.md`** — module usage guides and module → playground-panel mapping.

## Build / test / lint

There is **no build, test, or lint tooling in this repo.** As of framework 2.8.1+, `composer.json`, `phpunit.xml.dist`, `bin/`, and GitHub CI were removed from the `wpdev` plugin (confirmed: no `composer.json` exists). Commands referenced in `docs/RELEASE-PREP.md` (`composer ci`, `composer release:gate`, `composer docs:api-*`, `./bin/build-release-zip.sh`) describe the historical release pipeline and **are not runnable here** — do not assume they work.

Verification is **manual smoke testing** in a real WordPress multisite with all three sibling plugins active. Quick repo-level doc/grep checks (run from the `wpdev/` root) are the closest thing to local validation, e.g.:

```bash
rg -n 'WPDEV_PLAYGROUND_RUN|examples/playground-|wpdev/examples/' modules/ docs/framework/ skills/
```

## Architecture & boot order

`wpdev.php` is the canonical bootstrap (`wp-dev.php` is a back-compat shim that just requires it). Boot sequence:

1. Define `WPDEV_PLUGIN_FILE`, require `constants.php` + `autoload.php` (bundled Composer deps under `dependencies/`).
2. Bootstrap the dependency manager, then init the autoloader stack: `Module_Autoloader` (canonical module/example classes) → `Legacy_Shim_Autoloader` (maps old FQCNs/aliases) → `WPDevFramework\Autoloader` (root/core).
3. Require `modules/core/setup.php`.
4. `modules/core/setup.php` registers the `core` module; on `plugins_loaded` pri 5, `Module_Loader::load_all()` discovers and loads every `modules/*/setup.php`. On `wpdev_init` pri 0, `Service_Registry::boot()` boots services.
5. Each sibling plugin owns its own bootstrap — examples/playground are **not** booted from core. wpdev-examples boots on `plugins_loaded` pri 5 (`wpdev_load_examples()`); wpdev-playground on pri 4 (`Playground_Loader::init()`).

### Lifecycle hooks — use these instead of ad-hoc bootstrapping

| Hook | Use for |
|------|---------|
| `wpdev_init` | Early services, singletons |
| `wpdev_load` | `wpdev_register_*`, managers, tables, public functions |
| `wpdev_admin_pages` | Admin page classes (via `wpdev_register_module_admin_pages`) |
| `wpdev_register_forms` | Ajax/modal forms |
| `wpdev_modules_loaded` | Examples load here |

Scheduling helpers: `wpdev_on_load( $cb, $pri = 10 )`, `wpdev_on_admin_pages( $cb, $pri = 10 )`.
Key filters: `wpdev_module_enabled` (toggle a module/example by id), `wpdev_playground_use_real_production_pages`.

### The 13 framework modules (`modules/`)

`core` (loader, service registry, ajax, views, public-function map, base models/managers) is the root dependency. Builders layer on top: `field-builder` → `form-builder` → `settings-panel-builder`; `menu-builder`, `tab-navigation`, `table-builder`, `metabox-builder`, `admin-page-builder`, `admin-widget-builder`, `admin-custom-page`, `admin-setting-page`, `wizard`. See the dependency table in `docs/CONTEXT.md §6`. Note: `table-builder` deliberately depends only on `core` + `tab-navigation` (empty-state rendering lives in `core` so tables don't pull in the page builder).

### Public API — uniform registry facades

Every entity family exposes the same shape; prefer these over mutating registry classes directly:

```php
wpdev_register_{entity}( $id, array $config = [], bool $replace = true ): bool
wpdev_get_{entity}( $id );  wpdev_has_{entity}( $id ): bool
wpdev_list_{entity}(): array;  wpdev_unregister_{entity}( $id ): void
```

Families include `register_module_admin_pages`, `register_table`, `register_form`, `register_field_type`, `register_settings_section`/`register_settings_field`, `register_dashboard_widget`, `register_metabox` (scoped per page: `wpdev_register_metabox( $page_id, $metabox_id, $config )`), `register_menu_top`/`register_menu_child`, `register_ajax_handler`, `register_playground_panel`. Ajax handlers respond via `wpdev_ajax_success()` / `wpdev_ajax_error()`.

## Building a WaaS example / admin panel

1. Invoke the **wpdev-panel-builder skill** and read the matching `references/*.md`.
2. **Copy the nearest example** — `wpdev-examples/products/` is the CRUD gold standard (list + edit pages, list table, manager, DB table). `customers/` for rich edit pages, `checkout/` for cart/forms, `gateways/` for payment gateways, `admin-setting-page-defaults/` for settings sections.
3. Each example is `wpdev-examples/{slug}/setup.php` registering itself via `Module_Loader::register('wpdev-{slug}', [...])` then `wpdev_register_*` calls.

### Hard rules (these cause real breakage / review rejection)

- **Naming:** module id is `wpdev-products`, but the folder is `wpdev-examples/products/` — **never** `wpdev-examples/wpdev-products/`. The `wpdev-*` prefix is allowed under `wpdev-examples/` but **forbidden** under `modules/` (do not create `modules/wpdev-*`).
- **Layer separation:** framework abstractions stay in `modules/`; domain implementations stay in `wpdev-examples/`. Examples must use only documented APIs — never `require` a non-API file from `modules/`.
- **`inc/` is a dead legacy artifact — keep it PHP-free.** Do not add runtime PHP there or reference old `modules/wpdev-*` / `wpdev/examples/` paths.
- **Soft dependencies between examples:** check `wpdev_example_is_loaded( 'wpdev-products' )` before cross-example calls and degrade gracefully.
- Examples own their deprecated shims (`src/deprecated/`) and migration callbacks (`wpdev_register_migration( $slug, $cb )`), loaded from their own `setup.php`.
- Playground code must return early when `WPDEV_PLAYGROUND_DIR` is not defined.
- When a signature is unknown: check `docs/api/manifest.json` → the relevant `API_DOC.md` → the source file → existing example usage. Do not guess.

## Multisite & sunrise

WPDev is multisite-first. When domain mapping is enabled, the plugin-root `sunrise.php` must be copied to `wp-content/sunrise.php` (canonical class: `modules/wizard/class-sunrise.php`; `Sunrise::manage_sunrise_updates()` can auto-update it). `WPDEV_SUNRISE_VERSION` tracks `WPDEV_VERSION`.

## Code style

Match the surrounding code. The codebase uses WordPress-style spacing inside parens (`function foo( $bar )`), `array()` long syntax, and a distinctive `} // end if;` / `} // end foo;` closing-comment convention on control structures and functions. Version (`2.5.0`) is duplicated across `wpdev.php` header, `constants.php` (`WPDEV_VERSION`), and `readme.txt` — keep them in sync when bumping.
