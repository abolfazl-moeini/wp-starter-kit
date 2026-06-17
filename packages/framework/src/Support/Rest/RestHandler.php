<?php
declare(strict_types=1);

namespace WPSK\Support\Rest;

use WP_REST_Request;
use WP_REST_Response;

/**
 * Base class for class-based REST route handlers.
 *
 * Reimplemented per plan.v2.md §10.1 / Phase 15 (new code, no legacy Singleton
 * or private BetterStudio dependencies).
 */
abstract class RestHandler
{
    /**
     * Generic message returned to API consumers on 5xx errors. We never
     * echo the raw exception text on 5xx (information disclosure) so
     * the client gets a stable, log-friendly string. The original
     * exception is dropped here; handlers that need to log it must do
     * so before re-throwing.
     */
    public const INTERNAL_ERROR_MESSAGE = 'Internal server error';

    /**
     * The actual request handler. Implementations return the payload.
     */
    abstract public function rest_handler(WP_REST_Request $request): WP_REST_Response;

    /**
     * Permission check. Must return bool (or a WP_Error in more advanced cases).
     */
    abstract public function rest_permission(): bool;

    /**
     * The route endpoint segment (e.g. 'items').
     */
    abstract public function rest_end_point(): string;

    /**
     * HTTP methods (string or array accepted by register_rest_route).
     */
    abstract public function methods(): string;

    /**
     * Final wrapper registered as the route callback.
     *
     * Converts exceptions to safe error responses.
     *
     * Message handling:
     *   - 4xx (client error): the exception message is passed through.
     *     The handler is the source of truth for user-facing errors
     *     (e.g. "Resource not found", "Validation failed"), and the
     *     caller needs the text to react.
     *   - 5xx (server error): the exception message is REPLACED with a
     *     generic "Internal server error" string. Exception messages
     *     can include file paths, SQL fragments, stack frames, and
     *     other internal-only data — echoing them is a classic
     *     information-disclosure vulnerability. Callers that need the
     *     original text should log it themselves before re-throwing.
     */
    final public function rest_response(WP_REST_Request $request): WP_REST_Response
    {
        try {
            return $this->rest_handler($request);
        } catch (\Throwable $e) {
            // Throwable::getCode() returns int|string. The legacy
            // `(is_int($code) && $code >= 100 && $code < 600)` guard
            // rejects any non-int code (defaults to 500), which is
            // correct for clearly-string codes like 'unknown' — but a
            // stringly-typed code that looks numeric ('500') slipped
            // through and was used as the HTTP status. Casting to
            // int via (int) before the range check closes the gap.
            $raw_code = $e->getCode();
            $numeric  = is_numeric( $raw_code ) ? (int) $raw_code : 0;
            $status   = ( $numeric >= 100 && $numeric < 600 ) ? $numeric : 500;
            $is_client_error = $status >= 400 && $status < 500;
            $message = $is_client_error
                ? $e->getMessage()
                : self::INTERNAL_ERROR_MESSAGE;

            return new WP_REST_Response([
                'success' => false,
                'code'    => $status,
                'message' => $message,
            ], $status);
        }
    }
}
