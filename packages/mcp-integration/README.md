# wpdev/mcp-integration

A self-contained Composer library that registers **WordPress Abilities API** abilities as PHP objects. A separate **MCP Adapter** plugin later exposes those abilities to AI agents as MCP tools. This library does **not** implement MCP servers, transports, or HTTP endpoints.

## Requirements

- **PHP** ≥ 7.4
- **WordPress** 6.9+ with the Abilities API enabled at runtime (checked via `function_exists('wp_register_ability')`)

## Install

```bash
composer require wpdev/mcp-integration
```

## Standalone usage

```php
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Modules\ExampleAbilities\Module;

// In your plugin's main file:
Plugin::loader()->register(new Module());
Plugin::boot(['namespace' => 'my-plugin', 'hookPrefix' => 'my_plugin_mcp']);
```

The `namespace` config key sets the ability registration prefix (e.g. `my-plugin/get-posts`). The optional `hookPrefix` sets the internal action prefix for `_modules_loaded`. Access namespace at runtime via `Plugin::ability_namespace()`.

## Writing your own ability

1. Extend `AbstractAbility`.
2. Implement `get_name()`, `get_label()`, `get_description()`, `get_input_schema()`, `execute()`, and `check_permission()`.
3. Optionally override `get_output_schema()` (defaults to omitted).
4. Register it inside a module's `boot()`:

```php
AbilityRegistry::instance()->register(new MyAbility());
```

Use `SchemaBuilder` to build object schemas and `CapabilityPolicy::can()` for permission checks.

## Hard rules

- Register abilities **only** inside the `wp_abilities_api_init` hook (handled by `AbilityRegistry`).
- Use least-privilege **capability checks** in `check_permission()` — never hardcode `true` for write abilities.
- Only use the six allowed registration fields: `label`, `description`, `input_schema`, `output_schema`, `execute_callback`, `permission_callback`.
- Do not guess or hardcode MCP tool names — only set the registration name `namespace/ability-name`.

See `context.md` in this package for the full product requirements and agent rules.

## Tests

```bash
composer install && composer test
```

Tests run without WordPress installed using function shims in `tests/bootstrap.php`.
