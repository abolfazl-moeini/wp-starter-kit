# WPDev Framework Adapter

The `phpFramework: wpdev` feature integrates a generated plugin with the
WPDev Admin Framework using the **companion-plugin model**. The framework
runs as a separate WordPress plugin; your kit plugin registers modules
alongside it through a thin bridge class.

## Companion plugin model

When `phpFramework: wpdev` is enabled during `wpdev create` (or added
later with `wpdev add phpFramework`):

1. Framework files are copied into `companion-plugins/wpdev/` in the
   generated project (not embedded in your plugin's `vendor/` tree).
2. `FrameworkBridge.php` is scaffolded in your plugin root. It calls
   `WpdevModuleAdapter::attach()` for each kit module that should boot
   when the framework is active.
3. The user installs and activates **both** plugins in WordPress:
   - `companion-plugins/wpdev/wpdev.php` (the framework)
   - `<slug>/<slug>.php` (the kit plugin)
4. If the companion plugin is not active, framework-dependent modules
   no-op in `boot()` and the main plugin shows a non-fatal admin notice.
   Generated reference modules avoid extending framework classes at load
   time so autoloading stays fatal-free.

The companion layout keeps the framework upgrade path independent from
your plugin's Composer/npm dependencies. See
[framework-as-dependency.md](framework-as-dependency.md) for `distMode`
(`vendored` vs `deps`) and the 1.0.0 migration path.

## Prefix rules and collision validation

The WPDev framework **owns** the `wpdev` hook prefix and the `wpdev_`
PHP function prefix. Your project's branding prefixes must not collide:

| Reserved by framework          | Your project must use                          |
| ------------------------------ | ---------------------------------------------- |
| `hookPrefix = "wpdev"`         | Any other prefix (e.g. `my-plugin`)            |
| `phpFunctionPrefix = "wpdev_"` | Any other prefix ending in `_` (e.g. `myprj_`) |

The installer validates this during `wpdev create` (interactive mode
prompts for a new prefix; non-interactive mode fails fast). The rule
exists because the framework registers dozens of `wpdev_*` hooks and
functions; a colliding prefix would cause double-registration or
silent overrides.

## `WpdevModuleAdapter::attach()` contract

`WPDev\Adapters\WpdevModuleAdapter` wraps any kit `ModuleInterface`
and registers it with the framework lifecycle:

```php
use WPDev\Adapters\WpdevModuleAdapter;
use WPDev\Modules\MyFeature\Module;

WpdevModuleAdapter::attach(new Module());
```

### Attachment seam and hook ordering

1. **Framework active** — when `wpdev_register_table()` and
   `wpdev_on_load()` exist, `attach()` defers `Module::boot()` to the
   framework's `wpdev_on_load` hook. Kit modules boot **after** the
   framework has registered its admin builders, tables, and AJAX
   handlers.
2. **Framework inactive** — `attach()` calls `$module->boot()` immediately
   during the kit's own bootstrap. Modules that depend on framework APIs
   should guard with `WpdevModuleAdapter::is_framework_active()` inside
   `boot()`.
3. **Idempotent registration** — calling `attach()` twice for the same
   slug is a no-op (tracked in a static `$attached` map).

### `is_framework_active()`

Returns `true` when `wpdev_register_table()` is defined (a stable public
API marker). Use this in module `boot()` methods to skip framework-only
registration when the companion plugin is deactivated.

## Seam map

| Framework seam                   | Kit equivalent                               | Notes                                                    |
| -------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `modules/{name}/setup.php` entry | `ModuleInterface::boot()`                    | Kit modules are PHP classes, not `setup.php` files       |
| Module slug                      | `ModuleInterface::get_slug()`                | Stable across versions; used as lookup key               |
| `Module_Loader::load_all()`      | `WPDev\Core\ModuleLoader::boot_all()`        | Kit loader fires `{$hook_prefix}_modules_loaded`         |
| `wpdev_on_load` hook             | `WpdevModuleAdapter::attach()`               | Defers kit `boot()` until framework is ready             |
| Admin page builder               | Kit REST + `Assets::enqueue_bundle_script()` | Kit ships Preact admin bundles, not framework pages      |
| Table builder                    | Not bridged in v1                            | Use framework APIs directly from a wpdev-attached module |
| Form builder                     | Not bridged in v1                            | WDForm in `@wpdev/ui-components` is the kit path         |
| `wpdev_register_table()`         | Framework-only                               | Detected by `is_framework_active()`                      |
| Framework settings panel         | Framework-only                               | Kit modules add their own admin pages or REST endpoints  |

## Worked example: admin page via framework

This example registers a kit module that adds a framework admin page
when the companion plugin is active. It assumes `phpFramework: wpdev`
and a module slug `my-settings`.

```php
<?php
declare(strict_types=1);

namespace WPDev\Modules\MySettings;

use WPDev\Adapters\WpdevModuleAdapter;
use WPDev\Core\AbstractModule;

final class Module extends AbstractModule
{
    public function get_slug(): string
    {
        return 'my-settings';
    }

    public function boot(): void
    {
        if (!WpdevModuleAdapter::is_framework_active()) {
            return;
        }

        wpdev_on_load(function (): void {
            wpdev_register_admin_page([
                'slug'  => 'my-settings',
                'title' => __('My Settings', 'my-plugin'),
                'callback' => [$this, 'render_page'],
            ]);
        });
    }

    public function render_page(): void
    {
        echo '<div class="wrap"><h1>' . esc_html__('My Settings', 'my-plugin') . '</h1></div>';
    }
}
```

Register the module in your plugin bootstrap:

```php
// In {slug}.php after Plugin::boot():
\WPDev\Adapters\WpdevModuleAdapter::attach(new \WPDev\Modules\MySettings\Module());
```

## Framework bridge file

The generator scaffolds `FrameworkBridge.php` with `attach()` calls for
every module that opts into the wpdev integration (e.g. `WpdevDemo` when
`exampleFeature: on`). Edit this file when you add new modules that need
framework lifecycle ordering.

## Security notes

- Framework admin pages still require capability checks in callbacks.
- Kit REST handlers use `CapabilityPolicy::rest_permission()` — do not
  rely on the framework for authorization on kit-owned endpoints.
- Never use `wpdev` or `wpdev_` as your project's hook/function prefix.

## See also

- [framework-as-dependency.md](framework-as-dependency.md) — `distMode`,
  vendored vs Composer framework paths
- [modules.md](modules.md) — `ModuleInterface` contract
- [module-guide.md](module-guide.md) — building a kit module from scratch
- [api/php-reference.md](api/php-reference.md) — `WpdevModuleAdapter` API
