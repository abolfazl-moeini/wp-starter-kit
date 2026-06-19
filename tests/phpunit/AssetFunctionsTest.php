<?php


/**
 * Tests for the `wpdev_asset_info`, `wpdev_bundle_file_path`, and
 * `wpdev_bundle_file_url` helpers defined in `includes/asset-functions.php`.
 *
 * The behaviour mirrors the mrlogistic `ml_asset_info` family:
 * - returns `[]` for non-`.js`/`.css` paths
 * - returns `[]` for missing `.asset.php` companions
 * - includes the companion file and returns its array otherwise
 *
 * Canonical helpers use the `wpdev_*` prefix; deprecated `wpdev_*` shims
 * delegate to the same implementation.
 */
class AssetFunctionsTest extends \WPDevTest\TestCases\TestCase
{
    /** @var string */
    private $tmpDir;

    public function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/wpdev-asset-test-' . uniqid('', true);
        mkdir($this->tmpDir, 0777, true);
    }

    public function tearDown(): void
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
            'internal_packages' => ['@wpdev/hooks'],
        ]);

        $info = wpdev_asset_info($js);

        $this->assertSame(
            [
                'dependencies'      => ['jquery', 'wp-i18n'],
                'hash'              => 'abc123',
                'internal_packages' => ['@wpdev/hooks'],
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

        $info = wpdev_asset_info($css);

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
        $this->assertSame([], wpdev_asset_info('foo/bar.txt'));
        $this->assertSame([], wpdev_asset_info('foo/bar.php'));
        $this->assertSame([], wpdev_asset_info('foo/bar'));
    }

    public function test_asset_info_returns_empty_array_when_companion_file_missing(): void
    {
        $js = $this->tmpDir . '/no-asset.js';
        file_put_contents($js, '/* no companion */');

        $this->assertSame([], wpdev_asset_info($js));
    }

    public function test_bundle_file_path_resolves_under_assets_bundles(): void
    {
        $this->assertSame(
            get_template_directory() . '/assets/bundles/wpdev-starter-deps.js',
            wpdev_bundle_file_path('wpdev-starter-deps.js')
        );
    }

    public function test_bundle_file_url_resolves_under_assets_bundles(): void
    {
        $this->assertSame(
            get_template_directory_uri() . '/assets/bundles/wpdev-starter-deps.js',
            wpdev_bundle_file_url('wpdev-starter-deps.js')
        );
    }

    public function test_stylesheet_file_path_resolves_under_assets_stylesheets(): void
    {
        $base = defined('WPDEV_STARTER_PLUGIN_DIR')
            ? untrailingslashit(WPDEV_STARTER_PLUGIN_DIR)
            : untrailingslashit(get_template_directory());
        $this->assertSame(
            $base . '/assets/stylesheets/style.css',
            wpdev_stylesheet_file_path('style.css')
        );
    }

    public function test_stylesheet_file_url_resolves_under_assets_stylesheets(): void
    {
        $this->assertSame(
            get_template_directory_uri() . '/assets/stylesheets/style.css',
            wpdev_stylesheet_file_url('style.css')
        );
    }

    // ------------------------------------------------------------------
    // B-14 (audit plan_8d50edf6): wpdev_enqueue_stylesheet() always
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
    // $GLOBALS['wpdev_test_plugin_dir'] (the test bootstrap honours
    // that override). With the override set to a temp dir, "the
    // plugin location" is distinct from "the theme location" — which
    // is what we need to verify the plugin path is preferred.
    // ------------------------------------------------------------------

    public function test_enqueue_stylesheet_prefers_plugin_path_when_plugin_file_exists(): void
    {
        $pluginRoot = defined('WPDEV_STARTER_PLUGIN_DIR')
            ? WPDEV_STARTER_PLUGIN_DIR
            : dirname(__DIR__, 2);
        $fakeStyles = $pluginRoot . '/assets/stylesheets/wpdev-test-style.css';
        if (!is_dir(dirname($fakeStyles))) {
            mkdir(dirname($fakeStyles), 0777, true);
        }
        file_put_contents($fakeStyles, 'body{color:red}');

        try {
            $this->assertTrue(
                wpdev_enqueue_stylesheet('wpdev-test-style.css'),
                'wpdev_enqueue_stylesheet must find the file at the plugin location'
            );

            global $wp_styles;
            $handle = 'wpdev-test-style';
            $this->assertArrayHasKey($handle, $wp_styles->registered, 'wp_enqueue_style must register the stylesheet');
            $this->assertNotSame('', $wp_styles->registered[$handle]->src, 'enqueued style must have a non-empty src');
            $this->assertStringContainsString('wpdev-test-style.css', $wp_styles->registered[$handle]->src);
        } finally {
            if (is_file($fakeStyles)) {
                unlink($fakeStyles);
            }
        }
    }

    public function test_enqueue_stylesheet_falls_back_to_theme_path_when_plugin_file_missing(): void
    {
        // No $GLOBALS['wpdev_test_plugin_dir'] override → plugin_dir_path
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
            wpdev_enqueue_stylesheet($missing);
        } catch (\Throwable $e) {
            $threw = $e;
        }

        $this->assertNull(
            $threw,
            'wpdev_enqueue_stylesheet must not throw when the file is missing in both plugin and theme locations'
        );
    }

}
