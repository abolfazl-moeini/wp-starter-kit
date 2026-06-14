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
}
