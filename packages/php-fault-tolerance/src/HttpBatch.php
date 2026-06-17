<?php
declare(strict_types=1);

namespace WPSK\FaultTolerance;

/**
 * Sequential HTTP batch via wp_remote_request.
 *
 * Mirrors the SSRF hygiene HttpPool applies to its curl path: each URL is
 * sanitized and run through HttpPool::is_private_host() before reaching
 * wp_remote_request, so loopback / RFC1918 / link-local / unparseable hosts
 * (including file://) never leave the process.
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
            $url = HttpPool::sanitize_url((string) ($request['url'] ?? ''));
            if ($url === '') {
                $responses[] = new \WP_Error('invalid_url', 'Blocked empty URL');
                continue;
            }
            if (HttpPool::is_private_host($url)) {
                $responses[] = new \WP_Error('ssrf_blocked', 'Blocked private network URL');
                continue;
            }
            $args = $request['args'] ?? [];
            $responses[] = wp_remote_request($url, $args);
        }
        return $responses;
    }
}