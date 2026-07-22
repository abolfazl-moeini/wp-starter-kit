---
name: wpdev-php-modules
description: >
  Modular PHP architecture for wp-starter-kit / generated plugins: ModuleInterface,
  ModuleLoader, Support packages (RestSetup, ShortcodesSetup, CliSetup, AccessManager,
  Assets, Templates, DeferredCall), packages/framework and packages/php-fault-tolerance,
  composer autoload.files registration. Use when adding or refactoring PHP features,
  modules under src/Modules, REST/CLI/shortcodes, access checks, or when the user
  mentions modular PHP, Module.php, RestSetup, or plugin bootstrap. Slash: /wpdev-php-modules
---

# WPDev PHP modular architecture

Use this skill for **scaffolded / generated** plugins from wp-starter-kit (and the kit
itself). Prefer **small feature modules** over a single god-class `functions.php`.

## Mental model

```
{slug}.php                    # bootstrap only (guards, constants, autoload, Plugin::boot)
packages/framework/src/       # kit runtime: Core + Support (PSR-4 WPDev\)
src/Modules/{Feature}/        # YOUR feature units (one concern each)
src/*-register.php            # thin composer autoload.files: register modules
vendor/                       # Composer only; never put feature code here
```

| Layer                          | Role                                                    | Edit?                   |
| ------------------------------ | ------------------------------------------------------- | ----------------------- |
| Bootstrap `{slug}.php`         | PHP gate, constants, require autoload, `Plugin::boot()` | Rarely                  |
| `packages/framework`           | Shared runtime (`Plugin`, `ModuleLoader`, Support APIs) | Prefer extend, not fork |
| `src/Modules/*`                | Feature modules (domain code)                           | **Yes — primary work**  |
| `src/*-register.php`           | Wire modules into loader                                | Yes when adding modules |
| `packages/php-fault-tolerance` | Optional dual Real/Stub FT; mirrored + `symlink: false` | Via feature flag        |
| `packages/mcp-integration`     | Abilities API helpers when mcp on                       | Via feature flag        |
| `packages/plugin-core-test`    | PHPUnit base cases                                      | Tests only              |

## STOP rules

- **NEVER** put feature logic in `{slug}.php` beyond boot wiring.
- **NEVER** call `register_rest_route()` directly in modules — use `RestSetup::register()`.
- **NEVER** call `WP_CLI::add_command()` directly — use `CliSetup::register()`.
- **NEVER** call `add_shortcode()` for kit shortcodes — use `ShortcodesSetup::register()`.
- **NEVER** hardcode plugin slug/namespace/prefix — use `wpdev.json` / generated constants.
- **NEVER** add files to `composer.json` `autoload.files` and skip `composer dump-autoload`.
- **ALWAYS** implement `ModuleInterface` (or extend `AbstractModule`) per feature.
- **ALWAYS** keep module slug stable after release (`get_slug()` is a public contract).
- **ALWAYS** security: capability/nonce, sanitize in, escape out, REST `permission_callback`.

## How a module is structured

Canonical reference: `src/Modules/ExampleFeature/` (when `exampleFeature:on`).

```
src/Modules/{Name}/
├── Module.php                 # boot orchestration ONLY
├── Rest/                      # RestHandler subclasses
├── Cli/                       # WP-CLI Command subclasses
├── Shortcodes/                # Shortcode subclasses (frontend)
├── Access/                    # capability / AccessManager blueprints
├── Queue/                     # DeferredCall wiring
├── Templates/                 # PHP views + thin View helpers
└── assets/entries/            # JS entries (see wpdev-js-modules skill)
```

### Module.php pattern

Mirror `src/Modules/ExampleFeature/Module.php` (register assets, then enqueue with a screen gate):

```php
namespace Vendor\Modules\MyFeature;

use Vendor\Modules\MyFeature\Rest\ItemsController;
use WPDev\Core\AbstractModule;
use WPDev\Support\Assets;
use WPDev\Support\Rest\RestSetup;

final class Module extends AbstractModule
{
    public function get_slug(): string { return 'my-feature'; }

    public function should_boot(): bool
    {
        // Optional gate (capability, feature flag, …). Prefer keeping REST
        // available outside admin unless the feature is truly admin-only.
        return true;
    }

    public function boot(): void
    {
        RestSetup::register(ItemsController::class);
        // ShortcodesSetup::register($tag, DemoShortcode::class);
        // CliSetup::register(StatusCommand::class);
        // DeferredSetup::boot(); // module-local helper around DeferredCall

        if (!function_exists('is_admin') || !is_admin()) {
            return;
        }

        add_action('admin_init', [$this, 'register_admin_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_admin_assets(): void
    {
        Assets::register_bundle_script(
            'my-feature-admin',
            'assets/bundles/MyFeature-admin.js'
        );
    }

    public function enqueue_admin_assets(string $hook): void
    {
        if ($hook !== 'toplevel_page_my-feature') {
            return;
        }
        // Handle must already be registered (or pass rel_path as 2nd arg).
        Assets::enqueue_bundle_script('my-feature-admin');
    }
}
```

**Split rule:** `Module::boot()` only **registers** collaborators. Business logic lives in
`Rest/`, `Access/`, services, templates — not in a 500-line `boot()`.

## Registration lifecycle

Order on `plugins_loaded` matters:

| Priority | What                                                         |
| -------- | ------------------------------------------------------------ |
| ~5       | Register modules: `Plugin::loader()->register(new Module())` |
| 10       | `Plugin::boot()` (from `{slug}.php`)                         |
| ~11      | Loader `boot_all()` runs each module's `boot()`              |

**Preferred (generated features):** thin `src/{name}-register.php` listed in
`composer.json` → `autoload.files` (see PolarisDemo / mcp / phpFramework generators).

**Also valid:** a named register function in `{slug}.php` at priority 5 (kit
dogfoods this in `wpdev-starter.php`). Keep bootstrap free of feature logic.

Do **not** register modules only _after_ `Plugin::boot()` — they must be on the
loader before `boot_all()`.

Set plugin dir so Assets / `wpdev.json` resolve from plugin root (consumer main file already does this):

```php
\WPDev\Core\Plugin::set_plugin_dir( MY_PLUGIN_DIR );
\WPDev\Support\Assets::set_plugin_dir( MY_PLUGIN_DIR, plugins_url( '', MY_PLUGIN_FILE ) );
```

### New module checklist

1. Create `src/Modules/{Name}/Module.php` (+ subfolders as needed).
2. Add `src/{name}-register.php` (preferred) **or** wire priority-5 register in `{slug}.php`.
3. If using a register file: append path to `composer.json` → `autoload.files`.
4. Run **`composer dump-autoload`** after any `files` change (required — stale maps fatal).
5. Mirror tests under `tests/phpunit/Modules/{Name}/` when phpunit is on.

## packages/framework Support map

Use these instead of reinventing WordPress plumbing:

| API                             | Package path             | Use for                                        |
| ------------------------------- | ------------------------ | ---------------------------------------------- |
| `RestSetup` + `RestHandler`     | `Support/Rest/`          | REST routes, batch, permissions                |
| `ShortcodesSetup` + `Shortcode` | `Support/Shortcodes/`    | Frontend shortcodes + lazy enqueue             |
| `CliSetup` + `Command`          | `Support/WpCli/`         | WP-CLI class commands                          |
| `Assets`                        | `Support/Assets.php`     | Register/enqueue `assets/bundles/*` + localize |
| `DeferredCall`                  | `Support/Queue/`         | Queue callbacks before/after hooks fire        |
| `Template` + helpers            | `Support/Templates/`     | Load/render module views                       |
| `UserAccess` / `BluePrint`      | `Support/AccessManager/` | Declarative capability rules                   |
| `CapabilityPolicy`              | `Support/Auth/`          | REST / admin access helpers                    |
| `WpdevModuleAdapter`            | `Adapters/`              | Soft-dep attach when `phpFramework:wpdev`      |

### REST slice

```php
// In Module::boot()
RestSetup::register(ItemsController::class);

// ItemsController extends RestHandler and implements:
//   rest_end_point(), methods(), rest_permission(), rest_handler(WP_REST_Request)
// Optional: AllowBatch + BatchResponse for rest-utils batch clients.
```

Do **not** register routes with raw `register_rest_route` in feature code.
See `src/Modules/ExampleFeature/Rest/ItemsController.php`.

### Shortcode slice (Polaris / frontend)

```php
ShortcodesSetup::register(self::SHORTCODE, DemoShortcode::class);
// DemoShortcode extends Shortcode; call Module::request_enqueue() from render,
// not on every page. See polaris generator: packages/create-wp-project/.../_polaris-template.js
```

### Access slice

```php
use WPDev\Support\AccessManager\UserAccess;
use WPDev\Support\AccessManager\BluePrint\BluePrint;

// Prefer BluePrint any/all/custom over scattered current_user_can() when rules grow.
```

### Assets slice

```php
Assets::register_bundle_script('my-feature-admin', 'assets/bundles/MyFeature-admin.js');
Assets::enqueue_bundle_script('my-feature-admin');
// Bundle name must match esbuild output: {Module}-{entry}.js
```

## Other PHP packages (generated tree)

| Package                        | When present                | Purpose                                                                        |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------------ |
| `packages/framework`           | Always (js≠none or php kit) | Core module runtime + Support                                                  |
| `packages/php-fault-tolerance` | `faultTolerance:on`         | Dual Real (PHP≥8.1) / Stub load; mirrored under `packages/` + `symlink: false` |
| `packages/mcp-integration`     | `mcpAbilities:on`           | WordPress Abilities API bridge                                                 |
| `packages/plugin-core-test`    | `phpTest:phpunit`           | `PluginBaseTestCase`, Rest/Ajax bases                                          |
| `packages/wpdev-framework`     | Kit-only reference          | **Not** auto-vendored into consumers as companion-plugins                      |

`phpFramework:wpdev` = soft dependency on site-installed WPDev Admin Framework +
`FrameworkBridge` + admin notice in main file — **not** `companion-plugins/`.

## Splitting large features

When a module grows past ~one screen of `boot()` or mixed concerns:

1. **By boundary (preferred):** `Rest/`, `Admin/`, `Cli/`, `Cron/`, `Domain/` services.
2. **By use-case:** `Checkout/`, `Inventory/` as **sibling modules** if they can ship independently.
3. **Extract pure PHP** services with no WP globals for unit tests.
4. **Share** cross-cutting helpers in `src/Support/` only if ≥2 modules need them; otherwise keep private under the module.

Anti-patterns:

- One `Helpers.php` dumping all features
- Circular requires between modules — depend on framework Support or events/hooks instead
- Loading admin assets on every request without `$hook` / shortcode gate

## Composer autoload rules

```json
"autoload": {
  "psr-4": {
    "Vendor\\": "src/",
    "WPDev\\": "packages/framework/src/"
  },
  "files": [
    "src/my-feature-register.php"
  ]
}
```

- PSR-4 for classes; **files** only for side-effect registration hooks.
- After any change to `files` or deleting a register PHP: `composer dump-autoload -o`.
- Doctor flags missing autoload.files and stale `vendor/composer/autoload_files.php` maps.

## Security baseline (every module)

- Capability checks on admin actions and REST `permission_callback`
- Nonces on forms / ajax
- `sanitize_*` / custom sanitizers on input
- `esc_*` on output in templates
- Prepared SQL (`$wpdb->prepare`) if querying DB
- No secrets in repo; no `eval` of user content

## Decision tree

| Goal                    | Do this                                                       |
| ----------------------- | ------------------------------------------------------------- |
| New feature             | New `src/Modules/{Name}/` + register file + dump-autoload     |
| REST endpoint           | `RestHandler` + `RestSetup::register`                         |
| Admin screen JS         | Module registers Assets; entry under `assets/entries/*.ts(x)` |
| Frontend shortcode UI   | `Shortcode` + `ShortcodesSetup` + view entry (Polaris skill)  |
| Capability matrix       | AccessManager BluePrint / CapabilityPolicy                    |
| Defer until hook        | `DeferredCall` patterns (see ExampleFeature Queue)            |
| WP-CLI                  | `Command` + `CliSetup`                                        |
| Soft-dep WPDev admin FW | `FrameworkBridge::is_framework_active()` + adapter attach     |

## Quality checklist

- [ ] `ModuleInterface` / `AbstractModule` with stable `get_slug()`
- [ ] `boot()` only wires; logic in collaborators
- [ ] No raw REST/CLI/shortcode registration bypassing Support
- [ ] Assets gated by screen/shortcode
- [ ] composer `files` + dump-autoload done
- [ ] PHPUnit under `tests/phpunit/Modules/...` when applicable
- [ ] No hardcoded brand slug/prefix

## Related

- Package path map: [references/packages-map.md](references/packages-map.md)
- JS modular + Polaris: skill **`wpdev-js-modules`**
- Module tutorial: `docs/module-guide.md`
- Example: `src/Modules/ExampleFeature/`
- Framework sources: `packages/framework/src/`
