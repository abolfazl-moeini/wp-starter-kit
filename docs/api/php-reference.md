# PHP API reference (`WPDev\`)

> Complete reference for the `wpdev/framework` Composer package surface.
> Detailed usage examples for Support classes live in
> [php-core-libs.md](../php-core-libs.md).

## Table of contents

- [WPDev\Core\Plugin](#wpdevcoreplugin)
- [WPDev\Core\ModuleLoader](#wpdevcoremoduleloader)
- [WPDev\Core\ModuleInterface](#wpdevcoremoduleinterface)
- [WPDev\Core\AbstractModule](#wpdevcoreabstractmodule)
- [WPDev\Support\Rest](#wpdevsupportrest)
- [WPDev\Support\Queue](#wpdevsupportqueue)
- [WPDev\Support\Auth](#wpdevsupportauth)
- [WPDev\Support\Shortcodes](#wpdevsupportshortcodes)
- [WPDev\Support\Assets](#wpdevsupportassets)
- [WPDev\Adapters\WpdevModuleAdapter](#wpdevadapterswpdevmoduleadapter)

---

## `WPDev\Core\Plugin`

Static facade for the plugin bootstrap. Locates `project.config.json`,
holds the `ModuleLoader`, and fires `{$hook_prefix}_plugin_loaded`.

```php
final class Plugin
{
    public static function boot(?string $config_path = null): void;
    public static function instance(): ?self;
    public static function loader(): ModuleLoader;
    public static function config(?string $override_path = null): array;
    public static function is_booted(): bool;
    public static function last_loaded_hook(): ?string;
    public static function loaded_config(): array;
    public static function reset_for_tests(): void;
    public static function set_plugin_dir(?string $path): void;
    public static function on_plugins_loaded(): void;
}
```

| Method                | Parameters                       | Returns        | Purpose                                      |
| --------------------- | -------------------------------- | -------------- | -------------------------------------------- |
| `boot()`              | `$config_path` optional override | `void`         | Idempotent bootstrap; wires `plugins_loaded` |
| `instance()`          | —                                | `?Plugin`      | Test seam for booted singleton               |
| `loader()`            | —                                | `ModuleLoader` | Get/create module loader                     |
| `config()`            | `$override_path` optional        | `array`        | Read `project.config.json`                   |
| `is_booted()`         | —                                | `bool`         | Whether `boot()` ran                         |
| `last_loaded_hook()`  | —                                | `?string`      | Hook name fired at boot                      |
| `loaded_config()`     | —                                | `array`        | Cached config from last boot                 |
| `reset_for_tests()`   | —                                | `void`         | Clear all static state (tests only)          |
| `set_plugin_dir()`    | `$path` plugin root or null      | `void`         | Override config path resolution for Composer |
| `on_plugins_loaded()` | —                                | `void`         | Boot all modules; fires `_modules_loaded`    |

**Typical bootstrap:**

```php
\WPDev\Core\Plugin::set_plugin_dir(plugin_dir_path(__FILE__));
\WPDev\Core\Plugin::boot();
\WPDev\Core\Plugin::loader()->register(new \WPDev\Modules\ExampleFeature\Module());
```

---

## `WPDev\Core\ModuleLoader`

In-memory registry and boot orchestrator for `ModuleInterface` implementations.

```php
final class ModuleLoader
{
    public function __construct(string $hook_prefix);
    public function register(ModuleInterface $module): void;
    public function boot_all(): void;
    public function get(string $slug): ?ModuleInterface;
    public function has(string $slug): bool;
    public function all(): array;
}
```

| Method          | Parameters                 | Returns                          | Purpose                                  |
| --------------- | -------------------------- | -------------------------------- | ---------------------------------------- |
| `__construct()` | `$hook_prefix` from config | —                                | Namespace filter/action hooks            |
| `register()`    | `$module`                  | `void`                           | Add module by slug; throws on duplicate  |
| `boot_all()`    | —                          | `void`                           | Boot each module; fire `_modules_loaded` |
| `get()`         | `$slug`                    | `?ModuleInterface`               | Lookup by slug                           |
| `has()`         | `$slug`                    | `bool`                           | Whether slug is registered               |
| `all()`         | —                          | `array<string, ModuleInterface>` | Full module map                          |

**Hooks fired:**

- Filter: `{$hook_prefix}_module_loader` — decorate loader before boot
- Action: `{$hook_prefix}_modules_loaded` — after all modules boot

---

## `WPDev\Core\ModuleInterface`

Contract every feature module must implement.

```php
interface ModuleInterface
{
    public function boot(): void;
    public function get_slug(): string;
}
```

| Method       | Returns  | Purpose                                    |
| ------------ | -------- | ------------------------------------------ |
| `boot()`     | `void`   | Register hooks, REST routes, assets        |
| `get_slug()` | `string` | Stable lookup key (e.g. `example-feature`) |

---

## `WPDev\Core\AbstractModule`

Optional base with conditional boot gate.

```php
abstract class AbstractModule implements ModuleInterface
{
    public function should_boot(): bool;
}
```

| Method          | Returns | Purpose                                       |
| --------------- | ------- | --------------------------------------------- |
| `should_boot()` | `bool`  | Return `false` to skip boot (e.g. admin-only) |

---

## `WPDev\Support\Rest`

### `RestHandler` (abstract)

```php
abstract class RestHandler
{
    public const INTERNAL_ERROR_MESSAGE = 'Internal server error';

    abstract public function rest_handler(WP_REST_Request $request): WP_REST_Response;
    abstract public function rest_permission(): bool;
    abstract public function rest_end_point(): string;
    abstract public function methods(): string;

    final public function rest_response(WP_REST_Request $request): WP_REST_Response;
}
```

### `RestSetup` (final)

```php
final class RestSetup
{
    public static function register(string|RestHandler $handler): bool;
    public static function setup(): void;
    public static function rest_init(): void;
    public static function flush(): void;
    public static function routes(): array;
}
```

### `AllowBatch` (interface)

```php
interface AllowBatch
{
    public function allow_batch(): array;
}
```

### `BatchResponse` (final)

```php
final class BatchResponse
{
    public static function wrap(mixed $data, string $cacheKey): WP_REST_Response;
    public static function forCacheKey(mixed $data, string $cacheKey): WP_REST_Response;
}
```

---

## `WPDev\Support\Queue`

### `DeferredCall` (final)

```php
final class DeferredCall
{
    public static function queue(string $hook, array $data): bool;
    public static function can_queue(string $hook): bool;
    public static function get_stack(string $hook): array;
    public static function run_queue(...$args): void;
    public static function reset_for_tests(): void;
}
```

---

## `WPDev\Support\Auth`

### `CapabilityPolicy` (final)

```php
final class CapabilityPolicy
{
    public static function can(string $capability): bool;
    public static function rest_permission(string $capability): callable;
}
```

---

## `WPDev\Support\Shortcodes`

### `Shortcode` (abstract)

```php
abstract class Shortcode
{
    abstract public function render_shortcode(
        array $attributes,
        string $content,
        string $tag
    ): string;
}
```

### `ShortcodesSetup` (final)

```php
final class ShortcodesSetup
{
    public static function register(string $tag, string|Shortcode $handler): bool;
    public static function init(): void;
    public static function append_shortcodes(): void;
    public static function render_shortcode($attributes, $content, $tag): string;
    public static function flush(): void;
}
```

---

## `WPDev\Support\Assets`

```php
final class Assets
{
    public static function set_plugin_dir(?string $dir, ?string $url = null): void;
    public static function resolve_paths(): array;
    public static function asset_info(string $rel_path): array;
    public static function register_bundle_script(
        string $handle,
        string $rel_path,
        array $extra_deps = []
    ): bool;
    public static function enqueue_bundle_script(
        string $handle,
        string $rel_path = '',
        array $extra_deps = []
    ): bool;
    public static function enqueue_bundle_style(
        string $handle,
        string $rel_path,
        array $extra_deps = []
    ): bool;
    public static function get_localize_data(): array;
    public static function read_project_config(): array;
    public static function enqueue_legacy_bundle_script(string $abs_path, array $extra_deps = []): bool;
    public static function enqueue_legacy_bundle_style(string $abs_path, array $extra_deps = []): bool;
}
```

**`get_localize_data()` return shape:**

```php
[
    'api'   => ['url' => string, 'nonce' => string],
    'api_x' => ['url' => string, 'nonce' => string],
]
```

---

## `WPDev\Adapters\WpdevModuleAdapter`

Bridge between kit `ModuleInterface` and wpdev-framework lifecycle.

```php
final class WpdevModuleAdapter
{
    public function __construct(ModuleInterface $module);
    public function get_slug(): string;
    public function boot(): void;

    public static function is_framework_active(): bool;
    public static function attach(ModuleInterface $module): void;
}
```

| Method                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `is_framework_active()` | `true` when `wpdev_register_table()` exists            |
| `attach()`              | Register module on `wpdev_on_load` or boot immediately |

See [wpdev-adapter.md](../wpdev-adapter.md) for the companion-plugin model
and seam map.

---

## Namespace map

| Namespace         | Package path            | Role                                       |
| ----------------- | ----------------------- | ------------------------------------------ |
| `WPDev\Core\`     | `src/Core/`             | Plugin facade, module loader, contracts    |
| `WPDev\Support\`  | `src/Support/`          | REST, assets, shortcodes, queue, auth      |
| `WPDev\Adapters\` | `src/Adapters/`         | Framework integration bridges              |
| `WPDev\Modules\`  | Consumer `src/Modules/` | Feature modules (not in framework package) |
