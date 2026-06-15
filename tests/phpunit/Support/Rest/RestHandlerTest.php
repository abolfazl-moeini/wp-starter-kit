<?php
declare(strict_types=1);

namespace WPSK\Tests\Support\Rest;

use PHPUnit\Framework\TestCase;
use WPSK\Support\Rest\RestHandler;

class RestHandlerTest extends TestCase
{
    public function test_rest_response_wraps_handler_and_returns_payload(): void
    {
        $handler = new class extends RestHandler {
            public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
            {
                return new \WP_REST_Response(['value' => 42]);
            }

            public function rest_permission(): bool
            {
                return true;
            }

            public function rest_end_point(): string
            {
                return 'demo';
            }

            public function methods(): string
            {
                return 'GET';
            }
        };

        $response = $handler->rest_response(new \WP_REST_Request());
        $this->assertSame(['value' => 42], $response->data);
        $this->assertSame(200, $response->status);
    }

    public function test_rest_response_converts_throwables_to_safe_error_payload(): void
    {
        $handler = new class extends RestHandler {
            public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
            {
                throw new \RuntimeException('boom', 403);
            }

            public function rest_permission(): bool
            {
                return true;
            }

            public function rest_end_point(): string
            {
                return 'demo';
            }

            public function methods(): string
            {
                return 'GET';
            }
        };

        $response = $handler->rest_response(new \WP_REST_Request());
        $this->assertFalse($response->data['success']);
        $this->assertSame('boom', $response->data['message']);
        $this->assertSame(403, $response->status);
    }

    public function test_rest_response_defaults_to_500_for_out_of_range_exception_codes(): void
    {
        $handler = new class extends RestHandler {
            public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
            {
                throw new \Exception('string-code-exception', 0);
            }

            public function rest_permission(): bool
            {
                return true;
            }

            public function rest_end_point(): string
            {
                return 'demo';
            }

            public function methods(): string
            {
                return 'GET';
            }
        };

        $response = $handler->rest_response(new \WP_REST_Request());
        $this->assertSame(500, $response->status);
        $this->assertSame(500, $response->data['code']);
    }
}