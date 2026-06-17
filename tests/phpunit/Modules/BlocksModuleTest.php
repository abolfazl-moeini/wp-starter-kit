<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPDev\Core\Plugin;
use WPDev\Modules\Blocks\Module;

class BlocksModuleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        Plugin::reset_for_tests();
    }

    public function test_module_slug_is_blocks(): void
    {
        $module = new Module();
        $this->assertSame('blocks', $module->get_slug());
        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $module->get_slug());
    }

    public function test_module_instantiates_without_wordpress(): void
    {
        $this->expectNotToPerformAssertions();
        new Module();
    }

    public function test_boot_does_not_throw_when_blockstudio_missing(): void
    {
        $module = new Module();
        Plugin::boot(dirname(__DIR__, 3) . '/project.config.json');
        Plugin::loader()->register($module);

        $this->expectNotToPerformAssertions();
        Plugin::on_plugins_loaded();
    }

    public function test_example_block_json_exists_and_uses_api_version_3(): void
    {
        $path = dirname(__DIR__, 3) . '/blockstudio/example-hero/block.json';
        $this->assertFileExists($path);

        $json = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($json);
        $this->assertSame(3, $json['apiVersion'] ?? null);
        $this->assertIsArray($json['blockstudio']['attributes'] ?? null);
    }
}