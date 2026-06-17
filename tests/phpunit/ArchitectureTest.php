<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Locks the composer test:architecture contract for feature modules.
 */
class ArchitectureTest extends TestCase
{
    public function test_every_src_module_has_a_phpunit_test(): void
    {
        $root = dirname(__DIR__, 2);
        $script = $root . '/dev/test-architecture.php';
        $this->assertFileExists($script);

        $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script);
        exec($cmd, $output, $exitCode);

        $this->assertSame(
            0,
            $exitCode,
            "test-architecture failed:\n" . implode("\n", $output)
        );
    }
}