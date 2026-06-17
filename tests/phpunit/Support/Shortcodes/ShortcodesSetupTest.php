<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Shortcodes;

use PHPUnit\Framework\TestCase;
use WPDev\Support\Shortcodes\Shortcode;
use WPDev\Support\Shortcodes\ShortcodesSetup;

class ShortcodesSetupTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_test_reset_wp_state();
        ShortcodesSetup::flush();
    }

    public function test_register_and_render_via_class_handler(): void
    {
        ShortcodesSetup::register('wpdev_demo', DemoShortcode::class);
        ShortcodesSetup::append_shortcodes();

        $this->assertArrayHasKey('wpdev_demo', $GLOBALS['wpdev_wp_shortcodes']);

        $output = ShortcodesSetup::render_shortcode(['name' => 'Alice'], '', 'wpdev_demo');
        $this->assertStringContainsString('Hello Alice', $output);
    }

    public function test_escapes_output_and_sanitizes_attributes(): void
    {
        ShortcodesSetup::register('wpdev_escape', EscapeShortcode::class);
        ShortcodesSetup::append_shortcodes();

        $output = ShortcodesSetup::render_shortcode(
            ['label' => '<script>alert(1)</script>'],
            '',
            'wpdev_escape'
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