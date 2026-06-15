<?php

use PHPUnit\Framework\TestCase;
use WPSK\Core\ModuleInterface;
use WPSK\Core\ModuleLoader;
use WPSK\Core\Plugin;

/**
 * Minimal ModuleInterface stub for PluginTest — distinct from
 * ModuleLoaderTest's recording variant so the two suites can be
 * loaded in any order without sharing static state.
 */
final class PluginTestStubModule implements ModuleInterface
{
    public static int $bootedCount = 0;
    public string $slug;

    public function __construct(string $slug = 'stub')
    {
        $this->slug = $slug;
    }

    public function boot(): void
    {
        self::$bootedCount++;
    }

    public function get_slug(): string
    {
        return $this->slug;
    }

    public static function reset(): void
    {
        self::$bootedCount = 0;
    }
}

/**
 * Tests for the WPSK\Core\Plugin facade.
 *
 * Coverage:
 *  - config() reads project.config.json from a given path and
 *    parses it as an associative array
 *  - config() throws RuntimeException when the config file is missing
 *  - loader() returns a ModuleLoader instance
 *  - boot() makes the loader available, boots the registered modules,
 *    and exposes the fired hook prefix through Plugin::last_loaded_hook()
 *  - the plugin is theme-agnostic — never touches get_template_directory()
 */
class PluginTest extends TestCase
{
    /** @var string */
    private $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        PluginTestStubModule::reset();

        // Plugin keeps static state — reset the singleton instance and
        // any internal state between tests by reflecting on the class.
        // We use the public test seam when available, and fall back to
        // reflection for the rest. Each property's default value must
        // match the declared type in Plugin.php. Property names follow
        // the WPCS snake_case convention (see Plugin.php).
        $reflection = new ReflectionClass(Plugin::class);
        $defaults = [
            'instance'     => null,
            'loader'       => null,
            'config_path'  => null,
            'config_cache' => null,
            'last_hook'    => null,
            'booted'       => false,
        ];
        // PHP 7.x needs setAccessible(true) on private static props;
        // PHP 8.1+ ignores it and emits a deprecation. Guard the call
        // so the suite stays clean on both runtimes.
        $needsAccessible = PHP_VERSION_ID < 80100;
        foreach ($defaults as $name => $value) {
            if (!$reflection->hasProperty($name)) {
                continue;
            }
            $property = $reflection->getProperty($name);
            if ($needsAccessible) {
                $property->setAccessible(true);
            }
            $property->setValue(null, $value);
        }

        $this->tmpDir = sys_get_temp_dir() . '/wpsk-plugin-test-' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        if ($this->tmpDir !== null && is_dir($this->tmpDir)) {
            $this->rrmdir($this->tmpDir);
        }
        parent::tearDown();
    }

    private function rrmdir(string $dir): void
    {
        foreach (scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . '/' . $entry;
            if (is_dir($path)) {
                $this->rrmdir($path);
            } else {
                unlink($path);
            }
        }
        rmdir($dir);
    }

    private function writeConfig(array $payload): string
    {
        $path = $this->tmpDir . '/project.config.json';
        file_put_contents($path, json_encode($payload));
        return $path;
    }

    public function test_config_reads_project_config_json(): void
    {
        $path = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        $config = Plugin::config($path);

        $this->assertIsArray($config, 'config() must return an associative array');
        $this->assertSame('wpsk-starter', $config['slug']);
        $this->assertSame('wpsk', $config['hookPrefix']);
        $this->assertSame('wpsk-starter', $config['textDomain']);
    }

    public function test_config_throws_when_file_is_missing(): void
    {
        $missingPath = $this->tmpDir . '/project.config.json.does-not-exist';

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage($missingPath);

        Plugin::config($missingPath);
    }

    public function test_loader_returns_a_module_loader_instance(): void
    {
        $loader = Plugin::loader();

        $this->assertInstanceOf(
            ModuleLoader::class,
            $loader,
            'Plugin::loader() must return a ModuleLoader instance'
        );
    }

    public function test_boot_initializes_loader_and_makes_it_booted(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        Plugin::boot($configPath);

        $this->assertTrue(
            Plugin::is_booted(),
            'Plugin::boot() must mark the plugin as booted (observable side effect)'
        );
        $this->assertSame(
            'wpsk_plugin_loaded',
            Plugin::last_loaded_hook(),
            'Plugin::boot() must record the hook name it fired (no real do_action observable in stub environment)'
        );
    }

    public function test_boot_loads_config_from_plugin_root(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        Plugin::boot($configPath);

        $this->assertSame(
            ['slug' => 'wpsk-starter', 'hookPrefix' => 'wpsk', 'textDomain' => 'wpsk-starter'],
            Plugin::loaded_config(),
            'Plugin::boot() must remember the parsed config for later inspection'
        );
    }

    public function test_plugin_source_is_theme_agnostic(): void
    {
        $root = dirname(__DIR__, 3);
        $coreDir = $root . '/src/Core';

        $this->assertDirectoryExists($coreDir);

        $contents = '';
        foreach (glob($coreDir . '/*.php') ?: [] as $file) {
            $contents .= file_get_contents($file);
        }

        $this->assertStringNotContainsString(
            'get_template_directory',
            $contents,
            'src/Core/*.php must never call get_template_directory() — Plugin is theme-agnostic'
        );
        $this->assertStringNotContainsString(
            'load_theme_textdomain',
            $contents,
            'src/Core/*.php must never call load_theme_textdomain() — Plugin is theme-agnostic'
        );
    }
}
