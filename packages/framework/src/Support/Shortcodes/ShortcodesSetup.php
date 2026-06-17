<?php
declare(strict_types=1);

namespace WPDev\Support\Shortcodes;

use WP_Shortcode;

/**
 * Registration and rendering for class-based shortcodes.
 * Reimplemented (new code).
 */
final class ShortcodesSetup
{
    /** @var array<string, string|Shortcode> */
    private static array $shortcodes = [];

    public static function register(string $tag, string|Shortcode $handler): bool
    {
        self::$shortcodes[$tag] = $handler;
        return true;
    }

    public static function init(): void
    {
        // Use a late hook similar to research but safer.
        add_action('init', [self::class, 'append_shortcodes'], 99);
    }

    public static function append_shortcodes(): void
    {
        foreach (array_keys(self::$shortcodes) as $tag) {
            add_shortcode($tag, [self::class, 'render_shortcode']);
        }
    }

    public static function render_shortcode($attributes, $content, $tag): string
    {
        if (!isset(self::$shortcodes[$tag])) {
            return '';
        }

        $handler = self::$shortcodes[$tag];
        if (is_string($handler)) {
            $handler = new $handler();
        }

        $raw = is_array($attributes) ? $attributes : [];
        $defaults = method_exists($handler, 'default_attributes')
            ? $handler->default_attributes()
            : [];
        $atts = $defaults !== []
            ? shortcode_atts($defaults, $raw, $tag)
            : $raw;

        $output = $handler->render_shortcode($atts, (string)$content, (string)$tag);

        // Handlers are responsible for escaping, but we enforce here for safety
        // in the base implementation when they return raw strings.
        return is_string($output) ? wp_kses_post($output) : '';
    }

    public static function flush(): void
    {
        self::$shortcodes = [];
    }
}

if (function_exists('add_action')) {
    ShortcodesSetup::init();
}
