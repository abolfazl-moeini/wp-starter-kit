<?php
declare(strict_types=1);

namespace WPSK\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPSK\FaultTolerance\HttpBatch;

class HttpBatchTest extends TestCase
{
    public function test_http_batch_returns_sequential_responses(): void
    {
        $responses = HttpBatch::http_batch([
            ['url' => 'https://example.test/a'],
            ['url' => 'https://example.test/b'],
        ]);

        $this->assertCount(2, $responses);
        $this->assertSame(200, wp_remote_retrieve_response_code($responses[0]));
    }

    public function test_global_http_batch_function_exists(): void
    {
        $this->assertTrue(function_exists('http_batch'));
        $this->assertCount(1, http_batch([['url' => 'https://example.test']]));
    }
}