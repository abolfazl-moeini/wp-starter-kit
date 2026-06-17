<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for `wpsk_enqueue_bundle_script` and `wpsk_enqueue_bundle_style`.
 *
 * The bootstrap stubs for `wp_register_script` / `wp_enqueue_script` /
 * `wp_enqueue_style` record into `$GLOBALS['wpsk_test_wp_calls']` when the
 * recorder is installed. Each test installs it in `setUp`, then asserts on
 * the captured call shape.
 */
class EnqueueTest extends TestCase
{
    /** @var string */
    private $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        $GLOBALS['wpsk_test_wp_calls'] = [];
        $this->tmpDir = sys_get_temp_dir() . '/wpsk-enqueue-test-' . uniqid('', true);
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->tmpDir);
        unset($GLOBALS['wpsk_test_wp_calls']);
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

    private function callsFor(string $fn): array
    {
        $out = [];
        foreach ($GLOBALS['wpsk_test_wp_calls'] as $call) {
            if ($call['fn'] === $fn) {
                $out[] = $call['args'];
            }
        }
        return $out;
    }

    public function test_enqueue_bundle_script_uses_hash_version_and_merged_deps(): void
    {
        $js = $this->tmpDir . '/bundles/wpsk-starter-deps.js';
        if (!is_dir(dirname($js))) {
            mkdir(dirname($js), 0777, true);
        }
        file_put_contents($js, '/* test */');
        $this->writeAssetFile($js, [
            'dependencies' => ['wp-i18n', 'wp-api-fetch'],
            'hash'         => 'sha-test',
        ]);

        $result = wpsk_enqueue_bundle_script_at($js, ['jquery']);

        $this->assertTrue($result);
        $calls = $this->callsFor('wp_enqueue_script');
        $this->assertCount(1, $calls);
        $args = $calls[0];
        $this->assertSame('wpsk-starter-deps', $args[0]);                                  // handle
        // The fixture lives under sys_get_temp_dir() which is OUTSIDE the
        // plugin root. Per the B-06 contract, resolve_asset_url() returns
        // '' when the file cannot be resolved to a URL we trust. The BC
        // shim then appends '?id=<hash>' to that empty string, producing
        // a relative URL like '?id=sha-test' rather than an absolute 404
        // URL. The previous 'must reference the file name' assertion
        // encoded the old guess-the-subdir bug.
        $this->assertStringContainsString('id=sha-test', $args[1]);                       // cache-bust
        $this->assertSame(['jquery', 'wp-i18n', 'wp-api-fetch'], $args[2]);              // merged deps
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

        $result = wpsk_enqueue_bundle_style_at($css, ['dashicons']);

        $this->assertTrue($result);
        $calls = $this->callsFor('wp_enqueue_style');
        $this->assertCount(1, $calls);
        $args = $calls[0];
        $this->assertSame('theme', $args[0]);                                              // handle (no .css)
        // Same B-06 contract as the script test above: the fixture is
        // outside the plugin root, so resolve_asset_url() returns '' and
        // the helper appends the cache-bust query arg to that empty
        // string. The previous 'theme.css' assertion encoded the old
        // guess-the-subdir bug.
        $this->assertStringContainsString('id=css-hash', $args[1]);
        $this->assertSame(['dashicons', 'bootstrap'], $args[2]);
    }

    public function test_enqueue_bundle_script_without_asset_file_still_returns_true(): void
    {
        $js = $this->tmpDir . '/bundles/no-asset.js';
        if (!is_dir(dirname($js))) {
            mkdir(dirname($js), 0777, true);
        }
        file_put_contents($js, '/* no asset */');
        // intentionally do NOT write the .asset.php companion

        $result = wpsk_enqueue_bundle_script_at($js);

        $this->assertTrue($result);
        $calls = $this->callsFor('wp_enqueue_script');
        $this->assertCount(1, $calls);
        $this->assertSame('no-asset', $calls[0][0]);
        $this->assertStringNotContainsString('id=', $calls[0][1]); // no version → no id param
    }
}
