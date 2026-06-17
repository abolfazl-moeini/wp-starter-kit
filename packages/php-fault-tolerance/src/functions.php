<?php
declare(strict_types=1);

use WPDev\FaultTolerance\HttpPool;
use WPDev\FaultTolerance\Resilient;

if (!function_exists('resilient')) {
    /**
     * @param callable():mixed $operation
     * @param array<string,mixed> $options
     */
    function resilient(callable $operation, array $options = []): mixed
    {
        return Resilient::resilient($operation, $options);
    }
}

if (!function_exists('http_batch')) {
    /**
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    function http_batch(array $requests): array
    {
        return HttpPool::batch($requests);
    }
}

if (!function_exists('http_pool')) {
    /**
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    function http_pool(array $requests): array
    {
        return HttpPool::http_pool($requests);
    }
}