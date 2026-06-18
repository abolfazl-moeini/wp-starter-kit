# Views → module map (2.5.0)

`wpdev_get_template()` resolves views via `Module_View_Registry` (registered in each module `setup.php`), then falls back to `views/` at plugin root for **unmapped** files only (`admin-notices.php`, `classes.php`).

| View path prefix | Module |
|------------------|--------|
| `admin-pages/fields/` | `field-builder` |
| `admin-pages/` (non-field) | `admin-page-builder` |
| `base/` | `admin-page-builder` |
| `settings/fields/` | `field-builder` |
| `settings/` (panels, non-field) | `settings-panel-builder` |
| `dynamic-styles/` | `core` |
| `ui/` | `admin-widget-builder` |
| `dashboard-widgets/` | `admin-widget-builder` |
| `checkout/` | `wpdev-checkout` |
| `legacy/` | `wpdev-checkout` |
| `taxes/` | `wpdev-taxes` |
| `rollback/`, `system-info/`, `shortcodes/`, `wizards/` | `wpdev-system` |
| `broadcast/` | `wpdev-broadcasts` |
| `emails/`, `email/` | `wpdev-emails` |
| `events/` | `wpdev-events` |
| `limitations/` | `wpdev-platform` |
| `payments/`, `invoice/` | `wpdev-payments` |
| `domain/` | `wpdev-domains` |
| `sites/` | `wpdev-sites` |
| `memberships/` | `wpdev-memberships` |
| `customers/` | `wpdev-customers` |

**Phase 2.9 (2.5.0):** duplicate trees under root `views/` for all rows above were removed; module paths are canonical.
