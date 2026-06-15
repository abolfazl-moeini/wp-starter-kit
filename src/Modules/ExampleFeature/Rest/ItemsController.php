<?php
declare(strict_types=1);

namespace WPSK\Modules\ExampleFeature\Rest;

use WPSK\Support\Auth\CapabilityPolicy;
use WPSK\Support\Rest\AllowBatch;
use WPSK\Support\Rest\BatchResponse;
use WPSK\Support\Rest\RestHandler;
use WP_REST_Request;
use WP_REST_Response;

final class ItemsController extends RestHandler implements AllowBatch
{
    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        $cacheKey = (string) ($request->get_param('cacheKey') ?? 'default');
        return BatchResponse::wrap(
            ['items' => [['id' => 1, 'label' => 'Example']]],
            $cacheKey
        );
    }

    public function rest_permission(): bool
    {
        return CapabilityPolicy::can('read');
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