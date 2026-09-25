<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Assets\AssetPipeline;

/**
 * AssetPipelineTest: Unit tests for single-archetype resolution, layer-order header,
 * multi-plugin deduplication, and demand gating.
 */
final class AssetPipelineTest extends TestCase {
    protected function tearDown(): void {
        AssetPipeline::reset();
        parent::tearDown();
    }

    public function test_default_archetype_is_material(): void {
        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('material', $archetype);
    }

    public function test_active_archetype_filter_customization(): void {
        $filter = fn() => 'flat';
        add_filter('wpdev_chameleon_archetype', $filter);

        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('flat', $archetype);

        remove_filter('wpdev_chameleon_archetype', $filter);
    }

    public function test_invalid_archetype_falls_back_to_material(): void {
        $filter = fn() => 'invalid_neon_cyberpunk';
        add_filter('wpdev_chameleon_archetype', $filter);

        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('material', $archetype, 'Invalid archetype must fall back to material.');

        remove_filter('wpdev_chameleon_archetype', $filter);
    }

    public function test_layer_order_header_contains_all_six_layers_and_fingerprint(): void {
        AssetPipeline::register_need(fn() => true);

        ob_start();
        AssetPipeline::print_layer_order_header();
        $output = ob_get_clean();

        $this->assertStringContainsString('ps-layer-order', $output);
        $this->assertStringContainsString('ps-engine:2.0.0', $output);
        $this->assertStringContainsString('@layer ps.harden, ps.base, ps.archetype, ps.host, ps.tenant, ps.skin;', $output);
    }

    public function test_layer_order_header_deduplication_across_multiple_calls(): void {
        AssetPipeline::register_need(fn() => true);

        ob_start();
        AssetPipeline::print_layer_order_header();
        $first = ob_get_clean();

        $this->assertNotEmpty($first);

        ob_start();
        AssetPipeline::print_layer_order_header();
        $second = ob_get_clean();

        $this->assertEmpty($second, 'Second call to print_layer_order_header must be a no-op due to deduplication guard.');
    }

    public function test_demand_gating_skips_when_need_is_false(): void {
        AssetPipeline::register_need(fn() => false);
        $this->assertFalse(AssetPipeline::is_needed());

        ob_start();
        AssetPipeline::print_layer_order_header();
        $output = ob_get_clean();

        $this->assertEmpty($output, 'Header must not be printed when need callback returns false.');
    }

    public function test_demand_gating_activates_when_need_is_true(): void {
        AssetPipeline::register_need(fn() => true);
        $this->assertTrue(AssetPipeline::is_needed());

        ob_start();
        AssetPipeline::print_layer_order_header();
        $output = ob_get_clean();

        $this->assertNotEmpty($output);
    }

    public function test_idempotent_init_retains_registry(): void {
        AssetPipeline::init('/path/v1', 'http://example.com/v1');
        $this->assertArrayHasKey('wpdev_chameleon_engine', $GLOBALS);
        $this->assertSame('2.0.0', $GLOBALS['wpdev_chameleon_engine']['version']);
    }

    public function test_no_need_callbacks_means_zero_waste(): void {
        $this->assertFalse(AssetPipeline::is_needed(), 'Without a need callback or render-time demand, nothing may be loaded.');

        ob_start();
        AssetPipeline::print_layer_order_header();
        $this->assertSame('', ob_get_clean());
    }

    public function test_need_declared_by_another_bundled_copy_is_honoured(): void {
        AssetPipeline::init('/path/v1', 'http://example.com/v1');

        // A prefixed copy of the class in another plugin writes to the same request-global registry.
        $GLOBALS[AssetPipeline::REGISTRY]['needs'][] = fn() => true;
        $GLOBALS[AssetPipeline::REGISTRY]['needed']  = null;

        $this->assertTrue(AssetPipeline::is_needed());
    }

    public function test_mark_needed_after_wp_head_schedules_footer_styles(): void {
        global $wp_actions;
        $had_head = $wp_actions['wp_head'] ?? null;
        $wp_actions['wp_head'] = 1;
        add_filter('doing_it_wrong_trigger_error', '__return_false');

        try {
            AssetPipeline::mark_needed();
            $this->assertTrue($GLOBALS[AssetPipeline::REGISTRY]['late_hooked'], 'Mode A must schedule a wp_footer print when <head> is already out.');

            ob_start();
            AssetPipeline::print_layer_order_header();
            $this->assertStringContainsString('ps-layer-order', ob_get_clean());
        } finally {
            remove_filter('doing_it_wrong_trigger_error', '__return_false');
            if ($had_head === null) {
                unset($wp_actions['wp_head']);
            } else {
                $wp_actions['wp_head'] = $had_head;
            }
        }
    }

    public function test_init_registers_token_cache_invalidation_hooks(): void {
        AssetPipeline::init('/path/v1', 'http://example.com/v1');

        $this->assertNotFalse(has_action('save_post_wp_global_styles', [\WPDev\Chameleon\Theme\TokenHarvester::class, 'invalidate']));
    }

    public function test_unknown_behavior_is_ignored(): void {
        AssetPipeline::require_behavior('carousel');
        AssetPipeline::require_behavior('dialog');

        $this->assertSame(['dialog' => true], $GLOBALS[AssetPipeline::REGISTRY]['behaviors']);
    }
}
