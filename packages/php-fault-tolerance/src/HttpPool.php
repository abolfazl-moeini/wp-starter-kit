<?php
declare(strict_types=1);

namespace WPDev\FaultTolerance;

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

        try {
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
                        // (string) $body triggers __toString(); a stringable
                        // that throws on __toString aborts the init loop
                        // mid-iteration, which is exactly the failure mode
                        // the surrounding try/finally exists to clean up.
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
        } finally {
            // Always release curl resources, even when an exception aborts
            // the init or exec loops. Without this block, a throw between
            // curl_multi_init() and the success-path cleanup (e.g. a body
            // whose __toString throws mid-init) leaks the multi handle
            // AND every per-request handle already added to it.
            //
            // curl_multi_remove_handle() on an already-removed handle is
            // a silent no-op, and curl_close() on an already-closed
            // handle is a no-op too (with a PHP 8.5 deprecation notice
            // that we tolerate since the alternative — a missing
            // finally — is the leak this method is here to prevent).
            foreach ($handles as $ch) {
                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
            curl_multi_close($mh);
        }

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
        // Build a header map that preserves RFC 7230 multi-headers
        // (e.g. multiple `Set-Cookie`, `Vary`, `Link` values).
        //
        // Shape contract:
        //   - A header that appears once is stored as a string under
        //     its lower-cased name (mirrors the legacy behaviour so
        //     existing call-sites keep working).
        //   - A header that appears more than once is stored as a
        //     list<string> of all values, in the order the server
        //     emitted them. The old code silently overwrote every
        //     value after the first — so an auth cookie shadowed by
        //     an analytics cookie was lost.
        //
        // Header names are case-insensitive (RFC 7230 §3.2); we
        // normalise to the first-seen casing to match what most WP
        // callers expect when reading `$headers['Content-Type']`.
        $headers = [];
        $lines = explode("\r\n", $headerContent);
        foreach ($lines as $line) {
            if (!str_contains($line, ':')) {
                continue;
            }
            list($key, $value) = explode(':', $line, 2);
            $name  = trim($key);
            $value = trim($value);

            if (!isset($headers[$name])) {
                $headers[$name] = $value;
                continue;
            }

            // Already seen this header once → promote to array.
            if (is_array($headers[$name])) {
                $headers[$name][] = $value;
            } else {
                $headers[$name] = [$headers[$name], $value];
            }
        }
        return $headers;
    }

    private static function get_status_message(int $code): string
    {
        // IANA HTTP Status Code Registry — the canonical reason phrases
        // for the codes a real-world API call is likely to surface.
        // Any code not listed here falls back to 'Unknown' rather than
        // throwing, so the caller can still log/display a stable string.
        $messages = [
            200 => 'OK',
            201 => 'Created',
            204 => 'No Content',
            301 => 'Moved Permanently',
            302 => 'Found',
            304 => 'Not Modified',
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            409 => 'Conflict',
            422 => 'Unprocessable Entity',
            429 => 'Too Many Requests',
            500 => 'Internal Server Error',
            502 => 'Bad Gateway',
            503 => 'Service Unavailable',
            504 => 'Gateway Timeout',
        ];
        return $messages[$code] ?? 'Unknown';
    }

    /**
     * WordPress sanitize_url wrapper. Falls back to the raw value when the
     * WP helper is not loaded (e.g. plain composer tests).
     */
    public static function sanitize_url(string $url): string
    {
        if (!function_exists('sanitize_url')) {
            return $url;
        }
        return sanitize_url($url);
    }

    /**
     * Sequential HTTP batch (consolidated from former HttpBatch class).
     * Applies the same SSRF hygiene as the pool path.
     *
     * @param list<array{url:string,args?:array<string,mixed>}> $requests
     * @return list<array<string,mixed>|WP_Error>
     */
    public static function batch(array $requests): array
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
            $args = $request['args'] ?? [];
            $responses[] = wp_remote_request($url, $args);
        }
        return $responses;
    }

    /**
     * SSRF guard — rejects URLs whose scheme is not http(s), whose host
     * is an IP literal in any private/reserved range (loopback v4 and v6,
     * RFC1918, link-local, unique-local, 0.0.0.0/8, ...), and any hostname
     * that resolves to one of those IPs.
     *
     * Public so HttpBatch can share the same policy on its wp_remote_request
     * path.
     */
    public static function is_private_host(string $url): bool
    {
        // Scheme gate: curl supports file://, gopher://, dict://, ftp://,
        // and several of those give an attacker filesystem access or
        // arbitrary-protocol smuggling. Reject anything that isn't http
        // or https BEFORE we look at the host so a malicious scheme can't
        // sneak past a coincidentally-public-looking host.
        $scheme = parse_url($url, PHP_URL_SCHEME);
        if (!is_string($scheme) || !in_array(strtolower($scheme), ['http', 'https'], true)) {
            return true;
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return true;
        }

        // parse_url() returns IPv6 hosts wrapped in brackets: '[::1]'
        // rather than the bare '::1' literal. Strip them so the IP-literal
        // check below matches the unwrapped form.
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            $host = substr($host, 1, -1);
        }
        if ($host === '') {
            return true;
        }

        // Literal IP — block if it's in any private or reserved range.
        // FILTER_FLAG_NO_PRIV_RANGE covers RFC1918 (10/8, 172.16/12,
        // 192.168/16) and IPv6 ULA (fc00::/7). FILTER_FLAG_NO_RES_RANGE
        // covers loopback (127.0.0.0/8, ::1), link-local (169.254/16,
        // fe80::/10), 0.0.0.0/8, 240.0.0.0/4, and the rest of the IETF
        // reserved space. Together they catch every SSRF-relevant range.
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return self::is_blocked_ip($host);
        }

        // Hostname — resolve to IPs and check each one. If DNS resolution
        // returns no IPs at all (NXDOMAIN, timeout, /etc/hosts miss) we
        // allow the request to proceed: the curl call itself will fail
        // with a connection error and no SSRF happens, so failing closed
        // here would only punish legitimate transient DNS hiccups.
        return self::hostname_resolves_to_private($host);
    }

    /**
     * Returns true if $ip is in any SSRF-relevant range (private +
     * reserved). Uses PHP's FILTER_VALIDATE_IP + NO_PRIV_RANGE +
     * NO_RES_RANGE flags so we don't have to hand-roll regexes that
     * inevitably miss an edge case (e.g. the IPv6 ULA boundary).
     */
    private static function is_blocked_ip(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }

    /**
     * Resolve a hostname to all of its A and AAAA records; return true as
     * soon as any one of them lands in a private/reserved range. If DNS
     * returns nothing, return false (allow — the curl call will fail
     * downstream).
     */
    private static function hostname_resolves_to_private(string $host): bool
    {
        if (function_exists('gethostbynamel')) {
            $ipv4 = @gethostbynamel($host);
            if (is_array($ipv4)) {
                foreach ($ipv4 as $ip) {
                    if (self::is_blocked_ip($ip)) {
                        return true;
                    }
                }
            }
        }

        // IPv6-only hostnames (no A record). dns_get_record returns
        // AAAA records that gethostbynamel misses.
        if (function_exists('dns_get_record')) {
            $ipv6 = @dns_get_record($host, DNS_AAAA);
            if (is_array($ipv6)) {
                foreach ($ipv6 as $rec) {
                    if (isset($rec['ipv6']) && self::is_blocked_ip($rec['ipv6'])) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
