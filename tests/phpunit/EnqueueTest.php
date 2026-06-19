<?php

/**
 * Tests for `wpdev_enqueue_bundle_script` and `wpdev_enqueue_bundle_style`.
 */
class EnqueueTest extends \WPDevTest\TestCases\TestCase
{
    /** @var string */
    private $tmpDir;

    public function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/wpdev-enqueue-test-' . uniqid('', true);
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

    private function writeAssetFile(string $absPath, array $data): void
    {
        $assetPath = preg_replace('/\.(js|css)$/', '.asset.php', $absPath);
        $dir = dirname($assetPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($assetPath, '<?php return ' . var_export($data, true) . ';');
    }

    public function test_enqueue_bundle_script_uses_hash_version_and_merged_deps(): void
    {
        $js = $this->tmpDir . '/bundles/wpdev-starter-deps.js';
        if (!is_dir(dirname($js))) {
            mkdir(dirname($js), 0777, true);
        }
        file_put_contents($js, '/* test */');
        $this->writeAssetFile($js, [
            'dependencies' => ['wp-i18n', 'wp-api-fetch'],
            'hash'         => 'sha-test',
        ]);

        $result = wpdev_enqueue_bundle_script_at($js, ['jquery']);

        $this->assertTrue($result);
        global $wp_scripts;
        $handle = 'wpdev-starter-deps';
        $this->assertArrayHasKey($handle, $wp_scripts->registered, 'Script must be registered');
        $registered = $wp_scripts->registered[$handle];
        $this->assertStringContainsString('id=sha-test', $registered->src, 'Script src must contain cache-bust id');
        $this->assertSame(['jquery', 'wp-i18n', 'wp-api-fetch'], $registered->deps, 'Script deps must be merged');
    }

    public function test_enqueue_bundle_style_uses_hash_version_and_merged_deps(): void
    {
        $css = $this->tmpDir . '/bundles/theme.css';
        if (!is_dir(dirname($css))) {
            mkdir(dirname($css), 0777, true);
        }
        file_put_contents($css, 'body{}');
        $this->writeAssetFile($css, [
            'dependencies' => ['bootstrap'],
            'hash'         => 'css-hash',
        ]);

        $result = wpdev_enqueue_bundle_style_at($css, ['dashicons']);

        $this->assertTrue($result);
        global $wp_styles;
        $handle = 'theme';
        $this->assertArrayHasKey($handle, $wp_styles->registered, 'Style must be registered');
        $registered = $wp_styles->registered[$handle];
        $this->assertStringContainsString('id=css-hash', $registered->src, 'Style src must contain cache-bust id');
        $this->assertSame(['dashicons', 'bootstrap'], $registered->deps, 'Style deps must be merged');
    }

    public function test_enqueue_bundle_script_without_asset_file_still_returns_true(): void
    {
        $js = $this->tmpDir . '/bundles/no-asset.js';
        if (!is_dir(dirname($js))) {
            mkdir(dirname($js), 0777, true);
        }
        file_put_contents($js, '/* no asset */');

        $result = wpdev_enqueue_bundle_script_at($js);

        $this->assertTrue($result);
        global $wp_scripts;
        $handle = 'no-asset';
        $this->assertArrayHasKey($handle, $wp_scripts->registered, 'Script must be registered even without asset file');
        $this->assertStringNotContainsString('id=', $wp_scripts->registered[$handle]->src, 'No asset file → no id= cache-bust');
    }
}