<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WPDev\Core\ModuleInterface;
use WPDev\Core\Plugin;

final class PluginLifecycleTestStubModule implements ModuleInterface
{
    public int $bootedCount = 0;
    public string $slug;

    public function __construct(string $slug = 'lifecycle-stub')
    {
        $this->slug = $slug;
    }

    public function boot(): void
    {
        $this->bootedCount++;
    }

    public function get_slug(): string
    {
        return $this->slug;
    }
}

class PluginLifecycleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Plugin::reset_for_tests();
        if (function_exists('wpdev_test_reset_wp_state')) {
            wpdev_test_reset_wp_state();
        }
    }

    protected function tearDown(): void
    {
        Plugin::reset_for_tests();
        parent::tearDown();
    }

    private function writeConfig(array $cfg): string
    {
        $dir = sys_get_temp_dir() . '/wpdev_lifecycle_test_' . uniqid();
        mkdir($dir, 0777, true);
        $path = $dir . '/project.config.json';
        file_put_contents($path, json_encode($cfg));
        return $path;
    }

    public function test_module_registered_before_boot_is_booted_exactly_once(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpdev-starter',
            'hookPrefix' => 'wpdev',
            'textDomain' => 'wpdev-starter',
        ]);

        $module = new PluginLifecycleTestStubModule('pre-boot');
        Plugin::loader()->register($module);

        Plugin::boot($configPath);

        // Simulate WordPress hook firing
        Plugin::on_plugins_loaded();

        $this->assertSame(1, $module->bootedCount);

        // Call it again to prove duplicate calls do not double-boot
        Plugin::on_plugins_loaded();
        $this->assertSame(1, $module->bootedCount);
    }

    public function test_on_plugins_loaded_invoked_twice_boots_modules_once(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpdev-starter',
            'hookPrefix' => 'wpdev',
            'textDomain' => 'wpdev-starter',
        ]);

        Plugin::boot($configPath);
        $module = new PluginLifecycleTestStubModule('plugins-loaded-once');
        Plugin::loader()->register($module);

        Plugin::on_plugins_loaded();
        $this->assertSame(1, $module->bootedCount);

        Plugin::on_plugins_loaded();
        $this->assertSame(1, $module->bootedCount);
    }

    public function test_late_load_registers_and_boots(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpdev-starter',
            'hookPrefix' => 'wpdev',
            'textDomain' => 'wpdev-starter',
        ]);

        Plugin::boot($configPath);
        $module = new PluginLifecycleTestStubModule('late-load');
        Plugin::loader()->register($module);

        Plugin::loader()->boot_all();

        $this->assertSame(1, $module->bootedCount);
    }
}
