<?php
declare(strict_types=1);

namespace WPSK\FaultTolerance;

/**
 * Sequential HTTP batch via wp_remote_request.
 */
final class HttpBatch
{
    /**
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    public static function http_batch(array $requests): array
    {
        $responses = [];
        foreach ($requests as $request) {
            $url = $request['url'] ?? '';
            $args = $request['args'] ?? [];
            $responses[] = wp_remote_request($url, $args);
        }
        return $responses;
    }
}