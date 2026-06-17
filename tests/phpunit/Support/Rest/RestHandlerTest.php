<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Rest;

use PHPUnit\Framework\TestCase;
use WPDev\Support\Rest\RestHandler;

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

    /**
     * SECURITY: 5xx responses must NOT echo the raw exception message back
     * to the API consumer. Exception messages can include file paths,
     * SQL fragments, stack traces, or other internal-only data — leaking
     * them is a classic information-disclosure vulnerability. The status
     * is still 500 so the client can react; only the message is sanitised.
     */
    public function test_rest_response_sanitises_5xx_exception_message_to_prevent_information_disclosure(): void
    {
        $handler = new class extends RestHandler {
            public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
            {
                // Simulate an exception that would leak sensitive data:
                // a DB connection string, a file path, or a stack frame.
                throw new \RuntimeException(
                    'PDOException: SQLSTATE[HY000] [2002] Connection refused at /var/www/secret/db.php:42',
                    500
                );
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

        $this->assertSame(500, $response->status, '5xx status is preserved');
        $this->assertIsString(
            $response->data['message'],
            'A message field is still present (so the client can react)'
        );
        $this->assertStringNotContainsString(
            'PDOException',
            $response->data['message'],
            '5xx message must NOT echo the raw exception text (information disclosure)'
        );
        $this->assertStringNotContainsString(
            '/var/www/secret',
            $response->data['message'],
            '5xx message must NOT echo filesystem paths from the exception'
        );
        $this->assertStringNotContainsString(
            'SQLSTATE',
            $response->data['message'],
            '5xx message must NOT echo SQL fragments from the exception'
        );
    }

    /**
     * 4xx responses are user-facing errors raised by the handler (e.g.
     * "Resource not found", "Permission denied"). The message is the
     * handler's own response and is safe to pass through verbatim —
     * the alternative (masking 4xx) would force the client to make
     * another roundtrip just to learn the validation reason.
     */
    public function test_rest_response_passes_4xx_exception_message_through_unchanged(): void
    {
        $handler = new class extends RestHandler {
            public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
            {
                throw new \RuntimeException('Validation failed: missing field "email"', 422);
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
                return 'POST';
            }
        };

        $response = $handler->rest_response(new \WP_REST_Request());

        $this->assertSame(422, $response->status);
        $this->assertSame(
            'Validation failed: missing field "email"',
            $response->data['message'],
            '4xx messages are safe to pass through (handler is the source of truth)'
        );
    }
}