<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use WPDev\FaultTolerance\Resilient;

class ResilientTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
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

    public function test_honors_delay_ms(): void
    {
        $attempts = 0;
        $start = microtime(true);
        try {
            Resilient::resilient(static function () use (&$attempts): string {
                $attempts++;
                throw new \RuntimeException('retry');
            }, ['retries' => 2, 'delayMs' => 10]);
        } catch (\Throwable $e) {
            // expected
        }
        $elapsed = (microtime(true) - $start) * 1000;
        $this->assertGreaterThanOrEqual(20, $elapsed);
    }
}