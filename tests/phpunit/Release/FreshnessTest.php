<?php
declare(strict_types=1);

namespace WPDev\Tests\Release;


class FreshnessTest extends \WPDevTest\TestCases\TestCase
{
    private string $tmp;

    public function setUp(): void
    {
        parent::setUp();
        $this->tmp = sys_get_temp_dir() . '/wpdev-freshness-' . uniqid('', true);
        mkdir($this->tmp, 0755, true);
        require_once dirname(__DIR__, 3) . '/dev/release/freshness.php';
    }

    public function tearDown(): void
    {
        if (is_dir($this->tmp)) {
            exec('rm -rf ' . escapeshellarg($this->tmp));
        }
        parent::tearDown();
    }

    public function test_stale_bundle_is_detected(): void
    {
        $entryDir = $this->tmp . '/src/Modules/TestMod/assets/entries';
        $bundleDir = $this->tmp . '/assets/bundles';
        mkdir($entryDir, 0755, true);
        mkdir($bundleDir, 0755, true);

        $entry = $entryDir . '/admin.ts';
        $bundle = $bundleDir . '/TestMod-admin.js';
        file_put_contents($entry, "export {};\n");
        file_put_contents($bundle, "/* stale */\n");

        touch($bundle, time() - 3600);
        touch($entry, time() + 3600);

        $this->assertFalse(wpdev_check_build_freshness($this->tmp));
    }

    public function test_fresh_bundle_passes(): void
    {
        $entryDir = $this->tmp . '/src/Modules/TestMod/assets/entries';
        $bundleDir = $this->tmp . '/assets/bundles';
        mkdir($entryDir, 0755, true);
        mkdir($bundleDir, 0755, true);

        $entry = $entryDir . '/admin.ts';
        $bundle = $bundleDir . '/TestMod-admin.js';
        file_put_contents($entry, "export {};\n");
        file_put_contents($bundle, "/* fresh */\n");

        touch($entry, time() - 3600);
        touch($bundle, time());

        $this->assertTrue(wpdev_check_build_freshness($this->tmp));
    }
}