# Modules (`ModuleInterface` + `ModuleLoader`)

> The plugin is the shell, modules are the features. Every
> pluggable piece of a wp-starter-kit project is a small
> `ModuleInterface` implementation that the `ModuleLoader`
> registry discovers, orders, and boots — and a feature is just
> a directory under `src/Modules/` that hands a class to the
> loader.

## The contract: `ModuleInterface`

```php
namespace WPSK\Core;

interface ModuleInterface
{
    public function boot(): void;
    public function get_slug(): string;
}
```

Two methods, no dependencies on WordPress. The contract is
deliberately small so a module can be unit-tested in
isolation:

- **`get_slug(): string`** — the unique key under which the
  module is registered. Slugs must be **stable across versions**
  because they are part of the public contract (a third-party
  plugin can look a module up by slug). The slug is also the
  prefix for any module-local hooks / options the module
  registers.

- **`boot(): void`** — the entry point the loader calls exactly
  once per `boot_all()` invocation. Implementations should be
  **idempotent at the call-site level** — the loader does not
  promise to invoke `boot()` only once. If `boot_all()` is
  called twice, `boot()` runs twice. Long-lived processes
  (workers, the test runner) routinely do this.

The interface lives at `src/Core/ModuleInterface.php` and is
emitted by `@wpsk/create-wp-project` so a fresh project has it
on day one. The interface is owned by the starter; do not
hand-edit it.

### What goes inside `boot()`

Anything that needs to run when the plugin comes up. Common
patterns:

- `add_action( 'init', [ $this, 'register' ] );`
- `add_filter( 'my_project/transform', [ $this, 'apply' ] );`
- `register_rest_route( 'my-project/v1', '/items', [...] );`
- `register_post_type( 'my-project-item', [...] );`
- `wp_enqueue_script( ... )` from a `wp_enqueue_scripts`
  callback.

**WordPress integration happens inside `boot()`, not on the
contract.** The interface itself never imports `add_action` or
any other WP function, so a module that only does PHP work
(registering a post type, computing a derived value) can be
unit-tested without a WordPress runtime. Modules that touch
hooks add WP integration inside `boot()` and use the project's
test seaming helpers (see
[php-test-tools.md](php-test-tools.md#test-seams-for-wordpress-hooks))
to assert the registration.

## The registry: `ModuleLoader`

```php
namespace WPSK\Core;

final class ModuleLoader
{
    public function __construct(string $hookPrefix);
    public function register(ModuleInterface $module): void;
    public function boot_all(): void;
    public function get(string $slug): ?ModuleInterface;
    public function has(string $slug): bool;
    public function all(): array;
}
```

The loader is a small in-memory registry. Methods:

- **`register(ModuleInterface $module): void`** — store the
  module under its slug. Throws `InvalidArgumentException` if
  the slug is empty or already registered. The exception is
  deliberate: a duplicate slug is almost always a programming
  error (two modules trying to claim the same key), and a
  silent override would mask the bug.

- **`boot_all(): void`** — call `boot()` on every registered
  module, in registration order. Then fire
  `{$hookPrefix}_modules_loaded` so third-party code can react.
  This method is **lazy by design**: nothing happens at
  `register()` time, so module side effects are kept out of
  the autoloader / files-load phase.

- **`get(string $slug): ?ModuleInterface`** — look up a
  registered module by slug, or `null` if unknown.

- **`has(string $slug): bool`** — boolean check.

- **`all(): array`** — the full module map keyed by slug, in
  registration order.

The loader keeps the module map in registration order — PHP
arrays are ordered, so `foreach` iterates in the order modules
were registered. There is **no priority system** at the module
level: the loader only knows about a single boot phase. If two
modules need to coordinate, they should depend on each other
explicitly (e.g. module B's `boot()` reads option that module
A's `boot()` wrote) or use a WordPress action with a numeric
priority inside their own hooks.

## The facade: `Plugin`

`WPSK\Core\Plugin` is a **static facade** that ties the loader
to WordPress's plugin lifecycle. The full source is in
`src/Core/Plugin.php`; the parts that matter for modules:

```php
final class Plugin
{
    public static function boot(?string $configPath = null): void;
    public static function loader(): ModuleLoader;
    public static function config(?string $overridePath = null): array;
    public static function on_plugins_loaded(): void;
    public static function is_booted(): bool;
    public static function last_loaded_hook(): ?string;
    public static function loaded_config(): array;
}
```

- **`boot()`** — the entry point the plugin file calls. Reads
  `project.config.json`, picks up `hookPrefix` (default `wpsk`),
  constructs the loader, and registers `on_plugins_loaded` on
  `plugins_loaded@10` and `init@10` so the boot survives the
  case where `plugins_loaded` has already fired (wp-cli, unit
  tests). After wiring it fires
  `{$hookPrefix}_plugin_loaded` so feature modules and
  third-party code can run after the plugin is up.

- **`loader()`** — return the singleton `ModuleLoader`,
  constructing it on demand if `boot()` has not run. Useful
  for code that needs to register a module _before_ `boot()`
  finishes.

- **`config()`** — read and return `project.config.json` as an
  associative array. The file is resolved relative to the
  _plugin_ root, never the active theme. This is the function
  to call when a module needs the project's branding (slug,
  hook prefix, text domain).

- **`on_plugins_loaded()`** — the WP-hook callback. Calls
  `boot_all()` on the loader.

- **`is_booted()`, `last_loaded_hook()`, `loaded_config()`** —
  test seams. Read-only accessors that let a unit test verify
  that `boot()` ran without spying on the global
  `add_action` / `do_action` (which are no-op shims in the
  project's test bootstrap).

The facade is **theme-agnostic**. A test
(`PluginTest::test_plugin_source_is_theme_agnostic`) asserts
that no `get_template_directory` or `load_theme_textdomain`
call appears in `src/Core/*.php`. The class anchors every path
it resolves to the plugin root, never the active theme
directory.

## The boot sequence

The end-to-end flow for a normal HTTP request:

```
1. WordPress loads my-project.php (the plugin file).
2. my-project.php defines constants and requires vendor/autoload.php.
3. my-project.php calls add_action('plugins_loaded', 'WPSK\\Core\\Plugin::boot').
4. WP continues loading other plugins.
5. WP fires plugins_loaded (priority 10).
6. WPSK\Core\Plugin::boot() runs:
     - reads project.config.json from the plugin root,
     - reads hookPrefix (e.g. "wpsk"),
     - constructs the ModuleLoader,
     - fires do_action('wpsk_plugin_loaded').
7. WPSK\Core\Plugin::on_plugins_loaded() runs (the plugins_loaded
   callback that boot() registered):
     - calls $loader->boot_all() — every registered module's
       boot() method runs, in registration order.
     - ModuleLoader applies the wpsk_module_loader filter
       (third-party swap/decorate hook).
     - ModuleLoader fires do_action('wpsk_modules_loaded').
8. WP fires init (priority 10) → on_plugins_loaded() runs a
   second time (the loader is idempotent — see "Lazy boot
   semantics" below).
```

Steps 6 and 7 are the parts a module author needs to
understand. The `wpsk_plugin_loaded` action in step 6 is the
right place to **register** a module (the loader is empty at
this point if you call it directly). The `wpsk_modules_loaded`
action in step 7 is the right place to **react** to a module
being up.

## Registering a module

The scaffold emits a sample `ExampleFeature` module at
`src/Modules/ExampleFeature/Module.php`:

```php
namespace Vendor\Modules\ExampleFeature;

use WPSK\Core\ModuleInterface;

final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function boot(): void
    {
        // Register your action/filter callbacks here. Keep the body
        // idempotent — the loader may call boot_all() more than
        // once in long-lived processes.
    }
}
```

A module is a single class. To add a real feature:

1. **Create the directory.** `src/Modules/MyFeature/Module.php`
   is the convention — `Module` is the class name; the
   directory is the feature's namespace.

2. **Pick a slug.** Short, kebab-case, stable across versions.
   The slug is the lookup key inside the loader and the prefix
   for any module-local storage. For a feature that adds a
   "newsletter" CPT, the slug is `newsletter` (or
   `cpt-newsletter` if there will be other CPT modules).

3. **Implement `get_slug()` and `boot()`.** See the
   `ExampleFeature` template above for the shape. Inside
   `boot()`, register your hooks, post types, REST routes.

4. **Register the module with the loader.** The most explicit
   place is in the plugin file (or a dedicated bootstrap
   module):

   ```php
   \WPSK\Core\Plugin::loader()->register(
       new \Vendor\Modules\MyFeature\Module()
   );
   ```

   The `loader()` call returns the singleton — calling
   `register()` on it twice with the same slug is a bug
   (the second call throws `InvalidArgumentException`).

5. **Test it.** Mirror the source path under `tests/phpunit/`
   (the project's PHPUnit suite auto-picks up the directory).
   `tests/phpunit/Modules/MyFeatureTest.php` should:
   - Construct the module and assert `get_slug()` returns
     the expected slug.
   - Construct a fresh `ModuleLoader` with the test prefix,
     `register()` the module, and assert
     `boot_all()` runs `boot()` exactly once.
   - For modules that touch WordPress, use the project's test
     seaming helpers (see
     [php-test-tools.md](php-test-tools.md#test-seams-for-wordpress-hooks))
     to assert the right `add_action` / `add_filter` calls.

### A worked example

A "newsletter" feature module that registers a custom post
type:

```php
// src/Modules/Newsletter/Module.php
namespace Vendor\Modules\Newsletter;

use WPSK\Core\ModuleInterface;

final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'newsletter';
    }

    public function boot(): void
    {
        \add_action( 'init', [ $this, 'register_post_type' ] );
    }

    public function register_post_type(): void
    {
        \register_post_type( 'newsletter', [
            'label'     => __( 'Newsletters', 'vendor' ),
            'public'    => true,
            'rewrite'   => [ 'slug' => 'newsletters' ],
            'supports'  => [ 'title', 'editor', 'thumbnail' ],
            'menu_icon' => 'dashicons-email-alt',
        ] );
    }
}
```

Registered in the plugin file:

```php
// my-project.php, after the autoloader is loaded
\WPSK\Core\Plugin::loader()->register(
    new \Vendor\Modules\Newsletter\Module()
);
```

Tested in `tests/phpunit/Modules/NewsletterTest.php`:

```php
public function test_newsletter_module_registers_post_type_on_init(): void
{
    $module = new \Vendor\Modules\Newsletter\Module();
    $this->assertSame('newsletter', $module->get_slug());

    $loader = new \WPSK\Core\ModuleLoader('vendor');
    $loader->register($module);
    $loader->boot_all();

    // The test bootstrap records add_action calls. Assert the
    // module subscribed to 'init' with the expected callback.
    $this->assertArrayHasKey('init', $GLOBALS['wp_test_actions']);
    // … etc.
}
```

The hook prefix in the test (`vendor` here) doesn't have to
match the production prefix — the loader only uses it for
the filter and action name it fires at the end of `boot_all()`,
neither of which matters for this assertion.

## Lazy boot semantics

Three rules govern when `boot()` runs:

1. **`register()` does not boot.** The loader is a registry,
   not a runner. A test can register a hundred modules and
   none of them run until `boot_all()` is called.

2. **`boot_all()` is allowed to be called more than once.**
   The contract is that `boot()` will be called once per
   `boot_all()` invocation. A test asserts this directly:
   `ModuleLoaderTest::test_boot_all_is_idempotent` registers
   one module, calls `boot_all()` twice, and asserts the boot
   log has two entries (one per call).

3. **Modules are responsible for their own idempotency.** The
   loader does not dedupe. A common pattern inside `boot()`:

   ```php
   public function boot(): void
   {
       if (did_action('vendor_newsletter_booted')) {
           return;
       }
       \add_action('init', [$this, 'register_post_type']);
       \do_action('vendor_newsletter_booted');
   }
   ```

   The first call sets the action flag; subsequent calls see
   it and return. This pattern survives both
   `plugins_loaded`-then-`init` double-fire and
   `boot_all()`-then-`boot_all()` double-call.

The lazy-by-design rule is what keeps module side effects out
of the autoloader / files-load phase. The WP plugin file
performs file-system work (defining constants, requiring
`vendor/autoload.php`); modules are pure registration code.
Side effects only happen when `boot_all()` runs.

## Extensibility hooks

The loader fires two WordPress hooks, both named after the
`hookPrefix` from `project.config.json`:

### `{$hookPrefix}_module_loader` (filter)

Fired by `boot_all()` _before_ iterating the modules:

```php
$filtered = \apply_filters(
    $this->hookPrefix . '_module_loader',
    $this    // the loader instance
);
```

A third-party plugin can use this to swap or decorate the
loader:

```php
add_filter( 'wpsk_module_loader', function ( $loader ) {
    // Example: drop a module that the site owner has disabled.
    $loader->unregister( 'newsletter' );
    return $loader;
} );
```

The filter is a no-op in non-WordPress environments (CLI,
unit tests) — the loader falls through to its in-memory
state when `apply_filters` is not a function. This is what
makes the loader testable without a real WP runtime.

### `{$hookPrefix}_modules_loaded` (action)

Fired by `boot_all()` _after_ iterating the modules:

```php
\do_action( $this->hookPrefix . '_modules_loaded' );
```

This is the hook third-party code should use to react to
"the plugin is up and every registered module is booted".
A common use: cache priming, scheduled-event registration,
or sending a heartbeat to an external service.

### Adding a new extensibility hook

If you need a hook the loader doesn't already fire:

1. Add the call inside the relevant method on `ModuleLoader`
   or `Plugin`. Wrap it in a `function_exists` check so
   non-WordPress environments don't fatal.
2. Add a test in `tests/phpunit/Core/ModuleLoaderTest.php`
   (or `PluginTest.php`) that asserts the new hook fires.
3. Document the hook here. Use the `{$hookPrefix}_*`
   namespace — see [hooks.md](hooks.md#the-contract).

## Module discovery at scale

A typical project will have 3–10 modules. The convention is:

- One module per _feature_, not per file. A "newsletter"
  feature may register a CPT, a taxonomy, a REST endpoint,
  and a block — all in one module.
- Cross-cutting code (helpers, REST plumbing) goes in
  `src/Support/` and is autoloaded, not registered as a
  module. See [architecture.md](architecture.md#what-goes-where).
- Third-party code that wants to extend the plugin uses the
  `{$hookPrefix}_module_loader` filter or registers its own
  module via `Plugin::loader()`.

For projects that need 20+ modules, group them by surface
(`src/Modules/Admin/`, `src/Modules/Frontend/`,
`src/Modules/REST/`) and have one bootstrap module per group
that registers the sub-modules. The loader does not enforce a
hierarchy; the directory layout is just for humans.

## Test surface

The contract is locked in by `tests/phpunit/Core/`:

- `ModuleInterfaceTest.php` — the interface itself (just
  shape: the two methods exist, the signatures match).
- `ModuleLoaderTest.php` — 8 tests covering `register`,
  duplicate-slug rejection, lazy `boot_all`, registration-
  order iteration, `get`/`has`/`all` lookups, and
  idempotency.
- `PluginTest.php` — 6 tests covering `config` parsing,
  `config` error path, `loader()` return, `boot()` /
  `is_booted()` / `last_loaded_hook()`, `loaded_config()`,
  and a theme-agnostic guard that scans `src/Core/*.php`.

The module-level tests live next to the modules themselves
under `tests/phpunit/Modules/`.

```bash
./vendor/bin/phpunit --filter ModuleInterfaceTest
./vendor/bin/phpunit --filter ModuleLoaderTest
./vendor/bin/phpunit --filter PluginTest
```

A green run on all three is the canonical proof that the
core module system is wired correctly.

## Related docs

- [plugin-bootstrap.md](plugin-bootstrap.md) — the `{slug}.php`
  file that calls `WPSK\Core\Plugin::boot()` and wires the
  loader into WordPress.
- [architecture.md](architecture.md) — the big picture, the
  three rings, and the "what goes where" decision tree.
- [hooks.md](hooks.md) — the `hookPrefix` namespace that
  the loader's `{$hookPrefix}_module_loader` and
  `{$hookPrefix}_modules_loaded` hooks use.
- [php-test-tools.md](php-test-tools.md) — the test seams
  for `add_action` / `apply_filters` that module tests rely
  on.
