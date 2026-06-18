<?php
declare(strict_types=1);

namespace WPDev\Tests\Fixtures;

use WPDev\Core\ModuleInterface;

/**
 * Minimal stand-in for the generated WpdevDemo module (no framework classes).
 */
final class WpdevDemoModuleFixture implements ModuleInterface
{
    private bool $frameworkActive;

    public function __construct(bool $frameworkActive = false)
    {
        $this->frameworkActive = $frameworkActive;
    }

    public function get_slug(): string
    {
        return 'wpdev-demo';
    }

    public function boot(): void
    {
        if (!$this->frameworkActive) {
            return;
        }

        if (function_exists('wpdev_register_module_admin_pages')) {
            wpdev_register_module_admin_pages(
                'acme-demo',
                [WpdevDemoDemoAdminPageFixture::class]
            );
        }
    }
}

/** @internal test fixture */
final class WpdevDemoDemoAdminPageFixture
{
}