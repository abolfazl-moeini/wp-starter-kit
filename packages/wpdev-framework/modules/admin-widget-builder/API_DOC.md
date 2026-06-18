# Admin Widget Builder (`admin-widget-builder`)

## Overview

Dashboard widget and Jumper command registry module. It provides widget registration APIs, datasource contracts, UI element helpers, and modular Jumper namespace/command APIs consumed by dashboard and admin pages.

## Standalone usage

```php
wpdev_load_module( 'admin-widget-builder' );
```

**Declared dependencies:** `core`, `admin-page-builder`.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Boots Jumper/UI singletons, widget datasources, command providers; emits `wpdev_register_jumper_commands` |
| `wpdev_admin_pages` | Consumed by dashboard/admin pages rendering registered widgets |
| `wpdev_init` | Shared dependency initialization |

Register widgets, datasources, and Jumper commands on `wpdev_load` (or via `wpdev_on_load()` / `wpdev_on_admin_pages()` helpers from your module).

## Public API

Register multiple items with distinct ids on `wpdev_load`. Duplicate ids without `$replace = true` trigger `_doing_it_wrong` and return `false`.

### `wpdev_register_dashboard_widget`

```php
wpdev_register_dashboard_widget( string $id, array $config = [], bool $replace = true ): bool
```

Register a WPDev dashboard statistics widget. @since 2.7.0

**Config keys:** `tab` (default `general`), `title`, `view`, `datasource` (callable), `context` (default `CONTEXT_WPDEV_STATISTICS`), `capability`, `position` (default `normal`), `priority` (default `high`).

### `wpdev_get_dashboard_widget`

```php
wpdev_get_dashboard_widget( string $id ): ?array
```

Returns normalized widget config or `null`. @since 2.7.0

### `wpdev_has_dashboard_widget`

```php
wpdev_has_dashboard_widget( string $id ): bool
```

@since 2.7.0

### `wpdev_list_dashboard_widgets`

```php
wpdev_list_dashboard_widgets(): array
```

Returns all widgets keyed by sanitized id. @since 2.7.0

### `wpdev_unregister_dashboard_widget`

```php
wpdev_unregister_dashboard_widget( string $id ): void
```

@since 2.7.0

### `wpdev_register_widget_datasource`

```php
wpdev_register_widget_datasource( string $id, callable $callback, bool $replace = true ): bool
```

Register a named widget datasource callback. Returns `false` when `$callback` is not callable. @since 2.5.0

### `wpdev_widget_datasource`

```php
wpdev_widget_datasource( string $id, array $context = [] ): mixed
```

Resolve a registered datasource with optional context. @since 2.5.0

### `wpdev_register_jumper_command`

```php
wpdev_register_jumper_command( string $id, array $config = [], bool $replace = true ): bool
```

Register a namespaced Jumper command (`type=link` or `type=action`). @since 2.8.0

**Config keys:** `namespace`, `title`, `type`, `url`, `js_action`, `callback`, `icon`, `keywords`, `capability`, `priority`.

### `wpdev_get_jumper_command`

```php
wpdev_get_jumper_command( string $id ): ?array
```

@since 2.8.0

### `wpdev_has_jumper_command`

```php
wpdev_has_jumper_command( string $id ): bool
```

@since 2.8.0

### `wpdev_list_jumper_commands`

```php
wpdev_list_jumper_commands(): array
```

@since 2.8.0

### `wpdev_unregister_jumper_command`

```php
wpdev_unregister_jumper_command( string $id ): void
```

@since 2.8.0

### `wpdev_register_jumper_namespace`

```php
wpdev_register_jumper_namespace( string $id, array $config = [], bool $replace = true ): bool
```

Register a namespace/group for Jumper commands. @since 2.8.0

**Config keys:** `plugin` (default `WPDev`), `label`, `icon`, `priority`.

### `wpdev_get_jumper_namespace`

```php
wpdev_get_jumper_namespace( string $id ): ?array
```

@since 2.8.0

### `wpdev_list_jumper_namespaces`

```php
wpdev_list_jumper_namespaces(): array
```

@since 2.8.0

## Hooks and filters

| Hook / filter | Args | When |
|---------------|------|------|
| `wpdev_register_jumper_commands` | none | Modules/plugins register Jumper commands and namespaces |
| `wpdev_register_widget_datasources` | none | Register shared widget datasource callbacks |
| `wpdev_dashboard_widgets` | widget payload | Dashboard widget rendering integration |
| `wpdev_dashboard_{tab}_widgets` | tab-specific widgets | Per-tab widget injection on WPDev dashboard |
| `wpdev_blocks` | block/render context | Widget/component block rendering helpers |
| `wpdev_contains_element` | element scan args | Element resolution for widget/template runtime |
| `wpdev_footer_left` | rendered footer content | Widget/dashboard footer rendering extension |
| `wpdev_jumper_namespace_plugin` | `$plugin_label, $module_id, $page_classes` | Override auto-synthesized namespace plugin label |
| `wpdev_jumper_namespace_priority` | `$priority, $module_id, $page_classes` | Override auto-synthesized namespace sort order |
| `wpdev_jumper_options` | none | Extend Jumper Selectize options |
| `wpdev_link_list` | `$choices` | Legacy Jumper link list extension |
| `wpdev_module_enabled` | `$enabled, 'admin-widget-builder'` | Skip module bootstrap when filtered false |

## Storage and option keys

- No dedicated option namespace is owned by this module.
- Widget, datasource, and Jumper registries are in-memory and rebuilt on bootstrap.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| Per-widget `capability` config key | Dashboard/admin contexts | Widget visibility on dashboard cards |
| Per-command `capability` config key | Jumper palette | Command visibility before localization |
| `manage_network` (common for WPDev dashboard pages) | Network admin | Dashboard pages consuming this registry |

Jumper action execution (`wpdev_jumper_run_command`) re-checks command capability server-side.

## Registration and menu context

`setup.php` initializes component/registry classes, registers module views, boots `Jumper_Command_Providers`, and triggers `wpdev_register_jumper_commands` on `wpdev_load`. This module does not own top-level menus; it is consumed by dashboard/admin pages from `admin-custom-page` and related modules.

## Playground

Dev-only sandbox panel (requires active **wpdev-playground** plugin). Implementation: `wpdev-playground/playground-admin-widget-builder/playground.php`. Template reference: [`docs/modularization/API_DOC_TEMPLATE.md`](../../docs/modularization/API_DOC_TEMPLATE.md).

| | |
|--|--|
| **Mode** | `sandbox` panel |
| **Admin URL** | `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=general` |
| **Panel / page slug** | `wpdev-pg-admin-widget-builder` |
| **Render** | `wpdev_render_playground_dashboard_grid()` |
| **Setup** | `wpdev_playground_setup_dashboard_widgets()` |
| **Requires modules** | `core`, `admin-page-builder` |
| **Suggested query args** | `pg_tab=general` |
| **Regression query contexts** | `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=general`, `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=taxes` |
| **Acceptance markers** | `wpdev-styling`, `wpdev-playground-dashboard-grid`, `data-wpdev-widget`, `postbox` |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

- [`examples/example-01.php`](examples/example-01.php) — admin-widget-builder usage (see README)
- [`examples/example-02.php`](examples/example-02.php) — advanced admin-widget-builder pattern

### Playground (requires wpdev-playground plugin)

- Panel: `wpdev-playground/playground-admin-widget-builder/playground.php`
- Helpers: `wpdev-playground/playground-admin-widget-builder/functions-playground-widgets.php`
- Admin URL: `admin.php?page=wpdev-pg-admin-widget-builder&pg_tab=general`
- Acceptance markers: `wpdev-styling`, `wpdev-playground-dashboard-grid`, `data-wpdev-widget`, `postbox`

### WaaS examples (requires wpdev-examples plugin)

- `wpdev-examples/admin-custom-page-dashboard-widgets/setup.php` — `wpdev_register_dashboard_widget()` registrations (MRR, growth, and related KPI cards)
- `wpdev-examples/dashboard/setup.php` — owns `Top_Level_Admin_Page` shell that renders registered dashboard widgets (depends on `admin-custom-page`, `admin-widget-builder`)
- `wpdev-examples/customer-panel/setup.php` — customer-facing widget composition via `admin-widget-builder` APIs

## Recipes

- Build dashboard KPIs by pairing `wpdev_register_dashboard_widget()` with datasource callbacks (inline or via `wpdev_register_widget_datasource()`).
- Share data pipelines across widgets with `wpdev_widget_datasource()` and named datasource ids.
- Add command palette shortcuts by registering namespaced Jumper commands on `wpdev_register_jumper_commands`.
- Rely on auto-discovery for list/edit admin pages, then add explicit high-value commands on top.

## Migration

- **2.5.0** — Widget datasource helpers (`wpdev_register_widget_datasource`, `wpdev_widget_datasource`).
- **2.7.0** — Dashboard widget registry facades; prefer `wpdev_register_*` over direct registry class access. See `docs/modularization/api-contract.md`.
- **2.8.0** — Jumper namespace/command registries; prefer these APIs over ad-hoc command arrays or menu-only shortcuts.

## Appendix

### Widget Authoring Guide (WPDev Dashboard)

Use this module to build statistics widgets shown on the `WPDev` dashboard page.

#### Widget lifecycle

1. Register widget definitions on `wpdev_load`.
2. Dashboard page emits `wpdev_dashboard_{tab}_widgets` and `wpdev_dashboard_widgets`.
3. Registry injects matching widgets into metabox slots by tab/capability.
4. Widget datasource resolves template args and renders the configured view.

#### Config keys for `wpdev_register_dashboard_widget()`

- `tab` (default `general`)
- `title`
- `view` (typically `dashboard-statistics/widget-*`)
- `datasource` (callable or registered datasource id string)
- `capability` (optional)
- `position` (default `normal`)
- `priority` (default `high`)
- `context` (default `CONTEXT_WPDEV_STATISTICS`)

#### Recommended implementation pattern

- **Register in domain module:** add registration on `wpdev_load` with explicit id and tab.
- **Keep datasource thin:** aggregate data in dedicated functions/services; return plain array.
- **Keep view presentational:** escape output and avoid heavy query logic in template.
- **Reuse where needed:** use `wpdev_register_widget_datasource()` + `wpdev_widget_datasource()` for shared data pipelines.

#### Production reference widget

`Monthly Recurring Revenue Growth` (`wpdev-mrr-growth`) in `admin-custom-page` is a canonical implementation:

- Declares `capability` and `position`.
- Uses `dashboard-statistics/widget-mrr-growth` view.
- Integrates with date-range dashboard context.

### Jumper command registry

Jumper supports a modular command registry with namespace grouping and attribution. Extended reference: [`JUMPER_COMMAND_REGISTRY.md`](JUMPER_COMMAND_REGISTRY.md).

#### Namespace config

- `plugin` (string): owning plugin label shown in group header (default: `WPDev`)
- `label` (string): section label (default: humanized namespace id)
- `icon` (string): optional dashicon/class hint
- `priority` (int): group sort order (lower first)

#### Command config

- `namespace` (string): required grouping namespace id
- `title` (string): command title shown in Jumper
- `type` (string): `link` or `action`
- `url` (string): target URL for `link` commands
- `js_action` (string): client action handler id for `action` commands
- `callback` (callable): optional server callback for `action` commands
- `keywords` (array): search keywords
- `capability` (string): optional capability gate
- `priority` (int): command sort order inside group

#### Grouping model

- Internal group key: `jumper-ns-{namespace_id}`
- Display label: `{plugin} · {label}` (e.g. `WPDev · Products` for namespace `wpdev-products`)

#### Auto-registration

`Jumper_Command_Providers` hooks `wpdev_module_admin_pages_registered` and synthesizes module commands automatically:

- list/view pages → `Go to {Resource}` (`type=link`)
- edit pages → `Create New {Resource}` (`type=link`)

Namespaces are auto-created from module ids when missing (e.g. `wpdev-products` → `WPDev · Products`). Resource naming is inferred from page id/class conventions; synthesized commands default to `manage_network` capability.

#### Runtime behavior

- Commands are localized into `wpdev_jumper_vars.commands` from `Jumper_Command_Registry::grouped()`.
- `jumper.js` injects groups/options into Selectize at runtime.
- `link` commands navigate/open URLs.
- `action` commands run JS action handlers first, then fallback to AJAX `wpdev_jumper_run_command`.

#### Action response envelope

Server callbacks may return:

- `redirect` (string)
- `modal` (array)
- `notice` (string)

Client action registration example:

```js
window.wpdev.jumper.registerAction( 'refreshStats', function ( option ) {
	window.location.reload();
} );
```

#### Security

- Command listing is capability-filtered server-side before localization.
- Action endpoint enforces: command exists, `type` is `action`, callback is callable, user passes `Jumper_Command_Registry::is_allowed()`.

#### Manual verification

- Network-admin UI: confirm Jumper groups, command search, and `link` / `action` execution.
- Capability gates: verify commands hidden for users without required caps.
