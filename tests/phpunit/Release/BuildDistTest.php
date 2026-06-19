<?php
declare(strict_types=1);

namespace WPDev\Tests\Release;


class BuildDistTest extends \WPDevTest\TestCases\TestCase
{
    private string $root;

    public function setUp(): void
    {
        parent::setUp();
        $this->root = dirname(__DIR__, 3);
    }

    public function test_build_dist_script_exists(): void
    {
        $this->assertFileExists($this->root . '/dev/release/build-dist.php');
    }

    public function test_release_dist_creates_dist_tree_with_marker(): void
    {
        $config = json_decode(
            (string) file_get_contents($this->root . '/project.config.json'),
            true
        );
        $slug = $config['slug'];
        $distDir = $this->root . '/dist/' . $slug;

        if (is_dir($distDir)) {
            $this->removeTree($distDir);
        }

        $cmd = 'php ' . escapeshellarg($this->root . '/dev/release/build-dist.php') . ' --skip-freshness';
        exec($cmd . ' 2>&1', $output, $exitCode);

        $this->assertSame(0, $exitCode, implode("\n", $output));
        $this->assertDirectoryExists($distDir);
        $this->assertFileExists($distDir . '/.dist-built');
        $this->assertFileExists($distDir . '/project.config.json');
        $this->assertFileExists(
            $distDir . '/vendor-prefixed/wpdev/framework/src/Core/Plugin.php',
            'dist must run Strauss and scope the framework into vendor-prefixed/'
        );
        $this->assertDirectoryDoesNotExist($distDir . '/tests');
        $this->assertDirectoryDoesNotExist($distDir . '/dev');
        $this->assertDirectoryDoesNotExist($distDir . '/node_modules');
        if (is_dir($this->root . '/packages/wpdev-framework/vendor')) {
            $this->assertDirectoryDoesNotExist(
                $distDir . '/packages/wpdev-framework/vendor',
                'nested vendor/ trees must be excluded from dist copies'
            );
        }
    }

    private function removeTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        exec('rm -rf ' . escapeshellarg($dir));
    }
}