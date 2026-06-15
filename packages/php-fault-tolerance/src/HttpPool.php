<?php
declare(strict_types=1);

namespace WPSK\FaultTolerance;

/**
 * Parallel HTTP pool with SSRF hygiene — falls back to sequential batch.
 */
final class HttpPool
{
    /**
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    public static function http_pool(array $requests): array
    {
        $responses = [];

        foreach ($requests as $request) {
            $url = self::sanitize_url((string) ($request['url'] ?? ''));
            if ($url === '') {
                $responses[] = new \WP_Error('invalid_url', 'Blocked empty URL');
                continue;
            }
            if (self::is_private_host($url)) {
                $responses[] = new \WP_Error('ssrf_blocked', 'Blocked private network URL');
                continue;
            }

            $responses[] = wp_remote_request($url, $request['args'] ?? []);
        }

        return $responses;
    }

    private static function sanitize_url(string $url): string
    {
        if (!function_exists('sanitize_url')) {
            return $url;
        }
        return sanitize_url($url);
    }

    private static function is_private_host(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return true;
        }
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return true;
        }
        if (preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/', $host)) {
            return true;
        }
        return false;
    }
}