<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use WPDev\Modules\McpAbilities\Module;

class McpAbilitiesModuleTest extends \WPDevTest\TestCases\TestCase
{
    public function test_slug_is_non_empty_kebab_case(): void
    {
        $module = new Module();
        $this->assertSame('mcp-abilities', $module->get_slug());
        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $module->get_slug());
    }

    public function test_module_instantiates_without_wordpress(): void
    {
        $this->expectNotToPerformAssertions();
        new Module();
    }
}