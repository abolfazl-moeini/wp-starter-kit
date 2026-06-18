# Playground index (all 13 framework modules)

Full module ↔ playground ↔ WaaS example mapping. Sibling plugins: `@playground/`, `@examples/`.

Extra panels: `@playground/playground-wpdev/` (WaaS list preview), `@playground/playground-metabox-post-type/`.

| Framework module | Playground panel | Admin URL | Acceptance markers | WaaS example |
|-----------------|------------------|-----------|--------------------|--------------|
| `core` | *(infra)* `@playground/includes/playground/` | — | — | All via parity registry |
| `field-builder` | `@playground/playground-field-builder/` | `?page=wpdev-pg-field-builder` | — | `@examples/products/`, `@examples/checkout/` |
| `form-builder` | `@playground/playground-form-builder/` | `?page=wpdev-pg-form-builder` | modal/wubox triggers | `@examples/checkout/`, `@examples/payments/` |
| `settings-panel-builder` | `@playground/playground-settings-panel-builder/` | `?page=wpdev-pg-settings-panel-builder` | — | `@examples/admin-setting-page-defaults/`, `@examples/gateways/` |
| `menu-builder` | `@playground/playground-menu-builder/` | `?page=wpdev-pg-menu-builder` | — | `@examples/products/`, `@examples/sites/` |
| `tab-navigation` | `@playground/playground-tab-navigation/` | `?page=wpdev-pg-tab-navigation` | — | `@examples/products/`, `@examples/sites/` |
| `table-builder` | `@playground/playground-table-builder/` | `?page=wpdev-pg-table-builder` | interactive table refresh hooks | `@examples/products/`, `@examples/webhooks/` |
| `metabox-builder` | `@playground/playground-metabox-builder/` | `?page=wpdev-pg-metabox-builder` | — | `@examples/products/`, `@examples/metabox-post-type/` |
| `admin-page-builder` | `@playground/playground-admin-page-builder/` | `?page=wpdev-pg-admin-page-builder` | — | `@examples/products/`, `@examples/customers/` |
| `admin-widget-builder` | `@playground/playground-admin-widget-builder/` | `?page=wpdev-pg-admin-widget-builder` | `wpdev-styling`, `data-wpdev-widget`, `postbox` | `@examples/dashboard/`, `@examples/admin-custom-page-dashboard-widgets/` |
| `admin-custom-page` | `@playground/playground-admin-custom-page/` + `@playground/playground-wpdev/` | `?page=wpdev-pg-admin-custom-page` | — | `@examples/dashboard/`, `@examples/admin-custom-page-top-nav/` |
| `admin-setting-page` | `@playground/playground-admin-setting-page/` | `?page=wpdev-pg-admin-setting-page` | — | `@examples/admin-setting-page-defaults/` |
| `wizard` | `@playground/playground-wizard/` | `?page=wpdev-pg-wizard` | — | `@examples/domains/` |

## Acceptance markers (common)

Check panel HTML for stable DOM markers documented in each `@playground/playground-{module}/playground.php` `acceptance_markers` key. Examples:

- `admin-widget-builder`: `wpdev-styling`, `data-wpdev-widget`, `postbox`
- `table-builder`: interactive table refresh hooks
- `form-builder`: modal/wubox triggers

## Domain list preview shortcut

For WaaS modules, reuse `@playground/playground-wpdev/functions-playground-wpdev.php`:

```php
wpdev_register_playground_panel( 'wpdev-products', wpdev_playground_list_panel( 'wpdev-products', 'WaaS Products' ) );
```

See [playground.md](playground.md) for registration contract.

## Production parity

Real admin pages re-bind under playground when both `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are defined. Filter: `wpdev_playground_use_real_production_pages` (default on). Sandbox kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1`.

Source: `@framework/docs/framework/README.md` (Example and Playground Index).