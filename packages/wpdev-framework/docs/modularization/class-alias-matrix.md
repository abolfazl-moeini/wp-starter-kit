# Class alias matrix (I-001)

Aliases are registered in `modules/core/src/legacy-aliases.php` when the legacy `inc/` class exists.

| New namespace | Canonical (inc) |
|---------------|-----------------|
| `WPDevFramework\Modules\FieldBuilder\Field` | `WPDevFramework\UI\Field` |
| `WPDevFramework\Modules\FormBuilder\Form` | `WPDevFramework\UI\Form` |
| `WPDevFramework\Modules\SettingsPanelBuilder\Settings` | `WPDevFramework\Settings` |
| `WPDevFramework\Modules\MenuBuilder\Base_Admin_Page` | `WPDevFramework\Admin_Pages\Base_Admin_Page` |
| `WPDevFramework\Modules\AdminPageBuilder\List_Admin_Page` | `WPDevFramework\Admin_Pages\List_Admin_Page` |
| `WPDevFramework\Modules\AdminPageBuilder\Edit_Admin_Page` | `WPDevFramework\Admin_Pages\Edit_Admin_Page` |
| `WPDevFramework\Modules\AdminPageBuilder\Wizard_Admin_Page` | `WPDevFramework\Admin_Pages\Wizard_Admin_Page` |
| `WPDevFramework\Modules\TableBuilder\Base_List_Table` | `WPDevFramework\List_Tables\Base_List_Table` |
| `WPDevFramework\Modules\MetaboxBuilder\Edit_Admin_Page` | `WPDevFramework\Admin_Pages\Edit_Admin_Page` |
| `WPDevFramework\Modules\AdminPageBuilder\Base_Admin_Page` | `WPDevFramework\Admin_Pages\Base_Admin_Page` |
| `WPDevFramework\Modules\AdminPageBuilder\Settings_Admin_Page` | `WPDevFramework\Admin_Pages\Settings_Admin_Page` |

## Physical location (2.4.0+)

| Class | Canonical file |
|-------|----------------|
| `WPDevFramework\Ajax` | `modules/core/src/ajax/class-ajax.php` |
| `WPDevFramework\Light_Ajax` | `modules/core/src/ajax/class-light-ajax.php` |
| `WPDevFramework\Async_Calls` | `modules/core/src/ajax/class-async-calls.php` |
| `WPDevFramework\UI\Field` | `modules/field-builder/src/field/class-field.php` |
| `WPDevFramework\UI\Form` | `modules/form-builder/src/form/class-form.php` |
| `WPDevFramework\Managers\Form_Manager` | `modules/core/src/form/class-form-manager.php` |
| `WPDevFramework\Managers\Gateway_Manager` | `examples/gateways/src/managers/class-gateway-manager.php` |
| `WPDevFramework\Gateways\*` | `examples/gateways/src/gateways/` |
| `WPDevFramework\Managers\Checkout_Form_Manager` | `examples/checkout/src/managers/class-checkout-form-manager.php` |
| `WPDevFramework\Managers\Field_Templates_Manager` | `examples/checkout/src/managers/class-field-templates-manager.php` |
| `WPDevFramework\List_Tables\Base_List_Table` | `modules/table-builder/src/table/class-base-list-table.php` |
| `WPDevFramework\UI\Tours` | `modules/core/src/tour/class-tours.php` |
| `WPDevFramework\List_Tables\Product_List_Table` | `examples/products/src/tables/class-product-list-table.php` |
| `WPDevFramework\Admin_Pages\Product_List_Admin_Page` | `examples/products/src/admin/class-product-list-admin-page.php` |
| `WPDevFramework\Admin_Pages\Product_Edit_Admin_Page` | `examples/products/src/admin/class-product-edit-admin-page.php` |
| `wpdev_get_template()` / `wpdev_get_template_contents()` | `modules/core/src/view/template-functions.php` |
| `WPDevFramework\Settings` | `modules/settings-panel-builder/src/class-settings.php` |
| `WPDevFramework\List_Tables\Payment_List_Table` | `examples/payments/src/tables/class-payment-list-table.php` |
| `WPDevFramework\Admin_Pages\Payment_List_Admin_Page` | `examples/payments/src/admin/class-payment-list-admin-page.php` |
| `WPDevFramework\Admin_Pages\Payment_Edit_Admin_Page` | `examples/payments/src/admin/class-payment-edit-admin-page.php` |
| `WPDevFramework\List_Tables\Customer_List_Table` | `examples/customers/src/tables/class-customer-list-table.php` |
| `WPDevFramework\Admin_Pages\Customer_List_Admin_Page` | `examples/customers/src/admin/class-customer-list-admin-page.php` |
| `WPDevFramework\Admin_Pages\Customer_Edit_Admin_Page` | `examples/customers/src/admin/class-customer-edit-admin-page.php` |
| `WPDevFramework\List_Tables\Checkout_Form_List_Table` | `examples/checkout/src/tables/class-checkout-form-list-table.php` |
| `WPDevFramework\Admin_Pages\Checkout_Form_*` | `examples/checkout/src/admin/` |
| `WPDevFramework\Managers\Signup_Fields_Manager` | `examples/checkout/src/managers/class-signup-fields-manager.php` |
| `WPDevFramework\Checkout\Signup_Fields\*` | `examples/checkout/src/checkout/signup-fields/` |
| `WPDevFramework\Checkout\Cart` | `examples/checkout/src/checkout/class-cart.php` |
| `WPDevFramework\Checkout\Checkout` | `examples/checkout/src/checkout/class-checkout.php` |
| `WPDevFramework\Checkout\Checkout_Pages` | `examples/checkout/src/checkout/class-checkout-pages.php` |
| `WPDevFramework\Checkout\Line_Item` | `examples/checkout/src/checkout/class-line-item.php` |
| `WPDevFramework\Checkout\Legacy_Checkout` | `examples/checkout/src/checkout/class-legacy-checkout.php` |
| `WPDevFramework\Admin_Pages\Base_Admin_Page` | `modules/admin-page-builder/src/admin/class-base-admin-page.php` |
| `WPDevFramework\Admin_Pages\List_Admin_Page` | `modules/admin-page-builder/src/admin/class-list-admin-page.php` |
| `WPDevFramework\Admin_Pages\Edit_Admin_Page` | `modules/admin-page-builder/src/admin/class-edit-admin-page.php` |
| `WPDevFramework\Admin_Pages\Wizard_Admin_Page` | `modules/admin-page-builder/src/admin/class-wizard-admin-page.php` |
| `WPDevFramework\Models\Base_Model` | `modules/core/src/Model/class-base-model.php` |
| `WPDevFramework\Models\Post_Base_Model` | `modules/core/src/Model/class-post-base-model.php` |
| `WPDevFramework\Models\Traits\*` | `modules/core/src/Model/traits/` |
| `WPDevFramework\Models\Product` | `examples/products/src/Models/class-product.php` |
| `WPDevFramework\Database\Engine\*` | `modules/core/src/Database/engine/` |
| `WPDevFramework\Database\Posts\*` | `modules/core/src/Database/posts/` |
| `WPDevFramework\Database\Products\*` | `examples/products/src/Database/products/` |
| `WPDevFramework\Managers\Base_Manager` | `modules/core/src/managers/class-base-manager.php` |
| `WPDevFramework\Helpers\*` | `modules/core/src/helpers/` |
| `WPDevFramework\Objects\*` | `modules/core/src/objects/` |
| `WPDevFramework\Limitations\*` | `examples/platform/src/limitations/` |
| `WPDevFramework\Limits\*` | `examples/platform/src/limits/` |
| `WPDevFramework\API\*` / `WPDevFramework\Apis\*` | `modules/core/src/api/` |
| `WPDevFramework\Integrations\*` | `examples/system/src/integrations/` |
| `WPDevFramework\SSO\*` | `examples/system/src/sso/` |
| `WPDevFramework\Compat\*` | `modules/core/src/compat/` |
| `WPDevFramework\Traits\*` | `modules/core/src/traits/` |
| `MUCD_Duplicate` (procedural) | `examples/sites/src/duplication/` |
| `WPDevFramework\Installers\*` | `modules/core/src/installers/` |
| `WPDevFramework\Exception\*` | `modules/core/src/exception/` |
| `WPDevFramework\Internal\*` | `modules/core/src/internal/` |
| `WPDevFramework\Loaders\*` | `modules/core/src/loaders/` |
| `WPDevFramework\Contracts\*` | `modules/core/src/contracts/` |
| `WPDevFramework\Invoices\*` | `examples/payments/src/invoices/` |
| `WPDevFramework\Domain_Mapping` | `examples/domains/src/class-domain-mapping.php` |
| `WPDevFramework\Domain_Mapping\*` | `examples/domains/src/domain-mapping/` |
| `WPDevFramework\Development\*` | `examples/system/src/development/` |
| `WPDevFramework\Builders\*` | `modules/admin-widget-builder/src/builders/` |
| `WPDevFramework\License` | `modules/core/src/class-license.php` |
| `WPDevFramework\Cron`, `WPDevFramework\Scripts`, `WPDevFramework\Logger`, … | `modules/core/src/class-*.php` (shims at `inc/class-*.php`) |
| `WPDevFramework\Dashboard_Widgets`, `WPDevFramework\Dashboard_Statistics` | `modules/admin-widget-builder/src/class-dashboard-*.php` |
| Core helpers (`wpdev_path`, REST, assets, …) | `modules/core/src/functions/` |
| Domain helpers (`wpdev_get_product`, …) | `examples/*/src/functions/` (shims at `inc/functions/`) |
| Settings helpers | `modules/settings-panel-builder/src/functions/` |
| Form helpers | `modules/form-builder/src/functions/` |
| `WPDevFramework\Country\*` | `modules/core/src/country/` (city data: `modules/core/src/country/{cc}/{state}.php`) |
| Global `WPDev` bootstrap | `modules/core/src/class-wpdev.php` |
| `WPDevFramework\Autoloader` | `modules/core/src/class-autoloader.php` |
| `WPDevFramework\Tax\Tax` | `examples/taxes/src/class-tax.php` |
| `WPDevFramework\Tax\Dashboard_Taxes_Tab` | `examples/taxes/src/class-dashboard-taxes-tab.php` |
| `WPDevFramework\UI\Base_Element` | `modules/admin-widget-builder/src/ui/class-base-element.php` |
| `WPDevFramework\UI\Jumper` / `Toolbox` / `Template_Previewer` | `modules/admin-widget-builder/src/ui/` |
| `WPDevFramework\UI\Checkout_Element` (and thank-you, login, simple-text) | `examples/checkout/src/ui/` |
| `WPDevFramework\UI\*_Element` (customer panel) | `examples/customer-panel/src/ui/` |
| `WPDevFramework\Rollback\*` | `examples/system/src/rollback/` |
| `WPDevFramework\Debug\Debug` | `examples/system/src/debug/class-debug.php` |
| `WPDevFramework\Site_Templates\Template_Placeholders` | `examples/sites/src/site-templates/` |
| `WPDevFramework\Admin_Pages\Rollback_Admin_Page` | `examples/system/src/admin/` |
| `WPDevFramework\Admin_Pages\Debug\Debug_Admin_Page` | `examples/system/src/admin/debug/` |
| `WPDevFramework\Admin_Pages\Placeholders_Admin_Page` | `examples/sites/src/admin/` |

`inc/` retains one-line shims that `require_once` the module paths for the legacy autoloader.

## PHPUnit (P-001)

Run from plugin root:

```bash
composer test
```

Admin page and manager classes remain under `WPDevFramework\Admin_Pages\*` and `WPDevFramework\Managers\*` until physical migration from `inc/` completes.

## 2.8.1 — Framework ↔ Examples boundary cleanup

The 2.8.0 split left a residual set of couplings where the framework still
owned or booted code that belongs to the WaaS Examples layer. The 2.8.1
pass removes those couplings. Each row below describes the new canonical
location for the class / asset / hook.

| Class / asset | Was (2.8.0) | Now (2.8.1) | Owner |
|--------------|-------------|-------------|-------|
| `WPDevFramework\Admin_Pages\Top_Level_Admin_Page` | `modules/admin-custom-page/class-top-level-admin-page.php` | `wpdev-examples/dashboard/src/admin/class-top-level-admin-page.php` | dashboard |
| `dashboard-statistics.js` / `dashboard-statistics.min.js` | `modules/admin-custom-page/assets/js/` | `wpdev-examples/dashboard/assets/js/` | dashboard |
| `WPDevFramework\Dashboard_Statistics::get_data_mrr_growth()` memberships block | hard-coded in framework | empty dataset + `wpdev_dashboard_statistics_datasource` filter | memberships (consumes) |
| `wpdev_Site` / `wpdev_Site_Template` / `wpdev_Site_Owner` | framework `deprecated.php` (commented) | `wpdev-examples/sites/src/deprecated/class-wpdev-site-shim.php` | sites |
| `wpdev_Coupon` | framework `deprecated.php` (commented) | `wpdev-examples/discount-codes/src/deprecated/class-wpdev-coupon-shim.php` | discount-codes |
| `wpdev_Plan` | framework `deprecated.php` (commented) | `wpdev-examples/products/src/deprecated/class-wpdev-plan-shim.php` | products |
| `wpdev_Subscription` | framework `deprecated.php` (commented) | `wpdev-examples/memberships/src/deprecated/class-wpdev-subscription-shim.php` | memberships |
| `wpdev_Signup` | framework `deprecated.php` (commented) | `wpdev-examples/checkout/src/deprecated/class-wpdev-signup-shim.php` | checkout |
| `_install_sites()` in `Migrator` | hard-coded in core | thin dispatcher + `wpdev_register_migration('sites', ...)` from sites example | sites |
| `WPDevFramework\UI\Toolbox` | `modules/admin-widget-builder/src/ui/` | `wpdev-examples/sites/src/ui/class-toolbox.php` | sites |
| SSO / limits / whitelabel / checkout UI / customer panel UI / taxes / site template placeholders / checkout classes in `wpdev_load_extra_components()` | framework boot | owning example `setup.php` | (respective) |
| `API::add_settings()` section + fields | framework `class-api.php` | `wpdev_register_api_settings` consumer hook → `wpdev-examples/admin-setting-page-defaults/src/sections/class-api.php` | admin-setting-page-defaults |
| `Jumper::add_settings()` section + fields | framework `class-jumper.php` | `wpdev_register_jumper_settings` consumer hook → `wpdev-examples/admin-setting-page-defaults/src/sections/class-jumper.php` | admin-setting-page-defaults |

Framework now ships a `wpdev_dashboard_statistics_datasource` filter and a
`wpdev_register_migration()` / `wpdev_run_migration_callback()` registry so
domain examples can register their data and migration steps without the
framework knowing about them.

### Examples directory resolution

`Examples_Loader::examples_dir()` resolves the examples directory in this
order (first readable wins):

1. `WPDEV_EXAMPLES_DIR` constant.
2. `wpdev_examples_dir` filter result.
3. Sibling `wpdev-examples` plugin (`../wpdev-examples/`).
4. Legacy in-plugin `wpdev/examples/` directory.

`Playground_Loader::examples_dir()` delegates to `Examples_Loader`, so
playground panel discovery follows the same chain.

### Audit gate

`bin/audit-framework-boundary.php` (registered as `composer audit:framework-boundary`)
enforces the boundary at CI time. It fails if:

- Any `AI_FXIME` or `AI_FIXME` marker remains in `modules/`.
- A framework module instantiates an examples-owned class.
- `modules/admin-custom-page` references `Top_Level_Admin_Page`.
- Framework source references the sibling `wpdev-examples/` path outside
  the two loaders.

## Deprecated hooks

| Legacy | Replacement |
|--------|-------------|
| `wpdev_panel_examples_loaded` | `wpdev_modules_loaded` |
