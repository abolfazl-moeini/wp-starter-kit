<?php

declare(strict_types=1);

namespace Tests\Chameleon;

use WP_UnitTestCase;
use WPDev\Chameleon\Theme\HostTokens\Sanitizer;
use WPDev\Chameleon\Theme\HostTokens\Palette;
use WPDev\Chameleon\Theme\HostTokens\HostTokenRecord;
use WPDev\Chameleon\Theme\HostTokens\Chain;
use WPDev\Chameleon\Theme\Adapters\AstraAdapter;
use WPDev\Chameleon\Theme\Adapters\BlockThemeAdapter;
use WPDev\Chameleon\Theme\TokenHarvester;

class HostTokensTest extends WP_UnitTestCase {
    public function test_sanitizer_rejects_injections(): void {
        // T2-1: Malicious values
        $this->assertNull(Sanitizer::sanitize_color('url(javascript:alert(1))'));
        $this->assertNull(Sanitizer::sanitize_color('red;}</style><script>alert(1)</script>'));
        $this->assertNull(Sanitizer::sanitize_length('20px; font-size: 100px;'));
        $this->assertNull(Sanitizer::sanitize_font_family("Arial; font-size: 50px;"));
        $this->assertNull(Sanitizer::sanitize_font_family("Unbalanced ' quote"));

        // Valid values
        $this->assertSame('#123456', Sanitizer::sanitize_color('#123456'));
        $this->assertSame('rgba(0, 0, 0, 0.5)', Sanitizer::sanitize_color('rgba(0, 0, 0, 0.5)'));
        $this->assertSame('1.5rem', Sanitizer::sanitize_length('1.5rem'));
        $this->assertSame('Georgia, serif', Sanitizer::sanitize_font_family('Georgia, serif'));
    }

    public function test_palette_test_vectors(): void {
        // T2-2: Three test vectors from Plan 2 §1.4
        // Vector 1: #FFEE00 (bright yellow) -> onPrimary #111111
        $yellowOn = Palette::optimal_on_color('#FFEE00');
        $this->assertSame('#111111', $yellowOn);
        $this->assertGreaterThanOrEqual(4.5, Palette::contrast_ratio('#FFEE00', $yellowOn));

        // Vector 2: #0E5F63 (dark teal) -> onPrimary #ffffff
        $tealOn = Palette::optimal_on_color('#0E5F63');
        $this->assertSame('#ffffff', $tealOn);
        $this->assertGreaterThanOrEqual(4.5, Palette::contrast_ratio('#0E5F63', $tealOn));

        // Vector 3: #7FB3D5 (soft blue) with light text requirement
        $originalContrast = Palette::contrast_ratio('#7FB3D5', '#ffffff');
        $this->assertLessThan(4.5, $originalContrast);

        $darkened = Palette::ensure_accessible_primary('#7FB3D5');
        $darkenedContrast = Palette::contrast_ratio($darkened, '#ffffff');
        $this->assertGreaterThanOrEqual(4.5, $darkenedContrast);
    }

    public function test_palette_ramp_generation(): void {
        $ramp = Palette::generate_ramp('#0e5f63');
        $this->assertArrayHasKey('primary', $ramp);
        $this->assertArrayHasKey('onPrimary', $ramp);
        $this->assertArrayHasKey('primaryHover', $ramp);
        $this->assertArrayHasKey('primaryActive', $ramp);
        $this->assertArrayHasKey('soft', $ramp);
        $this->assertArrayHasKey('border', $ramp);
        $this->assertSame('#ffffff', $ramp['onPrimary']);
    }

    public function test_chain_prioritized_resolution(): void {
        // T2-4: Manual override beats adapter
        update_option('wpdev_ps_host_overrides', [
            'color.primary' => '#ff0055',
            'radius.control' => '12px',
        ]);

        $chain = new Chain();
        $resolution = $chain->resolve();
        $winners = $resolution['winners'];

        $this->assertArrayHasKey('color.primary', $winners);
        $this->assertSame('manual', $winners['color.primary']->getSource());
        $this->assertSame('#ff0055', $winners['color.primary']->getValue());

        $this->assertArrayHasKey('radius.control', $winners);
        $this->assertSame('manual', $winners['radius.control']->getSource());
        $this->assertSame('12px', $winners['radius.control']->getValue());

        delete_option('wpdev_ps_host_overrides');
    }

    public function test_astra_adapter_extraction(): void {
        // T2-5: Astra theme settings
        update_option('astra-settings', [
            'theme-color' => '#336699',
            'button-radius' => '6',
            'body-font-family' => 'Helvetica, sans-serif',
        ]);

        $adapter = new AstraAdapter();
        $records = $adapter->records();

        $byRole = [];
        foreach ($records as $r) {
            $byRole[$r->getRole()] = $r;
        }

        $this->assertArrayHasKey(HostTokenRecord::ROLE_COLOR_PRIMARY, $byRole);
        $this->assertSame('#336699', $byRole[HostTokenRecord::ROLE_COLOR_PRIMARY]->getValue());
        $this->assertSame('adapter:astra@4.x', $byRole[HostTokenRecord::ROLE_COLOR_PRIMARY]->getSource());

        $this->assertArrayHasKey(HostTokenRecord::ROLE_RADIUS_CONTROL, $byRole);
        $this->assertSame('6px', $byRole[HostTokenRecord::ROLE_RADIUS_CONTROL]->getValue());

        $this->assertArrayHasKey(HostTokenRecord::ROLE_FONT_BODY, $byRole);
        $this->assertSame('Helvetica, sans-serif', $byRole[HostTokenRecord::ROLE_FONT_BODY]->getValue());

        delete_option('astra-settings');
    }

    public function test_token_invalidation_increments_generation(): void {
        // T2-7: Invalidation increments generation
        $initialGen = (int) get_option('wpdev_ps_token_generation', 1);

        TokenHarvester::invalidate();

        $nextGen = (int) get_option('wpdev_ps_token_generation', 1);
        $this->assertSame($initialGen + 1, $nextGen);
    }

    public function test_role_validation_rejects_css_injection(): void {
        $this->expectException(\InvalidArgumentException::class);
        new HostTokenRecord('color:red;}\nbody{display:none', '#ff0000', 'manual');
    }

    public function test_manual_override_ignores_malicious_roles(): void {
        update_option('wpdev_ps_host_overrides', [
            'color:red;}\nbody{display:none' => '#ff0000',
            'color.primary' => '#123456',
        ]);

        $chain = new Chain();
        $css = $chain->generate_css();

        $this->assertStringNotContainsString('display:none', $css);
        $this->assertStringContainsString('--ps-color-primary: #123456;', $css);

        delete_option('wpdev_ps_host_overrides');
    }
}
