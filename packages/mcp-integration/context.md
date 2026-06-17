# MCP Integration — Context for AI Agents

> Reference document for agents working inside `wp-starter-kit/packages/mcp-integration/`.

This file consolidates the essential rules and decisions from the original planning documents (`idea.md`, `plan.v1.md`, `integrate.md`) that lived in the parent `wp-mcp-integration/` folder. Treat this as the primary source of truth when editing the package.

---

## 1. Product Goal and Scope

**Register WordPress Abilities API abilities only.** This library does **not** implement MCP servers, transports, or HTTP endpoints.

Definitions:

- **Ability** — a unit of plugin functionality with a registration name, label, description, input/output schemas, execute callback, and permission callback.
- **Abilities API** — WordPress feature (6.9+) exposed via `wp_register_ability()`.
- **MCP Adapter** — a **separate** plugin that automatically exposes registered abilities as MCP tools. This library never talks to MCP directly.

Rules:

- Abilities are registered from a **plugin**, never from a theme.
- Only set the **registration name** (`namespace/ability-name`). MCP clients see a different sanitized tool name — never hardcode or assume it.
- The library is **standalone**: no runtime dependency on `wpsk/framework` or WordPress as a Composer package.

---

## 2. Hard Requirements (WordPress runtime)

1. WordPress **6.9 or higher** is required at runtime (Abilities API).
2. `wp_register_ability()` must exist. If it does **not**:
   - Do **not** call it.
   - Queue an `admin_notices` message via `MissingApiNotice::queue()`.
   - `return` early from registration.
3. Abilities MUST be registered **only** inside the `wp_abilities_api_init` action hook — never at file load time.
4. Only these six registration fields are allowed: `label`, `description`, `input_schema`, `output_schema`, `execute_callback`, `permission_callback`.
5. `output_schema` is optional — omit it when empty (`AbstractAbility::to_args()` handles this).

---

## 3. Registration Pattern

The canonical WordPress registration (enforced by `AbilityRegistry`):

```php
add_action('wp_abilities_api_init', function () {
    if (!function_exists('wp_register_ability')) {
        return;
    }
    wp_register_ability('my-plugin/my-ability', [
        'label'               => 'My Ability',
        'description'         => 'Clear description.',
        'input_schema'        => [ /* object schema preferred */ ],
        'output_schema'       => [ /* optional */ ],
        'execute_callback'    => [$ability, 'execute'],
        'permission_callback' => [$ability, 'check_permission'],
    ]);
});
```

In this library, modules add `AbilityInterface` instances to `AbilityRegistry`; the registry performs the hook wiring and `wp_register_ability()` calls in `register_all()`.

---

## 4. Schema Rules

Prefer **object schemas** for `input_schema` and `output_schema`:

```php
[
    'type'       => 'object',
    'properties' => [
        'title'   => ['type' => 'string'],
        'count'   => ['type' => 'number'],
        'publish' => ['type' => 'boolean'],
    ],
    'required'   => ['title'],
]
```

Allowed property types: `string`, `number`, `boolean`, `array`, `object`. Use `SchemaBuilder` to enforce this in one place.

---

## 5. Permission and Execute Callbacks

**Permission** (`check_permission()`):

- MUST return a boolean.
- Use least-privilege WordPress capability checks via `CapabilityPolicy::can()`.
- Read-only: `read`. Edit: `edit_posts`. Publish: `publish_posts`. Admin: `manage_options`.
- Never return hardcoded `true` for abilities that modify data.

**Execute** (`execute(array $input)`):

- Receives validated input.
- Sanitize all input before use.
- Return data matching `output_schema` when defined.
- Re-check stricter capabilities inside `execute()` when the permission callback cannot see input (e.g. publish flag).

---

## 6. Package Structure (do not deviate)

```
packages/mcp-integration/
├── composer.json              # wpdev/mcp-integration
├── phpunit.xml.dist
├── README.md
├── context.md                 # this file
├── src/
│   ├── Core/
│   │   ├── Plugin.php         # static facade; boots registry + modules
│   │   ├── ModuleInterface.php
│   │   └── ModuleLoader.php
│   ├── Abilities/
│   │   ├── AbilityInterface.php
│   │   ├── AbstractAbility.php
│   │   ├── AbilityRegistry.php   # ALL wp_register_ability() calls live here
│   │   └── SchemaBuilder.php
│   ├── Support/
│   │   ├── Auth/CapabilityPolicy.php
│   │   └── Admin/MissingApiNotice.php
│   └── Modules/
│       └── ExampleAbilities/
│           ├── Module.php
│           ├── GetPostsAbility.php    # read-only example
│           └── CreatePostAbility.php  # write/publish example
└── tests/                     # PHPUnit + WordPress function shims
```

- PSR-4: `WPDev\MCP\` → `src/`
- PHP ≥ 7.4 (Composer). WordPress 6.9+ is a **runtime** check only.
- Code style: PSR-12, 4-space indent, short `[]` arrays, `declare(strict_types=1);` in every file.
- Classes are **WordPress-optional**: guard every WP function with `function_exists()` (or use wrappers like `CapabilityPolicy`).

---

## 7. Public API / Boot Pattern

```php
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Modules\ExampleAbilities\Module;

Plugin::loader()->register(new Module());
Plugin::boot([
    'namespace'  => 'my-plugin',   // ability registration prefix
    'hookPrefix' => 'wpdev_mcp',    // optional; used for *_modules_loaded action
]);
```

`Plugin` API:

- `boot(array $config)` — idempotent; hooks `AbilityRegistry`, defers module boot to `plugins_loaded`.
- `loader(): ModuleLoader` — register ability modules before or after `boot()`.
- `config(): array` — merged defaults + overrides.
- `ability_namespace(): string` — the configured registration prefix (config key is `namespace`).
- `reset_for_tests(): void` — clears static state for PHPUnit.

Writing a custom ability:

1. Extend `AbstractAbility`.
2. Implement `get_name()`, `get_label()`, `get_description()`, `get_input_schema()`, `execute()`, `check_permission()`.
3. Optionally override `get_output_schema()` (default `[]` = omitted).
4. Register in a module's `boot()`: `AbilityRegistry::instance()->register(new MyAbility())`.
5. Ability names should use `Plugin::ability_namespace() . '/ability-slug'`.

---

## 8. Example Abilities

| Ability             | Name pattern              | Permission   | Notes                                                                  |
| ------------------- | ------------------------- | ------------ | ---------------------------------------------------------------------- |
| `GetPostsAbility`   | `{namespace}/get-posts`   | `read`       | Object input: `count`, `search`. Stub when `get_posts` absent.         |
| `CreatePostAbility` | `{namespace}/create-post` | `edit_posts` | Required `title`. Publish gated by `publish_posts` inside `execute()`. |

`ExampleAbilities\Module` only adds abilities to the registry — it never calls `wp_register_ability()` directly.

---

## 9. Rules for AI Agents

1. **grep `wp_register_ability`** — it must appear only in `AbilityRegistry::register_all()`.
2. Never register abilities outside `wp_abilities_api_init`.
3. Never skip the `function_exists('wp_register_ability')` check.
4. Never add fields beyond the six allowed registration keys.
5. Never implement MCP servers, transports, or HTTP endpoints.
6. Never add a Composer dependency on WordPress or `wpsk/framework`.
7. Use `Plugin::ability_namespace()` (not a method named `namespace()`).
8. When editing `src/`, the generator in `@wpsk/create-wp-project` picks up changes dynamically via `_mcp-template.js` (it walks `packages/mcp-integration/src/` at generation time).
9. Package tests: `composer test` inside this package (no WordPress installed).
10. Kit integration tests: `../../tests/packages/mcp-integration.test.js` — run from wp-starter-kit root with `npm test`.

---

## 10. wp-starter-kit Integration

### 10.1 Feature flag

```ts
mcpAbilities: "off" | "on"; // default: "off"
```

- PHP-only feature — valid with `js: "none"`. Not gated on JS pipeline.
- `validateFeatureSet()` emits a **warning** (not error) when `on`: WordPress 6.9+ required at runtime.
- CLI: `--mcp-abilities=on`, prompt _"WordPress Abilities API (MCP)?"_, `wpsk add mcp-abilities` / `wpsk remove mcp-abilities`.

### 10.2 Distribution — vendored copy (v1)

When `mcpAbilities=on`, the generator copies this package's `src/` into generated projects:

```text
generated-plugin/
├── composer.json                    # PSR-4: "WPDev\\MCP\\": "src/Mcp/"
├── src/
│   ├── Mcp/                         # vendored copy of packages/mcp-integration/src
│   ├── Modules/McpAbilities/
│   │   └── Module.php               # kit bridge (WPSK\Core\ModuleInterface)
│   └── mcp-abilities-register.php   # autoload files; plugins_loaded priority 5
```

- Bridge module boots `WPDev\MCP\Core\Plugin` with `namespace` = project `slug`.
- Bridge implements the **kit** `ModuleInterface`, not the library's — do not confuse the two.
- Generator `owns`: `src/Mcp/**`, `src/Modules/McpAbilities/**`, `src/mcp-abilities-register.php`.
- Generator logic lives in `packages/create-wp-project/src/generators/mcpAbilities.js` and `_mcp-template.js` — **not** in the CLI package.

### 10.3 Kit starter plugin

The wp-starter-kit itself wires the library via:

- `packages/mcp-integration/` — Composer path repo (`wpdev/mcp-integration`)
- `src/Modules/McpAbilities/Module.php` — bridge module
- `wpsk-starter.php` — registers bridge at `plugins_loaded`

---

## 11. Tests

**Package (PHPUnit):**

```bash
cd packages/mcp-integration && composer install && composer test
```

Bootstrap shims: `add_action`, `do_action`, `current_user_can`, `esc_html`, sanitizers. Do **not** define `wp_register_ability` globally — tests that need it define it locally.

Key assertions:

- `AbilityRegistry::boot()` hooks exactly one `wp_abilities_api_init` callback.
- API missing → admin notice queued, no registration.
- `to_args()` omits `output_schema` when empty.
- Example abilities use correct capabilities; names respect `Plugin::boot(['namespace' => ...])`.

**Kit (Jest):**

- Feature catalog includes `mcpAbilities`.
- Scaffold writes `src/Mcp/`, bridge module, composer autoload patch.
- Template drift guard: `_mcp-template.js` walks live `src/`.

---

## 12. Non-Goals

- MCP servers, transports, JSON-RPC, HTTP endpoints.
- Composer dependency mode in generated projects (future; v1 uses vendored copy).
- Hard-failing installer on WordPress version (warn only in v1).
- Theme support.
- Runtime dependency on the kit framework inside this library.

For historical phased implementation plans, the original documents were located in `../../wp-mcp-integration/` before being consolidated here.
