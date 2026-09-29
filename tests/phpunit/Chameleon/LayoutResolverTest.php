<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Composition\CanonicalGraph;
use WPDev\Chameleon\Composition\FailSoftBoundary;
use WPDev\Chameleon\Composition\LayoutResolver;
use WPDev\Chameleon\Contracts\DashboardContextV1;

/**
 * LayoutResolverTest: Unit test suite for Chameleon composition graph and delta resolver.
 */
final class LayoutResolverTest extends TestCase {
    private array $canonical;

    protected function setUp(): void {
        parent::setUp();
        $this->canonical = CanonicalGraph::get_default();
    }

    public function test_canonical_graph_has_expected_regions_and_sections(): void {
        $this->assertArrayHasKey('header', $this->canonical);
        $this->assertArrayHasKey('main', $this->canonical);
        $this->assertArrayHasKey('aside', $this->canonical);
        $this->assertArrayHasKey('welcome_banner', $this->canonical['header']['sections']);
        $this->assertArrayHasKey('stats_grid', $this->canonical['main']['sections']);
        $this->assertArrayHasKey('activity_feed', $this->canonical['main']['sections']);
    }

    public function test_inject_operation_attaches_to_slot(): void {
        $invoked = false;
        $patches = [
            [
                'op'       => 'inject',
                'slot'     => 'header.actions',
                'id'       => 'test_loyalty_badge',
                'weight'   => 5,
                'renderer' => function (DashboardContextV1 $ctx) use (&$invoked) {
                    $invoked = true;
                },
                'requires' => ['user.identity@1'],
            ],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $welcome = $resolved['header']['sections']['welcome_banner'];

        $this->assertNotEmpty($welcome['injected_items']);
        $this->assertSame('test_loyalty_badge', $welcome['injected_items'][0]['id']);
        $this->assertSame(5, $welcome['injected_items'][0]['weight']);

        // Execute rendering
        $ctx = new DashboardContextV1(['user' => ['display_name' => 'Alice']]);
        ob_start();
        LayoutResolver::render_tree($resolved, $ctx);
        ob_end_clean();

        $this->assertTrue($invoked, 'Injected slot renderer was successfully called during render_tree.');
    }

    public function test_hide_operation_removes_section(): void {
        $patches = [
            [
                'op'     => 'hide',
                'target' => 'section:quick_actions',
            ],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $this->assertArrayNotHasKey('quick_actions', $resolved['aside']['sections']);
    }

    public function test_move_operation_relocates_and_reweights_section(): void {
        $patches = [
            [
                'op'         => 'move',
                'target'     => 'section:activity_feed',
                'to_region'  => 'main',
                'new_weight' => 5, // Beats stats_grid (weight 10)
            ],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $section_keys = array_keys($resolved['main']['sections']);

        // activity_feed should now be the first section in main
        $this->assertSame('activity_feed', $section_keys[0]);
        $this->assertSame('stats_grid', $section_keys[1]);
    }

    public function test_replace_operation_swaps_renderer(): void {
        $custom_called = false;
        $patches = [
            [
                'op'       => 'replace',
                'target'   => 'section:stats_grid',
                'renderer' => function (DashboardContextV1 $ctx) use (&$custom_called) {
                    $custom_called = true;
                },
                'requires' => ['stats.summary@1'],
            ],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $ctx = new DashboardContextV1([]);

        ob_start();
        LayoutResolver::render_tree($resolved, $ctx);
        ob_end_clean();

        $this->assertTrue($custom_called, 'Custom renderer successfully replaced default stats_grid renderer.');
    }

    public function test_upstream_new_section_renders_automatically_zero_breakage(): void {
        // Client patches customize existing sections
        $client_patches = [
            ['op' => 'hide', 'target' => 'section:quick_actions'],
        ];

        // Simulate vendor releasing v2.0 with a new security alert section in main
        $vendor_v2_tree = $this->canonical;
        $vendor_v2_tree['main']['sections']['security_alert'] = [
            'weight'   => 1, // High priority
            'renderer' => fn() => print("<div class='security-alert'>2FA Needed</div>"),
        ];

        $resolved = LayoutResolver::resolve($vendor_v2_tree, $client_patches);

        // Security alert must be present despite client customizations
        $this->assertArrayHasKey('security_alert', $resolved['main']['sections']);
        $this->assertSame('security_alert', array_keys($resolved['main']['sections'])[0]);
    }

    public function test_fail_soft_boundary_catches_fatal_type_error_without_crashing(): void {
        $broken_renderer = function (DashboardContextV1 $ctx) {
            // Intentionally cause a PHP TypeError
            /** @var string $str */
            $str = null;
            $len = strlen($str);
        };

        $ctx = new DashboardContextV1([]);

        // Must not throw uncaught TypeError or Exception
        ob_start();
        FailSoftBoundary::execute($broken_renderer, $ctx, 'test_broken_section');
        $output = ob_get_clean();

        $this->assertIsString($output);
    }

    public function test_unknown_operation_fails_soft_without_error(): void {
        $patches = [
            ['op' => 'unsupported_op', 'target' => 'section:stats_grid'],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $this->assertArrayHasKey('stats_grid', $resolved['main']['sections']);
    }

    public function test_invalid_slot_or_id_characters_rejected(): void {
        $patches = [
            [
                'op'       => 'inject',
                'slot'     => 'header.actions',
                'id'       => 'bad id with spaces!',
                'renderer' => fn() => print("test"),
            ],
        ];

        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $welcome = $resolved['header']['sections']['welcome_banner'];
        $this->assertEmpty($welcome['injected_items'] ?? []);
    }

    public function test_unknown_slot_injection_emits_debug_comment(): void {
        $patches = [
            [
                'op'       => 'inject',
                'slot'     => 'nonexistent.slot_target',
                'id'       => 'orphan_widget',
                'renderer' => fn() => print("orphan"),
            ],
        ];

        ob_start();
        $resolved = LayoutResolver::resolve($this->canonical, $patches);
        $output = ob_get_clean();

        $this->assertStringContainsString("chameleon: unknown slot 'nonexistent.slot_target'", $output);
    }

    public function test_renderer_safe_partial_and_escaping(): void {
        $clean_tag = \WPDev\Chameleon\Support\Renderer::esc_tag('div<script>');
        $this->assertSame('divscript', $clean_tag);

        $escaped_attr = \WPDev\Chameleon\Support\Renderer::esc_html_attr('val" onmouseover="alert(1)');
        $this->assertStringNotContainsString('"', $escaped_attr);
    }
}
