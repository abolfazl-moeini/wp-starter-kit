# WordPress hooks reference (kit framework)

> Exhaustive inventory of **action and filter hooks fired by
> `wpdev/framework`** (`packages/framework/src/Core/`). This document lists
> only hooks found in source — no invented hook names.
>
> For general hook-prefix conventions and JS hooks, see [hooks.md](../hooks.md)
> and [js-hooks.md](../js-hooks.md).

## Table of contents

- [How `hookPrefix` is set](#how-hookprefix-is-set)
- [Hook naming pattern](#hook-naming-pattern)
- [Lifecycle overview](#lifecycle-overview)
- [`{hookPrefix}_plugin_loaded`](#hookprefix_plugin_loaded)
- [`{hookPrefix}_module_loader`](#hookprefix_module_loader)
- [`{hookPrefix}_modules_loaded`](#hookprefix_modules_loaded)
- [Hooks not fired by the framework](#hooks-not-fired-by-the-framework)
- [Registering modules before boot](#registering-modules-before-boot)
- [Testing hooks in PHPUnit](#testing-hooks-in-phpunit)
- [Related reading](#related-reading)

---

## How `hookPrefix` is set

The hook prefix comes from `project.config.json`:

```json
{
  "hookPrefix": "my-plugin"
}
```

During `Plugin::boot()`, the framework reads config and constructs hook names as
`{hookPrefix}_<event>`. For a prefix of `my-plugin`, the plugin-loaded hook is
`my-plugin_plugin_loaded`.

**Validation:** The scaffold enforces lowercase kebab-case for `hookPrefix`. When
`phpFramework:wpdev`, the prefix must not be `wpdev` (reserved for the admin
framework). See [features-reference.md](../features-reference.md#phpframework).

**Composer deployments:** Call `Plugin::set_plugin_dir()` before `boot()` so
config resolves from the consumer plugin root, not `vendor/wpdev/framework/`.

```php
\WPDev\Core\Plugin::set_plugin_dir( plugin_dir_path( __FILE__ ) );
\WPDev\Core\Plugin::boot();
```

---

## Hook naming pattern

| Pattern                       | Type   | Fired by                   |
| ----------------------------- | ------ | -------------------------- |
| `{hookPrefix}_plugin_loaded`  | action | `Plugin::boot()`           |
| `{hookPrefix}_module_loader`  | filter | `ModuleLoader::boot_all()` |
| `{hookPrefix}_modules_loaded` | action | `ModuleLoader::boot_all()` |

Replace `{hookPrefix}` with the value from `project.config.json`. There are
**three** framework hooks total in the current source tree.

---

## Lifecycle overview

```
Plugin::boot()
  ├─ read project.config.json → hookPrefix
  ├─ create ModuleLoader(hookPrefix) if none exists
  ├─ register plugins_loaded → on_plugins_loaded (priority 10)
  └─ do_action( {hookPrefix}_plugin_loaded )     ← immediate

WordPress plugins_loaded (later request phase)
  └─ Plugin::on_plugins_loaded()
       └─ ModuleLoader::boot_all()
            ├─ apply_filters( {hookPrefix}_module_loader, loader )
            ├─ foreach module: module->boot() (if should_boot())
            └─ do_action( {hookPrefix}_modules_loaded )
```

**Important:** `{hookPrefix}_plugin_loaded` fires during `boot()`, which is
typically called from the consumer's main plugin file. `{hookPrefix}_modules_loaded`
fires later on `plugins_loaded`, after every registered module has booted.

---

## `{hookPrefix}_plugin_loaded`

| Property   | Value                                            |
| ---------- | ------------------------------------------------ |
| **Type**   | Action                                           |
| **Source** | `packages/framework/src/Core/Plugin.php`         |
| **When**   | End of `Plugin::boot()`, after loader is created |
| **Params** | None                                             |

**Purpose:** Signal that the plugin facade is initialized and config is loaded.
Feature modules and third-party code can run setup that must happen before
`plugins_loaded` module boot (rare) or simply hook the earliest reliable moment
after config is available.

**Example**

```php
add_action( 'my-plugin_plugin_loaded', function () {
    // Config is readable via Plugin::config() after boot.
    $cfg = \WPDev\Core\Plugin::config();
    // Register modules on the loader before plugins_loaded fires.
    \WPDev\Core\Plugin::loader()->register( new \MyPlugin\Modules\Foo\Module() );
} );
```

**Notes**

- `boot()` is idempotent — a second call is a no-op; the action fires only once.
- In PHPUnit, `do_action` is shimmed; use `Plugin::last_loaded_hook()` to assert
  the hook name without spying on WordPress globals.

---

## `{hookPrefix}_module_loader`

| Property   | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| **Type**   | Filter                                                           |
| **Source** | `packages/framework/src/Core/ModuleLoader.php`                   |
| **When**   | Start of `ModuleLoader::boot_all()`, before any `module->boot()` |
| **Params** | `$loader` — `ModuleLoader` instance                              |
| **Return** | `ModuleLoader` instance (same or replacement)                    |

**Purpose:** Allow third-party code to swap or decorate the loader (and its
registered module map) immediately before modules boot.

**Example**

```php
add_filter( 'my-plugin_module_loader', function ( $loader ) {
    if ( $loader instanceof \WPDev\Core\ModuleLoader ) {
        $loader->register( new \MyPlugin\Modules\Injected\Module() );
    }
    return $loader;
} );
```

**Implementation detail:** The filter receives the `ModuleLoader` object. If the
filtered value is another `ModuleLoader` instance, `boot_all()` uses that
instance's internal module map. If the filtered value is not a `ModuleLoader`,
the original map is used unchanged.

**Non-WordPress environments:** When `apply_filters()` is unavailable (CLI, unit
tests), the filter is skipped silently.

---

## `{hookPrefix}_modules_loaded`

| Property   | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| **Type**   | Action                                                           |
| **Source** | `packages/framework/src/Core/ModuleLoader.php`                   |
| **When**   | End of `ModuleLoader::boot_all()`, after every module's `boot()` |
| **Params** | None                                                             |

**Purpose:** Run code after all feature modules have registered their WordPress
hooks, REST routes, assets, and shortcodes.

**Example**

```php
add_action( 'my-plugin_modules_loaded', function () {
    // Safe to assume ExampleFeature (and siblings) have registered routes.
    do_action( 'my-plugin_after_all_modules' ); // your own extension hook
} );
```

**Module `should_boot()`:** Modules implementing `should_boot()` returning
`false` are skipped; `{hookPrefix}_modules_loaded` still fires after the
remaining modules boot.

**Non-WordPress environments:** When `do_action()` is unavailable, the action is
skipped silently.

---

## Hooks not fired by the framework

The following hook names **do not appear** in `packages/framework/src/` and are
**not documented** here:

- `{hookPrefix}_rest_init`
- `{hookPrefix}_enqueue_assets`
- Any hook in `Support/Rest/RestSetup.php` (no `do_action` / `apply_filters`)
- Any hook in `Support/Assets.php` (no `do_action` / `apply_filters`)
- Any hook in `src/Modules/ExampleFeature/Module.php` (no `do_action` /
  `apply_filters` in the kit's example module)

Consumer modules may define their own prefixed hooks; those belong in module
documentation, not this framework reference.

---

## Registering modules before boot

Recommended bootstrap order for consumer plugins:

```php
// 1. Anchor config resolution (Composer installs).
\WPDev\Core\Plugin::set_plugin_dir( plugin_dir_path( __FILE__ ) );

// 2. Register modules BEFORE boot so they are not dropped.
\WPDev\Core\Plugin::loader()->register( new \MyPlugin\Modules\Example\Module() );

// 3. Boot — fires {hookPrefix}_plugin_loaded, wires plugins_loaded.
\WPDev\Core\Plugin::boot();
```

`Plugin::boot()` preserves a loader created before boot. Replacing the loader
after modules were registered would drop registrations.

---

## Testing hooks in PHPUnit

The kit's PHPUnit bootstrap provides `add_action`, `do_action`, and
`apply_filters` shims. Useful test seams on `Plugin`:

| Method               | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `last_loaded_hook()` | Assert `{hookPrefix}_plugin_loaded` name |
| `is_booted()`        | Whether `boot()` completed               |
| `loaded_config()`    | Config array from last boot              |
| `reset_for_tests()`  | Clear static state between tests         |

Example assertion:

```php
\WPDev\Core\Plugin::set_plugin_dir( $fixture_dir );
\WPDev\Core\Plugin::boot();
$this->assertSame( 'test-plugin_plugin_loaded', \WPDev\Core\Plugin::last_loaded_hook() );
```

---

## Related reading

- [hooks.md](../hooks.md) — hook prefix convention (PHP + JS overview)
- [js-hooks.md](../js-hooks.md) — JavaScript hook inventory (`@wpdev/hooks`)
- [modules.md](../modules.md) — `ModuleInterface` and `ModuleLoader` usage
- [plugin-bootstrap.md](../plugin-bootstrap.md) — main plugin file wiring
- [api/php-reference.md](php-reference.md) — `Plugin` and `ModuleLoader` methods
