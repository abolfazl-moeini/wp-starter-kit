# WaaS → Examples Migration Inventory

Generated for the Framework vs Examples separation. Each row maps one example folder under `examples/`.

## Genericized framework facades

| Legacy | Generic |
|--------|---------|
| `wpdev_register_admin_pages()` | `wpdev_register_module_admin_pages()` |
| `wpdev_boot_manager()` | `wpdev_boot_module_manager()` |
| `wpdev_module_boots_managers()` | `wpdev_module_boots_managers()` |
| `wpdev_module_enabled` filter | `wpdev_module_enabled` filter |
| `functions-waas.php` | `functions-module-managers.php` |

BC function shims were removed in 2.8.0; the `wpdev_module_enabled` filter bridge remains for external integrations.

## Example modules (19 waas + demos) — status: **complete**

All rows live under `examples/{module-id}/`. Removing `examples/*` must not fatal the plugin when examples are disabled.

| Module ID | DB tables (property) | Manager | Playground |
|-----------|---------------------|---------|------------|
| `wpdev-addons` | — | — | yes |
| `wpdev-broadcasts` | — | Broadcast_Manager | yes |
| `wpdev-checkout` | checkout_form_table, checkout_formmeta_table | Checkout_Form_Manager, Field_Templates_Manager | yes |
| `wpdev-customer-panel` | — | — | yes |
| `wpdev-customers` | customer_table, customermeta_table | Customer_Manager | yes |
| `wpdev-dashboard` | — | — | yes |
| `wpdev-discount-codes` | discount_code_table, discount_codemeta_table | Discount_Code_Manager | yes |
| `wpdev-domains` | domain_table | Domain_Manager | yes |
| `wpdev-emails` | — | Email_Manager | yes |
| `wpdev-events` | event_table | Event_Manager | yes |
| `wpdev-gateways` | — | Gateway_Manager | yes |
| `wpdev-memberships` | membership_table, membershipmeta_table | Membership_Manager | yes |
| `wpdev-payments` | payment_table, paymentmeta_table | Payment_Manager | yes |
| `wpdev-platform` | post_table, postmeta_table | Limitation, Visits, Block, Notification, Notes, Cache | yes |
| `wpdev-products` | product_table, productmeta_table | Product_Manager | yes |
| `wpdev-sites` | site_table, sitemeta_table | Site_Manager | yes |
| `wpdev-system` | — | Job_Manager | yes |
| `wpdev-taxes` | — | — | yes |
| `wpdev-webhooks` | webhook_table | Webhook_Manager | yes |

## Shell modules (split, not wholesale move)

| Module | Stays in `modules/` | Moves to `examples/` |
|--------|----------------------|------------------------|
| `admin-custom-page` | Top_Level_Admin_Page, About, Migration_Alert, Top_Admin_Nav | dashboard stat widgets, playground |
| `admin-setting-page` | Settings_Admin_Page, wpdev()->settings bootstrap | default domain sections, playground |
| `wizard` | Setup_Wizard, Sunrise | playground + playground functions |
| `metabox-post-type` | — | entire module (pure demo) |

## Vendor dependencies

| Module | Vendor |
|--------|--------|
| `wpdev-checkout` | (module deps) |
| `wpdev-domains` | dependencies/ |
| `wpdev-gateways` | Stripe SDK |
| `wpdev-payments` | mpdf |
| `wpdev-system` | Action Scheduler UI deps |

## Function files (per example setup.php)

Each example requires its own function files previously mapped in `wpdev_public_function_map()` — see `modules/core/src/functions/module-require.php` for the canonical list (paths updated to `examples/`).
