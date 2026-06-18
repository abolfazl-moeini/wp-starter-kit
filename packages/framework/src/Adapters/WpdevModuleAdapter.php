<?php
declare(strict_types=1);

namespace WPDev\Adapters;

use WPDev\Core\ModuleInterface;

/**
 * Thin bridge between WPDev's ModuleInterface and wpdev-framework's
 * module loader convention (modules/{name}/setup.php + Module_Loader::load_all()).
 *
 * Consumers with phpFramework:wpdev use this adapter to register kit
 * modules alongside wpdev's lifecycle without copying wpdev source.
 */
final class WpdevModuleAdapter
{
    /** @var array<string, true> */
    private static $attached = [];

    /** @var ModuleInterface */
    private $module;

    public function __construct(ModuleInterface $module)
    {
        $this->module = $module;
    }

    public function get_slug(): string
    {
        return $this->module->get_slug();
    }

    public function boot(): void
    {
        $this->module->boot();
    }

    public static function is_framework_active(): bool
    {
        return function_exists('wpdev_register_table'); // framework public API present
    }

    /** Register a kit module to boot on the framework's `wpdev_on_load` hook. */
    public static function attach(ModuleInterface $module): void
    {
        $slug = $module->get_slug();
        if (isset(self::$attached[$slug])) {
            return;
        }
        self::$attached[$slug] = true;

        if (self::is_framework_active() && function_exists('wpdev_on_load')) {
            \wpdev_on_load(static function () use ($module) { $module->boot(); });
            return;
        }
        // Fallback: framework not active — boot on the kit's own lifecycle.
        $module->boot();
    }
}