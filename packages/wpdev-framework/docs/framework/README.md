# WPDev Framework Documentation

This section is a site-ready documentation layer for the WPDev framework modules.
It explains how to use each module, which APIs to call, and which examples to
copy when building new admin screens or WaaS integrations.

For raw generated API reference, see [`../api/`](../api/). For the canonical
project context, see [`../CONTEXT.md`](../CONTEXT.md). Release checklist:
[`../RELEASE-PREP.md`](../RELEASE-PREP.md).

## Module Docs

| Module | Use it for | Guide |
|--------|------------|-------|
| `core` | Module loading, lifecycle, services, events, playground, admin-page rebinding | [`modules/core.md`](modules/core.md) |
| `field-builder` | Field type registration, field view resolution, sanitization hooks | [`modules/field-builder.md`](modules/field-builder.md) |
| `form-builder` | Modal and inline forms, Wubox URLs, ajax modal payloads | [`modules/form-builder.md`](modules/form-builder.md) |
| `settings-panel-builder` | Settings sections, fields, storage, save pipeline | [`modules/settings-panel-builder.md`](modules/settings-panel-builder.md) |
| `menu-builder` | Declarative admin menus and child menu nodes | [`modules/menu-builder.md`](modules/menu-builder.md) |
| `tab-navigation` | Shared tab markup for settings, list views, wizard-like screens | [`modules/tab-navigation.md`](modules/tab-navigation.md) |
| `table-builder` | List table registry, table config, bulk actions, playground tables | [`modules/table-builder.md`](modules/table-builder.md) |
| `metabox-builder` | Edit-page metabox/widget registration | [`modules/metabox-builder.md`](modules/metabox-builder.md) |
| `admin-page-builder` | Base/list/edit admin page classes and page templates | [`modules/admin-page-builder.md`](modules/admin-page-builder.md) |
| `admin-widget-builder` | Dashboard widgets, widget datasources, Jumper commands | [`modules/admin-widget-builder.md`](modules/admin-widget-builder.md) |
| `admin-custom-page` | WPDev dashboard/about pages and dashboard extension hooks | [`modules/admin-custom-page.md`](modules/admin-custom-page.md) |
| `admin-setting-page` | Production WPDev settings page shell | [`modules/admin-setting-page.md`](modules/admin-setting-page.md) |
| `wizard` | Setup wizard and sunrise update flow | [`modules/wizard.md`](modules/wizard.md) |

## Common Lifecycle

Use the WPDev lifecycle instead of running module code immediately:

```php
wpdev_on_load(
	static function () {
		// Register tables, forms, fields, settings, widgets, ajax handlers.
	}
);

wpdev_on_admin_pages(
	static function () {
		// Instantiate page classes or register page rebinding.
	}
);
```

| Hook | Purpose |
|------|---------|
| `wpdev_init` | Early services and singletons |
| `wpdev_load` | Entity registration and module runtime hooks |
| `wpdev_admin_pages` | Admin page class instantiation |
| `wpdev_register_forms` | Modal/ajax form registration |
| `wpdev_modules_loaded` | Framework modules loaded; examples are loaded here |

## Module Loading

In normal plugin runtime, `wpdev.php` loads `modules/core/setup.php`, and the
module loader discovers every `modules/*/setup.php`.

For isolated usage or tests, load a module with dependency resolution:

```php
wpdev_load_module( 'table-builder' );
```

## Registry Pattern

Most modules expose a uniform facade:

```php
wpdev_register_{entity}( $id, array $config = array(), bool $replace = true );
wpdev_get_{entity}( $id );
wpdev_has_{entity}( $id );
wpdev_list_{entity}();
wpdev_unregister_{entity}( $id );
```

Metaboxes are scoped per page:

```php
wpdev_register_metabox( $page_id, $metabox_id, $config );
```

## Recommended Build Order

For a new domain/admin feature:

1. Register module metadata in the **wpdev-examples** plugin (`wpdev-examples/{slug}/setup.php`).
2. Register storage tables with `wpdev_register_table()` when the domain owns custom DB tables.
3. Register list/edit pages with `wpdev_register_module_admin_pages()`.
4. Add fields with `field-builder`, modal forms with `form-builder`, and edit widgets with `metabox-builder`.
5. Add dashboard cards or command palette entries with `admin-widget-builder` only when needed.
6. Add a sandbox panel in **wpdev-playground** (`playground-{module}/playground.php`); the plugin boots when `WPDEV_PLAYGROUND_DIR` is defined.

## Example and Playground Index

Sibling plugins live alongside the framework at `wp-content/plugins/wpdev-examples` and `wp-content/plugins/wpdev-playground`.

| Module | Module-local examples | Playground panel | Primary WaaS examples |
|--------|----------------------|------------------|----------------------|
| `core` | — | *(infra only)* `wpdev-playground/includes/playground/` | All via parity registry |
| `field-builder` | `modules/field-builder/examples/` | `playground-field-builder/` | `products`, `checkout`, `metabox-post-type`, `payments` |
| `form-builder` | `modules/form-builder/examples/` | `playground-form-builder/` | `checkout`, `payments`, `metabox-post-type` |
| `settings-panel-builder` | `modules/settings-panel-builder/examples/` | `playground-settings-panel-builder/` | `admin-setting-page-defaults`, `gateways` |
| `menu-builder` | `modules/menu-builder/examples/` | `playground-menu-builder/` | `products`, `sites` (transitive via admin-page-builder) |
| `tab-navigation` | `modules/tab-navigation/examples/` | `playground-tab-navigation/` | `products`, `sites` (list-table `views` → tabs; transitive dep) |
| `table-builder` | `modules/table-builder/examples/` | `playground-table-builder/` | `products`, `webhooks`, `events` |
| `metabox-builder` | `modules/metabox-builder/examples/` | `playground-metabox-builder/` | `products`, `sites`, `metabox-post-type` |
| `admin-page-builder` | `modules/admin-page-builder/examples/` | `playground-admin-page-builder/` | `products`, `sites`, `customers` |
| `admin-widget-builder` | `modules/admin-widget-builder/examples/` | `playground-admin-widget-builder/` | `dashboard`, `admin-custom-page-dashboard-widgets` |
| `admin-custom-page` | — | `playground-admin-custom-page/` + `playground-wpdev/` parity | `dashboard`, `admin-custom-page-top-nav` |
| `admin-setting-page` | — | `playground-admin-setting-page/` | `admin-setting-page-defaults`, `gateways` |
| `wizard` | — | `playground-wizard/` | `domains` (sunrise) |

Extra playground panels: `playground-metabox-post-type/`, `playground-wpdev/` (WaaS list preview helpers).

See each module's `References` section (in `modules/{module}/API_DOC.md` and `docs/framework/modules/{module}.md`) for:
- A) exact `modules/{module}/examples/example-*.php` files with one-line header descriptions,
- B) full `wpdev-playground/playground-{module}/playground.php` + helper files + `admin.php?page=wpdev-pg-{module}` URLs + acceptance markers,
- C) 1–3 concrete `wpdev-examples/{slug}/setup.php` + key classes (admin pages, tables, managers, sections) that depend on the module (verified via `dependencies` arrays and feature usage).

## Source Of Truth

- Raw API reference: `modules/{module}/API_DOC.md`
- Generated manifest: `docs/api/manifest.json`
- Framework primitives: `docs/api/framework-primitives.md`
- Panel-building workflow: `skills/wpdev-panel-builder/SKILL.md`
- WaaS example contract: **wpdev-examples** plugin (`README.md` at plugin root)

