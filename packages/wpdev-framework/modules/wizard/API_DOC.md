# Wizard (`wizard`)

## Overview

Setup wizard module that initializes onboarding page flow and sunrise management bootstrap.

## Standalone usage

```php
wpdev_load_module( 'wizard' );
```

**Declared dependencies:** `core`, `admin-page-builder`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Dependency-driven module load |
| `wpdev_admin_pages` | Wizard page class participates through admin-page base classes |
| `wpdev_init` | Instantiates setup wizard page and runs `WPDevFramework\Sunrise::manage_sunrise_updates()` |

## Public API

No module-scoped `wpdev_*` functions are declared under `src/functions` for this module.

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_setup_wizard` | wizard context | Core wizard render/flow hook |
| `wpdev_setup_get_general_settings` | settings payload | Resolves general setup-step values |
| `wpdev_setup_get_payment_settings` | settings payload | Resolves payment setup-step values |
| `wpdev_setup_step_done_name` | step labels/state | Customizes done-step naming |
| `wpdev_sunrise_loaded` | sunrise runtime context | Runs when sunrise integration is loaded |

## Storage and option keys

- Uses option key `wizard_state` for setup progress state.
- Other persisted settings are delegated to settings/system modules.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| `manage_network` (wizard/admin defaults) | Network admin | `Setup_Wizard_Admin_Page` |

## Registration and menu context

The module registers with `Module_Loader` and creates `Setup_Wizard_Admin_Page` during `wpdev_init`. Page parent/context behavior is inherited from admin-page builder classes and can be mirrored in playground routes.

## Playground

| | |
|--|--|
| **Mode** | `sandbox` panel |
| **Admin URL** | `admin.php?page=wpdev-pg-wizard` |
| **Panel / page slug** | `wpdev-pg-wizard` |
| **Render** | `wpdev_render_wizard_playground_preview()` |
| **Requires modules** | `core`, `admin-page-builder` |
| **Acceptance markers** | `wpdev-styling`, `wpdev-playground-wizard-steps`, `wpdev-wizard-body` |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

*(none — no `modules/wizard/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-wizard/playground.php`
- Helpers: `wpdev-playground/playground-wizard/functions-playground-wizard.php`
- Admin URL: `admin.php?page=wpdev-pg-wizard`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-wizard-steps`, `wpdev-wizard-body`, `wpdev-playground-wizard-nav`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module lists `wizard` in its `setup.php` `dependencies`; sunrise/domain mapping is wired when `wpdev-domains` is active:

- `wpdev-examples/domains/setup.php` — domain mapping (loaded via sunrise when setup finished)
- `wpdev-examples/domains/src/class-domain-mapping.php` — production domain mapping class
- Sunrise boot: `modules/wizard/class-sunrise.php` + `wp-content/sunrise.php`

## Recipes

- Add a custom onboarding step by hooking wizard render/action flow.
- Keep sunrise updates idempotent by extending sunrise hooks instead of patching core wizard code.

## Migration

- Keep wizard customizations hook-based; avoid direct edits to wizard class internals.
- Prefer setup-state option and official wizard hooks for extension.
