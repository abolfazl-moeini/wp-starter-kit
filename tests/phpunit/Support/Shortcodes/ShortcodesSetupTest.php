<?php
declare(strict_types=1);

namespace WPSK\Tests\Support\Shortcodes;

use PHPUnit\Framework\TestCase;
use WPSK\Support\Shortcodes\Shortcode;
use WPSK\Support\Shortcodes\ShortcodesSetup;

class ShortcodesSetupTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        ShortcodesSetup::flush();
    }

    public function test_register_and_render_via_class_handler(): void
    {
        ShortcodesSetup::register('wpsk_demo', DemoShortcode::class);
        ShortcodesSetup::append_shortcodes();

        $this->assertArrayHasKey('wpsk_demo', $GLOBALS['wpsk_wp_shortcodes']);

        $output = ShortcodesSetup::render_shortcode(['name' => 'Alice'], '', 'wpsk_demo');
        $this->assertStringContainsString('Hello Alice', $output);
    }

    public function test_escapes_output_and_sanitizes_attributes(): void
    {
        ShortcodesSetup::register('wpsk_escape', EscapeShortcode::class);
        ShortcodesSetup::append_shortcodes();

        $output = ShortcodesSetup::render_shortcode(
            ['label' => '<script>alert(1)</script>'],
            '',
            'wpsk_escape'
        );

        $this->assertStringNotContainsString('<script>', $output);
        $this->assertStringContainsString('&lt;script&gt;', $output);
    }
}

class DemoShortcode extends Shortcode
{
    public function render_shortcode(array $attributes, string $content, string $tag): string
    {
        $name = $attributes['name'] ?? 'world';
        return 'Hello ' . esc_html($name);
    }
}

class EscapeShortcode extends Shortcode
{
    public function render_shortcode(array $attributes, string $content, string $tag): string
    {
        return esc_html($attributes['label'] ?? '');
    }
}