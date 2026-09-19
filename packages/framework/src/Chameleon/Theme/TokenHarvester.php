<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme;

/**
 * TokenHarvester: Extracts host theme design tokens from WordPress Core theme.json
 * into @layer ps.host, caching the output in a transient with mtime invalidation (SPEC §5).
 */
final class TokenHarvester {
    const TRANSIENT_PREFIX = 'chameleon_host_tokens_';

    /**
     * Get or generate the cached host tokens CSS string.
     *
     * @return string
     */
    public static function get_host_tokens_css(): string {
        $cache_key = self::get_cache_key();

        if (function_exists('get_transient')) {
            $cached = get_transient($cache_key);
            if (is_string($cached) && !empty($cached)) {
                return $cached;
            }
        }

        $css = self::generate_css();

        if (function_exists('set_transient')) {
            // Cache for 24 hours, or until invalidated by theme update / theme switch
            set_transient($cache_key, $css, DAY_IN_SECONDS);
        }

        return $css;
    }

    /**
     * Invalidate cached tokens on theme switch or manual flush.
     */
    public static function invalidate(): void {
        if (function_exists('delete_transient')) {
            delete_transient(self::get_cache_key());
        }
    }

    /**
     * Generate unique cache key based on active theme stylesheet and theme.json mtime.
     */
    private static function get_cache_key(): string {
        $theme_slug = function_exists('get_stylesheet') ? get_stylesheet() : 'default';
        $theme_dir  = function_exists('get_stylesheet_directory') ? get_stylesheet_directory() : '';
        $mtime = '0';

        $theme_json_path = $theme_dir . '/theme.json';
        if (file_exists($theme_json_path)) {
            $mtime = (string) filemtime($theme_json_path);
        }

        return self::TRANSIENT_PREFIX . md5($theme_slug . '_' . $mtime);
    }

    /**
     * Extract tokens from wp_get_global_settings().
     */
    private static function generate_css(): string {
        $css_declarations = [];

        if (function_exists('wp_get_global_settings')) {
            $settings = wp_get_global_settings();

            // 1. Color Palette
            $palette = $settings['color']['palette']['theme'] ?? [];
            if (is_array($palette)) {
                foreach ($palette as $item) {
                    if (isset($item['slug'], $item['color'])) {
                        $slug  = sanitize_key($item['slug']);
                        $color = esc_attr($item['color']);
                        $css_declarations[] = "--ps-host-color-{$slug}: {$color};";
                        if ($slug === 'primary') {
                            $css_declarations[] = "--ps-color-primary: {$color};";
                        }
                    }
                }
            }

            // 2. Font Families
            $font_families = $settings['typography']['fontFamilies']['theme'] ?? [];
            if (is_array($font_families)) {
                foreach ($font_families as $font) {
                    if (isset($font['slug'], $font['fontFamily'])) {
                        $slug   = sanitize_key($font['slug']);
                        $family = esc_attr($font['fontFamily']);
                        $css_declarations[] = "--ps-host-font-{$slug}: {$family};";
                        if ($slug === 'primary' || $slug === 'body') {
                            $css_declarations[] = "--ps-font-body: {$family};";
                        }
                    }
                }
            }
        }

        if (empty($css_declarations)) {
            return '';
        }

        return "@layer ps.host {\n  :root, .ps-root {\n    " . implode("\n    ", $css_declarations) . "\n  }\n}\n";
    }
}
