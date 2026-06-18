# Examples Framework Usage Map

Generated: 2026-05-31T19:52:14+00:00

Source: `examples/` PHP files (2583 files)

## Summary

| Metric | Count |\n|--------|------:|\n| Functions (`wpdev_*`) | 445 |
| Hooks (`wpdev_*`) | 350 |
| Classes (tracked) | 15 |

## Top `wpdev_register_*` families

| Family | Call sites |
|--------|----------:|
| `settings_field` | 52 |
| `form` | 51 |
| `playground_panel` | 34 |
| `module_admin_pages` | 32 |
| `dashboard_widget` | 28 |
| `ajax_handler` | 22 |
| `table` | 19 |
| `module_views` | 12 |
| `metabox` | 11 |
| `gateway` | 10 |
| `event_type` | 7 |
| `settings_section` | 7 |
| `checkout_field_type` | 6 |
| `field_type` | 6 |
| `widget_datasource` | 6 |
| `page_template` | 5 |
| `menu_child` | 5 |
| `list_table` | 5 |
| `field_template` | 3 |
| `menu_top` | 3 |
| `general_dashboard_statistics_widgets` | 2 |
| `tax_dashboard_statistics_widgets` | 2 |
| `ajax_modal` | 2 |
| `jumper_command` | 2 |
| `ajax_tabs` | 1 |

## Lifecycle hooks used in examples

| Hook | Type | Count | Representative files |
|------|------|------:|--------------------|
| `wpdev_init` | action | 2 | examples/admin-setting-page-defaults/setup.php, examples/playground-wizard/playground.php |
| `wpdev_load` | action | 54 | examples/addons/playground.php, examples/admin-custom-page-dashboard-widgets/setup.php, examples/broadcasts/playground.php |
| `wpdev_modules_loaded` | action | 1 | examples/wpdev-playground-sample/wpdev-playground-sample.php |
| `wpdev_admin_pages` | action | 3 | examples/playground-admin-page-builder/playground.php, examples/playground-admin-setting-page/playground.php, examples/taxes/setup.php |
| `wpdev_register_forms` | action | 3 | examples/playground-admin-page-builder/playground.php, examples/playground-form-builder/playground.php, examples/playground-table-builder/playground.php |
| `wpdev_module_enabled` | filter | 6 | examples/checkout/setup.php, examples/customer-panel/setup.php, examples/sites/setup.php |

## Base classes used in examples

| Class | Count | Usage | Sample files |
|-------|------:|-------|--------------|
| `WPDevFramework\UI\Base_Element` | 35 | extends, fqcn | examples/checkout/src/ui/class-checkout-element.php, examples/checkout/src/ui/class-login-form-element.php |
| `WPDevFramework\Managers\Base_Manager` | 34 | extends, fqcn | examples/broadcasts/src/managers/class-broadcast-manager.php, examples/checkout/src/managers/class-checkout-form-manager.php |
| `WPDevFramework\Database\Engine\Table` | 34 | extends, fqcn | examples/checkout/src/Database/checkout-forms/class-checkout-forms-meta-table.php, examples/checkout/src/Database/checkout-forms/class-checkout-forms-table.php |
| `WPDevFramework\Models\Base_Model` | 22 | extends, fqcn | examples/checkout/src/Models/class-checkout-form.php, examples/customers/src/Models/class-customer.php |
| `WPDevFramework\Admin_Pages\Edit_Admin_Page` | 13 | extends | examples/broadcasts/src/admin/class-broadcast-edit-admin-page.php, examples/checkout/src/admin/class-checkout-form-edit-admin-page.php |
| `WPDevFramework\Admin_Pages\List_Admin_Page` | 12 | extends | examples/broadcasts/src/admin/class-broadcast-list-admin-page.php, examples/checkout/src/admin/class-checkout-form-list-admin-page.php |
| `WPDevFramework\Form\Base_Field_Template` | 12 | extends | examples/checkout/src/checkout/signup-fields/field-templates/order-bump/class-simple-order-bump-field-template.php, examples/checkout/src/checkout/signup-fields/field-templates/order-summary/class-clean-order-summary-field-template.php |
| `WPDevFramework\Admin_Pages\Base_Admin_Page` | 11 | extends, fqcn | examples/emails/src/admin/class-email-edit-admin-page.php, examples/emails/src/admin/class-email-list-admin-page.php |
| `WPDevFramework\Models\Post_Base_Model` | 4 | extends, fqcn | examples/broadcasts/src/Models/class-broadcast.php, examples/emails/src/Models/class-email.php |
| `WPDevFramework\Admin_Pages\Wizard_Admin_Page` | 2 | extends | examples/addons/src/admin/class-addons-admin-page.php, examples/system/src/admin/class-hosting-integration-wizard-admin-page.php |
| `WPDevFramework\Database\Post_Query` | 2 | extends | examples/broadcasts/src/Database/broadcasts/class-broadcast-query.php, examples/emails/src/Database/emails/class-email-query.php |
| `WPDevFramework\Database\Posts\Posts_Meta_Table` | 1 | fqcn | examples/platform/setup.php |

## Framework classes (requested reference set)

| Class | Used in examples | Count | Notes |
|-------|------------------|------:|-------|
| `WPDevFramework\Admin_Notices` | no | 0 | Document as framework-public even if unused in examples |\n| `WPDevFramework\Settings` | yes | 4 | examples/gateways/dependencies/stripe/stripe-php/lib/Util/ObjectTypes.php, examples/playground-settings-panel-builder/functions-playground-settings.php |
| `WPDevFramework\Scripts` | yes | 4 | examples/events/src/admin/class-event-view-admin-page.php, examples/system/src/admin/class-view-logs-admin-page.php |
| `WPDevFramework\Current` | yes | 4 | examples/customer-panel/src/ui/class-account-summary-element.php, examples/customer-panel/src/ui/class-my-sites-element.php |

## Top functions (first 40)

| Function | Count | Owners |
|----------|------:|--------|
| `wpdev_request` | 483 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_get_isset` | 261 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_get_setting` | 130 | broadcasts, checkout, customer-panel, customers, domains |
| `wpdev_network_admin_url` | 126 | addons, broadcasts, checkout, customers, discount-codes |
| `wpdev_get_template` | 89 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_log_add` | 74 | checkout, domains, emails, events, gateways |
| `wpdev_format_currency` | 70 | checkout, customers, discount-codes, events, gateways |
| `wpdev_get_form_url` | 59 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_require_public_function` | 53 | addons, broadcasts, checkout, customers, discount-codes |
| `wpdev_register_settings_field` | 52 | domains, emails, gateways, platform, playground-field-builder |
| `wpdev_register_form` | 51 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_get_current_time` | 47 | broadcasts, checkout, customers, discount-codes, domains |
| `wpdev_get_module_asset_url` | 37 | addons, checkout, customer-panel, emails, events |
| `wpdev_get_version` | 37 | addons, checkout, customer-panel, events, gateways |
| `wpdev_get_template_contents` | 36 | addons, checkout, customer-panel, customers, emails |
| `wpdev_get_asset` | 35 | checkout, platform, sites, system, taxes |
| `wpdev_register_playground_panel` | 34 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_on_load` | 33 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_load_module` | 32 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_register_module_admin_pages` | 32 | addons, broadcasts, checkout, customer-panel, customers |
| `wpdev_get_current_site` | 32 | customer-panel, domains, platform, sites |
| `wpdev_convert_to_state` | 31 | broadcasts, checkout, customer-panel, discount-codes, domains |
| `wpdev_get_membership` | 30 | checkout, gateways, memberships, payments, platform |
| `wpdev_generate_event_payload` | 29 | customers, domains, events, payments, sites |
| `wpdev_register_dashboard_widget` | 28 | admin-custom-page-dashboard-widgets, playground-admin-custom-page, playground-admin-widget-builder |
| `wpdev_get_current_customer` | 28 | broadcasts, checkout, customer-panel, customers, gateways |
| `wpdev_load` | 27 | addons, broadcasts, customer-panel, customers, dashboard |
| `wpdev_get_current_url` | 27 | addons, checkout, customer-panel, domains, gateways |
| `wpdev_get_customer` | 27 | broadcasts, customers, emails, memberships, payments |
| `wpdev_get_db_table` | 27 | checkout, customers, domains, events, memberships |
| `wpdev_get_product` | 24 | broadcasts, checkout, memberships, payments, products |
| `wpdev_get_gateway` | 24 | checkout, customer-panel, gateways, memberships, payments |
| `wpdev_register_ajax_handler` | 22 | addons, checkout, customers, domains, emails |
| `wpdev_get_payment` | 21 | checkout, gateways, payments |
| `wpdev_enqueue_async_action` | 21 | customer-panel, customers, domains, memberships, platform |
| `wpdev_playground_list_panel` | 19 | addons, broadcasts, checkout, customers, dashboard |
| `wpdev_get_site` | 19 | admin-custom-page-dashboard-widgets, checkout, customer-panel, domains, platform |
| `wpdev_register_table` | 19 | checkout, customers, discount-codes, domains, events |
| `wpdev_boot_module_manager` | 17 | broadcasts, checkout, customers, discount-codes, domains |
| `wpdev_format_money` | 17 | checkout, memberships, products |
