<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use WPDev\FaultTolerance\HttpClient;

class HttpBatchTest extends \WPDevTest\TestCases\TestCase
{
    public function test_http_batch_returns_sequential_responses(): void
    {
        add_filter(
            'pre_http_request',
            static function ($pre, $args, $url) {
                return [
                    'headers'  => [],
                    'body'     => 'ok',
                    'response' => ['code' => 200, 'message' => 'OK'],
                    'cookies'  => [],
                    'filename' => null,
                ];
            },
            10,
            3
        );

        $responses = HttpClient::batch([
            ['url' => 'https://example.test/a'],
            ['url' => 'https://example.test/b'],
        ]);

        $this->assertCount(2, $responses);
        $this->assertSame(200, wp_remote_retrieve_response_code($responses[0]));
    }

    public function test_http_batch_blocks_loopback_host(): void
    {
        $responses = HttpClient::batch([
            ['url' => 'http://127.0.0.1/admin'],
        ]);

        $this->assertCount(1, $responses);
        $this->assertInstanceOf(\WP_Error::class, $responses[0]);
        $this->assertSame('ssrf_blocked', $responses[0]->get_error_code());
    }

    public function test_http_batch_blocks_file_scheme(): void
    {
        $responses = HttpClient::batch([
            ['url' => 'file:///etc/passwd'],
        ]);

        $this->assertCount(1, $responses);
        $this->assertInstanceOf(\WP_Error::class, $responses[0]);
        $this->assertSame('invalid_url', $responses[0]->get_error_code(), 'sanitize_url() strips non-http schemes before SSRF check');
    }

    public function test_http_batch_blocks_empty_url(): void
    {
        $responses = HttpClient::batch([
            ['url' => ''],
        ]);

        $this->assertCount(1, $responses);
        $this->assertInstanceOf(\WP_Error::class, $responses[0]);
        $this->assertSame('invalid_url', $responses[0]->get_error_code());
    }

    public function test_global_http_batch_function_exists(): void
    {
        $this->assertTrue(function_exists('http_batch'));
        $this->assertCount(1, http_batch([['url' => 'https://example.test']]));
    }
}