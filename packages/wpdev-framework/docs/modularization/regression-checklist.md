# Regression Checklist (A-012)

Manual baseline checklist for modularization validation.

## Automated coverage (PHPUnit)

The following behaviors have automated unit tests (`composer test`):

- Module loader topological sort
- Ajax table registry
- Model/database/UI/subsystem shim paths
- Module view registry + asset colocation
- Field sanitize (text, number min)
- Checkout REST base slug (`checkout_form`)
- `Edit_Object_Page` trait composition

Run `composer smoke` for shim/asset/view integrity (no WordPress required).

Run `docker exec … php …/bin/regression-wp-load.php` for full plugin bootstrap inside WP (see `migration-guide.md`).

## Reference pages (manual — requires WP admin login)

**Network admin (9 slugs)** — base URL: `/wp-admin/network/admin.php?page={slug}`

| # | Slug | Module |
|---|------|--------|
| 1 | `wpdev-settings` | admin-setting-page |
| 2 | `wpdev-products` | wpdev-products |
| 3 | `wpdev-domains` | wpdev-domains |
| 4 | `wpdev-broadcasts` | wpdev-broadcasts |
| 5 | `wpdev-payments` | wpdev-payments |
| 6 | `wpdev-checkout-forms` | wpdev-checkout |
| 7 | `wpdev-edit-checkout-form` | wpdev-checkout |
| 8 | `wpdev-edit-product` | wpdev-products |
| 9 | `wpdev-addons` | wpdev-addons |

**Site admin dashboard** — base URL: `/wp-admin/admin.php?page=wpdev` (`Top_Level_Admin_Page` registers on `admin_menu` only, not network admin).

## Per reference page

- [ ] Page loads without PHP errors
- [ ] Menu highlight correct
- [ ] Capability check enforced
- [ ] List table pagination/search works (list pages)
- [ ] Bulk actions show confirm modal (list pages)
- [ ] Add-new modal opens and submits (where applicable)
- [ ] Screen options persist
- [ ] Ajax refresh returns expected HTML fragment

## Core services

- [ ] `wpdev_services('ajax')` available after `wpdev_init`
- [ ] `wpdev_register_form()` still registers forms
- [ ] `wpdev_get_template()` and `wpdev_view()` render identically
- [ ] Light ajax (`?wpdev-ajax=`) still routes actions
- [ ] wubox modals load on admin pages

## Module loader

- [ ] All enabled modules appear in load order without fatal errors
- [ ] `wpdev_modules_loaded` fires once
- [ ] Dependency order respected (core → builders → domain)
- [ ] Domain pages load with `wpdev_load_monolith_admin_pages` false (default)
- [ ] Add-ons page registers last via `wpdev-addons` priority 100

## Multisite

- [ ] Network admin pages load
- [ ] Sunrise.php resolves `modules/wizard/class-sunrise.php`
- [ ] Setup wizard requirements use `WPDevFramework\Requirements`

## Performance sanity

- [ ] List table ajax does not double-fetch on rapid filter changes
- [ ] Dashboard widgets load without duplicate script registration
