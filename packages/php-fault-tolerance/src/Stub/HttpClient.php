<?php
/**
 * Minimal HTTP helpers for PHP < 8.1: sequential wp_remote_request only.
 * No curl_multi pool, basic SSRF host check.
 */

namespace WPDev\FaultTolerance;

final class HttpClient
{
    /**
     * @param array $requests
     * @return array
     */
    public static function pool(array $requests): array
    {
        return self::batch($requests);
    }

    /**
     * @param array $requests
     * @return array
     */
    public static function batch(array $requests): array
    {
        $responses = [];
        foreach ($requests as $request) {
            $url = self::sanitize_url((string) ($request['url'] ?? ''));
            if ($url === '') {
                $responses[] = self::error('invalid_url', 'Blocked empty URL');
                continue;
            }
            if (self::is_private_host($url)) {
                $responses[] = self::error('ssrf_blocked', 'Blocked private network URL');
                continue;
            }
            $args = isset($request['args']) && is_array($request['args'])
                ? $request['args']
                : [];
            if (function_exists('wp_remote_request')) {
                $responses[] = wp_remote_request($url, $args);
            } else {
                $responses[] = self::error(
                    'wp_unavailable',
                    'wp_remote_request is not available'
                );
            }
        }

        return $responses;
    }

    public static function sanitize_url(string $url): string
    {
        if (function_exists('sanitize_url')) {
            return (string) sanitize_url($url);
        }

        return $url;
    }

    public static function is_private_host(string $url): bool
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);
        if (!is_string($scheme) || !in_array(strtolower($scheme), ['http', 'https'], true)) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return true;
        }

        if ($host[0] === '[' && substr($host, -1) === ']') {
            $host = substr($host, 1, -1);
        }
        if ($host === '') {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            ) === false;
        }

        return false;
    }

    /**
     * @return \WP_Error|array
     */
    private static function error(string $code, string $message)
    {
        if (class_exists('\WP_Error')) {
            return new \WP_Error($code, $message);
        }

        return [
            'errors' => [$code => [$message]],
            'error_data' => [],
        ];
    }
}
