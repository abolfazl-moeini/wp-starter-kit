<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Theme\TokenHarvester;

/**
 * TokenHarvesterTest: Unit tests for theme.json token extraction, sanitization, and caching.
 */
final class TokenHarvesterTest extends TestCase {
    protected function tearDown(): void {
        TokenHarvester::invalidate();
        parent::tearDown();
    }

    public function test_get_host_tokens_css_returns_layered_css_string(): void {
        $css = TokenHarvester::get_host_tokens_css();

        $this->assertIsString($css);
        if (!empty($css)) {
            $this->assertStringContainsString('@layer ps.host', $css);
            $this->assertStringContainsString('.ps-root', $css);
        }
    }

    public function test_transient_caching_and_invalidation(): void {
        TokenHarvester::invalidate();

        $css1 = TokenHarvester::get_host_tokens_css();
        // Subsequent call should return from transient cache
        $css2 = TokenHarvester::get_host_tokens_css();

        $this->assertSame($css1, $css2);

        // Invalidate transient cache
        TokenHarvester::invalidate();
        $css3 = TokenHarvester::get_host_tokens_css();
        $this->assertSame($css1, $css3);
    }

    public function test_sanitize_css_color_allow_list(): void {
        $this->assertSame('#2563eb', TokenHarvester::sanitize_css_color('#2563eb'));
        $this->assertSame('#fff', TokenHarvester::sanitize_css_color('#fff'));
        $this->assertSame('rgb(14, 95, 99)', TokenHarvester::sanitize_css_color('rgb(14, 95, 99)'));
        $this->assertSame('rgba(14, 95, 99, 0.5)', TokenHarvester::sanitize_css_color('rgba(14, 95, 99, 0.5)'));
        $this->assertSame('oklch(0.6 0.25 150)', TokenHarvester::sanitize_css_color('oklch(0.6 0.25 150)'));
        $this->assertSame('var(--wp--preset--color--accent-1)', TokenHarvester::sanitize_css_color('var(--wp--preset--color--accent-1)'));
        $this->assertSame('transparent', TokenHarvester::sanitize_css_color('transparent'));
    }

    public function test_sanitize_css_color_rejects_malicious_inputs(): void {
        $this->assertNull(TokenHarvester::sanitize_css_color('red;}</style><script>alert(1)</script>'));
        $this->assertNull(TokenHarvester::sanitize_css_color('url(javascript:alert(1))'));
        $this->assertNull(TokenHarvester::sanitize_css_color('expression(alert(1))'));
        $this->assertNull(TokenHarvester::sanitize_css_color('rgb(0,0,0); background: red;'));
    }

    public function test_sanitize_css_length_allow_list(): void {
        $this->assertSame('8px', TokenHarvester::sanitize_css_length('8px'));
        $this->assertSame('0.5rem', TokenHarvester::sanitize_css_length('0.5rem'));
        $this->assertSame('0', TokenHarvester::sanitize_css_length('0'));
        $this->assertSame('var(--wp--preset--spacing--20)', TokenHarvester::sanitize_css_length('var(--wp--preset--spacing--20)'));

        // Reject injection
        $this->assertNull(TokenHarvester::sanitize_css_length('8px; content: "evil";'));
        $this->assertNull(TokenHarvester::sanitize_css_length('<script>'));
    }

    public function test_sanitize_font_family_allow_list(): void {
        $this->assertSame('Inter, sans-serif', TokenHarvester::sanitize_font_family('Inter, sans-serif'));
        $this->assertSame('"Helvetica Neue", Arial, sans-serif', TokenHarvester::sanitize_font_family('"Helvetica Neue", Arial, sans-serif'));

        // Reject unbalanced quotes and injection
        $this->assertNull(TokenHarvester::sanitize_font_family('"Unbalanced, sans-serif'));
        $this->assertNull(TokenHarvester::sanitize_font_family('sans-serif; } <script>'));
    }

    public function test_classic_theme_host_tokens_filter(): void {
        TokenHarvester::invalidate();

        $filter = fn() => [
            '--ps-color-primary' => '#0e5f63',
            '--ps-radius-1'      => '6px',
            '--ps-malicious'     => 'red;}</style><script>',
        ];

        add_filter('wpdev_chameleon_host_tokens', $filter);
        $css = TokenHarvester::get_host_tokens_css();
        remove_filter('wpdev_chameleon_host_tokens', $filter);

        $this->assertStringContainsString('--ps-color-primary: #0e5f63;', $css);
        $this->assertStringContainsString('--ps-radius-1: 6px;', $css);
        $this->assertStringNotContainsString('--ps-malicious', $css);
        $this->assertStringNotContainsString('<script>', $css);
    }

    public function test_host_token_filter_rejects_injected_property_names(): void {
        TokenHarvester::invalidate();

        $filter = fn() => [
            '--ps-color-primary;}body{display:none}.x{--ps-a' => '#000000',
            '--ps-color-bg'                                   => '#ffffff',
        ];

        add_filter('wpdev_chameleon_host_tokens', $filter);
        $css = TokenHarvester::get_host_tokens_css();
        remove_filter('wpdev_chameleon_host_tokens', $filter);

        $this->assertStringContainsString('--ps-color-bg: #ffffff;', $css);
        $this->assertStringNotContainsString('display:none', $css);
    }

    public function test_sanitize_css_length_rejects_malformed_numbers(): void {
        $this->assertNull(TokenHarvester::sanitize_css_length('1.2.3px'));
        $this->assertNull(TokenHarvester::sanitize_css_length('.px'));
        $this->assertSame('.5rem', TokenHarvester::sanitize_css_length('.5rem'));
    }
}
