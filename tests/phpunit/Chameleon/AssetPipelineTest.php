<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Assets\AssetPipeline;

/**
 * AssetPipelineTest: Unit tests for single-archetype resolution, layer-order header, and gated assets.
 */
final class AssetPipelineTest extends TestCase {
    public function test_default_archetype_is_material(): void {
        // Reset cached static property
        $ref = new \ReflectionProperty(AssetPipeline::class, 'active_archetype');
        $ref->setAccessible(true);
        $ref->setValue(null, null);

        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('material', $archetype);
    }

    public function test_active_archetype_filter_customization(): void {
        $ref = new \ReflectionProperty(AssetPipeline::class, 'active_archetype');
        $ref->setAccessible(true);
        $ref->setValue(null, null);

        $filter = fn() => 'flat';
        add_filter('wpdev_chameleon_archetype', $filter);

        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('flat', $archetype);

        remove_filter('wpdev_chameleon_archetype', $filter);
    }

    public function test_invalid_archetype_falls_back_to_material(): void {
        $ref = new \ReflectionProperty(AssetPipeline::class, 'active_archetype');
        $ref->setAccessible(true);
        $ref->setValue(null, null);

        $filter = fn() => 'invalid_neon_cyberpunk';
        add_filter('wpdev_chameleon_archetype', $filter);

        $archetype = AssetPipeline::get_active_archetype();
        $this->assertSame('material', $archetype, 'Invalid archetype must fall back to material.');

        remove_filter('wpdev_chameleon_archetype', $filter);
    }

    public function test_layer_order_header_contains_all_six_layers_and_fingerprint(): void {
        ob_start();
        AssetPipeline::print_layer_order_header();
        $output = ob_get_clean();

        $this->assertStringContainsString('ps-layer-order', $output);
        $this->assertStringContainsString('ps-engine:2.0.0', $output);
        $this->assertStringContainsString('@layer ps.harden, ps.base, ps.archetype, ps.host, ps.tenant, ps.skin;', $output);
    }
}
