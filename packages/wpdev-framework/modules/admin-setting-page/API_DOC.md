# Admin Setting Page (`admin-setting-page`)

## Overview

Registers the WPDev settings admin page and default settings sections on top of settings-panel/admin-page builder infrastructure.

## Standalone usage

```php
wpdev_load_module( 'admin-setting-page' );
```

**Declared dependencies:** `core`, `settings-panel-builder`, `admin-page-builder`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Dependency-driven setup |
| `wpdev_admin_pages` | Instantiates `WPDevFramework\Admin_Pages\Settings_Admin_Page` |
| `wpdev_init` | Sets `wpdev()->settings` and settings runtime object |

## Public API

No module-scoped `wpdev_*` functions are declared under `src/functions` for this module.

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_settings_register_default_sections` | settings registry/args | Registers default WPDev settings sections |
| `wpdev_render_settings` | render context args | Used while rendering settings screen sections |
| `wpdev_settings_domain_mapping` | settings section context | Domain mapping settings rendering |
| `wpdev_settings_payment_gateways` | settings section context | Payment-gateway settings rendering |
| `wpdev_settings_site_templates` | settings section context | Site template settings rendering |

## Storage and option keys

- Persists settings through `settings-panel-builder` storage APIs (module itself does not declare unique option keys in `setup.php`).
- Runtime singleton assignment is `wpdev()->settings`.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| `manage_network` (default settings-page pattern) | Network admin | `Settings_Admin_Page` |

## Registration and menu context

This module instantiates `Settings_Admin_Page` on `wpdev_admin_pages` and relies on `admin-page-builder` registration behavior for menu placement. In playground parity, the production page class is re-bound under the playground menu by core parity tooling.

## Playground

| | |
|--|--|
| **Mode** | `production parity` (default), sandbox fallback available |
| **Admin URL** | `admin.php?page=wpdev-settings` |
| **Panel / page slug** | `wpdev-settings` |
| **Render** | `WPDevFramework\Admin_Pages\Settings_Admin_Page` |
| **Requires modules** | `core`, `settings-panel-builder`, `admin-page-builder` |
| **Acceptance markers** | `wpdev-styling`, `settings_menu`, `Save Settings` |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

*(none — no `modules/admin-setting-page/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-admin-setting-page/playground.php`
- Render helper: `modules/settings-panel-builder/src/functions/settings.php` → `wpdev_render_admin_setting_page_playground()`
- Admin URL (sandbox): `admin.php?page=wpdev-pg-admin-setting-page&tab=pg_general`
- Admin URL (parity): `admin.php?page=wpdev-settings` (re-bound under `wpdev-playground` menu)
- Acceptance markers: `wpdev-styling`, `Settings_Admin_Page`, `wpdev-playground-admin-setting-wiring`, `settings_menu`, `Save Settings`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-setting-page-defaults/setup.php` — registers default settings sections on `Settings_Admin_Page`
- `wpdev-examples/admin-setting-page-defaults/src/class-wpdev-settings-default-sections.php` — section wiring
- `wpdev-examples/gateways/src/gateways/class-stripe-gateway.php` — adds gateway fields into the `payment-gateways` section via `wpdev_register_settings_field()`

## Recipes

- Add a custom settings section while reusing panel-builder save/read pipelines.
- Inject product-specific fields into existing settings tabs with settings hooks.

## Migration

- Keep settings logic in section/action hooks; avoid direct page-class edits for extension points.
- Prefer settings-panel builder APIs for read/write/sanitization behavior.
