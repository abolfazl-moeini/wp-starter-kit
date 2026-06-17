<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Rest;

use WPDev\Support\Auth\CapabilityPolicy;
use WPDev\Support\Rest\AllowBatch;
use WPDev\Support\Rest\BatchResponse;
use WPDev\Support\Rest\RestHandler;
use WP_REST_Request;
use WP_REST_Response;

final class ItemsController extends RestHandler implements AllowBatch
{
    /**
     * Capability required to call this endpoint. The `read` cap is granted
     * to every logged-in user (including subscribers); using it as the
     * authorization gate for a POST endpoint is a privilege-escalation
     * footgun, so we require `edit_posts` (author+).
     */
    public const REQUIRED_CAPABILITY = 'edit_posts';

    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        // sanitize_text_field() strips control characters, null bytes,
        // and normalises whitespace — the input is then safe to reflect
        // into a response payload that flows into JS batch clients
        // (localStorage, IndexedDB keys, log aggregators).
        $cacheKey = sanitize_text_field(
            (string) ($request->get_param('cacheKey') ?? 'default')
        );
        return BatchResponse::wrap(
            ['items' => [['id' => 1, 'label' => 'Example']]],
            $cacheKey
        );
    }

    public function rest_permission(): bool
    {
        return CapabilityPolicy::can(self::REQUIRED_CAPABILITY);
    }

    public function rest_end_point(): string
    {
        return 'items';
    }

    public function methods(): string
    {
        return 'POST';
    }

    public function allow_batch(): array
    {
        return ['v1' => true];
    }
}