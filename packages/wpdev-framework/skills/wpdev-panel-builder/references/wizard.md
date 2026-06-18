# Wizard (setup wizard + sunrise)

**Module:** `@framework/modules/wizard/`  
**Doc:** `@framework/modules/wizard/API_DOC.md`  
**Playground:** `@playground/playground-wizard/` → `admin.php?page=wpdev-pg-wizard`  
**WaaS example:** `@examples/domains/` (sunrise integration)

## When to use

- Extend the WPDev setup wizard steps or labels
- Integrate with sunrise/domain-mapping bootstrap
- Preview onboarding flows in playground

This module has **no `wpdev_register_*` facades** — extension is hook-based.

## Important hooks

| Hook | Purpose |
|------|---------|
| `wpdev_setup_wizard` | Render/extend wizard flow |
| `wpdev_setup_get_general_settings` | Resolve general setup-step values |
| `wpdev_setup_get_payment_settings` | Resolve payment setup-step values |
| `wpdev_setup_step_done_name` | Customize done-step labels |
| `wpdev_sunrise_loaded` | Runs when sunrise integration loads |

## Examples

### Customize step done label

```php
add_filter( 'wpdev_setup_step_done_name', static function ( $label, $step ) {
    if ( 'payment' === $step ) {
        return __( 'Billing configured', 'wpdev' );
    }
    return $label;
}, 10, 2 );
```

### Add general setup values

```php
add_filter( 'wpdev_setup_get_general_settings', static function ( array $settings ) {
    $settings['my_module_enabled'] = wpdev_get_setting( 'my_module_enabled', false );
    return $settings;
} );
```

### React to sunrise loading

```php
add_action( 'wpdev_sunrise_loaded', static function () {
    // Domain mapping bootstrap side effects.
} );
```

## Sunrise operational step

When `SUNRISE` is enabled, copy `@framework/sunrise.php` to `wp-content/sunrise.php`, or let `Sunrise::manage_sunrise_updates()` update it during boot.

Canonical class: `@framework/modules/wizard/class-sunrise.php`.

## Playground helpers

| Function | Purpose |
|----------|---------|
| `wpdev_playground_wizard_steps()` | Demo step definitions |
| `wpdev_playground_wizard_get_state()` | Read sandbox wizard state |
| `wpdev_playground_wizard_save_state()` | Persist sandbox state |

Source: `@playground/playground-wizard/` helper files.