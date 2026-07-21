<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

class PackageMetadataTest extends \WPDevTest\TestCases\TestCase
{
    private string $root;

    public function setUp(): void
    {
        parent::setUp();
        $this->root = dirname(__DIR__, 3);
    }

    public function test_package_composer_json_allows_php_74_and_files_bootstrap(): void
    {
        $path = $this->root . '/packages/php-fault-tolerance/composer.json';
        $this->assertFileExists($path);
        $json = json_decode((string) file_get_contents($path), true);
        $this->assertSame('>=7.4', $json['require']['php']);
        $this->assertContains(
            'src/bootstrap.php',
            $json['autoload']['files'] ?? []
        );
        $this->assertArrayNotHasKey(
            'psr-4',
            $json['autoload'] ?? [],
            'Dual Real/Stub trees must not use a single PSR-4 root'
        );
    }

    public function test_root_composer_boots_fault_tolerance_via_files(): void
    {
        $composer = json_decode(
            (string) file_get_contents($this->root . '/composer.json'),
            true
        );
        $files = $composer['autoload']['files'] ?? [];
        $this->assertTrue(
            (bool) array_filter(
                $files,
                static function ($f) {
                    return is_string($f) && str_contains($f, 'php-fault-tolerance/src/bootstrap.php');
                }
            ),
            'Root composer must load FT bootstrap.php'
        );
        $this->assertArrayNotHasKey(
            'WPDev\\FaultTolerance\\',
            $composer['autoload']['psr-4'] ?? []
        );
    }

    public function test_real_and_stub_trees_exist(): void
    {
        $base = $this->root . '/packages/php-fault-tolerance/src';
        foreach (['Real', 'Stub'] as $tree) {
            foreach (
                [
                    'CircuitBreaker.php',
                    'CircuitState.php',
                    'HttpClient.php',
                    'Resilient.php',
                    'FaultTolerance.php',
                ] as $file
            ) {
                $this->assertFileExists($base . '/' . $tree . '/' . $file);
            }
        }
    }
}
