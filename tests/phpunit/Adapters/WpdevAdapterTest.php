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

    public function test_is_framework_active_returns_false_when_framework_missing(): void
    {
        $this->assertFalse(WpdevModuleAdapter::is_framework_active());
    }

    public function test_attach_boots_immediately_when_framework_missing(): void
    {
        $booted = false;
        $module = new class($booted) implements ModuleInterface {
            private $booted;
            public function __construct(&$booted) {
                $this->booted = &$booted;
            }
            public function get_slug(): string { return 'test-missing'; }
            public function boot(): void { $this->booted = true; }
        };

        WpdevModuleAdapter::attach($module);
        $this->assertTrue($booted);
    }

    public function test_attach_is_idempotent_per_module_slug(): void
    {
        $bootCount = 0;
        $module = new class($bootCount) implements ModuleInterface {
            private $bootCount;
            public function __construct(&$bootCount) {
                $this->bootCount = &$bootCount;
            }
            public function get_slug(): string { return 'idempotent-demo'; }
            public function boot(): void { $this->bootCount++; }
        };

        WpdevModuleAdapter::attach($module);
        WpdevModuleAdapter::attach($module);
        $this->assertSame(1, $bootCount);
    }

    /**
     * @runInSeparateProcess
     */
    public function test_attach_defers_to_wpdev_on_load_when_framework_active(): void
    {
        eval('
            function wpdev_register_table() {}
            function wpdev_on_load($cb) {
                $GLOBALS["wpdev_on_load_called"] = $cb;
            }
        ');

        $this->assertTrue(WpdevModuleAdapter::is_framework_active());

        $booted = false;
        $module = new class($booted) implements ModuleInterface {
            private $booted;
            public function __construct(&$booted) {
                $this->booted = &$booted;
            }
            public function get_slug(): string { return 'test-active'; }
            public function boot(): void { $this->booted = true; }
        };

        WpdevModuleAdapter::attach($module);
        $this->assertFalse($booted); // should not boot immediately

        $this->assertNotNull($GLOBALS['wpdev_on_load_called'] ?? null);
        $GLOBALS['wpdev_on_load_called']();
        $this->assertTrue($booted);
    }
}