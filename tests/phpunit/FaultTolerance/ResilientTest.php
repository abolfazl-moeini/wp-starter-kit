<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPDev\FaultTolerance\Resilient;

class ResilientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (PHP_VERSION_ID < 80100) {
            $this->markTestSkipped('Fault tolerance package requires PHP 8.1+');
        }
    }

    public function test_retries_then_succeeds(): void
    {
        $attempts = 0;
        $value = Resilient::resilient(static function () use (&$attempts): string {
            $attempts++;
            if ($attempts < 2) {
                throw new \RuntimeException('retry');
            }
            return 'ok';
        }, ['retries' => 2]);

        $this->assertSame('ok', $value);
        $this->assertSame(2, $attempts);
    }

    public function test_global_resilient_function_exists(): void
    {
        $this->assertTrue(function_exists('resilient'));
        $this->assertSame('done', resilient(static fn (): string => 'done'));
    }
}