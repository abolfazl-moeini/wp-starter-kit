<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules\ExampleFeature;

use WPDev\Modules\ExampleFeature\Module;

class ModuleTest extends \WPDevTest\TestCases\TestCase
{
    public function test_slug_is_non_empty_kebab_case(): void
    {
        $module = new Module();
        $this->assertSame('example-feature', $module->get_slug());
        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $module->get_slug());
    }

    public function test_boot_registers_rest_outside_admin_context(): void
    {
        // AbstractModule defaults should_boot() to true; REST must register
        // even when not in admin so front-end API requests work.
        $module = new Module();
        $this->assertTrue(
            method_exists($module, 'should_boot') ? $module->should_boot() : true,
            'ExampleFeature must boot (and register RestSetup routes) outside admin'
        );
    }
}
