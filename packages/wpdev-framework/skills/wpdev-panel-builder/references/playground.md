# Playground demo panels

Dev-only panels under WPDev Playground (`admin.php?page=wpdev-playground`). Requires `@playground/` sibling plugin (`defined( 'WPDEV_PLAYGROUND_DIR' )`).

**Full module index:** [playground-index.md](playground-index.md)

## Boot and discovery

- Entry: `@playground/wpdev-playground.php` on `plugins_loaded` priority 4
- Infrastructure: `@playground/includes/playground/`
- Panels: `@playground/playground-{module}/playground.php`
- Registration: `wpdev_register_playground_panel()` — [api-cookbook.md](api-cookbook.md)

Panels live in **wpdev-playground**, not `@framework/modules/` or `@examples/`.

## Register a panel

```php
<?php
defined( 'ABSPATH' ) || exit;

if ( ! defined( 'WPDEV_PLAYGROUND_DIR' ) ) {
    return;
}

wpdev_register_playground_panel( 'my-module', array(
    'title'  => __( 'My Module', 'wpdev' ),
    'type'   => 'render',
    'render' => static function () {
        echo '<div class="wrap"><h1>My Module</h1></div>';
    },
) );
```

### $args keys

| Key | Purpose |
|-----|---------|
| `title` | Required panel title |
| `type` | `render` (default) or `info` |
| `capability` | Default `manage_options` |
| `group` | `core`, `builder`, `domain`, `example` |
| `hide_title` | Skip h1 wrapper |
| `setup` | Callable — runs once on first render |
| `render` | Callable — outputs HTML |
| `assets` | `array( 'scripts' => [], 'required_handles' => [] )` |
| `acceptance_markers` | Manual verification strings |
| `requires_modules` | Module ids that must load |

Returns `false` when playground is inactive or production parity replaces sandbox.

## Domain list preview shortcut

```php
wpdev_register_playground_panel(
    'wpdev-products',
    wpdev_playground_list_panel( 'wpdev-products', 'WaaS Products' )
);
```

Helper: `@playground/playground-wpdev/functions-playground-wpdev.php`.

## Builder playgrounds

| Module | Panel | Helpers |
|--------|-------|---------|
| `form-builder` | `@playground/playground-form-builder/` | `functions-playground-form.php` |
| `field-builder` | `@playground/playground-field-builder/` | `functions-playground-fields.php` |
| `table-builder` | `@playground/playground-table-builder/` | `functions-playground-table-interactive.php` |
| `admin-page-builder` | `@playground/playground-admin-page-builder/` | `functions-playground-pages.php` |

## Production parity

Real admin pages re-bind when both `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are defined. Filter: `wpdev_playground_use_real_production_pages` (default on). Sandbox: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1`.

## References

- Module guides: `@framework/docs/framework/README.md`
- Per-module API: `@framework/modules/{module}/API_DOC.md`
- WaaS patterns: `@examples/{slug}/setup.php`