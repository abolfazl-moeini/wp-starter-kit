# Examples map (choose the right pattern first)

Pick the nearest family, then copy from `@examples/`. Playground demos: `@playground/playground-{module}/`. API snippets: [api-cookbook.md](api-cookbook.md).

**Naming:** folder `@examples/products/` → module id `wpdev-products`. Never `@examples/wpdev-products/`.

## WaaS examples

| Module id | @examples path | @playground panel | Cookbook | Canonical files |
|-----------|----------------|-------------------|----------|-----------------|
| `wpdev-products` | `@examples/products/` | `@playground/playground-wpdev/` (list preview) | [domain-crud-panel.md](domain-crud-panel.md) | `setup.php`, `src/admin/`, `src/tables/` |
| `wpdev-customers` | `@examples/customers/` | `@playground/playground-wpdev/` | domain-crud + [fields-and-widgets.md](fields-and-widgets.md) | `class-customer-edit-admin-page.php` |
| `wpdev-sites` | `@examples/sites/` | `@playground/playground-wpdev/` | domain-crud | list views + tabs |
| `wpdev-domains` | `@examples/domains/` | `@playground/playground-wizard/` | [wizard.md](wizard.md) | sunrise-related |
| `wpdev-checkout` | `@examples/checkout/` | `@playground/playground-form-builder/` | [api-cookbook-domain.md](api-cookbook-domain.md) | `setup.php`, signup fields |
| `wpdev-gateways` | `@examples/gateways/` | `@playground/playground-settings-panel-builder/` | api-cookbook-domain | settings sections |
| `wpdev-payments` | `@examples/payments/` | `@playground/playground-form-builder/` | domain-crud | invoices, mPDF |
| `wpdev-webhooks` | `@examples/webhooks/` | `@playground/playground-table-builder/` | domain-crud | list table patterns |
| `wpdev-events` | `@examples/events/` | `@playground/playground-table-builder/` | api-cookbook-domain | event types |
| `wpdev-dashboard` | `@examples/dashboard/` | `@playground/playground-admin-widget-builder/` | [dashboard-widgets.md](dashboard-widgets.md) | jumper commands |
| `wpdev-admin-setting-page-defaults` | `@examples/admin-setting-page-defaults/` | `@playground/playground-admin-setting-page/` | [settings-panel.md](settings-panel.md) | `setup.php` |
| `wpdev-admin-custom-page-dashboard-widgets` | `@examples/admin-custom-page-dashboard-widgets/` | `@playground/playground-admin-custom-page/` | dashboard-widgets | widget registration |
| `wpdev-customer-panel` | `@examples/customer-panel/` | `@playground/playground-admin-page-builder/` | [example-types.md](example-types.md) | UI elements |
| `wpdev-addons` | `@examples/addons/` | `@playground/playground-wpdev/` | example-types | catalog UI |
| `wpdev-emails` | `@examples/emails/` | — | example-types | templates |
| `metabox-post-type` | `@examples/metabox-post-type/` | `@playground/playground-metabox-post-type/` | [fields-and-widgets.md](fields-and-widgets.md) | CPT + metabox |
| `admin-custom-page-top-nav` | `@examples/admin-custom-page-top-nav/` | `@playground/playground-admin-custom-page/` | [custom-and-setting-pages.md](custom-and-setting-pages.md) | top nav demo |

Full playground table: [playground-index.md](playground-index.md).

## Family map

| Family | Best start | Snippet pointer |
|--------|------------|-----------------|
| Domain CRUD | `@examples/products/` | [api-cookbook.md](api-cookbook.md) → `wpdev_register_module_admin_pages` |
| Checkout / gateways | `@examples/checkout/`, `@examples/gateways/` | [api-cookbook-domain.md](api-cookbook-domain.md) |
| Dashboard widgets | `@examples/admin-custom-page-dashboard-widgets/` | `wpdev_register_dashboard_widget` in cookbook A |
| Settings only | `@examples/admin-setting-page-defaults/` | `wpdev_register_settings_section` in cookbook A |
| Playground demo | `@playground/playground-{module}/` | [playground.md](playground.md) |

## Quick selection

1. DB + list + edit + manager? → `@examples/products/` + [domain-crud-panel.md](domain-crud-panel.md)
2. Rich edit widgets? → `@examples/customers/`
3. KPI cards? → `@examples/admin-custom-page-dashboard-widgets/`
4. Settings tabs? → `@examples/admin-setting-page-defaults/`
5. Dev panel? → `@playground/playground-{module}/`
6. Checkout/payment? → [api-cookbook-domain.md](api-cookbook-domain.md)