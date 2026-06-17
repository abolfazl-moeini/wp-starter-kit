<?php
declare(strict_types=1);

namespace WPDev\Support\Rest;

use WP_REST_Response;

/**
 * Helper for responses that participate in the JS batch client contract.
 *
 * The client (@wpdev/rest-utils or equivalent) requires `extra.cacheKey` in the
 * response body so concurrent/debounced callers can be resolved.
 */
final class BatchResponse
{
    /**
     * Wrap a payload so that the JS batch client can match it to the
     * original request via `extra.cacheKey`.
     */
    public static function wrap(mixed $data, string $cacheKey): WP_REST_Response
    {
        return new WP_REST_Response([
            'data'  => $data,
            'extra' => ['cacheKey' => $cacheKey],
        ]);
    }

    /**
     * Alias for {@see BatchResponse::wrap()} used in integration docs/tests.
     */
    public static function forCacheKey(mixed $data, string $cacheKey): WP_REST_Response
    {
        return self::wrap($data, $cacheKey);
    }
}
