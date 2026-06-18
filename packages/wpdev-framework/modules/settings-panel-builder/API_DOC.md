# Settings Panel Builder (`settings-panel-builder`)

## Overview

Settings section/field registration, option persistence helpers, save pipeline hooks, and settings-shell rendering utilities.

## Standalone usage

```php
wpdev_load_module( 'settings-panel-builder' );
```

Declared dependencies: `core`, `field-builder`, `form-builder`, `tab-navigation`.

## Lifecycle

- Registered via `Module_Loader::register( 'settings-panel-builder', ... )`.
- `Component_Registry::init()` boots settings services.
- `WPDevFramework\Settings` hooks into `wpdev_load`, `init`, and `wpdev_render_settings`.

## Public API

### Option helpers

```php
wpdev_get_option( string $option_name = 'settings', mixed $default = [] ): mixed
wpdev_save_option( string $option_name = 'settings', mixed $value = false ): bool
wpdev_delete_option( string $option_name ): bool
wpdev_get_all_settings(): array
```

Network/site option persistence via `Settings_Storage`. @since 1.9.6–2.0.0

### Setting keys

```php
wpdev_get_setting( string $setting, mixed $default = false ): mixed
wpdev_save_setting( string $setting, mixed $value ): bool
```

Read/write individual keys within the settings blob. @since 2.0.0

### Section registry

```php
wpdev_register_settings_section( string $section_slug, array $atts, bool $replace = true ): void
wpdev_get_settings_section( string $section_slug ): ?array
wpdev_has_settings_section( string $section_slug ): bool
wpdev_list_settings_sections(): array
wpdev_unregister_settings_section( string $section_slug ): void
```

Register settings UI sections consumed by `Settings_Admin_Page` and wizard flows. @since 2.0.0–2.7.0

**Save pipeline:** `Settings_Save` + filters `wpdev_settings_fields_sanitization_rules`, `wpdev_before_save_settings`.

### Field registration

```php
wpdev_register_settings_field( string $section_slug, string $field_slug, array $atts ): void
wpdev_register_settings_side_panel( string $section_slug, array $atts ): void
```

Register fields and side panels for a settings section. Field `$atts` support `type`, `label`, `capability`, sanitization callbacks. @since 2.0.0

## Hooks and filters

- `wpdev_get_option`
- `wpdev_before_save_settings`, `wpdev_pre_save_settings`, `wpdev_after_save_settings`
- `wpdev_settings_get_sections`
- `wpdev_settings_section_{section_slug}_fields`
- `wpdev_settings_register_default_sections`
- `wpdev_get_setting`, `wpdev_save_setting`, `wpdev_get_logo`

## Storage and option keys

- Main settings payload: `wpdev_get_option( 'settings' )` (slugified key).
- Network-first storage model; uses site options only in playground site-admin parity context.
- Playground section conventions use `pg_*` keys and sandbox helpers.
- Field-level persistence flows through `wpdev_save_setting()` and `WPDevFramework\Settings_Storage`.

## Capabilities and context

- Settings page edit gate: `wpdev_edit_settings` (fallbacks in some paths to `manage_options`).
- Per-field visibility supports a `capability` key and is checked during render.
- Supports both network-admin and site-admin parity contexts.

## Registration and menu context

- This module does not directly register production pages.
- It powers the settings shell used by `admin-setting-page` (`Settings_Admin_Page`).
- Side panels register via WordPress metabox API for `wpdev_settings_admin_page`.

## Playground

Dev-only panel (requires active **wpdev-playground** plugin):

- Admin URL: `admin.php?page=wpdev-pg-settings-panel-builder&tab=pg_general`
- Panel slug: `wpdev-pg-settings-panel-builder`
- Render callback: `wpdev_render_settings_panel_playground()`
- Markers: `settings_menu`, `Save Settings`, `Reset this section`
- Acceptance markers: `settings_menu`, `Save Settings`, `Reset this section`

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — settings-panel-builder usage (see README)
- [`examples/example-02.php`](examples/example-02.php) — advanced settings-panel-builder pattern
- [`examples/example-03-third-party-settings.php`](examples/example-03-third-party-settings.php) — a third-party plugin registering its own settings (K3-06)

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-settings-panel-builder/playground.php`
- Helpers: `wpdev-playground/playground-settings-panel-builder/functions-playground-settings.php`
- Admin URL: `admin.php?page=wpdev-pg-settings-panel-builder&tab=pg_general`
- Acceptance markers: `settings_menu`, `Save Settings`, `Reset this section`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-setting-page-defaults/setup.php` — default WPDev settings sections
- `wpdev-examples/admin-setting-page-defaults/src/sections/class-api.php` — API settings section fields
- `wpdev-examples/gateways/src/gateways/class-stripe-gateway.php` — adds gateway-specific fields into the `payment-gateways` section via `wpdev_register_settings_field()` (the section itself is owned by `admin-setting-page-defaults`)

## Recipes

- Add a new section with `wpdev_register_settings_section()` and fields with `wpdev_register_settings_field()`.
- Add contextual help using `wpdev_register_settings_side_panel()`.
- Hook `wpdev_after_save_settings` for post-save side effects (cache flush, integrations, etc.).

## Migration

- 2.7.0 standardized section-registry facades (`wpdev_get_settings_section`, `wpdev_list_settings_sections`, ...).
- Prefer facade functions over touching `Settings_Section_Registry` directly.
