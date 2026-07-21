<?php
declare(strict_types=1);

final class FunctionsAutoloadTest extends \WPDevTest\TestCases\TestCase
{
    public function test_helpers_are_always_defined_after_bootstrap(): void
    {
        $this->assertTrue(function_exists('resilient'));
        $this->assertTrue(function_exists('http_batch'));
        $this->assertTrue(function_exists('http_pool'));
        $this->assertTrue(function_exists('fault_tolerance'));
        $this->assertTrue(function_exists('wpdev_fault_tolerance_is_active'));
    }

    public function test_active_flag_matches_php_version(): void
    {
        $this->assertSame(
            PHP_VERSION_ID >= 80100,
            wpdev_fault_tolerance_is_active()
        );
    }

    public function test_resilient_helper_runs_operation(): void
    {
        $this->assertSame(
            'ok',
            resilient(static function (): string {
                return 'ok';
            })
        );
    }
}
