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

    /**
     * Regression test for B-10 (bug audit plan_8d50edf6):
     *
     * HttpPool::get_status_message() used to cover only 7 codes
     * (200, 201, 400, 401, 403, 404, 500). Anything else — including
     * the common 204, 301, 302, 304, 409, 422, 429, 502, 503, 504
     * — fell back to 'Unknown'. The expanded map returns the
     * canonical IANA reason phrase for every code that a real-world
     * API call is likely to surface, so callers that surface
     * `response.message` to logs / debug panels see the right text
     * instead of a placeholder.
     */
    public function test_get_status_message_covers_common_codes(): void
    {
        // PHP 8.1+: ReflectionMethod can invoke private methods without
        // setAccessible() — and calling setAccessible() emits a deprecation
        // notice on PHP 8.5+. Only call it when we must (PHP < 8.1).
        $method = new \ReflectionMethod(HttpPool::class, 'get_status_message');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $expected = [
            200 => 'OK',
            201 => 'Created',
            204 => 'No Content',
            301 => 'Moved Permanently',
            302 => 'Found',
            304 => 'Not Modified',
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            409 => 'Conflict',
            422 => 'Unprocessable Entity',
            429 => 'Too Many Requests',
            500 => 'Internal Server Error',
            502 => 'Bad Gateway',
            503 => 'Service Unavailable',
            504 => 'Gateway Timeout',
        ];

        foreach ($expected as $code => $phrase) {
            $this->assertSame(
                $phrase,
                $method->invoke(null, $code),
                "get_status_message($code) must return '$phrase'"
            );
        }
    }

    public function test_get_status_message_returns_unknown_for_unmapped_codes(): void
    {
        $method = new \ReflectionMethod(HttpPool::class, 'get_status_message');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        // A code outside the IANA registry (e.g. 799) must still
        // return a stable 'Unknown' string rather than throw.
        $this->assertSame('Unknown', $method->invoke(null, 799));
    }
}