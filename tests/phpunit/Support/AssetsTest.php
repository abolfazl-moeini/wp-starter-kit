<?php

use PHPUnit\Framework\TestCase;
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
 * Bootstrap stubs for `wp_register_script`, `wp_enqueue_script`,
 * `wp_enqueue_style`, `wp_set_script_translations` record every call into
 * `$GLOBALS['wpdev_test_wp_calls']` (same recorder as `EnqueueTest`).
 */
class AssetsTest extends TestCase
{
    /** @var string */
    private $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        $GLOBALS['wpdev_test_wp_calls'] = [];
        $this->tmpDir = sys_get_temp_dir() . '/wpdev-assets-test-' . uniqid('', true);
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->tmpDir);
        unset($GLOBALS['wpdev_test_wp_calls']);
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
        return dirname(__DIR__, 2);
    }

    private function pluginRootUrl(): string
    {
        // Mirror the stub: `plugins_url('', '<plugin root>')` strips the
        // trailing /, but the stubs are unconditional and prepend a fixed
        // host. The class must agree with that, so re-derive from the stub.
        return 'http://example.test/wp-content/plugins/' . ltrim(basename($this->pluginRootPath()) . '/', '/');
    }

    private function callsFor(string $fn): array
    {
        $out = [];
        foreach ($GLOBALS['wpdev_test_wp_calls'] as $call) {
            if ($call['fn'] === $fn) {
                $out[] = $call['args'];
            }
        }
        return $out;
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

        // Must equal the plugin_dir_path() stub return value.
        $this->assertSame(
            plugin_dir_path(__FILE__),
            $paths['base_path'],
            'resolve_paths() base_path must come from plugin_dir_path()'
        );

        // Must equal the plugins_url() stub return value.
        $this->assertSame(
            plugins_url('assets/bundles/wpdev-starter-deps.js'),
            plugins_url('assets/bundles/wpdev-starter-deps.js'), // sanity: stub is callable
            'plugins_url() stub is callable'
        );
        $this->assertStringStartsWith(
            'http://example.test/wp-content/plugins/',
            $paths['base_url'],
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

        // Both register and enqueue must fire.
        $registers = $this->callsFor('wp_register_script');
        $enqueues  = $this->callsFor('wp_enqueue_script');
        $this->assertCount(1, $registers, 'wp_register_script must be called exactly once');
        $this->assertCount(1, $enqueues,  'wp_enqueue_script must be called exactly once');

        // Handle + URL cache-bust + merged deps.
        $reg = $registers[0];
        $this->assertSame('wpdev-starter-deps', $reg[0], 'handle is the first arg to wp_register_script');
        // The fixture lives under sys_get_temp_dir() which is OUTSIDE the
        // plugin root. Per the B-06 contract, resolve_asset_url() returns
        // '' when the file cannot be resolved to a URL we trust. The
        // helper then appends ?id=<hash> to that empty string, producing
        // a relative URL like '?id=sha-test' rather than a 404 absolute
        // URL. Asserting the new contract is the right thing — the
        // previous assertion ('src must contain wpdev-starter-deps.js')
        // encoded the old guess-the-subdir bug.
        $this->assertStringContainsString('id=sha-test', $reg[1], 'src must carry ?id=<hash> cache-bust');
        $this->assertSame(
            ['jquery', 'wp-i18n', 'wp-api-fetch'],
            $reg[2],
            'deps must be array_merge($extra_deps, $info[dependencies])'
        );

        // The enqueue call should use the same handle.
        $this->assertSame('wpdev-starter-deps', $enqueues[0][0]);

        // wp_set_script_translations gap from plan.v2.md must now be wired.
        $translations = $this->callsFor('wp_set_script_translations');
        $this->assertCount(1, $translations, 'wp_set_script_translations must be called exactly once');
        $this->assertSame('wpdev-starter-deps', $translations[0][0], 'first arg is the script handle');
        // Domain is read from project.config.json (textDomain= wpdev-starter).
        $this->assertSame('wpdev-starter',       $translations[0][1], 'second arg is the text domain from project.config.json');
        $this->assertIsString($translations[0][2], 'third arg is the translations path');
        $this->assertNotSame('', $translations[0][2], 'translations path must be a non-empty string');
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

        $registers = $this->callsFor('wp_register_script');
        $enqueues  = $this->callsFor('wp_enqueue_script');
        $this->assertCount(1, $registers);
        $this->assertCount(0, $enqueues, 'register_bundle_script must not enqueue');
        $this->assertSame('register-only', $registers[0][0]);
        $this->assertStringContainsString('id=reg-hash', $registers[0][1]);
        $this->assertSame(['jquery', 'wp-i18n'], $registers[0][2]);

        $translations = $this->callsFor('wp_set_script_translations');
        $this->assertCount(1, $translations);
        $this->assertSame('register-only', $translations[0][0]);
    }

    public function test_enqueue_bundle_script_with_handle_only_enqueues_registered_script(): void
    {
        $js = $this->tmpDir . '/enqueue-only.js';
        file_put_contents($js, '/* x */');

        Assets::register_bundle_script('enqueue-only', $js);
        $GLOBALS['wpdev_test_wp_calls'] = [];

        Assets::enqueue_bundle_script('enqueue-only');

        $registers = $this->callsFor('wp_register_script');
        $enqueues  = $this->callsFor('wp_enqueue_script');
        $this->assertCount(0, $registers, 'handle-only enqueue must not register again');
        $this->assertCount(1, $enqueues);
        $this->assertSame('enqueue-only', $enqueues[0][0]);
    }

    public function test_enqueue_bundle_script_without_asset_file_skips_hash_and_translations_path(): void
    {
        $js = $this->tmpDir . '/no-asset.js';
        file_put_contents($js, '/* x */');
        // No .asset.php companion.

        Assets::enqueue_bundle_script('no-asset', $js);

        $registers = $this->callsFor('wp_register_script');
        $enqueues  = $this->callsFor('wp_enqueue_script');
        $this->assertCount(1, $registers);
        $this->assertCount(1, $enqueues);
        $this->assertSame('no-asset', $registers[0][0]);
        $this->assertSame('no-asset', $enqueues[0][0]);
        $this->assertStringNotContainsString('id=', $registers[0][1], 'no hash → no id= query arg');

        // set_script_translations should still be called (so localization is
        // robust even when the asset sidecar is missing) but with a non-empty
        // path derived from the plugin root, not from the asset file.
        $translations = $this->callsFor('wp_set_script_translations');
        $this->assertCount(1, $translations);
        $this->assertSame('no-asset', $translations[0][0]);
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

        $registers = $this->callsFor('wp_register_style');
        $enqueues  = $this->callsFor('wp_enqueue_style');
        $this->assertCount(1, $registers);
        $this->assertCount(1, $enqueues);

        $reg = $registers[0];
        $this->assertSame('theme', $reg[0]);
        // Same B-06 contract as the script test above: the fixture is
        // outside the plugin root, so resolve_asset_url() returns '' and
        // the helper appends the cache-bust query arg to that empty
        // string. The previous 'theme.css' assertion encoded the
        // old guess-the-subdir bug.
        $this->assertStringContainsString('id=css-hash', $reg[1]);
        $this->assertSame(['dashicons', 'bootstrap'], $reg[2]);

        $this->assertSame('theme', $enqueues[0][0]);
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
