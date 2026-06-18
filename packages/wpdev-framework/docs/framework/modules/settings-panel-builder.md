# Settings Panel Builder

The `settings-panel-builder` module owns settings sections, settings fields,
option helpers, storage, and the save pipeline used by the production settings
page and playground settings demos.

Raw API reference: [`../../../modules/settings-panel-builder/API_DOC.md`](../../../modules/settings-panel-builder/API_DOC.md)

## When To Use

Use this module when you need to:

- Add a settings section or tab.
- Register fields in a settings section.
- Read or write WPDev settings.
- Add side panels/contextual help to a settings section.
- Hook into the settings save lifecycle.

## Loading

```php
wpdev_load_module( 'settings-panel-builder' );
```

Declared dependencies: `core`, `field-builder`, `form-builder`, `tab-navigation`.

## Important APIs

| API | Purpose |
|-----|---------|
| `wpdev_get_option( $option_name = 'settings', $default = array() )` | Read a WPDev option blob. |
| `wpdev_save_option( $option_name, $value )` | Save an option blob. |
| `wpdev_delete_option( $option_name )` | Delete an option blob. |
| `wpdev_get_all_settings()` | Return all WPDev settings. |
| `wpdev_get_setting( $setting, $default = false )` | Read one setting key. |
| `wpdev_save_setting( $setting, $value )` | Save one setting key. |
| `wpdev_register_settings_section( $section_slug, $atts, $replace = true )` | Register a section. |
| `wpdev_get_settings_section( $section_slug )` | Return section config. |
| `wpdev_list_settings_sections()` | List registered sections. |
| `wpdev_register_settings_field( $section_slug, $field_slug, $atts )` | Register a field. |
| `wpdev_register_settings_side_panel( $section_slug, $atts )` | Register a side panel. |

## Example: Register A Settings Section

```php
wpdev_on_load(
	static function () {
		wpdev_register_settings_section(
			'my_integration',
			array(
				'title' => __( 'My Integration', 'wpdev' ),
				'desc'  => __( 'API credentials and behavior.', 'wpdev' ),
			)
		);

		wpdev_register_settings_field(
			'my_integration',
			'enabled',
			array(
				'type'  => 'toggle',
				'title' => __( 'Enable integration', 'wpdev' ),
			)
		);

		wpdev_register_settings_field(
			'my_integration',
			'api_key',
			array(
				'type'       => 'text',
				'title'      => __( 'API key', 'wpdev' ),
				'capability' => 'manage_network',
			)
		);
	}
);
```

## Example: Read A Setting

```php
if ( wpdev_get_setting( 'enabled', false ) ) {
	// Integration is enabled.
}
```

## Example: Post-save Side Effect

```php
add_action(
	'wpdev_after_save_settings',
	static function () {
		delete_transient( 'my_integration_status' );
	}
);
```

## References

### Module-local examples

- [`modules/settings-panel-builder/examples/example-01.php`](../../../modules/settings-panel-builder/examples/example-01.php) — settings-panel-builder usage (see README)
- [`modules/settings-panel-builder/examples/example-02.php`](../../../modules/settings-panel-builder/examples/example-02.php) — advanced settings-panel-builder pattern
- [`modules/settings-panel-builder/examples/example-03-third-party-settings.php`](../../../modules/settings-panel-builder/examples/example-03-third-party-settings.php) — a third-party plugin registering its own settings (K3-06)

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-settings-panel-builder/playground.php`
- Helpers: `wpdev-playground/playground-settings-panel-builder/functions-playground-settings.php`
- Admin URL: `admin.php?page=wpdev-pg-settings-panel-builder&tab=pg_general`
- Acceptance markers: `wpdev-styling`, `settings_menu`, `data-model="setting"`, `Save Settings`, `Reset this section`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-setting-page-defaults/setup.php` — default WPDev settings sections
- `wpdev-examples/admin-setting-page-defaults/src/sections/class-api.php` — API settings fields
- `wpdev-examples/gateways/src/gateways/class-stripe-gateway.php` — adds gateway fields into the `payment-gateways` section via `wpdev_register_settings_field()`

## Example: From production code

From `wpdev-examples/admin-setting-page-defaults/setup.php` — registers sections with `wpdev_register_settings_section()` on `wpdev_load`.

## Notes

- Per-field capability can be set in field config.
- Save sanitization flows through the settings save pipeline and field sanitization rules.
- Production page rendering comes from `admin-setting-page`.

