# Acceptance ↔ Test Matrix

| Reference page | Owner module(s) | Unit | Integration | Manual |
|----------------|-----------------|------|-------------|--------|
| `wpdev` (Dashboard) | admin-widget-builder, admin-custom-page | DashboardWidgetRegistryTest | — | Widget render |
| `wpdev-settings` | settings-panel-builder, field-builder | SettingsSaveTest, FieldSanitizeTest | — | Save + tabs |
| `wpdev-products` | table-builder, wpdev-products | TableConfigTest, ListTableDeclarativeCoverageTest | — | Tabs, bulk, live search |
| `wpdev-domains` | table-builder, wpdev-domains | TableConfigTest | — | Empty state CTA |
| `wpdev-broadcasts` | table-builder, wpdev-broadcasts | BulkActionPipelineTest | — | Bulk confirm modal |
| `wpdev-payments` | wpdev-payments | NullGatewayResolverTest, GatewayResolverRegistryTest | — | Add Payment modal |
| `wpdev-checkout-forms` | form-builder, table-builder | — | — | List render |
| `wpdev-edit-checkout-form` | form-builder, core/modal | ModalService (string tests) | — | Edit Field, Shortcode modals |
| `wpdev-edit-product` | metabox-builder, wpdev-products | MetaboxRegistryTest | — | Product Options / Events / Save |
| `wpdev-addons` | admin-page-builder, wpdev-addons | AjaxPlatformTest | — | Ajax tab loading |
| `wpdev-playground` / `wpdev-pg-*` (sandbox) | core/playground, builder modules | PlaygroundDemosAcceptanceTest, PlaygroundHelpersTest, PlaygroundContractTest, PlaygroundMenuTest, PlaygroundParityTest | `composer regression:playground`, `composer regression:playground:http`, `composer regression:playground:core-only` (Docker) | Builder sandboxes only; parity modules use real slugs below |
| `wpdev` / `wpdev-products`, `wpdev-settings`, … (site admin) | `Playground_Parity_Registry`, `Playground_Seeder`, domain modules | PlaygroundParityTest, PlaygroundDualContextTest, PlaygroundSeederTest | `composer regression:playground:http` (production slugs + markers) | Submenus under **WPDev**; empty WaaS list pages show **Load sample data** → AJAX `wpdev_playground_load_sample_data` → reload with rows (excludes Sites/Domains) |

## Playground landing index

| Page | Key markers | CLI / HTTP | Manual interaction |
|------|-------------|------------|-------------------|
| `wpdev-playground` | `wpdev-playground-landing`, `wpdev-playground-landing-list`, `Sandbox panels:` | `regression-playground.php` (`render_landing`), `regression-playground-http.php` | Open landing; confirm sandbox panel links; production links target **Site Admin → WPDev** (`page=wpdev`, `wpdev-products`, …) |

## Playground core modules (13) — interaction-level QA

Primary regression query args match `wpdev_playground_regression_query_contexts()` (first context = API doc / HTTP default). CLI also renders extra contexts where listed.

| Module | Regression URL(s) | Acceptance markers (subset) | CLI beyond markers | Manual interaction |
|--------|-------------------|------------------------------|--------------------|--------------------|
| `admin-custom-page` | **Parity:** `page=wpdev` (dashboard). **Sandbox:** `wpdev-pg-admin-custom-page&pg_tab=general` | `wpdev-styling`, `dashboard-filters`, `postbox` | — | Production dashboard widgets/tabs in site admin |
| `admin-page-builder` | `…&pg_view=list`, `…&pg_view=edit` | `wpdev-playground-page-template`, `nav-tab-wrapper` | Behavior: `wpdev-playground-tabs-nav` | List ↔ edit views; template cards |
| `admin-widget-builder` | `…&pg_tab=general`, `…&pg_tab=taxes` | `wpdev-playground-dashboard-grid`, `data-wpdev-widget`, `postbox` | Behavior: `meta-box-order-nonce`, `dashboard-widgets-wrap` | Drag widgets; Screen Options; both tabs |
| `admin-setting-page` | **Parity:** `page=wpdev-settings`. **Sandbox:** `wpdev-pg-admin-setting-page&tab=pg_general` | `wpdev-styling`, `settings_menu`, `Save Settings` | Behavior: `type="submit"` | All production section tabs; save site options |
| `field-builder` | `…&pg_field_context=admin`, `…&pg_field_context=settings` | `wpdev-playground-field-gallery`, `wpdev-modal-form` | Behavior: `wpdev-playground-field-context-tabs` | Admin gallery; settings save + reset |
| `form-builder` | `admin.php?page=wpdev-pg-form-builder` | `wpdev-playground-form-inline`, `wpdev-playground-form-modal` | Behavior: `wubox`, `pg_form_demo_save`; no debug leaks | Modal submit valid/invalid; ajax demo |
| `menu-builder` | `admin.php?page=wpdev-pg-menu-builder` | `wpdev-playground-menu-tree`, `pg_demo_menu` | — | Tree preview renders demo menu |
| `metabox-builder` | `admin.php?page=wpdev-pg-metabox-builder` | `wpdev-playground-metabox-registry`, `metabox-holder` | Behavior: `wpdev-playground-metabox-form`, `pg_metabox_nonce` | Toggle/save metabox sandbox meta |
| `metabox-post-type` | `admin.php?page=wpdev-pg-metabox-post-type` | `wpdev-playground-cpt-edit`, `data-pg-cpt` | Behavior: `wpdev-playground-metabox-form` | CPT layout distinct from metabox-builder |
| `settings-panel-builder` | `…&tab=pg_general` | `settings_menu`, `data-model="setting"`, `Save Settings` | Behavior: `type="submit"` | Tab menu + save sandbox setting model |
| `table-builder` | `admin.php?page=wpdev-pg-table-builder` | `wpdev-playground-table-interactive`, `wp-list-table` | Behavior: `wubox`, `pg_table_nonce`, `Add New` | Add New modal; search; bulk actions |
| `tab-navigation` | `…&pg_tab=async` | `wpdev-playground-tabs-nav`, `wpdev-playground-tab-async` | Behavior: `data-ajax-url`, `wpdev-pg-tab-async-panel` | All tabs; async tab loads content |
| `wizard` | `admin.php?page=wpdev-pg-wizard` | `wpdev-playground-wizard-steps`, `wpdev-wizard-body` | — | Step navigation without fatal errors |

## WaaS playground modules (19)

Full mode only (omit when `WPDEV_PLAYGROUND_CORE_ONLY=1`). **Production parity (default):** list/edit modules register under **`wpdev`** (site admin) with production slugs (`wpdev-products`, …). HTTP regression validates parity pages via `bin/regression-playground-http.php`.

| Module | URL (parity default) | Acceptance markers | Manual checks |
|--------|------------------------|-------------------|---------------|
| `wpdev-products` | `admin.php?page=wpdev-products` | `wpdev-styling`, `wrap`, `list-table` | List + edit; Product Options tabs |
| `wpdev-payments` | `page=wpdev-payments` | same | List + payment edit |
| `wpdev-domains` | `page=wpdev-domains` | same | Add New modal; edit save |
| `wpdev-broadcasts` | `page=wpdev-broadcasts` | same | Bulk actions; edit page |
| `wpdev-checkout` | `page=wpdev-checkout-forms` | same | Step/field editor |
| `wpdev-customers` | `page=wpdev-customers` | same | CSV export action |
| `wpdev-sites` | `page=wpdev-sites` | same | Add site modal |
| `wpdev-memberships` | `page=wpdev-memberships` | same | List + edit |
| `wpdev-discount-codes` | `page=wpdev-discount-codes` | same | List + edit |
| `wpdev-webhooks` | `page=wpdev-webhooks` | same | List + edit |
| `wpdev-events` | `page=wpdev-events` | same | List + view |
| `wpdev-addons` | `page=wpdev-addons` | `wpdev-styling`, `wrap`, `nav-tab-wrapper` | Ajax tab loading |
| `wpdev-customer-panel` | `page=wpdev-pg-wpdev-customer-panel` (sandbox only) | `wpdev-playground-customer-panel-actions` | Sample account card |
| Other `wpdev-*` without parity | `page=wpdev-pg-{module}` | sandbox markers | Static fixture demos |

**Sandbox fallback:** set `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` to restore `wpdev-pg-wpdev-*` interactive panels (see module `API_DOC.md`).

## Playground (dev-only)

Enable `WPDEV_PLAYGROUND_RUN` (see `examples/wpdev-playground-sample/`). Core modules (13) are validated via `acceptance_markers` and `behavior_markers` in `bin/regression-playground.php`. WaaS modules (19) are included when core-only mode is off. Set `WPDEV_PLAYGROUND_CORE_ONLY=1` to exclude WaaS playgrounds.

| Tool | Purpose |
|------|---------|
| `composer audit:playground` | Panel registration + hints |
| `composer audit:playground-api-doc` | API_DOC Playground sections |
| `composer audit:playground-contract-sync` | Meta ↔ contract ↔ regression helpers |
| `composer sync:playground-api-doc` | Refresh API_DOC Playground tables |
| `php bin/playground-browser-smoke.php` | Printable smoke checklist (URLs + markers) |
| `WPDEV_PLAYGROUND_HTTP=1 php bin/playground-browser-smoke.php` | Optional authenticated HTTP marker pass (Docker) |
| `composer regression:playground:signoff` | Audits + PHPUnit + optional WP render/HTTP bundle |

Docker bundle: `./bin/regression-docker.sh` (add `WPDEV_PLAYGROUND_HTTP_FULL=1` for ajax HTTP + browser smoke HTTP + WaaS samples).

## Release gate commands

```bash
composer test
composer smoke
composer audit:ajax
composer audit:inc-complete
composer audit:shim-removal
composer audit:p3
composer regression:playground:signoff   # static audits + PHPUnit; add wp-load for render/HTTP
composer regression:p2:docker
```

`regression:p2` requires valid `WPDEV_REGRESSION_RESULT` sentinels; skips fail unless `WPDEV_ALLOW_REGRESSION_SKIP=1`.
