# PHP support libraries

wp-starter-kit reimplements useful `php-core-libs/` behavior under
`packages/framework/src/Support/` with no legacy private dependencies.
Every public class is namespaced under `WPDev\Support\` (or
`WPDev\Support\Rest\`, `WPDev\Support\Queue\`, etc.).

This document lists **signatures, parameters, return types, and usage**
for each public symbol. For a compact index grouped by namespace, see
[api/php-reference.md](api/php-reference.md).

---

## REST (`WPDev\Support\Rest\`)

### `RestHandler` (abstract)

Base class for class-based REST route handlers. Subclasses implement the
handler, permission check, endpoint segment, and HTTP methods. The final
`rest_response()` wrapper converts `Throwable` to safe error responses
(4xx messages pass through; 5xx are replaced with a generic string).

```php
abstract public function rest_handler(WP_REST_Request $request): WP_REST_Response;
abstract public function rest_permission(): bool;
abstract public function rest_end_point(): string;
abstract public function methods(): string;

final public function rest_response(WP_REST_Request $request): WP_REST_Response;
```

**Security:** Every route must implement `rest_permission()`. Never return
raw exception text on 5xx responses.

**Example:**

```php
final class ItemsController extends RestHandler
{
    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        return new WP_REST_Response(['items' => []]);
    }

    public function rest_permission(): bool
    {
        return CapabilityPolicy::can('edit_posts');
    }

    public function rest_end_point(): string { return 'items'; }
    public function methods(): string { return 'GET'; }
}
```

### `RestSetup` (final)

Central registration point. Reads `restNamespace` from
`project.config.json`. Auto-registers on `rest_api_init` when WordPress
is available.

```php
public static function register(string|RestHandler $handler): bool;
public static function setup(): void;
public static function rest_init(): void;
public static function flush(): void;
public static function routes(): array;
```

| Method        | Purpose                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `register()`  | Queue a handler class (or instance). Returns `false` if class missing or not a `RestHandler` subclass. |
| `setup()`     | Attach `rest_init` to `rest_api_init` at priority 20.                                                  |
| `rest_init()` | Instantiate each handler and call `register_rest_route()`.                                             |
| `flush()`     | Clear the route registry (tests).                                                                      |
| `routes()`    | Return registered class names.                                                                         |

**Example:**

```php
RestSetup::register(ItemsController::class);
// Routes appear at: /wp-json/{restNamespace}/items
```

### `AllowBatch` (interface)

Marker for handlers that opt into WordPress REST batch support.

```php
public function allow_batch(): array;  // e.g. ['v1' => true]
```

When implemented, `RestSetup` passes `'allow_batch' => $handler->allow_batch()`
to `register_rest_route()`. Pair with `@wpdev/rest-utils` batch client —
see [fetch-batch.md](fetch-batch.md).

### `BatchResponse` (final)

Wraps payloads for the JS batch client contract (`extra.cacheKey`).

```php
public static function wrap(mixed $data, string $cacheKey): WP_REST_Response;
public static function forCacheKey(mixed $data, string $cacheKey): WP_REST_Response;
```

**Example:**

```php
return BatchResponse::wrap(['items' => $rows], sanitize_text_field($cacheKey));
```

---

## Queue (`WPDev\Support\Queue\DeferredCall`)

Deferred hook callback queue. Refuses to queue after a hook has fired.
Supports priority changes and callable validation.

```php
public static function queue(string $hook, array $data): bool;
public static function can_queue(string $hook): bool;
public static function get_stack(string $hook): array;
public static function run_queue(...$args): void;
public static function reset_for_tests(): void;
```

**`$data` shape:**

| Key                 | Type       | Required | Purpose                            |
| ------------------- | ---------- | -------- | ---------------------------------- |
| `callback`          | `callable` | yes      | Function to invoke when hook fires |
| `params`            | `array`    | no       | Arguments passed to callback       |
| `merge_hook_params` | `bool`     | no       | Merge hook's own args into params  |
| `priority`          | `int`      | no       | `add_action` priority (default 10) |

**Example:**

```php
DeferredCall::queue('init', [
    'callback' => [$this, 'late_init'],
    'params'   => [],
    'priority' => 20,
]);
```

---

## Auth (`WPDev\Support\Auth\CapabilityPolicy`)

Thin wrappers around `current_user_can()` for REST permission reuse.

```php
public static function can(string $capability): bool;
public static function rest_permission(string $capability): callable;
```

**Security:** Always use the narrowest capability. `read` is granted to
every logged-in user — avoid it for mutating endpoints.

**Example:**

```php
register_rest_route($ns, '/items', [
    'permission_callback' => CapabilityPolicy::rest_permission('edit_posts'),
    // ...
]);
```

---

## Shortcodes (`WPDev\Support\Shortcodes\`)

### `Shortcode` (abstract)

```php
abstract public function render_shortcode(
    array $attributes,
    string $content,
    string $tag
): string;
```

Optional: implement `default_attributes(): array` for `shortcode_atts()`.

### `ShortcodesSetup` (final)

```php
public static function register(string $tag, string|Shortcode $handler): bool;
public static function init(): void;
public static function append_shortcodes(): void;
public static function render_shortcode($attributes, $content, $tag): string;
public static function flush(): void;
```

**Security:** Output is passed through `wp_kses_post()` in the base renderer.
Handlers should still escape user-supplied values.

**Example:**

```php
ShortcodesSetup::register('my_shortcode', MyShortcode::class);
```

---

## Assets (`WPDev\Support\Assets`)

Plugin-based asset loading (replaces theme-based `wpdev_*` helpers).
Composer consumers **must** call `set_plugin_dir()` before any asset method.

```php
public static function set_plugin_dir(?string $dir, ?string $url = null): void;
public static function resolve_paths(): array;
public static function asset_info(string $rel_path): array;
public static function register_bundle_script(string $handle, string $rel_path, array $extra_deps = []): bool;
public static function enqueue_bundle_script(string $handle, string $rel_path = '', array $extra_deps = []): bool;
public static function enqueue_bundle_style(string $handle, string $rel_path, array $extra_deps = []): bool;
public static function get_localize_data(): array;
public static function read_project_config(): array;
```

| Method                     | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `set_plugin_dir()`         | Set consumer plugin root path + URL (required for Composer layout) |
| `asset_info()`             | Read `.asset.php` sidecar (deps + hash)                            |
| `register_bundle_script()` | Register JS with sidecar deps + `wp_set_script_translations()`     |
| `enqueue_bundle_script()`  | Register (if path given) then enqueue                              |
| `enqueue_bundle_style()`   | Register + enqueue CSS bundle                                      |
| `get_localize_data()`      | Build `api` / `api_x` localize payload for `@wpdev/utils`          |

**Example:**

```php
Assets::set_plugin_dir(plugin_dir_path(__FILE__), plugins_url('', __FILE__));
Assets::enqueue_bundle_script(
    'my-admin',
    plugin_dir_path(__FILE__) . 'assets/bundles/MyModule-admin.js'
);
wp_localize_script('my-admin', 'MyProjectLoc', Assets::get_localize_data());
```

**Security:** `get_localize_data()` uses `sanitize_url()` on REST URLs and
`wp_create_nonce()` for nonces. Never hardcode nonces in JS source.

---

## See also

- [api/php-reference.md](api/php-reference.md) — full `WPDev\` namespace index
- [module-guide.md](module-guide.md) — using Support classes in a new module
- [localize-contract.md](localize-contract.md) — JS↔PHP localize shape
- [fetch-batch.md](fetch-batch.md) — batch client + `BatchResponse`
