<?php
declare(strict_types=1);

namespace WPSK\Support\Rest;

/**
 * Marker interface for REST handlers that opt into WordPress REST batch support.
 * When implemented, RestSetup will pass 'allow_batch' => $handler->allow_batch()
 * to register_rest_route().
 */
interface AllowBatch
{
    /**
     * @return array<string, bool> e.g. ['v1' => true]
     */
    public function allow_batch(): array;
}
