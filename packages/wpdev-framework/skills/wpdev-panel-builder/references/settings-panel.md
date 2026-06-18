# Settings panel

Register global settings for `Settings_Admin_Page` (`@framework/modules/admin-setting-page/`).

**Source:** `@framework/modules/settings-panel-builder/src/functions/settings.php`  
**Cookbook:** [api-cookbook.md](api-cookbook.md) — `wpdev_register_settings_section`, `wpdev_register_settings_field`

## Register on wpdev_load

```php
add_action( 'wpdev_load', static function () {
    wpdev_register_settings_section( 'my_addon', array(
        'title' => __( 'My Add-on', 'wpdev' ),
        'icon'  => 'dashicons-admin-generic',
        'order' => 10,
    ) );

    wpdev_register_settings_field( 'my_addon', 'api_key', array(
        'type'       => 'text',
        'title'      => __( 'API Key', 'wpdev' ),
        'default'    => '',
        'capability' => 'manage_network',
    ) );

    wpdev_register_settings_field( 'my_addon', 'enabled', array(
        'type'    => 'toggle',
        'title'   => __( 'Enable', 'wpdev' ),
        'default' => 1,
    ) );
} );
```

## Read and save

```php
$api_key = wpdev_get_setting( 'api_key', '' );

if ( isset( $_POST['api_key'] ) ) {
    wpdev_save_setting( 'api_key', sanitize_text_field( wp_unslash( $_POST['api_key'] ) ) );
}
```

## Signatures

```php
wpdev_register_settings_section( string $section_slug, array $atts, bool $replace = true ): void
wpdev_register_settings_field( string $section_slug, string $field_slug, array $atts ): void
wpdev_register_settings_side_panel( string $section_slug, array $atts ): void
wpdev_get_setting( string $setting, mixed $default = false ): mixed
wpdev_save_setting( string $setting, mixed $value ): bool
```

Registry: `wpdev_get_settings_section()`, `wpdev_has_settings_section()`, `wpdev_list_settings_sections()`.

## Field $atts keys

| Key | Purpose |
|-----|---------|
| `type` | `text`, `toggle`, `select`, `textarea`, … |
| `title` | Label |
| `default` | Default value |
| `capability` | Per-field visibility |
| `description` | Help text |
| `options` | For `select` |

Views: `wpdev_field_view( 'settings', $type )`.

## Save pipeline hooks

| Hook | When |
|------|------|
| `wpdev_before_save_settings` | Before save |
| `wpdev_pre_save_settings` | Pre-process |
| `wpdev_after_save_settings` | Post-save |
| `wpdev_settings_fields_sanitization_rules` | Extend sanitization |

Storage: `wpdev_get_option( 'settings' )`; keys via `wpdev_get_setting()` / `wpdev_save_setting()`.

## Side panel

```php
wpdev_register_settings_side_panel( 'my_addon', array(
    'title'   => __( 'Help', 'wpdev' ),
    'content' => __( 'Configure your add-on here.', 'wpdev' ),
) );
```

## Production defaults hook

```php
add_action( 'wpdev_settings_register_default_sections', static function () {
    wpdev_register_settings_section( 'branding', array( 'title' => __( 'Branding', 'wpdev' ) ) );
} );
```

Example: `@examples/admin-setting-page-defaults/setup.php`. Shell: [custom-and-setting-pages.md](custom-and-setting-pages.md).

## Playground demo

```php
wpdev_playground_register_settings_demo_sections();
wpdev_render_settings_panel_playground( array(
    'section_prefix' => 'pg_',
    'page_slug'      => 'wpdev-pg-settings-panel-builder',
) );
```

Panel: `@playground/playground-settings-panel-builder/playground.php` → `admin.php?page=wpdev-pg-settings-panel-builder`.

Third-party plugins register sections only — no need to own the settings page class.