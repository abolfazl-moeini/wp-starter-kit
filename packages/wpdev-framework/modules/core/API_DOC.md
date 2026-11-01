# Core (`core`)

## Overview

Foundational module loader and lifecycle contract for WPDev. It provides module dependency loading, service registry access, lifecycle helpers, admin-page/playground rebinding utilities, and the uniform API contract other modules build on.

## Standalone usage

```php
wpdev_load_module( 'core' );
```

**Declared dependencies:** none.

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Register entities and module-level runtime hooks |
| `wpdev_admin_pages` | Instantiate admin page classes and page registries |
| `wpdev_init` | Boot services (`Service_Registry::boot()`) and early singletons |

Helpers: `wpdev_on_load()`, `wpdev_on_admin_pages()`.

## Public API

### `wpdev_load_module`

```php
wpdev_load_module( string $module_id, string $modules_dir = '' ): bool
```

Load one module and auto-resolve its declared dependencies. Requires core to be registered (typically after `core/setup.php`).

### `wpdev_on_load`

```php
wpdev_on_load( callable $callback, int $priority = 10 ): void
```

Schedule registration on `wpdev_load`.

### `wpdev_on_admin_pages`

```php
wpdev_on_admin_pages( callable $callback, int $priority = 10 ): void
```

Schedule admin page instantiation on `wpdev_admin_pages`.

### `wpdev_services`

```php
wpdev_services( ?string $id = null )
```

Access access, ajax, form, modal, screen_options, tour, and view services. Pass `null` to return all registered services.

### `wpdev_register_service`

```php
wpdev_register_service( string $id, Service_Contract $service, bool $replace = true ): bool
```

Register a custom core service.

### Access Control API (`modules/core/src/access.php`)

Provides the central public facade for the Two-Gate Defense-in-Depth access control engine (`WPDev\Access\` via `packages/access-manager`).

#### `wpdev_access`

```php
wpdev_access(): \WPDevFramework\Core\Services\Access_Service
```

Retrieve the singleton `Access_Service` instance coordinating permission/policy registries, capability resolvers, and two-gate evaluation. @since 2.13.1

#### `wpdev_access_contract`

```php
wpdev_access_contract(): array
```

Returns the active `Access_Service::get_contract()` handshake without evaluating access, booting services, or writing registries. `contract_version` is integer `1`; `provider` is `wpdev`; `service_class` identifies the active service via `static::class`, not an absolute file path. If the loaded service lacks `get_contract()`, returns a non-array, or throws, the facade returns an empty array instead of fatalling. @since 2.13.1

The `features` map explicitly reports booleans:

- `true`: `permission_registry`, `policy_registry`, `native_capability_gate`, `explicit_policy_binding`, `strict_qualifiers`.
- `false` (unsupported): `actor_evaluation`, `context_schema`, `user_restrictions`, `restriction_revision`, `pending_barriers`, `independent_recovery`, `grant_metadata`, `surface_bindings`, `readonly_preview`, `scoped_providers`.

`actor_evaluation` remains false until scope and actor validation are complete. Partial metadata or surface integration does not establish full feature support. Consumers must require a recognized contract version and explicit `true` for each needed feature; function presence, framework version, or contract version alone makes no patch-level or full-support claim. Missing flags are unsupported.

#### `wpdev_register_permission`

```php
wpdev_register_permission( string $id, array $config = array(), bool $replace = true ): bool
```

Register a permission in the catalog (`Permission_Registry`). @since 2.13.1

| Param | Type | Description |
|---|---|---|
| `$id` | string | Unique namespaced permission ID (e.g. `'acme.orders.view'`). |
| `$config` | array | Configuration array (`owner`, `capability`, `scope` = 'site'\|'network', `risk` = 'read'\|'write'\|'destructive'\|'administer', `label`, `description`). |
| `$replace` | bool | Whether to replace an existing permission with the same ID. Default `true`. |

#### `wpdev_get_permission`

```php
wpdev_get_permission( string $id ): ?array
```

Retrieve a registered permission definition from the catalog. @since 2.13.1

#### `wpdev_has_permission`

```php
wpdev_has_permission( string $id ): bool
```

Check whether a permission ID is registered in the catalog. @since 2.13.1

#### `wpdev_list_permissions`

```php
wpdev_list_permissions(): array
```

List all registered permissions in the catalog. @since 2.13.1

#### `wpdev_unregister_permission`

```php
wpdev_unregister_permission( string $id ): void
```

Unregister a permission from the catalog. @since 2.13.1

#### `wpdev_register_access_policy`

```php
wpdev_register_access_policy( string $id, array $config = array(), bool $replace = true ): bool
```

Register an AccessManager access policy (`Access_Policy_Registry`). @since 2.13.1

| Param | Type | Description |
|---|---|---|
| `$id` | string | Policy identifier (e.g. `'acme_orders'`). |
| `$config` | array | Policy config (`owner`, `qualifier` instance of `\WPDev\Access\Contracts\Qualifier_Interface` or `\WPDev\Access\QualifierBase`, `version`). |
| `$replace` | bool | Whether to replace an existing policy. Default `true`. |

#### `wpdev_get_access_policy`

```php
wpdev_get_access_policy( string $id ): ?array
```

Retrieve a registered access policy. @since 2.13.1

#### `wpdev_has_access_policy`

```php
wpdev_has_access_policy( string $id ): bool
```

Check whether an access policy is registered. @since 2.13.1

#### `wpdev_list_access_policies`

```php
wpdev_list_access_policies(): array
```

List all registered access policies. @since 2.13.1

#### `wpdev_unregister_access_policy`

```php
wpdev_unregister_access_policy( string $id ): void
```

Unregister an access policy. @since 2.13.1

#### `wpdev_can`

```php
wpdev_can( string $access_id, array $context = array() ): bool
```

Evaluate Two-Gate access for the current actor. Checks Gate 1 (native WP capability) AND Gate 2 (AccessManager domain rules). @since 2.13.1

#### `wpdev_can_for_user`

```php
wpdev_can_for_user( mixed $user_id, string $access_id, array $context = array() ): bool
```

Evaluate access for a specific trusted user (server-side/audit only; never accept from untrusted client input). @since 2.13.1

#### `wpdev_require_access`

```php
wpdev_require_access( string $access_id, array $context = array() ): void
```

Assert access for an access ID, throwing `WPDevFramework\Core\Access\Exceptions\Access_Denied_Exception` on failure. @since 2.13.1

#### `wpdev_request_access_is_allowed`

```php
wpdev_request_access_is_allowed( array $args ): bool
```

Helper for surface adapters. Evaluates `$args['access']` or `$args['access_id']` via `wpdev_can()`. If omitted, falls back to `$args['capability_callback']` or `$args['capability']` with fail-closed semantics. @since 2.13.1

### `wpdev_create_tour`

```php
wpdev_create_tour( string $id, array $steps = [], bool $once = true ): void
```

Register an admin walkthrough/tour (Shepherd.js-based) through the core tour service.

- Use unique ids (e.g. `wpdev-dashboard`, `new_product_warning`) per flow/page.
- Register before `in_admin_header`; late calls are ignored.
- When `$once = true`, completion is stored per user and the tour is not shown again.

### `wpdev_add_admin_notice`

```php
wpdev_add_admin_notice(
	string $message,
	string $type = 'info',
	string $panel = 'admin',
	string|false $dismissible_key = false,
	array $actions = []
): bool
```

Queue a WPDev-styled admin notice (network / site / user chrome). Prefer this over
`wpdev()->notices->add()` and over raw `admin_notices` markup.

| Arg | Values / notes |
|-----|----------------|
| `$type` | `info` (blue), `warning`, `error`, `success` → `notice-{type}` |
| `$panel` | `admin`, `network-admin`, or `user` |
| `$dismissible_key` | Stable string for per-user dismiss, or `false` |
| `$actions[]` | Buttons: `title`, `url` (required); optional `style` (`primary`\|`secondary`), `primary` (bool), `target` (`_blank`), `class` |

Example (network Sites screen tip):

```php
wpdev_add_admin_notice(
	__( 'Manage sites from WPDev → Sites.', 'my-plugin' ),
	'info',
	'network-admin',
	'my-plugin-sites-tip',
	array(
		array(
			'title'  => __( 'Go to WPDev Sites →', 'my-plugin' ),
			'url'    => wpdev_network_admin_url( 'wpdev-sites' ),
			'style'  => 'primary',
		),
		array(
			'title'  => __( 'Whitelabel settings →', 'my-plugin' ),
			'url'    => wpdev_network_admin_url( 'wpdev-settings', array( 'tab' => 'whitelabel' ) ),
			'style'  => 'secondary',
		),
	)
);
```

Source: `modules/core/src/functions/admin-notices.php` · class `WPDevFramework\Admin_Notices`.

### `wpdev_register_admin_page`

```php
wpdev_register_admin_page( string $class_name, array $args = [], int $priority = 100 ): void
```

Re-register an existing production admin page class under another parent menu and context (`admin`, `network`, or `both`) via `Base_Admin_Page` constructor overrides. Playground parity uses priority `100` with `parent` => `wpdev` and `context` => `admin` (see `Playground_Parity_Registry`).

### `wpdev_admin_page_build_overrides`

```php
wpdev_admin_page_build_overrides( array $args ): array
```

Build registration overrides for an admin page class. Accepts `parent`, `type`, `context`, `capability`, `highlight_menu_slug`, `supported_panels`, `position`, `fold_menu`, and `hide_admin_notices`.

### `wpdev_admin_page_context_to_supported_panels`

```php
wpdev_admin_page_context_to_supported_panels( string $context, string $capability ): array
```

Map a registration context (`admin`, `network`, or `both`) to `Base_Admin_Page` `supported_panels` keys without subclassing page classes.

### `wpdev_dispatch_event`

```php
wpdev_dispatch_event( string $slug, array $payload = [] ): void
```

Dispatch a domain event through the framework hook bus (`wpdev_event` and `wpdev_event_{$slug}`).

### `wpdev_register_event_listener`

```php
wpdev_register_event_listener( string $slug, callable $callback, int $priority = 10, int $accepted_args = 1 ): bool
```

Register a listener for a specific event slug.

### `wpdev_register_global_event_listener`

```php
wpdev_register_global_event_listener( callable $callback, int $priority = 10, int $accepted_args = 2 ): bool
```

Register a listener for all WPDev events on `wpdev_event`.

## Extension via filters (framework-only decoupling)

Core never calls sibling-plugin functions directly. Optional behavior is wired through filters; **wpdev-playground** and **wpdev-examples** hook these when active.

| Filter | Default | Hooked by |
|--------|---------|-----------|
| `wpdev_uses_site_admin_context` | `false` | wpdev-playground (parity production pages in site admin) |
| `wpdev_menu_register_context` | `false` | wpdev-playground (`pg_*` menu wiring during panel setup) |
| `wpdev_settings_search_result_url` | `null` | wpdev-playground (`pg_*` settings sections) |
| `wpdev_entity_lookup` / `wpdev_entity_lookup_by` / `wpdev_entity_create` | `null` / fail-closed | wpdev-examples domain modules |
| `wpdev_dashboard_stat_*` | empty / `0` | wpdev-examples (`includes/dashboard-hooks.php`) |
| `wpdev_dashboard_widget_elements` | `array()` | wpdev-examples customer-panel widgets |

Helpers: `wpdev_uses_site_admin_context()`, `wpdev_is_menu_register_context()` in `modules/core/src/functions/extension-context.php`.

## Registry completeness (core-owned registries)

| Entity | register | get | has | list | unregister |
|--------|:--------:|:---:|:---:|:----:|:----------:|
| service | Yes | via `wpdev_services()` | Yes | all via `wpdev_services()` | Yes |
| table (schema) | Yes | — | — | — | — |
| admin_page (rebind) | Yes | — | — | — | — |
| ajax_handler | Yes | — | — | — | — |
| migration | Yes | — | — | — | — |
| event_listener | Yes | — | — | — | — |

Register-only entities are intentional; see module builder `API_DOC.md` files for full CRUD subsets.

## Hooks and filters

| Hook | Args | When |
|------|------|------|
| `wpdev_init` | none | Core service boot + early init phase |
| `wpdev_load` | none | Primary module registration phase |
| `wpdev_admin_pages` | none | Admin page instantiation phase |
| `wpdev_register_forms` | form context payload | Form registration lifecycle phase |
| `wpdev_module_enabled` | `bool $enabled, string $module_id` | Enables/disables per-module runtime bootstrap |
| `wpdev_entity_lookup` | `mixed $default, $id, string $context = ''` | Framework decoupling: examples resolve domain records by id |
| `wpdev_entity_lookup_by` | `mixed $default, string $field, $value, string $context` | Framework decoupling: examples resolve records by field |
| `wpdev_entity_create` | `mixed $default, array $data, string $context` | Framework decoupling: examples create domain records during migration/install |
| `wpdev_entity_handler_available` | `bool $default, string $context` | Framework decoupling: examples report whether a handler is available |
| `wpdev_catalog_list` | `array $default, array $args, string $context` | Framework decoupling: examples return catalog lists (e.g. site templates) |

## Storage and option keys

- Core references several global WP options/settings (for example `timezone_string`, `date_format`, `time_format`) but does not own one narrow option namespace.
- Service/module/page registries are in-memory and rebuilt each request lifecycle.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|
| `manage_network` | Network admin | Most WPDev WaaS Examples admin pages |
| `manage_options` | Site admin | Site-admin bound contexts/components |
| Module-specific custom caps (e.g. `wpdev_edit_*`) | Network/admin depending on page | Page-class and action-level gating |

## Registration and menu context

`core/setup.php` initializes autoloaders, registers the `core` module with `Module_Loader::register`, and loads all modules on `plugins_loaded`. It provides page rebinding helpers (`wpdev_register_admin_page`) used by playground parity and alternate menu/context scenarios (`parent`/`context` overrides).

## Playground

Dev-only (requires the **wpdev-playground** plugin). Template: [`docs/modularization/API_DOC_TEMPLATE.md`](../../docs/modularization/API_DOC_TEMPLATE.md).

The **core** framework module does not register a dedicated sandbox submenu (`wpdev-pg-core` was removed). Playground infrastructure (loader, landing page, parity registry, ajax demos) is owned by the **wpdev-playground** plugin under `includes/playground/`; **`wpdev-playground/wpdev-playground.php`** boots `Playground_Loader::init()` when that plugin is loaded.

| | |
|--|--|
| **Mode** | Infrastructure only — no sandbox panel |
| **Ajax demo** | `wpdev_playground_register_core_ajax_demo()` on `wpdev_load` |
| **Production parity** | WaaS Examples + dashboard/settings modules register real admin page classes under `wpdev-playground` via `Playground_Parity_Registry` (filter `wpdev_playground_use_real_production_pages`, default on) |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## References

### Module-local examples

*(none — no `modules/core/examples/` samples for this module)*

### Playground (requires wpdev-playground plugin)

- Loader/runtime: `wpdev-playground/includes/playground/` (`class-playground-loader.php`, `class-playground-parity-registry.php`, `functions-playground.php`)
- Boot: `wpdev-playground/wpdev-playground.php` on `plugins_loaded` priority 4
- Panel discovery: `wpdev_playground_include_panels` → `playground-*/playground.php`
- Extra helpers: `wpdev-playground/playground-wpdev/functions-playground-wpdev.php` (WaaS list preview panels)
- No dedicated `wpdev-pg-core` sandbox panel

### WaaS examples (requires wpdev-examples plugin)

Production admin pages re-bind under `wpdev-playground` when both `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are defined (`Playground_Parity_Registry`, filter `wpdev_playground_use_real_production_pages`).

- `wpdev-examples/products/setup.php` — list/edit parity (`wpdev-products`)
- `wpdev-examples/dashboard/setup.php` — top-level dashboard parity
- `wpdev-examples/admin-setting-page-defaults/setup.php` — settings sections parity
- `wpdev-examples/customers/setup.php` — customer list/edit parity
- `wpdev-examples/checkout/setup.php` — checkout forms parity

### Usage snippets

- Load one module with dependencies: `wpdev_load_module( 'table-builder' );`
- Register lifecycle callback: `wpdev_on_load( static function () { /* ... */ } );`
- Re-register production page in alternate menu: `wpdev_register_admin_page( My_Page::class, $args );`

## Recipes

- Build new modules on top of the lifecycle contract (`wpdev_load`, `wpdev_admin_pages`, `wpdev_init`).
- Use core service registry helpers to expose/test module-local services.

## Migration

- 2.7.0 standardized lifecycle and registry helper APIs; prefer these facades over direct static registry mutations.
- Keep module bootstrap in `setup.php` and avoid ad-hoc bootstrap execution outside lifecycle hooks.
- Prefer `wpdev_register_*` facades over direct registry class access. See [`docs/modularization/api-contract.md`](../../docs/modularization/api-contract.md).

## Appendix

### Tour Guide Authoring (Complete)

The tour system lives in `core` and is available to all modules via `wpdev_create_tour()`.

#### Step payload contract

Each tour is an ordered array of step arrays. Common keys:

- `id` (required in practice)
- `title`
- `text` (`string` or `string[]`; arrays are converted to `<p>` blocks)
- `attachTo`:
  - `element` CSS selector
  - `on` placement (`top`, `bottom`, `left`, `right`, etc.)
- `buttons` (optional extra CTA buttons):
  - `text`
  - `classes`
  - `url`
  - `target` (optional, default `_blank`)

The runtime appends its own primary navigation button (`Next`/`Close`) per step.

#### Runtime details

- Scripts: `core/assets/js/lib/shepherd.js` and `core/assets/js/tours.js`.
- Tour payload is localized into `wpdev_tours` and started on document ready.
- Completion is recorded with AJAX action `wpdev_mark_tour_as_finished`.
- Nonce action: `wpdev_tour_finished`.

#### Completion and visibility rules

- Per-user completion key: `wpdev_tour_{id}` (user meta; legacy user-settings supported).
- Force disable all tours with setting `hide_tours`.
- Customize completion check with filter:
  - `wpdev_tour_finished`.

#### Recommended implementation checklist

1. Choose a stable tour id.
2. Register on an early hook/page callback (before header render).
3. Use resilient selectors in `attachTo.element`.
4. Keep text concise, use arrays for multi-paragraph guidance.
5. Use `$once = true` for onboarding, `false` for repeatable contextual help.
6. Validate capabilities/page conditions before creating the tour.

### Multi-instance

Register multiple items with distinct ids on `wpdev_load`. Duplicate ids without `$replace = true` trigger `_doing_it_wrong`.
