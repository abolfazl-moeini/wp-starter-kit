<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;

class PackageMetadataTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        if (PHP_VERSION_ID < 80100) {
            $this->markTestSkipped('Fault tolerance package requires PHP 8.1+');
        }
        $this->root = dirname(__DIR__, 3);
    }

    public function test_package_composer_json_exists_with_psr4_namespace(): void
    {
        $path = $this->root . '/packages/php-fault-tolerance/composer.json';
        $this->assertFileExists($path);
        $json = json_decode((string) file_get_contents($path), true);
        $this->assertGreaterThanOrEqual('8.1', $json['require']['php']);
        $this->assertArrayHasKey('WPDev\\FaultTolerance\\', $json['autoload']['psr-4']);
    }

    public function test_root_composer_autoloads_fault_tolerance_namespace(): void
    {
        $composer = json_decode(
            (string) file_get_contents($this->root . '/composer.json'),
            true
        );
        $this->assertArrayHasKey(
            'WPDev\\FaultTolerance\\',
            $composer['autoload']['psr-4']
        );
    }
}