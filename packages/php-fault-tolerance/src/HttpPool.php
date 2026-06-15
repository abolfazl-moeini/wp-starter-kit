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
     * @return list<array<string,mixed>|\WP_Error>
     */
    public static function http_pool(array $requests): array
    {
        if (!function_exists('curl_multi_init')) {
            return self::sequential_fallback($requests);
        }

        $mh = curl_multi_init();
        if (!$mh) {
            return self::sequential_fallback($requests);
        }

        $handles = [];
        $responses = [];

        foreach ($requests as $index => $request) {
            $url = self::sanitize_url((string) ($request['url'] ?? ''));
            if ($url === '') {
                $responses[$index] = new \WP_Error('invalid_url', 'Blocked empty URL');
                continue;
            }
            if (self::is_private_host($url)) {
                $responses[$index] = new \WP_Error('ssrf_blocked', 'Blocked private network URL');
                continue;
            }

            $ch = curl_init($url);
            if (!$ch) {
                $responses[$index] = new \WP_Error('curl_init_failed', 'Failed to initialize curl handle');
                continue;
            }

            $args = $request['args'] ?? [];
            $method = strtoupper((string) ($args['method'] ?? 'GET'));

            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

            $timeout = isset($args['timeout']) ? (int) $args['timeout'] : 5;
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

            $sslverify = isset($args['sslverify']) ? (bool) $args['sslverify'] : true;
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $sslverify);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $sslverify ? 2 : 0);

            if (isset($args['body'])) {
                $body = $args['body'];
                if (is_array($body)) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($body));
                } else {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, (string) $body);
                }
            }

            if (isset($args['headers']) && is_array($args['headers'])) {
                $curlHeaders = [];
                foreach ($args['headers'] as $name => $value) {
                    $curlHeaders[] = "$name: $value";
                }
                curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
            }

            curl_multi_add_handle($mh, $ch);
            $handles[$index] = $ch;
        }

        $active = null;
        do {
            $status = curl_multi_exec($mh, $active);
            if ($active) {
                curl_multi_select($mh);
            }
        } while ($active && $status === CURLM_OK);

        foreach ($handles as $index => $ch) {
            $content = curl_multi_getcontent($ch);
            $err = curl_error($ch);
            $info = curl_getinfo($ch);

            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($err !== '') {
                $responses[$index] = new \WP_Error('curl_error', $err);
                continue;
            }

            $headerSize = $info['header_size'];
            $headerPart = substr($content, 0, $headerSize);
            $bodyPart = substr($content, $headerSize);

            $headers = self::parse_headers($headerPart);
            $statusCode = (int) $info['http_code'];

            $responses[$index] = [
                'headers'  => $headers,
                'body'     => $bodyPart,
                'response' => [
                    'code'    => $statusCode,
                    'message' => self::get_status_message($statusCode),
                ],
            ];
        }

        curl_multi_close($mh);
        ksort($responses);
        return array_values($responses);
    }

    private static function sequential_fallback(array $requests): array
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

    private static function parse_headers(string $headerContent): array
    {
        $headers = [];
        $lines = explode("\r\n", $headerContent);
        foreach ($lines as $line) {
            if (str_contains($line, ':')) {
                list($key, $value) = explode(':', $line, 2);
                $headers[trim($key)] = trim($value);
            }
        }
        return $headers;
    }

    private static function get_status_message(int $code): string
    {
        $messages = [
            200 => 'OK',
            201 => 'Created',
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            500 => 'Internal Server Error',
        ];
        return $messages[$code] ?? 'Unknown';
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
        if (preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/', $host)) {
            return true;
        }
        return false;
    }
}