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
        wpdev_test_reset_wp_state();
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

    public function test_boot_registers_admin_notice_when_blockstudio_missing(): void
    {
        if (class_exists(\Blockstudio\Build::class)) {
            $this->markTestSkipped('Blockstudio\\Build is already loaded in this process.');
        }

        $module = new Module();
        Plugin::boot(dirname(__DIR__, 3) . '/project.config.json');
        Plugin::loader()->register($module);
        Plugin::on_plugins_loaded();

        $this->assertTrue(
            has_action('admin_notices', [Module::class, 'missing_blockstudio_notice'])
        );
    }

    public function test_boot_wires_blockstudio_when_build_class_exists(): void
    {
        if (!class_exists(\Blockstudio\Build::class)) {
            require_once dirname(__DIR__) . '/fixtures/BlockstudioBuildStub.php';
        }
        if (!method_exists(\Blockstudio\Build::class, 'reset')) {
            $this->markTestSkipped('Real Blockstudio\\Build is loaded; stub hooks are not observable.');
        }

        \Blockstudio\Build::reset();

        $module = new Module();
        Plugin::boot(dirname(__DIR__, 3) . '/project.config.json');
        Plugin::loader()->register($module);
        Plugin::on_plugins_loaded();

        $this->assertFalse(
            has_action('admin_notices', [Module::class, 'missing_blockstudio_notice'])
        );
        $this->assertTrue(has_action('blockstudio/settings/path'));
        $this->assertTrue(has_action('init'));

        do_action('init');

        $this->assertIsArray(\Blockstudio\Build::$lastInitArgs);
        $dir = (string) (\Blockstudio\Build::$lastInitArgs['dir'] ?? '');
        $this->assertStringContainsString('blockstudio', $dir);
    }

    public function test_blockstudio_json_uses_v7_schema(): void
    {
        $path = dirname(__DIR__, 3) . '/blockstudio.json';
        $this->assertFileExists($path);

        $json = json_decode((string) file_get_contents($path), true);
        $this->assertIsArray($json);
        $this->assertSame(
            'https://app.blockstudio.dev/schema/blockstudio',
            $json['$schema'] ?? null
        );
        $this->assertTrue($json['assets']['process']['scss'] ?? false);
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