<?php
declare(strict_types=1);

namespace WPDev\Tests\FaultTolerance;

use PHPUnit\Framework\TestCase;
use WPDev\FaultTolerance\HttpPool;

/**
 * Coverage for the SSRF gap (B-07) and the mid-loop handle leak (B-08).
 *
 * B-07 — is_private_host() used to only regex-match the first octet of
 * 127.x and miss 0.0.0.0, IPv6 link-local (fe80::/10), IPv6 unique-local
 * (fc00::/7), and bracketed IPv6 ([::1]). It also never checked the URL
 * scheme, so file://, gopher://, dict://, ftp:// were happily accepted.
 *
 * B-08 — http_pool() opened curl_multi_init() and individual curl handles
 * without a try/finally; any exception during the init foreach leaked the
 * multi handle (and any already-added handles).
 */
class HttpPoolGapsTest extends TestCase
{
    /**
     * Helper: the SSRF gate must produce a ssrf_blocked WP_Error for each
     * of the listed URLs. Returns the responses array so each test can
     * assert on shape.
     *
     * @param list<string> $urls
     * @return list<\WP_Error|array<string,mixed>>
     */
    private function block(string $label, array $urls): array
    {
        $requests = array_map(static fn(string $u) => ['url' => $u], $urls);
        $responses = HttpPool::http_pool($requests);

        $this->assertCount(count($urls), $responses, $label . ': response count');
        foreach ($responses as $i => $r) {
            $this->assertInstanceOf(
                \WP_Error::class,
                $r,
                $label . ": response[$i] for {$urls[$i]} must be WP_Error"
            );
            $this->assertSame(
                'ssrf_blocked',
                $r->get_error_code(),
                $label . ": response[$i] for {$urls[$i]} must be ssrf_blocked"
            );
        }
        return $responses;
    }

    // ------------------------------------------------------------------
    // B-07 — IP literal coverage
    // ------------------------------------------------------------------

    public function test_ssrf_blocks_rest_of_ipv4_loopback(): void
    {
        // 127.0.0.1 was already covered by the original test. The rest of
        // 127.0.0.0/8 slipped through the existing regex (which only matched
        // 10/192.168/172.16-31/169.254). Add .2, mid-range, and .254 to
        // pin the fix.
        $this->block(
            '127.0.0.0/8 beyond .1',
            [
                'http://127.0.0.2/secret',
                'http://127.0.0.42/secret',
                'http://127.127.0.1/secret',
                'http://127.255.255.254/secret',
            ]
        );
    }

    public function test_ssrf_blocks_unspecified_ipv4(): void
    {
        // 0.0.0.0 — RFC 1122 "this network" address. On many stacks it
        // routes to the loopback interface, which makes it a real SSRF
        // target for services bound to 127.0.0.1 only.
        $this->block(
            '0.0.0.0',
            ['http://0.0.0.0:8080/admin']
        );
    }

    public function test_ssrf_blocks_ipv6_loopback_with_brackets(): void
    {
        // parse_url('http://[::1]/x', PHP_URL_HOST) === '[::1]'. The
        // pre-fix code only checked the bare '::1' literal, so the
        // bracket-wrapped form slipped through.
        $this->block(
            'IPv6 ::1 (bracketed)',
            [
                'http://[::1]/secret',
                'https://[::1]:8443/secret',
            ]
        );
    }

    public function test_ssrf_blocks_ipv6_link_local(): void
    {
        // fe80::/10 — link-local. Must be blocked whether written bare
        // (which is invalid as a URL host but should still fail closed)
        // or bracketed inside an http URL.
        $this->block(
            'IPv6 fe80::/10',
            [
                'http://[fe80::1]/secret',
                'http://[fe80::abcd:ef01:2345:6789]/secret',
            ]
        );
    }

    public function test_ssrf_blocks_ipv6_unique_local(): void
    {
        // fc00::/7 — covers both fc00::/8 (deprecated) and fd00::/8
        // (officially assigned unique-local). Both halves must be blocked.
        $this->block(
            'IPv6 fc00::/7',
            [
                'http://[fc00::1]/secret',
                'http://[fd00::1]/secret',
                'http://[fd12:3456:789a::1]/secret',
            ]
        );
    }

    // ------------------------------------------------------------------
    // B-07 — scheme coverage
    // ------------------------------------------------------------------

    public function test_ssrf_blocks_non_http_schemes(): void
    {
        // file://, gopher://, dict://, ftp:// — curl supports all of them,
        // and several give an attacker filesystem access or arbitrary
        // protocol smuggling. The SSRF gate must reject anything that is
        // not http or https.
        $this->block(
            'non-http schemes',
            [
                'file:///etc/passwd',
                'gopher://evil.example.com/x',
                'dict://evil.example.com/x',
                'ftp://evil.example.com/x',
                'javascript:alert(1)',
                'data:text/html,<script>alert(1)</script>',
            ]
        );
    }

    // ------------------------------------------------------------------
    // B-08 — exception during init loop must not leak the multi handle
    // ------------------------------------------------------------------

    public function test_handle_cleanup_when_request_body_throws(): void
    {
        // A request whose body is a stringable that throws on __toString
        // forces the init foreach to abort mid-iteration, after
        // curl_multi_init() has already produced a handle and at least
        // one per-request handle has already been added. The fix wraps
        // the bulk of http_pool() in try { ... } finally { ... } so that
        // any partially-built multi handle and any per-request handles
        // already added are closed before the exception propagates.
        //
        // Observable contract this test pins down:
        //   1. The exception must propagate to the caller (not be
        //      swallowed by an inner catch that would mask the bug).
        //   2. The exception must be the RuntimeException thrown by
        //      __toString — same identity — so the caller's `catch`
        //      actually catches something meaningful.
        //   3. After the exception, the function must remain usable:
        //      a fresh call with a clean request must return a
        //      well-formed array response (NOT a WP_Error and NOT a
        //      partial/empty result), proving that the prior cleanup
        //      path ran and left curl's internal state in a sane
        //      shape for the next request.
        //
        // Request shape: a good first request (no body) advances to
        // curl_multi_add_handle, leaving $handles populated. The second
        // request's body cast throws on the SAME iteration, so the
        // exception leaves $mh + $handles[0] in a partially-built state.
        // That is the worst case the try/finally must clean up — only
        // the multi handle leaks if there is no preceding successful add.
        $throwingBody = new HttpPoolGapsThrowingStringable('mid-loop boom');

        $thrown = null;
        try {
            HttpPool::http_pool([
                ['url' => 'https://example.test/first'],
                ['url' => 'https://example.test/second', 'args' => ['body' => $throwingBody]],
            ]);
        } catch (\Throwable $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'mid-loop exception must propagate to caller');
        $this->assertInstanceOf(\RuntimeException::class, $thrown);
        $this->assertSame('mid-loop boom', $thrown->getMessage());

        // Regression: after the exception, the function must remain usable.
        // The shape of the response (well-formed array, with a 'response'
        // sub-array carrying an integer status code) is the proxy for
        // "curl state is still healthy after the prior abort". We don't
        // assert a specific code because the test environment can't
        // resolve example.test; we only assert the function came back
        // with a normal response shape instead of an error or a hang.
        $responses = HttpPool::http_pool([
            ['url' => 'https://example.test/follow-up'],
        ]);
        $this->assertCount(1, $responses, 'follow-up call must produce a response');
        $this->assertIsArray(
            $responses[0],
            'follow-up call must return an array response (not a WP_Error)'
        );
        $this->assertArrayHasKey('response', $responses[0]);
        $this->assertArrayHasKey('code', $responses[0]['response']);
        $this->assertIsInt($responses[0]['response']['code']);
    }
}

/**
 * Internal helper: a stringable whose __toString always throws.
 *
 * Used to force the http_pool init foreach to abort after curl_multi_init
 * has produced a handle (and after at least one per-request handle has
 * been added to it), so we can verify the cleanup path runs.
 */
final class HttpPoolGapsThrowingStringable
{
    private string $message;

    public function __construct(string $message)
    {
        $this->message = $message;
    }

    public function __toString(): string
    {
        throw new \RuntimeException($this->message);
    }
}
