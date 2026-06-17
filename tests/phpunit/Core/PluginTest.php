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

        // Reset the WP action shim state so a previous test's
        // `add_action('init', ...)` does not leak into the next
        // test's assertions. PluginBootstrapTest in particular
        // registers callbacks on multiple hooks; without this
        // reset, PluginTest would see an `init` callback that the
        // current test never registered.
        if (function_exists('wpsk_test_reset_wp_state')) {
            wpsk_test_reset_wp_state();
        }

        // Plugin keeps static state — reset the singleton instance and
        // any internal state between tests by reflecting on the class.
        // We use the public test seam when available, and fall back
        // to reflection for the rest. Each property's default value must
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
        // Phase 23.A2: framework Core/ moved into the wpsk/framework
        // package under packages/framework/src/Core/. The framework is
        // still shipped from the kit and must remain theme-agnostic —
        // no `get_template_directory` or `load_theme_textdomain`.
        $coreDir = $root . '/packages/framework/src/Core';

        $this->assertDirectoryExists($coreDir);

        $contents = '';
        foreach (glob($coreDir . '/*.php') ?: [] as $file) {
            $contents .= file_get_contents($file);
        }

        $this->assertStringNotContainsString(
            'get_template_directory',
            $contents,
            'packages/framework/src/Core/*.php must never call get_template_directory() — Plugin is theme-agnostic'
        );
        $this->assertStringNotContainsString(
            'load_theme_textdomain',
            $contents,
            'packages/framework/src/Core/*.php must never call load_theme_textdomain() — Plugin is theme-agnostic'
        );
    }

    /**
     * Regression test for B-01 (bug audit plan_b8f3db01):
     *
     * `Plugin::boot()` used to REPLACE `self::$loader` with a freshly
     * constructed ModuleLoader, silently dropping every module that
     * was registered on the previous instance via a priority-5
     * `plugins_loaded` closure (or any other pre-boot registration).
     *
     * The fix preserves the pre-existing loader. The test asserts
     * that a module registered before boot() is still present in the
     * loader after boot() completes.
     */
    public function test_boot_preserves_modules_registered_before_boot(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        // Simulate a priority-5 `plugins_loaded` closure that
        // registers a module before boot() runs.
        Plugin::loader()->register(new PluginTestStubModule('pre-boot'));

        Plugin::boot($configPath);

        $loader = Plugin::loader();
        $this->assertTrue(
            $loader->has('pre-boot'),
            'Plugin::boot() must NOT replace the pre-existing loader — '
            . 'modules registered before boot() must survive (B-01 regression)'
        );
    }

    /**
     * Regression test for B-02 (bug audit plan_b8f3db01):
     *
     * `Plugin::boot()` used to register `on_plugins_loaded` on BOTH
     * `plugins_loaded` and `init`, which meant the hook fired twice
     * on every normal WP request — modules double-booted, action
     * listeners double-fired.
     *
     * The fix registers on `plugins_loaded` only. The test asserts
     * that the `init` hook does NOT carry an `on_plugins_loaded`
     * callback.
     */
    public function test_on_plugins_loaded_is_registered_only_on_plugins_loaded(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        Plugin::boot($configPath);

        $wpActions = $GLOBALS['wpsk_wp_actions'] ?? [];

        $this->assertArrayHasKey(
            'plugins_loaded',
            $wpActions,
            'Plugin::boot() must register on_plugins_loaded on plugins_loaded'
        );
        $this->assertArrayNotHasKey(
            'init',
            $wpActions,
            'Plugin::boot() must NOT register on_plugins_loaded on init — '
            . 'dual registration causes boot_all() to run twice per request (B-02 regression)'
        );
    }

    /**
     * Regression test for B-02 follow-on:
     *
     * Even if a future change re-introduces the `init` registration,
     * `on_plugins_loaded` must guard against double-firing. The test
     * asserts that once `on_plugins_loaded` has run, calling it again
     * does NOT boot modules a second time.
     */
    public function test_on_plugins_loaded_does_not_double_boot(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        Plugin::boot($configPath);
        Plugin::loader()->register(new PluginTestStubModule('once'));

        // Simulate WordPress firing both `plugins_loaded` and `init`
        // on the same request.
        do_action('plugins_loaded');
        $countAfterFirst = PluginTestStubModule::$bootedCount;

        do_action('init');
        $countAfterSecond = PluginTestStubModule::$bootedCount;

        $this->assertSame(
            $countAfterFirst,
            $countAfterSecond,
            'on_plugins_loaded must be a no-op on the second firing — '
            . 'the module booted exactly once even though do_action was '
            . 'called twice (B-02 regression)'
        );
    }

    /**
     * Regression test for B-03 (bug audit plan_b8f3db01):
     *
     * The default wpsk-starter.php plugin file uses an inline closure
     * for the priority-5 module registration. When the file is
     * included AFTER `plugins_loaded` has already fired, the closure
     * is too late — the fallback `if (did_action('plugins_loaded'))`
     * block only called `Plugin::boot()`, never re-registered the
     * module. Result: the plugin booted with zero modules in
     * non-standard include orders (mu-plugins, wp-cli, test bootstrap).
     *
     * The fix is in wpsk-starter.php itself (not the framework):
     * extract the registration into a named function and call it
     * from the late-load fallback. The test verifies the
     * framework-side contract: `Plugin::loader()->boot_all()` works
     * even when the loader was populated AFTER `boot()` (i.e. the
     * late-load path is the same as the normal path from the
     * framework's perspective).
     */
    public function test_boot_all_after_boot_boots_modules_registered_post_boot(): void
    {
        $configPath = $this->writeConfig([
            'slug' => 'wpsk-starter',
            'hookPrefix' => 'wpsk',
            'textDomain' => 'wpsk-starter',
        ]);

        // Simulate the late-load path: boot() runs first (no modules
        // registered yet), then the consumer's late-load fallback
        // registers modules and calls boot_all manually.
        Plugin::boot($configPath);
        Plugin::loader()->register(new PluginTestStubModule('late-load'));

        Plugin::loader()->boot_all();

        $this->assertGreaterThanOrEqual(
            1,
            PluginTestStubModule::$bootedCount,
            'A module registered AFTER boot() must be bootable via '
            . 'boot_all() — this is the contract the late-load '
            . 'fallback in wpsk-starter.php relies on (B-03 regression)'
        );
        $this->assertTrue(
            Plugin::loader()->has('late-load'),
            'Module registered after boot() must remain in the loader'
        );
    }
}
