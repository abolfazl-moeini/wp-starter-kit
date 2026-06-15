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
     * Converts exceptions to safe error responses.
     */
    final public function rest_response(WP_REST_Request $request): WP_REST_Response
    {
        try {
            return $this->rest_handler($request);
        } catch (\Throwable $e) {
            $code   = $e->getCode();
            $status = ( is_int( $code ) && $code >= 100 && $code < 600 ) ? $code : 500;
            return new WP_REST_Response([
                'success' => false,
                'code'    => $status,
                'message' => $e->getMessage(),
            ], $status);
        }
    }
}
