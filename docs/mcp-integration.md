# MCP integration (WordPress Abilities API)

> Feature-gated bridge between consumer plugins and the WordPress Abilities API.
> Enables AI agents (via a separate MCP Adapter plugin) to call registered
> abilities as tools. Full package README:
> [packages/mcp-integration/README.md](../packages/mcp-integration/README.md).

## Table of contents

- [Overview](#overview)
- [Feature flag](#feature-flag)
- [Requirements](#requirements)
- [What gets scaffolded](#what-gets-scaffolded)
- [Architecture](#architecture)
- [Standalone Composer usage](#standalone-composer-usage)
- [Writing an ability](#writing-an-ability)
- [Hard rules](#hard-rules)
- [Runtime behavior](#runtime-behavior)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [See also](#see-also)

---

## Overview

`wpdev/mcp-integration` is a **Composer library**, not an MCP server. It:

1. Registers **abilities** as PHP objects on `wp_abilities_api_init`.
2. Exposes a small module loader (`WPDev\MCP\Core\Plugin`) parallel to the main
   `WPDev\Core\Plugin` facade.
3. Leaves transport, HTTP, and MCP protocol handling to external adapter plugins.

The kit scaffolds a `McpAbilities` module when `mcpAbilities:on` is selected at
create time or added later with `wpdev add mcpAbilities`.

---

## Feature flag

| Property      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Feature id    | `mcpAbilities`                                         |
| Variants      | `off` _(default)_, `on`                                |
| CLI           | `wpdev add mcpAbilities` / `wpdev remove mcpAbilities` |
| Catalog label | MCP Abilities                                          |

See [features-reference.md](features-reference.md#mcpabilities--mcp-abilities).

---

## Requirements

| Requirement | Version / note                                                         |
| ----------- | ---------------------------------------------------------------------- |
| PHP         | ≥ 7.4 (package); consumer `phpMinVersion` may be higher                |
| WordPress   | **6.9+** with Abilities API (`function_exists('wp_register_ability')`) |
| Composer    | `wpdev/mcp-integration` (path repo in kit; Packagist when published)   |

When the API is missing at runtime, the generated plugin shows an **admin notice**
and registers nothing — no fatal errors.

---

## What gets scaffolded

Generator owned paths (`mcpAbilities` feature):

- `src/Mcp/**` — ability registry bootstrap
- `src/Modules/McpAbilities/**` — example module wiring
- Ability registration entry file (see generator `REGISTER_FILE`)

The module integrates with the consumer's existing `ModuleLoader` registration
pattern in the main plugin bootstrap.

---

## Architecture

```
Consumer plugin
  ├─ WPDev\Core\Plugin (main framework)
  │    └─ Modules (ExampleFeature, …)
  └─ WPDev\MCP\Core\Plugin (abilities subsystem)
       └─ Modules\ExampleAbilities\Module
            └─ AbilityRegistry → wp_register_ability()
```

**MCP Adapter** (external, not part of this kit) reads registered abilities and
maps them to MCP tools. This kit does **not** guess or hardcode MCP tool names.

---

## Standalone Composer usage

Outside a full scaffold, require the package directly:

```bash
composer require wpdev/mcp-integration
```

Bootstrap in the main plugin file:

```php
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Modules\ExampleAbilities\Module;

Plugin::loader()->register( new Module() );
Plugin::boot( array(
    'namespace' => 'my-plugin',
    'hookPrefix'  => 'my_plugin_mcp',
) );
```

| Config key   | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `namespace`  | Ability name prefix (`my-plugin/get-posts`)    |
| `hookPrefix` | Internal `{prefix}_modules_loaded` style hooks |

Access namespace at runtime: `Plugin::ability_namespace()`.

---

## Writing an ability

1. Extend `AbstractAbility`.
2. Implement:
   - `get_name()`, `get_label()`, `get_description()`
   - `get_input_schema()`, `execute()`, `check_permission()`
   - Optionally `get_output_schema()` (defaults to omitted)
3. Register in module `boot()`:

```php
AbilityRegistry::instance()->register( new MyAbility() );
```

Use `SchemaBuilder` for JSON schemas and `CapabilityPolicy::can()` for
permission checks — same patterns as main framework REST handlers.

---

## Hard rules

| Rule                                         | Rationale                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Register only inside `wp_abilities_api_init` | WordPress API contract; handled by `AbilityRegistry`                                               |
| Least-privilege in `check_permission()`      | Never hardcode `true` for write abilities                                                          |
| Only six registration fields allowed         | `label`, `description`, `input_schema`, `output_schema`, `execute_callback`, `permission_callback` |
| Do not invent MCP tool names                 | Only set registration name `namespace/ability-name`                                                |

Full product requirements: `packages/mcp-integration/context.md`.

---

## Runtime behavior

| WP version            | Behavior                                          |
| --------------------- | ------------------------------------------------- |
| ≥ 6.9 with API        | Abilities registered on `wp_abilities_api_init`   |
| < 6.9 or API disabled | Admin notice; zero registrations                  |
| MCP Adapter absent    | Abilities still registered in WP; no MCP exposure |

Validation at scaffold time emits a **warning** (non-blocking). See
[features-reference.md](features-reference.md#warnings-non-blocking).

---

## Testing

From the package directory:

```bash
cd packages/mcp-integration
composer install && composer test
```

Tests use WordPress function shims in `tests/bootstrap.php` — no full WP install
required.

Kit-level tests: `tests/packages/mcp-integration.test.js` (generator wiring).

---

## Troubleshooting

| Symptom                                    | Fix                                                         |
| ------------------------------------------ | ----------------------------------------------------------- |
| Admin notice "Abilities API not available" | Upgrade to WordPress 6.9+                                   |
| Abilities not visible to MCP               | Install/configure MCP Adapter plugin separately             |
| Permission denied on execute               | Fix `check_permission()` cap; test as correct user role     |
| Scaffold validation warning                | Expected on WP < 6.9 hosts — acknowledge or disable feature |

More: [troubleshooting.md](troubleshooting.md#mcp-abilities-not-registered).

---

## See also

- [features-reference.md](features-reference.md) — `mcpAbilities` feature
- [packages/mcp-integration/README.md](../packages/mcp-integration/README.md) — package README
- [modules.md](modules.md) — consumer module pattern
- [api/php-reference.md](api/php-reference.md) — `CapabilityPolicy`
