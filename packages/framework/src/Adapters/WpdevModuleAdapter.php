<?php
declare(strict_types=1);

namespace WPDev\Adapters;

use WPDev\Core\ModuleInterface;

/**
 * Thin bridge between WPSK's ModuleInterface and wpdev-framework's
 * module loader convention (modules/{name}/setup.php + Module_Loader::load_all()).
 *
 * Consumers with phpFramework:wpdev use this adapter to register kit
 * modules alongside wpdev's lifecycle without copying wpdev source.
 */
final class WpdevModuleAdapter
{
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
}