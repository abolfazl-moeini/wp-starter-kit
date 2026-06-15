<?php
declare(strict_types=1);

namespace WPSK\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPSK\FaultTolerance\HttpPool;

class HttpPoolTest extends TestCase
{
    public function test_http_pool_blocks_private_hosts(): void
    {
        $responses = HttpPool::http_pool([
            ['url' => 'http://127.0.0.1/internal'],
            ['url' => 'http://169.254.169.254/latest/meta-data'],
        ]);

        $this->assertInstanceOf(\WP_Error::class, $responses[0]);
        $this->assertSame('ssrf_blocked', $responses[0]->get_error_code());
        $this->assertInstanceOf(\WP_Error::class, $responses[1]);
        $this->assertSame('ssrf_blocked', $responses[1]->get_error_code());
    }

    public function test_global_http_pool_function_exists(): void
    {
        $this->assertTrue(function_exists('http_pool'));
    }
}