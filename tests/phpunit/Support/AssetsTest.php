<?php

use WPDev\Core\Plugin;
use WPDev\Support\Assets;

/**
 * Tests for `WPDev\Support\Assets` — the PSR-4 class that supersedes the
 * theme-based `wpdev_*` helpers in `includes/asset-functions.php`.
 *
 * Spec contracts verified here:
 *  - Path resolution uses `plugin_dir_path()` / `plugins_url()`, not
 *    `get_template_directory()` (this is the move from theme to plugin).
 *  - `Assets::asset_info()` reads the companion `.asset.php` and returns the
 *    `['dependencies'=>..., 'hash'=>..., 'internal_packages'=>...]` shape.
 *  - `Assets::enqueue_bundle_script()`:
 *      * calls both `wp_register_script` AND `wp_enqueue_script`,
 *      * appends a `?id=<hash>` query arg,
 *      * calls `wp_set_script_translations($handle, $textDomain, $translationsPath)`
 *        (this is the gap from plan.v2.md — the old helpers never did this),
 *      * merges `array_merge($extra_deps, $asset_info['dependencies'])`.
 *  - `Assets::enqueue_bundle_style()` mirrors the script path for CSS.
 *  - `Assets::get_localize_data()` and `Assets::read_project_config()` keep
 *    the shape consumed by the JS localize utilities.
 *
 * Tests use real WordPress script/style registries (`$wp_scripts`, `$wp_styles`)
 * and `wp_script_is()` / `wp_style_is()` to observe enqueue calls.
 */
class AssetsTest extends \WPDevTest\TestCases\TestCase
{
    /** @var string */
    private $tmpDir;

    public function setUp(): void
    {
        parent::setUp();
        Plugin::reset_for_tests();
        $this->tmpDir = sys_get_temp_dir() . '/wpdev-assets-test-' . uniqid('', true);
        mkdir($this->tmpDir, 0777, true);

        // Assets::read_project_config() delegates to Plugin::config(), which
        // resolves project.config.json from the consumer plugin root — not from
        // packages/framework/. Mirror wpdev-starter.php bootstrap wiring.
        $root = $this->pluginRootPath();
        Plugin::set_plugin_dir($root);
        Assets::set_plugin_dir($root, $this->pluginRootUrl());
    }

    public function tearDown(): void
    {
        $this->rrmdir($this->tmpDir);
        Plugin::reset_for_tests();
        Assets::set_plugin_dir(null, null);
        parent::tearDown();
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($path)) {
                $this->rrmdir($path);
            } else {
                unlink($path);
            }
        }
        rmdir($dir);
    }

    /**
     * Write a companion `.asset.php` next to `$absPath`. Returns the asset
     * file's absolute path.
     */
    private function writeAssetFile(string $absPath, array $data): string
    {
        $assetPath = preg_replace('/\.(js|css)$/', '.asset.php', $absPath);
        $dir = dirname($assetPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($assetPath, '<?php return ' . var_export($data, true) . ';');
        return $assetPath;
    }

    /**
     * Project root that Assets::resolve_paths() should map to. The WP function
     * stubs in `tests/phpunit/bootstrap.php` already return values for
     * `plugin_dir_path()` and `plugins_url()`; this getter derives the same
     * paths the class is expected to use, so the assertions stay in lockstep
     * with the stub.
     */
    private function pluginRootPath(): string
    {
        // AssetsTest lives at tests/phpunit/Support/ — three levels below
        // the plugin root (same anchor bootstrap.php uses from phpunit/).
        return dirname(__DIR__, 3);
    }

    private function pluginRootUrl(): string
    {
        return untrailingslashit(plugins_url('', $this->pluginRootPath() . '/wpdev-starter.php'));
    }

    private function scriptHandle(string $handle): ?\_WP_Dependency
    {
        global $wp_scripts;
        return $wp_scripts->registered[$handle] ?? null;
    }

    private function styleHandle(string $handle): ?\_WP_Dependency
    {
        global $wp_styles;
        return $wp_styles->registered[$handle] ?? null;
    }

    // ------------------------------------------------------------------
    // resolve_paths: must use plugin_dir_path() / plugins_url(), not theme.
    // ------------------------------------------------------------------

    public function test_resolve_paths_uses_plugin_dir_path_and_plugins_url(): void
    {
        $paths = Assets::resolve_paths();

        $this->assertIsArray($paths);
        $this->assertArrayHasKey('base_path', $paths, 'resolve_paths() must expose a base_path key');
        $this->assertArrayHasKey('base_url',  $paths, 'resolve_paths() must expose a base_url key');

        $this->assertSame(
            $this->pluginRootPath() . '/',
            $paths['base_path'],
            'resolve_paths() base_path must come from the plugin root'
        );

        $this->assertSame(
            $this->pluginRootUrl(),
            untrailingslashit($paths['base_url']),
            'resolve_paths() base_url must come from plugins_url() (plugin URL prefix)'
        );
    }

    public function test_resolve_paths_does_not_use_get_template_directory(): void
    {
        // Spec: the new class is plugin-based; the theme helpers must NOT be
        // referenced inside the production code. The class itself must not
        // call get_template_directory() / get_template_directory_uri() — we
        // assert that resolve_paths() returns values aligned with
        // plugin_dir_path() / plugins_url(), not the theme stubs.
        $paths = Assets::resolve_paths();

        // Theme stub returns the wp-starter-kit project root which happens
        // to match plugin_dir_path() in the test env. We assert on the URL
        // side instead, where theme vs plugin URIs differ.
        $this->assertNotSame(
            get_template_directory_uri() . '/assets/bundles/',
            $paths['base_url'] . '/assets/bundles/',
            'base_url must NOT come from get_template_directory_uri()'
        );
    }

    // ------------------------------------------------------------------
    // asset_info: companion .asset.php read, full shape.
    // ------------------------------------------------------------------

    public function test_asset_info_reads_companion_asset_php_full_shape(): void
    {
        $js = $this->tmpDir . '/wpdev-starter-deps.js';
        file_put_contents($js, '/* foo */');
        $this->writeAssetFile($js, [
            'dependencies'      => ['jquery', 'wp-i18n'],
            'hash'              => 'abc123',
            'internal_packages' => ['@wpdev/hooks', '@wpdev/utils'],
        ]);

        $info = Assets::asset_info($js);

        $this->assertSame(
            [
                'dependencies'      => ['jquery', 'wp-i18n'],
                'hash'              => 'abc123',
                'internal_packages' => ['@wpdev/hooks', '@wpdev/utils'],
            ],
            $info
        );
    }

    public function test_asset_info_returns_empty_array_when_companion_missing(): void
    {
        $js = $this->tmpDir . '/no-companion.js';
        file_put_contents($js, '/* nope */');

        $this->assertSame([], Assets::asset_info($js));
    }

    public function test_asset_info_returns_empty_array_for_non_js_or_css(): void
    {
        $this->assertSame([], Assets::asset_info('foo/bar.txt'));
        $this->assertSame([], Assets::asset_info('foo/bar.php'));
        $this->assertSame([], Assets::asset_info('foo/bar'));
    }

    // ------------------------------------------------------------------
    // enqueue_bundle_script: wp_register_script, wp_enqueue_script,
    //                      hash query arg, wp_set_script_translations,
    //                      array_merge($extra_deps, $info['dependencies']).
    // ------------------------------------------------------------------

    public function test_enqueue_bundle_script_calls_register_and_enqueue_and_set_translations(): void
    {
        $js = $this->tmpDir . '/wpdev-starter-deps.js';
        file_put_contents($js, '/* x */');
        $this->writeAssetFile($js, [
            'dependencies' => ['wp-i18n', 'wp-api-fetch'],
            'hash'         => 'sha-test',
        ]);

        Assets::enqueue_bundle_script('wpdev-starter-deps', $js, ['jquery']);

        $registered = $this->scriptHandle('wpdev-starter-deps');
        $this->assertNotNull($registered, 'wp_register_script must register the bundle');
        $this->assertTrue(wp_script_is('wpdev-starter-deps', 'enqueued'), 'wp_enqueue_script must enqueue the bundle');
        $this->assertStringContainsString('id=sha-test', $registered->src, 'src must carry ?id=<hash> cache-bust');
        $this->assertSame(
            ['jquery', 'wp-i18n', 'wp-api-fetch'],
            $registered->deps,
            'deps must be array_merge($extra_deps, $info[dependencies])'
        );
        $this->assertSame('wpdev-starter', $registered->textdomain, 'text domain must come from project.config.json');
    }

    public function test_register_bundle_script_registers_without_enqueueing(): void
    {
        $js = $this->tmpDir . '/register-only.js';
        file_put_contents($js, '/* x */');
        $this->writeAssetFile($js, [
            'dependencies' => ['wp-i18n'],
            'hash'         => 'reg-hash',
        ]);

        Assets::register_bundle_script('register-only', $js, ['jquery']);

        $registered = $this->scriptHandle('register-only');
        $this->assertNotNull($registered, 'register_bundle_script must register the script');
        $this->assertFalse(wp_script_is('register-only', 'enqueued'), 'register_bundle_script must not enqueue');
        $this->assertStringContainsString('id=reg-hash', $registered->src);
        $this->assertSame(['jquery', 'wp-i18n'], $registered->deps);
        $this->assertSame('wpdev-starter', $registered->textdomain);
    }

    public function test_enqueue_bundle_script_with_handle_only_enqueues_registered_script(): void
    {
        $js = $this->tmpDir . '/enqueue-only.js';
        file_put_contents($js, '/* x */');

        Assets::register_bundle_script('enqueue-only', $js);
        wp_dequeue_script('enqueue-only');

        Assets::enqueue_bundle_script('enqueue-only');

        $this->assertTrue(wp_script_is('enqueue-only', 'enqueued'), 'handle-only enqueue must enqueue the registered script');
    }

    public function test_enqueue_bundle_script_without_asset_file_skips_hash_and_translations_path(): void
    {
        $js = $this->tmpDir . '/no-asset.js';
        file_put_contents($js, '/* x */');
        // No .asset.php companion.

        Assets::enqueue_bundle_script('no-asset', $js);

        $registered = $this->scriptHandle('no-asset');
        $this->assertNotNull($registered);
        $this->assertTrue(wp_script_is('no-asset', 'enqueued'));
        $this->assertStringNotContainsString('id=', $registered->src, 'no hash → no id= query arg');
        $this->assertSame('wpdev-starter', $registered->textdomain);
    }

    // ------------------------------------------------------------------
    // enqueue_bundle_style: same shape for CSS, no translations wiring
    // required (CSS doesn't go through wp_set_script_translations).
    // ------------------------------------------------------------------

    public function test_enqueue_bundle_style_calls_register_and_enqueue_with_merged_deps(): void
    {
        $css = $this->tmpDir . '/theme.css';
        file_put_contents($css, 'body{}');
        $this->writeAssetFile($css, [
            'dependencies' => ['bootstrap'],
            'hash'         => 'css-hash',
        ]);

        Assets::enqueue_bundle_style('theme', $css, ['dashicons']);

        $registered = $this->styleHandle('theme');
        $this->assertNotNull($registered, 'wp_register_style must register the bundle');
        $this->assertTrue(wp_style_is('theme', 'enqueued'), 'wp_enqueue_style must enqueue the bundle');
        $this->assertStringContainsString('id=css-hash', $registered->src);
        $this->assertSame(['dashicons', 'bootstrap'], $registered->deps);
    }

    // ------------------------------------------------------------------
    // read_project_config: reads from plugin root, not template dir.
    // ------------------------------------------------------------------

    public function test_read_project_config_returns_array_with_plugin_root_keys(): void
    {
        $config = Assets::read_project_config();

        $this->assertIsArray($config);
        $this->assertArrayHasKey('slug',         $config);
        $this->assertArrayHasKey('textDomain',   $config);
        $this->assertArrayHasKey('hookPrefix',   $config);
        $this->assertSame('wpdev-starter', $config['slug']);
        $this->assertSame('wpdev-starter', $config['textDomain']);
        $this->assertSame('wpdev',         $config['hookPrefix']);
    }

    // ------------------------------------------------------------------
    // get_localize_data: same shape as wpdev_get_localize_data().
    // ------------------------------------------------------------------

    public function test_get_localize_data_returns_expected_api_shape(): void
    {
        $data = Assets::get_localize_data();

        $this->assertArrayHasKey('api', $data);
        $this->assertArrayHasKey('url',   $data['api']);
        $this->assertArrayHasKey('nonce', $data['api']);
        $this->assertSame(rest_url(),             $data['api']['url']);
        $this->assertSame(wp_create_nonce('wp_rest'), $data['api']['nonce']);
    }

    public function test_get_localize_data_returns_secondary_api_x_shape(): void
    {
        $config = Assets::read_project_config();
        $data   = Assets::get_localize_data();

        $this->assertArrayHasKey('api_x', $data);
        $this->assertSame(
            rest_url($config['slug'] . '/v1/'),
            $data['api_x']['url']
        );
        $this->assertSame(
            wp_create_nonce($config['hookPrefix'] . '_rest'),
            $data['api_x']['nonce']
        );
    }
}
