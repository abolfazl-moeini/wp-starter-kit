<?php
declare(strict_types=1);

use WPDev\FaultTolerance\FaultTolerance;
use WPDev\FaultTolerance\HttpClient;
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
        return HttpClient::batch($requests);
    }
}

if (!function_exists('http_pool')) {
    /**
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    function http_pool(array $requests): array
    {
        return HttpClient::pool($requests);
    }
}

if (!function_exists('fault_tolerance')) {
    function fault_tolerance(): FaultTolerance
    {
        return new FaultTolerance();
    }
}