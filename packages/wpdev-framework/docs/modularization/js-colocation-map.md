# JS colocation map

First-party JavaScript lives under `modules/<module-id>/assets/js/` and `examples/<example-id>/assets/js/`. Shared vendored libraries used across modules live under `modules/core/assets/js/lib/`.

## Canonical ownership

| Module / example | Scripts |
|------------------|---------|
| **core** | `admin.js`, `admin-notices.js`, `cookie-helpers.js`, `functions.js`, `gutenberg-support.js`, `wpdev-ajax.js`, `wubox.js`, `tours.js`, `playground-seeder.js`, `lib/*` (vue, sweetalert2, flatpicker, tiptip, blockUI, fonticonpicker, accounting, v-money, vue-the-mask, selectize, apexcharts, vue-apexcharts, shepherd) |
| **field-builder** | `fields.js`, `selectizer.js`, `vue-apps.js` |
| **table-builder** | `list-tables/list-tables-factory.js`, `list-tables/list-tables-hooks.js` |
| **admin-widget-builder** | `blocks.js`, `jumper.js`, `template-previewer.js`, `lib/mousetrap.js` |
| **admin-page-builder** | `admin-screen.js`, `customizer.js` |
| **admin-custom-page** | `dashboard-statistics.js` |
| **wizard** | `setup-wizard.js`, `setup-wizard-polyfill.js` |
| **examples/checkout** | `checkout.js` (split parts under `checkout/`), `checkout-forms-editor.js`, `checkout-form-editor-modal.js`, `legacy-signup.js`, `thank-you.js`, `vuedraggable.umd.min.js` |
| **examples/gateways** | `gateways/stripe.js`, `gateways/stripe-checkout.js` |
| **examples/taxes** | `tax-rates.js`, `tax-statistics.js` |
| **examples/sites** | `screenshot-scraper.js`, `edit-placeholders.js` |
| **examples/webhooks** | `webhook-page.js` |
| **examples/emails** | `email-edit-page.js` |
| **examples/events** | `event-view-page.js` |
| **examples/system** | `sso.js`, `view-logs.js`, `lib/detectincognito.js` |
| **examples/platform** | `visits-counter.js` |
| **examples/customer-panel** | `template-switching.js`, `site-maintenance.js` |
| **examples/addons** | `addons.js` |
| **tab-navigation** | `playground-tabs.js` |

## Enqueue pattern

```php
wpdev_get_module_asset_url( 'wpdev-checkout', 'checkout.js', 'js' ); // resolves examples/checkout/assets/js/
wpdev_get_module_asset_url( 'core', 'lib/vue.js', 'js' );
```

Do not use `wpdev_get_asset()` for first-party scripts listed above.

## Orphans (removed)

No PHP references found for: `app.js`, `webhook-list-page.js`, `support.js`, `url-preview.js`.

## Audit

```bash
composer audit:js
```

## CSS colocation

Module-specific stylesheets were moved under `modules/*/assets/css/` (core framework/admin/flags, wpdev-checkout checkout/legacy, admin-widget-builder jumper/template-previewer, admin-page-builder admin-screen, field-builder fields). Enqueue via `wpdev_get_module_asset_url( $module_id, 'file.css', 'css' )`.

Source of truth: [`bin/js-colocation-data.php`](../../bin/js-colocation-data.php).
