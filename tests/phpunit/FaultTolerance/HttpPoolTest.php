<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPDev\FaultTolerance\HttpClient;

class HttpPoolTest extends TestCase
{
    public function test_http_pool_blocks_private_hosts(): void
    {
        $responses = HttpClient::pool([
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
     * HttpClient::get_status_message() used to cover only 7 codes
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
        $method = new \ReflectionMethod(HttpClient::class, 'get_status_message');
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
        $method = new \ReflectionMethod(HttpClient::class, 'get_status_message');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        // A code outside the IANA registry (e.g. 799) must still
        // return a stable 'Unknown' string rather than throw.
        $this->assertSame('Unknown', $method->invoke(null, 799));
    }

    /**
     * Regression test for B-11 (bug audit plan_8d50edf6):
     *
     * HttpClient::parse_headers() used to assign each header into a
     * plain associative array keyed by header name. RFC 7230 allows
     * a response to carry multiple values for the same name (most
     * commonly `Set-Cookie`, but also `Vary`, `Link`, `Warning`, ...).
     * The old behaviour silently overwrote every value after the
     * first — so a response that set two cookies only kept the
     * last one, and any downstream session-restoration logic lost
     * the auth cookie.
     *
     * The fix collects repeats into an array under the same key.
     * Single-occurrence headers keep the original `string` shape so
     * existing call-sites (e.g. `$headers['Content-Type']`) do not
     * break.
     */
    public function test_parse_headers_collects_repeated_set_cookie_into_array(): void
    {
        $method = new \ReflectionMethod(HttpClient::class, 'parse_headers');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $raw = "HTTP/1.1 200 OK\r\n"
             . "Content-Type: text/html\r\n"
             . "Set-Cookie: a=1; Path=/\r\n"
             . "Set-Cookie: b=2; Path=/\r\n"
             . "Set-Cookie: c=3; Path=/\r\n"
             . "\r\n";

        $headers = $method->invoke(null, $raw);

        // Single-occurrence header keeps its string shape.
        $this->assertSame('text/html', $headers['Content-Type']);

        // Repeated Set-Cookie is collected as an array, in order.
        $this->assertIsArray($headers['Set-Cookie']);
        $this->assertSame(
            ['a=1; Path=/', 'b=2; Path=/', 'c=3; Path=/'],
            $headers['Set-Cookie']
        );
    }

    public function test_parse_headers_keeps_single_set_cookie_as_string(): void
    {
        $method = new \ReflectionMethod(HttpClient::class, 'parse_headers');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $raw = "HTTP/1.1 200 OK\r\n"
             . "Set-Cookie: only=one; Path=/\r\n"
             . "\r\n";

        $headers = $method->invoke(null, $raw);

        // A single Set-Cookie stays a string (not a 1-element array)
        // so call-sites that read it as a scalar keep working.
        $this->assertSame('only=one; Path=/', $headers['Set-Cookie']);
    }
}