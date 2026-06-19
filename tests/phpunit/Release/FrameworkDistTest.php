<?php
/**
 * Phase 23.A5 + 23.A6 — release dist scopes the framework.
 */
declare(strict_types=1);

namespace WPDev\Tests\Release;


class FrameworkDistTest extends \WPDevTest\TestCases\TestCase
{
    private string $root;

    public function setUp(): void
    {
        parent::setUp();
        $this->root = dirname(__DIR__, 3);
    }

    /**
     * @return array{0:string,1:int,2:list<string>}
     */
    private function runBuildDist(): array
    {
        $config = json_decode(
            (string) file_get_contents($this->root . '/project.config.json'),
            true
        );
        $slug = $config['slug'] ?? 'wpdev-starter';
        $distDir = $this->root . '/dist/' . $slug;

        if (is_dir($distDir)) {
            $this->removeTree($distDir);
        }

        $cmd = 'php ' . escapeshellarg($this->root . '/dev/release/build-dist.php') . ' --skip-freshness';
        exec($cmd . ' 2>&1', $output, $exitCode);

        return [$distDir, $exitCode, $output];
    }

    public function test_build_dist_emits_composer_json_that_requires_wpdev_framework(): void
    {
        [$distDir, $exitCode, $output] = $this->runBuildDist();

        $this->assertSame(
            0,
            $exitCode,
            "build-dist.php failed:\n" . implode("\n", $output)
        );

        $distComposer = $distDir . '/composer.json';
        $this->assertFileExists($distComposer, 'dist must contain composer.json');

        $composer = json_decode((string) file_get_contents($distComposer), true);
        $this->assertIsArray($composer);
        $this->assertArrayHasKey('require', $composer);
        $this->assertArrayHasKey('wpdev/framework', $composer['require']);

        $hasPathRepo = false;
        foreach ($composer['repositories'] ?? [] as $repo) {
            if (($repo['type'] ?? null) === 'path') {
                $hasPathRepo = true;
                break;
            }
        }
        $this->assertTrue($hasPathRepo, 'dist composer.json must include a path repository');

        $this->assertArrayHasKey('extra', $composer);
        $this->assertArrayHasKey('strauss', $composer['extra']);
        $this->assertSame(
            ['wpdev/framework'],
            $composer['extra']['strauss']['packages'] ?? null,
            'Strauss config must whitelist only wpdev/framework'
        );
    }

    public function test_build_dist_emits_strauss_json_without_wpdev_exclusion(): void
    {
        [$distDir, $exitCode, $output] = $this->runBuildDist();
        $this->assertSame(0, $exitCode, "build-dist failed:\n" . implode("\n", $output));

        $straussPath = $distDir . '/strauss.json';
        $this->assertFileExists($straussPath);

        $strauss = json_decode((string) file_get_contents($straussPath), true);
        $this->assertIsArray($strauss);

        $excluded = $strauss['exclude_from_prefix']['namespaces'] ?? [];
        $this->assertNotContains(
            'WPDev',
            $excluded,
            'dist strauss.json must NOT exclude WPDev when the framework is a dependency'
        );
    }

    public function test_build_dist_installs_and_scopes_wpdev_framework(): void
    {
        [$distDir, $exitCode, $output] = $this->runBuildDist();
        $this->assertSame(0, $exitCode, "build-dist failed:\n" . implode("\n", $output));

        $config = json_decode(
            (string) file_get_contents($this->root . '/project.config.json'),
            true
        );
        $vendorPrefix = $config['vendorPrefix'] ?? 'WpdevVendor';

        $scoped = $distDir . '/vendor-prefixed/wpdev/framework/src/Core/Plugin.php';
        $this->assertFileExists(
            $scoped,
            'dist must run Strauss and scope the framework into vendor-prefixed/'
        );

        $body = (string) file_get_contents($scoped);
        $expectedNs = $vendorPrefix . '\\WPDev';
        $this->assertStringContainsString(
            'namespace ' . $expectedNs,
            $body,
            "Scoped framework Plugin.php must declare namespace {$expectedNs}"
        );
    }

    private function removeTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        // Nested .git dirs (e.g. mcp-integration submodule) break pure PHP rmdir.
        exec('rm -rf ' . escapeshellarg($dir));
    }
}