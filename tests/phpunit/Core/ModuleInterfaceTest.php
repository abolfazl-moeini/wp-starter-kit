<?php

use WPDev\Core\ModuleInterface;

/**
 * Contract tests for the WPDev\Core\ModuleInterface.
 *
 * The interface is intentionally tiny (boot + get_slug) — a feature
 * contract that every pluggable module must honour. Because PHP
 * interfaces cannot be instantiated directly, the suite proves the
 * contract by writing an in-test implementation and asserting that
 * the contract is what concrete modules can rely on.
 *
 * RED — these tests fail until `src/Core/ModuleInterface.php` exists
 * with the expected `boot(): void` and `get_slug(): string` shape.
 */
class ModuleInterfaceTest extends \WPDevTest\TestCases\TestCase
{
    public function test_module_interface_exists(): void
    {
        $this->assertTrue(
            interface_exists('WPDev\\Core\\ModuleInterface', true),
            'WPDev\\Core\\ModuleInterface must be declared'
        );
    }

    public function test_module_interface_declares_boot_method(): void
    {
        $reflection = new ReflectionClass('WPDev\\Core\\ModuleInterface');

        $this->assertTrue(
            $reflection->hasMethod('boot'),
            'ModuleInterface must declare a boot() method'
        );

        $method = $reflection->getMethod('boot');
        $this->assertTrue(
            $method->isAbstract(),
            'boot() must remain abstract (no default implementation on the interface)'
        );
    }

    public function test_module_interface_declares_get_slug_method(): void
    {
        $reflection = new ReflectionClass('WPDev\\Core\\ModuleInterface');

        $this->assertTrue(
            $reflection->hasMethod('get_slug'),
            'ModuleInterface must declare a get_slug() method'
        );

        $method = $reflection->getMethod('get_slug');
        $this->assertTrue(
            $method->isAbstract(),
            'get_slug() must remain abstract'
        );
    }

    public function test_concrete_module_can_implement_interface(): void
    {
        $module = new class implements ModuleInterface {
            public function boot(): void {}
            public function get_slug(): string
            {
                return 'test-module';
            }
        };

        $this->assertInstanceOf(
            ModuleInterface::class,
            $module,
            'An anonymous class implementing the interface must satisfy ModuleInterface'
        );
        $this->assertSame('test-module', $module->get_slug());
    }

    public function test_boot_returns_void_and_does_not_throw(): void
    {
        $module = new class implements ModuleInterface {
            public bool $booted = false;
            public function boot(): void
            {
                $this->booted = true;
            }
            public function get_slug(): string
            {
                return 'tracker';
            }
        };

        $return = $module->boot();
        $this->assertNull($return, 'boot() must return void (implicit null)');
        $this->assertTrue($module->booted, 'boot() must run side effects on the concrete module');
    }
}
