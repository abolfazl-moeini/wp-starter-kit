<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class FunctionsAutoloadTest extends TestCase
{
    public function test_functions_file_noops_below_php_81(): void
    {
        if (PHP_VERSION_ID >= 80100) {
            $this->markTestSkipped('Requires PHP < 8.1 to verify no-op guard');
        }

        $path = dirname(__DIR__, 3) . '/packages/php-fault-tolerance/src/functions.php';
        require_once $path;
        $this->assertFalse(function_exists('resilient'));
        $this->assertFalse(function_exists('http_batch'));
    }
}