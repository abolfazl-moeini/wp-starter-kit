# Non-CRUD example types

Not every `@examples/*` module is list/edit CRUD. Pick the right shape first.

## Type map

| Type | @examples | Shape |
|------|-----------|-------|
| Classic CRUD | `products`, `customers`, `sites`, `domains`, `payments`, `memberships`, `taxes`, `discount-codes`, `webhooks`, `events`, `broadcasts` | setup + list/edit + tables + model/DB + manager |
| Checkout flows | `checkout`, `gateways` | CRUD + managers + field templates + datasources — [api-cookbook-domain.md](api-cookbook-domain.md) |
| Customer panel | `customer-panel` | Page classes + UI elements |
| Dashboard marker | `dashboard` | Module marker; widgets elsewhere |
| Settings defaults | `admin-setting-page-defaults` | Hook sections into shared settings page |
| Widget bundle | `admin-custom-page-dashboard-widgets` | `wpdev_register_dashboard_widget` on `wpdev_load` |
| Utility/system | `system`, `addons`, `platform`, `emails` | Mixed pages, tooling |
| Metabox sample | `metabox-post-type` | CPT + edit widgets |
| Top nav demo | `admin-custom-page-top-nav` | Custom page extension |

## Decision rules

1. Table-backed entity with list/edit URLs → [domain-crud-panel.md](domain-crud-panel.md)
2. Account-facing dashboard → `@examples/customer-panel/`
3. KPI blocks → [dashboard-widgets.md](dashboard-widgets.md)
4. Settings tabs only → [settings-panel.md](settings-panel.md)
5. Dev demos → [playground.md](playground.md)
6. Checkout/payment → [api-cookbook-domain.md](api-cookbook-domain.md)

## Checkout (`@examples/checkout/`)

Beyond CRUD:

- `wpdev_register_module_views( 'wpdev-checkout' )`
- Multiple `wpdev_boot_module_manager()` calls
- Element singletons on `wpdev_load`
- Public functions: `gateway`, `checkout-form`, `checkout`

## Customer panel (`@examples/customer-panel/`)

- Admin pages under `Customer_Panel\*`
- UI elements on `wpdev_load`
- Less DB-table CRUD focus

## Dashboard marker (`@examples/dashboard/`)

Registers module id `wpdev-dashboard` with deps (`core`, `admin-custom-page`, `admin-widget-builder`). Jumper commands: [api-cookbook-domain.md](api-cookbook-domain.md).

## Addons and emails

- `@examples/addons/` — catalog UI, playground list preview
- `@examples/emails/` — template customization, managers

Map: [examples-map.md](examples-map.md).