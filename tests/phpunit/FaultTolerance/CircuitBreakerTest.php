<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPDev\FaultTolerance\CircuitBreaker;
use WPDev\FaultTolerance\CircuitState;

class CircuitBreakerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (PHP_VERSION_ID < 80100) {
            $this->markTestSkipped('Fault tolerance package requires PHP 8.1+');
        }
        wpdev_test_reset_wp_state();
    }

    public function test_starts_closed_and_opens_after_threshold(): void
    {
        $breaker = new CircuitBreaker('demo', 2, 30, 'fallback');

        $this->assertSame(CircuitState::Closed, $breaker->state());

        $this->assertSame('fallback', $breaker->call(static function (): string {
            throw new \RuntimeException('fail');
        }));
        $this->assertSame('fallback', $breaker->call(static function (): string {
            throw new \RuntimeException('fail');
        }));

        $this->assertSame(CircuitState::Open, $breaker->state());
        $this->assertSame('fallback', $breaker->call(static fn (): string => 'ok'));
    }
}