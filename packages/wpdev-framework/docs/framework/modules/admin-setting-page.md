# Admin Setting Page

The `admin-setting-page` module registers the production WPDev settings admin
page. It is a shell over `settings-panel-builder` and `admin-page-builder`.

Raw API reference: [`../../../modules/admin-setting-page/API_DOC.md`](../../../modules/admin-setting-page/API_DOC.md)

## When To Use

Use this module when you need to:

- Understand or load the production settings page.
- Add settings sections that should appear in `wpdev-settings`.
- Hook into settings rendering without editing the page class.

## Loading

```php
wpdev_load_module( 'admin-setting-page' );
```

Declared dependencies: `core`, `settings-panel-builder`, `admin-page-builder`.

## Public APIs

This module does not declare module-scoped `wpdev_*` APIs. Use:

- `settings-panel-builder` for settings sections, fields, side panels, storage, and save hooks.
- `admin-page-builder` for page rebinding or layout-level extension.

## Important Hooks

| Hook | Purpose |
|------|---------|
| `wpdev_settings_register_default_sections` | Register default settings sections. |
| `wpdev_render_settings` | Render settings screen sections. |
| `wpdev_settings_domain_mapping` | Domain mapping section rendering. |
| `wpdev_settings_payment_gateways` | Payment gateway section rendering. |
| `wpdev_settings_site_templates` | Site template section rendering. |

## Example: Add A Settings Section To The Production Page

```php
wpdev_on_load(
	static function () {
		wpdev_register_settings_section(
			'my_module',
			array(
				'title' => __( 'My Module', 'wpdev' ),
			)
		);

		wpdev_register_settings_field(
			'my_module',
			'enabled',
			array(
				'type'  => 'toggle',
				'title' => __( 'Enable My Module', 'wpdev' ),
			)
		);
	}
);
```

## Example: Render Custom Section Content

```php
add_action(
	'wpdev_render_settings',
	static function ( $args ) {
		if ( 'my_module' !== ( $args['section'] ?? '' ) ) {
			return;
		}

		echo '<p>' . esc_html__( 'Extra section content.', 'wpdev' ) . '</p>';
	}
);
```

## References

### Module-local examples

*(none — no `modules/admin-setting-page/examples/` samples for this module; settings sections live in settings-panel-builder + wpdev-examples)*

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-admin-setting-page/playground.php`
- Render helper: `modules/settings-panel-builder/src/functions/settings.php` → `wpdev_render_admin_setting_page_playground()`
- Admin URL (sandbox): `admin.php?page=wpdev-pg-admin-setting-page&tab=pg_general`
- Admin URL (parity): `admin.php?page=wpdev-settings` (re-bound under `wpdev-playground` menu)
- Acceptance markers: `wpdev-styling`, `Settings_Admin_Page`, `wpdev-playground-admin-setting-wiring`, `settings_menu`, `Save Settings`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-setting-page-defaults/setup.php` — default settings sections
- `wpdev-examples/admin-setting-page-defaults/src/class-wpdev-settings-default-sections.php` — section wiring
- `wpdev-examples/gateways/setup.php` — gateway settings

## Example: From production code

From `wpdev-examples/admin-setting-page-defaults/setup.php` — hooks `wpdev_settings_register_default_sections` to add API, Jumper, and domain sections.

## Notes

- Runtime singleton assignment is `wpdev()->settings`.
- Save/read behavior belongs to `settings-panel-builder`.
- Do not edit `Settings_Admin_Page` for normal extension; use section/field hooks.

