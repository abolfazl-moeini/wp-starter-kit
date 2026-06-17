<?php
declare(strict_types=1);

namespace WPDev\Tests\Adapters;

use PHPUnit\Framework\TestCase;
use WPDev\Adapters\WpdevModuleAdapter;
use WPDev\Core\ModuleInterface;

class WpdevAdapterTest extends TestCase
{
    public function test_adapter_bridges_module_interface_slug_and_boot(): void
    {
        $module = new class implements ModuleInterface {
            public function get_slug(): string
            {
                return 'demo';
            }

            public function boot(): void
            {
                // no-op for test
            }
        };

        $adapter = new WpdevModuleAdapter($module);
        $this->assertSame('demo', $adapter->get_slug());
        $adapter->boot();
        $this->assertTrue(true);
    }
}