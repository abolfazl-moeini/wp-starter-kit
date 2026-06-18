# WPDev Execution Backlog (Canonical)

Single source of truth for architecture-fix execution. Legacy plan IDs (`J-*`, `K*-*`, `T##`) map here.

## Status Legend

| Status | Meaning |
|--------|---------|
| `done` | Implemented and covered by tests or audits |
| `partial` | Started; behavior incomplete vs DoD |
| `todo` | Not started |

## Phase P0 — Normalization

| ID | Legacy map | Status | Owner |
|----|------------|--------|-------|
| P0-01 | T01–T04 prep | done | QA |
| P0-02 | ID namespace | done | Core |
| P0-03 | execution-dag.md | done | Core |

## Phase R1 — Regression guardrails

| ID | Task | Status | Validate |
|----|------|--------|----------|
| R1-01 | Sentinel schema | done | `bin/regression-result.php` |
| R1-02 | Child scripts emit sentinel | done | `regression-wp-load.php`, `regression-admin-pages.php` |
| R1-03 | Parent parser | done | `regression-p2-signoff.php` |
| R1-04 | Skip policy | done | `WPDEV_ALLOW_REGRESSION_SKIP=1` |
| R1-05 | Fatal fallback scan | done | parent runner |
| R1-06 | Parser tests | done | `RegressionSentinelTest.php` |
| R1-07 | HTTP regression + sentinel | done | `regression-network-admin-http.php`, Docker trust CLI |
| R1-08 | P2 runner loads sentinel helpers | done | `regression-result.php` CLI-safe (no ABSPATH exit) |
| R1-09 | P2 in Docker | done | `composer regression:p2:docker` |

## Phase D1 — Module graph

| ID | Task | Status | Validate |
|----|------|--------|----------|
| D1-01 | Loader cycle exception | done | `Module_Loader` |
| D1-02 | Cycle path in message | done | unit test |
| D1-03 | Synthetic cycle test | done | `Module_Loader_SortTest` |
| D1-04 | Full graph acyclic test | done | `ModuleDependencyGraphTest` |
| D1-05 | No domain cycles | done | payments/gateways cycle broken |

## Phase A — Payments / Gateways resolver

| ID | Task | Status | Validate |
|----|------|--------|----------|
| A1-01 | Resolver interface | done | `interface-gateway-resolver.php` |
| A1-02 | Null resolver | done | unit test |
| A1-03 | Registry | done | unit test |
| A2-01 | Display via resolver | done | `class-payment.php` |
| A2-02 | Refund via resolver | done | `class-payment-edit-admin-page.php` |
| A2-03 | WP_Error gateway-not-available | done | unit test |
| A2-04 | Observability hook/log | done | null resolver |
| A3-01 | Gateways adapter | done | `class-payment-gateway-resolver.php` |
| A3-02 | Register on boot | done | `wpdev-gateways/setup.php` |
| A3-03 | Remove payments→gateways dep | done | graph test |
| A3-04 | README updates | done | module READMEs |

## Phase B — Ajax / Modal / Tabs

| ID | Task | Status | Validate |
|----|------|--------|----------|
| B1-01 | Ajax contract alignment | done | interface |
| B1-02 | Security defaults on register_handler | done | `Ajax_Service` |
| B1-03 | ajax-exceptions.md | done | doc |
| B1-04 | Exception audit | done | `composer audit:ajax-exceptions` |
| B2-01 | Modal via Ajax service | done | `Modal_Service` |
| B2-03 | Modal registration tests | done | `ModalServiceRegistrationTest` |
| B3-01 | Add-ons feature flag | done | filter default true |
| B3-02 | tab_loader_url in template | done | DOM |
| B3-03 | JS tab consumer | done | prefetch only |
| B3-04 | loading/error/stale guard | done | localized catalog |
| B3-07 | Single catalog path | done | `AddonsCatalogTest` |

## Phase F/S/T/M/W — Builders

| ID | Task | Status | Validate |
|----|------|--------|----------|
| F-01 | Field sanitize via registry | done | `FieldSanitizeTest` |
| F-05 | Field view aliases | done | `FieldViewResolverTest` |
| S-01 | Section registry authority | done | `SettingsSectionRegistryAuthorityTest` |
| S-02 | Registry merge in get_sections | done | `class-settings.php` |
| S-03 | Domain defaults in Settings monolith | done | `admin-setting-page/src/class-wpdev-settings-default-sections.php` + hook |
| S-04 | Third-party settings example | done | `settings-panel-builder/examples/example-03-third-party-settings.php` |
| T-01 | Declarative schema | done | existing table tests |
| T-02 | Reference table parity | done | existing declarative coverage test |
| T-03 | Table base domain-free | done | grep base list table |
| M-01 | Metabox registry render API | done | `MetaboxRegistryTest` |
| M-02 | Trait stores render callbacks | done | `register_metabox_in_registry` |
| M-03 | Remove events filter from trait | done | product edit page |
| M-04 | Product metabox registry callbacks | done | registry stores callback; WP shell uses `metabox_wp_render_callback` |
| M-05 | Registry-authoritative metabox render | done | `Metabox_Registry::render()` from `add_meta_box` |
| W-01 | Datasource registry generic | done | `WidgetDatasourceRegistryTest` |
| W-02 | Domain datasources in waas modules | done | checkout/domains registrars |

## Phase Z — Signoff

| ID | Task | Status | Validate |
|----|------|--------|----------|
| Z1-01 | acceptance-test-matrix.md | done | doc |
| Z2 | Composer CI gates | done | `composer ci` |

## Remaining optional (non-blocker)

- Browser spot-check modals/screen options on reference pages (see `regression-signoff.md`).

See [execution-dag.md](./execution-dag.md) for dependencies.
