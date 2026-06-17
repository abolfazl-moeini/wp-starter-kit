<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for the `wpsk_asset_info`, `wpsk_bundle_file_path`, and
 * `wpsk_bundle_file_url` helpers defined in `includes/asset-functions.php`.
 *
 * The behaviour mirrors the mrlogistic `ml_asset_info` family:
 * - returns `[]` for non-`.js`/`.css` paths
 * - returns `[]` for missing `.asset.php` companions
 * - includes the companion file and returns its array otherwise
 *
 * Prefix is `wpsk_` (read from `project.config.json` in the live code; tests
 * reference the public function names directly).
 */
class AssetFunctionsTest extends TestCase
{
    /** @var string */
    private $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        // Reset the WP call log so the test bootstrap's wp_enqueue_*
        // shims (which check isset() before pushing) actually record
        // calls. Without this, $GLOBALS['wpsk_test_wp_calls'] is
        // never initialized in this test's process and stays empty
        // for the whole run.
        if (function_exists('wpsk_test_reset_wp_state')) {
            wpsk_test_reset_wp_state();
        }
        $this->tmpDir = sys_get_temp_dir() . '/wpsk-asset-test-' . uniqid('', true);
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->tmpDir);
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

    private function writeAssetFile(string $jsPath, array $data): string
    {
        $assetPath = preg_replace('/\.(js|css)$/', '.asset.php', $jsPath);
        $php = '<?php return ' . var_export($data, true) . ';';
        file_put_contents($assetPath, $php);
        return $assetPath;
    }

    public function test_asset_info_reads_companion_asset_php_for_js_path(): void
    {
        $js = $this->tmpDir . '/foo/bar.js';
        mkdir(dirname($js), 0777, true);
        file_put_contents($js, '/* foo */');
        $this->writeAssetFile($js, [
            'dependencies'      => ['jquery', 'wp-i18n'],
            'hash'              => 'abc123',
            'internal_packages' => ['@wpsk/hooks'],
        ]);

        $info = wpsk_asset_info($js);

        $this->assertSame(
            [
                'dependencies'      => ['jquery', 'wp-i18n'],
                'hash'              => 'abc123',
                'internal_packages' => ['@wpsk/hooks'],
            ],
            $info
        );
    }

    public function test_asset_info_reads_companion_asset_php_for_css_path(): void
    {
        $css = $this->tmpDir . '/style.css';
        file_put_contents($css, 'body{}');
        $this->writeAssetFile($css, [
            'dependencies' => ['bootstrap'],
            'hash'         => 'deadbeef',
        ]);

        $info = wpsk_asset_info($css);

        $this->assertSame(
            [
                'dependencies' => ['bootstrap'],
                'hash'         => 'deadbeef',
            ],
            $info
        );
    }

    public function test_asset_info_returns_empty_array_for_non_js_or_css_path(): void
    {
        $this->assertSame([], wpsk_asset_info('foo/bar.txt'));
        $this->assertSame([], wpsk_asset_info('foo/bar.php'));
        $this->assertSame([], wpsk_asset_info('foo/bar'));
    }

    public function test_asset_info_returns_empty_array_when_companion_file_missing(): void
    {
        $js = $this->tmpDir . '/no-asset.js';
        file_put_contents($js, '/* no companion */');

        $this->assertSame([], wpsk_asset_info($js));
    }

    public function test_bundle_file_path_resolves_under_assets_bundles(): void
    {
        $this->assertSame(
            get_template_directory() . '/assets/bundles/wpsk-starter-deps.js',
            wpsk_bundle_file_path('wpsk-starter-deps.js')
        );
    }

    public function test_bundle_file_url_resolves_under_assets_bundles(): void
    {
        $this->assertSame(
            get_template_directory_uri() . '/assets/bundles/wpsk-starter-deps.js',
            wpsk_bundle_file_url('wpsk-starter-deps.js')
        );
    }

    public function test_stylesheet_file_path_resolves_under_assets_stylesheets(): void
    {
        $this->assertSame(
            get_template_directory() . '/assets/stylesheets/style.css',
            wpsk_stylesheet_file_path('style.css')
        );
    }

    public function test_stylesheet_file_url_resolves_under_assets_stylesheets(): void
    {
        $this->assertSame(
            get_template_directory_uri() . '/assets/stylesheets/style.css',
            wpsk_stylesheet_file_url('style.css')
        );
    }

    // ------------------------------------------------------------------
    // B-14 (audit plan_8d50edf6): wpsk_enqueue_stylesheet() always
    // resolved through get_template_directory(), which returns the
    // active theme's directory. When wp-starter-kit is installed as a
    // plugin, the stylesheet lives under the plugin root, not the
    // theme root — and the previous code silently enqueued a 404 URL.
    //
    // The fix: when the file exists at the plugin location, use it;
    // otherwise fall back to the theme location for backward
    // compatibility with theme-based installs.
    //
    // The two tests below override plugin_dir_path() through
    // $GLOBALS['wpsk_test_plugin_dir'] (the test bootstrap honours
    // that override). With the override set to a temp dir, "the
    // plugin location" is distinct from "the theme location" — which
    // is what we need to verify the plugin path is preferred.
    // ------------------------------------------------------------------

    public function test_enqueue_stylesheet_prefers_plugin_path_when_plugin_file_exists(): void
    {
        // Simulate a plugin installed at a separate location by
        // defining WPSK_STARTER_PLUGIN_DIR and overriding plugin_dir_path()
        // through $GLOBALS['wpsk_test_plugin_dir']. The fake plugin
        // has its own assets/stylesheets/ subdir with a fixture file.
        $fakePlugin = $this->tmpDir . '/fake-plugin';
        $fakeStyles = $fakePlugin . '/assets/stylesheets/style.css';
        mkdir(dirname($fakeStyles), 0777, true);
        file_put_contents($fakeStyles, 'body{color:red}');
        if (!defined('WPSK_STARTER_PLUGIN_DIR')) {
            define('WPSK_STARTER_PLUGIN_DIR', $fakePlugin);
        }
        $GLOBALS['wpsk_test_plugin_dir'] = $fakePlugin;
        $GLOBALS['wpsk_test_wp_calls']   = [];

        try {
            // With the fix, the function locates the file at the plugin
            // path (because realpath(file) is inside the plugin root)
            // and returns true. Without the fix, it would look at
            // get_template_directory() (the test bootstrap returns the
            // project root for that), the file wouldn't be there, and
            // the function would fall back to enqueue_legacy_bundle_style
            // with a non-resolvable path — which surfaces as a "false"
            // result in the test wp-call log.
            $this->assertTrue(
                wpsk_enqueue_stylesheet('style.css'),
                'wpsk_enqueue_stylesheet must find the file at the plugin location'
            );

            // The enqueue must have been called with a non-empty URL
            // that points at the stylesheet basename — proving the
            // plugin-path lookup produced a usable URL, not an empty
            // string (which is what the un-fixed code would yield when
            // the file is outside the plugin root).
            $enqueues = array_values(array_filter(
                $GLOBALS['wpsk_test_wp_calls'] ?? [],
                static fn(array $c): bool => ($c['fn'] ?? '') === 'wp_enqueue_style'
            ));
            $this->assertNotEmpty($enqueues, 'wp_enqueue_style must have been called');
            $url = $enqueues[0]['args'][1] ?? '';
            $this->assertNotSame(
                '',
                $url,
                'wp_enqueue_style must have been called with a non-empty URL (proves the resolver found the file at the plugin path)'
            );
            $this->assertStringContainsString(
                'style.css',
                $url,
                'enqueued URL must reference the stylesheet basename'
            );
        } finally {
            unset($GLOBALS['wpsk_test_plugin_dir'], $GLOBALS['wpsk_test_wp_calls']);
        }
    }

    public function test_enqueue_stylesheet_falls_back_to_theme_path_when_plugin_file_missing(): void
    {
        // No $GLOBALS['wpsk_test_plugin_dir'] override → plugin_dir_path
        // returns the test project root, which we deliberately do NOT
        // populate with a fixture. Theme path (get_template_directory
        // also returns the project root in the test stub) likewise has
        // no fixture. So the file is missing everywhere and the
        // resolver falls through. This test pins the BC fallback: the
        // function must NOT throw — it returns the boolean from the
        // enqueue helper (which is permissive in the test bootstrap).
        // What we assert is "no exception", because the original bug
        // surfaced as a fatal "file does not exist" when the wrong
        // path was used.
        $missing = 'definitely-not-shipped-' . uniqid('', true) . '.css';

        $threw = null;
        try {
            wpsk_enqueue_stylesheet($missing);
        } catch (\Throwable $e) {
            $threw = $e;
        }

        $this->assertNull(
            $threw,
            'wpsk_enqueue_stylesheet must not throw when the file is missing in both plugin and theme locations'
        );
    }
}
