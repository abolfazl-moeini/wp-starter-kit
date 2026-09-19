<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Theme\TokenHarvester;

/**
 * TokenHarvesterTest: Unit tests for TokenHarvester theme.json token extraction and transient caching.
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
}
