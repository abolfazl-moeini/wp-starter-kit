# Setup Wizard Module

Network setup wizard and sunrise.php management.

## Dependencies

core, admin-page-builder

## Fixes (2.4.0)

- Removed duplicate `Requirements.php` load (use `WPDevFramework\Requirements` from `inc/class-requirements.php`)
- Fixed `sunrise.php` bootstrap paths to include `modules/wizard/class-sunrise.php`
- Fixed `class-sunrise.php` to require `inc/functions/sunrise.php`

## Usage

The wizard registers automatically on `wpdev_init` when requirements are not yet met:

```php
// Sunrise updates run on wpdev_init
WPDevFramework\Sunrise::manage_sunrise_updates();
```

## Reference pages

- Network setup wizard (`Setup_Wizard_Admin_Page`)
