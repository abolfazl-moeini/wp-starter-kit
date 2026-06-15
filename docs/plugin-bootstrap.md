# Plugin Bootstrap (`{slug}.php`)

> How a wp-starter-kit project boots as a WordPress plugin — the
> file structure, the lifecycle hooks, the `ABSPATH` guard, the
> text-domain loading, and the migration timeline from a
> theme-style `functions.php` to a real plugin entry point.

## Plugin-first architecture

As of Phase 11, wp-starter-kit is **plugin-first**. Every new
project is a WordPress plugin, not a theme. The consequences:

- The plugin's primary entry point is `{slug}.php` at the plugin
  root, not a `functions.php` inside a theme.
- The `WPSK\Core\Plugin` static facade (see
  [modules.md](modules.md)) owns the boot sequence. Theme-style
  `after_setup_theme` wiring is kept only for backward
  compatibility and is scheduled to be removed.
- Translations live under `<plugin>/languages/`, not
  `<theme>/languages/`. The plugin is theme-agnostic — switching
  the active theme does not change the i18n surface.
- Capability / option / custom-table work happens in the plugin
  directory, anchored to `plugin_dir_path(__FILE__)` and friends.

The plugin headers, lifecycle hooks, and text-domain loading
are emitted by the scaffold from
`packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl`.
See [scaffold.md](scaffold.md#output) for the full file list.

## Plugin file structure

```
my-project/                      ← the wp-content/plugins/ root
├── my-project.php               ← the WordPress plugin file (this doc)
├── composer.json                ← PHP deps + PSR-4 (WPSK\\ + Vendor\\
│                                   + WPSK\TestTools\)
├── composer.lock
├── vendor/                      ← generated; gitignored
│   └── autoload.php
├── readme.txt                   ← WordPress.org readme
├── project.config.json          ← source of truth for branding
├── build.config.json            ← esbuild config (consumed by
│                                   core/packages/build)
├── tsconfig.json
├── package.json
├── package-lock.json
├── assets/                      ← copied verbatim by the build
│   ├── dependencies.js
│   ├── bundles/                 ← esbuild entry points
│   ├── stylesheets/
│   └── images/  fonts/  vendor/
├── core/                        ← the framework + your code
│   ├── components/              ← per-component JSX/JS+SCSS
│   ├── packages/                ← @wpsk/* JS workspaces
│   ├── assets/                  ← verbatim-copy source assets
│   ├── styles/                  ← global SCSS
│   └── php/                     ← PHP functions/classes
├── packages/                    ← standalone packages (CLI tools)
├── dev/                         ← developer scripts
├── src/                         ← the project's own PHP source
│   ├── Core/                    ← emitted by scaffold (Plugin,
│   │                               ModuleInterface, ModuleLoader)
│   └── Modules/                 ← your feature modules (see
│                                   [modules.md](modules.md))
├── includes/                    ← BC shims + helper functions
├── tests/                       ← mirrors core/ + packages/ + src/
└── docs/                        ← you are here
```

Three trees, three ownerships:

1. **`src/Core/*`** — emitted by the scaffold. The starter owns
   these files (and overwrites them on re-scaffold if you ask
   it to). Don't hand-edit; submit changes upstream.
2. **`src/Modules/*`** — yours. Add one sub-directory per feature
   module (see [modules.md](modules.md)).
3. **`core/**`and`core/php/**`** — yours-but-versioned. The
   framework code lives here (and is re-emitted on starter
   upgrade); the rest is yours to customise.

## The `{slug}.php` file, section by section

The scaffolded `{slug}.php` has six logical sections. Each is
tested by `tests/phpunit/PluginBootstrapTest.php`.

### 1. Plugin headers (WordPress.org requirement)

```php
/**
 * Plugin Name:       My Project
 * Plugin URI:        https://example.com/my-project
 * Description:       ...
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            ...
 * Author URI:        https://example.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       my-project
 * Domain Path:       /languages
 *
 * @package my-project
 */
```

Every field except `Plugin URI`, `Author URI`, and `Description`
is required by the WordPress.org plugin review. The text domain
comes from `project.config.json → textDomain`.

### 2. ABSPATH guard

```php
defined( 'ABSPATH' ) || exit;
```

The guard prevents the file from being opened directly in a
browser — a hard requirement from the WordPress.org plugin
review team. Without it, an attacker can request
`/wp-content/plugins/my-project/my-project.php` directly and
execute arbitrary PHP in the plugin's security context.

The check is intentionally strict: `defined()` then `|| exit;`,
no fallthrough path. `PluginBootstrapTest::test_template_contains_ABSPATH_guard`
rejects alternatives that use a `return` or a function call.

### 3. Plugin constants

```php
if ( ! defined( 'MY_PROJECT_VERSION' ) ) {
    define( 'MY_PROJECT_VERSION', '0.1.0' );
}
if ( ! defined( 'MY_PROJECT_PLUGIN_FILE' ) ) {
    define( 'MY_PROJECT_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'MY_PROJECT_PLUGIN_DIR' ) ) {
    define( 'MY_PROJECT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}
```

Three constants are emitted:

- `{slug_underscore}_VERSION` — the plugin's version, mirrored
  from the `Version:` header. Use it for cache-busting query
  strings and asset version arguments.
- `{slug_underscore}_PLUGIN_FILE` — the absolute path to
  `{slug}.php`. Pass to `register_activation_hook(__FILE__, ...)`
  and friends.
- `{slug_underscore}_PLUGIN_DIR` — `plugin_dir_path(__FILE__)`,
  the absolute directory the plugin lives in. Anchor every
  filesystem call here, never to the active theme.

The `defined()` guard is defensive: a second `require_once` of
the file (e.g. from a misbehaving mu-plugin) must not redefine
the constants and fatal.

### 4. Composer autoloader

```php
if ( ! file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    add_action( 'admin_notices', function (): void {
        echo '<div class="error"><p>' . esc_html__( 'My Project requires Composer. Run `composer install` in the plugin directory.', 'my-project' ) . '</p></div>';
    } );
    return;
}
require_once __DIR__ . '/vendor/autoload.php';
```

`vendor/autoload.php` is what makes `WPSK\Core\Plugin` and every
other class shipped by the kit reachable. If the autoloader is
missing (the user hasn't run `composer install`), we show an
admin notice and bail. The notice string is translatable
through the plugin's text domain.

The `return` is critical: without it, the rest of the file
runs against a partial namespace and WordPress dies with a
class-not-found. The file-existence check is the safety net;
the notice is the user-facing message.

### 5. Lifecycle: activation / deactivation / uninstall

```php
register_activation_hook(
    __FILE__,
    [ 'My_Project_on_activate', 'handle' ]
);
register_deactivation_hook(
    __FILE__,
    [ 'My_Project_on_deactivate', 'handle' ]
);
register_uninstall_hook(
    __FILE__,
    'my_project_on_uninstall'
);
```

Three hooks, three different shapes:

| Hook                         | Callable shape          | Why                                                                                                                                                                                    |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register_activation_hook`   | `[ 'Class', 'method' ]` | The autoloader is reachable here — full class callables are fine.                                                                                                                      |
| `register_deactivation_hook` | `[ 'Class', 'method' ]` | Same as activation.                                                                                                                                                                    |
| `register_uninstall_hook`    | `'function_name'` only  | Uninstall may run when the autoloader is **not** reachable (the plugin is being deleted), so WordPress rejects array callables. Use a plain function name or a `Class::method` string. |

The shape constraint is enforced by
`PluginBootstrapTest::test_template_registers_*_with_*_callable`.

Each hook delegates to a stub class the scaffold emits inline:

```php
if ( ! class_exists( 'My_Project_on_activate' ) ) {
    class My_Project_on_activate {
        public static function handle(): void {
            // Activation work goes here. Keep idempotent.
        }
    }
}
```

The stubs are intentionally tiny. **Don't edit the stubs in
`{slug}.php`** — extend them from your own module. Move the
class definition to `src/Modules/<Name>/Activate.php` and
register the new class from there; the inline `class_exists`
guard short-circuits the scaffold's stub.

Activation / deactivation are the only place it's safe to flush
rewrite rules. Uninstall is the only place it's safe to drop
database tables and delete options. The WordPress.org review
checks that you don't conflate the three.

### 6. Text-domain loading

```php
add_action( 'init', 'my_project_load_textdomain' );
function my_project_load_textdomain(): void {
    load_plugin_textdomain(
        'my-project',
        false,
        dirname( plugin_basename( __FILE__ ) ) . '/languages'
    );
}
```

`load_plugin_textdomain` is the function that tells WordPress
where to find `<plugin>/languages/{textDomain}-{locale}.mo`.
The three arguments are:

- `'my-project'` — the text domain. Must match the `Text
Domain:` header and every `__()` call in PHP.
- `false` — the deprecated "absolute path" flag. `false` means
  "let WordPress resolve the path relative to the plugin". WP
  uses the third argument to compute the plugin-relative
  directory.
- `dirname(plugin_basename(__FILE__)) . '/languages'` — the
  path _relative to `WP_PLUGIN_DIR`_. The double
  `dirname(plugin_basename(...))` dance is required because
  `plugin_basename` strips the plugin directory from a
  filesystem path, and we want only the directory portion.

**The path is anchored to the plugin, not the theme.** A test
in `PluginBootstrapTest` enforces this:

```php
$this->assertStringContainsString(
    'plugin_dir_path(__FILE__)',
    $source,
    'load_plugin_textdomain path must be anchored to the *plugin* directory, not the theme'
);
```

(For `load_plugin_textdomain` the test actually checks
`plugin_basename(__FILE__)` — `plugin_dir_path` shows up in
the `_PLUGIN_DIR` constant definition above.)

### 7. Wire `WPSK\Core\Plugin`

```php
add_action( 'plugins_loaded', 'WPSK\\Core\\Plugin::boot', 10, 0 );
// Direct call as a safety net for environments where
// plugins_loaded has already fired (wp-cli, unit tests).
if ( function_exists( 'WPSK\\Core\\Plugin' ) && did_action( 'plugins_loaded' ) ) {
    WPSK\Core\Plugin::boot();
}
```

The wiring has two pieces:

1. The standard `add_action('plugins_loaded', ...)` registers
   `Plugin::boot` for the normal WP request lifecycle. Priority
   10 is the default and is what every other plugin uses; do
   not change it unless you have a hard reason.
2. A direct call to `Plugin::boot()` when `plugins_loaded` has
   already fired. This handles the cases where the file is
   loaded outside a normal HTTP request:
   - **wp-cli** — `plugins_loaded` is fired by wp-cli's command
     dispatcher, but the timing depends on the command and the
     WP version.
   - **Unit tests** — the test bootstrap fires `plugins_loaded`
     once at suite load, then loads more files.
   - **Direct cron requests** — the WP-Cron dispatcher can
     load the plugin in a sub-request where `plugins_loaded` is
     stale.

`Plugin::boot()` is idempotent — a second call is a no-op — so
the double-invocation is safe. See
[modules.md](modules.md#plugin-facade) for what `boot()` does.

## How the scaffold emits `{slug}.php`

The template lives at
`packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl`.
The scaffold (`@wpsk/create-wp-project`) reads it, runs
`renderTemplate(template, vars)` over it, and writes
`<target>/<slug>.php`. The `{{token}}` placeholders are:

| Token                 | Source                       | Example                          |
| --------------------- | ---------------------------- | -------------------------------- |
| `{{name}}`            | `name` / derived from `slug` | `My Project`                     |
| `{{slug}}`            | `slug` (kebab-case)          | `my-project`                     |
| `{{slug_underscore}}` | `slug` → `snake_case` + `_`  | `my_project_`                    |
| `{{pluginUri}}`       | `pluginUri`                  | `https://example.com/my-project` |
| `{{description}}`     | `description`                | `...`                            |
| `{{author}}`          | `author`                     | `Acme`                           |
| `{{authorUri}}`       | `authorUri`                  | `https://example.com`            |
| `{{textDomain}}`      | `textDomain`                 | `my-project`                     |
| `{{phpMinVersion}}`   | `phpMinVersion`              | `7.4`                            |

The render function leaves unknown tokens verbatim, so a
missing config field is loud at scaffold time.

The scaffold **refuses to overwrite an existing `project.config.json`**
(`@wpsk/create-wp-project` calls it a guard against accidental
re-runs). The plugin file is similarly protected unless you
pass `--force`.

## Migration timeline: from `functions.php` to `{slug}.php`

The kit used to be theme-shaped: `functions.php` was the
bootstrap, the text domain lived under the theme, and the
`wp_enqueue_scripts` handler lived in the theme. As of Phase
11:

| Phase | Bootstrap location              | Status                          |
| ----- | ------------------------------- | ------------------------------- |
| 0–10  | `functions.php` in the theme    | Deprecated. Removed next major. |
| 11+   | `{slug}.php` at the plugin root | Current. The default.           |

### What changed in Phase 11

- New projects are scaffolds with `projectType: 'plugin'` (the
  default). The scaffold emits `{slug}.php` and does **not**
  emit `functions.php`. See [scaffold.md](scaffold.md#output).
- The root `functions.php` in the wp-starter-kit itself is
  kept only as a transition aid for existing projects. It
  contains a `DEPRECATION NOTICE` block at the top that points
  to `{slug}.php` as the new bootstrap. The body is unchanged
  for backward compatibility.
- `WPSK\Core\Plugin::boot()` is the new entry point. Theme
  helpers (`wpsk_starter_setup_theme`, `wpsk_starter_enqueue_assets`)
  are still present for BC, but new code should hook into the
  `{$hookPrefix}_plugin_loaded` action instead.
- `load_plugin_textdomain` is the new i18n entry point. Theme
  `load_theme_textdomain` calls are kept for BC but are not
  emitted in the new scaffold.
- `src/Core/Plugin.php` is theme-agnostic. A test
  (`PluginTest::test_plugin_source_is_theme_agnostic`) asserts
  that no `get_template_directory` or `load_theme_textdomain`
  call appears in `src/Core/*.php`.

### How to migrate an existing project

If your project was scaffolded before Phase 11:

1. Run the scaffold against a fresh directory with the same
   `project.config.json` (or copy `project.config.json` into
   the new directory and let the scaffold re-emit the rest).
2. Compare the new `src/Core/{Plugin,ModuleInterface,ModuleLoader}.php`
   against your existing tree and merge any local changes.
3. Move every hook that was registered in `functions.php` into
   a module under `src/Modules/<Name>/` and register the module
   with the loader. See
   [modules.md](modules.md#registering-a-module).
4. Move the text-domain load from
   `load_theme_textdomain(...)` in `after_setup_theme` to
   `load_plugin_textdomain(...)` on `init` (the new template
   does this).
5. Delete `functions.php`. The test
   `PluginBootstrapTest::test_template_does_not_use_after_setup_theme`
   asserts the new template does not register theme hooks.

The deprecation block in `functions.php` is the canonical
checklist — read it for the full list of changes.

## Verifying the bootstrap

The whole file is tested by
`tests/phpunit/PluginBootstrapTest.php` (20 tests, 74 assertions).
The test treats the template as a plain string — no PHP parsing,
no execution — and uses regex to assert the structure:

- 5 header tests (Plugin Name, Version, Requires PHP, Text Domain).
- 1 ABSPATH guard test.
- 1 autoloader test.
- 1 `WPSK\Core\Plugin` wiring test.
- 3 lifecycle hook tests (activation, deactivation, uninstall).
- 3 lifecycle-callable shape tests.
- 4 text-domain tests (signature, `false` relative path,
  `dirname(plugin_basename(__FILE__)) . '/languages'`,
  `{{textDomain}}` token).
- 2 theme-agnostic guard tests (no `get_template_directory`,
  no `after_setup_theme`).

```bash
./vendor/bin/phpunit --filter PluginBootstrapTest
```

A green run is the canonical proof that the scaffold is
emitting a WordPress.org-compliant plugin file.

## Related docs

- [architecture.md](architecture.md) — the big picture.
- [scaffold.md](scaffold.md) — the `@wpsk/create-wp-project`
  output and the `{{token}}` substitution engine.
- [hooks.md](hooks.md) — the `hookPrefix` namespace that the
  `{$hookPrefix}_plugin_loaded` action uses.
- [modules.md](modules.md) — the `WPSK\Core\Plugin` facade and
  the `ModuleLoader` registry that boot() drives.
- [translation.md](translation.md) — the JS+PHP translation
  pipeline, and the role of the `Text Domain:` header.
