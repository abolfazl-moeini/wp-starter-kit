<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use WPDev\FaultTolerance\FaultTolerance;
use WPDev\FaultTolerance\HttpClient;

class FaultToleranceFacadeTest extends \WPDevTest\TestCases\TestCase
{
    public function test_fault_tolerance_function_returns_facade_instance(): void
    {
        $this->assertTrue(function_exists('fault_tolerance'));
        $this->assertInstanceOf(FaultTolerance::class, fault_tolerance());
    }

    public function test_facade_http_batch_delegates_to_http_client(): void
    {
        $responses = FaultTolerance::httpBatch([
            ['url' => 'https://example.com/'],
        ]);

        $this->assertCount(1, $responses);
    }

    public function test_http_client_class_replaces_http_pool(): void
    {
        $this->assertTrue(method_exists(HttpClient::class, 'pool'));
        $this->assertTrue(method_exists(HttpClient::class, 'batch'));
        $this->assertFalse(class_exists('WPDev\\FaultTolerance\\HttpPool'));
    }
}