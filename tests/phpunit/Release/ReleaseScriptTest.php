<?php
declare(strict_types=1);

namespace WPDev\Tests\Release;

use PHPUnit\Framework\TestCase;

class ReleaseScriptTest extends TestCase
{
    public function test_release_script_runs_rector_prefix_and_fix_autoloader(): void
    {
        $root = dirname(__DIR__, 3);
        $composer = json_decode(
            (string) file_get_contents($root . '/composer.json'),
            true
        );

        $this->assertArrayHasKey('release', $composer['scripts']);
        $release = $composer['scripts']['release'];
        $this->assertIsArray($release);
        $this->assertContains('@rector:prefix', $release);
        $this->assertTrue(
            in_array('@php ./dev/fix-autoloader.php', $release, true),
            'release script must run fix-autoloader.php'
        );
    }

    public function test_release_dist_script_points_to_build_dist(): void
    {
        $root = dirname(__DIR__, 3);
        $composer = json_decode(
            (string) file_get_contents($root . '/composer.json'),
            true
        );

        $this->assertArrayHasKey('release:dist', $composer['scripts']);
        $this->assertStringContainsString(
            'build-dist.php',
            $composer['scripts']['release:dist']
        );
    }
}