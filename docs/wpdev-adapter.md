# wpdev-framework Adapter

The optional `phpFramework:wpdev` feature lets a consumer use
[wpdev-framework-core](https://github.com/wpdev-framework/wpdev-framework-core)
alongside the kit without copying wpdev source into the project.

## wpdev module convention

wpdev-framework boots via:

1. `wpdev.php` requires `modules/core/setup.php`
2. On `plugins_loaded` (priority 5), `Module_Loader::load_all()` loads
   every `modules/*/setup.php`
3. Modules register admin pages, managers, and tables via helpers such as
   `wpdev_register_module_admin_pages()` and `wpdev_boot_module_manager()`

See `wpdev-framework/wpdev-framework-core/modules/README.md` for the
full layout (core, builders, production shell).

## What the kit bridges

| wpdev seam                  | Kit equivalent                |
| --------------------------- | ----------------------------- |
| `modules/*/setup.php` entry | `ModuleInterface::boot()`     |
| Module slug                 | `ModuleInterface::get_slug()` |
| `Module_Loader::load_all()` | `WPSK\Core\ModuleLoader`      |

The adapter class `WPSK\Adapters\WpdevModuleAdapter` (shipped in
`wpdev/framework`) wraps a kit `ModuleInterface` instance so you can
register it in wpdev's loader lifecycle without rewriting your module.

## Consumer wiring

When `phpFramework:wpdev`:

1. `composer.json` gains a `suggest` entry for `wpdev/framework-core`
2. `docs/wpdev-integration.md` is emitted in the consumer project
3. Install wpdev-framework-core as a separate plugin on the site

The adapter is **optional** — `phpFramework:none` (the default) never
requires wpdev.
