# Reference Page Dependency Chains (A-011)

Baseline dependency chains for **9 network-admin reference pages** plus the **site-admin dashboard** (`page=wpdev`).

The dashboard (`Top_Level_Admin_Page`) registers on `admin_menu` only, not `network_admin_menu`. Network regression scripts cover the nine WaaS/settings slugs below.

## admin.php?page=wpdev (site admin only)

`Top_Level_Admin_Page` → `Base_Admin_Page` → menu-builder → core (view, scripts)

## admin.php?page=wpdev-settings (network admin)

`Settings_Admin_Page` → `Wizard_Admin_Page` → settings-panel-builder → field-builder, form-builder, tab-navigation → core

## admin.php?page=wpdev-products

`Product_List_Admin_Page` → `List_Admin_Page` → `Product_List_Table` → table-builder → core (ajax, modal, screen-options)

## admin.php?page=wpdev-domains

`Domain_List_Admin_Page` → `Domain_List_Table` → Form_Manager (`add_new_domain`) → core modal

## admin.php?page=wpdev-broadcasts

`Broadcast_List_Admin_Page` → `Broadcast_List_Table` → modal targets ajax

## admin.php?page=wpdev-payments

`Payment_List_Admin_Page` → `Payment_List_Table` → `add_new_payment` form

## admin.php?page=wpdev-checkout-forms

`Checkout_Form_List_Admin_Page` → `Checkout_Form_List_Table`

## admin.php?page=wpdev-edit-checkout-form

`Checkout_Form_Edit_Admin_Page` → `Edit_Admin_Page` → metabox-builder widgets

## admin.php?page=wpdev-edit-product

`Product_Edit_Admin_Page` → field widgets, list table widgets

## admin.php?page=wpdev-addons

`Addons_Admin_Page` → `Wizard_Admin_Page` → ajax lazy tabs, addon forms

## Shared core services per chain

| Service | Used by |
|---------|---------|
| ajax | All list tables, checkout, addons |
| modal | Bulk actions, add-new modals, field editor |
| form | All `wpdev_register_form` flows |
| screen_options | List admin pages |
| view | All page templates under `views/base/` |
| tour | Checkout, dashboard onboarding |
