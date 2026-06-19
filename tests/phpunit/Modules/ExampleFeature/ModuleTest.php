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

    public function test_should_boot_is_admin_only(): void
    {
        $module = new Module();
        $this->assertFalse($module->should_boot(), 'should_boot must be false outside admin');

        set_current_screen('index');
        $this->assertTrue($module->should_boot(), 'should_boot must be true in admin context');
    }
}