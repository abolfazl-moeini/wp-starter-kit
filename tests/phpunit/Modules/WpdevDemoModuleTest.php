<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use WPDev\Modules\WpdevDemo\Module as KitWpdevDemoModule;

/**
 * Smoke tests for the WpdevDemo reference module contract.
 *
 * The kit reference project does not ship WpdevDemo; these tests exercise
 * the generator output shape via a minimal fixture that mirrors boot() logic.
 */
class WpdevDemoModuleTest extends \WPDevTest\TestCases\TestCase
{
    public function test_boot_is_no_op_when_framework_inactive(): void
    {
        if (class_exists(KitWpdevDemoModule::class)) {
            $module = new KitWpdevDemoModule();
            $this->expectNotToPerformAssertions();
            $module->boot();
            return;
        }

        require_once dirname(__DIR__) . '/fixtures/WpdevDemoModuleFixture.php';

        $module = new \WPDev\Tests\Fixtures\WpdevDemoModuleFixture();
        $this->expectNotToPerformAssertions();
        $module->boot();
    }

    public function test_boot_registers_admin_pages_when_framework_api_present(): void
    {
        require_once dirname(__DIR__) . '/fixtures/WpdevDemoModuleFixture.php';

        $registered = [];
        if (!function_exists('wpdev_register_module_admin_pages')) {
            function wpdev_register_module_admin_pages($module_id, array $page_classes): void
            {
                $GLOBALS['wpdev_demo_registered'] = [$module_id, $page_classes];
            }
        }

        $module = new \WPDev\Tests\Fixtures\WpdevDemoModuleFixture(true);
        $module->boot();

        $this->assertIsArray($GLOBALS['wpdev_demo_registered'] ?? null);
        $this->assertSame('acme-demo', $GLOBALS['wpdev_demo_registered'][0]);
        $this->assertContains(
            \WPDev\Tests\Fixtures\WpdevDemoDemoAdminPageFixture::class,
            $GLOBALS['wpdev_demo_registered'][1]
        );
    }
}