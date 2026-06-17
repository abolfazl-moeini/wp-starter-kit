<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules\ExampleFeature;

use PHPUnit\Framework\TestCase;
use WPDev\Modules\ExampleFeature\Module;

class ModuleTest extends TestCase
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
        $GLOBALS['wpsk_test_is_admin'] = false;
        $this->assertFalse($module->should_boot());

        $GLOBALS['wpsk_test_is_admin'] = true;
        $this->assertTrue($module->should_boot());
    }
}