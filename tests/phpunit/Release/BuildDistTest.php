<?php
declare(strict_types=1);

namespace WPSK\Tests\Release;

use PHPUnit\Framework\TestCase;

class BuildDistTest extends TestCase
{
    private string $root;

    protected function setUp(): void
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

        $cmd = 'php ' . escapeshellarg($this->root . '/dev/release/build-dist.php');
        exec($cmd . ' 2>&1', $output, $exitCode);

        $this->assertSame(0, $exitCode, implode("\n", $output));
        $this->assertDirectoryExists($distDir);
        $this->assertFileExists($distDir . '/.dist-built');
        $this->assertFileExists($distDir . '/project.config.json');
        // Phase 23.A2 → 23.A6: the framework code (src/Core + src/Support)
        // moved to the wpsk/framework Composer package. The dist
        // installs it via `composer install --no-dev` (deps mode)
        // and Strauss scopes it to vendor-prefixed/. The dist's
        // own src/ no longer carries a vendored copy of the
        // framework — the shim files are also excluded as dead
        // code (they point at packages/framework/ which doesn't
        // exist in the dist).
        $this->assertFileExists(
            $distDir . '/vendor/wpsk/framework/src/Core/Plugin.php',
            'dist must install wpsk/framework into vendor/ (Phase 23.A6 deps mode)'
        );
        $this->assertFileExists(
            $distDir . '/vendor-prefixed/wpsk/framework/src/Core/Plugin.php',
            'dist must run strauss and scope the framework into vendor-prefixed/'
        );
        $this->assertDirectoryDoesNotExist($distDir . '/tests');
        $this->assertDirectoryDoesNotExist($distDir . '/dev');
        $this->assertDirectoryDoesNotExist($distDir . '/node_modules');
    }

    private function removeTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                unlink($path);
            }
        }
        rmdir($dir);
    }
}