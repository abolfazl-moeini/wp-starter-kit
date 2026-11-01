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
        $bundleJs = $bundleDir . '/TestMod-admin.js';
        $bundlePhp = $bundleDir . '/TestMod-admin.asset.php';
        file_put_contents($entry, "export {};\n");
        file_put_contents($bundleJs, "/* stale */\n");
        file_put_contents($bundlePhp, "<?php return [];\n");

        touch($bundleJs, time() - 3600);
        touch($bundlePhp, time() - 3600);
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
        $bundleJs = $bundleDir . '/TestMod-admin.js';
        $bundlePhp = $bundleDir . '/TestMod-admin.asset.php';
        file_put_contents($entry, "export {};\n");
        file_put_contents($bundleJs, "/* fresh */\n");
        file_put_contents($bundlePhp, "<?php return [];\n");

        touch($entry, time() - 3600);
        touch($bundleJs, time());
        touch($bundlePhp, time());

        $this->assertTrue(wpdev_check_build_freshness($this->tmp));
    }

    public function test_tsx_entry_is_checked_and_stale_detected(): void
    {
        $entryDir = $this->tmp . '/src/Modules/TestMod/assets/entries';
        $bundleDir = $this->tmp . '/assets/bundles';
        mkdir($entryDir, 0755, true);
        mkdir($bundleDir, 0755, true);

        $entry = $entryDir . '/ui.tsx';
        $bundleJs = $bundleDir . '/TestMod-ui.js';
        $bundlePhp = $bundleDir . '/TestMod-ui.asset.php';
        file_put_contents($entry, "export const X = () => null;\n");
        file_put_contents($bundleJs, "/* js */\n");
        file_put_contents($bundlePhp, "<?php return [];\n");

        touch($bundleJs, time() - 3600);
        touch($bundlePhp, time() - 3600);
        touch($entry, time());

        $this->assertFalse(wpdev_check_build_freshness($this->tmp));
    }

    public function test_imported_sub_asset_change_triggers_staleness(): void
    {
        $entryDir = $this->tmp . '/src/Modules/TestMod/assets/entries';
        $compDir = $this->tmp . '/src/Modules/TestMod/assets/components';
        $bundleDir = $this->tmp . '/assets/bundles';
        mkdir($entryDir, 0755, true);
        mkdir($compDir, 0755, true);
        mkdir($bundleDir, 0755, true);

        $entry = $entryDir . '/main.ts';
        $comp = $compDir . '/Button.tsx';
        $bundleJs = $bundleDir . '/TestMod-main.js';
        $bundlePhp = $bundleDir . '/TestMod-main.asset.php';
        file_put_contents($entry, "import './components/Button';\n");
        file_put_contents($comp, "export const Button = () => null;\n");
        file_put_contents($bundleJs, "/* bundle */\n");
        file_put_contents($bundlePhp, "<?php return [];\n");

        // Entry is older than bundle, but sub-component was modified after bundle
        touch($entry, time() - 3600);
        touch($bundleJs, time() - 1800);
        touch($bundlePhp, time() - 1800);
        touch($comp, time());

        $this->assertFalse(wpdev_check_build_freshness($this->tmp));
    }

    public function test_missing_asset_php_fails_freshness(): void
    {
        $entryDir = $this->tmp . '/src/Modules/TestMod/assets/entries';
        $bundleDir = $this->tmp . '/assets/bundles';
        mkdir($entryDir, 0755, true);
        mkdir($bundleDir, 0755, true);

        $entry = $entryDir . '/admin.ts';
        $bundleJs = $bundleDir . '/TestMod-admin.js';
        file_put_contents($entry, "export {};\n");
        file_put_contents($bundleJs, "/* fresh js */\n");

        touch($entry, time() - 3600);
        touch($bundleJs, time());

        // bundlePhp is missing!
        $this->assertFalse(wpdev_check_build_freshness($this->tmp));
    }
}
