<?php
declare(strict_types=1);

namespace WPSK\Tests\Support\Rest;

use PHPUnit\Framework\TestCase;
use WPSK\Support\Rest\BatchResponse;

class BatchResponseTest extends TestCase
{
    public function test_wrap_includes_data_and_extra_cache_key(): void
    {
        $response = BatchResponse::wrap(['fields' => []], 'key-123');

        $this->assertSame(['fields' => []], $response->data['data']);
        $this->assertSame('key-123', $response->data['extra']['cacheKey']);
    }

    public function test_for_cache_key_is_alias_of_wrap(): void
    {
        $wrapped = BatchResponse::wrap(['ok' => true], 'abc');
        $aliased = BatchResponse::forCacheKey(['ok' => true], 'abc');

        $this->assertEquals($wrapped->data, $aliased->data);
    }
}