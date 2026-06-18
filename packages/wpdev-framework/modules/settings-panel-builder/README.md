# settings-panel-builder

Settings sections, save pipeline, side panels.

## Dependencies

core, field-builder, form-builder, tab-navigation

## Usage

```php
add_action( 'wpdev_settings-panel-builder_register', function () {
	// Register components
} );
```

## Canonical implementation

`WPDevFramework\Settings` lives in `src/class-settings.php`.

`modules/admin-setting-page/Settings.php` is a one-line shim for backward compatibility.

## Legacy bridge

`WPDevFramework\Modules\SettingsPanelBuilder\Settings` maps to `WPDevFramework\Settings` via `class_alias` in `legacy-aliases.php`.
