# Wizard

The `wizard` module owns the setup wizard page flow and sunrise update handling.
It is a production shell that relies on `core` and `admin-page-builder`.

Raw API reference: [`../../../modules/wizard/API_DOC.md`](../../../modules/wizard/API_DOC.md)

## When To Use

Use this module when you need to:

- Load or understand the WPDev setup wizard.
- Extend setup-step values or labels with hooks.
- Integrate with sunrise/domain-mapping bootstrap.
- Add playground previews for onboarding flows.

## Loading

```php
wpdev_load_module( 'wizard' );
```

Declared dependencies: `core`, `admin-page-builder`.

## Public APIs

This module does not declare module-scoped `wpdev_*` functions. Extension is
hook-based.

## Important Hooks

| Hook | Purpose |
|------|---------|
| `wpdev_setup_wizard` | Render/extend wizard flow. |
| `wpdev_setup_get_general_settings` | Resolve general setup-step values. |
| `wpdev_setup_get_payment_settings` | Resolve payment setup-step values. |
| `wpdev_setup_step_done_name` | Customize done-step labels/state. |
| `wpdev_sunrise_loaded` | Runs when sunrise integration is loaded. |

## Storage

| Key | Purpose |
|-----|---------|
| `wizard_state` | Setup progress/state. |

Other settings are delegated to settings/system modules.

## Example: Customize A Step Done Label

```php
add_filter(
	'wpdev_setup_step_done_name',
	static function ( $label, $step ) {
		if ( 'payment' === $step ) {
			return __( 'Billing configured', 'wpdev' );
		}

		return $label;
	},
	10,
	2
);
```

## Example: Add General Setup Values

```php
add_filter(
	'wpdev_setup_get_general_settings',
	static function ( array $settings ) {
		$settings['my_module_enabled'] = wpdev_get_setting( 'my_module_enabled', false );

		return $settings;
	}
);
```

## Example: React To Sunrise Loading

```php
add_action(
	'wpdev_sunrise_loaded',
	static function () {
		// Keep this path light; sunrise runs very early.
	}
);
```

## References

### Module-local examples

*(none — no `modules/wizard/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Sandbox: `wpdev-playground/playground-wizard/playground.php`
- Helpers: `wpdev-playground/playground-wizard/functions-playground-wizard.php`
- Admin URL: `admin.php?page=wpdev-pg-wizard`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-wizard-steps`, `wpdev-wizard-body`, `wpdev-playground-wizard-nav`

### WaaS examples (requires wpdev-examples plugin)

No WaaS module lists `wizard` in its `setup.php` `dependencies`; sunrise/domain mapping is wired when `wpdev-domains` is active:

- `wpdev-examples/domains/setup.php` — domain mapping loaded via sunrise
- `wpdev-examples/domains/src/class-domain-mapping.php` — production domain mapping
- Sunrise: `wp-content/sunrise.php` → `modules/wizard/class-sunrise.php`

## Example: From production code

From `wpdev-playground/playground-wizard/playground.php` — preview wizard steps via `wpdev_render_wizard_playground_preview()`.

## Notes

- `WPDEV_SUNRISE_VERSION` is managed through the plugin `sunrise.php` and `modules/wizard/class-sunrise.php`.
- Keep sunrise callbacks lightweight and idempotent.
- Extend wizard behavior with hooks instead of editing wizard internals.

