<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Assets\AssetPipeline;
use WPDev\Chameleon\Support\Renderer;

/**
 * RendererTest: Unit tests for safe_partial, render_root, escaping, and tag sanitization.
 */
final class RendererTest extends TestCase {
    protected function tearDown(): void {
        AssetPipeline::reset();
        parent::tearDown();
    }

    public function test_render_root_wraps_in_ps_root_with_active_archetype(): void {
        $html = Renderer::render_root('<p>Hello World</p>');

        $this->assertStringStartsWith("<div class='ps-root' data-archetype='material'>", $html);
        $this->assertStringEndsWith('</div>', $html);
        $this->assertStringContainsString('<p>Hello World</p>', $html);
        $this->assertStringNotContainsString('ps-container', $html, 'ps-container must not be imposed by render_root.');
    }

    public function test_render_root_sanitizes_custom_classes(): void {
        $html = Renderer::render_root('<p>Content</p>', [
            'class' => 'my-custom-panel injection"><script>alert(1)</script>',
        ]);

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('alert(1)', $html);
        $this->assertStringContainsString('my-custom-panel', $html);
    }

    public function test_render_root_supports_custom_tag_and_surface(): void {
        $html = Renderer::render_root('<span>Inner</span>', [
            'tag'     => 'main',
            'surface' => 'analytics-dashboard',
        ]);

        $this->assertStringStartsWith("<main class='ps-root'", $html);
        $this->assertStringEndsWith('</main>', $html);
        $this->assertStringContainsString("data-ps-surface='analytics-dashboard'", $html);
    }

    public function test_render_root_nested_inheritance_omits_data_archetype(): void {
        $html = Renderer::render_root('<div>Child</div>', [
            'inherit_archetype' => true,
        ]);

        $this->assertStringNotContainsString('data-archetype', $html, 'Nested root must omit data-archetype when inherit_archetype is true.');
    }

    public function test_render_root_notifies_asset_pipeline(): void {
        // Pre-register need callback returning false
        AssetPipeline::register_need(fn() => false);
        $this->assertFalse(AssetPipeline::is_needed());

        // Calling render_root marks demand as needed
        Renderer::render_root('<p>Content</p>');
        $this->assertTrue(AssetPipeline::is_needed(), 'render_root must activate AssetPipeline demand.');
    }

    public function test_render_root_rejects_non_container_tags(): void {
        $html = Renderer::render_root('<p>x</p>', ['tag' => 'script']);

        $this->assertStringStartsWith("<div class='ps-root'", $html);
        $this->assertStringNotContainsString('<script', $html);
    }
}
