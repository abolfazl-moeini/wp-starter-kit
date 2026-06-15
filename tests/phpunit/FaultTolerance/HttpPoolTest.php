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
        ]);

        $this->assertInstanceOf(\WP_Error::class, $responses[0]);
    }

    public function test_global_http_pool_function_exists(): void
    {
        $this->assertTrue(function_exists('http_pool'));
    }
}